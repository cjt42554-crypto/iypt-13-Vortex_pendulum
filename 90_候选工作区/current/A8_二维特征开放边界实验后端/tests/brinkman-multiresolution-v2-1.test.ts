import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT,
  buildBrinkmanMultiresolutionV2P1Definitions,
} from "../src/brinkman-multiresolution-contract-v2-1.ts";
import {
  assembleBrinkmanMultiresolutionV2P1Qualification,
} from "../src/brinkman-multiresolution-v2-1.ts";
import { projectA8qCommonRun } from
  "../src/brinkman-multiresolution-support-v2-1.ts";

function cycleEnvelope(diameter, metric) {
  if (metric === "drag") {
    if (diameter === 24) return { minimum: 0, maximum: 1, median: 0.5 };
    if (diameter === 36) return { minimum: 4, maximum: 5, median: 4.5 };
    return { minimum: 6, maximum: 6.1, median: 6.05 };
  }
  if (diameter === 24) return { minimum: 0.1, maximum: 0.11, median: 0.105 };
  if (diameter === 36) return { minimum: 0.2, maximum: 0.21, median: 0.205 };
  return { minimum: 0.25, maximum: 0.255, median: 0.2525 };
}

function sixCycles(diameter) {
  return Array.from({ length: 6 }, (_, index) => ({
    startTime: 5 * index,
    endTime: 5 * (index + 1),
    period: 5 + index * 0.005,
    strouhal: 1 / (5 + index * 0.005),
    meanDrag: diameter === 54 ? 6 + index * 0.01 : diameter / 10,
    meanLift: 0.001 * index,
    rawLiftRms: 0.3 + index * 0.0005,
    fullAnalysisMeanDemeanedLiftRms: diameter === 54
      ? 0.25 + index * 0.0005
      : diameter / 200,
  }));
}

function syntheticRun(originalDefinition) {
  const definition = {
    ...originalDefinition,
    totalSteps: 8,
    discardSteps: 4,
    analysisSamples: 4,
    halfWindowSamples: 2,
    diagnosticBlockSamples: 1,
  };
  const traceRecord = {
    step: 5,
    convectiveTime: 1,
    rawReaction: { x: 1, y: 0.3 },
    fictitiousFluidCorrection: { x: 0.1, y: 0.03 },
    correctedLoad: { x: 1.1, y: 0.33 },
    coreDensityWeight: 1,
    coreSlipSquaredNumerator: 1,
    coreSlipRms: 1,
    coreSlipMaximum: 1,
    transitionDensityWeight: 1,
    transitionSlipSquaredNumerator: 1,
    transitionSlipRms: 1,
    transitionSlipMaximum: 1,
    forceIdentity: {
      gates: { rawPass: true, a2Pass: true, pass: true },
    },
  };
  const cycles = sixCycles(definition.diameterCells);
  const meanDragEnvelope = cycleEnvelope(definition.diameterCells, "drag");
  const demeanedEnvelope = cycleEnvelope(
    definition.diameterCells,
    "demeaned",
  );
  const aggregateMeanDrag = definition.diameterCells === 54 ? 6.025 : 1;
  const aggregateDemeaned = definition.diameterCells === 54 ? 0.25125 : 0.2;
  const cycleResolved = {
    complete: true,
    decision: "COMPLETE",
    fullAnalysisMeanLift: 0,
    rawCrossingCount: 7,
    rawCrossingTimes: [0, 5, 10, 15, 20, 25, 30],
    selectedCrossingTimes: [0, 5, 10, 15, 20, 25, 30],
    periods: cycles.map((cycle) => cycle.period),
    cycles,
    aggregate: {
      meanPeriod: 5.0125,
      strouhal: 1 / 5.0125,
      meanDrag: aggregateMeanDrag,
      meanLift: 0.0025,
      rawLiftRms: 0.30125,
      fullAnalysisMeanDemeanedLiftRms: aggregateDemeaned,
    },
    envelopes: {
      period: { minimum: 5, maximum: 5.025, median: 5.0125 },
      strouhal: {
        minimum: 1 / 5.025,
        maximum: 1 / 5,
        median: 1 / 5.0125,
      },
      meanDrag: meanDragEnvelope,
      meanLift: { minimum: 0, maximum: 0.005, median: 0.0025 },
      rawLiftRms: { minimum: 0.3, maximum: 0.3025, median: 0.30125 },
      fullAnalysisMeanDemeanedLiftRms: demeanedEnvelope,
    },
  };
  const a8qGates = {
    executionPass: true,
    finitePass: true,
    densityPass: true,
    machPass: true,
    maturityPass: true,
    forceRecompositionPass: true,
    pass: true,
  };
  const slipValue = definition.diameterCells === 24
    ? 3
    : definition.diameterCells === 36 ? 2 : 1;
  return {
    definition,
    status: "completed",
    completedSteps: definition.totalSteps,
    trajectoryCompleteAndFinite: true,
    numericalIdentity: { id: definition.id },
    a8rNumericalIdentity: { phaseId: definition.phaseId },
    body: { centerX: 1, centerY: 1, radius: 1, velocityX: 0, velocityY: 0 },
    geometry: { effectiveMaskArea: 1 },
    forceIdentityGeometry: { controlVolumeMemberCount: 1 },
    window: {
      totalSteps: 8,
      discardSteps: 4,
      analysisSamples: 4,
      totalConvectiveTime: 80,
      discardConvectiveTime: 40,
    },
    diagnosticWindows: {
      full: { samples: 4 },
      secondHalf: { samples: 2 },
      fourEqualBlocks: Array.from({ length: 4 }, () => ({ samples: 1 })),
    },
    trace: Array.from({ length: 4 }, (_, index) => ({
      ...traceRecord,
      step: 5 + index,
      convectiveTime: 1 + index,
    })),
    forceDecomposition: { full: {} },
    slip: { full: { core: { densityWeightedRms: slipValue } } },
    metrics: { meanDrag: 1, liftRms: 0.3 },
    maturity: { passed: true },
    literature: { passed: false },
    recomposition: { passed: true },
    extrema: { maximumDensityDeviation: 0.01, maximumMach: 0.1 },
    cycleResolved,
    forceIdentitySummary: {
      analysisSteps: 4,
      everyStepRawPass: true,
      everyStepA2Pass: true,
      everyStepPass: true,
    },
    a8qGates,
    gates: {
      ...a8qGates,
      windowCoveragePass: true,
      cycleCoveragePass: true,
      cyclePlausibilityPass: true,
      independentRawForceIdentityPass: true,
      independentA2FormulaPass: true,
      pass: true,
    },
  };
}

