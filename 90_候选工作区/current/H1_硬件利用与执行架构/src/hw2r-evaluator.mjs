import { median } from "./hw2r-calibration.mjs";

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function coefficientOfVariation(values) {
  const average = mean(values);
  const variance = values.reduce(
    (sum, value) => sum + (value - average) ** 2,
    0,
  ) / values.length;
  return Math.sqrt(variance) / average;
}

export function evaluateHw2rCandidate(protocol, candidate, repeats, baseline) {
  if (!Array.isArray(repeats)
    || repeats.length !== protocol.calibration.validFormalRepeats) {
    throw new Error("MEASUREMENT_INVALID-REPEAT-COUNT");
  }
  const wallTimes = repeats.map(({ wallTimeSeconds }) => wallTimeSeconds);
  if (wallTimes.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("MEASUREMENT_INVALID-WALL-TIME");
  }
  const hardMinimum = protocol.calibration.formalHardSecondsMinimum;
  const hardMaximum = protocol.calibration.formalHardSecondsMaximum;
  const measurementValid = wallTimes.every(
    (value) => value >= hardMinimum && value <= hardMaximum,
  ) && repeats.every(({ telemetryValid }) => telemetryValid === true);
  let terminalState = "QUALIFIED";
  let failureCode = null;
  if (!measurementValid) {
    terminalState = "MEASUREMENT_INVALID";
    failureCode = wallTimes.some((value) => value < hardMinimum)
      ? "MEASUREMENT_INVALID-WORKLOAD-TOO-SHORT"
      : wallTimes.some((value) => value > hardMaximum)
        ? "MEASUREMENT_INVALID-WORKLOAD-TOO-LONG"
        : "MEASUREMENT_INVALID-INSUFFICIENT-TELEMETRY";
  } else if (!repeats.every(({ correctnessPass }) => correctnessPass === true)) {
    terminalState = "CORRECTNESS_NO_GO";
    failureCode = "NO-GO-HW2R-CORRECTNESS";
  } else if (!repeats.every(({ safetyPass }) => safetyPass === true)) {
    terminalState = "SAFETY_NO_GO";
    failureCode = "NO-GO-HW2R-RESOURCE-SAFETY";
  } else if (!repeats.every(({ numericalIdentityPass }) =>
    numericalIdentityPass === true)) {
    terminalState = "NUMERICAL_IDENTITY_NO_GO";
    failureCode = "NO-GO-HW2R-NUMERICAL-IDENTITY";
  } else if (!repeats.every(({ utilizationOrSaturationPass }) =>
    utilizationOrSaturationPass === true)) {
    terminalState = "UTILIZATION_NO_GO";
    failureCode = "NO-GO-HW2R-UTILIZATION";
  }
  const workUnits = repeats.map(({ workUnits: value }) => value);
  const throughputs = repeats.map((repeat, index) =>
    workUnits[index] / repeat.wallTimeSeconds);
  const throughputMedian = median(throughputs);
  const speedup = throughputMedian / baseline.throughput;
  if (terminalState === "QUALIFIED"
    && speedup < protocol.selection.representativeSpeedupMinimum) {
    terminalState = "PERFORMANCE_NO_GO";
    failureCode = "NO-GO-HW2R-PERFORMANCE";
  }
  const cv = coefficientOfVariation(wallTimes);
  const slowestFastestRatio = Math.max(...wallTimes) / Math.min(...wallTimes);
  if (terminalState === "QUALIFIED"
    && (cv > protocol.selection.repeatWallTimeCvMaximum
      || slowestFastestRatio
        > protocol.selection.repeatSlowestFastestRatioMaximum)) {
    terminalState = "MEASUREMENT_INVALID";
    failureCode = "MEASUREMENT_INVALID-REPEATABILITY";
  }
  return Object.freeze({
    candidateId: candidate.candidateId,
    classId: candidate.classId,
    terminalState,
    failureCode,
    measurementValid: terminalState !== "MEASUREMENT_INVALID",
    wallTimeMedianSeconds: median(wallTimes),
    wallTimeCv: cv,
    slowestFastestRatio,
    throughput: throughputMedian,
    speedup,
    possibleMaterialGainFraction: candidate.possibleMaterialGainFraction ?? 0,
    semanticRiskRank: candidate.semanticRiskRank ?? 99,
    memoryBytes: candidate.memoryBytes ?? Number.MAX_SAFE_INTEGER,
    governanceComplexityRank: candidate.governanceComplexityRank ?? 99,
  });
}

export function selectFinalHw2rCandidate(protocol, evaluations) {
  const unresolved = evaluations.filter((item) =>
    item.terminalState === "MEASUREMENT_INVALID"
      && item.possibleMaterialGainFraction
        > protocol.selection.unresolvedMaterialGainFractionMaximum);
  if (unresolved.length > 0) {
    return Object.freeze({
      pass: false,
      classification: "INCONCLUSIVE-HW2R-MEASUREMENT-OR-RESOURCE",
      unresolvedCandidateIds: Object.freeze(unresolved.map(({ candidateId }) => candidateId)),
      selectedCandidateId: null,
    });
  }
  const qualified = evaluations.filter(({ terminalState }) => terminalState === "QUALIFIED");
  if (qualified.length === 0) {
    return Object.freeze({
      pass: false,
      classification: "NO-GO-A8R-HW1-HARDWARE-QUALIFICATION",
      unresolvedCandidateIds: Object.freeze([]),
      selectedCandidateId: null,
    });
  }
  const best = Math.max(...qualified.map(({ throughput }) => throughput));
  const threshold = best * protocol.selection.selectedThroughputFractionOfBestMinimum;
  const nearBest = qualified
    .filter(({ throughput }) => throughput >= threshold)
    .sort((left, right) => left.semanticRiskRank - right.semanticRiskRank
      || left.memoryBytes - right.memoryBytes
      || left.governanceComplexityRank - right.governanceComplexityRank
      || left.candidateId.localeCompare(right.candidateId));
  const selected = nearBest[0];
  return Object.freeze({
    pass: true,
    classification: "PASS-HW2-FINAL-HARDWARE-SELECTION-CANDIDATE-ONLY",
    bestThroughput: best,
    nearBestCandidateIds: Object.freeze(nearBest.map(({ candidateId }) => candidateId)),
    selectedCandidateId: selected.candidateId,
  });
}
