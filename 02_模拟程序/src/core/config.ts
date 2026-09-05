import {
  buoyancyTorque,
  evaluateWetGeometry,
  validateP0Geometry,
} from "../problems/vortex-pendulum/geometry";
import type {
  ApplicabilityFinding,
  ApplicabilityReport,
  DerivedParameters,
  ParameterSpec,
  SimulationConfig,
  ValidationIssue,
} from "./types";
import { stableCanonicalJson } from "./canonical";

import { wetContractIssues } from "./wet-domain";
import { FORWARD_MODEL_IDS, forwardModelId, isDirectionalDragModel, isStickSlipModel } from "./forward-contract";
import { validateWakeGaugeMetadata } from "./wake-gauge";
import { validateJointUncertaintyModel } from "../experiments/uncertainty";

export const DEFAULT_CONFIG: SimulationConfig = {
  schemaVersion: "3.0.0",
  problemId: "iypt-2027-vortex-pendulum",
  backend: "forward",
  geometry: {
    topology: "P0",
    radius: 0.003,
    topDistance: 0.04,
    bottomDistance: 0.18,
    pivotHeight: 0.07,
    channelWidth: 0.15,
    waterDepth: 0.12,
    observationDistance: 0.13,
    maximumAngle: 0.55,
  },
  body: {
    movingMass: 0.035,
    centerOfMassDistance: 0.10,
    dryMomentOfInertia: 0.003,
  },
  fluid: {
    density: 998.2,
    kinematicViscosity: 1.004e-6,
    surfaceTension: 0.072,
    gravity: 9.80665,
    flowSpeed: 0.017,
    flowRampTime: 2,
    flowModulationAmplitude: 0,
    flowModulationFrequency: 0.1,
  },
  support: {
    referenceAngle: 0,
    linearStiffness: 0,
    cubicStiffness: 0,
    viscousDamping: 3e-5,
    coulombFriction: 0,
    frictionSmoothingSpeed: 0.01,
  },
  rom: {
    model: "complex-stuart-landau",
    coefficientSetId: "illustrative-literature-prior-v1",
    coefficientSource: "literature-prior",
    addedMassCoefficient: 1,
    sectionalDragCoefficient: 1.2,
    strouhalNumber: 0.2,
    referenceHopfReynolds: 47,
    hopfGrowthSlope: 0.05,
    cubicSaturation: 0.10,
    nonlinearFrequencyShift: 0.02,
    zeroFlowWakeDecayTime: 0.5,
    wakeActivationSpeed: 0.001,
    calibrationVelocityFloor: 0.01,
    couplingThetaReal: 0,
    couplingThetaImaginary: 0,
    couplingOmegaReal: 0.10,
    couplingOmegaImaginary: 0,
    couplingAccelerationReal: 0.08,
    couplingAccelerationImaginary: 0,
    liftOutputReal: 1.2,
    liftOutputImaginary: 0,
    finiteSpanCoherence: 0.65,
    calibrationMinReynolds: 0,
    calibrationMaxReynolds: 250,
    calibrationMaxAbsAngle: 0.35,
    calibrationMaxVelocityRatio: 3,
    calibrationMaxNormalizedInflowRate: 20,
  },
  cfd2d: {
    couplingMode: "fixed",
    stripAxialCoordinate: 0.13,
    stripClosure: "none",
    nx: 192,
    ny: 96,
    cylinderCells: 12,
    latticeVelocity: 0.05,
    stepsPerChunk: 20,
    fieldEvery: 160,
    sampleEvery: 10,
    penalizationTimeSteps: 1.5,
    prescribedAmplitude: 0.05,
    prescribedFrequency: 0.5,
  },
  initial: {
    theta: 0.01,
    omega: 0,
    wakeReal: 1e-3,
    wakeImaginary: 0,
    randomSeed: 2027,
  },
  solver: {
    duration: 12,
    initialStep: 0.001,
    minimumStep: 1e-7,
    maximumStep: 0.02,
    relativeTolerance: 1e-6,
    absoluteToleranceTheta: 1e-9,
    absoluteToleranceOmega: 1e-8,
    absoluteToleranceWake: 1e-8,
    outputInterval: 0.01,
    eventTimeTolerance: 1e-8,
    maxAcceptedSteps: 500_000,
    maxRejectedSteps: 50_000,
    transientFraction: 0.5,
    energyTolerance: 0.03,
  },
};

function n(
  path: string,
  label: string,
  unit: string,
  category: ParameterSpec["category"],
  min: number,
  max: number,
  step: number,
  description: string,
  options: { symbol?: string; backends?: ParameterSpec["backends"]; integer?: boolean } = {},
): ParameterSpec {
  return {
    path,
    label,
    unit,
    category,
    valueType: options.integer ? "integer" : "number",
    min,
    max,
    step,
    description,
    ...(options.symbol === undefined ? {} : { symbol: options.symbol }),
    ...(options.backends === undefined ? {} : { backends: options.backends }),
  };
}

