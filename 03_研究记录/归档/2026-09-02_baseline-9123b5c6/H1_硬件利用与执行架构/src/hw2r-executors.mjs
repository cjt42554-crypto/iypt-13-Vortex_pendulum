import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { writeAtomicCanonicalGzipExclusive } from "../../_shared/src/atomic.mjs";
import { runH2nStage0NativePerformance } from "../../H2_代表性执行与数值资格/src/h2n-stage0-native.mjs";

const JS_WORKER_PATH = resolve(
  fileURLToPath(new URL("../scripts/hw2r-js-case-worker.mjs", import.meta.url)),
);

export const HW2R_REPRESENTATIVE_FIXTURE = Object.freeze({
  workloadId: "HW2R-R1-D54-A8R-OPERATION-GRAPH-SURROGATE-v1",
  nx: 1809,
  ny: 540,
  steps: 16,
  diameterCells: 54,
  maskHalfThicknessCells: 0.75,
  phaseOffsetYCells: 0.17320508075688773,
  bodyModeId: "fixed-body-baseline-phase",
  nativeBodyMode: "fixed-body",
  caseCount: 8,
  scientificValues: false,
});

export const HW2R_COST_CASES = Object.freeze([
  Object.freeze({
    caseId: "r2-d24-mask-0p50-baseline",
    nx: 804, ny: 240, steps: 8, diameterCells: 24,
    maskHalfThicknessCells: 0.5,
    phaseOffsetYCells: 0.17320508075688773,
    bodyModeId: "fixed-body-baseline-phase",
  }),
  Object.freeze({
    caseId: "r2-d24-mask-0p75-baseline",
    nx: 804, ny: 240, steps: 8, diameterCells: 24,
    maskHalfThicknessCells: 0.75,
    phaseOffsetYCells: 0.17320508075688773,
    bodyModeId: "fixed-body-baseline-phase",
  }),
  Object.freeze({
    caseId: "r2-d36-mask-0p50-baseline",
    nx: 1206, ny: 360, steps: 6, diameterCells: 36,
    maskHalfThicknessCells: 0.5,
    phaseOffsetYCells: 0.17320508075688773,
    bodyModeId: "fixed-body-baseline-phase",
  }),
  Object.freeze({
    caseId: "r2-d36-mask-0p75-baseline",
    nx: 1206, ny: 360, steps: 6, diameterCells: 36,
    maskHalfThicknessCells: 0.75,
    phaseOffsetYCells: 0.17320508075688773,
    bodyModeId: "fixed-body-baseline-phase",
  }),
  Object.freeze({
    caseId: "r2-d54-mask-0p50-baseline",
    nx: 1809, ny: 540, steps: 4, diameterCells: 54,
    maskHalfThicknessCells: 0.5,
    phaseOffsetYCells: 0.17320508075688773,
    bodyModeId: "fixed-body-baseline-phase",
  }),
  Object.freeze({
    caseId: "r2-d54-mask-0p75-baseline",
    nx: 1809, ny: 540, steps: 4, diameterCells: 54,
    maskHalfThicknessCells: 0.75,
    phaseOffsetYCells: 0.17320508075688773,
    bodyModeId: "fixed-body-baseline-phase",
  }),
  Object.freeze({
    caseId: "r2-d54-mask-0p50-minus-half-cell",
    nx: 1809, ny: 540, steps: 4, diameterCells: 54,
    maskHalfThicknessCells: 0.5,
    phaseOffsetYCells: -0.32679491924311227,
    bodyModeId: "fixed-body-minus-half-cell-phase",
  }),
  Object.freeze({
    caseId: "r2-d54-mask-0p75-minus-half-cell",
    nx: 1809, ny: 540, steps: 4, diameterCells: 54,
    maskHalfThicknessCells: 0.75,
    phaseOffsetYCells: -0.32679491924311227,
    bodyModeId: "fixed-body-minus-half-cell-phase",
  }),
]);

function maxPhase(results, name) {
  return results.length === 0
    ? 0
    : Math.max(...results.map((result) => result.phasesSeconds[name] ?? 0));
}

