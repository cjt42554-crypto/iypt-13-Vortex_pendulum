import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateConditionAgainstCalibrationDomain, validateCoefficientPackage } from "../src/experiments/coefficients";
import { buildFormalForwardConfig } from "../src/experiments/forward-configs";

async function fixture(name: string): Promise<any> {
  return JSON.parse(await readFile(resolve("tests/fixtures/experiment-bridge", name), "utf8"));
}
async function inputs() {
  const [coefficients, apparatus, plan, base] = await Promise.all([
    fixture("synthetic-filled-coefficients.json"), fixture("synthetic-filled-apparatus.json"),
    fixture("synthetic-filled-prediction-plan.json"), fixture("synthetic-base-formal-config.json"),
  ]);
  return { coefficients, apparatus, plan, base };
}

describe("joint calibration support", () => {
  it("rejects legacy marginal-only coverage in both validation and formal entry", async () => {
    const { coefficients, apparatus, plan, base } = await inputs();
    delete coefficients.calibrationDomain.jointSupport;
    expect(validateCoefficientPackage(coefficients, plan, apparatus, { allowSynthetic: true }).pass).toBe(false);
    const result = validateConditionAgainstCalibrationDomain(coefficients, apparatus, plan.holdoutBlocks[0]);
    expect(result.issues.some((issue) => issue.code === "JOINT-CALIBRATION-DOMAIN-MISSING")).toBe(true);
    expect(() => buildFormalForwardConfig(base, apparatus, coefficients, plan, plan.holdoutBlocks[0],
      { allowSynthetic: true })).toThrow(/联合域/u);
  });

  it("preserves holes instead of taking the product of marginal ranges or a convex hull", async () => {
    const { coefficients, apparatus, plan } = await inputs();
    const domain = coefficients.calibrationDomain;
    domain.waterDepthM = { minimum: .12, maximum: .24 };
    const cell = (speed: number, depth: number) => ({
      flowSpeedMps: { minimum: speed, maximum: speed },
      waterDepthM: { minimum: depth, maximum: depth },
      pivotHeightM: structuredClone(domain.pivotHeightM),
      reynolds: structuredClone(domain.reynolds),
    });
    domain.jointSupport = { kind: "covered-cells", evidence: "synthetic joint-support regression only",
      cells: [cell(.01, .12), cell(.024, .24)] };
    const condition = { ...plan.holdoutBlocks[0], flowSpeedMps: .01, waterDepthM: .12 };
    expect(validateConditionAgainstCalibrationDomain(coefficients, apparatus, condition).pass).toBe(true);
    for (const [flowSpeedMps, waterDepthM] of [[.01, .24], [.017, .18]]) {
      const result = validateConditionAgainstCalibrationDomain(coefficients, apparatus,
        { ...condition, flowSpeedMps, waterDepthM });
      expect(result.issues.some((issue) => issue.code === "CONDITION-OUTSIDE-JOINT-CALIBRATION-DOMAIN")).toBe(true);
    }
  });

  it("requires explicit evidence for a rectangular joint domain", async () => {
    const { coefficients, apparatus, plan } = await inputs();
    expect(validateConditionAgainstCalibrationDomain(coefficients, apparatus, plan.holdoutBlocks[0]).pass).toBe(true);
    coefficients.calibrationDomain.jointSupport.evidence = "";
    expect(validateConditionAgainstCalibrationDomain(coefficients, apparatus, plan.holdoutBlocks[0]).pass).toBe(false);
  });

  it("rejects malformed, reversed, incomplete and envelope-exceeding cells", async () => {
    const { coefficients, apparatus, plan } = await inputs();
    const domain = coefficients.calibrationDomain;
    const good = Object.fromEntries(["flowSpeedMps", "waterDepthM", "pivotHeightM", "reynolds"]
      .map((name) => [name, structuredClone(domain[name])]));
    const badCells = [[], [{}], [{ ...good, flowSpeedMps: { minimum: .03, maximum: .02 } }],
      [{ ...good, flowSpeedMps: { minimum: 0, maximum: 1 } }]];
    for (const cells of badCells) {
      domain.jointSupport = { kind: "covered-cells", evidence: "synthetic only", cells };
      expect(validateConditionAgainstCalibrationDomain(coefficients, apparatus, plan.holdoutBlocks[0]).pass).toBe(false);
    }
  });
});
