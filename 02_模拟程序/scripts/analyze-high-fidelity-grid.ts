import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { SimulationResult, SimulationSample } from "../src/core/types";

const DIAMETERS = [8, 12, 16] as const;
const WINDOW_START = 20;

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rmsCentered(values: readonly number[]): number {
  const center = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - center) ** 2)));
}

function positiveCrossingPeriods(samples: readonly SimulationSample[]): number[] {
  const center = mean(samples.map((sample) => sample.liftCoefficient));
  const crossings: number[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const left = samples[index - 1];
    const right = samples[index];
    if (left === undefined || right === undefined) continue;
    if (left.liftCoefficient <= center && right.liftCoefficient > center) {
      const fraction = (center - left.liftCoefficient)
        / (right.liftCoefficient - left.liftCoefficient);
      crossings.push(left.time + fraction * (right.time - left.time));
    }
  }
  return crossings.slice(1).map((crossing, index) => crossing - (crossings[index] ?? crossing));
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function qois(result: SimulationResult) {
  const samples = result.samples.filter((sample) => sample.time >= WINDOW_START);
  const midpoint = 0.5 * (WINDOW_START + result.config.solver.duration);
  const firstHalf = samples.filter((sample) => sample.time < midpoint);
  const secondHalf = samples.filter((sample) => sample.time >= midpoint);
  const referenceForce = 0.5
    * result.config.fluid.density
    * result.config.fluid.flowSpeed ** 2
    * 2 * result.config.geometry.radius;
  const periods = positiveCrossingPeriods(samples);
  const summarize = (window: SimulationSample[]) => ({
    meanDragCoefficient: mean(window.map((sample) => sample.dragCoefficient)),
    rmsLiftCoefficient: rmsCentered(window.map((sample) => sample.liftCoefficient)),
  });
  const whole = summarize(samples);
  const first = summarize(firstHalf);
  const second = summarize(secondHalf);
  return {
    window: [WINDOW_START, result.config.solver.duration],
    sampleCount: samples.length,
    meanDragCoefficient: whole.meanDragCoefficient,
    rmsLiftCoefficient: whole.rmsLiftCoefficient,
    stressMeanDragCoefficient: mean(samples.map((sample) =>
      (sample.stressLineForceX ?? 0) / referenceForce)),
    stressRmsLiftCoefficient: rmsCentered(samples.map((sample) =>
      (sample.stressLineForceY ?? 0) / referenceForce)),
    crossingPeriods: periods,
    strouhal: periods.length > 0
      ? (2 * result.config.geometry.radius)
        / (result.config.fluid.flowSpeed * mean(periods))
      : null,
    meanForcePathRelativeDifference: mean(samples.map((sample) =>
      sample.forcePathRelativeDifference ?? 0)),
    maximumForcePathRelativeDifference: Math.max(...samples.map((sample) =>
      sample.forcePathRelativeDifference ?? 0)),
    halfWindowDrift: {
      meanDragCoefficient: second.meanDragCoefficient - first.meanDragCoefficient,
      rmsLiftCoefficient: second.rmsLiftCoefficient - first.rmsLiftCoefficient,
    },
  };
}

function generalizedOrder(
  coarse: number,
  medium: number,
  fine: number,
): { status: "MONOTONIC" | "INCONCLUSIVE"; order: number | null; extrapolated: number | null; relativeFineCorrection: number | null } {
  const deltaCoarse = coarse - medium;
  const deltaFine = medium - fine;
  if (!(deltaCoarse * deltaFine > 0) || !(Math.abs(deltaFine) < Math.abs(deltaCoarse))) {
    return { status: "INCONCLUSIVE", order: null, extrapolated: null, relativeFineCorrection: null };
  }
  const target = deltaCoarse / deltaFine;
  const h = DIAMETERS.map((diameter) => 1 / diameter);
  const ratio = (order: number) => (
    ((h[0] ?? 0) ** order - (h[1] ?? 0) ** order)
    / ((h[1] ?? 0) ** order - (h[2] ?? 0) ** order)
  );
  let low = 0.01;
  let high = 12;
  const increasing = ratio(high) > ratio(low);
  const targetInside = increasing
    ? target >= ratio(low) && target <= ratio(high)
    : target <= ratio(low) && target >= ratio(high);
  if (!targetInside) return { status: "INCONCLUSIVE", order: null, extrapolated: null, relativeFineCorrection: null };
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const middle = 0.5 * (low + high);
    if ((ratio(middle) < target) === increasing) low = middle;
    else high = middle;
  }
  const order = 0.5 * (low + high);
  const refinement = (h[1] ?? 0) / (h[2] ?? 1);
  const extrapolated = fine + (fine - medium) / (refinement ** order - 1);
  return {
    status: "MONOTONIC",
    order,
    extrapolated,
    relativeFineCorrection: Math.abs(extrapolated - fine) / Math.max(Math.abs(extrapolated), 1e-30),
  };
}

