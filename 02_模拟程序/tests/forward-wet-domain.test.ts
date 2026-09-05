import { describe, expect, it } from "vitest";
import { cloneConfig, deriveParameters } from "../src/core/config";
import type {
  RuntimeCalibrationCell,
  SimulationConfig,
} from "../src/core/types";
import {
  buildLegacyWakeGaugeMetadata,
  executableWakeGaugeParameterUnits,
} from "../src/core/wake-gauge";
import { runForward } from "../src/solvers/forward";
import {
  evaluateForwardDomain,
  evaluateForward,
  type ForwardState,
} from "../src/solvers/forward/model";

const MODEL_ID = "VP-FWD-P0-SL1-v1" as const;

function broadCell(minimumWetSpan = 0): RuntimeCalibrationCell {
  return {
    flowSpeedMps: { minimum: 0, maximum: 2 },
    waterDepthM: { minimum: 0, maximum: 2 },
    pivotHeightM: { minimum: -2, maximum: 2 },
    reynolds: { minimum: 0, maximum: 1e8 },
    wetSpanM: { minimum: minimumWetSpan, maximum: 2 },
    absThetaRad: { minimum: 0, maximum: 1.5 },
    velocityRatio: { minimum: 0, maximum: 1e8 },
    normalizedInflowRate: { minimum: 0, maximum: 1e8 },
  };
}

function strictConfig(minimumWetSpan = 0): SimulationConfig {
  const config = cloneConfig();
  Object.assign(config.rom, {
    modelId: MODEL_ID,
    inputClassification: "synthetic-only",
    wetSupportMode: "synthetic-only",
    wetSpanDefinition: "streamwise-projected-area-over-diameter",
    calibrationMinWetSpan: minimumWetSpan,
    jointCalibrationSupport: {
      kind: "covered-cells",
      evidence: "synthetic 13-A fixture; no apparatus qualification",
      cells: [broadCell(minimumWetSpan)],
    },
    dragWidthDefinition: "streamwise-wet-width",
    wakeGauge: buildLegacyWakeGaugeMetadata({
      id: "13-A-explicit-baseline-gauge",
      modelId: MODEL_ID,
      sourceReference: "tests/forward-wet-domain.test.ts",
      amplitudeConvention: "legacy dimensionless complex Stuart-Landau amplitude",
      phaseReference: "configured initial complex phase at t=0",
      timeBasis: { unit: "s", scaleToSeconds: 1 },
      output: {
        kind: "sectional-lift-coefficient",
        unit: "1",
        expression: "finiteSpanCoherence*Re(liftOutput*A)",
        referenceIdentity: "P0 streamwise wet width and local dynamic pressure",
        coefficientPaths: {
          real: "rom.liftOutputReal",
          imaginary: "rom.liftOutputImaginary",
        },
      },
      finiteSpanCoherence: {
        kind: "independent-closure",
        representation: "constant-factor",
        closureId: "configured finite-span scalar",
        parameterPath: "rom.finiteSpanCoherence",
      },
      parameterUnits: executableWakeGaugeParameterUnits(),
      parameterNormalizationIdentity: "VP-FWD-P0-SL1-production-normalization-v1",
      covarianceIdentity: null,
    }),
  });
  config.rom.calibrationMinReynolds = 0;
  config.rom.calibrationMaxReynolds = 1e8;
  config.rom.calibrationMaxAbsAngle = 1.5;
  config.rom.calibrationMaxVelocityRatio = 1e8;
  config.rom.calibrationMaxNormalizedInflowRate = 1e8;
  config.solver.duration = 0.02;
  config.solver.initialStep = 0.001;
  config.solver.maximumStep = 0.005;
  config.solver.outputInterval = 0.005;
  return config;
}

function stateOf(config: SimulationConfig): ForwardState {
  return {
    theta: config.initial.theta,
    omega: config.initial.omega,
    wakeReal: config.initial.wakeReal,
    wakeImaginary: config.initial.wakeImaginary,
  };
}

