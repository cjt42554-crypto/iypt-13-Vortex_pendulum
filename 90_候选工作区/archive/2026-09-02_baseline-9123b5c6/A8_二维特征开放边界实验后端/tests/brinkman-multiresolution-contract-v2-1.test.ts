import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT,
  BRINKMAN_MULTIRESOLUTION_V2P1_DIAMETERS as DIAMETERS,
  BRINKMAN_MULTIRESOLUTION_V2P1_MASK_HALF_THICKNESSES as MASKS,
  BRINKMAN_MULTIRESOLUTION_V2P1_PENALIZATION_TIME as ETA,
  BRINKMAN_MULTIRESOLUTION_V2P1_PHASES as PHASES,
  buildBrinkmanMultiresolutionV2P1Definitions,
} from "../src/brinkman-multiresolution-contract-v2-1.ts";

const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

const CONTRACT_DOCUMENT = Object.freeze({
  relativePath:
    "90_候选工作区/current/A8_二维特征开放边界实验后端/24_A8R_v2_1_周期有效性与主指标相位屏蔽预注册合同.md",
  sha256:
    "85bf3d6e6d6738353569dcf69d9f859639a4c8b116403df74185adc9e964e8bf",
});

const MACHINE_CONTRACT = Object.freeze({
  relativePath:
    "90_候选工作区/current/A8_二维特征开放边界实验后端/src/brinkman-multiresolution-contract-v2-1.ts",
  sha256:
    "c629337a7199f6c51a23735ca75432eaa5019b633afcf8fb4f908a6f723c335b",
});

const CONTRACT_TEST_UNLOCK_REVIEW = Object.freeze({
  relativePath:
    "90_候选工作区/current/A8_二维特征开放边界实验后端/25_A8R_v2_1_网页版Pro独立审查与合同测试解锁裁决.md",
  sha256:
    "221c44a09b975058f3c4b5cf8057ccf8bbcfcc4b42b3c8d53195b5bf70f1e291",
  commit: "c5ce2316f72fa302d62b01263842ed713ec46b58",
  codes: Object.freeze([
    "ACCEPT-A8R-V2P1-PRO-RESULT-BEFORE-CONTRACT",
    "UNLOCK-A8R-V2P1-PRO-CONTRACT-TESTS-ONLY",
    "KEEP-A8R-V2P1-PRO-IMPLEMENTATION-SMOKE-AND-RESEARCH-LOCKED",
  ]),
});

function sha256File(relativePath) {
  return createHash("sha256")
    .update(readFileSync(resolve(REPO_ROOT, relativePath)))
    .digest("hex");
}

function assertClose(actual, expected, tolerance = 1e-12) {
  const scale = Math.max(1, Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= tolerance * scale,
    `expected ${actual} to be within ${tolerance * scale} of ${expected}`,
  );
}

// Test-only reference oracles. They are not exported and cannot be used by a
// scientific runner or later implementation.
function rawPositiveSlopeCrossings(samples) {
  const crossings = [];
  for (let index = 0; index + 1 < samples.length; index += 1) {
    const left = samples[index];
    const right = samples[index + 1];
    assert.ok(left !== undefined && right !== undefined);
    if (left.z <= 0 && right.z > 0) {
      const denominator = right.z - left.z;
      assert.ok(denominator > 0);
      crossings.push(
        left.t - left.z * (right.t - left.t) / denominator,
      );
    }
  }
  return crossings;
}

function classifyRawCrossings(rawCrossings) {
  const cycle = CONTRACT.windows.cycleResolved;
  const gate = cycle.crossingPlausibility;
  const finiteAndIncreasing = rawCrossings.every((value, index) =>
    Number.isFinite(value)
    && (index === 0 || value > rawCrossings[index - 1]));
  if (!finiteAndIncreasing || rawCrossings.length < cycle.retainedLatestCrossings) {
    return {
      complete: false,
      rawCount: rawCrossings.length,
      selected: [],
      periods: [],
      decision: cycle.insufficientCrossingsDecision,
    };
  }
  const selected = rawCrossings.slice(-cycle.retainedLatestCrossings);
  const periods = selected.slice(1).map((value, index) =>
    value - selected[index]);
  const complete = periods.every((period) =>
    period >= gate.periodMinimumInclusive
    && period <= gate.periodMaximumInclusive);
  return {
    complete,
    rawCount: rawCrossings.length,
    selected,
    periods,
    aggregatePeriod: complete
      ? periods.reduce((sum, value) => sum + value, 0) / periods.length
      : null,
    decision: complete ? "COMPLETE" : gate.invalidPeriodDecision,
  };
}

