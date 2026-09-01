import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import {
  H2X_HASH_FIELDS,
  validateH2xHashOnlyShard,
} from "./shard.mjs";

export function compareH2xShardToOracle(candidate, oracle) {
  if (candidate.caseId !== oracle.caseId) {
    throw new Error("NO-GO-H2X-SCIENTIFIC-PAYLOAD-HASH-MISMATCH: case ID");
  }
  const equality = {};
  for (const field of H2X_HASH_FIELDS) {
    equality[field] = candidate.hashes[field] === oracle.hashes[field];
  }
  return Object.freeze({
    caseId: candidate.caseId,
    equality: Object.freeze(equality),
    pass: Object.values(equality).every(Boolean),
  });
}

export function aggregateH2xQualification(input) {
  if (input.candidateShards.length !== 8 || input.oracleShards.length !== 8) {
    throw new Error("NO-GO-H2X-SHARD-OR-AGGREGATION: expected eight shards");
  }
  const oracleById = new Map();
  for (const shard of input.oracleShards) {
    validateH2xHashOnlyShard(shard, {
      ...input.oracleIdentity,
      caseId: shard.caseId,
    });
    if (oracleById.has(shard.caseId)) {
      throw new Error(`NO-GO-H2X-SHARD-OR-AGGREGATION: duplicate oracle ${shard.caseId}`);
    }
    oracleById.set(shard.caseId, shard);
  }
  const comparisons = [];
  const seen = new Set();
  for (const shard of input.candidateShards) {
    validateH2xHashOnlyShard(shard, {
      ...input.candidateIdentity,
      caseId: shard.caseId,
    });
    if (seen.has(shard.caseId)) {
      throw new Error(`NO-GO-H2X-SHARD-OR-AGGREGATION: duplicate ${shard.caseId}`);
    }
    seen.add(shard.caseId);
    const oracle = oracleById.get(shard.caseId);
    if (!oracle) throw new Error(`NO-GO-H2X-SHARD-OR-AGGREGATION: missing oracle ${shard.caseId}`);
    comparisons.push(compareH2xShardToOracle(shard, oracle));
  }
  const ordered = comparisons.sort((left, right) => left.caseId.localeCompare(right.caseId));
  const pass = ordered.length === 8 && ordered.every((item) => item.pass);
  const summary = {
    format: "VP-H2X-EXACT-EQUIVALENCE-SUMMARY-v1",
    caseCount: ordered.length,
    comparisons: ordered,
    pass,
    scientificValuesPersisted: false,
    fullResultBearingRunPerformed: false,
  };
  return Object.freeze({
    ...summary,
    canonicalSha256: canonicalSha256(summary),
    classification: pass
      ? "PASS-H2X-EXACT-SCIENTIFIC-EXECUTION-EQUIVALENCE-CANDIDATE-ONLY"
      : "NO-GO-H2X-SCIENTIFIC-PAYLOAD-HASH-MISMATCH",
  });
}
