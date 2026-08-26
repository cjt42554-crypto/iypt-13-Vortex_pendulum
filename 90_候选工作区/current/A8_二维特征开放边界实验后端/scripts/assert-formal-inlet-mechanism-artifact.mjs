import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { FORMAL_INLET_MECHANISM_CONTRACT as CONTRACT } from
  "../src/formal-inlet-mechanism-contract.ts";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-inlet-mechanism-matrix.json.gz",
);
const repeatPath = process.argv[3] === undefined ? undefined : resolve(process.argv[3]);
const a8jPath = resolve(
  process.argv[4]
    ?? "验证与复现/artifacts/a8-formal-mrt-no-body-ramp-matrix.json",
);
const a8kPath = resolve(
  process.argv[5]
    ?? "验证与复现/artifacts/a8-formal-mrt-boundary-factorization-matrix.json.gz",
);
const repositoryRoot = resolve(process.cwd(), "../../../");
const contractPath = resolve(
  repositoryRoot,
  "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-inlet-mechanism-contract.ts",
);
const formalSourcePath = resolve(
  repositoryRoot,
  CONTRACT.sourceIdentity.formalSource.relativePath,
);
const planningContractPath = resolve(
  repositoryRoot,
  CONTRACT.sourceIdentity.planningContract.relativePath,
);

