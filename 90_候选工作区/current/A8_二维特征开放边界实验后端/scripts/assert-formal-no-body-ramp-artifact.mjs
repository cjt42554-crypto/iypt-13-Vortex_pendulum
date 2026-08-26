import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-no-body-ramp-matrix.json",
);
const repeatPath = process.argv[3] === undefined
  ? undefined
  : resolve(process.argv[3]);
const repositoryRoot = resolve(process.cwd(), "../../../");
const formalSourcePath = resolve(
  repositoryRoot,
  "02_模拟程序/src/solvers/highFidelity/lbm.ts",
);
const a8iPath = resolve(
  process.argv[4]
    ?? "验证与复现/artifacts/a8-formal-mrt-brinkman-ramp-sensitivity-matrix.json",
);

const primaryRaw = await readFile(primaryPath);
const primaryText = primaryRaw.toString("utf8");
const result = JSON.parse(primaryText);
assert.equal(result.format, "VP-A8J-FORMAL-MRT-NO-BODY-RAMP-MATRIX-v1");
assert.equal(
  result.contract?.format,
  "VP-A8J-FORMAL-MRT-NO-BODY-RAMP-CONTRACT-v1",
);
assert.equal(result.cases?.length, 72);
assert.equal(result.corners?.length, 9);
assert.equal(result.durationSummaries?.length, 8);
assert.equal(new Set(result.cases.map((entry) => entry.definition.id)).size, 72);
assert.ok(result.cases.every((entry) => entry.definition.body === "none"));
assert.ok(result.cases.every((entry) => typeof entry.gate.pass === "boolean"));
assert.ok(result.cases.every((entry) =>
  entry.run.status !== "completed"
    || entry.run.stability.densityExtremum.brinkmanMaskIndicator === 0));

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
    ? "PASS-A8J-READONLY-FORMAL-MRT-NO-BODY-RAMP-INTERNAL-GATES"
    : "NO-GO-A8J-READONLY-FORMAL-MRT-NO-BODY-RAMP-INTERNAL-GATES",
);
assert.equal(result.decision?.formalSourceModified, false);
assert.equal(result.decision?.cbcIntegratedIntoFormalKernel, false);
assert.equal(result.decision?.formalIntegrationUnlocked, false);

const formalSourceRaw = await readFile(formalSourcePath);
assert.equal(
  createHash("sha256").update(formalSourceRaw).digest("hex"),
  result.contract.formalSource.sha256,
);
const a8iRaw = await readFile(a8iPath);
assert.equal(
  createHash("sha256").update(a8iRaw).digest("hex"),
  result.contract.inheritedEvidence.a8iArtifactSha256,
);
const a8i = JSON.parse(a8iRaw.toString("utf8"));
const bodyPresentTwentyDiameterStableCorners = a8i.cases.filter((entry) =>
  entry.definition.rampDurationDiameters === 20 && entry.gate.pass).length;
assert.equal(
  bodyPresentTwentyDiameterStableCorners,
  result.contract.inheritedEvidence.bodyPresentTwentyDiameterStableCorners,
);
assert.equal(
  result.causalComparison.bodyPresentTwentyDiameterStableCorners,
  bodyPresentTwentyDiameterStableCorners,
);
const noBodyTwentyDiameterStableCorners = result.cases.filter((entry) =>
  entry.definition.rampDurationDiameters === 20 && entry.gate.pass).length;
assert.equal(
  result.causalComparison.noBodyTwentyDiameterStableCorners,
  noBodyTwentyDiameterStableCorners,
);

if (repeatPath !== undefined) {
  const repeatRaw = await readFile(repeatPath);
  assert.equal(
    Buffer.compare(primaryRaw, repeatRaw),
    0,
    "independent A8J repeat is not byte-identical",
  );
}
const sha256 = createHash("sha256").update(primaryRaw).digest("hex");
console.log(
  `FORMAL NO-BODY RAMP ARTIFACT ASSERT PASS: ${primaryPath}; sha256=${sha256}; A8I body-present 20D stable=${bodyPresentTwentyDiameterStableCorners}; repeat=${repeatPath === undefined ? "not checked" : "byte-identical"}`,
);
