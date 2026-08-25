import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED,
  type LbmBodyKinematics,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm";
import {
  DOMAIN_LENGTH_DIAMETERS,
  DOMAIN_WIDTH_DIAMETERS,
  FIXED_TARGET,
  REYNOLDS,
  UPSTREAM_DIAMETERS,
} from "../src/benchmark-contract.ts";
import {
  dominantStrouhal,
  summarizeCoefficients,
  type CoefficientSample,
  type CoefficientSummary,
} from "../src/benchmark-metrics.ts";
import {
  BASELINE_PHASE_OFFSET_Y,
  BASELINE_REPRODUCTION_TOLERANCE,
  DOMINANCE_RATIO,
  SIGNIFICANT_LOAD_SENSITIVITY,
  diagnoseSensitivity,
  literatureErrorScore,
  maximumAbsoluteStrouhalShift,
  maximumRelativeLoadDeviation,
  metricsFromSummary,
  relativeDifference,
  variantsForProfile,
  type FixedSensitivityVariant,
  type SensitivityGroup,
  type SensitivityMetrics,
} from "../src/fixed-sensitivity-contract.ts";

interface CliOptions {
  profile: "smoke" | "research";
  outputPath: string;
  markdownPath: string;
  baselineReferencePath: string;
}

interface ProfileSettings {
  diameterCells: number;
  latticeVelocity: number;
  fixedConvectiveDuration: number;
  discardConvectiveTime: number;
}

interface FieldSnapshot {
  fictitiousMomentumX: number;
  fictitiousMomentumY: number;
  minimumDensity: number;
  maximumDensity: number;
  maximumSpeed: number;
}

interface RunExtrema {
  minimumDensity: number;
  maximumDensity: number;
  maximumSpeed: number;
  maximumMach: number;
  maximumDensityDeviation: number;
}

interface LiteratureComparison {
  meanDragError: number;
  liftRmsError: number;
  strouhalError: number;
  meanDragPassed: boolean;
  liftRmsPassed: boolean;
  strouhalPassed: boolean;
  passed: boolean;
}

interface SensitivityCaseResult {
  variant: FixedSensitivityVariant;
  numericalIdentity: {
    diameterCells: number;
    nx: number;
    ny: number;
    latticeVelocity: number;
    nominalLatticeMach: number;
    relaxationTime: number;
    penalizationTimeSteps: number;
    etaHat: number;
    maskHalfThickness: number;
  };
  body: LbmBodyKinematics;
  window: {
    fixedConvectiveDuration: number;
    discardConvectiveTime: number;
    samples: number;
  };
  metrics: CoefficientSummary & {
    strouhal: number;
    spectralLiftAmplitude: number;
  };
  firstHalf: CoefficientSummary;
  secondHalf: CoefficientSummary;
  maturity: {
    meanDragHalfDrift: number;
    liftRmsHalfDrift: number;
    passed: boolean;
  };
  literature: LiteratureComparison;
  literatureErrorScore: number;
  extrema: RunExtrema;
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
  const defaultStem = `../90_候选工作区/current/A8_公开规定横移圆柱基准/验证与复现/artifacts/a8-fixed-sensitivity-${profileText}`;
  const defaultReference = "../90_候选工作区/current/A8_公开规定横移圆柱基准/验证与复现/artifacts/a8-public-benchmark-screening.json";
  return {
    profile: profileText,
    outputPath: resolve(parseOption("output") ?? `${defaultStem}.json`),
    markdownPath: resolve(parseOption("markdown") ?? `${defaultStem}.md`),
    baselineReferencePath: resolve(parseOption("baseline-reference") ?? defaultReference),
  };
}

function settingsFor(profile: CliOptions["profile"]): ProfileSettings {
  if (profile === "smoke") {
    return {
      diameterCells: 8,
      latticeVelocity: 0.05,
      fixedConvectiveDuration: 12,
      discardConvectiveTime: 6,
    };
  }
  return {
    diameterCells: 16,
    latticeVelocity: 0.05,
    fixedConvectiveDuration: 80,
    discardConvectiveTime: 40,
  };
}

