import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
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
const syntheticOptions = Object.freeze({ allowSynthetic: true });

async function loadSynthetic() {
  const [plan, apparatus, coefficients, baseConfig] = await Promise.all([
    readJson("examples/synthetic-filled-prediction-plan.json"),
    readJson("examples/synthetic-filled-apparatus.json"),
    readJson("temples/synthetic-filled-coefficients.json"),
    readJson("temples/synthetic-base-formal-config.json"),
  ]);
  return { plan, apparatus, coefficients, baseConfig };
}

function productionize({ plan, apparatus, coefficients, baseConfig }) {
  plan.classification = "experiment-frozen";
  apparatus.classification = "apparatus-calibrated";
  coefficients.classification = "rom-calibrated";
  for (const entry of Object.values(apparatus.parameters)) {
    if (typeof entry.source === "string" && /synthetic/iu.test(entry.source)) {
      entry.source = "measured-test-fixture";
    }
  }
  for (const entry of Object.values(coefficients.parameters)) {
    if (entry.status === "synthetic") entry.status = "fitted";
    if (typeof entry.source === "string" && /synthetic/iu.test(entry.source)) {
      entry.source = "measured-test-fixture";
    }
  }
  coefficients.apparatusId = apparatus.apparatusId;
  coefficients.apparatusRevision = apparatus.revision;
  coefficients.predictionPlanId = plan.planId;
  return { plan, apparatus, coefficients, baseConfig };
}

async function runBuild({ planPath, apparatusPath, coefficientsPath, baseConfigPath, outputDirectory }) {
  const script = resolve(ROOT, "scripts/build-forward-configs.mjs");
  const child = spawn(process.execPath, [
    script,
    "--plan", planPath,
    "--apparatus", apparatusPath,
    "--coefficients", coefficientsPath,
    "--base-config", baseConfigPath,
    "--output-dir", outputDirectory,
  ], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const status = await new Promise((accept, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => accept({ code, signal }));
  });
  return {
    ...status,
    stdout: Buffer.concat(stdout).toString("utf8"),
    stderr: Buffer.concat(stderr).toString("utf8"),
  };
}

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

test("synthetic qualification mode builds formal forward configs with explicit water geometry", async () => {
  const { plan, apparatus, coefficients, baseConfig } = await loadSynthetic();
  assert.equal(validatePredictionPlan(plan, syntheticOptions).pass, true);
  assert.equal(validateApparatusRecord(apparatus, syntheticOptions).pass, true);
  assert.equal(
    validateCoefficientPackage(coefficients, plan, apparatus, syntheticOptions).pass,
    true,
  );
  const holdout = plan.holdoutBlocks[0];
  const config = buildFormalForwardConfig(
    baseConfig,
    apparatus,
    coefficients,
    plan,
    holdout,
    syntheticOptions,
  );
  assert.equal(config.backend, "forward");
  assert.equal(config.fluid.flowSpeed, holdout.flowSpeedMps);
  assert.equal(config.geometry.waterDepth, holdout.waterDepthM);
  assert.equal(config.geometry.pivotHeight, holdout.pivotHeightM);
  assert.equal(config.initial.theta, holdout.initialThetaRad);
  assert.equal(config.rom.coefficientSetId, coefficients.packageId);
});

test("production validation and config construction reject synthetic-only records", async () => {
  const { plan, apparatus, coefficients, baseConfig } = await loadSynthetic();
  assert.equal(validatePredictionPlan(plan).pass, false);
  assert.equal(validateApparatusRecord(apparatus).pass, false);
  assert.equal(validateCoefficientPackage(coefficients, plan, apparatus).pass, false);
  assert.throws(
    () => buildFormalForwardConfig(
      baseConfig,
      apparatus,
      coefficients,
      plan,
      plan.holdoutBlocks[0],
    ),
    /classification/u,
  );
});

test("plan identities and freeze timestamp are mandatory before production use", async () => {
  const { plan } = await loadSynthetic();
  for (const field of ["planId", "apparatusId", "apparatusRevision"]) {
    const invalid = structuredClone(plao);
    invalid[field] = "";
    const validation = validatePredictionPlan(invalid, syntheticOptions);
    assert.equal(validation.pass, false, field);
    assert.ok(validation.issues.some(({ code }) => code === "IDENTITY-REQUIRED"));
  }
  const invalidFreeze = structuredClone(pla�);
  invalidFreeze.freeze.frozenAt = null;
  const validation = validatePredictionPlan(invalidFreeze, syntheticOptions);
  assert.equal(validation.pass, false);
  assert.ok(validation.issues.some(({ code }) => code === "FREEZE-TIME-REQUIRED"));
});