export const PARAMETER_SPECS: readonly ParameterSpec[] = [
  n("geometry.radius", "圆柱半径", "m", "geometry", 0.0005, 0.05, 0.0005, "有限圆柱真实半径 R。", { symbol: "R" }),
  n("geometry.topDistance", "近端轴坐标", "m", "geometry", 0, 1, 0.001, "枢轴到圆柱近端盖中心的距离。", { symbol: "ℓₜ" }),
  n("geometry.bottomDistance", "远端轴坐标", "m", "geometry", 0.001, 2, 0.001, "枢轴到圆柱远端盖中心的距离。", { symbol: "ℓᵦ" }),
  n("geometry.pivotHeight", "枢轴离水面高度", "m", "geometry", -0.2, 1, 0.001, "未扰动平水面上方的枢轴高度 h_O。", { symbol: "h_O" }),
  n("geometry.channelWidth", "水槽宽度", "m", "geometry", 0.01, 3, 0.005, "真实水槽横向内宽；与数值截断域分开记录。", { symbol: "W" }),
  n("geometry.waterDepth", "水深", "m", "geometry", 0.005, 2, 0.005, "静止工况平均水深。", { symbol: "H" }),
  n("geometry.observationDistance", "观测点轴坐标", "m", "geometry", 0, 2, 0.001, "输出横向位移所对应的实体标记轴坐标；不是水动力力臂。", { symbol: "r_obs" }),
  n("geometry.maximumAngle", "机械止挡角", "rad", "geometry", 0.02, 1.45, 0.01, "超过后停止，避免未实现的碰壁/近水平分支。", { symbol: "θ_lim" }),

  n("body.movingMass", "随动总质量", "kg", "body", 1e-4, 20, 0.001, "圆柱、摆臂、配重和随动转子的实测总质量。", { symbol: "m" }),
  n("body.centerOfMassDistance", "质心力臂", "m", "body", 0, 2, 0.001, "枢轴到总成质心的实测距离。", { symbol: "L_G" }),
  n("body.dryMomentOfInertia", "干结构转动惯量", "kg·m²", "body", 1e-8, 20, 1e-5, "关于顺流固定轴的实测惯量，不能由单一摆长替代。", { symbol: "I_O" }),

  n("fluid.density", "流体密度", "kg/m³", "fluid", 1, 2000, 0.1, "实验温度下的流体密度。", { symbol: "ρ" }),
  n("fluid.kinematicViscosity", "运动黏度", "m²/s", "fluid", 1e-7, 1e-3, 1e-7, "实验温度和水质对应的运动黏度。", { symbol: "ν" }),
  n("fluid.surfaceTension", "表面张力", "N/m", "fluid", 0.001, 0.2, 0.001, "用于无量纲审计；当前两个执行后端均不解析动态接触线。", { symbol: "γ" }),
  n("fluid.gravity", "重力加速度", "m/s²", "fluid", 0.1, 30, 0.001, "实验地点的有效重力加速度。", { symbol: "g" }),
  n("fluid.flowSpeed", "来流速度", "m/s", "fluid", 0, 2, 0.001, "圆柱上游参考位置的轴向平均来流。", { symbol: "U" }),
  n("fluid.flowRampTime", "流速爬升时间", "s", "fluid", 0, 120, 0.1, "以半余弦从零平滑爬升到设定速度。"),
  n("fluid.flowModulationAmplitude", "流速调制深度", "1", "fluid", 0, 0.9, 0.01, "可选周期来流相对调制幅。"),
  n("fluid.flowModulationFrequency", "流速调制频率", "Hz", "fluid", 0, 20, 0.01, "可选周期来流调制频率。"),

  n("support.referenceAngle", "弹簧参考角", "rad", "support", -1, 1, 0.001, "扭转弹簧的零力矩角。", { symbol: "θ₀" }),
  n("support.linearStiffness", "线性扭转刚度", "N·m/rad", "support", 0, 20, 1e-4, "独立静态标定的线性扭转刚度。", { symbol: "k_θ" }),
  n("support.cubicStiffness", "立方扭转刚度", "N·m/rad³", "support", -100, 100, 0.001, "仅在无流多幅标定支持时启用。", { symbol: "k₃" }),
  n("support.viscousDamping", "轴系黏性阻尼", "N·m·s/rad", "support", 0, 2, 1e-6, "空气/静水自由衰减独立辨识的结构阻尼。", { symbol: "c_θ" }),
  n("support.coulombFriction", "库仑摩擦矩", "N·m", "support", 0, 2, 1e-6, "平滑基线的库仑摩擦闭合；SS 分支由导入配置的静/动阈值替换。", { symbol: "τ_c" }),
  n("support.frictionSmoothingSpeed", "摩擦平滑角速度", "rad/s", "support", 1e-6, 2, 1e-4, "tanh 库仑摩擦正则化尺度；不是静摩擦阈值。", { symbol: "ω_ε" }),

  n("rom.addedMassCoefficient", "截面附加质量系数", "1", "rom", 0, 5, 0.01, "ROM-energy 分支的条带势流候选闭合。", { symbol: "C_A", backends: ["forward"] }),
  n("rom.sectionalDragCoefficient", "截面阻力系数", "1", "rom", 0, 5, 0.01, "基于局部相对速度的准稳态耗散闭合。", { symbol: "C_D", backends: ["forward"] }),
  n("rom.strouhalNumber", "基准 Strouhal 数", "1", "rom", 0.03, 0.5, 0.001, "固定体一级尾流频率闭合，须按装置标定。", { symbol: "St", backends: ["forward"] }),
  n("rom.referenceHopfReynolds", "参考 Hopf Reynolds 数", "1", "rom", 1, 10000, 1, "仅用于候选 μ(Re) 参数函数；47 不是本装置普适阈值。", { symbol: "Re_H", backends: ["forward"] }),
  n("rom.hopfGrowthSlope", "Hopf 增长斜率", "1", "rom", 0, 5, 0.001, "μ/ω_s 对 (Re/Re_H-1) 的局部斜率。", { backends: ["forward"] }),
  n("rom.cubicSaturation", "SL 立方饱和", "1", "rom", 1e-4, 20, 0.001, "β_r/ω_s；正值只代表超临界候选分支。", { symbol: "β_r/ω_s", backends: ["forward"] }),
  n("rom.nonlinearFrequencyShift", "SL 非线性频移", "1", "rom", -10, 10, 0.001, "β_i/ω_s，需固定体幅频数据拆分。", { symbol: "β_i/ω_s", backends: ["forward"] }),
  n("rom.zeroFlowWakeDecayTime", "零流尾流衰减时间", "s", "rom", 1e-4, 100, 0.01, "U=0 时复尾流幅值的衰减时间 τ_w0。", { symbol: "τ_w0", backends: ["forward"] }),
  n("rom.wakeActivationSpeed", "尾流激活速度", "m/s", "rom", 1e-6, 1, 1e-4, "零流锚点与有流 SL 闭合之间的连续过渡尺度 U_a。", { symbol: "U_a", backends: ["forward"] }),
  n("rom.calibrationVelocityFloor", "标定守卫速度底数", "m/s", "rom", 1e-6, 2, 1e-4, "只用于标定域无量纲比的冻结 U_ε，不改变物理载荷。", { symbol: "U_ε", backends: ["forward"] }),
  n("rom.couplingThetaReal", "角度耦合实部", "1", "rom", -20, 20, 0.01, "R3 无量纲复系数 γ̂₀ 的实部。", { symbol: "Re γ̂₀", backends: ["forward"] }),
  n("rom.couplingThetaImaginary", "角度耦合虚部", "1", "rom", -20, 20, 0.01, "R3 无量纲复系数 γ̂₀ 的虚部。", { symbol: "Im γ̂₀", backends: ["forward"] }),
  n("rom.couplingOmegaReal", "角速度耦合实部", "1", "rom", -20, 20, 0.01, "R3 无量纲复系数 γ̂₁ 的实部。", { symbol: "Re γ̂₁", backends: ["forward"] }),
  n("rom.couplingOmegaImaginary", "角速度耦合虚部", "1", "rom", -20, 20, 0.01, "R3 无量纲复系数 γ̂₁ 的虚部。", { symbol: "Im γ̂₁", backends: ["forward"] }),
  n("rom.couplingAccelerationReal", "角加速度耦合实部", "1", "rom", -20, 20, 0.01, "R3 无量纲复系数 γ̂₂ 的实部；机械加速度先显式求解。", { symbol: "Re γ̂₂", backends: ["forward"] }),
  n("rom.couplingAccelerationImaginary", "角加速度耦合虚部", "1", "rom", -20, 20, 0.01, "R3 无量纲复系数 γ̂₂ 的虚部。", { symbol: "Im γ̂₂", backends: ["forward"] }),
  n("rom.liftOutputReal", "尾流升力输出实部", "1", "rom", -10, 10, 0.01, "C_L=Re(LA) 中 L 的实部。", { symbol: "Re L", backends: ["forward"] }),
  n("rom.liftOutputImaginary", "尾流升力输出虚部", "1", "rom", -10, 10, 0.01, "C_L=Re(LA) 中 L 的虚部。", { symbol: "Im L", backends: ["forward"] }),
  n("rom.finiteSpanCoherence", "有限跨相干因子", "1", "rom", 0, 1, 0.01, "经验缩放，未由三维/实验标定时只用于探索。", { backends: ["forward"] }),
  n("rom.calibrationMinReynolds", "标定域最小 Reynolds 数", "1", "rom", 0, 1e6, 1, "系数包允许的 Re 下界；零流锚点应显式包含。", { backends: ["forward"] }),
  n("rom.calibrationMaxReynolds", "标定域最大 Reynolds 数", "1", "rom", 1, 1e6, 1, "系数包允许的 Re 上界。", { backends: ["forward"] }),
  n("rom.calibrationMaxAbsAngle", "标定域最大摆角", "rad", "rom", 1e-4, 1.5, 0.01, "系数包允许的最大 |θ|。", { backends: ["forward"] }),
  n("rom.calibrationMaxVelocityRatio", "标定域最大速度比", "1", "rom", 1e-3, 100, 0.01, "ℓ_b|ω|/max(U,U_a) 的允许上界。", { backends: ["forward"] }),
  n("rom.calibrationMaxNormalizedInflowRate", "标定域最大来流变化率", "1", "rom", 1e-3, 1e4, 0.1, "|dU/dt|/[max(U,U_a)ω_ref] 的允许上界。", { backends: ["forward"] }),

  {
    path: "cfd2d.couplingMode",
    label: "二维圆柱运动模式",
    unit: "1",
    category: "cfd2d",
    valueType: "enum",
    options: ["fixed", "prescribed", "weak-fsi"],
    description: "默认固定圆柱；规定运动用于载荷相位验证；weak-fsi 只能与明示条带闭合同时使用。",
    backends: ["highFidelity"],
  },
  n("cfd2d.stripAxialCoordinate", "条带轴向坐标", "m", "cfd2d", 0, 2, 0.001, "P0 圆柱上映射到二维截面的材料站位 r_i。", { backends: ["highFidelity"] }),
  {
    path: "cfd2d.stripClosure",
    label: "条带三维闭合",
    unit: "1",
    category: "cfd2d",
    valueType: "enum",
    options: ["none", "fully-coherent-upper-bound"],
    description: "none 只输出原生 N/m、W/m 和 N；旧 fully-coherent-upper-bound 键只是代表条带完全相干复制情景，不是真实三维预测或功率上界。",
    backends: ["highFidelity"],
  },
  n("cfd2d.nx", "二维流向格点", "cell", "cfd2d", 64, 1024, 1, "二维参考问题的流向数值域。", { integer: true, backends: ["highFidelity"] }),
  n("cfd2d.ny", "二维横向格点", "cell", "cfd2d", 48, 512, 1, "二维参考问题的横向数值域。", { integer: true, backends: ["highFidelity"] }),
  n("cfd2d.cylinderCells", "直径格点数", "cell/D", "cfd2d", 8, 80, 1, "二维圆柱直径的格点分辨率。", { integer: true, backends: ["highFidelity"] }),
  n("cfd2d.latticeVelocity", "格子来流速度", "lu/step", "cfd2d", 0.005, 0.08, 0.001, "用于物理—格子唯一映射和低 Mach 审计。", { backends: ["highFidelity"] }),
  n("cfd2d.stepsPerChunk", "每批格子步", "step", "cfd2d", 1, 500, 1, "worker 每批推进步数。", { integer: true, backends: ["highFidelity"] }),
  n("cfd2d.fieldEvery", "流场帧步距", "step", "cfd2d", 1, 10000, 1, "相邻二维速度/涡量帧的格子步数。", { integer: true, backends: ["highFidelity"] }),
  n("cfd2d.sampleEvery", "时间序列步距", "step", "cfd2d", 1, 1000, 1, "相邻 CFD 力/运动样本的格子步数。", { integer: true, backends: ["highFidelity"] }),
  n("cfd2d.penalizationTimeSteps", "惩罚时间尺度", "Δt_lu", "cfd2d", 1, 50, 0.1, "Brinkman 松弛时间/格子步；不是可任意解释的裸强度。", { backends: ["highFidelity"] }),
  n("cfd2d.prescribedAmplitude", "规定运动角幅", "rad", "cfd2d", 0, 0.5, 0.001, "prescribed 模式的正弦角幅。", { backends: ["highFidelity"] }),
  n("cfd2d.prescribedFrequency", "规定运动频率", "Hz", "cfd2d", 0.01, 20, 0.01, "prescribed 模式的频率。", { backends: ["highFidelity"] }),

  n("initial.theta", "初始摆角", "rad", "initial", -1, 1, 0.001, "P0 横流角初值。", { symbol: "θ(0)" }),
  n("initial.omega", "初始角速度", "rad/s", "initial", -20, 20, 0.01, "P0 角速度初值。", { symbol: "ω(0)" }),
  n("initial.wakeReal", "尾流实部初值", "1", "initial", -5, 5, 0.001, "SL 复幅值初值，不能在超临界时隐式固定为零。", { backends: ["forward"] }),
  n("initial.wakeImaginary", "尾流虚部初值", "1", "initial", -5, 5, 0.001, "SL 复幅值相位初值。", { backends: ["forward"] }),
  n("initial.randomSeed", "随机种子", "1", "initial", 0, 4294967295, 1, "显式扰动的可复现种子；seed 不等于完整数值确定性。", { integer: true }),

  n("solver.duration", "仿真时长", "s", "solver", 0.1, 300, 0.1, "运行的物理时间长度。"),
  n("solver.initialStep", "初始试探步长", "s", "solver", 1e-8, 1, 1e-4, "Dormand–Prince 5(4) 的首个试探步长。", { backends: ["forward"] }),
  n("solver.minimumStep", "最小允许步长", "s", "solver", 1e-12, 0.1, 1e-7, "误差控制仍要求更小步长时结构化终止。", { backends: ["forward"] }),
  n("solver.maximumStep", "最大允许步长", "s", "solver", 1e-7, 5, 0.001, "自适应积分器步长上限。", { backends: ["forward"] }),
  n("solver.relativeTolerance", "相对误差容差", "1", "solver", 1e-12, 0.1, 1e-6, "四状态共同的局部相对误差容差。", { backends: ["forward"] }),
  n("solver.absoluteToleranceTheta", "摆角绝对容差", "rad", "solver", 1e-15, 1e-2, 1e-9, "摆角分量的绝对误差尺度。", { backends: ["forward"] }),
  n("solver.absoluteToleranceOmega", "角速度绝对容差", "rad/s", "solver", 1e-15, 1e-1, 1e-8, "角速度分量的绝对误差尺度。", { backends: ["forward"] }),
  n("solver.absoluteToleranceWake", "尾流状态绝对容差", "1", "solver", 1e-15, 1e-1, 1e-8, "复尾流实部、虚部共用的绝对误差尺度。", { backends: ["forward"] }),
  n("solver.outputInterval", "统一输出间隔", "s", "solver", 1e-6, 2, 0.001, "通过截断内部步得到的严格均匀输出网格。"),
  n("solver.eventTimeTolerance", "事件时间容差", "s", "solver", 1e-12, 0.1, 1e-8, "终止事件根定位的时间宽度容差。", { backends: ["forward"] }),
  n("solver.maxAcceptedSteps", "最大接受步数", "step", "solver", 1, 10000000, 1, "防止不受控长运行的接受步计数门。", { integer: true, backends: ["forward"] }),
  n("solver.maxRejectedSteps", "最大拒绝步数", "step", "solver", 0, 10000000, 1, "持续步长拒绝的结构化失败门。", { integer: true, backends: ["forward"] }),
  n("solver.transientFraction", "瞬态舍弃比例", "1", "solver", 0, 0.95, 0.01, "指标窗口起点；比较时随结果保存。"),
  n("solver.energyTolerance", "能量闭合相对容差", "1", "solver", 1e-5, 1, 0.001, "数值能量残差门，不代表实验模型误差。"),
];

