import { canonicalSha256, immutableJsonClone } from "./canonical.mjs";

const STRUCTURAL_KEYS = new Set([
  "classification",
  "caseId",
  "caseIndex",
  "caseIds",
  "caseCount",
  "caseDefinitionHash",
  "runId",
  "runIdentity",
  "state",
  "stepZeroComplete",
  "completeCase",
  "scientific",
  "execution",
  "artifact",
  "provenance",
  "shards",
  "shardHashes",
  "expectedCaseCount",
  "completionOrderHidden",
]);

function fail(message) {
  throw new Error(`NO-GO-HW1-SCIENTIFIC-FIELD-LEAK: ${message}`);
}

function normalized(value) {
  return value.replaceAll(/[^a-z0-9]/giu, "").toLowerCase();
}

function walk(value, visit, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, `${path}[${index}]`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    visit(key, child, `${path}.${key}`);
    walk(child, visit, `${path}.${key}`);
  }
}

export function assertResultBlind(value, contract, { allowStructural = true } = {}) {
  const forbidden = contract.fieldBoundary.forbidden.map(normalized);
  const prefixSensitive = new Set([
    "drag",
    "lift",
    "torque",
    "pressure",
    "velocity",
    "strouhal",
    "spectrumpeak",
    "scientificmargin",
    "scientificgatecount",
    "scientificdecision",
    "literaturedistance",
  ]);
  const allowed = new Set(contract.fieldBoundary.allowed);
  walk(value, (key, child, path) => {
    const token = normalized(key);
    if (forbidden.some((name) =>
      token === name ||
      (prefixSensitive.has(name) && (token.startsWith(name) || token.endsWith(name))),
    )) {
      fail(`${path} uses forbidden key ${key}`);
    }
    if (
      !allowStructural &&
      !allowed.has(key) &&
      !STRUCTURAL_KEYS.has(key)
    ) {
      fail(`${path} is not an allowed result-blind field`);
    }
    if (
      typeof child === "string" &&
      /(?:PASS|NO-GO|INCONCLUSIVE).*(?:A8R|SCIENTIFIC)|(?:A8R|SCIENTIFIC).*(?:PASS|NO-GO|INCONCLUSIVE)/iu.test(child)
    ) {
      fail(`${path} contains a scientific classification string`);
    }
  });
  return value;
}

function assertLayer(layer, allowedKeys, label, contract) {
  if (!layer || typeof layer !== "object" || Array.isArray(layer)) {
    fail(`${label} layer must be an object`);
  }
  for (const key of Object.keys(layer)) {
    if (!allowedKeys.has(key)) fail(`${label}.${key} is not permitted`);
  }
  assertResultBlind(layer, contract, {allowStructural: false});
}

export function createProvenance({ scientific, execution, artifact }, contract) {
  const scientificKeys = new Set([
    "contractHash",
    "sourceHash",
    "dependencyHash",
    "implementationHash",
    "canonicalPayloadHash",
  ]);
  const executionKeys = new Set([
    "contractHash",
    "sourceHash",
    "dependencyHash",
    "implementationHash",
    "environmentHash",
    "backendId",
    "schedulerId",
    "workerCount",
    "deviceId",
    "wallTimeSeconds",
    "throughputMlups",
    "speedup",
    "parallelEfficiency",
    "cpuUtilizationFraction",
    "memoryBandwidthFraction",
    "gpuBusyFraction",
    "transferFraction",
    "rssBytes",
    "memAvailableBytes",
    "swapBytes",
    "memoryEventsDelta",
    "thermalThrottle",
    "exitCode",
    "signal",
    "classification",
  ]);
  const artifactKeys = new Set([
    "contractHash",
    "sourceHash",
    "implementationHash",
    "shardHash",
    "canonicalPayloadHash",
    "classification",
  ]);
  assertLayer(scientific, scientificKeys, "scientific", contract);
  assertLayer(execution, executionKeys, "execution", contract);
  assertLayer(artifact, artifactKeys, "artifact", contract);
  const provenance = {scientific, execution, artifact};
  assertResultBlind(provenance, contract);
  return immutableJsonClone({
    ...provenance,
    provenanceHash: canonicalSha256(provenance),
  });
}
