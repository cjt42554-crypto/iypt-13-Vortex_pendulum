import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  access,
  mkdir,
  open,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import {
  gunzip as gunzipCallback,
  gzip as gzipCallback,
} from "node:zlib";
import { canonicalBytes, sha256Bytes } from "./canonical.mjs";

const gzip = promisify(gzipCallback);
const gunzip = promisify(gunzipCallback);

async function fsyncPath(path, flags = "r") {
  const handle = await open(path, flags);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function moveNoReplace(partialPath, finalPath) {
  const child = spawn(
    "mv",
    ["--no-clobber", "--no-target-directory", partialPath, finalPath],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const code = await new Promise((accept, reject) => {
    child.once("error", reject);
    child.once("exit", accept);
  });
  if (code !== 0) {
    throw new Error(
      `atomic publish failed (${code}): `
        + Buffer.concat(stderr).toString("utf8")
        + Buffer.concat(stdout).toString("utf8"),
    );
  }
  if (await exists(partialPath)) {
    throw new Error(`atomic publish refused existing target ${finalPath}`);
  }
}

export async function writeAtomicBytesExclusive(finalPath, bytes) {
  const absoluteFinal = resolve(finalPath);
  const parent = dirname(absoluteFinal);
  await mkdir(parent, { recursive: true });
  if (await exists(absoluteFinal)) {
    throw new Error(`final output already exists: ${absoluteFinal}`);
  }
  const partialPath = `${absoluteFinal}.partial-${process.pid}-${randomUUID()}`;
  const handle = await open(partialPath, "wx", 0o600);
  let published = false;
  try {
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    await moveNoReplace(partialPath, absoluteFinal);
    published = true;
    await fsyncPath(parent);
  } finally {
    try {
      await handle.close();
    } catch (error) {
      if (error?.code !== "EBADF") throw error;
    }
    if (!published) await rm(partialPath, { force: true });
  }
  const stored = await readFile(absoluteFinal);
  if (!stored.equals(Buffer.from(bytes))) {
    throw new Error(`published bytes changed for ${absoluteFinal}`);
  }
  return Object.freeze({
    path: absoluteFinal,
    bytes: stored.length,
    sha256: sha256Bytes(stored),
    inode: String((await stat(absoluteFinal)).ino),
  });
}

export async function writeSidecarExclusive(path, text) {
  const absolutePath = resolve(path);
  const parent = dirname(absolutePath);
  await mkdir(parent, { recursive: true });
  await writeFile(absolutePath, text, { encoding: "utf8", flag: "wx", mode: 0o600 });
  await fsyncPath(absolutePath);
  await fsyncPath(parent);
  return Object.freeze({
    path: absolutePath,
    bytes: Buffer.byteLength(text),
    sha256: sha256Bytes(Buffer.from(text, "utf8")),
  });
}

export async function deterministicGzipCanonical(value) {
  const canonical = canonicalBytes(value);
  const stored = await gzip(canonical, { level: 9, mtime: 0 });
  return Object.freeze({
    canonical,
    stored,
    canonicalSha256: sha256Bytes(canonical),
    storedSha256: sha256Bytes(stored),
  });
}

export async function writeAtomicCanonicalGzipExclusive(path, value) {
  const encoded = await deterministicGzipCanonical(value);
  const storedIdentity = await writeAtomicBytesExclusive(path, encoded.stored);
  return Object.freeze({
    ...storedIdentity,
    canonicalBytes: encoded.canonical.length,
    canonicalSha256: encoded.canonicalSha256,
    storedSha256: encoded.storedSha256,
  });
}

export async function writeCanonicalGzipWithSidecarExclusive(path, value) {
  if (!String(path).endsWith(".json.gz")) {
    throw new Error("canonical gzip artifact path must end in .json.gz");
  }
  const artifact = await writeAtomicCanonicalGzipExclusive(path, value);
  const sidecarPath = String(path).replace(/\.json\.gz$/, ".sha256");
  const sidecar = await writeSidecarExclusive(
    sidecarPath,
    [
      `${artifact.storedSha256}  ${basename(path)}`,
      `${artifact.canonicalSha256}  ${basename(path)}.canonical`,
      "",
    ].join("\n"),
  );
  return Object.freeze({ artifact, sidecar, sidecarPath: resolve(sidecarPath) });
}

export async function readCanonicalGzipWithSidecar(path) {
  if (!String(path).endsWith(".json.gz")) {
    throw new Error("canonical gzip artifact path must end in .json.gz");
  }
  const absolutePath = resolve(path);
  const sidecarPath = String(absolutePath).replace(/\.json\.gz$/, ".sha256");
  const [stored, sidecarText] = await Promise.all([
    readFile(absolutePath),
    readFile(sidecarPath, "utf8"),
  ]);
  const canonical = await gunzip(stored);
  const value = JSON.parse(canonical.toString("utf8"));
  if (!canonical.equals(canonicalBytes(value))) {
    throw new Error(`non-canonical gzip artifact ${absolutePath}`);
  }
  const lines = sidecarText.trimEnd().split("\n");
  if (lines.length !== 2
    || lines[0] !== `${sha256Bytes(stored)}  ${basename(absolutePath)}`
    || lines[1]
      !== `${sha256Bytes(canonical)}  ${basename(absolutePath)}.canonical`) {
    throw new Error(`canonical gzip sidecar mismatch ${absolutePath}`);
  }
  return Object.freeze({
    value: Object.freeze(value),
    path: absolutePath,
    sidecarPath,
    storedSha256: sha256Bytes(stored),
    canonicalSha256: sha256Bytes(canonical),
  });
}
