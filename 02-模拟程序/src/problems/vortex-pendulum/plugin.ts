import { cloneConfig, PARAMETER_SPECS, validateConfig } from "../../core/config";
import type {
  BackendCapability,
  ObservableSpec,
  ObservationRecord,
  PluginParameterSpec,
  ProblemPlugin,
  ProblemPluginManifest,
} from "../../core/plugin";
import type { BackendId, SimulationConfig, SimulationSample } from "../../core/types";

export const VORTEX_PENDULUM_MANIFEST: ProblemPluginManifest = {
  id: "iypt-2027-vortex-pendulum",
  version: "2.0.0",
  configSchemaVersion: "3.0.0",
  title: "IYPT 2027 第 13 题：涡流摆",
  shortTitle: "涡流摆",
  description: "部分浸没有限圆柱在水流中的横流摆动：前向复 Stuart–Landau 模型与二维截面流体参考。",
  competition: {
    name: "International Young Physicists’ Tournament",
    year: 2027,
    problemNumber: 13,
  },
  tags: ["fluid-structure interaction", "vortex-induced vibration", "pendulum"],
};

export const VORTEX_PENDULUM_PARAMETERS: readonly PluginParameterSpec<BackendId>[] =
  PARAMETER_SPECS.map((spec) => ({
    path: spec.path,
    label: spec.label,
    ...(spec.symbol === undefined ? {} : { symbol: spec.symbol }),
    description: spec.description,
    unit: spec.unit,
    category: spec.category,
    valueType: spec.valueType,
    ...(spec.min === undefined ? {} : { min: spec.min }),
    ...(spec.max === undefined ? {} : { max: spec.max }),
    ...(spec.step === undefined ? {} : { step: spec.step }),
    ...(spec.options === undefined ? {} : { options: spec.options }),
    ...(spec.backends === undefined ? {} : { backends: spec.backends }),
  }));

