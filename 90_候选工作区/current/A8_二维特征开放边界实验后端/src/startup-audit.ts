import { CS, CS2 } from "./d2q9.ts";
import {
  STARTUP_AUDIT_CONTRACT,
  STARTUP_PROTOCOLS,
  type StartupProtocol,
  type StartupProtocolId,
} from "./startup-audit-contract.ts";
import {
  buildRobustnessGeometry,
  type RobustnessGeometry,
} from "./robustness.ts";
import {
  CharacteristicOpenBoundarySolver,
  type CircleSolid,
  type GridLocation,
  type InletVelocityProfile,
  type OutletBoundary,
  type SolverInspection,
} from "./solver.ts";

export interface StartupAuditCaseDefinition {
  id: string;
  protocolId: StartupProtocolId;
  inletVelocity: number;
  meanMach: number;
  relaxationTime: number;
  viscosity: number;
  nominalCylinderDiameterCells: number;
  nominalReynoldsNumber: number;
  preparationSteps: number;
  auditSteps: number;
  geometry: RobustnessGeometry;
}

export interface CylinderRelativeLocation {
  x: number;
  y: number;
  relativeXCells: number;
  relativeYCells: number;
  radialDistanceCells: number;
  surfaceClearanceCells: number;
  adjacentToSolid: boolean;
  cylinderLocalByFrozenRule: boolean;
}

export interface DensityExtremumRecord {
  phaseStep: number;
  solverStep: number;
  kind: "minimum" | "maximum";
  density: number;
  absoluteDeviation: number;
  location: CylinderRelativeLocation;
}

export interface MachExtremumRecord {
  phaseStep: number;
  solverStep: number;
  mach: number;
  location: CylinderRelativeLocation;
}

export interface StartupStabilityEnvelope {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumDensityDeviationSolverStep: number;
  maximumMach: number;
  maximumMachStep: number;
  maximumMachSolverStep: number;
  minimumDensity: number;
  maximumDensity: number;
  densityExtremum: DensityExtremumRecord;
  machExtremum: MachExtremumRecord;
}

interface MutableEnvelope {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumDensityDeviationSolverStep: number;
  maximumMach: number;
  maximumMachStep: number;
  maximumMachSolverStep: number;
  minimumDensity: number;
  maximumDensity: number;
  densityExtremum?: DensityExtremumRecord;
  machExtremum?: MachExtremumRecord;
}

export interface StartupRunFailure {
  phase: "preparation" | "audit";
  nextPhaseStep: number;
  solverStep: number;
  name: string;
  message: string;
}

export interface StartupSerializedRun {
  status: "completed" | "failed";
  completedPreparationSteps: number;
  completedAuditSteps: number;
  preparationStability?: StartupStabilityEnvelope;
  auditStability?: StartupStabilityEnvelope;
  failure?: StartupRunFailure;
}

export interface StartupCaseGate {
  executionPass: boolean;
  densityPass: boolean;
  machPass: boolean;
  auditStabilityPass: boolean;
  preparationStabilityPass?: boolean;
  fullHistoryStabilityPass: boolean;
  failureReasons: string[];
  pass: boolean;
}

export interface StartupAuditCaseResult {
  definition: StartupAuditCaseDefinition;
  run: StartupSerializedRun;
  gate: StartupCaseGate;
}

export interface UniformNoSolidGuardResult {
  id: string;
  boundary: OutletBoundary;
  relaxationTime: number;
  completedSteps: number;
  maximumAbsoluteStateError?: number;
  failure?: { name: string; message: string };
  pass: boolean;
}

export interface SpeedBracketSample {
  inletVelocity: number;
  maximumDensityDeviation?: number;
  stabilityPass: boolean;
}

export interface SpeedBracketResult {
  protocolId: StartupProtocolId;
  relaxationTime: number;
  nominalCylinderDiameterCells: number;
  samples: SpeedBracketSample[];
  densityDeviationMonotone: boolean;
  lowEndpointPass: boolean;
  highEndpointFail: boolean;
  highestPassingVelocity?: number;
  lowestFailingVelocity?: number;
  bracketWidth?: number;
  sampledBracketPass: boolean;
}

