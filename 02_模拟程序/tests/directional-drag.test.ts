import { describe, expect, it } from "vitest";
import {
  directionalWetDiskAt,
  directionalWetWidthAt,
  evaluateDirectionalDrag,
  integrateDirectionalWetSpan,
  wetDiskSupport,
} from "../src/problems/vortex-pendulum/directional-drag";
import {
  wetProjectedWidthAt,
  type P0CylinderGeometry,
} from "../src/problems/vortex-pendulum/geometry";

const TWO_PI = 2 * Math.PI;

function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/**
 * Independent extrema enumeration on the clipped disk boundary.  It checks
 * the two waterline/arc endpoints and the unconstrained circular stationary
 * point when that point belongs to the wet arc; it does not use F13.2.
 */
function supportFromBoundaryCandidates(
  radius: number,
  xi: number,
  normalU: number,
  normalW: number,
): number {
  const norm = Math.hypot(normalU, normalW);
  if (norm === 0) return 0;
  if (xi >= 1) return radius * norm;
  if (xi <= -1) return -radius * normalW;

  const waterlineW = radius * xi;
  const endpointU = radius * Math.sqrt(Math.max(0, 1 - xi * xi));
  const candidates: Array<readonly [number, number]> = [
    [endpointU, waterlineW],
    [-endpointU, waterlineW],
  ];
  const stationaryU = radius * normalU / norm;
  const stationaryW = radius * normalW / norm;
  if (stationaryW <= waterlineW + 4 * Number.EPSILON * radius) {
    candidates.push([stationaryU, stationaryW]);
  }
  return Math.max(...candidates.map(([u, w]) => normalU * u + normalW * w));
}

function independentDirectionalWidth(
  radius: number,
  xi: number,
  directionU: number,
  directionW: number,
): number {
  if (xi <= -1) return 0;
  if (xi >= 1) return 2 * radius;
  const normalU = -directionW;
  const normalW = directionU;
  return supportFromBoundaryCandidates(radius, xi, normalU, normalW)
    + supportFromBoundaryCandidates(radius, xi, -normalU, -normalW);
}

function geometryAtXi(
  xi: number,
  theta: number,
  r = 0.4,
  radius = 0.01,
): P0CylinderGeometry {
  return {
    radius,
    topDistance: 0.1,
    bottomDistance: 0.8,
    pivotHeight: r * Math.cos(theta) - xi * radius * Math.abs(Math.sin(theta)),
  };
}

interface CartesianReference {
  forceStreamwise: number;
  forceTangential: number;
  torque: number;
}

function referenceBreakpoints(theta: number, geometry: P0CylinderGeometry): number[] {
  const sineMagnitude = Math.abs(Math.sin(theta));
  const cosine = Math.cos(theta);
  const points = [geometry.topDistance, geometry.bottomDistance];
  if (sineMagnitude === 0) {
    points.push(geometry.pivotHeight / cosine);
  } else {
    points.push(
      (geometry.pivotHeight - geometry.radius * sineMagnitude) / cosine,
      (geometry.pivotHeight + geometry.radius * sineMagnitude) / cosine,
    );
  }
  return [...new Set(points
    .filter((value) => value >= geometry.topDistance && value <= geometry.bottomDistance)
    .sort((left, right) => left - right))];
}

function independentCartesianSection(
  r: number,
  theta: number,
  omega: number,
  density: number,
  streamwiseSpeed: number,
  dragCoefficient: number,
  geometry: P0CylinderGeometry,
): CartesianReference {
  const sine = Math.sin(theta);
  const cosine = Math.cos(theta);
  const sineMagnitude = Math.abs(sine);
  const depth = r * cosine - geometry.pivotHeight;
  const xi = sineMagnitude === 0
    ? depth >= 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
    : depth / (geometry.radius * sineMagnitude);

  const tangent = { x: 0, y: cosine, z: sine };
  const position = { x: 0, y: r * sine, z: -r * cosine };
  const relative = {
    x: streamwiseSpeed,
    y: -r * omega * tangent.y,
    z: -r * omega * tangent.z,
  };
  const speed = Math.hypot(relative.x, relative.y, relative.z);
  if (speed === 0 || xi <= -1) {
    return { forceStreamwise: 0, forceTangential: 0, torque: 0 };
  }
  const unit = {
    x: relative.x / speed,
    y: relative.y / speed,
    z: relative.z / speed,
  };
  const directionW = Math.sign(sine) * (
    unit.y * tangent.y + unit.z * tangent.z
  );
  const width = independentDirectionalWidth(
    geometry.radius,
    xi,
    unit.x,
    directionW,
  );
  const magnitude = 0.5 * density * speed ** 2 * width * dragCoefficient;
  const force = {
    x: magnitude * unit.x,
    y: magnitude * unit.y,
    z: magnitude * unit.z,
  };
  const torqueX = position.y * force.z - position.z * force.y;
  return {
    forceStreamwise: force.x,
    forceTangential: force.y * tangent.y + force.z * tangent.z,
    torque: torqueX,
  };
}

