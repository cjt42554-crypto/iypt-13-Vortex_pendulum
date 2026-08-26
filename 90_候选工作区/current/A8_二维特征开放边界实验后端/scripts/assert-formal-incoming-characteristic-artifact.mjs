import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { FORMAL_INCOMING_CHARACTERISTIC_CONTRACT as CONTRACT } from
  "../src/formal-incoming-characteristic-contract.ts";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-incoming-characteristic-qualification.json.gz",
);
const repeatPath = process.argv[3] === undefined ? undefined : resolve(process.argv[3]);
const a8mPath = resolve(
  process.argv[4]
    ?? "验证与复现/artifacts/a8-formal-mrt-inlet-qualification.json.gz",
);
const repositoryRoot = resolve(process.cwd(), "../../../");
const candidateRoot =
  "90_候选工作区/current/A8_二维特征开放边界实验后端";
const contractRepositoryPath =
  `${candidateRoot}/src/formal-incoming-characteristic-contract.ts`;
const contractDocumentRepositoryPath =
  `${candidateRoot}/08_A8N_入射特征相容入口预注册合同.md`;
const implementationRepositoryPaths = [
  `${candidateRoot}/src/formal-incoming-characteristic-boundary.ts`,
  `${candidateRoot}/src/formal-incoming-characteristic-reconstruction.ts`,
  `${candidateRoot}/src/formal-incoming-characteristic-types.ts`,
  `${candidateRoot}/src/formal-incoming-characteristic-case.ts`,
  `${candidateRoot}/src/formal-incoming-characteristic-acoustics.ts`,
  `${candidateRoot}/src/formal-incoming-characteristic.ts`,
  `${candidateRoot}/scripts/run-formal-incoming-characteristic.mjs`,
  `${candidateRoot}/scripts/assert-formal-incoming-characteristic-artifact.mjs`,
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

async function implementationTreeSha256() {
  const digest = createHash("sha256");
  for (const path of implementationRepositoryPaths) {
    digest.update(path);
    digest.update("\0");
    digest.update(await readFile(resolve(repositoryRoot, path)));
    digest.update("\0");
  }
  return digest.digest("hex");
}

function finite(record, fields) {
  for (const field of fields) assert.ok(Number.isFinite(record[field]), field);
}

function assertDirectionArray(values, label) {
  assert.equal(values.length, 9, label);
  assert.ok(values.every(Number.isFinite), label);
}

function assertMassRecord(record) {
  finite(record, [
    "step",
    "preCollisionTotalMass",
    "postCollisionTotalMass",
    "collisionMassResidual",
    "leftStreamingOutTotal",
    "rightStreamingOutTotal",
    "postStreamRetainedMass",
    "formalLeftWritebackTotal",
    "formalRightWritebackTotal",
    "postFormalBoundaryMass",
    "formalShadowMaximumPopulationAbsoluteDifference",
    "formalShadowMismatchCount",
    "adapterIncoming",
    "adapterOutgoing",
    "adapterStationaryCross",
    "adapterTotal",
    "postCandidateAdapterTotalMass",
    "actualMassChange",
    "budgetMassChange",
    "stepClosureResidual",
    "absoluteMassExchange",
    "normalizedStepClosureResidual",
    "cumulativeClosureResidual",
    "cumulativeAbsoluteMassExchange",
    "normalizedCumulativeClosureResidual",
  ]);
  assert.ok(["prerun", "audit", "acoustic"].includes(record.phase));
  assertDirectionArray(record.leftStreamingOutByDirection, "left out directions");
  assertDirectionArray(record.rightStreamingOutByDirection, "right out directions");
  assertDirectionArray(record.formalLeftWritebackByDirection, "left write directions");
  assertDirectionArray(record.formalRightWritebackByDirection, "right write directions");
  assertDirectionArray(record.adapterByDirection, "adapter directions");
  assertDirectionArray(record.adapterAbsoluteByDirection, "absolute adapter directions");
  assert.equal(record.formalShadowMaximumPopulationAbsoluteDifference, 0);
  assert.equal(record.formalShadowMismatchCount, 0);
  assert.equal(
    record.stepClosureResidual,
    record.actualMassChange - record.budgetMassChange,
  );
  assert.ok(
    record.normalizedStepClosureResidual
      <= CONTRACT.exactPopulationMassBudget.gates.maximumNormalizedStepClosureResidual,
  );
  assert.ok(
    record.normalizedCumulativeClosureResidual
      <= CONTRACT.exactPopulationMassBudget.gates
        .maximumNormalizedCumulativeClosureResidual,
  );
}

function assertMassSummary(summary, expectedSteps) {
  finite(summary, [
    "stepRecordCount",
    "initialTotalMass",
    "finalTotalMass",
    "cumulativeAdapterMass",
    "cumulativeAdapterAbsoluteTotal",
    "maximumNormalizedStepClosureResidual",
    "maximumNormalizedCumulativeClosureResidual",
    "maximumFormalShadowPopulationAbsoluteDifference",
    "formalShadowMismatchCount",
  ]);
  assert.equal(summary.stepRecordCount, expectedSteps);
  assertDirectionArray(summary.cumulativeAdapterByDirection, "summary adapter directions");
  assertDirectionArray(
    summary.cumulativeAdapterAbsoluteByDirection,
    "summary absolute adapter directions",
  );
  assert.equal(summary.maximumFormalShadowPopulationAbsoluteDifference, 0);
  assert.equal(summary.formalShadowMismatchCount, 0);
  assert.equal(summary.gates.formalShadowExact, true);
  assert.equal(summary.gates.stepClosurePass, true);
  assert.equal(summary.gates.cumulativeClosurePass, true);
}

function assertReconstructionRecord(record, expectedRows) {
  finite(record, ["step", "farFieldUx", "rowCount"]);
  assert.equal(record.rowCount, expectedRows);
  for (const field of [
    "knownMomentK",
    "discriminant",
    "targetRho",
    "targetUx",
    "targetUy",
    "actualRho",
    "actualUx",
    "actualUy",
    "incomingCharacteristicResidual",
    "discreteCompatibilityResidual",
    "densityMomentResidual",
    "uxMomentResidual",
    "uyMomentResidual",
    "knownPopulationMaximumAbsoluteDifference",
    "boundaryMach",
  ]) {
    assert.equal(record[field].length, expectedRows, field);
    assert.ok(record[field].every(Number.isFinite), field);
  }
}

function assertReconstructionSummary(summary, applicable, expectedSteps, expectedRows) {
  assert.equal(summary.applicable, applicable);
  assert.equal(summary.gates.pass, true);
  assert.equal(summary.gates.nonIncomingModificationPass, true);
  assert.equal(summary.cumulativeNonIncomingAbsoluteModification, 0);
  if (applicable) {
    assert.equal(summary.stepRecordCount, expectedSteps);
    assert.equal(summary.rowRecordCount, expectedSteps * expectedRows);
    assert.equal(summary.gates.complete, true);
    assert.equal(summary.gates.finite, true);
    assert.equal(summary.gates.knownPopulationPass, true);
  } else {
    assert.equal(summary.stepRecordCount, 0);
    assert.equal(summary.rowRecordCount, 0);
  }
}

const primaryRaw = await readFile(primaryPath);
const canonicalRaw = primaryPath.endsWith(".gz") ? gunzipSync(primaryRaw) : primaryRaw;
const result = JSON.parse(canonicalRaw.toString("utf8"));
assert.equal(result.format, "VP-A8N-INCOMING-CHARACTERISTIC-QUALIFICATION-v1");
assert.equal(result.contractIdentity?.format, CONTRACT.format);

const contractPath = resolve(repositoryRoot, contractRepositoryPath);
const contractDocumentPath = resolve(repositoryRoot, contractDocumentRepositoryPath);
const contractRaw = await readFile(contractPath);
const contractDocumentRaw = await readFile(contractDocumentPath);
const contractCommit = git([
  "log",
  "-1",
  "--format=%H",
  "--",
  contractRepositoryPath,
]).trim();
const documentCommit = git([
  "log",
  "-1",
  "--format=%H",
  "--",
  contractDocumentRepositoryPath,
]).trim();
assert.equal(contractCommit, documentCommit);
assert.equal(result.contractIdentity.contractCommit, contractCommit);
assert.equal(result.contractIdentity.contractSha256, hash(contractRaw));
assert.equal(result.contractIdentity.contractDocumentSha256, hash(contractDocumentRaw));
const implementationCommits = new Set(implementationRepositoryPaths.map((path) =>
  git(["log", "-1", "--format=%H", "--", path]).trim()));
assert.equal(implementationCommits.size, 1);
const implementationCommit = [...implementationCommits][0];
assert.equal(result.contractIdentity.implementationCommit, implementationCommit);
assert.equal(
  result.contractIdentity.implementationTreeSha256,
  await implementationTreeSha256(),
);

const formalSourcePath = resolve(
  repositoryRoot,
  CONTRACT.sourceIdentity.formalSource.relativePath,
);
const proDecisionPath = resolve(
  repositoryRoot,
  CONTRACT.sourceIdentity.proDecision.relativePath,
);
const shadowLedgerPath = resolve(
  repositoryRoot,
  CONTRACT.sourceIdentity.reusedShadowLedger.relativePath,
);
assert.equal(
  result.contractIdentity.formalSourceSha256,
  hash(await readFile(formalSourcePath)),
);
assert.equal(
  result.contractIdentity.proDecisionSha256,
  hash(await readFile(proDecisionPath)),
);
assert.equal(
  result.contractIdentity.shadowLedgerSourceSha256,
  hash(await readFile(shadowLedgerPath)),
);
const a8mStoredRaw = await readFile(a8mPath);
assert.equal(result.contractIdentity.a8mStoredArtifactSha256, hash(a8mStoredRaw));
assert.equal(
  result.contractIdentity.a8mCanonicalArtifactSha256,
  hash(gunzipSync(a8mStoredRaw)),
);

assert.equal(result.startupCases.length, CONTRACT.startupMatrix.runCount);
assert.equal(result.acousticCases.length, CONTRACT.acousticReflection.caseCount);
assert.equal(
  result.interiorComparisons.length,
  CONTRACT.startupMatrix.cornerCount * CONTRACT.startupMatrix.protocolCount,
);
assert.equal(new Set(result.startupCases.map((entry) => entry.definition.id)).size,
  CONTRACT.startupMatrix.runCount);
assert.equal(new Set(result.acousticCases.map((entry) => entry.definition.id)).size,
  CONTRACT.acousticReflection.caseCount);

for (const entry of result.startupCases) {
  assert.equal(entry.run.status, "completed");
  const expectedSteps = entry.definition.preRunSteps + entry.definition.auditSteps;
  assert.equal(entry.run.massStepRecords.length, expectedSteps);
  assertMassSummary(entry.run.massSummary, expectedSteps);
  for (const record of entry.run.massStepRecords) assertMassRecord(record);
  const candidate = entry.definition.strategy
    === "incoming-characteristic-compatible-zou-he";
  assert.equal(entry.run.reconstructionStepRecords.length, candidate ? expectedSteps : 0);
  for (const record of entry.run.reconstructionStepRecords) {
    assertReconstructionRecord(record, entry.definition.ny);
  }
  assertReconstructionSummary(
    entry.run.reconstructionSummary,
    candidate,
    expectedSteps,
    entry.definition.ny,
  );
  assert.equal(entry.gate.executionPass, true);
}

for (const entry of result.acousticCases) {
  const candidate = entry.definition.strategy
    === "incoming-characteristic-compatible-zou-he";
  for (const trace of [entry.test, entry.extendedReference]) {
    const expectedSteps = CONTRACT.acousticReflection.domainPair.runSteps;
    assert.equal(trace.completedSteps, expectedSteps);
    assert.equal(trace.failure, undefined);
    assert.equal(trace.probeDensity.length, expectedSteps);
    assert.equal(trace.probeUx.length, expectedSteps);
    assert.equal(trace.massStepRecords.length, expectedSteps);
    assertMassSummary(trace.massSummary, expectedSteps);
    for (const record of trace.massStepRecords) assertMassRecord(record);
    assert.equal(trace.reconstructionStepRecords.length, candidate ? expectedSteps : 0);
    for (const record of trace.reconstructionStepRecords) {
      assertReconstructionRecord(record, CONTRACT.acousticReflection.domainPair.ny);
    }
    assertReconstructionSummary(
      trace.reconstructionSummary,
      candidate,
      expectedSteps,
      CONTRACT.acousticReflection.domainPair.ny,
    );
  }
  finite(entry.metrics, [
    "incidentCharacteristicAmplitude",
    "incidentDensityAmplitude",
    "incidentVelocityAmplitude",
    "incidentAmplitudeOverInitializationPeak",
    "characteristicAmplitudeReflectionRatio",
    "densityAmplitudeReflectionRatio",
    "velocityAmplitudeReflectionRatio",
    "acousticEnergyReflectionRatio",
    "phaseLagSteps",
    "phaseErrorRadians",
    "maximumMeanDensityDrift",
    "maximumMeanStreamwiseVelocityDrift",
    "incidentWindowTestReferenceRelativeRmsMismatch",
  ]);
}

assert.equal(
  result.legacyAnchorComparison.startup.checkedCases,
  CONTRACT.sourceIdentity.a8mEvidence.exactLegacyStartupAnchors,
);
assert.equal(
  result.legacyAnchorComparison.startup.exactMatches,
  CONTRACT.sourceIdentity.a8mEvidence.exactLegacyStartupAnchors,
);
assert.deepEqual(result.legacyAnchorComparison.startup.mismatchCaseIds, []);
assert.equal(
  result.legacyAnchorComparison.acoustic.checkedCases,
  CONTRACT.sourceIdentity.a8mEvidence.exactLegacyAcousticAnchors,
);
assert.equal(
  result.legacyAnchorComparison.acoustic.exactMatches,
  CONTRACT.sourceIdentity.a8mEvidence.exactLegacyAcousticAnchors,
);
assert.deepEqual(result.legacyAnchorComparison.acoustic.mismatchCaseIds, []);

const candidateStartup = result.startupCases.filter((entry) =>
  entry.definition.strategy === "incoming-characteristic-compatible-zou-he");
const candidateAcoustic = result.acousticCases.filter((entry) =>
  entry.definition.strategy === "incoming-characteristic-compatible-zou-he");
assert.equal(
  result.qualification.candidate.startupEligible,
  candidateStartup.every((entry) => entry.gate.pass),
);
assert.equal(
  result.qualification.candidate.acousticEligible,
  candidateAcoustic.every((entry) => entry.gate.pass),
);
assert.equal(
  result.qualification.candidate.readyForProSelection,
  result.qualification.candidate.massEligible
    && result.qualification.candidate.acousticEligible
    && result.qualification.candidate.startupEligible
    && result.qualification.candidate.interiorEligible,
);
assert.equal(
  result.candidateDecision.pass,
  result.qualification.candidate.readyForProSelection,
);
assert.equal(
  result.candidateDecision.code,
  result.candidateDecision.pass
    ? CONTRACT.decision.candidateQualifiedCode
    : CONTRACT.decision.candidateRejectedCode,
);
assert.equal(result.evidenceDecision.formalSourceModified, false);
assert.equal(result.evidenceDecision.formalIntegrationUnlocked, false);
assert.equal(result.evidenceDecision.candidateAutomaticallyApproved, false);

if (repeatPath !== undefined) {
  const repeatRaw = await readFile(repeatPath);
  assert.equal(
    Buffer.compare(primaryRaw, repeatRaw),
    0,
    "independent A8N repeat must be byte-identical",
  );
}
console.log(JSON.stringify({
  primaryPath,
  storedSha256: hash(primaryRaw),
  canonicalSha256: hash(canonicalRaw),
  repeatByteIdentical: repeatPath === undefined ? null : true,
  legacyAnchorComparison: result.legacyAnchorComparison,
  qualification: result.qualification,
  evidenceDecision: result.evidenceDecision,
  candidateDecision: result.candidateDecision,
}, null, 2));
