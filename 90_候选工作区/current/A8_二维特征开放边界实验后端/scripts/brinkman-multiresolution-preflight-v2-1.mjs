import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT } from
  "../src/brinkman-multiresolution-contract-v2-1.ts";
import { BRINKMAN_MULTIRESOLUTION_V2P1_IMPLEMENTATION_INPUTS as INPUTS } from
  "../src/brinkman-multiresolution-support-v2-1.ts";
import { loadFrozenA8qD24AnchorRuns } from
  "./brinkman-multiresolution-artifact-v2-1.mjs";

export const PACKAGE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "../../..");
export const CANDIDATE_ROOT =
  "90_候选工作区/current/A8_二维特征开放边界实验后端";

const CONTRACT_DOCUMENT_PATH = INPUTS.contract.document.relativePath;
const MACHINE_CONTRACT_PATH = INPUTS.contract.machine.relativePath;
const CONTRACT_TEST_PATH = INPUTS.contractTest.relativePath;
const UNLOCK_REVIEW_PATH = INPUTS.implementationUnlockReview.relativePath;

export const SCIENTIFIC_IMPLEMENTATION_PATHS = Object.freeze([
  CANDIDATE_ROOT + "/src/brinkman-multiresolution-support-v2-1.ts",
  CANDIDATE_ROOT + "/src/brinkman-multiresolution-runs-v2-1.ts",
  CANDIDATE_ROOT + "/src/brinkman-multiresolution-v2-1.ts",
].sort());

export const IMPLEMENTATION_PATHS = Object.freeze([
  ...SCIENTIFIC_IMPLEMENTATION_PATHS,
  CANDIDATE_ROOT + "/scripts/brinkman-multiresolution-artifact-v2-1.mjs",
  CANDIDATE_ROOT + "/scripts/brinkman-multiresolution-preflight-v2-1.mjs",
  CANDIDATE_ROOT + "/scripts/run-brinkman-multiresolution-v2-1.mjs",
  CANDIDATE_ROOT + "/scripts/assert-brinkman-multiresolution-v2-1-artifact.mjs",
  CANDIDATE_ROOT + "/tests/brinkman-multiresolution-support-v2-1.test.ts",
  CANDIDATE_ROOT + "/tests/brinkman-multiresolution-artifact-v2-1.test.ts",
  CANDIDATE_ROOT + "/tests/brinkman-multiresolution-v2-1.test.ts",
  CANDIDATE_ROOT + "/.gitattributes",
  CANDIDATE_ROOT + "/package.json",
].sort());

const FROZEN_RUNTIME_DEPENDENCY_PATHS = Object.freeze([
  CANDIDATE_ROOT + "/scripts/formal-causal-reference-artifact-stream.mjs",
].sort());

export const IMPLEMENTATION_TREE_PATHS = Object.freeze([
  ...IMPLEMENTATION_PATHS,
  ...FROZEN_RUNTIME_DEPENDENCY_PATHS,
].sort());

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256(path) {
  return hash(await readFile(path));
}

