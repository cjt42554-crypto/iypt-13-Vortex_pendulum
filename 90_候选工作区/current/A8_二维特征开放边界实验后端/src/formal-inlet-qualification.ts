import type { BoundaryField } from
  "./formal-boundary-factorization-boundaries.ts";
import {
  FORMAL_INLET_QUALIFICATION_CONTRACT as CONTRACT,
  FORMAL_INLET_QUALIFICATION_STARTUP_PROTOCOLS as PROTOCOLS,
  FORMAL_INLET_QUALIFICATION_STRATEGIES as STRATEGIES,
  type FormalInletQualificationStartupProtocol,
  type FormalInletQualificationStrategy,
} from "./formal-inlet-qualification-contract.ts";
import {
  runFormalInletQualificationStartupCase,
  type StartupAnchor,
  type StartupCaseExecution,
} from "./formal-inlet-qualification-case.ts";
import { runFormalInletQualificationAcousticCase } from
  "./formal-inlet-qualification-acoustics.ts";
import type {
  AcousticCaseDefinition,
  AcousticCaseResult,
  FormalInletQualificationResult,
  PopulationMassSummary,
  QualificationProvenance,
  QualificationStability,
  S1S2InteriorComparison,
  StartupCaseDefinition,
  StartupCaseResult,
} from "./formal-inlet-qualification-types.ts";

export interface A8lQualificationAnchor extends StartupAnchor {
  nominalDiameterCells: number;
  relaxationTime: number;
  strategy: FormalInletQualificationStrategy;
}

export interface A8hQualificationAnchor extends StartupAnchor {
  nominalDiameterCells: number;
  relaxationTime: number;
}

export interface QualificationProgress {
  phase: "startup" | "acoustic";
  completed: number;
  total: number;
  caseId: string;
  pass: boolean;
}

function scaledInteger(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

function strategyTag(strategy: FormalInletQualificationStrategy): string {
  const ordinal = STRATEGIES.find((entry) => entry.id === strategy)?.ordinal;
  if (ordinal === undefined) throw new Error(`unregistered A8M strategy: ${strategy}`);
  return `s${ordinal.toString().padStart(2, "0")}`;
}

export function buildFormalInletQualificationStartupCases(): StartupCaseDefinition[] {
  const cases: StartupCaseDefinition[] = [];
  for (const geometry of CONTRACT.commonNumerics.geometries) {
    for (const relaxationTime of CONTRACT.commonNumerics.relaxationTime) {
      for (const protocol of PROTOCOLS) {
        for (const strategy of STRATEGIES) {
          const body = protocol.body === "fixed-diffuse-cylinder"
            ? {
              centerX: geometry.bodyCenterX,
              centerY: geometry.bodyCenterY,
              radius: geometry.bodyRadius,
              velocityX: 0,
              velocityY: 0,
            }
            : null;
          cases.push({
            id: [
              `d${scaledInteger(geometry.nominalDiameterCells, 1, 2)}`,
              "u0800",
              `t${scaledInteger(relaxationTime, 1_000, 4)}`,
              `p-${protocol.id}`,
              strategyTag(strategy.id),
            ].join("-"),
            nominalDiameterCells: geometry.nominalDiameterCells,
            relaxationTime,
            nx: geometry.nx,
            ny: geometry.ny,
            auditSteps: geometry.auditSteps,
            rampSteps: geometry.rampSteps,
            preRunSteps: protocol.preRunAuditWindowCount * geometry.auditSteps,
            strategy: strategy.id,
            protocol: protocol.id,
            initialField: protocol.initialField,
            body,
          });
        }
      }
    }
  }
  return cases;
}

export function buildFormalInletQualificationAcousticCases(): AcousticCaseDefinition[] {
  const cases: AcousticCaseDefinition[] = [];
  for (const strategy of STRATEGIES) {
    for (const relaxationTime of CONTRACT.acousticReflection.relaxationTime) {
      cases.push({
        id: [
          strategyTag(strategy.id),
          `t${scaledInteger(relaxationTime, 1_000, 4)}`,
          "upstream-acoustic",
        ].join("-"),
        strategy: strategy.id,
        relaxationTime,
      });
    }
  }
  return cases;
}

function anchorKey(
  diameter: number,
  relaxationTime: number,
  strategy?: FormalInletQualificationStrategy,
): string {
  return `${diameter}:${relaxationTime}${strategy === undefined ? "" : `:${strategy}`}`;
}

function relativeDifference(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-14);
}

