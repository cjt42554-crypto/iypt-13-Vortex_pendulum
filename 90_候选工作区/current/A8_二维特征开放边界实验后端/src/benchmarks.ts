import { CS, CS2, type PrimitiveState } from "./d2q9.ts";
import { QUALIFICATION_CONTRACT } from "./contracts.ts";
import {
  CharacteristicOpenBoundarySolver,
  type CircleSolid,
  type FieldSnapshot,
  type OutletBoundary,
  type SolverInspection,
} from "./solver.ts";

export interface StabilityEnvelope {
  maximumDensityDeviation: number;
  maximumMach: number;
  minimumDensity: number;
  maximumDensity: number;
}

export interface BoundaryModeMetric {
  boundary: OutletBoundary;
  normalizedReferenceError: number;
  stability: StabilityEnvelope;
}

export interface AcousticPulseResult {
  format: "VP-A8-CBC2D-ACOUSTIC-PULSE-v1";
  settings: Record<string, number>;
  metrics: BoundaryModeMetric[];
  candidateGate: {
    absolutePass: boolean;
    improvementAgainstZouHe: number;
    improvementPass: boolean;
    stabilityPass: boolean;
    pass: boolean;
  };
}

export interface ConvectedVortexResult {
  format: "VP-A8-CBC2D-CONVECTED-VORTEX-v1";
  settings: Record<string, number>;
  metrics: BoundaryModeMetric[];
  candidateGate: {
    absolutePass: boolean;
    improvementAgainstZouHe: number;
    improvementPass: boolean;
    stabilityPass: boolean;
    pass: boolean;
  };
}

export interface CylinderBoundaryMetric {
  boundary: OutletBoundary;
  probeRmsReferenceError: number;
  fieldReferenceError: number;
  meanDragLate: number;
  liftRmsLate: number;
  stability: StabilityEnvelope;
}

export interface FixedCylinderStartupResult {
  format: "VP-A8-CBC2D-FIXED-CYLINDER-STARTUP-v1";
  settings: Record<string, number>;
  metrics: CylinderBoundaryMetric[];
  candidateGate: {
    probeRmsImprovementAgainstZouHe: number;
    probeImprovementPass: boolean;
    fieldErrorImprovementAgainstZouHe: number;
    fieldImprovementPass: boolean;
    stabilityPass: boolean;
    pass: boolean;
  };
}

export interface QualificationResult {
  format: "VP-A8-CBC2D-QUALIFICATION-v1";
  contract: typeof QUALIFICATION_CONTRACT;
  acousticPulse: AcousticPulseResult;
  convectedVortex: ConvectedVortexResult;
  fixedCylinderStartup: FixedCylinderStartupResult;
  decision: {
    code: string;
    pass: boolean;
    statement: string;
  };
}

const MODES: OutletBoundary[] = [
  "zou-he-pressure",
  "regularized-fixed-pressure",
  "cbc-2d-regularized",
];

function updateEnvelope(envelope: StabilityEnvelope, inspection: SolverInspection): void {
  envelope.maximumDensityDeviation = Math.max(
    envelope.maximumDensityDeviation,
    Math.abs(inspection.minimumDensity - 1),
    Math.abs(inspection.maximumDensity - 1),
  );
  envelope.maximumMach = Math.max(envelope.maximumMach, inspection.maximumMach);
  envelope.minimumDensity = Math.min(envelope.minimumDensity, inspection.minimumDensity);
  envelope.maximumDensity = Math.max(envelope.maximumDensity, inspection.maximumDensity);
}

function emptyEnvelope(): StabilityEnvelope {
  return {
    maximumDensityDeviation: 0,
    maximumMach: 0,
    minimumDensity: Number.POSITIVE_INFINITY,
    maximumDensity: Number.NEGATIVE_INFINITY,
  };
}

function stable(envelope: StabilityEnvelope): boolean {
  return envelope.maximumDensityDeviation
    <= QUALIFICATION_CONTRACT.numericalStability.maximumDensityDeviation
    && envelope.maximumMach <= QUALIFICATION_CONTRACT.numericalStability.maximumMach;
}

