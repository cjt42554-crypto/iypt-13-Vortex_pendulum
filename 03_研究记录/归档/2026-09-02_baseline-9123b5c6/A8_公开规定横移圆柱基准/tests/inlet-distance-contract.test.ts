import test from "node:test";
import assert from "node:assert/strict";
import {
  INLET_BRACKET_DISTANCES,
  INLET_BRACKET_DOWNSTREAM_DIAMETERS,
  INLET_BRACKET_MASK_HALF_THICKNESSES,
  INLET_BRACKET_WIDTH_DIAMETERS,
  inletDistanceDefinitions,
} from "../src/inlet-distance-contract.ts";

test("inlet bracket is a complete paired-mask distance product", () => {
  const definitions = inletDistanceDefinitions("research");
  assert.equal(
    definitions.length,
    INLET_BRACKET_MASK_HALF_THICKNESSES.length * INLET_BRACKET_DISTANCES.length,
  );
  assert.equal(new Set(definitions.map((item) => item.id)).size, definitions.length);
  for (const mask of INLET_BRACKET_MASK_HALF_THICKNESSES) {
    for (const inlet of INLET_BRACKET_DISTANCES) {
      assert.equal(definitions.some((item) => (
        item.maskHalfThickness === mask && item.upstreamDiameters === inlet
      )), true);
    }
  }
});

test("inlet bracket changes only upstream clearance", () => {
  for (const definition of inletDistanceDefinitions("research")) {
    assert.equal(definition.domainWidthDiameters, INLET_BRACKET_WIDTH_DIAMETERS);
    assert.equal(
      (definition.domainLengthDiameters ?? 0) - (definition.upstreamDiameters ?? 0),
      INLET_BRACKET_DOWNSTREAM_DIAMETERS,
    );
    assert.equal(definition.diameterCells, 16);
    assert.equal(definition.fixedConvectiveDuration, 80);
    assert.equal(definition.discardConvectiveTime, 40);
  }
});

test("smoke preserves all inlet and mask code paths at reduced cost", () => {
  const definitions = inletDistanceDefinitions("smoke");
  assert.equal(definitions.length, 6);
  assert.ok(definitions.every((item) => (
    item.diameterCells === 8
      && item.fixedConvectiveDuration === 12
      && item.discardConvectiveTime === 6
  )));
});