function compareFields(
  definition: StartupCaseDefinition,
  s1Result: StartupCaseResult,
  s2Result: StartupCaseResult,
  s1: BoundaryField | undefined,
  s2: BoundaryField | undefined,
): S1S2InteriorComparison {
  if (s1 === undefined || s2 === undefined) {
    return {
      nominalDiameterCells: definition.nominalDiameterCells,
      relaxationTime: definition.relaxationTime,
      protocol: definition.protocol,
      s1CaseId: s1Result.definition.id,
      s2CaseId: s2Result.definition.id,
      comparedCells: 0,
      densityRmsDifference: Number.MAX_VALUE,
      velocityRmsDifference: Number.MAX_VALUE,
      velocityRmsDifferenceOverInletVelocity: Number.MAX_VALUE,
      meanDragRelativeDifference: null,
      liftRmsRelativeDifference: null,
      densityEquivalent: false,
      velocityEquivalent: false,
      meanDragEquivalent: null,
      liftRmsEquivalent: null,
      pass: false,
    };
  }
  const xStart = 2 * definition.nominalDiameterCells;
  const xEnd = definition.nx - 2 * definition.nominalDiameterCells;
  let comparedCells = 0;
  let densitySquares = 0;
  let velocitySquares = 0;
  for (let y = 0; y < definition.ny; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const cell = x + definition.nx * y;
      const densityDifference = (s2.rho[cell] ?? 0) - (s1.rho[cell] ?? 0);
      const uxDifference = (s2.ux[cell] ?? 0) - (s1.ux[cell] ?? 0);
      const uyDifference = (s2.uy[cell] ?? 0) - (s1.uy[cell] ?? 0);
      densitySquares += densityDifference * densityDifference;
      velocitySquares += uxDifference * uxDifference + uyDifference * uyDifference;
      comparedCells += 1;
    }
  }
  if (comparedCells === 0) throw new RangeError("A8M empty interior comparison region");
  const densityRmsDifference = Math.sqrt(densitySquares / comparedCells);
  const velocityRmsDifference = Math.sqrt(velocitySquares / comparedCells);
  const velocityRmsDifferenceOverInletVelocity = velocityRmsDifference
    / CONTRACT.commonNumerics.inletVelocityLattice;
  const s1Force = s1Result.run.forceDiagnostics;
  const s2Force = s2Result.run.forceDiagnostics;
  const meanDragRelativeDifference = s1Force === undefined || s2Force === undefined
    ? null
    : relativeDifference(s1Force.meanDrag, s2Force.meanDrag);
  const liftRmsRelativeDifference = s1Force === undefined || s2Force === undefined
    ? null
    : relativeDifference(s1Force.liftRms, s2Force.liftRms);
  const gates = CONTRACT.startupMatrix.gates;
  const densityEquivalent = densityRmsDifference
    <= gates.maximumS1S2InteriorDensityRmsDifference;
  const velocityEquivalent = velocityRmsDifferenceOverInletVelocity
    <= gates.maximumS1S2InteriorVelocityRmsDifferenceOverInletVelocity;
  const meanDragEquivalent = meanDragRelativeDifference === null
    ? null
    : meanDragRelativeDifference
      <= gates.maximumS1S2FixedBodyMeanDragRelativeDifference;
  const liftRmsEquivalent = liftRmsRelativeDifference === null
    ? null
    : liftRmsRelativeDifference
      <= gates.maximumS1S2FixedBodyLiftRmsRelativeDifference;
  const forcePass = definition.body === null
    || (meanDragEquivalent === true && liftRmsEquivalent === true);
  return {
    nominalDiameterCells: definition.nominalDiameterCells,
    relaxationTime: definition.relaxationTime,
    protocol: definition.protocol,
    s1CaseId: s1Result.definition.id,
    s2CaseId: s2Result.definition.id,
    comparedCells,
    densityRmsDifference,
    velocityRmsDifference,
    velocityRmsDifferenceOverInletVelocity,
    meanDragRelativeDifference,
    liftRmsRelativeDifference,
    densityEquivalent,
    velocityEquivalent,
    meanDragEquivalent,
    liftRmsEquivalent,
    pass: densityEquivalent && velocityEquivalent && forcePass,
  };
}

