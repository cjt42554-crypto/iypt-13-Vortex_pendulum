import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { writeCanonicalGzipWithSidecarExclusive } from "../../_shared/src/atomic.mjs";
import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { buildH2nStage0Native } from "../../H2_代表性执行与数值资格/scripts/build-h2n-stage0.mjs";
import {
  assertCleanMainParityAndIdentity,
  assertFiniteMemorySafety,
  captureQualificationCommand,
  compareResourceSnapshots,
  HW2R_IMPLEMENTATION_PATHS,
  readQualificationResourceSnapshot,
} from "../../H2_代表性执行与数值资格/src/repository-preflight.mjs";
import { collectHw2rCpuTopology, deriveHw2rAffinity } from "../src/hw2r-affinity.mjs";
import {
  assertCompleteCandidateClasses,
  buildHw2rCandidateMatrix,
} from "../src/hw2r-candidates.mjs";
import { loadHw2rProtocol } from "../src/hw2r-contract.mjs";
import { createHw2rExecutor } from "../src/hw2r-executors.mjs";
import {
  selectH2xPerformanceComparator,
  summarizeH2nPerformanceCandidates,
} from "../src/hw2r-finalization.mjs";
import {
  evaluateHw2rCandidate,
  selectFinalHw2rCandidate,
} from "../src/hw2r-evaluator.mjs";
import { runHw2rCandidateMeasurement } from "../src/hw2r-measurement.mjs";
import {
  buildAdjacentCpuScaling,
  evaluateCandidateUtilization,
} from "../src/hw2r-utilization.mjs";
import { createLinuxInventoryProviders } from "../src/linux-host.mjs";

const AUTHORIZATION = "BATCH-PR2-HW2R-H2X-H2N-AND-H3-READINESS";

function parseArguments(argv) {
  const value = (name) => {
    const index = argv.indexOf(name);
    return index < 0 ? null : argv[index + 1];
  };
  const outputPath = value("--output");
  const authorization = value("--authorization");
  if (!outputPath || authorization !== AUTHORIZATION) {
    throw new Error(
      "usage: run-hw2r-qualification-v2.mjs --authorization "
        + `${AUTHORIZATION} --output NEW.json.gz`,
    );
  }
  return Object.freeze({
    outputPath: resolve(outputPath),
  });
}

async function assertGpuSafe() {
  const processes = await captureQualificationCommand("nvidia-smi", [
    "--query-compute-apps=pid,process_name,used_gpu_memory",
    "--format=csv,noheader,nounits",
  ]);
  if (processes.trim() !== "") {
    throw new Error("DEFERRED-UNSAFE-TO-PROBE: foreign GPU process");
  }
  return captureQualificationCommand("nvidia-smi", [
    "--query-gpu=name,uuid,driver_version",
    "--format=csv,noheader",
  ]);
}

async function timedNativeBuild(outputPath, options) {
  const started = process.hrtime.bigint();
  const build = await buildH2nStage0Native(outputPath, options);
  return Object.freeze({
    ...build,
    buildOrProvisionSeconds: Number(process.hrtime.bigint() - started) / 1e9,
  });
}

function candidateMetadata(candidate) {
  const activeResources = Math.min(candidate.resourceCount, 8);
  const perWorkerBytes = 512 * 1024 ** 2;
  const risk = {
    "trajectory-process-parallel": 1,
    "data-layout-shard-aggregation": 2,
    "single-trajectory-cpu-domain-or-thread": 4,
    "native-or-wasm-simd": 5,
    "gpu-compute": 6,
    "cpu-gpu-hybrid": 8,
  }[candidate.classId];
  const memoryBytes = candidate.classId === "gpu-compute"
    ? 768 * 1024 ** 2
    : candidate.classId === "cpu-gpu-hybrid"
      ? 1536 * 1024 ** 2
      : candidate.classId === "trajectory-process-parallel"
          || candidate.classId === "data-layout-shard-aggregation"
        ? activeResources * perWorkerBytes
        : 512 * 1024 ** 2;
  return Object.freeze({
    ...candidate,
    possibleMaterialGainFraction: candidate.resourceCount === 1
      && candidate.backendId === "fresh-case-process-cost-aware-scheduler"
      ? 0
      : 1,
    semanticRiskRank: risk,
    memoryBytes,
    governanceComplexityRank: risk,
  });
}

