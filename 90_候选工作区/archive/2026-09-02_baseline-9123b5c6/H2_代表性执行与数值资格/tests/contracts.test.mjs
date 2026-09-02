import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../../..");
const h2xPath = resolve(
  packageRoot,
  "contracts/h2x-exact-execution-equivalence.v1.json",
);
const h2xSchemaPath = resolve(
  packageRoot,
  "contracts/h2x-exact-execution-equivalence.v1.schema.json",
);
const h2nPath = resolve(
  packageRoot,
  "contracts/h2n-numerical-backend-qualification.v1.json",
);
const h2nSchemaPath = resolve(
  packageRoot,
  "contracts/h2n-numerical-backend-qualification.v1.schema.json",
);

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function auditH2x(contract) {
  assert.equal(
    contract.contractId,
    "VP-H2X-EXACT-EXECUTION-EQUIVALENCE-CONTRACT-v1",
  );
  assert.equal(contract.freeze.resultBlind, true);
  assert.equal(contract.freeze.caseInternalFloatingPointOrderMustRemainIdentical, true);
  assert.equal(contract.freeze.scientificValuePersistenceBeforeHashForbidden, true);
  assert.equal(contract.freeze.fullEightCaseResultBearingRunForbidden, true);
  assert.equal(contract.freeze.runtimeFallbackForbidden, true);
  assert.equal(contract.qualificationCaseMatrix.length, 8);
  assert.equal(new Set(contract.qualificationCaseMatrix.map(({ caseId }) => caseId)).size, 8);
  assert.equal(contract.definitionRule.fullResearchDefinitionsRemainUnchanged, true);
  assert.equal(contract.exactComparisons.sourceBindingSet, "exact");
  assert.equal(contract.exactComparisons.executionFieldsExcludedFromScientificPayload, true);
  assert.equal(contract.independentEnvironmentCount, 3);
  assert.equal(contract.safety.d54RepresentativeRequired, true);
  assert.equal(contract.safety.swapGrowthMaximumBytes, 0);
  assert.equal(contract.safety.oomEventGrowthMaximum, 0);
  assert.equal(contract.h3UnlockForbidden, true);
  assert.equal(
    contract.passCode,
    "PASS-H2X-EXACT-SCIENTIFIC-EXECUTION-EQUIVALENCE-CANDIDATE-ONLY",
  );
}

function auditH2n(contract) {
  assert.equal(
    contract.contractId,
    "VP-H2N-NUMERICAL-BACKEND-QUALIFICATION-CONTRACT-v1",
  );
  assert.equal(contract.freeze.resultBlind, true);
  assert.equal(contract.freeze.newBackendIdentityRequired, true);
  assert.equal(contract.freeze.runtimeFallbackForbidden, true);
  assert.equal(contract.stage0.precision, "float64");
  assert.deepEqual(
    contract.stage0.sizeMatrix.map(({ diameterCells }) => diameterCells),
    [24, 36, 54],
  );
  assert.equal(contract.stage0.toleranceModel.nonFiniteCountMaximum, 0);
  assert.equal(contract.stage0.toleranceModel.populationNormalizedL2Maximum, 1e-11);
  assert.equal(
    contract.stage0.performance.materialNetGainFractionStrictlyGreaterThan,
    0.1,
  );
  assert.equal(
    contract.fullQualification.trigger,
    "stage0-pass-and-material-net-gain-strictly-greater-than-0.10",
  );
  assert.equal(contract.fullQualification.gates.nonFiniteCountMaximum, 0);
  assert.equal(contract.fullQualification.gates.allNegativeCasesMustReject, true);
  assert.equal(
    contract.fullQualification.passCode,
    "PASS-H2N-NUMERICALLY-QUALIFIED-BACKEND-CANDIDATE-ONLY",
  );
  assert.equal(contract.h3UnlockForbidden, true);
}

test("H2-X and H2-N schemas close their complete top-level contracts", async () => {
  for (const [contractPath, schemaPath] of [
    [h2xPath, h2xSchemaPath],
    [h2nPath, h2nSchemaPath],
  ]) {
    const contract = await json(contractPath);
    const schema = await json(schemaPath);
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual([...schema.required].sort(), Object.keys(contract).sort());
    assert.deepEqual(
      Object.keys(schema.properties).sort(),
      Object.keys(contract).sort(),
    );
  }
});

