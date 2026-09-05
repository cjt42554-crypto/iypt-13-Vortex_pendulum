import {
  D2Q9_CX,
  D2Q9_CY,
  type LbmBodyKinematics,
  type LbmCheckpoint,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT } from
  "./brinkman-multiresolution-contract-v2-1.ts";

export const BRINKMAN_MULTIRESOLUTION_V2P1_IMPLEMENTATION_INPUTS =
  Object.freeze({
    contract: Object.freeze({
      commit: "16d70861900ce43070e99e88772c4cf6bbeb90a1",
      document: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/24_A8R_v2_1_周期有效性与主指标相位屏蔽预注册合同.md",
        sha256:
          "85bf3d6e6d6738353569dcf69d9f859639a4c8b116403df74185adc9e964e8bf",
      }),
      machine: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/src/brinkman-multiresolution-contract-v2-1.ts",
        sha256:
          "c629337a7199f6c51a23735ca75432eaa5019b633afcf8fb4f908a6f723c335b",
      }),
    }),
    contractTest: Object.freeze({
      commit: "b09c9be2cbc20b8785b602a36c7feff45d2fc1d8",
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/tests/brinkman-multiresolution-contract-v2-1.test.ts",
      sha256:
        "671afe5954034894f03a030ffb1e3c3642006454042f750b4b2d8888e92b548b",
    }),
    implementationUnlockReview: Object.freeze({
      commit: "f76ea5188ae68b551c5a0c8c69dde63ca6e8c99b",
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/26_A8R_v2_1_网页版Pro合同测试审查与无结果实现解锁裁决.md",
      sha256:
        "e2a400b0fcdc4c4ec86f32c56b03a7ac9fde72a80c21a0cc1c2c844e0141408d",
      acceptedCode:
        "ACCEPT-A8R-V2P1-PRO-CONTRACT-TESTS-RESULT-BLIND",
      unlockCode:
        "UNLOCK-A8R-V2P1-PRO-NO-RESULT-IMPLEMENTATION-ONLY",
      requiredCode:
        "REQUIRE-A8R-V2P1-PRO-SYNTHETIC-FORCE-IDENTITY-CANONICAL-A8Q-ANCHOR-AND-LFS-MATERIALIZATION-GATES",
      lockCode:
        "KEEP-A8R-V2P1-PRO-FORMAL-SMOKE-RESEARCH-AND-DOWNSTREAM-LOCKED",
    }),
  });

export interface Vector2 {
  x: number;
  y: number;
}

export interface FormalPopulationSource {
  readonly nx: number;
  readonly ny: number;
  readonly cells: number;
  checkpoint(): LbmCheckpoint;
}

interface FormalRuntimePopulationArrays {
  distributions: unknown;
}

export interface VerifiedPopulationSnapshot {
  step: number;
  nx: number;
  ny: number;
  distributions: Float64Array;
  checkpointElementwiseEqual: true;
}

export interface ControlVolumeLayout {
  nx: number;
  ny: number;
  cells: number;
  centerX: number;
  centerY: number;
  halfExtentXCells: number;
  halfExtentYCells: number;
  membership: Uint8Array;
  surfaceAndOneLinkHalo: Uint8Array;
  memberCount: number;
  minimumMemberX: number;
  maximumMemberX: number;
  minimumMemberY: number;
  maximumMemberY: number;
}

export interface ControlVolumeSupportAudit {
  memberCount: number;
  surfaceAndOneLinkHaloCount: number;
  nonzeroMaskCellCount: number;
  nonzeroForceCellCount: number;
  maximumSurfaceAndHaloMask: 0;
  everyNonzeroMaskCellInside: true;
  everyNonzeroForceCellInside: true;
}

export interface ForceIdentityGeometry {
  controlVolume: ControlVolumeLayout;
  mask: Float64Array;
  support: ControlVolumeSupportAudit;
}

export interface ComponentAbsoluteLedger {
  prePopulationMomentum: number;
  postPopulationMomentum: number;
  crossingLinkMomentum: number;
  brinkmanForce: number;
  rawTotal: number;
  preFictitiousMomentum: number;
  postFictitiousMomentum: number;
  a2Additional: number;
  a2Total: number;
}

export interface IndependentForceIdentityAudit {
  format: "VP-A8R-V2P1-INDEPENDENT-FORCE-IDENTITY-STEP-v1";
  independentConstructionComplete: true;
  populationLength: number;
  controlVolumeMemberCount: number;
  coefficientScale: number;
  populationMomentum: {
    pre: Vector2;
    post: Vector2;
  };
  outwardLinkMomentum: Vector2;
  rawReactionLattice: Vector2;
  rawReaction: Vector2;
  independentlyRecomputedBrinkmanReaction: Vector2;
  reconstructedNonzeroForceCellCount: number;
  fictitiousFluidCorrectionLattice: Vector2;
  fictitiousFluidCorrection: Vector2;
  correctedA2Load: Vector2;
  absoluteLedger: {
    x: ComponentAbsoluteLedger;
    y: ComponentAbsoluteLedger;
  };
  roundoffBounds: {
    raw: Vector2;
    a2: Vector2;
  };
}

export interface FormalForceValueGetters {
  rawReaction(): Vector2;
  fictitiousFluidCorrection(): Vector2;
  correctedA2Load(): Vector2;
}

export interface FormalForceValues {
  rawReaction: Vector2;
  fictitiousFluidCorrection: Vector2;
  correctedA2Load: Vector2;
}

export interface ForceIdentityComparison {
  independent: IndependentForceIdentityAudit;
  formal: FormalForceValues;
  residuals: {
    raw: Vector2;
    fictitiousFluidCorrection: Vector2;
    correctedA2: Vector2;
  };
  gates: {
    rawX: boolean;
    rawY: boolean;
    fictitiousX: boolean;
    fictitiousY: boolean;
    correctedA2X: boolean;
    correctedA2Y: boolean;
    rawPass: boolean;
    a2Pass: boolean;
    pass: boolean;
  };
}

export interface CycleTraceSample {
  time: number;
  drag: number;
  lift: number;
}

export interface PerCycleMetrics {
  startTime: number;
  endTime: number;
  period: number;
  strouhal: number;
  meanDrag: number;
  meanLift: number;
  rawLiftRms: number;
  fullAnalysisMeanDemeanedLiftRms: number;
}

export interface SixValueSummary {
  minimum: number;
  maximum: number;
  median: number;
}

export interface CompleteCycleResolvedAnalysis {
  complete: true;
  decision: "COMPLETE";
  fullAnalysisMeanLift: number;
  rawCrossingCount: number;
  rawCrossingTimes: number[];
  selectedCrossingTimes: number[];
  periods: number[];
  cycles: PerCycleMetrics[];
  aggregate: {
    meanPeriod: number;
    strouhal: number;
    meanDrag: number;
    meanLift: number;
    rawLiftRms: number;
    fullAnalysisMeanDemeanedLiftRms: number;
  };
  envelopes: {
    period: SixValueSummary;
    strouhal: SixValueSummary;
    meanDrag: SixValueSummary;
    meanLift: SixValueSummary;
    rawLiftRms: SixValueSummary;
    fullAnalysisMeanDemeanedLiftRms: SixValueSummary;
  };
}

