import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runCollisionContrastMatrix } from "../src/collision-contrast.ts";

const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-cbc2d-collision-contrast-matrix.json",
);
const result = runCollisionContrastMatrix((progress) => {
  if (progress.completedCases % 4 === 0 || progress.completedCases === progress.totalCases) {
    console.error(
      `[${progress.completedCases}/${progress.totalCases}] ${progress.caseId} ${progress.pass ? "PASS" : "FAIL"}`,
    );
  }
});
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  outputPath,
  matrixComplete: result.matrixComplete,
  summaries: result.summaries,
  qualitativePattern: result.qualitativePattern,
  decision: result.decision,
}, null, 2));
if (!result.decision.pass) process.exitCode = 2;
