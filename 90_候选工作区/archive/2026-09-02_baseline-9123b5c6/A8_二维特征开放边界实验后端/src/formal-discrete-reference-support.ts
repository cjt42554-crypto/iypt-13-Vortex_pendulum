import type { LbmCheckpoint } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { FORMAL_DISCRETE_REFERENCE_CONTRACT as CONTRACT } from
  "./formal-discrete-reference-contract.ts";
import type { FieldCapture, LoadSample } from
  "./formal-causal-reference-support.ts";

export interface SummationResult {
  value: number;
  absoluteSum: number;
  errorBound: number;
}

export interface PopulationMethodAudit {
  pre: SummationResult;
  formalPost: SummationResult;
  candidatePost: SummationResult;
  adapter: SummationResult;
  actualMassChange: number;
  budgetMassChange: number;
  closureResidual: number;
  combinedErrorBound: number;
  closureWithinScaledBound: boolean;
}

export interface PopulationAuditRecord {
  step: number;
  phase: "discrete-reference" | "maturity";
  populationCount: number;
  ordered: PopulationMethodAudit;
  pairwise: PopulationMethodAudit;
  neumaier: PopulationMethodAudit;
  adapterByDirection: number[];
  adapterAbsoluteByDirection: number[];
  nonIncomingAbsoluteModification: number;
}

export interface PopulationAuditSummary {
  scheduledAuditCount: number;
  recordedAuditCount: number;
  cumulativeAdapterByDirection: number[];
  cumulativeAdapterAbsoluteByDirection: number[];
  cumulativeNonIncomingAbsoluteModification: number;
  maximumOrderedAbsoluteClosureResidual: number;
  maximumPairwiseAbsoluteClosureResidual: number;
  maximumNeumaierAbsoluteClosureResidual: number;
  maximumNeumaierScaledBoundRatio: number;
  gates: {
    scheduledAuditsComplete: boolean;
    allValuesFinite: boolean;
    compensatedClosureWithinScaledBound: boolean;
    nonIncomingModificationPass: boolean;
    pass: boolean;
  };
}

export interface RegionLayout {
  nx: number;
  ny: number;
  bodyCenterX: number;
  bodyCenterY: number;
  cells: number[];
  relativeXCells: number[];
  relativeYCells: number[];
  mirrorOrdinals: number[];
}

export interface RegionFieldSample {
  step: number;
  leftGraphDistance: number;
  rightGraphDistance: number;
  transverseSeamGraphDistance: number;
  strictConePass: boolean;
  rho: number[];
  ux: number[];
  uy: number[];
  fieldDigestFnv1a32: string;
  rawReactionX: number;
  rawReactionY: number;
}

export interface WindowFieldSummary {
  sampleCount: number;
  relativeXCells: number[];
  relativeYCells: number[];
  mirrorOrdinals: number[];
  meanRho: number[];
  meanUx: number[];
  meanUy: number[];
  densityFluctuationRms: number[];
  velocityFluctuationRms: number[];
  mirrorDefectRms: number;
  digestFnv1a32: string;
}

export interface LoadWindowSummary {
  sampleCount: number;
  meanDrag: number;
  meanLift: number;
  dragRms: number;
  liftRms: number;
  dragFluctuationRms: number;
  liftFluctuationRms: number;
  dominantStrouhal: number;
  normalizedSpectralAmplitude: number;
  coveredCycles: number;
  detectable: boolean;
}

export interface MirroredFieldComparison {
  sampleCount: number;
  meanDensityRmsDifference: number;
  meanVelocityRmsDifferenceOverInletVelocity: number;
  fluctuationRmsRelativeDifference: number;
}

interface MutableWindowField {
  layout: RegionLayout;
  sampleCount: number;
  sumRho: Float64Array;
  sumUx: Float64Array;
  sumUy: Float64Array;
  sumRhoSquared: Float64Array;
  sumUxSquared: Float64Array;
  sumUySquared: Float64Array;
  mirrorDefectSquareSum: number;
  mirrorDefectObservationCount: number;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError("A8P non-finite " + label);
  }
  return value;
}

function finiteArray(values: readonly number[], label: string): void {
  if (!values.every(Number.isFinite)) {
    throw new RangeError("A8P non-finite " + label);
  }
}

function orderedValue(values: ArrayLike<number>): number {
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index] ?? Number.NaN;
  }
  return finite(sum, "ordered sum");
}

