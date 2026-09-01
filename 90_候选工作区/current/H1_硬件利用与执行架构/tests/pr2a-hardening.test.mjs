import assert from "node:assert/strict";
import test from "node:test";

import { loadHw2rProtocol } from "../src/hw2r-contract.mjs";
import {
  evaluateHw2rCandidate,
  selectFinalHw2rCandidate,
} from "../src/hw2r-evaluator.mjs";

function repeats(overrides = {}) {
  return Array.from({ length: 3 }, () => ({
    wallTimeSeconds: 20,
    workUnits: 2000,
    telemetryValid: true,
    correctnessPass: true,
    safetyPass: true,
    numericalIdentityPass: true,
    utilizationOrSaturationPass: true,
    ...overrides,
  }));
}

test("HW2R rejects cross-workload speedup comparisons", async () => {
  const { protocol } = await loadHw2rProtocol();
  assert.throws(
    () => evaluateHw2rCandidate(
      protocol,
      {
        candidateId: "r2-candidate",
        classId: "trajectory-process-parallel",
        workloadIds: ["R2"],
      },
      repeats(),
      { workloadId: "R1", throughput: 100 },
    ),
    /MEASUREMENT_INVALID-WORKLOAD-BASELINE-MISMATCH/u,
  );
});

test("surrogate digest equality cannot predeclare H2-X or H2-N identity", async () => {
  const { protocol } = await loadHw2rProtocol();
  const evaluation = evaluateHw2rCandidate(
    protocol,
    {
      candidateId: "identity-pending",
      classId: "trajectory-process-parallel",
      workloadIds: ["R1"],
    },
    repeats({ numericalIdentityPass: false }),
    { workloadId: "R1", throughput: 100 },
  );
  assert.equal(evaluation.terminalState, "NUMERICAL_IDENTITY_PENDING");
  assert.equal(
    evaluation.failureCode,
    "PENDING-HW2R-NUMERICAL-IDENTITY-QUALIFICATION",
  );
});

test("material deferred candidates block final selection", async () => {
  const { protocol } = await loadHw2rProtocol();
  const selection = selectFinalHw2rCandidate(protocol, [
    {
      candidateId: "qualified",
      terminalState: "QUALIFIED",
      workloadId: "R1",
      throughput: 100,
      possibleMaterialGainFraction: 0,
      semanticRiskRank: 1,
      memoryBytes: 1,
      governanceComplexityRank: 1,
    },
    {
      candidateId: "gpu-deferred",
      terminalState: "DEFERRED-UNSAFE-TO-PROBE",
      workloadId: "R1",
      throughput: 0,
      possibleMaterialGainFraction: 0.5,
      semanticRiskRank: 2,
      memoryBytes: 1,
      governanceComplexityRank: 2,
    },
  ]);
  assert.equal(selection.pass, false);
  assert.equal(
    selection.classification,
    "INCONCLUSIVE-HW2R-MEASUREMENT-OR-RESOURCE",
  );
  assert.deepEqual(selection.unresolvedCandidateIds, ["gpu-deferred"]);
});
