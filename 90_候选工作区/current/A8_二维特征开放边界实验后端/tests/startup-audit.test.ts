import assert from "node:assert/strict";
import test from "node:test";
import { buildStartupAuditCases } from "../src/startup-audit.ts";
import { STARTUP_PROTOCOLS } from "../src/startup-audit-contract.ts";
import { CharacteristicOpenBoundarySolver } from "../src/solver.ts";

test("A8D full-factorial definition contains 243 unique cases", () => {
  const cases = buildStartupAuditCases();
  assert.equal(cases.length, 243);
  assert.equal(new Set(cases.map((entry) => entry.id)).size, 243);
  for (const protocol of STARTUP_PROTOCOLS) {
    assert.equal(
      cases.filter((entry) => entry.protocolId === protocol.id).length,
      81,
    );
  }
  assert.ok(cases.every((entry) => entry.auditSteps > 0));
  assert.ok(cases.every((entry) => entry.nominalReynoldsNumber > 0));
});

test("A8D preparation and in-audit ramps remain distinct", () => {
  const cases = buildStartupAuditCases();
  const smooth = cases.find((entry) =>
    entry.protocolId === "cosine-ramp-from-rest"
    && entry.nominalCylinderDiameterCells === 8);
  const compatible = cases.find((entry) =>
    entry.protocolId === "compatible-ramp-preconditioned"
    && entry.nominalCylinderDiameterCells === 8);
  assert.equal(smooth?.preparationSteps, 0);
  assert.equal(compatible?.preparationSteps, 160);
});

test("solver applies a bounded step-indexed inlet profile", () => {
  const solver = new CharacteristicOpenBoundarySolver({
    nx: 24,
    ny: 12,
    relaxationTime: 0.58,
    inletVelocity: 0.08,
    inletVelocityProfile: (step) => 0.01 * step,
    outletBoundary: "cbc-2d-regularized",
  });
  solver.initializeField(() => ({ rho: 1, ux: 0, uy: 0 }));
  solver.step();
  assert.equal(solver.inspect().appliedInletVelocity, 0.01);
  solver.step();
  assert.equal(solver.inspect().appliedInletVelocity, 0.02);
});

test("solver rejects an invalid profiled inlet value at the exact boundary step", () => {
  const solver = new CharacteristicOpenBoundarySolver({
    nx: 24,
    ny: 12,
    relaxationTime: 0.58,
    inletVelocity: 0.08,
    inletVelocityProfile: (step) => step < 2 ? 0 : 0.2,
    outletBoundary: "cbc-2d-regularized",
  });
  solver.initializeField(() => ({ rho: 1, ux: 0, uy: 0 }));
  solver.step();
  assert.throws(() => solver.step(), /invalid value at step 2/);
});

test("solver inspection reports deterministic fluid-cell extrema locations", () => {
  const solver = new CharacteristicOpenBoundarySolver({
    nx: 64,
    ny: 32,
    relaxationTime: 0.54,
    inletVelocity: 0.08,
    outletBoundary: "cbc-2d-regularized",
    solid: { centerX: 20, centerY: 16, radius: 4 },
  });
  solver.run(5);
  const first = solver.inspect();
  const second = solver.inspect();
  assert.deepEqual(second, first);
  for (const location of [
    first.minimumDensityLocation,
    first.maximumDensityLocation,
    first.maximumSpeedLocation,
  ]) {
    assert.ok(location.x >= 0 && location.x < solver.nx);
    assert.ok(location.y >= 0 && location.y < solver.ny);
    assert.equal(solver.isSolid(location.x, location.y), false);
  }
});
