import type { CoefficientSummary } from "./benchmark-metrics.ts";

export type SensitivityGroup =
  | "baseline"
  | "grid-phase"
  | "mask-half-thickness"
  | "penalization";

export interface FixedSensitivityVariant {
  id: string;
  group: SensitivityGroup;
  phaseOffsetX: number;
  phaseOffsetY: number;
  maskHalfThickness: number;
  etaHat: number;
}

export interface SensitivityMetrics {
  meanDrag: number;
  liftRms: number;
  strouhal: number;
}

export type DiagnosedSensitivity =
  | "grid-phase"
  | "mask-half-thickness"
  | "penalization"
  | "multi-factor"
  | "insufficient";

export const BASELINE_PHASE_OFFSET_Y = 0.17320508075688773;
export const BASELINE_MASK_HALF_THICKNESS = 0.75;
export const BASELINE_ETA_HAT = 0.00625;
export const SIGNIFICANT_LOAD_SENSITIVITY = 0.05;
export const DOMINANCE_RATIO = 1.5;
export const BASELINE_REPRODUCTION_TOLERANCE = 1e-12;

export const BASELINE_VARIANT: FixedSensitivityVariant = {
  id: "baseline",
  group: "baseline",
  phaseOffsetX: 0,
  phaseOffsetY: 0,
  maskHalfThickness: BASELINE_MASK_HALF_THICKNESS,
  etaHat: BASELINE_ETA_HAT,
};

export const RESEARCH_VARIANTS: readonly FixedSensitivityVariant[] = [
  BASELINE_VARIANT,
  {
    ...BASELINE_VARIANT,
    id: "phase-x-half",
    group: "grid-phase",
    phaseOffsetX: 0.5,
  },
  {
    ...BASELINE_VARIANT,
    id: "phase-y-half",
    group: "grid-phase",
    phaseOffsetY: 0.5,
  },
  {
    ...BASELINE_VARIANT,
    id: "phase-xy-half",
    group: "grid-phase",
    phaseOffsetX: 0.5,
    phaseOffsetY: 0.5,
  },
  {
    ...BASELINE_VARIANT,
    id: "mask-half-0p50",
    group: "mask-half-thickness",
    maskHalfThickness: 0.5,
  },
  {
    ...BASELINE_VARIANT,
    id: "mask-half-1p00",
    group: "mask-half-thickness",
    maskHalfThickness: 1,
  },
  {
    ...BASELINE_VARIANT,
    id: "mask-half-1p25",
    group: "mask-half-thickness",
    maskHalfThickness: 1.25,
  },
  {
    ...BASELINE_VARIANT,
    id: "eta-half",
    group: "penalization",
    etaHat: 0.003125,
  },
  {
    ...BASELINE_VARIANT,
    id: "eta-double",
    group: "penalization",
    etaHat: 0.0125,
  },
] as const;

const SMOKE_IDS = new Set([
  "baseline",
  "phase-xy-half",
  "mask-half-0p50",
  "eta-double",
]);

export function variantsForProfile(
  profile: "smoke" | "research",
): readonly FixedSensitivityVariant[] {
  if (profile === "research") return RESEARCH_VARIANTS;
  return RESEARCH_VARIANTS.filter((variant) => SMOKE_IDS.has(variant.id));
}

export function relativeDifference(
  first: number,
  second: number,
  floor = 1e-12,
): number {
  return Math.abs(first - second) / Math.max(Math.abs(first), Math.abs(second), floor);
}

export function metricsFromSummary(
  summary: CoefficientSummary & { strouhal: number },
): SensitivityMetrics {
  return {
    meanDrag: summary.meanDrag,
    liftRms: summary.liftRms,
    strouhal: summary.strouhal,
  };
}

export function maximumRelativeLoadDeviation(
  baseline: SensitivityMetrics,
  candidates: readonly SensitivityMetrics[],
): number {
  if (candidates.length === 0) return 0;
  return Math.max(...candidates.flatMap((candidate) => [
    relativeDifference(candidate.meanDrag, baseline.meanDrag),
    relativeDifference(candidate.liftRms, baseline.liftRms),
  ]));
}

export function maximumAbsoluteStrouhalShift(
  baseline: SensitivityMetrics,
  candidates: readonly SensitivityMetrics[],
): number {
  if (candidates.length === 0) return 0;
  return Math.max(...candidates.map((candidate) => (
    Math.abs(candidate.strouhal - baseline.strouhal)
  )));
}

export function diagnoseSensitivity(
  amplitudes: Readonly<Record<Exclude<SensitivityGroup, "baseline">, number>>,
  significantThreshold = SIGNIFICANT_LOAD_SENSITIVITY,
  dominanceRatio = DOMINANCE_RATIO,
): DiagnosedSensitivity {
  const ranked = (Object.entries(amplitudes) as Array<[
    Exclude<SensitivityGroup, "baseline">,
    number,
  ]>).sort((first, second) => second[1] - first[1]);
  const [largest, second] = ranked;
  if (largest === undefined || largest[1] < significantThreshold) return "insufficient";
  if (second !== undefined && largest[1] < dominanceRatio * second[1]) return "multi-factor";
  return largest[0];
}

export function literatureErrorScore(
  errors: { meanDragError: number; liftRmsError: number; strouhalError: number },
  tolerances: { meanDrag: number; liftRms: number; strouhal: number },
): number {
  return errors.meanDragError / tolerances.meanDrag
    + errors.liftRmsError / tolerances.liftRms
    + errors.strouhalError / tolerances.strouhal;
}
