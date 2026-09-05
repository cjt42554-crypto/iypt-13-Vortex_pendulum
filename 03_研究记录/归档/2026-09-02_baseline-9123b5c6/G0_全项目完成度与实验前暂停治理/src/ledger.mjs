import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const SHA256_RE = /^[0-9a-f]{64}$/u;
const COMMIT_RE = /^[0-9a-f]{40}$/u;
const CONCLUSION_CEILINGS = new Set([
  "NONE",
  "IMPLEMENTATION_ONLY",
  "SYNTHETIC_NUMERICAL_ONLY",
  "CANDIDATE_NUMERICAL_ONLY",
  "PUBLIC_PHYSICAL_ONLY",
  "EXPERIMENT_PREPARATION_ONLY",
  "EXPERIMENT_VALIDATED",
]);
const OWNERS = new Set(["Codex", "Pro", "human", "runtime"]);
const PRIORITIES = new Set(["P0", "P1", "P2", "P3"]);
const STATUSES = new Set([
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING_PREDECESSOR",
  "PASS",
  "NO_GO",
  "INCONCLUSIVE",
  "DEFERRED_CONDITIONAL",
  "EXPERIMENT_DEPENDENT",
]);
const EVIDENCE_KINDS = new Set([
  "contract",
  "implementation-test",
  "numerical-qualification",
  "physical-validation",
  "experimental-validation",
  "governance",
  "runtime-observation",
]);

function fail(message) {
  throw new Error(`G0 ledger validation failed: ${message}`);
}

function assertExactKeys(value, expected, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys differ: ${actual.join(",")}`);
  }
}

function assertUniqueStrings(values, label) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) {
    fail(`${label} must be a string array`);
  }
  if (new Set(values).size !== values.length) fail(`${label} contains duplicates`);
}

function assertAcyclic(workPackages) {
  const packages = new Map(workPackages.map((entry) => [entry.id, entry]));
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) fail(`predecessor cycle includes ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const predecessor of packages.get(id).predecessors) visit(predecessor);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of packages.keys()) visit(id);
}

