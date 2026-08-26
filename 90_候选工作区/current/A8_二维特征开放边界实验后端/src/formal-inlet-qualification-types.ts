import type { LbmBodyKinematics } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import type {
  FormalInletQualificationStartupProtocol,
  FormalInletQualificationStrategy,
} from "./formal-inlet-qualification-contract.ts";

export interface QualificationGeometry {
  nominalDiameterCells: number;
  nx: number;
  ny: number;
  auditSteps: number;
  rampSteps: number;
  bodyCenterX: number;
  bodyCenterY: number;
  bodyRadius: number;
}

export interface StartupCaseDefinition {
  id: string;
  nominalDiameterCells: number;
  relaxationTime: number;
  nx: number;
  ny: number;
  auditSteps: number;
  rampSteps: number;
  preRunSteps: number;
  strategy: FormalInletQualificationStrategy;
  protocol: FormalInletQualificationStartupProtocol;
  initialField: "uniform-rest" | "uniform-target-velocity";
  body: LbmBodyKinematics | null;
}

export type QualificationPhase = "prerun" | "audit" | "acoustic";

export interface PopulationMassStepRecord {
  step: number;
  phase: QualificationPhase;
  preCollisionTotalMass: number;
  postCollisionTotalMass: number;
  collisionMassResidual: number;
  leftStreamingOutByDirection: number[];
  rightStreamingOutByDirection: number[];
  leftStreamingOutTotal: number;
  rightStreamingOutTotal: number;
  postStreamRetainedMass: number;
  formalLeftWritebackByDirection: number[];
  formalRightWritebackByDirection: number[];
  formalLeftWritebackTotal: number;
  formalRightWritebackTotal: number;
  postFormalBoundaryMass: number;
  formalShadowMaximumPopulationAbsoluteDifference: number;
  formalShadowMismatchCount: number;
  adapterByDirection: number[];
  adapterAbsoluteByDirection: number[];
  adapterIncoming: number;
  adapterOutgoing: number;
  adapterStationaryCross: number;
  adapterTotal: number;
  postCandidateAdapterTotalMass: number;
  actualMassChange: number;
  budgetMassChange: number;
  stepClosureResidual: number;
  absoluteMassExchange: number;
  normalizedStepClosureResidual: number;
  cumulativeClosureResidual: number;
  cumulativeAbsoluteMassExchange: number;
  normalizedCumulativeClosureResidual: number;
}

export interface PopulationMassSummary {
  stepRecordCount: number;
  initialTotalMass: number;
  finalTotalMass: number;
  cumulativeCollisionMassResidual: number;
  cumulativeLeftStreamingOut: number;
  cumulativeRightStreamingOut: number;
  cumulativeFormalLeftWriteback: number;
  cumulativeFormalRightWriteback: number;
  cumulativeAdapterMass: number;
  cumulativeAdapterByDirection: number[];
  cumulativeAdapterAbsoluteByDirection: number[];
  cumulativeAdapterIncoming: number;
  cumulativeAdapterOutgoing: number;
  cumulativeAdapterStationaryCross: number;
  cumulativeAdapterAbsoluteTotal: number;
  cumulativeClosureResidual: number;
  cumulativeAbsoluteMassExchange: number;
  maximumNormalizedStepClosureResidual: number;
  maximumNormalizedCumulativeClosureResidual: number;
  maximumFormalShadowPopulationAbsoluteDifference: number;
  formalShadowMismatchCount: number;
  adapterMassOverInitialMass: number;
  adapterMassOverAbsoluteFormalBoundaryExchange: number;
  nonIncomingAbsoluteModificationFraction: number;
  gates: {
    formalShadowExact: boolean;
    stepClosurePass: boolean;
    cumulativeClosurePass: boolean;
    s2AdapterMassOverInitialPass: boolean | null;
    s2AdapterMassOverFormalExchangePass: boolean | null;
    s2NonIncomingModificationPass: boolean | null;
    pass: boolean;
  };
}

export interface QualificationStability {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumMach: number;
  maximumMachStep: number;
  minimumDensity: number;
  maximumDensity: number;
  densityExtremum: {
    kind: "minimum" | "maximum";
    density: number;
    x: number;
    y: number;
    brinkmanMaskIndicator: number;
    signedDistanceFromNominalSurfaceCells?: number;
  };
}

export interface PopulationDiagnostics {
  nonFiniteStateDetected: boolean;
  nonFinitePopulationObservationCount: number;
  negativePopulationObservationCount: number;
  maximumNegativePopulationCountPerStep: number;
  minimumPopulation: number;
  minimumPopulationStep: number;
  minimumPopulationCell: number;
  minimumPopulationDirection: number;
}

export interface ForceDiagnostics {
  sampleCount: number;
  meanDrag: number;
  liftRms: number;
  maximumAbsoluteDrag: number;
  maximumAbsoluteLift: number;
}

