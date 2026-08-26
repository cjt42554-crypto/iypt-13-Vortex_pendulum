import { FORMAL_INLET_MECHANISM_CONTRACT as CONTRACT } from
  "./formal-inlet-mechanism-contract.ts";
import { runFormalInletMechanismCase } from
  "./formal-inlet-mechanism-case.ts";
import type {
  AnchorMetrics,
  CaseDefinition,
  CaseProvenance,
  CaseResult,
  CornerResult,
  FormalInletMechanismResult,
  InletMechanismStrategy,
  PairEffect,
  StrategySummary,
} from "./formal-inlet-mechanism-types.ts";

export type {
  AnchorComparison,
  AnchorMetrics,
  BoundaryMomentDiagnostics,
  CaseDefinition,
  CaseDiagnostics,
  CaseProvenance,
  CaseResult,
  CornerResult,
  FormalInletMechanismResult,
  InletMechanismStrategy,
  MassDiagnostics,
  PairEffect,
  PopulationDiagnostics,
  ResidualExtremum,
  Stability,
  StrategySummary,
} from "./formal-inlet-mechanism-types.ts";
export { runFormalInletMechanismCase } from
  "./formal-inlet-mechanism-case.ts";

const STRATEGIES = CONTRACT.strategies.map((entry) =>
  entry.id as InletMechanismStrategy);

