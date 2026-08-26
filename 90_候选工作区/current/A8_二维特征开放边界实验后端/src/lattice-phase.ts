import { CS, CS2 } from "./d2q9.ts";
import {
  LATTICE_PHASE_CONTRACT,
  LATTICE_PHASE_STARTUP_PROTOCOLS,
  type LatticePhaseStartupProtocolId,
} from "./lattice-phase-contract.ts";
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

export interface LatticePhaseCaseDefinition {
  id: string;
  startupProtocolId: LatticePhaseStartupProtocolId;
  inletVelocity: number;
  relaxationTime: number;
  viscosity: number;
  nominalCylinderDiameterCells: number;
  nominalReynoldsNumber: number;
  centerXPhaseOffsetCells: number;
  centerYPhaseOffsetCells: number;
  actualCylinderCenterX: number;
  actualCylinderCenterY: number;
  solidCellCount: number;
  solidMaskFingerprint: string;
  rampSteps: number;
  auditSteps: number;
  geometry: RobustnessGeometry;
}

export interface LatticePhaseStability {
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
    relativeXCells: number;
    relativeYCells: number;
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
  densityExtremum?: LatticePhaseStability["densityExtremum"];
}

export interface LatticePhaseCaseResult {
  definition: LatticePhaseCaseDefinition;
  run: {
    status: "completed" | "failed";
    completedSteps: number;
    stability?: LatticePhaseStability;
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

export interface LatticePhaseSummary {
  centerXPhaseOffsetCells: number;
  centerYPhaseOffsetCells: number;
  totalCases: number;
  completedCases: number;
  impulsiveStableCorners: number;
  rampStableCorners: number;
  frozenPatternPass: boolean;
  worstImpulsiveDensityDeviation: { caseId: string; value: number };
  worstRampDensityDeviation: { caseId: string; value: number };
}

export interface SolidMaskSummary {
  nominalCylinderDiameterCells: number;
  phaseCount: number;
  distinctSolidMaskFingerprints: number;
  solidCellCountRange: { minimum: number; maximum: number };
  fingerprintCounts: Record<string, number>;
  diversityPass: boolean;
}

export interface LatticePhaseResult {
  format: "VP-A8G-CBC2D-LATTICE-PHASE-MATRIX-v1";
  contract: typeof LATTICE_PHASE_CONTRACT;
  matrixComplete: boolean;
  cases: LatticePhaseCaseResult[];
  phaseSummaries: LatticePhaseSummary[];
  solidMaskSummaries: SolidMaskSummary[];
  summary: {
    totalCases: number;
    completedCases: number;
    impulsiveStableCases: number;
    rampStableCases: number;
    phasesPassingFrozenPattern: number;
    worstImpulsiveDensityDeviation: { caseId: string; value: number };
    worstRampDensityDeviation: { caseId: string; value: number };
  };
  decision: {
    code: string;
    pass: boolean;
    internalChecks: {
      matrixComplete: boolean;
      solidMaskDiversityPass: boolean;
      everyPhaseStartupPatternPass: boolean;
    };
    externalChecksRequired: readonly string[];
    formalIntegrationUnlocked: false;
    latticePhaseInvarianceIsBounceBackModelValidation: false;
    statement: string;
  };
}

export interface LatticePhaseProgress {
  completedCases: number;
  totalCases: number;
  caseId: string;
  pass: boolean;
}

function scaledInteger(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

function solidMaskIdentity(
  geometry: RobustnessGeometry,
  centerX: number,
  centerY: number,
): { solidCellCount: number; solidMaskFingerprint: string } {
  let hash = 0x811c9dc5;
  let solidCellCount = 0;
  for (let y = 0; y < geometry.ny; y += 1) {
    for (let x = 0; x < geometry.nx; x += 1) {
      const dx = x - centerX;
      const dyRaw = Math.abs(y - centerY);
      const dy = Math.min(dyRaw, geometry.ny - dyRaw);
      const solid = Math.hypot(dx, dy) <= geometry.cylinderRadius ? 1 : 0;
      solidCellCount += solid;
      hash = Math.imul(hash ^ solid, 0x01000193) >>> 0;
    }
  }
  return {
    solidCellCount,
    solidMaskFingerprint: hash.toString(16).padStart(8, "0"),
  };
}

export function buildLatticePhaseCases(): LatticePhaseCaseDefinition[] {
  const definitions: LatticePhaseCaseDefinition[] = [];
  const contract = LATTICE_PHASE_CONTRACT;
  for (const diameter of contract.matrix.nominalCylinderDiameterCells) {
    const geometry = buildRobustnessGeometry(
      diameter,
      contract.matrix.downstreamOutletDistanceDiameters,
    );
    for (const relaxationTime of contract.matrix.relaxationTime) {
      const viscosity = CS2 * (relaxationTime - 0.5);
      for (const phaseX of contract.matrix.centerXPhaseOffsetCells) {
        for (const phaseY of contract.matrix.centerYPhaseOffsetCells) {
          const actualCylinderCenterX = geometry.cylinderCenterX + phaseX;
          const actualCylinderCenterY = geometry.cylinderCenterY + phaseY;
          const mask = solidMaskIdentity(
            geometry,
            actualCylinderCenterX,
            actualCylinderCenterY,
          );
          for (const protocol of LATTICE_PHASE_STARTUP_PROTOCOLS) {
            definitions.push({
              id: [
                `d${scaledInteger(diameter, 1, 2)}`,
                "u0800",
                `t${scaledInteger(relaxationTime, 1_000, 4)}`,
                `px${scaledInteger(phaseX, 100, 3)}`,
                `py${scaledInteger(phaseY, 100, 3)}`,
                `p-${protocol.id}`,
              ].join("-"),
              startupProtocolId: protocol.id,
              inletVelocity: contract.matrix.inletVelocityLattice,
              relaxationTime,
              viscosity,
              nominalCylinderDiameterCells: diameter,
              nominalReynoldsNumber:
                contract.matrix.inletVelocityLattice * diameter / viscosity,
              centerXPhaseOffsetCells: phaseX,
              centerYPhaseOffsetCells: phaseY,
              actualCylinderCenterX,
              actualCylinderCenterY,
              solidCellCount: mask.solidCellCount,
              solidMaskFingerprint: mask.solidMaskFingerprint,
              rampSteps: protocol.rampDurationDiameters * diameter,
              auditSteps: geometry.steps,
              geometry,
            });
          }
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

function locateDensityExtremum(
  kind: "minimum" | "maximum",
  density: number,
  location: GridLocation,
  definition: LatticePhaseCaseDefinition,
  solver: CharacteristicOpenBoundarySolver,
): LatticePhaseStability["densityExtremum"] {
  const relativeXCells = location.x - definition.actualCylinderCenterX;
  const relativeYCells = periodicRelativeY(
    location.y,
    definition.actualCylinderCenterY,
    definition.geometry.ny,
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
    kind,
    density,
    x: location.x,
    y: location.y,
    relativeXCells,
    relativeYCells,
    surfaceClearanceCells:
      Math.hypot(relativeXCells, relativeYCells)
      - definition.geometry.cylinderRadius,
    adjacentToSolid,
  };
}

function updateStability(
  envelope: MutableStability,
  inspection: SolverInspection,
  definition: LatticePhaseCaseDefinition,
  solver: CharacteristicOpenBoundarySolver,
): void {
  const minimumDeviation = Math.abs(inspection.minimumDensity - 1);
  const maximumDeviation = Math.abs(inspection.maximumDensity - 1);
  const useMaximum = maximumDeviation >= minimumDeviation;
  const deviation = useMaximum ? maximumDeviation : minimumDeviation;
  if (deviation > envelope.maximumDensityDeviation) {
    envelope.maximumDensityDeviation = deviation;
    envelope.maximumDensityDeviationStep = inspection.step;
    envelope.densityExtremum = locateDensityExtremum(
      useMaximum ? "maximum" : "minimum",
      useMaximum ? inspection.maximumDensity : inspection.minimumDensity,
      useMaximum
        ? inspection.maximumDensityLocation
        : inspection.minimumDensityLocation,
      definition,
      solver,
    );
  }
  if (inspection.maximumMach > envelope.maximumMach) {
    envelope.maximumMach = inspection.maximumMach;
    envelope.maximumMachStep = inspection.step;
  }
  envelope.minimumDensity = Math.min(envelope.minimumDensity, inspection.minimumDensity);
  envelope.maximumDensity = Math.max(envelope.maximumDensity, inspection.maximumDensity);
}

function finalizeStability(envelope: MutableStability): LatticePhaseStability {
  if (envelope.densityExtremum === undefined) {
    throw new Error("cannot finalize empty A8G stability envelope");
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

function evaluateCase(definition: LatticePhaseCaseDefinition): LatticePhaseCaseResult {
  const isRamp = definition.startupProtocolId === "cosine-ramp-from-rest-5d";
  const solid: CircleSolid = {
    centerX: definition.actualCylinderCenterX,
    centerY: definition.actualCylinderCenterY,
    radius: definition.geometry.cylinderRadius,
  };
  const baseOptions = {
    nx: definition.geometry.nx,
    ny: definition.geometry.ny,
    relaxationTime: definition.relaxationTime,
    collisionKernel: LATTICE_PHASE_CONTRACT.matrix.collisionKernel,
    inletVelocity: definition.inletVelocity,
    outletBoundary: LATTICE_PHASE_CONTRACT.matrix.outletBoundary,
    pressureRelaxationSigma: 0.9,
    characteristicLength: definition.geometry.nx,
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
      updateStability(envelope, solver.inspect(), definition, solver);
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
      <= LATTICE_PHASE_CONTRACT.gates.maximumDensityDeviation;
  const machPass = stability !== undefined
    && stability.maximumMach <= LATTICE_PHASE_CONTRACT.gates.maximumMach;
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

function maximumValue(
  cases: LatticePhaseCaseResult[],
  selector: (entry: LatticePhaseCaseResult) => number | undefined,
): { caseId: string; value: number } {
  let result: { caseId: string; value: number } | undefined;
  for (const entry of cases) {
    const value = selector(entry);
    if (value === undefined) continue;
    if (result === undefined || value > result.value) {
      result = { caseId: entry.definition.id, value };
    }
  }
  if (result === undefined) throw new Error("A8G selection has no completed values");
  return result;
}

function buildPhaseSummaries(cases: LatticePhaseCaseResult[]): LatticePhaseSummary[] {
  const summaries: LatticePhaseSummary[] = [];
  for (const phaseX of LATTICE_PHASE_CONTRACT.matrix.centerXPhaseOffsetCells) {
    for (const phaseY of LATTICE_PHASE_CONTRACT.matrix.centerYPhaseOffsetCells) {
      const selected = cases.filter((entry) =>
        entry.definition.centerXPhaseOffsetCells === phaseX
        && entry.definition.centerYPhaseOffsetCells === phaseY);
      const impulsive = selected.filter(
        (entry) => entry.definition.startupProtocolId === "uniform-impulsive",
      );
      const ramp = selected.filter(
        (entry) => entry.definition.startupProtocolId
          === "cosine-ramp-from-rest-5d",
      );
      const impulsiveStableCorners = impulsive.filter((entry) => entry.gate.pass).length;
      const rampStableCorners = ramp.filter((entry) => entry.gate.pass).length;
      summaries.push({
        centerXPhaseOffsetCells: phaseX,
        centerYPhaseOffsetCells: phaseY,
        totalCases: selected.length,
        completedCases: selected.filter((entry) => entry.gate.executionPass).length,
        impulsiveStableCorners,
        rampStableCorners,
        frozenPatternPass: impulsiveStableCorners
            === LATTICE_PHASE_CONTRACT.gates.expectedImpulsiveStableCornersPerPhase
          && rampStableCorners
            === LATTICE_PHASE_CONTRACT.gates
              .expectedFiveDiameterRampStableCornersPerPhase,
        worstImpulsiveDensityDeviation: maximumValue(
          impulsive,
          (entry) => entry.run.stability?.maximumDensityDeviation,
        ),
        worstRampDensityDeviation: maximumValue(
          ramp,
          (entry) => entry.run.stability?.maximumDensityDeviation,
        ),
      });
    }
  }
  return summaries;
}

function buildMaskSummaries(
  definitions: LatticePhaseCaseDefinition[],
): SolidMaskSummary[] {
  return LATTICE_PHASE_CONTRACT.matrix.nominalCylinderDiameterCells.map((diameter) => {
    const uniquePhaseEntries = new Map<string, LatticePhaseCaseDefinition>();
    for (const definition of definitions) {
      if (definition.nominalCylinderDiameterCells !== diameter) continue;
      const phaseKey = [
        definition.centerXPhaseOffsetCells,
        definition.centerYPhaseOffsetCells,
      ].join(":");
      if (!uniquePhaseEntries.has(phaseKey)) uniquePhaseEntries.set(phaseKey, definition);
    }
    const entries = [...uniquePhaseEntries.values()];
    const fingerprintCounts: Record<string, number> = {};
    for (const entry of entries) {
      fingerprintCounts[entry.solidMaskFingerprint]
        = (fingerprintCounts[entry.solidMaskFingerprint] ?? 0) + 1;
    }
    const solidCounts = entries.map((entry) => entry.solidCellCount);
    const distinctSolidMaskFingerprints = Object.keys(fingerprintCounts).length;
    return {
      nominalCylinderDiameterCells: diameter,
      phaseCount: entries.length,
      distinctSolidMaskFingerprints,
      solidCellCountRange: {
        minimum: Math.min(...solidCounts),
        maximum: Math.max(...solidCounts),
      },
      fingerprintCounts,
      diversityPass: distinctSolidMaskFingerprints
        >= LATTICE_PHASE_CONTRACT.gates
          .minimumDistinctSolidMaskFingerprintsPerDiameter,
    };
  });
}

export function runLatticePhaseMatrix(
  onProgress?: (progress: LatticePhaseProgress) => void,
): LatticePhaseResult {
  const definitions = buildLatticePhaseCases();
  const cases: LatticePhaseCaseResult[] = [];
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
  const phaseSummaries = buildPhaseSummaries(cases);
  const solidMaskSummaries = buildMaskSummaries(definitions);
  const matrixComplete = cases.length === 288
    && cases.every((entry) => entry.gate.executionPass);
  const solidMaskDiversityPass = solidMaskSummaries.length === 3
    && solidMaskSummaries.every((entry) => entry.diversityPass);
  const everyPhaseStartupPatternPass = phaseSummaries.length === 16
    && phaseSummaries.every((entry) => entry.frozenPatternPass);
  const pass = matrixComplete
    && solidMaskDiversityPass
    && everyPhaseStartupPatternPass;
  const impulsive = cases.filter(
    (entry) => entry.definition.startupProtocolId === "uniform-impulsive",
  );
  const ramp = cases.filter(
    (entry) => entry.definition.startupProtocolId === "cosine-ramp-from-rest-5d",
  );
  return {
    format: "VP-A8G-CBC2D-LATTICE-PHASE-MATRIX-v1",
    contract: LATTICE_PHASE_CONTRACT,
    matrixComplete,
    cases,
    phaseSummaries,
    solidMaskSummaries,
    summary: {
      totalCases: cases.length,
      completedCases: cases.filter((entry) => entry.gate.executionPass).length,
      impulsiveStableCases: impulsive.filter((entry) => entry.gate.pass).length,
      rampStableCases: ramp.filter((entry) => entry.gate.pass).length,
      phasesPassingFrozenPattern:
        phaseSummaries.filter((entry) => entry.frozenPatternPass).length,
      worstImpulsiveDensityDeviation: maximumValue(
        impulsive,
        (entry) => entry.run.stability?.maximumDensityDeviation,
      ),
      worstRampDensityDeviation: maximumValue(
        ramp,
        (entry) => entry.run.stability?.maximumDensityDeviation,
      ),
    },
    decision: {
      code: pass
        ? "PASS-A8G-CBC2D-LATTICE-PHASE-INTERNAL-GATES-CANDIDATE-ONLY"
        : "NO-GO-A8G-CBC2D-LATTICE-PHASE-INTERNAL-GATES",
      pass,
      internalChecks: {
        matrixComplete,
        solidMaskDiversityPass,
        everyPhaseStartupPatternPass,
      },
      externalChecksRequired: Object.freeze([
        "base phase A8D impulsive and A8E five-diameter anchors exact",
        "independent A8G JSON repeat byte-identical",
      ]),
      formalIntegrationUnlocked: false,
      latticePhaseInvarianceIsBounceBackModelValidation: false,
      statement: pass
        ? "The frozen startup classification is unchanged across all sixteen subcell center phases; this does not validate the bounce-back model or formal MRT solver."
        : "At least one frozen A8G phase or mask-diversity gate failed; lattice-phase robustness cannot be claimed.",
    },
  };
}
