import assert from "node:assert/strict";
import { test } from "node:test";
import type { LbmCheckpoint } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import type { FieldCapture } from
  "../src/formal-causal-reference-support.ts";
import { buildFormalDiscreteReferenceDefinitions } from
  "../src/formal-discrete-reference-contract.ts";
import { runDiscreteReferenceCase, runMaturityCase } from
  "../src/formal-discrete-reference-runs.ts";
import {
  addWindowFieldSample,
  buildPopulationAuditRecord,
  buildRegionLayout,
  compareMirroredWindowFields,
  createWindowField,
  digestNumberArrays,
  exactRegionSampleDifference,
  finishWindowField,
  isPopulationAuditStep,
  scheduledPopulationAuditCount,
  summarizePopulationAudits,
  type RegionFieldSample,
} from "../src/formal-discrete-reference-support.ts";

function checkpoint(values: readonly number[]): LbmCheckpoint {
  return {
    format: "VP-HF-CFD2D-LBM-CHECKPOINT-v1",
    nx: 8,
    ny: 8,
    relaxationTime: 0.56,
    penalizationTimeSteps: 1.5,
    outerBoundary: "open-periodic-crossflow",
    maskHalfThickness: 0.75,
    step: 0,
    distributions: Float64Array.from(values),
  };
}

function uniformField(nx: number, ny: number): FieldCapture {
  const cells = nx * ny;
  return {
    rho: Float64Array.from({ length: cells }, () => 1),
    ux: Float64Array.from({ length: cells }, () => 0.08),
    uy: new Float64Array(cells),
    mask: new Float64Array(cells),
    fictitiousMomentumX: 0,
    fictitiousMomentumY: 0,
    minimumDensity: 1,
    maximumDensity: 1,
    maximumSpeed: 0.08,
  };
}

test("A8P three-sum ledger closes an incoming-only synthetic adapter", () => {
  const pre = checkpoint(Array<number>(18).fill(1));
  const formal = checkpoint(Array<number>(18).fill(1.01));
  const candidateValues = Array<number>(18).fill(1.01);
  candidateValues[1] = 1.012;
  candidateValues[5] = 1.007;
  candidateValues[8] = 1.011;
  const candidate = checkpoint(candidateValues);
  const record = buildPopulationAuditRecord(
    1,
    "discrete-reference",
    pre,
    formal,
    candidate,
  );
  assert.equal(record.ordered.closureWithinScaledBound, true);
  assert.equal(record.pairwise.closureWithinScaledBound, true);
  assert.equal(record.neumaier.closureWithinScaledBound, true);
  assert.equal(record.nonIncomingAbsoluteModification, 0);
  const summary = summarizePopulationAudits([record], 1, 2);
  assert.equal(summary.scheduledAuditCount, 1);
  assert.equal(summary.gates.pass, true);
});

test("A8P population audit schedule includes first, stride, and final", () => {
  const steps = Array.from({ length: 10 }, (_, index) => index + 1)
    .filter((step) => isPopulationAuditStep(step, 10, 3));
  assert.deepEqual(steps, [1, 3, 6, 9, 10]);
  assert.equal(scheduledPopulationAuditCount(10, 3), 5);
});

test("A8P symmetric window has zero mirror defect and exact mirror comparison", () => {
  const nx = 25;
  const ny = 17;
  const field = uniformField(nx, ny);
  const layout = buildRegionLayout(field, nx, ny, 8, 8, 2);
  const mutable = createWindowField(layout);
  addWindowFieldSample(mutable, field);
  addWindowFieldSample(mutable, field);
  const summary = finishWindowField(mutable);
  assert.equal(summary.sampleCount, 2);
  assert.equal(summary.mirrorDefectRms, 0);
  assert.equal(
    summary.digestFnv1a32,
    digestNumberArrays([
      summary.meanRho,
      summary.meanUx,
      summary.meanUy,
      summary.densityFluctuationRms,
      summary.velocityFluctuationRms,
    ]),
  );
  const comparison = compareMirroredWindowFields(summary, summary);
  assert.equal(comparison.meanDensityRmsDifference, 0);
  assert.equal(comparison.meanVelocityRmsDifferenceOverInletVelocity, 0);
  assert.equal(comparison.fluctuationRmsRelativeDifference, 0);
});

