const FIELD_NAMES = Object.freeze([
  "rho",
  "ux",
  "uy",
  "mask",
  "forceX",
  "forceY",
]);

export function normalizedDifference(candidate, reference) {
  if (!Number.isFinite(candidate) || !Number.isFinite(reference)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(candidate - reference)
    / Math.max(Math.abs(candidate), Math.abs(reference), 1e-15);
}

function neumaierAdd(state, value) {
  const next = state.sum + value;
  state.correction += Math.abs(state.sum) >= Math.abs(value)
    ? state.sum - next + value
    : value - next + state.sum;
  state.sum = next;
}

function neumaierValue(state) {
  return state.sum + state.correction;
}

function arrayMetrics(candidate, reference, countNegative = false) {
  if (!(candidate instanceof Float64Array)
    || !(reference instanceof Float64Array)
    || candidate.length !== reference.length) {
    throw new TypeError("H2-N array comparison shape mismatch");
  }
  let maximumNormalizedDifference = 0;
  const squaredError = { sum: 0, correction: 0 };
  const squaredCandidate = { sum: 0, correction: 0 };
  const squaredReference = { sum: 0, correction: 0 };
  let candidateNonFiniteCount = 0;
  let referenceNonFiniteCount = 0;
  let candidateNegativeCount = 0;
  let referenceNegativeCount = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    const candidateValue = candidate[index];
    const referenceValue = reference[index];
    if (!Number.isFinite(candidateValue)) candidateNonFiniteCount += 1;
    if (!Number.isFinite(referenceValue)) referenceNonFiniteCount += 1;
    if (countNegative && candidateValue < 0) candidateNegativeCount += 1;
    if (countNegative && referenceValue < 0) referenceNegativeCount += 1;
    if (!Number.isFinite(candidateValue) || !Number.isFinite(referenceValue)) {
      maximumNormalizedDifference = Number.POSITIVE_INFINITY;
      continue;
    }
    maximumNormalizedDifference = Math.max(
      maximumNormalizedDifference,
      normalizedDifference(candidateValue, referenceValue),
    );
    const error = candidateValue - referenceValue;
    neumaierAdd(squaredError, error * error);
    neumaierAdd(squaredCandidate, candidateValue * candidateValue);
    neumaierAdd(squaredReference, referenceValue * referenceValue);
  }
  const denominator = Math.max(
    neumaierValue(squaredCandidate),
    neumaierValue(squaredReference),
    1e-30,
  );
  return Object.freeze({
    maximumNormalizedDifference,
    normalizedL2: Math.sqrt(neumaierValue(squaredError) / denominator),
    candidateNonFiniteCount,
    referenceNonFiniteCount,
    negativePopulationCountDifference: countNegative
      ? Math.abs(candidateNegativeCount - referenceNegativeCount)
      : 0,
  });
}

function populationTotals(distributions) {
  const mass = { sum: 0, correction: 0 };
  const momentumX = { sum: 0, correction: 0 };
  const momentumY = { sum: 0, correction: 0 };
  for (let offset = 0; offset < distributions.length; offset += 9) {
    const f0 = distributions[offset];
    const f1 = distributions[offset + 1];
    const f2 = distributions[offset + 2];
    const f3 = distributions[offset + 3];
    const f4 = distributions[offset + 4];
    const f5 = distributions[offset + 5];
    const f6 = distributions[offset + 6];
    const f7 = distributions[offset + 7];
    const f8 = distributions[offset + 8];
    neumaierAdd(mass, f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8);
    neumaierAdd(momentumX, f1 - f3 + f5 - f6 - f7 + f8);
    neumaierAdd(momentumY, f2 - f4 + f5 + f6 - f7 - f8);
  }
  return Object.freeze({
    mass: neumaierValue(mass),
    momentumX: neumaierValue(momentumX),
    momentumY: neumaierValue(momentumY),
  });
}

