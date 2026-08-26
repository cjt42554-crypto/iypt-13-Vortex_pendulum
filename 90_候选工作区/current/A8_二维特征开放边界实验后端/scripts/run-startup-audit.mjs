import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runStartupAuditMatrix } from "../src/startup-audit.ts";

const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-cbc2d-startup-audit-matrix.json",
);
const result = runStartupAuditMatrix((progress) => {
  if (progress.completedCases % 9 === 0 || progress.completedCases === progress.totalCases) {
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
  summary: result.summary,
  attribution: result.attribution,
  decision: result.decision,
}, null, 2));
if (!result.decision.pass) process.exitCode = 2;
