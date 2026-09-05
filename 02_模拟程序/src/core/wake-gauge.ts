import { constantWakeGaugeJacobian, transformJointUncertainty, type JointUncertaintyModel } from "../experiments/uncertainty";

/**
 * Constant complex changes of coordinate for the executable Stuart--Landau
 * wake state.  This module deliberately knows only the fields affected by the
 * gauge: package/schema migration remains responsible for all other identity
 * and provenance fields.
 */

export const WAKE_GAUGE_METADATA_VERSION = "VP-WAKE-GAUGE-METADATA-v1" as const;
export const WAKE_GAUGE_CONVERSION_VERSION = "VP-WAKE-GAUGE-CONVERSION-v1" as const;

export interface ComplexScale {
  readonly real: number;
  readonly imaginary: number;
}

export type WakeOutputKind = "sectional-lift-coefficient" | "total-wake-torque";

export interface WakeGaugeMetadata {
  readonly schemaVersion: typeof WAKE_GAUGE_METADATA_VERSION;
  readonly id: string;
  readonly modelId: string;
  /** Where the legacy declaration or calibration definition can be audited. */
  readonly sourceReference: string;
  readonly coordinate: {
    readonly kind: "dimensionless-complex-amplitude";
    readonly amplitudeConvention: string;
    readonly phaseReference: string;
    /** A single gauge must apply over the complete trajectory. */
    readonly trajectoryDependence: "constant";
    readonly stateUnit: "1";
    readonly timeBasis: {
      readonly unit: "s";
      readonly scaleToSeconds: 1;
    };
    readonly initialStatePaths: {
      readonly real: "initial.wakeReal";
      readonly imaginary: "initial.wakeImaginary";
    };
  };
  readonly output: {
    readonly kind: WakeOutputKind;
    readonly unit: "1" | "N*m";
    readonly expression:
      | "finiteSpanCoherence*Re(liftOutput*A)"
      | "Re(totalTorqueOutput*A)";
    /** Exact reference-area/width or total-torque definition. */
    readonly referenceIdentity: string;
    readonly coefficientPaths: {
      readonly real: "rom.liftOutputReal";
      readonly imaginary: "rom.liftOutputImaginary";
    };
  };
  readonly finiteSpanCoherence: {
    /** Spatial coherence is a closure assumption, never a wake gauge. */
    readonly kind: "independent-closure";
    readonly representation: "constant-factor" | "spatial-function";
    readonly closureId: string;
    readonly parameterPath: "rom.finiteSpanCoherence" | null;
  };
  /** Units of every executable coefficient changed by a gauge conversion. */
  readonly parameterUnits: Readonly<Record<string, string>>;
  /** Identifies omega_ref/activation and every other executable normalizer. */
  readonly parameterNormalizationIdentity: string;
  /** null means that the package carries no covariance matrix. */
  readonly covarianceIdentity: string | null;
}

export interface LegacyWakeGaugeDeclaration {
  readonly id: string;
  readonly modelId: string;
  readonly sourceReference: string;
  readonly amplitudeConvention: string;
  readonly phaseReference: string;
  readonly timeBasis: WakeGaugeMetadata["coordinate"]["timeBasis"];
  readonly output: WakeGaugeMetadata["output"];
  /** Must describe the original finite-span closure explicitly. */
  readonly finiteSpanCoherence: WakeGaugeMetadata["finiteSpanCoherence"];
  readonly parameterUnits: Readonly<Record<string, string>>;
  readonly parameterNormalizationIdentity: string;
  readonly covarianceIdentity: string | null;
}

export interface ConstantComplexWakeGaugeTransform extends ComplexScale {
  readonly kind: "constant-complex";
}

/** Descriptive only: the executable converter rejects this without dot(c)/c. */
export interface TimeVaryingComplexWakeGaugeTransform {
  readonly kind: "time-varying-complex";
  readonly description: string;
}

