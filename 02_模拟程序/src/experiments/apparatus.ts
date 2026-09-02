import {
  APPARATUS_PARAMETERS,
  INPUT_CLASSIFICATIONS,
  isObject,
  pushIssue,
  validateMeasuredEntry,
  validateReadyClassification,
  validateRequiredIdentity,
  validationResult,
} from "./validation";
import type {
  ExperimentValidationIssue,
  ExperimentValidationOptions,
  ExperimentValidationResult,
} from "./types";

export function validateApparatusRecord(
  record: unknown,
  { requireReady = true, allowSynthetic = false }: ExperimentValidationOptions = {},
): ExperimentValidationResult {
  const issues: ExperimentValidationIssue[] = [];
  if (!isObject(record)) {
    pushIssue(issues, "RECORD-INVALID", "$", "装置记录必须是对象。");
    return validationResult(issues);
  }
  if (record.schemaVersion !== "VP-APPARATUS-CALIBRATED-v1") {
    pushIssue(issues, "SCHEMA-MISMATCH", "schemaVersion", "装置记录 schemaVersion 不匹配。");
  }
  validateReadyClassification({
    value: record.classification,
    production: INPUT_CLASSIFICATIONS.productionApparatus,
    waiting: INPUT_CLASSIFICATIONS.waitingApparatus,
    allowSynthetic,
    requireReady,
    label: "装置记录",
    issues,
  });
  for (const [field, label] of ([
    ["apparatusId", "apparatusId"],
    ["revision", "revision"],
  ] as const)) {
    validateRequiredIdentity(record[field], field, label, requireReady, issues);
  }
  if (!isObject(record.parameters)) {
    pushIssue(issues, "PARAMETERS-INVALID", "parameters", "parameters 必须是对象。");
  } else {
    for (const [path, unit] of Object.entries(APPARATUS_PARAMETERS)) {
      const entry = record.parameters[path];
      validateMeasuredEntry(
        entry,
        unit,
        `parameters.${path}`,
        requireReady,
        issues,
      );
      if (requireReady
        && !allowSynthetic
        && isObject(entry)
        && typeof entry.source === "string"
        && /synthetic/iu.test(entry.source)) {
        pushIssue(
          issues,
          "SYNTHETIC-INPUT-IN-PRODUCTION",
          `parameters.${path}.source`,
          "生产配置不得使用 synthetic-only 装置量值。",
        );
      }
    }
  }
  return validationResult(issues);
}