describe("13-A strict wet-domain entry", () => {
  it("returns an empty, explicitly invalid result when the cylinder starts fully dry", async () => {
    const config = strictConfig();
    config.geometry.pivotHeight = 0.19;
    config.initial.theta = 0;
    const result = await runForward(config, undefined, "13-A-initial-dry");

    expect(result.terminationCode).toBe("WET-DOMAIN-EXIT");
    expect(result.complete).toBe(false);
    expect(result.samples).toEqual([]);
    expect(result.validSampleMask).toEqual([]);
    expect(result.lastValidSampleIndex).toBeNull();
    expect(result.metrics).toMatchObject({ available: false, sampleCount: 0 });
    expect(result.events[0]).toMatchObject({
      time: 0,
      validBefore: false,
      validAfter: false,
    });
    expect(result.events[0]?.message).toMatch(/湿投影面积/u);
  });

  it("distinguishes wet zero-flow operation from a dry cylinder", async () => {
    const config = strictConfig();
    config.geometry.pivotHeight = 0.02;
    config.geometry.waterDepth = 0.25;
    config.fluid.flowSpeed = 0;
    config.fluid.flowRampTime = 0;
    config.initial.theta = 0;
    config.initial.omega = 0;
    config.initial.wakeReal = 0;
    config.initial.wakeImaginary = 0;
    const domain = evaluateForwardDomain(config, 0, stateOf(config));
    const result = await runForward(config, undefined, "13-A-zero-flow-wet");

    expect(domain.wetBranch).toBe("full");
    expect(domain.wakeReferenceSpeed).toBe(0);
    expect(result.terminationCode).toBe("COMPLETED");
    expect(result.samples.length).toBeGreaterThan(1);
    expect(result.samples.every((sample) => sample.valid === true)).toBe(true);
  });

  it("terminates at t=0 when a positive wet span lies below independent coverage", async () => {
    const config = strictConfig(0.02);
    config.geometry.pivotHeight = 0.175;
    config.initial.theta = 0;
    const domain = evaluateForwardDomain(config, 0, stateOf(config));
    expect(domain.wetSpan).toBeGreaterThan(0);
    expect(domain.wetSpan).toBeLessThan(0.02);

    const result = await runForward(config, undefined, "13-A-initial-wet-below-coverage");
    expect(result.terminationCode).toBe("WET-DOMAIN-EXIT");
    expect(result.samples).toEqual([]);
    expect(result.events[0]?.message).toMatch(/湿跨/u);
  });

  it("rejects a strict package whose minimum wet-span evidence is absent", async () => {
    const config = strictConfig();
    delete config.rom.calibrationMinWetSpan;
    await expect(runForward(config, undefined, "13-A-missing-minimum-span"))
      .rejects.toThrow(/calibrationMinWetSpan/u);
  });

  it("accepts equality at the closed minimum-span and joint-cell boundaries", async () => {
    const config = strictConfig();
    config.geometry.pivotHeight = 0.02;
    config.geometry.waterDepth = 0.25;
    config.fluid.flowSpeed = 0;
    config.fluid.flowRampTime = 0;
    config.initial.theta = 0;
    config.initial.omega = 0;
    config.initial.wakeReal = 0;
    config.initial.wakeImaginary = 0;
    const wetSpan = evaluateForwardDomain(config, 0, stateOf(config)).wetSpan;
    config.rom.calibrationMinWetSpan = wetSpan;
    config.rom.jointCalibrationSupport = {
      kind: "covered-cells",
      evidence: "closed-boundary 13-A fixture",
      cells: [{
        ...broadCell(wetSpan),
        flowSpeedMps: { minimum: 0, maximum: 0 },
        waterDepthM: { minimum: config.geometry.waterDepth, maximum: config.geometry.waterDepth },
        pivotHeightM: { minimum: config.geometry.pivotHeight, maximum: config.geometry.pivotHeight },
        reynolds: { minimum: 0, maximum: 0 },
        wetSpanM: { minimum: wetSpan, maximum: wetSpan },
        absThetaRad: { minimum: 0, maximum: 0 },
        velocityRatio: { minimum: 0, maximum: 0 },
        normalizedInflowRate: { minimum: 0, maximum: 0 },
      }],
    };

    const result = await runForward(config, undefined, "13-A-closed-boundary");
    expect(result.terminationCode).toBe("COMPLETED");
    expect(result.samples[0]?.time).toBe(0);
    expect(result.samples.every((sample) => sample.valid === true)).toBe(true);
  });

  it("uses complete eight-coordinate cells instead of a Cartesian union of marginals", async () => {
    const config = strictConfig();
    config.fluid.flowSpeed = 0;
    config.fluid.flowRampTime = 0;
    const first = broadCell();
    first.waterDepthM = { minimum: 0, maximum: 0.1 };
    const second = broadCell();
    second.flowSpeedMps = { minimum: 0.1, maximum: 0.2 };
    config.rom.jointCalibrationSupport = {
      kind: "covered-cells",
      evidence: "two disjoint 13-A cells",
      cells: [first, second],
    };

    const result = await runForward(config, undefined, "13-A-joint-hole");
    expect(result.terminationCode).toBe("COEFFICIENT-OOD");
    expect(result.samples).toEqual([]);
    expect(result.events[0]?.message).toMatch(/八坐标联合/u);
  });
});

