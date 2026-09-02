/** Frozen before the first A8N research-matrix execution. */
export const FORMAL_INCOMING_CHARACTERISTIC_STRATEGIES = Object.freeze([
  Object.freeze({
    ordinal: 1,
    id: "legacy-zou-he-derived-density",
    role: "legacy-baseline-exact-A8M-anchor",
  }),
  Object.freeze({
    ordinal: 9,
    id: "incoming-characteristic-compatible-zou-he",
    role: "new-candidate-not-approved",
  }),
] as const);

export const FORMAL_INCOMING_CHARACTERISTIC_STARTUP_PROTOCOLS = Object.freeze([
  Object.freeze({
    id: "rest-ramp-20d-no-body",
    initialField: "uniform-rest",
    body: "none",
    rampStepsPerNominalDiameter: 20,
    preRunAuditWindowCount: 0,
    auditWindowCount: 1,
  }),
  Object.freeze({
    id: "uniform-target-no-body",
    initialField: "uniform-target-velocity",
    body: "none",
    rampStepsPerNominalDiameter: 0,
    preRunAuditWindowCount: 0,
    auditWindowCount: 1,
  }),
  Object.freeze({
    id: "fixed-body-established-prerun",
    initialField: "uniform-target-velocity",
    body: "fixed-diffuse-cylinder",
    rampStepsPerNominalDiameter: 0,
    preRunAuditWindowCount: 1,
    auditWindowCount: 1,
  }),
] as const);

/**
 * A8N is a candidate-only qualification of one new left-inlet algorithm. It
 * neither edits nor selects an inlet for the formal solver.
 */
