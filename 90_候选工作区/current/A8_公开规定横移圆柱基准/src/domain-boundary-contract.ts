import {
  BASELINE_ETA_HAT,
  BASELINE_MASK_HALF_THICKNESS,
  type SensitivityGroup,
} from "./fixed-sensitivity-contract.ts";
import type { FixedCylinderCaseDefinition } from "./fixed-cylinder-case-runner.ts";

export const DOMAIN_AUDIT_MASK_HALF_THICKNESSES = [
  0.5,
  BASELINE_MASK_HALF_THICKNESS,
] as const;
export const DOMAIN_AUDIT_LATTICE_VELOCITY = 0.05;
export const DOMAIN_AUDIT_RESEARCH_DIAMETER_CELLS = 16;
export const DOMAIN_AUDIT_RESEARCH_FIXED_DURATION = 80;
export const DOMAIN_AUDIT_RESEARCH_DISCARD_DURATION = 40;
export const DOMAIN_AUDIT_SMOKE_DIAMETER_CELLS = 8;
export const DOMAIN_AUDIT_SMOKE_FIXED_DURATION = 12;
export const DOMAIN_AUDIT_SMOKE_DISCARD_DURATION = 6;
export const DOMAIN_AUDIT_RELATIVE_LOAD_TOLERANCE = 0.05;
export const DOMAIN_AUDIT_REFERENCE_REPRODUCTION_TOLERANCE = 1e-12;

export type DomainGeometryAxis =
  | "baseline"
  | "crossflow-width"
  | "outlet-distance"
  | "inlet-distance";

export interface DomainGeometryVariant {
  id: string;
  axis: DomainGeometryAxis;
  domainLengthDiameters: number;
  domainWidthDiameters: number;
  upstreamDiameters: number;
}

export const SOURCE_DOMAIN_GEOMETRY: DomainGeometryVariant = {
  id: "source-domain",
  axis: "baseline",
  domainLengthDiameters: 23,
  domainWidthDiameters: 10,
  upstreamDiameters: 3.5,
};

export const DOMAIN_GEOMETRY_VARIANTS: readonly DomainGeometryVariant[] = [
  SOURCE_DOMAIN_GEOMETRY,
  {
    ...SOURCE_DOMAIN_GEOMETRY,
    id: "width-15d",
    axis: "crossflow-width",
    domainWidthDiameters: 15,
  },
  {
    ...SOURCE_DOMAIN_GEOMETRY,
    id: "width-20d",
    axis: "crossflow-width",
    domainWidthDiameters: 20,
  },
  {
    ...SOURCE_DOMAIN_GEOMETRY,
    id: "outlet-26p5d",
    axis: "outlet-distance",
    domainLengthDiameters: 30,
  },
  {
    ...SOURCE_DOMAIN_GEOMETRY,
    id: "inlet-7d",
    axis: "inlet-distance",
    domainLengthDiameters: 26.5,
    upstreamDiameters: 7,
  },
] as const;

export const DOMAIN_BOUNDARY_IDENTITIES = {
  source: {
    solver: "compressible-navier-stokes-weno-overset",
    transverseBoundary: "Whitfield-Janus-characteristic-nonreflection",
    inletBoundary: "uniform-flow",
    outletBoundary: "zero-gradient",
    grid: "nonuniform-stretched-with-local-uniform-region",
  },
  current: {
    solver: "D2Q9-MRT-Brinkman-LBM",
    transverseBoundary: "periodic-crossflow",
    inletBoundary: "Zou-He-velocity",
    outletBoundary: "Zou-He-fixed-density-pressure",
    grid: "uniform-Cartesian",
  },
} as const;

function groupForMask(maskHalfThickness: number): SensitivityGroup {
  return maskHalfThickness === BASELINE_MASK_HALF_THICKNESS
    ? "baseline"
    : "mask-half-thickness";
}

function maskId(maskHalfThickness: number): string {
  return maskHalfThickness.toFixed(2).replace(".", "p");
}

export function domainGeometryDefinitions(
  profile: "smoke" | "research",
): readonly FixedCylinderCaseDefinition[] {
  const diameterCells = profile === "research"
    ? DOMAIN_AUDIT_RESEARCH_DIAMETER_CELLS
    : DOMAIN_AUDIT_SMOKE_DIAMETER_CELLS;
  const fixedConvectiveDuration = profile === "research"
    ? DOMAIN_AUDIT_RESEARCH_FIXED_DURATION
    : DOMAIN_AUDIT_SMOKE_FIXED_DURATION;
  const discardConvectiveTime = profile === "research"
    ? DOMAIN_AUDIT_RESEARCH_DISCARD_DURATION
    : DOMAIN_AUDIT_SMOKE_DISCARD_DURATION;
  return DOMAIN_AUDIT_MASK_HALF_THICKNESSES.flatMap((maskHalfThickness) => (
    DOMAIN_GEOMETRY_VARIANTS.map((geometry) => ({
      id: `d${diameterCells.toString().padStart(2, "0")}-mask-${maskId(maskHalfThickness)}-${geometry.id}`,
      group: groupForMask(maskHalfThickness),
      diameterCells,
      latticeVelocity: DOMAIN_AUDIT_LATTICE_VELOCITY,
      fixedConvectiveDuration,
      discardConvectiveTime,
      phaseOffsetX: 0,
      phaseOffsetY: 0,
      maskHalfThickness,
      etaHat: BASELINE_ETA_HAT,
      domainLengthDiameters: geometry.domainLengthDiameters,
      domainWidthDiameters: geometry.domainWidthDiameters,
      upstreamDiameters: geometry.upstreamDiameters,
    }))
  ));
}
