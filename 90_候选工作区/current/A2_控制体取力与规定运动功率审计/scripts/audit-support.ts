import { resolve } from "node:path";
import type { SimulationConfig } from "../../../../02_模拟程序/src/core/types";
import { signedTrend } from "../src/control-volume-force.ts";

const TWO_PI = 2 * Math.PI;
const ETA_HAT = 0.00625;

export interface CliOptions {
  profile: "smoke" | "research";
  outputPath: string;
  markdownPath: string;
  amplitude: number;
  frequency: number;
  cycles: number;
  discardCycles: number;
}

export interface MatrixCase {
  id: string;
  diameterCells: number;
  latticeVelocity: number;
}

export interface HarmonicAccumulator {
  duration: number;
  forceIntegral: number;
  velocityIntegral: number;
  powerIntegral: number;
  forceSquaredIntegral: number;
  velocitySquaredIntegral: number;
  forceCosIntegral: number;
  forceMinusSinIntegral: number;
  velocityCosIntegral: number;
  velocityMinusSinIntegral: number;
}


export interface FinalHarmonic {
  duration: number;
  meanForce: number;
  meanVelocity: number;
  meanPower: number;
  forceRms: number;
  velocityRms: number;
  forceFundamental: { real: number; imaginary: number; amplitude: number; phase: number };
  velocityFundamental: { real: number; imaginary: number; amplitude: number; phase: number };
  forceVelocityPhaseDifference: number;
  fundamentalMeanPower: number;
  powerScale: number;
  powerTrend: "positive" | "negative" | "indistinguishable-from-zero";
}


function parseOption(name: string): string | undefined {
  const exact = `--${name}`;
  const equals = `${exact}=`;
  for (let index = 2; index < process.argv.length; index += 1) {
    const argument = process.argv[index] ?? "";
    if (argument.startsWith(equals)) return argument.slice(equals.length);
    if (argument === exact) return process.argv[index + 1];
  }
  return undefined;
}

function finitePositive(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!(parsed > 0) || !Number.isFinite(parsed)) throw new RangeError(`--${name} must be positive`);
  return parsed;
}

function finiteNonNegative(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!(parsed >= 0) || !Number.isFinite(parsed)) throw new RangeError(`--${name} must be non-negative`);
  return parsed;
}

export function parseCli(): CliOptions {
  const profileText = parseOption("profile") ?? "smoke";
  if (profileText !== "smoke" && profileText !== "research") {
    throw new RangeError("--profile must be smoke or research");
  }
  const profile = profileText;
  const frequency = finitePositive(parseOption("frequency"), 0.5, "frequency");
  const amplitude = finitePositive(parseOption("amplitude"), 0.03, "amplitude");
  const cycles = finitePositive(
    parseOption("cycles"),
    profile === "smoke" ? 3 : 8,
    "cycles",
  );
  const discardCycles = finiteNonNegative(
    parseOption("discard-cycles"),
    profile === "smoke" ? 1 : 4,
    "discard-cycles",
  );
  if (discardCycles >= cycles) throw new RangeError("discard-cycles must be smaller than cycles");
  const defaultStem = `../90_候选工作区/current/A2_控制体取力与规定运动功率审计/验证与复现/artifacts/a2-prescribed-power-${profile}`;
  const outputPath = resolve(parseOption("output") ?? `${defaultStem}.json`);
  const markdownPath = resolve(parseOption("markdown") ?? `${defaultStem}.md`);
  return { profile, outputPath, markdownPath, amplitude, frequency, cycles, discardCycles };
}

export function matrixCases(profile: CliOptions["profile"]): MatrixCase[] {
  if (profile === "smoke") {
    return [{ id: "d08-u0040", diameterCells: 8, latticeVelocity: 0.04 }];
  }
  const cases: MatrixCase[] = [];
  for (const diameterCells of [8, 12, 16]) {
    for (const latticeVelocity of [0.05, 0.035, 0.025]) {
      cases.push({
        id: `d${diameterCells.toString().padStart(2, "0")}-u${latticeVelocity.toFixed(3).replace(".", "")}`,
        diameterCells,
        latticeVelocity,
      });
    }
  }
  return cases;
}

