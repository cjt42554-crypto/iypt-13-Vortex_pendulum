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
  axisFrictionTorque: number;
  christoffelTorque: number;
  kineticEnergy: number;
  gravitationalPotential: number;
  hydrostaticPotential: number;
  elasticPotential: number;
  mechanicalEnergy: number;
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

export function evaluateMechanics(
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
  const smoothedSign = Math.tanh(omega / config.support.frictionSmoothingSpeed);
  const axisFrictionTorque = -config.support.viscousDamping * omega
    - config.support.coulombFriction * smoothedSign;
  const christoffelTorque = 0.5 * addedInertiaDerivative * omega * omega;
  const acceleration = (
    dynamicFluidTorque
    + buoyancy
    + gravityTorque
    + elasticTorque
    + axisFrictionTorque
    - christoffelTorque
  ) / effectiveInertia;

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
  const dampingPower = config.support.viscousDamping * omega * omega
    + config.support.coulombFriction * smoothedSign * omega;

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
    axisFrictionTorque,
    christoffelTorque,
    kineticEnergy,
    gravitationalPotential,
    hydrostaticPotential: hydroPotential,
    elasticPotential,
    mechanicalEnergy,
    dampingPower,
  };
}
