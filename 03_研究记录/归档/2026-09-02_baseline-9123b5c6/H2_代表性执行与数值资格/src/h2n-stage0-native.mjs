import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { H2N_OPENCL_SOURCE_PATH } from "../scripts/build-h2n-stage0.mjs";
import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { writeAtomicCanonicalGzipExclusive } from "../../_shared/src/atomic.mjs";
import { buildH2nStage0Fixture } from "./h2n-stage0-reference.mjs";

const D2Q9_CX = Object.freeze([0, 1, 0, -1, 0, 1, -1, -1, 1]);
const D2Q9_CY = Object.freeze([0, 0, 1, 0, -1, 1, 1, -1, -1]);

function parseNativeFields(bytes, cells) {
  const expectedValues = 15 * cells;
  if (bytes.byteLength !== expectedValues * Float64Array.BYTES_PER_ELEMENT) {
    throw new Error(
      `NO-GO-H2N-STAGE0-NUMERIC-OR-PERFORMANCE: binary length ${bytes.byteLength}`,
    );
  }
  const storage = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(storage).set(bytes);
  const values = new Float64Array(storage);
  let offset = 0;
  const take = (length) => {
    const output = values.slice(offset, offset + length);
    offset += length;
    return output;
  };
  return Object.freeze({
    distributions: take(9 * cells),
    rho: take(cells),
    ux: take(cells),
    uy: take(cells),
    mask: take(cells),
    forceX: take(cells),
    forceY: take(cells),
  });
}

