import { readBoundJson } from "../src/core/source-bindings";
import { writeFile } from "node:fs/promises";
import { analyzeDesignMatrix, wakeCouplingDesignRows } from "../src/experiments/identifiability";
import { validateConfig } from "../src/core/config";
import { evaluateForwardGuards, guardIsValid } from "../src/solvers/forward/model";
const value = (flag: string) => process.argv[process.argv.indexOf(flag) + 1];
if (!["--input", "--output"].every((flag) => process.argv.includes(flag))) {
  throw new Error("usage: --input CALIBRATION_DESIGN.json --output NEW_REPORT.json");
}
const source = await readBoundJson<any>(value("--input")!, "calibration-design");
const input = source.value;
if (input.schemaVersion !== "VP-IDENTIFICATION-DESIGN-v1" || input.dataRole !== "calibration"
  || !["synthetic-only", "measured", "prescribed-motion"].includes(input.classification)
  || typeof input.wakeGaugeId !== "string" || !input.wakeGaugeId.trim()) {
  throw new Error("require a declared calibration design, input classification and frozen wake gauge; holdout is not a fitting input");
}
const config = input.domainConfig;
if (!config || config.backend !== "forward" || config.rom?.wetSupportMode === "legacy-unqualified"
  || !config.rom?.wetSupportMode || config.rom?.wakeGauge?.id !== input.wakeGaugeId
  || validateConfig(config).some((issue) => issue.severity === "error")
  || !Array.isArray(input.prescribedMotion) || input.prescribedMotion.length === 0) {
  throw new Error("identification requires a valid bound wet-domain configuration and prescribed-motion records");
}
for (const sample of input.prescribedMotion) {
  const state = { theta: sample.theta, omega: sample.omega,
    wakeReal: sample.wakeReal ?? config.initial.wakeReal,
    wakeImaginary: sample.wakeImaginary ?? config.initial.wakeImaginary };
  const invalid = evaluateForwardGuards(config, sample.time, state).find((guard) => !guardIsValid(guard));
  if (invalid) throw new Error(`calibration motion contains an invalid sample at ${sample.time}: ${invalid.code}`);
}
const design = input.sensitivity ?? {
  columns: [
    { name: "gamma0", unit: "1/s", role: "coefficient" },
    { name: "gamma1", unit: "1", role: "coefficient" },
    { name: "gamma2", unit: "s", role: "coefficient" },
  ], rows: wakeCouplingDesignRows(input.prescribedMotion),
};
const diagnostic = analyzeDesignMatrix(design);
const report = { source: source.binding, classification: input.classification, wakeGaugeId: input.wakeGaugeId,
  diagnostic, claim: "rank of the supplied design only; no optimizer or physical identification claim",
  initialWakeStatus: diagnostic.unknownInitialWake.complete
    ? "initial-wake sensitivities included; inspect their rank jointly"
    : "unknown initial wake not resolved by this design; required before joint fitting" };
await writeFile(value("--output")!, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify(report, null, 2));