export const VORTEX_PENDULUM_OBSERVABLES: readonly ObservableSpec[] = [
  { id: "time", label: "时间", symbol: "t", unit: "s", description: "仿真或实验时间。", kind: "time-series", experimental: true },
  { id: "theta", label: "摆角", symbol: "θ", unit: "rad", description: "圆柱轴相对竖直方向的横流摆角。", kind: "time-series", experimental: true },
  { id: "omega", label: "角速度", symbol: "ω", unit: "rad/s", description: "摆角一阶导数。", kind: "time-series", experimental: true },
  { id: "angularAcceleration", label: "角加速度", symbol: "α", unit: "rad/s²", description: "摆角二阶导数。", kind: "time-series", experimental: true },
  { id: "displacement", label: "观测点横向位移", symbol: "y_obs", unit: "m", description: "配置所指定实体标记点的横流位移。", kind: "time-series", experimental: true },
  { id: "velocity", label: "观测点横向速度", symbol: "v_obs", unit: "m/s", description: "观测点横流速度。", kind: "time-series", experimental: true },
  { id: "wakeReal", label: "尾流实部", symbol: "A_R", unit: "1", description: "复 Stuart–Landau 模态实部。", kind: "time-series", experimental: false },
  { id: "wakeImaginary", label: "尾流虚部", symbol: "A_I", unit: "1", description: "复 Stuart–Landau 模态虚部。", kind: "time-series", experimental: false },
  { id: "wakeAmplitude", label: "尾流幅值", symbol: "|A|", unit: "1", description: "复尾流模态幅值。", kind: "time-series", experimental: false },
  { id: "wakePhase", label: "尾流相位", symbol: "arg A", unit: "rad", description: "零幅值时为 null。", kind: "time-series", experimental: false },
  { id: "liftCoefficient", label: "升力输出系数", symbol: "C_L", unit: "1", description: "当前单模态/相干闭合的升力输出。", kind: "time-series", experimental: false },
  { id: "dragCoefficient", label: "阻力系数", symbol: "C_D", unit: "1", description: "当前截面阻力闭合输入。", kind: "time-series", experimental: false },
  { id: "liftTorque", label: "升力矩", symbol: "Q_L", unit: "N·m", description: "分布升力对转轴的广义力矩。", kind: "time-series", experimental: false },
  { id: "dragTorque", label: "阻力矩", symbol: "Q_D", unit: "N·m", description: "分布相对流阻力的耗散力矩。", kind: "time-series", experimental: false },
  { id: "pitchingTorque", label: "直接俯仰力矩", symbol: "Q_M", unit: "N·m", description: "基线系数包中固定为零。", kind: "time-series", experimental: false },
  { id: "fluidTorque", label: "动态流体总力矩", symbol: "Q_f", unit: "N·m", description: "Q_D+Q_L+Q_M，不含静水浮力。", kind: "time-series", experimental: true },
  { id: "buoyancyTorque", label: "静水浮力矩", symbol: "Q_B", unit: "N·m", description: "精确平水面湿几何给出的静水力矩。", kind: "time-series", experimental: false },
  { id: "fluidPower", label: "legacy 动态流体功率字段", symbol: "P_f", unit: "W", description: "前向后端为 ROM 端口功；二维后端仅为终点 diagnostic legacy 量，不是本步 applied work。", kind: "time-series", experimental: false },
  { id: "dampingPower", label: "轴耗散功率", symbol: "P_s", unit: "W", description: "非负机械耗散率。", kind: "time-series", experimental: false },
  { id: "mechanicalEnergy", label: "机械能", symbol: "E_m", unit: "J", description: "动能、重力势、静水势和弹性势之和。", kind: "time-series", experimental: false },
  { id: "displacedVolume", label: "排水体积", symbol: "V_d", unit: "m³", description: "有限圆柱的精确平水面排水体积。", kind: "time-series", experimental: true },
  { id: "projectedWetArea", label: "湿投影面积", symbol: "A_perp", unit: "m²", description: "沿来流方向的精确湿投影面积。", kind: "time-series", experimental: false },
  { id: "flowSpeed", label: "来流速度", symbol: "U", unit: "m/s", description: "外缘均匀参考来流。", kind: "time-series", experimental: true },
  { id: "reynolds", label: "瞬时 Reynolds 数", symbol: "Re", unit: "1", description: "湿投影参考速度定义的瞬时 Reynolds 数。", kind: "time-series", experimental: false },
  { id: "lineForceX", label: "终点 diagnostic 二维流向线力", symbol: "F'_x", unit: "N/m", description: "legacy 终点重算量；不是前一格子步实际施力。", kind: "time-series", experimental: false },
  { id: "lineForceY", label: "终点 diagnostic 二维横流线力", symbol: "F'_y", unit: "N/m", description: "legacy 终点重算量；不是三维总力，也不是前一格子步 actual exchange。", kind: "time-series", experimental: false },
  { id: "linePower2d", label: "终点 diagnostic 二维线功率", symbol: "P'", unit: "W/m", description: "legacy 终点 F'_y v_b；不代替同一碰撞时层累计的 appliedRawLineWork。", kind: "time-series", experimental: false },
  { id: "stripTorqueDensity", label: "条带力矩密度", symbol: "q_i", unit: "N", description: "r_i cos(theta) F'_y；只有额外跨向闭合才能积分为 N·m。", kind: "time-series", experimental: false },
  { id: "appliedRawLineForceX", label: "本步实际 raw 流向线力", symbol: "F'_{x,raw}", unit: "N/m", description: "由本格子步真正消费的 Guo/Brinkman source 冲量除以步长得到；未做虚拟内部流体修正。", kind: "time-series", experimental: false },
  { id: "appliedRawLineForceY", label: "本步实际 raw 横流线力", symbol: "F'_{y,raw}", unit: "N/m", description: "与 appliedRawLineImpulseY 处于同一碰撞时层；未做虚拟内部流体修正。", kind: "time-series", experimental: false },
  { id: "appliedRawTorque", label: "本步实际 raw 代表条带力矩", symbol: "Q_{raw}", unit: "N·m", description: "只在 legacy weak-FSI 代表条带复制情景中构造；不是真实装置力矩。", kind: "time-series", experimental: false },
  { id: "appliedRawPower", label: "本步实际 raw 机械功率", symbol: "P_{raw}", unit: "W", description: "appliedRawWork/Δt；用于 A1 记账，不等于已验证的物理水动功。", kind: "time-series", experimental: false },
  { id: "cumulativeAppliedRawWork", label: "累计实际 raw 机械功", symbol: "W_{raw}", unit: "J", description: "逐格子步 appliedRawWork 的累加，不由低频输出点力重构。", kind: "time-series", experimental: false },
  { id: "forcePathRelativeDifference", label: "legacy 不完整应力圆周差", unit: "1", description: "只作历史诊断；圆周积分不是独立固体取力路径。", kind: "time-series", experimental: false },
  { id: "wetBranch", label: "湿润分支", unit: "1", description: "dry、partial 或 full；切换不重置连续状态。", kind: "event", experimental: false },
];