export interface ExactAnchorComparison {
  checked: true;
  exactMatch: boolean;
  mismatchFields: string[];
}

export interface StartupCaseResult {
  definition: StartupCaseDefinition;
  provenance: QualificationProvenance;
  run: {
    status: "completed" | "failed";
    completedPreRunSteps: number;
    completedAuditSteps: number;
    preRunStability?: QualificationStability;
    auditStability?: QualificationStability;
    populationDiagnostics?: PopulationDiagnostics;
    forceDiagnostics?: ForceDiagnostics;
    massStepRecords: PopulationMassStepRecord[];
    massSummary?: PopulationMassSummary;
    auditEndFieldSha256?: string;
    failure?: { nextStep: number; phase: QualificationPhase; name: string; message: string };
  };
  gate: {
    executionPass: boolean;
    densityPass: boolean;
    machPass: boolean;
    massPass: boolean;
    pass: boolean;
  };
  a8lAnchorComparison?: ExactAnchorComparison;
  a8hAnchorComparison?: ExactAnchorComparison;
}

export interface S1S2InteriorComparison {
  nominalDiameterCells: number;
  relaxationTime: number;
  protocol: FormalInletQualificationStartupProtocol;
  s1CaseId: string;
  s2CaseId: string;
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
  pass: boolean;
}

export interface AcousticCaseDefinition {
  id: string;
  strategy: FormalInletQualificationStrategy;
  relaxationTime: number;
}

export interface AcousticTrace {
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
  failure?: { nextStep: number; name: string; message: string };
}

export interface AcousticMetrics {
  incidentCharacteristicAmplitude: number;
  incidentDensityAmplitude: number;
  incidentVelocityAmplitude: number;
  incidentAmplitudeOverInitializationPeak: number;
  characteristicAmplitudeReflectionRatio: number;
  densityAmplitudeReflectionRatio: number;
  velocityAmplitudeReflectionRatio: number;
  acousticEnergyReflectionRatio: number;
  phaseLagSteps: number;
  phaseErrorRadians: number;
  phasePolarity: 1 | -1;
  phaseDetectable: boolean;
  maximumMeanDensityDrift: number;
  maximumMeanStreamwiseVelocityDrift: number;
  incidentWindowTestReferenceRelativeRmsMismatch: number;
}

export interface AcousticCaseResult {
  definition: AcousticCaseDefinition;
  provenance: QualificationProvenance;
  test: AcousticTrace;
  extendedReference: AcousticTrace;
  metrics: AcousticMetrics;
  gate: {
    executionPass: boolean;
    massPass: boolean;
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
}

export interface QualificationProvenance {
  formalSourceSha256: string;
  proDecisionSha256: string;
  a8lAdapterSourceSha256: string;
  a8lStoredArtifactSha256: string;
  a8lCanonicalArtifactSha256: string;
  a8hArtifactSha256: string;
  contractSha256: string;
  contractCommit: string;
}

export interface FormalInletQualificationResult {
  format: "VP-A8M-FORMAL-MRT-INLET-QUALIFICATION-v1";
  contractIdentity: QualificationProvenance & {
    format: "VP-A8M-FORMAL-MRT-INLET-QUALIFICATION-CONTRACT-v1";
  };
  startupCases: StartupCaseResult[];
  interiorComparisons: S1S2InteriorComparison[];
  acousticCases: AcousticCaseResult[];
  anchorComparison: {
    a8l: { checkedCases: number; exactMatches: number; mismatchCaseIds: string[] };
    a8h: { checkedCases: number; exactMatches: number; mismatchCaseIds: string[] };
  };
  qualification: {
    byStrategy: Record<FormalInletQualificationStrategy, {
      startupCompletedCases: number;
      startupStableCases: number;
      massPassedStartupCases: number;
      acousticPassedCases: number;
      massEligible: boolean;
      acousticEligible: boolean;
      startupEligible: boolean;
    }>;
    s2MassEligible: boolean;
    s2AcousticEligible: boolean;
    s2StartupEligible: boolean;
    s2ReadyForProSelection: boolean;
    legacyEstablishedAlternative: boolean;
    s2NonIncomingModificationDominant: boolean;
  };
  evidenceDecision: {
    code: string;
    pass: boolean;
    internalChecks: {
      startupMatrixComplete: boolean;
      acousticMatrixComplete: boolean;
      allFormalShadowsExact: boolean;
      allMassLedgersClose: boolean;
      a8lAnchorsExact: boolean;
      a8hAnchorsExact: boolean;
    };
    independentRepeatRequired: true;
    formalSourceModified: false;
    formalIntegrationUnlocked: false;
    s2AutomaticallyApproved: false;
    stopAfterEvidenceAndHandoff: true;
    statement: string;
    claimUpperBound: string;
  };
}
