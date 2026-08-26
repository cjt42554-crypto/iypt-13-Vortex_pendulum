import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED,
  type LbmBodyKinematics,
  type LbmCheckpoint,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import {
  rampVelocity,
  type BoundaryField,
} from "./formal-boundary-factorization-boundaries.ts";
import { applyInletMechanism } from
  "./formal-inlet-mechanism-boundaries.ts";
import { FORMAL_INLET_QUALIFICATION_CONTRACT as CONTRACT } from
  "./formal-inlet-qualification-contract.ts";
import {
  createMassLedger,
  finishMassLedger,
  recordPopulationMassStep,
  shadowFormalStep,
} from "./formal-inlet-qualification-ledger.ts";
import type {
  ExactAnchorComparison,
  ForceDiagnostics,
  PopulationMassStepRecord,
  PopulationDiagnostics,
  QualificationPhase,
  QualificationProvenance,
  QualificationStability,
  StartupCaseDefinition,
  StartupCaseResult,
} from "./formal-inlet-qualification-types.ts";

export interface StartupAnchor {
  completedSteps: number;
  stability: QualificationStability;
}

export interface StartupCaseExecution {
  result: StartupCaseResult;
  auditEndField?: BoundaryField;
}

interface MutableEnvelope {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumMach: number;
  maximumMachStep: number;
  minimumDensity: number;
  maximumDensity: number;
  densityExtremum?: QualificationStability["densityExtremum"];
}

interface MutableForce {
  sampleCount: number;
  sumDrag: number;
  sumLiftSquared: number;
  maximumAbsoluteDrag: number;
  maximumAbsoluteLift: number;
}

function emptyEnvelope(): MutableEnvelope {
  return {
    maximumDensityDeviation: 0,
    maximumDensityDeviationStep: 0,
    maximumMach: 0,
    maximumMachStep: 0,
    minimumDensity: Number.POSITIVE_INFINITY,
    maximumDensity: Number.NEGATIVE_INFINITY,
  };
}

function updateEnvelope(
  envelope: MutableEnvelope,
  field: BoundaryField,
  nx: number,
  step: number,
  body: LbmBodyKinematics | null,
): void {
  let minimumDensity = Number.POSITIVE_INFINITY;
  let maximumDensity = Number.NEGATIVE_INFINITY;
  let maximumSpeed = 0;
  let minimumCell = 0;
  let maximumCell = 0;
  for (let cell = 0; cell < field.rho.length; cell += 1) {
    const density = field.rho[cell] ?? 0;
    const speed = Math.hypot(field.ux[cell] ?? 0, field.uy[cell] ?? 0);
    if (density < minimumDensity) {
      minimumDensity = density;
      minimumCell = cell;
    }
    if (density > maximumDensity) {
      maximumDensity = density;
      maximumCell = cell;
    }
    maximumSpeed = Math.max(maximumSpeed, speed);
  }
  if (!Number.isFinite(minimumDensity)
    || !Number.isFinite(maximumDensity)
    || !Number.isFinite(maximumSpeed)) {
    throw new RangeError("A8M macroscopic field became non-finite");
  }
  const minimumDeviation = Math.abs(minimumDensity - 1);
  const maximumDeviation = Math.abs(maximumDensity - 1);
  const useMaximum = maximumDeviation >= minimumDeviation;
  const deviation = useMaximum ? maximumDeviation : minimumDeviation;
  if (deviation > envelope.maximumDensityDeviation) {
    const cell = useMaximum ? maximumCell : minimumCell;
    const x = cell % nx;
    const y = Math.floor(cell / nx);
    envelope.maximumDensityDeviation = deviation;
    envelope.maximumDensityDeviationStep = step;
    envelope.densityExtremum = {
      kind: useMaximum ? "maximum" : "minimum",
      density: useMaximum ? maximumDensity : minimumDensity,
      x,
      y,
      brinkmanMaskIndicator: field.mask[cell] ?? 0,
      ...(body === null
        ? {}
        : {
          signedDistanceFromNominalSurfaceCells:
            Math.hypot(x - body.centerX, y - body.centerY) - body.radius,
        }),
    };
  }
  const maximumMach = maximumSpeed / LATTICE_SOUND_SPEED;
  if (maximumMach > envelope.maximumMach) {
    envelope.maximumMach = maximumMach;
    envelope.maximumMachStep = step;
  }
  envelope.minimumDensity = Math.min(envelope.minimumDensity, minimumDensity);
  envelope.maximumDensity = Math.max(envelope.maximumDensity, maximumDensity);
}

