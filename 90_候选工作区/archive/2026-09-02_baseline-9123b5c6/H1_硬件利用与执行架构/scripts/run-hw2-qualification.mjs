import { resolve } from "node:path";

import { loadActiveContract } from "../src/contract.mjs";
import { canonicalSha256 } from "../src/canonical.mjs";
import { runHw2Qualification, writeHw2Evidence } from "../src/hw2-qualification.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const authorization = argument("--authorization");
const output = argument("--output");
const repoRoot = argument("--repo-root") ?? resolve(new URL("../../../../../..", import.meta.url).pathname);
if (!authorization || !output) {
  throw new Error("usage: --authorization TOKEN --output NEW_PATH [--repo-root PATH]");
}
const contract = await loadActiveContract();
try {
  const evidence = await runHw2Qualification({repoRoot, authorization, contract});
  const written = await writeHw2Evidence({evidence, outputPath: output});
  process.stdout.write(`${JSON.stringify({classification: evidence.classification, evidenceHash: evidence.evidenceHash, ...written})}\n`);
  if (evidence.classification !== "PASS-A8R-HW1-HARDWARE-UTILIZATION-CANDIDATE-ONLY") process.exitCode = 1;
} catch (error) {
  const failure = {
    schemaVersion: "VP-HW2-QUALIFICATION-FAILURE-EVIDENCE-v1",
    classification: "NO-GO-A8R-HW1-HARDWARE-QUALIFICATION",
    observedAt: new Date().toISOString(),
    fullResultBearingRunPerformed: false,
    scientificPayloadInspected: false,
    canonicalA8rArtifactWritten: false,
    failureCode: String(error?.message ?? error).split(":", 1)[0],
    failureMessageHash: canonicalSha256({message: String(error?.message ?? error)}),
  };
  const evidence = {...failure, evidenceHash: canonicalSha256(failure)};
  const written = await writeHw2Evidence({evidence, outputPath: output});
  process.stderr.write(`${JSON.stringify({classification: evidence.classification, evidenceHash: evidence.evidenceHash, ...written})}\n`);
  process.exitCode = 1;
}
