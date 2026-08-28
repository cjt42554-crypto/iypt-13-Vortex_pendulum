import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED,
  type LbmBodyKinematics,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import {
  dominantStrouhal,
  summarizeCoefficients,
} from "../../A8_公开规定横移圆柱基准/src/benchmark-metrics.ts";
import {
  BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT,
  type BrinkmanMultiresolutionV2P1Definition,
} from "./brinkman-multiresolution-contract-v2-1.ts";
import {
  deriveBrinkmanScalingRunAnalysis,
  type BrinkmanScalingDerivedAnalysis,
  type BrinkmanScalingTraceRecord,
} from "./brinkman-scaling-runs.ts";
import type { BrinkmanScalingDefinition } from
  "./brinkman-scaling-contract.ts";
import {
  buildFieldDiagnosticLayout,
  captureFieldDiagnostic,
  formalMacroscopicView,
  type FieldDiagnosticLayout,
  type FieldDiagnosticSnapshot,
} from "./brinkman-scaling-support.ts";
import {
  analyzeCycleResolvedTrace,
  analyticCircleMask,
  assertExactMaskEquality,
  assertFiniteTree,
  compareForceIdentity,
  constructIndependentForceIdentityAudit,
  copyVerifiedFormalPopulations,
  prepareForceIdentityGeometry,
  type CycleResolvedAnalysis,
  type ForceIdentityComparison,
  type ForceIdentityGeometry,
} from "./brinkman-multiresolution-support-v2-1.ts";

export interface BrinkmanMultiresolutionV2P1WindowMetrics {
  samples: number;
  meanDrag: number;
  meanLift: number;
  rawLiftRms: number;
  demeanedLiftRms: number;
  strouhal: number;
  normalizedSpectralAmplitude: number;
}

export interface BrinkmanMultiresolutionV2P1TraceRecord
  extends BrinkmanScalingTraceRecord {
  forceIdentity: ForceIdentityComparison;
}

export interface BrinkmanMultiresolutionV2P1ForceIdentitySummary {
  analysisSteps: number;
  everyStepRawPass: boolean;
  everyStepA2Pass: boolean;
  everyStepPass: boolean;
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
}

export interface BrinkmanMultiresolutionV2P1CompletedRun
  extends BrinkmanScalingDerivedAnalysis {
  definition: BrinkmanMultiresolutionV2P1Definition;
  status: "completed";
  completedSteps: number;
  trajectoryCompleteAndFinite: true;
  numericalIdentity: {
    nx: number;
    ny: number;
    latticeVelocity: number;
    nominalLatticeMach: number;
    reynoldsNumber: number;
    relaxationTime: number;
    kinematicViscosity: number;
    penalizationTimeSteps: number;
    etaHat: number;
    penaltyLayerCells: number;
    penaltyLayerRelativeDiameter: number;
    maskHalfThicknessCells: number;
    outerBoundary: "open-periodic-crossflow";
    upstreamDiameters: number;
    downstreamDiameters: number;
    widthDiameters: number;
    diagnosticAdapter:
      "candidate-read-only-formal-runtime-macroscopic-array-view-v1";
  };
  a8rNumericalIdentity: {
    phaseId: BrinkmanMultiresolutionV2P1Definition["phaseId"];
    bodyPhaseOffsetYCells: number;
    phaseOffsetFromBaselineCells: number;
    maskToPenaltyLayerRatio: number;
    penaltyLayerAtLeastOneCell: boolean;
    populationAdapter:
      "candidate-read-only-runtime-distributions-verified-against-public-checkpoint-v1";
    forceIdentity:
      "closed-interior-D2Q9-link-control-volume-v2p1";
  };
  body: LbmBodyKinematics;
  geometry: {
    effectiveMaskArea: number;
    equivalentDiameterCells: number;
    relativeGeometryDeviation: number;
    absoluteRelativeGeometryDeviation: number;
    coreCellCount: number;
    transitionCellCount: number;
    maskDigestFnv1a32: string;
  };
  forceIdentityGeometry: {
    controlVolumeMemberCount: number;
    surfaceAndOneLinkHaloCount: number;
    nonzeroMaskCellCount: number;
    maximumSurfaceAndHaloMask: 0;
    everyNonzeroMaskCellInside: true;
    everyNonzeroForceCellInside: true;
  };
  window: {
    totalSteps: number;
    discardSteps: number;
    analysisSamples: number;
    totalConvectiveTime: number;
    discardConvectiveTime: number;
  };
  diagnosticWindows: {
    full: BrinkmanMultiresolutionV2P1WindowMetrics;
    secondHalf: BrinkmanMultiresolutionV2P1WindowMetrics;
    fourEqualBlocks: readonly [
      BrinkmanMultiresolutionV2P1WindowMetrics,
      BrinkmanMultiresolutionV2P1WindowMetrics,
      BrinkmanMultiresolutionV2P1WindowMetrics,
      BrinkmanMultiresolutionV2P1WindowMetrics,
    ];
  };
  trace: BrinkmanMultiresolutionV2P1TraceRecord[];
  extrema: {
    minimumDensity: number;
    maximumDensity: number;
    maximumSpeed: number;
    maximumMach: number;
    maximumDensityDeviation: number;
  };
  cycleResolved: CycleResolvedAnalysis;
  forceIdentitySummary: BrinkmanMultiresolutionV2P1ForceIdentitySummary;
  a8qGates: {
    executionPass: true;
    finitePass: true;
    densityPass: boolean;
    machPass: boolean;
    maturityPass: boolean;
    forceRecompositionPass: boolean;
    pass: boolean;
  };
  gates: {
    executionPass: true;
    finitePass: true;
    densityPass: boolean;
    machPass: boolean;
    maturityPass: boolean;
    forceRecompositionPass: boolean;
    windowCoveragePass: boolean;
    cycleCoveragePass: boolean;
    cyclePlausibilityPass: boolean;
    independentRawForceIdentityPass: boolean;
    independentA2FormulaPass: boolean;
    pass: boolean;
  };
}

