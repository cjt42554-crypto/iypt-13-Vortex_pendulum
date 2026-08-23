/**
 * Phase-4 harmonic-response utilities.
 *
 * These routines do not alter either numerical backend.  They provide an
 * explicitly weighted observation operator for cross-layer virtual
 * experiments, including windows that do not contain an integer number of
 * prescribed periods.
 */

export interface HarmonicFit {
  /** Model frequency [Hz]. */
  frequency: number;
  /** Number of retained samples. */
  sampleCount: number;
  /** Inclusive time window [s]. */
  timeWindow: [number, number];
  /** q(t) = offset + cosineCoefficient cos(wt) + sineCoefficient sin(wt). */
  offset: number;
  cosineCoefficient: number;
  sineCoefficient: number;
  amplitude: number;
  /**
   * Phase in q(t) = offset + amplitude cos(wt + phaseRadians).
   * Positive phase therefore denotes a lead relative to cos(wt).
   */
  phaseRadians: number;
  rmsAboutMean: number;
  rmsResidual: number;
  /** rmsResidual/rmsAboutMean; null when the signal has zero AC content. */
  residualFraction: number | null;
  coefficientOfDetermination: number | null;
}

function finiteSeries(values: readonly number[], name: string): void {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new RangeError(`${name} must contain only finite values`);
  }
}

/** Map a phase to (-pi, pi]. */
export function wrapPhase(phase: number): number {
  if (!Number.isFinite(phase)) throw new RangeError("phase must be finite");
  let wrapped = phase % (2 * Math.PI);
  if (wrapped <= -Math.PI) wrapped += 2 * Math.PI;
  if (wrapped > Math.PI) wrapped -= 2 * Math.PI;
  return wrapped;
}

/** Trapezoidal/Voronoi weights for a strictly increasing observation grid. */
function observationWeights(times: readonly number[]): number[] {
  if (times.length < 2) throw new RangeError("at least two times are required");
  for (let index = 1; index < times.length; index += 1) {
    if (!((times[index] ?? 0) > (times[index - 1] ?? 0))) {
      throw new RangeError("times must be strictly increasing");
    }
  }
  return times.map((time, index) => {
    if (index === 0) return 0.5 * ((times[1] ?? time) - time);
    if (index === times.length - 1) return 0.5 * (time - (times[index - 1] ?? time));
    return 0.5 * ((times[index + 1] ?? time) - (times[index - 1] ?? time));
  });
}

function solveThreeByThree(matrix: number[][], rightHandSide: number[]): number[] {
  const augmented = matrix.map((row, index) => [...row, rightHandSide[index] ?? 0]);
  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row]?.[column] ?? 0)
        > Math.abs(augmented[pivot]?.[column] ?? 0)) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot] ?? [], augmented[column] ?? []];
    const diagonal = augmented[column]?.[column] ?? 0;
    if (Math.abs(diagonal) < 1e-18) {
      throw new RangeError("harmonic normal matrix is singular; enlarge or move the observation window");
    }
    for (let entry = column; entry < 4; entry += 1) {
      if (augmented[column] !== undefined) {
        augmented[column]![entry] = (augmented[column]?.[entry] ?? 0) / diagonal;
      }
    }
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = augmented[row]?.[column] ?? 0;
      for (let entry = column; entry < 4; entry += 1) {
        if (augmented[row] !== undefined) {
          augmented[row]![entry] = (augmented[row]?.[entry] ?? 0)
            - factor * (augmented[column]?.[entry] ?? 0);
        }
      }
    }
  }
  return augmented.map((row) => row[3] ?? 0);
}

/**
 * Weighted least-squares fit of one declared harmonic plus an offset.
 *
 * The quadrature weights make the result stable to the short final interval
 * produced by an exact terminal sample.  The residual is deliberately kept:
 * in a prescribed-cylinder run it contains self-shedding, harmonics, drift,
 * and numerical error and must not be silently interpreted as measurement
 * noise.
 */
export function fitHarmonic(
  times: readonly number[],
  values: readonly number[],
  frequency: number,
): HarmonicFit {
  if (times.length !== values.length || times.length < 4) {
    throw new RangeError("harmonic fit requires at least four paired samples");
  }
  if (!(frequency > 0) || !Number.isFinite(frequency)) {
    throw new RangeError("frequency must be finite and positive");
  }
  finiteSeries(times, "times");
  finiteSeries(values, "values");
  const weights = observationWeights(times);
  const angularFrequency = 2 * Math.PI * frequency;
  const normal = Array.from({ length: 3 }, () => Array(3).fill(0) as number[]);
  const right = [0, 0, 0];
  for (let index = 0; index < times.length; index += 1) {
    const basis = [
      1,
      Math.cos(angularFrequency * (times[index] ?? 0)),
      Math.sin(angularFrequency * (times[index] ?? 0)),
    ];
    const weight = weights[index] ?? 0;
    for (let row = 0; row < 3; row += 1) {
      right[row] = (right[row] ?? 0) + weight * (basis[row] ?? 0) * (values[index] ?? 0);
      for (let column = 0; column < 3; column += 1) {
        if (normal[row] !== undefined) {
          normal[row]![column] = (normal[row]?.[column] ?? 0)
            + weight * (basis[row] ?? 0) * (basis[column] ?? 0);
        }
      }
    }
  }
  const [offset = 0, cosineCoefficient = 0, sineCoefficient = 0]
    = solveThreeByThree(normal, right);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let residualSquare = 0;
  let acSquare = 0;
  for (let index = 0; index < times.length; index += 1) {
    const time = times[index] ?? 0;
    const value = values[index] ?? 0;
    const fitted = offset
      + cosineCoefficient * Math.cos(angularFrequency * time)
      + sineCoefficient * Math.sin(angularFrequency * time);
    residualSquare += (weights[index] ?? 0) * (value - fitted) ** 2;
    acSquare += (weights[index] ?? 0) * (value - offset) ** 2;
  }
  const rmsResidual = Math.sqrt(residualSquare / totalWeight);
  const rmsAboutMean = Math.sqrt(acSquare / totalWeight);
  const amplitude = Math.hypot(cosineCoefficient, sineCoefficient);
  const residualFraction = rmsAboutMean > 0 ? rmsResidual / rmsAboutMean : null;
  return {
    frequency,
    sampleCount: times.length,
    timeWindow: [times[0] ?? 0, times.at(-1) ?? 0],
    offset,
    cosineCoefficient,
    sineCoefficient,
    amplitude,
    phaseRadians: wrapPhase(Math.atan2(-sineCoefficient, cosineCoefficient)),
    rmsAboutMean,
    rmsResidual,
    residualFraction,
    coefficientOfDetermination: acSquare > 0 ? 1 - residualSquare / acSquare : null,
  };
}

/** Time-weighted mean on a strictly increasing grid. */
export function trapezoidalTimeMean(
  times: readonly number[],
  values: readonly number[],
): number {
  if (times.length !== values.length || times.length < 2) {
    throw new RangeError("time mean requires at least two paired samples");
  }
  finiteSeries(times, "times");
  finiteSeries(values, "values");
  const weights = observationWeights(times);
  const duration = (times.at(-1) ?? 0) - (times[0] ?? 0);
  if (!(duration > 0)) throw new RangeError("time window must have positive duration");
  return values.reduce(
    (sum, value, index) => sum + value * (weights[index] ?? 0),
    0,
  ) / duration;
}