/** Independent fixed-step classical RK4 reference, with the legacy extension
 * used solely to locate the first wet boundary of a zero-wake subproblem. */
function wetExitReference(config: SimulationConfig, step = 0.00002): number {
  const extended = structuredClone(config);
  extended.rom.wetSupportMode = "legacy-unqualified";
  const rhs = (t: number, x: ForwardState) => evaluateForward(extended, t, x).derivative;
  const plus = (x: ForwardState, dx: ForwardState, h: number): ForwardState => ({
    theta: x.theta + h * dx.theta, omega: x.omega + h * dx.omega,
    wakeReal: x.wakeReal + h * dx.wakeReal, wakeImaginary: x.wakeImaginary + h * dx.wakeImaginary,
  });
  const advance = (t: number, x: ForwardState, h: number): ForwardState => {
    const a = rhs(t, x), b = rhs(t + h / 2, plus(x, a, h / 2));
    const c = rhs(t + h / 2, plus(x, b, h / 2)), d = rhs(t + h, plus(x, c, h));
    const rate = Object.fromEntries(Object.keys(x).map((key) => {
      const k = key as keyof ForwardState;
      return [k, (a[k] + 2 * b[k] + 2 * c[k] + d[k]) / 6];
    })) as unknown as ForwardState;
    return plus(x, rate, h);
  };
  const valid = (x: ForwardState) => {
    // Independent finite-cylinder support is exact for first positive wet area.
    const { radius, bottomDistance, pivotHeight } = config.geometry;
    return bottomDistance * Math.cos(x.theta) + radius * Math.abs(Math.sin(x.theta)) > pivotHeight;
  };
  let state = stateOf(config);
  for (let t = 0; t < config.solver.duration; t += step) {
    const next = advance(t, state, step);
    if (!valid(next)) {
      let low = 0, high = step;
      for (let j = 0; j < 40; j += 1) {
        const mid = (low + high) / 2;
        if (valid(advance(t, state, mid))) low = mid; else high = mid;
      }
      return t + (low + high) / 2;
    }
    state = next;
  }
  throw new Error("reference did not encounter a dry state");
}

function inertialWetConfig(): SimulationConfig {
  const config = strictConfig();
  config.geometry.channelWidth = 1;
  config.geometry.waterDepth = 0.4;
  config.fluid.flowSpeed = 0;
  config.fluid.flowRampTime = 0;
  config.support.coulombFriction = 0;
  config.support.viscousDamping = 0;
  config.rom.addedMassCoefficient = 0;
  config.rom.couplingThetaReal = config.rom.couplingThetaImaginary = 0;
  config.rom.couplingOmegaReal = config.rom.couplingOmegaImaginary = 0;
  config.rom.couplingAccelerationReal = config.rom.couplingAccelerationImaginary = 0;
  config.initial.wakeReal = config.initial.wakeImaginary = 0;
  config.solver.eventTimeTolerance = 1e-10;
  config.solver.relativeTolerance = 1e-9;
  config.solver.absoluteToleranceTheta = config.solver.absoluteToleranceOmega = 1e-11;
  return config;
}

