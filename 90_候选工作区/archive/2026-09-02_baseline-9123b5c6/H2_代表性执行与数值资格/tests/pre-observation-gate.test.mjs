import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCleanMainParityAndIdentity,
  HW2_FINALIZATION_IMPLEMENTATION_PATHS,
  HW2R_IMPLEMENTATION_PATHS,
  requiresHw2rFormalObservationAuthorization,
} from "../src/repository-preflight.mjs";

test("formal observation detection is content based rather than array identity based", () => {
  assert.equal(
    requiresHw2rFormalObservationAuthorization([
      ...HW2R_IMPLEMENTATION_PATHS,
    ]),
    true,
  );
  assert.equal(
    requiresHw2rFormalObservationAuthorization([
      ...HW2_FINALIZATION_IMPLEMENTATION_PATHS,
    ]),
    true,
  );
  assert.equal(
    requiresHw2rFormalObservationAuthorization([
      "90_候选工作区/current/H2_代表性执行与数值资格/src/contract.mjs",
    ]),
    false,
  );
});

test("cloned formal path lists fail closed while the machine readiness gate is blocked", async () => {
  await assert.rejects(
    () => assertCleanMainParityAndIdentity([
      ...HW2R_IMPLEMENTATION_PATHS,
    ]),
    /INCONCLUSIVE-HW2R-PRE-OBSERVATION-IMPLEMENTATION-NOT-READY/u,
  );
  await assert.rejects(
    () => assertCleanMainParityAndIdentity([
      ...HW2_FINALIZATION_IMPLEMENTATION_PATHS,
    ]),
    /INCONCLUSIVE-HW2R-PRE-OBSERVATION-IMPLEMENTATION-NOT-READY/u,
  );
});