function combineConcurrentPhases(results, extra = {}) {
  return Object.freeze({
    buildOrProvision: maxPhase(results, "buildOrProvision")
      + (extra.buildOrProvisionSeconds ?? 0),
    coldInitialization: maxPhase(results, "coldInitialization"),
    warmup: maxPhase(results, "warmup"),
    steadyStateCompute: maxPhase(results, "steadyStateCompute"),
    ipcOrTransfer: maxPhase(results, "ipcOrTransfer"),
    audit: maxPhase(results, "audit"),
    shardSerializationFsyncAndHash:
      maxPhase(results, "shardSerializationFsyncAndHash")
        + (extra.shardSeconds ?? 0),
    finalAggregation: maxPhase(results, "finalAggregation")
      + (extra.aggregationSeconds ?? 0),
    cleanup: maxPhase(results, "cleanup"),
  });
}

async function runJsWorker(input) {
  const started = process.hrtime.bigint();
  const command = input.cpuList ? "taskset" : process.execPath;
  const argumentsList = input.cpuList
    ? ["--cpu-list", input.cpuList, process.execPath,
      "--experimental-strip-types", JS_WORKER_PATH]
    : ["--experimental-strip-types", JS_WORKER_PATH];
  const child = spawn(command, argumentsList, {
    env: { ...process.env },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  child.stdin.end(JSON.stringify({
    ...input.fixture,
    batchCount: input.batchCount,
  }));
  const { code, signal } = await new Promise((accept, reject) => {
    child.once("error", reject);
    child.once("exit", (exitCode, exitSignal) => accept({
      code: exitCode,
      signal: exitSignal,
    }));
  });
  const diagnostics = Buffer.concat(stderr).toString("utf8");
  if (code !== 0 || signal !== null) {
    throw new Error(
      `NO-GO-HW2R-CORRECTNESS: JS worker code=${code} signal=${signal} ${diagnostics}`,
    );
  }
  if (diagnostics.trim() !== "") {
    throw new Error(`NO-GO-HW2R-CORRECTNESS: JS worker stderr ${diagnostics}`);
  }
  const lines = Buffer.concat(stdout).toString("utf8").trim().split("\n");
  if (lines.length !== 1) throw new Error("NO-GO-HW2R-CORRECTNESS: JS stdout");
  const result = JSON.parse(lines[0]);
  if (result.format !== "VP-HW2R-JS-REPRESENTATIVE-WORKER-v1"
    || result.scientificValuesPersisted !== false
    || !/^[0-9a-f]{64}$/.test(result.correctnessSha256 ?? "")) {
    throw new Error("NO-GO-HW2R-CORRECTNESS: JS worker envelope");
  }
  const parentWall = Number(process.hrtime.bigint() - started) / 1e9;
  const known = result.coldInitializationSeconds
    + result.steadyStateComputeSeconds + result.auditSeconds;
  return Object.freeze({
    caseId: input.fixture.caseId,
    caseOrdinal: input.caseOrdinal,
    correctnessSha256: result.correctnessSha256,
    correctnessPass: result.correctnessPass === true,
    workUnits: result.workUnits,
    wallTimeSeconds: parentWall,
    phasesSeconds: Object.freeze({
      buildOrProvision: 0,
      coldInitialization: result.coldInitializationSeconds,
      warmup: 0,
      steadyStateCompute: result.steadyStateComputeSeconds,
      ipcOrTransfer: Math.max(0, parentWall - known),
      audit: result.auditSeconds,
      shardSerializationFsyncAndHash: 0,
      finalAggregation: 0,
      cleanup: 0,
    }),
  });
}

async function writeHashOnlyCaseShards(results) {
  const root = await mkdtemp(join(tmpdir(), "iypt13-hw2r-shards-"));
  try {
    const shardStarted = process.hrtime.bigint();
    const identities = [];
    const ordered = [...results].sort((left, right) =>
      left.caseOrdinal - right.caseOrdinal);
    for (let index = 0; index < ordered.length; index += 1) {
      const shard = {
        format: "VP-HW2R-REPRESENTATIVE-HASH-ONLY-SHARD-v1",
        caseOrdinal: index,
        caseId: ordered[index].caseId,
        correctnessSha256: ordered[index].correctnessSha256,
        workUnits: ordered[index].workUnits,
        scientificValuesPersisted: false,
      };
      const written = await writeAtomicCanonicalGzipExclusive(
        join(root, `case-${String(index).padStart(2, "0")}.json.gz`),
        shard,
      );
      identities.push(Object.freeze({
        caseOrdinal: index,
        canonicalSha256: written.canonicalSha256,
        storedSha256: written.storedSha256,
      }));
    }
    const shardSeconds = Number(process.hrtime.bigint() - shardStarted) / 1e9;
    const aggregationStarted = process.hrtime.bigint();
    const correctnessSha256 = canonicalSha256(identities);
    const aggregationSeconds = Number(
      process.hrtime.bigint() - aggregationStarted,
    ) / 1e9;
    return Object.freeze({
      correctnessSha256,
      shardSeconds,
      aggregationSeconds,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function executeHw2rJsGroup(input) {
  const started = process.hrtime.bigint();
  const activeWorkers = Math.min(
    input.candidate.resourceCount,
    HW2R_REPRESENTATIVE_FIXTURE.caseCount,
  );
  const lanes = Array.from({ length: activeWorkers }, (_, laneId) => ({
    laneId,
    frozenCost: 0,
    cases: [],
  }));
  const orderedCases = [...HW2R_COST_CASES].sort((left, right) => {
    const cost = right.nx * right.ny * right.steps
      - left.nx * left.ny * left.steps;
    return cost === 0 ? left.caseId.localeCompare(right.caseId) : cost;
  });
  for (const fixture of orderedCases) {
    lanes.sort((left, right) => left.frozenCost - right.frozenCost
      || left.laneId - right.laneId);
    lanes[0].cases.push(fixture);
    lanes[0].frozenCost += fixture.nx * fixture.ny * fixture.steps;
  }
  lanes.sort((left, right) => left.laneId - right.laneId);
  const laneResults = await Promise.all(lanes.map(async (lane) => {
    const results = [];
    for (const fixture of lane.cases) {
      results.push(await runJsWorker({
        fixture,
        caseOrdinal: HW2R_COST_CASES.findIndex(({ caseId }) =>
          caseId === fixture.caseId),
        batchCount: input.batchCount,
        cpuList: input.cpuLists?.[lane.laneId] ?? null,
      }));
    }
    return Object.freeze(results);
  }));
  const results = laneResults.flat();
  const laneSummaries = laneResults.map((items) => Object.freeze({
    phasesSeconds: Object.freeze(Object.fromEntries([
      "buildOrProvision",
      "coldInitialization",
      "warmup",
      "steadyStateCompute",
      "ipcOrTransfer",
      "audit",
      "shardSerializationFsyncAndHash",
      "finalAggregation",
      "cleanup",
    ].map((name) => [name, items.reduce(
      (sum, item) => sum + item.phasesSeconds[name],
      0,
    )]))),
  }));
  const shards = await writeHashOnlyCaseShards(results);
  const wallTimeSeconds = Number(process.hrtime.bigint() - started) / 1e9;
  return Object.freeze({
    wallTimeSeconds,
    workUnits: results.reduce((sum, result) => sum + result.workUnits, 0),
    correctnessSha256: shards.correctnessSha256,
    correctnessPass: results.every(({ correctnessPass }) => correctnessPass),
    numericalIdentityPass: input.numericalIdentityPass === true,
    safetyPass: true,
    utilizationOrSaturationPass:
      input.candidate.resourceCount <= HW2R_REPRESENTATIVE_FIXTURE.caseCount,
    phasesSeconds: combineConcurrentPhases(laneSummaries, shards),
    activeWorkers,
    scientificValuesPersisted: false,
  });
}

export async function executeHw2rJsReference(input) {
  const started = process.hrtime.bigint();
  const result = await runJsWorker({
    fixture: Object.freeze({
      ...HW2R_REPRESENTATIVE_FIXTURE,
      caseId: "h2x-r1-d54-reference",
    }),
    caseOrdinal: 0,
    batchCount: input.batchCount,
    cpuList: input.cpuList ?? null,
  });
  const shards = await writeHashOnlyCaseShards([result]);
  return Object.freeze({
    wallTimeSeconds: Number(process.hrtime.bigint() - started) / 1e9,
    workUnits: result.workUnits,
    correctnessSha256: shards.correctnessSha256,
    correctnessPass: result.correctnessPass,
    numericalIdentityPass: input.numericalIdentityPass === true,
    safetyPass: true,
    utilizationOrSaturationPass: true,
    phasesSeconds: combineConcurrentPhases([result], shards),
    scientificValuesPersisted: false,
  });
}

function nativeInput(
  input,
  backend,
  batchCount,
  threads,
  fixture = HW2R_REPRESENTATIVE_FIXTURE,
) {
  return {
    binaryPath: input.binaryPath,
    backend,
    nx: fixture.nx,
    ny: fixture.ny,
    steps: fixture.steps,
    diameterCells: fixture.diameterCells,
    maskHalfThicknessCells: fixture.maskHalfThicknessCells,
    phaseOffsetYCells: fixture.phaseOffsetYCells,
    nativeBodyMode: fixture.nativeBodyMode ?? "fixed-body",
    threads,
    batchCount,
    ompProcBind: input.ompProcBind,
    ompPlaces: input.ompPlaces,
    cpuList: input.cpuList,
  };
}

export function partitionHybridCostCases(cases, cpuFraction) {
  if (!Array.isArray(cases) || cases.length < 2
    || !Number.isFinite(cpuFraction) || cpuFraction <= 0 || cpuFraction >= 1) {
    throw new RangeError("invalid result-blind hybrid partition input");
  }
  const costs = cases.map((fixture) => fixture.nx * fixture.ny * fixture.steps);
  const totalCost = costs.reduce((sum, value) => sum + value, 0);
  let best = null;
  for (let mask = 1; mask < 2 ** cases.length - 1; mask += 1) {
    let cpuCost = 0;
    const cpuCaseIds = [];
    for (let index = 0; index < cases.length; index += 1) {
      if ((mask & (1 << index)) === 0) continue;
      cpuCost += costs[index];
      cpuCaseIds.push(cases[index].caseId);
    }
    const error = Math.abs(cpuCost / totalCost - cpuFraction);
    const tie = cpuCaseIds.join("|");
    if (best === null || error < best.error
      || (error === best.error && tie.localeCompare(best.tie) < 0)) {
      best = { mask, cpuCost, error, tie };
    }
  }
  const cpuCases = cases.filter((_, index) => (best.mask & (1 << index)) !== 0);
  const gpuCases = cases.filter((_, index) => (best.mask & (1 << index)) === 0);
  return Object.freeze({
    cpuCases: Object.freeze(cpuCases),
    gpuCases: Object.freeze(gpuCases),
    cpuCost: best.cpuCost,
    gpuCost: totalCost - best.cpuCost,
    totalCost,
    targetCpuFraction: cpuFraction,
    achievedCpuFraction: best.cpuCost / totalCost,
    absoluteFractionError: best.error,
  });
}

function sumPhases(results) {
  return Object.freeze({
    phasesSeconds: Object.freeze(Object.fromEntries([
      "buildOrProvision",
      "coldInitialization",
      "warmup",
      "steadyStateCompute",
      "ipcOrTransfer",
      "audit",
      "shardSerializationFsyncAndHash",
      "finalAggregation",
      "cleanup",
    ].map((name) => [name, results.reduce(
      (sum, result) => sum + result.phasesSeconds[name],
      0,
    )]))),
  });
}

async function executeNativeLane(input, backend, fixtures, threads) {
  const results = [];
  for (const fixture of fixtures) {
    const result = await runH2nStage0NativePerformance(nativeInput(
      input,
      backend,
      input.batchCount,
      threads,
      fixture,
    ));
    results.push(Object.freeze({
      ...result,
      caseId: fixture.caseId,
      caseOrdinal: HW2R_COST_CASES.findIndex(({ caseId }) =>
        caseId === fixture.caseId),
      backend,
    }));
  }
  return Object.freeze({
    results: Object.freeze(results),
    phaseSummary: sumPhases(results),
  });
}

function toHw2rNativeEnvelope(result, input) {
  const provisionSeconds = input.buildOrProvisionSeconds ?? 0;
  return Object.freeze({
    wallTimeSeconds: result.wallTimeSeconds + provisionSeconds,
    workUnits: result.workUnits,
    correctnessSha256: result.correctnessSha256,
    correctnessPass: result.correctnessPass,
    numericalIdentityPass: input.numericalIdentityPass === true,
    safetyPass: true,
    utilizationOrSaturationPass: true,
    phasesSeconds: Object.freeze({
      ...result.phasesSeconds,
      buildOrProvision: provisionSeconds,
    }),
    scientificValuesPersisted: false,
  });
}

export async function executeHw2rNative(input) {
  const backend = input.candidate.classId === "gpu-compute" ? "opencl" : "cpu";
  const threads = backend === "cpu" ? input.candidate.resourceCount : 1;
  const result = await runH2nStage0NativePerformance(
    nativeInput(input, backend, input.batchCount, threads),
  );
  return toHw2rNativeEnvelope(result, input);
}

export async function executeHw2rHybrid(input) {
  const fixtures = input.fixtures ?? HW2R_COST_CASES;
  const partition = partitionHybridCostCases(
    fixtures,
    input.candidate.cpuFraction,
  );
  const started = process.hrtime.bigint();
  const [cpu, gpu] = await Promise.all([
    executeNativeLane(
      { ...input, binaryPath: input.cpuBinaryPath },
      "cpu",
      partition.cpuCases,
      input.candidate.resourceCount,
    ),
    executeNativeLane(
      { ...input, binaryPath: input.gpuBinaryPath, cpuList: null },
      "opencl",
      partition.gpuCases,
      1,
    ),
  ]);
  const results = [...cpu.results, ...gpu.results];
  const shards = await writeHashOnlyCaseShards(results);
  const wallTimeSeconds = Number(process.hrtime.bigint() - started) / 1e9;
  const provisionSeconds = input.buildOrProvisionSeconds ?? 0;
  return Object.freeze({
    wallTimeSeconds: wallTimeSeconds + provisionSeconds,
    workUnits: results.reduce((sum, result) => sum + result.workUnits, 0),
    correctnessSha256: canonicalSha256({
      partition: {
        cpuCaseIds: partition.cpuCases.map(({ caseId }) => caseId),
        gpuCaseIds: partition.gpuCases.map(({ caseId }) => caseId),
        cpuCost: partition.cpuCost,
        gpuCost: partition.gpuCost,
      },
      shardAggregateSha256: shards.correctnessSha256,
    }),
    correctnessPass: results.every(({ correctnessPass }) => correctnessPass),
    numericalIdentityPass: input.numericalIdentityPass === true,
    safetyPass: true,
    utilizationOrSaturationPass: true,
    phasesSeconds: combineConcurrentPhases([
      cpu.phaseSummary,
      gpu.phaseSummary,
    ], {
      buildOrProvisionSeconds: provisionSeconds,
      shardSeconds: shards.shardSeconds,
      aggregationSeconds: shards.aggregationSeconds,
    }),
    partition: Object.freeze({
      cpuCaseIds: Object.freeze(partition.cpuCases.map(({ caseId }) => caseId)),
      gpuCaseIds: Object.freeze(partition.gpuCases.map(({ caseId }) => caseId)),
      cpuCost: partition.cpuCost,
      gpuCost: partition.gpuCost,
      targetCpuFraction: partition.targetCpuFraction,
      achievedCpuFraction: partition.achievedCpuFraction,
      absoluteFractionError: partition.absoluteFractionError,
    }),
    scientificValuesPersisted: false,
  });
}

export function createHw2rExecutor(input) {
  return async ({ candidate, batchCount }) => {
    if (candidate.backendId === "h2x-js-r1-serial-reference") {
      return executeHw2rJsReference({
        candidate,
        batchCount,
        numericalIdentityPass: input.h2xPass,
      });
    }
    if (candidate.classId === "trajectory-process-parallel"
      || candidate.classId === "data-layout-shard-aggregation") {
      return executeHw2rJsGroup({
        candidate,
        batchCount,
        numericalIdentityPass: input.h2xPass,
        cpuLists: input.cpuListsForCandidate?.(candidate) ?? null,
      });
    }
    if (candidate.classId === "single-trajectory-cpu-domain-or-thread"
      || candidate.classId === "native-or-wasm-simd") {
      return executeHw2rNative({
        candidate,
        batchCount,
        numericalIdentityPass: input.h2nPass,
        binaryPath: candidate.classId === "native-or-wasm-simd"
          ? input.simdBinaryPath
          : input.openmpBinaryPath,
        buildOrProvisionSeconds:
          input.buildOrProvisionSecondsForCandidate?.(candidate) ?? 0,
        ...input.affinityForCandidate?.(candidate),
      });
    }
    if (candidate.classId === "gpu-compute") {
      return executeHw2rNative({
        candidate,
        batchCount,
        numericalIdentityPass: input.h2nPass,
        binaryPath: input.gpuBinaryPath,
        buildOrProvisionSeconds:
          input.buildOrProvisionSecondsForCandidate?.(candidate) ?? 0,
      });
    }
    if (candidate.classId === "cpu-gpu-hybrid") {
      return executeHw2rHybrid({
        candidate,
        batchCount,
        numericalIdentityPass: input.h2nPass,
        cpuBinaryPath: input.simdBinaryPath,
        gpuBinaryPath: input.gpuBinaryPath,
        buildOrProvisionSeconds:
          input.buildOrProvisionSecondsForCandidate?.(candidate) ?? 0,
        ...input.affinityForCandidate?.(candidate),
      });
    }
    throw new Error(`DEFERRED-HW2R-CANDIDATE-UNAVAILABLE: ${candidate.classId}`);
  };
}