function neumaierValue(values: ArrayLike<number>): number {
  let sum = 0;
  let correction = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? Number.NaN;
    const next = sum + value;
    correction += Math.abs(sum) >= Math.abs(value)
      ? sum - next + value
      : value - next + sum;
    sum = next;
  }
  return finite(sum + correction, "Neumaier sum");
}

function pairwiseValue(values: ArrayLike<number>): number {
  const occupied: boolean[] = [];
  const partials: number[] = [];
  for (let index = 0; index < values.length; index += 1) {
    let partial = values[index] ?? Number.NaN;
    let level = 0;
    while (occupied[level] === true) {
      partial = (partials[level] ?? Number.NaN) + partial;
      occupied[level] = false;
      level += 1;
    }
    partials[level] = partial;
    occupied[level] = true;
  }
  let result = 0;
  for (let level = partials.length - 1; level >= 0; level -= 1) {
    if (occupied[level] === true) result += partials[level] ?? Number.NaN;
  }
  return finite(result, "pairwise sum");
}

function absoluteSum(values: ArrayLike<number>): number {
  let sum = 0;
  let correction = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = Math.abs(values[index] ?? Number.NaN);
    const next = sum + value;
    correction += Math.abs(sum) >= value
      ? sum - next + value
      : value - next + sum;
    sum = next;
  }
  return finite(sum + correction, "absolute population sum");
}

function gamma(operations: number): number {
  const product = operations * Number.EPSILON;
  if (!(product < 1)) {
    throw new RangeError("A8P summation gamma is undefined");
  }
  return product / (1 - product);
}

function summarizeSum(
  method: "ordered" | "pairwise" | "neumaier",
  values: ArrayLike<number>,
): SummationResult {
  const scale = absoluteSum(values);
  const orderedOperations = Math.max(0, values.length - 1);
  const pairwiseOperations = Math.ceil(Math.log2(Math.max(1, values.length)));
  const value = method === "ordered"
    ? orderedValue(values)
    : method === "pairwise"
      ? pairwiseValue(values)
      : neumaierValue(values);
  const errorBound = (
    method === "pairwise"
      ? gamma(pairwiseOperations)
      : gamma(orderedOperations)
  ) * scale;
  return {
    value,
    absoluteSum: scale,
    errorBound: finite(errorBound, method + " error bound"),
  };
}

function methodAudit(
  method: "ordered" | "pairwise" | "neumaier",
  pre: Float64Array,
  formalPost: Float64Array,
  candidatePost: Float64Array,
  adapter: Float64Array,
): PopulationMethodAudit {
  const preSum = summarizeSum(method, pre);
  const formalSum = summarizeSum(method, formalPost);
  const candidateSum = summarizeSum(method, candidatePost);
  const adapterSum = summarizeSum(method, adapter);
  const actualMassChange = candidateSum.value - preSum.value;
  const budgetMassChange = formalSum.value - preSum.value + adapterSum.value;
  const closureResidual = actualMassChange - budgetMassChange;
  const rawBound = preSum.errorBound
    + formalSum.errorBound
    + candidateSum.errorBound
    + adapterSum.errorBound;
  const combinedErrorBound =
    CONTRACT.populationLedger.errorBound.compensatedGateMultiplier * rawBound;
  return {
    pre: preSum,
    formalPost: formalSum,
    candidatePost: candidateSum,
    adapter: adapterSum,
    actualMassChange: finite(actualMassChange, method + " actual mass change"),
    budgetMassChange: finite(budgetMassChange, method + " budget mass change"),
    closureResidual: finite(closureResidual, method + " closure residual"),
    combinedErrorBound: finite(combinedErrorBound, method + " combined bound"),
    closureWithinScaledBound:
      Math.abs(closureResidual) <= combinedErrorBound,
  };
}

