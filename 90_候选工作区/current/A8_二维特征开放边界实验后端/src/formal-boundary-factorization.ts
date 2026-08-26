import { FORMAL_BOUNDARY_FACTORIZATION_CONTRACT as CONTRACT } from
  "./formal-boundary-factorization-contract.ts";
import { runFormalBoundaryFactorizationCase } from
  "./formal-boundary-factorization-case.ts";
import { buildRobustnessGeometry } from "./robustness.ts";
import type {
  A8jAnchor,
  A8kResult,
  Attribution,
  AuditInlet,
  AuditOutlet,
  CaseDefinition,
  CaseResult,
} from "./formal-boundary-factorization-types.ts";

export type {
  A8jAnchor,
  A8kResult,
  Attribution,
  AuditInlet,
  AuditOutlet,
  CaseDefinition,
  CaseResult,
  Stability,
} from "./formal-boundary-factorization-types.ts";
export { runFormalBoundaryFactorizationCase } from
  "./formal-boundary-factorization-case.ts";

function tagInlet(value: AuditInlet): string {
  return value === "formal-zou-he-velocity" ? "izhv" : "irps";
}

function tagOutlet(value: AuditOutlet): string {
  return value === "formal-zou-he-pressure" ? "ozhp" : "ocbc";
}

export function buildFormalBoundaryFactorizationCases(): CaseDefinition[] {
  const result: CaseDefinition[] = [];
  for (const diameter of CONTRACT.matrix.nominalDiameterScaleCells) {
    const geometry = buildRobustnessGeometry(
      diameter,
      CONTRACT.matrix.downstreamDomainScaleDiameters,
    );
    const rampSteps = diameter * CONTRACT.matrix.rampDurationDiameters;
    for (const relaxationTime of CONTRACT.matrix.relaxationTime) {
      for (const inlet of CONTRACT.matrix.inletBoundary) {
        for (const outlet of CONTRACT.matrix.outletBoundary) {
          const inletBoundary = inlet as AuditInlet;
          const outletBoundary = outlet as AuditOutlet;
          result.push({
            id: [
              `d${diameter.toString().padStart(2, "0")}`,
              "u0800",
              `t${Math.round(relaxationTime * 1_000).toString().padStart(4, "0")}`,
              "r2000",
              tagInlet(inletBoundary),
              tagOutlet(outletBoundary),
              "nobody",
            ].join("-"),
            nominalDiameterScaleCells: diameter,
            relaxationTime,
            nx: geometry.nx,
            ny: geometry.ny,
            auditSteps: geometry.steps,
            rampSteps,
            inletBoundary,
            outletBoundary,
          });
        }
      }
    }
  }
  return result;
}

export function classifyBoundaryPassPattern(pattern: {
  baseline: boolean;
  outletOnly: boolean;
  inletOnly: boolean;
  both: boolean;
}): Attribution {
  if (pattern.baseline) return "BASELINE_ALREADY_PASSING";
  if (pattern.outletOnly && pattern.inletOnly) {
    return "BOTH_SINGLE_REPLACEMENTS_SUFFICIENT";
  }
  if (pattern.outletOnly) return "OUTLET_REPLACEMENT_SUFFICIENT";
  if (pattern.inletOnly) return "INLET_REPLACEMENT_SUFFICIENT";
  if (pattern.both) return "DOUBLE_REPLACEMENT_REQUIRED";
  return "NO_TESTED_REPLACEMENT_SUFFICIENT";
}

function combination(
  cases: CaseResult[],
  inletBoundary: AuditInlet,
  outletBoundary: AuditOutlet,
): A8kResult["combinationSummaries"][number] {
  const selected = cases.filter((entry) =>
    entry.definition.inletBoundary === inletBoundary
    && entry.definition.outletBoundary === outletBoundary);
  const stability = selected.flatMap((entry) =>
    entry.run.stability === undefined ? [] : [entry.run.stability]);
  return {
    inletBoundary,
    outletBoundary,
    totalCases: selected.length,
    completedCases: selected.filter((entry) => entry.run.status === "completed").length,
    stableCases: selected.filter((entry) => entry.gate.pass).length,
    densityDeviationRange: [
      Math.min(...stability.map((entry) => entry.maximumDensityDeviation)),
      Math.max(...stability.map((entry) => entry.maximumDensityDeviation)),
    ],
    maximumMachRange: [
      Math.min(...stability.map((entry) => entry.maximumMach)),
      Math.max(...stability.map((entry) => entry.maximumMach)),
    ],
  };
}

function anchorKey(diameter: number, relaxationTime: number): string {
  return `${diameter}:${relaxationTime}`;
}

