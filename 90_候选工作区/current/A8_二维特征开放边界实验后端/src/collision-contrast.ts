import { CS, CS2 } from "./d2q9.ts";
import {
  COLLISION_CONTRAST_CONTRACT,
  COLLISION_KERNELS,
  COLLISION_STARTUP_PROTOCOLS,
  type CollisionContrastKernel,
  type CollisionStartupProtocolId,
} from "./collision-contrast-contract.ts";
import {
  buildRobustnessGeometry,
  type RobustnessGeometry,
} from "./robustness.ts";
import {
  CharacteristicOpenBoundarySolver,
  type CircleSolid,
  type GridLocation,
  type InletVelocityProfile,
  type SolverInspection,
} from "./solver.ts";

export interface CollisionContrastCaseDefinition {
  id: string;
  collisionKernel: CollisionContrastKernel;
  startupProtocolId: CollisionStartupProtocolId;
  inletVelocity: number;
  relaxationTime: number;
  viscosity: number;
  nominalCylinderDiameterCells: number;
  nominalReynoldsNumber: number;
  rampSteps: number;
  auditSteps: number;
  geometry: RobustnessGeometry;
}

export interface CollisionContrastStability {
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
    surfaceClearanceCells: number;
    adjacentToSolid: boolean;
  };
}

interface MutableStability {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumMach: number;
  maximumMachStep: number;
  minimumDensity: number;
  maximumDensity: number;
  densityExtremum?: CollisionContrastStability["densityExtremum"];
}

