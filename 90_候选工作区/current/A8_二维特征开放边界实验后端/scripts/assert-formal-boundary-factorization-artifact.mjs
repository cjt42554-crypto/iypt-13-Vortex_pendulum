import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-boundary-factorization-matrix.json.gz",
);
const repeatPath = process.argv[3] === undefined ? undefined : resolve(process.argv[3]);
const a8jPath = resolve(
  process.argv[4]
    ?? "验证与复现/artifacts/a8-formal-mrt-no-body-ramp-matrix.json",
);
const repositoryRoot = resolve(process.cwd(), "../../../");
const formalSourcePath = resolve(
  repositoryRoot,
  "02_模拟程序/src/solvers/highFidelity/lbm.ts",
);
const primaryRaw = await readFile(primaryPath);
const canonicalRaw = primaryPath.endsWith(".gz") ? gunzipSync(primaryRaw) : primaryRaw;
const result = JSON.parse(canonicalRaw.toString("utf8"));
assert.equal(result.format, "VP-A8K-FORMAL-MRT-BOUNDARY-FACTORIZATION-MATRIX-v1");
assert.equal(result.contractIdentity?.format,
  "VP-A8K-FORMAL-MRT-BOUNDARY-FACTORIZATION-CONTRACT-v1");
assert.equal(result.cases?.length, 36);
assert.equal(result.corners?.length, 9);
assert.equal(result.combinationSummaries?.length, 4);
assert.equal(new Set(result.cases.map((entry) => entry.definition.id)).size, 36);
assert.ok(result.cases.every((entry) => entry.run.status === "completed"));
assert.ok(result.cases.every((entry) =>
  entry.run.stability.densityExtremum.brinkmanMaskIndicator === 0));
assert.equal(result.summary?.totalCases, 36);
assert.equal(result.summary?.completedCases, 36);
assert.equal(result.summary?.stableCases, 18);
assert.equal(result.summary?.globalAttribution, "INLET_REPLACEMENT_SUFFICIENT");
assert.ok(result.corners.every((entry) =>
  entry.attribution === "INLET_REPLACEMENT_SUFFICIENT"
  && entry.passes.baseline === false
  && entry.passes.outletOnly === false
  && entry.passes.inletOnly === true
  && entry.passes.both === true));
assert.equal(result.baselineComparison?.checkedCases, 9);
assert.equal(result.baselineComparison?.exactMatches, 9);
assert.deepEqual(result.baselineComparison?.mismatchCaseIds, []);
assert.equal(result.decision?.code,
  "PASS-A8K-FORMAL-MRT-INLET-SIDE-CAUSAL-PROBE-CANDIDATE-ONLY");
assert.equal(result.decision?.pass, true);
assert.equal(result.decision?.formalSourceModified, false);
assert.equal(result.decision?.cbcIntegratedIntoFormalKernel, false);
assert.equal(result.decision?.formalIntegrationUnlocked, false);

const sourceHash = createHash("sha256")
  .update(await readFile(formalSourcePath)).digest("hex");
assert.equal(sourceHash, result.contractIdentity.formalSourceSha256);
const a8jRaw = await readFile(a8jPath);
const a8jHash = createHash("sha256").update(a8jRaw).digest("hex");
assert.equal(a8jHash, result.contractIdentity.a8jArtifactSha256);
const a8j = JSON.parse(a8jRaw.toString("utf8"));
const anchors = new Map(a8j.cases
  .filter((entry) => entry.definition.rampDurationDiameters === 20)
  .map((entry) => [
    `${entry.definition.nominalDiameterScaleCells}:${entry.definition.relaxationTime}`,
    entry,
  ]));
for (const entry of result.cases.filter((candidate) =>
  candidate.definition.inletBoundary === "formal-zou-he-velocity"
  && candidate.definition.outletBoundary === "formal-zou-he-pressure")) {
  const anchor = anchors.get(
    `${entry.definition.nominalDiameterScaleCells}:${entry.definition.relaxationTime}`,
  );
  assert.ok(anchor);
  assert.equal(entry.run.completedSteps, anchor.run.completedSteps);
  assert.deepEqual(entry.run.stability, anchor.run.stability);
  assert.deepEqual(entry.baselineComparison,
    { checked: true, exactMatch: true, mismatchFields: [] });
}
if (repeatPath !== undefined) {
  assert.equal(Buffer.compare(primaryRaw, await readFile(repeatPath)), 0,
    "independent A8K repeat is not byte-identical");
}
const compressedSha256 = createHash("sha256").update(primaryRaw).digest("hex");
const canonicalSha256 = createHash("sha256").update(canonicalRaw).digest("hex");
console.log(
  `FORMAL BOUNDARY FACTORIZATION ARTIFACT ASSERT PASS: ${primaryPath}; canonicalSha256=${canonicalSha256}; storedSha256=${compressedSha256}; baseline=9/9 exact; repeat=${repeatPath === undefined ? "not checked" : "byte-identical"}`,
);