function createSolver(
  variant: FixedSensitivityVariant,
  settings: ProfileSettings,
): D2Q9MrtBrinkmanSolver {
  const relaxationTime = 0.5
    + 3 * settings.latticeVelocity * settings.diameterCells / REYNOLDS;
  const penalizationTimeSteps = variant.etaHat
    * settings.diameterCells
    / settings.latticeVelocity;
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: DOMAIN_LENGTH_DIAMETERS * settings.diameterCells,
    ny: DOMAIN_WIDTH_DIAMETERS * settings.diameterCells,
    relaxationTime,
    penalizationTimeSteps,
    outerBoundary: "open-periodic-crossflow",
    maskHalfThickness: variant.maskHalfThickness,
  });
  solver.initializeUniform(settings.latticeVelocity, 0);
  return solver;
}

function fixedBody(
  solver: D2Q9MrtBrinkmanSolver,
  settings: ProfileSettings,
  variant: FixedSensitivityVariant,
): LbmBodyKinematics {
  return {
    centerX: UPSTREAM_DIAMETERS * settings.diameterCells + variant.phaseOffsetX,
    centerY: 0.5 * (solver.ny - 1)
      + BASELINE_PHASE_OFFSET_Y
      + variant.phaseOffsetY,
    radius: 0.5 * settings.diameterCells,
    velocityX: 0,
    velocityY: 0,
  };
}

function captureField(
  solver: D2Q9MrtBrinkmanSolver,
  body: LbmBodyKinematics,
): FieldSnapshot {
  const fields = solver.macroscopicCopies(body);
  let fictitiousMomentumX = 0;
  let fictitiousMomentumY = 0;
  let minimumDensity = Number.POSITIVE_INFINITY;
  let maximumDensity = Number.NEGATIVE_INFINITY;
  let maximumSpeed = 0;
  for (let cell = 0; cell < fields.rho.length; cell += 1) {
    const density = fields.rho[cell] ?? Number.NaN;
    const velocityX = fields.ux[cell] ?? Number.NaN;
    const velocityY = fields.uy[cell] ?? Number.NaN;
    const mask = fields.mask[cell] ?? Number.NaN;
    if (!(density > 0) || !Number.isFinite(density)
      || !Number.isFinite(velocityX) || !Number.isFinite(velocityY)
      || !Number.isFinite(mask) || mask < -1e-12 || mask > 1 + 1e-12) {
      throw new RangeError(`invalid macroscopic field at cell ${cell}`);
    }
    fictitiousMomentumX += mask * density * velocityX;
    fictitiousMomentumY += mask * density * velocityY;
    minimumDensity = Math.min(minimumDensity, density);
    maximumDensity = Math.max(maximumDensity, density);
    maximumSpeed = Math.max(maximumSpeed, Math.hypot(velocityX, velocityY));
  }
  return {
    fictitiousMomentumX,
    fictitiousMomentumY,
    minimumDensity,
    maximumDensity,
    maximumSpeed,
  };
}

function includeExtrema(extrema: RunExtrema, snapshot: FieldSnapshot): void {
  extrema.minimumDensity = Math.min(extrema.minimumDensity, snapshot.minimumDensity);
  extrema.maximumDensity = Math.max(extrema.maximumDensity, snapshot.maximumDensity);
  extrema.maximumSpeed = Math.max(extrema.maximumSpeed, snapshot.maximumSpeed);
  extrema.maximumMach = extrema.maximumSpeed / LATTICE_SOUND_SPEED;
  extrema.maximumDensityDeviation = Math.max(
    Math.abs(extrema.minimumDensity - 1),
    Math.abs(extrema.maximumDensity - 1),
  );
}

