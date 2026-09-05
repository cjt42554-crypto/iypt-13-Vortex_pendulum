export type ParameterKind = "coefficient" | "apparatus" | "initial-state" | "nuisance";
export type CovarianceIdentity = "joint" | "conditional-on-apparatus" | "marginal-over-apparatus";
export type ProbabilityBasis = "probability-model" | "scenario-envelope";

export interface JointUncertaintyModel {
  readonly schemaVersion: "VP-JOINT-UNCERTAINTY-v1";
  readonly basisId: string;
  readonly parameterPaths: readonly string[];
  readonly parameterUnits: readonly string[];
  readonly parameterKinds: readonly ParameterKind[];
  readonly means: readonly number[];
  readonly covariance: readonly (readonly number[])[];
  readonly covarianceIdentity: CovarianceIdentity;
  readonly apparatusMarginalization: "not-applied" | "already-marginalized";
  readonly probabilityBasis: ProbabilityBasis;
}

export interface CovarianceDiagnostic {
  readonly dimension: number;
  readonly rank: number;
  readonly symmetric: true;
  readonly positiveSemidefinite: true;
  readonly eigenvalues: readonly number[];
  readonly minimumEigenvalue: number;
  readonly tolerance: number;
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

function validateRectangularMatrix(
  matrix: readonly (readonly number[])[],
  rows: number,
  columns: number,
  label: string,
): void {
  if (matrix.length !== rows) throw new RangeError(`${label} must have ${rows} rows`);
  for (const [rowIndex, row] of matrix.entries()) {
    if (row.length !== columns) throw new RangeError(`${label}[${rowIndex}] must have ${columns} columns`);
    row.forEach((value, columnIndex) => finiteNumber(value, `${label}[${rowIndex}][${columnIndex}]`));
  }
}

function jacobiEigenDecomposition(matrix: readonly (readonly number[])[]): EigenDecomposition {
  const size = matrix.length;
  const a = matrix.map((row) => [...row]);
  const vectors: number[][] = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => row === column ? 1 : 0));
  const scale = Math.max(0, ...a.flat().map(Math.abs));
  if (scale === 0) {
    return {
      values: Array<number>(size).fill(0),
      vectors,
    };
  }
  const convergence = Number.EPSILON * scale * Math.max(1, size) * 16;
  const maximumSweeps = Math.max(32, size * size * 32);
  for (let sweep = 0; sweep < maximumSweeps; sweep += 1) {
    let p = 0;
    let q = 0;
    let largest = 0;
    for (let row = 0; row < size; row += 1) {
      for (let column = row + 1; column < size; column += 1) {
        const candidate = Math.abs(a[row]?.[column] ?? 0);
        if (candidate > largest) {
          largest = candidate;
          p = row;
          q = column;
        }
      }
    }
    if (largest <= convergence) break;
    const app = a[p]?.[p] ?? 0;
    const aqq = a[q]?.[q] ?? 0;
    const apq = a[p]?.[q] ?? 0;
    const angle = 0.5 * Math.atan2(2 * apq, aqq - app);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    for (let index = 0; index < size; index += 1) {
      if (index === p || index === q) continue;
      const aip = a[index]?.[p] ?? 0;
      const aiq = a[index]?.[q] ?? 0;
      const rotatedP = cosine * aip - sine * aiq;
      const rotatedQ = sine * aip + cosine * aiq;
      if (a[index] !== undefined) {
        a[index]![p] = rotatedP;
        a[index]![q] = rotatedQ;
      }
      if (a[p] !== undefined) a[p]![index] = rotatedP;
      if (a[q] !== undefined) a[q]![index] = rotatedQ;
    }
    if (a[p] !== undefined) {
      a[p]![p] = cosine * cosine * app - 2 * sine * cosine * apq + sine * sine * aqq;
      a[p]![q] = 0;
    }
    if (a[q] !== undefined) {
      a[q]![q] = sine * sine * app + 2 * sine * cosine * apq + cosine * cosine * aqq;
      a[q]![p] = 0;
    }
    for (let row = 0; row < size; row += 1) {
      const vip = vectors[row]?.[p] ?? 0;
      const viq = vectors[row]?.[q] ?? 0;
      if (vectors[row] !== undefined) {
        vectors[row]![p] = cosine * vip - sine * viq;
        vectors[row]![q] = sine * vip + cosine * viq;
      }
    }
  }
  const order = Array.from({ length: size }, (_, index) => index)
    .sort((left, right) => (a[right]?.[right] ?? 0) - (a[left]?.[left] ?? 0));
  return {
    values: order.map((index) => a[index]?.[index] ?? 0),
    vectors: Array.from({ length: size }, (_, row) =>
      order.map((column) => vectors[row]?.[column] ?? 0)),
  };
}

