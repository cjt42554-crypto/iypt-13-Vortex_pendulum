import { spawn } from "node:child_process";
import { startResourceSampler } from "./hw2-telemetry.mjs";
import { median } from "./hw2r-calibration.mjs";

function parseGpuLine(line) {
  const fields = line.split(",").map((value) => value.trim());
  if (fields.length !== 6) return null;
  const numeric = fields.slice(0, 4).map(Number);
  if (numeric.some((value) => !Number.isFinite(value))) return null;
  const powerWatts = Number(fields[4]);
  return Object.freeze({
    busyFraction: numeric[0] / 100,
    memoryUsedMiB: numeric[1],
    temperatureCelsius: numeric[2],
    clockSmMHz: numeric[3],
    powerWatts: Number.isFinite(powerWatts) ? powerWatts : null,
    throttleReason: fields[5],
  });
}

function startPersistentGpuSampler(gpuIndex, intervalMs) {
  const child = spawn("nvidia-smi", [
    `--id=${gpuIndex}`,
    "--query-gpu=utilization.gpu,memory.used,temperature.gpu,clocks.current.sm,power.draw,clocks_throttle_reasons.active",
    "--format=csv,noheader,nounits",
    "-lms",
    String(intervalMs),
  ], { stdio: ["ignore", "pipe", "pipe"] });
  const samples = [];
  const stderr = [];
  let pending = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/u);
    pending = lines.pop() ?? "";
    for (const line of lines) {
      const sample = parseGpuLine(line);
      if (sample) samples.push(sample);
    }
  });
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const exit = new Promise((accept, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => accept({ code, signal }));
  });
  return {
    async stop() {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGINT");
      }
      const status = await exit;
      const final = parseGpuLine(pending.trim());
      if (final) samples.push(final);
      if (samples.length === 0) {
        throw new Error(
          "MEASUREMENT_INVALID-INSUFFICIENT-TELEMETRY: "
            + Buffer.concat(stderr).toString("utf8"),
        );
      }
      return Object.freeze({
        status,
        samples: Object.freeze(samples),
        summary: Object.freeze({
          samplerExitExpected: status.code === 0
            || (status.code === null && status.signal === "SIGINT"),
          sampleCount: samples.length,
          gpuBusyMedianFraction: median(samples.map(({ busyFraction }) => busyFraction)),
          memoryUsedPeakMiB: Math.max(...samples.map(({ memoryUsedMiB }) => memoryUsedMiB)),
          temperaturePeakCelsius: Math.max(...samples.map(({ temperatureCelsius }) => temperatureCelsius)),
          clockSmMedianMHz: median(samples.map(({ clockSmMHz }) => clockSmMHz)),
          powerSampleCount: samples.filter(({ powerWatts }) =>
            Number.isFinite(powerWatts)).length,
          powerMedianWatts: (() => {
            const values = samples.map(({ powerWatts }) => powerWatts)
              .filter(Number.isFinite);
            return values.length > 0 ? median(values) : null;
          })(),
          powerPeakWatts: (() => {
            const values = samples.map(({ powerWatts }) => powerWatts)
              .filter(Number.isFinite);
            return values.length > 0 ? Math.max(...values) : null;
          })(),
          throttled: samples.some(({ throttleReason }) =>
            !/^(?:0x0+|not active|n\/a)$/iu.test(throttleReason)),
        }),
      });
    },
  };
}

export async function startHw2rTelemetry({
  gpuIndex = null,
  cpuIntervalMs = 250,
  gpuIntervalMs = 100,
} = {}) {
  const cpu = await startResourceSampler({ gpuIndex: null, intervalMs: cpuIntervalMs });
  const gpu = gpuIndex === null ? null : startPersistentGpuSampler(gpuIndex, gpuIntervalMs);
  return {
    async stop() {
      const [cpuResult, gpuResult] = await Promise.all([
        cpu.stop(),
        gpu?.stop() ?? null,
      ]);
      return Object.freeze({ cpu: cpuResult, gpu: gpuResult });
    },
  };
}

export function evaluateTelemetryValidity(
  protocol,
  telemetry,
  requiresGpu,
  assignedCpuResources = 1,
) {
  const cpuSummary = telemetry.cpu.summary;
  const gpuSummary = telemetry.gpu?.summary ?? null;
  const systemReserveRequired = Math.max(
    protocol.safety.systemReserveBytesMinimum,
    protocol.safety.systemReserveMemTotalFraction
      * telemetry.cpu.baseline.memTotalBytes,
  );
  const gpuValid = !requiresGpu
    || (gpuSummary !== null
      && gpuSummary.sampleCount >= protocol.telemetry.gpuValidSamplesMinimum
      && gpuSummary.samplerExitExpected === true
      && gpuSummary.powerSampleCount >= protocol.telemetry.gpuValidSamplesMinimum);
  const cpuValid = cpuSummary.sampleCount >= 3
    && cpuSummary.cpuFrequencySampleCount >= 3
    && Number.isFinite(cpuSummary.processRssPeakBytes)
    && Number.isFinite(cpuSummary.cpuTemperaturePeakCelsius)
    && Number.isFinite(cpuSummary.cgroupMemoryKernelPeakBytes);
  const safetyPass = cpuSummary.memoryEventsDelta.max === 0
    && cpuSummary.memoryEventsDelta.oom === 0
    && cpuSummary.memoryEventsDelta.oomKill === 0
    && cpuSummary.memoryEventsDelta.high === 0
    && cpuSummary.swapGrowthBytes <= protocol.safety.swapGrowthMaximumBytes
    && cpuSummary.memAvailableBytes >= systemReserveRequired
    && cpuSummary.frequencyDropFraction
      <= protocol.safety.frequencyDropFractionMaximum
    && cpuSummary.thermalThrottle !== true
    && (gpuSummary?.throttled ?? false) !== true;
  return Object.freeze({
    telemetryValid: cpuValid && gpuValid,
    safetyPass,
    gpuSampleCount: gpuSummary?.sampleCount ?? 0,
    gpuBusyMedianFraction: gpuSummary?.gpuBusyMedianFraction ?? null,
    assignedCpuResources,
    assignedCpuUtilizationFraction: Math.min(
      1,
      cpuSummary.cgroupLogicalCpuUtilization / Math.max(1, assignedCpuResources),
    ),
    systemCpuUtilizationFraction: cpuSummary.systemCpuUtilizationFraction,
    systemReserveRequired,
    cpuSummary,
    gpuSummary,
  });
}
