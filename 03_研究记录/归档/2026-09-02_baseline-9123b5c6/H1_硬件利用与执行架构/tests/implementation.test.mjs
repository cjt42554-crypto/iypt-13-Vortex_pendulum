import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { aggregateShards } from "../src/aggregator.mjs";
import { createSyntheticBackend } from "../src/backend.mjs";
import {
  canonicalJson,
  canonicalSha256,
  immutableJsonClone,
} from "../src/canonical.mjs";
import {
  ACTIVE_CONTRACT_SHA256,
  assertActiveContract,
  loadActiveContract,
} from "../src/contract.mjs";
import {
  buildInventorySnapshot,
  collectStaticInventory,
  validateInventorySnapshot,
} from "../src/inventory.mjs";
import { buildResultBlindPlan } from "../src/planner.mjs";
import {
  evaluateProbeCandidate,
  selectQualifiedCandidate,
  validateProbeResult,
} from "../src/probe-protocol.mjs";
import { assertResultBlind, createProvenance } from "../src/provenance.mjs";
import {
  createSyntheticShard,
  validateShard,
  writeShardAtomic,
} from "../src/shard.mjs";
import {
  loadSyntheticMatrix,
  runNoResultSmoke,
} from "../src/smoke.mjs";

const contract = await loadActiveContract();
const matrix = await loadSyntheticMatrix();
const GiB = 1024 ** 3;
const probeSourceHash = canonicalSha256({source: "synthetic-probe-source"});
const probeDependencyHash = canonicalSha256({dependencies: ["synthetic"]});
const probeImplementationHash = canonicalSha256({implementation: "synthetic-candidate"});
const probeEnvironmentHash = canonicalSha256({environment: "synthetic-probe"});

function inventoryProviders({
  memTotalBytes = 32 * GiB,
  memAvailableBytes = 24 * GiB,
  foreignGpu = false,
} = {}) {
  return {
    cpu: {
      model: "synthetic-cpu",
      socketCount: 1,
      physicalCoreCount: 8,
      logicalCpuCount: 16,
    },
    numa: {nodeCount: 1, nodes: [0]},
    cache: {l3Bytes: 16 * 1024 ** 2},
    isa: {flags: ["synthetic-simd"]},
    memory: {memTotalBytes, memAvailableBytes},
    cgroup: {
      memoryLimitBytes: 28 * GiB,
      memoryCurrentBytes: 2 * GiB,
      memoryEvents: {max: 0, oom: 0, oomKill: 0},
    },
    swap: {usedBytes: 0, totalBytes: 8 * GiB},
    gpu: {
      devices: [{
        deviceId: "synthetic-gpu-0",
        model: "synthetic-gpu",
        accessible: true,
        foreignProcessPresent: foreignGpu,
        computeApis: ["synthetic-api"],
      }],
    },
    operatingSystem: {name: "synthetic-os", version: "1"},
    kernel: {release: "synthetic-kernel"},
    node: {version: "v24.19.0"},
    v8: {version: "synthetic-v8"},
    compiler: {identity: "synthetic-compiler"},
    filesystem: {temporaryDeviceId: "synthetic-device", mountIdentity: "synthetic-mount"},
    thermalProxy: {available: true, throttled: false, frequencyReadable: true},
  };
}

function buildInventory(options = {}) {
  return buildInventorySnapshot({
    observedAt: "2026-09-01T00:00:00Z",
    providers: inventoryProviders(options),
  }, contract);
}

function descriptor(candidateClass, index, overrides = {}) {
  const gpu = candidateClass === "gpu-compute" || candidateClass === "cpu-gpu-hybrid";
  return {
    backendId: `synthetic-${index}-${candidateClass}`,
    candidateClass,
    version: "1.0.0",
    availability: "AVAILABLE",
    staticReason: null,
    resultBlind: true,
    fullResultBearingRunForbidden: true,
    runtimeFallbackForbidden: true,
    estimatedPeakBytesPerWorker: 512 * 1024 ** 2,
    deviceId: gpu ? "synthetic-gpu-0" : "synthetic-cpu",
    ...overrides,
  };
}

function allBackendDescriptors(overrides = {}) {
  return contract.candidateClasses.map((candidateClass, index) =>
    descriptor(candidateClass, index, overrides[candidateClass]),
  );
}

