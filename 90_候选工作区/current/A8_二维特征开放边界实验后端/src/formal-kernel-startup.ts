import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED,
  type LbmBodyKinematics,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { CS2 } from "./d2q9.ts";
import {
  FORMAL_KERNEL_STARTUP_CONTRACT,
  FORMAL_KERNEL_STARTUP_PROTOCOLS,
  type FormalKernelStartupProtocolId,
} from "./formal-kernel-startup-contract.ts";
import {
  buildRobustnessGeometry,
  type RobustnessGeometry,
} from "./robustness.ts";

export interface FormalKernelStartupCaseDefinition {
  id: string;
  startupProtocolId: FormalKernelStartupProtocolId;
  inletVelocity: number;
  relaxationTime: number;
  viscosity: number;
  nominalCylinderDiameterCells: number;
  nominalReynoldsNumber: number;
  rampSteps: number;
  auditSteps: number;
  geometry: RobustnessGeometry;
}

export interface FormalKernelStability {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumMach: number;
  maximumMachStep: number;
  minimumDensity: number;
  maximumDensity: number;
  densityExtremum: {
    kind: "minimum" | "maximum";
    density: number;
    x: number;
    y: number;
    signedDistanceFromNominalSurfaceCells: number;
    brinkmanMaskIndicator: number;
  };
}

interface MutableStability {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumMach: number;
  maximumMachStep: number;
  minimumDensity: number;
  maximumDensity: number;
  densityExtremum?: FormalKernelStability["densityExtremum"];
}

export interface FormalKernelStartupCaseResult {
  definition: FormalKernelStartupCaseDefinition;
  run: {
    status: "completed" | "failed";
    completedSteps: number;
    stability?: FormalKernelStability;
    failure?: { nextStep: number; name: string; message: string };
  };
  gate: {
    executionPass: boolean;
    densityPass: boolean;
    machPass: boolean;
    failureReasons: string[];
    pass: boolean;
  };
}

export interface FormalUniformGuardResult {
  relaxationTime: number;
  completedSteps: number;
  maximumAbsoluteStateError?: number;
  failure?: { name: string; message: string };
  pass: boolean;
}

export interface FormalProtocolSummary {
  startupProtocolId: FormalKernelStartupProtocolId;
  totalCases: number;
  completedCases: number;
  stableCases: number;
  worstDensityDeviation?: { caseId: string; value: number };
  worstMach?: { caseId: string; value: number };
}

export interface FormalKernelStartupResult {
  format: "VP-A8H-FORMAL-MRT-BRINKMAN-STARTUP-MATRIX-v1";
  contract: typeof FORMAL_KERNEL_STARTUP_CONTRACT;
  matrixComplete: boolean;
  uniformNoSolidGuards: FormalUniformGuardResult[];
  cases: FormalKernelStartupCaseResult[];
  summaries: FormalProtocolSummary[];
  qualitativeComparison: {
    formalImpulsiveStableCorners: number;
    formalFiveDiameterRampStableCorners: number;
    candidateImpulsiveStableCorners: number;
    candidateFiveDiameterRampStableCorners: number;
    sameQualitativeStartupPatternAsCandidate: boolean;
    statement: string;
  };
  decision: {
    code: string;
    pass: boolean;
    internalChecks: {
      matrixComplete: boolean;
      uniformNoSolidGuardsPass: boolean;
      sameQualitativeStartupPatternAsCandidate: boolean;
    };
    externalChecksRequired: readonly string[];
    formalSourceModified: false;
    cbcIntegratedIntoFormalKernel: false;
    formalIntegrationUnlocked: false;
    statement: string;
  };
}

export interface FormalKernelStartupProgress {
  completedCases: number;
  totalCases: number;
  caseId: string;
  pass: boolean;
}

