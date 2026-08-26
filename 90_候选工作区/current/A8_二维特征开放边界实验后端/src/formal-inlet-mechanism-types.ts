import type { Stability } from "./formal-boundary-factorization-types.ts";

export type InletMechanismStrategy =
  | "legacy-zou-he-derived-density"
  | "legacy-zou-he-density-normalized"
  | "incoming-equilibrium-derived-density"
  | "incoming-regularized-derived-density"
  | "full-equilibrium-derived-density"
  | "full-regularized-derived-density"
  | "full-equilibrium-fixed-density"
  | "full-regularized-fixed-density";

export interface CaseDefinition {
  id: string;
  nominalDiameterScaleCells: number;
  relaxationTime: number;
  nx: number;
  ny: number;
  auditSteps: number;
  rampSteps: number;
  strategy: InletMechanismStrategy;
}

export interface AnchorMetrics {
  nominalDiameterScaleCells: number;
  relaxationTime: number;
  completedSteps: number;
  stability: Stability;
}

export interface CaseProvenance {
  strategyId: InletMechanismStrategy;
  formalSourceSha256: string;
  contractSha256: string;
  contractCommit: string;
  a8jArtifactSha256: string;
  a8kStoredArtifactSha256: string;
  a8kCanonicalArtifactSha256: string;
}

export interface ResidualExtremum {
  absoluteResidual: number;
  step: number;
  y: number;
  actual: number;
  target: number;
}

export interface BoundaryMomentDiagnostics {
  density: ResidualExtremum;
  ux: ResidualExtremum;
  uy: ResidualExtremum;
}

export interface MassDiagnostics {
  initialTotalMass: number;
  finalTotalMass: number;
  minimumTotalMass: number;
  maximumTotalMass: number;
  cumulativeBoundaryNetMassInput: number;
  totalMassChange: number;
  massChangeMinusCumulativeBoundaryNetInput: number;
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

export interface CaseDiagnostics {
  boundaryMoments: BoundaryMomentDiagnostics;
  mass: MassDiagnostics;
  populations: PopulationDiagnostics;
}

export interface AnchorComparison {
  checked: true;
  exactMatch: boolean;
  mismatchFields: string[];
}

export interface CaseResult {
  definition: CaseDefinition;
  provenance: CaseProvenance;
  run: {
    status: "completed" | "failed";
    completedSteps: number;
    stability?: Stability;
    diagnostics?: CaseDiagnostics;
    failure?: { nextStep: number; name: string; message: string };
  };
  gate: {
    executionPass: boolean;
    densityPass: boolean;
    machPass: boolean;
    pass: boolean;
  };
  a8jAnchorComparison?: AnchorComparison;
  a8kAnchorComparison?: AnchorComparison;
}

export interface CornerResult {
  nominalDiameterScaleCells: number;
  relaxationTime: number;
  passes: Record<InletMechanismStrategy, boolean>;
  passVector: string;
}

export type PairEffect =
  | "SECOND_SUFFICIENT_WHERE_FIRST_FAILS"
  | "SECOND_NOT_NECESSARY"
  | "SECOND_NOT_SUFFICIENT"
  | "BOTH_FAIL"
  | "MIXED_OR_UNRESOLVED";

export interface StrategySummary {
  strategy: InletMechanismStrategy;
  totalCases: number;
  completedCases: number;
  stableCases: number;
  maximumDensityDeviationRange: [number | null, number | null];
  maximumMachRange: [number | null, number | null];
  maximumBoundaryMomentResiduals: {
    density: number | null;
    ux: number | null;
    uy: number | null;
  };
  negativePopulationObservationCount: number;
  minimumPopulation: number | null;
}

export interface FormalInletMechanismResult {
  format: "VP-A8L-FORMAL-MRT-INLET-MECHANISM-MATRIX-v1";
  contractIdentity: {
    format: "VP-A8L-FORMAL-MRT-INLET-MECHANISM-CONTRACT-v1";
    contractSha256: string;
    contractCommit: string;
    formalSourceSha256: string;
    planningContractSha256: string;
    a8jArtifactSha256: string;
    a8kStoredArtifactSha256: string;
    a8kCanonicalArtifactSha256: string;
  };
  matrixComplete: boolean;
  cases: CaseResult[];
  corners: CornerResult[];
  strategySummaries: StrategySummary[];
  anchorComparison: {
    a8j: {
      checkedCases: number;
      exactMatches: number;
      mismatchCaseIds: string[];
    };
    a8k: {
      checkedCases: number;
      exactMatches: number;
      mismatchCaseIds: string[];
    };
  };
  causalAnalysis: {
    distinctPassVectors: string[];
    samePassVectorAtAllCorners: boolean;
    onlyStrategy8Passes: boolean;
    densityNormalizationSufficient: boolean;
    fixedDensity: {
      equilibrium: PairEffect;
      regularized: PairEffect;
    };
    completePopulationCoverage: {
      equilibrium: PairEffect;
      regularized: PairEffect;
    };
    regularizationIncrement: {
      incomingDerivedDensity: PairEffect;
      fullDerivedDensity: PairEffect;
      fullFixedDensity: PairEffect;
    };
    resolvedPattern: boolean;
    passCountRankingUsed: false;
    statement: string;
  };
  summary: {
    totalCases: number;
    completedCases: number;
    stableCases: number;
    stableCasesByStrategy: Record<InletMechanismStrategy, number>;
  };
  decision: {
    code: string;
    pass: boolean;
    internalChecks: {
      matrixComplete: boolean;
      a8jAnchorExact: boolean;
      a8kAnchorExact: boolean;
      causalPatternResolved: boolean;
    };
    independentRepeatRequired: true;
    formalSourceModified: false;
    formalIntegrationUnlocked: false;
    algorithmSelectionDelegatedToProReview: true;
    stopAfterEvidenceAndHandoff: true;
    statement: string;
    claimUpperBound: string;
  };
}

export { type Stability } from "./formal-boundary-factorization-types.ts";
