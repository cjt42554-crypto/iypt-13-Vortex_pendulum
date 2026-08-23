import type { SimulationConfig } from "../../../02-模拟程序/src/core/types";
import { validateConfig } from "../../../02-模拟程序/src/core/config";
import {
  DEFAULT_FORWARD_REVISION_OPTIONS,
  evaluateForwardGuardsP0,
  evaluateForwardP0,
  stateToVector,
  vectorToState,
  type ForwardEvaluation,
  type ForwardRevisionOptions,
  type ForwardState,
} from "../forward/model";

export const FORWARD_STATE_COMPONENTS = [
  "theta",
  "omega",
  "wakeReal",
  "wakeImaginary",
] as const;

export type ForwardStateComponent = typeof FORWARD_STATE_COMPONENTS[number];
export type ForwardComponentTuple = readonly [number, number, number, number];

export interface EquilibriumSolveOptions {
  /**
   * Absolute RHS residual gates for (thetaDot [rad/s], omegaDot [rad/s^2],
   * wakeRealDot [1/s], wakeImaginaryDot [1/s]). These are numerical root
   * tolerances, not physical model-error bars.
   */
  componentAbsoluteTolerances: ForwardComponentTuple;
  /** Relative contribution uses the absolute initial residual per component. */
  relativeTolerance: number;
  maximumIterations: number;
  minimumLineSearchFactor: number;
  /** State perturbations for (theta [rad], omega [rad/s], wakeReal, wakeImaginary). */
  differentiationSteps: ForwardComponentTuple;
}

export const DEFAULT_EQUILIBRIUM_SOLVE_OPTIONS: Readonly<EquilibriumSolveOptions> = Object.freeze({
  componentAbsoluteTolerances: [1e-11, 1e-10, 1e-10, 1e-10] as const,
  relativeTolerance: 1e-10,
  maximumIterations: 40,
  minimumLineSearchFactor: 2 ** -20,
  differentiationSteps: [1e-6, 1e-6, 1e-5, 1e-5] as const,
});

export interface ForwardEquilibrium {
  config: SimulationConfig;
  state: ForwardState;
  residual: number[];
  componentResidualThresholds: number[];
  componentResidualRatios: number[];
  maximumComponentRatio: number;
  residualNorm: number;
  iterations: number;
  converged: boolean;
}

export interface EquilibriumLinearization extends ForwardEquilibrium {
  jacobian: number[][];
  characteristic: [number, number, number, number, number];
}

function norm(values: readonly number[]): number {
  return Math.hypot(...values);
}

function requirePositiveTuple(values: readonly number[], label: string): void {
  if (values.length !== 4 || values.some((value) => !(value > 0) || !Number.isFinite(value))) {
    throw new RangeError(`${label} must contain four finite positive component values`);
  }
}

function assertEquilibriumOptions(options: EquilibriumSolveOptions): void {
  requirePositiveTuple(options.componentAbsoluteTolerances, "componentAbsoluteTolerances");
  requirePositiveTuple(options.differentiationSteps, "differentiationSteps");
  if (!(options.relativeTolerance >= 0) || !Number.isFinite(options.relativeTolerance)) {
    throw new RangeError("relativeTolerance must be finite and non-negative");
  }
  if (!Number.isInteger(options.maximumIterations) || options.maximumIterations < 0) {
    throw new RangeError("maximumIterations must be a non-negative integer");
  }
  if (!(options.minimumLineSearchFactor > 0)
    || !(options.minimumLineSearchFactor <= 1)
    || !Number.isFinite(options.minimumLineSearchFactor)) {
    throw new RangeError("minimumLineSearchFactor must be finite and lie in (0,1]");
  }
}

interface ComponentResidualDiagnostics {
  thresholds: number[];
  ratios: number[];
  maximumRatio: number;
  merit: number;
}

function componentResidualDiagnostics(
  residual: readonly number[],
  thresholds: readonly number[],
): ComponentResidualDiagnostics {
  if (residual.length !== 4 || thresholds.length !== 4) {
    throw new RangeError("component residual diagnostics require four components");
  }
  const ratios = residual.map((value, index) =>
    Math.abs(value) / (thresholds[index] ?? Number.NaN));
  return {
    thresholds: [...thresholds],
    ratios,
    maximumRatio: Math.max(...ratios),
    merit: norm(ratios),
  };
}

