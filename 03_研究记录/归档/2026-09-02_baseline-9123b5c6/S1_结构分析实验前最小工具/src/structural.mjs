function requireFinite(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

function requirePositive(value, name) {
  requireFinite(value, name);
  if (value <= 0) throw new Error(`${name} must be positive`);
}

function requireVector(value, length, name) {
  if (!Array.isArray(value) || value.length !== length) throw new Error(`${name} must contain ${length} values`);
  for (const [index, entry] of value.entries()) requireFinite(entry, `${name}[${index}]`);
}

function requireSquare2(matrix, name) {
  if (!Array.isArray(matrix) || matrix.length !== 2) throw new Error(`${name} must be 2x2`);
  for (let row = 0; row < 2; row += 1) requireVector(matrix[row], 2, `${name}[${row}]`);
}

export function frozenVectorField(state) {
  requireVector(state, 2, "state");
  const [x, y] = state;
  return [x ** 3 + 2 * y, -x + Math.sin(y)];
}

export function analyticFrozenJacobian(state) {
  requireVector(state, 2, "state");
  const [x, y] = state;
  return [[3 * x * x, 2], [-1, Math.cos(y)]];
}

export function centralDifferenceJacobian(vectorField, point, stepSize) {
  requireVector(point, 2, "point");
  requirePositive(stepSize, "stepSize");
  const jacobian = [new Array(2), new Array(2)];
  for (let column = 0; column < 2; column += 1) {
    const plus = [...point];
    const minus = [...point];
    plus[column] += stepSize;
    minus[column] -= stepSize;
    const fPlus = vectorField(plus);
    const fMinus = vectorField(minus);
    requireVector(fPlus, 2, "f(point+h)");
    requireVector(fMinus, 2, "f(point-h)");
    for (let row = 0; row < 2; row += 1) jacobian[row][column] = (fPlus[row] - fMinus[row]) / (2 * stepSize);
  }
  return jacobian;
}

function frobeniusNorm(matrix) {
  return Math.sqrt(matrix.flat().reduce((sum, value) => sum + value * value, 0));
}

export function normalizedMatrixError(estimate, reference) {
  requireSquare2(estimate, "estimate");
  requireSquare2(reference, "reference");
  const difference = estimate.map((row, rowIndex) =>
    row.map((value, columnIndex) => value - reference[rowIndex][columnIndex]),
  );
  const scale = frobeniusNorm(reference);
  if (scale === 0) throw new Error("reference matrix has zero norm");
  return frobeniusNorm(difference) / scale;
}

export function multiplyPolynomials(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || right.length === 0) {
    throw new Error("polynomials must be non-empty coefficient arrays");
  }
  const result = new Array(left.length + right.length - 1).fill(0);
  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    requireFinite(left[leftIndex], `left[${leftIndex}]`);
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      requireFinite(right[rightIndex], `right[${rightIndex}]`);
      result[leftIndex + rightIndex] += left[leftIndex] * right[rightIndex];
    }
  }
  return result;
}

function rootsAndPolynomialForBlock(block) {
  requireSquare2(block, "block");
  const trace = block[0][0] + block[1][1];
  const determinant = block[0][0] * block[1][1] - block[0][1] * block[1][0];
  const discriminant = trace * trace - 4 * determinant;
  const polynomial = [1, -trace, determinant];
  if (discriminant >= 0) {
    const root = Math.sqrt(discriminant);
    return {
      polynomial,
      roots: [{ real: (trace + root) / 2, imaginary: 0 }, { real: (trace - root) / 2, imaginary: 0 }],
    };
  }
  const imaginary = Math.sqrt(-discriminant) / 2;
  return {
    polynomial,
    roots: [{ real: trace / 2, imaginary }, { real: trace / 2, imaginary: -imaginary }],
  };
}

function complexMultiply(left, right) {
  return {
    real: left.real * right.real - left.imaginary * right.imaginary,
    imaginary: left.real * right.imaginary + left.imaginary * right.real,
  };
}

function complexAdd(left, right) {
  return { real: left.real + right.real, imaginary: left.imaginary + right.imaginary };
}

function complexMagnitude(value) {
  return Math.hypot(value.real, value.imaginary);
}

export function normalizedPolynomialResidual(coefficients, root) {
  if (!Array.isArray(coefficients) || coefficients.length < 2) throw new Error("polynomial must have degree at least one");
  requireFinite(root?.real, "root.real");
  requireFinite(root?.imaginary, "root.imaginary");
  let value = { real: 0, imaginary: 0 };
  for (const [index, coefficient] of coefficients.entries()) {
    requireFinite(coefficient, `coefficients[${index}]`);
    value = complexAdd(complexMultiply(value, root), { real: coefficient, imaginary: 0 });
  }
  const rootMagnitude = complexMagnitude(root);
  const degree = coefficients.length - 1;
  const scale = coefficients.reduce(
    (sum, coefficient, index) => sum + Math.abs(coefficient) * rootMagnitude ** (degree - index),
    0,
  );
  return complexMagnitude(value) / Math.max(scale, Number.MIN_VALUE);
}

export function blockSpectrumCrosscheck(block1, block2) {
  const first = rootsAndPolynomialForBlock(block1);
  const second = rootsAndPolynomialForBlock(block2);
  const characteristicPolynomial = multiplyPolynomials(first.polynomial, second.polynomial);
  const roots = [...first.roots, ...second.roots];
  const residuals = roots.map((root) => normalizedPolynomialResidual(characteristicPolynomial, root));
  return { characteristicPolynomial, roots, residuals, maximumNormalizedResidual: Math.max(...residuals) };
}

