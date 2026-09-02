import { deriveParameters } from "../core/config";
import type { SimulationConfig } from "../core/types";
import {
  evaluateForward,
  stateToVector,
  vectorToState,
  type ForwardState,
} from "../solvers/forward/model";

export interface ComplexValue {
  real: number;
  imaginary: number;
}

export interface StructuralSpectrumPoint {
  flowSpeed: number;
  reynolds: number;
  reducedVelocity: number;
  wakeGrowthRate: number;
  wakeAngularFrequency: number;
  symmetricResidualNorm: number;
  jacobian: number[][];
  characteristic: [number, number, number, number, number];
  hurwitz: {
    delta2: number;
    delta3: number;
    strictlyStable: boolean;
  };
  eigenvalues: ComplexValue[];
  maximumPolynomialResidual: number;
  spectralAbscissa: number;
  criticalImaginaryMagnitude: number;
}

export interface LocatedStructuralBoundary {
  flowSpeed: number;
  point: StructuralSpectrumPoint;
  crossingSlope: number;
  type: "hopf-candidate" | "static-candidate";
  bracket: [number, number];
}

/**
 * Exact radial solution of dr/dt = mu r - beta r^3.
 *
 * This is a phase-4 observation operator for finite-time visibility. It does
 * not replace the coupled phase-1 right-hand side or its phase-2 integrator.
 */
export function isolatedLandauAmplitude(
  initialAmplitude: number,
  growthRate: number,
  cubicReal: number,
  time: number,
): number {
  if (!(initialAmplitude >= 0) || !(time >= 0) || !(cubicReal >= 0)
    || !Number.isFinite(initialAmplitude) || !Number.isFinite(growthRate)
    || !Number.isFinite(cubicReal) || !Number.isFinite(time)) {
    throw new RangeError("invalid isolated Landau amplitude request");
  }
  if (initialAmplitude === 0) return 0;
  if (Math.abs(growthRate) < 1e-12) {
    return initialAmplitude / Math.sqrt(1 + 2 * cubicReal * initialAmplitude ** 2 * time);
  }
  const exponential = Math.exp(-2 * growthRate * time);
  const inverseSquare = cubicReal / growthRate
    + (1 / initialAmplitude ** 2 - cubicReal / growthRate) * exponential;
  return inverseSquare > 0 ? 1 / Math.sqrt(inverseSquare) : Number.NaN;
}

/**
 * First non-negative time at which the isolated radial solution reaches a
 * target. Null means that the target lies outside the trajectory's forward
 * orbit (for example above a supercritical saturation amplitude).
 */
export function isolatedLandauThresholdTime(
  initialAmplitude: number,
  targetAmplitude: number,
  growthRate: number,
  cubicReal: number,
): number | null {
  if (!(initialAmplitude > 0) || !(targetAmplitude > 0) || !(cubicReal >= 0)
    || !Number.isFinite(initialAmplitude) || !Number.isFinite(targetAmplitude)
    || !Number.isFinite(growthRate) || !Number.isFinite(cubicReal)) return null;
  if (initialAmplitude === targetAmplitude) return 0;
  if (Math.abs(growthRate) < 1e-12) {
    if (cubicReal === 0) return null;
    const time = (1 / targetAmplitude ** 2 - 1 / initialAmplitude ** 2)
      / (2 * cubicReal);
    return time >= 0 ? time : null;
  }
  const numerator = 1 / targetAmplitude ** 2 - cubicReal / growthRate;
  const denominator = 1 / initialAmplitude ** 2 - cubicReal / growthRate;
  const exponential = numerator / denominator;
  if (!(exponential > 0)) return null;
  const time = -Math.log(exponential) / (2 * growthRate);
  return time >= 0 && Number.isFinite(time) ? time : null;
}

const ZERO_STATE: ForwardState = {
  theta: 0,
  omega: 0,
  wakeReal: 0,
  wakeImaginary: 0,
};

function add(left: ComplexValue, right: ComplexValue): ComplexValue {
  return { real: left.real + right.real, imaginary: left.imaginary + right.imaginary };
}

