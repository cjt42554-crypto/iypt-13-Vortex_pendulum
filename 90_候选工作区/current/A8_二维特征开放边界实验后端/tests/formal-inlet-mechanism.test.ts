import assert from "node:assert/strict";
import test from "node:test";
import type { LbmCheckpoint } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { applyRegularizedBoundary, type BoundaryField } from
  "../src/formal-boundary-factorization-boundaries.ts";
import { equilibrium, macroscopic } from "../src/d2q9.ts";
import { applyInletMechanism } from
  "../src/formal-inlet-mechanism-boundaries.ts";
import {
  buildFormalInletMechanismCases,
  classifyPairEffect,
  type CaseDefinition,
  type InletMechanismStrategy,
} from "../src/formal-inlet-mechanism.ts";

function definition(strategy: InletMechanismStrategy): CaseDefinition {
  return {
    id: `synthetic-${strategy}`,
    nominalDiameterScaleCells: 8,
    relaxationTime: 0.56,
    nx: 8,
    ny: 8,
    auditSteps: 1,
    rampSteps: 1,
    strategy,
  };
}

function checkpoint(rho: number, ux: number, uy: number): LbmCheckpoint {
  const nx = 8;
  const ny = 8;
  const distributions = new Float64Array(9 * nx * ny);
  for (let cell = 0; cell < nx * ny; cell += 1) {
    for (let direction = 0; direction < 9; direction += 1) {
      distributions[9 * cell + direction] = equilibrium(direction, rho, ux, uy);
    }
  }
  return {
    format: "VP-HF-CFD2D-LBM-CHECKPOINT-v1",
    nx,
    ny,
    relaxationTime: 0.56,
    penalizationTimeSteps: 1.5,
    outerBoundary: "open-periodic-crossflow",
    maskHalfThickness: 0.75,
    step: 1,
    distributions,
  };
}

function preField(): BoundaryField {
  const cells = 8 * 8;
  return {
    rho: new Float64Array(cells).fill(1.1),
    ux: new Float64Array(cells).fill(0.02),
    uy: new Float64Array(cells),
    mask: new Float64Array(cells),
  };
}

test("A8L matrix contains 72 uniquely ordered cases at nine corners", () => {
  const cases = buildFormalInletMechanismCases();
  assert.equal(cases.length, 72);
  assert.equal(new Set(cases.map((entry) => entry.id)).size, 72);
  assert.equal(new Set(cases.map((entry) =>
    `${entry.nominalDiameterScaleCells}:${entry.relaxationTime}`)).size, 9);
  assert.deepEqual(cases.slice(0, 8).map((entry) => entry.strategy), [
    "legacy-zou-he-derived-density",
    "legacy-zou-he-density-normalized",
    "incoming-equilibrium-derived-density",
    "incoming-regularized-derived-density",
    "full-equilibrium-derived-density",
    "full-regularized-derived-density",
    "full-equilibrium-fixed-density",
    "full-regularized-fixed-density",
  ]);
});

test("density normalization fixes rho while preserving the formal velocity", () => {
  const state = checkpoint(1.1, 0.05, 0);
  applyInletMechanism(
    state,
    definition("legacy-zou-he-density-normalized"),
    preField(),
    0.05,
  );
  for (let y = 0; y < 8; y += 1) {
    const actual = macroscopic(state.distributions, 9 * 8 * y);
    assert.ok(Math.abs(actual.rho - 1) <= 2e-16);
    assert.ok(Math.abs(actual.ux - 0.05) <= 2e-16);
    assert.ok(Math.abs(actual.uy) <= 2e-16);
  }
});

test("incoming-only equilibrium leaves all six known populations untouched", () => {
  const state = checkpoint(1.1, 0.05, 0);
  const before = state.distributions.slice();
  applyInletMechanism(
    state,
    definition("incoming-equilibrium-derived-density"),
    preField(),
    0.05,
  );
  for (let y = 0; y < 8; y += 1) {
    const offset = 9 * 8 * y;
    for (const direction of [0, 2, 3, 4, 6, 7]) {
      assert.equal(state.distributions[offset + direction],
        before[offset + direction]);
    }
  }
});

test("strategy 8 is byte-identical to the frozen A8K regularized inlet", () => {
  const actual = checkpoint(1.1, 0.05, 0);
  const expected = checkpoint(1.1, 0.05, 0);
  const def = definition("full-regularized-fixed-density");
  const pre = preField();
  applyInletMechanism(actual, def, pre, 0.05);
  applyRegularizedBoundary(
    expected,
    def,
    pre,
    0,
    Array.from({ length: 8 }, () => ({ rho: 1, ux: 0.05, uy: 0 })),
    "left",
  );
  assert.deepEqual(actual.distributions, expected.distributions);
});

test("A8L pair classifier preserves preregistered causal semantics", () => {
  assert.equal(classifyPairEffect(0, 9),
    "SECOND_SUFFICIENT_WHERE_FIRST_FAILS");
  assert.equal(classifyPairEffect(9, 9), "SECOND_NOT_NECESSARY");
  assert.equal(classifyPairEffect(9, 0), "SECOND_NOT_SUFFICIENT");
  assert.equal(classifyPairEffect(0, 0), "BOTH_FAIL");
  assert.equal(classifyPairEffect(3, 7), "MIXED_OR_UNRESOLVED");
});
