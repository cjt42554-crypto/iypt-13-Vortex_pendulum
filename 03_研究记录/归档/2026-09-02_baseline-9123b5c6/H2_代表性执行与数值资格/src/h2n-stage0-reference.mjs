import { createHash } from "node:crypto";
import { endianness } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { H2_REPOSITORY_ROOT } from "./contract.mjs";

export const H2N_STAGE0_FIXTURE_LABEL = "IYPT13-H2N-STAGE0-FIXTURE-v1";
export const H2N_STAGE0_FIXTURE_SHA256 = createHash("sha256")
  .update(H2N_STAGE0_FIXTURE_LABEL)
  .digest("hex");
export const H2N_STAGE0_FIXTURE_SEED = Number.parseInt(
  H2N_STAGE0_FIXTURE_SHA256.slice(0, 8),
  16,
) >>> 0;
export const H2N_STAGE0_INLET_VELOCITY = 0.05;
export const H2N_STAGE0_REYNOLDS_NUMBER = 185;

const D2Q9_CX = Object.freeze([0, 1, 0, -1, 0, 1, -1, -1, 1]);
const D2Q9_CY = Object.freeze([0, 0, 1, 0, -1, 1, 1, -1, -1]);
const D2Q9_WEIGHT = Object.freeze([
  4 / 9,
  1 / 9, 1 / 9, 1 / 9, 1 / 9,
  1 / 36, 1 / 36, 1 / 36, 1 / 36,
]);

const formalLbmPath = resolve(
  H2_REPOSITORY_ROOT,
  "02_模拟程序/src/solvers/highFidelity/lbm.ts",
);
const frozenDefinitionPath = resolve(
  H2_REPOSITORY_ROOT,
  "90_候选工作区/current/A8_二维特征开放边界实验后端/"
    + "src/brinkman-multiresolution-contract-v2-1.ts",
);

function mix32(input) {
  let value = input >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  value ^= value >>> 16;
  return value >>> 0;
}

function equilibrium(direction, density, velocityX, velocityY) {
  const cx = D2Q9_CX[direction];
  const cy = D2Q9_CY[direction];
  const weight = D2Q9_WEIGHT[direction];
  const projection = cx * velocityX + cy * velocityY;
  return weight * density * (
    1 + 3 * projection + 4.5 * projection * projection
      - 1.5 * (velocityX * velocityX + velocityY * velocityY)
  );
}

export function buildH2nStage0Fixture(nx, ny) {
  if (endianness() !== "LE") {
    throw new Error("H2-N stage-0 requires a little-endian Float64 host");
  }
  if (!Number.isSafeInteger(nx) || nx < 8
    || !Number.isSafeInteger(ny) || ny < 8) {
    throw new RangeError("H2-N fixture geometry must be integer and at least 8 x 8");
  }
  const cells = nx * ny;
  const distributions = new Float64Array(9 * cells);
  for (let cell = 0; cell < cells; cell += 1) {
    const value = mix32(H2N_STAGE0_FIXTURE_SEED ^ cell);
    const density = 1 + ((value & 255) - 127.5) * 2 ** -24;
    const velocityX = H2N_STAGE0_INLET_VELOCITY
      + (((value >>> 8) & 255) - 127.5) * 2 ** -28;
    const velocityY = (((value >>> 16) & 255) - 127.5) * 2 ** -28;
    for (let direction = 0; direction < 9; direction += 1) {
      distributions[9 * cell + direction] = equilibrium(
        direction,
        density,
        velocityX,
        velocityY,
      );
    }
  }
  return distributions;
}

