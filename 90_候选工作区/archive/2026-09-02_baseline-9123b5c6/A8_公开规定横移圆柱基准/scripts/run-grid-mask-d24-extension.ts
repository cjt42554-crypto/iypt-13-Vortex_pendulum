import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { FIXED_TARGET } from "../src/benchmark-contract.ts";
import {
  runFixedCylinderCase,
  type FixedCylinderCaseResult,
} from "../src/fixed-cylinder-case-runner.ts";
import {
  GRID_MASK_CROSS_FAMILY_TOLERANCE,
  GRID_MASK_FINE_CHANGE_TOLERANCE,
  GRID_MASK_HALF_THICKNESSES,
  GRID_MASK_REFERENCE_REPRODUCTION_TOLERANCE,
  gridMaskExtensionDefinitions,
  relativeDifference,
  threePointPowerFit,
} from "../src/grid-mask-contract.ts";

interface CliOptions {
  outputPath: string;
  markdownPath: string;
  bracketReferencePath: string;
  renderReportPath: string | null;
}

function parseOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  for (let index = 2; index < process.argv.length; index += 1) {
    const value = process.argv[index] ?? "";
    if (value.startsWith(prefix)) return value.slice(prefix.length);
    if (value === `--${name}`) return process.argv[index + 1];
  }
  return undefined;
}

function parseCli(): CliOptions {
  const artifactRoot = "../90_候选工作区/current/A8_公开规定横移圆柱基准/验证与复现/artifacts";
  const defaultStem = `${artifactRoot}/a8-grid-mask-d24-extension-research`;
  return {
    outputPath: resolve(parseOption("output") ?? `${defaultStem}.json`),
    markdownPath: resolve(parseOption("markdown") ?? `${defaultStem}.md`),
    bracketReferencePath: resolve(
      parseOption("bracket-reference")
        ?? `${artifactRoot}/a8-grid-mask-bracket-research.json`,
    ),
    renderReportPath: parseOption("render-report") === undefined
      ? null
      : resolve(parseOption("render-report")!),
  };
}

function progress(label: string, completed: number, total: number): void {
  const interval = Math.max(1, Math.floor(total / 10));
  if (completed % interval === 0 || completed === total) {
    process.stdout.write(`${label}: ${(100 * completed / total).toFixed(0)}%\n`);
  }
}

function findCase(
  cases: readonly any[],
  diameterCells: number,
  maskHalfThickness: number,
) {
  const candidate = cases.find((item) => (
    (item?.definition?.diameterCells ?? item?.numericalIdentity?.diameterCells)
      === diameterCells
      && (item?.definition?.maskHalfThickness
        ?? item?.numericalIdentity?.maskHalfThickness) === maskHalfThickness
  ));
  if (candidate === undefined) {
    throw new Error(`missing N_D=${diameterCells}, mask=${maskHalfThickness} case`);
  }
  return candidate;
}

function metricSet(item: any) {
  const source = item.metrics ?? item.fixed?.metrics;
  if (!Number.isFinite(source?.meanDrag)
    || !Number.isFinite(source?.liftRms)
    || !Number.isFinite(source?.strouhal)) {
    throw new Error("case does not contain fixed-cylinder metrics");
  }
  return {
    meanDrag: source.meanDrag,
    liftRms: source.liftRms,
    strouhal: source.strouhal,
  };
}

function compareMetricSets(actual: ReturnType<typeof metricSet>, reference: ReturnType<typeof metricSet>) {
  const relativeDifferences = {
    meanDrag: relativeDifference(actual.meanDrag, reference.meanDrag),
    liftRms: relativeDifference(actual.liftRms, reference.liftRms),
    strouhal: relativeDifference(actual.strouhal, reference.strouhal),
  };
  const maximumRelativeDifference = Math.max(...Object.values(relativeDifferences));
  return {
    actual,
    reference,
    relativeDifferences,
    maximumRelativeDifference,
    passed: maximumRelativeDifference <= GRID_MASK_REFERENCE_REPRODUCTION_TOLERANCE,
  };
}

