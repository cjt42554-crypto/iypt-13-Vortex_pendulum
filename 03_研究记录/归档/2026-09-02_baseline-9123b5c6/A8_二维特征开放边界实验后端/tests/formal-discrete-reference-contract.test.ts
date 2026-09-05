import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FORMAL_DISCRETE_REFERENCE_CONTRACT as CONTRACT,
  FORMAL_DISCRETE_REFERENCE_FAMILIES as FAMILIES,
  FORMAL_DISCRETE_REFERENCE_STRATEGIES as STRATEGIES,
  FORMAL_DISCRETE_REFERENCE_WIDTHS as WIDTHS,
  FORMAL_MATURITY_SEEDS as SEEDS,
  buildFormalDiscreteReferenceDefinitions,
  buildFormalMaturityDefinitions,
} from "../src/formal-discrete-reference-contract.ts";

test("A8P freezes a complete short-time discrete-cone matrix", () => {
  assert.equal(
    CONTRACT.format,
    "VP-A8P-DISCRETE-REFERENCE-MATURITY-CONTRACT-v1",
  );
  assert.deepEqual(STRATEGIES.map((entry) => entry.ordinal), [1, 9]);
  assert.deepEqual(FAMILIES.map((entry) => entry.id), [
    "localized-density-pulse-no-body",
    "fixed-body-uniform-start",
  ]);
  assert.deepEqual(WIDTHS.map((entry) => entry.widthDiameters), [12, 16]);
  const definitions = buildFormalDiscreteReferenceDefinitions();
  assert.equal(definitions.length, CONTRACT.discreteReference.matrixRunCount);
  assert.equal(new Set(definitions.map((entry) => entry.id)).size, definitions.length);
});

test("A8P short-time samples are conservatively outside every frozen cone", () => {
  for (const definition of buildFormalDiscreteReferenceDefinitions()) {
    const diameter = definition.nominalDiameterCells;
    const xMinimum = definition.bodyCenterX
      + CONTRACT.discreteReference.comparisonRegion
        .minimumRelativeXDiameters * diameter;
    const xMaximum = definition.bodyCenterX
      + CONTRACT.discreteReference.comparisonRegion
        .maximumRelativeXDiameters * diameter;
    const yMinimum = definition.bodyCenterY
      + CONTRACT.discreteReference.comparisonRegion
        .minimumRelativeYDiameters * diameter;
    const yMaximum = definition.bodyCenterY
      + CONTRACT.discreteReference.comparisonRegion
        .maximumRelativeYDiameters * diameter;
    const leftDistance = xMinimum;
    const rightDistance = definition.nx - 1 - xMaximum;
    const transverseDistance = Math.min(
      yMinimum,
      definition.ny - 1 - yMaximum,
    );
    assert.ok(definition.runSteps < leftDistance);
    assert.ok(definition.runSteps < rightDistance);
    assert.ok(definition.runSteps < transverseDistance);
    assert.equal(definition.runSteps % definition.sampleStride, 0);
  }
});

test("A8P freezes zero, signed, and smaller signed maturity seeds", () => {
  assert.deepEqual(SEEDS.map((entry) => entry.amplitude), [
    0,
    1e-5,
    -1e-5,
    1e-7,
    -1e-7,
  ]);
  const definitions = buildFormalMaturityDefinitions();
  assert.equal(definitions.length, CONTRACT.maturity.uniqueRunCount);
  assert.equal(new Set(definitions.map((entry) => entry.id)).size, definitions.length);
  assert.equal(
    definitions.filter((entry) => entry.geometryId === "base").length,
    CONTRACT.maturity.baselineRunCount,
  );
  assert.equal(
    definitions.filter((entry) => entry.geometryId !== "base").length,
    CONTRACT.maturity.sensitivityOnlyRunCount,
  );
  for (const definition of definitions) {
    assert.equal(
      definition.runSteps,
      Math.round(96 * definition.nominalDiameterCells
        / CONTRACT.commonNumerics.inletVelocityLattice),
    );
  }
});

test("A8P jointly crosses downstream distance and periodic width", () => {
  const definitions = buildFormalMaturityDefinitions().filter((entry) =>
    entry.parameterId === CONTRACT.maturity.sensitivityParameterId
    && entry.seedMagnitudeClass === "large"
    && entry.seedPolarity !== 0);
  assert.equal(definitions.length, 8);
  assert.deepEqual(
    [...new Set(definitions.map((entry) => entry.geometryId))],
    ["base", "downstream-extended", "width-extended", "joint-extended"],
  );
  assert.equal(
    new Set(definitions.map((entry) =>
      `${entry.downstreamDiameters}:${entry.ny}`)).size,
    4,
  );
});

test("A8P ledger and decision fields cannot relabel A8O or select S9", () => {
  assert.equal(CONTRACT.populationLedger.gateMethod, "Neumaier-compensated");
  assert.deepEqual(CONTRACT.populationLedger.diagnosticOnlyMethods, [
    "A8O-ordered",
    "fixed-binary-pairwise",
  ]);
  assert.equal(
    CONTRACT.populationLedger.a8oStatusMustRemain,
    "NO-GO-A8O-EVIDENCE-INCOMPLETE-OR-INTERNAL-GATES",
  );
  assert.equal(CONTRACT.decision.formalSourceModified, false);
  assert.equal(CONTRACT.decision.formalIntegrationUnlocked, false);
  assert.equal(CONTRACT.decision.s9Selected, false);
  assert.equal(CONTRACT.decision.newBoundaryStrategyCreated, false);
  assert.equal(CONTRACT.decision.stopAfterEvidenceReportRepeatAndHandoff, true);
});