export interface WakeGaugeConversionRequest {
  readonly schemaVersion: typeof WAKE_GAUGE_CONVERSION_VERSION;
  readonly source: WakeGaugeMetadata;
  readonly target: WakeGaugeMetadata;
  readonly transform:
    | ConstantComplexWakeGaugeTransform
    | TimeVaryingComplexWakeGaugeTransform;
}

export interface WakeGaugeValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface WakeGaugeConversionValidation {
  readonly pass: boolean;
  readonly issues: readonly WakeGaugeValidationIssue[];
}

export interface WakeGaugeRomFields {
  cubicSaturation: number;
  nonlinearFrequencyShift: number;
  couplingThetaReal: number;
  couplingThetaImaginary: number;
  couplingOmegaReal: number;
  couplingOmegaImaginary: number;
  couplingAccelerationReal: number;
  couplingAccelerationImaginary: number;
  liftOutputReal: number;
  liftOutputImaginary: number;
  finiteSpanCoherence: number;
  wakeGauge?: WakeGaugeMetadata;
}

export interface WakeGaugeConfigLike {
  rom: WakeGaugeRomFields & { jointUncertainty?: JointUncertaintyModel };
  initial: WakeStateLike;
  solver?: {
    /** Absolute tolerance has the units of the scaled wake coordinate. */
    absoluteToleranceWake: number;
  };
}

export interface WakeStateLike {
  wakeReal: number;
  wakeImaginary: number;
}

export interface WakeGaugeConversionAudit {
  readonly schemaVersion: "VP-WAKE-GAUGE-CONVERSION-AUDIT-v1";
  readonly sourceGaugeId: string;
  readonly targetGaugeId: string;
  readonly transform: ConstantComplexWakeGaugeTransform;
  readonly changedPaths: readonly string[];
  readonly unchangedClosurePaths: readonly ["rom.finiteSpanCoherence"];
  /** Covariance values live in the joint-UQ package and require its Jacobian. */
  readonly covarianceHandling: "absent" | "transformed-joint-covariance";
}

export interface WakeGaugeConversionResult<T> {
  readonly config: T;
  readonly metadata: WakeGaugeMetadata;
  readonly audit: WakeGaugeConversionAudit;
}

export class WakeGaugeConversionError extends Error {
  readonly issues: readonly WakeGaugeValidationIssue[];

  constructor(issues: readonly WakeGaugeValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
    this.name = "WakeGaugeConversionError";
    this.issues = issues;
  }
}

const TRANSFORMED_PARAMETER_UNITS = Object.freeze({
  "rom.cubicSaturation": "1",
  "rom.nonlinearFrequencyShift": "1",
  "rom.couplingThetaReal": "1",
  "rom.couplingThetaImaginary": "1",
  "rom.couplingOmegaReal": "1",
  "rom.couplingOmegaImaginary": "1",
  "rom.couplingAccelerationReal": "1",
  "rom.couplingAccelerationImaginary": "1",
  "rom.liftOutputReal": "1",
  "rom.liftOutputImaginary": "1",
  "rom.finiteSpanCoherence": "1",
});

