import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED,
  type LbmBodyKinematics,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import {
  FIXED_TARGET,
} from "../../A8_公开规定横移圆柱基准/src/benchmark-contract.ts";
import {
  dominantStrouhal,
  summarizeCoefficients,
  type CoefficientSummary,
} from "../../A8_公开规定横移圆柱基准/src/benchmark-metrics.ts";
import {
  BRINKMAN_SCALING_CONTRACT as CONTRACT,
  type BrinkmanScalingDefinition,
} from "./brinkman-scaling-contract.ts";
import {
  assertFiniteTree,
  buildFieldDiagnosticLayout,
  captureFieldDiagnostic,
  formalMacroscopicView,
  relativeDifference,
  summarizeSlipTrace,
  summarizeVectorCoefficients,
  type FieldDiagnosticLayout,
  type FieldDiagnosticSnapshot,
  type SlipTraceRecord,
  type SlipWindowSummary,
  type VectorCoefficientRecord,
  type VectorCoefficientSummary,
} from "./brinkman-scaling-support.ts";

export interface BrinkmanScalingTraceRecord extends SlipTraceRecord {
  step: number;
  convectiveTime: number;
  rawReaction: VectorCoefficientRecord;
  fictitiousFluidCorrection: VectorCoefficientRecord;
  correctedLoad: VectorCoefficientRecord;
}

export interface VectorSummaryDrift {
  meanX: number;
  meanY: number;
  rmsX: number;
  rmsY: number;
  fluctuationRmsX: number;
  fluctuationRmsY: number;
}

export interface ForceWindowSummary {
  rawReaction: VectorCoefficientSummary;
  fictitiousFluidCorrection: VectorCoefficientSummary;
  correctedLoad: VectorCoefficientSummary;
}

export interface ForceDecompositionSummary {
  full: ForceWindowSummary;
  firstHalf: ForceWindowSummary;
  secondHalf: ForceWindowSummary;
  halfDrift: {
    rawReaction: VectorSummaryDrift;
    fictitiousFluidCorrection: VectorSummaryDrift;
    correctedLoad: VectorSummaryDrift;
  };
}

export interface SlipDecompositionSummary {
  full: SlipWindowSummary;
  firstHalf: SlipWindowSummary;
  secondHalf: SlipWindowSummary;
  halfDrift: {
    coreDensityWeightedRms: number;
    coreMaximumPointwise: number;
    transitionDensityWeightedRms: number;
    transitionMaximumPointwise: number;
  };
}

export interface BrinkmanScalingRunExtrema {
  minimumDensity: number;
  maximumDensity: number;
  maximumSpeed: number;
  maximumMach: number;
  maximumDensityDeviation: number;
}

export interface BrinkmanScalingLiteratureComparison {
  meanDragError: number;
  liftRmsError: number;
  strouhalError: number;
  meanDragPassed: boolean;
  liftRmsPassed: boolean;
  strouhalPassed: boolean;
  passed: boolean;
}

export interface BrinkmanScalingDerivedAnalysis {
  forceDecomposition: ForceDecompositionSummary;
  slip: SlipDecompositionSummary;
  metrics: CoefficientSummary & {
    strouhal: number;
    spectralLiftAmplitude: number;
  };
  maturity: {
    meanDragHalfDrift: number;
    liftRmsHalfDrift: number;
    passed: boolean;
  };
  literature: BrinkmanScalingLiteratureComparison;
  recomposition: {
    maximumAbsoluteResidual: number;
    maximumResidualToAllowedBound: number;
    passed: boolean;
  };
}

export interface BrinkmanScalingCompletedRun
  extends BrinkmanScalingDerivedAnalysis {
  definition: BrinkmanScalingDefinition;
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
  window: {
    totalSteps: number;
    discardSteps: number;
    analysisSamples: number;
    totalConvectiveTime: number;
    discardConvectiveTime: number;
  };
  trace: BrinkmanScalingTraceRecord[];
  extrema: BrinkmanScalingRunExtrema;
  gates: {
    executionPass: true;
    finitePass: true;
    densityPass: boolean;
    machPass: boolean;
    maturityPass: boolean;
    forceRecompositionPass: boolean;
    pass: boolean;
  };
}

