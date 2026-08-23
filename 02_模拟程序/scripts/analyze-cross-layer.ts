#!/usr/bin/env -S npx vite-node

/**
 * Phase-4 cross-layer virtual experiments.
 *
 * This script consumes, but does not modify, the phase-1 forward closure, the
 * phase-2 forward integrator, and the phase-3 2-D first-principles backend.
 * All classifications and comparisons produced here belong exclusively to
 * the structural layer.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fitHarmonic,
  trapezoidalTimeMean,
  wrapPhase,
  type HarmonicFit,
} from "../src/analysis/harmonic";
import { hannSpectrum } from "../src/analysis/spectrum";
import {
  deriveParameters,
  hashConfig,
  validateConfig,
} from "../src/core/config";
import type {
  FieldFrame,
  SimulationConfig,
  SimulationResult,
  SimulationSample,
} from "../src/core/types";
import {
  isolatedLandauAmplitude,
  isolatedLandauThresholdTime,
  structuralSpectrumPoint,
} from "../src/analysis/structure";
import { runForward } from "../src/solvers/forward";
import { evaluateForward } from "../src/solvers/forward/model";
import { runHighFidelity } from "../src/solvers/highFidelity";

type RunMode = "all" | "hf" | "forward";

interface PrescribedCase {
  id: string;
  frequency: number;
  amplitude: number;
  seed: number;
  duration: number;
  analysisStart: number;
  tags: Array<"frequency-sweep" | "amplitude-audit" | "seed-audit" | "duration-audit">;
}

interface ForwardCase {
  id: string;
  speed: number;
  start: "cold" | "hot";
  initialWakeAmplitude: number;
  frozenWakeGrowthRate: number;
  frozenWakeCubicReal: number;
  isolatedWakeSaturationAmplitude: number | null;
}

interface StructuralBlock {
  start: number;
  end: number;
  sampleCount: number;
  displacementAmplitudeOverDiameter: number | null;
  meanWakeAmplitude: number | null;
  mechanicalCrossingFrequency: number | null;
  meanFluidPower: number | null;
  meanDampingPower: number | null;
}

const root = fileURLToPath(new URL("../", import.meta.url));
const artifactRoot = resolve(
  root,
  "../03-项目资料/03-计算结果与证据/artifacts",
);
const artifactDirectory = resolve(artifactRoot, "cross-layer");
const configPath = resolve(root, "public/examples/vortex-pendulum-default.json");
const highFidelitySummaryPath = resolve(artifactDirectory, "hf-prescribed-response.json");
const highFidelityTracePath = resolve(artifactDirectory, "hf-prescribed-response.csv");
const forwardSummaryPath = resolve(artifactDirectory, "forward-initial-memory.json");
const forwardTracePath = resolve(artifactDirectory, "forward-initial-memory.csv");
const combinedPath = resolve(artifactRoot, "phase4-cross-layer-study.json");

function parseMode(): RunMode {
  const argument = process.argv.find((item) => item.startsWith("--mode="));
  const value = argument?.slice("--mode=".length) ?? "all";
  if (value !== "all" && value !== "hf" && value !== "forward") {
    throw new RangeError("--mode must be all, hf, or forward");
  }
  return value;
}

function progress(message: string): void {
  process.stdout.write(`[phase4-cross-layer] ${message}\n`);
}

function assertValid(config: SimulationConfig): void {
  const errors = validateConfig(config).filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new Error(errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  }
}

function finiteValues(values: Array<number | null>): number[] {
  return values.filter((value): value is number => value !== null && Number.isFinite(value));
}

function range(values: readonly number[]): [number, number] | null {
  return values.length > 0 ? [Math.min(...values), Math.max(...values)] : null;
}

function relativeDifference(left: number, right: number): number {
  return Math.abs(left - right) / Math.max(Math.abs(left), Math.abs(right), 1e-30);
}

function linearRegression(x: readonly number[], y: readonly number[]) {
  if (x.length !== y.length || x.length < 2) return null;
  const meanX = x.reduce((sum, value) => sum + value, 0) / x.length;
  const meanY = y.reduce((sum, value) => sum + value, 0) / y.length;
  const denominator = x.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  if (!(denominator > 0)) return null;
  const slope = x.reduce(
    (sum, value, index) => sum + (value - meanX) * ((y[index] ?? meanY) - meanY),
    0,
  ) / denominator;
  const intercept = meanY - slope * meanX;
  const residualSquare = x.reduce(
    (sum, value, index) => sum + ((y[index] ?? 0) - (intercept + slope * value)) ** 2,
    0,
  );
  const totalSquare = y.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  return {
    slope,
    intercept,
    rSquared: totalSquare > 0 ? 1 - residualSquare / totalSquare : null,
  };
}

function bisectScalarRoot(
  evaluate: (value: number) => number,
  bracket: [number, number],
  tolerance = 1e-10,
): number | null {
  let [left, right] = bracket;
  let leftValue = evaluate(left);
  let rightValue = evaluate(right);
  if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return null;
  if (leftValue === 0) return left;
  if (rightValue === 0) return right;
  if (Math.sign(leftValue) === Math.sign(rightValue)) return null;
  for (let iteration = 0; iteration < 100 && right - left > tolerance; iteration += 1) {
    const middle = 0.5 * (left + right);
    const middleValue = evaluate(middle);
    if (!Number.isFinite(middleValue)) return null;
    if (middleValue === 0) return middle;
    if (Math.sign(middleValue) === Math.sign(leftValue)) {
      left = middle;
      leftValue = middleValue;
    } else {
      right = middle;
      rightValue = middleValue;
    }
  }
  return 0.5 * (left + right);
}

function phaseDegrees(value: number): number {
  return 180 * value / Math.PI;
}

function fittedValue(fit: HarmonicFit, time: number): number {
  const phase = 2 * Math.PI * fit.frequency * time;
  return fit.offset
    + fit.cosineCoefficient * Math.cos(phase)
    + fit.sineCoefficient * Math.sin(phase);
}

function fieldAudit(field: FieldFrame) {
  const vorticity = Array.from(field.vorticity);
  const speed = Array.from(field.speed);
  return {
    time: field.time,
    width: field.width,
    height: field.height,
    bounds: [field.xMin, field.xMax, field.yMin, field.yMax],
    cylinder: [field.cylinderX, field.cylinderY, field.cylinderRadius],
    vorticityRange: range(vorticity),
    speedRange: range(speed),
    note: "Field arrays omitted from the phase-4 response artifact; rerun the frozen config to regenerate them.",
  };
}

function resultWithoutFieldArrays(result: SimulationResult) {
  return {
    ...result,
    fields: result.fields.map(fieldAudit),
  };
}

function prescribedResponse(
  result: SimulationResult,
  analysisStart: number,
  analysisEnd = Number.POSITIVE_INFINITY,
) {
  const selected = result.samples.filter(
    (sample) => sample.time >= analysisStart && sample.time <= analysisEnd,
  );
  if (selected.length < 4) throw new Error("prescribed response window contains too few samples");
  const frequency = result.config.cfd2d.prescribedFrequency;
  const stripRadius = result.config.cfd2d.stripAxialCoordinate;
  const times = selected.map((sample) => sample.time);
  const theta = selected.map((sample) => sample.theta);
  const stripDisplacement = selected.map((sample) => stripRadius * Math.sin(sample.theta));
  const stripVelocity = selected.map(
    (sample) => stripRadius * Math.cos(sample.theta) * sample.omega,
  );
  const force = selected.map((sample) => sample.lineForceY ?? Number.NaN);
  const stressForce = selected.map((sample) => sample.stressLineForceY ?? Number.NaN);
  const liftCoefficient = selected.map((sample) => sample.liftCoefficient);
  const linePower = selected.map((sample) => sample.linePower2d ?? Number.NaN);
  const thetaFit = fitHarmonic(times, theta, frequency);
  const displacementFit = fitHarmonic(times, stripDisplacement, frequency);
  const velocityFit = fitHarmonic(times, stripVelocity, frequency);
  const forceFit = fitHarmonic(times, force, frequency);
  const stressForceFit = fitHarmonic(times, stressForce, frequency);
  const liftFit = fitHarmonic(times, liftCoefficient, frequency);
  const forceResidual = force.map((value, index) => value - fittedValue(forceFit, times[index] ?? 0));
  const residualSpectrum = hannSpectrum(times, forceResidual, {
    minimumFrequency: 0.05,
    maximumFrequency: 2,
  });
  const directMeanPower = trapezoidalTimeMean(times, linePower);
  const harmonicMeanPower = 0.5
    * forceFit.amplitude
    * velocityFit.amplitude
    * Math.cos(forceFit.phaseRadians - velocityFit.phaseRadians);
  const referenceLinePower = 0.5
    * result.config.fluid.density
    * result.config.fluid.flowSpeed ** 3
    * result.derived.cylinderDiameter;
  const displacementAmplitudeOverDiameter = displacementFit.amplitude
    / result.derived.cylinderDiameter;
  const forcePath = finiteValues(selected.map((sample) => sample.forcePathRelativeDifference));
  const relativeForceVelocityPhase = wrapPhase(
    forceFit.phaseRadians - velocityFit.phaseRadians,
  );
  return {
    window: [times[0], times.at(-1)],
    duration: (times.at(-1) ?? 0) - (times[0] ?? 0),
    periodCount: frequency * ((times.at(-1) ?? 0) - (times[0] ?? 0)),
    fits: {
      theta: thetaFit,
      stripDisplacement: displacementFit,
      stripVelocity: velocityFit,
      penaltyLineForce: forceFit,
      stressLineForce: stressForceFit,
      liftCoefficient: liftFit,
    },
    dimensionless: {
      displacementAmplitudeOverDiameter,
      harmonicLiftGainPerDisplacementOverDiameter: displacementAmplitudeOverDiameter > 0
        ? liftFit.amplitude / displacementAmplitudeOverDiameter
        : null,
      complexLiftTransferPerDisplacementOverDiameter: displacementAmplitudeOverDiameter > 0
        ? {
            real: liftFit.amplitude / displacementAmplitudeOverDiameter
              * Math.cos(forceFit.phaseRadians - displacementFit.phaseRadians),
            imaginary: liftFit.amplitude / displacementAmplitudeOverDiameter
              * Math.sin(forceFit.phaseRadians - displacementFit.phaseRadians),
          }
        : null,
      directMeanLinePowerCoefficient: referenceLinePower > 0
        ? directMeanPower / referenceLinePower
        : null,
      harmonicMeanLinePowerCoefficient: referenceLinePower > 0
        ? harmonicMeanPower / referenceLinePower
        : null,
    },
    phase: {
      penaltyForceMinusDisplacementRadians: wrapPhase(
        forceFit.phaseRadians - displacementFit.phaseRadians,
      ),
      penaltyForceMinusDisplacementDegrees: phaseDegrees(wrapPhase(
        forceFit.phaseRadians - displacementFit.phaseRadians,
      )),
      penaltyForceMinusVelocityRadians: relativeForceVelocityPhase,
      penaltyForceMinusVelocityDegrees: phaseDegrees(relativeForceVelocityPhase),
      penaltyMinusStressForceRadians: wrapPhase(
        forceFit.phaseRadians - stressForceFit.phaseRadians,
      ),
      penaltyMinusStressForceDegrees: phaseDegrees(wrapPhase(
        forceFit.phaseRadians - stressForceFit.phaseRadians,
      )),
      phaseToPowerRelativeConditionNumber: Math.abs(Math.tan(relativeForceVelocityPhase)),
      conditioningDefinition: "|d ln(P_1)/d(delta_phi)| = |tan(delta_phi_Fv)| for P_1 proportional to cos(delta_phi_Fv)",
    },
    power: {
      directMeanLinePower: directMeanPower,
      firstHarmonicMeanLinePower: harmonicMeanPower,
      nonFirstHarmonicRemainder: directMeanPower - harmonicMeanPower,
      directVsHarmonicRelativeDifference: relativeDifference(directMeanPower, harmonicMeanPower),
      interpretation: directMeanPower > 0
        ? "the prescribed body receives positive mean work from the native 2-D cross-flow line force in this window"
        : directMeanPower < 0
          ? "the prescribed body does negative mean work against the native 2-D cross-flow line force in this window"
          : "zero mean native 2-D cross-flow work within numerical precision",
    },
    residual: {
      penaltyForceResidualFraction: forceFit.residualFraction,
      penaltyForceR2AtPrescribedFrequency: forceFit.coefficientOfDetermination,
      dominantResidualFrequency: residualSpectrum.dominantFrequency,
      dominantResidualAmplitude: residualSpectrum.dominantAmplitude,
      frequencyResolution: residualSpectrum.frequencyResolution,
      interpretation: "The residual is unresolved self-shedding, harmonics, drift, and discretization combined; it is not labelled as random noise.",
    },
    dualForcePath: {
      harmonicAmplitudeRelativeDifference: relativeDifference(
        forceFit.amplitude,
        stressForceFit.amplitude,
      ),
      meanInstantaneousRelativeDifference: forcePath.length > 0
        ? forcePath.reduce((sum, value) => sum + value, 0) / forcePath.length
        : null,
      maximumInstantaneousRelativeDifference: forcePath.length > 0
        ? Math.max(...forcePath)
        : null,
    },
  };
}

function highFidelityTraceRows(caseId: string, result: SimulationResult): string[] {
  return result.samples.map((sample) => [
    caseId,
    sample.time,
    sample.theta,
    sample.omega,
    sample.lineForceX,
    sample.lineForceY,
    sample.stressLineForceX,
    sample.stressLineForceY,
    sample.linePower2d,
    sample.forcePathRelativeDifference,
  ].map((value) => value === null ? "" : String(value)).join(","));
}

async function runHighFidelityStudy(base: SimulationConfig) {
  const cases: PrescribedCase[] = [
    { id: "f044-a0030-s2027", frequency: 0.44, amplitude: 0.003, seed: 2027, duration: 30, analysisStart: 18, tags: ["frequency-sweep"] },
    { id: "f050-a0030-s2027", frequency: 0.50, amplitude: 0.003, seed: 2027, duration: 30, analysisStart: 18, tags: ["frequency-sweep"] },
    { id: "f056-a0030-s2027", frequency: 0.56, amplitude: 0.003, seed: 2027, duration: 30, analysisStart: 18, tags: ["frequency-sweep", "amplitude-audit", "seed-audit"] },
    { id: "f062-a0030-s2027", frequency: 0.62, amplitude: 0.003, seed: 2027, duration: 30, analysisStart: 18, tags: ["frequency-sweep"] },
    { id: "f056-a0015-s2027", frequency: 0.56, amplitude: 0.0015, seed: 2027, duration: 30, analysisStart: 18, tags: ["amplitude-audit"] },
    { id: "f056-a0060-s2027", frequency: 0.56, amplitude: 0.006, seed: 2027, duration: 30, analysisStart: 18, tags: ["amplitude-audit"] },
    { id: "f056-a0030-s2028", frequency: 0.56, amplitude: 0.003, seed: 2028, duration: 30, analysisStart: 18, tags: ["seed-audit"] },
    { id: "f044-a0030-s2027-t60", frequency: 0.44, amplitude: 0.003, seed: 2027, duration: 60, analysisStart: 40, tags: ["duration-audit"] },
    { id: "f056-a0030-s2027-t60", frequency: 0.56, amplitude: 0.003, seed: 2027, duration: 60, analysisStart: 40, tags: ["duration-audit"] },
  ];
  const reuseExisting = process.argv.includes("--reuse-existing");
  const entries = [];
  const traceRows: string[] = [];
  for (const item of cases) {
    const config = structuredClone(base);
    config.backend = "highFidelity";
    config.fluid.flowRampTime = 2;
    config.cfd2d.couplingMode = "prescribed";
    config.cfd2d.stripClosure = "none";
    config.cfd2d.nx = 128;
    config.cfd2d.ny = 64;
    config.cfd2d.cylinderCells = 8;
    config.cfd2d.latticeVelocity = 0.05;
    config.cfd2d.penalizationTimeSteps = 1;
    config.cfd2d.sampleEvery = 10;
    config.cfd2d.fieldEvery = 20_000;
    config.cfd2d.prescribedFrequency = item.frequency;
    config.cfd2d.prescribedAmplitude = item.amplitude;
    config.initial.randomSeed = item.seed;
    config.solver.duration = item.duration;
    config.solver.transientFraction = 0.6;
    assertValid(config);
    const runArtifact = resolve(artifactDirectory, `hf-${item.id}.json`);
    let result: SimulationResult;
    const reusable = reuseExisting ? await readJsonIfPresent(runArtifact) : null;
    if (reusable !== null
      && typeof reusable === "object"
      && "provenance" in reusable
      && typeof reusable.provenance === "object"
      && reusable.provenance !== null
      && "configHash" in reusable.provenance
      && reusable.provenance.configHash === hashConfig(config)) {
      result = { ...(reusable as SimulationResult), fields: [] };
      progress(`HF ${item.id}: reused matching artifact`);
    } else {
      progress(`HF ${item.id}: start (${config.solver.duration} s, D/${config.cfd2d.cylinderCells})`);
      result = await runHighFidelity(config, undefined, `phase4-hf-${item.id}`);
    }
    if (!result.complete) {
      throw new Error(`HF case ${item.id} terminated with ${result.terminationCode}`);
    }
    const response = prescribedResponse(result, item.analysisStart);
    if (reusable === null || result.fields.length > 0) {
      await writeFile(
        runArtifact,
        `${JSON.stringify(resultWithoutFieldArrays(result), null, 2)}\n`,
        "utf8",
      );
    }
    traceRows.push(...highFidelityTraceRows(item.id, result));
    entries.push({
      case: item,
      configHash: result.provenance.configHash,
      runArtifact,
      terminationCode: result.terminationCode,
      response,
      durationWindows: item.tags.includes("duration-audit")
        ? [
            prescribedResponse(result, 20, 40),
            prescribedResponse(result, 40, 60),
          ]
        : null,
      numerical: result.numerical.lattice,
      applicability: result.applicability,
      warnings: result.warnings,
    });
    progress(`HF ${item.id}: done; CP=${response.dimensionless.directMeanLinePowerCoefficient?.toExponential(4)}, residual=${response.residual.penaltyForceResidualFraction?.toFixed(3)}`);
  }

  const frequencyEntries = entries.filter((entry) => entry.case.tags.includes("frequency-sweep"));
  const amplitudeEntries = entries.filter((entry) => entry.case.tags.includes("amplitude-audit"));
  const durationEntries = entries.filter((entry) => entry.case.tags.includes("duration-audit"));
  const logDisplacement = amplitudeEntries.map((entry) => Math.log(
    entry.response.dimensionless.displacementAmplitudeOverDiameter,
  ));
  const logForce = amplitudeEntries.map((entry) => Math.log(
    entry.response.fits.penaltyLineForce.amplitude,
  ));
  const amplitudeExponent = linearRegression(logDisplacement, logForce);
  const phaseValues = amplitudeEntries.map(
    (entry) => entry.response.phase.penaltyForceMinusDisplacementRadians,
  );
  let maximumPairwisePhaseDifference = 0;
  for (const left of phaseValues) {
    for (const right of phaseValues) {
      maximumPairwisePhaseDifference = Math.max(
        maximumPairwisePhaseDifference,
        Math.abs(wrapPhase(left - right)),
      );
    }
  }
  const seed2027 = entries.find((entry) => entry.case.id === "f056-a0030-s2027");
  const seed2028 = entries.find((entry) => entry.case.id === "f056-a0030-s2028");
  if (seed2027 === undefined || seed2028 === undefined) throw new Error("seed pair is incomplete");
  const powerSorted = [...frequencyEntries].sort((left, right) =>
    (right.response.dimensionless.directMeanLinePowerCoefficient ?? Number.NEGATIVE_INFINITY)
      - (left.response.dimensionless.directMeanLinePowerCoefficient ?? Number.NEGATIVE_INFINITY));
  const report = {
    analysisId: "VP-STRUCT-CROSS-HF-PRESCRIBED-v1",
    createdAt: new Date().toISOString(),
    evidenceLevel: "exploratory-component",
    phaseBoundary: "phase-4 virtual experiment consuming VP-HF-CFD2D-v1; not a phase-3 validation upgrade",
    source: {
      modelId: "VP-HF-CFD2D-v1",
      baseConfigPath: configPath,
      baseConfigHash: hashConfig(base),
      nativeLoad: "two-dimensional line force per unit span",
      grid: "D/8, 128x64, one Mach/penalty/domain choice",
      analysisWindow: [18, 30],
    },
    entries,
    frequencyResponse: {
      cases: frequencyEntries.map((entry) => ({
        id: entry.case.id,
        frequency: entry.case.frequency,
        prescribedToNaturalFrequencyRatio: entry.case.frequency / deriveParameters(base).naturalFrequency,
        liftGain: entry.response.dimensionless.harmonicLiftGainPerDisplacementOverDiameter,
        forceMinusDisplacementDegrees: entry.response.phase.penaltyForceMinusDisplacementDegrees,
        forceMinusVelocityDegrees: entry.response.phase.penaltyForceMinusVelocityDegrees,
        directMeanLinePowerCoefficient: entry.response.dimensionless.directMeanLinePowerCoefficient,
        residualFraction: entry.response.residual.penaltyForceResidualFraction,
      })),
      largestSampledMeanPowerCase: powerSorted[0]?.case.id ?? null,
      interpretation: "A maximum among four coarse prescribed frequencies is not an Arnold-tongue boundary or a free-response lock-in point.",
    },
    weakAmplitudeAuditAt056Hz: {
      cases: amplitudeEntries.map((entry) => ({
        id: entry.case.id,
        amplitude: entry.case.amplitude,
        displacementAmplitudeOverDiameter: entry.response.dimensionless.displacementAmplitudeOverDiameter,
        lineForceAmplitude: entry.response.fits.penaltyLineForce.amplitude,
        liftGain: entry.response.dimensionless.harmonicLiftGainPerDisplacementOverDiameter,
        forceMinusDisplacementDegrees: entry.response.phase.penaltyForceMinusDisplacementDegrees,
      })),
      logLogForceDisplacementFit: amplitudeExponent,
      expectedLinearExponent: 1,
      maximumPairwisePhaseDifferenceRadians: maximumPairwisePhaseDifference,
      maximumPairwisePhaseDifferenceDegrees: phaseDegrees(maximumPairwisePhaseDifference),
      interpretation: "This checks local amplitude consistency at one unresolved grid; it is not a continuum-limit linear-response proof.",
    },
    gridPhaseSeedAuditAt056Hz: {
      seeds: [seed2027.case.seed, seed2028.case.seed],
      lineForceAmplitudeRelativeDifference: relativeDifference(
        seed2027.response.fits.penaltyLineForce.amplitude,
        seed2028.response.fits.penaltyLineForce.amplitude,
      ),
      meanPowerRelativeDifference: relativeDifference(
        seed2027.response.power.directMeanLinePower,
        seed2028.response.power.directMeanLinePower,
      ),
      forceDisplacementPhaseDifferenceRadians: Math.abs(wrapPhase(
        seed2027.response.phase.penaltyForceMinusDisplacementRadians
          - seed2028.response.phase.penaltyForceMinusDisplacementRadians,
      )),
      phaseOnlyLinearizedPowerRelativeChange: seed2027.response.phase.phaseToPowerRelativeConditionNumber
        * Math.abs(wrapPhase(
          seed2027.response.phase.penaltyForceMinusVelocityRadians
            - seed2028.response.phase.penaltyForceMinusVelocityRadians,
        )),
      interpretation: "The seed changes only the declared sub-cell grid phase in this deterministic backend; one pair is a sensitivity diagnostic, not a stochastic uncertainty estimate.",
    },
    durationWindowAudit: durationEntries.map((entry) => {
      const windows = entry.durationWindows ?? [];
      const powers = windows.map((window) => window.power.directMeanLinePower);
      return {
        id: entry.case.id,
        frequency: entry.case.frequency,
        windows: windows.map((window) => ({
          window: window.window,
          directMeanLinePowerCoefficient: window.dimensionless.directMeanLinePowerCoefficient,
          forceMinusDisplacementDegrees: window.phase.penaltyForceMinusDisplacementDegrees,
          residualFraction: window.residual.penaltyForceResidualFraction,
          dominantResidualFrequency: window.residual.dominantResidualFrequency,
          forcePathHarmonicAmplitudeRelativeDifference: window.dualForcePath.harmonicAmplitudeRelativeDifference,
        })),
        meanPowerSignStableAcross20sWindows: powers.length === 2
          && Math.sign(powers[0] ?? 0) === Math.sign(powers[1] ?? 0),
        meanPowerRelativeWindowChange: powers.length === 2
          ? relativeDifference(powers[0] ?? 0, powers[1] ?? 0)
          : null,
      };
    }),
    allowedConclusions: [
      "The native 2-D backend can measure a complex prescribed-motion line-force response and its mean power without a 3-D strip closure.",
      "Force amplitude alone is insufficient: the sign of mean work is controlled by force-velocity phase and non-first-harmonic remainder.",
      "Residual and dual-force-path diagnostics quantify whether a one-harmonic structural reduction is currently trustworthy.",
    ],
    prohibitedConclusions: [
      "Do not infer a three-dimensional total pendulum torque or apparatus amplitude from these line loads.",
      "Do not call the largest sampled response a lock-in boundary, and do not calibrate ROM coefficients before grid/Mach/domain/penalty/time convergence.",
      "Do not relabel this study as validated 2-D reference evidence; the phase-3 grid verdict remains INCONCLUSIVE.",
    ],
  };
  await writeFile(highFidelitySummaryPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const header = "caseId,time,theta,omega,lineForceX,lineForceY,stressLineForceX,stressLineForceY,linePower2d,forcePathRelativeDifference\n";
  await writeFile(highFidelityTracePath, `${header}${traceRows.join("\n")}\n`, "utf8");
  return report;
}

function upwardCrossingFrequency(samples: readonly SimulationSample[]): number | null {
  const crossings: number[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const left = samples[index - 1];
    const right = samples[index];
    if (left === undefined || right === undefined || !(left.theta < 0 && right.theta >= 0)) continue;
    const fraction = -left.theta / (right.theta - left.theta);
    crossings.push(left.time + fraction * (right.time - left.time));
  }
  if (crossings.length < 3) return null;
  const periods = crossings.slice(1).map((time, index) => time - (crossings[index] ?? time));
  return periods.length > 0
    ? periods.length / periods.reduce((sum, period) => sum + period, 0)
    : null;
}

function unwrappedWakeFrequency(samples: readonly SimulationSample[]): number | null {
  if (samples.length < 3 || samples.some((sample) => sample.wakeAmplitude < 1e-10)) return null;
  const phase: number[] = [];
  let previous: number | undefined;
  let unwrapped = 0;
  for (const sample of samples) {
    const current = Math.atan2(sample.wakeImaginary, sample.wakeReal);
    if (previous === undefined) unwrapped = current;
    else unwrapped += wrapPhase(current - previous);
    previous = current;
    phase.push(unwrapped);
  }
  const fit = linearRegression(samples.map((sample) => sample.time), phase);
  return fit === null ? null : fit.slope / (2 * Math.PI);
}

function halfPeakToPeak(values: readonly number[]): number | null {
  return values.length > 0 ? 0.5 * (Math.max(...values) - Math.min(...values)) : null;
}

function makeStructuralBlock(
  samples: readonly SimulationSample[],
  start: number,
  end: number,
  diameter: number,
): StructuralBlock {
  const selected = samples.filter((sample) => sample.time >= start && sample.time <= end);
  if (selected.length < 2) {
    return {
      start,
      end,
      sampleCount: selected.length,
      displacementAmplitudeOverDiameter: null,
      meanWakeAmplitude: null,
      mechanicalCrossingFrequency: null,
      meanFluidPower: null,
      meanDampingPower: null,
    };
  }
  const times = selected.map((sample) => sample.time);
  const amplitude = halfPeakToPeak(selected.map((sample) => sample.displacement));
  return {
    start,
    end,
    sampleCount: selected.length,
    displacementAmplitudeOverDiameter: amplitude === null ? null : amplitude / diameter,
    meanWakeAmplitude: trapezoidalTimeMean(times, selected.map((sample) => sample.wakeAmplitude)),
    mechanicalCrossingFrequency: upwardCrossingFrequency(selected),
    meanFluidPower: trapezoidalTimeMean(times, selected.map((sample) => sample.fluidPower)),
    meanDampingPower: trapezoidalTimeMean(times, selected.map((sample) => sample.dampingPower)),
  };
}

function nearestSample(samples: readonly SimulationSample[], time: number): SimulationSample | null {
  if (samples.length === 0) return null;
  let closest = samples[0] ?? null;
  for (const sample of samples) {
    if (closest === null || Math.abs(sample.time - time) < Math.abs(closest.time - time)) closest = sample;
  }
  return closest;
}

function firstThresholdTime(
  samples: readonly SimulationSample[],
  value: (sample: SimulationSample) => number,
  threshold: number,
): number | null {
  const sample = samples.find((item) => value(item) >= threshold);
  return sample?.time ?? null;
}

function firstBelowThresholdTime(
  samples: readonly SimulationSample[],
  value: (sample: SimulationSample) => number,
  threshold: number,
): number | null {
  const initiallyAbove = (samples[0] !== undefined ? value(samples[0]) : 0) > threshold;
  if (!initiallyAbove) return null;
  const sample = samples.find((item) => value(item) <= threshold);
  return sample?.time ?? null;
}

function effectiveWakeLogSlope(
  result: SimulationResult,
  isolatedSaturation: number | null,
) {
  const upper = isolatedSaturation !== null ? 0.35 * isolatedSaturation : 0.2;
  const selected = result.samples.filter((sample) => sample.time >= 5
    && sample.time <= 100
    && sample.wakeAmplitude > 1e-8
    && sample.wakeAmplitude < Math.max(upper, 2e-3));
  const fit = linearRegression(
    selected.map((sample) => sample.time),
    selected.map((sample) => Math.log(sample.wakeAmplitude)),
  );
  return {
    sampleCount: selected.length,
    window: selected.length > 0
      ? [selected[0]?.time ?? null, selected.at(-1)?.time ?? null]
      : null,
    fit,
    interpretation: "This is an effective coupled-trajectory log slope, not an independent estimate of the fixed-body Landau coefficient mu.",
  };
}

function forwardRunSummary(
  result: SimulationResult,
  isolatedSaturation: number | null,
  frozenWakeGrowthRate: number,
  frozenWakeCubicReal: number,
  initialWakeAmplitude: number,
) {
  const finalTime = result.samples.at(-1)?.time ?? 0;
  const late = result.samples.filter((sample) => sample.time >= 0.5 * finalTime);
  const mechanicalFrequency = upwardCrossingFrequency(late);
  const wakeFrequency = unwrappedWakeFrequency(late);
  const referenceFrequency = mechanicalFrequency ?? wakeFrequency;
  const requiredBlockCount = 5;
  const cyclesPerBlock = 20;
  const requiredDuration = referenceFrequency !== null && referenceFrequency > 0
    ? requiredBlockCount * cyclesPerBlock / referenceFrequency
    : Number.POSITIVE_INFINITY;
  const blockDuration = Number.isFinite(requiredDuration)
    ? requiredDuration / requiredBlockCount
    : Number.NaN;
  const blocks: StructuralBlock[] = [];
  if (Number.isFinite(requiredDuration) && finalTime >= requiredDuration) {
    const start = finalTime - requiredDuration;
    for (let index = 0; index < requiredBlockCount; index += 1) {
      blocks.push(makeStructuralBlock(
        result.samples,
        start + index * blockDuration,
        start + (index + 1) * blockDuration,
        result.derived.cylinderDiameter,
      ));
    }
  }
  const amplitudeDrifts = blocks.slice(1).map((block, index) => {
    const previous = blocks[index]?.displacementAmplitudeOverDiameter;
    const current = block.displacementAmplitudeOverDiameter;
    return previous !== null && previous !== undefined && current !== null
      ? relativeDifference(previous, current)
      : null;
  });
  const frequencyDrifts = blocks.slice(1).map((block, index) => {
    const previous = blocks[index]?.mechanicalCrossingFrequency;
    const current = block.mechanicalCrossingFrequency;
    return previous !== null && previous !== undefined && current !== null
      ? relativeDifference(previous, current)
      : null;
  });
  const finiteAmplitudeDrifts = finiteValues(amplitudeDrifts);
  const finiteFrequencyDrifts = finiteValues(frequencyDrifts);
  const amplitudeGate = blocks.length === requiredBlockCount
    && finiteAmplitudeDrifts.length === requiredBlockCount - 1
    && Math.max(...finiteAmplitudeDrifts) < 0.01;
  const frequencyGate = blocks.length === requiredBlockCount
    && finiteFrequencyDrifts.length === requiredBlockCount - 1
    && Math.max(...finiteFrequencyDrifts) < 0.002;
  const last = result.samples.at(-1);
  const observationTimes = [12, 60, 120, 300].filter((time) => time <= finalTime + 1e-9);
  return {
    runId: result.runId,
    complete: result.complete,
    terminationCode: result.terminationCode,
    finalTime,
    sampleCount: result.samples.length,
    maximumAbsoluteAngle: Math.max(...result.samples.map((sample) => Math.abs(sample.theta))),
    maximumDisplacementOverDiameter: Math.max(...result.samples.map(
      (sample) => Math.abs(sample.displacement) / result.derived.cylinderDiameter,
    )),
    finalWakeAmplitude: last?.wakeAmplitude ?? null,
    effectiveEarlyWakeLogSlope: effectiveWakeLogSlope(result, isolatedSaturation),
    visibility: {
      declaredDisplacementThresholdOverDiameter: 0.01,
      firstDisplacementThresholdTime: firstThresholdTime(
        result.samples,
        (sample) => Math.abs(sample.displacement) / result.derived.cylinderDiameter,
        0.01,
      ),
      declaredWakeThreshold: 0.05,
      firstWakeThresholdTime: firstThresholdTime(
        result.samples,
        (sample) => sample.wakeAmplitude,
        0.05,
      ),
      firstDownwardWakeThresholdTime: firstBelowThresholdTime(
        result.samples,
        (sample) => sample.wakeAmplitude,
        0.05,
      ),
    },
    isolatedLandauPrediction: {
      assumptions: "fixed body, no mechanical feedback, frozen constant-flow Stuart-Landau radial equation",
      predictedFinalWakeAmplitude: isolatedLandauAmplitude(
        initialWakeAmplitude,
        frozenWakeGrowthRate,
        frozenWakeCubicReal,
        finalTime,
      ),
      predictedTimeToWakeAmplitude005: isolatedLandauThresholdTime(
        initialWakeAmplitude,
        0.05,
        frozenWakeGrowthRate,
        frozenWakeCubicReal,
      ),
    },
    snapshots: observationTimes.map((time) => {
      const sample = nearestSample(result.samples, time);
      return {
        requestedTime: time,
        actualTime: sample?.time ?? null,
        displacementOverDiameter: sample !== null
          ? sample.displacement / result.derived.cylinderDiameter
          : null,
        wakeAmplitude: sample?.wakeAmplitude ?? null,
      };
    }),
    lateFrequency: {
      window: [0.5 * finalTime, finalTime],
      mechanicalCrossingFrequency: mechanicalFrequency,
      wakePhaseFrequency: wakeFrequency,
      relativeDifference: mechanicalFrequency !== null && wakeFrequency !== null
        ? relativeDifference(mechanicalFrequency, wakeFrequency)
        : null,
    },
    strictStationarityAudit: {
      protocol: "five consecutive 20-cycle blocks; displacement-amplitude drift <1%; mechanical-frequency drift <0.2%",
      requiredDuration,
      availableDuration: finalTime,
      blocks,
      amplitudeDrifts,
      frequencyDrifts,
      amplitudeGate,
      frequencyGate,
      plvGate: "NOT-EVALUATED",
      periodicEnergyGate: "NOT-EVALUATED",
      floquetGate: "NOT-EVALUATED",
      finalStatus: amplitudeGate && frequencyGate
        ? "PARTIAL-ONLY: time-series gates met, but PLV, periodic-energy, and Floquet gates remain"
        : "NOT-MET",
    },
    phase4StateLabel: "U",
    labelReason: "A time trajectory cannot be upgraded to S0 or L1 without all predeclared stationarity/stability gates; this run is retained as a transient/visibility probe.",
    numerical: result.numerical,
    applicability: result.applicability,
  };
}

function forwardTraceRows(caseId: string, result: SimulationResult): string[] {
  return result.samples
    .filter((_, index) => index % 10 === 0 || index === result.samples.length - 1)
    .map((sample) => [
      caseId,
      sample.time,
      sample.theta,
      sample.omega,
      sample.displacement / result.derived.cylinderDiameter,
      sample.wakeReal,
      sample.wakeImaginary,
      sample.wakeAmplitude,
      sample.fluidPower,
      sample.dampingPower,
    ].join(","));
}

function frozenWakeCoefficients(base: SimulationConfig, speed: number) {
  const config = structuredClone(base);
  config.backend = "forward";
  config.fluid.flowSpeed = speed;
  config.fluid.flowRampTime = 0;
  config.fluid.flowModulationAmplitude = 0;
  return evaluateForward(
    config,
    1,
    { theta: 0, omega: 0, wakeReal: 0, wakeImaginary: 0 },
  );
}

function finiteTimeVisibilityReport(base: SimulationConfig) {
  const coldInitialAmplitude = 0.001;
  const wakeVisibilityThreshold = 0.05;
  const coefficientAtSpeed = (speed: number) => frozenWakeCoefficients(base, speed);
  const fixedWakeBoundary = bisectScalarRoot(
    (speed) => coefficientAtSpeed(speed).wakeGrowthRate,
    [0.005, 0.015],
  );
  const observationTimes = [12, 60, 120, 300];
  const points = observationTimes.map((observationTime) => {
    const solve = (speed: number) => {
      const coefficient = coefficientAtSpeed(speed);
      return isolatedLandauAmplitude(
        coldInitialAmplitude,
        coefficient.wakeGrowthRate,
        coefficient.wakeCubicReal,
        observationTime,
      ) - wakeVisibilityThreshold;
    };
    const speed = bisectScalarRoot(solve, [fixedWakeBoundary ?? 0.005, 0.03]);
    return {
      observationTime,
      flowSpeed: speed,
      reynolds: speed !== null ? structuralSpectrumPoint(base, speed).reynolds : null,
      shiftAboveFixedWakeBoundary: speed !== null && fixedWakeBoundary !== null
        ? speed - fixedWakeBoundary
        : null,
      upperSearchAmplitude: solve(0.03) + wakeVisibilityThreshold,
    };
  });
  const infiniteTimeFiniteDetectionBoundary = bisectScalarRoot((speed) => {
    const coefficient = coefficientAtSpeed(speed);
    return coefficient.wakeGrowthRate
      - coefficient.wakeCubicReal * wakeVisibilityThreshold ** 2;
  }, [fixedWakeBoundary ?? 0.005, 0.03]);
  return {
    initialWakeAmplitude: coldInitialAmplitude,
    declaredVisibleWakeAmplitude: wakeVisibilityThreshold,
    fixedWakeGrowthBoundary: fixedWakeBoundary,
    infiniteTimeFiniteDetectionBoundary,
    infiniteTimeFiniteDetectionShift: infiniteTimeFiniteDetectionBoundary !== null
      && fixedWakeBoundary !== null
      ? infiniteTimeFiniteDetectionBoundary - fixedWakeBoundary
      : null,
    points,
    exactRadialSolution: "r(t)^{-2}=beta/mu+[r(0)^{-2}-beta/mu] exp(-2 mu t), with the continuous mu->0 limit",
    limitOrder: "At fixed nonzero detection amplitude, T->infinity solves mu=beta*r_det^2 rather than mu=0. The spectral boundary is recovered only with the additional r_det->0 limit.",
    interpretation: "This is the isolated frozen-prior wake visibility boundary V_obs(T), not the coupled mechanical visibility boundary and not an apparatus prediction.",
  };
}

async function runForwardMemoryStudy(base: SimulationConfig) {
  if (process.argv.includes("--reuse-existing")) {
    const reusable = await readJsonIfPresent(forwardSummaryPath) as {
      entries?: Array<{
        case: ForwardCase;
        configHash: string;
        summary: Record<string, unknown>;
      }>;
      [key: string]: unknown;
    } | null;
    if (reusable?.entries !== undefined) {
      const entries = reusable.entries.map((entry) => {
        const coefficient = frozenWakeCoefficients(base, entry.case.speed);
        const item = {
          ...entry.case,
          frozenWakeGrowthRate: coefficient.wakeGrowthRate,
          frozenWakeCubicReal: coefficient.wakeCubicReal,
        };
        return {
          ...entry,
          case: item,
          summary: {
            ...entry.summary,
            isolatedLandauPrediction: {
              assumptions: "fixed body, no mechanical feedback, frozen constant-flow Stuart-Landau radial equation",
              predictedFinalWakeAmplitude: isolatedLandauAmplitude(
                item.initialWakeAmplitude,
                item.frozenWakeGrowthRate,
                item.frozenWakeCubicReal,
                Number(entry.summary.finalTime ?? 300),
              ),
              predictedTimeToWakeAmplitude005: isolatedLandauThresholdTime(
                item.initialWakeAmplitude,
                0.05,
                item.frozenWakeGrowthRate,
                item.frozenWakeCubicReal,
              ),
            },
          },
        };
      });
      const report = {
        ...reusable,
        createdAt: new Date().toISOString(),
        entries,
        isolatedWakeFiniteTimeVisibilityBoundary: finiteTimeVisibilityReport(base),
      };
      await writeFile(forwardSummaryPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      progress("forward study: reused trajectories and regenerated analytic visibility audit");
      return report;
    }
  }
  const speeds = [0.008, 0.0096, 0.011];
  const entries: Array<{
    case: ForwardCase;
    configHash: string;
    summary: ReturnType<typeof forwardRunSummary>;
  }> = [];
  const traceRows: string[] = [];
  for (const speed of speeds) {
    const frozen = structuredClone(base);
    frozen.backend = "forward";
    frozen.fluid.flowSpeed = speed;
    frozen.fluid.flowRampTime = 0;
    frozen.fluid.flowModulationAmplitude = 0;
    const zeroEvaluation = evaluateForward(
      frozen,
      1,
      { theta: 0, omega: 0, wakeReal: 0, wakeImaginary: 0 },
    );
    const isolatedSaturation = zeroEvaluation.wakeGrowthRate > 0
      && zeroEvaluation.wakeCubicReal > 0
      ? Math.sqrt(zeroEvaluation.wakeGrowthRate / zeroEvaluation.wakeCubicReal)
      : null;
    for (const start of ["cold", "hot"] as const) {
      const config = structuredClone(frozen);
      const hotAmplitude = isolatedSaturation ?? 0.25;
      const initialWakeAmplitude = start === "cold" ? 0.001 : hotAmplitude;
      config.initial.theta = 1e-4;
      config.initial.omega = 0;
      config.initial.wakeReal = initialWakeAmplitude;
      config.initial.wakeImaginary = 0;
      config.solver.duration = 300;
      config.solver.maximumStep = 0.02;
      config.solver.outputInterval = 0.04;
      config.solver.transientFraction = 0.5;
      assertValid(config);
      const caseId = `u${speed.toFixed(4).replace(".", "p")}-${start}`;
      const item: ForwardCase = {
        id: caseId,
        speed,
        start,
        initialWakeAmplitude,
        frozenWakeGrowthRate: zeroEvaluation.wakeGrowthRate,
        frozenWakeCubicReal: zeroEvaluation.wakeCubicReal,
        isolatedWakeSaturationAmplitude: isolatedSaturation,
      };
      progress(`forward ${caseId}: start (300 s)`);
      const result = await runForward(config, undefined, `phase4-forward-${caseId}`);
      const summary = forwardRunSummary(
        result,
        isolatedSaturation,
        zeroEvaluation.wakeGrowthRate,
        zeroEvaluation.wakeCubicReal,
        initialWakeAmplitude,
      );
      entries.push({ case: item, configHash: result.provenance.configHash, summary });
      traceRows.push(...forwardTraceRows(caseId, result));
      progress(`forward ${caseId}: ${result.terminationCode}; |A|=${summary.finalWakeAmplitude?.toExponential(4)}, state=${summary.phase4StateLabel}`);
    }
  }

  const pairs = speeds.map((speed) => {
    const cold = entries.find((entry) => entry.case.speed === speed && entry.case.start === "cold");
    const hot = entries.find((entry) => entry.case.speed === speed && entry.case.start === "hot");
    if (cold === undefined || hot === undefined) throw new Error(`missing cold/hot pair at U=${speed}`);
    const snapshotComparisons = cold.summary.snapshots.map((coldSnapshot) => {
      const hotSnapshot = hot.summary.snapshots.find(
        (snapshot) => snapshot.requestedTime === coldSnapshot.requestedTime,
      );
      return {
        time: coldSnapshot.requestedTime,
        coldWakeAmplitude: coldSnapshot.wakeAmplitude,
        hotWakeAmplitude: hotSnapshot?.wakeAmplitude ?? null,
        wakeAmplitudeRatioHotOverCold: coldSnapshot.wakeAmplitude !== null
          && hotSnapshot !== undefined
          && hotSnapshot.wakeAmplitude !== null
          ? hotSnapshot.wakeAmplitude / Math.max(coldSnapshot.wakeAmplitude, 1e-30)
          : null,
        coldAbsoluteDisplacementOverDiameter: coldSnapshot.displacementOverDiameter !== null
          ? Math.abs(coldSnapshot.displacementOverDiameter)
          : null,
        hotAbsoluteDisplacementOverDiameter: hotSnapshot?.displacementOverDiameter !== null
          && hotSnapshot?.displacementOverDiameter !== undefined
          ? Math.abs(hotSnapshot.displacementOverDiameter)
          : null,
      };
    });
    return {
      speed,
      reynolds: structuralSpectrumPoint(base, speed).reynolds,
      spectralAbscissa: structuralSpectrumPoint(base, speed).spectralAbscissa,
      frozenWakeGrowthRate: cold.case.frozenWakeGrowthRate,
      isolatedWakeSaturationAmplitude: cold.case.isolatedWakeSaturationAmplitude,
      coldCaseId: cold.case.id,
      hotCaseId: hot.case.id,
      snapshotComparisons,
      finalWakeAmplitudeRelativeDifference: cold.summary.finalWakeAmplitude !== null
        && hot.summary.finalWakeAmplitude !== null
        ? relativeDifference(cold.summary.finalWakeAmplitude, hot.summary.finalWakeAmplitude)
        : null,
      interpretation: cold.summary.strictStationarityAudit.finalStatus === "NOT-MET"
        || hot.summary.strictStationarityAudit.finalStatus === "NOT-MET"
        ? "Any cold/hot difference is finite-time initial-condition memory, not evidence of coexisting stationary attractors."
        : "Time-series partial gates alone still do not establish multistability without repeated basins and Floquet/continuation evidence.",
    };
  });
  const report = {
    analysisId: "VP-STRUCT-CROSS-FORWARD-MEMORY-v1",
    createdAt: new Date().toISOString(),
    evidenceLevel: "mechanism-calculation-under-uncalibrated-prior",
    phaseBoundary: "phase-4 transient/visibility study consuming VP-FWD-P0-SL1-v1 through the phase-2 integrator",
    source: {
      modelId: "VP-FWD-P0-SL1-v1",
      coefficientSetId: base.rom.coefficientSetId,
      coefficientSource: base.rom.coefficientSource,
      baseConfigPath: configPath,
      baseConfigHash: hashConfig(base),
      integrationSettings: {
        duration: 300,
        maximumStep: 0.02,
        outputInterval: 0.04,
        tolerances: {
          relative: base.solver.relativeTolerance,
          theta: base.solver.absoluteToleranceTheta,
          omega: base.solver.absoluteToleranceOmega,
          wake: base.solver.absoluteToleranceWake,
        },
      },
      initialConditionProtocol: "theta=1e-4 rad; cold |A|=1e-3; hot |A|=isolated SL saturation when supercritical, otherwise 0.25",
    },
    entries,
    coldHotPairs: pairs,
    isolatedWakeFiniteTimeVisibilityBoundary: finiteTimeVisibilityReport(base),
    allowedConclusions: [
      "The same frozen equations can remain observably dependent on initial wake amplitude for hundreds of seconds near a weak spectral crossing.",
      "A finite-duration visibility threshold can differ materially from the zero-state spectral threshold even without true multistability.",
      "Cold/hot comparisons are a necessary diagnostic before interpreting an up/down sweep as a branch fold.",
    ],
    prohibitedConclusions: [
      "Do not interpret a cold/hot difference before the stationarity gates as hysteresis or multiple attractors.",
      "Do not quote these speeds as apparatus thresholds because the coefficient package is an illustrative literature prior.",
      "Do not promote frequency proximity to L1 without bounded phase, power, periodic-orbit, and Floquet evidence.",
    ],
  };
  await writeFile(forwardSummaryPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const header = "caseId,time,theta,omega,displacementOverD,wakeReal,wakeImaginary,wakeAmplitude,fluidPower,dampingPower\n";
  await writeFile(forwardTracePath, `${header}${traceRows.join("\n")}\n`, "utf8");
  return report;
}

async function readJsonIfPresent(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function main(): Promise<void> {
  const mode = parseMode();
  await mkdir(artifactDirectory, { recursive: true });
  const base = JSON.parse(await readFile(configPath, "utf8")) as SimulationConfig;
  assertValid(base);
  let highFidelity: unknown | null = null;
  let forward: unknown | null = null;
  if (mode === "all" || mode === "hf") highFidelity = await runHighFidelityStudy(base);
  else highFidelity = await readJsonIfPresent(highFidelitySummaryPath);
  if (mode === "all" || mode === "forward") forward = await runForwardMemoryStudy(base);
  else forward = await readJsonIfPresent(forwardSummaryPath);
  const fixedGrid = await readJsonIfPresent(resolve(artifactRoot, "phase3-fixed-cylinder-grid-study.json"));
  const baseline = await readJsonIfPresent(resolve(artifactRoot, "phase4-structural-baseline.json"));
  const combined = {
    analysisId: "VP-STRUCT-CROSS-LAYER-v1",
    createdAt: new Date().toISOString(),
    phaseBoundary: "phase 4 only; source theories/programs retain their original phase identities",
    dependencyGraph: {
      forwardTheory: "VP-FWD-P0-SL1-v1",
      forwardIntegrator: "Dormand-Prince-5(4), solverVersion 2.0.0",
      highFidelityBackend: "VP-HF-CFD2D-v1",
      structuralBaseline: "VP-STRUCT-P0-SL1-v1-baseline-audit",
    },
    highFidelityPrescribedResponse: highFidelity,
    forwardInitialConditionMemory: forward,
    inheritedPhase3FixedCylinderGridStudy: fixedGrid,
    inheritedPhase4Baseline: baseline,
    synthesisRules: [
      "Only compare native dimensionless frequency, phase, line-force gain, and line-power sign across the two-dimensional and reduced-order layers.",
      "Never compare the phase-3 line force per unit span directly with the phase-1 finite-span generalized torque.",
      "Treat disagreement as a model-form discriminator until both coefficient calibration and high-fidelity convergence gates pass.",
      "Retain U/UNKNOWN whenever finite-time, stationarity, periodic-orbit, or load-convergence gates are missing.",
    ],
  };
  await writeFile(combinedPath, `${JSON.stringify(combined, null, 2)}\n`, "utf8");
  progress(`combined report: ${combinedPath}`);
  progress(`HF summary: ${highFidelitySummaryPath}`);
  progress(`forward summary: ${forwardSummaryPath}`);
}

await main();
