import assert from "node:assert/strict";
import test from "node:test";
import { buildStartupAuditCases } from "../src/startup-audit.ts";
import { STARTUP_PROTOCOLS } from "../src/startup-audit-contract.ts";
import { RAMP_SENSITIVITY_CONTRACT } from "../src/ramp-sensitivity-contract.ts";
import { buildRampSensitivityCases } from "../src/ramp-sensitivity.ts";
import {
  COLLISION_CONTRAST_CONTRACT,
  COLLISION_KERNELS,
  COLLISION_STARTUP_PROTOCOLS,
} from "../src/collision-contrast-contract.ts";
import { buildCollisionContrastCases } from "../src/collision-contrast.ts";
import {
  LATTICE_PHASE_CONTRACT,
  LATTICE_PHASE_STARTUP_PROTOCOLS,
} from "../src/lattice-phase-contract.ts";
import { buildLatticePhaseCases } from "../src/lattice-phase.ts";
import {
  FORMAL_KERNEL_STARTUP_CONTRACT,
  FORMAL_KERNEL_STARTUP_PROTOCOLS,
} from "../src/formal-kernel-startup-contract.ts";
import { buildFormalKernelStartupCases } from "../src/formal-kernel-startup.ts";
import { FORMAL_RAMP_SENSITIVITY_CONTRACT } from "../src/formal-ramp-sensitivity-contract.ts";
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

test("A8E ramp-duration sensitivity contract is frozen before execution", () => {
  assert.equal(
    RAMP_SENSITIVITY_CONTRACT.format,
    "VP-A8E-CBC2D-RAMP-SENSITIVITY-CONTRACT-v1",
  );
  assert.equal(RAMP_SENSITIVITY_CONTRACT.matrix.inletVelocityLattice, 0.08);
  assert.deepEqual(
    RAMP_SENSITIVITY_CONTRACT.matrix.rampDurationDiameters,
    [0, 0.25, 0.5, 1, 2, 5, 10, 20],
  );
  assert.equal(RAMP_SENSITIVITY_CONTRACT.matrix.initialField, "uniform-rest");
  assert.equal(
    RAMP_SENSITIVITY_CONTRACT.matrix.zeroDurationIdentity,
    "boundary-step-from-rest",
  );
  assert.equal(RAMP_SENSITIVITY_CONTRACT.gates.maximumDensityDeviation, 0.12);
  assert.equal(RAMP_SENSITIVITY_CONTRACT.gates.maximumMach, 0.30);
  assert.equal(
    RAMP_SENSITIVITY_CONTRACT.interpretationRules.formalIntegrationUnlocked,
    false,
  );
});

test("A8E matrix contains 72 unique cases with exact ramp step products", () => {
  const cases = buildRampSensitivityCases();
  assert.equal(cases.length, 72);
  assert.equal(new Set(cases.map((entry) => entry.id)).size, 72);
  assert.ok(cases.every((entry) => Number.isInteger(entry.rampSteps)));
  assert.equal(
    cases.filter((entry) => entry.rampDurationDiameters === 0).length,
    9,
  );
  assert.equal(
    cases.filter((entry) => entry.rampDurationDiameters === 20).length,
    9,
  );
});

test("A8F collision contrast contract is frozen before execution", () => {
  assert.equal(
    COLLISION_CONTRAST_CONTRACT.format,
    "VP-A8F-CBC2D-COLLISION-CONTRAST-CONTRACT-v1",
  );
  assert.deepEqual(COLLISION_KERNELS, ["regularized-bgk", "raw-bgk"]);
  assert.deepEqual(
    COLLISION_STARTUP_PROTOCOLS.map((entry) => entry.id),
    ["uniform-impulsive", "cosine-ramp-from-rest-5d"],
  );
  assert.equal(
    COLLISION_CONTRAST_CONTRACT.gates.expectedImpulsiveStableCorners,
    0,
  );
  assert.equal(
    COLLISION_CONTRAST_CONTRACT.gates.expectedFiveDiameterRampStableCorners,
    9,
  );
  assert.equal(
    COLLISION_CONTRAST_CONTRACT.interpretationRules.rawBgkIsFormalMrtEquivalent,
    false,
  );
});

test("raw BGK collision preserves a uniform CBC flow", () => {
  const solver = new CharacteristicOpenBoundarySolver({
    nx: 48,
    ny: 16,
    relaxationTime: 0.54,
    collisionKernel: "raw-bgk",
    inletVelocity: 0.08,
    outletBoundary: "cbc-2d-regularized",
  });
  solver.run(80);
  const inspection = solver.inspect();
  assert.ok(Math.abs(inspection.minimumDensity - 1) < 1e-12);
  assert.ok(Math.abs(inspection.maximumDensity - 1) < 1e-12);
  assert.ok(Math.abs(inspection.maximumSpeed - 0.08) < 1e-12);
});

test("default collision identity is exactly explicit regularized BGK", () => {
  const common = {
    nx: 64,
    ny: 32,
    relaxationTime: 0.54,
    inletVelocity: 0.08,
    outletBoundary: "cbc-2d-regularized" as const,
    solid: { centerX: 20, centerY: 16, radius: 4 },
  };
  const implicit = new CharacteristicOpenBoundarySolver(common);
  const explicit = new CharacteristicOpenBoundarySolver({
    ...common,
    collisionKernel: "regularized-bgk",
  });
  implicit.run(20);
  explicit.run(20);
  assert.deepEqual(implicit.inspect(), explicit.inspect());
  assert.deepEqual(implicit.snapshot(), explicit.snapshot());
});

