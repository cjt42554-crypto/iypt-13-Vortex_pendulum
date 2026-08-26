import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-brinkman-ramp-sensitivity-matrix.json",
);
const repeatPath = process.argv[3] === undefined
  ? undefined
  : resolve(process.argv[3]);
const repositoryRoot = resolve(process.cwd(), "../../../");
const formalSourcePath = resolve(
  repositoryRoot,
  "02_模拟程序/src/solvers/highFidelity/lbm.ts",
);
const a8hPath = resolve(
  process.argv[4]
    ?? "验证与复现/artifacts/a8-formal-mrt-brinkman-startup-matrix.json",
);

const primaryRaw = await readFile(primaryPath);
const primaryText = primaryRaw.toString("utf8");
const result = JSON.parse(primaryText);
assert.equal(
  result.format,
  "VP-A8I-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-MATRIX-v1",
);
assert.equal(
  result.contract?.format,
  "VP-A8I-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-CONTRACT-v1",
);
assert.equal(result.cases?.length, 72);
assert.equal(result.corners?.length, 9);
assert.equal(result.durationSummaries?.length, 8);
const expectedMatrixComplete = result.cases.every(
  (entry) => entry.run.status === "completed",
);
const expectedLongestPass = result.corners.every((entry) => entry.longestRampPass);
const expectedMonotone = result.corners.every(
  (entry) => entry.densityDeviationNonIncreasing,
);
const expectedPass = expectedMatrixComplete
  && expectedLongestPass
  && expectedMonotone;
assert.equal(result.matrixComplete, expectedMatrixComplete);
assert.equal(result.decision?.pass, expectedPass);
assert.equal(
  result.decision?.code,
  expectedPass
    ? "PASS-A8I-READONLY-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-INTERNAL-GATES"
    : "NO-GO-A8I-READONLY-FORMAL-MRT-BRINKMAN-RAMP-SENSITIVITY-INTERNAL-GATES",
);
assert.equal(result.decision?.formalSourceModified, false);
assert.equal(result.decision?.cbcIntegratedIntoFormalKernel, false);
assert.equal(result.decision?.formalIntegrationUnlocked, false);
assert.equal(primaryText.includes("null"), false);
assert.equal(new Set(result.cases.map((entry) => entry.definition.id)).size, 72);
for (const entry of result.cases) {
  assert.equal(typeof entry.gate.pass, "boolean");
  if (entry.run.status === "completed") {
    assert.ok(entry.run.stability.maximumDensityDeviationStep > 0);
    assert.ok(entry.run.stability.maximumMachStep > 0);
  }
}

const formalSourceRaw = await readFile(formalSourcePath);
assert.equal(
  createHash("sha256").update(formalSourceRaw).digest("hex"),
  result.contract.formalSource.sha256,
);
const a8hRaw = await readFile(a8hPath);
assert.equal(
  createHash("sha256").update(a8hRaw).digest("hex"),
  result.contract.inheritedEvidence.a8hArtifactSha256,
);
const a8h = JSON.parse(a8hRaw.toString("utf8"));
let anchors = 0;
for (const entry of result.cases) {
  if (entry.definition.rampDurationDiameters !== 5) continue;
  const anchor = a8h.cases.find((candidate) =>
    candidate.definition.startupProtocolId === "cosine-ramp-from-rest-5d"
    && candidate.definition.relaxationTime === entry.definition.relaxationTime
    && candidate.definition.nominalCylinderDiameterCells
      === entry.definition.nominalCylinderDiameterCells);
  assert.ok(anchor, `missing A8H five-diameter anchor for ${entry.definition.id}`);
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
      anchor.run.stability[key],
      `${entry.definition.id} differs at ${key}`,
    );
  }
  anchors += 1;
}
assert.equal(anchors, 9);

if (repeatPath !== undefined) {
  const repeatRaw = await readFile(repeatPath);
  assert.equal(
    Buffer.compare(primaryRaw, repeatRaw),
    0,
    "independent A8I repeat is not byte-identical",
  );
}
const sha256 = createHash("sha256").update(primaryRaw).digest("hex");
console.log(
  `FORMAL RAMP SENSITIVITY ARTIFACT ASSERT PASS: ${primaryPath}; sha256=${sha256}; A8H anchors=${anchors}; repeat=${repeatPath === undefined ? "not checked" : "byte-identical"}`,
);