function addScaled(
  accumulator: CartesianReference,
  value: CartesianReference,
  scale: number,
): void {
  accumulator.forceStreamwise += scale * value.forceStreamwise;
  accumulator.forceTangential += scale * value.forceTangential;
  accumulator.torque += scale * value.torque;
}

/** Composite Simpson reference: deliberately different from production GL. */
function integrateCartesianReference(
  theta: number,
  omega: number,
  density: number,
  streamwiseSpeed: number,
  dragCoefficient: number,
  geometry: P0CylinderGeometry,
  panelsPerInterval = 4096,
): CartesianReference {
  const total = { forceStreamwise: 0, forceTangential: 0, torque: 0 };
  const points = referenceBreakpoints(theta, geometry);
  for (let interval = 0; interval + 1 < points.length; interval += 1) {
    const lower = points[interval];
    const upper = points[interval + 1];
    if (lower === undefined || upper === undefined || !(upper > lower)) continue;
    const panels = panelsPerInterval + panelsPerInterval % 2;
    const step = (upper - lower) / panels;
    for (let index = 0; index <= panels; index += 1) {
      const weight = index === 0 || index === panels ? 1 : index % 2 === 0 ? 2 : 4;
      addScaled(total, independentCartesianSection(
        lower + index * step,
        theta,
        omega,
        density,
        streamwiseSpeed,
        dragCoefficient,
        geometry,
      ), weight * step / 3);
    }
  }
  return total;
}

/**
 * Independent Simpson reference for the refinement case with axial profiles.
 * The direction component and C_D are reconstructed from Cartesian velocity;
 * this deliberately does not call the production section callback.
 */
function integrateProfiledCartesianReference(
  theta: number,
  omega: number,
  density: number,
  geometry: P0CylinderGeometry,
  streamwiseSpeedAt: (r: number) => number,
  dragCoefficientAt: (r: number, directionWet: number) => number,
  panelsPerInterval = 65_536,
): CartesianReference {
  const total = { forceStreamwise: 0, forceTangential: 0, torque: 0 };
  const points = referenceBreakpoints(theta, geometry);
  for (let interval = 0; interval + 1 < points.length; interval += 1) {
    const lower = points[interval];
    const upper = points[interval + 1];
    if (lower === undefined || upper === undefined || !(upper > lower)) continue;
    const panels = panelsPerInterval + panelsPerInterval % 2;
    const step = (upper - lower) / panels;
    for (let index = 0; index <= panels; index += 1) {
      const r = lower + index * step;
      const streamwiseSpeed = streamwiseSpeedAt(r);
      const relativeSpeed = Math.hypot(streamwiseSpeed, r * omega);
      const directionWet = relativeSpeed === 0
        ? 0
        : Math.sign(Math.sin(theta)) * (-r * omega / relativeSpeed);
      const dragCoefficient = dragCoefficientAt(r, directionWet);
      const weight = index === 0 || index === panels ? 1 : index % 2 === 0 ? 2 : 4;
      addScaled(total, independentCartesianSection(
        r,
        theta,
        omega,
        density,
        streamwiseSpeed,
        dragCoefficient,
        geometry,
      ), weight * step / 3);
    }
  }
  return total;
}

function relativeError(actual: number, expected: number, scale = 1e-12): number {
  return Math.abs(actual - expected) / (scale + Math.abs(expected));
}

