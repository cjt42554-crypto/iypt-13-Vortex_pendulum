import { readFile } from "node:fs/promises";
import type {
  ExperimentValidationIssue,
  ExperimentValidationOptions,
  ExperimentValidationResult,
  JsonRecord,
} from "./types";

export type {
  ExperimentValidationIssue,
  ExperimentValidationOptions,
  ExperimentValidationResult,
  JsonRecord,
} from "./types";

export const APPARATUS_PARAMETERS = Object.freeze({
  "geometry.radius": "m",
  "geometry.topDistance": "m",
  "geometry.bottomDistance": "m",
  "geometry.pivotHeight": "m",
  "geometry.channelWidth": "m",
  "geometry.waterDepth": "m",
  "geometry.observationDistance": "m",
  "geometry.maximumAngle": "rad",
  "body.movingMass": "kg",
  "body.centerOfMassDistance": "m",
  "body.dryMomentOfInertia": "kg*m^2",
  "fluid.density": "kg/m^3",
  "fluid.kinematicViscosity": "m^2/s",
  "fluid.surfaceTension": "N/m",
  "fluid.gravity": "m/s^2",
  "support.referenceAngle": "rad",
  "support.linearStiffness": "N*m/rad",
  "support.cubicStiffness": "N*m/rad^3",
  "support.viscousDamping": "N*m*s/rad",
  "support.coulombFriction": "N*m",
  "support.frictionSmoothingSpeed": "rad/s",
});

export const ROM_PARAMETERS = Object.freeze({
  "rom.addedMassCoefficient": "1",
  "rom.sectionalDragCoefficient": "1",
  "rom.strouhalNumber": "1",
  "rom.referenceHopfReynolds": "1",
  "rom.hopfGrowthSlope": "1",
  "rom.cubicSaturation": "1",
  "rom.nonlinearFrequencyShift": "1",
  "rom.zeroFlowWakeDecayTime": "s",
  "rom.wakeActivationSpeed": "m/s",
  "rom.calibrationVelocityFloor": "m/s",
  "rom.couplingThetaReal": "1",
  "rom.couplingThetaImaginary": "1",
  "rom.couplingOmegaReal": "1",
  "rom.couplingOmegaImaginary": "1",
  "rom.couplingAccelerationReal": "1",
  "rom.couplingAccelerationImaginary": "1",
  "rom.liftOutputReal": "1",
  "rom.liftOutputImaginary": "1",
  "rom.finiteSpanCoherence": "1",
  "rom.calibrationMinReynolds": "1",
  "rom.calibrationMaxReynolds": "1",
  "rom.calibrationMaxAbsAngle": "rad",
  "rom.calibrationMaxVelocityRatio": "1",
  "rom.calibrationMaxNormalizedInflowRate": "1",
});

export const FIXED_WAKE_GAUGE = Object.freeze({
  id: "unit-real-output-v1",
  values: Object.freeze({
    "rom.liftOutputReal": 1,
    "rom.liftOutputImaginary": 0,
    "rom.finiteSpanCoherence": 1,
  }),
});

export const INPUT_CLASSIFICATIONS = Object.freeze({
  productionPlan: "experiment-frozen",
  productionApparatus: "apparatus-calibrated",
  productionCoefficients: "rom-calibrated",
  synthetic: "synthetic-only",
  waitingPlan: "waiting-for-definition",
  waitingApparatus: "waiting-for-measurement",
  waitingCoefficients: "waiting-for-calibration",
});

export const ALLOWED_COEFFICIENT_SOURCES = new Set([
  "measured",
  "prescribed-motion",
]);
export const PARAMETER_STATUSES = new Set([
  "measured",
  "fitted",
  "fixed",
  "prior",
  "synthetic",
]);
export const BLOCK_ROLES = new Set(["pilot", "calibration", "holdout"]);

const SAFE_CONDITION_BLOCK_ID = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,94}[A-Za-z0-9_-])?$/u;

