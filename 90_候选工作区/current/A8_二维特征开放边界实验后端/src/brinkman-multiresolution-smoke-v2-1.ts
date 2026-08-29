import {
  D2Q9MrtBrinkmanSolver,
  type LbmBodyKinematics,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import {
  BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT,
  buildBrinkmanMultiresolutionV2P1Definitions,
  type BrinkmanMultiresolutionV2P1Definition,
} from "./brinkman-multiresolution-contract-v2-1.ts";
import {
  BRINKMAN_MULTIRESOLUTION_V2P1_EXECUTION_SCOPES as EXECUTION_SCOPES,
  assertBrinkmanMultiresolutionV2P1ExecutionAuthorized,
  type BrinkmanMultiresolutionV2P1ExecutionScope,
} from "./brinkman-multiresolution-p1-v2-1.ts";
import {
  analyticCircleMask,
  assertExactMaskEquality,
  assertFiniteTree,
  compareForceIdentity,
  constructIndependentForceIdentityAudit,
  copyVerifiedFormalPopulations,
  prepareForceIdentityGeometry,
  type ForceIdentityComparison,
  type ForceIdentityGeometry,
  type Vector2,
} from "./brinkman-multiresolution-support-v2-1.ts";

export const BRINKMAN_MULTIRESOLUTION_V2P1_SMOKE_ACCEPTED_STEPS = 40 as const;

export type BrinkmanMultiresolutionV2P1SmokeScope =
  | typeof EXECUTION_SCOPES.forcedFixedCylinderSmoke40
  | typeof EXECUTION_SCOPES.unforcedBodyNullSmoke40;

export interface BrinkmanMultiresolutionV2P1SmokeRequest {
  scope: BrinkmanMultiresolutionV2P1SmokeScope;
  caseId:
    | "a8r-v2p1-formal-forced-fixed-cylinder-smoke-40"
    | "a8r-v2p1-formal-unforced-body-null-smoke-40";
  bodyKind: "fixed-cylinder" | "null";
  acceptedSteps: 40;
  definition: BrinkmanMultiresolutionV2P1Definition;
}

interface FormalMacroscopicCopies {
  rho: Float64Array;
  ux: Float64Array;
  uy: Float64Array;
  mask: Float64Array;
}

export interface BrinkmanMultiresolutionV2P1SmokeStepRecord {
  step: number;
  prePopulationStep: number;
  postPopulationStep: number;
  populationCheckpointElementwiseEqual: true;
  nonzeroMaskCellCount: number;
  reconstructedNonzeroForceCellCount: number;
  field: {
    minimumDensity: number;
    maximumDensity: number;
    maximumSpeed: number;
  };
  forceIdentity: {
    independent: {
      rawReaction: Vector2;
      independentlyRecomputedBrinkmanReaction: Vector2;
      fictitiousFluidCorrection: Vector2;
      correctedA2Load: Vector2;
      roundoffBounds: ForceIdentityComparison["independent"]["roundoffBounds"];
    };
    formal: ForceIdentityComparison["formal"];
    residuals: ForceIdentityComparison["residuals"];
    residualToBound: {
      rawX: number;
      rawY: number;
      fictitiousX: number;
      fictitiousY: number;
      correctedA2X: number;
      correctedA2Y: number;
    };
    formalRecompositionResidual: Vector2;
    gates: ForceIdentityComparison["gates"] & {
      formalRecompositionExact: boolean;
      bodyNullFormalRawReactionExactZero: boolean;
      bodyNullFormalA2CorrectionExactZero: boolean;
      bodyNullFormalCorrectedLoadExactZero: boolean;
      bodyNullIndependentMaskExactZero: boolean;
      bodyNullReconstructedForceCountExactZero: boolean;
      supportPass: boolean;
    };
  };
  finite: true;
  pass: boolean;
}

export interface BrinkmanMultiresolutionV2P1SmokeCaseResult {
  format: "VP-A8R-V2P1-FORMAL-40-STEP-SMOKE-CASE-v1";
  scope: BrinkmanMultiresolutionV2P1SmokeScope;
  caseId: BrinkmanMultiresolutionV2P1SmokeRequest["caseId"];
  bodyKind: BrinkmanMultiresolutionV2P1SmokeRequest["bodyKind"];
  definition: {
    sourceDefinitionId: string;
    diameterCells: 24;
    maskHalfThicknessCells: 0.75;
    penalizationTimeSteps: 1;
    phaseId: "baseline";
    bodyPhaseOffsetYCells: number;
    nx: number;
    ny: number;
    bodyCenterX: number;
    bodyCenterY: number;
    bodyRadius: number;
    relaxationTime: number;
    inletLatticeVelocity: 0.05;
    outerBoundary: "open-periodic-crossflow";
    initialization: "fresh-uniform-rho-1-ux-0p05-uy-0";
    checkpointRestoreUsed: false;
    acceptedSteps: 40;
  };
  solver: {
    constructedInsideCaseAdapter: true;
    initialStep: 0;
    completedSteps: 40;
  };
  controlVolume: {
    centerX: number;
    centerY: number;
    memberCount: number;
    surfaceAndOneLinkHaloCount: number;
    nonzeroMaskCellCount: number;
    everyNonzeroMaskCellInside: true;
    everyReconstructedNonzeroForceCellInside: true;
  };
  steps: BrinkmanMultiresolutionV2P1SmokeStepRecord[];
  summary: {
    acceptedSteps: 40;
    allPopulationCopiesVerified: boolean;
    allRawPopulationIdentityPass: boolean;
    allA2FormulaPass: boolean;
    allFormalRecompositionPass: boolean;
    allMaskAndForceSupportPass: boolean;
    allFinite: boolean;
    maximumAbsoluteResidual: {
      rawX: number;
      rawY: number;
      fictitiousX: number;
      fictitiousY: number;
      correctedA2X: number;
      correctedA2Y: number;
    };
    maximumResidualToBound: {
      rawX: number;
      rawY: number;
      fictitiousX: number;
      fictitiousY: number;
      correctedA2X: number;
      correctedA2Y: number;
    };
    bodyNullExactZeroGatesPass: boolean;
    pass: boolean;
  };
}

export type BrinkmanMultiresolutionV2P1SmokeExecutor = (
  request: BrinkmanMultiresolutionV2P1SmokeRequest,
) => BrinkmanMultiresolutionV2P1SmokeCaseResult;

class CompensatedSum {
  private sum = 0;
  private correction = 0;

  add(value: number): void {
    if (!Number.isFinite(value)) {
      throw new RangeError("A8R v2.1 smoke summand must be finite");
    }
    const next = this.sum + value;
    this.correction += Math.abs(this.sum) >= Math.abs(value)
      ? this.sum - next + value
      : value - next + this.sum;
    this.sum = next;
  }

  value(): number {
    const result = this.sum + this.correction;
    if (!Number.isFinite(result)) {
      throw new RangeError("A8R v2.1 smoke sum must be finite");
    }
    return result === 0 ? 0 : result;
  }
}

function exactD24Mask075BaselineDefinition():
BrinkmanMultiresolutionV2P1Definition {
  const matches = buildBrinkmanMultiresolutionV2P1Definitions().filter(
    (definition) => definition.diameterCells === 24
      && definition.maskHalfThicknessCells === 0.75
      && definition.phaseId === "baseline",
  );
  if (matches.length !== 1 || matches[0] === undefined) {
    throw new Error("A8R v2.1 exact D24 mask-0.75 baseline definition is absent");
  }
  return matches[0];
}

function assertExactSmokeStepCount(requestedSteps: number): asserts requestedSteps is 40 {
  if (requestedSteps !== BRINKMAN_MULTIRESOLUTION_V2P1_SMOKE_ACCEPTED_STEPS) {
    throw new RangeError(
      "A8R v2.1 smoke requires exactly 40 accepted steps; any other count is denied",
    );
  }
}

export function buildBrinkmanMultiresolutionV2P1SmokeRequests(
  requestedSteps = BRINKMAN_MULTIRESOLUTION_V2P1_SMOKE_ACCEPTED_STEPS,
): readonly [
  BrinkmanMultiresolutionV2P1SmokeRequest,
  BrinkmanMultiresolutionV2P1SmokeRequest,
] {
  assertExactSmokeStepCount(requestedSteps);
  const definition = exactD24Mask075BaselineDefinition();
  return [
    {
      scope: EXECUTION_SCOPES.forcedFixedCylinderSmoke40,
      caseId: "a8r-v2p1-formal-forced-fixed-cylinder-smoke-40",
      bodyKind: "fixed-cylinder",
      acceptedSteps: 40,
      definition,
    },
    {
      scope: EXECUTION_SCOPES.unforcedBodyNullSmoke40,
      caseId: "a8r-v2p1-formal-unforced-body-null-smoke-40",
      bodyKind: "null",
      acceptedSteps: 40,
      definition,
    },
  ];
}

function assertExactSmokeRequest(
  request: BrinkmanMultiresolutionV2P1SmokeRequest,
): void {
  const expected = buildBrinkmanMultiresolutionV2P1SmokeRequests().find(
    (candidate) => candidate.scope === request.scope,
  );
  if (expected === undefined
    || request.caseId !== expected.caseId
    || request.bodyKind !== expected.bodyKind
    || request.acceptedSteps !== expected.acceptedSteps) {
    throw new Error("A8R v2.1 smoke request identity differs from the frozen plan");
  }
  const actualDefinition = request.definition as unknown as Record<string, unknown>;
  const expectedDefinition = expected.definition as unknown as Record<string, unknown>;
  const actualKeys = Object.keys(actualDefinition).sort();
  const expectedKeys = Object.keys(expectedDefinition).sort();
  if (actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error("A8R v2.1 smoke definition fields differ from the frozen plan");
  }
  for (const key of expectedKeys) {
    if (!Object.is(actualDefinition[key], expectedDefinition[key])) {
      throw new Error(
        `A8R v2.1 smoke definition value differs from frozen: ${key}`,
      );
    }
  }
}

function bodyForRequest(
  request: BrinkmanMultiresolutionV2P1SmokeRequest,
): LbmBodyKinematics | null {
  if (request.bodyKind === "null") return null;
  return {
    centerX: request.definition.bodyCenterX,
    centerY: request.definition.bodyCenterY,
    radius: request.definition.bodyRadius,
    velocityX: 0,
    velocityY: 0,
  };
}

function formalFictitiousMomentum(view: FormalMacroscopicCopies): Vector2 {
  if (view.rho.length !== view.ux.length
    || view.rho.length !== view.uy.length
    || view.rho.length !== view.mask.length) {
    throw new RangeError("A8R v2.1 smoke macroscopic array lengths differ");
  }
  const x = new CompensatedSum();
  const y = new CompensatedSum();
  for (let cell = 0; cell < view.rho.length; cell += 1) {
    const density = view.rho[cell] ?? Number.NaN;
    const mask = view.mask[cell] ?? Number.NaN;
    const ux = view.ux[cell] ?? Number.NaN;
    const uy = view.uy[cell] ?? Number.NaN;
    x.add(mask * density * ux);
    y.add(mask * density * uy);
  }
  return { x: x.value(), y: y.value() };
}

function fieldSummary(view: FormalMacroscopicCopies): {
  minimumDensity: number;
  maximumDensity: number;
  maximumSpeed: number;
} {
  let minimumDensity = Number.POSITIVE_INFINITY;
  let maximumDensity = Number.NEGATIVE_INFINITY;
  let maximumSpeed = 0;
  for (let cell = 0; cell < view.rho.length; cell += 1) {
    const density = view.rho[cell] ?? Number.NaN;
    const ux = view.ux[cell] ?? Number.NaN;
    const uy = view.uy[cell] ?? Number.NaN;
    if (!(density > 0) || !Number.isFinite(density)
      || !Number.isFinite(ux) || !Number.isFinite(uy)) {
      throw new RangeError(`A8R v2.1 smoke field is invalid at cell ${cell}`);
    }
    minimumDensity = Math.min(minimumDensity, density);
    maximumDensity = Math.max(maximumDensity, density);
    maximumSpeed = Math.max(maximumSpeed, Math.hypot(ux, uy));
  }
  return { minimumDensity, maximumDensity, maximumSpeed };
}

function zeroVector(value: Vector2): boolean {
  return value.x === 0 && value.y === 0;
}

function ratio(value: number, bound: number): number {
  if (!(bound > 0) || !Number.isFinite(bound)) {
    throw new RangeError("A8R v2.1 smoke roundoff bound must be positive");
  }
  return Math.abs(value) / bound;
}

function residualToBound(comparison: ForceIdentityComparison) {
  const residual = comparison.residuals;
  const bounds = comparison.independent.roundoffBounds;
  return {
    rawX: ratio(residual.raw.x, bounds.raw.x),
    rawY: ratio(residual.raw.y, bounds.raw.y),
    fictitiousX: ratio(residual.fictitiousFluidCorrection.x, bounds.a2.x),
    fictitiousY: ratio(residual.fictitiousFluidCorrection.y, bounds.a2.y),
    correctedA2X: ratio(residual.correctedA2.x, bounds.a2.x),
    correctedA2Y: ratio(residual.correctedA2.y, bounds.a2.y),
  };
}

function maximums(
  records: readonly BrinkmanMultiresolutionV2P1SmokeStepRecord[],
  selector: (record: BrinkmanMultiresolutionV2P1SmokeStepRecord) =>
  BrinkmanMultiresolutionV2P1SmokeCaseResult["summary"]["maximumAbsoluteResidual"],
) {
  const result = {
    rawX: 0,
    rawY: 0,
    fictitiousX: 0,
    fictitiousY: 0,
    correctedA2X: 0,
    correctedA2Y: 0,
  };
  for (const record of records) {
    const value = selector(record);
    for (const key of Object.keys(result) as Array<keyof typeof result>) {
      result[key] = Math.max(result[key], Math.abs(value[key]));
    }
  }
  return result;
}

function geometryForRequest(
  request: BrinkmanMultiresolutionV2P1SmokeRequest,
  formalMask: Float64Array,
  body: LbmBodyKinematics | null,
): { independentMask: Float64Array; geometry: ForceIdentityGeometry } {
  const definition = request.definition;
  const independentMask = analyticCircleMask(
    definition.nx,
    definition.ny,
    body,
    definition.maskHalfThicknessCells,
  );
  assertExactMaskEquality(independentMask, formalMask);
  const geometry = prepareForceIdentityGeometry(
    definition.nx,
    definition.ny,
    definition.bodyCenterX,
    definition.bodyCenterY,
    definition.diameterCells,
    independentMask,
  );
  return { independentMask, geometry };
}

/** Independent 40-step adapter; it never calls the full research case. */
export function runBrinkmanMultiresolutionV2P1SmokeCase(
  request: BrinkmanMultiresolutionV2P1SmokeRequest,
): BrinkmanMultiresolutionV2P1SmokeCaseResult {
  assertExactSmokeStepCount(request.acceptedSteps);
  assertExactSmokeRequest(request);
  assertBrinkmanMultiresolutionV2P1ExecutionAuthorized(request.scope);
  if ((request.scope === EXECUTION_SCOPES.forcedFixedCylinderSmoke40)
      !== (request.bodyKind === "fixed-cylinder")) {
    throw new Error("A8R v2.1 smoke scope and body kind differ");
  }
  const definition = request.definition;
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: definition.nx,
    ny: definition.ny,
    relaxationTime: definition.relaxationTime,
    penalizationTimeSteps: definition.penalizationTimeSteps,
    outerBoundary: "open-periodic-crossflow",
    maskHalfThickness: definition.maskHalfThicknessCells,
  });
  solver.initializeUniform(CONTRACT.carrier.latticeVelocity, 0);
  if (solver.stepNumber !== 0) {
    throw new Error("A8R v2.1 smoke fresh solver did not start at step zero");
  }
  const body = bodyForRequest(request);
  const initialView = solver.macroscopicCopies(body);
  const { independentMask, geometry } = geometryForRequest(
    request,
    initialView.mask,
    body,
  );
  let beforeFictitious = formalFictitiousMomentum(initialView);
  const steps: BrinkmanMultiresolutionV2P1SmokeStepRecord[] = [];
  const coefficientScale = 0.5
    * CONTRACT.carrier.latticeVelocity ** 2
    * definition.diameterCells;

  for (let index = 0; index < request.acceptedSteps; index += 1) {
    const pre = copyVerifiedFormalPopulations(solver);
    if (pre.step !== index) {
      throw new Error("A8R v2.1 smoke pre-population step mismatch");
    }
    const exchange = solver.step(body, CONTRACT.carrier.latticeVelocity);
    const post = copyVerifiedFormalPopulations(solver);
    if (post.step !== index + 1) {
      throw new Error("A8R v2.1 smoke post-population step mismatch");
    }
    const independent = constructIndependentForceIdentityAudit({
      prePopulations: pre.distributions,
      postPopulations: post.distributions,
      geometry,
      penalizationTimeSteps: definition.penalizationTimeSteps,
      solidVelocity: { x: 0, y: 0 },
      inletVelocity: CONTRACT.carrier.latticeVelocity,
      diameterCells: definition.diameterCells,
    });

    // Formal values are read only after the complete independent construction.
    const afterView = solver.macroscopicCopies(body);
    assertExactMaskEquality(independentMask, afterView.mask);
    const afterFictitious = formalFictitiousMomentum(afterView);
    const comparison = compareForceIdentity(independent, {
      rawReaction: () => ({
        x: exchange.rawReactionImpulseX / coefficientScale,
        y: exchange.rawReactionImpulseY / coefficientScale,
      }),
      fictitiousFluidCorrection: () => ({
        x: (afterFictitious.x - beforeFictitious.x) / coefficientScale,
        y: (afterFictitious.y - beforeFictitious.y) / coefficientScale,
      }),
      correctedA2Load: () => {
        const raw = {
          x: exchange.rawReactionImpulseX / coefficientScale,
          y: exchange.rawReactionImpulseY / coefficientScale,
        };
        const correction = {
          x: (afterFictitious.x - beforeFictitious.x) / coefficientScale,
          y: (afterFictitious.y - beforeFictitious.y) / coefficientScale,
        };
        return {
          x: raw.x + correction.x,
          y: raw.y + correction.y,
        };
      },
    });
    const recomposed = {
      x: comparison.formal.rawReaction.x
        + comparison.formal.fictitiousFluidCorrection.x,
      y: comparison.formal.rawReaction.y
        + comparison.formal.fictitiousFluidCorrection.y,
    };
    const formalRecompositionResidual = {
      x: comparison.formal.correctedA2Load.x - recomposed.x,
      y: comparison.formal.correctedA2Load.y - recomposed.y,
    };
    const isBodyNull = request.bodyKind === "null";
    const bodyNullFormalRawReactionExactZero = !isBodyNull
      || zeroVector(comparison.formal.rawReaction);
    const bodyNullFormalA2CorrectionExactZero = !isBodyNull
      || zeroVector(comparison.formal.fictitiousFluidCorrection);
    const bodyNullFormalCorrectedLoadExactZero = !isBodyNull
      || zeroVector(comparison.formal.correctedA2Load);
    const bodyNullIndependentMaskExactZero = !isBodyNull
      || geometry.support.nonzeroMaskCellCount === 0;
    const bodyNullReconstructedForceCountExactZero = !isBodyNull
      || independent.reconstructedNonzeroForceCellCount === 0;
    const supportPass = isBodyNull
      ? geometry.support.nonzeroMaskCellCount === 0
        && independent.reconstructedNonzeroForceCellCount === 0
      : geometry.support.nonzeroMaskCellCount > 0
        && independent.reconstructedNonzeroForceCellCount > 0;
    const formalRecompositionExact = zeroVector(formalRecompositionResidual);
    const record: BrinkmanMultiresolutionV2P1SmokeStepRecord = {
      step: index + 1,
      prePopulationStep: pre.step,
      postPopulationStep: post.step,
      populationCheckpointElementwiseEqual: true,
      nonzeroMaskCellCount: geometry.support.nonzeroMaskCellCount,
      reconstructedNonzeroForceCellCount:
        independent.reconstructedNonzeroForceCellCount,
      field: fieldSummary(afterView),
      forceIdentity: {
        independent: {
          rawReaction: independent.rawReaction,
          independentlyRecomputedBrinkmanReaction:
            independent.independentlyRecomputedBrinkmanReaction,
          fictitiousFluidCorrection: independent.fictitiousFluidCorrection,
          correctedA2Load: independent.correctedA2Load,
          roundoffBounds: independent.roundoffBounds,
        },
        formal: comparison.formal,
        residuals: comparison.residuals,
        residualToBound: residualToBound(comparison),
        formalRecompositionResidual,
        gates: {
          ...comparison.gates,
          formalRecompositionExact,
          bodyNullFormalRawReactionExactZero,
          bodyNullFormalA2CorrectionExactZero,
          bodyNullFormalCorrectedLoadExactZero,
          bodyNullIndependentMaskExactZero,
          bodyNullReconstructedForceCountExactZero,
          supportPass,
        },
      },
      finite: true,
      pass: comparison.gates.pass
        && formalRecompositionExact
        && bodyNullFormalRawReactionExactZero
        && bodyNullFormalA2CorrectionExactZero
        && bodyNullFormalCorrectedLoadExactZero
        && bodyNullIndependentMaskExactZero
        && bodyNullReconstructedForceCountExactZero
        && supportPass,
    };
    assertFiniteTree(record, `smoke.${request.caseId}.step-${index + 1}`);
    steps.push(record);
    beforeFictitious = afterFictitious;
  }

  if (Number(solver.stepNumber)
      !== BRINKMAN_MULTIRESOLUTION_V2P1_SMOKE_ACCEPTED_STEPS
    || steps.length !== BRINKMAN_MULTIRESOLUTION_V2P1_SMOKE_ACCEPTED_STEPS) {
    throw new Error("A8R v2.1 smoke did not complete exactly 40 accepted steps");
  }
  if (request.bodyKind === "fixed-cylinder"
    && (geometry.support.nonzeroMaskCellCount === 0
      || steps.some((record) =>
        record.reconstructedNonzeroForceCellCount === 0))) {
    throw new Error("A8R v2.1 forced smoke lacks nonzero mask or force support");
  }
  const maximumAbsoluteResidual = maximums(steps, (record) => ({
    rawX: record.forceIdentity.residuals.raw.x,
    rawY: record.forceIdentity.residuals.raw.y,
    fictitiousX: record.forceIdentity.residuals.fictitiousFluidCorrection.x,
    fictitiousY: record.forceIdentity.residuals.fictitiousFluidCorrection.y,
    correctedA2X: record.forceIdentity.residuals.correctedA2.x,
    correctedA2Y: record.forceIdentity.residuals.correctedA2.y,
  }));
  const maximumResidualToBound = maximums(
    steps,
    (record) => record.forceIdentity.residualToBound,
  );
  const allRawPopulationIdentityPass = steps.every(
    (record) => record.forceIdentity.gates.rawPass,
  );
  const allA2FormulaPass = steps.every(
    (record) => record.forceIdentity.gates.a2Pass,
  );
  const allFormalRecompositionPass = steps.every(
    (record) => record.forceIdentity.gates.formalRecompositionExact,
  );
  const allMaskAndForceSupportPass = steps.every(
    (record) => record.forceIdentity.gates.supportPass,
  );
  const bodyNullExactZeroGatesPass = steps.every((record) =>
    record.forceIdentity.gates.bodyNullFormalRawReactionExactZero
      && record.forceIdentity.gates.bodyNullFormalA2CorrectionExactZero
      && record.forceIdentity.gates.bodyNullFormalCorrectedLoadExactZero
      && record.forceIdentity.gates.bodyNullIndependentMaskExactZero
      && record.forceIdentity.gates.bodyNullReconstructedForceCountExactZero);
  const pass = allRawPopulationIdentityPass
    && allA2FormulaPass
    && allFormalRecompositionPass
    && allMaskAndForceSupportPass
    && bodyNullExactZeroGatesPass
    && steps.every((record) => record.pass);
  const result: BrinkmanMultiresolutionV2P1SmokeCaseResult = {
    format: "VP-A8R-V2P1-FORMAL-40-STEP-SMOKE-CASE-v1",
    scope: request.scope,
    caseId: request.caseId,
    bodyKind: request.bodyKind,
    definition: {
      sourceDefinitionId: definition.id,
      diameterCells: 24,
      maskHalfThicknessCells: 0.75,
      penalizationTimeSteps: 1,
      phaseId: "baseline",
      bodyPhaseOffsetYCells: definition.bodyPhaseOffsetYCells,
      nx: definition.nx,
      ny: definition.ny,
      bodyCenterX: definition.bodyCenterX,
      bodyCenterY: definition.bodyCenterY,
      bodyRadius: definition.bodyRadius,
      relaxationTime: definition.relaxationTime,
      inletLatticeVelocity: 0.05,
      outerBoundary: "open-periodic-crossflow",
      initialization: "fresh-uniform-rho-1-ux-0p05-uy-0",
      checkpointRestoreUsed: false,
      acceptedSteps: 40,
    },
    solver: {
      constructedInsideCaseAdapter: true,
      initialStep: 0,
      completedSteps: 40,
    },
    controlVolume: {
      centerX: definition.bodyCenterX,
      centerY: definition.bodyCenterY,
      memberCount: geometry.support.memberCount,
      surfaceAndOneLinkHaloCount:
        geometry.support.surfaceAndOneLinkHaloCount,
      nonzeroMaskCellCount: geometry.support.nonzeroMaskCellCount,
      everyNonzeroMaskCellInside: true,
      everyReconstructedNonzeroForceCellInside: true,
    },
    steps,
    summary: {
      acceptedSteps: 40,
      allPopulationCopiesVerified: steps.every((record) =>
        record.populationCheckpointElementwiseEqual),
      allRawPopulationIdentityPass,
      allA2FormulaPass,
      allFormalRecompositionPass,
      allMaskAndForceSupportPass,
      allFinite: true,
      maximumAbsoluteResidual,
      maximumResidualToBound,
      bodyNullExactZeroGatesPass,
      pass,
    },
  };
  assertFiniteTree(result, `smoke.${request.caseId}`);
  return result;
}

export function runDualBrinkmanMultiresolutionV2P1Smoke(
  executor: BrinkmanMultiresolutionV2P1SmokeExecutor =
    runBrinkmanMultiresolutionV2P1SmokeCase,
): readonly [
  BrinkmanMultiresolutionV2P1SmokeCaseResult,
  BrinkmanMultiresolutionV2P1SmokeCaseResult,
] {
  const requests = buildBrinkmanMultiresolutionV2P1SmokeRequests();
  const first = executor(requests[0]);
  const second = executor(requests[1]);
  if (Object.is(first, second)) {
    throw new Error("A8R v2.1 dual smoke cases did not use independent executions");
  }
  return [first, second];
}

export function isSmokeScope(
  scope: BrinkmanMultiresolutionV2P1ExecutionScope,
): scope is BrinkmanMultiresolutionV2P1SmokeScope {
  return scope === EXECUTION_SCOPES.forcedFixedCylinderSmoke40
    || scope === EXECUTION_SCOPES.unforcedBodyNullSmoke40;
}
