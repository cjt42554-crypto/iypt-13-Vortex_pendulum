/** Frozen before the first A8M qualification research run. */
export const FORMAL_INLET_QUALIFICATION_STRATEGIES = Object.freeze([
  Object.freeze({
    ordinal: 1,
    id: "legacy-zou-he-derived-density",
    role: "legacy-baseline",
  }),
  Object.freeze({
    ordinal: 2,
    id: "legacy-zou-he-density-normalized",
    role: "primary-qualification-candidate-not-approved",
  }),
  Object.freeze({
    ordinal: 7,
    id: "full-equilibrium-fixed-density",
    role: "strong-fixed-density-causal-control-excluded-from-formal-candidacy",
  }),
  Object.freeze({
    ordinal: 8,
    id: "full-regularized-fixed-density",
    role: "strong-fixed-density-causal-control-excluded-from-formal-candidacy",
  }),
] as const);

export const FORMAL_INLET_QUALIFICATION_STARTUP_PROTOCOLS = Object.freeze([
  Object.freeze({
    id: "rest-ramp-20d-no-body",
    initialField: "uniform-rest",
    body: "none",
    rampStepsPerNominalDiameter: 20,
    preRunAuditWindowCount: 0,
    auditWindowCount: 1,
    inheritedAnchor: "A8L-S1-S2-S7-S8-exact",
  }),
  Object.freeze({
    id: "uniform-target-no-body",
    initialField: "uniform-target-velocity",
    body: "none",
    rampStepsPerNominalDiameter: 0,
    preRunAuditWindowCount: 0,
    auditWindowCount: 1,
    inheritedAnchor: "none-new-A8M-guard",
  }),
  Object.freeze({
    id: "fixed-body-established-prerun",
    initialField: "uniform-target-velocity",
    body: "fixed-diffuse-cylinder",
    rampStepsPerNominalDiameter: 0,
    preRunAuditWindowCount: 1,
    auditWindowCount: 1,
    inheritedAnchor: "A8H-S1-uniform-impulsive-prerun-exact",
  }),
] as const);

/**
 * A8M is a candidate-only qualification audit. It does not select or install
 * an inlet algorithm in the formal solver.
 */
