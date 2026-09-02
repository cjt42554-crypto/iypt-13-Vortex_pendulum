import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FORMAL_CAUSAL_REFERENCE_CONTRACT as CONTRACT,
  FORMAL_CAUSAL_REFERENCE_PERTURBATIONS as PERTURBATIONS,
  FORMAL_CAUSAL_REFERENCE_STRATEGIES as STRATEGIES,
  buildFormalCausalPerturbationDefinitions,
  buildFormalCausalReferenceDefinitions,
} from "../src/formal-causal-reference-contract.ts";

test("A8O freezes two unchanged strategies and complete reference matrices", () => {
  assert.equal(
    CONTRACT.format,
    "VP-A8O-CAUSAL-REFERENCE-2D-QUALIFICATION-CONTRACT-v1",
  );
  assert.deepEqual(STRATEGIES.map((entry) => entry.ordinal), [1, 9]);
  assert.deepEqual(STRATEGIES.map((entry) => entry.id), [
    "legacy-zou-he-derived-density",
    "incoming-characteristic-compatible-zou-he",
  ]);
  const causal = buildFormalCausalReferenceDefinitions("causal");
  const statistics = buildFormalCausalReferenceDefinitions("statistics");
  assert.equal(causal.length, CONTRACT.causalReference.matrix.runCount);
  assert.equal(statistics.length, CONTRACT.continuousStatistics.matrixRunCount);
  assert.equal(new Set(causal.map((entry) => entry.id)).size, causal.length);
  assert.equal(new Set(statistics.map((entry) => entry.id)).size, statistics.length);
});

test("A8O freezes four upstream distances and preserves downstream geometry", () => {
  const causal = buildFormalCausalReferenceDefinitions("causal");
  assert.deepEqual(
    [...new Set(causal.map((entry) => entry.upstreamDiameters))],
    [3.5, 7, 10.5, 14],
  );
  for (const entry of causal) {
    assert.equal(entry.downstreamDiameters, 6.5);
    assert.equal(
      entry.nx,
      Math.round(
        (entry.upstreamDiameters + entry.downstreamDiameters)
          * entry.nominalDiameterCells,
      ) + 1,
    );
    assert.equal(entry.bodyCenterX, entry.upstreamDiameters
      * entry.nominalDiameterCells);
    assert.equal(entry.sampleStride, entry.nominalDiameterCells / 4);
  }
});

test("A8O separates the causal window from long-time statistics", () => {
  const causal = buildFormalCausalReferenceDefinitions("causal");
  const statistics = buildFormalCausalReferenceDefinitions("statistics");
  const cs = CONTRACT.commonNumerics.latticeSoundSpeed;
  const u0 = CONTRACT.commonNumerics.inletVelocityLattice;
  for (const entry of causal) {
    const length = CONTRACT.causalReference.longestReferenceUpstreamDiameters
      * entry.nominalDiameterCells;
    const expected = Math.floor(
      CONTRACT.causalReference.longestReferenceSafetyFraction
        * (length / (cs - u0) + length / (cs + u0)),
    );
    assert.equal(entry.runSteps, expected);
  }
  for (const entry of statistics) {
    assert.equal(
      entry.runSteps,
      Math.round(
        CONTRACT.continuousStatistics.totalConvectiveDuration
          * entry.nominalDiameterCells / u0,
      ),
    );
  }
  assert.equal(
    CONTRACT.continuousStatistics.warmupConvectiveDuration
      + CONTRACT.continuousStatistics.consecutiveWindowCount
        * CONTRACT.continuousStatistics.windowConvectiveDuration,
    CONTRACT.continuousStatistics.totalConvectiveDuration,
  );
  assert.equal(
    CONTRACT.operationalDefinitions.causalComparison.commonReference,
    "cellwise-arithmetic-mean-of-aligned-S1-and-S9-14D-traces",
  );
  assert.equal(
    CONTRACT.operationalDefinitions.statistics.freshUniformInitializationForEveryRun,
    true,
  );
  assert.equal(
    CONTRACT.operationalDefinitions.correctedLoad.recordEveryAcceptedStep,
    true,
  );
});

test("A8O freezes two oblique gates, a local pulse gate, and a shear diagnostic", () => {
  assert.deepEqual(PERTURBATIONS.map((entry) => entry.id), [
    "oblique-acoustic-ky1",
    "oblique-acoustic-ky2",
    "localized-pressure-pulse",
    "shear-vorticity-diagnostic",
  ]);
  const definitions = buildFormalCausalPerturbationDefinitions();
  assert.equal(definitions.length, CONTRACT.twoDimensionalPerturbations.casePairCount);
  assert.equal(new Set(definitions.map((entry) => entry.id)).size, definitions.length);
  assert.equal(
    definitions.filter((entry) => entry.family === "oblique-acoustic").length,
    12,
  );
  assert.equal(
    definitions.filter((entry) => entry.family === "localized-pressure").length,
    6,
  );
  assert.equal(
    definitions.filter((entry) => entry.family === "shear-vorticity").length,
    6,
  );
  assert.equal(
    CONTRACT.operationalDefinitions.perturbations.windowEnvelopeSigmaMultipliers,
    3,
  );
  assert.equal(
    CONTRACT.operationalDefinitions.perturbations.shearDiagnosticStrideSteps,
    4,
  );
});

test("A8O cannot tune S9 or authorize formal integration", () => {
  assert.equal(CONTRACT.strategyIdentity.s9FormulaMustRemainByteIdenticalToA8n, true);
  assert.ok(CONTRACT.strategyIdentity.forbidden.includes(
    "far-field-relaxation-coefficient",
  ));
  assert.ok(CONTRACT.strategyIdentity.forbidden.includes(
    "change-S9-formula-or-strategy-id",
  ));
  assert.equal(CONTRACT.decision.formalSourceModified, false);
  assert.equal(CONTRACT.decision.formalIntegrationUnlocked, false);
  assert.equal(CONTRACT.decision.candidateAutomaticallyApproved, false);
  assert.equal(CONTRACT.decision.stopAfterEvidenceAndHandoff, true);
  assert.equal(CONTRACT.classification.formalAlgorithmSelectionDelegatedToPro, true);
});
