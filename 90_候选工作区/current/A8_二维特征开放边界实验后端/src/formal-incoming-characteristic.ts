import type { BoundaryField } from "./formal-boundary-factorization-boundaries.ts";
import { runIncomingCharacteristicAcousticCase } from
  "./formal-incoming-characteristic-acoustics.ts";
import { runIncomingCharacteristicStartupCase } from
  "./formal-incoming-characteristic-case.ts";
import {
  FORMAL_INCOMING_CHARACTERISTIC_CONTRACT as CONTRACT,
  FORMAL_INCOMING_CHARACTERISTIC_STARTUP_PROTOCOLS as PROTOCOLS,
  FORMAL_INCOMING_CHARACTERISTIC_STRATEGIES as STRATEGIES,
  type FormalIncomingCharacteristicStartupProtocol,
  type FormalIncomingCharacteristicStrategy,
} from "./formal-incoming-characteristic-contract.ts";
import type { PopulationMassSummary } from
  "./formal-inlet-qualification-types.ts";
import type {
  IncomingCharacteristicAcousticDefinition,
  IncomingCharacteristicAcousticResult,
  IncomingCharacteristicInteriorComparison,
  IncomingCharacteristicProvenance,
  IncomingCharacteristicQualificationResult,
  IncomingCharacteristicStartupDefinition,
  IncomingCharacteristicStartupExecution,
  IncomingCharacteristicStartupResult,
  LegacyAnchorComparison,
} from "./formal-incoming-characteristic-types.ts";

export interface A8mStartupEvidenceEntry {
  definition: { id: string; strategy: string; [key: string]: unknown };
  run: unknown;
  gate: unknown;
}

export interface A8mAcousticEvidenceEntry {
  definition: { id: string; strategy: string; [key: string]: unknown };
  test: unknown;
  extendedReference: unknown;
  metrics: unknown;
  gate: unknown;
}

export interface IncomingCharacteristicProgress {
  phase: "startup" | "acoustic";
  completed: number;
  total: number;
  caseId: string;
  pass: boolean;
}

function scaledInteger(value: number, scale: number, width: number): string {
  return Math.round(value * scale).toString().padStart(width, "0");
}

function strategyTag(strategy: FormalIncomingCharacteristicStrategy): string {
  const ordinal = STRATEGIES.find((entry) => entry.id === strategy)?.ordinal;
  if (ordinal === undefined) throw new Error(`unregistered A8N strategy: ${strategy}`);
  return `s${ordinal.toString().padStart(2, "0")}`;
}

