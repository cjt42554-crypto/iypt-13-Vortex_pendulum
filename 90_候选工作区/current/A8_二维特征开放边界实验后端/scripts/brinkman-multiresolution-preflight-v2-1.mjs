import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, extname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT } from
  "../src/brinkman-multiresolution-contract-v2-1.ts";
import {
  BRINKMAN_MULTIRESOLUTION_V2P1_P1_IDENTITY as P1_IDENTITY,
} from "../src/brinkman-multiresolution-p1-v2-1.ts";
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
const NO_RESULT_IMPLEMENTATION_IDENTITY_PATH = CANDIDATE_ROOT
  + "/src/brinkman-multiresolution-v2-1.ts";
const P1_IDENTITY_PATH = CANDIDATE_ROOT
  + "/src/brinkman-multiresolution-p1-v2-1.ts";
const P1_REPAIR_REVIEW_PATH = P1_IDENTITY.repairReview.relativePath;
const SMOKE_UNLOCK_REVIEW_PATH = P1_IDENTITY.smokeUnlockReview.relativePath;

/** Result-bearing package entries whose complete local static imports matter. */
export const RESULT_RUNTIME_ENTRY_PATHS = Object.freeze([
  CANDIDATE_ROOT + "/scripts/run-brinkman-multiresolution-v2-1.mjs",
  CANDIDATE_ROOT
    + "/scripts/assert-brinkman-multiresolution-v2-1-artifact.mjs",
  CANDIDATE_ROOT
    + "/scripts/assert-brinkman-multiresolution-repeat-v2-1.mjs",
  CANDIDATE_ROOT
    + "/scripts/run-brinkman-multiresolution-smoke-v2-1.mjs",
  CANDIDATE_ROOT
    + "/scripts/assert-brinkman-multiresolution-smoke-v2-1.mjs",
].sort());

