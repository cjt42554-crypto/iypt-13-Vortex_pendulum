import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { D2Q9_CX, D2Q9_CY } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT } from
  "../src/brinkman-multiresolution-contract-v2-1.ts";
import {
  FormalComparisonReadBarrier,
  BRINKMAN_MULTIRESOLUTION_V2P1_IMPLEMENTATION_INPUTS as INPUTS,
  analyzeCycleResolvedTrace,
  analyticCircleMask,
  assertControlVolumeSupport,
  buildControlVolumeLayout,
  classifyCycleTrend,
  compareD24A8qCommonProjection,
  compareForceIdentity,
  constructIndependentForceIdentityAudit,
  copyVerifiedFormalPopulations,
  prepareForceIdentityGeometry,
  reconstructPopulationCell,
  screenD54MaskPhase,
} from "../src/brinkman-multiresolution-support-v2-1.ts";

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

const NX = 12;
const NY = 12;
const DIAMETER = 1;
const CENTER_X = 5.5;
const CENTER_Y = 5.5;
const INLET_VELOCITY = 0.1;

function restPopulations(nx = NX, ny = NY) {
  const values = new Float64Array(9 * nx * ny);
  for (let cell = 0; cell < nx * ny; cell += 1) {
    values[9 * cell] = 1;
  }
  return values;
}

function zeroGeometry() {
  return prepareForceIdentityGeometry(
    NX,
    NY,
    CENTER_X,
    CENTER_Y,
    DIAMETER,
    new Float64Array(NX * NY),
  );
}

function audit(pre, post, geometry = zeroGeometry()) {
  return constructIndependentForceIdentityAudit({
    prePopulations: pre,
    postPopulations: post,
    geometry,
    penalizationTimeSteps: 1,
    solidVelocity: { x: 0, y: 0 },
    inletVelocity: INLET_VELOCITY,
    diameterCells: DIAMETER,
  });
}

function destinationCell(x, y, direction) {
  return (x + (D2Q9_CX[direction] ?? 0))
    + NX * (y + (D2Q9_CY[direction] ?? 0));
}

function crossingFor(direction, outgoing) {
  const layout = zeroGeometry().controlVolume;
  for (let y = 1; y < NY - 1; y += 1) {
    for (let x = 1; x < NX - 1; x += 1) {
      const origin = x + NX * y;
      const destination = destinationCell(x, y, direction);
      const originInside = layout.membership[origin] === 1;
      const destinationInside = layout.membership[destination] === 1;
      if (outgoing && originInside && !destinationInside) {
        return { origin, destination };
      }
      if (!outgoing && !originInside && destinationInside) {
        return { origin, destination };
      }
    }
  }
  assert.fail(`missing ${outgoing ? "outgoing" : "incoming"} direction ${direction}`);
}

