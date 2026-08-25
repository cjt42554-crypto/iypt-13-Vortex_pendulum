import {
  DOMAIN_LENGTH_DIAMETERS,
  DOMAIN_WIDTH_DIAMETERS,
  UPSTREAM_DIAMETERS,
} from "./benchmark-contract.ts";

export interface FixedCylinderGeometryInput {
  diameterCells: number;
  domainLengthDiameters?: number;
  domainWidthDiameters?: number;
  upstreamDiameters?: number;
}

export interface ResolvedFixedCylinderGeometry {
  domainLengthDiameters: number;
  domainWidthDiameters: number;
  upstreamDiameters: number;
  downstreamDiameters: number;
  nx: number;
  ny: number;
}

export function resolveFixedCylinderGeometry(
  definition: FixedCylinderGeometryInput,
): ResolvedFixedCylinderGeometry {
  const domainLengthDiameters = definition.domainLengthDiameters
    ?? DOMAIN_LENGTH_DIAMETERS;
  const domainWidthDiameters = definition.domainWidthDiameters
    ?? DOMAIN_WIDTH_DIAMETERS;
  const upstreamDiameters = definition.upstreamDiameters ?? UPSTREAM_DIAMETERS;
  const downstreamDiameters = domainLengthDiameters - upstreamDiameters;
  const nx = domainLengthDiameters * definition.diameterCells;
  const ny = domainWidthDiameters * definition.diameterCells;
  if (!Number.isInteger(definition.diameterCells) || definition.diameterCells <= 0
    || !Number.isFinite(domainLengthDiameters) || domainLengthDiameters <= 0
    || !Number.isFinite(domainWidthDiameters) || domainWidthDiameters <= 0
    || !Number.isFinite(upstreamDiameters) || upstreamDiameters <= 0
    || downstreamDiameters <= 0
    || !Number.isInteger(nx) || !Number.isInteger(ny)) {
    throw new RangeError(
      "fixed-cylinder geometry must resolve to a positive integer grid",
    );
  }
  return {
    domainLengthDiameters,
    domainWidthDiameters,
    upstreamDiameters,
    downstreamDiameters,
    nx,
    ny,
  };
}
