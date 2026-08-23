import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../../../02-模拟程序/src/core/config";
import {
  DEFAULT_EQUILIBRIUM_SOLVE_OPTIONS,
  assertStencilInsideDomain,
  enumerateFivePointStencil,
  linearizeForwardAtEquilibrium,
} from "../src/structure/equilibrium";

describe("structural applicability hard gates", () => {
  it("rejects a spectrum outside the coefficient Reynolds domain", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    expect(() => linearizeForwardAtEquilibrium(config, 0.05))
      .toThrow(/COEFFICIENT-OOD|applicability|domain/i);
  });

  it("rejects an equilibrium outside the calibrated angle domain", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.fluid.flowRampTime = 0;
    config.support.linearStiffness = 0.02;
    config.support.referenceAngle = 0.03;
    config.rom.calibrationMaxAbsAngle = 0.001;
    expect(() => linearizeForwardAtEquilibrium(config, 0.001))
      .toThrow(/COEFFICIENT-OOD|angle|domain/i);
  });

  it("rejects a central-difference stencil that leaves the domain", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.fluid.flowRampTime = 0;
    config.rom.calibrationMaxAbsAngle = 1.5e-6;
    const options = {
      ...DEFAULT_EQUILIBRIUM_SOLVE_OPTIONS,
      differentiationSteps: [1e-6, 1e-6, 1e-6, 1e-6] as const,
    };
    expect(() => linearizeForwardAtEquilibrium(
      config,
      0.001,
      undefined,
      options,
    )).toThrow(/stencil|COEFFICIENT-OOD|domain/i);
  });

  it("rejects original-config errors before equilibrium analysis", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.fluid.kinematicViscosity = 0;
    expect(() => linearizeForwardAtEquilibrium(config, 0.001))
      .toThrow(/CONFIG-INVALID.*kinematicViscosity/i);
  });

  it("reports the guard, component, offset, state and margin for stencil failures", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.rom.calibrationMaxAbsAngle = 1.5e-6;
    const options = {
      ...DEFAULT_EQUILIBRIUM_SOLVE_OPTIONS,
      differentiationSteps: [1e-6, 1e-6, 1e-6, 1e-6] as const,
    };
    expect(() => linearizeForwardAtEquilibrium(config, 0.001, undefined, options))
      .toThrow(/guard=COEFFICIENT-OOD.*component=theta.*offset=[+-][12].*state=.*margin=/i);
  });

  it("enumerates all five offsets for all four state components", () => {
    const points = enumerateFivePointStencil(
      { theta: 0, omega: 0, wakeReal: 0, wakeImaginary: 0 },
      [1e-6, 2e-6, 3e-6, 4e-6],
    );
    expect(points).toHaveLength(20);
    for (const component of ["theta", "omega", "wakeReal", "wakeImaginary"] as const) {
      expect(points.filter((point) => point.component === component)
        .map((point) => point.offset)).toEqual([-2, -1, 0, 1, 2]);
    }
  });

  it("rejects a stencil that crosses the exact-dry/wet branch", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.geometry.pivotHeight = config.geometry.bottomDistance;
    expect(() => assertStencilInsideDomain(
      config,
      { theta: 0, omega: 0, wakeReal: 0, wakeImaginary: 0 },
      [1e-9, 1e-6, 1e-6, 1e-6],
    )).toThrow(/NONSMOOTH-BRANCH.*component=theta/i);
  });
});
