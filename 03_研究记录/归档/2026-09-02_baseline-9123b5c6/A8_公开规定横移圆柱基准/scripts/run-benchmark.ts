import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED,
  type LbmBodyKinematics,
  type LbmCheckpoint,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm";
import {
  AMPLITUDE_OVER_DIAMETER,
  BENCHMARK_ID,
  DOMAIN_LENGTH_DIAMETERS,
  DOMAIN_WIDTH_DIAMETERS,
  ETA_HAT,
  FIXED_TARGET,
  FORCED_TARGETS,
  NATURAL_STROUHAL,
  REYNOLDS,
  UPSTREAM_DIAMETERS,
  compareForcedMetrics,
  prescribedMotion,
  type ForcedMetrics,
} from "../src/benchmark-contract.ts";
import {
  dominantStrouhal,
  relativeDifference,
  summarizeCoefficients,
  type CoefficientSample,
  type CoefficientSummary,
} from "../src/benchmark-metrics.ts";

interface CliOptions {
  profile: "smoke" | "screening";
  outputPath: string;
  markdownPath: string;
}

interface ProfileSettings {
  diameterCells: number[];
  latticeVelocity: number;
  fixedConvectiveDuration: number;
  fixedDiscardConvectiveTime: number;
  forcedConvectiveDuration: number;
  forcedDiscardConvectiveTime: number;
  frequencyRatios: number[];
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

interface FixedCaseResult {
  checkpoint: LbmCheckpoint;
  metrics: CoefficientSummary & { strouhal: number; spectralLiftAmplitude: number };
  firstHalf: CoefficientSummary;
  secondHalf: CoefficientSummary;
  maturity: {
    meanDragHalfDrift: number;
    liftRmsHalfDrift: number;
    passed: boolean;
  };
  literature: {
    meanDragError: number;
    liftRmsError: number;
    strouhalError: number;
    meanDragPassed: boolean;
    liftRmsPassed: boolean;
    strouhalPassed: boolean;
    passed: boolean;
  };
  extrema: RunExtrema;
}

interface ForcedCaseResult {
  frequencyRatio: number;
  excitationStrouhal: number;
  motion: {
    amplitudeOverDiameter: number;
    maximumVelocityOverFreestream: number;
  };
  metrics: CoefficientSummary;
  firstHalf: CoefficientSummary;
  secondHalf: CoefficientSummary;
  stationarity: {
    meanDragHalfDrift: number;
    dragFluctuationRmsHalfDrift: number;
    liftRmsHalfDrift: number;
  };
  literature: ReturnType<typeof compareForcedMetrics>;
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
  if (profileText !== "smoke" && profileText !== "screening") {
    throw new RangeError("--profile must be smoke or screening");
  }
  const defaultStem = `../90_候选工作区/current/A8_公开规定横移圆柱基准/验证与复现/artifacts/a8-public-benchmark-${profileText}`;
  return {
    profile: profileText,
    outputPath: resolve(parseOption("output") ?? `${defaultStem}.json`),
    markdownPath: resolve(parseOption("markdown") ?? `${defaultStem}.md`),
  };
}

function settingsFor(profile: CliOptions["profile"]): ProfileSettings {
  if (profile === "smoke") {
    return {
      diameterCells: [8],
      latticeVelocity: 0.05,
      fixedConvectiveDuration: 12,
      fixedDiscardConvectiveTime: 6,
      forcedConvectiveDuration: 12,
      forcedDiscardConvectiveTime: 6,
      frequencyRatios: [0.8],
    };
  }
  return {
    diameterCells: [8, 12, 16],
    latticeVelocity: 0.05,
    fixedConvectiveDuration: 80,
    fixedDiscardConvectiveTime: 40,
    forcedConvectiveDuration: 80,
    forcedDiscardConvectiveTime: 40,
    frequencyRatios: [0.8, 1.1],
  };
}

function createSolver(diameterCells: number, latticeVelocity: number): D2Q9MrtBrinkmanSolver {
  const relaxationTime = 0.5 + 3 * latticeVelocity * diameterCells / REYNOLDS;
  const penalizationTimeSteps = ETA_HAT * diameterCells / latticeVelocity;
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: DOMAIN_LENGTH_DIAMETERS * diameterCells,
    ny: DOMAIN_WIDTH_DIAMETERS * diameterCells,
    relaxationTime,
    penalizationTimeSteps,
    outerBoundary: "open-periodic-crossflow",
    maskHalfThickness: 0.75,
  });
  solver.initializeUniform(latticeVelocity, 0);
  return solver;
}

