import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateConfig } from "../src/core/config";
import { verifyJsonArtifactSet } from "../src/core/artifacts";
import {
  buildFormalForwardConfig,
  buildFrozenForwardConfigSet,
  publishFrozenForwardConfigSet,
  validateApparatusRecord,
  validateCoefficientPackage,
  validatePredictionPlan,
} from "../src/experiments/forward-configs";
import type { SourceBinding } from "../src/core/source-bindings";

const FIXTURES = resolve("tests/fixtures/experiment-bridge");

async function readJson(name: string): Promise<any> {
  return JSON.parse(await readFile(resolve(FIXTURES, name), "utf8"));
}

async function loadSynthetic() {
  const [plan, apparatus, coefficients, baseConfig] = await Promise.all([
    readJson("synthetic-filled-prediction-plan.json"),
    readJson("synthetic-filled-apparatus.json"),
    readJson("synthetic-filled-coefficients.json"),
    readJson("synthetic-base-formal-config.json"),
  ]);
  return { plan, apparatus, coefficients, baseConfig };
}

function bindings(): SourceBinding[] {
  return [
    ["prediction-plan", "plan.json", "1"],
    ["apparatus", "apparatus.json", "2"],
    ["rom-coefficients", "coefficients.json", "3"],
    ["base-formal-config", "base.json", "4"],
  ].map(([role, sourcePath, digit]) => ({
    role: role ?? "",
    sourcePath: sourcePath ?? "",
    bytes: 100,
    sha256: (digit ?? "0").repeat(64),
  }));
}

describe("formal experiment-to-forward bridge", () => {
  it("rejects synthetic inputs in production mode", async () => {
    const { plan, apparatus, coefficients, baseConfig } = await loadSynthetic();
    expect(validatePredictionPlan(plan).pass).toBe(false);
    expect(validateApparatusRecord(apparatus).pass).toBe(false);
    expect(validateCoefficientPackage(coefficients, plan, apparatus).pass).toBe(false);
    expect(() => buildFormalForwardConfig(
      baseConfig,
      apparatus,
      coefficients,
      plan,
      plan.holdoutBlocks[0],
    )).toThrow(/classification/u);
  });

  it("builds only configs accepted by the formal validator", async () => {
    const { plan, apparatus, coefficients, baseConfig } = await loadSynthetic();
    const config = buildFormalForwardConfig(
      baseConfig,
      apparatus,
      coefficients,
      plan,
      plan.holdoutBlocks[0],
      { allowSynthetic: true },
    );
    expect(config.backend).toBe("forward");
    expect(config.geometry.waterDepth).toBe(plan.holdoutBlocks[0].waterDepthM);
    expect(config.geometry.pivotHeight).toBe(plan.holdoutBlocks[0].pivotHeightM);
    expect(validateConfig(config)).toEqual([]);

    const malformedBase = structuredClone(baseConfig);
    delete malformedBase.solver;
    expect(() => buildFormalForwardConfig(
      malformedBase,
      apparatus,
      coefficients,
      plan,
      plan.holdoutBlocks[0],
      { allowSynthetic: true },
    )).toThrow(/section missing/u);
  });

  it("publishes a complete set with raw-input and stored-output hashes", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "iypt13-forward-set-"));
    try {
      const input = await loadSynthetic();
      const set = buildFrozenForwardConfigSet(
        { ...input, sourceBindings: bindings() },
        { allowSynthetic: true },
      );
      const destination = join(temporary, "frozen-configs");
      const published = await publishFrozenForwardConfigSet(destination, set);
      expect(published.entries.length).toBe(
        input.plan.calibrationBlocks.length + input.plan.holdoutBlocks.length,
      );
      expect(published.entries.every((entry) => /^[0-9a-f]{64}$/u.test(entry.storedSha256)))
        .toBe(true);
      const verified = await verifyJsonArtifactSet(destination);
      expect((verified.manifest.inputSourceBindings as unknown[])).toHaveLength(4);
      expect(await readFile(join(destination, "COMMITTED.json"), "utf8"))
        .toContain("VP-ATOMIC-JSON-ARTIFACT-SET-v1");
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  it("validates every frozen condition before creating the output directory", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "iypt13-forward-failclosed-"));
    try {
      const input = await loadSynthetic();
      input.plan.holdoutBlocks[0].flowSpeedMps = 0.1;
      const destination = join(temporary, "must-not-exist");
      expect(() => buildFrozenForwardConfigSet(
        { ...input, sourceBindings: bindings() },
        { allowSynthetic: true },
      )).toThrow(/标定域之外/u);
      await expect(access(destination)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
});