describe("direction-dependent wet-disk geometry", () => {
  it("rejects angles outside the declared P0 flat-surface branch", () => {
    const geometry: P0CylinderGeometry = {
      radius: 0.01,
      topDistance: 0.1,
      bottomDistance: 0.8,
      pivotHeight: 0.2,
    };
    for (const theta of [-Math.PI / 2, Math.PI / 2, TWO_PI]) {
      expect(() => directionalWetDiskAt(0.4, theta, geometry))
        .toThrow(/\|theta\| < pi\/2/);
    }
  });

  it("matches 180 independent wet-arc and waterline-extremum cases", () => {
    const random = makeRandom(20260905);
    let maximumRelativeError = 0;
    for (let sample = 0; sample < 180; sample += 1) {
      const radius = 0.002 + 0.08 * random();
      const xi = sample === 0
        ? -1 + 1e-12
        : sample === 1
          ? 1 - 1e-12
          : -0.999999 + 1.999998 * random();
      const angle = TWO_PI * random();
      const magnitude = 0.1 + 4 * random();
      const normalU = magnitude * Math.cos(angle);
      const normalW = magnitude * Math.sin(angle);
      const expected = supportFromBoundaryCandidates(radius, xi, normalU, normalW);
      const error = relativeError(
        wetDiskSupport(radius, xi, normalU, normalW),
        expected,
        1e-14 * radius,
      );
      maximumRelativeError = Math.max(maximumRelativeError, error);
      expect(error).toBeLessThan(2e-11);
    }
    if (process.env.DW_REPORT === "1") {
      console.info(JSON.stringify({ geometrySamples: 180, maximumRelativeError }));
    }
  });

  it("recovers dry, tangent, full, reflection, and zero-speed limits", () => {
    const theta = 0.37;
    const r = 0.4;
    const dry = geometryAtXi(-1.2, theta, r);
    const tangent = geometryAtXi(-1, theta, r);
    const full = geometryAtXi(1.2, theta, r);
    expect(directionalWetDiskAt(r, theta, dry).branch).toBe("dry");
    expect(directionalWetWidthAt(r, theta, dry, 0.3, 0.8)).toBe(0);
    expect(directionalWetWidthAt(r, theta, tangent, 0.3, 0.8)).toBe(0);
    expect(directionalWetWidthAt(r, theta, full, 0.3, 0.8))
      .toBeCloseTo(2 * full.radius, 15);
    expect(wetDiskSupport(0.01, -1, 0.6, 0.8)).toBeCloseTo(-0.008, 15);

    const partial = geometryAtXi(0.23, theta, r);
    const positive = directionalWetWidthAt(r, theta, partial, 0.31, 0.9);
    const reflected = directionalWetWidthAt(r, -theta, partial, 0.31, -0.9);
    const reversedFlow = directionalWetWidthAt(r, theta, partial, -0.31, -0.9);
    expect(reflected).toBeCloseTo(positive, 14);
    expect(reversedFlow).toBeCloseTo(positive, 14);
    expect(directionalWetWidthAt(r, theta, partial, 0, 0)).toBe(0);

    const zero = evaluateDirectionalDrag({
      theta,
      omega: 0,
      density: 998,
      geometry: partial,
      streamwiseSpeed: 0,
      dragCoefficient: 1.2,
    });
    expect(zero).toEqual({
      forceStreamwise: 0,
      forceTangential: 0,
      torque: 0,
      power: 0,
    });

    const fullyDry = evaluateDirectionalDrag({
      theta,
      omega: 1.1,
      density: 998,
      geometry: { ...partial, pivotHeight: 1 },
      streamwiseSpeed: 0.3,
      dragCoefficient: 1.2,
    });
    expect(fullyDry).toEqual({
      forceStreamwise: 0,
      forceTangential: 0,
      torque: 0,
      power: 0,
    });
  });

  it("matches the half-wet R, 1.5R, and 2R benchmarks", () => {
    const theta = 0.31;
    const r = 0.4;
    const radius = 0.01;
    const halfWet = geometryAtXi(0, theta, r, radius);
    for (const [beta, expected] of [
      [0, 0.01],
      [Math.PI / 6, 0.015],
      [Math.PI / 2, 0.02],
    ] as const) {
      const speed = 1;
      const streamwise = speed * Math.cos(beta);
      const omega = speed * Math.sin(beta) / r;
      expect(directionalWetWidthAt(r, theta, halfWet, streamwise, omega))
        .toBeCloseTo(expected, 14);
    }
  });

  it("keeps the direction kink finite and symmetric instead of assuming smoothness", () => {
    const theta = 0.3;
    const r = 0.4;
    const halfWet = geometryAtXi(0, theta, r);
    const epsilon = 1e-8;
    const positive = directionalWetWidthAt(r, theta, halfWet, 1, epsilon / r);
    const negative = directionalWetWidthAt(r, theta, halfWet, 1, -epsilon / r);
    expect(Number.isFinite(positive)).toBe(true);
    expect(positive).toBeCloseTo(negative, 14);
    expect(positive).toBeGreaterThan(halfWet.radius);
  });

  it("recovers the streamwise wet width without changing its definition", () => {
    const theta = 0.42;
    const geometry: P0CylinderGeometry = {
      radius: 0.018,
      topDistance: 0.08,
      bottomDistance: 0.65,
      pivotHeight: 0.24,
    };
    for (let index = 0; index <= 40; index += 1) {
      const r = geometry.topDistance
        + (geometry.bottomDistance - geometry.topDistance) * index / 40;
      expect(directionalWetWidthAt(r, theta, geometry, 0.3, 0))
        .toBeCloseTo(wetProjectedWidthAt(r, theta, geometry), 13);
    }
  });
});

