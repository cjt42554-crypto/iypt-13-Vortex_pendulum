import { D2Q9MrtBrinkmanSolver } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import {
  emptyEnvelope,
  finishEnvelope,
  rampVelocity,
  updateEnvelope,
  type BoundaryField,
  type MutableEnvelope,
} from "./formal-boundary-factorization-boundaries.ts";
import { FORMAL_INLET_MECHANISM_CONTRACT as CONTRACT } from
  "./formal-inlet-mechanism-contract.ts";
import { applyInletMechanism, type AppliedBoundaryRow } from
  "./formal-inlet-mechanism-boundaries.ts";
import type {
  AnchorComparison,
  AnchorMetrics,
  BoundaryMomentDiagnostics,
  CaseDefinition,
  CaseDiagnostics,
  CaseProvenance,
  CaseResult,
  MassDiagnostics,
  PopulationDiagnostics,
  ResidualExtremum,
  Stability,
} from "./formal-inlet-mechanism-types.ts";

interface MutableResidual {
  seen: boolean;
  absoluteResidual: number;
  step: number;
  y: number;
  actual: number;
  target: number;
}

interface MutableMoments {
  density: MutableResidual;
  ux: MutableResidual;
  uy: MutableResidual;
}

interface MutableMass {
  initialTotalMass: number;
  finalTotalMass: number;
  minimumTotalMass: number;
  maximumTotalMass: number;
  cumulativeBoundaryNetMassInput: number;
}

interface MutablePopulations extends PopulationDiagnostics {}

function emptyResidual(): MutableResidual {
  return {
    seen: false,
    absoluteResidual: 0,
    step: 0,
    y: 0,
    actual: 0,
    target: 0,
  };
}

function updateResidual(
  residual: MutableResidual,
  actual: number,
  target: number,
  step: number,
  y: number,
): void {
  const absoluteResidual = Math.abs(actual - target);
  if (!Number.isFinite(absoluteResidual)) {
    throw new RangeError("A8L boundary moment residual became non-finite");
  }
  if (!residual.seen || absoluteResidual > residual.absoluteResidual) {
    residual.seen = true;
    residual.absoluteResidual = absoluteResidual;
    residual.step = step;
    residual.y = y;
    residual.actual = actual;
    residual.target = target;
  }
}

function updateMoments(
  moments: MutableMoments,
  rows: AppliedBoundaryRow[],
  step: number,
): void {
  for (const row of rows) {
    updateResidual(moments.density, row.actual.rho, row.target.rho, step, row.y);
    updateResidual(moments.ux, row.actual.ux, row.target.ux, step, row.y);
    updateResidual(moments.uy, row.actual.uy, row.target.uy, step, row.y);
  }
}

function finishResidual(residual: MutableResidual): ResidualExtremum {
  if (!residual.seen) throw new Error("empty A8L boundary moment diagnostics");
  const { seen: _seen, ...finished } = residual;
  return finished;
}

function finishMoments(moments: MutableMoments): BoundaryMomentDiagnostics {
  return {
    density: finishResidual(moments.density),
    ux: finishResidual(moments.ux),
    uy: finishResidual(moments.uy),
  };
}

function totalMass(field: BoundaryField): number {
  let mass = 0;
  for (const density of field.rho) mass += density;
  if (!Number.isFinite(mass)) throw new RangeError("A8L total mass became non-finite");
  return mass;
}

function updateMass(
  mass: MutableMass,
  field: BoundaryField,
  boundaryNetInput: number,
): void {
  const current = totalMass(field);
  if (!Number.isFinite(boundaryNetInput)) {
    throw new RangeError("A8L boundary net mass input became non-finite");
  }
  mass.finalTotalMass = current;
  mass.minimumTotalMass = Math.min(mass.minimumTotalMass, current);
  mass.maximumTotalMass = Math.max(mass.maximumTotalMass, current);
  mass.cumulativeBoundaryNetMassInput += boundaryNetInput;
}

function finishMass(mass: MutableMass): MassDiagnostics {
  const totalMassChange = mass.finalTotalMass - mass.initialTotalMass;
  return {
    ...mass,
    totalMassChange,
    massChangeMinusCumulativeBoundaryNetInput:
      totalMassChange - mass.cumulativeBoundaryNetMassInput,
  };
}

function scanPopulations(
  populations: MutablePopulations,
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
      populations.negativePopulationObservationCount += 1;
    }
    if (value < populations.minimumPopulation) {
      populations.minimumPopulation = value;
      populations.minimumPopulationStep = step;
      populations.minimumPopulationCell = Math.floor(index / 9);
      populations.minimumPopulationDirection = index % 9;
    }
  }
  populations.maximumNegativePopulationCountPerStep = Math.max(
    populations.maximumNegativePopulationCountPerStep,
    negativeThisStep,
  );
  populations.nonFinitePopulationObservationCount += nonFiniteThisStep;
  populations.nonFiniteStateDetected ||= nonFiniteThisStep > 0;
  if (nonFiniteThisStep > 0) {
    throw new RangeError(
      `A8L found ${nonFiniteThisStep} non-finite distribution values at step ${step}`,
    );
  }
}

