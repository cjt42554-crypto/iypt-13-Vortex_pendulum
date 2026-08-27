import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { FORMAL_CAUSAL_REFERENCE_CONTRACT as CONTRACT } from
  "../src/formal-causal-reference-contract.ts";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-causal-reference-2d-qualification.json.gz",
);
const repeatPath = process.argv[3] === undefined
  ? undefined
  : resolve(process.argv[3]);
const a8nPath = resolve(
  process.argv[4]
    ?? "验证与复现/artifacts/a8-formal-mrt-incoming-characteristic-qualification.json.gz",
);
const repositoryRoot = resolve(process.cwd(), "../../../");
const candidateRoot =
  "90_候选工作区/current/A8_二维特征开放边界实验后端";
const contractRepositoryPath =
  candidateRoot + "/src/formal-causal-reference-contract.ts";
const contractDocumentRepositoryPath =
  candidateRoot + "/11_A8O_因果参考与二维边界资格预注册合同.md";
const scientificImplementationRepositoryPaths = [
  candidateRoot + "/src/formal-causal-reference-support.ts",
  candidateRoot + "/src/formal-causal-reference-runs.ts",
  candidateRoot + "/src/formal-causal-reference-analysis.ts",
  candidateRoot + "/src/formal-causal-reference-perturbations.ts",
  candidateRoot + "/src/formal-causal-reference.ts",
].sort();
const implementationRepositoryPaths = [
  ...scientificImplementationRepositoryPaths,
  candidateRoot + "/scripts/run-formal-causal-reference.mjs",
  candidateRoot + "/scripts/assert-formal-causal-reference-artifact.mjs",
  candidateRoot + "/package.json",
].sort();

function hash(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function git(args, encoding = "utf8") {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function implementationTreeSha256AtCommit(commit) {
  const digest = createHash("sha256");
  for (const path of implementationRepositoryPaths) {
    digest.update(path);
    digest.update("\0");
    digest.update(git(["show", commit + ":" + path], null));
    digest.update("\0");
  }
  return digest.digest("hex");
}

function assertFiniteTree(value, path = "result") {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), path);
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertFiniteTree(entry, path + "[" + index + "]"));
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    assertFiniteTree(entry, path + "." + key);
  }
}

function assertDirectionArray(values, label) {
  assert.equal(values.length, 9, label);
  assert.ok(values.every(Number.isFinite), label);
}

function assertMassRecord(record, expectedStep) {
  assert.equal(record.step, expectedStep);
  for (const field of [
    "preFormalTotalMass",
    "postFormalTotalMass",
    "postCandidateTotalMass",
    "formalMassChange",
    "adapterTotal",
    "actualMassChange",
    "budgetMassChange",
    "closureResidual",
    "normalizedClosureResidual",
    "cumulativeClosureResidual",
    "cumulativeAbsoluteExchange",
    "normalizedCumulativeClosureResidual",
  ]) {
    assert.ok(Number.isFinite(record[field]), field);
  }
  assertDirectionArray(record.adapterByDirection, "adapter directions");
  assertDirectionArray(
    record.adapterAbsoluteByDirection,
    "absolute adapter directions",
  );
  assert.equal(
    record.closureResidual,
    record.actualMassChange - record.budgetMassChange,
  );
  assert.ok(
    record.normalizedClosureResidual
      <= CONTRACT.exactPopulationAccounting.gates
        .maximumNormalizedStepClosureResidual,
  );
  assert.ok(
    record.normalizedCumulativeClosureResidual
      <= CONTRACT.exactPopulationAccounting.gates
        .maximumNormalizedCumulativeClosureResidual,
  );
}

function assertMassSummary(summary, expectedSteps) {
  assert.equal(summary.stepRecordCount, expectedSteps);
  assertDirectionArray(
    summary.cumulativeAdapterByDirection,
    "summary adapter directions",
  );
  assertDirectionArray(
    summary.cumulativeAdapterAbsoluteByDirection,
    "summary absolute adapter directions",
  );
  assert.equal(summary.gates.complete, true);
  assert.equal(summary.gates.finite, true);
  assert.equal(summary.gates.stepClosurePass, true);
  assert.equal(summary.gates.cumulativeClosurePass, true);
  assert.equal(summary.gates.nonIncomingModificationPass, true);
}

function assertReconstruction(run, expectedSteps, expectedRows, candidate) {
  assert.equal(
    run.reconstructionStepRecords.length,
    candidate ? expectedSteps : 0,
  );
  if (candidate) {
    for (let index = 0; index < run.reconstructionStepRecords.length; index += 1) {
      const record = run.reconstructionStepRecords[index];
      assert.equal(record.step, index + 1);
      assert.equal(record.rowCount, expectedRows);
      assert.equal(record.rowDigestFnv1a32.length, 8);
    }
  }
  assert.equal(run.reconstructionSummary.applicable, candidate);
  assert.equal(run.reconstructionSummary.gates.complete, true);
  assert.equal(run.reconstructionSummary.gates.finite, true);
  assert.equal(
    run.reconstructionSummary.gates.nonIncomingModificationPass,
    true,
  );
}

