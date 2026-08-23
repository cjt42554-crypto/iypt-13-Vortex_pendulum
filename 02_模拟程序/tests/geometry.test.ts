import { describe, expect, it } from "vitest";
import {
  buoyancyTorque,
  cylinderSupport,
  evaluateWetGeometry,
  hydrostaticPotential,
  type P0CylinderGeometry,
} from "../src/problems/vortex-pendulum/geometry";

const geometry: P0CylinderGeometry = {
  radius: 0.03,
  topDistance: 0.10,
  bottomDistance: 0.60,
  pivotHeight: 0.25,
};

const density = 998;
const gravity = 9.81;

describe("P0 exact wet geometry", () => {
  it("recovers the vertical partially immersed cylinder without a theta=0 singularity", () => {
    const wet = evaluateWetGeometry(0, geometry);
    const expectedLength = geometry.bottomDistance - geometry.pivotHeight;
    expect(wet.branch).toBe("partial");
    expect(wet.displacedVolume).toBeCloseTo(Math.PI * geometry.radius ** 2 * expectedLength, 13);
    expect(wet.axisWetLength).toBeCloseTo(expectedLength, 14);
    expect(wet.volumeEquivalentLength).toBeCloseTo(expectedLength, 13);
    expect(wet.buoyancyCentroid?.y).toBeCloseTo(0, 14);
    expect(wet.streamwiseProjectedArea).toBeCloseTo(2 * geometry.radius * expectedLength, 14);
  });

  it("matches the side-only finite-radius volume and buoyancy-torque correction", () => {
    const theta = 0.30;
    const wet = evaluateWetGeometry(theta, geometry);
    const area = Math.PI * geometry.radius ** 2;
    const waterplaneMoment = Math.PI * geometry.radius ** 4 / 4;
    const lower = geometry.pivotHeight / Math.cos(theta);
    const axisTorque = density * gravity * area * Math.sin(theta)
      * (geometry.bottomDistance ** 2 - lower ** 2) / 2;
    const correction = -density * gravity * waterplaneMoment * Math.sin(theta)
      * (1 + 0.5 * Math.tan(theta) ** 2);
    const expectedVolume = area * (geometry.bottomDistance - lower);

    expect(wet.sideOnly).toBe(true);
    expect(wet.displacedVolume).toBeCloseTo(expectedVolume, 13);
    expect(wet.wettedLateralArea / (2 * Math.PI * geometry.radius))
      .toBeCloseTo(wet.axisWetLength, 12);
    expect(wet.streamwiseProjectedArea).toBeCloseTo(2 * geometry.radius * wet.axisWetLength, 12);
    expect(buoyancyTorque(theta, geometry, density, gravity))
      .toBeCloseTo(axisTorque + correction, 10);
  });

  it("preserves left-right reflection symmetry", () => {
    const positive = evaluateWetGeometry(0.24, geometry);
    const negative = evaluateWetGeometry(-0.24, geometry);
    expect(positive.displacedVolume).toBeCloseTo(negative.displacedVolume, 13);
    expect(positive.hydrostaticDepthIntegral).toBeCloseTo(negative.hydrostaticDepthIntegral, 13);
    expect(positive.buoyancyTorqueIntegral).toBeCloseTo(-negative.buoyancyTorqueIntegral, 13);
    expect(positive.buoyancyCentroid?.y).toBeCloseTo(-(negative.buoyancyCentroid?.y ?? 0), 13);
  });

  it("handles fully dry and fully wet endpoint branches", () => {
    const dry = evaluateWetGeometry(0, { ...geometry, pivotHeight: 0.70 });
    const full = evaluateWetGeometry(0, { ...geometry, pivotHeight: 0.05 });
    expect(dry.branch).toBe("dry");
    expect(dry.displacedVolume).toBe(0);
    expect(dry.buoyancyCentroid).toBeNull();
    expect(full.branch).toBe("full");
    expect(full.displacedVolume).toBeCloseTo(
      Math.PI * geometry.radius ** 2 * (geometry.bottomDistance - geometry.topDistance),
      13,
    );
  });

  it("makes Q_B equal to minus the numerical derivative of hydrostatic potential", () => {
    const theta = 0.21;
    const step = 2e-5;
    const derivative = (
      hydrostaticPotential(theta + step, geometry, density, gravity)
      - hydrostaticPotential(theta - step, geometry, density, gravity)
    ) / (2 * step);
    expect(buoyancyTorque(theta, geometry, density, gravity)).toBeCloseTo(-derivative, 7);
  });

  it("matches the finite-cylinder support function in axial and radial directions", () => {
    const halfLength = (geometry.bottomDistance - geometry.topDistance) / 2;
    expect(cylinderSupport({ x: 0, y: 0, z: 1 }, 0, geometry)).toBeCloseTo(halfLength, 14);
    expect(cylinderSupport({ x: 0, y: 1, z: 0 }, 0, geometry)).toBeCloseTo(geometry.radius, 14);
    expect(cylinderSupport({ x: 1, y: 0, z: 0 }, 0.4, geometry)).toBeCloseTo(geometry.radius, 14);
  });
});
