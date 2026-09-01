import {
  ALLOWED_COEFFICIENT_SOURCES,
  FIXED_WAKE_GAUGE,
  PARAMETER_STATUSES,
  READY_CLASSIFICATIONS,
  ROM_PARAMETERS,
  finite,
  isObject,
  pushIssue,
  validateMeasuredEntry,
  validationResult,
} from "./prediction-shared.mjs";

export function validateCoefficientPackage(
  record,
  plan,
  { requireReady = true } = {},
) {
  const issues = [];
  if (!isObject(record)) {
    pushIssue(issues, "COEFFICIENT-PACKAGE-INVALID", "$", "系数包必须是对象。");
    return validationResult(issues);
  }
  if (record.schemaVersion !== "VP-ROM-COEFFICIENT-PACKAGE-v1") {
    pushIssue(issues, "SCHEMA-MISMATCH", "schemaVersion", "系数包 schemaVersion 不匹配。");
  }
  if (requireReady && !READY_CLASSIFICATIONS.has(record.classification)) {
    pushIssue(
      issues,
      "ROM-CALIBRATION-PENDING",
      "classification",
      "ROM 系数包尚未完成标定。",
      true,
    );
  }
  if (record.modelId !== "VP-FWD-P0-SL1-v1") {
    pushIssue(issues, "MODEL-ID", "modelId", "系数包只能绑定 VP-FWD-P0-SL1-v1。");
  }
  if (!ALLOWED_COEFFICIENT_SOURCES.has(record.coefficientSource)) {
    pushIssue(
      issues,
      "COEFFICIENT-SOURCE",
      "coefficientSource",
      "定量系数源只能是 measured 或 prescribed-motion；二维 CFD 不能作定量来源。",
    );
  }
  if (!isObject(record.wakeGauge) || record.wakeGauge.id !== FIXED_WAKE_GAUGE.id) {
    pushIssue(issues, "WAKE-GAUGE", "wakeGauge", "必须使用 unit-real-output-v1 尾流坐标规范。");
  }
  if (!isObject(record.parameters)) {
    pushIssue(issues, "PARAMETERS-INVALID", "parameters", "parameters 必须是对象。");
  } else {
    for (const [path, unit] of Object.entries(ROM_PARAMETERS)) {
      const entry = record.parameters[path];
      validateMeasuredEntry(entry, unit, `parameters.${path}`, requireReady, issues);
      if (isObject(entry)
        && entry.status !== undefined
        && !PARAMETER_STATUSES.has(entry.status)) {
        pushIssue(
          issues,
          "PARAMETER-STATUS",
          `parameters.${path}.status`,
          "status 必须为 measured、fitted、fixed、prior 或 synthetic。",
        );
      }
    }
    for (const [path, expected] of Object.entries(FIXED_WAKE_GAUGE.values)) {
      const entry = record.parameters[path];
      if (isObject(entry) && entry.value !== null && entry.value !== expected) {
        pushIssue(
          issues,
          "WAKE-GAUGE-DRIFT",
          `parameters.${path}.value`,
          `尾流规范要求 ${path}=${expected}。`,
        );
      }
      if (requireReady && isObject(entry) && entry.status !== "fixed") {
        pushIssue(
          issues,
          "WAKE-GAUGE-NOT-FIXED",
          `parameters.${path}.status`,
          `${path} 必须固定而非拟合。`,
        );
      }
    }
  }
  if (record.holdoutReadDuringFit !== false) {
    pushIssue(
      issues,
      "HOLDOUT-LEAKAGE",
      "holdoutReadDuringFit",
      "拟合时必须保持 holdoutReadDuringFit=false。",
    );
  }
  const calibrationIds = plan?.calibrationBlocks?.map(({ conditionBlockId }) =>
    conditionBlockId) ?? [];
  const holdoutIds = plan?.holdoutBlocks?.map(({ conditionBlockId }) =>
    conditionBlockId) ?? [];
  for (const [field, expected] of [
    ["trainingConditionBlocks", calibrationIds],
    ["holdoutConditionBlocks", holdoutIds],
  ]) {
    const actual = record[field];
    if (!Array.isArray(actual)) {
      pushIssue(issues, "BLOCK-BINDING", field, `${field} 必须是数组。`);
    } else if (
      requireReady
      && (actual.length !== expected.length
        || [...actual].sort().join("\n") !== [...expected].sort().join("\n"))
    ) {
      pushIssue(
        issues,
        "BLOCK-BINDING",
        field,
        `${field} 必须与预测计划逐块一致。`,
        true,
      );
    }
  }
  if (!isObject(record.calibrationDomain)) {
    pushIssue(issues, "CALIBRATION-DOMAIN", "calibrationDomain", "缺少标定适用域。");
  } else {
    for (const [name, positive] of [
      ["flowSpeedMps", true],
      ["waterDepthM", true],
      ["reynolds", false],
    ]) {
      const domain = record.calibrationDomain[name];
      if (!isObject(domain)) {
        pushIssue(
          issues,
          "CALIBRATION-DOMAIN",
          `calibrationDomain.${name}`,
          `${name} 需要最小/最大值对象。`,
        );
        continue;
      }
      const waiting = domain.minimum === null || domain.maximum === null;
      const valid = finite(domain.minimum)
        && finite(domain.maximum)
        && domain.maximum > domain.minimum
        && (!positive || domain.minimum >= 0);
      if (requireReady && !valid) {
        pushIssue(
          issues,
          "CALIBRATION-DOMAIN",
          `calibrationDomain.${name}`,
          `${name} 需要有效最小/最大值。`,
          true,
        );
      } else if (!requireReady && !waiting && !valid) {
        pushIssue(
          issues,
          "CALIBRATION-DOMAIN",
          `calibrationDomain.${name}`,
          `${name} 的非空最小/最大值无效。`,
        );
      }
    }
  }
  return validationResult(issues);
}
