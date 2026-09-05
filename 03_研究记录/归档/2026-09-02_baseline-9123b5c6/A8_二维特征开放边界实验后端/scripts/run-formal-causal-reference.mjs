import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { FORMAL_CAUSAL_REFERENCE_CONTRACT as CONTRACT } from
  "../src/formal-causal-reference-contract.ts";
import { runFormalCausalReferenceQualification } from
  "../src/formal-causal-reference.ts";
import { writeDeterministicJsonGzip } from
  "./formal-causal-reference-artifact-stream.mjs";

const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-causal-reference-2d-qualification.json.gz",
);
const a8nPath = resolve(
  process.argv[3]
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

async function sha256(path) {
  return hash(await readFile(path));
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

function ensureCleanCommitted(path) {
  if (git(["status", "--porcelain=v1", "--", path]).trim() !== "") {
    throw new Error("A8O input must be committed and clean: " + path);
  }
}

for (const path of [
  contractRepositoryPath,
  contractDocumentRepositoryPath,
  ...new Set(implementationRepositoryPaths),
]) {
  ensureCleanCommitted(path);
}

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
if (contractCommit === "" || documentCommit !== contractCommit) {
  throw new Error("A8O machine and Markdown contracts must share one frozen commit");
}
const implementationCommit = git(["rev-parse", "HEAD"]).trim();
if (implementationCommit === "" || implementationCommit === contractCommit) {
  throw new Error("A8O implementation commit must follow the contract commit");
}
git(["merge-base", "--is-ancestor", contractCommit, implementationCommit]);
git(["merge-base", "--is-ancestor", implementationCommit, "HEAD"]);

const frozenContractRaw = git([
  "show",
  contractCommit + ":" + contractRepositoryPath,
], null);
const frozenDocumentRaw = git([
  "show",
  contractCommit + ":" + contractDocumentRepositoryPath,
], null);
const workingContractRaw = await readFile(
  resolve(repositoryRoot, contractRepositoryPath),
);
const workingDocumentRaw = await readFile(
  resolve(repositoryRoot, contractDocumentRepositoryPath),
);
if (Buffer.compare(workingContractRaw, frozenContractRaw) !== 0
  || Buffer.compare(workingDocumentRaw, frozenDocumentRaw) !== 0) {
  throw new Error("working A8O contract differs from the frozen commit");
}
for (const path of implementationRepositoryPaths) {
  const working = await readFile(resolve(repositoryRoot, path));
  const frozen = git(["show", implementationCommit + ":" + path], null);
  if (Buffer.compare(working, frozen) !== 0) {
    throw new Error("working A8O scientific implementation differs from frozen: " + path);
  }
}

const sourceEntries = [
  ["formal source", CONTRACT.sourceIdentity.formalSource],
  ["Pro decision", CONTRACT.sourceIdentity.proDecision],
  ["S9 boundary", CONTRACT.sourceIdentity.frozenS9Boundary],
  ["A8N contract", CONTRACT.sourceIdentity.frozenA8nContract],
  ["fixed-cylinder geometry", CONTRACT.sourceIdentity.fixedCylinderGeometry],
  ["fixed-cylinder metrics", CONTRACT.sourceIdentity.fixedCylinderMetrics],
];
for (const [label, entry] of sourceEntries) {
  const actual = await sha256(resolve(repositoryRoot, entry.relativePath));
  if (actual !== entry.sha256) {
    throw new Error(label + " hash does not match frozen A8O contract");
  }
}

const a8nStoredRaw = await readFile(a8nPath);
if (hash(a8nStoredRaw) !== CONTRACT.sourceIdentity.a8nEvidence.storedSha256) {
  throw new Error("A8N stored artifact hash does not match frozen A8O contract");
}
const a8nCanonicalRaw = gunzipSync(a8nStoredRaw);
if (hash(a8nCanonicalRaw)
  !== CONTRACT.sourceIdentity.a8nEvidence.canonicalSha256) {
  throw new Error("A8N canonical artifact hash does not match frozen A8O contract");
}
const a8n = JSON.parse(a8nCanonicalRaw.toString("utf8"));
if (!Array.isArray(a8n.startupCases)) {
  throw new Error("A8N artifact does not contain startup cases");
}

const provenance = {
  formalSourceSha256: CONTRACT.sourceIdentity.formalSource.sha256,
  proDecisionSha256: CONTRACT.sourceIdentity.proDecision.sha256,
  a8nStoredArtifactSha256: CONTRACT.sourceIdentity.a8nEvidence.storedSha256,
  a8nCanonicalArtifactSha256: CONTRACT.sourceIdentity.a8nEvidence.canonicalSha256,
  frozenS9BoundarySha256: CONTRACT.sourceIdentity.frozenS9Boundary.sha256,
  frozenA8nContractSha256: CONTRACT.sourceIdentity.frozenA8nContract.sha256,
  fixedCylinderGeometrySha256:
    CONTRACT.sourceIdentity.fixedCylinderGeometry.sha256,
  fixedCylinderMetricsSha256:
    CONTRACT.sourceIdentity.fixedCylinderMetrics.sha256,
  contractSha256: hash(frozenContractRaw),
  contractDocumentSha256: hash(frozenDocumentRaw),
  contractCommit,
  implementationCommit,
  implementationTreeSha256:
    implementationTreeSha256AtCommit(implementationCommit),
};

const result = runFormalCausalReferenceQualification(
  a8n.startupCases,
  provenance,
  (progress) => {
    const decision = progress.phase === "statistics"
      ? " maturity=" + (progress.maturityPass ? "PASS" : "HOLD")
      : progress.phase === "perturbation"
        ? " qualification="
          + (progress.qualificationPass === null
            ? "DIAGNOSTIC"
            : progress.qualificationPass ? "PASS" : "HOLD")
        : "";
    console.error(
      "[" + progress.phase + " " + progress.completed + "/"
      + progress.total + "] " + progress.caseId + " internal="
      + (progress.internalPass ? "PASS" : "FAIL") + decision,
    );
  },
);

const artifactIdentity = await writeDeterministicJsonGzip(
  result,
  outputPath,
  {
    level: CONTRACT.operationalDefinitions.artifact.gzipLevel,
    mtime: CONTRACT.operationalDefinitions.artifact.gzipMtime,
  },
);
console.log(JSON.stringify({
  outputPath,
  storedSha256: artifactIdentity.storedSha256,
  canonicalSha256: artifactIdentity.canonicalSha256,
  storedBytes: artifactIdentity.storedBytes,
  canonicalBytes: artifactIdentity.canonicalBytes,
  contractCommit,
  implementationCommit,
  implementationTreeSha256: provenance.implementationTreeSha256,
  inheritedA8nAnchors: result.inheritedA8nAnchors,
  causalGate: result.causal.gate,
  statisticalGate: result.statistics.gate,
  perturbationGate: result.perturbations.gate,
  evidenceDecision: result.evidenceDecision,
  candidateDecision: result.candidateDecision,
}, null, 2));
if (!result.evidenceDecision.pass) process.exitCode = 2;
