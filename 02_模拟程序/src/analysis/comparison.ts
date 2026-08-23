import type {
  ComparisonMetrics,
  ExperimentalDataset,
  ExperimentalPoint,
  SimulationSample,
} from "../core/types";
import { EPSILON, arithmeticMean, median, pearsonCorrelation, rootMeanSquare } from "./numeric";
import { hannSpectrum } from "./spectrum";

export type Observable = "theta" | "displacement";

export interface ComparisonOptions {
  observable?: Observable;
  /** Compare a single experimental replicate. By default all run IDs are pooled. */
  runId?: string;
}

export interface InterpolatedComparison {
  metrics: ComparisonMetrics;
  observable: Observable;
  points: Array<{
    runId: string;
    time: number;
    observed: number;
    predicted: number;
    residual: number;
    sigma?: number;
  }>;
  warnings: string[];
}

export function linearInterpolate(
  times: readonly number[],
  values: readonly number[],
  time: number,
): number | undefined {
  if (times.length !== values.length || times.length === 0 || !Number.isFinite(time)) return undefined;
  const firstTime = times[0];
  const lastTime = times.at(-1);
  if (firstTime === undefined || lastTime === undefined || time < firstTime || time > lastTime) return undefined;
  if (time === firstTime) return values[0];
  if (time === lastTime) return values.at(-1);
  let low = 0;
  let high = times.length - 1;
  while (high - low > 1) {
    const midpoint = Math.floor((low + high) / 2);
    if ((times[midpoint] ?? Number.POSITIVE_INFINITY) <= time) low = midpoint;
    else high = midpoint;
  }
  const leftTime = times[low];
  const rightTime = times[high];
  const leftValue = values[low];
  const rightValue = values[high];
  if (
    leftTime === undefined || rightTime === undefined
    || leftValue === undefined || rightValue === undefined
    || !(rightTime > leftTime)
  ) return undefined;
  const fraction = (time - leftTime) / (rightTime - leftTime);
  return leftValue + fraction * (rightValue - leftValue);
}

function collapseDuplicateTimes(
  times: readonly number[],
  values: readonly number[],
): { times: number[]; values: number[] } {
  const pairs = times.map((time, index) => ({ time, value: values[index] ?? 0 }))
    .sort((left, right) => left.time - right.time);
  const uniqueTimes: number[] = [];
  const uniqueValues: number[] = [];
  let index = 0;
  while (index < pairs.length) {
    const time = pairs[index]?.time ?? 0;
    let sum = 0;
    let count = 0;
    while (index < pairs.length && pairs[index]?.time === time) {
      sum += pairs[index]?.value ?? 0;
      count += 1;
      index += 1;
    }
    uniqueTimes.push(time);
    uniqueValues.push(sum / count);
  }
  return { times: uniqueTimes, values: uniqueValues };
}

/** Resample irregular observations before using the uniform-time DFT. */
export function estimateExperimentalFrequency(
  times: readonly number[],
  values: readonly number[],
): number {
  if (times.length !== values.length || times.length < 8) return 0;
  const unique = collapseDuplicateTimes(times, values);
  if (unique.times.length < 8) return 0;
  const steps = unique.times.slice(1).map((time, index) => time - (unique.times[index] ?? time));
  const positiveSteps = steps.filter((step) => step > 0 && Number.isFinite(step));
  const interval = median(positiveSteps);
  const first = unique.times[0] ?? 0;
  const last = unique.times.at(-1) ?? first;
  if (!(interval > 0) || !(last > first)) return 0;
  const count = Math.min(8192, Math.max(8, Math.floor((last - first) / interval) + 1));
  const uniformInterval = (last - first) / (count - 1);
  const uniformTimes: number[] = [];
  const uniformValues: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const time = first + index * uniformInterval;
    const value = linearInterpolate(unique.times, unique.values, time);
    if (value === undefined) return 0;
    uniformTimes.push(time);
    uniformValues.push(value);
  }
  return hannSpectrum(uniformTimes, uniformValues).dominantFrequency;
}

function observedValue(point: ExperimentalPoint, observable: Observable): number | undefined {
  return observable === "theta" ? point.theta : point.displacement;
}

function inferObservable(points: readonly ExperimentalPoint[]): Observable {
  const displacementCount = points.filter((point) => Number.isFinite(point.displacement)).length;
  const thetaCount = points.filter((point) => Number.isFinite(point.theta)).length;
  if (displacementCount === 0 && thetaCount === 0) {
    throw new RangeError("experimental dataset has no theta or displacement observations");
  }
  return displacementCount >= thetaCount ? "displacement" : "theta";
}