function scaledInteger(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

export function buildFormalKernelStartupCases(): FormalKernelStartupCaseDefinition[] {
  const definitions: FormalKernelStartupCaseDefinition[] = [];
  const contract = FORMAL_KERNEL_STARTUP_CONTRACT;
  for (const diameter of contract.matrix.nominalCylinderDiameterCells) {
    const geometry = buildRobustnessGeometry(
      diameter,
      contract.matrix.downstreamOutletDistanceDiameters,
    );
    for (const relaxationTime of contract.matrix.relaxationTime) {
      const viscosity = CS2 * (relaxationTime - 0.5);
      for (const protocol of FORMAL_KERNEL_STARTUP_PROTOCOLS) {
        definitions.push({
          id: [
            `d${scaledInteger(diameter, 1, 2)}`,
            "u0800",
            `t${scaledInteger(relaxationTime, 1_000, 4)}`,
            `p-${protocol.id}`,
          ].join("-"),
          startupProtocolId: protocol.id,
          inletVelocity: contract.matrix.inletVelocityLattice,
          relaxationTime,
          viscosity,
          nominalCylinderDiameterCells: diameter,
          nominalReynoldsNumber:
            contract.matrix.inletVelocityLattice * diameter / viscosity,
          rampSteps: protocol.rampDurationDiameters * diameter,
          auditSteps: geometry.steps,
          geometry,
        });
      }
    }
  }
  return definitions;
}

function halfCosineVelocity(
  targetVelocity: number,
  rampSteps: number,
  boundaryStep: number,
): number {
  if (boundaryStep <= 0) return 0;
  if (boundaryStep >= rampSteps) return targetVelocity;
  return 0.5 * targetVelocity
    * (1 - Math.cos(Math.PI * boundaryStep / rampSteps));
}

function emptyStability(): MutableStability {
  return {
    maximumDensityDeviation: 0,
    maximumDensityDeviationStep: 0,
    maximumMach: 0,
    maximumMachStep: 0,
    minimumDensity: Number.POSITIVE_INFINITY,
    maximumDensity: Number.NEGATIVE_INFINITY,
  };
}

function updateStability(
  envelope: MutableStability,
  solver: D2Q9MrtBrinkmanSolver,
  body: LbmBodyKinematics,
  step: number,
): void {
  const field = solver.macroscopicCopies(body);
  let minimumDensity = Number.POSITIVE_INFINITY;
  let maximumDensity = Number.NEGATIVE_INFINITY;
  let maximumSpeed = 0;
  let minimumCell = 0;
  let maximumCell = 0;
  for (let cell = 0; cell < field.rho.length; cell += 1) {
    const density = field.rho[cell] ?? 0;
    const speed = Math.hypot(field.ux[cell] ?? 0, field.uy[cell] ?? 0);
    if (density < minimumDensity) {
      minimumDensity = density;
      minimumCell = cell;
    }
    if (density > maximumDensity) {
      maximumDensity = density;
      maximumCell = cell;
    }
    maximumSpeed = Math.max(maximumSpeed, speed);
  }
  if (!Number.isFinite(minimumDensity)
    || !Number.isFinite(maximumDensity)
    || !Number.isFinite(maximumSpeed)) {
    throw new RangeError("formal-kernel macroscopic field became non-finite");
  }
  const minimumDeviation = Math.abs(minimumDensity - 1);
  const maximumDeviation = Math.abs(maximumDensity - 1);
  const useMaximum = maximumDeviation >= minimumDeviation;
  const deviation = useMaximum ? maximumDeviation : minimumDeviation;
  if (deviation > envelope.maximumDensityDeviation) {
    const cell = useMaximum ? maximumCell : minimumCell;
    const x = cell % solver.nx;
    const y = Math.floor(cell / solver.nx);
    envelope.maximumDensityDeviation = deviation;
    envelope.maximumDensityDeviationStep = step;
    envelope.densityExtremum = {
      kind: useMaximum ? "maximum" : "minimum",
      density: useMaximum ? maximumDensity : minimumDensity,
      x,
      y,
      signedDistanceFromNominalSurfaceCells:
        Math.hypot(x - body.centerX, y - body.centerY) - body.radius,
      brinkmanMaskIndicator: field.mask[cell] ?? 0,
    };
  }
  const maximumMach = maximumSpeed / LATTICE_SOUND_SPEED;
  if (maximumMach > envelope.maximumMach) {
    envelope.maximumMach = maximumMach;
    envelope.maximumMachStep = step;
  }
  envelope.minimumDensity = Math.min(envelope.minimumDensity, minimumDensity);
  envelope.maximumDensity = Math.max(envelope.maximumDensity, maximumDensity);
}

function finalizeStability(envelope: MutableStability): FormalKernelStability {
  if (envelope.densityExtremum === undefined) {
    throw new Error("cannot finalize empty A8H stability envelope");
  }
  return {
    maximumDensityDeviation: envelope.maximumDensityDeviation,
    maximumDensityDeviationStep: envelope.maximumDensityDeviationStep,
    maximumMach: envelope.maximumMach,
    maximumMachStep: envelope.maximumMachStep,
    minimumDensity: envelope.minimumDensity,
    maximumDensity: envelope.maximumDensity,
    densityExtremum: envelope.densityExtremum,
  };
}

function errorIdentity(error: unknown): { name: string; message: string } {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: "UnknownError", message: String(error) };
}

