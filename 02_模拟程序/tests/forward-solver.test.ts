import { describe, expect, it } from "vitest";
import { cloneConfig, deriveParameters } from "../src/core/config";
import { runForward } from "../src/solvers/forward";
import { evaluateForward } from "../src/solvers/forward/model";

describe("VP-FWD-P0-SL1-v1 executable model", () => {
  it("keeps quasi-steady drag dissipative, including in still water", () => {
    const config = cloneConfig();
    config.fluid.flowSpeed = 0;
    config.fluid.flowRampTime = 0;
    const evaluated = evaluateForward(config, 1, {
      theta: 0.08,
      omega: -0.7,
      wakeReal: 0.5,
      wakeImaginary: -0.2,
    });
    expect(evaluated.liftTorque).toBe(0);
    expect(evaluated.dragTorque * -0.7).toBeLessThanOrEqual(0);
    expect(evaluated.wakeGrowthRate).toBeCloseTo(-1 / config.rom.zeroFlowWakeDecayTime, 12);
  });

  it("runs the default model on an exact uniform output grid", async () => {
    const config = cloneConfig();
    config.solver.duration = 0.2;
    config.solver.outputInterval = 0.01;
    config.fluid.flowRampTime = 0;
    const result = await runForward(config, undefined, "smoke");
    expect(result.terminationCode).toBe("COMPLETED");
    expect(result.complete).toBe(true);
    expect(result.samples).toHaveLength(21);
    result.samples.forEach((sample, index) => {
      expect(sample.time).toBeCloseTo(index * 0.01, 13);
    });
    expect(result.numerical.acceptedSteps).toBeGreaterThan(0);
    expect(result.numerical.maximumAcceptedErrorNorm).toBeLessThanOrEqual(1);
    expect(result.provenance.epistemicClassification)
      .toBe("illustrative-literature-prior");
    expect(result.provenance.holdoutStatus).toBe("not-bound-in-standalone-run");
  });

  it("locates the angle-domain event instead of integrating through it", async () => {
    const config = cloneConfig();
    config.fluid.flowSpeed = 0;
    config.fluid.flowRampTime = 0;
    config.initial.theta = 0.019;
    config.initial.omega = 0.5;
    config.geometry.maximumAngle = 0.02;
    config.rom.calibrationMaxVelocityRatio = 1000;
    config.rom.calibrationMaxAbsAngle = 0.5;
    config.solver.duration = 0.1;
    config.solver.maximumStep = 0.01;
    config.solver.outputInterval = 0.02;
    const result = await runForward(config, undefined, "angle-event");
    expect(result.terminationCode).toBe("ANGLE-LIMIT");
    expect(result.samples.at(-1)?.theta).toBeCloseTo(0.02, 6);
    expect(result.samples.at(-1)?.time).toBeLessThan(0.01);
  });

  it("closes the conservative mechanical energy ledger under refinement", async () => {
    const make = (maximumStep: number) => {
      const config = cloneConfig();
      config.fluid.flowSpeed = 0;
      config.fluid.flowRampTime = 0;
      config.support.viscousDamping = 0;
      config.support.coulombFriction = 0;
      config.rom.sectionalDragCoefficient = 0;
      config.initial.wakeReal = 0;
      config.initial.wakeImaginary = 0;
      config.rom.couplingThetaReal = 0;
      config.rom.couplingThetaImaginary = 0;
      config.rom.couplingOmegaReal = 0;
      config.rom.couplingOmegaImaginary = 0;
      config.rom.couplingAccelerationReal = 0;
      config.rom.couplingAccelerationImaginary = 0;
      config.rom.calibrationMaxVelocityRatio = 1000;
      config.solver.duration = 0.4;
      config.solver.maximumStep = maximumStep;
      config.solver.initialStep = Math.min(0.001, maximumStep);
      config.solver.outputInterval = 0.002;
      return config;
    };
    const coarse = await runForward(make(0.01), undefined, "energy-coarse");
    const fine = await runForward(make(0.003), undefined, "energy-fine");
    const energyScale = Math.abs(fine.samples[0]?.mechanicalEnergy ?? 1);
    expect(Math.abs(fine.numerical.finalEnergyBalanceResidual) / energyScale).toBeLessThan(2e-5);
    expect(Math.abs(fine.numerical.finalEnergyBalanceResidual))
      .toBeLessThanOrEqual(Math.abs(coarse.numerical.finalEnergyBalanceResidual) * 1.2 + 1e-12);
    expect(deriveParameters(make(0.003)).effectiveMomentOfInertia).toBeGreaterThan(0);
  });

  it("keeps the final physical state invariant to the requested output grid", async () => {
    const make = (outputInterval: number) => {
      const config = cloneConfig();
      config.fluid.flowRampTime = 0;
      config.solver.duration = 0.21;
      config.solver.outputInterval = outputInterval;
      config.solver.maximumStep = 0.004;
      config.solver.relativeTolerance = 1e-8;
      config.solver.absoluteToleranceTheta = 1e-11;
      config.solver.absoluteToleranceOmega = 1e-10;
      config.solver.absoluteToleranceWake = 1e-10;
      return config;
    };
    const first = await runForward(make(0.01), undefined, "output-grid-a");
    const second = await runForward(make(0.007), undefined, "output-grid-b");
    const a = first.samples.at(-1);
    const b = second.samples.at(-1);
    expect(a?.time).toBeCloseTo(0.21, 14);
    expect(b?.time).toBeCloseTo(0.21, 14);
    expect(a?.theta).toBeCloseTo(b?.theta ?? Number.NaN, 8);
    expect(a?.omega).toBeCloseTo(b?.omega ?? Number.NaN, 8);
    expect(a?.wakeReal).toBeCloseTo(b?.wakeReal ?? Number.NaN, 8);
    expect(a?.wakeImaginary).toBeCloseTo(b?.wakeImaginary ?? Number.NaN, 8);
  });
});
