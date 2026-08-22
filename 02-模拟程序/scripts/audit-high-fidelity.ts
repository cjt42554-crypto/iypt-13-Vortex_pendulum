import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { cloneConfig } from "../src/core/config";
import { runHighFidelity } from "../src/solvers/highFidelity";
import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED_SQUARED,
  type LbmBodyKinematics,
} from "../src/solvers/highFidelity/lbm";

interface TaylorGreenCase {
  cells: number;
  latticeSteps: number;
  physicalTime: number;
  latticeAmplitude: number;
  relativeVelocityL2: number;
  maximumVelocityError: number;
  relativeMassError: number;
}

function taylorGreen(cells: number): TaylorGreenCase {
  const length = 2 * Math.PI;
  const viscosityPhysical = 0.1;
  const amplitudePhysical = 0.1;
  const relaxationTime = 0.8;
  const viscosityLattice = LATTICE_SOUND_SPEED_SQUARED * (relaxationTime - 0.5);
  const dx = length / cells;
  const dt = viscosityLattice * dx * dx / viscosityPhysical;
  const latticeSteps = Math.max(1, Math.round(1 / dt));
  const physicalTime = latticeSteps * dt;
  const velocityScale = dx / dt;
  const latticeAmplitude = amplitudePhysical / velocityScale;
  const waveNumberLattice = 2 * Math.PI / cells;
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: cells,
    ny: cells,
    relaxationTime,
    penalizationTimeSteps: 2,
    outerBoundary: "periodic",
  });
  solver.initializeField((x, y) => {
    const ux = latticeAmplitude * Math.sin(waveNumberLattice * x) * Math.cos(waveNumberLattice * y);
    const uy = -latticeAmplitude * Math.cos(waveNumberLattice * x) * Math.sin(waveNumberLattice * y);
    const pressure = 0.25 * latticeAmplitude ** 2 * (
      Math.cos(2 * waveNumberLattice * x) + Math.cos(2 * waveNumberLattice * y)
    );
    return { rho: 1 + pressure / LATTICE_SOUND_SPEED_SQUARED, ux, uy };
  });
  const initialMass = solver.inspect(null).mass;
  for (let step = 0; step < latticeSteps; step += 1) solver.step(null, 0);
  const field = solver.macroscopicCopies(null);
  const final = solver.inspect(null);
  const decay = Math.exp(-2 * viscosityPhysical * physicalTime);
  let squaredError = 0;
  let squaredReference = 0;
  let maximumVelocityError = 0;
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      const cell = x + cells * y;
      const coordinateX = dx * x;
      const coordinateY = dx * y;
      const expectedX = amplitudePhysical * Math.sin(coordinateX) * Math.cos(coordinateY) * decay;
      const expectedY = -amplitudePhysical * Math.cos(coordinateX) * Math.sin(coordinateY) * decay;
      const computedX = (field.ux[cell] ?? 0) * velocityScale;
      const computedY = (field.uy[cell] ?? 0) * velocityScale;
      const error = Math.hypot(computedX - expectedX, computedY - expectedY);
      maximumVelocityError = Math.max(maximumVelocityError, error);
      squaredError += error * error;
      squaredReference += expectedX * expectedX + expectedY * expectedY;
    }
  }
  return {
    cells,
    latticeSteps,
    physicalTime,
    latticeAmplitude,
    relativeVelocityL2: Math.sqrt(squaredError / squaredReference),
    maximumVelocityError,
    relativeMassError: Math.abs(final.mass - initialMass) / initialMass,
  };
}

function regressionOrder(cases: TaylorGreenCase[]): number {
  const points = cases.map((item) => ({
    x: Math.log(2 * Math.PI / item.cells),
    y: Math.log(item.relativeVelocityL2),
  }));
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  return points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0)
    / points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
}

function uniformAndZeroFlow() {
  const uniformSolver = new D2Q9MrtBrinkmanSolver({
    nx: 40,
    ny: 28,
    relaxationTime: 0.8,
    penalizationTimeSteps: 1.5,
    outerBoundary: "periodic",
  });
  uniformSolver.initializeUniform(0.037, -0.011);
  const initial = uniformSolver.inspect(null);
  for (let step = 0; step < 80; step += 1) uniformSolver.step(null, 0);
  const final = uniformSolver.inspect(null);
  const field = uniformSolver.macroscopicCopies(null);
  let maximumVelocityError = 0;
  for (let cell = 0; cell < field.ux.length; cell += 1) {
    maximumVelocityError = Math.max(
      maximumVelocityError,
      Math.hypot((field.ux[cell] ?? 0) - 0.037, (field.uy[cell] ?? 0) + 0.011),
    );
  }

  const zeroSolver = new D2Q9MrtBrinkmanSolver({
    nx: 48,
    ny: 32,
    relaxationTime: 0.75,
    penalizationTimeSteps: 1.5,
    outerBoundary: "periodic",
  });
  const body: LbmBodyKinematics = {
    centerX: 17.2,
    centerY: 15.4,
    radius: 4,
    velocityX: 0,
    velocityY: 0,
  };
  for (let step = 0; step < 40; step += 1) zeroSolver.step(body, 0);
  const force = zeroSolver.inspect(body);
  return {
    uniform: {
      latticeSteps: 80,
      relativeMassError: Math.abs(final.mass - initial.mass) / initial.mass,
      maximumVelocityError,
      minimumDensity: final.minimumDensity,
      maximumDensity: final.maximumDensity,
    },
    zeroFlowBody: {
      latticeSteps: 40,
      penaltyForceMagnitude: Math.hypot(force.penaltyForceX, force.penaltyForceY),
      stressForceMagnitude: Math.hypot(force.stressForceX, force.stressForceY),
    },
  };
}

