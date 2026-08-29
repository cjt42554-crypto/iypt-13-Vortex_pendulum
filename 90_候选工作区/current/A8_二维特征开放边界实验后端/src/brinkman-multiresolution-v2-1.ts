import {
  BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT,
  BRINKMAN_MULTIRESOLUTION_V2P1_MASK_HALF_THICKNESSES as MASKS,
  buildBrinkmanMultiresolutionV2P1Definitions,
} from "./brinkman-multiresolution-contract-v2-1.ts";
import {
  isCompletedBrinkmanMultiresolutionV2P1Run,
  runBrinkmanMultiresolutionV2P1Case,
  type BrinkmanMultiresolutionV2P1CompletedRun,
  type BrinkmanMultiresolutionV2P1Progress,
  type BrinkmanMultiresolutionV2P1RunResult,
} from "./brinkman-multiresolution-runs-v2-1.ts";
import {
  assertFiniteTree,
  classifyCycleTrend,
  compareD24A8qCommonProjection,
  screenD54MaskPhase,
  type CycleTrendClassification,
  type D54MaskPhaseScreen,
  type D54MaskPhaseTrace,
} from "./brinkman-multiresolution-support-v2-1.ts";

export interface BrinkmanMultiresolutionV2P1Provenance {
  formalSourceSha256: string;
  contractDocumentSha256: string;
  machineContractSha256: string;
  contractTestSha256: string;
  implementationUnlockReviewSha256: string;
  p1RepairReviewSha256: string;
  frozenA8qStoredSha256: string;
  frozenA8qCanonicalSha256: string;
  frozenA8qSidecarSha256: string;
  frozenSourceSha256: Record<string, string>;
  sourceHashesVerified: true;
  contractCommit: string;
  contractTestCommit: string;
  implementationUnlockReviewCommit: string;
  noResultImplementationCommit: string;
  p1RepairReviewCommit: string;
  implementationCommit: string;
  implementationTreeSha256: string;
  implementationTreePathCount: number;
  implementationTreePaths: string[];
}

export interface BrinkmanMultiresolutionV2P1A8qAnchorInput {
  identity: {
    materialized: true;
    storedBytes: number;
    storedSha256: string;
    canonicalBytes: number;
    canonicalSha256: string;
    sidecarSha256: string;
    sidecarExact: true;
  };
  runsById: ReadonlyMap<string, unknown>;
}

export interface BrinkmanMultiresolutionV2P1D24AnchorComparison {
  maskHalfThicknessCells: 0.5 | 0.75;
  a8qCaseId: string;
  a8rCaseId: string | null;
  available: boolean;
  numericTolerance: 0;
  mismatchPaths: string[];
  pass: boolean;
}

export interface BrinkmanMultiresolutionV2P1CoreSlipScreen {
  maskHalfThicknessCells: 0.5 | 0.75;
  runIds: string[];
  values: {
    d24: number | null;
    d36: number | null;
    d54: number | null;
  };
  available: boolean;
  d24NotBelowD36: boolean;
  d36NotBelowD54: boolean;
  pass: boolean;
}

export interface BrinkmanMultiresolutionV2P1TrendScreen {
  maskHalfThicknessCells: 0.5 | 0.75;
  metric:
    | "six-cycle-aggregate-mean-drag"
    | "six-cycle-aggregate-full-analysis-mean-demeaned-lift-rms";
  runIds: string[];
  available: boolean;
  classification: CycleTrendClassification | null;
}

export interface BrinkmanMultiresolutionV2P1LiteratureRecord {
  caseId: string;
  maskHalfThicknessCells: 0.5 | 0.75;
  phaseId: "baseline" | "minus-half-cell";
  values: {
    meanDrag: number;
    rawLiftRms: number;
    fullAnalysisMeanDemeanedLiftRms: number;
    strouhal: number;
  };
  absoluteErrors: {
    meanDrag: number;
    rawLiftRms: number;
    fullAnalysisMeanDemeanedLiftRms: number;
    strouhal: number;
  };
  gates: {
    meanDrag: boolean;
    rawLiftRms: boolean;
    fullAnalysisMeanDemeanedLiftRms: boolean;
    strouhal: boolean;
    pass: boolean;
  };
}

