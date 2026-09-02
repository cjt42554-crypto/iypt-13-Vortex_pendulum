export type JsonRecord = Record<string, any>;

export interface ExperimentValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly dependency: boolean;
}

export interface ExperimentValidationResult {
  readonly pass: boolean;
  readonly structurallyValid: boolean;
  readonly issues: readonly ExperimentValidationIssue[];
  readonly structuralIssues: readonly ExperimentValidationIssue[];
  readonly dependencies: readonly ExperimentValidationIssue[];
}

export interface ExperimentValidationOptions {
  requireReady?: boolean;
  allowSynthetic?: boolean;
}
