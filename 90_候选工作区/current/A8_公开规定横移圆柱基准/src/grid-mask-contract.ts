import {
  BASELINE_ETA_HAT,
  BASELINE_MASK_HALF_THICKNESS,
  type SensitivityGroup,
} from "./fixed-sensitivity-contract.ts";
import type { FixedCylinderCaseDefinition } from "./fixed-cylinder-case-runner.ts";

export const GRID_MASK_DIAMETERS = [12, 16, 20] as const;
export const GRID_MASK_HALF_THICKNESSES = [0.5, BASELINE_MASK_HALF_THICKNESS] as const;
export const GRID_MASK_LATTICE_VELOCITY = 0.05;
export const GRID_MASK_FIXED_DURATION = 80;
export const GRID_MASK_DISCARD_DURATION = 40;
export const GRID_MASK_FINE_CHANGE_TOLERANCE = 0.05;
export const GRID_MASK_CROSS_FAMILY_TOLERANCE = 0.05;
export const GRID_MASK_REFERENCE_REPRODUCTION_TOLERANCE = 1e-12;
export const GRID_MASK_EXTENSION_DIAMETERS = [20, 24] as const;

export interface ThreePointPowerFit {
  apparentOrder: number;
  extrapolatedValue: number;
  fineCorrectionRelative: number;
}

function groupForMask(maskHalfThickness: number): SensitivityGroup {
  return maskHalfThickness === BASELINE_MASK_HALF_THICKNESS
    ? "baseline"
    : "mask-half-thickness";
}

export function gridMaskDefinitions(
  profile: "smoke" | "research",
): readonly FixedCylinderCaseDefinition[] {
  if (profile === "smoke") {
    return GRID_MASK_HALF_THICKNESSES.map((maskHalfThickness) => ({
      id: `d08-mask-${maskHalfThickness.toFixed(2).replace(".", "p")}`,
      group: groupForMask(maskHalfThickness),
      diameterCells: 8,
      latticeVelocity: GRID_MASK_LATTICE_VELOCITY,
      fixedConvectiveDuration: 12,
      discardConvectiveTime: 6,
      phaseOffsetX: 0,
      phaseOffsetY: 0,
      maskHalfThickness,
      etaHat: BASELINE_ETA_HAT,
    }));
  }
  return GRID_MASK_HALF_THICKNESSES.flatMap((maskHalfThickness) => (
    GRID_MASK_DIAMETERS.map((diameterCells) => ({
      id: `d${diameterCells.toString().padStart(2, "0")}-mask-${maskHalfThickness.toFixed(2).replace(".", "p")}`,
      group: groupForMask(maskHalfThickness),
      diameterCells,
      latticeVelocity: GRID_MASK_LATTICE_VELOCITY,
      fixedConvectiveDuration: GRID_MASK_FIXED_DURATION,
      discardConvectiveTime: GRID_MASK_DISCARD_DURATION,
      phaseOffsetX: 0,
      phaseOffsetY: 0,
      maskHalfThickness,
      etaHat: BASELINE_ETA_HAT,
    }))
  ));
}

export function gridMaskExtensionDefinitions(): readonly FixedCylinderCaseDefinition[] {
  return GRID_MASK_HALF_THICKNESSES.flatMap((maskHalfThickness) => (
    GRID_MASK_EXTENSION_DIAMETERS.map((diameterCells) => ({
      id: `d${diameterCells.toString().padStart(2, "0")}-mask-${maskHalfThickness.toFixed(2).replace(".", "p")}`,
      group: groupForMask(maskHalfThickness),
      diameterCells,
      latticeVelocity: GRID_MASK_LATTICE_VELOCITY,
      fixedConvectiveDuration: GRID_MASK_FIXED_DURATION,
      discardConvectiveTime: GRID_MASK_DISCARD_DURATION,
      phaseOffsetX: 0,
      phaseOffsetY: 0,
      maskHalfThickness,
      etaHat: BASELINE_ETA_HAT,
    }))
  ));
}

export function relativeDifference(
  first: number,
  second: number,
  floor = 1e-12,
): number {
  return Math.abs(first - second) / Math.max(Math.abs(first), Math.abs(second), floor);
}

export function threePointPowerFit(
  diameters: readonly [number, number, number],
  values: readonly [number, number, number],
): ThreePointPowerFit | null {
  const [n1, n2, n3] = diameters;
  const [value1, value2, value3] = values;
  if (!(n1 < n2 && n2 < n3) || !values.every(Number.isFinite)) return null;
  const firstDifference = value1 - value2;
  const secondDifference = value2 - value3;
  if (firstDifference === 0 || secondDifference === 0
    || Math.sign(firstDifference) !== Math.sign(secondDifference)) return null;
  const observedRatio = firstDifference / secondDifference;
  const h1 = 1 / n1;
  const h2 = 1 / n2;
  const h3 = 1 / n3;
  const residual = (order: number) => (
    (h1 ** order - h2 ** order) / (h2 ** order - h3 ** order)
      - observedRatio
  );
  let lower = 1e-6;
  let upper = 12;
  let lowerResidual = residual(lower);
  let upperResidual = residual(upper);
  if (!Number.isFinite(lowerResidual) || !Number.isFinite(upperResidual)
    || Math.sign(lowerResidual) === Math.sign(upperResidual)) return null;
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const middle = 0.5 * (lower + upper);
    const middleResidual = residual(middle);
    if (Math.abs(middleResidual) < 1e-13) {
      lower = middle;
      upper = middle;
      break;
    }
    if (Math.sign(middleResidual) === Math.sign(lowerResidual)) {
      lower = middle;
      lowerResidual = middleResidual;
    } else {
      upper = middle;
      upperResidual = middleResidual;
    }
  }
  const apparentOrder = 0.5 * (lower + upper);
  const refinementRatio = n3 / n2;
  const denominator = refinementRatio ** apparentOrder - 1;
  if (!(denominator > 0) || !Number.isFinite(denominator)) return null;
  const extrapolatedValue = value3 + (value3 - value2) / denominator;
  return {
    apparentOrder,
    extrapolatedValue,
    fineCorrectionRelative: Math.abs(extrapolatedValue - value3)
      / Math.max(Math.abs(extrapolatedValue), 1e-12),
  };
}
