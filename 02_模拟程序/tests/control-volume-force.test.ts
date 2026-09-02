import assert from "node:assert/strict";
import { it } from "vitest";
import {
  A2_FORCE_DIAGNOSTIC_CONTRACT_ID,
  assessScaleAwareResidual,
  captureControlVolumeSnapshot,
  captureLbmDiagnosticState,
  evaluateControlVolumeStep,
  type D2Q9StateView,
  type InternalControlVolume,
} from "../src/solvers/highFidelity/control-volume-force";
import { D2Q9MrtBrinkmanSolver } from "../src/solvers/highFidelity/lbm";

const NX = 12;
const NY = 10;
const CV_SMALL: InternalControlVolume = { xMin: 3, xMax: 7, yMin: 3, yMax: 6 };
const CV_LARGE: InternalControlVolume = { xMin: 2, xMax: 9, yMin: 2, yMax: 7 };

function equilibrium(rho: number, ux: number, uy: number): number[] {
  const cx = [0, 1, 0, -1, 0, 1, -1, -1, 1];
  const cy = [0, 0, 1, 0, -1, 1, 1, -1, -1];
  const weight = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
  return cx.map((cxi, index) => {
    const cyi = cy[index] ?? 0;
    const cu = cxi * ux + cyi * uy;
    return (weight[index] ?? 0) * rho * (1 + 3 * cu + 4.5 * cu * cu - 1.5 * (ux * ux + uy * uy));
  });
}

function makeUniformState(ux = 0, uy = 0): D2Q9StateView {
  const cells = NX * NY;
  const distributions = new Float64Array(9 * cells);
  const populations = equilibrium(1, ux, uy);
  for (let cell = 0; cell < cells; cell += 1) {
    for (let direction = 0; direction < 9; direction += 1) {
      distributions[9 * cell + direction] = populations[direction] ?? 0;
    }
  }
  return {
    nx: NX,
    ny: NY,
    distributions,
    rho: new Float64Array(cells).fill(1),
    ux: new Float64Array(cells).fill(ux),
    uy: new Float64Array(cells).fill(uy),
    mask: new Float64Array(cells),
  };
}

function cloneState(state: D2Q9StateView): D2Q9StateView {
  return {
    nx: state.nx,
    ny: state.ny,
    distributions: Float64Array.from(state.distributions),
    rho: Float64Array.from(state.rho),
    ux: Float64Array.from(state.ux),
    uy: Float64Array.from(state.uy),
    mask: Float64Array.from(state.mask),
  };
}

function assertNear(actual: number, expected: number, tolerance = 1e-12): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

it("uniform translating equilibrium has zero reconstructed source", () => {
  const state = makeUniformState(0.031, -0.012);
  const before = captureControlVolumeSnapshot(state, CV_SMALL);
  const after = captureControlVolumeSnapshot(state, CV_SMALL);
  const balance = evaluateControlVolumeStep(before, after);
  assertNear(balance.rawReactionImpulseX, 0);
  assertNear(balance.rawReactionImpulseY, 0);
  assert.equal(balance.boundaryMaskPassed, true);
});

it("a local momentum source is recovered with the opposite body reaction", () => {
  const beforeState = makeUniformState();
  const afterState = cloneState(beforeState);
  const sourceCell = 5 + NX * 4;
  const delta = 0.02;
  const afterDistributions = afterState.distributions as Float64Array;
  afterDistributions[9 * sourceCell + 1]
    = (afterDistributions[9 * sourceCell + 1] ?? 0) + delta / 2;
  afterDistributions[9 * sourceCell + 3]
    = (afterDistributions[9 * sourceCell + 3] ?? 0) - delta / 2;
  const before = captureControlVolumeSnapshot(beforeState, CV_SMALL);
  const after = captureControlVolumeSnapshot(afterState, CV_SMALL);
  const balance = evaluateControlVolumeStep(before, after);
  assertNear(balance.sourceImpulseOnFluidX, delta);
  assertNear(balance.rawReactionImpulseX, -delta);
  assertNear(balance.rawReactionImpulseY, 0);
});

