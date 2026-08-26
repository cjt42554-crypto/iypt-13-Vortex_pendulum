import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { FORMAL_INLET_MECHANISM_CONTRACT as CONTRACT } from
  "../src/formal-inlet-mechanism-contract.ts";
import { runFormalInletMechanismMatrix } from
  "../src/formal-inlet-mechanism.ts";

const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-inlet-mechanism-matrix.json.gz",
);
const a8jPath = resolve(
  process.argv[3]
    ?? "验证与复现/artifacts/a8-formal-mrt-no-body-ramp-matrix.json",
);
const a8kPath = resolve(
  process.argv[4]
    ?? "验证与复现/artifacts/a8-formal-mrt-boundary-factorization-matrix.json.gz",
);
const repositoryRoot = resolve(process.cwd(), "../../../");
const contractRepositoryPath =
  "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-inlet-mechanism-contract.ts";
const contractPath = resolve(repositoryRoot, contractRepositoryPath);
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

if (git(["status", "--porcelain=v1", "--", contractRepositoryPath]).trim() !== "") {
  throw new Error("A8L contract must be committed and clean before research execution");
}
const contractCommit = git([
  "log",
  "-1",
  "--format=%H",
  "--",
  contractRepositoryPath,
]).trim();
if (contractCommit === "") throw new Error("A8L contract has no committed provenance");
git(["merge-base", "--is-ancestor", contractCommit, "HEAD"]);
const contractRaw = await readFile(contractPath);
const committedContractRaw = git(
  ["show", `${contractCommit}:${contractRepositoryPath}`],
  null,
);
if (Buffer.compare(contractRaw, committedContractRaw) !== 0) {
  throw new Error("working A8L contract differs from its preregistration commit");
}
const contractSha256 = hash(contractRaw);

if (await sha256(formalSourcePath) !== CONTRACT.sourceIdentity.formalSource.sha256) {
  throw new Error("formal LBM source hash does not match frozen A8L contract");
}
if (await sha256(planningContractPath)
  !== CONTRACT.sourceIdentity.planningContract.sha256) {
  throw new Error("planning contract hash does not match frozen A8L contract");
}
const a8jRaw = await readFile(a8jPath);
if (hash(a8jRaw) !== CONTRACT.inheritedEvidence.a8j.sha256) {
  throw new Error("A8J artifact hash does not match frozen A8L contract");
}
const a8kStoredRaw = await readFile(a8kPath);
if (hash(a8kStoredRaw) !== CONTRACT.inheritedEvidence.a8k.storedSha256) {
  throw new Error("A8K stored artifact hash does not match frozen A8L contract");
}
const a8kCanonicalRaw = gunzipSync(a8kStoredRaw);
if (hash(a8kCanonicalRaw) !== CONTRACT.inheritedEvidence.a8k.canonicalSha256) {
  throw new Error("A8K canonical artifact hash does not match frozen A8L contract");
}

const a8j = JSON.parse(a8jRaw.toString("utf8"));
if (a8j.decision?.code !== CONTRACT.inheritedEvidence.a8j.decision) {
  throw new Error("A8J decision identity does not match frozen A8L contract");
}
const a8k = JSON.parse(a8kCanonicalRaw.toString("utf8"));
if (a8k.decision?.code !== CONTRACT.inheritedEvidence.a8k.decision) {
  throw new Error("A8K decision identity does not match frozen A8L contract");
}
const a8jAnchors = a8j.cases
  .filter((entry) => entry.definition.rampDurationDiameters === 20)
  .map((entry) => ({
    nominalDiameterScaleCells: entry.definition.nominalDiameterScaleCells,
    relaxationTime: entry.definition.relaxationTime,
    completedSteps: entry.run.completedSteps,
    stability: entry.run.stability,
  }));
const a8kAnchors = a8k.cases
  .filter((entry) =>
    entry.definition.inletBoundary === "regularized-prescribed-state"
    && entry.definition.outletBoundary === "formal-zou-he-pressure")
  .map((entry) => ({
    nominalDiameterScaleCells: entry.definition.nominalDiameterScaleCells,
    relaxationTime: entry.definition.relaxationTime,
    completedSteps: entry.run.completedSteps,
    stability: entry.run.stability,
  }));

const result = runFormalInletMechanismMatrix(
  a8jAnchors,
  a8kAnchors,
  {
    formalSourceSha256: CONTRACT.sourceIdentity.formalSource.sha256,
    contractSha256,
    contractCommit,
    a8jArtifactSha256: CONTRACT.inheritedEvidence.a8j.sha256,
    a8kStoredArtifactSha256: CONTRACT.inheritedEvidence.a8k.storedSha256,
    a8kCanonicalArtifactSha256:
      CONTRACT.inheritedEvidence.a8k.canonicalSha256,
  },
  (completed, total, entry) => {
    if (completed % 8 === 0 || completed === total) {
      console.error(
        `[${completed}/${total}] ${entry.definition.id} ${entry.gate.pass ? "PASS" : "FAIL"}`,
      );
    }
  },
);
await mkdir(dirname(outputPath), { recursive: true });
const canonicalJson = Buffer.from(`${JSON.stringify(result)}\n`, "utf8");
await writeFile(outputPath, gzipSync(canonicalJson, { level: 9, mtime: 0 }));
console.log(JSON.stringify({
  outputPath,
  contractCommit,
  contractSha256,
  matrixComplete: result.matrixComplete,
  anchorComparison: result.anchorComparison,
  strategySummaries: result.strategySummaries,
  causalAnalysis: result.causalAnalysis,
  summary: result.summary,
  decision: result.decision,
}, null, 2));
if (!result.decision.pass) process.exitCode = 2;
