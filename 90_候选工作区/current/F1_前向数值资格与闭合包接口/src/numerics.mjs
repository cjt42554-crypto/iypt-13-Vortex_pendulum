function requireFinite(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

function requirePositive(value, name) {
  requireFinite(value, name);
  if (value <= 0) throw new Error(`${name} must be positive`);
}

function requireEvenInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0 || value % 2 !== 0) throw new Error(`${name} must be a positive even integer`);
}

function vectorAddScaled(state, derivative, scale) {
  return state.map((value, index) => value + scale * derivative[index]);
}

function fourStateDerivative(state, frequencies) {
  return [
    state[1],
    -(frequencies[0] ** 2) * state[0],
    state[3],
    -(frequencies[1] ** 2) * state[2],
  ];
}

function rk4Step(state, stepSize, frequencies) {
  const k1 = fourStateDerivative(state, frequencies);
  const k2 = fourStateDerivative(vectorAddScaled(state, k1, stepSize / 2), frequencies);
  const k3 = fourStateDerivative(vectorAddScaled(state, k2, stepSize / 2), frequencies);
  const k4 = fourStateDerivative(vectorAddScaled(state, k3, stepSize), frequencies);
  return state.map(
    (value, index) => value + (stepSize / 6) * (k1[index] + 2 * k2[index] + 2 * k3[index] + k4[index]),
  );
}

export function analyticFourState(initialState, frequencies, time) {
  if (!Array.isArray(initialState) || initialState.length !== 4) throw new Error("initialState must contain four values");
  if (!Array.isArray(frequencies) || frequencies.length !== 2) throw new Error("frequencies must contain two values");
  for (const [index, value] of initialState.entries()) requireFinite(value, `initialState[${index}]`);
  for (const [index, value] of frequencies.entries()) requirePositive(value, `frequencies[${index}]`);
  requireFinite(time, "time");
  const result = [];
  for (let oscillator = 0; oscillator < 2; oscillator += 1) {
    const position0 = initialState[2 * oscillator];
    const velocity0 = initialState[2 * oscillator + 1];
    const omega = frequencies[oscillator];
    result.push(
      position0 * Math.cos(omega * time) + (velocity0 / omega) * Math.sin(omega * time),
      -position0 * omega * Math.sin(omega * time) + velocity0 * Math.cos(omega * time),
    );
  }
  return result;
}

export function integrateFourState(caseInput, stepSize) {
  const { initialState, angularFrequencies, startTime, endTime } = caseInput;
  requireFinite(startTime, "startTime");
  requireFinite(endTime, "endTime");
  requirePositive(stepSize, "stepSize");
  if (!(endTime > startTime)) throw new Error("endTime must be greater than startTime");
  const exactStepCount = (endTime - startTime) / stepSize;
  const stepCount = Math.round(exactStepCount);
  if (Math.abs(exactStepCount - stepCount) > 1e-12) throw new Error("time span must contain an integer number of steps");
  let state = [...initialState];
  const samples = [{ time: startTime, state: [...state] }];
  for (let step = 1; step <= stepCount; step += 1) {
    state = rk4Step(state, stepSize, angularFrequencies);
    samples.push({ time: startTime + step * stepSize, state: [...state] });
  }
  return samples;
}

export function trajectoryError(samples, caseInput, componentIndexes = [0, 1, 2, 3]) {
  let squaredError = 0;
  let squaredReference = 0;
  let maximumError = 0;
  let maximumReference = 0;
  let count = 0;
  for (const sample of samples) {
    const reference = analyticFourState(caseInput.initialState, caseInput.angularFrequencies, sample.time);
    for (const component of componentIndexes) {
      const error = Math.abs(sample.state[component] - reference[component]);
      squaredError += error * error;
      squaredReference += reference[component] * reference[component];
      maximumError = Math.max(maximumError, error);
      maximumReference = Math.max(maximumReference, Math.abs(reference[component]));
      count += 1;
    }
  }
  const referenceRms = Math.sqrt(squaredReference / count);
  if (referenceRms === 0 || maximumReference === 0) throw new Error("trajectory reference has zero normalization");
  return {
    normalizedRms: Math.sqrt(squaredError / count) / referenceRms,
    normalizedMaximum: maximumError / maximumReference,
  };
}

export function simpsonIntegrate(fn, lower, upper, panels) {
  requireFinite(lower, "lower");
  requireFinite(upper, "upper");
  requireEvenInteger(panels, "panels");
  if (!(upper > lower)) throw new Error("integration interval must be increasing");
  const step = (upper - lower) / panels;
  let sum = fn(lower) + fn(upper);
  requireFinite(sum, "endpoint integrand sum");
  for (let index = 1; index < panels; index += 1) {
    const value = fn(lower + index * step);
    requireFinite(value, `integrand[${index}]`);
    sum += (index % 2 === 0 ? 2 : 4) * value;
  }
  return (step / 3) * sum;
}

export function analyticWetCircleArea(radius, waterlineY) {
  requirePositive(radius, "radius");
  requireFinite(waterlineY, "waterlineY");
  if (waterlineY < -radius || waterlineY > radius) throw new Error("waterline lies outside the circle");
  const radical = Math.sqrt(Math.max(0, radius * radius - waterlineY * waterlineY));
  return waterlineY * radical + radius * radius * (Math.asin(waterlineY / radius) + Math.PI / 2);
}

