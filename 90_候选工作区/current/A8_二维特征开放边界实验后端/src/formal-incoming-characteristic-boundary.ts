import type { LbmCheckpoint } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { macroscopic } from "./d2q9.ts";
import { FORMAL_INCOMING_CHARACTERISTIC_CONTRACT as CONTRACT } from
  "./formal-incoming-characteristic-contract.ts";

export interface IncomingCharacteristicBoundaryRow {
  y: number;
  knownMomentK: number;
  discriminant: number;
  targetRho: number;
  targetUx: number;
  targetUy: number;
  actualRho: number;
  actualUx: number;
  actualUy: number;
  incomingCharacteristicResidual: number;
  discreteCompatibilityResidual: number;
  densityMomentResidual: number;
  uxMomentResidual: number;
  uyMomentResidual: number;
  knownPopulationMaximumAbsoluteDifference: number;
  boundaryMach: number;
}

const KNOWN_DIRECTIONS = CONTRACT.algorithmIdentity
  .knownPopulationDirectionsPreservedExactly;

function finitePositive(value: number, label: string, y: number): number {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new RangeError(`A8N ${label} must be finite and positive at y=${y}: ${value}`);
  }
  return value;
}

export function knownLeftBoundaryMoment(
  distributions: ArrayLike<number>,
  offset: number,
): number {
  const f0 = distributions[offset] ?? Number.NaN;
  const f2 = distributions[offset + 2] ?? Number.NaN;
  const f3 = distributions[offset + 3] ?? Number.NaN;
  const f4 = distributions[offset + 4] ?? Number.NaN;
  const f6 = distributions[offset + 6] ?? Number.NaN;
  const f7 = distributions[offset + 7] ?? Number.NaN;
  return f0 + f2 + f4 + 2 * (f3 + f6 + f7);
}

export function solveCompatibleIncomingCharacteristicState(
  knownMomentK: number,
  farFieldUx: number,
  y = -1,
): {
  discriminant: number;
  rho: number;
  ux: number;
  uy: 0;
} {
  finitePositive(knownMomentK, "known moment K", y);
  if (!Number.isFinite(farFieldUx)) {
    throw new RangeError(`A8N far-field ux must be finite at y=${y}: ${farFieldUx}`);
  }
  const rho0 = CONTRACT.algorithmIdentity.farFieldState.rho0;
  const cs = CONTRACT.algorithmIdentity.latticeSoundSpeed;
  const linear = 1 - farFieldUx - cs;
  const quadratic = cs / rho0;
  const discriminant = finitePositive(
    linear * linear + 4 * quadratic * knownMomentK,
    "discriminant",
    y,
  );
  const rho = finitePositive(
    (-linear + Math.sqrt(discriminant)) / (2 * quadratic),
    "density root",
    y,
  );
  const ux = 1 - knownMomentK / rho;
  if (!Number.isFinite(ux)) {
    throw new RangeError(`A8N target ux must be finite at y=${y}: ${ux}`);
  }
  const boundaryMach = Math.abs(ux) / cs;
  if (boundaryMach
    > CONTRACT.reconstructionQualification.gates.maximumBoundaryMach) {
    throw new RangeError(
      `A8N boundary Mach gate exceeded at y=${y}: ${boundaryMach}`,
    );
  }
  return { discriminant, rho, ux, uy: 0 };
}

export function applyIncomingCharacteristicBoundary(
  checkpoint: LbmCheckpoint,
  nx: number,
  ny: number,
  farFieldUx: number,
): IncomingCharacteristicBoundaryRow[] {
  if (checkpoint.nx !== nx || checkpoint.ny !== ny) {
    throw new RangeError(
      `A8N checkpoint geometry mismatch: ${checkpoint.nx}x${checkpoint.ny} != ${nx}x${ny}`,
    );
  }
  const distributions = checkpoint.distributions;
  const rows: IncomingCharacteristicBoundaryRow[] = [];
  const rho0 = CONTRACT.algorithmIdentity.farFieldState.rho0;
  const cs = CONTRACT.algorithmIdentity.latticeSoundSpeed;
  for (let y = 0; y < ny; y += 1) {
    const offset = 9 * nx * y;
    const knownBefore = KNOWN_DIRECTIONS.map((direction) =>
      distributions[offset + direction] ?? Number.NaN);
    const knownMomentK = knownLeftBoundaryMoment(distributions, offset);
    const target = solveCompatibleIncomingCharacteristicState(
      knownMomentK,
      farFieldUx,
      y,
    );
    const f2 = distributions[offset + 2] ?? Number.NaN;
    const f3 = distributions[offset + 3] ?? Number.NaN;
    const f4 = distributions[offset + 4] ?? Number.NaN;
    const f6 = distributions[offset + 6] ?? Number.NaN;
    const f7 = distributions[offset + 7] ?? Number.NaN;
    const momentum = target.rho * target.ux;
    const f1 = f3 + (2 / 3) * momentum;
    const f5 = f7 + 0.5 * (f4 - f2) + (1 / 6) * momentum;
    const f8 = f6 + 0.5 * (f2 - f4) + (1 / 6) * momentum;
    if (![f1, f5, f8].every(Number.isFinite)) {
      throw new RangeError(`A8N reconstructed a non-finite population at y=${y}`);
    }
    distributions[offset + 1] = f1;
    distributions[offset + 5] = f5;
    distributions[offset + 8] = f8;

    let knownPopulationMaximumAbsoluteDifference = 0;
    for (let index = 0; index < KNOWN_DIRECTIONS.length; index += 1) {
      const direction = KNOWN_DIRECTIONS[index];
      if (direction === undefined) throw new Error("missing A8N known direction");
      const before = knownBefore[index] ?? Number.NaN;
      const after = distributions[offset + direction] ?? Number.NaN;
      knownPopulationMaximumAbsoluteDifference = Math.max(
        knownPopulationMaximumAbsoluteDifference,
        Math.abs(after - before),
      );
    }
    const actual = macroscopic(distributions, offset);
    const incomingCharacteristicResidual = 0.5 * (
      actual.rho - rho0 + rho0 * (actual.ux - farFieldUx) / cs
    );
    const discreteCompatibilityResidual = actual.rho * (1 - actual.ux)
      - knownMomentK;
    const densityMomentResidual = actual.rho - target.rho;
    const uxMomentResidual = actual.ux - target.ux;
    const uyMomentResidual = actual.uy - target.uy;
    const boundaryMach = Math.hypot(actual.ux, actual.uy) / cs;
    const diagnosticValues = [
      actual.rho,
      actual.ux,
      actual.uy,
      incomingCharacteristicResidual,
      discreteCompatibilityResidual,
      densityMomentResidual,
      uxMomentResidual,
      uyMomentResidual,
      knownPopulationMaximumAbsoluteDifference,
      boundaryMach,
    ];
    if (!diagnosticValues.every(Number.isFinite)) {
      throw new RangeError(`A8N produced non-finite diagnostics at y=${y}`);
    }
    rows.push({
      y,
      knownMomentK,
      discriminant: target.discriminant,
      targetRho: target.rho,
      targetUx: target.ux,
      targetUy: target.uy,
      actualRho: actual.rho,
      actualUx: actual.ux,
      actualUy: actual.uy,
      incomingCharacteristicResidual,
      discreteCompatibilityResidual,
      densityMomentResidual,
      uxMomentResidual,
      uyMomentResidual,
      knownPopulationMaximumAbsoluteDifference,
      boundaryMach,
    });
  }
  return rows;
}
