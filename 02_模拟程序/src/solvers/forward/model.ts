import {
  deriveParameters,
  flowSpeedAt,
  flowSpeedDerivativeAt,
} from "../../core/config";
import type {
  DerivedParameters,
  SimulationConfig,
  SimulationSample,
  TerminationCode,
} from "../../core/types";
import {
  cylinderMidpoint,
  cylinderSupport,
  integrateWetProjection,
} from "../../problems/vortex-pendulum/geometry";
import {
  evaluateMechanics,
  type MechanicalEvaluation,
} from "../../problems/vortex-pendulum/mechanics";

/** State X=(theta,omega,A_R,A_I) of VP-FWD-P0-SL1-v1. */
export interface ForwardState {
  theta: number;
  omega: number;
  wakeReal: number;
  wakeImaginary: number;
}

export type ForwardDerivative = ForwardState;

export interface ForwardEvaluation {
  derivative: ForwardDerivative;
  mechanics: MechanicalEvaluation;
  flowSpeed: number;
  flowSpeedDerivative: number;
  wakeReferenceSpeed: number;
  reynolds: number;
  velocityRatio: number;
  normalizedInflowRate: number;
  sheddingAngularFrequency: number;
  wakeGrowthRate: number;
  wakeCubicReal: number;
  wakeCubicImaginary: number;
  wakeActivation: number;
  liftCoefficient: number;
  dragCoefficient: number;
  liftTorque: number;
  dragTorque: number;
  pitchingTorque: number;
  dynamicFluidTorque: number;
}

export interface ForwardGuard {
  code: Exclude<
    TerminationCode,
    "COMPLETED" | "MINIMUM-STEP" | "MAXIMUM-STEPS" | "USER-STOP"
  >;
  /** Positive inside the supported domain, zero at the event surface. */
  margin: number;
  message: string;
}

const TWO_PI = 2 * Math.PI;
const INERTIA_RELATIVE_FLOOR = 1e-9;

function geometry(config: SimulationConfig) {
  const { radius, topDistance, bottomDistance, pivotHeight } = config.geometry;
  return { radius, topDistance, bottomDistance, pivotHeight };
}

function finiteState(state: ForwardState): boolean {
  return Number.isFinite(state.theta)
    && Number.isFinite(state.omega)
    && Number.isFinite(state.wakeReal)
    && Number.isFinite(state.wakeImaginary);
}

function multiplyComplex(
  leftReal: number,
  leftImaginary: number,
  scalar: number,
): { real: number; imaginary: number } {
  return { real: leftReal * scalar, imaginary: leftImaginary * scalar };
}

/**
 * Continuous physical right-hand side.  No integration tolerances, time-step
 * logic, interpolation, or event root finding is permitted in this function.
 */
