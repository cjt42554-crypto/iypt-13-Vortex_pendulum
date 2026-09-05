export type ForcedMetric = "meanDrag" | "dragRms" | "liftRms";

export interface ForcedTarget {
  frequencyRatio: 0.8 | 1.1;
  meanDrag: number;
  dragRms: number;
  liftRms: number;
  tolerance: Record<ForcedMetric, number>;
}

export interface ForcedMetrics {
  meanDrag: number;
  dragRms: number;
  liftRms: number;
}

export interface MetricComparison {
  metric: ForcedMetric;
  actual: number;
  target: number;
  tolerance: number;
  absoluteError: number;
  relativeError: number;
  passed: boolean;
}

export const BENCHMARK_ID = "VP-CFD2D-A8-GUILMINEAU-RE185-v1";
export const REYNOLDS = 185;
export const NATURAL_STROUHAL = 0.195;
export const AMPLITUDE_OVER_DIAMETER = 0.2;
export const DOMAIN_LENGTH_DIAMETERS = 23;
export const DOMAIN_WIDTH_DIAMETERS = 10;
export const UPSTREAM_DIAMETERS = 3.5;
export const ETA_HAT = 0.00625;

export const FIXED_TARGET = {
  meanDrag: 1.287,
  liftRms: 0.443,
  strouhal: 0.195,
  tolerance: {
    meanDrag: 0.05,
    liftRms: 0.04,
    strouhal: 0.005,
  },
} as const;

export const FORCED_TARGETS: readonly ForcedTarget[] = [
  {
    frequencyRatio: 0.8,
    meanDrag: 1.195,
    dragRms: 0.036,
    liftRms: 0.080,
    tolerance: { meanDrag: 0.10, dragRms: 0.010, liftRms: 0.020 },
  },
  {
    frequencyRatio: 1.1,
    meanDrag: 1.420,
    dragRms: 0.149,
    liftRms: 0.897,
    tolerance: { meanDrag: 0.05, dragRms: 0.020, liftRms: 0.050 },
  },
] as const;

export function forcedTarget(frequencyRatio: number): ForcedTarget {
  const target = FORCED_TARGETS.find((item) => item.frequencyRatio === frequencyRatio);
  if (target === undefined) throw new RangeError(`no frozen target for fe/f0=${frequencyRatio}`);
  return target;
}

export function prescribedMotion(
  latticeTime: number,
  diameterCells: number,
  latticeVelocity: number,
  frequencyRatio: number,
): { displacementCells: number; velocityLattice: number; phase: number } {
  if (!Number.isFinite(latticeTime) || latticeTime < 0) {
    throw new RangeError("latticeTime must be finite and non-negative");
  }
  if (!Number.isInteger(diameterCells) || diameterCells <= 0) {
    throw new RangeError("diameterCells must be a positive integer");
  }
  if (!(latticeVelocity > 0) || !Number.isFinite(latticeVelocity)) {
    throw new RangeError("latticeVelocity must be finite and positive");
  }
  if (!(frequencyRatio > 0) || !Number.isFinite(frequencyRatio)) {
    throw new RangeError("frequencyRatio must be finite and positive");
  }
  const excitationStrouhal = frequencyRatio * NATURAL_STROUHAL;
  const angularFrequencyLattice = 2 * Math.PI
    * excitationStrouhal
    * latticeVelocity
    / diameterCells;
  const phase = angularFrequencyLattice * latticeTime;
  const amplitudeCells = AMPLITUDE_OVER_DIAMETER * diameterCells;
  return {
    displacementCells: amplitudeCells * Math.sin(phase),
    velocityLattice: amplitudeCells * angularFrequencyLattice * Math.cos(phase),
    phase,
  };
}

export function compareForcedMetrics(
  actual: ForcedMetrics,
  target: ForcedTarget,
): { comparisons: MetricComparison[]; passed: boolean } {
  const comparisons = (Object.keys(target.tolerance) as ForcedMetric[]).map((metric) => {
    const absoluteError = Math.abs(actual[metric] - target[metric]);
    return {
      metric,
      actual: actual[metric],
      target: target[metric],
      tolerance: target.tolerance[metric],
      absoluteError,
      relativeError: absoluteError / Math.max(Math.abs(target[metric]), Number.MIN_VALUE),
      passed: absoluteError <= target.tolerance[metric],
    };
  });
  return { comparisons, passed: comparisons.every((item) => item.passed) };
}