function sampleSignal(start, end, step, signal) {
  const count = Math.floor((end - start) / step);
  return Array.from({ length: count + 1 }, (_, index) => {
    const t = start + index * step;
    return { t, z: signal(t) };
  });
}

function interpolateAt(times, values, target) {
  assert.equal(times.length, values.length);
  assert.ok(times.length >= 2);
  const first = times[0];
  const last = times[times.length - 1];
  assert.ok(first !== undefined && last !== undefined);
  assert.ok(target >= first && target <= last);
  if (target === last) {
    const value = values[values.length - 1];
    assert.ok(value !== undefined);
    return value;
  }
  for (let index = 0; index + 1 < times.length; index += 1) {
    const leftTime = times[index];
    const rightTime = times[index + 1];
    const leftValue = values[index];
    const rightValue = values[index + 1];
    assert.ok(
      leftTime !== undefined
      && rightTime !== undefined
      && leftValue !== undefined
      && rightValue !== undefined,
    );
    if (target >= leftTime && target <= rightTime) {
      const fraction = (target - leftTime) / (rightTime - leftTime);
      return leftValue + fraction * (rightValue - leftValue);
    }
  }
  assert.fail("target was not bracketed");
}

function compositeTrapezoid(times, values, start, end, transform) {
  const knots = [
    start,
    ...times.filter((value) => value > start && value < end),
    end,
  ];
  let integral = 0;
  for (let index = 0; index + 1 < knots.length; index += 1) {
    const leftTime = knots[index];
    const rightTime = knots[index + 1];
    assert.ok(leftTime !== undefined && rightTime !== undefined);
    const leftValue = transform(interpolateAt(times, values, leftTime));
    const rightValue = transform(interpolateAt(times, values, rightTime));
    integral += (rightTime - leftTime) * (leftValue + rightValue) / 2;
  }
  return integral;
}

function durationWeightedMean(values, durations) {
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);
  return values.reduce((sum, value, index) =>
    sum + value * durations[index], 0) / totalDuration;
}

function durationWeightedRms(values, durations) {
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);
  return Math.sqrt(values.reduce((sum, value, index) =>
    sum + value * value * durations[index], 0) / totalDuration);
}

function sixValueSummary(values) {
  assert.equal(values.length, 6);
  const ordered = [...values].sort((left, right) => left - right);
  const lowerMiddle = ordered[2];
  const upperMiddle = ordered[3];
  assert.ok(lowerMiddle !== undefined && upperMiddle !== undefined);
  return {
    minimum: ordered[0],
    maximum: ordered[5],
    median: (lowerMiddle + upperMiddle) / 2,
  };
}

function minkowskiDifference(minuend, subtrahend) {
  return [
    minuend[0] - subtrahend[1],
    minuend[1] - subtrahend[0],
  ];
}

function intervalExcludesZero(interval) {
  return interval[0] > 0 || interval[1] < 0;
}

function intervalSide(interval) {
  if (interval[0] > 0) return 1;
  if (interval[1] < 0) return -1;
  return 0;
}

function absoluteBounds(interval) {
  return [
    Math.min(Math.abs(interval[0]), Math.abs(interval[1])),
    Math.max(Math.abs(interval[0]), Math.abs(interval[1])),
  ];
}

function classifyTrend(coarse, middle, fine) {
  const states = CONTRACT.gates.cycleResolvedTrend.stateCodes;
  const first = minkowskiDifference(middle, coarse);
  const second = minkowskiDifference(fine, middle);
  if (!intervalExcludesZero(first) || !intervalExcludesZero(second)) {
    return states.inconclusive;
  }
  if (intervalSide(first) !== intervalSide(second)) {
    return states.noGo;
  }
  const firstBounds = absoluteBounds(first);
  const secondBounds = absoluteBounds(second);
  if (secondBounds[1] < firstBounds[0]) {
    return states.pass;
  }
  if (secondBounds[0] >= firstBounds[1]) {
    return states.noGo;
  }
  return states.inconclusive;
}

function unorderedPairs(values) {
  const pairs = [];
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      pairs.push([values[left], values[right]]);
    }
  }
  return pairs;
}

function relativeDifference(left, right) {
  return Math.abs(left - right) / Math.max(
    Math.abs(left),
    Math.abs(right),
    1e-12,
  );
}

