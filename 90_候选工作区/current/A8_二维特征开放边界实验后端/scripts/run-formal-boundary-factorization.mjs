import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { FORMAL_BOUNDARY_FACTORIZATION_CONTRACT as CONTRACT } from
  "../src/formal-boundary-factorization-contract.ts";
import { runFormalBoundaryFactorizationMatrix } from
  "../src/formal-boundary-factorization.ts";

const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-boundary-factorization-matrix.json.gz",
);
const a8jPath = resolve(
  process.argv[3]
    ?? "验证与复现/artifacts/a8-formal-mrt-no-body-ramp-matrix.json",
);
const repositoryRoot = resolve(process.cwd(), "../../../");
const formalSourcePath = resolve(repositoryRoot, CONTRACT.formalSource.relativePath);

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

if (await sha256(formalSourcePath) !== CONTRACT.formalSource.sha256) {
  throw new Error("formal LBM source hash does not match frozen A8K contract");
}
if (await sha256(a8jPath) !== CONTRACT.inheritedEvidence.a8jArtifactSha256) {
  throw new Error("A8J artifact hash does not match frozen A8K contract");
}
const a8j = JSON.parse(await readFile(a8jPath, "utf8"));
const anchors = a8j.cases
  .filter((entry) => entry.definition.rampDurationDiameters === 20)
  .map((entry) => ({
    nominalDiameterScaleCells: entry.definition.nominalDiameterScaleCells,
    relaxationTime: entry.definition.relaxationTime,
    completedSteps: entry.run.completedSteps,
    stability: entry.run.stability,
  }));
const result = runFormalBoundaryFactorizationMatrix(
  anchors,
  (completed, total, entry) => {
    if (completed % 4 === 0 || completed === total) {
      console.error(
        `[${completed}/${total}] ${entry.definition.id} ${entry.gate.pass ? "PASS" : "FAIL"}`,
      );
    }
  },
);
await mkdir(dirname(outputPath), { recursive: true });
const canonicalJson = Buffer.from(`${JSON.stringify(result)}\n`, "utf8");
await writeFile(outputPath, gzipSync(canonicalJson, { level: 9, mtime: 0 }));
console.log(JSON.stringify({
  outputPath,
  matrixComplete: result.matrixComplete,
  combinationSummaries: result.combinationSummaries,
  baselineComparison: result.baselineComparison,
  summary: result.summary,
  decision: result.decision,
}, null, 2));
if (!result.decision.pass) process.exitCode = 2;
