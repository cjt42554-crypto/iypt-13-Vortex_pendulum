import {
  APPARATUS_PARAMETERS,
  READY_CLASSIFICATIONS,
  isObject,
  pushIssue,
  validateMeasuredEntry,
  validationResult,
} from "./prediction-shared.mjs";

export function validateApparatusRecord(record, { requireReady = true } = {}) {
  const issues = [];
  if (!isObject(record)) {
    pushIssue(issues, "RECORD-INVALID", "$", "装置记录必须是对象。");
    return validationResult(issues);
  }
  if (record.schemaVersion !== "VP-APPARATUS-CALIBRATED-v1") {
    pushIssue(issues, "SCHEMA-MISMATCH", "schemaVersion", "装置记录 schemaVersion 不匹配。");
  }
  if (requireReady && !READY_CLASSIFICATIONS.has(record.classification)) {
    pushIssue(
      issues,
      "APPARATUS-MEASUREMENTS-PENDING",
      "classification",
      "装置量值尚未完成实测。",
      true,
    );
  }
  for (const name of ["apparatusId", "revision"]) {
    if (requireReady && (typeof record[name] !== "string" || record[name].trim() === "")) {
      pushIssue(issues, "IDENTITY-REQUIRED", name, `需要填写 ${name}。`, true);
    }
  }
  if (!isObject(record.parameters)) {
    pushIssue(issues, "PARAMETERS-INVALID", "parameters", "parameters 必须是对象。");
  } else {
    for (const [path, unit] of Object.entries(APPARATUS_PARAMETERS)) {
      validateMeasuredEntry(
        record.parameters[path],
        unit,
        `parameters.${path}`,
        requireReady,
        issues,
      );
    }
  }
  return validationResult(issues);
}
