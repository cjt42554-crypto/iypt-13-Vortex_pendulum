import {
  BLOCK_ROLES,
  finite,
  isObject,
  pushIssue,
  validationResult,
} from "./prediction-shared.mjs";

function validateChannel(channel, path, requireReady, issues) {
  if (!isObject(channel)) {
    pushIssue(issues, "CHANNEL-MISSING", path, "缺少测量通道定义。");
    return;
  }
  if (channel.required !== true && channel.required !== false) {
    pushIssue(issues, "CHANNEL-REQUIRED-FLAG", `${path}.required`, "required 必须是布尔值。");
  }
  if (typeof channel.unit !== "string" || channel.unit.trim() === "") {
    pushIssue(issues, "CHANNEL-UNIT", `${path}.unit`, "通道需要单位。");
  }
  if (
    requireReady
    && channel.required === true
    && !(finite(channel.standardUncertainty) && channel.standardUncertainty >= 0)
  ) {
    pushIssue(
      issues,
      "CHANNEL-UNCERTAINTY-PENDING",
      `${path}.standardUncertainty`,
      "必需通道需要标准不确定度。",
      true,
    );
  }
}

function validateBlock(block, expectedRole, index, requireReady, issues) {
  const path = `${expectedRole}Blocks[${index}]`;
  if (!isObject(block)) {
    pushIssue(issues, "BLOCK-INVALID", path, "工况块必须是对象。");
    return;
  }
  if (block.role !== expectedRole || !BLOCK_ROLES.has(block.role)) {
    pushIssue(issues, "BLOCK-ROLE", `${path}.role`, `role 必须为 ${expectedRole}。`);
  }
  if (typeof block.conditionBlockId !== "string" || block.conditionBlockId.trim() === "") {
    pushIssue(
      issues,
      "BLOCK-ID",
      `${path}.conditionBlockId`,
      "工况块需要唯一 conditionBlockId。",
      requireReady,
    );
  }
  const numericFields = [
    ["flowSpeedMps", 0, false],
    ["waterDepthM", 0, true],
    ["initialThetaRad", null, false],
    ["initialOmegaRadPerS", null, false],
    ["initialWakeReal", null, false],
    ["initialWakeImaginary", null, false],
    ["flowRampTimeS", 0, false],
    ["durationS", 0, true],
  ];
  for (const [field, lower, strict] of numericFields) {
    const value = block[field];
    const valid = finite(value)
      && (lower === null || (strict ? value > lower : value >= lower));
    if (requireReady && !valid) {
      pushIssue(issues, "BLOCK-NUMERIC-INPUT", `${path}.${field}`, `${field} 需要有效数值。`, true);
    } else if (value !== null && value !== undefined && !valid) {
      pushIssue(issues, "BLOCK-NUMERIC-INVALID", `${path}.${field}`, `${field} 无效。`);
    }
  }
  if (requireReady && !(Number.isInteger(block.replicates) && block.replicates >= 2)) {
    pushIssue(
      issues,
      "BLOCK-REPLICATES",
      `${path}.replicates`,
      "每个正式工况块至少需要 2 个重复；建议 3 个。",
      true,
    );
  }
  if (requireReady && (typeof block.releaseProtocol !== "string" || block.releaseProtocol.trim() === "")) {
    pushIssue(issues, "RELEASE-PROTOCOL", `${path}.releaseProtocol`, "需要冻结释放方式。", true);
  }
}

