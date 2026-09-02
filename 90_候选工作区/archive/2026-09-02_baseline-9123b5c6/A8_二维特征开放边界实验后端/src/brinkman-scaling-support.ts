import type {
  D2Q9MrtBrinkmanSolver,
  LbmBodyKinematics,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { BRINKMAN_SCALING_CONTRACT as CONTRACT } from
  "./brinkman-scaling-contract.ts";

export interface FormalMacroscopicView {
  rho: Float64Array;
  ux: Float64Array;
  uy: Float64Array;
  mask: Float64Array;
}

interface FormalRuntimeArrays {
  rho: unknown;
  ux: unknown;
  uy: unknown;
  mask: unknown;
}

export interface FieldDiagnosticLayout {
  cells: number;
  maskValues: Float64Array;
  maskDigestFnv1a32: string;
  effectiveMaskArea: number;
  equivalentDiameterCells: number;
  relativeGeometryDeviation: number;
  absoluteRelativeGeometryDeviation: number;
  coreCellCount: number;
  transitionCellCount: number;
}

export interface FieldDiagnosticSnapshot {
  fictitiousMomentumX: number;
  fictitiousMomentumY: number;
  minimumDensity: number;
  maximumDensity: number;
  maximumSpeed: number;
  coreDensityWeight: number;
  coreSlipSquaredNumerator: number;
  coreSlipRms: number;
  coreSlipMaximum: number;
  transitionDensityWeight: number;
  transitionSlipSquaredNumerator: number;
  transitionSlipRms: number;
  transitionSlipMaximum: number;
}

export interface VectorCoefficientRecord {
  x: number;
  y: number;
}

export interface VectorCoefficientSummary {
  samples: number;
  meanX: number;
  meanY: number;
  rmsX: number;
  rmsY: number;
  fluctuationRmsX: number;
  fluctuationRmsY: number;
}

export interface SlipTraceRecord {
  coreDensityWeight: number;
  coreSlipSquaredNumerator: number;
  coreSlipRms: number;
  coreSlipMaximum: number;
  transitionDensityWeight: number;
  transitionSlipSquaredNumerator: number;
  transitionSlipRms: number;
  transitionSlipMaximum: number;
}

export interface SlipRegionSummary {
  samples: number;
  densityWeight: number;
  slipSquaredNumerator: number;
  densityWeightedRms: number;
  meanInstantaneousRms: number;
  rmsInstantaneousRms: number;
  maximumInstantaneousRms: number;
  maximumPointwise: number;
}

export interface SlipWindowSummary {
  core: SlipRegionSummary;
  transition: SlipRegionSummary;
}

export interface DirectionCompatibility {
  signedChanges: readonly [number, number];
  relativeChanges: readonly [number, number];
  nearPlatform: boolean;
  sameNonzeroDirection: boolean;
  pass: boolean;
}

function requireFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`A8Q ${label} must be finite`);
  }
  return value;
}

function requireFinitePositive(value: number, label: string): number {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new RangeError(`A8Q ${label} must be finite and positive`);
  }
  return value;
}

function asFloat64Array(
  value: unknown,
  cells: number,
  label: string,
): Float64Array {
  if (!(value instanceof Float64Array) || value.length !== cells) {
    throw new Error(`A8Q formal ${label} runtime view is unavailable`);
  }
  return value;
}

/**
 * Candidate-only, read-only view of the arrays already computed by the frozen
 * formal solver. boundaryMassFlux is used solely to make its macro cache
 * current. The adapter never writes an array and is tested against the public
 * macroscopicCopies API before any A8Q research execution.
 */
export function formalMacroscopicView(
  solver: D2Q9MrtBrinkmanSolver,
  body: LbmBodyKinematics,
): FormalMacroscopicView {
  solver.boundaryMassFlux(body);
  const runtime = solver as unknown as FormalRuntimeArrays;
  return {
    rho: asFloat64Array(runtime.rho, solver.cells, "rho"),
    ux: asFloat64Array(runtime.ux, solver.cells, "ux"),
    uy: asFloat64Array(runtime.uy, solver.cells, "uy"),
    mask: asFloat64Array(runtime.mask, solver.cells, "mask"),
  };
}

