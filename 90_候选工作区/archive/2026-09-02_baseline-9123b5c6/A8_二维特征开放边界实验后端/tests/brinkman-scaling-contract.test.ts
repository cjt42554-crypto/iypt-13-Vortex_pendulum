import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BRINKMAN_SCALING_CONTRACT as CONTRACT,
  BRINKMAN_SCALING_DIAMETERS as DIAMETERS,
  BRINKMAN_SCALING_MASK_HALF_THICKNESSES as MASKS,
  BRINKMAN_SCALING_PATH_PENALIZATION_TIMES as PATH_ETAS,
  buildBrinkmanScalingDefinitions,
} from "../src/brinkman-scaling-contract.ts";

test("A8Q freezes the unique ten-case scaling matrix", () => {
  assert.equal(
    CONTRACT.format,
    "VP-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-SCREEN-CONTRACT-v1",
  );
  assert.deepEqual([...DIAMETERS], [16, 24]);
  assert.deepEqual([...MASKS], [0.5, 0.75]);
  assert.deepEqual([...PATH_ETAS], [1, 2]);
  const definitions = buildBrinkmanScalingDefinitions();
  assert.equal(definitions.length, CONTRACT.matrix.uniqueRunCount);
  assert.equal(new Set(definitions.map((entry) => entry.id)).size, 10);
  assert.equal(
    definitions.filter((entry) => entry.diameterCells === 16).length,
    4,
  );
  assert.equal(
    definitions.filter((entry) => entry.diameterCells === 24).length,
    6,
  );
  assert.deepEqual(
    definitions.map((entry) => [
      entry.diameterCells,
      entry.maskHalfThicknessCells,
      entry.penalizationTimeSteps,
    ]),
    [
      [16, 0.5, 1],
      [16, 0.5, 2],
      [16, 0.75, 1],
      [16, 0.75, 2],
      [24, 0.5, 1],
      [24, 0.5, 2],
      [24, 0.5, 3],
      [24, 0.75, 1],
      [24, 0.75, 2],
      [24, 0.75, 3],
    ],
  );
});

test("A8Q controls remain D24 diagnostics and cannot become paths", () => {
  const definitions = buildBrinkmanScalingDefinitions();
  const controls = definitions.filter((entry) =>
    entry.role === "fixed-eta-hat-control");
  assert.equal(controls.length, 2);
  assert.ok(controls.every((entry) => entry.diameterCells === 24));
  assert.ok(controls.every((entry) => entry.penalizationTimeSteps === 3));
  assert.deepEqual(
    controls.map((entry) => entry.maskHalfThicknessCells),
    [0.5, 0.75],
  );
  assert.equal(CONTRACT.decision.carryEveryPassingPathIntoA8r, true);
});

test("A8Q definitions implement the frozen carrier and scaling formulae", () => {
  for (const definition of buildBrinkmanScalingDefinitions()) {
    const diameter = definition.diameterCells;
    const eta = definition.penalizationTimeSteps;
    const expectedViscosity = CONTRACT.carrier.latticeVelocity
      * diameter / CONTRACT.carrier.reynoldsNumber;
    assert.equal(definition.kinematicViscosity, expectedViscosity);
    assert.equal(definition.relaxationTime, 0.5 + 3 * expectedViscosity);
    assert.equal(
      definition.etaHat,
      eta * CONTRACT.carrier.latticeVelocity / diameter,
    );
    assert.equal(
      definition.penaltyLayerCells,
      Math.sqrt(expectedViscosity * eta),
    );
    assert.equal(
      definition.penaltyLayerRelativeDiameter,
      definition.penaltyLayerCells / diameter,
    );
    assert.equal(definition.nx, 33.5 * diameter);
    assert.equal(definition.ny, 10 * diameter);
    assert.equal(definition.bodyCenterX, 14 * diameter);
    assert.equal(
      definition.bodyCenterY,
      0.5 * (definition.ny - 1)
        + CONTRACT.carrier.bodyPhaseOffsetYCells,
    );
    assert.equal(definition.bodyRadius, 0.5 * diameter);
    assert.equal(definition.totalSteps, 80 * diameter / 0.05);
    assert.equal(definition.discardSteps, 40 * diameter / 0.05);
  }
});

test("A8Q freezes diagnostic regions, stability gates, and path gates", () => {
  assert.equal(CONTRACT.diagnostics.coreMaskMinimumInclusive, 0.99);
  assert.equal(CONTRACT.diagnostics.transitionMaskMinimumExclusive, 0.01);
  assert.equal(CONTRACT.diagnostics.transitionMaskMaximumExclusive, 0.99);
  assert.equal(
    CONTRACT.diagnostics.forceDecomposition
      .retainPerAcceptedAnalysisStepTrace,
    true,
  );
  assert.equal(CONTRACT.gates.maximumDensityDeviation, 0.08);
  assert.equal(CONTRACT.gates.maximumMach, 0.30);
  assert.equal(CONTRACT.gates.maturity.minimumLiftRms, 1e-3);
  assert.equal(
    CONTRACT.gates.fixedEtaPath
      .directionNearPlatformRelativeThreshold,
    0.01,
  );
  assert.equal(
    CONTRACT.gates.fixedEtaPath
      .maximumFineCrossMaskRelativeLoadDifference,
    0.05,
  );
  assert.equal(
    CONTRACT.gates.independentFullRepeatByteIdentityRequired,
    true,
  );
});

test("A8Q cannot relabel a literature hit or authorize downstream physics", () => {
  assert.equal(
    CONTRACT.literatureObservation.singlePointHitCode,
    "INCONCLUSIVE-A8Q-SINGLE-POINT-LITERATURE-HIT",
  );
  assert.equal(
    CONTRACT.decision.passCode,
    "PASS-A8Q-BRINKMAN-SCALING-PATH-CANDIDATE-ONLY-UNLOCK-A8R",
  );
  assert.equal(
    CONTRACT.decision.noGoCode,
    "NO-GO-A8Q-BRINKMAN-SCALING-PATH-INCOHERENT",
  );
  assert.equal(CONTRACT.decision.formalSourceModified, false);
  assert.equal(CONTRACT.decision.formalIntegrationUnlocked, false);
  assert.equal(CONTRACT.decision.s1PhysicallySelected, false);
  assert.equal(CONTRACT.decision.s9Selected, false);
  assert.equal(CONTRACT.decision.newBoundaryStrategyCreated, false);
  assert.equal(CONTRACT.decision.stopAfterEvidenceReportRepeatAndHandoff, true);
});

test("A8Q source identities freeze A8P and the public carrier", () => {
  assert.equal(
    CONTRACT.sourceIdentity.formalSource.sha256,
    "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
  );
  assert.equal(
    CONTRACT.sourceIdentity.frozenA8p.artifact.storedSha256,
    "0aec8ce335baab93224608d01f6de0d5afcf8779226d2be8d40a5e946ae31868",
  );
  assert.equal(
    CONTRACT.sourceIdentity.frozenA8p.artifact.canonicalSha256,
    "56dd50ed6c941b4581d5f7fa7faabafb2459f334749a5b321a64329c0abf00ff",
  );
  assert.equal(
    CONTRACT.sourceIdentity.publicFixedCylinderCarrier.caseRunner.sha256,
    "4953fc58b71ffdbf23a6216ffa203ff2a9ae654ae718562e5217ddc5c66cee14",
  );
});