function createSolver(definition: FormalKernelStartupCaseDefinition): D2Q9MrtBrinkmanSolver {
  return new D2Q9MrtBrinkmanSolver({
    nx: definition.geometry.nx,
    ny: definition.geometry.ny,
    relaxationTime: definition.relaxationTime,
    penalizationTimeSteps:
      FORMAL_KERNEL_STARTUP_CONTRACT.matrix.penalizationTimeSteps,
    maskHalfThickness:
      FORMAL_KERNEL_STARTUP_CONTRACT.matrix.maskHalfThicknessCells,
    outerBoundary: FORMAL_KERNEL_STARTUP_CONTRACT.matrix.outerBoundary,
  });
}

function evaluateCase(
  definition: FormalKernelStartupCaseDefinition,
): FormalKernelStartupCaseResult {
  const solver = createSolver(definition);
  const body: LbmBodyKinematics = {
    centerX: definition.geometry.cylinderCenterX,
    centerY: definition.geometry.cylinderCenterY,
    radius: definition.geometry.cylinderRadius,
    velocityX: 0,
    velocityY: 0,
  };
  const isRamp = definition.startupProtocolId === "cosine-ramp-from-rest-5d";
  if (!isRamp) solver.initializeUniform(definition.inletVelocity);
  const envelope = emptyStability();
  let completedSteps = 0;
  let status: "completed" | "failed" = "completed";
  let failure: { nextStep: number; name: string; message: string } | undefined;
  try {
    for (let step = 1; step <= definition.auditSteps; step += 1) {
      const inletVelocity = isRamp
        ? halfCosineVelocity(definition.inletVelocity, definition.rampSteps, step)
        : definition.inletVelocity;
      solver.step(body, inletVelocity);
      updateStability(envelope, solver, body, step);
      completedSteps = step;
    }
  } catch (error) {
    status = "failed";
    failure = { nextStep: completedSteps + 1, ...errorIdentity(error) };
  }
  const stability = completedSteps === 0 ? undefined : finalizeStability(envelope);
  const executionPass = status === "completed";
  const densityPass = stability !== undefined
    && stability.maximumDensityDeviation
      <= FORMAL_KERNEL_STARTUP_CONTRACT.gates.maximumDensityDeviation;
  const machPass = stability !== undefined
    && stability.maximumMach <= FORMAL_KERNEL_STARTUP_CONTRACT.gates.maximumMach;
  const failureReasons: string[] = [];
  if (!executionPass) failureReasons.push("EXECUTION_FAILED");
  if (stability !== undefined && !densityPass) failureReasons.push("DENSITY_GATE_FAILED");
  if (stability !== undefined && !machPass) failureReasons.push("MACH_GATE_FAILED");
  const pass = executionPass && densityPass && machPass;
  return {
    definition,
    run: {
      status,
      completedSteps,
      ...(stability === undefined ? {} : { stability }),
      ...(failure === undefined ? {} : { failure }),
    },
    gate: { executionPass, densityPass, machPass, failureReasons, pass },
  };
}