export const FORMAL_INCOMING_CHARACTERISTIC_CONTRACT = Object.freeze({
  format: "VP-A8N-INCOMING-CHARACTERISTIC-QUALIFICATION-CONTRACT-v1",
  frozenAgainstRepositoryCommit:
    "2ddcbf271947097467e6eee1c49514175d3a4413",
  sourceIdentity: Object.freeze({
    formalSource: Object.freeze({
      relativePath: "02_模拟程序/src/solvers/highFidelity/lbm.ts",
      sha256:
        "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
      accessMode:
        "read-only-import-plus-candidate-shadow-ledger-and-checkpoint-adapter",
    }),
    proDecision: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/07_A8M_网页版Pro独立审查与路线裁决.md",
      sha256:
        "e127c804f8f246488cbac04c4d1574c0671a2f9ca3f4882b3476cd5f11723ee8",
      evidenceCode:
        "ACCEPT-A8M-PRO-EVIDENCE-COMPLETE-AMENDED-V2-CANDIDATE-ONLY",
      rejectedStrategyCode:
        "REJECT-A8M-PRO-S2-FORMAL-INLET-MASS-REFLECTION-NONINCOMING-OVERWRITE",
      routeCode:
        "NO-GO-A8M-PRO-ANY-FORMAL-INLET-LOW-REFLECTION-QUALIFICATION",
    }),
    a8mEvidence: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/artifacts/a8-formal-mrt-inlet-qualification.json.gz",
      storedSha256:
        "ac6dc54eb5d9a6ece86fa266007e1fae5ccccb3532223fb9a3e8953827c1d3ba",
      canonicalSha256:
        "cbc790d2b07089b6c294e980d9a21af41bc6911ca7c180bb50631efffb39681e",
      exactLegacyStartupAnchors: 27,
      exactLegacyAcousticAnchors: 3,
    }),
    reusedShadowLedger: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-inlet-qualification-ledger.ts",
      sha256:
        "f4bdf648612330b8666e94f6c3a39b50bfa557cd71473b384f87a8d4578e2b68",
    }),
  }),
  algorithmIdentity: Object.freeze({
    strategyId: "incoming-characteristic-compatible-zou-he",
    boundary: "left-x-min-open-inlet",
    modelScope: "isothermal-D2Q9-linear-acoustic-characteristic-candidate",
    farFieldState: Object.freeze({ rho0: 1, uy0: 0 }),
    latticeSoundSpeedSquared: 1 / 3,
    latticeSoundSpeed: 1 / Math.sqrt(3),
    knownPopulationDirectionsPreservedExactly: Object.freeze([0, 2, 3, 4, 6, 7]),
    reconstructedIncomingDirectionsOnly: Object.freeze([1, 5, 8]),
    knownMoment:
      "K=f0+f2+f4+2*(f3+f6+f7)",
    exactDiscreteCompatibility:
      "rho*(1-ux)=K",
    characteristicConvention: Object.freeze({
      outgoingAtLeft:
        "A-minus=0.5*((rho-rho0)-rho0*(ux-u0)/cs)",
      incomingAtLeft:
        "A-plus=0.5*((rho-rho0)+rho0*(ux-u0)/cs)",
      imposedIncomingTarget: "A-plus=0",
      outgoingTreatment:
        "not-prescribed; carried by preserved known populations through K",
    }),
    targetStateSolve: Object.freeze({
      equation:
        "(cs/rho0)*rho^2+(1-u0-cs)*rho-K=0",
      discriminant:
        "Delta=(1-u0-cs)^2+4*(cs/rho0)*K",
      root:
        "rho=(-(1-u0-cs)+sqrt(Delta))/(2*cs/rho0)",
      velocity: "ux=1-K/rho",
      transverseVelocity: "uy=0",
      rootSelection:
        "positive-subsonic-root-continuous-to-rho=rho0-and-ux=u0-when-K=rho0*(1-u0)",
    }),
    incomingReconstruction: Object.freeze({
      f1: "f3+(2/3)*rho*ux",
      f5: "f7+0.5*(f4-f2)+(1/6)*rho*ux",
      f8: "f6+0.5*(f2-f4)+(1/6)*rho*ux",
      transverseVelocity: 0,
    }),
    forbidden: Object.freeze([
      "modify-directions-other-than-1-5-8",
      "uniform-nine-population-density-normalization",
      "simultaneously-impose-fixed-rho-and-fixed-ux",
      "reuse-S2-strategy-id-or-claim",
      "fallback-to-another-boundary",
      "clip-density-velocity-populations-or-discriminant",
      "parameter-corner-special-casing",
      "change-gates-after-results",
    ]),
    failurePolicy:
      "nonpositive-or-nonfinite-K-discriminant-density-or-population-and-any-nonsubsonic-root-are-recorded-as-case-failure-without-clipping-or-fallback",
  }),
  commonNumerics: Object.freeze({
    inletVelocityLattice: 0.08,
    relaxationTime: Object.freeze([0.54, 0.56, 0.58]),
    nominalDiameterCells: Object.freeze([8, 12, 16]),
    penalizationTimeSteps: 1.5,
    maskHalfThicknessCells: 0.75,
    outerBoundary: "open-periodic-crossflow",
    geometries: Object.freeze([
      Object.freeze({
        nominalDiameterCells: 8,
        nx: 81,
        ny: 37,
        auditSteps: 347,
        rampSteps: 160,
        bodyCenterX: 28,
        bodyCenterY: 18.5,
        bodyRadius: 4,
      }),
      Object.freeze({
        nominalDiameterCells: 12,
        nx: 121,
        ny: 56,
        auditSteps: 520,
        rampSteps: 240,
        bodyCenterX: 42,
        bodyCenterY: 28,
        bodyRadius: 6,
      }),
      Object.freeze({
        nominalDiameterCells: 16,
        nx: 161,
        ny: 75,
        auditSteps: 693,
        rampSteps: 320,
        bodyCenterX: 56,
        bodyCenterY: 37.5,
        bodyRadius: 8,
      }),
    ]),
  }),
  startupMatrix: Object.freeze({
    strategies: FORMAL_INCOMING_CHARACTERISTIC_STRATEGIES,
    protocols: FORMAL_INCOMING_CHARACTERISTIC_STARTUP_PROTOCOLS,
    cornerCount: 9,
    strategyCount: 2,
    protocolCount: 3,
    runCount: 54,
    executionOrder:
      "diameter-major-relaxation-major-protocol-major-strategy",
    interiorComparisonRegion:
      "all-y-and-x-from-two-diameters-through-nx-minus-two-diameters-exclusive",
    gates: Object.freeze({
      maximumDensityDeviation: 0.12,
      maximumMach: 0.30,
      maximumUniformNoBodyAbsoluteStateError: 1e-12,
      requireEveryCandidateRunComplete: true,
      requireAll27LegacyStartupExactA8mAnchors: true,
    }),
  }),
  exactPopulationMassBudget: Object.freeze({
    identity:
      "M-final-M-pre=collision-residual-left-out-right-out+formal-left-write+formal-right-write+candidate-incoming-replacement-delta",
    adapterInterpretation:
      "candidate-incoming-replacement-delta-relative-to-read-only-formal-S1-shadow; it is boundary writeback, not a volume source",
    directionGroups: Object.freeze({
      incoming: Object.freeze([1, 5, 8]),
      nonIncomingKnown: Object.freeze([0, 2, 3, 4, 6, 7]),
    }),
    gates: Object.freeze({
      formalShadowMaximumPopulationAbsoluteDifference: 0,
      maximumNormalizedStepClosureResidual: 1e-10,
      maximumNormalizedCumulativeClosureResidual: 1e-10,
      maximumNonIncomingAbsoluteModification: 0,
      requireFiniteEveryStepRecord: true,
      requireEveryStepRecordPresent: true,
      adapterMassAmplitudeGate: "none-record-only-open-boundary-flux",
    }),
  }),
  reconstructionQualification: Object.freeze({
    recordedPerBoundaryRow: Object.freeze([
      "K",
      "discriminant",
      "target-rho-ux-uy",
      "actual-rho-ux-uy",
      "incoming-characteristic-residual",
      "discrete-compatibility-residual",
      "macroscopic-moment-residuals",
      "known-population-maximum-absolute-difference",
    ]),
    gates: Object.freeze({
      minimumKExclusive: 0,
      minimumDiscriminantExclusive: 0,
      minimumDensityExclusive: 0,
      maximumBoundaryMach: 0.30,
      maximumIncomingCharacteristicAbsoluteResidual: 1e-12,
      maximumDiscreteCompatibilityAbsoluteResidual: 1e-12,
      maximumDensityMomentAbsoluteResidual: 1e-12,
      maximumVelocityMomentAbsoluteResidual: 1e-12,
      maximumKnownPopulationAbsoluteDifference: 0,
    }),
  }),
  acousticReflection: Object.freeze({
    strategies: FORMAL_INCOMING_CHARACTERISTIC_STRATEGIES,
    relaxationTime: Object.freeze([0.54, 0.56, 0.58]),
    caseCount: 6,
    solverTraceCount: 12,
    requireAll3LegacyAcousticExactA8mAnchors: true,
    baseState: Object.freeze({ rho: 1, ux: 0.08, uy: 0 }),
    perturbation: Object.freeze({
      family: "one-dimensional-upstream-travelling-derivative-gaussian-plane-wave",
      condensationPeakAmplitude: 1e-4,
      lambdaCells: 16,
      transverseVelocity: 0,
      initialization: "local-D2Q9-equilibrium",
    }),
    domainPair: Object.freeze({
      ny: 16,
      testNx: 321,
      referenceNx: 513,
      referenceShiftCells: 192,
      testPulseCenterX: 200,
      referencePulseCenterX: 392,
      testProbeX: 96,
      referenceProbeX: 288,
      runSteps: 620,
      incidentWindowInclusive: Object.freeze([145, 280]),
      reflectedWindowInclusive: Object.freeze([475, 620]),
    }),
    characteristicDefinition: Object.freeze({
      upstream:
        "A-minus=0.5*((rho-rho0)-rho0*(ux-u0)/cs)",
      downstream:
        "A-plus=0.5*((rho-rho0)+rho0*(ux-u0)/cs)",
      reflectedSignal:
        "test-A-plus-minus-shifted-reference-A-plus",
      incidentSignal: "shifted-reference-A-minus",
    }),
    gates: Object.freeze({
      maximumCharacteristicAmplitudeReflectionRatio: 0.05,
      maximumDensityAmplitudeReflectionRatio: 0.05,
      maximumVelocityAmplitudeReflectionRatio: 0.05,
      maximumAcousticEnergyReflectionRatio: 0.0025,
      maximumPhaseErrorRadiansWhenDetectable: Math.PI / 6,
      phaseGateMinimumCharacteristicReflectionRatio: 0.01,
      maximumMeanDensityDrift: 1e-5,
      maximumMeanStreamwiseVelocityDrift: 1e-5,
      maximumIncidentWindowTestReferenceRelativeRmsMismatch: 1e-6,
      minimumIncidentCharacteristicAmplitudeOverInitializationPeak: 0.25,
      requireEveryTraceComplete: true,
      requireEveryCandidateRelaxationTime: true,
    }),
  }),
  internalFieldAndLoadComparison: Object.freeze({
    recordEveryProtocolEveryCorner: true,
    qualificationProtocols: Object.freeze([
      "uniform-target-no-body",
      "fixed-body-established-prerun",
    ]),
    diagnosticOnlyProtocol: "rest-ramp-20d-no-body",
    reasonDiagnosticOnly:
      "A8M established that legacy S1 fails this incompatible startup protocol, so closeness to its failed field is not a candidate gate",
    gates: Object.freeze({
      maximumInteriorDensityRmsDifference: 1e-3,
      maximumInteriorVelocityRmsDifferenceOverInletVelocity: 0.02,
      maximumFixedBodyMeanDragRelativeDifference: 0.05,
      maximumFixedBodyLiftRmsRelativeDifference: 0.05,
      maximumUniformNoBodyAbsoluteStateError: 1e-12,
    }),
    interpretation:
      "screening against gross alteration of an established-flow solution; not load accuracy or physical validation",
  }),
  evidenceDiscipline: Object.freeze({
    contractAndContractTestsMustBeCommittedBeforeFirstResearchRun: true,
    noResultImplementationMustBeCommittedBeforeFirstResearchRun: true,
    requireCleanCommittedInputs: true,
    requireIndependentByteIdenticalRepeatFromFirstCase: true,
    forbidGateTuningAfterResult: true,
    onFailure:
      "diagnose numerical cause under frozen physical parameters; do not clip, fallback, tune physics, relax gates, or rename a failed result as pass",
  }),
  classification: Object.freeze({
    candidateMassEligible:
      "all-S9-formal-shadows-exact-ledgers-close-reconstruction-gates-pass-and-nonincoming-modification-is-exactly-zero",
    candidateAcousticEligible:
      "all-three-S9-acoustic-cases-pass-all-absolute-reflection-drift-detection-and-reference-gates",
    candidateStartupEligible:
      "all-27-S9-startup-cases-complete-and-pass-density-Mach-and-reconstruction-gates",
    candidateInteriorEligible:
      "all-nine-uniform-target-and-all-nine-fixed-body-comparisons-pass-their-frozen-gates",
    candidateReadyForProSelection:
      "mass-and-acoustic-and-startup-and-interior-eligible",
    passCountRankingForbidden: true,
    formalAlgorithmSelectionDelegatedToPro: true,
  }),
  decision: Object.freeze({
    evidenceCompleteCode:
      "PASS-A8N-EVIDENCE-COMPLETE-CANDIDATE-ONLY-RETURN-TO-PRO",
    internalGateFailureCode:
      "NO-GO-A8N-EVIDENCE-INCOMPLETE-OR-INTERNAL-GATES",
    candidateQualifiedCode:
      "PASS-A8N-S9-CANDIDATE-QUALIFIED-RETURN-TO-PRO",
    candidateRejectedCode:
      "NO-GO-A8N-S9-CANDIDATE-QUALIFICATION",
    formalSourceModified: false,
    formalIntegrationUnlocked: false,
    candidateAutomaticallyApproved: false,
    stopAfterEvidenceAndHandoff: true,
    claimUpperBound:
      "Candidate-only exact population accounting, incoming-only reconstruction, acoustic reflection, startup, and established-flow interior/load screening; no formal integration, load accuracy, FSI, apparatus prediction, or experimental validation.",
  }),
});

export type FormalIncomingCharacteristicStrategy =
  typeof FORMAL_INCOMING_CHARACTERISTIC_STRATEGIES[number]["id"];
export type FormalIncomingCharacteristicStartupProtocol =
  typeof FORMAL_INCOMING_CHARACTERISTIC_STARTUP_PROTOCOLS[number]["id"];
export type FormalIncomingCharacteristicContract =
  typeof FORMAL_INCOMING_CHARACTERISTIC_CONTRACT;
