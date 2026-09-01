import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildFormalForwardConfig,
  inspectTemplateBundle,
  validateApparatusRecord,
  validateCoefficientPackage,
  validatePredictionPlan,
} from "../src/prediction-readiness.mjs";

const ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const readJson = async (relative) =>
  JSON.parse(await readFile(resolve(ROOT, relative), "utf8"));

test("templates cover every required formal input and only wait for measurements", async () => {
  const [plan, apparatus, coefficients] = await Promise.all([
    readJson("templates/prediction-plan.template.json"),
    readJson("templates/apparatus-calibrated.template.json"),
    readJson("templates/rom-coefficient-package.template.json"),
  ]);
  const report = inspectTemplateBundle({ plan, apparatus, coefficients });
  assert.equal(
    report.decision,
    "PASS-EXPERIMENT-PREPARATION-TOOLING-READY-WAITING-FOR-MEASUREMENTS",
  );
  assert.deepEqual(report.nonExperimentalBlockers, []);
  assert.ok(report.measurementDependencies.length > 20);
  assert.equal(report.scientificConclusion, "NONE");
});

test("synthetic filled bundle builds formal forward configs without holdout leakage", async () => {
  const [plan, apparatus, coefficients, baseConfig] = await Promise.all([
    readJson("examples/synthetic-filled-prediction-plan.json"),
    readJson("examples/synthetic-filled-apparatus.json"),
    readJson("examples/synthetic-filled-coefficients.json"),
    readJson("examples/synthetic-base-formal-config.json"),
  ]);
  assert.equal(validatePredictionPlan(plan).pass, true);
  assert.equal(validateApparatusRecord(apparatus).pass, true);
  assert.equal(validateCoefficientPackage(coefficients, plan).pass, true);
  const holdout = plan.holdoutBlocks[0];
  const config = buildFormalForwardConfig(
    baseConfig,
    apparatus,
    coefficients,
    plan,
    holdout,
  );
  assert.equal(config.backend, "forward");
  assert.equal(config.fluid.flowSpeed, holdout.flowSpeedMps);
  assert.equal(config.geometry.waterDepth, holdout.waterDepthM);
  assert.equal(config.initial.theta, holdout.initialThetaRad);
  assert.equal(config.initial.wakeReal, holdout.initialWakeReal);
  assert.equal(config.rom.coefficientSetId, coefficients.packageId);
  assert.equal(config.rom.coefficientSource, "measured");
  assert.equal(config.rom.liftOutputReal, 1);
  assert.equal(config.rom.liftOutputImaginary, 0);
  assert.equal(config.rom.finiteSpanCoherence, 1);
  assert.equal(coefficients.holdoutReadDuringFit, false);
});

test("training and holdout condition blocks cannot overlap", async () => {
  const plan = await readJson("examples/synthetic-filled-prediction-plan.json");
  plan.holdoutBlocks[0].conditionBlockId =
    plan.calibrationBlocks[0].conditionBlockId;
  const validation = validatePredictionPlan(plan);
  assert.equal(validation.pass, false);
  assert.ok(validation.issues.some(({ code }) =>
    code === "CONDITION-BLOCK-OVERLAP"));
});

test("2-D CFD cannot be promoted to a quantitative apparatus backend", async () => {
  const plan = await readJson("examples/synthetic-filled-prediction-plan.json");
  plan.cfd2dRole = "quantitative";
  const validation = validatePredictionPlan(plan);
  assert.equal(validation.pass, false);
  assert.ok(validation.issues.some(({ code }) => code === "CFD-ROLE"));
});

test("angle-only wake gauge cannot drift during fitting", async () => {
  const [plan, coefficients] = await Promise.all([
    readJson("examples/synthetic-filled-prediction-plan.json"),
    readJson("examples/synthetic-filled-coefficients.json"),
  ]);
  coefficients.parameters["rom.liftOutputReal"].value = 1.1;
  const validation = validateCoefficientPackage(coefficients, plan);
  assert.equal(validation.pass, false);
  assert.ok(validation.issues.some(({ code }) =>
    code === "WAKE-GAUGE-DRIFT"));
});

test("power or phase claims require a calibrated torque channel", async () => {
  const plan = await readJson("examples/synthetic-filled-prediction-plan.json");
  plan.acceptance.meanPowerSign.required = true;
  const validation = validatePredictionPlan(plan);
  assert.equal(validation.pass, false);
  assert.ok(validation.issues.some(({ code }) =>
    code === "LOAD-CLAIM-WITHOUT-TORQUE"));
});

test("a condition not frozen in the plan cannot be turned into a formal config", async () => {
  const [plan, apparatus, coefficients, baseConfig] = await Promise.all([
    readJson("examples/synthetic-filled-prediction-plan.json"),
    readJson("examples/synthetic-filled-apparatus.json"),
    readJson("examples/synthetic-filled-coefficients.json"),
    readJson("examples/synthetic-base-formal-config.json"),
  ]);
  const altered = structuredClone(plan.holdoutBlocks[0]);
  altered.flowSpeedMps += 0.001;
  assert.throws(
    () => buildFormalForwardConfig(
      baseConfig,
      apparatus,
      coefficients,
      plan,
      altered,
    ),
    /not frozen/u,
  );
});
