import { D2Q9MrtBrinkmanSolver } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { computeRightCbc2dTargets } from "./characteristic-boundary.ts";
import { CS } from "./d2q9.ts";
import { FORMAL_BOUNDARY_FACTORIZATION_CONTRACT as CONTRACT } from
  "./formal-boundary-factorization-contract.ts";
import {
  applyRegularizedBoundary,
  emptyEnvelope,
  finishEnvelope,
  rampVelocity,
  updateEnvelope,
} from "./formal-boundary-factorization-boundaries.ts";
import type {
  A8jAnchor,
  CaseDefinition,
  CaseResult,
} from "./formal-boundary-factorization-types.ts";

function compareAnchor(result: CaseResult, anchor: A8jAnchor): string[] {
  if (result.run.stability === undefined) return ["stability"];
  const mismatch: string[] = [];
  if (result.run.completedSteps !== anchor.completedSteps) mismatch.push("completedSteps");
  const actual = result.run.stability;
  const expected = anchor.stability;
  for (const field of [
    "maximumDensityDeviation",
    "maximumDensityDeviationStep",
    "maximumMach",
    "maximumMachStep",
    "minimumDensity",
    "maximumDensity",
  ] as const) {
    if (actual[field] !== expected[field]) mismatch.push(field);
  }
  for (const field of [
    "kind",
    "density",
    "x",
    "y",
    "brinkmanMaskIndicator",
  ] as const) {
    if (actual.densityExtremum[field] !== expected.densityExtremum[field]) {
      mismatch.push(`densityExtremum.${field}`);
    }
  }
  return mismatch;
}

export function runFormalBoundaryFactorizationCase(
  definition: CaseDefinition,
  anchor?: A8jAnchor,
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
  const envelope = emptyEnvelope();
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
      const cbcTargets = definition.outletBoundary === "cbc-2d-regularized"
        ? computeRightCbc2dTargets(
          definition.nx,
          definition.ny,
          pre.rho,
          pre.ux,
          pre.uy,
          {
            farFieldDensity: CONTRACT.matrix.cbc.farFieldDensity,
            meanStreamwiseVelocity: inletVelocity,
            characteristicLength: definition.nx,
            pressureRelaxationSigma:
              CONTRACT.matrix.cbc.pressureRelaxationSigma,
            transverseRelaxation: Math.abs(inletVelocity) / CS,
          },
        ).states
        : undefined;
      solver.step(null, inletVelocity);
      if (definition.inletBoundary === "regularized-prescribed-state"
        || cbcTargets !== undefined) {
        const checkpoint = solver.checkpoint();
        if (definition.inletBoundary === "regularized-prescribed-state") {
          applyRegularizedBoundary(
            checkpoint,
            definition,
            pre,
            0,
            Array.from({ length: definition.ny }, () => ({
              rho: 1,
              ux: inletVelocity,
              uy: 0,
            })),
            "left",
          );
        }
        if (cbcTargets !== undefined) {
          applyRegularizedBoundary(
            checkpoint,
            definition,
            pre,
            definition.nx - 1,
            cbcTargets,
            "right",
          );
        }
        solver.restore(checkpoint);
      }
      updateEnvelope(
        envelope,
        solver.macroscopicCopies(null),
        definition.nx,
        step,
      );
      completedSteps = step;
    }
  } catch (error) {
    status = "failed";
    failure = {
      nextStep: completedSteps + 1,
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  const stability = completedSteps === 0 ? undefined : finishEnvelope(envelope);
  const executionPass = status === "completed";
  const densityPass = stability !== undefined
    && stability.maximumDensityDeviation <= CONTRACT.gates.maximumDensityDeviation;
  const machPass = stability !== undefined
    && stability.maximumMach <= CONTRACT.gates.maximumMach;
  const result: CaseResult = {
    definition,
    run: {
      status,
      completedSteps,
      ...(stability === undefined ? {} : { stability }),
      ...(failure === undefined ? {} : { failure }),
    },
    gate: {
      executionPass,
      densityPass,
      machPass,
      pass: executionPass && densityPass && machPass,
    },
  };
  if (anchor !== undefined) {
    const mismatchFields = compareAnchor(result, anchor);
    result.baselineComparison = {
      checked: true,
      exactMatch: mismatchFields.length === 0,
      mismatchFields,
    };
  }
  return result;
}
