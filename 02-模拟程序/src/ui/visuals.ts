import type {
  BackendId,
  ExperimentalDataset,
  FieldFrame,
  SimulationResult,
  SimulationSample,
} from "../core/types";
import { interpolateExperiment } from "./data";

interface PlotSeries {
  label: string;
  color: string;
  values: Array<{ x: number; y: number }>;
  dashed?: boolean;
}

const MONO = {
  foreground: "#111111",
  secondary: "#555555",
  muted: "#8a8a8a",
  grid: "rgba(0, 0, 0, 0.14)",
  text: "#444444",
  panel: "#ffffff",
};

const PLOT_PALETTE = [MONO.foreground, MONO.secondary, MONO.muted];

// Color is deliberately confined to the physical scene canvas. Everything
// outside that canvas, including diagnostic plots, remains monochrome.
const SCENE = {
  waterTop: "rgba(35, 145, 202, .28)",
  waterBottom: "rgba(4, 67, 105, .78)",
  waterLine: "rgba(75, 183, 230, .78)",
  bob: "#f2a23a",
  bobOutline: "#ffd39b",
  positiveVortex: "242, 151, 54",
  negativeVortex: "43, 143, 211",
};

export class VisualDashboard {
  readonly sceneCanvas: HTMLCanvasElement;
  readonly timeCanvas: HTMLCanvasElement;
  readonly phaseCanvas: HTMLCanvasElement;
  readonly spectrumCanvas: HTMLCanvasElement;
  readonly energyCanvas: HTMLCanvasElement;
  private latestProgressField: FieldFrame | undefined;

  constructor(root: ParentNode) {
    this.sceneCanvas = requiredCanvas(root, "scene-canvas");
    this.timeCanvas = requiredCanvas(root, "time-canvas");
    this.phaseCanvas = requiredCanvas(root, "phase-canvas");
    this.spectrumCanvas = requiredCanvas(root, "spectrum-canvas");
    this.energyCanvas = requiredCanvas(root, "energy-canvas");
    this.drawEmpty();
  }

  drawEmpty(): void {
    for (const canvas of [this.sceneCanvas, this.timeCanvas, this.phaseCanvas, this.spectrumCanvas, this.energyCanvas]) {
      const { context, width, height } = prepareCanvas(canvas);
      context.fillStyle = MONO.panel;
      context.fillRect(0, 0, width, height);
      context.fillStyle = MONO.text;
      context.font = "13px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText("运行后将在此显示可审计计算结果", width / 2, height / 2);
    }
    this.sceneCanvas.dataset.sceneMode = "empty";
  }