function screenFourTraces(traces, threshold) {
  assert.equal(traces.length, 4);
  const pairs = unorderedPairs(traces);
  const aggregateDifferences = pairs.map(([left, right]) => {
    assert.ok(left !== undefined && right !== undefined);
    return relativeDifference(left.aggregate, right.aggregate);
  });
  const cycleDifferences = pairs.map(([left, right]) => {
    assert.ok(left !== undefined && right !== undefined);
    assert.equal(left.cycles.length, 6);
    assert.equal(right.cycles.length, 6);
    return left.cycles.flatMap((leftValue) =>
      right.cycles.map((rightValue) =>
        relativeDifference(leftValue, rightValue)));
  });
  return {
    unorderedPairCount: pairs.length,
    comparisonsPerPair: cycleDifferences.map((values) => values.length),
    aggregatePass: aggregateDifferences.every((value) => value < threshold),
    cyclePass: cycleDifferences.every((values) =>
      Math.max(...values) < threshold),
    worstCycleDifference: Math.max(...cycleDifferences.flat()),
  };
}

test("A8R v2.1 contract tests are independently unlocked and hash-bound", () => {
  assert.equal(CONTRACT.resultBlind, true);
  assert.equal(
    CONTRACT.format,
    "VP-A8R-V2P1-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-AND-FORCE-IDENTITY-CONTRACT-v1",
  );
  assert.equal(sha256File(CONTRACT_DOCUMENT.relativePath), CONTRACT_DOCUMENT.sha256);
  assert.equal(sha256File(MACHINE_CONTRACT.relativePath), MACHINE_CONTRACT.sha256);
  assert.equal(
    sha256File(CONTRACT_TEST_UNLOCK_REVIEW.relativePath),
    CONTRACT_TEST_UNLOCK_REVIEW.sha256,
  );
  const review = readFileSync(
    resolve(REPO_ROOT, CONTRACT_TEST_UNLOCK_REVIEW.relativePath),
    "utf8",
  );
  for (const code of CONTRACT_TEST_UNLOCK_REVIEW.codes) {
    assert.ok(review.includes(code));
  }
  assert.equal(
    CONTRACT_TEST_UNLOCK_REVIEW.commit,
    "c5ce2316f72fa302d62b01263842ed713ec46b58",
  );
});

test("A8R v2.1 freezes the unique eight-case matrix and formulas", () => {
  assert.deepEqual([...DIAMETERS], [24, 36, 54]);
  assert.deepEqual([...MASKS], [0.5, 0.75]);
  assert.equal(ETA, 1);
  assert.deepEqual(
    PHASES.map((phase) => [phase.id, phase.offsetYCells]),
    [
      ["baseline", 0.17320508075688773],
      ["minus-half-cell", -0.32679491924311227],
    ],
  );
  const definitions = buildBrinkmanMultiresolutionV2P1Definitions();
  assert.equal(definitions.length, 8);
  assert.equal(new Set(definitions.map((entry) => entry.id)).size, 8);
  assert.deepEqual(
    definitions.map((entry) => [
      entry.diameterCells,
      entry.maskHalfThicknessCells,
      entry.phaseId,
    ]),
    [
      [24, 0.5, "baseline"],
      [24, 0.75, "baseline"],
      [36, 0.5, "baseline"],
      [36, 0.75, "baseline"],
      [54, 0.5, "baseline"],
      [54, 0.75, "baseline"],
      [54, 0.5, "minus-half-cell"],
      [54, 0.75, "minus-half-cell"],
    ],
  );
  assert.deepEqual(
    definitions.map((entry) => entry.id),
    [
      "a8r-v2p1-d24-mask-0p50-phase-baseline-eta-1p00",
      "a8r-v2p1-d24-mask-0p75-phase-baseline-eta-1p00",
      "a8r-v2p1-d36-mask-0p50-phase-baseline-eta-1p00",
      "a8r-v2p1-d36-mask-0p75-phase-baseline-eta-1p00",
      "a8r-v2p1-d54-mask-0p50-phase-baseline-eta-1p00",
      "a8r-v2p1-d54-mask-0p75-phase-baseline-eta-1p00",
      "a8r-v2p1-d54-mask-0p50-phase-minus-half-cell-eta-1p00",
      "a8r-v2p1-d54-mask-0p75-phase-minus-half-cell-eta-1p00",
    ],
  );
  for (const definition of definitions) {
    const diameter = definition.diameterCells;
    const viscosity = 0.05 * diameter / 185;
    assert.equal(definition.kinematicViscosity, viscosity);
    assert.equal(definition.relaxationTime, 0.5 + 3 * viscosity);
    assert.equal(definition.etaHat, 0.05 / diameter);
    assert.equal(definition.penaltyLayerCells, Math.sqrt(viscosity));
    assert.equal(
      definition.penaltyLayerRelativeDiameter,
      Math.sqrt(viscosity) / diameter,
    );
    assert.equal(
      definition.maskToPenaltyLayerRatio,
      definition.maskHalfThicknessCells / Math.sqrt(viscosity),
    );
    assert.equal(definition.penaltyLayerAtLeastOneCell, false);
    assert.equal(definition.nx, 33.5 * diameter);
    assert.equal(definition.ny, 10 * diameter);
    assert.equal(definition.bodyCenterX, 14 * diameter);
    assert.equal(
      definition.bodyCenterY,
      0.5 * (definition.ny - 1) + definition.bodyPhaseOffsetYCells,
    );
    assert.equal(definition.bodyRadius, diameter / 2);
    assert.equal(definition.totalSteps, 80 * diameter / 0.05);
    assert.equal(definition.discardSteps, 40 * diameter / 0.05);
    assert.equal(definition.analysisSamples, 800 * diameter);
    assert.equal(definition.halfWindowSamples, 400 * diameter);
    assert.equal(definition.diagnosticBlockSamples, 200 * diameter);
  }
  assert.equal(CONTRACT.matrix.refinementRatio, 1.5);
  assert.equal(CONTRACT.matrix.freshInitialStateRequired, true);
  assert.equal(CONTRACT.matrix.d24CheckpointReuseForbidden, true);
  assert.equal(CONTRACT.matrix.earlyCaseRemovalForbidden, true);
});

