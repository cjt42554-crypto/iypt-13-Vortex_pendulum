import { median } from "./hw2r-calibration.mjs";

export const HW2R_ASSIGNED_CPU_UTILIZATION_MINIMUM = 0.8;
export const HW2R_GPU_BUSY_MEDIAN_MINIMUM = 0.8;
export const HW2R_HYBRID_CPU_UTILIZATION_MINIMUM = 0.5;

function candidateFamily(candidate) {
  if (candidate.classId === "single-trajectory-cpu-domain-or-thread") {
    return `${candidate.backendId}:${candidate.pinning}`;
  }
  if (candidate.classId === "trajectory-process-parallel"
    || candidate.classId === "data-layout-shard-aggregation") {
    return `${candidate.backendId}:${candidate.pinning}`;
  }
  return null;
}

export function buildAdjacentCpuScaling(measurements) {
  const groups = new Map();
  for (const measurement of measurements) {
    const family = candidateFamily(measurement.candidate);
    if (!family || !measurement.repeats) continue;
    if (!groups.has(family)) groups.set(family, []);
    groups.get(family).push(measurement);
  }
  const output = new Map();
  for (const [family, values] of groups) {
    values.sort((left, right) => left.candidate.resourceCount
      - right.candidate.resourceCount
      || left.candidate.candidateId.localeCompare(right.candidate.candidateId));
    let previous = null;
    for (const value of values) {
      const throughput = value.evaluation.throughput;
      const adjacentGainFraction = previous === null
        ? null
        : throughput / previous.evaluation.throughput - 1;
      output.set(value.candidate.candidateId, Object.freeze({
        family,
        previousCandidateId: previous?.candidate.candidateId ?? null,
        adjacentGainFraction,
        saturationPass: adjacentGainFraction !== null
          && adjacentGainFraction <= 0.05,
      }));
      previous = value;
    }
  }
  return output;
}

function repeatUtilization(repeat) {
  return Object.freeze({
    assignedCpuUtilizationFraction:
      repeat.telemetry.assignedCpuUtilizationFraction,
    systemCpuUtilizationFraction:
      repeat.telemetry.systemCpuUtilizationFraction,
    gpuBusyMedianFraction: repeat.telemetry.gpuBusyMedianFraction,
  });
}

export function evaluateCandidateUtilization(candidate, repeats, adjacent) {
  const observations = repeats.map(repeatUtilization);
  const assignedCpuUtilizationMedian = median(
    observations.map(({ assignedCpuUtilizationFraction }) =>
      assignedCpuUtilizationFraction),
  );
  const gpuValues = observations
    .map(({ gpuBusyMedianFraction }) => gpuBusyMedianFraction)
    .filter(Number.isFinite);
  const gpuBusyMedianFraction = gpuValues.length > 0 ? median(gpuValues) : null;
  let directUtilizationPass;
  if (candidate.classId === "gpu-compute") {
    directUtilizationPass = gpuBusyMedianFraction
      >= HW2R_GPU_BUSY_MEDIAN_MINIMUM;
  } else if (candidate.classId === "cpu-gpu-hybrid") {
    directUtilizationPass = gpuBusyMedianFraction
        >= HW2R_GPU_BUSY_MEDIAN_MINIMUM
      && assignedCpuUtilizationMedian
        >= HW2R_HYBRID_CPU_UTILIZATION_MINIMUM;
  } else {
    directUtilizationPass = assignedCpuUtilizationMedian
      >= HW2R_ASSIGNED_CPU_UTILIZATION_MINIMUM;
  }
  const saturationPass = adjacent?.saturationPass === true;
  return Object.freeze({
    directUtilizationPass,
    saturationPass,
    pass: directUtilizationPass || saturationPass,
    assignedCpuUtilizationMedian,
    gpuBusyMedianFraction,
    adjacentScaling: adjacent ?? null,
    thresholds: Object.freeze({
      assignedCpuUtilizationMinimum:
        HW2R_ASSIGNED_CPU_UTILIZATION_MINIMUM,
      gpuBusyMedianMinimum: HW2R_GPU_BUSY_MEDIAN_MINIMUM,
      hybridCpuUtilizationMinimum:
        HW2R_HYBRID_CPU_UTILIZATION_MINIMUM,
      adjacentCpuGainAtSaturationMaximum: 0.05,
    }),
  });
}
