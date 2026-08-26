import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { CS2 } from "./d2q9.ts";
import { FORMAL_NO_BODY_RAMP_CONTRACT } from "./formal-no-body-ramp-contract.ts";
import {
  buildRobustnessGeometry,
  type RobustnessGeometry,
} from "./robustness.ts";

export interface FormalNoBodyRampCaseDefinition {
  id: string;
  inletVelocity: number;
  relaxationTime: number;
  viscosity: number;
  nominalDiameterScaleCells: number;
  nominalReynoldsNumberScale: number;
  rampDurationDiameters: number;
  rampSteps: number;
  auditSteps: number;
  geometry: RobustnessGeometry;
  body: "none";
}

export interface FormalNoBodyStability {
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
  densityExtremum?: FormalNoBodyStability["densityExtremum"];
}

export interface FormalNoBodyRampCaseResult {
  definition: FormalNoBodyRampCaseDefinition;
  run: {
    status: "completed" | "failed";
    completedSteps: number;
    stability?: FormalNoBodyStability;
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

export interface FormalNoBodyRampDurationSample {
  rampDurationDiameters: number;
  rampSteps: number;
  maximumDensityDeviation?: number;
  maximumMach?: number;
  pass: boolean;
}

export interface FormalNoBodyRampCornerResult {
  nominalDiameterScaleCells: number;
  relaxationTime: number;
  samples: FormalNoBodyRampDurationSample[];
  densityDeviationNonIncreasing: boolean;
  longestRampPass: boolean;
  shortestPassingRampDurationDiameters?: number;
  longestFailingRampDurationDiameters?: number;
  transitionBracketWidthDiameters?: number;
}

export interface FormalNoBodyRampResult {
  format: "VP-A8J-FORMAL-MRT-NO-BODY-RAMP-MATRIX-v1";
  contract: typeof FORMAL_NO_BODY_RAMP_CONTRACT;
  matrixComplete: boolean;
  cases: FormalNoBodyRampCaseResult[];
  corners: FormalNoBodyRampCornerResult[];
  durationSummaries: Array<{
    rampDurationDiameters: number;
    totalCases: number;
    stableCases: number;
    minimumDensityDeviation: number;
    maximumDensityDeviation: number;
    minimumMaximumMach: number;
    maximumMaximumMach: number;
  }>;
  causalComparison: {
    bodyPresentTwentyDiameterStableCorners: number;
    noBodyTwentyDiameterStableCorners: number;
    bodyInteractionNecessaryForA8iLongestRampFailure: boolean;
    inletOpenBoundaryStartupFailsWithoutBody: boolean;
    statement: string;
  };
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

export interface FormalNoBodyRampProgress {
  completedCases: number;
  totalCases: number;
  caseId: string;
  pass: boolean;
}

function scaledInteger(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

export function buildFormalNoBodyRampCases(): FormalNoBodyRampCaseDefinition[] {
  const definitions: FormalNoBodyRampCaseDefinition[] = [];
  const contract = FORMAL_NO_BODY_RAMP_CONTRACT;
  for (const diameter of contract.matrix.nominalDiameterScaleCells) {
    const geometry = buildRobustnessGeometry(
      diameter,
      contract.matrix.downstreamDomainScaleDiameters,
    );
    for (const relaxationTime of contract.matrix.relaxationTime) {
      const viscosity = CS2 * (relaxationTime - 0.5);
      for (const rampDurationDiameters of contract.matrix.rampDurationDiameters) {
        const rampSteps = rampDurationDiameters * diameter;
        if (!Number.isInteger(rampSteps)) {
          throw new RangeError("frozen A8J ramp duration does not map to integer steps");
        }
        definitions.push({
          id: [
            `d${scaledInteger(diameter, 1, 2)}`,
            "u0800",
            `t${scaledInteger(relaxationTime, 1_000, 4)}`,
            `r${scaledInteger(rampDurationDiameters, 100, 4)}`,
            "nobody",
          ].join("-"),
          inletVelocity: contract.matrix.inletVelocityLattice,
          relaxationTime,
          viscosity,
          nominalDiameterScaleCells: diameter,
          nominalReynoldsNumberScale:
            contract.matrix.inletVelocityLattice * diameter / viscosity,
          rampDurationDiameters,
          rampSteps,
          auditSteps: geometry.steps,
          geometry,
          body: "none",
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
  step: number,
): void {
  const field = solver.macroscopicCopies(null);
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
    throw new RangeError("formal-no-body macroscopic field became non-finite");
  }
  const minimumDeviation = Math.abs(minimumDensity - 1);
  const maximumDeviation = Math.abs(maximumDensity - 1);
  const useMaximum = maximumDeviation >= minimumDeviation;
  const deviation = useMaximum ? maximumDeviation : minimumDeviation;
  if (deviation > envelope.maximumDensityDeviation) {
    const cell = useMaximum ? maximumCell : minimumCell;
    envelope.maximumDensityDeviation = deviation;
    envelope.maximumDensityDeviationStep = step;
    envelope.densityExtremum = {
      kind: useMaximum ? "maximum" : "minimum",
      density: useMaximum ? maximumDensity : minimumDensity,
      x: cell % solver.nx,
      y: Math.floor(cell / solver.nx),
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

function finalizeStability(envelope: MutableStability): FormalNoBodyStability {
  if (envelope.densityExtremum === undefined) {
    throw new Error("cannot finalize empty A8J stability envelope");
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
  definition: FormalNoBodyRampCaseDefinition,
): FormalNoBodyRampCaseResult {
  const contract = FORMAL_NO_BODY_RAMP_CONTRACT;
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: definition.geometry.nx,
    ny: definition.geometry.ny,
    relaxationTime: definition.relaxationTime,
    penalizationTimeSteps:
      contract.matrix.penalizationTimeStepsUnusedWithoutBody,
    maskHalfThickness: contract.matrix.maskHalfThicknessCellsUnusedWithoutBody,
    outerBoundary: contract.matrix.outerBoundary,
  });
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
      solver.step(null, inletVelocity);
      updateStability(envelope, solver, step);
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

function buildCorners(
  cases: FormalNoBodyRampCaseResult[],
): FormalNoBodyRampCornerResult[] {
  const corners: FormalNoBodyRampCornerResult[] = [];
  const contract = FORMAL_NO_BODY_RAMP_CONTRACT;
  const tolerance = contract.gates.monotonicityAbsoluteTolerance;
  for (const diameter of contract.matrix.nominalDiameterScaleCells) {
    for (const relaxationTime of contract.matrix.relaxationTime) {
      const selected = cases.filter((entry) =>
        entry.definition.nominalDiameterScaleCells === diameter
        && entry.definition.relaxationTime === relaxationTime);
      const samples = contract.matrix.rampDurationDiameters.map(
        (duration): FormalNoBodyRampDurationSample => {
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
        nominalDiameterScaleCells: diameter,
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
  cases: FormalNoBodyRampCaseResult[],
  selector: (entry: FormalNoBodyRampCaseResult) => number | undefined,
): { caseId: string; value: number } {
  let result: { caseId: string; value: number } | undefined;
  for (const entry of cases) {
    const value = selector(entry);
    if (value === undefined) continue;
    if (result === undefined || value > result.value) {
      result = { caseId: entry.definition.id, value };
    }
  }
  if (result === undefined) throw new Error("A8J matrix contains no completed values");
  return result;
}

function range(values: number[]): { minimum: number; maximum: number } {
  if (values.length === 0) throw new Error("cannot summarize empty A8J duration");
  return { minimum: Math.min(...values), maximum: Math.max(...values) };
}

export function runFormalNoBodyRampMatrix(
  onProgress?: (progress: FormalNoBodyRampProgress) => void,
): FormalNoBodyRampResult {
  const definitions = buildFormalNoBodyRampCases();
  const cases: FormalNoBodyRampCaseResult[] = [];
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
  const durationSummaries = FORMAL_NO_BODY_RAMP_CONTRACT.matrix
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
  const longestRampPassAtEveryCorner = corners.length
      === FORMAL_NO_BODY_RAMP_CONTRACT.interpretationRules.frozenCornerCount
    && corners.every((entry) => entry.longestRampPass);
  const densityDeviationNonIncreasingAtEveryCorner = corners.length
      === FORMAL_NO_BODY_RAMP_CONTRACT.interpretationRules.frozenCornerCount
    && corners.every((entry) => entry.densityDeviationNonIncreasing);
  const pass = matrixComplete
    && longestRampPassAtEveryCorner
    && densityDeviationNonIncreasingAtEveryCorner;
  const noBodyTwentyDiameterStableCorners = cases.filter((entry) =>
    entry.definition.rampDurationDiameters === 20 && entry.gate.pass).length;
  const bodyPresentTwentyDiameterStableCorners =
    FORMAL_NO_BODY_RAMP_CONTRACT.inheritedEvidence
      .bodyPresentTwentyDiameterStableCorners;
  const bodyInteractionNecessaryForA8iLongestRampFailure =
    noBodyTwentyDiameterStableCorners
      === FORMAL_NO_BODY_RAMP_CONTRACT.interpretationRules.frozenCornerCount
    && bodyPresentTwentyDiameterStableCorners === 0;
  const inletOpenBoundaryStartupFailsWithoutBody =
    noBodyTwentyDiameterStableCorners
      < FORMAL_NO_BODY_RAMP_CONTRACT.interpretationRules.frozenCornerCount;
  return {
    format: "VP-A8J-FORMAL-MRT-NO-BODY-RAMP-MATRIX-v1",
    contract: FORMAL_NO_BODY_RAMP_CONTRACT,
    matrixComplete,
    cases,
    corners,
    durationSummaries,
    causalComparison: {
      bodyPresentTwentyDiameterStableCorners,
      noBodyTwentyDiameterStableCorners,
      bodyInteractionNecessaryForA8iLongestRampFailure,
      inletOpenBoundaryStartupFailsWithoutBody,
      statement: bodyInteractionNecessaryForA8iLongestRampFailure
        ? "Removing the Brinkman body eliminates every frozen 20D-ramp failure; body interaction is necessary for the A8I longest-ramp failures, though this does not isolate a unique body-boundary mechanism."
        : "At least one no-body 20D-ramp corner fails, so inlet/open-boundary startup contributes independently of the Brinkman body at the frozen gate.",
    },
    summary: {
      totalCases: cases.length,
      completedCases: cases.filter((entry) => entry.gate.executionPass).length,
      stableCases: cases.filter((entry) => entry.gate.pass).length,
      longestRampStableCases: noBodyTwentyDiameterStableCorners,
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
        ? "PASS-A8J-READONLY-FORMAL-MRT-NO-BODY-RAMP-INTERNAL-GATES"
        : "NO-GO-A8J-READONLY-FORMAL-MRT-NO-BODY-RAMP-INTERNAL-GATES",
      pass,
      internalChecks: {
        matrixComplete,
        longestRampPassAtEveryCorner,
        densityDeviationNonIncreasingAtEveryCorner,
      },
      externalChecksRequired: Object.freeze([
        "formal lbm.ts SHA-256 exact",
        "A8I artifact SHA-256 exact and body-present 20D count reproduced",
        "independent A8J JSON repeat byte-identical",
      ]),
      formalSourceModified: false,
      cbcIntegratedIntoFormalKernel: false,
      formalIntegrationUnlocked: false,
      statement: pass
        ? "The frozen read-only formal-kernel no-body ramp controls pass; this is a causal guard, not a body-flow or CBC qualification."
        : "At least one frozen A8J no-body startup gate failed; the inlet/open-boundary path remains a failure contributor without a body.",
    },
  };
}