function coefficientSample(
  rawReactionX: number,
  rawReactionY: number,
  before: FieldSnapshot,
  after: FieldSnapshot,
  settings: ProfileSettings,
): CoefficientSample {
  const correctedX = rawReactionX
    + after.fictitiousMomentumX - before.fictitiousMomentumX;
  const correctedY = rawReactionY
    + after.fictitiousMomentumY - before.fictitiousMomentumY;
  const dynamicLineForce = 0.5
    * settings.latticeVelocity ** 2
    * settings.diameterCells;
  return {
    drag: correctedX / dynamicLineForce,
    lift: correctedY / dynamicLineForce,
  };
}

function compareLiterature(
  metrics: SensitivityCaseResult["metrics"],
): LiteratureComparison {
  const meanDragError = Math.abs(metrics.meanDrag - FIXED_TARGET.meanDrag);
  const liftRmsError = Math.abs(metrics.liftRms - FIXED_TARGET.liftRms);
  const strouhalError = Math.abs(metrics.strouhal - FIXED_TARGET.strouhal);
  const meanDragPassed = meanDragError <= FIXED_TARGET.tolerance.meanDrag;
  const liftRmsPassed = liftRmsError <= FIXED_TARGET.tolerance.liftRms;
  const strouhalPassed = strouhalError <= FIXED_TARGET.tolerance.strouhal;
  return {
    meanDragError,
    liftRmsError,
    strouhalError,
    meanDragPassed,
    liftRmsPassed,
    strouhalPassed,
    passed: meanDragPassed && liftRmsPassed && strouhalPassed,
  };
}

function progress(label: string, completed: number, total: number): void {
  const interval = Math.max(1, Math.floor(total / 10));
  if (completed % interval === 0 || completed === total) {
    process.stdout.write(`${label}: ${(100 * completed / total).toFixed(0)}%\n`);
  }
}

function runCase(
  variant: FixedSensitivityVariant,
  settings: ProfileSettings,
): SensitivityCaseResult {
  const solver = createSolver(variant, settings);
  const body = fixedBody(solver, settings, variant);
  const totalSteps = Math.round(
    settings.fixedConvectiveDuration
      * settings.diameterCells
      / settings.latticeVelocity,
  );
  const discardSteps = Math.round(
    settings.discardConvectiveTime
      * settings.diameterCells
      / settings.latticeVelocity,
  );
  let before = captureField(solver, body);
  const extrema: RunExtrema = {
    minimumDensity: Number.POSITIVE_INFINITY,
    maximumDensity: Number.NEGATIVE_INFINITY,
    maximumSpeed: 0,
    maximumMach: 0,
    maximumDensityDeviation: 0,
  };
  includeExtrema(extrema, before);
  const samples: CoefficientSample[] = [];
  for (let step = 0; step < totalSteps; step += 1) {
    const exchange = solver.step(body, settings.latticeVelocity);
    const after = captureField(solver, body);
    includeExtrema(extrema, after);
    if (step + 1 > discardSteps) {
      samples.push(coefficientSample(
        exchange.rawReactionImpulseX,
        exchange.rawReactionImpulseY,
        before,
        after,
        settings,
      ));
    }
    before = after;
    progress(variant.id, step + 1, totalSteps);
  }
  const coefficientMetrics = summarizeCoefficients(samples);
  const spectral = dominantStrouhal(
    samples.map((sample) => sample.lift),
    settings.latticeVelocity / settings.diameterCells,
  );
  const metrics = {
    ...coefficientMetrics,
    strouhal: spectral.strouhal,
    spectralLiftAmplitude: spectral.normalizedAmplitude,
  };
  const split = Math.floor(samples.length / 2);
  const firstHalf = summarizeCoefficients(samples.slice(0, split));
  const secondHalf = summarizeCoefficients(samples.slice(split));
  const maturity = {
    meanDragHalfDrift: relativeDifference(firstHalf.meanDrag, secondHalf.meanDrag),
    liftRmsHalfDrift: relativeDifference(firstHalf.liftRms, secondHalf.liftRms),
    passed: false,
  };
  maturity.passed = metrics.liftRms > 1e-3
    && maturity.meanDragHalfDrift <= 0.05
    && maturity.liftRmsHalfDrift <= 0.10;
  const literature = compareLiterature(metrics);
  return {
    variant,
    numericalIdentity: {
      diameterCells: settings.diameterCells,
      nx: solver.nx,
      ny: solver.ny,
      latticeVelocity: settings.latticeVelocity,
      nominalLatticeMach: settings.latticeVelocity / LATTICE_SOUND_SPEED,
      relaxationTime: solver.relaxationTime,
      penalizationTimeSteps: solver.penalizationTimeSteps,
      etaHat: variant.etaHat,
      maskHalfThickness: variant.maskHalfThickness,
    },
    body,
    window: {
      fixedConvectiveDuration: settings.fixedConvectiveDuration,
      discardConvectiveTime: settings.discardConvectiveTime,
      samples: samples.length,
    },
    metrics,
    firstHalf,
    secondHalf,
    maturity,
    literature,
    literatureErrorScore: literatureErrorScore(
      literature,
      FIXED_TARGET.tolerance,
    ),
    extrema,
  };
}

