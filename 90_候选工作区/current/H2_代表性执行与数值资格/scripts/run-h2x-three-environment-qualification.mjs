import { spawn } from "node:child_process";
import { access, cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { canonicalSha256, sha256Bytes } from "../../_shared/src/canonical.mjs";
import {
  readCanonicalGzipWithSidecar,
  writeCanonicalGzipWithSidecarExclusive,
} from "../../_shared/src/atomic.mjs";
import {
  H2_REPOSITORY_ROOT,
  loadH2xContract,
} from "../src/contract.mjs";
import {
  assertCleanMainParityAndIdentity,
  assertFiniteMemorySafety,
  captureQualificationCommand,
  compareResourceSnapshots,
  H2X_IMPLEMENTATION_PATHS,
  readQualificationResourceSnapshot,
} from "../src/repository-preflight.mjs";
import { deriveH2xMemorySafeMaximum } from "../src/scheduler.mjs";

function parseArguments(argv) {
  const value = (name, fallback = null) => {
    const index = argv.indexOf(name);
    return index < 0 ? fallback : argv[index + 1];
  };
  const outputDirectory = value("--output");
  const hw2rSummaryPath = value("--hw2r-summary");
  const environmentPrefix = value("--environment-prefix", "h2x-env");
  if (!outputDirectory || !hw2rSummaryPath
    || !/^[a-zA-Z0-9._-]+$/.test(environmentPrefix)) {
    throw new Error(
      "usage: run-h2x-three-environment-qualification.mjs --output DIR "
        + "--hw2r-summary PATH [--environment-prefix PREFIX]",
    );
  }
  return Object.freeze({
    outputDirectory: resolve(outputDirectory),
    hw2rSummaryPath: resolve(hw2rSummaryPath),
    environmentPrefix,
  });
}

async function run(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd,
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
  return Object.freeze({
    code,
    signal,
    stdout: Buffer.concat(stdout).toString("utf8"),
    stderr: Buffer.concat(stderr).toString("utf8"),
  });
}

async function prepareEnvironment(root, index, remote, commit) {
  const environmentId = `${options.environmentPrefix}-${index + 1}`;
  const cloneDirectory = join(root, `clone-${index + 1}`);
  const clone = await run("git", [
    "clone",
    "--no-hardlinks",
    "--single-branch",
    "--branch",
    "main",
    remote,
    cloneDirectory,
  ], { cwd: root });
  if (clone.code !== 0 || clone.signal !== null) {
    throw new Error(`H2-X independent clone failed: ${clone.stderr}`);
  }
  const head = await run("git", ["rev-parse", "HEAD"], { cwd: cloneDirectory });
  if (head.code !== 0 || head.stdout.trim() !== commit) {
    throw new Error("H2-X independent clone did not resolve the frozen commit");
  }
  const cacheDirectory = join(root, `npm-cache-${index + 1}`);
  const tempDirectory = join(root, `tmp-${index + 1}`);
  await Promise.all([
    mkdir(cacheDirectory),
    mkdir(tempDirectory),
  ]);
  const packageDirectory = join(
    cloneDirectory,
    "90_候选工作区/current/H2_代表性执行与数值资格",
  );
  const install = await run("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--package-lock=false",
  ], {
    cwd: packageDirectory,
    env: { npm_config_cache: cacheDirectory, TMPDIR: tempDirectory },
  });
  if (install.code !== 0 || install.signal !== null) {
    throw new Error(`H2-X independent dependency install failed: ${install.stderr}`);
  }
  return Object.freeze({
    environmentId,
    cloneDirectory,
    packageDirectory,
    tempDirectory,
    outputDirectory: join(root, `evidence-${index + 1}`),
  });
}

async function readEnvironmentSummary(environment) {
  return (await readCanonicalGzipWithSidecar(
    join(environment.outputDirectory, "environment-summary.json.gz"),
  )).value;
}