test("plan, apparatus, and coefficient package must bind to one apparatus and plan", async () => {
  const { plan, apparatus, coefficients } = await loadSynthetic();
  const wrongPlan = structuredClone(pla�);
  wrongPlan.apparatusId = "OTHER-APPARATUS";
  let validation = validateCoefficientPackage(
    coefficients,
    wrongPlan,
    apparatus,
    syntheticOptions,
  );
  assert.equal(validation.pass, false);
  assert.ok(validation.issues.some(({ code }) =>
    code === "PLAN-APPARATUS-BINDING-MISMATCH"));

  const wrongPackage = structuredClone(coefficients);
  wrongPackage.predictionPlanId = "OTHER-PLAN";
  validation = validateCoefficientPackage(
    wrongPackage,
    plan,
    apparatus,
    syntheticOptions,
  );
  assert.equal(validation.pass, false);
  assert.ok(validation.issues.some(({ code }) =>
    code === "ARTIFACT-BINDING-MISMATCH"));
});

test("conditions outside the coefficient calibration domain cannot become formal configs", async () => {
  const { plan, apparatus, coefficients, baseConfig } = await loadSynthetic();
  const alteredPlan = structuredClone(plan);
  alteredPlan.holdoutBlocks[0].flowSpeedMps = 0.1;
  assert.throws(
    () => buildFormalForwardConfig(
      baseConfig,
      apparatus,
      coefficients,
      alteredPlan,
      alteredPlan.holdoutBlocks[0],
      syntheticOptions,
    ),
    /标定域之外/u,
  );

  const alteredPivotPlan = structuredClone(plan);
  alteredPivotPlan.holdoutBlocks[0].pivotHeightM = 0.2;
  assert.throws(
    () => buildFormalForwardConfig(
      baseConfig,
      apparatus,
      coefficients,
      alteredPivotPlan,
      alteredPivotPlan.holdoutBlocks[0],
      syntheticOptions,
   ),
    /pivotHeightM/u,
  );
});

test("water depth and pivot height remain independent frozen physical inputs", async () => {
  const { plan, apparatus, coefficients, baseConfig } = await loadSynthetic();
  plan.holdoutBlocks[0].waterDepthM = 0.13;
  plan.holdoutBlocks[0].pivotHeightM = 0.065;
  coefficients.calibrationDomain.waterDepthM = { minimum: 0.12, maximum: 0.13 };
  coefficients.calibrationDomain.pivotHeightM = { minimum: 0.065, maximum: 0.07 };
  const config = buildFormalForwardConfig(
    baseConfig,
    apparatus,
    coefficients,
    plan,
    plan.holdoutBlocks[0],
    syntheticOptions,
  );
  assert.equal(config.geometry.waterDepth, 0.13);
  assert.equal(config.geometry.pivotHeight, 0.065);
});

test("condition block identifiers cannot escape the output directory", async () => {
  const { plan } = await loadSynthetic();
  plan.holdoutBlocks[0].conditionBlockId = "../escape";
  const validation = validatePredictionPlan(plan, syntheticOptions);
  assert.equal(validation.pass, false);
  assert.ok(validation.issues.some(({ code }) => code === "BLOCK-ID-UNSAFE"));
});

test("training and holdout condition blocks cannot overlap", async () => {
  const { plan } = await loadSynthetic();
  plan.holdoutBlocks[0].conditionBlockId = plan.calibrationBlocks[0].conditionBlockId;
  const validation = validatePredictionPlan(plan, syntheticOptions);
  assert.equal(validation.pass, false);
  assert.ok(validation.issues.some(({ code }) => code === "CONDITION-BLOCK-OVERLAP"));
});

test("2-D CFD cannot be promoted to a quantitative apparatus backend", async () => {
  const { plan } = await loadSynthetic();
  plan.cfd2dRole = "quantitative";
  const validation = validatePredictionPlan(plan, syntheticOptions);
  assert.equal(validation.pass, false);
  assert.ok(validation.issues.some(({ code }) => code === "CFD-ROLE"));
});

test("angle-only wake gauge cannot drift during fitting", async () => {
  const { plan, apparatus, coefficients } = await loadSynthetic();
  coefficients.parameters["rom.liftOutputReal"].value = 1.1;
  const validation = validateCoefficientPackage(
    coefficients,
    plan,
    apparatus,
    syntheticOptions,
  );
  assert.equal(validation.pass, false);
  assert.ok(validation.issues.some(({ code }) => code === "WAKE-GAUGE-DRIFT"));
});

