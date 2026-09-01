import { validateSyntheticDryRunShard } from "./shard.mjs";

export function decideSyntheticShardRecovery(shard, expected) {
  validateSyntheticDryRunShard(shard, expected);
  if (shard.runId !== expected.runId
    || shard.environmentId !== expected.environmentId) {
    throw new Error("NO-GO-H3P-RECOVERY-IDENTITY: run or environment alias");
  }
  return Object.freeze({
    action: "REUSE-COMPLETE-SAME-RUN-SYNTHETIC-SHARD",
    caseId: shard.caseId,
    caseCompleteAndFinite: true,
    scientificValueInspected: false,
  });
}

export function decideIncompleteCaseRecovery(input) {
  if (input.complete === true) {
    throw new Error("incomplete-case decision received a complete case");
  }
  return Object.freeze({
    action: "RESTART-INCOMPLETE-CASE-FROM-STEP-ZERO",
    caseId: input.caseId,
    partialPromotionAllowed: false,
    checkpointResumeAllowed: false,
    scientificValueInspected: false,
  });
}
