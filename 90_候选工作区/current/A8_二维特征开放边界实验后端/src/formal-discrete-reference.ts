import {
  FORMAL_DISCRETE_REFERENCE_CONTRACT as CONTRACT,
  FORMAL_DISCRETE_REFERENCE_CORNERS,
  FORMAL_DISCRETE_REFERENCE_FAMILIES,
  FORMAL_DISCRETE_REFERENCE_STRATEGIES,
  FORMAL_DISCRETE_REFERENCE_WIDTHS,
  FORMAL_MATURITY_GEOMETRIES,
  FORMAL_MATURITY_PARAMETERS,
  buildFormalDiscreteReferenceDefinitions,
  buildFormalMaturityDefinitions,
  type FormalDiscreteReferenceStrategy,
} from "./formal-discrete-reference-contract.ts";
import {
  runDiscreteReferenceCase,
  runMaturityCase,
  type DiscreteReferenceRunExecution,
  type DiscreteReferenceRunResult,
  type MaturityRunResult,
  type MaturityWindowResult,
} from "./formal-discrete-reference-runs.ts";
import {
  compareDirectMeanVelocityFields,
  compareMirroredWindowFields,
  exactRegionSampleDifference,
  relativeDifference,
  type RegionFieldSample,
} from "./formal-discrete-reference-support.ts";

export interface DiscreteReferenceProvenance {
  formalSourceSha256: string;
  proDecisionSha256: string;
  frozenS9BoundarySha256: string;
  frozenA8oContractSha256: string;
  frozenA8oRunsSha256: string;
  frozenA8oSupportSha256: string;
  contractSha256: string;
  contractDocumentSha256: string;
  contractCommit: string;
  contractTestCommit: string;
  implementationCommit: string;
  implementationTreeSha256: string;
}

export interface A8pProgress {
  phase: "discrete-reference" | "maturity";
  completed: number;
  total: number;
  caseId: string;
  trajectoryCompleteAndFinite: boolean;
  internalLedgerGatePass: boolean;
  internalPass: boolean;
}

export interface ExactTraceComparison {
  id: string;
  kind: "strategy" | "width";
  firstCaseId: string;
  secondCaseId: string;
  comparedSamples: number;
  comparedCellsPerSample: number;
  exact: boolean;
  maximumAbsoluteDensityDifference: number;
  maximumAbsoluteVelocityComponentDifference: number;
  maximumAbsoluteRawBodyReactionDifference: number;
  firstMismatchStep: number | null;
  gate: {
    sampleCountPass: boolean;
    coordinateIdentityPass: boolean;
    densityPass: boolean;
    velocityPass: boolean;
    rawReactionPass: boolean;
    pass: boolean;
  };
}

export interface CanonicalDiscreteTrace {
  cornerId: string;
  family: string;
  sourceCaseId: string;
  construction: "direct-S1-w12d-trace-never-an-average";
  relativeXCells: number[];
  relativeYCells: number[];
  samples: RegionFieldSample[];
}

export interface SignPairComparison {
  id: string;
  parameterId: string;
  geometryId: string;
  magnitudeClass: "large" | "small";
  positiveCaseId: string;
  negativeCaseId: string;
  meanDragRelativeDifference: number;
  liftRmsRelativeDifference: number;
  strouhalAbsoluteDifference: number | null;
  detectionIdentity: boolean;
  meanDensityFieldRmsDifference: number;
  meanVelocityFieldRmsDifferenceOverInletVelocity: number;
  fluctuationRmsRelativeDifference: number;
  gate: {
    meanDragPass: boolean;
    liftRmsPass: boolean;
    strouhalPass: boolean;
    densityFieldPass: boolean;
    velocityFieldPass: boolean;
    fluctuationPass: boolean;
    pass: boolean;
  };
}

export interface AmplitudeComparison {
  parameterId: string;
  polarity: 1 | -1;
  largeCaseId: string;
  smallCaseId: string;
  meanDragRelativeDifference: number;
  liftRmsRelativeDifference: number;
  strouhalAbsoluteDifference: number | null;
  detectionIdentity: boolean;
  largeGrowthRate: number;
  smallGrowthRate: number;
  growthRateRelativeDifference: number;
  saturatedPass: boolean;
  growingPass: boolean;
}

export type MaturityClassification =
  | "stable-seed-decay"
  | "unstable-growing-not-saturated"
  | "saturated-unsteady"
  | "indeterminate";

export type SymmetryLockClassification =
  | "symmetry-lock-present"
  | "symmetry-lock-not-observed"
  | "symmetry-lock-indeterminate";

export interface ParameterMaturityAnalysis {
  parameterId: string;
  runIds: string[];
  signPairs: SignPairComparison[];
  amplitudeComparisons: AmplitudeComparison[];
  classification: MaturityClassification;
  symmetryLock: SymmetryLockClassification;
  zeroSeedFinalLiftRms: number;
  gates: {
    allRunsInternallyPass: boolean;
    signPairsPass: boolean;
    amplitudeConsistencyPass: boolean;
    classificationResolved: boolean;
    symmetryLockDetermined: boolean;
    pass: boolean;
  };
}

