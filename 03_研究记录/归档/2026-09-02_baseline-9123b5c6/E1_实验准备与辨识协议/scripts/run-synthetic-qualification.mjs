#!/usr/bin/env node
import { canonicalJson } from "../src/canonical.mjs";
import { loadFrozenE1Inputs, qualifyE1 } from "../src/qualification.mjs";

const inputs = await loadFrozenE1Inputs();
const result = qualifyE1(inputs.contract.value, inputs.matrix.value, {
  contractSha256: inputs.contract.sha256,
  matrixSha256: inputs.matrix.sha256,
});

process.stdout.write(`${canonicalJson(result)}\n`);
if (!result.decision.startsWith("PASS-")) process.exitCode = 1;
