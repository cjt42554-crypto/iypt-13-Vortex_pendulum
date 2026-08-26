import { QUALIFICATION_CONTRACT } from "./contracts.ts";
import { ROBUSTNESS_CONTRACT } from "./robustness-contract.ts";

export const COLLISION_KERNELS = Object.freeze([
  "regularized-bgk",
  "raw-bgk",
] as const);

export const COLLISION_STARTUP_PROTOCOLS = Object.freeze([
  Object.freeze({
    id: "uniform-impulsive",
    initialField: "uniform-target-velocity",
    rampDurationDiameters: 0,
  }),
  Object.freeze({
    id: "cosine-ramp-from-rest-5d",
    initialField: "uniform-rest",
    rampDurationDiameters: 5,
  }),
] as const);

/** Frozen before the first A8F research matrix run. */
export const COLLISION_CONTRAST_CONTRACT = Object.freeze({
  format: "VP-A8F-CBC2D-COLLISION-CONTRAST-CONTRACT-v1",
  inheritedEvidence: Object.freeze({
    a8dArtifactSha256:
      "4a04dcf21f5a194ad2e2746836560f88b88af00d3855866111738941bc4ca0fe",
    a8eArtifactSha256:
      "fa454eb4dee6a8d210f24ff2ee2053ead8b9793bd2fc664d1c72cb8ad2d474ee",
    a8dDecision:
      "PASS-A8D-CBC2D-STARTUP-AUDIT-INTERNAL-GATES-CANDIDATE-ONLY",
    a8eDecision: "NO-GO-A8E-CBC2D-RAMP-SENSITIVITY-INTERNAL-GATES",
  }),
  matrix: Object.freeze({
    inletVelocityLattice: 0.08,
    relaxationTime: ROBUSTNESS_CONTRACT.axes.relaxationTime,
    nominalCylinderDiameterCells:
      ROBUSTNESS_CONTRACT.axes.nominalCylinderDiameterCells,
    downstreamOutletDistanceDiameters: 6,
    outletBoundary: "cbc-2d-regularized",
    collisionKernels: COLLISION_KERNELS,
    startupProtocols: COLLISION_STARTUP_PROTOCOLS,
    rawKernelIdentity:
      "raw-srt-bgk-collision-with-regularized-inlet-and-outlet-reconstruction",
    geometryIdentity: "A8C-shortest-domain-and-runtime",
  }),
  uniformNoSolidGuard: Object.freeze({
    collisionKernel: "raw-bgk",
    inletVelocityLattice: 0.08,
    relaxationTime: ROBUSTNESS_CONTRACT.axes.relaxationTime,
    nominalCylinderDiameterCells: 16,
    downstreamOutletDistanceDiameters: 6,
    steps: 6,
    maximumAbsoluteStateError: 1e-12,
  }),
  gates: Object.freeze({
    maximumDensityDeviation:
      QUALIFICATION_CONTRACT.numericalStability.maximumDensityDeviation,
    maximumMach: QUALIFICATION_CONTRACT.numericalStability.maximumMach,
    requireEveryRunComplete: true,
    requireRawUniformNoSolidGuardPass: true,
    requireRegularizedA8dA8eAnchorsExact: true,
    requireSameQualitativeStartupPatternAcrossKernels: true,
    expectedImpulsiveStableCorners: 0,
    expectedFiveDiameterRampStableCorners: 9,
    requireByteIdenticalIndependentRepeat: true,
  }),
  interpretationRules: Object.freeze({
    formalIntegrationUnlocked: false,
    rawBgkIsFormalMrtEquivalent: false,
  }),
});

export type CollisionContrastKernel = typeof COLLISION_KERNELS[number];
export type CollisionStartupProtocol = typeof COLLISION_STARTUP_PROTOCOLS[number];
export type CollisionStartupProtocolId = CollisionStartupProtocol["id"];
export type CollisionContrastContract = typeof COLLISION_CONTRAST_CONTRACT;
