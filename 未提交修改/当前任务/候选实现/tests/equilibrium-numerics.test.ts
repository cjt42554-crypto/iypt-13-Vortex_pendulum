import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../../../02-模拟程序/src/core/config";
import {
  DEFAULT_EQUILIBRIUM_SOLVE_OPTIONS,
  finiteDifferenceJacobian,
  solveForwardEquilibrium,
} from "../src/structure/equilibrium";

describe("componentwise equilibrium numerics", () => {
  it("reports componentwise residual thresholds and ratios", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.fluid.flowRampTime = 0;
    config.support.linearStiffness = 0.02;
    config.support.referenceAngle = 0.03;
    const result = solveForwardEquilibrium(config, 0.001);
    expect(result.converged).toBe(true);
    expect(result.residual).toHaveLength(4);
    expect(result.componentResidualThresholds).toHaveLength(4);
    expect(result.componentResidualRatios).toHaveLength(4);
    expect(result.maximumComponentRatio).toBeLessThanOrEqual(1);
    expect(result.componentResidualRatios.every(Number.isFinite)).toBe(true);
  });

  it("does not mark a root converged when any component gate fails", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.support.linearStiffness = 0.02;
    config.support.referenceAngle = 0.03;
    const result = solveForwardEquilibrium(
      config,
      0.001,
      undefined,
      {
        ...DEFAULT_EQUILIBRIUM_SOLVE_OPTIONS,
        componentAbsoluteTolerances: [1e-15, 1e-15, 1e-15, 1e-15] as const,
        relativeTolerance: 0,
        maximumIterations: 0,
      },
    );
    expect(result.componentResidualRatios.some((ratio) => ratio > 1)).toBe(true);
    expect(result.maximumComponentRatio).toBeGreaterThan(1);
    expect(result.converged).toBe(false);
  });

  it("keeps the equilibrium Jacobian stable under factor-two refinement", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.fluid.flowRampTime = 0;
    config.support.linearStiffness = 0.01;
    config.support.referenceAngle = 0.01;
    const equilibrium = solveForwardEquilibrium(config, 0.001);
    const coarseSteps = DEFAULT_EQUILIBRIUM_SOLVE_OPTIONS.differentiationSteps;
    const fineSteps = coarseSteps.map((value) => value / 2) as [
      number,
      number,
      number,
      number,
    ];
    const coarse = finiteDifferenceJacobian(
      equilibrium.config,
      equilibrium.state,
      coarseSteps,
    );
    const fine = finiteDifferenceJacobian(
      equilibrium.config,
      equilibrium.state,
      fineSteps,
    );
    const maximumDifference = Math.max(...coarse.flatMap((row, rowIndex) =>
      row.map((value, columnIndex) => Math.abs(
        value - (fine[rowIndex]?.[columnIndex] ?? Number.NaN),
      )),
    ));
    expect(Number.isFinite(maximumDifference)).toBe(true);
    expect(maximumDifference).toBeLessThan(5e-5);
  });
});
