import {
  deriveParameters,
  flowSpeedAt,
  flowSpeedDerivativeAt,
} from "../../core/config";
import {
  jointCalibrationMargin,
  wetContractIssues,
  type RuntimeDomainPoint,
} from "../../core/wet-domain";
import type {
  DerivedParameters,
  SimulationConfig,
  SimulationSample,
  TerminationCode,
} from "../../core/types";
import {
  cylinderMidpoint,
  cylinderSupport,
  evaluateWetGeometry,
  integrateWetProjection,
  type WetBranch,
} from "../../problems/vortex-pendulum/geometry";
import {
  evaluateMechanics,
  evaluateMechanicsWithoutAxisFriction,
  applyAxisFriction,
  type MechanicalEvaluation,
} from "../../problems/vortex-pendulum/mechanics";
import { isDirectionalDragModel, isStickSlipModel } from "../../core/forward-contract";
import { evaluateDirectionalDrag } from "../../problems/vortex-pendulum/directional-drag";
import { evaluateStickSlipMechanics, selectInitialStickSlipMode, type StickSlipMode } from "./stick-slip";

/** State X=(theta,omega,A_R,A_I) of VP-FWD-P0-SL1-v1. */
export interface ForwardState {
  theta: number;
  omega: number;
  wakeReal: number;
  wakeImaginary: number;
}

export type ForwardDerivative = ForwardState;

export interface ForwardEvaluation {
  frictionMode: StickSlipMode | "smooth";
  staticFrictionMargin: number | null;
  derivative: ForwardDerivative;
  domain: ForwardDomainEvaluation;
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
  /** Stable identity; several guards may share one public termination code. */
  id: string;
  code: Exclude<
    TerminationCode,
    "COMPLETED" | "MINIMUM-STEP" | "MAXIMUM-STEPS" | "USER-STOP"
  >;
  /** Positive inside the supported domain, zero at the event surface. */
  margin: number;
  /** `closed` accepts equality; `open` stops when the margin reaches zero. */
  boundary: "open" | "closed";
  /** Tie-break only after event times agree within the root tolerance. */
  priority: number;
  message: string;
}

export interface ForwardDomainEvaluation {
  strictWetContract: boolean;
  contractIssues: string[];
  projectedArea: number;
  wetSpan: number;
  wetBranch: WetBranch;
  flowSpeed: number;
  flowSpeedDerivative: number;
  wakeReferenceSpeed: number;
  reynolds: number;
  velocityRatio: number;
  normalizedInflowRate: number;
  jointCalibrationMargin: number | null;
  point: RuntimeDomainPoint;
}

/** A rejected RK stage carries the physical guard that made its RHS undefined. */
export class ForwardDomainViolation extends RangeError {
  constructor(
    readonly time: number,
    readonly state: ForwardState,
    readonly guard: ForwardGuard,
  ) {
    super(`${guard.code}: ${guard.message}`);
    this.name = "ForwardDomainViolation";
  }
}

const TWO_PI = 2 * Math.PI;
const INERTIA_RELATIVE_FLOOR = 1e-9;
const WET_GUARD_PRIORITY = 0;
const PHYSICAL_GUARD_PRIORITY = 10;
const CLOSURE_GUARD_PRIORITY = 20;

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

export function guardIsValid(guard: ForwardGuard): boolean {
  return guard.boundary === "closed" ? guard.margin >= 0 : guard.margin > 0;
}