export interface ProtocolSummary {
  protocolId: StartupProtocolId;
  totalCases: number;
  completedCases: number;
  auditStableCases: number;
  fullHistoryStableCases: number;
  highSpeedTotalCases: number;
  highSpeedAuditStableCases: number;
  highSpeedFullHistoryStableCases: number;
  worstAuditDensityDeviation?: { caseId: string; value: number };
  worstPreparationDensityDeviation?: { caseId: string; value: number };
}

export interface StartupAuditAttribution {
  highSpeedLevel: number;
  impulsiveHighSpeedStableCases: number;
  smoothRampHighSpeedStableCases: number;
  compatibleHoldHighSpeedStableCases: number;
  compatibleHoldHighSpeedFullHistoryStableCases: number;
  impulsiveFailureReproduced: boolean;
  smoothRampRemovesHighSpeedFailure: boolean;
  compatibleHoldRemovesHighSpeedAuditFailure: boolean;
  impulsiveHighSpeedPeaksAllCylinderLocal: boolean;
  statement: string;
}

export interface StartupAuditSummary {
  totalMatrixCases: number;
  completedMatrixCases: number;
  failedMatrixCases: number;
  auditStableCases: number;
  fullHistoryStableCases: number;
  totalUniformGuardCases: number;
  passedUniformGuardCases: number;
  protocolSummaries: ProtocolSummary[];
}

export interface StartupAuditResult {
  format: "VP-A8D-CBC2D-STARTUP-AUDIT-MATRIX-v1";
  contract: typeof STARTUP_AUDIT_CONTRACT;
  matrixComplete: boolean;
  uniformNoSolidGuards: UniformNoSolidGuardResult[];
  cases: StartupAuditCaseResult[];
  speedBrackets: SpeedBracketResult[];
  attribution: StartupAuditAttribution;
  summary: StartupAuditSummary;
  decision: {
    code: string;
    pass: boolean;
    internalChecks: {
      matrixComplete: boolean;
      uniformNoSolidGuardsPass: boolean;
      impulsiveEndpointBracketsPass: boolean;
      impulsiveDensityMonotonicityPass: boolean;
    };
    externalChecksRequired: readonly string[];
    formalIntegrationUnlocked: false;
    statement: string;
  };
}

export interface StartupAuditProgress {
  completedCases: number;
  totalCases: number;
  caseId: string;
  protocolId: StartupProtocolId;
  pass: boolean;
}

