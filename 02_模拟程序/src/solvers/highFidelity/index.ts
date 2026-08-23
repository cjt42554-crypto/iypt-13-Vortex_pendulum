import { computeRunMetrics } from "../../analysis/metrics";
import {
  applicabilityFor,
  deriveParameters,
  hashConfig,
  validateConfig,
} from "../../core/config";
import type {
  NumericalDiagnostics,
  RunEvent,
  SimulationConfig,
  SimulationResult,
  SimulationSample,
  SolverControl,
  TerminationCode,
} from "../../core/types";
import {
  A1_ANALYSIS_CONTRACT_ID,
  A1_FORCE_CONTRACT_ID,
  provenanceContractHashes,
} from "../../core/provenance";
import { HighFidelitySimulation } from "./model";

const SOLVER_VERSION = "1.1.0-a1-accounting";

const NO_CONTROL: SolverControl = {
  isPaused: () => false,
  isStopped: () => false,
  waitWhilePaused: async () => undefined,
  report: () => undefined,
  yieldToEventLoop: async () => undefined,
};

function makeRunId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cfd2d-${Date.now().toString(36)}`;
}

function integratedNetMechanicalPower(samples: readonly SimulationSample[]): number {
  let integral = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const left = samples[index - 1];
    const right = samples[index];
    if (left === undefined || right === undefined) continue;
    const dt = right.time - left.time;
    const leftNet = left.fluidPower + left.controlPower - left.dampingPower;
    const rightNet = right.fluidPower + right.controlPower - right.dampingPower;
    integral += 0.5 * dt * (leftNet + rightNet);
  }
  return integral;
}

/**
 * VP-HF-CFD2D-v1 with A1 accounting: a 2-D unit-span sectional reference.
 *
 * The backend deliberately exports line loads.  Only the opt-in weak-FSI mode
 * constructs a P0 torque, and that construction is permanently labelled as a
 * representative-strip replication scenario rather than a canonical 3-D prediction.
 */
export async function runHighFidelity(
  config: SimulationConfig,
  requestedControl: SolverControl = NO_CONTROL,
  requestedRunId = makeRunId(),
): Promise<SimulationResult> {
  if (config.backend !== "highFidelity") {
    throw new Error("runHighFidelity requires backend='highFidelity'");
  }
  const validation = validateConfig(config);
  const errors = validation.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new Error(errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  }
  const control = requestedControl;
  const derived = deriveParameters(config);
  const contractHashes = await provenanceContractHashes(config, "highFidelity");
  const applicability = applicabilityFor(config);
  const simulation = new HighFidelitySimulation(config);
  const samples: SimulationSample[] = [];
  const fields = [];
  const events: RunEvent[] = [
    {
      time: 0,
      kind: "info",
      code: "CFD2D-UNIT-SPAN",
      message: "原生流体载荷为二维单位跨长 N/m 和功率 W/m，不是有限湿跨三维总力/总矩。",
    },
    {
      time: 0,
      kind: "warning",
      code: "CFD2D-A1-RAW-LOAD-ONLY",
      message: "A1 仅记录实际 Guo/Brinkman 原始反力冲量与功；尚未做虚拟内部流体修正，不能称为物理水动力。",
    },
    {
      time: 0,
      kind: "info",
      code: "CFD2D-APPLIED-DIAGNOSTIC-SPLIT",
      message: "interfaceExchange.applied 是前一格子步实际施力量；lineForce/fluidPower 仅保留为终点 diagnostic legacy 字段。",
    },
    {
      time: 0,
      kind: "info",
      code: "CFD2D-VOLATILE-PAUSE",
      message: "浏览器暂停只在完整格子步边界保留内存状态；页面退出后不可恢复。",
    },
  ];
  if (config.cfd2d.couplingMode === "weak-fsi") {
    events.push({
      time: 0,
      kind: "warning",
      code: "STRIP-REPRESENTATIVE-REPLICATION-LEGACY-KEY",
      message: "weak-fsi 使用代表条带完全相干复制情景；旧配置键虽名为 fully-coherent-upper-bound，但它不是装置功率数学上界。",
    });
  }

  const initialInspection = simulation.inspect();
  samples.push(simulation.makeSample(initialInspection));
  fields.push(simulation.makeField());
  control.report(0, samples[0], fields[0]);

  const initialMass = initialInspection.mass;
  let latestInspection = initialInspection;
  let minimumDensity = initialInspection.minimumDensity;
  let maximumDensity = initialInspection.maximumDensity;
  let maximumSpeed = initialInspection.maximumSpeed;
  let maximumDensityDeviation = Math.max(
    Math.abs(initialInspection.minimumDensity - 1),
    Math.abs(initialInspection.maximumDensity - 1),
  );
  let maximumForcePathDifference = initialInspection.forcePathRelativeDifference;
  let terminationCode: TerminationCode = "COMPLETED";

  while (!simulation.finished) {
    if (control.isStopped()) {
      terminationCode = "USER-STOP";
      break;
    }
    if (control.isPaused()) await control.waitWhilePaused();
    if (control.isStopped()) {
      terminationCode = "USER-STOP";
      break;
    }

    const nextStep = simulation.latticeStep + 1;
    const captureSample = nextStep % config.cfd2d.sampleEvery === 0
      || nextStep === simulation.mapping.totalSteps;
    const captureField = nextStep % config.cfd2d.fieldEvery === 0
      || nextStep === simulation.mapping.totalSteps;
    let advance;
    try {
      advance = simulation.advanceOne(captureSample, captureField);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      terminationCode = errorMessage.startsWith("STOP-A1-")
        ? "STOP-A1-REGRESSION"
        : "LATTICE-INSTABILITY";
      events.push({
        time: simulation.time,
        kind: "numerical",
        code: terminationCode,
        message: errorMessage,
      });
      break;
    }

    const algebraicScale = Math.abs(advance.exchange.rawSolidReactionWork)
      + Math.abs(advance.exchange.brinkmanFluidWork)
      + Math.abs(advance.exchange.brinkmanPenaltyDissipation);
    if (Math.abs(advance.exchange.brinkmanAlgebraicResidual)
      > 100 * Number.EPSILON * Math.max(algebraicScale, Number.MIN_VALUE)) {
      terminationCode = "STOP-BRINKMAN-ALGEBRA";
      events.push({
        time: simulation.time,
        kind: "numerical",
        code: terminationCode,
        message: `原始 Brinkman 功恒等式未达到 100ε 门：R=${advance.exchange.brinkmanAlgebraicResidual.toExponential(6)} J/m。`,
      });
    }

    if (Math.abs(simulation.motionAt(simulation.time).theta) >= config.geometry.maximumAngle) {
      terminationCode = "ANGLE-LIMIT";
      events.push({
        time: simulation.time,
        kind: "limit",
        code: terminationCode,
        message: "二维运动映射达到 P0 机械止挡角；本后端不包含碰撞律。",
      });
    } else if (!simulation.cylinderHasDomainClearance()) {
      terminationCode = "CYLINDER-DOMAIN-CONTACT";
      events.push({
        time: simulation.time,
        kind: "limit",
        code: terminationCode,
        message: "移动圆柱进入外边界缓冲区；不得继续解释载荷。",
      });
    }

    if (advance.inspection !== undefined) {
      latestInspection = advance.inspection;
      minimumDensity = Math.min(minimumDensity, latestInspection.minimumDensity);
      maximumDensity = Math.max(maximumDensity, latestInspection.maximumDensity);
      maximumSpeed = Math.max(maximumSpeed, latestInspection.maximumSpeed);
      maximumDensityDeviation = Math.max(
        maximumDensityDeviation,
        Math.abs(latestInspection.minimumDensity - 1),
        Math.abs(latestInspection.maximumDensity - 1),
      );
      const forceMagnitude = Math.hypot(
        latestInspection.penaltyForceX,
        latestInspection.penaltyForceY,
      );
      if (forceMagnitude > 1e-10) {
        maximumForcePathDifference = Math.max(
          maximumForcePathDifference,
          latestInspection.forcePathRelativeDifference,
        );
      }
      const maximumMach = latestInspection.maximumSpeed / (1 / Math.sqrt(3));
      if (!(latestInspection.minimumDensity > 0.2)
        || latestInspection.maximumDensity > 2
        || maximumMach > 0.8) {
        terminationCode = "LATTICE-INSTABILITY";
        events.push({
          time: simulation.time,
          kind: "numerical",
          code: terminationCode,
          message: `格子状态越过硬门：rho=[${latestInspection.minimumDensity.toExponential(3)},${latestInspection.maximumDensity.toExponential(3)}], Ma_max=${maximumMach.toExponential(3)}。`,
        });
      }
    }

    if (advance.sample !== undefined) {
      samples.push(advance.sample);
      control.report(
        simulation.latticeStep / simulation.mapping.totalSteps,
        advance.sample,
        advance.field,
      );
    }
    if (advance.field !== undefined) fields.push(advance.field);
    if (terminationCode !== "COMPLETED") break;

    if (simulation.latticeStep % config.cfd2d.stepsPerChunk === 0) {
      await control.yieldToEventLoop();
    }
  }

  if (samples.at(-1)?.time !== simulation.time) {
    try {
      latestInspection = simulation.inspect();
      samples.push(simulation.makeSample(latestInspection));
    } catch {
      // Preserve the last accepted, finite sample after a lattice failure.
    }
  }
  const finalMass = latestInspection.mass;
  const relativeMassDrift = Math.abs(finalMass - initialMass) / Math.max(initialMass, 1e-30);
  const massBalanceResidual = finalMass
    - initialMass
    - simulation.cumulativeBoundaryMassInput;
  const relativeMassBalanceResidual = Math.abs(massBalanceResidual)
    / Math.max(
      initialMass,
      Math.abs(finalMass - initialMass),
      Math.abs(simulation.cumulativeBoundaryMassInput),
      1e-30,
    );
  const maximumMach = maximumSpeed / (1 / Math.sqrt(3));
  const metrics = computeRunMetrics(samples, config, derived);
  const firstEnergy = samples[0]?.mechanicalEnergy ?? 0;
  const finalEnergy = samples.at(-1)?.mechanicalEnergy ?? firstEnergy;
  const finalEnergyBalanceResidual = finalEnergy
    - firstEnergy
    - integratedNetMechanicalPower(samples);
  const warnings = [
    ...validation.filter((issue) => issue.severity !== "error").map((issue) => `${issue.path}: ${issue.message}`),
    ...applicability.findings.map((finding) => `${finding.code}: ${finding.message}`),
    "EVIDENCE-LEVEL: 动态取力原 verified-component 声明已撤销；A1 只验证原始施力记账，不验证物理水动力。",
    "BOUNDARY-MODEL: 当前为流向 Zou–He 定速入口/定密度出口、横向周期的 infinite-span-2d 投影。",
    "LOAD-CONTRACT: applied 使用同一步实际 Guo source；endpoint diagnostic 不得替代 applied work。",
  ];
  if (relativeMassBalanceResidual > 5e-3) {
    warnings.push(`MASS-BALANCE: 质量库存变化与入出口累计通量的相对余量为 ${relativeMassBalanceResidual.toExponential(3)}；需改进离散边界通量对账。`);
  }
  if (maximumMach > 0.15) {
    warnings.push(`LOW-MACH: 全场峰值 Ma=${maximumMach.toFixed(3)} 超过 0.15 建议门。`);
  }
  if (maximumDensityDeviation > 0.03) {
    warnings.push(`COMPRESSIBILITY: max|rho-1|=${maximumDensityDeviation.toExponential(3)}，需做 Mach^2 外推。`);
  }
  warnings.push(`LEGACY-INCOMPLETE-STRESS-CONTOUR: 旧圆周应力诊断最大相对差 ${maximumForcePathDifference.toExponential(3)}；该量已退出独立取力验证和证据升级。`);

  const cumulativeExchange = simulation.cumulativeInterfaceExchange;

  const numerical: NumericalDiagnostics = {
    method: "D2Q9-MRT-Brinkman",
    acceptedSteps: simulation.latticeStep,
    rejectedSteps: 0,
    rhsEvaluations: 0,
    minimumAcceptedStep: simulation.latticeStep > 0 ? simulation.mapping.dt : 0,
    maximumAcceptedStep: simulation.latticeStep > 0 ? simulation.mapping.dt : 0,
    maximumAcceptedErrorNorm: 0,
    finalEnergyBalanceResidual,
    terminationCode,
    lattice: {
      steps: simulation.latticeStep,
      cells: config.cfd2d.nx * config.cfd2d.ny,
      diameterCells: config.cfd2d.cylinderCells,
      physicalTimeStep: simulation.mapping.dt,
      relaxationTime: simulation.mapping.relaxationTime,
      shearRelaxationRate: simulation.mapping.shearRelaxationRate,
      latticeMach: simulation.mapping.latticeMach,
      initialMass,
      finalMass,
      cumulativeBoundaryMassInput: simulation.cumulativeBoundaryMassInput,
      massBalanceResidual,
      relativeMassBalanceResidual,
      relativeMassDrift,
      maximumDensityDeviation,
      minimumDensity,
      maximumDensity,
      maximumSpeed,
      maximumMach,
      maximumForcePathDifference,
      maximumLegacyIncompleteStressContourRelativeDifference: maximumForcePathDifference,
      ...cumulativeExchange,
      maximumBrinkmanAlgebraicResidual: simulation.maximumBrinkmanAlgebraicResidual,
      maximumBrinkmanAlgebraicRelativeResidual: simulation.maximumBrinkmanAlgebraicRelativeResidual,
      collision: "D2Q9-MRT",
      obstacle: "analytic-diffuse-Brinkman",
      outerBoundary: "Zou-He-velocity-inlet-pressure-outlet-periodic-crossflow",
    },
  };
  control.report(
    Math.min(1, simulation.latticeStep / simulation.mapping.totalSteps),
    samples.at(-1),
    fields.at(-1),
  );
  return {
    runId: requestedRunId,
    backend: "highFidelity",
    complete: terminationCode === "COMPLETED" && simulation.finished,
    terminationCode,
    config: structuredClone(config),
    derived,
    applicability,
    samples,
    fields,
    metrics,
    numerical,
    warnings,
    events,
    provenance: {
      solver: "d2q9-mrt-brinkman-cfd2d",
      solverVersion: SOLVER_VERSION,
      modelId: "VP-HF-CFD2D-v1",
      createdAt: new Date().toISOString(),
      configHash: hashConfig(config),
      ...contractHashes,
      backendDisplayName: "cfd2d-sectional-reference",
      forceContractId: A1_FORCE_CONTRACT_ID,
      loadDefinition: "raw-brinkman-reaction-impulse-a1-pending-virtual-fluid-correction",
      couplingAlgorithm: config.cfd2d.couplingMode === "weak-fsi"
        ? "legacy-explicit-symplectic-weak-fsi"
        : config.cfd2d.couplingMode,
      spanClosure: config.cfd2d.stripClosure === "fully-coherent-upper-bound"
        ? "coherent-representative-strip-replication-legacy-v3-key"
        : "none-unit-span",
      geometryModel: "infinite-span-2d-analytic-diffuse-cylinder",
      coefficientSetId: "not-applicable-cfd2d-sectional",
      coefficientSource: "not-applicable",
      dimensionality: "two-dimensional-unit-span",
      nativeLoadType: "line-force-per-unit-span",
      evidenceLevel: "unvalidated-preview",
      evidenceClaims: {
        lbmKernelComponents: "component-verified",
        dynamicLoadExtraction: "invalidated-pending-revalidation",
        interfacePowerExchange: "a1-raw-algebra-verified-physical-interface-unverified",
        fsiCoupling: config.cfd2d.couplingMode === "weak-fsi"
          ? "legacy-exploratory"
          : "not-free-fsi",
        gridMachDomainConvergence: "unresolved",
        spanClosure: config.cfd2d.stripClosure === "fully-coherent-upper-bound"
          ? "scenario-only"
          : "unit-span-only",
        apparatusPrediction: "no-go",
      },
      legacyStatus: config.cfd2d.couplingMode === "weak-fsi"
        ? "legacy-exploratory-invalidated-for-load-validation"
        : "legacy-component-withdrawn-pending-revalidation",
      knownDefects: [
        "raw-Brinkman-reaction-not-yet-corrected-for-virtual-internal-fluid",
        "legacy-incomplete-stress-contour-diagnostic",
        "grid-Mach-mask-penalty-domain-convergence-not-closed",
        ...(config.cfd2d.couplingMode === "weak-fsi"
          ? [
              "legacy-explicit-weak-fsi",
              "representative-strip-replication-is-not-an-apparatus-upper-bound",
            ]
          : []),
      ],
      pauseSemantics: "volatile-in-memory-safe-step",
      limitations: [
        "two-dimensional infinite-span sectional projection",
        "single-phase isothermal low-Mach Navier-Stokes limit",
        "no free surface, contact line, finite wet-span end region, or three-dimensional wake mode",
        "diffuse Brinkman cylinder boundary requires grid/Mach/penalty convergence",
        "open-boundary and domain-length sensitivity are not eliminated by one run",
        config.cfd2d.couplingMode === "weak-fsi"
          ? "legacy explicit weak FSI with coherent representative-strip replication"
          : "native line load is not converted to a canonical P0 total torque",
        `analysis contract ${A1_ANALYSIS_CONTRACT_ID}`,
      ],
    },
  };
}

export * from "./lbm";
export * from "./model";
