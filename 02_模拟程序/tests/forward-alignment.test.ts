import { expect, it } from "vitest";
import { runForward, evaluateForward, stateToVector, vectorToState } from "../src/solvers/forward";
import { linearizeForwardAtSymmetricState } from "../src/analysis/structure";
import { FORWARD_MODEL_IDS } from "../src/core/forward-contract";
import { alignedConfig } from "./helpers/alignment";
import { flowSpeedAt } from "../src/core/config";
import { analyticUnforcedWake } from "../src/experiments/identifiability";

it.each(FORWARD_MODEL_IDS)("runs production branch %s with identity and passive drag", async (model) => {
    const config = alignedConfig(model);
    config.initial.theta = .03;
    config.initial.omega = .15;
    const result = await runForward(config);
    expect(result.terminationCode).toBe("COMPLETED");
    expect(result.provenance.modelId).toBe(model);
    expect(result.samples.every((s) => s.dragTorque * s.omega <= 1e-15)).toBe(true);
    expect(result.metrics.energyClosureRelativeRms).toBeLessThan(1e-6);
    console.info("FOUR_BRANCH", model, result.numerical, result.events);
});

it("preserves exact rest while the production wake evolves with gamma0 theta", async () => {
  const config = alignedConfig("VP-FWD-P0-SL1-SS-v1");
  config.initial.theta = .01;
  config.initial.omega = config.initial.wakeReal = config.initial.wakeImaginary = 0;
  config.rom.couplingThetaReal = .3;
  config.support.staticFrictionTorque = .01;
  const result = await runForward(config);
  expect(result.complete).toBe(true);
  expect(result.samples.every((s) => s.theta === .01 && s.omega === 0 && s.angularAcceleration === 0 && s.frictionMode === "stick")).toBe(true);
  expect(result.samples.at(-1)!.wakeAmplitude).toBeGreaterThan(1e-4);
  expect(result.numerical.finalEnergyBalanceResidual).toBe(0);
});

it("resolves physical stopping and keeps rest under four internal refinements", async () => {
  const stops: number[] = [];
  for (const maxStep of [.04, .02, .01, .005]) {
    const config = alignedConfig("VP-FWD-P0-SL1-SS-v1");
    config.initial.theta = 0;
    config.initial.omega = .1;
    config.fluid.flowSpeed = 0;
    config.solver.maximumStep = maxStep;
    config.solver.initialStep = maxStep;
    config.solver.outputInterval = .2;
    const result = await runForward(config);
    expect(result.complete).toBe(true);
    const event = result.events.find((event) => event.modeAfter === "stick")!;
    expect(event).toBeDefined();
    expect(event.bracket!.invalidTime - event.bracket!.validTime).toBeLessThanOrEqual(config.solver.eventTimeTolerance);
    expect(result.samples.filter((s) => s.time >= event.time).every((s) => s.omega === 0)).toBe(true);
    expect(Math.abs(result.numerical.finalEnergyBalanceResidual)).toBeLessThan(1e-6 * .5 * config.body.dryMomentOfInertia * .1 ** 2);
    stops.push(event.time);
  }
  expect(Math.max(...stops) - Math.min(...stops)).toBeLessThan(1e-7);
  console.info("SS_STOP_REFINEMENT", stops);
});

it("reduces zero Coulomb and full immersion to the smooth full-width branch", async () => {
  const results = [];
  for (const model of FORWARD_MODEL_IDS) {
    const config = alignedConfig(model);
    config.support.coulombFriction = config.support.staticFrictionTorque = config.support.kineticFrictionTorque = 0;
    config.geometry.pivotHeight = .02;
    config.geometry.waterDepth = .25;
    config.solver.duration = .2;
    results.push(await runForward(config));
  }
  for (const result of results) {
    expect(result.complete).toBe(true);
    expect(Math.abs(result.samples.at(-1)!.theta - results[0]!.samples.at(-1)!.theta)).toBeLessThan(1e-9);
    expect(Math.abs(result.samples.at(-1)!.wakeReal - results[0]!.samples.at(-1)!.wakeReal)).toBeLessThan(1e-9);
  }
});

