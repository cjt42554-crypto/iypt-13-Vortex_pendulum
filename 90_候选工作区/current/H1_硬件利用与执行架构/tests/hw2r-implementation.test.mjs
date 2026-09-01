import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  calibrateCandidate,
  nextCandidateBatchCount,
} from "../src/hw2r-calibration.mjs";
import {
  assertCompleteCandidateClasses,
  buildHw2rCandidateMatrix,
} from "../src/hw2r-candidates.mjs";
import {
  HW2R_PROTOCOL_SHA256,
  loadHw2rProtocol,
} from "../src/hw2r-contract.mjs";
import {
  evaluateHw2rCandidate,
  selectFinalHw2rCandidate,
} from "../src/hw2r-evaluator.mjs";
import {
  classifyH2nStage0Performance,
  selectH2xPerformanceComparator,
} from "../src/hw2r-finalization.mjs";
import {
  HW2R_COST_CASES,
  partitionHybridCostCases,
} from "../src/hw2r-executors.mjs";
import {
  HW2R_REQUIRED_LIFECYCLE_PHASES,
  runHw2rCandidateMeasurement,
} from "../src/hw2r-measurement.mjs";
import { deriveHw2rAffinity } from "../src/hw2r-affinity.mjs";
import {
  HW2R_ASSIGNED_CPU_UTILIZATION_MINIMUM,
  buildAdjacentCpuScaling,
  evaluateCandidateUtilization,
} from "../src/hw2r-utilization.mjs";

const correctnessSha256 = createHash("sha256").update("HW2R-SYNTHETIC").digest("hex");

function envelope(batchCount, wallTimeSeconds) {
  return {
    wallTimeSeconds,
    workUnits: 100 * batchCount,
    correctnessSha256,
    phasesSeconds: Object.fromEntries(
      HW2R_REQUIRED_LIFECYCLE_PHASES.map((phase) => [phase, 0]),
    ),
    safetyPass: true,
    correctnessPass: true,
    numericalIdentityPass: true,
    utilizationOrSaturationPass: true,
  };
}

function telemetryFactory() {
  return {
    async stop() {
      return {
        cpu: {
          baseline: { memTotalBytes: 16 * 1024 ** 3 },
          summary: {
            memoryEventsDelta: { max: 0, oom: 0, oomKill: 0, high: 0 },
            frequencyDropFraction: 0,
            thermalThrottle: false,
            cgroupLogicalCpuUtilization: 1,
            systemCpuUtilizationFraction: 0.5,
            processRssPeakBytes: 1024,
            cpuTemperaturePeakCelsius: 50,
            cgroupMemoryKernelPeakBytes: 2048,
            sampleCount: 3,
            cpuFrequencySampleCount: 3,
            swapGrowthBytes: 0,
            memAvailableBytes: 8 * 1024 ** 3,
          },
        },
        gpu: null,
      };
    },
  };
}

test("HW2R active loader binds only the frozen v2 bytes", async () => {
  const loaded = await loadHw2rProtocol();
  assert.equal(loaded.sha256, HW2R_PROTOCOL_SHA256);
  assert.equal(
    loaded.protocol.protocolId,
    "VP-HW2-REPRESENTATIVE-QUALIFICATION-PROTOCOL-v2",
  );
  assert.equal(loaded.protocol.selection.v1OpenmpW02SelectionForbidden, true);
});

test("HW2R candidate-scaled calibration is deterministic and strictly increasing", async () => {
  assert.equal(nextCandidateBatchCount(1, 2), 10);
  assert.equal(nextCandidateBatchCount(10, 10), 20);
  const loaded = await loadHw2rProtocol();
  const result = await calibrateCandidate({
    protocol: loaded.protocol,
    runCalibration: async (batchCount) => ({
      wallTimeSeconds: 2 * batchCount,
      correctnessSha256,
    }),
  });
  assert.equal(result.batchCount, 10);
  assert.deepEqual(
    result.observations.map(({ batchCount }) => batchCount),
    [1, 10],
  );
  assert.throws(() => nextCandidateBatchCount(0, 2));
  assert.throws(() => nextCandidateBatchCount(1, 0));
});