export interface BrinkmanMultiresolutionV2P1QualificationResult {
  format:
    "VP-A8R-V2P1-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-FORCE-IDENTITY-ARTIFACT-v1";
  contractIdentity: BrinkmanMultiresolutionV2P1Provenance & {
    format:
      "VP-A8R-V2P1-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-AND-FORCE-IDENTITY-CONTRACT-v1";
  };
  a8qAnchorIdentity: BrinkmanMultiresolutionV2P1A8qAnchorInput["identity"];
  runs: BrinkmanMultiresolutionV2P1RunResult[];
  d24AnchorComparisons: BrinkmanMultiresolutionV2P1D24AnchorComparison[];
  coreSlipScreens: BrinkmanMultiresolutionV2P1CoreSlipScreen[];
  cycleTrendScreens: BrinkmanMultiresolutionV2P1TrendScreen[];
  d54MaskPhaseScreen: D54MaskPhaseScreen | null;
  d54Diagnostics: {
    available: boolean;
    aggregateStrouhal: Array<{ caseId: string; value: number }>;
    meanLiftPairs: Array<{
      leftId: string;
      rightId: string;
      signedDifference: number;
      absoluteDifference: number;
    }>;
  };
  literatureProximityScreen: {
    observationOnly: true;
    records: BrinkmanMultiresolutionV2P1LiteratureRecord[];
    allFourD54CombinationsAvailable: boolean;
    cannotChangeDecision: true;
  };
  globalGate: {
    runCountPass: boolean;
    deterministicOrderPass: boolean;
    uniqueRunIdentityPass: boolean;
    allRunsCompleteAndFinite: boolean;
    allFrozenSourceHashesPass: boolean;
    d24AnchorIdentityPass: boolean;
    d24AnchorCommonProjectionPass: boolean;
    fullHalfAndFourBlockCoveragePass: boolean;
    latestSixCycleCoveragePass: boolean;
    latestSixCyclePlausibilityPass: boolean;
    everyStepRawForceIdentityPass: boolean;
    everyStepA2FormulaPass: boolean;
    forceRecompositionPass: boolean;
    evidenceCompleteExceptIndependentRepeat: boolean;
  };
  routeGate: {
    allRunsStable: boolean;
    allRunsMature: boolean;
    allCoreSlipScreensPass: boolean;
    allCycleTrendsResolvedPass: boolean;
    anyCycleTrendUnresolved: boolean;
    anyCycleTrendResolvedNoGo: boolean;
    d54MaskPhaseMarginPass: boolean;
    pass: boolean;
  };
  decision: {
    code:
      | "PASS-A8R-V2P1-DISCRETE-MULTIRESOLUTION-MASK-PHASE-CANDIDATE-ONLY"
      | "INCONCLUSIVE-A8R-V2P1-STATISTICS-PHASE-MARGIN-OR-FORCE-IDENTITY"
      | "NO-GO-A8R-V2P1-RESOLVED-BRINKMAN-DISCRETE-ROUTE";
    pass: boolean;
    classification: "PASS" | "INCONCLUSIVE" | "NO-GO";
    gates: {
      evidenceCompleteExceptIndependentRepeat: boolean;
      independentFullRepeatRequired: true;
      independentFullRepeatVerifiedOutsideArtifact: false;
      trendEvidenceResolved: boolean;
      d54MaskPhaseMarginPass: boolean;
      stableMatureAndCoreSlipPass: boolean;
    };
    validOnlyAfterIndependentFullRepeatByteIdentity: true;
    returnsToIndependentPro: true;
    formalSourceModified: false;
    formalIntegrationUnlocked: false;
    prescribedMotionUnlocked: false;
    weakFsiUnlocked: false;
    s1PhysicallySelected: false;
    s9Selected: false;
    newBoundaryStrategyCreated: false;
    statement: string;
    claimUpperBound: string;
  };
}