function probeRepeat(wallTimeSeconds, overrides = {}) {
  return {
    wallTimeSeconds,
    cpuUtilizationFraction: 0.8,
    memoryBandwidthFraction: 0.5,
    gpuBusyFraction: 0,
    transferFraction: 0,
    rssBytes: 1 * GiB,
    memAvailableBytes: 24 * GiB,
    swapBytes: 0,
    memoryEventsDelta: {max: 0, oom: 0, oomKill: 0},
    thermalThrottle: false,
    frequencyDropFraction: 0.02,
    exitCode: 0,
    signal: null,
    ...overrides,
  };
}

function baselineProbe(overrides = {}) {
  return {
    classification: "synthetic-result-blind-probe",
    contractHash: ACTIVE_CONTRACT_SHA256,
    sourceHash: probeSourceHash,
    workUnitsMillion: 1500,
    repeats: [probeRepeat(30), probeRepeat(30.1), probeRepeat(29.9)],
    ...overrides,
  };
}

function candidateProbe(overrides = {}) {
  return {
    classification: "synthetic-result-blind-probe",
    contractHash: ACTIVE_CONTRACT_SHA256,
    sourceHash: probeSourceHash,
    dependencyHash: probeDependencyHash,
    implementationHash: probeImplementationHash,
    environmentHash: probeEnvironmentHash,
    backendId: "synthetic-fast-cpu",
    candidateClass: "trajectory-process-parallel",
    schedulerId: "synthetic-scheduler",
    deviceId: "synthetic-cpu",
    repeats: [probeRepeat(20), probeRepeat(20.1), probeRepeat(19.9)],
    workUnitsMillion: 1500,
    resourceUnits: 2,
    correctnessPass: true,
    environmentComparable: true,
    memTotalBytes: 32 * GiB,
    baselineSwapBytes: 0,
    cgroupLimitBytes: 16 * GiB,
    soakThroughputDegradationFraction: 0.05,
    additionalCpuGainAtBandwidthSaturation: 0.1,
    cpuFeedSingleThreadBottleneck: false,
    runtimeFallbackOccurred: false,
    ...overrides,
  };
}

async function buildShards({
  order = matrix.completionOrders.oneWorker,
  runId = "G1-test-run",
  sourceHash = canonicalSha256({source: "synthetic-source"}),
  schedulerId = "synthetic-scheduler",
  workerCount = 1,
} = {}) {
  const backend = createSyntheticBackend(
    descriptor("trajectory-process-parallel", 0, {
      backendId: "synthetic-shard-backend",
      estimatedPeakBytesPerWorker: 1024,
    }),
    contract,
  );
  const contractHash = ACTIVE_CONTRACT_SHA256;
  const dependencyHash = canonicalSha256({dependencies: []});
  const environmentHash = canonicalSha256({environment: "synthetic"});
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
  return {
    shards,
    sourceHash,
    contractHash,
    implementationHash: backend.implementationHash,
    matrixId: matrix.matrixId,
    runId,
  };
}

test("active loader accepts only the exact v2 bytes and never falls back to v1", async () => {
  assert.equal(assertActiveContract(contract), contract);
  const v1Url = new URL("../contracts/h1-machine-contract.v1.json", import.meta.url);
  const v1 = JSON.parse(await readFile(v1Url, "utf8"));
  assert.throws(() => assertActiveContract(v1), /CONTRACT-MAPPING/u);
  await assert.rejects(loadActiveContract({contractUrl: v1Url}), /byte hash drifted/u);
  await assert.rejects(loadActiveContract({contractUrl: null}), /fallback is forbidden/u);
});

test("canonical JSON is order-independent and rejects non-finite or cyclic data", () => {
  assert.equal(canonicalJson({b: 2, a: 1}), canonicalJson({a: 1, b: 2}));
  assert.equal(canonicalJson({value: -0}), '{"value":0}');
  assert.throws(() => canonicalJson({value: Number.NaN}), /non-finite/u);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => canonicalJson(cyclic), /cycle/u);
  const frozen = immutableJsonClone({nested: {value: 1}});
  assert.equal(Object.isFrozen(frozen.nested), true);
});

test("provenance rejects scientific values and execution fields in the scientific layer", () => {
  assert.throws(() => assertResultBlind({drag: 1}, contract), /SCIENTIFIC-FIELD-LEAK/u);
  assert.throws(() => assertResultBlind({scientificDecision: "PASS"}, contract));
  assert.throws(() => createProvenance({
    scientific: {wallTimeSeconds: 1},
    execution: {},
    artifact: {},
  }, contract), /scientific.wallTimeSeconds/u);
});