test("HW2R candidate matrix covers every frozen class and host resource point", async () => {
  const loaded = await loadHw2rProtocol();
  const inventory = {
    components: {
      cpu: { physicalCoreCount: 16, logicalCpuCount: 32 },
    },
  };
  const candidates = buildHw2rCandidateMatrix(loaded.protocol, inventory);
  assert.equal(assertCompleteCandidateClasses(loaded.protocol, candidates), true);
  const nativeCounts = new Set(candidates
    .filter(({ backendId }) => backendId === "native-openmp-float64")
    .map(({ resourceCount }) => resourceCount));
  assert.deepEqual([...nativeCounts].sort((a, b) => a - b),
    [1, 2, 4, 8, 12, 16, 24, 32]);
  assert.equal(candidates.filter(({ classId }) => classId === "cpu-gpu-hybrid").length, 3);
  assert.equal(candidates.filter(({ classId }) => classId === "gpu-compute").length, 1);
  const caseCounts = candidates
    .filter(({ backendId }) => backendId === "fresh-case-process-cost-aware-scheduler")
    .map(({ resourceCount }) => resourceCount)
    .sort((left, right) => left - right);
  assert.deepEqual(caseCounts, [1, 2, 3, 4, 8]);
});

test("HW2R affinity distinguishes one L3 from balanced physical cores", () => {
  const cores = Array.from({ length: 16 }, (_, index) => Object.freeze({
    l3Id: index < 8 ? 0 : 1,
    representativeCpu: index,
    cpus: Object.freeze([index, index + 16]),
  }));
  const topology = Object.freeze({
    physicalCoreCount: 16,
    logicalCpuCount: 32,
    cores: Object.freeze(cores),
    l3Groups: Object.freeze([
      Object.freeze({ l3Id: 0, cores: Object.freeze(cores.slice(0, 8)) }),
      Object.freeze({ l3Id: 1, cores: Object.freeze(cores.slice(8)) }),
    ]),
  });
  assert.equal(deriveHw2rAffinity(topology, 8, "single-ccd-or-l3").feasible, true);
  assert.equal(deriveHw2rAffinity(topology, 12, "single-ccd-or-l3").feasible, false);
  assert.equal(
    deriveHw2rAffinity(topology, 16, "balanced-across-ccd-or-l3").cpuList,
    "0,8,1,9,2,10,3,11,4,12,5,13,6,14,7,15",
  );
});

test("HW2R measurement freezes formal work and retains lifecycle fields", async () => {
  const loaded = await loadHw2rProtocol();
  const candidate = {
    candidateId: "synthetic-cpu-candidate",
    classId: "single-trajectory-cpu-domain-or-thread",
    possibleMaterialGainFraction: 0,
    semanticRiskRank: 1,
    memoryBytes: 1024,
    governanceComplexityRank: 1,
  };
  const result = await runHw2rCandidateMeasurement({
    protocol: loaded.protocol,
    candidate,
    baseline: { throughput: 2 },
    telemetryFactory: async () => telemetryFactory(),
    executor: async ({ batchCount }) => envelope(batchCount, 2 * batchCount),
  });
  assert.equal(result.calibration.batchCount, 10);
  assert.equal(result.repeats.length, 3);
  assert.equal(new Set(result.repeats.map(({ workUnits }) => workUnits)).size, 1);
  assert.equal(result.evaluation.terminalState, "QUALIFIED");
});