test("A8F matrix contains 36 unique crossed collision/startup cases", () => {
  const cases = buildCollisionContrastCases();
  assert.equal(cases.length, 36);
  assert.equal(new Set(cases.map((entry) => entry.id)).size, 36);
  assert.equal(cases.filter((entry) => entry.collisionKernel === "raw-bgk").length, 18);
  assert.equal(
    cases.filter((entry) =>
      entry.startupProtocolId === "cosine-ramp-from-rest-5d").length,
    18,
  );
});

test("A8G lattice-phase contract is frozen before execution", () => {
  assert.equal(
    LATTICE_PHASE_CONTRACT.format,
    "VP-A8G-CBC2D-LATTICE-PHASE-CONTRACT-v1",
  );
  assert.deepEqual(
    LATTICE_PHASE_CONTRACT.matrix.centerXPhaseOffsetCells,
    [0, 0.25, 0.5, 0.75],
  );
  assert.deepEqual(
    LATTICE_PHASE_CONTRACT.matrix.centerYPhaseOffsetCells,
    [0, 0.25, 0.5, 0.75],
  );
  assert.deepEqual(
    LATTICE_PHASE_STARTUP_PROTOCOLS.map((entry) => entry.id),
    ["uniform-impulsive", "cosine-ramp-from-rest-5d"],
  );
  assert.equal(LATTICE_PHASE_CONTRACT.interpretationRules.phaseCount, 16);
  assert.equal(
    LATTICE_PHASE_CONTRACT.interpretationRules
      .latticePhaseInvarianceIsBounceBackModelValidation,
    false,
  );
});

test("A8G matrix contains 288 unique cases and diverse masks", () => {
  const cases = buildLatticePhaseCases();
  assert.equal(cases.length, 288);
  assert.equal(new Set(cases.map((entry) => entry.id)).size, 288);
  for (const diameter of [8, 12, 16]) {
    const phaseMasks = new Map<string, string>();
    for (const entry of cases) {
      if (entry.nominalCylinderDiameterCells !== diameter) continue;
      phaseMasks.set(
        `${entry.centerXPhaseOffsetCells}:${entry.centerYPhaseOffsetCells}`,
        entry.solidMaskFingerprint,
      );
    }
    assert.equal(phaseMasks.size, 16);
    assert.ok(new Set(phaseMasks.values()).size >= 4);
  }
});

test("A8H formal-kernel startup contract is frozen before execution", () => {
  assert.equal(
    FORMAL_KERNEL_STARTUP_CONTRACT.format,
    "VP-A8H-FORMAL-MRT-BRINKMAN-STARTUP-CONTRACT-v1",
  );
  assert.equal(
    FORMAL_KERNEL_STARTUP_CONTRACT.formalSource.accessMode,
    "read-only-import-from-candidate-audit",
  );
  assert.deepEqual(
    FORMAL_KERNEL_STARTUP_PROTOCOLS.map((entry) => entry.id),
    ["uniform-impulsive", "cosine-ramp-from-rest-5d"],
  );
  assert.equal(FORMAL_KERNEL_STARTUP_CONTRACT.matrix.penalizationTimeSteps, 1.5);
  assert.equal(FORMAL_KERNEL_STARTUP_CONTRACT.matrix.maskHalfThicknessCells, 0.75);
  assert.equal(
    FORMAL_KERNEL_STARTUP_CONTRACT.interpretationRules.formalSourceModified,
    false,
  );
  assert.equal(
    FORMAL_KERNEL_STARTUP_CONTRACT.interpretationRules.cbcIntegratedIntoFormalKernel,
    false,
  );
});

test("A8H matrix contains 18 unique read-only formal-kernel cases", () => {
  const cases = buildFormalKernelStartupCases();
  assert.equal(cases.length, 18);
  assert.equal(new Set(cases.map((entry) => entry.id)).size, 18);
  assert.equal(
    cases.filter((entry) => entry.startupProtocolId === "uniform-impulsive").length,
    9,
  );
  assert.equal(
    cases.filter((entry) =>
      entry.startupProtocolId === "cosine-ramp-from-rest-5d").length,
    9,
  );
});

test("A8I formal ramp-sensitivity contract is frozen before execution", () => {
  assert.equal(
    FORMAL_RAMP_SENSITIVITY_CONTRACT.format,
    "VP-A8I-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-CONTRACT-v1",
  );
  assert.deepEqual(
    FORMAL_RAMP_SENSITIVITY_CONTRACT.matrix.rampDurationDiameters,
    [0, 0.25, 0.5, 1, 2, 5, 10, 20],
  );
  assert.equal(
    FORMAL_RAMP_SENSITIVITY_CONTRACT.matrix.longestRampPostTargetObservationDiameters,
    70 / 3,
  );
  assert.equal(
    FORMAL_RAMP_SENSITIVITY_CONTRACT.interpretationRules.formalSourceModified,
    false,
  );
  assert.equal(
    FORMAL_RAMP_SENSITIVITY_CONTRACT.interpretationRules
      .cbcIntegratedIntoFormalKernel,
    false,
  );
});
