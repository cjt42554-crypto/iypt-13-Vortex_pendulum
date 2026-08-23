#!/usr/bin/env -S npx vite-node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cloneConfig, hashConfig } from "../src/core/config";
import type { SimulationConfig, SimulationResult, SimulationSample } from "../src/core/types";
import { energyClosure } from "../src/analysis/metrics";
import { hannSpectrum } from "../src/analysis/spectrum";
import { runForward } from "../src/solvers/forward";
import { runHighFidelity } from "../src/solvers/highFidelity";

const REVIEW_SCHEMA = "VP-TREND-CONFLICT-A1-CURRENT-EVIDENCE-v1";

function outputDirectory(commandLine: readonly string[]): string {
  let output = resolve("artifacts/review-a1-current-2026-08-23");
  for (let index = 0; index < commandLine.length; index += 1) {
    const option = commandLine[index];
    if (option === "--output-dir") {
      const value = commandLine[index + 1];
      if (value === undefined) throw new Error("--output-dir requires a path");
      output = resolve(value);
      index += 1;
    } else if (option === "--help") {
      process.stdout.write(
        "Usage: npx vite-node scripts/reproduce-a1-current-trend-review.ts "
        + "[--output-dir PATH]\n",
      );
      process.exit(0);
    } else if (option !== undefined) {
      throw new Error(`unknown option: ${option}`);
    }
  }
  return output;
}

function integrate(
  samples: readonly SimulationSample[],
  value: (sample: SimulationSample) => number,
): number {
  let sum = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const left = samples[index - 1]!;
    const right = samples[index]!;
    sum += 0.5 * (right.time - left.time) * (value(left) + value(right));
  }
  return sum;
}

function positiveCrossingTimes(samples: readonly SimulationSample[]): number[] {
  const duration = Math.max(
    (samples.at(-1)?.time ?? 0) - (samples[0]?.time ?? 0),
    Number.EPSILON,
  );
  const mean = integrate(samples, (sample) => sample.displacement) / duration;
  const crossings: number[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const left = samples[index - 1]!;
    const right = samples[index]!;
    const leftValue = left.displacement - mean;
    const rightValue = right.displacement - mean;
    if (leftValue < 0 && rightValue >= 0 && rightValue !== leftValue) {
      crossings.push(
        left.time
        + (right.time - left.time) * (-leftValue) / (rightValue - leftValue),
      );
    }
  }
  return crossings;
}

function summarizeWindow(result: SimulationResult, requestedStart: number, requestedEnd: number) {
  const samples = result.samples.filter(
    (sample) => sample.time >= requestedStart - 1e-12
      && sample.time <= requestedEnd + 1e-12,
  );
  if (samples.length < 2) throw new Error(`insufficient samples in ${requestedStart}-${requestedEnd} s`);
  const start = samples[0]!.time;
  const end = samples.at(-1)!.time;
  const duration = end - start;
  const displacement = samples.map((sample) => sample.displacement);
  const angle = samples.map((sample) => sample.theta);
  const meanDisplacement = integrate(samples, (sample) => sample.displacement) / duration;
  const crossings = positiveCrossingTimes(samples);
  const periods = crossings.slice(1).map((time, index) => time - crossings[index]!);
  const meanPeriod = periods.length === 0
    ? null
    : periods.reduce((sum, period) => sum + period, 0) / periods.length;
  const spectrum = hannSpectrum(samples.map((sample) => sample.time), displacement);
  const legacyClosure = energyClosure(
    samples.map((sample) => sample.time),
    samples.map((sample) => sample.mechanicalEnergy),
    samples.map((sample) => sample.fluidPower + sample.controlPower),
    samples.map((sample) => sample.dampingPower),
  );
  const output: Record<string, unknown> = {
    requestedStart,
    requestedEnd,
    actualStart: start,
    actualEnd: end,
    sampleCount: samples.length,
    halfPeakToPeakDisplacement: 0.5 * (Math.max(...displacement) - Math.min(...displacement)),
    halfPeakToPeakAngle: 0.5 * (Math.max(...angle) - Math.min(...angle)),
    centeredRmsDisplacement: Math.sqrt(
      integrate(samples, (sample) => (sample.displacement - meanDisplacement) ** 2) / duration,
    ),
    positiveCrossingCount: crossings.length,
    positiveCrossingMeanPeriod: meanPeriod,
    positiveCrossingFrequency: meanPeriod === null ? null : 1 / meanPeriod,
    hannDominantFrequency: spectrum.dominantFrequency,
    meanLegacyDiagnosticFluidPower: integrate(samples, (sample) => sample.fluidPower) / duration,
    meanDampingPower: integrate(samples, (sample) => sample.dampingPower) / duration,
    legacyDiagnosticEnergyClosureRms: legacyClosure.rms,
    legacyDiagnosticEnergyClosureRelativeRms: legacyClosure.relativeRms,
    mechanicalEnergyChange:
      samples.at(-1)!.mechanicalEnergy - samples[0]!.mechanicalEnergy,
  };
  if (result.backend === "forward") {
    output.meanLiftPower = integrate(samples, (sample) => sample.liftTorque * sample.omega) / duration;
    output.meanDragPower = integrate(samples, (sample) => sample.dragTorque * sample.omega) / duration;
  } else {
    const first = samples[0]!.interfaceExchange?.cumulative;
    const last = samples.at(-1)!.interfaceExchange?.cumulative;
    if (first === undefined || last === undefined) {
      throw new Error("A1 cumulative interface exchange is absent");
    }
    const appliedRawWork = last.cumulativeAppliedRawWork - first.cumulativeAppliedRawWork;
    const appliedRawLineWork =
      last.cumulativeAppliedRawLineWork - first.cumulativeAppliedRawLineWork;
    const dampingWork = integrate(samples, (sample) => sample.dampingPower);
    const mechanicalEnergyChange = Number(output.mechanicalEnergyChange);
    const residual = mechanicalEnergyChange - (appliedRawWork - dampingWork);
    output.appliedRawWork = appliedRawWork;
    output.meanAppliedRawMechanicalPower = appliedRawWork / duration;
    output.meanAppliedRawLinePower = appliedRawLineWork / duration;
    output.appliedMechanicalEnergyLedgerResidual = residual;
    output.appliedMechanicalEnergyLedgerRelativeResidual = Math.abs(residual)
      / Math.max(
        Math.abs(mechanicalEnergyChange) + Math.abs(appliedRawWork) + Math.abs(dampingWork),
        Number.EPSILON,
      );
  }
  return output;
}

