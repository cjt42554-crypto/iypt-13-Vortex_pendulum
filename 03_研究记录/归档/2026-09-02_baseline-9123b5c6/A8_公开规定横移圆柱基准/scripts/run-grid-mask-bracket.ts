import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { FIXED_TARGET } from "../src/benchmark-contract.ts";
import {
  runFixedCylinderCase,
  type FixedCylinderCaseResult,
} from "../src/fixed-cylinder-case-runner.ts";
import {
  GRID_MASK_CROSS_FAMILY_TOLERANCE,
  GRID_MASK_DIAMETERS,
  GRID_MASK_FINE_CHANGE_TOLERANCE,
  GRID_MASK_HALF_THICKNESSES,
  GRID_MASK_REFERENCE_REPRODUCTION_TOLERANCE,
  gridMaskDefinitions,
  relativeDifference,
  threePointPowerFit,
} from "../src/grid-mask-contract.ts";

interface CliOptions {
  profile: "smoke" | "research";
  outputPath: string;
  markdownPath: string;
  publicReferencePath: string;
  sensitivityReferencePath: string;
  renderReportPath: string | null;
}

interface ReferenceMetric {
  id: string;
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
  const defaultStem = `../90_候选工作区/current/A8_公开规定横移圆柱基准/验证与复现/artifacts/a8-grid-mask-bracket-${profileText}`;
  const artifactRoot = "../90_候选工作区/current/A8_公开规定横移圆柱基准/验证与复现/artifacts";
  return {
    profile: profileText,
    outputPath: resolve(parseOption("output") ?? `${defaultStem}.json`),
    markdownPath: resolve(parseOption("markdown") ?? `${defaultStem}.md`),
    publicReferencePath: resolve(
      parseOption("public-reference")
        ?? `${artifactRoot}/a8-public-benchmark-screening.json`,
    ),
    sensitivityReferencePath: resolve(
      parseOption("sensitivity-reference")
        ?? `${artifactRoot}/a8-fixed-sensitivity-research.json`,
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

function metrics(item: FixedCylinderCaseResult) {
  return {
    meanDrag: item.metrics.meanDrag,
    liftRms: item.metrics.liftRms,
    strouhal: item.metrics.strouhal,
  };
}

async function loadReferences(cli: CliOptions): Promise<ReferenceMetric[]> {
  const publicReport = JSON.parse(await readFile(cli.publicReferencePath, "utf8"));
  const sensitivityReport = JSON.parse(
    await readFile(cli.sensitivityReferencePath, "utf8"),
  );
  const references: ReferenceMetric[] = [];
  for (const diameterCells of [12, 16]) {
    const candidate = publicReport?.cases?.find?.(
      (item: any) => item?.numericalIdentity?.diameterCells === diameterCells,
    );
    const source = candidate?.fixed?.metrics;
    if (!Number.isFinite(source?.meanDrag)
      || !Number.isFinite(source?.liftRms)
      || !Number.isFinite(source?.strouhal)) {
      throw new Error(`public reference is missing N_D=${diameterCells}`);
    }
    references.push({
      id: `d${diameterCells}-mask-0p75`,
      meanDrag: source.meanDrag,
      liftRms: source.liftRms,
      strouhal: source.strouhal,
    });
  }
  const thin = sensitivityReport?.cases?.find?.(
    (item: any) => item?.variant?.id === "mask-half-0p50",
  );
  if (!Number.isFinite(thin?.metrics?.meanDrag)
    || !Number.isFinite(thin?.metrics?.liftRms)
    || !Number.isFinite(thin?.metrics?.strouhal)) {
    throw new Error("sensitivity reference is missing mask-half-0p50");
  }
  references.push({
    id: "d16-mask-0p50",
    meanDrag: thin.metrics.meanDrag,
    liftRms: thin.metrics.liftRms,
    strouhal: thin.metrics.strouhal,
  });
  return references;
}

function referenceComparisons(
  cases: readonly FixedCylinderCaseResult[],
  references: readonly ReferenceMetric[],
) {
  return references.map((reference) => {
    const item = cases.find((candidate) => candidate.definition.id === reference.id);
    if (item === undefined) throw new Error(`run matrix is missing ${reference.id}`);
    const relativeDifferences = {
      meanDrag: relativeDifference(item.metrics.meanDrag, reference.meanDrag),
      liftRms: relativeDifference(item.metrics.liftRms, reference.liftRms),
      strouhal: relativeDifference(item.metrics.strouhal, reference.strouhal),
    };
    const maximumRelativeDifference = Math.max(...Object.values(relativeDifferences));
    return {
      id: reference.id,
      reference,
      actual: metrics(item),
      relativeDifferences,
      maximumRelativeDifference,
      passed: maximumRelativeDifference <= GRID_MASK_REFERENCE_REPRODUCTION_TOLERANCE,
    };
  });
}

function familySummary(
  cases: readonly FixedCylinderCaseResult[],
  maskHalfThickness: number,
) {
  const family = cases
    .filter((item) => item.definition.maskHalfThickness === maskHalfThickness)
    .sort((first, second) => (
      first.definition.diameterCells - second.definition.diameterCells
    ));
  if (family.length !== 3) throw new Error(`mask ${maskHalfThickness} family is incomplete`);
  const [coarse, middle, fine] = family;
  if (coarse === undefined || middle === undefined || fine === undefined) {
    throw new Error(`mask ${maskHalfThickness} family cannot be unpacked`);
  }
  const diameters = family.map((item) => item.definition.diameterCells) as unknown as [
    number,
    number,
    number,
  ];
  const values = (name: "meanDrag" | "liftRms" | "strouhal") => (
    family.map((item) => item.metrics[name]) as unknown as [number, number, number]
  );
  const middleToFine = {
    meanDrag: relativeDifference(middle.metrics.meanDrag, fine.metrics.meanDrag),
    liftRms: relativeDifference(middle.metrics.liftRms, fine.metrics.liftRms),
    strouhal: relativeDifference(middle.metrics.strouhal, fine.metrics.strouhal),
  };
  return {
    maskHalfThickness,
    caseIds: family.map((item) => item.definition.id),
    middleToFine,
    maximumMiddleToFineLoadChange: Math.max(
      middleToFine.meanDrag,
      middleToFine.liftRms,
    ),
    fits: {
      meanDrag: threePointPowerFit(diameters, values("meanDrag")),
      liftRms: threePointPowerFit(diameters, values("liftRms")),
      strouhal: threePointPowerFit(diameters, values("strouhal")),
    },
    fineCaseId: fine.definition.id,
    fineMetrics: metrics(fine),
    fineLiterature: fine.literature,
  };
}

function crossFamilySummary(cases: readonly FixedCylinderCaseResult[]) {
  return GRID_MASK_DIAMETERS.map((diameterCells) => {
    const thin = cases.find((item) => (
      item.definition.diameterCells === diameterCells
        && item.definition.maskHalfThickness === 0.5
    ));
    const baseline = cases.find((item) => (
      item.definition.diameterCells === diameterCells
        && item.definition.maskHalfThickness === 0.75
    ));
    if (thin === undefined || baseline === undefined) {
      throw new Error(`cross-family pair is missing at N_D=${diameterCells}`);
    }
    const relativeDifferences = {
      meanDrag: relativeDifference(thin.metrics.meanDrag, baseline.metrics.meanDrag),
      liftRms: relativeDifference(thin.metrics.liftRms, baseline.metrics.liftRms),
      strouhal: relativeDifference(thin.metrics.strouhal, baseline.metrics.strouhal),
    };
    return {
      diameterCells,
      thinCaseId: thin.definition.id,
      baselineCaseId: baseline.definition.id,
      relativeDifferences,
      maximumRelativeLoadDifference: Math.max(
        relativeDifferences.meanDrag,
        relativeDifferences.liftRms,
      ),
      absoluteStrouhalDifference: Math.abs(
        thin.metrics.strouhal - baseline.metrics.strouhal,
      ),
    };
  });
}

function renderFit(fit: any): string {
  if (fit === null) return "not-monotone";
  return `p=${fit.apparentOrder.toFixed(3)}, ext=${fit.extrapolatedValue.toFixed(5)}, corr=${(100 * fit.fineCorrectionRelative).toFixed(1)}%`;
}

function renderMarkdown(report: any): string {
  const lines = [
    "# A8 双 mask 三网格括号结果",
    "",
    `- 生成时间：${report.createdAt}`,
    `- profile：\`${report.profile}\``,
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
  lines.push(
    "",
    "## 网格族诊断",
    "",
  );
  for (const family of report.familySummaries) {
    lines.push(
      `- mask half ${family.maskHalfThickness.toFixed(2)}：16→20 最大载荷变化 ${(100 * family.maximumMiddleToFineLoadChange).toFixed(2)}%；drag ${renderFit(family.fits.meanDrag)}；lift RMS ${renderFit(family.fits.liftRms)}；St ${renderFit(family.fits.strouhal)}。`,
    );
  }
  lines.push(
    "",
    "## 门状态",
    "",
    `- 数值稳定：${report.gates.numericalStabilityPassed ? "PASS" : "FAIL"}`,
    `- 全算例成熟：${report.gates.allCasesMature ? "PASS" : "FAIL/NOT-APPLICABLE"}`,
    `- 已提交参考复现：${report.gates.referencesReproduced ? "PASS" : "FAIL/NOT-APPLICABLE"}`,
    `- 16→20 双族载荷变化门：${report.gates.fineChangesPassed ? "PASS" : "FAIL/NOT-APPLICABLE"}`,
    `- N_D=20 跨 mask 载荷差门：${report.gates.fineCrossFamilyPassed ? "PASS" : "FAIL/NOT-APPLICABLE"}`,
    `- 任一文献全门命中：${report.gates.targetHitCaseIds.length > 0 ? report.gates.targetHitCaseIds.join(", ") : "NO"}`,
    "",
    "## 结论边界",
    "",
    "本结果只比较两个预先保留的弥散 mask 族在三个低分辨率网格上的趋势。三点幂律拟合只作形式诊断，不是 GCI；N_D=20 仍远低于开放复现来源的局部 N_D=50，也没有 Mach、域、边界或格点相位联合矩阵。不得据此选择参数拟合文献，也不得解锁规定横移或 weak-FSI。",
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
const definitions = gridMaskDefinitions(cli.profile);
const cases: FixedCylinderCaseResult[] = [];
for (const definition of definitions) {
  process.stdout.write(`running ${definition.id}\n`);
  const interval = Math.max(
    1,
    Math.floor(
      definition.fixedConvectiveDuration
        * definition.diameterCells
        / definition.latticeVelocity
        / 10,
    ),
  );
  cases.push(runFixedCylinderCase(definition, (completed, total) => {
    if (completed % interval === 0 || completed === total) {
      progress(definition.id, completed, total);
    }
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
const closestCase = [...cases].sort((first, second) => (
  first.literatureErrorScore - second.literatureErrorScore
))[0];
if (closestCase === undefined) throw new Error("grid-mask matrix produced no cases");

let comparisons: ReturnType<typeof referenceComparisons> = [];
let familySummaries: ReturnType<typeof familySummary>[] = [];
let crossFamilies: ReturnType<typeof crossFamilySummary> = [];
if (cli.profile === "research") {
  const references = await loadReferences(cli);
  comparisons = referenceComparisons(cases, references);
  familySummaries = GRID_MASK_HALF_THICKNESSES.map((mask) => familySummary(cases, mask));
  crossFamilies = crossFamilySummary(cases);
}
const referencesReproduced = comparisons.length > 0
  && comparisons.every((item) => item.passed);
const fineChangesPassed = familySummaries.length > 0
  && familySummaries.every((item) => (
    item.maximumMiddleToFineLoadChange <= GRID_MASK_FINE_CHANGE_TOLERANCE
  ));
const fineCrossFamily = crossFamilies.find((item) => item.diameterCells === 20);
const fineCrossFamilyPassed = fineCrossFamily !== undefined
  && fineCrossFamily.maximumRelativeLoadDifference <= GRID_MASK_CROSS_FAMILY_TOLERANCE;

let decision: { code: string; interpretation: string };
if (!numericalStabilityPassed) {
  decision = {
    code: "STOP-A8G-NUMERICAL-STABILITY",
    interpretation: "至少一个双 mask 网格算例超过密度偏差或 Mach 硬门。",
  };
} else if (cli.profile === "smoke") {
  decision = {
    code: "PASS-A8G-SMOKE-QUANTITATIVE-MATRIX-NOT-RUN",
    interpretation: "两个 mask 族均可运行；短窗和 N_D=8 不作定量裁决。",
  };
} else if (!allCasesMature) {
  decision = {
    code: "NO-GO-A8G-WAKE-NOT-MATURE",
    interpretation: "至少一个双 mask 网格算例未通过统计窗成熟门。",
  };
} else if (!referencesReproduced) {
  decision = {
    code: "STOP-A8G-REFERENCE-NONREPRODUCIBLE",
    interpretation: "共享固定圆柱运行核心未能复现已提交参考，禁止解释网格趋势。",
  };
} else if (targetHitCaseIds.length > 0) {
  decision = {
    code: "INCONCLUSIVE-A8G-TARGET-HIT-NOT-QUALIFIED",
    interpretation: "至少一个低分辨率单点命中文献全门，但仍缺联合网格–Mach–域收敛，不能验收。",
  };
} else if (!fineChangesPassed || !fineCrossFamilyPassed) {
  decision = {
    code: "NO-GO-A8G-GRID-MASK-NOT-SETTLED",
    interpretation: "没有算例命中文献全门，且 16→20 网格变化或 N_D=20 跨 mask 差仍超过 5%。",
  };
} else {
  decision = {
    code: "NO-GO-A8G-FIXED-REFERENCE-MISMATCH-SOURCE-RESOLUTION-NOT-RUN",
    interpretation: "双 mask 低分辨率括号已收窄，但最细网格仍未命中文献全门且未达到来源局部分辨率。",
  };
}

const report = {
  format: "VP-CFD2D-A8-GRID-MASK-BRACKET-v1",
  createdAt: new Date().toISOString(),
  profile: cli.profile,
  purpose: "paired diffuse-mask grid bracket after mask-dominant fixed-cylinder sensitivity",
  definitions,
  thresholds: {
    maximumDensityDeviation: 0.08,
    maximumObservedMach: 0.30,
    meanDragHalfWindowDrift: 0.05,
    liftRmsHalfWindowDrift: 0.10,
    referenceReproductionRelativeTolerance: GRID_MASK_REFERENCE_REPRODUCTION_TOLERANCE,
    maximumMiddleToFineRelativeLoadChange: GRID_MASK_FINE_CHANGE_TOLERANCE,
    maximumFineCrossFamilyRelativeLoadDifference: GRID_MASK_CROSS_FAMILY_TOLERANCE,
    fixedLiterature: FIXED_TARGET,
  },
  referencePaths: cli.profile === "research" ? {
    public: cli.publicReferencePath,
    sensitivity: cli.sensitivityReferencePath,
  } : null,
  referenceComparisons: comparisons,
  familySummaries,
  crossFamilySummaries: crossFamilies,
  gates: {
    numericalStabilityPassed,
    allCasesMature: cli.profile === "research" && allCasesMature,
    referencesReproduced: cli.profile === "research" && referencesReproduced,
    fineChangesPassed: cli.profile === "research" && fineChangesPassed,
    fineCrossFamilyPassed: cli.profile === "research" && fineCrossFamilyPassed,
    targetHitCaseIds,
    sourceFineResolutionMatched: false,
    machMatrixRun: false,
    domainSensitivityRun: false,
    gridPhaseJointMatrixRun: false,
    gciRun: false,
    prescribedMotionLongRun: false,
  },
  closestCaseId: closestCase.definition.id,
  decision,
  explicitNonClaims: [
    "three-point power fits are diagnostics, not GCI",
    "not source-level near-wall resolution",
    "not a joint grid-Mach-domain-mask convergence study",
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