function assertRunLedger(run, expectedSteps, expectedRows, candidate) {
  assert.equal(run.completedSteps, expectedSteps);
  assert.equal(run.status, "completed");
  assert.equal(run.failure, undefined);
  assert.equal(run.massStepRecords.length, expectedSteps);
  for (let index = 0; index < run.massStepRecords.length; index += 1) {
    assertMassRecord(run.massStepRecords[index], index + 1);
  }
  assertMassSummary(run.massSummary, expectedSteps);
  assertReconstruction(run, expectedSteps, expectedRows, candidate);
}

const primaryRaw = await readFile(primaryPath);
const canonicalRaw = primaryPath.endsWith(".gz")
  ? gunzipSync(primaryRaw)
  : primaryRaw;
const result = JSON.parse(canonicalRaw.toString("utf8"));
assertFiniteTree(result);
assert.equal(result.format, "VP-A8O-CAUSAL-REFERENCE-2D-QUALIFICATION-v1");
assert.equal(result.contractIdentity?.format, CONTRACT.format);

const contractCommit = result.contractIdentity.contractCommit;
const implementationCommit = result.contractIdentity.implementationCommit;
const frozenContractRaw = git([
  "show",
  contractCommit + ":" + contractRepositoryPath,
], null);
const frozenDocumentRaw = git([
  "show",
  contractCommit + ":" + contractDocumentRepositoryPath,
], null);
assert.equal(
  Buffer.compare(
    await readFile(resolve(repositoryRoot, contractRepositoryPath)),
    frozenContractRaw,
  ),
  0,
);
assert.equal(
  Buffer.compare(
    await readFile(resolve(repositoryRoot, contractDocumentRepositoryPath)),
    frozenDocumentRaw,
  ),
  0,
);
assert.equal(result.contractIdentity.contractSha256, hash(frozenContractRaw));
assert.equal(
  result.contractIdentity.contractDocumentSha256,
  hash(frozenDocumentRaw),
);
const implementationCommits = new Set(
  scientificImplementationRepositoryPaths.map((path) =>
    git(["log", "-1", "--format=%H", "--", path]).trim()),
);
assert.equal(implementationCommits.size, 1);
assert.equal([...implementationCommits][0], implementationCommit);
for (const path of implementationRepositoryPaths) {
  const current = await readFile(resolve(repositoryRoot, path));
  const frozen = git(["show", implementationCommit + ":" + path], null);
  assert.equal(Buffer.compare(current, frozen), 0, path);
}
assert.equal(
  result.contractIdentity.implementationTreeSha256,
  implementationTreeSha256AtCommit(implementationCommit),
);

for (const [field, entry] of [
  ["formalSourceSha256", CONTRACT.sourceIdentity.formalSource],
  ["proDecisionSha256", CONTRACT.sourceIdentity.proDecision],
  ["frozenS9BoundarySha256", CONTRACT.sourceIdentity.frozenS9Boundary],
  ["frozenA8nContractSha256", CONTRACT.sourceIdentity.frozenA8nContract],
  [
    "fixedCylinderGeometrySha256",
    CONTRACT.sourceIdentity.fixedCylinderGeometry,
  ],
  [
    "fixedCylinderMetricsSha256",
    CONTRACT.sourceIdentity.fixedCylinderMetrics,
  ],
]) {
  assert.equal(
    result.contractIdentity[field],
    hash(await readFile(resolve(repositoryRoot, entry.relativePath))),
  );
}
const a8nStoredRaw = await readFile(a8nPath);
assert.equal(
  result.contractIdentity.a8nStoredArtifactSha256,
  hash(a8nStoredRaw),
);
assert.equal(
  result.contractIdentity.a8nCanonicalArtifactSha256,
  hash(gunzipSync(a8nStoredRaw)),
);

assert.equal(
  result.causal.runs.length,
  CONTRACT.causalReference.matrix.runCount,
);
assert.equal(result.causal.cornerAnalyses.length, 9);
assert.equal(
  new Set(result.causal.runs.map((entry) => entry.definition.id)).size,
  CONTRACT.causalReference.matrix.runCount,
);
for (const run of result.causal.runs) {
  const candidate = run.definition.strategy
    === "incoming-characteristic-compatible-zou-he";
  assertRunLedger(
    run,
    run.definition.runSteps,
    run.definition.ny,
    candidate,
  );
  assert.equal(run.loadTrace.length, run.definition.runSteps);
  if (run.definition.upstreamDiameters === 3.5) {
    assert.equal(run.anchorComparison.applicable, true);
    assert.equal(run.anchorComparison.checkedSteps, run.definition.runSteps);
  } else {
    assert.equal(run.anchorComparison.applicable, false);
  }
}
for (const corner of result.causal.cornerAnalyses) {
  assert.equal(corner.runComparisons.length, 8);
  assert.equal(corner.shortDistancePairs.length, 3);
  assert.equal(corner.alignedFluxComparisons.length, 3);
  assert.ok(corner.referenceAgreement.sampleCount > 0);
}