function compactSample(sample: SimulationSample | undefined) {
  if (sample === undefined) return null;
  return {
    time: sample.time,
    theta: sample.theta,
    omega: sample.omega,
    displacement: sample.displacement,
    velocity: sample.velocity,
    wakeReal: sample.wakeReal,
    wakeImaginary: sample.wakeImaginary,
    wakeAmplitude: sample.wakeAmplitude,
    liftCoefficient: sample.liftCoefficient,
    dragCoefficient: sample.dragCoefficient,
    liftTorque: sample.liftTorque,
    dragTorque: sample.dragTorque,
    fluidTorque: sample.fluidTorque,
    fluidPower: sample.fluidPower,
    dampingPower: sample.dampingPower,
    mechanicalEnergy: sample.mechanicalEnergy,
    lineForceX: sample.lineForceX,
    lineForceY: sample.lineForceY,
    interfaceExchange: sample.interfaceExchange,
  };
}

function summarize(result: SimulationResult, elapsedMilliseconds: number) {
  const windows = [
    summarizeWindow(result, 0, 30),
    summarizeWindow(result, 30, 60),
    summarizeWindow(result, 60, 90),
    summarizeWindow(result, 90, 120),
    summarizeWindow(result, 60, 120),
  ];
  return {
    backend: result.backend,
    terminationCode: result.terminationCode,
    complete: result.complete,
    configHash: result.provenance.configHash,
    recomputedConfigHash: hashConfig(result.config),
    sharedPhysicalInputHash: result.provenance.sharedPhysicalInputHash,
    backendDynamicsContractHash: result.provenance.backendDynamicsContractHash,
    analysisContractHash: result.provenance.analysisContractHash,
    forceContractId: result.provenance.forceContractId,
    solver: result.provenance.solver,
    solverVersion: result.provenance.solverVersion,
    couplingAlgorithm: result.provenance.couplingAlgorithm,
    spanClosure: result.provenance.spanClosure,
    evidenceLevel: result.provenance.evidenceLevel,
    evidenceClaims: result.provenance.evidenceClaims,
    sampleCount: result.samples.length,
    fieldCount: result.fields.length,
    elapsedMilliseconds,
    metrics: result.metrics,
    numerical: result.numerical,
    initial: compactSample(result.samples[0]),
    final: compactSample(result.samples.at(-1)),
    windows,
    amplitudeLateEarlyRatio:
      Number(windows[3]!.halfPeakToPeakDisplacement)
      / Number(windows[0]!.halfPeakToPeakDisplacement),
  };
}

