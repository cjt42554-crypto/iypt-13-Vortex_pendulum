import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { loadH2nContract } from "./contract.mjs";
import { evaluateH2nStage0Numerics } from "./h2n-stage0-metrics.mjs";
import { runH2nStage0NativeSnapshots } from "./h2n-stage0-native.mjs";
import {
  buildH2nStage0Reference,
  resolveH2nStage0BodyMode,
} from "./h2n-stage0-reference.mjs";

function numericCheckpointSteps(contractSteps, finalStep) {
  const values = contractSteps.map((step) => step === "final" ? finalStep : step);
  return Object.freeze([...new Set(values)].sort((left, right) => left - right));
}

function includeForcePredecessors(checkpointSteps) {
  const values = new Set(checkpointSteps);
  for (const step of checkpointSteps) {
    if (step > 0) values.add(step - 1);
  }
  return Object.freeze([...values].sort((left, right) => left - right));
}

function assertFormalMatrixEntry(contract, size) {
  const expected = contract.stage0.sizeMatrix.find(({ sizeId }) =>
    sizeId === size.sizeId);
  if (!expected
    || expected.diameterCells !== size.diameterCells
    || expected.nx !== size.nx
    || expected.ny !== size.ny
    || expected.steps !== size.steps) {
    throw new Error("NO-GO-H2N-SOURCE-OR-IDENTITY-DRIFT: stage-0 size matrix");
  }
}

export async function runH2nStage0NumericalComparison(input) {
  const loaded = input.loadedContract ?? await loadH2nContract();
  if (input.mode !== "no-result-smoke") {
    assertFormalMatrixEntry(loaded.contract, input.size);
    if (!loaded.contract.stage0.bodyModes.includes(input.bodyModeId)) {
      throw new Error("NO-GO-H2N-SOURCE-OR-IDENTITY-DRIFT: body mode");
    }
  }
  const contractCheckpoints = input.checkpointSteps
    ?? loaded.contract.stage0.checkpointSteps;
  const evaluationSteps = numericCheckpointSteps(
    contractCheckpoints,
    input.size.steps,
  );
  const executionSteps = includeForcePredecessors(evaluationSteps);
  const bodyMode = await resolveH2nStage0BodyMode(
    input.bodyModeId,
    input.size.ny,
    input.size.diameterCells,
  );
  const reference = await buildH2nStage0Reference({
    nx: input.size.nx,
    ny: input.size.ny,
    steps: input.size.steps,
    diameterCells: input.size.diameterCells,
    maskHalfThicknessCells: input.maskHalfThicknessCells,
    bodyModeId: input.bodyModeId,
    checkpointSteps: executionSteps,
  });
  const candidate = await runH2nStage0NativeSnapshots({
    binaryPath: input.binaryPath,
    backend: input.backend,
    cwd: input.cwd,
    nx: input.size.nx,
    ny: input.size.ny,
    diameterCells: input.size.diameterCells,
    maskHalfThicknessCells: input.maskHalfThicknessCells,
    phaseOffsetYCells: bodyMode.phaseOffsetYCells,
    nativeBodyMode: bodyMode.nativeBodyMode,
    checkpointSteps: executionSteps,
    threads: input.threads ?? 1,
    batchCount: 1,
    ompProcBind: input.ompProcBind,
    ompPlaces: input.ompPlaces,
  });
  const numerical = evaluateH2nStage0Numerics({
    checkpointSteps: evaluationSteps,
    candidateSnapshots: candidate.snapshots,
    referenceSnapshots: reference.snapshots,
    referenceExchanges: reference.exchanges,
    toleranceModel: loaded.contract.stage0.toleranceModel,
  });
  const execution = executionSteps.map((step) => {
    const item = candidate.executions.get(step);
    return Object.freeze({
      step,
      backend: item.backend,
      device: item.device,
      threads: item.threads,
      workUnits: item.workUnits,
      wallTimeSeconds: item.wallTimeSeconds,
      coldInitializationSeconds: item.coldInitializationSeconds,
      steadyComputeSeconds: item.steadyComputeSeconds,
      deviceComputeSeconds: item.deviceComputeSeconds,
      transferSeconds: item.transferSeconds,
      synchronizationSeconds: item.synchronizationSeconds ?? 0,
      auditSeconds: item.auditSeconds,
      cleanupSeconds: item.cleanupSeconds,
    });
  });
  const summary = {
    format: "VP-H2N-STAGE0-NUMERICAL-COMPARISON-v1",
    mode: input.mode ?? "formal-stage0",
    sizeId: input.size.sizeId,
    bodyModeId: input.bodyModeId,
    maskHalfThicknessCells: input.maskHalfThicknessCells,
    backend: input.backend,
    backendVariant: input.backendVariant ?? input.backend,
    contractSha256: loaded.contractSha256,
    sourceIdentitySha256: loaded.sourceIdentity?.canonicalSha256 ?? null,
    fixtureSha256: reference.fixtureSha256,
    binaryIdentitySha256: canonicalSha256(input.binaryIdentity),
    evaluationSteps,
    execution,
    numerical,
    pass: numerical.pass,
    classification: numerical.classification,
    fullEightCaseResultBearingRunPerformed: false,
    canonicalA8rArtifactWritten: false,
    scientificValuesPersisted: false,
    scientificValuesHumanRead: false,
    scientificConclusion: "NONE",
  };
  return Object.freeze({
    ...summary,
    canonicalSha256: canonicalSha256(summary),
  });
}
