import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFormalBoundaryFactorizationCases,
  classifyBoundaryPassPattern,
  runFormalBoundaryFactorizationCase,
  type A8jAnchor,
} from "../src/formal-boundary-factorization.ts";

test("A8K frozen matrix has 36 unique cases and nine corners", () => {
  const cases = buildFormalBoundaryFactorizationCases();
  assert.equal(cases.length, 36);
  assert.equal(new Set(cases.map((entry) => entry.id)).size, 36);
  assert.equal(new Set(cases.map((entry) =>
    `${entry.nominalDiameterScaleCells}:${entry.relaxationTime}`)).size, 9);
});

test("A8K attribution classifier preserves the frozen interaction semantics", () => {
  assert.equal(classifyBoundaryPassPattern({
    baseline: false, outletOnly: false, inletOnly: true, both: true,
  }), "INLET_REPLACEMENT_SUFFICIENT");
  assert.equal(classifyBoundaryPassPattern({
    baseline: false, outletOnly: true, inletOnly: false, both: true,
  }), "OUTLET_REPLACEMENT_SUFFICIENT");
  assert.equal(classifyBoundaryPassPattern({
    baseline: false, outletOnly: false, inletOnly: false, both: true,
  }), "DOUBLE_REPLACEMENT_REQUIRED");
});

test("A8K reproduces A8J and isolates the inlet side at d08-t0540", () => {
  const definitions = buildFormalBoundaryFactorizationCases().filter((entry) =>
    entry.nominalDiameterScaleCells === 8 && entry.relaxationTime === 0.54);
  const anchor: A8jAnchor = {
    nominalDiameterScaleCells: 8,
    relaxationTime: 0.54,
    completedSteps: 347,
    stability: {
      maximumDensityDeviation: 0.14860703070953574,
      maximumDensityDeviationStep: 161,
      maximumMach: 0.27709263886699853,
      maximumMachStep: 347,
      minimumDensity: 0.9999998642296435,
      maximumDensity: 1.1486070307095357,
      densityExtremum: {
        kind: "maximum",
        density: 1.1486070307095357,
        x: 0,
        y: 0,
        brinkmanMaskIndicator: 0,
      },
    },
  };
  const results = definitions.map((definition) =>
    runFormalBoundaryFactorizationCase(
      definition,
      definition.inletBoundary === "formal-zou-he-velocity"
        && definition.outletBoundary === "formal-zou-he-pressure"
        ? anchor
        : undefined,
    ));
  const read = (inlet: string, outlet: string) => results.find((entry) =>
    entry.definition.inletBoundary === inlet
    && entry.definition.outletBoundary === outlet);
  assert.equal(read("formal-zou-he-velocity", "formal-zou-he-pressure")
    ?.baselineComparison?.exactMatch, true);
  assert.equal(read("formal-zou-he-velocity", "formal-zou-he-pressure")
    ?.gate.pass, false);
  assert.equal(read("formal-zou-he-velocity", "cbc-2d-regularized")
    ?.gate.pass, false);
  assert.equal(read("regularized-prescribed-state", "formal-zou-he-pressure")
    ?.gate.pass, true);
  assert.equal(read("regularized-prescribed-state", "cbc-2d-regularized")
    ?.gate.pass, true);
});