export interface SensitivityRunComparison {
  id: string;
  polarity: 1 | -1;
  baseCaseId: string;
  comparedCaseId: string;
  geometryId: string;
  meanDragRelativeDifference: number;
  liftRmsRelativeDifference: number;
  strouhalAbsoluteDifference: number | null;
  detectionIdentity: boolean;
  growthRateRelativeDifference: number;
  meanVelocityFieldRmsDifferenceOverInletVelocity: number;
  gate: {
    meanDragPass: boolean;
    liftRmsPass: boolean;
    strouhalPass: boolean;
    growthRatePass: boolean;
    meanVelocityFieldPass: boolean;
    pass: boolean;
  };
}

export interface JointSensitivityAnalysis {
  parameterId: string;
  geometryClassifications: {
    geometryId: string;
    classification: MaturityClassification;
    signPairPass: boolean;
  }[];
  comparisons: SensitivityRunComparison[];
  gate: {
    geometryCountPass: boolean;
    allGeometryClassificationsResolved: boolean;
    sameClassificationPass: boolean;
    allSignPairsPass: boolean;
    allMetricComparisonsPass: boolean;
    pass: boolean;
  };
}

export interface FormalDiscreteReferenceQualificationResult {
  format: "VP-A8P-DISCRETE-REFERENCE-MATURITY-QUALIFICATION-v1";
  contractIdentity: DiscreteReferenceProvenance & {
    format: "VP-A8P-DISCRETE-REFERENCE-MATURITY-CONTRACT-v1";
  };
  discreteReference: {
    runs: DiscreteReferenceRunResult[];
    exactComparisons: ExactTraceComparison[];
    canonicalTraces: CanonicalDiscreteTrace[];
    gate: {
      runCountPass: boolean;
      allTrajectoriesCompleteAndFinite: boolean;
      allInternalLedgersPass: boolean;
      allStabilityPass: boolean;
      allStrictConeGuardsPass: boolean;
      comparisonCountPass: boolean;
      allExactComparisonsPass: boolean;
      canonicalTraceCountPass: boolean;
      pass: boolean;
    };
  };
  maturity: {
    runs: MaturityRunResult[];
    parameterAnalyses: ParameterMaturityAnalysis[];
    jointSensitivity: JointSensitivityAnalysis;
    gate: {
      runCountPass: boolean;
      allTrajectoriesCompleteAndFinite: boolean;
      allInternalLedgersPass: boolean;
      allStabilityPass: boolean;
      allDurationTiersComplete: boolean;
      bothParameterClassificationsResolved: boolean;
      allSignPairsReproducible: boolean;
      amplitudeClassificationConsistent: boolean;
      symmetryLockDetermined: boolean;
      jointSensitivityPass: boolean;
      pass: boolean;
    };
  };
  decision: {
    code: string;
    pass: boolean;
    gates: {
      discreteReferencePass: boolean;
      maturityProtocolPass: boolean;
      allA8pPopulationLedgersPass: boolean;
      independentRepeatRequired: true;
    };
    formalSourceModified: false;
    formalIntegrationUnlocked: false;
    s9Selected: false;
    newBoundaryStrategyCreated: false;
    stopAfterEvidenceReportRepeatAndHandoff: true;
    statement: string;
    claimUpperBound: string;
  };
}

function shortKey(
  cornerId: string,
  family: string,
  widthId: string,
  strategy: FormalDiscreteReferenceStrategy,
): string {
  return [cornerId, family, widthId, strategy].join("|");
}

function maturityKey(
  parameterId: string,
  geometryId: string,
  seedId: string,
): string {
  return [parameterId, geometryId, seedId].join("|");
}

function coordinatesExact(
  first: DiscreteReferenceRunExecution,
  second: DiscreteReferenceRunExecution,
): boolean {
  return first.layout.relativeXCells.length === second.layout.relativeXCells.length
    && first.layout.relativeXCells.every((value, index) =>
      Object.is(value, second.layout.relativeXCells[index]))
    && first.layout.relativeYCells.every((value, index) =>
      Object.is(value, second.layout.relativeYCells[index]));
}

