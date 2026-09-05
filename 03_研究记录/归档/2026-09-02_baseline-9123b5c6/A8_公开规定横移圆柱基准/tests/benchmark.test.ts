import test from "node:test";
import assert from "node:assert/strict";
import {
  AMPLITUDE_OVER_DIAMETER,
  compareForcedMetrics,
  forcedTarget,
  NATURAL_STROUHAL,
  prescribedMotion,
} from "../src/benchmark-contract.ts";
import {
  dominantStrouhal,
  summarizeCoefficients,
} from "../src/benchmark-metrics.ts";

test("prescribed motion has the frozen amplitude and frequency", () => {
  const diameterCells = 20;
  const latticeVelocity = 0.05;
  const frequencyRatio = 0.8;
  const quarterPeriod = diameterCells
    / (4 * frequencyRatio * NATURAL_STROUHAL * latticeVelocity);
  const atZero = prescribedMotion(0, diameterCells, latticeVelocity, frequencyRatio);
  const atQuarter = prescribedMotion(
    quarterPeriod,
    diameterCells,
    latticeVelocity,
    frequencyRatio,
  );
  assert.ok(Math.abs(atZero.displacementCells) < 1e-14);
  assert.ok(atZero.velocityLattice > 0);
  assert.ok(Math.abs(atQuarter.displacementCells - AMPLITUDE_OVER_DIAMETER * diameterCells) < 1e-12);
  assert.ok(Math.abs(atQuarter.velocityLattice) < 1e-12);
});

test("coefficient summary distinguishes RMS from fluctuation RMS", () => {
  const samples = [
    { drag: 1, lift: -1 },
    { drag: 2, lift: 1 },
    { drag: 1, lift: -1 },
    { drag: 2, lift: 1 },
  ];
  const summary = summarizeCoefficients(samples);
  assert.equal(summary.meanDrag, 1.5);
  assert.equal(summary.meanLift, 0);
  assert.ok(Math.abs(summary.dragFluctuationRms - 0.5) < 1e-15);
  assert.equal(summary.liftRms, 1);
});

test("dominant Strouhal scan recovers a synthetic fixed-cylinder signal", () => {
  const convectiveTimeStep = 0.02;
  const samples = Array.from({ length: 5000 }, (_, index) => (
    0.7 * Math.sin(2 * Math.PI * NATURAL_STROUHAL * convectiveTimeStep * index + 0.3)
  ));
  const result = dominantStrouhal(samples, convectiveTimeStep);
  assert.ok(Math.abs(result.strouhal - NATURAL_STROUHAL) <= 0.00025);
  assert.ok(Math.abs(result.normalizedAmplitude - 0.7) < 0.01);
});

test("literature gate accepts the frozen target and rejects a large mismatch", () => {
  const target = forcedTarget(1.1);
  const exact = compareForcedMetrics(target, target);
  assert.equal(exact.passed, true);
  const mismatch = compareForcedMetrics(
    { meanDrag: 1.0, dragRms: 0.02, liftRms: 0.2 },
    target,
  );
  assert.equal(mismatch.passed, false);
  assert.equal(mismatch.comparisons.every((item) => !item.passed), true);
});
