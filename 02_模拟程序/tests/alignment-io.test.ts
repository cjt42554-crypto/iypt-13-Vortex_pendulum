import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { buildFormalForwardConfig } from "../src/experiments/forward-configs";
import { migrateLegacyCoefficientPackage } from "../src/experiments/migration";
import { runForward } from "../src/solvers/forward";
import { resultToCsv } from "../src/ui/data";
import { parseCsv } from "../src/io/csv";
import { createWorkerRuntime } from "../src/worker/runtime";
import type { SimulationConfig, SimulationResult } from "../src/core/types";
import { alignedConfig } from "./helpers/alignment";
const read = async (name: string) => JSON.parse(await readFile(`experiments/examples/synthetic-alignment/${name}.json`, "utf8"));

function workerRun(config: SimulationConfig): Promise<SimulationResult> {
  return new Promise((resolve, reject) => {
    const runtime = createWorkerRuntime((response) => {
      if (response.type === "complete") resolve(response.result);
      if (response.type === "error") reject(new Error(response.message));
    });
    runtime.handle({ type: "run", runId: "alignment-worker", config });
  });
}

it("migrates declared legacy files, rereads them and preserves nonzero formal physical trajectories", async () => {
  const [legacy, oldPlan, declaration, request, expected, plan, apparatus, base] = await Promise.all(
    ["legacy-coefficients", "legacy-plan", "legacy-alignment-declaration", "gauge-conversion-request", "coefficients", "plan", "apparatus", "base-config"].map(read));
  const migrated = migrateLegacyCoefficientPackage(legacy, oldPlan, declaration, request,
    { packageId: expected.packageId, planId: plan.planId });
  expect(() => migrateLegacyCoefficientPackage(legacy, oldPlan, {}, request,
    { packageId: expected.packageId, planId: plan.planId })).toThrow(/complete declared/);
  const directory = await mkdtemp(join(tmpdir(), "vortex-alignment-"));
  try {
    const path = join(directory, "migrated.json");
    await writeFile(path, JSON.stringify(migrated));
    const roundtrip = JSON.parse(await readFile(path, "utf8"));
    for (const [key, entry] of Object.entries(roundtrip.coefficients.parameters)) {
      expect((entry as any).value).toBe(expected.parameters[key].value);
    }
    const oldConfig = buildFormalForwardConfig(base, apparatus, legacy, oldPlan, oldPlan.holdoutBlocks[0], { allowSynthetic: true });
    const newConfig = buildFormalForwardConfig(base, apparatus, roundtrip.coefficients, roundtrip.plan, roundtrip.plan.holdoutBlocks[0], { allowSynthetic: true });
    const [oldRun, newRun] = await Promise.all([runForward(oldConfig), runForward(newConfig)]);
    expect(oldRun.complete && newRun.complete).toBe(true);
    expect(Math.max(...newRun.samples.map((s) => Math.abs(s.liftTorque)))).toBeGreaterThan(1e-12);
    let maxError = 0;
    for (const [i, sample] of newRun.samples.entries()) {
      const reference = oldRun.samples[i]!;
      for (const key of ["theta", "omega", "liftTorque", "dragTorque"] as const) maxError = Math.max(maxError, Math.abs(sample[key] - reference[key]));
    }
    expect(maxError).toBeLessThan(1e-10);
    const csvPath = join(directory, "result.csv"), jsonPath = join(directory, "result.json");
    await writeFile(csvPath, resultToCsv(newRun)); await writeFile(jsonPath, JSON.stringify(newRun));
    const rows = parseCsv((await readFile(csvPath, "utf8")).replace(/^\uFEFF/, ""));
    expect(rows[1]![rows[0]!.indexOf("wakeGaugeId")]).toBe(request.target.id);
    expect(rows[1]![rows[0]!.indexOf("terminationCode")]).toBe("COMPLETED");
    expect(JSON.parse(await readFile(jsonPath, "utf8")).validSampleMask.every(Boolean)).toBe(true);
    console.info("LEGACY_V2_IO", { maxError, audit: migrated.audit, samples: newRun.samples.length });
  } finally { await rm(directory, { recursive: true }); }
});

it("uses the same formal solver in Worker and serializes SS-DW events and empty wet exits", async () => {
  const config = alignedConfig("VP-FWD-P0-SL1-SS-DW-v1");
  config.initial.theta = .03; config.initial.omega = .15;
  const direct = await runForward(config), worker = await workerRun(config);
  expect(worker.samples).toEqual(direct.samples);
  expect(worker.events).toEqual(direct.events);
  const rows = parseCsv(resultToCsv(worker).replace(/^\uFEFF/, ""));
  const field = (name: string) => rows[0]!.indexOf(name);
  expect(rows[1]![field("modelId")]).toBe(config.rom.modelId);
  expect(JSON.parse(rows[1]![field("eventsJson")]!)).toEqual(worker.events);
  expect(rows.slice(1).some((row) => row[field("frictionMode")] === "stick")).toBe(true);
  config.geometry.pivotHeight = .19; config.initial.theta = 0;
  const dry = await workerRun(config);
  expect(dry.samples).toEqual([]);
  const empty = parseCsv(resultToCsv(dry).replace(/^\uFEFF/, ""));
  expect(empty[1]![field("recordType")]).toBe("empty-run");
  expect(empty[1]![field("terminationCode")]).toBe("WET-DOMAIN-EXIT");
});
