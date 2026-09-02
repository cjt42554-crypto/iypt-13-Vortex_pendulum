import {
  ALLOWED_COEFFICIENT_SOURCES,
  FIXED_WAKE_GAUGE,
  INPUT_CLASSIFICATIONS,
  PARAMETER_STATUSES,
  ROM_PARAMETERS,
  finite,
  isObject,
  nonEmptyText,
  pushIssue,
  validateMeasuredEntry,
  validateReadyClassification,
  validateRequiredIdentity,
  validationResult,
} from "./prediction-shared.mjs";

const DOMAIN_FIELDS = Object.freeze([
  ["flowSpeedMps", true],
  ["waterDepthM", true],
  ["pivotHeightM", false],
  ["reynolds", true],
]);

function valueOf(record, path) {
  return record?.parameters?.[path]?.value;
}

function conditionValues(apparatus, block) {
  const radius = apparatus?.parameters?.["geometry.radius"]?.value;
  const viscosity = apparatus?.parameters?.["fluid.kinematicViscosity"]?.value;
  return Object.freeze({
    flowSpeedMps: block?.flowSpeedMps,
    waterDepthM: block?.waterDepthM,
    pivotHeightM: block?.pivotHeightM,
    reynolds: finite(radius) && radius > 0 && finite(viscosity) && viscosity > 0
      && finite(block?.flowSpeedMps)
      ? 2 * radius * block.flowSpeedMps / viscosity
      : null,
  });
}

function rangeContains(domain, value) {
  if (!isObject(domain) || !finite(domain.minimum) || !finite(domain.maximum) || !finite(value)) {
    return false;
  }
  const tolerance = 1e-12 * Math.max(1, Math.abs(domain.minimum), Math.abs(domain.maximum));
  return value >= domain.minimum - tolerance && value <= domain.maximum + tolerance;
}

export function validateConditionAgainstCalibrationDomain(
  record,
  apparatus,
  block,
  { path = "conditionBlock" } = {},
) {
  const issues = [];
  const values = conditionValues(apparatus, block);
  for (const [name] of DOMAIN_FIELDS) {
    const domain = record?.calibrationDomain?.[name];
    const value = values[name];
    if (!rangeContains(domain, value)) {
      pushIssue(
        issues,
        "CONDITION-OUTSIDE-CALIBRATION-DOMAIN",
        `${path}.${name}`,
        `${name}=${value} 位于 ROM 系数包标定域之外。`,
      );
    }
  }
  const minReynolds = valueOf(record, "rom.calibrationMinReynolds");
  const maxReynolds = valueOf(record, "rom.calibrationMaxReynolds");
  if (finite(values.reynolds)
    && finite(minReynolds)
    && finite(maxReynolds)
    && (values.reynolds < minReynolds || values.reynolds > maxReynolds)) {
    pushIssue(
      issues,
      "CONDITION-OUTSIDE-ROM-REYNOLDS-DOMAIN",
      `${path}.reynolds`,
      `Re=${values.reynolds} 位于正式 ROM 的 Reynolds 标定域之外。`,
    );
  }
  const maxAngle = valueOf(record, "rom.calibrationMaxAbsAngle");
  if (finite(block?.initialThetaRad)
    && finite(maxAngle)
    && Math.abs(block.initialThetaRad) > maxAngle) {
    pushIssue(
      issues,
      "CONDITION-OUTSIDE-ROM-ANGLE-DOMAIN",
      `${path}.initialThetaRad`,
      "初始摆角位于正式 ROM 的角度标定域之外。",
    );
  }
  const bottomDistance = apparatus?.parameters?.["geometry.bottomDistance"]?.value;
  const velocityFloor = valueOf(record, "rom.calibrationVelocityFloor");
  const maxVelocityRatio = valueOf(record, "rom.calibrationMaxVelocityRatio");
  if (finite(bottomDistance)
    && finite(block?.initialOmegaRadPerS)
    && finite(block?.flowSpeedMps)
    && finite(velocityFloor)
    && velocityFloor > 0
    && finite(maxVelocityRatio)) {
    const velocityRatio = bottomDistance * Math.abs(block.initialOmegaRadPerS)
      / Math.max(block.flowSpeedMps, velocityFloor);
    if (velocityRatio > maxVelocityRatio) {
      pushIssue(
        issues,
        "CONDITION-OUTSIDE-ROM-VELOCITY-RATIO-DOMAIN",
        `${path}.initialOmegaRadPerS`,
        "初始体动速度比位于正式 ROM 标定域之外。",
      );
    }
  }
  return validationResult(issues);
}

