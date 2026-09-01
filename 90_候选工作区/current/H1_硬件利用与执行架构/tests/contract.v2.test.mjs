import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const REPOSITORY_ROOT = new URL("../../../", ROOT);

const V1_HASHES = Object.freeze({
  "01_A8R_HW1_结果盲硬件资格预注册合同.md":
    "91d3c8aa916321144f0ef5f50dc44394df6c7cba22a420063a4f96a724db4b25",
  "02_H1_机器合同冻结说明.md":
    "c8348962b1dbb102f5a3b194dafd79e67a67146c64c6ad0c7782116138dcea67",
  "contracts/h1-machine-contract.v1.json":
    "b8f55bd4b796bd3a22b48ab1e1ce41c43847b74cef1b24fd90d599fa00226538",
  "contracts/h1-machine-contract.schema.json":
    "9d574edf8e7fd4811b15ea152c12bc141a439efd1aba97b6822c4cc5c6b876bc",
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, ROOT), "utf8"));
}

function assertInheritedInvariants(v1, v2) {
  for (const key of [
    "phaseOrder",
    "fieldBoundary",
    "candidateClasses",
    "inventory",
    "gates",
    "provenanceLayers",
  ]) {
    assert.deepEqual(v2[key], v1[key], `${key} must be inherited without drift`);
  }

  for (const [key, value] of Object.entries(v1.probe)) {
    assert.deepEqual(v2.probe[key], value, `probe.${key} drifted`);
  }
  for (const key of [
    "exactMode",
    "nonExactMode",
    "nonExactRequiresNewFrozenContractAndProReview",
    "runtimeFallbackForbidden",
  ]) {
    assert.deepEqual(
      v2.equivalence[key],
      v1.equivalence[key],
      `equivalence.${key} drifted`,
    );
  }
  for (const [key, value] of Object.entries(v1.shards)) {
    assert.deepEqual(v2.shards[key], value, `shards.${key} drifted`);
  }
  for (const [key, value] of Object.entries(v1.fullRuns)) {
    assert.deepEqual(v2.fullRuns[key], value, `fullRuns.${key} drifted`);
  }
}

function assertActiveV2(contract) {
  assert.equal(contract.contractId, "VP-A8R-HW1-MACHINE-CONTRACT-v2");
  assert.equal(
    contract.parentContractId,
    "VP-A8R-HW1-RESULT-BLIND-HARDWARE-QUALIFICATION-CONTRACT-v1",
  );
  assert.equal(
    contract.overrideDecisionId,
    "IYPT13-PR1-R0-HOST-SHUTDOWN-ROUTE-DECISION-v1",
  );
  assert.equal(contract.supersedes, "VP-A8R-HW1-MACHINE-CONTRACT-v1");
  assert.equal(
    contract.serialPredecessor.requiredStateBeforeH2,
    "PASS-R1I-INTERRUPTED-SERIAL-ATTEMPT-EVIDENCE-SEALED",
  );
  assert.equal(contract.serialPredecessor.attainedReferenceStatus, false);
  assert.equal(contract.serialPredecessor.canonicalArtifactAvailable, false);
  assert.equal(contract.serialPredecessor.scientificPayloadAvailable, false);
  assert.equal(contract.serialPredecessor.fullSerialRerunRequired, false);
  assert.equal(contract.serialPredecessor.fullSerialRerunAuthorized, false);
  assert.equal(contract.serialPredecessor.checkpointResumeAuthorized, false);
  assert.equal(contract.serialPredecessor.partialProgressCredit, 0);
  assert.equal(contract.serialOracle.fullResultBearingRunForbidden, true);
  assert.equal(contract.serialOracle.scientificValuePersistenceForbidden, true);
  assert.equal(contract.serialOracle.canonicalA8rArtifactWriteForbidden, true);
  assert.equal(contract.activeImplementation.v1FallbackForbidden, true);
  assert.equal(contract.activeImplementation.automaticFallbackForbidden, true);
  assert.equal(
    contract.activeImplementation.requiredContractId,
    "VP-A8R-HW1-MACHINE-CONTRACT-v2",
  );
  assert.equal(contract.probe.heavyProbeForbiddenDuringG1, true);
  assert.deepEqual(contract.fullRuns.identities, ["HW1-primary", "HW1-repeat"]);
  assert.equal(contract.fullRuns.interruptedSerialDataUseForbidden, true);
  assert.equal(
    contract.fieldBoundary.allowed.some((name) =>
      contract.fieldBoundary.forbidden.includes(name),
    ),
    false,
  );
}

