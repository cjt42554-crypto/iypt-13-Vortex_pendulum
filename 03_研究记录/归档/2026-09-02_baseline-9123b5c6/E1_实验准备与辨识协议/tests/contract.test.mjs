import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, ROOT), "utf8"));
}

function assertClosedObjectSchema(schema, name) {
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.type, "object", `${name} must be an object schema`);
  assert.equal(schema.additionalProperties, false, `${name} must reject unknown fields`);
  assert.ok(schema.required.length > 0, `${name} must have required fields`);
  assert.equal(new Set(schema.required).size, schema.required.length);
}

test("all E1 schemas are closed and bind traceability fields", async () => {
  const files = [
    "quantity.schema.json",
    "apparatus.schema.json",
    "calibration.schema.json",
    "run-record.schema.json",
    "timeseries.schema.json",
    "identification.schema.json",
  ];
  const schemas = Object.fromEntries(
    await Promise.all(files.map(async (file) => [file, await readJson(`contracts/${file}`)])),
  );
  for (const [name, schema] of Object.entries(schemas)) assertClosedObjectSchema(schema, name);

  assert.deepEqual(
    schemas["quantity.schema.json"].required,
    ["value", "unit", "source", "observedAt", "standardUncertainty"],
  );
  assert.ok(schemas["apparatus.schema.json"].required.includes("assemblyTolerances"));
  assert.ok(schemas["calibration.schema.json"].required.includes("rawEvidenceHash"));
  assert.ok(schemas["run-record.schema.json"].required.includes("configurationHash"));
  assert.ok(schemas["run-record.schema.json"].required.includes("rawDataHash"));
  assert.equal(
    schemas["identification.schema.json"].properties.syntheticAcceptance.properties.envelope.const,
    "max(2*u_num,2*u_fit)",
  );
});

test("E1 contract freezes block holdout, channel coverage, safety and negative cases", async () => {
  const contract = await readJson("contracts/e1-contract.v1.json");
  assert.equal(contract.contractId, "VP-E1-EXPERIMENT-PREPARATION-CONTRACT-v1");
  assert.equal(contract.resultClassification, "synthetic-only");
  assert.deepEqual(contract.requiredRunFamilies, [
    "fixed-body",
    "prescribed-motion",
    "no-flow-mechanical",
    "free-response",
    "holdout",
  ]);
  assert.equal(contract.requiredChannelKinds.length, 8);
  assert.equal(contract.holdoutSplitUnit, "condition-block");
  assert.equal(contract.randomFrameSplitForbidden, true);
  assert.equal(contract.canonicalRoundTripRequired, true);
  for (const negative of [
    "missing-unit",
    "non-finite-value",
    "time-regression",
    "duplicate-primary-key",
    "missing-calibration",
    "angle-displacement-mix",
    "training-holdout-overlap",
    "unsafe-run",
  ]) assert.ok(contract.negativeCases.includes(negative));
});

test("E1 synthetic matrix fixes identification, timeseries and negative inputs", async () => {
  const matrix = await readJson("contracts/e1-synthetic-matrix.v1.json");
  assert.equal(matrix.classification, "synthetic-only");
  assert.equal(matrix.seed, 130013);
  assert.equal(matrix.linearIdentification.slope, 1.75);
  assert.equal(matrix.linearIdentification.intercept, -0.2);
  assert.equal(matrix.linearIdentification.xValues.length, 9);
  assert.equal(matrix.linearIdentification.uNum, 1e-12);
  assert.equal(matrix.linearIdentification.uFit, 1e-9);
  assert.deepEqual(matrix.linearIdentification.holdoutConditionBlocks, ["SYNTH-HOLDOUT-A"]);
  assert.equal(matrix.timeseries.sampleCount, 64);
  assert.equal(matrix.timeseries.sampleIntervalSeconds, 0.02);
  assert.equal(new Set(matrix.negativeCases).size, matrix.negativeCases.length);
});