function deferredMeasurement(candidate, failureCode) {
  const terminalState = failureCode.startsWith("MEASUREMENT_INVALID")
    ? "MEASUREMENT_INVALID"
    : failureCode.startsWith("NO-GO-HW2R-CORRECTNESS")
      ? "CORRECTNESS_NO_GO"
      : failureCode.startsWith("NO-GO-HW2R-RESOURCE-SAFETY")
        ? "SAFETY_NO_GO"
        : failureCode.startsWith("NO-GO-HW2R-NUMERICAL-IDENTITY")
          ? "NUMERICAL_IDENTITY_NO_GO"
          : failureCode === "DEFERRED-UNSAFE-TO-PROBE"
            ? "DEFERRED-UNSAFE-TO-PROBE"
            : "DEFERRED-UNAVAILABLE";
  return Object.freeze({
    candidate,
    calibration: null,
    repeats: null,
    utilization: null,
    evaluation: Object.freeze({
      candidateId: candidate.candidateId,
      classId: candidate.classId,
      terminalState,
      failureCode,
      measurementValid: terminalState !== "MEASUREMENT_INVALID"
        && !terminalState.startsWith("DEFERRED"),
      throughput: 0,
      speedup: 0,
      possibleMaterialGainFraction: candidate.possibleMaterialGainFraction,
      semanticRiskRank: candidate.semanticRiskRank,
      memoryBytes: candidate.memoryBytes,
      governanceComplexityRank: candidate.governanceComplexityRank,
    }),
  });
}

function reEvaluateWithUtilization(protocol, measurement, baseline, adjacent) {
  if (!measurement.repeats) return measurement;
  const utilization = evaluateCandidateUtilization(
    measurement.candidate,
    measurement.repeats,
    adjacent,
  );
  const repeats = Object.freeze(measurement.repeats.map((repeat) => Object.freeze({
    ...repeat,
    utilizationOrSaturationPass:
      repeat.utilizationOrSaturationPass === true && utilization.pass,
  })));
  return Object.freeze({
    ...measurement,
    repeats,
    utilization,
    evaluation: evaluateHw2rCandidate(
      protocol,
      measurement.candidate,
      repeats,
      baseline,
    ),
  });
}

const options = parseArguments(process.argv.slice(2));
const { protocol, sha256: protocolSha256 } = await loadHw2rProtocol();
const preflight = await assertCleanMainParityAndIdentity(
  HW2R_IMPLEMENTATION_PATHS,
);
const before = await readQualificationResourceSnapshot();
const entrySafety = assertFiniteMemorySafety(protocol, before);
const gpuIdentity = await assertGpuSafe();
const [providers, topology] = await Promise.all([
  createLinuxInventoryProviders(),
  collectHw2rCpuTopology(),
]);
const inventory = Object.freeze({ components: Object.freeze(providers) });
const candidates = buildHw2rCandidateMatrix(protocol, inventory)
  .map(candidateMetadata)
  .sort((left, right) => left.candidateId.localeCompare(right.candidateId));
