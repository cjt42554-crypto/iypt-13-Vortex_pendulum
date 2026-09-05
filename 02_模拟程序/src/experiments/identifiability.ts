export interface ComplexValue {
  readonly real: number;
  readonly imaginary: number;
}

export type IdentificationParameterRole = "coefficient" | "initial-state" | "nuisance";

export interface DesignColumn {
  readonly name: string;
  readonly unit: string;
  readonly role: IdentificationParameterRole;
}

export interface DesignMatrixInput {
  readonly columns: readonly DesignColumn[];
  readonly rows: readonly (readonly number[])[];
  readonly weights?: readonly number[];
  readonly relativeTolerance?: number;
}

export interface CorrelatedColumnPair {
  readonly left: string;
  readonly right: string;
  readonly correlation: number;
}

export interface NullDirection {
  readonly relativeSingularValue: number;
  readonly coefficients: Readonly<Record<string, number>>;
}

export interface DesignMatrixDiagnostic {
  readonly rowCount: number;
  readonly columnCount: number;
  readonly rank: number;
  readonly fullColumnRank: boolean;
  readonly singularValues: readonly number[];
  readonly relativeSingularValues: readonly number[];
  readonly conditionNumber: number | null;
  readonly columnNorms: readonly number[];
  readonly zeroColumns: readonly string[];
  readonly correlatedColumns: readonly CorrelatedColumnPair[];
  readonly nullDirections: readonly NullDirection[];
  readonly unknownInitialWake: Readonly<{
    realDeclared: boolean;
    imaginaryDeclared: boolean;
    complete: boolean;
  }>;
}

interface EigenDecomposition {
  readonly values: number[];
  /** Eigenvectors are stored by column. */
  readonly vectors: number[][];
}

function finiteNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number`);
  }
}

function validateColumns(columns: readonly DesignColumn[]): void {
  if (columns.length === 0) throw new RangeError("design matrix needs at least one column");
  const names = new Set<string>();
  for (const [index, column] of columns.entries()) {
    if (column.name.trim() === "") throw new TypeError(`columns[${index}].name must be non-empty`);
    if (column.unit.trim() === "") throw new TypeError(`columns[${index}].unit must be non-empty`);
    if (names.has(column.name)) throw new TypeError(`duplicate design column ${column.name}`);
    names.add(column.name);
  }
}

/** One-sided Jacobi SVD avoids squaring the condition number in rank decisions. */
function scaledDesignSvd(rows: readonly (readonly number[])[], weights: readonly number[], norms: readonly number[]): EigenDecomposition {
  const n = norms.length;
  const a = rows.map((row, i) => row.map((v, j) => norms[j] === 0 ? 0 : v * Math.sqrt(weights[i]!) / norms[j]!));
  const vectors: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  let converged = false;
  for (let sweep = 0; sweep < 100; sweep += 1) {
    let changed = false;
    for (let p = 0; p < n; p += 1) for (let q = p + 1; q < n; q += 1) {
      let app = 0, aqq = 0, apq = 0;
      for (const row of a) { app += row[p]! ** 2; aqq += row[q]! ** 2; apq += row[p]! * row[q]!; }
      if (Math.abs(apq) <= 8 * Number.EPSILON * Math.sqrt(app * aqq)) continue;
      const angle = .5 * Math.atan2(2 * apq, aqq - app);
      const c = Math.cos(angle), s = Math.sin(angle);
      for (const row of [...a, ...vectors]) {
        const x = row[p]!, y = row[q]!;
        row[p] = c * x - s * y; row[q] = s * x + c * y;
      }
      changed = true;
    }
    if (!changed) { converged = true; break; }
  }
  if (!converged) throw new Error("design SVD failed to converge");
  const values = Array.from({ length: n }, (_, j) => a.reduce((sum, row) => sum + row[j]! ** 2, 0));
  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => values[j]! - values[i]!);
  return { values: order.map((i) => values[i]!), vectors: vectors.map((row) => order.map((i) => row[i]!)) };
}

function weightedGram(
  rows: readonly (readonly number[])[],
  weights: readonly number[],
  columnNorms: readonly number[],
): number[][] {
  const width = columnNorms.length;
  const gram = Array.from({ length: width }, () => Array<number>(width).fill(0));
  for (let row = 0; row < rows.length; row += 1) {
    const values = rows[row] ?? [];
    const weight = weights[row] ?? 0;
    for (let left = 0; left < width; left += 1) {
      const leftNorm = columnNorms[left] ?? 0;
      if (leftNorm === 0) continue;
      for (let right = left; right < width; right += 1) {
        const rightNorm = columnNorms[right] ?? 0;
        if (rightNorm === 0) continue;
        const contribution = weight * (values[left] ?? 0) * (values[right] ?? 0)
          / (leftNorm * rightNorm);
        if (gram[left] !== undefined) gram[left]![right] = (gram[left]![right] ?? 0) + contribution;
        if (left !== right && gram[right] !== undefined) {
          gram[right]![left] = (gram[right]![left] ?? 0) + contribution;
        }
      }
    }
  }
  return gram;
}

export function analyzeDesignMatrix(input: DesignMatrixInput): DesignMatrixDiagnostic {
  validateColumns(input.columns);
  if (input.rows.length === 0) throw new RangeError("design matrix needs at least one row");
  const width = input.columns.length;
  const weights = input.weights === undefined
    ? Array<number>(input.rows.length).fill(1)
    : [...input.weights];
  if (weights.length !== input.rows.length) throw new RangeError("weights length must equal row count");
  for (const [rowIndex, row] of input.rows.entries()) {
    if (row.length !== width) throw new RangeError(`rows[${rowIndex}] has width ${row.length}; expected ${width}`);
    row.forEach((value, columnIndex) => finiteNumber(value, `rows[${rowIndex}][${columnIndex}]`));
    finiteNumber(weights[rowIndex], `weights[${rowIndex}]`);
    if ((weights[rowIndex] ?? 0) <= 0) throw new RangeError(`weights[${rowIndex}] must be positive`);
  }
  const columnNorms = Array.from({ length: width }, (_, column) => Math.sqrt(
    input.rows.reduce((sum, row, rowIndex) =>
      sum + (weights[rowIndex] ?? 0) * (row[column] ?? 0) ** 2, 0),
  ));
  const gram = weightedGram(input.rows, weights, columnNorms);
  const eigen = scaledDesignSvd(input.rows, weights, columnNorms);
  const singularValues = eigen.values.map((value) => Math.sqrt(Math.max(0, value)));
  const maximum = singularValues[0] ?? 0;
  const tolerance = input.relativeTolerance ?? Math.max(input.rows.length, width) * Number.EPSILON * 32;
  finiteNumber(tolerance, "relativeTolerance");
  if (!(tolerance > 0)) throw new RangeError("relativeTolerance must be positive");
  const relative = singularValues.map((value) => maximum === 0 ? 0 : value / maximum);
  const rank = relative.filter((value) => value > tolerance).length;
  const nonzero = singularValues.filter((_, index) => (relative[index] ?? 0) > tolerance);
  const correlatedColumns: CorrelatedColumnPair[] = [];
  for (let left = 0; left < width; left += 1) {
    if ((columnNorms[left] ?? 0) === 0) continue;
    for (let right = left + 1; right < width; right += 1) {
      if ((columnNorms[right] ?? 0) === 0) continue;
      const correlation = gram[left]?.[right] ?? 0;
      if (Math.abs(correlation) >= 1 - 1e-10) {
        correlatedColumns.push(Object.freeze({
          left: input.columns[left]?.name ?? "",
          right: input.columns[right]?.name ?? "",
          correlation,
        }));
      }
    }
  }
  const nullDirections: NullDirection[] = [];
  for (let index = 0; index < width; index += 1) {
    if ((relative[index] ?? 0) > tolerance) continue;
    const coefficients: Record<string, number> = {};
    for (let column = 0; column < width; column += 1) {
      coefficients[input.columns[column]?.name ?? ""] = eigen.vectors[column]?.[index] ?? 0;
    }
    nullDirections.push(Object.freeze({
      relativeSingularValue: relative[index] ?? 0,
      coefficients: Object.freeze(coefficients),
    }));
  }
  const initialStateNames = new Set(
    input.columns.filter((column) => column.role === "initial-state").map((column) => column.name),
  );
  const realDeclared = initialStateNames.has("initial.wakeReal");
  const imaginaryDeclared = initialStateNames.has("initial.wakeImaginary");
  return Object.freeze({
    rowCount: input.rows.length,
    columnCount: width,
    rank,
    fullColumnRank: rank === width,
    singularValues: Object.freeze(singularValues),
    relativeSingularValues: Object.freeze(relative),
    conditionNumber: rank === width && nonzero.length > 0
      ? (nonzero[0] ?? 0) / (nonzero.at(-1) ?? Number.NaN)
      : null,
    columnNorms: Object.freeze(columnNorms),
    zeroColumns: Object.freeze(input.columns
      .filter((_, index) => (columnNorms[index] ?? 0) === 0)
      .map((column) => column.name)),
    correlatedColumns: Object.freeze(correlatedColumns),
    nullDirections: Object.freeze(nullDirections),
    unknownInitialWake: Object.freeze({
      realDeclared,
      imaginaryDeclared,
      complete: realDeclared && imaginaryDeclared,
    }),
  });
}

export function wakeAmplitudeDesignRows(amplitudes: readonly number[]): readonly (readonly number[])[] {
  if (amplitudes.length === 0) throw new RangeError("at least one wake amplitude is required");
  return Object.freeze(amplitudes.map((amplitude, index) => {
    finiteNumber(amplitude, `amplitudes[${index}]`);
    if (amplitude < 0) throw new RangeError(`amplitudes[${index}] must be non-negative`);
    return Object.freeze([1, -(amplitude ** 2)]);
  }));
}

export function wakeCouplingDesignRows(
  samples: readonly Readonly<{ theta: number; omega: number; acceleration: number; }>[]
): readonly (readonly number[])[] {
  if (samples.length === 0) throw new RangeError("at least one prescribed-motion sample is required");
  return Object.freeze(samples.map((sample, index) => {
    finiteNumber(sample.theta, `samples[${index}].theta`);
    finiteNumber(sample.omega, `samples[${index}].omega`);
    finiteNumber(sample.acceleration, `samples[${index}].acceleration`);
    return Object.freeze([sample.theta, sample.omega, sample.acceleration]);
  }));
}

export const WAKE_INITIAL_STATE_COLUMNS: readonly DesignColumn[] = Object.freeze([
  Object.freeze({ name: "initial.wakeReal", unit: "1", role: "initial-state" as const }),
  Object.freeze({ name: "initial.wakeImaginary", unit: "1", role: "initial-state" as const }),
]);

export interface UnforcedWakeParameters {
  readonly muPerSecond: number;
  readonly betaRealPerSecond: number;
  readonly betaImaginaryPerSecond: number;
  readonly linearAngularFrequencyRadPerSecond: number;
  readonly initial: ComplexValue;
}

export interface UnforcedWakeState {
  readonly wake: ComplexValue;
  readonly amplitudeSquared: number;
  readonly phaseRad: number | null;
  readonly phaseVelocityRadPerSecond: number | null;
}

export function analyticUnforcedWake(
  parameters: UnforcedWakeParameters,
  timeSeconds: number,
): UnforcedWakeState {
  finiteNumber(timeSeconds, "timeSeconds");
  if (timeSeconds < 0) throw new RangeError("timeSeconds must be non-negative");
  const { muPerSecond: mu, betaRealPerSecond: betaReal,
    betaImaginaryPerSecond: betaImaginary,
    linearAngularFrequencyRadPerSecond: omega, initial } = parameters;
  [mu, betaReal, betaImaginary, omega, initial.real, initial.imaginary]
    .forEach((value, index) => finiteNumber(value, `wake parameter ${index}`));
  if (!(betaReal > 0)) throw new RangeError("betaRealPerSecond must be positive");
  const initialSquared = initial.real ** 2 + initial.imaginary ** 2;
  if (initialSquared === 0) {
    return Object.freeze({
      wake: Object.freeze({ real: 0, imaginary: 0 }),
      amplitudeSquared: 0,
      phaseRad: null,
      phaseVelocityRadPerSecond: null,
    });
  }
  const denominator = mu === 0
    ? 1 + 2 * betaReal * initialSquared * timeSeconds
    : 1 + betaReal * initialSquared / mu * Math.expm1(2 * mu * timeSeconds);
  if (!(denominator > 0) || !Number.isFinite(denominator)) {
    throw new RangeError("unforced wake analytic denominator is outside its valid branch");
  }
  const amplitudeSquared = mu === 0
    ? initialSquared / denominator
    : initialSquared * Math.exp(2 * mu * timeSeconds) / denominator;
  const phaseIncrement = omega * timeSeconds
    - betaImaginary / (2 * betaReal) * Math.log(denominator);
  const scale = Math.sqrt(amplitudeSquared / initialSquared);
  const cosine = Math.cos(phaseIncrement);
  const sine = Math.sin(phaseIncrement);
  const wake = Object.freeze({
    real: scale * (initial.real * cosine - initial.imaginary * sine),
    imaginary: scale * (initial.real * sine + initial.imaginary * cosine),
  });
  return Object.freeze({
    wake,
    amplitudeSquared,
    phaseRad: Math.atan2(wake.imaginary, wake.real),
    phaseVelocityRadPerSecond: omega - betaImaginary * amplitudeSquared,
  });
}

export interface SaturatedWakeIdentity {
  readonly amplitude: number;
  readonly nonlinearAngularFrequencyRadPerSecond: number;
  readonly observedFrequencyHz: number;
}

export function saturatedWakeIdentity(
  muPerSecond: number,
  betaRealPerSecond: number,
  linearAngularFrequencyRadPerSecond: number,
  betaImaginaryPerSecond: number,
): SaturatedWakeIdentity {
  [muPerSecond, betaRealPerSecond, linearAngularFrequencyRadPerSecond, betaImaginaryPerSecond]
    .forEach((value, index) => finiteNumber(value, `saturated wake parameter ${index}`));
  if (!(muPerSecond > 0) || !(betaRealPerSecond > 0)) {
    throw new RangeError("non-zero saturated branch requires mu>0 and betaReal>0");
  }
  const nonlinearAngularFrequencyRadPerSecond = linearAngularFrequencyRadPerSecond
    - betaImaginaryPerSecond * muPerSecond / betaRealPerSecond;
  return Object.freeze({
    amplitude: Math.sqrt(muPerSecond / betaRealPerSecond),
    nonlinearAngularFrequencyRadPerSecond,
    observedFrequencyHz: Math.abs(nonlinearAngularFrequencyRadPerSecond) / (2 * Math.PI),
  });
}