function provenance() {
  return {
    formalSourceSha256: "a",
    contractDocumentSha256: "b",
    machineContractSha256: "c",
    contractTestSha256: "d",
    implementationUnlockReviewSha256: "e",
    frozenA8qStoredSha256: CONTRACT.sourceIdentity.frozenA8q.artifact.storedSha256,
    frozenA8qCanonicalSha256:
      CONTRACT.sourceIdentity.frozenA8q.artifact.canonicalSha256,
    frozenA8qSidecarSha256: CONTRACT.sourceIdentity.frozenA8q.sidecar.sha256,
    frozenSourceSha256: {},
    sourceHashesVerified: true,
    contractCommit: "contract",
    contractTestCommit: "test",
    implementationUnlockReviewCommit: "review",
    implementationCommit: "implementation",
    implementationTreeSha256: "tree",
  };
}

function anchor(runs) {
  const d24 = runs.filter((run) =>
    run.definition.diameterCells === 24
    && run.definition.phaseId === "baseline");
  const runsById = new Map();
  for (const [index, run] of d24.entries()) {
    runsById.set(
      CONTRACT.sourceIdentity.frozenA8q.d24AnchorCaseIds[index],
      projectA8qCommonRun(run),
    );
  }
  return {
    identity: {
      materialized: true,
      storedBytes: CONTRACT.sourceIdentity.frozenA8q.artifact.storedBytes,
      storedSha256: CONTRACT.sourceIdentity.frozenA8q.artifact.storedSha256,
      canonicalBytes: CONTRACT.sourceIdentity.frozenA8q.artifact.canonicalBytes,
      canonicalSha256: CONTRACT.sourceIdentity.frozenA8q.artifact.canonicalSha256,
      sidecarSha256: CONTRACT.sourceIdentity.frozenA8q.sidecar.sha256,
      sidecarExact: true,
    },
    runsById,
  };
}

