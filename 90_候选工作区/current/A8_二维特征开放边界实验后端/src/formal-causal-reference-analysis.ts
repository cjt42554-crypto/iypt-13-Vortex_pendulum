import {
  FORMAL_CAUSAL_REFERENCE_CONTRACT as CONTRACT,
  buildFormalCausalReferenceDefinitions,
  type FormalCausalReferenceDefinition,
  type FormalCausalReferenceStrategy,
} from "./formal-causal-reference-contract.ts";
import {
  runCausalReferenceCase,
  type A8nAnchorMassRecord,
  type CausalRegionSample,
  type CausalRunExecution,
  type CausalRunResult,
} from "./formal-causal-reference-runs.ts";

export interface CausalTimeResolvedError {
  step: number;
  densityRmsError: number;
  velocityRmsError: number;
  velocityRmsErrorOverInletVelocity: number;
  correctedLoadCoefficientRmsError: number;
}

export interface CausalAggregateError {
  sampleCount: number;
  cellSampleCount: number;
  densityRmsError: number;
  velocityRmsError: number;
  velocityRmsErrorOverInletVelocity: number;
  correctedLoadCoefficientRmsError: number;
}

export interface CausalRunComparison {
  runId: string;
  timeResolvedErrors: CausalTimeResolvedError[];
  frozenWindow: CausalAggregateError;
  preReturnDiagnostic: CausalTimeResolvedError | null;
  postReturnDiagnostic: CausalTimeResolvedError | null;
}

export interface CausalReferenceAgreement {
  sampleCount: number;
  cellSampleCount: number;
  densityRmsDifference: number;
  velocityRmsDifference: number;
  velocityRmsDifferenceOverInletVelocity: number;
  correctedLoadCoefficientRmsDifference: number;
  gate: {
    densityPass: boolean;
    velocityPass: boolean;
    loadPass: boolean;
    pass: boolean;
  };
}

export interface CausalStrategyPairComparison {
  upstreamDiameters: number;
  legacyRunId: string;
  candidateRunId: string;
  legacyErrors: CausalAggregateError;
  candidateErrors: CausalAggregateError;
  ratios: {
    density: number | null;
    velocity: number | null;
    correctedLoad: number | null;
  };
  legacySignalsDetected: {
    density: boolean;
    velocity: boolean;
    correctedLoad: boolean;
  };
  gate: {
    densityPass: boolean;
    velocityPass: boolean;
    correctedLoadPass: boolean;
    pass: boolean;
  };
}

export interface CausalDistanceConvergence {
  s9RunIds: string[];
  lastToFirstRatios: {
    density: number;
    velocity: number;
    correctedLoad: number;
  };
  maximumIntermediateIncreaseFactors: {
    density: number;
    velocity: number;
    correctedLoad: number;
  };
  gate: {
    densityPass: boolean;
    velocityPass: boolean;
    correctedLoadPass: boolean;
    intermediatePass: boolean;
    pass: boolean;
  };
}

export interface AlignedFluxComparison {
  upstreamDiameters: number;
  candidateRunId: string;
  responsePerBoundaryRow: number;
  referenceResponsePerBoundaryRow: number;
  relativeDifference: number;
  detected: boolean;
  pass: boolean;
}

export interface CausalCornerAnalysis {
  nominalDiameterCells: number;
  relaxationTime: number;
  commonReferenceConstruction:
    "cellwise-arithmetic-mean-of-aligned-S1-and-S9-14D-traces";
  frozenWindowStartStep: number;
  frozenWindowEndStep: number;
  referenceAgreement: CausalReferenceAgreement;
  runComparisons: CausalRunComparison[];
  shortDistancePairs: CausalStrategyPairComparison[];
  distanceConvergence: CausalDistanceConvergence;
  alignedFluxComparisons: AlignedFluxComparison[];
  gate: {
    referenceValid: boolean;
    candidateSuperiorityPass: boolean;
    distanceConvergencePass: boolean;
    alignedFluxPass: boolean;
    pass: boolean;
  };
}

export interface CausalMatrixProgress {
  phase: "causal";
  completed: number;
  total: number;
  caseId: string;
  internalPass: boolean;
}

