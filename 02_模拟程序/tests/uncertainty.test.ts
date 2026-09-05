import { describe, expect, it } from "vitest";
import {
  assertCanAddApparatusUncertainty,
  constantWakeGaugeJacobian,
  drawJointSamples,
  linearPropagate,
  propagateJointSamples,
  residualVariance,
  transformJointUncertainty,
  validateCovarianceMatrix,
  validateJointUncertaintyModel,
  type JointUncertaintyModel,
} from "../src/experiments/uncertainty";

function model(covariance: readonly (readonly number[])[], overrides: Partial<JointUncertaintyModel> = {}): JointUncertaintyModel {
  return {
    schemaVersion: "VP-JOINT-UNCERTAINTY-v1",
    basisId: "synthetic-c-p-v1",
    parameterPaths: ["c", "p"],
    parameterUnits: ["1", "1"],
    parameterKinds: ["coefficient", "apparatus"],
    means: [0, 0],
    covariance,
    covarianceIdentity: "joint",
    apparatusMarginalization: "not-applied",
    probabilityBasis: "probability-model",
    ...overrides,
  };
}

function sampleVariance(values: readonly number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
}

describe("joint covariance identity", () => {
  it("rejects indefinite cross covariance even when parameter units differ by many orders", () => {
    expect(()=>validateCovarianceMatrix([[1e10,1],[1,1e-20]])).toThrow(/positive semidefinite/);
    expect(()=>validateCovarianceMatrix([[1,1e-30],[1e-30,0]])).toThrow(/zero variance/);
    expect(()=>residualVariance({observationVariance:1e-20,predictionVariance:1e-20,sharedCrossCovariance:2e-20,observationUnit:"rad",predictionUnit:"rad"})).toThrow(/Cauchy/);
  });
  it.each([
    { correlation: 1, expected: 4, rank: 1 },
    { correlation: 0, expected: 2, rank: 2 },
    { correlation: -1, expected: 0, rank: 1 },
  ])("accepts PSD correlation $correlation and propagates variance", ({ correlation, expected, rank }) => {
    const input = model([[1, correlation], [correlation, 1]]);
    expect(validateCovarianceMatrix(input.covariance).rank).toBe(rank);
    const propagated = linearPropagate(input, {
      values: [1, 1],
      parameterUnits: ["1", "1"],
      outputUnit: "1",
    });
    expect(propagated.variance).toBeCloseTo(expected, 14);
  });

  it.each([
    { correlation: 1, expected: 4e-20, rank: 1 },
    { correlation: 0, expected: 2e-20, rank: 2 },
    { correlation: -1, expected: 0, rank: 1 },
  ])("preserves rank and correlation at scientific covariance scale $correlation", ({ correlation, expected, rank }) => {
    const scale = 1e-20;
    const input = model([[scale, correlation * scale], [correlation * scale, scale]]);
    expect(validateCovarianceMatrix(input.covariance).rank).toBe(rank);
    expect(linearPropagate(input, {
      values: [1, 1],
      parameterUnits: ["1", "1"],
      outputUnit: "1",
    }).variance).toBeCloseTo(expected, 30);
  });

  it("rejects a small-scale matrix with a real negative eigenvalue", () => {
    expect(() => validateCovarianceMatrix([
      [1e-20, 1.0001e-20],
      [1.0001e-20, 1e-20],
    ])).toThrow(/positive semidefinite/u);
  });

  it("cancels a shared additive observation/prediction error", () => {
    expect(residualVariance({
      observationVariance: 1,
      predictionVariance: 1,
      sharedCrossCovariance: 1,
      observationUnit: "rad",
      predictionUnit: "rad",
    })).toBe(0);
  });

  it("retains unknown-initial-state cross covariance", () => {
    const input = model([[1, 0.5], [0.5, 1]], {
      parameterPaths: ["rom.couplingThetaReal", "initial.wakeReal"],
      parameterKinds: ["coefficient", "initial-state"],
      basisId: "coefficient-and-a0-v1",
    });
    expect(linearPropagate(input, {
      values: [1, 1],
      parameterUnits: ["1", "1"],
      outputUnit: "1",
    }).variance).toBeCloseTo(3, 14);
  });

  it("rejects wrong formal units and duplicate apparatus marginalization", () => {
    const wrongUnit = model([[1, 0], [0, 1]], {
      parameterPaths: ["body.dryMomentOfInertia", "initial.wakeReal"],
      parameterKinds: ["apparatus", "initial-state"],
      parameterUnits: ["kg", "1"],
    });
    expect(() => validateJointUncertaintyModel(wrongUnit, { requireFormalParameterPaths: true }))
      .toThrow(/unit mismatch/u);

    const correctUnit = model([[1, 0], [0, 1]], {
      parameterPaths: ["body.dryMomentOfInertia", "initial.wakeReal"],
      parameterKinds: ["apparatus", "initial-state"],
      parameterUnits: ["kg*m^2", "1"],
    });
    expect(validateJointUncertaintyModel(correctUnit, { requireFormalParameterPaths: true }).dimension)
      .toBe(2);

    const marginalized = model([[1, 0], [0, 1]], {
      covarianceIdentity: "marginal-over-apparatus",
      parameterKinds: ["coefficient", "coefficient"],
      apparatusMarginalization: "already-marginalized",
    });
    expect(() => assertCanAddApparatusUncertainty(marginalized)).toThrow(/duplicated/u);
  });
});

