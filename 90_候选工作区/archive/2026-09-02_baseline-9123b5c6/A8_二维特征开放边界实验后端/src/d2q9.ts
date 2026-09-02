export const CX = new Int8Array([0, 1, 0, -1, 0, 1, -1, -1, 1]);
export const CY = new Int8Array([0, 0, 1, 0, -1, 1, 1, -1, -1]);
export const OPPOSITE = new Int8Array([0, 3, 4, 1, 2, 7, 8, 5, 6]);
export const WEIGHT = new Float64Array([
  4 / 9,
  1 / 9, 1 / 9, 1 / 9, 1 / 9,
  1 / 36, 1 / 36, 1 / 36, 1 / 36,
]);

export const CS2 = 1 / 3;
export const CS = 1 / Math.sqrt(3);
export const CS4 = CS2 * CS2;

export interface PrimitiveState {
  rho: number;
  ux: number;
  uy: number;
}

export interface StressTensor {
  xx: number;
  xy: number;
  yy: number;
}

export function equilibrium(direction: number, rho: number, ux: number, uy: number): number {
  const cx = CX[direction] ?? 0;
  const cy = CY[direction] ?? 0;
  const cu = cx * ux + cy * uy;
  const speed2 = ux * ux + uy * uy;
  return (WEIGHT[direction] ?? 0) * rho * (1 + 3 * cu + 4.5 * cu * cu - 1.5 * speed2);
}

export function macroscopic(distributions: ArrayLike<number>, offset = 0): PrimitiveState {
  let rho = 0;
  let mx = 0;
  let my = 0;
  for (let direction = 0; direction < 9; direction += 1) {
    const value = distributions[offset + direction] ?? 0;
    rho += value;
    mx += value * (CX[direction] ?? 0);
    my += value * (CY[direction] ?? 0);
  }
  if (!(rho > 0) || !Number.isFinite(rho)) {
    throw new RangeError(`non-positive or non-finite density: ${rho}`);
  }
  return { rho, ux: mx / rho, uy: my / rho };
}

export function regularizedNonequilibrium(direction: number, stress: StressTensor): number {
  const cx = CX[direction] ?? 0;
  const cy = CY[direction] ?? 0;
  const contraction = (cx * cx - CS2) * stress.xx
    + 2 * cx * cy * stress.xy
    + (cy * cy - CS2) * stress.yy;
  return (WEIGHT[direction] ?? 0) * contraction / (2 * CS4);
}

export function nonequilibriumStress(
  distributions: ArrayLike<number>,
  offset: number,
  state: PrimitiveState,
): StressTensor {
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (let direction = 0; direction < 9; direction += 1) {
    const cx = CX[direction] ?? 0;
    const cy = CY[direction] ?? 0;
    const neq = (distributions[offset + direction] ?? 0)
      - equilibrium(direction, state.rho, state.ux, state.uy);
    xx += neq * cx * cx;
    xy += neq * cx * cy;
    yy += neq * cy * cy;
  }
  return { xx, xy, yy };
}

export function fillRegularizedState(
  destination: Float64Array,
  offset: number,
  state: PrimitiveState,
  stress: StressTensor,
): void {
  for (let direction = 0; direction < 9; direction += 1) {
    destination[offset + direction] = equilibrium(direction, state.rho, state.ux, state.uy)
      + regularizedNonequilibrium(direction, stress);
  }
}

export function finiteState(state: PrimitiveState): boolean {
  return state.rho > 0
    && Number.isFinite(state.rho)
    && Number.isFinite(state.ux)
    && Number.isFinite(state.uy);
}