it("changes only drag in a partially wet moving state and rejects mismatched widths", async () => {
  const baseline = alignedConfig();
  const dw = alignedConfig("VP-FWD-P0-SL1-DW-v1");
  const state = { theta: .3, omega: 1, wakeReal: .2, wakeImaginary: .1 };
  const left = evaluateForward(baseline, 0, state), right = evaluateForward(dw, 0, state);
  expect(Math.abs(left.dragTorque - right.dragTorque)).toBeGreaterThan(1e-9);
  expect(left.liftTorque).toBe(right.liftTorque);
  expect(left.liftCoefficient).toBe(right.liftCoefficient);
  dw.rom.dragWidthDefinition = "streamwise-wet-width";
  await expect(runForward(dw)).rejects.toThrow(/dragWidthDefinition/);
  expect(() => linearizeForwardAtSymmetricState(dw, .017)).toThrow(/not qualified/);
});

it("locates wake-driven breakaway, preserves wake and gamma0, under four internal refinements", async () => {
  const config = alignedConfig("VP-FWD-P0-SL1-SS-v1");
  config.initial.theta = .01;
  config.initial.omega = config.initial.wakeReal = config.initial.wakeImaginary = 0;
  config.support.linearStiffness = .1; config.support.referenceAngle = .01;
  config.rom.couplingThetaReal = 3; config.rom.liftOutputReal = 100;
  config.support.referenceAngle -= evaluateForward(config, 0, config.initial).mechanics.drivingTorque / .1;
  config.support.staticFrictionTorque = 4e-6; config.support.kineticFrictionTorque = 1e-6;
  config.solver.duration = .08; config.solver.outputInterval = .08;
  const first = evaluateForward(config, 0, config.initial, undefined, "stick");
  // Independent fixed RK4 of the frozen, forced complex SL equation, with an
  // independently bisected rest-torque threshold. Mechanical states stay exact.
  const forcing = [first.derivative.wakeReal, first.derivative.wakeImaginary];
  const rhs = (a: number[]) => {
    const [x, y] = a as [number, number], q = x*x+y*y;
    return [first.wakeGrowthRate*x-first.sheddingAngularFrequency*y-first.wakeCubicReal*q*x+first.wakeCubicImaginary*q*y+forcing[0]!,
      first.sheddingAngularFrequency*x+first.wakeGrowthRate*y-first.wakeCubicReal*q*y-first.wakeCubicImaginary*q*x+forcing[1]!];
  };
  const advance = (a: number[], h: number) => {
    const k1=rhs(a), k2=rhs(a.map((v,i)=>v+h*k1[i]!/2)), k3=rhs(a.map((v,i)=>v+h*k2[i]!/2)), k4=rhs(a.map((v,i)=>v+h*k3[i]!));
    return a.map((v,i)=>v+h*(k1[i]!+2*k2[i]!+2*k3[i]!+k4[i]!)/6);
  };
  const torque = (t: number, a: number[]) => evaluateForward(config,t,{...config.initial,wakeReal:a[0]!,wakeImaginary:a[1]!},undefined,"stick").mechanics.drivingTorque;
  let time=0, a=[0,0], reference=NaN;
  while(time < .08) {
    const h=1e-4, b=advance(a,h);
    if (Math.abs(torque(time+h,b)) > config.support.staticFrictionTorque!) {
      let low=0,high=h;
      for(let i=0;i<40;i++){const mid=(low+high)/2;if(Math.abs(torque(time+mid,advance(a,mid)))>config.support.staticFrictionTorque!)high=mid;else low=mid;}
      reference=time+(low+high)/2;break;
    }
    time+=h;a=b;
  }
  expect(Number.isFinite(reference)).toBe(true);
  const errors=[];
  for(const h of [.02,.01,.005,.0025]) {
    config.solver.maximumStep=config.solver.initialStep=h;
    const result=await runForward(config);
    expect(result.complete).toBe(true);
    const event=result.events.find(e=>e.modeBefore==="stick")!;
    expect(event.modeAfter).toBe("slip+");
    expect(result.samples.find(s=>s.time===event.time)!.wakeAmplitude).toBeGreaterThan(0);
    expect(Math.abs(event.time-reference)).toBeLessThan(1e-7);
    errors.push(Math.abs(event.time-reference));
  }
  config.rom.couplingThetaReal=0;
  const absent=await runForward(config);
  expect(absent.events.some(e=>e.kind==="mode")).toBe(false);
  expect(absent.samples.every(s=>s.wakeAmplitude===0&&s.omega===0)).toBe(true);
  console.info("SS_WAKE_REFINEMENT", {reference, errors});
});