export function buildPopulationAuditRecord(
  step: number,
  phase: PopulationAuditRecord["phase"],
  preCheckpoint: LbmCheckpoint,
  formalCheckpoint: LbmCheckpoint,
  candidateCheckpoint: LbmCheckpoint,
): PopulationAuditRecord {
  const pre = preCheckpoint.distributions;
  const formalPost = formalCheckpoint.distributions;
  const candidatePost = candidateCheckpoint.distributions;
  if (pre.length !== formalPost.length || pre.length !== candidatePost.length) {
    throw new RangeError("A8P population audit length mismatch");
  }
  const adapter = new Float64Array(pre.length);
  const adapterByDirection = Array<number>(9).fill(0);
  const adapterAbsoluteByDirection = Array<number>(9).fill(0);
  for (let index = 0; index < adapter.length; index += 1) {
    const delta = (candidatePost[index] ?? Number.NaN)
      - (formalPost[index] ?? Number.NaN);
    adapter[index] = finite(delta, "adapter delta");
    const direction = index % 9;
    adapterByDirection[direction] =
      (adapterByDirection[direction] ?? 0) + delta;
    adapterAbsoluteByDirection[direction] =
      (adapterAbsoluteByDirection[direction] ?? 0) + Math.abs(delta);
  }
  finiteArray(adapterByDirection, "adapter direction sums");
  finiteArray(adapterAbsoluteByDirection, "adapter absolute direction sums");
  const nonIncoming = [0, 2, 3, 4, 6, 7];
  let nonIncomingAbsoluteModification = 0;
  for (const direction of nonIncoming) {
    nonIncomingAbsoluteModification +=
      adapterAbsoluteByDirection[direction] ?? Number.NaN;
  }
  return {
    step,
    phase,
    populationCount: pre.length,
    ordered: methodAudit("ordered", pre, formalPost, candidatePost, adapter),
    pairwise: methodAudit("pairwise", pre, formalPost, candidatePost, adapter),
    neumaier: methodAudit("neumaier", pre, formalPost, candidatePost, adapter),
    adapterByDirection,
    adapterAbsoluteByDirection,
    nonIncomingAbsoluteModification: finite(
      nonIncomingAbsoluteModification,
      "nonincoming absolute modification",
    ),
  };
}

export function isPopulationAuditStep(
  step: number,
  runSteps: number,
  stride: number,
): boolean {
  return step === 1 || step === runSteps || step % stride === 0;
}

export function scheduledPopulationAuditCount(
  runSteps: number,
  stride: number,
): number {
  let count = 0;
  for (let step = 1; step <= runSteps; step += 1) {
    if (isPopulationAuditStep(step, runSteps, stride)) count += 1;
  }
  return count;
}

export function summarizePopulationAudits(
  records: readonly PopulationAuditRecord[],
  runSteps: number,
  stride: number,
): PopulationAuditSummary {
  const scheduledAuditCount = scheduledPopulationAuditCount(runSteps, stride);
  const cumulativeAdapterByDirection = Array<number>(9).fill(0);
  const cumulativeAdapterAbsoluteByDirection = Array<number>(9).fill(0);
  let maximumOrderedAbsoluteClosureResidual = 0;
  let maximumPairwiseAbsoluteClosureResidual = 0;
  let maximumNeumaierAbsoluteClosureResidual = 0;
  let maximumNeumaierScaledBoundRatio = 0;
  let allValuesFinite = true;
  let compensatedClosureWithinScaledBound = true;
  for (const record of records) {
    maximumOrderedAbsoluteClosureResidual = Math.max(
      maximumOrderedAbsoluteClosureResidual,
      Math.abs(record.ordered.closureResidual),
    );
    maximumPairwiseAbsoluteClosureResidual = Math.max(
      maximumPairwiseAbsoluteClosureResidual,
      Math.abs(record.pairwise.closureResidual),
    );
    maximumNeumaierAbsoluteClosureResidual = Math.max(
      maximumNeumaierAbsoluteClosureResidual,
      Math.abs(record.neumaier.closureResidual),
    );
    const boundRatio = record.neumaier.combinedErrorBound === 0
      ? record.neumaier.closureResidual === 0 ? 0 : Number.POSITIVE_INFINITY
      : Math.abs(record.neumaier.closureResidual)
        / record.neumaier.combinedErrorBound;
    maximumNeumaierScaledBoundRatio = Math.max(
      maximumNeumaierScaledBoundRatio,
      boundRatio,
    );
    compensatedClosureWithinScaledBound &&=
      record.neumaier.closureWithinScaledBound;
    for (let direction = 0; direction < 9; direction += 1) {
      cumulativeAdapterByDirection[direction] =
        (cumulativeAdapterByDirection[direction] ?? 0)
        + (record.adapterByDirection[direction] ?? Number.NaN);
      cumulativeAdapterAbsoluteByDirection[direction] =
        (cumulativeAdapterAbsoluteByDirection[direction] ?? 0)
        + (record.adapterAbsoluteByDirection[direction] ?? Number.NaN);
    }
    const numericValues = [
      record.ordered.closureResidual,
      record.pairwise.closureResidual,
      record.neumaier.closureResidual,
      record.neumaier.combinedErrorBound,
      boundRatio,
      record.nonIncomingAbsoluteModification,
    ];
    allValuesFinite &&= numericValues.every(Number.isFinite)
      && record.adapterByDirection.every(Number.isFinite)
      && record.adapterAbsoluteByDirection.every(Number.isFinite);
  }
  const nonIncoming = [0, 2, 3, 4, 6, 7];
  let cumulativeNonIncomingAbsoluteModification = 0;
  for (const direction of nonIncoming) {
    cumulativeNonIncomingAbsoluteModification +=
      cumulativeAdapterAbsoluteByDirection[direction] ?? Number.NaN;
  }
  const scheduledSteps: number[] = [];
  for (let step = 1; step <= runSteps; step += 1) {
    if (isPopulationAuditStep(step, runSteps, stride)) {
      scheduledSteps.push(step);
    }
  }
  const scheduledAuditsComplete = records.length === scheduledAuditCount
    && records.every((record, index) =>
      record.step === scheduledSteps[index]);
  const nonIncomingModificationPass =
    cumulativeNonIncomingAbsoluteModification
      === CONTRACT.populationLedger.gates
        .maximumNonIncomingAbsoluteModification;
  const pass = scheduledAuditsComplete
    && allValuesFinite
    && compensatedClosureWithinScaledBound
    && nonIncomingModificationPass;
  return {
    scheduledAuditCount,
    recordedAuditCount: records.length,
    cumulativeAdapterByDirection,
    cumulativeAdapterAbsoluteByDirection,
    cumulativeNonIncomingAbsoluteModification,
    maximumOrderedAbsoluteClosureResidual,
    maximumPairwiseAbsoluteClosureResidual,
    maximumNeumaierAbsoluteClosureResidual,
    maximumNeumaierScaledBoundRatio,
    gates: {
      scheduledAuditsComplete,
      allValuesFinite,
      compensatedClosureWithinScaledBound,
      nonIncomingModificationPass,
      pass,
    },
  };
}