function fixedBody(solver: D2Q9MrtBrinkmanSolver, diameterCells: number): LbmBodyKinematics {
  return {
    centerX: UPSTREAM_DIAMETERS * diameterCells,
    centerY: 0.5 * (solver.ny - 1) + 0.17320508075688773,
    radius: 0.5 * diameterCells,
    velocityX: 0,
    velocityY: 0,
  };
}

function forcedBody(
  base: LbmBodyKinematics,
  latticeTime: number,
  diameterCells: number,
  latticeVelocity: number,
  frequencyRatio: number,
): LbmBodyKinematics {
  const motion = prescribedMotion(
    latticeTime,
    diameterCells,
    latticeVelocity,
    frequencyRatio,
  );
  return {
    ...base,
    centerY: base.centerY + motion.displacementCells,
    velocityY: motion.velocityLattice,
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

function emptyExtrema(): RunExtrema {
  return {
    minimumDensity: Number.POSITIVE_INFINITY,
    maximumDensity: Number.NEGATIVE_INFINITY,
    maximumSpeed: 0,
    maximumMach: 0,
    maximumDensityDeviation: 0,
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
  diameterCells: number,
  latticeVelocity: number,
): CoefficientSample {
  const correctedX = rawReactionX
    + after.fictitiousMomentumX - before.fictitiousMomentumX;
  const correctedY = rawReactionY
    + after.fictitiousMomentumY - before.fictitiousMomentumY;
  const dynamicLineForce = 0.5 * latticeVelocity ** 2 * diameterCells;
  return { drag: correctedX / dynamicLineForce, lift: correctedY / dynamicLineForce };
}

function splitSummary(samples: readonly CoefficientSample[]): {
  firstHalf: CoefficientSummary;
  secondHalf: CoefficientSummary;
} {
  const split = Math.floor(samples.length / 2);
  return {
    firstHalf: summarizeCoefficients(samples.slice(0, split)),
    secondHalf: summarizeCoefficients(samples.slice(split)),
  };
}

function progress(label: string, completed: number, total: number): void {
  const interval = Math.max(1, Math.floor(total / 10));
  if (completed % interval === 0 || completed === total) {
    process.stdout.write(`${label}: ${(100 * completed / total).toFixed(0)}%\n`);
  }
}

function runFixed(
  diameterCells: number,
  settings: ProfileSettings,
): FixedCaseResult {
  const solver = createSolver(diameterCells, settings.latticeVelocity);
  const body = fixedBody(solver, diameterCells);
  const totalSteps = Math.round(
    settings.fixedConvectiveDuration * diameterCells / settings.latticeVelocity,
  );
  const discardSteps = Math.round(
    settings.fixedDiscardConvectiveTime * diameterCells / settings.latticeVelocity,
  );
  let before = captureField(solver, body);
  const extrema = emptyExtrema();
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
        diameterCells,
        settings.latticeVelocity,
      ));
    }
    before = after;
    progress(`d${diameterCells.toString().padStart(2, "0")}-fixed`, step + 1, totalSteps);
  }
  const coefficientMetrics = summarizeCoefficients(samples);
  const spectral = dominantStrouhal(
    samples.map((item) => item.lift),
    settings.latticeVelocity / diameterCells,
  );
  const { firstHalf, secondHalf } = splitSummary(samples);
  const meanDragHalfDrift = relativeDifference(firstHalf.meanDrag, secondHalf.meanDrag);
  const liftRmsHalfDrift = relativeDifference(firstHalf.liftRms, secondHalf.liftRms);
  const meanDragError = Math.abs(coefficientMetrics.meanDrag - FIXED_TARGET.meanDrag);
  const liftRmsError = Math.abs(coefficientMetrics.liftRms - FIXED_TARGET.liftRms);
  const strouhalError = Math.abs(spectral.strouhal - FIXED_TARGET.strouhal);
  const literature = {
    meanDragError,
    liftRmsError,
    strouhalError,
    meanDragPassed: meanDragError <= FIXED_TARGET.tolerance.meanDrag,
    liftRmsPassed: liftRmsError <= FIXED_TARGET.tolerance.liftRms,
    strouhalPassed: strouhalError <= FIXED_TARGET.tolerance.strouhal,
    passed: false,
  };
  literature.passed = literature.meanDragPassed
    && literature.liftRmsPassed
    && literature.strouhalPassed;
  return {
    checkpoint: solver.checkpoint(),
    metrics: {
      ...coefficientMetrics,
      strouhal: spectral.strouhal,
      spectralLiftAmplitude: spectral.normalizedAmplitude,
    },
    firstHalf,
    secondHalf,
    maturity: {
      meanDragHalfDrift,
      liftRmsHalfDrift,
      passed: coefficientMetrics.liftRms > 1e-3
        && meanDragHalfDrift <= 0.05
        && liftRmsHalfDrift <= 0.10,
    },
    literature,
    extrema,
  };
}

