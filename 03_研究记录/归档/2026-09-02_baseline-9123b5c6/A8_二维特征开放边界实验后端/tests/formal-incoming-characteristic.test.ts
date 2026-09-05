import assert from "node:assert/strict";
import { test } from "node:test";
import { runIncomingCharacteristicStartupCase } from
  "../src/formal-incoming-characteristic-case.ts";
import { FORMAL_INCOMING_CHARACTERISTIC_CONTRACT as CONTRACT } from
  "../src/formal-incoming-characteristic-contract.ts";
import {
  buildIncomingCharacteristicAcousticCases,
  buildIncomingCharacteristicStartupCases,
} from "../src/formal-incoming-characteristic.ts";
import type { IncomingCharacteristicProvenance } from
  "../src/formal-incoming-characteristic-types.ts";

const provenance: IncomingCharacteristicProvenance = {
  formalSourceSha256: "formal",
  proDecisionSha256: "pro",
  a8mStoredArtifactSha256: "a8m-stored",
  a8mCanonicalArtifactSha256: "a8m-canonical",
  shadowLedgerSourceSha256: "ledger",
  contractSha256: "contract",
  contractDocumentSha256: "document",
  contractCommit: "contract-commit",
  implementationCommit: "implementation-commit",
  implementationTreeSha256: "implementation-tree",
};

test("A8N builders freeze 54 startup cases and six acoustic pairs", () => {
  const startup = buildIncomingCharacteristicStartupCases();
  const acoustic = buildIncomingCharacteristicAcousticCases();
  assert.equal(startup.length, CONTRACT.startupMatrix.runCount);
  assert.equal(acoustic.length, CONTRACT.acousticReflection.caseCount);
  assert.equal(new Set(startup.map((entry) => entry.id)).size, startup.length);
  assert.equal(new Set(acoustic.map((entry) => entry.id)).size, acoustic.length);
  assert.deepEqual(startup.slice(0, 2).map((entry) => entry.strategy), [
    "legacy-zou-he-derived-density",
    "incoming-characteristic-compatible-zou-he",
  ]);
});

test("A8N small unregistered S9 guard records exact incoming-only reconstruction", () => {
  const execution = runIncomingCharacteristicStartupCase({
    id: "implementation-guard-unregistered-geometry",
    nominalDiameterCells: 2,
    relaxationTime: 0.56,
    nx: 12,
    ny: 8,
    auditSteps: 4,
    rampSteps: 0,
    preRunSteps: 0,
    strategy: "incoming-characteristic-compatible-zou-he",
    protocol: "uniform-target-no-body",
    initialField: "uniform-target-velocity",
    body: null,
  }, provenance);
  const result = execution.result;
  assert.equal(result.run.status, "completed");
  assert.equal(result.run.massStepRecords.length, 4);
  assert.equal(result.run.reconstructionStepRecords.length, 4);
  assert.equal(result.run.reconstructionSummary?.rowRecordCount, 32);
  assert.equal(result.run.reconstructionSummary?.gates.pass, true);
  assert.equal(
    result.run.reconstructionSummary?.cumulativeNonIncomingAbsoluteModification,
    0,
  );
  assert.equal(result.gate.uniformStatePass, true);
  assert.equal(result.gate.pass, true);
  assert.ok(
    (result.run.reconstructionSummary
      ?.maximumIncomingCharacteristicAbsoluteResidual ?? Infinity) <= 1e-12,
  );
});
