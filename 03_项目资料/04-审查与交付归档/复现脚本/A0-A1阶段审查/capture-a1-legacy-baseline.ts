#!/usr/bin/env -S npx vite-node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { cloneConfig, hashConfig } from "../src/core/config";
import type { SimulationConfig } from "../src/core/types";
import { HighFidelitySimulation } from "../src/solvers/highFidelity/model";

const FORMAT = "VP-CFD2D-A1-LEGACY-BASELINE-v1";
const DEFAULT_STEPS = 64;

interface BaselineTracePoint {
  step: number;
  time: number;
  theta: number;
  omega: number;
  angularAcceleration: number;
  cumulativeBoundaryMassInput: number;
  legacyReactionX: number;
  legacyReactionY: number;
  distributionsSha256: string;
}

interface BaselineCase {
  id: string;
  configHash: string;
  steps: number;
  config: SimulationConfig;
  trace: BaselineTracePoint[];
  traceSha256: string;
  /** Verification-only A1 observation; absent from the frozen pre-A1 file. */
  appliedLegacyReactionExact?: boolean;
}

interface BaselineDocument {
  format: typeof FORMAT;
  createdAt: string;
  purpose: string;
  cases: BaselineCase[];
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text: string): string {
  return sha256Bytes(new TextEncoder().encode(text));
}

function distributionSha256(distributions: Float64Array): string {
  return sha256Bytes(new Uint8Array(
    distributions.buffer,
    distributions.byteOffset,
    distributions.byteLength,
  ));
}

function weakFsiConfig(
  cylinderCells: number,
  options: {
    latticeVelocity?: number;
    penalizationTimeSteps?: number;
    randomSeed?: number;
    quiescentRamp?: boolean;
  } = {},
): SimulationConfig {
  const config = cloneConfig();
  config.backend = "highFidelity";
  config.cfd2d.couplingMode = "weak-fsi";
  config.cfd2d.stripClosure = "fully-coherent-upper-bound";
  config.cfd2d.cylinderCells = cylinderCells;
  config.cfd2d.nx = 16 * cylinderCells;
  config.cfd2d.ny = 8 * cylinderCells;
  config.cfd2d.latticeVelocity = options.latticeVelocity ?? 0.05;
  config.cfd2d.penalizationTimeSteps = options.penalizationTimeSteps
    ?? cylinderCells / 8;
  config.cfd2d.fieldEvery = 160;
  config.cfd2d.sampleEvery = 10;
  config.initial.randomSeed = options.randomSeed ?? 2027;
  config.solver.duration = options.quiescentRamp === true ? 6 : 12;
  if (options.quiescentRamp === true) config.fluid.flowRampTime = 1_000_000_000;
  return config;
}

function baselineConfigurations(): Array<{ id: string; config: SimulationConfig }> {
  return [
    { id: "cfd-weak-fsi-d08-12s", config: weakFsiConfig(8) },
    { id: "cfd-weak-fsi-d12-default-12s", config: weakFsiConfig(12) },
    { id: "cfd-weak-fsi-d16-12s", config: weakFsiConfig(16) },
    {
      id: "cfd-weak-fsi-d12-low-mach-12s",
      config: weakFsiConfig(12, { latticeVelocity: 0.025, penalizationTimeSteps: 3 }),
    },
    {
      id: "cfd-weak-fsi-d12-seed2028-12s",
      config: weakFsiConfig(12, { randomSeed: 2028 }),
    },
    {
      id: "cfd-weak-fsi-quiescent-control-6s",
      config: weakFsiConfig(12, { quiescentRamp: true }),
    },
  ];
}

