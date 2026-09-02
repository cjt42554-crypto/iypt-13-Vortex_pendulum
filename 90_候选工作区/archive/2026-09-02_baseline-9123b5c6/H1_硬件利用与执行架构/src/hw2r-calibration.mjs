function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function median(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError("median requires values");
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : 0.5 * (sorted[middle - 1] + sorted[middle]);
}

export function nextCandidateBatchCount(currentBatchCount, observedSeconds) {
  if (!Number.isSafeInteger(currentBatchCount) || currentBatchCount < 1) {
    throw new RangeError("currentBatchCount must be a positive safe integer");
  }
  if (!Number.isFinite(observedSeconds) || observedSeconds <= 0) {
    throw new RangeError("observedSeconds must be finite and positive");
  }
  const scale = clamp(20 / observedSeconds, 1.25, 16);
  const next = Math.ceil(currentBatchCount * scale);
  if (!Number.isSafeInteger(next) || next <= currentBatchCount) {
    throw new Error("candidate batch scaling must strictly increase");
  }
  return next;
}

export async function calibrateCandidate(input) {
  const maximum = input.protocol.calibration.maximumShortCalibrationsPerCandidate;
  let batchCount = input.initialBatchCount ?? 1;
  const observations = [];
  for (let index = 0; index < maximum; index += 1) {
    const result = await input.runCalibration(batchCount, index);
    if (!Number.isFinite(result.wallTimeSeconds) || result.wallTimeSeconds <= 0) {
      throw new Error("MEASUREMENT_INVALID-CALIBRATION-TIME");
    }
    observations.push(Object.freeze({
      index,
      batchCount,
      wallTimeSeconds: result.wallTimeSeconds,
      correctnessSha256: result.correctnessSha256,
    }));
    if (result.wallTimeSeconds
      >= input.protocol.calibration.formalTargetSecondsMinimum
      && result.wallTimeSeconds
        <= input.protocol.calibration.formalTargetSecondsMaximum) {
      return Object.freeze({
        batchCount,
        observations: Object.freeze(observations),
        calibrationComplete: true,
      });
    }
    if (index + 1 < maximum) {
      batchCount = nextCandidateBatchCount(batchCount, result.wallTimeSeconds);
    }
  }
  return Object.freeze({
    batchCount,
    observations: Object.freeze(observations),
    calibrationComplete: false,
  });
}