test("A8R v2.1 verifies frozen source bytes and the D24 projection", () => {
  const source = CONTRACT.sourceIdentity;
  const boundFiles = [
    source.formalSource,
    source.v2p1ProDecision,
    source.supersededResultBlindV1.contractDocument,
    source.supersededResultBlindV1.machineContract,
    source.supersededResultBlindV2.contractDocument,
    source.supersededResultBlindV2.machineContract,
    source.frozenA8q.contractDocument,
    source.frozenA8q.contract,
    source.frozenA8q.contractTest,
    source.frozenA8q.runs,
    source.frozenA8q.support,
    source.frozenA8q.qualification,
    source.frozenA8q.runner,
    source.frozenA8q.artifactAsserter,
    source.frozenA8q.qualificationReport,
    source.frozenA8q.sidecar,
  ];
  for (const entry of boundFiles) {
    assert.equal(sha256File(entry.relativePath), entry.sha256);
  }
  const artifact = source.frozenA8q.artifact;
  assert.equal(sha256File(artifact.relativePath), artifact.storedSha256);
  assert.equal(
    statSync(resolve(REPO_ROOT, artifact.relativePath)).size,
    artifact.storedBytes,
  );
  assert.equal(artifact.canonicalBytes, 100_105_555);
  assert.equal(
    artifact.canonicalSha256,
    "16dad4a4d95eb91ad0e6f4e427d0d8ea05c8a349b479233479e03a78c6943082",
  );
  assert.deepEqual([...source.frozenA8q.d24AnchorCaseIds], [
    "a8q-d24-mask-0p50-eta-1p00",
    "a8q-d24-mask-0p75-eta-1p00",
  ]);
  assert.equal(CONTRACT.d24Anchor.phaseId, "baseline");
  assert.equal(CONTRACT.d24Anchor.freshRunRequired, true);
  assert.equal(CONTRACT.d24Anchor.checkpointReuseForbidden, true);
  assert.equal(CONTRACT.d24Anchor.numericTolerance, 0);
  assert.deepEqual([...CONTRACT.d24Anchor.commonProjection], [
    "numericalIdentity",
    "body",
    "geometry",
    "window",
    "completedSteps",
    "trace.step",
    "trace.convectiveTime",
    "trace.rawReaction",
    "trace.fictitiousFluidCorrection",
    "trace.correctedLoad",
    "trace.core-and-transition-slip",
    "extrema",
    "forceDecomposition",
    "slip",
    "metrics",
    "maturity",
    "literature",
    "recomposition",
    "A8Q-gates",
  ]);
  assert.notDeepEqual([0], [Number.MIN_VALUE]);
  assert.equal(
    CONTRACT.d24Anchor.mismatchDecision,
    CONTRACT.decision.inconclusiveCode,
  );
});

test("A8R v2.1 keeps four fixed blocks diagnostic-only", () => {
  const windows = CONTRACT.windows;
  assert.equal(windows.equalDiagnosticBlockCount, 4);
  assert.equal(
    windows.equalDiagnosticBlockRule,
    "array-index slices [0,N/4), [N/4,N/2), [N/2,3N/4), [3N/4,N)",
  );
  assert.equal(windows.sharedEndpointsForbidden, true);
  assert.equal(windows.missingOrDuplicateSamplesForbidden, true);
  assert.equal(windows.diagnosticBlocksCannotChangeFinalDecision, true);
  assert.equal(
    CONTRACT.gates.maturity.diagnosticBlocksCannotChangeMaturityOrFinalDecision,
    true,
  );
});

