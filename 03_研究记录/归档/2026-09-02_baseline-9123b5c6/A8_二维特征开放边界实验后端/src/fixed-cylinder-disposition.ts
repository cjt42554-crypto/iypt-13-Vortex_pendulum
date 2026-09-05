import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED,
  type LbmBodyKinematics,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import {
  FIXED_TARGET,
  REYNOLDS,
} from "../../A8_公开规定横移圆柱基准/src/benchmark-contract.ts";
import {
  dominantStrouhal,
  relativeDifference,
  summarizeCoefficients,
  type CoefficientSummary,
} from "../../A8_公开规定横移圆柱基准/src/benchmark-metrics.ts";

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
  inspectionStrideSteps: 200,
  storedTraceStrideSteps: 4,
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
  id: string;
  role: FixedCylinderCaseRole;
  diameterCells: 16 | 24 | 36;
  latticeVelocity: 0.03 | 0.05;
  upstreamDiameters: number;
  downstreamDiameters: number;
  widthDiameters: number;
  bodyPhaseOffsetYCells: number;
  maskModel: FixedCylinderMaskModel;
}

export interface FixedCylinderCaseDefinition extends FixedCylinderCaseInput {
  kinematicViscosity: number;
  relaxationTime: number;
  penaltyLayerCells: number;
  maskHalfThicknessCells: number;
  maskHalfThicknessOverPenaltyLayer: number;
  nx: number;
  ny: number;
  bodyCenterX: number;
  bodyCenterY: number;
  bodyRadius: number;
  totalSteps: number;
  discardSteps: number;
  analysisSamples: number;
}

export interface FixedCylinderStoredSample {
  step: number;
  convectiveTime: number;
  drag: number;
  lift: number;
}

export interface FixedCylinderCaseResult {
  format: "VP-A8S-FIXED-CYLINDER-DISPOSITION-CASE-v1";
  definition: FixedCylinderCaseDefinition;
  completedSteps: number;
  coefficientScale: number;
  forceDefinition: "native-stationary-Brinkman-reaction";
  metrics: CoefficientSummary & {
    strouhal: number;
    spectralLiftAmplitude: number;
  };
  firstHalf: CoefficientSummary;
  secondHalf: CoefficientSummary;
  maturity: {
    meanDragHalfDrift: number;
    liftRmsHalfDrift: number;
    passed: boolean;
  };
  sampledExtrema: {
    inspections: number;
    minimumDensity: number;
    maximumDensity: number;
    maximumDensityDeviation: number;
    maximumSpeed: number;
    maximumMach: number;
  };
  literature: {
    target: typeof FIXED_TARGET;
    meanDragAbsoluteError: number;
    liftRmsAbsoluteError: number;
    strouhalAbsoluteError: number;
    meanDragPassed: boolean;
    liftRmsPassed: boolean;
    strouhalPassed: boolean;
    passed: boolean;
  };
  execution: {
    elapsedSeconds: number;
    finite: boolean;
    stabilityPassed: boolean;
  };
  storedTraceStrideSteps: number;
  storedTrace: FixedCylinderStoredSample[];
}

