#!/usr/bin/env -S npx vite-node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { cloneConfig, validateConfig } from "../src/core/config";
import type { SimulationConfig, SimulationResult } from "../src/core/types";
import { runHighFidelity } from "../src/solvers/highFidelity";

interface Arguments {
  configPath?: string;
  outputPath?: string;
  csvPath?: string;
  duration?: number;
  latticeVelocity?: number;
  penalizationTimeSteps?: number;
  nx?: number;
  ny?: number;
  cylinderCells?: number;
  sampleEvery?: number;
  fieldEvery?: number;
}

function parseArguments(commandLine: readonly string[]): Arguments {
  const result: Arguments = {};
  for (let index = 0; index < commandLine.length; index += 1) {
    const option = commandLine[index];
    const value = commandLine[index + 1];
    if (["--config", "--output", "--csv", "--duration", "--lattice-velocity", "--penalty-time", "--nx", "--ny", "--diameter-cells", "--sample-every", "--field-every"].includes(option ?? "") && value === undefined) {
      throw new Error(`${option} requires a value`);
    }
    if (option === "--config" && value !== undefined) { result.configPath = resolve(value); index += 1; }
    else if (option === "--output" && value !== undefined) { result.outputPath = resolve(value); index += 1; }
    else if (option === "--csv" && value !== undefined) { result.csvPath = resolve(value); index += 1; }
    else if (option === "--duration" && value !== undefined) {
      const duration = Number(value);
      if (!(duration > 0) || !Number.isFinite(duration)) throw new Error("--duration must be a finite positive number");
      result.duration = duration;
      index += 1;
    } else if (option === "--lattice-velocity" && value !== undefined) {
      const latticeVelocity = Number(value);
      if (!(latticeVelocity > 0) || !Number.isFinite(latticeVelocity)) throw new Error("--lattice-velocity must be a finite positive number");
      result.latticeVelocity = latticeVelocity;
      index += 1;
    } else if (option === "--penalty-time" && value !== undefined) {
      const penalizationTimeSteps = Number(value);
      if (!(penalizationTimeSteps >= 1) || !Number.isFinite(penalizationTimeSteps)) throw new Error("--penalty-time must be finite and >= 1");
      result.penalizationTimeSteps = penalizationTimeSteps;
      index += 1;
    } else if (["--nx", "--ny", "--diameter-cells", "--sample-every", "--field-every"].includes(option ?? "") && value !== undefined) {
      const integer = Number(value);
      if (!Number.isInteger(integer) || integer <= 0) throw new Error(`${option} must be a positive integer`);
      if (option === "--nx") result.nx = integer;
      else if (option === "--ny") result.ny = integer;
      else if (option === "--diameter-cells") result.cylinderCells = integer;
      else if (option === "--sample-every") result.sampleEvery = integer;
      else result.fieldEvery = integer;
      index += 1;
    } else if (option === "--help") {
      process.stdout.write(
        "Usage: npm run simulate:high-fidelity -- [--config config.json] [--duration s] [--lattice-velocity U_lu] [--penalty-time steps] [--nx N] [--ny N] [--diameter-cells N] [--sample-every N] [--field-every N] [--output result.json] [--csv samples.csv]\n"
        + "Without --config a short fixed-cylinder research smoke case is used.\n",
      );
      process.exit(0);
    } else if (option !== undefined) throw new Error(`unknown option: ${option}`);
  }
  return result;
}

function smokeConfig(duration = 0.5): SimulationConfig {
  const config = cloneConfig();
  config.backend = "highFidelity";
  config.cfd2d.couplingMode = "fixed";
  config.cfd2d.stripClosure = "none";
  config.fluid.flowRampTime = Math.min(2, duration / 4);
  config.solver.duration = duration;
  config.cfd2d.sampleEvery = 10;
  config.cfd2d.fieldEvery = 100;
  return config;
}

