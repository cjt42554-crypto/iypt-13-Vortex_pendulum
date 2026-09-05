import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { canonicalBytes } from "../src/canonical.mjs";
import {
  analyticFrozenJacobian,
  blockSpectrumCrosscheck,
  centralDifferenceJacobian,
  estimateFrequencyPhase,
  exposeIdentifiableCombination,
  frozenVectorField,
  hopfLinearAnalysis,
  normalizedMatrixError,
  syntheticAveragePower,
  synthesizeSinusoid,
  wrappedPhaseError,
} from "../src/structural.mjs";
import {
  buildS1Cases,
  loadFrozenS1Inputs,
  qualifyS1,
  validateS1Record,
} from "../src/qualification.mjs";

const inputs = await loadFrozenS1Inputs();
const contract = inputs.contract.value;
const matrix = inputs.matrix.value;

function provenance() {
  return {
    contractSha256: inputs.contract.sha256,
    implementationSha256: inputs.implementation.sha256,
    inputSha256: inputs.matrix.sha256,
    platformIdentity: "TEST-PLATFORM-FROZEN",
  };
}

test("S1 central-difference Jacobian converges at the frozen second-order ratio", () => {
  const reference = analyticFrozenJacobian(matrix.jacobian.evaluationPoint);
  const errors = matrix.jacobian.stepSizes.map((stepSize) =>
    normalizedMatrixError(
      centralDifferenceJacobian(frozenVectorField, matrix.jacobian.evaluationPoint, stepSize),
      reference,
    ),
  );
  assert.ok(errors[1] < errors[0]);
  assert.ok(errors[2] < errors[1]);
  assert.ok(errors[0] / errors[1] >= contract.gates.jacobianAdjacentErrorRatioMinimum);
  assert.ok(errors[1] / errors[2] >= contract.gates.jacobianAdjacentErrorRatioMinimum);
});

test("S1 independent block roots satisfy the combined characteristic polynomial", () => {
  const result = blockSpectrumCrosscheck(matrix.spectrum.block1, matrix.spectrum.block2);
  assert.deepEqual(result.characteristicPolynomial, [1, 2, 14, 8, 40]);
  assert.deepEqual(result.roots, [
    { real: 0, imaginary: 2 },
    { real: 0, imaginary: -2 },
    { real: -1, imaginary: 3 },
    { real: -1, imaginary: -3 },
  ]);
  assert.ok(result.maximumNormalizedResidual <= contract.gates.normalizedCharacteristicResidualMaximum);
});

test("S1 synthetic Hopf analysis closes stability and transversality", () => {
  const result = hopfLinearAnalysis(matrix.hopf.omega, matrix.hopf.muValues);
  const relativeError = Math.abs(result.transversality - matrix.hopf.expectedTransversality) /
    matrix.hopf.expectedTransversality;
  assert.deepEqual(result.samples.map((sample) => sample.stability), ["stable", "critical", "unstable"]);
  assert.ok(relativeError <= contract.gates.hopfTransversalityRelativeErrorMaximum);
});

test("S1 exposes only the identifiable L_gamma_j combination", () => {
  assert.deepEqual(exposeIdentifiableCombination({ L_gamma_j: 0.8 }, contract), { L_gamma_j: 0.8 });
  assert.throws(() => exposeIdentifiableCombination({ L: 2, gamma_j: 0.4 }, contract), /forbidden/u);
  assert.throws(() => exposeIdentifiableCombination({ L: 2 }, contract), /forbidden/u);
});

test("S1 frequency and phase recovery satisfies frozen synthetic gates", () => {
  const samples = synthesizeSinusoid(matrix.frequencyPhase);
  const estimate = estimateFrequencyPhase(samples, matrix.frequencyPhase.sampleRateHz);
  const frequencyError = Math.abs(estimate.frequencyHz - matrix.frequencyPhase.frequencyHz) /
    matrix.frequencyPhase.frequencyHz;
  const phaseError = wrappedPhaseError(estimate.phaseRadians, matrix.frequencyPhase.phaseRadians);
  assert.ok(frequencyError <= contract.gates.frequencyRelativeErrorMaximum);
  assert.ok(phaseError <= contract.gates.phaseAbsoluteErrorRadiansMaximum);
});

test("S1 average-power estimator matches the independent sinusoidal identity", () => {
  const result = syntheticAveragePower(matrix.averagePower);
  assert.ok(result.relativeError <= contract.gates.averagePowerRelativeErrorMaximum);
});

test("S1 canonical structural payload repeats byte-for-byte", () => {
  const first = buildS1Cases(contract, matrix, provenance());
  const second = buildS1Cases(contract, matrix, provenance());
  assert.ok(canonicalBytes(first).equals(canonicalBytes(second)));
  assert.equal(first.cases.find((entry) => entry.caseId === "canonical-repeat").pass, true);
});

test("S1 qualification matches the closed record and preserves the explicit deferral", () => {
  const first = qualifyS1(contract, matrix, provenance());
  const second = qualifyS1(contract, matrix, provenance());
  assert.equal(validateS1Record(first, contract), true);
  assert.equal(first.decision, "PASS-S1-EXPERIMENT-PREPARATION-STRUCTURAL-TOOLS");
  assert.equal(first.deferred, "DEFERRED-S1-NONLINEAR-CONTINUATION-AWAITING-CALIBRATION");
  assert.equal(first.classification, "synthetic-only");
  assert.deepEqual(first.cases.map((entry) => entry.caseId), contract.requiredCases);
  assert.ok(first.cases.every((entry) => entry.pass));
  assert.ok(canonicalBytes(first).equals(canonicalBytes(second)));
});

test("S1 fails closed on non-finite synthetic input", () => {
  const invalid = structuredClone(matrix);
  invalid.jacobian.evaluationPoint[0] = Number.NaN;
  assert.throws(() => qualifyS1(contract, invalid, provenance()), /finite/u);
});

test("S1 implementation does not include deferred nonlinear continuation or formal-data dependencies", async () => {
  const files = ["../src/canonical.mjs", "../src/structural.mjs", "../src/qualification.mjs"];
  const source = (await Promise.all(files.map((path) => readFile(new URL(path, import.meta.url), "utf8")))).join("\n");
  assert.doesNotMatch(source, /01_最终理论|02_模拟程序|A8R|Floquet|Arnold|scientific\.json\.gz/u);
});