export function cloneConfig(config: SimulationConfig = DEFAULT_CONFIG): SimulationConfig {
  return structuredClone(config);
}

export function flowSpeedAt(config: SimulationConfig, time: number): number {
  const { flowSpeed, flowRampTime, flowModulationAmplitude, flowModulationFrequency } = config.fluid;
  const ramp = flowRampTime <= 0
    ? 1
    : time >= flowRampTime
      ? 1
      : 0.5 * (1 - Math.cos(Math.PI * Math.max(0, time) / flowRampTime));
  const modulation = 1 + flowModulationAmplitude * Math.sin(TWO_PI * flowModulationFrequency * time);
  return Math.max(0, flowSpeed * ramp * modulation);
}

/** Analytic derivative of the declared half-cosine-ramp/modulated inflow. */
export function flowSpeedDerivativeAt(config: SimulationConfig, time: number): number {
  const { flowSpeed, flowRampTime, flowModulationAmplitude, flowModulationFrequency } = config.fluid;
  const clampedTime = Math.max(0, time);
  const ramp = flowRampTime <= 0 || clampedTime >= flowRampTime
    ? 1
    : 0.5 * (1 - Math.cos(Math.PI * clampedTime / flowRampTime));
  const rampDerivative = flowRampTime > 0 && clampedTime > 0 && clampedTime < flowRampTime
    ? 0.5 * Math.PI / flowRampTime * Math.sin(Math.PI * clampedTime / flowRampTime)
    : 0;
  const modulationAngle = TWO_PI * flowModulationFrequency * clampedTime;
  const modulation = 1 + flowModulationAmplitude * Math.sin(modulationAngle);
  const modulationDerivative = flowModulationAmplitude
    * TWO_PI
    * flowModulationFrequency
    * Math.cos(modulationAngle);
  return flowSpeed * (rampDerivative * modulation + ramp * modulationDerivative);
}