it("pure streaming across a CV face creates flux but no source", () => {
  const cells = NX * NY;
  const beforeState: D2Q9StateView = {
    nx: NX,
    ny: NY,
    distributions: new Float64Array(9 * cells),
    rho: new Float64Array(cells),
    ux: new Float64Array(cells),
    uy: new Float64Array(cells),
    mask: new Float64Array(cells),
  };
  const afterState = cloneState(beforeState);
  const sourceX = CV_SMALL.xMax;
  const sourceY = 4;
  const destinationX = sourceX + 1;
  const population = 0.07;
  (beforeState.distributions as Float64Array)[9 * (sourceX + NX * sourceY) + 1] = population;
  (afterState.distributions as Float64Array)[9 * (destinationX + NX * sourceY) + 1] = population;
  const before = captureControlVolumeSnapshot(beforeState, CV_SMALL);
  const after = captureControlVolumeSnapshot(afterState, CV_SMALL);
  const balance = evaluateControlVolumeStep(before, after);
  assertNear(after.netOutwardStreamingMomentumX, population);
  assertNear(balance.sourceImpulseOnFluidX, 0);
  assertNear(balance.rawReactionImpulseX, 0);
});

it("fictitious-fluid correction is added without changing the raw CV balance", () => {
  const beforeState = makeUniformState();
  const afterState = cloneState(beforeState);
  const cell = 5 + NX * 4;
  (beforeState.mask as Float64Array)[cell] = 1;
  (afterState.mask as Float64Array)[cell] = 1;
  (afterState.ux as Float64Array)[cell] = 0.2;
  const before = captureControlVolumeSnapshot(beforeState, CV_SMALL);
  const after = captureControlVolumeSnapshot(afterState, CV_SMALL);
  const balance = evaluateControlVolumeStep(before, after);
  assertNear(balance.rawReactionImpulseX, 0);
  assertNear(balance.fictitiousPhysicalMomentumIncrementX, 0.2);
  assertNear(balance.correctedPhysicalReactionImpulseX, 0.2);
});

it("the same enclosed source is invariant under CV placement", () => {
  const beforeState = makeUniformState();
  const afterState = cloneState(beforeState);
  const sourceCell = 5 + NX * 4;
  const deltaY = -0.015;
  const afterDistributions = afterState.distributions as Float64Array;
  afterDistributions[9 * sourceCell + 2]
    = (afterDistributions[9 * sourceCell + 2] ?? 0) + deltaY / 2;
  afterDistributions[9 * sourceCell + 4]
    = (afterDistributions[9 * sourceCell + 4] ?? 0) - deltaY / 2;
  const small = evaluateControlVolumeStep(
    captureControlVolumeSnapshot(beforeState, CV_SMALL),
    captureControlVolumeSnapshot(afterState, CV_SMALL),
  );
  const large = evaluateControlVolumeStep(
    captureControlVolumeSnapshot(beforeState, CV_LARGE),
    captureControlVolumeSnapshot(afterState, CV_LARGE),
  );
  assertNear(small.rawReactionImpulseY, -deltaY);
  assertNear(large.rawReactionImpulseY, -deltaY);
  assertNear(small.rawReactionImpulseY, large.rawReactionImpulseY);
});

it("a nonzero diffuse mask on the CV boundary fails the isolation guard", () => {
  const state = makeUniformState();
  const boundaryCell = CV_SMALL.xMin + NX * 4;
  (state.mask as Float64Array)[boundaryCell] = 0.01;
  const snapshot = captureControlVolumeSnapshot(state, CV_SMALL);
  const balance = evaluateControlVolumeStep(snapshot, snapshot, { boundaryMaskTolerance: 1e-6 });
  assert.equal(balance.boundaryMaskPassed, false);
  assert.equal(balance.maximumBoundaryMask, 0.01);
});

it("a diagonal halo-corner mask also fails source isolation", () => {
  const state = makeUniformState();
  const cornerCell = (CV_SMALL.xMin - 1) + NX * (CV_SMALL.yMin - 1);
  (state.mask as Float64Array)[cornerCell] = 0.02;
  const snapshot = captureControlVolumeSnapshot(state, CV_SMALL);
  const balance = evaluateControlVolumeStep(snapshot, snapshot, { boundaryMaskTolerance: 1e-6 });
  assert.equal(balance.boundaryMaskPassed, false);
  assert.equal(balance.maximumBoundaryMask, 0.02);
});