function checkpointReplay(): { comparedPopulations: number; maximumAbsoluteDifference: number } {
  const make = () => new D2Q9MrtBrinkmanSolver({
    nx: 36,
    ny: 24,
    relaxationTime: 0.82,
    penalizationTimeSteps: 2,
    outerBoundary: "periodic",
  });
  const continuous = make();
  continuous.initializeField((x, y) => ({
    ux: 0.02 * Math.sin(2 * Math.PI * y / 24),
    uy: 0.01 * Math.cos(2 * Math.PI * x / 36),
  }));
  for (let step = 0; step < 19; step += 1) continuous.step(null, 0);
  const checkpoint = continuous.checkpoint();
  for (let step = 0; step < 31; step += 1) continuous.step(null, 0);
  const resumed = make();
  resumed.restore(checkpoint);
  for (let step = 0; step < 31; step += 1) resumed.step(null, 0);
  const a = continuous.checkpoint().distributions;
  const b = resumed.checkpoint().distributions;
  let maximumAbsoluteDifference = 0;
  for (let index = 0; index < a.length; index += 1) {
    maximumAbsoluteDifference = Math.max(maximumAbsoluteDifference, Math.abs((a[index] ?? 0) - (b[index] ?? 0)));
  }
  return { comparedPopulations: a.length, maximumAbsoluteDifference };
}

async function unifiedSmoke(mode: "fixed" | "prescribed") {
  const config = cloneConfig();
  config.backend = "highFidelity";
  config.cfd2d.couplingMode = mode;
  config.cfd2d.stripClosure = "none";
  config.cfd2d.nx = 96;
  config.cfd2d.ny = 56;
  config.cfd2d.cylinderCells = 8;
  config.cfd2d.latticeVelocity = 0.04;
  config.cfd2d.sampleEvery = 5;
  config.cfd2d.fieldEvery = 1000;
  config.cfd2d.prescribedAmplitude = 0.01;
  config.cfd2d.prescribedFrequency = 0.5;
  config.fluid.flowRampTime = 0.02;
  config.solver.duration = 0.08;
  const result = await runHighFidelity(config, undefined, `audit-${mode}`);
  let maximumPowerIdentityError = 0;
  for (const sample of result.samples) {
    maximumPowerIdentityError = Math.max(
      maximumPowerIdentityError,
      Math.abs((sample.linePower2d ?? 0) - (sample.lineForceY ?? 0)
        * config.cfd2d.stripAxialCoordinate * Math.cos(sample.theta) * sample.omega),
    );
  }
  return {
    terminationCode: result.terminationCode,
    complete: result.complete,
    samples: result.samples.length,
    finalTime: result.samples.at(-1)?.time ?? 0,
    maximumPowerIdentityError,
    lattice: result.numerical.lattice,
  };
}

const outputPath = resolve(
  process.argv[2]
    ?? "../03-项目资料/03-计算结果与证据/artifacts/phase3-high-fidelity-component-audit.json",
);
const elementary = uniformAndZeroFlow();
const taylorGreenCases = [24, 32, 48, 64].map(taylorGreen);
const observedSpatialOrder = regressionOrder(taylorGreenCases);
const replay = checkpointReplay();
const fixed = await unifiedSmoke("fixed");
const prescribed = await unifiedSmoke("prescribed");
const checks = {
  constantFlow: elementary.uniform.relativeMassError < 1e-12
    && elementary.uniform.maximumVelocityError < 1e-12,
  zeroFlow: elementary.zeroFlowBody.penaltyForceMagnitude < 1e-12
    && elementary.zeroFlowBody.stressForceMagnitude < 1e-12,
  taylorGreen: taylorGreenCases.every((item) => item.relativeVelocityL2 < 0.05)
    && observedSpatialOrder > 1.5,
  checkpoint: replay.maximumAbsoluteDifference === 0,
  fixedEntry: fixed.complete && fixed.terminationCode === "COMPLETED",
  prescribedPower: prescribed.complete
    && prescribed.terminationCode === "COMPLETED"
    && prescribed.maximumPowerIdentityError < 1e-14,
};
const report = {
  auditId: "VP-HF-CFD2D-v1-component-verification",
  createdAt: new Date().toISOString(),
  evidenceLevel: Object.values(checks).every(Boolean) ? "verified-component" : "unvalidated-preview",
  scope: "A-00/A-02/A-03/A-08-power-sign/A-10-short-replay components only",
  explicitNonClaims: [
    "not A-00 through A-14 complete acceptance",
    "not a fixed-cylinder benchmark validation",
    "not grid/time/domain/Mach converged cylinder loads",
    "not three-dimensional free-surface DNS",
    "not a canonical apparatus prediction",
  ],
  checks,
  constantAndZeroFlow: elementary,
  taylorGreen: {
    cases: taylorGreenCases,
    observedSpatialOrder,
    designExpectation: "approximately second order in the smooth periodic low-Mach limit",
  },
  checkpointReplay: replay,
  unifiedBackendSmoke: { fixed, prescribed },
  missingHardGates: ["A-04", "A-05-converged", "A-06", "A-07", "A-08-literature", "A-09", "A-13", "A-L01", "A-L02", "A-L03", "A-L04"],
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
