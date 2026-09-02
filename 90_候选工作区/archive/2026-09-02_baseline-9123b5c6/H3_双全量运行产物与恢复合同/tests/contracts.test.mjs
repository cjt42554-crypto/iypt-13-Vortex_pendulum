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
  "contracts/h3-artifact-shard-recovery.v1.json",
);
const schemaPath = resolve(
  packageRoot,
  "contracts/h3-artifact-shard-recovery.v1.schema.json",
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
    contract.contractId,
    "VP-H3-DUAL-FULL-RUN-ARTIFACT-SHARD-RECOVERY-CONTRACT-v1",
  );
  assert.equal(contract.freeze.resultBlind, true);
  assert.equal(contract.freeze.dryRunOnlyBeforePr2b, true);
  assert.equal(contract.freeze.h3ExecutionBeforePr2bForbidden, true);
  assert.equal(contract.freeze.scientificPayloadReadBeforePr3Forbidden, true);
  assert.equal(contract.freeze.partialProgressCredit, 0);
  assert.equal(contract.freeze.runtimeFallbackForbidden, true);
  assert.deepEqual(
    contract.runIdentities.map(({ runId }) => runId),
    ["HW1-primary", "HW1-repeat"],
  );
  assert.deepEqual(
    contract.runIdentities.map(({ environmentId }) => environmentId),
    ["H3-ENV-PRIMARY", "H3-ENV-REPEAT"],
  );
  assert.equal(contract.environmentIsolation.environmentCount, 2);
  assert.equal(
    contract.environmentIsolation.sharedShardCheckpointCacheTemporaryFileOrInodeForbidden,
    true,
  );
  assert.equal(contract.caseMatrix.caseCount, 8);
  assert.equal(new Set(contract.caseMatrix.canonicalOrder).size, 8);
  assert.equal(contract.caseMatrix.everyCaseStartsAtStepZero, true);
  assert.equal(contract.shard.writeOnlyAfterCompleteCase, true);
  assert.equal(contract.shard.writeMode, "exclusive-create");
  assert.equal(contract.shard.overwriteForbidden, true);
  assert.equal(contract.recovery.interruptedCaseRestartsAtStepZero, true);
  assert.equal(contract.recovery.primaryRepeatCrossReuseForbidden, true);
  assert.equal(contract.recovery.checkpointResumeWithinIncompleteCaseForbidden, true);
  assert.equal(contract.aggregation.expectedCaseCount, 8);
  assert.equal(contract.aggregation.rejectMissing, true);
  assert.equal(contract.aggregation.rejectDuplicate, true);
  assert.equal(contract.aggregation.rejectCorrupt, true);
  assert.equal(contract.aggregation.executionFieldsExcludedFromScientificPayload, true);
  assert.equal(contract.dryRun.allowedBeforePr2b, true);
  assert.equal(contract.dryRun.syntheticOnly, true);
  assert.equal(contract.dryRun.formalSolverConstructionForbidden, true);
  assert.equal(contract.preflight.automaticUnlockForbidden, true);
  assert.equal(contract.runOrder.primaryBeforeRepeat, true);
  assert.equal(contract.runOrder.bothExecuteCompleteEightCaseMatrix, true);
  assert.equal(contract.stopState, "READY-FOR-PR2B-H3-UNLOCK-REVIEW");
}

test("H3P contract binds PR-2 and remains locked before PR-2B", async () => {
  const contract = await json(contractPath);
  audit(contract);
  assert.equal(
    await sha256(resolve(repositoryRoot, contract.pr2Decision.relativePath)),
    contract.pr2Decision.sha256,
  );
  assert.equal(
    contract.pr2Decision.requiredPr2bUnlockCode,
    "UNLOCK-HW1-PRIMARY-AND-HW1-REPEAT-ONLY",
  );
  assert.equal(
    contract.pr2Decision.currentLockCode,
    "KEEP-HW1-PRIMARY-HW1-REPEAT-AND-H3-LOCKED",
  );
});

test("H3P schema closes the complete top-level contract", async () => {
  const contract = await json(contractPath);
  const schema = await json(schemaPath);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), Object.keys(contract).sort());
  assert.deepEqual(
    Object.keys(schema.properties).sort(),
    Object.keys(contract).sort(),
  );
});

test("H3P atomic sequence and recovery boundaries are complete", async () => {
  const contract = await json(contractPath);
  assert.deepEqual(contract.shard.atomicSequence, [
    "write-partial-in-run-local-directory",
    "fsync-partial-file",
    "verify-canonical-hash",
    "rename-to-final",
    "fsync-parent-directory",
    "write-sidecar-exclusive",
    "fsync-sidecar-and-parent-directory",
  ]);
  assert.equal(contract.recovery.sameRunCompletedShardReuseAllowed, true);
  assert.equal(contract.recovery.crossImplementationReuseForbidden, true);
  assert.equal(contract.recovery.crossEnvironmentReuseForbidden, true);
  assert.equal(contract.recovery.scientificValueInspectionForRecoveryForbidden, true);
  assert.ok(contract.dryRun.mustCover.includes("cross-run-reuse-rejection"));
  assert.ok(contract.dryRun.mustCover.includes("restart-incomplete-case"));
});

test("H3P fail-closes premature run, aliasing, partial credit, and recovery mutations", async () => {
  const base = await json(contractPath);
  const mutations = [
    (value) => {
      value.freeze.h3ExecutionBeforePr2bForbidden = false;
    },
    (value) => {
      value.freeze.partialProgressCredit = 1;
    },
    (value) => {
      value.runIdentities.reverse();
    },
    (value) => {
      value.environmentIsolation.environmentCount = 1;
    },
    (value) => {
      value.environmentIsolation.sharedShardCheckpointCacheTemporaryFileOrInodeForbidden = false;
    },
    (value) => {
      value.caseMatrix.canonicalOrder.pop();
    },
    (value) => {
      value.shard.writeOnlyAfterCompleteCase = false;
    },
    (value) => {
      value.recovery.interruptedCaseRestartsAtStepZero = false;
    },
    (value) => {
      value.recovery.primaryRepeatCrossReuseForbidden = false;
    },
    (value) => {
      value.dryRun.formalSolverConstructionForbidden = false;
    },
    (value) => {
      value.preflight.automaticUnlockForbidden = false;
    },
  ];
  for (const mutate of mutations) {
    const value = clone(base);
    mutate(value);
    assert.throws(() => audit(value));
  }
});