export interface IncompleteCycleResolvedAnalysis {
  complete: false;
  decision: string;
  reason: string;
  fullAnalysisMeanLift: number | null;
  rawCrossingCount: number;
  rawCrossingTimes: number[];
  selectedCrossingTimes: number[];
  periods: number[];
}

export type CycleResolvedAnalysis =
  | CompleteCycleResolvedAnalysis
  | IncompleteCycleResolvedAnalysis;

export interface DeterministicEnvelope {
  minimum: number;
  maximum: number;
}

export type CycleTrendState =
  typeof CONTRACT.gates.cycleResolvedTrend.stateCodes[keyof
    typeof CONTRACT.gates.cycleResolvedTrend.stateCodes];

export interface CycleTrendClassification {
  state: CycleTrendState;
  firstIncrement: DeterministicEnvelope;
  secondIncrement: DeterministicEnvelope;
  reason:
    | "same-direction-strictly-shrinking"
    | "opposite-direction"
    | "resolved-nonshrinking"
    | "unresolved-overlap-or-zero";
}

export type D54ComparisonMetric =
  typeof CONTRACT.gates.d54MaskPhaseMargin.comparisonMetrics[number];

export interface D54MetricSeries {
  aggregate: number;
  cycles: readonly number[];
}

export interface D54MaskPhaseTrace {
  id: string;
  phaseId: "baseline" | "minus-half-cell";
  maskHalfThicknessCells: 0.5 | 0.75;
  metrics: Readonly<Record<D54ComparisonMetric, D54MetricSeries>>;
}

export interface D54PairMetricScreen {
  metric: D54ComparisonMetric;
  leftId: string;
  rightId: string;
  aggregateRelativeDifference: number;
  worstCycleCartesianRelativeDifference: number;
  aggregatePass: boolean;
  cyclePass: boolean;
}

export interface D54MaskPhaseScreen {
  traceIds: string[];
  unorderedTracePairCount: 6;
  comparisonsPerTracePairAndMetric: 36;
  pairMetrics: D54PairMetricScreen[];
  baselineA8qAdditionalBounds: {
    rawLiftRmsRelativeDifference: number;
    demeanedLiftRmsRelativeDifference: number;
    threshold: number;
    rawLiftRmsPass: boolean;
    demeanedLiftRmsPass: boolean;
    pass: boolean;
  };
  aggregatePass: boolean;
  cyclePass: boolean;
  pass: boolean;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`A8R v2.1 ${label} must be finite`);
  }
  return value;
}

function canonicalZero(value: number): number {
  return value === 0 ? 0 : value;
}

function positive(value: number, label: string): number {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new RangeError(`A8R v2.1 ${label} must be finite and positive`);
  }
  return value;
}

function integerAtLeast(value: number, minimum: number, label: string): number {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`A8R v2.1 ${label} must be an integer >= ${minimum}`);
  }
  return value;
}

class NeumaierAccumulator {
  private sum = 0;
  private correction = 0;

  add(value: number): void {
    finite(value, "Neumaier term");
    const next = this.sum + value;
    this.correction += Math.abs(this.sum) >= Math.abs(value)
      ? this.sum - next + value
      : value - next + this.sum;
    this.sum = next;
  }

  value(): number {
    return canonicalZero(finite(
      this.sum + this.correction,
      "Neumaier result",
    ));
  }
}

export function neumaierSum(values: ArrayLike<number>): number {
  const accumulator = new NeumaierAccumulator();
  for (let index = 0; index < values.length; index += 1) {
    accumulator.add(values[index] ?? Number.NaN);
  }
  return accumulator.value();
}

export function relativeDifference(
  first: number,
  second: number,
  floor = 1e-12,
): number {
  finite(first, "relative-difference first value");
  finite(second, "relative-difference second value");
  positive(floor, "relative-difference floor");
  return Math.abs(first - second)
    / Math.max(Math.abs(first), Math.abs(second), floor);
}

function equalFloat64(left: Float64Array, right: Float64Array): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (!Object.is(left[index], right[index])) return false;
  }
  return true;
}

/**
 * The runtime array is observed only long enough to compare it with the public
 * checkpoint. Only a detached copy crosses this candidate adapter boundary.
 */
export function copyVerifiedFormalPopulations(
  solver: FormalPopulationSource,
): VerifiedPopulationSnapshot {
  const runtime = solver as unknown as FormalRuntimePopulationArrays;
  const runtimeDistributions = runtime.distributions;
  if (!(runtimeDistributions instanceof Float64Array)
    || runtimeDistributions.length !== 9 * solver.cells) {
    throw new Error("A8R v2.1 formal runtime distributions view is unavailable");
  }
  const checkpoint = solver.checkpoint();
  if (checkpoint.nx !== solver.nx || checkpoint.ny !== solver.ny
    || checkpoint.distributions.length !== runtimeDistributions.length) {
    throw new Error("A8R v2.1 checkpoint population identity is invalid");
  }
  if (!equalFloat64(runtimeDistributions, checkpoint.distributions)) {
    throw new Error(
      "A8R v2.1 runtime distributions differ from the public checkpoint",
    );
  }
  return {
    step: checkpoint.step,
    nx: checkpoint.nx,
    ny: checkpoint.ny,
    distributions: runtimeDistributions.slice(),
    checkpointElementwiseEqual: true,
  };
}

function wrap(index: number, size: number): number {
  const remainder = index % size;
  return remainder < 0 ? remainder + size : remainder;
}

function cellIndex(x: number, y: number, nx: number): number {
  return x + nx * y;
}