export interface BrinkmanMultiresolutionV2P1FailedRun {
  definition: BrinkmanMultiresolutionV2P1Definition;
  status: "failed";
  completedSteps: number;
  trajectoryCompleteAndFinite: false;
  failure: string;
}

export type BrinkmanMultiresolutionV2P1RunResult =
  | BrinkmanMultiresolutionV2P1CompletedRun
  | BrinkmanMultiresolutionV2P1FailedRun;

export interface BrinkmanMultiresolutionV2P1Progress {
  caseId: string;
  completedSteps: number;
  totalSteps: number;
}

function bodyForDefinition(
  definition: BrinkmanMultiresolutionV2P1Definition,
): LbmBodyKinematics {
  return {
    centerX: definition.bodyCenterX,
    centerY: definition.bodyCenterY,
    radius: definition.bodyRadius,
    velocityX: 0,
    velocityY: 0,
  };
}

function numericalIdentity(
  definition: BrinkmanMultiresolutionV2P1Definition,
): BrinkmanMultiresolutionV2P1CompletedRun["numericalIdentity"] {
  return {
    nx: definition.nx,
    ny: definition.ny,
    latticeVelocity: CONTRACT.carrier.latticeVelocity,
    nominalLatticeMach: CONTRACT.carrier.nominalLatticeMach,
    reynoldsNumber: CONTRACT.carrier.reynoldsNumber,
    relaxationTime: definition.relaxationTime,
    kinematicViscosity: definition.kinematicViscosity,
    penalizationTimeSteps: definition.penalizationTimeSteps,
    etaHat: definition.etaHat,
    penaltyLayerCells: definition.penaltyLayerCells,
    penaltyLayerRelativeDiameter:
      definition.penaltyLayerRelativeDiameter,
    maskHalfThicknessCells: definition.maskHalfThicknessCells,
    outerBoundary: "open-periodic-crossflow",
    upstreamDiameters: CONTRACT.carrier.upstreamDiameters,
    downstreamDiameters: CONTRACT.carrier.downstreamDiameters,
    widthDiameters: CONTRACT.carrier.widthDiameters,
    diagnosticAdapter:
      "candidate-read-only-formal-runtime-macroscopic-array-view-v1",
  };
}

function geometryRecord(
  layout: FieldDiagnosticLayout,
): BrinkmanMultiresolutionV2P1CompletedRun["geometry"] {
  return {
    effectiveMaskArea: layout.effectiveMaskArea,
    equivalentDiameterCells: layout.equivalentDiameterCells,
    relativeGeometryDeviation: layout.relativeGeometryDeviation,
    absoluteRelativeGeometryDeviation:
      layout.absoluteRelativeGeometryDeviation,
    coreCellCount: layout.coreCellCount,
    transitionCellCount: layout.transitionCellCount,
    maskDigestFnv1a32: layout.maskDigestFnv1a32,
  };
}