test("A8R v2.1 selects only the latest seven raw crossings", () => {
  const raw = [0, 5, 10, 15, 20, 25, 30, 35, 37.5, 40];
  const result = classifyRawCrossings(raw);
  assert.deepEqual(result.selected, [15, 20, 25, 30, 35, 37.5, 40]);
  assert.equal(result.complete, false);
  assert.equal(result.decision, CONTRACT.decision.inconclusiveCode);
  assert.ok(result.periods.some((period) =>
    period < CONTRACT.windows.cycleResolved.crossingPlausibility
      .periodMinimumInclusive));
  assert.notDeepEqual(result.selected, [5, 10, 15, 20, 25, 30, 35]);
  assert.equal(
    CONTRACT.windows.cycleResolved.crossingPlausibility
      .searchEarlierReplacementCrossingsForbidden,
    true,
  );
  assert.equal(classifyRawCrossings([0, 5, 10, 15, 20, 25]).complete, false);
  assert.equal(classifyRawCrossings([0, 5, 10, 15, 20, 20, 25]).complete, false);
});

test("A8R v2.1 crossing oracle covers sinusoid and exact sample zero", () => {
  const period = 5;
  const step = period / 64;
  const samples = sampleSignal(
    -period / 4 + period / 128,
    8.25 * period,
    step,
    (time) => Math.sin(2 * Math.PI * time / period),
  );
  const crossings = rawPositiveSlopeCrossings(samples);
  const result = classifyRawCrossings(crossings);
  assert.equal(result.complete, true);
  assert.equal(result.periods.length, 6);
  for (const measured of result.periods) assertClose(measured, period, 1e-8);
  assertClose(result.aggregatePeriod, period, 1e-8);

  const exactZeroCrossings = rawPositiveSlopeCrossings([
    { t: -1, z: -1 },
    { t: 0, z: 0 },
    { t: 1, z: 1 },
    { t: 2, z: -1 },
  ]);
  assert.deepEqual(exactZeroCrossings, [0]);
});

test("A8R v2.1 rejects high-frequency, extra, missing, and short evidence", () => {
  const period = 5;
  const samples = sampleSignal(
    -period / 4 + period / 4096,
    8.25 * period,
    period / 2048,
    (time) => Math.sin(2 * Math.PI * time / period)
      + 0.1 * Math.sin(40 * Math.PI * time / period),
  );
  const highFrequency = classifyRawCrossings(
    rawPositiveSlopeCrossings(samples),
  );
  assert.equal(highFrequency.complete, false);
  assert.equal(highFrequency.decision, CONTRACT.decision.inconclusiveCode);
  assert.ok(highFrequency.periods.some((value) => value < 1 / 0.24));

  const extra = classifyRawCrossings([0, 5, 10, 15, 20, 25, 27.5, 30]);
  assert.equal(extra.complete, false);
  assert.ok(extra.periods.includes(2.5));

  const missing = classifyRawCrossings([0, 5, 10, 15, 20, 25, 35, 40]);
  assert.equal(missing.complete, false);
  assert.ok(missing.periods.includes(10));

  assert.equal(classifyRawCrossings([0, 5, 10, 15, 20, 25]).complete, false);
});

test("A8R v2.1 period band includes both frozen boundaries", () => {
  const gate = CONTRACT.windows.cycleResolved.crossingPlausibility;
  const withinFrozenBand = (period) =>
    period >= gate.periodMinimumInclusive
    && period <= gate.periodMaximumInclusive;
  assert.equal(withinFrozenBand(gate.periodMinimumInclusive), true);
  assert.equal(withinFrozenBand(gate.periodMaximumInclusive), true);
  assert.equal(withinFrozenBand(gate.periodMinimumInclusive - 1e-12), false);
  assert.equal(withinFrozenBand(gate.periodMaximumInclusive + 1e-12), false);
  assert.equal(classifyRawCrossings([0, 5, 10, 15, 20, 25, 30]).complete, true);
});

test("A8R v2.1 freezes interpolated trapezoids and duration weighting", () => {
  const times = [0, 1, 2, 3];
  const values = [0, 2, 0, 2];
  const integral = compositeTrapezoid(
    times,
    values,
    0.5,
    2.5,
    (value) => value,
  );
  const squareIntegral = compositeTrapezoid(
    times,
    values,
    0.5,
    2.5,
    (value) => value * value,
  );
  assertClose(integral, 2);
  assertClose(squareIntegral, 3.5);
  assertClose(integral / 2, 1);
  assertClose(Math.sqrt(squareIntegral / 2), Math.sqrt(1.75));

  const durations = [1, 2, 3, 4, 5, 6];
  const perCycleValues = [1, 2, 3, 4, 5, 6];
  assertClose(durationWeightedMean(perCycleValues, durations), 91 / 21);
  assertClose(durationWeightedRms(perCycleValues, durations), Math.sqrt(21));
  assert.notEqual(
    durationWeightedRms(perCycleValues, durations),
    perCycleValues.reduce((sum, value) => sum + value, 0) / 6,
  );
  const aggregatePeriod = durations.reduce((sum, value) => sum + value, 0) / 6;
  assertClose(aggregatePeriod, 3.5);
  assertClose(1 / aggregatePeriod, 2 / 7);
  assert.deepEqual(sixValueSummary([6, 1, 4, 2, 5, 3]), {
    minimum: 1,
    maximum: 6,
    median: 3.5,
  });
});