export function buildControlVolumeLayout(
  nx: number,
  ny: number,
  centerX: number,
  centerY: number,
  diameterCells: number,
): ControlVolumeLayout {
  integerAtLeast(nx, 8, "control-volume nx");
  integerAtLeast(ny, 8, "control-volume ny");
  positive(diameterCells, "control-volume diameter");
  finite(centerX, "control-volume center x");
  finite(centerY, "control-volume center y");
  const halfExtentXCells = CONTRACT.forceIdentity.controlVolume
    .halfExtentXDiameters * diameterCells;
  const halfExtentYCells = CONTRACT.forceIdentity.controlVolume
    .halfExtentYDiameters * diameterCells;
  const cells = nx * ny;
  const membership = new Uint8Array(cells);
  let memberCount = 0;
  let minimumMemberX = nx;
  let maximumMemberX = -1;
  let minimumMemberY = ny;
  let maximumMemberY = -1;
  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      if (Math.abs(x - centerX) <= halfExtentXCells
        && Math.abs(y - centerY) <= halfExtentYCells) {
        membership[cellIndex(x, y, nx)] = 1;
        memberCount += 1;
        minimumMemberX = Math.min(minimumMemberX, x);
        maximumMemberX = Math.max(maximumMemberX, x);
        minimumMemberY = Math.min(minimumMemberY, y);
        maximumMemberY = Math.max(maximumMemberY, y);
      }
    }
  }
  if (memberCount === 0) {
    throw new RangeError("A8R v2.1 control volume contains no nodes");
  }
  if (minimumMemberX < 1 || maximumMemberX > nx - 2
    || minimumMemberY < 1 || maximumMemberY > ny - 2) {
    throw new RangeError(
      "A8R v2.1 control volume and one-link halo must be interior",
    );
  }
  const surfaceAndOneLinkHalo = new Uint8Array(cells);
  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      const origin = cellIndex(x, y, nx);
      if (membership[origin] !== 1) continue;
      for (let direction = 1; direction < 9; direction += 1) {
        const destinationX = x + (D2Q9_CX[direction] ?? 0);
        const destinationY = y + (D2Q9_CY[direction] ?? 0);
        if (destinationX < 0 || destinationX >= nx
          || destinationY < 0 || destinationY >= ny) {
          throw new RangeError("A8R v2.1 control volume crosses a global seam");
        }
        const destination = cellIndex(destinationX, destinationY, nx);
        if (membership[destination] !== 1) {
          surfaceAndOneLinkHalo[origin] = 1;
          surfaceAndOneLinkHalo[destination] = 1;
        }
      }
    }
  }
  return {
    nx,
    ny,
    cells,
    centerX,
    centerY,
    halfExtentXCells,
    halfExtentYCells,
    membership,
    surfaceAndOneLinkHalo,
    memberCount,
    minimumMemberX,
    maximumMemberX,
    minimumMemberY,
    maximumMemberY,
  };
}

export function analyticCircleMask(
  nx: number,
  ny: number,
  body: LbmBodyKinematics | null,
  maskHalfThickness: number,
): Float64Array {
  integerAtLeast(nx, 8, "mask nx");
  integerAtLeast(ny, 8, "mask ny");
  positive(maskHalfThickness, "mask half thickness");
  const mask = new Float64Array(nx * ny);
  if (body === null) return mask;
  positive(body.radius, "body radius");
  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      const signedDistance = Math.hypot(
        x - body.centerX,
        y - body.centerY,
      ) - body.radius;
      const value = signedDistance <= -maskHalfThickness
        ? 1
        : signedDistance >= maskHalfThickness
          ? 0
          : 0.5 * (
            1 - Math.sin(
              Math.PI * signedDistance / (2 * maskHalfThickness),
            )
          );
      mask[cellIndex(x, y, nx)] = value;
    }
  }
  return mask;
}

export function assertExactMaskEquality(
  independent: Float64Array,
  formal: Float64Array,
): void {
  if (!equalFloat64(independent, formal)) {
    throw new Error(
      "A8R v2.1 independent analytic mask differs from the formal mask",
    );
  }
}

export function assertControlVolumeSupport(
  layout: ControlVolumeLayout,
  mask: Float64Array,
  forceX?: Float64Array,
  forceY?: Float64Array,
): ControlVolumeSupportAudit {
  if (mask.length !== layout.cells
    || (forceX !== undefined && forceX.length !== layout.cells)
    || (forceY !== undefined && forceY.length !== layout.cells)) {
    throw new RangeError("A8R v2.1 control-volume support length mismatch");
  }
  let surfaceAndOneLinkHaloCount = 0;
  let nonzeroMaskCellCount = 0;
  let nonzeroForceCellCount = 0;
  for (let cell = 0; cell < layout.cells; cell += 1) {
    const maskValue = finite(mask[cell] ?? Number.NaN, "mask value");
    if (maskValue < 0 || maskValue > 1) {
      throw new RangeError(`A8R v2.1 mask outside [0,1] at cell ${cell}`);
    }
    const member = layout.membership[cell] === 1;
    if (layout.surfaceAndOneLinkHalo[cell] === 1) {
      surfaceAndOneLinkHaloCount += 1;
      if (!Object.is(maskValue, 0)) {
        throw new Error(
          `A8R v2.1 control surface or halo mask is nonzero at cell ${cell}`,
        );
      }
    }
    if (!Object.is(maskValue, 0)) {
      nonzeroMaskCellCount += 1;
      if (!member) {
        throw new Error(`A8R v2.1 nonzero mask lies outside at cell ${cell}`);
      }
    }
    const xForce = forceX?.[cell] ?? 0;
    const yForce = forceY?.[cell] ?? 0;
    finite(xForce, "Brinkman force x");
    finite(yForce, "Brinkman force y");
    if (!Object.is(xForce, 0) || !Object.is(yForce, 0)) {
      nonzeroForceCellCount += 1;
      if (!member) {
        throw new Error(
          `A8R v2.1 nonzero Brinkman force lies outside at cell ${cell}`,
        );
      }
    }
  }
  return {
    memberCount: layout.memberCount,
    surfaceAndOneLinkHaloCount,
    nonzeroMaskCellCount,
    nonzeroForceCellCount,
    maximumSurfaceAndHaloMask: 0,
    everyNonzeroMaskCellInside: true,
    everyNonzeroForceCellInside: true,
  };
}

export function prepareForceIdentityGeometry(
  nx: number,
  ny: number,
  centerX: number,
  centerY: number,
  diameterCells: number,
  mask: Float64Array,
): ForceIdentityGeometry {
  const controlVolume = buildControlVolumeLayout(
    nx,
    ny,
    centerX,
    centerY,
    diameterCells,
  );
  const frozenMask = mask.slice();
  return {
    controlVolume,
    mask: frozenMask,
    support: assertControlVolumeSupport(controlVolume, frozenMask),
  };
}

export interface ReconstructedCell {
  rho: number;
  populationMomentumX: number;
  populationMomentumY: number;
  velocityX: number;
  velocityY: number;
  brinkmanForceX: number;
  brinkmanForceY: number;
  absolutePopulationMomentumX: number;
  absolutePopulationMomentumY: number;
}

export function reconstructPopulationCell(
  distributions: Float64Array,
  offset: number,
  mask: number,
  penalizationTimeSteps: number,
  solidVelocity: Vector2,
): ReconstructedCell {
  const density = new NeumaierAccumulator();
  const momentumX = new NeumaierAccumulator();
  const momentumY = new NeumaierAccumulator();
  const absoluteMomentumX = new NeumaierAccumulator();
  const absoluteMomentumY = new NeumaierAccumulator();
  for (let direction = 0; direction < 9; direction += 1) {
    const population = finite(
      distributions[offset + direction] ?? Number.NaN,
      "population",
    );
    const cx = D2Q9_CX[direction] ?? 0;
    const cy = D2Q9_CY[direction] ?? 0;
    density.add(population);
    momentumX.add(cx * population);
    momentumY.add(cy * population);
    absoluteMomentumX.add(Math.abs(cx * population));
    absoluteMomentumY.add(Math.abs(cy * population));
  }
  const rho = positive(density.value(), "reconstructed density");
  const populationMomentumX = momentumX.value();
  const populationMomentumY = momentumY.value();
  const penalty = mask / penalizationTimeSteps;
  const denominator = 1 + 0.5 * penalty;
  const velocityX = finite(
    (populationMomentumX / rho + 0.5 * penalty * solidVelocity.x)
      / denominator,
    "reconstructed velocity x",
  );
  const velocityY = finite(
    (populationMomentumY / rho + 0.5 * penalty * solidVelocity.y)
      / denominator,
    "reconstructed velocity y",
  );
  return {
    rho,
    populationMomentumX,
    populationMomentumY,
    velocityX,
    velocityY,
    brinkmanForceX: canonicalZero(finite(
      rho * penalty * (solidVelocity.x - velocityX),
      "recomputed Brinkman force x",
    )),
    brinkmanForceY: canonicalZero(finite(
      rho * penalty * (solidVelocity.y - velocityY),
      "recomputed Brinkman force y",
    )),
    absolutePopulationMomentumX: absoluteMomentumX.value(),
    absolutePopulationMomentumY: absoluteMomentumY.value(),
  };
}