  beginRun(backend: BackendId): void {
    this.latestProgressField = undefined;
    const { context, width, height } = prepareCanvas(this.sceneCanvas);
    context.fillStyle = MONO.panel;
    context.fillRect(0, 0, width, height);
    context.fillStyle = MONO.text;
    context.font = "13px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(
      backend === "highFidelity" ? "正在生成首个二维 CFD 流场帧…" : "正在生成前向计算轨迹…",
      width / 2,
      height / 2,
    );
    this.sceneCanvas.dataset.sceneMode = backend === "highFidelity" ? "waiting-cfd" : "waiting-forward";
  }

  drawProgress(backend: BackendId, sample: SimulationSample, field?: FieldFrame): void {
    if (backend === "highFidelity") {
      if (field !== undefined) this.latestProgressField = field;
      if (this.latestProgressField === undefined) return;
      drawScene(this.sceneCanvas, sample, backend, this.latestProgressField);
      this.sceneCanvas.dataset.sceneMode = "cfd";
      return;
    }
    drawScene(this.sceneCanvas, sample, backend);
    this.sceneCanvas.dataset.sceneMode = "forward";
  }

  drawResults(
    results: SimulationResult[],
    experiment?: ExperimentalDataset,
    cursorFraction = 1,
    sceneBackend?: BackendId,
  ): void {
    if (!results.length) {
      this.drawEmpty();
      return;
    }
    const reference = results[0];
    if (!reference) return;
    const sceneResult = results.find((result) => result.backend === sceneBackend) ?? reference;
    const sampleIndex = Math.min(sceneResult.samples.length - 1, Math.max(0, Math.floor(cursorFraction * (sceneResult.samples.length - 1))));
    const sample = sceneResult.samples[sampleIndex];
    if (sample) {
      drawScene(
        this.sceneCanvas,
        sample,
        sceneResult.backend,
        closestField(sceneResult.fields, sample.time),
      );
      this.sceneCanvas.dataset.sceneMode = sceneResult.backend === "highFidelity" ? "cfd" : "forward";
    }

    const palette = PLOT_PALETTE;
    const timeSeries: PlotSeries[] = results.map((result, index) => ({
      label: result.backend === "forward" ? "前向理论" : "二维截面参考",
      color: palette[index] ?? MONO.muted,
      values: result.samples.map((item) => ({ x: item.time, y: item.displacement })),
    }));
    if (experiment) {
      const observationRadius = reference.config.geometry.observationDistance;
      timeSeries.push({
        label: `实验·${experiment.name}`,
        color: MONO.secondary,
        dashed: true,
        values: experiment.points.map((point) => ({
          x: point.time,
          y: point.displacement ?? observationRadius * Math.sin(point.theta ?? 0),
        })),
      });
    }
    drawPlot(this.timeCanvas, timeSeries, "时间 t / s", "横向位移 x / m", true);

    drawPlot(this.phaseCanvas, results.map((result, index) => ({
      label: result.backend === "forward" ? "前向理论" : "二维截面参考",
      color: palette[index] ?? MONO.muted,
      values: result.samples.map((item) => ({ x: item.displacement, y: item.velocity })),
    })), "位移 x / m", "速度 dx/dt / m·s⁻¹", false);

    drawPlot(this.spectrumCanvas, results.map((result, index) => ({
      label: result.backend === "forward" ? "前向理论" : "二维截面参考",
      color: palette[index] ?? MONO.muted,
      values: spectrum(result.samples),
    })), "频率 f / Hz", "|X(f)| / m", true);

    // Mechanical-energy definitions and fluid-work semantics differ between
    // the ROM and the A1 raw CFD contract. Show only the active backend here;
    // cross-backend displacement comparisons remain available above.
    const energyResult = results.find((result) => result.backend === sceneBackend)
      ?? results.at(-1)
      ?? reference;
    const energySeries: PlotSeries[] = [];
    [energyResult].forEach((result) => {
      const color = MONO.foreground;
      energySeries.push({
        label: `${result.backend === "forward" ? "前向" : "二维截面参考"}·机械能`,
        color,
        values: result.samples.map((item) => ({ x: item.time, y: item.mechanicalEnergy })),
      });
      if (result.backend === "forward") {
        energySeries.push({
          label: "前向·ROM 流体端口功率",
          color: MONO.secondary,
          dashed: true,
          values: result.samples.map((item) => ({ x: item.time, y: item.fluidPower })),
        });
      } else {
        energySeries.push({
          label: "二维截面·本步实际 raw 施力功率",
          color: MONO.foreground,
          dashed: true,
          values: result.samples.map((item) => ({
            x: item.time,
            y: item.interfaceExchange?.applied?.appliedRawPower ?? 0,
          })),
        });
        energySeries.push({
          label: "二维截面·终点 diagnostic legacy 功率",
          color: MONO.muted,
          dashed: true,
          values: result.samples.map((item) => ({ x: item.time, y: item.fluidPower })),
        });
      }
    });
    drawPlot(this.energyCanvas, energySeries, "时间 t / s", "能量 / J；功率 / W", true);
  }

  drawComparisonResidual(result: SimulationResult, experiment: ExperimentalDataset): void {
    const residuals = result.samples.map((sample) => {
      const observed = interpolateExperiment(experiment, sample.time, result.config.geometry.observationDistance);
      return observed === undefined ? undefined : { x: sample.time, y: sample.displacement - observed };
    }).filter((point): point is { x: number; y: number } => point !== undefined);
    drawPlot(this.timeCanvas, [{ label: "模型−实验残差", color: MONO.foreground, values: residuals }], "时间 t / s", "残差 / m", true);
  }
}