async function loadBaselineReference(path: string): Promise<SensitivityMetrics> {
  const parsed = JSON.parse(await readFile(path, "utf8"));
  const candidate = parsed?.cases?.find?.(
    (item: any) => item?.numericalIdentity?.diameterCells === 16,
  );
  const metrics = candidate?.fixed?.metrics;
  if (!Number.isFinite(metrics?.meanDrag)
    || !Number.isFinite(metrics?.liftRms)
    || !Number.isFinite(metrics?.strouhal)) {
    throw new Error("baseline reference does not contain the N_D=16 fixed metrics");
  }
  return {
    meanDrag: metrics.meanDrag,
    liftRms: metrics.liftRms,
    strouhal: metrics.strouhal,
  };
}

function groupSummary(
  cases: readonly SensitivityCaseResult[],
  baseline: SensitivityMetrics,
  group: Exclude<SensitivityGroup, "baseline">,
) {
  const groupCases = cases.filter((item) => item.variant.group === group);
  const metrics = groupCases.map((item) => metricsFromSummary(item.metrics));
  return {
    group,
    caseIds: groupCases.map((item) => item.variant.id),
    maximumRelativeLoadDeviation: maximumRelativeLoadDeviation(baseline, metrics),
    maximumAbsoluteStrouhalShift: maximumAbsoluteStrouhalShift(baseline, metrics),
  };
}

function renderMarkdown(report: any): string {
  const lines = [
    "# A8 固定圆柱离散敏感性结果",
    "",
    `- 生成时间：${report.createdAt}`,
    `- profile：\`${report.profile}\``,
    `- 总判定：**${report.decision.code}**`,
    `- 结论：${report.decision.interpretation}`,
    "",
    "## 算例",
    "",
    "| variant | group | dx | dy | mask half | eta hat | mean Cd | CL rms | St | mature | literature | score |",
    "|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|---:|",
  ];
  for (const item of report.cases) {
    lines.push(
      `| ${item.variant.id} | ${item.variant.group} | ${item.variant.phaseOffsetX.toFixed(2)} | ${item.variant.phaseOffsetY.toFixed(2)} | ${item.variant.maskHalfThickness.toFixed(2)} | ${item.variant.etaHat.toExponential(4)} | ${item.metrics.meanDrag.toFixed(6)} | ${item.metrics.liftRms.toFixed(6)} | ${item.metrics.strouhal.toFixed(5)} | ${item.maturity.passed ? "PASS" : "FAIL"} | ${item.literature.passed ? "PASS" : "FAIL"} | ${item.literatureErrorScore.toFixed(3)} |`,
    );
  }
  lines.push(
    "",
    "## 因素幅度",
    "",
    "| group | max relative load deviation | max absolute St shift | cases |",
    "|---|---:|---:|---|",
  );
  for (const item of report.groupSummaries) {
    lines.push(
      `| ${item.group} | ${item.maximumRelativeLoadDeviation.toExponential(4)} | ${item.maximumAbsoluteStrouhalShift.toExponential(4)} | ${item.caseIds.join(", ")} |`,
    );
  }
  lines.push(
    "",
    "## 门状态",
    "",
    `- 数值稳定：${report.gates.numericalStabilityPassed ? "PASS" : "FAIL"}`,
    `- 全算例成熟：${report.gates.allCasesMature ? "PASS" : "FAIL/NOT-APPLICABLE"}`,
    `- 原基线复现：${report.gates.baselineReproduced ? "PASS" : "FAIL/NOT-APPLICABLE"}`,
    `- 任一单点进入全部文献容差：${report.gates.targetHitCaseIds.length > 0 ? report.gates.targetHitCaseIds.join(", ") : "NO"}`,
    `- 因素诊断：${report.diagnosedSensitivity}`,
    `- 最低文献误差分数算例：${report.closestCaseId}`,
    "",
    "## 结论边界",
    "",
    "这是固定圆柱、单一网格与单一 Mach 下的一次一因素离散敏感性诊断。它不能把某个参数点解释为校准结果；即使单点进入文献容差，也必须在网格、Mach、域和参数联合收敛中独立复现，才能解除 A8 闭锁。规定横移长时分支、weak-FSI、三维装置和实验验证均未执行。",
  );
  return `${lines.join("\n").trimEnd()}\n`;
}