export function evaluateForwardDomain(
  config: SimulationConfig,
  time: number,
  state: ForwardState,
  derived: DerivedParameters = deriveParameters(config),
): ForwardDomainEvaluation {
  if (!Number.isFinite(time) || !finiteState(state)) {
    throw new RangeError("forward domain evaluation requires a finite time and state");
  }
  const p0 = geometry(config);
  const wet = evaluateWetGeometry(state.theta, p0);
  const projectedArea = wet.streamwiseProjectedArea;
  const diameter = derived.cylinderDiameter;
  const wetSpan = projectedArea / diameter;
  const flowSpeed = flowSpeedAt(config, time);
  const flowSpeedDerivative = flowSpeedDerivativeAt(config, time);
  const wakeReferenceSpeed = projectedArea > 0 ? Math.abs(flowSpeed) : 0;
  const reynolds = wakeReferenceSpeed * diameter / config.fluid.kinematicViscosity;
  const omegaReference = derived.naturalAngularFrequency > 0
    ? derived.naturalAngularFrequency
    : 1 / config.rom.zeroFlowWakeDecayTime;
  const velocityRatio = config.geometry.bottomDistance * Math.abs(state.omega)
    / Math.max(wakeReferenceSpeed, config.rom.calibrationVelocityFloor);
  const normalizedInflowRate = Math.abs(flowSpeedDerivative)
    / (Math.max(wakeReferenceSpeed, config.rom.calibrationVelocityFloor) * omegaReference);
  const point: RuntimeDomainPoint = {
    flowSpeedMps: Math.abs(flowSpeed),
    waterDepthM: config.geometry.waterDepth,
    pivotHeightM: config.geometry.pivotHeight,
    reynolds,
    wetSpanM: wetSpan,
    absThetaRad: Math.abs(state.theta),
    velocityRatio,
    normalizedInflowRate,
  };
  const strictWetContract = (config.rom.wetSupportMode ?? "legacy-unqualified") !== "legacy-unqualified";
  const contractIssues = wetContractIssues(config.rom);
  const support = config.rom.jointCalibrationSupport;
  return {
    strictWetContract,
    contractIssues,
    projectedArea,
    wetSpan,
    wetBranch: wet.branch,
    flowSpeed,
    flowSpeedDerivative,
    wakeReferenceSpeed,
    reynolds,
    velocityRatio,
    normalizedInflowRate,
    jointCalibrationMargin: strictWetContract && support !== undefined
      ? jointCalibrationMargin(support, point)
      : null,
    point,
  };
}

function wetDomainGuards(config: SimulationConfig, domain: ForwardDomainEvaluation): ForwardGuard[] {
  if (!domain.strictWetContract) return [];
  if (domain.contractIssues.length > 0) return [{
    id: "wet-contract",
    code: "WET-COVERAGE-MISSING",
    margin: -1,
    boundary: "open",
    priority: WET_GUARD_PRIORITY,
    message: `湿区定量契约不完整：${domain.contractIssues.join("；")}`,
  }];
  const areaScale = Math.max(
    derivedWetAreaScale(config),
    Number.MIN_VALUE,
  );
  return [
    {
      id: "positive-wet-area",
      code: "WET-DOMAIN-EXIT",
      margin: domain.projectedArea / areaScale,
      boundary: "open",
      priority: WET_GUARD_PRIORITY,
      message: "湿投影面积到达零；正式四状态湿态预测在有效侧终止。",
    },
    {
      id: "minimum-calibrated-wet-span",
      code: "WET-DOMAIN-EXIT",
      margin: domain.wetSpan - (config.rom.calibrationMinWetSpan ?? Number.POSITIVE_INFINITY),
      boundary: "closed",
      priority: WET_GUARD_PRIORITY + 1,
      message: "实际湿跨低于系数包独立标定覆盖的闭下界。",
    },
    {
      id: "joint-calibration-support",
      code: "COEFFICIENT-OOD",
      margin: domain.jointCalibrationMargin ?? Number.NEGATIVE_INFINITY,
      boundary: "closed",
      priority: WET_GUARD_PRIORITY + 2,
      message: "运行工况离开有依据的八坐标联合标定单元。",
    },
  ];
}

function derivedWetAreaScale(config: SimulationConfig): number {
  return 2 * config.geometry.radius
    * (config.geometry.bottomDistance - config.geometry.topDistance);
}

export function firstInvalidForwardWetGuard(
  config: SimulationConfig,
  domain: ForwardDomainEvaluation,
): ForwardGuard | undefined {
  return wetDomainGuards(config, domain)
    .filter((guard) => !guardIsValid(guard))
    .sort((left, right) => left.priority - right.priority)[0];
}