function finishEnvelope(envelope: MutableEnvelope): QualificationStability {
  if (envelope.densityExtremum === undefined) {
    throw new Error("cannot finalize empty A8M stability envelope");
  }
  return {
    maximumDensityDeviation: envelope.maximumDensityDeviation,
    maximumDensityDeviationStep: envelope.maximumDensityDeviationStep,
    maximumMach: envelope.maximumMach,
    maximumMachStep: envelope.maximumMachStep,
    minimumDensity: envelope.minimumDensity,
    maximumDensity: envelope.maximumDensity,
    densityExtremum: envelope.densityExtremum,
  };
}

function emptyPopulations(): PopulationDiagnostics {
  return {
    nonFiniteStateDetected: false,
    nonFinitePopulationObservationCount: 0,
    negativePopulationObservationCount: 0,
    maximumNegativePopulationCountPerStep: 0,
    minimumPopulation: Number.POSITIVE_INFINITY,
    minimumPopulationStep: 0,
    minimumPopulationCell: 0,
    minimumPopulationDirection: 0,
  };
}

function scanPopulations(
  diagnostics: PopulationDiagnostics,
  distributions: Float64Array,
  step: number,
): void {
  let negativeThisStep = 0;
  let nonFiniteThisStep = 0;
  for (let index = 0; index < distributions.length; index += 1) {
    const value = distributions[index] ?? Number.NaN;
    if (!Number.isFinite(value)) {
      nonFiniteThisStep += 1;
      continue;
    }
    if (value < 0) {
      negativeThisStep += 1;
      diagnostics.negativePopulationObservationCount += 1;
    }
    if (value < diagnostics.minimumPopulation) {
      diagnostics.minimumPopulation = value;
      diagnostics.minimumPopulationStep = step;
      diagnostics.minimumPopulationCell = Math.floor(index / 9);
      diagnostics.minimumPopulationDirection = index % 9;
    }
  }
  diagnostics.maximumNegativePopulationCountPerStep = Math.max(
    diagnostics.maximumNegativePopulationCountPerStep,
    negativeThisStep,
  );
  diagnostics.nonFinitePopulationObservationCount += nonFiniteThisStep;
  diagnostics.nonFiniteStateDetected ||= nonFiniteThisStep > 0;
  if (nonFiniteThisStep > 0) {
    throw new RangeError(
      `A8M found ${nonFiniteThisStep} non-finite populations at step ${step}`,
    );
  }
}

function emptyForce(): MutableForce {
  return {
    sampleCount: 0,
    sumDrag: 0,
    sumLiftSquared: 0,
    maximumAbsoluteDrag: 0,
    maximumAbsoluteLift: 0,
  };
}

function updateForce(
  force: MutableForce,
  solver: D2Q9MrtBrinkmanSolver,
  body: LbmBodyKinematics,
): void {
  const reaction = solver.penaltyReaction(body);
  force.sampleCount += 1;
  force.sumDrag += reaction.x;
  force.sumLiftSquared += reaction.y * reaction.y;
  force.maximumAbsoluteDrag = Math.max(force.maximumAbsoluteDrag, Math.abs(reaction.x));
  force.maximumAbsoluteLift = Math.max(force.maximumAbsoluteLift, Math.abs(reaction.y));
}