function componentLedger(
  prePopulationMomentum: number,
  postPopulationMomentum: number,
  crossingLinkMomentum: number,
  brinkmanForce: number,
  preFictitiousMomentum: number,
  postFictitiousMomentum: number,
): ComponentAbsoluteLedger {
  const rawTotal = neumaierSum([
    prePopulationMomentum,
    postPopulationMomentum,
    crossingLinkMomentum,
    brinkmanForce,
  ]);
  const a2Additional = neumaierSum([
    preFictitiousMomentum,
    postFictitiousMomentum,
  ]);
  return {
    prePopulationMomentum,
    postPopulationMomentum,
    crossingLinkMomentum,
    brinkmanForce,
    rawTotal,
    preFictitiousMomentum,
    postFictitiousMomentum,
    a2Additional,
    a2Total: neumaierSum([rawTotal, a2Additional]),
  };
}

function boundFromLedger(ledger: number, coefficientScale: number): number {
  return CONTRACT.forceIdentity.absoluteRoundoffLedger.multiplier
    * Number.EPSILON
    * Math.max(ledger / coefficientScale, Number.EPSILON);
}

export function constructIndependentForceIdentityAudit(input: {
  prePopulations: Float64Array;
  postPopulations: Float64Array;
  geometry: ForceIdentityGeometry;
  penalizationTimeSteps: number;
  solidVelocity: Vector2;
  inletVelocity: number;
  diameterCells: number;
}): IndependentForceIdentityAudit {
  const { controlVolume, mask } = input.geometry;
  const expectedLength = 9 * controlVolume.cells;
  if (input.prePopulations.length !== expectedLength
    || input.postPopulations.length !== expectedLength) {
    throw new RangeError("A8R v2.1 population frame length mismatch");
  }
  positive(input.penalizationTimeSteps, "penalization time");
  positive(input.inletVelocity, "inlet velocity");
  positive(input.diameterCells, "diameter");
  const coefficientScale = 0.5
    * input.inletVelocity ** 2
    * input.diameterCells;

  const preMomentumX = new NeumaierAccumulator();
  const preMomentumY = new NeumaierAccumulator();
  const postMomentumX = new NeumaierAccumulator();
  const postMomentumY = new NeumaierAccumulator();
  const forceX = new NeumaierAccumulator();
  const forceY = new NeumaierAccumulator();
  const correctionX = new NeumaierAccumulator();
  const correctionY = new NeumaierAccumulator();
  const absolutePreX = new NeumaierAccumulator();
  const absolutePreY = new NeumaierAccumulator();
  const absolutePostX = new NeumaierAccumulator();
  const absolutePostY = new NeumaierAccumulator();
  const absoluteForceX = new NeumaierAccumulator();
  const absoluteForceY = new NeumaierAccumulator();
  const absoluteFictitiousPreX = new NeumaierAccumulator();
  const absoluteFictitiousPreY = new NeumaierAccumulator();
  const absoluteFictitiousPostX = new NeumaierAccumulator();
  const absoluteFictitiousPostY = new NeumaierAccumulator();
  let reconstructedNonzeroForceCellCount = 0;

  for (let y = 0; y < controlVolume.ny; y += 1) {
    for (let x = 0; x < controlVolume.nx; x += 1) {
      const cell = cellIndex(x, y, controlVolume.nx);
      const offset = 9 * cell;
      const maskValue = mask[cell] ?? Number.NaN;
      const pre = reconstructPopulationCell(
        input.prePopulations,
        offset,
        maskValue,
        input.penalizationTimeSteps,
        input.solidVelocity,
      );
      const post = reconstructPopulationCell(
        input.postPopulations,
        offset,
        maskValue,
        input.penalizationTimeSteps,
        input.solidVelocity,
      );
      if (controlVolume.membership[cell] === 1) {
        preMomentumX.add(pre.populationMomentumX);
        preMomentumY.add(pre.populationMomentumY);
        postMomentumX.add(post.populationMomentumX);
        postMomentumY.add(post.populationMomentumY);
        absolutePreX.add(pre.absolutePopulationMomentumX);
        absolutePreY.add(pre.absolutePopulationMomentumY);
        absolutePostX.add(post.absolutePopulationMomentumX);
        absolutePostY.add(post.absolutePopulationMomentumY);
      }
      if ((!Object.is(pre.brinkmanForceX, 0)
          || !Object.is(pre.brinkmanForceY, 0))
        && controlVolume.membership[cell] !== 1) {
        throw new Error(
          `A8R v2.1 recomputed Brinkman force lies outside at cell ${cell}`,
        );
      }
      if (!Object.is(pre.brinkmanForceX, 0)
        || !Object.is(pre.brinkmanForceY, 0)) {
        reconstructedNonzeroForceCellCount += 1;
      }
      forceX.add(pre.brinkmanForceX);
      forceY.add(pre.brinkmanForceY);
      absoluteForceX.add(Math.abs(pre.brinkmanForceX));
      absoluteForceY.add(Math.abs(pre.brinkmanForceY));
      const preFictitiousX = maskValue * pre.rho * pre.velocityX;
      const preFictitiousY = maskValue * pre.rho * pre.velocityY;
      const postFictitiousX = maskValue * post.rho * post.velocityX;
      const postFictitiousY = maskValue * post.rho * post.velocityY;
      correctionX.add(postFictitiousX - preFictitiousX);
      correctionY.add(postFictitiousY - preFictitiousY);
      absoluteFictitiousPreX.add(Math.abs(preFictitiousX));
      absoluteFictitiousPreY.add(Math.abs(preFictitiousY));
      absoluteFictitiousPostX.add(Math.abs(postFictitiousX));
      absoluteFictitiousPostY.add(Math.abs(postFictitiousY));
    }
  }

  const fluxX = new NeumaierAccumulator();
  const fluxY = new NeumaierAccumulator();
  const absoluteFluxX = new NeumaierAccumulator();
  const absoluteFluxY = new NeumaierAccumulator();
  for (let y = 0; y < controlVolume.ny; y += 1) {
    for (let x = 0; x < controlVolume.nx; x += 1) {
      const origin = cellIndex(x, y, controlVolume.nx);
      const originInside = controlVolume.membership[origin] === 1;
      for (let direction = 1; direction < 9; direction += 1) {
        const destinationX = x + (D2Q9_CX[direction] ?? 0);
        if (destinationX < 0 || destinationX >= controlVolume.nx) continue;
        const destinationY = wrap(
          y + (D2Q9_CY[direction] ?? 0),
          controlVolume.ny,
        );
        const destination = cellIndex(
          destinationX,
          destinationY,
          controlVolume.nx,
        );
        const destinationInside = controlVolume.membership[destination] === 1;
        if (originInside === destinationInside) continue;
        const value = finite(
          input.postPopulations[9 * destination + direction] ?? Number.NaN,
          "crossing destination population",
        );
        const signed = originInside ? 1 : -1;
        const xTerm = (D2Q9_CX[direction] ?? 0) * value;
        const yTerm = (D2Q9_CY[direction] ?? 0) * value;
        fluxX.add(signed * xTerm);
        fluxY.add(signed * yTerm);
        absoluteFluxX.add(Math.abs(xTerm));
        absoluteFluxY.add(Math.abs(yTerm));
      }
    }
  }

  const pre = { x: preMomentumX.value(), y: preMomentumY.value() };
  const post = { x: postMomentumX.value(), y: postMomentumY.value() };
  const flux = { x: fluxX.value(), y: fluxY.value() };
  const rawReactionLattice = {
    x: canonicalZero(finite(
      -(post.x - pre.x + flux.x),
      "raw reaction x",
    )),
    y: canonicalZero(finite(
      -(post.y - pre.y + flux.y),
      "raw reaction y",
    )),
  };
  const correctionLattice = {
    x: correctionX.value(),
    y: correctionY.value(),
  };
  const rawReaction = {
    x: canonicalZero(rawReactionLattice.x / coefficientScale),
    y: canonicalZero(rawReactionLattice.y / coefficientScale),
  };
  const fictitiousFluidCorrection = {
    x: correctionLattice.x / coefficientScale,
    y: correctionLattice.y / coefficientScale,
  };
  const correctedA2Load = {
    x: rawReaction.x + fictitiousFluidCorrection.x,
    y: rawReaction.y + fictitiousFluidCorrection.y,
  };
  const ledgerX = componentLedger(
    absolutePreX.value(),
    absolutePostX.value(),
    absoluteFluxX.value(),
    absoluteForceX.value(),
    absoluteFictitiousPreX.value(),
    absoluteFictitiousPostX.value(),
  );
  const ledgerY = componentLedger(
    absolutePreY.value(),
    absolutePostY.value(),
    absoluteFluxY.value(),
    absoluteForceY.value(),
    absoluteFictitiousPreY.value(),
    absoluteFictitiousPostY.value(),
  );
  return {
    format: "VP-A8R-V2P1-INDEPENDENT-FORCE-IDENTITY-STEP-v1",
    independentConstructionComplete: true,
    populationLength: expectedLength,
    controlVolumeMemberCount: controlVolume.memberCount,
    coefficientScale,
    populationMomentum: { pre, post },
    outwardLinkMomentum: flux,
    rawReactionLattice,
    rawReaction,
    independentlyRecomputedBrinkmanReaction: {
      x: canonicalZero(-forceX.value() / coefficientScale),
      y: canonicalZero(-forceY.value() / coefficientScale),
    },
    reconstructedNonzeroForceCellCount,
    fictitiousFluidCorrectionLattice: correctionLattice,
    fictitiousFluidCorrection,
    correctedA2Load,
    absoluteLedger: { x: ledgerX, y: ledgerY },
    roundoffBounds: {
      raw: {
        x: boundFromLedger(ledgerX.rawTotal, coefficientScale),
        y: boundFromLedger(ledgerY.rawTotal, coefficientScale),
      },
      a2: {
        x: boundFromLedger(ledgerX.a2Total, coefficientScale),
        y: boundFromLedger(ledgerY.a2Total, coefficientScale),
      },
    },
  };
}