assertCompleteCandidateClasses(protocol, candidates);
const buildRoot = await mkdtemp(join(tmpdir(), "iypt13-hw2r-v2-build-"));
try {
  const openmpBinary = await timedNativeBuild(join(buildRoot, "h2n-openmp"), {
      additionalFlags: ["-fno-tree-vectorize", "-fno-tree-slp-vectorize"],
    });
  const simdBinary = await timedNativeBuild(join(buildRoot, "h2n-simd"));
  const affinityById = new Map();
  for (const candidate of candidates) {
    if (candidate.classId === "gpu-compute") continue;
    const layout = candidate.pinning === "gpu-device-0"
      ? "unpinned"
      : candidate.pinning;
    const affinity = deriveHw2rAffinity(topology, candidate.resourceCount, layout);
    affinityById.set(candidate.candidateId, affinity);
  }
  const executor = createHw2rExecutor({
    h2xPass: true,
    h2nPass: false,
    openmpBinaryPath: openmpBinary.outputPath,
    simdBinaryPath: simdBinary.outputPath,
    gpuBinaryPath: simdBinary.outputPath,
    buildOrProvisionSecondsForCandidate(candidate) {
      return candidate.classId === "single-trajectory-cpu-domain-or-thread"
        ? openmpBinary.buildOrProvisionSeconds
        : new Set(["native-or-wasm-simd", "gpu-compute", "cpu-gpu-hybrid"])
            .has(candidate.classId)
          ? simdBinary.buildOrProvisionSeconds
          : 0;
    },
    affinityForCandidate(candidate) {
      const affinity = affinityById.get(candidate.candidateId);
      if (!affinity?.feasible) return null;
      return {
        cpuList: affinity.cpuList,
        ompProcBind: candidate.pinning === "unpinned" ? "false"
          : candidate.pinning === "single-ccd-or-l3" ? "close" : "spread",
        ompPlaces: "cores",
      };
    },
    cpuListsForCandidate(candidate) {
      return affinityById.get(candidate.candidateId)?.workerCpuLists ?? null;
    },
  });
  const baselineCandidate = Object.freeze({
    candidateId: "hw2r-h2x-r1-serial-reference",
    classId: "trajectory-process-parallel",
    backendId: "h2x-js-r1-serial-reference",
    resourceCount: 1,
    workloadIds: ["HW2R-R1-D54-A8R-OPERATION-GRAPH-SURROGATE-v1"],
    pinning: "unpinned",
    possibleMaterialGainFraction: 0,
    semanticRiskRank: 0,
    memoryBytes: 512 * 1024 ** 2,
    governanceComplexityRank: 0,
  });
  if (baselineCandidate.memoryBytes
      * (1 + protocol.safety.candidateHeadroomFraction)
    > before.memoryMax - before.memoryCurrent) {
    throw new Error("INCONCLUSIVE-HW2R-MEASUREMENT-OR-RESOURCE: baseline memory");
  }
  const baselineRaw = await runHw2rCandidateMeasurement({
    protocol,
    candidate: baselineCandidate,
    initialBatchCount: 1,
    executor,
    baseline: { throughput: 1 },
  });
  const baseline = Object.freeze({
    candidateId: baselineCandidate.candidateId,
    throughput: baselineRaw.evaluation.throughput,
  });
  const measurements = [];
  let resourceStopAfterCandidateId = null;
  for (const candidate of candidates) {
    if (resourceStopAfterCandidateId !== null) {
      measurements.push(deferredMeasurement(
        candidate,
        "NO-GO-HW2R-RESOURCE-SAFETY",
      ));
      continue;
    }
    const affinity = affinityById.get(candidate.candidateId);
    const memorySafe = candidate.memoryBytes * (1 + protocol.safety.candidateHeadroomFraction)
      <= before.memoryMax - before.memoryCurrent;
    if ((affinity && !affinity.feasible) || !memorySafe) {
      measurements.push(deferredMeasurement(
        candidate,
        "DEFERRED-HW2R-CANDIDATE-UNAVAILABLE",
      ));
      continue;
    }
    try {
      measurements.push(await runHw2rCandidateMeasurement({
        protocol,
        candidate,
        initialBatchCount: 1,
        executor,
        baseline,
      }));
    } catch (error) {
      const message = String(error?.message ?? error);
      measurements.push(deferredMeasurement(
        candidate,
        message.startsWith("DEFERRED-UNSAFE-TO-PROBE")
          ? "DEFERRED-UNSAFE-TO-PROBE"
          : message.split(":", 1)[0],
      ));
    }
    const currentSafety = compareResourceSnapshots(
      protocol,
      before,
      await readQualificationResourceSnapshot(),
    );
    if (!currentSafety.pass) {
      resourceStopAfterCandidateId = candidate.candidateId;
    }
  }
  const scaling = buildAdjacentCpuScaling(measurements);
  const evaluated = measurements.map((measurement) =>
    reEvaluateWithUtilization(
      protocol,
      measurement,
      baseline,
      scaling.get(measurement.candidate.candidateId),
    ));
  const h2xComparator = selectH2xPerformanceComparator(
    protocol,
    baselineRaw,
    evaluated,
  );
  const h2nPerformanceCandidates = summarizeH2nPerformanceCandidates(
    evaluated,
    h2xComparator,
  );
  const provisionalExactSelection = selectFinalHw2rCandidate(
    protocol,
    evaluated.map(({ evaluation }) => evaluation),
  );
  const materialUnresolved = evaluated.filter(({ evaluation }) =>
    new Set([
      "MEASUREMENT_INVALID",
      "DEFERRED-UNSAFE-TO-PROBE",
    ]).has(evaluation.terminalState)
      && evaluation.possibleMaterialGainFraction
        > protocol.selection.unresolvedMaterialGainFractionMaximum);
  const after = await readQualificationResourceSnapshot();
  const safety = compareResourceSnapshots(protocol, before, after);
  const measurementPass = h2xComparator.pass
    && materialUnresolved.length === 0
    && safety.pass;
  const summary = {
    format: "VP-HW2R-REPRESENTATIVE-QUALIFICATION-EVIDENCE-v2",
    authorization: AUTHORIZATION,
    protocolSha256,
    implementationCommit: preflight.implementationCommit,
    executionCommit: preflight.executionCommit,
    implementationTreeSha256: preflight.implementationTreeSha256,
    gpuIdentity,
    topologySha256: canonicalSha256(topology),
    inventorySha256: canonicalSha256(inventory),
    binaryIdentities: {
      openmp: {
        ...openmpBinary.identity,
        buildOrProvisionSeconds: openmpBinary.buildOrProvisionSeconds,
      },
      simdAndGpuHost: {
        ...simdBinary.identity,
        buildOrProvisionSeconds: simdBinary.buildOrProvisionSeconds,
      },
    },
    baseline,
    baselineMeasurement: baselineRaw,
    candidates: evaluated,
    adjacentScaling: Object.freeze([...scaling.values()]),
    h2xComparator,
    h2nPerformanceCandidates,
    provisionalExactSelection,
    materialUnresolvedCandidateIds: materialUnresolved.map(({ candidate }) =>
      candidate.candidateId),
    resourceStopAfterCandidateId,
    entrySafety,
    safety,
    pass: measurementPass,
    classification: measurementPass
      ? protocol.passCode
      : "INCONCLUSIVE-HW2R-MEASUREMENT-OR-RESOURCE",
    nextRequiredStage: "H2X-THREE-ENVIRONMENT-FULL-SCHEDULER-MATRIX",
    protocolStopState: protocol.stopState,
    performanceObservationMade: true,
    h2xQualificationPerformed: false,
    h2nStage0NumericalQualificationPerformed: false,
    finalHardwareSelectionMade: false,
    fullResultBearingRunPerformed: false,
    scientificValuesPersisted: false,
    scientificValuesHumanRead: false,
    canonicalA8rArtifactWritten: false,
    h3RunPerformed: false,
    scientificConclusion: "NONE",
  };
  const written = await writeCanonicalGzipWithSidecarExclusive(
    options.outputPath,
    summary,
  );
  process.stdout.write(`${JSON.stringify({
    pass: measurementPass,
    classification: summary.classification,
    h2xComparatorCandidateId: h2xComparator.candidateId,
    h2xComparatorActiveWorkerCount: h2xComparator.activeWorkerCount,
    summaryStoredSha256: written.artifact.storedSha256,
    summaryCanonicalSha256: written.artifact.canonicalSha256,
    sidecarSha256: written.sidecar.sha256,
    scientificValuesPersisted: false,
  })}\n`);
  if (!measurementPass) process.exitCode = 1;
} finally {
  await rm(buildRoot, { recursive: true, force: true });
}
