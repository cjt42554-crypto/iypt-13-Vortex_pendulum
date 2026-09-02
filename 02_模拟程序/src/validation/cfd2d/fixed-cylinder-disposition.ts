import { FIXED_TARGET, REYNOLDS } from "./benchmark-contract";
import { relativeDifference } from "./benchmark-metrics";

export const A8S_DISPOSITION_CONTRACT_ID =
  "VP-CFD2D-A8S-FIXED-CYLINDER-DISPOSITION-v1";

export const SINE_ZERO_DISPLACEMENT_HALF_WIDTH_OVER_PENALTY_LAYER =
  2.949029420641545;

export const FIXED_CYLINDER_DISPOSITION_LIMITS = Object.freeze({
  reynoldsNumber: REYNOLDS,
  penalizationTimeSteps: 1,
  totalConvectiveTime: 80,
  discardConvectiveTime: 40,
  maximumDensityDeviation: 0.08,
  maximumSampledMach: 0.30,
  maximumMeanDragHalfDrift: 0.05,
  maximumLiftRmsHalfDrift: 0.10,
  maximumGridRelativeDifference: 0.05,
  maximumSensitivityRelativeDifference: 0.05,
  maximumStrouhalDifference: 0.01,
});

export type FixedCylinderCaseRole =
  | "primary-grid"
  | "domain-sensitivity"
  | "mach-sensitivity"
  | "lattice-phase-sensitivity"
  | "legacy-mask-attribution";

export type FixedCylinderMaskModel =
  | "zero-displacement-compact-sine"
  | "legacy-half-cell-compact-sine";

export interface FixedCylinderCaseInput {
  readonly id: string;
  readonly role: FixedCylinderCaseRole;
  readonly diameterCells: 16 | 24 | 36;
  readonly latticeVelocity: 0.03 | 0.05;
  readonly upstreamDiameters: number;
  readonly downstreamDiameters: number;
  readonly widthDiameters: number;
  readonly bodyPhaseOffsetYCells: number;
  readonly maskModel: FixedCylinderMaskModel;
}

export interface FixedCylinderCaseDefinition extends FixedCylinderCaseInput {
  readonly kinematicViscosity: number;
  readonly relaxationTime: number;
  readonly penaltyLayerCells: number;
  readonly maskHalfThicknessCells: number;
  readonly maskHalfThicknessOverPenaltyLayer: number;
  readonly nx: number;
  readonly ny: number;
  readonly bodyCenterX: number;
  readonly bodyCenterY: number;
  readonly bodyRadius: number;
  readonly totalSteps: number;
  readonly discardSteps: number;
  readonly analysisSamples: number;
}

export interface FixedCylinderDispositionCaseEvidence {
  readonly format: "VP-A8S-FIXED-CYLINDER-DISPOSITION-CASE-v1";
  readonly definition: FixedCylinderCaseDefinition;
  readonly metrics: {
    readonly meanDrag: number;
    readonly liftFluctuationRms: number;
    readonly strouhal: number;
  };
  readonly literature: { readonly passed: boolean };
  readonly execution: { readonly finite: boolean; readonly stabilityPassed: boolean };
}

export interface FixedCylinderDispositionAssessment {
  readonly contractId: typeof A8S_DISPOSITION_CONTRACT_ID;
  readonly caseIds: readonly string[];
  readonly primaryGrid: {
    readonly diameters: readonly [16, 24, 36];
    readonly meanDragIncrements: readonly [number, number];
    readonly liftRmsIncrements: readonly [number, number];
    readonly strouhalIncrements: readonly [number, number];
    readonly shrinkingMeanDragIncrement: boolean;
    readonly shrinkingLiftRmsIncrement: boolean;
    readonly mediumFineMeanDragRelativeDifference: number;
    readonly mediumFineLiftRmsRelativeDifference: number;
    readonly mediumFineStrouhalAbsoluteDifference: number;
    readonly passed: boolean;
  };
  readonly sensitivitiesAtD16: Readonly<Record<
    "domain" | "mach" | "latticePhase",
    {
      readonly meanDragRelativeDifference: number;
      readonly liftRmsRelativeDifference: number;
      readonly strouhalAbsoluteDifference: number;
      readonly passed: boolean;
    }
  >>;
  readonly allCasesStable: boolean;
  readonly fineGridLiteraturePassed: boolean;
  readonly conclusion:
    | "RETAIN-A8S-2D-CFD-AUXILIARY-QUANTITATIVE-CANDIDATE"
    | "FREEZE-A8S-2D-CFD-QUALITATIVE-ONLY";
}

