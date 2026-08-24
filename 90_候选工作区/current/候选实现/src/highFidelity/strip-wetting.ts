import type { SimulationConfig } from "../../../../../02_模拟程序/src/core/types";
import { integrateWetProjection } from "../../../../../02_模拟程序/src/problems/vortex-pendulum/geometry";

export type SectionWetState = "dry" | "partial" | "touching" | "full";

/** Length tolerance, in metres, used only to classify free-surface contact. */
export const DEFAULT_CLEARANCE_TOLERANCE = 1e-12;

export interface SectionClearanceGeometry {
  /** Section-centre depth below the free surface, in metres. */
  centerDepth: number;
  /** Vertical half-span of the material circle, in metres. */
  verticalHalfExtent: number;
  /** Depth of the highest material point; positive means submerged, in metres. */
  topClearance: number;
  /** Depth of the lowest material point; positive means submerged, in metres. */
  bottomDepth: number;
}

export interface SectionWettingReport {
  axialCoordinate: number;
  theta: number;
  wetFraction: number;
  centerDepth: number;
  verticalHalfExtent: number;
  topClearance: number;
  bottomDepth: number;
  /** Dimensionful classification tolerance, in metres. */
  clearanceTolerance: number;
  state: SectionWetState;
  supportedByCurrentSinglePhaseCfd2d: boolean;
  reason: string;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function requireSectionInputs(
  theta: number,
  axialCoordinate: number,
  radius: number,
  pivotHeight: number,
): void {
  if (!Number.isFinite(theta) || !Number.isFinite(axialCoordinate)
    || !Number.isFinite(radius) || !Number.isFinite(pivotHeight) || !(radius > 0)) {
    throw new RangeError("section wetting inputs must be finite and radius positive");
  }
}

/** Exact free-surface clearance geometry for a P0 material station. */
export function sectionClearanceGeometry(
  theta: number,
  axialCoordinate: number,
  radius: number,
  pivotHeight: number,
): SectionClearanceGeometry {
  requireSectionInputs(theta, axialCoordinate, radius, pivotHeight);
  const centerDepth = axialCoordinate * Math.cos(theta) - pivotHeight;
  const verticalHalfExtent = radius * Math.abs(Math.sin(theta));
  return {
    centerDepth,
    verticalHalfExtent,
    topClearance: centerDepth - verticalHalfExtent,
    bottomDepth: centerDepth + verticalHalfExtent,
  };
}

/** Exact circular-segment area fraction for the P0 material station. */
export function sectionWetFraction(
  theta: number,
  axialCoordinate: number,
  radius: number,
  pivotHeight: number,
): number {
  const clearance = sectionClearanceGeometry(theta, axialCoordinate, radius, pivotHeight);
  if (clearance.verticalHalfExtent === 0) {
    if (clearance.centerDepth > 0) return 1;
    if (clearance.centerDepth < 0) return 0;
    return 0.5;
  }
  const xi = clearance.centerDepth / clearance.verticalHalfExtent;
  if (xi <= -1) return 0;
  if (xi >= 1) return 1;
  const bounded = clamp(xi, -1, 1);
  return 0.5 + (
    Math.asin(bounded)
    + bounded * Math.sqrt(Math.max(0, 1 - bounded * bounded))
  ) / Math.PI;
}

export function classifySectionWetting(
  topClearance: number,
  bottomDepth: number,
  clearanceTolerance = DEFAULT_CLEARANCE_TOLERANCE,
): SectionWetState {
  if (!Number.isFinite(topClearance) || !Number.isFinite(bottomDepth)
    || topClearance > bottomDepth) {
    throw new RangeError("section clearances must be finite with topClearance <= bottomDepth");
  }
  if (!(clearanceTolerance >= 0) || !Number.isFinite(clearanceTolerance)) {
    throw new RangeError("clearanceTolerance must be finite and non-negative (metres)");
  }
  if (topClearance > clearanceTolerance) return "full";
  if (bottomDepth < -clearanceTolerance) return "dry";
  if (Math.abs(topClearance) <= clearanceTolerance
    || Math.abs(bottomDepth) <= clearanceTolerance) return "touching";
  return "partial";
}

/**
 * The current CFD2D body is a fully immersed circle in a single-phase domain.
 * It is therefore supported only when the selected material station is fully
 * submerged. A merely nonzero wet fraction is insufficient.
 */
export function inspectCfd2dStripWetting(
  config: SimulationConfig,
  theta: number,
  clearanceTolerance = DEFAULT_CLEARANCE_TOLERANCE,
): SectionWettingReport {
  const axialCoordinate = config.cfd2d.stripAxialCoordinate;
  const clearance = sectionClearanceGeometry(
    theta,
    axialCoordinate,
    config.geometry.radius,
    config.geometry.pivotHeight,
  );
  const wetFraction = sectionWetFraction(
    theta,
    axialCoordinate,
    config.geometry.radius,
    config.geometry.pivotHeight,
  );
  const state = classifySectionWetting(
    clearance.topClearance,
    clearance.bottomDepth,
    clearanceTolerance,
  );
  const supported = state === "full";
  return {
    axialCoordinate,
    theta,
    wetFraction,
    ...clearance,
    clearanceTolerance,
    state,
    supportedByCurrentSinglePhaseCfd2d: supported,
    reason: supported
      ? "所选条带截面完全浸没，满足当前单相完整圆截面 CFD2D 的几何前提。"
      : state === "partial"
        ? "所选条带截面穿越自由液面；当前单相完整圆截面 CFD2D 不能表示圆弓湿截面。"
        : state === "touching"
          ? "所选条带截面与自由液面相切或共面；零净空不属于严格浸没，当前 CFD2D 不支持。"
          : "所选条带截面全干；禁止从全浸没二维圆柱场构造该站位载荷。",
  };
}

export interface StripTorqueResult {
  torque: number | null;
  report: SectionWettingReport;
  reason: string;
}

/**
 * Safe replacement for silently returning zero or constructing a torque from
 * an unsupported strip. Null means the 3-D generalized torque is undefined.
 */
export function replicatedStripTorqueCandidate(
  config: SimulationConfig,
  lineForceY: number,
  theta: number,
): StripTorqueResult {
  if (!Number.isFinite(lineForceY) || !Number.isFinite(theta)) {
    throw new RangeError("line force and theta must be finite");
  }
  const report = inspectCfd2dStripWetting(config, theta);
  if (config.cfd2d.stripClosure !== "fully-coherent-upper-bound") {
    return {
      torque: null,
      report,
      reason: "stripClosure=none：二维线力保持 N/m 语义，不构造三维总力矩。",
    };
  }
  if (!report.supportedByCurrentSinglePhaseCfd2d) {
    return { torque: null, report, reason: report.reason };
  }
  const geometry = {
    radius: config.geometry.radius,
    topDistance: config.geometry.topDistance,
    bottomDistance: config.geometry.bottomDistance,
    pivotHeight: config.geometry.pivotHeight,
  };
  const projectedFirstMoment = integrateWetProjection(theta, geometry, (radius) => radius);
  const diameter = 2 * config.geometry.radius;
  const torque = lineForceY * Math.cos(theta) * projectedFirstMoment / diameter;
  return {
    torque,
    report,
    reason: "代表条带完全相干复制情景；仍不是三维装置载荷或数学上界。",
  };
}
