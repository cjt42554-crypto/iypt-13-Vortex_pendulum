import { execFile as execFileCallback } from "node:child_process";
import { access, readFile, readdir, stat, statfs } from "node:fs/promises";
import os from "node:os";
import { promisify } from "node:util";

import { collectStaticInventory } from "./inventory.mjs";

const execFile = promisify(execFileCallback);
const KiB = 1024;

function fail(message) {
  throw new Error(`NO-GO-HW2-LINUX-HOST: ${message}`);
}

function integer(value, label, {minimum = 0} = {}) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) fail(`${label} is invalid`);
  return parsed;
}

async function optionalRead(path, fallback = null) {
  try {
    return (await readFile(path, "utf8")).trim();
  } catch (error) {
    if (["ENOENT", "EACCES", "EPERM"].includes(error?.code)) return fallback;
    throw error;
  }
}

async function optionalExec(command, args = []) {
  try {
    const {stdout = "", stderr = ""} = await execFile(command, args, {
      encoding: "utf8",
      timeout: 10_000,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
    return {available: true, stdout: stdout.trim(), stderr: stderr.trim()};
  } catch (error) {
    if (error?.code === "ENOENT") return {available: false, stdout: "", stderr: ""};
    return {
      available: true,
      stdout: String(error?.stdout ?? "").trim(),
      stderr: String(error?.stderr ?? error?.message ?? "").trim(),
      exitCode: Number.isSafeInteger(error?.code) ? error.code : null,
    };
  }
}

export function parseMeminfo(text) {
  const result = {};
  for (const line of text.split(/\r?\n/u)) {
    const match = /^([A-Za-z_()]+):\s+([0-9]+)\s+kB$/u.exec(line.trim());
    if (match) result[match[1]] = integer(match[2], `meminfo.${match[1]}`) * KiB;
  }
  for (const required of ["MemTotal", "MemAvailable", "SwapTotal", "SwapFree"]) {
    if (!Number.isSafeInteger(result[required])) fail(`meminfo lacks ${required}`);
  }
  return result;
}

export function parseKeyValueLines(text, separator = "=") {
  const result = {};
  for (const line of text.split(/\r?\n/u)) {
    const index = line.indexOf(separator);
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + separator.length).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    result[key] = value;
  }
  return result;
}

export function parseMemoryEvents(text) {
  const parsed = {};
  for (const line of text.split(/\r?\n/u)) {
    const [key, value, extra] = line.trim().split(/\s+/u);
    if (!key || value === undefined || extra !== undefined) continue;
    parsed[key] = integer(value, `memory.events.${key}`);
  }
  return {
    max: parsed.max ?? 0,
    oom: parsed.oom ?? 0,
    oomKill: parsed.oom_kill ?? 0,
  };
}

export function parseLscpuJson(text) {
  const document = JSON.parse(text);
  if (!Array.isArray(document?.lscpu)) fail("lscpu JSON is invalid");
  return Object.fromEntries(document.lscpu.map(({field, data}) => [field.replace(/:$/u, ""), data]));
}

function parseCacheBytes(value) {
  const match = /^([0-9]+(?:\.[0-9]+)?)\s*([KMGT])iB(?:\s*\([^)]+\))?$/iu.exec(String(value).trim());
  if (!match) return null;
  const powers = {K: 1, M: 2, G: 3, T: 4};
  return Math.round(Number.parseFloat(match[1]) * 1024 ** powers[match[2].toUpperCase()]);
}

function parseCpuList(list) {
  const values = [];
  for (const token of String(list).split(",")) {
    const match = /^([0-9]+)(?:-([0-9]+))?$/u.exec(token.trim());
    if (!match) continue;
    const start = integer(match[1], "cpu list start");
    const end = match[2] === undefined ? start : integer(match[2], "cpu list end");
    for (let value = start; value <= end; value += 1) values.push(value);
  }
  return values;
}

