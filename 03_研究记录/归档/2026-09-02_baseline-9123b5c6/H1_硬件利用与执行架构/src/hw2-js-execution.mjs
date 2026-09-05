import { Worker } from "node:worker_threads";

import { digestU32Population, fillSyntheticRange } from "./hw2-workload.mjs";

const WORKER_URL = new URL("../scripts/hw2-worker.mjs", import.meta.url);

function fail(message) {
  throw new Error(`NO-GO-HW2-JS-EXECUTION: ${message}`);
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) fail(`${label} must be a positive safe integer`);
}

export function partitionRanges(elements, workers) {
  positiveInteger(elements, "elements");
  positiveInteger(workers, "workers");
  if (workers > elements) fail("workers exceed elements");
  const quotient = Math.floor(elements / workers);
  const remainder = elements % workers;
  const ranges = [];
  let offset = 0;
  for (let index = 0; index < workers; index += 1) {
    const count = quotient + (index < remainder ? 1 : 0);
    ranges.push({index, globalOffset: offset, targetOffset: offset, count});
    offset += count;
  }
  return ranges;
}

function runWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_URL, {workerData});
    let settled = false;
    worker.once("message", (message) => {
      if (settled) return;
      settled = true;
      resolve(message);
    });
    worker.once("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    worker.once("exit", (code) => {
      if (settled) return;
      settled = true;
      if (code === 0) reject(new Error("HW2 worker exited without a completion message"));
      else reject(new Error(`HW2 worker exited with code ${code}`));
    });
  });
}

function usageDelta(before) {
  const delta = process.cpuUsage(before);
  return (delta.user + delta.system) / 1_000_000;
}

export async function runJsSyntheticExecution({mode, elements, rounds, workers = 1}) {
  positiveInteger(elements, "elements");
  positiveInteger(rounds, "rounds");
  positiveInteger(workers, "workers");
  if (!new Set(["serial", "shared-workers", "transfer-shards"]).has(mode)) fail(`unknown mode ${mode}`);
  const cpuBefore = process.cpuUsage();
  let population;
  if (mode === "serial") {
    population = new Uint32Array(elements);
    fillSyntheticRange({target: population, count: elements, rounds});
  } else if (mode === "shared-workers") {
    const shared = new SharedArrayBuffer(elements * Uint32Array.BYTES_PER_ELEMENT);
    const ranges = partitionRanges(elements, workers);
    const messages = await Promise.all(ranges.map((range) => runWorker({
      mode: "shared",
      buffer: shared,
      targetOffset: range.targetOffset,
      globalOffset: range.globalOffset,
      count: range.count,
      rounds,
    })));
    if (messages.some((message) => message.classification !== "synthetic-non-scientific" || message.complete !== true)) {
      fail("shared worker completion is invalid");
    }
    population = new Uint32Array(shared);
  } else {
    const ranges = partitionRanges(elements, workers);
    const messages = await Promise.all(ranges.map((range) => runWorker({
      mode: "transfer",
      globalOffset: range.globalOffset,
      count: range.count,
      rounds,
    })));
    population = new Uint32Array(elements);
    for (const message of messages.sort((a, b) => a.globalOffset - b.globalOffset)) {
      if (message.classification !== "synthetic-non-scientific" || message.complete !== true) {
        fail("transfer worker completion is invalid");
      }
      population.set(new Uint32Array(message.buffer), message.globalOffset);
    }
  }
  const digest = digestU32Population(population);
  return Object.freeze({
    classification: "synthetic-non-scientific",
    digest,
    cpuSeconds: usageDelta(cpuBefore),
    peakRssBytes: process.memoryUsage.rss(),
    transferSeconds: 0,
    gpuUsed: false,
  });
}

export async function runJsWarmup({mode, workers = 1, warmupSteps = 32, elements = 65_536}) {
  positiveInteger(warmupSteps, "warmupSteps");
  return runJsSyntheticExecution({mode, workers, rounds: warmupSteps, elements});
}
