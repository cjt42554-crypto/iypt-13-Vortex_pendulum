#!/usr/bin/env node
import { canonicalJson } from "../src/canonical.mjs";
import { loadFrozenS1Inputs, qualifyS1 } from "../src/qualification.mjs";

const inputs = await loadFrozenS1Inputs();
const result = qualifyS1(inputs.contract.value, inputs.matrix.value, {
  contractSha256: inputs.contract.sha256,
  implementationSha256: inputs.implementation.sha256,
  inputSha256: inputs.matrix.sha256,
});

process.stdout.write(`${canonicalJson(result)}\n`);
