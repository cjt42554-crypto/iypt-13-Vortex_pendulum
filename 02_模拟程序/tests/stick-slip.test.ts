import { describe, expect, it } from "vitest";
import { dormandPrince54Step } from "../src/solvers/forward/dopri54";
import {
  didExitStaticRegion,
  didReachSlipStop,
  evaluateStickSlipDerivative,
  evaluateStickSlipMechanics,
  restartStickSlipAfterStaticExit,
  restartStickSlipAtRest,
  selectInitialStickSlipMode,
  selectModeAtRest,
  staticFrictionMargin,
  type StickSlipContinuousState,
  type StickSlipMode,
  locateStickSlipEvent,
} from "../src/solvers/forward/stick-slip";

const ZERO_WAKE = () => ({ wakeReal: 0, wakeImaginary: 0 });

function toVector(state: StickSlipContinuousState): number[] {
  return [state.theta, state.omega, state.wakeReal, state.wakeImaginary];
}

function fromVector(vector: readonly number[]): StickSlipContinuousState {
  return {
    theta: vector[0] ?? Number.NaN,
    omega: vector[1] ?? Number.NaN,
    wakeReal: vector[2] ?? Number.NaN,
    wakeImaginary: vector[3] ?? Number.NaN,
  };
}

function bisectDenseOmegaRoot(
  denseState: (fraction: number) => number[],
): number {
  let low = 0;
  let high = 1;
  for (let index = 0; index < 80; index += 1) {
    const midpoint = 0.5 * (low + high);
    if ((denseState(midpoint)[1] ?? Number.NaN) > 0) low = midpoint;
    else high = midpoint;
  }
  return 0.5 * (low + high);
}

