import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { FORMAL_DISCRETE_REFERENCE_CONTRACT as CONTRACT } from
  "../src/formal-discrete-reference-contract.ts";
import {
  digestNumberArrays,
  scheduledPopulationAuditCount,
  summarizePopulationAudits,
} from "../src/formal-discrete-reference-support.ts";
import {
  filesAreByteIdentical,
  sha256CanonicalJson,
  sha256File,
  streamSelectedJsonValues,
} from "./formal-causal-reference-artifact-stream.mjs";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-discrete-reference-maturity-qualification.json.gz",
);
const repeatPath = process.argv[3] === undefined
  ? undefined
  : resolve(process.argv[3]);
const sidecarPath = primaryPath.replace(/\.json\.gz$/, ".sha256");
const repositoryRoot = resolve(process.cwd(), "../../../");
const candidateRoot =
  "90_候选工作区/current/A8_二维特征开放边界实验后端";
const contractRepositoryPath =
  candidateRoot + "/src/formal-discrete-reference-contract.ts";
const contractDocumentRepositoryPath =
  candidateRoot + "/14_A8P_离散因果参考与反对称成熟性预注册合同.md";
const contractTestRepositoryPath =
  candidateRoot + "/tests/formal-discrete-reference-contract.test.ts";
const scientificImplementationRepositoryPaths = [
  candidateRoot + "/src/formal-discrete-reference-support.ts",
  candidateRoot + "/src/formal-discrete-reference-runs.ts",
  candidateRoot + "/src/formal-discrete-reference.ts",
].sort();
const implementationRepositoryPaths = [
  ...scientificImplementationRepositoryPaths,
  candidateRoot + "/scripts/run-formal-discrete-reference.mjs",
  candidateRoot + "/scripts/assert-formal-discrete-reference-artifact.mjs",
  candidateRoot + "/tests/formal-discrete-reference-support.test.ts",
  candidateRoot + "/.gitattributes",
  candidateRoot + "/package.json",
].sort();
const frozenRuntimeDependencyPaths = [
  candidateRoot + "/scripts/formal-causal-reference-artifact-stream.mjs",
].sort();
const implementationTreePaths = [
  ...implementationRepositoryPaths,
  ...frozenRuntimeDependencyPaths,
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

function lastCommit(path) {
  return git(["log", "-1", "--format=%H", "--", path]).trim();
}

function implementationTreeSha256AtCommit(commit) {
  const digest = createHash("sha256");
  for (const path of implementationTreePaths) {
    digest.update(path);
    digest.update("\0");
    digest.update(git(["show", commit + ":" + path], null));
    digest.update("\0");
  }
  return digest.digest("hex");
}

function assertFiniteTree(value, path = "record") {
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

function assertPopulationRecord(record) {
  assert.equal(record.populationCount > 0, true);
  assert.equal(record.adapterByDirection.length, 9);
  assert.equal(record.adapterAbsoluteByDirection.length, 9);
  for (const methodName of ["ordered", "pairwise", "neumaier"]) {
    const method = record[methodName];
    assert.equal(
      method.actualMassChange,
      method.candidatePost.value - method.pre.value,
    );
    assert.equal(
      method.budgetMassChange,
      method.formalPost.value - method.pre.value + method.adapter.value,
    );
    assert.equal(
      method.closureResidual,
      method.actualMassChange - method.budgetMassChange,
    );
    assert.equal(
      method.closureWithinScaledBound,
      Math.abs(method.closureResidual) <= method.combinedErrorBound,
    );
  }
  const nonIncoming = [0, 2, 3, 4, 6, 7];
  const nonIncomingAbsoluteModification = nonIncoming.reduce(
    (sum, direction) =>
      sum + (record.adapterAbsoluteByDirection[direction] ?? Number.NaN),
    0,
  );
  assert.equal(
    record.nonIncomingAbsoluteModification,
    nonIncomingAbsoluteModification,
  );
}

function assertPopulationLedger(run) {
  const expected = scheduledPopulationAuditCount(
    run.definition.runSteps,
    run.definition.sampleStride,
  );
  assert.equal(run.populationAuditRecords.length, expected);
  run.populationAuditRecords.forEach(assertPopulationRecord);
  const derived = summarizePopulationAudits(
    run.populationAuditRecords,
    run.definition.runSteps,
    run.definition.sampleStride,
  );
  assert.deepEqual(run.populationAuditSummary, derived);
  assert.equal(
    run.internalLedgerGatePass,
    run.populationAuditSummary.gates.pass,
  );
}

function assertDiscreteRun(run) {
  assertPopulationLedger(run);
  assert.equal(
    run.sampleIdentities.length,
    run.definition.runSteps / run.definition.sampleStride,
  );
  for (const sample of run.sampleIdentities) {
    assert.equal(sample.step < sample.leftGraphDistance, true);
    assert.equal(sample.step < sample.rightGraphDistance, true);
    assert.equal(sample.step < sample.transverseSeamGraphDistance, true);
    assert.equal(sample.strictConePass, true);
    assert.equal(sample.comparedCellCount > 0, true);
    assert.match(sample.fieldDigestFnv1a32, /^[0-9a-f]{8}$/);
  }
  const executionPass = run.status === "completed"
    && run.completedSteps === run.definition.runSteps
    && run.failure === undefined;
  assert.equal(run.gate.executionPass, executionPass);
  assert.equal(run.gate.sampleCountPass, true);
  assert.equal(run.gate.strictConePass, true);
  assert.equal(run.gate.internalLedgerPass, run.internalLedgerGatePass);
  assert.equal(
    run.gate.pass,
    run.trajectoryCompleteAndFinite
      && run.gate.densityPass
      && run.gate.machPass
      && run.gate.sampleCountPass
      && run.gate.strictConePass
      && run.gate.internalLedgerPass,
  );
}

function assertMaturityRun(run) {
  assertPopulationLedger(run);
  assert.equal(run.windows.length, 3);
  assert.deepEqual(
    run.windows.map((window) => window.tierConvectiveTime),
    [...CONTRACT.maturity.durationTiersConvective],
  );
  for (const window of run.windows) {
    assert.equal(window.field.sampleCount, window.expectedFieldSamples);
    assert.equal(window.load.sampleCount, window.expectedLoadSamples);
    assert.equal(window.field.meanRho.length, window.field.meanUx.length);
    assert.equal(window.field.meanRho.length, window.field.meanUy.length);
    assert.equal(
      window.field.digestFnv1a32,
      digestNumberArrays([
        window.field.meanRho,
        window.field.meanUx,
        window.field.meanUy,
        window.field.densityFluctuationRms,
        window.field.velocityFluctuationRms,
      ]),
    );
  }
  const executionPass = run.status === "completed"
    && run.completedSteps === run.definition.runSteps
    && run.failure === undefined;
  assert.equal(run.gate.executionPass, executionPass);
  assert.equal(run.gate.durationTiersComplete, true);
  assert.equal(run.gate.internalLedgerPass, run.internalLedgerGatePass);
  assert.equal(
    run.gate.pass,
    run.trajectoryCompleteAndFinite
      && run.gate.densityPass
      && run.gate.machPass
      && run.gate.durationTiersComplete
      && run.gate.internalLedgerPass,
  );
}

function assertExactComparison(comparison) {
  assert.equal(comparison.comparedSamples > 0, true);
  assert.equal(comparison.comparedCellsPerSample > 0, true);
  assert.equal(
    comparison.gate.densityPass,
    comparison.maximumAbsoluteDensityDifference
      <= CONTRACT.discreteReference.gates.maximumAbsoluteDensityDifference,
  );
  assert.equal(
    comparison.gate.velocityPass,
    comparison.maximumAbsoluteVelocityComponentDifference
      <= CONTRACT.discreteReference.gates
        .maximumAbsoluteVelocityComponentDifference,
  );
  assert.equal(
    comparison.gate.rawReactionPass,
    comparison.maximumAbsoluteRawBodyReactionDifference
      <= CONTRACT.discreteReference.gates
        .maximumAbsoluteRawBodyReactionDifference,
  );
  assert.equal(
    comparison.gate.pass,
    comparison.gate.sampleCountPass
      && comparison.gate.coordinateIdentityPass
      && comparison.exact
      && comparison.gate.densityPass
      && comparison.gate.velocityPass
      && comparison.gate.rawReactionPass,
  );
}

function assertCanonicalTrace(trace) {
  assert.equal(
    trace.construction,
    "direct-S1-w12d-trace-never-an-average",
  );
  assert.equal(trace.samples.length, 12);
  for (const sample of trace.samples) {
    assert.equal(sample.rho.length, trace.relativeXCells.length);
    assert.equal(sample.ux.length, trace.relativeXCells.length);
    assert.equal(sample.uy.length, trace.relativeXCells.length);
    assert.equal(
      sample.fieldDigestFnv1a32,
      digestNumberArrays([sample.rho, sample.ux, sample.uy]),
    );
    assert.equal(sample.strictConePass, true);
  }
}

const selectedPaths = /^(format|contractIdentity|discreteReference\.runs\.\d+|discreteReference\.exactComparisons\.\d+|discreteReference\.canonicalTraces\.\d+|discreteReference\.gate|maturity\.runs\.\d+|maturity\.parameterAnalyses\.\d+|maturity\.jointSensitivity|maturity\.gate|decision)$/;
let format;
let contractIdentity;
let discreteGate;
let maturityGate;
let jointSensitivity;
let decision;
let discreteRunCount = 0;
let exactComparisonCount = 0;
let canonicalTraceCount = 0;
let maturityRunCount = 0;
let parameterAnalysisCount = 0;
const discreteIds = new Set();
const maturityIds = new Set();

for await (const { value } of streamSelectedJsonValues(
  primaryPath,
  selectedPaths,
)) {
  assertFiniteTree(value);
  if (typeof value === "string") {
    format = value;
  } else if (value?.formalSourceSha256 !== undefined) {
    contractIdentity = value;
  } else if (value?.definition?.cornerId !== undefined) {
    assertDiscreteRun(value);
    discreteRunCount += 1;
    discreteIds.add(value.definition.id);
  } else if (value?.kind !== undefined && value?.firstCaseId !== undefined) {
    assertExactComparison(value);
    exactComparisonCount += 1;
  } else if (value?.construction !== undefined && Array.isArray(value?.samples)) {
    assertCanonicalTrace(value);
    canonicalTraceCount += 1;
  } else if (value?.allStrictConeGuardsPass !== undefined) {
    discreteGate = value;
  } else if (value?.definition?.parameterId !== undefined) {
    assertMaturityRun(value);
    maturityRunCount += 1;
    maturityIds.add(value.definition.id);
  } else if (value?.symmetryLock !== undefined) {
    assert.ok(CONTRACT.maturity.classification.allowed.includes(
      value.classification,
    ));
    assert.equal(
      value.gates.pass,
      value.gates.allRunsInternallyPass
        && value.gates.signPairsPass
        && value.gates.amplitudeConsistencyPass
        && value.gates.classificationResolved
        && value.gates.symmetryLockDetermined,
    );
    parameterAnalysisCount += 1;
  } else if (Array.isArray(value?.geometryClassifications)) {
    jointSensitivity = value;
    assert.equal(
      value.gate.pass,
      value.gate.geometryCountPass
        && value.gate.allGeometryClassificationsResolved
        && value.gate.sameClassificationPass
        && value.gate.allSignPairsPass
        && value.gate.allMetricComparisonsPass,
    );
  } else if (value?.bothParameterClassificationsResolved !== undefined) {
    maturityGate = value;
  } else if (value?.formalSourceModified !== undefined) {
    decision = value;
  } else {
    assert.fail(
      "unrecognized selected A8P value with keys: "
        + Object.keys(value ?? {}).join(","),
    );
  }
}

assert.equal(
  format,
  "VP-A8P-DISCRETE-REFERENCE-MATURITY-QUALIFICATION-v1",
);
assert.equal(contractIdentity?.format, CONTRACT.format);
assert.equal(discreteRunCount, CONTRACT.discreteReference.matrixRunCount);
assert.equal(discreteIds.size, CONTRACT.discreteReference.matrixRunCount);
assert.equal(exactComparisonCount, 24);
assert.equal(canonicalTraceCount, 6);
assert.equal(maturityRunCount, CONTRACT.maturity.uniqueRunCount);
assert.equal(maturityIds.size, CONTRACT.maturity.uniqueRunCount);
assert.equal(parameterAnalysisCount, CONTRACT.maturity.parameters.length);
assert.ok(discreteGate !== undefined);
assert.ok(maturityGate !== undefined);
assert.ok(jointSensitivity !== undefined);
assert.ok(decision !== undefined);

assert.equal(
  discreteGate.pass,
  discreteGate.runCountPass
    && discreteGate.allTrajectoriesCompleteAndFinite
    && discreteGate.allInternalLedgersPass
    && discreteGate.allStabilityPass
    && discreteGate.allStrictConeGuardsPass
    && discreteGate.comparisonCountPass
    && discreteGate.allExactComparisonsPass
    && discreteGate.canonicalTraceCountPass,
);
assert.equal(
  maturityGate.pass,
  maturityGate.runCountPass
    && maturityGate.allTrajectoriesCompleteAndFinite
    && maturityGate.allInternalLedgersPass
    && maturityGate.allStabilityPass
    && maturityGate.allDurationTiersComplete
    && maturityGate.bothParameterClassificationsResolved
    && maturityGate.allSignPairsReproducible
    && maturityGate.amplitudeClassificationConsistent
    && maturityGate.symmetryLockDetermined
    && maturityGate.jointSensitivityPass,
);
assert.equal(
  decision.pass,
  decision.gates.discreteReferencePass
    && decision.gates.maturityProtocolPass
    && decision.gates.allA8pPopulationLedgersPass,
);
assert.equal(
  decision.code,
  decision.pass ? CONTRACT.decision.passCode : CONTRACT.decision.noGoCode,
);
assert.equal(decision.formalSourceModified, false);
assert.equal(decision.formalIntegrationUnlocked, false);
assert.equal(decision.s9Selected, false);
assert.equal(decision.newBoundaryStrategyCreated, false);
assert.equal(decision.stopAfterEvidenceReportRepeatAndHandoff, true);

const contractCommit = contractIdentity.contractCommit;
const contractTestCommit = contractIdentity.contractTestCommit;
const implementationCommit = contractIdentity.implementationCommit;
assert.equal(lastCommit(contractRepositoryPath), contractCommit);
assert.equal(lastCommit(contractDocumentRepositoryPath), contractCommit);
assert.equal(lastCommit(contractTestRepositoryPath), contractTestCommit);
git(["merge-base", "--is-ancestor", contractCommit, contractTestCommit]);
git(["merge-base", "--is-ancestor", contractTestCommit, implementationCommit]);
git(["merge-base", "--is-ancestor", implementationCommit, "HEAD"]);
for (const path of implementationRepositoryPaths) {
  assert.equal(lastCommit(path), implementationCommit, path);
}
for (const path of [
  contractRepositoryPath,
  contractDocumentRepositoryPath,
  contractTestRepositoryPath,
  ...implementationTreePaths,
]) {
  const current = await readFile(resolve(repositoryRoot, path));
  const commit = path === contractRepositoryPath
      || path === contractDocumentRepositoryPath
    ? contractCommit
    : path === contractTestRepositoryPath
      ? contractTestCommit
      : implementationCommit;
  const frozen = git(["show", commit + ":" + path], null);
  assert.equal(Buffer.compare(current, frozen), 0, path);
}
assert.equal(
  contractIdentity.contractSha256,
  hash(git(["show", contractCommit + ":" + contractRepositoryPath], null)),
);
assert.equal(
  contractIdentity.contractDocumentSha256,
  hash(git([
    "show",
    contractCommit + ":" + contractDocumentRepositoryPath,
  ], null)),
);
assert.equal(
  contractIdentity.implementationTreeSha256,
  implementationTreeSha256AtCommit(implementationCommit),
);
for (const [field, entry] of [
  ["formalSourceSha256", CONTRACT.sourceIdentity.formalSource],
  ["proDecisionSha256", CONTRACT.sourceIdentity.proDecision],
  ["frozenS9BoundarySha256", CONTRACT.sourceIdentity.frozenS9Boundary],
  ["frozenA8oContractSha256", CONTRACT.sourceIdentity.frozenA8oContract],
  ["frozenA8oRunsSha256", CONTRACT.sourceIdentity.frozenA8oRuns],
  ["frozenA8oSupportSha256", CONTRACT.sourceIdentity.frozenA8oSupport],
]) {
  assert.equal(
    contractIdentity[field],
    hash(await readFile(resolve(repositoryRoot, entry.relativePath))),
  );
}

const primaryStored = await sha256File(primaryPath);
const primaryCanonical = await sha256CanonicalJson(primaryPath);
const storedName = basename(primaryPath);
const expectedSidecar = primaryCanonical.sha256 + "  "
  + storedName.replace(/\.gz$/, "") + " (canonical uncompressed bytes)\n"
  + primaryStored.sha256 + "  " + storedName + "\n";
assert.equal(await readFile(sidecarPath, "utf8"), expectedSidecar);
let repeatByteIdentical = null;
if (repeatPath !== undefined) {
  repeatByteIdentical = await filesAreByteIdentical(primaryPath, repeatPath);
  assert.equal(
    repeatByteIdentical,
    true,
    "independent A8P repeat must be byte-identical",
  );
}

console.log(JSON.stringify({
  primaryPath,
  storedSha256: primaryStored.sha256,
  storedBytes: primaryStored.bytes,
  canonicalSha256: primaryCanonical.sha256,
  canonicalBytes: primaryCanonical.bytes,
  repeatByteIdentical,
  discreteReferenceGate: discreteGate,
  maturityGate,
  jointSensitivityGate: jointSensitivity.gate,
  decision,
}, null, 2));
