import { describe, expect, it } from "vitest";
import { cloneConfig } from "../src/core/config";
import { runHighFidelity } from "../src/solvers/highFidelity";
import { HighFidelitySimulation } from "../src/solvers/highFidelity/model";
import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED_SQUARED,
  d2q9Equilibrium,
  d2q9Moments,
  type LbmBodyKinematics,
} from "../src/solvers/highFidelity/lbm";

describe("D2Q9 MRT-Brinkman kernel", () => {
  it("recovers the prescribed equilibrium density and momentum", () => {
    const equilibrium = d2q9Equilibrium(1.017, 0.031, -0.012);
    const moments = d2q9Moments(equilibrium);
    expect(moments.rho).toBeCloseTo(1.017, 14);
    expect(moments.momentumX).toBeCloseTo(1.017 * 0.031, 14);
    expect(moments.momentumY).toBeCloseTo(1.017 * -0.012, 14);
  });

  it("preserves a uniform periodic flow and global mass", () => {
    const solver = new D2Q9MrtBrinkmanSolver({
      nx: 32,
      ny: 24,
      relaxationTime: 0.8,
      penalizationTimeSteps: 2,
      outerBoundary: "periodic",
    });
    solver.initializeUniform(0.031, -0.012);
    const initial = solver.inspect(null);
    for (let step = 0; step < 30; step += 1) solver.step(null, 0);
    const final = solver.inspect(null);
    const field = solver.macroscopicCopies(null);
    expect(Math.abs(final.mass - initial.mass) / initial.mass).toBeLessThan(2e-14);
    expect(final.minimumDensity).toBeCloseTo(1, 13);
    expect(final.maximumDensity).toBeCloseTo(1, 13);
    expect(Math.max(...Array.from(field.ux, (value) => Math.abs(value - 0.031)))).toBeLessThan(2e-14);
    expect(Math.max(...Array.from(field.uy, (value) => Math.abs(value + 0.012)))).toBeLessThan(2e-14);
  });

  it("preserves an initialized uniform flow through the open boundaries", () => {
    const solver = new D2Q9MrtBrinkmanSolver({
      nx: 64,
      ny: 32,
      relaxationTime: 0.65,
      penalizationTimeSteps: 2,
      outerBoundary: "open-periodic-crossflow",
    });
    solver.initializeUniform(0.05, 0);
    for (let step = 0; step < 400; step += 1) solver.step(null, 0.05);
    const inspection = solver.inspect(null);
    expect(inspection.minimumDensity).toBeCloseTo(1, 11);
    expect(inspection.maximumDensity).toBeCloseTo(1, 11);
    expect(inspection.maximumSpeed).toBeCloseTo(0.05, 11);
  });

  it("does not generate a force in exact zero flow around a stationary body", () => {
    const solver = new D2Q9MrtBrinkmanSolver({
      nx: 48,
      ny: 32,
      relaxationTime: 0.75,
      penalizationTimeSteps: 1.5,
      outerBoundary: "periodic",
    });
    const body: LbmBodyKinematics = {
      centerX: 17.2,
      centerY: 15.4,
      radius: 4,
      velocityX: 0,
      velocityY: 0,
    };
    for (let step = 0; step < 20; step += 1) solver.step(body, 0);
    const force = solver.penaltyReaction(body);
    const inspection = solver.inspect(body);
    expect(Math.hypot(force.x, force.y)).toBeLessThan(1e-14);
    expect(Math.hypot(inspection.stressForceX, inspection.stressForceY)).toBeLessThan(1e-13);
  });

  it("keeps a penalized stationary body finite in a periodic moving fluid", () => {
    const solver = new D2Q9MrtBrinkmanSolver({
      nx: 96,
      ny: 48,
      relaxationTime: 0.56,
      penalizationTimeSteps: 5,
      outerBoundary: "periodic",
    });
    const body: LbmBodyKinematics = {
      centerX: 28.2,
      centerY: 23.4,
      radius: 6,
      velocityX: 0,
      velocityY: 0,
    };
    solver.initializeUniform(0.05, 0);
    for (let step = 0; step < 500; step += 1) solver.step(body, 0);
    const inspection = solver.inspect(body);
    expect(inspection.minimumDensity).toBeGreaterThan(0.8);
    expect(inspection.maximumDensity).toBeLessThan(1.2);
    expect(inspection.maximumSpeed).toBeLessThan(0.15);
  });

  it("records the accepted Guo source and closes the raw Brinkman work identity", () => {
    const solver = new D2Q9MrtBrinkmanSolver({
      nx: 72,
      ny: 40,
      relaxationTime: 0.71,
      penalizationTimeSteps: 1.7,
      outerBoundary: "periodic",
    });
    const body: LbmBodyKinematics = {
      centerX: 25.3,
      centerY: 19.1,
      radius: 5,
      velocityX: 0.006,
      velocityY: -0.011,
    };
    solver.initializeUniform(0.032, 0.004);
    for (let step = 0; step < 24; step += 1) {
      const legacyAppliedReaction = solver.penaltyReaction(body);
      const exchange = solver.step(body, 0);
      expect(exchange.rawReactionImpulseX).toBe(legacyAppliedReaction.x);
      expect(exchange.rawReactionImpulseY).toBe(legacyAppliedReaction.y);
      expect(exchange.penaltyDissipation).toBeGreaterThanOrEqual(
        -32 * Number.EPSILON * Math.max(exchange.absoluteWorkScale, Number.MIN_VALUE),
      );
      expect(Math.abs(exchange.algebraicWorkResidual)).toBeLessThanOrEqual(
        100 * Number.EPSILON * Math.max(exchange.absoluteWorkScale, Number.MIN_VALUE),
      );
    }
  });

  it("replays a same-version checkpoint bit for bit", () => {
    const makeSolver = () => new D2Q9MrtBrinkmanSolver({
      nx: 28,
      ny: 20,
      relaxationTime: 0.82,
      penalizationTimeSteps: 2,
      outerBoundary: "periodic",
    });
    const continuous = makeSolver();
    continuous.initializeField((x, y) => ({
      ux: 0.02 * Math.sin(2 * Math.PI * y / 20),
      uy: 0.01 * Math.cos(2 * Math.PI * x / 28),
    }));
    for (let step = 0; step < 12; step += 1) continuous.step(null, 0);
    const checkpoint = continuous.checkpoint();
    for (let step = 0; step < 17; step += 1) continuous.step(null, 0);

    const resumed = makeSolver();
    resumed.restore(checkpoint);
    for (let step = 0; step < 17; step += 1) resumed.step(null, 0);
    const a = continuous.checkpoint().distributions;
    const b = resumed.checkpoint().distributions;
    expect(a.length).toBe(b.length);
    for (let index = 0; index < a.length; index += 1) expect(a[index]).toBe(b[index]);
  });

  it("tracks the analytic decay of a periodic Taylor-Green vortex", () => {
    const size = 32;
    const amplitude = 0.02;
    const waveNumber = 2 * Math.PI / size;
    const relaxationTime = 0.8;
    const viscosity = LATTICE_SOUND_SPEED_SQUARED * (relaxationTime - 0.5);
    const solver = new D2Q9MrtBrinkmanSolver({
      nx: size,
      ny: size,
      relaxationTime,
      penalizationTimeSteps: 2,
      outerBoundary: "periodic",
    });
    solver.initializeField((x, y) => {
      const ux = amplitude * Math.sin(waveNumber * x) * Math.cos(waveNumber * y);
      const uy = -amplitude * Math.cos(waveNumber * x) * Math.sin(waveNumber * y);
      const pressure = 0.25 * amplitude ** 2 * (
        Math.cos(2 * waveNumber * x) + Math.cos(2 * waveNumber * y)
      );
      return { rho: 1 + pressure / LATTICE_SOUND_SPEED_SQUARED, ux, uy };
    });
    const steps = 25;
    for (let step = 0; step < steps; step += 1) solver.step(null, 0);
    const fields = solver.macroscopicCopies(null);
    const decay = Math.exp(-2 * viscosity * waveNumber ** 2 * steps);
    let squaredError = 0;
    let squaredReference = 0;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const cell = x + size * y;
        const expectedX = amplitude * Math.sin(waveNumber * x) * Math.cos(waveNumber * y) * decay;
        const expectedY = -amplitude * Math.cos(waveNumber * x) * Math.sin(waveNumber * y) * decay;
        squaredError += ((fields.ux[cell] ?? 0) - expectedX) ** 2
          + ((fields.uy[cell] ?? 0) - expectedY) ** 2;
        squaredReference += expectedX ** 2 + expectedY ** 2;
      }
    }
    expect(Math.sqrt(squaredError / squaredReference)).toBeLessThan(0.025);
  });
});