const cli = parseCli();
const settings = settingsFor(cli.profile);
const variants = variantsForProfile(cli.profile);
const cases: SensitivityCaseResult[] = [];
for (const variant of variants) {
  process.stdout.write(`running ${variant.id}\n`);
  cases.push(runCase(variant, settings));
}

const baselineCase = cases.find((item) => item.variant.id === "baseline");
if (baselineCase === undefined) throw new Error("sensitivity matrix has no baseline case");
const baselineMetrics = metricsFromSummary(baselineCase.metrics);
const groups = [
  "grid-phase",
  "mask-half-thickness",
  "penalization",
] as const;
const groupSummaries = groups.map((group) => groupSummary(cases, baselineMetrics, group));
const amplitudes = Object.fromEntries(groupSummaries.map((item) => [
  item.group,
  item.maximumRelativeLoadDeviation,
])) as Record<(typeof groups)[number], number>;
const diagnosedSensitivity = diagnoseSensitivity(amplitudes);
const numericalStabilityPassed = cases.every((item) => (
  item.extrema.maximumDensityDeviation <= 0.08
    && item.extrema.maximumMach <= 0.30
));
const allCasesMature = cases.every((item) => item.maturity.passed);
const targetHitCaseIds = cases
  .filter((item) => item.literature.passed)
  .map((item) => item.variant.id);
const closestCase = [...cases].sort((first, second) => (
  first.literatureErrorScore - second.literatureErrorScore
))[0];
if (closestCase === undefined) throw new Error("sensitivity matrix produced no cases");

let baselineReference: SensitivityMetrics | null = null;
let baselineReproduction: {
  relativeDifferences: SensitivityMetrics;
  maximumRelativeDifference: number;
  passed: boolean;
} | null = null;
if (cli.profile === "research") {
  baselineReference = await loadBaselineReference(cli.baselineReferencePath);
  const relativeDifferences = {
    meanDrag: relativeDifference(baselineMetrics.meanDrag, baselineReference.meanDrag),
    liftRms: relativeDifference(baselineMetrics.liftRms, baselineReference.liftRms),
    strouhal: relativeDifference(baselineMetrics.strouhal, baselineReference.strouhal),
  };
  const maximumRelativeDifference = Math.max(...Object.values(relativeDifferences));
  baselineReproduction = {
    relativeDifferences,
    maximumRelativeDifference,
    passed: maximumRelativeDifference <= BASELINE_REPRODUCTION_TOLERANCE,
  };
}
const baselineReproduced = baselineReproduction?.passed ?? false;

