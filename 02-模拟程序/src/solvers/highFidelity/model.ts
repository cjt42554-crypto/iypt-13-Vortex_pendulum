import {
  deriveParameters,
  flowSpeedAt,
  hashConfig,
} from "../../core/config";
import type {
  Cfd2dAppliedRawExchange,
  Cfd2dCumulativeExchange,
  FieldFrame,
  SimulationConfig,
  SimulationSample,
} from "../../core/types";
import {
  evaluateWetGeometry,
  integrateWetProjection,
  type P0CylinderGeometry,
} from "../../problems/vortex-pendulum/geometry";
import { evaluateMechanics } from "../../problems/vortex-pendulum/mechanics";
import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED,
  type LbmBodyKinematics,
  type LbmCheckpoint,
  type LbmInspection,
  type BrinkmanStepExchange,
} from "./lbm";
import { A1_FORCE_CONTRACT_ID } from "../../core/provenance";

const TWO_PI = 2 * Math.PI;

export interface ResolvedLatticeMapping {
  diameter: number;
  dx: number;
  dt: number;
  totalSteps: number;
  targetLatticeVelocity: number;
  resolvedLatticeVelocity: number;
  relaxationTime: number;
  shearRelaxationRate: number;
  kinematicViscosityLattice: number;
  latticeMach: number;
  velocityScale: number;
  vorticityScale: number;
  lineForceScale: number;
  domainLength: number;
  domainWidth: number;
}

export interface HighFidelityCheckpoint {
  format: "VP-HF-CFD2D-CHECKPOINT-v1";
  modelId: "VP-HF-CFD2D-v1";
  configHash: string;
  latticeStep: number;
  theta: number;
  omega: number;
  angularAcceleration: number;
  cumulativeBoundaryMassInput: number;
  lbm: LbmCheckpoint;
  /** Optional A1 accounting extension; old v1 checkpoints remain readable. */
  a1Accounting?: {
    format: "VP-CFD2D-A1-ACCOUNTING-CHECKPOINT-v1";
    lastApplied: Cfd2dAppliedRawExchange | null;
    cumulative: Cfd2dCumulativeExchange;
    maximumAlgebraicResidual: number;
    maximumAlgebraicRelativeResidual: number;
  };
}

export interface HighFidelityAdvance {
  exchange: Cfd2dAppliedRawExchange;
  sample?: SimulationSample;
  field?: FieldFrame;
  inspection?: LbmInspection;
}

function geometryOf(config: SimulationConfig): P0CylinderGeometry {
  const { radius, topDistance, bottomDistance, pivotHeight } = config.geometry;
  return { radius, topDistance, bottomDistance, pivotHeight };
}

export function resolveLatticeMapping(config: SimulationConfig): ResolvedLatticeMapping {
  const diameter = 2 * config.geometry.radius;
  const dx = diameter / config.cfd2d.cylinderCells;
  if (!(config.fluid.flowSpeed > 0) || !(dx > 0)) {
    throw new RangeError("positive flow speed and cylinder diameter are required for SI/lattice mapping");
  }
  const nominalDt = config.cfd2d.latticeVelocity * dx / config.fluid.flowSpeed;
  const totalSteps = Math.max(1, Math.ceil(config.solver.duration / nominalDt));
  const dt = config.solver.duration / totalSteps;
  const resolvedLatticeVelocity = config.fluid.flowSpeed * dt / dx;
  const kinematicViscosityLattice = config.fluid.kinematicViscosity * dt / (dx * dx);
  const relaxationTime = 0.5 + 3 * kinematicViscosityLattice;
  const velocityScale = dx / dt;
  return {
    diameter,
    dx,
    dt,
    totalSteps,
    targetLatticeVelocity: config.cfd2d.latticeVelocity,
    resolvedLatticeVelocity,
    relaxationTime,
    shearRelaxationRate: 1 / relaxationTime,
    kinematicViscosityLattice,
    latticeMach: resolvedLatticeVelocity / LATTICE_SOUND_SPEED,
    velocityScale,
    vorticityScale: 1 / dt,
    // In 2-D a summed lattice body force maps to force per unit physical span.
    lineForceScale: config.fluid.density * dx ** 3 / dt ** 2,
    domainLength: config.cfd2d.nx * dx,
    domainWidth: config.cfd2d.ny * dx,
  };
}

