import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { cloneConfig, DEFAULT_CONFIG, validateConfig } from "../src/core/config";
import type { SimulationConfig, SweepResult } from "../src/core/types";
import { runForward } from "../src/solvers/forward";

interface SweepArguments {
  path: string;
  start: number;
  stop: number;
  count: number;
  replicates: number;
  output: string;
}

function parseArguments(values: readonly string[]): SweepArguments {
  const options = new Map<string, string>();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (key === undefined || value === undefined || !key.startsWith("--")) {
      throw new Error("usage: --path fluid.flowSpeed --start 0.01 --stop 0.03 --count 5 [--replicates 1] [--output file.json]");
    }
    options.set(key.slice(2), value);
  }
  const path = options.get("path") ?? "fluid.flowSpeed";
  const start = Number(options.get("start") ?? 0.01);
  const stop = Number(options.get("stop") ?? 0.03);
  const count = Number(options.get("count") ?? 5);
  const replicates = Number(options.get("replicates") ?? 1);
  const output = resolve(
    options.get("output")
      ?? "../03-项目资料/03-计算结果与证据/artifacts/forward-sweep.json",
  );
  if (![start, stop, count, replicates].every(Number.isFinite)
    || !Number.isInteger(count) || count < 1
    || !Number.isInteger(replicates) || replicates < 1) {
    throw new Error("invalid sweep bounds/count/replicates");
  }
  return { path, start, stop, count, replicates, output };
}

function setNumericPath(config: SimulationConfig, path: string, value: number): void {
  const parts = path.split(".");
  let target: unknown = config;
  for (let index = 0; index + 1 < parts.length; index += 1) {
    const part = parts[index];
    if (part === undefined || typeof target !== "object" || target === null || !(part in target)) {
      throw new Error(`unknown configuration path: ${path}`);
    }
    target = (target as Record<string, unknown>)[part];
  }
  const leaf = parts.at(-1);
  if (leaf === undefined || typeof target !== "object" || target === null
    || typeof (target as Record<string, unknown>)[leaf] !== "number") {
    throw new Error(`path is not a numeric configuration input: ${path}`);
  }
  (target as Record<string, unknown>)[leaf] = value;
}

const options = parseArguments(process.argv.slice(2));
const values = Array.from({ length: options.count }, (_, index) =>
  options.count === 1
    ? options.start
    : options.start + (options.stop - options.start) * index / (options.count - 1));
const sweep: SweepResult = {
  parameterPath: options.path,
  values,
  replicates: options.replicates,
  backend: "forward",
  points: [],
  createdAt: new Date().toISOString(),
};
for (const value of values) {
  for (let replicate = 0; replicate < options.replicates; replicate += 1) {
    const config = cloneConfig(DEFAULT_CONFIG);
    setNumericPath(config, options.path, value);
    config.initial.randomSeed = (DEFAULT_CONFIG.initial.randomSeed + replicate) >>> 0;
    const errors = validateConfig(config).filter((issue) => issue.severity === "error");
    if (errors.length > 0) {
      sweep.points.push({
        value,
        replicate,
        error: errors.map((issue) => `${issue.path}: ${issue.message}`).join(" | "),
      });
      continue;
    }
    try {
      sweep.points.push({
        value,
        replicate,
        result: await runForward(config, undefined, `sweep-${options.path}-${value}-${replicate}`),
      });
    } catch (error) {
      sweep.points.push({ value, replicate, error: error instanceof Error ? error.message : String(error) });
    }
  }
}
await mkdir(dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(sweep, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  output: options.output,
  parameterPath: options.path,
  values,
  replicates: options.replicates,
  completed: sweep.points.filter((point) => point.result?.complete).length,
  terminated: sweep.points.filter((point) => point.result !== undefined && !point.result.complete).length,
  errors: sweep.points.filter((point) => point.error !== undefined).length,
}, null, 2)}\n`);
