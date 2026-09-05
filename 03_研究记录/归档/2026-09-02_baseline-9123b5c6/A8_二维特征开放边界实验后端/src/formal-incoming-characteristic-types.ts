import type { LbmBodyKinematics } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import type { BoundaryField } from "./formal-boundary-factorization-boundaries.ts";
import type {
  FormalIncomingCharacteristicStartupProtocol,
  FormalIncomingCharacteristicStrategy,
} from "./formal-incoming-characteristic-contract.ts";
import type {
  AcousticMetrics,
  ForceDiagnostics,
  PopulationDiagnostics,
  PopulationMassStepRecord,
  PopulationMassSummary,
  QualificationPhase,
  QualificationStability,
} from "./formal-inlet-qualification-types.ts";

export interface IncomingCharacteristicProvenance {
  formalSourceSha256: string;
  proDecisionSha256: string;
  a8mStoredArtifactSha256: string;
  a8mCanonicalArtifactSha256: string;
  shadowLedgerSourceSha256: string;
  contractSha256: string;
  contractDocumentSha256: string;
  contractCommit: string;
  implementationCommit: string;
  implementationTreeSha256: string;
}

export interface IncomingCharacteristicStartupDefinition {
  id: string;
  nominalDiameterCells: number;
  relaxationTime: number;
  nx: number;
  ny: number;
  auditSteps: number;
  rampSteps: number;
  preRunSteps: number;
  strategy: FormalIncomingCharacteristicStrategy;
  protocol: FormalIncomingCharacteristicStartupProtocol;
  initialField: "uniform-rest" | "uniform-target-velocity";
  body: LbmBodyKinematics | null;
}

export interface ReconstructionStepRecord {
  step: number;
  phase: QualificationPhase;
  farFieldUx: number;
  rowCount: number;
  knownMomentK: number[];
  discriminant: number[];
  targetRho: number[];
  targetUx: number[];
  targetUy: number[];
  actualRho: number[];
  actualUx: number[];
  actualUy: number[];
  incomingCharacteristicResidual: number[];
  discreteCompatibilityResidual: number[];
  densityMomentResidual: number[];
  uxMomentResidual: number[];
  uyMomentResidual: number[];
  knownPopulationMaximumAbsoluteDifference: number[];
  boundaryMach: number[];
}

export interface ReconstructionSummary {
  applicable: boolean;
  stepRecordCount: number;
  rowRecordCount: number;
  minimumKnownMomentK: number | null;
  minimumDiscriminant: number | null;
  minimumTargetDensity: number | null;
  maximumBoundaryMach: number | null;
  maximumIncomingCharacteristicAbsoluteResidual: number | null;
  maximumDiscreteCompatibilityAbsoluteResidual: number | null;
  maximumDensityMomentAbsoluteResidual: number | null;
  maximumVelocityMomentAbsoluteResidual: number | null;
  maximumKnownPopulationAbsoluteDifference: number | null;
  cumulativeNonIncomingAbsoluteModification: number;
  gates: {
    complete: boolean;
    finite: boolean;
    knownMomentPass: boolean | null;
    discriminantPass: boolean | null;
    densityPass: boolean | null;
    boundaryMachPass: boolean | null;
    incomingCharacteristicPass: boolean | null;
    discreteCompatibilityPass: boolean | null;
    densityMomentPass: boolean | null;
    velocityMomentPass: boolean | null;
    knownPopulationPass: boolean | null;
    nonIncomingModificationPass: boolean;
    pass: boolean;
  };
}

export interface LegacyAnchorComparison {
  checked: true;
  exactMatch: boolean;
  expectedCanonicalLength: number;
  actualCanonicalLength: number;
}

export interface IncomingCharacteristicStartupResult {
  definition: IncomingCharacteristicStartupDefinition;
  provenance: IncomingCharacteristicProvenance;
  run: {
    status: "completed" | "failed";
    completedPreRunSteps: number;
    completedAuditSteps: number;
    preRunStability?: QualificationStability;
    auditStability?: QualificationStability;
    populationDiagnostics?: PopulationDiagnostics;
    forceDiagnostics?: ForceDiagnostics;
    maximumUniformStateAbsoluteError?: number;
    massStepRecords: PopulationMassStepRecord[];
    massSummary?: PopulationMassSummary;
    reconstructionStepRecords: ReconstructionStepRecord[];
    reconstructionSummary?: ReconstructionSummary;
    failure?: {
      nextStep: number;
      phase: QualificationPhase;
      name: string;
      message: string;
    };
  };
  gate: {
    executionPass: boolean;
    densityPass: boolean;
    machPass: boolean;
    massPass: boolean;
    reconstructionPass: boolean;
    uniformStatePass: boolean | null;
    pass: boolean;
  };
  legacyAnchorComparison?: LegacyAnchorComparison;
}