function parseNvidiaCsvLine(line) {
  const fields = line.split(",").map((value) => value.trim());
  if (fields.length !== 13) return null;
  const [index, uuid, model, computeCapability, memoryTotalMiB, memoryUsedMiB,
    utilizationGpuPercent, utilizationMemoryPercent, temperatureCelsius,
    clockSmMHz, clockSmMaxMHz, performanceState, persistenceMode] = fields;
  return {
    deviceId: uuid,
    index: integer(index, "gpu.index"),
    model,
    computeCapability,
    memoryTotalBytes: integer(memoryTotalMiB, "gpu.memoryTotalMiB") * 1024 ** 2,
    memoryUsedBytes: integer(memoryUsedMiB, "gpu.memoryUsedMiB") * 1024 ** 2,
    utilizationGpuFraction: integer(utilizationGpuPercent, "gpu.utilizationGpuPercent") / 100,
    utilizationMemoryFraction: integer(utilizationMemoryPercent, "gpu.utilizationMemoryPercent") / 100,
    temperatureCelsius: integer(temperatureCelsius, "gpu.temperatureCelsius"),
    clockSmMHz: integer(clockSmMHz, "gpu.clockSmMHz"),
    clockSmMaxMHz: integer(clockSmMaxMHz, "gpu.clockSmMaxMHz"),
    performanceState,
    persistenceMode,
  };
}

async function findCgroupDirectory() {
  const cgroup = await optionalRead("/proc/self/cgroup", "");
  const unified = cgroup.split(/\r?\n/u).find((line) => line.startsWith("0::"));
  if (!unified) return "/sys/fs/cgroup";
  const relative = unified.slice(3);
  return `/sys/fs/cgroup${relative === "/" ? "" : relative}`;
}

async function readCgroupValue(startDirectory, name) {
  let directory = startDirectory;
  while (directory.startsWith("/sys/fs/cgroup")) {
    const value = await optionalRead(`${directory}/${name}`);
    if (value !== null) return {value, path: `${directory}/${name}`};
    if (directory === "/sys/fs/cgroup") break;
    directory = directory.slice(0, directory.lastIndexOf("/")) || "/sys/fs/cgroup";
  }
  return {value: null, path: null};
}

async function collectCpu() {
  const lscpu = await optionalExec("lscpu", ["-J"]);
  if (!lscpu.available || lscpu.exitCode) fail("lscpu -J is unavailable");
  const fields = parseLscpuJson(lscpu.stdout);
  return {
    architecture: fields.Architecture,
    vendor: fields["Vendor ID"],
    model: fields["Model name"],
    socketCount: integer(fields["Socket(s)"], "cpu.socketCount", {minimum: 1}),
    physicalCoreCount: integer(fields["Core(s) per socket"], "cpu.coresPerSocket", {minimum: 1}) *
      integer(fields["Socket(s)"], "cpu.socketCount", {minimum: 1}),
    logicalCpuCount: integer(fields["CPU(s)"], "cpu.logicalCpuCount", {minimum: 1}),
    threadsPerCore: integer(fields["Thread(s) per core"], "cpu.threadsPerCore", {minimum: 1}),
    onlineCpuList: parseCpuList(fields["On-line CPU(s) list"]),
    minimumMHz: Number.parseFloat(fields["CPU min MHz"] ?? "0"),
    maximumMHz: Number.parseFloat(fields["CPU max MHz"] ?? "0"),
  };
}

async function collectNuma() {
  const entries = await readdir("/sys/devices/system/node", {withFileTypes: true});
  const nodes = entries
    .filter((entry) => entry.isDirectory() && /^node[0-9]+$/u.test(entry.name))
    .map((entry) => integer(entry.name.slice(4), "numa node"))
    .sort((a, b) => a - b);
  const cpuLists = {};
  for (const node of nodes) {
    cpuLists[String(node)] = parseCpuList(await optionalRead(`/sys/devices/system/node/node${node}/cpulist`, ""));
  }
  return {nodeCount: Math.max(1, nodes.length), nodes: nodes.length > 0 ? nodes : [0], cpuLists};
}

