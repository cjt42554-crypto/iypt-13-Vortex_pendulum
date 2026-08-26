import { QUALIFICATION_CONTRACT } from "./contracts.ts";
import { ROBUSTNESS_CONTRACT } from "./robustness-contract.ts";

export const STARTUP_PROTOCOLS = Object.freeze([
  Object.freeze({
    id: "impulsive-uniform",
    initialField: "uniform-target-velocity",
    inletHistory: "constant-target-velocity",
    preparationRampStepsPerDiameter: 0,
    inAuditRampStepsPerDiameter: 0,
  }),
  Object.freeze({
    id: "cosine-ramp-from-rest",
    initialField: "uniform-rest",
    inletHistory: "half-cosine-zero-slope-endpoints",
    preparationRampStepsPerDiameter: 0,
    inAuditRampStepsPerDiameter: 20,
  }),
  Object.freeze({
    id: "compatible-ramp-preconditioned",
    initialField: "numerically-preconditioned-from-rest",
    inletHistory: "preaudit-half-cosine-then-constant-target-velocity",
    preparationRampStepsPerDiameter: 20,
    inAuditRampStepsPerDiameter: 0,
  }),
] as const);

/**
 * Frozen before the first A8D research matrix run.
 *
 * A8D is a diagnostic audit of the A8C startup-density failure.  It changes
 * neither the A8C contract nor its model identity.  Reynolds number remains a
 * derived diagnostic because velocity, tau and lattice cylinder diameter are
 * deliberately crossed independently.
 */
export const STARTUP_AUDIT_CONTRACT = Object.freeze({
  format: "VP-A8D-CBC2D-STARTUP-AUDIT-CONTRACT-v1",
  inheritedEvidence: Object.freeze({
    a8cContract: ROBUSTNESS_CONTRACT.format,
    a8cArtifactSha256:
      "5cb66d6052f14b2d891841e8282bb5fb2b30f49b007692b09198cd13f94bde98",
    a8cDecision: "NO-GO-A8C-CBC2D-FROZEN-ROBUSTNESS-MATRIX",
  }),
  matrix: Object.freeze({
    inletVelocityLattice: Object.freeze([
      0.06,
      0.0625,
      0.065,
      0.0675,
      0.07,
      0.0725,
      0.075,
      0.0775,
      0.08,
    ]),
    relaxationTime: ROBUSTNESS_CONTRACT.axes.relaxationTime,
    nominalCylinderDiameterCells:
      ROBUSTNESS_CONTRACT.axes.nominalCylinderDiameterCells,
    downstreamOutletDistanceDiameters: 6,
    outletBoundary: "cbc-2d-regularized",
    protocols: STARTUP_PROTOCOLS,
    geometryIdentity: "A8C-shortest-domain-and-runtime",
  }),
  uniformNoSolidGuard: Object.freeze({
    inletVelocityLattice: 0.08,
    relaxationTime: ROBUSTNESS_CONTRACT.axes.relaxationTime,
    outletBoundaries: Object.freeze([
      "zou-he-pressure",
      "regularized-fixed-pressure",
      "cbc-2d-regularized",
    ] as const),
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
    requireUniformNoSolidGuardPass: true,
    requireA8cImpulsiveAnchorsExact: true,
    requireImpulsiveEndpointBracketAtEveryCorner: true,
    requireImpulsiveMonotoneSampledDensityDeviation: true,
    monotonicityAbsoluteTolerance: 1e-14,
    maximumSampledBracketWidth: 0.0025,
    requireByteIdenticalIndependentRepeat: true,
  }),
  attributionRules: Object.freeze({
    highSpeedLevel: 0.08,
    impulsiveFailureReproducedWhenStableCases: 0,
    alternativeRemovesHighSpeedFailureWhenStableCases: 9,
    cylinderLocalDensityPeakMaximumSurfaceClearanceCells: 1.5,
    formalIntegrationUnlocked: false,
  }),
});

export type StartupProtocol = typeof STARTUP_PROTOCOLS[number];
export type StartupProtocolId = StartupProtocol["id"];
export type StartupAuditContract = typeof STARTUP_AUDIT_CONTRACT;
