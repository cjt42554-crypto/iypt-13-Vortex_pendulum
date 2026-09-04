import type { Dopri54Step } from "./dopri54";

function polynomial(coefficients: readonly number[], x: number): number {
  let value = 0;
  for (let i = coefficients.length - 1; i >= 0; i -= 1) value = value * x + (coefficients[i] ?? 0);
  return value;
}

/** All real roots of a degree <= 4 polynomial on [0,1], to roundoff accuracy.
 * Derivative roots partition monotone intervals; stationary zeros are retained.
 * This applies to the numerical interpolant, not to the unknown exact orbit.
 */
export function polynomialRootsInUnitInterval(input: readonly number[]): number[] {
  const coefficients = [...input];
  if (!coefficients.every(Number.isFinite) || coefficients.length > 5) throw new RangeError("invalid event polynomial");
  while (coefficients.length && coefficients.at(-1) === 0) coefficients.pop();
  if (coefficients.length < 2) return [];
  const scale = Math.max(...coefficients.map(Math.abs));
  for (let i = 0; i < coefficients.length; i += 1) coefficients[i] = (coefficients[i] ?? 0) / scale;
  const critical = polynomialRootsInUnitInterval(coefficients.slice(1).map((c, i) => (i + 1) * c));
  const points = [0, ...critical.filter((x) => x > 0 && x < 1), 1];
  const roots: number[] = [];
  const tolerance = 128 * Number.EPSILON * coefficients.reduce((sum, c) => sum + Math.abs(c), 0);
  for (const point of points) if (Math.abs(polynomial(coefficients, point)) <= tolerance) roots.push(point);
  for (let i = 1; i < points.length; i += 1) {
    let low = points[i - 1] ?? 0, high = points[i] ?? 1;
    let lowValue = polynomial(coefficients, low);
    const highValue = polynomial(coefficients, high);
    if (!(lowValue * highValue < 0)) continue;
    for (let iteration = 0; iteration < 60; iteration += 1) {
      const middle = .5 * (low + high);
      if (middle === low || middle === high) break;
      const value = polynomial(coefficients, middle);
      if (value === 0) { low = middle; high = middle; break; }
      if (lowValue * value <= 0) high = middle;
      else { low = middle; lowValue = value; }
    }
    roots.push(.5 * (low + high));
  }
  return [...new Set(roots)].sort((a, b) => a - b);
}

/** Interior checks plus theta/omega extrema and specified geometric angles.
 * Finite checkpoints do not certify arbitrary oscillatory/nonlinear guards.
 */
export function eventInspectionFractions(step: Dopri54Step, criticalAngles: readonly number[] = []): number[] {
  const fractions = Array.from({ length: 9 }, (_, index) => index / 8);
  for (const coefficients of step.denseCoefficients.slice(0, 2)) {
    fractions.push(...polynomialRootsInUnitInterval(coefficients.slice(1).map((c, i) => (i + 1) * c)));
  }
  const theta = step.denseCoefficients[0];
  if (theta) for (const angle of criticalAngles) {
    fractions.push(...polynomialRootsInUnitInterval([(theta[0] ?? 0) - angle, ...theta.slice(1)]));
  }
  return [...new Set(fractions)].sort((a, b) => a - b);
}
