import assert from "node:assert/strict";
import test from "node:test";
import { ROBUSTNESS_CONTRACT } from "../src/robustness-contract.ts";
import {
  STARTUP_AUDIT_CONTRACT,
  STARTUP_PROTOCOLS,
} from "../src/startup-audit-contract.ts";
import {
  buildRobustnessCases,
  buildRobustnessGeometry,
} from "../src/robustness.ts";
import {
  CharacteristicOpenBoundarySolver,
  type OutletBoundary,
} from "../src/solver.ts";

test("A8C robustness contract remains frozen at the v1 matrix", () => {
  assert.equal(ROBUSTNESS_CONTRACT.format, "VP-A8-CBC2D-ROBUSTNESS-CONTRACT-v1");
  assert.deepEqual(ROBUSTNESS_CONTRACT.axes.inletVelocityLattice, [0.04, 0.06, 0.08]);
  assert.deepEqual(ROBUSTNESS_CONTRACT.axes.relaxationTime, [0.54, 0.56, 0.58]);
  assert.deepEqual(
    ROBUSTNESS_CONTRACT.axes.downstreamOutletDistanceDiameters,
    [6, 9.25, 12.5],
  );
  assert.deepEqual(ROBUSTNESS_CONTRACT.axes.nominalCylinderDiameterCells, [8, 12, 16]);
  assert.equal(ROBUSTNESS_CONTRACT.gates.maximumDensityDeviation, 0.12);
  assert.equal(ROBUSTNESS_CONTRACT.gates.maximumMach, 0.30);
  assert.equal(ROBUSTNESS_CONTRACT.gates.minimumProbeRmsImprovementAgainstZouHe, 0.20);
  assert.equal(ROBUSTNESS_CONTRACT.gates.minimumFieldErrorImprovementAgainstZouHe, 0.10);
});

test("A8C full-factorial definition contains 81 unique cases", () => {
  const cases = buildRobustnessCases();
  assert.equal(cases.length, 81);
  assert.equal(new Set(cases.map((entry) => entry.id)).size, 81);
  assert.ok(cases.every((entry) => entry.nominalReynoldsNumber > 0));
  assert.ok(cases.every((entry) => entry.meanMach > 0 && entry.meanMach < 0.30));
});

test("A8C center case preserves the frozen A8B cylinder geometry", () => {
  const geometry = buildRobustnessGeometry(12, 9.25);
  assert.equal(geometry.nx, 160);
  assert.equal(geometry.referenceNx, 300);
  assert.equal(geometry.ny, 56);
  assert.equal(geometry.steps, 520);
  assert.equal(geometry.lateStart, 340);
  assert.equal(geometry.cylinderCenterX, 42);
  assert.equal(geometry.cylinderCenterY, 28);
  assert.equal(geometry.cylinderRadius, 6);
  assert.equal(geometry.probeX, 75);
  assert.equal(geometry.probeY, 28);
  assert.equal(geometry.fieldXStart, 55);
  assert.equal(geometry.fieldXEnd, 150);
});

test("A8C geometry rejects invalid nominal diameter and outlet distance", () => {
  assert.throws(() => buildRobustnessGeometry(7, 9.25), /even integer/);
  assert.throws(() => buildRobustnessGeometry(12, 0), /finite and positive/);
});

test("all compared outlets preserve the high-speed uniform state before cylinder signals", () => {
  const boundaries: OutletBoundary[] = [
    "zou-he-pressure",
    "regularized-fixed-pressure",
    "cbc-2d-regularized",
  ];
  for (const outletBoundary of boundaries) {
    const solver = new CharacteristicOpenBoundarySolver({
      nx: 81,
      ny: 37,
      relaxationTime: 0.54,
      inletVelocity: 0.08,
      outletBoundary,
    });
    solver.run(6);
    const inspection = solver.inspect();
    assert.ok(Math.abs(inspection.minimumDensity - 1) < 1e-14);
    assert.ok(Math.abs(inspection.maximumDensity - 1) < 1e-14);
    assert.ok(Math.abs(inspection.maximumSpeed - 0.08) < 1e-14);
  }
});

test("A8D startup audit contract remains frozen before research execution", () => {
  assert.equal(
    STARTUP_AUDIT_CONTRACT.format,
    "VP-A8D-CBC2D-STARTUP-AUDIT-CONTRACT-v1",
  );
  assert.deepEqual(
    STARTUP_AUDIT_CONTRACT.matrix.inletVelocityLattice,
    [0.06, 0.0625, 0.065, 0.0675, 0.07, 0.0725, 0.075, 0.0775, 0.08],
  );
  assert.deepEqual(
    STARTUP_AUDIT_CONTRACT.matrix.relaxationTime,
    [0.54, 0.56, 0.58],
  );
  assert.deepEqual(
    STARTUP_AUDIT_CONTRACT.matrix.nominalCylinderDiameterCells,
    [8, 12, 16],
  );
  assert.equal(STARTUP_AUDIT_CONTRACT.matrix.downstreamOutletDistanceDiameters, 6);
  assert.equal(STARTUP_AUDIT_CONTRACT.matrix.outletBoundary, "cbc-2d-regularized");
  assert.deepEqual(
    STARTUP_PROTOCOLS.map((protocol) => protocol.id),
    [
      "impulsive-uniform",
      "cosine-ramp-from-rest",
      "compatible-ramp-preconditioned",
    ],
  );
  assert.equal(STARTUP_PROTOCOLS[1].inAuditRampStepsPerDiameter, 20);
  assert.equal(STARTUP_PROTOCOLS[2].preparationRampStepsPerDiameter, 20);
  assert.equal(STARTUP_AUDIT_CONTRACT.gates.maximumDensityDeviation, 0.12);
  assert.equal(STARTUP_AUDIT_CONTRACT.gates.maximumMach, 0.30);
  assert.equal(STARTUP_AUDIT_CONTRACT.gates.maximumSampledBracketWidth, 0.0025);
  assert.equal(STARTUP_AUDIT_CONTRACT.gates.monotonicityAbsoluteTolerance, 1e-14);
  assert.equal(STARTUP_AUDIT_CONTRACT.uniformNoSolidGuard.steps, 6);
  assert.equal(
    STARTUP_AUDIT_CONTRACT.attributionRules.formalIntegrationUnlocked,
    false,
  );
});
