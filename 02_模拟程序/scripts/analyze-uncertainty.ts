import { readFile, writeFile } from "node:fs/promises";
import { runForwardUncertainty } from "../src/experiments/forward-uncertainty";
const value = (flag: string) => process.argv[process.argv.indexOf(flag) + 1];
if (!["--config", "--output"].every((flag) => process.argv.includes(flag))) {
  throw new Error("usage: --config CONFIG.json --output REPORT.json [--samples 32] [--seed 20260905]");
}
const config = JSON.parse(await readFile(value("--config")!, "utf8"));
const report = await runForwardUncertainty(config, {
  sampleCount: process.argv.includes("--samples") ? Number(value("--samples")) : 32,
  seed: process.argv.includes("--seed") ? Number(value("--seed")) : 20260905,
});
await writeFile(value("--output")!, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ output: value("--output"), counts: report.ensemble.classificationCounts, linear: report.linear, claim: report.claim }, null, 2));
