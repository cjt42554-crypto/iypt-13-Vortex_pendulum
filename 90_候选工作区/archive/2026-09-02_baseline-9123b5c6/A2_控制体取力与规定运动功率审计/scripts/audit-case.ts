import { cloneConfig, hashConfig } from "../../../../02_模拟程序/src/core/config";
import type { SimulationConfig } from "../../../../02_模拟程序/src/core/types";
import { HighFidelitySimulation } from "../../../../02_模拟程序/src/solvers/highFidelity/model";
import {
  assessScaleAwareResidual,
  captureControlVolumeSnapshot,
  evaluateControlVolumeStep,
  relativeVectorResidual,
  type ControlVolumeSnapshot,
  type D2Q9StateView,
  type InternalControlVolume,
} from "../src/control-volume-force.ts";
import {
  accumulateHarmonic,
  configureCase,
  finishHarmonic,
  makeAccumulator,
  relativeSpread,
  sameNonzeroTrend,
  type CliOptions,
  type FinalHarmonic,
  type HarmonicAccumulator,
  type MatrixCase,
} from "./audit-support.ts";

interface VolumeAccumulator {
  id: string;
  controlVolume: InternalControlVolume;
  previous: ControlVolumeSnapshot;
  steps: number;
  maximumBoundaryMask: number;
  maximumRawRelativeResidual: number;
  squaredRawRelativeResidualSum: number;
  maximumRawAbsoluteResidualSi: number;
  squaredRawAbsoluteResidualSiSum: number;
  squaredRawReferenceMagnitudeSiSum: number;
  worstPointwiseRawRelativeResidual: {
    latticeStep: number;
    midpointTime: number;
    relativeResidual: number;
    absoluteResidualSi: number;
    referenceMagnitudeSi: number;
    rawControlVolumeLineForceX: number;
    rawControlVolumeLineForceY: number;
    rawA1LineForceX: number;
    rawA1LineForceY: number;
  } | null;
  rawA1: HarmonicAccumulator;
  rawCv: HarmonicAccumulator;
  correctedBare: HarmonicAccumulator;
  correctedPhysical: HarmonicAccumulator;
}


interface FinalVolumeReport {
  id: string;
  controlVolume: InternalControlVolume;
  steps: number;
  maximumBoundaryMask: number;
  boundaryIsolationPassed: boolean;
  maximumRawRelativeResidual: number;
  rmsRawRelativeResidual: number;
  maximumRawAbsoluteResidualSi: number;
  rawResidualRmsSi: number;
  rawReferenceRmsSi: number;
  maximumRawResidualRelativeToReferenceRms: number;
  rmsRawResidualRelativeToReferenceRms: number;
  worstPointwiseRawRelativeResidual: VolumeAccumulator["worstPointwiseRawRelativeResidual"];
  rawDiscreteBalancePassed: boolean;
  rawA1: FinalHarmonic;
  rawControlVolume: FinalHarmonic;
  correctedBareMomentum: FinalHarmonic;
  correctedHalfForceMomentum: FinalHarmonic;
  correctionTimeStaggeringSensitivity: number;
}


function buildControlVolumes(
  simulation: HighFidelitySimulation,
  config: SimulationConfig,
): Array<{ id: string; controlVolume: InternalControlVolume }> {
  const diameterCells = config.cfd2d.cylinderCells;
  const radiusCells = 0.5 * diameterCells;
  const maximumCenterExcursionCells = Math.abs(
    config.cfd2d.stripAxialCoordinate * Math.sin(config.cfd2d.prescribedAmplitude)
      / simulation.mapping.dx,
  );
  const definitions = [
    { id: "compact", gapDiameters: 0.75 },
    { id: "standard", gapDiameters: 1.25 },
    { id: "expanded", gapDiameters: 1.75 },
  ];
  return definitions.map(({ id, gapDiameters }) => {
    const gap = gapDiameters * diameterCells;
    const controlVolume = {
      xMin: Math.floor(simulation.cylinderX - radiusCells - gap),
      xMax: Math.ceil(simulation.cylinderX + radiusCells + gap),
      yMin: Math.floor(
        simulation.baseCylinderY - maximumCenterExcursionCells - radiusCells - gap,
      ),
      yMax: Math.ceil(
        simulation.baseCylinderY + maximumCenterExcursionCells + radiusCells + gap,
      ),
    };
    if (controlVolume.xMin < 1 || controlVolume.xMax > config.cfd2d.nx - 2
      || controlVolume.yMin < 1 || controlVolume.yMax > config.cfd2d.ny - 2) {
      throw new RangeError(`${id} control volume does not fit inside the one-cell internal halo`);
    }
    return { id, controlVolume };
  });
}

