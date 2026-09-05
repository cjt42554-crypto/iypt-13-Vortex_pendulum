import {
  BRINKMAN_SCALING_CONTRACT as CONTRACT,
  BRINKMAN_SCALING_MASK_HALF_THICKNESSES,
  BRINKMAN_SCALING_PATH_PENALIZATION_TIMES,
  buildBrinkmanScalingDefinitions,
  type BrinkmanScalingPathPenalizationTime,
} from "./brinkman-scaling-contract.ts";
import {
  runBrinkmanScalingCase,
  type BrinkmanScalingCompletedRun,
  type BrinkmanScalingProgress,
  type BrinkmanScalingRunResult,
} from "./brinkman-scaling-runs.ts";
import {
  assertFiniteTree,
  directionCompatibility,
  relativeDifference,
  type DirectionCompatibility,
} from "./brinkman-scaling-support.ts";

export interface BrinkmanScalingProvenance {
  formalSourceSha256: string;
  proDecisionSha256: string;
  frozenA8pArtifactStoredSha256: string;
  frozenA8pArtifactCanonicalSha256: string;
  frozenSourceSha256: Record<string, string>;
  sourceHashesVerified: true;
  contractSha256: string;
  contractDocumentSha256: string;
  contractCommit: string;
  contractTestCommit: string;
  implementationCommit: string;
  implementationTreeSha256: string;
}

export interface BrinkmanScalingPathAnalysis {
  penalizationTimeSteps: BrinkmanScalingPathPenalizationTime;
  runIds: string[];
  available: boolean;
  coreSlipComparisons: Array<{
    maskHalfThicknessCells: number;
    coarseCaseId: string;
    fineCaseId: string;
    coarseCoreSlipRms: number;
    fineCoreSlipRms: number;
    fineNotAboveCoarse: boolean;
  }>;
  directionCompatibility: {
    meanDrag: DirectionCompatibility | null;
    liftRms: DirectionCompatibility | null;
  };
  fineCrossMask: {
    firstCaseId: string | null;
    secondCaseId: string | null;
    meanDragRelativeDifference: number | null;
    liftRmsRelativeDifference: number | null;
    maximumRelativeLoadDifference: number | null;
    pass: boolean;
  };
  gates: {
    allRequiredRunsPresent: boolean;
    globalGatePass: boolean;
    allPathRunsInternallyPass: boolean;
    allForceDecompositionsRecomputable: boolean;
    bothCoreSlipComparisonsPass: boolean;
    meanDragDirectionPass: boolean;
    liftRmsDirectionPass: boolean;
    fineCrossMaskPass: boolean;
    pass: boolean;
  };
}

export interface BrinkmanScalingQualificationResult {
  format: "VP-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-SCREEN-QUALIFICATION-v1";
  contractIdentity: BrinkmanScalingProvenance & {
    format:
      "VP-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-SCREEN-CONTRACT-v1";
  };
  runs: BrinkmanScalingRunResult[];
  globalGate: {
    runCountPass: boolean;
    uniqueRunIdentityPass: boolean;
    allTenRunsCompleteAndFinite: boolean;
    allTenRunsStableAndMature: boolean;
    allForceDecompositionsRecomputable: boolean;
    allFrozenSourceHashesPass: boolean;
    controlCountPass: boolean;
    pass: boolean;
  };
  pathAnalyses: BrinkmanScalingPathAnalysis[];
  literatureObservation: {
    singlePointHitCaseIds: string[];
    code: "INCONCLUSIVE-A8Q-SINGLE-POINT-LITERATURE-HIT" | null;
    selectionByLiteratureClosenessForbidden: true;
  };
  decision: {
    code:
      | "PASS-A8Q-BRINKMAN-SCALING-PATH-CANDIDATE-ONLY-UNLOCK-A8R"
      | "NO-GO-A8Q-BRINKMAN-SCALING-PATH-INCOHERENT";
    pass: boolean;
    gates: {
      globalGatePass: boolean;
      atLeastOneFixedEtaPathPass: boolean;
      independentFullRepeatRequired: true;
    };
    passingPenalizationTimesSteps: number[];
    carryEveryPassingPathIntoA8r: true;
    formalSourceModified: false;
    formalIntegrationUnlocked: false;
    s1PhysicallySelected: false;
    s9Selected: false;
    newBoundaryStrategyCreated: false;
    stopAfterEvidenceReportRepeatAndHandoff: true;
    statement: string;
    claimUpperBound: string;
  };
}

export function isCompletedBrinkmanScalingRun(
  run: BrinkmanScalingRunResult,
): run is BrinkmanScalingCompletedRun {
  return run.status === "completed";
}

function findCompletedRun(
  runs: readonly BrinkmanScalingRunResult[],
  diameterCells: number,
  maskHalfThicknessCells: number,
  penalizationTimeSteps: number,
): BrinkmanScalingCompletedRun | undefined {
  const run = runs.find((candidate) => (
    candidate.definition.diameterCells === diameterCells
      && candidate.definition.maskHalfThicknessCells
        === maskHalfThicknessCells
      && candidate.definition.penalizationTimeSteps
        === penalizationTimeSteps
  ));
  return run !== undefined && isCompletedBrinkmanScalingRun(run)
    ? run
    : undefined;
}

