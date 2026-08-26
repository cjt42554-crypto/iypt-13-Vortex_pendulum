import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { FORMAL_INCOMING_CHARACTERISTIC_CONTRACT as CONTRACT } from
  "../src/formal-incoming-characteristic-contract.ts";
import { runIncomingCharacteristicQualification } from
  "../src/formal-incoming-characteristic.ts";

const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-incoming-characteristic-qualification.json.gz",
);
const a8mPath = resolve(
  process.argv[3]
    ?? "验证与复现/artifacts/a8-formal-mrt-inlet-qualification.json.gz",
);
const repositoryRoot = resolve(process.cwd(), "../../../");
const candidateRoot =
  "90_候选工作区/current/A8_二维特征开放边界实验后端";
const contractRepositoryPath =
  `${candidateRoot}/src/formal-incoming-characteristic-contract.ts`;
const contractDocumentRepositoryPath =
  `${candidateRoot}/08_A8N_入射特征相容入口预注册合同.md`;
const implementationRepositoryPaths = [
  `${candidateRoot}/src/formal-incoming-characteristic-boundary.ts`,
  `${candidateRoot}/src/formal-incoming-characteristic-reconstruction.ts`,
  `${candidateRoot}/src/formal-incoming-characteristic-types.ts`,
  `${candidateRoot}/src/formal-incoming-characteristic-case.ts`,
  `${candidateRoot}/src/formal-incoming-characteristic-acoustics.ts`,
  `${candidateRoot}/src/formal-incoming-characteristic.ts`,
  `${candidateRoot}/scripts/run-formal-incoming-characteristic.mjs`,
  `${candidateRoot}/scripts/assert-formal-incoming-characteristic-artifact.mjs`,
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

async function implementationTreeSha256() {
  const digest = createHash("sha256");
  for (const path of implementationRepositoryPaths) {
    digest.update(path);
    digest.update("\0");
    digest.update(await readFile(resolve(repositoryRoot, path)));
    digest.update("\0");
  }
  return digest.digest("hex");
}

const frozenInputPaths = [
  contractRepositoryPath,
  contractDocumentRepositoryPath,
  ...implementationRepositoryPaths,
];
for (const path of frozenInputPaths) {
  if (git(["status", "--porcelain=v1", "--", path]).trim() !== "") {
    throw new Error(`A8N input must be committed and clean: ${path}`);
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
if (contractCommit === "" || contractCommit !== documentCommit) {
  throw new Error("A8N executable and Markdown contracts were not frozen together");
}
const implementationCommits = new Set(implementationRepositoryPaths.map((path) =>
  git(["log", "-1", "--format=%H", "--", path]).trim()));
if (implementationCommits.size !== 1 || implementationCommits.has("")) {
  throw new Error("A8N no-result implementation was not frozen in one commit");
}
const implementationCommit = [...implementationCommits][0];
if (implementationCommit === undefined || implementationCommit === contractCommit) {
  throw new Error("A8N implementation commit must follow the preregistration commit");
}
git(["merge-base", "--is-ancestor", contractCommit, implementationCommit]);
git(["merge-base", "--is-ancestor", implementationCommit, "HEAD"]);

for (const path of frozenInputPaths) {
  const working = await readFile(resolve(repositoryRoot, path));
  const committed = git(["show", `${path === contractRepositoryPath
    || path === contractDocumentRepositoryPath ? contractCommit : implementationCommit}:${path}`], null);
  if (Buffer.compare(working, committed) !== 0) {
    throw new Error(`working A8N input differs from its frozen commit: ${path}`);
  }
}

const contractPath = resolve(repositoryRoot, contractRepositoryPath);
const contractDocumentPath = resolve(repositoryRoot, contractDocumentRepositoryPath);
const contractRaw = await readFile(contractPath);
const contractDocumentRaw = await readFile(contractDocumentPath);
const contractSha256 = hash(contractRaw);
const contractDocumentSha256 = hash(contractDocumentRaw);
const formalSourcePath = resolve(
  repositoryRoot,
  CONTRACT.sourceIdentity.formalSource.relativePath,
);
const proDecisionPath = resolve(
  repositoryRoot,
  CONTRACT.sourceIdentity.proDecision.relativePath,
);
const shadowLedgerPath = resolve(
  repositoryRoot,
  CONTRACT.sourceIdentity.reusedShadowLedger.relativePath,
);
if (await sha256(formalSourcePath) !== CONTRACT.sourceIdentity.formalSource.sha256) {
  throw new Error("formal LBM source hash does not match frozen A8N contract");
}
if (await sha256(proDecisionPath) !== CONTRACT.sourceIdentity.proDecision.sha256) {
  throw new Error("Pro decision hash does not match frozen A8N contract");
}
if (await sha256(shadowLedgerPath)
  !== CONTRACT.sourceIdentity.reusedShadowLedger.sha256) {
  throw new Error("shadow ledger hash does not match frozen A8N contract");
}

const a8mStoredRaw = await readFile(a8mPath);
if (hash(a8mStoredRaw) !== CONTRACT.sourceIdentity.a8mEvidence.storedSha256) {
  throw new Error("A8M stored artifact hash does not match frozen A8N contract");
}
const a8mCanonicalRaw = gunzipSync(a8mStoredRaw);
if (hash(a8mCanonicalRaw) !== CONTRACT.sourceIdentity.a8mEvidence.canonicalSha256) {
  throw new Error("A8M canonical artifact hash does not match frozen A8N contract");
}
const a8m = JSON.parse(a8mCanonicalRaw.toString("utf8"));
const a8mStartup = a8m.startupCases.filter((entry) =>
  entry.definition.strategy === "legacy-zou-he-derived-density");
const a8mAcoustic = a8m.acousticCases.filter((entry) =>
  entry.definition.strategy === "legacy-zou-he-derived-density");
if (a8mStartup.length
  !== CONTRACT.sourceIdentity.a8mEvidence.exactLegacyStartupAnchors) {
  throw new Error("A8M legacy startup anchor count does not match A8N contract");
}
if (a8mAcoustic.length
  !== CONTRACT.sourceIdentity.a8mEvidence.exactLegacyAcousticAnchors) {
  throw new Error("A8M legacy acoustic anchor count does not match A8N contract");
}

const provenance = {
  formalSourceSha256: CONTRACT.sourceIdentity.formalSource.sha256,
  proDecisionSha256: CONTRACT.sourceIdentity.proDecision.sha256,
  a8mStoredArtifactSha256: CONTRACT.sourceIdentity.a8mEvidence.storedSha256,
  a8mCanonicalArtifactSha256: CONTRACT.sourceIdentity.a8mEvidence.canonicalSha256,
  shadowLedgerSourceSha256: CONTRACT.sourceIdentity.reusedShadowLedger.sha256,
  contractSha256,
  contractDocumentSha256,
  contractCommit,
  implementationCommit,
  implementationTreeSha256: await implementationTreeSha256(),
};
const result = runIncomingCharacteristicQualification(
  a8mStartup,
  a8mAcoustic,
  provenance,
  (progress) => {
    if (progress.completed % 2 === 0 || progress.completed === progress.total) {
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
  storedSha256: hash(await readFile(outputPath)),
  canonicalSha256: hash(canonicalJson),
  contractCommit,
  implementationCommit,
  implementationTreeSha256: provenance.implementationTreeSha256,
  legacyAnchorComparison: result.legacyAnchorComparison,
  qualification: result.qualification,
  evidenceDecision: result.evidenceDecision,
  candidateDecision: result.candidateDecision,
}, null, 2));
if (!result.evidenceDecision.pass) process.exitCode = 2;
