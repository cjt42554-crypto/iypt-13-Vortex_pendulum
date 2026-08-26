import { QUALIFICATION_CONTRACT } from "./contracts.ts";
import { ROBUSTNESS_CONTRACT } from "./robustness-contract.ts";

export const LATTICE_PHASE_STARTUP_PROTOCOLS = Object.freeze([
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

/** Frozen before the first A8G research matrix run. */
export const LATTICE_PHASE_CONTRACT = Object.freeze({
  format: "VP-A8G-CBC2D-LATTICE-PHASE-CONTRACT-v1",
  inheritedEvidence: Object.freeze({
    a8dArtifactSha256:
      "4a04dcf21f5a194ad2e2746836560f88b88af00d3855866111738941bc4ca0fe",
    a8eArtifactSha256:
      "fa454eb4dee6a8d210f24ff2ee2053ead8b9793bd2fc664d1c72cb8ad2d474ee",
    a8fArtifactSha256:
      "009d097f15145cdbfa71bb610fba3bdaa5812d826db8e774a00ab273ce7215a9",
  }),
  matrix: Object.freeze({
    inletVelocityLattice: 0.08,
    relaxationTime: ROBUSTNESS_CONTRACT.axes.relaxationTime,
    nominalCylinderDiameterCells:
      ROBUSTNESS_CONTRACT.axes.nominalCylinderDiameterCells,
    centerXPhaseOffsetCells: Object.freeze([0, 0.25, 0.5, 0.75]),
    centerYPhaseOffsetCells: Object.freeze([0, 0.25, 0.5, 0.75]),
    startupProtocols: LATTICE_PHASE_STARTUP_PROTOCOLS,
    collisionKernel: "regularized-bgk",
    downstreamOutletDistanceDiameters: 6,
    outletBoundary: "cbc-2d-regularized",
    geometryIdentity: "A8C-shortest-domain-and-runtime-with-subcell-center-shift",
  }),
  gates: Object.freeze({
    maximumDensityDeviation:
      QUALIFICATION_CONTRACT.numericalStability.maximumDensityDeviation,
    maximumMach: QUALIFICATION_CONTRACT.numericalStability.maximumMach,
    requireEveryRunComplete: true,
    requireBasePhaseA8dA8eAnchorsExact: true,
    minimumDistinctSolidMaskFingerprintsPerDiameter: 4,
    requireEveryPhaseStartupPattern: true,
    expectedImpulsiveStableCornersPerPhase: 0,
    expectedFiveDiameterRampStableCornersPerPhase: 9,
    requireByteIdenticalIndependentRepeat: true,
  }),
  interpretationRules: Object.freeze({
    phaseCount: 16,
    formalIntegrationUnlocked: false,
    latticePhaseInvarianceIsBounceBackModelValidation: false,
  }),
});

export type LatticePhaseStartupProtocol =
  typeof LATTICE_PHASE_STARTUP_PROTOCOLS[number];
export type LatticePhaseStartupProtocolId = LatticePhaseStartupProtocol["id"];
export type LatticePhaseContract = typeof LATTICE_PHASE_CONTRACT;
