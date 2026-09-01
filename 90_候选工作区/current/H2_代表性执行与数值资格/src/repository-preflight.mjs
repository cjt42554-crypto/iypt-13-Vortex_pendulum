import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { assertHw2rFormalObservationAuthorized } from
  "../../H1_硬件利用与执行架构/src/hw2r-pre-observation.mjs";
import { H2_REPOSITORY_ROOT } from "./contract.mjs";

const CURRENT_ROOT = "90_候选工作区/current";
const H1_ROOT = `${CURRENT_ROOT}/H1_硬件利用与执行架构`;
const H2_ROOT = `${CURRENT_ROOT}/H2_代表性执行与数值资格`;
const SHARED_ROOT = `${CURRENT_ROOT}/_shared`;

const SHARED_RUNTIME_PATHS = Object.freeze([
  `${SHARED_ROOT}/src`,
]);

const H2_COMMON_RUNTIME_PATHS = Object.freeze([
  `${H2_ROOT}/src/contract.mjs`,
  `${H2_ROOT}/src/repository-preflight.mjs`,
  ...SHARED_RUNTIME_PATHS,
]);

export const H2X_IMPLEMENTATION_PATHS = Object.freeze([
  `${H2_ROOT}/contracts/h2x-exact-execution-equivalence.v1.json`,
  `${H2_ROOT}/contracts/h2x-exact-execution-equivalence.v1.schema.json`,
  `${H2_ROOT}/scripts/h2x-case-worker.mjs`,
  `${H2_ROOT}/scripts/run-h2x-qualification.mjs`,
  `${H2_ROOT}/scripts/run-h2x-three-environment-qualification.mjs`,
  `${H2_ROOT}/src/aggregator.mjs`,
  `${H2_ROOT}/src/definitions.mjs`,
  `${H2_ROOT}/src/h2x-oracle.mjs`,
  `${H2_ROOT}/src/process-executor.mjs`,
  `${H2_ROOT}/src/scheduler.mjs`,
  `${H2_ROOT}/src/shard.mjs`,
  ...H2_COMMON_RUNTIME_PATHS,
]);

export const H2N_STAGE0_IMPLEMENTATION_PATHS = Object.freeze([
  `${H2_ROOT}/contracts/h2n-numerical-backend-qualification.v1.json`,
  `${H2_ROOT}/contracts/h2n-numerical-backend-qualification.v1.schema.json`,
  `${H2_ROOT}/native/h2n_stage0.c`,
  `${H2_ROOT}/native/h2n_stage0.cl`,
  `${H2_ROOT}/scripts/build-h2n-stage0.mjs`,
  `${H2_ROOT}/scripts/run-h2n-stage0-numerical.mjs`,
  `${H2_ROOT}/src/h2n-stage0-metrics.mjs`,
  `${H2_ROOT}/src/h2n-stage0-native.mjs`,
  `${H2_ROOT}/src/h2n-stage0-reference.mjs`,
  `${H2_ROOT}/src/h2n-stage0-runner.mjs`,
  ...H2_COMMON_RUNTIME_PATHS,
]);

export const HW2R_IMPLEMENTATION_PATHS = Object.freeze([
  `${H1_ROOT}/contracts/hw2-representative-qualification-protocol.v2.json`,
  `${H1_ROOT}/contracts/hw2-representative-qualification-protocol.v2.schema.json`,
  `${H1_ROOT}/contracts/hw2r-pre-observation-readiness.v1.json`,
  `${H1_ROOT}/scripts/hw2r-js-case-worker.mjs`,
  `${H1_ROOT}/scripts/run-hw2r-qualification-v2.mjs`,
  `${H1_ROOT}/src/hw2-telemetry.mjs`,
  `${H1_ROOT}/src/hw2r-affinity.mjs`,
  `${H1_ROOT}/src/hw2r-calibration.mjs`,
  `${H1_ROOT}/src/hw2r-candidates.mjs`,
  `${H1_ROOT}/src/hw2r-contract.mjs`,
  `${H1_ROOT}/src/hw2r-evaluator.mjs`,
  `${H1_ROOT}/src/hw2r-executors.mjs`,
  `${H1_ROOT}/src/hw2r-finalization.mjs`,
  `${H1_ROOT}/src/hw2r-measurement.mjs`,
  `${H1_ROOT}/src/hw2r-pre-observation.mjs`,
  `${H1_ROOT}/src/hw2r-telemetry.mjs`,
  `${H1_ROOT}/src/hw2r-utilization.mjs`,
  `${H1_ROOT}/src/linux-host.mjs`,
  ...H2N_STAGE0_IMPLEMENTATION_PATHS,
]);