export class FormalComparisonReadBarrier {
  private independent: IndependentForceIdentityAudit | null = null;

  get isOpen(): boolean {
    return this.independent !== null;
  }

  completeIndependentConstruction(
    independent: IndependentForceIdentityAudit,
  ): void {
    if (this.independent !== null) {
      throw new Error("A8R v2.1 formal comparison barrier is already open");
    }
    if (independent.independentConstructionComplete !== true) {
      throw new Error("A8R v2.1 independent construction is incomplete");
    }
    assertFiniteTree(independent, "independent-force-audit");
    this.independent = independent;
  }

  read(getters: FormalForceValueGetters): FormalForceValues {
    if (this.independent === null) {
      throw new Error(
        "A8R v2.1 formal comparison values cannot be read before independent construction",
      );
    }
    const formal = {
      rawReaction: getters.rawReaction(),
      fictitiousFluidCorrection: getters.fictitiousFluidCorrection(),
      correctedA2Load: getters.correctedA2Load(),
    };
    assertFiniteTree(formal, "formal-force-values");
    return formal;
  }
}

function difference(first: Vector2, second: Vector2): Vector2 {
  return {
    x: finite(first.x - second.x, "residual x"),
    y: finite(first.y - second.y, "residual y"),
  };
}

export function compareForceIdentity(
  independent: IndependentForceIdentityAudit,
  getters: FormalForceValueGetters,
): ForceIdentityComparison {
  const barrier = new FormalComparisonReadBarrier();
  barrier.completeIndependentConstruction(independent);
  const formal = barrier.read(getters);
  const raw = difference(independent.rawReaction, formal.rawReaction);
  const fictitious = difference(
    independent.fictitiousFluidCorrection,
    formal.fictitiousFluidCorrection,
  );
  const corrected = difference(
    independent.correctedA2Load,
    formal.correctedA2Load,
  );
  const rawX = Math.abs(raw.x) <= independent.roundoffBounds.raw.x;
  const rawY = Math.abs(raw.y) <= independent.roundoffBounds.raw.y;
  const fictitiousX = Math.abs(fictitious.x)
    <= independent.roundoffBounds.a2.x;
  const fictitiousY = Math.abs(fictitious.y)
    <= independent.roundoffBounds.a2.y;
  const correctedA2X = Math.abs(corrected.x)
    <= independent.roundoffBounds.a2.x;
  const correctedA2Y = Math.abs(corrected.y)
    <= independent.roundoffBounds.a2.y;
  const rawPass = rawX && rawY;
  const a2Pass = fictitiousX && fictitiousY && correctedA2X && correctedA2Y;
  return {
    independent,
    formal,
    residuals: {
      raw,
      fictitiousFluidCorrection: fictitious,
      correctedA2: corrected,
    },
    gates: {
      rawX,
      rawY,
      fictitiousX,
      fictitiousY,
      correctedA2X,
      correctedA2Y,
      rawPass,
      a2Pass,
      pass: rawPass && a2Pass,
    },
  };
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    throw new RangeError("A8R v2.1 mean requires at least one value");
  }
  return neumaierSum(values) / values.length;
}

