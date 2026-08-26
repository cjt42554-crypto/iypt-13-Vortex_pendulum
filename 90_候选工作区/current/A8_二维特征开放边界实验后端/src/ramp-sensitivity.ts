import { CS, CS2 } from "./d2q9.ts";
import { RAMP_SENSITIVITY_CONTRACT } from "./ramp-sensitivity-contract.ts";
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

export interface RampSensitivityCaseDefinition {
  id: string;
  inletVelocity: number;
  meanMach: number;
  relaxationTime: number;
  viscosity: number;
  nominalCylinderDiameterCells: number;
  nominalReynoldsNumber: number;
  rampDurationDiameters: number;
  rampSteps: number;
  auditSteps: number;
  geometry: RobustnessGeometry;
}

export interface RampExtremumLocation {
  x: number;
  y: number;
  relativeXCells: number;
  relativeYCells: number;
  surfaceClearanceCells: number;
  adjacentToSolid: boolean;
}

export interface RampStabilityEnvelope {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumMach: number;
  maximumMachStep: number;
  minimumDensity: number;
  maximumDensity: number;
  densityExtremum: {
    kind: "minimum" | "maximum";
    density: number;
    location: RampExtremumLocation;
  };
  machExtremumLocation: RampExtremumLocation;
}

interface MutableRampEnvelope {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumMach: number;
  maximumMachStep: number;
  minimumDensity: number;
  maximumDensity: number;
  densityExtremum?: RampStabilityEnvelope["densityExtremum"];
  machExtremumLocation?: RampExtremumLocation;
}

