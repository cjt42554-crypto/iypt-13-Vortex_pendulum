import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  matrixCases,
  parseCli,
  sameNonzeroTrend,
} from "./audit-support.ts";
import { runCase } from "./audit-case.ts";
import {
  DEFAULT_SCALE_AWARE_MAXIMUM_RELATIVE_TOLERANCE,
  DEFAULT_SCALE_AWARE_RMS_RELATIVE_TOLERANCE,
} from "../src/control-volume-force.ts";

function renderMarkdown(report: any): string {
  const lines: string[] = [
    "# A2 控制体取力与规定运动功率审计结果",
    "",
    `- 生成时间：${report.createdAt}`,
    `- profile：\`${report.profile}\``,
    `- 总判定：**${report.decision.code}**`,
    `- 结论：${report.decision.interpretation}`,
    "",
    "## 硬门摘要",
    "",
    `- raw 离散控制体与 A1 反力特征尺度对账：${report.gates.rawDiscreteBalancePassed ? "PASS" : "FAIL"}`,
    `- 控制体边界无 Brinkman 源：${report.gates.boundaryIsolationPassed ? "PASS" : "FAIL"}`,
    `- 控制体位置下功率符号稳定：${report.gates.withinCaseControlVolumeSignStable ? "PASS" : "FAIL"}`,
    `- 网格–Mach 矩阵功率符号稳定：${report.gates.matrixPowerSignStable ? "PASS" : "FAIL/NOT-RUN"}`,
    "",
    "## 算例",
    "",
    "| case | N_D | U_lu | Ma_ref | raw max/RMS_ref | raw RMS/RMS_ref | raw CV | CV 功率符号 | mean corrected power range (W/m) |",
    "|---|---:|---:|---:|---:|---:|---|---|---:|",
  ];
  for (const item of report.cases) {
    const powers = item.volumes.map((volume: any) => volume.correctedHalfForceMomentum.meanPower);
    const trends = [...new Set(item.volumes.map((volume: any) => volume.correctedHalfForceMomentum.powerTrend))].join(",");
    const maximumScaleAwareResidual = Math.max(
      ...item.volumes.map((volume: any) => volume.maximumRawResidualRelativeToReferenceRms),
    );
    const rmsScaleAwareResidual = Math.max(
      ...item.volumes.map((volume: any) => volume.rmsRawResidualRelativeToReferenceRms),
    );
    lines.push(
      `| ${item.caseId} | ${item.numericalIdentity.diameterCells} | ${item.numericalIdentity.resolvedLatticeVelocity.toExponential(3)} | ${item.numericalIdentity.latticeMach.toExponential(3)} | ${maximumScaleAwareResidual.toExponential(3)} | ${rmsScaleAwareResidual.toExponential(3)} | ${item.gates.rawDiscreteBalancePassed ? "PASS" : "FAIL"} | ${trends} | ${Math.min(...powers).toExponential(6)} … ${Math.max(...powers).toExponential(6)} |`,
    );
  }
  lines.push(
    "",
    "## 结论边界",
    "",
    "本结果只审计二维单位跨长、规定运动条件下的动态取力与机械端口功率。即使全部硬门通过，也不等同于三维有限湿跨、自由表面、真实水槽或实物装置预测通过。",
    "",
  );
  return `${lines.join("\n").trimEnd()}\n`;
}


const cli = parseCli();
const cases: Awaited<ReturnType<typeof runCase>>[] = [];
for (const item of matrixCases(cli.profile)) {
  process.stdout.write(`running ${item.id}\n`);
  cases.push(await runCase(item, cli));
}

const allVolumes = cases.flatMap((item) => item.volumes);
const correctedHarmonics = allVolumes.map((volume) => volume.correctedHalfForceMomentum);
const rawDiscreteBalancePassed = cases.every((item) => item.gates.rawDiscreteBalancePassed);
const boundaryIsolationPassed = cases.every((item) => item.gates.boundaryIsolationPassed);
const withinCaseControlVolumeSignStable = cases.every(
  (item) => item.gates.controlVolumeSignStable,
);
const matrixPowerSignStable = cli.profile === "research"
  && sameNonzeroTrend(correctedHarmonics);
const controlVolumePowerSpreadPassed = cases.every(
  (item) => item.gates.controlVolumePowerSpreadPassed,
);
const timeStaggeringSensitivityPassed = cases.every(
  (item) => item.gates.timeStaggeringSensitivityPassed,
);

