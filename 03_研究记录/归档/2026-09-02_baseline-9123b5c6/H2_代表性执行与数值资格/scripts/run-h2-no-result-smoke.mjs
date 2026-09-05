import { createHash } from "node:crypto";
import { aggregateH2xQualification } from "../src/aggregator.mjs";
import { loadH2nContract, loadH2xContract } from "../src/contract.mjs";
import { buildH2xQualificationDefinitions } from "../src/definitions.mjs";
import { executeResultBlindSchedule } from "../src/scheduler.mjs";
import { buildH2xHashOnlyShard } from "../src/shard.mjs";

const [h2x, h2n] = await Promise.all([loadH2xContract(), loadH2nContract()]);
const built = await buildH2xQualificationDefinitions(h2x.contract);
const hash = (text) => createHash("sha256").update(text).digest("hex");
const identityBase = {
  environmentId: "H2-NO-RESULT-SYNTHETIC-ENV",
  contractSha256: h2x.contractSha256,
  sourceIdentitySha256: h2x.sourceIdentity.canonicalSha256,
  implementationCommit: "0".repeat(40),
  implementationTreeSha256: hash("H2-NO-RESULT-SYNTHETIC-IMPLEMENTATION"),
};
const oracleIdentity = { ...identityBase, runId: "H2X-synthetic-oracle" };
const candidateIdentity = { ...identityBase, runId: "H2X-synthetic-candidate" };
const fakeExecutor = async (definition) => ({
  caseId: definition.id,
  hashes: Object.fromEntries([
    "definitionSha256",
    "freshInitialPopulationSha256",
    "preAnalysisPopulationSha256",
    "analysisFirstStepPrePopulationSha256",
    "analysisFirstStepPostPopulationSha256",
    "frozenAuditStepPrePopulationSha256",
    "frozenAuditStepPostPopulationSha256",
    "everyAnalysisStepForceIdentitySummarySha256",
    "shortenedCompleteCaseScientificPayloadSha256",
  ].map((field) => [field, hash(`${definition.id}:${field}`)])),
});
const oracleRun = await executeResultBlindSchedule({
  definitions: built.definitions,
  workerCount: 1,
  order: "canonical-case-id",
  executor: fakeExecutor,
});
const candidateRun = await executeResultBlindSchedule({
  definitions: built.definitions,
  workerCount: 4,
  order: "descending-frozen-cost",
  executor: fakeExecutor,
});
const wrap = (result, index, identity, workerCount, completionOrder) =>
  buildH2xHashOnlyShard({
    ...identity,
    caseId: result.caseId,
    caseOrdinal: index,
    workerCount,
    completionOrder,
    hashes: result.hashes,
  });
const oracleShards = oracleRun.results.map((result, index) =>
  wrap(result, index, oracleIdentity, 1, "canonical-case-id"));
const candidateShards = candidateRun.results.map((result, index) =>
  wrap(result, index, candidateIdentity, 4, "descending-frozen-cost"));
const aggregate = aggregateH2xQualification({
  oracleShards,
  candidateShards,
  oracleIdentity,
  candidateIdentity,
});
console.log(JSON.stringify({
  classification: "PASS-H2-RESULT-BEFORE-NO-RESULT-SMOKE",
  h2xContractSha256: h2x.contractSha256,
  h2nContractSha256: h2n.contractSha256,
  sourceIdentitySha256: h2x.sourceIdentity.canonicalSha256,
  definitionSetSha256: built.canonicalSha256,
  caseCount: built.definitions.length,
  aggregateClassification: aggregate.classification,
  aggregateSha256: aggregate.canonicalSha256,
  scientificValuesPersisted: false,
  scientificPayloadRead: false,
  formalSolverConstructed: false,
  h2xQualificationPerformed: false,
  h2nQualificationPerformed: false,
  h3RunPerformed: false,
}));