function runUniformGuard(relaxationTime: number): FormalUniformGuardResult {
  const guard = FORMAL_KERNEL_STARTUP_CONTRACT.uniformNoSolidGuard;
  const geometry = buildRobustnessGeometry(
    guard.nominalCylinderDiameterCells,
    guard.downstreamOutletDistanceDiameters,
  );
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: geometry.nx,
    ny: geometry.ny,
    relaxationTime,
    penalizationTimeSteps:
      FORMAL_KERNEL_STARTUP_CONTRACT.matrix.penalizationTimeSteps,
    maskHalfThickness:
      FORMAL_KERNEL_STARTUP_CONTRACT.matrix.maskHalfThicknessCells,
    outerBoundary: FORMAL_KERNEL_STARTUP_CONTRACT.matrix.outerBoundary,
  });
  solver.initializeUniform(guard.inletVelocityLattice);
  let completedSteps = 0;
  let maximumAbsoluteStateError = 0;
  try {
    for (let step = 1; step <= guard.steps; step += 1) {
      solver.step(null, guard.inletVelocityLattice);
      const field = solver.macroscopicCopies(null);
      for (let cell = 0; cell < field.rho.length; cell += 1) {
        maximumAbsoluteStateError = Math.max(
          maximumAbsoluteStateError,
          Math.abs((field.rho[cell] ?? 1) - 1),
          Math.abs((field.ux[cell] ?? guard.inletVelocityLattice)
            - guard.inletVelocityLattice),
          Math.abs(field.uy[cell] ?? 0),
        );
      }
      completedSteps = step;
    }
    return {
      relaxationTime,
      completedSteps,
      maximumAbsoluteStateError,
      pass: maximumAbsoluteStateError <= guard.maximumAbsoluteStateError,
    };
  } catch (error) {
    return {
      relaxationTime,
      completedSteps,
      failure: errorIdentity(error),
      pass: false,
    };
  }
}

function maximumValue(
  cases: FormalKernelStartupCaseResult[],
  selector: (entry: FormalKernelStartupCaseResult) => number | undefined,
): { caseId: string; value: number } | undefined {
  let result: { caseId: string; value: number } | undefined;
  for (const entry of cases) {
    const value = selector(entry);
    if (value === undefined) continue;
    if (result === undefined || value > result.value) {
      result = { caseId: entry.definition.id, value };
    }
  }
  return result;
}

function summarize(cases: FormalKernelStartupCaseResult[]): FormalProtocolSummary[] {
  return FORMAL_KERNEL_STARTUP_PROTOCOLS.map((protocol) => {
    const selected = cases.filter(
      (entry) => entry.definition.startupProtocolId === protocol.id,
    );
    const worstDensityDeviation = maximumValue(
      selected,
      (entry) => entry.run.stability?.maximumDensityDeviation,
    );
    const worstMach = maximumValue(
      selected,
      (entry) => entry.run.stability?.maximumMach,
    );
    return {
      startupProtocolId: protocol.id,
      totalCases: selected.length,
      completedCases: selected.filter((entry) => entry.gate.executionPass).length,
      stableCases: selected.filter((entry) => entry.gate.pass).length,
      ...(worstDensityDeviation === undefined
        ? {}
        : { worstDensityDeviation }),
      ...(worstMach === undefined ? {} : { worstMach }),
    };
  });
}

function stableCount(
  summaries: FormalProtocolSummary[],
  protocolId: FormalKernelStartupProtocolId,
): number {
  const summary = summaries.find((entry) => entry.startupProtocolId === protocolId);
  if (summary === undefined) throw new Error("missing A8H protocol summary");
  return summary.stableCases;
}