function wrap(index: number, size: number): number {
  const remainder = index % size;
  return remainder < 0 ? remainder + size : remainder;
}

function coordinateKey(x: number, y: number): string {
  return x.toString() + ":" + y.toString();
}

export function buildRegionLayout(
  field: FieldCapture,
  nx: number,
  ny: number,
  bodyCenterX: number,
  bodyCenterY: number,
  diameter: number,
): RegionLayout {
  const region = CONTRACT.maturity.analysisRegion;
  const xMinimum = Math.ceil(
    bodyCenterX + region.minimumRelativeXDiameters * diameter,
  );
  const xMaximum = Math.floor(
    bodyCenterX + region.maximumRelativeXDiameters * diameter,
  );
  const yMinimum = Math.ceil(
    bodyCenterY + region.minimumRelativeYDiameters * diameter,
  );
  const yMaximum = Math.floor(
    bodyCenterY + region.maximumRelativeYDiameters * diameter,
  );
  const cells: number[] = [];
  const relativeXCells: number[] = [];
  const relativeYCells: number[] = [];
  for (let y = yMinimum; y <= yMaximum; y += 1) {
    for (let x = xMinimum; x <= xMaximum; x += 1) {
      if (x < 0 || x >= nx || y < 0 || y >= ny) {
        throw new RangeError("A8P comparison region leaves the domain");
      }
      const cell = x + nx * y;
      if ((field.mask[cell] ?? Number.NaN) >= 0.5) continue;
      cells.push(cell);
      relativeXCells.push(x - bodyCenterX);
      relativeYCells.push(y - bodyCenterY);
    }
  }
  if (cells.length === 0) throw new RangeError("A8P empty comparison region");
  const ordinalByCoordinate = new Map<string, number>();
  for (let ordinal = 0; ordinal < cells.length; ordinal += 1) {
    ordinalByCoordinate.set(
      coordinateKey(
        relativeXCells[ordinal] ?? Number.NaN,
        relativeYCells[ordinal] ?? Number.NaN,
      ),
      ordinal,
    );
  }
  const mirrorOrdinals = relativeXCells.map((relativeX, ordinal) => {
    const relativeY = relativeYCells[ordinal] ?? Number.NaN;
    const mirrored = ordinalByCoordinate.get(
      coordinateKey(relativeX, -relativeY),
    );
    if (mirrored === undefined) {
      throw new Error("A8P mirror cell missing from comparison layout");
    }
    return mirrored;
  });
  return {
    nx,
    ny,
    bodyCenterX,
    bodyCenterY,
    cells,
    relativeXCells,
    relativeYCells,
    mirrorOrdinals,
  };
}

function updateFnv(hash: number, byte: number): number {
  hash ^= byte;
  return Math.imul(hash, 0x01000193) >>> 0;
}

