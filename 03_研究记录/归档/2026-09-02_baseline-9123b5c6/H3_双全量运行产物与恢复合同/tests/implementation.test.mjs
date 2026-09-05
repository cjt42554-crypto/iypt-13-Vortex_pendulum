import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadH3pContract, assertH3pDryRunScope } from "../src/contract.mjs";
import {
  buildSyntheticDryRunShard,
  readSyntheticDryRunShard,
  validateSyntheticDryRunShard,
  writeSyntheticDryRunShard,
} from "../src/shard.mjs";
import {
  decideIncompleteCaseRecovery,
  decideSyntheticShardRecovery,
} from "../src/recovery.mjs";
import { aggregateSyntheticDryRunShards } from "../src/aggregator.mjs";

function identity(contractSha256) {
  return {
    runId: "synthetic-run",
    environmentId: "synthetic-environment",
    sourceCommit: "1".repeat(40),
    implementationCommit: "2".repeat(40),
    implementationTreeSha256: "3".repeat(64),
    contractSha256,
    dependencyIdentitySha256: "4".repeat(64),
    executionIdentitySha256: "5".repeat(64),
  };
}

test("H3P exposes dry-run only and keeps formal execution absent", async () => {
  const loaded = await loadH3pContract();
  assertH3pDryRunScope(loaded.contract, "H3P-SYNTHETIC-DRY-RUN");
  assert.throws(() => assertH3pDryRunScope(loaded.contract, "HW1-primary"));
});

test("H3P synthetic shard writes once, validates, and rejects identity drift", async () => {
  const loaded = await loadH3pContract();
  const expected = { ...identity(loaded.contractSha256), caseId: "case-a" };
  const shard = buildSyntheticDryRunShard({
    ...expected,
    caseOrdinal: 0,
    syntheticPayload: { value: 1 },
  });
  const root = await mkdtemp(join(tmpdir(), "iypt13-h3p-test-"));
  try {
    const path = join(root, "case-a.json.gz");
    await writeSyntheticDryRunShard(path, shard);
    const read = await readSyntheticDryRunShard(path);
    assert.equal(validateSyntheticDryRunShard(read.value, expected), true);
    assert.equal(decideSyntheticShardRecovery(read.value, expected).scientificValueInspected, false);
    await assert.rejects(() => writeSyntheticDryRunShard(path, shard));
    assert.throws(() => validateSyntheticDryRunShard(read.value, {
      ...expected,
      implementationCommit: "9".repeat(40),
    }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("H3P aggregate is deterministic and rejects duplicate or missing shards", async () => {
  const loaded = await loadH3pContract();
  const base = identity(loaded.contractSha256);
  const caseIds = loaded.contract.caseMatrix.canonicalOrder;
  const records = caseIds.map((caseId, caseOrdinal) => buildSyntheticDryRunShard({
    ...base,
    caseId,
    caseOrdinal,
    syntheticPayload: { caseId, token: caseOrdinal },
  }));
  const forward = aggregateSyntheticDryRunShards(records, { ...base, caseIds });
  const reverse = aggregateSyntheticDryRunShards([...records].reverse(), { ...base, caseIds });
  assert.equal(forward.canonicalSha256, reverse.canonicalSha256);
  assert.throws(() => aggregateSyntheticDryRunShards(records.slice(1), { ...base, caseIds }));
  assert.throws(() => aggregateSyntheticDryRunShards(
    [...records.slice(0, -1), records[0]],
    { ...base, caseIds },
  ));
});

test("H3P incomplete recovery always restarts from step zero", () => {
  const decision = decideIncompleteCaseRecovery({ caseId: "case-a", complete: false });
  assert.equal(decision.action, "RESTART-INCOMPLETE-CASE-FROM-STEP-ZERO");
  assert.equal(decision.partialPromotionAllowed, false);
  assert.equal(decision.checkpointResumeAllowed, false);
  assert.equal(decision.scientificValueInspected, false);
});