/** Reject every severity=error issue from the original frozen configuration contract. */
export function assertForwardConfigValid(config: SimulationConfig): void {
  let errors: ReturnType<typeof validateConfig>;
  try {
    errors = validateConfig(config).filter((issue) => issue.severity === "error");
  } catch (error) {
    throw new Error(
      `CONFIG-INVALID validation threw: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (errors.length > 0) {
    const details = errors
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join(" | ");
    throw new Error(`CONFIG-INVALID ${details}`);
  }
}

function frozenConfig(config: SimulationConfig, flowSpeed: number): SimulationConfig {
  if (!(flowSpeed >= 0) || !Number.isFinite(flowSpeed)) {
    throw new RangeError("flowSpeed must be finite and non-negative");
  }
  const frozen = structuredClone(config);
  frozen.backend = "forward";
  frozen.fluid.flowSpeed = flowSpeed;
  frozen.fluid.flowRampTime = 0;
  frozen.fluid.flowModulationAmplitude = 0;
  assertForwardConfigValid(frozen);
  return frozen;
}

function rhsVector(
  config: SimulationConfig,
  vector: readonly number[],
  revisionOptions: ForwardRevisionOptions,
): number[] {
  return stateToVector(evaluateForwardP0(
    config,
    1,
    vectorToState(vector),
    undefined,
    revisionOptions,
  ).derivative);
}

export type FivePointOffset = -2 | -1 | 0 | 1 | 2;

export interface FivePointStencilPoint {
  column: number;
  component: ForwardStateComponent;
  offset: FivePointOffset;
  state: ForwardState;
}

/** Structured hard-gate failure suitable for human logs and machine inspection. */
export class ForwardApplicabilityError extends Error {
  readonly guardCode: string;
  readonly column: number | "center";
  readonly component: ForwardStateComponent | "center";
  readonly offset: FivePointOffset;
  readonly state: ForwardState;
  readonly margin: number;

  constructor(
    guardCode: string,
    column: number | "center",
    component: ForwardStateComponent | "center",
    offset: FivePointOffset,
    state: ForwardState,
    margin: number,
    detail: string,
  ) {
    super(
      `STRUCTURE-DOMAIN guard=${guardCode} column=${column} component=${component} `
      + `offset=${offset >= 0 ? "+" : ""}${offset} state=${JSON.stringify(state)} `
      + `margin=${Number.isFinite(margin) ? margin.toExponential(12) : String(margin)}: ${detail}`,
    );
    this.name = "ForwardApplicabilityError";
    this.guardCode = guardCode;
    this.column = column;
    this.component = component;
    this.offset = offset;
    this.state = { ...state };
    this.margin = margin;
  }
}

function guardAcceptsBoundary(code: string): boolean {
  // These parameter-domain endpoints can be smooth in a state-variable
  // direction, but every point of the central stencil must still remain legal.
  return code === "COEFFICIENT-OOD" || code === "RAPID-INFLOW";
}

function guardIsInside(code: string, margin: number): boolean {
  if (!Number.isFinite(margin)) return false;
  return guardAcceptsBoundary(code) ? margin >= 0 : margin > 0;
}

function branchSignature(evaluated: ForwardEvaluation): string {
  return `${evaluated.wetting.isDry ? "exact-dry" : "wet"}/${evaluated.mechanics.wet.branch}`;
}

/** Evaluate every forward guard at one proposed smooth-analysis state. */
export function assertSmoothForwardState(
  config: SimulationConfig,
  state: ForwardState,
  column: number | "center" = "center",
  component: ForwardStateComponent | "center" = "center",
  offset: FivePointOffset = 0,
  revisionOptions: ForwardRevisionOptions = DEFAULT_FORWARD_REVISION_OPTIONS,
): ForwardEvaluation {
  let evaluated: ForwardEvaluation;
  try {
    evaluated = evaluateForwardP0(config, 1, state, undefined, revisionOptions);
  } catch (error) {
    throw new ForwardApplicabilityError(
      "NONFINITE-INPUT",
      column,
      component,
      offset,
      state,
      -1,
      error instanceof Error ? error.message : String(error),
    );
  }
  const failed = evaluateForwardGuardsP0(
    config,
    1,
    state,
    evaluated,
    revisionOptions,
  ).find((guard) => !guardIsInside(guard.code, guard.margin));
  if (failed) {
    throw new ForwardApplicabilityError(
      failed.code,
      column,
      component,
      offset,
      state,
      failed.margin,
      failed.message,
    );
  }
  return evaluated;
}

/** Enumerate all (-2,-1,0,+1,+2) points for every state component. */
export function enumerateFivePointStencil(
  state: ForwardState,
  steps: ForwardComponentTuple,
): FivePointStencilPoint[] {
  requirePositiveTuple(steps, "differentiationSteps");
  const center = stateToVector(state);
  const offsets: readonly FivePointOffset[] = [-2, -1, 0, 1, 2];
  const points: FivePointStencilPoint[] = [];
  for (let column = 0; column < 4; column += 1) {
    const step = steps[column] ?? Number.NaN;
    for (const offset of offsets) {
      const vector = [...center];
      vector[column] = (vector[column] ?? Number.NaN) + offset * step;
      points.push({
        column,
        component: FORWARD_STATE_COMPONENTS[column] ?? "theta",
        offset,
        state: vectorToState(vector),
      });
    }
  }
  return points;
}

/**
 * Require the complete central stencil to remain within every guard and on the
 * same exact-dry/wet and geometry branch as the equilibrium.
 */
export function assertStencilInsideDomain(
  config: SimulationConfig,
  equilibriumState: ForwardState,
  steps: ForwardComponentTuple,
  revisionOptions: ForwardRevisionOptions = DEFAULT_FORWARD_REVISION_OPTIONS,
): void {
  const center = assertSmoothForwardState(
    config,
    equilibriumState,
    "center",
    "center",
    0,
    revisionOptions,
  );
  const centerBranch = branchSignature(center);
  for (const point of enumerateFivePointStencil(equilibriumState, steps)) {
    const evaluated = assertSmoothForwardState(
      config,
      point.state,
      point.column,
      point.component,
      point.offset,
      revisionOptions,
    );
    const pointBranch = branchSignature(evaluated);
    if (pointBranch !== centerBranch) {
      throw new ForwardApplicabilityError(
        "NONSMOOTH-BRANCH",
        point.column,
        point.component,
        point.offset,
        point.state,
        0,
        `five-point stencil crosses branch ${centerBranch} -> ${pointBranch}`,
      );
    }
  }
}

/** Five-point central Jacobian of the candidate forward RHS. */
export function finiteDifferenceJacobian(
  config: SimulationConfig,
  state: ForwardState,
  steps: ForwardComponentTuple,
  revisionOptions: ForwardRevisionOptions = DEFAULT_FORWARD_REVISION_OPTIONS,
): number[][] {
  requirePositiveTuple(steps, "differentiationSteps");
  const center = stateToVector(state);
  const jacobian = Array.from({ length: 4 }, () => Array(4).fill(0) as number[]);
  for (let column = 0; column < 4; column += 1) {
    const step = steps[column];
    if (step === undefined) throw new RangeError("missing differentiation step");
    const plusOne = [...center];
    const minusOne = [...center];
    const plusTwo = [...center];
    const minusTwo = [...center];
    plusOne[column] = (plusOne[column] ?? 0) + step;
    minusOne[column] = (minusOne[column] ?? 0) - step;
    plusTwo[column] = (plusTwo[column] ?? 0) + 2 * step;
    minusTwo[column] = (minusTwo[column] ?? 0) - 2 * step;
    const fPlusOne = rhsVector(config, plusOne, revisionOptions);
    const fMinusOne = rhsVector(config, minusOne, revisionOptions);
    const fPlusTwo = rhsVector(config, plusTwo, revisionOptions);
    const fMinusTwo = rhsVector(config, minusTwo, revisionOptions);
    for (let row = 0; row < 4; row += 1) {
      jacobian[row]![column] = (
        -(fPlusTwo[row] ?? 0)
        + 8 * (fPlusOne[row] ?? 0)
        - 8 * (fMinusOne[row] ?? 0)
        + (fMinusTwo[row] ?? 0)
      ) / (12 * step);
    }
  }
  return jacobian;
}

/** Gaussian elimination with scaled partial pivoting. */
export function solveLinearSystem(
  matrix: readonly (readonly number[])[],
  rightHandSide: readonly number[],
): number[] {
  const size = matrix.length;
  if (size === 0 || rightHandSide.length !== size || matrix.some((row) => row.length !== size)) {
    throw new RangeError("linear system must be square and non-empty");
  }
  const augmented = matrix.map((row, index) => [
    ...row,
    rightHandSide[index] ?? Number.NaN,
  ]);
  const scales = augmented.map((row) => Math.max(...row.slice(0, size).map(Math.abs)));
  if (scales.some((scale) => !(scale > 0) || !Number.isFinite(scale))) {
    throw new Error("singular linear system");
  }

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    let best = -1;
    for (let row = column; row < size; row += 1) {
      const score = Math.abs(augmented[row]?.[column] ?? 0) / (scales[row] ?? 1);
      if (score > best) {
        best = score;
        pivot = row;
      }
    }
    if (!(best > 1e-14)) throw new Error("singular or ill-conditioned equilibrium Jacobian");
    [augmented[column], augmented[pivot]] = [augmented[pivot]!, augmented[column]!];
    for (let row = column + 1; row < size; row += 1) {
      const factor = (augmented[row]?.[column] ?? 0) / (augmented[column]?.[column] ?? 1);
      for (let index = column; index <= size; index += 1) {
        augmented[row]![index] = (augmented[row]?.[index] ?? 0)
          - factor * (augmented[column]?.[index] ?? 0);
      }
    }
  }

  const solution = Array(size).fill(0) as number[];
  for (let row = size - 1; row >= 0; row -= 1) {
    let value = augmented[row]?.[size] ?? 0;
    for (let column = row + 1; column < size; column += 1) {
      value -= (augmented[row]?.[column] ?? 0) * (solution[column] ?? 0);
    }
    const diagonal = augmented[row]?.[row] ?? 0;
    if (!(Math.abs(diagonal) > 1e-14) || !Number.isFinite(diagonal)) {
      throw new Error("singular or ill-conditioned equilibrium Jacobian");
    }
    solution[row] = value / diagonal;
  }
  return solution;
}

/**
 * Solve F(X*)=0 before any spectrum is interpreted.
 *
 * A damped Newton step is accepted only when it reduces the full RHS norm.
 * Failure is explicit; the caller must not silently fall back to X=0.
 */
export function solveForwardEquilibrium(
  config: SimulationConfig,
  flowSpeed: number,
  initialGuess: ForwardState = { theta: 0, omega: 0, wakeReal: 0, wakeImaginary: 0 },
  options: EquilibriumSolveOptions = DEFAULT_EQUILIBRIUM_SOLVE_OPTIONS,
  revisionOptions: ForwardRevisionOptions = DEFAULT_FORWARD_REVISION_OPTIONS,
): ForwardEquilibrium {
  assertEquilibriumOptions(options);
  const frozen = frozenConfig(config, flowSpeed);
  let vector = stateToVector(initialGuess);
  let residual = rhsVector(frozen, vector, revisionOptions);
  const componentResidualThresholds = options.componentAbsoluteTolerances.map(
    (absoluteTolerance, index) => absoluteTolerance
      + options.relativeTolerance * Math.abs(residual[index] ?? Number.NaN),
  );
  let diagnostics = componentResidualDiagnostics(residual, componentResidualThresholds);
  let residualNorm = norm(residual);

  for (let iteration = 0; iteration <= options.maximumIterations; iteration += 1) {
    if (diagnostics.maximumRatio <= 1) {
      return {
        config: frozen,
        state: vectorToState(vector),
        residual,
        componentResidualThresholds: diagnostics.thresholds,
        componentResidualRatios: diagnostics.ratios,
        maximumComponentRatio: diagnostics.maximumRatio,
        residualNorm,
        iterations: iteration,
        converged: true,
      };
    }
    if (iteration === options.maximumIterations) break;
    const jacobian = finiteDifferenceJacobian(
      frozen,
      vectorToState(vector),
      options.differentiationSteps,
      revisionOptions,
    );
    const step = solveLinearSystem(jacobian, residual.map((value) => -value));
    let factor = 1;
    let accepted = false;
    while (factor >= options.minimumLineSearchFactor) {
      const candidate = vector.map((value, index) => value + factor * (step[index] ?? 0));
      const candidateResidual = rhsVector(frozen, candidate, revisionOptions);
      const candidateNorm = norm(candidateResidual);
      const candidateDiagnostics = componentResidualDiagnostics(
        candidateResidual,
        componentResidualThresholds,
      );
      if (Number.isFinite(candidateNorm)
        && Number.isFinite(candidateDiagnostics.merit)
        && candidateDiagnostics.merit < diagnostics.merit) {
        vector = candidate;
        residual = candidateResidual;
        residualNorm = candidateNorm;
        diagnostics = candidateDiagnostics;
        accepted = true;
        break;
      }
      factor *= 0.5;
    }
    if (!accepted) {
      throw new Error(
        `equilibrium Newton line search failed at maximumComponentRatio=`
        + `${diagnostics.maximumRatio.toExponential(6)} residualNorm=${residualNorm.toExponential(6)}`,
      );
    }
  }

  return {
    config: frozen,
    state: vectorToState(vector),
    residual,
    componentResidualThresholds: diagnostics.thresholds,
    componentResidualRatios: diagnostics.ratios,
    maximumComponentRatio: diagnostics.maximumRatio,
    residualNorm,
    iterations: options.maximumIterations,
    converged: false,
  };
}

function multiplyMatrices(left: readonly number[][], right: readonly number[][]): number[][] {
  const size = left.length;
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => {
    let value = 0;
    for (let inner = 0; inner < size; inner += 1) {
      value += (left[row]?.[inner] ?? 0) * (right[inner]?.[column] ?? 0);
    }
    return value;
  }));
}

function trace(matrix: readonly number[][]): number {
  return matrix.reduce((sum, row, index) => sum + (row[index] ?? 0), 0);
}

/** Newton identities for det(lambda I-A), specialized to a 4x4 matrix. */
export function characteristicCoefficients4(
  matrix: readonly number[][],
): [number, number, number, number, number] {
  if (matrix.length !== 4 || matrix.some((row) => row.length !== 4)) {
    throw new RangeError("characteristic polynomial requires a 4x4 matrix");
  }
  const square = multiplyMatrices(matrix, matrix);
  const cube = multiplyMatrices(square, matrix);
  const fourth = multiplyMatrices(cube, matrix);
  const p1 = trace(matrix);
  const p2 = trace(square);
  const p3 = trace(cube);
  const p4 = trace(fourth);
  const e1 = p1;
  const e2 = (p1 * p1 - p2) / 2;
  const e3 = (p1 ** 3 - 3 * p1 * p2 + 2 * p3) / 6;
  const e4 = (p1 ** 4 - 6 * p1 * p1 * p2 + 3 * p2 * p2 + 8 * p1 * p3 - 6 * p4) / 24;
  return [1, -e1, e2, -e3, e4];
}

export function linearizeForwardAtEquilibrium(
  config: SimulationConfig,
  flowSpeed: number,
  initialGuess?: ForwardState,
  options: EquilibriumSolveOptions = DEFAULT_EQUILIBRIUM_SOLVE_OPTIONS,
  revisionOptions: ForwardRevisionOptions = DEFAULT_FORWARD_REVISION_OPTIONS,
): EquilibriumLinearization {
  const equilibrium = solveForwardEquilibrium(
    config,
    flowSpeed,
    initialGuess,
    options,
    revisionOptions,
  );
  if (!equilibrium.converged || equilibrium.maximumComponentRatio > 1) {
    const componentDetails = FORWARD_STATE_COMPONENTS.map((component, index) => ({
      component,
      residual: equilibrium.residual[index] ?? Number.NaN,
      threshold: equilibrium.componentResidualThresholds[index] ?? Number.NaN,
      ratio: equilibrium.componentResidualRatios[index] ?? Number.NaN,
    }));
    throw new Error(
      `spectrum rejected: componentwise equilibrium residual gate failed `
      + `maximumComponentRatio=${equilibrium.maximumComponentRatio.toExponential(6)} `
      + `components=${JSON.stringify(componentDetails)}`,
    );
  }
  assertStencilInsideDomain(
    equilibrium.config,
    equilibrium.state,
    options.differentiationSteps,
    revisionOptions,
  );
  const jacobian = finiteDifferenceJacobian(
    equilibrium.config,
    equilibrium.state,
    options.differentiationSteps,
    revisionOptions,
  );
  return {
    ...equilibrium,
    jacobian,
    characteristic: characteristicCoefficients4(jacobian),
  };
}
