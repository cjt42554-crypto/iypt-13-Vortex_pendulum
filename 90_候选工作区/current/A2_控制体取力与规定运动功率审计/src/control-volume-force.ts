/**
 * A2 candidate: independent D2Q9 control-volume force extraction.
 * Raw reaction uses only distribution momentum and populations streamed across
 * an internal rectangle. Corrected reactions add the change of fictitious
 * fluid momentum inside the diffuse Brinkman mask.
 */

export const D2Q9_CX = new Int8Array([0, 1, 0, -1, 0, 1, -1, -1, 1]);
export const D2Q9_CY = new Int8Array([0, 0, 1, 0, -1, 1, 1, -1, -1]);

export interface InternalControlVolume {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface D2Q9StateView {
  nx: number;
  ny: number;
  /** Post-boundary distributions at one accepted lattice time level. */
  distributions: ArrayLike<number>;
  /** Half-force-corrected macroscopic fields at the same time level. */
  rho: ArrayLike<number>;
  ux: ArrayLike<number>;
  uy: ArrayLike<number>;
  /** Analytic diffuse-solid indicator chi in [0,1]. */
  mask: ArrayLike<number>;
}

export interface ControlVolumeSnapshot {
  controlVolume: InternalControlVolume;
  totalDistributionMomentumX: number;
  totalDistributionMomentumY: number;
  fictitiousBareMomentumX: number;
  fictitiousBareMomentumY: number;
  fictitiousPhysicalMomentumX: number;
  fictitiousPhysicalMomentumY: number;
  /** Net outward momentum streamed during the step ending at this snapshot. */
  netOutwardStreamingMomentumX: number;
  netOutwardStreamingMomentumY: number;
  maximumBoundaryMask: number;
}

export interface ControlVolumeStepBalance {
  dtLattice: number;
  sourceImpulseOnFluidX: number;
  sourceImpulseOnFluidY: number;
  rawReactionImpulseX: number;
  rawReactionImpulseY: number;
  fictitiousBareMomentumIncrementX: number;
  fictitiousBareMomentumIncrementY: number;
  fictitiousPhysicalMomentumIncrementX: number;
  fictitiousPhysicalMomentumIncrementY: number;
  correctedBareReactionImpulseX: number;
  correctedBareReactionImpulseY: number;
  correctedPhysicalReactionImpulseX: number;
  correctedPhysicalReactionImpulseY: number;
  maximumBoundaryMask: number;
  boundaryMaskPassed: boolean;
}

export const DEFAULT_SCALE_AWARE_MAXIMUM_RELATIVE_TOLERANCE = 1e-9;
export const DEFAULT_SCALE_AWARE_RMS_RELATIVE_TOLERANCE = 1e-10;

export interface ScaleAwareResidualAssessment {
  sampleCount: number;
  maximumAbsoluteResidual: number;
  residualRms: number;
  referenceRms: number;
  maximumResidualRelativeToReferenceRms: number;
  rmsResidualRelativeToReferenceRms: number;
  maximumTolerance: number;
  rmsTolerance: number;
  passed: boolean;
}

function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  return value;
}