function runMonitored(
  solver: CharacteristicOpenBoundarySolver,
  steps: number,
  onStep?: (step: number, solver: CharacteristicOpenBoundarySolver, inspection: SolverInspection) => void,
): StabilityEnvelope {
  const envelope = emptyEnvelope();
  for (let step = 1; step <= steps; step += 1) {
    solver.step();
    if (step === 1 || step % 10 === 0 || step === steps || onStep !== undefined) {
      const inspection = solver.inspect();
      updateEnvelope(envelope, inspection);
      onStep?.(step, solver, inspection);
    }
  }
  return envelope;
}

function combinedSquaredError(
  subject: FieldSnapshot,
  reference: FieldSnapshot,
  subjectNx: number,
  referenceNx: number,
  ny: number,
  xStart: number,
  xEndExclusive: number,
  meanUx: number,
  solid?: CircleSolid,
): number {
  let error = 0;
  for (let y = 0; y < ny; y += 1) {
    for (let x = xStart; x < xEndExclusive; x += 1) {
      if (solid !== undefined) {
        const dx = x - solid.centerX;
        const dyRaw = Math.abs(y - solid.centerY);
        const dy = Math.min(dyRaw, ny - dyRaw);
        if (Math.hypot(dx, dy) <= solid.radius + 1) continue;
      }
      const subjectCell = x + subjectNx * y;
      const referenceCell = x + referenceNx * y;
      const densityError = (subject.rho[subjectCell] ?? 1) - (reference.rho[referenceCell] ?? 1);
      const uxError = (subject.ux[subjectCell] ?? meanUx) - (reference.ux[referenceCell] ?? meanUx);
      const uyError = (subject.uy[subjectCell] ?? 0) - (reference.uy[referenceCell] ?? 0);
      error += densityError * densityError
        + (uxError * uxError + uyError * uyError) / CS2;
    }
  }
  return error;
}

function findMetric<T extends { boundary: OutletBoundary }>(
  metrics: T[],
  boundary: OutletBoundary,
): T {
  const metric = metrics.find((candidate) => candidate.boundary === boundary);
  if (metric === undefined) throw new Error(`missing metric for ${boundary}`);
  return metric;
}

function relativeImprovement(candidate: number, baseline: number): number {
  if (baseline <= 0) return candidate <= baseline ? 1 : Number.NEGATIVE_INFINITY;
  return 1 - candidate / baseline;
}