const TWO_PI = 2 * Math.PI;

function numericDerivative(fn: (value: number) => number, at: number, step = 1e-5): number {
  return (fn(at + step) - fn(at - step)) / (2 * step);
}

export function deriveParameters(config: SimulationConfig): DerivedParameters {
  const { geometry: g, body: b, fluid: f, support: s, rom, cfd2d } = config;
  const geometry = {
    radius: g.radius,
    topDistance: g.topDistance,
    bottomDistance: g.bottomDistance,
    pivotHeight: g.pivotHeight,
  };
  const wet0 = evaluateWetGeometry(0, geometry);
  const cylinderDiameter = 2 * g.radius;
  const cylinderLength = g.bottomDistance - g.topDistance;
  const displacedMass = f.density * wet0.displacedVolume;
  const gravityStiffness = b.movingMass * f.gravity * b.centerOfMassDistance;
  const hydrostaticStiffness = -numericDerivative(
    (theta) => buoyancyTorque(theta, geometry, f.density, f.gravity),
    0,
  );
  const structuralStiffness = gravityStiffness + s.linearStiffness;
  const totalLinearStiffness = structuralStiffness + hydrostaticStiffness;
  const addedMomentOfInertia = rom.addedMassCoefficient * f.density * wet0.axialSecondMoment;
  const effectiveMomentOfInertia = b.dryMomentOfInertia + addedMomentOfInertia;
  const romPriorReferenceAngularFrequency = totalLinearStiffness > 0 && effectiveMomentOfInertia > 0
    ? Math.sqrt(totalLinearStiffness / effectiveMomentOfInertia)
    : 0;
  const romPriorReferenceFrequency = romPriorReferenceAngularFrequency / TWO_PI;
  const romPriorReferenceReducedVelocity = romPriorReferenceFrequency > 0
    ? f.flowSpeed / (romPriorReferenceFrequency * cylinderDiameter)
    : Number.POSITIVE_INFINITY;
  const mechanicalHydrostaticNominalAngularFrequency = totalLinearStiffness > 0
    && b.dryMomentOfInertia > 0
    ? Math.sqrt(totalLinearStiffness / b.dryMomentOfInertia)
    : 0;
  const mechanicalHydrostaticNominalFrequency = mechanicalHydrostaticNominalAngularFrequency
    / TWO_PI;
  const referenceReducedVelocity = mechanicalHydrostaticNominalFrequency > 0
    ? f.flowSpeed / (mechanicalHydrostaticNominalFrequency * cylinderDiameter)
    : Number.POSITIVE_INFINITY;
  // Legacy aliases remain byte-for-byte compatible with the old ROM-prior
  // definitions. New GUI/provenance must use the explicitly scoped fields.
  const naturalAngularFrequency = romPriorReferenceAngularFrequency;
  const naturalFrequency = romPriorReferenceFrequency;
  const sheddingFrequency = cylinderDiameter > 0
    ? rom.strouhalNumber * f.flowSpeed / cylinderDiameter
    : 0;
  const reynolds = f.kinematicViscosity > 0
    ? f.flowSpeed * cylinderDiameter / f.kinematicViscosity
    : Number.POSITIVE_INFINITY;
  const reducedVelocity = romPriorReferenceReducedVelocity;
  const displacedInertia = f.density * wet0.axialSecondMoment;
  const inertiaRatio = displacedInertia > 0 ? b.dryMomentOfInertia / displacedInertia : Number.POSITIVE_INFINITY;
  const dx = cylinderDiameter / cfd2d.cylinderCells;
  const nominalLatticeTimeStep = f.flowSpeed > 0
    ? cfd2d.latticeVelocity * dx / f.flowSpeed
    : 0;
  // Resolve an integer number of lattice steps so the requested SI duration is
  // reached exactly.  The resulting U_lu never exceeds the configured ceiling.
  const resolvedLatticeSteps = nominalLatticeTimeStep > 0
    ? Math.max(1, Math.ceil(config.solver.duration / nominalLatticeTimeStep))
    : 0;
  const latticeTimeStep = resolvedLatticeSteps > 0
    ? config.solver.duration / resolvedLatticeSteps
    : 0;
  const resolvedLatticeVelocity = dx > 0 ? f.flowSpeed * latticeTimeStep / dx : 0;
  const latticeRelaxationTime = latticeTimeStep > 0
    ? 0.5 + 3 * f.kinematicViscosity * latticeTimeStep / (dx * dx)
    : Number.POSITIVE_INFINITY;
  const latticeMach = Math.sqrt(3) * resolvedLatticeVelocity;
  return {
    cylinderDiameter,
    cylinderLength,
    equilibriumWetLength: wet0.volumeEquivalentLength,
    displacedMass,
    structuralStiffness,
    hydrostaticStiffness,
    totalLinearStiffness,
    addedMomentOfInertia,
    effectiveMomentOfInertia,
    naturalAngularFrequency,
    naturalFrequency,
    mechanicalHydrostaticNominalAngularFrequency,
    mechanicalHydrostaticNominalFrequency,
    referenceReducedVelocity,
    romPriorReferenceAngularFrequency,
    romPriorReferenceFrequency,
    romPriorReferenceReducedVelocity,
    cfdIdentifiedSectionalAddedInertia: null,
    cfdScenarioEffectiveNaturalFrequency: null,
    cfdScenarioReducedVelocity: null,
    sheddingFrequency,
    reynolds,
    reducedVelocity,
    inertiaRatio,
    blockageRatio: cylinderDiameter / g.channelWidth,
    areaBlockageRatio: cylinderDiameter * wet0.volumeEquivalentLength / (g.channelWidth * g.waterDepth),
    submergedAspectRatio: wet0.volumeEquivalentLength / cylinderDiameter,
    diameterFroude: f.flowSpeed / Math.sqrt(f.gravity * cylinderDiameter),
    depthFroude: f.flowSpeed / Math.sqrt(f.gravity * g.waterDepth),
    weber: f.density * f.flowSpeed ** 2 * cylinderDiameter / f.surfaceTension,
    bond: f.density * f.gravity * cylinderDiameter ** 2 / f.surfaceTension,
    scrutonLike: 2 * inertiaRatio * (
      romPriorReferenceAngularFrequency > 0
        ? s.viscousDamping / (2 * effectiveMomentOfInertia * romPriorReferenceAngularFrequency)
        : 0
    ),
    latticeTimeStep,
    latticeRelaxationTime,
    latticeMach,
  };
}

