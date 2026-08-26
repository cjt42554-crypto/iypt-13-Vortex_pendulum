import { CS, CS2 } from "./d2q9.ts";
import { ROBUSTNESS_CONTRACT } from "./robustness-contract.ts";
import {
  CharacteristicOpenBoundarySolver,
  type CircleSolid,
  type FieldSnapshot,
  type OutletBoundary,
  type SolverInspection,
} from "./solver.ts";

export interface RobustnessStabilityEnvelope {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumMach: number;
  maximumMachStep: number;
  minimumDensity: number;
  maximumDensity: number;
}

export interface RobustnessGeometry {
  nx: number;
  referenceNx: number;
  ny: number;
  steps: number;
  lateStart: number;
  cylinderCenterX: number;
  cylinderCenterY: number;
  cylinderRadius: number;
  probeX: number;
  probeY: number;
  fieldXStart: number;
  fieldXEnd: number;
  actualDownstreamOutletDistanceDiameters: number;
  actualReferenceDownstreamDistanceDiameters: number;
}

export interface RobustnessCaseDefinition {
  id: string;
  inletVelocity: number;
  meanMach: number;
  relaxationTime: number;
  viscosity: number;
  nominalCylinderDiameterCells: number;
  nominalReynoldsNumber: number;
  requestedDownstreamOutletDistanceDiameters: number;
  geometry: RobustnessGeometry;
}

interface TraceFailure {
  step: number;
  name: string;
  message: string;
}

interface CompletedTrace {
  status: "completed";
  completedSteps: number;
  probeDensity: number[];
  forceX: number[];
  forceY: number[];
  snapshot: FieldSnapshot;
  stability: RobustnessStabilityEnvelope;
}

interface FailedTrace {
  status: "failed";
  completedSteps: number;
  failure: TraceFailure;
  partialStability?: RobustnessStabilityEnvelope;
}

type CylinderTrace = CompletedTrace | FailedTrace;

export interface SerializedRun {
  boundary: OutletBoundary;
  nx: number;
  status: "completed" | "failed";
  completedSteps: number;
  stability?: RobustnessStabilityEnvelope;
  failure?: TraceFailure;
  probeRmsReferenceError?: number;
  fieldReferenceError?: number;
  meanDragLate?: number;
  liftRmsLate?: number;
}

export interface RobustnessCaseGate {
  referenceExecutionPass: boolean;
  zouHeExecutionPass: boolean;
  candidateExecutionPass: boolean;
  referenceStabilityPass: boolean;
  zouHeStabilityPass: boolean;
  candidateStabilityPass: boolean;
  probeRmsImprovementAgainstZouHe?: number;
  probeImprovementPass: boolean;
  fieldErrorImprovementAgainstZouHe?: number;
  fieldImprovementPass: boolean;
  failureReasons: string[];
  pass: boolean;
}

export interface RobustnessCaseResult {
  definition: RobustnessCaseDefinition;
  reference: SerializedRun;
  zouHe: SerializedRun;
  candidate: SerializedRun;
  gate: RobustnessCaseGate;
}

export interface RobustnessAxisLevelSummary {
  level: number;
  totalCases: number;
  passedCases: number;
  failedCases: number;
}

export interface RobustnessAxisSummaries {
  inletVelocityLattice: RobustnessAxisLevelSummary[];
  relaxationTime: RobustnessAxisLevelSummary[];
  downstreamOutletDistanceDiameters: RobustnessAxisLevelSummary[];
  nominalCylinderDiameterCells: RobustnessAxisLevelSummary[];
}

export interface ExtremumSummary {
  caseId: string;
  value: number;
}

export interface RobustnessSummary {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  referenceRuns: number;
  zouHeRuns: number;
  candidateRuns: number;
  totalSolverRuns: number;
  completedSolverRuns: number;
  referenceExecutionFailures: number;
  zouHeExecutionFailures: number;
  candidateExecutionFailures: number;
  referenceStabilityFailures: number;
  zouHeStabilityFailures: number;
  candidateStabilityFailures: number;
  probeImprovementFailures: number;
  fieldImprovementFailures: number;
  failureReasonCounts: Record<string, number>;
  worstCandidateDensityDeviation?: ExtremumSummary;
  worstCandidateMach?: ExtremumSummary;
  minimumProbeImprovement?: ExtremumSummary;
  minimumFieldImprovement?: ExtremumSummary;
}

