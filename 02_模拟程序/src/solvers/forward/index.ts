import { computeRunMetrics } from "../../analysis/metrics";
import {
  applicabilityFor,
  deriveParameters,
  hashConfig,
  validateConfig,
} from "../../core/config";
import { provenanceContractHashes } from "../../core/provenance";
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
  scaledErrorNorm,
  type OdeRhs,
} from "./dopri54";
import {
  evaluateForward,
  evaluateForwardGuards,
  forwardSample,
  stateToVector,
  vectorToState,
  type ForwardGuard,
  type ForwardState,
} from "./model";

import { eventInspectionFractions } from "./dense-events";

const SOLVER_VERSION = "2.1.0";
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
  state: ForwardState;
  guard: ForwardGuard;
  rhsEvaluations: number;
}

function makeRunId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `forward-${Date.now().toString(36)}`;
}

function guardAt(guards: readonly ForwardGuard[], code: ForwardGuard["code"]): ForwardGuard | undefined {
  return guards.find((guard) => guard.code === code);
}

function initiallyTriggered(guard: ForwardGuard): boolean {
  if (guard.code === "COEFFICIENT-OOD") return guard.margin < 0;
  return guard.margin <= 0;
}

function crossingGuards(
  left: readonly ForwardGuard[],
  right: readonly ForwardGuard[],
): ForwardGuard[] {
  return right.filter((rightGuard) => {
    const leftGuard = guardAt(left, rightGuard.code);
    if (leftGuard === undefined) return rightGuard.margin <= 0;
    return (leftGuard.margin > 0 && rightGuard.margin <= 0)
      || (leftGuard.margin === 0 && rightGuard.margin < 0);
  });
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
  let highTime = rightTime;
  let highState = rightState;
  let evaluations = 0;
  while (highTime - lowTime > config.solver.eventTimeTolerance) {
    const midpoint = 0.5 * (lowTime + highTime);
    if (midpoint === lowTime || midpoint === highTime) break;
    const midpointState = stateAt(midpoint);
    const midpointGuard = guardAt(
      evaluateForwardGuards(config, midpoint, midpointState),
      guard.code,
    );
    if (midpointGuard !== undefined && (guard.code === "COEFFICIENT-OOD"
      ? midpointGuard.margin >= 0 : midpointGuard.margin > 0)) {
      lowTime = midpoint;
    } else {
      highTime = midpoint;
      highState = midpointState;
    }
  }
  const finalGuard = guardAt(
    evaluateForwardGuards(config, highTime, highState),
    guard.code,
  ) ?? guard;
  return { time: highTime, state: highState, guard: finalGuard, rhsEvaluations: evaluations };
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

function integratedNetPower(samples: readonly SimulationSample[]): number {
  let integral = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const left = samples[index - 1];
    const right = samples[index];
    if (left === undefined || right === undefined) continue;
    const leftPower = left.fluidPower + left.controlPower - left.dampingPower;
    const rightPower = right.fluidPower + right.controlPower - right.dampingPower;
    integral += 0.5 * (right.time - left.time) * (leftPower + rightPower);
  }
  return integral;
}