/** Nondimensional correlation scaling keeps PSD decisions invariant to SI scales. */
function correlationScaling(covariance: readonly (readonly number[])[]) {
  const scales = covariance.map((row, i) => {
    if (row[i]! < 0) throw new RangeError("covariance is not positive semidefinite: negative variance");
    return Math.sqrt(row[i]!);
  });
  const correlation = covariance.map((row, i) => row.map((value, j) => {
    const bound = scales[i]! * scales[j]!;
    if (Math.abs(value - covariance[j]![i]!) > 1e-12 * bound) throw new RangeError("covariance is not symmetric");
    if (bound === 0) {
      if (value !== 0) throw new RangeError("covariance is not positive semidefinite: zero variance with nonzero cross term");
      return 0;
    }
    return .5 * (value + covariance[j]![i]!) / bound;
  }));
  return { scales, correlation };
}

export function validateCovarianceMatrix(
  covariance: readonly (readonly number[])[],
  dimension = covariance.length,
): CovarianceDiagnostic {
  if (!Number.isInteger(dimension) || dimension <= 0) {
    throw new RangeError("covariance dimension must be a positive integer");
  }
  validateRectangularMatrix(covariance, dimension, dimension, "covariance");
  const { correlation } = correlationScaling(covariance);
  const tolerance = dimension * 1e-12;
  const eigen = jacobiEigenDecomposition(correlation);
  const minimumEigenvalue = eigen.values.at(-1) ?? Number.NaN;
  if (minimumEigenvalue < -tolerance) {
    throw new RangeError(`covariance is not positive semidefinite; minimum eigenvalue=${minimumEigenvalue}`);
  }
  return Object.freeze({
    dimension,
    rank: eigen.values.filter((value) => value > tolerance).length,
    symmetric: true,
    positiveSemidefinite: true,
    eigenvalues: Object.freeze(eigen.values),
    minimumEigenvalue,
    tolerance,
  });
}

/** Browser-safe copy of the physical parameter-unit identity accepted by UQ. */
export const FORMAL_UNCERTAINTY_PARAMETER_UNITS: Readonly<Record<string, string>> = Object.freeze({
  "geometry.radius": "m",
  "geometry.topDistance": "m",
  "geometry.bottomDistance": "m",
  "geometry.pivotHeight": "m",
  "geometry.channelWidth": "m",
  "geometry.waterDepth": "m",
  "geometry.observationDistance": "m",
  "geometry.maximumAngle": "rad",
  "body.movingMass": "kg",
  "body.centerOfMassDistance": "m",
  "body.dryMomentOfInertia": "kg*m^2",
  "fluid.density": "kg/m^3",
  "fluid.kinematicViscosity": "m^2/s",
  "fluid.surfaceTension": "N/m",
  "fluid.gravity": "m/s^2",
  "fluid.flowSpeed": "m/s",
  "fluid.flowRampTime": "s",
  "fluid.flowModulationAmplitude": "1",
  "fluid.flowModulationFrequency": "Hz",
  "support.referenceAngle": "rad",
  "support.linearStiffness": "N*m/rad",
  "support.cubicStiffness": "N*m/rad^3",
  "support.viscousDamping": "N*m*s/rad",
  "support.coulombFriction": "N*m",
  "support.staticFrictionTorque": "N*m",
  "support.kineticFrictionTorque": "N*m",
  "support.frictionSmoothingSpeed": "rad/s",
  "rom.addedMassCoefficient": "1",
  "rom.sectionalDragCoefficient": "1",
  "rom.strouhalNumber": "1",
  "rom.referenceHopfReynolds": "1",
  "rom.hopfGrowthSlope": "1",
  "rom.cubicSaturation": "1",
  "rom.nonlinearFrequencyShift": "1",
  "rom.zeroFlowWakeDecayTime": "s",
  "rom.wakeActivationSpeed": "m/s",
  "rom.calibrationVelocityFloor": "m/s",
  "rom.couplingThetaReal": "1",
  "rom.couplingThetaImaginary": "1",
  "rom.couplingOmegaReal": "1",
  "rom.couplingOmegaImaginary": "1",
  "rom.couplingAccelerationReal": "1",
  "rom.couplingAccelerationImaginary": "1",
  "rom.liftOutputReal": "1",
  "rom.liftOutputImaginary": "1",
  "rom.finiteSpanCoherence": "1",
  "rom.calibrationMinReynolds": "1",
  "rom.calibrationMaxReynolds": "1",
  "rom.calibrationMaxAbsAngle": "rad",
  "rom.calibrationMaxVelocityRatio": "1",
  "rom.calibrationMaxNormalizedInflowRate": "1",
  "rom.calibrationMinWetSpan": "m",
  "initial.theta": "rad",
  "initial.omega": "rad/s",
  "initial.wakeReal": "1",
  "initial.wakeImaginary": "1",
});