export function digestNumberArrays(arrays: readonly (readonly number[])[]): string {
  const view = new DataView(new ArrayBuffer(8));
  let hash = 0x811c9dc5;
  for (const values of arrays) {
    for (const value of values) {
      finite(value, "digest value");
      view.setFloat64(0, value, true);
      for (let offset = 0; offset < 8; offset += 1) {
        hash = updateFnv(hash, view.getUint8(offset));
      }
    }
  }
  return hash.toString(16).padStart(8, "0");
}

export function extractRegionSample(
  field: FieldCapture,
  layout: RegionLayout,
  step: number,
  rawReactionX: number,
  rawReactionY: number,
): RegionFieldSample {
  const rho: number[] = [];
  const ux: number[] = [];
  const uy: number[] = [];
  let xMinimum = Number.POSITIVE_INFINITY;
  let xMaximum = Number.NEGATIVE_INFINITY;
  let yMinimum = Number.POSITIVE_INFINITY;
  let yMaximum = Number.NEGATIVE_INFINITY;
  for (let ordinal = 0; ordinal < layout.cells.length; ordinal += 1) {
    const cell = layout.cells[ordinal] ?? -1;
    rho.push(field.rho[cell] ?? Number.NaN);
    ux.push(field.ux[cell] ?? Number.NaN);
    uy.push(field.uy[cell] ?? Number.NaN);
    const x = layout.bodyCenterX
      + (layout.relativeXCells[ordinal] ?? Number.NaN);
    const y = layout.bodyCenterY
      + (layout.relativeYCells[ordinal] ?? Number.NaN);
    xMinimum = Math.min(xMinimum, x);
    xMaximum = Math.max(xMaximum, x);
    yMinimum = Math.min(yMinimum, y);
    yMaximum = Math.max(yMaximum, y);
  }
  finiteArray(rho, "region density");
  finiteArray(ux, "region x velocity");
  finiteArray(uy, "region y velocity");
  const leftGraphDistance = xMinimum;
  const rightGraphDistance = layout.nx - 1 - xMaximum;
  const transverseSeamGraphDistance = Math.min(
    yMinimum,
    layout.ny - 1 - yMaximum,
  );
  const strictConePass = step < leftGraphDistance
    && step < rightGraphDistance
    && step < transverseSeamGraphDistance;
  return {
    step,
    leftGraphDistance: finite(leftGraphDistance, "left graph distance"),
    rightGraphDistance: finite(rightGraphDistance, "right graph distance"),
    transverseSeamGraphDistance: finite(
      transverseSeamGraphDistance,
      "transverse graph distance",
    ),
    strictConePass,
    rho,
    ux,
    uy,
    fieldDigestFnv1a32: digestNumberArrays([rho, ux, uy]),
    rawReactionX: finite(rawReactionX, "raw reaction x"),
    rawReactionY: finite(rawReactionY, "raw reaction y"),
  };
}

export function createWindowField(layout: RegionLayout): MutableWindowField {
  const length = layout.cells.length;
  return {
    layout,
    sampleCount: 0,
    sumRho: new Float64Array(length),
    sumUx: new Float64Array(length),
    sumUy: new Float64Array(length),
    sumRhoSquared: new Float64Array(length),
    sumUxSquared: new Float64Array(length),
    sumUySquared: new Float64Array(length),
    mirrorDefectSquareSum: 0,
    mirrorDefectObservationCount: 0,
  };
}

export function addWindowFieldSample(
  window: MutableWindowField,
  field: FieldCapture,
): void {
  const u0 = CONTRACT.commonNumerics.inletVelocityLattice;
  for (let ordinal = 0; ordinal < window.layout.cells.length; ordinal += 1) {
    const cell = window.layout.cells[ordinal] ?? -1;
    const rho = field.rho[cell] ?? Number.NaN;
    const ux = field.ux[cell] ?? Number.NaN;
    const uy = field.uy[cell] ?? Number.NaN;
    const mirrorOrdinal = window.layout.mirrorOrdinals[ordinal] ?? -1;
    const mirrorCell = window.layout.cells[mirrorOrdinal] ?? -1;
    const mirrorRho = field.rho[mirrorCell] ?? Number.NaN;
    const mirrorUx = field.ux[mirrorCell] ?? Number.NaN;
    const mirrorUy = field.uy[mirrorCell] ?? Number.NaN;
    const values = [rho, ux, uy, mirrorRho, mirrorUx, mirrorUy];
    if (!values.every(Number.isFinite)) {
      throw new RangeError("A8P non-finite field-window sample");
    }
    window.sumRho[ordinal] = (window.sumRho[ordinal] ?? 0) + rho;
    window.sumUx[ordinal] = (window.sumUx[ordinal] ?? 0) + ux;
    window.sumUy[ordinal] = (window.sumUy[ordinal] ?? 0) + uy;
    window.sumRhoSquared[ordinal] =
      (window.sumRhoSquared[ordinal] ?? 0) + rho * rho;
    window.sumUxSquared[ordinal] =
      (window.sumUxSquared[ordinal] ?? 0) + ux * ux;
    window.sumUySquared[ordinal] =
      (window.sumUySquared[ordinal] ?? 0) + uy * uy;
    const densityDefect = rho - mirrorRho;
    const uxDefect = (ux - mirrorUx) / u0;
    const uyDefect = (uy + mirrorUy) / u0;
    window.mirrorDefectSquareSum += densityDefect * densityDefect
      + uxDefect * uxDefect
      + uyDefect * uyDefect;
    window.mirrorDefectObservationCount += 3;
  }
  window.sampleCount += 1;
}

