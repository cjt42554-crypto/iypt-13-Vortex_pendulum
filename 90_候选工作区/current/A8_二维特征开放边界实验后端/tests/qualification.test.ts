import assert from "node:assert/strict";
import test from "node:test";
import { CS, CS2, equilibrium, macroscopic } from "../src/d2q9.ts";
import { computeRightCbc2dTargets } from "../src/characteristic-boundary.ts";
import { QUALIFICATION_CONTRACT } from "../src/contracts.ts";
import { CharacteristicOpenBoundarySolver } from "../src/solver.ts";

test("D2Q9 equilibrium recovers prescribed primitive state", () => {
  const rho = 1.03;
  const ux = 0.07;
  const uy = -0.02;
  const distributions = new Float64Array(9);
  for (let direction = 0; direction < 9; direction += 1) {
    distributions[direction] = equilibrium(direction, rho, ux, uy);
  }
  const recovered = macroscopic(distributions);
  assert.ok(Math.abs(recovered.rho - rho) < 1e-14);
  assert.ok(Math.abs(recovered.ux - ux) < 1e-14);
  assert.ok(Math.abs(recovered.uy - uy) < 1e-14);
});

test("CBC-2D leaves a uniform far-field state invariant", () => {
  const nx = 12;
  const ny = 8;
  const rho = new Float64Array(nx * ny).fill(1);
  const ux = new Float64Array(nx * ny).fill(0.05);
  const uy = new Float64Array(nx * ny);
  const result = computeRightCbc2dTargets(nx, ny, rho, ux, uy, {
    farFieldDensity: 1,
    meanStreamwiseVelocity: 0.05,
    characteristicLength: nx,
    pressureRelaxationSigma: 0.9,
    transverseRelaxation: 0.05 / CS,
  });
  for (const state of result.states) {
    assert.ok(Math.abs(state.rho - 1) < 1e-14);
    assert.ok(Math.abs(state.ux - 0.05) < 1e-14);
    assert.ok(Math.abs(state.uy) < 1e-14);
  }
});

test("CBC-2D transverse terms cancel for a strictly one-dimensional state", () => {
  const nx = 16;
  const ny = 10;
  const rho = new Float64Array(nx * ny);
  const ux = new Float64Array(nx * ny);
  const uy = new Float64Array(nx * ny);
  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      const cell = x + nx * y;
      rho[cell] = 1 + 1e-3 * x;
      ux[cell] = 0.04 + CS * (rho[cell]! - 1);
    }
  }
  const result = computeRightCbc2dTargets(nx, ny, rho, ux, uy, {
    farFieldDensity: 1,
    meanStreamwiseVelocity: 0.04,
    characteristicLength: nx,
    pressureRelaxationSigma: 0,
    transverseRelaxation: 0,
  });
  assert.ok(result.diagnostics.maximumAbsoluteTransverseWave < 1e-15);
});

test("regularized CBC solver preserves uniform flow for 80 steps", () => {
  const solver = new CharacteristicOpenBoundarySolver({
    nx: 48,
    ny: 16,
    relaxationTime: 0.58,
    inletVelocity: 0.05,
    outletBoundary: "cbc-2d-regularized",
    characteristicLength: 48,
  });
  solver.run(80);
  const inspection = solver.inspect();
  assert.ok(Math.abs(inspection.minimumDensity - 1) < 1e-12);
  assert.ok(Math.abs(inspection.maximumDensity - 1) < 1e-12);
  assert.ok(Math.abs(inspection.maximumSpeed - 0.05) < 1e-12);
});

test("solid bounce-back produces finite positive drag in uniform startup", () => {
  const solver = new CharacteristicOpenBoundarySolver({
    nx: 64,
    ny: 32,
    relaxationTime: 0.58,
    inletVelocity: 0.05,
    outletBoundary: "cbc-2d-regularized",
    solid: { centerX: 20, centerY: 16, radius: 4 },
  });
  solver.run(20);
  const inspection = solver.inspect();
  assert.ok(Number.isFinite(inspection.forceX));
  assert.ok(inspection.forceX > 0);
  assert.ok(inspection.maximumDensity > 0);
});

test("qualification contract remains frozen at v1 gates", () => {
  assert.equal(QUALIFICATION_CONTRACT.format, "VP-A8-CBC2D-QUALIFICATION-CONTRACT-v1");
  assert.equal(QUALIFICATION_CONTRACT.numericalStability.maximumDensityDeviation, 0.12);
  assert.equal(QUALIFICATION_CONTRACT.numericalStability.maximumMach, 0.30);
  assert.equal(QUALIFICATION_CONTRACT.acousticPulse.maximumNormalizedReferenceError, 0.10);
  assert.equal(QUALIFICATION_CONTRACT.acousticPulse.minimumImprovementAgainstZouHe, 0.50);
  assert.equal(QUALIFICATION_CONTRACT.convectedVortex.maximumNormalizedReferenceError, 0.45);
  assert.equal(QUALIFICATION_CONTRACT.convectedVortex.minimumImprovementAgainstZouHe, 0.15);
  assert.equal(
    QUALIFICATION_CONTRACT.fixedCylinderStartup.minimumProbeRmsImprovementAgainstZouHe,
    0.20,
  );
  assert.equal(
    QUALIFICATION_CONTRACT.fixedCylinderStartup.minimumFieldErrorImprovementAgainstZouHe,
    0.10,
  );
  assert.equal(CS2, 1 / 3);
});

test("regularized reconstruction preserves target mass and momentum", async () => {
  const { fillRegularizedState } = await import("../src/d2q9.ts");
  const distributions = new Float64Array(9);
  const target = { rho: 0.997, ux: 0.043, uy: -0.011 };
  fillRegularizedState(distributions, 0, target, {
    xx: 2.5e-4,
    xy: -1.2e-4,
    yy: -0.8e-4,
  });
  const recovered = macroscopic(distributions);
  assert.ok(Math.abs(recovered.rho - target.rho) < 1e-14);
  assert.ok(Math.abs(recovered.ux - target.ux) < 1e-14);
  assert.ok(Math.abs(recovered.uy - target.uy) < 1e-14);
});

test("CBC-2D reports nonzero transverse waves for a two-dimensional synthetic field", () => {
  const nx = 18;
  const ny = 12;
  const rho = new Float64Array(nx * ny);
  const ux = new Float64Array(nx * ny);
  const uy = new Float64Array(nx * ny);
  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      const cell = x + nx * y;
      rho[cell] = 1 + 2e-4 * Math.sin(2 * Math.PI * y / ny);
      ux[cell] = 0.05 + 1e-3 * Math.cos(2 * Math.PI * y / ny);
      uy[cell] = 2e-3 * Math.sin(2 * Math.PI * y / ny);
    }
  }
  const result = computeRightCbc2dTargets(nx, ny, rho, ux, uy, {
    farFieldDensity: 1,
    meanStreamwiseVelocity: 0.05,
    characteristicLength: nx,
    pressureRelaxationSigma: 0.9,
    transverseRelaxation: 0.05 / CS,
  });
  assert.ok(result.diagnostics.maximumAbsoluteTransverseWave > 1e-8);
});
