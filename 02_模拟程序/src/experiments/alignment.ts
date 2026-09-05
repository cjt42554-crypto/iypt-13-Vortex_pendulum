import { FORWARD_MODEL_IDS } from "../core/forward-contract";
import { validateWakeGaugeMetadata } from "../core/wake-gauge";
import {
  ROM_PARAMETERS, finite, isObject, pushIssue, validateMeasuredEntry,
} from "./validation";
import type { ExperimentValidationIssue, JsonRecord } from "./types";

export const ALIGNED_COEFFICIENT_SCHEMA = "VP-ROM-COEFFICIENT-PACKAGE-v2";
export const SS_APPARATUS_PARAMETERS = Object.freeze({
  "support.staticFrictionTorque": "N*m", "support.kineticFrictionTorque": "N*m",
});
export function isAlignedPackage(record: JsonRecord): boolean {
  return record.schemaVersion === ALIGNED_COEFFICIENT_SCHEMA;
}
export function coefficientParameterUnits(record: JsonRecord): Readonly<Record<string, string>> {
  return isAlignedPackage(record)
    ? { ...ROM_PARAMETERS, "rom.calibrationMinWetSpan": "m" } : ROM_PARAMETERS;
}
export function packageHasStickSlip(record: JsonRecord): boolean {
  return record.modelId === "VP-FWD-P0-SL1-SS-v1" || record.modelId === "VP-FWD-P0-SL1-SS-DW-v1";
}

/** Identity validation is independent of whether calibration values are ready. */
export function validateAlignmentMetadata(
  record: JsonRecord, apparatus: JsonRecord, requireReady: boolean, allowSynthetic: boolean,
): ExperimentValidationIssue[] {
  const issues: ExperimentValidationIssue[] = [];
  if (!isAlignedPackage(record)) {
    if (requireReady && !allowSynthetic) pushIssue(issues, "LEGACY-PACKAGE-NOT-QUANTITATIVE",
      "schemaVersion", "旧 v1 包仅保留历史/合成回读；新定量发布需显式迁移湿区与规范元数据。");
    return issues;
  }
  if (!FORWARD_MODEL_IDS.includes(record.modelId)) {
    pushIssue(issues, "MODEL-ID", "modelId", "未知前向物理分支。");
  }
  const gauge = validateWakeGaugeMetadata(record.wakeGauge);
  for (const issue of gauge.issues) pushIssue(issues, issue.code, issue.path, issue.message);
  if (isObject(record.wakeGauge)) {
    if (record.wakeGauge.modelId !== record.modelId) {
      pushIssue(issues, "GAUGE-MODEL-MISMATCH", "wakeGauge.modelId", "尾流规范必须绑定同一物理分支。");
    }
    if (record.wakeGauge.output?.kind !== "sectional-lift-coefficient"
      || record.wakeGauge.output?.unit !== "1"
      || record.wakeGauge.output?.expression !== "finiteSpanCoherence*Re(liftOutput*A)"
      || record.wakeGauge.finiteSpanCoherence?.representation !== "constant-factor") {
      pushIssue(issues, "UNSUPPORTED-OUTPUT-CLOSURE", "wakeGauge.output",
        "当前正式实现接受无量纲截面输出及明示常数跨距闭合；有量纲总力矩或空间相干函数不可直接塞入旧字段。");
    }
  }
  if (record.wetSpanDefinition !== "streamwise-projected-area-over-diameter") {
    pushIssue(issues, "WET-SPAN-DEFINITION", "wetSpanDefinition", "必须声明 L_w=A_perp/(2R) 湿跨定义。");
  }
  const directional = record.modelId === "VP-FWD-P0-SL1-DW-v1" || record.modelId === "VP-FWD-P0-SL1-SS-DW-v1";
  if (record.dragWidthDefinition !== (directional ? "relative-flow-normal-wet-width" : "streamwise-wet-width")) {
    pushIssue(issues, "DRAG-WIDTH-MISMATCH", "dragWidthDefinition", "阻力系数参考宽度与物理分支不匹配。");
  }
  const minWet = record.parameters?.["rom.calibrationMinWetSpan"]?.value;
  if (finite(minWet) && minWet < 0) pushIssue(issues, "WET-MINIMUM-INVALID",
    "parameters.rom.calibrationMinWetSpan", "最小标定湿跨必须非负，来源必须独立声明。");
  if (packageHasStickSlip(record)) {
    for (const [path, unit] of Object.entries(SS_APPARATUS_PARAMETERS)) {
      const entry = apparatus.parameters?.[path];
      validateMeasuredEntry(entry, unit, `apparatus.parameters.${path}`, requireReady, issues);
      if (requireReady && !allowSynthetic && isObject(entry)
        && (entry.status === "synthetic" || /synthetic/iu.test(String(entry.source)))) {
        pushIssue(issues, "SYNTHETIC-INPUT-IN-PRODUCTION", `apparatus.parameters.${path}`,
          "SS 静/动阈值必须来自独立低速摩擦测量。");
      }
    }
    const staticTorque = apparatus.parameters?.["support.staticFrictionTorque"]?.value;
    const kineticTorque = apparatus.parameters?.["support.kineticFrictionTorque"]?.value;
    if (finite(staticTorque) && finite(kineticTorque) && (kineticTorque < 0 || staticTorque < kineticTorque)) {
      pushIssue(issues, "SS-THRESHOLDS", "apparatus.parameters", "SS 必须满足静阈值≥动阈值≥0。");
    }
  }
  return issues;
}