function finishForce(force: MutableForce): ForceDiagnostics | undefined {
  if (force.sampleCount === 0) return undefined;
  return {
    sampleCount: force.sampleCount,
    meanDrag: force.sumDrag / force.sampleCount,
    liftRms: Math.sqrt(force.sumLiftSquared / force.sampleCount),
    maximumAbsoluteDrag: force.maximumAbsoluteDrag,
    maximumAbsoluteLift: force.maximumAbsoluteLift,
  };
}

function cloneCheckpoint(checkpoint: LbmCheckpoint): LbmCheckpoint {
  return { ...checkpoint, distributions: checkpoint.distributions.slice() };
}

function compareAnchor(
  actualCompletedSteps: number,
  actual: QualificationStability | undefined,
  anchor: StartupAnchor,
): ExactAnchorComparison {
  const mismatchFields: string[] = [];
  if (actualCompletedSteps !== anchor.completedSteps) mismatchFields.push("completedSteps");
  if (actual === undefined) {
    mismatchFields.push("stability");
  } else {
    for (const field of [
      "maximumDensityDeviation",
      "maximumDensityDeviationStep",
      "maximumMach",
      "maximumMachStep",
      "minimumDensity",
      "maximumDensity",
    ] as const) {
      if (actual[field] !== anchor.stability[field]) mismatchFields.push(field);
    }
    for (const field of [
      "kind",
      "density",
      "x",
      "y",
      "brinkmanMaskIndicator",
      "signedDistanceFromNominalSurfaceCells",
    ] as const) {
      if (actual.densityExtremum[field]
        !== anchor.stability.densityExtremum[field]) {
        mismatchFields.push(`densityExtremum.${field}`);
      }
    }
  }
  return { checked: true, exactMatch: mismatchFields.length === 0, mismatchFields };
}

function errorIdentity(error: unknown): { name: string; message: string } {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: "UnknownError", message: String(error) };
}