function forceIdentityGeometryRecord(
  geometry: ForceIdentityGeometry,
): BrinkmanMultiresolutionV2P1CompletedRun["forceIdentityGeometry"] {
  return {
    controlVolumeMemberCount: geometry.support.memberCount,
    surfaceAndOneLinkHaloCount:
      geometry.support.surfaceAndOneLinkHaloCount,
    nonzeroMaskCellCount: geometry.support.nonzeroMaskCellCount,
    maximumSurfaceAndHaloMask:
      geometry.support.maximumSurfaceAndHaloMask,
    everyNonzeroMaskCellInside:
      geometry.support.everyNonzeroMaskCellInside,
    everyNonzeroForceCellInside:
      geometry.support.everyNonzeroForceCellInside,
  };
}

function emptyExtrema(): BrinkmanMultiresolutionV2P1CompletedRun["extrema"] {
  return {
    minimumDensity: Number.POSITIVE_INFINITY,
    maximumDensity: Number.NEGATIVE_INFINITY,
    maximumSpeed: 0,
    maximumMach: 0,
    maximumDensityDeviation: 0,
  };
}

function includeExtrema(
  extrema: BrinkmanMultiresolutionV2P1CompletedRun["extrema"],
  snapshot: FieldDiagnosticSnapshot,
): void {
  extrema.minimumDensity = Math.min(
    extrema.minimumDensity,
    snapshot.minimumDensity,
  );
  extrema.maximumDensity = Math.max(
    extrema.maximumDensity,
    snapshot.maximumDensity,
  );
  extrema.maximumSpeed = Math.max(extrema.maximumSpeed, snapshot.maximumSpeed);
  extrema.maximumMach = extrema.maximumSpeed / LATTICE_SOUND_SPEED;
  extrema.maximumDensityDeviation = Math.max(
    Math.abs(extrema.minimumDensity - 1),
    Math.abs(extrema.maximumDensity - 1),
  );
}

function windowMetrics(
  trace: readonly BrinkmanMultiresolutionV2P1TraceRecord[],
  diameterCells: number,
): BrinkmanMultiresolutionV2P1WindowMetrics {
  const samples = trace.map((record) => ({
    drag: record.correctedLoad.x,
    lift: record.correctedLoad.y,
  }));
  const summary = summarizeCoefficients(samples);
  const spectrum = dominantStrouhal(
    samples.map((sample) => sample.lift),
    CONTRACT.carrier.latticeVelocity / diameterCells,
    CONTRACT.carrier.spectrumSearch.strouhalMinimum,
    CONTRACT.carrier.spectrumSearch.strouhalMaximum,
    CONTRACT.carrier.spectrumSearch.strouhalIncrement,
  );
  return {
    samples: summary.samples,
    meanDrag: summary.meanDrag,
    meanLift: summary.meanLift,
    rawLiftRms: summary.liftRms,
    demeanedLiftRms: summary.liftFluctuationRms,
    strouhal: spectrum.strouhal,
    normalizedSpectralAmplitude: spectrum.normalizedAmplitude,
  };
}

export function deriveBrinkmanMultiresolutionV2P1DiagnosticWindows(
  trace: readonly BrinkmanMultiresolutionV2P1TraceRecord[],
  definition: BrinkmanMultiresolutionV2P1Definition,
): BrinkmanMultiresolutionV2P1CompletedRun["diagnosticWindows"] {
  const half = definition.halfWindowSamples;
  const block = definition.diagnosticBlockSamples;
  if (trace.length !== definition.analysisSamples
    || half * 2 !== trace.length
    || block * 4 !== trace.length) {
    throw new Error("A8R v2.1 full, half, or four-block coverage mismatch");
  }
  return {
    full: windowMetrics(trace, definition.diameterCells),
    secondHalf: windowMetrics(trace.slice(half), definition.diameterCells),
    fourEqualBlocks: [
      windowMetrics(trace.slice(0, block), definition.diameterCells),
      windowMetrics(trace.slice(block, 2 * block), definition.diameterCells),
      windowMetrics(trace.slice(2 * block, 3 * block), definition.diameterCells),
      windowMetrics(trace.slice(3 * block, 4 * block), definition.diameterCells),
    ],
  };
}