export function runAcousticPulseBenchmark(): AcousticPulseResult {
  const nx = 180;
  const referenceNx = 360;
  const ny = 24;
  const steps = 330;
  const relaxationTime = 0.56;
  const inletVelocity = 0.04;
  const amplitude = 0.008;
  const centerX = 50;
  const sigma = 6;
  const xStart = 70;
  const initializer = (x: number): PrimitiveState => {
    const shape = Math.exp(-0.5 * ((x - centerX) / sigma) ** 2);
    const densityPerturbation = amplitude * shape;
    return {
      rho: 1 + densityPerturbation,
      ux: inletVelocity + CS * densityPerturbation,
      uy: 0,
    };
  };
  let initialNorm = 0;
  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      const state = initializer(x);
      const densityPerturbation = state.rho - 1;
      const velocityPerturbation = state.ux - inletVelocity;
      initialNorm += densityPerturbation * densityPerturbation
        + velocityPerturbation * velocityPerturbation / CS2;
    }
  }

  const reference = new CharacteristicOpenBoundarySolver({
    nx: referenceNx,
    ny,
    relaxationTime,
    inletVelocity,
    outletBoundary: "cbc-2d-regularized",
    pressureRelaxationSigma: 0.9,
    transverseRelaxation: Math.abs(inletVelocity) / CS,
    characteristicLength: referenceNx,
  });
  reference.initializeField((x) => initializer(x));
  runMonitored(reference, steps);
  const referenceSnapshot = reference.snapshot();

  const metrics: BoundaryModeMetric[] = [];
  for (const boundary of MODES) {
    const solver = new CharacteristicOpenBoundarySolver({
      nx,
      ny,
      relaxationTime,
      inletVelocity,
      outletBoundary: boundary,
      pressureRelaxationSigma: 0.9,
      transverseRelaxation: Math.abs(inletVelocity) / CS,
      characteristicLength: nx,
    });
    solver.initializeField((x) => initializer(x));
    const stability = runMonitored(solver, steps);
    const error = combinedSquaredError(
      solver.snapshot(),
      referenceSnapshot,
      nx,
      referenceNx,
      ny,
      xStart,
      nx,
      inletVelocity,
    );
    metrics.push({
      boundary,
      normalizedReferenceError: Math.sqrt(error / initialNorm),
      stability,
    });
  }

  const candidate = findMetric(metrics, "cbc-2d-regularized");
  const zouHe = findMetric(metrics, "zou-he-pressure");
  const improvementAgainstZouHe = relativeImprovement(
    candidate.normalizedReferenceError,
    zouHe.normalizedReferenceError,
  );
  const absolutePass = candidate.normalizedReferenceError
    <= QUALIFICATION_CONTRACT.acousticPulse.maximumNormalizedReferenceError;
  const improvementPass = improvementAgainstZouHe
    >= QUALIFICATION_CONTRACT.acousticPulse.minimumImprovementAgainstZouHe;
  const stabilityPass = stable(candidate.stability);
  return {
    format: "VP-A8-CBC2D-ACOUSTIC-PULSE-v1",
    settings: {
      nx,
      referenceNx,
      ny,
      steps,
      relaxationTime,
      inletVelocity,
      amplitude,
      centerX,
      sigma,
      xStart,
    },
    metrics,
    candidateGate: {
      absolutePass,
      improvementAgainstZouHe,
      improvementPass,
      stabilityPass,
      pass: absolutePass && improvementPass && stabilityPass,
    },
  };
}

export function runConvectedVortexBenchmark(): ConvectedVortexResult {
  const nx = 100;
  const referenceNx = 190;
  const ny = 48;
  const steps = 850;
  const relaxationTime = 0.56;
  const inletVelocity = 0.10;
  const amplitude = 0.024;
  const centerX = 28;
  const centerY = ny / 2;
  const radius = 6;
  const xStart = 12;
  const initializer = (x: number, y: number): PrimitiveState => {
    const dx = x - centerX;
    const dyRaw = y - centerY;
    const dy = Math.abs(dyRaw) <= ny / 2
      ? dyRaw
      : dyRaw > 0 ? dyRaw - ny : dyRaw + ny;
    const radius2 = dx * dx + dy * dy;
    const shape = Math.exp(-0.5 * radius2 / (radius * radius));
    const swirlX = -amplitude * (dy / radius) * shape;
    const swirlY = amplitude * (dx / radius) * shape;
    const densityCorrection = -0.5 * amplitude * amplitude * Math.exp(
      -radius2 / (radius * radius),
    ) / CS2;
    return {
      rho: 1 + densityCorrection,
      ux: inletVelocity + swirlX,
      uy: swirlY,
    };
  };
  let initialNorm = 0;
  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      const state = initializer(x, y);
      const densityPerturbation = state.rho - 1;
      const du = state.ux - inletVelocity;
      initialNorm += densityPerturbation * densityPerturbation
        + (du * du + state.uy * state.uy) / CS2;
    }
  }

  const reference = new CharacteristicOpenBoundarySolver({
    nx: referenceNx,
    ny,
    relaxationTime,
    inletVelocity,
    outletBoundary: "cbc-2d-regularized",
    pressureRelaxationSigma: 0.9,
    transverseRelaxation: Math.abs(inletVelocity) / CS,
    characteristicLength: radius,
  });
  reference.initializeField(initializer);
  runMonitored(reference, steps);
  const referenceSnapshot = reference.snapshot();

  const metrics: BoundaryModeMetric[] = [];
  for (const boundary of MODES) {
    const solver = new CharacteristicOpenBoundarySolver({
      nx,
      ny,
      relaxationTime,
      inletVelocity,
      outletBoundary: boundary,
      pressureRelaxationSigma: 0.9,
      transverseRelaxation: Math.abs(inletVelocity) / CS,
      characteristicLength: radius,
    });
    solver.initializeField(initializer);
    const stability = runMonitored(solver, steps);
    const error = combinedSquaredError(
      solver.snapshot(),
      referenceSnapshot,
      nx,
      referenceNx,
      ny,
      xStart,
      nx,
      inletVelocity,
    );
    metrics.push({
      boundary,
      normalizedReferenceError: Math.sqrt(error / initialNorm),
      stability,
    });
  }

  const candidate = findMetric(metrics, "cbc-2d-regularized");
  const zouHe = findMetric(metrics, "zou-he-pressure");
  const improvementAgainstZouHe = relativeImprovement(
    candidate.normalizedReferenceError,
    zouHe.normalizedReferenceError,
  );
  const absolutePass = candidate.normalizedReferenceError
    <= QUALIFICATION_CONTRACT.convectedVortex.maximumNormalizedReferenceError;
  const improvementPass = improvementAgainstZouHe
    >= QUALIFICATION_CONTRACT.convectedVortex.minimumImprovementAgainstZouHe;
  const stabilityPass = stable(candidate.stability);
  return {
    format: "VP-A8-CBC2D-CONVECTED-VORTEX-v1",
    settings: {
      nx,
      referenceNx,
      ny,
      steps,
      relaxationTime,
      inletVelocity,
      amplitude,
      centerX,
      centerY,
      radius,
      xStart,
    },
    metrics,
    candidateGate: {
      absolutePass,
      improvementAgainstZouHe,
      improvementPass,
      stabilityPass,
      pass: absolutePass && improvementPass && stabilityPass,
    },
  };
}

