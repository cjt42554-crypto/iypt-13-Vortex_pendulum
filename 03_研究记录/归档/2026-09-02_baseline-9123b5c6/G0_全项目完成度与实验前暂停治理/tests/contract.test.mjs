import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, ROOT), "utf8"));
}

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

test("project-state schema freezes owner, status, evidence and conclusion levels", async () => {
  const schema = await readJson("contracts/project-state.schema.json");
  assert.equal(schema.$id, "urn:iypt13:g0:project-state:v1");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(
    schema.required,
    [
      "schemaVersion",
      "ledgerId",
      "project",
      "baselineCommit",
      "generatedAt",
      "conclusionCeiling",
      "workPackages",
    ],
  );
  assert.deepEqual(
    schema.$defs.workPackage.properties.owner.enum,
    ["Codex", "Pro", "human", "runtime"],
  );
  assert.deepEqual(
    schema.$defs.workPackage.properties.status.enum,
    [
      "NOT_STARTED",
      "IN_PROGRESS",
      "WAITING_PREDECESSOR",
      "PASS",
      "NO_GO",
      "INCONCLUSIVE",
      "DEFERRED_CONDITIONAL",
      "EXPERIMENT_DEPENDENT",
    ],
  );
  assertUnique(schema.$defs.workPackage.required, "work-package required fields");
  assertUnique(schema.$defs.evidence.properties.kind.enum, "evidence kinds");
  assertUnique(schema.properties.conclusionCeiling.enum, "conclusion levels");
});

test("supersession schema cannot silently delete retained clauses", async () => {
  const schema = await readJson("contracts/supersession.schema.json");
  assert.equal(schema.$id, "urn:iypt13:g0:supersession:v1");
  assert.equal(schema.additionalProperties, false);
  const entry = schema.properties.entries.items;
  assert.equal(entry.additionalProperties, false);
  assert.ok(entry.required.includes("retainedClauses"));
  assert.equal(entry.properties.retainedClauses.minItems, undefined);
  assert.equal(entry.properties.retainedClauses.uniqueItems, true);
  assert.deepEqual(
    entry.properties.relation.enum,
    ["supersedes", "narrows", "clarifies", "retains"],
  );
});
