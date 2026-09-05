import { describe, expect, it } from "vitest";
import { cloneConfig } from "../src/core/config";
import {
  WAKE_GAUGE_CONVERSION_VERSION,
  WakeGaugeConversionError,
  buildLegacyWakeGaugeMetadata,
  convertWakeGaugeConfig,
  executableWakeGaugeParameterUnits,
  invertConstantWakeGaugeTransform,
  transformWakeState,
  validateWakeGaugeConversionRequest,
  type ComplexScale,
  type ConstantComplexWakeGaugeTransform,
  type LegacyWakeGaugeDeclaration,
  type WakeGaugeConversionRequest,
  type WakeGaugeMetadata,
} from "../src/core/wake-gauge";
import { runForward } from "../src/solvers/forward";
import {
  evaluateForward,
  type ForwardDerivative,
  type ForwardState,
} from "../src/solvers/forward/model";

const MODEL_ID = "VP-FWD-P0-SL1-v1";
const OUTPUT_REFERENCE = "P0-local-wet-width-dynamic-pressure-v1";
const NORMALIZATION = "VP-FWD-P0-SL1-production-normalization-v1";

function gauge(
  id: string,
  amplitudeConvention: string,
  phaseReference: string,
): WakeGaugeMetadata {
  return buildLegacyWakeGaugeMetadata({
    id,
    modelId: MODEL_ID,
    sourceReference: `test-declaration:${id}`,
    amplitudeConvention,
    phaseReference,
    timeBasis: { unit: "s", scaleToSeconds: 1 },
    output: {
      kind: "sectional-lift-coefficient",
      unit: "1",
      expression: "finiteSpanCoherence*Re(liftOutput*A)",
      referenceIdentity: OUTPUT_REFERENCE,
      coefficientPaths: {
        real: "rom.liftOutputReal",
        imaginary: "rom.liftOutputImaginary",
      },
    },
    finiteSpanCoherence: {
      kind: "independent-closure",
      representation: "constant-factor",
      closureId: "finite-span-scalar-from-source-package-v1",
      parameterPath: "rom.finiteSpanCoherence",
    },
    parameterUnits: executableWakeGaugeParameterUnits(),
    parameterNormalizationIdentity: NORMALIZATION,
    covarianceIdentity: null,
  });
}

function request(
  source: WakeGaugeMetadata,
  target: WakeGaugeMetadata,
  transform: WakeGaugeConversionRequest["transform"],
): WakeGaugeConversionRequest {
  return {
    schemaVersion: WAKE_GAUGE_CONVERSION_VERSION,
    source,
    target,
    transform,
  };
}