function runForced(
  diameterCells: number,
  settings: ProfileSettings,
  fixedCheckpoint: LbmCheckpoint,
  frequencyRatio: number,
): ForcedCaseResult {
  const solver = createSolver(diameterCells, settings.latticeVelocity);
  solver.restore(fixedCheckpoint);
  const baseBody = fixedBody(solver, diameterCells);
  const totalSteps = Math.round(
    settings.forcedConvectiveDuration * diameterCells / settings.latticeVelocity,
  );
  const discardSteps = Math.round(
    settings.forcedDiscardConvectiveTime * diameterCells / settings.latticeVelocity,
  );
  let before = captureField(
    solver,
    forcedBody(baseBody, 0, diameterCells, settings.latticeVelocity, frequencyRatio),
  );
  const extrema = emptyExtrema();
  includeExtrema(extrema, before);
  const samples: CoefficientSample[] = [];
  for (let step = 0; step < totalSteps; step += 1) {
    const midpoint = step + 0.5;
    const endpoint = step + 1;
    const midpointBody = forcedBody(
      baseBody,
      midpoint,
      diameterCells,
      settings.latticeVelocity,
      frequencyRatio,
    );
    const endpointBody = forcedBody(
      baseBody,
      endpoint,
      diameterCells,
      settings.latticeVelocity,
      frequencyRatio,
    );
    const exchange = solver.step(midpointBody, settings.latticeVelocity);
    const after = captureField(solver, endpointBody);
    includeExtrema(extrema, after);
    if (step + 1 > discardSteps) {
      samples.push(coefficientSample(
        exchange.rawReactionImpulseX,
        exchange.rawReactionImpulseY,
        before,
        after,
        diameterCells,
        settings.latticeVelocity,
      ));
    }
    before = after;
    progress(
      `d${diameterCells.toString().padStart(2, "0")}-f${frequencyRatio.toFixed(1)}`,
      step + 1,
      totalSteps,
    );
  }
  const metrics = summarizeCoefficients(samples);
  const { firstHalf, secondHalf } = splitSummary(samples);
  const actual: ForcedMetrics = {
    meanDrag: metrics.meanDrag,
    dragRms: metrics.dragFluctuationRms,
    liftRms: metrics.liftRms,
  };
  return {
    frequencyRatio,
    excitationStrouhal: frequencyRatio * NATURAL_STROUHAL,
    motion: {
      amplitudeOverDiameter: AMPLITUDE_OVER_DIAMETER,
      maximumVelocityOverFreestream: 2 * Math.PI
        * frequencyRatio
        * NATURAL_STROUHAL
        * AMPLITUDE_OVER_DIAMETER,
    },
    metrics,
    firstHalf,
    secondHalf,
    stationarity: {
      meanDragHalfDrift: relativeDifference(firstHalf.meanDrag, secondHalf.meanDrag),
      dragFluctuationRmsHalfDrift: relativeDifference(
        firstHalf.dragFluctuationRms,
        secondHalf.dragFluctuationRms,
      ),
      liftRmsHalfDrift: relativeDifference(firstHalf.liftRms, secondHalf.liftRms),
    },
    literature: compareForcedMetrics(actual, FORCED_TARGETS.find(
      (item) => item.frequencyRatio === frequencyRatio,
    ) ?? (() => { throw new RangeError(`missing target for ${frequencyRatio}`); })()),
    extrema,
  };
}

