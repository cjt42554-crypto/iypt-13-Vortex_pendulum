/** Frozen before the first A8O research-matrix execution. */
export const FORMAL_CAUSAL_REFERENCE_STRATEGIES = Object.freeze([
  Object.freeze({
    ordinal: 1,
    id: "legacy-zou-he-derived-density",
    role: "frozen-high-reflection-baseline",
  }),
  Object.freeze({
    ordinal: 9,
    id: "incoming-characteristic-compatible-zou-he",
    role: "frozen-A8N-candidate-formula-unchanged",
  }),
] as const);

export const FORMAL_CAUSAL_REFERENCE_PERTURBATIONS = Object.freeze([
  Object.freeze({
    id: "oblique-acoustic-ky1",
    family: "oblique-acoustic",
    transverseMode: 1,
    qualificationRole: "gate",
  }),
  Object.freeze({
    id: "oblique-acoustic-ky2",
    family: "oblique-acoustic",
    transverseMode: 2,
    qualificationRole: "gate",
  }),
  Object.freeze({
    id: "localized-pressure-pulse",
    family: "localized-pressure",
    transverseMode: 0,
    qualificationRole: "gate",
  }),
  Object.freeze({
    id: "shear-vorticity-diagnostic",
    family: "shear-vorticity",
    transverseMode: 1,
    qualificationRole: "diagnostic-only",
  }),
] as const);