function terminalEvent(code: TerminationCode, time: number, message: string): RunEvent {
  return {
    time,
    kind: code === "MINIMUM-STEP" || code === "MAXIMUM-STEPS" || code === "NONFINITE-STATE"
      ? "numerical"
      : "limit",
    code,
    message,
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
  ];
  const rhs: OdeRhs = (time, vector) => stateToVector(
    evaluateForward(config, time, vectorToState(vector), derived).derivative,
  );
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
  let currentEvaluation = evaluateForward(config, time, state, derived);
  let currentGuards = evaluateForwardGuards(config, time, state, currentEvaluation);
  let wetBranch = currentEvaluation.mechanics.wet.branch;
  appendDistinctSample(samples, forwardSample(config, time, state, derived));

  const initialGuard = currentGuards.find(initiallyTriggered);
  if (initialGuard !== undefined) {
    terminationCode = initialGuard.code;
    events.push(terminalEvent(initialGuard.code, time, initialGuard.message));
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
      appendDistinctSample(samples, forwardSample(config, time, state, derived));
      if (target >= config.solver.duration - timeEpsilon) break;
      nextOutputIndex += 1;
      continue;
    }
    const attemptedStep = Math.min(step, config.solver.maximumStep, remaining);
    let trial: ReturnType<typeof dormandPrince54Step> | undefined;
    let errorNorm = Number.POSITIVE_INFINITY;
    try {
      trial = dormandPrince54Step(rhs, time, stateToVector(state), attemptedStep);
      rhsEvaluations += trial.rhsEvaluations;
      errorNorm = scaledErrorNorm(
        stateToVector(state),
        trial.fifthOrder,
        trial.error,
        absoluteTolerances,
        config.solver.relativeTolerance,
      );
    } catch {
      // A stage left the finite/domain-safe coordinate chart.  Retrying with a
      // smaller step lets the explicit event surface be reached and located.
      errorNorm = Number.POSITIVE_INFINITY;
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
    const candidateState = vectorToState(trial.fifthOrder);
    const candidateEvaluation = evaluateForward(config, candidateTime, candidateState, derived);
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
    ));
    // Mechanical extrema catch exit-and-reentry even when the endpoints are
    // legal. The additional angles are extrema of finite-cylinder support.
    const criticalAngles = [0];
    for (const length of [config.geometry.topDistance, config.geometry.bottomDistance]) {
      for (const angle of [Math.atan2(config.geometry.radius, length), Math.atan2(length, config.geometry.radius)]) {
        criticalAngles.push(angle, -angle);
      }
    }
    const fractions = eventInspectionFractions(acceptedTrial, criticalAngles);
    let inspectedTime = time;
    let inspectedGuards = currentGuards;
    let inspectedWet = wetBranch;
    let terminal: LocatedEvent | undefined;
    for (const fraction of fractions) {
      if (fraction <= 0) continue;
      const probeTime = fraction === 1 ? candidateTime : stepStart + attemptedStep * fraction;
      const probeState = fraction === 1 ? candidateState : stateAt(probeTime);
      const probeEvaluation = fraction === 1 ? candidateEvaluation : evaluateForward(config, probeTime, probeState, derived);
      const probeGuards = fraction === 1 ? candidateGuards : evaluateForwardGuards(config, probeTime, probeState, probeEvaluation);
      const crossed = crossingGuards(inspectedGuards, probeGuards);
      if (crossed.length) {
        terminal = crossed.map((guard) => locateGuardRoot(config, stateAt, inspectedTime,
          probeTime, probeState, guard)).sort((a, b) => a.time - b.time)[0];
      }
      const endTime = terminal?.time ?? probeTime;
      const endWet = terminal === undefined ? probeEvaluation.mechanics.wet.branch
        : evaluateForward(config, endTime, terminal.state, derived).mechanics.wet.branch;
      // Locate label transitions separately from output/accepted step times.
      // At most dry -> partial -> full (or the reverse) on each monotone piece.
      let wetLeft = inspectedTime;
      for (let transition = 0; transition < 3 && inspectedWet !== endWet; transition += 1) {
        let low = wetLeft, high = endTime;
        while (high - low > config.solver.eventTimeTolerance) {
          const middle = .5 * (low + high);
          if (middle === low || middle === high) break;
          const branch = evaluateForward(config, middle, stateAt(middle), derived).mechanics.wet.branch;
          if (branch === inspectedWet) low = middle;
          else high = middle;
        }
        const nextWet = evaluateForward(config, high, stateAt(high), derived).mechanics.wet.branch;
        if (nextWet === inspectedWet) break;
        events.push({ time: high, kind: "wetting",
          code: `WET-${inspectedWet.toUpperCase()}-TO-${nextWet.toUpperCase()}`,
          message: `湿润标签由 ${inspectedWet} 切换为 ${nextWet}；密集输出定位，状态不重置，干湿尾流切换未作实验标定。` });
        inspectedWet = nextWet;
        wetLeft = high;
      }
      if (terminal !== undefined) break;
      inspectedTime = probeTime;
      inspectedGuards = probeGuards;
      inspectedWet = probeEvaluation.mechanics.wet.branch;
    }
    if (terminal !== undefined) {
      time = terminal.time;
      state = terminal.state;
      terminationCode = terminal.guard.code;
      events.push(terminalEvent(terminal.guard.code, time, terminal.guard.message));
      appendDistinctSample(samples, forwardSample(config, time, state, derived));
      break;
    }
    wetBranch = inspectedWet;

    const previousTime = time;
    time = candidateTime;
    state = candidateState;
    currentEvaluation = candidateEvaluation;
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
      const output = forwardSample(config, time, state, derived);
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
    appendDistinctSample(samples, forwardSample(config, time, state, derived));
  }

  const metrics = computeRunMetrics(samples, config, derived);
  const firstEnergy = samples[0]?.mechanicalEnergy ?? 0;
  const finalEnergy = samples.at(-1)?.mechanicalEnergy ?? firstEnergy;
  const finalEnergyBalanceResidual = finalEnergy - firstEnergy - integratedNetPower(samples);
  const warnings = [
    ...validation.filter((issue) => issue.severity !== "error").map((issue) => `${issue.path}: ${issue.message}`),
    ...applicability.findings.map((finding) => `${finding.code}: ${finding.message}`),
  ];
  if (metrics.energyClosureRelativeRms > config.solver.energyTolerance) {
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
    fields: [],
    metrics,
    numerical,
    warnings,
    events,
    provenance: {
      solver: "adaptive-dopri54-forward",
      solverVersion: SOLVER_VERSION,
      modelId: "VP-FWD-P0-SL1-v1",
      createdAt: new Date().toISOString(),
      configHash: hashConfig(config),
      ...contractHashes,
      backendDisplayName: "forward-theory-numerical",
      forceContractId: "VP-FWD-FLUID-TORQUE-v1",
      loadDefinition: "quasisteady-drag-plus-single-complex-stuart-landau-wake",
      couplingAlgorithm: "monolithic-four-state-adaptive-dormand-prince-5-4",
      spanClosure: "finite-wet-span-rom-coherence-input-unvalidated",
      geometryModel: "P0-flat-free-surface-finite-cylinder",
      coefficientSetId: config.rom.coefficientSetId,
      coefficientSource: config.rom.coefficientSource,
      dimensionality: "P0-reduced-order",
      nativeLoadType: "three-dimensional-generalized-torque",
      evidenceLevel: "forward-numerically-verified",
      epistemicClassification: /synthetic/iu.test(config.rom.coefficientSetId)
        ? "synthetic-only"
        : config.rom.coefficientSource === "literature-prior"
          ? "illustrative-literature-prior"
          : config.rom.coefficientSource === "measured"
              || config.rom.coefficientSource === "prescribed-motion"
            ? "rom-calibrated-input-unheldout"
            : "unvalidated-coefficient-source",
      holdoutStatus: /synthetic/iu.test(config.rom.coefficientSetId)
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
      legacyStatus: "not-legacy",
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
        "no impact, stick-slip, breaking-wave, ventilation, or multimode continuation law",
      ],
    },
  };
}

export * from "./dopri54";
export * from "./model";
