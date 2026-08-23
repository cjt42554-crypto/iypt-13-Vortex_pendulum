import "./styles.css";
import {
  DEFAULT_CONFIG,
  validateConfig,
} from "./core/config";
import { SimulationRunner } from "./core/runner";
import type {
  BackendId,
  ExperimentalDataset,
  SimulationConfig,
  SimulationResult,
  WorkerResponse,
} from "./core/types";
import {
  VORTEX_PENDULUM_MANIFEST,
  VORTEX_PENDULUM_PARAMETERS,
} from "./problems/vortex-pendulum";
import {
  compareExperiment,
  downloadJson,
  downloadText,
  formatNumber,
  isSimulationConfig,
  parseExperimentalCsv,
  readJsonFile,
  resultToCsv,
} from "./ui/data";
import { ParameterForm, updateConfigAtPath } from "./ui/parameter-form";
import { VisualDashboard } from "./ui/visuals";

const app = document.querySelector<HTMLDivElement>("#app");
if (app === null) throw new Error("missing #app root");

app.innerHTML = `
  <header class="hero">
    <div>
      <p class="eyebrow">IYPT 2027 · Problem 13 · Research executable</p>
      <h1>${VORTEX_PENDULUM_MANIFEST.shortTitle}</h1>
      <p class="subtitle">前向理论数值后端与二维截面流体参考共用数据外壳；理论层和证据层彼此独立。</p>
    </div>
    <div class="identity">
      <span>模型</span><strong>VP-FWD-P0-SL1-v1</strong>
      <span>配置</span><strong>schema 3.0.0</strong>
    </div>
  </header>
  <main class="workspace">
    <aside class="control-panel">
      <section class="panel">
        <div class="panel-title"><h2>运行配置</h2><span id="config-state" class="badge">未检查</span></div>
        <label for="backend-select">计算后端</label>
        <select id="backend-select">
          <option value="forward">前向理论数值计算</option>
          <option value="highFidelity">二维截面流体参考（A1 原始载荷记账）</option>
        </select>
        <p class="config-hint">直接在下面展开分组并输入参数。单位、允许范围和后端适用性来自冻结的参数合同。</p>
        <div id="parameter-form" class="parameter-form" aria-label="可视化参数输入"></div>
        <div class="button-row">
          <button id="validate-button" type="button">检查参数</button>
          <button id="reset-button" type="button" class="secondary">恢复默认</button>
          <button id="export-config" type="button" class="secondary">导出配置</button>
          <label class="file-button secondary">导入 JSON<input id="config-file" type="file" accept="application/json,.json"></label>
        </div>
        <div id="validation-output" class="message-list" aria-live="polite"></div>
        <details class="advanced-config">
          <summary><span>高级：查看或编辑完整 JSON</span><span>可复现配置</span></summary>
          <label for="config-editor">完整 JSON</label>
          <textarea id="config-editor" spellcheck="false" aria-label="simulation configuration"></textarea>
        </details>
      </section>
      <section class="panel">
        <h2>运行控制</h2>
        <div class="button-row">
          <button id="run-button" type="button" class="primary">运行</button>
          <button id="pause-button" type="button" disabled>暂停</button>
          <button id="stop-button" type="button" disabled>停止</button>
        </div>
        <div class="progress-line"><progress id="run-progress" max="1" value="0"></progress><span id="progress-label">0%</span></div>
        <p id="run-state" class="run-state">ready</p>
      </section>
      <section class="panel">
        <h2>实验与导出</h2>
        <div class="button-row">
          <label class="file-button">导入实验 CSV<input id="experiment-file" type="file" accept="text/csv,.csv"></label>
          <button id="compare-button" type="button" disabled>残差指标</button>
        </div>
        <div class="button-row">
          <button id="export-json" type="button" disabled>结果 JSON</button>
          <button id="export-csv" type="button" disabled>时间序列 CSV</button>
        </div>
        <div id="experiment-output" class="message-list"></div>
      </section>
    </aside>
    <section class="results">
      <section class="panel summary-panel">
        <div class="panel-title"><h2>可审计摘要</h2><span id="termination-badge" class="badge">尚未运行</span></div>
        <div id="evidence-badges" class="evidence-badges" aria-label="模型与证据合同"></div>
        <div id="summary-grid" class="summary-grid"></div>
        <div id="comparison-gate" class="message-list" aria-live="polite"></div>
        <div id="result-warnings" class="message-list"></div>
      </section>
      <section class="panel scene-panel"><h2>运动与流场</h2><canvas id="scene-canvas"></canvas></section>
      <div class="plot-grid">
        <section class="panel"><h2>位移时间序列</h2><canvas id="time-canvas"></canvas></section>
        <section class="panel"><h2>相平面</h2><canvas id="phase-canvas"></canvas></section>
        <section class="panel"><h2>频谱</h2><canvas id="spectrum-canvas"></canvas></section>
        <section class="panel"><h2>能量与功率</h2><canvas id="energy-canvas"></canvas></section>
      </div>
    </section>
  </main>
`;

