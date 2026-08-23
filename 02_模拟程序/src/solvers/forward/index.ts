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

const SOLVER_VERSION = "2.0.0";
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
  rhs: OdeRhs,
  leftTime: number,
  leftState: ForwardState,
  rightTime: number,
  rightState: ForwardState,
  guard: ForwardGuard,
): LocatedEvent {
  let lowTime = leftTime;
  let highTime = rightTime;
  let highState = rightState;
  let evaluations = 0;
  const leftVector = stateToVector(leftState);
  while (highTime - lowTime > config.solver.eventTimeTolerance) {
    const midpoint = 0.5 * (lowTime + highTime);
    const trial = dormandPrince54Step(rhs, leftTime, leftVector, midpoint - leftTime);
    evaluations += trial.rhsEvaluations;
    const midpointState = vectorToState(trial.fifthOrder);
    const midpointGuard = guardAt(
      evaluateForwardGuards(config, midpoint, midpointState),
      guard.code,
    );
    if (midpointGuard !== undefined && midpointGuard.margin > 0) {
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
    const attemptedStep = Math.min(step, remaining);
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
    const crossed = crossingGuards(currentGuards, candidateGuards);
    if (crossed.length > 0) {
      const locatedEvents = crossed.map((guard) => locateGuardRoot(
        config,
        rhs,
        time,
        state,
        candidateTime,
        candidateState,
        guard,
      ));
      rhsEvaluations += locatedEvents.reduce((sum, item) => sum + item.rhsEvaluations, 0);
      const located = locatedEvents.sort((left, right) => left.time - right.time)[0];
      if (located !== undefined) {
        time = located.time;
        state = located.state;
        terminationCode = located.guard.code;
        events.push(terminalEvent(located.guard.code, time, located.guard.message));
        appendDistinctSample(samples, forwardSample(config, time, state, derived));
        break;
      }
    }

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

    const candidateWetBranch = candidateEvaluation.mechanics.wet.branch;
    if (candidateWetBranch !== wetBranch) {
      events.push({
        time,
        kind: "wetting",
        code: `WET-${wetBranch.toUpperCase()}-TO-${candidateWetBranch.toUpperCase()}`,
        message: `湿润标签由 ${wetBranch} 连续切换为 ${candidateWetBranch}；状态不重置。`,
      });
      wetBranch = candidateWetBranch;
    }

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
