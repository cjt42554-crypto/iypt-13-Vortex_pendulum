import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { FORMAL_INLET_QUALIFICATION_CONTRACT as CONTRACT } from
  "../src/formal-inlet-qualification-contract.ts";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-inlet-qualification.json.gz",
);
const repeatPath = process.argv[3] === undefined ? undefined : resolve(process.argv[3]);
const a8lPath = resolve(
  process.argv[4]
    ?? "验证与复现/artifacts/a8-formal-mrt-inlet-mechanism-matrix.json.gz",
);
const a8hPath = resolve(
  process.argv[5]
    ?? "验证与复现/artifacts/a8-formal-mrt-brinkman-startup-matrix.json",
);
const repositoryRoot = resolve(process.cwd(), "../../../");
const contractRepositoryPath =
  "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-inlet-qualification-contract.ts";
const contractDocumentRepositoryPath =
  "90_候选工作区/current/A8_二维特征开放边界实验后端/05_A8M_入口质量反射与启动资格预注册合同.md";
const contractPath = resolve(repositoryRoot, contractRepositoryPath);
const contractDocumentPath = resolve(repositoryRoot, contractDocumentRepositoryPath);
const formalSourcePath = resolve(
  repositoryRoot,
  CONTRACT.sourceIdentity.formalSource.relativePath,
);
const proDecisionPath = resolve(
  repositoryRoot,
  CONTRACT.sourceIdentity.proDecision.relativePath,
);
const adapterSourcePath = resolve(
  repositoryRoot,
  CONTRACT.sourceIdentity.a8lAdapterSource.relativePath,
);

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
  assert.equal(
    record.normalizedStepClosureResidual,
    Math.abs(record.stepClosureResidual) / Math.max(1, record.absoluteMassExchange),
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
    "cumulativeCollisionMassResidual",
    "cumulativeLeftStreamingOut",
    "cumulativeRightStreamingOut",
    "cumulativeFormalLeftWriteback",
    "cumulativeFormalRightWriteback",
    "cumulativeAdapterMass",
    "cumulativeAdapterIncoming",
    "cumulativeAdapterOutgoing",
    "cumulativeAdapterStationaryCross",
    "cumulativeAdapterAbsoluteTotal",
    "cumulativeClosureResidual",
    "cumulativeAbsoluteMassExchange",
    "maximumNormalizedStepClosureResidual",
    "maximumNormalizedCumulativeClosureResidual",
    "maximumFormalShadowPopulationAbsoluteDifference",
    "formalShadowMismatchCount",
    "adapterMassOverInitialMass",
    "adapterMassOverAbsoluteFormalBoundaryExchange",
    "nonIncomingAbsoluteModificationFraction",
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

const primaryRaw = await readFile(primaryPath);
const canonicalRaw = primaryPath.endsWith(".gz") ? gunzipSync(primaryRaw) : primaryRaw;
const result = JSON.parse(canonicalRaw.toString("utf8"));
assert.equal(result.format, "VP-A8M-FORMAL-MRT-INLET-QUALIFICATION-v1");
assert.equal(result.contractIdentity?.format, CONTRACT.format);

const contractRaw = await readFile(contractPath);
const contractDocumentRaw = await readFile(contractDocumentPath);
const contractCommit = git([
  "log",
  "-1",
  "--format=%H",
  "--",
  contractRepositoryPath,
]).trim();
const contractDocumentCommit = git([
  "log",
  "-1",
  "--format=%H",
  "--",
  contractDocumentRepositoryPath,
]).trim();
assert.equal(contractCommit, contractDocumentCommit);
assert.equal(result.contractIdentity.contractCommit, contractCommit);
assert.equal(result.contractIdentity.contractSha256, hash(contractRaw));
assert.equal(
  result.contractIdentity.formalSourceSha256,
  hash(await readFile(formalSourcePath)),
);
assert.equal(
  result.contractIdentity.formalSourceSha256,
  CONTRACT.sourceIdentity.formalSource.sha256,
);
assert.equal(
  result.contractIdentity.proDecisionSha256,
  hash(await readFile(proDecisionPath)),
);
assert.equal(
  result.contractIdentity.a8lAdapterSourceSha256,
  hash(await readFile(adapterSourcePath)),
);
const a8lStoredRaw = await readFile(a8lPath);
assert.equal(result.contractIdentity.a8lStoredArtifactSha256, hash(a8lStoredRaw));
assert.equal(
  result.contractIdentity.a8lCanonicalArtifactSha256,
  hash(gunzipSync(a8lStoredRaw)),
);
const a8hRaw = await readFile(a8hPath);
assert.equal(result.contractIdentity.a8hArtifactSha256, hash(a8hRaw));
assert.ok(contractDocumentRaw.length > 0);

assert.equal(result.startupCases?.length, CONTRACT.startupMatrix.runCount);
assert.equal(result.interiorComparisons?.length, CONTRACT.startupMatrix.cornerCount
  * CONTRACT.startupMatrix.protocolCount);
assert.equal(result.acousticCases?.length, CONTRACT.acousticReflection.caseCount);
assert.equal(
  new Set(result.startupCases.map((entry) => entry.definition.id)).size,
  CONTRACT.startupMatrix.runCount,
);
assert.equal(
  new Set(result.acousticCases.map((entry) => entry.definition.id)).size,
  CONTRACT.acousticReflection.caseCount,
);

for (const strategy of CONTRACT.startupMatrix.strategies) {
  assert.equal(
    result.startupCases.filter((entry) =>
      entry.definition.strategy === strategy.id).length,
    CONTRACT.startupMatrix.cornerCount * CONTRACT.startupMatrix.protocolCount,
  );
  assert.equal(
    result.acousticCases.filter((entry) =>
      entry.definition.strategy === strategy.id).length,
    CONTRACT.acousticReflection.relaxationTime.length,
  );
}

for (const entry of result.startupCases) {
  assert.equal(entry.run.status, "completed");
  assert.equal(entry.run.completedPreRunSteps, entry.definition.preRunSteps);
  assert.equal(entry.run.completedAuditSteps, entry.definition.auditSteps);
  const expectedSteps = entry.definition.preRunSteps + entry.definition.auditSteps;
  assert.equal(entry.run.massStepRecords.length, expectedSteps);
  assert.equal(entry.run.massSummary.stepRecordCount, expectedSteps);
  for (const record of entry.run.massStepRecords) assertMassRecord(record);
  assertMassSummary(entry.run.massSummary, expectedSteps);
  assert.equal(entry.gate.executionPass, true);
  assert.equal(
    entry.gate.densityPass,
    entry.run.auditStability.maximumDensityDeviation
      <= CONTRACT.startupMatrix.gates.maximumDensityDeviation,
  );
  assert.equal(
    entry.gate.machPass,
    entry.run.auditStability.maximumMach
      <= CONTRACT.startupMatrix.gates.maximumMach,
  );
  assert.equal(entry.provenance.contractCommit, result.contractIdentity.contractCommit);
  assert.equal(entry.provenance.contractSha256, result.contractIdentity.contractSha256);
}

for (const entry of result.interiorComparisons) {
  finite(entry, [
    "nominalDiameterCells",
    "relaxationTime",
    "comparedCells",
    "densityRmsDifference",
    "velocityRmsDifference",
    "velocityRmsDifferenceOverInletVelocity",
  ]);
  assert.ok(entry.comparedCells > 0);
  assert.equal(
    entry.densityEquivalent,
    entry.densityRmsDifference
      <= CONTRACT.startupMatrix.gates.maximumS1S2InteriorDensityRmsDifference,
  );
  assert.equal(
    entry.velocityEquivalent,
    entry.velocityRmsDifferenceOverInletVelocity
      <= CONTRACT.startupMatrix.gates
        .maximumS1S2InteriorVelocityRmsDifferenceOverInletVelocity,
  );
}

for (const entry of result.acousticCases) {
  for (const trace of [entry.test, entry.extendedReference]) {
    assert.equal(trace.completedSteps, CONTRACT.acousticReflection.domainPair.runSteps);
    assert.equal(trace.failure, undefined);
    assert.equal(trace.probeDensity.length, trace.completedSteps);
    assert.equal(trace.probeUx.length, trace.completedSteps);
    assert.equal(trace.domainMeanDensity.length, trace.completedSteps);
    assert.equal(trace.domainMeanUx.length, trace.completedSteps);
    assert.equal(trace.massStepRecords.length, trace.completedSteps);
    for (const record of trace.massStepRecords) assertMassRecord(record);
    assertMassSummary(trace.massSummary, trace.completedSteps);
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
  const gates = CONTRACT.acousticReflection.gates;
  assert.equal(
    entry.gate.characteristicReflectionPass,
    entry.metrics.characteristicAmplitudeReflectionRatio
      <= gates.maximumCharacteristicAmplitudeReflectionRatio,
  );
  assert.equal(
    entry.gate.densityReflectionPass,
    entry.metrics.densityAmplitudeReflectionRatio
      <= gates.maximumDensityAmplitudeReflectionRatio,
  );
  assert.equal(
    entry.gate.velocityReflectionPass,
    entry.metrics.velocityAmplitudeReflectionRatio
      <= gates.maximumVelocityAmplitudeReflectionRatio,
  );
  assert.equal(
    entry.gate.energyReflectionPass,
    entry.metrics.acousticEnergyReflectionRatio
      <= gates.maximumAcousticEnergyReflectionRatio,
  );
  assert.equal(
    entry.gate.phasePass,
    !entry.metrics.phaseDetectable
      || entry.metrics.phaseErrorRadians
        <= gates.maximumPhaseErrorRadiansWhenDetectable,
  );
}

assert.equal(
  result.anchorComparison?.a8l.checkedCases,
  CONTRACT.inheritedEvidence.a8l.exactAnchorCases,
);
assert.equal(
  result.anchorComparison?.a8l.exactMatches,
  CONTRACT.inheritedEvidence.a8l.exactAnchorCases,
);
assert.deepEqual(result.anchorComparison?.a8l.mismatchCaseIds, []);
assert.equal(
  result.anchorComparison?.a8h.checkedCases,
  CONTRACT.inheritedEvidence.a8h.exactAnchorCases,
);
assert.equal(
  result.anchorComparison?.a8h.exactMatches,
  CONTRACT.inheritedEvidence.a8h.exactAnchorCases,
);
assert.deepEqual(result.anchorComparison?.a8h.mismatchCaseIds, []);
assert.equal(result.evidenceDecision?.pass, true);
assert.equal(result.evidenceDecision?.code, CONTRACT.decision.evidenceCompleteCode);
assert.deepEqual(result.evidenceDecision?.internalChecks, {
  startupMatrixComplete: true,
  acousticMatrixComplete: true,
  allFormalShadowsExact: true,
  allMassLedgersClose: true,
  a8lAnchorsExact: true,
  a8hAnchorsExact: true,
});
assert.equal(result.evidenceDecision?.formalSourceModified, false);
assert.equal(result.evidenceDecision?.formalIntegrationUnlocked, false);
assert.equal(result.evidenceDecision?.s2AutomaticallyApproved, false);
assert.equal(result.evidenceDecision?.stopAfterEvidenceAndHandoff, true);
assert.equal(
  result.qualification.s2ReadyForProSelection,
  result.qualification.s2MassEligible
    && result.qualification.s2AcousticEligible
    && result.qualification.s2StartupEligible,
);

if (repeatPath !== undefined) {
  assert.equal(
    Buffer.compare(primaryRaw, await readFile(repeatPath)),
    0,
    "independent A8M repeat is not byte-identical",
  );
}
console.log(
  `FORMAL INLET QUALIFICATION ARTIFACT ASSERT PASS: ${primaryPath}; canonicalSha256=${hash(canonicalRaw)}; storedSha256=${hash(primaryRaw)}; contractCommit=${contractCommit}; contractDocumentSha256=${hash(contractDocumentRaw)}; A8L=${CONTRACT.inheritedEvidence.a8l.exactAnchorCases}/${CONTRACT.inheritedEvidence.a8l.exactAnchorCases} exact; A8H=${CONTRACT.inheritedEvidence.a8h.exactAnchorCases}/${CONTRACT.inheritedEvidence.a8h.exactAnchorCases} exact; repeat=${repeatPath === undefined ? "not checked" : "byte-identical"}`,
);
