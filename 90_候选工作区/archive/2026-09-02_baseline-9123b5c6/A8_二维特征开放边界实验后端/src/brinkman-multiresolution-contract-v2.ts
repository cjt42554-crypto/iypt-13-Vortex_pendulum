/** Frozen before every A8R v2 result-bearing execution. */
export const BRINKMAN_MULTIRESOLUTION_V2_DIAMETERS = Object.freeze([
  24,
  36,
  54,
] as const);

export const BRINKMAN_MULTIRESOLUTION_V2_MASK_HALF_THICKNESSES =
Object.freeze([
  0.5,
  0.75,
] as const);

export const BRINKMAN_MULTIRESOLUTION_V2_PENALIZATION_TIME = 1 as const;

export const BRINKMAN_MULTIRESOLUTION_V2_PHASES = Object.freeze([
  Object.freeze({
    id: "baseline",
    offsetYCells: 0.17320508075688773,
    role: "baseline-multiresolution",
  }),
  Object.freeze({
    id: "minus-half-cell",
    offsetYCells: -0.32679491924311227,
    role: "d54-lattice-phase-screen",
  }),
] as const);

export type BrinkmanMultiresolutionV2Diameter =
  typeof BRINKMAN_MULTIRESOLUTION_V2_DIAMETERS[number];

export type BrinkmanMultiresolutionV2MaskHalfThickness =
  typeof BRINKMAN_MULTIRESOLUTION_V2_MASK_HALF_THICKNESSES[number];

export type BrinkmanMultiresolutionV2Phase =
  typeof BRINKMAN_MULTIRESOLUTION_V2_PHASES[number];

export interface BrinkmanMultiresolutionV2Definition {
  id: string;
  role: "fresh-baseline-multiresolution" | "fresh-d54-lattice-phase-screen";
  diameterCells: BrinkmanMultiresolutionV2Diameter;
  maskHalfThicknessCells: BrinkmanMultiresolutionV2MaskHalfThickness;
  penalizationTimeSteps: 1;
  phaseId: BrinkmanMultiresolutionV2Phase["id"];
  bodyPhaseOffsetYCells: number;
  phaseOffsetFromBaselineCells: number;
  etaHat: number;
  relaxationTime: number;
  kinematicViscosity: number;
  penaltyLayerCells: number;
  penaltyLayerRelativeDiameter: number;
  maskToPenaltyLayerRatio: number;
  penaltyLayerAtLeastOneCell: boolean;
  nx: number;
  ny: number;
  bodyCenterX: number;
  bodyCenterY: number;
  bodyRadius: number;
  totalSteps: number;
  discardSteps: number;
  analysisSamples: number;
  halfWindowSamples: number;
  diagnosticBlockSamples: number;
}