function requireFinitePositive(issues: ValidationIssue[], value: number, path: string, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    issues.push({ severity: "error", path, message: `${label}必须是有限正数。` });
  }
}

export function validateConfig(config: SimulationConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { geometry: g, body: b, fluid: f, support: s, rom, cfd2d, initial, solver } = config;
  if (config.schemaVersion !== "3.0.0") {
    issues.push({ severity: "error", path: "schemaVersion", message: "配置必须使用 3.0.0 数据契约。" });
  }
  if (config.problemId !== "iypt-2027-vortex-pendulum") {
    issues.push({ severity: "error", path: "problemId", message: "配置题目标识不匹配。" });
  }
  if (config.backend !== "forward" && config.backend !== "highFidelity") {
    issues.push({ severity: "error", path: "backend", message: "未知计算后端。" });
  }
  if (config.backend === "forward") {
    if (!FORWARD_MODEL_IDS.includes(forwardModelId(config))) {
      issues.push({ severity: "error", path: "rom.modelId", message: "未知前向物理分支。" });
    }
    for (const message of wetContractIssues(rom)) {
      issues.push({ severity: "error", path: "rom.wetSupportMode", message });
    }
    if (rom.wakeGauge !== undefined) {
      for (const issue of validateWakeGaugeMetadata(rom.wakeGauge).issues) {
        issues.push({ severity: "error", path: `rom.${issue.path}`, message: issue.message });
      }
      if (rom.wakeGauge.modelId !== forwardModelId(config)
        || rom.wakeGauge.output?.kind !== "sectional-lift-coefficient"
        || rom.wakeGauge.output?.unit !== "1"
        || rom.wakeGauge.output?.expression !== "finiteSpanCoherence*Re(liftOutput*A)"
        || rom.wakeGauge.parameterNormalizationIdentity !== "VP-FWD-P0-SL1-production-normalization-v1"
        || rom.wakeGauge.finiteSpanCoherence?.representation !== "constant-factor") {
        issues.push({ severity: "error", path: "rom.wakeGauge",
          message: "规范身份必须匹配当前物理分支、无量纲截面输出和明示常数跨距闭合。" });
      }
    } else if (rom.wetSupportMode !== undefined && rom.wetSupportMode !== "legacy-unqualified") {
      issues.push({ severity: "error", path: "rom.wakeGauge", message: "新湿区运行必须显式记录尾流坐标与输出规范。" });
    }
    if (rom.jointUncertainty !== undefined) {
      try {
        validateJointUncertaintyModel(rom.jointUncertainty, { requireFormalParameterPaths: true });
        for (const [index, path] of rom.jointUncertainty.parameterPaths.entries()) {
          const value = path.split(".").reduce<any>((v, key) => v?.[key], config);
          const mean = rom.jointUncertainty.means[index]!;
          if (typeof value !== "number" || Math.abs(value - mean) > 1e-12 * Math.max(1, Math.abs(value), Math.abs(mean))) {
            throw new Error(`联合均值与配置值不匹配：${path}`);
          }
        }
        if (rom.wakeGauge?.covarianceIdentity !== rom.jointUncertainty.basisId) {
          throw new Error("尾流规范的 covarianceIdentity 与联合协方差 basisId 不匹配。");
        }
      } catch (error) {
        issues.push({ severity: "error", path: "rom.jointUncertainty", message: String(error) });
      }
    } else if (rom.wakeGauge?.covarianceIdentity != null) {
      issues.push({ severity: "error", path: "rom.jointUncertainty", message: "规范声明了协方差身份，但缺少绑定矩阵。" });
    }
    if (forwardModelId(config) !== "VP-FWD-P0-SL1-v1"
      && (rom.wetSupportMode === undefined || rom.wetSupportMode === "legacy-unqualified")) {
      issues.push({ severity: "error", path: "rom.wetSupportMode", message: "新分支必须显式声明完整湿区，不能继承 legacy 适用域。" });
    }
    const width = isDirectionalDragModel(config) ? "relative-flow-normal-wet-width" : "streamwise-wet-width";
    if ((rom.dragWidthDefinition !== undefined && rom.dragWidthDefinition !== width)
      || (isDirectionalDragModel(config) && rom.dragWidthDefinition !== width)) {
      issues.push({ severity: "error", path: "rom.dragWidthDefinition", message: "阻力系数参考湿宽与选择的模型分支不匹配。" });
    }
    if (isStickSlipModel(config)) {
      if (typeof s.staticFrictionTorque !== "number" || !Number.isFinite(s.staticFrictionTorque)
        || typeof s.kineticFrictionTorque !== "number" || !Number.isFinite(s.kineticFrictionTorque)
        || s.kineticFrictionTorque < 0 || s.staticFrictionTorque < s.kineticFrictionTorque) {
        issues.push({ severity: "error", path: "support.staticFrictionTorque",
          message: "SS 必须给出有限静/动阈值，且静阈值≥动阈值≥0（N m）。" });
      }
    }
  }
  try {
    validateP0Geometry(g);
  } catch (error) {
    issues.push({ severity: "error", path: "geometry", message: error instanceof Error ? error.message : String(error) });
    return issues;
  }
  for (const [value, path, label] of [
    [g.channelWidth, "geometry.channelWidth", "水槽宽度"],
    [g.waterDepth, "geometry.waterDepth", "水深"],
    [b.movingMass, "body.movingMass", "随动质量"],
    [b.dryMomentOfInertia, "body.dryMomentOfInertia", "干转动惯量"],
    [f.density, "fluid.density", "流体密度"],
    [f.kinematicViscosity, "fluid.kinematicViscosity", "运动黏度"],
    [f.surfaceTension, "fluid.surfaceTension", "表面张力"],
    [f.gravity, "fluid.gravity", "重力加速度"],
    [rom.strouhalNumber, "rom.strouhalNumber", "Strouhal 数"],
    [rom.referenceHopfReynolds, "rom.referenceHopfReynolds", "参考 Hopf Reynolds 数"],
    [rom.cubicSaturation, "rom.cubicSaturation", "SL 立方饱和系数"],
    [rom.zeroFlowWakeDecayTime, "rom.zeroFlowWakeDecayTime", "零流尾流衰减时间"],
    [rom.wakeActivationSpeed, "rom.wakeActivationSpeed", "尾流激活速度"],
    [rom.calibrationVelocityFloor, "rom.calibrationVelocityFloor", "标定守卫速度底数"],
    [rom.calibrationMaxReynolds, "rom.calibrationMaxReynolds", "标定域最大 Reynolds 数"],
    [rom.calibrationMaxAbsAngle, "rom.calibrationMaxAbsAngle", "标定域最大摆角"],
    [rom.calibrationMaxVelocityRatio, "rom.calibrationMaxVelocityRatio", "标定域最大速度比"],
    [rom.calibrationMaxNormalizedInflowRate, "rom.calibrationMaxNormalizedInflowRate", "标定域最大来流变化率"],
    [solver.duration, "solver.duration", "仿真时长"],
    [solver.initialStep, "solver.initialStep", "初始试探步长"],
    [solver.minimumStep, "solver.minimumStep", "最小允许步长"],
    [solver.maximumStep, "solver.maximumStep", "最大允许步长"],
    [solver.relativeTolerance, "solver.relativeTolerance", "相对容差"],
    [solver.absoluteToleranceTheta, "solver.absoluteToleranceTheta", "摆角绝对容差"],
    [solver.absoluteToleranceOmega, "solver.absoluteToleranceOmega", "角速度绝对容差"],
    [solver.absoluteToleranceWake, "solver.absoluteToleranceWake", "尾流绝对容差"],
    [solver.outputInterval, "solver.outputInterval", "输出间隔"],
    [solver.eventTimeTolerance, "solver.eventTimeTolerance", "事件时间容差"],
    [solver.energyTolerance, "solver.energyTolerance", "能量容差"],
  ] as const) requireFinitePositive(issues, value, path, label);
  if (config.backend !== "forward" || !isStickSlipModel(config)) {
    requireFinitePositive(issues, s.frictionSmoothingSpeed, "support.frictionSmoothingSpeed", "摩擦平滑角速度");
  }

  if (!(g.maximumAngle > 0 && g.maximumAngle < Math.PI / 2)) {
    issues.push({ severity: "error", path: "geometry.maximumAngle", message: "机械止挡角必须位于 (0,π/2)。" });
  }
  if (!Number.isFinite(g.observationDistance)
    || g.observationDistance < g.topDistance
    || g.observationDistance > g.bottomDistance) {
    issues.push({ severity: "error", path: "geometry.observationDistance", message: "观测点轴坐标必须位于有限圆柱轴段内。" });
  }
  if (Math.abs(initial.theta) >= g.maximumAngle) {
    issues.push({ severity: "error", path: "initial.theta", message: "初始角已达到或超过机械止挡。" });
  }
  if (f.flowSpeed < 0 || !Number.isFinite(f.flowSpeed)) {
    issues.push({ severity: "error", path: "fluid.flowSpeed", message: "来流速度必须是有限非负数。" });
  }
  if (f.flowModulationAmplitude < 0 || f.flowModulationAmplitude >= 1) {
    issues.push({ severity: "error", path: "fluid.flowModulationAmplitude", message: "流速调制深度必须位于 [0,1)。" });
  }
  if (!Number.isFinite(f.flowRampTime) || f.flowRampTime < 0
    || !Number.isFinite(f.flowModulationFrequency) || f.flowModulationFrequency < 0) {
    issues.push({ severity: "error", path: "fluid", message: "来流爬升时间和调制频率必须是有限非负数。" });
  }
  if (b.centerOfMassDistance < 0 || !Number.isFinite(b.centerOfMassDistance)) {
    issues.push({ severity: "error", path: "body.centerOfMassDistance", message: "质心距离必须是有限非负数。" });
  }
  if (!Number.isFinite(s.referenceAngle) || !Number.isFinite(s.cubicStiffness)) {
    issues.push({ severity: "error", path: "support", message: "弹簧参考角和立方刚度必须有限。" });
  }
  for (const [value, path, label] of [
    [s.linearStiffness, "support.linearStiffness", "线性刚度"],
    [s.viscousDamping, "support.viscousDamping", "黏性阻尼"],
    [s.coulombFriction, "support.coulombFriction", "库仑摩擦"],
    [rom.addedMassCoefficient, "rom.addedMassCoefficient", "附加质量系数"],
    [rom.sectionalDragCoefficient, "rom.sectionalDragCoefficient", "阻力系数"],
    [rom.hopfGrowthSlope, "rom.hopfGrowthSlope", "Hopf 增长斜率"],
    [rom.calibrationMinReynolds, "rom.calibrationMinReynolds", "标定域最小 Reynolds 数"],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      issues.push({ severity: "error", path, message: `${label}必须是有限非负数。` });
    }
  }
  if (rom.finiteSpanCoherence < 0 || rom.finiteSpanCoherence > 1) {
    issues.push({ severity: "error", path: "rom.finiteSpanCoherence", message: "有限跨相干因子必须位于 [0,1]。" });
  }
  if (!(rom.calibrationMaxReynolds > rom.calibrationMinReynolds)) {
    issues.push({ severity: "error", path: "rom.calibrationMaxReynolds", message: "标定域 Reynolds 数上界必须大于下界。" });
  }
  for (const [value, path] of [
    [initial.theta, "initial.theta"],
    [initial.omega, "initial.omega"],
    [initial.wakeReal, "initial.wakeReal"],
    [initial.wakeImaginary, "initial.wakeImaginary"],
    [rom.couplingThetaReal, "rom.couplingThetaReal"],
    [rom.couplingThetaImaginary, "rom.couplingThetaImaginary"],
    [rom.couplingOmegaReal, "rom.couplingOmegaReal"],
    [rom.couplingOmegaImaginary, "rom.couplingOmegaImaginary"],
    [rom.couplingAccelerationReal, "rom.couplingAccelerationReal"],
    [rom.couplingAccelerationImaginary, "rom.couplingAccelerationImaginary"],
    [rom.liftOutputReal, "rom.liftOutputReal"],
    [rom.liftOutputImaginary, "rom.liftOutputImaginary"],
    [rom.nonlinearFrequencyShift, "rom.nonlinearFrequencyShift"],
    [rom.finiteSpanCoherence, "rom.finiteSpanCoherence"],
  ] as const) {
    if (!Number.isFinite(value)) issues.push({ severity: "error", path, message: "初值必须有限。" });
  }
  if (!Number.isInteger(initial.randomSeed) || initial.randomSeed < 0 || initial.randomSeed > 0xffff_ffff) {
    issues.push({ severity: "error", path: "initial.randomSeed", message: "随机种子必须是 32 位无符号整数。" });
  }
  if (!(solver.minimumStep <= solver.initialStep && solver.initialStep <= solver.maximumStep)) {
    issues.push({ severity: "error", path: "solver", message: "步长必须满足 minimumStep ≤ initialStep ≤ maximumStep。" });
  }
  if (!Number.isInteger(solver.maxAcceptedSteps) || solver.maxAcceptedSteps <= 0
    || !Number.isInteger(solver.maxRejectedSteps) || solver.maxRejectedSteps < 0) {
    issues.push({ severity: "error", path: "solver", message: "最大接受步数须为正整数，最大拒绝步数须为非负整数。" });
  }
  if (solver.transientFraction < 0 || solver.transientFraction >= 1) {
    issues.push({ severity: "error", path: "solver.transientFraction", message: "瞬态舍弃比例必须位于 [0,1)。" });
  }

  const wet0 = evaluateWetGeometry(0, g);
  if (wet0.branch !== "partial") {
    issues.push({ severity: "warning", path: "geometry.pivotHeight", message: `θ=0 时圆柱为 ${wet0.branch}，与官方研究的部分浸没基准不一致。` });
  }
  const d = deriveParameters(config);
  if (!(d.totalLinearStiffness > 0)) {
    issues.push({ severity: "error", path: "body", message: "θ=0 的重力—静水—弹簧切线刚度非正，下垂平衡分支不稳定。" });
  }
  if (Math.abs(s.referenceAngle) > 1e-12) {
    issues.push({ severity: "warning", path: "support.referenceAngle", message: "当前派生固有频率在线性化 θ=0 处报告；非零弹簧参考角应先数值求真实静平衡。" });
  }
  if (d.blockageRatio > 0.1) {
    issues.push({ severity: "warning", path: "geometry.channelWidth", message: `D/W=${d.blockageRatio.toFixed(3)}，槽壁效应需要显式研究。` });
  }
  if (d.submergedAspectRatio < 8) {
    issues.push({ severity: "warning", path: "geometry.pivotHeight", message: `L_w/D=${d.submergedAspectRatio.toFixed(2)}，端区可能覆盖大部分湿跨。` });
  }

  if (config.backend === "highFidelity") {
    if (!(f.flowSpeed > 0)) {
      issues.push({ severity: "error", path: "fluid.flowSpeed", message: "二维 LBM 物理—格子映射要求正来流速度。" });
    }
    for (const [value, path, label] of [
      [cfd2d.nx, "cfd2d.nx", "流向格点"],
      [cfd2d.ny, "cfd2d.ny", "横向格点"],
      [cfd2d.cylinderCells, "cfd2d.cylinderCells", "直径格点数"],
      [cfd2d.stepsPerChunk, "cfd2d.stepsPerChunk", "批步数"],
      [cfd2d.fieldEvery, "cfd2d.fieldEvery", "场输出步距"],
      [cfd2d.sampleEvery, "cfd2d.sampleEvery", "样本步距"],
    ] as const) {
      if (!Number.isInteger(value) || value <= 0) {
        issues.push({ severity: "error", path, message: `${label}必须是正整数。` });
      }
    }
    if (!["fixed", "prescribed", "weak-fsi"].includes(cfd2d.couplingMode)) {
      issues.push({ severity: "error", path: "cfd2d.couplingMode", message: "未知的二维圆柱运动模式。" });
    }
    if (!["none", "fully-coherent-upper-bound"].includes(cfd2d.stripClosure)) {
      issues.push({ severity: "error", path: "cfd2d.stripClosure", message: "未知的条带闭合模式。" });
    }
    if (!(cfd2d.latticeVelocity > 0) || !Number.isFinite(cfd2d.latticeVelocity)) {
      issues.push({ severity: "error", path: "cfd2d.latticeVelocity", message: "格子来流速度上限必须是有限正数。" });
    }
    if (!(cfd2d.penalizationTimeSteps >= 1) || !Number.isFinite(cfd2d.penalizationTimeSteps)) {
      issues.push({ severity: "error", path: "cfd2d.penalizationTimeSteps", message: "Brinkman 惩罚时间尺度必须有限且不小于 1 格子步。" });
    }
    if (!(cfd2d.prescribedAmplitude >= 0) || !Number.isFinite(cfd2d.prescribedAmplitude)) {
      issues.push({ severity: "error", path: "cfd2d.prescribedAmplitude", message: "规定运动角幅必须是有限非负数。" });
    }
    if (!(cfd2d.prescribedFrequency > 0) || !Number.isFinite(cfd2d.prescribedFrequency)) {
      issues.push({ severity: "error", path: "cfd2d.prescribedFrequency", message: "规定运动频率必须是有限正数。" });
    }
    if (cfd2d.couplingMode === "prescribed" && cfd2d.prescribedAmplitude >= g.maximumAngle) {
      issues.push({ severity: "error", path: "cfd2d.prescribedAmplitude", message: "规定运动角幅必须小于 P0 机械止挡角。" });
    }
    if (!Number.isFinite(cfd2d.stripAxialCoordinate)
      || cfd2d.stripAxialCoordinate < g.topDistance
      || cfd2d.stripAxialCoordinate > g.bottomDistance) {
      issues.push({
        severity: "error",
        path: "cfd2d.stripAxialCoordinate",
        message: "条带站位必须位于有限圆柱轴段内。",
      });
    }
    if (cfd2d.couplingMode === "weak-fsi" && cfd2d.stripClosure !== "fully-coherent-upper-bound") {
      issues.push({
        severity: "error",
        path: "cfd2d.stripClosure",
        message: "legacy weak-fsi 需要明示选择 fully-coherent-upper-bound 旧键（代表条带复制情景，非数学上界）；禁止在 closure=none 时构造总力矩。",
      });
    }
    if (cfd2d.couplingMode !== "weak-fsi" && cfd2d.stripClosure !== "none") {
      issues.push({
        severity: "warning",
        path: "cfd2d.stripClosure",
        message: "固定/规定运动不消费三维条带闭合；原生输出仍为单位跨长量。",
      });
    }
    if (cfd2d.nx / cfd2d.cylinderCells < 12 || cfd2d.ny / cfd2d.cylinderCells < 7) {
      issues.push({ severity: "error", path: "cfd2d", message: "二维数值域至少应达到 12D×7D；更小域不能用于本参考后端。" });
    }
    if (d.latticeMach > 0.15) {
      issues.push({ severity: "error", path: "cfd2d.latticeVelocity", message: `格子 Mach 数 ${d.latticeMach.toFixed(3)} 过高。` });
    }
    if (!(d.latticeRelaxationTime > 0.505)) {
      issues.push({ severity: "error", path: "cfd2d", message: `D2Q9–MRT 剪切模态等效松弛时间 τ=${d.latticeRelaxationTime.toFixed(5)} 太接近 0.5。` });
    } else if (d.latticeRelaxationTime < 0.515) {
      issues.push({ severity: "warning", path: "cfd2d", message: `τ=${d.latticeRelaxationTime.toFixed(5)} 的稳定裕度偏小，需做网格/时间敏感性。` });
    }
    if (d.reynolds > 250) {
      issues.push({ severity: "error", path: "fluid.flowSpeed", message: `Re=${d.reynolds.toFixed(1)} 超出当前二维 D2Q9–MRT 参考实现的数值门 250。` });
    } else if (d.reynolds >= 188.5) {
      issues.push({ severity: "warning", path: "fluid.flowSpeed", message: `Re=${d.reynolds.toFixed(1)} 已越过理想二维圆柱的 Mode-A 三维参考点；二维结果仅是强制二维分支。` });
    }
    const estimatedSteps = d.latticeTimeStep > 0 ? solver.duration / d.latticeTimeStep : Number.POSITIVE_INFINITY;
    if (estimatedSteps > 120_000) {
      issues.push({ severity: "error", path: "solver.duration", message: `预计 ${Math.ceil(estimatedSteps)} 个格子步，超过浏览器后端的 120000 步安全门。` });
    }
  }
  return issues;
}