export interface RampSensitivityCaseResult {
  definition: RampSensitivityCaseDefinition;
  run: {
    status: "completed" | "failed";
    completedSteps: number;
    stability?: RampStabilityEnvelope;
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

export interface RampDurationSample {
  rampDurationDiameters: number;
  rampSteps: number;
  maximumDensityDeviation?: number;
  maximumMach?: number;
  pass: boolean;
}

export interface RampCornerResult {
  nominalCylinderDiameterCells: number;
  relaxationTime: number;
  samples: RampDurationSample[];
  densityDeviationNonIncreasing: boolean;
  longestRampPass: boolean;
  shortestPassingRampDurationDiameters?: number;
  longestFailingRampDurationDiameters?: number;
  transitionBracketWidthDiameters?: number;
}

export interface RampSensitivityResult {
  format: "VP-A8E-CBC2D-RAMP-SENSITIVITY-MATRIX-v1";
  contract: typeof RAMP_SENSITIVITY_CONTRACT;
  matrixComplete: boolean;
  cases: RampSensitivityCaseResult[];
  corners: RampCornerResult[];
  summary: {
    totalCases: number;
    completedCases: number;
    stableCases: number;
    boundaryStepFromRestStableCases: number;
    longestRampStableCases: number;
    monotoneCorners: number;
    worstDensityDeviation: { caseId: string; value: number };
    worstMach: { caseId: string; value: number };
  };
  interpretation: {
    uniformImpulsiveA8dHighSpeedStableCases: number;
    boundaryStepFromRestStableCases: number;
    allBoundaryStepsFromRestStable: boolean;
    statement: string;
  };
  decision: {
    code: string;
    pass: boolean;
    internalChecks: {
      matrixComplete: boolean;
      longestRampPassAtEveryCorner: boolean;
      densityDeviationNonIncreasingAtEveryCorner: boolean;
    };
    externalChecksRequired: readonly string[];
    formalIntegrationUnlocked: false;
    statement: string;
  };
}

export interface RampSensitivityProgress {
  completedCases: number;
  totalCases: number;
  caseId: string;
  pass: boolean;
}

function scaledInteger(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

function rampId(rampDurationDiameters: number): string {
  return `r${scaledInteger(rampDurationDiameters, 100, 4)}`;
}

export function buildRampSensitivityCases(): RampSensitivityCaseDefinition[] {
  const definitions: RampSensitivityCaseDefinition[] = [];
  const contract = RAMP_SENSITIVITY_CONTRACT;
  for (const diameter of contract.matrix.nominalCylinderDiameterCells) {
    const geometry = buildRobustnessGeometry(
      diameter,
      contract.matrix.downstreamOutletDistanceDiameters,
    );
    for (const relaxationTime of contract.matrix.relaxationTime) {
      const viscosity = CS2 * (relaxationTime - 0.5);
      for (const rampDurationDiameters of contract.matrix.rampDurationDiameters) {
        const rampSteps = rampDurationDiameters * diameter;
        if (!Number.isInteger(rampSteps)) {
          throw new RangeError("frozen A8E ramp duration does not map to integer steps");
        }
        definitions.push({
          id: [
            `d${scaledInteger(diameter, 1, 2)}`,
            "u0800",
            `t${scaledInteger(relaxationTime, 1_000, 4)}`,
            rampId(rampDurationDiameters),
          ].join("-"),
          inletVelocity: contract.matrix.inletVelocityLattice,
          meanMach: contract.matrix.inletVelocityLattice / CS,
          relaxationTime,
          viscosity,
          nominalCylinderDiameterCells: diameter,
          nominalReynoldsNumber:
            contract.matrix.inletVelocityLattice * diameter / viscosity,
          rampDurationDiameters,
          rampSteps,
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
): InletVelocityProfile {
  if (rampSteps === 0) return () => targetVelocity;
  return (boundaryStep) => {
    if (boundaryStep <= 0) return 0;
    if (boundaryStep >= rampSteps) return targetVelocity;
    return 0.5 * targetVelocity
      * (1 - Math.cos(Math.PI * boundaryStep / rampSteps));
  };
}

function emptyEnvelope(): MutableRampEnvelope {
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

function locate(
  location: GridLocation,
  geometry: RobustnessGeometry,
  solver: CharacteristicOpenBoundarySolver,
): RampExtremumLocation {
  const relativeXCells = location.x - geometry.cylinderCenterX;
  const relativeYCells = periodicRelativeY(
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
    relativeXCells,
    relativeYCells,
    surfaceClearanceCells:
      Math.hypot(relativeXCells, relativeYCells) - geometry.cylinderRadius,
    adjacentToSolid,
  };
}

function updateEnvelope(
  envelope: MutableRampEnvelope,
  inspection: SolverInspection,
  geometry: RobustnessGeometry,
  solver: CharacteristicOpenBoundarySolver,
): void {
  const minimumDeviation = Math.abs(inspection.minimumDensity - 1);
  const maximumDeviation = Math.abs(inspection.maximumDensity - 1);
  const useMaximum = maximumDeviation >= minimumDeviation;
  const densityDeviation = useMaximum ? maximumDeviation : minimumDeviation;
  if (densityDeviation > envelope.maximumDensityDeviation) {
    envelope.maximumDensityDeviation = densityDeviation;
    envelope.maximumDensityDeviationStep = inspection.step;
    envelope.densityExtremum = {
      kind: useMaximum ? "maximum" : "minimum",
      density: useMaximum ? inspection.maximumDensity : inspection.minimumDensity,
      location: locate(
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
    envelope.machExtremumLocation = locate(
      inspection.maximumSpeedLocation,
      geometry,
      solver,
    );
  }
  envelope.minimumDensity = Math.min(envelope.minimumDensity, inspection.minimumDensity);
  envelope.maximumDensity = Math.max(envelope.maximumDensity, inspection.maximumDensity);
}

function finalizeEnvelope(envelope: MutableRampEnvelope): RampStabilityEnvelope {
  if (envelope.densityExtremum === undefined
    || envelope.machExtremumLocation === undefined) {
    throw new Error("cannot finalize empty A8E envelope");
  }
  return {
    maximumDensityDeviation: envelope.maximumDensityDeviation,
    maximumDensityDeviationStep: envelope.maximumDensityDeviationStep,
    maximumMach: envelope.maximumMach,
    maximumMachStep: envelope.maximumMachStep,
    minimumDensity: envelope.minimumDensity,
    maximumDensity: envelope.maximumDensity,
    densityExtremum: envelope.densityExtremum,
    machExtremumLocation: envelope.machExtremumLocation,
  };
}

function errorIdentity(error: unknown): { name: string; message: string } {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: "UnknownError", message: String(error) };
}

function evaluateCase(
  definition: RampSensitivityCaseDefinition,
): RampSensitivityCaseResult {
  const geometry = definition.geometry;
  const solid: CircleSolid = {
    centerX: geometry.cylinderCenterX,
    centerY: geometry.cylinderCenterY,
    radius: geometry.cylinderRadius,
  };
  const solver = new CharacteristicOpenBoundarySolver({
    nx: geometry.nx,
    ny: geometry.ny,
    relaxationTime: definition.relaxationTime,
    inletVelocity: definition.inletVelocity,
    inletVelocityProfile: halfCosineVelocity(
      definition.inletVelocity,
      definition.rampSteps,
    ),
    outletBoundary: RAMP_SENSITIVITY_CONTRACT.matrix.outletBoundary,
    pressureRelaxationSigma: 0.9,
    characteristicLength: geometry.nx,
    solid,
  });
  solver.initializeField(() => ({ rho: 1, ux: 0, uy: 0 }));
  const envelope = emptyEnvelope();
  let completedSteps = 0;
  let status: "completed" | "failed" = "completed";
  let failure: { nextStep: number; name: string; message: string } | undefined;
  try {
    for (let step = 1; step <= definition.auditSteps; step += 1) {
      solver.step();
      updateEnvelope(envelope, solver.inspect(), geometry, solver);
      completedSteps = step;
    }
  } catch (error) {
    status = "failed";
    failure = {
      nextStep: completedSteps + 1,
      ...errorIdentity(error),
    };
  }
  const stability = completedSteps === 0 ? undefined : finalizeEnvelope(envelope);
  const executionPass = status === "completed";
  const densityPass = stability !== undefined
    && stability.maximumDensityDeviation
      <= RAMP_SENSITIVITY_CONTRACT.gates.maximumDensityDeviation;
  const machPass = stability !== undefined
    && stability.maximumMach <= RAMP_SENSITIVITY_CONTRACT.gates.maximumMach;
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
    gate: {
      executionPass,
      densityPass,
      machPass,
      failureReasons,
      pass,
    },
  };
}

function buildCorners(cases: RampSensitivityCaseResult[]): RampCornerResult[] {
  const corners: RampCornerResult[] = [];
  const tolerance = RAMP_SENSITIVITY_CONTRACT.gates.monotonicityAbsoluteTolerance;
  for (const diameter of RAMP_SENSITIVITY_CONTRACT.matrix
    .nominalCylinderDiameterCells) {
    for (const relaxationTime of RAMP_SENSITIVITY_CONTRACT.matrix.relaxationTime) {
      const selected = cases.filter((entry) =>
        entry.definition.nominalCylinderDiameterCells === diameter
        && entry.definition.relaxationTime === relaxationTime);
      const samples = RAMP_SENSITIVITY_CONTRACT.matrix.rampDurationDiameters
        .map((duration): RampDurationSample => {
          const entry = selected.find(
            (candidate) => candidate.definition.rampDurationDiameters === duration,
          );
          return {
            rampDurationDiameters: duration,
            rampSteps: entry?.definition.rampSteps ?? Number.NaN,
            ...(entry?.run.stability === undefined
              ? {}
              : {
                maximumDensityDeviation:
                  entry.run.stability.maximumDensityDeviation,
                maximumMach: entry.run.stability.maximumMach,
              }),
            pass: entry?.gate.pass ?? false,
          };
        });
      let densityDeviationNonIncreasing = samples.every(
        (sample) => sample.maximumDensityDeviation !== undefined,
      );
      for (let index = 1;
        index < samples.length && densityDeviationNonIncreasing;
        index += 1) {
        const previous = samples[index - 1]?.maximumDensityDeviation;
        const current = samples[index]?.maximumDensityDeviation;
        densityDeviationNonIncreasing = previous !== undefined
          && current !== undefined
          && current <= previous + tolerance;
      }
      const passingDurations = samples
        .filter((sample) => sample.pass)
        .map((sample) => sample.rampDurationDiameters);
      const failingDurations = samples
        .filter((sample) => !sample.pass)
        .map((sample) => sample.rampDurationDiameters);
      const shortestPassingRampDurationDiameters = passingDurations.length === 0
        ? undefined
        : Math.min(...passingDurations);
      const longestFailingRampDurationDiameters = failingDurations.length === 0
        ? undefined
        : Math.max(...failingDurations);
      const transitionBracketWidthDiameters =
        shortestPassingRampDurationDiameters === undefined
          || longestFailingRampDurationDiameters === undefined
          ? undefined
          : shortestPassingRampDurationDiameters
            - longestFailingRampDurationDiameters;
      corners.push({
        nominalCylinderDiameterCells: diameter,
        relaxationTime,
        samples,
        densityDeviationNonIncreasing,
        longestRampPass: samples.at(-1)?.pass ?? false,
        ...(shortestPassingRampDurationDiameters === undefined
          ? {}
          : { shortestPassingRampDurationDiameters }),
        ...(longestFailingRampDurationDiameters === undefined
          ? {}
          : { longestFailingRampDurationDiameters }),
        ...(transitionBracketWidthDiameters === undefined
          ? {}
          : { transitionBracketWidthDiameters }),
      });
    }
  }
  return corners;
}

function maximumResult(
  cases: RampSensitivityCaseResult[],
  selector: (entry: RampSensitivityCaseResult) => number | undefined,
): { caseId: string; value: number } {
  let result: { caseId: string; value: number } | undefined;
  for (const entry of cases) {
    const value = selector(entry);
    if (value === undefined) continue;
    if (result === undefined || value > result.value) {
      result = { caseId: entry.definition.id, value };
    }
  }
  if (result === undefined) throw new Error("A8E matrix contains no completed values");
  return result;
}

export function runRampSensitivityMatrix(
  onProgress?: (progress: RampSensitivityProgress) => void,
): RampSensitivityResult {
  const definitions = buildRampSensitivityCases();
  const cases: RampSensitivityCaseResult[] = [];
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
  const corners = buildCorners(cases);
  const matrixComplete = cases.length === 72
    && cases.every((entry) => entry.gate.executionPass);
  const longestRampPassAtEveryCorner = corners.length === 9
    && corners.every((entry) => entry.longestRampPass);
  const densityDeviationNonIncreasingAtEveryCorner = corners.length === 9
    && corners.every((entry) => entry.densityDeviationNonIncreasing);
  const pass = matrixComplete
    && longestRampPassAtEveryCorner
    && densityDeviationNonIncreasingAtEveryCorner;
  const boundaryStepFromRestStableCases = cases.filter((entry) =>
    entry.definition.rampDurationDiameters === 0 && entry.gate.pass).length;
  const allBoundaryStepsFromRestStable = boundaryStepFromRestStableCases
    === RAMP_SENSITIVITY_CONTRACT.interpretationRules.frozenCornerCount;
  return {
    format: "VP-A8E-CBC2D-RAMP-SENSITIVITY-MATRIX-v1",
    contract: RAMP_SENSITIVITY_CONTRACT,
    matrixComplete,
    cases,
    corners,
    summary: {
      totalCases: cases.length,
      completedCases: cases.filter((entry) => entry.gate.executionPass).length,
      stableCases: cases.filter((entry) => entry.gate.pass).length,
      boundaryStepFromRestStableCases,
      longestRampStableCases: cases.filter((entry) =>
        entry.definition.rampDurationDiameters === 20 && entry.gate.pass).length,
      monotoneCorners:
        corners.filter((entry) => entry.densityDeviationNonIncreasing).length,
      worstDensityDeviation: maximumResult(
        cases,
        (entry) => entry.run.stability?.maximumDensityDeviation,
      ),
      worstMach: maximumResult(cases, (entry) => entry.run.stability?.maximumMach),
    },
    interpretation: {
      uniformImpulsiveA8dHighSpeedStableCases:
        RAMP_SENSITIVITY_CONTRACT.interpretationRules
          .uniformImpulsiveA8dHighSpeedStableCases,
      boundaryStepFromRestStableCases,
      allBoundaryStepsFromRestStable,
      statement: allBoundaryStepsFromRestStable
        ? "At every frozen corner, even an inlet boundary step from a resting field passes while the inherited uniform impulsive cylinder start fails; the initial whole-field/cylinder incompatibility, not ramp duration alone, is the distinguishing A8D-A8E condition."
        : "At least one boundary-step-from-rest corner fails; the minimum stable half-cosine duration must be read from the frozen corner brackets.",
    },
    decision: {
      code: pass
        ? "PASS-A8E-CBC2D-RAMP-SENSITIVITY-INTERNAL-GATES-CANDIDATE-ONLY"
        : "NO-GO-A8E-CBC2D-RAMP-SENSITIVITY-INTERNAL-GATES",
      pass,
      internalChecks: {
        matrixComplete,
        longestRampPassAtEveryCorner,
        densityDeviationNonIncreasingAtEveryCorner,
      },
      externalChecksRequired: Object.freeze([
        "A8D twenty-diameter ramp anchors exact against frozen artifact",
        "independent A8E JSON repeat byte-identical",
      ]),
      formalIntegrationUnlocked: false,
      statement: pass
        ? "The frozen A8E internal ramp-sensitivity gates pass; external A8D-anchor and byte-repeat checks remain mandatory."
        : "At least one frozen A8E internal gate failed; no ramp-duration qualification may be promoted.",
    },
  };
}