export function drawSweepChart(
  canvas: HTMLCanvasElement,
  points: Array<{ value: number; response: number; label?: string }>,
  xLabel: string,
): void {
  const grouped = new Map<string, PlotSeries>();
  for (const point of points) {
    const label = point.label ?? "稳态无量纲振幅";
    const series = grouped.get(label) ?? {
      label,
      color: grouped.size === 0 ? MONO.foreground : MONO.secondary,
      values: [],
    };
    series.values.push({ x: point.value, y: point.response });
    grouped.set(label, series);
  }
  drawPlot(canvas, [...grouped.values()], xLabel, "A/D", false);
}

function drawScene(
  canvas: HTMLCanvasElement,
  sample: SimulationSample,
  backend?: BackendId,
  field?: FieldFrame,
): void {
  const { context, width, height } = prepareCanvas(canvas);
  context.fillStyle = MONO.panel;
  context.fillRect(0, 0, width, height);
  if (backend === "highFidelity" && field !== undefined) {
    drawCfdReferenceScene(context, field, sample, width, height);
    return;
  }
  const waterTop = height * 0.28;
  const floor = height * 0.87;
  const pivotX = width * 0.5;
  const pivotY = height * 0.12;

  if (field) {
    drawField(context, field, 0, waterTop, width, floor - waterTop);
  } else {
    const gradient = context.createLinearGradient(0, waterTop, 0, floor);
    gradient.addColorStop(0, SCENE.waterTop);
    gradient.addColorStop(1, SCENE.waterBottom);
    context.fillStyle = gradient;
    context.fillRect(0, waterTop, width, floor - waterTop);
    drawProceduralWake(context, sample, width, waterTop, floor);
  }

  context.strokeStyle = SCENE.waterLine;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, waterTop);
  for (let x = 0; x <= width; x += 8) {
    context.lineTo(x, waterTop + Math.sin(x * 0.055 + sample.time * 3) * 1.5);
  }
  context.stroke();

  const lengthPixels = Math.min(height * 0.62, width * 0.32);
  const bobX = pivotX + lengthPixels * Math.sin(sample.theta);
  const bobY = pivotY + lengthPixels * Math.cos(sample.theta);
  context.strokeStyle = MONO.secondary;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(pivotX, pivotY);
  context.lineTo(bobX, bobY);
  context.stroke();

  context.fillStyle = MONO.foreground;
  context.beginPath();
  context.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
  context.fill();
  context.save();
  context.translate(bobX, bobY);
  context.rotate(-sample.theta * 0.15);
  context.fillStyle = SCENE.bob;
  context.strokeStyle = SCENE.bobOutline;
  context.lineWidth = 1.5;
  context.beginPath();
  if (typeof context.roundRect === "function") context.roundRect(-8, -22, 16, 44, 7);
  else context.rect(-8, -22, 16, 44);
  context.fill();
  context.stroke();
  context.restore();

  context.fillStyle = "rgba(17, 17, 17, .92)";
  context.font = "600 12px ui-monospace, monospace";
  context.textAlign = "left";
  context.fillText(`t = ${sample.time.toFixed(2)} s`, 14, 20);
  context.fillText(`θ = ${(sample.theta * 180 / Math.PI).toFixed(2)}°`, 14, 38);
  context.fillText(`U = ${sample.flowSpeed.toFixed(3)} m/s`, 14, 56);
  context.textAlign = "right";
  context.fillStyle = MONO.foreground;
  context.fillText(backend === "highFidelity" ? "LBM 涡量场" : "尾流振子场", width - 14, 20);
}

