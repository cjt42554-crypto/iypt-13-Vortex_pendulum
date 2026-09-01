import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { aggregateH2xQualification } from "../src/aggregator.mjs";
import { loadH2nContract, loadH2xContract } from "../src/contract.mjs";
import { buildH2xQualificationDefinitions } from "../src/definitions.mjs";
import { buildH2nStage0Native } from "../scripts/build-h2n-stage0.mjs";
import { runH2nStage0NumericalComparison } from "../src/h2n-stage0-runner.mjs";
import { runH2nStage0NativePerformance } from "../src/h2n-stage0-native.mjs";
import {
  H2N_STAGE0_FIXTURE_SEED,
  H2N_STAGE0_FIXTURE_SHA256,
  buildH2nStage0Fixture,
} from "../src/h2n-stage0-reference.mjs";
import {
  deriveH2xMemorySafeMaximum,
  H2X_WORKER_MEMORY_BOUND_BYTES,
  buildResultBlindSchedule,
  executeResultBlindSchedule,
  resolveH2xWorkerCounts,
} from "../src/scheduler.mjs";
import { compareResourceSnapshots } from "../src/repository-preflight.mjs";
import {
  H2X_HASH_FIELDS,
  buildH2xHashOnlyShard,
  readH2xHashOnlyShard,
  validateH2xHashOnlyShard,
  writeH2xHashOnlyShard,
} from "../src/shard.mjs";

const hash = (text) => createHash("sha256").update(text).digest("hex");

function baseIdentity(contractSha256, sourceIdentitySha256, runId) {
  return {
    environmentId: "synthetic-env",
    runId,
    contractSha256,
    sourceIdentitySha256,
    implementationCommit: "1".repeat(40),
    implementationTreeSha256: "2".repeat(64),
  };
}

function fakeHashes(caseId) {
  return Object.fromEntries(
    H2X_HASH_FIELDS.map((field) => [field, hash(`${caseId}:${field}`)]),
  );
}

test("H2-X qualification definitions preserve frozen identities with step-only overrides", async () => {
  const loaded = await loadH2xContract();
  const built = await buildH2xQualificationDefinitions(loaded.contract);
  assert.equal(built.definitions.length, 8);
  assert.equal(new Set(built.definitions.map(({ id }) => id)).size, 8);
  for (const definition of built.definitions) {
    assert.equal(definition.qualificationIdentity, "H2X-SHORTENED-COMPLETE-CASE-v1");
    assert.equal(definition.analysisSamples, definition.totalSteps - definition.discardSteps);
    assert.equal(definition.halfWindowSamples, definition.analysisSamples / 2);
    assert.equal(definition.diagnosticBlockSamples, definition.analysisSamples / 4);
  }
});

test("H2-X scheduler uses only frozen cost and is deterministic", async () => {
  const loaded = await loadH2xContract();
  const built = await buildH2xQualificationDefinitions(loaded.contract);
  const first = buildResultBlindSchedule(
    built.definitions,
    4,
    "descending-frozen-cost",
  );
  const second = buildResultBlindSchedule(
    [...built.definitions].reverse(),
    4,
    "descending-frozen-cost",
  );
  assert.deepEqual(first, second);
  assert.equal(first.lanes.flatMap(({ caseIds }) => caseIds).length, 8);
  assert.equal(new Set(first.lanes.flatMap(({ caseIds }) => caseIds)).size, 8);
  const executed = await executeResultBlindSchedule({
    definitions: built.definitions,
    workerCount: 3,
    order: "reverse-canonical-case-id",
    executor: async (definition, laneId) => ({ caseId: definition.id, laneId }),
  });
  assert.equal(executed.results.length, 8);
});

test("H2-X resolves the complete frozen worker matrix inside a finite envelope", async () => {
  const loaded = await loadH2xContract();
  const memorySafeMaximum = deriveH2xMemorySafeMaximum({
    memoryMax: 8 * 1024 ** 3,
    memoryCurrent: 512 * 1024 ** 2,
  }, 32);
  assert.equal(H2X_WORKER_MEMORY_BOUND_BYTES, 768 * 1024 ** 2);
  assert.equal(memorySafeMaximum, 8);
  assert.deepEqual(resolveH2xWorkerCounts(loaded.contract, {
    memorySafeMaximum,
    selectedHw2rWorkerCount: 3,
  }), [1, 2, 3, 4, 8]);
  assert.throws(() => resolveH2xWorkerCounts(loaded.contract, {
    memorySafeMaximum: 4,
    selectedHw2rWorkerCount: 8,
  }));
});

test("resource comparison fails closed on memory.high growth and lost reserve", () => {
  const contract = {
    safety: {
      systemReserveBytesMinimum: 4 * 1024 ** 3,
      systemReserveMemTotalFraction: 0.25,
      swapGrowthMaximumBytes: 0,
      oomEventGrowthMaximum: 0,
      memoryHighEventGrowthMaximum: 0,
    },
  };
  const before = {
    meminfo: {
      MemTotal: 16 * 1024 ** 3,
      MemAvailable: 8 * 1024 ** 3,
      SwapTotal: 0,
      SwapFree: 0,
    },
    memoryEvents: { oom: 0, oom_kill: 0, high: 0 },
  };
  const high = compareResourceSnapshots(contract, before, {
    ...before,
    memoryEvents: { oom: 0, oom_kill: 0, high: 1 },
  });
  assert.equal(high.pass, false);
  const reserve = compareResourceSnapshots(contract, before, {
    ...before,
    meminfo: { ...before.meminfo, MemAvailable: 3 * 1024 ** 3 },
  });
  assert.equal(reserve.pass, false);
  assert.equal(reserve.systemReserveAfterPass, false);
});