export async function resolveH2nStage0BodyMode(bodyModeId, ny, diameterCells) {
  const source = await import(pathToFileURL(frozenDefinitionPath));
  const phases = new Map(
    source.BRINKMAN_MULTIRESOLUTION_V2P1_PHASES
      .map((phase) => [phase.id, phase.offsetYCells]),
  );
  if (bodyModeId === "body-null") {
    return Object.freeze({
      bodyModeId,
      nativeBodyMode: "body-null",
      phaseOffsetYCells: phases.get("baseline"),
      body: null,
    });
  }
  const phaseId = bodyModeId === "fixed-body-baseline-phase"
    ? "baseline"
    : bodyModeId === "fixed-body-minus-half-cell-phase"
      ? "minus-half-cell"
      : null;
  const phaseOffsetYCells = phases.get(phaseId);
  if (phaseId === null || !Number.isFinite(phaseOffsetYCells)) {
    throw new Error(`unknown H2-N stage-0 body mode ${bodyModeId}`);
  }
  return Object.freeze({
    bodyModeId,
    nativeBodyMode: "fixed-body",
    phaseOffsetYCells,
    body: Object.freeze({
      centerX: 14 * diameterCells,
      centerY: 0.5 * (ny - 1) + phaseOffsetYCells,
      radius: 0.5 * diameterCells,
      velocityX: 0,
      velocityY: 0,
    }),
  });
}

function snapshotSolver(solver, body) {
  const distributions = solver.checkpoint().distributions;
  const fields = solver.macroscopicCopies(body);
  const forceX = new Float64Array(fields.rho.length);
  const forceY = new Float64Array(fields.rho.length);
  for (let cell = 0; cell < fields.rho.length; cell += 1) {
    const densityPenalty = fields.rho[cell] * fields.mask[cell];
    forceX[cell] = densityPenalty * ((body?.velocityX ?? 0) - fields.ux[cell]);
    forceY[cell] = densityPenalty * ((body?.velocityY ?? 0) - fields.uy[cell]);
  }
  return Object.freeze({
    distributions,
    rho: fields.rho,
    ux: fields.ux,
    uy: fields.uy,
    mask: fields.mask,
    forceX,
    forceY,
  });
}

export async function buildH2nStage0Reference(input) {
  const [{ D2Q9MrtBrinkmanSolver }, bodyMode] = await Promise.all([
    import(pathToFileURL(formalLbmPath)),
    resolveH2nStage0BodyMode(input.bodyModeId, input.ny, input.diameterCells),
  ]);
  const requestedSteps = new Set(input.checkpointSteps);
  const maximumStep = Math.max(...requestedSteps);
  if (maximumStep > input.steps || Math.min(...requestedSteps) < 0) {
    throw new RangeError("H2-N reference checkpoint is outside the requested run");
  }
  const relaxationTime = 0.5
    + 3 * H2N_STAGE0_INLET_VELOCITY * input.diameterCells
      / H2N_STAGE0_REYNOLDS_NUMBER;
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: input.nx,
    ny: input.ny,
    relaxationTime,
    penalizationTimeSteps: 1,
    outerBoundary: "open-periodic-crossflow",
    maskHalfThickness: input.maskHalfThicknessCells,
  });
  solver.restore({
    format: "VP-HF-CFD2D-LBM-CHECKPOINT-v1",
    nx: input.nx,
    ny: input.ny,
    relaxationTime,
    penalizationTimeSteps: 1,
    outerBoundary: "open-periodic-crossflow",
    maskHalfThickness: input.maskHalfThicknessCells,
    step: 0,
    distributions: buildH2nStage0Fixture(input.nx, input.ny),
  });
  const snapshots = new Map();
  const exchanges = new Map();
  if (requestedSteps.has(0)) snapshots.set(0, snapshotSolver(solver, bodyMode.body));
  for (let step = 1; step <= maximumStep; step += 1) {
    const exchange = solver.step(bodyMode.body, H2N_STAGE0_INLET_VELOCITY);
    exchanges.set(step, exchange);
    if (requestedSteps.has(step)) {
      snapshots.set(step, snapshotSolver(solver, bodyMode.body));
    }
  }
  return Object.freeze({
    relaxationTime,
    bodyMode,
    snapshots,
    exchanges,
    fixtureSha256: H2N_STAGE0_FIXTURE_SHA256,
  });
}