function captureCase(id: string, config: SimulationConfig, steps: number): BaselineCase {
  const simulation = new HighFidelitySimulation(config);
  const trace: BaselineTracePoint[] = [];
  let appliedLegacyReactionExact = true;
  for (let index = 0; index < steps; index += 1) {
    const midpoint = simulation.time + 0.5 * simulation.mapping.dt;
    const body = simulation.bodyAt(midpoint);
    const legacyReaction = simulation.solver.penaltyReaction(body);
    const advance = simulation.advanceOne(false, false);
    const lineForceScale = simulation.mapping.lineForceScale;
    const lineImpulseScale = lineForceScale * simulation.mapping.dt;
    appliedLegacyReactionExact &&= advance.exchange.appliedRawLineForceX
        === legacyReaction.x * lineForceScale
      && advance.exchange.appliedRawLineForceY === legacyReaction.y * lineForceScale
      && advance.exchange.appliedRawLineImpulseX
        === legacyReaction.x * lineImpulseScale
      && advance.exchange.appliedRawLineImpulseY
        === legacyReaction.y * lineImpulseScale;
    const checkpoint = simulation.checkpoint();
    trace.push({
      step: checkpoint.latticeStep,
      time: simulation.time,
      theta: checkpoint.theta,
      omega: checkpoint.omega,
      angularAcceleration: checkpoint.angularAcceleration,
      cumulativeBoundaryMassInput: checkpoint.cumulativeBoundaryMassInput,
      legacyReactionX: legacyReaction.x,
      legacyReactionY: legacyReaction.y,
      distributionsSha256: distributionSha256(checkpoint.lbm.distributions),
    });
  }
  return {
    id,
    configHash: hashConfig(config),
    steps,
    config,
    trace,
    traceSha256: sha256Text(JSON.stringify(trace)),
    appliedLegacyReactionExact,
  };
}

function capture(configurations = baselineConfigurations(), steps = DEFAULT_STEPS): BaselineDocument {
  return {
    format: FORMAT,
    createdAt: new Date().toISOString(),
    purpose: "Pre-A1 exact legacy trajectory and LBM-distribution baseline; no physical correction.",
    cases: configurations.map(({ id, config }) => captureCase(id, config, steps)),
  };
}

function parseArguments(args: readonly string[]):
  | { mode: "write"; output: string }
  | { mode: "verify"; baseline: string; report: string } {
  if (args[0] === "--write" && args[1] !== undefined && args.length === 2) {
    return { mode: "write", output: resolve(args[1]) };
  }
  if (args[0] === "--verify" && args[1] !== undefined
    && args[2] === "--report" && args[3] !== undefined && args.length === 4) {
    return { mode: "verify", baseline: resolve(args[1]), report: resolve(args[3]) };
  }
  throw new Error(
    "Usage: capture-a1-legacy-baseline.ts --write OUTPUT | --verify BASELINE --report REPORT",
  );
}

const command = parseArguments(process.argv.slice(2));
if (command.mode === "write") {
  try {
    await access(command.output);
    throw new Error(`refusing to overwrite existing baseline: ${command.output}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("refusing")) throw error;
  }
  const document = capture();
  await mkdir(dirname(command.output), { recursive: true });
  await writeFile(command.output, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: "BASELINE-WRITTEN",
    output: command.output,
    cases: document.cases.map(({ id, configHash, steps, traceSha256 }) => ({
      id, configHash, steps, traceSha256,
    })),
  }, null, 2)}\n`);
} else {
  const expected = JSON.parse(await readFile(command.baseline, "utf8")) as BaselineDocument;
  if (expected.format !== FORMAT) throw new Error(`unsupported baseline format: ${expected.format}`);
  const actual = capture(
    expected.cases.map(({ id, config }) => ({ id, config })),
    expected.cases[0]?.steps ?? DEFAULT_STEPS,
  );
  const comparisons = expected.cases.map((expectedCase, index) => {
    const actualCase = actual.cases[index];
    const exact = actualCase !== undefined
      && expectedCase.id === actualCase.id
      && expectedCase.configHash === actualCase.configHash
      && expectedCase.steps === actualCase.steps
      && expectedCase.traceSha256 === actualCase.traceSha256
      && actualCase.appliedLegacyReactionExact === true
      && JSON.stringify(expectedCase.trace) === JSON.stringify(actualCase.trace);
    return {
      id: expectedCase.id,
      exact,
      expectedTraceSha256: expectedCase.traceSha256,
      actualTraceSha256: actualCase?.traceSha256 ?? null,
      appliedLegacyReactionExact: actualCase?.appliedLegacyReactionExact ?? false,
    };
  });
  const passed = comparisons.every(({ exact }) => exact);
  const report = {
    format: "VP-CFD2D-A1-LEGACY-REGRESSION-v1",
    createdAt: new Date().toISOString(),
    baseline: command.baseline,
    status: passed ? "PASS" : "STOP-A1-REGRESSION",
    comparisons,
  };
  await mkdir(dirname(command.report), { recursive: true });
  await writeFile(command.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!passed) process.exitCode = 2;
}
