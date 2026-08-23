import type { SimulationConfig } from "../../../02-模拟程序/src/core/types";
import {
  DEFAULT_FORWARD_REVISION_OPTIONS,
  evaluateForwardP0,
  stateToVector,
  vectorToState,
  type ForwardRevisionOptions,
  type ForwardState,
} from "../forward/model";

export interface EquilibriumSolveOptions {
  absoluteTolerance: number;
  relativeTolerance: number;
  maximumIterations: number;
  minimumLineSearchFactor: number;
  differentiationSteps: readonly [number, number, number, number];
}

export const DEFAULT_EQUILIBRIUM_SOLVE_OPTIONS: Readonly<EquilibriumSolveOptions> = Object.freeze({
  absoluteTolerance: 1e-11,
  relativeTolerance: 1e-10,
  maximumIterations: 40,
  minimumLineSearchFactor: 2 ** -20,
  differentiationSteps: [1e-6, 1e-6, 1e-6, 1e-6] as const,
});

export interface ForwardEquilibrium {
  config: SimulationConfig;
  state: ForwardState;
  residual: number[];
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

function frozenConfig(config: SimulationConfig, flowSpeed: number): SimulationConfig {
  if (!(flowSpeed >= 0) || !Number.isFinite(flowSpeed)) {
    throw new RangeError("flowSpeed must be finite and non-negative");
  }
  const frozen = structuredClone(config);
  frozen.backend = "forward";
  frozen.fluid.flowSpeed = flowSpeed;
  frozen.fluid.flowRampTime = 0;
  frozen.fluid.flowModulationAmplitude = 0;
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

/** Five-point central Jacobian of the candidate forward RHS. */
export function finiteDifferenceJacobian(
  config: SimulationConfig,
  state: ForwardState,
  steps: readonly [number, number, number, number],
  revisionOptions: ForwardRevisionOptions = DEFAULT_FORWARD_REVISION_OPTIONS,
): number[][] {
  const center = stateToVector(state);
  const jacobian = Array.from({ length: 4 }, () => Array(4).fill(0) as number[]);
  for (let column = 0; column < 4; column += 1) {
    const step = steps[column];
    if (step === undefined || !(step > 0) || !Number.isFinite(step)) {
      throw new RangeError("differentiation steps must be finite and positive");
    }
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
  const frozen = frozenConfig(config, flowSpeed);
  let vector = stateToVector(initialGuess);
  let residual = rhsVector(frozen, vector, revisionOptions);
  const initialNorm = Math.max(norm(residual), 1);
  const target = options.absoluteTolerance + options.relativeTolerance * initialNorm;
  let residualNorm = norm(residual);

  for (let iteration = 0; iteration <= options.maximumIterations; iteration += 1) {
    if (residualNorm <= target) {
      return {
        config: frozen,
        state: vectorToState(vector),
        residual,
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
      if (Number.isFinite(candidateNorm) && candidateNorm < residualNorm) {
        vector = candidate;
        residual = candidateResidual;
        residualNorm = candidateNorm;
        accepted = true;
        break;
      }
      factor *= 0.5;
    }
    if (!accepted) {
      throw new Error(
        `equilibrium Newton line search failed at residual ${residualNorm.toExponential(6)}`,
      );
    }
  }

  return {
    config: frozen,
    state: vectorToState(vector),
    residual,
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
  if (!equilibrium.converged || equilibrium.residualNorm > options.absoluteTolerance * 10) {
    throw new Error(
      `spectrum rejected: equilibrium residual ${equilibrium.residualNorm.toExponential(6)}`,
    );
  }
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
