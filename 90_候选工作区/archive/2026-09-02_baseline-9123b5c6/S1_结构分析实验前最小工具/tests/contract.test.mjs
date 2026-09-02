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

test("S1 case matrix fixes Jacobian, spectrum, Hopf and signal inputs", async () => {
  const matrix = await readJson("contracts/s1-case-matrix.v1.json");
  assert.equal(matrix.classification, "synthetic-only");
  assert.deepEqual(matrix.jacobian.stepSizes, [0.01, 0.005, 0.0025]);
  assert.deepEqual(matrix.spectrum.block1, [[0, -2], [2, 0]]);
  assert.deepEqual(matrix.spectrum.block2, [[-1, -3], [3, -1]]);
  assert.deepEqual(matrix.hopf.muValues, [-0.1, 0, 0.1]);
  assert.equal(matrix.hopf.expectedTransversality, 1);
  assert.equal(matrix.identifiableCombination.parameter, "L_gamma_j");
  assert.equal(matrix.frequencyPhase.sampleRateHz, 4096);
  assert.equal(matrix.frequencyPhase.frequencyHz, 7);
  assert.equal(matrix.averagePower.frequencyHz, 5);
  assert.equal(matrix.literaturePriorLabel, "illustrative-only");
});