it("arbitrary D2Q9 streaming satisfies the discrete CV balance exactly", () => {
  const cells = NX * NY;
  const beforeState: D2Q9StateView = {
    nx: NX,
    ny: NY,
    distributions: new Float64Array(9 * cells),
    rho: new Float64Array(cells),
    ux: new Float64Array(cells),
    uy: new Float64Array(cells),
    mask: new Float64Array(cells),
  };
  const afterState = cloneState(beforeState);
  const beforeDistributions = beforeState.distributions as Float64Array;
  const afterDistributions = afterState.distributions as Float64Array;
  const cx = [0, 1, 0, -1, 0, 1, -1, -1, 1];
  const cy = [0, 0, 1, 0, -1, 1, 1, -1, -1];
  let seed = 0x12345678;
  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  for (let y = 0; y < NY; y += 1) {
    for (let x = 0; x < NX; x += 1) {
      const cell = x + NX * y;
      for (let direction = 0; direction < 9; direction += 1) {
        beforeDistributions[9 * cell + direction] = 0.01 + 0.02 * random();
      }
    }
  }
  for (let y = 0; y < NY; y += 1) {
    for (let x = 0; x < NX; x += 1) {
      const sourceCell = x + NX * y;
      for (let direction = 0; direction < 9; direction += 1) {
        const destinationX = (x + (cx[direction] ?? 0) + NX) % NX;
        const destinationY = (y + (cy[direction] ?? 0) + NY) % NY;
        const destinationCell = destinationX + NX * destinationY;
        afterDistributions[9 * destinationCell + direction]
          = beforeDistributions[9 * sourceCell + direction] ?? 0;
      }
    }
  }
  const balance = evaluateControlVolumeStep(
    captureControlVolumeSnapshot(beforeState, CV_LARGE),
    captureControlVolumeSnapshot(afterState, CV_LARGE),
  );
  assertNear(balance.sourceImpulseOnFluidX, 0, 2e-15);
  assertNear(balance.sourceImpulseOnFluidY, 0, 2e-15);
});

it("scale-aware residual gate ignores a harmless pointwise zero-crossing spike", () => {
  const sampleCount = 100;
  const maximumAbsoluteResidual = 2e-13;
  const squaredResidualSum = maximumAbsoluteResidual ** 2 + 99 * (1e-14) ** 2;
  const squaredReferenceSum = sampleCount * (1e-3) ** 2;
  const assessment = assessScaleAwareResidual(
    maximumAbsoluteResidual,
    squaredResidualSum,
    squaredReferenceSum,
    sampleCount,
  );
  assert.equal(assessment.passed, true);
  assert.ok(assessment.maximumResidualRelativeToReferenceRms < 1e-9);
  assert.ok(assessment.rmsResidualRelativeToReferenceRms < 1e-10);
});

it("scale-aware residual gate rejects a systematic reconstruction mismatch", () => {
  const sampleCount = 100;
  const residual = 2e-8;
  const assessment = assessScaleAwareResidual(
    residual,
    sampleCount * residual ** 2,
    sampleCount * (1e-3) ** 2,
    sampleCount,
  );
  assert.equal(assessment.passed, false);
  assert.ok(assessment.maximumResidualRelativeToReferenceRms > 1e-9);
  assert.ok(assessment.rmsResidualRelativeToReferenceRms > 1e-10);
});

it("formal LBM exposes a copy-bound A2 time-level snapshot without changing A1", () => {
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: 16,
    ny: 12,
    relaxationTime: 0.8,
    penalizationTimeSteps: 1.5,
    outerBoundary: "periodic",
  });
  solver.initializeUniform(0.02);
  const snapshot = captureLbmDiagnosticState(solver, null);
  assert.equal(snapshot.contractId, A2_FORCE_DIAGNOSTIC_CONTRACT_ID);
  assert.equal(
    snapshot.timeLevel,
    "post-boundary-distributions-and-half-force-macros-at-step",
  );
  assert.equal(snapshot.step, 0);
  const first = snapshot.distributions[0];
  (snapshot.distributions as Float64Array)[0] = 999;
  assert.equal(solver.checkpoint().distributions[0], first);
});