export interface FixedCylinderDisposition {
  format: "VP-A8S-FIXED-CYLINDER-DISPOSITION-v1";
  cases: FixedCylinderCaseResult[];
  primaryGrid: {
    diameters: [16, 24, 36];
    meanDragIncrements: [number, number];
    liftRmsIncrements: [number, number];
    strouhalIncrements: [number, number];
    shrinkingMeanDragIncrement: boolean;
    shrinkingLiftRmsIncrement: boolean;
    mediumFineMeanDragRelativeDifference: number;
    mediumFineLiftRmsRelativeDifference: number;
    mediumFineStrouhalAbsoluteDifference: number;
    passed: boolean;
  };
  sensitivitiesAtD16: Record<
    "domain" | "mach" | "latticePhase",
    {
      meanDragRelativeDifference: number;
      liftRmsRelativeDifference: number;
      strouhalAbsoluteDifference: number;
      passed: boolean;
    }
  >;
  legacyMaskAttribution: {
    meanDragChangeFromLegacy: number;
    liftRmsChangeFromLegacy: number;
    strouhalChangeFromLegacy: number;
  };
  allCasesStable: boolean;
  fineGridLiteraturePassed: boolean;
  conclusion:
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
  if (!(halfWidthOverPenaltyLayer > 0) || !Number.isInteger(integrationSteps)
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
  const maskHalfThicknessCells = input.maskModel
    === "zero-displacement-compact-sine"
    ? SINE_ZERO_DISPLACEMENT_HALF_WIDTH_OVER_PENALTY_LAYER
      * penaltyLayerCells
    : 0.5;
  const totalSteps = Math.round(
    limits.totalConvectiveTime
      * input.diameterCells / input.latticeVelocity,
  );
  const discardSteps = Math.round(
    limits.discardConvectiveTime
      * input.diameterCells / input.latticeVelocity,
  );
  const nx = Math.round(
    (input.upstreamDiameters + input.downstreamDiameters)
      * input.diameterCells,
  );
  const ny = Math.round(input.widthDiameters * input.diameterCells);
  return {
    ...input,
    kinematicViscosity,
    relaxationTime: 0.5 + 3 * kinematicViscosity,
    penaltyLayerCells,
    maskHalfThicknessCells,
    maskHalfThicknessOverPenaltyLayer:
      maskHalfThicknessCells / penaltyLayerCells,
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

function compareLiterature(
  metrics: FixedCylinderCaseResult["metrics"],
): FixedCylinderCaseResult["literature"] {
  const meanDragAbsoluteError = Math.abs(metrics.meanDrag - FIXED_TARGET.meanDrag);
  const liftRmsAbsoluteError = Math.abs(
    metrics.liftFluctuationRms - FIXED_TARGET.liftRms,
  );
  const strouhalAbsoluteError = Math.abs(
    metrics.strouhal - FIXED_TARGET.strouhal,
  );
  const meanDragPassed = meanDragAbsoluteError <= FIXED_TARGET.tolerance.meanDrag;
  const liftRmsPassed = liftRmsAbsoluteError <= FIXED_TARGET.tolerance.liftRms;
  const strouhalPassed = strouhalAbsoluteError <= FIXED_TARGET.tolerance.strouhal;
  return {
    target: FIXED_TARGET,
    meanDragAbsoluteError,
    liftRmsAbsoluteError,
    strouhalAbsoluteError,
    meanDragPassed,
    liftRmsPassed,
    strouhalPassed,
    passed: meanDragPassed && liftRmsPassed && strouhalPassed,
  };
}

export function runFixedCylinderDispositionCase(
  input: FixedCylinderCaseInput,
  onProgress: ((completedSteps: number, totalSteps: number) => void) | null = null,
): FixedCylinderCaseResult {
  const definition = buildFixedCylinderCaseDefinition(input);
  const limits = FIXED_CYLINDER_DISPOSITION_LIMITS;
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: definition.nx,
    ny: definition.ny,
    relaxationTime: definition.relaxationTime,
    penalizationTimeSteps: limits.penalizationTimeSteps,
    outerBoundary: "open-periodic-crossflow",
    maskHalfThickness: definition.maskHalfThicknessCells,
  });
  const body: LbmBodyKinematics = {
    centerX: definition.bodyCenterX,
    centerY: definition.bodyCenterY,
    radius: definition.bodyRadius,
    velocityX: 0,
    velocityY: 0,
  };
  solver.initializeUniform(definition.latticeVelocity, 0);
  const coefficientScale = 0.5
    * definition.latticeVelocity ** 2
    * definition.diameterCells;
  const samples: Array<{ drag: number; lift: number }> = [];
  const storedTrace: FixedCylinderStoredSample[] = [];
  let inspections = 0;
  let minimumDensity = Number.POSITIVE_INFINITY;
  let maximumDensity = Number.NEGATIVE_INFINITY;
  let maximumSpeed = 0;
  const includeInspection = (): void => {
    const inspection = solver.inspect(body);
    inspections += 1;
    minimumDensity = Math.min(minimumDensity, inspection.minimumDensity);
    maximumDensity = Math.max(maximumDensity, inspection.maximumDensity);
    maximumSpeed = Math.max(maximumSpeed, inspection.maximumSpeed);
  };
  includeInspection();
  const progressStride = Math.max(1, Math.floor(definition.totalSteps / 20));
  const started = Date.now();
  for (let step = 1; step <= definition.totalSteps; step += 1) {
    const exchange = solver.step(body, definition.latticeVelocity);
    if (step > definition.discardSteps) {
      const drag = exchange.rawReactionImpulseX / coefficientScale;
      const lift = exchange.rawReactionImpulseY / coefficientScale;
      if (!Number.isFinite(drag) || !Number.isFinite(lift)) {
        throw new RangeError(`non-finite A8S load at step ${step}`);
      }
      samples.push({ drag, lift });
      if ((step - definition.discardSteps - 1)
        % limits.storedTraceStrideSteps === 0) {
        storedTrace.push({
          step,
          convectiveTime: step
            * definition.latticeVelocity / definition.diameterCells,
          drag,
          lift,
        });
      }
    }
    if (step % limits.inspectionStrideSteps === 0
      || step === definition.totalSteps) {
      includeInspection();
    }
    if (step % progressStride === 0 || step === definition.totalSteps) {
      onProgress?.(step, definition.totalSteps);
    }
  }
  const elapsedSeconds = (Date.now() - started) / 1000;
  if (samples.length !== definition.analysisSamples) {
    throw new Error("A8S analysis sample count mismatch");
  }
  const metricsBase = summarizeCoefficients(samples);
  const spectrum = dominantStrouhal(
    samples.map((sample) => sample.lift),
    definition.latticeVelocity / definition.diameterCells,
  );
  const metrics = {
    ...metricsBase,
    strouhal: spectrum.strouhal,
    spectralLiftAmplitude: spectrum.normalizedAmplitude,
  };
  const half = samples.length / 2;
  if (!Number.isInteger(half)) throw new Error("A8S analysis window is not even");
  const firstHalf = summarizeCoefficients(samples.slice(0, half));
  const secondHalf = summarizeCoefficients(samples.slice(half));
  const meanDragHalfDrift = relativeDifference(
    firstHalf.meanDrag,
    secondHalf.meanDrag,
  );
  const liftRmsHalfDrift = relativeDifference(
    firstHalf.liftFluctuationRms,
    secondHalf.liftFluctuationRms,
  );
  const maturityPassed = meanDragHalfDrift
      <= limits.maximumMeanDragHalfDrift
    && liftRmsHalfDrift <= limits.maximumLiftRmsHalfDrift;
  const maximumDensityDeviation = Math.max(
    Math.abs(minimumDensity - 1),
    Math.abs(maximumDensity - 1),
  );
  const maximumMach = maximumSpeed / LATTICE_SOUND_SPEED;
  const finite = [
    minimumDensity,
    maximumDensity,
    maximumDensityDeviation,
    maximumSpeed,
    maximumMach,
    metrics.meanDrag,
    metrics.liftFluctuationRms,
    metrics.strouhal,
  ].every(Number.isFinite);
  const stabilityPassed = finite
    && maximumDensityDeviation <= limits.maximumDensityDeviation
    && maximumMach <= limits.maximumSampledMach
    && maturityPassed;
  return {
    format: "VP-A8S-FIXED-CYLINDER-DISPOSITION-CASE-v1",
    definition,
    completedSteps: solver.stepNumber,
    coefficientScale,
    forceDefinition: "native-stationary-Brinkman-reaction",
    metrics,
    firstHalf,
    secondHalf,
    maturity: { meanDragHalfDrift, liftRmsHalfDrift, passed: maturityPassed },
    sampledExtrema: {
      inspections,
      minimumDensity,
      maximumDensity,
      maximumDensityDeviation,
      maximumSpeed,
      maximumMach,
    },
    literature: compareLiterature(metrics),
    execution: {
      elapsedSeconds,
      finite,
      stabilityPassed,
    },
    storedTraceStrideSteps: limits.storedTraceStrideSteps,
    storedTrace,
  };
}

function requiredCase(
  cases: readonly FixedCylinderCaseResult[],
  id: string,
): FixedCylinderCaseResult {
  const result = cases.find((candidate) => candidate.definition.id === id);
  if (result === undefined) throw new Error(`missing A8S case ${id}`);
  return result;
}

function sensitivity(
  baseline: FixedCylinderCaseResult,
  candidate: FixedCylinderCaseResult,
): FixedCylinderDisposition["sensitivitiesAtD16"]["domain"] {
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

export function assembleFixedCylinderDisposition(
  cases: readonly FixedCylinderCaseResult[],
): FixedCylinderDisposition {
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
  const shrinkingMeanDragIncrement = meanDragIncrements[1]
    < meanDragIncrements[0];
  const shrinkingLiftRmsIncrement = liftRmsIncrements[1]
    < liftRmsIncrements[0];
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
  const legacy = requiredCase(cases, "a8s-legacy-mask-d16");
  const allCasesStable = cases.every((item) => item.execution.stabilityPassed);
  const allSensitivityPassed = Object.values(sensitivitiesAtD16)
    .every((item) => item.passed);
  const fineGridLiteraturePassed = p36.literature.passed;
  const retain = allCasesStable
    && primaryPassed
    && allSensitivityPassed
    && fineGridLiteraturePassed;
  return {
    format: "VP-A8S-FIXED-CYLINDER-DISPOSITION-v1",
    cases: [...cases],
    primaryGrid: {
      diameters: [16, 24, 36],
      meanDragIncrements,
      liftRmsIncrements,
      strouhalIncrements,
      shrinkingMeanDragIncrement,
      shrinkingLiftRmsIncrement,
      mediumFineMeanDragRelativeDifference,
      mediumFineLiftRmsRelativeDifference,
      mediumFineStrouhalAbsoluteDifference,
      passed: primaryPassed,
    },
    sensitivitiesAtD16,
    legacyMaskAttribution: {
      meanDragChangeFromLegacy: p16.metrics.meanDrag - legacy.metrics.meanDrag,
      liftRmsChangeFromLegacy:
        p16.metrics.liftFluctuationRms - legacy.metrics.liftFluctuationRms,
      strouhalChangeFromLegacy:
        p16.metrics.strouhal - legacy.metrics.strouhal,
    },
    allCasesStable,
    fineGridLiteraturePassed,
    conclusion: retain
      ? "RETAIN-A8S-2D-CFD-AUXILIARY-QUANTITATIVE-CANDIDATE"
      : "FREEZE-A8S-2D-CFD-QUALITATIVE-ONLY",
  };
}