function validateBinding(record, field, expected, requireReady, issues) {
  const actual = record[field];
  validateRequiredIdentity(actual, field, field, requireReady, issues);
  if (nonEmptyText(actual) && nonEmptyText(expected) && actual !== expected) {
    pushIssue(
      issues,
      "ARTIFACT-BINDING-MISMATCH",
      field,
      `${field}=${actual} 与绑定对象 ${expected} 不一致。`,
    );
  }
}

export function validateCoefficientPackage(
  record,
  plan,
  apparatus,
  { requireReady = true, allowSynthetic = false } = {},
) {
  const issues = [];
  if (!isObject(record)) {
    pushIssue(issues, "COEFFICIENT-PACKAGE-INVALID", "$", "系数包必须是对象。");
    return validationResult(issues);
  }
  if (record.schemaVersion !== "VP-ROM-COEFFICIENT-PACKAGE-v1") {
    pushIssue(issues, "SCHEMA-MISMATCH", "schemaVersion", "系数包 schemaVersion 不匹配。");
  }
  validateReadyClassification({
    value: record.classification,
    production: INPUT_CLASSIFICATIONS.productionCoefficients,
    waiting: INPUT_CLASSIFICATIONS.waitingCoefficients,
    allowSynthetic,
    requireReady,
    label: "ROM 系数包",
    issues,
  });
  validateRequiredIdentity(record.packageId, "packageId", "packageId", requireReady, issues);
  validateBinding(record, "apparatusId", plan?.apparatusId ?? apparatus?.apparatusId, requireReady, issues);
  validateBinding(
    record,
    "apparatusRevision",
    plan?.apparatusRevision ?? apparatus?.revision,
    requireReady,
    issues,
  );
  validateBinding(record, "predictionPlanId", plan?.planId, requireReady, issues);
  if (nonEmptyText(plan?.apparatusId)
    && nonEmptyText(apparatus?.apparatusId)
    && plan.apparatusId !== apparatus.apparatusId) {
    pushIssue(
      issues,
      "PLAN-APPARATUS-BINDING-MISMATCH",
      "apparatusId",
      "预测计划与装置记录绑定到不同 apparatusId。",
    );
  }
  if (nonEmptyText(plan?.apparatusRevision)
    && nonEmptyText(apparatus?.revision)
    && plan.apparatusRevision !== apparatus.revision) {
    pushIssue(
      issues,
      "PLAN-APPARATUS-BINDING-MISMATCH",
      "apparatusRevision",
      "预测计划与装置记录绑定到不同 revision。",
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
      if (requireReady
        && !allowSynthetic
        && isObject(entry)
        && (entry.status === "synthetic"
          || (typeof entry.source === "string" && /synthetic/iu.test(entry.source)))) {
        pushIssue(
          issues,
          "SYNTHETIC-INPUT-IN-PRODUCTION",
          `parameters.${path}`,
          "生产配置不得使用 synthetic-only ROM 参数。",
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
    for (const [name, nonnegative] of DOMAIN_FIELDS) {
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
        && domain.maximum >= domain.minimum
        && (!nonnegative || domain.minimum >= 0);
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
  if (requireReady && Array.isArray(plan?.calibrationBlocks)) {
    for (let index = 0; index < plan.calibrationBlocks.length; index += 1) {
      const validation = validateConditionAgainstCalibrationDomain(
        record,
        apparatus,
        plan.calibrationBlocks[index],
        { path: `calibrationBlocks[${index}]` },
      );
      issues.push(...validation.issues);
    }
  }
  return validationResult(issues);
}