function randomGenerator(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function relativeError(actual: number, expected: number, floor = 1e-14): number {
  return Math.abs(actual - expected) / (floor + Math.max(Math.abs(actual), Math.abs(expected)));
}

function expectEquivalent(actual: number, expected: number, tolerance: number): void {
  expect(Number.isFinite(actual)).toBe(true);
  expect(relativeError(actual, expected)).toBeLessThan(tolerance);
}

function multiply(value: { real: number; imaginary: number }, scale: ComplexScale) {
  return {
    real: scale.real * value.real - scale.imaginary * value.imaginary,
    imaginary: scale.real * value.imaginary + scale.imaginary * value.real,
  };
}

function transformedDerivative(
  derivative: ForwardDerivative,
  scale: ComplexScale,
): ForwardDerivative {
  const wake = multiply({
    real: derivative.wakeReal,
    imaginary: derivative.wakeImaginary,
  }, scale);
  return {
    theta: derivative.theta,
    omega: derivative.omega,
    wakeReal: wake.real,
    wakeImaginary: wake.imaginary,
  };
}

function configureCase(index: number, random: () => number, source: WakeGaugeMetadata) {
  const config = cloneConfig();
  config.fluid.flowSpeed = 0.014 + 0.004 * random();
  config.fluid.flowRampTime = 0;
  config.fluid.flowModulationAmplitude = 0;
  config.rom.cubicSaturation = 0.04 + 0.12 * random();
  config.rom.nonlinearFrequencyShift = -0.06 + 0.12 * random();
  config.rom.couplingThetaReal = -0.2 + 0.4 * random();
  config.rom.couplingThetaImaginary = -0.2 + 0.4 * random();
  config.rom.couplingOmegaReal = -0.2 + 0.4 * random();
  config.rom.couplingOmegaImaginary = -0.2 + 0.4 * random();
  config.rom.couplingAccelerationReal = -0.2 + 0.4 * random();
  config.rom.couplingAccelerationImaginary = -0.2 + 0.4 * random();
  config.rom.liftOutputReal = 0.7 + 0.2 * random();
  config.rom.liftOutputImaginary = 0.05 + 0.15 * random();
  config.rom.finiteSpanCoherence = 0.3 + 0.6 * random();
  config.rom.calibrationMinReynolds = 0;
  config.rom.calibrationMaxReynolds = 1e6;
  config.rom.calibrationMaxAbsAngle = 1;
  config.rom.calibrationMaxVelocityRatio = 1e6;
  config.rom.calibrationMaxNormalizedInflowRate = 1e6;
  config.initial.theta = 0.006 + 0.005 * random();
  config.initial.omega = -0.02 + 0.04 * random();
  config.initial.wakeReal = 0.08 + 0.04 * random();
  config.initial.wakeImaginary = 0.015 + 0.03 * random();
  config.initial.randomSeed = 20260905;
  config.solver.duration = 0.004;
  config.solver.initialStep = 0.001;
  config.solver.maximumStep = 0.001;
  config.solver.outputInterval = 0.002;
  config.solver.relativeTolerance = 1e-10;
  config.solver.absoluteToleranceTheta = 1e-13;
  config.solver.absoluteToleranceOmega = 1e-12;
  config.solver.absoluteToleranceWake = 1e-12;
  config.rom.coefficientSetId = `gauge-seed-20260905-${index}`;
  Object.assign(config.rom, { wakeGauge: source });
  return config;
}

describe("constant complex wake gauge", () => {
  it("keeps 120 seeded production RHS evaluations and short trajectories physically equivalent", async () => {
    const random = randomGenerator(20260905);
    const source = gauge("seed-source-v1", "C_L=Re(L*A_source)", "source synchronized clock");
    const target = gauge("seed-target-v1", "C_L=Re(L'*A_target)", "target constant phase origin");
    const summary = {
      seed: 20260905,
      cases: 120,
      maximumRhsRelativeError: 0,
      maximumInitialStateRelativeError: 0,
      maximumTrajectoryPhysicalRelativeError: 0,
      maximumTrajectoryWakeRelativeError: 0,
      minimumAbsoluteLiftTorque: Number.POSITIVE_INFINITY,
    };

    for (let index = 0; index < 120; index += 1) {
      const magnitude = 0.7 + 0.9 * random();
      const phase = -Math.PI + 2 * Math.PI * random();
      const transform: ConstantComplexWakeGaugeTransform = {
        kind: "constant-complex",
        real: magnitude * Math.cos(phase),
        imaginary: magnitude * Math.sin(phase),
      };
      const original = configureCase(index, random, source);
      const snapshot = structuredClone(original);
      const converted = convertWakeGaugeConfig(original, request(source, target, transform));
      expect(original).toEqual(snapshot);
      expect(converted.config.rom.finiteSpanCoherence).toBe(original.rom.finiteSpanCoherence);
      expect(converted.audit.unchangedClosurePaths).toEqual(["rom.finiteSpanCoherence"]);

      const state: ForwardState = {
        theta: original.initial.theta + 0.002 * (random() - 0.5),
        omega: original.initial.omega + 0.01 * (random() - 0.5),
        wakeReal: original.initial.wakeReal + 0.02 * (random() - 0.5),
        wakeImaginary: original.initial.wakeImaginary + 0.02 * (random() - 0.5),
      };
      const convertedState = transformWakeState(state, transform);
      const before = evaluateForward(original, 0.003, state);
      const after = evaluateForward(converted.config, 0.003, convertedState);
      const expectedDerivative = transformedDerivative(before.derivative, transform);
      summary.maximumRhsRelativeError = Math.max(
        summary.maximumRhsRelativeError,
        relativeError(after.derivative.theta, expectedDerivative.theta),
        relativeError(after.derivative.omega, expectedDerivative.omega),
        relativeError(after.derivative.wakeReal, expectedDerivative.wakeReal),
        relativeError(after.derivative.wakeImaginary, expectedDerivative.wakeImaginary),
        relativeError(after.liftCoefficient, before.liftCoefficient),
        relativeError(after.liftTorque, before.liftTorque),
        relativeError(after.dynamicFluidTorque, before.dynamicFluidTorque),
      );
      summary.minimumAbsoluteLiftTorque = Math.min(
        summary.minimumAbsoluteLiftTorque,
        Math.abs(before.liftTorque),
      );
      expectEquivalent(after.derivative.theta, expectedDerivative.theta, 2e-11);
      expectEquivalent(after.derivative.omega, expectedDerivative.omega, 2e-11);
      expectEquivalent(after.derivative.wakeReal, expectedDerivative.wakeReal, 2e-11);
      expectEquivalent(after.derivative.wakeImaginary, expectedDerivative.wakeImaginary, 2e-11);
      expectEquivalent(after.liftCoefficient, before.liftCoefficient, 2e-11);
      expectEquivalent(after.liftTorque, before.liftTorque, 2e-11);
      expectEquivalent(after.dynamicFluidTorque, before.dynamicFluidTorque, 2e-11);
      expect(Math.abs(before.liftTorque)).toBeGreaterThan(1e-12);

      const expectedInitial = transformWakeState(original.initial, transform);
      summary.maximumInitialStateRelativeError = Math.max(
        summary.maximumInitialStateRelativeError,
        relativeError(converted.config.initial.wakeReal, expectedInitial.wakeReal),
        relativeError(converted.config.initial.wakeImaginary, expectedInitial.wakeImaginary),
      );
      expectEquivalent(converted.config.initial.wakeReal, expectedInitial.wakeReal, 2e-11);
      expectEquivalent(converted.config.initial.wakeImaginary, expectedInitial.wakeImaginary, 2e-11);

      const [beforeRun, afterRun] = await Promise.all([
        runForward(original, undefined, `wake-gauge-before-${index}`),
        runForward(converted.config, undefined, `wake-gauge-after-${index}`),
      ]);
      expect(beforeRun.terminationCode).toBe("COMPLETED");
      expect(afterRun.terminationCode).toBe("COMPLETED");
      expect(afterRun.samples).toHaveLength(beforeRun.samples.length);
      for (let sampleIndex = 0; sampleIndex < beforeRun.samples.length; sampleIndex += 1) {
        const beforeSample = beforeRun.samples[sampleIndex]!;
        const afterSample = afterRun.samples[sampleIndex]!;
        const expectedWake = multiply({
          real: beforeSample.wakeReal,
          imaginary: beforeSample.wakeImaginary,
        }, transform);
        summary.maximumTrajectoryPhysicalRelativeError = Math.max(
          summary.maximumTrajectoryPhysicalRelativeError,
          relativeError(afterSample.theta, beforeSample.theta),
          relativeError(afterSample.omega, beforeSample.omega),
          relativeError(afterSample.liftCoefficient, beforeSample.liftCoefficient),
          relativeError(afterSample.liftTorque, beforeSample.liftTorque),
          relativeError(afterSample.fluidTorque, beforeSample.fluidTorque),
        );
        summary.maximumTrajectoryWakeRelativeError = Math.max(
          summary.maximumTrajectoryWakeRelativeError,
          relativeError(afterSample.wakeReal, expectedWake.real),
          relativeError(afterSample.wakeImaginary, expectedWake.imaginary),
        );
        expect(afterSample.time).toBe(beforeSample.time);
        expectEquivalent(afterSample.theta, beforeSample.theta, 2e-7);
        expectEquivalent(afterSample.omega, beforeSample.omega, 2e-7);
        expectEquivalent(afterSample.wakeReal, expectedWake.real, 2e-7);
        expectEquivalent(afterSample.wakeImaginary, expectedWake.imaginary, 2e-7);
        expectEquivalent(afterSample.liftCoefficient, beforeSample.liftCoefficient, 2e-7);
        expectEquivalent(afterSample.liftTorque, beforeSample.liftTorque, 2e-7);
        expectEquivalent(afterSample.fluidTorque, beforeSample.fluidTorque, 2e-7);
      }
    }
    console.info(`WAKE_GAUGE_120_SUMMARY ${JSON.stringify(summary)}`);
  }, 120_000); // 120 production trajectory pairs; shared CI exceeded 60 s with four workers.

  it("performs the factor-two special case in the declared direction and round-trips it", () => {
    const legacy = gauge("legacy-real-output-v1", "C_L=Re(A_old)", "legacy phase");
    const theoretical = gauge("theory-two-real-output-v1", "C_L=2Re(A_new)", "theory phase");
    const config = cloneConfig();
    Object.assign(config.rom, {
      wakeGauge: legacy,
      cubicSaturation: 0.3,
      nonlinearFrequencyShift: -0.12,
      couplingThetaReal: 0.4,
      couplingThetaImaginary: -0.2,
      couplingOmegaReal: -0.3,
      couplingOmegaImaginary: 0.5,
      couplingAccelerationReal: 0.2,
      couplingAccelerationImaginary: 0.1,
      liftOutputReal: 1,
      liftOutputImaginary: 0,
      finiteSpanCoherence: 0.73,
    });
    Object.assign(config.initial, { wakeReal: 0.6, wakeImaginary: -0.4 });
    const oldToNew: ConstantComplexWakeGaugeTransform = {
      kind: "constant-complex",
      real: 0.5,
      imaginary: 0,
    };
    const forward = convertWakeGaugeConfig(config, request(legacy, theoretical, oldToNew));
    expect(forward.config.initial.wakeReal).toBeCloseTo(0.3, 15);
    expect(forward.config.initial.wakeImaginary).toBeCloseTo(-0.2, 15);
    expect(forward.config.rom.couplingThetaReal).toBeCloseTo(0.2, 15);
    expect(forward.config.rom.cubicSaturation).toBeCloseTo(1.2, 15);
    expect(forward.config.rom.nonlinearFrequencyShift).toBeCloseTo(-0.48, 15);
    expect(forward.config.rom.liftOutputReal).toBeCloseTo(2, 15);
    expect(forward.config.rom.finiteSpanCoherence).toBe(0.73);

    const oldState: ForwardState = {
      theta: config.initial.theta,
      omega: config.initial.omega,
      wakeReal: config.initial.wakeReal,
      wakeImaginary: config.initial.wakeImaginary,
    };
    const newState = transformWakeState(oldState, oldToNew);
    const oldEvaluation = evaluateForward(config, 0, oldState);
    const newEvaluation = evaluateForward(forward.config, 0, newState);
    const expectedDerivative = transformedDerivative(oldEvaluation.derivative, oldToNew);
    expectEquivalent(newEvaluation.derivative.theta, expectedDerivative.theta, 2e-11);
    expectEquivalent(newEvaluation.derivative.omega, expectedDerivative.omega, 2e-11);
    expectEquivalent(newEvaluation.derivative.wakeReal, expectedDerivative.wakeReal, 2e-11);
    expectEquivalent(newEvaluation.derivative.wakeImaginary, expectedDerivative.wakeImaginary, 2e-11);
    expectEquivalent(newEvaluation.liftCoefficient, oldEvaluation.liftCoefficient, 2e-11);
    expectEquivalent(newEvaluation.liftTorque, oldEvaluation.liftTorque, 2e-11);

    const inverse = invertConstantWakeGaugeTransform(oldToNew);
    const restored = convertWakeGaugeConfig(
      forward.config,
      request(theoretical, legacy, inverse),
    ).config;
    const paths = [
      "cubicSaturation",
      "nonlinearFrequencyShift",
      "couplingThetaReal",
      "couplingThetaImaginary",
      "couplingOmegaReal",
      "couplingOmegaImaginary",
      "couplingAccelerationReal",
      "couplingAccelerationImaginary",
      "liftOutputReal",
      "liftOutputImaginary",
      "finiteSpanCoherence",
    ] as const;
    for (const path of paths) expect(restored.rom[path]).toBeCloseTo(config.rom[path], 14);
    expect(restored.initial.wakeReal).toBeCloseTo(config.initial.wakeReal, 14);
    expect(restored.initial.wakeImaginary).toBeCloseTo(config.initial.wakeImaginary, 14);
    expect(restored.solver.absoluteToleranceWake)
      .toBeCloseTo(config.solver.absoluteToleranceWake, 20);
  });
});

describe("wake gauge migration rejects incomplete or non-gauge changes", () => {
  const source = gauge("strict-source-v1", "source amplitude", "source phase");
  const target = gauge("strict-target-v1", "target amplitude", "target phase");
  const constant: ConstantComplexWakeGaugeTransform = {
    kind: "constant-complex",
    real: 0.8,
    imaginary: 0.3,
  };

  it("rejects a time-varying gauge because dot(c)/c is not implemented", () => {
    const validation = validateWakeGaugeConversionRequest(request(source, target, {
      kind: "time-varying-complex",
      description: "independently fitted phase for each condition",
    }));
    expect(validation.pass).toBe(false);
    expect(validation.issues.map((entry) => entry.code)).toContain("TIME-VARYING-WAKE-GAUGE");
    expect(() => convertWakeGaugeConfig(cloneConfig(), request(source, target, {
      kind: "time-varying-complex",
      description: "c(t)",
    }))).toThrow(WakeGaugeConversionError);
  });

  it("rejects missing legacy metadata and lists the absent definitions", () => {
    const incomplete = structuredClone(source) as any;
    delete incomplete.coordinate.phaseReference;
    delete incomplete.output.referenceIdentity;
    delete incomplete.finiteSpanCoherence;
    delete incomplete.parameterNormalizationIdentity;
    const validation = validateWakeGaugeConversionRequest(request(incomplete, target, constant));
    expect(validation.pass).toBe(false);
    const paths = validation.issues.map((entry) => entry.path);
    expect(paths).toContain("source.coordinate.phaseReference");
    expect(paths).toContain("source.output.referenceIdentity");
    expect(paths).toContain("source.finiteSpanCoherence");
    expect(paths).toContain("source.parameterNormalizationIdentity");
  });

  it("rejects conversion when the executable config has no matching source declaration", () => {
    const missing = cloneConfig();
    expect(() => convertWakeGaugeConfig(missing, request(source, target, constant)))
      .toThrowError(expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: "WAKE-GAUGE-METADATA-MISSING",
            path: "input.rom.wakeGauge",
          }),
        ]),
      }));

    const mismatched = cloneConfig();
    Object.assign(mismatched.rom, { wakeGauge: target });
    expect(() => convertWakeGaugeConfig(mismatched, request(source, target, constant)))
      .toThrowError(expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "WAKE-GAUGE-SOURCE-MISMATCH" }),
        ]),
      }));
  });

  it("rejects a zero physical output channel instead of claiming wake recovery", () => {
    const zeroChannel = cloneConfig();
    Object.assign(zeroChannel.rom, {
      wakeGauge: source,
      liftOutputReal: 0,
      liftOutputImaginary: 0,
    });
    expect(() => convertWakeGaugeConfig(zeroChannel, request(source, target, constant)))
      .toThrowError(expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "WAKE-OUTPUT-CHANNEL-ZERO" }),
        ]),
      }));
  });

  it("requires a changed covariance basis identity for a nontrivial gauge", () => {
    const sourceWithCovariance = {
      ...structuredClone(source),
      covarianceIdentity: "joint-basis-source-v1",
    };
    const missingTargetCovariance = {
      ...structuredClone(target),
      covarianceIdentity: null,
    };
    let validation = validateWakeGaugeConversionRequest(request(
      sourceWithCovariance,
      missingTargetCovariance,
      constant,
    ));
    expect(validation.issues.map((entry) => entry.code))
      .toContain("WAKE-COVARIANCE-PRESENCE-CHANGED");

    const unchangedBasis = {
      ...structuredClone(target),
      covarianceIdentity: "joint-basis-source-v1",
    };
    validation = validateWakeGaugeConversionRequest(request(
      sourceWithCovariance,
      unchangedBasis,
      constant,
    ));
    expect(validation.issues.map((entry) => entry.code))
      .toContain("WAKE-COVARIANCE-BASIS-UNCHANGED");

    const changedBasis = {
      ...structuredClone(target),
      covarianceIdentity: "joint-basis-target-v1",
    };
    validation = validateWakeGaugeConversionRequest(request(
      sourceWithCovariance,
      changedBasis,
      constant,
    ));
    expect(validation.pass).toBe(true);
  });

  it("requires the legacy builder caller to declare the original span closure", () => {
    const declaration = {
      id: "unknown-legacy",
      modelId: MODEL_ID,
      sourceReference: "legacy-file.json",
      amplitudeConvention: "unknown",
      phaseReference: "unknown",
      timeBasis: { unit: "s", scaleToSeconds: 1 },
      output: source.output,
      parameterUnits: executableWakeGaugeParameterUnits(),
      parameterNormalizationIdentity: NORMALIZATION,
      covarianceIdentity: null,
    } as unknown as LegacyWakeGaugeDeclaration;
    expect(() => buildLegacyWakeGaugeMetadata(declaration)).toThrowError(
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "SPAN-CLOSURE-MISSING" }),
        ]),
      }),
    );
  });

  it("does not convert a finite-span function into a scalar or change a scalar closure", () => {
    const changed = structuredClone(target) as any;
    changed.finiteSpanCoherence.closureId = "silently-replaced-by-one";
    let validation = validateWakeGaugeConversionRequest(request(source, changed, constant));
    expect(validation.issues.map((entry) => entry.code)).toContain("SPAN-CLOSURE-CHANGED");

    const spatial = structuredClone(target) as any;
    spatial.finiteSpanCoherence = {
      kind: "independent-closure",
      representation: "spatial-function",
      closureId: "chi_L(r)-measured-v1",
      parameterPath: null,
    };
    validation = validateWakeGaugeConversionRequest(request(source, spatial, constant));
    expect(validation.issues.map((entry) => entry.code)).toContain("SPAN-CLOSURE-UNSUPPORTED");
  });

  it("rejects dimensional total-torque output and changed reference geometry", () => {
    const dimensional = structuredClone(source) as any;
    dimensional.output = {
      ...dimensional.output,
      kind: "total-wake-torque",
      unit: "N*m",
      expression: "Re(totalTorqueOutput*A)",
    };
    let validation = validateWakeGaugeConversionRequest(request(dimensional, target, constant));
    expect(validation.issues.map((entry) => entry.code)).toContain("WAKE-OUTPUT-KIND-UNSUPPORTED");

    const changedReference = structuredClone(target) as any;
    changedReference.output.referenceIdentity = "different-wet-width-definition";
    validation = validateWakeGaugeConversionRequest(request(source, changedReference, constant));
    expect(validation.issues.map((entry) => entry.code)).toContain("WAKE-OUTPUT-REFERENCE-CHANGED");
  });

  it("rejects singular and non-finite complex scales", () => {
    for (const scale of [
      { kind: "constant-complex", real: 0, imaginary: 0 },
      { kind: "constant-complex", real: Number.NaN, imaginary: 1 },
      { kind: "constant-complex", real: Number.POSITIVE_INFINITY, imaginary: 0 },
    ]) {
      const validation = validateWakeGaugeConversionRequest(request(
        source,
        target,
        scale as ConstantComplexWakeGaugeTransform,
      ));
      expect(validation.pass).toBe(false);
    }
    expect(() => transformWakeState({ wakeReal: 1, wakeImaginary: 2 }, {
      real: 0,
      imaginary: 0,
    })).toThrow(WakeGaugeConversionError);
  });
});
