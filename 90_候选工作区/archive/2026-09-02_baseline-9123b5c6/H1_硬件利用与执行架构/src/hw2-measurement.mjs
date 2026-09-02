import { performance } from "node:perf_hooks";

import { startResourceSampler } from "./hw2-telemetry.mjs";

function fail(message) {
  throw new Error(`NO-GO-HW2-MEASUREMENT: ${message}`);
}

function clampFraction(value) {
  return Math.max(0, Math.min(1, value));
}

export async function measureSyntheticExecution({
  execute,
  expectedDigest,
  resourceUnits,
  estimatedBytesMoved,
  sustainableBandwidthBytesPerSecond,
  gpuIndex = 0,
  samplerIntervalMs = 250,
}) {
  if (typeof execute !== "function") fail("execute callback is required");
  if (!Number.isFinite(resourceUnits) || resourceUnits < 1) fail("resourceUnits is invalid");
  if (!Number.isFinite(estimatedBytesMoved) || estimatedBytesMoved < 0) fail("estimatedBytesMoved is invalid");
  if (!Number.isFinite(sustainableBandwidthBytesPerSecond) || sustainableBandwidthBytesPerSecond <= 0) {
    fail("sustainableBandwidthBytesPerSecond is invalid");
  }
  const sampler = await startResourceSampler({gpuIndex, intervalMs: samplerIntervalMs});
  const started = performance.now();
  let execution;
  let failure = null;
  try {
    execution = await execute();
  } catch (error) {
    failure = error;
  }
  const wallTimeSeconds = (performance.now() - started) / 1000;
  const telemetry = await sampler.stop();
  if (failure) throw failure;
  if (!execution || execution.classification !== "synthetic-non-scientific") {
    fail("execution classification is invalid");
  }
  const cpuUtilizationFraction = clampFraction(execution.cpuSeconds / (wallTimeSeconds * resourceUnits));
  const bandwidth = estimatedBytesMoved / wallTimeSeconds;
  const memoryBandwidthFraction = clampFraction(bandwidth / sustainableBandwidthBytesPerSecond);
  return Object.freeze({
    wallTimeSeconds,
    cpuUtilizationFraction,
    memoryBandwidthFraction,
    gpuBusyFraction: telemetry.summary.gpuBusyFraction,
    transferFraction: clampFraction(execution.transferSeconds / wallTimeSeconds),
    rssBytes: Math.max(execution.peakRssBytes, telemetry.summary.cgroupMemoryPeakBytes),
    memAvailableBytes: telemetry.summary.memAvailableBytes,
    swapBytes: telemetry.summary.swapBytes,
    memoryEventsDelta: telemetry.summary.memoryEventsDelta,
    thermalThrottle: telemetry.summary.thermalThrottle,
    frequencyDropFraction: telemetry.summary.frequencyDropFraction,
    exitCode: 0,
    signal: null,
    correctnessPass: execution.digest === expectedDigest,
    digest: execution.digest,
    telemetrySampleCount: telemetry.summary.sampleCount,
  });
}

export function toProbeRepeat(measurement) {
  const keys = [
    "wallTimeSeconds",
    "cpuUtilizationFraction",
    "memoryBandwidthFraction",
    "gpuBusyFraction",
    "transferFraction",
    "rssBytes",
    "memAvailableBytes",
    "swapBytes",
    "memoryEventsDelta",
    "thermalThrottle",
    "frequencyDropFraction",
    "exitCode",
    "signal",
  ];
  return Object.freeze(Object.fromEntries(keys.map((key) => [key, measurement[key]])));
}
