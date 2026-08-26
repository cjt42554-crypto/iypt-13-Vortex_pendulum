import { QUALIFICATION_CONTRACT } from "./contracts.ts";
import { ROBUSTNESS_CONTRACT } from "./robustness-contract.ts";

export const FORMAL_KERNEL_STARTUP_PROTOCOLS = Object.freeze([
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

/** Frozen before the first A8H research matrix run. */
export const FORMAL_KERNEL_STARTUP_CONTRACT = Object.freeze({
  format: "VP-A8H-FORMAL-MRT-BRINKMAN-STARTUP-CONTRACT-v1",
  formalSource: Object.freeze({
    relativePath: "02_模拟程序/src/solvers/highFidelity/lbm.ts",
    sha256:
      "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
    accessMode: "read-only-import-from-candidate-audit",
  }),
  inheritedCandidateEvidence: Object.freeze({
    a8dArtifactSha256:
      "4a04dcf21f5a194ad2e2746836560f88b88af00d3855866111738941bc4ca0fe",
    a8eArtifactSha256:
      "fa454eb4dee6a8d210f24ff2ee2053ead8b9793bd2fc664d1c72cb8ad2d474ee",
    candidateImpulsiveStableCorners: 0,
    candidateFiveDiameterRampStableCorners: 9,
  }),
  matrix: Object.freeze({
    inletVelocityLattice: 0.08,
    relaxationTime: ROBUSTNESS_CONTRACT.axes.relaxationTime,
    nominalCylinderDiameterCells:
      ROBUSTNESS_CONTRACT.axes.nominalCylinderDiameterCells,
    downstreamOutletDistanceDiameters: 6,
    startupProtocols: FORMAL_KERNEL_STARTUP_PROTOCOLS,
    penalizationTimeSteps: 1.5,
    maskHalfThicknessCells: 0.75,
    outerBoundary: "open-periodic-crossflow",
    geometryIdentity: "A8C-shortest-domain-and-runtime",
    modelIdentity:
      "existing-formal-source-D2Q9-MRT-diffuse-Brinkman-with-ZouHe-open-boundary",
  }),
  uniformNoSolidGuard: Object.freeze({
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
    requireUniformNoSolidGuardPass: true,
    requireSameQualitativeStartupPatternAsCandidate: true,
    expectedImpulsiveStableCorners: 0,
    expectedFiveDiameterRampStableCorners: 9,
    requireFormalSourceHashExact: true,
    requireByteIdenticalIndependentRepeat: true,
  }),
  interpretationRules: Object.freeze({
    formalSourceModified: false,
    cbcIntegratedIntoFormalKernel: false,
    formalIntegrationUnlocked: false,
  }),
});

export type FormalKernelStartupProtocol =
  typeof FORMAL_KERNEL_STARTUP_PROTOCOLS[number];
export type FormalKernelStartupProtocolId = FormalKernelStartupProtocol["id"];
export type FormalKernelStartupContract = typeof FORMAL_KERNEL_STARTUP_CONTRACT;