it("reverses both sliding signs through zero without resetting the wake", async () => {
  for(const sign of [-1,1]) {
    const config=alignedConfig("VP-FWD-P0-SL1-SS-v1");
    config.initial.theta=.03*sign;config.initial.omega=.1*sign;
    config.support.staticFrictionTorque=1e-5;config.support.kineticFrictionTorque=5e-6;
    const result=await runForward(config);
    expect(result.complete).toBe(true);
    const event=result.events.find(e=>e.modeBefore===(sign>0?"slip+":"slip-")&&e.modeAfter===(sign>0?"slip-":"slip+"));
    expect(event).toBeDefined();
    const sample=result.samples.find(s=>s.time===event!.time)!;
    expect(sample.omega).toBe(0);expect(sample.wakeAmplitude).toBeGreaterThan(0);
  }
});

it("has an exactly passive linear zero-flow wake corner without artificial cubic damping", async () => {
  const config=alignedConfig();
  config.geometry.pivotHeight=.02;config.geometry.waterDepth=.25;
  config.fluid.flowSpeed=0;
  config.initial.theta=config.initial.omega=0;config.initial.wakeReal=.3;config.initial.wakeImaginary=-.2;
  config.solver.duration=.1;
  const value=evaluateForward(config,0,config.initial);
  expect(value.wakeCubicReal).toBe(0);
  expect(value.wakeGrowthRate).toBe(-1/config.rom.zeroFlowWakeDecayTime);
  expect(value.liftTorque).toBe(0);
  const result=await runForward(config);
  for(const s of result.samples) {
    expect(Math.abs(s.wakeReal-.3*Math.exp(-s.time/config.rom.zeroFlowWakeDecayTime))).toBeLessThan(1e-10);
    expect(s.theta).toBe(0);expect(s.omega).toBe(0);
  }
});

it("refines the production DW trajectory against independent fixed RK4", async () => {
  const config=alignedConfig("VP-FWD-P0-SL1-DW-v1");
  config.initial.theta=.15;config.initial.omega=.1;
  config.solver.duration=config.solver.outputInterval=.08;
  config.solver.relativeTolerance=1e-6;
  let ref=stateToVector(config.initial),t=0;
  const rhs=(time:number,v:number[])=>stateToVector(evaluateForward(config,time,vectorToState(v)).derivative);
  for(let n=0;n<160;n++) {
    const h=.0005,k1=rhs(t,ref),k2=rhs(t+h/2,ref.map((v,i)=>v+h*k1[i]!/2)),k3=rhs(t+h/2,ref.map((v,i)=>v+h*k2[i]!/2)),k4=rhs(t+h,ref.map((v,i)=>v+h*k3[i]!));
    ref=ref.map((v,i)=>v+h*(k1[i]!+2*k2[i]!+2*k3[i]!+k4[i]!)/6);t+=h;
  }
  const records=[];
  for(const h of [.02,.01,.005,.0025]) {
    config.solver.maximumStep=config.solver.initialStep=h;
    const result=await runForward(config);const end=result.samples.at(-1)!;
    expect(result.complete).toBe(true);
    const error=Math.max(...stateToVector(end).map((v,i)=>Math.abs(v-ref[i]!)/(1+Math.abs(ref[i]!))));
    expect(error).toBeLessThan(1e-6);
    records.push({h,error,accepted:result.numerical.acceptedSteps,maxStep:result.numerical.maximumAcceptedStep});
  }
  expect(records[3]!.accepted).toBeGreaterThan(records[0]!.accepted);
  console.info("DW_TIME_REFINEMENT",records);
});

