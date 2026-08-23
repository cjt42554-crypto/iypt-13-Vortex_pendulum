import { compareExperimentToSimulation } from "../analysis/comparison";
import type {
  ComparisonMetrics,
  ExperimentalDataset,
  SimulationConfig,
  SimulationResult,
} from "../core/types";
import { importExperimentalCsv } from "../io/csv";

export function formatNumber(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  if ((absolute > 0 && absolute < 1e-3) || absolute >= 1e4) {
    return value.toExponential(Math.min(digits, 3));
  }
  return new Intl.NumberFormat("zh-CN", { maximumSignificantDigits: digits }).format(value);
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadJson(filename: string, value: unknown): void {
  downloadText(filename, JSON.stringify(value, typedArrayReplacer, 2), "application/json");
}

export function resultToCsv(result: SimulationResult): string {
  const columns = [
    "time", "theta", "omega", "angularAcceleration", "observationRadius",
    "displacement", "velocity", "wakeReal", "wakeImaginary", "wakeAmplitude",
    "wakePhase", "liftCoefficient", "dragCoefficient", "liftTorque", "dragTorque",
    "pitchingTorque", "fluidTorque", "buoyancyTorque", "controlTorque", "fluidPower",
    "lineForceX", "lineForceY", "linePower2d", "stripTorqueDensity",
    "stressLineForceX", "stressLineForceY", "forcePathRelativeDifference",
    "dampingPower", "controlPower", "kineticEnergy", "gravitationalPotential",
    "hydrostaticPotential", "elasticPotential", "mechanicalEnergy", "effectiveInertia",
    "addedInertia", "displacedVolume", "projectedWetArea", "axisWetLength",
    "volumeEquivalentWetLength", "flowSpeed", "reynolds", "wetBranch",
  ] as const;
  const exchangeColumns = [
    "appliedStartTime", "appliedEndTime",
    "appliedRawLineImpulseX", "appliedRawLineImpulseY",
    "appliedRawLineForceX", "appliedRawLineForceY",
    "appliedRawLineWork", "appliedRawTorqueImpulse", "appliedRawTorque",
    "appliedRawWork", "appliedRawPower", "brinkmanFluidWork",
    "rawSolidReactionWork", "brinkmanPenaltyDissipation", "brinkmanAlgebraicResidual",
    "diagnosticEndpointRawLineForceX", "diagnosticEndpointRawLineForceY",
    "legacyIncompleteStressContourLineForceX", "legacyIncompleteStressContourLineForceY",
    "cumulativeAppliedRawLineWork", "cumulativeAppliedRawWork",
    "cumulativeBrinkmanFluidWork", "cumulativeRawSolidReactionWork",
    "cumulativeBrinkmanPenaltyDissipation", "cumulativeBrinkmanAlgebraicResidual",
  ] as const;
  const lines = [[...columns, ...exchangeColumns].join(",")];
  for (const sample of result.samples) {
    const applied = sample.interfaceExchange?.applied;
    const diagnostic = sample.interfaceExchange?.diagnostic;
    const cumulative = sample.interfaceExchange?.cumulative;
    const exchangeValues = [
      applied?.startTime, applied?.endTime,
      applied?.appliedRawLineImpulseX, applied?.appliedRawLineImpulseY,
      applied?.appliedRawLineForceX, applied?.appliedRawLineForceY,
      applied?.appliedRawLineWork, applied?.appliedRawTorqueImpulse, applied?.appliedRawTorque,
      applied?.appliedRawWork, applied?.appliedRawPower, applied?.brinkmanFluidWork,
      applied?.rawSolidReactionWork, applied?.brinkmanPenaltyDissipation,
      applied?.brinkmanAlgebraicResidual,
      diagnostic?.diagnosticEndpointRawLineForceX,
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
    lines.push([
      ...columns.map((column) => csvCell(sample[column])),
      ...exchangeValues.map(csvCell),
    ].join(","));
  }
  return `\uFEFF${lines.join("\n")}`;
}

export async function readJsonFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text()) as unknown;
}

export function isSimulationConfig(value: unknown): value is SimulationConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SimulationConfig>;
  return candidate.schemaVersion === "3.0.0"
    && candidate.problemId === "iypt-2027-vortex-pendulum"
    && (candidate.backend === "forward" || candidate.backend === "highFidelity")
    && candidate.geometry !== undefined
    && candidate.body !== undefined
    && candidate.fluid !== undefined
    && candidate.support !== undefined
    && candidate.rom !== undefined
    && candidate.cfd2d !== undefined
    && candidate.initial !== undefined
    && candidate.solver !== undefined;
}

export async function parseExperimentalCsv(file: File): Promise<ExperimentalDataset> {
  return importExperimentalCsv((await file.text()).replace(/^\uFEFF/, ""), { name: file.name });
}

export function compareExperiment(
  result: SimulationResult,
  dataset: ExperimentalDataset,
): ComparisonMetrics {
  return compareExperimentToSimulation(dataset, result.samples).metrics;
}

export function interpolateExperiment(
  dataset: ExperimentalDataset,
  time: number,
  observationRadius: number,
): number | undefined {
  const values = dataset.points.map((point) => ({
    time: point.time,
    value: point.displacement
      ?? (point.theta === undefined ? undefined : observationRadius * Math.sin(point.theta)),
  })).filter((point): point is { time: number; value: number } => point.value !== undefined);
  if (values.length === 0 || time < (values[0]?.time ?? 0) || time > (values.at(-1)?.time ?? 0)) {
    return undefined;
  }
  let low = 0;
  let high = values.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if ((values[middle]?.time ?? Number.POSITIVE_INFINITY) <= time) low = middle;
    else high = middle;
  }
  const left = values[low];
  const right = values[high];
  if (left === undefined || right === undefined) return undefined;
  if (time === left.time || right.time === left.time) return left.value;
  const fraction = (time - left.time) / (right.time - left.time);
  return left.value + fraction * (right.value - left.value);
}

function csvCell(value: unknown): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function typedArrayReplacer(_key: string, value: unknown): unknown {
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>);
  return value;
}