test("frozen eight-case smoke is canonical across worker count and completion order", async () => {
  const result = await runNoResultSmoke({contract, matrix});
  assert.equal(result.classification, "PASS-HW1-V2-NO-RESULT-SYNTHETIC-SMOKE");
  assert.equal(result.caseCount, 8);
  assert.equal(result.completionOrderManifestEquality, true);
  assert.equal(new Set(Object.values(result.runs).map((run) => run.canonicalPayloadByteHash)).size, 1);
  assert.equal(result.runs.oneWorker.manifestByteHash, result.runs.reversed.manifestByteHash);
  assert.notEqual(result.runs.oneWorker.manifestByteHash, result.runs.simulatedFourWorker.manifestByteHash);
  assert.equal(result.scientificPayloadInspected, false);
  assert.equal(result.fullResultBearingRunPerformed, false);
  assert.equal(result.heavyProbePerformed, false);
});

test("aggregator fails closed on missing, duplicate, corrupt, source-drift, and worker-failure shards", async () => {
  const built = await buildShards();
  const aggregate = (shards, overrides = {}) => aggregateShards({
    ...built,
    shards,
    expectedCaseIds: matrix.caseIds,
    ...overrides,
  }, contract);
  assert.equal(aggregate(built.shards).aggregate.caseCount, 8);
  assert.throws(() => aggregate(built.shards.slice(0, 7)), /SHARD-MISSING/u);
  assert.throws(() => aggregate([...built.shards.slice(0, 7), built.shards[0]]), /SHARD-DUPLICATE/u);

  const corrupt = structuredClone(built.shards);
  corrupt[0].caseIndex = 99;
  assert.throws(() => aggregate(corrupt), /SHARD-CORRUPT/u);

  const failed = structuredClone(built.shards);
  failed[0].state = "FAILED";
  assert.throws(() => aggregate(failed), /SHARD-INCOMPLETE/u);

  const driftHash = canonicalSha256({source: "drifted-source"});
  const drifted = await buildShards({sourceHash: driftHash});
  assert.throws(
    () => aggregate([drifted.shards[0], ...built.shards.slice(1)]),
    /SHARD-SOURCE-DRIFT/u,
  );
});