function renderFit(fit: any): string {
  if (fit === null) return "not-monotone";
  return `p=${fit.apparentOrder.toFixed(3)}, ext=${fit.extrapolatedValue.toFixed(5)}, corr=${(100 * fit.fineCorrectionRelative).toFixed(1)}%`;
}

function renderMarkdown(report: any): string {
  const lines = [
    "# A8 双 mask N_D=24 扩展结果",
    "",
    `- 生成时间：${report.createdAt}`,
    `- 总判定：**${report.decision.code}**`,
    `- 结论：${report.decision.interpretation}`,
    "",
    "## 算例",
    "",
    "| N_D | mask half | mean Cd | CL rms | St | mature | literature | score |",
    "|---:|---:|---:|---:|---:|---|---|---:|",
  ];
  for (const item of report.cases) {
    lines.push(
      `| ${item.definition.diameterCells} | ${item.definition.maskHalfThickness.toFixed(2)} | ${item.metrics.meanDrag.toFixed(6)} | ${item.metrics.liftRms.toFixed(6)} | ${item.metrics.strouhal.toFixed(5)} | ${item.maturity.passed ? "PASS" : "FAIL"} | ${item.literature.passed ? "PASS" : "FAIL"} | ${item.literatureErrorScore.toFixed(3)} |`,
    );
  }
  lines.push("", "## 族内与跨族诊断", "");
  for (const family of report.familySummaries) {
    lines.push(
      `- mask half ${family.maskHalfThickness.toFixed(2)}：20→24 最大载荷变化 ${(100 * family.maximum20To24LoadChange).toFixed(2)}%；drag ${renderFit(family.fits.meanDrag)}；lift RMS ${renderFit(family.fits.liftRms)}；St ${renderFit(family.fits.strouhal)}。`,
    );
  }
  lines.push(
    `- N_D=24 跨 mask 最大载荷差：${(100 * report.crossFamilyAt24.maximumRelativeLoadDifference).toFixed(2)}%。`,
    `- N_D=24 跨 mask 绝对 St 差：${report.crossFamilyAt24.absoluteStrouhalDifference.toFixed(5)}。`,
    "",
    "## 门状态",
    "",
    `- 数值稳定：${report.gates.numericalStabilityPassed ? "PASS" : "FAIL"}`,
    `- 全算例成熟：${report.gates.allCasesMature ? "PASS" : "FAIL"}`,
    `- N_D=20 重复点复现：${report.gates.referencesReproduced ? "PASS" : "FAIL"}`,
    `- 20→24 双族载荷变化门：${report.gates.fineChangesPassed ? "PASS" : "FAIL"}`,
    `- N_D=24 跨 mask 载荷差门：${report.gates.crossFamilyPassed ? "PASS" : "FAIL"}`,
    `- 任一文献全门命中：${report.gates.targetHitCaseIds.length > 0 ? report.gates.targetHitCaseIds.join(", ") : "NO"}`,
    "",
    "## 结论边界",
    "",
    "N_D=24 仍是低于来源局部 N_D=50 的均匀弥散网格。三点拟合只用于判断是否显露稳定渐近趋势，不是 GCI。没有 Mach、域、非反射横向边界、格点相位联合矩阵，也没有规定横移、weak-FSI、三维或实验验证。",
  );
  return `${lines.join("\n").trimEnd()}\n`;
}