export const BRINKMAN_MULTIRESOLUTION_V2_CONTRACT = Object.freeze({
  format:
    "VP-A8R-V2-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-AND-FORCE-IDENTITY-CONTRACT-v1",
  stage:
    "VP-A8R-V2-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-AND-FORCE-IDENTITY-v1",
  resultBlind: true,
  frozenAgainstRepositoryCommit:
    "5a85bb9a07b10275686723667c40a6a0b39fe39c",
  sourceIdentity: Object.freeze({
    formalSource: Object.freeze({
      relativePath: "02_模拟程序/src/solvers/highFidelity/lbm.ts",
      sha256:
        "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
      accessMode: "read-only-import",
    }),
    v2ProDecision: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/21_A8R_网页版Pro独立审查与v2合同修订裁决.md",
      sha256:
        "4a8700510b12208b4d5cf48331ef0cc3e86764d759ebf4b34d0505e7925fd8ef",
      commit: "a32294c8d98c2360931dc3378f8f4fc00d10d81a",
      acceptedCode:
        "ACCEPT-A8R-V1-PRO-RAW-DISCRETE-CONTROL-VOLUME-IDENTITY-IN-PRINCIPLE",
      rejectedCode:
        "REJECT-A8R-V1-PRO-STATISTICAL-ROBUSTNESS-CONTRACT-AS-FINAL",
      requiredCode:
        "REQUIRE-A8R-V2-PRO-CYCLE-RESOLVED-AND-LATTICE-PHASE-CONTRACT",
      lockCode: "KEEP-A8R-PRO-RESULT-BEFORE-EXECUTION-LOCKED",
    }),
    supersededResultBlindV1: Object.freeze({
      contractCommit: "eb4d5c41bea6de653491d7fe0d27382c7912985b",
      contractDocument: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/20_A8R_固定惩罚时间多分辨率稳健性与力身份预注册合同.md",
        sha256:
          "92bacf8992a622ab09d8b574c4085be2ea4b7a2120ec898c457f87c663429e37",
      }),
      machineContract: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/src/brinkman-multiresolution-contract.ts",
        sha256:
          "44b2eeb3be274d3cd11c80b1d806655bcf39809bd4b255c8fb5b5b77fa7559c6",
      }),
      status:
        "result-blind-history-superseded-by-v2-before-tests-or-execution",
      testsCreated: false,
      implementationCreated: false,
      resultBearingRunsExecuted: false,
    }),
    frozenA8q: Object.freeze({
      commits: Object.freeze({
        contract: "7cd475f63846d9b45da1f89e6406487cedd73042",
        contractTest: "7335ec55831c76e3a0081c8de7d8b7de18ce6059",
        implementation: "75e71dfc84444ed94ec15a87982efe8e4ac962c3",
        evidence: "0bdd0a57d49bcf56a658c5e2bd498897dbc894c9",
        qualificationClosure:
          "8b242fd2f48bfe006ad13d03ca53516ba654e15f",
      }),
      implementationTreeSha256:
        "61b24913fdd5d02449405413ed6817c4bef8857318f99e18a0147a791c8daa5e",
      contractDocument: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/17_A8Q_Brinkman锐界面缩放路径预注册合同.md",
        sha256:
          "c2d3337145d556e1c477b8a162f1254e5e51911744b69286448804166a7fc757",
      }),
      contract: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/src/brinkman-scaling-contract.ts",
        sha256:
          "791717a265a4a2a67647016ff251c38402ee37a2fcdd4d858bdcbe4aa702b686",
      }),
      contractTest: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/tests/brinkman-scaling-contract.test.ts",
        sha256:
          "f4fb4b5772d240fb560e2014051ff8b35c77621e98f3014b3b5bdf1b2832215e",
      }),
      runs: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/src/brinkman-scaling-runs.ts",
        sha256:
          "7f2c9b96e79a89ced8ae47750c4a976829f9d1c0eb5fc6825e0eab0db8736090",
      }),
      support: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/src/brinkman-scaling-support.ts",
        sha256:
          "437786f204c392876fa6237b98517404ef4767456e7f447a22a84df2320cdd15",
      }),
      qualification: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/src/brinkman-scaling.ts",
        sha256:
          "cbff52c1f90ddf13849cf774d711080ea945ec5e094d6046b600e4e9693b165e",
      }),
      runner: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/scripts/run-brinkman-scaling.mjs",
        sha256:
          "b365d3db04e9dc91a92d89886f05b514c560dc8b9b68129c3979f7f220e0acc3",
      }),
      artifactAsserter: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/scripts/assert-brinkman-scaling-artifact.mjs",
        sha256:
          "9ab231ca2406e4551fba0485d8153f2b62eb1690ab629176a2db51bffab319b8",
      }),
      qualificationReport: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/18_A8Q_Brinkman锐界面缩放路径资格报告.md",
        sha256:
          "d3d694e795315228a52f6c4764dfd064057534c1a65c999fad48a39b2669dced",
      }),
      artifact: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/artifacts/a8-brinkman-sharp-interface-scaling-screen.json.gz",
        storedBytes: 22_058_158,
        canonicalBytes: 100_105_555,
        storedSha256:
          "022cc54704ac542b5c148eed5ce026f5701ae79d50426ec3417073f1148ef451",
        canonicalSha256:
          "16dad4a4d95eb91ad0e6f4e427d0d8ea05c8a349b479233479e03a78c6943082",
      }),
      sidecar: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/artifacts/a8-brinkman-sharp-interface-scaling-screen.sha256",
        sha256:
          "d22ad3b8e1c29e00988c78aad801ee683362ca719178707be3d43873ae456e50",
      }),
      passingPenalizationTimeSteps: 1,
      d24AnchorCaseIds: Object.freeze([
        "a8q-d24-mask-0p50-eta-1p00",
        "a8q-d24-mask-0p75-eta-1p00",
      ]),
      d16HistoricalCaseIds: Object.freeze([
        "a8q-d16-mask-0p50-eta-1p00",
        "a8q-d16-mask-0p75-eta-1p00",
      ]),
      d24RawLiftRmsCrossMaskRelativeDifference:
        0.04995122077720906,
      relativeDifferenceFormula:
        "abs(a-b)/max(abs(a),abs(b),1e-12)",
    }),
  }),
  carrier: Object.freeze({
    reynoldsNumber: 185,
    latticeVelocity: 0.05,
    nominalLatticeMach: 0.05 / (1 / Math.sqrt(3)),
    outerBoundary: "open-periodic-crossflow",
    boundaryCarrier: "S1-legacy-zou-he-derived-density",
    boundaryCarrierRole: "frozen-numerical-carrier-only",
    upstreamDiameters: 14,
    downstreamDiameters: 19.5,
    widthDiameters: 10,
    totalConvectiveTime: 80,
    discardConvectiveTime: 40,
    bodyPhaseOffsetXCells: 0,
    baselineBodyPhaseOffsetYCells: 0.17320508075688773,
    shiftedBodyPhaseOffsetYCells: -0.32679491924311227,
    shiftedPhaseDifferenceCells: -0.5,
    loadIdentity:
      "A2-raw-Brinkman-reaction-plus-fictitious-internal-fluid-momentum-correction",
    spectrumSearch: Object.freeze({
      strouhalMinimum: 0.15,
      strouhalMaximum: 0.24,
      strouhalIncrement: 0.00025,
      role: "A8Q-common-projection-and-diagnostic-only",
    }),
  }),
  matrix: Object.freeze({
    diameters: BRINKMAN_MULTIRESOLUTION_V2_DIAMETERS,
    maskHalfThicknessesCells:
      BRINKMAN_MULTIRESOLUTION_V2_MASK_HALF_THICKNESSES,
    penalizationTimeSteps: BRINKMAN_MULTIRESOLUTION_V2_PENALIZATION_TIME,
    phases: BRINKMAN_MULTIRESOLUTION_V2_PHASES,
    refinementRatio: 1.5,
    baselineUniqueRunCount: 6,
    d54ShiftedPhaseRunCount: 2,
    uniqueRunCount: 8,
    baselineRunRule: "D24-D36-D54-cross-two-masks-at-baseline-phase",
    shiftedRunRule: "D54-cross-two-masks-at-minus-half-cell-phase",
    freshInitialStateRequired: true,
    d24FreshRepeatRequired: true,
    d24CheckpointReuseForbidden: true,
    d16Role: "hash-bound-frozen-historical-anchor-only",
    deterministicOrder:
      "six-baseline-runs-diameter-ascending-mask-ascending-then-two-shifted-D54-runs-mask-ascending",
    earlyCaseRemovalForbidden: true,
    intermediateResultInspectionCannotChangeContract: true,
    previousScalarReuseForbidden: true,
  }),
  windows: Object.freeze({
    sampleAfterEveryAcceptedStep: true,
    analysisSamplesFormula: "40*D/u0 = 800*D",
    fullWindow: "all post-discard samples",
    secondHalf: "last N/2 contiguous samples",
    equalDiagnosticBlockCount: 4,
    equalDiagnosticBlockRule:
      "array-index slices [0,N/4), [N/4,N/2), [N/2,3N/4), [3N/4,N)",
    diagnosticBlocksCannotChangeFinalDecision: true,
    sharedEndpointsForbidden: true,
    missingOrDuplicateSamplesForbidden: true,
    fullHalfAndDiagnosticBlockMetrics: Object.freeze([
      "mean-drag",
      "mean-lift",
      "raw-lift-rms",
      "demeaned-lift-rms",
      "strouhal",
      "normalized-spectral-amplitude",
    ]),
    rawLiftRmsFormula: "sqrt(mean(CL^2))",
    demeanedLiftRmsFormula: "sqrt(mean((CL-mean(CL))^2))",
    cycleResolved: Object.freeze({
      demeanReference: "full-analysis-window-mean-lift",
      demeanedSignalFormula: "z_k=CL_k-mean_full_analysis(CL)",
      crossingPredicate: "z_k<=0 and z_(k+1)>0",
      crossingSlopeRequirement: "z_(k+1)-z_k>0",
      crossingInterpolationFormula:
        "t_cross=t_k-z_k*(t_(k+1)-t_k)/(z_(k+1)-z_k)",
      duplicateCrossingTimesForbidden: true,
      minimumValidPositiveSlopeZeroCrossings: 7,
      retainedLatestCrossings: 7,
      retainedCompleteCycles: 6,
      insufficientCrossingsDecision:
        "INCONCLUSIVE-A8R-V2-STATISTICS-PHASE-MARGIN-OR-FORCE-IDENTITY",
      boundaryInterpolation: "linear",
      integration:
        "piecewise-linear endpoint interpolation and composite-trapezoidal integration over each crossing-to-crossing interval",
      perCycleMetrics: Object.freeze([
        "period-convective-time",
        "strouhal-as-inverse-period",
        "mean-drag",
        "mean-lift",
        "raw-lift-rms",
        "full-analysis-mean-demeaned-lift-rms",
      ]),
      aggregateRule:
        "direct duration-weighted integration over the union of the latest six complete cycles",
      aggregatePeriodRule: "arithmetic-mean-of-six-cycle-periods",
      aggregateStrouhalRule: "inverse-of-aggregate-mean-period",
      retainPerCycleMinimumMaximumAndMedian: true,
      evenMedianRule: "mean-of-third-and-fourth-order-statistics-for-six-values",
      deterministicEnvelopeRule:
        "closed interval from minimum to maximum of six per-cycle values",
      deterministicSpreadIsNotConfidenceInterval: true,
    }),
  }),
  diagnostics: Object.freeze({
    coreMaskMinimumInclusive: 0.99,
    transitionMaskMinimumExclusive: 0.01,
    transitionMaskMaximumExclusive: 0.99,
    slipVelocityNormalization: "lattice-inlet-velocity",
    retainCoreDensityWeightedRms: true,
    retainCorePointwiseMaximum: true,
    retainTransitionDensityWeightedRms: true,
    retainTransitionPointwiseMaximum: true,
    effectiveMaskAreaFormula: "sum(chi) in lattice-cell area",
    equivalentDiameterFormula: "sqrt(4*sum(chi)/pi)",
    relativeGeometryDeviationFormula: "(equivalentDiameter-D)/D",
    penaltyLayerFormula: "sqrt(nu_lu*eta_lu)",
    maskToPenaltyLayerRatioFormula: "w_chi/sqrt(nu_lu*eta_lu)",
    penaltyLayerAtLeastOneCellFormula: "sqrt(nu_lu*eta_lu)>=1",
    retainRawReactionFictitiousCorrectionAndA2Trace: true,
    retainAlgebraicRecompositionAsDataIntegrityOnly: true,
    richardsonExtrapolationForbidden: true,
    gciForbidden: true,
    sharpInterfaceOrderClaimForbidden: true,
  }),
  d24Anchor: Object.freeze({
    phaseId: "baseline",
    verifyStoredCanonicalAndSidecarHashesBeforeImport: true,
    freshRunRequired: true,
    checkpointReuseForbidden: true,
    comparison:
      "deep field and array equality after canonical JSON round-trip",
    numericTolerance: 0,
    commonProjection: Object.freeze([
      "numericalIdentity",
      "body",
      "geometry",
      "window",
      "completedSteps",
      "trace.step",
      "trace.convectiveTime",
      "trace.rawReaction",
      "trace.fictitiousFluidCorrection",
      "trace.correctedLoad",
      "trace.core-and-transition-slip",
      "extrema",
      "forceDecomposition",
      "slip",
      "metrics",
      "maturity",
      "literature",
      "recomposition",
      "A8Q-gates",
    ]),
    excludeA8rV2OnlyCyclePhaseAndForceDiagnosticsFromComparison: true,
    mismatchDecision:
      "INCONCLUSIVE-A8R-V2-STATISTICS-PHASE-MARGIN-OR-FORCE-IDENTITY",
  }),
  forceIdentity: Object.freeze({
    identity: "closed-interior-D2Q9-link-control-volume-v2",
    controlVolume: Object.freeze({
      halfExtentXDiameters: 3,
      halfExtentYDiameters: 3,
      nodeMembership: "abs(x-xc)<=3D and abs(y-yc)<=3D",
      directPredicateRequired: true,
      resultDependentIntegerBoundaryAdjustmentForbidden: true,
      requireControlVolumeAndOneLinkHaloInsideGlobalBoundaries: true,
      requireNoPeriodicSeamCrossingByControlVolumeOrOneLinkHalo: true,
      requireControlSurfaceAndOneLinkHaloMaximumMaskExactlyZero: true,
      requireEveryNonzeroMaskCellInsideControlVolume: true,
      requireEveryNonzeroBrinkmanForceCellInsideControlVolume: true,
    }),
    populationAccess: Object.freeze({
      source: "read-only-runtime-distributions-view",
      requireElementwiseCheckpointEqualityInNoResultTests: true,
      formalSolverAdvancedOnlyByPublicStep: true,
      writeToFormalPrivateArraysForbidden: true,
      copyOrReplaceFormalCollisionForbidden: true,
    }),
    independentMacroscopicReconstruction: Object.freeze({
      densityFormula: "rho=sum_i(f_i)",
      populationVelocityFormula: "u_raw=sum_i(c_i*f_i)/rho",
      formalVelocityFormula:
        "u=(u_raw+0.5*(chi/eta_lu)*u_s)/(1+0.5*chi/eta_lu)",
      brinkmanForceFormula: "F_B=rho*(chi/eta_lu)*(u_s-u)",
      maskFormulaMustMatchFrozenAnalyticBodyIndicator: true,
    }),
    summation: Object.freeze({
      algorithm: "Neumaier-compensated",
      populationOrder:
        "y-ascending-x-ascending-D2Q9-direction-0-through-8",
      linkOrder:
        "origin-y-ascending-origin-x-ascending-D2Q9-direction-0-through-8",
      cellOrder: "y-ascending-x-ascending",
    }),
    independentRawPopulationMomentumIdentity: Object.freeze({
      populationMomentumFormula: "sum_over_Omega_i(c_i*f_i)",
      outwardLinkMomentumFormula:
        "post-step outgoing destination-link momentum minus post-step incoming destination-link momentum",
      rawReactionFormula: "-(P_Omega_post-P_Omega_pre+Phi_outward)",
      constructionUsesPopulationAndFixedControlVolumeOnly: true,
      rawForceConstructionFromRecomputedBrinkmanForceForbidden: true,
      forbiddenConstructionInputs: Object.freeze([
        "formal-forceX-array",
        "formal-forceY-array",
        "penaltyReaction-return-value",
        "BrinkmanStepExchange.bodyForceImpulseX",
        "BrinkmanStepExchange.bodyForceImpulseY",
        "BrinkmanStepExchange.rawReactionImpulseX",
        "BrinkmanStepExchange.rawReactionImpulseY",
      ]),
      comparisonTarget:
        "formal-BrinkmanStepExchange-rawReactionImpulse-after-independent-construction",
      compareEveryAcceptedAnalysisStep: true,
      fullWindowAveragingCannotHideStepFailure: true,
      conclusionUpperBound:
        "independent-formal-raw-Brinkman-reaction-discrete-identity-only",
    }),
    independentA2FormulaRecomputation: Object.freeze({
      fictitiousCorrectionFormula:
        "sum_all_cells(chi*(rho_post*u_post-rho_pre*u_pre))",
      correctedLoadFormula:
        "independent-CV-raw-reaction+independent-fictitious-correction",
      requireIndependentPopulationMacroscopicReconstruction: true,
      requireIndependentFictitiousCorrectionComparison: true,
      requireIndependentCorrectedA2Comparison: true,
      compareEveryAcceptedAnalysisStep: true,
      rawIdentityFailureCannotBeCancelledByA2Correction: true,
      conclusionUpperBound:
        "A2-formula-implementation-recomputation-only-not-a-second-physical-force-method",
    }),
    absoluteRoundoffLedger: Object.freeze({
      multiplier: 4096,
      coefficientScale: "q_D=0.5*u0^2*D",
      rawLedgerTermsPerComponent: Object.freeze([
        "every-abs(c_i_component*f_i_pre)-term-inside-control-volume",
        "every-abs(c_i_component*f_i_post)-term-inside-control-volume",
        "every-abs(c_i_component*f_i_post_destination)-crossing-link-term",
        "every-abs(F_B_component)-term-over-all-global-cells",
      ]),
      a2AdditionalLedgerTermsPerComponent: Object.freeze([
        "every-abs(chi*rho_pre*u_pre_component)-term-over-all-global-cells",
        "every-abs(chi*rho_post*u_post_component)-term-over-all-global-cells",
      ]),
      rawBoundFormula:
        "4096*eps*max(raw-absolute-ledger-sum/q_D,eps)",
      a2BoundFormula:
        "4096*eps*max((raw-absolute-ledger-sum+A2-additional-ledger-sum)/q_D,eps)",
      retainEveryNamedPartialSumForXAndY: true,
      aggregateAbsoluteValueSubstitutionForbidden: true,
      requireRawResidualWithinRawBound: true,
      requireFictitiousCorrectionResidualWithinA2Bound: true,
      requireCorrectedA2ResidualWithinA2Bound: true,
    }),
    formalComparisonAccessOnlyAfterIndependentConstruction: true,
    retainFullSecondHalfDiagnosticBlocksAndCycleStatisticsForBothPaths: true,
    noResultTestsRequiredBeforeResearch: Object.freeze({
      syntheticPopulationFields: true,
      forcedFormalSolverSmoke: Object.freeze({
        diameterCells: 24,
        maskHalfThicknessCells: 0.75,
        phaseId: "baseline",
        acceptedSteps: 40,
        body: "fixed-cylinder",
        outputCannotEnterResearchArtifact: true,
      }),
      unforcedFormalSolverSmoke: Object.freeze({
        diameterCells: 24,
        maskHalfThicknessCells: 0.75,
        phaseId: "baseline",
        acceptedSteps: 40,
        body: "null",
        outputCannotEnterResearchArtifact: true,
      }),
      maximumSmokeStepsInclusive: 40,
    }),
    claimUpperBound:
      "Raw population momentum identity and A2 formula recomputation only; not continuum stress integration, sharp-interface force truth, load qualification, apparatus prediction, or experimental validation.",
  }),
  gates: Object.freeze({
    maximumDensityDeviation: 0.08,
    maximumMach: 0.30,
    maturity: Object.freeze({
      minimumRawLiftRms: 1e-3,
      maximumMeanDragHalfDrift: 0.05,
      maximumRawLiftRmsHalfDrift: 0.10,
      diagnosticBlocksCannotChangeMaturityOrFinalDecision: true,
      requireAtLeastSevenPositiveSlopeZeroCrossings: true,
    }),
    evidence: Object.freeze({
      requireExactlyEightUniqueRuns: true,
      requireAllRunsCompleteAndFinite: true,
      requireFrozenSourceHashes: true,
      requireD24BaselineExactA8qCommonProjection: true,
      requireCompleteFullSecondHalfAndFourDiagnosticBlockCoverage: true,
      requireCompleteLatestSixCycleCoverage: true,
      requireIndependentFullRepeatByteIdentity: true,
      invalidEvidenceCannotBecomePhysicalNoGo: true,
    }),
    force: Object.freeze({
      requireA2AlgebraicRecompositionOnEveryAnalysisStep: true,
      algebraicRecompositionRole: "data-integrity-only",
      requireIndependentRawPopulationMomentumIdentityOnEveryStep: true,
      requireIndependentA2FormulaRecomputationOnEveryStep: true,
      identitiesAreSeparateAndNonSubstitutable: true,
      fullWindowAverageCannotHideStepFailure: true,
      failureDecision:
        "INCONCLUSIVE-A8R-V2-STATISTICS-PHASE-MARGIN-OR-FORCE-IDENTITY",
    }),
    coreSlip: Object.freeze({
      appliesToBaselineSixRuns: true,
      metric: "full-window-core-density-weighted-rms",
      requireD24NotBelowD36: true,
      requireD36NotBelowD54: true,
      rule: "S24>=S36>=S54 for each mask",
    }),
    cycleResolvedTrend: Object.freeze({
      metrics: Object.freeze([
        "six-cycle-aggregate-mean-drag",
        "six-cycle-aggregate-full-analysis-mean-demeaned-lift-rms",
      ]),
      appliesSeparatelyToEachMaskAtBaselinePhase: true,
      resolutionEnvelope:
        "[minimum-per-cycle-value,maximum-per-cycle-value]",
      firstIncrementInterval:
        "[L36-U24,U36-L24] from Minkowski difference I36-I24",
      secondIncrementInterval:
        "[L54-U36,U54-L36] from Minkowski difference I54-I36",
      absoluteLowerBound:
        "min(abs(lower),abs(upper)) for an interval strictly excluding zero",
      absoluteUpperBound: "max(abs(lower),abs(upper))",
      resolvedPassRule:
        "both increment intervals strictly on the same side of zero and fine absolute upper bound < coarse absolute lower bound",
      resolvedNoGoRules: Object.freeze([
        "increment intervals strictly on opposite sides of zero",
        "fine absolute lower bound >= coarse absolute upper bound when both intervals exclude zero",
      ]),
      unresolvedRule:
        "all remaining zero-containing or envelope-overlap cases",
      exactPlatformClassification: "UNRESOLVED-INCONCLUSIVE",
      exactPlatformCannotBeNoGo: true,
      stateCodes: Object.freeze({
        pass: "RESOLVED-PASS",
        inconclusive: "UNRESOLVED-INCONCLUSIVE",
        noGo: "RESOLVED-NO-GO",
      }),
      requiredContractTestClasses: Object.freeze([
        "same-direction-shrinking",
        "opposite-direction",
        "resolved-nonshrinking",
        "unresolved-overlap",
        "exact-platform",
      ]),
    }),
    d54MaskPhaseMargin: Object.freeze({
      phases: Object.freeze(["baseline", "minus-half-cell"]),
      masks: BRINKMAN_MULTIRESOLUTION_V2_MASK_HALF_THICKNESSES,
      comparisonMetrics: Object.freeze([
        "six-cycle-aggregate-raw-lift-rms",
        "six-cycle-aggregate-full-analysis-mean-demeaned-lift-rms",
      ]),
      recordedDiagnostics: Object.freeze([
        "cross-mask-difference-within-each-phase",
        "cross-phase-difference-within-each-mask",
        "all-six-unordered-pair-differences-among-four-D54-combinations",
        "mean-drag",
        "mean-lift",
        "mean-period",
        "strouhal",
      ]),
      relativeDifferenceFormula:
        "abs(a-b)/max(abs(a),abs(b),1e-12)",
      frozenA8qRawLiftRmsRelativeDifference:
        0.04995122077720906,
      requireBaselineAggregateRawAndDemeanedStrictlyBelowFrozenA8q: true,
      maximumAggregateCrossMaskDifferenceEachPhase: 0.05,
      maximumAggregateCrossPhaseDifferenceEachMask: 0.05,
      aggregateThresholdIsStrict: true,
      cycleCartesianComparison:
        "all-36-pairs-from-six-cycle-values-for-each-trace-pair",
      maximumWorstCycleResolvedDifferenceAcrossFourCombinations: 0.05,
      cycleThresholdIsStrict: true,
      independentlySelectedCyclesForbidden: true,
      failureDecision:
        "INCONCLUSIVE-A8R-V2-STATISTICS-PHASE-MARGIN-OR-FORCE-IDENTITY",
    }),
  }),
  literatureProximityScreen: Object.freeze({
    fixedTarget: Object.freeze({
      meanDrag: 1.287,
      liftRms: 0.443,
      strouhal: 0.195,
      absoluteTolerances: Object.freeze({
        meanDrag: 0.05,
        liftRms: 0.04,
        strouhal: 0.005,
      }),
    }),
    evaluateAllFourD54MaskPhaseCombinations: true,
    observationOnly: true,
    cannotChangeA8rV2Decision: true,
    cannotSelectMaskPhaseOrResolution: true,
    loadQualificationClaimForbidden: true,
    physicalValidationClaimForbidden: true,
  }),
  artifact: Object.freeze({
    format:
      "VP-A8R-V2-CYCLE-RESOLVED-MULTIRESOLUTION-MASK-PHASE-FORCE-IDENTITY-ARTIFACT-v1",
    relativePath:
      "验证与复现/artifacts/a8-brinkman-cycle-resolved-multiresolution-phase-force-identity.json.gz",
    sidecarRelativePath:
      "验证与复现/artifacts/a8-brinkman-cycle-resolved-multiresolution-phase-force-identity.sha256",
    deterministicCaseOrder: true,
    timestampFieldsForbidden: true,
    nonFiniteJsonValuesForbidden: true,
    gzipLevel: 9,
    gzipMtime: 0,
    independentFullRepeatRequired: true,
  }),
  workflow: Object.freeze({
    contractAndMachineContractSameIndependentCommit: true,
    contractTestsRequireLaterIndependentProAcceptance: true,
    contractTestsSeparateCommit: true,
    noResultImplementationSeparateCommit: true,
    pushEachCommitToRemoteMainBeforeFirstResearchRun: true,
    requireCleanWorktreeAndVerifiedCommitAncestry: true,
    currentTurnStopsAfterContractFreezeForIndependentReview: true,
    currentTurnCreatesContractTests: false,
    currentTurnCreatesNoResultImplementation: false,
    currentTurnRunsResearchMatrix: false,
    smokeTestsRunOnlyAfterLaterImplementationAuthorization: true,
    smokeOutputCannotEnterResearchArtifactOrChangeGates: true,
  }),
  decision: Object.freeze({
    passCode:
      "PASS-A8R-V2-DISCRETE-MULTIRESOLUTION-MASK-PHASE-CANDIDATE-ONLY",
    inconclusiveCode:
      "INCONCLUSIVE-A8R-V2-STATISTICS-PHASE-MARGIN-OR-FORCE-IDENTITY",
    noGoCode:
      "NO-GO-A8R-V2-RESOLVED-BRINKMAN-DISCRETE-ROUTE",
    precedence: Object.freeze([
      "incomplete-source-case-D24-anchor-repeat-cycle-coverage-or-force-identity-evidence-is-INCONCLUSIVE",
      "unresolved-cycle-trend-or-mask-phase-margin-is-INCONCLUSIVE",
      "with-complete-and-resolved-evidence-stability-maturity-core-slip-or-resolved-trend-route-failure-is-NO-GO",
      "PASS-requires-source-stability-maturity-cycle-trend-two-masks-two-phases-and-both-force-identities",
    ]),
    literatureProximityRecordedSeparately: true,
    passReturnsToIndependentProOnly: true,
    formalSourceModified: false,
    formalIntegrationUnlocked: false,
    prescribedMotionUnlocked: false,
    weakFsiUnlocked: false,
    s1PhysicallySelected: false,
    s9Selected: false,
    newBoundaryStrategyCreated: false,
    claimUpperBound:
      "Candidate-only fixed-eta-lu cycle-resolved three-resolution, two-mask, D54 two-phase discrete assessment with raw population identity and A2 formula recomputation; not resolved penalization layer, sharp-interface convergence, load qualification, formal integration, prescribed motion, FSI, apparatus prediction, or experimental validation.",
  }),
  forbidden: Object.freeze([
    "create-v1-or-v2-contract-tests-before-independent-Pro-acceptance",
    "create-A8R-no-result-implementation-runner-or-asserter-before-independent-Pro-acceptance",
    "run-any-A8R-D24-D36-D54-or-lattice-phase-research-trajectory",
    "modify-formal-theory-or-program",
    "modify-A8Q-scientific-source-artifact-report-or-gates",
    "replace-A8Q-machine-anchor-with-manually-copied-scalars",
    "change-matrix-mask-phase-cycle-window-control-volume-tolerance-or-decision-after-results",
    "write-Richardson-extrapolation-GCI-sharp-interface-or-load-qualification",
    "select-parameters-by-literature-closeness",
    "create-S10-integrate-S9-or-change-open-boundary",
    "run-prescribed-motion-weak-FSI-3D-free-surface-apparatus-or-experiment",
  ]),
});