export interface BrinkmanScalingFailedRun {
  definition: BrinkmanScalingDefinition;
  status: "failed";
  completedSteps: number;
  trajectoryCompleteAndFinite: false;
  failure: string;
}

export type BrinkmanScalingRunResult =
  | BrinkmanScalingCompletedRun
  | BrinkmanScalingFailedRun;

export interface BrinkmanScalingProgress {
  caseId: string;
  completedSteps: number;
  totalSteps: number;
}

function bodyForDefinition(
  definition: BrinkmanScalingDefinition,
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
  definition: BrinkmanScalingDefinition,
): BrinkmanScalingCompletedRun["numericalIdentity"] {
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
): BrinkmanScalingCompletedRun["geometry"] {
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

function emptyExtrema(): BrinkmanScalingRunExtrema {
  return {
    minimumDensity: Number.POSITIVE_INFINITY,
    maximumDensity: Number.NEGATIVE_INFINITY,
    maximumSpeed: 0,
    maximumMach: 0,
    maximumDensityDeviation: 0,
  };
}

function includeExtrema(
  extrema: BrinkmanScalingRunExtrema,
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

function vectorRecords(
  trace: readonly BrinkmanScalingTraceRecord[],
  key: "rawReaction" | "fictitiousFluidCorrection" | "correctedLoad",
): VectorCoefficientRecord[] {
  return trace.map((record) => record[key]);
}

function forceWindow(
  trace: readonly BrinkmanScalingTraceRecord[],
): ForceWindowSummary {
  return {
    rawReaction: summarizeVectorCoefficients(
      vectorRecords(trace, "rawReaction"),
    ),
    fictitiousFluidCorrection: summarizeVectorCoefficients(
      vectorRecords(trace, "fictitiousFluidCorrection"),
    ),
    correctedLoad: summarizeVectorCoefficients(
      vectorRecords(trace, "correctedLoad"),
    ),
  };
}

function vectorDrift(
  first: VectorCoefficientSummary,
  second: VectorCoefficientSummary,
): VectorSummaryDrift {
  return {
    meanX: relativeDifference(first.meanX, second.meanX),
    meanY: relativeDifference(first.meanY, second.meanY),
    rmsX: relativeDifference(first.rmsX, second.rmsX),
    rmsY: relativeDifference(first.rmsY, second.rmsY),
    fluctuationRmsX: relativeDifference(
      first.fluctuationRmsX,
      second.fluctuationRmsX,
    ),
    fluctuationRmsY: relativeDifference(
      first.fluctuationRmsY,
      second.fluctuationRmsY,
    ),
  };
}

function forceDecomposition(
  trace: readonly BrinkmanScalingTraceRecord[],
): ForceDecompositionSummary {
  const split = Math.floor(trace.length / 2);
  const full = forceWindow(trace);
  const firstHalf = forceWindow(trace.slice(0, split));
  const secondHalf = forceWindow(trace.slice(split));
  return {
    full,
    firstHalf,
    secondHalf,
    halfDrift: {
      rawReaction: vectorDrift(
        firstHalf.rawReaction,
        secondHalf.rawReaction,
      ),
      fictitiousFluidCorrection: vectorDrift(
        firstHalf.fictitiousFluidCorrection,
        secondHalf.fictitiousFluidCorrection,
      ),
      correctedLoad: vectorDrift(
        firstHalf.correctedLoad,
        secondHalf.correctedLoad,
      ),
    },
  };
}

function slipDecomposition(
  trace: readonly BrinkmanScalingTraceRecord[],
): SlipDecompositionSummary {
  const split = Math.floor(trace.length / 2);
  const inletVelocity = CONTRACT.carrier.latticeVelocity;
  const full = summarizeSlipTrace(trace, inletVelocity);
  const firstHalf = summarizeSlipTrace(trace.slice(0, split), inletVelocity);
  const secondHalf = summarizeSlipTrace(trace.slice(split), inletVelocity);
  return {
    full,
    firstHalf,
    secondHalf,
    halfDrift: {
      coreDensityWeightedRms: relativeDifference(
        firstHalf.core.densityWeightedRms,
        secondHalf.core.densityWeightedRms,
      ),
      coreMaximumPointwise: relativeDifference(
        firstHalf.core.maximumPointwise,
        secondHalf.core.maximumPointwise,
      ),
      transitionDensityWeightedRms: relativeDifference(
        firstHalf.transition.densityWeightedRms,
        secondHalf.transition.densityWeightedRms,
      ),
      transitionMaximumPointwise: relativeDifference(
        firstHalf.transition.maximumPointwise,
        secondHalf.transition.maximumPointwise,
      ),
    },
  };
}

function compareLiterature(
  metrics: BrinkmanScalingDerivedAnalysis["metrics"],
): BrinkmanScalingLiteratureComparison {
  const meanDragError = Math.abs(metrics.meanDrag - FIXED_TARGET.meanDrag);
  const liftRmsError = Math.abs(metrics.liftRms - FIXED_TARGET.liftRms);
  const strouhalError = Math.abs(metrics.strouhal - FIXED_TARGET.strouhal);
  const meanDragPassed = meanDragError <= FIXED_TARGET.tolerance.meanDrag;
  const liftRmsPassed = liftRmsError <= FIXED_TARGET.tolerance.liftRms;
  const strouhalPassed = strouhalError <= FIXED_TARGET.tolerance.strouhal;
  return {
    meanDragError,
    liftRmsError,
    strouhalError,
    meanDragPassed,
    liftRmsPassed,
    strouhalPassed,
    passed: meanDragPassed && liftRmsPassed && strouhalPassed,
  };
}

function recomposition(
  trace: readonly BrinkmanScalingTraceRecord[],
): BrinkmanScalingDerivedAnalysis["recomposition"] {
  let maximumAbsoluteResidual = 0;
  let maximumResidualToAllowedBound = 0;
  let passed = true;
  for (const record of trace) {
    for (const component of ["x", "y"] as const) {
      const raw = record.rawReaction[component];
      const correction = record.fictitiousFluidCorrection[component];
      const corrected = record.correctedLoad[component];
      const residual = corrected - (raw + correction);
      const scale = Math.max(
        Math.abs(raw) + Math.abs(correction) + Math.abs(corrected),
        Number.MIN_VALUE,
      );
      const allowed = CONTRACT.gates.forceRecompositionScaledTolerance
        * scale;
      maximumAbsoluteResidual = Math.max(
        maximumAbsoluteResidual,
        Math.abs(residual),
      );
      maximumResidualToAllowedBound = Math.max(
        maximumResidualToAllowedBound,
        Math.abs(residual) / allowed,
      );
      passed &&= Math.abs(residual) <= allowed;
    }
  }
  return {
    maximumAbsoluteResidual,
    maximumResidualToAllowedBound,
    passed,
  };
}

export function deriveBrinkmanScalingRunAnalysis(
  trace: readonly BrinkmanScalingTraceRecord[],
  definition: BrinkmanScalingDefinition,
): BrinkmanScalingDerivedAnalysis {
  const expected = definition.totalSteps - definition.discardSteps;
  if (trace.length !== expected || trace.length < 32) {
    throw new RangeError(
      `A8Q trace length ${trace.length} differs from ${expected}`,
    );
  }
  const force = forceDecomposition(trace);
  const slip = slipDecomposition(trace);
  const correctedSamples = trace.map((record) => ({
    drag: record.correctedLoad.x,
    lift: record.correctedLoad.y,
  }));
  const coefficientMetrics = summarizeCoefficients(correctedSamples);
  const spectral = dominantStrouhal(
    correctedSamples.map((sample) => sample.lift),
    CONTRACT.carrier.latticeVelocity / definition.diameterCells,
    CONTRACT.carrier.spectrumSearch.strouhalMinimum,
    CONTRACT.carrier.spectrumSearch.strouhalMaximum,
    CONTRACT.carrier.spectrumSearch.strouhalIncrement,
  );
  const metrics = {
    ...coefficientMetrics,
    strouhal: spectral.strouhal,
    spectralLiftAmplitude: spectral.normalizedAmplitude,
  };
  const maturity = {
    meanDragHalfDrift: relativeDifference(
      force.firstHalf.correctedLoad.meanX,
      force.secondHalf.correctedLoad.meanX,
    ),
    liftRmsHalfDrift: relativeDifference(
      force.firstHalf.correctedLoad.rmsY,
      force.secondHalf.correctedLoad.rmsY,
    ),
    passed: false,
  };
  const maturityGates = CONTRACT.gates.maturity;
  maturity.passed = metrics.liftRms > maturityGates.minimumLiftRms
    && maturity.meanDragHalfDrift
      <= maturityGates.maximumMeanDragHalfDrift
    && maturity.liftRmsHalfDrift
      <= maturityGates.maximumLiftRmsHalfDrift;
  return {
    forceDecomposition: force,
    slip,
    metrics,
    maturity,
    literature: compareLiterature(metrics),
    recomposition: recomposition(trace),
  };
}

function failureMessage(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

export function runBrinkmanScalingCase(
  definition: BrinkmanScalingDefinition,
  onProgress: ((progress: BrinkmanScalingProgress) => void) | null = null,
): BrinkmanScalingRunResult {
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
    let before = captureFieldDiagnostic(
      view,
      layout,
      CONTRACT.carrier.latticeVelocity,
    );
    const extrema = emptyExtrema();
    includeExtrema(extrema, before);
    const trace: BrinkmanScalingTraceRecord[] = [];
    const coefficientScale = 0.5
      * CONTRACT.carrier.latticeVelocity ** 2
      * definition.diameterCells;
    const progressStride = Math.max(1, Math.floor(definition.totalSteps / 100));
    for (let step = 0; step < definition.totalSteps; step += 1) {
      const exchange = solver.step(body, CONTRACT.carrier.latticeVelocity);
      view = formalMacroscopicView(solver, body);
      const after = captureFieldDiagnostic(
        view,
        layout,
        CONTRACT.carrier.latticeVelocity,
      );
      includeExtrema(extrema, after);
      if (step + 1 > definition.discardSteps) {
        const rawReaction = {
          x: exchange.rawReactionImpulseX / coefficientScale,
          y: exchange.rawReactionImpulseY / coefficientScale,
        };
        const fictitiousFluidCorrection = {
          x: (
            after.fictitiousMomentumX - before.fictitiousMomentumX
          ) / coefficientScale,
          y: (
            after.fictitiousMomentumY - before.fictitiousMomentumY
          ) / coefficientScale,
        };
        const correctedLoad = {
          x: rawReaction.x + fictitiousFluidCorrection.x,
          y: rawReaction.y + fictitiousFluidCorrection.y,
        };
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
    const derived = deriveBrinkmanScalingRunAnalysis(trace, definition);
    const densityPass = extrema.maximumDensityDeviation
      <= CONTRACT.gates.maximumDensityDeviation;
    const machPass = extrema.maximumMach <= CONTRACT.gates.maximumMach;
    const result: BrinkmanScalingCompletedRun = {
      definition,
      status: "completed",
      completedSteps: solver.stepNumber,
      trajectoryCompleteAndFinite: true,
      numericalIdentity: numericalIdentity(definition),
      body,
      geometry: geometryRecord(layout),
      window: {
        totalSteps: definition.totalSteps,
        discardSteps: definition.discardSteps,
        analysisSamples: trace.length,
        totalConvectiveTime: CONTRACT.carrier.totalConvectiveTime,
        discardConvectiveTime: CONTRACT.carrier.discardConvectiveTime,
      },
      trace,
      ...derived,
      extrema,
      gates: {
        executionPass: true,
        finitePass: true,
        densityPass,
        machPass,
        maturityPass: derived.maturity.passed,
        forceRecompositionPass: derived.recomposition.passed,
        pass: densityPass
          && machPass
          && derived.maturity.passed
          && derived.recomposition.passed,
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