function fixture() {
  const runs = buildBrinkmanMultiresolutionV2P1Definitions().map(syntheticRun);
  return { runs, anchor: anchor(runs) };
}

test("A8R v2.1 assembly reaches only candidate PASS before repeat closure", () => {
  const value = fixture();
  const result = assembleBrinkmanMultiresolutionV2P1Qualification(
    provenance(),
    value.runs,
    value.anchor,
  );
  assert.equal(result.globalGate.evidenceCompleteExceptIndependentRepeat, true);
  assert.equal(result.routeGate.allCycleTrendsResolvedPass, true);
  assert.equal(result.d54MaskPhaseScreen?.unorderedTracePairCount, 6);
  assert.equal(result.d54MaskPhaseScreen?.pairMetrics.length, 24);
  assert.equal(result.d54MaskPhaseScreen?.comparisonsPerTracePairAndMetric, 36);
  assert.equal(result.decision.code, CONTRACT.decision.passCode);
  assert.equal(result.decision.pass, true);
  assert.equal(result.decision.validOnlyAfterIndependentFullRepeatByteIdentity, true);
  assert.equal(
    result.decision.gates.independentFullRepeatVerifiedOutsideArtifact,
    false,
  );
});

test("A8R v2.1 incomplete anchor or force evidence is INCONCLUSIVE", () => {
  const missingAnchor = fixture();
  missingAnchor.anchor.runsById.clear();
  const anchorResult = assembleBrinkmanMultiresolutionV2P1Qualification(
    provenance(),
    missingAnchor.runs,
    missingAnchor.anchor,
  );
  assert.equal(anchorResult.decision.code, CONTRACT.decision.inconclusiveCode);
  assert.equal(anchorResult.globalGate.d24AnchorCommonProjectionPass, false);

  const failedForce = fixture();
  failedForce.runs[2].gates.independentRawForceIdentityPass = false;
  const forceResult = assembleBrinkmanMultiresolutionV2P1Qualification(
    provenance(),
    failedForce.runs,
    failedForce.anchor,
  );
  assert.equal(forceResult.decision.code, CONTRACT.decision.inconclusiveCode);
  assert.equal(forceResult.globalGate.everyStepRawForceIdentityPass, false);
});

test("A8R v2.1 unresolved trend precedes route NO-GO", () => {
  const value = fixture();
  const d36 = value.runs.find((run) =>
    run.definition.diameterCells === 36
    && run.definition.maskHalfThicknessCells === 0.5);
  assert.ok(d36 !== undefined);
  d36.cycleResolved.envelopes.meanDrag = {
    minimum: 0,
    maximum: 1,
    median: 0.5,
  };
  d36.gates.densityPass = false;
  const result = assembleBrinkmanMultiresolutionV2P1Qualification(
    provenance(),
    value.runs,
    value.anchor,
  );
  assert.equal(result.routeGate.anyCycleTrendUnresolved, true);
  assert.equal(result.decision.code, CONTRACT.decision.inconclusiveCode);
});

test("A8R v2.1 resolved trend or stability failure is route NO-GO", () => {
  const resolvedTrend = fixture();
  const d54 = resolvedTrend.runs.find((run) =>
    run.definition.diameterCells === 54
    && run.definition.maskHalfThicknessCells === 0.5
    && run.definition.phaseId === "baseline");
  assert.ok(d54 !== undefined);
  d54.cycleResolved.envelopes.meanDrag = {
    minimum: 0,
    maximum: 1,
    median: 0.5,
  };
  const trendResult = assembleBrinkmanMultiresolutionV2P1Qualification(
    provenance(),
    resolvedTrend.runs,
    resolvedTrend.anchor,
  );
  assert.equal(trendResult.routeGate.anyCycleTrendResolvedNoGo, true);
  assert.equal(trendResult.decision.code, CONTRACT.decision.noGoCode);

  const unstable = fixture();
  unstable.runs[3].gates.machPass = false;
  const unstableResult = assembleBrinkmanMultiresolutionV2P1Qualification(
    provenance(),
    unstable.runs,
    unstable.anchor,
  );
  assert.equal(unstableResult.decision.code, CONTRACT.decision.noGoCode);
});
