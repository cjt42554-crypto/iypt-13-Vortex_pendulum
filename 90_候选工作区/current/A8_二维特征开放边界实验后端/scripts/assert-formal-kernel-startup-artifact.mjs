import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const primaryPath = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-formal-mrt-brinkman-startup-matrix.json",
);
const repeatPath = process.argv[3] === undefined
  ? undefined
  : resolve(process.argv[3]);
const repositoryRoot = resolve(process.cwd(), "../../../");
const formalSourcePath = resolve(
  repositoryRoot,
  "02_模拟程序/src/solvers/highFidelity/lbm.ts",
);
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
assert.equal(result.format, "VP-A8H-FORMAL-MRT-BRINKMAN-STARTUP-MATRIX-v1");
assert.equal(
  result.contract?.format,
  "VP-A8H-FORMAL-MRT-BRINKMAN-STARTUP-CONTRACT-v1",
);
assert.equal(result.cases?.length, 18);
assert.equal(result.summaries?.length, 2);
assert.equal(result.uniformNoSolidGuards?.length, 3);
const expectedMatrixComplete = result.cases.every(
  (entry) => entry.run.status === "completed",
);
const expectedGuardsPass = result.uniformNoSolidGuards.every((entry) => entry.pass);
const expectedPass = expectedMatrixComplete
  && expectedGuardsPass
  && result.qualitativeComparison.sameQualitativeStartupPatternAsCandidate;
assert.equal(result.matrixComplete, expectedMatrixComplete);
assert.equal(result.decision?.pass, expectedPass);
assert.equal(
  result.decision?.code,
  expectedPass
    ? "PASS-A8H-READONLY-FORMAL-MRT-BRINKMAN-STARTUP-INTERNAL-GATES"
    : "NO-GO-A8H-READONLY-FORMAL-MRT-BRINKMAN-STARTUP-INTERNAL-GATES",
);
assert.equal(result.decision?.formalSourceModified, false);
assert.equal(result.decision?.cbcIntegratedIntoFormalKernel, false);
assert.equal(result.decision?.formalIntegrationUnlocked, false);
assert.equal(primaryText.includes("null"), false);
assert.equal(new Set(result.cases.map((entry) => entry.definition.id)).size, 18);
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
const a8dRaw = await readFile(a8dPath);
const a8eRaw = await readFile(a8ePath);
assert.equal(
  createHash("sha256").update(a8dRaw).digest("hex"),
  result.contract.inheritedCandidateEvidence.a8dArtifactSha256,
);
assert.equal(
  createHash("sha256").update(a8eRaw).digest("hex"),
  result.contract.inheritedCandidateEvidence.a8eArtifactSha256,
);

if (repeatPath !== undefined) {
  const repeatRaw = await readFile(repeatPath);
  assert.equal(
    Buffer.compare(primaryRaw, repeatRaw),
    0,
    "independent A8H repeat is not byte-identical",
  );
}
const sha256 = createHash("sha256").update(primaryRaw).digest("hex");
console.log(
  `FORMAL KERNEL STARTUP ARTIFACT ASSERT PASS: ${primaryPath}; sha256=${sha256}; source-hash=exact; repeat=${repeatPath === undefined ? "not checked" : "byte-identical"}`,
);
