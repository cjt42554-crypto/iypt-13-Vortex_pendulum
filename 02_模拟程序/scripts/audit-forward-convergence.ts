import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { cloneConfig } from "../src/core/config";
import type { SimulationResult } from "../src/core/types";
import { runForward } from "../src/solvers/forward";

interface DifferenceSummary {
  maximumAbsolute: number;
  rootMeanSquare: number;
  finalAbsolute: number;
}

function difference(
  candidate: SimulationResult,
  reference: SimulationResult,
  field: "theta" | "omega" | "wakeReal" | "wakeImaginary" | "displacement",
): DifferenceSummary {
  if (candidate.samples.length !== reference.samples.length) {
    throw new Error(`sample-count mismatch for ${field}`);
  }
  const differences = candidate.samples.map((sample, index) => {
    const referenceSample = reference.samples[index];
    if (referenceSample === undefined || Math.abs(referenceSample.time - sample.time) > 1e-12) {
      throw new Error(`time-grid mismatch at index ${index}`);
    }
    return sample[field] - referenceSample[field];
  });
  return {
    maximumAbsolute: Math.max(...differences.map(Math.abs)),
    rootMeanSquare: Math.sqrt(
      differences.reduce((sum, value) => sum + value * value, 0) / differences.length,
    ),
    finalAbsolute: Math.abs(differences.at(-1) ?? 0),
  };
}

const outputPath = resolve(
  process.argv[2]
    ?? "../90_候选工作区/current/验证与复现/artifacts/phase2-forward-convergence.json",
);
const makeConfig = (
  relativeTolerance: number,
  absoluteScale: number,
  initialStep: number,
  maximumStep: number,
) => {
  const config = cloneConfig();
  config.solver.outputInterval = 0.05;
  config.solver.relativeTolerance = relativeTolerance;
  config.solver.absoluteToleranceTheta = 1e-9 * absoluteScale;
  config.solver.absoluteToleranceOmega = 1e-8 * absoluteScale;
  config.solver.absoluteToleranceWake = 1e-8 * absoluteScale;
  config.solver.initialStep = initialStep;
  config.solver.maximumStep = maximumStep;
  return config;
};

const cases = [
  { id: "coarse", config: makeConfig(1e-4, 100, 0.002, 0.05) },
  { id: "nominal", config: makeConfig(1e-6, 1, 0.001, 0.02) },
  { id: "reference", config: makeConfig(1e-9, 0.01, 0.00025, 0.0025) },
] as const;
const results = new Map<string, SimulationResult>();
for (const item of cases) {
  const result = await runForward(item.config, undefined, `convergence-${item.id}`);
  if (result.terminationCode !== "COMPLETED") {
    throw new Error(`${item.id} terminated with ${result.terminationCode}`);
  }
  results.set(item.id, result);
}
const reference = results.get("reference");
if (reference === undefined) throw new Error("missing reference result");
const report = {
  auditId: "VP-FWD-P0-SL1-v1-phase2-whole-run-convergence",
  createdAt: new Date().toISOString(),
  duration: reference.config.solver.duration,
  outputInterval: reference.config.solver.outputInterval,
  reference: {
    relativeTolerance: reference.config.solver.relativeTolerance,
    absoluteToleranceTheta: reference.config.solver.absoluteToleranceTheta,
    absoluteToleranceOmega: reference.config.solver.absoluteToleranceOmega,
    absoluteToleranceWake: reference.config.solver.absoluteToleranceWake,
    maximumStep: reference.config.solver.maximumStep,
  },
  cases: cases.map((item) => {
    const result = results.get(item.id);
    if (result === undefined) throw new Error(`missing ${item.id}`);
    return {
      id: item.id,
      terminationCode: result.terminationCode,
      sampleCount: result.samples.length,
      acceptedSteps: result.numerical.acceptedSteps,
      rejectedSteps: result.numerical.rejectedSteps,
      rhsEvaluations: result.numerical.rhsEvaluations,
      minimumAcceptedStep: result.numerical.minimumAcceptedStep,
      maximumAcceptedStep: result.numerical.maximumAcceptedStep,
      maximumAcceptedErrorNorm: result.numerical.maximumAcceptedErrorNorm,
      energyClosureRelativeRms: result.metrics.energyClosureRelativeRms,
      finalEnergyBalanceResidual: result.numerical.finalEnergyBalanceResidual,
      differencesFromReference: item.id === "reference" ? null : {
        theta: difference(result, reference, "theta"),
        omega: difference(result, reference, "omega"),
        wakeReal: difference(result, reference, "wakeReal"),
        wakeImaginary: difference(result, reference, "wakeImaginary"),
        displacement: difference(result, reference, "displacement"),
      },
    };
  }),
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