function fixedGridScreeningPassed(cases: readonly any[]): boolean {
  if (cases.length < 3) return false;
  const middle = cases[cases.length - 2];
  const finest = cases[cases.length - 1];
  const differences = [
    relativeDifference(middle.fixed.metrics.meanDrag, finest.fixed.metrics.meanDrag),
    relativeDifference(middle.fixed.metrics.liftRms, finest.fixed.metrics.liftRms),
    relativeDifference(middle.fixed.metrics.strouhal, finest.fixed.metrics.strouhal),
  ];
  return differences.every((value) => value <= 0.10);
}

function screeningGridPassed(cases: readonly any[]): boolean {
  if (!fixedGridScreeningPassed(cases)) return false;
  if (cases.some((item) => item.forced.length === 0)) return false;
  const middle = cases[cases.length - 2];
  const finest = cases[cases.length - 1];
  const differences: number[] = [];
  for (let index = 0; index < finest.forced.length; index += 1) {
    const middleForced = middle.forced[index];
    const finestForced = finest.forced[index];
    differences.push(
      relativeDifference(middleForced.metrics.meanDrag, finestForced.metrics.meanDrag),
      relativeDifference(
        middleForced.metrics.dragFluctuationRms,
        finestForced.metrics.dragFluctuationRms,
      ),
      relativeDifference(middleForced.metrics.liftRms, finestForced.metrics.liftRms),
    );
  }
  return differences.every((value) => value <= 0.10);
}

function renderMarkdown(report: any): string {
  const lines = [
    "# A8 公开规定横移圆柱基准结果",
    "",
    `- 生成时间：${report.createdAt}`,
    `- profile：\`${report.profile}\``,
    `- 基准 ID：\`${report.benchmarkId}\``,
    `- 总判定：**${report.decision.code}**`,
    `- 结论：${report.decision.interpretation}`,
    "",
    "## 固定圆柱",
    "",
    "| N_D | tau | eta | mean Cd | CL rms | St | 尾流成熟 | 文献门 |",
    "|---:|---:|---:|---:|---:|---:|---|---|",
  ];
  for (const item of report.cases) {
    lines.push(
      `| ${item.numericalIdentity.diameterCells} | ${item.numericalIdentity.relaxationTime.toFixed(6)} | ${item.numericalIdentity.penalizationTimeSteps.toFixed(3)} | ${item.fixed.metrics.meanDrag.toFixed(6)} | ${item.fixed.metrics.liftRms.toFixed(6)} | ${item.fixed.metrics.strouhal.toFixed(5)} | ${item.fixed.maturity.passed ? "PASS" : "FAIL"} | ${item.fixed.literature.passed ? "PASS" : "FAIL"} |`,
    );
  }
  lines.push(
    "",
    "## 规定横移",
    "",
    "| N_D | fe/f0 | mean Cd | Cd fluct rms | CL rms | 文献门 | max Ma | max density deviation |",
    "|---:|---:|---:|---:|---:|---|---:|---:|",
  );
  let forcedRows = 0;
  for (const item of report.cases) {
    for (const forced of item.forced) {
      forcedRows += 1;
      lines.push(
        `| ${item.numericalIdentity.diameterCells} | ${forced.frequencyRatio.toFixed(1)} | ${forced.metrics.meanDrag.toFixed(6)} | ${forced.metrics.dragFluctuationRms.toFixed(6)} | ${forced.metrics.liftRms.toFixed(6)} | ${forced.literature.passed ? "PASS" : "FAIL"} | ${forced.extrema.maximumMach.toFixed(4)} | ${forced.extrema.maximumDensityDeviation.toExponential(3)} |`,
      );
    }
  }
  if (forcedRows === 0) {
    lines.push("", "固定圆柱前置门未通过，按失败闭锁未执行定量规定横移分支。");
  }
  lines.push(
    "",
    "## 结论边界",
    "",
    "该结果是二维、单位跨长、无自由表面的公开数值基准筛查。当前顶/底为周期边界，圆柱为弥散 Brinkman 边界，与来源的非反射外边界和贴体细网格不同。即使筛查通过，也不是 A-09 完整网格–Mach/GCI 验收，更不是三维装置或实验验证。",
    "",
  );
  return `${lines.join("\n").trimEnd()}\n`;
}