export function validatePredictionPlan(plan, { requireReady = true } = {}) {
  const issues = [];
  if (!isObject(plan)) {
    pushIssue(issues, "PLAN-INVALID", "$", "预测计划必须是对象。");
    return validationResult(issues);
  }
  if (plan.schemaVersion !== "VP-EXPERIMENT-PREDICTION-PLAN-v1") {
    pushIssue(issues, "SCHEMA-MISMATCH", "schemaVersion", "预测计划 schemaVersion 不匹配。");
  }
  if (plan.quantitativeBackend !== "forward") {
    pushIssue(issues, "QUANTITATIVE-BACKEND", "quantitativeBackend", "唯一允许的装置定量后端是 forward ROM。");
  }
  if (plan.cfd2dRole !== "qualitative-only") {
    pushIssue(issues, "CFD-ROLE", "cfd2dRole", "二维 CFD 已冻结为 qualitative-only。");
  }
  if (!isObject(plan.holdoutPolicy)
    || plan.holdoutPolicy.freezeBeforeCollection !== true
    || plan.holdoutPolicy.outcomesUnreadDuringFit !== true
    || plan.holdoutPolicy.conditionBlockSplit !== "whole-block") {
    pushIssue(
      issues,
      "HOLDOUT-POLICY",
      "holdoutPolicy",
      "留出必须按完整 condition block 冻结，且拟合期间不得读取留出结果。",
    );
  }
  if (!isObject(plan.channels)) {
    pushIssue(issues, "CHANNELS-INVALID", "channels", "channels 必须是对象。");
  } else {
    for (const name of ["theta", "flowSpeed", "waterLevel", "temperature", "torque"]) {
      validateChannel(plan.channels[name], `channels.${name}`, requireReady, issues);
    }
    for (const name of ["theta", "flowSpeed", "waterLevel", "temperature"]) {
      if (plan.channels[name]?.required !== true) {
        pushIssue(issues, "REQUIRED-CHANNEL", `channels.${name}.required`, `${name} 必须采集。`);
      }
    }
  }
  for (const role of BLOCK_ROLES) {
    const key = `${role}Blocks`;
    if (!Array.isArray(plan[key])) {
      pushIssue(issues, "BLOCKS-INVALID", key, `${key} 必须是数组。`);
      continue;
    }
    for (let index = 0; index < plan[key].length; index += 1) {
      validateBlock(plan[key][index], role, index, requireReady, issues);
    }
  }
  if (requireReady && (plan.calibrationBlocks?.length ?? 0) < 3) {
    pushIssue(issues, "CALIBRATION-BLOCKS-PENDING", "calibrationBlocks", "至少需要 3 个完整标定工况块。", true);
  }
  if (requireReady && (plan.holdoutBlocks?.length ?? 0) < 2) {
    pushIssue(issues, "HOLDOUT-BLOCKS-PENDING", "holdoutBlocks", "至少需要 2 个预冻结留出工况块。", true);
  }
  const observed = new Map();
  for (const role of BLOCK_ROLES) {
    for (const block of plan[`${role}Blocks`] ?? []) {
      const id = block?.conditionBlockId;
      if (typeof id !== "string" || id === "") continue;
      if (observed.has(id)) {
        pushIssue(
          issues,
          "CONDITION-BLOCK-OVERLAP",
          `${role}Blocks`,
          `conditionBlockId ${id} 在 ${observed.get(id)} 与 ${role} 中重复。`,
        );
      } else {
        observed.set(id, role);
      }
    }
  }
  const acceptance = plan.acceptance;
  if (!isObject(acceptance)) {
    pushIssue(issues, "ACCEPTANCE-INVALID", "acceptance", "缺少留出验收规则。");
  } else {
    if (acceptance.growthTrend?.signMustMatch !== true
      || acceptance.growthTrend?.confidenceLevel !== 0.95) {
      pushIssue(
        issues,
        "TREND-ACCEPTANCE",
        "acceptance.growthTrend",
        "增长/衰减趋势必须以 95% 置信区间判定且符号匹配。",
      );
    }
    for (const name of [
      "dominantFrequency",
      "amplitude",
      "onsetSpeed",
      "establishmentTime",
    ]) {
      const entry = acceptance[name];
      if (!isObject(entry)
        || !(finite(entry.relativeErrorMaximum) && entry.relativeErrorMaximum > 0)
        || !(finite(entry.uncertaintyMultiplier) && entry.uncertaintyMultiplier >= 1)) {
        pushIssue(
          issues,
          "ACCEPTANCE-THRESHOLD",
          `acceptance.${name}`,
          `${name} 需要正的误差上限和不确定度倍数。`,
          requireReady,
        );
      }
    }
    if (acceptance.phase?.enabledOnlyWithTorqueChannel !== true
      || acceptance.meanPowerSign?.enabledOnlyWithTorqueChannel !== true) {
      pushIssue(
        issues,
        "LOAD-CLAIM-GUARD",
        "acceptance",
        "相位和平均功率符号只能在存在校准力矩通道时验收。",
      );
    }
    if (plan.channels?.torque?.required !== true
      && (acceptance.phase?.required === true || acceptance.meanPowerSign?.required === true)) {
      pushIssue(
        issues,
        "LOAD-CLAIM-WITHOUT-TORQUE",
        "acceptance",
        "没有力矩通道时不得要求或声称相位/平均功率符号。",
      );
    }
  }
  if (!isObject(plan.modelEscalation)
    || plan.modelEscalation.oneMechanismAtATime !== true
    || plan.modelEscalation.requiresSystematicHoldoutResidual !== true
    || plan.modelEscalation.cfdCannotCalibrateQuantitatively !== true) {
    pushIssue(
      issues,
      "MODEL-ESCALATION",
      "modelEscalation",
      "只能由系统性留出残差触发一次一个机制的模型升级，且 CFD 不得作定量标定真值。",
    );
  }
  return validationResult(issues);
}
