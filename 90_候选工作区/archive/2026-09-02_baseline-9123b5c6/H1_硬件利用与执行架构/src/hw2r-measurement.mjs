import { calibrateCandidate } from "./hw2r-calibration.mjs";
import { evaluateHw2rCandidate } from "./hw2r-evaluator.mjs";
import {
  evaluateTelemetryValidity,
  startHw2rTelemetry,
} from "./hw2r-telemetry.mjs";

const REQUIRED_PHASES = Object.freeze([
  "buildOrProvision",
  "coldInitialization",
  "warmup",
  "steadyStateCompute",
  "ipcOrTransfer",
  "audit",
  "shardSerializationFsyncAndHash",
  "finalAggregation",
  "cleanup",
]);

function validateExecutionEnvelope(result) {
  if (!Number.isFinite(result.wallTimeSeconds) || result.wallTimeSeconds <= 0) {
    throw new Error("MEASUREMENT_INVALID-WALL-TIME");
  }
  if (!Number.isFinite(result.workUnits) || result.workUnits <= 0) {
    throw new Error("MEASUREMENT_INVALID-WORK-UNITS");
  }
  if (!/^[0-9a-f]{64}$/.test(result.correctnessSha256 ?? "")) {
    throw new Error("NO-GO-HW2R-CORRECTNESS");
  }
  for (const phase of REQUIRED_PHASES) {
    if (!Number.isFinite(result.phasesSeconds?.[phase])
      || result.phasesSeconds[phase] < 0) {
      throw new Error(`MEASUREMENT_INVALID-LIFECYCLE-MISMATCH: ${phase}`);
    }
  }
  return result;
}

export async function runHw2rCandidateMeasurement(input) {
  const calibration = await calibrateCandidate({
    protocol: input.protocol,
    initialBatchCount: input.initialBatchCount,
    runCalibration: async (batchCount, calibrationIndex) =>
      validateExecutionEnvelope(await input.executor({
        candidate: input.candidate,
        batchCount,
        mode: "calibration",
        calibrationIndex,
      })),
  });
  if (calibration.calibrationComplete !== true) {
    throw new Error("MEASUREMENT_INVALID-CALIBRATION-DID-NOT-REACH-FROZEN-WINDOW");
  }
  for (let index = 0;
    index < input.protocol.calibration.warmupBatchesMinimum;
    index += 1) {
    validateExecutionEnvelope(await input.executor({
      candidate: input.candidate,
      batchCount: calibration.batchCount,
      mode: "warmup",
      warmupIndex: index,
    }));
  }
  const repeats = [];
  for (let repeatIndex = 0;
    repeatIndex < input.protocol.calibration.validFormalRepeats;
    repeatIndex += 1) {
    const telemetry = await (input.telemetryFactory ?? startHw2rTelemetry)({
      gpuIndex: input.candidate.classId === "gpu-compute"
        || input.candidate.classId === "cpu-gpu-hybrid"
        ? 0
        : null,
    });
    let execution;
    let telemetryResult;
    try {
      execution = validateExecutionEnvelope(await input.executor({
        candidate: input.candidate,
        batchCount: calibration.batchCount,
        mode: "formal",
        repeatIndex,
      }));
    } finally {
      telemetryResult = await telemetry.stop();
    }
    const telemetryGate = evaluateTelemetryValidity(
      input.protocol,
      telemetryResult,
      input.candidate.classId === "gpu-compute"
        || input.candidate.classId === "cpu-gpu-hybrid",
      input.candidate.resourceCount,
    );
    repeats.push(Object.freeze({
      ...execution,
      telemetryValid: telemetryGate.telemetryValid,
      safetyPass: telemetryGate.safetyPass && execution.safetyPass === true,
      correctnessPass: execution.correctnessPass === true,
      numericalIdentityPass: execution.numericalIdentityPass === true,
      utilizationOrSaturationPass:
        execution.utilizationOrSaturationPass === true,
      telemetry: telemetryGate,
    }));
  }
  const correctnessHashes = new Set(repeats.map(({ correctnessSha256 }) =>
    correctnessSha256));
  const workUnits = new Set(repeats.map(({ workUnits: value }) => value));
  if (correctnessHashes.size !== 1 || workUnits.size !== 1) {
    throw new Error("NO-GO-HW2R-CORRECTNESS: formal repeats differ");
  }
  const evaluation = evaluateHw2rCandidate(
    input.protocol,
    input.candidate,
    repeats,
    input.baseline,
  );
  return Object.freeze({
    candidate: input.candidate,
    calibration,
    repeats: Object.freeze(repeats),
    evaluation,
  });
}

export { REQUIRED_PHASES as HW2R_REQUIRED_LIFECYCLE_PHASES };
