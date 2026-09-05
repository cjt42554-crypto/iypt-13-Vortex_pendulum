import { hashConfig } from "../core/config";
import type { SimulationConfig, SimulationResult } from "../core/types";
import { runForward } from "../solvers/forward";
import { linearPropagate, propagateJointSamples, validateJointUncertaintyModel } from "./uncertainty";

function get(config: SimulationConfig, path: string): number {
  return path.split(".").reduce<any>((value, key) => value?.[key], config) as number;
}
function sampledConfig(config: SimulationConfig, values: readonly number[]): SimulationConfig {
  const copy = structuredClone(config);
  const model = config.rom.jointUncertainty!;
  for (const [i, path] of model.parameterPaths.entries()) {
    const [section, key] = path.split(".");
    (copy as any)[section!][key!] = values[i];
  }
  // The report owns the parent distribution; one realization is deterministic.
  delete copy.rom.jointUncertainty;
  if (copy.rom.wakeGauge) copy.rom.wakeGauge = { ...copy.rom.wakeGauge, covarianceIdentity: null };
  return copy;
}
function isSmooth(result: SimulationResult): boolean {
  return result.complete && result.samples.length > 0
    && result.events.every((event) => event.kind !== "mode" && event.kind !== "wetting")
    && result.samples.every((sample) => sample.frictionMode === "smooth");
}

/** Small formal ensemble: retain every exit/rejection and report its denominator. */
export async function runForwardUncertainty(
  config: SimulationConfig, options: { sampleCount: number; seed: number },
) {
  const model = config.rom.jointUncertainty;
  if (!model) throw new Error("a full joint uncertainty model is required");
  validateJointUncertaintyModel(model, { requireFormalParameterPaths: true });
  if (config.rom.wakeGauge?.covarianceIdentity !== model.basisId) throw new Error("uncertainty/gauge basis mismatch");
  for (const [i, path] of model.parameterPaths.entries()) {
    if (Math.abs(get(config, path) - model.means[i]!) > 1e-12 * Math.max(1, Math.abs(get(config, path)), Math.abs(model.means[i]!))) throw new Error(`uncertainty mean does not match frozen configuration: ${path}`);
  }
  const nominal = await runForward(config);
  let linear: ReturnType<typeof linearPropagate> | null = null;
  let linearReason = "event or nonsmooth branch: use the complete ensemble";
  if (isSmooth(nominal)) {
    const gradient: number[] = [];
    let admissible = true;
    for (const [i, mean] of model.means.entries()) {
      const step = Math.max(1e-8, Math.abs(mean) * 1e-5, Math.sqrt(model.covariance[i]![i]!) * .05);
      const plus = [...model.means], minus = [...model.means];
      plus[i] = mean + step; minus[i] = mean - step;
      try {
        const left = await runForward(sampledConfig(config, minus));
        const right = await runForward(sampledConfig(config, plus));
        if (!isSmooth(left) || !isSmooth(right)) { admissible = false; break; }
        gradient.push((right.samples.at(-1)!.theta - left.samples.at(-1)!.theta) / (2 * step));
      } catch { admissible = false; break; }
    }
    if (admissible) {
      linear = linearPropagate(model, { values: gradient, parameterUnits: model.parameterUnits, outputUnit: "rad" });
      linearReason = "local central-difference propagation of final theta on a smooth, event-free nominal neighborhood";
    }
  }
  const ensemble = await propagateJointSamples(model, {
    ...options,
    evaluate: async (values) => {
      const result = await runForward(sampledConfig(config, values));
      const last = result.samples.at(-1);
      const startsSliding = result.samples[0]?.frictionMode?.startsWith("slip") ?? false;
      const breakaway = result.events.find((event) => event.modeBefore === "stick" && event.modeAfter?.startsWith("slip"));
      const eventOccurred = startsSliding || breakaway !== undefined;
      return {
        classification: `${result.terminationCode}/${last?.frictionMode ?? "no-valid-state"}/${eventOccurred ? "breakaway" : "no-breakaway"}`,
        predictionValid: result.complete, terminated: !result.complete, eventOccurred,
        outputs: {
          ...(last ? { lastValidTheta: last.theta, lastValidTime: last.time } : {}),
          ...(result.complete && last ? { finalTheta: last.theta } : {}),
          ...(eventOccurred ? { breakawayTime: startsSliding ? 0 : breakaway!.time } : {}),
        },
      };
    },
  });
  const validValues = ensemble.records.flatMap((record) => record.predictionValid && record.outputs?.finalTheta !== undefined ? [record.outputs.finalTheta] : []);
  const mean = validValues.length ? validValues.reduce((a, b) => a + b, 0) / validValues.length : null;
  const sampleVariance = mean !== null && validValues.length > 1
    ? validValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (validValues.length - 1) : null;
  // A local Jacobian is not an overall distribution if any realization changes branch or exits.
  if (ensemble.records.some((record) => !record.predictionValid || record.eventOccurred)) {
    linear = null; linearReason = "ensemble includes exits or mode changes; no overall Gaussian prediction is reported";
  }
  return {
    schemaVersion: "VP-FORWARD-UNCERTAINTY-REPORT-v1", configHash: hashConfig(config),
    modelId: nominal.provenance.modelId, wakeGaugeId: config.rom.wakeGauge?.id,
    inputClassification: nominal.provenance.epistemicClassification,
    jointUncertainty: model, nominalTermination: nominal.terminationCode,
    linear, linearReason, ensemble,
    conditionalOnComplete: { count: validValues.length, total: options.sampleCount, meanFinalTheta: mean, sampleVariance },
    claim: model.probabilityBasis === "probability-model"
      ? "propagation of the declared input distribution; not apparatus validation"
      : "correlated scenario envelope; not a confidence interval",
  };
}