test("HW2R evaluator separates measurement invalidity and fails closed selection", async () => {
  const loaded = await loadHw2rProtocol();
  const candidate = {
    candidateId: "too-fast-unclosed",
    classId: "gpu-compute",
    possibleMaterialGainFraction: 2,
  };
  const repeats = Array.from({ length: 3 }, () => ({
    wallTimeSeconds: 1,
    workUnits: 100,
    telemetryValid: false,
    correctnessPass: true,
    safetyPass: true,
    numericalIdentityPass: true,
    utilizationOrSaturationPass: true,
  }));
  const evaluation = evaluateHw2rCandidate(
    loaded.protocol,
    candidate,
    repeats,
    { throughput: 1 },
  );
  assert.equal(evaluation.terminalState, "MEASUREMENT_INVALID");
  assert.equal(evaluation.failureCode, "MEASUREMENT_INVALID-WORKLOAD-TOO-SHORT");
  const selection = selectFinalHw2rCandidate(loaded.protocol, [evaluation]);
  assert.equal(selection.pass, false);
  assert.equal(selection.classification, "INCONCLUSIVE-HW2R-MEASUREMENT-OR-RESOURCE");
});

test("HW2R selector applies the 95 percent set before semantic-risk tie break", async () => {
  const loaded = await loadHw2rProtocol();
  const evaluations = [
    {
      candidateId: "fast-risky",
      terminalState: "QUALIFIED",
      throughput: 100,
      possibleMaterialGainFraction: 0,
      semanticRiskRank: 3,
      memoryBytes: 100,
      governanceComplexityRank: 3,
    },
    {
      candidateId: "slightly-slower-exact",
      terminalState: "QUALIFIED",
      throughput: 96,
      possibleMaterialGainFraction: 0,
      semanticRiskRank: 1,
      memoryBytes: 100,
      governanceComplexityRank: 1,
    },
  ];
  const selection = selectFinalHw2rCandidate(loaded.protocol, evaluations);
  assert.equal(selection.pass, true);
  assert.equal(selection.selectedCandidateId, "slightly-slower-exact");
});

test("HW2R utilization uses measured assigned CPU or frozen adjacent saturation", () => {
  assert.equal(HW2R_ASSIGNED_CPU_UTILIZATION_MINIMUM, 0.8);
  const candidate = {
    candidateId: "cpu-4",
    classId: "single-trajectory-cpu-domain-or-thread",
    backendId: "native",
    pinning: "balanced",
    resourceCount: 4,
  };
  const repeats = Array.from({ length: 3 }, () => ({
    telemetry: {
      assignedCpuUtilizationFraction: 0.85,
      systemCpuUtilizationFraction: 0.5,
      gpuBusyMedianFraction: null,
    },
  }));
  const direct = evaluateCandidateUtilization(candidate, repeats, null);
  assert.equal(direct.pass, true);
  const measurements = [2, 4].map((resourceCount, index) => ({
    candidate: { ...candidate, candidateId: `cpu-${resourceCount}`, resourceCount },
    repeats,
    evaluation: { throughput: index === 0 ? 100 : 104 },
  }));
  const scaling = buildAdjacentCpuScaling(measurements);
  assert.equal(scaling.get("cpu-4").saturationPass, true);
  const saturated = evaluateCandidateUtilization(
    measurements[1].candidate,
    repeats.map((repeat) => ({
      ...repeat,
      telemetry: { ...repeat.telemetry, assignedCpuUtilizationFraction: 0.5 },
    })),
    scaling.get("cpu-4"),
  );
  assert.equal(saturated.directUtilizationPass, false);
  assert.equal(saturated.pass, true);
});

function finalizationMeasurement(input) {
  const candidate = {
    candidateId: input.candidateId,
    classId: input.classId,
    backendId: input.backendId,
    resourceCount: input.resourceCount ?? 1,
    semanticRiskRank: input.semanticRiskRank ?? 1,
    memoryBytes: 1024,
    governanceComplexityRank: input.semanticRiskRank ?? 1,
  };
  const repeats = Array.from({ length: 3 }, () => ({
    wallTimeSeconds: 20,
    workUnits: input.throughput * 20,
    correctnessPass: true,
    safetyPass: true,
    numericalIdentityPass: input.numericalIdentityPass ?? true,
    utilizationOrSaturationPass: true,
    phasesSeconds: { coldInitialization: 1, steadyStateCompute: 18 },
    activeWorkers: input.activeWorkers,
  }));
  return {
    candidate,
    repeats,
    utilization: { pass: true },
    evaluation: {
      candidateId: candidate.candidateId,
      measurementValid: true,
      throughput: input.throughput,
    },
  };
}