const cli = parseCli();
const settings = settingsFor(cli.profile);
const workingCases: any[] = [];
for (const diameterCells of settings.diameterCells) {
  process.stdout.write(`running N_D=${diameterCells}\n`);
  const fixed = runFixed(diameterCells, settings);
  const relaxationTime = 0.5
    + 3 * settings.latticeVelocity * diameterCells / REYNOLDS;
  workingCases.push({
    numericalIdentity: {
      diameterCells,
      nx: DOMAIN_LENGTH_DIAMETERS * diameterCells,
      ny: DOMAIN_WIDTH_DIAMETERS * diameterCells,
      latticeVelocity: settings.latticeVelocity,
      nominalLatticeMach: settings.latticeVelocity / LATTICE_SOUND_SPEED,
      relaxationTime,
      penalizationTimeSteps: ETA_HAT * diameterCells / settings.latticeVelocity,
      etaHat: ETA_HAT,
    },
    fixed,
    forced: [],
  });
}

const fixedFinest = workingCases[workingCases.length - 1]?.fixed;
const shouldRunForced = cli.profile === "smoke"
  || (fixedFinest?.maturity.passed === true && fixedFinest?.literature.passed === true);
if (shouldRunForced) {
  for (const item of workingCases) {
    item.forced = settings.frequencyRatios.map((frequencyRatio) => runForced(
      item.numericalIdentity.diameterCells,
      settings,
      item.fixed.checkpoint,
      frequencyRatio,
    ));
  }
}

const cases = workingCases.map((item) => ({
  numericalIdentity: item.numericalIdentity,
  fixed: { ...item.fixed, checkpoint: undefined },
  forced: item.forced,
}));

const allExtrema = cases.flatMap((item) => [
  item.fixed.extrema,
  ...item.forced.map((forced: ForcedCaseResult) => forced.extrema),
]);
const numericalStabilityPassed = allExtrema.every((item) => (
  item.maximumDensityDeviation <= 0.08 && item.maximumMach <= 0.30
));
const finest = cases[cases.length - 1];
const fixedMaturityPassed = finest.fixed.maturity.passed;
const fixedLiteraturePassed = finest.fixed.literature.passed;
const forcedMatrixRun = finest.forced.length === settings.frequencyRatios.length;
const forcedLiteraturePassed = forcedMatrixRun && finest.forced.every(
  (item: ForcedCaseResult) => item.literature.passed,
);
const fixedGridScreening = cli.profile === "screening"
  && fixedGridScreeningPassed(cases);
const gridScreeningPassed = cli.profile === "screening" && screeningGridPassed(cases);

