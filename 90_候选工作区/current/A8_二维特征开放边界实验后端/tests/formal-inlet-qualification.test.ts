import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildFormalInletQualificationAcousticCases,
  buildFormalInletQualificationStartupCases,
} from "../src/formal-inlet-qualification.ts";
import { runFormalInletQualificationStartupCase } from
  "../src/formal-inlet-qualification-case.ts";
import type { QualificationProvenance } from
  "../src/formal-inlet-qualification-types.ts";

const provenance: QualificationProvenance = {
  formalSourceSha256: "formal",
  proDecisionSha256: "pro",
  a8lAdapterSourceSha256: "adapter",
  a8lStoredArtifactSha256: "a8l-stored",
  a8lCanonicalArtifactSha256: "a8l-canonical",
  a8hArtifactSha256: "a8h",
  contractSha256: "contract",
  contractCommit: "commit",
};

test("A8M builders freeze 108 startup cases and 12 acoustic pairs", () => {
  const startup = buildFormalInletQualificationStartupCases();
  const acoustic = buildFormalInletQualificationAcousticCases();
  assert.equal(startup.length, 108);
  assert.equal(acoustic.length, 12);
  assert.equal(new Set(startup.map((entry) => entry.id)).size, 108);
  assert.equal(new Set(acoustic.map((entry) => entry.id)).size, 12);
  assert.equal(startup.filter((entry) => entry.preRunSteps > 0).length, 36);
  assert.equal(startup.filter((entry) => entry.body !== null).length, 36);
});

test("A8M startup case records every population-budget step", () => {
  const execution = runFormalInletQualificationStartupCase({
    id: "a8m-micro-rest-ramp-s1",
    nominalDiameterCells: 4,
    relaxationTime: 0.56,
    nx: 16,
    ny: 10,
    auditSteps: 3,
    rampSteps: 2,
    preRunSteps: 0,
    strategy: "legacy-zou-he-derived-density",
    protocol: "rest-ramp-20d-no-body",
    initialField: "uniform-rest",
    body: null,
  }, provenance);
  assert.equal(execution.result.run.status, "completed");
  assert.equal(execution.result.run.completedAuditSteps, 3);
  assert.equal(execution.result.run.massStepRecords.length, 3);
  assert.equal(execution.result.run.massSummary?.stepRecordCount, 3);
  assert.equal(execution.result.run.massSummary?.gates.formalShadowExact, true);
  assert.equal(execution.result.run.massSummary?.gates.stepClosurePass, true);
  assert.equal(execution.result.run.massSummary?.gates.cumulativeClosurePass, true);
  assert.equal(execution.auditEndField?.rho.length, 160);
});

test("A8M uniform no-body legacy guard preserves the target state", () => {
  const execution = runFormalInletQualificationStartupCase({
    id: "a8m-micro-uniform-s1",
    nominalDiameterCells: 4,
    relaxationTime: 0.58,
    nx: 16,
    ny: 10,
    auditSteps: 3,
    rampSteps: 0,
    preRunSteps: 0,
    strategy: "legacy-zou-he-derived-density",
    protocol: "uniform-target-no-body",
    initialField: "uniform-target-velocity",
    body: null,
  }, provenance);
  assert.equal(execution.result.run.status, "completed");
  assert.ok(
    (execution.result.run.auditStability?.maximumDensityDeviation
      ?? Number.POSITIVE_INFINITY) <= 1e-12,
  );
  assert.equal(execution.result.run.massSummary?.gates.pass, true);
});