export function runFormalKernelStartupMatrix(
  onProgress?: (progress: FormalKernelStartupProgress) => void,
): FormalKernelStartupResult {
  const uniformNoSolidGuards = FORMAL_KERNEL_STARTUP_CONTRACT
    .uniformNoSolidGuard.relaxationTime.map(runUniformGuard);
  const definitions = buildFormalKernelStartupCases();
  const cases: FormalKernelStartupCaseResult[] = [];
  for (const definition of definitions) {
    const result = evaluateCase(definition);
    cases.push(result);
    onProgress?.({
      completedCases: cases.length,
      totalCases: definitions.length,
      caseId: definition.id,
      pass: result.gate.pass,
    });
  }
  const summaries = summarize(cases);
  const formalImpulsiveStableCorners = stableCount(summaries, "uniform-impulsive");
  const formalFiveDiameterRampStableCorners = stableCount(
    summaries,
    "cosine-ramp-from-rest-5d",
  );
  const candidateImpulsiveStableCorners = FORMAL_KERNEL_STARTUP_CONTRACT
    .inheritedCandidateEvidence.candidateImpulsiveStableCorners;
  const candidateFiveDiameterRampStableCorners = FORMAL_KERNEL_STARTUP_CONTRACT
    .inheritedCandidateEvidence.candidateFiveDiameterRampStableCorners;
  const sameQualitativeStartupPatternAsCandidate = formalImpulsiveStableCorners
      === FORMAL_KERNEL_STARTUP_CONTRACT.gates.expectedImpulsiveStableCorners
    && formalFiveDiameterRampStableCorners
      === FORMAL_KERNEL_STARTUP_CONTRACT.gates.expectedFiveDiameterRampStableCorners
    && formalImpulsiveStableCorners === candidateImpulsiveStableCorners
    && formalFiveDiameterRampStableCorners === candidateFiveDiameterRampStableCorners;
  const matrixComplete = cases.length === 18
    && cases.every((entry) => entry.gate.executionPass);
  const uniformNoSolidGuardsPass = uniformNoSolidGuards.length === 3
    && uniformNoSolidGuards.every((entry) => entry.pass);
  const pass = matrixComplete
    && uniformNoSolidGuardsPass
    && sameQualitativeStartupPatternAsCandidate;
  return {
    format: "VP-A8H-FORMAL-MRT-BRINKMAN-STARTUP-MATRIX-v1",
    contract: FORMAL_KERNEL_STARTUP_CONTRACT,
    matrixComplete,
    uniformNoSolidGuards,
    cases,
    summaries,
    qualitativeComparison: {
      formalImpulsiveStableCorners,
      formalFiveDiameterRampStableCorners,
      candidateImpulsiveStableCorners,
      candidateFiveDiameterRampStableCorners,
      sameQualitativeStartupPatternAsCandidate,
      statement: sameQualitativeStartupPatternAsCandidate
        ? "The existing read-only formal MRT-Brinkman kernel has the same frozen impulsive-fail and five-diameter-ramp-pass classification as the candidate audits under its current Zou-He outer boundary."
        : "The existing read-only formal MRT-Brinkman kernel does not reproduce the candidate startup classification under its current Zou-He outer boundary.",
    },
    decision: {
      code: pass
        ? "PASS-A8H-READONLY-FORMAL-MRT-BRINKMAN-STARTUP-INTERNAL-GATES"
        : "NO-GO-A8H-READONLY-FORMAL-MRT-BRINKMAN-STARTUP-INTERNAL-GATES",
      pass,
      internalChecks: {
        matrixComplete,
        uniformNoSolidGuardsPass,
        sameQualitativeStartupPatternAsCandidate,
      },
      externalChecksRequired: Object.freeze([
        "formal lbm.ts SHA-256 exact",
        "inherited A8D and A8E artifact SHA-256 exact",
        "independent A8H JSON repeat byte-identical",
      ]),
      formalSourceModified: false,
      cbcIntegratedIntoFormalKernel: false,
      formalIntegrationUnlocked: false,
      statement: pass
        ? "The frozen read-only formal-kernel startup audit passes; it does not qualify CBC integration or change the formal source."
        : "At least one frozen A8H internal gate failed; no startup conclusion transfers to the formal kernel.",
    },
  };
}