test("A8R v2.1 freezes all five Minkowski trend classes", () => {
  const states = CONTRACT.gates.cycleResolvedTrend.stateCodes;
  assert.equal(
    classifyTrend([1, 1], [2, 2], [2.5, 2.5]),
    states.pass,
  );
  assert.equal(
    classifyTrend([1, 1], [2, 2], [1.5, 1.5]),
    states.noGo,
  );
  assert.equal(
    classifyTrend([1, 1], [2, 2], [3, 3]),
    states.noGo,
  );
  assert.equal(
    classifyTrend([0.9, 1.1], [1, 1.2], [1.1, 1.3]),
    states.inconclusive,
  );
  assert.equal(
    classifyTrend([1, 1], [1, 1], [1, 1]),
    states.inconclusive,
  );
  assert.equal(CONTRACT.gates.cycleResolvedTrend.exactPlatformCannotBeNoGo, true);
  assert.deepEqual(
    [...CONTRACT.gates.cycleResolvedTrend.requiredContractTestClasses],
    [
      "same-direction-shrinking",
      "opposite-direction",
      "resolved-nonshrinking",
      "unresolved-overlap",
      "exact-platform",
    ],
  );
});

test("A8R v2.1 freezes four metrics, six trace pairs, and 36 cycle pairs", () => {
  const gate = CONTRACT.gates.d54MaskPhaseMargin;
  assert.deepEqual([...gate.comparisonMetrics], [
    "six-cycle-aggregate-mean-drag",
    "six-cycle-aggregate-raw-lift-rms",
    "six-cycle-aggregate-full-analysis-mean-demeaned-lift-rms",
    "six-cycle-aggregate-mean-period",
  ]);
  const traces = [
    { id: "baseline-0.50", aggregate: 1, cycles: [0.998, 0.999, 1, 1.001, 1.002, 1] },
    { id: "baseline-0.75", aggregate: 1.005, cycles: [1.003, 1.004, 1.005, 1.006, 1.007, 1.005] },
    { id: "shifted-0.50", aggregate: 0.995, cycles: [0.993, 0.994, 0.995, 0.996, 0.997, 0.995] },
    { id: "shifted-0.75", aggregate: 1.002, cycles: [1, 1.001, 1.002, 1.003, 1.004, 1.002] },
  ];
  const screen = screenFourTraces(traces, 0.05);
  assert.equal(screen.unorderedPairCount, 6);
  assert.deepEqual(screen.comparisonsPerPair, [36, 36, 36, 36, 36, 36]);
  assert.equal(screen.aggregatePass, true);
  assert.equal(screen.cyclePass, true);
  assert.equal(gate.requireEveryMetricForEveryAggregateComparison, true);
  assert.equal(gate.requireEveryMetricForEverySixBySixCycleComparison, true);
  assert.equal(gate.aggregateThresholdIsStrict, true);
  assert.equal(gate.cycleThresholdIsStrict, true);
  assert.equal(relativeDifference(1, 0.95) < 0.05, false);
  assert.equal(relativeDifference(1, 0.950000000001) < 0.05, true);
});

test("A8R v2.1 cycle Cartesian gate is a joint narrow-band screen", () => {
  const traces = [
    { id: "a", aggregate: 1, cycles: [0.94, 1.012, 1.012, 1.012, 1.012, 1.012] },
    { id: "b", aggregate: 1, cycles: [1.06, 0.988, 0.988, 0.988, 0.988, 0.988] },
    { id: "c", aggregate: 1, cycles: [1, 1, 1, 1, 1, 1] },
    { id: "d", aggregate: 1, cycles: [1, 1, 1, 1, 1, 1] },
  ];
  const screen = screenFourTraces(traces, 0.05);
  assert.equal(screen.aggregatePass, true);
  assert.equal(screen.cyclePass, false);
  assert.ok(screen.worstCycleDifference > 0.05);
  assert.equal(
    CONTRACT.gates.d54MaskPhaseMargin.failureDecision,
    CONTRACT.decision.inconclusiveCode,
  );
});

