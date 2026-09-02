import { execFile as execFileCallback } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import os from "node:os";
import { promisify } from "node:util";

import { parseMeminfo, parseMemoryEvents } from "./linux-host.mjs";

const execFile = promisify(execFileCallback);

function median(values) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0 ? (ordered[middle - 1] + ordered[middle]) / 2 : ordered[middle];
}

async function optionalRead(path, fallback = null) {
  try {
    return (await readFile(path, "utf8")).trim();
  } catch (error) {
    if (["ENOENT", "EACCES", "EPERM"].includes(error?.code)) return fallback;
    throw error;
  }
}

async function optionalExec(command, args) {
  try {
    const {stdout} = await execFile(command, args, {
      encoding: "utf8",
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    return stdout.trim();
  } catch {
    return "";
  }
}

async function cgroupDirectory() {
  const text = await optionalRead("/proc/self/cgroup", "");
  const line = text.split(/\r?\n/u).find((entry) => entry.startsWith("0::"));
  return line ? `/sys/fs/cgroup${line.slice(3) === "/" ? "" : line.slice(3)}` : "/sys/fs/cgroup";
}

async function cgroupValue(directory, name) {
  let current = directory;
  while (current.startsWith("/sys/fs/cgroup")) {
    const value = await optionalRead(`${current}/${name}`);
    if (value !== null) return value;
    if (current === "/sys/fs/cgroup") break;
    current = current.slice(0, current.lastIndexOf("/")) || "/sys/fs/cgroup";
  }
  return null;
}

function parseCpuStat(text) {
  const values = {};
  for (const line of String(text ?? "").split(/\r?\n/u)) {
    const [key, raw] = line.trim().split(/\s+/u);
    if (key && /^[0-9]+$/u.test(raw ?? "")) values[key] = Number(raw);
  }
  return values;
}

function parseProcStat(text) {
  const line = String(text).split(/\r?\n/u).find((item) => item.startsWith("cpu "));
  if (!line) return { total: 0, idle: 0 };
  const values = line.trim().split(/\s+/u).slice(1).map(Number);
  if (values.some((value) => !Number.isFinite(value))) return { total: 0, idle: 0 };
  return {
    total: values.reduce((sum, value) => sum + value, 0),
    idle: (values[3] ?? 0) + (values[4] ?? 0),
  };
}

async function cpuFrequencyMedianKHz() {
  const values = [];
  for (let index = 0; index < os.cpus().length; index += 1) {
    const value = await optionalRead(`/sys/devices/system/cpu/cpu${index}/cpufreq/scaling_cur_freq`);
    if (/^[0-9]+$/u.test(value ?? "")) values.push(Number.parseInt(value, 10));
  }
  return median(values);
}

async function cpuTemperatureMaxCelsius() {
  const values = [];
  let hwmons;
  try {
    hwmons = await readdir("/sys/class/hwmon", { withFileTypes: true });
  } catch (error) {
    if (["ENOENT", "EACCES", "EPERM"].includes(error?.code)) return null;
    throw error;
  }
  for (const hwmon of hwmons) {
    if (!hwmon.isDirectory() && !hwmon.isSymbolicLink()) continue;
    const root = `/sys/class/hwmon/${hwmon.name}`;
    const deviceName = await optionalRead(`${root}/name`, "");
    if (!/(?:coretemp|k10temp|zenpower|cpu_thermal)/iu.test(deviceName)) continue;
    let files;
    try {
      files = await readdir(root);
    } catch (error) {
      if (["ENOENT", "EACCES", "EPERM"].includes(error?.code)) continue;
      throw error;
    }
    for (const name of files.filter((value) => /^temp\d+_input$/u.test(value))) {
      const raw = await optionalRead(`${root}/${name}`);
      if (/^-?[0-9]+$/u.test(raw ?? "")) {
        const celsius = Number(raw) / 1000;
        if (Number.isFinite(celsius) && celsius > -100 && celsius < 200) {
          values.push(celsius);
        }
      }
    }
  }
  return values.length > 0 ? Math.max(...values) : null;
}

async function cpuThrottleCounter() {
  const values = [];
  for (let index = 0; index < os.cpus().length; index += 1) {
    for (const name of ["core_throttle_count", "package_throttle_count"]) {
      const raw = await optionalRead(
        `/sys/devices/system/cpu/cpu${index}/thermal_throttle/${name}`,
      );
      if (/^[0-9]+$/u.test(raw ?? "")) values.push(Number(raw));
    }
  }
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
}

function memoryEventValue(text, key) {
  const line = String(text ?? "").split(/\r?\n/u)
    .find((item) => item.startsWith(`${key} `));
  const value = line?.trim().split(/\s+/u)[1];
  return /^[0-9]+$/u.test(value ?? "") ? Number(value) : 0;
}

async function gpuSample(gpuIndex) {
  const output = await optionalExec("nvidia-smi", [
    `--id=${gpuIndex}`,
    "--query-gpu=utilization.gpu,temperature.gpu,clocks.current.sm,clocks.max.sm,clocks_throttle_reasons.active",
    "--format=csv,noheader,nounits",
  ]);
  const fields = output.split(",").map((value) => value.trim());
  if (fields.length !== 5) return null;
  const [busy, temperature, clock, maximumClock, throttle] = fields;
  if (![busy, temperature, clock, maximumClock].every((value) => /^[0-9]+(?:\.[0-9]+)?$/u.test(value))) return null;
  return {
    busyFraction: Number.parseFloat(busy) / 100,
    temperatureCelsius: Number.parseFloat(temperature),
    clockMHz: Number.parseFloat(clock),
    maximumClockMHz: Number.parseFloat(maximumClock),
    throttled: !/^(?:0x0+|not active|n\/a)$/iu.test(throttle),
  };
}

export async function captureResourceSnapshot({gpuIndex = 0} = {}) {
  const directory = await cgroupDirectory();
  const [meminfo, eventsText, memoryCurrentText, memoryPeakText, cpuStatText, procStatText,
    cpuFrequency, cpuTemperature, cpuThrottle, gpu] = await Promise.all([
    readFile("/proc/meminfo", "utf8").then(parseMeminfo),
    cgroupValue(directory, "memory.events"),
    cgroupValue(directory, "memory.current"),
    cgroupValue(directory, "memory.peak"),
    cgroupValue(directory, "cpu.stat"),
    readFile("/proc/stat", "utf8"),
    cpuFrequencyMedianKHz(),
    cpuTemperatureMaxCelsius(),
    cpuThrottleCounter(),
    gpuIndex === null ? null : gpuSample(gpuIndex),
  ]);
  return {
    capturedAt: new Date().toISOString(),
    monotonicNanoseconds: process.hrtime.bigint().toString(),
    memAvailableBytes: meminfo.MemAvailable,
    memTotalBytes: meminfo.MemTotal,
    swapBytes: meminfo.SwapTotal - meminfo.SwapFree,
    memoryEvents: parseMemoryEvents(eventsText ?? ""),
    memoryHighEvent: memoryEventValue(eventsText, "high"),
    cgroupMemoryCurrentBytes: /^[0-9]+$/u.test(memoryCurrentText ?? "")
      ? Number.parseInt(memoryCurrentText, 10)
      : 0,
    cgroupMemoryKernelPeakBytes: /^[0-9]+$/u.test(memoryPeakText ?? "")
      ? Number.parseInt(memoryPeakText, 10)
      : null,
    cpuFrequencyMedianKHz: cpuFrequency,
    cpuTemperatureCelsius: cpuTemperature,
    cpuThrottleCounter: cpuThrottle,
    processRssBytes: process.memoryUsage().rss,
    cgroupCpuStat: parseCpuStat(cpuStatText),
    procCpuStat: parseProcStat(procStatText),
    gpu,
  };
}

export function summarizeResourceSamples(samples, baseline) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("NO-GO-HW2-TELEMETRY: no resource samples were captured");
  }
  const frequencies = samples.map((sample) => sample.cpuFrequencyMedianKHz).filter(Number.isFinite);
  const quarter = Math.max(1, Math.floor(frequencies.length / 4));
  const earlyFrequency = median(frequencies.slice(0, quarter));
  const lateFrequency = median(frequencies.slice(-quarter));
  const frequencyDropFraction = earlyFrequency && lateFrequency && lateFrequency < earlyFrequency
    ? (earlyFrequency - lateFrequency) / earlyFrequency
    : 0;
  const gpuSamples = samples.map((sample) => sample.gpu).filter(Boolean);
  const last = samples.at(-1);
  const elapsedSeconds = Number(
    BigInt(last.monotonicNanoseconds) - BigInt(baseline.monotonicNanoseconds),
  ) / 1e9;
  const cgroupCpuSeconds = Math.max(
    0,
    ((last.cgroupCpuStat.usage_usec ?? 0)
      - (baseline.cgroupCpuStat.usage_usec ?? 0)) / 1e6,
  );
  const totalCpuDelta = Math.max(
    0,
    last.procCpuStat.total - baseline.procCpuStat.total,
  );
  const idleCpuDelta = Math.max(
    0,
    last.procCpuStat.idle - baseline.procCpuStat.idle,
  );
  return {
    memAvailableBytes: Math.min(...samples.map((sample) => sample.memAvailableBytes)),
    swapBytes: Math.max(...samples.map((sample) => sample.swapBytes)),
    swapGrowthBytes: Math.max(
      0,
      Math.max(...samples.map((sample) => sample.swapBytes)) - baseline.swapBytes,
    ),
    cgroupMemoryPeakBytes: Math.max(...samples.map((sample) => sample.cgroupMemoryCurrentBytes)),
    cgroupMemoryKernelPeakBytes: (() => {
      const values = samples.map((sample) => sample.cgroupMemoryKernelPeakBytes)
        .filter(Number.isFinite);
      return values.length > 0 ? Math.max(...values) : null;
    })(),
    memoryEventsDelta: {
      max: Math.max(0, last.memoryEvents.max - baseline.memoryEvents.max),
      oom: Math.max(0, last.memoryEvents.oom - baseline.memoryEvents.oom),
      oomKill: Math.max(0, last.memoryEvents.oomKill - baseline.memoryEvents.oomKill),
      high: Math.max(0, last.memoryHighEvent - baseline.memoryHighEvent),
    },
    processRssPeakBytes: Math.max(...samples.map((sample) => sample.processRssBytes)),
    cpuTemperaturePeakCelsius: (() => {
      const values = samples.map((sample) => sample.cpuTemperatureCelsius)
        .filter(Number.isFinite);
      return values.length > 0 ? Math.max(...values) : null;
    })(),
    cpuFrequencySampleCount: frequencies.length,
    cpuThrottleCounterAvailable: Number.isFinite(baseline.cpuThrottleCounter)
      && Number.isFinite(last.cpuThrottleCounter),
    cpuThrottleCounterGrowth: Number.isFinite(baseline.cpuThrottleCounter)
        && Number.isFinite(last.cpuThrottleCounter)
      ? Math.max(0, last.cpuThrottleCounter - baseline.cpuThrottleCounter)
      : null,
    thermalThrottle: (Number.isFinite(baseline.cpuThrottleCounter)
        && Number.isFinite(last.cpuThrottleCounter)
        && last.cpuThrottleCounter > baseline.cpuThrottleCounter)
      || gpuSamples.some((sample) => sample.throttled === true),
    frequencyDropFraction,
    gpuBusyFraction: median(gpuSamples.map((sample) => sample.busyFraction)) ?? 0,
    elapsedSeconds,
    cgroupCpuSeconds,
    cgroupLogicalCpuUtilization: elapsedSeconds > 0
      ? cgroupCpuSeconds / elapsedSeconds
      : 0,
    systemCpuUtilizationFraction: totalCpuDelta > 0
      ? Math.max(0, Math.min(1, 1 - idleCpuDelta / totalCpuDelta))
      : 0,
    sampleCount: samples.length,
  };
}

export async function startResourceSampler({gpuIndex = 0, intervalMs = 250} = {}) {
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 100 || intervalMs > 5000) {
    throw new Error("NO-GO-HW2-TELEMETRY: intervalMs is outside the safe range");
  }
  const baseline = await captureResourceSnapshot({gpuIndex});
  const samples = [baseline];
  let stopped = false;
  let timer = null;
  let pending = Promise.resolve();
  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(() => {
      pending = captureResourceSnapshot({gpuIndex}).then((sample) => samples.push(sample));
      pending.finally(schedule);
    }, intervalMs);
    timer.unref?.();
  };
  schedule();
  return {
    baseline,
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      await pending;
      samples.push(await captureResourceSnapshot({gpuIndex}));
      return {samples, summary: summarizeResourceSamples(samples, baseline)};
    },
  };
}
