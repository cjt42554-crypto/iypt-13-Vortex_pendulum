import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { validateSyntheticDryRunShard } from "./shard.mjs";

export function aggregateSyntheticDryRunShards(records, expected) {
  if (!Array.isArray(records) || records.length !== 8) {
    throw new Error("NO-GO-H3P-AGGREGATION: expected exactly eight shards");
  }
  const byCase = new Map();
  for (const record of records) {
    validateSyntheticDryRunShard(record, {
      ...expected,
      caseId: record.caseId,
    });
    if (byCase.has(record.caseId)) {
      throw new Error(`NO-GO-H3P-AGGREGATION: duplicate ${record.caseId}`);
    }
    byCase.set(record.caseId, record);
  }
  if (byCase.size !== expected.caseIds.length) {
    throw new Error("NO-GO-H3P-AGGREGATION: missing case");
  }
  for (const caseId of expected.caseIds) {
    if (!byCase.has(caseId)) {
      throw new Error(`NO-GO-H3P-AGGREGATION: missing ${caseId}`);
    }
  }
  const cases = expected.caseIds
    .map((caseId) => byCase.get(caseId))
    .sort((left, right) => left.caseId.localeCompare(right.caseId))
    .map((record) => ({
      caseId: record.caseId,
      caseOrdinal: record.caseOrdinal,
      scientificPayloadCanonicalSha256:
        record.scientificPayloadCanonicalSha256,
    }));
  const result = {
    format: "VP-H3P-SYNTHETIC-DRY-RUN-AGGREGATE-v1",
    runId: expected.runId,
    environmentId: expected.environmentId,
    caseCount: cases.length,
    cases,
    scientificPayloadPresent: false,
    formalSolverConstructed: false,
  };
  return Object.freeze({
    ...result,
    canonicalSha256: canonicalSha256(result),
  });
}
