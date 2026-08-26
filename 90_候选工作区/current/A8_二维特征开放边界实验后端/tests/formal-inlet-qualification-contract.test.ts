import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FORMAL_INLET_QUALIFICATION_CONTRACT as CONTRACT,
  FORMAL_INLET_QUALIFICATION_STARTUP_PROTOCOLS as PROTOCOLS,
  FORMAL_INLET_QUALIFICATION_STRATEGIES as STRATEGIES,
} from "../src/formal-inlet-qualification-contract.ts";

test("A8M preregistration freezes the complete crossed startup matrix", () => {
  assert.equal(CONTRACT.startupMatrix.runCount, 108);
  assert.equal(
    CONTRACT.startupMatrix.runCount,
    CONTRACT.startupMatrix.cornerCount * STRATEGIES.length * PROTOCOLS.length,
  );
  assert.deepEqual(STRATEGIES.map((entry) => entry.ordinal), [1, 2, 7, 8]);
  assert.deepEqual(PROTOCOLS.map((entry) => entry.id), [
    "rest-ramp-20d-no-body",
    "uniform-target-no-body",
    "fixed-body-established-prerun",
  ]);
});

test("A8M preregistration freezes exact population accounting", () => {
  assert.deepEqual(
    CONTRACT.exactPopulationMassBudget.adapterDirectionGroups,
    {
      incoming: [1, 5, 8],
      outgoing: [3, 6, 7],
      stationaryCross: [0, 2, 4],
    },
  );
  assert.equal(
    CONTRACT.exactPopulationMassBudget.gates
      .formalShadowMaximumPopulationAbsoluteDifference,
    0,
  );
  assert.ok(
    CONTRACT.exactPopulationMassBudget.gates
      .maximumNormalizedCumulativeClosureResidual > 0,
  );
  assert.ok(
    CONTRACT.exactPopulationMassBudget.gates
      .maximumS2NonIncomingAbsoluteModificationFraction <= 0.5,
  );
});

test("A8M preregistration freezes absolute acoustic gates", () => {
  assert.equal(CONTRACT.acousticReflection.caseCount, 12);
  assert.equal(CONTRACT.acousticReflection.solverTraceCount, 24);
  assert.equal(
    CONTRACT.acousticReflection.domainPair.referencePulseCenterX
      - CONTRACT.acousticReflection.domainPair.testPulseCenterX,
    CONTRACT.acousticReflection.domainPair.referenceShiftCells,
  );
  assert.equal(
    CONTRACT.acousticReflection.domainPair.referenceProbeX
      - CONTRACT.acousticReflection.domainPair.testProbeX,
    CONTRACT.acousticReflection.domainPair.referenceShiftCells,
  );
  assert.ok(
    Math.abs(
      CONTRACT.acousticReflection.gates
        .maximumAcousticEnergyReflectionRatio
      - CONTRACT.acousticReflection.gates
        .maximumCharacteristicAmplitudeReflectionRatio ** 2,
    ) <= Number.EPSILON,
  );
});

test("A8M cannot authorize formal integration", () => {
  assert.equal(CONTRACT.decision.formalSourceModified, false);
  assert.equal(CONTRACT.decision.formalIntegrationUnlocked, false);
  assert.equal(CONTRACT.decision.s2AutomaticallyApproved, false);
  assert.equal(CONTRACT.decision.stopAfterEvidenceAndHandoff, true);
  assert.equal(CONTRACT.classification.formalAlgorithmSelectionDelegatedToPro, true);
});
