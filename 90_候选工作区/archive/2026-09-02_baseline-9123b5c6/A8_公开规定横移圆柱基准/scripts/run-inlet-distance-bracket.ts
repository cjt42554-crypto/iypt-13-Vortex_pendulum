import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { FIXED_TARGET } from "../src/benchmark-contract.ts";
import {
  runFixedCylinderCase,
  type FixedCylinderCaseResult,
} from "../src/fixed-cylinder-case-runner.ts";
import { relativeDifference } from "../src/grid-mask-contract.ts";
import {
  INLET_BRACKET_FINE_CHANGE_TOLERANCE,
  INLET_BRACKET_MASK_HALF_THICKNESSES,
  INLET_BRACKET_REFERENCE_REPRODUCTION_TOLERANCE,
  inletDistanceDefinitions,
} from "../src/inlet-distance-contract.ts";

interface CliOptions {
  profile: "smoke" | "research";
  outputPath: string;
  markdownPath: string;
  domainReferencePath: string;
  renderReportPath: string | null;
}

interface MetricSet {
  meanDrag: number;
  liftRms: number;
  strouhal: number;
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
  const profileText = parseOption("profile") ?? "smoke";
  if (profileText !== "smoke" && profileText !== "research") {
    throw new RangeError("--profile must be smoke or research");
  }
  const artifactRoot = "../90_候选工作区/current/A8_公开规定横移圆柱基准/验证与复现/artifacts";
  const defaultStem = `${artifactRoot}/a8-inlet-distance-bracket-${profileText}`;
  return {
    profile: profileText,
    outputPath: resolve(parseOption("output") ?? `${defaultStem}.json`),
    markdownPath: resolve(parseOption("markdown") ?? `${defaultStem}.md`),
    domainReferencePath: resolve(
      parseOption("domain-reference")
        ?? `${artifactRoot}/a8-domain-boundary-audit-research.json`,
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

function metricSet(item: any): MetricSet {
  const source = item?.metrics ?? item?.fixed?.metrics;
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

function findActual(
  cases: readonly FixedCylinderCaseResult[],
  maskHalfThickness: number,
  upstreamDiameters: number,
): FixedCylinderCaseResult {
  const item = cases.find((candidate) => (
    candidate.definition.maskHalfThickness === maskHalfThickness
      && candidate.numericalIdentity.upstreamDiameters === upstreamDiameters
  ));
  if (item === undefined) {
    throw new Error(`missing actual mask=${maskHalfThickness}, inlet=${upstreamDiameters}`);
  }
  return item;
}

function findReference(
  report: any,
  maskHalfThickness: number,
  upstreamDiameters: number,
) {
  const item = report?.cases?.find?.((candidate: any) => (
    candidate?.definition?.maskHalfThickness === maskHalfThickness
      && candidate?.numericalIdentity?.upstreamDiameters === upstreamDiameters
      && candidate?.numericalIdentity?.domainWidthDiameters === 10
      && candidate?.numericalIdentity?.downstreamDiameters === 19.5
  ));
  if (item === undefined) {
    throw new Error(`missing reference mask=${maskHalfThickness}, inlet=${upstreamDiameters}`);
  }
  return item;
}

function change(actual: MetricSet, reference: MetricSet) {
  const relativeDifferences = {
    meanDrag: relativeDifference(actual.meanDrag, reference.meanDrag),
    liftRms: relativeDifference(actual.liftRms, reference.liftRms),
    strouhal: relativeDifference(actual.strouhal, reference.strouhal),
  };
  return {
    relativeDifferences,
    maximumRelativeLoadDifference: Math.max(
      relativeDifferences.meanDrag,
      relativeDifferences.liftRms,
    ),
    absoluteStrouhalDifference: Math.abs(actual.strouhal - reference.strouhal),
  };
}

function familySummary(
  cases: readonly FixedCylinderCaseResult[],
  referenceReport: any,
  maskHalfThickness: number,
) {
  const source = findReference(referenceReport, maskHalfThickness, 3.5);
  const inlet7 = findActual(cases, maskHalfThickness, 7);
  const inlet10p5 = findActual(cases, maskHalfThickness, 10.5);
  const inlet14 = findActual(cases, maskHalfThickness, 14);
  return {
    maskHalfThickness,
    sourceReferenceCaseId: source.definition.id,
    inlet7CaseId: inlet7.definition.id,
    inlet10p5CaseId: inlet10p5.definition.id,
    inlet14CaseId: inlet14.definition.id,
    sourceTo7: change(metricSet(inlet7), metricSet(source)),
    inlet7To10p5: change(metricSet(inlet10p5), metricSet(inlet7)),
    inlet10p5To14: change(metricSet(inlet14), metricSet(inlet10p5)),
    sourceTo14: change(metricSet(inlet14), metricSet(source)),
  };
}

function renderPercent(value: number): string {
  return `${(100 * value).toFixed(3)}%`;
}

function renderMarkdown(report: any): string {
  const lines = [
    "# A8 入口距离括号结果",
    "",
    `- 生成时间：${report.createdAt}`,
    `- profile：\`${report.profile}\``,
    `- 总判定：**${report.decision.code}**`,
    `- 结论：${report.decision.interpretation}`,
    "",
    "## 算例",
    "",
    "| upstream/D | mask half | mean Cd | CL rms | St | mature | literature |",
    "|---:|---:|---:|---:|---:|---|---|",
  ];
  for (const item of report.cases) {
    lines.push(
      `| ${item.numericalIdentity.upstreamDiameters.toFixed(1)} | ${item.definition.maskHalfThickness.toFixed(2)} | ${item.metrics.meanDrag.toFixed(6)} | ${item.metrics.liftRms.toFixed(6)} | ${item.metrics.strouhal.toFixed(5)} | ${item.maturity.passed ? "PASS" : "FAIL"} | ${item.literature.passed ? "PASS" : "FAIL"} |`,
    );
  }
  lines.push("", "## 入口距离诊断", "");
  for (const family of report.familySummaries) {
    lines.push(
      `- mask half ${family.maskHalfThickness.toFixed(2)}：3.5D→7D ${renderPercent(family.sourceTo7.maximumRelativeLoadDifference)}；7D→10.5D ${renderPercent(family.inlet7To10p5.maximumRelativeLoadDifference)}；10.5D→14D ${renderPercent(family.inlet10p5To14.maximumRelativeLoadDifference)}；3.5D→14D ${renderPercent(family.sourceTo14.maximumRelativeLoadDifference)}。`,
    );
  }
  lines.push(
    "",
    "## 门状态",
    "",
    `- 数值稳定：${report.gates.numericalStabilityPassed ? "PASS" : "FAIL"}`,
    `- 全算例成熟：${report.gates.allCasesMature ? "PASS" : "FAIL/NOT-APPLICABLE"}`,
    `- 7D 重复点复现：${report.gates.referencesReproduced ? "PASS" : "FAIL/NOT-APPLICABLE"}`,
    `- 10.5D→14D 双族收窄：${report.gates.fineInletChangesPassed ? "PASS" : "FAIL/NOT-APPLICABLE"}`,
    `- 任一文献全门命中：${report.gates.targetHitCaseIds.length > 0 ? report.gates.targetHitCaseIds.join(", ") : "NO"}`,
    `- 来源特征非反射边界已运行：${report.gates.sourceCharacteristicNonreflectionRun ? "YES" : "NO"}`,
    "",
    "## 结论边界",
    "",
    "本括号只改变当前 Zou--He 速度入口到圆柱的距离，并保持 10D 横向周期宽度和 19.5D 下游距离。入口距离收窄不等于来源 Whitfield--Janus 特征非反射边界已复现，也不是更高分辨率、GCI、规定横移、weak-FSI、三维或实验验证。",
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
const definitions = inletDistanceDefinitions(cli.profile);
const cases: FixedCylinderCaseResult[] = [];
for (const definition of definitions) {
  process.stdout.write(`running ${definition.id}\n`);
  cases.push(runFixedCylinderCase(definition, (completed, total) => {
    progress(definition.id, completed, total);
  }));
}

const numericalStabilityPassed = cases.every((item) => (
  item.extrema.maximumDensityDeviation <= 0.08
    && item.extrema.maximumMach <= 0.30
));
const allCasesMature = cases.every((item) => item.maturity.passed);
const targetHitCaseIds = cases
  .filter((item) => item.literature.passed)
  .map((item) => item.definition.id);

let referenceComparisons: Array<{
  maskHalfThickness: number;
  actual: MetricSet;
  reference: MetricSet;
  relativeDifferences: Record<keyof MetricSet, number>;
  maximumRelativeDifference: number;
  passed: boolean;
}> = [];
let familySummaries: ReturnType<typeof familySummary>[] = [];
if (cli.profile === "research") {
  const referenceReport = JSON.parse(await readFile(cli.domainReferencePath, "utf8"));
  referenceComparisons = INLET_BRACKET_MASK_HALF_THICKNESSES.map((mask) => {
    const actual = metricSet(findActual(cases, mask, 7));
    const reference = metricSet(findReference(referenceReport, mask, 7));
    const relativeDifferences = {
      meanDrag: relativeDifference(actual.meanDrag, reference.meanDrag),
      liftRms: relativeDifference(actual.liftRms, reference.liftRms),
      strouhal: relativeDifference(actual.strouhal, reference.strouhal),
    };
    const maximumRelativeDifference = Math.max(...Object.values(relativeDifferences));
    return {
      maskHalfThickness: mask,
      actual,
      reference,
      relativeDifferences,
      maximumRelativeDifference,
      passed: maximumRelativeDifference
        <= INLET_BRACKET_REFERENCE_REPRODUCTION_TOLERANCE,
    };
  });
  familySummaries = INLET_BRACKET_MASK_HALF_THICKNESSES.map((mask) => (
    familySummary(cases, referenceReport, mask)
  ));
}

const referencesReproduced = referenceComparisons.length > 0
  && referenceComparisons.every((item) => item.passed);
const fineInletChangesPassed = familySummaries.length > 0
  && familySummaries.every((item) => (
    item.inlet10p5To14.maximumRelativeLoadDifference
      <= INLET_BRACKET_FINE_CHANGE_TOLERANCE
  ));

let decision: { code: string; interpretation: string };
if (!numericalStabilityPassed) {
  decision = {
    code: "STOP-A8I-NUMERICAL-STABILITY",
    interpretation: "至少一个入口距离算例超过密度偏差或 Mach 硬门。",
  };
} else if (cli.profile === "smoke") {
  decision = {
    code: "PASS-A8I-SMOKE-QUANTITATIVE-MATRIX-NOT-RUN",
    interpretation: "双 mask 三入口距离执行链可达；短窗与 N_D=8 不作定量裁决。",
  };
} else if (!allCasesMature) {
  decision = {
    code: "NO-GO-A8I-WAKE-NOT-MATURE",
    interpretation: "至少一个入口距离算例未通过统计窗成熟门。",
  };
} else if (!referencesReproduced) {
  decision = {
    code: "STOP-A8I-REFERENCE-NONREPRODUCIBLE",
    interpretation: "7D 重复点未复现已提交域审计结果，禁止解释入口距离趋势。",
  };
} else if (targetHitCaseIds.length > 0) {
  decision = {
    code: "INCONCLUSIVE-A8I-TARGET-HIT-NOT-QUALIFIED",
    interpretation: "至少一个长入口单点命中文献全门，但边界方法和联合收敛仍未验证。",
  };
} else if (!fineInletChangesPassed) {
  decision = {
    code: "NO-GO-A8I-INLET-DISTANCE-NOT-SETTLED",
    interpretation: "没有算例命中文献全门，且至少一个 mask 的 10.5D→14D 载荷变化仍超过 5%。",
  };
} else {
  decision = {
    code: "NO-GO-A8I-INLET-DISTANCE-SETTLED-REFERENCE-MISMATCH-NONREFLECTING-NOT-RUN",
    interpretation: "当前长入口括号末段低于 5%，但文献载荷仍失配且来源特征非反射边界未运行。",
  };
}

const report = {
  format: "VP-CFD2D-A8-INLET-DISTANCE-BRACKET-v1",
  createdAt: new Date().toISOString(),
  profile: cli.profile,
  purpose: "bracket the only significant geometry axis under the current Zou-He inlet",
  definitions,
  thresholds: {
    maximumDensityDeviation: 0.08,
    maximumObservedMach: 0.30,
    meanDragHalfWindowDrift: 0.05,
    liftRmsHalfWindowDrift: 0.10,
    referenceReproductionRelativeTolerance:
      INLET_BRACKET_REFERENCE_REPRODUCTION_TOLERANCE,
    maximumFineInletRelativeLoadChange: INLET_BRACKET_FINE_CHANGE_TOLERANCE,
    fixedLiterature: FIXED_TARGET,
  },
  domainReferencePath: cli.profile === "research" ? cli.domainReferencePath : null,
  referenceComparisons,
  familySummaries,
  gates: {
    numericalStabilityPassed,
    allCasesMature: cli.profile === "research" && allCasesMature,
    referencesReproduced: cli.profile === "research" && referencesReproduced,
    fineInletChangesPassed: cli.profile === "research" && fineInletChangesPassed,
    targetHitCaseIds,
    currentZouHeInletDistanceBracketRun: cli.profile === "research",
    sourceCharacteristicNonreflectionRun: false,
    sourceFineResolutionMatched: false,
    machMatrixRun: false,
    gciRun: false,
    prescribedMotionLongRun: false,
  },
  decision,
  explicitNonClaims: [
    "a longer Zou-He inlet is not a source characteristic nonreflection boundary",
    "not a comparison of alternative boundary algorithms",
    "not source-level N_D=50 near-wall resolution or GCI",
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