describe("wake gauge covariance transformation", () => {
  it("keeps the physical linearized output variance invariant", () => {
    const paths = [
      "rom.liftOutputReal", "rom.liftOutputImaginary",
      "initial.wakeReal", "initial.wakeImaginary",
    ];
    const input: JointUncertaintyModel = {
      schemaVersion: "VP-JOINT-UNCERTAINTY-v1",
      basisId: "wake-old-v1",
      parameterPaths: paths,
      parameterUnits: ["1", "1", "1", "1"],
      parameterKinds: ["coefficient", "coefficient", "initial-state", "initial-state"],
      means: [1.2, -0.3, 0.4, 0.2],
      covariance: [
        [0.04, 0.005, 0.006, -0.002],
        [0.005, 0.03, 0.001, 0.004],
        [0.006, 0.001, 0.02, 0.003],
        [-0.002, 0.004, 0.003, 0.01],
      ],
      covarianceIdentity: "joint",
      apparatusMarginalization: "not-applied",
      probabilityBasis: "probability-model",
    };
    const oldGradient = [input.means[2] ?? 0, -(input.means[3] ?? 0),
      input.means[0] ?? 0, -(input.means[1] ?? 0)];
    const oldVariance = linearPropagate(input, {
      values: oldGradient,
      parameterUnits: input.parameterUnits,
      outputUnit: "N·m",
    }).variance;
    const transform = constantWakeGaugeJacobian(paths, { real: 1.6, imaginary: -0.8 });
    const converted = transformJointUncertainty(input, transform, {
      basisId: "wake-new-v1",
      parameterPaths: paths,
      parameterUnits: input.parameterUnits,
    });
    const newGradient = [converted.means[2] ?? 0, -(converted.means[3] ?? 0),
      converted.means[0] ?? 0, -(converted.means[1] ?? 0)];
    const newVariance = linearPropagate(converted, {
      values: newGradient,
      parameterUnits: converted.parameterUnits,
      outputUnit: "N·m",
    }).variance;
    expect(newVariance).toBeCloseTo(oldVariance, 12);
  });

  it("requires complete real/imaginary pairs", () => {
    expect(() => constantWakeGaugeJacobian(
      ["initial.wakeReal"],
      { real: 2, imaginary: 0 },
    )).toThrow(/include both/u);
  });
});

describe("joint sampling and event classification", () => {
  it("agrees with linear propagation inside a preregistered sampling-error bound", () => {
    const input = model([[1e-4, 5e-5], [5e-5, 2e-4]]);
    const linearVariance = linearPropagate(input, {
      values: [1, 1],
      parameterUnits: ["1", "1"],
      outputUnit: "1",
    }).variance;
    const count = 20_000;
    const values = drawJointSamples(input, count, 20260905).map((sample) =>
      (sample[0] ?? 0) + (sample[1] ?? 0));
    const monteCarloVariance = sampleVariance(values);
    const standardError = linearVariance * Math.sqrt(2 / (count - 1));
    expect(Math.abs(monteCarloVariance - linearVariance)).toBeLessThan(6 * standardError);
  });

  it("retains completed/no-event, future SS mode and terminated samples in one denominator", async () => {
    const input = model([[1, -1], [-1, 1]], {
      probabilityBasis: "scenario-envelope",
    });
    const report = await propagateJointSamples(input, {
      sampleCount: 25,
      seed: 7,
      evaluate: (sample, index) => {
        if (index % 5 === 0) {
          return { classification: "terminated:COEFFICIENT-OOD", predictionValid: false,
            terminated: true, eventOccurred: true };
        }
        if ((sample[0] ?? 0) > 0) {
          return { classification: "completed:ss-slip", predictionValid: true,
            terminated: false, eventOccurred: true, outputs: { theta: sample[0] ?? 0 } };
        }
        return { classification: "completed:no-ss-event", predictionValid: true,
          terminated: false, eventOccurred: false, outputs: { theta: sample[0] ?? 0 } };
      },
    });
    expect(report.records).toHaveLength(25);
    expect(Object.values(report.classificationCounts).reduce((sum, count) => sum + count, 0)).toBe(25);
    expect(Object.values(report.classificationProportions).reduce((sum, value) => sum + value, 0))
      .toBeCloseTo(1, 14);
    expect(report.terminatedCount).toBe(5);
    expect(report.noEventCount).toBeGreaterThan(0);
    expect(report.intervalIdentity).toBe("scenario-envelope");
  });
});