function compareExactTraces(
  id: string,
  kind: ExactTraceComparison["kind"],
  first: DiscreteReferenceRunExecution,
  second: DiscreteReferenceRunExecution,
): ExactTraceComparison {
  const sampleCountPass = first.samples.length === second.samples.length
    && first.samples.length > 0;
  const coordinateIdentityPass = coordinatesExact(first, second);
  let exact = sampleCountPass && coordinateIdentityPass;
  let maximumAbsoluteDensityDifference = 0;
  let maximumAbsoluteVelocityComponentDifference = 0;
  let maximumAbsoluteRawBodyReactionDifference = 0;
  let firstMismatchStep: number | null = null;
  if (sampleCountPass && coordinateIdentityPass) {
    for (let index = 0; index < first.samples.length; index += 1) {
      const firstSample = first.samples[index];
      const secondSample = second.samples[index];
      if (firstSample === undefined || secondSample === undefined) {
        throw new Error("A8P missing exact comparison sample");
      }
      const comparison = exactRegionSampleDifference(firstSample, secondSample);
      exact &&= comparison.exact;
      maximumAbsoluteDensityDifference = Math.max(
        maximumAbsoluteDensityDifference,
        comparison.maximumAbsoluteDensityDifference,
      );
      maximumAbsoluteVelocityComponentDifference = Math.max(
        maximumAbsoluteVelocityComponentDifference,
        comparison.maximumAbsoluteVelocityComponentDifference,
      );
      maximumAbsoluteRawBodyReactionDifference = Math.max(
        maximumAbsoluteRawBodyReactionDifference,
        comparison.maximumAbsoluteRawBodyReactionDifference,
      );
      if (!comparison.exact && firstMismatchStep === null) {
        firstMismatchStep = firstSample.step;
      }
    }
  } else {
    exact = false;
  }
  const gates = CONTRACT.discreteReference.gates;
  const densityPass = maximumAbsoluteDensityDifference
    <= gates.maximumAbsoluteDensityDifference;
  const velocityPass = maximumAbsoluteVelocityComponentDifference
    <= gates.maximumAbsoluteVelocityComponentDifference;
  const rawReactionPass = maximumAbsoluteRawBodyReactionDifference
    <= gates.maximumAbsoluteRawBodyReactionDifference;
  const pass = sampleCountPass
    && coordinateIdentityPass
    && exact
    && densityPass
    && velocityPass
    && rawReactionPass;
  return {
    id,
    kind,
    firstCaseId: first.result.definition.id,
    secondCaseId: second.result.definition.id,
    comparedSamples: Math.min(first.samples.length, second.samples.length),
    comparedCellsPerSample: first.samples[0]?.rho.length ?? 0,
    exact,
    maximumAbsoluteDensityDifference,
    maximumAbsoluteVelocityComponentDifference,
    maximumAbsoluteRawBodyReactionDifference,
    firstMismatchStep,
    gate: {
      sampleCountPass,
      coordinateIdentityPass,
      densityPass,
      velocityPass,
      rawReactionPass,
      pass,
    },
  };
}

function finalWindow(run: MaturityRunResult): MaturityWindowResult {
  const window = run.windows.find((candidate) =>
    candidate.tierConvectiveTime === 96);
  if (window === undefined) throw new Error("A8P missing 96-Tc window");
  return window;
}

function tierWindow(
  run: MaturityRunResult,
  tier: number,
): MaturityWindowResult {
  const window = run.windows.find((candidate) =>
    candidate.tierConvectiveTime === tier);
  if (window === undefined) throw new Error("A8P missing tier " + tier);
  return window;
}

function growthRate(run: MaturityRunResult): number {
  const first = tierWindow(run, 24).field.mirrorDefectRms;
  const last = tierWindow(run, 96).field.mirrorDefectRms;
  const floor = CONTRACT.maturity.classification.relativeDenominatorFloor;
  return (
    Math.log(Math.max(last, floor)) - Math.log(Math.max(first, floor))
  ) / 72;
}

function growthRatio(run: MaturityRunResult): number {
  const first = tierWindow(run, 24).field.mirrorDefectRms;
  const last = tierWindow(run, 96).field.mirrorDefectRms;
  return last / Math.max(
    first,
    CONTRACT.maturity.classification.relativeDenominatorFloor,
  );
}

function compareSignPair(
  parameterId: string,
  geometryId: string,
  magnitudeClass: "large" | "small",
  positive: MaturityRunResult,
  negative: MaturityRunResult,
): SignPairComparison {
  const positiveWindow = finalWindow(positive);
  const negativeWindow = finalWindow(negative);
  const fields = compareMirroredWindowFields(
    positiveWindow.field,
    negativeWindow.field,
  );
  const meanDragRelativeDifference = relativeDifference(
    positiveWindow.load.meanDrag,
    negativeWindow.load.meanDrag,
  );
  const liftRmsRelativeDifference = relativeDifference(
    positiveWindow.load.liftRms,
    negativeWindow.load.liftRms,
  );
  const detectionIdentity = positiveWindow.load.detectable
    === negativeWindow.load.detectable;
  const strouhalAbsoluteDifference = positiveWindow.load.detectable
    && negativeWindow.load.detectable
    ? Math.abs(
      positiveWindow.load.dominantStrouhal
        - negativeWindow.load.dominantStrouhal,
    )
    : null;
  const gates = CONTRACT.maturity.signPairGates;
  const meanDragPass = meanDragRelativeDifference
    <= gates.maximumMeanDragRelativeDifference;
  const liftRmsPass = liftRmsRelativeDifference
    <= gates.maximumLiftRmsRelativeDifference;
  const strouhalPass = detectionIdentity
    && (strouhalAbsoluteDifference === null
      || strouhalAbsoluteDifference
        <= gates.maximumStrouhalAbsoluteDifference);
  const densityFieldPass = fields.meanDensityRmsDifference
    <= gates.maximumMirroredMeanDensityFieldRmsDifference;
  const velocityFieldPass = fields.meanVelocityRmsDifferenceOverInletVelocity
    <= gates.maximumMirroredMeanVelocityFieldRmsDifferenceOverInletVelocity;
  const fluctuationPass = fields.fluctuationRmsRelativeDifference
    <= gates.maximumMirroredFluctuationRmsRelativeDifference;
  const pass = meanDragPass
    && liftRmsPass
    && strouhalPass
    && densityFieldPass
    && velocityFieldPass
    && fluctuationPass;
  return {
    id: [parameterId, geometryId, magnitudeClass, "sign-pair"].join("-"),
    parameterId,
    geometryId,
    magnitudeClass,
    positiveCaseId: positive.definition.id,
    negativeCaseId: negative.definition.id,
    meanDragRelativeDifference,
    liftRmsRelativeDifference,
    strouhalAbsoluteDifference,
    detectionIdentity,
    meanDensityFieldRmsDifference: fields.meanDensityRmsDifference,
    meanVelocityFieldRmsDifferenceOverInletVelocity:
      fields.meanVelocityRmsDifferenceOverInletVelocity,
    fluctuationRmsRelativeDifference:
      fields.fluctuationRmsRelativeDifference,
    gate: {
      meanDragPass,
      liftRmsPass,
      strouhalPass,
      densityFieldPass,
      velocityFieldPass,
      fluctuationPass,
      pass,
    },
  };
}

