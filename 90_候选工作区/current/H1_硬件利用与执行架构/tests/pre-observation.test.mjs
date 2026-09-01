import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  assertHw2rFormalObservationAuthorized,
  loadHw2rPreObservationReadiness,
} from "../src/hw2r-pre-observation.mjs";

test("formal HW2R observation remains fail-closed until every PR-2A blocker is closed", async () => {
  const loaded = await loadHw2rPreObservationReadiness();
  assert.equal(loaded.value.formalObservationAuthorized, false);
  assert.equal(loaded.authorized, false);
  assert.ok(loaded.openFindings.includes("P0-WORKLOAD-BASELINE-COMPARABILITY"));
  assert.ok(loaded.openFindings.includes("P0-GPU-PERSISTENT-LIFECYCLE"));
  assert.equal(
    loaded.openFindings.includes("P0-H2N-FULL-EVIDENCE-VALIDATION"),
    false,
  );
  const h2n = loaded.value.blockingFindings.find(({ id }) =>
    id === "P0-H2N-FULL-EVIDENCE-VALIDATION");
  assert.equal(h2n.status, "CLOSED");
  assert.ok(h2n.closureEvidence.length >= 1);
  await assert.rejects(
    () => assertHw2rFormalObservationAuthorized(),
    /INCONCLUSIVE-HW2R-PRE-OBSERVATION-IMPLEMENTATION-NOT-READY/u,
  );
});

test("readiness transition cannot authorize while any blocker remains open", async () => {
  const loaded = await loadHw2rPreObservationReadiness();
  assert.equal(
    loaded.value.authorizationTransition.allBlockingFindingsMustBeClosed,
    true,
  );
  assert.ok(loaded.openFindings.length >= 1);
  assert.equal(
    loaded.value.authorizationTransition.mandatoryStopAfterQualification,
    "READY-FOR-PR2B-H3-UNLOCK-REVIEW",
  );
});

test("a CLOSED blocker without committed closure evidence fails the machine gate", async () => {
  const loaded = await loadHw2rPreObservationReadiness();
  const mutated = structuredClone(loaded.value);
  const finding = mutated.blockingFindings.find(({ status }) =>
    status === "CLOSED");
  finding.closureEvidence = [];
  const directory = await mkdtemp(join(tmpdir(), "iypt13-hw2r-gate-"));
  const path = join(directory, "readiness.json");
  try {
    await writeFile(path, `${JSON.stringify(mutated, null, 2)}\n`, "utf8");
    await assert.rejects(
      () => loadHw2rPreObservationReadiness(path),
      /closed without evidence/u,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
