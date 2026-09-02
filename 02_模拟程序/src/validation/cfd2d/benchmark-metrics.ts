export interface CoefficientSummary {
  samples: number;
  meanDrag: number;
  meanLift: number;
  dragRms: number;
  liftRms: number;
  dragFluctuationRms: number;
  liftFluctuationRms: number;
}

export interface CoefficientSample {
  drag: number;
  lift: number;
}

function requireSamples(samples: readonly CoefficientSample[]): void {
  if (samples.length < 4) throw new RangeError("at least four coefficient samples are required");
  for (const sample of samples) {
    if (!Number.isFinite(sample.drag) || !Number.isFinite(sample.lift)) {
      throw new RangeError("coefficient samples must be finite");
    }
  }
}

export function summarizeCoefficients(
  samples: readonly CoefficientSample[],
): CoefficientSummary {
  requireSamples(samples);
  const count = samples.length;
  const meanDrag = samples.reduce((sum, item) => sum + item.drag, 0) / count;
  const meanLift = samples.reduce((sum, item) => sum + item.lift, 0) / count;
  let dragSquare = 0;
  let liftSquare = 0;
  let dragFluctuationSquare = 0;
  let liftFluctuationSquare = 0;
  for (const sample of samples) {
    dragSquare += sample.drag ** 2;
    liftSquare += sample.lift ** 2;
    dragFluctuationSquare += (sample.drag - meanDrag) ** 2;
    liftFluctuationSquare += (sample.lift - meanLift) ** 2;
  }
  return {
    samples: count,
    meanDrag,
    meanLift,
    dragRms: Math.sqrt(dragSquare / count),
    liftRms: Math.sqrt(liftSquare / count),
    dragFluctuationRms: Math.sqrt(dragFluctuationSquare / count),
    liftFluctuationRms: Math.sqrt(liftFluctuationSquare / count),
  };
}

export function dominantStrouhal(
  lift: readonly number[],
  convectiveTimeStep: number,
  minimum = 0.15,
  maximum = 0.24,
  increment = 0.00025,
): { strouhal: number; normalizedAmplitude: number } {
  if (lift.length < 32) throw new RangeError("at least 32 lift samples are required");
  if (!(convectiveTimeStep > 0) || !Number.isFinite(convectiveTimeStep)) {
    throw new RangeError("convectiveTimeStep must be finite and positive");
  }
  if (!(minimum > 0) || !(maximum > minimum) || !(increment > 0)) {
    throw new RangeError("invalid Strouhal search interval");
  }
  const mean = lift.reduce((sum, value) => sum + value, 0) / lift.length;
  let bestStrouhal = Number.NaN;
  let bestAmplitude = -1;
  for (let strouhal = minimum; strouhal <= maximum + 0.5 * increment; strouhal += increment) {
    let cosine = 0;
    let minusSine = 0;
    for (let index = 0; index < lift.length; index += 1) {
      const phase = 2 * Math.PI * strouhal * convectiveTimeStep * index;
      const centered = (lift[index] ?? 0) - mean;
      cosine += centered * Math.cos(phase);
      minusSine -= centered * Math.sin(phase);
    }
    const amplitude = 2 * Math.hypot(cosine, minusSine) / lift.length;
    if (amplitude > bestAmplitude) {
      bestAmplitude = amplitude;
      bestStrouhal = strouhal;
    }
  }
  return { strouhal: bestStrouhal, normalizedAmplitude: bestAmplitude };
}

export function relativeDifference(first: number, second: number, floor = 1e-12): number {
  return Math.abs(first - second) / Math.max(Math.abs(first), Math.abs(second), floor);
}