function numberId(value: number, digits: number): string {
  return value.toFixed(digits).replace("-", "m").replace(".", "p");
}

function buildDefinition(
  diameterCells: BrinkmanMultiresolutionV2Diameter,
  maskHalfThicknessCells: BrinkmanMultiresolutionV2MaskHalfThickness,
  phase: BrinkmanMultiresolutionV2Phase,
): BrinkmanMultiresolutionV2Definition {
  const carrier = BRINKMAN_MULTIRESOLUTION_V2_CONTRACT.carrier;
  const penalizationTimeSteps = BRINKMAN_MULTIRESOLUTION_V2_PENALIZATION_TIME;
  const kinematicViscosity = carrier.latticeVelocity
    * diameterCells / carrier.reynoldsNumber;
  const relaxationTime = 0.5 + 3 * kinematicViscosity;
  const etaHat = penalizationTimeSteps
    * carrier.latticeVelocity / diameterCells;
  const penaltyLayerCells = Math.sqrt(
    kinematicViscosity * penalizationTimeSteps,
  );
  const nx = Math.round(
    (carrier.upstreamDiameters + carrier.downstreamDiameters)
      * diameterCells,
  );
  const ny = Math.round(carrier.widthDiameters * diameterCells);
  const totalSteps = Math.round(
    carrier.totalConvectiveTime
      * diameterCells / carrier.latticeVelocity,
  );
  const discardSteps = Math.round(
    carrier.discardConvectiveTime
      * diameterCells / carrier.latticeVelocity,
  );
  const analysisSamples = totalSteps - discardSteps;
  return {
    id: [
      "a8r-v2",
      `d${diameterCells}`,
      `mask-${numberId(maskHalfThicknessCells, 2)}`,
      `phase-${phase.id}`,
      `eta-${numberId(penalizationTimeSteps, 2)}`,
    ].join("-"),
    role: phase.id === "baseline"
      ? "fresh-baseline-multiresolution"
      : "fresh-d54-lattice-phase-screen",
    diameterCells,
    maskHalfThicknessCells,
    penalizationTimeSteps,
    phaseId: phase.id,
    bodyPhaseOffsetYCells: phase.offsetYCells,
    phaseOffsetFromBaselineCells:
      phase.offsetYCells - carrier.baselineBodyPhaseOffsetYCells,
    etaHat,
    relaxationTime,
    kinematicViscosity,
    penaltyLayerCells,
    penaltyLayerRelativeDiameter: penaltyLayerCells / diameterCells,
    maskToPenaltyLayerRatio:
      maskHalfThicknessCells / penaltyLayerCells,
    penaltyLayerAtLeastOneCell: penaltyLayerCells >= 1,
    nx,
    ny,
    bodyCenterX: carrier.upstreamDiameters * diameterCells,
    bodyCenterY: 0.5 * (ny - 1) + phase.offsetYCells,
    bodyRadius: 0.5 * diameterCells,
    totalSteps,
    discardSteps,
    analysisSamples,
    halfWindowSamples: analysisSamples / 2,
    diagnosticBlockSamples: analysisSamples / 4,
  };
}

export function buildBrinkmanMultiresolutionV2Definitions():
BrinkmanMultiresolutionV2Definition[] {
  const definitions: BrinkmanMultiresolutionV2Definition[] = [];
  const baseline = BRINKMAN_MULTIRESOLUTION_V2_PHASES[0];
  for (const diameterCells of BRINKMAN_MULTIRESOLUTION_V2_DIAMETERS) {
    for (const maskHalfThicknessCells of
      BRINKMAN_MULTIRESOLUTION_V2_MASK_HALF_THICKNESSES) {
      definitions.push(buildDefinition(
        diameterCells,
        maskHalfThicknessCells,
        baseline,
      ));
    }
  }
  const shifted = BRINKMAN_MULTIRESOLUTION_V2_PHASES[1];
  for (const maskHalfThicknessCells of
    BRINKMAN_MULTIRESOLUTION_V2_MASK_HALF_THICKNESSES) {
    definitions.push(buildDefinition(
      54,
      maskHalfThicknessCells,
      shifted,
    ));
  }
  return definitions;
}

export type BrinkmanMultiresolutionV2Contract =
  typeof BRINKMAN_MULTIRESOLUTION_V2_CONTRACT;
