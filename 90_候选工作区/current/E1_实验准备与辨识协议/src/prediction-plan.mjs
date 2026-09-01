import {
  BLOCK_ROLES,
  finite,
  isObject,
  pushIssue,
  validationResult,
} from "./prediction-shared.mjs";

function validateChannel(channel, path, requireReady, issues) {
  if (!isObject(channel)) {
    pushIssue(issues, "CHANNEL-MISSING", path, "ç¼ºå°‘æµ‹é‡é€šé“å®šä¹‰ã€‚");
    return;
  }
  if (channel.required !== true && channel.required !== false) {
    pushIssue(issues, "CHANNEL-REQUIRED-FLAG", `${path}.required`, "required å¿…é¡»æ˜¯å¸ƒå°”å€¼ã€‚");
  }
  if (typeof channel.unit !== "string" || channel.unit.trim() === "") {
    pushIssue(issues, "CHANNEL-UNIT", `${path}.unit`, "é€šé“éœ€è¦å•ä½ã€‚");
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
      "å¿…éœ€é€šé“éœ€è¦æ ‡å‡†ä¸ç¡®å®šåº¦ã€‚",
      true,
    );
  }
}

function validateBlock(block, expectedRole, index, requireReady, issues) {
  const path = `${expectedRole}Blocks[${index}]`;
  if (!isObject(block)) {
    pushIssue(issues, "BLOCK-INVALID", path, "å·¥å†µå—å¿…é¡»æ˜¯å¯¹è±¡ã€‚");
    return;
  }
  if (block.role !== expectedRole || !BLOCK_ROLES.has(block.role)) {
    pushIssue(issues, "BLOCK-ROLE", `${path}.role`, `role å¿…é¡»ä¸º ${expectedRole}ã€‚`);
  }
  if (typeof block.conditionBlockId !== "string" || block.conditionBlockId.trim() === "") {
    pushIssue(
      issues,
      "BLOCK-ID",
      `${path}.conditionBlockId`,
      "å·¥å†µå—éœ€è¦å”¯ä¸€ conditionBlockIdã€‚",
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
      pushIssue(issues, "BLOCK-NUMERIC-INPUT", `${path}.${field}`, `${field} éœ€è¦æœ‰æ•ˆæ•°å€¼ã€‚`, true);
    } else if (value !== null && value !== undefined && !valid) {
      pushIssue(issues, "BLOCK-NUMERIC-INVALID", `${path}.${field}`, `${field} æ— æ•ˆã€‚`);
    }
  }
  if (requireReady && !(Number.isInteger(block.replicates) && block.replicates >= 2)) {
    pushIssue(
      issues,
      "BLOCK-REPLICATES",
      `${path}.replicates`,
      "æ¯ä¸ªæ­£å¼å·¥å†µå •è‡³å°‘éœ€è¦ 2 ä¸ªé‡å¤ï¼›å»ºè®® 3 ä¸ªã€‚",
      true,
   );
  }
  if (requireReady && (typeof block.releaseProtocol !== "string" || block.releaseProtocol.trim() === "") {
    pushIssue(issues, "RELEASE-PROTOCOL", `${path}.releaseProtocol`, "éœ€è¦å‡»ç»“é‡‡é›†æ–¹æ–¹ã€‚", true);
  }
}

export function validatePredictionPlan(plan, { requireReady = true } = {}) {
  const issues = [];
  if (!isObject(plan)) {
    pushIssue(issues, "PLAN-INVALID", "$", "é¢„æµ‹è®¡åˆ’å¿…é¡»æ˜¯å¯¹è±¡ã€‚");
    return validationResult(issues);
  }
  if (plan.schemaVersion !== "VP-EXPERIMENT-PREDICTION-PLAN-v1") {
    pushIssue(issues, "SCHEMA-MISMATCH", "schemaVersion", "é¢„æµ‹è®¡åˆ’ schemaVersion ä¸åŒ¹é…ã€‚");
  }
  if (plan.quantitativeBackend !== "forward") {
    pushIssue(issues, "QUANTITATIVE-BACKEND", "quantitativeBackend", "å”¯ä¸€å…è®¸æ­£å¼è£…ç½®å®šé‡åç«¯æ˜¯ forward ROMã€‚");
  }
  if (plan.cfd2dRole !== "qualitative-only") {
    pushIssue(issues, "CFD-ROLE", "cfd2dRole", "äºŒç»´ CFD å·²å†³ç»“ä¸º qualitative-onlyã€‚");
  }
  if (!isObject(plan.holdoutPolicy)
    || plan.holdoutPolicy.freezeBeforeCollection !== true
    || plan.holdoutPolicy.outcomesUnreadDuringFit !== true
    || plan.holdoutPolicy.conditionBlockSplit !== "whole-block") {
    pushIssue(
      issues,
      "HOLDOUT-POLICY",
      "holdoutPolicy",
      "ç•™å‡ºå¿…é¡»æŒ‰å®Œæ•´ condition block å†³ç»“ï¼Œä¸”æ‹ŸåˆæœŸé—´ä¸å¾—è¯»å–ç•™å‡ºç»“æœã€‚",
    );
  }
  if (!isObject(plan.channels)) {
    pushIssue(issues, "CHANNELS-INVALID", "channels", "channels å¿…é¡»æ˜¯å¯¹è±¡ã€‚");
  } else {
    for (const name of ["theta", "flowSpeed", "waterLevel", "temperature", "torque"]) {
      validateChannel(plan.channels[name], `channels.${name}`, requireReady, issues);
    }
    for (const name of ["theta", "flowSpeed", "waterLevel", "temperature"]) {
      if (plan.channels[name]?.required !== true) {
        pushIssue(issues, "REQUIRED-CHANNEL", `channels.${name}.required`, `${name} å¿…é¡»é‡‡é›†ã€‚`);
      }
    }
  }
  for (const role of BLOCK_ROLES) {
    const key = `${role}Blocks`;
    if (!Array.isArray(plan[key])) {
      pushIssue(issues, "BLOCKS-INVALID", key, `${key} å¿…é¡»æ˜¯æ•°ç»„ã€‚`);
      continue;
    }
    for (let index = 0; index < plan[key].length; index += 1) {
      validateBlock(plan[key][index], role, index, requireReady, issues);
    }
  }
  if (requireReady && (plan.calibrationBlocks?.length ?? 0) < 3) {
    pushIssue(issues, "CALIBRATION-BLOCKS-PENDING", "calibrationBlocks", "è‡³å°‘éœ€è¦ 3 ä¸ªå®Œæ•´æ ‡å®šå·¥å†µå—ã€‚", true);
  }
  if (requireReady && (plan.holdoutBlocks?.length ?? 0) < 2) {
    pushIssue(issues, "HOLDOUT-BLOCKS-PENDING", "holdoutBlocks", "è‡³å°‘éœ€è¦ 2 ä¸ªé‡‡å…ˆå†³ç»“ç•™å‡ºå·¥å†µå—ã€‚", true);
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
          `conditionBlockId ${id} åœ¨ ${observed.get(id)} ä¸ ${role} ä¸¬é‡å¤ã€‚à,
        );
      } else {
        observed.set(id, role);
      }
    }
  }
  const acceptance = plan.acceptance;
  if (!isObject(acceptance)) {
    pushIssue(issues, "ACCEPTANCE-INVALID", "acceptance", "ç¼ºå°‘ç•™å‡ºéªŒæ”¶è§„åˆ™ã€‚");
  } else {
    if (acceptance.growthTrend?.signMustMatch !== true
      || acceptance.growthTrend?.confidenceLevel !== 0.95) {
      pushIssue(
        issues,
        "TREND-ACCEPTANCE",
        "acceptance.growthTrend",
        "å¢é•¿/è¡°å‡è¶‹åŠ¿å¿…é¡»ä»¥ 95% ç½®ä¿¡åŒºé›´åˆ¤å®šä¸”ç¬¦å·åŒ¹é…ã€‚",
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
          "åˆé¡¹ç´ ä¸æ˜¯æœ‰æ•ˆéªŒæ”¶é—¨æ …ã€‚",
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
        "ç›¸ä½å’Œå¹³å‡åŠ¯ç‡ç¬¦å·åªèƒ½åœ¨å­˜åœ¨æ ¡å‡†åŠ›ç¹é€šé“æ—¶éºŒæ”¶ã€‚",
      );
    if (plan.channels?.torque?.required !== true
      && (acceptance.phase?.required === true || acceptance.meanPowerSign?.required === true)) {
      pushIssue(issues, "LOAD-CLAIM-WITHOUT-TORQUˆ°€‰…•ÁÑ…¹”ˆ°€‹šÊ‡šr'–*ovç¦k¦Oš^Û’â7–ú_¢¾ï–>[Vg–ë–êSjnã’ö7–J3–æÏ–v–*¿:²›–>ßˆ¤ì(€€€ô(€ô(€¥˜€ …¥Í=‰©•Ğ¡Á±…¸¹µ½‘•±Í…±…Ñ¥½¸¤(€€€ñğÁ±…¸¹µ½‘•±Í…±…Ñ¥½¸¹½¹•5•¡…¹¥ÍµÑQ¥µ”€„ôôÑÉÕ”(€€€ñğÁ±…¸¹µ½‘•±Í…±…Ñ¥½¸¹É•ÅÕ¥É•ÍMåÍÑ•µ…Ñ¥!½±‘½ÕÑI•Í¥‘Õ…°€„ôôÑÉÕ”(€€€ñğÁ±…¸¹µ½‘•±Í…±…Ñ¥½¸¹™‘…¹¹½Ñ…±¥‰É…Ñ•EÕ…¹Ñ¥Ñ…Ñ¥Ù•±ä€„ôôÑÉÕ”¤ì(€€€ÁÕÍ¡%ÍÍÕ” (€€€€€¥ÍÍÕ•Ì°(€€€€€€‰5=0µM1Q%=8ˆ°(€€€€€€‰µ½‘•±Í…±…Ñ¥½¸ˆ°(€€€€€€‹–>«¢÷ÇÎïîšŸVg–ëšº/–Ş»¢›–>G’âš²‡’â’â«šrë–"Ûjš¢‡–z/–6êŸ¾ò3’âPƒ’â7–ú_R£’ös–ºk¦?¢>#–’Ÿ–óˆ°(€€€€¤ì(€ô(€É•ÑÕÉ¸Ù…±¥‘…Ñ¥½¹I•ÍÕ±Ğ¡¥ÍÍÕ•Ì¤ì)ô(