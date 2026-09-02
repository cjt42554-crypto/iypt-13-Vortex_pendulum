import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { writeCanonicalGzipWithSidecarExclusive } from "../../_shared/src/atomic.mjs";
import { buildH2nStage0Native } from "./build-h2n-stage0.mjs";
import { loadH2nContract } from "../src/contract.mjs";
import { runH2nStage0NumericalComparison } from "../src/h2n-stage0-runner.mjs";
import {
  assertCleanMainParityAndIdentity,
  assertFiniteMemorySafety,
  captureQualificationCommand,
  compareResourceSnapshots,
  H2N_STAGE0_IMPLEMENTATION_PATHS,
  readQualificationResourceSnapshot,
} from "../src/repository-preflight.mjs";

function parseArguments(argv) {
  const value = (name, fallback = null) => {
    const index = argv.indexOf(name);
    return index < 0 ? fallback : argv[index + 1];
  };
  const outputDirectory = value("--output");
  const backend = value("--backend", "opencl");
  const threads = Number(value("--threads", "1"));
  if (!outputDirectory || !new Set(["cpu", "opencl", "both"]).has(backend)
    || !Number.isSafeInteger(threads) || threads < 1) {
    throw new Error(
      "usage: run-h2n-stage0-numerical.mjs --output DIR "
        + "--backend cpu|opencl|both [--threads N]",
    );
  }
  return Object.freeze({
    outputDirectory: resolve(outputDirectory),
    backend,
    backends: Object.freeze(backend === "both" ? ["cpu", "opencl"] : [backend]),
    threads,
  });
}

function requestedVariants(backend) {
  if (backend === "cpu") return Object.freeze([
    "cpu-openmp-strict",
    "cpu-simd",
  ]);
  if (backend === "opencl") return Object.freeze(["opencl"]);
  return Object.freeze(["cpu-openmp-strict", "cpu-simd", "opencl"]);
}

function failureCode(error) {
  const message = String(error?.message ?? error);
  return /(?:NO-GO|INCONCLUSIVE|DEFERRED)-[A-Z0-9-]+/u.exec(message)?.[0]
    ?? "DEFERRED-H2N-TOOLCHAIN-OR-RESOURCE";
}

async function gpuIdentityAndSafety() {
  const processes = await captureQualificationCommand("nvidia-smi", [
    "--query-compute-apps=pid,process_name,used_gpu_memory",
    "--format=csv,noheader,nounits",
  ]);
  if (processes.trim() !== "") {
    throw new Error("DEFERRED-H2N-TOOLCHAIN-OR-RESOURCE: foreign GPU process");
  }
  const identity = await captureQualificationCommand("nvidia-smi", [
    "--query-gpu=name,uuid,driver_version",
    "--format=csv,noheader",
  ]);
  return Object.freeze({ identity });
}

const options = parseArguments(process.argv.slice(2));
const backendVariants = requestedVariants(options.backend);
const loaded = await loadH2nContract();
const preflight = await assertCleanMainParityAndIdentity(
  H2N_STAGE0_IMPLEMENTATION_PATHS,
);
const before = await readQualificationResourceSnapshot();
const entrySafety = assertFiniteMemorySafety(loaded.contract, before);
const gpu = options.backends.includes("opencl")
  ? await gpuIdentityAndSafety()
  : null;