export function validateJointUncertaintyModel(
  model: JointUncertaintyModel,
  { requireFormalParameterPaths = false }: { requireFormalParameterPaths?: boolean } = {},
): CovarianceDiagnostic {
  if (model.schemaVersion !== "VP-JOINT-UNCERTAINTY-v1") {
    throw new TypeError("joint uncertainty schemaVersion mismatch");
  }
  if (model.basisId.trim() === "") throw new TypeError("basisId must be non-empty");
  if (!["joint", "conditional-on-apparatus", "marginal-over-apparatus"].includes(model.covarianceIdentity)
    || !["not-applied", "already-marginalized"].includes(model.apparatusMarginalization)
    || !["probability-model", "scenario-envelope"].includes(model.probabilityBasis)) {
    throw new TypeError("unknown covariance or probability identity");
  }
  if (model.covarianceIdentity === "joint" && model.apparatusMarginalization !== "not-applied") {
    throw new TypeError("joint covariance cannot also be marginalized over apparatus");
  }
  const dimension = model.parameterPaths.length;
  if (dimension === 0) throw new RangeError("joint uncertainty needs at least one parameter");
  if (model.parameterUnits.length !== dimension
    || model.parameterKinds.length !== dimension
    || model.means.length !== dimension) {
    throw new RangeError("parameterPaths, parameterUnits, parameterKinds and means must have equal lengths");
  }
  const paths = new Set<string>();
  for (let index = 0; index < dimension; index += 1) {
    const path = model.parameterPaths[index] ?? "";
    const unit = model.parameterUnits[index] ?? "";
    if (path.trim() === "" || unit.trim() === "") {
      throw new TypeError(`parameter path/unit at index ${index} must be non-empty`);
    }
    if (paths.has(path)) throw new TypeError(`duplicate joint uncertainty parameter ${path}`);
    paths.add(path);
    const kind = model.parameterKinds[index];
    if (!["coefficient", "apparatus", "initial-state", "nuisance"].includes(kind ?? "")) throw new TypeError("unknown parameter kind");
    if (model.covarianceIdentity === "marginal-over-apparatus" && kind === "apparatus") {
      throw new TypeError("already marginalized covariance cannot add apparatus parameters again");
    }
    if (requireFormalParameterPaths) {
      const expectedKind = path.startsWith("rom.") ? "coefficient" : path.startsWith("initial.") ? "initial-state" : "apparatus";
      if (kind !== expectedKind) throw new TypeError(`parameter kind mismatch for ${path}`);
    }
    finiteNumber(model.means[index], `means[${index}]`);
    if (requireFormalParameterPaths) {
      const expected = FORMAL_UNCERTAINTY_PARAMETER_UNITS[path];
      if (expected === undefined) throw new TypeError(`unknown formal parameter path ${path}`);
      if (unit !== expected) {
        throw new TypeError(`unit mismatch for ${path}: expected ${expected}, received ${unit}`);
      }
    }
  }
  if (model.covarianceIdentity === "marginal-over-apparatus"
    && model.apparatusMarginalization !== "already-marginalized") {
    throw new TypeError("marginal covariance must declare apparatusMarginalization=already-marginalized");
  }
  if (model.covarianceIdentity === "conditional-on-apparatus"
    && model.apparatusMarginalization !== "not-applied") {
    throw new TypeError("conditional covariance cannot already include apparatus marginalization");
  }
  return validateCovarianceMatrix(model.covariance, dimension);
}

export interface LinearGradient {
  readonly values: readonly number[];
  readonly parameterUnits: readonly string[];
  readonly outputUnit: string;
}