export interface CausalMatrixResult {
  runs: CausalRunResult[];
  cornerAnalyses: CausalCornerAnalysis[];
  gate: {
    runCountPass: boolean;
    cornerAnalysisCountPass: boolean;
    allRunsCompleted: boolean;
    allInternalRunGatesPass: boolean;
    allReferencesValid: boolean;
    allCandidateSuperiorityPass: boolean;
    allDistanceConvergencePass: boolean;
    allAlignedFluxPass: boolean;
    pass: boolean;
  };
}

interface ReferenceSample {
  step: number;
  rho: Float64Array;
  ux: Float64Array;
  uy: Float64Array;
  drag: number;
  lift: number;
}

function numberTag(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

function strategyTag(strategy: FormalCausalReferenceStrategy): string {
  return strategy === "legacy-zou-he-derived-density" ? "s01" : "s09";
}

export function causalAnchorKey(
  nominalDiameterCells: number,
  relaxationTime: number,
  strategy: FormalCausalReferenceStrategy,
): string {
  return [
    "d" + numberTag(nominalDiameterCells, 1, 2),
    "t" + numberTag(relaxationTime, 1000, 4),
    strategyTag(strategy),
  ].join("-");
}

function sampleMap(
  samples: readonly CausalRegionSample[],
): Map<number, CausalRegionSample> {
  return new Map(samples.map((sample) => [sample.step, sample]));
}

function buildReferenceSamples(
  legacy: CausalRunExecution,
  candidate: CausalRunExecution,
): ReferenceSample[] {
  const candidateSamples = sampleMap(candidate.regionSamples);
  const result: ReferenceSample[] = [];
  for (const first of legacy.regionSamples) {
    const second = candidateSamples.get(first.step);
    if (second === undefined
      || first.rho.length !== second.rho.length
      || first.ux.length !== second.ux.length
      || first.uy.length !== second.uy.length) {
      throw new RangeError("A8O longest-domain reference sample mismatch");
    }
    const rho = new Float64Array(first.rho.length);
    const ux = new Float64Array(first.ux.length);
    const uy = new Float64Array(first.uy.length);
    for (let cell = 0; cell < rho.length; cell += 1) {
      rho[cell] = 0.5 * (
        (first.rho[cell] ?? Number.NaN)
        + (second.rho[cell] ?? Number.NaN)
      );
      ux[cell] = 0.5 * (
        (first.ux[cell] ?? Number.NaN)
        + (second.ux[cell] ?? Number.NaN)
      );
      uy[cell] = 0.5 * (
        (first.uy[cell] ?? Number.NaN)
        + (second.uy[cell] ?? Number.NaN)
      );
    }
    const legacyLoad = legacy.result.loadTrace[first.step - 1];
    const candidateLoad = candidate.result.loadTrace[first.step - 1];
    if (legacyLoad === undefined || candidateLoad === undefined) {
      throw new RangeError("A8O longest-domain reference load mismatch");
    }
    result.push({
      step: first.step,
      rho,
      ux,
      uy,
      drag: 0.5 * (legacyLoad.drag + candidateLoad.drag),
      lift: 0.5 * (legacyLoad.lift + candidateLoad.lift),
    });
  }
  return result;
}

function sampleError(
  sample: CausalRegionSample,
  load: { drag: number; lift: number },
  reference: ReferenceSample,
): CausalTimeResolvedError {
  if (sample.rho.length !== reference.rho.length) {
    throw new RangeError("A8O aligned causal sample length mismatch");
  }
  let densitySquares = 0;
  let velocitySquares = 0;
  for (let cell = 0; cell < sample.rho.length; cell += 1) {
    const density = (sample.rho[cell] ?? Number.NaN)
      - (reference.rho[cell] ?? Number.NaN);
    const ux = (sample.ux[cell] ?? Number.NaN)
      - (reference.ux[cell] ?? Number.NaN);
    const uy = (sample.uy[cell] ?? Number.NaN)
      - (reference.uy[cell] ?? Number.NaN);
    densitySquares += density * density;
    velocitySquares += ux * ux + uy * uy;
  }
  const densityRmsError = Math.sqrt(densitySquares / sample.rho.length);
  const velocityRmsError = Math.sqrt(velocitySquares / sample.rho.length);
  const drag = load.drag - reference.drag;
  const lift = load.lift - reference.lift;
  return {
    step: sample.step,
    densityRmsError,
    velocityRmsError,
    velocityRmsErrorOverInletVelocity:
      velocityRmsError / CONTRACT.commonNumerics.inletVelocityLattice,
    correctedLoadCoefficientRmsError: Math.sqrt(
      (drag * drag + lift * lift) / 2,
    ),
  };
}

function aggregateErrors(
  errors: readonly CausalTimeResolvedError[],
  cellCount: number,
): CausalAggregateError {
  let densitySquares = 0;
  let velocitySquares = 0;
  let loadSquares = 0;
  for (const error of errors) {
    densitySquares += error.densityRmsError ** 2 * cellCount;
    velocitySquares += error.velocityRmsError ** 2 * cellCount;
    loadSquares += error.correctedLoadCoefficientRmsError ** 2;
  }
  const cellSampleCount = errors.length * cellCount;
  const densityRmsError = cellSampleCount === 0
    ? 0
    : Math.sqrt(densitySquares / cellSampleCount);
  const velocityRmsError = cellSampleCount === 0
    ? 0
    : Math.sqrt(velocitySquares / cellSampleCount);
  return {
    sampleCount: errors.length,
    cellSampleCount,
    densityRmsError,
    velocityRmsError,
    velocityRmsErrorOverInletVelocity:
      velocityRmsError / CONTRACT.commonNumerics.inletVelocityLattice,
    correctedLoadCoefficientRmsError: errors.length === 0
      ? 0
      : Math.sqrt(loadSquares / errors.length),
  };
}

function closestError(
  errors: readonly CausalTimeResolvedError[],
  targetStep: number,
): CausalTimeResolvedError | null {
  let best: CausalTimeResolvedError | null = null;
  for (const error of errors) {
    if (best === null
      || Math.abs(error.step - targetStep) < Math.abs(best.step - targetStep)) {
      best = error;
    }
  }
  return best;
}

function compareRunToReference(
  execution: CausalRunExecution,
  references: readonly ReferenceSample[],
  windowStart: number,
  windowEnd: number,
): CausalRunComparison {
  const referenceMap = new Map(references.map((entry) => [entry.step, entry]));
  const errors: CausalTimeResolvedError[] = [];
  for (const sample of execution.regionSamples) {
    const reference = referenceMap.get(sample.step);
    const load = execution.result.loadTrace[sample.step - 1];
    if (reference === undefined || load === undefined) {
      throw new RangeError("A8O missing aligned reference sample");
    }
    errors.push(sampleError(sample, load, reference));
  }
  const inWindow = errors.filter((entry) =>
    entry.step >= windowStart && entry.step <= windowEnd);
  const firstSample = execution.regionSamples[0];
  if (firstSample === undefined) {
    throw new RangeError("A8O causal run has no field samples");
  }
  const definition = execution.result.definition;
  const length = definition.upstreamDiameters
    * definition.nominalDiameterCells;
  const cs = CONTRACT.commonNumerics.latticeSoundSpeed;
  const u0 = CONTRACT.commonNumerics.inletVelocityLattice;
  const localReturn = length / (cs - u0) + length / (cs + u0);
  const isShort = definition.upstreamDiameters
    < CONTRACT.causalReference.longestReferenceUpstreamDiameters;
  return {
    runId: definition.id,
    timeResolvedErrors: errors,
    frozenWindow: aggregateErrors(inWindow, firstSample.rho.length),
    preReturnDiagnostic: isShort
      ? closestError(
        errors,
        CONTRACT.causalReference.shorterBoundaryPreReturnFraction
          * localReturn,
      )
      : null,
    postReturnDiagnostic: isShort
      ? closestError(
        errors,
        CONTRACT.causalReference.shorterBoundaryPostReturnFraction
          * localReturn,
      )
      : null,
  };
}

function directReferenceAgreement(
  legacy: CausalRunExecution,
  candidate: CausalRunExecution,
  windowStart: number,
  windowEnd: number,
): CausalReferenceAgreement {
  const candidateMap = sampleMap(candidate.regionSamples);
  let sampleCount = 0;
  let cellSampleCount = 0;
  let densitySquares = 0;
  let velocitySquares = 0;
  let loadSquares = 0;
  for (const first of legacy.regionSamples) {
    if (first.step < windowStart || first.step > windowEnd) continue;
    const second = candidateMap.get(first.step);
    const firstLoad = legacy.result.loadTrace[first.step - 1];
    const secondLoad = candidate.result.loadTrace[first.step - 1];
    if (second === undefined || firstLoad === undefined || secondLoad === undefined
      || first.rho.length !== second.rho.length) {
      throw new RangeError("A8O reference agreement sample mismatch");
    }
    for (let cell = 0; cell < first.rho.length; cell += 1) {
      const density = (second.rho[cell] ?? Number.NaN)
        - (first.rho[cell] ?? Number.NaN);
      const ux = (second.ux[cell] ?? Number.NaN)
        - (first.ux[cell] ?? Number.NaN);
      const uy = (second.uy[cell] ?? Number.NaN)
        - (first.uy[cell] ?? Number.NaN);
      densitySquares += density * density;
      velocitySquares += ux * ux + uy * uy;
      cellSampleCount += 1;
    }
    const drag = secondLoad.drag - firstLoad.drag;
    const lift = secondLoad.lift - firstLoad.lift;
    loadSquares += (drag * drag + lift * lift) / 2;
    sampleCount += 1;
  }
  if (sampleCount === 0 || cellSampleCount === 0) {
    throw new RangeError("A8O reference agreement window is empty");
  }
  const densityRmsDifference = Math.sqrt(densitySquares / cellSampleCount);
  const velocityRmsDifference = Math.sqrt(velocitySquares / cellSampleCount);
  const velocityRmsDifferenceOverInletVelocity = velocityRmsDifference
    / CONTRACT.commonNumerics.inletVelocityLattice;
  const correctedLoadCoefficientRmsDifference = Math.sqrt(
    loadSquares / sampleCount,
  );
  const gates = CONTRACT.causalReference.referenceStrategyAgreementGates;
  const densityPass = densityRmsDifference
    <= gates.maximumDensityRmsDifference;
  const velocityPass = velocityRmsDifferenceOverInletVelocity
    <= gates.maximumVelocityRmsDifferenceOverInletVelocity;
  const loadPass = correctedLoadCoefficientRmsDifference
    <= gates.maximumCorrectedLoadCoefficientRmsDifference;
  return {
    sampleCount,
    cellSampleCount,
    densityRmsDifference,
    velocityRmsDifference,
    velocityRmsDifferenceOverInletVelocity,
    correctedLoadCoefficientRmsDifference,
    gate: {
      densityPass,
      velocityPass,
      loadPass,
      pass: densityPass && velocityPass && loadPass,
    },
  };
}

function strategyPair(
  upstreamDiameters: number,
  legacy: CausalRunComparison,
  candidate: CausalRunComparison,
): CausalStrategyPairComparison {
  const floors = CONTRACT.causalReference.legacyErrorDetectionFloors;
  const legacyErrors = legacy.frozenWindow;
  const candidateErrors = candidate.frozenWindow;
  const densityDetected = legacyErrors.densityRmsError >= floors.densityRms;
  const velocityDetected = legacyErrors.velocityRmsErrorOverInletVelocity
    >= floors.velocityRmsOverInletVelocity;
  const loadDetected = legacyErrors.correctedLoadCoefficientRmsError
    >= floors.correctedLoadCoefficientRms;
  const density = densityDetected
    ? candidateErrors.densityRmsError / legacyErrors.densityRmsError
    : null;
  const velocity = velocityDetected
    ? candidateErrors.velocityRmsErrorOverInletVelocity
      / legacyErrors.velocityRmsErrorOverInletVelocity
    : null;
  const correctedLoad = loadDetected
    ? candidateErrors.correctedLoadCoefficientRmsError
      / legacyErrors.correctedLoadCoefficientRmsError
    : null;
  const gates = CONTRACT.causalReference.candidateSuperiorityGates;
  const densityPass = density !== null
    && density <= gates.maximumS9ToLegacyDensityErrorRatio;
  const velocityPass = velocity !== null
    && velocity <= gates.maximumS9ToLegacyVelocityErrorRatio;
  const correctedLoadPass = correctedLoad !== null
    && correctedLoad <= gates.maximumS9ToLegacyLoadErrorRatio;
  return {
    upstreamDiameters,
    legacyRunId: legacy.runId,
    candidateRunId: candidate.runId,
    legacyErrors,
    candidateErrors,
    ratios: { density, velocity, correctedLoad },
    legacySignalsDetected: {
      density: densityDetected,
      velocity: velocityDetected,
      correctedLoad: loadDetected,
    },
    gate: {
      densityPass,
      velocityPass,
      correctedLoadPass,
      pass: densityPass && velocityPass && correctedLoadPass,
    },
  };
}

function safeRatio(value: number, denominator: number, floor: number): number {
  return value / Math.max(Math.abs(denominator), floor);
}

function distanceConvergence(
  pairs: readonly CausalStrategyPairComparison[],
): CausalDistanceConvergence {
  if (pairs.length !== 3) {
    throw new RangeError("A8O distance convergence requires three short domains");
  }
  const first = pairs[0]?.candidateErrors;
  const middle = pairs[1]?.candidateErrors;
  const last = pairs[2]?.candidateErrors;
  if (first === undefined || middle === undefined || last === undefined) {
    throw new RangeError("A8O missing distance convergence errors");
  }
  const floors = CONTRACT.causalReference.legacyErrorDetectionFloors;
  const lastToFirstRatios = {
    density: safeRatio(
      last.densityRmsError,
      first.densityRmsError,
      floors.densityRms,
    ),
    velocity: safeRatio(
      last.velocityRmsErrorOverInletVelocity,
      first.velocityRmsErrorOverInletVelocity,
      floors.velocityRmsOverInletVelocity,
    ),
    correctedLoad: safeRatio(
      last.correctedLoadCoefficientRmsError,
      first.correctedLoadCoefficientRmsError,
      floors.correctedLoadCoefficientRms,
    ),
  };
  const maximumIntermediateIncreaseFactors = {
    density: Math.max(
      safeRatio(
        middle.densityRmsError,
        first.densityRmsError,
        floors.densityRms,
      ),
      safeRatio(
        last.densityRmsError,
        middle.densityRmsError,
        floors.densityRms,
      ),
    ),
    velocity: Math.max(
      safeRatio(
        middle.velocityRmsErrorOverInletVelocity,
        first.velocityRmsErrorOverInletVelocity,
        floors.velocityRmsOverInletVelocity,
      ),
      safeRatio(
        last.velocityRmsErrorOverInletVelocity,
        middle.velocityRmsErrorOverInletVelocity,
        floors.velocityRmsOverInletVelocity,
      ),
    ),
    correctedLoad: Math.max(
      safeRatio(
        middle.correctedLoadCoefficientRmsError,
        first.correctedLoadCoefficientRmsError,
        floors.correctedLoadCoefficientRms,
      ),
      safeRatio(
        last.correctedLoadCoefficientRmsError,
        middle.correctedLoadCoefficientRmsError,
        floors.correctedLoadCoefficientRms,
      ),
    ),
  };
  const gates = CONTRACT.causalReference.distanceConvergenceGates;
  const densityPass = lastToFirstRatios.density
    <= gates.maximumLastToFirstS9DensityErrorRatio;
  const velocityPass = lastToFirstRatios.velocity
    <= gates.maximumLastToFirstS9VelocityErrorRatio;
  const correctedLoadPass = lastToFirstRatios.correctedLoad
    <= gates.maximumLastToFirstS9LoadErrorRatio;
  const intermediatePass = Object.values(
    maximumIntermediateIncreaseFactors,
  ).every((value) => value <= gates.maximumIntermediateIncreaseFactor);
  return {
    s9RunIds: pairs.map((pair) => pair.candidateRunId),
    lastToFirstRatios,
    maximumIntermediateIncreaseFactors,
    gate: {
      densityPass,
      velocityPass,
      correctedLoadPass,
      intermediatePass,
      pass: densityPass
        && velocityPass
        && correctedLoadPass
        && intermediatePass,
    },
  };
}

function fluxComparisons(
  executions: readonly CausalRunExecution[],
): AlignedFluxComparison[] {
  const candidate = executions.filter((entry) =>
    entry.result.definition.strategy
      === "incoming-characteristic-compatible-zou-he");
  const reference = candidate.find((entry) =>
    entry.result.definition.upstreamDiameters
      === CONTRACT.causalReference.longestReferenceUpstreamDiameters);
  if (reference === undefined) {
    throw new RangeError("A8O missing longest S9 flux reference");
  }
  const referenceResponse = reference.result.alignedBoundaryFlux
    .signedAdapterMassPerBoundaryRow;
  const floor = CONTRACT.causalReference.alignedBoundaryFlux
    .absoluteComparisonFloorPerBoundaryRow;
  return candidate
    .filter((entry) =>
      entry.result.definition.upstreamDiameters
        < CONTRACT.causalReference.longestReferenceUpstreamDiameters)
    .sort((a, b) =>
      a.result.definition.upstreamDiameters
      - b.result.definition.upstreamDiameters)
    .map((entry) => {
      const response = entry.result.alignedBoundaryFlux
        .signedAdapterMassPerBoundaryRow;
      const detected = Math.abs(referenceResponse) >= floor;
      const relativeDifference = Math.abs(response - referenceResponse)
        / Math.max(Math.abs(response), Math.abs(referenceResponse), floor);
      return {
        upstreamDiameters: entry.result.definition.upstreamDiameters,
        candidateRunId: entry.result.definition.id,
        responsePerBoundaryRow: response,
        referenceResponsePerBoundaryRow: referenceResponse,
        relativeDifference,
        detected,
        pass: detected
          && relativeDifference
            <= CONTRACT.causalReference.alignedBoundaryFlux
              .maximumRelativeCumulativeAdapterMassDifference,
      };
    });
}

function findExecution(
  executions: readonly CausalRunExecution[],
  upstreamDiameters: number,
  strategy: FormalCausalReferenceStrategy,
): CausalRunExecution {
  const result = executions.find((entry) =>
    entry.result.definition.upstreamDiameters === upstreamDiameters
    && entry.result.definition.strategy === strategy);
  if (result === undefined) {
    throw new RangeError("A8O missing causal execution");
  }
  return result;
}

export function analyzeCausalCorner(
  executions: readonly CausalRunExecution[],
): CausalCornerAnalysis {
  const first = executions[0]?.result.definition;
  if (first === undefined || executions.length !== 8) {
    throw new RangeError("A8O causal corner requires eight executions");
  }
  const longest = CONTRACT.causalReference.longestReferenceUpstreamDiameters;
  const legacyReference = findExecution(
    executions,
    longest,
    "legacy-zou-he-derived-density",
  );
  const candidateReference = findExecution(
    executions,
    longest,
    "incoming-characteristic-compatible-zou-he",
  );
  const referenceSamples = buildReferenceSamples(
    legacyReference,
    candidateReference,
  );
  const length = longest * first.nominalDiameterCells;
  const cs = CONTRACT.commonNumerics.latticeSoundSpeed;
  const u0 = CONTRACT.commonNumerics.inletVelocityLattice;
  const returnTime = length / (cs - u0) + length / (cs + u0);
  const fractions = CONTRACT.causalReference
    .comparisonWindowFractionsOfLongestReturn;
  const windowStart = Math.ceil((fractions[0] ?? Number.NaN) * returnTime);
  const windowEnd = Math.floor((fractions[1] ?? Number.NaN) * returnTime);
  const runComparisons = executions.map((entry) =>
    compareRunToReference(entry, referenceSamples, windowStart, windowEnd));
  const shortDistances = CONTRACT.commonNumerics.upstreamDiameters
    .filter((distance) => distance < longest);
  const shortDistancePairs = shortDistances.map((distance) => {
    const legacyId = findExecution(
      executions,
      distance,
      "legacy-zou-he-derived-density",
    ).result.definition.id;
    const candidateId = findExecution(
      executions,
      distance,
      "incoming-characteristic-compatible-zou-he",
    ).result.definition.id;
    const legacy = runComparisons.find((entry) => entry.runId === legacyId);
    const candidate = runComparisons.find((entry) => entry.runId === candidateId);
    if (legacy === undefined || candidate === undefined) {
      throw new RangeError("A8O missing causal strategy comparison");
    }
    return strategyPair(distance, legacy, candidate);
  });
  const referenceAgreement = directReferenceAgreement(
    legacyReference,
    candidateReference,
    windowStart,
    windowEnd,
  );
  const convergence = distanceConvergence(shortDistancePairs);
  const flux = fluxComparisons(executions);
  const candidateSuperiorityPass = shortDistancePairs.length === 3
    && shortDistancePairs.every((entry) => entry.gate.pass);
  const alignedFluxPass = flux.length === 3
    && flux.every((entry) => entry.pass);
  const pass = referenceAgreement.gate.pass
    && candidateSuperiorityPass
    && convergence.gate.pass
    && alignedFluxPass;
  return {
    nominalDiameterCells: first.nominalDiameterCells,
    relaxationTime: first.relaxationTime,
    commonReferenceConstruction:
      "cellwise-arithmetic-mean-of-aligned-S1-and-S9-14D-traces",
    frozenWindowStartStep: windowStart,
    frozenWindowEndStep: windowEnd,
    referenceAgreement,
    runComparisons,
    shortDistancePairs,
    distanceConvergence: convergence,
    alignedFluxComparisons: flux,
    gate: {
      referenceValid: referenceAgreement.gate.pass,
      candidateSuperiorityPass,
      distanceConvergencePass: convergence.gate.pass,
      alignedFluxPass,
      pass,
    },
  };
}

function orderedCornerDefinitions(
  definitions: readonly FormalCausalReferenceDefinition[],
  nominalDiameterCells: number,
  relaxationTime: number,
): FormalCausalReferenceDefinition[] {
  const corner = definitions.filter((entry) =>
    entry.nominalDiameterCells === nominalDiameterCells
    && entry.relaxationTime === relaxationTime);
  const longest = CONTRACT.causalReference.longestReferenceUpstreamDiameters;
  const distances = [
    longest,
    ...CONTRACT.commonNumerics.upstreamDiameters.filter((entry) =>
      entry < longest),
  ];
  const ordered: FormalCausalReferenceDefinition[] = [];
  for (const distance of distances) {
    for (const strategy of [
      "legacy-zou-he-derived-density",
      "incoming-characteristic-compatible-zou-he",
    ] as const) {
      const definition = corner.find((entry) =>
        entry.upstreamDiameters === distance && entry.strategy === strategy);
      if (definition === undefined) {
        throw new RangeError("A8O incomplete causal corner definition");
      }
      ordered.push(definition);
    }
  }
  return ordered;
}

export function runCausalReferenceMatrix(
  anchors: ReadonlyMap<string, readonly A8nAnchorMassRecord[]>,
  onProgress?: (progress: CausalMatrixProgress) => void,
): CausalMatrixResult {
  const definitions = buildFormalCausalReferenceDefinitions("causal");
  const runs: CausalRunResult[] = [];
  const cornerAnalyses: CausalCornerAnalysis[] = [];
  let completed = 0;
  for (const geometry of CONTRACT.commonNumerics.geometries) {
    for (const relaxationTime of CONTRACT.commonNumerics.relaxationTime) {
      const executions: CausalRunExecution[] = [];
      for (const definition of orderedCornerDefinitions(
        definitions,
        geometry.nominalDiameterCells,
        relaxationTime,
      )) {
        const anchor = definition.upstreamDiameters === 3.5
          ? anchors.get(causalAnchorKey(
            definition.nominalDiameterCells,
            definition.relaxationTime,
            definition.strategy,
          ))
          : undefined;
        const execution = runCausalReferenceCase(definition, anchor);
        executions.push(execution);
        runs.push(execution.result);
        completed += 1;
        onProgress?.({
          phase: "causal",
          completed,
          total: definitions.length,
          caseId: definition.id,
          internalPass: execution.result.gate.pass,
        });
      }
      if (executions.every((entry) =>
        entry.result.gate.executionPass && entry.regionSamples.length > 0)) {
        cornerAnalyses.push(analyzeCausalCorner(executions));
      }
    }
  }
  const runCountPass = runs.length === CONTRACT.causalReference.matrix.runCount;
  const cornerAnalysisCountPass = cornerAnalyses.length === 9;
  const allRunsCompleted = runs.every((entry) =>
    entry.gate.executionPass);
  const allInternalRunGatesPass = runs.every((entry) => entry.gate.pass);
  const allReferencesValid = cornerAnalysisCountPass
    && cornerAnalyses.every((entry) => entry.gate.referenceValid);
  const allCandidateSuperiorityPass = cornerAnalysisCountPass
    && cornerAnalyses.every((entry) =>
      entry.gate.candidateSuperiorityPass);
  const allDistanceConvergencePass = cornerAnalysisCountPass
    && cornerAnalyses.every((entry) =>
      entry.gate.distanceConvergencePass);
  const allAlignedFluxPass = cornerAnalysisCountPass
    && cornerAnalyses.every((entry) => entry.gate.alignedFluxPass);
  return {
    runs,
    cornerAnalyses,
    gate: {
      runCountPass,
      cornerAnalysisCountPass,
      allRunsCompleted,
      allInternalRunGatesPass,
      allReferencesValid,
      allCandidateSuperiorityPass,
      allDistanceConvergencePass,
      allAlignedFluxPass,
      pass: runCountPass
        && cornerAnalysisCountPass
        && allRunsCompleted
        && allInternalRunGatesPass
        && allReferencesValid
        && allCandidateSuperiorityPass
        && allDistanceConvergencePass
        && allAlignedFluxPass,
    },
  };
}