export function applicabilityFor(config: SimulationConfig): ApplicabilityReport {
  const d = deriveParameters(config);
  const findings: ApplicabilityFinding[] = [];
  if (config.backend === "forward") {
    const calibratedSource = ["measured", "prescribed-motion"].includes(config.rom.coefficientSource)
      && config.rom.wetSupportMode === "calibrated" && wetContractIssues(config.rom).length === 0;
    if (config.rom.coefficientSource === "literature-prior") findings.push({
      severity: "warning",
      code: "FORWARD-COEFFICIENTS-PRIOR",
      message: "当前 SL、升力、附加惯量和有限跨系数仅为文献先验，未在本装置上标定。",
    });
    if (!calibratedSource && config.rom.coefficientSource !== "literature-prior") findings.push({
      severity: "warning", code: "FORWARD-CALIBRATION-NOT-QUALIFIED",
      message: "当前输入为合成、历史或缺少完整湿区与联合覆盖身份；系数来源标签本身不构成装置标定。",
    });
    if (d.reynolds < config.rom.calibrationMinReynolds
      || d.reynolds > config.rom.calibrationMaxReynolds) {
      findings.push({ severity: "error", code: "FORWARD-RE-OOD", message: `额定 Re=${d.reynolds.toFixed(2)} 位于系数包 Reynolds 标定域之外。` });
    }
    if (Math.abs(config.initial.theta) > config.rom.calibrationMaxAbsAngle) {
      findings.push({ severity: "error", code: "FORWARD-ANGLE-OOD", message: "初始摆角位于系数包标定域之外。" });
    }
    const hasDomainError = findings.some((finding) => finding.severity === "error");
    return {
      status: hasDomainError
        ? "exploratory-extrapolation"
        : calibratedSource
          ? "within-calibrated-domain"
          : "exploratory-extrapolation",
      findings,
      interpretation: calibratedSource && !hasDomainError
        ? "前向方程及数值误差均受当前契约控制；定量效力仍受系数包给出的装置与工况标定域限制。"
        : "方程与数值实现可用于机制检查和趋势探索；文献先验系数不能替代本装置标定，输出不是未测装置的定量预报。",
    };
  }

  findings.push({
    severity: "warning",
    code: "CFD2D-NOT-APPARATUS-HF",
    message: "该后端求解二维单位跨距参考问题，不解析真实有限湿跨、自由表面端部和三维相干。",
  });
  if (d.reynolds >= 188.5) {
    findings.push({ severity: "error", code: "CFD2D-3D-UPGRADE", message: "该 Reynolds 数下真实物理需要三维升级；输出只能解释为强制二维数学分支。" });
  }
  if (d.latticeRelaxationTime < 0.515) {
    findings.push({ severity: "warning", code: "CFD2D-TAU-MARGIN", message: "松弛时间稳定裕度偏小。" });
  }
  return {
    status: d.reynolds >= 188.5 ? "physics-upgrade-required" : "reference-only",
    findings,
    interpretation: "独立于尾流 ROM 的二维 Navier–Stokes/LBM 参考；A1 只允许检查二维场、频率和未修正 raw 交换的数值账本。物理水动力的幅值/相位/功率符号及真实装置总力、摆幅和趋势仍未验证。",
  };
}

export function stableConfigString(config: SimulationConfig): string {
  return stableCanonicalJson(config);
}

/** Browser-safe deterministic FNV-1a provenance hash (not a security digest). */
export function hashConfig(config: SimulationConfig): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(stableConfigString(config))) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64-${hash.toString(16).padStart(16, "0")}`;
}