export const FORMAL_INLET_QUALIFICATION_CONTRACT = Object.freeze({
  format: "VP-A8M-FORMAL-MRT-INLET-QUALIFICATION-CONTRACT-v1",
  sourceIdentity: Object.freeze({
    formalSource: Object.freeze({
      relativePath: "02_模拟程序/src/solvers/highFidelity/lbm.ts",
      sha256:
        "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
      accessMode:
        "read-only-import-plus-candidate-exact-shadow-ledger-and-checkpoint-adapter",
    }),
    proDecision: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/04_A8L_网页版Pro独立审查与正式重构裁决.md",
      sha256:
        "c917e1e72f6a94761a95d85f6e19e6632548a54169670bf275c28b062669ce77",
      acceptedCode:
        "ACCEPT-A8L-PRO-DENSITY-CONTROL-SUFFICIENCY-FROZEN-ONLY",
      selectionCode:
        "NO-GO-A8L-PRO-FORMAL-INLET-SELECTION-EXACT-MASS-REFLECTION-STARTUP-QUALIFICATION-REQUIRED",
    }),
    a8lAdapterSource: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-inlet-mechanism-boundaries.ts",
      sha256:
        "31c0e583b557efc22f84887ab424e2cc6e4c23361c77e2d0f04dc316fdb30a1c",
    }),
  }),
  inheritedEvidence: Object.freeze({
    a8l: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/artifacts/a8-formal-mrt-inlet-mechanism-matrix.json.gz",
      storedSha256:
        "0c7894ee0b57177efdfef65b045c454fe7c9ae8c53d2afbd50849e2089bf76b6",
      canonicalSha256:
        "bf5b5cdcee269c3afd4bb1647703ac2c3d71f4b5850cad7f9de3e3a58d6658f8",
      exactAnchorStrategies: Object.freeze([
        "legacy-zou-he-derived-density",
        "legacy-zou-he-density-normalized",
        "full-equilibrium-fixed-density",
        "full-regularized-fixed-density",
      ]),
      exactAnchorCases: 36,
    }),
    a8h: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/artifacts/a8-formal-mrt-brinkman-startup-matrix.json",
      sha256:
        "74d953d736aeecc5c17a68f593df2220f36400fa026b6537caf50685d2b7e545",
      exactAnchorProtocol: "uniform-impulsive",
      exactAnchorStrategy: "legacy-zou-he-derived-density",
      exactAnchorCases: 9,
    }),
  }),
  commonNumerics: Object.freeze({
    inletVelocityLattice: 0.08,
    relaxationTime: Object.freeze([0.54, 0.56, 0.58]),
    nominalDiameterCells: Object.freeze([8, 12, 16]),
    penalizationTimeSteps: 1.5,
    maskHalfThicknessCells: 0.75,
    outerBoundary: "open-periodic-crossflow",
    latticeSoundSpeedSquared: 1 / 3,
    latticeSoundSpeed: 1 / Math.sqrt(3),
    geometries: Object.freeze([
      Object.freeze({
        nominalDiameterCells: 8,
        nx: 81,
        ny: 37,
        auditSteps: 347,
        rampSteps: 160,
        bodyCenterX: 28,
        bodyCenterY: 18,
        bodyRadius: 4,
      }),
      Object.freeze({
        nominalDiameterCells: 12,
        nx: 121,
        ny: 56,
        auditSteps: 520,
        rampSteps: 240,
        bodyCenterX: 42,
        bodyCenterY: 27.5,
        bodyRadius: 6,
      }),
      Object.freeze({
        nominalDiameterCells: 16,
        nx: 161,
        ny: 75,
        auditSteps: 693,
        rampSteps: 320,
        bodyCenterX: 56,
        bodyCenterY: 37,
        bodyRadius: 8,
      }),
    ]),
  }),
  startupMatrix: Object.freeze({
    strategies: FORMAL_INLET_QUALIFICATION_STRATEGIES,
    protocols: FORMAL_INLET_QUALIFICATION_STARTUP_PROTOCOLS,
    cornerCount: 9,
    strategyCount: 4,
    protocolCount: 3,
    runCount: 108,
    executionOrder:
      "diameter-major-relaxation-major-protocol-major-strategy",
    fixedBodyProtocolMeaning:
      "one-A8H-length-fixed-body-prerun-followed-by-one-equal-fixed-body-audit-window; no release and no FSI",
    interiorComparisonRegion:
      "all-y-and-x-from-two-diameters-through-nx-minus-two-diameters-exclusive",
    gates: Object.freeze({
      maximumDensityDeviation: 0.12,
      maximumMach: 0.30,
      maximumUniformNoBodyAbsoluteStateError: 1e-12,
      maximumS1S2InteriorDensityRmsDifference: 1e-3,
      maximumS1S2InteriorVelocityRmsDifferenceOverInletVelocity: 0.02,
      maximumS1S2FixedBodyMeanDragRelativeDifference: 0.05,
      maximumS1S2FixedBodyLiftRmsRelativeDifference: 0.05,
      requireEveryRunComplete: true,
      requireA8lRestRampExactAnchors: true,
      requireA8hLegacyPrerunExactAnchors: true,
    }),
  }),
  exactPopulationMassBudget: Object.freeze({
    signedTermsPerStep: Object.freeze([
      "pre-collision-total-mass",
      "post-collision-total-mass",
      "collision-mass-residual",
      "left-streaming-out-of-domain-populations",
      "right-streaming-out-of-domain-populations",
      "post-stream-retained-mass",
      "formal-left-boundary-writeback",
      "formal-right-boundary-writeback",
      "post-formal-boundary-mass",
      "candidate-adapter-extra-mass-by-each-of-nine-directions",
      "candidate-adapter-extra-mass-incoming-directions-1-5-8",
      "candidate-adapter-extra-mass-outgoing-directions-3-6-7",
      "candidate-adapter-extra-mass-stationary-cross-directions-0-2-4",
      "post-candidate-adapter-total-mass",
      "step-closure-residual",
      "cumulative-closure-residual",
      "cumulative-absolute-mass-exchange",
      "normalized-cumulative-closure-residual",
    ]),
    identity:
      "M-final-M-pre=collision-residual-left-out-right-out+formal-left-write+formal-right-write+adapter-delta",
    adapterDirectionGroups: Object.freeze({
      incoming: Object.freeze([1, 5, 8]),
      outgoing: Object.freeze([3, 6, 7]),
      stationaryCross: Object.freeze([0, 2, 4]),
    }),
    normalization:
      "abs-cumulative-closure-residual/max(1,cumulative-sum-of-absolute-collision-outflow-writeback-and-adapter-terms)",
    gates: Object.freeze({
      formalShadowMaximumPopulationAbsoluteDifference: 0,
      maximumNormalizedStepClosureResidual: 1e-10,
      maximumNormalizedCumulativeClosureResidual: 1e-10,
      maximumS2CumulativeAdapterMassOverInitialMass: 1e-3,
      maximumS2CumulativeAdapterMassOverAbsoluteFormalBoundaryExchange: 0.01,
      maximumS2NonIncomingAbsoluteModificationFraction: 0.5,
      requireFiniteEveryStepRecord: true,
      requireEveryStepRecordPresent: true,
    }),
  }),
  acousticReflection: Object.freeze({
    strategies: FORMAL_INLET_QUALIFICATION_STRATEGIES,
    relaxationTime: Object.freeze([0.54, 0.56, 0.58]),
    caseCount: 12,
    solverTraceCount: 24,
    baseState: Object.freeze({ rho: 1, ux: 0.08, uy: 0 }),
    perturbation: Object.freeze({
      family: "one-dimensional-upstream-travelling-derivative-gaussian-plane-wave",
      condensationPeakAmplitude: 1e-4,
      lambdaCells: 16,
      densityDefinition:
        "rho=1+sqrt(e)*amplitude/lambda*xi*exp(-xi^2/(2*lambda^2))",
      velocityDefinition:
        "ux=base-mean-u-lattice-sound-speed-times-density-perturbation",
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
      referenceBoundaryCausalIsolation:
        "reference-pulse-does-not-reach-extended-left-boundary-before-run-end",
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
    metrics: Object.freeze([
      "characteristic-reflection-amplitude-ratio",
      "density-reflection-amplitude-ratio",
      "velocity-reflection-amplitude-ratio",
      "acoustic-energy-reflection-ratio",
      "reflected-versus-time-mirrored-incident-phase-error",
      "mean-density-drift",
      "mean-streamwise-velocity-drift",
      "pre-reflection-test-reference-mismatch",
    ]),
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
      requireEveryStrategyEveryRelaxationTime: true,
    }),
    thresholdInterpretation:
      "operational-candidate-qualification-gates-not-universal-physical-constants",
  }),
  classification: Object.freeze({
    s2MassEligible:
      "all-S2-ledgers-close-and-adapter-source-and-nonincoming-fraction-gates-pass",
    s2AcousticEligible:
      "all-three-S2-acoustic-cases-pass-all-absolute-reflection-and-drift-gates",
    s2StartupEligible:
      "all-S2-startup-cases-complete-and-pass-density-and-Mach-gates",
    s2ReadyForProSelection:
      "s2-mass-eligible-and-s2-acoustic-eligible-and-s2-startup-eligible",
    legacyEstablishedAlternative:
      "all-nine-S1-fixed-body-established-prerun-audit-cases-pass-and-their-exact-mass-ledgers-close",
    nonIncomingDominance:
      "cumulative-absolute-adapter-modification-outgoing-plus-stationary-cross-over-all-nine-directions-greater-than-one-half",
    passCountRankingForbidden: true,
    formalAlgorithmSelectionDelegatedToPro: true,
  }),
  decision: Object.freeze({
    evidenceCompleteCode:
      "PASS-A8M-EVIDENCE-COMPLETE-CANDIDATE-ONLY-RETURN-TO-PRO",
    internalGateFailureCode:
      "NO-GO-A8M-EVIDENCE-INCOMPLETE-OR-INTERNAL-GATES",
    formalSourceModified: false,
    formalIntegrationUnlocked: false,
    s2AutomaticallyApproved: false,
    stopAfterEvidenceAndHandoff: true,
    claimUpperBound:
      "Candidate-only exact mass, acoustic reflection, and startup-protocol qualification of S1/S2 with S7/S8 controls; no formal integration, load accuracy, FSI, apparatus prediction, or experimental validation.",
  }),
});

export type FormalInletQualificationStrategy =
  typeof FORMAL_INLET_QUALIFICATION_STRATEGIES[number]["id"];
export type FormalInletQualificationStartupProtocol =
  typeof FORMAL_INLET_QUALIFICATION_STARTUP_PROTOCOLS[number]["id"];
export type FormalInletQualificationContract =
  typeof FORMAL_INLET_QUALIFICATION_CONTRACT;