function selectActiveContract(candidate, legacyFallback) {
  if (candidate === undefined || candidate === null) {
    assert.fail(
      `active H1 v2 contract is required; fallback ${legacyFallback?.contractId ?? "absent"} is forbidden`,
    );
  }
  assertActiveV2(candidate);
  return candidate;
}

test("v1 contract family remains byte-identical historical evidence", async () => {
  for (const [path, expectedHash] of Object.entries(V1_HASHES)) {
    assert.equal(sha256(await readFile(new URL(path, ROOT))), expectedHash, path);
  }
});

test("v2 maps PR-1 and inherits every unaffected v1 invariant", async () => {
  const v1 = await readJson("contracts/h1-machine-contract.v1.json");
  const v2 = await readJson("contracts/h1-machine-contract.v2.json");
  const schema = await readJson("contracts/h1-machine-contract.v2.schema.json");
  const mapping = await readJson("contracts/h1-pr1-override-mapping.v1.json");

  assertActiveV2(v2);
  assertInheritedInvariants(v1, v2);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(Object.keys(v2).sort(), [...schema.required].sort());
  assert.equal(mapping.decisionId, v2.overrideDecisionId);
  assert.equal(mapping.supersededMachineContract.contractId, v1.contractId);
  assert.equal(mapping.activeMachineContract.contractId, v2.contractId);
  assert.equal(mapping.supersededMachineContract.preserveBytes, true);
  assert.equal(mapping.activityRules.v1ActiveUseForbidden, true);
  assert.equal(mapping.activityRules.v1AutomaticFallbackForbidden, true);
  assert.equal(mapping.activityRules.legacyFullSerialRerunForbidden, true);
  assert.equal(mapping.activityRules.partialProgressCreditForbidden, true);
});

test("v2 incident links resolve to the frozen bytes", async () => {
  const v2 = await readJson("contracts/h1-machine-contract.v2.json");
  const evidence = v2.incidentEvidence;

  for (const [pathKey, hashKey] of [
    ["r0ReportPath", "r0ReportSha256"],
    ["r0EvidencePath", "r0EvidenceSha256"],
    ["pr1DecisionPath", "pr1DecisionSha256"],
  ]) {
    const bytes = await readFile(new URL(evidence[pathKey], REPOSITORY_ROOT));
    assert.equal(sha256(bytes), evidence[hashKey], evidence[pathKey]);
  }
});

test("active contract selection rejects v1 and automatic fallback", async () => {
  const v1 = await readJson("contracts/h1-machine-contract.v1.json");
  const v2 = await readJson("contracts/h1-machine-contract.v2.json");

  assert.equal(selectActiveContract(v2, v1), v2);
  assert.throws(() => selectActiveContract(v1, undefined));
  assert.throws(() => selectActiveContract(undefined, v1), /fallback .* forbidden/);
  assert.throws(() => selectActiveContract(null, v1), /fallback .* forbidden/);
});

test("legacy rerun, checkpoint resume, and partial credit mutations fail closed", async () => {
  const contract = await readJson("contracts/h1-machine-contract.v2.json");

  for (const mutate of [
    (value) => {
      value.serialPredecessor.fullSerialRerunRequired = true;
    },
    (value) => {
      value.serialPredecessor.fullSerialRerunAuthorized = true;
    },
    (value) => {
      value.serialPredecessor.checkpointResumeAuthorized = true;
    },
    (value) => {
      value.serialPredecessor.partialProgressCredit = 0.9;
    },
    (value) => {
      value.fullRuns.interruptedSerialDataUseForbidden = false;
    },
  ]) {
    const bad = structuredClone(contract);
    mutate(bad);
    assert.throws(() => assertActiveV2(bad));
  }
});

test("scientific fields and weakened thresholds remain forbidden", async () => {
  const contract = await readJson("contracts/h1-machine-contract.v2.json");

  const leaked = structuredClone(contract);
  leaked.fieldBoundary.allowed.push("drag");
  assert.throws(() => assertActiveV2(leaked));

  const weakened = structuredClone(contract);
  weakened.gates.speedupMinimum = 1.49;
  const v1 = await readJson("contracts/h1-machine-contract.v1.json");
  assert.throws(() => assertInheritedInvariants(v1, weakened));
});
