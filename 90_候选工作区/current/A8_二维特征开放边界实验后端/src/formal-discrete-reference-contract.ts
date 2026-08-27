/** Frozen before the first A8P research execution. */
export const FORMAL_DISCRETE_REFERENCE_STRATEGIES = Object.freeze([
  Object.freeze({
    ordinal: 1,
    id: "legacy-zou-he-derived-density",
    role: "frozen-formal-legacy-reference-carrier",
  }),
  Object.freeze({
    ordinal: 9,
    id: "incoming-characteristic-compatible-zou-he",
    role: "frozen-A8N-acoustic-baseline",
  }),
] as const);

export const FORMAL_DISCRETE_REFERENCE_FAMILIES = Object.freeze([
  Object.freeze({
    id: "localized-density-pulse-no-body",
    body: false,
    initialField: "localized-isothermal-density-pulse-on-uniform-flow",
  }),
  Object.freeze({
    id: "fixed-body-uniform-start",
    body: true,
    initialField: "uniform-target-flow-with-fixed-body-active-from-step-zero",
  }),
] as const);

export const FORMAL_DISCRETE_REFERENCE_CORNERS = Object.freeze([
  Object.freeze({
    id: "d08-t0580",
    nominalDiameterCells: 8,
    relaxationTime: 0.58,
  }),
  Object.freeze({
    id: "d12-t0560",
    nominalDiameterCells: 12,
    relaxationTime: 0.56,
  }),
  Object.freeze({
    id: "d16-t0540",
    nominalDiameterCells: 16,
    relaxationTime: 0.54,
  }),
] as const);

export const FORMAL_DISCRETE_REFERENCE_WIDTHS = Object.freeze([
  Object.freeze({ id: "w12d", widthDiameters: 12, role: "canonical" }),
  Object.freeze({ id: "w16d", widthDiameters: 16, role: "sensitivity" }),
] as const);

export const FORMAL_MATURITY_PARAMETERS = Object.freeze([
  Object.freeze({
    id: "re-screen-d08-t0580",
    nominalDiameterCells: 8,
    relaxationTime: 0.58,
    baseNy: 37,
    baseBodyCenterY: 18.5,
  }),
  Object.freeze({
    id: "re-screen-d12-t0540",
    nominalDiameterCells: 12,
    relaxationTime: 0.54,
    baseNy: 56,
    baseBodyCenterY: 28,
  }),
] as const);

export const FORMAL_MATURITY_SEEDS = Object.freeze([
  Object.freeze({
    id: "zero",
    amplitude: 0,
    magnitudeClass: "zero",
    polarity: 0,
  }),
  Object.freeze({
    id: "large-positive",
    amplitude: 1e-5,
    magnitudeClass: "large",
    polarity: 1,
  }),
  Object.freeze({
    id: "large-negative",
    amplitude: -1e-5,
    magnitudeClass: "large",
    polarity: -1,
  }),
  Object.freeze({
    id: "small-positive",
    amplitude: 1e-7,
    magnitudeClass: "small",
    polarity: 1,
  }),
  Object.freeze({
    id: "small-negative",
    amplitude: -1e-7,
    magnitudeClass: "small",
    polarity: -1,
  }),
] as const);

export const FORMAL_MATURITY_GEOMETRIES = Object.freeze([
  Object.freeze({
    id: "base",
    downstreamDiameters: 6.5,
    widthRole: "parameter-base",
  }),
  Object.freeze({
    id: "downstream-extended",
    downstreamDiameters: 10.5,
    widthRole: "parameter-base",
  }),
  Object.freeze({
    id: "width-extended",
    downstreamDiameters: 6.5,
    widthRole: "seven-diameters",
  }),
  Object.freeze({
    id: "joint-extended",
    downstreamDiameters: 10.5,
    widthRole: "seven-diameters",
  }),
] as const);

