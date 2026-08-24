import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../../../02_模拟程序/src/core/config";
import {
  evaluateForwardGuardsP0,
  evaluateForwardP0,
} from "../src/forward/model";
import {
  normalizedWettingActivation,
  wettingStateFromProjectedArea,
} from "../src/wetting";

describe("wetting activation and dry-state contract", () => {
  it("accepts only a fractional activation scale", () => {
    for (const accepted of [1e-12, 0.05, 0.5, 1]) {
      const value = normalizedWettingActivation(0.5, accepted);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    for (const rejected of [
      0,
      -1,
      1 + Number.EPSILON,
      1e200,
      Number.POSITIVE_INFINITY,
      Number.NaN,
    ]) {
      expect(() => normalizedWettingActivation(0.5, rejected)).toThrow();
    }
  });

  it("preserves exact endpoints and monotonicity", () => {
    expect(normalizedWettingActivation(0, 0.05)).toBe(0);
    expect(normalizedWettingActivation(1, 0.05)).toBe(1);
    const fractions = [0, 1e-12, 1e-9, 1e-6, 1e-3, 0.1, 0.5, 1];
    const values = fractions.map((x) => normalizedWettingActivation(x, 0.05));
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).toBeGreaterThanOrEqual(values[index - 1] ?? 0);
    }
  });

  it("remains finite across extreme accepted activation scales", () => {
    const scales = [Number.MIN_VALUE, 1e-300, 1e-200, 1e-100, 1e-12, 0.05, 1];
    const fractions = [Number.MIN_VALUE, 1e-300, 1e-200, 1e-100, 1e-12, 0.5, 1];
    for (const scale of scales) {
      const values = fractions.map((fraction) =>
        normalizedWettingActivation(fraction, scale));
      expect(values.every(Number.isFinite)).toBe(true);
      expect(values.every((value) => value >= 0 && value <= 1)).toBe(true);
      for (let index = 1; index < values.length; index += 1) {
        expect(values[index]).toBeGreaterThanOrEqual(values[index - 1] ?? 0);
      }
    }
  });

  it("distinguishes exact dry from near dry", () => {
    const exact = wettingStateFromProjectedArea(0, 1, {
      activationFraction: 0.05,
      dryToleranceFraction: 1e-6,
    });
    const near = wettingStateFromProjectedArea(1e-9, 1, {
      activationFraction: 0.05,
      dryToleranceFraction: 1e-6,
    });
    expect(exact.isDry).toBe(true);
    expect(exact.isNearDry).toBe(true);
    expect(near.isDry).toBe(false);
    expect(near.isNearDry).toBe(true);
  });

  it("does not bypass coefficient applicability for tiny positive wetness", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.geometry.pivotHeight = config.geometry.bottomDistance;
    config.fluid.flowRampTime = 0;
    config.rom.calibrationMinReynolds = 200;
    const state = {
      theta: 1e-9,
      omega: 0,
      wakeReal: 0.02,
      wakeImaginary: -0.01,
    };
    const evaluated = evaluateForwardP0(config, 1, state);
    expect(evaluated.wetting.wetFraction).toBeGreaterThan(0);
    expect(evaluated.wetting.isDry).toBe(false);
    const guard = evaluateForwardGuardsP0(config, 1, state, evaluated)
      .find((item) => item.code === "COEFFICIENT-OOD");
    expect(guard?.margin).toBeLessThan(0);
  });

  it("keeps the exact dry wake branch and hydrodynamic torques zero", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.geometry.pivotHeight = config.geometry.bottomDistance;
    config.fluid.flowRampTime = 0;
    const state = {
      theta: 0,
      omega: 0,
      wakeReal: 0.02,
      wakeImaginary: -0.01,
    };
    const evaluated = evaluateForwardP0(config, 1, state);
    expect(evaluated.wetting.isDry).toBe(true);
    expect(evaluated.wetting.activation).toBe(0);
    expect(evaluated.liftTorque).toBe(0);
    expect(evaluated.dragTorque).toBe(0);
    expect(evaluated.derivative.wakeReal)
      .toBeCloseTo(-state.wakeReal / config.rom.zeroFlowWakeDecayTime, 14);
    expect(evaluated.derivative.wakeImaginary)
      .toBeCloseTo(-state.wakeImaginary / config.rom.zeroFlowWakeDecayTime, 14);
  });
});
