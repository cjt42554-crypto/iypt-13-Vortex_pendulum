import { computeRunMetrics } from "../../analysis/metrics";
import {
  applicabilityFor,
  deriveParameters,
  hashConfig,
  validateConfig,
} from "../../core/config";
import { provenanceContractHashes } from "../../core/provenance";
import { forwardModelId, isStickSlipModel } from "../../core/forward-contract";
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
  dormandPrince54Step,
  nextStepFactor,
  OdeStageError,
  scaledErrorNorm,
  type OdeRhs,
} from "./dopri54";
import {
  evaluateForward,
  evaluateForwardDomain,
  evaluateForwardGuards,
  firstInvalidForwardWetGuard,
  forwardSample,
  ForwardDomainViolation,
  guardIsValid,
  stateToVector,
  vectorToState,
  type ForwardGuard,
  type ForwardState,
} from "./model";

import { eventInspectionFractions } from "./dense-events";
import { locateStickSlipEvent, type StickSlipMode } from "./stick-slip";

const SOLVER_VERSION = "2.2.0";
const TIME_EPSILON_FACTOR = 64;

const NO_CONTROL: SolverControl = {
  isPaused: () => false,
  isStopped: () => false,
  waitWhilePaused: async () => undefined,
  report: () => undefined,
  yieldToEventLoop: async () => undefined,
};

interface LocatedEvent {
  time: number;
  validTime: number;
  invalidTime: number;
  validState: ForwardState;
  invalidState: ForwardState;
  guard: ForwardGuard;
  rhsEvaluations: number;
}

function makeRunId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `forward-${Date.now().toString(36)}`;
}

function guardAt(guards: readonly ForwardGuard[], id: string): ForwardGuard | undefined {
  return guards.find((guard) => guard.id === id);
}

function initiallyTriggered(guard: ForwardGuard): boolean {
  return !guardIsValid(guard);
}

function crossingGuards(
  left: readonly ForwardGuard[],
  right: readonly ForwardGuard[],
): ForwardGuard[] {
  return right.filter((rightGuard) => {
    const leftGuard = guardAt(left, rightGuard.id);
    return !guardIsValid(rightGuard)
      && (leftGuard === undefined || guardIsValid(leftGuard));
  });
}

function compareLocatedEvents(
  left: LocatedEvent,
  right: LocatedEvent,
  tolerance: number,
): number {
  if (Math.abs(left.time - right.time) > tolerance) return left.time - right.time;
  return left.guard.priority - right.guard.priority;
}

function locateGuardRoot(
  config: SimulationConfig,
  stateAt: (time: number) => ForwardState,
  leftTime: number,
  rightTime: number,
  rightState: ForwardState,
  guard: ForwardGuard,
): LocatedEvent {
  let lowTime = leftTime;
  let lowState = stateAt(leftTime);
  let highTime = rightTime;
  let highState = rightState;
  while (highTime - lowTime > config.solver.eventTimeTolerance) {
    const midpoint = 0.5 * (lowTime + highTime);
    if (midpoint === lowTime || midpoint === highTime) break;
    const midpointState = stateAt(midpoint);
    const midpointGuard = guardAt(
      evaluateForwardGuards(config, midpoint, midpointState),
      guard.id,
    );
    if (midpointGuard !== undefined && guardIsValid(midpointGuard)) {
      lowTime = midpoint;
      lowState = midpointState;
    } else {
      highTime = midpoint;
      highState = midpointState;
    }
  }
  const finalGuard = guardAt(
    evaluateForwardGuards(config, highTime, highState),
    guard.id,
  ) ?? guard;
  return {
    time: highTime,
    validTime: lowTime,
    invalidTime: highTime,
    validState: lowState,
    invalidState: highState,
    guard: finalGuard,
    rhsEvaluations: 0,
  };
}

function domainViolationFrom(error: unknown): {
  violation: ForwardDomainViolation;
  rhsEvaluations: number;
} | undefined {
  if (error instanceof ForwardDomainViolation) {
    return { violation: error, rhsEvaluations: 1 };
  }
  if (error instanceof OdeStageError && error.cause instanceof ForwardDomainViolation) {
    return { violation: error.cause, rhsEvaluations: error.rhsEvaluations };
  }
  return undefined;
}