function assertClose(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${actual} is not close to ${expected}`,
  );
}

test("A8R v2.1 no-result implementation is hash-bound to its three gates", () => {
  for (const entry of [
    INPUTS.contract.document,
    INPUTS.contract.machine,
    INPUTS.contractTest,
    INPUTS.implementationUnlockReview,
  ]) {
    const actual = createHash("sha256")
      .update(readFileSync(resolve(REPOSITORY_ROOT, entry.relativePath)))
      .digest("hex");
    assert.equal(actual, entry.sha256, entry.relativePath);
  }
  assert.equal(
    INPUTS.implementationUnlockReview.acceptedCode,
    "ACCEPT-A8R-V2P1-PRO-CONTRACT-TESTS-RESULT-BLIND",
  );
  assert.equal(
    INPUTS.implementationUnlockReview.unlockCode,
    "UNLOCK-A8R-V2P1-PRO-NO-RESULT-IMPLEMENTATION-ONLY",
  );
  assert.equal(
    INPUTS.implementationUnlockReview.requiredCode,
    "REQUIRE-A8R-V2P1-PRO-SYNTHETIC-FORCE-IDENTITY-CANONICAL-A8Q-ANCHOR-AND-LFS-MATERIALIZATION-GATES",
  );
  assert.equal(
    INPUTS.implementationUnlockReview.lockCode,
    "KEEP-A8R-V2P1-PRO-FORMAL-SMOKE-RESEARCH-AND-DOWNSTREAM-LOCKED",
  );
});

test("A8R v2.1 verifies the runtime population view against checkpoint copies", () => {
  const distributions = restPopulations();
  const fake = {
    nx: NX,
    ny: NY,
    cells: NX * NY,
    distributions,
    checkpoint() {
      return {
        format: "VP-HF-CFD2D-LBM-CHECKPOINT-v1",
        nx: NX,
        ny: NY,
        relaxationTime: 0.8,
        penalizationTimeSteps: 1,
        outerBoundary: "open-periodic-crossflow",
        maskHalfThickness: 0.75,
        step: 7,
        distributions: distributions.slice(),
      };
    },
  };
  const snapshot = copyVerifiedFormalPopulations(fake);
  assert.equal(snapshot.step, 7);
  assert.equal(snapshot.checkpointElementwiseEqual, true);
  assert.deepEqual(snapshot.distributions, distributions);
  snapshot.distributions[0] = 2;
  assert.equal(distributions[0], 1);

  const mismatched = {
    ...fake,
    checkpoint() {
      const checkpoint = fake.checkpoint();
      checkpoint.distributions[1] = Number.MIN_VALUE;
      return checkpoint;
    },
  };
  assert.throws(
    () => copyVerifiedFormalPopulations(mismatched),
    /differ from the public checkpoint/,
  );
});

test("A8R v2.1 reconstructs D2Q9 macros in fixed Neumaier order", () => {
  const distributions = new Float64Array(9);
  distributions[0] = 1e16;
  distributions[1] = 1;
  distributions[2] = -1e16;
  const cell = reconstructPopulationCell(
    distributions,
    0,
    0,
    1,
    { x: 0, y: 0 },
  );
  assert.equal(cell.rho, 1);
  assert.equal(cell.populationMomentumX, 1);
  assert.equal(cell.populationMomentumY, -1e16);
  assert.equal(cell.brinkmanForceX, 0);
  assert.equal(cell.brinkmanForceY, 0);
});

test("A8R v2.1 uniform unforced populations have exactly zero force identity", () => {
  const pre = restPopulations();
  const independent = audit(pre, pre.slice());
  assert.deepEqual(independent.rawReactionLattice, { x: 0, y: 0 });
  assert.deepEqual(independent.rawReaction, { x: 0, y: 0 });
  assert.deepEqual(independent.fictitiousFluidCorrection, { x: 0, y: 0 });
  assert.deepEqual(independent.correctedA2Load, { x: 0, y: 0 });
  assert.deepEqual(independent.independentlyRecomputedBrinkmanReaction, {
    x: 0,
    y: 0,
  });
});

test("A8R v2.1 gives outward and inward link signs for all eight directions", () => {
  const delta = 0.125;
  for (let direction = 1; direction < 9; direction += 1) {
    const outgoing = crossingFor(direction, true);
    const outgoingPost = restPopulations();
    outgoingPost[9 * outgoing.destination + direction] += delta;
    const outwardAudit = audit(restPopulations(), outgoingPost);
    assertClose(
      outwardAudit.outwardLinkMomentum.x,
      (D2Q9_CX[direction] ?? 0) * delta,
    );
    assertClose(
      outwardAudit.outwardLinkMomentum.y,
      (D2Q9_CY[direction] ?? 0) * delta,
    );

    const incoming = crossingFor(direction, false);
    const incomingPost = restPopulations();
    incomingPost[9 * incoming.destination + direction] += delta;
    const inwardAudit = audit(restPopulations(), incomingPost);
    assertClose(
      inwardAudit.outwardLinkMomentum.x,
      -(D2Q9_CX[direction] ?? 0) * delta,
    );
    assertClose(
      inwardAudit.outwardLinkMomentum.y,
      -(D2Q9_CY[direction] ?? 0) * delta,
    );
  }
});

test("A8R v2.1 closes a known local momentum change with zero surface flux", () => {
  const geometry = zeroGeometry();
  const pre = restPopulations();
  const post = pre.slice();
  const centerCell = 5 + NX * 5;
  assert.equal(geometry.controlVolume.membership[centerCell], 1);
  assert.equal(geometry.controlVolume.surfaceAndOneLinkHalo[centerCell], 0);
  post[9 * centerCell + 1] += 0.2;
  const independent = audit(pre, post, geometry);
  assert.deepEqual(independent.outwardLinkMomentum, { x: 0, y: 0 });
  assertClose(independent.populationMomentum.post.x, 0.2);
  assertClose(independent.rawReactionLattice.x, -0.2);
  assertClose(
    independent.rawReaction.x,
    -0.2 / independent.coefficientScale,
  );
});

test("A8R v2.1 rejects mask and Brinkman-force support outside the control volume", () => {
  const layout = buildControlVolumeLayout(
    NX,
    NY,
    CENTER_X,
    CENTER_Y,
    DIAMETER,
  );
  const outside = 0;
  assert.equal(layout.membership[outside], 0);
  const badMask = new Float64Array(NX * NY);
  badMask[outside] = 1;
  assert.throws(
    () => assertControlVolumeSupport(layout, badMask),
    /nonzero mask lies outside/,
  );
  const forceX = new Float64Array(NX * NY);
  forceX[outside] = 1e-6;
  assert.throws(
    () => assertControlVolumeSupport(
      layout,
      new Float64Array(NX * NY),
      forceX,
      new Float64Array(NX * NY),
    ),
    /nonzero Brinkman force lies outside/,
  );
});

test("A8R v2.1 forms named absolute ledgers and scaled roundoff bounds", () => {
  const mask = new Float64Array(NX * NY);
  const centerCell = 5 + NX * 5;
  mask[centerCell] = 1;
  const geometry = prepareForceIdentityGeometry(
    NX,
    NY,
    CENTER_X,
    CENTER_Y,
    DIAMETER,
    mask,
  );
  const pre = restPopulations();
  pre[9 * centerCell + 1] = 0.1;
  const independent = audit(pre, pre.slice(), geometry);
  const ledger = independent.absoluteLedger.x;
  assert.ok(ledger.prePopulationMomentum > 0);
  assert.ok(ledger.postPopulationMomentum > 0);
  assert.ok(ledger.brinkmanForce > 0);
  assert.equal(
    ledger.rawTotal,
    ledger.prePopulationMomentum
      + ledger.postPopulationMomentum
      + ledger.crossingLinkMomentum
      + ledger.brinkmanForce,
  );
  assert.equal(
    independent.roundoffBounds.raw.x,
    4096 * Number.EPSILON * Math.max(
      ledger.rawTotal / independent.coefficientScale,
      Number.EPSILON,
    ),
  );
  assert.ok(independent.roundoffBounds.a2.x >= independent.roundoffBounds.raw.x);
});

test("A8R v2.1 formal getters are blocked until independent construction completes", () => {
  const independent = audit(restPopulations(), restPopulations());
  const barrier = new FormalComparisonReadBarrier();
  let getterCalls = 0;
  const getters = {
    rawReaction() {
      getterCalls += 1;
      return { x: 0, y: 0 };
    },
    fictitiousFluidCorrection() {
      getterCalls += 1;
      return { x: 0, y: 0 };
    },
    correctedA2Load() {
      getterCalls += 1;
      return { x: 0, y: 0 };
    },
  };
  assert.throws(() => barrier.read(getters), /cannot be read before/);
  assert.equal(getterCalls, 0);
  barrier.completeIndependentConstruction(independent);
  assert.equal(barrier.isOpen, true);
  assert.deepEqual(barrier.read(getters).rawReaction, { x: 0, y: 0 });
  assert.equal(getterCalls, 3);
});

test("A8R v2.1 raw and A2 residual failures cannot cancel each other", () => {
  const independent = audit(restPopulations(), restPopulations());
  const rawDelta = 2 * independent.roundoffBounds.raw.x;
  const a2Delta = 2 * independent.roundoffBounds.a2.x;
  const rawFailure = compareForceIdentity(independent, {
    rawReaction: () => ({ x: rawDelta, y: 0 }),
    fictitiousFluidCorrection: () => ({ x: 0, y: 0 }),
    correctedA2Load: () => ({ x: 0, y: 0 }),
  });
  assert.equal(rawFailure.gates.rawPass, false);
  assert.equal(rawFailure.gates.a2Pass, true);
  assert.equal(rawFailure.gates.pass, false);

  const a2Failure = compareForceIdentity(independent, {
    rawReaction: () => ({ x: 0, y: 0 }),
    fictitiousFluidCorrection: () => ({ x: a2Delta, y: 0 }),
    correctedA2Load: () => ({ x: a2Delta, y: 0 }),
  });
  assert.equal(a2Failure.gates.rawPass, true);
  assert.equal(a2Failure.gates.a2Pass, false);
  assert.equal(a2Failure.gates.pass, false);

  const cancellationAttempt = compareForceIdentity(independent, {
    rawReaction: () => ({ x: rawDelta, y: 0 }),
    fictitiousFluidCorrection: () => ({ x: -rawDelta, y: 0 }),
    correctedA2Load: () => ({ x: 0, y: 0 }),
  });
  assert.equal(cancellationAttempt.gates.rawPass, false);
  assert.equal(cancellationAttempt.gates.a2Pass, false);
  assert.equal(cancellationAttempt.gates.correctedA2X, true);
  assert.equal(cancellationAttempt.gates.pass, false);
});

test("A8R v2.1 analytic mask matches the frozen circle indicator formula", () => {
  const body = {
    centerX: CENTER_X,
    centerY: CENTER_Y,
    radius: 2,
    velocityX: 0,
    velocityY: 0,
  };
  const mask = analyticCircleMask(NX, NY, body, 0.5);
  assert.equal(mask[5 + NX * 5], 1);
  assert.equal(mask[0], 0);
  assert.ok((mask[7 + NX * 5] ?? 0) > 0);
  assert.ok((mask[7 + NX * 5] ?? 0) < 1);
  assert.deepEqual(
    analyticCircleMask(NX, NY, null, 0.5),
    new Float64Array(NX * NY),
  );
});

test("A8R v2.1 cycle implementation returns six plausible sine cycles", () => {
  const samples = Array.from({ length: 901 }, (_, index) => {
    const time = index * 0.05;
    return {
      time,
      drag: 2,
      lift: Math.sin(2 * Math.PI * time / 5),
    };
  });
  const analysis = analyzeCycleResolvedTrace(samples);
  assert.equal(analysis.complete, true);
  if (!analysis.complete) assert.fail(analysis.reason);
  assert.equal(analysis.cycles.length, 6);
  assert.equal(analysis.selectedCrossingTimes.length, 7);
  for (const period of analysis.periods) assertClose(period, 5, 1e-10);
  assertClose(analysis.aggregate.meanPeriod, 5, 1e-10);
  assertClose(analysis.aggregate.strouhal, 0.2, 1e-10);
  assertClose(analysis.aggregate.meanDrag, 2, 1e-10);
  assertClose(analysis.aggregate.rawLiftRms, Math.SQRT1_2, 1e-3);
});

test("A8R v2.1 cycle implementation fails closed on the frozen counterexamples", () => {
  const tooFew = analyzeCycleResolvedTrace([
    { time: 0, drag: 1, lift: -1 },
    { time: 1, drag: 1, lift: 1 },
  ]);
  assert.equal(tooFew.complete, false);
  assert.equal(tooFew.decision, CONTRACT.decision.inconclusiveCode);

  const highFrequency = Array.from({ length: 20001 }, (_, index) => {
    const time = index * 0.0025;
    return {
      time,
      drag: 1,
      lift: Math.sin(2 * Math.PI * time / 5)
        + 0.1 * Math.sin(40 * Math.PI * time / 5),
    };
  });
  const rejected = analyzeCycleResolvedTrace(highFrequency);
  assert.equal(rejected.complete, false);
  assert.equal(rejected.decision, CONTRACT.decision.inconclusiveCode);
  assert.ok(rejected.periods.some((period) => period < 1 / 0.24));
});

test("A8R v2.1 trend implementation covers all five frozen states", () => {
  const states = CONTRACT.gates.cycleResolvedTrend.stateCodes;
  assert.equal(classifyCycleTrend(
    { minimum: 1, maximum: 1 },
    { minimum: 2, maximum: 2 },
    { minimum: 2.5, maximum: 2.5 },
  ).state, states.pass);
  assert.equal(classifyCycleTrend(
    { minimum: 1, maximum: 1 },
    { minimum: 2, maximum: 2 },
    { minimum: 1.5, maximum: 1.5 },
  ).state, states.noGo);
  assert.equal(classifyCycleTrend(
    { minimum: 1, maximum: 1 },
    { minimum: 2, maximum: 2 },
    { minimum: 3, maximum: 3 },
  ).state, states.noGo);
  assert.equal(classifyCycleTrend(
    { minimum: 0.9, maximum: 1.1 },
    { minimum: 1, maximum: 1.2 },
    { minimum: 1.1, maximum: 1.3 },
  ).state, states.inconclusive);
  assert.equal(classifyCycleTrend(
    { minimum: 1, maximum: 1 },
    { minimum: 1, maximum: 1 },
    { minimum: 1, maximum: 1 },
  ).state, states.inconclusive);
});

function metricSeries(aggregate, spread = 0.002) {
  return {
    aggregate,
    cycles: [
      aggregate - spread,
      aggregate - spread / 2,
      aggregate,
      aggregate + spread / 2,
      aggregate + spread,
      aggregate,
    ],
  };
}

function d54Trace(id, phaseId, maskHalfThicknessCells, center) {
  return {
    id,
    phaseId,
    maskHalfThicknessCells,
    metrics: {
      "six-cycle-aggregate-mean-drag": metricSeries(center),
      "six-cycle-aggregate-raw-lift-rms": metricSeries(center),
      "six-cycle-aggregate-full-analysis-mean-demeaned-lift-rms":
        metricSeries(center),
      "six-cycle-aggregate-mean-period": metricSeries(center),
    },
  };
}

test("A8R v2.1 D54 screen evaluates six trace pairs and 36 cycle pairs", () => {
  const traces = [
    d54Trace("baseline-050", "baseline", 0.5, 1),
    d54Trace("baseline-075", "baseline", 0.75, 1.005),
    d54Trace("shifted-050", "minus-half-cell", 0.5, 0.998),
    d54Trace("shifted-075", "minus-half-cell", 0.75, 1.002),
  ];
  const screen = screenD54MaskPhase(traces);
  assert.equal(screen.unorderedTracePairCount, 6);
  assert.equal(screen.pairMetrics.length, 24);
  assert.equal(screen.comparisonsPerTracePairAndMetric, 36);
  assert.equal(screen.pass, true);

  const spreadFailure = structuredClone(traces);
  spreadFailure[0].metrics["six-cycle-aggregate-mean-drag"].cycles[0] = 0.8;
  const failed = screenD54MaskPhase(spreadFailure);
  assert.equal(failed.aggregatePass, true);
  assert.equal(failed.cyclePass, false);
  assert.equal(failed.pass, false);
});

function syntheticCommonRun() {
  return {
    numericalIdentity: { nx: 10 },
    body: { centerX: 5 },
    geometry: { effectiveMaskArea: 3 },
    window: { analysisSamples: 1 },
    completedSteps: 2,
    trace: [{
      step: 2,
      convectiveTime: 1,
      rawReaction: { x: 1, y: 2 },
      fictitiousFluidCorrection: { x: 3, y: 4 },
      correctedLoad: { x: 4, y: 6 },
      coreDensityWeight: 1,
      coreSlipSquaredNumerator: 2,
      coreSlipRms: 3,
      coreSlipMaximum: 4,
      transitionDensityWeight: 5,
      transitionSlipSquaredNumerator: 6,
      transitionSlipRms: 7,
      transitionSlipMaximum: 8,
    }],
    extrema: { maximumMach: 0.1 },
    forceDecomposition: { full: {} },
    slip: { full: {} },
    metrics: { meanDrag: 1 },
    maturity: { passed: true },
    literature: { passed: false },
    recomposition: { passed: true },
    gates: { pass: true },
  };
}

test("A8R v2.1 D24 anchor projection is exact and ignores only A8R additions", () => {
  const a8q = syntheticCommonRun();
  const a8r = structuredClone(a8q);
  a8r.a8qGates = a8r.gates;
  delete a8r.gates;
  a8r.cycleResolved = { complete: true };
  a8r.trace[0].forceIdentity = { pass: true };
  assert.deepEqual(compareD24A8qCommonProjection(a8q, a8r), {
    pass: true,
    numericTolerance: 0,
    mismatchPaths: [],
  });
  a8r.trace[0].rawReaction.x = 1 + Number.EPSILON;
  const mismatch = compareD24A8qCommonProjection(a8q, a8r);
  assert.equal(mismatch.pass, false);
  assert.ok(mismatch.mismatchPaths.includes("$.trace[0].rawReaction.x"));
});