let decision: { code: string; interpretation: string };
if (!numericalStabilityPassed) {
  decision = {
    code: "STOP-A8-NUMERICAL-STABILITY",
    interpretation: "密度偏差或运行中 Mach 超过预定稳定门，禁止对照文献载荷。",
  };
} else if (cli.profile === "smoke") {
  decision = {
    code: "PASS-A8-SMOKE-QUANTITATIVE-SCREENING-NOT-RUN",
    interpretation: "公开基准运动、成熟尾流分支和 A2 修正取力链可运行；smoke 时长不用于定量裁决。",
  };
} else if (!fixedMaturityPassed) {
  decision = {
    code: "NO-GO-A8-FIXED-WAKE-NOT-MATURE",
    interpretation: "最细网格的固定圆柱尾流前/后半窗仍不稳定，规定运动文献比较无效。",
  };
} else if (!fixedLiteraturePassed) {
  decision = {
    code: "NO-GO-A8-FIXED-REFERENCE-MISMATCH",
    interpretation: "最细网格的固定圆柱阻力、升力 RMS 或 Strouhal 未进入冻结文献容差，不允许验收规定运动载荷。",
  };
} else if (!forcedLiteraturePassed) {
  decision = {
    code: "NO-GO-A8-PRESCRIBED-LITERATURE-MISMATCH",
    interpretation: "最细网格在至少一个规定横移基准点上未进入预先冻结的文献容差。",
  };
} else if (!gridScreeningPassed) {
  decision = {
    code: "INCONCLUSIVE-A8-GRID-SCREENING",
    interpretation: "最细网格进入文献容差，但中/细网格变化仍超过 10%，A8/A9 不收口。",
  };
} else {
  decision = {
    code: "PASS-A8-LITERATURE-SCREENING-ONLY-A9-MACH-NOT-RUN",
    interpretation: "固定和两个规定横移点进入文献容差，且中/细网格变化不超过 10%；尚未完成 Mach、域、格点相位和 GCI 门。",
  };
}

const report = {
  format: "VP-CFD2D-A8-PUBLIC-OSCILLATING-CYLINDER-BENCHMARK-v1",
  createdAt: new Date().toISOString(),
  benchmarkId: BENCHMARK_ID,
  profile: cli.profile,
  sourceContract: {
    primary: {
      citation: "Guilmineau and Queutey, Journal of Fluids and Structures 16 (2002) 773-794",
      doi: "10.1006/jfls.2002.0449",
    },
    openReproduction: {
      citation: "Wang, Wu, Xu and Tan, Entropy 25 (2023) 432",
      doi: "10.3390/e25030432",
    },
    reynolds: REYNOLDS,
    naturalStrouhal: NATURAL_STROUHAL,
    amplitudeOverDiameter: AMPLITUDE_OVER_DIAMETER,
    frequencyRatios: settings.frequencyRatios,
    domainDiameters: [DOMAIN_LENGTH_DIAMETERS, DOMAIN_WIDTH_DIAMETERS],
    upstreamDiameters: UPSTREAM_DIAMETERS,
    sourceFineResolutionCellsPerDiameter: 50,
    sourceInitialization: "stable-fixed-cylinder-wake-before-forced-motion",
  },
  implementationDifferences: [
    "uniform Cartesian grid instead of body-fitted/overset near-wall refinement",
    "diffuse Brinkman cylinder instead of a sharp no-slip body-fitted surface",
    "periodic cross-flow boundary instead of non-reflecting top and bottom boundaries",
    "A2 corrected volume-penalty reaction instead of surface stress integration",
  ],
  settings,
  gates: {
    numericalStabilityPassed,
    fixedMaturityPassed,
    fixedLiteraturePassed,
    fixedGridScreeningPassed: fixedGridScreening,
    forcedMatrixRun,
    forcedLiteraturePassed,
    gridScreeningPassed,
    sourceFineResolutionMatched: Math.max(...settings.diameterCells) >= 50,
    machMatrixRun: false,
    domainSensitivityRun: false,
    gridPhaseSensitivityRun: false,
    gciRun: false,
  },
  thresholds: {
    maximumDensityDeviation: 0.08,
    maximumObservedMach: 0.30,
    fixedHalfWindowMeanDragDrift: 0.05,
    fixedHalfWindowLiftRmsDrift: 0.10,
    middleToFineMetricDifference: 0.10,
    fixedLiterature: FIXED_TARGET,
    forcedLiterature: FORCED_TARGETS,
  },
  decision,
  explicitNonClaims: [
    "not DFG 2D-2 because the geometry and boundary contract differ",
    "not complete A9 grid-Mach-domain-GCI qualification",
    "not a three-dimensional finite-span or free-surface validation",
    "not weak-FSI or apparatus prediction acceptance",
    "not experimental validation of the vortex-pendulum apparatus",
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