describe("VP-HF-CFD2D-v1 unified backend", () => {
  it("runs a bounded fixed-cylinder smoke case through the shared result contract", async () => {
    const config = cloneConfig();
    config.backend = "highFidelity";
    config.cfd2d.couplingMode = "fixed";
    config.cfd2d.stripClosure = "none";
    config.cfd2d.nx = 96;
    config.cfd2d.ny = 56;
    config.cfd2d.cylinderCells = 8;
    config.cfd2d.latticeVelocity = 0.04;
    config.cfd2d.sampleEvery = 4;
    config.cfd2d.fieldEvery = 8;
    config.solver.duration = 0.05;
    const result = await runHighFidelity(config, undefined, "hf-smoke");
    expect(result.terminationCode).toBe("COMPLETED");
    expect(result.complete).toBe(true);
    expect(result.backend).toBe("highFidelity");
    expect(result.provenance.nativeLoadType).toBe("line-force-per-unit-span");
    expect(result.provenance.backendDisplayName).toBe("cfd2d-sectional-reference");
    expect(result.provenance.evidenceLevel).toBe("unvalidated-preview");
    expect(result.provenance.evidenceClaims.lbmKernelComponents).toBe("component-verified");
    expect(result.provenance.evidenceClaims.dynamicLoadExtraction)
      .toBe("invalidated-pending-revalidation");
    expect(result.provenance.evidenceClaims.apparatusPrediction).toBe("no-go");
    expect(result.provenance.knownDefects)
      .toContain("raw-Brinkman-reaction-not-yet-corrected-for-virtual-internal-fluid");
    expect(result.numerical.method).toBe("D2Q9-MRT-Brinkman");
    expect(result.numerical.lattice?.steps).toBeGreaterThan(1);
    expect(result.samples.at(-1)?.time).toBeCloseTo(config.solver.duration, 14);
    expect(result.samples.every((sample) => sample.lineForceX !== null)).toBe(true);
    const lastExchange = result.samples.at(-1)?.interfaceExchange;
    expect(lastExchange?.applied?.endTime).toBeCloseTo(config.solver.duration, 14);
    expect(lastExchange?.diagnostic.endpointTime).toBeCloseTo(config.solver.duration, 14);
    expect(lastExchange?.cumulative).toEqual(expect.objectContaining({
      cumulativeAppliedRawWork: 0,
    }));
    expect(result.metrics.meanAppliedRawMechanicalPower).toBeNull();
    expect(result.metrics.meanAppliedRawLinePower).not.toBeNull();
  });

  it("separates accepted-step applied exchange from endpoint diagnostics", () => {
    const config = cloneConfig();
    config.backend = "highFidelity";
    config.cfd2d.couplingMode = "prescribed";
    config.cfd2d.stripClosure = "none";
    config.cfd2d.nx = 96;
    config.cfd2d.ny = 56;
    config.cfd2d.cylinderCells = 8;
    config.cfd2d.latticeVelocity = 0.04;
    config.solver.duration = 0.1;
    const simulation = new HighFidelitySimulation(config);
    const advance = simulation.advanceOne(true, false);
    const applied = advance.sample?.interfaceExchange?.applied;
    const diagnostic = advance.sample?.interfaceExchange?.diagnostic;
    expect(applied).toEqual(advance.exchange);
    expect(applied?.startTime).toBe(0);
    expect(applied?.midpointTime).toBeCloseTo(0.5 * simulation.mapping.dt, 15);
    expect(applied?.endTime).toBeCloseTo(simulation.mapping.dt, 15);
    expect(diagnostic?.endpointTime).toBeCloseTo(simulation.mapping.dt, 15);
    expect(advance.sample?.time).toBeCloseTo(simulation.mapping.dt, 15);
    expect(applied?.brinkmanAlgebraicResidual).toBeDefined();
    expect(diagnostic?.legacyIncompleteStressContourLineForceX).toBeDefined();
  });

  it("replays the full same-config prescribed-motion state exactly", () => {
    const config = cloneConfig();
    config.backend = "highFidelity";
    config.cfd2d.couplingMode = "prescribed";
    config.cfd2d.stripClosure = "none";
    config.cfd2d.nx = 96;
    config.cfd2d.ny = 56;
    config.cfd2d.cylinderCells = 8;
    config.cfd2d.latticeVelocity = 0.04;
    config.solver.duration = 0.1;
    const continuous = new HighFidelitySimulation(config);
    for (let step = 0; step < 17; step += 1) continuous.advanceOne();
    const checkpoint = continuous.checkpoint();
    for (let step = 0; step < 23; step += 1) continuous.advanceOne();
    const resumed = new HighFidelitySimulation(config, checkpoint);
    for (let step = 0; step < 23; step += 1) resumed.advanceOne();
    const a = continuous.checkpoint();
    const b = resumed.checkpoint();
    expect(a.latticeStep).toBe(b.latticeStep);
    expect(a.theta).toBe(b.theta);
    expect(a.omega).toBe(b.omega);
    expect(a.angularAcceleration).toBe(b.angularAcceleration);
    expect(a.cumulativeBoundaryMassInput).toBe(b.cumulativeBoundaryMassInput);
    expect(a.a1Accounting).toEqual(b.a1Accounting);
    expect(a.lbm.distributions.length).toBe(b.lbm.distributions.length);
    for (let index = 0; index < a.lbm.distributions.length; index += 1) {
      expect(a.lbm.distributions[index]).toBe(b.lbm.distributions[index]);
    }
  });

  it("is deterministic for two complete runs with the same config", async () => {
    const config = cloneConfig();
    config.backend = "highFidelity";
    config.cfd2d.couplingMode = "fixed";
    config.cfd2d.stripClosure = "none";
    config.cfd2d.nx = 96;
    config.cfd2d.ny = 56;
    config.cfd2d.cylinderCells = 8;
    config.cfd2d.latticeVelocity = 0.04;
    config.cfd2d.sampleEvery = 4;
    config.cfd2d.fieldEvery = 1000;
    config.solver.duration = 0.05;
    const first = await runHighFidelity(config, undefined, "repeat-a");
    const second = await runHighFidelity(config, undefined, "repeat-b");
    expect(first.samples).toEqual(second.samples);
    expect(first.numerical).toEqual(second.numerical);
    expect(first.fields).toEqual(second.fields);
  });
});