function rawReaction(snapshot) {
  const x = { sum: 0, correction: 0 };
  const y = { sum: 0, correction: 0 };
  for (let cell = 0; cell < snapshot.forceX.length; cell += 1) {
    neumaierAdd(x, -snapshot.forceX[cell]);
    neumaierAdd(y, -snapshot.forceY[cell]);
  }
  return Object.freeze({ x: neumaierValue(x), y: neumaierValue(y) });
}

function a2Correction(pre, post) {
  const x = { sum: 0, correction: 0 };
  const y = { sum: 0, correction: 0 };
  for (let cell = 0; cell < post.rho.length; cell += 1) {
    const mask = post.mask[cell];
    neumaierAdd(
      x,
      mask * (post.rho[cell] * post.ux[cell] - pre.rho[cell] * pre.ux[cell]),
    );
    neumaierAdd(
      y,
      mask * (post.rho[cell] * post.uy[cell] - pre.rho[cell] * pre.uy[cell]),
    );
  }
  return Object.freeze({ x: neumaierValue(x), y: neumaierValue(y) });
}

function maximum(values) {
  return values.length === 0 ? 0 : Math.max(...values);
}

export function evaluateH2nStage0Numerics(input) {
  const checkpointSummaries = [];
  const equilibriumAndMomentErrors = [];
  const collisionAndBoundaryErrors = [];
  const populationL2Errors = [];
  const checkpointFieldL2Errors = [];
  const massMomentumErrors = [];
  const rawA2ForceErrors = [];
  const nonFiniteCounts = [];
  const negativeCountDifferences = [];
  for (const step of input.checkpointSteps) {
    const candidate = input.candidateSnapshots.get(step);
    const reference = input.referenceSnapshots.get(step);
    if (!candidate || !reference) {
      throw new Error(`NO-GO-H2N-STAGE0-NUMERIC-OR-PERFORMANCE: checkpoint ${step}`);
    }
    const population = arrayMetrics(
      candidate.distributions,
      reference.distributions,
      true,
    );
    const fields = Object.fromEntries(FIELD_NAMES.map((name) => [
      name,
      arrayMetrics(candidate[name], reference[name]),
    ]));
    const candidateTotals = populationTotals(candidate.distributions);
    const referenceTotals = populationTotals(reference.distributions);
    const massMomentumMaximum = maximum([
      normalizedDifference(candidateTotals.mass, referenceTotals.mass),
      normalizedDifference(candidateTotals.momentumX, referenceTotals.momentumX),
      normalizedDifference(candidateTotals.momentumY, referenceTotals.momentumY),
    ]);
    const fieldMaximumL2 = maximum(
      FIELD_NAMES.map((name) => fields[name].normalizedL2),
    );
    const fieldMaximumNormalized = maximum(
      FIELD_NAMES.map((name) => fields[name].maximumNormalizedDifference),
    );
    const nonFiniteCount = population.candidateNonFiniteCount
      + population.referenceNonFiniteCount
      + FIELD_NAMES.reduce(
        (sum, name) => sum + fields[name].candidateNonFiniteCount
          + fields[name].referenceNonFiniteCount,
        0,
      );
    let forceExchangeMaximum = 0;
    if (step > 0) {
      const candidatePre = input.candidateSnapshots.get(step - 1);
      const referencePre = input.referenceSnapshots.get(step - 1);
      const formalExchange = input.referenceExchanges.get(step);
      if (!candidatePre || !referencePre || !formalExchange) {
        throw new Error(
          `NO-GO-H2N-STAGE0-NUMERIC-OR-PERFORMANCE: force predecessor ${step}`,
        );
      }
      const candidateRaw = rawReaction(candidatePre);
      const referenceRaw = {
        x: formalExchange.rawReactionImpulseX,
        y: formalExchange.rawReactionImpulseY,
      };
      const candidateCorrection = a2Correction(candidatePre, candidate);
      const referenceCorrection = a2Correction(referencePre, reference);
      forceExchangeMaximum = maximum([
        normalizedDifference(candidateRaw.x, referenceRaw.x),
        normalizedDifference(candidateRaw.y, referenceRaw.y),
        normalizedDifference(
          candidateRaw.x + candidateCorrection.x,
          referenceRaw.x + referenceCorrection.x,
        ),
        normalizedDifference(
          candidateRaw.y + candidateCorrection.y,
          referenceRaw.y + referenceCorrection.y,
        ),
      ]);
      rawA2ForceErrors.push(forceExchangeMaximum);
    }
    const operatorMaximum = Math.max(
      population.maximumNormalizedDifference,
      fieldMaximumNormalized,
    );
    if (step === 0) equilibriumAndMomentErrors.push(operatorMaximum);
    else collisionAndBoundaryErrors.push(operatorMaximum);
    populationL2Errors.push(population.normalizedL2);
    checkpointFieldL2Errors.push(fieldMaximumL2);
    massMomentumErrors.push(massMomentumMaximum);
    nonFiniteCounts.push(nonFiniteCount);
    negativeCountDifferences.push(population.negativePopulationCountDifference);
    checkpointSummaries.push(Object.freeze({
      step,
      populationMaximumNormalizedDifference: population.maximumNormalizedDifference,
      populationNormalizedL2: population.normalizedL2,
      checkpointFieldMaximumNormalizedDifference: fieldMaximumNormalized,
      checkpointFieldNormalizedL2: fieldMaximumL2,
      massAndMomentumNormalizedMaximum: massMomentumMaximum,
      rawAndA2ForceNormalizedMaximum: forceExchangeMaximum,
      nonFiniteCount,
      negativePopulationCountDifference:
        population.negativePopulationCountDifference,
      pass: true,
    }));
  }
  const maxima = Object.freeze({
    equilibriumAndMomentMaximum: maximum(equilibriumAndMomentErrors),
    collisionForcingStreamingBoundaryMaximum: maximum(collisionAndBoundaryErrors),
    populationNormalizedL2Maximum: maximum(populationL2Errors),
    massAndMomentumNormalizedMaximum: maximum(massMomentumErrors),
    rawAndA2ForceNormalizedMaximum: maximum(rawA2ForceErrors),
    checkpointFieldNormalizedL2Maximum: maximum(checkpointFieldL2Errors),
    nonFiniteCountMaximum: maximum(nonFiniteCounts),
    negativePopulationCountDifferenceMaximum: maximum(negativeCountDifferences),
  });
  const tolerance = input.toleranceModel;
  const gates = Object.freeze({
    equilibriumAndMoment: maxima.equilibriumAndMomentMaximum
      <= tolerance.equilibriumAndMomentMaximum,
    collisionForcingStreamingBoundary:
      maxima.collisionForcingStreamingBoundaryMaximum
        <= tolerance.collisionForcingStreamingBoundaryMaximum,
    populationL2: maxima.populationNormalizedL2Maximum
      <= tolerance.populationNormalizedL2Maximum,
    massAndMomentum: maxima.massAndMomentumNormalizedMaximum
      <= tolerance.massAndMomentumNormalizedMaximum,
    rawAndA2Force: maxima.rawAndA2ForceNormalizedMaximum
      <= tolerance.rawAndA2ForceNormalizedMaximum,
    checkpointFields: maxima.checkpointFieldNormalizedL2Maximum
      <= tolerance.checkpointFieldNormalizedL2Maximum,
    finite: maxima.nonFiniteCountMaximum <= tolerance.nonFiniteCountMaximum,
    negativePopulationCount: maxima.negativePopulationCountDifferenceMaximum
      <= tolerance.negativePopulationCountDifferenceMaximum,
  });
  const pass = Object.values(gates).every(Boolean);
  return Object.freeze({
    pass,
    classification: pass
      ? "PASS-H2N-STAGE0-NUMERICAL-CORRECTNESS"
      : "NO-GO-H2N-STAGE0-NUMERIC-OR-PERFORMANCE",
    maxima,
    gates,
    checkpoints: Object.freeze(checkpointSummaries.map((summary) =>
      Object.freeze({ ...summary, pass }))),
    scientificValuesPersisted: false,
    scientificValuesHumanRead: false,
  });
}
