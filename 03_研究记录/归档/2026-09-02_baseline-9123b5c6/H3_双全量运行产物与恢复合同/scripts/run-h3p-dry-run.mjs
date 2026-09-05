import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertH3pDryRunScope,
  loadH3pContract,
} from "../src/contract.mjs";
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

const loaded = await loadH3pContract();
assertH3pDryRunScope(loaded.contract, "H3P-SYNTHETIC-DRY-RUN");
const root = await mkdtemp(join(tmpdir(), "iypt13-h3p-dry-run-"));
try {
  const identity = {
    runId: "H3P-synthetic-dry-run",
    environmentId: "H3P-SYNTHETIC-ENV",
    sourceCommit: loaded.contract.freeze.repositoryBaseCommit,
    implementationCommit: "0".repeat(40),
    implementationTreeSha256: createHash("sha256")
      .update("H3P-SYNTHETIC-IMPLEMENTATION")
      .digest("hex"),
    contractSha256: loaded.contractSha256,
    dependencyIdentitySha256: createHash("sha256")
      .update("H3P-SYNTHETIC-DEPENDENCY")
      .digest("hex"),
    executionIdentitySha256: createHash("sha256")
      .update("H3P-SYNTHETIC-EXECUTION")
      .digest("hex"),
  };
  const records = [];
  const artifactHashes = [];
  for (const [index, caseId] of loaded.contract.caseMatrix.canonicalOrder.entries()) {
    const shard = buildSyntheticDryRunShard({
      ...identity,
      caseId,
      caseOrdinal: index,
      syntheticPayload: { caseId, ordinal: index, token: "synthetic-only" },
    });
    const output = join(root, `${caseId}.json.gz`);
    const written = await writeSyntheticDryRunShard(output, shard);
    const read = await readSyntheticDryRunShard(output);
    validateSyntheticDryRunShard(read.value, { ...identity, caseId });
    decideSyntheticShardRecovery(read.value, { ...identity, caseId });
    records.push(read.value);
    artifactHashes.push(written.artifact.storedSha256);
  }
  const aggregate = aggregateSyntheticDryRunShards(records, {
    ...identity,
    caseIds: loaded.contract.caseMatrix.canonicalOrder,
  });
  const incomplete = decideIncompleteCaseRecovery({
    caseId: loaded.contract.caseMatrix.canonicalOrder[0],
    complete: false,
  });
  let crossRunRejected = false;
  try {
    decideSyntheticShardRecovery(records[0], {
      ...identity,
      runId: "different-run",
      caseId: records[0].caseId,
    });
  } catch {
    crossRunRejected = true;
  }
  if (!crossRunRejected) throw new Error("cross-run shard was not rejected");
  console.log(JSON.stringify({
    classification:
      "PASS-H3P-ARTIFACT-SHARD-RECOVERY-AND-ENVIRONMENT-DRY-RUN",
    contractId: loaded.contract.contractId,
    contractSha256: loaded.contractSha256,
    caseCount: records.length,
    aggregateSha256: aggregate.canonicalSha256,
    artifactSetSha256: createHash("sha256")
      .update(artifactHashes.join("\n"))
      .digest("hex"),
    completeShardRecovery: true,
    incompleteCaseAction: incomplete.action,
    crossRunRejected,
    syntheticOnly: true,
    formalSolverConstructed: false,
    scientificPayloadPresent: false,
    h3RunPerformed: false,
  }));
} finally {
  await rm(root, { recursive: true, force: true });
}