test("complete synthetic shard is atomically created once with file identity", async () => {
  const {shards} = await buildShards();
  const directory = await mkdtemp(join(tmpdir(), "iypt13-h1-shard-"));
  try {
    const identity = await writeShardAtomic({directory, shard: shards[0], contract});
    assert.match(identity.fileHash, /^[0-9a-f]{64}$/u);
    assert.match(identity.shardHash, /^[0-9a-f]{64}$/u);
    assert.equal(JSON.parse(await readFile(identity.path, "utf8")).caseId, shards[0].caseId);
    await assert.rejects(
      writeShardAtomic({directory, shard: shards[0], contract}),
      (error) => error?.code === "EEXIST",
    );
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test("static inventory is complete, immutable, and rejects mutation providers", async () => {
  const inventory = buildInventory();
  assert.equal(validateInventorySnapshot(inventory, contract), inventory);
  assert.equal(Object.isFrozen(inventory.components.cpu), true);
  assert.throws(() => buildInventorySnapshot({
    observedAt: "2026-09-01T00:00:00Z",
    providers: {...inventoryProviders(), gpu: undefined},
  }, contract));
  assert.throws(() => buildInventorySnapshot({
    observedAt: "2026-09-01T00:00:00Z",
    providers: {...inventoryProviders(), kill() {}},
  }, contract), /mutation provider kill/u);
  const collected = await collectStaticInventory({
    observedAt: "2026-09-01T00:00:00Z",
    providers: Object.fromEntries(
      Object.entries(inventoryProviders()).map(([key, value]) => [key, async () => value]),
    ),
  }, contract);
  assert.equal(collected.inventoryHash, inventory.inventoryHash);
});

test("planner covers every candidate class, reserves memory, and defers occupied GPU", () => {
  const plan = buildResultBlindPlan({
    inventory: buildInventory({foreignGpu: true}),
    backends: allBackendDescriptors(),
    schedulerId: "synthetic-planner",
  }, contract);
  assert.equal(plan.reserveBytes, 8 * GiB);
  assert.deepEqual(plan.candidateClassesCovered, contract.candidateClasses);
  assert.equal(plan.runtimeFallbackForbidden, true);
  assert.equal(plan.fullResultBearingRunForbidden, true);
  for (const candidate of plan.candidates.filter((item) =>
    item.candidateClass === "gpu-compute" || item.candidateClass === "cpu-gpu-hybrid")) {
    assert.equal(candidate.availability, "DEFERRED_UNSAFE_TO_PROBE");
    assert.equal(candidate.staticReason, "GPU_FOREIGN_PROCESS_PRESENT");
  }
});

test("planner fails legacy fallback and closes candidates when memory reserve is exhausted", () => {
  const legacy = allBackendDescriptors();
  legacy[0] = {...legacy[0], backendId: "legacy-serial-reference"};
  assert.throws(() => buildResultBlindPlan({
    inventory: buildInventory(),
    backends: legacy,
    schedulerId: "synthetic-planner",
  }, contract), /legacy serial reference/u);

  const subjectiveNoGo = allBackendDescriptors();
  subjectiveNoGo[0] = {
    ...subjectiveNoGo[0],
    availability: "STATIC_NO_GO",
    staticReason: "IMPLEMENTATION_TOO_COMPLEX",
  };
  assert.throws(() => buildResultBlindPlan({
    inventory: buildInventory(),
    backends: subjectiveNoGo,
    schedulerId: "synthetic-planner",
  }, contract), /machine-auditable/u);

  const lowMemory = buildInventory({memTotalBytes: 16 * GiB, memAvailableBytes: 4 * GiB});
  const plan = buildResultBlindPlan({
    inventory: lowMemory,
    backends: allBackendDescriptors(),
    schedulerId: "synthetic-planner",
  }, contract);
  assert.equal(plan.allocatableBytes, 0);
  assert.equal(plan.candidates.every((candidate) => candidate.availability !== "AVAILABLE"), true);
});

test("synthetic CPU probe evaluator applies repeatability, speed, utilization, and safety gates", () => {
  const passed = evaluateProbeCandidate({
    baseline: baselineProbe(),
    candidate: candidateProbe(),
  }, contract);
  assert.equal(passed.classification, "PROBE_PASS");
  assert.ok(passed.speedup >= 1.5);
  assert.ok(passed.parallelEfficiency >= 0.55);

  const unstable = evaluateProbeCandidate({
    baseline: baselineProbe(),
    candidate: candidateProbe({
      repeats: [probeRepeat(15), probeRepeat(20), probeRepeat(25)],
    }),
  }, contract);
  assert.equal(unstable.classification, "PROBE_NO_GO");
  assert.ok(unstable.reasons.includes("REPEAT_CV_GATE"));

  const unsafe = evaluateProbeCandidate({
    baseline: baselineProbe(),
    candidate: candidateProbe({
      repeats: [
        probeRepeat(20, {memAvailableBytes: 8 * GiB}),
        probeRepeat(20, {memAvailableBytes: 8 * GiB}),
        probeRepeat(20, {memAvailableBytes: 8 * GiB}),
      ],
    }),
  }, contract);
  assert.ok(unsafe.reasons.includes("MEMORY_RESERVE_GATE"));

  const fallback = evaluateProbeCandidate({
    baseline: baselineProbe(),
    candidate: candidateProbe({runtimeFallbackOccurred: true}),
  }, contract);
  assert.ok(fallback.reasons.includes("RUNTIME_FALLBACK_GATE"));
  assert.throws(() => evaluateProbeCandidate({
    baseline: baselineProbe({workUnitsMillion: 1499}),
    candidate: candidateProbe(),
  }, contract), /workloads differ/u);
});

test("synthetic GPU probe applies busy, transfer, and CPU-feed gates", () => {
  const gpuRepeats = [19.9, 20, 20.1].map((time) => probeRepeat(time, {
    cpuUtilizationFraction: 0.5,
    gpuBusyFraction: 0.7,
    transferFraction: 0.2,
  }));
  const passed = evaluateProbeCandidate({
    baseline: baselineProbe(),
    candidate: candidateProbe({
      backendId: "synthetic-gpu",
      candidateClass: "gpu-compute",
      resourceUnits: 1,
      repeats: gpuRepeats,
    }),
  }, contract);
  assert.equal(passed.classification, "PROBE_PASS");

  const blocked = evaluateProbeCandidate({
    baseline: baselineProbe(),
    candidate: candidateProbe({
      backendId: "synthetic-gpu",
      candidateClass: "gpu-compute",
      resourceUnits: 1,
      cpuFeedSingleThreadBottleneck: true,
      repeats: gpuRepeats.map((repeat) => ({...repeat, gpuBusyFraction: 0.5, transferFraction: 0.4})),
    }),
  }, contract);
  assert.ok(blocked.reasons.includes("GPU_BUSY_GATE"));
  assert.ok(blocked.reasons.includes("GPU_TRANSFER_GATE"));
  assert.ok(blocked.reasons.includes("GPU_CPU_FEED_GATE"));
});

test("selection requires complete coverage and chooses a passing near-best candidate", () => {
  const cpu = evaluateProbeCandidate({baseline: baselineProbe(), candidate: candidateProbe()}, contract);
  const native = evaluateProbeCandidate({
    baseline: baselineProbe(),
    candidate: candidateProbe({
      backendId: "synthetic-native",
      candidateClass: "native-or-wasm-simd",
      repeats: [probeRepeat(18), probeRepeat(18.1), probeRepeat(17.9)],
    }),
  }, contract);
  const coverage = contract.candidateClasses.map((candidateClass) => ({
    backendId: candidateClass === "trajectory-process-parallel"
      ? cpu.backendId
      : candidateClass === "native-or-wasm-simd"
        ? native.backendId
        : `static-${candidateClass}`,
    candidateClass,
    status: candidateClass === "trajectory-process-parallel" || candidateClass === "native-or-wasm-simd"
      ? "PROBED"
      : candidateClass === "gpu-compute"
        ? "DEFERRED_UNSAFE_TO_PROBE"
        : "STATIC_NO_GO",
  }));
  const selection = selectQualifiedCandidate({coverage, results: [cpu, native]}, contract);
  assert.equal(selection.backendId, "synthetic-native");
  assert.ok(selection.selectedThroughputFractionOfBest >= 0.95);
  assert.equal(selection.runtimeFallbackForbidden, true);
  assert.equal(validateProbeResult(cpu, contract), cpu);
  assert.throws(
    () => validateProbeResult({...cpu, throughputMlups: cpu.throughputMlups + 1}, contract),
    /result hash mismatch/u,
  );

  assert.throws(
    () => selectQualifiedCandidate({coverage: coverage.slice(1), results: [cpu, native]}, contract),
    /CANDIDATE-COVERAGE/u,
  );
  const cpuNoGo = evaluateProbeCandidate({
    baseline: baselineProbe(),
    candidate: candidateProbe({repeats: [probeRepeat(25), probeRepeat(25.1), probeRepeat(24.9)]}),
  }, contract);
  const nativeNoGo = evaluateProbeCandidate({
    baseline: baselineProbe(),
    candidate: candidateProbe({
      backendId: "synthetic-native",
      candidateClass: "native-or-wasm-simd",
      repeats: [probeRepeat(25), probeRepeat(25.1), probeRepeat(24.9)],
    }),
  }, contract);
  assert.throws(
    () => selectQualifiedCandidate({coverage, results: [cpuNoGo, nativeNoGo]}, contract),
    /NO-GO-A8R-HW1-HARDWARE-QUALIFICATION/u,
  );

  const otherSource = canonicalSha256({source: "other-synthetic-source"});
  const mixed = evaluateProbeCandidate({
    baseline: baselineProbe({sourceHash: otherSource}),
    candidate: candidateProbe({
      backendId: "synthetic-other-source",
      candidateClass: "native-or-wasm-simd",
      sourceHash: otherSource,
    }),
  }, contract);
  const mixedCoverage = coverage.map((entry) =>
    entry.candidateClass === "native-or-wasm-simd"
      ? {...entry, backendId: mixed.backendId}
      : entry,
  );
  assert.throws(
    () => selectQualifiedCandidate({coverage: mixedCoverage, results: [cpu, mixed]}, contract),
    /PROVENANCE-ALIASING/u,
  );
});

test("valid shard remains immutable and detects direct corruption", async () => {
  const {shards} = await buildShards();
  assert.equal(validateShard(shards[0], contract), shards[0]);
  assert.equal(Object.isFrozen(shards[0].provenance), true);
  const corrupt = structuredClone(shards[0]);
  corrupt.provenance.execution.workerCount += 1;
  assert.throws(() => validateShard(corrupt, contract), /SHARD-CORRUPT/u);
});
