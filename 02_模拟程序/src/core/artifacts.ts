import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  access,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { canonicalClone, stableCanonicalJson } from "./canonical";

export interface JsonArtifactInput {
  readonly fileName: string;
  readonly value: unknown;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface JsonArtifactIdentity {
  readonly file: string;
  readonly bytes: number;
  readonly canonicalSha256: string;
  readonly storedSha256: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface PublishedArtifactSet {
  readonly directory: string;
  readonly manifest: Readonly<Record<string, unknown>>;
  readonly manifestIdentity: JsonArtifactIdentity;
  readonly entries: readonly JsonArtifactIdentity[];
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function encodeJson(value: unknown): { normalized: unknown; bytes: Buffer; canonicalSha256: string } {
  const normalized = canonicalClone(value);
  const canonical = Buffer.from(stableCanonicalJson(normalized), "utf8");
  const bytes = Buffer.from(`${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return { normalized, bytes, canonicalSha256: hashBytes(canonical) };
}

function safeFileName(fileName: string): void {
  if (fileName === ""
    || fileName !== basename(fileName)
    || fileName === "."
    || fileName === ".."
    || !fileName.endsWith(".json")) {
    throw new Error(`unsafe JSON artifact file name: ${fileName}`);
  }
}

function parseArtifactIdentity(value: unknown, label: string): JsonArtifactIdentity {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is not an artifact identity`);
  }
  const record = value as Record<string, unknown>;
  const allowed = new Set(["file", "bytes", "canonicalSha256", "storedSha256", "metadata"]);
  if (Object.keys(record).some((key) => !allowed.has(key))
    || typeof record.file !== "string"
    || !Number.isInteger(record.bytes)
    || (record.bytes as number) <= 0
    || typeof record.canonicalSha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(record.canonicalSha256)
    || typeof record.storedSha256 !== "string"
    || !/^[0-9a-f]{64}$/u.test(record.storedSha256)
    || (record.metadata !== undefined
      && (record.metadata === null
        || typeof record.metadata !== "object"
        || Array.isArray(record.metadata)))) {
    throw new Error(`${label} has invalid artifact-identity fields`);
  }
  safeFileName(record.file);
  return canonicalClone(record) as unknown as JsonArtifactIdentity;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function fsyncPath(path: string): Promise<void> {
  const handle = await open(path, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function writeExclusive(path: string, bytes: Uint8Array): Promise<void> {
  const handle = await open(path, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/**
 * Publish a complete directory as one visible unit.
 *
 * Every payload and the manifest are written and fsynced in a private sibling
 * directory. An exclusive lock serializes the final existence check and
 * same-filesystem rename. Readers accept only sets carrying a verified
 * COMMITTED.json marker.
 */
export async function publishJsonArtifactSetExclusive(
  destinationDirectory: string,
  inputs: readonly JsonArtifactInput[],
  manifestBase: Readonly<Record<string, unknown>>,
): Promise<PublishedArtifactSet> {
  const destination = resolve(destinationDirectory);
  const parent = dirname(destination);
  const leaf = basename(destination);
  if (leaf === "." || leaf === ".." || leaf === "") {
    throw new Error(`unsafe artifact-set destination: ${destination}`);
  }
  if (inputs.length === 0) throw new Error("artifact set must contain at least one payload");
  const names = new Set<string>();
  for (const input of inputs) {
    safeFileName(input.fileName);
    if (input.fileName === "manifest.json" || input.fileName === "COMMITTED.json") {
      throw new Error(`${input.fileName} is reserved`);
    }
    if (names.has(input.fileName)) throw new Error(`duplicate artifact file: ${input.fileName}`);
    names.add(input.fileName);
  }

  await mkdir(parent, { recursive: true });
  const lock = join(parent, `.${leaf}.publish-lock`);
  const staging = join(parent, `.${leaf}.partial-${process.pid}-${randomUUID()}`);
  await mkdir(lock, { recursive: false, mode: 0o700 });
  let published = false;
  try {
    if (await exists(destination)) {
      throw new Error(`artifact-set destination already exists: ${destination}`);
    }
    await mkdir(staging, { recursive: false, mode: 0o700 });
    const identities: JsonArtifactIdentity[] = [];
    for (const input of inputs) {
      const encoded = encodeJson(input.value);
      const identity: JsonArtifactIdentity = Object.freeze({
        file: input.fileName,
        bytes: encoded.bytes.length,
        canonicalSha256: encoded.canonicalSha256,
        storedSha256: hashBytes(encoded.bytes),
        ...(input.metadata === undefined ? {} : { metadata: canonicalClone(input.metadata) }),
      });
      await writeExclusive(join(staging, input.fileName), encoded.bytes);
      identities.push(identity);
    }
    const manifest = canonicalClone({
      ...manifestBase,
      entries: identities,
    }) as Readonly<Record<string, unknown>>;
    const encodedManifest = encodeJson(manifest);
    const manifestIdentity: JsonArtifactIdentity = Object.freeze({
      file: "manifest.json",
      bytes: encodedManifest.bytes.length,
      canonicalSha256: encodedManifest.canonicalSha256,
      storedSha256: hashBytes(encodedManifest.bytes),
    });
    await writeExclusive(join(staging, "manifest.json"), encodedManifest.bytes);
    const marker = encodeJson({
      schemaVersion: "VP-ATOMIC-JSON-ARTIFACT-SET-v1",
      manifest: manifestIdentity,
    });
    await writeExclusive(join(staging, "COMMITTED.json"), marker.bytes);
    await fsyncPath(staging);
    await rename(staging, destination);
    published = true;
    await fsyncPath(parent);
    return Object.freeze({
      directory: destination,
      manifest: Object.freeze(manifest),
      manifestIdentity,
      entries: Object.freeze(identities),
    });
  } finally {
    if (!published) await rm(staging, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}

export async function verifyJsonArtifactSet(
  directory: string,
): Promise<PublishedArtifactSet> {
  const root = resolve(directory);
  const [manifestBytes, markerBytes, names] = await Promise.all([
    readFile(join(root, "manifest.json")),
    readFile(join(root, "COMMITTED.json")),
    readdir(root),
  ]);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as Record<string, unknown>;
  const marker = JSON.parse(markerBytes.toString("utf8")) as unknown;
  const encodedManifest = encodeJson(manifest);
  if (!manifestBytes.equals(encodedManifest.bytes)) {
    throw new Error("artifact-set manifest is not normalized JSON");
  }
  const manifestIdentity: JsonArtifactIdentity = {
    file: "manifest.json",
    bytes: manifestBytes.length,
    canonicalSha256: encodedManifest.canonicalSha256,
    storedSha256: hashBytes(manifestBytes),
  };
  const expectedMarker = {
    schemaVersion: "VP-ATOMIC-JSON-ARTIFACT-SET-v1",
    manifest: manifestIdentity,
  };
  const encodedMarker = encodeJson(marker);
  if (!markerBytes.equals(encodedMarker.bytes)
    || stableCanonicalJson(marker) !== stableCanonicalJson(expectedMarker)) {
    throw new Error("artifact-set commit marker does not bind the manifest");
  }
  if (!Array.isArray(manifest.entries)) throw new Error("artifact-set manifest entries missing");
  const entries = manifest.entries.map((value, index) =>
    parseArtifactIdentity(value, `manifest.entries[${index}]`));
  const boundNames = new Set<string>();
  for (const identity of entries) {
    if (boundNames.has(identity.file)) {
      throw new Error(`duplicate artifact identity: ${identity.file}`);
    }
    boundNames.add(identity.file);
    const stored = await readFile(join(root, identity.file));
    const value = JSON.parse(stored.toString("utf8")) as unknown;
    const encoded = encodeJson(value);
    if (!stored.equals(encoded.bytes)
      || stored.length !== identity.bytes
      || hashBytes(stored) !== identity.storedSha256
      || encoded.canonicalSha256 !== identity.canonicalSha256) {
      throw new Error(`artifact identity mismatch: ${identity.file}`);
    }
  }
  const expected = new Set(["COMMITTED.json", "manifest.json", ...entries.map((entry) => entry.file)]);
  if (names.length !== expected.size || names.some((name) => !expected.has(name))) {
    throw new Error("artifact set contains files not bound by its manifest");
  }
  return Object.freeze({
    directory: root,
    manifest: Object.freeze(manifest),
    manifestIdentity: Object.freeze(manifestIdentity),
    entries: Object.freeze(
      entries.map((entry) => Object.freeze({ ...entry }) as JsonArtifactIdentity),
    ),
  });
}