export const FORMAL_CAUSAL_REFERENCE_CONTRACT = Object.freeze({
  format: "VP-A8O-CAUSAL-REFERENCE-2D-QUALIFICATION-CONTRACT-v1",
  frozenAgainstRepositoryCommit:
    "ea67dd9c65c72d25a6668577594fa8fbf1282261",
  sourceIdentity: Object.freeze({
    formalSource: Object.freeze({
      relativePath: "02_模拟程序/src/solvers/highFidelity/lbm.ts",
      sha256:
        "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
      accessMode:
        "read-only-import-plus-candidate-checkpoint-adapter",
    }),
    proDecision: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/10_A8N_网页版Pro独立审查与参考基准裁决.md",
      sha256:
        "9e6373a50d47ce6fb6c0195fed28a297226fd1ef1b574bdeffbcf73a631097a4",
      evidenceCode:
        "ACCEPT-A8N-PRO-EVIDENCE-COMPLETE-CANDIDATE-ONLY",
      holdCode:
        "HOLD-A8N-PRO-S9-PHYSICS-SELECTION-REFERENCE-INCONCLUSIVE",
      routeCode:
        "PRIORITIZE-A8O-CAUSAL-REFERENCE-AND-2D-BOUNDARY-QUALIFICATION",
    }),
    a8nEvidence: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/artifacts/a8-formal-mrt-incoming-characteristic-qualification.json.gz",
      storedSha256:
        "b3df6c32ef922d7bc464f77da736f42be0fbf21ebec031b3aacb27d56fddbff4",
      canonicalSha256:
        "68a267662d7a2841f39cfc3fbff3238996fb0f3fa6f08df6ac8cbd3b9209fd5c",
      exactShortDomainCausalAnchors: 18,
    }),
    frozenS9Boundary: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-incoming-characteristic-boundary.ts",
      sha256:
        "6f71213f0882b50ba51acba395003886a2ad57e2b857c23786dba592d360748c",
    }),
    frozenA8nContract: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-incoming-characteristic-contract.ts",
      sha256:
        "8225b6e9628d301536bff6f9b74a601bdf2b19fdc13d450279696f95cf5f88cf",
    }),
    fixedCylinderGeometry: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_公开规定横移圆柱基准/src/fixed-cylinder-geometry.ts",
      sha256:
        "230c9f6312d12ba90ed1b14fa296743591f9c99281349df2670bd971e5329f0c",
      accessMode: "read-only-geometry-method-reference",
    }),
    fixedCylinderMetrics: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_公开规定横移圆柱基准/src/benchmark-metrics.ts",
      sha256:
        "625e3eb62c389d597ed0f22feb8e49fd2cad70d543ee9b19f2acff9fdd292e12",
      accessMode: "read-only-load-statistics-method-reference",
    }),
  }),
  strategyIdentity: Object.freeze({
    strategies: FORMAL_CAUSAL_REFERENCE_STRATEGIES,
    s9FormulaMustRemainByteIdenticalToA8n: true,
    forbidden: Object.freeze([
      "far-field-relaxation-coefficient",
      "filtering",
      "density-velocity-or-population-clipping",
      "fallback-to-another-boundary",
      "parameter-corner-special-casing",
      "change-S9-formula-or-strategy-id",
      "change-gates-after-results",
      "treat-legacy-as-physical-truth",
      "treat-finite-time-causal-transient-as-mature-statistics",
    ]),
  }),
  commonNumerics: Object.freeze({
    inletVelocityLattice: 0.08,
    latticeSoundSpeed: 1 / Math.sqrt(3),
    relaxationTime: Object.freeze([0.54, 0.56, 0.58]),
    nominalDiameterCells: Object.freeze([8, 12, 16]),
    penalizationTimeSteps: 1.5,
    maskHalfThicknessCells: 0.75,
    outerBoundary: "open-periodic-crossflow",
    upstreamDiameters: Object.freeze([3.5, 7, 10.5, 14]),
    downstreamDiameters: 6.5,
    geometries: Object.freeze([
      Object.freeze({
        nominalDiameterCells: 8,
        ny: 37,
        bodyCenterY: 18.5,
      }),
      Object.freeze({
        nominalDiameterCells: 12,
        ny: 56,
        bodyCenterY: 28,
      }),
      Object.freeze({
        nominalDiameterCells: 16,
        ny: 75,
        bodyCenterY: 37.5,
      }),
    ]),
    cylinderRegion: Object.freeze({
      minimumRelativeXDiameters: -2,
      maximumRelativeXDiameters: 4,
      yCoverage: "all-periodic-rows",
      includedCells: "mask-less-than-0.5",
    }),
    sampleStrideCellsPerNominalDiameter: 0.25,
  }),
  causalReference: Object.freeze({
    matrix: Object.freeze({
      strategyCount: 2,
      cornerCount: 9,
      upstreamDistanceCount: 4,
      runCount: 72,
      executionOrder:
        "diameter-major-relaxation-major-long-reference-first-then-distance-major-strategy",
      initialField: "uniform-target-velocity-with-fixed-cylinder-active-from-step-zero",
    }),
    acousticReturnDefinition:
      "T-return=L-up/(cs-u0)+L-up/(cs+u0)",
    longestReferenceUpstreamDiameters: 14,
    longestReferenceSafetyFraction: 0.85,
    comparisonWindowFractionsOfLongestReturn: Object.freeze([0.78, 0.84]),
    shorterBoundaryPreReturnFraction: 0.90,
    shorterBoundaryPostReturnFraction: 1.05,
    referenceStrategyAgreementGates: Object.freeze({
      maximumDensityRmsDifference: 1e-8,
      maximumVelocityRmsDifferenceOverInletVelocity: 1e-6,
      maximumCorrectedLoadCoefficientRmsDifference: 1e-5,
    }),
    legacyErrorDetectionFloors: Object.freeze({
      densityRms: 1e-5,
      velocityRmsOverInletVelocity: 1e-4,
      correctedLoadCoefficientRms: 1e-3,
    }),
    candidateSuperiorityGates: Object.freeze({
      maximumS9ToLegacyDensityErrorRatio: 0.80,
      maximumS9ToLegacyVelocityErrorRatio: 0.80,
      maximumS9ToLegacyLoadErrorRatio: 0.80,
      requireAllThreeShorterDistancesAtAllNineCorners: true,
    }),
    distanceConvergenceGates: Object.freeze({
      maximumLastToFirstS9DensityErrorRatio: 0.50,
      maximumLastToFirstS9VelocityErrorRatio: 0.50,
      maximumLastToFirstS9LoadErrorRatio: 0.75,
      maximumIntermediateIncreaseFactor: 1.10,
    }),
    alignedBoundaryFlux: Object.freeze({
      outboundArrival:
        "T-out=L-up/(cs-u0)",
      responseWindowConvectiveDuration: 0.5,
      maximumRelativeCumulativeAdapterMassDifference: 0.20,
      absoluteComparisonFloorPerBoundaryRow: 1e-10,
    }),
  }),
  continuousStatistics: Object.freeze({
    matrixRunCount: 72,
    totalConvectiveDuration: 24,
    warmupConvectiveDuration: 12,
    consecutiveWindowCount: 3,
    windowConvectiveDuration: 4,
    record: Object.freeze([
      "time-mean-density-and-velocity-field",
      "density-velocity-and-pressure-proxy-fluctuation-rms",
      "corrected-drag-and-lift-time-series",
      "mean-drag",
      "lift-rms",
      "dominant-Strouhal-when-detectable",
    ]),
    gates: Object.freeze({
      maximumDensityDeviation: 0.12,
      maximumMach: 0.30,
      maximumConsecutiveWindowMeanDragRelativeDrift: 0.05,
      detectableLiftRms: 1e-3,
      maximumConsecutiveWindowLiftRmsRelativeDrift: 0.15,
      maximumUndetectableLiftRmsAbsoluteDrift: 1e-4,
      maximumConsecutiveMeanDensityFieldRmsDifference: 1e-3,
      maximumConsecutiveMeanVelocityFieldRmsDifferenceOverInletVelocity: 0.02,
      maximumConsecutiveFluctuationRmsRelativeDrift: 0.20,
      minimumDetectableCyclesInStatisticsWindow: 1.5,
      strouhalSearchInclusive: Object.freeze([0.10, 0.30]),
      strouhalIncrement: 0.0005,
      requireEveryRunConvergedForSelection: true,
    }),
    interpretation:
      "long-time domain-sensitivity and continuous-window maturity evidence; not a finite-time causal truth reference after boundary returns",
  }),
  exactPopulationAccounting: Object.freeze({
    identity:
      "M-candidate-post-M-pre=(M-formal-post-M-pre)+candidate-adapter-delta",
    inheritedFormalShadow:
      "A8N full operation-order formal shadow remains bound by source hash, artifact hash, exact short-domain anchors, and repaired historical-provenance assertion",
    recordedEveryStep: Object.freeze([
      "pre-formal-and-candidate-total-population-mass",
      "formal-kernel-mass-change",
      "candidate-adapter-delta-by-direction",
      "adapter-absolute-delta-by-direction",
      "identity-closure-residual",
    ]),
    gates: Object.freeze({
      maximumNormalizedStepClosureResidual: 1e-10,
      maximumNormalizedCumulativeClosureResidual: 1e-10,
      maximumNonIncomingAbsoluteModification: 0,
      requireEveryStepFiniteAndPresent: true,
      requireAll18ShortDomainA8nAnchorsExact: true,
    }),
  }),
  reconstructionQualification: Object.freeze({
    aggregation:
      "every-S9-boundary-row-evaluated-every-step; store per-step extrema-count-and-deterministic-row-digest",
    gates: Object.freeze({
      minimumKnownMomentKExclusive: 0,
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
  twoDimensionalPerturbations: Object.freeze({
    definitions: FORMAL_CAUSAL_REFERENCE_PERTURBATIONS,
    strategyCount: 2,
    relaxationTimeCount: 3,
    casePairCount: 24,
    solverTraceCount: 48,
    domainPair: Object.freeze({
      ny: 64,
      testNx: 257,
      referenceNx: 385,
      referenceShiftCells: 128,
      testProbeX: 96,
      referenceProbeX: 224,
      runSteps: 900,
    }),
    commonAmplitude: 1e-4,
    obliqueAcoustic: Object.freeze({
      testPulseCenterX: 176,
      referencePulseCenterX: 304,
      envelopeSigmaCells: 20,
      streamwiseWavelengthCells: 32,
      transverseModes: Object.freeze([1, 2]),
      gates: Object.freeze({
        maximumModalAmplitudeReflectionRatio: 0.10,
        maximumModalEnergyReflectionRatio: 0.02,
        maximumTransverseModeContaminationRatio: 0.05,
        maximumIncidentReferenceRelativeRmsMismatch: 1e-4,
        maximumMeanDensityDrift: 2e-5,
        maximumMeanVelocityDrift: 2e-5,
      }),
    }),
    localizedPressure: Object.freeze({
      testPulseCenterX: 160,
      referencePulseCenterX: 288,
      centerY: 31.5,
      sigmaCells: 10,
      gates: Object.freeze({
        maximumReflectedDensityRmsRatio: 0.15,
        maximumReflectedVelocityRmsRatio: 0.15,
        maximumMeanDensityDrift: 2e-5,
        maximumMeanVelocityDrift: 2e-5,
      }),
    }),
    shearVorticity: Object.freeze({
      testCenterX: 20,
      referenceCenterX: 148,
      streamwiseSigmaCells: 8,
      transverseMode: 1,
      gate: "none-diagnostic-only",
      record: Object.freeze([
        "vorticity-rms-relative-reference-error",
        "transverse-kinetic-energy-relative-reference-error",
        "mean-state-drift",
      ]),
    }),
    candidateGate:
      "all-six-S9-oblique-cases-and-all-three-S9-localized-pressure-cases-pass; shear-vorticity-remains-diagnostic",
  }),
  evidenceDiscipline: Object.freeze({
    contractAndContractTestsMustBeCommittedBeforeFirstResearchRun: true,
    noResultImplementationMustBeCommittedBeforeFirstResearchRun: true,
    requireCleanCommittedInputs: true,
    requireIndependentByteIdenticalRepeatFromFirstCase: true,
    forbidGateTuningAfterResult: true,
    onFailure:
      "diagnose under frozen numerics; do not clip, fallback, tune physics, relax gates, or change S9 identity",
  }),
  classification: Object.freeze({
    evidenceComplete:
      "all-matrices-complete-finite-ledgers-and-reconstruction-pass-hashes-and-inherited-anchors-exact",
    causalReferenceValid:
      "long-domain-S1-S9-agree-through-frozen-pre-return-window-at-all-nine-corners",
    candidateCausalSuperiority:
      "S9-beats-S1-by-at-least-20-percent-in-density-velocity-and-load-errors-at-all-three-shorter-distances-and-nine-corners",
    candidateDistanceConverged:
      "S9-errors-contract-with-upstream-distance-under-frozen-ratio-gates",
    candidateStatisticsMature:
      "all-72-statistical-runs-pass-continuous-window-gates",
    candidateTwoDimensionalQualified:
      "all-S9-oblique-and-localized-pressure-gates-pass",
    readyForIndependentProSelection:
      "evidence-complete-and-reference-valid-and-causal-superiority-and-distance-convergence-and-flux-consistency-and-statistics-mature-and-two-dimensional-qualified",
    formalAlgorithmSelectionDelegatedToPro: true,
  }),
  decision: Object.freeze({
    evidenceCompleteCode:
      "PASS-A8O-EVIDENCE-COMPLETE-CANDIDATE-ONLY-RETURN-TO-PRO",
    evidenceIncompleteCode:
      "NO-GO-A8O-EVIDENCE-INCOMPLETE-OR-INTERNAL-GATES",
    candidateReadyCode:
      "PASS-A8O-S9-PHYSICS-SELECTION-READY-FOR-INDEPENDENT-PRO",
    candidateHoldCode:
      "HOLD-A8O-S9-PHYSICS-SELECTION-QUALIFICATION-GATES",
    formalSourceModified: false,
    formalIntegrationUnlocked: false,
    candidateAutomaticallyApproved: false,
    stopAfterEvidenceAndHandoff: true,
    claimUpperBound:
      "Candidate-only finite-time causal-reference, long-time window-convergence, exact adapter accounting, and two-dimensional perturbation screening; no formal integration, grid-converged load truth, FSI, apparatus prediction, or experimental validation.",
  }),
});

export type FormalCausalReferenceStrategy =
  typeof FORMAL_CAUSAL_REFERENCE_STRATEGIES[number]["id"];
export type FormalCausalPerturbation =
  typeof FORMAL_CAUSAL_REFERENCE_PERTURBATIONS[number];

export interface FormalCausalReferenceDefinition {
  id: string;
  strategy: FormalCausalReferenceStrategy;
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

export interface FormalCausalPerturbationDefinition {
  id: string;
  strategy: FormalCausalReferenceStrategy;
  relaxationTime: number;
  perturbationId: FormalCausalPerturbation["id"];
  family: FormalCausalPerturbation["family"];
  transverseMode: number;
  qualificationRole: FormalCausalPerturbation["qualificationRole"];
}

function numberTag(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

function strategyTag(strategy: FormalCausalReferenceStrategy): string {
  const entry = FORMAL_CAUSAL_REFERENCE_STRATEGIES.find((item) =>
    item.id === strategy);
  if (entry === undefined) throw new Error("unregistered A8O strategy");
  return "s" + entry.ordinal.toString().padStart(2, "0");
}

function longestCausalSteps(nominalDiameterCells: number): number {
  const contract = FORMAL_CAUSAL_REFERENCE_CONTRACT;
  const length = contract.causalReference.longestReferenceUpstreamDiameters
    * nominalDiameterCells;
  const cs = contract.commonNumerics.latticeSoundSpeed;
  const u0 = contract.commonNumerics.inletVelocityLattice;
  const acousticReturn = length / (cs - u0) + length / (cs + u0);
  return Math.floor(
    contract.causalReference.longestReferenceSafetyFraction * acousticReturn,
  );
}

export function buildFormalCausalReferenceDefinitions(
  study: "causal" | "statistics",
): FormalCausalReferenceDefinition[] {
  const contract = FORMAL_CAUSAL_REFERENCE_CONTRACT;
  const definitions: FormalCausalReferenceDefinition[] = [];
  for (const geometry of contract.commonNumerics.geometries) {
    const diameter = geometry.nominalDiameterCells;
    const sampleStride = Math.round(
      contract.commonNumerics.sampleStrideCellsPerNominalDiameter * diameter,
    );
    const runSteps = study === "causal"
      ? longestCausalSteps(diameter)
      : Math.round(
        contract.continuousStatistics.totalConvectiveDuration
          * diameter / contract.commonNumerics.inletVelocityLattice,
      );
    for (const relaxationTime of contract.commonNumerics.relaxationTime) {
      for (const upstreamDiameters of contract.commonNumerics.upstreamDiameters) {
        for (const strategy of FORMAL_CAUSAL_REFERENCE_STRATEGIES) {
          const domainLength = upstreamDiameters
            + contract.commonNumerics.downstreamDiameters;
          definitions.push({
            id: [
              study,
              "d" + numberTag(diameter, 1, 2),
              "t" + numberTag(relaxationTime, 1000, 4),
              "l" + numberTag(upstreamDiameters, 10, 3),
              strategyTag(strategy.id),
            ].join("-"),
            strategy: strategy.id,
            nominalDiameterCells: diameter,
            relaxationTime,
            upstreamDiameters,
            downstreamDiameters: contract.commonNumerics.downstreamDiameters,
            nx: Math.round(domainLength * diameter) + 1,
            ny: geometry.ny,
            bodyCenterX: upstreamDiameters * diameter,
            bodyCenterY: geometry.bodyCenterY,
            bodyRadius: diameter / 2,
            runSteps,
            sampleStride,
          });
        }
      }
    }
  }
  return definitions;
}

export function buildFormalCausalPerturbationDefinitions():
  FormalCausalPerturbationDefinition[] {
  const definitions: FormalCausalPerturbationDefinition[] = [];
  for (const perturbation of FORMAL_CAUSAL_REFERENCE_PERTURBATIONS) {
    for (const strategy of FORMAL_CAUSAL_REFERENCE_STRATEGIES) {
      for (const relaxationTime of
        FORMAL_CAUSAL_REFERENCE_CONTRACT.commonNumerics.relaxationTime) {
        definitions.push({
          id: [
            perturbation.id,
            strategyTag(strategy.id),
            "t" + numberTag(relaxationTime, 1000, 4),
          ].join("-"),
          strategy: strategy.id,
          relaxationTime,
          perturbationId: perturbation.id,
          family: perturbation.family,
          transverseMode: perturbation.transverseMode,
          qualificationRole: perturbation.qualificationRole,
        });
      }
    }
  }
  return definitions;
}

export type FormalCausalReferenceContract =
  typeof FORMAL_CAUSAL_REFERENCE_CONTRACT;
