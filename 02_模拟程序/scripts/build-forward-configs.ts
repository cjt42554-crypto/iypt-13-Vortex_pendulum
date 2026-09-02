import { dirname, resolve } from "node:path";
import {
  buildFrozenForwardConfigSet,
  publishFrozenForwardConfigSet,
} from "../src/experiments/forward-configs";
import { readBoundJson } from "../src/core/source-bindings";

function value(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

const planPath = value("--plan");
const apparatusPath = value("--apparatus");
const coefficientsPath = value("--coefficients");
const baseConfigPath = value("--base-config");
const outputDirectory = value("--output-dir");
const provenanceRoot = value("--provenance-root");
const allowSynthetic = process.argv.includes("--allow-synthetic");

if (!planPath || !apparatusPath || !coefficientsPath || !baseConfigPath || !outputDirectory) {
  throw new Error(
    "usage: --plan PLAN.json --apparatus APPARATUS.json "
      + "--coefficients COEFFICIENTS.json --base-config CONFIG.json "
      + "--output-dir NEW_DIRECTORY [--provenance-root DIRECTORY] [--allow-synthetic]",
  );
}

const root = provenanceRoot === null ? dirname(resolve(planPath)) : resolve(provenanceRoot);
const [plan, apparatus, coefficients, baseConfig] = await Promise.all([
  readBoundJson(resolve(planPath), "prediction-plan", root),
  readBoundJson(resolve(apparatusPath), "apparatus", root),
  readBoundJson(resolve(coefficientsPath), "rom-coefficients", root),
  readBoundJson(resolve(baseConfigPath), "base-formal-config", root),
]);
const set = buildFrozenForwardConfigSet(
  {
    plan: plan.value,
    apparatus: apparatus.value,
    coefficients: coefficients.value,
    baseConfig: baseConfig.value,
    sourceBindings: [
      plan.binding,
      apparatus.binding,
      coefficients.binding,
      baseConfig.binding,
    ],
  },
  { allowSynthetic },
);
const published = await publishFrozenForwardConfigSet(resolve(outputDirectory), set);
process.stdout.write(`${JSON.stringify({
  outputDirectory: published.directory,
  configCount: published.entries.length,
  manifestStoredSha256: published.manifestIdentity.storedSha256,
  manifestCanonicalSha256: published.manifestIdentity.canonicalSha256,
}, null, 2)}\n`);