function compareAnchor(
  completedSteps: number,
  stability: Stability | undefined,
  anchor: AnchorMetrics,
): AnchorComparison {
  const mismatchFields: string[] = [];
  if (stability === undefined) {
    mismatchFields.push("stability");
  } else {
    if (completedSteps !== anchor.completedSteps) mismatchFields.push("completedSteps");
    for (const field of [
      "maximumDensityDeviation",
      "maximumDensityDeviationStep",
      "maximumMach",
      "maximumMachStep",
      "minimumDensity",
      "maximumDensity",
    ] as const) {
      if (stability[field] !== anchor.stability[field]) mismatchFields.push(field);
    }
    for (const field of [
      "kind",
      "density",
      "x",
      "y",
      "brinkmanMaskIndicator",
    ] as const) {
      if (stability.densityExtremum[field]
        !== anchor.stability.densityExtremum[field]) {
        mismatchFields.push(`densityExtremum.${field}`);
      }
    }
  }
  return {
    checked: true,
    exactMatch: mismatchFields.length === 0,
    mismatchFields,
  };
}

function finishDiagnostics(
  moments: MutableMoments,
  mass: MutableMass,
  populations: MutablePopulations,
): CaseDiagnostics {
  return {
    boundaryMoments: finishMoments(moments),
    mass: finishMass(mass),
    populations: { ...populations },
  };
}

export function runFormalInletMechanismCase(
  definition: CaseDefinition,
  provenance: CaseProvenance,
  a8jAnchor?: AnchorMetrics,
  a8kAnchor?: AnchorMetrics,
): CaseResult {
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: definition.nx,
    ny: definition.ny,
    relaxationTime: definition.relaxationTime,
    penalizationTimeSteps:
      CONTRACT.matrix.penalizationTimeStepsUnusedWithoutBody,
    maskHalfThickness:
      CONTRACT.matrix.maskHalfThicknessCellsUnusedWithoutBody,
    outerBoundary: CONTRACT.matrix.outerBoundary,
  });
  const envelope: MutableEnvelope = emptyEnvelope();
  const moments: MutableMoments = {
    density: emptyResidual(),
    ux: emptyResidual(),
    uy: emptyResidual(),
  };
  const initialMass = totalMass(solver.macroscopicCopies(null));
  const mass: MutableMass = {
    initialTotalMass: initialMass,
    finalTotalMass: initialMass,
    minimumTotalMass: initialMass,
    maximumTotalMass: initialMass,
    cumulativeBoundaryNetMassInput: 0,
  };
  const populations: MutablePopulations = {
    nonFiniteStateDetected: false,
    nonFinitePopulationObservationCount: 0,
    negativePopulationObservationCount: 0,
    maximumNegativePopulationCountPerStep: 0,
    minimumPopulation: Number.POSITIVE_INFINITY,
    minimumPopulationStep: 0,
    minimumPopulationCell: 0,
    minimumPopulationDirection: 0,
  };
  let completedSteps = 0;
  let status: "completed" | "failed" = "completed";
  let failure: { nextStep: number; name: string; message: string } | undefined;
  try {
    for (let step = 1; step <= definition.auditSteps; step += 1) {
      const inletVelocity = rampVelocity(
        CONTRACT.matrix.inletVelocityLattice,
        definition.rampSteps,
        step,
      );
      const pre = solver.macroscopicCopies(null);
      solver.step(null, inletVelocity);
      const checkpoint = solver.checkpoint();
      const rows = applyInletMechanism(
        checkpoint,
        definition,
        pre,
        inletVelocity,
      );
      updateMoments(moments, rows, step);
      scanPopulations(populations, checkpoint.distributions, step);
      if (definition.strategy !== "legacy-zou-he-derived-density") {
        solver.restore(checkpoint);
      }
      const field = solver.macroscopicCopies(null);
      updateEnvelope(envelope, field, definition.nx, step);
      updateMass(mass, field, solver.boundaryMassFlux(null).netInput);
      completedSteps = step;
    }
  } catch (error) {
    status = "failed";
    const message = error instanceof Error ? error.message : String(error);
    if (/non-finite|NaN|Infinity/i.test(message)) {
      populations.nonFiniteStateDetected = true;
    }
    failure = {
      nextStep: completedSteps + 1,
      name: error instanceof Error ? error.name : "UnknownError",
      message,
    };
  }
  const stability = completedSteps === 0 ? undefined : finishEnvelope(envelope);
  const diagnostics = completedSteps === 0
    ? undefined
    : finishDiagnostics(moments, mass, populations);
  const executionPass = status === "completed";
  const densityPass = stability !== undefined
    && stability.maximumDensityDeviation <= CONTRACT.gates.maximumDensityDeviation;
  const machPass = stability !== undefined
    && stability.maximumMach <= CONTRACT.gates.maximumMach;
  const result: CaseResult = {
    definition,
    provenance,
    run: {
      status,
      completedSteps,
      ...(stability === undefined ? {} : { stability }),
      ...(diagnostics === undefined ? {} : { diagnostics }),
      ...(failure === undefined ? {} : { failure }),
    },
    gate: {
      executionPass,
      densityPass,
      machPass,
      pass: executionPass && densityPass && machPass,
    },
  };
  if (a8jAnchor !== undefined) {
    result.a8jAnchorComparison = compareAnchor(
      completedSteps,
      stability,
      a8jAnchor,
    );
  }
  if (a8kAnchor !== undefined) {
    result.a8kAnchorComparison = compareAnchor(
      completedSteps,
      stability,
      a8kAnchor,
    );
  }
  return result;
}