function subtract(left: ComplexValue, right: ComplexValue): ComplexValue {
  return { real: left.real - right.real, imaginary: left.imaginary - right.imaginary };
}

function multiply(left: ComplexValue, right: ComplexValue): ComplexValue {
  return {
    real: left.real * right.real - left.imaginary * right.imaginary,
    imaginary: left.real * right.imaginary + left.imaginary * right.real,
  };
}

function divide(left: ComplexValue, right: ComplexValue): ComplexValue {
  const denominator = right.real * right.real + right.imaginary * right.imaginary;
  if (!(denominator > 0)) throw new RangeError("complex division encountered a zero denominator");
  return {
    real: (left.real * right.real + left.imaginary * right.imaginary) / denominator,
    imaginary: (left.imaginary * right.real - left.real * right.imaginary) / denominator,
  };
}

function magnitude(value: ComplexValue): number {
  return Math.hypot(value.real, value.imaginary);
}

function evaluatePolynomial(coefficients: readonly number[], value: ComplexValue): ComplexValue {
  let result: ComplexValue = { real: coefficients[0] ?? 0, imaginary: 0 };
  for (let index = 1; index < coefficients.length; index += 1) {
    result = add(multiply(result, value), { real: coefficients[index] ?? 0, imaginary: 0 });
  }
  return result;
}

/**
 * Simultaneous Durand--Kerner roots for the small real monic polynomials used
 * by the structural layer. The returned residual is checked by callers; this
 * routine is not used by either time integrator.
 */