test("H2-X binds every read-only source to the current bytes", async () => {
  const contract = await json(h2xPath);
  auditH2x(contract);
  for (const binding of contract.sourceBindings) {
    assert.equal(
      await sha256(resolve(repositoryRoot, binding.relativePath)),
      binding.sha256,
      binding.relativePath,
    );
    assert.equal(binding.accessMode, "read-only-import");
  }
});

test("H2-X freezes the eight-case cost structure and exact comparison gates", async () => {
  const contract = await json(h2xPath);
  const matrix = contract.qualificationCaseMatrix;
  assert.equal(matrix.filter(({ diameterCells }) => diameterCells === 24).length, 2);
  assert.equal(matrix.filter(({ diameterCells }) => diameterCells === 36).length, 2);
  assert.equal(matrix.filter(({ diameterCells }) => diameterCells === 54).length, 4);
  assert.equal(matrix.filter(({ phaseId }) => phaseId === "minus-half-cell").length, 2);
  for (const item of matrix) {
    assert.ok(item.qualificationTotalSteps > item.qualificationDiscardSteps);
  }
  assert.equal(
    contract.checkpointRule.allPopulationArraysUseRawLittleEndianFloat64Bytes,
    true,
  );
  assert.equal(contract.checkpointRule.scientificValuesDiscardedImmediatelyAfterHash, true);
  assert.ok(contract.negativeCases.includes("cross-run-shard"));
  assert.ok(contract.negativeCases.includes("execution-field-in-scientific-payload"));
});

test("H2-N binds H2-X and freezes stage-0 before observation", async () => {
  const contract = await json(h2nPath);
  auditH2n(contract);
  for (const binding of contract.referenceBindings) {
    assert.equal(
      await sha256(resolve(repositoryRoot, binding.relativePath)),
      binding.sha256,
      binding.relativePath,
    );
  }
  const d54 = contract.stage0.sizeMatrix.find(({ diameterCells }) => diameterCells === 54);
  assert.deepEqual(d54, {
    sizeId: "representative-d54",
    diameterCells: 54,
    nx: 1809,
    ny: 540,
    steps: 16,
  });
  assert.ok(
    contract.stage0.outcomes.includes("DEFERRED-H2N-NO-MATERIAL-END-TO-END-GAIN"),
  );
});

test("H2-X fail-closes exactness, evidence, and premature H3 mutations", async () => {
  const base = await json(h2xPath);
  const mutations = [
    (value) => {
      value.freeze.caseInternalFloatingPointOrderMustRemainIdentical = false;
    },
    (value) => {
      value.freeze.scientificValuePersistenceBeforeHashForbidden = false;
    },
    (value) => {
      value.qualificationCaseMatrix.pop();
    },
    (value) => {
      value.exactComparisons.sourceBindingSet = "approximate";
    },
    (value) => {
      value.independentEnvironmentCount = 1;
    },
    (value) => {
      value.safety.swapGrowthMaximumBytes = 1;
    },
    (value) => {
      value.h3UnlockForbidden = false;
    },
  ];
  for (const mutate of mutations) {
    const value = clone(base);
    mutate(value);
    assert.throws(() => auditH2x(value));
  }
});

test("H2-N fail-closes identity, numeric gates, gain trigger, and H3 lock mutations", async () => {
  const base = await json(h2nPath);
  const mutations = [
    (value) => {
      value.freeze.newBackendIdentityRequired = false;
    },
    (value) => {
      value.freeze.runtimeFallbackForbidden = false;
    },
    (value) => {
      value.stage0.precision = "float32";
    },
    (value) => {
      value.stage0.sizeMatrix.pop();
    },
    (value) => {
      value.stage0.toleranceModel.nonFiniteCountMaximum = 1;
    },
    (value) => {
      value.stage0.performance.materialNetGainFractionStrictlyGreaterThan = 0;
    },
    (value) => {
      value.fullQualification.gates.allNegativeCasesMustReject = false;
    },
    (value) => {
      value.h3UnlockForbidden = false;
    },
  ];
  for (const mutate of mutations) {
    const value = clone(base);
    mutate(value);
    assert.throws(() => auditH2n(value));
  }
});
