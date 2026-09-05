import {
  type P0CylinderGeometry,
  type WetBranch,
  validateP0Geometry,
} from "./geometry";

/** Geometry of one axial disk cut by the flat free surface. */
export interface DirectionalWetDisk {
  /** Distance from the shaft along the cylinder axis [m]. */
  r: number;
  /** Signed waterline coordinate d/R in the reflected wet coordinate w. */
  xi: number;
  branch: WetBranch;
}

/** Local quantities available to a direction-dependent drag coefficient. */
export interface DirectionalDragSection extends DirectionalWetDisk {
  /** Prescribed streamwise fluid velocity U_e [m/s]. */
  streamwiseSpeed: number;
  /** Fluid velocity relative to the cylinder along the pendulum tangent [m/s]. */
  relativeTangentialSpeed: number;
  /** Magnitude of the sectional relative velocity [m/s]. */
  relativeSpeed: number;
  /** Streamwise component of the relative-velocity unit vector. */
  directionStreamwise: number;
  /** Tangential component of the relative-velocity unit vector in physical coordinates. */
  directionTangential: number;
  /** Component along the reflected wet coordinate w=sgn(sin(theta))*v. */
  directionWet: number;
  /** Wet-disk projection normal to the relative velocity [m]. */
  directionalWidth: number;
}

export interface DirectionalWetSpanOptions {
  theta: number;
  geometry: P0CylinderGeometry;
  /** Gauss-Legendre order on each interval separated by a waterline crossing. */
  quadratureOrder?: number;
}

export type SectionalValue = number | ((r: number) => number);
export type DirectionalDragCoefficient = number
  | ((section: DirectionalDragSection) => number);

export interface DirectionalDragInput extends DirectionalWetSpanOptions {
  omega: number;
  density: number;
  streamwiseSpeed: SectionalValue;
  dragCoefficient: DirectionalDragCoefficient;
}

export interface DirectionalDragEvaluation {
  /** Total force parallel to the mean streamwise axis [N]. */
  forceStreamwise: number;
  /** Total force parallel to the pendulum tangent [N]. */
  forceTangential: number;
  /** Generalized drag torque about the shaft [N m]. */
  torque: number;
  /** Mechanical drag power torque*omega [W]. */
  power: number;
}

interface QuadratureRule {
  nodes: readonly number[];
  weights: readonly number[];
}

const GEOMETRY_EPSILON = 1e-12;
const DEFAULT_QUADRATURE_ORDER = 32;
const quadratureRules = new Map<number, QuadratureRule>();

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

function validateTheta(theta: number): void {
  assertFinite("theta", theta);
  if (!(Math.abs(theta) < Math.PI / 2)) {
    throw new RangeError("the P0 flat-surface implementation requires |theta| < pi/2");
  }
}