function drawCfdReferenceScene(
  context: CanvasRenderingContext2D,
  field: FieldFrame,
  sample: SimulationSample,
  width: number,
  height: number,
): void {
  const margin = { left: 12, right: 12, top: 28, bottom: 22 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  drawField(context, field, margin.left, margin.top, plotWidth, plotHeight);
  const cylinderX = margin.left
    + (field.cylinderX - field.xMin) / (field.xMax - field.xMin) * plotWidth;
  const cylinderY = margin.top
    + (field.cylinderY - field.yMin) / (field.yMax - field.yMin) * plotHeight;
  const radius = field.cylinderRadius / (field.xMax - field.xMin) * plotWidth;
  context.fillStyle = SCENE.bob;
  context.strokeStyle = SCENE.bobOutline;
  context.lineWidth = 1.4;
  context.beginPath();
  context.arc(cylinderX, cylinderY, Math.max(2, radius), 0, 2 * Math.PI);
  context.fill();
  context.stroke();
  context.strokeStyle = "rgba(17, 17, 17, .35)";
  context.strokeRect(margin.left, margin.top, plotWidth, plotHeight);
  context.font = "600 11px ui-monospace, monospace";
  context.fillStyle = MONO.foreground;
  context.textAlign = "left";
  context.fillText("infinite-span-2d · D2Q9 MRT-Brinkman", margin.left, 17);
  context.textAlign = "right";
  context.fillStyle = "rgba(17, 17, 17, .9)";
  context.fillText(`t=${sample.time.toFixed(3)} s · diagnostic F'y=${(sample.lineForceY ?? 0).toExponential(2)} N/m`, width - margin.right, 17);
  context.textAlign = "left";
  context.fillStyle = MONO.text;
  context.font = "10px system-ui, sans-serif";
  context.fillText("横向周期；图中无自由面、端盖或有限湿跨", margin.left, height - 6);
}

function drawField(
  context: CanvasRenderingContext2D,
  field: FieldFrame,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const image = context.createImageData(field.width, field.height);
  let max = 1e-8;
  for (const value of field.vorticity) max = Math.max(max, Math.abs(value));
  for (let index = 0; index < field.vorticity.length; index += 1) {
    const value = Math.tanh((field.vorticity[index] ?? 0) / max * 2.2);
    const speed = Math.min(1, (field.speed[index] ?? 0) * 4);
    const offset = index * 4;
    if (value >= 0) {
      image.data[offset] = Math.round(16 + value * 226 + speed * 12);
      image.data[offset + 1] = Math.round(26 + value * 124 + speed * 34);
      image.data[offset + 2] = Math.round(40 + value * 24 + speed * 56);
    } else {
      const strength = -value;
      image.data[offset] = Math.round(12 + speed * 24);
      image.data[offset + 1] = Math.round(31 + strength * 92 + speed * 28);
      image.data[offset + 2] = Math.round(48 + strength * 190 + speed * 22);
    }
    image.data[offset + 3] = 235;
  }
  const buffer = document.createElement("canvas");
  buffer.width = field.width;
  buffer.height = field.height;
  buffer.getContext("2d")?.putImageData(image, 0, 0);
  context.imageSmoothingEnabled = true;
  context.drawImage(buffer, x, y, width, height);
}

function drawProceduralWake(
  context: CanvasRenderingContext2D,
  sample: SimulationSample,
  width: number,
  waterTop: number,
  floor: number,
): void {
  const centerY = (waterTop + floor) / 2 + sample.displacement * heightScale(floor - waterTop);
  const strength = Math.min(1, sample.wakeAmplitude / 2 + 0.2);
  for (let index = 0; index < 9; index += 1) {
    const progress = index / 8;
    const vortexX = width * (0.53 - progress * 0.48);
    const sign = index % 2 ? 1 : -1;
    const vortexY = centerY + sign * (18 + progress * 12);
    const gradient = context.createRadialGradient(vortexX, vortexY, 1, vortexX, vortexY, 16 + progress * 10);
    gradient.addColorStop(0, sign > 0
      ? `rgba(${SCENE.positiveVortex},${0.44 * strength})`
      : `rgba(${SCENE.negativeVortex},${0.48 * strength})`);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(vortexX - 28, vortexY - 28, 56, 56);
  }
  context.strokeStyle = "rgba(17, 17, 17, .38)";
  context.setLineDash([6, 8]);
  context.beginPath();
  context.moveTo(width * 0.97, centerY);
  context.lineTo(width * 0.06, centerY);
  context.stroke();
  context.setLineDash([]);
}

function drawPlot(canvas: HTMLCanvasElement, series: PlotSeries[], xLabel: string, yLabel: string, zeroLine: boolean): void {
  const { context, width, height } = prepareCanvas(canvas);
  context.fillStyle = MONO.panel;
  context.fillRect(0, 0, width, height);
  const margin = { left: 56, right: 18, top: 25, bottom: 43 };
  const plotWidth = Math.max(1, width - margin.left - margin.right);
  const plotHeight = Math.max(1, height - margin.top - margin.bottom);
  const all = series.flatMap((item) => item.values).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!all.length) {
    context.fillStyle = MONO.text;
    context.textAlign = "center";
    context.font = "12px system-ui";
    context.fillText("暂无数据", width / 2, height / 2);
    return;
  }
  let xMin = Math.min(...all.map((point) => point.x));
  let xMax = Math.max(...all.map((point) => point.x));
  let yMin = Math.min(...all.map((point) => point.y));
  let yMax = Math.max(...all.map((point) => point.y));
  if (zeroLine) {
    yMin = Math.min(0, yMin);
    yMax = Math.max(0, yMax);
  }
  if (xMin === xMax) { xMin -= 0.5; xMax += 0.5; }
  if (yMin === yMax) { yMin -= 0.5; yMax += 0.5; }
  const yPadding = (yMax - yMin) * 0.08;
  yMin -= yPadding;
  yMax += yPadding;
  const px = (value: number) => margin.left + (value - xMin) / (xMax - xMin) * plotWidth;
  const py = (value: number) => margin.top + (yMax - value) / (yMax - yMin) * plotHeight;

  context.strokeStyle = MONO.grid;
  context.fillStyle = MONO.text;
  context.font = "10px ui-monospace, monospace";
  context.lineWidth = 1;
  for (let tick = 0; tick <= 4; tick += 1) {
    const x = margin.left + plotWidth * tick / 4;
    const y = margin.top + plotHeight * tick / 4;
    context.beginPath(); context.moveTo(x, margin.top); context.lineTo(x, margin.top + plotHeight); context.stroke();
    context.beginPath(); context.moveTo(margin.left, y); context.lineTo(margin.left + plotWidth, y); context.stroke();
    context.textAlign = "center";
    context.fillText(formatAxis(xMin + (xMax - xMin) * tick / 4), x, height - 25);
    context.textAlign = "right";
    context.fillText(formatAxis(yMax - (yMax - yMin) * tick / 4), margin.left - 7, y + 3);
  }
  if (yMin < 0 && yMax > 0) {
    context.strokeStyle = "rgba(17, 17, 17, .28)";
    context.beginPath(); context.moveTo(margin.left, py(0)); context.lineTo(margin.left + plotWidth, py(0)); context.stroke();
  }

  context.save();
  context.beginPath();
  context.rect(margin.left, margin.top, plotWidth, plotHeight);
  context.clip();
  for (const item of series) {
    context.strokeStyle = item.color;
    context.lineWidth = 1.6;
    context.setLineDash(item.dashed ? [5, 4] : []);
    context.beginPath();
    const reduced = decimate(item.values, Math.max(200, Math.floor(plotWidth * 2)));
    reduced.forEach((point, index) => {
      if (index === 0) context.moveTo(px(point.x), py(point.y));
      else context.lineTo(px(point.x), py(point.y));
    });
    context.stroke();
  }
  context.restore();
  context.setLineDash([]);

  context.fillStyle = MONO.text;
  context.font = "11px system-ui";
  context.textAlign = "center";
  context.fillText(xLabel, margin.left + plotWidth / 2, height - 7);
  context.save();
  context.translate(13, margin.top + plotHeight / 2);
  context.rotate(-Math.PI / 2);
  context.fillText(yLabel, 0, 0);
  context.restore();

  let legendX = margin.left + 7;
  const legendY = 13;
  context.font = "10px system-ui";
  for (const item of series.slice(0, 4)) {
    context.strokeStyle = item.color;
    context.beginPath(); context.moveTo(legendX, legendY); context.lineTo(legendX + 14, legendY); context.stroke();
    context.fillStyle = MONO.text;
    context.textAlign = "left";
    context.fillText(item.label, legendX + 18, legendY + 3);
    legendX += 22 + context.measureText(item.label).width + 15;
  }
}