export function deriveBrinkmanMultiresolutionV2P1ForceIdentitySummary(
  trace: readonly BrinkmanMultiresolutionV2P1TraceRecord[],
): BrinkmanMultiresolutionV2P1ForceIdentitySummary {
  const maximumAbsoluteResidual = {
    rawX: 0,
    rawY: 0,
    fictitiousX: 0,
    fictitiousY: 0,
    correctedA2X: 0,
    correctedA2Y: 0,
  };
  const maximumResidualToBound = { ...maximumAbsoluteResidual };
  for (const record of trace) {
    const identity = record.forceIdentity;
    const rawBound = identity.independent.roundoffBounds.raw;
    const a2Bound = identity.independent.roundoffBounds.a2;
    const residual = identity.residuals;
    const entries = [
      ["rawX", residual.raw.x, rawBound.x],
      ["rawY", residual.raw.y, rawBound.y],
      ["fictitiousX", residual.fictitiousFluidCorrection.x, a2Bound.x],
      ["fictitiousY", residual.fictitiousFluidCorrection.y, a2Bound.y],
      ["correctedA2X", residual.correctedA2.x, a2Bound.x],
      ["correctedA2Y", residual.correctedA2.y, a2Bound.y],
    ] as const;
    for (const [key, value, bound] of entries) {
      const absolute = Math.abs(value);
      maximumAbsoluteResidual[key] = Math.max(
        maximumAbsoluteResidual[key],
        absolute,
      );
      maximumResidualToBound[key] = Math.max(
        maximumResidualToBound[key],
        absolute / bound,
      );
    }
  }
  const everyStepRawPass = trace.every((record) =>
    record.forceIdentity.gates.rawPass);
  const everyStepA2Pass = trace.every((record) =>
    record.forceIdentity.gates.a2Pass);
  return {
    analysisSteps: trace.length,
    everyStepRawPass,
    everyStepA2Pass,
    everyStepPass: everyStepRawPass
      && everyStepA2Pass
      && trace.every((record) => record.forceIdentity.gates.pass),
    maximumAbsoluteResidual,
    maximumResidualToBound,
  };
}

function a8qDefinitionAdapter(
  definition: BrinkmanMultiresolutionV2P1Definition,
): BrinkmanScalingDefinition {
  // The frozen A8Q derivation reads only the shared numerical fields. This
  // adapter deliberately preserves that implementation to make the D24
  // common projection byte-for-byte comparable after canonical JSON parsing.
  return definition as unknown as BrinkmanScalingDefinition;
}

