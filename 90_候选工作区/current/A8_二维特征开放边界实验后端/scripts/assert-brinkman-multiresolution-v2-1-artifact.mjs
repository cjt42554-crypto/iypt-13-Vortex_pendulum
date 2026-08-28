import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT } from
  "../src/brinkman-multiresolution-contract-v2-1.ts";
import { deriveBrinkmanScalingRunAnalysis } from
  "../src/brinkman-scaling-runs.ts";
import {
  deriveBrinkmanMultiresolutionV2P1DiagnosticWindows,
  deriveBrinkmanMultiresolutionV2P1ForceIdentitySummary,
  isCompletedBrinkmanMultiresolutionV2P1Run,
} from "../src/brinkman-multiresolution-runs-v2-1.ts";
import { assembleBrinkmanMultiresolutionV2P1Qualification } from
  "../src/brinkman-multiresolution-v2-1.ts";
import {
  analyzeCycleResolvedTrace,
  assertFiniteTree,
  neumaierSum,
} from "../src/brinkman-multiresolution-support-v2-1.ts";
import { assertMaterializedArtifact } from
  "./brinkman-multiresolution-artifact-v2-1.mjs";
import {
  filesAreByteIdentical,
  sha256CanonicalJson,
  sha256File,
  streamSelectedJsonValues,
} from "./formal-causal-reference-artifact-stream.mjs";
import {
  PACKAGE_ROOT,
  verifyBrinkmanMultiresolutionV2P1Preflight,
} from "./brinkman-multiresolution-preflight-v2-1.mjs";

const primaryPath = process.argv[2] === undefined
  ? resolve(PACKAGE_ROOT, CONTRACT.artifact.relativePath)
  : resolve(process.cwd(), process.argv[2]);
const repeatPath = process.argv[3] === undefined
  ? undefined
  : resolve(process.cwd(), process.argv[3]);
if (!primaryPath.endsWith(".json.gz")
  || (repeatPath !== undefined && !repeatPath.endsWith(".json.gz"))) {
  throw new Error("A8R v2.1 artifact paths must end with .json.gz");
}
const primarySidecarPath = primaryPath.replace(/\.json\.gz$/, ".sha256");
const repeatSidecarPath = repeatPath?.replace(/\.json\.gz$/, ".sha256");

const preflight = await verifyBrinkmanMultiresolutionV2P1Preflight({
  requireCleanWorktree: false,
});
await assertMaterializedArtifact(primaryPath, "primary A8R v2.1 artifact");

function sameNumber(actual, expected, label) {
  assert.ok(
    actual === expected,
    `${label}: ${actual} !== ${expected}`,
  );
}

function assertLedger(identity, component) {
  const ledger = identity.absoluteLedger[component];
  sameNumber(
    ledger.rawTotal,
    neumaierSum([
      ledger.prePopulationMomentum,
      ledger.postPopulationMomentum,
      ledger.crossingLinkMomentum,
      ledger.brinkmanForce,
    ]),
    `A8R v2.1 ${component} raw absolute ledger`,
  );
  sameNumber(
    ledger.a2Additional,
    neumaierSum([
      ledger.preFictitiousMomentum,
      ledger.postFictitiousMomentum,
    ]),
    `A8R v2.1 ${component} A2 additional ledger`,
  );
  sameNumber(
    ledger.a2Total,
    neumaierSum([ledger.rawTotal, ledger.a2Additional]),
    `A8R v2.1 ${component} A2 total ledger`,
  );
  const expectedRawBound = CONTRACT.forceIdentity.absoluteRoundoffLedger
    .multiplier * Number.EPSILON * Math.max(
      ledger.rawTotal / identity.coefficientScale,
      Number.EPSILON,
    );
  const expectedA2Bound = CONTRACT.forceIdentity.absoluteRoundoffLedger
    .multiplier * Number.EPSILON * Math.max(
      ledger.a2Total / identity.coefficientScale,
      Number.EPSILON,
    );
  sameNumber(
    identity.roundoffBounds.raw[component],
    expectedRawBound,
    `A8R v2.1 ${component} raw bound`,
  );
  sameNumber(
    identity.roundoffBounds.a2[component],
    expectedA2Bound,
    `A8R v2.1 ${component} A2 bound`,
  );
}