function hash(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function finiteRecord(record, fields) {
  for (const field of fields) assert.ok(Number.isFinite(record[field]), field);
}

const primaryRaw = await readFile(primaryPath);
const canonicalRaw = primaryPath.endsWith(".gz") ? gunzipSync(primaryRaw) : primaryRaw;
const result = JSON.parse(canonicalRaw.toString("utf8"));
assert.equal(result.format, "VP-A8L-FORMAL-MRT-INLET-MECHANISM-MATRIX-v1");
assert.equal(result.contractIdentity?.format, CONTRACT.format);
assert.equal(result.contractIdentity?.contractSha256, hash(await readFile(contractPath)));
assert.equal(result.contractIdentity?.formalSourceSha256,
  hash(await readFile(formalSourcePath)));
assert.equal(result.contractIdentity?.planningContractSha256,
  hash(await readFile(planningContractPath)));
assert.equal(result.contractIdentity?.a8jArtifactSha256,
  hash(await readFile(a8jPath)));
const a8kStoredRaw = await readFile(a8kPath);
assert.equal(result.contractIdentity?.a8kStoredArtifactSha256, hash(a8kStoredRaw));
assert.equal(result.contractIdentity?.a8kCanonicalArtifactSha256,
  hash(gunzipSync(a8kStoredRaw)));

assert.equal(result.cases?.length, CONTRACT.matrix.runCount);
assert.equal(result.corners?.length, CONTRACT.matrix.cornerCount);
assert.equal(result.strategySummaries?.length, CONTRACT.matrix.strategyCount);
assert.equal(new Set(result.cases.map((entry) => entry.definition.id)).size,
  CONTRACT.matrix.runCount);
assert.equal(result.matrixComplete, true);
assert.ok(result.cases.every((entry) => entry.run.status === "completed"));
assert.ok(result.cases.every((entry) => entry.run.completedSteps
  === entry.definition.auditSteps));
assert.ok(result.cases.every((entry) => entry.run.stability
  .densityExtremum.brinkmanMaskIndicator === 0));
assert.ok(result.cases.every((entry) => entry.provenance.strategyId
  === entry.definition.strategy));
assert.ok(result.cases.every((entry) => entry.provenance.contractSha256
  === result.contractIdentity.contractSha256));
assert.ok(result.cases.every((entry) => entry.provenance.contractCommit
  === result.contractIdentity.contractCommit));
assert.ok(result.cases.every((entry) => entry.provenance.formalSourceSha256
  === result.contractIdentity.formalSourceSha256));
assert.ok(result.cases.every((entry) => entry.provenance.a8jArtifactSha256
  === result.contractIdentity.a8jArtifactSha256));
assert.ok(result.cases.every((entry) => entry.provenance.a8kStoredArtifactSha256
  === result.contractIdentity.a8kStoredArtifactSha256));
assert.ok(result.cases.every((entry) => entry.provenance.a8kCanonicalArtifactSha256
  === result.contractIdentity.a8kCanonicalArtifactSha256));

for (const strategy of CONTRACT.strategies) {
  const selected = result.cases.filter((entry) =>
    entry.definition.strategy === strategy.id);
  assert.equal(selected.length, CONTRACT.matrix.cornerCount);
}
for (const entry of result.cases) {
  const diagnostics = entry.run.diagnostics;
  assert.ok(diagnostics);
  finiteRecord(diagnostics.boundaryMoments.density,
    ["absoluteResidual", "step", "y", "actual", "target"]);
  finiteRecord(diagnostics.boundaryMoments.ux,
    ["absoluteResidual", "step", "y", "actual", "target"]);
  finiteRecord(diagnostics.boundaryMoments.uy,
    ["absoluteResidual", "step", "y", "actual", "target"]);
  finiteRecord(diagnostics.mass, [
    "initialTotalMass",
    "finalTotalMass",
    "minimumTotalMass",
    "maximumTotalMass",
    "cumulativeBoundaryNetMassInput",
    "totalMassChange",
    "massChangeMinusCumulativeBoundaryNetInput",
  ]);
  assert.equal(diagnostics.populations.nonFiniteStateDetected, false);
  assert.equal(diagnostics.populations.nonFinitePopulationObservationCount, 0);
  assert.ok(Number.isInteger(
    diagnostics.populations.negativePopulationObservationCount,
  ));
  assert.ok(Number.isFinite(diagnostics.populations.minimumPopulation));
}

assert.equal(result.anchorComparison?.a8j.checkedCases,
  CONTRACT.inheritedEvidence.a8j.anchorCases);
assert.equal(result.anchorComparison?.a8j.exactMatches,
  CONTRACT.inheritedEvidence.a8j.anchorCases);
assert.deepEqual(result.anchorComparison?.a8j.mismatchCaseIds, []);
assert.equal(result.anchorComparison?.a8k.checkedCases,
  CONTRACT.inheritedEvidence.a8k.anchorCases);
assert.equal(result.anchorComparison?.a8k.exactMatches,
  CONTRACT.inheritedEvidence.a8k.anchorCases);
assert.deepEqual(result.anchorComparison?.a8k.mismatchCaseIds, []);
assert.equal(result.decision?.internalChecks.matrixComplete, true);
assert.equal(result.decision?.internalChecks.a8jAnchorExact, true);
assert.equal(result.decision?.internalChecks.a8kAnchorExact, true);
assert.equal(result.decision?.formalSourceModified, false);
assert.equal(result.decision?.formalIntegrationUnlocked, false);
assert.equal(result.decision?.algorithmSelectionDelegatedToProReview, true);
assert.equal(result.decision?.stopAfterEvidenceAndHandoff, true);
if (result.decision?.pass) {
  assert.equal(result.decision.code, CONTRACT.decision.completedResolvedCode);
  assert.equal(result.causalAnalysis?.resolvedPattern, true);
} else {
  assert.equal(result.decision.code, CONTRACT.decision.unresolvedCode);
  assert.equal(result.causalAnalysis?.resolvedPattern, false);
}

if (repeatPath !== undefined) {
  assert.equal(Buffer.compare(primaryRaw, await readFile(repeatPath)), 0,
    "independent A8L repeat is not byte-identical");
}
console.log(
  `FORMAL INLET MECHANISM ARTIFACT ASSERT PASS: ${primaryPath}; canonicalSha256=${hash(canonicalRaw)}; storedSha256=${hash(primaryRaw)}; A8J=9/9 exact; A8K=9/9 exact; decision=${result.decision.code}; repeat=${repeatPath === undefined ? "not checked" : "byte-identical"}`,
);