function rawMassLedgerPass(summary: PopulationMassSummary | undefined): boolean {
  return summary !== undefined
    && summary.gates.formalShadowExact
    && summary.gates.stepClosurePass
    && summary.gates.cumulativeClosurePass;
}

function everyRawMassLedgerPass(
  startup: readonly StartupCaseResult[],
  acoustic: readonly AcousticCaseResult[],
): boolean {
  return startup.every((entry) => rawMassLedgerPass(entry.run.massSummary))
    && acoustic.every((entry) =>
      rawMassLedgerPass(entry.test.massSummary)
      && rawMassLedgerPass(entry.extendedReference.massSummary));
}

function everyShadowExact(
  startup: readonly StartupCaseResult[],
  acoustic: readonly AcousticCaseResult[],
): boolean {
  const exact = (summary: PopulationMassSummary | undefined) =>
    summary?.gates.formalShadowExact === true;
  return startup.every((entry) => exact(entry.run.massSummary))
    && acoustic.every((entry) =>
      exact(entry.test.massSummary) && exact(entry.extendedReference.massSummary));
}

function strategySummary(
  strategy: FormalInletQualificationStrategy,
  startup: readonly StartupCaseResult[],
  acoustic: readonly AcousticCaseResult[],
): FormalInletQualificationResult["qualification"]["byStrategy"][FormalInletQualificationStrategy] {
  const startupSelected = startup.filter((entry) => entry.definition.strategy === strategy);
  const acousticSelected = acoustic.filter((entry) => entry.definition.strategy === strategy);
  const startupStableCases = startupSelected.filter((entry) =>
    entry.gate.executionPass && entry.gate.densityPass && entry.gate.machPass).length;
  const massPassedStartupCases = startupSelected.filter((entry) =>
    entry.run.massSummary?.gates.pass === true).length;
  const acousticPassedCases = acousticSelected.filter((entry) => entry.gate.pass).length;
  const massEligible = massPassedStartupCases === startupSelected.length
    && acousticSelected.every((entry) => entry.gate.massPass);
  const acousticEligible = acousticPassedCases === acousticSelected.length;
  const startupEligible = startupStableCases === startupSelected.length;
  return {
    startupCompletedCases: startupSelected.filter((entry) =>
      entry.gate.executionPass).length,
    startupStableCases,
    massPassedStartupCases,
    acousticPassedCases,
    massEligible,
    acousticEligible,
    startupEligible,
  };
}

function aggregateS2NonIncomingFraction(
  startup: readonly StartupCaseResult[],
  acoustic: readonly AcousticCaseResult[],
): number {
  const summaries: PopulationMassSummary[] = [];
  for (const entry of startup) {
    if (entry.definition.strategy === "legacy-zou-he-density-normalized"
      && entry.run.massSummary !== undefined) summaries.push(entry.run.massSummary);
  }
  for (const entry of acoustic) {
    if (entry.definition.strategy === "legacy-zou-he-density-normalized") {
      summaries.push(entry.test.massSummary, entry.extendedReference.massSummary);
    }
  }
  const groups = CONTRACT.exactPopulationMassBudget.adapterDirectionGroups;
  let total = 0;
  let nonIncoming = 0;
  for (const summary of summaries) {
    total += summary.cumulativeAdapterAbsoluteTotal;
    for (const direction of [...groups.outgoing, ...groups.stationaryCross]) {
      nonIncoming += summary.cumulativeAdapterAbsoluteByDirection[direction] ?? 0;
    }
  }
  return total === 0 ? 0 : nonIncoming / total;
}