test("H2-X comparator is selected before H2-N against the near-best exact path", async () => {
  const { protocol } = await loadHw2rProtocol();
  const baseline = finalizationMeasurement({
    candidateId: "serial",
    classId: "trajectory-process-parallel",
    backendId: "h2x-js-r1-serial-reference",
    throughput: 100,
    semanticRiskRank: 0,
    activeWorkers: 1,
  });
  const exactFast = finalizationMeasurement({
    candidateId: "exact-fast-risky",
    classId: "trajectory-process-parallel",
    backendId: "node-process-worker",
    throughput: 200,
    semanticRiskRank: 2,
    activeWorkers: 4,
  });
  const exactNear = finalizationMeasurement({
    candidateId: "exact-near-low-risk",
    classId: "data-layout-shard-aggregation",
    backendId: "atomic-shard-deterministic-aggregate",
    throughput: 192,
    semanticRiskRank: 1,
    activeWorkers: 3,
  });
  const comparator = selectH2xPerformanceComparator(
    protocol,
    baseline,
    [exactFast, exactNear],
  );
  assert.equal(comparator.pass, true);
  assert.equal(comparator.candidateId, "exact-near-low-risk");
  assert.equal(comparator.activeWorkerCount, 3);
  assert.equal(comparator.bestThroughput, 200);
});

test("H2-N stage-0 requires the exact selected variant numerical matrix", async () => {
  const { protocol } = await loadHw2rProtocol();
  const comparator = {
    pass: true,
    candidateId: "h2x-selected",
    throughput: 100,
  };
  const cpu = finalizationMeasurement({
    candidateId: "native-cpu",
    classId: "native-or-wasm-simd",
    backendId: "native-openmp-avx512-float64",
    throughput: 130,
    numericalIdentityPass: false,
  });
  const noMatrix = classifyH2nStage0Performance(
    protocol,
    [cpu],
    comparator,
    {
      safety: { pass: true },
      matrixComplete: true,
      expectedPerVariant: 1,
      matrix: [],
    },
  );
  assert.equal(noMatrix.classification, "NO-GO-H2N-STAGE0-NUMERIC-OR-PERFORMANCE");
  const qualified = classifyH2nStage0Performance(
    protocol,
    [cpu],
    comparator,
    {
      safety: { pass: true },
      matrixComplete: true,
      expectedPerVariant: 1,
      matrix: [{ backendVariant: "cpu-simd", pass: true }],
    },
  );
  assert.equal(qualified.classification, "PASS-H2N-STAGE0-REPRESENTATIVE-FEASIBILITY");
  assert.equal(qualified.fullQualificationRequired, true);
  assert.equal(qualified.referenceCandidateId, "h2x-selected");
});

test("hybrid split preserves every frozen R2 case and uses only frozen cost", () => {
  for (const fraction of [0.25, 0.5, 0.75]) {
    const first = partitionHybridCostCases(HW2R_COST_CASES, fraction);
    const second = partitionHybridCostCases(HW2R_COST_CASES, fraction);
    assert.deepEqual(first, second);
    const caseIds = [...first.cpuCases, ...first.gpuCases]
      .map(({ caseId }) => caseId);
    assert.equal(caseIds.length, HW2R_COST_CASES.length);
    assert.equal(new Set(caseIds).size, HW2R_COST_CASES.length);
    assert.equal(first.cpuCost + first.gpuCost, first.totalCost);
    assert.ok(first.absoluteFractionError <= 0.1);
  }
});