export interface LinearPropagationResult {
  readonly outputUnit: string;
  readonly variance: number;
  readonly standardUncertainty: number;
  readonly covarianceBasisId: string;
}

export function linearPropagate(
  model: JointUncertaintyModel,
  gradient: LinearGradient,
): LinearPropagationResult {
  validateJointUncertaintyModel(model);
  const dimension = model.parameterPaths.length;
  if (gradient.values.length !== dimension || gradient.parameterUnits.length !== dimension) {
    throw new RangeError("gradient length must match joint parameter dimension");
  }
  if (gradient.outputUnit.trim() === "") throw new TypeError("outputUnit must be non-empty");
  for (let index = 0; index < dimension; index += 1) {
    finiteNumber(gradient.values[index], `gradient.values[${index}]`);
    if (gradient.parameterUnits[index] !== model.parameterUnits[index]) {
      throw new TypeError(`gradient parameter unit mismatch at ${model.parameterPaths[index]}`);
    }
  }
  let variance = 0;
  for (let row = 0; row < dimension; row += 1) {
    for (let column = 0; column < dimension; column += 1) {
      variance += (gradient.values[row] ?? 0)
        * (model.covariance[row]?.[column] ?? 0)
        * (gradient.values[column] ?? 0);
    }
  }
  const scale = Math.max(0, ...model.covariance.flat().map(Math.abs));
  if (variance < -scale * dimension * 1e-12) {
    throw new RangeError(`propagated variance is negative: ${variance}`);
  }
  variance = Math.max(0, variance);
  return Object.freeze({
    outputUnit: gradient.outputUnit,
    variance,
    standardUncertainty: Math.sqrt(variance),
    covarianceBasisId: model.basisId,
  });
}

export function residualVariance({
  observationVariance,
  predictionVariance,
  sharedCrossCovariance,
  observationUnit,
  predictionUnit,
}: {
  observationVariance: number;
  predictionVariance: number;
  sharedCrossCovariance: number;
  observationUnit: string;
  predictionUnit: string;
}): number {
  [observationVariance, predictionVariance, sharedCrossCovariance]
    .forEach((value, index) => finiteNumber(value, `residual variance input ${index}`));
  if (observationUnit !== predictionUnit) throw new TypeError("observation and prediction units must match");
  if (observationVariance < 0 || predictionVariance < 0) {
    throw new RangeError("observation and prediction variances must be non-negative");
  }
  const bound = Math.sqrt(observationVariance * predictionVariance);
  if (Math.abs(sharedCrossCovariance) > bound + 1e-12 * Math.max(observationVariance, predictionVariance)) {
    throw new RangeError("shared cross covariance violates the Cauchy bound");
  }
  const variance = observationVariance + predictionVariance - 2 * sharedCrossCovariance;
  return Math.max(0, variance);
}

export function assertCanAddApparatusUncertainty(model: JointUncertaintyModel): void {
  validateJointUncertaintyModel(model);
  if (model.covarianceIdentity !== "conditional-on-apparatus"
    || model.apparatusMarginalization !== "not-applied") {
    throw new Error("apparatus uncertainty would be duplicated: covariance is joint or already marginal over apparatus");
  }
}

function multiply(left: readonly (readonly number[])[], right: readonly (readonly number[])[]): number[][] {
  const rows = left.length;
  const inner = left[0]?.length ?? 0;
  if (inner !== right.length) throw new RangeError("matrix dimensions do not conform");
  const columns = right[0]?.length ?? 0;
  return Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
    let sum = 0;
    for (let index = 0; index < inner; index += 1) {
      sum += (left[row]?.[index] ?? 0) * (right[index]?.[column] ?? 0);
    }
    return sum;
  }));
}

function transpose(matrix: readonly (readonly number[])[]): number[][] {
  const columns = matrix[0]?.length ?? 0;
  return Array.from({ length: columns }, (_, column) => matrix.map((row) => row[column] ?? 0));
}