export const FORMAL_DISCRETE_REFERENCE_CONTRACT = Object.freeze({
  format: "VP-A8P-DISCRETE-REFERENCE-MATURITY-CONTRACT-v1",
  frozenAgainstRepositoryCommit:
    "263d6fd316c78e582a6bb48db94548c21e076e61",
  sourceIdentity: Object.freeze({
    formalSource: Object.freeze({
      relativePath: "02_模拟程序/src/solvers/highFidelity/lbm.ts",
      sha256:
        "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
      accessMode: "read-only-import-plus-candidate-checkpoint-adapter",
    }),
    proDecision: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/13_A8O_网页版Pro独立审查与下一路线裁决.md",
      sha256:
        "93bc92b6ae1f2f866dca15a98da8b297a57d7d652ea4795ec7060eaa26e364a6",
      routeCode:
        "PRIORITIZE-A8P-DISCRETE-CAUSAL-REFERENCE-AND-SYMMETRY-BROKEN-MATURITY",
    }),
    frozenS9Boundary: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-incoming-characteristic-boundary.ts",
      sha256:
        "6f71213f0882b50ba51acba395003886a2ad57e2b857c23786dba592d360748c",
    }),
    frozenA8oContract: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-causal-reference-contract.ts",
      sha256:
        "4ad7c70eefb4fcc6d7364e6f84badacfb4efa185bf48927011d10cfd48122f60",
    }),
    frozenA8oRuns: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-causal-reference-runs.ts",
      sha256:
        "ec408c318e5a93afde1ae4fa1621b8d99b95924b9dc1fa66a53481294917f5ce",
    }),
    frozenA8oSupport: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-causal-reference-support.ts",
      sha256:
        "074b7600af5968460c5183119cc69c2389c74ec389d8d75d9f86e6dc326306f4",
    }),
  }),
  frozenIdentities: Object.freeze({
    strategies: FORMAL_DISCRETE_REFERENCE_STRATEGIES,
    s1AndS9FormulaeMustRemainByteIdentical: true,
    a8oContractAndEvidenceMustRemainUnchanged: true,
    formalTheoryAndProgramMustRemainUnchanged: true,
    forbidden: Object.freeze([
      "use-acoustic-speed-as-strict-numerical-cone",
      "use-S1-S9-average-as-reference",
      "change-S1-or-S9-formula",
      "create-S10-or-import-an-old-CBC",
      "change-gates-after-results",
      "extend-only-selected-runs-after-results",
      "discard-a-duration-tier-or-seed-run",
      "write-new-ledger-results-back-into-A8O",
      "formal-boundary-UI-or-default-configuration-change",
      "weak-FSI-3D-free-surface-apparatus-or-experiment-run",
    ]),
  }),
  commonNumerics: Object.freeze({
    inletVelocityLattice: 0.08,
    latticeSoundSpeed: 1 / Math.sqrt(3),
    maximumStreamwisePopulationSpeedCellsPerAcceptedStep: 1,
    maximumTransversePopulationSpeedCellsPerAcceptedStep: 1,
    penalizationTimeSteps: 1.5,
    maskHalfThicknessCells: 0.75,
    outerBoundary: "open-periodic-crossflow",
  }),
  discreteReference: Object.freeze({
    corners: FORMAL_DISCRETE_REFERENCE_CORNERS,
    families: FORMAL_DISCRETE_REFERENCE_FAMILIES,
    strategies: FORMAL_DISCRETE_REFERENCE_STRATEGIES,
    widths: FORMAL_DISCRETE_REFERENCE_WIDTHS,
    upstreamDiameters: 12,
    downstreamDiameters: 12,
    runDurationDiameterSteps: 3,
    sampleStrideCellsPerDiameter: 0.25,
    matrixRunCount: 24,
    comparisonRegion: Object.freeze({
      minimumRelativeXDiameters: -2,
      maximumRelativeXDiameters: 4,
      minimumRelativeYDiameters: -2,
      maximumRelativeYDiameters: 2,
      includedCells: "mask-less-than-0.5",
    }),
    localizedPulse: Object.freeze({
      densityAmplitude: 1e-4,
      centerRelativeXDiameters: 1,
      sigmaDiameters: 0.5,
      velocityPerturbation: 0,
      periodicTransverseDistance: true,
    }),
    acceptedStepConvention:
      "step-one-is-post-collision-nearest-neighbor-stream-boundary-write-and-candidate-adapter",
    graphDistance: Object.freeze({
      left: "minimum-compared-x-minus-left-boundary-x",
      right: "right-boundary-x-minus-maximum-compared-x",
      transverseSeam:
        "minimum-row-edge-distance-from-the-compared-central-band-to-the-periodic-seam",
      conservativeGuard:
        "sample-step-is-strictly-less-than-each-recorded-graph-distance",
      rationale:
        "a-boundary-write-or-periodic-seam-dependence-can-propagate-at-most-one-cell-per-accepted-step",
    }),
    canonicalTrace: Object.freeze({
      strategy: "legacy-zou-he-derived-density",
      width: "w12d",
      construction: "direct-trace-never-an-S1-S9-average",
      validityRequires: Object.freeze([
        "all-samples-pass-left-right-and-transverse-discrete-cone-guards",
        "S1-and-S9-common-region-traces-agree-exactly-within-each-width",
        "w12d-and-w16d-common-region-traces-agree-exactly-within-each-strategy",
      ]),
    }),
    gates: Object.freeze({
      maximumAbsoluteDensityDifference: 0,
      maximumAbsoluteVelocityComponentDifference: 0,
      maximumAbsoluteRawBodyReactionDifference: 0,
      requireEveryRunCompleteAndFinite: true,
      requireEverySampleStrictlyOutsideAllRecordedBoundaryCones: true,
      requireEveryStrategyAndWidthComparisonExact: true,
    }),
  }),
  maturity: Object.freeze({
    strategy: "legacy-zou-he-derived-density",
    interpretation:
      "protocol-carrier-only; no comparison with or selection of S9",
    parameters: FORMAL_MATURITY_PARAMETERS,
    seeds: FORMAL_MATURITY_SEEDS,
    geometries: FORMAL_MATURITY_GEOMETRIES,
    upstreamDiameters: 3.5,
    durationTiersConvective: Object.freeze([24, 48, 96]),
    analysisWindowConvectiveDuration: 12,
    fieldSampleStrideCellsPerDiameter: 0.25,
    uniqueRunCount: 16,
    baselineRunCount: 10,
    sensitivityOnlyRunCount: 6,
    sensitivityParameterId: "re-screen-d12-t0540",
    sensitivitySeedIds: Object.freeze([
      "large-positive",
      "large-negative",
    ]),
    extendedWidthDiameters: 7,
    antisymmetricSeed: Object.freeze({
      component: "uy",
      centerRelativeXDiameters: 1.5,
      centerRelativeYDiameters: 0,
      sigmaXDiameters: 0.5,
      sigmaYDiameters: 0.75,
      formula:
        "delta-uy=A-exp(-0.5*((x-xc)^2/sigma-x^2+(periodic-y-yc)^2/sigma-y^2))",
      mirrorIdentity:
        "positive-and-negative-seeds-map-under-y-reflection-with-vector-uy-sign-change",
    }),
    analysisRegion: Object.freeze({
      minimumRelativeXDiameters: -2,
      maximumRelativeXDiameters: 4,
      minimumRelativeYDiameters: -2,
      maximumRelativeYDiameters: 2,
      includedCells: "mask-less-than-0.5",
    }),
    phaseIndependentRecord: Object.freeze([
      "mirrored-time-mean-density-and-velocity-field",
      "density-and-vector-velocity-fluctuation-rms-fields",
      "corrected-drag-mean-and-rms",
      "corrected-lift-mean-and-rms",
      "lift-spectrum-and-dominant-Strouhal-when-detectable",
      "mirror-symmetry-defect",
    ]),
    spectrum: Object.freeze({
      strouhalSearchInclusive: Object.freeze([0.05, 0.35]),
      strouhalIncrement: 0.0005,
      minimumDetectableCyclesPerWindow: 1.5,
      detectableLiftRms: 1e-4,
    }),
    stabilityGates: Object.freeze({
      maximumDensityDeviation: 0.12,
      maximumMach: 0.30,
    }),
    classification: Object.freeze({
      allowed: Object.freeze([
        "stable-seed-decay",
        "unstable-growing-not-saturated",
        "saturated-unsteady",
        "indeterminate",
      ]),
      stableMaximumFinalLiftRms: 1e-4,
      stableMaximumFinalMirrorDefect: 1e-5,
      stableMaximumFinalToFirstTierMirrorDefectRatio: 0.25,
      growingMinimumFinalToFirstTierMirrorDefectRatio: 4,
      saturatedMaximumTier48To96MeanDragRelativeDrift: 0.05,
      saturatedMaximumTier48To96LiftRmsRelativeDrift: 0.15,
      saturatedMaximumTier48To96StrouhalDifference: 0.01,
      relativeDenominatorFloor: 1e-12,
      zeroSeedMaximumLiftRmsForSymmetryLock: 1e-12,
    }),
    signPairGates: Object.freeze({
      maximumMeanDragRelativeDifference: 0.05,
      maximumLiftRmsRelativeDifference: 0.10,
      maximumStrouhalAbsoluteDifference: 0.01,
      maximumMirroredMeanDensityFieldRmsDifference: 1e-3,
      maximumMirroredMeanVelocityFieldRmsDifferenceOverInletVelocity: 0.02,
      maximumMirroredFluctuationRmsRelativeDifference: 0.20,
    }),
    amplitudeGates: Object.freeze({
      maximumSaturatedMeanDragRelativeDifference: 0.10,
      maximumSaturatedLiftRmsRelativeDifference: 0.20,
      maximumSaturatedStrouhalAbsoluteDifference: 0.02,
      maximumGrowingRateRelativeDifference: 0.25,
      growthRateRelativeDenominatorFloorPerConvectiveTime: 1e-4,
    }),
    sensitivityGates: Object.freeze({
      requireSameResolvedClassification: true,
      maximumMeanDragRelativeDifference: 0.10,
      maximumLiftRmsRelativeDifference: 0.25,
      maximumStrouhalAbsoluteDifference: 0.03,
      maximumGrowthRateRelativeDifference: 0.30,
      maximumMeanVelocityFieldRmsDifferenceOverInletVelocity: 0.05,
    }),
    gates: Object.freeze({
      requireEveryRunCompleteAndFinite: true,
      requireEveryDurationTierAndAnalysisWindowComplete: true,
      requireBothSeedMagnitudesAndBothSigns: true,
      requireBothBaseParameterClassificationsResolved: true,
      requireSignPairReproducibility: true,
      requireAmplitudeClassificationConsistency: true,
      requireJointDownstreamWidthSensitivityPass: true,
      requireSymmetryLockPresenceOrAbsenceDetermined: true,
    }),
  }),
  populationLedger: Object.freeze({
    role: "secondary-A8P-only-roundoff-audit",
    methods: Object.freeze([
      "A8O-ordered",
      "fixed-binary-pairwise",
      "Neumaier-compensated",
    ]),
    gateMethod: "Neumaier-compensated",
    diagnosticOnlyMethods: Object.freeze([
      "A8O-ordered",
      "fixed-binary-pairwise",
    ]),
    auditStride: "same-as-phase-field-sample-stride-plus-first-and-final-step",
    errorBound: Object.freeze({
      epsilon: Number.EPSILON,
      orderedGamma:
        "gamma-(n-1)=(n-1)*epsilon/(1-(n-1)*epsilon)",
      pairwiseGamma:
        "gamma-ceil-log2-n=ceil(log2(n))*epsilon/(1-ceil(log2(n))*epsilon)",
      scale: "sum-of-absolute-populations",
      compensatedGateMultiplier: 8,
    }),
    requiredSeparateFields: Object.freeze([
      "trajectoryCompleteAndFinite",
      "internalLedgerGatePass",
    ]),
    gates: Object.freeze({
      requireEveryScheduledAuditPresentAndFinite: true,
      requireCompensatedClosureWithinScaledBound: true,
      maximumNonIncomingAbsoluteModification: 0,
    }),
    a8oStatusMustRemain:
      "NO-GO-A8O-EVIDENCE-INCOMPLETE-OR-INTERNAL-GATES",
  }),
  artifact: Object.freeze({
    deterministicCaseOrder: true,
    timestampFieldsForbidden: true,
    nonFiniteJsonValuesForbidden: true,
    gzipLevel: 9,
    gzipMtime: 0,
    independentFullRepeatRequired: true,
  }),
  decision: Object.freeze({
    passCode:
      "PASS-A8P-DISCRETE-REFERENCE-AND-MATURITY-PROTOCOL-CANDIDATE-ONLY",
    noGoCode:
      "NO-GO-A8P-DISCRETE-REFERENCE-OR-MATURITY-PROTOCOL-GATES",
    formalSourceModified: false,
    formalIntegrationUnlocked: false,
    s9Selected: false,
    newBoundaryStrategyCreated: false,
    stopAfterEvidenceReportRepeatAndHandoff: true,
    claimUpperBound:
      "Candidate-only finite-time D2Q9 discrete-domain reference, reproducible symmetry-broken maturity classification, and A8P-only floating-point ledger identity; no boundary selection, formal integration, grid-converged load truth, FSI, apparatus prediction, or experimental validation.",
  }),
});