function quadratureRule(order: number): QuadratureRule {
  if (!Number.isInteger(order) || order < 2 || order > 256) {
    throw new RangeError("quadratureOrder must be an integer from 2 through 256");
  }
  const cached = quadratureRules.get(order);
  if (cached !== undefined) return cached;

  const nodes = new Array<number>(order);
  const weights = new Array<number>(order);
  const half = Math.ceil(order / 2);
  for (let index = 0; index < half; index += 1) {
    let root = Math.cos(Math.PI * (index + 0.75) / (order + 0.5));
    let derivative = 0;
    for (let iteration = 0; iteration < 40; iteration += 1) {
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
  const rule = { nodes, weights };
  quadratureRules.set(order, rule);
  return rule;
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

function wetSpanBreakpoints(
  theta: number,
  geometry: P0CylinderGeometry,
): number[] {
  const { radius, topDistance, bottomDistance, pivotHeight } = geometry;
  const sineMagnitude = Math.abs(Math.sin(theta));
  const cosine = Math.cos(theta);
  const points = [topDistance, bottomDistance];
  if (sineMagnitude <= GEOMETRY_EPSILON) {
    points.push(pivotHeight / cosine);
  } else {
    points.push(
      (pivotHeight - radius * sineMagnitude) / cosine,
      (pivotHeight + radius * sineMagnitude) / cosine,
    );
  }
  return uniqueSorted(points.filter(
    (value) => value >= topDistance && value <= bottomDistance,
  ));
}

function forEachWetSpanPoint(
  options: DirectionalWetSpanOptions,
  visitor: (r: number, weight: number, disk: DirectionalWetDisk) => void,
): void {
  const { theta, geometry } = options;
  validateP0Geometry(geometry);
  validateTheta(theta);
  const rule = quadratureRule(options.quadratureOrder ?? DEFAULT_QUADRATURE_ORDER);
  const points = wetSpanBreakpoints(theta, geometry);
  for (let interval = 0; interval + 1 < points.length; interval += 1) {
    const lower = points[interval];
    const upper = points[interval + 1];
    if (lower === undefined || upper === undefined || !(upper > lower)) continue;
    const midpoint = 0.5 * (lower + upper);
    const halfWidth = 0.5 * (upper - lower);
    for (let index = 0; index < rule.nodes.length; index += 1) {
      const node = rule.nodes[index];
      const weight = rule.weights[index];
      if (node === undefined || weight === undefined) continue;
      const r = midpoint + halfWidth * node;
      visitor(r, halfWidth * weight, directionalWetDiskAt(r, theta, geometry));
    }
  }
}

/**
 * Support of K_xi={(u,w):u^2+w^2<=R^2,w<=R xi}.  The normal may have any
 * magnitude; the result uses positive homogeneity and is zero for n=(0,0).
 */
export function wetDiskSupport(
  radius: number,
  xi: number,
  normalU: number,
  normalW: number,
): number {
  if (!(radius > 0) || !Number.isFinite(radius)) {
    throw new RangeError("radius must be a finite positive number");
  }
  assertFinite("normalU", normalU);
  assertFinite("normalW", normalW);
  if (Number.isNaN(xi)) throw new RangeError("xi must not be NaN");
  const norm = Math.hypot(normalU, normalW);
  if (xi < -1) throw new RangeError("wetDiskSupport is undefined for an empty disk");
  if (norm === 0) return 0;
  if (xi >= 1) return radius * norm;

  const unitU = normalU / norm;
  const unitW = normalW / norm;
  if (unitW <= xi) return radius * norm;
  return radius * norm * (
    Math.abs(unitU) * Math.sqrt(Math.max(0, 1 - xi * xi)) + unitW * xi
  );
}

/** Flat-surface wet-disk branch at one axial station. */
export function directionalWetDiskAt(
  r: number,
  theta: number,
  geometry: P0CylinderGeometry,
): DirectionalWetDisk {
  validateP0Geometry(geometry);
  assertFinite("r", r);
  validateTheta(theta);
  const sineMagnitude = Math.abs(Math.sin(theta));
  const depthAtCentre = r * Math.cos(theta) - geometry.pivotHeight;
  if (sineMagnitude <= GEOMETRY_EPSILON) {
    return depthAtCentre >= 0
      ? { r, xi: Number.POSITIVE_INFINITY, branch: "full" }
      : { r, xi: Number.NEGATIVE_INFINITY, branch: "dry" };
  }
  const xi = depthAtCentre / (geometry.radius * sineMagnitude);
  return {
    r,
    xi,
    branch: xi <= -1 ? "dry" : xi >= 1 ? "full" : "partial",
  };
}

/**
 * Direction-dependent wet width at one station.  A zero relative velocity has
 * no direction; the returned load width is then zero so no angle is invented.
 */
export function directionalWetWidthAt(
  r: number,
  theta: number,
  geometry: P0CylinderGeometry,
  streamwiseSpeed: number,
  omega: number,
): number {
  assertFinite("streamwiseSpeed", streamwiseSpeed);
  assertFinite("omega", omega);
  const disk = directionalWetDiskAt(r, theta, geometry);
  if (disk.branch === "dry") return 0;
  const relativeTangentialSpeed = -r * omega;
  const relativeSpeed = Math.hypot(streamwiseSpeed, relativeTangentialSpeed);
  if (relativeSpeed === 0) return 0;
  if (disk.branch === "full") return 2 * geometry.radius;

  const directionU = streamwiseSpeed / relativeSpeed;
  const directionW = Math.sign(Math.sin(theta))
    * relativeTangentialSpeed / relativeSpeed;
  const normalU = -directionW;
  const normalW = directionU;
  return Math.max(
    0,
    wetDiskSupport(geometry.radius, disk.xi, normalU, normalW)
      + wetDiskSupport(geometry.radius, disk.xi, -normalU, -normalW),
  );
}

/**
 * Integrate a scalar over the cylinder axis with waterline crossings as exact
 * interval boundaries.  The callback receives dry, partial, and full disks;
 * it chooses the sectional closure (for DW, use directionalWetWidthAt).
 */
export function integrateDirectionalWetSpan(
  options: DirectionalWetSpanOptions,
  integrand: (r: number, disk: DirectionalWetDisk) => number,
): number {
  let sum = 0;
  forEachWetSpanPoint(options, (r, weight, disk) => {
    const value = integrand(r, disk);
    assertFinite("wet-span integrand", value);
    sum += weight * value;
  });
  return sum;
}

/**
 * Complete F13.5 direction-dependent sectional drag integral.  Only the drag
 * width and its matching nonnegative C_D belong here; wake area conventions,
 * added inertia, and other torque channels remain outside this component.
 */
export function evaluateDirectionalDrag(
  input: DirectionalDragInput,
): DirectionalDragEvaluation {
  const { theta, omega, geometry, density } = input;
  validateP0Geometry(geometry);
  validateTheta(theta);
  assertFinite("omega", omega);
  if (!(density > 0) || !Number.isFinite(density)) {
    throw new RangeError("density must be a finite positive number");
  }
  if (typeof input.streamwiseSpeed === "number") {
    assertFinite("streamwiseSpeed", input.streamwiseSpeed);
  }
  if (typeof input.dragCoefficient === "number"
    && (!(input.dragCoefficient >= 0) || !Number.isFinite(input.dragCoefficient))) {
    throw new RangeError("dragCoefficient must be finite and nonnegative");
  }

  let forceStreamwise = 0;
  let forceTangential = 0;
  let torque = 0;
  forEachWetSpanPoint(input, (r, weight, disk) => {
    if (disk.branch === "dry") return;
    const streamwiseSpeed = typeof input.streamwiseSpeed === "number"
      ? input.streamwiseSpeed
      : input.streamwiseSpeed(r);
    assertFinite("streamwiseSpeed(r)", streamwiseSpeed);
    const relativeTangentialSpeed = -r * omega;
    const relativeSpeed = Math.hypot(streamwiseSpeed, relativeTangentialSpeed);
    if (relativeSpeed === 0) return;
    const directionStreamwise = streamwiseSpeed / relativeSpeed;
    const directionTangential = relativeTangentialSpeed / relativeSpeed;
    const directionWet = Math.sign(Math.sin(theta)) * directionTangential;
    const directionalWidth = disk.branch === "full"
      ? 2 * geometry.radius
      : Math.max(
          0,
          wetDiskSupport(
            geometry.radius,
            disk.xi,
            -directionWet,
            directionStreamwise,
          ) + wetDiskSupport(
            geometry.radius,
            disk.xi,
            directionWet,
            -directionStreamwise,
          ),
        );
    if (directionalWidth === 0) return;
    const section: DirectionalDragSection = {
      ...disk,
      streamwiseSpeed,
      relativeTangentialSpeed,
      relativeSpeed,
      directionStreamwise,
      directionTangential,
      directionWet,
      directionalWidth,
    };
    const dragCoefficient = typeof input.dragCoefficient === "number"
      ? input.dragCoefficient
      : input.dragCoefficient(section);
    if (!(dragCoefficient >= 0) || !Number.isFinite(dragCoefficient)) {
      throw new RangeError("dragCoefficient(section) must be finite and nonnegative");
    }
    const forceMagnitude = 0.5 * density * relativeSpeed ** 2
      * directionalWidth * dragCoefficient;
    const weightedStreamwise = weight * forceMagnitude * directionStreamwise;
    const weightedTangential = weight * forceMagnitude * directionTangential;
    forceStreamwise += weightedStreamwise;
    forceTangential += weightedTangential;
    torque += r * weightedTangential;
  });
  return {
    forceStreamwise,
    forceTangential,
    torque,
    power: torque * omega,
  };
}
