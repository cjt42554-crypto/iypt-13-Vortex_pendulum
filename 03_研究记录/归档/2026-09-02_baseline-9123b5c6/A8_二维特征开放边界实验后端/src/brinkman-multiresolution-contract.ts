/** Frozen before the first A8R result-bearing execution. */
export const BRINKMAN_MULTIRESOLUTION_DIAMETERS = Object.freeze([
  24,
  36,
  54,
] as const);

export const BRINKMAN_MULTIRESOLUTION_MASK_HALF_THICKNESSES = Object.freeze([
  0.5,
  0.75,
] as const);

export const BRINKMAN_MULTIRESOLUTION_PENALIZATION_TIME = 1 as const;

export type BrinkmanMultiresolutionDiameter =
  typeof BRINKMAN_MULTIRESOLUTION_DIAMETERS[number];

export type BrinkmanMultiresolutionMaskHalfThickness =
  typeof BRINKMAN_MULTIRESOLUTION_MASK_HALF_THICKNESSES[number];

export interface BrinkmanMultiresolutionDefinition {
  id: string;
  role: "fresh-main-multiresolution";
  diameterCells: BrinkmanMultiresolutionDiameter;
  maskHalfThicknessCells: BrinkmanMultiresolutionMaskHalfThickness;
  penalizationTimeSteps: 1;
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
  blockSamples: number;
}