function appendDistinctSample(samples: SimulationSample[], sample: SimulationSample): void {
  const previous = samples.at(-1);
  if (previous !== undefined && Math.abs(previous.time - sample.time)
    <= 128 * Number.EPSILON * Math.max(1, sample.time)) {
    samples[samples.length - 1] = sample;
  } else {
    samples.push(sample);
  }
}

function emptyRunMetrics() {
  return {
    available: false,
    sampleCount: 0,
    windowStartTime: 0,
    peakAmplitude: 0,
    dimensionlessAmplitude: 0,
    rmsDisplacement: 0,
    dominantFrequency: 0,
    meanFluidPower: 0,
    meanAppliedRawMechanicalPower: null,
    meanAppliedRawLinePower: null,
    meanDampingPower: 0,
    energyClosureRelativeRms: 0,
    appliedMechanicalEnergyLedgerResidual: null,
    appliedMechanicalEnergyLedgerRelativeResidual: null,
  };
}

function terminalEvent(
  code: TerminationCode,
  time: number,
  message: string,
  bracket?: { validTime: number; invalidTime: number },
  validity?: { validBefore: boolean; validAfter: boolean },
): RunEvent {
  return {
    time,
    kind: code === "MINIMUM-STEP" || code === "MAXIMUM-STEPS" || code === "NONFINITE-STATE"
      ? "numerical"
      : "limit",
    code,
    message,
    ...(bracket === undefined ? {} : { bracket }),
    ...(validity === undefined ? {} : validity),
  };
}