function spectrum(samples: SimulationSample[]): Array<{ x: number; y: number }> {
  if (samples.length < 4) return [];
  const count = Math.min(1024, samples.length);
  const start = samples.length - count;
  const selected = samples.slice(start);
  const mean = selected.reduce((sum, sample) => sum + sample.displacement, 0) / count;
  const dt = ((selected.at(-1)?.time ?? 0) - (selected[0]?.time ?? 0)) / Math.max(count - 1, 1);
  if (!(dt > 0)) return [];
  const bins = Math.min(Math.floor(count / 2), 240);
  const result: Array<{ x: number; y: number }> = [];
  for (let k = 0; k < bins; k += 1) {
    let real = 0;
    let imaginary = 0;
    for (let n = 0; n < count; n += 1) {
      const value = (selected[n]?.displacement ?? 0) - mean;
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * n / Math.max(count - 1, 1)));
      const angle = -2 * Math.PI * k * n / count;
      real += value * window * Math.cos(angle);
      imaginary += value * window * Math.sin(angle);
    }
    result.push({ x: k / (count * dt), y: 2 * Math.hypot(real, imaginary) / count });
  }
  return result;
}

function decimate(values: Array<{ x: number; y: number }>, limit: number): Array<{ x: number; y: number }> {
  if (values.length <= limit) return values;
  const result: Array<{ x: number; y: number }> = [];
  const stride = Math.ceil(values.length / limit);
  for (let index = 0; index < values.length; index += stride) {
    const point = values[index];
    if (point) result.push(point);
  }
  const last = values.at(-1);
  if (last && result.at(-1) !== last) result.push(last);
  return result;
}