function interpolate(
  samples: readonly CycleTraceSample[],
  target: number,
  key: "drag" | "lift",
): number {
  for (let index = 0; index + 1 < samples.length; index += 1) {
    const left = samples[index];
    const right = samples[index + 1];
    if (left === undefined || right === undefined) {
      throw new Error("A8R v2.1 missing interpolation sample");
    }
    if (target < left.time || target > right.time) continue;
    if (target === left.time) return left[key];
    if (target === right.time) return right[key];
    const fraction = (target - left.time) / (right.time - left.time);
    return left[key] + fraction * (right[key] - left[key]);
  }
  throw new RangeError(`A8R v2.1 target ${target} is not bracketed`);
}

function integrateTransformed(
  samples: readonly CycleTraceSample[],
  start: number,
  end: number,
  key: "drag" | "lift",
  transform: (value: number) => number,
): number {
  const knots = [
    start,
    ...samples
      .map((sample) => sample.time)
      .filter((time) => time > start && time < end),
    end,
  ];
  const accumulator = new NeumaierAccumulator();
  for (let index = 0; index + 1 < knots.length; index += 1) {
    const leftTime = knots[index];
    const rightTime = knots[index + 1];
    if (leftTime === undefined || rightTime === undefined) {
      throw new Error("A8R v2.1 missing integration knot");
    }
    const left = transform(interpolate(samples, leftTime, key));
    const right = transform(interpolate(samples, rightTime, key));
    accumulator.add((rightTime - leftTime) * (left + right) / 2);
  }
  return accumulator.value();
}

export function sixValueSummary(values: readonly number[]): SixValueSummary {
  if (values.length !== 6 || !values.every(Number.isFinite)) {
    throw new RangeError("A8R v2.1 six-value summary requires six finite values");
  }
  const ordered = [...values].sort((left, right) => left - right);
  const lower = ordered[2];
  const upper = ordered[3];
  const minimum = ordered[0];
  const maximum = ordered[5];
  if (lower === undefined || upper === undefined
    || minimum === undefined || maximum === undefined) {
    throw new Error("A8R v2.1 incomplete six-value order statistics");
  }
  return {
    minimum,
    maximum,
    median: (lower + upper) / 2,
  };
}

function incompleteCycle(
  reason: string,
  fullAnalysisMeanLift: number | null,
  rawCrossingTimes: number[],
  selectedCrossingTimes: number[] = [],
  periods: number[] = [],
): IncompleteCycleResolvedAnalysis {
  return {
    complete: false,
    decision: CONTRACT.decision.inconclusiveCode,
    reason,
    fullAnalysisMeanLift,
    rawCrossingCount: rawCrossingTimes.length,
    rawCrossingTimes,
    selectedCrossingTimes,
    periods,
  };
}

export function analyzeCycleResolvedTrace(
  samples: readonly CycleTraceSample[],
): CycleResolvedAnalysis {
  if (samples.length < 2) {
    return incompleteCycle("fewer-than-two-analysis-samples", null, []);
  }
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    if (sample === undefined
      || !Number.isFinite(sample.time)
      || !Number.isFinite(sample.drag)
      || !Number.isFinite(sample.lift)
      || (index > 0 && sample.time <= (samples[index - 1]?.time ?? Infinity))) {
      return incompleteCycle("nonfinite-or-nonincreasing-analysis-trace", null, []);
    }
  }
  const fullAnalysisMeanLift = mean(samples.map((sample) => sample.lift));
  const rawCrossingTimes: number[] = [];
  for (let index = 0; index + 1 < samples.length; index += 1) {
    const left = samples[index];
    const right = samples[index + 1];
    if (left === undefined || right === undefined) continue;
    const leftDemeaned = left.lift - fullAnalysisMeanLift;
    const rightDemeaned = right.lift - fullAnalysisMeanLift;
    if (leftDemeaned <= 0 && rightDemeaned > 0) {
      const slope = rightDemeaned - leftDemeaned;
      if (!(slope > 0)) {
        return incompleteCycle(
          "nonpositive-crossing-slope",
          fullAnalysisMeanLift,
          rawCrossingTimes,
        );
      }
      const crossing = left.time
        - leftDemeaned * (right.time - left.time) / slope;
      if (!Number.isFinite(crossing)
        || crossing <= (rawCrossingTimes.at(-1) ?? Number.NEGATIVE_INFINITY)) {
        return incompleteCycle(
          "duplicate-or-nonincreasing-raw-crossing",
          fullAnalysisMeanLift,
          rawCrossingTimes,
        );
      }
      rawCrossingTimes.push(crossing);
    }
  }
  const retained = CONTRACT.windows.cycleResolved.retainedLatestCrossings;
  if (rawCrossingTimes.length < retained) {
    return incompleteCycle(
      "fewer-than-seven-raw-positive-slope-crossings",
      fullAnalysisMeanLift,
      rawCrossingTimes,
    );
  }
  const selectedCrossingTimes = rawCrossingTimes.slice(-retained);
  const periods = selectedCrossingTimes.slice(1).map((time, index) =>
    time - (selectedCrossingTimes[index] ?? Number.NaN));
  const plausibility = CONTRACT.windows.cycleResolved.crossingPlausibility;
  if (!periods.every((period) =>
    Number.isFinite(period)
    && period >= plausibility.periodMinimumInclusive
    && period <= plausibility.periodMaximumInclusive)) {
    return incompleteCycle(
      "latest-six-crossing-periods-outside-frozen-band",
      fullAnalysisMeanLift,
      rawCrossingTimes,
      selectedCrossingTimes,
      periods,
    );
  }
  const cycles: PerCycleMetrics[] = [];
  for (let index = 0; index < periods.length; index += 1) {
    const startTime = selectedCrossingTimes[index];
    const endTime = selectedCrossingTimes[index + 1];
    const period = periods[index];
    if (startTime === undefined || endTime === undefined || period === undefined) {
      throw new Error("A8R v2.1 missing selected cycle boundary");
    }
    const dragIntegral = integrateTransformed(
      samples,
      startTime,
      endTime,
      "drag",
      (value) => value,
    );
    const liftIntegral = integrateTransformed(
      samples,
      startTime,
      endTime,
      "lift",
      (value) => value,
    );
    const rawLiftSquareIntegral = integrateTransformed(
      samples,
      startTime,
      endTime,
      "lift",
      (value) => value * value,
    );
    const demeanedLiftSquareIntegral = integrateTransformed(
      samples,
      startTime,
      endTime,
      "lift",
      (value) => (value - fullAnalysisMeanLift) ** 2,
    );
    cycles.push({
      startTime,
      endTime,
      period,
      strouhal: 1 / period,
      meanDrag: dragIntegral / period,
      meanLift: liftIntegral / period,
      rawLiftRms: Math.sqrt(rawLiftSquareIntegral / period),
      fullAnalysisMeanDemeanedLiftRms:
        Math.sqrt(demeanedLiftSquareIntegral / period),
    });
  }
  const totalDuration = neumaierSum(periods);
  const durationWeighted = (
    selector: (cycle: PerCycleMetrics) => number,
  ): number => neumaierSum(cycles.map((cycle) =>
    selector(cycle) * cycle.period)) / totalDuration;
  const durationWeightedRms = (
    selector: (cycle: PerCycleMetrics) => number,
  ): number => Math.sqrt(neumaierSum(cycles.map((cycle) =>
    selector(cycle) ** 2 * cycle.period)) / totalDuration);
  const meanPeriod = mean(periods);
  return {
    complete: true,
    decision: "COMPLETE",
    fullAnalysisMeanLift,
    rawCrossingCount: rawCrossingTimes.length,
    rawCrossingTimes,
    selectedCrossingTimes,
    periods,
    cycles,
    aggregate: {
      meanPeriod,
      strouhal: 1 / meanPeriod,
      meanDrag: durationWeighted((cycle) => cycle.meanDrag),
      meanLift: durationWeighted((cycle) => cycle.meanLift),
      rawLiftRms: durationWeightedRms((cycle) => cycle.rawLiftRms),
      fullAnalysisMeanDemeanedLiftRms: durationWeightedRms(
        (cycle) => cycle.fullAnalysisMeanDemeanedLiftRms,
      ),
    },
    envelopes: {
      period: sixValueSummary(cycles.map((cycle) => cycle.period)),
      strouhal: sixValueSummary(cycles.map((cycle) => cycle.strouhal)),
      meanDrag: sixValueSummary(cycles.map((cycle) => cycle.meanDrag)),
      meanLift: sixValueSummary(cycles.map((cycle) => cycle.meanLift)),
      rawLiftRms: sixValueSummary(cycles.map((cycle) => cycle.rawLiftRms)),
      fullAnalysisMeanDemeanedLiftRms: sixValueSummary(cycles.map((cycle) =>
        cycle.fullAnalysisMeanDemeanedLiftRms)),
    },
  };
}

