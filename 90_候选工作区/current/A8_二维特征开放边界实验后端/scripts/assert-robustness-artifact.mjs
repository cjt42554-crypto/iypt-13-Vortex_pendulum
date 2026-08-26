import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const path = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-cbc2d-boundary-robustness-matrix.json",
);
const result = JSON.parse(await readFile(path, "utf8"));
assert.equal(result.format, "VP-A8-CBC2D-ROBUSTNESS-MATRIX-v1");
assert.equal(result.contract?.format, "VP-A8-CBC2D-ROBUSTNESS-CONTRACT-v1");
assert.equal(result.matrixComplete, true);
assert.equal(result.summary?.totalCases, 81);
assert.equal(result.cases?.length, 81);
assert.equal(result.summary?.referenceRuns, 27);
assert.equal(result.summary?.zouHeRuns, 81);
assert.equal(result.summary?.candidateRuns, 81);
assert.equal(result.summary?.totalSolverRuns, 189);
assert.equal(result.summary?.completedSolverRuns, 189);
assert.equal(
  result.summary.passedCases + result.summary.failedCases,
  result.summary.totalCases,
);
assert.equal(result.decision?.pass, result.summary.failedCases === 0);
assert.equal(
  result.decision?.code,
  result.decision.pass
    ? "PASS-A8C-CBC2D-FROZEN-ROBUSTNESS-MATRIX-CANDIDATE-ONLY"
    : "NO-GO-A8C-CBC2D-FROZEN-ROBUSTNESS-MATRIX",
);
const ids = new Set();
for (const entry of result.cases) {
  assert.equal(typeof entry.definition?.id, "string");
  assert.equal(ids.has(entry.definition.id), false);
  ids.add(entry.definition.id);
  assert.equal(typeof entry.gate?.pass, "boolean");
  assert.ok(Array.isArray(entry.gate?.failureReasons));
  assert.equal(entry.reference?.boundary, "cbc-2d-regularized");
  assert.equal(entry.zouHe?.boundary, "zou-he-pressure");
  assert.equal(entry.candidate?.boundary, "cbc-2d-regularized");
  if (entry.candidate?.status === "completed") {
    assert.ok(entry.candidate.stability.maximumDensityDeviationStep > 0);
    assert.ok(entry.candidate.stability.maximumMachStep > 0);
  }
}
assert.equal(JSON.stringify(result).includes("null"), false);
console.log(
  `ROBUSTNESS ARTIFACT ASSERT PASS: ${path}; decision=${result.decision.code}`,
);