function gridPhaseFromSeed(seed: number): number {
  // The physical domain is periodic in y, so a sub-cell translation is only a
  // declared grid-phase choice.  It also avoids preserving an artificial exact
  // mirror symmetry forever in a deterministic fixed-cylinder run.
  const mixed = Math.imul((seed ^ 0x9e3779b9) >>> 0, 0x85ebca6b) >>> 0;
  return (mixed / 0xffff_ffff - 0.5) * 0.5;
}

function relativeDifference(
  firstX: number,
  firstY: number,
  secondX: number,
  secondY: number,
): number {
  return Math.hypot(firstX - secondX, firstY - secondY)
    / Math.max(Math.hypot(firstX, firstY), Math.hypot(secondX, secondY), 1e-30);
}

export class HighFidelitySimulation {
  readonly config: SimulationConfig;
  readonly mapping: ResolvedLatticeMapping;
  readonly solver: D2Q9MrtBrinkmanSolver;
  readonly cylinderX: number;
  readonly baseCylinderY: number;

  private thetaState: number;
  private omegaState: number;
  private accelerationState = 0;
  private accumulatedBoundaryMass = 0;
  private lastAppliedExchange: Cfd2dAppliedRawExchange | null = null;
  private cumulativeExchange: Cfd2dCumulativeExchange = {
    cumulativeAppliedRawLineWork: 0,
    cumulativeAppliedRawWork: 0,
    cumulativeBrinkmanFluidWork: 0,
    cumulativeRawSolidReactionWork: 0,
    cumulativeBrinkmanPenaltyDissipation: 0,
    cumulativeBrinkmanAlgebraicResidual: 0,
  };
  private maximumAlgebraicResidual = 0;
  private maximumAlgebraicRelativeResidual = 0;

  constructor(config: SimulationConfig, checkpoint?: HighFidelityCheckpoint) {
    this.config = structuredClone(config);
    this.mapping = resolveLatticeMapping(config);
    this.solver = new D2Q9MrtBrinkmanSolver({
      nx: config.cfd2d.nx,
      ny: config.cfd2d.ny,
      relaxationTime: this.mapping.relaxationTime,
      penalizationTimeSteps: config.cfd2d.penalizationTimeSteps,
      outerBoundary: "open-periodic-crossflow",
      maskHalfThickness: 0.75,
    });
    const upstreamDiameters = Math.max(3, Math.min(5, config.cfd2d.nx / config.cfd2d.cylinderCells - 7));
    this.cylinderX = upstreamDiameters * config.cfd2d.cylinderCells;
    this.baseCylinderY = 0.5 * (config.cfd2d.ny - 1) + gridPhaseFromSeed(config.initial.randomSeed);
    this.thetaState = config.initial.theta;
    this.omegaState = config.initial.omega;
    if (checkpoint !== undefined) this.restore(checkpoint);
  }

  get latticeStep(): number {
    return this.solver.stepNumber;
  }

  get time(): number {
    return this.latticeStep * this.mapping.dt;
  }

  get finished(): boolean {
    return this.latticeStep >= this.mapping.totalSteps;
  }

  motionAt(time: number): { theta: number; omega: number; acceleration: number } {
    switch (this.config.cfd2d.couplingMode) {
      case "fixed":
        return { theta: 0, omega: 0, acceleration: 0 };
      case "prescribed": {
        const frequency = TWO_PI * this.config.cfd2d.prescribedFrequency;
        const phase = frequency * time;
        const amplitude = this.config.cfd2d.prescribedAmplitude;
        return {
          theta: amplitude * Math.sin(phase),
          omega: amplitude * frequency * Math.cos(phase),
          acceleration: -amplitude * frequency * frequency * Math.sin(phase),
        };
      }
      case "weak-fsi":
        return {
          theta: this.thetaState,
          omega: this.omegaState,
          acceleration: this.accelerationState,
        };
    }
  }

  bodyAt(time: number): LbmBodyKinematics {
    const motion = this.motionAt(time);
    const stripRadius = this.config.cfd2d.stripAxialCoordinate;
    return {
      centerX: this.cylinderX,
      centerY: this.baseCylinderY + stripRadius * Math.sin(motion.theta) / this.mapping.dx,
      radius: 0.5 * this.config.cfd2d.cylinderCells,
      velocityX: 0,
      velocityY: stripRadius * Math.cos(motion.theta) * motion.omega / this.mapping.velocityScale,
    };
  }