function minkowskiDifference(
  minuend: DeterministicEnvelope,
  subtrahend: DeterministicEnvelope,
): DeterministicEnvelope {
  return {
    minimum: minuend.minimum - subtrahend.maximum,
    maximum: minuend.maximum - subtrahend.minimum,
  };
}

function intervalSide(interval: DeterministicEnvelope): -1 | 0 | 1 {
  if (interval.minimum > 0) return 1;
  if (interval.maximum < 0) return -1;
  return 0;
}

function absoluteBounds(interval: DeterministicEnvelope): DeterministicEnvelope {
  return {
    minimum: Math.min(Math.abs(interval.minimum), Math.abs(interval.maximum)),
    maximum: Math.max(Math.abs(interval.minimum), Math.abs(interval.maximum)),
  };
}

export function classifyCycleTrend(
  coarse: DeterministicEnvelope,
  middle: DeterministicEnvelope,
  fine: DeterministicEnvelope,
): CycleTrendClassification {
  const states = CONTRACT.gates.cycleResolvedTrend.stateCodes;
  const firstIncrement = minkowskiDifference(middle, coarse);
  const secondIncrement = minkowskiDifference(fine, middle);
  const firstSide = intervalSide(firstIncrement);
  const secondSide = intervalSide(secondIncrement);
  if (firstSide === 0 || secondSide === 0) {
    return {
      state: states.inconclusive,
      firstIncrement,
      secondIncrement,
      reason: "unresolved-overlap-or-zero",
    };
  }
  if (firstSide !== secondSide) {
    return {
      state: states.noGo,
      firstIncrement,
      secondIncrement,
      reason: "opposite-direction",
    };
  }
  const firstAbsolute = absoluteBounds(firstIncrement);
  const secondAbsolute = absoluteBounds(secondIncrement);
  if (secondAbsolute.maximum < firstAbsolute.minimum) {
    return {
      state: states.pass,
      firstIncrement,
      secondIncrement,
      reason: "same-direction-strictly-shrinking",
    };
  }
  if (secondAbsolute.minimum >= firstAbsolute.maximum) {
    return {
      state: states.noGo,
      firstIncrement,
      secondIncrement,
      reason: "resolved-nonshrinking",
    };
  }
  return {
    state: states.inconclusive,
    firstIncrement,
    secondIncrement,
    reason: "unresolved-overlap-or-zero",
  };
}

function orderedD54Traces(
  traces: readonly D54MaskPhaseTrace[],
): D54MaskPhaseTrace[] {
  if (traces.length !== 4) {
    throw new RangeError("A8R v2.1 D54 screen requires four traces");
  }
  const phaseOrder = new Map<string, number>([
    ["baseline", 0],
    ["minus-half-cell", 1],
  ]);
  const ordered = [...traces].sort((left, right) =>
    (phaseOrder.get(left.phaseId) ?? 99)
      - (phaseOrder.get(right.phaseId) ?? 99)
    || left.maskHalfThicknessCells - right.maskHalfThicknessCells);
  const identities = new Set(ordered.map((trace) =>
    `${trace.phaseId}:${trace.maskHalfThicknessCells}`));
  if (identities.size !== 4) {
    throw new Error("A8R v2.1 D54 mask-phase identities must be unique");
  }
  for (const trace of ordered) {
    for (const metric of CONTRACT.gates.d54MaskPhaseMargin.comparisonMetrics) {
      const series = trace.metrics[metric];
      if (series === undefined || !Number.isFinite(series.aggregate)
        || series.cycles.length !== 6
        || !series.cycles.every(Number.isFinite)) {
        throw new Error(`A8R v2.1 incomplete D54 series ${trace.id} ${metric}`);
      }
    }
  }
  return ordered;
}

function findD54Trace(
  traces: readonly D54MaskPhaseTrace[],
  phaseId: D54MaskPhaseTrace["phaseId"],
  maskHalfThicknessCells: D54MaskPhaseTrace["maskHalfThicknessCells"],
): D54MaskPhaseTrace {
  const trace = traces.find((entry) =>
    entry.phaseId === phaseId
    && entry.maskHalfThicknessCells === maskHalfThicknessCells);
  if (trace === undefined) {
    throw new Error(`A8R v2.1 missing D54 trace ${phaseId}/${maskHalfThicknessCells}`);
  }
  return trace;
}

function d54MetricSeries(
  trace: D54MaskPhaseTrace,
  metric: D54ComparisonMetric,
): D54MetricSeries {
  const series = trace.metrics[metric];
  if (series === undefined) {
    throw new Error(`A8R v2.1 missing D54 metric ${trace.id} ${metric}`);
  }
  return series;
}

