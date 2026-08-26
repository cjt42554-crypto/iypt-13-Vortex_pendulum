import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { FORMAL_INLET_QUALIFICATION_CONTRACT as CONTRACT } from
  "../src/formal-inlet-qualification-contract.ts";
import { runFormalInletQualification } from
  "../src/formal-inlet-qualification.ts";

const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-inlet-qualification.json.gz",
);
const a8lPath = resolve(
  process.argv[3]
    ?? "验证与复现/artifacts/a8-formal-mrt-inlet-mechanism-matrix.json.gz",
);
const a8hPath = resolve(
  process.argv[4]
    ?? "验证与复现/artifacts/a8-formal-mrt-brinkman-startup-matrix.json",
);
const repositoryRoot = resolve(process.cwd(), "../../../");
const contractRepositoryPath =
  "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-inlet-qualification-contract.ts";
const contractDocumentRepositoryPath =
  "90_候选工作区/current/A8_二维特征开放边界实验后端/05_A8M_入口质量反射与启动资格预注册合同.md";
const contractPath = resolve(repositoryRoot, contractRepositoryPath);
const contractDocumentPath = resolve(repositoryRoot, contractDocumentRepositoryPath);

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

for (const path of [contractRepositoryPath, contractDocumentRepositoryPath]) {
  if (git(["status", "--porcelain=v1", "--", path]).trim() !== "") {
    throw new Error(`A8M preregistration must be committed and clean: ${path}`);
  }
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
if (contractCommit === "" || documentCommit === "") {
  throw new Error("A8M preregistration has no committed provenance");
}
if (contractCommit !== documentCommit) {
  throw new Error("A8M executable and Markdown contracts were not frozen together");
}
git(["merge-base", "--is-ancestor", contractCommit, "HEAD"]);
const contractRaw = await readFile(contractPath);
const contractDocumentRaw = await readFile(contractDocumentPath);
const committedContractRaw = git(
  ["show", `${contractCommit}:${contractRepositoryPath}`],
  null,
);
const committedDocumentRaw = git(
  ["show", `${documentCommit}:${contractDocumentRepositoryPath}`],
  null,
);
if (Buffer.compare(contractRaw, committedContractRaw) !== 0
  || Buffer.compare(contractDocumentRaw, committedDocumentRaw) !== 0) {
  throw new Error("working A8M preregistration differs from its frozen commit");
}
const contractSha256 = hash(contractRaw);

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
if (await sha256(formalSourcePath) !== CONTRACT.sourceIdentity.formalSource.sha256) {
  throw new Error("formal LBM source hash does not match frozen A8M contract");
}
if (await sha256(proDecisionPath) !== CONTRACT.sourceIdentity.proDecision.sha256) {
  throw new Error("Pro decision hash does not match frozen A8M contract");
}
if (await sha256(adapterSourcePath)
  !== CONTRACT.sourceIdentity.a8lAdapterSource.sha256) {
  throw new Error("A8L adapter source hash does not match frozen A8M contract");
}

const a8lStoredRaw = await readFile(a8lPath);
if (hash(a8lStoredRaw) !== CONTRACT.inheritedEvidence.a8l.storedSha256) {
  throw new Error("A8L stored artifact hash does not match frozen A8M contract");
}
const a8lCanonicalRaw = gunzipSync(a8lStoredRaw);
if (hash(a8lCanonicalRaw) !== CONTRACT.inheritedEvidence.a8l.canonicalSha256) {
  throw new Error("A8L canonical artifact hash does not match frozen A8M contract");
}
const a8hRaw = await readFile(a8hPath);
if (hash(a8hRaw) !== CONTRACT.inheritedEvidence.a8h.sha256) {
  throw new Error("A8H artifact hash does not match frozen A8M contract");
}

const a8l = JSON.parse(a8lCanonicalRaw.toString("utf8"));
const a8h = JSON.parse(a8hRaw.toString("utf8"));
const exactStrategies = new Set(
  CONTRACT.inheritedEvidence.a8l.exactAnchorStrategies,
);
const a8lAnchors = a8l.cases
  .filter((entry) => exactStrategies.has(entry.definition.strategy))
  .map((entry) => ({
    nominalDiameterCells: entry.definition.nominalDiameterScaleCells,
    relaxationTime: entry.definition.relaxationTime,
    strategy: entry.definition.strategy,
    completedSteps: entry.run.completedSteps,
    stability: entry.run.stability,
  }));
const a8hAnchors = a8h.cases
  .filter((entry) =>
    entry.definition.startupProtocolId
      === CONTRACT.inheritedEvidence.a8h.exactAnchorProtocol)
  .map((entry) => ({
    nominalDiameterCells: entry.definition.nominalCylinderDiameterCells,
    relaxationTime: entry.definition.relaxationTime,
    completedSteps: entry.run.completedSteps,
    stability: entry.run.stability,
  }));
if (a8lAnchors.length !== CONTRACT.inheritedEvidence.a8l.exactAnchorCases) {
  throw new Error("A8L exact anchor count does not match frozen A8M contract");
}
if (a8hAnchors.length !== CONTRACT.inheritedEvidence.a8h.exactAnchorCases) {
  throw new Error("A8H exact anchor count does not match frozen A8M contract");
}

const result = runFormalInletQualification(
  a8lAnchors,
  a8hAnchors,
  {
    formalSourceSha256: CONTRACT.sourceIdentity.formalSource.sha256,
    proDecisionSha256: CONTRACT.sourceIdentity.proDecision.sha256,
    a8lAdapterSourceSha256: CONTRACT.sourceIdentity.a8lAdapterSource.sha256,
    a8lStoredArtifactSha256: CONTRACT.inheritedEvidence.a8l.storedSha256,
    a8lCanonicalArtifactSha256: CONTRACT.inheritedEvidence.a8l.canonicalSha256,
    a8hArtifactSha256: CONTRACT.inheritedEvidence.a8h.sha256,
    contractSha256,
    contractCommit,
  },
  (progress) => {
    if (progress.completed % 4 === 0 || progress.completed === progress.total) {
      console.error(
        `[${progress.phase} ${progress.completed}/${progress.total}] ${progress.caseId} ${progress.pass ? "PASS" : "FAIL"}`,
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
  contractDocumentSha256: hash(contractDocumentRaw),
  anchorComparison: result.anchorComparison,
  qualification: result.qualification,
  evidenceDecision: result.evidenceDecision,
}, null, 2));
if (!result.evidenceDecision.pass) process.exitCode = 2;