function compareAmplitude(
  parameterId: string,
  polarity: 1 | -1,
  large: MaturityRunResult,
  small: MaturityRunResult,
): AmplitudeComparison {
  const largeWindow = finalWindow(large);
  const smallWindow = finalWindow(small);
  const meanDragRelativeDifference = relativeDifference(
    largeWindow.load.meanDrag,
    smallWindow.load.meanDrag,
  );
  const liftRmsRelativeDifference = relativeDifference(
    largeWindow.load.liftRms,
    smallWindow.load.liftRms,
  );
  const detectionIdentity = largeWindow.load.detectable
    === smallWindow.load.detectable;
  const strouhalAbsoluteDifference = largeWindow.load.detectable
    && smallWindow.load.detectable
    ? Math.abs(
      largeWindow.load.dominantStrouhal
        - smallWindow.load.dominantStrouhal,
    )
    : null;
  const largeGrowthRate = growthRate(large);
  const smallGrowthRate = growthRate(small);
  const amplitudeGates = CONTRACT.maturity.amplitudeGates;
  const growthRateRelativeDifference = relativeDifference(
    largeGrowthRate,
    smallGrowthRate,
    amplitudeGates.growthRateRelativeDenominatorFloorPerConvectiveTime,
  );
  const saturatedPass = detectionIdentity
    && meanDragRelativeDifference
      <= amplitudeGates.maximumSaturatedMeanDragRelativeDifference
    && liftRmsRelativeDifference
      <= amplitudeGates.maximumSaturatedLiftRmsRelativeDifference
    && (strouhalAbsoluteDifference === null
      || strouhalAbsoluteDifference
        <= amplitudeGates.maximumSaturatedStrouhalAbsoluteDifference);
  const growingPass = growthRateRelativeDifference
    <= amplitudeGates.maximumGrowingRateRelativeDifference;
  return {
    parameterId,
    polarity,
    largeCaseId: large.definition.id,
    smallCaseId: small.definition.id,
    meanDragRelativeDifference,
    liftRmsRelativeDifference,
    strouhalAbsoluteDifference,
    detectionIdentity,
    largeGrowthRate,
    smallGrowthRate,
    growthRateRelativeDifference,
    saturatedPass,
    growingPass,
  };
}

function individualStable(run: MaturityRunResult): boolean {
  const last = finalWindow(run);
  const gates = CONTRACT.maturity.classification;
  return last.load.liftRms <= gates.stableMaximumFinalLiftRms
    && last.field.mirrorDefectRms <= gates.stableMaximumFinalMirrorDefect
    && growthRatio(run)
      <= gates.stableMaximumFinalToFirstTierMirrorDefectRatio;
}

function individualSaturated(run: MaturityRunResult): boolean {
  const middle = tierWindow(run, 48);
  const last = finalWindow(run);
  const gates = CONTRACT.maturity.classification;
  return middle.load.detectable
    && last.load.detectable
    && relativeDifference(middle.load.meanDrag, last.load.meanDrag)
      <= gates.saturatedMaximumTier48To96MeanDragRelativeDrift
    && relativeDifference(middle.load.liftRms, last.load.liftRms)
      <= gates.saturatedMaximumTier48To96LiftRmsRelativeDrift
    && Math.abs(
      middle.load.dominantStrouhal - last.load.dominantStrouhal,
    ) <= gates.saturatedMaximumTier48To96StrouhalDifference;
}

function individualGrowing(run: MaturityRunResult): boolean {
  return growthRatio(run)
    >= CONTRACT.maturity.classification
      .growingMinimumFinalToFirstTierMirrorDefectRatio;
}

function classifyBaseParameter(
  runs: readonly MaturityRunResult[],
  signPairs: readonly SignPairComparison[],
  amplitudes: readonly AmplitudeComparison[],
): MaturityClassification {
  const nonzero = runs.filter((run) => run.definition.seedPolarity !== 0);
  const signPass = signPairs.length === 2
    && signPairs.every((comparison) => comparison.gate.pass);
  if (nonzero.length === 4
    && nonzero.every(individualStable)
    && signPass) {
    return "stable-seed-decay";
  }
  if (nonzero.length === 4
    && nonzero.every(individualSaturated)
    && signPass
    && amplitudes.length === 2
    && amplitudes.every((comparison) => comparison.saturatedPass)) {
    return "saturated-unsteady";
  }
  if (nonzero.length === 4
    && nonzero.every(individualGrowing)
    && signPass
    && amplitudes.length === 2
    && amplitudes.every((comparison) => comparison.growingPass)) {
    return "unstable-growing-not-saturated";
  }
  return "indeterminate";
}

