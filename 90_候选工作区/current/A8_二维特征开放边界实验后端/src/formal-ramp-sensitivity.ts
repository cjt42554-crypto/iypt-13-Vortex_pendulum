import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED,
  type LbmBodyKinematics,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { CS2 } from "./d2q9.ts";
import { FORMAL_RAMP_SENSITIVITY_CONTRACT } from "./formal-ramp-sensitivity-contract.ts";
import { type FormalKernelStability } from "./formal-kernel-startup.ts";
import {
  buildRobustnessGeometry,
  type RobustnessGeometry,
} from "./robustness.ts";

export interface FormalRampCaseDefinition {
  id: string;
  inletVelocity: number;
  relaxationTime: number;
  viscosity: number;
  nominalCylinderDiameterCells: number;
  nominalReynoldsNumber: number;
  rampDurationDiameters: number;
  rampSteps: number;
  auditSteps: number;
  geometry: RobustnessGeometry;
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

export interface FormalRampCaseResult {
  definition: FormalRampCaseDefinition;
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

export interface FormalRampDurationSample {
  rampDurationDiameters: number;
  rampSteps: number;
  maximumDensityDeviation?: number;
  maximumMach?: number;
  pass: boolean;
}

export interface FormalRampCornerResult {
  nominalCylinderDiameterCells: number;
  relaxationTime: number;
  samples: FormalRampDurationSample[];
  densityDeviationNonIncreasing: boolean;
  longestRampPass: boolean;
  shortestPassingRampDurationDiameters?: number;
  longestFailingRampDurationDiameters?: number;
  transitionBracketWidthDiameters?: number;
}

export interface FormalRampSensitivityResult {
  format: "VP-A8I-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-MATRIX-v1";
  contract: typeof FORMAL_RAMP_SENSITIVITY_CONTRACT;
  matrixComplete: boolean;
  cases: FormalRampCaseResult[];
  corners: FormalRampCornerResult[];
  durationSummaries: Array<{
    rampDurationDiameters: number;
    totalCases: number;
    stableCases: number;
    minimumDensityDeviation: number;
    maximumDensityDeviation: number;
    minimumMaximumMach: number;
    maximumMaximumMach: number;
  }>;
  summary: {
    totalCases: number;
    completedCases: number;
    stableCases: number;
    longestRampStableCases: number;
    monotoneCorners: number;
    worstDensityDeviation: { caseId: string; value: number };
    worstMach: { caseId: string; value: number };
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
    formalSourceModified: false;
    cbcIntegratedIntoFormalKernel: false;
    formalIntegrationUnlocked: false;
    statement: string;
  };
}

export interface FormalRampProgress {
  completedCases: number;
  totalCases: number;
  caseId: string;
  pass: boolean;
}

function scaledInteger(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

export function buildFormalRampSensitivityCases(): FormalRampCaseDefinition[] {
  const definitions: FormalRampCaseDefinition[] = [];
  const contract = FORMAL_RAMP_SENSITIVITY_CONTRACT;
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
          throw new RangeError("frozen A8I ramp duration does not map to integer steps");
        }
        definitions.push({
          id: [
            `d${scaledInteger(diameter, 1, 2)}`,
            "u0800",
            `t${scaledInteger(relaxationTime, 1_000, 4)}`,
            `r${scaledInteger(rampDurationDiameters, 100, 4)}`,
          ].join("-"),
          inletVelocity: contract.matrix.inletVelocityLattice,
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
  boundaryStep: number,
): number {
  if (rampSteps === 0) return targetVelocity;
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
    throw new RangeError("formal-ramp macroscopic field became non-finite");
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
    throw new Error("cannot finalize empty A8I stability envelope");
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

function evaluateCase(definition: FormalRampCaseDefinition): FormalRampCaseResult {
  const contract = FORMAL_RAMP_SENSITIVITY_CONTRACT;
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: definition.geometry.nx,
    ny: definition.geometry.ny,
    relaxationTime: definition.relaxationTime,
    penalizationTimeSteps: contract.matrix.penalizationTimeSteps,
    maskHalfThickness: contract.matrix.maskHalfThicknessCells,
    outerBoundary: contract.matrix.outerBoundary,
  });
  const body: LbmBodyKinematics = {
    centerX: definition.geometry.cylinderCenterX,
    centerY: definition.geometry.cylinderCenterY,
    radius: definition.geometry.cylinderRadius,
    velocityX: 0,
    velocityY: 0,
  };
  const envelope = emptyStability();
  let completedSteps = 0;
  let status: "completed" | "failed" = "completed";
  let failure: { nextStep: number; name: string; message: string } | undefined;
  try {
    for (let step = 1; step <= definition.auditSteps; step += 1) {
      const inletVelocity = halfCosineVelocity(
        definition.inletVelocity,
        definition.rampSteps,
        step,
      );
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
      <= contract.gates.maximumDensityDeviation;
  const machPass = stability !== undefined
    && stability.maximumMach <= contract.gates.maximumMach;
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

function buildCorners(cases: FormalRampCaseResult[]): FormalRampCornerResult[] {
  const corners: FormalRampCornerResult[] = [];
  const contract = FORMAL_RAMP_SENSITIVITY_CONTRACT;
  const tolerance = contract.gates.monotonicityAbsoluteTolerance;
  for (const diameter of contract.matrix.nominalCylinderDiameterCells) {
    for (const relaxationTime of contract.matrix.relaxationTime) {
      const selected = cases.filter((entry) =>
        entry.definition.nominalCylinderDiameterCells === diameter
        && entry.definition.relaxationTime === relaxationTime);
      const samples = contract.matrix.rampDurationDiameters.map(
        (duration): FormalRampDurationSample => {
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
        },
      );
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
  cases: FormalRampCaseResult[],
  selector: (entry: FormalRampCaseResult) => number | undefined,
): { caseId: string; value: number } {
  let result: { caseId: string; value: number } | undefined;
  for (const entry of cases) {
    const value = selector(entry);
    if (value === undefined) continue;
    if (result === undefined || value > result.value) {
      result = { caseId: entry.definition.id, value };
    }
  }
  if (result === undefined) throw new Error("A8I matrix contains no completed values");
  return result;
}

function range(values: number[]): { minimum: number; maximum: number } {
  if (values.length === 0) throw new Error("cannot summarize empty A8I duration");
  return { minimum: Math.min(...values), maximum: Math.max(...values) };
}

export function runFormalRampSensitivityMatrix(
  onProgress?: (progress: FormalRampProgress) => void,
): FormalRampSensitivityResult {
  const definitions = buildFormalRampSensitivityCases();
  const cases: FormalRampCaseResult[] = [];
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
  const durationSummaries = FORMAL_RAMP_SENSITIVITY_CONTRACT.matrix
    .rampDurationDiameters.map((duration) => {
      const selected = cases.filter(
        (entry) => entry.definition.rampDurationDiameters === duration,
      );
      const densityRange = range(selected.map(
        (entry) => entry.run.stability?.maximumDensityDeviation ?? Number.NaN,
      ));
      const machRange = range(selected.map(
        (entry) => entry.run.stability?.maximumMach ?? Number.NaN,
      ));
      return {
        rampDurationDiameters: duration,
        totalCases: selected.length,
        stableCases: selected.filter((entry) => entry.gate.pass).length,
        minimumDensityDeviation: densityRange.minimum,
        maximumDensityDeviation: densityRange.maximum,
        minimumMaximumMach: machRange.minimum,
        maximumMaximumMach: machRange.maximum,
      };
    });
  const matrixComplete = cases.length === 72
    && cases.every((entry) => entry.gate.executionPass);
  const longestRampPassAtEveryCorner = corners.length === 9
    && corners.every((entry) => entry.longestRampPass);
  const densityDeviationNonIncreasingAtEveryCorner = corners.length === 9
    && corners.every((entry) => entry.densityDeviationNonIncreasing);
  const pass = matrixComplete
    && longestRampPassAtEveryCorner
    && densityDeviationNonIncreasingAtEveryCorner;
  return {
    format: "VP-A8I-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-MATRIX-v1",
    contract: FORMAL_RAMP_SENSITIVITY_CONTRACT,
    matrixComplete,
    cases,
    corners,
    durationSummaries,
    summary: {
      totalCases: cases.length,
      completedCases: cases.filter((entry) => entry.gate.executionPass).length,
      stableCases: cases.filter((entry) => entry.gate.pass).length,
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
    decision: {
      code: pass
        ? "PASS-A8I-READONLY-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-INTERNAL-GATES"
        : "NO-GO-A8I-READONLY-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-INTERNAL-GATES",
      pass,
      internalChecks: {
        matrixComplete,
        longestRampPassAtEveryCorner,
        densityDeviationNonIncreasingAtEveryCorner,
      },
      externalChecksRequired: Object.freeze([
        "formal lbm.ts SHA-256 exact",
        "A8H five-diameter anchors exact",
        "independent A8I JSON repeat byte-identical",
      ]),
      formalSourceModified: false,
      cbcIntegratedIntoFormalKernel: false,
      formalIntegrationUnlocked: false,
      statement: pass
        ? "The frozen read-only formal-kernel ramp-sensitivity gates pass; this does not integrate CBC or modify the formal source."
        : "At least one frozen A8I internal ramp-sensitivity gate failed; no ramp duration is qualified for formal adoption.",
    },
  };
}