const cli = parseCli();
if (cli.renderReportPath !== null) {
  const existingReport = JSON.parse(await readFile(cli.renderReportPath, "utf8"));
  await mkdir(dirname(cli.markdownPath), { recursive: true });
  await writeFile(cli.markdownPath, renderMarkdown(existingReport), "utf8");
  process.stdout.write(`${JSON.stringify({
    source: cli.renderReportPath,
    markdown: cli.markdownPath,
    decision: existingReport.decision,
  }, null, 2)}\n`);
  process.exit(0);
}
const referenceReport = JSON.parse(await readFile(cli.bracketReferencePath, "utf8"));
const definitions = gridMaskExtensionDefinitions();
const cases: FixedCylinderCaseResult[] = [];
for (const definition of definitions) {
  process.stdout.write(`running ${definition.id}\n`);
  cases.push(runFixedCylinderCase(definition, (completed, total) => {
    progress(definition.id, completed, total);
  }));
}

const referenceComparisons = GRID_MASK_HALF_THICKNESSES.map((mask) => {
  const actual = findCase(cases, 20, mask);
  const reference = findCase(referenceReport.cases, 20, mask);
  return {
    maskHalfThickness: mask,
    ...compareMetricSets(metricSet(actual), metricSet(reference)),
  };
});

const familySummaries = GRID_MASK_HALF_THICKNESSES.map((mask) => {
  const n16 = findCase(referenceReport.cases, 16, mask);
  const n20 = findCase(cases, 20, mask);
  const n24 = findCase(cases, 24, mask);
  const values = (name: "meanDrag" | "liftRms" | "strouhal") => [
    metricSet(n16)[name],
    metricSet(n20)[name],
    metricSet(n24)[name],
  ] as [number, number, number];
  const at20 = metricSet(n20);
  const at24 = metricSet(n24);
  const changes = {
    meanDrag: relativeDifference(at20.meanDrag, at24.meanDrag),
    liftRms: relativeDifference(at20.liftRms, at24.liftRms),
    strouhal: relativeDifference(at20.strouhal, at24.strouhal),
  };
  return {
    maskHalfThickness: mask,
    caseIds: [n16.definition.id, n20.definition.id, n24.definition.id],
    changes20To24: changes,
    maximum20To24LoadChange: Math.max(changes.meanDrag, changes.liftRms),
    fits: {
      meanDrag: threePointPowerFit([16, 20, 24], values("meanDrag")),
      liftRms: threePointPowerFit([16, 20, 24], values("liftRms")),
      strouhal: threePointPowerFit([16, 20, 24], values("strouhal")),
    },
    fineCaseId: n24.definition.id,
    fineMetrics: at24,
    fineLiterature: n24.literature,
  };
});

const thin24 = findCase(cases, 24, 0.5);
const baseline24 = findCase(cases, 24, 0.75);
const thinMetrics = metricSet(thin24);
const baselineMetrics = metricSet(baseline24);
const crossDifferences = {
  meanDrag: relativeDifference(thinMetrics.meanDrag, baselineMetrics.meanDrag),
  liftRms: relativeDifference(thinMetrics.liftRms, baselineMetrics.liftRms),
  strouhal: relativeDifference(thinMetrics.strouhal, baselineMetrics.strouhal),
};
const crossFamilyAt24 = {
  relativeDifferences: crossDifferences,
  maximumRelativeLoadDifference: Math.max(
    crossDifferences.meanDrag,
    crossDifferences.liftRms,
  ),
  absoluteStrouhalDifference: Math.abs(thinMetrics.strouhal - baselineMetrics.strouhal),
};

const numericalStabilityPassed = cases.every((item) => (
  item.extrema.maximumDensityDeviation <= 0.08
    && item.extrema.maximumMach <= 0.30
));
const allCasesMature = cases.every((item) => item.maturity.passed);
const referencesReproduced = referenceComparisons.every((item) => item.passed);
const fineChangesPassed = familySummaries.every((item) => (
  item.maximum20To24LoadChange <= GRID_MASK_FINE_CHANGE_TOLERANCE
));
const crossFamilyPassed = crossFamilyAt24.maximumRelativeLoadDifference
  <= GRID_MASK_CROSS_FAMILY_TOLERANCE;
const targetHitCaseIds = cases
  .filter((item) => item.literature.passed)
  .map((item) => item.definition.id);

