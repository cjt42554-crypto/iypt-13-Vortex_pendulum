import { basename, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import {
  canonicalSha256,
  sha256Bytes,
} from "../../_shared/src/canonical.mjs";
import {
  writeAtomicCanonicalGzipExclusive,
  writeSidecarExclusive,
} from "../../_shared/src/atomic.mjs";

export function buildSyntheticDryRunShard(input) {
  if (input.syntheticPayload === null
    || typeof input.syntheticPayload !== "object"
    || Array.isArray(input.syntheticPayload)) {
    throw new TypeError("synthetic payload must be a plain object");
  }
  const scientificPayloadCanonicalSha256 = canonicalSha256(
    input.syntheticPayload,
  );
  return Object.freeze({
    format: "VP-H3P-SYNTHETIC-ATOMIC-CASE-SHARD-v1",
    runId: input.runId,
    environmentId: input.environmentId,
    caseId: input.caseId,
    caseOrdinal: input.caseOrdinal,
    sourceCommit: input.sourceCommit,
    implementationCommit: input.implementationCommit,
    implementationTreeSha256: input.implementationTreeSha256,
    contractSha256: input.contractSha256,
    dependencyIdentitySha256: input.dependencyIdentitySha256,
    executionIdentitySha256: input.executionIdentitySha256,
    caseStartedAtStepZero: true,
    completedSteps: 1,
    expectedSteps: 1,
    caseCompleteAndFinite: true,
    syntheticPayload: input.syntheticPayload,
    scientificPayloadCanonicalSha256,
    artifactIdentity: "h3p-synthetic-dry-run-only",
    scientificPayloadPresent: false,
    formalSolverConstructed: false,
  });
}

export function validateSyntheticDryRunShard(shard, expected) {
  if (shard.format !== "VP-H3P-SYNTHETIC-ATOMIC-CASE-SHARD-v1") {
    throw new Error("NO-GO-H3P-SHARD-ATOMICITY: format");
  }
  for (const key of [
    "runId",
    "environmentId",
    "caseId",
    "sourceCommit",
    "implementationCommit",
    "implementationTreeSha256",
    "contractSha256",
    "dependencyIdentitySha256",
    "executionIdentitySha256",
  ]) {
    if (shard[key] !== expected[key]) {
      throw new Error(`NO-GO-H3P-RECOVERY-IDENTITY: ${key}`);
    }
  }
  if (shard.caseStartedAtStepZero !== true
    || shard.caseCompleteAndFinite !== true
    || shard.completedSteps !== shard.expectedSteps
    || shard.scientificPayloadPresent !== false
    || shard.formalSolverConstructed !== false) {
    throw new Error("NO-GO-H3P-SHARD-ATOMICITY: completion boundary");
  }
  if (canonicalSha256(shard.syntheticPayload)
    !== shard.scientificPayloadCanonicalSha256) {
    throw new Error("NO-GO-H3P-SHARD-ATOMICITY: synthetic payload hash");
  }
  return true;
}

export async function writeSyntheticDryRunShard(outputPath, shard) {
  const artifact = await writeAtomicCanonicalGzipExclusive(outputPath, shard);
  const sidecarPath = outputPath.replace(/\.json\.gz$/, ".sha256");
  if (sidecarPath === outputPath) {
    throw new Error("synthetic shard output must end with .json.gz");
  }
  const sidecarText = [
    `${artifact.storedSha256}  ${basename(outputPath)}`,
    `${artifact.canonicalSha256}  ${basename(outputPath)}.canonical`,
    "",
  ].join("\n");
  const sidecar = await writeSidecarExclusive(sidecarPath, sidecarText);
  return Object.freeze({ artifact, sidecar, sidecarPath });
}

export async function readSyntheticDryRunShard(outputPath) {
  const stored = await readFile(outputPath);
  const canonical = gunzipSync(stored);
  const value = JSON.parse(canonical.toString("utf8"));
  const sidecarPath = outputPath.replace(/\.json\.gz$/, ".sha256");
  const sidecar = await readFile(sidecarPath, "utf8");
  const expectedStored = `${sha256Bytes(stored)}  ${basename(outputPath)}`;
  const expectedCanonical = `${sha256Bytes(canonical)}  ${basename(outputPath)}.canonical`;
  const lines = sidecar.trimEnd().split("\n");
  if (lines[0] !== expectedStored || lines[1] !== expectedCanonical) {
    throw new Error("NO-GO-H3P-SHARD-ATOMICITY: sidecar");
  }
  return Object.freeze({
    value,
    storedSha256: sha256Bytes(stored),
    canonicalSha256: sha256Bytes(canonical),
    sidecarSha256: sha256Bytes(Buffer.from(sidecar, "utf8")),
    path: resolve(outputPath),
    sidecarPath: resolve(sidecarPath),
  });
}
