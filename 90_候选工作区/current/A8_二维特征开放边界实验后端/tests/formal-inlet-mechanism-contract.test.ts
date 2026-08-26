import assert from "node:assert/strict";
import test from "node:test";
import { FORMAL_INLET_MECHANISM_CONTRACT as CONTRACT } from
  "../src/formal-inlet-mechanism-contract.ts";

test("A8L contract freezes eight interpretable strategies and 72 runs", () => {
  assert.equal(CONTRACT.strategies.length, 8);
  assert.equal(new Set(CONTRACT.strategies.map((entry) => entry.id)).size, 8);
  assert.deepEqual(CONTRACT.strategies.map((entry) => entry.ordinal),
    [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(CONTRACT.matrix.nominalDiameterScaleCells.length, 3);
  assert.equal(CONTRACT.matrix.relaxationTime.length, 3);
  assert.equal(CONTRACT.matrix.cornerCount, 9);
  assert.equal(CONTRACT.matrix.runCount, 72);
  assert.equal(
    CONTRACT.matrix.nominalDiameterScaleCells.length
      * CONTRACT.matrix.relaxationTime.length
      * CONTRACT.strategies.length,
    CONTRACT.matrix.runCount,
  );
});

test("A8L contract freezes both zero-tolerance inherited anchors", () => {
  assert.equal(CONTRACT.inheritedEvidence.a8j.anchorStrategy,
    "legacy-zou-he-derived-density");
  assert.equal(CONTRACT.inheritedEvidence.a8j.anchorCases, 9);
  assert.equal(CONTRACT.inheritedEvidence.a8k.anchorStrategy,
    "full-regularized-fixed-density");
  assert.equal(CONTRACT.inheritedEvidence.a8k.anchorCases, 9);
  assert.equal(CONTRACT.gates.anchorMetricAbsoluteTolerance, 0);
  assert.equal(CONTRACT.gates.requireA8jBaselineMetricExactMatch, true);
  assert.equal(CONTRACT.gates.requireA8kRegularizedFixedMetricExactMatch, true);
});

test("A8L contract keeps the formal solver and integration gate closed", () => {
  assert.equal(CONTRACT.sourceIdentity.formalSource.accessMode,
    "read-only-import-with-candidate-checkpoint-inlet-adapter");
  assert.equal(CONTRACT.matrix.outletBoundary, "formal-zou-he-pressure");
  assert.equal(CONTRACT.decision.formalSourceModified, false);
  assert.equal(CONTRACT.decision.formalIntegrationUnlocked, false);
  assert.equal(CONTRACT.decision.algorithmSelectionDelegatedToProReview, true);
  assert.equal(CONTRACT.decision.stopAfterEvidenceAndHandoff, true);
});

test("A8L contract records diagnostics without post-hoc diagnostic gates", () => {
  assert.equal(CONTRACT.gates.maximumDensityDeviation, 0.12);
  assert.equal(CONTRACT.gates.maximumMach, 0.30);
  assert.equal(CONTRACT.gates.negativePopulationDiagnosticsAreGate, false);
  assert.equal(CONTRACT.gates.massFluxClosureDiagnosticsAreGate, false);
  assert.equal(CONTRACT.diagnostics.boundaryFluxInterpretation,
    "recorded-diagnostic-not-an-exact-discrete-population-balance-gate");
});