let decision: { code: string; interpretation: string };
if (!numericalStabilityPassed) {
  decision = {
    code: "STOP-A8G24-NUMERICAL-STABILITY",
    interpretation: "至少一个 N_D=20/24 双 mask 算例超过密度偏差或 Mach 硬门。",
  };
} else if (!allCasesMature) {
  decision = {
    code: "NO-GO-A8G24-WAKE-NOT-MATURE",
    interpretation: "至少一个 N_D=20/24 算例未通过统计窗成熟门。",
  };
} else if (!referencesReproduced) {
  decision = {
    code: "STOP-A8G24-REFERENCE-NONREPRODUCIBLE",
    interpretation: "N_D=20 重复点不能复现已提交括号结果，禁止解释 N_D=24。",
  };
} else if (targetHitCaseIds.length > 0) {
  decision = {
    code: "INCONCLUSIVE-A8G24-TARGET-HIT-NOT-QUALIFIED",
    interpretation: "至少一个 N_D=20/24 点命中文献全门，但仍缺联合网格–Mach–域收敛。",
  };
} else if (!fineChangesPassed || !crossFamilyPassed) {
  decision = {
    code: "NO-GO-A8G24-GRID-MASK-NOT-SETTLED",
    interpretation: "没有算例命中文献全门，且 20→24 网格变化或 N_D=24 跨 mask 差仍超过 5%。",
  };
} else {
  decision = {
    code: "NO-GO-A8G24-FIXED-REFERENCE-MISMATCH-SOURCE-RESOLUTION-NOT-RUN",
    interpretation: "双 mask 括号已低于 5%，但 N_D=24 仍未命中文献全门且未达到来源局部分辨率。",
  };
}

const report = {
  format: "VP-CFD2D-A8-GRID-MASK-D24-EXTENSION-v1",
  createdAt: new Date().toISOString(),
  purpose: "repeat N_D=20 and extend both diffuse-mask families to N_D=24",
  definitions,
  thresholds: {
    maximumDensityDeviation: 0.08,
    maximumObservedMach: 0.30,
    meanDragHalfWindowDrift: 0.05,
    liftRmsHalfWindowDrift: 0.10,
    referenceReproductionRelativeTolerance: GRID_MASK_REFERENCE_REPRODUCTION_TOLERANCE,
    maximum20To24RelativeLoadChange: GRID_MASK_FINE_CHANGE_TOLERANCE,
    maximumN24CrossFamilyRelativeLoadDifference: GRID_MASK_CROSS_FAMILY_TOLERANCE,
    fixedLiterature: FIXED_TARGET,
  },
  bracketReferencePath: cli.bracketReferencePath,
  referenceComparisons,
  familySummaries,
  crossFamilyAt24,
  gates: {
    numericalStabilityPassed,
    allCasesMature,
    referencesReproduced,
    fineChangesPassed,
    crossFamilyPassed,
    targetHitCaseIds,
    sourceFineResolutionMatched: false,
    machMatrixRun: false,
    domainSensitivityRun: false,
    gridPhaseJointMatrixRun: false,
    gciRun: false,
    prescribedMotionLongRun: false,
  },
  decision,
  explicitNonClaims: [
    "not source-level N_D=50 near-wall resolution",
    "not GCI or a joint grid-Mach-domain-mask convergence study",
    "not parameter calibration",
    "not prescribed-motion, weak-FSI, apparatus, or experimental validation",
  ],
  cases,
};

await mkdir(dirname(cli.outputPath), { recursive: true });
await mkdir(dirname(cli.markdownPath), { recursive: true });
await writeFile(cli.outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(cli.markdownPath, renderMarkdown(report), "utf8");
process.stdout.write(`${JSON.stringify({
  output: cli.outputPath,
  markdown: cli.markdownPath,
  decision,
}, null, 2)}\n`);
if (decision.code.startsWith("STOP-")) process.exitCode = 1;
