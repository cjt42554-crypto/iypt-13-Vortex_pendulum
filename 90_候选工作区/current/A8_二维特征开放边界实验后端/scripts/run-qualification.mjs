import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runQualification } from "../src/benchmarks.ts";

const outputPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-cbc2d-boundary-qualification-research.json",
);
const result = runQualification();
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  outputPath,
  decision: result.decision,
  acoustic: result.acousticPulse.candidateGate,
  vortex: result.convectedVortex.candidateGate,
  cylinder: result.fixedCylinderStartup.candidateGate,
}, null, 2));
if (!result.decision.pass) process.exitCode = 2;
