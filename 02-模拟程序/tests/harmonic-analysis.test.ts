import { describe, expect, it } from "vitest";
import {
  fitHarmonic,
  trapezoidalTimeMean,
  wrapPhase,
} from "../src/analysis/harmonic";

describe("phase-4 harmonic observation operator", () => {
  it("recovers amplitude, phase and offset on a non-integer irregular window", () => {
    const frequency = 0.73;
    const times = Array.from({ length: 700 }, (_, index) => {
      const base = 0.013 * index;
      return base + (index === 0 ? 0 : 0.0015 * Math.sin(index * 0.37));
    });
    const phase = 0.63;
    const values = times.map((time) => 1.7 + 2.4 * Math.cos(2 * Math.PI * frequency * time + phase));
    const fit = fitHarmonic(times, values, frequency);
    expect(fit.offset).toBeCloseTo(1.7, 11);
    expect(fit.amplitude).toBeCloseTo(2.4, 11);
    expect(fit.phaseRadians).toBeCloseTo(phase, 11);
    expect(fit.residualFraction).toBeLessThan(1e-11);
  });

  it("retains out-of-band content in the reported residual", () => {
    const times = Array.from({ length: 1001 }, (_, index) => index * 0.01);
    const values = times.map((time) => Math.cos(2 * Math.PI * 0.5 * time)
      + 0.5 * Math.sin(2 * Math.PI * 0.8 * time));
    const fit = fitHarmonic(times, values, 0.5);
    expect(fit.amplitude).toBeCloseTo(1, 2);
    expect(fit.residualFraction).toBeGreaterThan(0.4);
  });

  it("uses the declared cosine-plus-phase convention", () => {
    expect(wrapPhase(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapPhase(-3 * Math.PI)).toBeCloseTo(Math.PI);
    const times = Array.from({ length: 401 }, (_, index) => index * 0.01);
    const values = times.map((time) => Math.sin(2 * Math.PI * time));
    expect(fitHarmonic(times, values, 1).phaseRadians).toBeCloseTo(-Math.PI / 2, 11);
  });

  it("computes a trapezoidal time mean on an irregular linear signal", () => {
    const times = [0, 0.1, 0.4, 1];
    const values = times.map((time) => 2 + 3 * time);
    expect(trapezoidalTimeMean(times, values)).toBeCloseTo(3.5, 14);
  });
});