function nonnegativeVariance(mean: number, meanSquare: number): number {
  return Math.max(0, meanSquare - mean * mean);
}

export function finishWindowField(
  window: MutableWindowField,
): WindowFieldSummary {
  if (window.sampleCount === 0) {
    throw new RangeError("A8P cannot finish an empty field window");
  }
  const meanRho: number[] = [];
  const meanUx: number[] = [];
  const meanUy: number[] = [];
  const densityFluctuationRms: number[] = [];
  const velocityFluctuationRms: number[] = [];
  for (let ordinal = 0; ordinal < window.layout.cells.length; ordinal += 1) {
    const rho = (window.sumRho[ordinal] ?? Number.NaN) / window.sampleCount;
    const ux = (window.sumUx[ordinal] ?? Number.NaN) / window.sampleCount;
    const uy = (window.sumUy[ordinal] ?? Number.NaN) / window.sampleCount;
    const rhoVariance = nonnegativeVariance(
      rho,
      (window.sumRhoSquared[ordinal] ?? Number.NaN) / window.sampleCount,
    );
    const uxVariance = nonnegativeVariance(
      ux,
      (window.sumUxSquared[ordinal] ?? Number.NaN) / window.sampleCount,
    );
    const uyVariance = nonnegativeVariance(
      uy,
      (window.sumUySquared[ordinal] ?? Number.NaN) / window.sampleCount,
    );
    meanRho.push(rho);
    meanUx.push(ux);
    meanUy.push(uy);
    densityFluctuationRms.push(Math.sqrt(rhoVariance));
    velocityFluctuationRms.push(Math.sqrt(uxVariance + uyVariance));
  }
  for (const [label, values] of [
    ["mean density", meanRho],
    ["mean x velocity", meanUx],
    ["mean y velocity", meanUy],
    ["density fluctuation", densityFluctuationRms],
    ["velocity fluctuation", velocityFluctuationRms],
  ] as const) {
    finiteArray(values, label);
  }
  const mirrorDefectRms = Math.sqrt(
    window.mirrorDefectSquareSum
      / Math.max(1, window.mirrorDefectObservationCount),
  );
  return {
    sampleCount: window.sampleCount,
    relativeXCells: window.layout.relativeXCells,
    relativeYCells: window.layout.relativeYCells,
    mirrorOrdinals: window.layout.mirrorOrdinals,
    meanRho,
    meanUx,
    meanUy,
    densityFluctuationRms,
    velocityFluctuationRms,
    mirrorDefectRms: finite(mirrorDefectRms, "mirror defect"),
    digestFnv1a32: digestNumberArrays([
      meanRho,
      meanUx,
      meanUy,
      densityFluctuationRms,
      velocityFluctuationRms,
    ]),
  };
}

