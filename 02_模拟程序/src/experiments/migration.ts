import { convertWakeGaugeConfig, validateWakeGaugeMetadata, type WakeGaugeConfigLike,
  type WakeGaugeConversionRequest } from "../core/wake-gauge";
import { isObject } from "./validation";
import type { JsonRecord } from "./types";

/** Explicit v1 migration. No geometry, phase, covariance or wet coverage is inferred. */
export function migrateLegacyCoefficientPackage(
  legacy: JsonRecord, legacyPlan: JsonRecord, declaration: JsonRecord,
  request: WakeGaugeConversionRequest, identities: { packageId: string; planId: string },
) {
  if (legacy.schemaVersion !== "VP-ROM-COEFFICIENT-PACKAGE-v1"
    || declaration?.schemaVersion !== "VP-LEGACY-ALIGNMENT-DECLARATION-v1"
    || !validateWakeGaugeMetadata(declaration.wakeGauge).pass
    || !isObject(declaration.minimumWetSpan) || !isObject(declaration.calibrationDomain)
    || declaration.wetSpanDefinition !== "streamwise-projected-area-over-diameter"
    || declaration.dragWidthDefinition !== "streamwise-wet-width") {
    throw new Error("migration requires complete declared source gauge, minimum wet span and joint coverage");
  }
  if (legacy.modelId !== declaration.wakeGauge.modelId || legacy.wakeGauge?.id !== declaration.wakeGauge.id) {
    throw new Error("legacy model/gauge identity does not match the explicit declaration");
  }
  // The historical scalar uncertainty fields do not determine their mutual
  // correlation. Only a real scaling can transform those marginals alone.
  if (legacy.covariance != null || legacy.jointUncertainty != null
    || request.transform.kind !== "constant-complex" || request.transform.imaginary !== 0) {
    throw new Error("legacy scalar-uncertainty migration supports a constant real gauge only; complex covariance conversion uses the joint-config API");
  }
  if (!identities.packageId || !identities.planId || identities.packageId === legacy.packageId || identities.planId === legacyPlan.planId) {
    throw new Error("migration requires new explicit package and plan identities");
  }
  const coefficients = structuredClone(legacy), plan = structuredClone(legacyPlan);
  const rom = Object.fromEntries(Object.entries(legacy.parameters).map(([path, entry]) => [path.slice(4), (entry as JsonRecord).value]));
  rom.wakeGauge = declaration.wakeGauge;
  let audit;
  for (const group of ["pilotBlocks", "calibrationBlocks", "holdoutBlocks"]) {
    for (const block of plan[group]) {
      const input = { rom, initial: { wakeReal: block.initialWakeReal, wakeImaginary: block.initialWakeImaginary } } as unknown as WakeGaugeConfigLike;
      const converted = convertWakeGaugeConfig(input, request);
      audit = converted.audit;
      block.initialWakeReal = converted.config.initial.wakeReal;
      block.initialWakeImaginary = converted.config.initial.wakeImaginary;
      block.wakeGaugeId = request.target.id;
      for (const path of converted.audit.changedPaths.filter((path) => path.startsWith("rom."))) {
        const key = path.slice(4);
        const entry = coefficients.parameters[path];
        if (!entry) continue;
        entry.value = (converted.config.rom as unknown as JsonRecord)[key];
        const factor = path.includes("cubicSaturation") || path.includes("nonlinearFrequencyShift")
          ? 1 / request.transform.real ** 2
          : path.includes("liftOutput") ? 1 / Math.abs(request.transform.real) : Math.abs(request.transform.real);
        entry.standardUncertainty = legacy.parameters[path].standardUncertainty * factor;
      }
    }
  }
  Object.assign(coefficients, {
    schemaVersion: "VP-ROM-COEFFICIENT-PACKAGE-v2", packageId: identities.packageId,
    predictionPlanId: identities.planId, wakeGauge: request.target,
    wetSpanDefinition: declaration.wetSpanDefinition, dragWidthDefinition: declaration.dragWidthDefinition,
    calibrationDomain: declaration.calibrationDomain, jointUncertainty: null, identifiability: null,
  });
  coefficients.parameters["rom.calibrationMinWetSpan"] = declaration.minimumWetSpan;
  plan.planId = identities.planId;
  return { coefficients, plan, audit };
}