function symmetryLock(
  classification: MaturityClassification,
  zeroSeed: MaturityRunResult,
): SymmetryLockClassification {
  const zeroUndetectable = finalWindow(zeroSeed).load.liftRms
    <= CONTRACT.maturity.classification
      .zeroSeedMaximumLiftRmsForSymmetryLock;
  if (classification === "stable-seed-decay") {
    return "symmetry-lock-not-observed";
  }
  if (classification === "saturated-unsteady"
    || classification === "unstable-growing-not-saturated") {
    return zeroUndetectable
      ? "symmetry-lock-present"
      : "symmetry-lock-not-observed";
  }
  return "symmetry-lock-indeterminate";
}

function analyzeParameter(
  parameterId: string,
  runMap: ReadonlyMap<string, MaturityRunResult>,
): ParameterMaturityAnalysis {
  const required = [
    "zero",
    "large-positive",
    "large-negative",
    "small-positive",
    "small-negative",
  ];
  const runs = required.map((seedId) => {
    const run = runMap.get(maturityKey(parameterId, "base", seedId));
    if (run === undefined) throw new Error("A8P missing base run " + seedId);
    return run;
  });
  const bySeed = new Map(runs.map((run) => [run.definition.seedId, run]));
  const largePositive = bySeed.get("large-positive");
  const largeNegative = bySeed.get("large-negative");
  const smallPositive = bySeed.get("small-positive");
  const smallNegative = bySeed.get("small-negative");
  const zero = bySeed.get("zero");
  if (largePositive === undefined || largeNegative === undefined
    || smallPositive === undefined || smallNegative === undefined
    || zero === undefined) {
    throw new Error("A8P incomplete parameter seed set");
  }
  const signPairs = [
    compareSignPair(
      parameterId,
      "base",
      "large",
      largePositive,
      largeNegative,
    ),
    compareSignPair(
      parameterId,
      "base",
      "small",
      smallPositive,
      smallNegative,
    ),
  ];
  const amplitudeComparisons = [
    compareAmplitude(parameterId, 1, largePositive, smallPositive),
    compareAmplitude(parameterId, -1, largeNegative, smallNegative),
  ];
  const classification = classifyBaseParameter(
    runs,
    signPairs,
    amplitudeComparisons,
  );
  const lock = symmetryLock(classification, zero);
  const allRunsInternallyPass = runs.every((run) => run.gate.pass);
  const signPairsPass = signPairs.every((comparison) => comparison.gate.pass);
  const amplitudeConsistencyPass = classification === "stable-seed-decay"
    ? true
    : classification === "saturated-unsteady"
      ? amplitudeComparisons.every((comparison) => comparison.saturatedPass)
      : classification === "unstable-growing-not-saturated"
        ? amplitudeComparisons.every((comparison) => comparison.growingPass)
        : false;
  const classificationResolved = classification !== "indeterminate";
  const symmetryLockDetermined = lock !== "symmetry-lock-indeterminate";
  const pass = allRunsInternallyPass
    && signPairsPass
    && amplitudeConsistencyPass
    && classificationResolved
    && symmetryLockDetermined;
  return {
    parameterId,
    runIds: runs.map((run) => run.definition.id),
    signPairs,
    amplitudeComparisons,
    classification,
    symmetryLock: lock,
    zeroSeedFinalLiftRms: finalWindow(zero).load.liftRms,
    gates: {
      allRunsInternallyPass,
      signPairsPass,
      amplitudeConsistencyPass,
      classificationResolved,
      symmetryLockDetermined,
      pass,
    },
  };
}

function classifyLargePair(
  positive: MaturityRunResult,
  negative: MaturityRunResult,
  signPair: SignPairComparison,
): MaturityClassification {
  if (individualStable(positive)
    && individualStable(negative)
    && signPair.gate.pass) {
    return "stable-seed-decay";
  }
  if (individualSaturated(positive)
    && individualSaturated(negative)
    && signPair.gate.pass) {
    return "saturated-unsteady";
  }
  if (individualGrowing(positive)
    && individualGrowing(negative)
    && signPair.gate.pass) {
    return "unstable-growing-not-saturated";
  }
  return "indeterminate";
}