  cylinderHasDomainClearance(time = this.time): boolean {
    const body = this.bodyAt(time);
    const margin = body.radius + 2 * this.solver.maskHalfThickness + 2;
    return body.centerX > margin
      && body.centerX < this.config.cfd2d.nx - margin
      && body.centerY > margin
      && body.centerY < this.config.cfd2d.ny - margin;
  }

  checkpoint(): HighFidelityCheckpoint {
    return {
      format: "VP-HF-CFD2D-CHECKPOINT-v1",
      modelId: "VP-HF-CFD2D-v1",
      configHash: hashConfig(this.config),
      latticeStep: this.latticeStep,
      theta: this.thetaState,
      omega: this.omegaState,
      angularAcceleration: this.accelerationState,
      cumulativeBoundaryMassInput: this.accumulatedBoundaryMass,
      lbm: this.solver.checkpoint(),
      a1Accounting: {
        format: "VP-CFD2D-A1-ACCOUNTING-CHECKPOINT-v1",
        lastApplied: this.lastAppliedExchange === null
          ? null
          : structuredClone(this.lastAppliedExchange),
        cumulative: structuredClone(this.cumulativeExchange),
        maximumAlgebraicResidual: this.maximumAlgebraicResidual,
        maximumAlgebraicRelativeResidual: this.maximumAlgebraicRelativeResidual,
      },
    };
  }

  restore(checkpoint: HighFidelityCheckpoint): void {
    if (checkpoint.format !== "VP-HF-CFD2D-CHECKPOINT-v1"
      || checkpoint.modelId !== "VP-HF-CFD2D-v1") {
      throw new Error("unsupported high-fidelity checkpoint format/model");
    }
    if (checkpoint.configHash !== hashConfig(this.config)) {
      throw new Error("checkpoint config hash does not match the requested run");
    }
    this.solver.restore(checkpoint.lbm);
    if (checkpoint.latticeStep !== this.solver.stepNumber) {
      throw new Error("checkpoint lattice-step metadata is inconsistent");
    }
    this.thetaState = checkpoint.theta;
    this.omegaState = checkpoint.omega;
    this.accelerationState = checkpoint.angularAcceleration;
    this.accumulatedBoundaryMass = checkpoint.cumulativeBoundaryMassInput;
    if (checkpoint.a1Accounting !== undefined) {
      if (checkpoint.a1Accounting.format !== "VP-CFD2D-A1-ACCOUNTING-CHECKPOINT-v1") {
        throw new Error("unsupported A1 accounting checkpoint format");
      }
      this.lastAppliedExchange = checkpoint.a1Accounting.lastApplied === null
        ? null
        : structuredClone(checkpoint.a1Accounting.lastApplied);
      this.cumulativeExchange = structuredClone(checkpoint.a1Accounting.cumulative);
      this.maximumAlgebraicResidual = checkpoint.a1Accounting.maximumAlgebraicResidual;
      this.maximumAlgebraicRelativeResidual = checkpoint.a1Accounting.maximumAlgebraicRelativeResidual;
    } else {
      this.lastAppliedExchange = null;
      this.cumulativeExchange = {
        cumulativeAppliedRawLineWork: 0,
        cumulativeAppliedRawWork: 0,
        cumulativeBrinkmanFluidWork: 0,
        cumulativeRawSolidReactionWork: 0,
        cumulativeBrinkmanPenaltyDissipation: 0,
        cumulativeBrinkmanAlgebraicResidual: 0,
      };
      this.maximumAlgebraicResidual = 0;
      this.maximumAlgebraicRelativeResidual = 0;
    }
  }