function closestField(fields: FieldFrame[], time: number): FieldFrame | undefined {
  let closest: FieldFrame | undefined;
  let distance = Number.POSITIVE_INFINITY;
  for (const field of fields) {
    const candidate = Math.abs(field.time - time);
    if (candidate < distance) {
      distance = candidate;
      closest = field;
    }
  }
  return closest;
}

function requiredCanvas(root: ParentNode, id: string): HTMLCanvasElement {
  const canvas = root.querySelector<HTMLCanvasElement>(`#${id}`);
  if (!canvas) throw new Error(`Missing canvas #${id}`);
  return canvas;
}

function prepareCanvas(canvas: HTMLCanvasElement): { context: CanvasRenderingContext2D; width: number; height: number } {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(240, Math.floor(rect.width || Number(canvas.getAttribute("width")) || 480));
  const height = Math.max(150, Math.floor(rect.height || Number(canvas.getAttribute("height")) || 260));
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const targetWidth = Math.floor(width * ratio);
  const targetHeight = Math.floor(height * ratio);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

function requiredFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function heightScale(height: number): number {
  return requiredFinite(height * 4, 1);
}

function formatAxis(value: number): string {
  const absolute = Math.abs(value);
  return (absolute >= 1e3 || (absolute > 0 && absolute < 1e-3)) ? value.toExponential(1) : value.toPrecision(3).replace(/\.?0+$/, "");
}
