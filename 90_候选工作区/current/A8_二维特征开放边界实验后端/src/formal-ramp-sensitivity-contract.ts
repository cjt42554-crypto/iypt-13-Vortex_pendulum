import { QUALIFICATION_CONTRACT } from "./contracts.ts";
import { ROBUSTNESS_CONTRACT } from "./robustness-contract.ts";

/** Frozen before the first A8I research matrix run. */
export const FORMAL_RAMP_SENSITIVITY_CONTRACT = Object.freeze({
  format: "VP-A8I-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-CONTRACT-v1",
  formalSource: Object.freeze({
    relativePath: "02_模拟程序/src/solvers/highFidelity/lbm.ts",
    sha256:
      "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
    accessMode: "read-only-import-from-candidate-audit",
  }),
  inheritedEvidence: Object.freeze({
    a8hArtifactSha256:
      "74d953d736aeecc5c17a68f593df2220f36400fa026b6537caf50685d2b7e545",
    a8hDecision:
      "NO-GO-A8H-READONLY-FORMAL-MRT-BRINKMAN-STARTUP-INTERNAL-GATES",
    uniformImpulsiveStableCorners: 9,
    fiveDiameterRampStableCorners: 0,
  }),
  matrix: Object.freeze({
    inletVelocityLattice: 0.08,
    relaxationTime: ROBUSTNESS_CONTRACT.axes.relaxationTime,
    nominalCylinderDiameterCells:
      ROBUSTNESS_CONTRACT.axes.nominalCylinderDiameterCells,
    rampDurationDiameters: Object.freeze([0, 0.25, 0.5, 1, 2, 5, 10, 20]),
    initialField: "uniform-rest",
    rampShape: "half-cosine-zero-slope-endpoints",
    zeroDurationIdentity: "formal-ZouHe-boundary-step-from-rest",
    penalizationTimeSteps: 1.5,
    maskHalfThicknessCells: 0.75,
    outerBoundary: "open-periodic-crossflow",
    downstreamOutletDistanceDiameters: 6,
    geometryIdentity: "A8C-shortest-domain-and-runtime",
    longestRampPostTargetObservationDiameters: 70 / 3,
  }),
  gates: Object.freeze({
    maximumDensityDeviation:
      QUALIFICATION_CONTRACT.numericalStability.maximumDensityDeviation,
    maximumMach: QUALIFICATION_CONTRACT.numericalStability.maximumMach,
    requireEveryRunComplete: true,
    requireLongestRampPassAtEveryCorner: true,
    requireSampledDensityDeviationNonIncreasing: true,
    monotonicityAbsoluteTolerance: 1e-14,
    requireA8hFiveDiameterAnchorsExact: true,
    requireFormalSourceHashExact: true,
    requireByteIdenticalIndependentRepeat: true,
  }),
  interpretationRules: Object.freeze({
    formalSourceModified: false,
    cbcIntegratedIntoFormalKernel: false,
    formalIntegrationUnlocked: false,
  }),
});

export type FormalRampSensitivityContract =
  typeof FORMAL_RAMP_SENSITIVITY_CONTRACT;