export function transformJointUncertainty(
  model: JointUncertaintyModel,
  transformation: readonly (readonly number[])[],
  output: Readonly<{
    basisId: string;
    parameterPaths: readonly string[];
    parameterUnits: readonly string[];
    parameterKinds?: readonly ParameterKind[];
  }>,
): JointUncertaintyModel {
  validateJointUncertaintyModel(model);
  const inputDimension = model.parameterPaths.length;
  const outputDimension = output.parameterPaths.length;
  validateRectangularMatrix(transformation, outputDimension, inputDimension, "transformation");
  if (output.parameterUnits.length !== outputDimension
    || (output.parameterKinds !== undefined && output.parameterKinds.length !== outputDimension)) {
    throw new RangeError("transformed parameter metadata lengths must match transformation rows");
  }
  if (output.basisId.trim() === "" || output.basisId === model.basisId) {
    throw new TypeError("a covariance transformation requires a new non-empty basisId");
  }
  const means = transformation.map((row) => row.reduce((sum, value, index) =>
    sum + value * (model.means[index] ?? 0), 0));
  const covariance = multiply(multiply(transformation, model.covariance), transpose(transformation));
  const transformed: JointUncertaintyModel = {
    schemaVersion: "VP-JOINT-UNCERTAINTY-v1",
    basisId: output.basisId,
    parameterPaths: Object.freeze([...output.parameterPaths]),
    parameterUnits: Object.freeze([...output.parameterUnits]),
    parameterKinds: Object.freeze(output.parameterKinds === undefined
      ? [...model.parameterKinds]
      : [...output.parameterKinds]),
    means: Object.freeze(means),
    covariance: Object.freeze(covariance.map((row) => Object.freeze(row))),
    covarianceIdentity: model.covarianceIdentity,
    apparatusMarginalization: model.apparatusMarginalization,
    probabilityBasis: model.probabilityBasis,
  };
  validateJointUncertaintyModel(transformed);
  return Object.freeze(transformed);
}

function applyTwoByTwo(
  jacobian: number[][],
  paths: readonly string[],
  leftPath: string,
  rightPath: string,
  block: readonly [readonly [number, number], readonly [number, number]],
): void {
  const left = paths.indexOf(leftPath);
  const right = paths.indexOf(rightPath);
  if (left < 0 && right < 0) return;
  if (left < 0 || right < 0) throw new Error(`wake gauge covariance must include both ${leftPath} and ${rightPath}`);
  if (jacobian[left] === undefined || jacobian[right] === undefined) return;
  jacobian[left][left] = block[0][0];
  jacobian[left][right] = block[0][1];
  jacobian[right][left] = block[1][0];
  jacobian[right][right] = block[1][1];
}

/** Real Jacobian for A*=cA, beta*=beta/|c|^2, gamma*=c gamma and L*=L/c. */
export function constantWakeGaugeJacobian(
  parameterPaths: readonly string[],
  constant: Readonly<{ real: number; imaginary: number }>,
): readonly (readonly number[])[] {
  finiteNumber(constant.real, "constant.real");
  finiteNumber(constant.imaginary, "constant.imaginary");
  const scaleSquared = constant.real ** 2 + constant.imaginary ** 2;
  if (!(scaleSquared > 0)) throw new RangeError("wake gauge constant must be non-zero");
  const size = parameterPaths.length;
  const jacobian: number[][] = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => row === column ? 1 : 0));
  for (const path of ["rom.cubicSaturation", "rom.nonlinearFrequencyShift"]) {
    const index = parameterPaths.indexOf(path);
    if (index >= 0 && jacobian[index] !== undefined) jacobian[index][index] = 1 / scaleSquared;
  }
  const stateBlock = [
    [constant.real, -constant.imaginary],
    [constant.imaginary, constant.real],
  ] as const;
  for (const [real, imaginary] of [
    ["rom.couplingThetaReal", "rom.couplingThetaImaginary"],
    ["rom.couplingOmegaReal", "rom.couplingOmegaImaginary"],
    ["rom.couplingAccelerationReal", "rom.couplingAccelerationImaginary"],
    ["initial.wakeReal", "initial.wakeImaginary"],
  ] as const) {
    applyTwoByTwo(jacobian, parameterPaths, real, imaginary, stateBlock);
  }
  const outputBlock = [
    [constant.real / scaleSquared, constant.imaginary / scaleSquared],
    [-constant.imaginary / scaleSquared, constant.real / scaleSquared],
  ] as const;
  applyTwoByTwo(jacobian, parameterPaths, "rom.liftOutputReal", "rom.liftOutputImaginary", outputBlock);
  return Object.freeze(jacobian.map((row) => Object.freeze(row)));
}

