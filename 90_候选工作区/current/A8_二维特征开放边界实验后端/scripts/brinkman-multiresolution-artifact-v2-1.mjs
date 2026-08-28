import { createHash } from "node:crypto";
import { open, readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT } from
  "../src/brinkman-multiresolution-contract-v2-1.ts";
import {
  sha256CanonicalJson,
  sha256File,
  streamSelectedJsonValues,
} from "./formal-causal-reference-artifact-stream.mjs";

export const GIT_LFS_POINTER_PREFIX =
  "version https://git-lfs.github.com/spec/v1";

function expectedSidecarText(artifactPath, canonicalSha256, storedSha256) {
  const storedName = basename(artifactPath);
  const canonicalName = storedName.replace(/\.gz$/, "")
    + " (canonical uncompressed bytes)";
  return canonicalSha256 + "  " + canonicalName + "\n"
    + storedSha256 + "  " + storedName + "\n";
}

async function sha256Bytes(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

/**
 * Fail before gzip parsing when a checkout contains only the Git LFS pointer.
 * The prefix is read from a bounded buffer; the artifact is never converted
 * into one giant string.
 */
export async function assertMaterializedArtifact(path, label = "artifact") {
  const identity = await stat(path);
  if (!identity.isFile()) {
    throw new Error(`A8R v2.1 ${label} is not a regular file: ${path}`);
  }
  const handle = await open(path, "r");
  try {
    const prefix = Buffer.alloc(GIT_LFS_POINTER_PREFIX.length);
    const { bytesRead } = await handle.read(
      prefix,
      0,
      prefix.length,
      0,
    );
    if (bytesRead === prefix.length
      && prefix.toString("utf8") === GIT_LFS_POINTER_PREFIX) {
      throw new Error(
        `A8R v2.1 ${label} is an unmaterialized Git LFS pointer: ${path}; `
        + "materialize the exact object before qualification",
      );
    }
  } finally {
    await handle.close();
  }
  return { bytes: identity.size, materialized: true };
}

export async function verifyArtifactIdentity(input) {
  const {
    artifactPath,
    sidecarPath,
    expectedStoredBytes,
    expectedCanonicalBytes,
    expectedStoredSha256,
    expectedCanonicalSha256,
    expectedSidecarSha256,
    label = "artifact",
  } = input;
  const materialization = await assertMaterializedArtifact(
    artifactPath,
    label,
  );
  if (materialization.bytes !== expectedStoredBytes) {
    throw new Error(
      `A8R v2.1 ${label} stored byte count mismatch: `
      + `${materialization.bytes} != ${expectedStoredBytes}`,
    );
  }
  const stored = await sha256File(artifactPath);
  if (stored.sha256 !== expectedStoredSha256) {
    throw new Error(`A8R v2.1 ${label} stored SHA-256 mismatch`);
  }
  const sidecarSha256 = await sha256Bytes(sidecarPath);
  if (expectedSidecarSha256 !== undefined
    && sidecarSha256 !== expectedSidecarSha256) {
    throw new Error(`A8R v2.1 ${label} sidecar SHA-256 mismatch`);
  }
  const sidecar = await readFile(sidecarPath, "utf8");
  const expectedSidecar = expectedSidecarText(
    artifactPath,
    expectedCanonicalSha256,
    expectedStoredSha256,
  );
  if (sidecar !== expectedSidecar) {
    throw new Error(`A8R v2.1 ${label} sidecar contents mismatch`);
  }
  const canonical = await sha256CanonicalJson(artifactPath);
  if (canonical.bytes !== expectedCanonicalBytes) {
    throw new Error(
      `A8R v2.1 ${label} canonical byte count mismatch: `
      + `${canonical.bytes} != ${expectedCanonicalBytes}`,
    );
  }
  if (canonical.sha256 !== expectedCanonicalSha256) {
    throw new Error(`A8R v2.1 ${label} canonical SHA-256 mismatch`);
  }
  return {
    materialized: true,
    storedBytes: stored.bytes,
    storedSha256: stored.sha256,
    canonicalBytes: canonical.bytes,
    canonicalSha256: canonical.sha256,
    sidecarSha256,
    sidecarExact: true,
  };
}

export async function loadFrozenA8qD24AnchorRuns(repositoryRoot) {
  const frozen = CONTRACT.sourceIdentity.frozenA8q;
  const artifactPath = resolve(repositoryRoot, frozen.artifact.relativePath);
  const sidecarPath = resolve(repositoryRoot, frozen.sidecar.relativePath);
  const identity = await verifyArtifactIdentity({
    artifactPath,
    sidecarPath,
    expectedStoredBytes: frozen.artifact.storedBytes,
    expectedCanonicalBytes: frozen.artifact.canonicalBytes,
    expectedStoredSha256: frozen.artifact.storedSha256,
    expectedCanonicalSha256: frozen.artifact.canonicalSha256,
    expectedSidecarSha256: frozen.sidecar.sha256,
    label: "frozen A8Q anchor artifact",
  });
  const byId = new Map();
  for await (const { value } of streamSelectedJsonValues(
    artifactPath,
    /^(runs\.4|runs\.7)$/,
  )) {
    const id = value?.definition?.id;
    if (typeof id !== "string") {
      throw new Error("A8R v2.1 selected A8Q anchor run has no case ID");
    }
    if (byId.has(id)) {
      throw new Error(`A8R v2.1 duplicate A8Q anchor case ${id}`);
    }
    byId.set(id, value);
  }
  const expectedIds = frozen.d24AnchorCaseIds;
  if (byId.size !== expectedIds.length
    || !expectedIds.every((id) => byId.has(id))) {
    throw new Error("A8R v2.1 frozen A8Q D24 anchor cases are incomplete");
  }
  return {
    artifactPath,
    sidecarPath,
    identity,
    runsById: byId,
  };
}
