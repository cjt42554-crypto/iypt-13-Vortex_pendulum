import { QUALIFICATION_CONTRACT } from "./contracts.ts";
import { ROBUSTNESS_CONTRACT } from "./robustness-contract.ts";

/** Frozen before the first A8K boundary-factorization matrix run. */
export const FORMAL_BOUNDARY_FACTORIZATION_CONTRACT = Object.freeze({
  format: "VP-A8K-FORMAL-MRT-BOUNDARY-FACTORIZATION-CONTRACT-v1",
  formalSource: Object.freeze({
    relativePath: "02_模拟程序/src/solvers/highFidelity/lbm.ts",
    sha256:
      "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
    accessMode: "read-only-import-with-candidate-checkpoint-boundary-adapter",
  }),
  inheritedEvidence: Object.freeze({
    a8jArtifactSha256:
      "a1615a5c317cc220f8a313d5b22f9db4f38bd18c301080d939c2dde60d9cf9dc",
    a8jDecision:
      "NO-GO-A8J-READONLY-FORMAL-MRT-NO-BODY-RAMP-INTERNAL-GATES",
    bodyPresentNecessaryForLongestRampFailure: false,
    formalNoBodyTwentyDiameterStableCorners: 0,
  }),
  matrix: Object.freeze({
    inletVelocityLattice: 0.08,
    relaxationTime: ROBUSTNESS_CONTRACT.axes.relaxationTime,
    nominalDiameterScaleCells: ROBUSTNESS_CONTRACT.axes.nominalCylinderDiameterCells,
    rampDurationDiameters: 20,
    inletBoundary: Object.freeze([
      "formal-zou-he-velocity",
      "regularized-prescribed-state",
    ]),
    outletBoundary: Object.freeze([
      "formal-zou-he-pressure",
      "cbc-2d-regularized",
    ]),
    body: "none",
    initialField: "uniform-rest",
    rampShape: "half-cosine-zero-slope-endpoints",
    penalizationTimeStepsUnusedWithoutBody: 1.5,
    maskHalfThicknessCellsUnusedWithoutBody: 0.75,
    outerBoundary: "open-periodic-crossflow",
    downstreamDomainScaleDiameters: 6,
    geometryIdentity: "A8J-20D-no-body-short-domain",
    boundaryReplacementMechanism:
      "post-step-checkpoint-complete-nine-population-overwrite",
    cbc: Object.freeze({
      farFieldDensity: 1,
      pressureRelaxationSigma: 0.9,
      transverseRelaxation: "automatic-absolute-inlet-mach",
      characteristicLength: "nx",
    }),
  }),
  gates: Object.freeze({
    maximumDensityDeviation:
      QUALIFICATION_CONTRACT.numericalStability.maximumDensityDeviation,
    maximumMach: QUALIFICATION_CONTRACT.numericalStability.maximumMach,
    requireEveryRunComplete: true,
    requireFourBoundaryCombinationsAtEveryCorner: true,
    requireA8jBaselineMetricExactMatch: true,
    baselineMetricAbsoluteTolerance: 0,
    requireFormalSourceHashExact: true,
    requireA8jArtifactHashExact: true,
    requireByteIdenticalIndependentRepeat: true,
  }),
  attribution: Object.freeze({
    unit: "frozen-corner-pass-pattern",
    codes: Object.freeze([
      "OUTLET_REPLACEMENT_SUFFICIENT",
      "INLET_REPLACEMENT_SUFFICIENT",
      "BOTH_SINGLE_REPLACEMENTS_SUFFICIENT",
      "DOUBLE_REPLACEMENT_REQUIRED",
      "NO_TESTED_REPLACEMENT_SUFFICIENT",
      "BASELINE_ALREADY_PASSING",
      "MIXED_OR_UNRESOLVED",
    ]),
    requireSameCodeAtAllCornersForGlobalAttribution: true,
  }),
  interpretationRules: Object.freeze({
    frozenCornerCount: 9,
    frozenRunCount: 36,
    formalSourceModified: false,
    cbcIntegratedIntoFormalKernel: false,
    testedAlternativesAreCausalProbesOnly: true,
    boundaryQualificationClaimAllowed: false,
    formalIntegrationUnlocked: false,
  }),
});

export type FormalBoundaryFactorizationContract =
  typeof FORMAL_BOUNDARY_FACTORIZATION_CONTRACT;
