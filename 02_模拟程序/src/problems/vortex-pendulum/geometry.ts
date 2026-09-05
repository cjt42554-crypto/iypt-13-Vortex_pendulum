/**
 * Exact flat-free-surface geometry for the canonical P0 vortex pendulum.
 *
 * Coordinate convention (R1): x is streamwise and the fixed shaft axis,
 * y is cross-flow, z is upward.  At theta=0 the cylinder axis points down.
 * A material point is
 *
 *   X = O + r d(theta) + u e_x + v c(theta),
 *   d = (0, sin(theta), -cos(theta)),
 *   c = (0, cos(theta),  sin(theta)).
 *
 * This module contains geometry only.  Multiplication by rho*g and any
 * hydrodynamic closure live in the mechanics/solver modules so that the same
 * geometry can be shared by both numerical backends and the observation map.
 */

export interface P0CylinderGeometry {
  /** Cylinder radius R [m]. */
  radius: number;
  /** Axial coordinate of the end nearest the pivot, ell_t [m]. */
  topDistance: number;
  /** Axial coordinate of the end farthest from the pivot, ell_b [m]. */
  bottomDistance: number;
  /** Pivot height above the undisturbed flat free surface, h_O [m]. */
  pivotHeight: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type WetBranch = "dry" | "partial" | "full";

export interface WetGeometry {
  theta: number;
  branch: WetBranch;
  sideOnly: boolean;
  /** Centre-line length below the flat surface [m]. */
  axisWetLength: number;
  /** Exact displaced volume [m^3]. */
  displacedVolume: number;
  /** V/(pi R^2) [m]. */
  volumeEquivalentLength: number;
  /** Exact displaced-volume centroid in the laboratory frame, or null if dry. */
  buoyancyCentroid: Vector3 | null;
  /** Integral of the water depth over displaced volume [m^4]. */
  hydrostaticDepthIntegral: number;
  /** Integral of (y-y_O) over displaced volume [m^4]. */
  buoyancyTorqueIntegral: number;
  /** Integral of r A_w(r) dr [m^4]. */
  axialFirstMoment: number;
  /** Integral of r^2 A_w(r) dr [m^5]. */
  axialSecondMoment: number;
  /** Exact wetted lateral area [m^2]. */
  wettedLateralArea: number;
  /** Wetted area of the near and far end caps [m^2]. */
  wettedTopCapArea: number;
  wettedBottomCapArea: number;
  /** Projection of the wet solid onto the yz plane [m^2]. */
  streamwiseProjectedArea: number;
}

export interface DiskSegment {
  /** Area of the portion u <= d [m^2]. */
  area: number;
  /** First area moment integral(u dA) [m^3]. */
  firstMoment: number;
  /** Fraction of the circumference belonging to u <= d. */
  circumferenceFraction: number;
}

const TWO_PI = 2 * Math.PI;
const GEOMETRY_EPSILON = 1e-12;

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

export function validateP0Geometry(geometry: P0CylinderGeometry): void {
  const { radius, topDistance, bottomDistance, pivotHeight } = geometry;
  assertFinite("radius", radius);
  assertFinite("topDistance", topDistance);
  assertFinite("bottomDistance", bottomDistance);
  assertFinite("pivotHeight", pivotHeight);
  if (!(radius > 0)) throw new RangeError("radius must be positive");
  if (!(bottomDistance > topDistance)) {
    throw new RangeError("bottomDistance must exceed topDistance");
  }
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/** Exact circular-segment quantities for a disk of radius R and half-plane u<=d. */
export function diskSegment(radius: number, d: number): DiskSegment {
  if (!(radius > 0) || !Number.isFinite(radius)) {
    throw new RangeError("radius must be a finite positive number");
  }
  if (d <= -radius) return { area: 0, firstMoment: 0, circumferenceFraction: 0 };
  const fullArea = Math.PI * radius * radius;
  if (d >= radius) return { area: fullArea, firstMoment: 0, circumferenceFraction: 1 };
  const xi = clamp(d / radius, -1, 1);
  const root = Math.sqrt(Math.max(0, 1 - xi * xi));
  return {
    area: radius * radius * (Math.asin(xi) + Math.PI / 2 + xi * root),
    firstMoment: -(2 / 3) * radius ** 3 * root ** 3,
    circumferenceFraction: 1 - Math.acos(xi) / Math.PI,
  };
}

interface QuadratureRule {
  nodes: readonly number[];
  weights: readonly number[];
}

/** Generate a Gauss-Legendre rule once; avoids a large opaque table. */
function gaussLegendreRule(order: number): QuadratureRule {
  if (!Number.isInteger(order) || order < 2) throw new RangeError("invalid quadrature order");
  const nodes = new Array<number>(order);
  const weights = new Array<number>(order);
  const half = Math.ceil(order / 2);
  for (let index = 0; index < half; index += 1) {
    let root = Math.cos(Math.PI * (index + 0.75) / (order + 0.5));
    let derivative = 0;
    for (let iteration = 0; iteration < 30; iteration += 1) {
      let p0 = 1;
      let p1 = root;
      for (let degree = 2; degree <= order; degree += 1) {
        const next = ((2 * degree - 1) * root * p1 - (degree - 1) * p0) / degree;
        p0 = p1;
        p1 = next;
      }
      derivative = order * (root * p1 - p0) / (root * root - 1);
      const correction = p1 / derivative;
      root -= correction;
      if (Math.abs(correction) < 2e-15) break;
    }
    const weight = 2 / ((1 - root * root) * derivative * derivative);
    nodes[index] = -root;
    nodes[order - 1 - index] = root;
    weights[index] = weight;
    weights[order - 1 - index] = weight;
  }
  return { nodes, weights };
}

// Circular-segment integrands have a square-root second-derivative singularity
// where the waterline meets a disk.  We split at those points and use a
// moderately high rule so the general branch also reproduces the side-only
// closed form to roughly 1e-11 relative accuracy in double precision.
const QUADRATURE = gaussLegendreRule(48);

function integrateSegment(fn: (x: number) => number, lower: number, upper: number): number {
  if (!(upper > lower)) return 0;
  const midpoint = 0.5 * (lower + upper);
  const halfWidth = 0.5 * (upper - lower);
  let sum = 0;
  for (let index = 0; index < QUADRATURE.nodes.length; index += 1) {
    const node = QUADRATURE.nodes[index];
    const weight = QUADRATURE.weights[index];
    if (node === undefined || weight === undefined) continue;
    sum += weight * fn(midpoint + halfWidth * node);
  }
  return halfWidth * sum;
}

function uniqueSorted(values: readonly number[]): number[] {
  const sorted = [...values].sort((left, right) => left - right);
  const result: number[] = [];
  for (const value of sorted) {
    const previous = result.at(-1);
    if (previous === undefined || Math.abs(value - previous) > GEOMETRY_EPSILON) {
      result.push(value);
    }
  }
  return result;
}

function integrationBreakpoints(theta: number, geometry: P0CylinderGeometry): number[] {
  const { radius, topDistance, bottomDistance, pivotHeight } = geometry;
  const sineMagnitude = Math.abs(Math.sin(theta));
  const cosine = Math.cos(theta);
  const points = [topDistance, bottomDistance];
  if (Math.abs(cosine) > GEOMETRY_EPSILON) {
    if (sineMagnitude <= GEOMETRY_EPSILON) {
      points.push(pivotHeight / cosine);
    } else {
      points.push(
        (pivotHeight - radius * sineMagnitude) / cosine,
        (pivotHeight + radius * sineMagnitude) / cosine,
      );
    }
  }
  return uniqueSorted(points.filter((value) =>
    value >= topDistance && value <= bottomDistance));
}

interface CrossSectionState extends DiskSegment {
  d: number;
}

function crossSectionAt(
  r: number,
  theta: number,
  geometry: P0CylinderGeometry,
): CrossSectionState {
  const sineMagnitude = Math.abs(Math.sin(theta));
  const depthAtCentre = r * Math.cos(theta) - geometry.pivotHeight;
  if (sineMagnitude <= GEOMETRY_EPSILON) {
    const wet = depthAtCentre >= 0;
    const segment = diskSegment(geometry.radius, wet ? geometry.radius : -geometry.radius);
    return { ...segment, d: wet ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY };
  }
  const d = depthAtCentre / sineMagnitude;
  return { ...diskSegment(geometry.radius, d), d };
}

function integratePiecewise(
  theta: number,
  geometry: P0CylinderGeometry,
  fn: (r: number, section: CrossSectionState) => number,
): number {
  const points = integrationBreakpoints(theta, geometry);
  let sum = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const lower = points[index];
    const upper = points[index + 1];
    if (lower === undefined || upper === undefined) continue;
    sum += integrateSegment((r) => fn(r, crossSectionAt(r, theta, geometry)), lower, upper);
  }
  return sum;
}

/**
 * Integrate a sectional quantity over the wetted axial span, using the exact
 * cross-section wet-area fraction as the strip weight.  The result is
 * integral phi(r) * A_w(r)/(pi R^2) dr.  It is a declared strip closure, not a
 * replacement for a three-dimensional wet-surface traction integral.
 */
export function integrateWetAxis(
  theta: number,
  geometry: P0CylinderGeometry,
  integrand: (r: number) => number,
): number {
  validateP0Geometry(geometry);
  assertFinite("theta", theta);
  if (!(Math.cos(theta) > 0)) {
    throw new RangeError("the P0 flat-surface implementation requires |theta| < pi/2");
  }
  const fullArea = Math.PI * geometry.radius * geometry.radius;
  return integratePiecewise(
    theta,
    geometry,
    (r, section) => integrand(r) * section.area / fullArea,
  );
}

/** Exact wet frontal width b_w(r,theta) seen by the streamwise outer flow. */
export function wetProjectedWidthAt(
  r: number,
  theta: number,
  geometry: P0CylinderGeometry,
): number {
  validateP0Geometry(geometry);
  assertFinite("r", r);
  assertFinite("theta", theta);
  if (!(Math.cos(theta) > 0)) {
    throw new RangeError("the P0 flat-surface implementation requires |theta| < pi/2");
  }
  const section = crossSectionAt(r, theta, geometry);
  if (!Number.isFinite(section.d)) return section.area > 0 ? 2 * geometry.radius : 0;
  return geometry.radius + clamp(section.d, -geometry.radius, geometry.radius);
}

/**
 * Integrate phi(r)b_w(r,theta)dr with the same waterline breakpoints as all
 * exact P0 geometry.  This is the weight required by equations (5.7)-(5.14),
 * and is deliberately distinct from the wet-area-fraction strip integral.
 */
export function integrateWetProjection(
  theta: number,
  geometry: P0CylinderGeometry,
  integrand: (r: number) => number,
): number {
  validateP0Geometry(geometry);
  assertFinite("theta", theta);
  if (!(Math.cos(theta) > 0)) {
    throw new RangeError("the P0 flat-surface implementation requires |theta| < pi/2");
  }
  return integratePiecewise(theta, geometry, (r, section) => {
    const width = !Number.isFinite(section.d)
      ? section.area > 0 ? 2 * geometry.radius : 0
      : geometry.radius + clamp(section.d, -geometry.radius, geometry.radius);
    return integrand(r) * width;
  });
}

export function cylinderAxes(theta: number): { axis: Vector3; cross: Vector3 } {
  assertFinite("theta", theta);
  return {
    axis: { x: 0, y: Math.sin(theta), z: -Math.cos(theta) },
    cross: { x: 0, y: Math.cos(theta), z: Math.sin(theta) },
  };
}

/**
 * Compute all flat-surface wet-geometry observables from the same circular-
 * segment integral.  This is deliberately deterministic and allocation-light
 * enough to be called by a national-competition-level time integrator.
 */
export function evaluateWetGeometry(
  theta: number,
  geometry: P0CylinderGeometry,
): WetGeometry {
  validateP0Geometry(geometry);
  assertFinite("theta", theta);
  const { radius, topDistance, bottomDistance, pivotHeight } = geometry;
  const sine = Math.sin(theta);
  const cosine = Math.cos(theta);
  if (!(cosine > 0)) {
    throw new RangeError("the P0 flat-surface implementation requires |theta| < pi/2");
  }
  const beta = Math.abs(sine);
  const signSine = Math.sign(sine);
  const fullArea = Math.PI * radius * radius;
  const cylinderLength = bottomDistance - topDistance;

  const integrate = (fn: (r: number, section: CrossSectionState) => number): number =>
    integratePiecewise(theta, geometry, fn);

  const displacedVolume = integrate((_r, section) => section.area);
  const axialFirstMoment = integrate((r, section) => r * section.area);
  const axialSecondMoment = integrate((r, section) => r * r * section.area);
  const yMoment = integrate((r, section) =>
    r * sine * section.area + signSine * cosine * section.firstMoment);
  const zRelativeMoment = integrate((r, section) =>
    -r * cosine * section.area + beta * section.firstMoment);
  const hydrostaticDepthIntegral = integrate((r, section) =>
    (r * cosine - pivotHeight) * section.area - beta * section.firstMoment);
  const wettedLateralArea = TWO_PI * radius * integrate(
    (_r, section) => section.circumferenceFraction,
  );

  const topSection = crossSectionAt(topDistance, theta, geometry);
  const bottomSection = crossSectionAt(bottomDistance, theta, geometry);
  const rawAxisLength = bottomDistance - pivotHeight / cosine;
  const axisWetLength = clamp(rawAxisLength, 0, cylinderLength);
  const sideOnly =
    topDistance < pivotHeight / cosine - radius * Math.abs(Math.tan(theta)) &&
    pivotHeight / cosine + radius * Math.abs(Math.tan(theta)) < bottomDistance;

  const streamwiseProjectedArea = beta <= GEOMETRY_EPSILON
    ? 2 * radius * axisWetLength
    : radius * integrate((_r, section) =>
      1 + clamp(section.d / radius, -1, 1));

  const volumeTolerance = Math.max(1, fullArea * cylinderLength) * 1e-12;
  // Labels follow the exact supporting planes. A small but positive immersed
  // cap must not be relabelled dry by an absolute volume display tolerance.
  const branch: WetBranch = bottomDistance * cosine + radius * beta <= pivotHeight
    ? "dry"
    : topDistance * cosine - radius * beta >= pivotHeight
      ? "full"
      : "partial";

  return {
    theta,
    branch,
    sideOnly,
    axisWetLength,
    displacedVolume,
    volumeEquivalentLength: displacedVolume / fullArea,
    buoyancyCentroid: displacedVolume > volumeTolerance
      ? {
          x: 0,
          y: yMoment / displacedVolume,
          z: pivotHeight + zRelativeMoment / displacedVolume,
        }
      : null,
    hydrostaticDepthIntegral,
    buoyancyTorqueIntegral: yMoment,
    axialFirstMoment,
    axialSecondMoment,
    wettedLateralArea,
    wettedTopCapArea: topSection.area,
    wettedBottomCapArea: bottomSection.area,
    streamwiseProjectedArea,
  };
}

/** Hydrostatic potential rho*g*integral(depth dV) [J]. */
export function hydrostaticPotential(
  theta: number,
  geometry: P0CylinderGeometry,
  density: number,
  gravity: number,
): number {
  if (!(density > 0) || !(gravity > 0)) {
    throw new RangeError("density and gravity must be positive");
  }
  return density * gravity * evaluateWetGeometry(theta, geometry).hydrostaticDepthIntegral;
}

/** Hydrostatic generalized torque Q_B=rho*g*integral((y-y_O)dV) [N m]. */
export function buoyancyTorque(
  theta: number,
  geometry: P0CylinderGeometry,
  density: number,
  gravity: number,
): number {
  if (!(density > 0) || !(gravity > 0)) {
    throw new RangeError("density and gravity must be positive");
  }
  return density * gravity * evaluateWetGeometry(theta, geometry).buoyancyTorqueIntegral;
}

/** Support function of the finite flat-ended cylinder about its midpoint. */
export function cylinderSupport(
  direction: Vector3,
  theta: number,
  geometry: Pick<P0CylinderGeometry, "radius" | "topDistance" | "bottomDistance">,
): number {
  const magnitude = Math.hypot(direction.x, direction.y, direction.z);
  if (!(magnitude > 0)) throw new RangeError("support direction must be non-zero");
  const unit = {
    x: direction.x / magnitude,
    y: direction.y / magnitude,
    z: direction.z / magnitude,
  };
  const { axis } = cylinderAxes(theta);
  const projection = unit.x * axis.x + unit.y * axis.y + unit.z * axis.z;
  const halfLength = 0.5 * (geometry.bottomDistance - geometry.topDistance);
  const radialProjection = Math.sqrt(Math.max(0, 1 - projection * projection));
  return halfLength * Math.abs(projection) + geometry.radius * radialProjection;
}

/** Position of the cylinder midpoint relative to the pivot. */
export function cylinderMidpoint(theta: number, geometry: P0CylinderGeometry): Vector3 {
  const middle = 0.5 * (geometry.topDistance + geometry.bottomDistance);
  return { x: 0, y: middle * Math.sin(theta), z: -middle * Math.cos(theta) };
}