export interface CollisionContrastCaseResult {
  definition: CollisionContrastCaseDefinition;
  run: {
    status: "completed" | "failed";
    completedSteps: number;
    stability?: CollisionContrastStability;
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

export interface RawUniformGuardResult {
  relaxationTime: number;
  completedSteps: number;
  maximumAbsoluteStateError?: number;
  failure?: { name: string; message: string };
  pass: boolean;
}

export interface CollisionProtocolSummary {
  collisionKernel: CollisionContrastKernel;
  startupProtocolId: CollisionStartupProtocolId;
  totalCases: number;
  completedCases: number;
  stableCases: number;
  worstDensityDeviation?: { caseId: string; value: number };
  worstMach?: { caseId: string; value: number };
}

export interface CollisionContrastResult {
  format: "VP-A8F-CBC2D-COLLISION-CONTRAST-MATRIX-v1";
  contract: typeof COLLISION_CONTRAST_CONTRACT;
  matrixComplete: boolean;
  rawUniformNoSolidGuards: RawUniformGuardResult[];
  cases: CollisionContrastCaseResult[];
  summaries: CollisionProtocolSummary[];
  qualitativePattern: {
    regularizedImpulsiveStableCorners: number;
    regularizedRampStableCorners: number;
    rawImpulsiveStableCorners: number;
    rawRampStableCorners: number;
    sameFrozenStartupPatternAcrossKernels: boolean;
    statement: string;
  };
  decision: {
    code: string;
    pass: boolean;
    internalChecks: {
      matrixComplete: boolean;
      rawUniformNoSolidGuardsPass: boolean;
      sameFrozenStartupPatternAcrossKernels: boolean;
    };
    externalChecksRequired: readonly string[];
    formalIntegrationUnlocked: false;
    rawBgkIsFormalMrtEquivalent: false;
    statement: string;
  };
}

export interface CollisionContrastProgress {
  completedCases: number;
  totalCases: number;
  caseId: string;
  pass: boolean;
}

function scaledInteger(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

export function buildCollisionContrastCases(): CollisionContrastCaseDefinition[] {
  const definitions: CollisionContrastCaseDefinition[] = [];
  const contract = COLLISION_CONTRAST_CONTRACT;
  for (const diameter of contract.matrix.nominalCylinderDiameterCells) {
    const geometry = buildRobustnessGeometry(
      diameter,
      contract.matrix.downstreamOutletDistanceDiameters,
    );
    for (const relaxationTime of contract.matrix.relaxationTime) {
      const viscosity = CS2 * (relaxationTime - 0.5);
      for (const collisionKernel of COLLISION_KERNELS) {
        for (const startupProtocol of COLLISION_STARTUP_PROTOCOLS) {
          definitions.push({
            id: [
              `d${scaledInteger(diameter, 1, 2)}`,
              "u0800",
              `t${scaledInteger(relaxationTime, 1_000, 4)}`,
              `k-${collisionKernel}`,
              `p-${startupProtocol.id}`,
            ].join("-"),
            collisionKernel,
            startupProtocolId: startupProtocol.id,
            inletVelocity: contract.matrix.inletVelocityLattice,
            relaxationTime,
            viscosity,
            nominalCylinderDiameterCells: diameter,
            nominalReynoldsNumber:
              contract.matrix.inletVelocityLattice * diameter / viscosity,
            rampSteps: startupProtocol.rampDurationDiameters * diameter,
            auditSteps: geometry.steps,
            geometry,
          });
        }
      }
    }
  }
  return definitions;
}

function halfCosineVelocity(
  targetVelocity: number,
  rampSteps: number,
): InletVelocityProfile {
  return (boundaryStep) => {
    if (boundaryStep <= 0) return 0;
    if (boundaryStep >= rampSteps) return targetVelocity;
    return 0.5 * targetVelocity
      * (1 - Math.cos(Math.PI * boundaryStep / rampSteps));
  };
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

function periodicRelativeY(y: number, centerY: number, ny: number): number {
  let relative = y - centerY;
  if (relative > ny / 2) relative -= ny;
  if (relative < -ny / 2) relative += ny;
  return relative;
}

function densityLocation(
  location: GridLocation,
  geometry: RobustnessGeometry,
  solver: CharacteristicOpenBoundarySolver,
): Pick<CollisionContrastStability["densityExtremum"],
  "x" | "y" | "surfaceClearanceCells" | "adjacentToSolid"> {
  const relativeX = location.x - geometry.cylinderCenterX;
  const relativeY = periodicRelativeY(
    location.y,
    geometry.cylinderCenterY,
    geometry.ny,
  );
  let adjacentToSolid = false;
  for (let dy = -1; dy <= 1 && !adjacentToSolid; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      if (solver.isSolid(location.x + dx, location.y + dy)) {
        adjacentToSolid = true;
        break;
      }
    }
  }
  return {
    x: location.x,
    y: location.y,
    surfaceClearanceCells:
      Math.hypot(relativeX, relativeY) - geometry.cylinderRadius,
    adjacentToSolid,
  };
}

function updateStability(
  envelope: MutableStability,
  inspection: SolverInspection,
  geometry: RobustnessGeometry,
  solver: CharacteristicOpenBoundarySolver,
): void {
  const minimumDeviation = Math.abs(inspection.minimumDensity - 1);
  const maximumDeviation = Math.abs(inspection.maximumDensity - 1);
  const useMaximum = maximumDeviation >= minimumDeviation;
  const deviation = useMaximum ? maximumDeviation : minimumDeviation;
  if (deviation > envelope.maximumDensityDeviation) {
    envelope.maximumDensityDeviation = deviation;
    envelope.maximumDensityDeviationStep = inspection.step;
    envelope.densityExtremum = {
      kind: useMaximum ? "maximum" : "minimum",
      density: useMaximum ? inspection.maximumDensity : inspection.minimumDensity,
      ...densityLocation(
        useMaximum
          ? inspection.maximumDensityLocation
          : inspection.minimumDensityLocation,
        geometry,
        solver,
      ),
    };
  }
  if (inspection.maximumMach > envelope.maximumMach) {
    envelope.maximumMach = inspection.maximumMach;
    envelope.maximumMachStep = inspection.step;
  }
  envelope.minimumDensity = Math.min(envelope.minimumDensity, inspection.minimumDensity);
  envelope.maximumDensity = Math.max(envelope.maximumDensity, inspection.maximumDensity);
}

function finalizeStability(envelope: MutableStability): CollisionContrastStability {
  if (envelope.densityExtremum === undefined) {
    throw new Error("cannot finalize empty A8F stability envelope");
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

function evaluateCase(
  definition: CollisionContrastCaseDefinition,
): CollisionContrastCaseResult {
  const geometry = definition.geometry;
  const solid: CircleSolid = {
    centerX: geometry.cylinderCenterX,
    centerY: geometry.cylinderCenterY,
    radius: geometry.cylinderRadius,
  };
  const isRamp = definition.startupProtocolId === "cosine-ramp-from-rest-5d";
  const baseOptions = {
    nx: geometry.nx,
    ny: geometry.ny,
    relaxationTime: definition.relaxationTime,
    collisionKernel: definition.collisionKernel,
    inletVelocity: definition.inletVelocity,
    outletBoundary: COLLISION_CONTRAST_CONTRACT.matrix.outletBoundary,
    pressureRelaxationSigma: 0.9,
    characteristicLength: geometry.nx,
    solid,
  } as const;
  const solver = isRamp
    ? new CharacteristicOpenBoundarySolver({
      ...baseOptions,
      inletVelocityProfile: halfCosineVelocity(
        definition.inletVelocity,
        definition.rampSteps,
      ),
    })
    : new CharacteristicOpenBoundarySolver(baseOptions);
  if (isRamp) solver.initializeField(() => ({ rho: 1, ux: 0, uy: 0 }));
  const envelope = emptyStability();
  let completedSteps = 0;
  let status: "completed" | "failed" = "completed";
  let failure: { nextStep: number; name: string; message: string } | undefined;
  try {
    for (let step = 1; step <= definition.auditSteps; step += 1) {
      solver.step();
      updateStability(envelope, solver.inspect(), geometry, solver);
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
      <= COLLISION_CONTRAST_CONTRACT.gates.maximumDensityDeviation;
  const machPass = stability !== undefined
    && stability.maximumMach <= COLLISION_CONTRAST_CONTRACT.gates.maximumMach;
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

function runRawUniformGuard(relaxationTime: number): RawUniformGuardResult {
  const guard = COLLISION_CONTRAST_CONTRACT.uniformNoSolidGuard;
  const geometry = buildRobustnessGeometry(
    guard.nominalCylinderDiameterCells,
    guard.downstreamOutletDistanceDiameters,
  );
  let completedSteps = 0;
  let maximumAbsoluteStateError = 0;
  try {
    const solver = new CharacteristicOpenBoundarySolver({
      nx: geometry.nx,
      ny: geometry.ny,
      relaxationTime,
      collisionKernel: guard.collisionKernel,
      inletVelocity: guard.inletVelocityLattice,
      outletBoundary: COLLISION_CONTRAST_CONTRACT.matrix.outletBoundary,
      pressureRelaxationSigma: 0.9,
      characteristicLength: geometry.nx,
    });
    for (let step = 1; step <= guard.steps; step += 1) {
      solver.step();
      const snapshot = solver.snapshot();
      for (let cell = 0; cell < snapshot.rho.length; cell += 1) {
        maximumAbsoluteStateError = Math.max(
          maximumAbsoluteStateError,
          Math.abs((snapshot.rho[cell] ?? 1) - 1),
          Math.abs((snapshot.ux[cell] ?? guard.inletVelocityLattice)
            - guard.inletVelocityLattice),
          Math.abs(snapshot.uy[cell] ?? 0),
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
  cases: CollisionContrastCaseResult[],
  selector: (entry: CollisionContrastCaseResult) => number | undefined,
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

function summarize(cases: CollisionContrastCaseResult[]): CollisionProtocolSummary[] {
  const summaries: CollisionProtocolSummary[] = [];
  for (const collisionKernel of COLLISION_KERNELS) {
    for (const startupProtocol of COLLISION_STARTUP_PROTOCOLS) {
      const selected = cases.filter((entry) =>
        entry.definition.collisionKernel === collisionKernel
        && entry.definition.startupProtocolId === startupProtocol.id);
      const worstDensityDeviation = maximumValue(
        selected,
        (entry) => entry.run.stability?.maximumDensityDeviation,
      );
      const worstMach = maximumValue(
        selected,
        (entry) => entry.run.stability?.maximumMach,
      );
      summaries.push({
        collisionKernel,
        startupProtocolId: startupProtocol.id,
        totalCases: selected.length,
        completedCases: selected.filter((entry) => entry.gate.executionPass).length,
        stableCases: selected.filter((entry) => entry.gate.pass).length,
        ...(worstDensityDeviation === undefined
          ? {}
          : { worstDensityDeviation }),
        ...(worstMach === undefined ? {} : { worstMach }),
      });
    }
  }
  return summaries;
}

function stableCount(
  summaries: CollisionProtocolSummary[],
  kernel: CollisionContrastKernel,
  protocol: CollisionStartupProtocolId,
): number {
  const summary = summaries.find((entry) =>
    entry.collisionKernel === kernel && entry.startupProtocolId === protocol);
  if (summary === undefined) throw new Error("missing A8F summary");
  return summary.stableCases;
}

export function runCollisionContrastMatrix(
  onProgress?: (progress: CollisionContrastProgress) => void,
): CollisionContrastResult {
  const rawUniformNoSolidGuards = COLLISION_CONTRAST_CONTRACT
    .uniformNoSolidGuard.relaxationTime.map(runRawUniformGuard);
  const definitions = buildCollisionContrastCases();
  const cases: CollisionContrastCaseResult[] = [];
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
  const regularizedImpulsiveStableCorners = stableCount(
    summaries,
    "regularized-bgk",
    "uniform-impulsive",
  );
  const regularizedRampStableCorners = stableCount(
    summaries,
    "regularized-bgk",
    "cosine-ramp-from-rest-5d",
  );
  const rawImpulsiveStableCorners = stableCount(
    summaries,
    "raw-bgk",
    "uniform-impulsive",
  );
  const rawRampStableCorners = stableCount(
    summaries,
    "raw-bgk",
    "cosine-ramp-from-rest-5d",
  );
  const expectedImpulsive = COLLISION_CONTRAST_CONTRACT.gates
    .expectedImpulsiveStableCorners;
  const expectedRamp = COLLISION_CONTRAST_CONTRACT.gates
    .expectedFiveDiameterRampStableCorners;
  const sameFrozenStartupPatternAcrossKernels =
    regularizedImpulsiveStableCorners === expectedImpulsive
    && rawImpulsiveStableCorners === expectedImpulsive
    && regularizedRampStableCorners === expectedRamp
    && rawRampStableCorners === expectedRamp;
  const matrixComplete = cases.length === 36
    && cases.every((entry) => entry.gate.executionPass);
  const rawUniformNoSolidGuardsPass = rawUniformNoSolidGuards.length === 3
    && rawUniformNoSolidGuards.every((entry) => entry.pass);
  const pass = matrixComplete
    && rawUniformNoSolidGuardsPass
    && sameFrozenStartupPatternAcrossKernels;
  return {
    format: "VP-A8F-CBC2D-COLLISION-CONTRAST-MATRIX-v1",
    contract: COLLISION_CONTRAST_CONTRACT,
    matrixComplete,
    rawUniformNoSolidGuards,
    cases,
    summaries,
    qualitativePattern: {
      regularizedImpulsiveStableCorners,
      regularizedRampStableCorners,
      rawImpulsiveStableCorners,
      rawRampStableCorners,
      sameFrozenStartupPatternAcrossKernels,
      statement: sameFrozenStartupPatternAcrossKernels
        ? "The frozen impulsive-fail and five-diameter-ramp-pass pattern is unchanged by replacing the interior regularized BGK collision with raw SRT-BGK; this does not establish MRT equivalence."
        : "The frozen startup classification changes under raw SRT-BGK, so collision-kernel interaction remains material within A8F.",
    },
    decision: {
      code: pass
        ? "PASS-A8F-CBC2D-COLLISION-CONTRAST-INTERNAL-GATES-CANDIDATE-ONLY"
        : "NO-GO-A8F-CBC2D-COLLISION-CONTRAST-INTERNAL-GATES",
      pass,
      internalChecks: {
        matrixComplete,
        rawUniformNoSolidGuardsPass,
        sameFrozenStartupPatternAcrossKernels,
      },
      externalChecksRequired: Object.freeze([
        "regularized A8D impulsive and A8E five-diameter anchors exact",
        "independent A8F JSON repeat byte-identical",
      ]),
      formalIntegrationUnlocked: false,
      rawBgkIsFormalMrtEquivalent: false,
      statement: pass
        ? "The frozen A8F internal collision-contrast gates pass; external anchor and repeat checks remain mandatory."
        : "At least one frozen A8F internal gate failed; collision independence cannot be claimed.",
    },
  };
}
