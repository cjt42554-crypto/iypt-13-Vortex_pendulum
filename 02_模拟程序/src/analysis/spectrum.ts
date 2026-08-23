import { EPSILON, arithmeticMean, assertFiniteSeries } from "./numeric";

export interface SpectrumOptions {
  /** Remove the arithmetic mean before applying the Hann window. Default: true. */
  detrend?: boolean;
  /** Largest allowed |dt-mean(dt)|/mean(dt). Default: 1e-3. */
  relativeTimeTolerance?: number;
  minimumFrequency?: number;
  maximumFrequency?: number;
  /** Refine the largest DFT bin with a three-bin parabolic interpolation. */
  interpolatePeak?: boolean;
}

export interface SpectrumBin {
  frequency: number;
  amplitude: number;
  power: number;
  phase: number;
}

export interface SpectrumResult {
  bins: SpectrumBin[];
  dominantFrequency: number;
  dominantAmplitude: number;
  sampleInterval: number;
  sampleRate: number;
  frequencyResolution: number;
  nyquistFrequency: number;
  mean: number;
  relativeTimeDeviation: number;
  window: "hann";
}

export interface UniformTimeCheck {
  interval: number;
  relativeDeviation: number;
}

export function checkUniformTime(
  times: readonly number[],
  relativeTolerance = 1e-3,
): UniformTimeCheck {
  assertFiniteSeries(times, "times");
  if (times.length < 2) throw new RangeError("at least two time samples are required");
  if (!Number.isFinite(relativeTolerance) || relativeTolerance < 0) {
    throw new RangeError("relativeTimeTolerance must be a finite non-negative number");
  }
  const first = times[0] ?? 0;
  const last = times.at(-1) ?? 0;
  const interval = (last - first) / (times.length - 1);
  if (!(interval > 0)) throw new RangeError("times must be strictly increasing");
  let maximumDeviation = 0;
  for (let index = 1; index < times.length; index += 1) {
    const dt = (times[index] ?? 0) - (times[index - 1] ?? 0);
    if (!(dt > 0)) throw new RangeError("times must be strictly increasing");
    maximumDeviation = Math.max(maximumDeviation, Math.abs(dt - interval) / interval);
  }
  if (maximumDeviation > relativeTolerance) {
    throw new RangeError(
      `non-uniform sampling: relative time-step deviation ${maximumDeviation.toExponential(3)} exceeds tolerance ${relativeTolerance.toExponential(3)}`,
    );
  }
  return { interval, relativeDeviation: maximumDeviation };
}

/**
 * One-sided, amplitude-corrected Hann-window DFT for uniformly sampled data.
 * A sinusoid exactly on a DFT bin is reported with its physical peak amplitude.
 */
export function hannSpectrum(
  times: readonly number[],
  values: readonly number[],
  options: SpectrumOptions = {},
): SpectrumResult {
  if (times.length !== values.length) throw new RangeError("times and values must have equal length");
  if (values.length < 4) throw new RangeError("at least four samples are required for a spectrum");
  assertFiniteSeries(values, "values");
  const uniformity = checkUniformTime(times, options.relativeTimeTolerance ?? 1e-3);
  const count = values.length;
  const mean = arithmeticMean(values);
  const detrend = options.detrend ?? true;
  const window = Array.from({ length: count }, (_, index) =>
    count === 1 ? 1 : 0.5 * (1 - Math.cos(2 * Math.PI * index / (count - 1))),
  );
  const coherentGain = window.reduce((sum, value) => sum + value, 0);
  const maximumBin = Math.floor(count / 2);
  const bins: SpectrumBin[] = [];
  for (let bin = 0; bin <= maximumBin; bin += 1) {
    let real = 0;
    let imaginary = 0;
    for (let index = 0; index < count; index += 1) {
      const angle = -2 * Math.PI * bin * index / count;
      const value = ((values[index] ?? 0) - (detrend ? mean : 0)) * (window[index] ?? 0);
      real += value * Math.cos(angle);
      imaginary += value * Math.sin(angle);
    }
    const isNyquist = count % 2 === 0 && bin === count / 2;
    const oneSidedFactor = bin === 0 || isNyquist ? 1 : 2;
    const amplitude = coherentGain > EPSILON
      ? oneSidedFactor * Math.hypot(real, imaginary) / coherentGain
      : 0;
    bins.push({
      frequency: bin / (count * uniformity.interval),
      amplitude,
      power: bin === 0 || isNyquist ? amplitude ** 2 : 0.5 * amplitude ** 2,
      phase: Math.atan2(imaginary, real),
    });
  }

  const minimumFrequency = options.minimumFrequency ?? 0;
  const maximumFrequency = options.maximumFrequency ?? Number.POSITIVE_INFINITY;
  if (minimumFrequency < 0 || maximumFrequency < minimumFrequency) {
    throw new RangeError("invalid frequency search range");
  }
  let dominantIndex = -1;
  let dominantPower = -1;
  for (let index = 1; index < bins.length; index += 1) {
    const current = bins[index];
    if (!current || current.frequency < minimumFrequency || current.frequency > maximumFrequency) continue;
    if (current.power > dominantPower) {
      dominantPower = current.power;
      dominantIndex = index;
    }
  }

  let dominantFrequency = dominantIndex >= 0 ? (bins[dominantIndex]?.frequency ?? 0) : 0;
  let dominantAmplitude = dominantIndex >= 0 ? (bins[dominantIndex]?.amplitude ?? 0) : 0;
  if (!(dominantPower > EPSILON)) {
    dominantFrequency = 0;
    dominantAmplitude = 0;
  } else if ((options.interpolatePeak ?? true) && dominantIndex > 1 && dominantIndex < bins.length - 1) {
    const left = Math.log(Math.max(bins[dominantIndex - 1]?.power ?? 0, Number.MIN_VALUE));
    const center = Math.log(Math.max(bins[dominantIndex]?.power ?? 0, Number.MIN_VALUE));
    const right = Math.log(Math.max(bins[dominantIndex + 1]?.power ?? 0, Number.MIN_VALUE));
    const denominator = left - 2 * center + right;
    if (Math.abs(denominator) > EPSILON) {
      const offset = Math.max(-0.5, Math.min(0.5, 0.5 * (left - right) / denominator));
      dominantFrequency += offset / (count * uniformity.interval);
    }
  }

  const sampleRate = 1 / uniformity.interval;
  return {
    bins,
    dominantFrequency,
    dominantAmplitude,
    sampleInterval: uniformity.interval,
    sampleRate,
    frequencyResolution: sampleRate / count,
    nyquistFrequency: sampleRate / 2,
    mean,
    relativeTimeDeviation: uniformity.relativeDeviation,
    window: "hann",
  };
}

export function dominantFrequency(
  times: readonly number[],
  values: readonly number[],
  options?: SpectrumOptions,
): number {
  return hannSpectrum(times, values, options).dominantFrequency;
}

