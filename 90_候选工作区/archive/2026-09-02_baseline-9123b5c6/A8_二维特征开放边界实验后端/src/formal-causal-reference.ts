import {
  FORMAL_CAUSAL_REFERENCE_CONTRACT as CONTRACT,
  buildFormalCausalReferenceDefinitions,
} from "./formal-causal-reference-contract.ts";
import {
  causalAnchorKey,
  runCausalReferenceMatrix,
  type CausalMatrixProgress,
  type CausalMatrixResult,
} from "./formal-causal-reference-analysis.ts";
import {
  runPerturbationMatrix,
  type PerturbationMatrixProgress,
  type PerturbationMatrixResult,
} from "./formal-causal-reference-perturbations.ts";
import {
  runStatisticalReferenceCase,
  type A8nAnchorMassRecord,
  type StatisticalRunResult,
} from "./formal-causal-reference-runs.ts";

export interface CausalReferenceProvenance {
  formalSourceSha256: string;
  proDecisionSha256: string;
  a8nStoredArtifactSha256: string;
  a8nCanonicalArtifactSha256: string;
  frozenS9BoundarySha256: string;
  frozenA8nContractSha256: string;
  fixedCylinderGeometrySha256: string;
  fixedCylinderMetricsSha256: string;
  contractSha256: string;
  contractDocumentSha256: string;
  contractCommit: string;
  implementationCommit: string;
  implementationTreeSha256: string;
}

export interface A8nFixedBodyAnchorEntry {
  definition: {
    id: string;
    nominalDiameterCells: number;
    relaxationTime: number;
    strategy: "legacy-zou-he-derived-density"
      | "incoming-characteristic-compatible-zou-he";
    protocol: string;
  };
  run: {
    massStepRecords: A8nAnchorMassRecord[];
  };
}

export interface StatisticalMatrixProgress {
  phase: "statistics";
  completed: number;
  total: number;
  caseId: string;
  internalPass: boolean;
  maturityPass: boolean;
}

export type CausalReferenceProgress =
  CausalMatrixProgress | StatisticalMatrixProgress | PerturbationMatrixProgress;

export interface StatisticalMatrixResult {
  runs: StatisticalRunResult[];
  gate: {
    runCountPass: boolean;
    allRunsCompleted: boolean;
    allStabilityPass: boolean;
    allMassAndReconstructionPass: boolean;
    allWindowsComplete: boolean;
    allContinuousWindowsMature: boolean;
    pass: boolean;
  };
}