export function numericalWetCircleArea(radius, waterlineY, panels) {
  requirePositive(radius, "radius");
  requireFinite(waterlineY, "waterlineY");
  requireEvenInteger(panels, "panels");
  if (waterlineY < -radius || waterlineY > radius) throw new Error("waterline lies outside the circle");
  const lower = -Math.PI / 2;
  const upper = Math.asin(waterlineY / radius);
  return simpsonIntegrate((theta) => 2 * radius * radius * Math.cos(theta) ** 2, lower, upper, panels);
}

export function conservativeOscillatorEnergy(caseInput) {
  const { mass, stiffness, initialPosition, initialVelocity, stepSize, endTime } = caseInput;
  requirePositive(mass, "mass");
  requirePositive(stiffness, "stiffness");
  requireFinite(initialPosition, "initialPosition");
  requireFinite(initialVelocity, "initialVelocity");
  requirePositive(stepSize, "stepSize");
  requirePositive(endTime, "endTime");
  const exactStepCount = endTime / stepSize;
  const stepCount = Math.round(exactStepCount);
  if (Math.abs(exactStepCount - stepCount) > 1e-12) throw new Error("endTime must contain an integer number of steps");
  const acceleration = (position) => -(stiffness / mass) * position;
  const energy = (position, velocity) => 0.5 * mass * velocity * velocity + 0.5 * stiffness * position * position;
  let position = initialPosition;
  let velocity = initialVelocity;
  let currentAcceleration = acceleration(position);
  const initialEnergy = energy(position, velocity);
  if (initialEnergy === 0) throw new Error("initial oscillator energy must be nonzero");
  const relativeErrors = [0];
  for (let step = 0; step < stepCount; step += 1) {
    position += velocity * stepSize + 0.5 * currentAcceleration * stepSize * stepSize;
    const nextAcceleration = acceleration(position);
    velocity += 0.5 * (currentAcceleration + nextAcceleration) * stepSize;
    currentAcceleration = nextAcceleration;
    relativeErrors.push((energy(position, velocity) - initialEnergy) / initialEnergy);
  }
  const finalRelativeEnergy = Math.abs(relativeErrors.at(-1));
  const localRelativeRms = Math.sqrt(
    relativeErrors.reduce((sum, error) => sum + error * error, 0) / relativeErrors.length,
  );
  return { finalRelativeEnergy, localRelativeRms, stepCount };
}

export function bisectRoot(fn, bracket, epsilonT) {
  if (!Array.isArray(bracket) || bracket.length !== 2) throw new Error("bracket must contain two endpoints");
  let [lower, upper] = bracket;
  requireFinite(lower, "bracket lower");
  requireFinite(upper, "bracket upper");
  requirePositive(epsilonT, "epsilonT");
  if (!(upper > lower)) throw new Error("bracket must be increasing");
  let lowerValue = fn(lower);
  let upperValue = fn(upper);
  requireFinite(lowerValue, "f(lower)");
  requireFinite(upperValue, "f(upper)");
  if (lowerValue === 0) return lower;
  if (upperValue === 0) return upper;
  if (Math.sign(lowerValue) === Math.sign(upperValue)) throw new Error("root is not bracketed");
  let iterations = 0;
  while (upper - lower > epsilonT) {
    const middle = (lower + upper) / 2;
    const middleValue = fn(middle);
    requireFinite(middleValue, "f(middle)");
    if (middleValue === 0) return middle;
    if (Math.sign(middleValue) === Math.sign(lowerValue)) {
      lower = middle;
      lowerValue = middleValue;
    } else {
      upper = middle;
      upperValue = middleValue;
    }
    iterations += 1;
    if (iterations > 256) throw new Error("bisection iteration guard exceeded");
  }
  return (lower + upper) / 2;
}

export function variableInertiaAcceleration(caseInput, derivativeStep) {
  const { time, omega, torque } = caseInput;
  requireFinite(time, "time");
  requireFinite(omega, "omega");
  requireFinite(torque, "torque");
  requirePositive(derivativeStep, "derivativeStep");
  const inertia = (atTime) => Math.exp(0.1 * atTime);
  const value = inertia(time);
  const derivative = (inertia(time + derivativeStep) - inertia(time - derivativeStep)) / (2 * derivativeStep);
  const acceleration = (torque - derivative * omega) / value;
  const exactDerivative = 0.1 * value;
  const exactAcceleration = (torque - exactDerivative * omega) / value;
  return { acceleration, derivative, exactAcceleration, inertia: value };
}

export function validateCoefficientSource(source, claim, contract) {
  if (typeof source !== "string" || typeof claim !== "string") throw new Error("coefficient source and claim must be strings");
  if (claim === "apparatus-calibrated") return contract.apparatusCalibratedAllowedSources.includes(source);
  if (claim === "synthetic-only") return source === "synthetic" || source === "analytic";
  if (claim === "illustrative-only") return contract.coefficientSources.includes(source);
  return false;
}

export function relativeDifference(first, second) {
  requireFinite(first, "first");
  requireFinite(second, "second");
  const scale = Math.max(Math.abs(first), Math.abs(second), Number.MIN_VALUE);
  return Math.abs(first - second) / scale;
}