function assertForceIdentity(record) {
  const comparison = record.forceIdentity;
  const independent = comparison.independent;
  assert.equal(
    independent.format,
    "VP-A8R-V2P1-INDEPENDENT-FORCE-IDENTITY-STEP-v1",
  );
  assert.equal(independent.independentConstructionComplete, true);
  assertLedger(independent, "x");
  assertLedger(independent, "y");
  sameNumber(
    comparison.formal.correctedA2Load.x,
    comparison.formal.rawReaction.x
      + comparison.formal.fictitiousFluidCorrection.x,
    "A8R v2.1 formal corrected A2 x",
  );
  sameNumber(
    comparison.formal.correctedA2Load.y,
    comparison.formal.rawReaction.y
      + comparison.formal.fictitiousFluidCorrection.y,
    "A8R v2.1 formal corrected A2 y",
  );
  sameNumber(
    comparison.residuals.raw.x,
    independent.rawReaction.x - comparison.formal.rawReaction.x,
    "A8R v2.1 raw residual x",
  );
  sameNumber(
    comparison.residuals.raw.y,
    independent.rawReaction.y - comparison.formal.rawReaction.y,
    "A8R v2.1 raw residual y",
  );
  sameNumber(
    comparison.residuals.fictitiousFluidCorrection.x,
    independent.fictitiousFluidCorrection.x
      - comparison.formal.fictitiousFluidCorrection.x,
    "A8R v2.1 fictitious residual x",
  );
  sameNumber(
    comparison.residuals.fictitiousFluidCorrection.y,
    independent.fictitiousFluidCorrection.y
      - comparison.formal.fictitiousFluidCorrection.y,
    "A8R v2.1 fictitious residual y",
  );
  sameNumber(
    comparison.residuals.correctedA2.x,
    independent.correctedA2Load.x - comparison.formal.correctedA2Load.x,
    "A8R v2.1 corrected A2 residual x",
  );
  sameNumber(
    comparison.residuals.correctedA2.y,
    independent.correctedA2Load.y - comparison.formal.correctedA2Load.y,
    "A8R v2.1 corrected A2 residual y",
  );
  const rawX = Math.abs(comparison.residuals.raw.x)
    <= independent.roundoffBounds.raw.x;
  const rawY = Math.abs(comparison.residuals.raw.y)
    <= independent.roundoffBounds.raw.y;
  const fictitiousX = Math.abs(
    comparison.residuals.fictitiousFluidCorrection.x,
  ) <= independent.roundoffBounds.a2.x;
  const fictitiousY = Math.abs(
    comparison.residuals.fictitiousFluidCorrection.y,
  ) <= independent.roundoffBounds.a2.y;
  const correctedA2X = Math.abs(comparison.residuals.correctedA2.x)
    <= independent.roundoffBounds.a2.x;
  const correctedA2Y = Math.abs(comparison.residuals.correctedA2.y)
    <= independent.roundoffBounds.a2.y;
  assert.deepEqual(comparison.gates, {
    rawX,
    rawY,
    fictitiousX,
    fictitiousY,
    correctedA2X,
    correctedA2Y,
    rawPass: rawX && rawY,
    a2Pass: fictitiousX && fictitiousY && correctedA2X && correctedA2Y,
    pass: rawX && rawY
      && fictitiousX && fictitiousY && correctedA2X && correctedA2Y,
  });
}

