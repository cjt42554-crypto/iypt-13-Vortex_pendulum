import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runFormalNoBodyRampMatrix } from "../src/formal-no-body-ramp.ts";

const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-no-body-ramp-matrix.json",
);
const result = runFormalNoBodyRampMatrix((progress) => {
  if (progress.completedCases % 8 === 0
    || progress.completedCases === progress.totalCases) {
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
  durationSummaries: result.durationSummaries,
  causalComparison: result.causalComparison,
  summary: result.summary,
  decision: result.decision,
}, null, 2));
if (!result.decision.pass) process.exitCode = 2;