export function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("non-finite number in canonical JSON");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
    ).join(",")}}`;
  }
  fail(`unsupported canonical JSON type ${typeof value}`);
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function validateProjectState(ledger, { repositoryRoot } = {}) {
  assertExactKeys(
    ledger,
    [
      "schemaVersion",
      "ledgerId",
      "project",
      "baselineCommit",
      "generatedAt",
      "conclusionCeiling",
      "workPackages",
    ],
    "project ledger",
  );
  if (ledger.schemaVersion !== "G0-PROJECT-STATE-CONTRACT-v1") fail("schemaVersion mismatch");
  if (ledger.project !== "IYPT-2027-P13-VORTEX-PENDULUM") fail("project mismatch");
  if (!COMMIT_RE.test(ledger.baselineCommit)) fail("invalid baseline commit");
  if (!Number.isFinite(Date.parse(ledger.generatedAt))) fail("invalid generatedAt");
  if (!CONCLUSION_CEILINGS.has(ledger.conclusionCeiling)) fail("invalid conclusionCeiling");
  if (typeof ledger.ledgerId !== "string" || ledger.ledgerId.length === 0) fail("ledgerId missing");
  if (!Array.isArray(ledger.workPackages) || ledger.workPackages.length === 0) {
    fail("workPackages must not be empty");
  }

  const ids = ledger.workPackages.map((entry) => entry.id);
  assertUniqueStrings(ids, "work-package IDs");
  const known = new Set(ids);
  for (const entry of ledger.workPackages) {
    assertExactKeys(
      entry,
      ["id", "title", "owner", "priority", "status", "predecessors", "evidence", "terminationCode", "nextGate"],
      `work package ${entry.id}`,
    );
    if (!/^WP-[A-Z0-9]+$/u.test(entry.id)) fail(`invalid work-package ID ${entry.id}`);
    if (typeof entry.title !== "string" || entry.title.length === 0) fail(`${entry.id} title missing`);
    if (!OWNERS.has(entry.owner)) fail(`${entry.id} owner invalid`);
    if (!PRIORITIES.has(entry.priority)) fail(`${entry.id} priority invalid`);
    if (!STATUSES.has(entry.status)) fail(`${entry.id} status invalid`);
    if (entry.terminationCode !== null && typeof entry.terminationCode !== "string") {
      fail(`${entry.id} terminationCode invalid`);
    }
    if (entry.nextGate !== null && typeof entry.nextGate !== "string") {
      fail(`${entry.id} nextGate invalid`);
    }
    assertUniqueStrings(entry.predecessors, `${entry.id} predecessors`);
    for (const predecessor of entry.predecessors) {
      if (!known.has(predecessor)) fail(`${entry.id} has unknown predecessor ${predecessor}`);
      if (predecessor === entry.id) fail(`${entry.id} depends on itself`);
    }
    if (!Array.isArray(entry.evidence)) fail(`${entry.id} evidence must be an array`);
    if (["PASS", "NO_GO", "INCONCLUSIVE"].includes(entry.status) && !entry.terminationCode) {
      fail(`${entry.id} terminal status lacks terminationCode`);
    }
    if (entry.status === "PASS" && entry.evidence.length === 0) {
      fail(`${entry.id} cannot PASS without evidence`);
    }
    for (const evidence of entry.evidence) {
      assertExactKeys(evidence, ["kind", "path", "sha256", "claim"], `${entry.id} evidence`);
      if (!EVIDENCE_KINDS.has(evidence.kind)) fail(`${entry.id} evidence kind invalid`);
      if (!SHA256_RE.test(evidence.sha256)) fail(`${entry.id} evidence SHA-256 invalid`);
      if (
        typeof evidence.path !== "string" ||
        evidence.path.length === 0 ||
        evidence.path.startsWith("/") ||
        evidence.path.split("/").includes("..")
      ) {
        fail(`${entry.id} evidence path invalid`);
      }
      if (typeof evidence.claim !== "string" || evidence.claim.length === 0) {
        fail(`${entry.id} evidence claim missing`);
      }
      if (repositoryRoot) {
        const bytes = await readFile(resolve(repositoryRoot, evidence.path));
        if (sha256(bytes) !== evidence.sha256) fail(`${entry.id} evidence hash drift: ${evidence.path}`);
      }
    }
  }
  assertAcyclic(ledger.workPackages);
  return {
    ledgerId: ledger.ledgerId,
    packageCount: ledger.workPackages.length,
    canonicalSha256: sha256(canonicalJson(ledger)),
  };
}

export function validateSupersession(ledger) {
  assertExactKeys(ledger, ["schemaVersion", "baselineCommit", "entries"], "supersession ledger");
  if (ledger.schemaVersion !== "G0-SUPERSESSION-CONTRACT-v1") fail("supersession schemaVersion mismatch");
  if (!COMMIT_RE.test(ledger.baselineCommit)) fail("supersession baseline commit invalid");
  if (!Array.isArray(ledger.entries)) fail("supersession entries must be an array");
  const subjects = [];
  for (const entry of ledger.entries) {
    assertExactKeys(
      entry,
      ["subject", "olderPath", "olderCommit", "newerPath", "newerCommit", "relation", "retainedClauses"],
      "supersession entry",
    );
    if (!COMMIT_RE.test(entry.olderCommit) || !COMMIT_RE.test(entry.newerCommit)) {
      fail(`invalid supersession commit for ${entry.subject}`);
    }
    if (typeof entry.subject !== "string" || entry.subject.length === 0) {
      fail("supersession subject missing");
    }
    for (const [key, path] of [["olderPath", entry.olderPath], ["newerPath", entry.newerPath]]) {
      if (
        typeof path !== "string" ||
        path.length === 0 ||
        path.startsWith("/") ||
        path.split("/").includes("..")
      ) {
        fail(`${entry.subject} ${key} invalid`);
      }
    }
    if (!["supersedes", "narrows", "clarifies", "retains"].includes(entry.relation)) {
      fail(`invalid supersession relation for ${entry.subject}`);
    }
    assertUniqueStrings(entry.retainedClauses, `${entry.subject} retained clauses`);
    if (entry.retainedClauses.length === 0) fail(`${entry.subject} must state retained clauses`);
    subjects.push(entry.subject);
  }
  assertUniqueStrings(subjects, "supersession subjects");
  return { entryCount: ledger.entries.length, canonicalSha256: sha256(canonicalJson(ledger)) };
}