export function compareExperimentToSimulation(
  dataset: ExperimentalDataset,
  samples: readonly SimulationSample[],
  options: ComparisonOptions = {},
): InterpolatedComparison {
  if (samples.length < 2) throw new RangeError("at least two simulation samples are required");
  const simulation = [...samples].sort((left, right) => left.time - right.time);
  for (let index = 1; index < simulation.length; index += 1) {
    if (!((simulation[index]?.time ?? 0) > (simulation[index - 1]?.time ?? 0))) {
      throw new RangeError("simulation sample times must be finite and strictly increasing");
    }
  }
  const filtered = options.runId === undefined
    ? dataset.points
    : dataset.points.filter((point) => point.runId === options.runId);
  if (filtered.length === 0) throw new RangeError("no experimental points match the comparison selection");
  const observable = options.observable ?? inferObservable(filtered);
  const simulationTimes = simulation.map((sample) => sample.time);
  const simulationValues = simulation.map((sample) => sample[observable]);
  const points: InterpolatedComparison["points"] = [];
  let missingObservable = 0;
  let outsideRange = 0;
  for (const point of filtered) {
    const observed = observedValue(point, observable);
    if (!Number.isFinite(observed)) {
      missingObservable += 1;
      continue;
    }
    const predicted = linearInterpolate(simulationTimes, simulationValues, point.time);
    if (predicted === undefined) {
      outsideRange += 1;
      continue;
    }
    const base = {
      runId: point.runId,
      time: point.time,
      observed: observed as number,
      predicted,
      residual: predicted - (observed as number),
    };
    points.push(point.sigma === undefined ? base : { ...base, sigma: point.sigma });
  }
  if (points.length === 0) throw new RangeError("no comparable experimental points overlap the simulation");
  const observed = points.map((point) => point.observed);
  const predicted = points.map((point) => point.predicted);
  const residuals = points.map((point) => point.residual);
  const absoluteResiduals = residuals.map(Math.abs);
  const rmse = rootMeanSquare(residuals);
  const minimumObserved = Math.min(...observed);
  const maximumObserved = Math.max(...observed);
  const observedRange = maximumObserved - minimumObserved;
  const fallbackScale = Math.max(Math.abs(arithmeticMean(observed)), rootMeanSquare(observed), 1);

  const frequencies = new Map<string, { times: number[]; observed: number[]; predicted: number[] }>();
  for (const point of points) {
    const group = frequencies.get(point.runId) ?? { times: [], observed: [], predicted: [] };
    group.times.push(point.time);
    group.observed.push(point.observed);
    group.predicted.push(point.predicted);
    frequencies.set(point.runId, group);
  }
  const weightedFrequencies = [...frequencies.values()].map((group) => ({
    count: group.times.length,
    observed: estimateExperimentalFrequency(group.times, group.observed),
    predicted: estimateExperimentalFrequency(group.times, group.predicted),
  })).filter((item) => item.observed > 0 || item.predicted > 0);
  const frequencyWeight = weightedFrequencies.reduce((sum, item) => sum + item.count, 0);
  const observedFrequency = frequencyWeight > 0
    ? weightedFrequencies.reduce((sum, item) => sum + item.count * item.observed, 0) / frequencyWeight
    : 0;
  const predictedFrequency = frequencyWeight > 0
    ? weightedFrequencies.reduce((sum, item) => sum + item.count * item.predicted, 0) / frequencyWeight
    : 0;

  const warnings: string[] = [];
  if (missingObservable > 0) warnings.push(`${missingObservable} points omitted because ${observable} is missing`);
  if (outsideRange > 0) warnings.push(`${outsideRange} points omitted because they are outside the simulation time range`);
  if (observedRange <= EPSILON) warnings.push("observed range is zero; NRMSE uses an RMS/mean fallback scale");
  return {
    metrics: {
      observable,
      count: points.length,
      rmse,
      nrmse: rmse / (observedRange > EPSILON ? observedRange : fallbackScale),
      mae: arithmeticMean(absoluteResiduals),
      bias: arithmeticMean(residuals),
      correlation: pearsonCorrelation(observed, predicted),
      observedFrequency,
      predictedFrequency,
    },
    observable,
    points,
    warnings,
  };
}
