import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../02-模拟程序/src/core/config";
import {
  classifySectionWetting,
  inspectCfd2dStripWetting,
  replicatedStripTorqueCandidate,
} from "../src/highFidelity/strip-wetting";

describe("strict free-surface strip gate", () => {
  it("uses dimensionful clearances for all four wet states", () => {
    const tolerance = 1e-6;
    expect(classifySectionWetting(2e-6, 3e-6, tolerance)).toBe("full");
    expect(classifySectionWetting(-3e-6, -2e-6, tolerance)).toBe("dry");
    expect(classifySectionWetting(1e-6, 3e-6, tolerance)).toBe("touching");
    expect(classifySectionWetting(-2e-6, 2e-6, tolerance)).toBe("partial");
  });

  it("classifies a coplanar strip as touching and unsupported", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.cfd2d.stripAxialCoordinate = config.geometry.pivotHeight;
    const report = inspectCfd2dStripWetting(config, 0);
    expect(report.state).toBe("touching");
    expect(report.supportedByCurrentSinglePhaseCfd2d).toBe(false);
  });

  it("does not promote a tiny real dry cap to a fully immersed circle", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    const theta = 0.1;
    const extent = config.geometry.radius * Math.abs(Math.sin(theta));
    const centerDepth = extent - 1e-12;
    config.cfd2d.stripAxialCoordinate = (
      config.geometry.pivotHeight + centerDepth
    ) / Math.cos(theta);
    const report = inspectCfd2dStripWetting(config, theta);
    expect(report.state).not.toBe("full");
    expect(report.supportedByCurrentSinglePhaseCfd2d).toBe(false);
  });

  it("allows only a full strip with positive submergence clearance", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.cfd2d.stripClosure = "fully-coherent-upper-bound";
    config.cfd2d.stripAxialCoordinate = 0.13;
    const report = inspectCfd2dStripWetting(config, 0);
    expect(report.state).toBe("full");
    expect(report.topClearance).toBeGreaterThan(report.clearanceTolerance);
    expect(report.supportedByCurrentSinglePhaseCfd2d).toBe(true);
    expect(replicatedStripTorqueCandidate(config, 1e-3, 0).torque)
      .not.toBeNull();
  });

  it("never constructs replicated torque for touching", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.cfd2d.stripClosure = "fully-coherent-upper-bound";
    config.cfd2d.stripAxialCoordinate = config.geometry.pivotHeight;
    const result = replicatedStripTorqueCandidate(config, 1e-3, 0);
    expect(result.report.state).toBe("touching");
    expect(result.torque).toBeNull();
  });

  it("rejects invalid dimensionful clearance tolerances", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    for (const tolerance of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => inspectCfd2dStripWetting(config, 0, tolerance)).toThrow();
    }
  });
});
