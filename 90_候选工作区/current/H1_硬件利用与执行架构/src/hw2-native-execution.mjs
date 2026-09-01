import { spawn } from "node:child_process";

function fail(message) {
  throw new Error(`NO-GO-HW2-NATIVE-EXECUTION: ${message}`);
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) fail(`${label} must be a positive safe integer`);
}

export async function runNativeSyntheticExecution({
  binaryPath,
  mode,
  elements,
  rounds,
  threads = 1,
  gpuIndex = 0,
}) {
  if (typeof binaryPath !== "string" || binaryPath.length === 0) fail("binaryPath is required");
  if (!new Set(["scalar", "simd", "threads", "gpu", "hybrid", "bandwidth"]).has(mode)) fail(`unknown mode ${mode}`);
  positiveInteger(elements, "elements");
  positiveInteger(rounds, "rounds");
  positiveInteger(threads, "threads");
  if (!Number.isSafeInteger(gpuIndex) || gpuIndex < 0) fail("gpuIndex is invalid");
  const args = [
    "--mode", mode,
    "--elements", String(elements),
    "--rounds", String(rounds),
    "--threads", String(threads),
  ];
  if (gpuIndex !== 0) args.push("--gpu-index", String(gpuIndex));
  const {stdout, stderr, code, signal} = await new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {stdio: ["ignore", "pipe", "pipe"]});
    const stdoutChunks = [];
    const stderrChunks = [];
    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    child.once("error", reject);
    child.once("exit", (exitCode, exitSignal) => resolve({
      stdout: Buffer.concat(stdoutChunks).toString("utf8").trim(),
      stderr: Buffer.concat(stderrChunks).toString("utf8").trim(),
      code: exitCode,
      signal: exitSignal,
    }));
  });
  if (code !== 0 || signal !== null) fail(`native child failed code=${String(code)} signal=${String(signal)} stderr=${stderr}`);
  let result;
  try {
    result = JSON.parse(stdout);
  } catch {
    fail(`native child output is not JSON: ${stdout}`);
  }
  if (result.classification !== "synthetic-non-scientific") fail("native classification mismatch");
  if (result.mode !== mode) fail("native mode mismatch");
  if (!/^[0-9a-f]{64}$/u.test(result.digest)) fail("native digest is invalid");
  for (const key of ["cpuSeconds", "peakRssBytes", "transferSeconds"]) {
    if (!Number.isFinite(result[key]) || result[key] < 0) fail(`native ${key} is invalid`);
  }
  if (typeof result.gpuUsed !== "boolean") fail("native gpuUsed is invalid");
  return Object.freeze(result);
}

export async function runNativeWarmup({binaryPath, mode, threads = 1, gpuIndex = 0, warmupSteps = 32}) {
  positiveInteger(warmupSteps, "warmupSteps");
  return runNativeSyntheticExecution({
    binaryPath,
    mode,
    elements: 65_536,
    rounds: warmupSteps,
    threads,
    gpuIndex,
  });
}