export const HW2_FINALIZATION_IMPLEMENTATION_PATHS = Object.freeze([
  ...HW2R_IMPLEMENTATION_PATHS,
  ...H2X_IMPLEMENTATION_PATHS,
  `${H2_ROOT}/src/h2n-full-evidence.mjs`,
  `${H1_ROOT}/scripts/finalize-hw2-selection.mjs`,
]);

async function capture(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? H2_REPOSITORY_ROOT,
    env: { ...process.env, LC_ALL: "C", ...(options.env ?? {}) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const { code, signal } = await new Promise((accept, reject) => {
    child.once("error", reject);
    child.once("exit", (exitCode, exitSignal) => accept({
      code: exitCode,
      signal: exitSignal,
    }));
  });
  if (code !== 0 || signal !== null) {
    throw new Error(
      `preflight command failed: ${command} ${args.join(" ")}; `
        + `code=${code}; signal=${signal}; `
        + Buffer.concat(stderr).toString("utf8"),
    );
  }
  return Buffer.concat(stdout).toString("utf8").trim();
}

function parseMeminfo(text) {
  const values = {};
  for (const line of text.split("\n")) {
    const match = /^(MemTotal|MemAvailable|SwapTotal|SwapFree):\s+(\d+)\s+kB$/.exec(line);
    if (match) values[match[1]] = Number(match[2]) * 1024;
  }
  return values;
}

async function currentCgroupPath() {
  const line = (await readFile("/proc/self/cgroup", "utf8"))
    .split("\n")
    .find((item) => item.startsWith("0::"));
  if (!line) {
    throw new Error(
      "DEFERRED-H2N-TOOLCHAIN-OR-RESOURCE: cgroup-v2 missing",
    );
  }
  return resolve("/sys/fs/cgroup", `.${line.slice(3)}`);
}

async function readMemoryEvents(cgroupPath) {
  const text = await readFile(resolve(cgroupPath, "memory.events"), "utf8");
  return Object.freeze(Object.fromEntries(
    text.trim().split("\n").map((line) => {
      const [key, value] = line.split(" ");
      return [key, Number(value)];
    }),
  ));
}

export async function readQualificationResourceSnapshot() {
  const cgroupPath = await currentCgroupPath();
  const [
    memoryMaxText,
    memoryCurrentText,
    memoryPeakText,
    memoryEvents,
    meminfoText,
  ] = await Promise.all([
    readFile(resolve(cgroupPath, "memory.max"), "utf8"),
    readFile(resolve(cgroupPath, "memory.current"), "utf8"),
    readFile(resolve(cgroupPath, "memory.peak"), "utf8").catch((error) => {
      if (new Set(["ENOENT", "EACCES", "EPERM"]).has(error?.code)) {
        return "0";
      }
      throw error;
    }),
    readMemoryEvents(cgroupPath),
    readFile("/proc/meminfo", "utf8"),
  ]);
  const memoryMax = memoryMaxText.trim() === "max"
    ? Number.POSITIVE_INFINITY
    : Number(memoryMaxText.trim());
  return Object.freeze({
    cgroupPath,
    memoryMax,
    memoryCurrent: Number(memoryCurrentText.trim()),
    memoryPeak: Number(memoryPeakText.trim()),
    memoryEvents,
    meminfo: Object.freeze(parseMeminfo(meminfoText)),
  });
}

export function assertFiniteMemorySafety(contract, snapshot) {
  if (!Number.isFinite(snapshot.memoryMax) || snapshot.memoryMax <= 0
    || !Number.isFinite(snapshot.memoryCurrent)
    || snapshot.memoryCurrent < 0
    || snapshot.memoryCurrent >= snapshot.memoryMax) {
    throw new Error(
      "DEFERRED-H2N-TOOLCHAIN-OR-RESOURCE: finite memory cgroup required",
    );
  }
  const reserve = Math.max(
    contract.safety.systemReserveBytesMinimum,
    contract.safety.systemReserveMemTotalFraction * snapshot.meminfo.MemTotal,
  );
  if (!(snapshot.meminfo.MemAvailable >= reserve)) {
    throw new Error(
      "DEFERRED-H2N-TOOLCHAIN-OR-RESOURCE: system reserve unavailable",
    );
  }
  return Object.freeze({
    pass: true,
    memoryMax: snapshot.memoryMax,
    memoryCurrent: snapshot.memoryCurrent,
    memoryPeak: snapshot.memoryPeak,
    systemReserveRequired: reserve,
    systemMemAvailable: snapshot.meminfo.MemAvailable,
    swapUsed: snapshot.meminfo.SwapTotal - snapshot.meminfo.SwapFree,
    oom: snapshot.memoryEvents.oom ?? 0,
    oomKill: snapshot.memoryEvents.oom_kill ?? 0,
    high: snapshot.memoryEvents.high ?? 0,
  });
}

export function compareResourceSnapshots(contract, before, after) {
  const swapBefore = before.meminfo.SwapTotal - before.meminfo.SwapFree;
  const swapAfter = after.meminfo.SwapTotal - after.meminfo.SwapFree;
  const swapGrowth = swapAfter - swapBefore;
  const oomGrowth = (after.memoryEvents.oom ?? 0)
    - (before.memoryEvents.oom ?? 0);
  const oomKillGrowth = (after.memoryEvents.oom_kill ?? 0)
    - (before.memoryEvents.oom_kill ?? 0);
  const highGrowth = (after.memoryEvents.high ?? 0)
    - (before.memoryEvents.high ?? 0);
  const reserve = Math.max(
    contract.safety.systemReserveBytesMinimum,
    contract.safety.systemReserveMemTotalFraction * after.meminfo.MemTotal,
  );
  const highGrowthMaximum = contract.safety.memoryHighEventGrowthMaximum
    ?? Number.POSITIVE_INFINITY;
  const systemReserveAfterPass = after.meminfo.MemAvailable >= reserve;
  const headroomFraction = contract.safety.candidateHeadroomFraction ?? 0.1;
  const cgroupHeadroomPass = Number.isFinite(after.memoryMax)
    && Number.isFinite(after.memoryPeak)
    && after.memoryPeak * (1 + headroomFraction) < after.memoryMax;
  return Object.freeze({
    pass: swapGrowth <= contract.safety.swapGrowthMaximumBytes
      && oomGrowth <= contract.safety.oomEventGrowthMaximum
      && oomKillGrowth <= contract.safety.oomEventGrowthMaximum
      && highGrowth <= highGrowthMaximum
      && systemReserveAfterPass
      && cgroupHeadroomPass,
    swapGrowth,
    oomGrowth,
    oomKillGrowth,
    highGrowth,
    highGrowthMaximum: Number.isFinite(highGrowthMaximum)
      ? highGrowthMaximum
      : null,
    systemReserveRequired: reserve,
    systemMemAvailableAfter: after.meminfo.MemAvailable,
    systemReserveAfterPass,
    memoryPeakAfter: after.memoryPeak,
    memoryMax: after.memoryMax,
    headroomFraction,
    cgroupHeadroomPass,
  });
}

async function activeResultBearingProcesses() {
  const entries = await readdir("/proc", { withFileTypes: true });
  const patterns = [
    "run-brinkman-multiresolution-v2-1",
    "run-a8r-v2p1",
    "FORMAL_A8R",
    "HW1-primary",
    "HW1-repeat",
  ];
  const matches = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)
      || Number(entry.name) === process.pid) continue;
    try {
      const bytes = await readFile(`/proc/${entry.name}/cmdline`);
      const command = bytes.toString("utf8").replaceAll("\0", " ").trim();
      if (patterns.some((pattern) => command.includes(pattern))) {
        matches.push(Object.freeze({
          pid: Number(entry.name),
          command,
        }));
      }
    } catch (error) {
      if (!new Set(["ENOENT", "EACCES", "EPERM"]).has(error?.code)) {
        throw error;
      }
    }
  }
  return Object.freeze(matches);
}

