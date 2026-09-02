import assert from "node:assert/strict";
import { test } from "node:test";
import { D2Q9MrtBrinkmanSolver } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import {
  BRINKMAN_SCALING_CONTRACT as CONTRACT,
  buildBrinkmanScalingDefinitions,
} from "../src/brinkman-scaling-contract.ts";
import {
  deriveBrinkmanScalingRunAnalysis,
  type BrinkmanScalingTraceRecord,
} from "../src/brinkman-scaling-runs.ts";
import {
  buildFieldDiagnosticLayout,
  captureFieldDiagnostic,
  directionCompatibility,
  formalMacroscopicView,
  summarizeSlipTrace,
  summarizeVectorCoefficients,
} from "../src/brinkman-scaling-support.ts";

test("A8Q read-only runtime view exactly matches the public field copies", () => {
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: 24,
    ny: 20,
    relaxationTime: 0.58,
    penalizationTimeSteps: 1,
    outerBoundary: "open-periodic-crossflow",
    maskHalfThickness: 0.75,
  });
  const body = {
    centerX: 12,
    centerY: 9.5 + CONTRACT.carrier.bodyPhaseOffsetYCells,
    radius: 3,
    velocityX: 0,
    velocityY: 0,
  };
  solver.initializeUniform(CONTRACT.carrier.latticeVelocity, 0);
  const initialStep = solver.stepNumber;
  const view = formalMacroscopicView(solver, body);
  const copies = solver.macroscopicCopies(body);
  assert.deepEqual(view.rho, copies.rho);
  assert.deepEqual(view.ux, copies.ux);
  assert.deepEqual(view.uy, copies.uy);
  assert.deepEqual(view.mask, copies.mask);
  assert.equal(solver.stepNumber, initialStep);

  const layout = buildFieldDiagnosticLayout(view, 6);
  const snapshot = captureFieldDiagnostic(
    view,
    layout,
    CONTRACT.carrier.latticeVelocity,
  );
  assert.ok(layout.coreCellCount > 0);
  assert.ok(layout.transitionCellCount > 0);
  assert.ok(snapshot.coreDensityWeight > 0);
  assert.ok(snapshot.transitionDensityWeight > 0);

  solver.step(body, CONTRACT.carrier.latticeVelocity);
  const steppedView = formalMacroscopicView(solver, body);
  const steppedCopies = solver.macroscopicCopies(body);
  assert.deepEqual(steppedView.rho, steppedCopies.rho);
  assert.deepEqual(steppedView.ux, steppedCopies.ux);
  assert.deepEqual(steppedView.uy, steppedCopies.uy);
  assert.deepEqual(steppedView.mask, steppedCopies.mask);
});

test("A8Q force and slip summaries retain their frozen arithmetic", () => {
  const vectors = [
    { x: 1, y: -2 },
    { x: 2, y: -1 },
    { x: 3, y: 1 },
    { x: 4, y: 2 },
  ];
  const summary = summarizeVectorCoefficients(vectors);
  assert.equal(summary.samples, 4);
  assert.equal(summary.meanX, 2.5);
  assert.equal(summary.meanY, 0);
  assert.equal(summary.rmsX, Math.sqrt(7.5));
  assert.equal(summary.rmsY, Math.sqrt(2.5));

  const slip = summarizeSlipTrace(vectors.map((_record, index) => ({
    coreDensityWeight: 10,
    coreSlipSquaredNumerator: (index + 1) * 0.025,
    coreSlipRms: Math.sqrt((index + 1) * 0.025 / (0.05 ** 2 * 10)),
    coreSlipMaximum: index + 1,
    transitionDensityWeight: 5,
    transitionSlipSquaredNumerator: (index + 1) * 0.0125,
    transitionSlipRms: Math.sqrt(
      (index + 1) * 0.0125 / (0.05 ** 2 * 5),
    ),
    transitionSlipMaximum: 2 * (index + 1),
  })), 0.05);
  assert.equal(slip.core.densityWeight, 40);
  assert.equal(slip.transition.densityWeight, 20);
  assert.equal(slip.core.maximumPointwise, 4);
  assert.equal(slip.transition.maximumPointwise, 8);
});

test("A8Q direction compatibility distinguishes platform, agreement, and conflict", () => {
  const platform = directionCompatibility([1, 2], [1.005, 1.99]);
  assert.equal(platform.nearPlatform, true);
  assert.equal(platform.pass, true);

  const agreement = directionCompatibility([1, 2], [1.2, 2.3]);
  assert.equal(agreement.nearPlatform, false);
  assert.equal(agreement.sameNonzeroDirection, true);
  assert.equal(agreement.pass, true);

  const conflict = directionCompatibility([1, 2], [1.2, 1.7]);
  assert.equal(conflict.nearPlatform, false);
  assert.equal(conflict.sameNonzeroDirection, false);
  assert.equal(conflict.pass, false);
});

function syntheticTrace(count: number): BrinkmanScalingTraceRecord[] {
  return Array.from({ length: count }, (_unused, index) => {
    const phase = 2 * Math.PI * index / 10;
    const rawReaction = { x: 1.5 + 0.01 * Math.cos(phase), y: Math.sin(phase) };
    const fictitiousFluidCorrection = {
      x: -0.1 + 0.001 * Math.sin(phase),
      y: 0.05 * Math.cos(phase),
    };
    return {
      step: index + 1,
      convectiveTime: 0.01 * (index + 1),
      rawReaction,
      fictitiousFluidCorrection,
      correctedLoad: {
        x: rawReaction.x + fictitiousFluidCorrection.x,
        y: rawReaction.y + fictitiousFluidCorrection.y,
      },
      coreDensityWeight: 10,
      coreSlipSquaredNumerator: 2.5e-5,
      coreSlipRms: Math.sqrt(2.5e-5 / (0.05 ** 2 * 10)),
      coreSlipMaximum: 0.1,
      transitionDensityWeight: 5,
      transitionSlipSquaredNumerator: 5e-5,
      transitionSlipRms: Math.sqrt(5e-5 / (0.05 ** 2 * 5)),
      transitionSlipMaximum: 0.2,
    };
  });
}

test("A8Q analysis recomputes the exact A2 component identity", () => {
  const frozen = buildBrinkmanScalingDefinitions()[0];
  assert.ok(frozen !== undefined);
  const definition = {
    ...frozen,
    totalSteps: 40,
    discardSteps: 0,
  };
  const trace = syntheticTrace(40);
  const analysis = deriveBrinkmanScalingRunAnalysis(trace, definition);
  assert.equal(analysis.recomposition.maximumAbsoluteResidual, 0);
  assert.equal(analysis.recomposition.maximumResidualToAllowedBound, 0);
  assert.equal(analysis.recomposition.passed, true);

  const corrupted = structuredClone(trace);
  const first = corrupted[0];
  assert.ok(first !== undefined);
  first.correctedLoad.x += 1e-8;
  const rejected = deriveBrinkmanScalingRunAnalysis(corrupted, definition);
  assert.ok(rejected.recomposition.maximumAbsoluteResidual > 0);
  assert.equal(rejected.recomposition.passed, false);
});