export interface RobustnessResult {
  format: "VP-A8-CBC2D-ROBUSTNESS-MATRIX-v1";
  contract: typeof ROBUSTNESS_CONTRACT;
  matrixComplete: boolean;
  cases: RobustnessCaseResult[];
  axisSummaries: RobustnessAxisSummaries;
  summary: RobustnessSummary;
  decision: {
    code: string;
    pass: boolean;
    statement: string;
  };
}

export interface RobustnessProgress {
  completedCases: number;
  totalCases: number;
  caseId: string;
  pass: boolean;
}

const REFERENCE_BOUNDARY: OutletBoundary = "cbc-2d-regularized";
const BASELINE_BOUNDARY: OutletBoundary = "zou-he-pressure";
const CANDIDATE_BOUNDARY: OutletBoundary = "cbc-2d-regularized";

function roundedAtLeast(value: number, minimum: number): number {
  return Math.max(minimum, Math.round(value));
}

function scaledInteger(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

function caseId(
  diameter: number,
  inletVelocity: number,
  relaxationTime: number,
  downstreamDistance: number,
): string {
  return [
    `d${scaledInteger(diameter, 1, 2)}`,
    `u${scaledInteger(inletVelocity, 10_000, 4)}`,
    `t${scaledInteger(relaxationTime, 1_000, 4)}`,
    `l${scaledInteger(downstreamDistance, 100, 4)}`,
  ].join("-");
}

export function buildRobustnessGeometry(
  nominalCylinderDiameterCells: number,
  downstreamOutletDistanceDiameters: number,
): RobustnessGeometry {
  if (!Number.isInteger(nominalCylinderDiameterCells)
    || nominalCylinderDiameterCells < 4
    || nominalCylinderDiameterCells % 2 !== 0) {
    throw new RangeError("nominal cylinder diameter must be an even integer >= 4");
  }
  if (!(downstreamOutletDistanceDiameters > 0)
    || !Number.isFinite(downstreamOutletDistanceDiameters)) {
    throw new RangeError("downstream outlet distance must be finite and positive");
  }
  const diameter = nominalCylinderDiameterCells;
  const radius = diameter / 2;
  const centerX = roundedAtLeast(
    ROBUSTNESS_CONTRACT.geometry.inletToCylinderCenterDiameters * diameter,
    radius + 3,
  );
  const downstreamCells = roundedAtLeast(
    downstreamOutletDistanceDiameters * diameter,
    3,
  );
  const nx = centerX + radius + downstreamCells + 1;
  const referenceNx = roundedAtLeast(
    ROBUSTNESS_CONTRACT.geometry.referenceDomainLengthDiameters * diameter,
    nx + 3,
  );
  const ny = roundedAtLeast(
    ROBUSTNESS_CONTRACT.geometry.crossStreamSpanDiameters * diameter,
    diameter + 4,
  );
  const steps = roundedAtLeast(
    ROBUSTNESS_CONTRACT.geometry.stepsPerDiameter * diameter,
    1,
  );
  const lateStart = Math.min(
    steps - 1,
    roundedAtLeast(
      ROBUSTNESS_CONTRACT.geometry.lateWindowStartFraction * steps,
      0,
    ),
  );
  const probeX = roundedAtLeast(
    ROBUSTNESS_CONTRACT.geometry.probeXDiameters * diameter,
    centerX + radius + 2,
  );
  const fieldXStart = roundedAtLeast(
    ROBUSTNESS_CONTRACT.geometry.fieldXStartDiameters * diameter,
    centerX + radius + 2,
  );
  const outletBuffer = roundedAtLeast(
    ROBUSTNESS_CONTRACT.geometry.fieldOutletBufferDiameters * diameter,
    2,
  );
  const fieldXEnd = nx - outletBuffer;
  if (!(fieldXEnd > fieldXStart)) {
    throw new RangeError("field comparison interval is empty");
  }
  return {
    nx,
    referenceNx,
    ny,
    steps,
    lateStart,
    cylinderCenterX: centerX,
    cylinderCenterY: ny / 2,
    cylinderRadius: radius,
    probeX,
    probeY: ny / 2,
    fieldXStart,
    fieldXEnd,
    actualDownstreamOutletDistanceDiameters:
      (nx - 1 - centerX - radius) / diameter,
    actualReferenceDownstreamDistanceDiameters:
      (referenceNx - 1 - centerX - radius) / diameter,
  };
}

export function buildRobustnessCases(): RobustnessCaseDefinition[] {
  const definitions: RobustnessCaseDefinition[] = [];
  for (const diameter of ROBUSTNESS_CONTRACT.axes.nominalCylinderDiameterCells) {
    for (const inletVelocity of ROBUSTNESS_CONTRACT.axes.inletVelocityLattice) {
      for (const relaxationTime of ROBUSTNESS_CONTRACT.axes.relaxationTime) {
        const viscosity = CS2 * (relaxationTime - 0.5);
        const nominalReynoldsNumber = inletVelocity * diameter / viscosity;
        for (const downstreamDistance of
          ROBUSTNESS_CONTRACT.axes.downstreamOutletDistanceDiameters) {
          definitions.push({
            id: caseId(diameter, inletVelocity, relaxationTime, downstreamDistance),
            inletVelocity,
            meanMach: inletVelocity / CS,
            relaxationTime,
            viscosity,
            nominalCylinderDiameterCells: diameter,
            nominalReynoldsNumber,
            requestedDownstreamOutletDistanceDiameters: downstreamDistance,
            geometry: buildRobustnessGeometry(diameter, downstreamDistance),
          });
        }
      }
    }
  }
  return definitions;
}

function emptyEnvelope(): RobustnessStabilityEnvelope {
  return {
    maximumDensityDeviation: 0,
    maximumDensityDeviationStep: 0,
    maximumMach: 0,
    maximumMachStep: 0,
    minimumDensity: Number.POSITIVE_INFINITY,
    maximumDensity: Number.NEGATIVE_INFINITY,
  };
}

function updateEnvelope(
  envelope: RobustnessStabilityEnvelope,
  inspection: SolverInspection,
): void {
  const densityDeviation = Math.max(
    Math.abs(inspection.minimumDensity - 1),
    Math.abs(inspection.maximumDensity - 1),
  );
  if (densityDeviation > envelope.maximumDensityDeviation) {
    envelope.maximumDensityDeviation = densityDeviation;
    envelope.maximumDensityDeviationStep = inspection.step;
  }
  if (inspection.maximumMach > envelope.maximumMach) {
    envelope.maximumMach = inspection.maximumMach;
    envelope.maximumMachStep = inspection.step;
  }
  envelope.minimumDensity = Math.min(envelope.minimumDensity, inspection.minimumDensity);
  envelope.maximumDensity = Math.max(envelope.maximumDensity, inspection.maximumDensity);
}

function stable(envelope: RobustnessStabilityEnvelope): boolean {
  return envelope.maximumDensityDeviation
    <= ROBUSTNESS_CONTRACT.gates.maximumDensityDeviation
    && envelope.maximumMach <= ROBUSTNESS_CONTRACT.gates.maximumMach;
}

function errorIdentity(error: unknown): { name: string; message: string } {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: "UnknownError", message: String(error) };
}