export const BRINKMAN_MULTIRESOLUTION_CONTRACT = Object.freeze({
  format:
    "VP-A8R-FIXED-ETA-LU-MULTIRESOLUTION-ROBUSTNESS-AND-FORCE-IDENTITY-CONTRACT-v1",
  stage:
    "VP-A8R-FIXED-ETA-LU-MULTIRESOLUTION-ROBUSTNESS-AND-FORCE-IDENTITY-v1",
  frozenAgainstRepositoryCommit:
    "a20ec3fd35f4fe9a19854ae3bb38e09156815820",
  sourceIdentity: Object.freeze({
    formalSource: Object.freeze({
      relativePath: "02_模拟程序/src/solvers/highFidelity/lbm.ts",
      sha256:
        "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
      accessMode: "read-only-import",
    }),
    proDecision: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/19_A8Q_网页版Pro独立审查与A8R路线裁决.md",
      sha256:
        "44c5db2aef66fb77d88c58d328c86b4007628e0090319422157b275f756af0e4",
      routeCode: "UNLOCK-A8R-PRO-RESULT-BEFORE-CONTRACT-ONLY",
      evidenceCode: "ACCEPT-A8Q-PRO-EVIDENCE-CHAIN-CANDIDATE-ONLY",
      machineCode: "CONFIRM-A8Q-PRO-FROZEN-MACHINE-PASS",
      rejectionCode: "REJECT-A8Q-PRO-SHARP-INTERFACE-OR-FORCE-VALIDATION",
      commit: "be4f5c1d91bc481bb1050bc71bab83eb68982ce7",
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
    bodyPhaseOffsetYCells: 0.17320508075688773,
    loadIdentity:
      "A2-raw-Brinkman-reaction-plus-fictitious-internal-fluid-momentum-correction",
    spectrumSearch: Object.freeze({
      strouhalMinimum: 0.15,
      strouhalMaximum: 0.24,
      strouhalIncrement: 0.00025,
    }),
  }),
  matrix: Object.freeze({
    diameters: BRINKMAN_MULTIRESOLUTION_DIAMETERS,
    maskHalfThicknessesCells:
      BRINKMAN_MULTIRESOLUTION_MASK_HALF_THICKNESSES,
    penalizationTimeSteps: BRINKMAN_MULTIRESOLUTION_PENALIZATION_TIME,
    refinementRatio: 1.5,
    uniqueRunCount: 6,
    freshInitialStateRequired: true,
    d24FreshRepeatRequired: true,
    d24CheckpointReuseForbidden: true,
    d16Role: "hash-bound-frozen-historical-anchor-only",
    deterministicOrder: "diameter-ascending-then-mask-ascending",
    earlyCaseRemovalForbidden: true,
    intermediateResultInspectionCannotChangeContract: true,
    previousScalarReuseForbidden: true,
  }),
  windows: Object.freeze({
    sampleAfterEveryAcceptedStep: true,
    analysisSamplesFormula: "40*D/u0 = 800*D",
    fullWindow: "all post-discard samples",
    secondHalf: "last N/2 contiguous samples",
    equalBlockCount: 4,
    equalBlockRule:
      "array-index slices [0,N/4), [N/4,N/2), [N/2,3N/4), [3N/4,N)",
    sharedEndpointsForbidden: true,
    missingOrDuplicateSamplesForbidden: true,
    metrics: Object.freeze([
      "mean-drag",
      "mean-lift",
      "raw-lift-rms",
      "demeaned-lift-rms",
      "strouhal",
      "normalized-spectral-amplitude",
    ]),
    rawLiftRmsFormula: "sqrt(mean(CL^2))",
    demeanedLiftRmsFormula: "sqrt(mean((CL-mean(CL))^2))",
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
    observedOrder: Object.freeze({
      formula: "log(abs(Q36-Q24)/abs(Q54-Q36))/log(1.5)",
      diagnosticOnly: true,
      requireBothIncrementsNonzeroAndDirectionCompatible: true,
      richardsonExtrapolationForbidden: true,
      gciForbidden: true,
      sharpInterfaceOrderClaimForbidden: true,
    }),
  }),
  d24Anchor: Object.freeze({
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
    excludeA8rOnlyDiagnosticsFromComparison: true,
    mismatchDecision:
      "INCONCLUSIVE-A8R-MASK-MARGIN-OR-FORCE-IDENTITY",
  }),
  independentForceIdentity: Object.freeze({
    identity: "closed-interior-D2Q9-link-control-volume-v1",
    controlVolume: Object.freeze({
      halfExtentXDiameters: 3,
      halfExtentYDiameters: 3,
      nodeMembership: "abs(x-xc)<=3D and abs(y-yc)<=3D",
      directPredicateRequired: true,
      resultDependentIntegerBoundaryAdjustmentForbidden: true,
      requireControlVolumeAndOneLinkHaloInsideGlobalBoundaries: true,
      requireControlSurfaceAndOneLinkHaloMaximumMaskExactlyZero: true,
    }),
    populationAccess: Object.freeze({
      source: "read-only-runtime-distributions-view",
      requireElementwiseCheckpointEqualityInNoResultTests: true,
      formalSolverAdvancedOnlyByPublicStep: true,
      writeToFormalPrivateArraysForbidden: true,
      copyOrReplaceFormalCollisionForbidden: true,
    }),
    summation: Object.freeze({
      algorithm: "Neumaier-compensated",
      order: "y-ascending-x-ascending-D2Q9-direction-0-through-8",
    }),
    populationMomentumFormula: "sum_over_Omega_i(c_i*f_i)",
    outwardLinkMomentumFormula:
      "post-step outgoing link momentum minus post-step incoming link momentum",
    rawReactionFormula: "-(P_Omega_post-P_Omega_pre+Phi_outward)",
    fictitiousCorrectionFormula:
      "sum_all_cells(chi*(rho_post*u_post-rho_pre*u_pre))",
    correctedLoadFormula: "CV-raw-reaction+independent-fictitious-correction",
    coefficientScale: "0.5*u0^2*D",
    forbiddenConstructionInputs: Object.freeze([
      "formal-forceX-array",
      "formal-forceY-array",
      "penaltyReaction-return-value",
      "BrinkmanStepExchange.rawReactionImpulseX",
      "BrinkmanStepExchange.rawReactionImpulseY",
    ]),
    comparisonOnlyAfterIndependentConstruction: true,
    compareEveryAcceptedAnalysisStep: true,
    fullWindowAveragingCannotHideStepFailure: true,
    roundoffTolerance: Object.freeze({
      multiplier: 4096,
      formula:
        "4096*eps*max(absolute-ledger-contribution-sum/coefficient-scale,eps)",
      absoluteLedgerContributionSumIncludes: Object.freeze([
        "pre-control-volume-population-momentum",
        "post-control-volume-population-momentum",
        "all-incoming-and-outgoing-link-momentum",
        "formal-raw-reaction",
        "fictitious-internal-fluid-momentum-correction",
      ]),
      requireRawReactionComponentsWithinBound: true,
      requireCorrectedA2ComponentsWithinBound: true,
    }),
    retainFullSecondHalfAndFourBlockStatisticsForBothPaths: true,
    claimUpperBound:
      "Independent discrete population control-volume identity only; not continuum stress integration, sharp-interface force truth, apparatus prediction, or experimental validation.",
  }),
  gates: Object.freeze({
    maximumDensityDeviation: 0.08,
    maximumMach: 0.30,
    maturity: Object.freeze({
      minimumRawLiftRms: 1e-3,
      maximumMeanDragHalfDrift: 0.05,
      maximumRawLiftRmsHalfDrift: 0.10,
    }),
    evidence: Object.freeze({
      requireExactlySixUniqueRuns: true,
      requireAllRunsCompleteAndFinite: true,
      requireFrozenSourceHashes: true,
      requireD24ExactA8qCommonProjection: true,
      requireCompleteFullSecondHalfAndFourBlockCoverage: true,
      requireIndependentFullRepeatByteIdentity: true,
      invalidEvidenceCannotBecomePhysicalNoGo: true,
    }),
    force: Object.freeze({
      requireA2AlgebraicRecompositionOnEveryAnalysisStep: true,
      algebraicRecompositionRole: "data-integrity-only",
      requireIndependentRawAndCorrectedControlVolumeIdentityOnEveryStep: true,
      fullWindowAverageCannotHideStepFailure: true,
    }),
    coreSlip: Object.freeze({
      metric: "full-window-core-density-weighted-rms",
      requireD24NotBelowD36: true,
      requireD36NotBelowD54: true,
      rule: "S24>=S36>=S54 for each mask",
    }),
    adjacentIncrements: Object.freeze({
      metrics: Object.freeze(["mean-drag", "demeaned-lift-rms"]),
      applySeparatelyToEachMask: true,
      firstIncrement: "Q36-Q24",
      secondIncrement: "Q54-Q36",
      requireProductNonnegative: true,
      requireSecondAbsoluteIncrementStrictlySmaller: true,
      postResultNearPlatformToleranceForbidden: true,
    }),
    crossMask: Object.freeze({
      metrics: Object.freeze(["mean-drag", "demeaned-lift-rms"]),
      relativeDifferenceFormula:
        "abs(a-b)/max(abs(a),abs(b),1e-12)",
      requireNonincreaseFromD24ToD36ToD54: true,
    }),
    d54MaskMargin: Object.freeze({
      frozenA8qRawLiftRmsRelativeDifference:
        0.04995122077720906,
      requireFullRawLiftRmsStrictlyBelowFrozenA8q: true,
      requireFullDemeanedLiftRmsStrictlyBelowFrozenA8q: true,
      maximumWorstAlignedBlockRawLiftRmsRelativeDifference: 0.05,
      maximumWorstAlignedBlockDemeanedLiftRmsRelativeDifference: 0.05,
      blockThresholdIsStrict: true,
      independentlySelectedBlocksForbidden: true,
      failureDecision:
        "INCONCLUSIVE-A8R-MASK-MARGIN-OR-FORCE-IDENTITY",
    }),
  }),
  literatureObservation: Object.freeze({
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
    externalQualificationRequiresBothD54Masks: true,
    requireMeanDragRawLiftRmsDemeanedLiftRmsAndStrouhal: true,
    requireIndependentForceIdentity: true,
    selectionByLiteratureClosenessForbidden: true,
    externalQualificationIsNotRequiredForDiscreteRobustnessPass: true,
    failedExternalGateMustRemainExplicitAfterDiscretePass: true,
  }),
  artifact: Object.freeze({
    deterministicCaseOrder: true,
    timestampFieldsForbidden: true,
    nonFiniteJsonValuesForbidden: true,
    gzipLevel: 9,
    gzipMtime: 0,
    exactArtifactPathMustBeFrozenBeforeResearch: true,
    exactSidecarFormatMustBeFrozenBeforeResearch: true,
    independentFullRepeatRequired: true,
  }),
  workflow: Object.freeze({
    contractAndMachineContractSameCommit: true,
    contractTestsSeparateCommit: true,
    noResultImplementationSeparateCommit: true,
    pushEachCommitToRemoteMainBeforeFirstResearchRun: true,
    requireCleanWorktreeAndVerifiedCommitAncestry: true,
    currentTurnStopsAfterContractFreezeForIndependentReview: true,
    currentTurnCreatesContractTests: false,
    currentTurnCreatesNoResultImplementation: false,
    currentTurnRunsResearchMatrix: false,
    maximumNonResearchSmokeStepsAfterImplementation: 40,
    smokeOutputCannotEnterResearchArtifactOrChangeGates: true,
  }),
  decision: Object.freeze({
    passCode:
      "PASS-A8R-DISCRETE-MULTIRESOLUTION-ROBUSTNESS-CANDIDATE-ONLY",
    inconclusiveCode:
      "INCONCLUSIVE-A8R-MASK-MARGIN-OR-FORCE-IDENTITY",
    noGoCode: "NO-GO-A8R-BRINKMAN-DISCRETE-ROUTE",
    precedence: Object.freeze([
      "incomplete-or-invalid-evidence-is-INCONCLUSIVE-not-physical-NO-GO",
      "with-complete-evidence-stability-maturity-slip-increment-or-cross-mask-route-failure-is-NO-GO",
      "otherwise-mask-margin-or-independent-force-identity-failure-is-INCONCLUSIVE",
      "PASS-requires-evidence-stability-maturity-slip-increment-cross-mask-margin-and-force-identity",
    ]),
    externalLiteratureQualificationRecordedSeparately: true,
    passReturnsToIndependentProOnly: true,
    formalSourceModified: false,
    formalIntegrationUnlocked: false,
    prescribedMotionUnlocked: false,
    weakFsiUnlocked: false,
    s1PhysicallySelected: false,
    s9Selected: false,
    newBoundaryStrategyCreated: false,
    claimUpperBound:
      "Candidate-only fixed-eta-lu three-resolution discrete robustness and force-identity assessment; not resolved penalization layer, sharp-interface convergence, Richardson extrapolation, GCI, formal integration, prescribed motion, FSI, apparatus prediction, or experimental validation.",
  }),
  forbidden: Object.freeze([
    "run-A8R-D24-D36-or-D54-before-result-before-chain-is-frozen",
    "modify-formal-theory-or-program",
    "modify-A8Q-scientific-source-artifact-report-or-gates",
    "replace-A8Q-machine-anchor-with-manually-copied-scalars",
    "change-matrix-mask-window-control-volume-tolerance-or-decision-after-results",
    "write-Richardson-extrapolation-GCI-or-sharp-interface-qualification",
    "select-parameters-by-literature-closeness",
    "create-S10-integrate-S9-or-change-open-boundary",
    "run-prescribed-motion-weak-FSI-3D-free-surface-apparatus-or-experiment",
  ]),
});