function captureState(simulation: HighFidelitySimulation): D2Q9StateView {
  const body = simulation.bodyAt(simulation.time);
  const fields = simulation.solver.macroscopicCopies(body);
  // This public checkpoint copy makes the candidate non-invasive. A future
  // formal implementation should expose a narrow read-only CV probe to avoid
  // copying all 9*N populations on every step.
  const checkpoint = simulation.solver.checkpoint();
  return {
    nx: simulation.solver.nx,
    ny: simulation.solver.ny,
    distributions: checkpoint.distributions,
    rho: fields.rho,
    ux: fields.ux,
    uy: fields.uy,
    mask: fields.mask,
  };
}


export async function runCase(item: MatrixCase, cli: CliOptions) {
  const config = configureCase(cloneConfig(), item, cli);
  const simulation = new HighFidelitySimulation(config);
  const volumeDefinitions = buildControlVolumes(simulation, config);
  const initialState = captureState(simulation);
  const accumulators: VolumeAccumulator[] = volumeDefinitions.map(({ id, controlVolume }) => ({
    id,
    controlVolume,
    previous: captureControlVolumeSnapshot(initialState, controlVolume),
    steps: 0,
    maximumBoundaryMask: 0,
    maximumRawRelativeResidual: 0,
    squaredRawRelativeResidualSum: 0,
    maximumRawAbsoluteResidualSi: 0,
    squaredRawAbsoluteResidualSiSum: 0,
    squaredRawReferenceMagnitudeSiSum: 0,
    worstPointwiseRawRelativeResidual: null,
    rawA1: makeAccumulator(),
    rawCv: makeAccumulator(),
    correctedBare: makeAccumulator(),
    correctedPhysical: makeAccumulator(),
  }));
  const analysisStart = cli.discardCycles / cli.frequency;
  let maximumDensityDeviation = 0;
  let maximumMach = 0;

  while (!simulation.finished) {
    const advance = simulation.advanceOne(false, false);
    const currentState = captureState(simulation);
    const midpointTime = advance.exchange.midpointTime;
    const transverseVelocity = config.cfd2d.stripAxialCoordinate
      * Math.cos(advance.exchange.midpointTheta)
      * advance.exchange.midpointOmega;
    const rawA1LatticeX = advance.exchange.appliedRawLineForceX
      / simulation.mapping.lineForceScale;
    const rawA1LatticeY = advance.exchange.appliedRawLineForceY
      / simulation.mapping.lineForceScale;
    const includeInAnalysis = midpointTime >= analysisStart
      && midpointTime <= config.solver.duration;

    for (const accumulator of accumulators) {
      const current = captureControlVolumeSnapshot(currentState, accumulator.controlVolume);
      const balance = evaluateControlVolumeStep(accumulator.previous, current, {
        dtLattice: 1,
        boundaryMaskTolerance: 1e-14,
      });
      accumulator.previous = current;
      accumulator.steps += 1;
      accumulator.maximumBoundaryMask = Math.max(
        accumulator.maximumBoundaryMask,
        balance.maximumBoundaryMask,
      );
      const rawRelativeResidual = relativeVectorResidual(
        balance.rawReactionImpulseX,
        balance.rawReactionImpulseY,
        rawA1LatticeX,
        rawA1LatticeY,
        1e-24,
      );
      const rawResidualMagnitudeLattice = Math.hypot(
        balance.rawReactionImpulseX - rawA1LatticeX,
        balance.rawReactionImpulseY - rawA1LatticeY,
      );
      const rawReferenceMagnitudeLattice = Math.max(
        Math.hypot(balance.rawReactionImpulseX, balance.rawReactionImpulseY),
        Math.hypot(rawA1LatticeX, rawA1LatticeY),
      );
      const rawAbsoluteResidualSi = rawResidualMagnitudeLattice
        * simulation.mapping.lineForceScale;
      const rawReferenceMagnitudeSi = rawReferenceMagnitudeLattice
        * simulation.mapping.lineForceScale;
      accumulator.maximumRawRelativeResidual = Math.max(
        accumulator.maximumRawRelativeResidual,
        rawRelativeResidual,
      );
      accumulator.squaredRawRelativeResidualSum += rawRelativeResidual ** 2;
      accumulator.maximumRawAbsoluteResidualSi = Math.max(
        accumulator.maximumRawAbsoluteResidualSi,
        rawAbsoluteResidualSi,
      );
      accumulator.squaredRawAbsoluteResidualSiSum += rawAbsoluteResidualSi ** 2;
      accumulator.squaredRawReferenceMagnitudeSiSum += rawReferenceMagnitudeSi ** 2;
      if (accumulator.worstPointwiseRawRelativeResidual === null
        || rawRelativeResidual > accumulator.worstPointwiseRawRelativeResidual.relativeResidual) {
        const scale = simulation.mapping.lineForceScale;
        accumulator.worstPointwiseRawRelativeResidual = {
          latticeStep: simulation.latticeStep,
          midpointTime,
          relativeResidual: rawRelativeResidual,
          absoluteResidualSi: rawAbsoluteResidualSi,
          referenceMagnitudeSi: rawReferenceMagnitudeSi,
          rawControlVolumeLineForceX: balance.rawReactionImpulseX * scale,
          rawControlVolumeLineForceY: balance.rawReactionImpulseY * scale,
          rawA1LineForceX: rawA1LatticeX * scale,
          rawA1LineForceY: rawA1LatticeY * scale,
        };
      }

      if (includeInAnalysis) {
        const scale = simulation.mapping.lineForceScale;
        accumulateHarmonic(
          accumulator.rawA1,
          midpointTime,
          simulation.mapping.dt,
          cli.frequency,
          rawA1LatticeY * scale,
          transverseVelocity,
        );
        accumulateHarmonic(
          accumulator.rawCv,
          midpointTime,
          simulation.mapping.dt,
          cli.frequency,
          balance.rawReactionImpulseY * scale,
          transverseVelocity,
        );
        accumulateHarmonic(
          accumulator.correctedBare,
          midpointTime,
          simulation.mapping.dt,
          cli.frequency,
          balance.correctedBareReactionImpulseY * scale,
          transverseVelocity,
        );
        accumulateHarmonic(
          accumulator.correctedPhysical,
          midpointTime,
          simulation.mapping.dt,
          cli.frequency,
          balance.correctedPhysicalReactionImpulseY * scale,
          transverseVelocity,
        );
      }
    }

    if (simulation.latticeStep % Math.max(1, Math.floor(simulation.mapping.totalSteps / 20)) === 0) {
      const inspection = simulation.inspect();
      maximumDensityDeviation = Math.max(
        maximumDensityDeviation,
        Math.abs(inspection.minimumDensity - 1),
        Math.abs(inspection.maximumDensity - 1),
      );
      maximumMach = Math.max(
        maximumMach,
        inspection.maximumSpeed / (1 / Math.sqrt(3)),
      );
      process.stdout.write(
        `${item.id}: ${(100 * simulation.latticeStep / simulation.mapping.totalSteps).toFixed(0)}%\n`,
      );
    }
  }

  const volumes: FinalVolumeReport[] = accumulators.map((accumulator) => {
    const rawA1 = finishHarmonic(accumulator.rawA1);
    const rawCv = finishHarmonic(accumulator.rawCv);
    const correctedBare = finishHarmonic(accumulator.correctedBare);
    const correctedPhysical = finishHarmonic(accumulator.correctedPhysical);
    const correctionTimeStaggeringSensitivity = Math.abs(
      correctedPhysical.meanPower - correctedBare.meanPower,
    ) / Math.max(
      Math.abs(correctedPhysical.meanPower),
      Math.abs(correctedBare.meanPower),
      correctedPhysical.powerScale,
      correctedBare.powerScale,
      1e-30,
    );
    const rawBalance = assessScaleAwareResidual(
      accumulator.maximumRawAbsoluteResidualSi,
      accumulator.squaredRawAbsoluteResidualSiSum,
      accumulator.squaredRawReferenceMagnitudeSiSum,
      accumulator.steps,
    );
    return {
      id: accumulator.id,
      controlVolume: accumulator.controlVolume,
      steps: accumulator.steps,
      maximumBoundaryMask: accumulator.maximumBoundaryMask,
      boundaryIsolationPassed: accumulator.maximumBoundaryMask <= 1e-14,
      maximumRawRelativeResidual: accumulator.maximumRawRelativeResidual,
      rmsRawRelativeResidual: Math.sqrt(
        accumulator.squaredRawRelativeResidualSum / Math.max(1, accumulator.steps),
      ),
      maximumRawAbsoluteResidualSi: accumulator.maximumRawAbsoluteResidualSi,
      rawResidualRmsSi: rawBalance.residualRms,
      rawReferenceRmsSi: rawBalance.referenceRms,
      maximumRawResidualRelativeToReferenceRms:
        rawBalance.maximumResidualRelativeToReferenceRms,
      rmsRawResidualRelativeToReferenceRms: rawBalance.rmsResidualRelativeToReferenceRms,
      worstPointwiseRawRelativeResidual: accumulator.worstPointwiseRawRelativeResidual,
      rawDiscreteBalancePassed: rawBalance.passed,
      rawA1,
      rawControlVolume: rawCv,
      correctedBareMomentum: correctedBare,
      correctedHalfForceMomentum: correctedPhysical,
      correctionTimeStaggeringSensitivity,
    };
  });

  const corrected = volumes.map((volume) => volume.correctedHalfForceMomentum);
  const rawBalancePassed = volumes.every((volume) => volume.rawDiscreteBalancePassed);
  const boundaryIsolationPassed = volumes.every((volume) => volume.boundaryIsolationPassed);
  const controlVolumePowerSpread = relativeSpread(corrected.map((value) => value.meanPower));
  const controlVolumeSignStable = sameNonzeroTrend(corrected);
  const timeStaggeringSensitivity = Math.max(
    ...volumes.map((volume) => volume.correctionTimeStaggeringSensitivity),
  );
  return {
    caseId: item.id,
    configHash: hashConfig(config),
    physicalInput: {
      reynolds: config.fluid.flowSpeed * (2 * config.geometry.radius)
        / config.fluid.kinematicViscosity,
      amplitude: cli.amplitude,
      frequency: cli.frequency,
      cycles: cli.cycles,
      discardCycles: cli.discardCycles,
      flowRampTime: config.fluid.flowRampTime,
    },
    numericalIdentity: {
      nx: config.cfd2d.nx,
      ny: config.cfd2d.ny,
      diameterCells: item.diameterCells,
      targetLatticeVelocity: item.latticeVelocity,
      resolvedLatticeVelocity: simulation.mapping.resolvedLatticeVelocity,
      latticeMach: simulation.mapping.latticeMach,
      relaxationTime: simulation.mapping.relaxationTime,
      penalizationTimeSteps: config.cfd2d.penalizationTimeSteps,
      etaHat: config.cfd2d.penalizationTimeSteps
        * simulation.mapping.resolvedLatticeVelocity
        / item.diameterCells,
      physicalTimeStep: simulation.mapping.dt,
      latticeSteps: simulation.latticeStep,
      maximumDensityDeviation,
      maximumMach,
    },
    volumes,
    gates: {
      rawDiscreteBalancePassed: rawBalancePassed,
      boundaryIsolationPassed,
      controlVolumeSignStable,
      controlVolumePowerSpread,
      controlVolumePowerSpreadPassed: controlVolumePowerSpread <= 0.05,
      timeStaggeringSensitivity,
      timeStaggeringSensitivityPassed: timeStaggeringSensitivity <= 0.10,
    },
  };
}
