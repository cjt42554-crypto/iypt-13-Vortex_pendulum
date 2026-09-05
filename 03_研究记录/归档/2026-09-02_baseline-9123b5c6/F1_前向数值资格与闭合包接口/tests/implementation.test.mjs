import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { canonicalBytes } from "../src/canonical.mjs";
import {
  analyticWetCircleArea,
  bisectRoot,
  conservativeOscillatorEnergy,
  integrateFourState,
  numericalWetCircleArea,
  relativeDifference,
  simpsonIntegrate,
  trajectoryError,
  validateCoefficientSource,
  variableInertiaAcceleration,
} from "../src/numerics.mjs";
import {
  buildF1Cases,
  loadFrozenF1Inputs,
  qualifyF1,
  validateQualificationRecord,
} from "../src/qualification.mjs";

const inputs = await loadFrozenF1Inputs();
const contract = inputs.contract.value;
const matrix = inputs.matrix.value;
const platformIdentity = "TEST-PLATFORM-FROZEN";

function provenance() {
  return {
    contractSha256: inputs.contract.sha256,
    implementationSha256: inputs.implementation.sha256,
    inputSha256: inputs.matrix.sha256,
    platformIdentity,
  };
}

test("F1 RK4 four-state errors strictly decrease and nominal gates pass", () => {
  const allErrors = [];
  const displacementErrors = [];
  for (const level of contract.stepLevels) {
    const samples = integrateFourState(matrix.fourStateOde, matrix.fourStateOde.stepSizes[level]);
    allErrors.push(trajectoryError(samples, matrix.fourStateOde));
    displacementErrors.push(trajectoryError(samples, matrix.fourStateOde, [0, 2]));
  }
  for (let index = 1; index < allErrors.length; index += 1) {
    assert.ok(allErrors[index].normalizedRms < allErrors[index - 1].normalizedRms);
    assert.ok(displacementErrors[index].normalizedRms < displacementErrors[index - 1].normalizedRms);
  }
  assert.ok(allErrors[1].normalizedRms <= contract.gates.nominalNormalizedRmsMaximum);
  assert.ok(allErrors[1].normalizedMaximum <= contract.gates.nominalNormalizedMaximumMaximum);
});

test("F1 wet-circle Simpson quadrature converges to the independent analytic segment area", () => {
  const { circleRadius, waterlineY, simpsonPanels } = matrix.wetGeometry;
  const exact = analyticWetCircleArea(circleRadius, waterlineY);
  const errors = contract.stepLevels.map((level) =>
    Math.abs(numericalWetCircleArea(circleRadius, waterlineY, simpsonPanels[level]) - exact) / exact,
  );
  assert.ok(errors[1] < errors[0]);
  assert.ok(errors[2] < errors[1]);
});

test("F1 conservative Verlet energy record satisfies both frozen gates", () => {
  const result = conservativeOscillatorEnergy(matrix.conservativeOscillator);
  assert.ok(result.finalRelativeEnergy <= contract.gates.conservativeFinalRelativeEnergyMaximum);
  assert.ok(result.localRelativeRms <= contract.gates.conservativeLocalRelativeRmsMaximum);
});

test("F1 event, variable-inertia and output-integral references close independently", () => {
  const rootFn = (time) => Math.sin(time) - 0.3;
  const fine = bisectRoot(rootFn, matrix.eventRoot.bracket, matrix.eventRoot.epsilonT.fine);
  const reference = bisectRoot(rootFn, matrix.eventRoot.bracket, matrix.eventRoot.epsilonT.reference);
  assert.ok(
    Math.abs(fine - reference) <= Math.max(10 * matrix.eventRoot.epsilonT.fine, 1e-6),
  );

  const fineAcceleration = variableInertiaAcceleration(
    matrix.variableInertia,
    matrix.variableInertia.derivativeSteps.fine,
  );
  const finerAcceleration = variableInertiaAcceleration(
    matrix.variableInertia,
    matrix.variableInertia.derivativeSteps.finer,
  );
  assert.ok(
    relativeDifference(fineAcceleration.acceleration, finerAcceleration.acceleration) <=
      contract.gates.variableInertiaFineRelativeDifferenceMaximum,
  );

  const estimate = simpsonIntegrate(
    Math.sin,
    matrix.outputIntegration.interval[0],
    matrix.outputIntegration.interval[1],
    matrix.outputIntegration.simpsonPanels,
  );
  assert.ok(
    Math.abs(estimate - matrix.outputIntegration.exactIntegral) /
      matrix.outputIntegration.exactIntegral <=
      contract.gates.outputIntegralRelativeErrorMaximum,
  );
});

test("F1 coefficient policy rejects a literature prior mislabeled as apparatus-calibrated", () => {
  for (const entry of matrix.coefficientSourceCases) {
    assert.equal(validateCoefficientSource(entry.source, entry.claim, contract), entry.accepted);
  }
  assert.equal(validateCoefficientSource("analytic", "apparatus-calibrated", contract), false);
  assert.equal(validateCoefficientSource("measured-calibration", "apparatus-calibrated", contract), true);
});

test("F1 canonical numeric payload repeats byte-for-byte", () => {
  const first = buildF1Cases(contract, matrix, platformIdentity);
  const second = buildF1Cases(contract, matrix, platformIdentity);
  assert.ok(canonicalBytes(first).equals(canonicalBytes(second)));
  assert.equal(first.cases.find((entry) => entry.caseId === "canonical-repeat").pass, true);
});

test("F1 qualification matches the closed record schema and preserves the synthetic ceiling", () => {
  const first = qualifyF1(contract, matrix, provenance());
  const second = qualifyF1(contract, matrix, provenance());
  assert.equal(validateQualificationRecord(first, contract), true);
  assert.equal(first.decision, "PASS-F1-SYNTHETIC-NUMERICAL-QUALIFICATION-ONLY");
  assert.equal(first.classification, "synthetic-only");
  assert.deepEqual(first.cases.map((entry) => entry.caseId), contract.requiredCases);
  assert.ok(first.cases.every((entry) => entry.pass));
  assert.ok(canonicalBytes(first).equals(canonicalBytes(second)));
});

test("F1 fails closed on non-finite frozen input", () => {
  const invalidMatrix = structuredClone(matrix);
  invalidMatrix.fourStateOde.initialState[0] = Number.NaN;
  assert.throws(() => qualifyF1(contract, invalidMatrix, provenance()), /finite/u);
});

test("F1 implementation has no formal-program, A8R or experimental-data dependency", async () => {
  const files = ["../src/canonical.mjs", "../src/numerics.mjs", "../src/qualification.mjs"];
  const source = (await Promise.all(files.map((path) => readFile(new URL(path, import.meta.url), "utf8")))).join("\n");
  assert.doesNotMatch(source, /01_最终理论|02_模拟程序|A8R|scientific\.json\.gz|experiment-data/u);
});