const editor = required<HTMLTextAreaElement>("config-editor");
const backendSelect = required<HTMLSelectElement>("backend-select");
const configState = required<HTMLElement>("config-state");
const validationOutput = required<HTMLElement>("validation-output");
const runButton = required<HTMLButtonElement>("run-button");
const pauseButton = required<HTMLButtonElement>("pause-button");
const stopButton = required<HTMLButtonElement>("stop-button");
const progress = required<HTMLProgressElement>("run-progress");
const progressLabel = required<HTMLElement>("progress-label");
const runState = required<HTMLElement>("run-state");
const summaryGrid = required<HTMLElement>("summary-grid");
const evidenceBadges = required<HTMLElement>("evidence-badges");
const comparisonGate = required<HTMLElement>("comparison-gate");
const resultWarnings = required<HTMLElement>("result-warnings");
const terminationBadge = required<HTMLElement>("termination-badge");
const compareButton = required<HTMLButtonElement>("compare-button");
const exportJson = required<HTMLButtonElement>("export-json");
const exportCsv = required<HTMLButtonElement>("export-csv");
const experimentOutput = required<HTMLElement>("experiment-output");
const parameterRoot = required<HTMLElement>("parameter-form");
const dashboard = new VisualDashboard(app);
const runner = new SimulationRunner();
const results = new Map<BackendId, SimulationResult>();
let latestResult: SimulationResult | undefined;
let experiment: ExperimentalDataset | undefined;
let activeBackend: BackendId = DEFAULT_CONFIG.backend;
const invalidParameterPaths = new Set<string>();
const parameterForm = new ParameterForm(
  parameterRoot,
  VORTEX_PENDULUM_PARAMETERS,
  (path, value) => {
    try {
      const config = updateConfigAtPath(parseEditor(), path, value);
      editor.value = JSON.stringify(config, null, 2);
      backendSelect.value = config.backend;
      inspectEditor(false);
    } catch (error) {
      configState.textContent = "参数无效";
      configState.dataset.state = "error";
      validationOutput.innerHTML = `<p class="message error">${escapeHtml(errorMessage(error))}</p>`;
    }
  },
  (path, valid) => {
    if (valid) invalidParameterPaths.delete(path);
    else invalidParameterPaths.add(path);
    if (!valid) {
      configState.textContent = `${invalidParameterPaths.size} 项输入无效`;
      configState.dataset.state = "error";
      validationOutput.innerHTML = `<p class="message error"><code>${escapeHtml(path)}</code> 请输入参数合同范围内的有效数值。</p>`;
    }
  },
);

function required<T extends Element>(id: string): T {
  const element = document.querySelector<T>(`#${id}`);
  if (element === null) throw new Error(`missing #${id}`);
  return element;
}