function compareSensitivityRun(
  polarity: 1 | -1,
  base: MaturityRunResult,
  compared: MaturityRunResult,
  classification: MaturityClassification,
): SensitivityRunComparison {
  const baseWindow = finalWindow(base);
  const comparedWindow = finalWindow(compared);
  const meanDragRelativeDifference = relativeDifference(
    baseWindow.load.meanDrag,
    comparedWindow.load.meanDrag,
  );
  const liftRmsRelativeDifference = relativeDifference(
    baseWindow.load.liftRms,
    comparedWindow.load.liftRms,
  );
  const detectionIdentity = baseWindow.load.detectable
    === comparedWindow.load.detectable;
  const strouhalAbsoluteDifference = baseWindow.load.detectable
    && comparedWindow.load.detectable
    ? Math.abs(
      baseWindow.load.dominantStrouhal
        - comparedWindow.load.dominantStrouhal,
    )
    : null;
  const growthRateRelativeDifference = relativeDifference(
    growthRate(base),
    growthRate(compared),
    CONTRACT.maturity.amplitudeGates
      .growthRateRelativeDenominatorFloorPerConvectiveTime,
  );
  const meanVelocityFieldRmsDifferenceOverInletVelocity =
    compareDirectMeanVelocityFields(baseWindow.field, comparedWindow.field);
  const gates = CONTRACT.maturity.sensitivityGates;
  const meanDragPass = meanDragRelativeDifference
    <= gates.maximumMeanDragRelativeDifference;
  const liftRmsPass = liftRmsRelativeDifference
    <= gates.maximumLiftRmsRelativeDifference;
  const strouhalPass = detectionIdentity
    && (strouhalAbsoluteDifference === null
      || strouhalAbsoluteDifference
        <= gates.maximumStrouhalAbsoluteDifference);
  const growthRatePass = classification
    !== "unstable-growing-not-saturated"
    || growthRateRelativeDifference
      <= gates.maximumGrowthRateRelativeDifference;
  const meanVelocityFieldPass =
    meanVelocityFieldRmsDifferenceOverInletVelocity
      <= gates.maximumMeanVelocityFieldRmsDifferenceOverInletVelocity;
  const pass = meanDragPass
    && liftRmsPass
    && strouhalPass
    && growthRatePass
    && meanVelocityFieldPass;
  return {
    id: [compared.definition.geometryId, polarity > 0 ? "positive" : "negative"].join("-"),
    polarity,
    baseCaseId: base.definition.id,
    comparedCaseId: compared.definition.id,
    geometryId: compared.definition.geometryId,
    meanDragRelativeDifference,
    liftRmsRelativeDifference,
    strouhalAbsoluteDifference,
    detectionIdentity,
    growthRateRelativeDifference,
    meanVelocityFieldRmsDifferenceOverInletVelocity,
    gate: {
      meanDragPass,
      liftRmsPass,
      strouhalPass,
      growthRatePass,
      meanVelocityFieldPass,
      pass,
    },
  };
}

function analyzeJointSensitivity(
  runMap: ReadonlyMap<string, MaturityRunResult>,
): JointSensitivityAnalysis {
  const parameterId = CONTRACT.maturity.sensitivityParameterId;
  const geometryClassifications: JointSensitivityAnalysis["geometryClassifications"] = [];
  const pairs = new Map<string, {
    positive: MaturityRunResult;
    negative: MaturityRunResult;
    classification: MaturityClassification;
  }>();
  for (const geometry of FORMAL_MATURITY_GEOMETRIES) {
    const positive = runMap.get(maturityKey(
      parameterId,
      geometry.id,
      "large-positive",
    ));
    const negative = runMap.get(maturityKey(
      parameterId,
      geometry.id,
      "large-negative",
    ));
    if (positive === undefined || negative === undefined) {
      throw new Error("A8P missing sensitivity geometry " + geometry.id);
    }
    const signPair = compareSignPair(
      parameterId,
      geometry.id,
      "large",
      positive,
      negative,
    );
    const classification = classifyLargePair(positive, negative, signPair);
    geometryClassifications.push({
      geometryId: geometry.id,
      classification,
      signPairPass: signPair.gate.pass,
    });
    pairs.set(geometry.id, { positive, negative, classification });
  }
  const base = pairs.get("base");
  if (base === undefined) throw new Error("A8P missing base sensitivity pair");
  const comparisons: SensitivityRunComparison[] = [];
  for (const geometry of FORMAL_MATURITY_GEOMETRIES) {
    if (geometry.id === "base") continue;
    const pair = pairs.get(geometry.id);
    if (pair === undefined) throw new Error("A8P missing sensitivity pair");
    comparisons.push(compareSensitivityRun(
      1,
      base.positive,
      pair.positive,
      pair.classification,
    ));
    comparisons.push(compareSensitivityRun(
      -1,
      base.negative,
      pair.negative,
      pair.classification,
    ));
  }
  const geometryCountPass = geometryClassifications.length
    === FORMAL_MATURITY_GEOMETRIES.length;
  const allGeometryClassificationsResolved = geometryClassifications.every(
    (entry) => entry.classification !== "indeterminate",
  );
  const sameClassificationPass = new Set(
    geometryClassifications.map((entry) => entry.classification),
  ).size === 1;
  const allSignPairsPass = geometryClassifications.every((entry) =>
    entry.signPairPass);
  const allMetricComparisonsPass = comparisons.every((entry) => entry.gate.pass);
  const pass = geometryCountPass
    && allGeometryClassificationsResolved
    && sameClassificationPass
    && allSignPairsPass
    && allMetricComparisonsPass;
  return {
    parameterId,
    geometryClassifications,
    comparisons,
    gate: {
      geometryCountPass,
      allGeometryClassificationsResolved,
      sameClassificationPass,
      allSignPairsPass,
      allMetricComparisonsPass,
      pass,
    },
  };
}