export function hopfLinearAnalysis(omega, muValues) {
  requirePositive(omega, "omega");
  if (!Array.isArray(muValues) || muValues.length !== 3) throw new Error("muValues must contain three values");
  for (const [index, value] of muValues.entries()) requireFinite(value, `muValues[${index}]`);
  if (!(muValues[0] < muValues[1] && muValues[1] < muValues[2])) throw new Error("muValues must increase strictly");
  const samples = muValues.map((mu) => ({
    mu,
    eigenvalues: [{ real: mu, imaginary: omega }, { real: mu, imaginary: -omega }],
    stability: mu < 0 ? "stable" : mu > 0 ? "unstable" : "critical",
  }));
  const transversality = (samples[2].eigenvalues[0].real - samples[0].eigenvalues[0].real) /
    (muValues[2] - muValues[0]);
  return { samples, transversality };
}

export function exposeIdentifiableCombination(parameters, contract) {
  if (parameters === null || typeof parameters !== "object" || Array.isArray(parameters)) throw new Error("parameters must be an object");
  const keys = Object.keys(parameters);
  for (const forbidden of contract.forbiddenUnidentifiedSplits) {
    if (Object.hasOwn(parameters, forbidden)) throw new Error(`unidentified split ${forbidden} is forbidden`);
  }
  if (keys.length !== 1 || keys[0] !== "L_gamma_j") throw new Error("only L_gamma_j may be exposed");
  requireFinite(parameters.L_gamma_j, "L_gamma_j");
  return Object.freeze({ L_gamma_j: parameters.L_gamma_j });
}

export function synthesizeSinusoid({ sampleRateHz, sampleCount, frequencyHz, phaseRadians, amplitude }) {
  requirePositive(sampleRateHz, "sampleRateHz");
  if (!Number.isInteger(sampleCount) || sampleCount < 4) throw new Error("sampleCount must be an integer >= 4");
  requirePositive(frequencyHz, "frequencyHz");
  requireFinite(phaseRadians, "phaseRadians");
  requirePositive(amplitude, "amplitude");
  if (frequencyHz >= sampleRateHz / 2) throw new Error("frequency must be below Nyquist");
  return Array.from(
    { length: sampleCount },
    (_, index) => amplitude * Math.sin((2 * Math.PI * frequencyHz * index) / sampleRateHz + phaseRadians),
  );
}

function goertzelPower(samples, bin) {
  const omega = (2 * Math.PI * bin) / samples.length;
  const coefficient = 2 * Math.cos(omega);
  let previous = 0;
  let previousPrevious = 0;
  for (const sample of samples) {
    const current = sample + coefficient * previous - previousPrevious;
    previousPrevious = previous;
    previous = current;
  }
  return previousPrevious * previousPrevious + previous * previous - coefficient * previous * previousPrevious;
}

export function estimateFrequencyPhase(samples, sampleRateHz) {
  if (!Array.isArray(samples) || samples.length < 4) throw new Error("samples must contain at least four values");
  requirePositive(sampleRateHz, "sampleRateHz");
  for (const [index, value] of samples.entries()) requireFinite(value, `samples[${index}]`);
  let bestBin = 1;
  let bestPower = -Infinity;
  const highestBin = Math.floor((samples.length - 1) / 2);
  for (let bin = 1; bin <= highestBin; bin += 1) {
    const power = goertzelPower(samples, bin);
    if (power > bestPower) {
      bestPower = power;
      bestBin = bin;
    }
  }
  let sineProjection = 0;
  let cosineProjection = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const angle = (2 * Math.PI * bestBin * index) / samples.length;
    sineProjection += samples[index] * Math.sin(angle);
    cosineProjection += samples[index] * Math.cos(angle);
  }
  const sineCoefficient = (2 * sineProjection) / samples.length;
  const cosineCoefficient = (2 * cosineProjection) / samples.length;
  return {
    frequencyHz: (bestBin * sampleRateHz) / samples.length,
    phaseRadians: Math.atan2(cosineCoefficient, sineCoefficient),
    amplitude: Math.hypot(sineCoefficient, cosineCoefficient),
    dominantBin: bestBin,
  };
}

export function wrappedPhaseError(estimate, reference) {
  requireFinite(estimate, "phase estimate");
  requireFinite(reference, "phase reference");
  return Math.abs(Math.atan2(Math.sin(estimate - reference), Math.cos(estimate - reference)));
}

export function syntheticAveragePower(caseInput) {
  const {
    sampleRateHz,
    sampleCount,
    frequencyHz,
    forceAmplitude,
    velocityAmplitude,
    phaseDifferenceRadians,
  } = caseInput;
  const force = synthesizeSinusoid({
    sampleRateHz,
    sampleCount,
    frequencyHz,
    phaseRadians: 0,
    amplitude: forceAmplitude,
  });
  const velocity = synthesizeSinusoid({
    sampleRateHz,
    sampleCount,
    frequencyHz,
    phaseRadians: phaseDifferenceRadians,
    amplitude: velocityAmplitude,
  });
  const estimate = force.reduce((sum, value, index) => sum + value * velocity[index], 0) / sampleCount;
  const analytic = 0.5 * forceAmplitude * velocityAmplitude * Math.cos(phaseDifferenceRadians);
  const relativeError = Math.abs(estimate - analytic) / Math.abs(analytic);
  return { estimate, analytic, relativeError };
}

export function validateLiteraturePriorLabel(label) {
  return label === "illustrative-only";
}