async function collectCache() {
  const lscpu = await optionalExec("lscpu", ["-J"]);
  const fields = parseLscpuJson(lscpu.stdout);
  return {
    l1DataBytes: parseCacheBytes(fields["L1d cache"]),
    l1InstructionBytes: parseCacheBytes(fields["L1i cache"]),
    l2Bytes: parseCacheBytes(fields["L2 cache"]),
    l3Bytes: parseCacheBytes(fields["L3 cache"]),
    l3InstanceCount: integer(/\(([0-9]+) instances\)/u.exec(fields["L3 cache"] ?? "")?.[1] ?? 1, "cache.l3InstanceCount", {minimum: 1}),
  };
}

async function collectIsa() {
  const lscpu = await optionalExec("lscpu", ["-J"]);
  const fields = parseLscpuJson(lscpu.stdout);
  const flags = String(fields.Flags ?? "").split(/\s+/u).filter(Boolean).sort();
  return {
    flags,
    avx2: flags.includes("avx2"),
    avx512: flags.includes("avx512f"),
    fma: flags.includes("fma"),
  };
}

async function collectMemoryAndSwap() {
  const info = parseMeminfo(await readFile("/proc/meminfo", "utf8"));
  return {
    memory: {memTotalBytes: info.MemTotal, memAvailableBytes: info.MemAvailable},
    swap: {
      totalBytes: info.SwapTotal,
      usedBytes: info.SwapTotal - info.SwapFree,
      source: "proc-meminfo",
    },
  };
}

async function collectCgroup(memTotalBytes) {
  const directory = await findCgroupDirectory();
  const [limit, current, events] = await Promise.all([
    readCgroupValue(directory, "memory.max"),
    readCgroupValue(directory, "memory.current"),
    readCgroupValue(directory, "memory.events"),
  ]);
  const unbounded = limit.value === null || limit.value === "max";
  return {
    version: 2,
    path: directory,
    memoryLimitBytes: unbounded ? memTotalBytes : integer(limit.value, "cgroup.memory.max", {minimum: 1}),
    memoryLimitRaw: limit.value ?? "unavailable",
    memoryLimitSource: unbounded ? "host-memory-bound-for-unbounded-cgroup" : limit.path,
    memoryCurrentBytes: current.value === null ? 0 : integer(current.value, "cgroup.memory.current"),
    memoryEvents: parseMemoryEvents(events.value ?? ""),
    dedicatedProbeScopeRequired: true,
  };
}

async function collectGpu() {
  const query = await optionalExec("nvidia-smi", [
    "--query-gpu=index,uuid,name,compute_cap,memory.total,memory.used,utilization.gpu,utilization.memory,temperature.gpu,clocks.current.sm,clocks.max.sm,pstate,persistence_mode",
    "--format=csv,noheader,nounits",
  ]);
  if (!query.available || query.exitCode) {
    return {driverAccessible: false, devices: [], queryError: query.stderr || "nvidia-smi-unavailable"};
  }
  const processes = await optionalExec("nvidia-smi", [
    "--query-compute-apps=gpu_uuid,pid,process_name,used_memory",
    "--format=csv,noheader,nounits",
  ]);
  const processUuids = new Set(
    processes.stdout.split(/\r?\n/u).filter(Boolean).map((line) => line.split(",")[0].trim()),
  );
  const library = await optionalExec("ldconfig", ["-p"]);
  const cudaDriverLibraryPresent = /libcuda\.so(?:\.1)?\s/iu.test(library.stdout);
  const devices = query.stdout.split(/\r?\n/u).filter(Boolean).map(parseNvidiaCsvLine).filter(Boolean)
    .map((device) => ({
      ...device,
      accessible: true,
      foreignProcessPresent: processUuids.has(device.deviceId),
      computeApis: cudaDriverLibraryPresent ? ["cuda-driver-jit"] : [],
    }));
  return {driverAccessible: true, cudaDriverLibraryPresent, devices};
}

async function toolIdentity(command, args = ["--version"]) {
  const result = await optionalExec(command, args);
  return {
    available: result.available && !result.exitCode,
    identity: (result.stdout || result.stderr).split(/\r?\n/u)[0] || null,
  };
}