function completedRun(
  runs: readonly BrinkmanMultiresolutionV2P1RunResult[],
  diameterCells: number,
  maskHalfThicknessCells: number,
  phaseId: string,
): BrinkmanMultiresolutionV2P1CompletedRun | undefined {
  const run = runs.find((candidate) =>
    candidate.definition.diameterCells === diameterCells
    && candidate.definition.maskHalfThicknessCells === maskHalfThicknessCells
    && candidate.definition.phaseId === phaseId);
  return run !== undefined && isCompletedBrinkmanMultiresolutionV2P1Run(run)
    ? run
    : undefined;
}

function d24AnchorComparisons(
  runs: readonly BrinkmanMultiresolutionV2P1RunResult[],
  anchor: BrinkmanMultiresolutionV2P1A8qAnchorInput,
): BrinkmanMultiresolutionV2P1D24AnchorComparison[] {
  return MASKS.map((mask, index) => {
    const a8qCaseId = CONTRACT.sourceIdentity.frozenA8q
      .d24AnchorCaseIds[index];
    if (a8qCaseId === undefined) {
      throw new Error("A8R v2.1 missing frozen A8Q anchor case identity");
    }
    const a8q = anchor.runsById.get(a8qCaseId);
    const a8r = completedRun(runs, 24, mask, "baseline");
    if (a8q === undefined || a8r === undefined) {
      return {
        maskHalfThicknessCells: mask,
        a8qCaseId,
        a8rCaseId: a8r?.definition.id ?? null,
        available: false,
        numericTolerance: 0,
        mismatchPaths: ["$<missing-anchor-or-fresh-run>"],
        pass: false,
      };
    }
    const comparison = compareD24A8qCommonProjection(a8q, a8r);
    return {
      maskHalfThicknessCells: mask,
      a8qCaseId,
      a8rCaseId: a8r.definition.id,
      available: true,
      ...comparison,
    };
  });
}

function coreSlipScreens(
  runs: readonly BrinkmanMultiresolutionV2P1RunResult[],
): BrinkmanMultiresolutionV2P1CoreSlipScreen[] {
  return MASKS.map((mask) => {
    const d24 = completedRun(runs, 24, mask, "baseline");
    const d36 = completedRun(runs, 36, mask, "baseline");
    const d54 = completedRun(runs, 54, mask, "baseline");
    const available = d24 !== undefined && d36 !== undefined && d54 !== undefined;
    const d24Value = d24?.slip.full.core.densityWeightedRms ?? null;
    const d36Value = d36?.slip.full.core.densityWeightedRms ?? null;
    const d54Value = d54?.slip.full.core.densityWeightedRms ?? null;
    const d24NotBelowD36 = available
      && (d24Value as number) >= (d36Value as number);
    const d36NotBelowD54 = available
      && (d36Value as number) >= (d54Value as number);
    return {
      maskHalfThicknessCells: mask,
      runIds: [d24, d36, d54]
        .filter((run): run is BrinkmanMultiresolutionV2P1CompletedRun =>
          run !== undefined)
        .map((run) => run.definition.id),
      values: { d24: d24Value, d36: d36Value, d54: d54Value },
      available,
      d24NotBelowD36,
      d36NotBelowD54,
      pass: available && d24NotBelowD36 && d36NotBelowD54,
    };
  });
}

function trendScreens(
  runs: readonly BrinkmanMultiresolutionV2P1RunResult[],
): BrinkmanMultiresolutionV2P1TrendScreen[] {
  const screens: BrinkmanMultiresolutionV2P1TrendScreen[] = [];
  const metrics = [
    "six-cycle-aggregate-mean-drag",
    "six-cycle-aggregate-full-analysis-mean-demeaned-lift-rms",
  ] as const;
  for (const mask of MASKS) {
    const ordered = [24, 36, 54].map((diameter) =>
      completedRun(runs, diameter, mask, "baseline"));
    for (const metric of metrics) {
      const available = ordered.every((run) =>
        run !== undefined && run.cycleResolved.complete);
      let classification: CycleTrendClassification | null = null;
      if (available) {
        const complete = ordered as BrinkmanMultiresolutionV2P1CompletedRun[];
        const envelopes = complete.map((run) => {
          if (!run.cycleResolved.complete) {
            throw new Error("A8R v2.1 cycle availability changed");
          }
          return metric === "six-cycle-aggregate-mean-drag"
            ? run.cycleResolved.envelopes.meanDrag
            : run.cycleResolved.envelopes
              .fullAnalysisMeanDemeanedLiftRms;
        });
        const [coarse, middle, fine] = envelopes;
        if (coarse === undefined || middle === undefined || fine === undefined) {
          throw new Error("A8R v2.1 trend envelope sequence is incomplete");
        }
        classification = classifyCycleTrend(coarse, middle, fine);
      }
      screens.push({
        maskHalfThicknessCells: mask,
        metric,
        runIds: ordered
          .filter((run): run is BrinkmanMultiresolutionV2P1CompletedRun =>
            run !== undefined)
          .map((run) => run.definition.id),
        available,
        classification,
      });
    }
  }
  return screens;
}