  /**
   * Advance exactly one lattice step.  `capture` controls expensive contour
   * and field diagnostics; the native penalty load needed by weak coupling is
   * evaluated every step independently of output cadence.
   */
  advanceOne(captureSample = false, captureField = false): HighFidelityAdvance {
    if (this.finished) throw new RangeError("the requested SI duration is already complete");
    const startTime = this.time;
    const midpoint = startTime + 0.5 * this.mapping.dt;
    const midpointMotion = this.motionAt(midpoint);
    const body = this.bodyAt(midpoint);
    const reaction = this.solver.penaltyReaction(body);
    this.accumulatedBoundaryMass += this.solver.boundaryMassFlux(body).netInput;
    const lineForceY = reaction.y * this.mapping.lineForceScale;
    if (this.config.cfd2d.couplingMode === "weak-fsi") {
      const torque = this.replicatedStripTorque(lineForceY, this.thetaState);
      const mechanics = evaluateMechanics(
        this.config,
        this.thetaState,
        this.omegaState,
        torque,
        0,
      );
      this.accelerationState = mechanics.acceleration;
    }

    const inletPhysical = flowSpeedAt(this.config, midpoint);
    const inletLattice = inletPhysical / this.mapping.velocityScale;
    const latticeExchange = this.solver.step(body, inletLattice);
    if (latticeExchange.rawReactionImpulseX !== reaction.x
      || latticeExchange.rawReactionImpulseY !== reaction.y) {
      throw new Error("STOP-A1-APPLIED-REACTION-MISMATCH: recorded Guo impulse differs from legacy applied reaction");
    }
    const exchange = this.mapAppliedExchange(
      startTime,
      midpoint,
      midpointMotion.theta,
      midpointMotion.omega,
      latticeExchange,
    );
    this.lastAppliedExchange = exchange;
    this.accumulateExchange(exchange, latticeExchange.absoluteWorkScale);

    if (this.config.cfd2d.couplingMode === "weak-fsi") {
      // Explicit/symplectic weak coupling: intentionally labelled exploratory.
      this.omegaState += this.accelerationState * this.mapping.dt;
      this.thetaState += this.omegaState * this.mapping.dt;
    }

    const output: HighFidelityAdvance = { exchange };
    let inspection: LbmInspection | undefined;
    if (captureSample || captureField) {
      inspection = this.solver.inspect(this.bodyAt(this.time));
      output.inspection = inspection;
    }
    if (captureSample && inspection !== undefined) output.sample = this.makeSample(inspection);
    if (captureField) output.field = this.makeField();
    return output;
  }

  inspect(): LbmInspection {
    return this.solver.inspect(this.bodyAt(this.time));
  }

  get cumulativeBoundaryMassInput(): number {
    return this.accumulatedBoundaryMass;
  }

  get cumulativeInterfaceExchange(): Cfd2dCumulativeExchange {
    return structuredClone(this.cumulativeExchange);
  }

  get maximumBrinkmanAlgebraicResidual(): number {
    return this.maximumAlgebraicResidual;
  }

  get maximumBrinkmanAlgebraicRelativeResidual(): number {
    return this.maximumAlgebraicRelativeResidual;
  }

