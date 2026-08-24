#!/usr/bin/env -S npx vite-node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveParameters, hashConfig, validateConfig } from "../src/core/config";
import type { SimulationConfig, SimulationResult } from "../src/core/types";
import {
  firstSignChange,
  locateScalarRoot,
  locateStructuralBoundary,
  scanStructuralSpectrum,
  structuralSpectrumPoint,
} from "../src/analysis/structure";
import { runForward } from "../src/solvers/forward";
import { evaluateForward } from "../src/solvers/forward/model";

interface GridStudy {
  verdict: string;
  entries: Array<{
    diameterCells: number;
    qoi: { strouhal: number; rmsLiftCoefficient: number };
  }>;
}

function csvCell(value: number): string {
  return Number.isFinite(value) ? value.toPrecision(16) : "";
}

function scanCsv(points: ReturnType<typeof scanStructuralSpectrum>): string {
  const header = [
    "flowSpeed", "reynolds", "reducedVelocity", "wakeGrowthRate",
    "spectralAbscissa", "criticalImaginaryMagnitude", "c1", "c2", "c3", "c4",
    "delta2", "delta3", "polynomialResidual",
  ];
  const rows = points.map((point) => [
    point.flowSpeed,
    point.reynolds,
    point.reducedVelocity,
    point.wakeGrowthRate,
    point.spectralAbscissa,
    point.criticalImaginaryMagnitude,
    ...point.characteristic.slice(1),
    point.hurwitz.delta2,
    point.hurwitz.delta3,
    point.maximumPolynomialResidual,
  ].map(csvCell).join(","));
  return `${header.join(",")}\n${rows.join("\n")}\n`;
}

function longRunSummary(result: SimulationResult) {
  const samples = result.samples;
  const last = samples.at(-1);
  const finalTime = last?.time ?? 0;
  const lateStart = 0.5 * finalTime;
  const late = samples.filter((sample) => sample.time >= lateStart);
  const mean = (values: number[]) => values.length === 0
    ? Number.NaN
    : values.reduce((sum, value) => sum + value, 0) / values.length;
  const upwardCrossings: number[] = [];
  for (let index = 1; index < late.length; index += 1) {
    const left = late[index - 1];
    const right = late[index];
    if (left === undefined || right === undefined || !(left.theta < 0 && right.theta >= 0)) continue;
    const fraction = -left.theta / (right.theta - left.theta);
    upwardCrossings.push(left.time + fraction * (right.time - left.time));
  }
  const crossingPeriods = upwardCrossings.slice(1).map((time, index) => time - (upwardCrossings[index] ?? time));
  const mechanicalCrossingFrequency = crossingPeriods.length > 0 ? 1 / mean(crossingPeriods) : null;
  let previousWrapped: number | undefined;
  let unwrapped = 0;
  const wakePhase: Array<[number, number]> = [];
  for (const sample of late) {
    const wrapped = Math.atan2(sample.wakeImaginary, sample.wakeReal);
    if (previousWrapped === undefined) unwrapped = wrapped;
    else {
      let increment = wrapped - previousWrapped;
      while (increment > Math.PI) increment -= 2 * Math.PI;
      while (increment < -Math.PI) increment += 2 * Math.PI;
      unwrapped += increment;
    }
    previousWrapped = wrapped;
    wakePhase.push([sample.time, unwrapped]);
  }
  const meanTime = mean(wakePhase.map(([time]) => time));
  const meanPhase = mean(wakePhase.map(([, phase]) => phase));
  const phaseNumerator = wakePhase.reduce(
    (sum, [time, phase]) => sum + (time - meanTime) * (phase - meanPhase),
    0,
  );
  const phaseDenominator = wakePhase.reduce((sum, [time]) => sum + (time - meanTime) ** 2, 0);
  const wakePhaseFrequency = phaseDenominator > 0 ? phaseNumerator / phaseDenominator / (2 * Math.PI) : null;
  const blockCount = 6;
  const blockDuration = (finalTime - lateStart) / blockCount;
  const blocks = Array.from({ length: blockCount }, (_, index) => {
    const start = lateStart + index * blockDuration;
    const end = index === blockCount - 1 ? finalTime : start + blockDuration;
    const block = samples.filter((sample) => sample.time >= start && sample.time <= end);
    const angles = block.map((sample) => sample.theta);
    return {
      start,
      end,
      sampleCount: block.length,
      halfPeakToPeakAngle: angles.length > 0 ? 0.5 * (Math.max(...angles) - Math.min(...angles)) : null,
      meanWakeAmplitude: mean(block.map((sample) => sample.wakeAmplitude)),
      meanFluidPower: mean(block.map((sample) => sample.fluidPower)),
      meanDampingPower: mean(block.map((sample) => sample.dampingPower)),
    };
  });
  return {
    runId: result.runId,
    terminationCode: result.terminationCode,
    complete: result.complete,
    requestedDuration: result.config.solver.duration,
    finalTime,
    sampleCount: samples.length,
    terminalEvent: result.events.at(-1) ?? null,
    maximumAbsoluteAngle: Math.max(...samples.map((sample) => Math.abs(sample.theta))),
    maximumDimensionlessDisplacement: Math.max(
      ...samples.map((sample) => Math.abs(sample.displacement) / result.derived.cylinderDiameter),
    ),
    finalWakeAmplitude: last?.wakeAmplitude ?? Number.NaN,
    lateWindow: [lateStart, finalTime],
    lateMeanFluidPower: mean(late.map((sample) => sample.fluidPower)),
    lateMeanDampingPower: mean(late.map((sample) => sample.dampingPower)),
    mechanicalCrossingFrequency,
    wakePhaseFrequency,
    relativeFrequencyDifference: mechanicalCrossingFrequency !== null && wakePhaseFrequency !== null
      ? Math.abs(mechanicalCrossingFrequency - wakePhaseFrequency) / wakePhaseFrequency
      : null,
    stationarityBlocks: blocks,
    metrics: result.metrics,
    interpretation: result.complete
      ? "Numerical completion alone does not certify a stationary periodic orbit; block stationarity and Floquet analysis remain separate gates."
      : "The nominal literature-prior trajectory left a declared model/application domain before the requested horizon; it cannot define a saturated physical branch.",
  };
}