function d54Trace(
  run: BrinkmanMultiresolutionV2P1CompletedRun,
): D54MaskPhaseTrace | null {
  const cycle = run.cycleResolved;
  if (!cycle.complete) return null;
  return {
    id: run.definition.id,
    phaseId: run.definition.phaseId,
    maskHalfThicknessCells: run.definition.maskHalfThicknessCells,
    metrics: {
      "six-cycle-aggregate-mean-drag": {
        aggregate: cycle.aggregate.meanDrag,
        cycles: cycle.cycles.map((entry) => entry.meanDrag),
      },
      "six-cycle-aggregate-raw-lift-rms": {
        aggregate: cycle.aggregate.rawLiftRms,
        cycles: cycle.cycles.map((entry) => entry.rawLiftRms),
      },
      "six-cycle-aggregate-full-analysis-mean-demeaned-lift-rms": {
        aggregate: cycle.aggregate.fullAnalysisMeanDemeanedLiftRms,
        cycles: cycle.cycles.map((entry) =>
          entry.fullAnalysisMeanDemeanedLiftRms),
      },
      "six-cycle-aggregate-mean-period": {
        aggregate: cycle.aggregate.meanPeriod,
        cycles: cycle.cycles.map((entry) => entry.period),
      },
    },
  };
}

function d54Runs(
  runs: readonly BrinkmanMultiresolutionV2P1RunResult[],
): BrinkmanMultiresolutionV2P1CompletedRun[] {
  const selected: BrinkmanMultiresolutionV2P1CompletedRun[] = [];
  for (const phase of ["baseline", "minus-half-cell"] as const) {
    for (const mask of MASKS) {
      const run = completedRun(runs, 54, mask, phase);
      if (run !== undefined) selected.push(run);
    }
  }
  return selected;
}

function d54Screen(
  runs: readonly BrinkmanMultiresolutionV2P1RunResult[],
): D54MaskPhaseScreen | null {
  const traces = d54Runs(runs).map(d54Trace);
  if (traces.length !== 4 || traces.some((trace) => trace === null)) return null;
  return screenD54MaskPhase(traces as D54MaskPhaseTrace[]);
}

function d54Diagnostics(
  runs: readonly BrinkmanMultiresolutionV2P1RunResult[],
): BrinkmanMultiresolutionV2P1QualificationResult["d54Diagnostics"] {
  const selected = d54Runs(runs);
  const complete = selected.filter((run) => run.cycleResolved.complete);
  const aggregateStrouhal = complete.map((run) => ({
    caseId: run.definition.id,
    value: run.cycleResolved.complete
      ? run.cycleResolved.aggregate.strouhal
      : Number.NaN,
  }));
  const meanLiftPairs: BrinkmanMultiresolutionV2P1QualificationResult[
    "d54Diagnostics"
  ]["meanLiftPairs"] = [];
  for (let left = 0; left < complete.length; left += 1) {
    for (let right = left + 1; right < complete.length; right += 1) {
      const leftRun = complete[left];
      const rightRun = complete[right];
      if (leftRun === undefined || rightRun === undefined
        || !leftRun.cycleResolved.complete
        || !rightRun.cycleResolved.complete) continue;
      const signedDifference = rightRun.cycleResolved.aggregate.meanLift
        - leftRun.cycleResolved.aggregate.meanLift;
      meanLiftPairs.push({
        leftId: leftRun.definition.id,
        rightId: rightRun.definition.id,
        signedDifference,
        absoluteDifference: Math.abs(signedDifference),
      });
    }
  }
  return {
    available: complete.length === 4 && meanLiftPairs.length === 6,
    aggregateStrouhal,
    meanLiftPairs,
  };
}