export function runFormalBoundaryFactorizationMatrix(
  anchors: readonly A8jAnchor[],
  onProgress?: (completed: number, total: number, result: CaseResult) => void,
): A8kResult {
  const definitions = buildFormalBoundaryFactorizationCases();
  const anchorMap = new Map(anchors.map((anchor) => [
    anchorKey(anchor.nominalDiameterScaleCells, anchor.relaxationTime),
    anchor,
  ]));
  const cases: CaseResult[] = [];
  for (const definition of definitions) {
    const baseline = definition.inletBoundary === "formal-zou-he-velocity"
      && definition.outletBoundary === "formal-zou-he-pressure";
    const result = runFormalBoundaryFactorizationCase(
      definition,
      baseline
        ? anchorMap.get(anchorKey(
          definition.nominalDiameterScaleCells,
          definition.relaxationTime,
        ))
        : undefined,
    );
    cases.push(result);
    onProgress?.(cases.length, definitions.length, result);
  }
  const corners: A8kResult["corners"] = [];
  for (const diameter of CONTRACT.matrix.nominalDiameterScaleCells) {
    for (const relaxationTime of CONTRACT.matrix.relaxationTime) {
      const selected = cases.filter((entry) =>
        entry.definition.nominalDiameterScaleCells === diameter
        && entry.definition.relaxationTime === relaxationTime);
      const read = (inlet: AuditInlet, outlet: AuditOutlet): boolean =>
        selected.find((entry) =>
          entry.definition.inletBoundary === inlet
          && entry.definition.outletBoundary === outlet)?.gate.pass ?? false;
      const baseline = read("formal-zou-he-velocity", "formal-zou-he-pressure");
      const outletOnly = read("formal-zou-he-velocity", "cbc-2d-regularized");
      const inletOnly = read("regularized-prescribed-state", "formal-zou-he-pressure");
      const both = read("regularized-prescribed-state", "cbc-2d-regularized");
      corners.push({
        nominalDiameterScaleCells: diameter,
        relaxationTime,
        attribution: classifyBoundaryPassPattern({ baseline, outletOnly, inletOnly, both }),
        passes: { baseline, outletOnly, inletOnly, both },
      });
    }
  }
  const baselineCases = cases.filter((entry) => entry.baselineComparison !== undefined);
  const mismatchCaseIds = baselineCases
    .filter((entry) => !entry.baselineComparison?.exactMatch)
    .map((entry) => entry.definition.id);
  const matrixComplete = cases.length === CONTRACT.interpretationRules.frozenRunCount
    && cases.every((entry) => entry.run.status === "completed");
  const distinct = new Set(corners.map((entry) => entry.attribution));
  const globalAttribution: Attribution = distinct.size === 1
    ? corners[0]?.attribution ?? "MIXED_OR_UNRESOLVED"
    : "MIXED_OR_UNRESOLVED";
  const baselineExact = baselineCases.length === CONTRACT.interpretationRules.frozenCornerCount
    && mismatchCaseIds.length === 0;
  const pass = matrixComplete
    && corners.length === CONTRACT.interpretationRules.frozenCornerCount
    && baselineExact
    && globalAttribution !== "MIXED_OR_UNRESOLVED";
  return {
    format: "VP-A8K-FORMAL-MRT-BOUNDARY-FACTORIZATION-MATRIX-v1",
    contractIdentity: {
      format: CONTRACT.format,
      formalSourceSha256: CONTRACT.formalSource.sha256,
      a8jArtifactSha256: CONTRACT.inheritedEvidence.a8jArtifactSha256,
    },
    matrixComplete,
    cases,
    corners,
    combinationSummaries: [
      combination(cases, "formal-zou-he-velocity", "formal-zou-he-pressure"),
      combination(cases, "formal-zou-he-velocity", "cbc-2d-regularized"),
      combination(cases, "regularized-prescribed-state", "formal-zou-he-pressure"),
      combination(cases, "regularized-prescribed-state", "cbc-2d-regularized"),
    ],
    baselineComparison: {
      checkedCases: baselineCases.length,
      exactMatches: baselineCases.length - mismatchCaseIds.length,
      mismatchCaseIds,
    },
    summary: {
      totalCases: cases.length,
      completedCases: cases.filter((entry) => entry.run.status === "completed").length,
      stableCases: cases.filter((entry) => entry.gate.pass).length,
      globalAttribution,
    },
    decision: {
      code: pass && globalAttribution === "INLET_REPLACEMENT_SUFFICIENT"
        ? "PASS-A8K-FORMAL-MRT-INLET-SIDE-CAUSAL-PROBE-CANDIDATE-ONLY"
        : "NO-GO-A8K-FORMAL-MRT-BOUNDARY-FACTORIZATION-INTERNAL-GATES",
      pass,
      formalSourceModified: false,
      cbcIntegratedIntoFormalKernel: false,
      formalIntegrationUnlocked: false,
      statement: pass
        ? `Frozen matrix complete; A8J baseline exact; attribution=${globalAttribution}.`
        : "Frozen execution, baseline-reproduction, or attribution gate failed.",
      claimUpperBound:
        "Within the frozen no-body 20D matrix, replacing the inlet treatment is sufficient for the density/Mach gates, while replacing only the outlet is not. The test does not isolate fixed density, complete population overwrite, or regularized nonequilibrium reconstruction, and it does not qualify or authorize a formal boundary implementation.",
    },
  };
}