function analyzePath(
  penalizationTimeSteps: BrinkmanScalingPathPenalizationTime,
  runs: readonly BrinkmanScalingRunResult[],
  globalGatePass: boolean,
): BrinkmanScalingPathAnalysis {
  const masks = BRINKMAN_SCALING_MASK_HALF_THICKNESSES;
  const coarse = masks.map((mask) => findCompletedRun(
    runs,
    16,
    mask,
    penalizationTimeSteps,
  ));
  const fine = masks.map((mask) => findCompletedRun(
    runs,
    24,
    mask,
    penalizationTimeSteps,
  ));
  const required = [...coarse, ...fine];
  const available = required.every((run) => run !== undefined);
  const completedRequired = available
    ? required as BrinkmanScalingCompletedRun[]
    : [];
  const coreSlipComparisons = available
    ? masks.map((mask, index) => {
      const coarseRun = coarse[index];
      const fineRun = fine[index];
      if (coarseRun === undefined || fineRun === undefined) {
        throw new Error("A8Q path availability changed unexpectedly");
      }
      const coarseCoreSlipRms = coarseRun.slip.full.core.densityWeightedRms;
      const fineCoreSlipRms = fineRun.slip.full.core.densityWeightedRms;
      return {
        maskHalfThicknessCells: mask,
        coarseCaseId: coarseRun.definition.id,
        fineCaseId: fineRun.definition.id,
        coarseCoreSlipRms,
        fineCoreSlipRms,
        fineNotAboveCoarse: fineCoreSlipRms <= coarseCoreSlipRms,
      };
    })
    : [];
  let meanDragDirection: DirectionCompatibility | null = null;
  let liftRmsDirection: DirectionCompatibility | null = null;
  let fineCrossMask: BrinkmanScalingPathAnalysis["fineCrossMask"] = {
    firstCaseId: null,
    secondCaseId: null,
    meanDragRelativeDifference: null,
    liftRmsRelativeDifference: null,
    maximumRelativeLoadDifference: null,
    pass: false,
  };
  if (available) {
    const coarseFirst = coarse[0];
    const coarseSecond = coarse[1];
    const fineFirst = fine[0];
    const fineSecond = fine[1];
    if (coarseFirst === undefined || coarseSecond === undefined
      || fineFirst === undefined || fineSecond === undefined) {
      throw new Error("A8Q completed path array is incomplete");
    }
    meanDragDirection = directionCompatibility(
      [coarseFirst.metrics.meanDrag, coarseSecond.metrics.meanDrag],
      [fineFirst.metrics.meanDrag, fineSecond.metrics.meanDrag],
    );
    liftRmsDirection = directionCompatibility(
      [coarseFirst.metrics.liftRms, coarseSecond.metrics.liftRms],
      [fineFirst.metrics.liftRms, fineSecond.metrics.liftRms],
    );
    const meanDragRelativeDifference = relativeDifference(
      fineFirst.metrics.meanDrag,
      fineSecond.metrics.meanDrag,
    );
    const liftRmsRelativeDifference = relativeDifference(
      fineFirst.metrics.liftRms,
      fineSecond.metrics.liftRms,
    );
    const maximumRelativeLoadDifference = Math.max(
      meanDragRelativeDifference,
      liftRmsRelativeDifference,
    );
    fineCrossMask = {
      firstCaseId: fineFirst.definition.id,
      secondCaseId: fineSecond.definition.id,
      meanDragRelativeDifference,
      liftRmsRelativeDifference,
      maximumRelativeLoadDifference,
      pass: maximumRelativeLoadDifference
        <= CONTRACT.gates.fixedEtaPath
          .maximumFineCrossMaskRelativeLoadDifference,
    };
  }
  const allPathRunsInternallyPass = available
    && completedRequired.every((run) => run.gates.pass);
  const allForceDecompositionsRecomputable = available
    && completedRequired.every((run) => run.recomposition.passed);
  const bothCoreSlipComparisonsPass = coreSlipComparisons.length === 2
    && coreSlipComparisons.every((comparison) =>
      comparison.fineNotAboveCoarse);
  const meanDragDirectionPass = meanDragDirection?.pass ?? false;
  const liftRmsDirectionPass = liftRmsDirection?.pass ?? false;
  const pass = available
    && globalGatePass
    && allPathRunsInternallyPass
    && allForceDecompositionsRecomputable
    && bothCoreSlipComparisonsPass
    && meanDragDirectionPass
    && liftRmsDirectionPass
    && fineCrossMask.pass;
  return {
    penalizationTimeSteps,
    runIds: completedRequired.map((run) => run.definition.id),
    available,
    coreSlipComparisons,
    directionCompatibility: {
      meanDrag: meanDragDirection,
      liftRms: liftRmsDirection,
    },
    fineCrossMask,
    gates: {
      allRequiredRunsPresent: available,
      globalGatePass,
      allPathRunsInternallyPass,
      allForceDecompositionsRecomputable,
      bothCoreSlipComparisonsPass,
      meanDragDirectionPass,
      liftRmsDirectionPass,
      fineCrossMaskPass: fineCrossMask.pass,
      pass,
    },
  };
}

