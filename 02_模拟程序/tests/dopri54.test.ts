import { describe, expect, it } from "vitest";
import {
  dormandPrince54Step,
  nextStepFactor,
  scaledErrorNorm,
} from "../src/solvers/forward/dopri54";

function integrateExponential(step: number): number {
  let time = 0;
  let state = [1];
  const count = Math.round(1 / step);
  for (let index = 0; index < count; index += 1) {
    state = dormandPrince54Step((_time, value) => [value[0] ?? 0], time, state, step).fifthOrder;
    time += step;
  }
  return state[0] ?? Number.NaN;
}

describe("Dormand-Prince 5(4) kernel", () => {
  it("shows fifth-order global convergence on y'=y", () => {
    const coarse = Math.abs(integrateExponential(0.2) - Math.E);
    const fine = Math.abs(integrateExponential(0.1) - Math.E);
    expect(coarse / fine).toBeGreaterThan(20);
    expect(fine).toBeLessThan(1e-7);
  });

  it("uses a component-scaled RMS error norm", () => {
    const norm = scaledErrorNorm([1, 0], [1, 0], [2e-6, 3e-9], [1e-6, 1e-9], 1e-6);
    expect(norm).toBeCloseTo(Math.sqrt((1 + 9) / 2), 12);
  });

  it("bounds accepted and rejected controller factors", () => {
    expect(nextStepFactor(0, true)).toBe(5);
    expect(nextStepFactor(Number.POSITIVE_INFINITY, false)).toBe(0.2);
    expect(nextStepFactor(100, false)).toBeGreaterThanOrEqual(0.2);
    expect(nextStepFactor(100, false)).toBeLessThanOrEqual(1);
  });
});