function traceCsv(result: SimulationResult): string {
  const header = [
    "time", "theta", "omega", "displacement", "velocity", "wakeReal", "wakeImaginary",
    "wakeAmplitude", "liftCoefficient", "dragCoefficient", "liftTorque", "dragTorque",
    "fluidTorque", "fluidPowerLegacyDiagnostic", "dampingPower", "mechanicalEnergy",
    "lineForceXLegacyDiagnostic", "lineForceYLegacyDiagnostic",
    "appliedRawPower", "cumulativeAppliedRawWork", "cumulativeBrinkmanAlgebraicResidual",
  ];
  const rows = result.samples.map((sample) => {
    const applied = sample.interfaceExchange?.applied;
    const cumulative = sample.interfaceExchange?.cumulative;
    return [
      sample.time,
      sample.theta,
      sample.omega,
      sample.displacement,
      sample.velocity,
      sample.wakeReal,
      sample.wakeImaginary,
      sample.wakeAmplitude,
      sample.liftCoefficient,
      sample.dragCoefficient,
      sample.liftTorque,
      sample.dragTorque,
      sample.fluidTorque,
      sample.fluidPower,
      sample.dampingPower,
      sample.mechanicalEnergy,
      sample.lineForceX,
      sample.lineForceY,
      applied?.appliedRawPower,
      cumulative?.cumulativeAppliedRawWork,
      cumulative?.cumulativeBrinkmanAlgebraicResidual,
    ].map((value) => value === undefined || value === null ? "" : String(value)).join(",");
  });
  return `${header.join(",")}\n${rows.join("\n")}\n`;
}

const output = outputDirectory(process.argv.slice(2));
await mkdir(output, { recursive: true });

const base: SimulationConfig = cloneConfig();
base.solver.duration = 120;
const forwardConfig: SimulationConfig = structuredClone(base);
forwardConfig.backend = "forward";
const cfdConfig: SimulationConfig = structuredClone(base);
cfdConfig.backend = "highFidelity";
cfdConfig.cfd2d.couplingMode = "weak-fsi";
cfdConfig.cfd2d.stripClosure = "fully-coherent-upper-bound";

await writeFile(
  resolve(output, "forward-default-120s-config.json"),
  `${JSON.stringify(forwardConfig, null, 2)}\n`,
  "utf8",
);
await writeFile(
  resolve(output, "cfd-a1-weak-fsi-d12-120s-config.json"),
  `${JSON.stringify(cfdConfig, null, 2)}\n`,
  "utf8",
);

process.stdout.write("Running current 120 s forward ROM case...\n");
let started = performance.now();
const forwardResult = await runForward(forwardConfig, undefined, "a1-current-review-forward-120s");
const forwardElapsed = performance.now() - started;
const forwardSummary = summarize(forwardResult, forwardElapsed);
await writeFile(
  resolve(output, "forward-default-120s-trace.csv"),
  traceCsv(forwardResult),
  "utf8",
);

process.stdout.write("Running current 120 s D/12 raw-Brinkman legacy weak-FSI case...\n");
started = performance.now();
const cfdResult = await runHighFidelity(cfdConfig, undefined, "a1-current-review-cfd-120s");
const cfdElapsed = performance.now() - started;
const cfdSummary = summarize(cfdResult, cfdElapsed);
await writeFile(
  resolve(output, "cfd-a1-weak-fsi-d12-120s-trace.csv"),
  traceCsv(cfdResult),
  "utf8",
);

const evidence = {
  schema: REVIEW_SCHEMA,
  generatedAt: new Date().toISOString(),
  purpose: "Reproduce the exact 120 s screenshot trend conflict on the current post-A1 source snapshot.",
  interpretationGuard: {
    forward: "Numerically verified execution of an uncalibrated illustrative ROM; not an apparatus trend prediction.",
    highFidelity:
      "Exact execution of the legacy explicit weak-FSI trajectory with A1 raw Guo/Brinkman accounting; "
      + "the raw force is not a validated physical hydrodynamic force.",
    apparatusTrend: "NO-GO",
  },
  pairing: {
    exactSharedPhysicalInputHashMatch:
      forwardSummary.sharedPhysicalInputHash === cfdSummary.sharedPhysicalInputHash,
    sharedPhysicalInputHash: forwardSummary.sharedPhysicalInputHash,
    dynamicsContractHashesDiffer:
      forwardSummary.backendDynamicsContractHash !== cfdSummary.backendDynamicsContractHash,
    analysisContractHashesDiffer:
      forwardSummary.analysisContractHash !== cfdSummary.analysisContractHash,
  },
  screenshotFingerprint: {
    expectedDisplayedDiagnosticLineForceY:
      (cfdSummary.final as ReturnType<typeof compactSample> | null)?.lineForceY,
    note: "The screenshot rounds this endpoint legacy diagnostic to F'y=1.53e-3 N/m.",
  },
  cases: [forwardSummary, cfdSummary],
};

await writeFile(
  resolve(output, "current-a1-120s-trend-summary.json"),
  `${JSON.stringify(evidence, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`${JSON.stringify({
  output,
  summary: resolve(output, "current-a1-120s-trend-summary.json"),
  forwardElapsedMilliseconds: forwardElapsed,
  cfdElapsedMilliseconds: cfdElapsed,
  sharedPhysicalInputHash: forwardSummary.sharedPhysicalInputHash,
  forwardAmplitudeLateEarlyRatio: forwardSummary.amplitudeLateEarlyRatio,
  cfdAmplitudeLateEarlyRatio: cfdSummary.amplitudeLateEarlyRatio,
}, null, 2)}\n`);