test("H2-X hash-only shard is atomic and refuses overwrite or drift", async () => {
  const loaded = await loadH2xContract();
  const identity = baseIdentity(
    loaded.contractSha256,
    loaded.sourceIdentity.canonicalSha256,
    "synthetic-candidate",
  );
  const shard = buildH2xHashOnlyShard({
    ...identity,
    caseId: "case-a",
    caseOrdinal: 0,
    workerCount: 2,
    completionOrder: "canonical-case-id",
    hashes: fakeHashes("case-a"),
  });
  const root = await mkdtemp(join(tmpdir(), "iypt13-h2x-"));
  try {
    const path = join(root, "case-a.json.gz");
    await writeH2xHashOnlyShard(path, shard);
    const read = await readH2xHashOnlyShard(path);
    assert.equal(validateH2xHashOnlyShard(read.value, {
      ...identity,
      caseId: "case-a",
    }), true);
    await assert.rejects(() => writeH2xHashOnlyShard(path, shard));
    assert.throws(() => validateH2xHashOnlyShard(read.value, {
      ...identity,
      caseId: "case-a",
      implementationCommit: "9".repeat(40),
    }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("H2-X aggregate is order independent and fails closed on mismatch", async () => {
  const loaded = await loadH2xContract();
  const oracleIdentity = baseIdentity(
    loaded.contractSha256,
    loaded.sourceIdentity.canonicalSha256,
    "synthetic-oracle",
  );
  const candidateIdentity = {
    ...oracleIdentity,
    runId: "synthetic-candidate",
  };
  const caseIds = Array.from({ length: 8 }, (_, index) => `case-${index}`);
  const make = (caseId, caseOrdinal, identity) => buildH2xHashOnlyShard({
    ...identity,
    caseId,
    caseOrdinal,
    workerCount: identity.runId.endsWith("oracle") ? 1 : 4,
    completionOrder: "canonical-case-id",
    hashes: fakeHashes(caseId),
  });
  const oracleShards = caseIds.map((caseId, index) => make(caseId, index, oracleIdentity));
  const candidateShards = caseIds.map((caseId, index) => make(caseId, index, candidateIdentity));
  const forward = aggregateH2xQualification({
    oracleShards,
    candidateShards,
    oracleIdentity,
    candidateIdentity,
  });
  const reverse = aggregateH2xQualification({
    oracleShards: [...oracleShards].reverse(),
    candidateShards: [...candidateShards].reverse(),
    oracleIdentity,
    candidateIdentity,
  });
  assert.equal(forward.classification,
    "PASS-H2X-EXACT-SCIENTIFIC-EXECUTION-EQUIVALENCE-CANDIDATE-ONLY");
  assert.equal(forward.canonicalSha256, reverse.canonicalSha256);
  const drift = JSON.parse(JSON.stringify(candidateShards[0]));
  drift.hashes.shortenedCompleteCaseScientificPayloadSha256 = "f".repeat(64);
  const altered = [drift, ...candidateShards.slice(1)];
  const failed = aggregateH2xQualification({
    oracleShards,
    candidateShards: altered,
    oracleIdentity,
    candidateIdentity,
  });
  assert.equal(failed.pass, false);
  assert.equal(failed.classification,
    "NO-GO-H2X-SCIENTIFIC-PAYLOAD-HASH-MISMATCH");
});

test("H2-N fixture seed and little-endian Float64 layout are frozen", () => {
  assert.equal(H2N_STAGE0_FIXTURE_SHA256,
    "8ab858a072029aa2c3a5a2570c4e9fca9f80d75755202f66072431a250f2da8a");
  assert.equal(H2N_STAGE0_FIXTURE_SEED, 0x8ab858a0);
  const first = buildH2nStage0Fixture(8, 8);
  const second = buildH2nStage0Fixture(8, 8);
  assert.deepEqual(first, second);
  assert.equal(first.length, 8 * 8 * 9);
  assert.equal(first.every(Number.isFinite), true);
});

test("H2-N strict native CPU port matches the formal solver on a no-result fixture", async () => {
  const root = await mkdtemp(join(tmpdir(), "iypt13-h2n-test-"));
  try {
    const binary = await buildH2nStage0Native(join(root, "h2n-stage0"));
    const loadedContract = await loadH2nContract();
    const result = await runH2nStage0NumericalComparison({
      mode: "no-result-smoke",
      loadedContract,
      binaryPath: binary.outputPath,
      binaryIdentity: binary.identity,
      backend: "cpu",
      size: Object.freeze({
        sizeId: "unit-32x16-d1",
        diameterCells: 1,
        nx: 32,
        ny: 16,
        steps: 2,
      }),
      bodyModeId: "fixed-body-baseline-phase",
      maskHalfThicknessCells: 0.75,
      checkpointSteps: [0, 1, 2],
      threads: 2,
    });
    assert.equal(result.pass, true);
    assert.equal(result.scientificValuesPersisted, false);
    assert.equal(result.fullEightCaseResultBearingRunPerformed, false);
    assert.equal(result.canonicalA8rArtifactWritten, false);
    const performanceEnvelope = await runH2nStage0NativePerformance({
      binaryPath: binary.outputPath,
      backend: "cpu",
      nx: 32,
      ny: 16,
      steps: 2,
      diameterCells: 1,
      maskHalfThicknessCells: 0.75,
      phaseOffsetYCells: 0.17320508075688773,
      nativeBodyMode: "fixed-body",
      threads: 2,
      batchCount: 1,
    });
    assert.equal(performanceEnvelope.correctnessPass, true);
    assert.match(performanceEnvelope.correctnessSha256, /^[0-9a-f]{64}$/);
    assert.equal(performanceEnvelope.scientificValuesPersisted, false);
    assert.equal(Object.values(performanceEnvelope.operationCoverage).every(Boolean), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
