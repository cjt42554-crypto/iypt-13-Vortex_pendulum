import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { BRINKMAN_SCALING_CONTRACT as CONTRACT } from
  "../src/brinkman-scaling-contract.ts";
import { runBrinkmanScalingQualification } from
  "../src/brinkman-scaling.ts";
import {
  sha256CanonicalJson,
  writeDeterministicJsonGzip,
} from "./formal-causal-reference-artifact-stream.mjs";

const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-brinkman-sharp-interface-scaling-screen.json.gz",
);
if (!outputPath.endsWith(".json.gz")) {
  throw new Error("A8Q output path must end with .json.gz");
}
const sidecarPath = outputPath.replace(/\.json\.gz$/, ".sha256");
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

function ensureAncestor(ancestor, descendant, label) {
  try {
    git(["merge-base", "--is-ancestor", ancestor, descendant]);
  } catch {
    throw new Error(`A8Q ${label} ancestry gate failed`);
  }
}

if (git(["status", "--porcelain=v1"]).trim() !== "") {
  throw new Error("A8Q research execution requires a clean worktree");
}

const contractCommit = lastCommit(contractRepositoryPath);
if (contractCommit === ""
  || lastCommit(contractDocumentRepositoryPath) !== contractCommit) {
  throw new Error("A8Q machine and Markdown contracts must share one commit");
}
const contractTestCommit = lastCommit(contractTestRepositoryPath);
if (contractTestCommit === "" || contractTestCommit === contractCommit) {
  throw new Error("A8Q contract tests must follow the contract commit");
}
const implementationCommit = lastCommit(
  scientificImplementationRepositoryPaths[0],
);
if (implementationCommit === ""
  || implementationCommit === contractCommit
  || implementationCommit === contractTestCommit) {
  throw new Error("A8Q implementation must follow contract and test commits");
}
ensureAncestor(contractCommit, contractTestCommit, "contract-to-test");
ensureAncestor(contractTestCommit, implementationCommit, "test-to-implementation");
ensureAncestor(implementationCommit, "HEAD", "implementation-to-HEAD");
ensureAncestor(contractCommit, "origin/main", "contract-pushed");
ensureAncestor(contractTestCommit, "origin/main", "test-pushed");
ensureAncestor(implementationCommit, "origin/main", "implementation-pushed");
for (const path of implementationRepositoryPaths) {
  if (lastCommit(path) !== implementationCommit) {
    throw new Error("A8Q implementation paths must share one commit: " + path);
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
    throw new Error("working A8Q contract input differs from frozen: " + path);
  }
}
for (const path of implementationTreePaths) {
  const working = await readFile(resolve(repositoryRoot, path));
  const frozen = git(["show", implementationCommit + ":" + path], null);
  if (Buffer.compare(working, frozen) !== 0) {
    throw new Error("working A8Q implementation differs from frozen: " + path);
  }
}

const ordinarySourceEntries = [
  CONTRACT.sourceIdentity.formalSource,
  CONTRACT.sourceIdentity.proDecision,
  CONTRACT.sourceIdentity.frozenA8p.contract,
  CONTRACT.sourceIdentity.frozenA8p.support,
  CONTRACT.sourceIdentity.frozenA8p.runs,
  CONTRACT.sourceIdentity.frozenA8p.qualification,
  CONTRACT.sourceIdentity.frozenA8p.sidecar,
  CONTRACT.sourceIdentity.publicFixedCylinderCarrier.caseRunner,
  CONTRACT.sourceIdentity.publicFixedCylinderCarrier.geometry,
  CONTRACT.sourceIdentity.publicFixedCylinderCarrier.metrics,
  CONTRACT.sourceIdentity.publicFixedCylinderCarrier.benchmarkContract,
  CONTRACT.sourceIdentity.publicFixedCylinderCarrier.sensitivityContract,
];
const frozenSourceSha256 = {};
for (const entry of ordinarySourceEntries) {
  const actual = await sha256(resolve(repositoryRoot, entry.relativePath));
  if (actual !== entry.sha256) {
    throw new Error(
      "A8Q frozen source hash mismatch: " + entry.relativePath,
    );
  }
  frozenSourceSha256[entry.relativePath] = actual;
}
const a8pArtifactPath = resolve(
  repositoryRoot,
  CONTRACT.sourceIdentity.frozenA8p.artifact.relativePath,
);
const a8pStoredSha256 = await sha256(a8pArtifactPath);
if (a8pStoredSha256
  !== CONTRACT.sourceIdentity.frozenA8p.artifact.storedSha256) {
  throw new Error("A8Q frozen A8P stored artifact hash mismatch");
}
const a8pCanonical = await sha256CanonicalJson(a8pArtifactPath);
if (a8pCanonical.sha256
  !== CONTRACT.sourceIdentity.frozenA8p.artifact.canonicalSha256) {
  throw new Error("A8Q frozen A8P canonical artifact hash mismatch");
}

const provenance = {
  formalSourceSha256: CONTRACT.sourceIdentity.formalSource.sha256,
  proDecisionSha256: CONTRACT.sourceIdentity.proDecision.sha256,
  frozenA8pArtifactStoredSha256: a8pStoredSha256,
  frozenA8pArtifactCanonicalSha256: a8pCanonical.sha256,
  frozenSourceSha256,
  sourceHashesVerified: true,
  contractSha256: hash(frozenContractRaw),
  contractDocumentSha256: hash(frozenDocumentRaw),
  contractCommit,
  contractTestCommit,
  implementationCommit,
  implementationTreeSha256:
    implementationTreeSha256AtCommit(implementationCommit),
};

const lastPrintedPercent = new Map();
const result = runBrinkmanScalingQualification(provenance, (progress) => {
  const percent = Math.floor(
    100 * progress.completedSteps / progress.totalSteps,
  );
  const printable = percent === 100 || percent % 10 === 0;
  if (printable && lastPrintedPercent.get(progress.caseId) !== percent) {
    lastPrintedPercent.set(progress.caseId, percent);
    console.error(
      `[A8Q ${progress.caseId}] ${progress.completedSteps}/`
      + `${progress.totalSteps} (${percent}%)`,
    );
  }
});

for (const run of result.runs) {
  console.error(
    `[A8Q ${run.definition.id}] status=${run.status}`
    + ` steps=${run.completedSteps}/${run.definition.totalSteps}`
    + (run.status === "completed"
      ? ` internal=${run.gates.pass ? "PASS" : "FAIL"}`
      : ` failure=${run.failure}`),
  );
}

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
  globalGate: result.globalGate,
  pathGates: result.pathAnalyses.map((path) => ({
    penalizationTimeSteps: path.penalizationTimeSteps,
    gate: path.gates,
  })),
  literatureObservation: result.literatureObservation,
  decision: result.decision,
}, null, 2));

if (!result.decision.pass) process.exitCode = 2;