function setEditor(config: SimulationConfig): void {
  invalidParameterPaths.clear();
  editor.value = JSON.stringify(config, null, 2);
  backendSelect.value = config.backend;
  inspectEditor();
}

function parseEditor(): SimulationConfig {
  const value: unknown = JSON.parse(editor.value);
  if (!isSimulationConfig(value)) throw new Error("JSON 不是 schema 3.0.0 的涡流摆配置。旧版 1.0.0 配置不会被静默迁移。");
  return value;
}

function inspectEditor(syncForm = true): SimulationConfig | undefined {
  if (invalidParameterPaths.size > 0) {
    configState.textContent = `${invalidParameterPaths.size} 项输入无效`;
    configState.dataset.state = "error";
    validationOutput.innerHTML = `<p class="message error">请先修正：${[...invalidParameterPaths].map(escapeHtml).join("、")}</p>`;
    return undefined;
  }
  try {
    const config = parseEditor();
    if (syncForm) {
      backendSelect.value = config.backend;
      parameterForm.render(config);
    }
    const issues = validateConfig(config);
    const errors = issues.filter((issue) => issue.severity === "error");
    configState.textContent = errors.length === 0 ? "可运行" : `${errors.length} 项错误`;
    configState.dataset.state = errors.length === 0 ? "ok" : "error";
    validationOutput.innerHTML = issues.length === 0
      ? `<p class="message ok">配置通过物理与数值前置检查。</p>`
      : issues.map((issue) => `<p class="message ${issue.severity}"><code>${escapeHtml(issue.path)}</code> ${escapeHtml(issue.message)}</p>`).join("");
    return errors.length === 0 ? config : undefined;
  } catch (error) {
    configState.textContent = "JSON 无效";
    configState.dataset.state = "error";
    validationOutput.innerHTML = `<p class="message error">${escapeHtml(errorMessage(error))}</p>`;
    return undefined;
  }
}

function setRunControls(state: string): void {
  const running = state === "running";
  const paused = state === "paused";
  runButton.disabled = running || paused || state === "stopping";
  pauseButton.disabled = !(running || paused);
  pauseButton.textContent = paused ? "继续" : "暂停";
  stopButton.disabled = !(running || paused);
  runState.textContent = state;
}