export function runFormalInletQualification(
  a8lAnchors: readonly A8lQualificationAnchor[],
  a8hAnchors: readonly A8hQualificationAnchor[],
  provenance: QualificationProvenance,
  onProgress?: (progress: QualificationProgress) => void,
): FormalInletQualificationResult {
  const a8lMap = new Map(a8lAnchors.map((anchor) => [
    anchorKey(
      anchor.nominalDiameterCells,
      anchor.relaxationTime,
      anchor.strategy,
    ),
    anchor,
  ]));
  const a8hMap = new Map(a8hAnchors.map((anchor) => [
    anchorKey(anchor.nominalDiameterCells, anchor.relaxationTime),
    anchor,
  ]));
  const startupDefinitions = buildFormalInletQualificationStartupCases();
  const startupExecutions: StartupCaseExecution[] = [];
  for (const definition of startupDefinitions) {
    const execution = runFormalInletQualificationStartupCase(
      definition,
      provenance,
      definition.protocol === "rest-ramp-20d-no-body"
        ? a8lMap.get(anchorKey(
          definition.nominalDiameterCells,
          definition.relaxationTime,
          definition.strategy,
        ))
        : undefined,
      definition.protocol === "fixed-body-established-prerun"
        && definition.strategy === "legacy-zou-he-derived-density"
        ? a8hMap.get(anchorKey(
          definition.nominalDiameterCells,
          definition.relaxationTime,
        ))
        : undefined,
    );
    startupExecutions.push(execution);
    onProgress?.({
      phase: "startup",
      completed: startupExecutions.length,
      total: startupDefinitions.length,
      caseId: definition.id,
      pass: execution.result.gate.pass,
    });
  }
  const startupCases = startupExecutions.map((entry) => entry.result);
  const interiorComparisons: S1S2InteriorComparison[] = [];
  for (const definition of startupDefinitions.filter((entry) =>
    entry.strategy === "legacy-zou-he-derived-density")) {
    const s1 = startupExecutions.find((entry) =>
      entry.result.definition.id === definition.id);
    const s2 = startupExecutions.find((entry) => {
      const candidate = entry.result.definition;
      return candidate.nominalDiameterCells === definition.nominalDiameterCells
        && candidate.relaxationTime === definition.relaxationTime
        && candidate.protocol === definition.protocol
        && candidate.strategy === "legacy-zou-he-density-normalized";
    });
    if (s1 === undefined || s2 === undefined) {
      throw new Error(`missing A8M S1/S2 pair for ${definition.id}`);
    }
    interiorComparisons.push(compareFields(
      definition,
      s1.result,
      s2.result,
      s1.auditEndField,
      s2.auditEndField,
    ));
  }

  const acousticDefinitions = buildFormalInletQualificationAcousticCases();
  const acousticCases: AcousticCaseResult[] = [];
  for (const definition of acousticDefinitions) {
    const result = runFormalInletQualificationAcousticCase(definition, provenance);
    acousticCases.push(result);
    onProgress?.({
      phase: "acoustic",
      completed: acousticCases.length,
      total: acousticDefinitions.length,
      caseId: definition.id,
      pass: result.gate.pass,
    });
  }

  const a8lChecked = startupCases.filter((entry) =>
    entry.a8lAnchorComparison !== undefined);
  const a8hChecked = startupCases.filter((entry) =>
    entry.a8hAnchorComparison !== undefined);
  const a8lMismatchCaseIds = a8lChecked.filter((entry) =>
    entry.a8lAnchorComparison?.exactMatch !== true).map((entry) => entry.definition.id);
  const a8hMismatchCaseIds = a8hChecked.filter((entry) =>
    entry.a8hAnchorComparison?.exactMatch !== true).map((entry) => entry.definition.id);
  const a8lAnchorsExact = a8lChecked.length
      === CONTRACT.inheritedEvidence.a8l.exactAnchorCases
    && a8lMismatchCaseIds.length === 0;
  const a8hAnchorsExact = a8hChecked.length
      === CONTRACT.inheritedEvidence.a8h.exactAnchorCases
    && a8hMismatchCaseIds.length === 0;
  const startupMatrixComplete = startupCases.length
      === CONTRACT.startupMatrix.runCount
    && startupCases.every((entry) => entry.gate.executionPass);
  const acousticMatrixComplete = acousticCases.length
      === CONTRACT.acousticReflection.caseCount
    && acousticCases.every((entry) => entry.gate.executionPass);
  const allFormalShadowsExact = everyShadowExact(startupCases, acousticCases);
  const allMassLedgersClose = everyRawMassLedgerPass(startupCases, acousticCases);

  const byStrategy = Object.fromEntries(STRATEGIES.map((entry) => [
    entry.id,
    strategySummary(entry.id, startupCases, acousticCases),
  ])) as FormalInletQualificationResult["qualification"]["byStrategy"];
  const s2 = byStrategy["legacy-zou-he-density-normalized"];
  const s2NonIncomingFraction = aggregateS2NonIncomingFraction(
    startupCases,
    acousticCases,
  );
  const fixedLegacy = startupCases.filter((entry) =>
    entry.definition.strategy === "legacy-zou-he-derived-density"
    && entry.definition.protocol === "fixed-body-established-prerun");
  const legacyEstablishedAlternative = fixedLegacy.length
      === CONTRACT.startupMatrix.cornerCount
    && fixedLegacy.every((entry) =>
      entry.gate.executionPass
      && entry.gate.densityPass
      && entry.gate.machPass
      && rawMassLedgerPass(entry.run.massSummary));
  const internalPass = startupMatrixComplete
    && acousticMatrixComplete
    && allFormalShadowsExact
    && allMassLedgersClose
    && a8lAnchorsExact
    && a8hAnchorsExact;
  return {
    format: "VP-A8M-FORMAL-MRT-INLET-QUALIFICATION-v1",
    contractIdentity: { format: CONTRACT.format, ...provenance },
    startupCases,
    interiorComparisons,
    acousticCases,
    anchorComparison: {
      a8l: {
        checkedCases: a8lChecked.length,
        exactMatches: a8lChecked.length - a8lMismatchCaseIds.length,
        mismatchCaseIds: a8lMismatchCaseIds,
      },
      a8h: {
        checkedCases: a8hChecked.length,
        exactMatches: a8hChecked.length - a8hMismatchCaseIds.length,
        mismatchCaseIds: a8hMismatchCaseIds,
      },
    },
    qualification: {
      byStrategy,
      s2MassEligible: s2.massEligible,
      s2AcousticEligible: s2.acousticEligible,
      s2StartupEligible: s2.startupEligible,
      s2ReadyForProSelection:
        s2.massEligible && s2.acousticEligible && s2.startupEligible,
      legacyEstablishedAlternative,
      s2NonIncomingModificationDominant:
        s2NonIncomingFraction
          > CONTRACT.exactPopulationMassBudget.gates
            .maximumS2NonIncomingAbsoluteModificationFraction,
    },
    evidenceDecision: {
      code: internalPass
        ? CONTRACT.decision.evidenceCompleteCode
        : CONTRACT.decision.internalGateFailureCode,
      pass: internalPass,
      internalChecks: {
        startupMatrixComplete,
        acousticMatrixComplete,
        allFormalShadowsExact,
        allMassLedgersClose,
        a8lAnchorsExact,
        a8hAnchorsExact,
      },
      independentRepeatRequired: true,
      formalSourceModified: false,
      formalIntegrationUnlocked: false,
      s2AutomaticallyApproved: false,
      stopAfterEvidenceAndHandoff: true,
      statement: internalPass
        ? "The frozen A8M candidate evidence is complete and ready for independent Pro review; strategy qualification flags do not authorize formal integration."
        : "At least one frozen A8M evidence-integrity gate failed; no strategy qualification conclusion is admissible.",
      claimUpperBound: CONTRACT.decision.claimUpperBound,
    },
  };
}

export type {
  AcousticCaseDefinition,
  AcousticCaseResult,
  FormalInletQualificationResult,
  FormalInletQualificationStartupProtocol,
  FormalInletQualificationStrategy,
  QualificationProvenance,
  QualificationStability,
  S1S2InteriorComparison,
  StartupCaseDefinition,
  StartupCaseResult,
};