function literatureRecord(
  run: BrinkmanMultiresolutionV2P1CompletedRun,
): BrinkmanMultiresolutionV2P1LiteratureRecord | null {
  if (!run.cycleResolved.complete) return null;
  const target = CONTRACT.literatureProximityScreen.fixedTarget;
  const values = {
    meanDrag: run.cycleResolved.aggregate.meanDrag,
    rawLiftRms: run.cycleResolved.aggregate.rawLiftRms,
    fullAnalysisMeanDemeanedLiftRms:
      run.cycleResolved.aggregate.fullAnalysisMeanDemeanedLiftRms,
    strouhal: run.cycleResolved.aggregate.strouhal,
  };
  const absoluteErrors = {
    meanDrag: Math.abs(values.meanDrag - target.meanDrag),
    rawLiftRms: Math.abs(values.rawLiftRms - target.rawLiftRms),
    fullAnalysisMeanDemeanedLiftRms: Math.abs(
      values.fullAnalysisMeanDemeanedLiftRms
        - target.fullAnalysisMeanDemeanedLiftRms,
    ),
    strouhal: Math.abs(values.strouhal - target.strouhal),
  };
  const gates = {
    meanDrag: absoluteErrors.meanDrag <= target.absoluteTolerances.meanDrag,
    rawLiftRms: absoluteErrors.rawLiftRms
      <= target.absoluteTolerances.rawLiftRms,
    fullAnalysisMeanDemeanedLiftRms:
      absoluteErrors.fullAnalysisMeanDemeanedLiftRms
        <= target.absoluteTolerances.fullAnalysisMeanDemeanedLiftRms,
    strouhal: absoluteErrors.strouhal
      <= target.absoluteTolerances.strouhal,
    pass: false,
  };
  gates.pass = gates.meanDrag
    && gates.rawLiftRms
    && gates.fullAnalysisMeanDemeanedLiftRms
    && gates.strouhal;
  return {
    caseId: run.definition.id,
    maskHalfThicknessCells: run.definition.maskHalfThicknessCells,
    phaseId: run.definition.phaseId,
    values,
    absoluteErrors,
    gates,
  };
}

function decision(
  evidenceComplete: boolean,
  trends: readonly BrinkmanMultiresolutionV2P1TrendScreen[],
  phaseScreen: D54MaskPhaseScreen | null,
  stable: boolean,
  mature: boolean,
  coreSlipPass: boolean,
): BrinkmanMultiresolutionV2P1QualificationResult["decision"] {
  const states = CONTRACT.gates.cycleResolvedTrend.stateCodes;
  const trendEvidenceResolved = trends.length === 4
    && trends.every((entry) => entry.available
      && entry.classification !== null
      && entry.classification.state !== states.inconclusive);
  const anyResolvedNoGo = trends.some((entry) =>
    entry.classification?.state === states.noGo);
  const phasePass = phaseScreen?.pass ?? false;
  const stableMatureAndCoreSlipPass = stable && mature && coreSlipPass;
  let code: BrinkmanMultiresolutionV2P1QualificationResult[
    "decision"
  ]["code"];
  let classification: "PASS" | "INCONCLUSIVE" | "NO-GO";
  let statement: string;
  if (!evidenceComplete || !trendEvidenceResolved || !phasePass) {
    code = CONTRACT.decision.inconclusiveCode;
    classification = "INCONCLUSIVE";
    statement = "A8R v2.1 evidence, resolved trend, or frozen D54 mask-phase margin is incomplete; no route failure or candidate PASS is established.";
  } else if (!stableMatureAndCoreSlipPass || anyResolvedNoGo) {
    code = CONTRACT.decision.noGoCode;
    classification = "NO-GO";
    statement = "Complete and resolved A8R v2.1 evidence fails a frozen stability, maturity, core-slip, or cycle-trend route gate.";
  } else {
    code = CONTRACT.decision.passCode;
    classification = "PASS";
    statement = "Every frozen A8R v2.1 candidate-only discrete gate passes, subject to the separately required independent full-repeat byte-identity assertion and Pro review.";
  }
  return {
    code,
    pass: classification === "PASS",
    classification,
    gates: {
      evidenceCompleteExceptIndependentRepeat: evidenceComplete,
      independentFullRepeatRequired: true,
      independentFullRepeatVerifiedOutsideArtifact: false,
      trendEvidenceResolved,
      d54MaskPhaseMarginPass: phasePass,
      stableMatureAndCoreSlipPass,
    },
    validOnlyAfterIndependentFullRepeatByteIdentity: true,
    returnsToIndependentPro: true,
    formalSourceModified: false,
    formalIntegrationUnlocked: false,
    prescribedMotionUnlocked: false,
    weakFsiUnlocked: false,
    s1PhysicallySelected: false,
    s9Selected: false,
    newBoundaryStrategyCreated: false,
    statement,
    claimUpperBound: CONTRACT.decision.claimUpperBound,
  };
}

