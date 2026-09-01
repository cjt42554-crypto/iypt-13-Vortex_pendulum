import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));

test("F1 freezes the complete lightweight matrix and numerical gates", async () => {
  const contract = await readJson("contracts/f1-contract.v1.json");
  assert.equal(contract.contractId, "VP-F1-SYNTHETIC-NUMERICAL-QUALIFICATION-CONTRACT-v1");
  assert.equal(contract.classification, "synthetic-only");
  assert.equal(contract.requiredCases.length, 8);
  assert.deepEqual(contract.stepLevels, ["coarse", "nominal", "reference"]);
  assert.equal(contract.gates.nominalNormalizedRmsMaximum, 1e-3);
  assert.equal(contract.gates.nominalNormalizedMaximumMaximum, 5e-3);
  assert.equal(contract.gates.conservativeFinalRelativeEnergyMaximum, 5e-5);
  assert.equal(contract.gates.conservativeLocalRelativeRmsMaximum, 1e-4);
  assert.equal(contract.gates.variableInertiaFineRelativeDifferenceMaximum, 1e-4);
  assert.equal(contract.gates.outputIntegralRelativeErrorMaximum, 1e-4);
  assert.equal(contract.gates.canonicalRepeatByteIdentical, true);
  assert.equal(contract.apparatusCalibratedAllowedSources.includes("literature-prior"), false);
});

test("F1 record schema keeps synthetic evidence and decision explicit", async () => {
  const schema = await readJson("contracts/qualification-record.schema.json");
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.classification.const, "synthetic-only");
  assert.ok(schema.required.includes("contractSha256"));
  assert.ok(schema.required.includes("implementationSha256"));
  assert.ok(schema.required.includes("inputSha256"));
  assert.ok(schema.required.includes("canonicalPayloadSha256"));
  assert.equal(schema.properties.cases.minItems, 8);
});