export type FormalDiscreteReferenceStrategy =
  typeof FORMAL_DISCRETE_REFERENCE_STRATEGIES[number]["id"];
export type FormalDiscreteReferenceFamily =
  typeof FORMAL_DISCRETE_REFERENCE_FAMILIES[number]["id"];
export type FormalMaturitySeed =
  typeof FORMAL_MATURITY_SEEDS[number];

export interface FormalDiscreteReferenceDefinition {
  id: string;
  cornerId: string;
  family: FormalDiscreteReferenceFamily;
  strategy: FormalDiscreteReferenceStrategy;
  widthId: string;
  widthDiameters: number;
  nominalDiameterCells: number;
  relaxationTime: number;
  nx: number;
  ny: number;
  bodyCenterX: number;
  bodyCenterY: number;
  bodyRadius: number;
  runSteps: number;
  sampleStride: number;
}

export interface FormalMaturityDefinition {
  id: string;
  parameterId: string;
  geometryId: string;
  seedId: string;
  seedAmplitude: number;
  seedMagnitudeClass: FormalMaturitySeed["magnitudeClass"];
  seedPolarity: FormalMaturitySeed["polarity"];
  strategy: "legacy-zou-he-derived-density";
  nominalDiameterCells: number;
  relaxationTime: number;
  upstreamDiameters: number;
  downstreamDiameters: number;
  nx: number;
  ny: number;
  bodyCenterX: number;
  bodyCenterY: number;
  bodyRadius: number;
  runSteps: number;
  sampleStride: number;
}