export function summarizeLoadWindow(
  samples: readonly LoadSample[],
  convectiveTimeStep: number,
): LoadWindowSummary {
  if (samples.length === 0 || !(convectiveTimeStep > 0)) {
    throw new RangeError("A8P invalid load window");
  }
  let sumDrag = 0;
  let sumLift = 0;
  for (const sample of samples) {
    sumDrag += sample.drag;
    sumLift += sample.lift;
  }
  const meanDrag = sumDrag / samples.length;
  const meanLift = sumLift / samples.length;
  let dragSquare = 0;
  let liftSquare = 0;
  let dragFluctuationSquare = 0;
  let liftFluctuationSquare = 0;
  for (const sample of samples) {
    dragSquare += sample.drag * sample.drag;
    liftSquare += sample.lift * sample.lift;
    dragFluctuationSquare += (sample.drag - meanDrag) ** 2;
    liftFluctuationSquare += (sample.lift - meanLift) ** 2;
  }
  const dragRms = Math.sqrt(dragSquare / samples.length);
  const liftRms = Math.sqrt(liftSquare / samples.length);
  const bounds = CONTRACT.maturity.spectrum.strouhalSearchInclusive;
  const minimum = bounds[0] ?? Number.NaN;
  const maximum = bounds[1] ?? Number.NaN;
  const increment = CONTRACT.maturity.spectrum.strouhalIncrement;
  let dominantStrouhal = minimum;
  let normalizedSpectralAmplitude = -1;
  for (
    let strouhal = minimum;
    strouhal <= maximum + 0.5 * increment;
    strouhal += increment
  ) {
    let cosine = 0;
    let minusSine = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const phase = 2 * Math.PI * strouhal * convectiveTimeStep * index;
      const centered = (samples[index]?.lift ?? Number.NaN) - meanLift;
      cosine += centered * Math.cos(phase);
      minusSine -= centered * Math.sin(phase);
    }
    const amplitude = 2 * Math.hypot(cosine, minusSine) / samples.length;
    if (amplitude > normalizedSpectralAmplitude) {
      dominantStrouhal = strouhal;
      normalizedSpectralAmplitude = amplitude;
    }
  }
  const windowConvectiveDuration = samples.length * convectiveTimeStep;
  const coveredCycles = dominantStrouhal * windowConvectiveDuration;
  const detectable = liftRms
      >= CONTRACT.maturity.spectrum.detectableLiftRms
    && coveredCycles
      >= CONTRACT.maturity.spectrum.minimumDetectableCyclesPerWindow;
  const values = [
    meanDrag,
    meanLift,
    dragRms,
    liftRms,
    dragFluctuationSquare,
    liftFluctuationSquare,
    dominantStrouhal,
    normalizedSpectralAmplitude,
    coveredCycles,
  ];
  if (!values.every(Number.isFinite)) {
    throw new RangeError("A8P non-finite load summary");
  }
  return {
    sampleCount: samples.length,
    meanDrag,
    meanLift,
    dragRms,
    liftRms,
    dragFluctuationRms: Math.sqrt(dragFluctuationSquare / samples.length),
    liftFluctuationRms: Math.sqrt(liftFluctuationSquare / samples.length),
    dominantStrouhal,
    normalizedSpectralAmplitude,
    coveredCycles,
    detectable,
  };
}

export function relativeDifference(
  first: number,
  second: number,
  floor: number = CONTRACT.maturity.classification.relativeDenominatorFloor,
): number {
  return Math.abs(first - second)
    / Math.max(Math.abs(first), Math.abs(second), floor);
}

function rmsDifference(
  first: readonly number[],
  second: readonly number[],
): number {
  if (first.length !== second.length || first.length === 0) {
    throw new RangeError("A8P RMS comparison length mismatch");
  }
  let square = 0;
  for (let index = 0; index < first.length; index += 1) {
    const difference = (first[index] ?? Number.NaN)
      - (second[index] ?? Number.NaN);
    square += difference * difference;
  }
  return finite(Math.sqrt(square / first.length), "RMS difference");
}