export function digestFloat64Array(values: Float64Array): string {
  const bytes = new Uint8Array(
    values.buffer,
    values.byteOffset,
    values.byteLength,
  );
  let hash = 0x811c9dc5;
  for (const value of bytes) {
    hash ^= value;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildFieldDiagnosticLayout(
  view: FormalMacroscopicView,
  nominalDiameterCells: number,
): FieldDiagnosticLayout {
  if (!Number.isInteger(nominalDiameterCells) || nominalDiameterCells <= 0) {
    throw new RangeError("A8Q nominal diameter must be a positive integer");
  }
  if (view.rho.length !== view.ux.length
    || view.rho.length !== view.uy.length
    || view.rho.length !== view.mask.length) {
    throw new RangeError("A8Q macroscopic arrays must have equal lengths");
  }
  let effectiveMaskArea = 0;
  let coreCellCount = 0;
  let transitionCellCount = 0;
  for (let cell = 0; cell < view.mask.length; cell += 1) {
    const mask = view.mask[cell] ?? Number.NaN;
    if (!Number.isFinite(mask) || mask < -1e-12 || mask > 1 + 1e-12) {
      throw new RangeError(`A8Q invalid mask at cell ${cell}`);
    }
    effectiveMaskArea += mask;
    if (mask >= CONTRACT.diagnostics.coreMaskMinimumInclusive) {
      coreCellCount += 1;
    } else if (
      mask > CONTRACT.diagnostics.transitionMaskMinimumExclusive
      && mask < CONTRACT.diagnostics.transitionMaskMaximumExclusive
    ) {
      transitionCellCount += 1;
    }
  }
  requireFinitePositive(effectiveMaskArea, "effective mask area");
  if (coreCellCount === 0 || transitionCellCount === 0) {
    throw new RangeError("A8Q core and transition regions must be nonempty");
  }
  const equivalentDiameterCells = Math.sqrt(
    4 * effectiveMaskArea / Math.PI,
  );
  const relativeGeometryDeviation = (
    equivalentDiameterCells - nominalDiameterCells
  ) / nominalDiameterCells;
  return {
    cells: view.mask.length,
    maskValues: view.mask.slice(),
    maskDigestFnv1a32: digestFloat64Array(view.mask),
    effectiveMaskArea,
    equivalentDiameterCells,
    relativeGeometryDeviation,
    absoluteRelativeGeometryDeviation: Math.abs(relativeGeometryDeviation),
    coreCellCount,
    transitionCellCount,
  };
}

export function captureFieldDiagnostic(
  view: FormalMacroscopicView,
  layout: FieldDiagnosticLayout,
  inletVelocity: number,
  solidVelocityX = 0,
  solidVelocityY = 0,
): FieldDiagnosticSnapshot {
  requireFinitePositive(inletVelocity, "inlet velocity normalization");
  let fictitiousMomentumX = 0;
  let fictitiousMomentumY = 0;
  let minimumDensity = Number.POSITIVE_INFINITY;
  let maximumDensity = Number.NEGATIVE_INFINITY;
  let maximumSpeed = 0;
  let coreDensityWeight = 0;
  let coreSlipSquaredNumerator = 0;
  let coreSlipMaximum = 0;
  let transitionDensityWeight = 0;
  let transitionSlipSquaredNumerator = 0;
  let transitionSlipMaximum = 0;
  if (view.rho.length !== layout.cells
    || view.ux.length !== layout.cells
    || view.uy.length !== layout.cells
    || view.mask.length !== layout.cells) {
    throw new RangeError("A8Q field size differs from its frozen layout");
  }
  for (let cell = 0; cell < layout.cells; cell += 1) {
    const density = view.rho[cell] ?? Number.NaN;
    const velocityX = view.ux[cell] ?? Number.NaN;
    const velocityY = view.uy[cell] ?? Number.NaN;
    const mask = view.mask[cell] ?? Number.NaN;
    if (!(density > 0) || !Number.isFinite(density)
      || !Number.isFinite(velocityX) || !Number.isFinite(velocityY)
      || !Object.is(mask, layout.maskValues[cell])) {
      throw new RangeError(`A8Q invalid or changed field at cell ${cell}`);
    }
    const slipX = velocityX - solidVelocityX;
    const slipY = velocityY - solidVelocityY;
    const slipSquared = slipX * slipX + slipY * slipY;
    const normalizedSlip = Math.sqrt(slipSquared) / inletVelocity;
    fictitiousMomentumX += mask * density * velocityX;
    fictitiousMomentumY += mask * density * velocityY;
    minimumDensity = Math.min(minimumDensity, density);
    maximumDensity = Math.max(maximumDensity, density);
    maximumSpeed = Math.max(maximumSpeed, Math.hypot(velocityX, velocityY));
    if (mask >= CONTRACT.diagnostics.coreMaskMinimumInclusive) {
      coreDensityWeight += density;
      coreSlipSquaredNumerator += density * slipSquared;
      coreSlipMaximum = Math.max(coreSlipMaximum, normalizedSlip);
    } else if (
      mask > CONTRACT.diagnostics.transitionMaskMinimumExclusive
      && mask < CONTRACT.diagnostics.transitionMaskMaximumExclusive
    ) {
      transitionDensityWeight += density;
      transitionSlipSquaredNumerator += density * slipSquared;
      transitionSlipMaximum = Math.max(
        transitionSlipMaximum,
        normalizedSlip,
      );
    }
  }
  requireFinitePositive(coreDensityWeight, "core density weight");
  requireFinitePositive(transitionDensityWeight, "transition density weight");
  const velocitySquared = inletVelocity * inletVelocity;
  return {
    fictitiousMomentumX: requireFinite(
      fictitiousMomentumX,
      "fictitious momentum x",
    ),
    fictitiousMomentumY: requireFinite(
      fictitiousMomentumY,
      "fictitious momentum y",
    ),
    minimumDensity: requireFinite(minimumDensity, "minimum density"),
    maximumDensity: requireFinite(maximumDensity, "maximum density"),
    maximumSpeed: requireFinite(maximumSpeed, "maximum speed"),
    coreDensityWeight,
    coreSlipSquaredNumerator,
    coreSlipRms: Math.sqrt(
      coreSlipSquaredNumerator / (velocitySquared * coreDensityWeight),
    ),
    coreSlipMaximum,
    transitionDensityWeight,
    transitionSlipSquaredNumerator,
    transitionSlipRms: Math.sqrt(
      transitionSlipSquaredNumerator
        / (velocitySquared * transitionDensityWeight),
    ),
    transitionSlipMaximum,
  };
}

export function relativeDifference(
  first: number,
  second: number,
  floor = 1e-12,
): number {
  return Math.abs(first - second)
    / Math.max(Math.abs(first), Math.abs(second), floor);
}

export function summarizeVectorCoefficients(
  records: readonly VectorCoefficientRecord[],
): VectorCoefficientSummary {
  if (records.length < 4) {
    throw new RangeError("A8Q force summary requires at least four samples");
  }
  let meanX = 0;
  let meanY = 0;
  for (const record of records) {
    meanX += requireFinite(record.x, "force coefficient x");
    meanY += requireFinite(record.y, "force coefficient y");
  }
  meanX /= records.length;
  meanY /= records.length;
  let squareX = 0;
  let squareY = 0;
  let fluctuationSquareX = 0;
  let fluctuationSquareY = 0;
  for (const record of records) {
    squareX += record.x * record.x;
    squareY += record.y * record.y;
    fluctuationSquareX += (record.x - meanX) ** 2;
    fluctuationSquareY += (record.y - meanY) ** 2;
  }
  return {
    samples: records.length,
    meanX,
    meanY,
    rmsX: Math.sqrt(squareX / records.length),
    rmsY: Math.sqrt(squareY / records.length),
    fluctuationRmsX: Math.sqrt(fluctuationSquareX / records.length),
    fluctuationRmsY: Math.sqrt(fluctuationSquareY / records.length),
  };
}

function summarizeSlipRegion(
  records: readonly SlipTraceRecord[],
  region: "core" | "transition",
  inletVelocity: number,
): SlipRegionSummary {
  if (records.length < 4) {
    throw new RangeError("A8Q slip summary requires at least four samples");
  }
  let densityWeight = 0;
  let slipSquaredNumerator = 0;
  let instantaneousSum = 0;
  let instantaneousSquareSum = 0;
  let maximumInstantaneousRms = 0;
  let maximumPointwise = 0;
  for (const record of records) {
    const recordDensity = region === "core"
      ? record.coreDensityWeight
      : record.transitionDensityWeight;
    const recordNumerator = region === "core"
      ? record.coreSlipSquaredNumerator
      : record.transitionSlipSquaredNumerator;
    const instantaneousRms = region === "core"
      ? record.coreSlipRms
      : record.transitionSlipRms;
    const pointwise = region === "core"
      ? record.coreSlipMaximum
      : record.transitionSlipMaximum;
    densityWeight += requireFinitePositive(
      recordDensity,
      `${region} trace density weight`,
    );
    slipSquaredNumerator += requireFinite(
      recordNumerator,
      `${region} trace numerator`,
    );
    instantaneousSum += requireFinite(
      instantaneousRms,
      `${region} instantaneous RMS`,
    );
    instantaneousSquareSum += instantaneousRms * instantaneousRms;
    maximumInstantaneousRms = Math.max(
      maximumInstantaneousRms,
      instantaneousRms,
    );
    maximumPointwise = Math.max(
      maximumPointwise,
      requireFinite(pointwise, `${region} pointwise slip`),
    );
  }
  return {
    samples: records.length,
    densityWeight,
    slipSquaredNumerator,
    densityWeightedRms: Math.sqrt(
      slipSquaredNumerator
        / (inletVelocity * inletVelocity * densityWeight),
    ),
    meanInstantaneousRms: instantaneousSum / records.length,
    rmsInstantaneousRms: Math.sqrt(
      instantaneousSquareSum / records.length,
    ),
    maximumInstantaneousRms,
    maximumPointwise,
  };
}

export function summarizeSlipTrace(
  records: readonly SlipTraceRecord[],
  inletVelocity: number,
): SlipWindowSummary {
  requireFinitePositive(inletVelocity, "slip summary velocity");
  return {
    core: summarizeSlipRegion(records, "core", inletVelocity),
    transition: summarizeSlipRegion(records, "transition", inletVelocity),
  };
}

export function directionCompatibility(
  coarse: readonly [number, number],
  fine: readonly [number, number],
  threshold = CONTRACT.gates.fixedEtaPath
    .directionNearPlatformRelativeThreshold,
): DirectionCompatibility {
  const signedChanges = [
    requireFinite(fine[0] - coarse[0], "first signed change"),
    requireFinite(fine[1] - coarse[1], "second signed change"),
  ] as const;
  const relativeChanges = [
    relativeDifference(coarse[0], fine[0]),
    relativeDifference(coarse[1], fine[1]),
  ] as const;
  const nearPlatform = relativeChanges.every((value) => value <= threshold);
  const firstSign = Math.sign(signedChanges[0]);
  const secondSign = Math.sign(signedChanges[1]);
  const sameNonzeroDirection = firstSign !== 0 && firstSign === secondSign;
  return {
    signedChanges,
    relativeChanges,
    nearPlatform,
    sameNonzeroDirection,
    pass: nearPlatform || sameNonzeroDirection,
  };
}

export function assertFiniteTree(value: unknown, path = "record"): void {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new RangeError(`${path} is non-finite`);
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
