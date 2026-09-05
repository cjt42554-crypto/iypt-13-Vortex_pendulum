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

const HASH_FIELDS = Object.freeze([
  "definitionSha256",
  "freshInitialPopulationSha256",
  "preAnalysisPopulationSha256",
  "analysisFirstStepPrePopulationSha256",
  "analysisFirstStepPostPopulationSha256",
  "frozenAuditStepPrePopulationSha256",
  "frozenAuditStepPostPopulationSha256",
  "everyAnalysisStepForceIdentitySummarySha256",
  "shortenedCompleteCaseScientificPayloadSha256",
]);

function assertScheduleIdentity(shard, expected) {
  if (!Number.isSafeInteger(shard.caseOrdinal)
    || shard.caseOrdinal < 0
    || shard.caseOrdinal > 7) {
    throw new Error("NO-GO-H2X-SHARD-OR-AGGREGATION: caseOrdinal");
  }
  if (!Number.isSafeInteger(shard.workerCount) || shard.workerCount < 1) {
    throw new Error("NO-GO-H2X-SHARD-OR-AGGREGATION: workerCount");
  }
  if (typeof shard.completionOrder !== "string"
    || shard.completionOrder.length === 0) {
    throw new Error("NO-GO-H2X-SHARD-OR-AGGREGATION: completionOrder");
  }
  for (const key of ["caseOrdinal", "workerCount", "completionOrder"]) {
    if (expected[key] !== undefined && shard[key] !== expected[key]) {
      throw new Error(`NO-GO-H2X-SHARD-OR-AGGREGATION: ${key}`);
    }
  }
}

export function buildH2xHashOnlyShard(input) {
  for (const field of HASH_FIELDS) {
    if (!/^[0-9a-f]{64}$/.test(input.hashes[field] ?? "")) {
      throw new Error(`NO-GO-H2X-SHARD-OR-AGGREGATION: ${field}`);
    }
  }
  const shard = Object.freeze({
    format: "VP-H2X-HASH-ONLY-QUALIFICATION-SHARD-v1",
    environmentId: input.environmentId,
    runId: input.runId,
    caseId: input.caseId,
    caseOrdinal: input.caseOrdinal,
    workerCount: input.workerCount,
    completionOrder: input.completionOrder,
    contractSha256: input.contractSha256,
    sourceIdentitySha256: input.sourceIdentitySha256,
    implementationCommit: input.implementationCommit,
    implementationTreeSha256: input.implementationTreeSha256,
    hashes: Object.freeze({ ...input.hashes }),
    equalityOnly: true,
    scientificValuesPersisted: false,
    scientificValuesHumanRead: false,
    fullResultBearingRunPerformed: false,
    canonicalA8rArtifactWritten: false,
  });
  assertScheduleIdentity(shard, input);
  return shard;
}

export function validateH2xHashOnlyShard(shard, expected) {
  if (shard.format !== "VP-H2X-HASH-ONLY-QUALIFICATION-SHARD-v1") {
    throw new Error("NO-GO-H2X-SHARD-OR-AGGREGATION: format");
  }
  for (const field of [
    "environmentId",
    "runId",
    "caseId",
    "contractSha256",
    "sourceIdentitySha256",
    "implementationCommit",
    "implementationTreeSha256",
  ]) {
    if (shard[field] !== expected[field]) {
      throw new Error(`NO-GO-H2X-SHARD-OR-AGGREGATION: ${field}`);
    }
  }
  assertScheduleIdentity(shard, expected);
  for (const field of HASH_FIELDS) {
    if (!/^[0-9a-f]{64}$/.test(shard.hashes?.[field] ?? "")) {
      throw new Error(`NO-GO-H2X-SHARD-OR-AGGREGATION: ${field}`);
    }
  }
  if (shard.equalityOnly !== true
    || shard.scientificValuesPersisted !== false
    || shard.scientificValuesHumanRead !== false
    || shard.fullResultBearingRunPerformed !== false
    || shard.canonicalA8rArtifactWritten !== false) {
    throw new Error("NO-GO-H2X-PROVENANCE-LEAK");
  }
  return true;
}

export async function writeH2xHashOnlyShard(path, shard) {
  const artifact = await writeAtomicCanonicalGzipExclusive(path, shard);
  const sidecarPath = path.replace(/\.json\.gz$/, ".sha256");
  if (sidecarPath === path) {
    throw new Error("H2-X shard path must end in .json.gz");
  }
  const sidecarText = [
    `${artifact.storedSha256}  ${basename(path)}`,
    `${artifact.canonicalSha256}  ${basename(path)}.canonical`,
    "",
  ].join("\n");
  const sidecar = await writeSidecarExclusive(sidecarPath, sidecarText);
  return Object.freeze({ artifact, sidecar, sidecarPath });
}

export async function readH2xHashOnlyShard(path) {
  const stored = await readFile(path);
  const canonical = gunzipSync(stored);
  const value = JSON.parse(canonical.toString("utf8"));
  const sidecarPath = path.replace(/\.json\.gz$/, ".sha256");
  const lines = (await readFile(sidecarPath, "utf8")).trimEnd().split("\n");
  if (lines[0] !== `${sha256Bytes(stored)}  ${basename(path)}`
    || lines[1] !== `${sha256Bytes(canonical)}  ${basename(path)}.canonical`) {
    throw new Error("NO-GO-H2X-SHARD-OR-AGGREGATION: sidecar");
  }
  return Object.freeze({
    value,
    storedSha256: sha256Bytes(stored),
    canonicalSha256: sha256Bytes(canonical),
    shardEnvelopeSha256: canonicalSha256(value),
    path: resolve(path),
    sidecarPath: resolve(sidecarPath),
  });
}

export { HASH_FIELDS as H2X_HASH_FIELDS };
