import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../../../02_模拟程序/src/core/config";
import { evaluateForwardP0 } from "../src/forward/model";
import {
  finiteDifferenceJacobian,
  linearizeForwardAtEquilibrium,
  solveForwardEquilibrium,
} from "../src/structure/equilibrium";

describe("equilibrium-first structural linearization", () => {
  it("does not interpret X=0 as an equilibrium when the support is biased", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.fluid.flowSpeed = 0;
    config.fluid.flowRampTime = 0;
    config.support.linearStiffness = 0.02;
    config.support.referenceAngle = 0.03;
    const zero = { theta: 0, omega: 0, wakeReal: 0, wakeImaginary: 0 };
    const zeroResidual = Math.hypot(...Object.values(evaluateForwardP0(config, 1, zero).derivative));
    expect(zeroResidual).toBeGreaterThan(1e-4);

    const equilibrium = solveForwardEquilibrium(config, 0, zero);
    expect(equilibrium.converged).toBe(true);
    expect(equilibrium.residualNorm).toBeLessThan(1e-9);
    expect(Math.abs(equilibrium.state.theta)).toBeGreaterThan(1e-6);
  });

  it("linearizes at the solved equilibrium and returns a finite monic quartic", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.fluid.flowSpeed = 0;
    config.fluid.flowRampTime = 0;
    config.support.linearStiffness = 0.02;
    config.support.referenceAngle = -0.02;
    const linear = linearizeForwardAtEquilibrium(config, 0);
    expect(linear.residualNorm).toBeLessThan(1e-9);
    expect(linear.jacobian).toHaveLength(4);
    expect(linear.characteristic[0]).toBe(1);
    expect(linear.characteristic.every(Number.isFinite)).toBe(true);
  });

  it("keeps the equilibrium Jacobian stable under a factor-two step refinement", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.fluid.flowSpeed = 0;
    config.fluid.flowRampTime = 0;
    config.support.linearStiffness = 0.01;
    config.support.referenceAngle = 0.01;
    const equilibrium = solveForwardEquilibrium(config, 0);
    const coarse = finiteDifferenceJacobian(
      equilibrium.config,
      equilibrium.state,
      [1e-6, 1e-6, 1e-6, 1e-6],
    );
    const fine = finiteDifferenceJacobian(
      equilibrium.config,
      equilibrium.state,
      [5e-7, 5e-7, 5e-7, 5e-7],
    );
    const maximumDifference = Math.max(...coarse.flatMap((row, rowIndex) =>
      row.map((value, columnIndex) => Math.abs(
        value - (fine[rowIndex]?.[columnIndex] ?? Number.NaN),
      )),
    ));
    expect(maximumDifference).toBeLessThan(5e-5);
  });
});