function seededUniform(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normalGenerator(seed: number): () => number {
  const uniform = seededUniform(seed);
  let spare: number | undefined;
  return () => {
    if (spare !== undefined) {
      const result = spare;
      spare = undefined;
      return result;
    }
    let first = 0;
    while (first === 0) first = uniform();
    const second = uniform();
    const radius = Math.sqrt(-2 * Math.log(first));
    const angle = 2 * Math.PI * second;
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  };
}

export function drawJointSamples(
  model: JointUncertaintyModel,
  sampleCount: number,
  seed: number,
): readonly (readonly number[])[] {
  const diagnostic = validateJointUncertaintyModel(model);
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
    throw new RangeError("sampleCount must be a positive integer");
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
    throw new RangeError("seed must be a uint32 integer");
  }
  const { scales, correlation } = correlationScaling(model.covariance);
  const eigen = jacobiEigenDecomposition(correlation);
  const normal = normalGenerator(seed);
  const dimension = model.parameterPaths.length;
  return Object.freeze(Array.from({ length: sampleCount }, () => {
    const independent = Array.from({ length: dimension }, () => normal());
    const sample = Array.from({ length: dimension }, (_, row) => {
      let offset = 0;
      for (let column = 0; column < dimension; column += 1) {
        const eigenvalue = Math.max(0, eigen.values[column] ?? 0);
        offset += (eigen.vectors[row]?.[column] ?? 0) * Math.sqrt(eigenvalue)
          * (independent[column] ?? 0);
      }
      return (model.means[row] ?? 0) + scales[row]! * offset;
    });
    return Object.freeze(sample);
  }));
}

export interface EnsembleEvaluation {
  readonly classification: string;
  readonly predictionValid: boolean;
  readonly terminated: boolean;
  readonly eventOccurred: boolean | null;
  readonly outputs?: Readonly<Record<string, number>>;
  readonly detail?: string;
}

export interface EnsembleSampleRecord extends EnsembleEvaluation {
  readonly sampleIndex: number;
  readonly parameterValues: readonly number[];
}

export interface EnsemblePropagationReport {
  readonly seed: number;
  readonly sampleCount: number;
  readonly probabilityBasis: ProbabilityBasis;
  readonly intervalIdentity: "sampling-distribution" | "scenario-envelope";
  readonly records: readonly EnsembleSampleRecord[];
  readonly classificationCounts: Readonly<Record<string, number>>;
  readonly classificationProportions: Readonly<Record<string, number>>;
  readonly validPredictionCount: number;
  readonly terminatedCount: number;
  readonly noEventCount: number;
}

export async function propagateJointSamples(
  model: JointUncertaintyModel,
  options: Readonly<{
    sampleCount: number;
    seed: number;
    evaluate: (sample: readonly number[], sampleIndex: number) => EnsembleEvaluation | Promise<EnsembleEvaluation>;
  }>,
): Promise<EnsemblePropagationReport> {
  const samples = drawJointSamples(model, options.sampleCount, options.seed);
  const records: EnsembleSampleRecord[] = [];
  const classificationCounts: Record<string, number> = {};
  for (const [sampleIndex, sample] of samples.entries()) {
    let outcome: EnsembleEvaluation;
    try {
      outcome = await options.evaluate(sample, sampleIndex);
      if (outcome.classification.trim() === "") throw new TypeError("classification must be non-empty");
      if (outcome.outputs !== undefined) {
        for (const [name, value] of Object.entries(outcome.outputs)) {
          finiteNumber(value, `outputs.${name}`);
        }
      }
    } catch (error) {
      outcome = Object.freeze({
        classification: "evaluation-error",
        predictionValid: false,
        terminated: true,
        eventOccurred: null,
        detail: String(error),
      });
    }
    const record = Object.freeze({
      ...outcome,
      sampleIndex,
      parameterValues: sample,
    });
    records.push(record);
    classificationCounts[outcome.classification] = (classificationCounts[outcome.classification] ?? 0) + 1;
  }
  const classificationProportions = Object.fromEntries(
    Object.entries(classificationCounts).map(([key, count]) => [key, count / options.sampleCount]),
  );
  return Object.freeze({
    seed: options.seed,
    sampleCount: options.sampleCount,
    probabilityBasis: model.probabilityBasis,
    intervalIdentity: model.probabilityBasis === "probability-model"
      ? "sampling-distribution"
      : "scenario-envelope",
    records: Object.freeze(records),
    classificationCounts: Object.freeze(classificationCounts),
    classificationProportions: Object.freeze(classificationProportions),
    validPredictionCount: records.filter((record) => record.predictionValid).length,
    terminatedCount: records.filter((record) => record.terminated).length,
    noEventCount: records.filter((record) => record.eventOccurred === false).length,
  });
}
