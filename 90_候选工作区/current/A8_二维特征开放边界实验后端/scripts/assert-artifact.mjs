import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const path = resolve(
  process.argv[2]
    ?? "验证与复现/artifacts/a8-cbc2d-boundary-qualification-research.json",
);
const result = JSON.parse(await readFile(path, "utf8"));
assert.equal(result.format, "VP-A8-CBC2D-QUALIFICATION-v1");
assert.equal(
  result.contract?.format,
  "VP-A8-CBC2D-QUALIFICATION-CONTRACT-v1",
);
assert.equal(result.acousticPulse?.candidateGate?.pass, true);
assert.equal(result.convectedVortex?.candidateGate?.pass, true);
assert.equal(result.fixedCylinderStartup?.candidateGate?.pass, true);
assert.equal(result.decision?.pass, true);
assert.equal(
  result.decision?.code,
  "PASS-A8B-CBC2D-BOUNDARY-QUALIFICATION-CANDIDATE-ONLY",
);
for (const sectionName of ["acousticPulse", "convectedVortex", "fixedCylinderStartup"]) {
  const section = result[sectionName];
  assert.ok(Array.isArray(section?.metrics) && section.metrics.length === 3);
  for (const metric of section.metrics) {
    const serialized = JSON.stringify(metric);
    assert.equal(serialized.includes("null"), false);
    for (const value of Object.values(metric.stability ?? {})) {
      assert.equal(Number.isFinite(value), true);
    }
  }
}
console.log(`ARTIFACT ASSERT PASS: ${path}`);
