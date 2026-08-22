import type { PluginParameterSpec, PluginValue } from "../core/plugin";
import type { BackendId, SimulationConfig } from "../core/types";

type ParameterSpec = PluginParameterSpec<BackendId>;
type EditableParameterValue = number | string | boolean;

const CATEGORY_ORDER = [
  "geometry",
  "body",
  "fluid",
  "support",
  "rom",
  "cfd2d",
  "initial",
  "solver",
] as const;

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  geometry: "几何与水槽",
  body: "摆体、质量与惯量",
  fluid: "流体与来流",
  support: "支承、刚度与耗散",
  rom: "前向尾流模型闭合系数",
  cfd2d: "二维 CFD 数值与运动设置",
  initial: "初始条件",
  solver: "运行时长与数值控制",
};

const OPTION_LABELS: Readonly<Record<string, string>> = {
  fixed: "固定圆柱",
  prescribed: "规定运动",
  "weak-fsi": "弱耦合 FSI",
  none: "不做三维条带闭合",
  "fully-coherent-upper-bound": "代表条带完全相干复制（旧键，非上界）",
};

const DEFAULT_OPEN = new Set(["geometry", "fluid", "rom", "cfd2d"]);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function readPath(root: object, path: string): unknown {
  let cursor: unknown = root;
  for (const segment of path.split(".")) {
    if (typeof cursor !== "object" || cursor === null || !(segment in cursor)) {
      throw new Error(`配置路径不存在：${path}`);
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

export function updateConfigAtPath(
  config: SimulationConfig,
  path: string,
  value: EditableParameterValue,
): SimulationConfig {
  const copy = structuredClone(config);
  const segments = path.split(".");
  const finalSegment = segments.pop();
  if (!finalSegment || segments.length === 0) throw new Error(`配置路径无效：${path}`);

  let cursor: Record<string, unknown> = copy as unknown as Record<string, unknown>;
  for (const segment of segments) {
    const next = cursor[segment];
    if (typeof next !== "object" || next === null) throw new Error(`配置路径不存在：${path}`);
    cursor = next as Record<string, unknown>;
  }

  if (!(finalSegment in cursor)) throw new Error(`配置路径不存在：${path}`);
  const previous = cursor[finalSegment];
  if (typeof previous !== typeof value) {
    throw new Error(`配置路径 ${path} 的类型不能从 ${typeof previous} 改为 ${typeof value}`);
  }
  cursor[finalSegment] = value;
  return copy;
}

function attribute(name: string, value: number | undefined): string {
  return value === undefined ? "" : ` ${name}="${String(value)}"`;
}

function unitLabel(unit: string): string {
  return unit === "1" ? "无量纲" : unit;
}

function inputId(path: string): string {
  return `parameter-${path.replaceAll(".", "-")}`;
}

function optionLabel(value: PluginValue): string {
  const serialized = String(value);
  return OPTION_LABELS[serialized] ?? serialized;
}

function renderInput(spec: ParameterSpec, value: unknown): string {
  const common = `id="${inputId(spec.path)}" data-parameter-path="${escapeHtml(spec.path)}" data-value-type="${spec.valueType}"`;
  if (spec.valueType === "enum") {
    const options = (spec.options ?? []).map((option) => {
      const serialized = String(option);
      const selected = Object.is(option, value) ? " selected" : "";
      return `<option value="${escapeHtml(serialized)}"${selected}>${escapeHtml(optionLabel(option))}</option>`;
    }).join("");
    return `<select ${common}>${options}</select>`;
  }
  if (spec.valueType === "boolean") {
    return `<select ${common}><option value="true"${value === true ? " selected" : ""}>是</option><option value="false"${value === false ? " selected" : ""}>否</option></select>`;
  }
  if (spec.valueType === "string") {
    return `<input ${common} type="text" value="${escapeHtml(String(value ?? ""))}">`;
  }
  return `<input ${common} type="number" inputmode="decimal" value="${escapeHtml(String(value))}"${attribute("min", spec.min)}${attribute("max", spec.max)}${attribute("step", spec.step)}>`;
}

function parameterValue(spec: ParameterSpec, target: HTMLInputElement | HTMLSelectElement): EditableParameterValue | undefined {
  if (spec.valueType === "number" || spec.valueType === "integer") {
    if (!(target instanceof HTMLInputElement)) return undefined;
    const value = target.valueAsNumber;
    if (!Number.isFinite(value)
      || (spec.min !== undefined && value < spec.min)
      || (spec.max !== undefined && value > spec.max)
      || (spec.valueType === "integer" && !Number.isInteger(value))) return undefined;
    return value;
  }
  if (spec.valueType === "boolean") return target.value === "true";
  if (spec.valueType === "enum") {
    const option = spec.options?.find((candidate) => String(candidate) === target.value);
    return option === null || option === undefined ? undefined : option as EditableParameterValue;
  }
  return target.value;
}

export class ParameterForm {
  private readonly specByPath: Map<string, ParameterSpec>;
  private rendered = false;
  private previousBackend: BackendId | undefined;

  constructor(
    private readonly root: HTMLElement,
    private readonly specs: readonly ParameterSpec[],
    private readonly onChange: (path: string, value: EditableParameterValue) => void,
    private readonly onValidityChange: (path: string, valid: boolean) => void = () => undefined,
  ) {
    this.specByPath = new Map(specs.map((spec) => [spec.path, spec]));
    this.root.addEventListener("input", (event) => this.handleInput(event));
  }

  render(config: SimulationConfig): void {
    const backendChanged = this.previousBackend !== undefined
      && this.previousBackend !== config.backend;
    const openCategories = new Set(
      [...this.root.querySelectorAll<HTMLDetailsElement>("details[data-category]")]
        .filter((details) => details.open)
        .map((details) => details.dataset.category ?? ""),
    );
    const applicable = this.specs.filter((spec) => spec.backends === undefined
      || spec.backends.includes(config.backend));

    const groups = CATEGORY_ORDER.map((category) => ({
      category,
      specs: applicable.filter((spec) => spec.category === category),
    })).filter((group) => group.specs.length > 0);

    this.root.innerHTML = groups.map(({ category, specs }) => {
      const open = openCategories.has(category)
        || (!this.rendered && (DEFAULT_OPEN.has(category)
          || (config.backend === "highFidelity" && category === "cfd2d")))
        || (backendChanged && ((config.backend === "highFidelity" && category === "cfd2d")
          || (config.backend === "forward" && category === "rom")));
      const fields = specs.map((spec) => {
        const value = readPath(config, spec.path);
        const symbol = spec.symbol ? `<span class="parameter-symbol">${escapeHtml(spec.symbol)}</span>` : "";
        return `
          <label class="parameter-field" for="${inputId(spec.path)}">
            <span class="parameter-label"><span>${escapeHtml(spec.label)} ${symbol}</span><span class="parameter-unit">${escapeHtml(unitLabel(spec.unit))}</span></span>
            ${renderInput(spec, value)}
            <span class="parameter-help">${escapeHtml(spec.description)}</span>
          </label>
        `;
      }).join("");
      return `
        <details class="parameter-group" data-category="${category}"${open ? " open" : ""}>
          <summary><span>${escapeHtml(CATEGORY_LABELS[category] ?? category)}</span><span class="parameter-count">${specs.length} 项</span></summary>
          <div class="parameter-grid">${fields}</div>
        </details>
      `;
    }).join("");
    this.rendered = true;
    this.previousBackend = config.backend;
  }

  private handleInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const path = target.dataset.parameterPath;
    if (!path) return;
    const spec = this.specByPath.get(path);
    if (!spec) return;
    const value = parameterValue(spec, target);
    const valid = value !== undefined;
    target.setAttribute("aria-invalid", String(!valid));
    this.onValidityChange(path, valid);
    if (valid) this.onChange(path, value);
  }
}
