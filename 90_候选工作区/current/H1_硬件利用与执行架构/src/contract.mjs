import { readFile } from "node:fs/promises";

import { immutableJsonClone, sha256 } from "./canonical.mjs";

export const ACTIVE_CONTRACT_ID = "VP-A8R-HW1-MACHINE-CONTRACT-v2";
export const ACTIVE_CONTRACT_SHA256 =
  "387c644be55f6f9c479ccc84ae8ed68668b4ecafab73e2e3608a1a5a3805e311";
export const DEFAULT_ACTIVE_CONTRACT_URL = new URL(
  "../contracts/h1-machine-contract.v2.json",
  import.meta.url,
);

function fail(message) {
  throw new Error(`NO-GO-HW1-CONTRACT-MAPPING: ${message}`);
}

function equal(actual, expected, label) {
  if (actual !== expected) fail(`${label} must be ${JSON.stringify(expected)}`);
}

export function assertActiveContract(contract) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    fail("active contract is missing");
  }
  equal(contract.contractId, ACTIVE_CONTRACT_ID, "contractId");
  equal(
    contract.parentContractId,
    "VP-A8R-HW1-RESULT-BLIND-HARDWARE-QUALIFICATION-CONTRACT-v1",
    "parentContractId",
  );
  equal(
    contract.overrideDecisionId,
    "IYPT13-PR1-R0-HOST-SHUTDOWN-ROUTE-DECISION-v1",
    "overrideDecisionId",
  );
  equal(contract.supersedes, "VP-A8R-HW1-MACHINE-CONTRACT-v1", "supersedes");
  equal(
    contract.serialPredecessor.requiredStateBeforeH2,
    "PASS-R1I-INTERRUPTED-SERIAL-ATTEMPT-EVIDENCE-SEALED",
    "serialPredecessor.requiredStateBeforeH2",
  );
  for (const key of [
    "canonicalArtifactAvailable",
    "scientificPayloadAvailable",
    "attainedReferenceStatus",
    "fullSerialRerunRequired",
    "fullSerialRerunAuthorized",
    "checkpointResumeAuthorized",
  ]) {
    equal(contract.serialPredecessor[key], false, `serialPredecessor.${key}`);
  }
  equal(contract.serialPredecessor.partialProgressCredit, 0, "serialPredecessor.partialProgressCredit");
  equal(contract.serialOracle.fullResultBearingRunForbidden, true, "serialOracle.fullResultBearingRunForbidden");
  equal(contract.serialOracle.scientificValuePersistenceForbidden, true, "serialOracle.scientificValuePersistenceForbidden");
  equal(contract.serialOracle.canonicalA8rArtifactWriteForbidden, true, "serialOracle.canonicalA8rArtifactWriteForbidden");
  equal(contract.activeImplementation.requiredContractId, ACTIVE_CONTRACT_ID, "activeImplementation.requiredContractId");
  equal(contract.activeImplementation.v1FallbackForbidden, true, "activeImplementation.v1FallbackForbidden");
  equal(contract.activeImplementation.automaticFallbackForbidden, true, "activeImplementation.automaticFallbackForbidden");
  equal(contract.probe.resultBlind, true, "probe.resultBlind");
  equal(contract.probe.heavyProbeForbiddenDuringG1, true, "probe.heavyProbeForbiddenDuringG1");
  equal(contract.gates.speedupMinimum, 1.5, "gates.speedupMinimum");
  equal(contract.gates.selectedThroughputFractionOfBestMinimum, 0.95, "gates.selectedThroughputFractionOfBestMinimum");
  equal(contract.gates.systemReserveBytesMinimum, 4 * 1024 ** 3, "gates.systemReserveBytesMinimum");
  equal(contract.gates.systemReserveMemTotalFraction, 0.25, "gates.systemReserveMemTotalFraction");
  equal(contract.gates.candidateHeadroomFraction, 0.1, "gates.candidateHeadroomFraction");
  equal(contract.equivalence.runtimeFallbackForbidden, true, "equivalence.runtimeFallbackForbidden");
  equal(contract.shards.expectedCaseCount, 8, "shards.expectedCaseCount");
  equal(contract.shards.rejectMissing, true, "shards.rejectMissing");
  equal(contract.shards.rejectDuplicate, true, "shards.rejectDuplicate");
  equal(contract.shards.rejectCorrupt, true, "shards.rejectCorrupt");
  equal(contract.shards.rejectSourceDrift, true, "shards.rejectSourceDrift");
  equal(contract.shards.rejectWorkerFailure, true, "shards.rejectWorkerFailure");
  equal(contract.fullRuns.interruptedSerialDataUseForbidden, true, "fullRuns.interruptedSerialDataUseForbidden");
  if (JSON.stringify(contract.phaseOrder) !== JSON.stringify(["H0", "H1", "H2", "H3"])) {
    fail("phaseOrder drifted");
  }
  if (JSON.stringify(contract.provenanceLayers) !== JSON.stringify(["scientific", "execution", "artifact"])) {
    fail("provenanceLayers drifted");
  }
  if (new Set(contract.candidateClasses).size !== contract.candidateClasses.length) {
    fail("candidateClasses contains duplicates");
  }
  const overlap = contract.fieldBoundary.allowed.filter((name) =>
    contract.fieldBoundary.forbidden.includes(name),
  );
  if (overlap.length > 0) fail(`allowed/forbidden field overlap: ${overlap.join(",")}`);
  return contract;
}

export async function loadActiveContract({ contractUrl = DEFAULT_ACTIVE_CONTRACT_URL } = {}) {
  if (!contractUrl) fail("explicit active v2 contract is required; fallback is forbidden");
  const bytes = await readFile(contractUrl);
  if (sha256(bytes) !== ACTIVE_CONTRACT_SHA256) fail("active v2 contract byte hash drifted");
  const contract = JSON.parse(bytes.toString("utf8"));
  assertActiveContract(contract);
  return immutableJsonClone(contract);
}
