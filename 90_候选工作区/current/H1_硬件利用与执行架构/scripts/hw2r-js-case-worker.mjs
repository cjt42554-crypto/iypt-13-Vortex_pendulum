import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { H2_REPOSITORY_ROOT } from "../../H2_代表性执行与数值资格/src/contract.mjs";
import { auditH2nSyntheticTerminal } from "../../H2_代表性执行与数值资格/src/h2n-stage0-native.mjs";
import {
  H2N_STAGE0_INLET_VELOCITY,
  H2N_STAGE0_REYNOLDS_NUMBER,
  buildH2nStage0Fixture,
  resolveH2nStage0BodyMode,
} from "../../H2_代表性执行与数值资格/src/h2n-stage0-reference.mjs";

const formalLbmPath = resolve(
  H2_REPOSITORY_ROOT,
  "02_模拟程序/src/solvers/highFidelity/lbm.ts",
);

async function readInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  for (const name of ["nx", "ny", "steps", "diameterCells", "batchCount"]) {
    if (!Number.isSafeInteger(value[name]) || value[name] < 1) {
      throw new RangeError(`invalid HW2R JS worker ${name}`);
    }
  }
  if (!Number.isFinite(value.maskHalfThicknessCells)
    || value.maskHalfThicknessCells <= 0) {
    throw new RangeError("invalid HW2R JS worker mask");
  }
  return Object.freeze(value);
}

const input = await readInput();
const wallStarted = process.hrtime.bigint();
const coldStarted = process.hrtime.bigint();
const [{ D2Q9MrtBrinkmanSolver }, bodyMode] = await Promise.all([
  import(pathToFileURL(formalLbmPath)),
  resolveH2nStage0BodyMode(
    input.bodyModeId,
    input.ny,
    input.diameterCells,
  ),
]);
const relaxationTime = 0.5
  + 3 * H2N_STAGE0_INLET_VELOCITY * input.diameterCells
    / H2N_STAGE0_REYNOLDS_NUMBER;
const initial = buildH2nStage0Fixture(input.nx, input.ny);
const solver = new D2Q9MrtBrinkmanSolver({
  nx: input.nx,
  ny: input.ny,
  relaxationTime,
  penalizationTimeSteps: 1,
  outerBoundary: "open-periodic-crossflow",
  maskHalfThickness: input.maskHalfThicknessCells,
});
const checkpoint = Object.freeze({
  format: "VP-HF-CFD2D-LBM-CHECKPOINT-v1",
  nx: input.nx,
  ny: input.ny,
  relaxationTime,
  penalizationTimeSteps: 1,
  outerBoundary: "open-periodic-crossflow",
  maskHalfThickness: input.maskHalfThicknessCells,
  step: 0,
  distributions: initial,
});
const coldInitializationSeconds = Number(
  process.hrtime.bigint() - coldStarted,
) / 1e9;
const computeStarted = process.hrtime.bigint();
for (let batch = 0; batch < input.batchCount; batch += 1) {
  solver.restore(checkpoint);
  for (let step = 0; step < input.steps; step += 1) {
    solver.step(bodyMode.body, H2N_STAGE0_INLET_VELOCITY);
  }
}
const steadyStateComputeSeconds = Number(
  process.hrtime.bigint() - computeStarted,
) / 1e9;
const auditStarted = process.hrtime.bigint();
const terminal = solver.checkpoint().distributions;
const macros = solver.macroscopicCopies(bodyMode.body);
const forceX = new Float64Array(macros.rho.length);
const forceY = new Float64Array(macros.rho.length);
for (let cell = 0; cell < macros.rho.length; cell += 1) {
  forceX[cell] = macros.rho[cell] * macros.mask[cell]
    * ((bodyMode.body?.velocityX ?? 0) - macros.ux[cell]);
  forceY[cell] = macros.rho[cell] * macros.mask[cell]
    * ((bodyMode.body?.velocityY ?? 0) - macros.uy[cell]);
}
const audit = auditH2nSyntheticTerminal({
  distributions: terminal,
  rho: macros.rho,
  ux: macros.ux,
  uy: macros.uy,
  mask: macros.mask,
  forceX,
  forceY,
}, initial);
const payloadSha256 = createHash("sha256")
  .update(Buffer.from(terminal.buffer, terminal.byteOffset, terminal.byteLength))
  .digest("hex");
const auditSeconds = Number(process.hrtime.bigint() - auditStarted) / 1e9;
const correctnessSha256 = canonicalSha256({
  payloadSha256,
  auditSha256: audit.auditSha256,
  operationCoverage: audit.operationCoverage,
});
const wallTimeSeconds = Number(process.hrtime.bigint() - wallStarted) / 1e9;
process.stdout.write(`${JSON.stringify({
  format: "VP-HW2R-JS-REPRESENTATIVE-WORKER-v1",
  correctnessSha256,
  workUnits: input.batchCount * input.steps * input.nx * input.ny,
  wallTimeSeconds,
  coldInitializationSeconds,
  steadyStateComputeSeconds,
  auditSeconds,
  operationCoverage: audit.operationCoverage,
  correctnessPass: audit.finite
    && Object.values(audit.operationCoverage).every(Boolean),
  scientificValuesPersisted: false,
  scientificValuesHumanRead: false,
})}\n`);