function strategyTag(strategy: FormalDiscreteReferenceStrategy): string {
  const entry = FORMAL_DISCRETE_REFERENCE_STRATEGIES.find((candidate) =>
    candidate.id === strategy);
  if (entry === undefined) throw new Error("unregistered A8P strategy");
  return "s" + entry.ordinal.toString().padStart(2, "0");
}

export function buildFormalDiscreteReferenceDefinitions():
  FormalDiscreteReferenceDefinition[] {
  const contract = FORMAL_DISCRETE_REFERENCE_CONTRACT;
  const definitions: FormalDiscreteReferenceDefinition[] = [];
  for (const corner of FORMAL_DISCRETE_REFERENCE_CORNERS) {
    const diameter = corner.nominalDiameterCells;
    for (const family of FORMAL_DISCRETE_REFERENCE_FAMILIES) {
      for (const width of FORMAL_DISCRETE_REFERENCE_WIDTHS) {
        for (const strategy of FORMAL_DISCRETE_REFERENCE_STRATEGIES) {
          const ny = width.widthDiameters * diameter;
          definitions.push({
            id: [
              "discrete",
              corner.id,
              family.id,
              width.id,
              strategyTag(strategy.id),
            ].join("-"),
            cornerId: corner.id,
            family: family.id,
            strategy: strategy.id,
            widthId: width.id,
            widthDiameters: width.widthDiameters,
            nominalDiameterCells: diameter,
            relaxationTime: corner.relaxationTime,
            nx: (contract.discreteReference.upstreamDiameters
              + contract.discreteReference.downstreamDiameters) * diameter + 1,
            ny,
            bodyCenterX:
              contract.discreteReference.upstreamDiameters * diameter,
            bodyCenterY: ny / 2,
            bodyRadius: diameter / 2,
            runSteps:
              contract.discreteReference.runDurationDiameterSteps * diameter,
            sampleStride: Math.round(
              contract.discreteReference.sampleStrideCellsPerDiameter * diameter,
            ),
          });
        }
      }
    }
  }
  return definitions;
}

