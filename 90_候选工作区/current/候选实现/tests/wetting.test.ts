import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../../../02-模拟程序/src/core/config";
import {
  evaluateForwardGuardsP0,
  evaluateForwardP0,
} from "../src/forward/model";
import {
  normalizedWettingActivation,
  wettingStateFromProjectedArea,
} from "../src/wetting";

describe("continuous dry/wet closure", () => {
  it("has exact dry and full endpoints and a monotone continuous onset", () => {
    expect(normalizedWettingActivation(0, 0.05)).toBe(0);
    expect(normalizedWettingActivation(1, 0.05)).toBe(1);
    const fractions = [0, 1e-8, 1e-6, 1e-4, 1e-2, 0.1, 0.5, 1];
    const values = fractions.map((fraction) => normalizedWettingActivation(fraction, 0.05));
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).toBeGreaterThanOrEqual(values[index - 1] ?? 0);
    }
    expect(values[1]).toBeLessThan(1e-10);
  });

  it("normalizes projected wet area without a Boolean onset threshold", () => {
    const fullArea = 0.006 * 0.14;
    const dry = wettingStateFromProjectedArea(0, fullArea);
    const sliver = wettingStateFromProjectedArea(1e-12 * fullArea, fullArea);
    const full = wettingStateFromProjectedArea(fullArea, fullArea);
    expect(dry.isDry).toBe(true);
    expect(dry.activation).toBe(0);
    expect(sliver.activation).toBeGreaterThanOrEqual(0);
    expect(sliver.activation).toBeLessThan(1e-18);
    expect(full.activation).toBe(1);
  });

  it("keeps the exact dry branch legal and exponentially decaying", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.geometry.pivotHeight = 0.5;
    config.fluid.flowRampTime = 0;
    const state = { theta: 0, omega: 0, wakeReal: 0.02, wakeImaginary: -0.01 };
    const evaluated = evaluateForwardP0(config, 1, state);
    expect(evaluated.wetting.isDry).toBe(true);
    expect(evaluated.wetting.activation).toBe(0);
    expect(evaluated.sheddingAngularFrequency).toBe(0);
    expect(evaluated.wakeCubicReal).toBe(0);
    expect(evaluated.wakeCubicImaginary).toBe(0);
    expect(evaluated.wakeGrowthRate).toBeCloseTo(-1 / config.rom.zeroFlowWakeDecayTime, 14);
    expect(evaluated.derivative.wakeReal).toBeCloseTo(
      -state.wakeReal / config.rom.zeroFlowWakeDecayTime,
      14,
    );
    expect(evaluated.derivative.wakeImaginary).toBeCloseTo(
      -state.wakeImaginary / config.rom.zeroFlowWakeDecayTime,
      14,
    );
    const coefficientGuard = evaluateForwardGuardsP0(config, 1, state)
      .find((guard) => guard.code === "COEFFICIENT-OOD");
    const inflowGuard = evaluateForwardGuardsP0(config, 1, state)
      .find((guard) => guard.code === "RAPID-INFLOW");
    expect(coefficientGuard?.margin).toBeGreaterThan(0);
    expect(inflowGuard?.margin).toBeGreaterThan(0);
  });
});