let decision: { code: string; interpretation: string };
if (!numericalStabilityPassed) {
  decision = {
    code: "STOP-A8S-NUMERICAL-STABILITY",
    interpretation: "至少一个敏感性算例超过密度偏差或运行中 Mach 硬门，禁止比较载荷。",
  };
} else if (cli.profile === "smoke") {
  decision = {
    code: "PASS-A8S-SMOKE-QUANTITATIVE-MATRIX-NOT-RUN",
    interpretation: "格点相位、mask 半厚度和惩罚尺度路径均可运行；短窗结果不用于定量裁决。",
  };
} else if (!allCasesMature) {
  decision = {
    code: "NO-GO-A8S-WAKE-NOT-MATURE",
    interpretation: "至少一个完整敏感性算例未通过前后半统计窗成熟门，因素比较无效。",
  };
} else if (!baselineReproduced) {
  decision = {
    code: "STOP-A8S-BASELINE-NONREPRODUCIBLE",
    interpretation: "新运行器不能在冻结容差内复现已提交的 N_D=16 基线，禁止解释敏感性。",
  };
} else if (targetHitCaseIds.length > 0) {
  decision = {
    code: "INCONCLUSIVE-A8S-SINGLE-FACTOR-HIT-NOT-QUALIFIED",
    interpretation: "至少一个单因素参数点进入固定圆柱文献容差，但这可能是误差抵消；在联合收敛前不得验收。",
  };
} else {
  const codeByDiagnosis = {
    "grid-phase": "NO-GO-A8S-GRID-PHASE-DOMINANT-STILL-REFERENCE-MISMATCH",
    "mask-half-thickness": "NO-GO-A8S-MASK-DOMINANT-STILL-REFERENCE-MISMATCH",
    penalization: "NO-GO-A8S-PENALIZATION-DOMINANT-STILL-REFERENCE-MISMATCH",
    "multi-factor": "NO-GO-A8S-MULTI-FACTOR-SENSITIVITY-STILL-REFERENCE-MISMATCH",
    insufficient: "NO-GO-A8S-SENSITIVITY-INSUFFICIENT-STILL-REFERENCE-MISMATCH",
  } as const;
  decision = {
    code: codeByDiagnosis[diagnosedSensitivity],
    interpretation: `没有单因素算例进入全部文献容差；当前诊断为 ${diagnosedSensitivity}，A8 固定基线继续闭锁。`,
  };
}

const report = {
  format: "VP-CFD2D-A8-FIXED-SENSITIVITY-v1",
  createdAt: new Date().toISOString(),
  profile: cli.profile,
  purpose: "one-factor-at-a-time fixed-cylinder discretization sensitivity before prescribed-motion qualification",
  settings,
  variants,
  thresholds: {
    maximumDensityDeviation: 0.08,
    maximumObservedMach: 0.30,
    meanDragHalfWindowDrift: 0.05,
    liftRmsHalfWindowDrift: 0.10,
    baselineReproductionRelativeTolerance: BASELINE_REPRODUCTION_TOLERANCE,
    significantRelativeLoadSensitivity: SIGNIFICANT_LOAD_SENSITIVITY,
    dominanceRatio: DOMINANCE_RATIO,
    fixedLiterature: FIXED_TARGET,
  },
  baselineReferencePath: cli.profile === "research" ? cli.baselineReferencePath : null,
  baselineReference,
  baselineReproduction,
  groupSummaries,
  diagnosedSensitivity,
  gates: {
    numericalStabilityPassed,
    allCasesMature: cli.profile === "research" && allCasesMature,
    baselineReproduced: cli.profile === "research" && baselineReproduced,
    targetHitCaseIds,
    prescribedMotionLongRun: false,
    machMatrixRun: false,
    domainSensitivityRun: false,
    gridConvergenceRun: false,
    gciRun: false,
  },
  closestCaseId: closestCase.variant.id,
  decision,
  explicitNonClaims: [
    "not a parameter calibration or literature fit",
    "not grid convergence or GCI",
    "not a Mach or domain sensitivity matrix",
    "not prescribed-motion load qualification",
    "not weak-FSI, apparatus, three-dimensional, free-surface, or experimental validation",
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