interface CylinderTrace {
  probeDensity: number[];
  forceX: number[];
  forceY: number[];
  snapshot: FieldSnapshot;
  stability: StabilityEnvelope;
}

function runCylinderTrace(
  nx: number,
  ny: number,
  steps: number,
  relaxationTime: number,
  inletVelocity: number,
  solid: CircleSolid,
  boundary: OutletBoundary,
  probeX: number,
  probeY: number,
): CylinderTrace {
  const solver = new CharacteristicOpenBoundarySolver({
    nx,
    ny,
    relaxationTime,
    inletVelocity,
    outletBoundary: boundary,
    pressureRelaxationSigma: 0.9,
    transverseRelaxation: Math.abs(inletVelocity) / CS,
    characteristicLength: nx,
    solid,
  });
  const probeDensity: number[] = [];
  const forceX: number[] = [];
  const forceY: number[] = [];
  const stability = runMonitored(solver, steps, (_step, activeSolver, inspection) => {
    probeDensity.push(activeSolver.sampleDensity(probeX, probeY));
    forceX.push(inspection.forceX);
    forceY.push(inspection.forceY);
  });
  return {
    probeDensity,
    forceX,
    forceY,
    snapshot: solver.snapshot(),
    stability,
  };
}

function rms(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value * value;
  return Math.sqrt(sum / values.length);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

export function runFixedCylinderStartupBenchmark(): FixedCylinderStartupResult {
  const nx = 160;
  const referenceNx = 300;
  const ny = 56;
  const steps = 520;
  const lateStart = 340;
  const relaxationTime = 0.56;
  const inletVelocity = 0.06;
  const solid: CircleSolid = {
    centerX: 42,
    centerY: ny / 2,
    radius: 6,
  };
  const probeX = 75;
  const probeY = ny / 2;
  const fieldXStart = 55;
  const fieldXEnd = 150;
  const reference = runCylinderTrace(
    referenceNx,
    ny,
    steps,
    relaxationTime,
    inletVelocity,
    solid,
    "cbc-2d-regularized",
    probeX,
    probeY,
  );

  const metrics: CylinderBoundaryMetric[] = [];
  for (const boundary of MODES) {
    const trace = runCylinderTrace(
      nx,
      ny,
      steps,
      relaxationTime,
      inletVelocity,
      solid,
      boundary,
      probeX,
      probeY,
    );
    const probeErrors: number[] = [];
    for (let step = lateStart; step < steps; step += 1) {
      probeErrors.push(
        (trace.probeDensity[step] ?? 1) - (reference.probeDensity[step] ?? 1),
      );
    }
    const fieldError = Math.sqrt(combinedSquaredError(
      trace.snapshot,
      reference.snapshot,
      nx,
      referenceNx,
      ny,
      fieldXStart,
      fieldXEnd,
      inletVelocity,
      solid,
    ) / ((fieldXEnd - fieldXStart) * ny));
    const lateForceX = trace.forceX.slice(lateStart);
    const lateForceY = trace.forceY.slice(lateStart);
    const forceYMean = mean(lateForceY);
    metrics.push({
      boundary,
      probeRmsReferenceError: rms(probeErrors),
      fieldReferenceError: fieldError,
      meanDragLate: mean(lateForceX),
      liftRmsLate: rms(lateForceY.map((value) => value - forceYMean)),
      stability: trace.stability,
    });
  }

  const candidate = findMetric(metrics, "cbc-2d-regularized");
  const zouHe = findMetric(metrics, "zou-he-pressure");
  const probeRmsImprovementAgainstZouHe = relativeImprovement(
    candidate.probeRmsReferenceError,
    zouHe.probeRmsReferenceError,
  );
  const fieldErrorImprovementAgainstZouHe = relativeImprovement(
    candidate.fieldReferenceError,
    zouHe.fieldReferenceError,
  );
  const probeImprovementPass = probeRmsImprovementAgainstZouHe
    >= QUALIFICATION_CONTRACT.fixedCylinderStartup
      .minimumProbeRmsImprovementAgainstZouHe;
  const fieldImprovementPass = fieldErrorImprovementAgainstZouHe
    >= QUALIFICATION_CONTRACT.fixedCylinderStartup
      .minimumFieldErrorImprovementAgainstZouHe;
  const stabilityPass = stable(candidate.stability);
  return {
    format: "VP-A8-CBC2D-FIXED-CYLINDER-STARTUP-v1",
    settings: {
      nx,
      referenceNx,
      ny,
      steps,
      lateStart,
      relaxationTime,
      inletVelocity,
      cylinderCenterX: solid.centerX,
      cylinderCenterY: solid.centerY,
      cylinderRadius: solid.radius,
      probeX,
      probeY,
      fieldXStart,
      fieldXEnd,
    },
    metrics,
    candidateGate: {
      probeRmsImprovementAgainstZouHe,
      probeImprovementPass,
      fieldErrorImprovementAgainstZouHe,
      fieldImprovementPass,
      stabilityPass,
      pass: probeImprovementPass && fieldImprovementPass && stabilityPass,
    },
  };
}

export function runQualification(): QualificationResult {
  const acousticPulse = runAcousticPulseBenchmark();
  const convectedVortex = runConvectedVortexBenchmark();
  const fixedCylinderStartup = runFixedCylinderStartupBenchmark();
  const pass = acousticPulse.candidateGate.pass
    && convectedVortex.candidateGate.pass
    && fixedCylinderStartup.candidateGate.pass;
  return {
    format: "VP-A8-CBC2D-QUALIFICATION-v1",
    contract: QUALIFICATION_CONTRACT,
    acousticPulse,
    convectedVortex,
    fixedCylinderStartup,
    decision: {
      code: pass
        ? "PASS-A8B-CBC2D-BOUNDARY-QUALIFICATION-CANDIDATE-ONLY"
        : "NO-GO-A8B-CBC2D-BOUNDARY-QUALIFICATION-FAILED",
      pass,
      statement: pass
        ? "三项候选区边界资格门通过；只允许继续做正式接入前的独立审计，不构成来源边界等价、A8 公开基准通过或正式程序授权。"
        : "至少一项候选区边界资格门失败；不得接入正式求解器，不构成来源边界等价或 A8 公开基准通过。",
    },
  };
}
