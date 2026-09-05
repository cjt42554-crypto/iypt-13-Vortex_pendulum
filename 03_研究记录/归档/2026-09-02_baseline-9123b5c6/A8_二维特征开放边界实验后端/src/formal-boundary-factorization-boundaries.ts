import {
  LATTICE_SOUND_SPEED,
  type LbmCheckpoint,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import {
  CS2,
  fillRegularizedState,
  type PrimitiveState,
  type StressTensor,
} from "./d2q9.ts";
import type { Stability } from "./formal-boundary-factorization-types.ts";

export interface BoundaryDefinition {
  nx: number;
  ny: number;
  relaxationTime: number;
}

export interface BoundaryField {
  rho: Float64Array;
  ux: Float64Array;
  uy: Float64Array;
  mask: Float64Array;
}

export interface MutableEnvelope {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumMach: number;
  maximumMachStep: number;
  minimumDensity: number;
  maximumDensity: number;
  densityExtremum?: Stability["densityExtremum"];
}

export function rampVelocity(target: number, rampSteps: number, step: number): number {
  if (step <= 0) return 0;
  if (step >= rampSteps) return target;
  return 0.5 * target * (1 - Math.cos(Math.PI * step / rampSteps));
}

export function applyRegularizedBoundary(
  checkpoint: LbmCheckpoint,
  definition: BoundaryDefinition,
  pre: BoundaryField,
  x: number,
  targets: PrimitiveState[],
  side: "left" | "right",
): void {
  const { nx, ny, relaxationTime } = definition;
  if (targets.length !== ny) throw new RangeError("boundary target length mismatch");
  const targetUx = Float64Array.from(targets, (state) => state.ux);
  const targetUy = Float64Array.from(targets, (state) => state.uy);
  for (let y = 0; y < ny; y += 1) {
    const state = targets[y];
    if (state === undefined || !(state.rho > 0)
      || !Number.isFinite(state.rho)
      || !Number.isFinite(state.ux)
      || !Number.isFinite(state.uy)) {
      throw new RangeError(`invalid regularized target at y=${y}`);
    }
    const lower = (y - 1 + ny) % ny;
    const upper = (y + 1) % ny;
    const dudy = 0.5 * ((targetUx[upper] ?? 0) - (targetUx[lower] ?? 0));
    const dvdy = 0.5 * ((targetUy[upper] ?? 0) - (targetUy[lower] ?? 0));
    let dudx: number;
    let dvdx: number;
    if (side === "right") {
      const first = nx - 2 + nx * y;
      const second = nx - 3 + nx * y;
      dudx = 0.5 * (
        3 * state.ux - 4 * (pre.ux[first] ?? state.ux)
        + (pre.ux[second] ?? state.ux)
      );
      dvdx = 0.5 * (
        3 * state.uy - 4 * (pre.uy[first] ?? state.uy)
        + (pre.uy[second] ?? state.uy)
      );
    } else {
      const first = 1 + nx * y;
      const second = 2 + nx * y;
      dudx = 0.5 * (
        -3 * state.ux + 4 * (pre.ux[first] ?? state.ux)
        - (pre.ux[second] ?? state.ux)
      );
      dvdx = 0.5 * (
        -3 * state.uy + 4 * (pre.uy[first] ?? state.uy)
        - (pre.uy[second] ?? state.uy)
      );
    }
    const stress: StressTensor = {
      xx: -2 * state.rho * CS2 * relaxationTime * dudx,
      xy: -state.rho * CS2 * relaxationTime * (dudy + dvdx),
      yy: -2 * state.rho * CS2 * relaxationTime * dvdy,
    };
    fillRegularizedState(
      checkpoint.distributions,
      9 * (x + nx * y),
      state,
      stress,
    );
  }
}

export function emptyEnvelope(): MutableEnvelope {
  return {
    maximumDensityDeviation: 0,
    maximumDensityDeviationStep: 0,
    maximumMach: 0,
    maximumMachStep: 0,
    minimumDensity: Number.POSITIVE_INFINITY,
    maximumDensity: Number.NEGATIVE_INFINITY,
  };
}

export function updateEnvelope(
  envelope: MutableEnvelope,
  field: BoundaryField,
  nx: number,
  step: number,
): void {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  let maximumSpeed = 0;
  let minimumCell = 0;
  let maximumCell = 0;
  for (let cell = 0; cell < field.rho.length; cell += 1) {
    const density = field.rho[cell] ?? 0;
    const speed = Math.hypot(field.ux[cell] ?? 0, field.uy[cell] ?? 0);
    if (density < minimum) {
      minimum = density;
      minimumCell = cell;
    }
    if (density > maximum) {
      maximum = density;
      maximumCell = cell;
    }
    maximumSpeed = Math.max(maximumSpeed, speed);
  }
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)
    || !Number.isFinite(maximumSpeed)) {
    throw new RangeError("A8K macroscopic field became non-finite");
  }
  const lowDeviation = Math.abs(minimum - 1);
  const highDeviation = Math.abs(maximum - 1);
  const useHigh = highDeviation >= lowDeviation;
  const deviation = useHigh ? highDeviation : lowDeviation;
  if (deviation > envelope.maximumDensityDeviation) {
    const cell = useHigh ? maximumCell : minimumCell;
    envelope.maximumDensityDeviation = deviation;
    envelope.maximumDensityDeviationStep = step;
    envelope.densityExtremum = {
      kind: useHigh ? "maximum" : "minimum",
      density: useHigh ? maximum : minimum,
      x: cell % nx,
      y: Math.floor(cell / nx),
      brinkmanMaskIndicator: field.mask[cell] ?? 0,
    };
  }
  const mach = maximumSpeed / LATTICE_SOUND_SPEED;
  if (mach > envelope.maximumMach) {
    envelope.maximumMach = mach;
    envelope.maximumMachStep = step;
  }
  envelope.minimumDensity = Math.min(envelope.minimumDensity, minimum);
  envelope.maximumDensity = Math.max(envelope.maximumDensity, maximum);
}

export function finishEnvelope(envelope: MutableEnvelope): Stability {
  if (envelope.densityExtremum === undefined) throw new Error("empty A8K envelope");
  return { ...envelope, densityExtremum: envelope.densityExtremum };
}
