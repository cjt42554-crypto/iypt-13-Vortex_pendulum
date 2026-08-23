import { deriveParameters } from "../core/config";
import type {
  DerivedParameters,
  RunMetrics,
  SimulationConfig,
  SimulationSample,
} from "../core/types";
import {
  EPSILON,
  assertFiniteSeries,
  centeredRootMeanSquare,
  clamp,
  rootMeanSquare,
  trapezoidalMean,
} from "./numeric";
import { hannSpectrum } from "./spectrum";

export interface EnergyClosureResult {
  rms: number;
  relativeRms: number;
  residuals: number[];
  intervalTimes: number[];
}

export function halfPeakToPeak(values: readonly number[]): number {
  assertFiniteSeries(values, "values");
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return 0.5 * (maximum - minimum);
}

export function oscillationRms(values: readonly number[]): number {
  assertFiniteSeries(values, "values");
  return centeredRootMeanSquare(values);
}

/** Interval audit of dE/dt=P_fluid-P_damping using output samples only. */
export function energyClosure(
  times: readonly number[],
  mechanicalEnergy: readonly number[],
  fluidPower: readonly number[],
  dampingPower: readonly number[],
): EnergyClosureResult {
  const count = times.length;
  if (count !== mechanicalEnergy.length || count !== fluidPower.length || count !== dampingPower.length) {
    throw new RangeError("energy-closure series must have equal length");
  }
  if (count < 2) throw new RangeError("at least two samples are required for energy closure");
  assertFiniteSeries(times, "times");
  assertFiniteSeries(mechanicalEnergy, "mechanicalEnergy");
  assertFiniteSeries(fluidPower, "fluidPower");
  assertFiniteSeries(dampingPower, "dampingPower");
  const residuals: number[] = [];
  const intervalTimes: number[] = [];
  const scales: number[] = [];
  for (let index = 1; index < count; index += 1) {
    const previousTime = times[index - 1] ?? 0;
    const currentTime = times[index] ?? 0;
    const dt = currentTime - previousTime;
    if (!(dt > 0)) throw new RangeError("times must be strictly increasing");
    const energyRate = ((mechanicalEnergy[index] ?? 0) - (mechanicalEnergy[index - 1] ?? 0)) / dt;
    const netPower = 0.5 * (
      (fluidPower[index] ?? 0) + (fluidPower[index - 1] ?? 0)
      - (dampingPower[index] ?? 0) - (dampingPower[index - 1] ?? 0)
    );
    residuals.push(energyRate - netPower);
    scales.push(Math.max(Math.abs(energyRate), Math.abs(netPower)));
    intervalTimes.push(0.5 * (previousTime + currentTime));
  }
  const rms = rootMeanSquare(residuals);
  const scale = rootMeanSquare(scales);
  return {
    rms,
    relativeRms: scale > EPSILON ? rms / scale : rms <= EPSILON ? 0 : Number.POSITIVE_INFINITY,
    residuals,
    intervalTimes,
  };
}

export function steadySamples(
  samples: readonly SimulationSample[],
  transientFraction: number,
): SimulationSample[] {
  if (samples.length === 0) return [];
  const fraction = clamp(transientFraction, 0, 0.999999);
  const firstTime = samples[0]?.time ?? 0;
  const lastTime = samples.at(-1)?.time ?? firstTime;
  const start = firstTime + fraction * (lastTime - firstTime);
  return samples.filter((sample) => sample.time >= start);
}

function uniformlyResampledDisplacement(
  samples: readonly SimulationSample[],
  requestedInterval: number,
  maximumCount = 4096,
): { times: number[]; values: number[] } {
  if (samples.length < 2 || !(requestedInterval > 0)) return { times: [], values: [] };
  const first = samples[0]?.time ?? 0;
  const last = samples.at(-1)?.time ?? first;
  const rawCount = Math.floor((last - first) / requestedInterval) + 1;
  const stride = Math.max(1, Math.ceil(rawCount / maximumCount));
  const interval = requestedInterval * stride;
  const count = Math.floor((last - first) / interval) + 1;
  const times: number[] = [];
  const values: number[] = [];
  let rightIndex = 1;
  for (let index = 0; index < count; index += 1) {
    const time = first + index * interval;
    while (rightIndex < samples.length && (samples[rightIndex]?.time ?? Number.POSITIVE_INFINITY) < time) {
      rightIndex += 1;
    }
    const right = samples[rightIndex];
    const left = samples[rightIndex - 1];
    if (left === undefined || right === undefined || right.time < time || right.time <= left.time) continue;
    const fraction = (time - left.time) / (right.time - left.time);
    times.push(time);
    values.push(left.displacement + fraction * (right.displacement - left.displacement));
  }
  return { times, values };
}