export interface IncomingCharacteristicStartupExecution {
  result: IncomingCharacteristicStartupResult;
  auditEndField?: BoundaryField;
}

export interface IncomingCharacteristicInteriorComparison {
  nominalDiameterCells: number;
  relaxationTime: number;
  protocol: FormalIncomingCharacteristicStartupProtocol;
  legacyCaseId: string;
  candidateCaseId: string;
  comparedCells: number;
  densityRmsDifference: number;
  velocityRmsDifference: number;
  velocityRmsDifferenceOverInletVelocity: number;
  meanDragRelativeDifference: number | null;
  liftRmsRelativeDifference: number | null;
  densityEquivalent: boolean;
  velocityEquivalent: boolean;
  meanDragEquivalent: boolean | null;
  liftRmsEquivalent: boolean | null;
  qualificationApplicable: boolean;
  pass: boolean | null;
}

export interface IncomingCharacteristicAcousticDefinition {
  id: string;
  strategy: FormalIncomingCharacteristicStrategy;
  relaxationTime: number;
}

export interface IncomingCharacteristicAcousticTrace {
  role: "test" | "extended-reference";
  nx: number;
  ny: number;
  pulseCenterX: number;
  probeX: number;
  completedSteps: number;
  probeDensity: number[];
  probeUx: number[];
  domainMeanDensity: number[];
  domainMeanUx: number[];
  initialDomainMeanDensity: number;
  initialDomainMeanUx: number;
  massStepRecords: PopulationMassStepRecord[];
  massSummary: PopulationMassSummary;
  reconstructionStepRecords: ReconstructionStepRecord[];
  reconstructionSummary: ReconstructionSummary;
  failure?: { nextStep: number; name: string; message: string };
}

export interface IncomingCharacteristicAcousticResult {
  definition: IncomingCharacteristicAcousticDefinition;
  provenance: IncomingCharacteristicProvenance;
  test: IncomingCharacteristicAcousticTrace;
  extendedReference: IncomingCharacteristicAcousticTrace;
  metrics: AcousticMetrics;
  gate: {
    executionPass: boolean;
    massPass: boolean;
    reconstructionPass: boolean;
    incidentDetected: boolean;
    referenceMatchPass: boolean;
    characteristicReflectionPass: boolean;
    densityReflectionPass: boolean;
    velocityReflectionPass: boolean;
    energyReflectionPass: boolean;
    phasePass: boolean;
    meanDensityDriftPass: boolean;
    meanVelocityDriftPass: boolean;
    pass: boolean;
  };
  legacyAnchorComparison?: LegacyAnchorComparison;
}

export interface IncomingCharacteristicQualificationResult {
  format: "VP-A8N-INCOMING-CHARACTERISTIC-QUALIFICATION-v1";
  contractIdentity: IncomingCharacteristicProvenance & {
    format: "VP-A8N-INCOMING-CHARACTERISTIC-QUALIFICATION-CONTRACT-v1";
  };
  startupCases: IncomingCharacteristicStartupResult[];
  interiorComparisons: IncomingCharacteristicInteriorComparison[];
  acousticCases: IncomingCharacteristicAcousticResult[];
  legacyAnchorComparison: {
    startup: {
      checkedCases: number;
      exactMatches: number;
      mismatchCaseIds: string[];
    };
    acoustic: {
      checkedCases: number;
      exactMatches: number;
      mismatchCaseIds: string[];
    };
  };
  qualification: {
    candidate: {
      startupCompletedCases: number;
      startupStableCases: number;
      startupReconstructionPassedCases: number;
      massPassedStartupCases: number;
      acousticPassedCases: number;
      massEligible: boolean;
      acousticEligible: boolean;
      startupEligible: boolean;
      interiorEligible: boolean;
      readyForProSelection: boolean;
    };
    legacy: {
      startupStableCases: number;
      acousticPassedCases: number;
    };
  };
  evidenceDecision: {
    code: string;
    pass: boolean;
    internalChecks: {
      startupMatrixComplete: boolean;
      acousticMatrixComplete: boolean;
      allFormalShadowsExact: boolean;
      allMassLedgersClose: boolean;
      allCandidateReconstructionsComplete: boolean;
      allCandidateWritesIncomingOnly: boolean;
      legacyStartupAnchorsExact: boolean;
      legacyAcousticAnchorsExact: boolean;
    };
    independentRepeatRequired: true;
    formalSourceModified: false;
    formalIntegrationUnlocked: false;
    candidateAutomaticallyApproved: false;
    stopAfterEvidenceAndHandoff: true;
    statement: string;
    claimUpperBound: string;
  };
  candidateDecision: {
    code: string;
    pass: boolean;
    statement: string;
  };
}