export async function runForward(
  config: SimulationConfig,
  control: SolverControl = NO_CONTROL,
  requestedRunId: string = makeRunId(),
): Promise<SimulationResult> {
  if (config.backend !== "forward") throw new RangeError("runForward requires backend='forward'");
  const validation = validateConfig(config);
  const errors = validation.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new RangeError(`invalid forward configuration: ${errors.map((issue) => `${issue.path}: ${issue.message}`).join(" | ")}`);
  }

  const derived = deriveParameters(config);
  const contractHashes = await provenanceContractHashes(config, "forward");
  const applicability = applicabilityFor(config);
  const absoluteTolerances = [
    config.solver.absoluteToleranceTheta,
    config.solver.absoluteToleranceOmega,
    config.solver.absoluteToleranceWake,
    config.solver.absoluteToleranceWake,
    1e-12, // absolute work-quadrature tolerance [J]
  ];
  let mode: StickSlipMode | undefined;
  let netWork = 0;
  let lastModeEventTime = -Infinity;
  let unresolvedSwitches = 0;
  const rhs: OdeRhs = (time, vector) => {
    const physical = vectorToState(vector.slice(0, 4));
    const evaluated = evaluateForward(config, time, physical, derived, mode);
    return [...stateToVector(evaluated.derivative),
      (evaluated.dynamicFluidTorque + evaluated.mechanics.axisFrictionTorque) * physical.omega];
  };
  const sample = (time: number, state: ForwardState): SimulationSample => ({
    ...forwardSample(config, time, state, derived, mode), cumulativeNetWork: netWork,
  });
  let time = 0;
  let state: ForwardState = {
    theta: config.initial.theta,
    omega: config.initial.omega,
    wakeReal: config.initial.wakeReal,
    wakeImaginary: config.initial.wakeImaginary,
  };
  let step = config.solver.initialStep;
  let acceptedSteps = 0;
  let rejectedSteps = 0;
  let rhsEvaluations = 0;
  let minimumAcceptedStep = Number.POSITIVE_INFINITY;
  let maximumAcceptedStep = 0;
  let maximumAcceptedErrorNorm = 0;
  let terminationCode: TerminationCode = "COMPLETED";
  const events: RunEvent[] = [];
  const samples: SimulationSample[] = [];
  const initialDomain = evaluateForwardDomain(config, time, state, derived);
  let currentGuards = evaluateForwardGuards(config, time, state);
  let wetBranch = initialDomain.wetBranch;
  const initialGuard = currentGuards.find(initiallyTriggered);
  if (initialGuard !== undefined) {
    terminationCode = initialGuard.code;
    events.push(terminalEvent(initialGuard.code, time, initialGuard.message, undefined, {
      validBefore: false,
      validAfter: false,
    }));
  } else {
    const currentEvaluation = evaluateForward(config, time, state, derived);
    if (isStickSlipModel(config)) mode = currentEvaluation.frictionMode as StickSlipMode;
    currentGuards = evaluateForwardGuards(config, time, state, currentEvaluation);
    appendDistinctSample(samples, sample(time, state));
  }

  let nextOutputIndex = 1;
  const timeEpsilon = TIME_EPSILON_FACTOR * Number.EPSILON
    * Math.max(1, config.solver.duration);

  while (terminationCode === "COMPLETED" && time < config.solver.duration - timeEpsilon) {
    if (control.isStopped()) {
      terminationCode = "USER-STOP";
      events.push(terminalEvent("USER-STOP", time, "用户请求停止。"));
      break;
    }
    if (control.isPaused()) await control.waitWhilePaused();
    if (control.isStopped()) continue;
    if (acceptedSteps >= config.solver.maxAcceptedSteps
      || rejectedSteps > config.solver.maxRejectedSteps) {
      terminationCode = "MAXIMUM-STEPS";
      events.push(terminalEvent("MAXIMUM-STEPS", time, "达到接受/拒绝步数安全门。"));
      break;
    }

    const target = Math.min(
      nextOutputIndex * config.solver.outputInterval,
      config.solver.duration,
    );
    const remaining = target - time;
    if (remaining <= timeEpsilon) {
      time = target;
      appendDistinctSample(samples, sample(time, state));
      if (target >= config.solver.duration - timeEpsilon) break;
      nextOutputIndex += 1;
      continue;
    }
    const attemptedStep = Math.min(step, config.solver.maximumStep, remaining);
    let trial: ReturnType<typeof dormandPrince54Step> | undefined;
    let domainTerminal: LocatedEvent | undefined;
    let errorNorm = Number.POSITIVE_INFINITY;
    try {
      trial = dormandPrince54Step(rhs, time, [...stateToVector(state), netWork], attemptedStep);
      rhsEvaluations += trial.rhsEvaluations;
      errorNorm = scaledErrorNorm(
        [...stateToVector(state), netWork],
        trial.fifthOrder,
        trial.error,
        absoluteTolerances,
        config.solver.relativeTolerance,
      );
    } catch (error) {
      const failed = domainViolationFrom(error);
      if (failed !== undefined) {
        rhsEvaluations += failed.rhsEvaluations;
        rejectedSteps += 1;
        // An invalid internal RK stage is not proof that the actual solution
        // reaches that boundary. Reject and recompute from the last accepted
        // state; a coarse-stage excursion may disappear under refinement.
        // Event localization may go below the LTE minimum step because it
        // evaluates no undefined derivative and has a separate time tolerance.
        if (attemptedStep > config.solver.eventTimeTolerance) {
          step = attemptedStep * 0.5;
          continue;
        }
        domainTerminal = {
          time: failed.violation.time,
          validTime: time,
          invalidTime: failed.violation.time,
          validState: state,
          invalidState: failed.violation.state,
          guard: failed.violation.guard,
          rhsEvaluations: 0,
        };
      } else {
        // Non-domain RHS failures remain numerical rejections and eventually
        // terminate through minimumStep rather than being mislabelled physical.
        errorNorm = Number.POSITIVE_INFINITY;
      }
    }

    if (domainTerminal !== undefined) {
      time = domainTerminal.validTime;
      state = domainTerminal.validState;
      terminationCode = domainTerminal.guard.code;
      events.push(terminalEvent(
        domainTerminal.guard.code,
        domainTerminal.time,
        domainTerminal.guard.message,
        { validTime: domainTerminal.validTime, invalidTime: domainTerminal.invalidTime },
        { validBefore: true, validAfter: false },
      ));
      appendDistinctSample(samples, sample(time, state));
      break;
    }

    if (trial === undefined || !(errorNorm <= 1)) {
      rejectedSteps += 1;
      const reduced = attemptedStep * nextStepFactor(errorNorm, false);
      if (reduced < config.solver.minimumStep) {
        terminationCode = "MINIMUM-STEP";
        events.push(terminalEvent("MINIMUM-STEP", time, "局部误差要求的步长低于 minimumStep。"));
        break;
      }
      step = Math.max(config.solver.minimumStep, reduced);
      continue;
    }

    const candidateTime = Math.abs(time + attemptedStep - target) <= timeEpsilon
      ? target
      : time + attemptedStep;
    const candidateState = vectorToState(trial.fifthOrder.slice(0, 4));
    const candidateEvaluation = evaluateForward(config, candidateTime, candidateState, derived, mode);
    const candidateGuards = evaluateForwardGuards(
      config,
      candidateTime,
      candidateState,
      candidateEvaluation,
    );
    const stepStart = time;
    const acceptedTrial = trial;
    const stateAt = (query: number) => vectorToState(acceptedTrial.denseState(
      Math.min(1, Math.max(0, (query - stepStart) / attemptedStep)),
    ).slice(0, 4));
    // Mechanical extrema catch exit-and-reentry even when the endpoints are
    // legal. The additional angles are extrema of finite-cylinder support.
    const criticalAngles = [0];
    for (const length of [config.geometry.topDistance, config.geometry.bottomDistance]) {
      for (const angle of [Math.atan2(config.geometry.radius, length), Math.atan2(length, config.geometry.radius)]) {
        criticalAngles.push(angle, -angle);
      }
    }
    let fractions = eventInspectionFractions(acceptedTrial, criticalAngles);
    const modeEvent = mode === undefined ? undefined : locateStickSlipEvent(mode, stateAt,
      (t, s) => evaluateForward(config, t, s, derived, mode).mechanics.drivingTorque,
      fractions.map((f) => stepStart + attemptedStep * f), config.support.staticFrictionTorque!,
      config.solver.eventTimeTolerance);
    // Only inspect the selected branch up to its first mode event. Physical
    // exits tied within the root tolerance take precedence over that restart.
    if (modeEvent !== undefined) {
      const endFraction = Math.min(1, (modeEvent.rightTime - stepStart) / attemptedStep);
      fractions = [...fractions.filter((f) => f < endFraction), endFraction];
    }
    let inspectedTime = time;
    let inspectedGuards = currentGuards;
    let inspectedWet = wetBranch;
    let terminal: LocatedEvent | undefined;
    for (const fraction of fractions) {
      if (fraction <= 0) continue;
      const probeTime = fraction === 1 ? candidateTime : stepStart + attemptedStep * fraction;
      const probeState = fraction === 1 ? candidateState : stateAt(probeTime);
      const probeGuards = fraction === 1
        ? candidateGuards
        : evaluateForwardGuards(config, probeTime, probeState);
      const crossed = crossingGuards(inspectedGuards, probeGuards);
      if (crossed.length) {
        terminal = crossed.map((guard) => locateGuardRoot(config, stateAt, inspectedTime,
          probeTime, probeState, guard)).sort((left, right) => compareLocatedEvents(
            left,
            right,
            config.solver.eventTimeTolerance,
          ))[0];
      }
      const endTime = terminal?.time ?? probeTime;
      const endState = terminal?.invalidState ?? probeState;
      const endWet = evaluateForwardDomain(config, endTime, endState, derived).wetBranch;
      // Locate label transitions separately from output/accepted step times.
      // At most dry -> partial -> full (or the reverse) on each monotone piece.
      let wetLeft = inspectedTime;
      for (let transition = 0; transition < 3 && inspectedWet !== endWet; transition += 1) {
        let low = wetLeft, high = endTime;
        while (high - low > config.solver.eventTimeTolerance) {
          const middle = .5 * (low + high);
          if (middle === low || middle === high) break;
          const branch = evaluateForwardDomain(config, middle, stateAt(middle), derived).wetBranch;
          if (branch === inspectedWet) low = middle;
          else high = middle;
        }
        const nextWet = evaluateForwardDomain(config, high, stateAt(high), derived).wetBranch;
        if (nextWet === inspectedWet) break;
        events.push({ time: high, kind: "wetting",
          code: `WET-${inspectedWet.toUpperCase()}-TO-${nextWet.toUpperCase()}`,
          message: `湿润标签由 ${inspectedWet} 切换为 ${nextWet}；密集输出定位，状态不重置，干湿尾流切换未作实验标定。` });
        inspectedWet = nextWet;
        wetLeft = high;
      }
      if (terminal !== undefined) break;
      const probeEvaluation = fraction === 1
        ? candidateEvaluation
        : evaluateForward(config, probeTime, probeState, derived, mode);
      inspectedTime = probeTime;
      inspectedGuards = probeGuards;
      inspectedWet = probeEvaluation.domain.wetBranch;
    }
    if (terminal !== undefined) {
      time = terminal.validTime;
      state = terminal.validState;
      netWork = acceptedTrial.denseState((time - stepStart) / attemptedStep)[4]!;
      terminationCode = terminal.guard.code;
      events.push(terminalEvent(
        terminal.guard.code,
        terminal.time,
        terminal.guard.message,
        { validTime: terminal.validTime, invalidTime: terminal.invalidTime },
        { validBefore: true, validAfter: false },
      ));
      appendDistinctSample(samples, sample(time, state));
      break;
    }
    wetBranch = inspectedWet;
    if (modeEvent !== undefined) {
      const before = mode!;
      netWork = acceptedTrial.denseState((modeEvent.time - stepStart) / attemptedStep)[4]!;
      time = modeEvent.time;
      state = modeEvent.state;
      mode = modeEvent.nextMode;
      acceptedSteps += 1;
      minimumAcceptedStep = Math.min(minimumAcceptedStep, time - stepStart);
      maximumAcceptedStep = Math.max(maximumAcceptedStep, time - stepStart);
      maximumAcceptedErrorNorm = Math.max(maximumAcceptedErrorNorm, errorNorm);
      events.push({ time, kind: "mode", code: `SS-${before}-TO-${mode}`,
        message: "首次模式边界定位；无冲量，尾流不重置。",
        bracket: { validTime: modeEvent.leftTime, invalidTime: modeEvent.rightTime },
        modeBefore: before, modeAfter: mode, validBefore: true, validAfter: true });
      unresolvedSwitches = time - lastModeEventTime <= config.solver.eventTimeTolerance
        ? unresolvedSwitches + 1 : 0;
      lastModeEventTime = time;
      appendDistinctSample(samples, sample(time, state));
      if (unresolvedSwitches > 8) {
        terminationCode = "SS-MODE-UNRESOLVED";
        events.push(terminalEvent(terminationCode, time, "事件分辨率内反复切换；停止而不引入速度死区。"));
        break;
      }
      currentGuards = evaluateForwardGuards(config, time, state);
      step = Math.min(config.solver.maximumStep, attemptedStep);
      continue;
    }

    const previousTime = time;
    time = candidateTime;
    state = candidateState;
    netWork = trial.fifthOrder[4]!;
    currentGuards = candidateGuards;
    acceptedSteps += 1;
    minimumAcceptedStep = Math.min(minimumAcceptedStep, time - previousTime);
    maximumAcceptedStep = Math.max(maximumAcceptedStep, time - previousTime);
    maximumAcceptedErrorNorm = Math.max(maximumAcceptedErrorNorm, errorNorm);
    step = Math.min(
      config.solver.maximumStep,
      Math.max(config.solver.minimumStep, attemptedStep * nextStepFactor(errorNorm, true)),
    );

    if (time >= target - timeEpsilon) {
      time = target;
      const output = sample(time, state);
      appendDistinctSample(samples, output);
      control.report(time / config.solver.duration, output);
      if (target < config.solver.duration - timeEpsilon) {
        nextOutputIndex += 1;
      }
    }
    if (acceptedSteps % 128 === 0) await control.yieldToEventLoop();
  }

  if (terminationCode === "COMPLETED" && time < config.solver.duration - timeEpsilon) {
    terminationCode = "MAXIMUM-STEPS";
  }
  if (terminationCode === "COMPLETED") {
    time = config.solver.duration;
    appendDistinctSample(samples, sample(time, state));
  }

  const metrics = samples.length === 0
    ? emptyRunMetrics()
    : { ...computeRunMetrics(samples, config, derived), available: true, sampleCount: samples.length };
  const firstEnergy = samples[0]?.mechanicalEnergy ?? 0;
  const finalEnergy = samples.at(-1)?.mechanicalEnergy ?? firstEnergy;
  const finalEnergyBalanceResidual = finalEnergy - firstEnergy - netWork;
  const warnings = [
    ...validation.filter((issue) => issue.severity !== "error").map((issue) => `${issue.path}: ${issue.message}`),
    ...applicability.findings.map((finding) => `${finding.code}: ${finding.message}`),
  ];
  if (samples.length > 0 && metrics.energyClosureRelativeRms > config.solver.energyTolerance) {
    warnings.push(
      `ENERGY-CLOSURE: relative RMS ${metrics.energyClosureRelativeRms.toExponential(3)} exceeds ${config.solver.energyTolerance.toExponential(3)}; reduce outputInterval/tolerances before quantitative use.`,
    );
  }
  const numerical: NumericalDiagnostics = {
    method: "Dormand-Prince-5(4)",
    acceptedSteps,
    rejectedSteps,
    rhsEvaluations,
    minimumAcceptedStep: Number.isFinite(minimumAcceptedStep) ? minimumAcceptedStep : 0,
    maximumAcceptedStep,
    maximumAcceptedErrorNorm,
    finalEnergyBalanceResidual,
    terminationCode,
  };
  control.report(Math.min(1, time / config.solver.duration), samples.at(-1));
  return {
    runId: requestedRunId,
    backend: "forward",
    complete: terminationCode === "COMPLETED",
    terminationCode,
    config: structuredClone(config),
    derived,
    applicability,
    samples,
    validSampleMask: samples.map(() => true),
    lastValidSampleIndex: samples.length > 0 ? samples.length - 1 : null,
    fields: [],
    metrics,
    numerical,
    warnings,
    events,
    provenance: {
      solver: "adaptive-dopri54-forward",
      solverVersion: SOLVER_VERSION,
      modelId: forwardModelId(config),
      createdAt: new Date().toISOString(),
      configHash: hashConfig(config),
      ...contractHashes,
      backendDisplayName: "forward-theory-numerical",
      forceContractId: "VP-FWD-FLUID-TORQUE-v1",
      loadDefinition: "quasisteady-drag-plus-single-complex-stuart-landau-wake",
      couplingAlgorithm: "four-physical-states-mode-local-dopri54-with-work-quadrature",
      spanClosure: "finite-wet-span-rom-coherence-input-unvalidated",
      geometryModel: "P0-flat-free-surface-finite-cylinder",
      coefficientSetId: config.rom.coefficientSetId,
      coefficientSource: config.rom.coefficientSource,
      dimensionality: "P0-reduced-order",
      nativeLoadType: "three-dimensional-generalized-torque",
      evidenceLevel: "forward-numerically-verified",
      epistemicClassification: (config.rom.wetSupportMode === "synthetic-only" || config.rom.inputClassification === "synthetic-only")
        ? "synthetic-only"
        : config.rom.wetSupportMode === "calibrated"
            && (config.rom.coefficientSource === "measured"
              || config.rom.coefficientSource === "prescribed-motion")
          ? "rom-calibrated-input-unheldout"
          : config.rom.coefficientSource === "literature-prior"
          ? "illustrative-literature-prior"
          : "unvalidated-coefficient-source",
      holdoutStatus: (config.rom.wetSupportMode === "synthetic-only" || config.rom.inputClassification === "synthetic-only")
        ? "not-applicable-synthetic"
        : "not-bound-in-standalone-run",
      evidenceClaims: {
        lbmKernelComponents: "not-applicable",
        dynamicLoadExtraction: "not-applicable-rom-closure",
        interfacePowerExchange: "numerically-closed-model-port-not-physically-calibrated",
        fsiCoupling: "monolithic-rom-state-integration",
        gridMachDomainConvergence: "not-applicable",
        spanClosure: "unvalidated-model-input",
        apparatusPrediction: "no-go-until-calibrated-and-held-out",
      },
      legacyStatus: (config.rom.wetSupportMode ?? "legacy-unqualified") === "legacy-unqualified"
        ? "legacy-exploratory-invalidated-for-load-validation"
        : "not-legacy",
      knownDefects: [
        "dense-event-checkpoints-and-mechanical-extrema-do-not-prove-arbitrary-guard-completeness",
        "dry-wet-wake-switch-not-calibrated-as-a-reentry-law",
        "default-literature-prior-is-not-apparatus-calibrated",
        "trend-power-sign-has-no-current-apparatus-qualification",
      ],
      pauseSemantics: "volatile-in-memory-safe-step",
      limitations: [
        "uniform outer-edge inflow over the wet span",
        "flat undisturbed free-surface geometry",
        "single complex Stuart-Landau wake mode",
        "direct pitching-moment channel fixed to zero",
        "no impact, breaking-wave, ventilation, or multimode wake continuation law",
      ],
    },
  };
}

export * from "./dopri54";
export * from "./model";
