import {
  BASELINE_ETA_HAT,
  BASELINE_MASK_HALF_THICKNESS,
  type SensitivityGroup,
} from "./fixed-sensitivity-contract.ts";
import type { FixedCylinderCaseDefinition } from "./fixed-cylinder-case-runner.ts";

export const INLET_BRACKET_MASK_HALF_THICKNESSES = [
  0.5,
  BASELINE_MASK_HALF_THICKNESS,
] as const;
export const INLET_BRACKET_DISTANCES = [7, 10.5, 14] as const;
export const INLET_BRACKET_DOWNSTREAM_DIAMETERS = 19.5;
export const INLET_BRACKET_WIDTH_DIAMETERS = 10;
export const INLET_BRACKET_LATTICE_VELOCITY = 0.05;
export const INLET_BRACKET_RESEARCH_DIAMETER_CELLS = 16;
export const INLET_BRACKET_RESEARCH_FIXED_DURATION = 80;
export const INLET_BRACKET_RESEARCH_DISCARD_DURATION = 40;
export const INLET_BRACKET_SMOKE_DIAMETER_CELLS = 8;
export const INLET_BRACKET_SMOKE_FIXED_DURATION = 12;
export const INLET_BRACKET_SMOKE_DISCARD_DURATION = 6;
export const INLET_BRACKET_FINE_CHANGE_TOLERANCE = 0.05;
export const INLET_BRACKET_REFERENCE_REPRODUCTION_TOLERANCE = 1e-12;

function groupForMask(maskHalfThickness: number): SensitivityGroup {
  return maskHalfThickness === BASELINE_MASK_HALF_THICKNESS
    ? "baseline"
    : "mask-half-thickness";
}

function numberId(value: number): string {
  return value.toFixed(1).replace(".", "p");
}

function maskId(value: number): string {
  return value.toFixed(2).replace(".", "p");
}

export function inletDistanceDefinitions(
  profile: "smoke" | "research",
): readonly FixedCylinderCaseDefinition[] {
  const diameterCells = profile === "research"
    ? INLET_BRACKET_RESEARCH_DIAMETER_CELLS
    : INLET_BRACKET_SMOKE_DIAMETER_CELLS;
  const fixedConvectiveDuration = profile === "research"
    ? INLET_BRACKET_RESEARCH_FIXED_DURATION
    : INLET_BRACKET_SMOKE_FIXED_DURATION;
  const discardConvectiveTime = profile === "research"
    ? INLET_BRACKET_RESEARCH_DISCARD_DURATION
    : INLET_BRACKET_SMOKE_DISCARD_DURATION;
  return INLET_BRACKET_MASK_HALF_THICKNESSES.flatMap((maskHalfThickness) => (
    INLET_BRACKET_DISTANCES.map((upstreamDiameters) => ({
      id: `d${diameterCells.toString().padStart(2, "0")}-mask-${maskId(maskHalfThickness)}-inlet-${numberId(upstreamDiameters)}d`,
      group: groupForMask(maskHalfThickness),
      diameterCells,
      latticeVelocity: INLET_BRACKET_LATTICE_VELOCITY,
      fixedConvectiveDuration,
      discardConvectiveTime,
      phaseOffsetX: 0,
      phaseOffsetY: 0,
      maskHalfThickness,
      etaHat: BASELINE_ETA_HAT,
      domainLengthDiameters: upstreamDiameters
        + INLET_BRACKET_DOWNSTREAM_DIAMETERS,
      domainWidthDiameters: INLET_BRACKET_WIDTH_DIAMETERS,
      upstreamDiameters,
    }))
  ));
}
