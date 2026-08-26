import type { LbmCheckpoint } from
  "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import {
  applyRegularizedBoundary,
  type BoundaryField,
} from "./formal-boundary-factorization-boundaries.ts";
import {
  equilibrium,
  macroscopic,
  regularizedNonequilibrium,
  type PrimitiveState,
  type StressTensor,
} from "./d2q9.ts";
import type {
  CaseDefinition,
  InletMechanismStrategy,
} from "./formal-inlet-mechanism-types.ts";

export interface AppliedBoundaryRow {
  y: number;
  target: PrimitiveState;
  actual: PrimitiveState;
}

const INCOMING_DIRECTIONS = [1, 5, 8] as const;

export function deriveFormalZouHeInletDensity(
  distributions: ArrayLike<number>,
  offset: number,
  targetUx: number,
): number {
  const f0 = distributions[offset] ?? 0;
  const f2 = distributions[offset + 2] ?? 0;
  const f3 = distributions[offset + 3] ?? 0;
  const f4 = distributions[offset + 4] ?? 0;
  const f6 = distributions[offset + 6] ?? 0;
  const f7 = distributions[offset + 7] ?? 0;
  const density = (f0 + f2 + f4 + 2 * (f3 + f6 + f7)) / (1 - targetUx);
  if (!(density > 0) || !Number.isFinite(density)) {
    throw new RangeError(`invalid derived inlet density: ${density}`);
  }
  return density;
}

function leftRegularizedStress(
  definition: CaseDefinition,
  pre: BoundaryField,
  targets: PrimitiveState[],
  y: number,
): StressTensor {
  const state = targets[y];
  if (state === undefined) throw new Error("missing A8L regularized target");
  const lower = (y - 1 + definition.ny) % definition.ny;
  const upper = (y + 1) % definition.ny;
  const dudy = 0.5 * (
    (targets[upper]?.ux ?? state.ux) - (targets[lower]?.ux ?? state.ux)
  );
  const dvdy = 0.5 * (
    (targets[upper]?.uy ?? state.uy) - (targets[lower]?.uy ?? state.uy)
  );
  const first = 1 + definition.nx * y;
  const second = 2 + definition.nx * y;
  const dudx = 0.5 * (
    -3 * state.ux + 4 * (pre.ux[first] ?? state.ux)
    - (pre.ux[second] ?? state.ux)
  );
  const dvdx = 0.5 * (
    -3 * state.uy + 4 * (pre.uy[first] ?? state.uy)
    - (pre.uy[second] ?? state.uy)
  );
  return {
    xx: -2 * state.rho * (1 / 3) * definition.relaxationTime * dudx,
    xy: -state.rho * (1 / 3) * definition.relaxationTime * (dudy + dvdx),
    yy: -2 * state.rho * (1 / 3) * definition.relaxationTime * dvdy,
  };
}

function fillEquilibriumState(
  destination: Float64Array,
  offset: number,
  state: PrimitiveState,
): void {
  for (let direction = 0; direction < 9; direction += 1) {
    destination[offset + direction] = equilibrium(
      direction,
      state.rho,
      state.ux,
      state.uy,
    );
  }
}

function replaceIncomingWithEquilibrium(
  destination: Float64Array,
  offset: number,
  state: PrimitiveState,
): void {
  for (const direction of INCOMING_DIRECTIONS) {
    destination[offset + direction] = equilibrium(
      direction,
      state.rho,
      state.ux,
      state.uy,
    );
  }
}

function replaceIncomingWithRegularized(
  destination: Float64Array,
  offset: number,
  state: PrimitiveState,
  stress: StressTensor,
): void {
  for (const direction of INCOMING_DIRECTIONS) {
    destination[offset + direction] = equilibrium(
      direction,
      state.rho,
      state.ux,
      state.uy,
    ) + regularizedNonequilibrium(direction, stress);
  }
}

function usesFixedDensity(strategy: InletMechanismStrategy): boolean {
  return strategy === "legacy-zou-he-density-normalized"
    || strategy === "full-equilibrium-fixed-density"
    || strategy === "full-regularized-fixed-density";
}

export function applyInletMechanism(
  checkpoint: LbmCheckpoint,
  definition: CaseDefinition,
  pre: BoundaryField,
  targetUx: number,
): AppliedBoundaryRow[] {
  const derivedDensity = new Float64Array(definition.ny);
  for (let y = 0; y < definition.ny; y += 1) {
    derivedDensity[y] = deriveFormalZouHeInletDensity(
      checkpoint.distributions,
      9 * definition.nx * y,
      targetUx,
    );
  }
  const targets = Array.from({ length: definition.ny }, (_, y): PrimitiveState => ({
    rho: usesFixedDensity(definition.strategy) ? 1 : derivedDensity[y] ?? 1,
    ux: targetUx,
    uy: 0,
  }));

  if (definition.strategy === "legacy-zou-he-density-normalized") {
    for (let y = 0; y < definition.ny; y += 1) {
      const offset = 9 * definition.nx * y;
      const actual = macroscopic(checkpoint.distributions, offset);
      const scale = 1 / actual.rho;
      for (let direction = 0; direction < 9; direction += 1) {
        checkpoint.distributions[offset + direction]
          = (checkpoint.distributions[offset + direction] ?? 0) * scale;
      }
    }
  } else if (definition.strategy === "incoming-equilibrium-derived-density"
    || definition.strategy === "incoming-regularized-derived-density") {
    for (let y = 0; y < definition.ny; y += 1) {
      const offset = 9 * definition.nx * y;
      const target = targets[y];
      if (target === undefined) throw new Error("missing A8L inlet target");
      if (definition.strategy === "incoming-equilibrium-derived-density") {
        replaceIncomingWithEquilibrium(checkpoint.distributions, offset, target);
      } else {
        replaceIncomingWithRegularized(
          checkpoint.distributions,
          offset,
          target,
          leftRegularizedStress(definition, pre, targets, y),
        );
      }
    }
  } else if (definition.strategy === "full-equilibrium-derived-density"
    || definition.strategy === "full-equilibrium-fixed-density") {
    for (let y = 0; y < definition.ny; y += 1) {
      const target = targets[y];
      if (target === undefined) throw new Error("missing A8L inlet target");
      fillEquilibriumState(
        checkpoint.distributions,
        9 * definition.nx * y,
        target,
      );
    }
  } else if (definition.strategy === "full-regularized-derived-density"
    || definition.strategy === "full-regularized-fixed-density") {
    applyRegularizedBoundary(
      checkpoint,
      definition,
      pre,
      0,
      targets,
      "left",
    );
  } else if (definition.strategy !== "legacy-zou-he-derived-density") {
    const exhaustive: never = definition.strategy;
    throw new Error(`unsupported A8L inlet strategy: ${String(exhaustive)}`);
  }

  return targets.map((target, y) => ({
    y,
    target,
    actual: macroscopic(checkpoint.distributions, 9 * definition.nx * y),
  }));
}