test("power or phase claims require a calibrated torque channel", async () => {
  const { plan } = await loadSynthetic();
  plan.acceptance.meanPowerSign.required = true;
  const validation = validatePredictionPlan(plan, syntheticOptions);
  assert.equal(validation.pass, false);
  assert.ok(validation.issues.some(({ code }) => code === "LOAD-CLAIM-WITHOUT-TORQU"));
});

test("a condition not frozen in the plan cannot be turned into a formal config", async () => {
  const { plan, apparatus, coefficients, baseConfig } = await loadSynthetic();
  const altered = structuredClone(plan.holdoutBlocks[0]);
  altered.flowSpeedMps += 0.001;
  assert.throws(
    () => buildFormalForwardConfig(
      baseConfig,
      apparatus,
      coefficients,
      plan,
      altered,
      syntheticOptions,
    ),
    /not frozen/u,
  );
});

test("production CLI rejects synthetic inputs and writes only safe production configs", async () => {
  const temporary = await mkdtemp(resolve(tmpdir(), "iypt13-e1-production-"));
  try {
    const synthetic = await loadSynthetic();
    const rejectedOutput = resolve(temporary, "synthetic-output");
    let result = await runBuild({
      planPath: resolve(ROOT, "examples/synthetic-filled-prediction-plan.json"),
      apparatusPath: resolve(ROOT, "examples/synthetic-filled-apparatus.json"),
      coefficientsPath: resolve(ROOT, "examples/synthetic-filled-coefficients.json"),
      baseConfigPath: resolve(ROOT, "examples/synthetic-base-formal-config.json"),
      outputDirectory: rejectedOutput,
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /classification/u);

    const production = productionize(synthetic);
    const inputRoot = resolve(temporary, "inputs");
    const outputRoot = resolve(temporary, "output");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(inputRoot));
    for (const [name, value] of [
      ["plan.json", production.plan],
      ["apparatus.json", production.apparatus],
      ["coefficients.json", production.coefficients],
      ["base.json", production.baseConfig],
    ]) {
      await writeFile(resolve(inputRoot, name), `${JSON.stringify(value)}\n`, "utf8");
    }
    result = await runBuild({
      planPath: resolve(inputRoot, "plan.json"),
      apparatusPath: resolve(inputRoot, "apparatus.json"),
      coefficientsPath: resolve(inputRoot, "coefficients.json"),
      baseConfigPath: resolve(inputRoot, "base.json"),
      outputDirectory: outputRoot,
    });
    assert.equal(result.code, 0, result.stderr);
    const files = (await readdir(outputRoot)).sort();
    assert.equal(files.length, 6);
    assert.ok(files.includes("manifest.json"));
    assert.ok(files.every((name) => !name.includes("..") && !name.includes("/")));
    const manifest = JSON.parse(await readFile(resolve(outputRoot, "manifest.json"), "utf8"));
    assert.equal(manifest.planId, production.plan.planId);
    assert.equal(manifest.apparatusId, production.apparatus.apparatusId);
    assert.equal(manifest.entries.length, 5);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("production CLI validates every frozen condition before publishing files", async () => {
  const temporary = await mkdtemp(resolve(tmpdir(), "iypt13-e1-domain-fail-"));
  try {
    const production = productionize(await loadSynthetic());
    production.plan.holdoutBlocks[0].flowSpeedMps = 0.1;
    const inputRoot = resolve(temporary, "inputs");
    const outputRoot = resolve(temporary, "output");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(inputRoot));
    for (const [name, value] of [
      ["plan.json", production.plan],
      ["apparatus.json", production.apparatus],
      ["coefficients.json", production.coefficients],
      ["base.json", production.baseConfig],
    ]) {
      await writeFile(resolve(inputRoot, name), `${JSON.stringify(value)}\n`, "utf8");
    }
    const result = await runBuild({
      planPath: resolve(inputRoot, "plan.json"),
      apparatusPath: resolve(inputRoot, "apparatus.json"),
      coefficientsPath: resolve(inputRoot, "coefficients.json"),
      baseConfigPath: resolve(inputRoot, "base.json"),
      outputDirectory: outputRoot,
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /标定域之外/u);
    await assert.rejects(readdir(outputRoot), /ENOENT/u);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
