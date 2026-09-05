import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FORMAL_INCOMING_CHARACTERISTIC_CONTRACT as CONTRACT,
  FORMAL_INCOMING_CHARACTERISTIC_STARTUP_PROTOCOLS as PROTOCOLS,
  FORMAL_INCOMING_CHARACTERISTIC_STRATEGIES as STRATEGIES,
} from "../src/formal-incoming-characteristic-contract.ts";

test("A8N preregistration freezes a new strategy identity and complete matrix", () => {
  assert.equal(
    CONTRACT.format,
    "VP-A8N-INCOMING-CHARACTERISTIC-QUALIFICATION-CONTRACT-v1",
  );
  assert.deepEqual(STRATEGIES.map((entry) => entry.ordinal), [1, 9]);
  assert.deepEqual(STRATEGIES.map((entry) => entry.id), [
    "legacy-zou-he-derived-density",
    "incoming-characteristic-compatible-zou-he",
  ]);
  assert.equal(CONTRACT.startupMatrix.runCount, 54);
  assert.equal(
    CONTRACT.startupMatrix.runCount,
    CONTRACT.startupMatrix.cornerCount * STRATEGIES.length * PROTOCOLS.length,
  );
  assert.equal(CONTRACT.acousticReflection.caseCount, 6);
  assert.equal(CONTRACT.acousticReflection.solverTraceCount, 12);
});

test("A8N freezes incoming-only population ownership", () => {
  assert.deepEqual(
    CONTRACT.algorithmIdentity.reconstructedIncomingDirectionsOnly,
    [1, 5, 8],
  );
  assert.deepEqual(
    CONTRACT.algorithmIdentity.knownPopulationDirectionsPreservedExactly,
    [0, 2, 3, 4, 6, 7],
  );
  assert.deepEqual(
    [
      ...CONTRACT.algorithmIdentity.reconstructedIncomingDirectionsOnly,
      ...CONTRACT.algorithmIdentity.knownPopulationDirectionsPreservedExactly,
    ].sort((a, b) => a - b),
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.equal(
    CONTRACT.exactPopulationMassBudget.gates
      .maximumNonIncomingAbsoluteModification,
    0,
  );
  assert.ok(CONTRACT.algorithmIdentity.forbidden.includes(
    "simultaneously-impose-fixed-rho-and-fixed-ux",
  ));
});

test("A8N freezes the compatible positive-root identity", () => {
  const rho0 = CONTRACT.algorithmIdentity.farFieldState.rho0;
  const cs = CONTRACT.algorithmIdentity.latticeSoundSpeed;
  const u0 = CONTRACT.commonNumerics.inletVelocityLattice;
  const k = rho0 * (1 - u0);
  const linear = 1 - u0 - cs;
  const discriminant = linear * linear + 4 * (cs / rho0) * k;
  const rho = (-linear + Math.sqrt(discriminant)) / (2 * cs / rho0);
  const ux = 1 - k / rho;
  const incomingCharacteristic = 0.5 * (
    rho - rho0 + rho0 * (ux - u0) / cs
  );

  assert.ok(Math.abs(rho - rho0) <= Number.EPSILON);
  assert.ok(Math.abs(ux - u0) <= Number.EPSILON);
  assert.ok(Math.abs(rho * (1 - ux) - k) <= Number.EPSILON);
  assert.ok(Math.abs(incomingCharacteristic) <= Number.EPSILON);
});

test("A8N carries forward absolute A8M acoustic gates", () => {
  const gates = CONTRACT.acousticReflection.gates;
  assert.equal(gates.maximumCharacteristicAmplitudeReflectionRatio, 0.05);
  assert.equal(gates.maximumDensityAmplitudeReflectionRatio, 0.05);
  assert.equal(gates.maximumVelocityAmplitudeReflectionRatio, 0.05);
  assert.equal(gates.maximumAcousticEnergyReflectionRatio, 0.0025);
  assert.ok(Math.abs(
    gates.maximumAcousticEnergyReflectionRatio
      - gates.maximumCharacteristicAmplitudeReflectionRatio ** 2,
  ) <= Number.EPSILON);
});

test("A8N preregistration cannot authorize formal integration", () => {
  assert.equal(CONTRACT.decision.formalSourceModified, false);
  assert.equal(CONTRACT.decision.formalIntegrationUnlocked, false);
  assert.equal(CONTRACT.decision.candidateAutomaticallyApproved, false);
  assert.equal(CONTRACT.decision.stopAfterEvidenceAndHandoff, true);
  assert.equal(CONTRACT.classification.formalAlgorithmSelectionDelegatedToPro, true);
});
