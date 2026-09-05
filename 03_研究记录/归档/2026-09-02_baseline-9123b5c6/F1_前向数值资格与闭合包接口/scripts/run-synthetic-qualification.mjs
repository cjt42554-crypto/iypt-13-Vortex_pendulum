#!/usr/bin/env node
import { canonicalJson } from "../src/canonical.mjs";
import { loadFrozenF1Inputs, qualifyF1 } from "../src/qualification.mjs";

const inputs = await loadFrozenF1Inputs();
const result = qualifyF1(inputs.contract.value, inputs.matrix.value, {
  contractSha256: inputs.contract.sha256,
  implementationSha256: inputs.implementation.sha256,
  inputSha256: inputs.matrix.sha256,
});

process.stdout.write(`${canonicalJson(result)}\n`);
if (!result.decision.startsWith("PASS-")) process.exitCode = 1;