it.each([{mu:1,beta:1,ws:2,bi:.2,a0:.5},{mu:-1,beta:1,ws:2,bi:.2,a0:1},{mu:0,beta:1,ws:2,bi:.2,a0:1},
  {mu:1,beta:1,ws:2,bi:.2,a0:1},{mu:2,beta:2,ws:2.5,bi:.7,a0:1}])(
  "matches the unforced production wake to its analytic growth/decay/saturated identity: %j", async ({mu,beta,ws,bi,a0})=>{
    const config=alignedConfig("VP-FWD-P0-SL1-SS-v1");
    config.initial.theta=config.initial.omega=config.initial.wakeImaginary=0;config.initial.wakeReal=a0;
    config.support.staticFrictionTorque=1;config.support.kineticFrictionTorque=0;
    const U=config.fluid.flowSpeed,D=2*config.geometry.radius,activation=U*U/(U*U+config.rom.wakeActivationSpeed**2);
    const Re=U*D/config.fluid.kinematicViscosity;
    config.rom.strouhalNumber=ws*D/(2*Math.PI*U);
    config.rom.referenceHopfReynolds=mu<0?2*Re:Re/2;
    config.rom.hopfGrowthSlope=(mu+(1-activation)/config.rom.zeroFlowWakeDecayTime)/(activation*ws*(Re/config.rom.referenceHopfReynolds-1));
    config.rom.cubicSaturation=beta/(activation*ws);config.rom.nonlinearFrequencyShift=bi/(activation*ws);
    config.solver.duration=.12;
    const result=await runForward(config);
    expect(result.complete).toBe(true);
    for(const s of result.samples){
      const ref=analyticUnforcedWake({muPerSecond:mu,betaRealPerSecond:beta,betaImaginaryPerSecond:bi,linearAngularFrequencyRadPerSecond:ws,initial:{real:a0,imaginary:0}},s.time);
      expect(Math.hypot(s.wakeReal-ref.wake.real,s.wakeImaginary-ref.wake.imaginary)).toBeLessThan(1e-9);
      expect(s.theta).toBe(0);expect(s.omega).toBe(0);
      if(mu===beta&&a0===1)expect(Math.hypot(s.wakeReal-Math.cos(1.8*s.time),s.wakeImaginary-Math.sin(1.8*s.time))).toBeLessThan(1e-9);
    }
  });

it("gives a simultaneous wet-coverage exit priority over wake-driven breakaway", async ()=>{
  const config=alignedConfig("VP-FWD-P0-SL1-SS-v1");
  config.initial.theta=.01;config.initial.omega=config.initial.wakeReal=config.initial.wakeImaginary=0;
  config.fluid.flowRampTime=.08;
  config.support.linearStiffness=.1;config.support.referenceAngle=.01;
  config.support.referenceAngle-=evaluateForward(config,0,config.initial).mechanics.drivingTorque/.1;
  config.rom.couplingThetaReal=3;config.rom.liftOutputReal=100;
  config.support.staticFrictionTorque=1;config.support.kineticFrictionTorque=0;
  config.solver.duration=config.solver.outputInterval=.02;
  const constrained=await runForward(config), at=constrained.samples.at(-1)!;
  config.support.staticFrictionTorque=Math.abs(evaluateForward(config,.02,at,undefined,"stick").mechanics.drivingTorque);
  config.rom.jointCalibrationSupport!.cells[0]!.flowSpeedMps.maximum=flowSpeedAt(config,.02);
  config.solver.duration=.04;
  const result=await runForward(config);
  expect(result.terminationCode).toBe("COEFFICIENT-OOD");
  expect(Math.abs(result.events.find(e=>e.code==="COEFFICIENT-OOD")!.time-.02)).toBeLessThan(1e-7);
  expect(result.events.some(e=>e.kind==="mode")).toBe(false);
});
