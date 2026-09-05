import { cloneConfig } from "../../src/core/config";
import type { ForwardModelId } from "../../src/core/types";
import coefficients from "../../experiments/examples/synthetic-alignment/coefficients.json";

/** Broad, explicitly synthetic domain for numerical tests, never calibration. */
export function alignedConfig(modelId: ForwardModelId = "VP-FWD-P0-SL1-v1") {
  const config = cloneConfig();
  const range = (minimum: number, maximum: number) => ({ minimum, maximum });
  Object.assign(config.rom, {
    modelId, inputClassification: "synthetic-only", wetSupportMode: "synthetic-only",
    wetSpanDefinition: "streamwise-projected-area-over-diameter", calibrationMinWetSpan: 0,
    dragWidthDefinition: modelId.includes("DW") ? "relative-flow-normal-wet-width" : "streamwise-wet-width",
    wakeGauge: { ...structuredClone(coefficients.wakeGauge), modelId },
    jointCalibrationSupport: { kind: "covered-cells", evidence: "synthetic numerical test domain",
      cells: [{ flowSpeedMps: range(0, 2), waterDepthM: range(0, 2), pivotHeightM: range(-2, 2),
        reynolds: range(0, 1e8), wetSpanM: range(0, 2), absThetaRad: range(0, 1.5),
        velocityRatio: range(0, 1e8), normalizedInflowRate: range(0, 1e8) }] },
    calibrationMinReynolds: 0, calibrationMaxReynolds: 1e8, calibrationMaxAbsAngle: 1.5,
    calibrationMaxVelocityRatio: 1e8, calibrationMaxNormalizedInflowRate: 1e8,
  });
  config.support.staticFrictionTorque = .002;
  config.support.kineticFrictionTorque = .001;
  config.fluid.flowRampTime = 0;
  config.solver.duration = .4;
  config.solver.maximumStep = .02;
  config.solver.outputInterval = .01;
  config.solver.relativeTolerance = 1e-9;
  config.solver.absoluteToleranceTheta = 1e-12;
  config.solver.absoluteToleranceOmega = 1e-12;
  config.solver.absoluteToleranceWake = 1e-12;
  config.solver.eventTimeTolerance = 1e-10;
  return config;
}
