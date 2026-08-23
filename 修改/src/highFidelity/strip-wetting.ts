import type { SimulationConfig } from "../../../02-模拟程序/src/core/types";
import { integrateWetProjection } from "../../../02-模拟程序/src/problems/vortex-pendulum/geometry";

export type SectionWetState = "dry" | "partial" | "full";

export interface SectionWettingReport {
  axialCoordinate: number;
  theta: number;
  wetFraction: number;
  state: SectionWetState;
  supportedByCurrentSinglePhaseCfd2d: boolean;
  reason: string;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/** Exact circular-segment area fraction for the P0 material station. */
export function sectionWetFraction(
  theta: number,
  axialCoordinate: number,
  radius: number,
  pivotHeight: number,
): number {
  if (!Number.isFinite(theta) || !Number.isFinite(axialCoordinate)
    || !Number.isFinite(radius) || !Number.isFinite(pivotHeight) || !(radius > 0)) {
    throw new RangeError("section wetting inputs must be finite and radius positive");
  }
  const sine = Math.sin(theta);
  if (Math.abs(sine) < 1e-12) {
    return axialCoordinate >= pivotHeight ? 1 : 0;
  }
  const xi = (axialCoordinate * Math.cos(theta) - pivotHeight)
    / (radius * Math.abs(sine));
  if (xi <= -1) return 0;
  if (xi >= 1) return 1;
  const bounded = clamp(xi, -1, 1);
  return 0.5 + (
    Math.asin(bounded)
    + bounded * Math.sqrt(Math.max(0, 1 - bounded * bounded))
  ) / Math.PI;
}

export function classifySectionWetting(
  wetFraction: number,
  tolerance = 1e-8,
): SectionWetState {
  if (!Number.isFinite(wetFraction) || wetFraction < 0 || wetFraction > 1) {
    throw new RangeError("wetFraction must lie in [0,1]");
  }
  if (!(tolerance >= 0) || !(tolerance < 0.5) || !Number.isFinite(tolerance)) {
    throw new RangeError("tolerance must lie in [0,0.5)");
  }
  if (wetFraction <= tolerance) return "dry";
  if (wetFraction >= 1 - tolerance) return "full";
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
  tolerance = 1e-8,
): SectionWettingReport {
  const axialCoordinate = config.cfd2d.stripAxialCoordinate;
  const wetFraction = sectionWetFraction(
    theta,
    axialCoordinate,
    config.geometry.radius,
    config.geometry.pivotHeight,
  );
  const state = classifySectionWetting(wetFraction, tolerance);
  const supported = state === "full";
  return {
    axialCoordinate,
    theta,
    wetFraction,
    state,
    supportedByCurrentSinglePhaseCfd2d: supported,
    reason: supported
      ? "所选条带截面完全浸没，满足当前单相完整圆截面 CFD2D 的几何前提。"
      : state === "partial"
        ? "所选条带截面穿越自由液面；当前单相完整圆截面 CFD2D 不能表示圆弓湿截面。"
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