export function assembleBrinkmanScalingQualification(
  provenance: BrinkmanScalingProvenance,
  runs: BrinkmanScalingRunResult[],
): BrinkmanScalingQualificationResult {
  const expectedDefinitions = buildBrinkmanScalingDefinitions();
  const completed = runs.filter(isCompletedBrinkmanScalingRun);
  const runCountPass = runs.length === CONTRACT.matrix.uniqueRunCount;
  const uniqueRunIdentityPass = new Set(
    runs.map((run) => run.definition.id),
  ).size === CONTRACT.matrix.uniqueRunCount
    && expectedDefinitions.every((definition, index) =>
      runs[index]?.definition.id === definition.id);
  const allTenRunsCompleteAndFinite = runCountPass
    && completed.length === CONTRACT.matrix.uniqueRunCount
    && completed.every((run) => (
      run.trajectoryCompleteAndFinite
        && run.completedSteps === run.definition.totalSteps
    ));
  const allTenRunsStableAndMature = allTenRunsCompleteAndFinite
    && completed.every((run) => (
      run.gates.densityPass
        && run.gates.machPass
        && run.gates.maturityPass
    ));
  const allForceDecompositionsRecomputable = allTenRunsCompleteAndFinite
    && completed.every((run) => run.gates.forceRecompositionPass);
  const controlCountPass = completed.filter((run) =>
    run.definition.role === "fixed-eta-hat-control").length === 2;
  const globalPass = runCountPass
    && uniqueRunIdentityPass
    && allTenRunsCompleteAndFinite
    && allTenRunsStableAndMature
    && allForceDecompositionsRecomputable
    && provenance.sourceHashesVerified
    && controlCountPass;
  const globalGate = {
    runCountPass,
    uniqueRunIdentityPass,
    allTenRunsCompleteAndFinite,
    allTenRunsStableAndMature,
    allForceDecompositionsRecomputable,
    allFrozenSourceHashesPass: provenance.sourceHashesVerified,
    controlCountPass,
    pass: globalPass,
  };
  const pathAnalyses = BRINKMAN_SCALING_PATH_PENALIZATION_TIMES.map((eta) =>
    analyzePath(eta, runs, globalPass));
  const singlePointHitCaseIds = completed
    .filter((run) => run.literature.passed)
    .map((run) => run.definition.id);
  const passingPenalizationTimesSteps = pathAnalyses
    .filter((analysis) => analysis.gates.pass)
    .map((analysis) => analysis.penalizationTimeSteps);
  const pass = globalPass && passingPenalizationTimesSteps.length > 0;
  const result: BrinkmanScalingQualificationResult = {
    format:
      "VP-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-SCREEN-QUALIFICATION-v1",
    contractIdentity: {
      format: CONTRACT.format,
      ...provenance,
    },
    runs,
    globalGate,
    pathAnalyses,
    literatureObservation: {
      singlePointHitCaseIds,
      code: singlePointHitCaseIds.length > 0
        ? CONTRACT.literatureObservation.singlePointHitCode
        : null,
      selectionByLiteratureClosenessForbidden: true,
    },
    decision: {
      code: pass ? CONTRACT.decision.passCode : CONTRACT.decision.noGoCode,
      pass,
      gates: {
        globalGatePass: globalPass,
        atLeastOneFixedEtaPathPass:
          passingPenalizationTimesSteps.length > 0,
        independentFullRepeatRequired: true,
      },
      passingPenalizationTimesSteps,
      carryEveryPassingPathIntoA8r: true,
      formalSourceModified: false,
      formalIntegrationUnlocked: false,
      s1PhysicallySelected: false,
      s9Selected: false,
      newBoundaryStrategyCreated: false,
      stopAfterEvidenceReportRepeatAndHandoff: true,
      statement: pass
        ? "At least one fixed-eta-lu two-resolution path passed every frozen A8Q internal-consistency gate; every passing path must be carried into A8R."
        : "No fixed-eta-lu path passed every frozen A8Q internal-consistency gate; stop the current Brinkman solid route after independent review.",
      claimUpperBound: CONTRACT.decision.claimUpperBound,
    },
  };
  assertFiniteTree(result);
  return result;
}

export function runBrinkmanScalingQualification(
  provenance: BrinkmanScalingProvenance,
  onProgress: ((progress: BrinkmanScalingProgress) => void) | null = null,
): BrinkmanScalingQualificationResult {
  const runs = buildBrinkmanScalingDefinitions().map((definition) =>
    runBrinkmanScalingCase(definition, onProgress));
  return assembleBrinkmanScalingQualification(provenance, runs);
}