export function buildIncomingCharacteristicStartupCases():
IncomingCharacteristicStartupDefinition[] {
  const cases: IncomingCharacteristicStartupDefinition[] = [];
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

export function buildIncomingCharacteristicAcousticCases():
IncomingCharacteristicAcousticDefinition[] {
  const cases: IncomingCharacteristicAcousticDefinition[] = [];
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

function startupProjection(result: IncomingCharacteristicStartupResult): unknown {
  const run = result.run;
  return {
    definition: result.definition,
    run: {
      status: run.status,
      completedPreRunSteps: run.completedPreRunSteps,
      completedAuditSteps: run.completedAuditSteps,
      ...(run.preRunStability === undefined ? {} : { preRunStability: run.preRunStability }),
      ...(run.auditStability === undefined ? {} : { auditStability: run.auditStability }),
      ...(run.populationDiagnostics === undefined
        ? {}
        : { populationDiagnostics: run.populationDiagnostics }),
      ...(run.forceDiagnostics === undefined ? {} : { forceDiagnostics: run.forceDiagnostics }),
      massStepRecords: run.massStepRecords,
      ...(run.massSummary === undefined ? {} : { massSummary: run.massSummary }),
      ...(run.failure === undefined ? {} : { failure: run.failure }),
    },
    gate: {
      executionPass: result.gate.executionPass,
      densityPass: result.gate.densityPass,
      machPass: result.gate.machPass,
      massPass: result.gate.massPass,
      pass: result.gate.executionPass
        && result.gate.densityPass
        && result.gate.machPass
        && result.gate.massPass,
    },
  };
}

function acousticTraceProjection(
  trace: IncomingCharacteristicAcousticResult["test"],
): unknown {
  return {
    role: trace.role,
    nx: trace.nx,
    ny: trace.ny,
    pulseCenterX: trace.pulseCenterX,
    probeX: trace.probeX,
    completedSteps: trace.completedSteps,
    probeDensity: trace.probeDensity,
    probeUx: trace.probeUx,
    domainMeanDensity: trace.domainMeanDensity,
    domainMeanUx: trace.domainMeanUx,
    initialDomainMeanDensity: trace.initialDomainMeanDensity,
    initialDomainMeanUx: trace.initialDomainMeanUx,
    massStepRecords: trace.massStepRecords,
    massSummary: trace.massSummary,
    ...(trace.failure === undefined ? {} : { failure: trace.failure }),
  };
}

function acousticProjection(result: IncomingCharacteristicAcousticResult): unknown {
  return {
    definition: result.definition,
    test: acousticTraceProjection(result.test),
    extendedReference: acousticTraceProjection(result.extendedReference),
    metrics: result.metrics,
    gate: {
      executionPass: result.gate.executionPass,
      massPass: result.gate.massPass,
      incidentDetected: result.gate.incidentDetected,
      referenceMatchPass: result.gate.referenceMatchPass,
      characteristicReflectionPass: result.gate.characteristicReflectionPass,
      densityReflectionPass: result.gate.densityReflectionPass,
      velocityReflectionPass: result.gate.velocityReflectionPass,
      energyReflectionPass: result.gate.energyReflectionPass,
      phasePass: result.gate.phasePass,
      meanDensityDriftPass: result.gate.meanDensityDriftPass,
      meanVelocityDriftPass: result.gate.meanVelocityDriftPass,
      pass: result.gate.executionPass
        && result.gate.massPass
        && result.gate.incidentDetected
        && result.gate.referenceMatchPass
        && result.gate.characteristicReflectionPass
        && result.gate.densityReflectionPass
        && result.gate.velocityReflectionPass
        && result.gate.energyReflectionPass
        && result.gate.phasePass
        && result.gate.meanDensityDriftPass
        && result.gate.meanVelocityDriftPass,
    },
  };
}

function compareLegacyAnchor(actual: unknown, expected: unknown): LegacyAnchorComparison {
  const actualCanonical = JSON.stringify(actual);
  const expectedCanonical = JSON.stringify(expected);
  return {
    checked: true,
    exactMatch: actualCanonical === expectedCanonical,
    expectedCanonicalLength: expectedCanonical.length,
    actualCanonicalLength: actualCanonical.length,
  };
}

function relativeDifference(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-14);
}

function compareFields(
  definition: IncomingCharacteristicStartupDefinition,
  legacyResult: IncomingCharacteristicStartupResult,
  candidateResult: IncomingCharacteristicStartupResult,
  legacy: BoundaryField | undefined,
  candidate: BoundaryField | undefined,
): IncomingCharacteristicInteriorComparison {
  const qualificationApplicable = definition.protocol
    !== CONTRACT.internalFieldAndLoadComparison.diagnosticOnlyProtocol;
  if (legacy === undefined || candidate === undefined) {
    return {
      nominalDiameterCells: definition.nominalDiameterCells,
      relaxationTime: definition.relaxationTime,
      protocol: definition.protocol,
      legacyCaseId: legacyResult.definition.id,
      candidateCaseId: candidateResult.definition.id,
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
      qualificationApplicable,
      pass: qualificationApplicable ? false : null,
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
      const densityDifference = (candidate.rho[cell] ?? 0) - (legacy.rho[cell] ?? 0);
      const uxDifference = (candidate.ux[cell] ?? 0) - (legacy.ux[cell] ?? 0);
      const uyDifference = (candidate.uy[cell] ?? 0) - (legacy.uy[cell] ?? 0);
      densitySquares += densityDifference * densityDifference;
      velocitySquares += uxDifference * uxDifference + uyDifference * uyDifference;
      comparedCells += 1;
    }
  }
  if (comparedCells === 0) throw new RangeError("A8N empty interior comparison region");
  const densityRmsDifference = Math.sqrt(densitySquares / comparedCells);
  const velocityRmsDifference = Math.sqrt(velocitySquares / comparedCells);
  const velocityRmsDifferenceOverInletVelocity = velocityRmsDifference
    / CONTRACT.commonNumerics.inletVelocityLattice;
  const legacyForce = legacyResult.run.forceDiagnostics;
  const candidateForce = candidateResult.run.forceDiagnostics;
  const meanDragRelativeDifference = legacyForce === undefined
      || candidateForce === undefined
    ? null
    : relativeDifference(legacyForce.meanDrag, candidateForce.meanDrag);
  const liftRmsRelativeDifference = legacyForce === undefined
      || candidateForce === undefined
    ? null
    : relativeDifference(legacyForce.liftRms, candidateForce.liftRms);
  const gates = CONTRACT.internalFieldAndLoadComparison.gates;
  const densityEquivalent = densityRmsDifference
    <= gates.maximumInteriorDensityRmsDifference;
  const velocityEquivalent = velocityRmsDifferenceOverInletVelocity
    <= gates.maximumInteriorVelocityRmsDifferenceOverInletVelocity;
  const meanDragEquivalent = meanDragRelativeDifference === null
    ? null
    : meanDragRelativeDifference
      <= gates.maximumFixedBodyMeanDragRelativeDifference;
  const liftRmsEquivalent = liftRmsRelativeDifference === null
    ? null
    : liftRmsRelativeDifference
      <= gates.maximumFixedBodyLiftRmsRelativeDifference;
  let pass: boolean | null = null;
  if (definition.protocol === "uniform-target-no-body") {
    pass = candidateResult.gate.uniformStatePass === true;
  } else if (definition.protocol === "fixed-body-established-prerun") {
    pass = densityEquivalent
      && velocityEquivalent
      && meanDragEquivalent === true
      && liftRmsEquivalent === true;
  }
  return {
    nominalDiameterCells: definition.nominalDiameterCells,
    relaxationTime: definition.relaxationTime,
    protocol: definition.protocol,
    legacyCaseId: legacyResult.definition.id,
    candidateCaseId: candidateResult.definition.id,
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
    qualificationApplicable,
    pass,
  };
}

function rawMassLedgerPass(summary: PopulationMassSummary | undefined): boolean {
  return summary !== undefined
    && summary.gates.formalShadowExact
    && summary.gates.stepClosurePass
    && summary.gates.cumulativeClosurePass;
}

function nonIncomingExact(summary: PopulationMassSummary | undefined): boolean {
  if (summary === undefined) return false;
  let total = 0;
  for (const direction of CONTRACT.exactPopulationMassBudget
    .directionGroups.nonIncomingKnown) {
    total += summary.cumulativeAdapterAbsoluteByDirection[direction] ?? 0;
  }
  return total === CONTRACT.exactPopulationMassBudget.gates
    .maximumNonIncomingAbsoluteModification;
}

export function runIncomingCharacteristicQualification(
  a8mStartup: readonly A8mStartupEvidenceEntry[],
  a8mAcoustic: readonly A8mAcousticEvidenceEntry[],
  provenance: IncomingCharacteristicProvenance,
  onProgress?: (progress: IncomingCharacteristicProgress) => void,
): IncomingCharacteristicQualificationResult {
  const a8mStartupMap = new Map(a8mStartup.map((entry) => [
    entry.definition.id,
    entry,
  ]));
  const a8mAcousticMap = new Map(a8mAcoustic.map((entry) => [
    entry.definition.id,
    entry,
  ]));
  const startupDefinitions = buildIncomingCharacteristicStartupCases();
  const startupExecutions: IncomingCharacteristicStartupExecution[] = [];
  for (const definition of startupDefinitions) {
    const execution = runIncomingCharacteristicStartupCase(definition, provenance);
    if (definition.strategy === "legacy-zou-he-derived-density") {
      const expected = a8mStartupMap.get(definition.id);
      if (expected === undefined) throw new Error(`missing A8M startup anchor ${definition.id}`);
      execution.result.legacyAnchorComparison = compareLegacyAnchor(
        startupProjection(execution.result),
        {
          definition: expected.definition,
          run: expected.run,
          gate: expected.gate,
        },
      );
    }
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
  const interiorComparisons: IncomingCharacteristicInteriorComparison[] = [];
  for (const definition of startupDefinitions.filter((entry) =>
    entry.strategy === "legacy-zou-he-derived-density")) {
    const legacy = startupExecutions.find((entry) =>
      entry.result.definition.id === definition.id);
    const candidate = startupExecutions.find((entry) => {
      const value = entry.result.definition;
      return value.nominalDiameterCells === definition.nominalDiameterCells
        && value.relaxationTime === definition.relaxationTime
        && value.protocol === definition.protocol
        && value.strategy === "incoming-characteristic-compatible-zou-he";
    });
    if (legacy === undefined || candidate === undefined) {
      throw new Error(`missing A8N strategy pair for ${definition.id}`);
    }
    interiorComparisons.push(compareFields(
      definition,
      legacy.result,
      candidate.result,
      legacy.auditEndField,
      candidate.auditEndField,
    ));
  }

  const acousticDefinitions = buildIncomingCharacteristicAcousticCases();
  const acousticCases: IncomingCharacteristicAcousticResult[] = [];
  for (const definition of acousticDefinitions) {
    const result = runIncomingCharacteristicAcousticCase(definition, provenance);
    if (definition.strategy === "legacy-zou-he-derived-density") {
      const expected = a8mAcousticMap.get(definition.id);
      if (expected === undefined) throw new Error(`missing A8M acoustic anchor ${definition.id}`);
      result.legacyAnchorComparison = compareLegacyAnchor(
        acousticProjection(result),
        {
          definition: expected.definition,
          test: expected.test,
          extendedReference: expected.extendedReference,
          metrics: expected.metrics,
          gate: expected.gate,
        },
      );
    }
    acousticCases.push(result);
    onProgress?.({
      phase: "acoustic",
      completed: acousticCases.length,
      total: acousticDefinitions.length,
      caseId: definition.id,
      pass: result.gate.pass,
    });
  }

  const legacyStartup = startupCases.filter((entry) =>
    entry.definition.strategy === "legacy-zou-he-derived-density");
  const candidateStartup = startupCases.filter((entry) =>
    entry.definition.strategy === "incoming-characteristic-compatible-zou-he");
  const legacyAcoustic = acousticCases.filter((entry) =>
    entry.definition.strategy === "legacy-zou-he-derived-density");
  const candidateAcoustic = acousticCases.filter((entry) =>
    entry.definition.strategy === "incoming-characteristic-compatible-zou-he");
  const startupMismatchCaseIds = legacyStartup.filter((entry) =>
    entry.legacyAnchorComparison?.exactMatch !== true).map((entry) => entry.definition.id);
  const acousticMismatchCaseIds = legacyAcoustic.filter((entry) =>
    entry.legacyAnchorComparison?.exactMatch !== true).map((entry) => entry.definition.id);
  const legacyStartupAnchorsExact = legacyStartup.length
      === CONTRACT.sourceIdentity.a8mEvidence.exactLegacyStartupAnchors
    && startupMismatchCaseIds.length === 0;
  const legacyAcousticAnchorsExact = legacyAcoustic.length
      === CONTRACT.sourceIdentity.a8mEvidence.exactLegacyAcousticAnchors
    && acousticMismatchCaseIds.length === 0;
  const startupMatrixComplete = startupCases.length === CONTRACT.startupMatrix.runCount
    && startupCases.every((entry) => entry.gate.executionPass);
  const acousticMatrixComplete = acousticCases.length
      === CONTRACT.acousticReflection.caseCount
    && acousticCases.every((entry) => entry.gate.executionPass);
  const startupMassSummaries = startupCases.map((entry) => entry.run.massSummary);
  const acousticMassSummaries = acousticCases.flatMap((entry) => [
    entry.test.massSummary,
    entry.extendedReference.massSummary,
  ]);
  const allMassSummaries = [...startupMassSummaries, ...acousticMassSummaries];
  const allFormalShadowsExact = allMassSummaries.every((summary) =>
    summary?.gates.formalShadowExact === true);
  const allMassLedgersClose = allMassSummaries.every(rawMassLedgerPass);
  const candidateSummaries = [
    ...candidateStartup.map((entry) => entry.run.massSummary),
    ...candidateAcoustic.flatMap((entry) => [
      entry.test.massSummary,
      entry.extendedReference.massSummary,
    ]),
  ];
  const allCandidateWritesIncomingOnly = candidateSummaries.every(nonIncomingExact);
  const allCandidateReconstructionsComplete = candidateStartup.every((entry) =>
    entry.run.reconstructionSummary?.gates.pass === true)
    && candidateAcoustic.every((entry) =>
      entry.test.reconstructionSummary.gates.pass
      && entry.extendedReference.reconstructionSummary.gates.pass);
  const massEligible = candidateSummaries.every(rawMassLedgerPass)
    && allCandidateWritesIncomingOnly
    && allCandidateReconstructionsComplete;
  const startupEligible = candidateStartup.length
      === CONTRACT.startupMatrix.cornerCount * CONTRACT.startupMatrix.protocolCount
    && candidateStartup.every((entry) => entry.gate.pass);
  const acousticEligible = candidateAcoustic.length
      === CONTRACT.acousticReflection.relaxationTime.length
    && candidateAcoustic.every((entry) => entry.gate.pass);
  const qualificationComparisons = interiorComparisons.filter((entry) =>
    entry.qualificationApplicable);
  const interiorEligible = qualificationComparisons.length
      === 2 * CONTRACT.startupMatrix.cornerCount
    && qualificationComparisons.every((entry) => entry.pass === true);
  const readyForProSelection = massEligible
    && startupEligible
    && acousticEligible
    && interiorEligible;
  const evidencePass = startupMatrixComplete
    && acousticMatrixComplete
    && allFormalShadowsExact
    && allMassLedgersClose
    && allCandidateReconstructionsComplete
    && allCandidateWritesIncomingOnly
    && legacyStartupAnchorsExact
    && legacyAcousticAnchorsExact;
  return {
    format: "VP-A8N-INCOMING-CHARACTERISTIC-QUALIFICATION-v1",
    contractIdentity: { format: CONTRACT.format, ...provenance },
    startupCases,
    interiorComparisons,
    acousticCases,
    legacyAnchorComparison: {
      startup: {
        checkedCases: legacyStartup.length,
        exactMatches: legacyStartup.length - startupMismatchCaseIds.length,
        mismatchCaseIds: startupMismatchCaseIds,
      },
      acoustic: {
        checkedCases: legacyAcoustic.length,
        exactMatches: legacyAcoustic.length - acousticMismatchCaseIds.length,
        mismatchCaseIds: acousticMismatchCaseIds,
      },
    },
    qualification: {
      candidate: {
        startupCompletedCases: candidateStartup.filter((entry) =>
          entry.gate.executionPass).length,
        startupStableCases: candidateStartup.filter((entry) =>
          entry.gate.executionPass && entry.gate.densityPass && entry.gate.machPass).length,
        startupReconstructionPassedCases: candidateStartup.filter((entry) =>
          entry.gate.reconstructionPass).length,
        massPassedStartupCases: candidateStartup.filter((entry) =>
          entry.gate.massPass).length,
        acousticPassedCases: candidateAcoustic.filter((entry) => entry.gate.pass).length,
        massEligible,
        acousticEligible,
        startupEligible,
        interiorEligible,
        readyForProSelection,
      },
      legacy: {
        startupStableCases: legacyStartup.filter((entry) =>
          entry.gate.executionPass && entry.gate.densityPass && entry.gate.machPass).length,
        acousticPassedCases: legacyAcoustic.filter((entry) => entry.gate.pass).length,
      },
    },
    evidenceDecision: {
      code: evidencePass
        ? CONTRACT.decision.evidenceCompleteCode
        : CONTRACT.decision.internalGateFailureCode,
      pass: evidencePass,
      internalChecks: {
        startupMatrixComplete,
        acousticMatrixComplete,
        allFormalShadowsExact,
        allMassLedgersClose,
        allCandidateReconstructionsComplete,
        allCandidateWritesIncomingOnly,
        legacyStartupAnchorsExact,
        legacyAcousticAnchorsExact,
      },
      independentRepeatRequired: true,
      formalSourceModified: false,
      formalIntegrationUnlocked: false,
      candidateAutomaticallyApproved: false,
      stopAfterEvidenceAndHandoff: true,
      statement: evidencePass
        ? "The frozen A8N candidate evidence is internally complete; the separate candidate decision still requires Pro review and cannot authorize formal integration."
        : "At least one frozen A8N evidence-integrity gate failed; no positive candidate qualification conclusion is admissible.",
      claimUpperBound: CONTRACT.decision.claimUpperBound,
    },
    candidateDecision: {
      code: readyForProSelection
        ? CONTRACT.decision.candidateQualifiedCode
        : CONTRACT.decision.candidateRejectedCode,
      pass: readyForProSelection,
      statement: readyForProSelection
        ? "S9 passed every frozen candidate gate and is ready only for independent Pro selection review."
        : "S9 failed or did not complete at least one frozen candidate gate and is not qualified for selection.",
    },
  };
}

export type {
  FormalIncomingCharacteristicStartupProtocol,
  FormalIncomingCharacteristicStrategy,
  IncomingCharacteristicAcousticDefinition,
  IncomingCharacteristicAcousticResult,
  IncomingCharacteristicInteriorComparison,
  IncomingCharacteristicProvenance,
  IncomingCharacteristicQualificationResult,
  IncomingCharacteristicStartupDefinition,
  IncomingCharacteristicStartupResult,
};
