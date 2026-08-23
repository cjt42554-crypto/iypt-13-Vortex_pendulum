import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../02-模拟程序/src/core/config";
import {
  inspectCfd2dStripWetting,
  replicatedStripTorqueCandidate,
  sectionWetFraction,
} from "../src/highFidelity/strip-wetting";

describe("CFD2D strip wetting gate", () => {
  it("classifies dry, half-wet and fully wet material stations", () => {
    const radius = 0.003;
    const pivotHeight = 0.07;
    expect(sectionWetFraction(0, 0.04, radius, pivotHeight)).toBe(0);
    expect(sectionWetFraction(0, 0.13, radius, pivotHeight)).toBe(1);
    const theta = 0.1;
    const halfWetCoordinate = pivotHeight / Math.cos(theta);
    expect(sectionWetFraction(theta, halfWetCoordinate, radius, pivotHeight)).toBeCloseTo(0.5, 12);
  });

  it("rejects partial and dry strips because the present CFD body is a full immersed circle", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.cfd2d.stripClosure = "fully-coherent-upper-bound";
    config.cfd2d.stripAxialCoordinate = config.geometry.pivotHeight / Math.cos(0.1);
    const partial = inspectCfd2dStripWetting(config, 0.1);
    expect(partial.state).toBe("partial");
    expect(partial.supportedByCurrentSinglePhaseCfd2d).toBe(false);
    expect(replicatedStripTorqueCandidate(config, 1e-3, 0.1).torque).toBeNull();

    config.cfd2d.stripAxialCoordinate = 0.04;
    const dry = inspectCfd2dStripWetting(config, 0);
    expect(dry.state).toBe("dry");
    expect(replicatedStripTorqueCandidate(config, 1e-3, 0).torque).toBeNull();
  });

  it("permits only the explicitly labelled fully submerged replication scenario", () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.cfd2d.stripClosure = "fully-coherent-upper-bound";
    config.cfd2d.stripAxialCoordinate = 0.13;
    const result = replicatedStripTorqueCandidate(config, 1e-3, 0);
    expect(result.report.state).toBe("full");
    expect(result.torque).not.toBeNull();
    expect(Number.isFinite(result.torque)).toBe(true);

    config.cfd2d.stripClosure = "none";
    expect(replicatedStripTorqueCandidate(config, 1e-3, 0).torque).toBeNull();
  });
});
