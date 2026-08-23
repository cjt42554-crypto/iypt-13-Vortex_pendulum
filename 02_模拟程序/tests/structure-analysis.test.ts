import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/core/config";
import {
  characteristicCoefficients,
  isolatedLandauAmplitude,
  isolatedLandauThresholdTime,
  linearizeForwardAtSymmetricState,
  locateStructuralBoundary,
  polynomialRoots,
  structuralSpectrumPoint,
} from "../src/analysis/structure";

describe("phase-4 structural analysis utilities", () => {
  it("recovers the characteristic polynomial and eigenvalues of a diagonal matrix", () => {
    const matrix = [
      [-1, 0, 0, 0],
      [0, -2, 0, 0],
      [0, 0, -3, 0],
      [0, 0, 0, -4],
    ];
    const coefficients = characteristicCoefficients(matrix);
    expect(coefficients).toEqual([1, 10, 35, 50, 24]);
    const roots = polynomialRoots(coefficients).map((root) => root.real);
    expect(roots).toEqual(expect.arrayContaining([
      expect.closeTo(-1, 9),
      expect.closeTo(-2, 9),
      expect.closeTo(-3, 9),
      expect.closeTo(-4, 9),
    ]));
  });

  it("residual-checks the frozen nominal forward Jacobian spectrum", () => {
    const point = structuralSpectrumPoint(DEFAULT_CONFIG, DEFAULT_CONFIG.fluid.flowSpeed);
    expect(point.symmetricResidualNorm).toBeLessThan(1e-12);
    expect(point.maximumPolynomialResidual).toBeLessThan(1e-8);
    expect(point.eigenvalues).toHaveLength(4);
    expect(point.reynolds).toBeGreaterThan(100);
  });

  it("keeps the five-point Jacobian stable under a factor-two step refinement", () => {
    const coarse = linearizeForwardAtSymmetricState(
      DEFAULT_CONFIG,
      DEFAULT_CONFIG.fluid.flowSpeed,
      [1e-5, 1e-5, 1e-5, 1e-5],
    ).jacobian;
    const fine = linearizeForwardAtSymmetricState(
      DEFAULT_CONFIG,
      DEFAULT_CONFIG.fluid.flowSpeed,
      [5e-6, 5e-6, 5e-6, 5e-6],
    ).jacobian;
    const maximumDifference = Math.max(...coarse.flatMap((row, rowIndex) =>
      row.map((value, columnIndex) => Math.abs(value - (fine[rowIndex]?.[columnIndex] ?? Number.NaN))),
    ));
    expect(maximumDifference).toBeLessThan(2e-6);
  });

  it("locates a transverse oscillatory spectral boundary for the bundled prior", () => {
    const boundary = locateStructuralBoundary(DEFAULT_CONFIG, [0.005, 0.012]);
    expect(boundary.type).toBe("hopf-candidate");
    expect(boundary.flowSpeed).toBeGreaterThan(0.005);
    expect(boundary.flowSpeed).toBeLessThan(0.012);
    expect(Math.abs(boundary.point.spectralAbscissa)).toBeLessThan(1e-7);
    expect(Math.abs(boundary.crossingSlope)).toBeGreaterThan(1e-3);
  });

  it("evaluates the exact finite-time Stuart-Landau radial solution", () => {
    const growth = 0.03;
    const cubic = 0.2;
    const saturation = Math.sqrt(growth / cubic);
    expect(isolatedLandauAmplitude(0.001, growth, cubic, 0)).toBeCloseTo(0.001, 14);
    expect(isolatedLandauAmplitude(0.001, growth, cubic, 1000)).toBeCloseTo(saturation, 10);
    const thresholdTime = isolatedLandauThresholdTime(0.001, 0.05, growth, cubic);
    expect(thresholdTime).not.toBeNull();
    expect(isolatedLandauAmplitude(0.001, growth, cubic, thresholdTime ?? 0))
      .toBeCloseTo(0.05, 11);
  });

  it("handles the critical and decaying radial branches without inventing reachability", () => {
    const critical = isolatedLandauAmplitude(0.2, 0, 0.4, 7);
    expect(critical).toBeCloseTo(0.2 / Math.sqrt(1 + 2 * 0.4 * 0.2 ** 2 * 7), 14);
    const downwardTime = isolatedLandauThresholdTime(0.25, 0.05, -0.03, 0.16);
    expect(downwardTime).not.toBeNull();
    expect(isolatedLandauAmplitude(0.25, -0.03, 0.16, downwardTime ?? 0))
      .toBeCloseTo(0.05, 11);
    expect(isolatedLandauThresholdTime(0.001, 1, 0.03, 0.2)).toBeNull();
    expect(isolatedLandauThresholdTime(0.001, 0.01, 0, 0)).toBeNull();
  });
});
