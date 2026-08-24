import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const highFidelity = JSON.parse(readFileSync(
  new URL("../../03_项目资料/03-计算结果与证据/artifacts/cross-layer/hf-prescribed-response.json", import.meta.url),
  "utf8",
)) as any;
const forward = JSON.parse(readFileSync(
  new URL("../../03_项目资料/03-计算结果与证据/artifacts/cross-layer/forward-initial-memory.json", import.meta.url),
  "utf8",
)) as any;

describe("phase-4 generated cross-layer evidence contract", () => {
  it("retains all completed runs and their non-promoted evidence labels", () => {
    expect(highFidelity.analysisId).toBe("VP-STRUCT-CROSS-HF-PRESCRIBED-v1");
    expect(highFidelity.evidenceLevel).toBe("exploratory-component");
    expect(highFidelity.entries).toHaveLength(9);
    expect(highFidelity.entries.every((entry: any) => entry.terminationCode === "COMPLETED"))
      .toBe(true);
    expect(forward.analysisId).toBe("VP-STRUCT-CROSS-FORWARD-MEMORY-v1");
    expect(forward.entries).toHaveLength(6);
    expect(forward.entries.every((entry: any) => entry.summary.terminationCode === "COMPLETED"))
      .toBe(true);
    expect(forward.entries.every((entry: any) => entry.summary.phase4StateLabel === "U"))
      .toBe(true);
  });

  it("keeps the finite-time visibility surface distinct from the spectral boundary", () => {
    const visibility = forward.isolatedWakeFiniteTimeVisibilityBoundary;
    const speeds = visibility.points.map((point: any) => point.flowSpeed as number);
    expect(speeds).toHaveLength(4);
    expect(speeds.every((speed: number) => speed > visibility.fixedWakeGrowthBoundary)).toBe(true);
    expect(speeds.slice(1).every((speed: number, index: number) => speed < speeds[index]))
      .toBe(true);
    expect(visibility.infiniteTimeFiniteDetectionBoundary)
      .toBeGreaterThan(visibility.fixedWakeGrowthBoundary);

    const cold011 = forward.entries.find((entry: any) => entry.case.id === "u0p0110-cold");
    const predicted = cold011.summary.isolatedLandauPrediction.predictedTimeToWakeAmplitude005;
    const observed = cold011.summary.visibility.firstWakeThresholdTime;
    expect(Math.abs(predicted - observed) / predicted).toBeLessThan(0.01);
  });

  it("preserves the stable/unstable window-sign and phase-conditioning discriminators", () => {
    const audit044 = highFidelity.durationWindowAudit.find((entry: any) => entry.frequency === 0.44);
    const audit056 = highFidelity.durationWindowAudit.find((entry: any) => entry.frequency === 0.56);
    expect(audit044.meanPowerSignStableAcross20sWindows).toBe(true);
    expect(audit056.meanPowerSignStableAcross20sWindows).toBe(false);
    expect(audit056.windows.every((window: any) =>
      window.dominantResidualFrequency > 0.43 && window.dominantResidualFrequency < 0.46,
    )).toBe(true);
    const seed = highFidelity.gridPhaseSeedAuditAt056Hz;
    expect(seed.meanPowerRelativeDifference).toBeGreaterThan(0.2);
    expect(Math.abs(
      seed.meanPowerRelativeDifference - seed.phaseOnlyLinearizedPowerRelativeChange,
    )).toBeLessThan(0.03);
  });
});
