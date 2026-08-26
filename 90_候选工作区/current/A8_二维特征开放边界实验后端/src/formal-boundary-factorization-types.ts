import { FORMAL_BOUNDARY_FACTORIZATION_CONTRACT as CONTRACT } from
  "./formal-boundary-factorization-contract.ts";

export type AuditInlet =
  | "formal-zou-he-velocity"
  | "regularized-prescribed-state";
export type AuditOutlet = "formal-zou-he-pressure" | "cbc-2d-regularized";
export type Attribution =
  | "OUTLET_REPLACEMENT_SUFFICIENT"
  | "INLET_REPLACEMENT_SUFFICIENT"
  | "BOTH_SINGLE_REPLACEMENTS_SUFFICIENT"
  | "DOUBLE_REPLACEMENT_REQUIRED"
  | "NO_TESTED_REPLACEMENT_SUFFICIENT"
  | "BASELINE_ALREADY_PASSING"
  | "MIXED_OR_UNRESOLVED";

export interface Stability {
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
  };
}

export interface A8jAnchor {
  nominalDiameterScaleCells: number;
  relaxationTime: number;
  completedSteps: number;
  stability: Stability;
}

export interface CaseDefinition {
  id: string;
  nominalDiameterScaleCells: number;
  relaxationTime: number;
  nx: number;
  ny: number;
  auditSteps: number;
  rampSteps: number;
  inletBoundary: AuditInlet;
  outletBoundary: AuditOutlet;
}

export interface CaseResult {
  definition: CaseDefinition;
  run: {
    status: "completed" | "failed";
    completedSteps: number;
    stability?: Stability;
    failure?: { nextStep: number; name: string; message: string };
  };
  gate: {
    executionPass: boolean;
    densityPass: boolean;
    machPass: boolean;
    pass: boolean;
  };
  baselineComparison?: {
    checked: true;
    exactMatch: boolean;
    mismatchFields: string[];
  };
}

export interface A8kResult {
  format: "VP-A8K-FORMAL-MRT-BOUNDARY-FACTORIZATION-MATRIX-v1";
  contractIdentity: {
    format: typeof CONTRACT.format;
    formalSourceSha256: string;
    a8jArtifactSha256: string;
  };
  matrixComplete: boolean;
  cases: CaseResult[];
  corners: Array<{
    nominalDiameterScaleCells: number;
    relaxationTime: number;
    attribution: Attribution;
    passes: Record<string, boolean>;
  }>;
  combinationSummaries: Array<{
    inletBoundary: AuditInlet;
    outletBoundary: AuditOutlet;
    totalCases: number;
    completedCases: number;
    stableCases: number;
    densityDeviationRange: [number, number];
    maximumMachRange: [number, number];
  }>;
  baselineComparison: {
    checkedCases: number;
    exactMatches: number;
    mismatchCaseIds: string[];
  };
  summary: {
    totalCases: number;
    completedCases: number;
    stableCases: number;
    globalAttribution: Attribution;
  };
  decision: {
    code: string;
    pass: boolean;
    formalSourceModified: false;
    cbcIntegratedIntoFormalKernel: false;
    formalIntegrationUnlocked: false;
    statement: string;
    claimUpperBound: string;
  };
}