/** Non-imported bytes that still define installation, LFS, and P1 evidence. */
export const IMPLEMENTATION_AUDIT_PATHS = Object.freeze([
  CANDIDATE_ROOT + "/.gitattributes",
  CANDIDATE_ROOT + "/package.json",
  CANDIDATE_ROOT + "/package-lock.json",
  CANDIDATE_ROOT + "/tsconfig.json",
  CANDIDATE_ROOT
    + "/tests/brinkman-multiresolution-contract-v2-1.test.ts",
  CANDIDATE_ROOT
    + "/tests/brinkman-multiresolution-support-v2-1.test.ts",
  CANDIDATE_ROOT
    + "/tests/brinkman-multiresolution-artifact-v2-1.test.ts",
  CANDIDATE_ROOT + "/tests/brinkman-multiresolution-v2-1.test.ts",
  CANDIDATE_ROOT + "/tests/brinkman-multiresolution-p1-v2-1.test.ts",
  CANDIDATE_ROOT + "/tests/brinkman-multiresolution-smoke-v2-1.test.ts",
  SMOKE_UNLOCK_REVIEW_PATH,
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

function gitObjectExists(commit, path) {
  try {
    git(["cat-file", "-e", commit + ":" + path]);
    return true;
  } catch {
    return false;
  }
}

function readAtCommit(commit, path, encoding = null) {
  if (!gitObjectExists(commit, path)) {
    throw new Error(
      `A8R v2.1 missing identity path at ${commit}: ${path}`,
    );
  }
  return git(["show", commit + ":" + path], encoding);
}

export function treeHashAtCommit(commit, paths) {
  const digest = createHash("sha256");
  for (const path of [...paths].sort()) {
    digest.update(path);
    digest.update("\0");
    digest.update(readAtCommit(commit, path));
    digest.update("\0");
  }
  return digest.digest("hex");
}

function scriptKindFor(path) {
  if (path.endsWith(".ts") || path.endsWith(".mts")) {
    return ts.ScriptKind.TS;
  }
  if (path.endsWith(".cts")) return ts.ScriptKind.TS;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function staticModuleSpecifiers(sourceText, sourcePath) {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(sourcePath),
  );
  const specifiers = [];
  for (const statement of sourceFile.statements) {
    if ((ts.isImportDeclaration(statement)
      || ts.isExportDeclaration(statement))
      && statement.moduleSpecifier !== undefined
      && ts.isStringLiteralLike(statement.moduleSpecifier)) {
      specifiers.push(statement.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(statement)
      && ts.isExternalModuleReference(statement.moduleReference)
      && statement.moduleReference.expression !== undefined
      && ts.isStringLiteralLike(statement.moduleReference.expression)) {
      specifiers.push(statement.moduleReference.expression.text);
    }
  }
  return specifiers;
}

function localImportCandidates(importerPath, specifier) {
  const base = posix.normalize(posix.join(posix.dirname(importerPath), specifier));
  const extension = extname(base);
  if (extension !== "") {
    const candidates = [base];
    if ([".js", ".mjs", ".cjs"].includes(extension)) {
      candidates.push(base.slice(0, -extension.length) + ".ts");
      candidates.push(base.slice(0, -extension.length) + ".mts");
      candidates.push(base.slice(0, -extension.length) + ".cts");
    }
    return candidates;
  }
  return [
    base + ".ts",
    base + ".mts",
    base + ".cts",
    base + ".mjs",
    base + ".js",
    posix.join(base, "index.ts"),
    posix.join(base, "index.mjs"),
    posix.join(base, "index.js"),
  ];
}

function resolveLocalStaticImport(commit, importerPath, specifier) {
  if (!specifier.startsWith(".")) return null;
  for (const candidate of localImportCandidates(importerPath, specifier)) {
    if (gitObjectExists(commit, candidate)) return candidate;
  }
  throw new Error(
    "A8R v2.1 unresolved local static import at " + commit + ": "
      + importerPath + " -> " + specifier,
  );
}

/**
 * Discover the complete repository-local static import closure at a commit.
 * Bare package imports are bound by package-lock.json instead of node_modules.
 */
export function collectStaticDependencyPathsAtCommit(commit, rootPaths) {
  const pending = [...new Set(rootPaths)].sort().reverse();
  const visited = new Set();
  const parseable = new Set([
    ".ts", ".mts", ".cts", ".js", ".mjs", ".cjs", ".jsx",
  ]);
  while (pending.length > 0) {
    const path = pending.pop();
    if (path === undefined || visited.has(path)) continue;
    if (!gitObjectExists(commit, path)) {
      throw new Error(`A8R v2.1 static dependency root is absent: ${path}`);
    }
    visited.add(path);
    if (!parseable.has(extname(path))) continue;
    const source = readAtCommit(commit, path, "utf8");
    for (const specifier of staticModuleSpecifiers(source, path)) {
      const dependency = resolveLocalStaticImport(commit, path, specifier);
      if (dependency !== null && !visited.has(dependency)) {
        pending.push(dependency);
      }
    }
  }
  return [...visited].sort();
}

export function implementationTreePathsAtCommit(commit) {
  const paths = new Set(collectStaticDependencyPathsAtCommit(
    commit,
    RESULT_RUNTIME_ENTRY_PATHS,
  ));
  for (const path of IMPLEMENTATION_AUDIT_PATHS) {
    if (!gitObjectExists(commit, path)) {
      throw new Error(`A8R v2.1 P1 audit path is absent: ${path}`);
    }
    paths.add(path);
  }
  return [...paths].sort();
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
  const frozen = readAtCommit(commit, path);
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

async function assertRepairReviewCodes() {
  const text = await readFile(resolve(REPOSITORY_ROOT, P1_REPAIR_REVIEW_PATH), "utf8");
  const review = P1_IDENTITY.repairReview;
  for (const code of [
    review.acceptedCoreCode,
    review.rejectExecutionCode,
    review.requiredRepairCode,
    review.lockCode,
  ]) {
    if (!text.includes(code)) {
      throw new Error(`A8R v2.1 P1 repair review lacks required code: ${code}`);
    }
  }
}

async function assertSmokeUnlockReviewCodes() {
  const text = await readFile(
    resolve(REPOSITORY_ROOT, SMOKE_UNLOCK_REVIEW_PATH),
    "utf8",
  );
  const review = P1_IDENTITY.smokeUnlockReview;
  for (const code of [
    review.acceptedCode,
    review.unlockCode,
    review.requiredCode,
    review.lockCode,
  ]) {
    if (!text.includes(code)) {
      throw new Error(
        `A8R v2.1 smoke-unlock review lacks required code: ${code}`,
      );
    }
  }
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
  const noResultImplementationCommit =
    P1_IDENTITY.noResultImplementationCommit;
  if (!gitObjectExists(
    noResultImplementationCommit,
    NO_RESULT_IMPLEMENTATION_IDENTITY_PATH,
  )) {
    throw new Error("A8R v2.1 no-result implementation identity is absent");
  }
  const p1RepairReviewCommit = lastCommit(P1_REPAIR_REVIEW_PATH);
  if (p1RepairReviewCommit !== P1_IDENTITY.repairReview.commit) {
    throw new Error("A8R v2.1 P1 repair-review commit identity mismatch");
  }
  const p1ImplementationCommit = P1_IDENTITY.p1ImplementationCommit;
  if (!gitObjectExists(p1ImplementationCommit, P1_IDENTITY_PATH)) {
    throw new Error("A8R v2.1 P1 implementation identity is absent");
  }
  const smokeUnlockReviewCommit = lastCommit(SMOKE_UNLOCK_REVIEW_PATH);
  if (smokeUnlockReviewCommit !== P1_IDENTITY.smokeUnlockReview.commit) {
    throw new Error("A8R v2.1 smoke-unlock review commit identity mismatch");
  }
  const implementationCommit = lastCommit(P1_IDENTITY_PATH);
  if (implementationCommit === ""
    || [
      contractCommit,
      contractTestCommit,
      implementationUnlockReviewCommit,
      noResultImplementationCommit,
      p1RepairReviewCommit,
      p1ImplementationCommit,
      smokeUnlockReviewCommit,
    ].includes(implementationCommit)) {
    throw new Error("A8R v2.1 smoke implementation commit is not independent");
  }

  ensureAncestor(contractCommit, contractTestCommit, "contract-to-test");
  ensureAncestor(
    contractTestCommit,
    implementationUnlockReviewCommit,
    "test-to-unlock-review",
  );
  ensureAncestor(
    implementationUnlockReviewCommit,
    noResultImplementationCommit,
    "unlock-review-to-no-result-implementation",
  );
  ensureAncestor(
    noResultImplementationCommit,
    p1RepairReviewCommit,
    "no-result-implementation-to-P1-review",
  );
  ensureAncestor(
    p1RepairReviewCommit,
    p1ImplementationCommit,
    "P1-review-to-P1-implementation",
  );
  ensureAncestor(
    p1ImplementationCommit,
    smokeUnlockReviewCommit,
    "P1-implementation-to-smoke-review",
  );
  ensureAncestor(
    smokeUnlockReviewCommit,
    implementationCommit,
    "smoke-review-to-smoke-implementation",
  );
  ensureAncestor(implementationCommit, head, "smoke-implementation-to-HEAD");
  for (const [commit, label] of [
    [contractCommit, "contract-pushed"],
    [contractTestCommit, "contract-test-pushed"],
    [implementationUnlockReviewCommit, "unlock-review-pushed"],
    [noResultImplementationCommit, "no-result-implementation-pushed"],
    [p1RepairReviewCommit, "P1-review-pushed"],
    [p1ImplementationCommit, "P1-implementation-pushed"],
    [smokeUnlockReviewCommit, "smoke-review-pushed"],
    [implementationCommit, "smoke-implementation-pushed"],
  ]) {
    ensureAncestor(commit, remoteMain, label);
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
  await verifyExactInput(
    P1_REPAIR_REVIEW_PATH,
    P1_IDENTITY.repairReview.sha256,
    p1RepairReviewCommit,
    "P1 repair review",
  );
  await assertRepairReviewCodes();
  await verifyExactInput(
    SMOKE_UNLOCK_REVIEW_PATH,
    P1_IDENTITY.smokeUnlockReview.sha256,
    smokeUnlockReviewCommit,
    "smoke unlock review",
  );
  await assertSmokeUnlockReviewCodes();

  const implementationTreePaths = implementationTreePathsAtCommit(
    implementationCommit,
  );
  for (const path of implementationTreePaths) {
    await assertWorkingMatchesCommit(
      path,
      implementationCommit,
      "P1 implementation tree",
    );
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

  // Preserve the contract's legacy A8Q tree check and additionally bind every
  // A8Q dependency reachable from the A8R P1 runtime through the static graph.
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
    implementationTreePaths,
  );
  return {
    packageRoot: PACKAGE_ROOT,
    repositoryRoot: REPOSITORY_ROOT,
    implementationCommit,
    implementationTreeSha256,
    implementationTreePaths,
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
      p1RepairReviewSha256: P1_IDENTITY.repairReview.sha256,
      smokeUnlockReviewSha256: P1_IDENTITY.smokeUnlockReview.sha256,
      frozenA8qStoredSha256: anchorLoaded.identity.storedSha256,
      frozenA8qCanonicalSha256: anchorLoaded.identity.canonicalSha256,
      frozenA8qSidecarSha256: anchorLoaded.identity.sidecarSha256,
      frozenSourceSha256,
      sourceHashesVerified: true,
      contractCommit,
      contractTestCommit,
      implementationUnlockReviewCommit,
      noResultImplementationCommit,
      p1RepairReviewCommit,
      p1ImplementationCommit,
      smokeUnlockReviewCommit,
      implementationCommit,
      implementationTreeSha256,
      implementationTreePathCount: implementationTreePaths.length,
      implementationTreePaths,
    },
  };
}