const CHANGED_PATHS = Object.freeze([
  "rom.cubicSaturation",
  "rom.nonlinearFrequencyShift",
  "rom.couplingThetaReal",
  "rom.couplingThetaImaginary",
  "rom.couplingOmegaReal",
  "rom.couplingOmegaImaginary",
  "rom.couplingAccelerationReal",
  "rom.couplingAccelerationImaginary",
  "rom.liftOutputReal",
  "rom.liftOutputImaginary",
  "initial.wakeReal",
  "initial.wakeImaginary",
  "solver.absoluteToleranceWake",
] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function issue(
  issues: WakeGaugeValidationIssue[],
  code: string,
  path: string,
  message: string,
): void {
  issues.push(Object.freeze({ code, path, message }));
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (!isRecord(value)) return JSON.stringify(value) ?? "undefined";
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function validateMetadata(
  value: unknown,
  path: string,
  issues: WakeGaugeValidationIssue[],
): value is WakeGaugeMetadata {
  if (!isRecord(value)) {
    issue(issues, "WAKE-GAUGE-METADATA-MISSING", path, "必须提供完整尾流规范元数据。");
    return false;
  }
  if (value.schemaVersion !== WAKE_GAUGE_METADATA_VERSION) {
    issue(issues, "WAKE-GAUGE-SCHEMA", `${path}.schemaVersion`,
      `必须为 ${WAKE_GAUGE_METADATA_VERSION}。`);
  }
  for (const field of ["id", "modelId", "sourceReference"] as const) {
    if (!nonEmptyText(value[field])) {
      issue(issues, "WAKE-GAUGE-IDENTITY-MISSING", `${path}.${field}`, `${field} 必须是非空字符串。`);
    }
  }

  const coordinate = value.coordinate;
  if (!isRecord(coordinate)) {
    issue(issues, "WAKE-COORDINATE-MISSING", `${path}.coordinate`, "必须声明复状态的幅值、相位和初态定义。");
  } else {
    if (coordinate.kind !== "dimensionless-complex-amplitude") {
      issue(issues, "WAKE-COORDINATE-KIND", `${path}.coordinate.kind`, "仅支持无量纲复振幅坐标。");
    }
    if (!nonEmptyText(coordinate.amplitudeConvention)) {
      issue(issues, "WAKE-AMPLITUDE-CONVENTION-MISSING", `${path}.coordinate.amplitudeConvention`,
        "必须显式声明振幅约定。");
    }
    if (!nonEmptyText(coordinate.phaseReference)) {
      issue(issues, "WAKE-PHASE-REFERENCE-MISSING", `${path}.coordinate.phaseReference`,
        "必须显式声明相位基准。");
    }
    if (coordinate.trajectoryDependence !== "constant") {
      issue(issues, "TIME-VARYING-WAKE-GAUGE", `${path}.coordinate.trajectoryDependence`,
        "本转换只允许整条轨迹使用同一个常数复规范。");
    }
    if (coordinate.stateUnit !== "1") {
      issue(issues, "WAKE-STATE-UNIT", `${path}.coordinate.stateUnit`, "生产 ROM 尾流状态必须为无量纲量。");
    }
    const timeBasis = coordinate.timeBasis;
    if (!isRecord(timeBasis) || timeBasis.unit !== "s" || timeBasis.scaleToSeconds !== 1) {
      issue(issues, "WAKE-TIME-BASIS", `${path}.coordinate.timeBasis`,
        "本批只支持显式的 SI 秒时间基准；其他时间标度需要完整量纲转换。");
    }
    const initial = coordinate.initialStatePaths;
    if (!isRecord(initial)
      || initial.real !== "initial.wakeReal"
      || initial.imaginary !== "initial.wakeImaginary") {
      issue(issues, "WAKE-INITIAL-STATE-IDENTITY", `${path}.coordinate.initialStatePaths`,
        "必须把规范绑定到 initial.wakeReal 和 initial.wakeImaginary。");
    }
  }

  const output = value.output;
  if (!isRecord(output)) {
    issue(issues, "WAKE-OUTPUT-METADATA-MISSING", `${path}.output`, "必须声明输出的物理种类、单位和参考定义。");
  } else {
    if (output.kind !== "sectional-lift-coefficient") {
      issue(issues, "WAKE-OUTPUT-KIND-UNSUPPORTED", `${path}.output.kind`,
        "当前生产字段只表示截面升力系数；有量纲总力矩不能写入 liftOutput。");
    }
    if (output.unit !== "1") {
      issue(issues, "WAKE-OUTPUT-UNIT", `${path}.output.unit`, "截面升力系数输出必须无量纲。");
    }
    if (output.expression !== "finiteSpanCoherence*Re(liftOutput*A)") {
      issue(issues, "WAKE-OUTPUT-LAW", `${path}.output.expression`, "输出律必须与生产 RHS 的 Re(LA) 定义一致。");
    }
    if (!nonEmptyText(output.referenceIdentity)) {
      issue(issues, "WAKE-OUTPUT-REFERENCE-MISSING", `${path}.output.referenceIdentity`,
        "必须给出参考面积或宽度定义的身份。");
    }
    const paths = output.coefficientPaths;
    if (!isRecord(paths)
      || paths.real !== "rom.liftOutputReal"
      || paths.imaginary !== "rom.liftOutputImaginary") {
      issue(issues, "WAKE-OUTPUT-PATHS", `${path}.output.coefficientPaths`,
        "必须绑定生产 liftOutput 的实部和虚部字段。");
    }
  }

  const span = value.finiteSpanCoherence;
  if (!isRecord(span)) {
    issue(issues, "SPAN-CLOSURE-MISSING", `${path}.finiteSpanCoherence`,
      "必须显式声明原有限跨相干闭合；unknown legacy 不能自动迁移。");
  } else {
    if (span.kind !== "independent-closure") {
      issue(issues, "SPAN-CLOSURE-KIND", `${path}.finiteSpanCoherence.kind`,
        "有限跨相干必须标为独立闭合而非尾流坐标规范。");
    }
    if (!nonEmptyText(span.closureId)) {
      issue(issues, "SPAN-CLOSURE-IDENTITY-MISSING", `${path}.finiteSpanCoherence.closureId`,
        "必须声明有限跨闭合身份。");
    }
    if (span.representation !== "constant-factor") {
      issue(issues, "SPAN-CLOSURE-UNSUPPORTED", `${path}.finiteSpanCoherence.representation`,
        "当前生产 RHS 只接受显式 constant-factor 闭合；空间函数不能靠规范变换消去。");
    }
    if (span.parameterPath !== "rom.finiteSpanCoherence") {
      issue(issues, "SPAN-CLOSURE-PATH", `${path}.finiteSpanCoherence.parameterPath`,
        "常数有限跨闭合必须绑定 rom.finiteSpanCoherence。");
    }
  }

  const units = value.parameterUnits;
  if (!isRecord(units)) {
    issue(issues, "WAKE-PARAMETER-UNITS-MISSING", `${path}.parameterUnits`,
      "必须声明所有被转换参数的单位。");
  } else {
    for (const [parameterPath, expected] of Object.entries(TRANSFORMED_PARAMETER_UNITS)) {
      if (units[parameterPath] !== expected) {
        issue(issues, "WAKE-PARAMETER-UNIT", `${path}.parameterUnits.${parameterPath}`,
          `${parameterPath} 的生产配置单位必须为 ${expected}。`);
      }
    }
  }
  if (value.covarianceIdentity !== null && !nonEmptyText(value.covarianceIdentity)) {
    issue(issues, "WAKE-COVARIANCE-IDENTITY", `${path}.covarianceIdentity`,
      "协方差存在时必须给出参数顺序/坐标身份；没有协方差时使用 null。");
  }
  if (!nonEmptyText(value.parameterNormalizationIdentity)) {
    issue(issues, "WAKE-PARAMETER-NORMALIZATION-MISSING", `${path}.parameterNormalizationIdentity`,
      "必须声明 beta、gamma 和输出字段使用的生产归一化身份。");
  }
  return true;
}

/** Validate one declared gauge without pretending to perform a conversion. */
export function validateWakeGaugeMetadata(value: unknown): WakeGaugeConversionValidation {
  const issues: WakeGaugeValidationIssue[] = [];
  validateMetadata(value, "wakeGauge", issues);
  return Object.freeze({ pass: issues.length === 0, issues: Object.freeze(issues) });
}

/**
 * Build metadata for an old package only from an explicit declaration.  There
 * are intentionally no defaults for its output or finite-span assumptions.
 */
export function buildLegacyWakeGaugeMetadata(
  declaration: LegacyWakeGaugeDeclaration,
): WakeGaugeMetadata {
  const metadata: WakeGaugeMetadata = {
    schemaVersion: WAKE_GAUGE_METADATA_VERSION,
    id: declaration.id,
    modelId: declaration.modelId,
    sourceReference: declaration.sourceReference,
    coordinate: {
      kind: "dimensionless-complex-amplitude",
      amplitudeConvention: declaration.amplitudeConvention,
      phaseReference: declaration.phaseReference,
      trajectoryDependence: "constant",
      stateUnit: "1",
      timeBasis: structuredClone(declaration.timeBasis),
      initialStatePaths: {
        real: "initial.wakeReal",
        imaginary: "initial.wakeImaginary",
      },
    },
    output: structuredClone(declaration.output),
    finiteSpanCoherence: structuredClone(declaration.finiteSpanCoherence),
    parameterUnits: structuredClone(declaration.parameterUnits),
    parameterNormalizationIdentity: declaration.parameterNormalizationIdentity,
    covarianceIdentity: declaration.covarianceIdentity,
  };
  const issues: WakeGaugeValidationIssue[] = [];
  validateMetadata(metadata, "metadata", issues);
  if (issues.length > 0) throw new WakeGaugeConversionError(issues);
  return Object.freeze({
    ...metadata,
    coordinate: Object.freeze({
      ...metadata.coordinate,
      timeBasis: Object.freeze({ ...metadata.coordinate.timeBasis }),
      initialStatePaths: Object.freeze({ ...metadata.coordinate.initialStatePaths }),
    }),
    output: Object.freeze({
      ...metadata.output,
      coefficientPaths: Object.freeze({ ...metadata.output.coefficientPaths }),
    }),
    finiteSpanCoherence: Object.freeze({ ...metadata.finiteSpanCoherence }),
    parameterUnits: Object.freeze({ ...metadata.parameterUnits }),
  });
}

export function validateWakeGaugeConversionRequest(
  value: unknown,
): WakeGaugeConversionValidation {
  const issues: WakeGaugeValidationIssue[] = [];
  if (!isRecord(value)) {
    issue(issues, "WAKE-GAUGE-CONVERSION-MISSING", "$", "必须提供完整规范转换请求。");
    return Object.freeze({ pass: false, issues: Object.freeze(issues) });
  }
  if (value.schemaVersion !== WAKE_GAUGE_CONVERSION_VERSION) {
    issue(issues, "WAKE-GAUGE-CONVERSION-SCHEMA", "schemaVersion",
      `必须为 ${WAKE_GAUGE_CONVERSION_VERSION}。`);
  }
  const sourceIssueCount = issues.length;
  const sourceRecord = validateMetadata(value.source, "source", issues);
  const sourceValid = sourceRecord && issues.length === sourceIssueCount;
  const targetIssueCount = issues.length;
  const targetRecord = validateMetadata(value.target, "target", issues);
  const targetValid = targetRecord && issues.length === targetIssueCount;

  const transform = value.transform;
  if (!isRecord(transform)) {
    issue(issues, "WAKE-GAUGE-TRANSFORM-MISSING", "transform", "必须声明从旧状态到新状态的复尺度。");
  } else if (transform.kind === "time-varying-complex") {
    issue(issues, "TIME-VARYING-WAKE-GAUGE", "transform.kind",
      "时间变规范需要额外的 dot(c)/c 状态连接项，本批不支持。");
  } else if (transform.kind !== "constant-complex") {
    issue(issues, "WAKE-GAUGE-TRANSFORM-KIND", "transform.kind", "仅支持 constant-complex 规范变换。");
  } else if (!finite(transform.real) || !finite(transform.imaginary)) {
    issue(issues, "WAKE-GAUGE-SCALE-NONFINITE", "transform", "复尺度的实部和虚部必须有限。");
  } else {
    const magnitudeSquared = transform.real ** 2 + transform.imaginary ** 2;
    if (!(magnitudeSquared > 0) || !Number.isFinite(magnitudeSquared)) {
      issue(issues, "WAKE-GAUGE-SCALE-SINGULAR", "transform", "复尺度必须有限且非零。");
    }
  }

  if (sourceValid && targetValid) {
    const source = value.source as WakeGaugeMetadata;
    const target = value.target as WakeGaugeMetadata;
    if (source.modelId !== target.modelId) {
      issue(issues, "WAKE-GAUGE-MODEL-MISMATCH", "target.modelId", "规范变换不能改变物理模型分支。");
    }
    if (stableJson(source.finiteSpanCoherence) !== stableJson(target.finiteSpanCoherence)) {
      issue(issues, "SPAN-CLOSURE-CHANGED", "target.finiteSpanCoherence",
        "常数复规范不能改变或消去有限跨相干闭合。");
    }
    if (source.output.referenceIdentity !== target.output.referenceIdentity) {
      issue(issues, "WAKE-OUTPUT-REFERENCE-CHANGED", "target.output.referenceIdentity",
        "参考面积/宽度改变需要独立量纲转换，不能由复规范推断。");
    }
    if (stableJson(source.coordinate.timeBasis) !== stableJson(target.coordinate.timeBasis)) {
      issue(issues, "WAKE-TIME-BASIS-CHANGED", "target.coordinate.timeBasis",
        "本批不支持同时改变时间标度。");
    }
    if (source.parameterNormalizationIdentity !== target.parameterNormalizationIdentity) {
      issue(issues, "WAKE-PARAMETER-NORMALIZATION-CHANGED", "target.parameterNormalizationIdentity",
        "生产 beta/gamma 归一化改变时不能直接套用常数复规范公式。");
    }
    for (const path of Object.keys(TRANSFORMED_PARAMETER_UNITS)) {
      if (source.parameterUnits[path] !== target.parameterUnits[path]) {
        issue(issues, "WAKE-PARAMETER-UNIT-CHANGED", `target.parameterUnits.${path}`,
          "本批不支持同时改变参数单位或时间标度。");
      }
    }
    const sourceHasCovariance = source.covarianceIdentity !== null;
    const targetHasCovariance = target.covarianceIdentity !== null;
    if (sourceHasCovariance !== targetHasCovariance) {
      issue(issues, "WAKE-COVARIANCE-PRESENCE-CHANGED", "target.covarianceIdentity",
        "规范迁移不能静默丢弃或凭空增加协方差；联合不确定度必须随同变换。");
    } else if (sourceHasCovariance
      && targetHasCovariance
      && isRecord(transform)
      && transform.kind === "constant-complex"
      && finite(transform.real)
      && finite(transform.imaginary)
      && (transform.real !== 1 || transform.imaginary !== 0)
      && source.covarianceIdentity === target.covarianceIdentity) {
      issue(issues, "WAKE-COVARIANCE-BASIS-UNCHANGED", "target.covarianceIdentity",
        "非平凡规范会改变参数坐标；联合协方差变换后必须使用新的参数基身份。");
    }
  }
  return Object.freeze({ pass: issues.length === 0, issues: Object.freeze(issues) });
}

function multiplyComplex(value: ComplexScale, scale: ComplexScale): ComplexScale {
  return {
    real: scale.real * value.real - scale.imaginary * value.imaginary,
    imaginary: scale.real * value.imaginary + scale.imaginary * value.real,
  };
}

function divideComplex(value: ComplexScale, divisor: ComplexScale): ComplexScale {
  const norm = divisor.real ** 2 + divisor.imaginary ** 2;
  return {
    real: (value.real * divisor.real + value.imaginary * divisor.imaginary) / norm,
    imaginary: (value.imaginary * divisor.real - value.real * divisor.imaginary) / norm,
  };
}

function assertFiniteConverted(path: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new WakeGaugeConversionError([{
      code: "WAKE-GAUGE-CONVERSION-NONFINITE",
      path,
      message: "规范变换产生了非有限值；拒绝写出不可执行配置。",
    }]);
  }
}

function assertUsableScale(scale: ComplexScale): void {
  const norm = scale.real ** 2 + scale.imaginary ** 2;
  if (!finite(scale.real) || !finite(scale.imaginary)
    || !(norm > 0) || !Number.isFinite(norm)) {
    throw new WakeGaugeConversionError([{
      code: "WAKE-GAUGE-SCALE-SINGULAR",
      path: "scale",
      message: "复尺度必须有限且非零。",
    }]);
  }
}

/** Transform only the wake coordinates of a state or derivative: A' = c A. */
export function transformWakeState<T extends WakeStateLike>(
  state: T,
  scale: ComplexScale,
): T {
  assertUsableScale(scale);
  const transformed = multiplyComplex({ real: state.wakeReal, imaginary: state.wakeImaginary }, scale);
  assertFiniteConverted("wakeReal", transformed.real);
  assertFiniteConverted("wakeImaginary", transformed.imaginary);
  return { ...state, wakeReal: transformed.real, wakeImaginary: transformed.imaginary };
}

/** Exact inverse c^-1 for round trips and migration receipts. */
export function invertConstantWakeGaugeTransform(
  transform: ConstantComplexWakeGaugeTransform,
): ConstantComplexWakeGaugeTransform {
  assertUsableScale(transform);
  const norm = transform.real ** 2 + transform.imaginary ** 2;
  return Object.freeze({
    kind: "constant-complex",
    real: transform.real / norm,
    imaginary: -transform.imaginary / norm,
  });
}

/**
 * Convert an executable config after validating complete source and target
 * metadata.  For A'=cA, gamma'=c gamma, beta'=beta/|c|^2 and L'=L/c.
 */
export function convertWakeGaugeConfig<T extends WakeGaugeConfigLike>(
  input: T,
  request: unknown,
): WakeGaugeConversionResult<T> {
  const validation = validateWakeGaugeConversionRequest(request);
  if (!validation.pass) throw new WakeGaugeConversionError(validation.issues);
  const checked = request as WakeGaugeConversionRequest;
  if (checked.transform.kind !== "constant-complex") {
    // Kept explicit for TypeScript's exhaustiveness when new transform kinds appear.
    throw new WakeGaugeConversionError([{
      code: "TIME-VARYING-WAKE-GAUGE",
      path: "transform.kind",
      message: "只实现常数复规范。",
    }]);
  }

  const inputIssues: WakeGaugeValidationIssue[] = [];
  const inputGaugeIssueCount = inputIssues.length;
  const inputGaugeRecord = validateMetadata(
    input.rom.wakeGauge,
    "input.rom.wakeGauge",
    inputIssues,
  );
  const inputGaugeValid = inputGaugeRecord && inputIssues.length === inputGaugeIssueCount;
  if (inputGaugeValid && stableJson(input.rom.wakeGauge) !== stableJson(checked.source)) {
    issue(inputIssues, "WAKE-GAUGE-SOURCE-MISMATCH", "input.rom.wakeGauge",
      "可执行配置声明的尾流规范与转换请求的 source 不一致。");
  }
  for (const path of CHANGED_PATHS) {
    const [section, name] = path.split(".") as ["rom" | "initial" | "solver", string];
    if (section === "solver" && input.solver === undefined) continue;
    const container = input[section] as Record<string, unknown>;
    if (!finite(container[name])) {
      issue(inputIssues, "WAKE-GAUGE-CONFIG-NONFINITE", `input.${path}`,
        "规范变换所需的源配置字段必须是有限数值。");
    }
  }
  if (finite(input.rom.liftOutputReal)
    && finite(input.rom.liftOutputImaginary)
    && Math.hypot(input.rom.liftOutputReal, input.rom.liftOutputImaginary) === 0) {
    issue(inputIssues, "WAKE-OUTPUT-CHANNEL-ZERO", "input.rom.liftOutputReal",
      "零输出通道不能由载荷恢复尾流规范；拒绝把坐标迁移记作已验证的物理等价包。");
  }
  if (inputIssues.length > 0) throw new WakeGaugeConversionError(inputIssues);

  const scale = checked.transform;
  const norm = scale.real ** 2 + scale.imaginary ** 2;
  const output = divideComplex({
    real: input.rom.liftOutputReal,
    imaginary: input.rom.liftOutputImaginary,
  }, scale);
  const couplingTheta = multiplyComplex({
    real: input.rom.couplingThetaReal,
    imaginary: input.rom.couplingThetaImaginary,
  }, scale);
  const couplingOmega = multiplyComplex({
    real: input.rom.couplingOmegaReal,
    imaginary: input.rom.couplingOmegaImaginary,
  }, scale);
  const couplingAcceleration = multiplyComplex({
    real: input.rom.couplingAccelerationReal,
    imaginary: input.rom.couplingAccelerationImaginary,
  }, scale);
  const initial = transformWakeState(input.initial, scale);
  const converted = structuredClone(input);
  Object.assign(converted.rom, {
    cubicSaturation: input.rom.cubicSaturation / norm,
    nonlinearFrequencyShift: input.rom.nonlinearFrequencyShift / norm,
    couplingThetaReal: couplingTheta.real,
    couplingThetaImaginary: couplingTheta.imaginary,
    couplingOmegaReal: couplingOmega.real,
    couplingOmegaImaginary: couplingOmega.imaginary,
    couplingAccelerationReal: couplingAcceleration.real,
    couplingAccelerationImaginary: couplingAcceleration.imaginary,
    liftOutputReal: output.real,
    liftOutputImaginary: output.imaginary,
    // This is an independent closure and is intentionally byte-for-byte preserved.
    finiteSpanCoherence: input.rom.finiteSpanCoherence,
    wakeGauge: structuredClone(checked.target),
  });
  Object.assign(converted.initial, initial);
  if (checked.source.covarianceIdentity !== null) {
    const model = input.rom.jointUncertainty;
    if (!model || model.basisId !== checked.source.covarianceIdentity) {
      throw new Error("declared covariance must be supplied in its source basis for gauge conversion");
    }
    converted.rom.jointUncertainty = transformJointUncertainty(model,
      constantWakeGaugeJacobian(model.parameterPaths, scale), {
        basisId: checked.target.covarianceIdentity!, parameterPaths: model.parameterPaths,
        parameterUnits: model.parameterUnits, parameterKinds: model.parameterKinds,
      });
  } else if (input.rom.jointUncertainty !== undefined) {
    throw new Error("undeclared joint covariance in source gauge");
  }
  if (converted.solver !== undefined) {
    converted.solver.absoluteToleranceWake = input.solver!.absoluteToleranceWake * Math.sqrt(norm);
  }

  for (const path of CHANGED_PATHS) {
    const [section, name] = path.split(".") as ["rom" | "initial" | "solver", string];
    if (section === "solver" && converted.solver === undefined) continue;
    const container = converted[section] as Record<string, unknown>;
    assertFiniteConverted(path, container[name] as number);
  }

  return Object.freeze({
    config: converted,
    metadata: converted.rom.wakeGauge!,
    audit: Object.freeze({
      schemaVersion: "VP-WAKE-GAUGE-CONVERSION-AUDIT-v1",
      sourceGaugeId: checked.source.id,
      targetGaugeId: checked.target.id,
      transform: Object.freeze({ ...scale }),
      changedPaths: CHANGED_PATHS,
      unchangedClosurePaths: Object.freeze(["rom.finiteSpanCoherence"] as const),
      covarianceHandling: checked.source.covarianceIdentity === null
        ? "absent"
        : "transformed-joint-covariance",
    }),
  });
}

/** Units required by the current executable normalized coefficient fields. */
export function executableWakeGaugeParameterUnits(): Readonly<Record<string, string>> {
  return TRANSFORMED_PARAMETER_UNITS;
}