export interface FormalCausalReferenceQualificationResult {
  format: "VP-A8O-CAUSAL-REFERENCE-2D-QUALIFICATION-v1";
  contractIdentity: CausalReferenceProvenance & {
    format: "VP-A8O-CAUSAL-REFERENCE-2D-QUALIFICATION-CONTRACT-v1";
  };
  inheritedA8nAnchors: {
    requiredCases: number;
    providedCases: number;
    uniqueCases: number;
    exactMatchedCases: number;
    mismatchCaseIds: string[];
    pass: boolean;
  };
  causal: CausalMatrixResult;
  statistics: StatisticalMatrixResult;
  perturbations: PerturbationMatrixResult;
  evidenceDecision: {
    code: string;
    pass: boolean;
    internalChecks: {
      causalMatrixComplete: boolean;
      statisticalMatrixComplete: boolean;
      perturbationMatrixComplete: boolean;
      allRunsFiniteAndCompleted: boolean;
      allMassLedgersClose: boolean;
      allS9ReconstructionsPass: boolean;
      allCandidateWritesIncomingOnly: boolean;
      all18A8nAnchorsExact: boolean;
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
    gates: {
      causalReferenceValid: boolean;
      causalSuperiority: boolean;
      distanceConvergence: boolean;
      alignedFluxConsistency: boolean;
      statisticsMature: boolean;
      twoDimensionalQualified: boolean;
    };
    statement: string;
  };
}

function buildAnchorMap(
  entries: readonly A8nFixedBodyAnchorEntry[],
): {
  map: Map<string, readonly A8nAnchorMassRecord[]>;
  providedIds: string[];
} {
  const map = new Map<string, readonly A8nAnchorMassRecord[]>();
  const providedIds: string[] = [];
  for (const entry of entries) {
    if (entry.definition.protocol !== "fixed-body-established-prerun") {
      continue;
    }
    const key = causalAnchorKey(
      entry.definition.nominalDiameterCells,
      entry.definition.relaxationTime,
      entry.definition.strategy,
    );
    if (map.has(key)) {
      throw new Error("duplicate A8N fixed-body anchor " + key);
    }
    if (!Array.isArray(entry.run.massStepRecords)
      || entry.run.massStepRecords.length === 0) {
      throw new Error("empty A8N fixed-body anchor " + key);
    }
    map.set(key, entry.run.massStepRecords);
    providedIds.push(entry.definition.id);
  }
  return { map, providedIds };
}

function runStatisticalMatrix(
  onProgress?: (progress: StatisticalMatrixProgress) => void,
): StatisticalMatrixResult {
  const definitions = buildFormalCausalReferenceDefinitions("statistics");
  const runs: StatisticalRunResult[] = [];
  for (const definition of definitions) {
    const result = runStatisticalReferenceCase(definition);
    runs.push(result);
    const internalPass = result.gate.executionPass
      && result.gate.densityPass
      && result.gate.machPass
      && result.gate.massPass
      && result.gate.reconstructionPass
      && result.gate.windowsComplete;
    onProgress?.({
      phase: "statistics",
      completed: runs.length,
      total: definitions.length,
      caseId: definition.id,
      internalPass,
      maturityPass: result.gate.pass,
    });
  }
  const runCountPass = runs.length
    === CONTRACT.continuousStatistics.matrixRunCount;
  const allRunsCompleted = runs.every((entry) =>
    entry.gate.executionPass);
  const allStabilityPass = runs.every((entry) =>
    entry.gate.densityPass && entry.gate.machPass);
  const allMassAndReconstructionPass = runs.every((entry) =>
    entry.gate.massPass && entry.gate.reconstructionPass);
  const allWindowsComplete = runs.every((entry) =>
    entry.gate.windowsComplete);
  const allContinuousWindowsMature = runs.every((entry) =>
    entry.gate.pass);
  return {
    runs,
    gate: {
      runCountPass,
      allRunsCompleted,
      allStabilityPass,
      allMassAndReconstructionPass,
      allWindowsComplete,
      allContinuousWindowsMature,
      pass: runCountPass
        && allRunsCompleted
        && allStabilityPass
        && allMassAndReconstructionPass
        && allWindowsComplete
        && allContinuousWindowsMature,
    },
  };
}

export function runFormalCausalReferenceQualification(
  a8nStartupCases: readonly A8nFixedBodyAnchorEntry[],
  provenance: CausalReferenceProvenance,
  onProgress?: (progress: CausalReferenceProgress) => void,
): FormalCausalReferenceQualificationResult {
  const anchors = buildAnchorMap(a8nStartupCases);
  const causal = runCausalReferenceMatrix(
    anchors.map,
    onProgress,
  );
  const statistics = runStatisticalMatrix(onProgress);
  const perturbations = runPerturbationMatrix(onProgress);
  const anchorRuns = causal.runs.filter((entry) =>
    entry.anchorComparison.applicable);
  const mismatchCaseIds = anchorRuns
    .filter((entry) => entry.anchorComparison.exactMatch !== true)
    .map((entry) => entry.definition.id);
  const inheritedA8nAnchors = {
    requiredCases: CONTRACT.sourceIdentity.a8nEvidence
      .exactShortDomainCausalAnchors,
    providedCases: anchors.providedIds.length,
    uniqueCases: anchors.map.size,
    exactMatchedCases: anchorRuns.length - mismatchCaseIds.length,
    mismatchCaseIds,
    pass: anchors.map.size
        === CONTRACT.sourceIdentity.a8nEvidence.exactShortDomainCausalAnchors
      && anchorRuns.length
        === CONTRACT.sourceIdentity.a8nEvidence.exactShortDomainCausalAnchors
      && mismatchCaseIds.length === 0,
  };
  const causalMatrixComplete = causal.gate.runCountPass
    && causal.gate.cornerAnalysisCountPass
    && causal.gate.allRunsCompleted;
  const statisticalMatrixComplete = statistics.gate.runCountPass
    && statistics.gate.allRunsCompleted
    && statistics.gate.allWindowsComplete;
  const perturbationMatrixComplete =
    perturbations.gate.pairCountPass
    && perturbations.gate.traceCountPass
    && perturbations.gate.shearDiagnosticComplete;
  const allCausalInternal = causal.gate.allInternalRunGatesPass;
  const allStatisticsInternal = statistics.gate.allStabilityPass
    && statistics.gate.allMassAndReconstructionPass
    && statistics.gate.allWindowsComplete;
  const allRunsFiniteAndCompleted = causalMatrixComplete
    && statisticalMatrixComplete
    && perturbationMatrixComplete
    && allCausalInternal
    && allStatisticsInternal
    && perturbations.gate.allInternalPass;
  const allMassLedgersClose = causal.runs.every((entry) =>
    entry.massSummary.gates.stepClosurePass
    && entry.massSummary.gates.cumulativeClosurePass)
    && statistics.runs.every((entry) =>
      entry.massSummary.gates.stepClosurePass
      && entry.massSummary.gates.cumulativeClosurePass)
    && perturbations.pairs.every((entry) =>
      entry.test.massSummary.gates.stepClosurePass
      && entry.test.massSummary.gates.cumulativeClosurePass
      && entry.extendedReference.massSummary.gates.stepClosurePass
      && entry.extendedReference.massSummary.gates.cumulativeClosurePass);
  const allS9ReconstructionsPass = causal.runs
    .filter((entry) =>
      entry.definition.strategy
        === "incoming-characteristic-compatible-zou-he")
    .every((entry) => entry.reconstructionSummary.gates.pass)
    && statistics.runs
      .filter((entry) =>
        entry.definition.strategy
          === "incoming-characteristic-compatible-zou-he")
      .every((entry) => entry.reconstructionSummary.gates.pass)
    && perturbations.pairs
      .filter((entry) =>
        entry.definition.strategy
          === "incoming-characteristic-compatible-zou-he")
      .every((entry) =>
        entry.test.reconstructionSummary.gates.pass
        && entry.extendedReference.reconstructionSummary.gates.pass);
  const allCandidateWritesIncomingOnly = causal.runs
    .filter((entry) =>
      entry.definition.strategy
        === "incoming-characteristic-compatible-zou-he")
    .every((entry) =>
      entry.massSummary.gates.nonIncomingModificationPass)
    && statistics.runs
      .filter((entry) =>
        entry.definition.strategy
          === "incoming-characteristic-compatible-zou-he")
      .every((entry) =>
        entry.massSummary.gates.nonIncomingModificationPass)
    && perturbations.pairs
      .filter((entry) =>
        entry.definition.strategy
          === "incoming-characteristic-compatible-zou-he")
      .every((entry) =>
        entry.test.massSummary.gates.nonIncomingModificationPass
        && entry.extendedReference.massSummary.gates
          .nonIncomingModificationPass);
  const evidencePass = causalMatrixComplete
    && statisticalMatrixComplete
    && perturbationMatrixComplete
    && allRunsFiniteAndCompleted
    && allMassLedgersClose
    && allS9ReconstructionsPass
    && allCandidateWritesIncomingOnly
    && inheritedA8nAnchors.pass;
  const causalReferenceValid = causal.gate.allReferencesValid;
  const causalSuperiority = causal.gate.allCandidateSuperiorityPass;
  const distanceConvergence = causal.gate.allDistanceConvergencePass;
  const alignedFluxConsistency = causal.gate.allAlignedFluxPass;
  const statisticsMature = statistics.gate.allContinuousWindowsMature;
  const twoDimensionalQualified =
    perturbations.gate.allS9ObliquePass
    && perturbations.gate.allS9LocalizedPressurePass;
  const candidatePass = evidencePass
    && causalReferenceValid
    && causalSuperiority
    && distanceConvergence
    && alignedFluxConsistency
    && statisticsMature
    && twoDimensionalQualified;
  return {
    format: "VP-A8O-CAUSAL-REFERENCE-2D-QUALIFICATION-v1",
    contractIdentity: { format: CONTRACT.format, ...provenance },
    inheritedA8nAnchors,
    causal,
    statistics,
    perturbations,
    evidenceDecision: {
      code: evidencePass
        ? CONTRACT.decision.evidenceCompleteCode
        : CONTRACT.decision.evidenceIncompleteCode,
      pass: evidencePass,
      internalChecks: {
        causalMatrixComplete,
        statisticalMatrixComplete,
        perturbationMatrixComplete,
        allRunsFiniteAndCompleted,
        allMassLedgersClose,
        allS9ReconstructionsPass,
        allCandidateWritesIncomingOnly,
        all18A8nAnchorsExact: inheritedA8nAnchors.pass,
      },
      independentRepeatRequired: true,
      formalSourceModified: false,
      formalIntegrationUnlocked: false,
      candidateAutomaticallyApproved: false,
      stopAfterEvidenceAndHandoff: true,
      statement: evidencePass
        ? "The frozen A8O candidate evidence is internally complete; physical selection remains a separate frozen-gate decision and formal integration remains locked."
        : "At least one frozen A8O evidence-integrity or completeness gate failed; no positive physical-selection conclusion is admissible.",
      claimUpperBound: CONTRACT.decision.claimUpperBound,
    },
    candidateDecision: {
      code: candidatePass
        ? CONTRACT.decision.candidateReadyCode
        : CONTRACT.decision.candidateHoldCode,
      pass: candidatePass,
      gates: {
        causalReferenceValid,
        causalSuperiority,
        distanceConvergence,
        alignedFluxConsistency,
        statisticsMature,
        twoDimensionalQualified,
      },
      statement: candidatePass
        ? "S9 passed every frozen A8O selection gate and is ready only for independent Pro review."
        : "S9 failed or did not complete at least one frozen A8O physical-selection gate and remains on HOLD.",
    },
  };
}
