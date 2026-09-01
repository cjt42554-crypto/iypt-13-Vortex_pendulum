import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  HW2R_FORMAL_OBSERVATION_PASS_CODE,
  assertHw2rFormalEntrypointAuthorized,
  assertHw2rFormalObservationAuthorized,
  isHw2rFormalEntrypoint,
  loadHw2rPreObservationReadiness,
} from "../src/hw2r-pre-observation.mjs";

const commit = "1".repeat(40);
const digest = "2".repeat(64);

async function withGate(value, callback) {
  const directory = await mkdtemp(join(tmpdir(), "iypt13-hw2r-gate-v2-"));
  const path = join(directory, "readiness.json");
  try {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    return await callback(path);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function closeGate(value, passCode = HW2R_FORMAL_OBSERVATION_PASS_CODE) {
  const closed = structuredClone(value);
  closed.status = "READY";
  closed.formalObservationAuthorized = true;
  closed.attainedPassCode = passCode;
  for (const finding of closed.blockingFindings) {
    finding.status = "CLOSED";
    finding.closureEvidence = [{
      commit,
      paths: ["90_候选工作区/current/H1_硬件利用与执行架构"],
      validation: "synthetic gate-transition test only",
    }];
  }
  closed.preObservationSeal = {
    manifestPath: "evidence/pre-observation-manifest.json.gz",
    manifestStoredSha256: digest,
    manifestCanonicalSha256: digest,
    sidecarPath: "evidence/pre-observation-manifest.sha256",
    sidecarSha256: digest,
  };
  return closed;
}

test("v2 formal HW2R gate is open on exactly seven authoritative P0 findings", async () => {
  const loaded = await loadHw2rPreObservationReadiness();
  assert.equal(loaded.value.readinessId, "VP-HW2R-PRE-OBSERVATION-READINESS-v2");
  assert.equal(loaded.value.requiredPassCode, HW2R_FORMAL_OBSERVATION_PASS_CODE);
  assert.equal(loaded.value.status, "NOT_READY");
  assert.equal(loaded.authorized, false);
  assert.equal(loaded.openFindings.length, 7);
  assert.equal(loaded.sealIsComplete, false);
  assert.equal(loaded.passCodeMatches, false);
  assert.ok(loaded.openFindings.includes(
    "P0-COMPARABLE-A8R-OPERATION-GRAPH-AND-PROTOCOL",
  ));
  assert.ok(loaded.openFindings.includes(
    "P0-CHILD-CONTAINMENT-TIMEOUT-AND-FAILURE-EVIDENCE",
  ));
  await assert.rejects(
    () => assertHw2rFormalObservationAuthorized(),
    /INCONCLUSIVE-HW2R-PRE-OBSERVATION-IMPLEMENTATION-NOT-READY/u,
  );
});

test("formal runner and finalizer names are machine-gated", async () => {
  assert.equal(isHw2rFormalEntrypoint("/tmp/run-hw2r-qualification-v2.mjs"), true);
  assert.equal(isHw2rFormalEntrypoint("/tmp/finalize-hw2-selection.mjs"), true);
  assert.equal(isHw2rFormalEntrypoint("/tmp/unit-test.mjs"), false);
  await assert.rejects(
    () => assertHw2rFormalEntrypointAuthorized(
      "/tmp/run-hw2r-qualification-v2.mjs",
    ),
    /INCONCLUSIVE-HW2R-PRE-OBSERVATION-IMPLEMENTATION-NOT-READY/u,
  );
  assert.equal(await assertHw2rFormalEntrypointAuthorized("/tmp/unit-test.mjs"), null);
});

test("legacy pass code cannot authorize the v2 machine gate", async () => {
  const loaded = await loadHw2rPreObservationReadiness();
  const legacy = closeGate(
    loaded.value,
    "PASS-HW2R-PRE-OBSERVATION-READINESS",
  );
  await withGate(legacy, async (path) => {
    const result = await loadHw2rPreObservationReadiness(path);
    assert.equal(result.passCodeMatches, false);
    assert.equal(result.authorized, false);
  });
});

test("v2 gate authorizes only with exact pass code, closed P0 and sealed manifest", async () => {
  const loaded = await loadHw2rPreObservationReadiness();
  const closed = closeGate(loaded.value);
  await withGate(closed, async (path) => {
    const result = await loadHw2rPreObservationReadiness(path);
    assert.equal(result.openFindings.length, 0);
    assert.equal(result.sealIsComplete, true);
    assert.equal(result.passCodeMatches, true);
    assert.equal(result.authorized, true);
  });
});

test("a CLOSED blocker without committed closure evidence fails the v2 gate", async () => {
  const loaded = await loadHw2rPreObservationReadiness();
  const mutated = structuredClone(loaded.value);
  mutated.blockingFindings[0].status = "CLOSED";
  mutated.blockingFindings[0].closureEvidence = [];
  await withGate(mutated, async (path) => {
    await assert.rejects(
      () => loadHw2rPreObservationReadiness(path),
      /closed without evidence/u,
    );
  });
});
