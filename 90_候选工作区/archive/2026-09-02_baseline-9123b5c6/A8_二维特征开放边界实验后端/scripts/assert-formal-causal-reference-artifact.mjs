import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FORMAL_CAUSAL_REFERENCE_CONTRACT as CONTRACT } from
  "../src/formal-causal-reference-contract.ts";
import {
  filesAreByteIdentical,
  sha256CanonicalJson,
  sha256File,
  streamSelectedJsonValues,
} from "./formal-causal-reference-artifact-stream.mjs";

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
  candidateRoot + "/scripts/formal-causal-reference-artifact-stream.mjs",
  candidateRoot + "/scripts/run-formal-causal-reference.mjs",
  candidateRoot + "/scripts/assert-formal-causal-reference-artifact.mjs",
  candidateRoot + "/package.json",
  candidateRoot + "/package-lock.json",
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

function assertCausalRun(run) {
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

function assertCausalCorner(corner) {
  assert.equal(corner.runComparisons.length, 8);
  assert.equal(corner.shortDistancePairs.length, 3);
  assert.equal(corner.alignedFluxComparisons.length, 3);
  assert.ok(corner.referenceAgreement.sampleCount > 0);
}

function assertStatisticalRun(run) {
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

function assertPerturbationPair(pair) {
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

const selectedPaths = /^(format|contractIdentity|inheritedA8nAnchors|causal\.runs\.\d+|causal\.cornerAnalyses\.\d+|causal\.gate|statistics\.runs\.\d+|statistics\.gate|perturbations\.pairs\.\d+|perturbations\.gate|evidenceDecision|candidateDecision)$/;
let format;
let contractIdentity;
let inheritedA8nAnchors;
let causalGate;
let statisticalGate;
let perturbationGate;
let evidenceDecision;
let candidateDecision;
let causalRunCount = 0;
let causalCornerCount = 0;
let statisticalRunCount = 0;
let perturbationPairCount = 0;
const causalIds = new Set();
const statisticalIds = new Set();
const perturbationIds = new Set();

for await (const { value } of streamSelectedJsonValues(
  primaryPath,
  selectedPaths,
)) {
  assertFiniteTree(value);
  if (typeof value === "string") {
    format = value;
  } else if (value?.formalSourceSha256 !== undefined) {
    contractIdentity = value;
  } else if (value?.requiredCases !== undefined
    && value?.exactMatchedCases !== undefined) {
    inheritedA8nAnchors = value;
  } else if (value?.definition?.id?.startsWith("causal-")) {
    assertCausalRun(value);
    causalRunCount += 1;
    causalIds.add(value.definition.id);
  } else if (Array.isArray(value?.runComparisons)
    && value?.referenceAgreement !== undefined) {
    assertCausalCorner(value);
    causalCornerCount += 1;
  } else if (value?.cornerAnalysisCountPass !== undefined) {
    causalGate = value;
  } else if (value?.definition?.id?.startsWith("statistics-")) {
    assertStatisticalRun(value);
    statisticalRunCount += 1;
    statisticalIds.add(value.definition.id);
  } else if (value?.allContinuousWindowsMature !== undefined) {
    statisticalGate = value;
  } else if (value?.definition?.perturbationId !== undefined) {
    assertPerturbationPair(value);
    perturbationPairCount += 1;
    perturbationIds.add(value.definition.id);
  } else if (value?.pairCountPass !== undefined) {
    perturbationGate = value;
  } else if (value?.internalChecks !== undefined) {
    evidenceDecision = value;
  } else if (value?.code !== undefined && value?.gates !== undefined) {
    candidateDecision = value;
  } else {
    assert.fail(
      "unrecognized selected A8O value with keys: "
        + Object.keys(value ?? {}).join(","),
    );
  }
}

assert.equal(format, "VP-A8O-CAUSAL-REFERENCE-2D-QUALIFICATION-v1");
assert.equal(contractIdentity?.format, CONTRACT.format);
assert.equal(causalRunCount, CONTRACT.causalReference.matrix.runCount);
assert.equal(causalIds.size, CONTRACT.causalReference.matrix.runCount);
assert.equal(causalCornerCount, 9);
assert.equal(
  statisticalRunCount,
  CONTRACT.continuousStatistics.matrixRunCount,
);
assert.equal(
  statisticalIds.size,
  CONTRACT.continuousStatistics.matrixRunCount,
);
assert.equal(
  perturbationPairCount,
  CONTRACT.twoDimensionalPerturbations.casePairCount,
);
assert.equal(
  perturbationIds.size,
  CONTRACT.twoDimensionalPerturbations.casePairCount,
);
assert.ok(causalGate !== undefined);
assert.ok(statisticalGate !== undefined);
assert.ok(perturbationGate !== undefined);
assert.ok(evidenceDecision !== undefined);
assert.ok(candidateDecision !== undefined);

assert.equal(
  inheritedA8nAnchors.requiredCases,
  CONTRACT.sourceIdentity.a8nEvidence.exactShortDomainCausalAnchors,
);
assert.equal(
  evidenceDecision.pass,
  Object.values(evidenceDecision.internalChecks).every(Boolean),
);
const candidateGatesPass = Object.values(candidateDecision.gates).every(Boolean);
assert.equal(
  candidateDecision.pass,
  evidenceDecision.pass && candidateGatesPass,
);
assert.equal(
  candidateDecision.code,
  candidateDecision.pass
    ? CONTRACT.decision.candidateReadyCode
    : CONTRACT.decision.candidateHoldCode,
);
assert.equal(
  evidenceDecision.code,
  evidenceDecision.pass
    ? CONTRACT.decision.evidenceCompleteCode
    : CONTRACT.decision.evidenceIncompleteCode,
);
assert.equal(evidenceDecision.formalSourceModified, false);
assert.equal(evidenceDecision.formalIntegrationUnlocked, false);
assert.equal(evidenceDecision.candidateAutomaticallyApproved, false);

const contractCommit = contractIdentity.contractCommit;
const implementationCommit = contractIdentity.implementationCommit;
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
assert.equal(contractIdentity.contractSha256, hash(frozenContractRaw));
assert.equal(
  contractIdentity.contractDocumentSha256,
  hash(frozenDocumentRaw),
);
assert.equal(
  git([
    "log",
    "-1",
    "--format=%H",
    "--",
    contractDocumentRepositoryPath,
  ]).trim(),
  contractCommit,
);
git(["merge-base", "--is-ancestor", contractCommit, implementationCommit]);
git(["merge-base", "--is-ancestor", implementationCommit, "HEAD"]);
for (const path of implementationRepositoryPaths) {
  const current = await readFile(resolve(repositoryRoot, path));
  const frozen = git(["show", implementationCommit + ":" + path], null);
  assert.equal(Buffer.compare(current, frozen), 0, path);
}
assert.equal(
  contractIdentity.implementationTreeSha256,
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
    contractIdentity[field],
    hash(await readFile(resolve(repositoryRoot, entry.relativePath))),
  );
}
const a8nStored = await sha256File(a8nPath);
const a8nCanonical = await sha256CanonicalJson(a8nPath);
assert.equal(
  contractIdentity.a8nStoredArtifactSha256,
  a8nStored.sha256,
);
assert.equal(
  contractIdentity.a8nCanonicalArtifactSha256,
  a8nCanonical.sha256,
);

const primaryStored = await sha256File(primaryPath);
const primaryCanonical = await sha256CanonicalJson(primaryPath);
let repeatByteIdentical = null;
if (repeatPath !== undefined) {
  repeatByteIdentical = await filesAreByteIdentical(primaryPath, repeatPath);
  assert.equal(
    repeatByteIdentical,
    true,
    "independent A8O repeat must be byte-identical",
  );
}
console.log(JSON.stringify({
  primaryPath,
  storedSha256: primaryStored.sha256,
  storedBytes: primaryStored.bytes,
  canonicalSha256: primaryCanonical.sha256,
  canonicalBytes: primaryCanonical.bytes,
  repeatByteIdentical,
  inheritedA8nAnchors,
  causalGate,
  statisticalGate,
  perturbationGate,
  evidenceDecision,
  candidateDecision,
}, null, 2));
