import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import test from "node:test";

import {
  assertR1iDocument,
  sha256,
  sidecarLine,
} from "../src/r1i-seal.mjs";

const ROOT = new URL("../", import.meta.url);

async function load() {
  const manifestUrl = new URL(
    "evidence/r1i-interrupted-serial-attempt-seal-20260901.json",
    ROOT,
  );
  const sidecarUrl = new URL(
    "evidence/r1i-interrupted-serial-attempt-seal-20260901.sha256",
    ROOT,
  );
  const schemaUrl = new URL(
    "contracts/r1i-interrupted-attempt-seal.schema.json",
    ROOT,
  );
  const bytes = await readFile(manifestUrl);
  return {
    bytes,
    manifest: JSON.parse(bytes.toString("utf8")),
    schema: JSON.parse(await readFile(schemaUrl, "utf8")),
    sidecar: await readFile(sidecarUrl, "utf8"),
    filename: basename(manifestUrl.pathname),
  };
}

test("R1I manifest has the exact contract shape and sidecar", async () => {
  const { bytes, manifest, schema, sidecar, filename } = await load();
  assert.equal(assertR1iDocument(manifest, schema), manifest);
  assert.equal(sidecar, sidecarLine(sha256(bytes), filename));
});

test("R1I rejects partial credit, payload inspection, and route reopening", async () => {
  const { manifest, schema } = await load();
  for (const mutate of [
    (value) => {
      value.scientificBoundary.partialProgressCredit = 0.9;
    },
    (value) => {
      value.scientificBoundary.scientificPayloadInspected = true;
    },
    (value) => {
      value.routeLocks.legacyFullSerialRerunAuthorized = true;
    },
    (value) => {
      value.routeLocks.checkpointResumeAuthorized = true;
    },
    (value) => {
      value.routeLocks.oldWorktreeReuseAuthorized = true;
    },
  ]) {
    const bad = structuredClone(manifest);
    mutate(bad);
    assert.throws(() => assertR1iDocument(bad, schema));
  }
});

test("R1I rejects dirty or reused old-worktree identity", async () => {
  const { manifest, schema } = await load();
  for (const mutate of [
    (value) => {
      value.oldWorktree.clean = false;
    },
    (value) => {
      value.oldWorktree.porcelainV2Entries.push("1 synthetic-dirty-entry");
    },
    (value) => {
      value.oldWorktree.head = "0".repeat(40);
    },
    (value) => {
      value.oldWorktree.mutatingCommandsExecuted.push("git pull");
    },
  ]) {
    const bad = structuredClone(manifest);
    mutate(bad);
    assert.throws(() => assertR1iDocument(bad, schema));
  }
});

test("R1I rejects present canonical artifacts, partials, and process survival", async () => {
  const { manifest, schema } = await load();
  for (const mutate of [
    (value) => {
      value.artifacts.expectedGzip.state = "PRESENT";
    },
    (value) => {
      value.artifacts.expectedSidecar.state = "PRESENT";
    },
    (value) => {
      value.artifacts.partialArtifacts.push(".partial-synthetic");
    },
    (value) => {
      value.processes[2].state = "PRESENT";
    },
  ]) {
    const bad = structuredClone(manifest);
    mutate(bad);
    assert.throws(() => assertR1iDocument(bad, schema));
  }
});

test("R1I rejects scientific result keys", async () => {
  const { manifest, schema } = await load();
  const bad = structuredClone(manifest);
  bad.scientificBoundary.drag = 0;
  assert.throws(() => assertR1iDocument(bad, schema), /forbidden scientific key drag/);
});
