import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { BRINKMAN_SCALING_CONTRACT as CONTRACT } from
  "../src/brinkman-scaling-contract.ts";
import { deriveBrinkmanScalingRunAnalysis } from
  "../src/brinkman-scaling-runs.ts";
import {
  assembleBrinkmanScalingQualification,
  isCompletedBrinkmanScalingRun,
} from "../src/brinkman-scaling.ts";
import { assertFiniteTree } from
  "../src/brinkman-scaling-support.ts";
import {
  filesAreByteIdentical,
  sha256CanonicalJson,
  sha256File,
  streamSelectedJsonValues,
} from "./formal-causal-reference-artifact-stream.mjs";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-brinkman-sharp-interface-scaling-screen.json.gz",
);
const repeatPath = process.argv[3] === undefined
  ? undefined
  : resolve(process.argv[3]);
const sidecarPath = primaryPath.replace(/\.json\.gz$/, ".sha256");
const repositoryRoot = resolve(process.cwd(), "../../../");
const candidateRoot =
  "90_候选工作区/current/A8_二维特征开放边界实验后端";
const contractRepositoryPath =
  candidateRoot + "/src/brinkman-scaling-contract.ts";
const contractDocumentRepositoryPath =
  candidateRoot + "/17_A8Q_Brinkman锐界面缩放路径预注册合同.md";
const contractTestRepositoryPath =
  candidateRoot + "/tests/brinkman-scaling-contract.test.ts";