describe("13-A wet exits through the production integrator", () => {
  it("finds the first dry exit with output cadence x4 and four actual step refinements", async () => {
    const base = inertialWetConfig();
    base.geometry.pivotHeight = 0.17;
    base.initial.theta = 0.25;
    base.initial.omega = 5;
    base.solver.duration = 0.08;
    const reference = wetExitReference(base);
    const exits: number[] = [];
    for (const maximumStep of [0.02, 0.01, 0.005, 0.0025]) {
      for (const outputInterval of [0.02, 0.08]) {
        const config = structuredClone(base);
        Object.assign(config.solver, { initialStep: maximumStep, maximumStep, outputInterval });
        const result = await runForward(config);
        const event = result.events.find((item) => item.code === "WET-DOMAIN-EXIT");
        expect(result.terminationCode).toBe("WET-DOMAIN-EXIT");
        expect(event?.bracket).toBeDefined();
        expect(event!.bracket!.invalidTime - event!.bracket!.validTime).toBeLessThanOrEqual(1.01e-10);
        expect(Math.abs(event!.time - reference)).toBeLessThan(1e-7);
        expect(result.samples.at(-1)?.time).toBe(event!.bracket!.validTime);
        expect(result.samples.every((sample) => sample.projectedWetArea > 0 && sample.valid)).toBe(true);
        exits.push(event!.time);
      }
    }
    console.log("WET_EXIT_REFINEMENT", JSON.stringify({ referenceAlgorithm: "RK4 + analytic cylinder support", reference, exits }));
  }, 20000); // Bounded multi-run numerical/reference check under concurrent suite load.

  it("detects a dry interval inside a step even when the historical endpoints are wet", async () => {
    const config = inertialWetConfig();
    config.geometry.pivotHeight = config.geometry.bottomDistance + 1e-7;
    config.initial.theta = -0.03;
    config.initial.omega = 1;
    Object.assign(config.solver, { duration: 0.05, initialStep: 0.05, maximumStep: 0.05, outputInterval: 0.05 });
    const legacy = structuredClone(config);
    legacy.rom.wetSupportMode = "legacy-unqualified";
    const continued = await runForward(legacy);
    expect(continued.samples[0]!.projectedWetArea).toBeGreaterThan(0);
    expect(continued.samples.at(-1)!.projectedWetArea).toBeGreaterThan(0);
    const result = await runForward(config);
    expect(result.terminationCode).toBe("WET-DOMAIN-EXIT");
    const reference = wetExitReference(config, 0.000005);
    expect(Math.abs(result.events.find((e) => e.code === "WET-DOMAIN-EXIT")!.time - reference)).toBeLessThan(1e-7);
    expect(result.samples.at(-1)!.theta).toBeLessThan(0);
  }, 20000); // Bounded multi-run numerical/reference check under concurrent suite load.

  it("rejects a coarse out-of-domain RK stage without inventing a physical event", async () => {
    const config = inertialWetConfig();
    config.geometry.pivotHeight = 0.175;
    config.support.linearStiffness = 100;
    config.initial.theta = 0;
    config.initial.omega = 10;
    Object.assign(config.solver, { duration: 0.1, initialStep: 0.1, maximumStep: 0.1, outputInterval: 0.1 });
    const result = await runForward(config);
    expect(result.terminationCode).toBe("COMPLETED");
    expect(result.numerical.rejectedSteps).toBeGreaterThan(0);
    expect(result.events.some((event) => event.code === "WET-DOMAIN-EXIT")).toBe(false);
  }, 20000); // Bounded multi-run numerical/reference check under concurrent suite load.
});

describe("13-A run classification", () => {
  it("marks legacy, synthetic and calibrated input identities without filename heuristics", async () => {
    const legacy = cloneConfig();
    legacy.solver.duration = 0.002;
    legacy.solver.outputInterval = 0.001;
    legacy.solver.maximumStep = 0.001;
    legacy.fluid.flowRampTime = 0;
    const synthetic = strictConfig();
    synthetic.solver.duration = 0.002;
    const calibrated = strictConfig();
    calibrated.rom.wetSupportMode = "calibrated";
    calibrated.rom.inputClassification = "calibrated-input-unheldout";
    calibrated.rom.coefficientSource = "measured";
    calibrated.rom.coefficientSetId = "measured-package-without-name-convention";
    calibrated.solver.duration = 0.002;

    const [legacyResult, syntheticResult, calibratedResult] = await Promise.all([
      runForward(legacy, undefined, "13-A-class-legacy"),
      runForward(synthetic, undefined, "13-A-class-synthetic"),
      runForward(calibrated, undefined, "13-A-class-calibrated"),
    ]);
    expect(legacyResult.provenance.legacyStatus)
      .toBe("legacy-exploratory-invalidated-for-load-validation");
    expect(legacyResult.provenance.epistemicClassification)
      .toBe("illustrative-literature-prior");
    expect(syntheticResult.provenance.epistemicClassification).toBe("synthetic-only");
    expect(syntheticResult.provenance.holdoutStatus).toBe("not-applicable-synthetic");
    expect(calibratedResult.provenance.epistemicClassification)
      .toBe("rom-calibrated-input-unheldout");
    expect(calibratedResult.provenance.holdoutStatus).toBe("not-bound-in-standalone-run");
  });
});