test("A8R v2.1 keeps the A8Q margin and two-phase claim narrow", () => {
  const gate = CONTRACT.gates.d54MaskPhaseMargin;
  assert.equal(gate.frozenA8qRawLiftRmsRelativeDifference, 0.04995122077720906);
  assert.deepEqual([...gate.frozenA8qAdditionalBoundAppliesOnlyTo], [
    "baseline-phase-cross-mask-six-cycle-aggregate-raw-lift-rms",
    "baseline-phase-cross-mask-six-cycle-aggregate-full-analysis-mean-demeaned-lift-rms",
  ]);
  assert.equal(gate.frozenA8qAdditionalBoundCannotApplyToMeanDragOrPeriod, true);
  assert.equal(gate.aggregateStrouhalRetainedButNotSeparatelyGated, true);
  assert.equal(gate.meanLiftSignedAndAbsoluteDiagnosticsOnly, true);
  assert.equal(gate.meanLiftRelativeDifferenceGateForbidden, true);
  assert.equal(
    gate.phaseScope.interpretation,
    "screen-passed-for-two-preregistered-transverse-phases-at-D54-only",
  );
  assert.equal(gate.phaseScope.otherTransversePhasesCovered, false);
  assert.equal(gate.phaseScope.longitudinalPhasesCovered, false);
  assert.equal(gate.phaseScope.completePhaseScanCovered, false);
  assert.equal(gate.phaseScope.latticePhaseInvarianceClaimForbidden, true);
  assert.equal(gate.phaseScope.phaseConvergenceClaimForbidden, true);
});

test("A8R v2.1 separates raw population identity from A2 recomputation", () => {
  const force = CONTRACT.forceIdentity;
  const raw = force.independentRawPopulationMomentumIdentity;
  const a2 = force.independentA2FormulaRecomputation;
  assert.equal(raw.rawReactionFormula, "-(P_Omega_post-P_Omega_pre+Phi_outward)");
  assert.equal(raw.constructionUsesPopulationAndFixedControlVolumeOnly, true);
  assert.equal(raw.rawForceConstructionFromRecomputedBrinkmanForceForbidden, true);
  assert.deepEqual([...raw.forbiddenConstructionInputs], [
    "formal-forceX-array",
    "formal-forceY-array",
    "penaltyReaction-return-value",
    "BrinkmanStepExchange.bodyForceImpulseX",
    "BrinkmanStepExchange.bodyForceImpulseY",
    "BrinkmanStepExchange.rawReactionImpulseX",
    "BrinkmanStepExchange.rawReactionImpulseY",
  ]);
  assert.equal(
    raw.comparisonTarget,
    "formal-BrinkmanStepExchange-rawReactionImpulse-after-independent-construction",
  );
  assert.equal(
    a2.fictitiousCorrectionFormula,
    "sum_all_cells(chi*(rho_post*u_post-rho_pre*u_pre))",
  );
  assert.equal(
    a2.correctedLoadFormula,
    "independent-CV-raw-reaction+independent-fictitious-correction",
  );
  assert.equal(a2.rawIdentityFailureCannotBeCancelledByA2Correction, true);
  assert.equal(CONTRACT.gates.force.identitiesAreSeparateAndNonSubstitutable, true);
  assert.notEqual(raw.conclusionUpperBound, a2.conclusionUpperBound);
});