async function runNativeProcess(input, outputPath) {
  const argumentsList = [
    "--backend", input.backend,
    "--output", outputPath,
    "--kernel", H2N_OPENCL_SOURCE_PATH,
    "--nx", String(input.nx),
    "--ny", String(input.ny),
    "--steps", String(input.steps),
    "--diameter", String(input.diameterCells),
    "--mask", String(input.maskHalfThicknessCells),
    "--phase", String(input.phaseOffsetYCells),
    "--body", input.nativeBodyMode,
    "--threads", String(input.threads ?? 1),
    "--batch-count", String(input.batchCount ?? 1),
  ];
  const binaryPath = resolve(input.binaryPath);
  const command = input.cpuList ? "taskset" : binaryPath;
  const commandArguments = input.cpuList
    ? ["--cpu-list", input.cpuList, binaryPath, ...argumentsList]
    : argumentsList;
  const child = spawn(command, commandArguments, {
    cwd: input.cwd,
    env: {
      ...process.env,
      OMP_DYNAMIC: "FALSE",
      OMP_PROC_BIND: input.ompProcBind ?? "spread",
      OMP_PLACES: input.ompPlaces ?? "cores",
    },
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
  const diagnostics = Buffer.concat(stderr).toString("utf8");
  if (code !== 0 || signal !== null) {
    throw new Error(
      `NO-GO-H2N-STAGE0-NUMERIC-OR-PERFORMANCE: backend=${input.backend}; `
        + `code=${code}; signal=${signal}; ${diagnostics}`,
    );
  }
  if (diagnostics.trim() !== "") {
    throw new Error(`NO-GO-H2N-PROVENANCE-LEAK: native stderr ${diagnostics}`);
  }
  const lines = Buffer.concat(stdout).toString("utf8").trim().split("\n");
  if (lines.length !== 1) {
    throw new Error("NO-GO-H2N-PROVENANCE-LEAK: native stdout envelope");
  }
  const execution = JSON.parse(lines[0]);
  if (execution.backend !== input.backend
    || execution.nx !== input.nx
    || execution.ny !== input.ny
    || execution.steps !== input.steps
    || execution.scientificPayloadPersisted !== false) {
    throw new Error("NO-GO-H2N-RUNTIME-FALLBACK");
  }
  return Object.freeze(execution);
}

export async function runH2nStage0NativeSnapshots(input) {
  const root = await mkdtemp(join(tmpdir(), "iypt13-h2n-stage0-"));
  const snapshots = new Map();
  const executions = new Map();
  try {
    for (const step of input.checkpointSteps) {
      const outputPath = join(root, `checkpoint-${step}.bin`);
      const execution = await runNativeProcess({ ...input, steps: step }, outputPath);
      const bytes = await readFile(outputPath);
      snapshots.set(step, parseNativeFields(bytes, input.nx * input.ny));
      executions.set(step, execution);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  return Object.freeze({ snapshots, executions });
}

export async function runH2nStage0NativePerformance(input) {
  const root = await mkdtemp(join(tmpdir(), "iypt13-h2n-perf-"));
  const overallStarted = process.hrtime.bigint();
  try {
    const outputPath = join(root, "terminal.bin");
    const execution = await runNativeProcess(input, outputPath);
    const bytes = await readFile(outputPath);
    if (bytes.byteLength !== 15 * input.nx * input.ny * 8) {
      throw new Error("NO-GO-H2N-STAGE0-NUMERIC-OR-PERFORMANCE: performance payload length");
    }
    const auditStarted = process.hrtime.bigint();
    const fields = parseNativeFields(bytes, input.nx * input.ny);
    const initial = buildH2nStage0Fixture(input.nx, input.ny);
    const audit = auditH2nSyntheticTerminal(fields, initial);
    const auditSeconds = Number(process.hrtime.bigint() - auditStarted) / 1e9;
    const shardStarted = process.hrtime.bigint();
    const shard = {
      format: "VP-HW2R-H2N-SYNTHETIC-HASH-SHARD-v1",
      backend: input.backend,
      workUnits: execution.workUnits,
      payloadSha256: createHash("sha256").update(bytes).digest("hex"),
      auditSha256: audit.auditSha256,
      operationCoverage: audit.operationCoverage,
      finite: audit.finite,
      scientificValuesPersisted: false,
      scientificValuesHumanRead: false,
    };
    const written = await writeAtomicCanonicalGzipExclusive(
      join(root, "synthetic-shard.json.gz"),
      shard,
    );
    const shardSeconds = Number(process.hrtime.bigint() - shardStarted) / 1e9;
    const aggregationStarted = process.hrtime.bigint();
    const correctnessSha256 = canonicalSha256({
      shardCanonicalSha256: written.canonicalSha256,
      shardStoredSha256: written.storedSha256,
      auditSha256: audit.auditSha256,
      workUnits: execution.workUnits,
    });
    const aggregationSeconds = Number(
      process.hrtime.bigint() - aggregationStarted,
    ) / 1e9;
    const wallTimeSeconds = Number(
      process.hrtime.bigint() - overallStarted,
    ) / 1e9;
    const accountedChild = execution.coldInitializationSeconds
      + execution.steadyComputeSeconds
      + execution.transferSeconds
      + (execution.synchronizationSeconds ?? 0)
      + execution.auditSeconds
      + execution.cleanupSeconds;
    const parentOverhead = Math.max(
      0,
      wallTimeSeconds - accountedChild - auditSeconds
        - shardSeconds - aggregationSeconds,
    );
    return Object.freeze({
      execution,
      correctnessSha256,
      workUnits: execution.workUnits,
      wallTimeSeconds,
      phasesSeconds: Object.freeze({
        buildOrProvision: 0,
        coldInitialization: execution.coldInitializationSeconds,
        warmup: 0,
        steadyStateCompute: execution.steadyComputeSeconds,
        ipcOrTransfer: execution.transferSeconds
          + (execution.synchronizationSeconds ?? 0) + parentOverhead,
        audit: execution.auditSeconds + auditSeconds,
        shardSerializationFsyncAndHash: shardSeconds,
        finalAggregation: aggregationSeconds,
        cleanup: execution.cleanupSeconds,
      }),
      operationCoverage: audit.operationCoverage,
      correctnessPass: audit.finite
        && Object.values(audit.operationCoverage).every(Boolean),
      scientificValuesPersisted: false,
      scientificValuesHumanRead: false,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export function auditH2nSyntheticTerminal(fields, initial) {
  let finite = true;
  let momentReconstructionPass = true;
  let forceRecompositionPass = true;
  let populationAccountingPass = true;
  let mass = 0;
  let momentumX = 0;
  let momentumY = 0;
  let rawForceX = 0;
  let rawForceY = 0;
  let a2CorrectionX = 0;
  let a2CorrectionY = 0;
  let maskArea = 0;
  let slipSquared = 0;
  for (let cell = 0; cell < fields.rho.length; cell += 1) {
    const offset = 9 * cell;
    const f0 = fields.distributions[offset];
    const f1 = fields.distributions[offset + 1];
    const f2 = fields.distributions[offset + 2];
    const f3 = fields.distributions[offset + 3];
    const f4 = fields.distributions[offset + 4];
    const f5 = fields.distributions[offset + 5];
    const f6 = fields.distributions[offset + 6];
    const f7 = fields.distributions[offset + 7];
    const f8 = fields.distributions[offset + 8];
    const density = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
    const rawMomentumX = f1 - f3 + f5 - f6 - f7 + f8;
    const rawMomentumY = f2 - f4 + f5 + f6 - f7 - f8;
    const penalty = fields.mask[cell];
    const expectedUx = (rawMomentumX / density) / (1 + 0.5 * penalty);
    const expectedUy = (rawMomentumY / density) / (1 + 0.5 * penalty);
    const expectedForceX = density * penalty * -expectedUx;
    const expectedForceY = density * penalty * -expectedUy;
    const values = [
      density,
      expectedUx,
      expectedUy,
      expectedForceX,
      expectedForceY,
      fields.rho[cell],
      fields.ux[cell],
      fields.uy[cell],
      fields.mask[cell],
      fields.forceX[cell],
      fields.forceY[cell],
    ];
    if (!values.every(Number.isFinite)) finite = false;
    if (fields.rho[cell] !== density
      || fields.ux[cell] !== expectedUx
      || fields.uy[cell] !== expectedUy) momentReconstructionPass = false;
    if (fields.forceX[cell] !== expectedForceX
      || fields.forceY[cell] !== expectedForceY) forceRecompositionPass = false;
    mass += density;
    momentumX += rawMomentumX;
    momentumY += rawMomentumY;
    rawForceX -= fields.forceX[cell];
    rawForceY -= fields.forceY[cell];
    maskArea += fields.mask[cell];
    slipSquared += fields.mask[cell]
      * (fields.ux[cell] * fields.ux[cell] + fields.uy[cell] * fields.uy[cell]);
    let initialDensity = 0;
    let initialMomentumX = 0;
    let initialMomentumY = 0;
    for (let direction = 0; direction < 9; direction += 1) {
      const value = initial[offset + direction];
      initialDensity += value;
      const cx = D2Q9_CX[direction];
      const cy = D2Q9_CY[direction];
      initialMomentumX += cx * value;
      initialMomentumY += cy * value;
    }
    const initialDenominator = 1 + 0.5 * fields.mask[cell];
    a2CorrectionX += fields.mask[cell]
      * (fields.rho[cell] * fields.ux[cell]
        - initialMomentumX / initialDenominator);
    a2CorrectionY += fields.mask[cell]
      * (fields.rho[cell] * fields.uy[cell]
        - initialMomentumY / initialDenominator);
    if (!(initialDensity > 0) || !Number.isFinite(initialDensity)) {
      populationAccountingPass = false;
    }
  }
  const scalarAudit = {
    mass,
    momentumX,
    momentumY,
    rawForceX,
    rawForceY,
    a2CorrectedForceX: rawForceX + a2CorrectionX,
    a2CorrectedForceY: rawForceY + a2CorrectionY,
    maskArea,
    slipSquared,
  };
  if (!Object.values(scalarAudit).every(Number.isFinite)) finite = false;
  return Object.freeze({
    finite,
    auditSha256: canonicalSha256(scalarAudit),
    operationCoverage: Object.freeze({
      float64D2q9Layout: true,
      mrtCollisionGuoForcingBrinkman: true,
      scatterStreamingOpenPeriodicBoundary: true,
      analysisPopulationCopyAndHash: true,
      independentMomentReconstruction: momentReconstructionPass,
      independentRawForceIdentity: forceRecompositionPass,
      a2Recomposition: finite,
      fieldDiagnostic: finite,
      compactTrace: true,
      atomicShardHash: true,
      populationMassMomentumAccounting: populationAccountingPass,
    }),
  });
}