function runCylinderTrace(
  definition: RobustnessCaseDefinition,
  boundary: OutletBoundary,
  nx: number,
): CylinderTrace {
  const geometry = definition.geometry;
  const solid: CircleSolid = {
    centerX: geometry.cylinderCenterX,
    centerY: geometry.cylinderCenterY,
    radius: geometry.cylinderRadius,
  };
  const envelope = emptyEnvelope();
  const probeDensity: number[] = [];
  const forceX: number[] = [];
  const forceY: number[] = [];
  let completedSteps = 0;
  try {
    const solver = new CharacteristicOpenBoundarySolver({
      nx,
      ny: geometry.ny,
      relaxationTime: definition.relaxationTime,
      inletVelocity: definition.inletVelocity,
      outletBoundary: boundary,
      pressureRelaxationSigma: 0.9,
      transverseRelaxation: Math.abs(definition.inletVelocity) / CS,
      characteristicLength: nx,
      solid,
    });
    for (let step = 1; step <= geometry.steps; step += 1) {
      solver.step();
      const inspection = solver.inspect();
      updateEnvelope(envelope, inspection);
      probeDensity.push(solver.sampleDensity(geometry.probeX, geometry.probeY));
      forceX.push(inspection.forceX);
      forceY.push(inspection.forceY);
      completedSteps = step;
    }
    return {
      status: "completed",
      completedSteps,
      probeDensity,
      forceX,
      forceY,
      snapshot: solver.snapshot(),
      stability: envelope,
    };
  } catch (error) {
    const identity = errorIdentity(error);
    const partialStability = completedSteps > 0 ? envelope : undefined;
    return {
      status: "failed",
      completedSteps,
      failure: {
        step: completedSteps + 1,
        name: identity.name,
        message: identity.message,
      },
      ...(partialStability === undefined ? {} : { partialStability }),
    };
  }
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

function combinedSquaredError(
  subject: FieldSnapshot,
  reference: FieldSnapshot,
  subjectNx: number,
  referenceNx: number,
  definition: RobustnessCaseDefinition,
): number {
  const geometry = definition.geometry;
  let error = 0;
  for (let y = 0; y < geometry.ny; y += 1) {
    for (let x = geometry.fieldXStart; x < geometry.fieldXEnd; x += 1) {
      const dx = x - geometry.cylinderCenterX;
      const dyRaw = Math.abs(y - geometry.cylinderCenterY);
      const dy = Math.min(dyRaw, geometry.ny - dyRaw);
      if (Math.hypot(dx, dy) <= geometry.cylinderRadius + 1) continue;
      const subjectCell = x + subjectNx * y;
      const referenceCell = x + referenceNx * y;
      const densityError = (subject.rho[subjectCell] ?? 1)
        - (reference.rho[referenceCell] ?? 1);
      const uxError = (subject.ux[subjectCell] ?? definition.inletVelocity)
        - (reference.ux[referenceCell] ?? definition.inletVelocity);
      const uyError = (subject.uy[subjectCell] ?? 0)
        - (reference.uy[referenceCell] ?? 0);
      error += densityError * densityError + (uxError * uxError + uyError * uyError) / CS2;
    }
  }
  return error;
}

function relativeImprovement(candidate: number, baseline: number): number {
  if (baseline <= 0) return candidate <= baseline ? 1 : -1;
  return 1 - candidate / baseline;
}

function serializeTrace(
  trace: CylinderTrace,
  boundary: OutletBoundary,
  nx: number,
): SerializedRun {
  if (trace.status === "completed") {
    return {
      boundary,
      nx,
      status: trace.status,
      completedSteps: trace.completedSteps,
      stability: trace.stability,
    };
  }
  return {
    boundary,
    nx,
    status: trace.status,
    completedSteps: trace.completedSteps,
    failure: trace.failure,
    ...(trace.partialStability === undefined
      ? {}
      : { stability: trace.partialStability }),
  };
}

function addReferenceMetrics(
  serialized: SerializedRun,
  trace: CompletedTrace,
  reference: CompletedTrace,
  definition: RobustnessCaseDefinition,
): SerializedRun {
  const geometry = definition.geometry;
  const probeErrors: number[] = [];
  for (let step = geometry.lateStart; step < geometry.steps; step += 1) {
    probeErrors.push(
      (trace.probeDensity[step] ?? 1) - (reference.probeDensity[step] ?? 1),
    );
  }
  const comparisonCells = (geometry.fieldXEnd - geometry.fieldXStart) * geometry.ny;
  const fieldReferenceError = Math.sqrt(combinedSquaredError(
    trace.snapshot,
    reference.snapshot,
    geometry.nx,
    geometry.referenceNx,
    definition,
  ) / comparisonCells);
  const lateForceX = trace.forceX.slice(geometry.lateStart);
  const lateForceY = trace.forceY.slice(geometry.lateStart);
  const forceYMean = mean(lateForceY);
  return {
    ...serialized,
    probeRmsReferenceError: rms(probeErrors),
    fieldReferenceError,
    meanDragLate: mean(lateForceX),
    liftRmsLate: rms(lateForceY.map((value) => value - forceYMean)),
  };
}

function evaluateCase(
  definition: RobustnessCaseDefinition,
  referenceTrace: CylinderTrace,
): RobustnessCaseResult {
  const geometry = definition.geometry;
  const zouHeTrace = runCylinderTrace(definition, BASELINE_BOUNDARY, geometry.nx);
  const candidateTrace = runCylinderTrace(definition, CANDIDATE_BOUNDARY, geometry.nx);
  let reference = serializeTrace(
    referenceTrace,
    REFERENCE_BOUNDARY,
    geometry.referenceNx,
  );
  let zouHe = serializeTrace(zouHeTrace, BASELINE_BOUNDARY, geometry.nx);
  let candidate = serializeTrace(candidateTrace, CANDIDATE_BOUNDARY, geometry.nx);
  if (referenceTrace.status === "completed") {
    if (zouHeTrace.status === "completed") {
      zouHe = addReferenceMetrics(zouHe, zouHeTrace, referenceTrace, definition);
    }
    if (candidateTrace.status === "completed") {
      candidate = addReferenceMetrics(candidate, candidateTrace, referenceTrace, definition);
    }
  }

  const referenceExecutionPass = referenceTrace.status === "completed";
  const zouHeExecutionPass = zouHeTrace.status === "completed";
  const candidateExecutionPass = candidateTrace.status === "completed";
  const referenceStabilityPass = referenceTrace.status === "completed"
    && stable(referenceTrace.stability);
  const zouHeStabilityPass = zouHeTrace.status === "completed"
    && stable(zouHeTrace.stability);
  const candidateStabilityPass = candidateTrace.status === "completed"
    && stable(candidateTrace.stability);
  const comparisonAvailable = referenceExecutionPass
    && zouHeExecutionPass
    && candidateExecutionPass
    && zouHe.probeRmsReferenceError !== undefined
    && candidate.probeRmsReferenceError !== undefined
    && zouHe.fieldReferenceError !== undefined
    && candidate.fieldReferenceError !== undefined;
  const probeRmsImprovementAgainstZouHe = comparisonAvailable
    ? relativeImprovement(
      candidate.probeRmsReferenceError as number,
      zouHe.probeRmsReferenceError as number,
    )
    : undefined;
  const fieldErrorImprovementAgainstZouHe = comparisonAvailable
    ? relativeImprovement(
      candidate.fieldReferenceError as number,
      zouHe.fieldReferenceError as number,
    )
    : undefined;
  const probeImprovementPass = probeRmsImprovementAgainstZouHe !== undefined
    && probeRmsImprovementAgainstZouHe
      >= ROBUSTNESS_CONTRACT.gates.minimumProbeRmsImprovementAgainstZouHe;
  const fieldImprovementPass = fieldErrorImprovementAgainstZouHe !== undefined
    && fieldErrorImprovementAgainstZouHe
      >= ROBUSTNESS_CONTRACT.gates.minimumFieldErrorImprovementAgainstZouHe;
  const failureReasons: string[] = [];
  if (!referenceExecutionPass) failureReasons.push("REFERENCE_EXECUTION_FAILED");
  if (!zouHeExecutionPass) failureReasons.push("ZOU_HE_EXECUTION_FAILED");
  if (!candidateExecutionPass) failureReasons.push("CANDIDATE_EXECUTION_FAILED");
  if (referenceExecutionPass && !referenceStabilityPass) {
    failureReasons.push("REFERENCE_STABILITY_FAILED");
  }
  if (zouHeExecutionPass && !zouHeStabilityPass) {
    failureReasons.push("ZOU_HE_STABILITY_FAILED");
  }
  if (candidateExecutionPass && !candidateStabilityPass) {
    failureReasons.push("CANDIDATE_STABILITY_FAILED");
  }
  if (!probeImprovementPass) failureReasons.push("PROBE_IMPROVEMENT_FAILED");
  if (!fieldImprovementPass) failureReasons.push("FIELD_IMPROVEMENT_FAILED");
  const pass = referenceExecutionPass
    && zouHeExecutionPass
    && candidateExecutionPass
    && referenceStabilityPass
    && zouHeStabilityPass
    && candidateStabilityPass
    && probeImprovementPass
    && fieldImprovementPass;
  return {
    definition,
    reference,
    zouHe,
    candidate,
    gate: {
      referenceExecutionPass,
      zouHeExecutionPass,
      candidateExecutionPass,
      referenceStabilityPass,
      zouHeStabilityPass,
      candidateStabilityPass,
      ...(probeRmsImprovementAgainstZouHe === undefined
        ? {}
        : { probeRmsImprovementAgainstZouHe }),
      probeImprovementPass,
      ...(fieldErrorImprovementAgainstZouHe === undefined
        ? {}
        : { fieldErrorImprovementAgainstZouHe }),
      fieldImprovementPass,
      failureReasons,
      pass,
    },
  };
}

function summarizeAxis(
  cases: RobustnessCaseResult[],
  levels: readonly number[],
  selector: (result: RobustnessCaseResult) => number,
): RobustnessAxisLevelSummary[] {
  return levels.map((level) => {
    const selected = cases.filter((result) => selector(result) === level);
    const passedCases = selected.filter((result) => result.gate.pass).length;
    return {
      level,
      totalCases: selected.length,
      passedCases,
      failedCases: selected.length - passedCases,
    };
  });
}

function maximumExtremum(
  cases: RobustnessCaseResult[],
  selector: (result: RobustnessCaseResult) => number | undefined,
): ExtremumSummary | undefined {
  let current: ExtremumSummary | undefined;
  for (const result of cases) {
    const value = selector(result);
    if (value !== undefined && (current === undefined || value > current.value)) {
      current = { caseId: result.definition.id, value };
    }
  }
  return current;
}

function minimumExtremum(
  cases: RobustnessCaseResult[],
  selector: (result: RobustnessCaseResult) => number | undefined,
): ExtremumSummary | undefined {
  let current: ExtremumSummary | undefined;
  for (const result of cases) {
    const value = selector(result);
    if (value !== undefined && (current === undefined || value < current.value)) {
      current = { caseId: result.definition.id, value };
    }
  }
  return current;
}

function summarize(cases: RobustnessCaseResult[]): RobustnessSummary {
  const passedCases = cases.filter((result) => result.gate.pass).length;
  const uniqueReferences = new Map<string, RobustnessCaseResult>();
  for (const result of cases) {
    const key = [
      result.definition.nominalCylinderDiameterCells,
      result.definition.inletVelocity,
      result.definition.relaxationTime,
    ].join("|");
    if (!uniqueReferences.has(key)) uniqueReferences.set(key, result);
  }
  const referenceResults = [...uniqueReferences.values()];
  const referenceExecutionFailures = referenceResults.filter(
    (result) => !result.gate.referenceExecutionPass,
  ).length;
  const zouHeExecutionFailures = cases.filter(
    (result) => !result.gate.zouHeExecutionPass,
  ).length;
  const candidateExecutionFailures = cases.filter(
    (result) => !result.gate.candidateExecutionPass,
  ).length;
  const failureReasonCounts: Record<string, number> = {};
  for (const result of cases) {
    for (const reason of result.gate.failureReasons) {
      failureReasonCounts[reason] = (failureReasonCounts[reason] ?? 0) + 1;
    }
  }
  const sortedFailureReasonCounts = Object.fromEntries(
    Object.entries(failureReasonCounts).sort(([left], [right]) => left.localeCompare(right)),
  );
  const worstCandidateDensityDeviation = maximumExtremum(
    cases,
    (result) => result.candidate.stability?.maximumDensityDeviation,
  );
  const worstCandidateMach = maximumExtremum(
    cases,
    (result) => result.candidate.stability?.maximumMach,
  );
  const minimumProbeImprovement = minimumExtremum(
    cases,
    (result) => result.gate.probeRmsImprovementAgainstZouHe,
  );
  const minimumFieldImprovement = minimumExtremum(
    cases,
    (result) => result.gate.fieldErrorImprovementAgainstZouHe,
  );
  return {
    totalCases: cases.length,
    passedCases,
    failedCases: cases.length - passedCases,
    referenceRuns: referenceResults.length,
    zouHeRuns: cases.length,
    candidateRuns: cases.length,
    totalSolverRuns: referenceResults.length + 2 * cases.length,
    completedSolverRuns: referenceResults.length + 2 * cases.length
      - referenceExecutionFailures
      - zouHeExecutionFailures
      - candidateExecutionFailures,
    referenceExecutionFailures,
    zouHeExecutionFailures,
    candidateExecutionFailures,
    referenceStabilityFailures: referenceResults.filter(
      (result) => !result.gate.referenceStabilityPass,
    ).length,
    zouHeStabilityFailures: cases.filter((result) => !result.gate.zouHeStabilityPass).length,
    candidateStabilityFailures: cases.filter(
      (result) => !result.gate.candidateStabilityPass,
    ).length,
    probeImprovementFailures: cases.filter(
      (result) => !result.gate.probeImprovementPass,
    ).length,
    fieldImprovementFailures: cases.filter(
      (result) => !result.gate.fieldImprovementPass,
    ).length,
    failureReasonCounts: sortedFailureReasonCounts,
    ...(worstCandidateDensityDeviation === undefined
      ? {}
      : { worstCandidateDensityDeviation }),
    ...(worstCandidateMach === undefined ? {} : { worstCandidateMach }),
    ...(minimumProbeImprovement === undefined ? {} : { minimumProbeImprovement }),
    ...(minimumFieldImprovement === undefined ? {} : { minimumFieldImprovement }),
  };
}

export function runRobustnessMatrix(
  onProgress?: (progress: RobustnessProgress) => void,
): RobustnessResult {
  const definitions = buildRobustnessCases();
  const cases: RobustnessCaseResult[] = [];
  const referenceCache = new Map<string, CylinderTrace>();
  for (const definition of definitions) {
    const referenceKey = [
      definition.nominalCylinderDiameterCells,
      definition.inletVelocity,
      definition.relaxationTime,
    ].join("|");
    let reference = referenceCache.get(referenceKey);
    if (reference === undefined) {
      reference = runCylinderTrace(
        definition,
        REFERENCE_BOUNDARY,
        definition.geometry.referenceNx,
      );
      referenceCache.set(referenceKey, reference);
    }
    const result = evaluateCase(definition, reference);
    cases.push(result);
    onProgress?.({
      completedCases: cases.length,
      totalCases: definitions.length,
      caseId: definition.id,
      pass: result.gate.pass,
    });
  }
  const summary = summarize(cases);
  const matrixComplete = cases.length === definitions.length;
  const pass = matrixComplete
    && summary.failedCases === 0
    && (!ROBUSTNESS_CONTRACT.gates.requireEveryCasePass || summary.passedCases > 0);
  return {
    format: "VP-A8-CBC2D-ROBUSTNESS-MATRIX-v1",
    contract: ROBUSTNESS_CONTRACT,
    matrixComplete,
    cases,
    axisSummaries: {
      inletVelocityLattice: summarizeAxis(
        cases,
        ROBUSTNESS_CONTRACT.axes.inletVelocityLattice,
        (result) => result.definition.inletVelocity,
      ),
      relaxationTime: summarizeAxis(
        cases,
        ROBUSTNESS_CONTRACT.axes.relaxationTime,
        (result) => result.definition.relaxationTime,
      ),
      downstreamOutletDistanceDiameters: summarizeAxis(
        cases,
        ROBUSTNESS_CONTRACT.axes.downstreamOutletDistanceDiameters,
        (result) => result.definition.requestedDownstreamOutletDistanceDiameters,
      ),
      nominalCylinderDiameterCells: summarizeAxis(
        cases,
        ROBUSTNESS_CONTRACT.axes.nominalCylinderDiameterCells,
        (result) => result.definition.nominalCylinderDiameterCells,
      ),
    },
    summary,
    decision: {
      code: pass
        ? "PASS-A8C-CBC2D-FROZEN-ROBUSTNESS-MATRIX-CANDIDATE-ONLY"
        : "NO-GO-A8C-CBC2D-FROZEN-ROBUSTNESS-MATRIX",
      pass,
      statement: pass
        ? "冻结的 81 算例候选稳健性矩阵全部通过；该结论只适用于独立正则化 BGK 候选边界，不可转移为正式 MRT--Brinkman、公开固定圆柱基准或装置预测结论。"
        : "冻结的 81 算例候选稳健性矩阵至少一项失败；不得把单点 A8B PASS 外推为该参数包络稳健，也不得据此接入正式求解器或解锁下游物理任务。",
    },
  };
}