test("A8R v2.1 freezes deterministic ledgers and the formal-read barrier", () => {
  const force = CONTRACT.forceIdentity;
  assert.equal(
    force.independentMacroscopicReconstruction.perCellDirectionOrder,
    "D2Q9-direction-0-through-8-for-density-population-momentum-and-velocity-numerator",
  );
  assert.equal(
    force.independentMacroscopicReconstruction.perCellSummationAlgorithm,
    "Neumaier-compensated",
  );
  assert.equal(force.summation.algorithm, "Neumaier-compensated");
  assert.equal(
    force.summation.populationOrder,
    "y-ascending-x-ascending-D2Q9-direction-0-through-8",
  );
  assert.deepEqual(
    [...force.absoluteRoundoffLedger.rawLedgerTermsPerComponent],
    [
      "every-abs(c_i_component*f_i_pre)-term-inside-control-volume",
      "every-abs(c_i_component*f_i_post)-term-inside-control-volume",
      "every-abs(c_i_component*f_i_post_destination)-crossing-link-term",
      "every-abs(F_B_component)-term-over-all-global-cells",
    ],
  );
  assert.deepEqual(
    [...force.absoluteRoundoffLedger.a2AdditionalLedgerTermsPerComponent],
    [
      "every-abs(chi*rho_pre*u_pre_component)-term-over-all-global-cells",
      "every-abs(chi*rho_post*u_post_component)-term-over-all-global-cells",
    ],
  );
  assert.equal(
    force.absoluteRoundoffLedger.aggregateAbsoluteValueSubstitutionForbidden,
    true,
  );
  assert.equal(force.formalComparisonAccessOnlyAfterIndependentConstruction, true);
  assert.equal(
    force.formalComparisonValuesCannotBeReadUntilAllIndependentQuantitiesComplete,
    true,
  );
  assert.deepEqual([...force.allIndependentQuantitiesRequiredBeforeFormalRead], [
    "pre-and-post-control-volume-population-momentum",
    "control-surface-link-flux",
    "raw-control-volume-reaction",
    "pre-and-post-independent-macroscopic-fields",
    "cellwise-Brinkman-force",
    "all-absolute-roundoff-ledgers",
    "independent-fictitious-fluid-correction",
    "independent-A2-load",
    "raw-and-A2-roundoff-bounds",
  ]);
  assert.equal(
    force.controlVolume.bodyNullSmokeUsesCorrespondingFrozenDefinitionCenter,
    true,
  );
  assert.equal(
    force.noResultTestsRequiredBeforeResearch.unforcedFormalSolverSmoke
      .controlVolumeCenter,
    "corresponding-frozen-numerical-definition-bodyCenterX-bodyCenterY",
  );
});

test("A8R v2.1 freezes decisions, literature observation, and downstream locks", () => {
  assert.deepEqual(
    {
      pass: CONTRACT.decision.passCode,
      inconclusive: CONTRACT.decision.inconclusiveCode,
      noGo: CONTRACT.decision.noGoCode,
    },
    {
      pass: "PASS-A8R-V2P1-DISCRETE-MULTIRESOLUTION-MASK-PHASE-CANDIDATE-ONLY",
      inconclusive:
        "INCONCLUSIVE-A8R-V2P1-STATISTICS-PHASE-MARGIN-OR-FORCE-IDENTITY",
      noGo: "NO-GO-A8R-V2P1-RESOLVED-BRINKMAN-DISCRETE-ROUTE",
    },
  );
  assert.deepEqual([...CONTRACT.decision.precedence], [
    "incomplete-source-case-D24-anchor-repeat-cycle-coverage-cycle-plausibility-or-force-identity-evidence-is-INCONCLUSIVE",
    "unresolved-cycle-trend-or-mask-phase-margin-is-INCONCLUSIVE",
    "with-complete-and-resolved-evidence-stability-maturity-core-slip-or-resolved-trend-route-failure-is-NO-GO",
    "PASS-requires-source-stability-maturity-cycle-plausibility-cycle-trend-four-primary-metrics-for-two-masks-and-two-preregistered-transverse-phases-and-both-force-identities",
  ]);
  const literature = CONTRACT.literatureProximityScreen;
  assert.equal(literature.fixedTarget.rawLiftRms, 0.443);
  assert.equal(literature.fixedTarget.fullAnalysisMeanDemeanedLiftRms, 0.443);
  assert.equal(Object.hasOwn(literature.fixedTarget, "liftRms"), false);
  assert.equal(literature.ambiguousSingleLiftRmsFieldForbidden, true);
  assert.equal(literature.observationOnly, true);
  assert.equal(literature.cannotChangeA8rV2P1Decision, true);
  assert.equal(literature.cannotSelectMaskPhaseOrResolution, true);
  assert.equal(CONTRACT.decision.passReturnsToIndependentProOnly, true);
  assert.equal(CONTRACT.decision.formalSourceModified, false);
  assert.equal(CONTRACT.decision.formalIntegrationUnlocked, false);
  assert.equal(CONTRACT.decision.prescribedMotionUnlocked, false);
  assert.equal(CONTRACT.decision.weakFsiUnlocked, false);
  assert.equal(CONTRACT.workflow.contractTestsSeparateCommit, true);
  assert.equal(CONTRACT.workflow.noResultImplementationSeparateCommit, true);
  assert.equal(CONTRACT.workflow.smokeTestsRunOnlyAfterLaterImplementationAuthorization, true);
  assert.ok(CONTRACT.forbidden.includes("modify-formal-theory-or-program"));
  assert.ok(CONTRACT.forbidden.includes(
    "run-any-A8R-D24-D36-D54-or-lattice-phase-research-trajectory",
  ));
  assert.ok(CONTRACT.forbidden.includes(
    "write-Richardson-extrapolation-GCI-sharp-interface-or-load-qualification",
  ));
  assert.ok(CONTRACT.forbidden.includes(
    "run-prescribed-motion-weak-FSI-3D-free-surface-apparatus-or-experiment",
  ));
});