const BASE_PHASE = 0.17320508075688773;

export const FIXED_CYLINDER_DISPOSITION_CASES: readonly FixedCylinderCaseInput[] =
  Object.freeze([
    ...([16, 24, 36] as const).map((diameterCells) => Object.freeze({
      id: `a8s-primary-d${diameterCells}`,
      role: "primary-grid" as const,
      diameterCells,
      latticeVelocity: 0.05 as const,
      upstreamDiameters: 14,
      downstreamDiameters: 25,
      widthDiameters: 20,
      bodyPhaseOffsetYCells: BASE_PHASE,
      maskModel: "zero-displacement-compact-sine" as const,
    })),
    Object.freeze({
      id: "a8s-domain-d16",
      role: "domain-sensitivity" as const,
      diameterCells: 16 as const,
      latticeVelocity: 0.05 as const,
      upstreamDiameters: 20,
      downstreamDiameters: 40,
      widthDiameters: 40,
      bodyPhaseOffsetYCells: BASE_PHASE,
      maskModel: "zero-displacement-compact-sine" as const,
    }),
    Object.freeze({
      id: "a8s-mach-d16",
      role: "mach-sensitivity" as const,
      diameterCells: 16 as const,
      latticeVelocity: 0.03 as const,
      upstreamDiameters: 14,
      downstreamDiameters: 25,
      widthDiameters: 20,
      bodyPhaseOffsetYCells: BASE_PHASE,
      maskModel: "zero-displacement-compact-sine" as const,
    }),
    Object.freeze({
      id: "a8s-phase-d16",
      role: "lattice-phase-sensitivity" as const,
      diameterCells: 16 as const,
      latticeVelocity: 0.05 as const,
      upstreamDiameters: 14,
      downstreamDiameters: 25,
      widthDiameters: 20,
      bodyPhaseOffsetYCells: BASE_PHASE - 0.5,
      maskModel: "zero-displacement-compact-sine" as const,
    }),
    Object.freeze({
      id: "a8s-legacy-mask-d16",
      role: "legacy-mask-attribution" as const,
      diameterCells: 16 as const,
      latticeVelocity: 0.05 as const,
      upstreamDiameters: 14,
      downstreamDiameters: 25,
      widthDiameters: 20,
      bodyPhaseOffsetYCells: BASE_PHASE,
      maskModel: "legacy-half-cell-compact-sine" as const,
    }),
  ]);

function compactSineMask(z: number): number {
  if (z <= -1) return 1;
  if (z >= 1) return 0;
  return 0.5 * (1 - Math.sin(Math.PI * z / 2));
}

export function sineMaskShiftInPenaltyLayerUnits(
  halfWidthOverPenaltyLayer: number,
  integrationSteps = 20_000,
): number {
  if (!(halfWidthOverPenaltyLayer > 0)
    || !Number.isInteger(integrationSteps)
    || integrationSteps < 100) {
    throw new RangeError("invalid compact-sine displacement calculation");
  }
  const delta = halfWidthOverPenaltyLayer;
  const dz = 2 / integrationSteps;
  let z = -1;
  let riccati = delta;
  const derivative = (position: number, value: number): number =>
    delta ** 2 * compactSineMask(position) - value ** 2;
  for (let index = 0; index < integrationSteps; index += 1) {
    const k1 = derivative(z, riccati);
    const k2 = derivative(z + 0.5 * dz, riccati + 0.5 * dz * k1);
    const k3 = derivative(z + 0.5 * dz, riccati + 0.5 * dz * k2);
    const k4 = derivative(z + dz, riccati + dz * k3);
    riccati += dz * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
    z += dz;
  }
  return (1 / riccati - 1) * delta;
}