describe("VP-FWD-P0-SL1-SS-v1 stick-slip component", () => {
  it("refines C1/C2 through the production mode locator and RK work quadrature", () => {
    for (const rampCase of [false, true]) {
      const records = [];
      for (const h of [.3, .15, .075, .0375]) {
        const torque = (t: number) => rampCase ? .04*t : 0;
        const staticTorque = rampCase ? .03 : .02;
        let t=0, v=[0,rampCase?0:.5,0,0,0];
        let mode: StickSlipMode=rampCase?"stick":"slip+";
        let eventTime=NaN;
        while(t<1-1e-14) {
          const step=Math.min(h,1-t);
          const trial=dormandPrince54Step((time, vector)=>{
            const evaluated=evaluateStickSlipDerivative(mode,fromVector(vector),{
              effectiveInertia:.02,drivingTorque:torque(time),staticFrictionTorque:staticTorque,
              kineticFrictionTorque:.02,viscousDamping:0,
            },ZERO_WAKE);
            return [...toVector(evaluated.derivative),(torque(time)+evaluated.mechanics.axisFrictionTorque)*vector[1]!];
          },t,v,step);
          const stateAt=(time:number)=>fromVector(trial.denseState(Math.max(0,Math.min(1,(time-t)/step))));
          const event=locateStickSlipEvent(mode,stateAt,(time)=>torque(time),
            Array.from({length:9},(_,i)=>t+step*i/8),staticTorque,1e-12);
          if(event) {
            v=[...toVector(event.state),trial.denseState((event.time-t)/step)[4]!];
            t=event.time;mode=event.nextMode;eventTime=t;
          } else {v=trial.fifthOrder;t+=step;}
        }
        const expectedTime=rampCase?.75:.5, expectedTheta=rampCase?1/48:.125, expectedOmega=rampCase?.1875:0;
        const initialEnergy=rampCase?0:.0025;
        const ledger=.5*.02*v[1]!**2-initialEnergy-v[4]!;
        expect(Math.abs(eventTime-expectedTime)).toBeLessThan(1e-10);
        expect(Math.abs(v[0]!-expectedTheta)).toBeLessThan(1e-10);
        expect(Math.abs(v[1]!-expectedOmega)).toBeLessThan(1e-10);
        expect(Math.abs(ledger)).toBeLessThan(1e-12);
        records.push({h,eventTime,theta:v[0],omega:v[1],netWork:v[4],ledger});
      }
      console.info(rampCase?"SS_C2_REFINEMENT":"SS_C1_REFINEMENT",records);
    }
  });
  it("matches C1 free-stop time, angle, dissipation, and persistent rest", () => {
    const parameters = {
      effectiveInertia: 0.02,
      drivingTorque: 0,
      staticFrictionTorque: 0.02,
      kineticFrictionTorque: 0.02,
      viscousDamping: 0,
    };
    let state: StickSlipContinuousState = {
      theta: 0,
      omega: 0.5,
      wakeReal: 0.4,
      wakeImaginary: -0.2,
    };
    let time = 0;
    const stepSize = 0.3;
    const rhs = (_time: number, vector: readonly number[]) => toVector(
      evaluateStickSlipDerivative(
        "slip+",
        fromVector(vector),
        parameters,
        ZERO_WAKE,
      ).derivative,
    );

    const first = dormandPrince54Step(rhs, time, toVector(state), stepSize);
    state = fromVector(first.fifthOrder);
    time += stepSize;
    expect(didReachSlipStop("slip+", 0.5, state.omega)).toBe(false);

    const second = dormandPrince54Step(rhs, time, toVector(state), stepSize);
    const trial = fromVector(second.fifthOrder);
    expect(didReachSlipStop("slip+", state.omega, trial.omega)).toBe(true);
    const rootFraction = bisectDenseOmegaRoot(second.denseState);
    const stopState = fromVector(second.denseState(rootFraction));
    const stopTime = time + stepSize * rootFraction;
    stopState.omega = 0;

    expect(stopTime).toBeCloseTo(0.5, 13);
    expect(stopState.theta).toBeCloseTo(0.125, 13);
    const initialPower = evaluateStickSlipMechanics("slip+", {
      ...parameters,
      omega: 0.5,
    }).dampingPower;
    const stopPower = evaluateStickSlipMechanics("slip+", {
      ...parameters,
      omega: 0,
    }).dampingPower;
    expect(0.5 * (initialPower + stopPower) * stopTime).toBeCloseTo(0.0025, 14);

    const restart = restartStickSlipAtRest(
      stopState,
      parameters.drivingTorque,
      parameters.staticFrictionTorque,
    );
    expect(restart.mode).toBe("stick");
    expect(restart.state).toBe(stopState);
    const rested = dormandPrince54Step(
      (_time, vector) => toVector(evaluateStickSlipDerivative(
        "stick",
        fromVector(vector),
        parameters,
        ZERO_WAKE,
      ).derivative),
      stopTime,
      toVector(stopState),
      1,
    );
    expect(rested.fifthOrder[0]).toBeCloseTo(0.125, 14);
    expect(rested.fifthOrder[1]).toBe(0);
    expect(rested.fifthOrder[2]).toBeCloseTo(0.4, 14);
    expect(rested.fifthOrder[3]).toBeCloseTo(-0.2, 14);
    if (process.env.SS_REPORT === "1") {
      console.info("SS_C1", JSON.stringify({
        stopTime,
        stopAngle: stopState.theta,
        frictionDissipation: 0.5 * (initialPower + stopPower) * stopTime,
        persistentRestDuration: 1,
      }));
    }
  });

  it("matches C2 strict ramp breakaway, trajectory, and work ledger", () => {
    const inertia = 0.02;
    const staticTorque = 0.03;
    const kineticTorque = 0.02;
    const ramp = 0.04;
    const breakawayTime = staticTorque / ramp;
    const margin = (time: number) => staticFrictionMargin(ramp * time, staticTorque);

    expect(breakawayTime).toBe(0.75);
    expect(selectModeAtRest(ramp * breakawayTime, staticTorque)).toBe("stick");
    expect(didExitStaticRegion(margin(0.7), margin(breakawayTime))).toBe(false);
    expect(didExitStaticRegion(margin(breakawayTime), margin(breakawayTime + 1e-9))).toBe(true);

    const initial: StickSlipContinuousState = {
      theta: 0,
      omega: 0,
      wakeReal: 0,
      wakeImaginary: 0,
    };
    const breakaway = restartStickSlipAfterStaticExit(
      initial,
      ramp * (breakawayTime + 1e-9),
      staticTorque,
    );
    expect(breakaway.mode).toBe("slip+");
    expect(breakaway.state).toBe(initial);
    const step = dormandPrince54Step(
      (time, vector) => toVector(evaluateStickSlipDerivative(
        "slip+",
        fromVector(vector),
        {
          effectiveInertia: inertia,
          drivingTorque: ramp * time,
          staticFrictionTorque: staticTorque,
          kineticFrictionTorque: kineticTorque,
          viscousDamping: 0,
        },
        ZERO_WAKE,
      ).derivative),
      breakawayTime,
      toVector(initial),
      1 - breakawayTime,
    );
    const final = fromVector(step.fifthOrder);
    expect(final.omega).toBeCloseTo(0.1875, 14);
    expect(final.theta).toBeCloseTo(0.02083333333333333, 14);

    const kineticEnergy = 0.5 * inertia * final.omega ** 2;
    const frictionDissipation = kineticTorque * final.theta;
    const duration = 1 - breakawayTime;
    const linearVelocityCoefficient = (staticTorque - kineticTorque) / inertia;
    const quadraticVelocityCoefficient = ramp / (2 * inertia);
    const expectedExternalWork = staticTorque * linearVelocityCoefficient
      * duration ** 2 / 2
      + (staticTorque * quadraticVelocityCoefficient
        + ramp * linearVelocityCoefficient) * duration ** 3 / 3
      + ramp * quadraticVelocityCoefficient * duration ** 4 / 4;
    expect(kineticEnergy + frictionDissipation).toBeCloseTo(expectedExternalWork, 14);
    if (process.env.SS_REPORT === "1") {
      console.info("SS_C2", JSON.stringify({
        breakawayTime,
        finalOmega: final.omega,
        finalAngle: final.theta,
        mechanicalEnergyGain: kineticEnergy,
        frictionDissipation,
        externalWork: expectedExternalWork,
        ledgerResidual: kineticEnergy + frictionDissipation - expectedExternalWork,
      }));
    }
  });

  it("keeps the admissible stick solution and treats threshold tangency as stick", () => {
    const betweenThresholds = evaluateStickSlipMechanics("stick", {
      effectiveInertia: 0.02,
      drivingTorque: 0.025,
      staticFrictionTorque: 0.03,
      kineticFrictionTorque: 0.02,
      viscousDamping: 0,
      omega: 0,
    });
    expect(selectInitialStickSlipMode(0, 0.025, 0.03)).toBe("stick");
    expect(betweenThresholds.modeAdmissible).toBe(true);
    expect(betweenThresholds.acceleration).toBe(0);
    expect(betweenThresholds.axisFrictionTorque).toBe(-0.025);
    expect(didExitStaticRegion(0.01, 0)).toBe(false);
    expect(didExitStaticRegion(0, 0.01)).toBe(false);
    expect(didExitStaticRegion(0, -Number.EPSILON)).toBe(true);
    const stateAt=()=>({theta:0,omega:0,wakeReal:0,wakeImaginary:0});
    expect(locateStickSlipEvent("stick",stateAt,t=>.03-.01*(t-.5)**2,[0,.25,.5,.75,1],.03,1e-10)).toBeUndefined();
  });

  it("reselects positive and negative stops, including reversal and zero thresholds", () => {
    const stopped = { theta: 0.2, omega: 0, wakeReal: 0.7, wakeImaginary: -0.4 };
    expect(restartStickSlipAtRest(stopped, 0.01, 0.03).mode).toBe("stick");
    expect(restartStickSlipAtRest(stopped, -0.031, 0.03).mode).toBe("slip-");
    expect(restartStickSlipAtRest(stopped, 0.031, 0.03).mode).toBe("slip+");
    expect(didReachSlipStop("slip-", -1e-30, 0)).toBe(true);
    expect(didReachSlipStop("slip+", 1e-30, 0)).toBe(true);
    expect(evaluateStickSlipMechanics("slip+", {
      effectiveInertia: 0.02,
      drivingTorque: -0.04,
      staticFrictionTorque: 0.03,
      kineticFrictionTorque: 0.02,
      viscousDamping: 0,
      omega: 0.1,
    }).acceleration).toBeCloseTo(-3, 14);
    expect(evaluateStickSlipMechanics("slip-", {
      effectiveInertia: 0.02,
      drivingTorque: 0.04,
      staticFrictionTorque: 0.03,
      kineticFrictionTorque: 0.02,
      viscousDamping: 0,
      omega: -0.1,
    }).acceleration).toBeCloseTo(3, 14);
    expect(restartStickSlipAfterStaticExit(stopped, -0.031, 0.03).mode).toBe("slip-");
    expect(() => restartStickSlipAfterStaticExit(stopped, 0.03, 0.03))
      .toThrow(/strictly left/);

    expect(selectModeAtRest(0, 0)).toBe("stick");
    expect(selectModeAtRest(1e-30, 0)).toBe("slip+");
    expect(selectInitialStickSlipMode(Number.MIN_VALUE, 0, 1)).toBe("slip+");
    const frictionless = evaluateStickSlipMechanics("slip+", {
      effectiveInertia: 0.02,
      drivingTorque: 1e-30,
      staticFrictionTorque: 0,
      kineticFrictionTorque: 0,
      viscousDamping: 0,
      omega: 0,
    });
    expect(frictionless.modeAdmissible).toBe(true);
    expect(frictionless.acceleration).toBeCloseTo(5e-29, 42);
  });

  it("continues the wake in stick and gamma0*theta can trigger breakaway", () => {
    const thetaStick = 0.2;
    const gamma0 = 0.3;
    const growth = 1;
    const staticTorque = 0.03;
    const exactBreakaway = Math.log(1.5);
    let state: StickSlipContinuousState = {
      theta: thetaStick,
      omega: 0,
      wakeReal: 0,
      wakeImaginary: 0.25,
    };
    let time = 0;
    let previousMargin = staticFrictionMargin(state.wakeReal, staticTorque);
    let locatedTime: number | null = null;

    while (time < 0.8 && locatedTime === null) {
      const stepSize = 0.02;
      const step = dormandPrince54Step(
        (_time, vector) => {
          const current = fromVector(vector);
          return toVector(evaluateStickSlipDerivative(
            "stick",
            current,
            {
              effectiveInertia: 0.02,
              drivingTorque: current.wakeReal,
              staticFrictionTorque: staticTorque,
              kineticFrictionTorque: 0.02,
              viscousDamping: 0,
            },
            (motion) => ({
              wakeReal: growth * motion.wakeReal + gamma0 * motion.theta,
              wakeImaginary: -0.4 * motion.wakeImaginary,
            }),
          ).derivative);
        },
        time,
        toVector(state),
        stepSize,
      );
      const next = fromVector(step.fifthOrder);
      const nextMargin = staticFrictionMargin(next.wakeReal, staticTorque);
      if (didExitStaticRegion(previousMargin, nextMargin)) {
        let low = 0;
        let high = 1;
        for (let index = 0; index < 70; index += 1) {
          const midpoint = 0.5 * (low + high);
          const midState = fromVector(step.denseState(midpoint));
          if (staticFrictionMargin(midState.wakeReal, staticTorque) >= 0) low = midpoint;
          else high = midpoint;
        }
        locatedTime = time + stepSize * 0.5 * (low + high);
      }
      state = next;
      time += stepSize;
      previousMargin = nextMargin;
    }

    expect(locatedTime).not.toBeNull();
    expect(locatedTime ?? Number.NaN).toBeCloseTo(exactBreakaway, 8);
    expect(state.theta).toBe(thetaStick);
    expect(state.omega).toBe(0);
    expect(state.wakeImaginary).toBeLessThan(0.25);

    const frozenOrMissingGammaMode: StickSlipMode = selectModeAtRest(0, staticTorque);
    expect(frozenOrMissingGammaMode).toBe("stick");
    if (process.env.SS_REPORT === "1") {
      console.info("SS_C3_WAKE", JSON.stringify({
        expectedBreakawayTime: exactBreakaway,
        locatedBreakawayTime: locatedTime,
        absoluteEventError: Math.abs((locatedTime ?? Number.NaN) - exactBreakaway),
        fixedTheta: state.theta,
        fixedOmega: state.omega,
        evolvedWakeImaginary: state.wakeImaginary,
      }));
    }
  });

  it("feeds the selected sliding acceleration into the gamma2 wake forcing", () => {
    const state: StickSlipContinuousState = {
      theta: 0.12,
      omega: -0.3,
      wakeReal: 0.4,
      wakeImaginary: -0.1,
    };
    let observedAcceleration = Number.NaN;
    const evaluated = evaluateStickSlipDerivative(
      "slip-",
      state,
      {
        effectiveInertia: 0.02,
        drivingTorque: 0.01,
        staticFrictionTorque: 0.03,
        kineticFrictionTorque: 0.02,
        viscousDamping: 0.04,
      },
      (motion) => {
        observedAcceleration = motion.acceleration;
        return {
          wakeReal: 0.5 * motion.theta + 2 * motion.omega + 3 * motion.acceleration,
          wakeImaginary: -4 * motion.acceleration,
        };
      },
    );

    // alpha_s=[T-c_b*omega-(-1)*tau_k]/J=(.01+.012+.02)/.02=2.1.
    expect(evaluated.mechanics.acceleration).toBeCloseTo(2.1, 14);
    expect(observedAcceleration).toBe(evaluated.mechanics.acceleration);
    expect(evaluated.derivative.wakeReal).toBeCloseTo(5.76, 14);
    expect(evaluated.derivative.wakeImaginary).toBeCloseTo(-8.4, 14);
    expect(evaluated.derivative.theta).toBe(state.omega);
  });

  it("rejects invalid constitutive data and never normalizes by a threshold", () => {
    expect(() => evaluateStickSlipMechanics("stick", {
      effectiveInertia: 0.02,
      drivingTorque: 0,
      staticFrictionTorque: 0.01,
      kineticFrictionTorque: 0.02,
      viscousDamping: 0,
      omega: 0,
    })).toThrow(/at least kinetic/);
    expect(() => evaluateStickSlipMechanics("stick", {
      effectiveInertia: 0,
      drivingTorque: 0,
      staticFrictionTorque: 0,
      kineticFrictionTorque: 0,
      viscousDamping: 0,
      omega: 0,
    })).toThrow(/positive/);
    expect(() => restartStickSlipAtRest(
      { omega: Number.MIN_VALUE },
      0,
      0,
    )).toThrow(/omega=0/);
  });
});