export function assembleBrinkmanMultiresolutionV2P1Qualification(
  provenance: BrinkmanMultiresolutionV2P1Provenance,
  runs: BrinkmanMultiresolutionV2P1RunResult[],
  anchor: BrinkmanMultiresolutionV2P1A8qAnchorInput,
): BrinkmanMultiresolutionV2P1QualificationResult {
  const expected = buildBrinkmanMultiresolutionV2P1Definitions();
  const completed = runs.filter(isCompletedBrinkmanMultiresolutionV2P1Run);
  const runCountPass = runs.length === CONTRACT.matrix.uniqueRunCount;
  const deterministicOrderPass = runCountPass
    && expected.every((definition, index) =>
      runs[index]?.definition.id === definition.id);
  const uniqueRunIdentityPass = new Set(
    runs.map((run) => run.definition.id),
  ).size === CONTRACT.matrix.uniqueRunCount;
  const allRunsCompleteAndFinite = runCountPass
    && completed.length === CONTRACT.matrix.uniqueRunCount
    && completed.every((run) => run.trajectoryCompleteAndFinite
      && run.completedSteps === run.definition.totalSteps
      && run.trace.length === run.definition.analysisSamples);
  const anchors = d24AnchorComparisons(runs, anchor);
  const slips = coreSlipScreens(runs);
  const trends = trendScreens(runs);
  const phaseScreen = d54Screen(runs);
  const diagnostics = d54Diagnostics(runs);
  const literatureRecords = d54Runs(runs)
    .map(literatureRecord)
    .filter((record): record is BrinkmanMultiresolutionV2P1LiteratureRecord =>
      record !== null);
  const d24AnchorIdentityPass = anchor.identity.materialized
    && anchor.identity.storedBytes
      === CONTRACT.sourceIdentity.frozenA8q.artifact.storedBytes
    && anchor.identity.canonicalBytes
      === CONTRACT.sourceIdentity.frozenA8q.artifact.canonicalBytes
    && anchor.identity.storedSha256
      === CONTRACT.sourceIdentity.frozenA8q.artifact.storedSha256
    && anchor.identity.canonicalSha256
      === CONTRACT.sourceIdentity.frozenA8q.artifact.canonicalSha256
    && anchor.identity.sidecarSha256
      === CONTRACT.sourceIdentity.frozenA8q.sidecar.sha256
    && anchor.identity.sidecarExact;
  const d24AnchorCommonProjectionPass = anchors.length === 2
    && anchors.every((entry) => entry.available && entry.pass);
  const fullHalfAndFourBlockCoveragePass = allRunsCompleteAndFinite
    && completed.every((run) => run.gates.windowCoveragePass);
  const latestSixCycleCoveragePass = allRunsCompleteAndFinite
    && completed.every((run) => run.gates.cycleCoveragePass);
  const latestSixCyclePlausibilityPass = allRunsCompleteAndFinite
    && completed.every((run) => run.gates.cyclePlausibilityPass);
  const everyStepRawForceIdentityPass = allRunsCompleteAndFinite
    && completed.every((run) => run.gates.independentRawForceIdentityPass);
  const everyStepA2FormulaPass = allRunsCompleteAndFinite
    && completed.every((run) => run.gates.independentA2FormulaPass);
  const forceRecompositionPass = allRunsCompleteAndFinite
    && completed.every((run) => run.gates.forceRecompositionPass);
  const evidenceCompleteExceptIndependentRepeat = runCountPass
    && deterministicOrderPass
    && uniqueRunIdentityPass
    && allRunsCompleteAndFinite
    && provenance.sourceHashesVerified
    && d24AnchorIdentityPass
    && d24AnchorCommonProjectionPass
    && fullHalfAndFourBlockCoveragePass
    && latestSixCycleCoveragePass
    && latestSixCyclePlausibilityPass
    && everyStepRawForceIdentityPass
    && everyStepA2FormulaPass
    && forceRecompositionPass;
  const allRunsStable = allRunsCompleteAndFinite
    && completed.every((run) => run.gates.densityPass && run.gates.machPass);
  const allRunsMature = allRunsCompleteAndFinite
    && completed.every((run) => run.gates.maturityPass);
  const allCoreSlipScreensPass = slips.length === 2
    && slips.every((entry) => entry.pass);
  const states = CONTRACT.gates.cycleResolvedTrend.stateCodes;
  const anyCycleTrendUnresolved = trends.some((entry) =>
    !entry.available
    || entry.classification === null
    || entry.classification.state === states.inconclusive);
  const anyCycleTrendResolvedNoGo = trends.some((entry) =>
    entry.classification?.state === states.noGo);
  const allCycleTrendsResolvedPass = trends.length === 4
    && trends.every((entry) =>
      entry.classification?.state === states.pass);
  const d54MaskPhaseMarginPass = phaseScreen?.pass ?? false;
  const finalDecision = decision(
    evidenceCompleteExceptIndependentRepeat,
    trends,
    phaseScreen,
    allRunsStable,
    allRunsMature,
    allCoreSlipScreensPass,
  );
  const result: BrinkmanMultiresolutionV2P1QualificationResult = {
    format: CONTRACT.artifact.format,
    contractIdentity: {
      format: CONTRACT.format,
      ...provenance,
    },
    a8qAnchorIdentity: anchor.identity,
    runs,
    d24AnchorComparisons: anchors,
    coreSlipScreens: slips,
    cycleTrendScreens: trends,
    d54MaskPhaseScreen: phaseScreen,
    d54Diagnostics: diagnostics,
    literatureProximityScreen: {
      observationOnly: true,
      records: literatureRecords,
      allFourD54CombinationsAvailable: literatureRecords.length === 4,
      cannotChangeDecision: true,
    },
    globalGate: {
      runCountPass,
      deterministicOrderPass,
      uniqueRunIdentityPass,
      allRunsCompleteAndFinite,
      allFrozenSourceHashesPass: provenance.sourceHashesVerified,
      d24AnchorIdentityPass,
      d24AnchorCommonProjectionPass,
      fullHalfAndFourBlockCoveragePass,
      latestSixCycleCoveragePass,
      latestSixCyclePlausibilityPass,
      everyStepRawForceIdentityPass,
      everyStepA2FormulaPass,
      forceRecompositionPass,
      evidenceCompleteExceptIndependentRepeat,
    },
    routeGate: {
      allRunsStable,
      allRunsMature,
      allCoreSlipScreensPass,
      allCycleTrendsResolvedPass,
      anyCycleTrendUnresolved,
      anyCycleTrendResolvedNoGo,
      d54MaskPhaseMarginPass,
      pass: finalDecision.pass,
    },
    decision: finalDecision,
  };
  assertFiniteTree(result);
  return result;
}

export function runBrinkmanMultiresolutionV2P1Qualification(
  provenance: BrinkmanMultiresolutionV2P1Provenance,
  anchor: BrinkmanMultiresolutionV2P1A8qAnchorInput,
  onProgress:
    ((progress: BrinkmanMultiresolutionV2P1Progress) => void) | null = null,
): BrinkmanMultiresolutionV2P1QualificationResult {
  const runs = buildBrinkmanMultiresolutionV2P1Definitions().map(
    (definition) => runBrinkmanMultiresolutionV2P1Case(
      definition,
      onProgress,
    ),
  );
  return assembleBrinkmanMultiresolutionV2P1Qualification(
    provenance,
    runs,
    anchor,
  );
}