export function evaluateForward(
  config: SimulationConfig,
  time: number,
  state: ForwardState,
  derived: DerivedParameters = deriveParameters(config),
): ForwardEvaluation {
  if (!Number.isFinite(time) || !finiteState(state)) {
    throw new RangeError("forward RHS requires a finite time and state");
  }
  const p0 = geometry(config);
  const flowSpeed = flowSpeedAt(config, time);
  const flowSpeedDerivative = flowSpeedDerivativeAt(config, time);
  const projectedArea = integrateWetProjection(state.theta, p0, () => 1);
  const wakeReferenceSpeed = projectedArea > 1e-15 ? flowSpeed : 0;
  const diameter = derived.cylinderDiameter;
  const reynolds = wakeReferenceSpeed * diameter / config.fluid.kinematicViscosity;

  const activationScale = config.rom.wakeActivationSpeed;
  const wakeActivation = wakeReferenceSpeed ** 2
    / (wakeReferenceSpeed ** 2 + activationScale ** 2);
  const sheddingAngularFrequency = diameter > 0
    ? TWO_PI * config.rom.strouhalNumber * wakeReferenceSpeed / diameter
    : 0;
  const activeGrowth = sheddingAngularFrequency
    * config.rom.hopfGrowthSlope
    * (reynolds / config.rom.referenceHopfReynolds - 1);
  const wakeGrowthRate = wakeActivation * activeGrowth
    - (1 - wakeActivation) / config.rom.zeroFlowWakeDecayTime;
  const wakeCubicReal = wakeActivation
    * config.rom.cubicSaturation
    * sheddingAngularFrequency;
  const wakeCubicImaginary = wakeActivation
    * config.rom.nonlinearFrequencyShift
    * sheddingAngularFrequency;

  const liftCoefficient = config.rom.finiteSpanCoherence * (
    config.rom.liftOutputReal * state.wakeReal
    - config.rom.liftOutputImaginary * state.wakeImaginary
  );
  const liftTorque = wakeReferenceSpeed > 0
    ? 0.5
      * config.fluid.density
      * wakeReferenceSpeed ** 2
      * liftCoefficient
      * integrateWetProjection(state.theta, p0, (r) => {
        const relativeSpeed = Math.hypot(wakeReferenceSpeed, r * state.omega);
        return relativeSpeed > 0 ? r * wakeReferenceSpeed / relativeSpeed : 0;
      })
    : 0;
  const dragTorque = -0.5
    * config.fluid.density
    * config.rom.sectionalDragCoefficient
    * state.omega
    * integrateWetProjection(state.theta, p0, (r) =>
      r * r * Math.hypot(flowSpeed, r * state.omega));

  // The baseline coefficient package has no independently calibrated C_M.
  const pitchingTorque = 0;
  const dynamicFluidTorque = liftTorque + dragTorque + pitchingTorque;
  const mechanics = evaluateMechanics(
    config,
    state.theta,
    state.omega,
    dynamicFluidTorque,
  );

  const omegaReference = derived.naturalAngularFrequency > 0
    ? derived.naturalAngularFrequency
    : 1 / config.rom.zeroFlowWakeDecayTime;
  const gamma0Real = wakeActivation * config.rom.couplingThetaReal * omegaReference;
  const gamma0Imaginary = wakeActivation * config.rom.couplingThetaImaginary * omegaReference;
  const gamma1Real = wakeActivation * config.rom.couplingOmegaReal;
  const gamma1Imaginary = wakeActivation * config.rom.couplingOmegaImaginary;
  const gamma2Real = wakeActivation * config.rom.couplingAccelerationReal / omegaReference;
  const gamma2Imaginary = wakeActivation * config.rom.couplingAccelerationImaginary / omegaReference;
  const thetaForcing = multiplyComplex(gamma0Real, gamma0Imaginary, state.theta);
  const omegaForcing = multiplyComplex(gamma1Real, gamma1Imaginary, state.omega);
  const accelerationForcing = multiplyComplex(
    gamma2Real,
    gamma2Imaginary,
    mechanics.acceleration,
  );
  const forcingReal = thetaForcing.real + omegaForcing.real + accelerationForcing.real;
  const forcingImaginary = thetaForcing.imaginary
    + omegaForcing.imaginary
    + accelerationForcing.imaginary;
  const wakeMagnitudeSquared = state.wakeReal ** 2 + state.wakeImaginary ** 2;

  const velocityRatio = config.geometry.bottomDistance * Math.abs(state.omega)
    / Math.max(wakeReferenceSpeed, config.rom.calibrationVelocityFloor);
  const normalizedInflowRate = Math.abs(flowSpeedDerivative)
    / (Math.max(wakeReferenceSpeed, config.rom.calibrationVelocityFloor) * omegaReference);

  return {
    derivative: {
      theta: state.omega,
      omega: mechanics.acceleration,
      wakeReal: wakeGrowthRate * state.wakeReal
        - sheddingAngularFrequency * state.wakeImaginary
        - wakeCubicReal * wakeMagnitudeSquared * state.wakeReal
        + wakeCubicImaginary * wakeMagnitudeSquared * state.wakeImaginary
        + forcingReal,
      wakeImaginary: sheddingAngularFrequency * state.wakeReal
        + wakeGrowthRate * state.wakeImaginary
        - wakeCubicReal * wakeMagnitudeSquared * state.wakeImaginary
        - wakeCubicImaginary * wakeMagnitudeSquared * state.wakeReal
        + forcingImaginary,
    },
    mechanics,
    flowSpeed,
    flowSpeedDerivative,
    wakeReferenceSpeed,
    reynolds,
    velocityRatio,
    normalizedInflowRate,
    sheddingAngularFrequency,
    wakeGrowthRate,
    wakeCubicReal,
    wakeCubicImaginary,
    wakeActivation,
    liftCoefficient,
    dragCoefficient: config.rom.sectionalDragCoefficient,
    liftTorque,
    dragTorque,
    pitchingTorque,
    dynamicFluidTorque,
  };
}