function assertCompletedRun(run) {
  assert.equal(run.completedSteps, run.definition.totalSteps);
  assert.equal(run.trace.length, run.definition.analysisSamples);
  assert.equal(
    run.trace.length,
    run.definition.totalSteps - run.definition.discardSteps,
  );
  for (let index = 0; index < run.trace.length; index += 1) {
    const record = run.trace[index];
    assert.ok(record !== undefined);
    assert.equal(record.step, run.definition.discardSteps + index + 1);
    sameNumber(
      record.convectiveTime,
      record.step * CONTRACT.carrier.latticeVelocity
        / run.definition.diameterCells,
      "A8R v2.1 convective time",
    );
    assert.deepEqual(record.rawReaction, record.forceIdentity.formal.rawReaction);
    assert.deepEqual(
      record.fictitiousFluidCorrection,
      record.forceIdentity.formal.fictitiousFluidCorrection,
    );
    assert.deepEqual(
      record.correctedLoad,
      record.forceIdentity.formal.correctedA2Load,
    );
    assertForceIdentity(record);
  }
  const shared = deriveBrinkmanScalingRunAnalysis(run.trace, run.definition);
  assert.deepEqual(run.forceDecomposition, shared.forceDecomposition);
  assert.deepEqual(run.slip, shared.slip);
  assert.deepEqual(run.metrics, shared.metrics);
  assert.deepEqual(run.maturity, shared.maturity);
  assert.deepEqual(run.literature, shared.literature);
  assert.deepEqual(run.recomposition, shared.recomposition);
  assert.deepEqual(
    run.diagnosticWindows,
    deriveBrinkmanMultiresolutionV2P1DiagnosticWindows(
      run.trace,
      run.definition,
    ),
  );
  assert.deepEqual(
    run.cycleResolved,
    analyzeCycleResolvedTrace(run.trace.map((record) => ({
      time: record.convectiveTime,
      drag: record.correctedLoad.x,
      lift: record.correctedLoad.y,
    }))),
  );
  assert.deepEqual(
    run.forceIdentitySummary,
    deriveBrinkmanMultiresolutionV2P1ForceIdentitySummary(run.trace),
  );
  assert.match(run.geometry.maskDigestFnv1a32, /^[0-9a-f]{8}$/);
  const densityPass = run.extrema.maximumDensityDeviation
    <= CONTRACT.gates.maximumDensityDeviation;
  const machPass = run.extrema.maximumMach <= CONTRACT.gates.maximumMach;
  const windowCoveragePass = run.trace.length === run.definition.analysisSamples
    && run.diagnosticWindows.secondHalf.samples
      === run.definition.halfWindowSamples
    && run.diagnosticWindows.fourEqualBlocks.every((block) =>
      block.samples === run.definition.diagnosticBlockSamples);
  const cycleCoveragePass = run.cycleResolved.complete
    && run.cycleResolved.cycles.length
      === CONTRACT.windows.cycleResolved.retainedCompleteCycles;
  const cyclePlausibilityPass = run.cycleResolved.complete
    && run.cycleResolved.periods.every((period) =>
      period >= CONTRACT.windows.cycleResolved.crossingPlausibility
        .periodMinimumInclusive
      && period <= CONTRACT.windows.cycleResolved.crossingPlausibility
        .periodMaximumInclusive);
  assert.deepEqual(run.a8qGates, {
    executionPass: true,
    finitePass: true,
    densityPass,
    machPass,
    maturityPass: shared.maturity.passed,
    forceRecompositionPass: shared.recomposition.passed,
    pass: densityPass && machPass
      && shared.maturity.passed && shared.recomposition.passed,
  });
  assert.deepEqual(run.gates, {
    executionPass: true,
    finitePass: true,
    densityPass,
    machPass,
    maturityPass: shared.maturity.passed,
    forceRecompositionPass: shared.recomposition.passed,
    windowCoveragePass,
    cycleCoveragePass,
    cyclePlausibilityPass,
    independentRawForceIdentityPass:
      run.forceIdentitySummary.everyStepRawPass,
    independentA2FormulaPass: run.forceIdentitySummary.everyStepA2Pass,
    pass: run.a8qGates.pass
      && windowCoveragePass
      && cycleCoveragePass
      && cyclePlausibilityPass
      && run.forceIdentitySummary.everyStepRawPass
      && run.forceIdentitySummary.everyStepA2Pass,
  });
}