describe("direction-dependent drag load", () => {
  it("matches 150 independent Cartesian force/cross-product references and is passive", () => {
    const random = makeRandom(20260905);
    const geometry: P0CylinderGeometry = {
      radius: 0.018,
      topDistance: 0.08,
      bottomDistance: 0.65,
      pivotHeight: 0.24,
    };
    const density = 997;
    let distinctFromStreamwiseWidth = 0;
    const maximumRelativeError = {
      forceStreamwise: 0,
      forceTangential: 0,
      torque: 0,
    };
    let maximumPower = Number.NEGATIVE_INFINITY;
    for (let sample = 0; sample < 150; sample += 1) {
      let theta = -0.72 + 1.44 * random();
      if (Math.abs(theta) < 0.08) theta = Math.sign(theta || 1) * 0.08;
      const omegaSign = random() < 0.5 ? -1 : 1;
      const omega = omegaSign * (0.15 + 4 * random());
      const streamwiseSpeed = -0.45 + 0.9 * random();
      const dragCoefficient = 0.35 + 1.8 * random();
      const actual = evaluateDirectionalDrag({
        theta,
        omega,
        density,
        geometry,
        streamwiseSpeed,
        dragCoefficient,
        quadratureOrder: 48,
      });
      const expected = integrateCartesianReference(
        theta,
        omega,
        density,
        streamwiseSpeed,
        dragCoefficient,
        geometry,
      );
      const forceStreamwiseError = relativeError(
        actual.forceStreamwise,
        expected.forceStreamwise,
        1e-10,
      );
      const forceTangentialError = relativeError(
        actual.forceTangential,
        expected.forceTangential,
        1e-10,
      );
      const torqueError = relativeError(actual.torque, expected.torque, 1e-10);
      maximumRelativeError.forceStreamwise = Math.max(
        maximumRelativeError.forceStreamwise,
        forceStreamwiseError,
      );
      maximumRelativeError.forceTangential = Math.max(
        maximumRelativeError.forceTangential,
        forceTangentialError,
      );
      maximumRelativeError.torque = Math.max(maximumRelativeError.torque, torqueError);
      maximumPower = Math.max(maximumPower, actual.power);
      expect(forceStreamwiseError).toBeLessThan(2e-6);
      expect(forceTangentialError).toBeLessThan(2e-6);
      expect(torqueError).toBeLessThan(2e-6);
      expect(actual.power).toBeLessThanOrEqual(2e-13);

      const baselineTorque = integrateDirectionalWetSpan(
        { theta, geometry, quadratureOrder: 48 },
        (r) => -0.5 * density * dragCoefficient * omega * r ** 2
          * Math.hypot(streamwiseSpeed, r * omega)
          * wetProjectedWidthAt(r, theta, geometry),
      );
      if (relativeError(actual.torque, baselineTorque, 1e-10) > 1e-4) {
        distinctFromStreamwiseWidth += 1;
      }
    }
    expect(distinctFromStreamwiseWidth).toBeGreaterThan(100);
    if (process.env.DW_REPORT === "1") {
      console.info(JSON.stringify({
        loadSamples: 150,
        maximumRelativeError,
        maximumPower,
        distinctFromStreamwiseWidth,
      }));
    }
  }, 30_000);

  it("reduces to baseline drag for a fully wet cylinder", () => {
    const geometry: P0CylinderGeometry = {
      radius: 0.02,
      topDistance: 0.1,
      bottomDistance: 0.7,
      pivotHeight: 0.01,
    };
    const theta = 0.2;
    const omega = -1.3;
    const density = 999;
    const streamwiseSpeed = 0.34;
    const dragCoefficient = 1.1;
    const actual = evaluateDirectionalDrag({
      theta,
      omega,
      density,
      geometry,
      streamwiseSpeed,
      dragCoefficient,
    });
    const expected = -0.5 * density * dragCoefficient * omega
      * integrateDirectionalWetSpan({ theta, geometry }, (r) =>
        2 * geometry.radius * r ** 2 * Math.hypot(streamwiseSpeed, r * omega));
    expect(actual.torque).toBeCloseTo(expected, 12);
    expect(actual.power).toBeLessThanOrEqual(0);
  });

  it("supports sectional inflow/C_D and rejects an active drag coefficient", () => {
    const geometry: P0CylinderGeometry = {
      radius: 0.018,
      topDistance: 0.08,
      bottomDistance: 0.65,
      pivotHeight: 0.24,
    };
    let coefficientCalls = 0;
    const evaluated = evaluateDirectionalDrag({
      theta: 0.36,
      omega: 1.2,
      density: 998,
      geometry,
      streamwiseSpeed: (r) => 0.2 + 0.1 * r,
      dragCoefficient: (section) => {
        coefficientCalls += 1;
        expect(section.relativeSpeed).toBeGreaterThan(0);
        expect(section.directionalWidth).toBeGreaterThan(0);
        return 0.9 + 0.1 * Math.abs(section.directionWet);
      },
    });
    expect(coefficientCalls).toBeGreaterThan(0);
    expect(evaluated.power).toBeLessThan(0);
    expect(() => evaluateDirectionalDrag({
      theta: 0.36,
      omega: 1.2,
      density: 998,
      geometry,
      streamwiseSpeed: 0.25,
      dragCoefficient: -0.1,
    })).toThrow(/nonnegative/);
  });

  it("converges under genuine wet-span quadrature refinement", () => {
    const geometry: P0CylinderGeometry = {
      radius: 0.02,
      topDistance: 0.08,
      bottomDistance: 0.68,
      pivotHeight: 0.26,
    };
    const theta = 0.53;
    const omega = 2.4;
    const density = 998;
    const streamwiseSpeedAt = (r: number) => 0.18 + 0.25 * r;
    const dragCoefficientAt = (_r: number, directionWet: number) =>
      0.8 + 0.3 * Math.abs(directionWet);
    const quadratureOrders = [16, 32, 64, 128] as const;
    const torques = quadratureOrders.map((quadratureOrder) =>
      evaluateDirectionalDrag({
        theta,
        omega,
        density,
        geometry,
        streamwiseSpeed: streamwiseSpeedAt,
        dragCoefficient: (section) =>
          dragCoefficientAt(section.r, section.directionWet),
        quadratureOrder,
      }).torque);
    const referenceTorque = integrateProfiledCartesianReference(
      theta,
      omega,
      density,
      geometry,
      streamwiseSpeedAt,
      dragCoefficientAt,
    ).torque;
    const errors = torques.map((value) => Math.abs(value - referenceTorque));
    expect(errors[1]!).toBeLessThan(errors[0]!);
    expect(errors[2]!).toBeLessThan(errors[1]!);
    expect(errors[3]!).toBeLessThan(errors[2]!);
    expect(relativeError(torques[3] ?? 0, referenceTorque, 1e-12)).toBeLessThan(1e-7);
    if (process.env.DW_REPORT === "1") {
      console.info(JSON.stringify({
        quadratureOrders,
        torques,
        referenceTorque,
        absoluteErrors: errors,
        finestRelativeError: relativeError(torques[3] ?? 0, referenceTorque, 1e-12),
      }));
    }
  }, 30_000);
});
