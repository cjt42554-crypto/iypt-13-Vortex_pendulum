import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FIXED_CYLINDER_DISPOSITION_CASES,
  SINE_ZERO_DISPLACEMENT_HALF_WIDTH_OVER_PENALTY_LAYER,
  buildFixedCylinderCaseDefinition,
  sineMaskShiftInPenaltyLayerUnits,
} from "../src/fixed-cylinder-disposition.ts";

test("A8S compact-sine mask uses the result-independent zero-displacement root", () => {
  const shift = sineMaskShiftInPenaltyLayerUnits(
    SINE_ZERO_DISPLACEMENT_HALF_WIDTH_OVER_PENALTY_LAYER,
  );
  assert.ok(Math.abs(shift) < 2e-9, `residual shift ${shift}`);
  assert.ok(sineMaskShiftInPenaltyLayerUnits(6.2) < -1.9);
});

test("A8S freezes three primary grids and four bounded D16 sensitivities", () => {
  assert.equal(FIXED_CYLINDER_DISPOSITION_CASES.length, 7);
  assert.equal(
    new Set(FIXED_CYLINDER_DISPOSITION_CASES.map((item) => item.id)).size,
    7,
  );
  assert.deepEqual(
    FIXED_CYLINDER_DISPOSITION_CASES
      .filter((item) => item.role === "primary-grid")
      .map((item) => item.diameterCells),
    [16, 24, 36],
  );
  assert.equal(
    FIXED_CYLINDER_DISPOSITION_CASES
      .filter((item) => item.diameterCells !== 16
        && item.role !== "primary-grid").length,
    0,
  );
});

test("A8S definitions preserve Re, duration, domain, and theoretical mask scaling", () => {
  const input = FIXED_CYLINDER_DISPOSITION_CASES.find(
    (item) => item.id === "a8s-primary-d24",
  );
  assert.ok(input !== undefined);
  const definition = buildFixedCylinderCaseDefinition(input);
  assert.equal(definition.nx, 936);
  assert.equal(definition.ny, 480);
  assert.equal(definition.totalSteps, 38_400);
  assert.equal(definition.discardSteps, 19_200);
  assert.equal(definition.bodyCenterX, 336);
  assert.equal(definition.bodyRadius, 12);
  assert.equal(
    definition.maskHalfThicknessOverPenaltyLayer,
    SINE_ZERO_DISPLACEMENT_HALF_WIDTH_OVER_PENALTY_LAYER,
  );
  assert.ok(definition.relaxationTime > 0.5);
});