function maturityGeometry(
  parameter: typeof FORMAL_MATURITY_PARAMETERS[number],
  geometryId: typeof FORMAL_MATURITY_GEOMETRIES[number]["id"],
): { downstreamDiameters: number; ny: number; bodyCenterY: number } {
  const geometry = FORMAL_MATURITY_GEOMETRIES.find((candidate) =>
    candidate.id === geometryId);
  if (geometry === undefined) throw new Error("unregistered A8P geometry");
  if (geometry.widthRole === "parameter-base") {
    return {
      downstreamDiameters: geometry.downstreamDiameters,
      ny: parameter.baseNy,
      bodyCenterY: parameter.baseBodyCenterY,
    };
  }
  const ny = FORMAL_DISCRETE_REFERENCE_CONTRACT.maturity
    .extendedWidthDiameters * parameter.nominalDiameterCells;
  return {
    downstreamDiameters: geometry.downstreamDiameters,
    ny,
    bodyCenterY: ny / 2,
  };
}

function buildMaturityDefinition(
  parameter: typeof FORMAL_MATURITY_PARAMETERS[number],
  geometryId: typeof FORMAL_MATURITY_GEOMETRIES[number]["id"],
  seed: FormalMaturitySeed,
): FormalMaturityDefinition {
  const contract = FORMAL_DISCRETE_REFERENCE_CONTRACT;
  const geometry = maturityGeometry(parameter, geometryId);
  const diameter = parameter.nominalDiameterCells;
  return {
    id: ["maturity", parameter.id, geometryId, seed.id, "s01"].join("-"),
    parameterId: parameter.id,
    geometryId,
    seedId: seed.id,
    seedAmplitude: seed.amplitude,
    seedMagnitudeClass: seed.magnitudeClass,
    seedPolarity: seed.polarity,
    strategy: "legacy-zou-he-derived-density",
    nominalDiameterCells: diameter,
    relaxationTime: parameter.relaxationTime,
    upstreamDiameters: contract.maturity.upstreamDiameters,
    downstreamDiameters: geometry.downstreamDiameters,
    nx: Math.round(
      (contract.maturity.upstreamDiameters + geometry.downstreamDiameters)
        * diameter,
    ) + 1,
    ny: geometry.ny,
    bodyCenterX: contract.maturity.upstreamDiameters * diameter,
    bodyCenterY: geometry.bodyCenterY,
    bodyRadius: diameter / 2,
    runSteps: Math.round(
      (contract.maturity.durationTiersConvective.at(-1) ?? 0)
        * diameter / contract.commonNumerics.inletVelocityLattice,
    ),
    sampleStride: Math.round(
      contract.maturity.fieldSampleStrideCellsPerDiameter * diameter,
    ),
  };
}