const root = fileURLToPath(new URL("../", import.meta.url));
const configPath = resolve(root, "public/examples/vortex-pendulum-default.json");
const artifactRoot = resolve(
  root,
  "../90_候选工作区/current/验证与复现/artifacts",
);
const gridPath = resolve(artifactRoot, "phase3-fixed-cylinder-grid-study.json");
const outputPath = resolve(artifactRoot, "phase4-structural-baseline.json");
const scanPath = resolve(artifactRoot, "phase4-linear-spectrum-scan.csv");
const longRunPath = resolve(artifactRoot, "phase4-prior-long-run.json");

const config = JSON.parse(await readFile(configPath, "utf8")) as SimulationConfig;
const errors = validateConfig(config).filter((issue) => issue.severity === "error");
if (errors.length > 0) throw new Error(errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
const grid = JSON.parse(await readFile(gridPath, "utf8")) as GridStudy;

const scan = scanStructuralSpectrum(config, 0, 0.03, 300);
const coupledBracket = firstSignChange(scan, (point) => point.spectralAbscissa);
if (coupledBracket === undefined) throw new Error("no coupled equilibrium spectral crossing found in 0--0.03 m/s");
const coupledBoundary = locateStructuralBoundary(config, coupledBracket);
const wakeBracket = firstSignChange(scan, (point) => point.wakeGrowthRate);
if (wakeBracket === undefined) throw new Error("no fixed-body wake growth-rate crossing found in 0--0.03 m/s");
const fixedWakeSpeed = locateScalarRoot(
  (flowSpeed) => structuralSpectrumPoint(config, flowSpeed).wakeGrowthRate,
  wakeBracket,
);
const fixedWakePoint = structuralSpectrumPoint(config, fixedWakeSpeed);
const nominalPoint = structuralSpectrumPoint(config, config.fluid.flowSpeed);
const derived = deriveParameters(config);
const nominalEvaluation = evaluateForward(
  { ...structuredClone(config), fluid: { ...config.fluid, flowRampTime: 0, flowModulationAmplitude: 0 } },
  1,
  { theta: 0, omega: 0, wakeReal: 0, wakeImaginary: 0 },
);
const isolatedWakeSaturation = nominalEvaluation.wakeGrowthRate > 0
  && nominalEvaluation.wakeCubicReal > 0
  ? Math.sqrt(nominalEvaluation.wakeGrowthRate / nominalEvaluation.wakeCubicReal)
  : null;
const isolatedWakeSaturationTime = isolatedWakeSaturation !== null
  && config.initial.wakeReal !== 0
  ? Math.log(isolatedWakeSaturation / Math.hypot(config.initial.wakeReal, config.initial.wakeImaginary))
    / nominalEvaluation.wakeGrowthRate
  : null;

const longConfig = structuredClone(config);
longConfig.solver.duration = 240;
longConfig.solver.outputInterval = 0.02;
longConfig.solver.transientFraction = 0.8;
const longResult = await runForward(longConfig, undefined, "phase4-prior-long-run");
await writeFile(longRunPath, `${JSON.stringify(longResult, null, 2)}\n`, "utf8");

const strouhalValues = grid.entries.map((entry) => entry.qoi.strouhal);
const minimumStrouhal = Math.min(...strouhalValues);
const maximumStrouhal = Math.max(...strouhalValues);
const report = {
  analysisId: "VP-STRUCT-P0-SL1-v1-baseline-audit",
  createdAt: new Date().toISOString(),
  phaseBoundary: "phase-4 structural analysis; not phase-1 forward theory, phase-2 integration theory, or phase-3 CFD validation",
  sourceIdentity: {
    forwardModelId: "VP-FWD-P0-SL1-v1",
    configPath,
    configHash: hashConfig(config),
    coefficientSetId: config.rom.coefficientSetId,
    coefficientSource: config.rom.coefficientSource,
    highFidelityModelId: "VP-HF-CFD2D-v1",
    highFidelityGridStudyPath: gridPath,
    highFidelityVerdict: grid.verdict,
  },
  symmetricEquilibrium: {
    state: [0, 0, 0, 0],
    nominalResidualNorm: nominalPoint.symmetricResidualNorm,
    linearizationMethod: "five-point central differentiation of the frozen continuous RHS; quartic roots independently residual-checked",
  },
  dimensionalBaseline: {
    diameter: derived.cylinderDiameter,
    naturalFrequency: derived.naturalFrequency,
    naturalAngularFrequency: derived.naturalAngularFrequency,
    effectiveMomentOfInertia: derived.effectiveMomentOfInertia,
    totalLinearStiffness: derived.totalLinearStiffness,
    nominalFlowSpeed: config.fluid.flowSpeed,
    nominalReynolds: derived.reynolds,
    nominalReducedVelocity: derived.reducedVelocity,
  },
  boundariesUnderIllustrativePrior: {
    coupledEquilibrium: coupledBoundary,
    fixedBodyWakeGrowth: {
      flowSpeed: fixedWakeSpeed,
      reynolds: fixedWakePoint.reynolds,
      reducedVelocity: fixedWakePoint.reducedVelocity,
      wakeGrowthRate: fixedWakePoint.wakeGrowthRate,
    },
    ordering: coupledBoundary.flowSpeed < fixedWakeSpeed
      ? "coupled-equilibrium crossing precedes fixed-body wake growth crossing under this prior"
      : "fixed-body wake growth crossing precedes or coincides with coupled-equilibrium crossing under this prior",
    epistemicStatus: "mathematical output of an uncalibrated literature-prior coefficient package; not an apparatus threshold prediction",
  },
  nominalPriorPoint: {
    spectrum: nominalPoint,
    isolatedWakeSaturationAmplitude: isolatedWakeSaturation,
    isolatedWakeSaturationTimeFromDeclaredInitialAmplitude: isolatedWakeSaturationTime,
    requestedPhase2DefaultDuration: config.solver.duration,
    observation: isolatedWakeSaturationTime !== null && isolatedWakeSaturationTime > config.solver.duration
      ? "the default 12 s run is shorter than the isolated-wake logarithmic saturation-time estimate"
      : "the saturation-time estimate does not exceed the default duration",
  },
  extendedPriorRun: longRunSummary(longResult),
  crossBackendFrequencyDiscriminator: {
    romPriorStrouhal: config.rom.strouhalNumber,
    romPriorOneToOneReducedVelocity: 1 / config.rom.strouhalNumber,
    cfdGridStrouhalRange: [minimumStrouhal, maximumStrouhal],
    correspondingOneToOneReducedVelocityRange: [1 / maximumStrouhal, 1 / minimumStrouhal],
    cfdVerdict: grid.verdict,
    interpretation: "The CFD range is a nonconverged discriminator, not a calibrated replacement coefficient. Its mismatch with the ROM prior quantifies a model-form uncertainty that must be resolved by accepted CFD or fixed-body experiment.",
  },
  scan: {
    flowSpeedRange: [scan[0]?.flowSpeed, scan.at(-1)?.flowSpeed],
    pointCount: scan.length,
    csvPath: scanPath,
    maximumQuarticResidual: Math.max(...scan.map((point) => point.maximumPolynomialResidual)),
  },
  allowedConclusions: [
    "The frozen equations admit distinct fixed-wake, coupled-equilibrium, synchronization, and visibility boundaries.",
    "For the bundled prior, 12 s numerical completion is not evidence of a stationary nonlinear branch.",
    "The independent 2-D CFD study supplies a useful but unresolved Strouhal discriminator.",
  ],
  prohibitedConclusions: [
    "Do not quote either computed speed as an experimental critical velocity.",
    "Do not call the extended prior trajectory a validated branch or the CFD Strouhal range converged.",
    "Do not infer three-dimensional apparatus loads from the two-dimensional grid study.",
  ],
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(scanPath, scanCsv(scan), "utf8");
process.stdout.write(`${JSON.stringify({
  outputPath,
  scanPath,
  longRunPath,
  coupledBoundary: report.boundariesUnderIllustrativePrior.coupledEquilibrium.flowSpeed,
  fixedWakeBoundary: report.boundariesUnderIllustrativePrior.fixedBodyWakeGrowth.flowSpeed,
  longRunTermination: report.extendedPriorRun.terminationCode,
  highFidelityVerdict: grid.verdict,
}, null, 2)}\n`);
