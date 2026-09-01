import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));

test("S1 freezes the experiment-relevant synthetic matrix and defers untriggered scope", async () => {
  const contract = await readJson("contracts/s1-contract.v1.json");
  assert.equal(contract.contractId, "VP-S1-SYNTHETIC-STRUCTURAL-QUALIFICATION-CONTRACT-v1");
  assert.equal(contract.classification, "synthetic-only");
  assert.equal(contract.requiredCases.length, 8);
  assert.equal(contract.gates.jacobianAdjacentErrorRatioMinimum, 3);
  assert.equal(contract.gates.normalizedCharacteristicResidualMaximum, 1e-10);
  assert.equal(contract.gates.hopfTransversalityRelativeErrorMaximum, 1e-8);
  assert.equal(contract.gates.frequencyRelativeErrorMaximum, 1e-3);
  assert.equal(contract.gates.phaseAbsoluteErrorRadiansMaximum, 2e-3);
  assert.equal(contract.gates.averagePowerRelativeErrorMaximum, 1e-3);
  assert.deepEqual(contract.identifiableParameters, ["L_gamma_j"]);
  assert.deepEqual(contract.forbiddenUnidentifiedSplits, ["L", "gamma_j"]);
  assert.equal(
    contract.deferred,
    "DEFERRED-S1-NONLINEAR-CONTINUATION-AWAITING-CALIBRATION",
  );
});

test("S1 record schema cannot upgrade synthetic evidence", async () => {
  const schema = await readJson("contracts/qualification-record.schema.json");
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.classification.const, "synthetic-only");
  assert.equal(
    schema.properties.decision.const,
    "PASS-S1-EXPERIMENT-PREPARATION-STRUCTURAL-TOOLS",
  );
  assert.equal(
    schema.properties.deferred.const,
    "DEFERRED-S1-NONLINEAR-CONTINUATION-AWAITING-CALIBRATION",
  );
  assert.equal(schema.properties.cases.minItems, 7);
});
