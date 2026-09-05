import { describe, expect, it } from "vitest";
import {
  WAKE_INITIAL_STATE_COLUMNS,
  analyticUnforcedWake,
  analyzeDesignMatrix,
  saturatedWakeIdentity,
  wakeAmplitudeDesignRows,
  wakeCouplingDesignRows,
  type DesignColumn,
} from "../src/experiments/identifiability";

const AMPLITUDE_COLUMNS: readonly DesignColumn[] = [
  { name: "mu+i*omega_s", unit: "1/s", role: "coefficient" },
  { name: "beta_r+i*beta_i", unit: "1/s", role: "coefficient" },
];

describe("F6 identifiability diagnostics", () => {
  it("resolves a near-rank-deficient design without squaring its condition number", () => {
    const d=analyzeDesignMatrix({columns:AMPLITUDE_COLUMNS,rows:[[1,1],[1,1+1e-9]],relativeTolerance:1e-12});
    expect(d.rank).toBe(2);
    const determinant=1e-9/(d.columnNorms[0]!*d.columnNorms[1]!);
    expect(Math.abs(d.singularValues[1]!-determinant/d.singularValues[0]!)).toBeLessThan(1e-15);
  });
  it("exposes the rank-one saturated-record counterexample", () => {
    const first = saturatedWakeIdentity(1, 1, 2, 0.2);
    const second = saturatedWakeIdentity(2, 2, 2.5, 0.7);
    expect(first.amplitude).toBe(1);
    expect(second.amplitude).toBe(1);
    expect(first.nonlinearAngularFrequencyRadPerSecond).toBeCloseTo(1.8, 14);
    expect(second.nonlinearAngularFrequencyRadPerSecond).toBeCloseTo(1.8, 14);

    const diagnostic = analyzeDesignMatrix({
      columns: AMPLITUDE_COLUMNS,
      rows: wakeAmplitudeDesignRows(Array(20).fill(1)),
    });
    expect(diagnostic.rank).toBe(1);
    expect(diagnostic.fullColumnRank).toBe(false);
    expect(diagnostic.correlatedColumns).toHaveLength(1);
    expect(Math.abs(diagnostic.correlatedColumns[0]?.correlation ?? 0)).toBeCloseTo(1, 12);
    expect(diagnostic.nullDirections).toHaveLength(1);
  });

  it("recovers rank from an amplitude transition and reports explicit unknown wake initial state", () => {
    const diagnostic = analyzeDesignMatrix({
      columns: [...AMPLITUDE_COLUMNS, ...WAKE_INITIAL_STATE_COLUMNS],
      rows: [
        [1, -0.04, 1, 0],
        [1, -0.16, 0, 1],
        [1, -0.49, 1, 1],
        [1, -1.00, -1, 1],
      ],
    });
    expect(diagnostic.rank).toBe(4);
    expect(diagnostic.unknownInitialWake).toEqual({
      realDeclared: true,
      imaginaryDeclared: true,
      complete: true,
    });

    const omitted = analyzeDesignMatrix({
      columns: AMPLITUDE_COLUMNS,
      rows: wakeAmplitudeDesignRows([0.2, 0.4, 0.7, 1]),
    });
    expect(omitted.rank).toBe(2);
    expect(omitted.unknownInitialWake.complete).toBe(false);
  });

  it("shows single-frequency theta/acceleration degeneracy and multi-frequency recovery", () => {
    const samples = (frequency: number) => Array.from({ length: 24 }, (_, index) => {
      const time = 2 * Math.PI * index / 24;
      return {
        theta: Math.cos(frequency * time),
        omega: -frequency * Math.sin(frequency * time),
        acceleration: -(frequency ** 2) * Math.cos(frequency * time),
      };
    });
    const columns: readonly DesignColumn[] = [
      { name: "gamma_theta", unit: "1", role: "coefficient" },
      { name: "gamma_omega", unit: "1", role: "coefficient" },
      { name: "gamma_acceleration", unit: "1", role: "coefficient" },
    ];
    const single = analyzeDesignMatrix({
      columns,
      rows: wakeCouplingDesignRows(samples(1)),
    });
    expect(single.rank).toBe(2);
    expect(single.correlatedColumns.some((pair) =>
      pair.left === "gamma_theta" && pair.right === "gamma_acceleration")).toBe(true);

    const multiple = analyzeDesignMatrix({
      columns,
      rows: wakeCouplingDesignRows([...samples(1), ...samples(1.7)]),
    });
    expect(multiple.rank).toBe(3);
    expect(multiple.conditionNumber).not.toBeNull();
  });
});

describe("F6 finite-time wake identities", () => {
  it.each([
    { mu: 1, q0: 0.25, time: Math.log(2) / 2, q: 0.4,
      phase: Math.log(2) - 0.1 * Math.log(1.25) },
    { mu: -1, q0: 1, time: Math.log(2) / 2, q: 1 / 3,
      phase: Math.log(2) - 0.1 * Math.log(1.5) },
    { mu: 0, q0: 1, time: 0.5, q: 0.5,
      phase: 1 - 0.1 * Math.log(2) },
  ])("matches F6.6a-b for mu=$mu", ({ mu, q0, time, q, phase }) => {
    const result = analyticUnforcedWake({
      muPerSecond: mu,
      betaRealPerSecond: 1,
      betaImaginaryPerSecond: 0.2,
      linearAngularFrequencyRadPerSecond: 2,
      initial: { real: Math.sqrt(q0), imaginary: 0 },
    }, time);
    expect(result.amplitudeSquared).toBeCloseTo(q, 13);
    expect(result.phaseRad).toBeCloseTo(phase, 13);
  });

  it("keeps the exact zero solution and leaves its phase undefined", () => {
    const result = analyticUnforcedWake({
      muPerSecond: 2,
      betaRealPerSecond: 1,
      betaImaginaryPerSecond: 0.2,
      linearAngularFrequencyRadPerSecond: 3,
      initial: { real: 0, imaginary: 0 },
    }, 10);
    expect(result.wake).toEqual({ real: 0, imaginary: 0 });
    expect(result.phaseRad).toBeNull();
    expect(result.phaseVelocityRadPerSecond).toBeNull();
  });
});
