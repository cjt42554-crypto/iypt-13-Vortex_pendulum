import type { SimulationConfig } from "../../core/types";
import {
  buoyancyTorque,
  evaluateWetGeometry,
  hydrostaticPotential,
  type WetGeometry,
} from "./geometry";

export interface MechanicalEvaluation {
  acceleration: number;
  wet: WetGeometry;
  dryInertia: number;
  addedInertia: number;
  addedInertiaDerivative: number;
  effectiveInertia: number;
  dynamicFluidTorque: number;
  buoyancyTorque: number;
  gravityTorque: number;
  elasticTorque: number;
  /** F12.4 torque excluding the complete bearing-friction law. */
  drivingTorque: number;
  axisFrictionTorque: number;
  christoffelTorque: number;
  kineticEnergy: number;
  gravitationalPotential: number;
  hydrostaticPotential: number;
  elasticPotential: number;
  mechanicalEnergy: number;
  dampingPower: number;
}

export interface AxisFrictionEvaluation {
  /** Torque applied to the body by the complete selected bearing law [N m]. */
  axisFrictionTorque: number;
  /** Non-negative mechanical dissipation rate of that bearing law [W]. */
  dampingPower: number;
}

function p0Geometry(config: SimulationConfig) {
  const { radius, topDistance, bottomDistance, pivotHeight } = config.geometry;
  return { radius, topDistance, bottomDistance, pivotHeight };
}

/** Sectional potential-flow candidate I_a=C_A rho integral(A_w r^2 dr). */
export function addedMomentOfInertia(
  config: SimulationConfig,
  theta: number,
  coefficient = config.rom.addedMassCoefficient,
): number {
  if (coefficient === 0) return 0;
  return coefficient
    * config.fluid.density
    * evaluateWetGeometry(theta, p0Geometry(config)).axialSecondMoment;
}

export function addedMomentDerivative(
  config: SimulationConfig,
  theta: number,
  coefficient = config.rom.addedMassCoefficient,
): number {
  if (coefficient === 0) return 0;
  const margin = Math.max(1e-6, config.geometry.maximumAngle - Math.abs(theta));
  const step = Math.min(1e-5, 0.2 * margin);
  if (!(step > 0)) return 0;
  return (
    addedMomentOfInertia(config, theta + step, coefficient)
    - addedMomentOfInertia(config, theta - step, coefficient)
  ) / (2 * step);
}

/**
 * Evaluate every mechanical term except the selectable bearing law.  Keeping
 * this balance explicit lets the SS branch replace the smooth law rather than
 * accidentally adding Coulomb terms on top of it.
 */
export function evaluateMechanicsWithoutAxisFriction(
  config: SimulationConfig,
  theta: number,
  omega: number,
  dynamicFluidTorque: number,
  addedMassCoefficient = config.rom.addedMassCoefficient,
): MechanicalEvaluation {
  const geometry = p0Geometry(config);
  const wet = evaluateWetGeometry(theta, geometry);
  const addedInertia = addedMomentOfInertia(config, theta, addedMassCoefficient);
  const addedInertiaDerivative = addedMomentDerivative(config, theta, addedMassCoefficient);
  const effectiveInertia = config.body.dryMomentOfInertia + addedInertia;
  if (!(effectiveInertia > 0) || !Number.isFinite(effectiveInertia)) {
    throw new RangeError("effective moment of inertia must remain finite and positive");
  }

  const buoyancy = buoyancyTorque(theta, geometry, config.fluid.density, config.fluid.gravity);
  const gravityTorque = -config.body.movingMass
    * config.fluid.gravity
    * config.body.centerOfMassDistance
    * Math.sin(theta);
  const offset = theta - config.support.referenceAngle;
  const elasticTorque = -config.support.linearStiffness * offset
    - config.support.cubicStiffness * offset ** 3;
  const christoffelTorque = 0.5 * addedInertiaDerivative * omega * omega;
  const drivingTorque = (
    dynamicFluidTorque
    + buoyancy
    + gravityTorque
    + elasticTorque
    - christoffelTorque
  );
  const acceleration = drivingTorque / effectiveInertia;

  const kineticEnergy = 0.5 * effectiveInertia * omega * omega;
  const gravitationalPotential = config.body.movingMass
    * config.fluid.gravity
    * config.body.centerOfMassDistance
    * (1 - Math.cos(theta));
  const hydroPotential = hydrostaticPotential(
    theta,
    geometry,
    config.fluid.density,
    config.fluid.gravity,
  );
  const elasticPotential = 0.5 * config.support.linearStiffness * offset * offset
    + 0.25 * config.support.cubicStiffness * offset ** 4;
  const mechanicalEnergy = kineticEnergy
    + gravitationalPotential
    + hydroPotential
    + elasticPotential;
  return {
    acceleration,
    wet,
    dryInertia: config.body.dryMomentOfInertia,
    addedInertia,
    addedInertiaDerivative,
    effectiveInertia,
    dynamicFluidTorque,
    buoyancyTorque: buoyancy,
    gravityTorque,
    elasticTorque,
    drivingTorque,
    axisFrictionTorque: 0,
    christoffelTorque,
    kineticEnergy,
    gravitationalPotential,
    hydrostaticPotential: hydroPotential,
    elasticPotential,
    mechanicalEnergy,
    dampingPower: 0,
  };
}

/** Apply one complete bearing law to a friction-free mechanical balance. */
export function applyAxisFriction(
  balance: MechanicalEvaluation,
  friction: AxisFrictionEvaluation,
): MechanicalEvaluation {
  if (!Number.isFinite(friction.axisFrictionTorque)) {
    throw new RangeError("axis friction torque must be finite");
  }
  if (!Number.isFinite(friction.dampingPower) || friction.dampingPower < 0) {
    throw new RangeError("axis friction dissipation must be finite and non-negative");
  }
  return {
    ...balance,
    acceleration: (balance.drivingTorque + friction.axisFrictionTorque)
      / balance.effectiveInertia,
    axisFrictionTorque: friction.axisFrictionTorque,
    dampingPower: friction.dampingPower,
  };
}

/** Baseline smooth-friction mechanics, retained unchanged for non-SS models. */
export function evaluateMechanics(
  config: SimulationConfig,
  theta: number,
  omega: number,
  dynamicFluidTorque: number,
  addedMassCoefficient = config.rom.addedMassCoefficient,
): MechanicalEvaluation {
  const balance = evaluateMechanicsWithoutAxisFriction(
    config,
    theta,
    omega,
    dynamicFluidTorque,
    addedMassCoefficient,
  );
  const smoothedSign = Math.tanh(omega / config.support.frictionSmoothingSpeed);
  return applyAxisFriction(balance, {
    axisFrictionTorque: -config.support.viscousDamping * omega
      - config.support.coulombFriction * smoothedSign,
    dampingPower: config.support.viscousDamping * omega * omega
      + config.support.coulombFriction * smoothedSign * omega,
  });
}