export function polynomialRoots(
  coefficients: readonly number[],
  tolerance = 1e-13,
  maximumIterations = 2_000,
): ComplexValue[] {
  if (coefficients.length < 2 || coefficients.some((value) => !Number.isFinite(value))) {
    throw new RangeError("polynomial coefficients must be finite and non-empty");
  }
  const leading = coefficients[0] ?? 0;
  if (leading === 0) throw new RangeError("leading polynomial coefficient must be nonzero");
  const monic = coefficients.map((value) => value / leading);
  const degree = monic.length - 1;
  const radius = 1 + Math.max(...monic.slice(1).map(Math.abs));
  let roots: ComplexValue[] = Array.from({ length: degree }, (_, index) => {
    const angle = 2 * Math.PI * (index + 0.271828) / degree;
    const radialPerturbation = 1 + 0.017 * index;
    return {
      real: radius * radialPerturbation * Math.cos(angle),
      imaginary: radius * radialPerturbation * Math.sin(angle),
    };
  });

  for (let iteration = 0; iteration < maximumIterations; iteration += 1) {
    let maximumUpdate = 0;
    const next = roots.map((root, index) => {
      let denominator: ComplexValue = { real: 1, imaginary: 0 };
      for (let other = 0; other < roots.length; other += 1) {
        if (other === index) continue;
        denominator = multiply(denominator, subtract(root, roots[other] ?? root));
      }
      if (magnitude(denominator) < 1e-30) {
        denominator = add(denominator, { real: 1e-30, imaginary: 1e-30 });
      }
      const correction = divide(evaluatePolynomial(monic, root), denominator);
      maximumUpdate = Math.max(maximumUpdate, magnitude(correction));
      return subtract(root, correction);
    });
    roots = next;
    if (maximumUpdate <= tolerance) break;
  }

  roots.sort((left, right) => left.real - right.real || left.imaginary - right.imaginary);
  return roots.map((root) => ({
    real: Math.abs(root.real) < 1e-14 ? 0 : root.real,
    imaginary: Math.abs(root.imaginary) < 1e-14 ? 0 : root.imaginary,
  }));
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

/** Newton identities for det(lambda I - A), specialized to a 4x4 matrix. */
export function characteristicCoefficients(
  matrix: readonly number[][],
): [number, number, number, number, number] {
  if (matrix.length !== 4 || matrix.some((row) => row.length !== 4)) {
    throw new RangeError("structural characteristic polynomial requires a 4x4 matrix");
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

function steadyConfig(config: SimulationConfig, flowSpeed: number): SimulationConfig {
  const frozen = structuredClone(config);
  frozen.backend = "forward";
  frozen.fluid.flowSpeed = flowSpeed;
  frozen.fluid.flowRampTime = 0;
  frozen.fluid.flowModulationAmplitude = 0;
  return frozen;
}

function rhsAt(config: SimulationConfig, stateVector: readonly number[]): number[] {
  return stateToVector(evaluateForward(config, 1, vectorToState(stateVector)).derivative);
}

/**
 * Five-point central Jacobian of the frozen phase-1 right-hand side at the
 * reflection-symmetric zero state. A nonzero residual is reported rather than
 * silently treating a biased apparatus as symmetric.
 */
export function linearizeForwardAtSymmetricState(
  config: SimulationConfig,
  flowSpeed: number,
  differentiationSteps: readonly number[] = [1e-5, 1e-5, 1e-5, 1e-5],
): { config: SimulationConfig; jacobian: number[][]; residualNorm: number } {
  if (!(flowSpeed >= 0) || !Number.isFinite(flowSpeed)) {
    throw new RangeError("flow speed must be finite and nonnegative");
  }
  const frozen = steadyConfig(config, flowSpeed);
  const center = stateToVector(ZERO_STATE);
  const residual = rhsAt(frozen, center);
  const jacobian = Array.from({ length: 4 }, () => Array(4).fill(0) as number[]);
  for (let column = 0; column < 4; column += 1) {
    const step = differentiationSteps[column] ?? Number.NaN;
    if (!(step > 0) || !Number.isFinite(step)) throw new RangeError("differentiation steps must be positive");
    const plusOne = [...center];
    const minusOne = [...center];
    const plusTwo = [...center];
    const minusTwo = [...center];
    plusOne[column] = (plusOne[column] ?? 0) + step;
    minusOne[column] = (minusOne[column] ?? 0) - step;
    plusTwo[column] = (plusTwo[column] ?? 0) + 2 * step;
    minusTwo[column] = (minusTwo[column] ?? 0) - 2 * step;
    const fPlusOne = rhsAt(frozen, plusOne);
    const fMinusOne = rhsAt(frozen, minusOne);
    const fPlusTwo = rhsAt(frozen, plusTwo);
    const fMinusTwo = rhsAt(frozen, minusTwo);
    for (let row = 0; row < 4; row += 1) {
      jacobian[row]![column] = (
        -(fPlusTwo[row] ?? 0)
        + 8 * (fPlusOne[row] ?? 0)
        - 8 * (fMinusOne[row] ?? 0)
        + (fMinusTwo[row] ?? 0)
      ) / (12 * step);
    }
  }
  return {
    config: frozen,
    jacobian,
    residualNorm: Math.hypot(...residual),
  };
}

export function structuralSpectrumPoint(
  config: SimulationConfig,
  flowSpeed: number,
): StructuralSpectrumPoint {
  const linear = linearizeForwardAtSymmetricState(config, flowSpeed);
  if (!(linear.residualNorm <= 1e-10)) {
    throw new Error(
      `symmetric-state residual ${linear.residualNorm} exceeds 1e-10; `
        + "the requested point is not an equilibrium and cannot be linearized as one",
    );
  }
  const coefficients = characteristicCoefficients(linear.jacobian);
  const eigenvalues = polynomialRoots(coefficients);
  const maximumPolynomialResidual = Math.max(
    ...eigenvalues.map((value) => magnitude(evaluatePolynomial(coefficients, value))),
  );
  if (!(maximumPolynomialResidual < 1e-7)) {
    throw new Error(`quartic root residual ${maximumPolynomialResidual} exceeds the structural audit gate`);
  }
  const spectralAbscissa = Math.max(...eigenvalues.map((value) => value.real));
  const critical = eigenvalues.reduce((best, value) => value.real > best.real ? value : best);
  const [one, c1, c2, c3, c4] = coefficients;
  if (one !== 1) throw new Error("characteristic polynomial unexpectedly lost monic normalization");
  const delta2 = c1 * c2 - c3;
  const delta3 = c1 * c2 * c3 - c3 * c3 - c1 * c1 * c4;
  const evaluated = evaluateForward(linear.config, 1, ZERO_STATE);
  const derived = deriveParameters(linear.config);
  return {
    flowSpeed,
    reynolds: derived.reynolds,
    reducedVelocity: derived.reducedVelocity,
    wakeGrowthRate: evaluated.wakeGrowthRate,
    wakeAngularFrequency: evaluated.sheddingAngularFrequency,
    symmetricResidualNorm: linear.residualNorm,
    jacobian: linear.jacobian,
    characteristic: coefficients,
    hurwitz: {
      delta2,
      delta3,
      strictlyStable: c1 > 0 && c2 > 0 && c3 > 0 && c4 > 0 && delta2 > 0 && delta3 > 0,
    },
    eigenvalues,
    maximumPolynomialResidual,
    spectralAbscissa,
    criticalImaginaryMagnitude: Math.abs(critical.imaginary),
  };
}

export function scanStructuralSpectrum(
  config: SimulationConfig,
  minimumFlowSpeed: number,
  maximumFlowSpeed: number,
  intervals: number,
): StructuralSpectrumPoint[] {
  if (!(maximumFlowSpeed > minimumFlowSpeed) || !Number.isInteger(intervals) || intervals < 2) {
    throw new RangeError("structural scan requires an ordered interval and at least two intervals");
  }
  return Array.from({ length: intervals + 1 }, (_, index) => structuralSpectrumPoint(
    config,
    minimumFlowSpeed + (maximumFlowSpeed - minimumFlowSpeed) * index / intervals,
  ));
}

export function firstSignChange(
  points: readonly StructuralSpectrumPoint[],
  selector: (point: StructuralSpectrumPoint) => number,
): [number, number] | undefined {
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1];
    const right = points[index];
    if (left === undefined || right === undefined) continue;
    const leftValue = selector(left);
    const rightValue = selector(right);
    if (leftValue === 0) return [left.flowSpeed, left.flowSpeed];
    if (leftValue * rightValue <= 0) return [left.flowSpeed, right.flowSpeed];
  }
  return undefined;
}

export function locateScalarRoot(
  fn: (flowSpeed: number) => number,
  bracket: readonly [number, number],
  tolerance = 1e-11,
): number {
  let [left, right] = bracket;
  let leftValue = fn(left);
  let rightValue = fn(right);
  if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue) || leftValue * rightValue > 0) {
    throw new RangeError("root bracket must contain a finite sign change");
  }
  if (left === right) return left;
  for (let iteration = 0; iteration < 100 && right - left > tolerance; iteration += 1) {
    const midpoint = 0.5 * (left + right);
    const midpointValue = fn(midpoint);
    if (leftValue * midpointValue <= 0) {
      right = midpoint;
      rightValue = midpointValue;
    } else {
      left = midpoint;
      leftValue = midpointValue;
    }
  }
  void rightValue;
  return 0.5 * (left + right);
}

export function locateStructuralBoundary(
  config: SimulationConfig,
  bracket: readonly [number, number],
): LocatedStructuralBoundary {
  const flowSpeed = locateScalarRoot(
    (value) => structuralSpectrumPoint(config, value).spectralAbscissa,
    bracket,
  );
  const point = structuralSpectrumPoint(config, flowSpeed);
  const derivativeStep = Math.max(1e-7, 1e-4 * Math.max(flowSpeed, 1e-3));
  const lower = Math.max(0, flowSpeed - derivativeStep);
  const upper = flowSpeed + derivativeStep;
  const crossingSlope = (
    structuralSpectrumPoint(config, upper).spectralAbscissa
    - structuralSpectrumPoint(config, lower).spectralAbscissa
  ) / (upper - lower);
  if (!(Math.abs(crossingSlope) >= 1e-6)) {
    throw new Error(
      `spectral boundary crossing slope ${crossingSlope} is too small; `
        + "near-multiple or tangential roots require a separate analysis",
    );
  }
  return {
    flowSpeed,
    point,
    crossingSlope,
    type: point.criticalImaginaryMagnitude > 1e-4 ? "hopf-candidate" : "static-candidate",
    bracket: [bracket[0], bracket[1]],
  };
}