interface GridEntry {
  diameterCells: number;
  path: string;
  sha256: string;
  configHash: string;
  completed: boolean;
  terminationCode: string;
  nx: number;
  ny: number;
  penalizationTimeSteps: number;
  nondimensionalPenalizationTime: number;
  relaxationTime: number | undefined;
  nominalMach: number | undefined;
  maximumMach: number | undefined;
  relativeMassBalanceResidual: number | undefined;
  qoi: ReturnType<typeof qois>;
}

const entries: GridEntry[] = [];
for (const diameterCells of DIAMETERS) {
  const suffix = String(diameterCells).padStart(2, "0");
  const path = resolve(
    `验证与复现/artifacts/high-fidelity-grid-d${suffix}-re102-30s.json`,
  );
  const bytes = await readFile(path);
  const result = JSON.parse(bytes.toString("utf8")) as SimulationResult;
  entries.push({
    diameterCells,
    path,
    sha256: sha256(bytes),
    configHash: result.provenance.configHash,
    completed: result.complete,
    terminationCode: result.terminationCode,
    nx: result.config.cfd2d.nx,
    ny: result.config.cfd2d.ny,
    penalizationTimeSteps: result.config.cfd2d.penalizationTimeSteps,
    nondimensionalPenalizationTime: result.config.cfd2d.penalizationTimeSteps
      * result.numerical.lattice!.latticeMach / Math.sqrt(3)
      / result.config.cfd2d.cylinderCells,
    relaxationTime: result.numerical.lattice?.relaxationTime,
    nominalMach: result.numerical.lattice?.latticeMach,
    maximumMach: result.numerical.lattice?.maximumMach,
    relativeMassBalanceResidual: result.numerical.lattice?.relativeMassBalanceResidual,
    qoi: qois(result),
  });
}

const values = <K extends keyof ReturnType<typeof qois>>(key: K) =>
  entries.map((entry) => entry.qoi[key] as number);
const convergence = {
  meanDragCoefficient: generalizedOrder(...values("meanDragCoefficient") as [number, number, number]),
  rmsLiftCoefficient: generalizedOrder(...values("rmsLiftCoefficient") as [number, number, number]),
  stressMeanDragCoefficient: generalizedOrder(...values("stressMeanDragCoefficient") as [number, number, number]),
  stressRmsLiftCoefficient: generalizedOrder(...values("stressRmsLiftCoefficient") as [number, number, number]),
  strouhal: generalizedOrder(...values("strouhal") as [number, number, number]),
  forcePathDifference: generalizedOrder(...values("meanForcePathRelativeDifference") as [number, number, number]),
};
const report = {
  auditId: "VP-HF-CFD2D-v1-fixed-cylinder-grid-study-Re101.59",
  createdAt: new Date().toISOString(),
  physicalCase: {
    reynolds: 101.59362549800798,
    duration: 30,
    statisticsWindow: [20, 30],
    domainInDiameters: [16, 8],
    nominalLatticeVelocity: 0.05,
    nondimensionalPenalizationTime: 0.00625,
  },
  entries,
  convergence,
  verdict: "INCONCLUSIVE",
  reasons: [
    "Strouhal and lift RMS are not in a monotone asymptotic three-grid sequence.",
    "The last 10 s contain only three to four complete lift periods per grid.",
    "The penalty-reaction/stress-contour force discrepancy remains 15% or larger on the fine grid.",
    "Peak local Mach remains near 0.16; an independent Mach-squared extrapolation has not yet been completed.",
    "Time-step, outlet, domain-width/length, grid-phase, and initial-wake studies remain open.",
  ],
  allowedConclusion: "The solver forms a stable, deterministic component-verified 2-D vortex street with approximately plausible St, but cylinder loads are not yet accepted as a validated reference.",
  prohibitedConclusion: "Do not quote a GCI, validated drag/lift uncertainty, 3-D total force, apparatus torque, or canonical pendulum prediction from this study.",
};
const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/phase3-fixed-cylinder-grid-study.json",
);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  outputPath,
  verdict: report.verdict,
  reasons: report.reasons,
  entries: report.entries.map((entry) => ({ diameterCells: entry.diameterCells, qoi: entry.qoi })),
  convergence,
}, null, 2)}\n`);