export function runFormalInletQualificationStartupCase(
  definition: StartupCaseDefinition,
  provenance: QualificationProvenance,
  a8lAnchor?: StartupAnchor,
  a8hAnchor?: StartupAnchor,
): StartupCaseExecution {
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: definition.nx,
    ny: definition.ny,
    relaxationTime: definition.relaxationTime,
    penalizationTimeSteps: CONTRACT.commonNumerics.penalizationTimeSteps,
    maskHalfThickness: CONTRACT.commonNumerics.maskHalfThicknessCells,
    outerBoundary: CONTRACT.commonNumerics.outerBoundary,
  });
  if (definition.initialField === "uniform-target-velocity") {
    solver.initializeUniform(CONTRACT.commonNumerics.inletVelocityLattice);
  }
  const massLedger = createMassLedger(solver.checkpoint());
  const massStepRecords: PopulationMassStepRecord[] = [];
  const populationDiagnostics = emptyPopulations();
  const preRunEnvelope = emptyEnvelope();
  const auditEnvelope = emptyEnvelope();
  const force = emptyForce();
  let completedPreRunSteps = 0;
  let completedAuditSteps = 0;
  let failure: StartupCaseResult["run"]["failure"];
  let auditEndField: BoundaryField | undefined;

  const executeStep = (
    globalStep: number,
    phase: QualificationPhase,
    phaseStep: number,
    inletVelocity: number,
  ): BoundaryField => {
    const preField = solver.macroscopicCopies(definition.body);
    const preCheckpoint = solver.checkpoint();
    const shadow = shadowFormalStep(preCheckpoint, definition.body, inletVelocity);
    solver.step(definition.body, inletVelocity);
    const formalCheckpoint = solver.checkpoint();
    const candidateCheckpoint = cloneCheckpoint(formalCheckpoint);
    applyInletMechanism(candidateCheckpoint, {
      id: definition.id,
      nominalDiameterScaleCells: definition.nominalDiameterCells,
      relaxationTime: definition.relaxationTime,
      nx: definition.nx,
      ny: definition.ny,
      auditSteps: definition.auditSteps,
      rampSteps: definition.rampSteps,
      strategy: definition.strategy,
    }, preField, inletVelocity);
    massStepRecords.push(recordPopulationMassStep(
      globalStep,
      phase,
      shadow,
      formalCheckpoint,
      candidateCheckpoint,
      massLedger,
    ));
    solver.restore(candidateCheckpoint);
    scanPopulations(populationDiagnostics, candidateCheckpoint.distributions, globalStep);
    const field = solver.macroscopicCopies(definition.body);
    if (phase === "prerun") {
      updateEnvelope(preRunEnvelope, field, definition.nx, phaseStep, definition.body);
    } else {
      updateEnvelope(auditEnvelope, field, definition.nx, phaseStep, definition.body);
      if (definition.body !== null) updateForce(force, solver, definition.body);
    }
    return field;
  };

  let activePhase: QualificationPhase = definition.preRunSteps > 0 ? "prerun" : "audit";
  try {
    for (let step = 1; step <= definition.preRunSteps; step += 1) {
      activePhase = "prerun";
      executeStep(step, "prerun", step, CONTRACT.commonNumerics.inletVelocityLattice);
      completedPreRunSteps = step;
    }
    for (let step = 1; step <= definition.auditSteps; step += 1) {
      activePhase = "audit";
      const inletVelocity = definition.protocol === "rest-ramp-20d-no-body"
        ? rampVelocity(
          CONTRACT.commonNumerics.inletVelocityLattice,
          definition.rampSteps,
          step,
        )
        : CONTRACT.commonNumerics.inletVelocityLattice;
      auditEndField = executeStep(
        definition.preRunSteps + step,
        "audit",
        step,
        inletVelocity,
      );
      completedAuditSteps = step;
    }
  } catch (error) {
    failure = {
      nextStep: definition.preRunSteps > completedPreRunSteps
        ? completedPreRunSteps + 1
        : definition.preRunSteps + completedAuditSteps + 1,
      phase: activePhase,
      ...errorIdentity(error),
    };
  }

  const preRunStability = completedPreRunSteps === 0
    ? undefined
    : finishEnvelope(preRunEnvelope);
  const auditStability = completedAuditSteps === 0
    ? undefined
    : finishEnvelope(auditEnvelope);
  const forceDiagnostics = finishForce(force);
  const massSummary = massStepRecords.length === 0
    ? undefined
    : finishMassLedger(massLedger, definition.strategy);
  const executionPass = failure === undefined
    && completedPreRunSteps === definition.preRunSteps
    && completedAuditSteps === definition.auditSteps;
  const densityPass = auditStability !== undefined
    && auditStability.maximumDensityDeviation
      <= CONTRACT.startupMatrix.gates.maximumDensityDeviation;
  const machPass = auditStability !== undefined
    && auditStability.maximumMach <= CONTRACT.startupMatrix.gates.maximumMach;
  const massPass = massSummary?.gates.pass ?? false;
  const result: StartupCaseResult = {
    definition,
    provenance,
    run: {
      status: executionPass ? "completed" : "failed",
      completedPreRunSteps,
      completedAuditSteps,
      ...(preRunStability === undefined ? {} : { preRunStability }),
      ...(auditStability === undefined ? {} : { auditStability }),
      populationDiagnostics,
      ...(forceDiagnostics === undefined ? {} : { forceDiagnostics }),
      massStepRecords,
      ...(massSummary === undefined ? {} : { massSummary }),
      ...(failure === undefined ? {} : { failure }),
    },
    gate: {
      executionPass,
      densityPass,
      machPass,
      massPass,
      pass: executionPass && densityPass && machPass && massPass,
    },
  };
  if (a8lAnchor !== undefined) {
    result.a8lAnchorComparison = compareAnchor(
      completedAuditSteps,
      auditStability,
      a8lAnchor,
    );
  }
  if (a8hAnchor !== undefined) {
    result.a8hAnchorComparison = compareAnchor(
      completedPreRunSteps,
      preRunStability,
      a8hAnchor,
    );
  }
  return {
    result,
    ...(auditEndField === undefined ? {} : { auditEndField }),
  };
}