/**
 * Piecewise-smooth physical right-hand side (the dry/wet wake switch is not
 * a calibrated re-entry law). No integration tolerances, time-step
 * logic, interpolation, or event root finding is permitted in this function.
 */
export function evaluateForward(
  config: SimulationConfig,
  time: number,
  state: ForwardState,
  derived: DerivedParameters = deriveParameters(config),
  selectedMode?: StickSlipMode,
): ForwardEvaluation {
  if (!Number.isFinite(time) || !finiteState(state)) {
    throw new RangeError("forward RHS requires a finite time and state");
  }
  const domain = evaluateForwardDomain(config, time, state, derived);
  const wetViolation = firstInvalidForwardWetGuard(config, domain);
  if (wetViolation !== undefined) {
    throw new ForwardDomainViolation(time, { ...state }, wetViolation);
  }
  const p0 = geometry(config);
  const { flowSpeed, flowSpeedDerivative, wakeReferenceSpeed, reynolds } = domain;
  const diameter = derived.cylinderDiameter;

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
  const dragTorque = isDirectionalDragModel(config) ? evaluateDirectionalDrag({
    theta: state.theta, omega: state.omega, geometry: p0,
    density: config.fluid.density, streamwiseSpeed: flowSpeed,
    dragCoefficient: config.rom.sectionalDragCoefficient,
  }).torque : -0.5
    * config.fluid.density
    * config.rom.sectionalDragCoefficient
    * state.omega
    * integrateWetProjection(state.theta, p0, (r) =>
      r * r * Math.hypot(flowSpeed, r * state.omega));

  // The baseline coefficient package has no independently calibrated C_M.
  const pitchingTorque = 0;
  const dynamicFluidTorque = liftTorque + dragTorque + pitchingTorque;
  let mechanics = (isStickSlipModel(config) ? evaluateMechanicsWithoutAxisFriction : evaluateMechanics)(
    config,
    state.theta,
    state.omega,
    dynamicFluidTorque,
  );
  let frictionMode: StickSlipMode | "smooth" = "smooth";
  let staticMargin: number | null = null;
  if (isStickSlipModel(config)) {
    const staticTorque = config.support.staticFrictionTorque!;
    frictionMode = selectedMode ?? selectInitialStickSlipMode(state.omega, mechanics.drivingTorque, staticTorque);
    const friction = evaluateStickSlipMechanics(frictionMode, {
      omega: state.omega, drivingTorque: mechanics.drivingTorque,
      effectiveInertia: mechanics.effectiveInertia,
      staticFrictionTorque: staticTorque,
      kineticFrictionTorque: config.support.kineticFrictionTorque!,
      viscousDamping: config.support.viscousDamping,
    });
    mechanics = applyAxisFriction(mechanics, friction);
    staticMargin = friction.staticFrictionMargin;
  }

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

  const { velocityRatio, normalizedInflowRate } = domain;

  return {
    frictionMode,
    staticFrictionMargin: staticMargin,
    derivative: {
      theta: frictionMode === "stick" ? 0 : state.omega,
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
    domain,
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
    id: "finite-input-state",
    code: "NONFINITE-STATE",
    margin: -1,
    boundary: "open",
    priority: PHYSICAL_GUARD_PRIORITY,
    message: "状态或时间出现 NaN/Inf。",
  }];
  let domain: ForwardDomainEvaluation;
  try {
    domain = evaluated?.domain ?? evaluateForwardDomain(config, time, state);
  } catch (error) {
    return [{
      id: "finite-domain-input",
      code: "NONFINITE-INPUT",
      margin: -1,
      boundary: "open",
      priority: PHYSICAL_GUARD_PRIORITY,
      message: error instanceof Error ? error.message : String(error),
    }];
  }
  let value = evaluated;
  if (value === undefined && firstInvalidForwardWetGuard(config, domain) === undefined) {
    try {
      value = evaluateForward(config, time, state);
    } catch {
      value = undefined;
    }
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
  let guardMechanics: MechanicalEvaluation | undefined = value?.mechanics;
  if (guardMechanics === undefined) {
    try {
      guardMechanics = evaluateMechanics(config, state.theta, state.omega, 0);
    } catch {
      guardMechanics = undefined;
    }
  }
  const finiteMargin = [
    guardMechanics?.effectiveInertia,
    domain.reynolds,
    domain.velocityRatio,
    domain.normalizedInflowRate,
    ...(value === undefined ? [] : [
      value.derivative.theta,
      value.derivative.omega,
      value.derivative.wakeReal,
      value.derivative.wakeImaginary,
    ]),
  ].every(Number.isFinite) ? 1 : -1;
  return [
    ...wetDomainGuards(config, domain),
    {
      id: "angle-limit",
      code: "ANGLE-LIMIT",
      margin: config.geometry.maximumAngle - Math.abs(state.theta),
      boundary: "open",
      priority: PHYSICAL_GUARD_PRIORITY,
      message: "摆角到达 P0 模型的机械/角域边界。",
    },
    {
      id: "solid-contact",
      code: "SOLID-CONTACT",
      margin: Math.min(sideGap, bottomGap),
      boundary: "open",
      priority: PHYSICAL_GUARD_PRIORITY + 1,
      message: "有限圆柱与水槽侧壁或槽底发生几何接触。",
    },
    {
      id: "inertia-positive",
      code: "INERTIA-SINGULAR",
      margin: (guardMechanics?.effectiveInertia ?? Number.NEGATIVE_INFINITY)
        - INERTIA_RELATIVE_FLOOR * config.body.dryMomentOfInertia,
      boundary: "open",
      priority: PHYSICAL_GUARD_PRIORITY + 2,
      message: "有效转动惯量到达正定性下限。",
    },
    {
      id: "legacy-calibration-envelope",
      code: "COEFFICIENT-OOD",
      margin: Math.min(
        domain.reynolds - calibration.calibrationMinReynolds,
        calibration.calibrationMaxReynolds - domain.reynolds,
        calibration.calibrationMaxAbsAngle - Math.abs(state.theta),
        calibration.calibrationMaxVelocityRatio - domain.velocityRatio,
      ),
      boundary: "closed",
      priority: CLOSURE_GUARD_PRIORITY,
      message: "Re、摆角或体动速度比离开当前系数包标定闭包。",
    },
    {
      id: "cubic-saturation",
      code: "CUBIC-NONSATURATING",
      margin: calibration.cubicSaturation,
      boundary: "open",
      priority: CLOSURE_GUARD_PRIORITY + 1,
      message: "SL 立方实部不再提供饱和，且未声明五次闭合。",
    },
    {
      id: "normalized-inflow-rate",
      code: "RAPID-INFLOW",
      margin: calibration.calibrationMaxNormalizedInflowRate - domain.normalizedInflowRate,
      boundary: "closed",
      priority: CLOSURE_GUARD_PRIORITY + 2,
      message: "来流变化率离开当前系数包标定闭包。",
    },
    {
      id: "finite-right-hand-side",
      code: "NONFINITE-STATE",
      margin: finiteMargin,
      boundary: "open",
      priority: PHYSICAL_GUARD_PRIORITY + 3,
      message: "物理右端产生 NaN/Inf。",
    },
  ];
}

export function forwardSample(
  config: SimulationConfig,
  time: number,
  state: ForwardState,
  derived: DerivedParameters = deriveParameters(config),
  selectedMode?: StickSlipMode,
): SimulationSample {
  const evaluated = evaluateForward(config, time, state, derived, selectedMode);
  const { mechanics } = evaluated;
  const observationRadius = config.geometry.observationDistance;
  const wakeAmplitude = Math.hypot(state.wakeReal, state.wakeImaginary);
  return {
    time,
    frictionMode: evaluated.frictionMode,
    axisFrictionTorque: mechanics.axisFrictionTorque,
    staticFrictionMargin: evaluated.staticFrictionMargin,
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
    valid: firstInvalidForwardWetGuard(config, evaluated.domain) === undefined,
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
