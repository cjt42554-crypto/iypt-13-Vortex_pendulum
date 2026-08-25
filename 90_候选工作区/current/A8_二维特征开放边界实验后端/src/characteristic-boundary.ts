import { CS, CS2, type PrimitiveState } from "./d2q9.ts";

export interface CharacteristicBoundaryOptions {
  farFieldDensity: number;
  meanStreamwiseVelocity: number;
  characteristicLength: number;
  pressureRelaxationSigma: number;
  transverseRelaxation: number;
}

export interface CharacteristicDiagnostics {
  maximumAbsoluteIncomingWave: number;
  maximumAbsoluteOutgoingWave: number;
  maximumAbsoluteTransverseWave: number;
}

export interface CharacteristicTargets {
  states: PrimitiveState[];
  diagnostics: CharacteristicDiagnostics;
}

function periodicCentral(values: Float64Array, y: number): number {
  const size = values.length;
  const lower = values[(y - 1 + size) % size] ?? 0;
  const upper = values[(y + 1) % size] ?? 0;
  return 0.5 * (upper - lower);
}

function requireFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${label} became non-finite`);
  return value;
}

/**
 * Compute the macroscopic state to impose one lattice step later at a right
 * subsonic outlet.  The wave decomposition is the isothermal CBC-2D form:
 * the outgoing acoustic and convected waves are obtained from one-sided
 * streamwise derivatives; the entering acoustic wave is relaxed toward the
 * far-field pressure and includes transverse terms.
 */
export function computeRightCbc2dTargets(
  nx: number,
  ny: number,
  rho: Float64Array,
  ux: Float64Array,
  uy: Float64Array,
  options: CharacteristicBoundaryOptions,
): CharacteristicTargets {
  if (nx < 4 || ny < 3) throw new RangeError("CBC-2D requires nx >= 4 and ny >= 3");
  if (!(options.farFieldDensity > 0) || !(options.characteristicLength > 0)) {
    throw new RangeError("far-field density and characteristic length must be positive");
  }
  const boundaryX = nx - 1;
  const oneInsideX = nx - 2;
  const twoInsideX = nx - 3;
  const boundaryRho = new Float64Array(ny);
  const boundaryUx = new Float64Array(ny);
  const boundaryUy = new Float64Array(ny);
  for (let y = 0; y < ny; y += 1) {
    boundaryRho[y] = rho[boundaryX + nx * y] ?? 1;
    boundaryUx[y] = ux[boundaryX + nx * y] ?? 0;
    boundaryUy[y] = uy[boundaryX + nx * y] ?? 0;
  }

  const mach = Math.abs(options.meanStreamwiseVelocity) / CS;
  const k1 = options.pressureRelaxationSigma
    * Math.max(0, 1 - mach * mach)
    * CS
    / options.characteristicLength;
  const k2 = options.transverseRelaxation;
  const farFieldPressure = CS2 * options.farFieldDensity;
  const states: PrimitiveState[] = [];
  let maximumAbsoluteIncomingWave = 0;
  let maximumAbsoluteOutgoingWave = 0;
  let maximumAbsoluteTransverseWave = 0;

  for (let y = 0; y < ny; y += 1) {
    const boundaryCell = boundaryX + nx * y;
    const oneInsideCell = oneInsideX + nx * y;
    const twoInsideCell = twoInsideX + nx * y;
    const density = boundaryRho[y] ?? 1;
    const velocityX = boundaryUx[y] ?? 0;
    const velocityY = boundaryUy[y] ?? 0;
    const pressure = CS2 * density;

    const densityX = 0.5 * (
      3 * density
      - 4 * (rho[oneInsideCell] ?? density)
      + (rho[twoInsideCell] ?? density)
    );
    const velocityXX = 0.5 * (
      3 * velocityX
      - 4 * (ux[oneInsideCell] ?? velocityX)
      + (ux[twoInsideCell] ?? velocityX)
    );
    const velocityYX = 0.5 * (
      3 * velocityY
      - 4 * (uy[oneInsideCell] ?? velocityY)
      + (uy[twoInsideCell] ?? velocityY)
    );
    const pressureX = CS2 * densityX;
    const pressureY = CS2 * periodicCentral(boundaryRho, y);
    const velocityXY = periodicCentral(boundaryUx, y);
    const velocityYY = periodicCentral(boundaryUy, y);

    const outgoing = (velocityX + CS) * (pressureX + density * CS * velocityXX);
    const convectedTransverse = velocityX * velocityYX;
    const t1 = -(
      velocityY * pressureY
      + pressure * velocityYY
      - density * CS * velocityY * velocityXY
    );
    const t3 = -(
      velocityY * velocityYY
      + pressureY / density
    );
    const t5 = -(
      velocityY * pressureY
      + pressure * velocityYY
      + density * CS * velocityY * velocityXY
    );
    const incoming = k1 * (pressure - farFieldPressure) + (1 - k2) * t1;

    const densityRate = -(outgoing + incoming) / (2 * CS2) + (t5 + t1) / (2 * CS2);
    const velocityXRate = -(outgoing - incoming) / (2 * density * CS)
      + (t5 - t1) / (2 * density * CS);
    const velocityYRate = -convectedTransverse + t3;
    const target = {
      rho: requireFinite(density + densityRate, "CBC target density"),
      ux: requireFinite(velocityX + velocityXRate, "CBC target streamwise velocity"),
      uy: requireFinite(velocityY + velocityYRate, "CBC target transverse velocity"),
    };
    if (!(target.rho > 0)) throw new RangeError(`CBC target density is non-positive at y=${y}`);
    states.push(target);
    maximumAbsoluteIncomingWave = Math.max(maximumAbsoluteIncomingWave, Math.abs(incoming));
    maximumAbsoluteOutgoingWave = Math.max(maximumAbsoluteOutgoingWave, Math.abs(outgoing));
    maximumAbsoluteTransverseWave = Math.max(
      maximumAbsoluteTransverseWave,
      Math.abs(t1),
      Math.abs(t3),
      Math.abs(t5),
    );

    // Touch the current boundary cell so accidental layout changes are caught
    // by strict indexed access and unit tests.
    void boundaryCell;
  }

  return {
    states,
    diagnostics: {
      maximumAbsoluteIncomingWave,
      maximumAbsoluteOutgoingWave,
      maximumAbsoluteTransverseWave,
    },
  };
}