function scaledInteger(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

function strategyTag(strategy: InletMechanismStrategy): string {
  const ordinal = CONTRACT.strategies.find((entry) => entry.id === strategy)?.ordinal;
  if (ordinal === undefined) throw new Error(`unregistered A8L strategy: ${strategy}`);
  return `s${ordinal.toString().padStart(2, "0")}`;
}

export function buildFormalInletMechanismCases(): CaseDefinition[] {
  const definitions: CaseDefinition[] = [];
  for (const geometry of CONTRACT.matrix.geometry) {
    for (const relaxationTime of CONTRACT.matrix.relaxationTime) {
      for (const strategy of STRATEGIES) {
        definitions.push({
          id: [
            `d${scaledInteger(geometry.nominalDiameterScaleCells, 1, 2)}`,
            "u0800",
            `t${scaledInteger(relaxationTime, 1_000, 4)}`,
            "r2000",
            strategyTag(strategy),
            "nobody",
          ].join("-"),
          nominalDiameterScaleCells: geometry.nominalDiameterScaleCells,
          relaxationTime,
          nx: geometry.nx,
          ny: geometry.ny,
          auditSteps: geometry.auditSteps,
          rampSteps: geometry.rampSteps,
          strategy,
        });
      }
    }
  }
  return definitions;
}

function key(diameter: number, relaxationTime: number): string {
  return `${diameter}:${relaxationTime}`;
}

function range(values: number[]): [number | null, number | null] {
  return values.length === 0
    ? [null, null]
    : [Math.min(...values), Math.max(...values)];
}

function maximumOrNull(values: number[]): number | null {
  return values.length === 0 ? null : Math.max(...values);
}

function minimumOrNull(values: number[]): number | null {
  return values.length === 0 ? null : Math.min(...values);
}

function summarizeStrategy(
  cases: CaseResult[],
  strategy: InletMechanismStrategy,
): StrategySummary {
  const selected = cases.filter((entry) => entry.definition.strategy === strategy);
  const completed = selected.filter((entry) => entry.run.status === "completed");
  const stability = completed.flatMap((entry) =>
    entry.run.stability === undefined ? [] : [entry.run.stability]);
  const diagnostics = completed.flatMap((entry) =>
    entry.run.diagnostics === undefined ? [] : [entry.run.diagnostics]);
  return {
    strategy,
    totalCases: selected.length,
    completedCases: completed.length,
    stableCases: selected.filter((entry) => entry.gate.pass).length,
    maximumDensityDeviationRange: range(
      stability.map((entry) => entry.maximumDensityDeviation),
    ),
    maximumMachRange: range(stability.map((entry) => entry.maximumMach)),
    maximumBoundaryMomentResiduals: {
      density: maximumOrNull(diagnostics.map((entry) =>
        entry.boundaryMoments.density.absoluteResidual)),
      ux: maximumOrNull(diagnostics.map((entry) =>
        entry.boundaryMoments.ux.absoluteResidual)),
      uy: maximumOrNull(diagnostics.map((entry) =>
        entry.boundaryMoments.uy.absoluteResidual)),
    },
    negativePopulationObservationCount: diagnostics.reduce(
      (sum, entry) => sum + entry.populations.negativePopulationObservationCount,
      0,
    ),
    minimumPopulation: minimumOrNull(
      diagnostics.map((entry) => entry.populations.minimumPopulation),
    ),
  };
}

function stableCount(
  summaries: StrategySummary[],
  strategy: InletMechanismStrategy,
): number {
  return summaries.find((entry) => entry.strategy === strategy)?.stableCases ?? -1;
}

export function classifyPairEffect(
  firstStableCorners: number,
  secondStableCorners: number,
): PairEffect {
  if (firstStableCorners === 0 && secondStableCorners === 9) {
    return "SECOND_SUFFICIENT_WHERE_FIRST_FAILS";
  }
  if (firstStableCorners === 9 && secondStableCorners === 9) {
    return "SECOND_NOT_NECESSARY";
  }
  if (firstStableCorners === 9 && secondStableCorners === 0) {
    return "SECOND_NOT_SUFFICIENT";
  }
  if (firstStableCorners === 0 && secondStableCorners === 0) {
    return "BOTH_FAIL";
  }
  return "MIXED_OR_UNRESOLVED";
}

function buildCorners(cases: CaseResult[]): CornerResult[] {
  const corners: CornerResult[] = [];
  for (const diameter of CONTRACT.matrix.nominalDiameterScaleCells) {
    for (const relaxationTime of CONTRACT.matrix.relaxationTime) {
      const selected = cases.filter((entry) =>
        entry.definition.nominalDiameterScaleCells === diameter
        && entry.definition.relaxationTime === relaxationTime);
      const passes = Object.fromEntries(STRATEGIES.map((strategy) => [
        strategy,
        selected.find((entry) => entry.definition.strategy === strategy)?.gate.pass
          ?? false,
      ])) as Record<InletMechanismStrategy, boolean>;
      corners.push({
        nominalDiameterScaleCells: diameter,
        relaxationTime,
        passes,
        passVector: STRATEGIES.map((strategy) => passes[strategy] ? "1" : "0").join(""),
      });
    }
  }
  return corners;
}

function provenanceFor(
  strategy: InletMechanismStrategy,
  base: Omit<CaseProvenance, "strategyId">,
): CaseProvenance {
  return { strategyId: strategy, ...base };
}

export function runFormalInletMechanismMatrix(
  a8jAnchors: readonly AnchorMetrics[],
  a8kAnchors: readonly AnchorMetrics[],
  provenanceBase: Omit<CaseProvenance, "strategyId">,
  onProgress?: (completed: number, total: number, result: CaseResult) => void,
): FormalInletMechanismResult {
  const definitions = buildFormalInletMechanismCases();
  const a8jMap = new Map(a8jAnchors.map((anchor) => [
    key(anchor.nominalDiameterScaleCells, anchor.relaxationTime),
    anchor,
  ]));
  const a8kMap = new Map(a8kAnchors.map((anchor) => [
    key(anchor.nominalDiameterScaleCells, anchor.relaxationTime),
    anchor,
  ]));
  const cases: CaseResult[] = [];
  for (const definition of definitions) {
    const anchorKey = key(
      definition.nominalDiameterScaleCells,
      definition.relaxationTime,
    );
    const result = runFormalInletMechanismCase(
      definition,
      provenanceFor(definition.strategy, provenanceBase),
      definition.strategy === "legacy-zou-he-derived-density"
        ? a8jMap.get(anchorKey)
        : undefined,
      definition.strategy === "full-regularized-fixed-density"
        ? a8kMap.get(anchorKey)
        : undefined,
    );
    cases.push(result);
    onProgress?.(cases.length, definitions.length, result);
  }

  const corners = buildCorners(cases);
  const strategySummaries = STRATEGIES.map((strategy) =>
    summarizeStrategy(cases, strategy));
  const a8jCases = cases.filter((entry) => entry.a8jAnchorComparison !== undefined);
  const a8kCases = cases.filter((entry) => entry.a8kAnchorComparison !== undefined);
  const a8jMismatchCaseIds = a8jCases
    .filter((entry) => !entry.a8jAnchorComparison?.exactMatch)
    .map((entry) => entry.definition.id);
  const a8kMismatchCaseIds = a8kCases
    .filter((entry) => !entry.a8kAnchorComparison?.exactMatch)
    .map((entry) => entry.definition.id);
  const matrixComplete = cases.length === CONTRACT.matrix.runCount
    && cases.every((entry) => entry.run.status === "completed");
  const a8jAnchorExact = a8jCases.length === CONTRACT.inheritedEvidence.a8j.anchorCases
    && a8jMismatchCaseIds.length === 0;
  const a8kAnchorExact = a8kCases.length === CONTRACT.inheritedEvidence.a8k.anchorCases
    && a8kMismatchCaseIds.length === 0;

  const distinctPassVectors = [...new Set(corners.map((entry) => entry.passVector))];
  const samePassVectorAtAllCorners = distinctPassVectors.length === 1;
  const onlyStrategy8Passes = samePassVectorAtAllCorners
    && distinctPassVectors[0] === "00000001";
  const resolvedPattern = samePassVectorAtAllCorners && !onlyStrategy8Passes;
  const s = (strategy: InletMechanismStrategy) =>
    stableCount(strategySummaries, strategy);
  const densityNormalizationSufficient =
    s("legacy-zou-he-derived-density") === 0
    && s("legacy-zou-he-density-normalized") === CONTRACT.matrix.cornerCount;
  const internalPass = matrixComplete && a8jAnchorExact && a8kAnchorExact;
  const pass = internalPass && resolvedPattern;
  const code = !internalPass
    ? CONTRACT.decision.internalGateFailureCode
    : !resolvedPattern
      ? CONTRACT.decision.unresolvedCode
      : CONTRACT.decision.completedResolvedCode;
  const causalStatement = !internalPass
    ? "A8J/A8K exact-anchor or complete-matrix gate failed; no causal interpretation is admissible."
    : !samePassVectorAtAllCorners
      ? `Frozen corners produced different pass vectors: ${distinctPassVectors.join(",")}.`
      : onlyStrategy8Passes
        ? "Only full-regularized-fixed-density passed; the frozen ladder did not decompose the interaction."
        : `All frozen corners share pass vector ${distinctPassVectors[0] ?? "missing"}; pairwise mechanism comparisons are ready for Pro review.`;
  const stableCasesByStrategy = Object.fromEntries(strategySummaries.map((entry) => [
    entry.strategy,
    entry.stableCases,
  ])) as Record<InletMechanismStrategy, number>;

  return {
    format: "VP-A8L-FORMAL-MRT-INLET-MECHANISM-MATRIX-v1",
    contractIdentity: {
      format: CONTRACT.format,
      contractSha256: provenanceBase.contractSha256,
      contractCommit: provenanceBase.contractCommit,
      formalSourceSha256: provenanceBase.formalSourceSha256,
      planningContractSha256:
        CONTRACT.sourceIdentity.planningContract.sha256,
      a8jArtifactSha256: provenanceBase.a8jArtifactSha256,
      a8kStoredArtifactSha256: provenanceBase.a8kStoredArtifactSha256,
      a8kCanonicalArtifactSha256: provenanceBase.a8kCanonicalArtifactSha256,
    },
    matrixComplete,
    cases,
    corners,
    strategySummaries,
    anchorComparison: {
      a8j: {
        checkedCases: a8jCases.length,
        exactMatches: a8jCases.length - a8jMismatchCaseIds.length,
        mismatchCaseIds: a8jMismatchCaseIds,
      },
      a8k: {
        checkedCases: a8kCases.length,
        exactMatches: a8kCases.length - a8kMismatchCaseIds.length,
        mismatchCaseIds: a8kMismatchCaseIds,
      },
    },
    causalAnalysis: {
      distinctPassVectors,
      samePassVectorAtAllCorners,
      onlyStrategy8Passes,
      densityNormalizationSufficient,
      fixedDensity: {
        equilibrium: classifyPairEffect(
          s("full-equilibrium-derived-density"),
          s("full-equilibrium-fixed-density"),
        ),
        regularized: classifyPairEffect(
          s("full-regularized-derived-density"),
          s("full-regularized-fixed-density"),
        ),
      },
      completePopulationCoverage: {
        equilibrium: classifyPairEffect(
          s("incoming-equilibrium-derived-density"),
          s("full-equilibrium-derived-density"),
        ),
        regularized: classifyPairEffect(
          s("incoming-regularized-derived-density"),
          s("full-regularized-derived-density"),
        ),
      },
      regularizationIncrement: {
        incomingDerivedDensity: classifyPairEffect(
          s("incoming-equilibrium-derived-density"),
          s("incoming-regularized-derived-density"),
        ),
        fullDerivedDensity: classifyPairEffect(
          s("full-equilibrium-derived-density"),
          s("full-regularized-derived-density"),
        ),
        fullFixedDensity: classifyPairEffect(
          s("full-equilibrium-fixed-density"),
          s("full-regularized-fixed-density"),
        ),
      },
      resolvedPattern,
      passCountRankingUsed: false,
      statement: causalStatement,
    },
    summary: {
      totalCases: cases.length,
      completedCases: cases.filter((entry) => entry.run.status === "completed").length,
      stableCases: cases.filter((entry) => entry.gate.pass).length,
      stableCasesByStrategy,
    },
    decision: {
      code,
      pass,
      internalChecks: {
        matrixComplete,
        a8jAnchorExact,
        a8kAnchorExact,
        causalPatternResolved: resolvedPattern,
      },
      independentRepeatRequired: true,
      formalSourceModified: false,
      formalIntegrationUnlocked: false,
      algorithmSelectionDelegatedToProReview: true,
      stopAfterEvidenceAndHandoff: true,
      statement: causalStatement,
      claimUpperBound: CONTRACT.decision.claimUpperBound,
    },
  };
}
