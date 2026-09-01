import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { canonicalSha256 } from "../src/canonical.mjs";
import {
  buildFormalForwardConfig,
  inspectTemplateBundle,
  readJson,
  validateApparatusRecord,
  validateCoefficientPackage,
  validatePredictionPlan,
} from "../src/prediction-readiness.mjs";

const ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));

function path(relative) {
  return resolve(ROOT, relative);
}

function assertPass(name, validation) {
  if (!validation.pass) {
    throw new Error(
      `${name}: ${validation.issues.map((issue) =>
        `${issue.path}: ${issue.message}`).join(" | ")}`,
    );
  }
}

const synthetic = process.argv.includes("--synthetic");
if (!synthetic) {
  const [plan, apparatus, coefficients] = await Promise.all([
    readJson(path("templates/prediction-plan.template.json")),
    readJson(path("templates/apparatus-calibrated.template.json")),
    readJson(path("templates/rom-coefficient-package.template.json")),
  ]);
  const report = inspectTemplateBundle({ plan, apparatus, coefficients });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.nonExperimentalBlockers.length > 0) process.exitCode = 1;
} else {
  const [plan, apparatus, coefficients, baseConfig] = await Promise.all([
    readJson(path("examples/synthetic-filled-prediction-plan.json")),
    readJson(path("examples/synthetic-filled-apparatus.json")),
    readJson(path("examples/synthetic-filled-coefficients.json")),
    readJson(path("examples/synthetic-base-formal-config.json")),
  ]);
  assertPass("prediction plan", validatePredictionPlan(plan));
  assertPass("apparatus", validateApparatusRecord(apparatus));
  assertPass(
    "coefficient package",
    validateCoefficientPackage(coefficients, plan),
  );
  const blocks = [...plan.calibrationBlocks, ...plan.holdoutBlocks];
  const configs = blocks.map((block) =>
    buildFormalForwardConfig(baseConfig, apparatus, coefficients, plan, block));
  const report = {
    decision: "PASS-EXPERIMENT-PREDICTION-INPUT-TOOLING-SYNTHETIC-ONLY",
    classification: "synthetic-only",
    generatedConfigCount: configs.length,
    generatedConfigSha256: canonicalSha256(configs),
    holdoutConditionBlocks: [...coefficients.holdoutConditionBlocks],
    quantitativeBackend: "forward",
    cfd2dRole: "qualitative-only",
    scientificConclusion: "NONE",
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