/** All executable terminal guards of the phase-1 model. */
export function evaluateForwardGuards(
  config: SimulationConfig,
  time: number,
  state: ForwardState,
  evaluated?: ForwardEvaluation,
): ForwardGuard[] {
  if (!Number.isFinite(time) || !finiteState(state)) return [{
    code: "NONFINITE-STATE",
    margin: -1,
    message: "状态或时间出现 NaN/Inf。",
  }];
  let value: ForwardEvaluation;
  try {
    value = evaluated ?? evaluateForward(config, time, state);
  } catch (error) {
    return [{
      code: "NONFINITE-INPUT",
      margin: -1,
      message: error instanceof Error ? error.message : String(error),
    }];
  }
  const p0 = geometry(config);
  const midpoint = cylinderMidpoint(state.theta, p0);
  const lateralExtent = cylinderSupport({ x: 0, y: 1, z: 0 }, state.theta, p0);
  const verticalExtent = cylinderSupport({ x: 0, y: 0, z: 1 }, state.theta, p0);
  const sideGap = 0.5 * config.geometry.channelWidth
    - Math.abs(midpoint.y)
    - lateralExtent;
  const bottomGap = config.geometry.waterDepth
    + config.geometry.pivotHeight
    + midpoint.z
    - verticalExtent;
  const calibration = config.rom;
  const finiteMargin = [
    value.mechanics.effectiveInertia,
    value.reynolds,
    value.velocityRatio,
    value.normalizedInflowRate,
    value.derivative.theta,
    value.derivative.omega,
    value.derivative.wakeReal,
    value.derivative.wakeImaginary,
  ].every(Number.isFinite) ? 1 : -1;
  return [
    {
      code: "ANGLE-LIMIT",
      margin: config.geometry.maximumAngle - Math.abs(state.theta),
      message: "摆角到达 P0 模型的机械/角域边界。",
    },
    {
      code: "SOLID-CONTACT",
      margin: Math.min(sideGap, bottomGap),
      message: "有限圆柱与水槽侧壁或槽底发生几何接触。",
    },
    {
      code: "INERTIA-SINGULAR",
      margin: value.mechanics.effectiveInertia
        - INERTIA_RELATIVE_FLOOR * config.body.dryMomentOfInertia,
      message: "有效转动惯量到达正定性下限。",
    },
    {
      code: "COEFFICIENT-OOD",
      margin: Math.min(
        value.reynolds - calibration.calibrationMinReynolds,
        calibration.calibrationMaxReynolds - value.reynolds,
        calibration.calibrationMaxAbsAngle - Math.abs(state.theta),
        calibration.calibrationMaxVelocityRatio - value.velocityRatio,
      ),
      message: "Re、摆角或体动速度比离开当前系数包标定闭包。",
    },
    {
      code: "CUBIC-NONSATURATING",
      margin: calibration.cubicSaturation,
      message: "SL 立方实部不再提供饱和，且未声明五次闭合。",
    },
    {
      code: "RAPID-INFLOW",
      margin: calibration.calibrationMaxNormalizedInflowRate - value.normalizedInflowRate,
      message: "来流变化率离开当前系数包标定闭包。",
    },
    {
      code: "NONFINITE-STATE",
      margin: finiteMargin,
      message: "物理右端产生 NaN/Inf。",
    },
  ];
}

export function forwardSample(
  config: SimulationConfig,
  time: number,
  state: ForwardState,
  derived: DerivedParameters = deriveParameters(config),
): SimulationSample {
  const evaluated = evaluateForward(config, time, state, derived);
  const { mechanics } = evaluated;
  const observationRadius = config.geometry.observationDistance;
  const wakeAmplitude = Math.hypot(state.wakeReal, state.wakeImaginary);
  return {
    time,
    theta: state.theta,
    omega: state.omega,
    angularAcceleration: mechanics.acceleration,
    observationRadius,
    displacement: observationRadius * Math.sin(state.theta),
    velocity: observationRadius * Math.cos(state.theta) * state.omega,
    wakeReal: state.wakeReal,
    wakeImaginary: state.wakeImaginary,
    wakeAmplitude,
    wakePhase: wakeAmplitude > 1e-14 ? Math.atan2(state.wakeImaginary, state.wakeReal) : null,
    liftCoefficient: evaluated.liftCoefficient,
    dragCoefficient: evaluated.dragCoefficient,
    liftTorque: evaluated.liftTorque,
    dragTorque: evaluated.dragTorque,
    pitchingTorque: evaluated.pitchingTorque,
    fluidTorque: evaluated.dynamicFluidTorque,
    buoyancyTorque: mechanics.buoyancyTorque,
    controlTorque: 0,
    sectionalLift: null,
    sectionalDrag: null,
    lineForceX: null,
    lineForceY: null,
    linePower2d: null,
    stripTorqueDensity: null,
    stressLineForceX: null,
    stressLineForceY: null,
    forcePathRelativeDifference: null,
    interfaceExchange: null,
    fluidPower: evaluated.dynamicFluidTorque * state.omega,
    dampingPower: mechanics.dampingPower,
    controlPower: 0,
    kineticEnergy: mechanics.kineticEnergy,
    gravitationalPotential: mechanics.gravitationalPotential,
    hydrostaticPotential: mechanics.hydrostaticPotential,
    elasticPotential: mechanics.elasticPotential,
    mechanicalEnergy: mechanics.mechanicalEnergy,
    effectiveInertia: mechanics.effectiveInertia,
    addedInertia: mechanics.addedInertia,
    displacedVolume: mechanics.wet.displacedVolume,
    projectedWetArea: mechanics.wet.streamwiseProjectedArea,
    axisWetLength: mechanics.wet.axisWetLength,
    volumeEquivalentWetLength: mechanics.wet.volumeEquivalentLength,
    flowSpeed: evaluated.flowSpeed,
    reynolds: evaluated.reynolds,
    wetBranch: mechanics.wet.branch,
  };
}

/** Flat vector conversion kept here so future theory revisions remain local. */
export function stateToVector(state: ForwardState): number[] {
  return [state.theta, state.omega, state.wakeReal, state.wakeImaginary];
}

export function vectorToState(vector: readonly number[]): ForwardState {
  if (vector.length !== 4) throw new RangeError("forward state vector must have four components");
  return {
    theta: vector[0] ?? Number.NaN,
    omega: vector[1] ?? Number.NaN,
    wakeReal: vector[2] ?? Number.NaN,
    wakeImaginary: vector[3] ?? Number.NaN,
  };
}