function csv(result: SimulationResult): string {
  const keys = [
    "time", "theta", "omega", "displacement", "velocity", "flowSpeed", "reynolds",
    "lineForceX", "lineForceY", "linePower2d", "stripTorqueDensity",
    "stressLineForceX", "stressLineForceY", "forcePathRelativeDifference",
    "dragCoefficient", "liftCoefficient",
  ] as const;
  const exchangeKeys = [
    "appliedStartTime", "appliedEndTime", "appliedMidpointTime",
    "appliedRawLineImpulseX", "appliedRawLineImpulseY",
    "appliedRawLineForceX", "appliedRawLineForceY",
    "appliedRawLineWork", "appliedRawTorqueImpulse", "appliedRawTorque",
    "appliedRawWork", "appliedRawPower", "brinkmanFluidWork",
    "rawSolidReactionWork", "brinkmanPenaltyDissipation", "brinkmanAlgebraicResidual",
    "diagnosticEndpointTime", "diagnosticEndpointRawLineForceX",
    "diagnosticEndpointRawLineForceY",
    "legacyIncompleteStressContourLineForceX",
    "legacyIncompleteStressContourLineForceY",
    "cumulativeAppliedRawLineWork", "cumulativeAppliedRawWork",
    "cumulativeBrinkmanFluidWork", "cumulativeRawSolidReactionWork",
    "cumulativeBrinkmanPenaltyDissipation", "cumulativeBrinkmanAlgebraicResidual",
  ] as const;
  const rows = result.samples.map((sample) => {
    const applied = sample.interfaceExchange?.applied;
    const diagnostic = sample.interfaceExchange?.diagnostic;
    const cumulative = sample.interfaceExchange?.cumulative;
    const exchangeValues = [
      applied?.startTime, applied?.endTime, applied?.midpointTime,
      applied?.appliedRawLineImpulseX, applied?.appliedRawLineImpulseY,
      applied?.appliedRawLineForceX, applied?.appliedRawLineForceY,
      applied?.appliedRawLineWork, applied?.appliedRawTorqueImpulse,
      applied?.appliedRawTorque, applied?.appliedRawWork, applied?.appliedRawPower,
      applied?.brinkmanFluidWork, applied?.rawSolidReactionWork,
      applied?.brinkmanPenaltyDissipation, applied?.brinkmanAlgebraicResidual,
      diagnostic?.endpointTime, diagnostic?.diagnosticEndpointRawLineForceX,
      diagnostic?.diagnosticEndpointRawLineForceY,
      diagnostic?.legacyIncompleteStressContourLineForceX,
      diagnostic?.legacyIncompleteStressContourLineForceY,
      cumulative?.cumulativeAppliedRawLineWork,
      cumulative?.cumulativeAppliedRawWork,
      cumulative?.cumulativeBrinkmanFluidWork,
      cumulative?.cumulativeRawSolidReactionWork,
      cumulative?.cumulativeBrinkmanPenaltyDissipation,
      cumulative?.cumulativeBrinkmanAlgebraicResidual,
    ];
    return [
      ...keys.map((key) => sample[key]),
      ...exchangeValues,
    ].map((value) => value === null || value === undefined ? "" : String(value)).join(",");
  });
  return `${[...keys, ...exchangeKeys].join(",")}\n${rows.join("\n")}\n`;
}

const options = parseArguments(process.argv.slice(2));
const config = options.configPath === undefined
  ? smokeConfig(options.duration)
  : JSON.parse(await readFile(options.configPath, "utf8")) as SimulationConfig;
if (options.duration !== undefined) config.solver.duration = options.duration;
if (options.latticeVelocity !== undefined) config.cfd2d.latticeVelocity = options.latticeVelocity;
if (options.penalizationTimeSteps !== undefined) config.cfd2d.penalizationTimeSteps = options.penalizationTimeSteps;
if (options.nx !== undefined) config.cfd2d.nx = options.nx;
if (options.ny !== undefined) config.cfd2d.ny = options.ny;
if (options.cylinderCells !== undefined) config.cfd2d.cylinderCells = options.cylinderCells;
if (options.sampleEvery !== undefined) config.cfd2d.sampleEvery = options.sampleEvery;
if (options.fieldEvery !== undefined) config.cfd2d.fieldEvery = options.fieldEvery;
if (config.backend !== "highFidelity") throw new Error("CLI accepts only backend='highFidelity'");
const errors = validateConfig(config).filter((issue) => issue.severity === "error");
if (errors.length > 0) throw new Error(errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));

const started = performance.now();
const result = await runHighFidelity(config, undefined, "high-fidelity-cli");
const elapsedMilliseconds = performance.now() - started;
if (options.outputPath !== undefined) {
  await mkdir(dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, `${JSON.stringify(result, (_key, value) =>
    ArrayBuffer.isView(value) ? Array.from(value as unknown as ArrayLike<number>) : value, 2)}\n`, "utf8");
}
if (options.csvPath !== undefined) {
  await mkdir(dirname(options.csvPath), { recursive: true });
  await writeFile(options.csvPath, csv(result), "utf8");
}
process.stdout.write(`${JSON.stringify({
  configPath: options.configPath ?? null,
  outputPath: options.outputPath ?? null,
  csvPath: options.csvPath ?? null,
  terminationCode: result.terminationCode,
  complete: result.complete,
  evidenceLevel: result.provenance.evidenceLevel,
  evidenceClaims: result.provenance.evidenceClaims,
  nativeLoadType: result.provenance.nativeLoadType,
  forceContractId: result.provenance.forceContractId,
  sharedPhysicalInputHash: result.provenance.sharedPhysicalInputHash,
  backendDynamicsContractHash: result.provenance.backendDynamicsContractHash,
  analysisContractHash: result.provenance.analysisContractHash,
  finalTime: result.samples.at(-1)?.time ?? 0,
  sampleCount: result.samples.length,
  fieldFrameCount: result.fields.length,
  lattice: result.numerical.lattice,
  appliedMetrics: {
    meanAppliedRawMechanicalPower: result.metrics.meanAppliedRawMechanicalPower,
    meanAppliedRawLinePower: result.metrics.meanAppliedRawLinePower,
    appliedMechanicalEnergyLedgerResidual:
      result.metrics.appliedMechanicalEnergyLedgerResidual,
    appliedMechanicalEnergyLedgerRelativeResidual:
      result.metrics.appliedMechanicalEnergyLedgerRelativeResidual,
  },
  elapsedMilliseconds,
}, null, 2)}\n`);