let decisionCode: string;
let interpretation: string;
if (!rawDiscreteBalancePassed) {
  decisionCode = "STOP-A2-DISCRETE-MOMENTUM-BALANCE";
  interpretation = "独立控制体在全程参考反力 RMS 尺度下无法复现 A1 raw 反力，先修正离散库存/穿越通量或时层定义，禁止解释物理功率。";
} else if (!boundaryIsolationPassed) {
  decisionCode = "STOP-A2-CONTROL-VOLUME-CONTAMINATED";
  interpretation = "Brinkman 源触及控制体边界，控制体没有隔离全部体力源。";
} else if (cli.profile !== "research") {
  decisionCode = "PASS-A2-COMPONENT-SMOKE-RESEARCH-MATRIX-NOT-RUN";
  interpretation = "A2 实现链可运行，但尚未执行三网格三 Mach 的规定运动研究矩阵；不能裁决功率符号。";
} else if (!withinCaseControlVolumeSignStable || !matrixPowerSignStable
  || !controlVolumePowerSpreadPassed || !timeStaggeringSensitivityPassed) {
  decisionCode = "INCONCLUSIVE-A2-PRESCRIBED-POWER";
  interpretation = "离散 raw 对账成立，但修正后功率对控制体、网格、Mach 或时层定义仍不稳健；弱 FSI 趋势继续 NO-GO。";
} else {
  decisionCode = "PASS-A2-2D-PRESCRIBED-POWER-SIGN-ONLY";
  interpretation = "二维规定运动下的修正载荷功率符号在本矩阵内稳健；这只解除二维动态取力的一个硬门，不构成装置预测或弱 FSI 验收。";
}

const report = {
  format: "VP-CFD2D-A2-CONTROL-VOLUME-PRESCRIBED-POWER-v2",
  createdAt: new Date().toISOString(),
  profile: cli.profile,
  modelUnderAudit: "VP-HF-CFD2D-v1 / VP-CFD2D-RAW-BRINKMAN-A1-v1",
  candidateMethod: {
    rawForce: "exact-discrete-internal-control-volume-momentum-balance",
    physicalCorrection: "raw-reaction-plus-time-derivative-of-diffuse-mask-fictitious-fluid-momentum",
    nativeUnits: "two-dimensional-line-force-and-line-power",
    nonInvasiveAccess: "public-checkpoint-copy-plus-macroscopicCopies",
    rawBalanceGate: "maximum-and-rms-absolute-residuals-normalized-by-all-step-reference-reaction-rms",
    pointwiseRelativeResidual: "diagnostic-only-because-the-denominator-is-singular-at-force-zero-crossings",
    caveat: "full-population checkpoint copying is correct but inefficient; formal integration should expose a narrow read-only CV probe",
  },
  requestedMotion: {
    amplitude: cli.amplitude,
    frequency: cli.frequency,
    cycles: cli.cycles,
    discardCycles: cli.discardCycles,
  },
  gates: {
    rawDiscreteBalancePassed,
    boundaryIsolationPassed,
    withinCaseControlVolumeSignStable,
    matrixPowerSignStable,
    controlVolumePowerSpreadPassed,
    timeStaggeringSensitivityPassed,
  },
  thresholds: {
    maximumRawResidualRelativeToReferenceRms:
      DEFAULT_SCALE_AWARE_MAXIMUM_RELATIVE_TOLERANCE,
    rmsRawResidualRelativeToReferenceRms:
      DEFAULT_SCALE_AWARE_RMS_RELATIVE_TOLERANCE,
    maximumBoundaryMask: 1e-14,
    maximumWithinCasePowerSpread: 0.05,
    maximumBareVsHalfForceCorrectionSensitivity: 0.10,
    powerSignDeadbandRelativeToFundamentalScale: 1e-4,
  },
  decision: { code: decisionCode, interpretation },
  explicitNonClaims: [
    "not a three-dimensional finite-wet-span load",
    "not a free-surface or real-channel validation",
    "not a weak-FSI or apparatus-trend acceptance",
    "not experimental validation",
    "not a ROM calibration until the research profile and external prescribed-motion benchmark gates pass",
  ],
  cases,
};

await mkdir(dirname(cli.outputPath), { recursive: true });
await mkdir(dirname(cli.markdownPath), { recursive: true });
await writeFile(cli.outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(cli.markdownPath, renderMarkdown(report), "utf8");
process.stdout.write(`${JSON.stringify({ output: cli.outputPath, markdown: cli.markdownPath, decision: report.decision }, null, 2)}\n`);
if (decisionCode.startsWith("STOP-")) process.exitCode = 1;