function renderSummary(result: SimulationResult): void {
  const d = result.derived;
  const m = result.metrics;
  const n = result.numerical;
  terminationBadge.textContent = result.terminationCode;
  terminationBadge.dataset.state = result.complete ? "ok" : "warning";
  evidenceBadges.innerHTML = [
    `层级·${result.provenance.dimensionality}`,
    `载荷·${result.provenance.loadDefinition}`,
    `耦合·${result.provenance.couplingAlgorithm}`,
    `跨度·${result.provenance.spanClosure}`,
    `证据·${result.provenance.evidenceLevel}/${result.provenance.evidenceClaims.apparatusPrediction}`,
  ].map((label) => `<span class="badge" data-state="warning">${escapeHtml(label)}</span>`).join("");
  const entries: Array<[string, string]> = [
    ["Re", formatNumber(d.reynolds)],
    [result.backend === "forward" ? "ROM 先验参考约化速度" : "参考约化速度（不含动态流体惯性）",
      formatNumber(result.backend === "forward"
        ? d.romPriorReferenceReducedVelocity
        : d.referenceReducedVelocity)],
    [result.backend === "forward" ? "ROM 先验参考频率" : "机械—静水名义频率",
      `${formatNumber(result.backend === "forward"
        ? d.romPriorReferenceFrequency
        : d.mechanicalHydrostaticNominalFrequency)} Hz`],
    ["主频", `${formatNumber(m.dominantFrequency)} Hz`],
    ["稳态 A/D", formatNumber(m.dimensionlessAmplitude)],
    [result.backend === "forward" ? "均值 ROM 流体功率" : "均值实际 raw 机械功率",
      result.backend === "forward"
        ? `${formatNumber(m.meanFluidPower)} W`
        : m.meanAppliedRawMechanicalPower === null
          ? "不适用（未构造总力矩）"
          : `${formatNumber(m.meanAppliedRawMechanicalPower)} W`],
    ["能量闭合 RMS", formatNumber(m.energyClosureRelativeRms)],
    ["接受 / 拒绝步", `${n.acceptedSteps} / ${n.rejectedSteps}`],
    ["内部步长范围", `${formatNumber(n.minimumAcceptedStep)}–${formatNumber(n.maximumAcceptedStep)} s`],
    ["配置哈希", result.provenance.configHash],
    ["系数包", result.provenance.coefficientSetId],
    ["适用性", result.applicability.status],
  ];
  if (result.backend === "highFidelity") {
    const last = result.samples.at(-1);
    const applied = last?.interfaceExchange?.applied;
    const diagnostic = last?.interfaceExchange?.diagnostic;
    const cumulative = last?.interfaceExchange?.cumulative;
    const lattice = result.numerical.lattice;
    entries.splice(4, 3,
      ["最终 C_D", formatNumber(last?.dragCoefficient ?? Number.NaN)],
      ["最终 C_L", formatNumber(last?.liftCoefficient ?? Number.NaN)],
      ["实际 raw 线力（本步平均）", `${formatNumber(applied?.appliedRawLineForceX ?? Number.NaN)} / ${formatNumber(applied?.appliedRawLineForceY ?? Number.NaN)} N/m`],
    );
    entries.push(
      ["终点 diagnostic raw 线力", `${formatNumber(diagnostic?.diagnosticEndpointRawLineForceX ?? Number.NaN)} / ${formatNumber(diagnostic?.diagnosticEndpointRawLineForceY ?? Number.NaN)} N/m`],
      ["累计实际 raw 机械功", `${formatNumber(cumulative?.cumulativeAppliedRawWork ?? Number.NaN)} J`],
      ["Brinkman 代数残差", `${formatNumber(applied?.brinkmanAlgebraicResidual ?? Number.NaN)} J/m`],
      ["格子 tau / Ma", `${formatNumber(lattice?.relaxationTime ?? Number.NaN)} / ${formatNumber(lattice?.maximumMach ?? Number.NaN)}`],
      ["质量对账余量", formatNumber(lattice?.relativeMassBalanceResidual ?? Number.NaN)],
      ["层级", result.provenance.dimensionality],
      ["载荷定义", result.provenance.loadDefinition],
      ["耦合算法", result.provenance.couplingAlgorithm],
      ["跨度闭合", result.provenance.spanClosure],
      ["动态取力证据", result.provenance.evidenceClaims.dynamicLoadExtraction],
      ["装置预测证据", result.provenance.evidenceClaims.apparatusPrediction],
      ["力合同", result.provenance.forceContractId],
      ["动力学合同哈希", result.provenance.backendDynamicsContractHash],
      ["分析合同哈希", result.provenance.analysisContractHash],
    );
  }
  summaryGrid.innerHTML = entries.map(([label, value]) => `
    <div class="summary-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join("");
  resultWarnings.innerHTML = [
    ...result.warnings.map((warning) => `<p class="message warning">${escapeHtml(warning)}</p>`),
    ...result.events.map((event) => `<p class="message info"><code>${escapeHtml(event.code)}</code> t=${formatNumber(event.time)} s · ${escapeHtml(event.message)}</p>`),
  ].join("") || `<p class="message ok">没有运行警告或域事件。</p>`;
}

function approximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 64 * Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right));
}

function displacementOverlayGate(ordered: readonly SimulationResult[]): {
  allowed: boolean;
  reasons: string[];
} {
  if (ordered.length < 2) return { allowed: true, reasons: [] };
  const reference = ordered[0];
  if (reference === undefined) return { allowed: false, reasons: ["缺少参考结果"] };
  const reasons: string[] = [];
  for (const candidate of ordered.slice(1)) {
    if (candidate.provenance.sharedPhysicalInputHash
      !== reference.provenance.sharedPhysicalInputHash) {
      reasons.push("sharedPhysicalInputHash 不同");
    }
    if (!candidate.provenance.backendDynamicsContractHash
      || !reference.provenance.backendDynamicsContractHash) {
      reasons.push("动力学合同哈希未明示");
    }
    if (!approximatelyEqual(
      candidate.config.geometry.observationDistance,
      reference.config.geometry.observationDistance,
    )) {
      reasons.push("观测位置不同");
    }
    const referenceStart = reference.samples[0]?.time;
    const referenceEnd = reference.samples.at(-1)?.time;
    const candidateStart = candidate.samples[0]?.time;
    const candidateEnd = candidate.samples.at(-1)?.time;
    if (referenceStart === undefined || referenceEnd === undefined
      || candidateStart === undefined || candidateEnd === undefined
      || !approximatelyEqual(candidateStart, referenceStart)
      || !approximatelyEqual(candidateEnd, referenceEnd)) {
      reasons.push("时间区间不同");
    }
  }
  // Both backends expose the same observation operator here: marker displacement [m]
  // and its derivative [m/s]. Force and power fields deliberately do not pass this gate.
  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)] };
}

function drawAvailableResults(): void {
  const ordered = (["forward", "highFidelity"] as const)
    .map((backend) => results.get(backend))
    .filter((result): result is SimulationResult => result !== undefined);
  const gate = displacementOverlayGate(ordered);
  if (ordered.length < 2) {
    comparisonGate.innerHTML = "";
    dashboard.drawResults(ordered, experiment, 1, latestResult?.backend);
    return;
  }
  const contractLines = ordered.map((result) =>
    `${result.provenance.backendDisplayName}=${result.provenance.backendDynamicsContractHash}`,
  ).join("<br>");
  if (!gate.allowed) {
    const current = latestResult === undefined ? ordered.slice(-1) : [latestResult];
    comparisonGate.innerHTML = `<p class="message error"><strong>定量叠图已禁止。</strong>${escapeHtml(gate.reasons.join("；"))}。当前只显示最近一个后端结果。</p><p class="message info">${contractLines}</p>`;
    dashboard.drawResults(current, experiment, 1, latestResult?.backend);
    return;
  }
  comparisonGate.innerHTML = `<p class="message ok">位移/相平面/频谱配对门通过：shared=${escapeHtml(ordered[0]?.provenance.sharedPhysicalInputHash ?? "")}；观测量为同一标记点位移 [m]，时间区间一致。</p><p class="message info">两个动力学合同仅明示、不等同：<br>${contractLines}<br>ROM 端口功与 CFD raw 未修正功语义不兼容；能量/功率面板只显示当前后端，不做跨后端定量叠图。</p>`;
  dashboard.drawResults(ordered, experiment, 1, latestResult?.backend);
}

function handleWorker(response: WorkerResponse): void {
  if (response.type === "state") setRunControls(response.state);
  if (response.type === "progress") {
    progress.value = response.progress;
    progressLabel.textContent = `${Math.round(100 * response.progress)}%`;
    if (response.sample !== undefined) dashboard.drawProgress(activeBackend, response.sample, response.field);
  }
  if (response.type === "error") {
    setRunControls("failed");
    resultWarnings.innerHTML = `<p class="message error">${escapeHtml(response.message)}</p>`;
  }
  if (response.type === "complete") {
    latestResult = response.result;
    results.set(response.result.backend, response.result);
    progress.value = 1;
    progressLabel.textContent = "100%";
    exportJson.disabled = false;
    exportCsv.disabled = false;
    compareButton.disabled = experiment === undefined;
    renderSummary(response.result);
    drawAvailableResults();
  }
}

runner.subscribe(handleWorker);
setEditor(structuredClone(DEFAULT_CONFIG));
setRunControls("ready");

required<HTMLButtonElement>("validate-button").addEventListener("click", () => inspectEditor());
required<HTMLButtonElement>("reset-button").addEventListener("click", () => setEditor(structuredClone(DEFAULT_CONFIG)));
required<HTMLButtonElement>("export-config").addEventListener("click", () => {
  const config = inspectEditor();
  if (config !== undefined) downloadJson("vortex-pendulum-config.json", config);
});
editor.addEventListener("input", () => {
  configState.textContent = "已修改";
  configState.dataset.state = "warning";
  try {
    const config = parseEditor();
    invalidParameterPaths.clear();
    backendSelect.value = config.backend;
    parameterForm.render(config);
  } catch {
    // Keep the last valid visual form while the advanced JSON is incomplete.
  }
});
backendSelect.addEventListener("change", () => {
  try {
    const config = parseEditor();
    config.backend = backendSelect.value as BackendId;
    setEditor(config);
  } catch {
    inspectEditor();
  }
});
required<HTMLInputElement>("config-file").addEventListener("change", async (event) => {
  const file = (event.currentTarget as HTMLInputElement).files?.[0];
  if (file === undefined) return;
  try {
    const value = await readJsonFile(file);
    if (!isSimulationConfig(value)) throw new Error("配置不是 schema 3.0.0。旧配置不会静默补默认值。");
    setEditor(value);
  } catch (error) {
    validationOutput.innerHTML = `<p class="message error">${escapeHtml(errorMessage(error))}</p>`;
  }
});
runButton.addEventListener("click", () => {
  const config = inspectEditor();
  if (config === undefined) return;
  latestResult = undefined;
  activeBackend = config.backend;
  progress.value = 0;
  progressLabel.textContent = "0%";
  resultWarnings.innerHTML = "";
  setRunControls("running");
  dashboard.beginRun(config.backend);
  runner.run(config);
});
pauseButton.addEventListener("click", () => {
  if (runner.state === "paused") runner.resume();
  else runner.pause();
});
stopButton.addEventListener("click", () => runner.stop());
required<HTMLInputElement>("experiment-file").addEventListener("change", async (event) => {
  const file = (event.currentTarget as HTMLInputElement).files?.[0];
  if (file === undefined) return;
  try {
    experiment = await parseExperimentalCsv(file);
    experimentOutput.innerHTML = `<p class="message ok">${escapeHtml(experiment.name)} · ${experiment.points.length} 点 · ${escapeHtml(experiment.sourceHash)}</p>`;
    compareButton.disabled = latestResult === undefined;
    drawAvailableResults();
  } catch (error) {
    experimentOutput.innerHTML = `<p class="message error">${escapeHtml(errorMessage(error))}</p>`;
  }
});
compareButton.addEventListener("click", () => {
  if (latestResult === undefined || experiment === undefined) return;
  try {
    const metrics = compareExperiment(latestResult, experiment);
    experimentOutput.innerHTML = `<p class="message info">${metrics.observable} · N=${metrics.count} · RMSE=${formatNumber(metrics.rmse)} · NRMSE=${formatNumber(metrics.nrmse)} · bias=${formatNumber(metrics.bias)} · r=${formatNumber(metrics.correlation)}</p>`;
    dashboard.drawComparisonResidual(latestResult, experiment);
  } catch (error) {
    experimentOutput.innerHTML = `<p class="message error">${escapeHtml(errorMessage(error))}</p>`;
  }
});
exportJson.addEventListener("click", () => {
  if (latestResult !== undefined) downloadJson(`${latestResult.runId}.json`, latestResult);
});
exportCsv.addEventListener("click", () => {
  if (latestResult !== undefined) downloadText(`${latestResult.runId}.csv`, resultToCsv(latestResult), "text/csv");
});
window.addEventListener("beforeunload", () => runner.terminate());

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
