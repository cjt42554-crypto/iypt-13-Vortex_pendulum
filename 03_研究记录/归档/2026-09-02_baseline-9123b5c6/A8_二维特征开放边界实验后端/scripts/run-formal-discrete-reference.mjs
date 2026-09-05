import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { FORMAL_DISCRETE_REFERENCE_CONTRACT as CONTRACT } from
  "../src/formal-discrete-reference-contract.ts";
import { runFormalDiscreteReferenceQualification } from
  "../src/formal-discrete-reference.ts";
import { writeDeterministicJsonGzip } from
  "./formal-causal-reference-artifact-stream.mjs";

const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-discrete-reference-maturity-qualification.json.gz",
);
const sidecarPath = outputPath.replace(/\.json\.gz$/, ".sha256");
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

function ensureCleanCommitted(path) {
  if (git(["status", "--porcelain=v1", "--", path]).trim() !== "") {
    throw new Error("A8P input must be committed and clean: " + path);
  }
}

for (const path of [
  contractRepositoryPath,
  contractDocumentRepositoryPath,
  contractTestRepositoryPath,
  ...new Set(implementationTreePaths),
]) {
  ensureCleanCommitted(path);
}

const contractCommit = lastCommit(contractRepositoryPath);
if (contractCommit === ""
  || lastCommit(contractDocumentRepositoryPath) !== contractCommit) {
  throw new Error("A8P machine and Markdown contracts must share one commit");
}
const contractTestCommit = lastCommit(contractTestRepositoryPath);
if (contractTestCommit === "" || contractTestCommit === contractCommit) {
  throw new Error("A8P contract tests must follow the contract commit");
}
const implementationCommit = lastCommit(
  scientificImplementationRepositoryPaths[0],
);
if (implementationCommit === ""
  || implementationCommit === contractCommit
  || implementationCommit === contractTestCommit) {
  throw new Error("A8P implementation must follow contract and test commits");
}
git(["merge-base", "--is-ancestor", contractCommit, contractTestCommit]);
git(["merge-base", "--is-ancestor", contractTestCommit, implementationCommit]);
git(["merge-base", "--is-ancestor", implementationCommit, "HEAD"]);
for (const path of implementationRepositoryPaths) {
  if (lastCommit(path) !== implementationCommit) {
    throw new Error("A8P implementation paths must share one commit: " + path);
  }
}

const frozenContractRaw = git([
  "show",
  contractCommit + ":" + contractRepositoryPath,
], null);
const frozenDocumentRaw = git([
  "show",
  contractCommit + ":" + contractDocumentRepositoryPath,
], null);
const frozenTestRaw = git([
  "show",
  contractTestCommit + ":" + contractTestRepositoryPath,
], null);
for (const [path, frozen] of [
  [contractRepositoryPath, frozenContractRaw],
  [contractDocumentRepositoryPath, frozenDocumentRaw],
  [contractTestRepositoryPath, frozenTestRaw],
]) {
  const working = await readFile(resolve(repositoryRoot, path));
  if (Buffer.compare(working, frozen) !== 0) {
    throw new Error("working A8P contract input differs from frozen: " + path);
  }
}
for (const path of implementationTreePaths) {
  const working = await readFile(resolve(repositoryRoot, path));
  const frozen = git(["show", implementationCommit + ":" + path], null);
  if (Buffer.compare(working, frozen) !== 0) {
    throw new Error("working A8P implementation differs from frozen: " + path);
  }
}

for (const [label, entry] of [
  ["formal source", CONTRACT.sourceIdentity.formalSource],
  ["Pro decision", CONTRACT.sourceIdentity.proDecision],
  ["S9 boundary", CONTRACT.sourceIdentity.frozenS9Boundary],
  ["A8O contract", CONTRACT.sourceIdentity.frozenA8oContract],
  ["A8O runs", CONTRACT.sourceIdentity.frozenA8oRuns],
  ["A8O support", CONTRACT.sourceIdentity.frozenA8oSupport],
]) {
  const actual = await sha256(resolve(repositoryRoot, entry.relativePath));
  if (actual !== entry.sha256) {
    throw new Error(label + " hash does not match frozen A8P contract");
  }
}

const provenance = {
  formalSourceSha256: CONTRACT.sourceIdentity.formalSource.sha256,
  proDecisionSha256: CONTRACT.sourceIdentity.proDecision.sha256,
  frozenS9BoundarySha256: CONTRACT.sourceIdentity.frozenS9Boundary.sha256,
  frozenA8oContractSha256:
    CONTRACT.sourceIdentity.frozenA8oContract.sha256,
  frozenA8oRunsSha256: CONTRACT.sourceIdentity.frozenA8oRuns.sha256,
  frozenA8oSupportSha256: CONTRACT.sourceIdentity.frozenA8oSupport.sha256,
  contractSha256: hash(frozenContractRaw),
  contractDocumentSha256: hash(frozenDocumentRaw),
  contractCommit,
  contractTestCommit,
  implementationCommit,
  implementationTreeSha256:
    implementationTreeSha256AtCommit(implementationCommit),
};

const result = runFormalDiscreteReferenceQualification(
  provenance,
  (progress) => {
    console.error(
      "[" + progress.phase + " " + progress.completed + "/"
      + progress.total + "] " + progress.caseId
      + " trajectory="
      + (progress.trajectoryCompleteAndFinite ? "COMPLETE" : "FAIL")
      + " ledger="
      + (progress.internalLedgerGatePass ? "PASS" : "FAIL")
      + " internal=" + (progress.internalPass ? "PASS" : "FAIL"),
    );
  },
);

const artifactIdentity = await writeDeterministicJsonGzip(
  result,
  outputPath,
  {
    level: CONTRACT.artifact.gzipLevel,
    mtime: CONTRACT.artifact.gzipMtime,
  },
);
const storedName = basename(outputPath);
const canonicalName = storedName.replace(/\.gz$/, "")
  + " (canonical uncompressed bytes)";
await writeFile(
  sidecarPath,
  artifactIdentity.canonicalSha256 + "  " + canonicalName + "\n"
    + artifactIdentity.storedSha256 + "  " + storedName + "\n",
  { encoding: "utf8", flag: "wx" },
);

console.log(JSON.stringify({
  outputPath,
  sidecarPath,
  storedSha256: artifactIdentity.storedSha256,
  canonicalSha256: artifactIdentity.canonicalSha256,
  storedBytes: artifactIdentity.storedBytes,
  canonicalBytes: artifactIdentity.canonicalBytes,
  contractCommit,
  contractTestCommit,
  implementationCommit,
  implementationTreeSha256: provenance.implementationTreeSha256,
  discreteReferenceGate: result.discreteReference.gate,
  maturityGate: result.maturity.gate,
  decision: result.decision,
}, null, 2));

if (!result.decision.pass) process.exitCode = 2;