function numberId(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", "p");
}

function buildDefinition(
  diameterCells: BrinkmanMultiresolutionDiameter,
  maskHalfThicknessCells: BrinkmanMultiresolutionMaskHalfThickness,
): BrinkmanMultiresolutionDefinition {
  const carrier = BRINKMAN_MULTIRESOLUTION_CONTRACT.carrier;
  const penalizationTimeSteps = BRINKMAN_MULTIRESOLUTION_PENALIZATION_TIME;
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
      "a8r",
      `d${diameterCells}`,
      `mask-${numberId(maskHalfThicknessCells, 2)}`,
      `eta-${numberId(penalizationTimeSteps, 2)}`,
    ].join("-"),
    role: "fresh-main-multiresolution",
    diameterCells,
    maskHalfThicknessCells,
    penalizationTimeSteps,
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
    bodyCenterY: 0.5 * (ny - 1) + carrier.bodyPhaseOffsetYCells,
    bodyRadius: 0.5 * diameterCells,
    totalSteps,
    discardSteps,
    analysisSamples,
    halfWindowSamples: analysisSamples / 2,
    blockSamples: analysisSamples / 4,
  };
}

export function buildBrinkmanMultiresolutionDefinitions():
BrinkmanMultiresolutionDefinition[] {
  const definitions: BrinkmanMultiresolutionDefinition[] = [];
  for (const diameterCells of BRINKMAN_MULTIRESOLUTION_DIAMETERS) {
    for (const maskHalfThicknessCells of
      BRINKMAN_MULTIRESOLUTION_MASK_HALF_THICKNESSES) {
      definitions.push(buildDefinition(
        diameterCells,
        maskHalfThicknessCells,
      ));
    }
  }
  return definitions;
}

export type BrinkmanMultiresolutionContract =
  typeof BRINKMAN_MULTIRESOLUTION_CONTRACT;
