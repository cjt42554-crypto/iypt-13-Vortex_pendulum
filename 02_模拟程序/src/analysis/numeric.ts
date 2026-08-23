export const EPSILON = 1e-12;

export function assertFiniteSeries(values: readonly number[], name: string): void {
  if (values.length === 0) throw new RangeError(`${name} must not be empty`);
  for (let index = 0; index < values.length; index += 1) {
    if (!Number.isFinite(values[index])) {
      throw new RangeError(`${name}[${index}] must be finite`);
    }
  }
}

export function arithmeticMean(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

export function rootMeanSquare(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  let sumSquares = 0;
  for (const value of values) sumSquares += value * value;
  return Math.sqrt(sumSquares / values.length);
}

export function centeredRootMeanSquare(values: readonly number[]): number {
  const center = arithmeticMean(values);
  if (!Number.isFinite(center)) return Number.NaN;
  let sumSquares = 0;
  for (const value of values) sumSquares += (value - center) ** 2;
  return Math.sqrt(sumSquares / values.length);
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function trapezoidalMean(times: readonly number[], values: readonly number[]): number {
  if (times.length !== values.length || times.length === 0) return Number.NaN;
  if (times.length === 1) return values[0] ?? Number.NaN;
  const duration = (times.at(-1) ?? 0) - (times[0] ?? 0);
  if (!(duration > 0)) return arithmeticMean(values);
  let integral = 0;
  for (let index = 1; index < times.length; index += 1) {
    const dt = (times[index] ?? 0) - (times[index - 1] ?? 0);
    integral += 0.5 * dt * ((values[index] ?? 0) + (values[index - 1] ?? 0));
  }
  return integral / duration;
}

export function pearsonCorrelation(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length < 2) return 0;
  const meanLeft = arithmeticMean(left);
  const meanRight = arithmeticMean(right);
  let covariance = 0;
  let varianceLeft = 0;
  let varianceRight = 0;
  for (let index = 0; index < left.length; index += 1) {
    const x = (left[index] ?? 0) - meanLeft;
    const y = (right[index] ?? 0) - meanRight;
    covariance += x * y;
    varianceLeft += x * x;
    varianceRight += y * y;
  }
  const denominator = Math.sqrt(varianceLeft * varianceRight);
  return denominator > EPSILON ? covariance / denominator : 0;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[midpoint] ?? Number.NaN;
  return 0.5 * ((sorted[midpoint - 1] ?? 0) + (sorted[midpoint] ?? 0));
}

