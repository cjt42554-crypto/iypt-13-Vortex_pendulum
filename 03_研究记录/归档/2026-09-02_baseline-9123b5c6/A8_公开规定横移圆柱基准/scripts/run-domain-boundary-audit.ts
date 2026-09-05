import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { FIXED_TARGET } from "../src/benchmark-contract.ts";
import {
  DOMAIN_AUDIT_MASK_HALF_THICKNESSES,
  DOMAIN_AUDIT_REFERENCE_REPRODUCTION_TOLERANCE,
  DOMAIN_AUDIT_RELATIVE_LOAD_TOLERANCE,
  DOMAIN_BOUNDARY_IDENTITIES,
  DOMAIN_GEOMETRY_VARIANTS,
  SOURCE_DOMAIN_GEOMETRY,
  domainGeometryDefinitions,
  type DomainGeometryVariant,
} from "../src/domain-boundary-contract.ts";
import {
  runFixedCylinderCase,
  type FixedCylinderCaseResult,
} from "../src/fixed-cylinder-case-runner.ts";
import { relativeDifference } from "../src/grid-mask-contract.ts";

interface CliOptions {
  profile: "smoke" | "research";
  outputPath: string;
  markdownPath: string;
  bracketReferencePath: string;
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
  const defaultStem = `${artifactRoot}/a8-domain-boundary-audit-${profileText}`;
  return {
    profile: profileText,
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

function geometryId(item: FixedCylinderCaseResult): string {
  const match = DOMAIN_GEOMETRY_VARIANTS.find((geometry) => (
    item.definition.id.endsWith(`-${geometry.id}`)
  ));
  if (match === undefined) throw new Error(`unknown geometry in ${item.definition.id}`);
  return match.id;
}

function findCase(
  cases: readonly FixedCylinderCaseResult[],
  maskHalfThickness: number,
  geometry: DomainGeometryVariant,
): FixedCylinderCaseResult {
  const item = cases.find((candidate) => (
    candidate.definition.maskHalfThickness === maskHalfThickness
      && geometryId(candidate) === geometry.id
  ));
  if (item === undefined) {
    throw new Error(`missing mask=${maskHalfThickness}, geometry=${geometry.id}`);
  }
  return item;
}

function compareMetrics(actual: MetricSet, reference: MetricSet) {
  const relativeDifferences = {
    meanDrag: relativeDifference(actual.meanDrag, reference.meanDrag),
    liftRms: relativeDifference(actual.liftRms, reference.liftRms),
    strouhal: relativeDifference(actual.strouhal, reference.strouhal),
  };
  return {
    actual,
    reference,
    relativeDifferences,
    maximumRelativeDifference: Math.max(...Object.values(relativeDifferences)),
  };
}

function loadChange(actual: MetricSet, reference: MetricSet) {
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
  maskHalfThickness: number,
) {
  const baseline = findCase(cases, maskHalfThickness, SOURCE_DOMAIN_GEOMETRY);
  const width15 = findCase(
    cases,
    maskHalfThickness,
    DOMAIN_GEOMETRY_VARIANTS.find((item) => item.id === "width-15d")!,
  );
  const width20 = findCase(
    cases,
    maskHalfThickness,
    DOMAIN_GEOMETRY_VARIANTS.find((item) => item.id === "width-20d")!,
  );
  const outlet = findCase(
    cases,
    maskHalfThickness,
    DOMAIN_GEOMETRY_VARIANTS.find((item) => item.id === "outlet-26p5d")!,
  );
  const inlet = findCase(
    cases,
    maskHalfThickness,
    DOMAIN_GEOMETRY_VARIANTS.find((item) => item.id === "inlet-7d")!,
  );
  const baselineMetrics = metricSet(baseline);
  const width15FromBaseline = loadChange(metricSet(width15), baselineMetrics);
  const width20FromBaseline = loadChange(metricSet(width20), baselineMetrics);
  const width15To20 = loadChange(metricSet(width20), metricSet(width15));
  const outletFromBaseline = loadChange(metricSet(outlet), baselineMetrics);
  const inletFromBaseline = loadChange(metricSet(inlet), baselineMetrics);
  const maximumWidthLoadDeviation = Math.max(
    width15FromBaseline.maximumRelativeLoadDifference,
    width20FromBaseline.maximumRelativeLoadDifference,
  );
  const maximumGeometryLoadDeviation = Math.max(
    maximumWidthLoadDeviation,
    outletFromBaseline.maximumRelativeLoadDifference,
    inletFromBaseline.maximumRelativeLoadDifference,
  );
  return {
    maskHalfThickness,
    baselineCaseId: baseline.definition.id,
    width15CaseId: width15.definition.id,
    width20CaseId: width20.definition.id,
    outletCaseId: outlet.definition.id,
    inletCaseId: inlet.definition.id,
    width15FromBaseline,
    width20FromBaseline,
    width15To20,
    outletFromBaseline,
    inletFromBaseline,
    maximumWidthLoadDeviation,
    maximumGeometryLoadDeviation,
  };
}

function renderPercent(value: number): string {
  return `${(100 * value).toFixed(3)}%`;
}

function renderMarkdown(report: any): string {
  const lines = [
    "# A8 域与边界审计结果",
    "",
    `- 生成时间：${report.createdAt}`,
    `- profile：\`${report.profile}\``,
    `- 总判定：**${report.decision.code}**`,
    `- 结论：${report.decision.interpretation}`,
    "",
    "## 几何",
    "",
    "| geometry | mask half | L/D | W/D | upstream/D | downstream/D |",
    "|---|---:|---:|---:|---:|---:|",
  ];
  for (const item of report.cases) {
    lines.push(
      `| ${geometryId(item)} | ${item.definition.maskHalfThickness.toFixed(2)} | ${item.numericalIdentity.domainLengthDiameters.toFixed(1)} | ${item.numericalIdentity.domainWidthDiameters.toFixed(1)} | ${item.numericalIdentity.upstreamDiameters.toFixed(1)} | ${item.numericalIdentity.downstreamDiameters.toFixed(1)} |`,
    );
  }
  lines.push(
    "",
    "## 载荷与门",
    "",
    "| geometry | mask half | mean Cd | CL rms | St | mature | literature |",
    "|---|---:|---:|---:|---:|---|---|",
  );
  for (const item of report.cases) {
    lines.push(
      `| ${geometryId(item)} | ${item.definition.maskHalfThickness.toFixed(2)} | ${item.metrics.meanDrag.toFixed(6)} | ${item.metrics.liftRms.toFixed(6)} | ${item.metrics.strouhal.toFixed(5)} | ${item.maturity.passed ? "PASS" : "FAIL"} | ${item.literature.passed ? "PASS" : "FAIL"} |`,
    );
  }
  lines.push("", "## 几何敏感性", "");
  for (const family of report.familySummaries) {
    lines.push(
      `- mask half ${family.maskHalfThickness.toFixed(2)}：宽度相对 10D 最大载荷偏差 ${renderPercent(family.maximumWidthLoadDeviation)}；15D→20D 最大载荷变化 ${renderPercent(family.width15To20.maximumRelativeLoadDifference)}；出口距离效应 ${renderPercent(family.outletFromBaseline.maximumRelativeLoadDifference)}；入口距离效应 ${renderPercent(family.inletFromBaseline.maximumRelativeLoadDifference)}。`,
    );
  }
  lines.push(
    "",
    "## 门状态",
    "",
    `- 数值稳定：${report.gates.numericalStabilityPassed ? "PASS" : "FAIL"}`,
    `- 全算例成熟：${report.gates.allCasesMature ? "PASS" : "FAIL/NOT-APPLICABLE"}`,
    `- source-domain 重复点复现：${report.gates.referencesReproduced ? "PASS" : "FAIL/NOT-APPLICABLE"}`,
    `- 15D→20D 双族收窄：${report.gates.widthSettled ? "PASS" : "FAIL/NOT-APPLICABLE"}`,
    `- 任一几何轴显著：${report.gates.geometrySensitive ? "YES" : "NO"}`,
    `- 任一文献全门命中：${report.gates.targetHitCaseIds.length > 0 ? report.gates.targetHitCaseIds.join(", ") : "NO"}`,
    `- 来源特征非反射边界已运行：${report.gates.sourceCharacteristicNonreflectionRun ? "YES" : "NO"}`,
    "",
    "## 结论边界",
    "",
    "所有算例仍使用当前正式 LBM 的横向周期回绕、Zou--He 速度入口和固定密度压力出口。扩大域是周期镜像与入口/出口距离诊断，不是 Whitfield--Janus 特征非反射边界复现。没有运行来源局部 N_D=50、高分辨率 GCI、规定横移、weak-FSI、三维或实验验证。",
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
const definitions = domainGeometryDefinitions(cli.profile);
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

let referenceComparisons: Array<ReturnType<typeof compareMetrics> & {
  maskHalfThickness: number;
  passed: boolean;
}> = [];
let familySummaries: ReturnType<typeof familySummary>[] = [];
if (cli.profile === "research") {
  const referenceReport = JSON.parse(await readFile(cli.bracketReferencePath, "utf8"));
  referenceComparisons = DOMAIN_AUDIT_MASK_HALF_THICKNESSES.map((mask) => {
    const actual = findCase(cases, mask, SOURCE_DOMAIN_GEOMETRY);
    const reference = referenceReport?.cases?.find?.((item: any) => (
      item?.definition?.diameterCells === actual.definition.diameterCells
        && item?.definition?.maskHalfThickness === mask
    ));
    if (reference === undefined) throw new Error(`missing bracket reference for mask=${mask}`);
    const comparison = compareMetrics(metricSet(actual), metricSet(reference));
    return {
      maskHalfThickness: mask,
      ...comparison,
      passed: comparison.maximumRelativeDifference
        <= DOMAIN_AUDIT_REFERENCE_REPRODUCTION_TOLERANCE,
    };
  });
  familySummaries = DOMAIN_AUDIT_MASK_HALF_THICKNESSES.map((mask) => (
    familySummary(cases, mask)
  ));
}

const referencesReproduced = referenceComparisons.length > 0
  && referenceComparisons.every((item) => item.passed);
const widthSettled = familySummaries.length > 0
  && familySummaries.every((item) => (
    item.width15To20.maximumRelativeLoadDifference
      <= DOMAIN_AUDIT_RELATIVE_LOAD_TOLERANCE
  ));
const geometrySensitive = familySummaries.some((item) => (
  item.maximumGeometryLoadDeviation >= DOMAIN_AUDIT_RELATIVE_LOAD_TOLERANCE
));

let decision: { code: string; interpretation: string };
if (!numericalStabilityPassed) {
  decision = {
    code: "STOP-A8D-NUMERICAL-STABILITY",
    interpretation: "至少一个域几何算例超过密度偏差或 Mach 硬门。",
  };
} else if (cli.profile === "smoke") {
  decision = {
    code: "PASS-A8D-SMOKE-QUANTITATIVE-MATRIX-NOT-RUN",
    interpretation: "双 mask 五几何执行链可达；短窗与 N_D=8 不作定量裁决。",
  };
} else if (!allCasesMature) {
  decision = {
    code: "NO-GO-A8D-WAKE-NOT-MATURE",
    interpretation: "至少一个域几何算例未通过统计窗成熟门。",
  };
} else if (!referencesReproduced) {
  decision = {
    code: "STOP-A8D-REFERENCE-NONREPRODUCIBLE",
    interpretation: "source-domain 重复点未复现已提交双 mask 参考，禁止解释域趋势。",
  };
} else if (targetHitCaseIds.length > 0) {
  decision = {
    code: "INCONCLUSIVE-A8D-TARGET-HIT-NOT-QUALIFIED",
    interpretation: "至少一个周期域单点命中文献全门，但边界方法和联合收敛仍未验证。",
  };
} else if (!widthSettled) {
  decision = {
    code: "NO-GO-A8D-PERIODIC-WIDTH-NOT-SETTLED",
    interpretation: "没有算例命中文献全门，且至少一个 mask 的 15D→20D 载荷变化仍超过 5%。",
  };
} else if (geometrySensitive) {
  decision = {
    code: "NO-GO-A8D-DOMAIN-SENSITIVE-NONREFLECTING-NOT-RUN",
    interpretation: "当前周期边界下至少一个几何轴显著，但来源特征非反射边界仍未运行。",
  };
} else {
  decision = {
    code: "NO-GO-A8D-PERIODIC-GEOMETRY-INSUFFICIENT-NONREFLECTING-NOT-RUN",
    interpretation: "所测周期域几何变化不足以解释固定载荷偏差；来源特征非反射边界仍未运行。",
  };
}

const report = {
  format: "VP-CFD2D-A8-DOMAIN-BOUNDARY-AUDIT-v1",
  createdAt: new Date().toISOString(),
  profile: cli.profile,
  purpose: "separate source geometry identity from current periodic-boundary geometry sensitivity",
  sourceEvidence: {
    article: "Wang-Wu-Xu-Tan-Entropy-2023-25-432",
    doi: "10.3390/e25030432",
    sourceDomain: SOURCE_DOMAIN_GEOMETRY,
    identities: DOMAIN_BOUNDARY_IDENTITIES,
  },
  definitions,
  thresholds: {
    maximumDensityDeviation: 0.08,
    maximumObservedMach: 0.30,
    meanDragHalfWindowDrift: 0.05,
    liftRmsHalfWindowDrift: 0.10,
    referenceReproductionRelativeTolerance:
      DOMAIN_AUDIT_REFERENCE_REPRODUCTION_TOLERANCE,
    significantRelativeLoadChange: DOMAIN_AUDIT_RELATIVE_LOAD_TOLERANCE,
    fixedLiterature: FIXED_TARGET,
  },
  bracketReferencePath: cli.profile === "research"
    ? cli.bracketReferencePath
    : null,
  referenceComparisons,
  familySummaries,
  gates: {
    numericalStabilityPassed,
    allCasesMature: cli.profile === "research" && allCasesMature,
    referencesReproduced: cli.profile === "research" && referencesReproduced,
    widthSettled: cli.profile === "research" && widthSettled,
    geometrySensitive: cli.profile === "research" && geometrySensitive,
    targetHitCaseIds,
    currentPeriodicGeometrySensitivityRun: cli.profile === "research",
    sourceCharacteristicNonreflectionRun: false,
    sourceFineResolutionMatched: false,
    machMatrixRun: false,
    gciRun: false,
    prescribedMotionLongRun: false,
  },
  decision,
  explicitNonClaims: [
    "wider periodic domains are not source characteristic nonreflection boundaries",
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
