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
    const coarse = await runForward(make(0.001), undefined, "energy-coarse");
    const fine = await runForward(make(0.0005), undefined, "energy-fine");
    expect(coarse.terminationCode).toBe("COMPLETED");
    expect(fine.terminationCode).toBe("COMPLETED");
    expect(fine.numerical.acceptedSteps).toBeGreaterThan(coarse.numerical.acceptedSteps * 1.5);
    expect(fine.numerical.maximumAcceptedStep)
      .toBeLessThanOrEqual(coarse.numerical.maximumAcceptedStep * 0.51);
    const energyScale = Math.abs(fine.samples[0]?.mechanicalEnergy ?? 1);
    expect(Math.abs(fine.numerical.finalEnergyBalanceResidual) / energyScale).toBeLessThan(2e-5);
    expect(Math.abs(fine.numerical.finalEnergyBalanceResidual))
      .toBeLessThanOrEqual(Math.abs(coarse.numerical.finalEnergyBalanceResidual) * 1.2 + 1e-12);
    expect(deriveParameters(make(0.0005)).effectiveMomentOfInertia).toBeGreaterThan(0);
  }, 120_000); // 1200 physical steps + guards took 73.5 s on the shared CI runner.

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

describe("closed calibration boundary event localization", () => {
  it("does not place a later angle exit at t=0 merely because Re is at its inclusive lower bound", async () => {
    const config = cloneConfig();
    config.fluid.flowSpeed = 0;
    config.fluid.flowRampTime = 0;
    config.initial.theta = .019;
    config.initial.omega = .5;
    config.geometry.maximumAngle = .5;
    config.rom.calibrationMinReynolds = 0;
    config.rom.calibrationMaxAbsAngle = .02;
    config.rom.calibrationMaxVelocityRatio = 1000;
    config.solver.duration = .1;
    config.solver.maximumStep = .01;
    config.solver.outputInterval = .02;
    const result = await runForward(config, undefined, "inclusive-calibration-edge");
    expect(result.terminationCode).toBe("COEFFICIENT-OOD");
    expect(result.samples.at(-1)?.time).toBeGreaterThan(.001);
    expect(result.samples.at(-1)?.time).toBeLessThan(.01);
    expect(result.samples.at(-1)?.theta).toBeCloseTo(.02, 6);
  });
});

describe("wetting transition timestamps", () => {
  it("locates a full-to-partial transition independently of output and maximum step", async () => {
    const make = (maximumStep: number) => {
      const config = cloneConfig();
      Object.assign(config.fluid, { flowSpeed: 0, flowRampTime: 0 });
      Object.assign(config.geometry, { pivotHeight: .038, waterDepth: .25 });
      Object.assign(config.initial, { theta: .24, omega: .7 });
      config.rom.calibrationMaxVelocityRatio = 1000;
      Object.assign(config.solver, { duration: .1, initialStep: .001, maximumStep, outputInterval: .05 });
      return config;
    };
    const coarse = await runForward(make(.02), undefined, "wet-coarse");
    const fine = await runForward(make(.001), undefined, "wet-fine");
    expect(coarse.complete).toBe(true);
    expect(fine.complete).toBe(true);
    const first = coarse.events.find((event) => event.code === "WET-FULL-TO-PARTIAL");
    const second = fine.events.find((event) => event.code === "WET-FULL-TO-PARTIAL");
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(Math.abs((first?.time ?? 0) - (second?.time ?? 1))).toBeLessThan(2e-7);
    // Full immersion ends when the highest point of the top disk reaches the
    // surface. A displaced-volume tolerance delayed this by about 3 ms.
    const config=make(.001), {radius:R,topDistance:a,bottomDistance:b,pivotHeight:h}=config.geometry;
    const rootAngle=Math.acos(h/Math.hypot(a,R))-Math.atan2(R,a);
    const area=Math.PI*R*R, rho=config.fluid.density;
    const inertia=config.body.dryMomentOfInertia+config.rom.addedMassCoefficient*rho*area*(b**3-a**3)/3;
    const restoring=config.fluid.gravity*(config.body.movingMass*config.body.centerOfMassDistance-rho*area*(b*b-a*a)/2);
    const drag=.5*rho*config.rom.sectionalDragCoefficient*(2*R)*(b**4-a**4)/4;
    const rhs=(x:number[])=>[x[1]!,(-restoring*Math.sin(x[0]!)-drag*x[1]!*Math.abs(x[1]!)-config.support.viscousDamping*x[1]!)/inertia];
    const advance=(x:number[],dt:number)=>{
      const k1=rhs(x),k2=rhs(x.map((v,i)=>v+dt*k1[i]!/2)),k3=rhs(x.map((v,i)=>v+dt*k2[i]!/2)),k4=rhs(x.map((v,i)=>v+dt*k3[i]!));
      return x.map((v,i)=>v+dt*(k1[i]!+2*k2[i]!+2*k3[i]!+k4[i]!)/6);
    };
    let time=0,x=[.24,.7];const dt=1e-5;
    while(advance(x,dt)[0]!<rootAngle){x=advance(x,dt);time+=dt;}
    let low=0,high=dt;
    for(let i=0;i<40;i++){const mid=(low+high)/2;if(advance(x,mid)[0]!<rootAngle)low=mid;else high=mid;}
    const reference=time+(low+high)/2;
    expect(Math.abs(first!.time-reference)).toBeLessThan(1e-7);
    console.info("FULL_TO_PARTIAL_ANALYTIC_GEOMETRY",{rootAngle,reference,event:first!.time});
  });
});
