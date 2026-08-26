/** Frozen before the first A8L inlet-mechanism research matrix run. */
export const FORMAL_INLET_MECHANISM_CONTRACT = Object.freeze({
  format: "VP-A8L-FORMAL-MRT-INLET-MECHANISM-CONTRACT-v1",
  sourceIdentity: Object.freeze({
    formalSource: Object.freeze({
      relativePath: "02_模拟程序/src/solvers/highFidelity/lbm.ts",
      sha256:
        "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
      accessMode:
        "read-only-import-with-candidate-checkpoint-inlet-adapter",
    }),
    planningContract: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/02_正式高保真开放边界重构规划与Codex实施合同.md",
      sha256:
        "b077a4e2efa038fbb20e53dd698acf50ccd03af25f90ec73d4df69be85739d1c",
    }),
  }),
  inheritedEvidence: Object.freeze({
    a8j: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/artifacts/a8-formal-mrt-no-body-ramp-matrix.json",
      sha256:
        "a1615a5c317cc220f8a313d5b22f9db4f38bd18c301080d939c2dde60d9cf9dc",
      decision:
        "NO-GO-A8J-READONLY-FORMAL-MRT-NO-BODY-RAMP-INTERNAL-GATES",
      anchorStrategy: "legacy-zou-he-derived-density",
      anchorCases: 9,
      stableAnchorCases: 0,
    }),
    a8k: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/artifacts/a8-formal-mrt-boundary-factorization-matrix.json.gz",
      storedSha256:
        "df07f32dedbfd9af5c0345ba5ddf2d8e7cd3955dfa15437707c42eb5ecc61ac9",
      canonicalSha256:
        "7fc06fb4568718502a546c7348adb8093605ecc54678c7b2c03fec415ffbd1bc",
      decision:
        "PASS-A8K-FORMAL-MRT-INLET-SIDE-CAUSAL-PROBE-CANDIDATE-ONLY",
      anchorStrategy: "full-regularized-fixed-density",
      anchorCases: 9,
      stableAnchorCases: 9,
    }),
  }),
  matrix: Object.freeze({
    inletVelocityLattice: 0.08,
    relaxationTime: Object.freeze([0.54, 0.56, 0.58]),
    nominalDiameterScaleCells: Object.freeze([8, 12, 16]),
    geometry: Object.freeze([
      Object.freeze({
        nominalDiameterScaleCells: 8,
        nx: 81,
        ny: 37,
        auditSteps: 347,
        rampSteps: 160,
      }),
      Object.freeze({
        nominalDiameterScaleCells: 12,
        nx: 121,
        ny: 56,
        auditSteps: 520,
        rampSteps: 240,
      }),
      Object.freeze({
        nominalDiameterScaleCells: 16,
        nx: 161,
        ny: 75,
        auditSteps: 693,
        rampSteps: 320,
      }),
    ]),
    cornerCount: 9,
    strategyCount: 8,
    runCount: 72,
    rampDurationDiameters: 20,
    rampShape: "half-cosine-zero-slope-endpoints",
    initialField: "uniform-rest",
    body: "none",
    outletBoundary: "formal-zou-he-pressure",
    outerBoundary: "open-periodic-crossflow",
    penalizationTimeStepsUnusedWithoutBody: 1.5,
    maskHalfThicknessCellsUnusedWithoutBody: 0.75,
    geometryIdentity: "A8J-20D-no-body-short-domain",
    executionOrder:
      "diameter-major-relaxation-time-major-strategy-order",
    boundaryAdapter:
      "post-formal-step-checkpoint-left-boundary-only-overwrite",
  }),
  inletDefinition: Object.freeze({
    unknownIncomingDirections: Object.freeze([1, 5, 8]),
    knownDirectionsForDerivedDensity: Object.freeze([0, 2, 3, 4, 6, 7]),
    derivedDensityFormula:
      "(f0+f2+f4+2*(f3+f6+f7))/(1-targetUx)",
    fixedDensity: 1,
    targetTransverseVelocity: 0,
    normalizedDensityMechanism:
      "multiply-all-nine-post-zou-he-populations-by-fixed-density-over-actual-density",
    regularizedStressMechanism:
      "A8K-left-boundary-one-sided-x-periodic-centered-y-gradient-v1",
    regularizedStressParameters: Object.freeze({
      cs2: 1 / 3,
      relaxationTimeSource: "case-relaxation-time",
      spatialStepLattice: 1,
      derivativeStencilX:
        "left-boundary-second-order-one-sided-(-3*q0+4*q1-q2)/2",
      derivativeStencilY: "periodic-centered-(q[y+1]-q[y-1])/2",
      addedTunableParameters: Object.freeze([]),
    }),
  }),
  strategies: Object.freeze([
    Object.freeze({
      ordinal: 1,
      id: "legacy-zou-he-derived-density",
      densityTarget: "zou-he-derived",
      populationCoverage: "three-unknown-incoming",
      closure: "formal-zou-he",
      momentTargetStatus: "exact-prescribed-velocity-derived-density",
    }),
    Object.freeze({
      ordinal: 2,
      id: "legacy-zou-he-density-normalized",
      densityTarget: "fixed-one-by-uniform-normalization",
      populationCoverage: "all-nine-uniform-scale-after-formal-zou-he",
      closure: "formal-zou-he-shape-preserved",
      momentTargetStatus: "exact-fixed-density-velocity-preserved",
    }),
    Object.freeze({
      ordinal: 3,
      id: "incoming-equilibrium-derived-density",
      densityTarget: "zou-he-derived",
      populationCoverage: "three-unknown-incoming",
      closure: "equilibrium",
      momentTargetStatus: "probe-record-residuals-not-exact-prescribed-state",
    }),
    Object.freeze({
      ordinal: 4,
      id: "incoming-regularized-derived-density",
      densityTarget: "zou-he-derived",
      populationCoverage: "three-unknown-incoming",
      closure: "equilibrium-plus-regularized-nonequilibrium-stress",
      momentTargetStatus: "probe-record-residuals-not-exact-prescribed-state",
    }),
    Object.freeze({
      ordinal: 5,
      id: "full-equilibrium-derived-density",
      densityTarget: "zou-he-derived",
      populationCoverage: "all-nine",
      closure: "equilibrium",
      momentTargetStatus: "exact-derived-density-prescribed-velocity",
    }),
    Object.freeze({
      ordinal: 6,
      id: "full-regularized-derived-density",
      densityTarget: "zou-he-derived",
      populationCoverage: "all-nine",
      closure: "equilibrium-plus-regularized-nonequilibrium-stress",
      momentTargetStatus: "exact-derived-density-prescribed-velocity",
    }),
    Object.freeze({
      ordinal: 7,
      id: "full-equilibrium-fixed-density",
      densityTarget: "fixed-one",
      populationCoverage: "all-nine",
      closure: "equilibrium",
      momentTargetStatus: "exact-fixed-density-prescribed-velocity",
    }),
    Object.freeze({
      ordinal: 8,
      id: "full-regularized-fixed-density",
      densityTarget: "fixed-one",
      populationCoverage: "all-nine",
      closure: "equilibrium-plus-regularized-nonequilibrium-stress",
      momentTargetStatus: "exact-fixed-density-prescribed-velocity",
    }),
  ]),
  diagnostics: Object.freeze({
    stability: Object.freeze([
      "completed-status-and-steps",
      "maximum-density-deviation-step-position-and-extremum-kind",
      "maximum-mach-and-step",
      "minimum-and-maximum-density",
    ]),
    boundaryMomentResiduals: Object.freeze([
      "maximum-absolute-density-residual-with-step-row-actual-target",
      "maximum-absolute-ux-residual-with-step-row-actual-target",
      "maximum-absolute-uy-residual-with-step-row-actual-target",
    ]),
    mass: Object.freeze([
      "initial-final-minimum-maximum-total-mass",
      "cumulative-macroscopic-boundary-net-mass-input",
      "mass-change-minus-cumulative-macroscopic-boundary-net-input",
    ]),
    population: Object.freeze([
      "non-finite-state-flag",
      "negative-population-observation-count",
      "maximum-negative-population-count-per-step",
      "minimum-population-with-step-cell-direction",
    ]),
    provenancePerCase: Object.freeze([
      "strategy-id",
      "formal-source-sha256",
      "contract-sha256",
      "a8j-artifact-sha256",
      "a8k-stored-artifact-sha256",
      "a8k-canonical-artifact-sha256",
    ]),
    boundaryFluxDefinition:
      "sum-y(rho*ux)_left-minus-sum-y(rho*ux)_right-after-each-step",
    boundaryFluxInterpretation:
      "recorded-diagnostic-not-an-exact-discrete-population-balance-gate",
  }),
  gates: Object.freeze({
    maximumDensityDeviation: 0.12,
    maximumMach: 0.30,
    requireEveryRunComplete: true,
    requireEveryStrategyAtEveryCorner: true,
    requireA8jBaselineMetricExactMatch: true,
    requireA8kRegularizedFixedMetricExactMatch: true,
    anchorMetricAbsoluteTolerance: 0,
    requireFormalSourceHashExact: true,
    requirePlanningContractHashExact: true,
    requireA8jArtifactHashExact: true,
    requireA8kStoredAndCanonicalArtifactHashExact: true,
    requireContractCommittedBeforeResearchRun: true,
    requireByteIdenticalIndependentRepeat: true,
    negativePopulationDiagnosticsAreGate: false,
    massFluxClosureDiagnosticsAreGate: false,
  }),
  causalRules: Object.freeze({
    comparisonUnit: "frozen-corner-eight-strategy-pass-vector",
    requireSamePassVectorAtAllCornersForResolvedPattern: true,
    densityNormalizationSufficient:
      "strategy-1-fails-all-corners-and-strategy-2-passes-all-corners",
    fixedDensityComparisons: Object.freeze([[5, 7], [6, 8]]),
    populationCoverageComparisons: Object.freeze([[3, 5], [4, 6]]),
    regularizationIncrementComparisons: Object.freeze([[3, 4], [5, 6], [7, 8]]),
    regularizationNotNecessaryWithinFixedDensityFullState:
      "strategy-7-passes-all-corners-and-strategy-8-passes-all-corners",
    regularizationNecessaryWithinFixedDensityFullState:
      "strategy-7-fails-all-corners-and-strategy-8-passes-all-corners",
    unresolvedPatterns: Object.freeze([
      "different-pass-vectors-across-frozen-corners",
      "only-strategy-8-passes",
    ]),
    selectionMethod: "causal-comparisons-not-pass-count-ranking",
  }),
  decision: Object.freeze({
    completedResolvedCode:
      "PASS-A8L-FORMAL-MRT-INLET-MECHANISM-AUDIT-CANDIDATE-ONLY",
    internalGateFailureCode:
      "NO-GO-A8L-FORMAL-MRT-INLET-MECHANISM-INTERNAL-GATES",
    unresolvedCode:
      "NO-GO-A8L-FORMAL-MRT-INLET-MECHANISM-INTERACTION-OR-UNRESOLVED",
    formalSourceModified: false,
    formalIntegrationUnlocked: false,
    algorithmSelectionDelegatedToProReview: true,
    stopAfterEvidenceAndHandoff: true,
    claimUpperBound:
      "Frozen no-body 20D candidate inlet-mechanism causality only; no formal integration, physical accuracy, apparatus prediction, or experimental validation.",
  }),
});

export type FormalInletMechanismContract =
  typeof FORMAL_INLET_MECHANISM_CONTRACT;