assert.equal(
  result.statistics.runs.length,
  CONTRACT.continuousStatistics.matrixRunCount,
);
assert.equal(
  new Set(result.statistics.runs.map((entry) => entry.definition.id)).size,
  CONTRACT.continuousStatistics.matrixRunCount,
);
for (const run of result.statistics.runs) {
  const candidate = run.definition.strategy
    === "incoming-characteristic-compatible-zou-he";
  assertRunLedger(
    run,
    run.definition.runSteps,
    run.definition.ny,
    candidate,
  );
  assert.equal(run.loadTrace.length, run.definition.runSteps);
  assert.equal(run.windows.length, 3);
  assert.equal(run.consecutiveDrifts.length, 2);
  const expectedFieldSamples = Math.round(
    CONTRACT.continuousStatistics.windowConvectiveDuration
      * run.definition.nominalDiameterCells
      / CONTRACT.commonNumerics.inletVelocityLattice
      / run.definition.sampleStride,
  );
  const expectedLoadSamples = Math.round(
    CONTRACT.continuousStatistics.windowConvectiveDuration
      * run.definition.nominalDiameterCells
      / CONTRACT.commonNumerics.inletVelocityLattice,
  );
  for (const window of run.windows) {
    assert.equal(window.field.sampleCount, expectedFieldSamples);
    assert.equal(window.load.samples, expectedLoadSamples);
    assert.equal(window.field.meanRho.length, run.definition.nx * run.definition.ny);
  }
}

assert.equal(
  result.perturbations.pairs.length,
  CONTRACT.twoDimensionalPerturbations.casePairCount,
);
assert.equal(
  new Set(result.perturbations.pairs.map((entry) => entry.definition.id)).size,
  CONTRACT.twoDimensionalPerturbations.casePairCount,
);
for (const pair of result.perturbations.pairs) {
  const candidate = pair.definition.strategy
    === "incoming-characteristic-compatible-zou-he";
  for (const trace of [pair.test, pair.extendedReference]) {
    assertRunLedger(
      trace,
      CONTRACT.twoDimensionalPerturbations.domainPair.runSteps,
      trace.ny,
      candidate,
    );
    assert.equal(
      trace.meanTrace.length,
      CONTRACT.twoDimensionalPerturbations.domainPair.runSteps,
    );
  }
  if (pair.definition.family === "oblique-acoustic") {
    assert.equal(
      pair.obliqueTrace.length,
      CONTRACT.twoDimensionalPerturbations.domainPair.runSteps,
    );
    assert.notEqual(pair.metrics.oblique, null);
  } else if (pair.definition.family === "localized-pressure") {
    assert.equal(
      pair.localPressureTrace.length,
      CONTRACT.twoDimensionalPerturbations.domainPair.runSteps,
    );
    assert.notEqual(pair.metrics.localizedPressure, null);
  } else {
    assert.equal(
      pair.shearTrace.length,
      Math.floor(
        CONTRACT.twoDimensionalPerturbations.domainPair.runSteps
          / CONTRACT.operationalDefinitions.perturbations
            .shearDiagnosticStrideSteps,
      ),
    );
    assert.notEqual(pair.metrics.shear, null);
  }
}

assert.equal(
  result.inheritedA8nAnchors.requiredCases,
  CONTRACT.sourceIdentity.a8nEvidence.exactShortDomainCausalAnchors,
);
assert.equal(
  result.evidenceDecision.pass,
  Object.values(result.evidenceDecision.internalChecks).every(Boolean),
);
const candidateGatesPass = Object.values(
  result.candidateDecision.gates,
).every(Boolean);
assert.equal(
  result.candidateDecision.pass,
  result.evidenceDecision.pass && candidateGatesPass,
);
assert.equal(
  result.candidateDecision.code,
  result.candidateDecision.pass
    ? CONTRACT.decision.candidateReadyCode
    : CONTRACT.decision.candidateHoldCode,
);
assert.equal(
  result.evidenceDecision.code,
  result.evidenceDecision.pass
    ? CONTRACT.decision.evidenceCompleteCode
    : CONTRACT.decision.evidenceIncompleteCode,
);
assert.equal(result.evidenceDecision.formalSourceModified, false);
assert.equal(result.evidenceDecision.formalIntegrationUnlocked, false);
assert.equal(result.evidenceDecision.candidateAutomaticallyApproved, false);

if (repeatPath !== undefined) {
  const repeatRaw = await readFile(repeatPath);
  assert.equal(
    Buffer.compare(primaryRaw, repeatRaw),
    0,
    "independent A8O repeat must be byte-identical",
  );
}
console.log(JSON.stringify({
  primaryPath,
  storedSha256: hash(primaryRaw),
  canonicalSha256: hash(canonicalRaw),
  repeatByteIdentical: repeatPath === undefined ? null : true,
  inheritedA8nAnchors: result.inheritedA8nAnchors,
  causalGate: result.causal.gate,
  statisticalGate: result.statistics.gate,
  perturbationGate: result.perturbations.gate,
  evidenceDecision: result.evidenceDecision,
  candidateDecision: result.candidateDecision,
}, null, 2));