export function git(args, encoding = "utf8") {
  return execFileSync("git", args, {
    cwd: REPOSITORY_ROOT,
    encoding,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function lastCommit(path) {
  return git(["log", "-1", "--format=%H", "--", path]).trim();
}

function ensureAncestor(ancestor, descendant, label) {
  try {
    git(["merge-base", "--is-ancestor", ancestor, descendant]);
  } catch {
    throw new Error(`A8R v2.1 ${label} ancestry gate failed`);
  }
}

function treeHashAtCommit(commit, paths) {
  const digest = createHash("sha256");
  for (const path of paths) {
    digest.update(path);
    digest.update("\0");
    digest.update(git(["show", commit + ":" + path], null));
    digest.update("\0");
  }
  return digest.digest("hex");
}

function a8qTreePaths() {
  const frozen = CONTRACT.sourceIdentity.frozenA8q;
  return [
    frozen.runs.relativePath,
    frozen.support.relativePath,
    frozen.qualification.relativePath,
    frozen.runner.relativePath,
    frozen.artifactAsserter.relativePath,
    CANDIDATE_ROOT + "/tests/brinkman-scaling-support.test.ts",
    CANDIDATE_ROOT + "/.gitattributes",
    CANDIDATE_ROOT + "/package.json",
    CANDIDATE_ROOT + "/scripts/formal-causal-reference-artifact-stream.mjs",
  ].sort();
}

function sourceShaEntries(value, entries = new Map()) {
  if (value === null || typeof value !== "object") return entries;
  if (typeof value.relativePath === "string"
    && typeof value.sha256 === "string") {
    const existing = entries.get(value.relativePath);
    if (existing !== undefined && existing.sha256 !== value.sha256) {
      throw new Error(
        "A8R v2.1 conflicting frozen SHA-256 for " + value.relativePath,
      );
    }
    entries.set(value.relativePath, {
      relativePath: value.relativePath,
      sha256: value.sha256,
    });
  }
  for (const nested of Object.values(value)) {
    sourceShaEntries(nested, entries);
  }
  return entries;
}

async function assertWorkingMatchesCommit(path, commit, label) {
  const working = await readFile(resolve(REPOSITORY_ROOT, path));
  const frozen = git(["show", commit + ":" + path], null);
  if (Buffer.compare(working, frozen) !== 0) {
    throw new Error(`A8R v2.1 working ${label} differs from frozen: ${path}`);
  }
}

async function verifyExactInput(path, expectedSha256, commit, label) {
  const actual = await sha256(resolve(REPOSITORY_ROOT, path));
  if (actual !== expectedSha256) {
    throw new Error(`A8R v2.1 ${label} SHA-256 mismatch: ${path}`);
  }
  await assertWorkingMatchesCommit(path, commit, label);
  return actual;
}

async function assertExactLfsRule() {
  const attributesPath = resolve(PACKAGE_ROOT, ".gitattributes");
  const expected = CONTRACT.artifact.relativePath
    + " filter=lfs diff=lfs merge=lfs -text";
  const lines = (await readFile(attributesPath, "utf8"))
    .split(/\r?\n/)
    .filter((line) => line === expected);
  if (lines.length !== 1) {
    throw new Error("A8R v2.1 exact artifact LFS rule must occur once");
  }
  const repositoryPath = CANDIDATE_ROOT + "/" + CONTRACT.artifact.relativePath;
  const attribute = git(["check-attr", "filter", "--", repositoryPath]);
  if (!attribute.trim().endsWith(": lfs")) {
    throw new Error("A8R v2.1 artifact path is not governed by Git LFS");
  }
}

export async function verifyBrinkmanMultiresolutionV2P1Preflight(
  { requireCleanWorktree = true } = {},
) {
  if (requireCleanWorktree
    && git(["status", "--porcelain=v1"]).trim() !== "") {
    throw new Error("A8R v2.1 execution requires a clean worktree");
  }
  const head = git(["rev-parse", "HEAD"]).trim();
  const remoteMain = git(["rev-parse", "origin/main"]).trim();
  if (head !== remoteMain) {
    throw new Error("A8R v2.1 requires HEAD exactly equal to origin/main");
  }

  const contractCommit = lastCommit(MACHINE_CONTRACT_PATH);
  if (contractCommit !== INPUTS.contract.commit
    || lastCommit(CONTRACT_DOCUMENT_PATH) !== contractCommit) {
    throw new Error("A8R v2.1 Markdown and machine contracts are not frozen together");
  }
  const contractTestCommit = lastCommit(CONTRACT_TEST_PATH);
  if (contractTestCommit !== INPUTS.contractTest.commit) {
    throw new Error("A8R v2.1 contract-test commit identity mismatch");
  }
  const implementationUnlockReviewCommit = lastCommit(UNLOCK_REVIEW_PATH);
  if (implementationUnlockReviewCommit
    !== INPUTS.implementationUnlockReview.commit) {
    throw new Error("A8R v2.1 implementation-unlock review commit mismatch");
  }
  const implementationCommit = lastCommit(SCIENTIFIC_IMPLEMENTATION_PATHS[0]);
  if (implementationCommit === ""
    || [contractCommit, contractTestCommit, implementationUnlockReviewCommit]
      .includes(implementationCommit)) {
    throw new Error("A8R v2.1 no-result implementation commit is not independent");
  }
  ensureAncestor(contractCommit, contractTestCommit, "contract-to-test");
  ensureAncestor(
    contractTestCommit,
    implementationUnlockReviewCommit,
    "test-to-unlock-review",
  );
  ensureAncestor(
    implementationUnlockReviewCommit,
    implementationCommit,
    "unlock-review-to-implementation",
  );
  ensureAncestor(implementationCommit, head, "implementation-to-HEAD");
  ensureAncestor(contractCommit, remoteMain, "contract-pushed");
  ensureAncestor(contractTestCommit, remoteMain, "contract-test-pushed");
  ensureAncestor(
    implementationUnlockReviewCommit,
    remoteMain,
    "unlock-review-pushed",
  );
  ensureAncestor(implementationCommit, remoteMain, "implementation-pushed");
  for (const path of IMPLEMENTATION_PATHS) {
    if (lastCommit(path) !== implementationCommit) {
      throw new Error(
        "A8R v2.1 implementation paths must share one commit: " + path,
      );
    }
  }

  await verifyExactInput(
    CONTRACT_DOCUMENT_PATH,
    INPUTS.contract.document.sha256,
    contractCommit,
    "contract document",
  );
  await verifyExactInput(
    MACHINE_CONTRACT_PATH,
    INPUTS.contract.machine.sha256,
    contractCommit,
    "machine contract",
  );
  await verifyExactInput(
    CONTRACT_TEST_PATH,
    INPUTS.contractTest.sha256,
    contractTestCommit,
    "contract test",
  );
  await verifyExactInput(
    UNLOCK_REVIEW_PATH,
    INPUTS.implementationUnlockReview.sha256,
    implementationUnlockReviewCommit,
    "implementation unlock review",
  );
  for (const path of IMPLEMENTATION_TREE_PATHS) {
    await assertWorkingMatchesCommit(path, implementationCommit, "implementation tree");
  }
  await assertExactLfsRule();

  const frozenSourceSha256 = {};
  const ordinaryEntries = [...sourceShaEntries(
    CONTRACT.sourceIdentity,
  ).values()];
  for (const entry of ordinaryEntries) {
    const actual = await sha256(resolve(REPOSITORY_ROOT, entry.relativePath));
    if (actual !== entry.sha256) {
      throw new Error(
        "A8R v2.1 frozen source SHA-256 mismatch: " + entry.relativePath,
      );
    }
    frozenSourceSha256[entry.relativePath] = actual;
  }
  const a8qImplementationCommit = CONTRACT.sourceIdentity.frozenA8q
    .commits.implementation;
  const a8qTreeSha256 = treeHashAtCommit(
    a8qImplementationCommit,
    a8qTreePaths(),
  );
  if (a8qTreeSha256
    !== CONTRACT.sourceIdentity.frozenA8q.implementationTreeSha256) {
    throw new Error("A8R v2.1 frozen A8Q implementation tree mismatch");
  }
  const anchorLoaded = await loadFrozenA8qD24AnchorRuns(REPOSITORY_ROOT);
  const implementationTreeSha256 = treeHashAtCommit(
    implementationCommit,
    IMPLEMENTATION_TREE_PATHS,
  );
  return {
    packageRoot: PACKAGE_ROOT,
    repositoryRoot: REPOSITORY_ROOT,
    implementationCommit,
    implementationTreeSha256,
    anchor: {
      identity: anchorLoaded.identity,
      runsById: anchorLoaded.runsById,
    },
    provenance: {
      formalSourceSha256: CONTRACT.sourceIdentity.formalSource.sha256,
      contractDocumentSha256: INPUTS.contract.document.sha256,
      machineContractSha256: INPUTS.contract.machine.sha256,
      contractTestSha256: INPUTS.contractTest.sha256,
      implementationUnlockReviewSha256:
        INPUTS.implementationUnlockReview.sha256,
      frozenA8qStoredSha256: anchorLoaded.identity.storedSha256,
      frozenA8qCanonicalSha256: anchorLoaded.identity.canonicalSha256,
      frozenA8qSidecarSha256: anchorLoaded.identity.sidecarSha256,
      frozenSourceSha256,
      sourceHashesVerified: true,
      contractCommit,
      contractTestCommit,
      implementationUnlockReviewCommit,
      implementationCommit,
      implementationTreeSha256,
    },
  };
}