test("A8P exact region comparison detects one-bit identity changes", () => {
  const sample = (rho: number): RegionFieldSample => ({
    step: 4,
    leftGraphDistance: 20,
    rightGraphDistance: 20,
    transverseSeamGraphDistance: 20,
    strictConePass: true,
    rho: [rho],
    ux: [0.08],
    uy: [0],
    fieldDigestFnv1a32: digestNumberArrays([[rho], [0.08], [0]]),
    rawReactionX: 0,
    rawReactionY: 0,
  });
  assert.equal(exactRegionSampleDifference(sample(1), sample(1)).exact, true);
  const changed = exactRegionSampleDifference(sample(1), sample(1 + 2 ** -52));
  assert.equal(changed.exact, false);
  assert.ok(changed.maximumAbsoluteDensityDifference > 0);
});

test("A8P two-step implementation smoke preserves the protected interior", () => {
  const definitions = buildFormalDiscreteReferenceDefinitions();
  const formal = definitions.find((entry) =>
    entry.cornerId === "d08-t0580"
    && entry.family === "localized-density-pulse-no-body"
    && entry.widthId === "w12d"
    && entry.strategy === "legacy-zou-he-derived-density");
  const candidate = definitions.find((entry) =>
    entry.cornerId === "d08-t0580"
    && entry.family === "localized-density-pulse-no-body"
    && entry.widthId === "w12d"
    && entry.strategy === "incoming-characteristic-compatible-zou-he");
  if (formal === undefined || candidate === undefined) {
    throw new Error("missing A8P smoke definitions");
  }
  const formalExecution = runDiscreteReferenceCase({
    ...formal,
    runSteps: 2,
    sampleStride: 1,
  });
  const candidateExecution = runDiscreteReferenceCase({
    ...candidate,
    runSteps: 2,
    sampleStride: 1,
  });
  assert.equal(formalExecution.result.trajectoryCompleteAndFinite, true);
  assert.equal(candidateExecution.result.trajectoryCompleteAndFinite, true);
  assert.equal(formalExecution.samples.length, 2);
  assert.equal(candidateExecution.samples.length, 2);
  for (let index = 0; index < 2; index += 1) {
    const formalSample = formalExecution.samples[index];
    const candidateSample = candidateExecution.samples[index];
    if (formalSample === undefined || candidateSample === undefined) {
      throw new Error("missing A8P smoke sample");
    }
    assert.equal(
      exactRegionSampleDifference(formalSample, candidateSample).exact,
      true,
    );
  }
});

test("A8P reduced-scale maturity smoke retains all three frozen tiers", () => {
  const run = runMaturityCase({
    id: "maturity-unit-smoke",
    parameterId: "unit-smoke",
    geometryId: "base",
    seedId: "large-positive",
    seedAmplitude: 1e-7,
    seedMagnitudeClass: "large",
    seedPolarity: 1,
    strategy: "legacy-zou-he-derived-density",
    nominalDiameterCells: 0.08,
    relaxationTime: 0.58,
    upstreamDiameters: 3.5,
    downstreamDiameters: 6.5,
    nx: 8,
    ny: 8,
    bodyCenterX: 4,
    bodyCenterY: 4,
    bodyRadius: -0.01,
    runSteps: 96,
    sampleStride: 1,
  });
  assert.equal(run.trajectoryCompleteAndFinite, true);
  assert.equal(run.internalLedgerGatePass, true);
  assert.equal(run.gate.durationTiersComplete, true);
  assert.deepEqual(
    run.windows.map((window) => window.tierConvectiveTime),
    [24, 48, 96],
  );
  assert.ok(run.windows.every((window) =>
    window.field.sampleCount === 12 && window.load.sampleCount === 12));
});