export function runFormalDiscreteReferenceQualification(
  provenance: DiscreteReferenceProvenance,
  onProgress?: (progress: A8pProgress) => void,
): FormalDiscreteReferenceQualificationResult {
  const shortDefinitions = buildFormalDiscreteReferenceDefinitions();
  const shortExecutions: DiscreteReferenceRunExecution[] = [];
  for (const definition of shortDefinitions) {
    const execution = runDiscreteReferenceCase(definition);
    shortExecutions.push(execution);
    onProgress?.({
      phase: "discrete-reference",
      completed: shortExecutions.length,
      total: shortDefinitions.length,
      caseId: definition.id,
      trajectoryCompleteAndFinite:
        execution.result.trajectoryCompleteAndFinite,
      internalLedgerGatePass: execution.result.internalLedgerGatePass,
      internalPass: execution.result.gate.pass,
    });
  }
  const shortMap = new Map(shortExecutions.map((execution) => [
    shortKey(
      execution.result.definition.cornerId,
      execution.result.definition.family,
      execution.result.definition.widthId,
      execution.result.definition.strategy,
    ),
    execution,
  ]));
  const exactComparisons: ExactTraceComparison[] = [];
  const canonicalTraces: CanonicalDiscreteTrace[] = [];
  for (const corner of FORMAL_DISCRETE_REFERENCE_CORNERS) {
    for (const family of FORMAL_DISCRETE_REFERENCE_FAMILIES) {
      const get = (
        widthId: string,
        strategy: FormalDiscreteReferenceStrategy,
      ): DiscreteReferenceRunExecution => {
        const execution = shortMap.get(shortKey(
          corner.id,
          family.id,
          widthId,
          strategy,
        ));
        if (execution === undefined) throw new Error("A8P missing short trace");
        return execution;
      };
      const s1Base = get("w12d", "legacy-zou-he-derived-density");
      const s9Base = get("w12d", "incoming-characteristic-compatible-zou-he");
      const s1Wide = get("w16d", "legacy-zou-he-derived-density");
      const s9Wide = get("w16d", "incoming-characteristic-compatible-zou-he");
      exactComparisons.push(compareExactTraces(
        [corner.id, family.id, "strategy-w12d"].join("-"),
        "strategy",
        s1Base,
        s9Base,
      ));
      exactComparisons.push(compareExactTraces(
        [corner.id, family.id, "strategy-w16d"].join("-"),
        "strategy",
        s1Wide,
        s9Wide,
      ));
      exactComparisons.push(compareExactTraces(
        [corner.id, family.id, "width-s01"].join("-"),
        "width",
        s1Base,
        s1Wide,
      ));
      exactComparisons.push(compareExactTraces(
        [corner.id, family.id, "width-s09"].join("-"),
        "width",
        s9Base,
        s9Wide,
      ));
      canonicalTraces.push({
        cornerId: corner.id,
        family: family.id,
        sourceCaseId: s1Base.result.definition.id,
        construction: "direct-S1-w12d-trace-never-an-average",
        relativeXCells: s1Base.layout.relativeXCells,
        relativeYCells: s1Base.layout.relativeYCells,
        samples: s1Base.samples,
      });
    }
  }
  const shortRuns = shortExecutions.map((execution) => execution.result);
  const shortRunCountPass = shortRuns.length
    === CONTRACT.discreteReference.matrixRunCount;
  const allShortComplete = shortRuns.every((run) =>
    run.trajectoryCompleteAndFinite);
  const allShortLedgers = shortRuns.every((run) =>
    run.internalLedgerGatePass);
  const allShortStability = shortRuns.every((run) =>
    run.gate.densityPass && run.gate.machPass);
  const allStrictConeGuardsPass = shortRuns.every((run) =>
    run.gate.strictConePass);
  const comparisonCountPass = exactComparisons.length === 24;
  const allExactComparisonsPass = exactComparisons.every((comparison) =>
    comparison.gate.pass);
  const canonicalTraceCountPass = canonicalTraces.length === 6;
  const shortPass = shortRunCountPass
    && allShortComplete
    && allShortLedgers
    && allShortStability
    && allStrictConeGuardsPass
    && comparisonCountPass
    && allExactComparisonsPass
    && canonicalTraceCountPass;

  const maturityDefinitions = buildFormalMaturityDefinitions();
  const maturityRuns: MaturityRunResult[] = [];
  for (const definition of maturityDefinitions) {
    const run = runMaturityCase(definition);
    maturityRuns.push(run);
    onProgress?.({
      phase: "maturity",
      completed: maturityRuns.length,
      total: maturityDefinitions.length,
      caseId: definition.id,
      trajectoryCompleteAndFinite: run.trajectoryCompleteAndFinite,
      internalLedgerGatePass: run.internalLedgerGatePass,
      internalPass: run.gate.pass,
    });
  }
  const maturityMap = new Map(maturityRuns.map((run) => [
    maturityKey(
      run.definition.parameterId,
      run.definition.geometryId,
      run.definition.seedId,
    ),
    run,
  ]));
  const maturityAnalyzable = maturityRuns.every((run) =>
    run.windows.length === CONTRACT.maturity.durationTiersConvective.length);
  const parameterAnalyses = maturityAnalyzable
    ? FORMAL_MATURITY_PARAMETERS.map((parameter) =>
      analyzeParameter(parameter.id, maturityMap))
    : [];
  const jointSensitivity: JointSensitivityAnalysis = maturityAnalyzable
    ? analyzeJointSensitivity(maturityMap)
    : {
      parameterId: CONTRACT.maturity.sensitivityParameterId,
      geometryClassifications: [],
      comparisons: [],
      gate: {
        geometryCountPass: false,
        allGeometryClassificationsResolved: false,
        sameClassificationPass: false,
        allSignPairsPass: false,
        allMetricComparisonsPass: false,
        pass: false,
      },
    };
  const maturityRunCountPass = maturityRuns.length
    === CONTRACT.maturity.uniqueRunCount;
  const allMaturityComplete = maturityRuns.every((run) =>
    run.trajectoryCompleteAndFinite);
  const allMaturityLedgers = maturityRuns.every((run) =>
    run.internalLedgerGatePass);
  const allMaturityStability = maturityRuns.every((run) =>
    run.gate.densityPass && run.gate.machPass);
  const allDurationTiersComplete = maturityRuns.every((run) =>
    run.gate.durationTiersComplete);
  const bothParameterClassificationsResolved = parameterAnalyses.length
    === FORMAL_MATURITY_PARAMETERS.length
    && parameterAnalyses.every((analysis) =>
      analysis.gates.classificationResolved);
  const allSignPairsReproducible = parameterAnalyses.length
    === FORMAL_MATURITY_PARAMETERS.length
    && parameterAnalyses.every((analysis) => analysis.gates.signPairsPass)
    && jointSensitivity.gate.allSignPairsPass;
  const amplitudeClassificationConsistent = parameterAnalyses.length
    === FORMAL_MATURITY_PARAMETERS.length
    && parameterAnalyses.every(
      (analysis) => analysis.gates.amplitudeConsistencyPass,
    );
  const symmetryLockDetermined = parameterAnalyses.length
    === FORMAL_MATURITY_PARAMETERS.length
    && parameterAnalyses.every((analysis) =>
      analysis.gates.symmetryLockDetermined);
  const maturityPass = maturityRunCountPass
    && allMaturityComplete
    && allMaturityLedgers
    && allMaturityStability
    && allDurationTiersComplete
    && bothParameterClassificationsResolved
    && allSignPairsReproducible
    && amplitudeClassificationConsistent
    && symmetryLockDetermined
    && jointSensitivity.gate.pass;
  const allA8pPopulationLedgersPass = allShortLedgers
    && allMaturityLedgers;
  const decisionPass = shortPass
    && maturityPass
    && allA8pPopulationLedgersPass;
  return {
    format: "VP-A8P-DISCRETE-REFERENCE-MATURITY-QUALIFICATION-v1",
    contractIdentity: { format: CONTRACT.format, ...provenance },
    discreteReference: {
      runs: shortRuns,
      exactComparisons,
      canonicalTraces,
      gate: {
        runCountPass: shortRunCountPass,
        allTrajectoriesCompleteAndFinite: allShortComplete,
        allInternalLedgersPass: allShortLedgers,
        allStabilityPass: allShortStability,
        allStrictConeGuardsPass,
        comparisonCountPass,
        allExactComparisonsPass,
        canonicalTraceCountPass,
        pass: shortPass,
      },
    },
    maturity: {
      runs: maturityRuns,
      parameterAnalyses,
      jointSensitivity,
      gate: {
        runCountPass: maturityRunCountPass,
        allTrajectoriesCompleteAndFinite: allMaturityComplete,
        allInternalLedgersPass: allMaturityLedgers,
        allStabilityPass: allMaturityStability,
        allDurationTiersComplete,
        bothParameterClassificationsResolved,
        allSignPairsReproducible,
        amplitudeClassificationConsistent,
        symmetryLockDetermined,
        jointSensitivityPass: jointSensitivity.gate.pass,
        pass: maturityPass,
      },
    },
    decision: {
      code: decisionPass
        ? CONTRACT.decision.passCode
        : CONTRACT.decision.noGoCode,
      pass: decisionPass,
      gates: {
        discreteReferencePass: shortPass,
        maturityProtocolPass: maturityPass,
        allA8pPopulationLedgersPass,
        independentRepeatRequired: true,
      },
      formalSourceModified: false,
      formalIntegrationUnlocked: false,
      s9Selected: false,
      newBoundaryStrategyCreated: false,
      stopAfterEvidenceReportRepeatAndHandoff: true,
      statement: decisionPass
        ? "The frozen A8P finite-time discrete reference and symmetry-broken maturity protocol passed at candidate evidence level; boundary selection and formal integration remain locked."
        : "At least one frozen A8P discrete-reference, maturity-classification, sensitivity, or A8P-only population-ledger gate failed; preserve the negative evidence and do not develop another boundary patch.",
      claimUpperBound: CONTRACT.decision.claimUpperBound,
    },
  };
}
