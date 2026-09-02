import assert from "node:assert/strict";
import test from "node:test";

import { aggregateH2xQualification } from "../src/aggregator.mjs";
import {
  H2X_HASH_FIELDS,
  buildH2xHashOnlyShard,
  validateH2xHashOnlyShard,
} from "../src/shard.mjs";

const identity = {
  environmentId: "env-1",
  runId: "run-1",
  contractSha256: "a".repeat(64),
  sourceIdentitySha256: "b".repeat(64),
  implementationCommit: "c".repeat(40),
  implementationTreeSha256: "d".repeat(64),
};

function hashes(seed) {
  return Object.freeze(Object.fromEntries(
    H2X_HASH_FIELDS.map((field, index) => [
      field,
      (seed + index).toString(16).padStart(64, "0").slice(-64),
    ]),
  ));
}

function shard(caseOrdinal, overrides = {}) {
  return buildH2xHashOnlyShard({
    ...identity,
    caseId: `case-${caseOrdinal}`,
    caseOrdinal,
    workerCount: 2,
    completionOrder: "reverse-canonical-case-id",
    hashes: hashes(100 + caseOrdinal),
    ...overrides,
  });
}

test("H2-X shard validation binds ordinal, worker count, and order identity", () => {
  const value = shard(0);
  assert.equal(validateH2xHashOnlyShard(value, {
    ...identity,
    caseId: "case-0",
    caseOrdinal: 0,
    workerCount: 2,
    completionOrder: "reverse-canonical-case-id",
  }), true);
  assert.throws(
    () => validateH2xHashOnlyShard(value, {
      ...identity,
      caseId: "case-0",
      caseOrdinal: 1,
      workerCount: 2,
      completionOrder: "reverse-canonical-case-id",
    }),
    /NO-GO-H2X-SHARD-OR-AGGREGATION: caseOrdinal/u,
  );
  assert.throws(
    () => validateH2xHashOnlyShard(value, {
      ...identity,
      caseId: "case-0",
      caseOrdinal: 0,
      workerCount: 4,
      completionOrder: "reverse-canonical-case-id",
    }),
    /NO-GO-H2X-SHARD-OR-AGGREGATION: workerCount/u,
  );
});

test("H2-X aggregation rejects coherent schedule metadata drift", () => {
  const oracleIdentity = { ...identity, runId: "oracle" };
  const candidateIdentity = { ...identity, runId: "candidate" };
  const oracleShards = Array.from({ length: 8 }, (_, caseOrdinal) =>
    shard(caseOrdinal, {
      runId: "oracle",
      workerCount: 1,
      completionOrder: "canonical-case-id",
    }));
  const candidateShards = Array.from({ length: 8 }, (_, caseOrdinal) =>
    shard(caseOrdinal, { runId: "candidate" }));
  const accepted = aggregateH2xQualification({
    oracleShards,
    candidateShards,
    oracleIdentity,
    candidateIdentity,
    expectedOracleWorkerCount: 1,
    expectedOracleCompletionOrder: "canonical-case-id",
    expectedCandidateWorkerCount: 2,
    expectedCandidateCompletionOrder: "reverse-canonical-case-id",
  });
  assert.equal(accepted.pass, true);
  assert.throws(
    () => aggregateH2xQualification({
      oracleShards,
      candidateShards,
      oracleIdentity,
      candidateIdentity,
      expectedOracleWorkerCount: 1,
      expectedOracleCompletionOrder: "canonical-case-id",
      expectedCandidateWorkerCount: 4,
      expectedCandidateCompletionOrder: "reverse-canonical-case-id",
    }),
    /NO-GO-H2X-SHARD-OR-AGGREGATION: expected schedule identity/u,
  );
});
