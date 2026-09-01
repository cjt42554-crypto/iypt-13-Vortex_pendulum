import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { canonicalSha256, immutableJsonClone, sha256 } from "./canonical.mjs";

const execFile = promisify(execFileCallback);

export const HW2_IMPLEMENTATION_PATHS = Object.freeze([
  "90_候选工作区/current/H1_硬件利用与执行架构/package.json",
  "90_候选工作区/current/H1_硬件利用与执行架构/contracts/h1-machine-contract.v2.json",
  "90_候选工作区/current/H1_硬件利用与执行架构/contracts/hw2-qualification-protocol.v1.json",
  "90_候选工作区/current/H1_硬件利用与执行架构/native/hw2_synthetic_probe.c",
  "90_候选工作区/current/H1_硬件利用与执行架构/scripts/build-hw2-native.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/scripts/hw2-worker.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/scripts/run-hw2-qualification.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/hw2-candidates.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/hw2-js-execution.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/hw2-measurement.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/hw2-native-execution.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/hw2-preflight.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/hw2-protocol.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/hw2-qualification.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/hw2-telemetry.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/hw2-workload.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/backend.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/canonical.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/contract.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/inventory.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/linux-host.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/planner.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/probe-protocol.mjs",
  "90_候选工作区/current/H1_硬件利用与执行架构/src/provenance.mjs",
]);

async function git(repoRoot, args) {
  const {stdout} = await execFile("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.trim();
}

function fail(message) {
  throw new Error(`NO-GO-HW2-PREFLIGHT: ${message}`);
}

export async function assertHw2CommittedPreflight({repoRoot}) {
  const root = resolve(repoRoot);
  const [branch, head, remote, status, tracked] = await Promise.all([
    git(root, ["branch", "--show-current"]),
    git(root, ["rev-parse", "HEAD"]),
    git(root, ["rev-parse", "origin/main"]),
    git(root, ["status", "--porcelain=v1", "--untracked-files=all"]),
    git(root, ["ls-files", "--", ...HW2_IMPLEMENTATION_PATHS]),
  ]);
  if (branch !== "main") fail(`branch is ${branch}, not main`);
  if (head !== remote) fail(`HEAD ${head} differs from origin/main ${remote}`);
  if (status !== "") fail("worktree is not clean");
  const trackedSet = new Set(tracked.split(/\r?\n/u).filter(Boolean));
  const missing = HW2_IMPLEMENTATION_PATHS.filter((path) => !trackedSet.has(path));
  if (missing.length > 0) fail(`implementation paths are not committed: ${missing.join(",")}`);
  const files = [];
  for (const path of HW2_IMPLEMENTATION_PATHS) {
    const bytes = await readFile(resolve(root, path));
    files.push({path, sha256: sha256(bytes)});
  }
  files.sort((a, b) => a.path.localeCompare(b.path, "en"));
  const implementationHash = canonicalSha256({sourceCommit: head, files});
  const dependencyHash = canonicalSha256({
    package: files.find((entry) => entry.path.endsWith("/package.json")),
    node: process.version,
    v8: process.versions.v8,
  });
  return immutableJsonClone({
    classification: "PASS-HW2-CANDIDATE-CODE-COMMITTED-BEFORE-PERFORMANCE-OBSERVATION",
    branch,
    sourceCommit: head,
    originMain: remote,
    worktreeClean: true,
    implementationFiles: files,
    implementationHash,
    dependencyHash,
  });
}
