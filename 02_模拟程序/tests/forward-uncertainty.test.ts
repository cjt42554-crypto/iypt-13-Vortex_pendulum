import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { buildFormalForwardConfig } from "../src/experiments/forward-configs";
import { runForwardUncertainty } from "../src/experiments/forward-uncertainty";
import { convertWakeGaugeConfig } from "../src/core/wake-gauge";
import { evaluateForward } from "../src/solvers/forward";
import type { JointUncertaintyModel } from "../src/experiments/uncertainty";
import { alignedConfig } from "./helpers/alignment";

it("propagates a complete coefficient package through the builder, solver and statistical report", async () => {
  const read = async (name: string) => JSON.parse(await readFile(`experiments/examples/synthetic-alignment/${name}.json`, "utf8"));
  const [plan, coefficients, apparatus, base] = await Promise.all(["plan", "coefficients", "apparatus", "base-config"].map(read));
  const block = plan.holdoutBlocks[0];
  block.durationS = .01;
  base.solver.outputInterval = .01;
  base.solver.maximumStep = .01;
  base.solver.relativeTolerance = 1e-10;
  const first = buildFormalForwardConfig(base, apparatus, coefficients, plan, block, { allowSynthetic: true });
  const paths = ["initial.theta", "initial.wakeReal", "initial.wakeImaginary", "rom.liftOutputReal", "rom.liftOutputImaginary", "body.dryMomentOfInertia"];
  const sigma = [1e-6, 1e-5, 1e-5, .002, .001, 3e-6];
  const model: JointUncertaintyModel = {
    schemaVersion: "VP-JOINT-UNCERTAINTY-v1", basisId: "synthetic-joint-v1", parameterPaths: paths,
    parameterUnits: ["rad", "1", "1", "1", "1", "kg*m^2"],
    parameterKinds: ["initial-state", "initial-state", "initial-state", "coefficient", "coefficient", "apparatus"],
    means: paths.map((path) => path.split(".").reduce<any>((value, key) => value[key], first)),
    covariance: sigma.map((s, i) => sigma.map((t, j) => s * t * (i === j ? 1 : .2))),
    covarianceIdentity: "joint", apparatusMarginalization: "not-applied", probabilityBasis: "probability-model",
  };
  coefficients.wakeGauge.covarianceIdentity = model.basisId;
  coefficients.jointUncertaintyByCondition = { [block.conditionBlockId]: model };
  const config = buildFormalForwardConfig(base, apparatus, coefficients, plan, block, { allowSynthetic: true });
  const report = await runForwardUncertainty(config, { sampleCount: 128, seed: 20260905 });
  expect(report.ensemble.records).toHaveLength(128);
  expect(report.ensemble.validPredictionCount).toBe(128);
  expect(report.linear).not.toBeNull();
  const variance = report.linear!.variance;
  // Predeclared four-standard-error variance bound for an approximately normal
  // small-noise output, not an arbitrary percentage chosen after sampling.
  const relativeSamplingBound = 4 * Math.sqrt(2 / 127);
  expect(Math.abs(report.conditionalOnComplete.sampleVariance! / variance - 1)).toBeLessThan(relativeSamplingBound);
  const target = { ...config.rom.wakeGauge!, id: "rotated-test-gauge", covarianceIdentity: "rotated-joint-v1" };
  const converted = convertWakeGaugeConfig(config, { schemaVersion: "VP-WAKE-GAUGE-CONVERSION-v1",
    source: config.rom.wakeGauge, target, transform: { kind: "constant-complex", real: .4, imaginary: .3 } });
  const other = await runForwardUncertainty(converted.config, { sampleCount: 2, seed: 20260905 });
  expect(Math.abs(other.linear!.variance / variance - 1)).toBeLessThan(1e-6);
  console.info("FORMAL_UQ_SMALL_NOISE", { counts: report.ensemble.classificationCounts, variance,
    sampleVariance: report.conditionalOnComplete.sampleVariance, relativeSamplingBound,
    convertedVariance: other.linear!.variance, covarianceHandling: converted.audit.covarianceHandling });
}, 30000);

it("keeps cross-breakaway, no-breakaway and invalid-input realizations without a Gaussian claim", async () => {
  const config = alignedConfig("VP-FWD-P0-SL1-SS-v1");
  config.initial.theta = .01;
  config.initial.omega = config.initial.wakeReal = config.initial.wakeImaginary = 0;
  config.support.linearStiffness = .1;
  config.support.referenceAngle = .01;
  config.rom.couplingThetaReal = 3;
  config.rom.liftOutputReal = 100;
  const initialTorque = evaluateForward(config, 0, config.initial).mechanics.drivingTorque;
  config.support.referenceAngle -= initialTorque / config.support.linearStiffness;
  config.solver.duration = .04;
  config.support.staticFrictionTorque = 4e-6;
  config.support.kineticFrictionTorque = 1e-6;
  const model: JointUncertaintyModel = {
    schemaVersion: "VP-JOINT-UNCERTAINTY-v1", basisId: "synthetic-threshold-scenarios",
    parameterPaths: ["support.staticFrictionTorque"], parameterUnits: ["N*m"], parameterKinds: ["apparatus"],
    means: [config.support.staticFrictionTorque], covariance: [[(3e-6) ** 2]],
    covarianceIdentity: "joint", apparatusMarginalization: "not-applied", probabilityBasis: "scenario-envelope",
  };
  config.rom.jointUncertainty = model;
  config.rom.wakeGauge = { ...config.rom.wakeGauge!, covarianceIdentity: model.basisId };
  const report = await runForwardUncertainty(config, { sampleCount: 24, seed: 20260905 });
  expect(report.linear).toBeNull();
  expect(report.ensemble.records).toHaveLength(24);
  expect(report.ensemble.noEventCount).toBeGreaterThan(0);
  expect(report.ensemble.records.some((r) => r.predictionValid && r.eventOccurred)).toBe(true);
  expect(report.ensemble.terminatedCount).toBeGreaterThan(0);
  expect(report.ensemble.intervalIdentity).toBe("scenario-envelope");
  expect(Object.values(report.ensemble.classificationCounts).reduce((a, b) => a + b, 0)).toBe(24);
  console.info("FORMAL_UQ_BREAKAWAY", report.ensemble.classificationCounts);
}, 30000);