  makeSample(inspection: LbmInspection = this.inspect()): SimulationSample {
    const time = this.time;
    const motion = this.motionAt(time);
    const lineForceX = inspection.penaltyForceX * this.mapping.lineForceScale;
    const lineForceY = inspection.penaltyForceY * this.mapping.lineForceScale;
    const stressLineForceX = inspection.stressForceX * this.mapping.lineForceScale;
    const stressLineForceY = inspection.stressForceY * this.mapping.lineForceScale;
    const stripRadius = this.config.cfd2d.stripAxialCoordinate;
    const transverseVelocity = stripRadius * Math.cos(motion.theta) * motion.omega;
    const stripTorqueDensity = stripRadius * Math.cos(motion.theta) * lineForceY;
    const useClosure = this.config.cfd2d.couplingMode === "weak-fsi"
      && this.config.cfd2d.stripClosure === "fully-coherent-upper-bound";
    const totalDynamicTorque = useClosure
      ? this.replicatedStripTorque(lineForceY, motion.theta)
      : 0;
    const mechanics = evaluateMechanics(
      this.config,
      motion.theta,
      motion.omega,
      totalDynamicTorque,
      0,
    );
    let controlTorque = 0;
    if (this.config.cfd2d.couplingMode !== "weak-fsi") {
      controlTorque = mechanics.effectiveInertia * (motion.acceleration - mechanics.acceleration);
    }
    const referenceForce = 0.5
      * this.config.fluid.density
      * this.config.fluid.flowSpeed ** 2
      * this.mapping.diameter;
    const wet = mechanics.wet;
    return {
      time,
      theta: motion.theta,
      omega: motion.omega,
      angularAcceleration: motion.acceleration,
      observationRadius: this.config.geometry.observationDistance,
      displacement: this.config.geometry.observationDistance * Math.sin(motion.theta),
      velocity: this.config.geometry.observationDistance * Math.cos(motion.theta) * motion.omega,
      wakeReal: 0,
      wakeImaginary: 0,
      wakeAmplitude: 0,
      wakePhase: null,
      liftCoefficient: referenceForce > 0 ? lineForceY / referenceForce : 0,
      dragCoefficient: referenceForce > 0 ? lineForceX / referenceForce : 0,
      liftTorque: useClosure ? totalDynamicTorque : 0,
      dragTorque: 0,
      pitchingTorque: 0,
      fluidTorque: totalDynamicTorque,
      buoyancyTorque: mechanics.buoyancyTorque,
      controlTorque,
      sectionalLift: lineForceY,
      sectionalDrag: lineForceX,
      lineForceX,
      lineForceY,
      linePower2d: lineForceY * transverseVelocity,
      stripTorqueDensity,
      stressLineForceX,
      stressLineForceY,
      forcePathRelativeDifference: relativeDifference(
        lineForceX,
        lineForceY,
        stressLineForceX,
        stressLineForceY,
      ),
      interfaceExchange: {
        applied: this.lastAppliedExchange === null
          ? null
          : structuredClone(this.lastAppliedExchange),
        diagnostic: {
          endpointTime: time,
          diagnosticEndpointRawLineForceX: lineForceX,
          diagnosticEndpointRawLineForceY: lineForceY,
          legacyIncompleteStressContourLineForceX: stressLineForceX,
          legacyIncompleteStressContourLineForceY: stressLineForceY,
          legacyIncompleteStressContourRelativeDifference: relativeDifference(
            lineForceX,
            lineForceY,
            stressLineForceX,
            stressLineForceY,
          ),
        },
        cumulative: structuredClone(this.cumulativeExchange),
      },
      fluidPower: totalDynamicTorque * motion.omega,
      dampingPower: mechanics.dampingPower,
      controlPower: controlTorque * motion.omega,
      kineticEnergy: mechanics.kineticEnergy,
      gravitationalPotential: mechanics.gravitationalPotential,
      hydrostaticPotential: mechanics.hydrostaticPotential,
      elasticPotential: mechanics.elasticPotential,
      mechanicalEnergy: mechanics.mechanicalEnergy,
      effectiveInertia: mechanics.effectiveInertia,
      addedInertia: 0,
      displacedVolume: wet.displacedVolume,
      projectedWetArea: wet.streamwiseProjectedArea,
      axisWetLength: wet.axisWetLength,
      volumeEquivalentWetLength: wet.volumeEquivalentLength,
      flowSpeed: flowSpeedAt(this.config, time),
      reynolds: flowSpeedAt(this.config, time)
        * this.mapping.diameter
        / this.config.fluid.kinematicViscosity,
      wetBranch: wet.branch,
    };
  }

  makeField(): FieldFrame {
    const body = this.bodyAt(this.time);
    const fields = this.solver.macroscopicCopies(body);
    const vorticity = new Float32Array(this.solver.cells);
    const speed = new Float32Array(this.solver.cells);
    const nx = this.config.cfd2d.nx;
    const ny = this.config.cfd2d.ny;
    const at = (array: Float64Array, x: number, y: number): number => {
      const boundedX = Math.max(0, Math.min(nx - 1, x));
      const wrappedY = ((y % ny) + ny) % ny;
      return array[boundedX + nx * wrappedY] ?? 0;
    };
    for (let y = 0; y < ny; y += 1) {
      for (let x = 0; x < nx; x += 1) {
        const cell = x + nx * y;
        const duYdX = 0.5 * (at(fields.uy, x + 1, y) - at(fields.uy, x - 1, y));
        const duXdY = 0.5 * (at(fields.ux, x, y + 1) - at(fields.ux, x, y - 1));
        vorticity[cell] = (duYdX - duXdY) * this.mapping.vorticityScale;
        speed[cell] = Math.hypot(fields.ux[cell] ?? 0, fields.uy[cell] ?? 0)
          * this.mapping.velocityScale;
      }
    }
    return {
      time: this.time,
      width: nx,
      height: ny,
      xMin: 0,
      xMax: this.mapping.domainLength,
      yMin: -0.5 * this.mapping.domainWidth,
      yMax: 0.5 * this.mapping.domainWidth,
      vorticity,
      speed,
      cylinderX: body.centerX * this.mapping.dx,
      cylinderY: (body.centerY - 0.5 * (ny - 1)) * this.mapping.dx,
      cylinderRadius: body.radius * this.mapping.dx,
      unit: "SI",
    };
  }