async function collectCompiler() {
  const [gcc, clang, nvcc, cmake, opensslHeader, libcrypto] = await Promise.all([
    toolIdentity("gcc"),
    toolIdentity("clang"),
    toolIdentity("nvcc"),
    toolIdentity("cmake"),
    access("/usr/include/openssl/sha.h").then(() => true, () => false),
    optionalExec("ldconfig", ["-p"]),
  ]);
  return {
    identity: gcc.identity ?? clang.identity ?? "no-supported-c-compiler",
    gcc,
    clang,
    nvcc,
    cmake,
    openmpCandidate: gcc.available,
    opensslShaHeaderPresent: opensslHeader,
    libcryptoPresent: /libcrypto\.so(?:\.3)?\s/iu.test(libcrypto.stdout),
  };
}

async function collectFilesystem() {
  const target = os.tmpdir();
  const [item, filesystem] = await Promise.all([stat(target, {bigint: true}), statfs(target, {bigint: true})]);
  const mountInfo = await optionalRead("/proc/self/mountinfo", "");
  const mounts = mountInfo.split(/\r?\n/u).map((line) => line.split(" - ")[0]?.split(" ") ?? [])
    .filter((fields) => fields.length >= 5)
    .map((fields) => ({mountPoint: fields[4], identity: fields.slice(0, 6).join(" ")}))
    .filter(({mountPoint}) => target === mountPoint || target.startsWith(`${mountPoint}/`))
    .sort((a, b) => b.mountPoint.length - a.mountPoint.length);
  return {
    temporaryPath: target,
    temporaryDeviceId: item.dev.toString(),
    filesystemType: filesystem.type.toString(),
    blockSizeBytes: filesystem.bsize.toString(),
    mountIdentity: mounts[0]?.identity ?? "unresolved",
  };
}

async function collectThermalProxy() {
  const cpuFrequencyPaths = [];
  for (let index = 0; index < os.cpus().length; index += 1) {
    const path = `/sys/devices/system/cpu/cpu${index}/cpufreq/scaling_cur_freq`;
    if (await optionalRead(path) !== null) cpuFrequencyPaths.push(path);
  }
  const gpuThrottle = await optionalExec("nvidia-smi", [
    "--query-gpu=clocks_throttle_reasons.active",
    "--format=csv,noheader,nounits",
  ]);
  const values = gpuThrottle.stdout.split(/\r?\n/u).filter(Boolean);
  return {
    available: cpuFrequencyPaths.length > 0 || values.length > 0,
    throttled: values.some((value) => !/^(?:0x0+|not active|n\/a)$/iu.test(value.trim())),
    frequencyReadable: cpuFrequencyPaths.length > 0,
    cpuFrequencyPathCount: cpuFrequencyPaths.length,
    gpuThrottleReadable: values.length > 0,
  };
}

export async function createLinuxInventoryProviders() {
  if (process.platform !== "linux") fail(`unsupported platform ${process.platform}`);
  const [{memory, swap}, cpu, numa, cache, isa, gpu, compiler, filesystem, thermalProxy] = await Promise.all([
    collectMemoryAndSwap(), collectCpu(), collectNuma(), collectCache(), collectIsa(), collectGpu(),
    collectCompiler(), collectFilesystem(), collectThermalProxy(),
  ]);
  const [cgroup, osRelease] = await Promise.all([
    collectCgroup(memory.memTotalBytes),
    optionalRead("/etc/os-release", ""),
  ]);
  const operatingSystem = parseKeyValueLines(osRelease);
  return {
    cpu,
    numa,
    cache,
    isa,
    memory,
    cgroup,
    swap,
    gpu,
    operatingSystem: {name: operatingSystem.NAME ?? os.type(), version: operatingSystem.VERSION ?? os.release()},
    kernel: {release: os.release(), architecture: os.arch()},
    node: {version: process.version},
    v8: {version: process.versions.v8},
    compiler,
    filesystem,
    thermalProxy,
  };
}

export async function collectLinuxStaticInventory({observedAt = new Date().toISOString()} = {}, contract) {
  const resolved = await createLinuxInventoryProviders();
  const providers = Object.fromEntries(Object.entries(resolved).map(([key, value]) => [key, async () => value]));
  return collectStaticInventory({observedAt, providers}, contract);
}