const selectedPaths = /^(format|contractIdentity|a8qAnchorIdentity|runs\.\d+|d24AnchorComparisons\.\d+|coreSlipScreens\.\d+|cycleTrendScreens\.\d+|d54MaskPhaseScreen|d54Diagnostics|literatureProximityScreen|globalGate|routeGate|decision)$/;
let format;
let contractIdentity;
let a8qAnchorIdentity;
const runs = [];
const d24AnchorComparisons = [];
const coreSlipScreens = [];
const cycleTrendScreens = [];
let d54MaskPhaseScreen;
let d54Diagnostics;
let literatureProximityScreen;
let globalGate;
let routeGate;
let decision;

for await (const { value } of streamSelectedJsonValues(
  primaryPath,
  selectedPaths,
)) {
  assertFiniteTree(value);
  if (typeof value === "string") {
    format = value;
  } else if (value?.implementationTreeSha256 !== undefined) {
    contractIdentity = value;
  } else if (value?.materialized === true && value?.sidecarExact === true) {
    a8qAnchorIdentity = value;
  } else if (value?.definition !== undefined && value?.status !== undefined) {
    if (isCompletedBrinkmanMultiresolutionV2P1Run(value)) {
      assertCompletedRun(value);
    } else {
      assert.equal(value.status, "failed");
      assert.equal(value.trajectoryCompleteAndFinite, false);
      assert.equal(typeof value.failure, "string");
    }
    runs.push(value);
  } else if (value?.a8qCaseId !== undefined) {
    d24AnchorComparisons.push(value);
  } else if (value?.values?.d24 !== undefined) {
    coreSlipScreens.push(value);
  } else if (value?.metric !== undefined && "classification" in value) {
    cycleTrendScreens.push(value);
  } else if (Array.isArray(value?.pairMetrics)) {
    d54MaskPhaseScreen = value;
  } else if (Array.isArray(value?.meanLiftPairs)) {
    d54Diagnostics = value;
  } else if (value?.observationOnly === true) {
    literatureProximityScreen = value;
  } else if (value?.runCountPass !== undefined) {
    globalGate = value;
  } else if (value?.allRunsStable !== undefined) {
    routeGate = value;
  } else if (value?.classification !== undefined && value?.code !== undefined) {
    decision = value;
  } else if (value === null && d54MaskPhaseScreen === undefined) {
    d54MaskPhaseScreen = null;
  } else {
    assert.fail(
      "unrecognized selected A8R v2.1 value with keys: "
        + Object.keys(value ?? {}).join(","),
    );
  }
}

assert.equal(format, CONTRACT.artifact.format);
assert.deepEqual(contractIdentity, {
  format: CONTRACT.format,
  ...preflight.provenance,
});
assert.deepEqual(a8qAnchorIdentity, preflight.anchor.identity);
assert.equal(runs.length, CONTRACT.matrix.uniqueRunCount);
assert.equal(d24AnchorComparisons.length, 2);
assert.equal(coreSlipScreens.length, 2);
assert.equal(cycleTrendScreens.length, 4);
assert.ok(d54Diagnostics !== undefined);
assert.ok(literatureProximityScreen !== undefined);
assert.ok(globalGate !== undefined);
assert.ok(routeGate !== undefined);
assert.ok(decision !== undefined);