const scientificImplementationRepositoryPaths = [
  candidateRoot + "/src/brinkman-scaling-support.ts",
  candidateRoot + "/src/brinkman-scaling-runs.ts",
  candidateRoot + "/src/brinkman-scaling.ts",
].sort();
const implementationRepositoryPaths = [
  ...scientificImplementationRepositoryPaths,
  candidateRoot + "/scripts/run-brinkman-scaling.mjs",
  candidateRoot + "/scripts/assert-brinkman-scaling-artifact.mjs",
  candidateRoot + "/tests/brinkman-scaling-support.test.ts",
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

function assertCompletedRun(run) {
  assert.equal(run.completedSteps, run.definition.totalSteps);
  assert.equal(
    run.trace.length,
    run.definition.totalSteps - run.definition.discardSteps,
  );
  for (let index = 0; index < run.trace.length; index += 1) {
    const record = run.trace[index];
    assert.ok(record !== undefined);
    assert.equal(record.step, run.definition.discardSteps + index + 1);
    assert.equal(
      record.convectiveTime,
      record.step * CONTRACT.carrier.latticeVelocity
        / run.definition.diameterCells,
    );
    assert.equal(
      record.correctedLoad.x,
      record.rawReaction.x + record.fictitiousFluidCorrection.x,
    );
    assert.equal(
      record.correctedLoad.y,
      record.rawReaction.y + record.fictitiousFluidCorrection.y,
    );
  }
  const derived = deriveBrinkmanScalingRunAnalysis(
    run.trace,
    run.definition,
  );
  assert.deepEqual(run.forceDecomposition, derived.forceDecomposition);
  assert.deepEqual(run.slip, derived.slip);
  assert.deepEqual(run.metrics, derived.metrics);
  assert.deepEqual(run.maturity, derived.maturity);
  assert.deepEqual(run.literature, derived.literature);
  assert.deepEqual(run.recomposition, derived.recomposition);
  assert.match(run.geometry.maskDigestFnv1a32, /^[0-9a-f]{8}$/);
  assert.equal(
    run.gates.densityPass,
    run.extrema.maximumDensityDeviation
      <= CONTRACT.gates.maximumDensityDeviation,
  );
  assert.equal(
    run.gates.machPass,
    run.extrema.maximumMach <= CONTRACT.gates.maximumMach,
  );
  assert.equal(run.gates.maturityPass, run.maturity.passed);
  assert.equal(
    run.gates.forceRecompositionPass,
    run.recomposition.passed,
  );
  assert.equal(
    run.gates.pass,
    run.gates.densityPass
      && run.gates.machPass
      && run.gates.maturityPass
      && run.gates.forceRecompositionPass,
  );
}

const selectedPaths = /^(format|contractIdentity|runs\.\d+|globalGate|pathAnalyses\.\d+|literatureObservation|decision)$/;
let format;
let contractIdentity;
const runs = [];
let globalGate;
const pathAnalyses = [];
let literatureObservation;
let decision;

for await (const { value } of streamSelectedJsonValues(
  primaryPath,
  selectedPaths,
)) {
  assertFiniteTree(value);
  if (typeof value === "string") {
    format = value;
  } else if (value?.formalSourceSha256 !== undefined) {
    contractIdentity = value;
  } else if (value?.definition !== undefined && value?.status !== undefined) {
    if (isCompletedBrinkmanScalingRun(value)) {
      assertCompletedRun(value);
    } else {
      assert.equal(value.status, "failed");
      assert.equal(value.trajectoryCompleteAndFinite, false);
      assert.equal(typeof value.failure, "string");
    }
    runs.push(value);
  } else if (value?.runCountPass !== undefined) {
    globalGate = value;
  } else if (value?.penalizationTimeSteps !== undefined
    && Array.isArray(value?.runIds)) {
    pathAnalyses.push(value);
  } else if (Array.isArray(value?.singlePointHitCaseIds)) {
    literatureObservation = value;
  } else if (value?.formalSourceModified !== undefined) {
    decision = value;
  } else {
    assert.fail(
      "unrecognized selected A8Q value with keys: "
        + Object.keys(value ?? {}).join(","),
    );
  }
}

assert.equal(
  format,
  "VP-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-SCREEN-QUALIFICATION-v1",
);
assert.equal(contractIdentity?.format, CONTRACT.format);
assert.equal(runs.length, CONTRACT.matrix.uniqueRunCount);
assert.ok(globalGate !== undefined);
assert.equal(pathAnalyses.length, 2);
assert.ok(literatureObservation !== undefined);
assert.ok(decision !== undefined);

const reconstructed = assembleBrinkmanScalingQualification(
  contractIdentity,
  runs,
);
assert.deepEqual(globalGate, reconstructed.globalGate);
assert.deepEqual(pathAnalyses, reconstructed.pathAnalyses);
assert.deepEqual(
  literatureObservation,
  reconstructed.literatureObservation,
);
assert.deepEqual(decision, reconstructed.decision);
assert.equal(
  decision.code,
  decision.pass ? CONTRACT.decision.passCode : CONTRACT.decision.noGoCode,
);
assert.equal(decision.formalSourceModified, false);
assert.equal(decision.formalIntegrationUnlocked, false);
assert.equal(decision.s1PhysicallySelected, false);
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
assert.equal(
  implementationTreeSha256AtCommit(implementationCommit),
  contractIdentity.implementationTreeSha256,
);

const frozenContractRaw = git([
  "show",
  contractCommit + ":" + contractRepositoryPath,
], null);
const frozenDocumentRaw = git([
  "show",
  contractCommit + ":" + contractDocumentRepositoryPath,
], null);
assert.equal(hash(frozenContractRaw), contractIdentity.contractSha256);
assert.equal(hash(frozenDocumentRaw), contractIdentity.contractDocumentSha256);

const stored = await sha256File(primaryPath);
const canonical = await sha256CanonicalJson(primaryPath);
const sidecar = await readFile(sidecarPath, "utf8");
const storedName = basename(primaryPath);
const canonicalName = storedName.replace(/\.gz$/, "")
  + " (canonical uncompressed bytes)";
assert.equal(
  sidecar,
  canonical.sha256 + "  " + canonicalName + "\n"
    + stored.sha256 + "  " + storedName + "\n",
);

let repeatByteIdentical = null;
if (repeatPath !== undefined) {
  repeatByteIdentical = await filesAreByteIdentical(primaryPath, repeatPath);
  assert.equal(repeatByteIdentical, true);
}

console.log(JSON.stringify({
  primaryPath,
  repeatPath: repeatPath ?? null,
  repeatByteIdentical,
  storedSha256: stored.sha256,
  storedBytes: stored.bytes,
  canonicalSha256: canonical.sha256,
  canonicalBytes: canonical.bytes,
  contractCommit,
  contractTestCommit,
  implementationCommit,
  implementationTreeSha256: contractIdentity.implementationTreeSha256,
  globalGate,
  pathAnalyses,
  literatureObservation,
  decision,
}, null, 2));
