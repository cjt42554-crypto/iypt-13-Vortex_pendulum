import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../../..");
const contractPath = resolve(
  packageRoot,
  "contracts/hw2-representative-qualification-protocol.v2.json",
);
const schemaPath = resolve(
  packageRoot,
  "contracts/hw2-representative-qualification-protocol.v2.schema.json",
);
const v1Path = resolve(packageRoot, "contracts/hw2-qualification-protocol.v1.json");
const pr2Path = resolve(
  repositoryRoot,
  "90_候选工作区/current/G0_全项目完成度与实验前暂停治理/"
    + "07_PR2_HW2测量语义执行架构与全项目后续裁决.md",
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

function audit(contract) {
  assert.equal(
    contract.protocolId,
    "VP-HW2-REPRESENTATIVE-QUALIFICATION-PROTOCOL-v2",
  );
  assert.equal(contract.freeze.resultBlind, true);
  assert.equal(contract.freeze.fullResultBearingRunForbidden, true);
  assert.equal(contract.freeze.scientificPayloadHumanReadForbidden, true);
  assert.equal(contract.freeze.scientificValuePersistenceForbidden, true);
  assert.equal(contract.freeze.runtimeFallbackForbidden, true);
  assert.equal(contract.freeze.v1FilesImmutable, true);
  assert.equal(contract.calibration.formalTargetSecondsMinimum, 20);
  assert.equal(contract.calibration.formalTargetSecondsMaximum, 45);
  assert.equal(contract.calibration.formalHardSecondsMinimum, 15);
  assert.equal(contract.calibration.formalHardSecondsMaximum, 60);
  assert.equal(contract.calibration.validFormalRepeats, 3);
  assert.equal(contract.calibration.formalBatchFrozenAfterCalibration, true);
  assert.deepEqual(
    contract.candidateMatrix.cpuPhysicalCoreCounts,
    [1, 2, 4, 8, 12, 16],
  );
  assert.equal(contract.candidateMatrix.classes.length, 6);
  assert.equal(contract.workloads.length, 3);
  assert.equal(contract.workloads[0].finalSelectionEligible, false);
  assert.equal(contract.workloads[1].diameterCells, 54);
  assert.equal(contract.workloads[1].finalSelectionEligible, true);
  assert.equal(contract.workloads[2].caseStructure.caseCount, 8);
  assert.equal(contract.telemetry.gpuValidSamplesMinimum, 30);
  assert.equal(contract.telemetry.persistentContextRequired, true);
  assert.equal(contract.safety.swapGrowthMaximumBytes, 0);
  assert.equal(contract.safety.oomEventGrowthMaximum, 0);
  assert.equal(contract.safety.unrelatedProcessMutationForbidden, true);
  assert.equal(contract.selection.representativeSpeedupMinimum, 1.5);
  assert.equal(
    contract.selection.selectedThroughputFractionOfBestMinimum,
    0.95,
  );
  assert.equal(contract.selection.unresolvedMaterialGainFractionMaximum, 0.1);
  assert.equal(
    contract.selection.failClosedIfMaterialMeasurementInvalidCandidateExists,
    true,
  );
  assert.equal(contract.selection.v1OpenmpW02SelectionForbidden, true);
  assert.equal(contract.passCode, "PASS-HW2R-REPRESENTATIVE-MEASUREMENT");
  assert.equal(contract.stopState, "READY-FOR-PR2B-H3-UNLOCK-REVIEW");
  assert.ok(contract.fieldBoundary.forbidden.includes("scientific-decision"));
}

test("HW2R v2 binds PR-2 and preserves the historical v1 bytes", async () => {
  const contract = await json(contractPath);
  audit(contract);
  assert.equal(await sha256(pr2Path), contract.pr2Decision.sha256);
  assert.equal(
    await sha256(v1Path),
    "aa83b4b0767e4ac81dc0eaefc880a1ed3eafec8337602145f4488ffbe48b819e",
  );
  assert.equal(
    contract.supersedesMeasurementProtocolId,
    "VP-HW2-RESULT-BLIND-QUALIFICATION-PROTOCOL-v1",
  );
});

test("HW2R schema closes the complete top-level contract", async () => {
  const contract = await json(contractPath);
  const schema = await json(schemaPath);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(
    [...schema.required].sort(),
    Object.keys(contract).sort(),
  );
  assert.deepEqual(
    Object.keys(schema.properties).sort(),
    Object.keys(contract).sort(),
  );
});

test("HW2R workload keeps toy smoke out of final selection", async () => {
  const contract = await json(contractPath);
  const [r0, r1, r2] = contract.workloads;
  assert.equal(r0.workloadId, "HW2R-R0-U32-EXECUTION-FRAMEWORK-SMOKE-v1");
  assert.equal(r0.finalSelectionEligible, false);
  assert.match(r1.workloadId, /D54-A8R-OPERATION-GRAPH/);
  assert.ok(r1.requiredOperations.includes("independent-raw-force-identity"));
  assert.ok(r1.requiredOperations.includes("a2-recomposition"));
  assert.equal(r2.caseStructure.diameterCounts["54"], 4);
  assert.ok(r2.requiredOperations.includes("deterministic-aggregation"));
});

test("HW2R rejects v1-style timing, selection, leak, and unlock mutations", async () => {
  const base = await json(contractPath);
  const mutations = [
    (value) => {
      value.calibration.formalTargetSecondsMinimum = 0;
    },
    (value) => {
      value.calibration.formalBatchFrozenAfterCalibration = false;
    },
    (value) => {
      value.workloads[0].finalSelectionEligible = true;
    },
    (value) => {
      value.candidateMatrix.classes.pop();
    },
    (value) => {
      value.telemetry.gpuValidSamplesMinimum = 1;
    },
    (value) => {
      value.selection.failClosedIfMaterialMeasurementInvalidCandidateExists = false;
    },
    (value) => {
      value.selection.v1OpenmpW02SelectionForbidden = false;
    },
    (value) => {
      value.freeze.fullResultBearingRunForbidden = false;
    },
    (value) => {
      value.freeze.scientificValuePersistenceForbidden = false;
    },
  ];
  for (const mutate of mutations) {
    const value = clone(base);
    mutate(value);
    assert.throws(() => audit(value));
  }
});
