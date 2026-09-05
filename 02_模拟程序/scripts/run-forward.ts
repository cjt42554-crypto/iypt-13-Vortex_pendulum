#!/usr/bin/env -S npx vite-node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateConfig } from "../src/core/config";
import type { SimulationConfig, SimulationResult } from "../src/core/types";
import { resultToCsv } from "../src/ui/data";
import { runForward } from "../src/solvers/forward";

interface Arguments {
  configPath: string;
  outputPath?: string;
  csvPath?: string;
}

function argumentsFrom(commandLine: readonly string[]): Arguments {
  const defaultPath = fileURLToPath(new URL("../public/examples/vortex-pendulum-default.json", import.meta.url));
  let configPath = defaultPath;
  let outputPath: string | undefined;
  let csvPath: string | undefined;
  for (let index = 0; index < commandLine.length; index += 1) {
    const option = commandLine[index];
    const value = commandLine[index + 1];
    if ((option === "--config" || option === "--output" || option === "--csv") && value === undefined) {
      throw new Error(`${option} requires a path`);
    }
    if (option === "--config" && value !== undefined) { configPath = resolve(value); index += 1; }
    else if (option === "--output" && value !== undefined) { outputPath = resolve(value); index += 1; }
    else if (option === "--csv" && value !== undefined) { csvPath = resolve(value); index += 1; }
    else if (option === "--help") {
      process.stdout.write("Usage: npm run simulate:forward -- [--config config.json] [--output result.json] [--csv samples.csv]\n");
      process.exit(0);
    } else if (option !== undefined && !option.startsWith("--")) {
      throw new Error(`unexpected positional argument: ${option}`);
    } else if (option !== undefined && !["--config", "--output", "--csv"].includes(option)) {
      throw new Error(`unknown option: ${option}`);
    }
  }
  return {
    configPath,
    ...(outputPath === undefined ? {} : { outputPath }),
    ...(csvPath === undefined ? {} : { csvPath }),
  };
}


const options = argumentsFrom(process.argv.slice(2));
const parsed = JSON.parse(await readFile(options.configPath, "utf8")) as SimulationConfig;
const errors = validateConfig(parsed).filter((issue) => issue.severity === "error");
if (errors.length > 0) {
  throw new Error(errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
}
if (parsed.backend !== "forward") throw new Error("CLI accepts only backend='forward'");
const started = performance.now();
const result = await runForward(parsed, undefined, "forward-cli");
const elapsedMilliseconds = performance.now() - started;
if (options.outputPath !== undefined) {
  await writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
if (options.csvPath !== undefined) await writeFile(options.csvPath, resultToCsv(result), "utf8");
process.stdout.write(`${JSON.stringify({
  configPath: options.configPath,
  outputPath: options.outputPath ?? null,
  csvPath: options.csvPath ?? null,
  terminationCode: result.terminationCode,
  complete: result.complete,
  finalTime: result.samples.at(-1)?.time ?? 0,
  sampleCount: result.samples.length,
  acceptedSteps: result.numerical.acceptedSteps,
  rejectedSteps: result.numerical.rejectedSteps,
  rhsEvaluations: result.numerical.rhsEvaluations,
  energyClosureRelativeRms: result.metrics.energyClosureRelativeRms,
  elapsedMilliseconds,
}, null, 2)}\n`);