export function buildFormalMaturityDefinitions(): FormalMaturityDefinition[] {
  const definitions: FormalMaturityDefinition[] = [];
  for (const parameter of FORMAL_MATURITY_PARAMETERS) {
    for (const seed of FORMAL_MATURITY_SEEDS) {
      definitions.push(buildMaturityDefinition(parameter, "base", seed));
    }
  }
  const sensitivityParameter = FORMAL_MATURITY_PARAMETERS.find((parameter) =>
    parameter.id === FORMAL_DISCRETE_REFERENCE_CONTRACT.maturity
      .sensitivityParameterId);
  if (sensitivityParameter === undefined) {
    throw new Error("missing A8P sensitivity parameter");
  }
  for (const geometry of FORMAL_MATURITY_GEOMETRIES) {
    if (geometry.id === "base") continue;
    for (const seedId of FORMAL_DISCRETE_REFERENCE_CONTRACT.maturity
      .sensitivitySeedIds) {
      const seed = FORMAL_MATURITY_SEEDS.find((candidate) =>
        candidate.id === seedId);
      if (seed === undefined) throw new Error("missing A8P sensitivity seed");
      definitions.push(buildMaturityDefinition(
        sensitivityParameter,
        geometry.id,
        seed,
      ));
    }
  }
  return definitions;
}

export type FormalDiscreteReferenceContract =
  typeof FORMAL_DISCRETE_REFERENCE_CONTRACT;