/**
 * Phase-2 summaries only.  Lock-in, branch, bifurcation, and regime labels are
 * intentionally absent; those belong to the separately delivered phase 4.
 */
export function computeRunMetrics(
  samples: readonly SimulationSample[],
  config: SimulationConfig,
  derived: DerivedParameters = deriveParameters(config),
): RunMetrics {
  if (samples.length === 0) throw new RangeError("at least one sample is required");
  const selected = steadySamples(samples, config.solver.transientFraction);
  const window = selected.length > 0 ? selected : [...samples];
  const times = window.map((sample) => sample.time);
  const displacement = window.map((sample) => sample.displacement);
  const amplitude = halfPeakToPeak(displacement);
  // Terminal roots and future backends may produce irregular endpoints.  The
  // spectral diagnostic therefore has its own explicit uniform resampling
  // map; energy and extrema continue to use the untouched solver samples.
  const spectralWindow = uniformlyResampledDisplacement(window, config.solver.outputInterval);
  const dominantFrequency = spectralWindow.times.length >= 4
    ? hannSpectrum(spectralWindow.times, spectralWindow.values).dominantFrequency
    : 0;
  const closure = window.length >= 2
    ? energyClosure(
        times,
        window.map((sample) => sample.mechanicalEnergy),
        window.map((sample) => sample.fluidPower + sample.controlPower),
        window.map((sample) => sample.dampingPower),
      ).relativeRms
    : 0;
  const firstExchange = window[0]?.interfaceExchange;
  const lastExchange = window.at(-1)?.interfaceExchange;
  const windowDuration = (times.at(-1) ?? 0) - (times[0] ?? 0);
  const hasAppliedLedger = config.backend === "highFidelity"
    && config.cfd2d.couplingMode === "weak-fsi"
    && firstExchange !== null && firstExchange !== undefined
    && lastExchange !== null && lastExchange !== undefined
    && windowDuration > 0;
  const appliedRawWork = hasAppliedLedger
    ? lastExchange.cumulative.cumulativeAppliedRawWork
      - firstExchange.cumulative.cumulativeAppliedRawWork
    : null;
  const appliedRawLineWork = firstExchange !== null && firstExchange !== undefined
    && lastExchange !== null && lastExchange !== undefined && windowDuration > 0
    ? lastExchange.cumulative.cumulativeAppliedRawLineWork
      - firstExchange.cumulative.cumulativeAppliedRawLineWork
    : null;
  const dampingWork = times.length >= 2
    ? trapezoidalMean(times, window.map((sample) => sample.dampingPower)) * windowDuration
    : 0;
  const mechanicalEnergyChange = (window.at(-1)?.mechanicalEnergy ?? 0)
    - (window[0]?.mechanicalEnergy ?? 0);
  const appliedMechanicalEnergyLedgerResidual = appliedRawWork === null
    ? null
    : mechanicalEnergyChange - (appliedRawWork - dampingWork);
  const appliedLedgerScale = appliedRawWork === null
    ? 0
    : Math.abs(appliedRawWork) + Math.abs(dampingWork) + Math.abs(mechanicalEnergyChange);
  return {
    windowStartTime: times[0] ?? 0,
    peakAmplitude: amplitude,
    dimensionlessAmplitude: derived.cylinderDiameter > 0
      ? amplitude / derived.cylinderDiameter
      : Number.NaN,
    rmsDisplacement: oscillationRms(displacement),
    dominantFrequency,
    meanFluidPower: times.length >= 2
      ? trapezoidalMean(times, window.map((sample) => sample.fluidPower))
      : window[0]?.fluidPower ?? 0,
    meanAppliedRawMechanicalPower: appliedRawWork === null
      ? null
      : appliedRawWork / windowDuration,
    meanAppliedRawLinePower: appliedRawLineWork === null
      ? null
      : appliedRawLineWork / windowDuration,
    meanDampingPower: times.length >= 2
      ? trapezoidalMean(times, window.map((sample) => sample.dampingPower))
      : window[0]?.dampingPower ?? 0,
    energyClosureRelativeRms: closure,
    appliedMechanicalEnergyLedgerResidual,
    appliedMechanicalEnergyLedgerRelativeResidual: appliedMechanicalEnergyLedgerResidual === null
      ? null
      : Math.abs(appliedMechanicalEnergyLedgerResidual) / Math.max(appliedLedgerScale, EPSILON),
  };
}
