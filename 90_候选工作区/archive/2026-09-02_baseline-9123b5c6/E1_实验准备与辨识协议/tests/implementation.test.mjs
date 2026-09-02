import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { canonicalBytes, canonicalClone, canonicalSha256 } from "../src/canonical.mjs";
import {
  exerciseNegativeCases,
  fitLine,
  loadFrozenE1Inputs,
  qualifyE1,
} from "../src/qualification.mjs";
import { generateSyntheticBundle } from "../src/synthetic.mjs";
import { E1ValidationError, validateBundle } from "../src/validation.mjs";

const inputs = await loadFrozenE1Inputs();
const contract = inputs.contract.value;
const matrix = inputs.matrix.value;

test("E1 generator builds a deterministic synthetic-only bundle that validates", () => {
  const first = generateSyntheticBundle(contract, matrix);
  const second = generateSyntheticBundle(contract, matrix);

  assert.equal(validateBundle(first, contract), true);
  assert.equal(first.classification, "synthetic-only");
  assert.equal(first.runs.length, contract.requiredRunFamilies.length);
  assert.deepEqual(
    [...new Set(first.runs.map((entry) => entry.runRecord.runFamily))],
    contract.requiredRunFamilies,
  );
  assert.equal(first.calibrations.length, contract.requiredChannelKinds.length);
  assert.ok(canonicalBytes(first).equals(canonicalBytes(second)));
});

test("E1 canonical encoding is stable across JSON round trip and rejects non-finite data", () => {
  const bundle = generateSyntheticBundle(contract, matrix);
  const bytes = canonicalBytes(bundle);
  assert.ok(bytes.equals(canonicalBytes(JSON.parse(bytes.toString("utf8")))));

  const invalid = canonicalClone(bundle);
  invalid.identificationData.training[0].y = Number.POSITIVE_INFINITY;
  assert.throws(() => canonicalBytes(invalid), /non-finite/u);
  assert.throws(
    () => validateBundle(invalid, contract),
    (error) => error instanceof E1ValidationError && error.code === "E1_NONFINITE_VALUE",
  );
});

test("E1 identification recovers frozen parameters inside the pre-registered envelope", () => {
  const bundle = generateSyntheticBundle(contract, matrix);
  const estimate = fitLine(bundle.identificationData.training);
  const envelope = Math.max(
    2 * matrix.linearIdentification.uNum,
    2 * matrix.linearIdentification.uFit,
  );
  assert.ok(Math.abs(estimate.slope - matrix.linearIdentification.slope) <= envelope);
  assert.ok(Math.abs(estimate.intercept - matrix.linearIdentification.intercept) <= envelope);
  for (const sample of bundle.identificationData.holdout) {
    const prediction = estimate.slope * sample.x + estimate.intercept;
    assert.ok(Math.abs(prediction - sample.y) <= envelope);
  }
});

test("E1 rejects every pre-registered negative case with its intended fail-closed gate", () => {
  const bundle = generateSyntheticBundle(contract, matrix);
  const results = exerciseNegativeCases(bundle, contract);
  assert.deepEqual(
    results.map((entry) => entry.caseId),
    contract.negativeCases,
  );
  assert.ok(results.every((entry) => entry.rejected), JSON.stringify(results, null, 2));
});

test("E1 detects record-hash tampering before accepting an apparatus registry", () => {
  const invalid = canonicalClone(generateSyntheticBundle(contract, matrix));
  invalid.apparatus.recordHash = "0".repeat(64);
  assert.throws(
    () => validateBundle(invalid, contract),
    (error) => error instanceof E1ValidationError && error.code === "E1_APPARATUS_HASH",
  );
});

test("E1 qualification is byte-repeatable and its ceiling remains candidate-only", () => {
  const provenance = {
    contractSha256: inputs.contract.sha256,
    matrixSha256: inputs.matrix.sha256,
  };
  const first = qualifyE1(contract, matrix, provenance);
  const second = qualifyE1(contract, matrix, provenance);

  assert.equal(first.decision, "PASS-E1-EXPERIMENT-PREPARATION-CANDIDATE-ONLY");
  assert.equal(first.scientificConclusion, "NONE");
  assert.equal(first.scientificPayloadRead, false);
  assert.equal(first.realExperimentPerformed, false);
  assert.ok(first.cases.every((entry) => entry.pass));
  assert.ok(canonicalBytes(first).equals(canonicalBytes(second)));
  const { canonicalPayloadSha256, ...payload } = first;
  assert.equal(canonicalPayloadSha256, canonicalSha256(payload));
});

test("E1 implementation contains no formal-program or A8R data dependency", async () => {
  const sourceFiles = [
    "../src/canonical.mjs",
    "../src/validation.mjs",
    "../src/synthetic.mjs",
    "../src/qualification.mjs",
  ];
  const source = (
    await Promise.all(sourceFiles.map((path) => readFile(new URL(path, import.meta.url), "utf8")))
  ).join("\n");
  assert.doesNotMatch(source, /01_最终理论|02_模拟程序|A8R|scientific\.json\.gz/u);
});
