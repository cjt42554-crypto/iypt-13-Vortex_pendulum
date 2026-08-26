import assert from "node:assert/strict";
import { test } from "node:test";
import {
  D2Q9MrtBrinkmanSolver,
  type LbmBodyKinematics,
  type LbmCheckpoint,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { applyInletMechanism } from
  "../src/formal-inlet-mechanism-boundaries.ts";
import {
  createMassLedger,
  finishMassLedger,
  recordPopulationMassStep,
  shadowFormalStep,
} from "../src/formal-inlet-qualification-ledger.ts";

function cloneCheckpoint(checkpoint: LbmCheckpoint): LbmCheckpoint {
  return { ...checkpoint, distributions: checkpoint.distributions.slice() };
}

test("A8M no-body shadow is population-exact and closes its mass identity", () => {
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: 16,
    ny: 10,
    relaxationTime: 0.56,
    penalizationTimeSteps: 1.5,
    maskHalfThickness: 0.75,
    outerBoundary: "open-periodic-crossflow",
  });
  solver.initializeField((x, y) => ({
    rho: 1 + 1e-5 * Math.sin(0.2 * x + 0.3 * y),
    ux: 0.03 + 1e-5 * Math.cos(0.1 * x - 0.2 * y),
    uy: 1e-5 * Math.sin(0.3 * x + 0.1 * y),
  }));
  const preField = solver.macroscopicCopies(null);
  const pre = solver.checkpoint();
  solver.step(null, 0.03);
  const formal = solver.checkpoint();
  const shadow = shadowFormalStep(pre, null, 0.03);
  assert.deepEqual(shadow.distributions, formal.distributions);

  const candidate = cloneCheckpoint(formal);
  applyInletMechanism(candidate, {
    id: "ledger-test-s2",
    nominalDiameterScaleCells: 8,
    relaxationTime: 0.56,
    nx: 16,
    ny: 10,
    auditSteps: 1,
    rampSteps: 1,
    strategy: "legacy-zou-he-density-normalized",
  }, preField, 0.03);
  const ledger = createMassLedger(pre);
  const record = recordPopulationMassStep(
    1,
    "audit",
    shadow,
    formal,
    candidate,
    ledger,
  );
  const summary = finishMassLedger(ledger, "legacy-zou-he-density-normalized");
  assert.equal(record.formalShadowMismatchCount, 0);
  assert.equal(record.formalShadowMaximumPopulationAbsoluteDifference, 0);
  assert.ok(record.normalizedStepClosureResidual <= 1e-10);
  assert.equal(summary.gates.formalShadowExact, true);
  assert.equal(summary.gates.stepClosurePass, true);
  assert.equal(summary.gates.cumulativeClosurePass, true);
  assert.ok(summary.cumulativeAdapterAbsoluteTotal > 0);
});

test("A8M fixed-body shadow remains population-exact", () => {
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: 20,
    ny: 14,
    relaxationTime: 0.58,
    penalizationTimeSteps: 1.5,
    maskHalfThickness: 0.75,
    outerBoundary: "open-periodic-crossflow",
  });
  solver.initializeUniform(0.04);
  const body: LbmBodyKinematics = {
    centerX: 7,
    centerY: 6.5,
    radius: 3,
    velocityX: 0,
    velocityY: 0,
  };
  const pre = solver.checkpoint();
  solver.step(body, 0.04);
  const formal = solver.checkpoint();
  const shadow = shadowFormalStep(pre, body, 0.04);
  assert.deepEqual(shadow.distributions, formal.distributions);
  const ledger = createMassLedger(pre);
  recordPopulationMassStep(
    1,
    "audit",
    shadow,
    formal,
    cloneCheckpoint(formal),
    ledger,
  );
  const summary = finishMassLedger(ledger, "legacy-zou-he-derived-density");
  assert.equal(summary.maximumFormalShadowPopulationAbsoluteDifference, 0);
  assert.equal(summary.formalShadowMismatchCount, 0);
  assert.equal(summary.gates.pass, true);
});
