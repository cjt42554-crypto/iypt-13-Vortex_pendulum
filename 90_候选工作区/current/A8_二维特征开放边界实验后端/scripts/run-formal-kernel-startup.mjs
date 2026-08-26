import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runFormalKernelStartupMatrix } from "../src/formal-kernel-startup.ts";

const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-brinkman-startup-matrix.json",
);
const result = runFormalKernelStartupMatrix((progress) => {
  console.error(
    `[${progress.completedCases}/${progress.totalCases}] ${progress.caseId} ${progress.pass ? "PASS" : "FAIL"}`,
  );
});
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  outputPath,
  matrixComplete: result.matrixComplete,
  summaries: result.summaries,
  qualitativeComparison: result.qualitativeComparison,
  decision: result.decision,
}, null, 2));
if (!result.decision.pass) process.exitCode = 2;
