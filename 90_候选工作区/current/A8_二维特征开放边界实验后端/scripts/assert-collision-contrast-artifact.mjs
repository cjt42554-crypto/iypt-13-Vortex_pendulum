import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-cbc2d-collision-contrast-matrix.json",
);
const repeatPath = process.argv[3] === undefined
  ? undefined
  : resolve(process.argv[3]);
const a8dPath = resolve(
  process.argv[4]
    ?? "验证与复现/artifacts/a8-cbc2d-startup-audit-matrix.json",
);
const a8ePath = resolve(
  process.argv[5]
    ?? "验证与复现/artifacts/a8-cbc2d-ramp-sensitivity-matrix.json",
);

const primaryRaw = await readFile(primaryPath);
const primaryText = primaryRaw.toString("utf8");
const result = JSON.parse(primaryText);
assert.equal(result.format, "VP-A8F-CBC2D-COLLISION-CONTRAST-MATRIX-v1");
assert.equal(result.contract?.format, "VP-A8F-CBC2D-COLLISION-CONTRAST-CONTRACT-v1");
assert.equal(result.cases?.length, 36);
assert.equal(result.summaries?.length, 4);
assert.equal(result.rawUniformNoSolidGuards?.length, 3);
assert.ok(result.rawUniformNoSolidGuards.every((entry) => entry.pass));
const expectedMatrixComplete = result.cases.every(
  (entry) => entry.run.status === "completed",
);
const expectedPass = expectedMatrixComplete
  && result.rawUniformNoSolidGuards.every((entry) => entry.pass)
  && result.qualitativePattern.sameFrozenStartupPatternAcrossKernels;
assert.equal(result.matrixComplete, expectedMatrixComplete);
assert.equal(result.decision?.pass, expectedPass);
assert.equal(
  result.decision?.code,
  expectedPass
    ? "PASS-A8F-CBC2D-COLLISION-CONTRAST-INTERNAL-GATES-CANDIDATE-ONLY"
    : "NO-GO-A8F-CBC2D-COLLISION-CONTRAST-INTERNAL-GATES",
);
assert.equal(result.decision?.formalIntegrationUnlocked, false);
assert.equal(result.decision?.rawBgkIsFormalMrtEquivalent, false);
assert.equal(primaryText.includes("null"), false);

const ids = new Set();
for (const entry of result.cases) {
  assert.equal(ids.has(entry.definition.id), false);
  ids.add(entry.definition.id);
  assert.equal(typeof entry.gate.pass, "boolean");
  if (entry.run.status === "completed") {
    assert.ok(entry.run.stability.maximumDensityDeviationStep > 0);
    assert.ok(entry.run.stability.maximumMachStep > 0);
  } else {
    assert.equal(typeof entry.run.failure?.message, "string");
  }
}

const a8dRaw = await readFile(a8dPath);
const a8eRaw = await readFile(a8ePath);
assert.equal(
  createHash("sha256").update(a8dRaw).digest("hex"),
  result.contract.inheritedEvidence.a8dArtifactSha256,
);
assert.equal(
  createHash("sha256").update(a8eRaw).digest("hex"),
  result.contract.inheritedEvidence.a8eArtifactSha256,
);
const a8d = JSON.parse(a8dRaw.toString("utf8"));
const a8e = JSON.parse(a8eRaw.toString("utf8"));
let impulsiveAnchors = 0;
let rampAnchors = 0;
for (const entry of result.cases) {
  if (entry.definition.collisionKernel !== "regularized-bgk") continue;
  const commonMatch = (candidate) =>
    candidate.definition.inletVelocity === 0.08
    && candidate.definition.relaxationTime === entry.definition.relaxationTime
    && candidate.definition.nominalCylinderDiameterCells
      === entry.definition.nominalCylinderDiameterCells;
  const anchor = entry.definition.startupProtocolId === "uniform-impulsive"
    ? a8d.cases.find((candidate) =>
      candidate.definition.protocolId === "impulsive-uniform"
      && commonMatch(candidate))
    : a8e.cases.find((candidate) =>
      candidate.definition.rampDurationDiameters === 5
      && commonMatch(candidate));
  assert.ok(anchor, `missing regularized anchor for ${entry.definition.id}`);
  const anchorStability = entry.definition.startupProtocolId === "uniform-impulsive"
    ? anchor.run.auditStability
    : anchor.run.stability;
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
      anchorStability[key],
      `${entry.definition.id} differs at ${key}`,
    );
  }
  if (entry.definition.startupProtocolId === "uniform-impulsive") {
    impulsiveAnchors += 1;
  } else {
    rampAnchors += 1;
  }
}
assert.equal(impulsiveAnchors, 9);
assert.equal(rampAnchors, 9);

if (repeatPath !== undefined) {
  const repeatRaw = await readFile(repeatPath);
  assert.equal(
    Buffer.compare(primaryRaw, repeatRaw),
    0,
    "independent A8F repeat is not byte-identical",
  );
}
const sha256 = createHash("sha256").update(primaryRaw).digest("hex");
console.log(
  `COLLISION CONTRAST ARTIFACT ASSERT PASS: ${primaryPath}; sha256=${sha256}; A8D anchors=${impulsiveAnchors}; A8E anchors=${rampAnchors}; repeat=${repeatPath === undefined ? "not checked" : "byte-identical"}`,
);