export function buildFixedCylinderCaseDefinition(
  input: FixedCylinderCaseInput,
): FixedCylinderCaseDefinition {
  const limits = FIXED_CYLINDER_DISPOSITION_LIMITS;
  const kinematicViscosity = input.latticeVelocity
    * input.diameterCells / limits.reynoldsNumber;
  const penaltyLayerCells = Math.sqrt(
    kinematicViscosity * limits.penalizationTimeSteps,
  );
  const maskHalfThicknessCells = input.maskModel === "zero-displacement-compact-sine"
    ? SINE_ZERO_DISPLACEMENT_HALF_WIDTH_OVER_PENALTY_LAYER * penaltyLayerCells
    : 0.5;
  const totalSteps = Math.round(
    limits.totalConvectiveTime * input.diameterCells / input.latticeVelocity,
  );
  const discardSteps = Math.round(
    limits.discardConvectiveTime * input.diameterCells / input.latticeVelocity,
  );
  const nx = Math.round(
    (input.upstreamDiameters + input.downstreamDiameters) * input.diameterCells,
  );
  const ny = Math.round(input.widthDiameters * input.diameterCells);
  return {
    ...input,
    kinematicViscosity,
    relaxationTime: 0.5 + 3 * kinematicViscosity,
    penaltyLayerCells,
    maskHalfThicknessCells,
    maskHalfThicknessOverPenaltyLayer: maskHalfThicknessCells / penaltyLayerCells,
    nx,
    ny,
    bodyCenterX: input.upstreamDiameters * input.diameterCells,
    bodyCenterY: 0.5 * (ny - 1) + input.bodyPhaseOffsetYCells,
    bodyRadius: 0.5 * input.diameterCells,
    totalSteps,
    discardSteps,
    analysisSamples: totalSteps - discardSteps,
  };
}

function requiredCase(
  cases: readonly FixedCylinderDispositionCaseEvidence[],
  id: string,
): FixedCylinderDispositionCaseEvidence {
  const matches = cases.filter((candidate) => candidate.definition.id === id);
  if (matches.length !== 1) throw new Error(`expected exactly one A8S case ${id}`);
  const result = matches[0];
  if (result === undefined
    || result.format !== "VP-A8S-FIXED-CYLINDER-DISPOSITION-CASE-v1") {
    throw new Error(`invalid A8S case ${id}`);
  }
  for (const value of [
    result.metrics.meanDrag,
    result.metrics.liftFluctuationRms,
    result.metrics.strouhal,
  ]) {
    if (!Number.isFinite(value)) throw new Error(`non-finite A8S metric in ${id}`);
  }
  return result;
}

function sensitivity(
  baseline: FixedCylinderDispositionCaseEvidence,
  candidate: FixedCylinderDispositionCaseEvidence,
) {
  const meanDragRelativeDifference = relativeDifference(
    baseline.metrics.meanDrag,
    candidate.metrics.meanDrag,
  );
  const liftRmsRelativeDifference = relativeDifference(
    baseline.metrics.liftFluctuationRms,
    candidate.metrics.liftFluctuationRms,
  );
  const strouhalAbsoluteDifference = Math.abs(
    baseline.metrics.strouhal - candidate.metrics.strouhal,
  );
  return {
    meanDragRelativeDifference,
    liftRmsRelativeDifference,
    strouhalAbsoluteDifference,
    passed: meanDragRelativeDifference
        <= FIXED_CYLINDER_DISPOSITION_LIMITS.maximumSensitivityRelativeDifference
      && liftRmsRelativeDifference
        <= FIXED_CYLINDER_DISPOSITION_LIMITS.maximumSensitivityRelativeDifference
      && strouhalAbsoluteDifference
        <= FIXED_CYLINDER_DISPOSITION_LIMITS.maximumStrouhalDifference,
  };
}

