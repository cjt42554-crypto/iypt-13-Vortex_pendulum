import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-cbc2d-startup-audit-matrix.json",
);
const repeatPath = process.argv[3] === undefined
  ? undefined
  : resolve(process.argv[3]);
const a8cPath = resolve(
  process.argv[4]
    ?? "验证与复现/artifacts/a8-cbc2d-boundary-robustness-matrix.json",
);

const primaryRaw = await readFile(primaryPath);
const primaryText = primaryRaw.toString("utf8");
const result = JSON.parse(primaryText);
assert.equal(result.format, "VP-A8D-CBC2D-STARTUP-AUDIT-MATRIX-v1");
assert.equal(result.contract?.format, "VP-A8D-CBC2D-STARTUP-AUDIT-CONTRACT-v1");
assert.equal(result.matrixComplete, true);
assert.equal(result.summary?.totalMatrixCases, 243);
assert.equal(result.summary?.completedMatrixCases, 243);
assert.equal(result.summary?.failedMatrixCases, 0);
assert.equal(result.cases?.length, 243);
assert.equal(result.uniformNoSolidGuards?.length, 9);
assert.equal(result.summary?.passedUniformGuardCases, 9);
assert.ok(result.uniformNoSolidGuards.every((entry) => entry.pass));
assert.equal(result.decision?.pass, true);
assert.equal(
  result.decision?.code,
  "PASS-A8D-CBC2D-STARTUP-AUDIT-INTERNAL-GATES-CANDIDATE-ONLY",
);
assert.equal(result.decision?.formalIntegrationUnlocked, false);
assert.equal(primaryText.includes("null"), false);

const ids = new Set();
for (const entry of result.cases) {
  assert.equal(typeof entry.definition?.id, "string");
  assert.equal(ids.has(entry.definition.id), false);
  ids.add(entry.definition.id);
  assert.equal(entry.run?.status, "completed");
  assert.equal(typeof entry.gate?.pass, "boolean");
  assert.ok(entry.run.auditStability.maximumDensityDeviationStep > 0);
  assert.ok(entry.run.auditStability.maximumMachStep > 0);
  assert.equal(
    entry.run.auditStability.densityExtremum.absoluteDeviation,
    entry.run.auditStability.maximumDensityDeviation,
  );
}
for (const protocolId of [
  "impulsive-uniform",
  "cosine-ramp-from-rest",
  "compatible-ramp-preconditioned",
]) {
  assert.equal(
    result.cases.filter((entry) => entry.definition.protocolId === protocolId).length,
    81,
  );
}
const impulsiveBrackets = result.speedBrackets.filter(
  (entry) => entry.protocolId === "impulsive-uniform",
);
assert.equal(impulsiveBrackets.length, 9);
assert.ok(impulsiveBrackets.every((entry) => entry.sampledBracketPass));
assert.ok(impulsiveBrackets.every((entry) => entry.densityDeviationMonotone));

const a8cRaw = await readFile(a8cPath);
const a8cSha256 = createHash("sha256").update(a8cRaw).digest("hex");
assert.equal(a8cSha256, result.contract.inheritedEvidence.a8cArtifactSha256);
const a8c = JSON.parse(a8cRaw.toString("utf8"));
let anchorComparisons = 0;
for (const entry of result.cases) {
  if (entry.definition.protocolId !== "impulsive-uniform") continue;
  if (![0.06, 0.08].includes(entry.definition.inletVelocity)) continue;
  const anchor = a8c.cases.find((candidate) =>
    candidate.definition.inletVelocity === entry.definition.inletVelocity
    && candidate.definition.relaxationTime === entry.definition.relaxationTime
    && candidate.definition.nominalCylinderDiameterCells
      === entry.definition.nominalCylinderDiameterCells
    && candidate.definition.requestedDownstreamOutletDistanceDiameters === 6);
  assert.ok(anchor, `missing A8C anchor for ${entry.definition.id}`);
  for (const key of [
    "maximumDensityDeviation",
    "maximumDensityDeviationStep",
    "maximumMach",
    "maximumMachStep",
    "minimumDensity",
    "maximumDensity",
  ]) {
    assert.equal(
      entry.run.auditStability[key],
      anchor.candidate.stability[key],
      `${entry.definition.id} differs from A8C at ${key}`,
    );
  }
  anchorComparisons += 1;
}
assert.equal(anchorComparisons, 18);

if (repeatPath !== undefined) {
  const repeatRaw = await readFile(repeatPath);
  assert.equal(
    Buffer.compare(primaryRaw, repeatRaw),
    0,
    "independent A8D repeat is not byte-identical",
  );
}

const sha256 = createHash("sha256").update(primaryRaw).digest("hex");
console.log(
  `STARTUP AUDIT ARTIFACT ASSERT PASS: ${primaryPath}; sha256=${sha256}; A8C anchors=${anchorComparisons}; repeat=${repeatPath === undefined ? "not checked" : "byte-identical"}`,
);