function failureMessage(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

export function isCompletedBrinkmanMultiresolutionV2P1Run(
  run: BrinkmanMultiresolutionV2P1RunResult,
): run is BrinkmanMultiresolutionV2P1CompletedRun {
  return run.status === "completed";
}

/**
 * Defines the authorized adapter but performs work only when explicitly
 * called by the locked research runner after a later Pro release.
 */
export function runBrinkmanMultiresolutionV2P1Case(
  definition: BrinkmanMultiresolutionV2P1Definition,
  onProgress:
    ((progress: BrinkmanMultiresolutionV2P1Progress) => void) | null = null,
): BrinkmanMultiresolutionV2P1RunResult {
  let solver: D2Q9MrtBrinkmanSolver | undefined;
  try {
    solver = new D2Q9MrtBrinkmanSolver({
      nx: definition.nx,
      ny: definition.ny,
      relaxationTime: definition.relaxationTime,
      penalizationTimeSteps: definition.penalizationTimeSteps,
      outerBoundary: "open-periodic-crossflow",
      maskHalfThickness: definition.maskHalfThicknessCells,
    });
    const body = bodyForDefinition(definition);
    solver.initializeUniform(CONTRACT.carrier.latticeVelocity, 0);
    let view = formalMacroscopicView(solver, body);
    const layout = buildFieldDiagnosticLayout(
      view,
      definition.diameterCells,
    );
    const independentMask = analyticCircleMask(
      definition.nx,
      definition.ny,
      body,
      definition.maskHalfThicknessCells,
    );
    assertExactMaskEquality(independentMask, view.mask);
    const identityGeometry = prepareForceIdentityGeometry(
      definition.nx,
      definition.ny,
      definition.bodyCenterX,
      definition.bodyCenterY,
      definition.diameterCells,
      independentMask,
    );
    let before = captureFieldDiagnostic(
      view,
      layout,
      CONTRACT.carrier.latticeVelocity,
    );
    const extrema = emptyExtrema();
    includeExtrema(extrema, before);
    const trace: BrinkmanMultiresolutionV2P1TraceRecord[] = [];
    const coefficientScale = 0.5
      * CONTRACT.carrier.latticeVelocity ** 2
      * definition.diameterCells;
    const progressStride = Math.max(1, Math.floor(definition.totalSteps / 100));
    for (let step = 0; step < definition.totalSteps; step += 1) {
      const analysisStep = step + 1 > definition.discardSteps;
      const prePopulations = analysisStep
        ? copyVerifiedFormalPopulations(solver)
        : null;
      const exchange = solver.step(body, CONTRACT.carrier.latticeVelocity);
      let independentIdentity = null;
      if (analysisStep) {
        const postPopulations = copyVerifiedFormalPopulations(solver);
        if (prePopulations === null
          || prePopulations.step !== step
          || postPopulations.step !== step + 1) {
          throw new Error("A8R v2.1 population checkpoint step mismatch");
        }
        independentIdentity = constructIndependentForceIdentityAudit({
          prePopulations: prePopulations.distributions,
          postPopulations: postPopulations.distributions,
          geometry: identityGeometry,
          penalizationTimeSteps: definition.penalizationTimeSteps,
          solidVelocity: { x: body.velocityX, y: body.velocityY },
          inletVelocity: CONTRACT.carrier.latticeVelocity,
          diameterCells: definition.diameterCells,
        });
      }
      // This is intentionally after the full independent population audit.
      view = formalMacroscopicView(solver, body);
      const after = captureFieldDiagnostic(
        view,
        layout,
        CONTRACT.carrier.latticeVelocity,
      );
      includeExtrema(extrema, after);
      if (analysisStep) {
        if (independentIdentity === null) {
          throw new Error("A8R v2.1 independent force identity is missing");
        }
        const forceIdentity = compareForceIdentity(independentIdentity, {
          rawReaction: () => ({
            x: exchange.rawReactionImpulseX / coefficientScale,
            y: exchange.rawReactionImpulseY / coefficientScale,
          }),
          fictitiousFluidCorrection: () => ({
            x: (after.fictitiousMomentumX - before.fictitiousMomentumX)
              / coefficientScale,
            y: (after.fictitiousMomentumY - before.fictitiousMomentumY)
              / coefficientScale,
          }),
          correctedA2Load: () => {
            const rawX = exchange.rawReactionImpulseX / coefficientScale;
            const rawY = exchange.rawReactionImpulseY / coefficientScale;
            const correctionX = (
              after.fictitiousMomentumX - before.fictitiousMomentumX
            ) / coefficientScale;
            const correctionY = (
              after.fictitiousMomentumY - before.fictitiousMomentumY
            ) / coefficientScale;
            return {
              x: rawX + correctionX,
              y: rawY + correctionY,
            };
          },
        });
        const rawReaction = forceIdentity.formal.rawReaction;
        const fictitiousFluidCorrection =
          forceIdentity.formal.fictitiousFluidCorrection;
        const correctedLoad = forceIdentity.formal.correctedA2Load;
        trace.push({
          step: step + 1,
          convectiveTime: (step + 1)
            * CONTRACT.carrier.latticeVelocity
            / definition.diameterCells,
          rawReaction,
          fictitiousFluidCorrection,
          correctedLoad,
          coreDensityWeight: after.coreDensityWeight,
          coreSlipSquaredNumerator: after.coreSlipSquaredNumerator,
          coreSlipRms: after.coreSlipRms,
          coreSlipMaximum: after.coreSlipMaximum,
          transitionDensityWeight: after.transitionDensityWeight,
          transitionSlipSquaredNumerator:
            after.transitionSlipSquaredNumerator,
          transitionSlipRms: after.transitionSlipRms,
          transitionSlipMaximum: after.transitionSlipMaximum,
          forceIdentity,
        });
      }
      before = after;
      if ((step + 1) % progressStride === 0
        || step + 1 === definition.totalSteps) {
        onProgress?.({
          caseId: definition.id,
          completedSteps: step + 1,
          totalSteps: definition.totalSteps,
        });
      }
    }
    const derived = deriveBrinkmanScalingRunAnalysis(
      trace,
      a8qDefinitionAdapter(definition),
    );
    const windows = deriveBrinkmanMultiresolutionV2P1DiagnosticWindows(
      trace,
      definition,
    );
    const cycleResolved = analyzeCycleResolvedTrace(trace.map((record) => ({
      time: record.convectiveTime,
      drag: record.correctedLoad.x,
      lift: record.correctedLoad.y,
    })));
    const identitySummary =
      deriveBrinkmanMultiresolutionV2P1ForceIdentitySummary(trace);
    const densityPass = extrema.maximumDensityDeviation
      <= CONTRACT.gates.maximumDensityDeviation;
    const machPass = extrema.maximumMach <= CONTRACT.gates.maximumMach;
    const maturityPass = derived.metrics.liftRms
      > CONTRACT.gates.maturity.minimumRawLiftRms
      && derived.maturity.meanDragHalfDrift
        <= CONTRACT.gates.maturity.maximumMeanDragHalfDrift
      && derived.maturity.liftRmsHalfDrift
        <= CONTRACT.gates.maturity.maximumRawLiftRmsHalfDrift;
    if (maturityPass !== derived.maturity.passed) {
      throw new Error("A8R v2.1 maturity mapping differs from frozen A8Q");
    }
    const a8qGatePass = densityPass
      && machPass
      && derived.maturity.passed
      && derived.recomposition.passed;
    const a8qGates = {
      executionPass: true as const,
      finitePass: true as const,
      densityPass,
      machPass,
      maturityPass: derived.maturity.passed,
      forceRecompositionPass: derived.recomposition.passed,
      pass: a8qGatePass,
    };
    const windowCoveragePass = trace.length === definition.analysisSamples
      && windows.secondHalf.samples === definition.halfWindowSamples
      && windows.fourEqualBlocks.every((block) =>
        block.samples === definition.diagnosticBlockSamples);
    const cycleCoveragePass = cycleResolved.complete
      && cycleResolved.cycles.length
        === CONTRACT.windows.cycleResolved.retainedCompleteCycles;
    const cyclePlausibilityPass = cycleResolved.complete
      && cycleResolved.periods.every((period) =>
        period >= CONTRACT.windows.cycleResolved.crossingPlausibility
          .periodMinimumInclusive
        && period <= CONTRACT.windows.cycleResolved.crossingPlausibility
          .periodMaximumInclusive);
    const pass = a8qGatePass
      && windowCoveragePass
      && cycleCoveragePass
      && cyclePlausibilityPass
      && identitySummary.everyStepRawPass
      && identitySummary.everyStepA2Pass;
    const result: BrinkmanMultiresolutionV2P1CompletedRun = {
      definition,
      status: "completed",
      completedSteps: solver.stepNumber,
      trajectoryCompleteAndFinite: true,
      numericalIdentity: numericalIdentity(definition),
      a8rNumericalIdentity: {
        phaseId: definition.phaseId,
        bodyPhaseOffsetYCells: definition.bodyPhaseOffsetYCells,
        phaseOffsetFromBaselineCells: definition.phaseOffsetFromBaselineCells,
        maskToPenaltyLayerRatio: definition.maskToPenaltyLayerRatio,
        penaltyLayerAtLeastOneCell: definition.penaltyLayerAtLeastOneCell,
        populationAdapter:
          "candidate-read-only-runtime-distributions-verified-against-public-checkpoint-v1",
        forceIdentity: "closed-interior-D2Q9-link-control-volume-v2p1",
      },
      body,
      geometry: geometryRecord(layout),
      forceIdentityGeometry: forceIdentityGeometryRecord(identityGeometry),
      window: {
        totalSteps: definition.totalSteps,
        discardSteps: definition.discardSteps,
        analysisSamples: trace.length,
        totalConvectiveTime: CONTRACT.carrier.totalConvectiveTime,
        discardConvectiveTime: CONTRACT.carrier.discardConvectiveTime,
      },
      diagnosticWindows: windows,
      trace,
      ...derived,
      extrema,
      cycleResolved,
      forceIdentitySummary: identitySummary,
      a8qGates,
      gates: {
        executionPass: true,
        finitePass: true,
        densityPass,
        machPass,
        maturityPass,
        forceRecompositionPass: derived.recomposition.passed,
        windowCoveragePass,
        cycleCoveragePass,
        cyclePlausibilityPass,
        independentRawForceIdentityPass:
          identitySummary.everyStepRawPass,
        independentA2FormulaPass: identitySummary.everyStepA2Pass,
        pass,
      },
    };
    assertFiniteTree(result);
    return result;
  } catch (error) {
    return {
      definition,
      status: "failed",
      completedSteps: solver?.stepNumber ?? 0,
      trajectoryCompleteAndFinite: false,
      failure: failureMessage(error),
    };
  }
}
