import { evaluateHw2rCandidate } from "./hw2r-evaluator.mjs";

const H2X_EXACT_CLASSES = new Set([
  "trajectory-process-parallel",
  "data-layout-shard-aggregation",
]);

export function h2nVariantForCandidate(candidate) {
  if (candidate.classId === "single-trajectory-cpu-domain-or-thread") {
    return "cpu-openmp-strict";
  }
  if (candidate.classId === "native-or-wasm-simd") return "cpu-simd";
  if (candidate.classId === "gpu-compute") return "opencl";
  if (candidate.classId === "cpu-gpu-hybrid") {
    return "hybrid-cpu-simd-opencl";
  }
  return null;
}

function measurementUtilizationPass(measurement) {
  if (measurement.utilization) return measurement.utilization.pass === true;
  return measurement.repeats.every(({ utilizationOrSaturationPass }) =>
    utilizationOrSaturationPass === true);
}

function validMeasuredEnvelope(measurement) {
  return Array.isArray(measurement.repeats)
    && measurement.repeats.length > 0
    && measurement.evaluation.measurementValid === true
    && Number.isFinite(measurement.evaluation.throughput)
    && measurement.evaluation.throughput > 0
    && measurement.repeats.every((repeat) => repeat.correctnessPass === true
      && repeat.safetyPass === true)
    && measurementUtilizationPass(measurement);
}

function activeWorkerCount(measurement) {
  const counts = new Set(measurement.repeats.map((repeat) =>
    repeat.activeWorkers ?? measurement.candidate.resourceCount ?? 1));
  if (counts.size !== 1) {
    throw new Error("INCONCLUSIVE-HW2R-MEASUREMENT-OR-RESOURCE: active workers drift");
  }
  const count = [...counts][0];
  if (!Number.isSafeInteger(count) || count < 1 || count > 8) {
    throw new Error("INCONCLUSIVE-HW2R-MEASUREMENT-OR-RESOURCE: active workers invalid");
  }
  return count;
}

function riskSort(left, right) {
  return (left.candidate.semanticRiskRank ?? 99)
      - (right.candidate.semanticRiskRank ?? 99)
    || (left.candidate.memoryBytes ?? Number.MAX_SAFE_INTEGER)
      - (right.candidate.memoryBytes ?? Number.MAX_SAFE_INTEGER)
    || (left.candidate.governanceComplexityRank ?? 99)
      - (right.candidate.governanceComplexityRank ?? 99)
    || left.candidate.candidateId.localeCompare(right.candidate.candidateId);
}

export function selectH2xPerformanceComparator(
  protocol,
  baselineMeasurement,
  measurements,
) {
  const exact = [baselineMeasurement, ...measurements.filter(({ candidate }) =>
    H2X_EXACT_CLASSES.has(candidate.classId))]
    .filter((measurement) => validMeasuredEnvelope(measurement)
      && measurement.repeats.every(({ numericalIdentityPass }) =>
        numericalIdentityPass === true));
  if (exact.length === 0) {
    return Object.freeze({
      pass: false,
      classification: "INCONCLUSIVE-HW2R-MEASUREMENT-OR-RESOURCE",
      candidateId: null,
      activeWorkerCount: null,
    });
  }
  const bestThroughput = Math.max(...exact.map(({ evaluation }) =>
    evaluation.throughput));
  const threshold = bestThroughput
    * protocol.selection.selectedThroughputFractionOfBestMinimum;
  const nearBest = exact
    .filter(({ evaluation }) => evaluation.throughput >= threshold)
    .sort(riskSort);
  const selected = nearBest[0];
  return Object.freeze({
    pass: true,
    classification: "H2X-REPRESENTATIVE-END-TO-END-COMPARATOR-FROZEN",
    candidateId: selected.candidate.candidateId,
    throughput: selected.evaluation.throughput,
    bestThroughput,
    nearBestCandidateIds: Object.freeze(nearBest.map(({ candidate }) =>
      candidate.candidateId)),
    activeWorkerCount: activeWorkerCount(selected),
  });
}

function numericalVariantPass(numerical, variant) {
  const requiredVariants = variant === "hybrid-cpu-simd-opencl"
    ? ["cpu-simd", "opencl"]
    : [variant];
  const matrix = numerical.matrix.filter((item) =>
    requiredVariants.includes(item.backendVariant));
  return Object.freeze({
    variant,
    matrixCount: matrix.length,
    pass: numerical.safety?.pass === true
      && numerical.matrixComplete === true
      && Number.isSafeInteger(numerical.expectedPerVariant)
      && matrix.length === numerical.expectedPerVariant * requiredVariants.length
      && requiredVariants.every((required) => matrix.filter((item) =>
        item.backendVariant === required).length === numerical.expectedPerVariant)
      && matrix.every((item) => item.pass === true),
  });
}