function integer(value: number, name: string): void {
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer`);
}

function validateState(state: D2Q9StateView): void {
  integer(state.nx, "nx");
  integer(state.ny, "ny");
  if (state.nx < 5 || state.ny < 5) throw new RangeError("state must be at least 5 x 5");
  const cells = state.nx * state.ny;
  if (state.distributions.length !== 9 * cells) {
    throw new RangeError(`distributions length must be ${9 * cells}`);
  }
  for (const [name, field] of [
    ["rho", state.rho],
    ["ux", state.ux],
    ["uy", state.uy],
    ["mask", state.mask],
  ] as const) {
    if (field.length !== cells) throw new RangeError(`${name} length must be ${cells}`);
  }
}

export function validateInternalControlVolume(
  cv: InternalControlVolume,
  nx: number,
  ny: number,
): void {
  for (const [name, value] of Object.entries(cv)) integer(value, name);
  if (cv.xMin > cv.xMax || cv.yMin > cv.yMax) {
    throw new RangeError("control-volume bounds are reversed");
  }
  if (cv.xMin < 1 || cv.xMax > nx - 2 || cv.yMin < 1 || cv.yMax > ny - 2) {
    throw new RangeError("control volume must retain a one-cell internal halo");
  }
}

function inside(cv: InternalControlVolume, x: number, y: number): boolean {
  return x >= cv.xMin && x <= cv.xMax && y >= cv.yMin && y <= cv.yMax;
}

function cellMomentum(distributions: ArrayLike<number>, cell: number): { x: number; y: number } {
  const o = 9 * cell;
  const f1 = distributions[o + 1] ?? 0;
  const f2 = distributions[o + 2] ?? 0;
  const f3 = distributions[o + 3] ?? 0;
  const f4 = distributions[o + 4] ?? 0;
  const f5 = distributions[o + 5] ?? 0;
  const f6 = distributions[o + 6] ?? 0;
  const f7 = distributions[o + 7] ?? 0;
  const f8 = distributions[o + 8] ?? 0;
  return { x: f1 - f3 + f5 - f6 - f7 + f8, y: f2 - f4 + f5 + f6 - f7 - f8 };
}

function maximumMaskOnBoundary(state: D2Q9StateView, cv: InternalControlVolume): number {
  let maximum = 0;
  const visit = (x: number, y: number): void => {
    const value = finite(state.mask[x + state.nx * y] ?? 0, `mask(${x},${y})`);
    if (value < -1e-12 || value > 1 + 1e-12) {
      throw new RangeError(`mask(${x},${y})=${value} lies outside [0,1]`);
    }
    maximum = Math.max(maximum, value);
  };
  // Inspect the full one-cell outer halo plus the CV's own boundary cells.
  // The four diagonal halo corners matter for D2Q9 diagonal populations.
  for (let y = cv.yMin - 1; y <= cv.yMax + 1; y += 1) {
    for (let x = cv.xMin - 1; x <= cv.xMax + 1; x += 1) {
      const inBoundaryBand = x <= cv.xMin || x >= cv.xMax
        || y <= cv.yMin || y >= cv.yMax;
      if (inBoundaryBand) visit(x, y);
    }
  }
  return maximum;
}

/**
 * Capture an exact fixed-CV inventory. Crossing populations are read at their
 * destinations after streaming, so the flux belongs to the step ending here.
 */
export function captureControlVolumeSnapshot(
  state: D2Q9StateView,
  cv: InternalControlVolume,
): ControlVolumeSnapshot {
  validateState(state);
  validateInternalControlVolume(cv, state.nx, state.ny);
  let totalX = 0;
  let totalY = 0;
  let bareX = 0;
  let bareY = 0;
  let physicalX = 0;
  let physicalY = 0;

  for (let y = cv.yMin; y <= cv.yMax; y += 1) {
    for (let x = cv.xMin; x <= cv.xMax; x += 1) {
      const cell = x + state.nx * y;
      const momentum = cellMomentum(state.distributions, cell);
      const chi = finite(state.mask[cell] ?? 0, `mask(${x},${y})`);
      if (chi < -1e-12 || chi > 1 + 1e-12) {
        throw new RangeError(`mask(${x},${y})=${chi} lies outside [0,1]`);
      }
      const rho = finite(state.rho[cell] ?? 0, `rho(${x},${y})`);
      const ux = finite(state.ux[cell] ?? 0, `ux(${x},${y})`);
      const uy = finite(state.uy[cell] ?? 0, `uy(${x},${y})`);
      totalX += momentum.x;
      totalY += momentum.y;
      bareX += chi * momentum.x;
      bareY += chi * momentum.y;
      physicalX += chi * rho * ux;
      physicalY += chi * rho * uy;
    }
  }

  let outwardX = 0;
  let outwardY = 0;
  for (let dy = cv.yMin - 1; dy <= cv.yMax + 1; dy += 1) {
    for (let dx = cv.xMin - 1; dx <= cv.xMax + 1; dx += 1) {
      const destinationInside = inside(cv, dx, dy);
      const destinationCell = dx + state.nx * dy;
      for (let direction = 1; direction < 9; direction += 1) {
        const cx = D2Q9_CX[direction] ?? 0;
        const cy = D2Q9_CY[direction] ?? 0;
        const sourceInside = inside(cv, dx - cx, dy - cy);
        if (sourceInside === destinationInside) continue;
        const population = finite(
          state.distributions[9 * destinationCell + direction] ?? 0,
          `f(${dx},${dy},${direction})`,
        );
        const sign = sourceInside ? 1 : -1;
        outwardX += sign * population * cx;
        outwardY += sign * population * cy;
      }
    }
  }

  return {
    controlVolume: { ...cv },
    totalDistributionMomentumX: totalX,
    totalDistributionMomentumY: totalY,
    fictitiousBareMomentumX: bareX,
    fictitiousBareMomentumY: bareY,
    fictitiousPhysicalMomentumX: physicalX,
    fictitiousPhysicalMomentumY: physicalY,
    netOutwardStreamingMomentumX: outwardX,
    netOutwardStreamingMomentumY: outwardY,
    maximumBoundaryMask: maximumMaskOnBoundary(state, cv),
  };
}

/**
 * For a fixed CV, J_source = Delta P + J_out. The raw body reaction is its
 * negative. Corrected candidates add Delta of fictitious-fluid momentum.
 */
export function evaluateControlVolumeStep(
  before: ControlVolumeSnapshot,
  after: ControlVolumeSnapshot,
  options: { dtLattice?: number; boundaryMaskTolerance?: number } = {},
): ControlVolumeStepBalance {
  const dtLattice = options.dtLattice ?? 1;
  const tolerance = options.boundaryMaskTolerance ?? 1e-14;
  if (!(dtLattice > 0) || !Number.isFinite(dtLattice)) {
    throw new RangeError("dtLattice must be finite and positive");
  }
  if (!(tolerance >= 0) || !Number.isFinite(tolerance)) {
    throw new RangeError("boundaryMaskTolerance must be finite and non-negative");
  }
  const a = before.controlVolume;
  const b = after.controlVolume;
  if (a.xMin !== b.xMin || a.xMax !== b.xMax || a.yMin !== b.yMin || a.yMax !== b.yMax) {
    throw new RangeError("before and after snapshots use different control volumes");
  }

  const sourceX = after.totalDistributionMomentumX - before.totalDistributionMomentumX
    + after.netOutwardStreamingMomentumX;
  const sourceY = after.totalDistributionMomentumY - before.totalDistributionMomentumY
    + after.netOutwardStreamingMomentumY;
  const rawX = -sourceX;
  const rawY = -sourceY;
  const bareX = after.fictitiousBareMomentumX - before.fictitiousBareMomentumX;
  const bareY = after.fictitiousBareMomentumY - before.fictitiousBareMomentumY;
  const physicalX = after.fictitiousPhysicalMomentumX - before.fictitiousPhysicalMomentumX;
  const physicalY = after.fictitiousPhysicalMomentumY - before.fictitiousPhysicalMomentumY;
  const maximumBoundaryMask = Math.max(before.maximumBoundaryMask, after.maximumBoundaryMask);
  return {
    dtLattice,
    sourceImpulseOnFluidX: sourceX,
    sourceImpulseOnFluidY: sourceY,
    rawReactionImpulseX: rawX,
    rawReactionImpulseY: rawY,
    fictitiousBareMomentumIncrementX: bareX,
    fictitiousBareMomentumIncrementY: bareY,
    fictitiousPhysicalMomentumIncrementX: physicalX,
    fictitiousPhysicalMomentumIncrementY: physicalY,
    correctedBareReactionImpulseX: rawX + bareX,
    correctedBareReactionImpulseY: rawY + bareY,
    correctedPhysicalReactionImpulseX: rawX + physicalX,
    correctedPhysicalReactionImpulseY: rawY + physicalY,
    maximumBoundaryMask,
    boundaryMaskPassed: maximumBoundaryMask <= tolerance,
  };
}

export function relativeVectorResidual(
  firstX: number,
  firstY: number,
  secondX: number,
  secondY: number,
  floor = 1e-30,
): number {
  if (!(floor > 0) || !Number.isFinite(floor)) throw new RangeError("invalid residual floor");
  return Math.hypot(firstX - secondX, firstY - secondY)
    / Math.max(Math.hypot(firstX, firstY), Math.hypot(secondX, secondY), floor);
}

/**
 * Assess a residual history against one characteristic, all-sample reference
 * scale. A per-step relative maximum is ill-conditioned whenever the true
 * reference vector crosses zero, so it remains a diagnostic rather than a
 * hard gate.
 */
export function assessScaleAwareResidual(
  maximumAbsoluteResidual: number,
  squaredResidualSum: number,
  squaredReferenceSum: number,
  sampleCount: number,
  options: {
    maximumTolerance?: number;
    rmsTolerance?: number;
    referenceFloor?: number;
  } = {},
): ScaleAwareResidualAssessment {
  const maximumTolerance = options.maximumTolerance
    ?? DEFAULT_SCALE_AWARE_MAXIMUM_RELATIVE_TOLERANCE;
  const rmsTolerance = options.rmsTolerance
    ?? DEFAULT_SCALE_AWARE_RMS_RELATIVE_TOLERANCE;
  const referenceFloor = options.referenceFloor ?? 1e-30;
  for (const [name, value] of [
    ["maximumAbsoluteResidual", maximumAbsoluteResidual],
    ["squaredResidualSum", squaredResidualSum],
    ["squaredReferenceSum", squaredReferenceSum],
    ["maximumTolerance", maximumTolerance],
    ["rmsTolerance", rmsTolerance],
  ] as const) {
    if (!(value >= 0) || !Number.isFinite(value)) {
      throw new RangeError(`${name} must be finite and non-negative`);
    }
  }
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
    throw new RangeError("sampleCount must be a positive integer");
  }
  if (!(referenceFloor > 0) || !Number.isFinite(referenceFloor)) {
    throw new RangeError("referenceFloor must be finite and positive");
  }
  const residualRms = Math.sqrt(squaredResidualSum / sampleCount);
  const referenceRms = Math.sqrt(squaredReferenceSum / sampleCount);
  const characteristicScale = Math.max(referenceRms, referenceFloor);
  const maximumResidualRelativeToReferenceRms = maximumAbsoluteResidual
    / characteristicScale;
  const rmsResidualRelativeToReferenceRms = residualRms / characteristicScale;
  return {
    sampleCount,
    maximumAbsoluteResidual,
    residualRms,
    referenceRms,
    maximumResidualRelativeToReferenceRms,
    rmsResidualRelativeToReferenceRms,
    maximumTolerance,
    rmsTolerance,
    passed: maximumResidualRelativeToReferenceRms <= maximumTolerance
      && rmsResidualRelativeToReferenceRms <= rmsTolerance,
  };
}

export function signedTrend(
  value: number,
  scale: number,
  relativeDeadband = 1e-6,
): "positive" | "negative" | "indistinguishable-from-zero" {
  if (!Number.isFinite(value) || !Number.isFinite(scale)) throw new RangeError("non-finite trend input");
  if (!(relativeDeadband >= 0) || !Number.isFinite(relativeDeadband)) {
    throw new RangeError("invalid relative deadband");
  }
  const threshold = relativeDeadband * Math.max(Math.abs(scale), Number.MIN_VALUE);
  if (value > threshold) return "positive";
  if (value < -threshold) return "negative";
  return "indistinguishable-from-zero";
}
