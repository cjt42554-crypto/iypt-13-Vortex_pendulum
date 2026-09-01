import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateProjectState, validateSupersession } from "../src/ledger.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../../..");
const readJson = async (name) => JSON.parse(await readFile(resolve(packageRoot, name), "utf8"));

test("current project ledger closes hashes and predecessor graph", async () => {
  const result = await validateProjectState(
    await readJson("project-state-ledger.json"),
    { repositoryRoot },
  );
  assert.equal(result.packageCount, 15);
  assert.match(result.canonicalSha256, /^[0-9a-f]{64}$/u);
});

test("current supersession ledger preserves explicit retained clauses", async () => {
  const result = validateSupersession(await readJson("supersession-ledger.json"));
  assert.equal(result.entryCount, 6);
  assert.match(result.canonicalSha256, /^[0-9a-f]{64}$/u);
});

test("PR-1 route uses R1I and active H1 v2 without the superseded R1 predecessor", async () => {
  const ledger = await readJson("project-state-ledger.json");
  const byId = new Map(ledger.workPackages.map((entry) => [entry.id, entry]));

  assert.equal(byId.get("WP-R0").nextGate, "WP-R1I");
  assert.equal(byId.get("WP-R1I").status, "PASS");
  assert.equal(
    byId.get("WP-R1I").terminationCode,
    "PASS-R1I-INTERRUPTED-SERIAL-ATTEMPT-EVIDENCE-SEALED",
  );
  assert.match(byId.get("WP-R1").terminationCode, /^SUPERSEDED-R1-/u);
  assert.deepEqual(byId.get("WP-HW2").predecessors, ["WP-G1", "WP-HW1", "WP-R1I"]);
  assert.equal(byId.get("WP-HW2").predecessors.includes("WP-R1"), false);
  assert.ok(
    byId.get("WP-HW1").evidence.some((item) =>
      item.path.endsWith("h1-machine-contract.v2.json"),
    ),
  );
});

test("duplicate package, cycle and evidence drift fail closed", async () => {
  const ledger = await readJson("project-state-ledger.json");

  const duplicate = structuredClone(ledger);
  duplicate.workPackages.push(structuredClone(duplicate.workPackages[0]));
  await assert.rejects(validateProjectState(duplicate), /duplicates/u);

  const cycle = structuredClone(ledger);
  cycle.workPackages.find((entry) => entry.id === "WP-G1").predecessors = ["WP-HW1"];
  await assert.rejects(validateProjectState(cycle), /cycle/u);

  const drift = structuredClone(ledger);
  drift.workPackages[0].evidence[0].sha256 = "0".repeat(64);
  await assert.rejects(
    validateProjectState(drift, { repositoryRoot }),
    /hash drift/u,
  );
});

test("terminal PASS without evidence fails closed", async () => {
  const ledger = await readJson("project-state-ledger.json");
  const bad = structuredClone(ledger);
  const hw2 = bad.workPackages.find((entry) => entry.id === "WP-HW2");
  hw2.status = "PASS";
  hw2.terminationCode = "PASS-WITHOUT-EVIDENCE";
  await assert.rejects(validateProjectState(bad), /cannot PASS without evidence/u);
});

test("unknown status, evidence kind and path traversal fail closed", async () => {
  const ledger = await readJson("project-state-ledger.json");

  const badStatus = structuredClone(ledger);
  badStatus.workPackages[0].status = "SUPER-PASS";
  await assert.rejects(validateProjectState(badStatus), /status invalid/u);

  const badKind = structuredClone(ledger);
  badKind.workPackages[0].evidence[0].kind = "claim";
  await assert.rejects(validateProjectState(badKind), /evidence kind invalid/u);

  const traversal = structuredClone(ledger);
  traversal.workPackages[0].evidence[0].path = "../outside.json";
  await assert.rejects(validateProjectState(traversal), /evidence path invalid/u);
});
