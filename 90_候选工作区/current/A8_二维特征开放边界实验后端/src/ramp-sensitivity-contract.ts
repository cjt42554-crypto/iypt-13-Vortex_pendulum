import { QUALIFICATION_CONTRACT } from "./contracts.ts";
import { ROBUSTNESS_CONTRACT } from "./robustness-contract.ts";

/** Frozen before the first A8E research matrix run. */
export const RAMP_SENSITIVITY_CONTRACT = Object.freeze({
  format: "VP-A8E-CBC2D-RAMP-SENSITIVITY-CONTRACT-v1",
  inheritedEvidence: Object.freeze({
    a8dContract: "VP-A8D-CBC2D-STARTUP-AUDIT-CONTRACT-v1",
    a8dArtifactSha256:
      "4a04dcf21f5a194ad2e2746836560f88b88af00d3855866111738941bc4ca0fe",
    a8dDecision:
      "PASS-A8D-CBC2D-STARTUP-AUDIT-INTERNAL-GATES-CANDIDATE-ONLY",
  }),
  matrix: Object.freeze({
    inletVelocityLattice: 0.08,
    relaxationTime: ROBUSTNESS_CONTRACT.axes.relaxationTime,
    nominalCylinderDiameterCells:
      ROBUSTNESS_CONTRACT.axes.nominalCylinderDiameterCells,
    rampDurationDiameters: Object.freeze([0, 0.25, 0.5, 1, 2, 5, 10, 20]),
    initialField: "uniform-rest",
    rampShape: "half-cosine-zero-slope-endpoints",
    zeroDurationIdentity: "boundary-step-from-rest",
    rampStepRounding: "exact-integer-for-all-frozen-products",
    downstreamOutletDistanceDiameters: 6,
    outletBoundary: "cbc-2d-regularized",
    geometryIdentity: "A8C-shortest-domain-and-runtime",
  }),
  gates: Object.freeze({
    maximumDensityDeviation:
      QUALIFICATION_CONTRACT.numericalStability.maximumDensityDeviation,
    maximumMach: QUALIFICATION_CONTRACT.numericalStability.maximumMach,
    requireEveryRunComplete: true,
    requireLongestRampPassAtEveryCorner: true,
    requireSampledDensityDeviationNonIncreasing: true,
    monotonicityAbsoluteTolerance: 1e-14,
    requireA8dTwentyDiameterAnchorsExact: true,
    requireByteIdenticalIndependentRepeat: true,
  }),
  interpretationRules: Object.freeze({
    uniformImpulsiveA8dHighSpeedStableCases: 0,
    frozenCornerCount: 9,
    formalIntegrationUnlocked: false,
  }),
});

export type RampSensitivityContract = typeof RAMP_SENSITIVITY_CONTRACT;