export function compareMirroredWindowFields(
  positive: WindowFieldSummary,
  negative: WindowFieldSummary,
): MirroredFieldComparison {
  if (positive.meanRho.length !== negative.meanRho.length) {
    throw new RangeError("A8P mirrored field length mismatch");
  }
  const mirroredRho: number[] = [];
  const mirroredUx: number[] = [];
  const mirroredUy: number[] = [];
  const mirroredDensityFluctuation: number[] = [];
  const mirroredVelocityFluctuation: number[] = [];
  for (let ordinal = 0; ordinal < positive.meanRho.length; ordinal += 1) {
    const mirror = positive.mirrorOrdinals[ordinal] ?? -1;
    mirroredRho.push(negative.meanRho[mirror] ?? Number.NaN);
    mirroredUx.push(negative.meanUx[mirror] ?? Number.NaN);
    mirroredUy.push(-(negative.meanUy[mirror] ?? Number.NaN));
    mirroredDensityFluctuation.push(
      negative.densityFluctuationRms[mirror] ?? Number.NaN,
    );
    mirroredVelocityFluctuation.push(
      negative.velocityFluctuationRms[mirror] ?? Number.NaN,
    );
  }
  const densityDifference = rmsDifference(positive.meanRho, mirroredRho);
  const velocityComponentsPositive = positive.meanUx.flatMap((ux, index) => [
    ux,
    positive.meanUy[index] ?? Number.NaN,
  ]);
  const velocityComponentsNegative = mirroredUx.flatMap((ux, index) => [
    ux,
    mirroredUy[index] ?? Number.NaN,
  ]);
  const velocityDifference = rmsDifference(
    velocityComponentsPositive,
    velocityComponentsNegative,
  ) / CONTRACT.commonNumerics.inletVelocityLattice;
  const densityFluctuationDifference = rmsDifference(
    positive.densityFluctuationRms,
    mirroredDensityFluctuation,
  );
  const velocityFluctuationDifference = rmsDifference(
    positive.velocityFluctuationRms,
    mirroredVelocityFluctuation,
  );
  let fluctuationScaleSquare = 0;
  for (const values of [
    positive.densityFluctuationRms,
    mirroredDensityFluctuation,
    positive.velocityFluctuationRms,
    mirroredVelocityFluctuation,
  ]) {
    for (const value of values) fluctuationScaleSquare += value * value;
  }
  const fluctuationScale = Math.sqrt(
    fluctuationScaleSquare
      / Math.max(1, 4 * positive.meanRho.length),
  );
  const fluctuationRmsRelativeDifference = Math.hypot(
    densityFluctuationDifference,
    velocityFluctuationDifference,
  ) / Math.max(
    fluctuationScale,
    CONTRACT.maturity.classification.relativeDenominatorFloor,
  );
  return {
    sampleCount: positive.sampleCount,
    meanDensityRmsDifference: densityDifference,
    meanVelocityRmsDifferenceOverInletVelocity: velocityDifference,
    fluctuationRmsRelativeDifference: finite(
      fluctuationRmsRelativeDifference,
      "mirrored fluctuation relative difference",
    ),
  };
}

export function compareDirectMeanVelocityFields(
  first: WindowFieldSummary,
  second: WindowFieldSummary,
): number {
  const firstComponents = first.meanUx.flatMap((ux, index) => [
    ux,
    first.meanUy[index] ?? Number.NaN,
  ]);
  const secondComponents = second.meanUx.flatMap((ux, index) => [
    ux,
    second.meanUy[index] ?? Number.NaN,
  ]);
  return rmsDifference(firstComponents, secondComponents)
    / CONTRACT.commonNumerics.inletVelocityLattice;
}

export function exactRegionSampleDifference(
  first: RegionFieldSample,
  second: RegionFieldSample,
): {
  exact: boolean;
  maximumAbsoluteDensityDifference: number;
  maximumAbsoluteVelocityComponentDifference: number;
  maximumAbsoluteRawBodyReactionDifference: number;
} {
  if (first.step !== second.step
    || first.rho.length !== second.rho.length
    || first.ux.length !== second.ux.length
    || first.uy.length !== second.uy.length) {
    throw new RangeError("A8P exact sample comparison mismatch");
  }
  let exact = true;
  let maximumAbsoluteDensityDifference = 0;
  let maximumAbsoluteVelocityComponentDifference = 0;
  for (let index = 0; index < first.rho.length; index += 1) {
    const firstRho = first.rho[index] ?? Number.NaN;
    const secondRho = second.rho[index] ?? Number.NaN;
    const firstUx = first.ux[index] ?? Number.NaN;
    const secondUx = second.ux[index] ?? Number.NaN;
    const firstUy = first.uy[index] ?? Number.NaN;
    const secondUy = second.uy[index] ?? Number.NaN;
    exact &&= Object.is(firstRho, secondRho)
      && Object.is(firstUx, secondUx)
      && Object.is(firstUy, secondUy);
    maximumAbsoluteDensityDifference = Math.max(
      maximumAbsoluteDensityDifference,
      Math.abs(firstRho - secondRho),
    );
    maximumAbsoluteVelocityComponentDifference = Math.max(
      maximumAbsoluteVelocityComponentDifference,
      Math.abs(firstUx - secondUx),
      Math.abs(firstUy - secondUy),
    );
  }
  const maximumAbsoluteRawBodyReactionDifference = Math.max(
    Math.abs(first.rawReactionX - second.rawReactionX),
    Math.abs(first.rawReactionY - second.rawReactionY),
  );
  exact &&= Object.is(first.rawReactionX, second.rawReactionX)
    && Object.is(first.rawReactionY, second.rawReactionY);
  return {
    exact,
    maximumAbsoluteDensityDifference,
    maximumAbsoluteVelocityComponentDifference,
    maximumAbsoluteRawBodyReactionDifference,
  };
}