const reconstructed = assembleBrinkmanMultiresolutionV2P1Qualification(
  preflight.provenance,
  runs,
  preflight.anchor,
);
assert.deepEqual(d24AnchorComparisons, reconstructed.d24AnchorComparisons);
assert.deepEqual(coreSlipScreens, reconstructed.coreSlipScreens);
assert.deepEqual(cycleTrendScreens, reconstructed.cycleTrendScreens);
assert.deepEqual(d54MaskPhaseScreen, reconstructed.d54MaskPhaseScreen);
assert.deepEqual(d54Diagnostics, reconstructed.d54Diagnostics);
assert.deepEqual(
  literatureProximityScreen,
  reconstructed.literatureProximityScreen,
);
assert.deepEqual(globalGate, reconstructed.globalGate);
assert.deepEqual(routeGate, reconstructed.routeGate);
assert.deepEqual(decision, reconstructed.decision);
assert.equal(decision.formalSourceModified, false);
assert.equal(decision.formalIntegrationUnlocked, false);
assert.equal(decision.prescribedMotionUnlocked, false);
assert.equal(decision.weakFsiUnlocked, false);
assert.equal(decision.validOnlyAfterIndependentFullRepeatByteIdentity, true);

async function verifyStoredCanonicalAndSidecar(artifactPath, sidecarPath) {
  await assertMaterializedArtifact(artifactPath, "A8R v2.1 result artifact");
  const stored = await sha256File(artifactPath);
  const canonical = await sha256CanonicalJson(artifactPath);
  const sidecar = await readFile(sidecarPath, "utf8");
  const storedName = basename(artifactPath);
  const canonicalName = storedName.replace(/\.gz$/, "")
    + " (canonical uncompressed bytes)";
  assert.equal(
    sidecar,
    canonical.sha256 + "  " + canonicalName + "\n"
      + stored.sha256 + "  " + storedName + "\n",
  );
  return { stored, canonical, sidecar };
}

const primaryIdentity = await verifyStoredCanonicalAndSidecar(
  primaryPath,
  primarySidecarPath,
);
let repeatByteIdentical = null;
let repeatSidecarByteIdentical = null;
let repeatIdentity = null;
if (repeatPath !== undefined && repeatSidecarPath !== undefined) {
  repeatIdentity = await verifyStoredCanonicalAndSidecar(
    repeatPath,
    repeatSidecarPath,
  );
  repeatByteIdentical = await filesAreByteIdentical(primaryPath, repeatPath);
  repeatSidecarByteIdentical = await filesAreByteIdentical(
    primarySidecarPath,
    repeatSidecarPath,
  );
  assert.equal(repeatByteIdentical, true);
  assert.equal(repeatSidecarByteIdentical, true);
}

console.log(JSON.stringify({
  primaryPath,
  repeatPath: repeatPath ?? null,
  repeatByteIdentical,
  repeatSidecarByteIdentical,
  independentFullRepeatClosed:
    repeatByteIdentical === true && repeatSidecarByteIdentical === true,
  primaryIdentity: {
    storedSha256: primaryIdentity.stored.sha256,
    storedBytes: primaryIdentity.stored.bytes,
    canonicalSha256: primaryIdentity.canonical.sha256,
    canonicalBytes: primaryIdentity.canonical.bytes,
  },
  repeatIdentity: repeatIdentity === null ? null : {
    storedSha256: repeatIdentity.stored.sha256,
    storedBytes: repeatIdentity.stored.bytes,
    canonicalSha256: repeatIdentity.canonical.sha256,
    canonicalBytes: repeatIdentity.canonical.bytes,
  },
  contractCommit: preflight.provenance.contractCommit,
  contractTestCommit: preflight.provenance.contractTestCommit,
  implementationUnlockReviewCommit:
    preflight.provenance.implementationUnlockReviewCommit,
  implementationCommit: preflight.provenance.implementationCommit,
  implementationTreeSha256: preflight.provenance.implementationTreeSha256,
  globalGate,
  routeGate,
  decision,
}, null, 2));
