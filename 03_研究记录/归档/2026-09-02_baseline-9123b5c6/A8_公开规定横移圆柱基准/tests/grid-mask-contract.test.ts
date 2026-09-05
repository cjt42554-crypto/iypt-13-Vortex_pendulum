import test from "node:test";
import assert from "node:assert/strict";
import {
  GRID_MASK_DIAMETERS,
  GRID_MASK_EXTENSION_DIAMETERS,
  GRID_MASK_HALF_THICKNESSES,
  gridMaskDefinitions,
  gridMaskExtensionDefinitions,
  threePointPowerFit,
} from "../src/grid-mask-contract.ts";

test("grid-mask research matrix is a complete two-family Cartesian product", () => {
  const definitions = gridMaskDefinitions("research");
  assert.equal(definitions.length, 6);
  assert.equal(new Set(definitions.map((item) => item.id)).size, 6);
  for (const diameter of GRID_MASK_DIAMETERS) {
    for (const mask of GRID_MASK_HALF_THICKNESSES) {
      assert.equal(definitions.some((item) => (
        item.diameterCells === diameter && item.maskHalfThickness === mask
      )), true);
    }
  }
});

test("grid-mask smoke reaches both mask families", () => {
  const definitions = gridMaskDefinitions("smoke");
  assert.equal(definitions.length, 2);
  assert.deepEqual(
    new Set(definitions.map((item) => item.maskHalfThickness)),
    new Set(GRID_MASK_HALF_THICKNESSES),
  );
});

test("grid-mask extension repeats N_D=20 and adds N_D=24 in both families", () => {
  const definitions = gridMaskExtensionDefinitions();
  assert.equal(definitions.length, 4);
  for (const diameter of GRID_MASK_EXTENSION_DIAMETERS) {
    for (const mask of GRID_MASK_HALF_THICKNESSES) {
      assert.equal(definitions.some((item) => (
        item.diameterCells === diameter && item.maskHalfThickness === mask
      )), true);
    }
  }
});

test("three-point unequal-grid fit recovers a synthetic second-order sequence", () => {
  const exact = 1.25;
  const values = GRID_MASK_DIAMETERS.map((diameter) => exact + 2 / diameter ** 2) as unknown as [
    number,
    number,
    number,
  ];
  const fit = threePointPowerFit(GRID_MASK_DIAMETERS, values);
  assert.notEqual(fit, null);
  assert.ok(Math.abs((fit?.apparentOrder ?? 0) - 2) < 1e-10);
  assert.ok(Math.abs((fit?.extrapolatedValue ?? 0) - exact) < 1e-12);
});

test("three-point fit refuses oscillatory or degenerate sequences", () => {
  assert.equal(threePointPowerFit(GRID_MASK_DIAMETERS, [2, 1, 1.5]), null);
  assert.equal(threePointPowerFit(GRID_MASK_DIAMETERS, [1, 1, 1]), null);
});