export function configureCase(base: SimulationConfig, item: MatrixCase, cli: CliOptions): SimulationConfig {
  const config = structuredClone(base);
  config.backend = "highFidelity";
  config.cfd2d.couplingMode = "prescribed";
  config.cfd2d.stripClosure = "none";
  config.cfd2d.cylinderCells = item.diameterCells;
  config.cfd2d.nx = 16 * item.diameterCells;
  config.cfd2d.ny = 8 * item.diameterCells;
  config.cfd2d.latticeVelocity = item.latticeVelocity;
  config.solver.duration = cli.cycles / cli.frequency;
  const diameter = 2 * config.geometry.radius;
  const dx = diameter / item.diameterCells;
  const nominalDt = item.latticeVelocity * dx / config.fluid.flowSpeed;
  const resolvedSteps = Math.max(1, Math.ceil(config.solver.duration / nominalDt));
  const resolvedDt = config.solver.duration / resolvedSteps;
  const resolvedLatticeVelocity = config.fluid.flowSpeed * resolvedDt / dx;
  config.cfd2d.penalizationTimeSteps = ETA_HAT
    * item.diameterCells
    / resolvedLatticeVelocity;
  config.cfd2d.prescribedAmplitude = cli.amplitude;
  config.cfd2d.prescribedFrequency = cli.frequency;
  config.cfd2d.sampleEvery = 1000;
  config.cfd2d.fieldEvery = 10000;
  config.cfd2d.stepsPerChunk = 500;
  config.fluid.flowRampTime = cli.profile === "smoke" ? 0.5 : 2;
  config.fluid.flowModulationAmplitude = 0;
  return config;
}

export function makeAccumulator(): HarmonicAccumulator {
  return {
    duration: 0,
    forceIntegral: 0,
    velocityIntegral: 0,
    powerIntegral: 0,
    forceSquaredIntegral: 0,
    velocitySquaredIntegral: 0,
    forceCosIntegral: 0,
    forceMinusSinIntegral: 0,
    velocityCosIntegral: 0,
    velocityMinusSinIntegral: 0,
  };
}

export function accumulateHarmonic(
  accumulator: HarmonicAccumulator,
  time: number,
  dt: number,
  frequency: number,
  force: number,
  velocity: number,
): void {
  const phase = TWO_PI * frequency * time;
  const cosine = Math.cos(phase);
  const sine = Math.sin(phase);
  accumulator.duration += dt;
  accumulator.forceIntegral += force * dt;
  accumulator.velocityIntegral += velocity * dt;
  accumulator.powerIntegral += force * velocity * dt;
  accumulator.forceSquaredIntegral += force * force * dt;
  accumulator.velocitySquaredIntegral += velocity * velocity * dt;
  accumulator.forceCosIntegral += force * cosine * dt;
  accumulator.forceMinusSinIntegral -= force * sine * dt;
  accumulator.velocityCosIntegral += velocity * cosine * dt;
  accumulator.velocityMinusSinIntegral -= velocity * sine * dt;
}

function wrapPhase(value: number): number {
  let result = value;
  while (result <= -Math.PI) result += TWO_PI;
  while (result > Math.PI) result -= TWO_PI;
  return result;
}

export function finishHarmonic(accumulator: HarmonicAccumulator): FinalHarmonic {
  const duration = accumulator.duration;
  if (!(duration > 0)) throw new Error("analysis window is empty");
  const forceReal = 2 * accumulator.forceCosIntegral / duration;
  const forceImaginary = 2 * accumulator.forceMinusSinIntegral / duration;
  const velocityReal = 2 * accumulator.velocityCosIntegral / duration;
  const velocityImaginary = 2 * accumulator.velocityMinusSinIntegral / duration;
  const forceAmplitude = Math.hypot(forceReal, forceImaginary);
  const velocityAmplitude = Math.hypot(velocityReal, velocityImaginary);
  const fundamentalMeanPower = 0.5 * (
    forceReal * velocityReal + forceImaginary * velocityImaginary
  );
  const powerScale = 0.5 * forceAmplitude * velocityAmplitude;
  const meanPower = accumulator.powerIntegral / duration;
  return {
    duration,
    meanForce: accumulator.forceIntegral / duration,
    meanVelocity: accumulator.velocityIntegral / duration,
    meanPower,
    forceRms: Math.sqrt(accumulator.forceSquaredIntegral / duration),
    velocityRms: Math.sqrt(accumulator.velocitySquaredIntegral / duration),
    forceFundamental: {
      real: forceReal,
      imaginary: forceImaginary,
      amplitude: forceAmplitude,
      phase: Math.atan2(forceImaginary, forceReal),
    },
    velocityFundamental: {
      real: velocityReal,
      imaginary: velocityImaginary,
      amplitude: velocityAmplitude,
      phase: Math.atan2(velocityImaginary, velocityReal),
    },
    forceVelocityPhaseDifference: wrapPhase(
      Math.atan2(forceImaginary, forceReal) - Math.atan2(velocityImaginary, velocityReal),
    ),
    fundamentalMeanPower,
    powerScale,
    powerTrend: signedTrend(meanPower, powerScale, 1e-4),
  };
}


export function relativeSpread(values: readonly number[], floor = 1e-30): number {
  if (values.length === 0) return Number.NaN;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return (maximum - minimum) / Math.max(...values.map((value) => Math.abs(value)), floor);
}

export function sameNonzeroTrend(values: readonly FinalHarmonic[]): boolean {
  const trends = new Set(values.map((value) => value.powerTrend));
  return trends.size === 1 && !trends.has("indistinguishable-from-zero");
}