const buildRoot = await mkdtemp(join(tmpdir(), "iypt13-h2n-formal-build-"));
try {
  const cpuIdentity = await captureQualificationCommand("lscpu", ["--json"]);
  const builds = {};
  if (backendVariants.includes("cpu-openmp-strict")) {
    builds["cpu-openmp-strict"] = await buildH2nStage0Native(
      join(buildRoot, "h2n-openmp-strict"),
      { additionalFlags: ["-fno-tree-vectorize", "-fno-tree-slp-vectorize"] },
    );
  }
  if (backendVariants.includes("cpu-simd") || backendVariants.includes("opencl")) {
    const simdAndOpencl = await buildH2nStage0Native(
      join(buildRoot, "h2n-simd-opencl"),
    );
    if (backendVariants.includes("cpu-simd")) builds["cpu-simd"] = simdAndOpencl;
    if (backendVariants.includes("opencl")) builds.opencl = simdAndOpencl;
  }
  const binaryIdentities = Object.freeze(Object.fromEntries(
    backendVariants.map((backendVariant) => {
      const build = builds[backendVariant];
      const opencl = backendVariant === "opencl";
      return [backendVariant, Object.freeze({
        ...build.identity,
        backendVariant,
        driverId: opencl ? gpu.identity : "cpu-host-not-applicable",
        deviceId: opencl ? gpu.identity : cpuIdentity,
        implementationCommit: preflight.implementationCommit,
        implementationTreeSha256: preflight.implementationTreeSha256,
      })];
    }),
  ));
  const results = [];
  for (const backendVariant of backendVariants) {
    const backend = backendVariant === "opencl" ? "opencl" : "cpu";
    let backendBlocked = null;
    for (const size of loaded.contract.stage0.sizeMatrix) {
      for (const maskHalfThicknessCells of [0.5, 0.75]) {
        for (const bodyModeId of loaded.contract.stage0.bodyModes) {
          if (backendBlocked) {
            results.push(Object.freeze({
              sizeId: size.sizeId,
              bodyModeId,
              maskHalfThicknessCells,
              backend,
              backendVariant,
              pass: false,
              classification: backendBlocked,
              failureCode: backendBlocked,
              notExecutedDueToBackendStop: true,
              numerical: null,
              execution: null,
              canonicalSha256: null,
            }));
            continue;
          }
          try {
            results.push(await runH2nStage0NumericalComparison({
              loadedContract: loaded,
              binaryPath: builds[backendVariant].outputPath,
              binaryIdentity: binaryIdentities[backendVariant],
              backend,
              backendVariant,
              size,
              bodyModeId,
              maskHalfThicknessCells,
              threads: backend === "cpu" ? options.threads : 1,
            }));
          } catch (error) {
            backendBlocked = failureCode(error);
            results.push(Object.freeze({
              sizeId: size.sizeId,
              bodyModeId,
              maskHalfThicknessCells,
              backend,
              backendVariant,
              pass: false,
              classification: backendBlocked,
              failureCode: backendBlocked,
              notExecutedDueToBackendStop: false,
              numerical: null,
              execution: null,
              canonicalSha256: null,
            }));
          }
        }
      }
    }
  }
  const after = await readQualificationResourceSnapshot();
  const safety = compareResourceSnapshots(loaded.contract, before, after);
  const expectedPerVariant = loaded.contract.stage0.sizeMatrix.length
    * loaded.contract.stage0.bodyModes.length * 2;
  const matrixComplete = results.length
      === backendVariants.length * expectedPerVariant;
  const variantOutcomes = Object.freeze(backendVariants.map((backendVariant) => {
    const matrix = results.filter((result) =>
      result.backendVariant === backendVariant);
    return Object.freeze({
      backendVariant,
      matrixCount: matrix.length,
      pass: matrix.length === expectedPerVariant
        && matrix.every(({ pass: value }) => value === true),
    });
  }));
  const pass = matrixComplete
    && variantOutcomes.every(({ pass: value }) => value === true)
    && safety.pass;
  const summary = {
    format: "VP-H2N-STAGE0-NUMERICAL-MATRIX-SUMMARY-v2",
    backend: options.backend,
    backends: options.backends,
    backendVariants,
    threads: options.threads,
    contractSha256: loaded.contractSha256,
    sourceIdentitySha256: loaded.sourceIdentity.canonicalSha256,
    implementationCommit: preflight.implementationCommit,
    executionCommit: preflight.executionCommit,
    implementationTreeSha256: preflight.implementationTreeSha256,
    binaryIdentities,
    matrix: results.map((result) => Object.freeze({
      sizeId: result.sizeId,
      bodyModeId: result.bodyModeId,
      maskHalfThicknessCells: result.maskHalfThicknessCells,
      backend: result.backend,
      backendVariant: result.backendVariant,
      pass: result.pass,
      classification: result.classification,
      failureCode: result.failureCode ?? null,
      notExecutedDueToBackendStop:
        result.notExecutedDueToBackendStop ?? false,
      maxima: result.numerical?.maxima ?? null,
      gates: result.numerical?.gates ?? null,
      executionSha256: result.execution
        ? canonicalSha256(result.execution)
        : null,
      comparisonCanonicalSha256: result.canonicalSha256,
    })),
    matrixCount: results.length,
    expectedPerVariant,
    matrixComplete,
    variantOutcomes,
    entrySafety,
    safety,
    pass,
    classification: pass
      ? "PASS-H2N-STAGE0-NUMERICAL-CORRECTNESS-PENDING-PERFORMANCE"
      : "NO-GO-H2N-STAGE0-NUMERIC-OR-PERFORMANCE",
    stage0PerformanceGateExecuted: false,
    fullH2nQualificationExecuted: false,
    h3Unlock: false,
    scientificValuesPersisted: false,
    scientificValuesHumanRead: false,
    scientificConclusion: "NONE",
  };
  await mkdir(options.outputDirectory, { recursive: false });
  const written = await writeCanonicalGzipWithSidecarExclusive(
    join(options.outputDirectory, "h2n-stage0-numerical-summary.json.gz"),
    summary,
  );
  process.stdout.write(`${JSON.stringify({
    pass,
    classification: summary.classification,
    matrixCount: results.length,
    summaryStoredSha256: written.artifact.storedSha256,
    summaryCanonicalSha256: written.artifact.canonicalSha256,
    sidecarSha256: written.sidecar.sha256,
    outputDirectory: basename(options.outputDirectory),
    scientificValuesPersisted: false,
  })}\n`);
  if (!pass) process.exitCode = 1;
} finally {
  await rm(buildRoot, { recursive: true, force: true });
}