/** Evaluate frozen case evidence; this function never launches a CFD run. */
export function assessFixedCylinderDisposition(
  cases: readonly FixedCylinderDispositionCaseEvidence[],
): FixedCylinderDispositionAssessment {
  if (cases.length !== FIXED_CYLINDER_DISPOSITION_CASES.length) {
    throw new Error("A8S disposition requires the exact seven-case matrix");
  }
  const p16 = requiredCase(cases, "a8s-primary-d16");
  const p24 = requiredCase(cases, "a8s-primary-d24");
  const p36 = requiredCase(cases, "a8s-primary-d36");
  const meanDragIncrements: [number, number] = [
    Math.abs(p24.metrics.meanDrag - p16.metrics.meanDrag),
    Math.abs(p36.metrics.meanDrag - p24.metrics.meanDrag),
  ];
  const liftRmsIncrements: [number, number] = [
    Math.abs(p24.metrics.liftFluctuationRms - p16.metrics.liftFluctuationRms),
    Math.abs(p36.metrics.liftFluctuationRms - p24.metrics.liftFluctuationRms),
  ];
  const strouhalIncrements: [number, number] = [
    Math.abs(p24.metrics.strouhal - p16.metrics.strouhal),
    Math.abs(p36.metrics.strouhal - p24.metrics.strouhal),
  ];
  const mediumFineMeanDragRelativeDifference = relativeDifference(
    p24.metrics.meanDrag,
    p36.metrics.meanDrag,
  );
  const mediumFineLiftRmsRelativeDifference = relativeDifference(
    p24.metrics.liftFluctuationRms,
    p36.metrics.liftFluctuationRms,
  );
  const mediumFineStrouhalAbsoluteDifference = Math.abs(
    p24.metrics.strouhal - p36.metrics.strouhal,
  );
  const shrinkingMeanDragIncrement = meanDragIncrements[1] < meanDragIncrements[0];
  const shrinkingLiftRmsIncrement = liftRmsIncrements[1] < liftRmsIncrements[0];
  const primaryPassed = shrinkingMeanDragIncrement
    && shrinkingLiftRmsIncrement
    && mediumFineMeanDragRelativeDifference
      <= FIXED_CYLINDER_DISPOSITION_LIMITS.maximumGridRelativeDifference
    && mediumFineLiftRmsRelativeDifference
      <= FIXED_CYLINDER_DISPOSITION_LIMITS.maximumGridRelativeDifference
    && mediumFineStrouhalAbsoluteDifference
      <= FIXED_CYLINDER_DISPOSITION_LIMITS.maximumStrouhalDifference;
  const sensitivitiesAtD16 = {
    domain: sensitivity(p16, requiredCase(cases, "a8s-domain-d16")),
    mach: sensitivity(p16, requiredCase(cases, "a8s-mach-d16")),
    latticePhase: sensitivity(p16, requiredCase(cases, "a8s-phase-d16")),
  };
  requiredCase(cases, "a8s-legacy-mask-d16");
  const allCasesStable = cases.every((item) =>
    item.execution.finite && item.execution.stabilityPassed);
  const allSensitivityPassed = Object.values(sensitivitiesAtD16)
    .every((item) => item.passed);
  const fineGridLiteraturePassed = p36.literature.passed;
  const retain = allCasesStable
    && primaryPassed
    && allSensitivityPassed
    && fineGridLiteraturePassed;
  return Object.freeze({
    contractId: A8S_DISPOSITION_CONTRACT_ID,
    caseIds: Object.freeze(cases.map((item) => item.definition.id).sort()),
    primaryGrid: Object.freeze({
      diameters: [16, 24, 36] as const,
      meanDragIncrements,
      liftRmsIncrements,
      strouhalIncrements,
      shrinkingMeanDragIncrement,
      shrinkingLiftRmsIncrement,
      mediumFineMeanDragRelativeDifference,
      mediumFineLiftRmsRelativeDifference,
      mediumFineStrouhalAbsoluteDifference,
      passed: primaryPassed,
    }),
    sensitivitiesAtD16: Object.freeze(sensitivitiesAtD16),
    allCasesStable,
    fineGridLiteraturePassed,
    conclusion: retain
      ? "RETAIN-A8S-2D-CFD-AUXILIARY-QUANTITATIVE-CANDIDATE"
      : "FREEZE-A8S-2D-CFD-QUALITATIVE-ONLY",
  });
}
