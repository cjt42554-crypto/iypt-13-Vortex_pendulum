import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import { canonicalSha256 } from "../src/canonical.mjs";
import {
  buildFormalForwardConfig,
  readJson,
  validateApparatusRecord,
  validateCoefficientPackage,
  validatePredictionPlan,
} from "../src/prediction-readiness.mjs";

function value(flag) {
  const index = process.argv.indexOf(flag);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

const planPath = value("--plan");
const apparatusPath = value("--apparatus");
const coefficientsPath = value("--coefficients");
const baseConfigPath = value("--base-config");
const outputDirectory = value("--output-dir");

if (!planPath || !apparatusPath || !coefficientsPath || !baseConfigPath || !outputDirectory) {
  throw new Error(
    "usage: --plan PLAN.json --apparatus APPARATUS.json "
      + "--coefficients COEFFICIENTS.json --base-config CONFIG.json "
      + "--output-dir DIRECTORY",
  );
}

const [plan, apparatus, coefficients, baseConfig] = await Promise.all([
  readJson(resolve(planPath)),
  readJson(resolve(apparatusPath)),
  readJson(resolve(coefficientsPath)),
  readJson(resolve(baseConfigPath)),
]);

for (const [name, validation] of [
  ["plan", validatePredictionPlan(plan)],
  ["apparatus", validateApparatusRecord(apparatus)],
  ["coefficients", validateCoefficientPackage(coefficients, plan, apparatus)],
]) {
  if (!validation.pass) {
    throw new Error(
      `${name} not ready: ${validation.issues.map((issue) =>
        `${issue.path}: ${issue.message}`).join(" | ")}`,
    );
  }
}

const outputRoot = resolve(outputDirectory);
await mkdir(outputRoot, { recursive: true });
const blocks = [...plan.calibrationBlocks, ...plan.holdoutBlocks];
const manifestEntries = [];
for (const block of blocks) {
  const config = buildFormalForwardConfig(
    baseConfig,
    apparatus,
    coefficients,
    plan,
    block,
  );
  const fileName = `${block.conditionBlockId}.json`;
  const outputPath = resolve(outputRoot, fileName);
  if (basename(fileName) !== fileName || dirname(outputPath) !== outputRoot) {
    throw new Error(`unsafe conditionBlockId output path: ${block.conditionBlockId}`);
  }
  const text = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(outputPath, text, { encoding: "utf8", flag: "wx" });
  manifestEntries.push({
    conditionBlockId: block.conditionBlockId,
    role: block.role,
    file: basename(outputPath),
    configSha256: canonicalSha256(config),
  });
}
const manifest = {
  schemaVersion: "VP-FORWARD-PREDICTION-CONFIG-MANIFEST-v1",
  planId: plan.planId,
  planFrozenAt: plan.freeze.frozenAt,
  apparatusId: apparatus.apparatusId,
  apparatusRevision: apparatus.revision,
  coefficientPackageId: coefficients.packageId,
  quantitativeBackend: "forward",
  cfd2dRole: "qualitative-only",
  entries: manifestEntries,
};
await writeFile(
  resolve(outputRoot, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { encoding: "utf8", flag: "wx" },
);
process.stdout.write(`${JSON.stringify({
  outputDirectory: outputRoot,
  configCount: manifestEntries.length,
  manifestSha256: canonicalSha256(manifest),
}, null, 2)}\n`);