export async function assertCleanMainParityAndIdentity(paths) {
  if (paths === HW2R_IMPLEMENTATION_PATHS
    || paths === HW2_FINALIZATION_IMPLEMENTATION_PATHS) {
    await assertHw2rFormalObservationAuthorized();
  }
  const [
    branch,
    head,
    originMain,
    status,
    treeListing,
    implementationCommit,
    active,
  ] = await Promise.all([
    capture("git", ["branch", "--show-current"]),
    capture("git", ["rev-parse", "HEAD"]),
    capture("git", ["rev-parse", "origin/main"]),
    capture("git", ["status", "--porcelain=v1", "--untracked-files=all"]),
    capture("git", ["ls-tree", "-r", "--full-tree", "HEAD", "--", ...paths]),
    capture("git", ["log", "-1", "--format=%H", "--", ...paths]),
    activeResultBearingProcesses(),
  ]);
  if (branch !== "main" || head !== originMain || status !== "") {
    throw new Error(
      "INCONCLUSIVE-H2X-RESOURCE-OR-TOOLCHAIN: clean main parity required",
    );
  }
  if (active.length > 0) {
    throw new Error(
      "INCONCLUSIVE-H2X-RESOURCE-OR-TOOLCHAIN: "
        + `active result-bearing process ${active[0].pid}`,
    );
  }
  if (!/^[0-9a-f]{40}$/.test(implementationCommit)) {
    throw new Error(
      "INCONCLUSIVE-H2X-RESOURCE-OR-TOOLCHAIN: implementation commit missing",
    );
  }
  return Object.freeze({
    branch,
    executionCommit: head,
    implementationCommit,
    implementationTreeSha256: canonicalSha256(treeListing.split("\n")),
    activeResultBearingProcessCount: 0,
  });
}

export { capture as captureQualificationCommand };
