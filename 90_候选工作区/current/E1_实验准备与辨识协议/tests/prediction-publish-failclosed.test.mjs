import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const readJson = async (relative) =>
  JSON.parse(await readFile(resolve(ROOT, relative), "utf8"));

function productionize(plan, apparatus, coefficients) {
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
}

async function runBuild(paths) {
  const child = spawn(process.execPath, [
    resolve(ROOT, "scripts/build-forward-configs.mjs"),
    "--plan", paths.plan,
    "--apparatus", paths.apparatus,
    "--coefficients", paths.coefficients,
    "--base-config", paths.base,
    "--output-dir", paths.output,
  ], { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"] });
  const stderr = [];
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const code = await new Promise((accept, reject) => {
    child.once("error", reject);
    child.once("exit", accept);
  });
  return { code, stderr: Buffer.concat(stderr).toString("utf8") };
}

test("production CLI validates every frozen condition before publishing any config", async () => {
  const temporary = await mkdtemp(resolve(tmpdir(), "iypt13-e1-failclosed-"));
  try {
    const [plan, apparatus, coefficients, base] = await Promise.all([
      readJson("examples/synthetic-filled-prediction-plan.json"),
      readJson("examples/synthetic-filled-apparatus.json"),
      readJson("examples/synthetic-filled-coefficients.json"),
      readJson("examples/synthetic-base-formal-config.json"),
    ]);
    productionize(plan, apparatus, coefficients);
    plan.holdoutBlocks[0].flowSpeedMps = 0.1;

    const input = resolve(temporary, "input");
    const output = resolve(temporary, "output");
    await mkdir(input);
    const paths = {
      plan: resolve(input, "plan.json"),
      apparatus: resolve(input, "apparatus.json"),
      coefficients: resolve(input, "coefficients.json"),
      base: resolve(input, "base.json"),
      output,
    };
    for (const [path, value] of [
      [paths.plan, plan],
      [paths.apparatus, apparatus],
      [paths.coefficients, coefficients],
      [paths.base, base],
    ]) {
      await writeFile(path, `${JSON.stringify(value)}\n`, "utf8");
    }

    const result = await runBuild(paths);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /标定域之外/u);
    await assert.rejects(access(output), /ENOENT/u);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