export function screenD54MaskPhase(
  traces: readonly D54MaskPhaseTrace[],
): D54MaskPhaseScreen {
  const ordered = orderedD54Traces(traces);
  const gate = CONTRACT.gates.d54MaskPhaseMargin;
  const pairMetrics: D54PairMetricScreen[] = [];
  for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1;
      rightIndex < ordered.length;
      rightIndex += 1) {
      const left = ordered[leftIndex];
      const right = ordered[rightIndex];
      if (left === undefined || right === undefined) {
        throw new Error("A8R v2.1 missing D54 unordered pair");
      }
      for (const metric of gate.comparisonMetrics) {
        const leftSeries = d54MetricSeries(left, metric);
        const rightSeries = d54MetricSeries(right, metric);
        const cycleDifferences = leftSeries.cycles.flatMap((leftValue) =>
          rightSeries.cycles.map((rightValue) =>
            relativeDifference(leftValue, rightValue)));
        const aggregateRelativeDifference = relativeDifference(
          leftSeries.aggregate,
          rightSeries.aggregate,
        );
        const worstCycleCartesianRelativeDifference = Math.max(
          ...cycleDifferences,
        );
        pairMetrics.push({
          metric,
          leftId: left.id,
          rightId: right.id,
          aggregateRelativeDifference,
          worstCycleCartesianRelativeDifference,
          aggregatePass: aggregateRelativeDifference
            < gate.maximumAggregateDifferenceAcrossAllSixUnorderedTracePairs,
          cyclePass: worstCycleCartesianRelativeDifference
            < gate.maximumWorstCycleResolvedDifferenceAcrossFourCombinations,
        });
      }
    }
  }
  const baseline050 = findD54Trace(ordered, "baseline", 0.5);
  const baseline075 = findD54Trace(ordered, "baseline", 0.75);
  const rawMetric = "six-cycle-aggregate-raw-lift-rms";
  const demeanedMetric =
    "six-cycle-aggregate-full-analysis-mean-demeaned-lift-rms";
  const baseline050Raw = d54MetricSeries(baseline050, rawMetric);
  const baseline075Raw = d54MetricSeries(baseline075, rawMetric);
  const baseline050Demeaned = d54MetricSeries(baseline050, demeanedMetric);
  const baseline075Demeaned = d54MetricSeries(baseline075, demeanedMetric);
  const rawLiftRmsRelativeDifference = relativeDifference(
    baseline050Raw.aggregate,
    baseline075Raw.aggregate,
  );
  const demeanedLiftRmsRelativeDifference = relativeDifference(
    baseline050Demeaned.aggregate,
    baseline075Demeaned.aggregate,
  );
  const threshold = gate.frozenA8qRawLiftRmsRelativeDifference;
  const rawLiftRmsPass = rawLiftRmsRelativeDifference < threshold;
  const demeanedLiftRmsPass = demeanedLiftRmsRelativeDifference < threshold;
  const aggregatePass = pairMetrics.every((entry) => entry.aggregatePass);
  const cyclePass = pairMetrics.every((entry) => entry.cyclePass);
  return {
    traceIds: ordered.map((trace) => trace.id),
    unorderedTracePairCount: 6,
    comparisonsPerTracePairAndMetric: 36,
    pairMetrics,
    baselineA8qAdditionalBounds: {
      rawLiftRmsRelativeDifference,
      demeanedLiftRmsRelativeDifference,
      threshold,
      rawLiftRmsPass,
      demeanedLiftRmsPass,
      pass: rawLiftRmsPass && demeanedLiftRmsPass,
    },
    aggregatePass,
    cyclePass,
    pass: aggregatePass
      && cyclePass
      && rawLiftRmsPass
      && demeanedLiftRmsPass,
  };
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`A8R v2.1 ${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function projectedTrace(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new TypeError("A8R v2.1 anchor trace must be an array");
  }
  return value.map((entry) => {
    const record = objectRecord(entry, "anchor trace record");
    return {
      step: record.step,
      convectiveTime: record.convectiveTime,
      rawReaction: record.rawReaction,
      fictitiousFluidCorrection: record.fictitiousFluidCorrection,
      correctedLoad: record.correctedLoad,
      coreDensityWeight: record.coreDensityWeight,
      coreSlipSquaredNumerator: record.coreSlipSquaredNumerator,
      coreSlipRms: record.coreSlipRms,
      coreSlipMaximum: record.coreSlipMaximum,
      transitionDensityWeight: record.transitionDensityWeight,
      transitionSlipSquaredNumerator: record.transitionSlipSquaredNumerator,
      transitionSlipRms: record.transitionSlipRms,
      transitionSlipMaximum: record.transitionSlipMaximum,
    };
  });
}

export function projectA8qCommonRun(value: unknown): Record<string, unknown> {
  const run = objectRecord(value, "A8Q common run");
  return {
    numericalIdentity: run.numericalIdentity,
    body: run.body,
    geometry: run.geometry,
    window: run.window,
    completedSteps: run.completedSteps,
    trace: projectedTrace(run.trace),
    extrema: run.extrema,
    forceDecomposition: run.forceDecomposition,
    slip: run.slip,
    metrics: run.metrics,
    maturity: run.maturity,
    literature: run.literature,
    recomposition: run.recomposition,
    gates: run.a8qGates ?? run.gates,
  };
}

function canonicalRoundTrip(value: unknown): unknown {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error("A8R v2.1 value is not JSON serializable");
  }
  return JSON.parse(serialized) as unknown;
}

function collectMismatches(
  left: unknown,
  right: unknown,
  path: string,
  mismatches: string[],
): void {
  if (typeof left === "number" && typeof right === "number") {
    if (left !== right) mismatches.push(path);
    return;
  }
  if (left === null || right === null
    || typeof left !== "object" || typeof right !== "object") {
    if (left !== right) mismatches.push(path);
    return;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)
      || left.length !== right.length) {
      mismatches.push(path);
      return;
    }
    for (let index = 0; index < left.length; index += 1) {
      collectMismatches(left[index], right[index], `${path}[${index}]`, mismatches);
    }
    return;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = [...new Set([
    ...Object.keys(leftRecord),
    ...Object.keys(rightRecord),
  ])].sort();
  for (const key of keys) {
    if (!Object.hasOwn(leftRecord, key) || !Object.hasOwn(rightRecord, key)) {
      mismatches.push(`${path}.${key}`);
    } else {
      collectMismatches(
        leftRecord[key],
        rightRecord[key],
        `${path}.${key}`,
        mismatches,
      );
    }
  }
}

export function compareD24A8qCommonProjection(
  a8qRun: unknown,
  a8rRun: unknown,
): { pass: boolean; numericTolerance: 0; mismatchPaths: string[] } {
  const left = canonicalRoundTrip(projectA8qCommonRun(a8qRun));
  const right = canonicalRoundTrip(projectA8qCommonRun(a8rRun));
  const mismatchPaths: string[] = [];
  collectMismatches(left, right, "$", mismatchPaths);
  return {
    pass: mismatchPaths.length === 0,
    numericTolerance: 0,
    mismatchPaths,
  };
}

export function assertFiniteTree(value: unknown, path = "record"): void {
  if (typeof value === "number") {
    finite(value, path);
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertFiniteTree(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    assertFiniteTree(entry, `${path}.${key}`);
  }
}
