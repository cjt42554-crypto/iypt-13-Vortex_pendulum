import { QUALIFICATION_CONTRACT } from "./contracts.ts";
import { ROBUSTNESS_CONTRACT } from "./robustness-contract.ts";

/** Frozen before the first A8J research matrix run. */
export const FORMAL_NO_BODY_RAMP_CONTRACT = Object.freeze({
  format: "VP-A8J-FORMAL-MRT-NO-BODY-RAMP-CONTRACT-v1",
  formalSource: Object.freeze({
    relativePath: "02_模拟程序/src/solvers/highFidelity/lbm.ts",
    sha256:
      "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
    accessMode: "read-only-import-from-candidate-audit",
  }),
  inheritedEvidence: Object.freeze({
    a8iArtifactSha256:
      "b3ecf70dec23d519faaef650fd9af17a0c82ff7a6f2440190fd8f730bace4a23",
    a8iDecision:
      "NO-GO-A8I-READONLY-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-INTERNAL-GATES",
    bodyPresentTwentyDiameterStableCorners: 0,
  }),
  matrix: Object.freeze({
    inletVelocityLattice: 0.08,
    relaxationTime: ROBUSTNESS_CONTRACT.axes.relaxationTime,
    nominalDiameterScaleCells: ROBUSTNESS_CONTRACT.axes.nominalCylinderDiameterCells,
    rampDurationDiameters: Object.freeze([0, 0.25, 0.5, 1, 2, 5, 10, 20]),
    body: "none",
    initialField: "uniform-rest",
    rampShape: "half-cosine-zero-slope-endpoints",
    penalizationTimeStepsUnusedWithoutBody: 1.5,
    maskHalfThicknessCellsUnusedWithoutBody: 0.75,
    outerBoundary: "open-periodic-crossflow",
    downstreamDomainScaleDiameters: 6,
    geometryIdentity: "A8C-shortest-domain-and-runtime-with-body-removed",
  }),
  gates: Object.freeze({
    maximumDensityDeviation:
      QUALIFICATION_CONTRACT.numericalStability.maximumDensityDeviation,
    maximumMach: QUALIFICATION_CONTRACT.numericalStability.maximumMach,
    requireEveryRunComplete: true,
    requireLongestRampPassAtEveryCorner: true,
    requireSampledDensityDeviationNonIncreasing: true,
    monotonicityAbsoluteTolerance: 1e-14,
    requireFormalSourceHashExact: true,
    requireA8iArtifactHashExact: true,
    requireByteIdenticalIndependentRepeat: true,
  }),
  interpretationRules: Object.freeze({
    frozenCornerCount: 9,
    formalSourceModified: false,
    cbcIntegratedIntoFormalKernel: false,
    formalIntegrationUnlocked: false,
  }),
});

export type FormalNoBodyRampContract = typeof FORMAL_NO_BODY_RAMP_CONTRACT;
