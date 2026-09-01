import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, ROOT), "utf8"));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertMachineContract(contract) {
  assert.equal(contract.contractId, "VP-A8R-HW1-MACHINE-CONTRACT-v1");
  assert.equal(
    contract.parentContractId,
    "VP-A8R-HW1-RESULT-BLIND-HARDWARE-QUALIFICATION-CONTRACT-v1",
  );
  assert.deepEqual(contract.phaseOrder, ["H0", "H1", "H2", "H3"]);
  assert.equal(contract.serialReference.requiredStateBeforeH2, "SEALED");
  assert.equal(contract.probe.resultBlind, true);
  assert.equal(contract.probe.validRepeatsMinimum, 3);
  assert.equal(contract.gates.speedupMinimum, 1.5);
  assert.equal(contract.gates.selectedThroughputFractionOfBestMinimum, 0.95);
  assert.equal(contract.gates.systemReserveBytesMinimum, 4 * 1024 ** 3);
  assert.equal(contract.equivalence.runtimeFallbackForbidden, true);
  assert.equal(contract.shards.expectedCaseCount, 8);
  assert.deepEqual(contract.provenanceLayers, ["scientific", "execution", "artifact"]);
  assert.deepEqual(contract.fullRuns.identities, ["HW1-primary", "HW1-repeat"]);
  assert.equal(
    new Set(contract.candidateClasses).size,
    contract.candidateClasses.length,
  );
  assert.equal(
    contract.fieldBoundary.allowed.some((name) => contract.fieldBoundary.forbidden.includes(name)),
    false,
  );
}

test("machine contract maps the frozen Markdown identity and immutable thresholds", async () => {
  const contract = await readJson("contracts/h1-machine-contract.v1.json");
  const schema = await readJson("contracts/h1-machine-contract.schema.json");
  const markdownBytes = await readFile(
    new URL("01_A8R_HW1_结果盲硬件资格预注册合同.md", ROOT),
  );
  const markdown = markdownBytes.toString("utf8");

  assert.equal(
    sha256(markdownBytes),
    "91d3c8aa916321144f0ef5f50dc44394df6c7cba22a420063a4f96a724db4b25",
  );
  assertMachineContract(contract);
  assert.deepEqual(Object.keys(contract).sort(), [...schema.required].sort());

  for (const token of [
    contract.parentContractId,
    "H0",
    "H1",
    "H2",
    "H3",
    "S >= 1.50",
    "E >= 0.55",
    "95%",
    "70%",
    "60%",
    "35%",
    "4\\ \\mathrm{GiB}",
    "0.25",
    "HW1-primary",
    "HW1-repeat",
    "NO-GO-A8R-HW1-HARDWARE-QUALIFICATION",
  ]) {
    assert.ok(markdown.includes(token), `frozen Markdown must contain ${token}`);
  }
});

test("contract mutations fail the frozen invariant audit", async () => {
  const contract = await readJson("contracts/h1-machine-contract.v1.json");
  const badSpeedup = structuredClone(contract);
  badSpeedup.gates.speedupMinimum = 1.49;
  assert.throws(() => assertMachineContract(badSpeedup));

  const leaked = structuredClone(contract);
  leaked.fieldBoundary.allowed.push("drag");
  assert.throws(() => assertMachineContract(leaked));

  const mixedRuns = structuredClone(contract);
  mixedRuns.fullRuns.identities = ["serial-reference", "HW1-repeat"];
  assert.throws(() => assertMachineContract(mixedRuns));
});
