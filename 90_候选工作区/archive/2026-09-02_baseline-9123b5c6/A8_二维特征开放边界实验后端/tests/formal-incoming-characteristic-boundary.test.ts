import assert from "node:assert/strict";
import { test } from "node:test";
import { D2Q9MrtBrinkmanSolver } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import {
  applyIncomingCharacteristicBoundary,
  knownLeftBoundaryMoment,
  solveCompatibleIncomingCharacteristicState,
} from "../src/formal-incoming-characteristic-boundary.ts";
import { FORMAL_INCOMING_CHARACTERISTIC_CONTRACT as CONTRACT } from
  "../src/formal-incoming-characteristic-contract.ts";

test("A8N S9 preserves a compatible uniform target state", () => {
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: 9,
    ny: 8,
    relaxationTime: 0.56,
    penalizationTimeSteps: 1.5,
    maskHalfThickness: 0.75,
    outerBoundary: "open-periodic-crossflow",
  });
  const farFieldUx = CONTRACT.commonNumerics.inletVelocityLattice;
  solver.initializeUniform(farFieldUx);
  const checkpoint = solver.checkpoint();
  const before = checkpoint.distributions.slice();
  const rows = applyIncomingCharacteristicBoundary(
    checkpoint,
    checkpoint.nx,
    checkpoint.ny,
    farFieldUx,
  );
  assert.equal(rows.length, checkpoint.ny);
  for (const row of rows) {
    assert.ok(Math.abs(row.targetRho - 1) <= Number.EPSILON);
    assert.ok(Math.abs(row.targetUx - farFieldUx) <= Number.EPSILON);
    assert.ok(Math.abs(row.incomingCharacteristicResidual) <= 1e-15);
    assert.ok(Math.abs(row.discreteCompatibilityResidual) <= 1e-15);
    assert.equal(row.knownPopulationMaximumAbsoluteDifference, 0);
  }
  let maximumPopulationDifference = 0;
  for (let index = 0; index < before.length; index += 1) {
    maximumPopulationDifference = Math.max(
      maximumPopulationDifference,
      Math.abs((checkpoint.distributions[index] ?? 0) - (before[index] ?? 0)),
    );
  }
  assert.ok(maximumPopulationDifference <= Number.EPSILON);
});

test("A8N S9 leaves all six known populations exact under an outgoing perturbation", () => {
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: 8,
    ny: 8,
    relaxationTime: 0.56,
    penalizationTimeSteps: 1.5,
    maskHalfThickness: 0.75,
    outerBoundary: "open-periodic-crossflow",
  });
  const farFieldUx = CONTRACT.commonNumerics.inletVelocityLattice;
  solver.initializeUniform(farFieldUx);
  const checkpoint = solver.checkpoint();
  const offset = 9 * checkpoint.nx;
  checkpoint.distributions[offset + 3]
    = (checkpoint.distributions[offset + 3] ?? 0) + 1e-4;
  const knownDirections = [0, 2, 3, 4, 6, 7] as const;
  const before = knownDirections.map((direction) =>
    checkpoint.distributions[offset + direction]);
  const k = knownLeftBoundaryMoment(checkpoint.distributions, offset);
  const expected = solveCompatibleIncomingCharacteristicState(k, farFieldUx, 1);
  const rows = applyIncomingCharacteristicBoundary(
    checkpoint,
    checkpoint.nx,
    checkpoint.ny,
    farFieldUx,
  );
  const row = rows[1];
  assert.ok(row !== undefined);
  assert.equal(row.targetRho, expected.rho);
  assert.equal(row.targetUx, expected.ux);
  assert.deepEqual(
    knownDirections.map((direction) => checkpoint.distributions[offset + direction]),
    before,
  );
  assert.equal(row.knownPopulationMaximumAbsoluteDifference, 0);
  assert.ok(Math.abs(row.incomingCharacteristicResidual) <= 1e-15);
  assert.ok(Math.abs(row.discreteCompatibilityResidual) <= 1e-15);
});

test("A8N S9 rejects an invalid known moment without clipping", () => {
  assert.throws(
    () => solveCompatibleIncomingCharacteristicState(0, 0.08, 0),
    /known moment K must be finite and positive/,
  );
  assert.throws(
    () => solveCompatibleIncomingCharacteristicState(Number.NaN, 0.08, 0),
    /known moment K must be finite and positive/,
  );
});