export const VORTEX_PENDULUM_BACKENDS: readonly BackendCapability<BackendId>[] = [
  {
    id: "forward",
    label: "前向理论数值计算",
    description: "直接求解 VP-FWD-P0-SL1-v1 四状态方程的自适应事件驱动后端。",
    fidelity: "forward",
    researchLayers: [1, 3],
    capabilities: {
      pauseResume: true,
      streamingSamples: true,
      fieldFrames: false,
      parameterSweep: true,
      deterministicSeed: true,
    },
    limitations: ["系数包需装置专属标定", "单尾流模态", "平水面湿几何"],
  },
  {
    id: "highFidelity",
    label: "二维截面流体参考",
    description: "求解 D2Q9 MRT 低 Mach Navier–Stokes 极限与弥散移动圆柱；A1 仅验证原始 Guo/Brinkman 交换记账。",
    fidelity: "high-fidelity",
    researchLayers: [2],
    capabilities: {
      pauseResume: true,
      streamingSamples: true,
      fieldFrames: true,
      parameterSweep: true,
      deterministicSeed: true,
    },
    limitations: ["二维单位跨长", "无真实自由面/端涡/跨向相干", "动态取力证据已撤销并等待 A2/B 重验"],
  },
];

export type VortexPendulumObservation = ObservationRecord & {
  readonly time: number;
  readonly theta: number;
  readonly omega: number;
  readonly angularAcceleration: number;
  readonly displacement: number;
  readonly velocity: number;
  readonly wakeReal: number;
  readonly wakeImaginary: number;
  readonly wakeAmplitude: number;
  readonly wakePhase: number | null;
  readonly liftCoefficient: number;
  readonly dragCoefficient: number;
  readonly liftTorque: number;
  readonly dragTorque: number;
  readonly pitchingTorque: number;
  readonly fluidTorque: number;
  readonly buoyancyTorque: number;
  readonly fluidPower: number;
  readonly dampingPower: number;
  readonly mechanicalEnergy: number;
  readonly displacedVolume: number;
  readonly projectedWetArea: number;
  readonly flowSpeed: number;
  readonly reynolds: number;
  readonly lineForceX: number | null;
  readonly lineForceY: number | null;
  readonly linePower2d: number | null;
  readonly stripTorqueDensity: number | null;
  readonly appliedRawLineForceX: number | null;
  readonly appliedRawLineForceY: number | null;
  readonly appliedRawTorque: number | null;
  readonly appliedRawPower: number | null;
  readonly cumulativeAppliedRawWork: number | null;
  readonly forcePathRelativeDifference: number | null;
  readonly wetBranch: string;
};

export const vortexPendulumObservationOperator = (
  sample: SimulationSample,
  _config: SimulationConfig,
): VortexPendulumObservation => ({
  time: sample.time,
  theta: sample.theta,
  omega: sample.omega,
  angularAcceleration: sample.angularAcceleration,
  displacement: sample.displacement,
  velocity: sample.velocity,
  wakeReal: sample.wakeReal,
  wakeImaginary: sample.wakeImaginary,
  wakeAmplitude: sample.wakeAmplitude,
  wakePhase: sample.wakePhase,
  liftCoefficient: sample.liftCoefficient,
  dragCoefficient: sample.dragCoefficient,
  liftTorque: sample.liftTorque,
  dragTorque: sample.dragTorque,
  pitchingTorque: sample.pitchingTorque,
  fluidTorque: sample.fluidTorque,
  buoyancyTorque: sample.buoyancyTorque,
  fluidPower: sample.fluidPower,
  dampingPower: sample.dampingPower,
  mechanicalEnergy: sample.mechanicalEnergy,
  displacedVolume: sample.displacedVolume,
  projectedWetArea: sample.projectedWetArea,
  flowSpeed: sample.flowSpeed,
  reynolds: sample.reynolds,
  lineForceX: sample.lineForceX,
  lineForceY: sample.lineForceY,
  linePower2d: sample.linePower2d,
  stripTorqueDensity: sample.stripTorqueDensity,
  appliedRawLineForceX: sample.interfaceExchange?.applied?.appliedRawLineForceX ?? null,
  appliedRawLineForceY: sample.interfaceExchange?.applied?.appliedRawLineForceY ?? null,
  appliedRawTorque: sample.interfaceExchange?.applied?.appliedRawTorque ?? null,
  appliedRawPower: sample.interfaceExchange?.applied?.appliedRawPower ?? null,
  cumulativeAppliedRawWork:
    sample.interfaceExchange?.cumulative.cumulativeAppliedRawWork ?? null,
  forcePathRelativeDifference: sample.forcePathRelativeDifference,
  wetBranch: sample.wetBranch,
});

export const VORTEX_PENDULUM_PLUGIN: ProblemPlugin<
  SimulationConfig,
  SimulationSample,
  VortexPendulumObservation,
  BackendId
> = {
  manifest: VORTEX_PENDULUM_MANIFEST,
  parameters: VORTEX_PENDULUM_PARAMETERS,
  observables: VORTEX_PENDULUM_OBSERVABLES,
  backends: VORTEX_PENDULUM_BACKENDS,
  createDefaultConfig: () => cloneConfig(),
  validateConfig,
  observe: vortexPendulumObservationOperator,
};