export function isObject(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function nonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export function validTimestamp(value: unknown): value is string {
  return nonEmptyText(value) && Number.isFinite(Date.parse(value));
}

export function safeConditionBlockId(value: unknown): value is string {
  return typeof value === "string" && SAFE_CONDITION_BLOCK_ID.test(value);
}

export function pushIssue(
  issues: ExperimentValidationIssue[],
  code: string,
  path: string,
  message: string,
  dependency = false,
): void {
  issues.push(Object.freeze({ code, path, message, dependency }));
}

export function validateReadyClassification({
  value,
  production,
  waiting,
  allowSynthetic,
  requireReady,
  path = "classification",
  label,
  issues,
}: Required<ExperimentValidationOptions> & {
  value: unknown;
  production: string;
  waiting: string;
  path?: string;
  label: string;
  issues: ExperimentValidationIssue[];
}): void {
  const accepted = value === production
    || (allowSynthetic && value === INPUT_CLASSIFICATIONS.synthetic);
  if (requireReady) {
    if (!accepted) {
      pushIssue(
        issues,
        "CLASSIFICATION-NOT-READY",
        path,
        `${label} classification 必须为 ${production}${allowSynthetic ? " 或 synthetic-only" : ""}。`,
        value === waiting || value === null || value === undefined || value === "",
      );
    }
    return;
  }
  if (typeof value !== "string"
    || ![production, waiting, INPUT_CLASSIFICATIONS.synthetic].includes(value)) {
    pushIssue(issues, "CLASSIFICATION-INVALID", path, `${label} classification 无效。`);
  }
}

export function validateRequiredIdentity(
  value: unknown,
  path: string,
  label: string,
  requireReady: boolean,
  issues: ExperimentValidationIssue[],
): void {
  if (nonEmptyText(value)) return;
  if (requireReady) {
    pushIssue(issues, "IDENTITY-REQUIRED", path, `需要填写 ${label}。`, true);
  } else if (value !== "" && value !== null && value !== undefined) {
    pushIssue(issues, "IDENTITY-INVALID", path, `${label} 必须是非空字符串。`);
  }
}

export function validateMeasuredEntry(
  entry: unknown,
  expectedUnit: string,
  path: string,
  readyRequired: boolean,
  issues: ExperimentValidationIssue[],
): void {
  if (!isObject(entry)) {
    pushIssue(issues, "MISSING-ENTRY", path, "缺少量值记录。", true);
    return;
  }
  if (entry.unit !== expectedUnit) {
    pushIssue(issues, "UNIT-MISMATCH", `${path}.unit`, `单位必须为 ${expectedUnit}。`);
  }
  if (readyRequired && !finite(entry.value)) {
    pushIssue(issues, "VALUE-REQUIRED", `${path}.value`, "需要有限实测或拟合值。", true);
  } else if (entry.value !== null && entry.value !== undefined && !finite(entry.value)) {
    pushIssue(issues, "VALUE-NONFINITE", `${path}.value`, "值必须为有限数或 null。");
  }
  const uncertaintyValid = finite(entry.standardUncertainty)
    && entry.standardUncertainty >= 0;
  if (readyRequired && !uncertaintyValid) {
    pushIssue(
      issues,
      "UNCERTAINTY-REQUIRED",
      `${path}.standardUncertainty`,
      "需要非负标准不确定度。",
      true,
    );
  } else if (
    entry.standardUncertainty !== null
    && entry.standardUncertainty !== undefined
    && !uncertaintyValid
  ) {
    pushIssue(
      issues,
      "UNCERTAINTY-INVALID",
      `${path}.standardUncertainty`,
      "标准不确定度必须为非负有限数或 null。",
    );
  }
  if (readyRequired && !nonEmptyText(entry.method)) {
    pushIssue(issues, "METHOD-REQUIRED", `${path}.method`, "需要记录测量或拟合方法。", true);
  }
  if (readyRequired && !nonEmptyText(entry.source)) {
    pushIssue(issues, "SOURCE-REQUIRED", `${path}.source`, "需要记录来源。", true);
  }
}

export function validationResult(
  issues: ExperimentValidationIssue[],
): ExperimentValidationResult {
  const structuralIssues = issues.filter((issue) => !issue.dependency);
  const dependencies = issues.filter((issue) => issue.dependency);
  return Object.freeze({
    pass: issues.length === 0,
    structurallyValid: structuralIssues.length === 0,
    issues: Object.freeze(issues),
    structuralIssues: Object.freeze(structuralIssues),
    dependencies: Object.freeze(dependencies),
  });
}

export async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}