  private mapAppliedExchange(
    startTime: number,
    midpointTime: number,
    midpointTheta: number,
    midpointOmega: number,
    exchange: BrinkmanStepExchange,
  ): Cfd2dAppliedRawExchange {
    const lineImpulseScale = this.mapping.lineForceScale * this.mapping.dt;
    const lineWorkScale = this.mapping.lineForceScale * this.mapping.dx;
    const appliedRawLineForceX = exchange.rawReactionImpulseX * this.mapping.lineForceScale;
    const appliedRawLineForceY = exchange.rawReactionImpulseY * this.mapping.lineForceScale;
    const appliedRawTorque = this.config.cfd2d.couplingMode === "weak-fsi"
      ? this.replicatedStripTorque(appliedRawLineForceY, midpointTheta)
      : 0;
    const appliedRawTorqueImpulse = appliedRawTorque * this.mapping.dt;
    const appliedRawWork = midpointOmega * appliedRawTorqueImpulse;
    return {
      contractId: A1_FORCE_CONTRACT_ID,
      startTime,
      endTime: startTime + this.mapping.dt,
      midpointTime,
      midpointTheta,
      midpointOmega,
      appliedRawLineImpulseX: exchange.rawReactionImpulseX * lineImpulseScale,
      appliedRawLineImpulseY: exchange.rawReactionImpulseY * lineImpulseScale,
      appliedRawLineForceX,
      appliedRawLineForceY,
      appliedRawLineWork: exchange.rawSolidReactionWork * lineWorkScale,
      appliedRawTorqueImpulse,
      appliedRawTorque,
      appliedRawWork,
      appliedRawPower: appliedRawWork / this.mapping.dt,
      brinkmanFluidWork: exchange.fluidBrinkmanWork * lineWorkScale,
      rawSolidReactionWork: exchange.rawSolidReactionWork * lineWorkScale,
      brinkmanPenaltyDissipation: exchange.penaltyDissipation * lineWorkScale,
      brinkmanAlgebraicResidual: exchange.algebraicWorkResidual * lineWorkScale,
    };
  }

  private accumulateExchange(exchange: Cfd2dAppliedRawExchange, latticeAbsoluteScale: number): void {
    this.cumulativeExchange.cumulativeAppliedRawLineWork += exchange.appliedRawLineWork;
    this.cumulativeExchange.cumulativeAppliedRawWork += exchange.appliedRawWork;
    this.cumulativeExchange.cumulativeBrinkmanFluidWork += exchange.brinkmanFluidWork;
    this.cumulativeExchange.cumulativeRawSolidReactionWork += exchange.rawSolidReactionWork;
    this.cumulativeExchange.cumulativeBrinkmanPenaltyDissipation += exchange.brinkmanPenaltyDissipation;
    this.cumulativeExchange.cumulativeBrinkmanAlgebraicResidual += exchange.brinkmanAlgebraicResidual;
    this.maximumAlgebraicResidual = Math.max(
      this.maximumAlgebraicResidual,
      Math.abs(exchange.brinkmanAlgebraicResidual),
    );
    const physicalAbsoluteScale = latticeAbsoluteScale
      * this.mapping.lineForceScale
      * this.mapping.dx;
    this.maximumAlgebraicRelativeResidual = Math.max(
      this.maximumAlgebraicRelativeResidual,
      Math.abs(exchange.brinkmanAlgebraicResidual) / Math.max(physicalAbsoluteScale, Number.MIN_VALUE),
    );
  }

  private replicatedStripTorque(lineForceY: number, theta: number): number {
    if (this.config.cfd2d.stripClosure !== "fully-coherent-upper-bound") return 0;
    const projectedFirstMoment = integrateWetProjection(
      theta,
      geometryOf(this.config),
      (radius) => radius,
    );
    return lineForceY
      * Math.cos(theta)
      * projectedFirstMoment
      / this.mapping.diameter;
  }
}

/** Convenient mapping identity used by tests and audit scripts. */
export function highFidelityMappingSummary(config: SimulationConfig): {
  mapping: ResolvedLatticeMapping;
  derivedReynolds: number;
  equilibriumWetLength: number;
} {
  return {
    mapping: resolveLatticeMapping(config),
    derivedReynolds: deriveParameters(config).reynolds,
    equilibriumWetLength: evaluateWetGeometry(0, geometryOf(config)).volumeEquivalentLength,
  };
}