async function readGzipJson(path) {
  return (await readCanonicalGzipWithSidecar(path)).value;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function failureCode(error) {
  const message = String(error?.message ?? error);
  return /(?:NO-GO|INCONCLUSIVE|DEFERRED)-[A-Z0-9-]+/u.exec(message)?.[0]
    ?? "INCONCLUSIVE-H2X-RESOURCE-OR-TOOLCHAIN";
}

const options = parseArguments(process.argv.slice(2));
const loaded = await loadH2xContract();
const preflight = await assertCleanMainParityAndIdentity(H2X_IMPLEMENTATION_PATHS);
const before = await readQualificationResourceSnapshot();
const entrySafety = assertFiniteMemorySafety(loaded.contract, before);
const hw2rSummary = await readGzipJson(options.hw2rSummaryPath);
if (hw2rSummary.pass !== true
  || hw2rSummary.classification !== "PASS-HW2R-REPRESENTATIVE-MEASUREMENT"
  || !Number.isSafeInteger(hw2rSummary.h2xComparator?.activeWorkerCount)
  || hw2rSummary.h2xComparator.activeWorkerCount < 1) {
  throw new Error("INCONCLUSIVE-H2X-RESOURCE-OR-TOOLCHAIN: HW2R comparator missing");
}
const selectedHw2rWorkerCount = hw2rSummary.h2xComparator.activeWorkerCount;
const h2xRepresentativeSpeedup = hw2rSummary.h2xComparator.throughput
  / hw2rSummary.baseline.throughput;
const comparatorMeasurement = hw2rSummary.h2xComparator.candidateId
    === hw2rSummary.baseline.candidateId
  ? hw2rSummary.baselineMeasurement
  : hw2rSummary.candidates.find(({ candidate }) =>
    candidate.candidateId === hw2rSummary.h2xComparator.candidateId);
const d54RepresentativeCovered = comparatorMeasurement?.candidate.workloadIds
  ?.some((workloadId) => new Set([
    "HW2R-R1-D54-A8R-OPERATION-GRAPH-SURROGATE-v1",
    "HW2R-R2-EIGHT-CASE-COST-STRUCTURE-SURROGATE-v1",
  ]).has(workloadId)) === true;
const h2xPerformanceGate = Object.freeze({
  candidateId: hw2rSummary.h2xComparator.candidateId,
  activeWorkerCount: selectedHw2rWorkerCount,
  representativeSpeedup: h2xRepresentativeSpeedup,
  representativeSpeedupMinimum: 1.5,
  d54RepresentativeCovered,
  pass: h2xRepresentativeSpeedup >= 1.5
    && d54RepresentativeCovered,
});
const memorySafeMaximum = deriveH2xMemorySafeMaximum(
  before,
  availableParallelism(),
);
if (selectedHw2rWorkerCount > memorySafeMaximum) {
  throw new Error("INCONCLUSIVE-H2X-RESOURCE-OR-TOOLCHAIN: selected worker unsafe");
}
const remote = await captureQualificationCommand(
  "git",
  ["config", "--get", "remote.origin.url"],
  { cwd: H2_REPOSITORY_ROOT },
);
const root = await mkdtemp(join(tmpdir(), "iypt13-h2x-three-env-"));
const environments = [];
let runs = [];
try {
  for (let index = 0; index < loaded.contract.independentEnvironmentCount; index += 1) {
    environments.push(await prepareEnvironment(
      root,
      index,
      remote,
      preflight.executionCommit,
    ));
  }
  for (const environment of environments) {
    runs.push(await run(process.execPath, [
      "--experimental-strip-types",
      join(environment.packageDirectory, "scripts/run-h2x-qualification.mjs"),
      "--environment-id", environment.environmentId,
      "--output", environment.outputDirectory,
      "--selected-worker-count", String(selectedHw2rWorkerCount),
      "--memory-safe-maximum", String(memorySafeMaximum),
    ], {
      cwd: environment.packageDirectory,
      env: { TMPDIR: environment.tempDirectory },
    }));
  }
  const summaries = [];
  for (let index = 0; index < environments.length; index += 1) {
    const runResult = runs[index];
    if (runResult.code !== 0 || runResult.signal !== null) {
      throw new Error(
        `H2-X environment ${environments[index].environmentId} failed: `
          + runResult.stderr + runResult.stdout,
      );
    }
    summaries.push(await readEnvironmentSummary(environments[index]));
  }
  const after = await readQualificationResourceSnapshot();
  const safety = compareResourceSnapshots(loaded.contract, before, after);
  const identitySet = new Set(summaries.map((summary) => canonicalSha256({
    contractSha256: summary.contractSha256,
    sourceIdentitySha256: summary.sourceIdentitySha256,
    definitionSetSha256: summary.definitionSetSha256,
    implementationCommit: summary.implementationCommit,
    executionCommit: summary.executionCommit,
    implementationTreeSha256: summary.implementationTreeSha256,
  })));
  const schedulerMatrixSet = new Set(summaries.map((summary) =>
    canonicalSha256(summary.schedulerMatrix)));
  const equivalencePass = summaries.length
      === loaded.contract.independentEnvironmentCount
    && new Set(summaries.map(({ environmentId }) => environmentId)).size
      === loaded.contract.independentEnvironmentCount
    && identitySet.size === 1
    && schedulerMatrixSet.size === 1
    && summaries.every(({ executionCommit }) =>
      executionCommit === preflight.executionCommit)
    && summaries.every(({ pass: value }) => value === true)
    && safety.pass;
  const pass = equivalencePass && h2xPerformanceGate.pass;
  await mkdir(options.outputDirectory, { recursive: false });
  for (const environment of environments) {
    await cp(
      environment.outputDirectory,
      join(options.outputDirectory, environment.environmentId),
      { recursive: true, errorOnExist: true, force: false },
    );
  }
  const aggregate = {
    format: "VP-H2X-THREE-INDEPENDENT-ENVIRONMENT-QUALIFICATION-v2",
    contractSha256: loaded.contractSha256,
    implementationCommit: preflight.implementationCommit,
    executionCommit: preflight.executionCommit,
    implementationTreeSha256: preflight.implementationTreeSha256,
    hw2rSummaryCanonicalSha256: canonicalSha256(hw2rSummary),
    selectedHw2rWorkerCount,
    memorySafeMaximum,
    h2xPerformanceGate,
    independentEnvironmentCount: summaries.length,
    environments: summaries.map((summary) => Object.freeze({
      environmentId: summary.environmentId,
      pass: summary.pass,
      classification: summary.classification,
      schedulerMatrix: summary.schedulerMatrix,
      candidateMatrixCanonicalSha256:
        summary.candidateMatrixCanonicalSha256,
      summaryCanonicalSha256: canonicalSha256(summary),
    })),
    identitySetSize: identitySet.size,
    schedulerMatrixSetSize: schedulerMatrixSet.size,
    entrySafety,
    safety,
    equivalencePass,
    pass,
    classification: pass
      ? loaded.contract.passCode
      : "INCONCLUSIVE-H2X-RESOURCE-OR-TOOLCHAIN",
    scientificValuesPersisted: false,
    scientificValuesHumanRead: false,
    fullEightCaseResultBearingRunPerformed: false,
    canonicalA8rArtifactWritten: false,
    scientificConclusion: "NONE",
  };
  const written = await writeCanonicalGzipWithSidecarExclusive(
    join(options.outputDirectory, "three-environment-summary.json.gz"),
    aggregate,
  );
  process.stdout.write(`${JSON.stringify({
    pass,
    classification: aggregate.classification,
    independentEnvironmentCount: summaries.length,
    summaryStoredSha256: written.artifact.storedSha256,
    summaryCanonicalSha256: written.artifact.canonicalSha256,
    sidecarSha256: written.sidecar.sha256,
    outputDirectory: basename(options.outputDirectory),
    scientificValuesPersisted: false,
  })}\n`);
  if (!pass) process.exitCode = 1;
} catch (error) {
  await mkdir(options.outputDirectory, { recursive: false });
  const retainedEnvironments = [];
  for (const environment of environments) {
    if (!await pathExists(environment.outputDirectory)) continue;
    await cp(
      environment.outputDirectory,
      join(options.outputDirectory, `${environment.environmentId}-failed-attempt`),
      { recursive: true, errorOnExist: true, force: false },
    );
    retainedEnvironments.push(environment.environmentId);
  }
  const failedRuns = runs.map((runResult, index) => Object.freeze({
    environmentId: environments[index]?.environmentId ?? null,
    code: runResult.code,
    signal: runResult.signal,
    stdoutSha256: sha256Bytes(Buffer.from(runResult.stdout, "utf8")),
    stderrSha256: sha256Bytes(Buffer.from(runResult.stderr, "utf8")),
  }));
  const failure = {
    format: "VP-H2X-THREE-INDEPENDENT-ENVIRONMENT-QUALIFICATION-FAILURE-v1",
    contractSha256: loaded.contractSha256,
    implementationCommit: preflight.implementationCommit,
    executionCommit: preflight.executionCommit,
    implementationTreeSha256: preflight.implementationTreeSha256,
    hw2rSummaryCanonicalSha256: canonicalSha256(hw2rSummary),
    selectedHw2rWorkerCount,
    memorySafeMaximum,
    h2xPerformanceGate,
    retainedEnvironments,
    failedRuns,
    pass: false,
    classification: failureCode(error),
    scientificValuesPersisted: false,
    scientificValuesHumanRead: false,
    fullEightCaseResultBearingRunPerformed: false,
    canonicalA8rArtifactWritten: false,
    scientificConclusion: "NONE",
  };
  const written = await writeCanonicalGzipWithSidecarExclusive(
    join(options.outputDirectory, "three-environment-failure.json.gz"),
    failure,
  );
  process.stdout.write(`${JSON.stringify({
    pass: false,
    classification: failure.classification,
    retainedEnvironmentCount: retainedEnvironments.length,
    failureStoredSha256: written.artifact.storedSha256,
    failureCanonicalSha256: written.artifact.canonicalSha256,
    sidecarSha256: written.sidecar.sha256,
    scientificValuesPersisted: false,
  })}\n`);
  process.exitCode = 1;
} finally {
  await rm(root, { recursive: true, force: true });
}
