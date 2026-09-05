import { readFile } from "node:fs/promises";

import { aggregateShards } from "./aggregator.mjs";
import { createSyntheticBackend } from "./backend.mjs";
import { canonicalSha256, immutableJsonClone, sha256 } from "./canonical.mjs";
import {
  ACTIVE_CONTRACT_SHA256,
  assertActiveContract,
  loadActiveContract,
} from "./contract.mjs";
import { createSyntheticShard } from "./shard.mjs";

export const DEFAULT_MATRIX_URL = new URL(
  "../contracts/h1-synthetic-smoke-matrix.v1.json",
  import.meta.url,
);
export const SYNTHETIC_MATRIX_SHA256 =
  "de16a8715b7f668c255a16ecb3a58a2bf525fb5fa2b12e53f5f41c1f2493ca52";

function fail(message) {
  throw new Error(`NO-GO-HW1-NO-RESULT-SMOKE: ${message}`);
}

export async function loadSyntheticMatrix(matrixUrl = DEFAULT_MATRIX_URL) {
  const bytes = await readFile(matrixUrl);
  if (sha256(bytes) !== SYNTHETIC_MATRIX_SHA256) fail("matrix byte hash drifted");
  const matrix = JSON.parse(bytes.toString("utf8"));
  if (matrix.classification !== "synthetic-non-scientific") fail("matrix is not synthetic");
  if (matrix.caseIds.length !== 8 || new Set(matrix.caseIds).size !== 8) fail("matrix is not eight unique cases");
  if (matrix.forbiddenPayloadSource !== "A8R-or-experiment") fail("payload source boundary drifted");
  const expectedIndices = matrix.caseIds.map((_, index) => index);
  for (const [name, order] of Object.entries(matrix.completionOrders)) {
    if (JSON.stringify([...order].sort((a, b) => a - b)) !== JSON.stringify(expectedIndices)) {
      fail(`completion order ${name} is not a full permutation`);
    }
  }
  if (matrix.expectedCanonicalEquality !== true) fail("canonical equality gate is disabled");
  return immutableJsonClone(matrix);
}

export async function runNoResultSmoke(options = {}) {
  const contract = options.contract ?? await loadActiveContract();
  const matrix = options.matrix ?? await loadSyntheticMatrix();
  assertActiveContract(contract);
  const backend = createSyntheticBackend(
    {
      backendId: "g1-synthetic-backend",
      candidateClass: "trajectory-process-parallel",
      version: "1.0.0",
      availability: "AVAILABLE",
      staticReason: null,
      resultBlind: true,
      fullResultBearingRunForbidden: true,
      runtimeFallbackForbidden: true,
      estimatedPeakBytesPerWorker: 1024 * 1024,
      deviceId: "synthetic-device",
    },
    contract,
  );
  const contractHash = ACTIVE_CONTRACT_SHA256;
  const sourceHash = canonicalSha256({source: "VP-H1-FROZEN-SYNTHETIC-SOURCE-v1"});
  const dependencyHash = canonicalSha256({dependencies: []});
  const environmentHash = canonicalSha256({environment: "synthetic-lightweight"});
  const runs = {};

  for (const [orderName, order] of Object.entries(matrix.completionOrders)) {
    const workerCount = orderName === "simulatedFourWorker" ? 4 : 1;
    const schedulerId = orderName === "simulatedFourWorker"
      ? "synthetic-four-worker"
      : "synthetic-one-worker";
    const runId = orderName === "reversed" ? "G1-oneWorker" : `G1-${orderName}`;
    const shards = [];
    for (const index of order) {
      const caseId = matrix.caseIds[index];
      const result = await backend.runSyntheticCase({
        classification: matrix.classification,
        caseId,
        caseIndex: index,
        payloadSeed: matrix.payloadSeed,
      });
      shards.push(createSyntheticShard({
        classification: matrix.classification,
        matrixId: matrix.matrixId,
        caseId,
        caseIndex: index,
        runId,
        completeCase: true,
        stepZeroComplete: true,
        payload: result.payload,
        contractHash,
        sourceHash,
        dependencyHash,
        environmentHash,
        implementationHash: backend.implementationHash,
        schedulerId,
        workerCount,
        execution: result.execution,
      }, contract));
    }
    const aggregated = aggregateShards({
      shards,
      expectedCaseIds: matrix.caseIds,
      runId,
      sourceHash,
      contractHash,
      implementationHash: backend.implementationHash,
      matrixId: matrix.matrixId,
    }, contract);
    runs[orderName] = {
      canonicalPayloadHash: aggregated.aggregate.canonicalPayloadHash,
      canonicalPayloadByteHash: sha256(aggregated.canonicalPayloadBytes),
      manifestByteHash: sha256(aggregated.manifestBytes),
      caseCount: aggregated.aggregate.caseCount,
    };
  }
  const payloadHashes = new Set(Object.values(runs).map((run) => run.canonicalPayloadByteHash));
  if (matrix.expectedCanonicalEquality !== true || payloadHashes.size !== 1) {
    fail("worker count or completion order changed canonical payload bytes");
  }
  if (runs.oneWorker.manifestByteHash !== runs.reversed.manifestByteHash) {
    fail("completion order changed canonical manifest bytes");
  }
  const body = {
    classification: "PASS-HW1-V2-NO-RESULT-SYNTHETIC-SMOKE",
    matrixId: matrix.matrixId,
    caseCount: matrix.caseIds.length,
    canonicalPayloadByteHash: [...payloadHashes][0],
    completionOrderManifestEquality: true,
    scientificPayloadInspected: false,
    fullResultBearingRunPerformed: false,
    heavyProbePerformed: false,
    runs,
  };
  return immutableJsonClone({...body, smokeHash: canonicalSha256(body)});
}
