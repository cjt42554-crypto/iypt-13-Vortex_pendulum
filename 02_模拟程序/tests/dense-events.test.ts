import { describe, expect, it } from "vitest";
import { dormandPrince54Step } from "../src/solvers/forward/dopri54";
import { eventInspectionFractions, polynomialRootsInUnitInterval } from "../src/solvers/forward/dense-events";

describe("dense event inspection", () => {
  it("reproduces constant-acceleration trajectories inside the step", () => {
    const step = dormandPrince54Step((_t, y) => [y[1] ?? 0, -8], 0, [0, 4], 1);
    for (const fraction of [0, .03, .33, .5, .77, 1]) {
      expect(step.denseState(fraction)[0]).toBeCloseTo(4 * fraction * (1 - fraction), 12);
      expect(step.denseState(fraction)[1]).toBeCloseTo(4 - 8 * fraction, 12);
    }
    expect(() => step.denseState(1.1)).toThrow(/restricted/u);
  });

  it("checks an arbitrarily narrow angle excursion at the interpolant extremum", () => {
    const peakAt = .41357;
    const step = dormandPrince54Step((_t, y) => [y[1] ?? 0, -2], 0,
      [1 - peakAt**2, 2 * peakAt], 1);
    const limit = 1 - 1e-10;
    expect(step.denseState(0)[0]).toBeLessThan(limit);
    expect(step.denseState(1)[0]).toBeLessThan(limit);
    const fractions = eventInspectionFractions(step);
    expect(fractions.some((fraction) => Math.abs(fraction - peakAt) < 1e-10)).toBe(true);
    expect(fractions.some((fraction) => (step.denseState(fraction)[0] ?? 0) > limit)).toBe(true);
  });

  it("retains tangent roots and separates four real roots", () => {
    expect(polynomialRootsInUnitInterval([.25, -1, 1])[0]).toBeCloseTo(.5, 13);
    let polynomial = [1];
    for (const root of [.1, .3, .7, .9]) {
      const next = new Array<number>(polynomial.length + 1).fill(0);
      polynomial.forEach((value, i) => { next[i] = (next[i] ?? 0) - root * value; next[i + 1] = (next[i + 1] ?? 0) + value; });
      polynomial = next;
    }
    const roots = polynomialRootsInUnitInterval(polynomial);
    expect(roots).toHaveLength(4);
    [.1, .3, .7, .9].forEach((root, i) => expect(roots[i]).toBeCloseTo(root, 12));
  });

  it("includes preimages of geometric critical angles", () => {
    const step = dormandPrince54Step(() => [1, 0], 0, [0, 1], 1);
    expect(eventInspectionFractions(step, [.234567]).some((x) => Math.abs(x - .234567) < 1e-11)).toBe(true);
  });
});
