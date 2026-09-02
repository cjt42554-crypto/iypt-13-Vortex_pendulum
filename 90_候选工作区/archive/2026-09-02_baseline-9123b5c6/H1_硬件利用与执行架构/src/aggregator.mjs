import { canonicalBytes, canonicalSha256, immutableJsonClone } from "./canonical.mjs";
import { assertActiveContract } from "./contract.mjs";
import { validateShard } from "./shard.mjs";

function fail(code, message) {
  throw new Error(`${code}: ${message}`);
}

export function aggregateShards({
  shards,
  expectedCaseIds,
  runId,
  sourceHash,
  contractHash,
  implementationHash,
  matrixId,
}, contract) {
  assertActiveContract(contract);
  if (!Array.isArray(shards)) fail("NO-GO-HW1-SHARD-MISSING", "shards must be an array");
  if (!Array.isArray(expectedCaseIds) || expectedCaseIds.length !== contract.shards.expectedCaseCount) {
    fail("NO-GO-HW1-CONTRACT-MAPPING", "expected case matrix is not eight cases");
  }
  if (new Set(expectedCaseIds).size !== expectedCaseIds.length) {
    fail("NO-GO-HW1-CONTRACT-MAPPING", "expected case matrix contains duplicates");
  }
  if (shards.length !== expectedCaseIds.length) {
    fail("NO-GO-HW1-SHARD-MISSING", `expected ${expectedCaseIds.length} shards, got ${shards.length}`);
  }
  const byCase = new Map();
  for (const shard of shards) {
    validateShard(shard, contract);
    if (byCase.has(shard.caseId)) fail("NO-GO-HW1-SHARD-DUPLICATE", `duplicate ${shard.caseId}`);
    byCase.set(shard.caseId, shard);
    if (shard.runId !== runId) fail("NO-GO-HW1-PROVENANCE-ALIASING", `${shard.caseId} runId drift`);
    if (shard.matrixId !== matrixId) {
      fail("NO-GO-HW1-SHARD-SOURCE-DRIFT", `${shard.caseId} matrix drift`);
    }
    if (shard.provenance.scientific.sourceHash !== sourceHash) {
      fail("NO-GO-HW1-SHARD-SOURCE-DRIFT", `${shard.caseId} source drift`);
    }
    if (shard.provenance.scientific.contractHash !== contractHash) {
      fail("NO-GO-HW1-PROVENANCE-ALIASING", `${shard.caseId} contract drift`);
    }
    if (shard.provenance.scientific.implementationHash !== implementationHash) {
      fail("NO-GO-HW1-PROVENANCE-ALIASING", `${shard.caseId} implementation drift`);
    }
  }
  for (const caseId of expectedCaseIds) {
    if (!byCase.has(caseId)) fail("NO-GO-HW1-SHARD-MISSING", `missing ${caseId}`);
  }
  const ordered = [...byCase.values()].sort((a, b) => a.caseId.localeCompare(b.caseId, "en"));
  const scientificPayload = ordered.map((shard) => ({
    caseId: shard.caseId,
    caseDefinitionHash: shard.caseDefinitionHash,
    canonicalPayloadHash: shard.provenance.scientific.canonicalPayloadHash,
  }));
  const canonicalPayload = {
    schemaVersion: "VP-H1-NO-RESULT-CANONICAL-PAYLOAD-v1",
    classification: "synthetic-non-scientific",
    matrixId,
    caseCount: ordered.length,
    caseIds: ordered.map((shard) => shard.caseId),
    sourceHash,
    contractHash,
    implementationHash,
    cases: scientificPayload,
  };
  const body = {
    schemaVersion: "VP-H1-NO-RESULT-AGGREGATE-v1",
    classification: "synthetic-non-scientific",
    matrixId,
    runId,
    caseCount: ordered.length,
    caseIds: ordered.map((shard) => shard.caseId),
    sourceHash,
    contractHash,
    implementationHash,
    canonicalPayloadHash: canonicalSha256(canonicalPayload),
    shardHashes: ordered.map((shard) => shard.shardHash),
    completionOrderHidden: true,
  };
  const aggregate = immutableJsonClone({...body, aggregateHash: canonicalSha256(body)});
  return Object.freeze({
    aggregate,
    canonicalPayloadBytes: Buffer.concat([
      canonicalBytes(canonicalPayload),
      Buffer.from("\n"),
    ]),
    manifestBytes: Buffer.concat([canonicalBytes(aggregate), Buffer.from("\n")]),
  });
}
