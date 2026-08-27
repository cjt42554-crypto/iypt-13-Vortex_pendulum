import assert from "node:assert/strict";
import { test } from "node:test";
import type { LbmCheckpoint } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import type { IncomingCharacteristicBoundaryRow } from
  "../src/formal-incoming-characteristic-boundary.ts";
import {
  buildCompactReconstructionStep,
  captureField,
  correctedLoadSample,
  createCompactMassLedger,
  finishCompactMassLedger,
  finishCompactReconstruction,
  recordCompactMassStep,
} from "../src/formal-causal-reference-support.ts";

function checkpoint(distributions: readonly number[]): LbmCheckpoint {
  return {
    format: "VP-HF-CFD2D-LBM-CHECKPOINT-v1",
    nx: 8,
    ny: 8,
    relaxationTime: 0.56,
    penalizationTimeSteps: 1.5,
    outerBoundary: "open-periodic-crossflow",
    maskHalfThickness: 0.75,
    step: 0,
    distributions: Float64Array.from(distributions),
  };
}

test("A8O compact mass ledger closes the frozen formal-plus-adapter identity", () => {
  const initial = checkpoint(Array<number>(18).fill(1));
  const formal = checkpoint(Array<number>(18).fill(1.01));
  const candidateValues = Array<number>(18).fill(1.01);
  candidateValues[1] = 1.012;
  candidateValues[5] = 1.007;
  candidateValues[8] = 1.011;
  const candidate = checkpoint(candidateValues);
  const ledger = createCompactMassLedger(initial);
  const record = recordCompactMassStep(
    1,
    "causal",
    ledger.initialTotalMass,
    formal,
    candidate,
    ledger,
  );
  const summary = finishCompactMassLedger(ledger, 1);
  assert.ok(Math.abs(record.closureResidual) < 1e-12);
  assert.ok(Math.abs((record.adapterByDirection[1] ?? 0) - 0.002) < 1e-12);
  assert.ok(Math.abs((record.adapterByDirection[5] ?? 0) + 0.003) < 1e-12);
  assert.ok(Math.abs((record.adapterByDirection[8] ?? 0) - 0.001) < 1e-12);
  assert.equal(summary.cumulativeNonIncomingAbsoluteModification, 0);
  assert.equal(summary.gates.pass, true);
});

test("A8O compact reconstruction preserves extrema, exact writes, and digest", () => {
  const row = (y: number): IncomingCharacteristicBoundaryRow => ({
    y,
    knownMomentK: 0.92 + 0.01 * y,
    discriminant: 0.75 + 0.01 * y,
    targetRho: 1 + 0.001 * y,
    targetUx: 0.08,
    targetUy: 0,
    actualRho: 1 + 0.001 * y,
    actualUx: 0.08,
    actualUy: 0,
    incomingCharacteristicResidual: 0,
    discreteCompatibilityResidual: 0,
    densityMomentResidual: 0,
    uxMomentResidual: 0,
    uyMomentResidual: 0,
    knownPopulationMaximumAbsoluteDifference: 0,
    boundaryMach: 0.14,
  });
  const record = buildCompactReconstructionStep(1, [row(0), row(1)]);
  const initial = checkpoint(Array<number>(18).fill(1));
  const mass = finishCompactMassLedger(createCompactMassLedger(initial), 0);
  const summary = finishCompactReconstruction(
    "incoming-characteristic-compatible-zou-he",
    [record],
    mass,
    1,
    2,
  );
  assert.equal(record.rowDigestFnv1a32.length, 8);
  assert.equal(summary.stepDigestFnv1a32.length, 8);
  assert.equal(summary.minimumKnownMomentK, 0.92);
  assert.equal(summary.gates.pass, true);
});

test("A8O corrected load uses all-cell fictitious fluid momentum", () => {
  const before = captureField({
    rho: Float64Array.from([1, 1]),
    ux: Float64Array.from([0.1, 0.2]),
    uy: Float64Array.from([0, 0.1]),
    mask: Float64Array.from([1, 0.5]),
  });
  const after = captureField({
    rho: Float64Array.from([1, 1]),
    ux: Float64Array.from([0.2, 0.2]),
    uy: Float64Array.from([0.1, 0.1]),
    mask: Float64Array.from([1, 0.5]),
  });
  const sample = correctedLoadSample(
    1,
    {
      bodyForceImpulseX: -0.01,
      bodyForceImpulseY: -0.02,
      rawReactionImpulseX: 0.01,
      rawReactionImpulseY: 0.02,
      fluidBrinkmanWork: 0,
      rawSolidReactionWork: 0,
      penaltyDissipation: 0,
      algebraicWorkResidual: 0,
      absoluteWorkScale: 0,
    },
    before,
    after,
    8,
  );
  assert.ok(Number.isFinite(sample.drag));
  assert.ok(Number.isFinite(sample.lift));
  assert.notEqual(sample.drag, 0.01);
});