function scaledInteger(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

function caseId(
  diameter: number,
  inletVelocity: number,
  relaxationTime: number,
  protocolId: StartupProtocolId,
): string {
  return [
    `d${scaledInteger(diameter, 1, 2)}`,
    `u${scaledInteger(inletVelocity, 10_000, 4)}`,
    `t${scaledInteger(relaxationTime, 1_000, 4)}`,
    `p-${protocolId}`,
  ].join("-");
}

function protocolById(protocolId: StartupProtocolId): StartupProtocol {
  const protocol = STARTUP_PROTOCOLS.find((entry) => entry.id === protocolId);
  if (protocol === undefined) throw new RangeError(`unknown startup protocol: ${protocolId}`);
  return protocol;
}

export function buildStartupAuditCases(): StartupAuditCaseDefinition[] {
  const definitions: StartupAuditCaseDefinition[] = [];
  const distance = STARTUP_AUDIT_CONTRACT.matrix.downstreamOutletDistanceDiameters;
  for (const diameter of STARTUP_AUDIT_CONTRACT.matrix.nominalCylinderDiameterCells) {
    const geometry = buildRobustnessGeometry(diameter, distance);
    for (const relaxationTime of STARTUP_AUDIT_CONTRACT.matrix.relaxationTime) {
      const viscosity = CS2 * (relaxationTime - 0.5);
      for (const inletVelocity of STARTUP_AUDIT_CONTRACT.matrix.inletVelocityLattice) {
        for (const protocol of STARTUP_PROTOCOLS) {
          definitions.push({
            id: caseId(diameter, inletVelocity, relaxationTime, protocol.id),
            protocolId: protocol.id,
            inletVelocity,
            meanMach: inletVelocity / CS,
            relaxationTime,
            viscosity,
            nominalCylinderDiameterCells: diameter,
            nominalReynoldsNumber: inletVelocity * diameter / viscosity,
            preparationSteps:
              protocol.preparationRampStepsPerDiameter * diameter,
            auditSteps: geometry.steps,
            geometry,
          });
        }
      }
    }
  }
  return definitions;
}

function emptyEnvelope(): MutableEnvelope {
  return {
    maximumDensityDeviation: 0,
    maximumDensityDeviationStep: 0,
    maximumDensityDeviationSolverStep: 0,
    maximumMach: 0,
    maximumMachStep: 0,
    maximumMachSolverStep: 0,
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

function relativeLocation(
  gridLocation: GridLocation,
  geometry: RobustnessGeometry,
  solver: CharacteristicOpenBoundarySolver,
): CylinderRelativeLocation {
  const relativeXCells = gridLocation.x - geometry.cylinderCenterX;
  const relativeYCells = periodicRelativeY(
    gridLocation.y,
    geometry.cylinderCenterY,
    geometry.ny,
  );
  const radialDistanceCells = Math.hypot(relativeXCells, relativeYCells);
  const surfaceClearanceCells = radialDistanceCells - geometry.cylinderRadius;
  let adjacentToSolid = false;
  for (let dy = -1; dy <= 1 && !adjacentToSolid; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      if (solver.isSolid(gridLocation.x + dx, gridLocation.y + dy)) {
        adjacentToSolid = true;
        break;
      }
    }
  }
  return {
    x: gridLocation.x,
    y: gridLocation.y,
    relativeXCells,
    relativeYCells,
    radialDistanceCells,
    surfaceClearanceCells,
    adjacentToSolid,
    cylinderLocalByFrozenRule: surfaceClearanceCells
      <= STARTUP_AUDIT_CONTRACT.attributionRules
        .cylinderLocalDensityPeakMaximumSurfaceClearanceCells,
  };
}

function updateEnvelope(
  envelope: MutableEnvelope,
  inspection: SolverInspection,
  phaseStep: number,
  geometry: RobustnessGeometry,
  solver: CharacteristicOpenBoundarySolver,
): void {
  const minimumDeviation = Math.abs(inspection.minimumDensity - 1);
  const maximumDeviation = Math.abs(inspection.maximumDensity - 1);
  const useMaximum = maximumDeviation >= minimumDeviation;
  const densityDeviation = useMaximum ? maximumDeviation : minimumDeviation;
  if (densityDeviation > envelope.maximumDensityDeviation) {
    const gridLocation = useMaximum
      ? inspection.maximumDensityLocation
      : inspection.minimumDensityLocation;
    envelope.maximumDensityDeviation = densityDeviation;
    envelope.maximumDensityDeviationStep = phaseStep;
    envelope.maximumDensityDeviationSolverStep = inspection.step;
    envelope.densityExtremum = {
      phaseStep,
      solverStep: inspection.step,
      kind: useMaximum ? "maximum" : "minimum",
      density: useMaximum ? inspection.maximumDensity : inspection.minimumDensity,
      absoluteDeviation: densityDeviation,
      location: relativeLocation(gridLocation, geometry, solver),
    };
  }
  if (inspection.maximumMach > envelope.maximumMach) {
    envelope.maximumMach = inspection.maximumMach;
    envelope.maximumMachStep = phaseStep;
    envelope.maximumMachSolverStep = inspection.step;
    envelope.machExtremum = {
      phaseStep,
      solverStep: inspection.step,
      mach: inspection.maximumMach,
      location: relativeLocation(inspection.maximumSpeedLocation, geometry, solver),
    };
  }
  envelope.minimumDensity = Math.min(envelope.minimumDensity, inspection.minimumDensity);
  envelope.maximumDensity = Math.max(envelope.maximumDensity, inspection.maximumDensity);
}

function finalizeEnvelope(envelope: MutableEnvelope): StartupStabilityEnvelope {
  if (envelope.densityExtremum === undefined || envelope.machExtremum === undefined) {
    throw new Error("cannot finalize an empty startup stability envelope");
  }
  return {
    maximumDensityDeviation: envelope.maximumDensityDeviation,
    maximumDensityDeviationStep: envelope.maximumDensityDeviationStep,
    maximumDensityDeviationSolverStep: envelope.maximumDensityDeviationSolverStep,
    maximumMach: envelope.maximumMach,
    maximumMachStep: envelope.maximumMachStep,
    maximumMachSolverStep: envelope.maximumMachSolverStep,
    minimumDensity: envelope.minimumDensity,
    maximumDensity: envelope.maximumDensity,
    densityExtremum: envelope.densityExtremum,
    machExtremum: envelope.machExtremum,
  };
}

function halfCosineVelocity(
  targetVelocity: number,
  rampSteps: number,
): InletVelocityProfile {
  if (rampSteps <= 0) return () => targetVelocity;
  return (boundaryStep) => {
    if (boundaryStep <= 0) return 0;
    if (boundaryStep >= rampSteps) return targetVelocity;
    return 0.5 * targetVelocity
      * (1 - Math.cos(Math.PI * boundaryStep / rampSteps));
  };
}

function errorIdentity(error: unknown): { name: string; message: string } {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: "UnknownError", message: String(error) };
}

function executeCase(definition: StartupAuditCaseDefinition): StartupSerializedRun {
  const protocol = protocolById(definition.protocolId);
  const geometry = definition.geometry;
  const solid: CircleSolid = {
    centerX: geometry.cylinderCenterX,
    centerY: geometry.cylinderCenterY,
    radius: geometry.cylinderRadius,
  };
  const rampSteps = Math.max(
    protocol.preparationRampStepsPerDiameter,
    protocol.inAuditRampStepsPerDiameter,
  ) * definition.nominalCylinderDiameterCells;
  const velocityProfile = rampSteps > 0
    ? halfCosineVelocity(definition.inletVelocity, rampSteps)
    : null;
  const baseOptions = {
    nx: geometry.nx,
    ny: geometry.ny,
    relaxationTime: definition.relaxationTime,
    inletVelocity: definition.inletVelocity,
    outletBoundary: STARTUP_AUDIT_CONTRACT.matrix.outletBoundary,
    pressureRelaxationSigma: 0.9,
    characteristicLength: geometry.nx,
    solid,
  } as const;
  const solver = velocityProfile === null
    ? new CharacteristicOpenBoundarySolver(baseOptions)
    : new CharacteristicOpenBoundarySolver({
      ...baseOptions,
      inletVelocityProfile: velocityProfile,
    });
  if (definition.protocolId !== "impulsive-uniform") {
    solver.initializeField(() => ({ rho: 1, ux: 0, uy: 0 }));
  }

  const preparationEnvelope = emptyEnvelope();
  const auditEnvelope = emptyEnvelope();
  let phase: "preparation" | "audit" = "preparation";
  let completedPreparationSteps = 0;
  let completedAuditSteps = 0;
  try {
    for (let step = 1; step <= definition.preparationSteps; step += 1) {
      solver.step();
      updateEnvelope(preparationEnvelope, solver.inspect(), step, geometry, solver);
      completedPreparationSteps = step;
    }
    phase = "audit";
    for (let step = 1; step <= definition.auditSteps; step += 1) {
      solver.step();
      updateEnvelope(auditEnvelope, solver.inspect(), step, geometry, solver);
      completedAuditSteps = step;
    }
    return {
      status: "completed",
      completedPreparationSteps,
      completedAuditSteps,
      ...(definition.preparationSteps === 0
        ? {}
        : { preparationStability: finalizeEnvelope(preparationEnvelope) }),
      auditStability: finalizeEnvelope(auditEnvelope),
    };
  } catch (error) {
    const identity = errorIdentity(error);
    return {
      status: "failed",
      completedPreparationSteps,
      completedAuditSteps,
      ...(completedPreparationSteps === 0
        ? {}
        : { preparationStability: finalizeEnvelope(preparationEnvelope) }),
      ...(completedAuditSteps === 0
        ? {}
        : { auditStability: finalizeEnvelope(auditEnvelope) }),
      failure: {
        phase,
        nextPhaseStep: phase === "preparation"
          ? completedPreparationSteps + 1
          : completedAuditSteps + 1,
        solverStep: solver.stepNumber + 1,
        name: identity.name,
        message: identity.message,
      },
    };
  }
}

function envelopeStable(envelope: StartupStabilityEnvelope): boolean {
  return envelope.maximumDensityDeviation
      <= STARTUP_AUDIT_CONTRACT.gates.maximumDensityDeviation
    && envelope.maximumMach <= STARTUP_AUDIT_CONTRACT.gates.maximumMach;
}

function evaluateCase(definition: StartupAuditCaseDefinition): StartupAuditCaseResult {
  const run = executeCase(definition);
  const executionPass = run.status === "completed";
  const densityPass = run.auditStability !== undefined
    && run.auditStability.maximumDensityDeviation
      <= STARTUP_AUDIT_CONTRACT.gates.maximumDensityDeviation;
  const machPass = run.auditStability !== undefined
    && run.auditStability.maximumMach <= STARTUP_AUDIT_CONTRACT.gates.maximumMach;
  const auditStabilityPass = densityPass && machPass;
  const preparationStabilityPass = run.preparationStability === undefined
    ? undefined
    : envelopeStable(run.preparationStability);
  const fullHistoryStabilityPass = auditStabilityPass
    && (preparationStabilityPass ?? true);
  const failureReasons: string[] = [];
  if (!executionPass) failureReasons.push("EXECUTION_FAILED");
  if (run.auditStability !== undefined && !densityPass) {
    failureReasons.push("AUDIT_DENSITY_GATE_FAILED");
  }
  if (run.auditStability !== undefined && !machPass) {
    failureReasons.push("AUDIT_MACH_GATE_FAILED");
  }
  if (preparationStabilityPass === false) {
    failureReasons.push("PREPARATION_STABILITY_GATE_FAILED");
  }
  const pass = executionPass && auditStabilityPass;
  return {
    definition,
    run,
    gate: {
      executionPass,
      densityPass,
      machPass,
      auditStabilityPass,
      ...(preparationStabilityPass === undefined
        ? {}
        : { preparationStabilityPass }),
      fullHistoryStabilityPass,
      failureReasons,
      pass,
    },
  };
}

function runUniformGuard(
  relaxationTime: number,
  boundary: OutletBoundary,
): UniformNoSolidGuardResult {
  const guard = STARTUP_AUDIT_CONTRACT.uniformNoSolidGuard;
  const geometry = buildRobustnessGeometry(
    guard.nominalCylinderDiameterCells,
    guard.downstreamOutletDistanceDiameters,
  );
  const id = `u0800-t${scaledInteger(relaxationTime, 1_000, 4)}-${boundary}`;
  let completedSteps = 0;
  let maximumAbsoluteStateError = 0;
  try {
    const solver = new CharacteristicOpenBoundarySolver({
      nx: geometry.nx,
      ny: geometry.ny,
      relaxationTime,
      inletVelocity: guard.inletVelocityLattice,
      outletBoundary: boundary,
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
      id,
      boundary,
      relaxationTime,
      completedSteps,
      maximumAbsoluteStateError,
      pass: maximumAbsoluteStateError <= guard.maximumAbsoluteStateError,
    };
  } catch (error) {
    return {
      id,
      boundary,
      relaxationTime,
      completedSteps,
      failure: errorIdentity(error),
      pass: false,
    };
  }
}

function buildSpeedBrackets(cases: StartupAuditCaseResult[]): SpeedBracketResult[] {
  const brackets: SpeedBracketResult[] = [];
  const speeds = STARTUP_AUDIT_CONTRACT.matrix.inletVelocityLattice;
  const tolerance = STARTUP_AUDIT_CONTRACT.gates.monotonicityAbsoluteTolerance;
  for (const protocol of STARTUP_PROTOCOLS) {
    for (const diameter of STARTUP_AUDIT_CONTRACT.matrix.nominalCylinderDiameterCells) {
      for (const relaxationTime of STARTUP_AUDIT_CONTRACT.matrix.relaxationTime) {
        const selected = speeds.map((inletVelocity) => cases.find((entry) =>
          entry.definition.protocolId === protocol.id
          && entry.definition.nominalCylinderDiameterCells === diameter
          && entry.definition.relaxationTime === relaxationTime
          && entry.definition.inletVelocity === inletVelocity));
        const samples = selected.map((entry, index): SpeedBracketSample => ({
          inletVelocity: speeds[index] ?? Number.NaN,
          ...(entry?.run.auditStability === undefined
            ? {}
            : {
              maximumDensityDeviation:
                entry.run.auditStability.maximumDensityDeviation,
            }),
          stabilityPass: entry?.gate.pass ?? false,
        }));
        const completeDensitySeries = samples.every(
          (sample) => sample.maximumDensityDeviation !== undefined,
        );
        let densityDeviationMonotone = completeDensitySeries;
        for (let index = 1; index < samples.length && densityDeviationMonotone; index += 1) {
          const previous = samples[index - 1]?.maximumDensityDeviation;
          const current = samples[index]?.maximumDensityDeviation;
          densityDeviationMonotone = previous !== undefined
            && current !== undefined
            && current + tolerance >= previous;
        }
        const passing = samples.filter((sample) => sample.stabilityPass);
        const failing = samples.filter((sample) => !sample.stabilityPass);
        const highestPassingVelocity = passing.length === 0
          ? undefined
          : Math.max(...passing.map((sample) => sample.inletVelocity));
        const lowestFailingVelocity = failing.length === 0
          ? undefined
          : Math.min(...failing.map((sample) => sample.inletVelocity));
        const bracketWidth = highestPassingVelocity === undefined
          || lowestFailingVelocity === undefined
          ? undefined
          : lowestFailingVelocity - highestPassingVelocity;
        const lowEndpointPass = samples[0]?.stabilityPass ?? false;
        const highEndpointFail = !(samples.at(-1)?.stabilityPass ?? true);
        const sampledBracketPass = lowEndpointPass
          && highEndpointFail
          && bracketWidth !== undefined
          && bracketWidth > 0
          && bracketWidth
            <= STARTUP_AUDIT_CONTRACT.gates.maximumSampledBracketWidth + tolerance;
        brackets.push({
          protocolId: protocol.id,
          relaxationTime,
          nominalCylinderDiameterCells: diameter,
          samples,
          densityDeviationMonotone,
          lowEndpointPass,
          highEndpointFail,
          ...(highestPassingVelocity === undefined
            ? {}
            : { highestPassingVelocity }),
          ...(lowestFailingVelocity === undefined
            ? {}
            : { lowestFailingVelocity }),
          ...(bracketWidth === undefined ? {} : { bracketWidth }),
          sampledBracketPass,
        });
      }
    }
  }
  return brackets;
}

function maximumCaseValue(
  cases: StartupAuditCaseResult[],
  selector: (entry: StartupAuditCaseResult) => number | undefined,
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

function summarizeProtocols(cases: StartupAuditCaseResult[]): ProtocolSummary[] {
  const highSpeed = STARTUP_AUDIT_CONTRACT.attributionRules.highSpeedLevel;
  return STARTUP_PROTOCOLS.map((protocol) => {
    const selected = cases.filter((entry) => entry.definition.protocolId === protocol.id);
    const high = selected.filter((entry) => entry.definition.inletVelocity === highSpeed);
    const worstAuditDensityDeviation = maximumCaseValue(
      selected,
      (entry) => entry.run.auditStability?.maximumDensityDeviation,
    );
    const worstPreparationDensityDeviation = maximumCaseValue(
      selected,
      (entry) => entry.run.preparationStability?.maximumDensityDeviation,
    );
    return {
      protocolId: protocol.id,
      totalCases: selected.length,
      completedCases: selected.filter((entry) => entry.gate.executionPass).length,
      auditStableCases: selected.filter((entry) => entry.gate.auditStabilityPass).length,
      fullHistoryStableCases:
        selected.filter((entry) => entry.gate.fullHistoryStabilityPass).length,
      highSpeedTotalCases: high.length,
      highSpeedAuditStableCases:
        high.filter((entry) => entry.gate.auditStabilityPass).length,
      highSpeedFullHistoryStableCases:
        high.filter((entry) => entry.gate.fullHistoryStabilityPass).length,
      ...(worstAuditDensityDeviation === undefined
        ? {}
        : { worstAuditDensityDeviation }),
      ...(worstPreparationDensityDeviation === undefined
        ? {}
        : { worstPreparationDensityDeviation }),
    };
  });
}

function protocolSummary(
  summaries: ProtocolSummary[],
  protocolId: StartupProtocolId,
): ProtocolSummary {
  const summary = summaries.find((entry) => entry.protocolId === protocolId);
  if (summary === undefined) throw new Error(`missing protocol summary: ${protocolId}`);
  return summary;
}

function buildAttribution(
  cases: StartupAuditCaseResult[],
  summaries: ProtocolSummary[],
): StartupAuditAttribution {
  const rules = STARTUP_AUDIT_CONTRACT.attributionRules;
  const impulsive = protocolSummary(summaries, "impulsive-uniform");
  const smooth = protocolSummary(summaries, "cosine-ramp-from-rest");
  const compatible = protocolSummary(summaries, "compatible-ramp-preconditioned");
  const impulsiveHigh = cases.filter((entry) =>
    entry.definition.protocolId === "impulsive-uniform"
    && entry.definition.inletVelocity === rules.highSpeedLevel);
  const impulsiveFailureReproduced = impulsive.highSpeedAuditStableCases
    === rules.impulsiveFailureReproducedWhenStableCases;
  const smoothRampRemovesHighSpeedFailure = impulsiveFailureReproduced
    && smooth.highSpeedAuditStableCases
      === rules.alternativeRemovesHighSpeedFailureWhenStableCases;
  const compatibleHoldRemovesHighSpeedAuditFailure = impulsiveFailureReproduced
    && compatible.highSpeedAuditStableCases
      === rules.alternativeRemovesHighSpeedFailureWhenStableCases;
  const impulsiveHighSpeedPeaksAllCylinderLocal = impulsiveHigh.length
      === rules.alternativeRemovesHighSpeedFailureWhenStableCases
    && impulsiveHigh.every((entry) =>
      entry.run.auditStability?.densityExtremum.location
        .cylinderLocalByFrozenRule === true);
  let statement: string;
  if (smoothRampRemovesHighSpeedFailure
    && compatibleHoldRemovesHighSpeedAuditFailure) {
    statement = "Within A8D, removing the uniform impulsive start is sufficient to remove every sampled high-speed audit-window density failure; this does not isolate the lattice cylinder from the collision kernel.";
  } else if (compatibleHoldRemovesHighSpeedAuditFailure) {
    statement = "Within A8D, the preconditioned hold is stable at every high-speed corner, but the in-audit ramp is not; acceleration history remains part of the unresolved interaction.";
  } else if (smoothRampRemovesHighSpeedFailure) {
    statement = "Within A8D, the smooth in-audit ramp removes every sampled high-speed failure, but the preconditioned hold does not; the result is internally inconsistent and requires further audit.";
  } else {
    statement = "A8D does not remove every sampled high-speed density failure with the alternative startup protocols; lattice-cylinder and collision-kernel interactions remain unresolved.";
  }
  return {
    highSpeedLevel: rules.highSpeedLevel,
    impulsiveHighSpeedStableCases: impulsive.highSpeedAuditStableCases,
    smoothRampHighSpeedStableCases: smooth.highSpeedAuditStableCases,
    compatibleHoldHighSpeedStableCases: compatible.highSpeedAuditStableCases,
    compatibleHoldHighSpeedFullHistoryStableCases:
      compatible.highSpeedFullHistoryStableCases,
    impulsiveFailureReproduced,
    smoothRampRemovesHighSpeedFailure,
    compatibleHoldRemovesHighSpeedAuditFailure,
    impulsiveHighSpeedPeaksAllCylinderLocal,
    statement,
  };
}

export function runStartupAuditMatrix(
  onProgress?: (progress: StartupAuditProgress) => void,
): StartupAuditResult {
  const uniformNoSolidGuards: UniformNoSolidGuardResult[] = [];
  for (const relaxationTime of STARTUP_AUDIT_CONTRACT.uniformNoSolidGuard
    .relaxationTime) {
    for (const boundary of STARTUP_AUDIT_CONTRACT.uniformNoSolidGuard
      .outletBoundaries) {
      uniformNoSolidGuards.push(runUniformGuard(relaxationTime, boundary));
    }
  }

  const definitions = buildStartupAuditCases();
  const cases: StartupAuditCaseResult[] = [];
  for (const definition of definitions) {
    const result = evaluateCase(definition);
    cases.push(result);
    onProgress?.({
      completedCases: cases.length,
      totalCases: definitions.length,
      caseId: definition.id,
      protocolId: definition.protocolId,
      pass: result.gate.pass,
    });
  }
  const speedBrackets = buildSpeedBrackets(cases);
  const protocolSummaries = summarizeProtocols(cases);
  const summary: StartupAuditSummary = {
    totalMatrixCases: cases.length,
    completedMatrixCases: cases.filter((entry) => entry.gate.executionPass).length,
    failedMatrixCases: cases.filter((entry) => !entry.gate.executionPass).length,
    auditStableCases: cases.filter((entry) => entry.gate.auditStabilityPass).length,
    fullHistoryStableCases:
      cases.filter((entry) => entry.gate.fullHistoryStabilityPass).length,
    totalUniformGuardCases: uniformNoSolidGuards.length,
    passedUniformGuardCases: uniformNoSolidGuards.filter((entry) => entry.pass).length,
    protocolSummaries,
  };
  const matrixComplete = cases.length === 243
    && summary.completedMatrixCases === cases.length;
  const uniformNoSolidGuardsPass = uniformNoSolidGuards.length === 9
    && uniformNoSolidGuards.every((entry) => entry.pass);
  const impulsiveBrackets = speedBrackets.filter(
    (entry) => entry.protocolId === "impulsive-uniform",
  );
  const impulsiveEndpointBracketsPass = impulsiveBrackets.length === 9
    && impulsiveBrackets.every((entry) => entry.sampledBracketPass);
  const impulsiveDensityMonotonicityPass = impulsiveBrackets.length === 9
    && impulsiveBrackets.every((entry) => entry.densityDeviationMonotone);
  const pass = matrixComplete
    && uniformNoSolidGuardsPass
    && impulsiveEndpointBracketsPass
    && impulsiveDensityMonotonicityPass;
  const attribution = buildAttribution(cases, protocolSummaries);
  return {
    format: "VP-A8D-CBC2D-STARTUP-AUDIT-MATRIX-v1",
    contract: STARTUP_AUDIT_CONTRACT,
    matrixComplete,
    uniformNoSolidGuards,
    cases,
    speedBrackets,
    attribution,
    summary,
    decision: {
      code: pass
        ? "PASS-A8D-CBC2D-STARTUP-AUDIT-INTERNAL-GATES-CANDIDATE-ONLY"
        : "NO-GO-A8D-CBC2D-STARTUP-AUDIT-INTERNAL-GATES",
      pass,
      internalChecks: {
        matrixComplete,
        uniformNoSolidGuardsPass,
        impulsiveEndpointBracketsPass,
        impulsiveDensityMonotonicityPass,
      },
      externalChecksRequired: Object.freeze([
        "A8C impulsive anchors exact against frozen artifact",
        "independent A8D JSON repeat byte-identical",
      ]),
      formalIntegrationUnlocked: false,
      statement: pass
        ? "The frozen A8D internal diagnostic gates pass; external anchor and byte-repeat assertions remain mandatory before reporting the audit as reproducible."
        : "At least one frozen A8D internal diagnostic gate failed; formal integration remains locked.",
    },
  };
}
