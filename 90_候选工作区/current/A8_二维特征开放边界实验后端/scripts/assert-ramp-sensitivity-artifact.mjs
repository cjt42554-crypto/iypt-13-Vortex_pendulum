import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-cbc2d-ramp-sensitivity-matrix.json",
);
const repeatPath = process.argv[3] === undefined
  ? undefined
  : resolve(process.argv[3]);
const a8dPath = resolve(
  process.argv[4]
    ?? "验证与复现/artifacts/a8-cbc2d-startup-audit-matrix.json",
);

const primaryRaw = await readFile(primaryPath);
const primaryText = primaryRaw.toString("utf8");
const result = JSON.parse(primaryText);
assert.equal(result.format, "VP-A8E-CBC2D-RAMP-SENSITIVITY-MATRIX-v1");
assert.equal(result.contract?.format, "VP-A8E-CBC2D-RAMP-SENSITIVITY-CONTRACT-v1");
assert.equal(result.matrixComplete, true);
assert.equal(result.summary?.totalCases, 72);
assert.equal(result.summary?.completedCases, 72);
assert.equal(result.cases?.length, 72);
assert.equal(result.corners?.length, 9);
const expectedDecisionPass = result.matrixComplete
  && result.corners.every((entry) => entry.longestRampPass)
  && result.corners.every((entry) => entry.densityDeviationNonIncreasing);
assert.equal(result.decision?.pass, expectedDecisionPass);
assert.equal(
  result.decision?.code,
  expectedDecisionPass
    ? "PASS-A8E-CBC2D-RAMP-SENSITIVITY-INTERNAL-GATES-CANDIDATE-ONLY"
    : "NO-GO-A8E-CBC2D-RAMP-SENSITIVITY-INTERNAL-GATES",
);
assert.equal(result.decision?.formalIntegrationUnlocked, false);
assert.ok(result.corners.every((entry) => entry.longestRampPass));
assert.equal(
  result.summary?.monotoneCorners,
  result.corners.filter((entry) => entry.densityDeviationNonIncreasing).length,
);
assert.equal(primaryText.includes("null"), false);

const ids = new Set();
for (const entry of result.cases) {
  assert.equal(ids.has(entry.definition.id), false);
  ids.add(entry.definition.id);
  assert.equal(entry.run.status, "completed");
  assert.equal(typeof entry.gate.pass, "boolean");
  assert.ok(entry.run.stability.maximumDensityDeviationStep > 0);
  assert.ok(entry.run.stability.maximumMachStep > 0);
}

const a8dRaw = await readFile(a8dPath);
const a8dSha256 = createHash("sha256").update(a8dRaw).digest("hex");
assert.equal(a8dSha256, result.contract.inheritedEvidence.a8dArtifactSha256);
const a8d = JSON.parse(a8dRaw.toString("utf8"));
let anchorComparisons = 0;
for (const entry of result.cases) {
  if (entry.definition.rampDurationDiameters !== 20) continue;
  const anchor = a8d.cases.find((candidate) =>
    candidate.definition.protocolId === "cosine-ramp-from-rest"
    && candidate.definition.inletVelocity === 0.08
    && candidate.definition.relaxationTime === entry.definition.relaxationTime
    && candidate.definition.nominalCylinderDiameterCells
      === entry.definition.nominalCylinderDiameterCells);
  assert.ok(anchor, `missing A8D ramp anchor for ${entry.definition.id}`);
  for (const key of [
    "maximumDensityDeviation",
    "maximumDensityDeviationStep",
    "maximumMach",
    "maximumMachStep",
    "minimumDensity",
    "maximumDensity",
  ]) {
    assert.equal(
      entry.run.stability[key],
      anchor.run.auditStability[key],
      `${entry.definition.id} differs from A8D at ${key}`,
    );
  }
  anchorComparisons += 1;
}
assert.equal(anchorComparisons, 9);

if (repeatPath !== undefined) {
  const repeatRaw = await readFile(repeatPath);
  assert.equal(
    Buffer.compare(primaryRaw, repeatRaw),
    0,
    "independent A8E repeat is not byte-identical",
  );
}

const sha256 = createHash("sha256").update(primaryRaw).digest("hex");
console.log(
  `RAMP SENSITIVITY ARTIFACT ASSERT PASS: ${primaryPath}; sha256=${sha256}; A8D anchors=${anchorComparisons}; repeat=${repeatPath === undefined ? "not checked" : "byte-identical"}`,
);