export function classifyH2nStage0Performance(
  protocol,
  measurements,
  h2xComparator,
  numerical,
) {
  if (h2xComparator.pass !== true
    || !Number.isFinite(h2xComparator.throughput)
    || h2xComparator.throughput <= 0
    || !Array.isArray(numerical.matrix)) {
    return Object.freeze({
      pass: false,
      classification: "INCONCLUSIVE-HW2R-MEASUREMENT-OR-RESOURCE",
      fullQualificationRequired: false,
      selectedCandidateId: null,
    });
  }
  const measured = measurements.filter((measurement) =>
    h2nVariantForCandidate(measurement.candidate) !== null
      && validMeasuredEnvelope(measurement)
      && measurement.repeats.every((repeat) =>
        repeat.phasesSeconds.coldInitialization >= 0
          && repeat.phasesSeconds.steadyStateCompute > 0));
  if (measured.length === 0) {
    return Object.freeze({
      pass: false,
      classification: "DEFERRED-H2N-TOOLCHAIN-OR-RESOURCE",
      fullQualificationRequired: false,
      selectedCandidateId: null,
    });
  }
  const variants = [...new Set(measured.map(({ candidate }) =>
    h2nVariantForCandidate(candidate)))].sort();
  const variantOutcomes = Object.freeze(variants.map((variant) =>
    numericalVariantPass(numerical, variant)));
  const passingVariants = new Set(
    variantOutcomes.filter(({ pass }) => pass).map(({ variant }) => variant),
  );
  const qualified = measured.filter(({ candidate }) =>
    passingVariants.has(h2nVariantForCandidate(candidate)));
  if (qualified.length === 0) {
    return Object.freeze({
      pass: false,
      classification: "NO-GO-H2N-STAGE0-NUMERIC-OR-PERFORMANCE",
      fullQualificationRequired: false,
      selectedCandidateId: null,
      variantOutcomes,
    });
  }
  qualified.sort((left, right) => right.evaluation.throughput
    - left.evaluation.throughput
    || left.candidate.candidateId.localeCompare(right.candidate.candidateId));
  const selected = qualified[0];
  const backendVariant = h2nVariantForCandidate(selected.candidate);
  const speedup = selected.evaluation.throughput / h2xComparator.throughput;
  const material = speedup - 1
    > protocol.selection.unresolvedMaterialGainFractionMaximum;
  return Object.freeze({
    pass: material,
    classification: material
      ? "PASS-H2N-STAGE0-REPRESENTATIVE-FEASIBILITY"
      : "DEFERRED-H2N-NO-MATERIAL-END-TO-END-GAIN",
    fullQualificationRequired: material,
    selectedCandidateId: selected.candidate.candidateId,
    backendVariant,
    speedup,
    netGainFraction: speedup - 1,
    repeatWallTimeSeconds: Object.freeze(selected.repeats.map(({ wallTimeSeconds }) =>
      wallTimeSeconds)),
    referenceCandidateId: h2xComparator.candidateId,
    referenceThroughput: h2xComparator.throughput,
    candidateThroughput: selected.evaluation.throughput,
    coldAndSteadySeparated: selected.repeats.every((repeat) =>
      repeat.phasesSeconds.coldInitialization >= 0
        && repeat.phasesSeconds.steadyStateCompute > 0),
    variantOutcomes,
  });
}

export function summarizeH2nPerformanceCandidates(measurements, h2xComparator) {
  if (h2xComparator.pass !== true
    || !Number.isFinite(h2xComparator.throughput)
    || h2xComparator.throughput <= 0) return Object.freeze([]);
  return Object.freeze(measurements
    .filter((measurement) => h2nVariantForCandidate(measurement.candidate) !== null)
    .map((measurement) => Object.freeze({
      candidateId: measurement.candidate.candidateId,
      backendVariant: h2nVariantForCandidate(measurement.candidate),
      measurementValid: measurement.evaluation.measurementValid === true,
      correctnessPass: measurement.repeats?.every((repeat) =>
        repeat.correctnessPass === true) ?? false,
      safetyPass: measurement.repeats?.every((repeat) =>
        repeat.safetyPass === true) ?? false,
      utilizationPass: measurement.repeats
        ? measurementUtilizationPass(measurement)
        : false,
      throughput: measurement.evaluation.throughput,
      referenceThroughput: h2xComparator.throughput,
      netGainFraction: measurement.evaluation.throughput
        / h2xComparator.throughput - 1,
    }))
    .sort((left, right) => right.throughput - left.throughput
      || left.candidateId.localeCompare(right.candidateId)));
}

export function buildQualificationAwareEvaluations(input) {
  const fullH2nVariants = new Set(input.fullH2nVariants ?? []);
  return Object.freeze(input.measurements.map((measurement) => {
    const variant = h2nVariantForCandidate(measurement.candidate);
    const numericalIdentityPass = H2X_EXACT_CLASSES.has(measurement.candidate.classId)
      ? input.h2xPass === true
      : variant !== null && fullH2nVariants.has(variant);
    if (!measurement.repeats) return measurement.evaluation;
    const repeats = Object.freeze(measurement.repeats.map((repeat) => Object.freeze({
      ...repeat,
      numericalIdentityPass,
      utilizationOrSaturationPass: measurement.utilization?.pass
        ?? repeat.utilizationOrSaturationPass,
    })));
    return evaluateHw2rCandidate(
      input.protocol,
      measurement.candidate,
      repeats,
      input.baseline,
    );
  }));
}
