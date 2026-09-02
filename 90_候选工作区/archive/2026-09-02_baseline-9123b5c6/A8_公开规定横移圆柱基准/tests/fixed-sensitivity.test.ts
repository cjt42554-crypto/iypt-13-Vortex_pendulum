import test from "node:test";
import assert from "node:assert/strict";
import {
  BASELINE_VARIANT,
  RESEARCH_VARIANTS,
  diagnoseSensitivity,
  maximumAbsoluteStrouhalShift,
  maximumRelativeLoadDeviation,
  variantsForProfile,
} from "../src/fixed-sensitivity-contract.ts";

test("research sensitivity matrix is unique and one-factor-at-a-time", () => {
  assert.equal(RESEARCH_VARIANTS.length, 9);
  assert.equal(new Set(RESEARCH_VARIANTS.map((item) => item.id)).size, 9);
  for (const variant of RESEARCH_VARIANTS) {
    const changed = [
      variant.phaseOffsetX !== BASELINE_VARIANT.phaseOffsetX,
      variant.phaseOffsetY !== BASELINE_VARIANT.phaseOffsetY,
      variant.maskHalfThickness !== BASELINE_VARIANT.maskHalfThickness,
      variant.etaHat !== BASELINE_VARIANT.etaHat,
    ].filter(Boolean).length;
    if (variant.group === "baseline") assert.equal(changed, 0);
    if (variant.group === "grid-phase") assert.ok(changed >= 1 && changed <= 2);
    if (variant.group === "mask-half-thickness") assert.equal(changed, 1);
    if (variant.group === "penalization") assert.equal(changed, 1);
  }
});

test("smoke matrix reaches every sensitivity code path", () => {
  const smoke = variantsForProfile("smoke");
  assert.equal(smoke.length, 4);
  assert.deepEqual(
    new Set(smoke.map((variant) => variant.group)),
    new Set(["baseline", "grid-phase", "mask-half-thickness", "penalization"]),
  );
});

test("sensitivity amplitudes use baseline-relative loads and absolute Strouhal shift", () => {
  const baseline = { meanDrag: 2, liftRms: 0.5, strouhal: 0.2 };
  const candidates = [
    { meanDrag: 1.8, liftRms: 0.55, strouhal: 0.19 },
    { meanDrag: 2.1, liftRms: 0.4, strouhal: 0.205 },
  ];
  assert.ok(Math.abs(maximumRelativeLoadDeviation(baseline, candidates) - 0.2) < 1e-15);
  assert.ok(Math.abs(maximumAbsoluteStrouhalShift(baseline, candidates) - 0.01) < 1e-15);
});

test("dominance classification is frozen and fail-closed", () => {
  assert.equal(diagnoseSensitivity({
    "grid-phase": 0.02,
    "mask-half-thickness": 0.04,
    penalization: 0.01,
  }), "insufficient");
  assert.equal(diagnoseSensitivity({
    "grid-phase": 0.08,
    "mask-half-thickness": 0.06,
    penalization: 0.01,
  }), "multi-factor");
  assert.equal(diagnoseSensitivity({
    "grid-phase": 0.03,
    "mask-half-thickness": 0.12,
    penalization: 0.02,
  }), "mask-half-thickness");
});
