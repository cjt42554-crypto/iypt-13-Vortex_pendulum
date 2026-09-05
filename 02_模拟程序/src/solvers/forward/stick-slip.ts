/** Discrete mechanical modes of VP-FWD-P0-SL1-SS-v1. */
export type StickSlipMode = "stick" | "slip+" | "slip-";

/** First mode exit on an inspected, single-mode dense continuation. */
export function locateStickSlipEvent(
  mode: StickSlipMode,
  stateAt: (time: number) => StickSlipContinuousState,
  torqueAt: (time: number, state: StickSlipContinuousState) => number,
  times: readonly number[],
  staticTorque: number,
  timeTolerance: number,
): { time: number; leftTime: number; rightTime: number; state: StickSlipContinuousState; nextMode: StickSlipMode } | undefined {
  const outside = (time: number) => {
    const state = stateAt(time);
    return mode === "stick" ? Math.abs(torqueAt(time, state)) > staticTorque
      : (mode === "slip+" ? state.omega < 0 : state.omega > 0);
  };
  for (let index = 1; index < times.length; index += 1) {
    let low = times[index - 1]!, high = times[index]!;
    if (!outside(high)) continue;
    while (high - low > timeTolerance) {
      const middle = (low + high) / 2;
      if (middle === low || middle === high) break;
      if (outside(middle)) high = middle; else low = middle;
    }
    const time = (low + high) / 2;
    const state = { ...stateAt(time), omega: 0 };
    const nextMode = mode === "stick"
      ? (torqueAt(high, stateAt(high)) > 0 ? "slip+" : "slip-")
      : selectModeAtRest(torqueAt(time, state), staticTorque);
    return { time, leftTime: low, rightTime: high, state, nextMode };
  }
  return undefined;
}

export interface StickSlipParameters {
  /** Static-friction limit tau_s, in N m. */
  staticFrictionTorque: number;
  /** Sliding Coulomb-friction magnitude tau_k, in N m. */
  kineticFrictionTorque: number;
  /** Linear viscous coefficient c_b, in N m s/rad. */
  viscousDamping: number;
}

export interface StickSlipMechanicalInput extends StickSlipParameters {
  /** Effective moment of inertia J, in kg m^2. */
  effectiveInertia: number;
  /**
   * F12.4 driving torque T, excluding both viscous and Coulomb bearing
   * friction.  It includes fluid/control torques, -V'(theta), and
   * -0.5 J'(theta) omega^2.
   */
  drivingTorque: number;
  /** The physical angular velocity. No numerical velocity deadband is used. */
  omega: number;
}

export interface StickSlipMechanicalEvaluation {
  mode: StickSlipMode;
  acceleration: number;
  /** Torque applied to the body by the complete SS bearing law. */
  axisFrictionTorque: number;
  /** Non-negative mechanical dissipation rate from the SS bearing law. */
  dampingPower: number;
  /** tau_s - |T_0|; non-negative is the closed sticking set. */
  staticFrictionMargin: number;
  /** Signed distance to omega=0 along the active sliding direction. */
  slipStopMargin: number | null;
  /** Whether the supplied continuous state is valid in the selected mode. */
  modeAdmissible: boolean;
}

export interface StickSlipContinuousState {
  theta: number;
  omega: number;
  wakeReal: number;
  wakeImaginary: number;
}

export type StickSlipContinuousDerivative = StickSlipContinuousState;

export interface StickSlipMotion {
  theta: number;
  omega: number;
  acceleration: number;
  wakeReal: number;
  wakeImaginary: number;
}

export interface StickSlipDerivativeEvaluation {
  derivative: StickSlipContinuousDerivative;
  mechanics: StickSlipMechanicalEvaluation;
}

export type StickSlipWakeRhs = (
  motion: Readonly<StickSlipMotion>,
) => Readonly<{ wakeReal: number; wakeImaginary: number }>;

function requireFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

function validateParameters(parameters: StickSlipParameters): void {
  requireFinite("staticFrictionTorque", parameters.staticFrictionTorque);
  requireFinite("kineticFrictionTorque", parameters.kineticFrictionTorque);
  requireFinite("viscousDamping", parameters.viscousDamping);
  if (parameters.kineticFrictionTorque < 0) {
    throw new RangeError("kineticFrictionTorque must be non-negative");
  }
  if (parameters.staticFrictionTorque < parameters.kineticFrictionTorque) {
    throw new RangeError("staticFrictionTorque must be at least kineticFrictionTorque");
  }
  if (parameters.viscousDamping < 0) {
    throw new RangeError("viscousDamping must be non-negative");
  }
}

function slidingDirection(mode: StickSlipMode): -1 | 0 | 1 {
  if (mode === "slip+") return 1;
  if (mode === "slip-") return -1;
  return 0;
}

/**
 * F12.4 static-friction margin. Equality remains inside the sticking set.
 */
export function staticFrictionMargin(
  drivingTorqueAtRest: number,
  staticFrictionTorque: number,
): number {
  requireFinite("drivingTorqueAtRest", drivingTorqueAtRest);
  requireFinite("staticFrictionTorque", staticFrictionTorque);
  if (staticFrictionTorque < 0) {
    throw new RangeError("staticFrictionTorque must be non-negative");
  }
  return staticFrictionTorque - Math.abs(drivingTorqueAtRest);
}

/**
 * Select the constitutive solution at the exact physical state omega=0.
 * The closed threshold (including equality) sticks; a strict exceedance
 * breaks away in the direction of the rest-state driving torque.
 */
export function selectModeAtRest(
  drivingTorqueAtRest: number,
  staticFrictionTorque: number,
): StickSlipMode {
  const margin = staticFrictionMargin(drivingTorqueAtRest, staticFrictionTorque);
  if (margin >= 0) return "stick";
  return drivingTorqueAtRest > 0 ? "slip+" : "slip-";
}

/** F12.4 initial-mode selection without a numerical velocity deadband. */
export function selectInitialStickSlipMode(
  omega: number,
  drivingTorqueAtRest: number,
  staticFrictionTorque: number,
): StickSlipMode {
  requireFinite("omega", omega);
  if (omega > 0) return "slip+";
  if (omega < 0) return "slip-";
  return selectModeAtRest(drivingTorqueAtRest, staticFrictionTorque);
}

/**
 * A sticking interval exits only after the right-side state lies strictly
 * outside the closed static-friction set. Touching equality is not breakaway.
 */
export function didExitStaticRegion(
  leftMargin: number,
  rightMargin: number,
): boolean {
  requireFinite("leftMargin", leftMargin);
  requireFinite("rightMargin", rightMargin);
  return leftMargin >= 0 && rightMargin < 0;
}

/** Detect the first zero-speed event while preserving the active slip sign. */
export function didReachSlipStop(
  mode: Exclude<StickSlipMode, "stick">,
  leftOmega: number,
  rightOmega: number,
): boolean {
  requireFinite("leftOmega", leftOmega);
  requireFinite("rightOmega", rightOmega);
  return mode === "slip+"
    ? leftOmega > 0 && rightOmega <= 0
    : leftOmega < 0 && rightOmega >= 0;
}

/**
 * Re-select a mode at a located zero-speed event. Returning the same state
 * object makes the no-impulse/no-wake-reset contract explicit.
 */
export function restartStickSlipAtRest<State extends { omega: number }>(
  state: State,
  drivingTorqueAtRest: number,
  staticFrictionTorque: number,
): { state: State; mode: StickSlipMode } {
  requireFinite("state.omega", state.omega);
  if (state.omega !== 0) {
    throw new RangeError("stick-slip restart requires the located state omega=0");
  }
  return {
    state,
    mode: selectModeAtRest(drivingTorqueAtRest, staticFrictionTorque),
  };
}

/**
 * Restart from a located static-threshold root after a strict right-side exit.
 * The root itself lies on the closed sticking boundary, so the mode direction
 * must come from a state just to its right rather than from the equality point.
 */
export function restartStickSlipAfterStaticExit<State extends { omega: number }>(
  locatedState: State,
  rightSideDrivingTorque: number,
  staticFrictionTorque: number,
): { state: State; mode: Exclude<StickSlipMode, "stick"> } {
  requireFinite("locatedState.omega", locatedState.omega);
  if (locatedState.omega !== 0) {
    throw new RangeError("static-threshold restart requires the located state omega=0");
  }
  const mode = selectModeAtRest(rightSideDrivingTorque, staticFrictionTorque);
  if (mode === "stick") {
    throw new RangeError("right-side driving torque has not strictly left the sticking set");
  }
  return { state: locatedState, mode };
}

/** Evaluate F12.5 or F12.6 for the mechanical coordinate. */
export function evaluateStickSlipMechanics(
  mode: StickSlipMode,
  input: StickSlipMechanicalInput,
): StickSlipMechanicalEvaluation {
  validateParameters(input);
  requireFinite("effectiveInertia", input.effectiveInertia);
  requireFinite("drivingTorque", input.drivingTorque);
  requireFinite("omega", input.omega);
  if (!(input.effectiveInertia > 0)) {
    throw new RangeError("effectiveInertia must be positive");
  }

  const margin = staticFrictionMargin(
    input.drivingTorque,
    input.staticFrictionTorque,
  );
  if (mode === "stick") {
    return {
      mode,
      acceleration: 0,
      axisFrictionTorque: -input.drivingTorque,
      dampingPower: 0,
      staticFrictionMargin: margin,
      slipStopMargin: null,
      modeAdmissible: input.omega === 0 && margin >= 0,
    };
  }

  const direction = slidingDirection(mode);
  const axisFrictionTorque = -input.viscousDamping * input.omega
    - direction * input.kineticFrictionTorque;
  const acceleration = (
    input.drivingTorque + axisFrictionTorque
  ) / input.effectiveInertia;
  const signConsistent = direction * input.omega > 0;
  const validBreakawayAtZero = input.omega === 0
    && margin < 0
    && direction * input.drivingTorque > 0;
  return {
    mode,
    acceleration,
    axisFrictionTorque,
    dampingPower: input.viscousDamping * input.omega * input.omega
      + input.kineticFrictionTorque * Math.abs(input.omega),
    staticFrictionMargin: margin,
    slipStopMargin: direction * input.omega,
    modeAdmissible: signConsistent || validBreakawayAtZero,
  };
}

/**
 * Compose the four-state derivative on one selected smooth mode. The wake RHS
 * is called in every mode, including stick, with omega=alpha=0 in stick. This
 * preserves F12.6 while allowing the production model to supply its calibrated
 * Stuart-Landau coefficients and gamma_0 theta forcing.
 */
export function evaluateStickSlipDerivative(
  mode: StickSlipMode,
  state: Readonly<StickSlipContinuousState>,
  input: Omit<StickSlipMechanicalInput, "omega">,
  wakeRhs: StickSlipWakeRhs,
): StickSlipDerivativeEvaluation {
  requireFinite("state.theta", state.theta);
  requireFinite("state.omega", state.omega);
  requireFinite("state.wakeReal", state.wakeReal);
  requireFinite("state.wakeImaginary", state.wakeImaginary);
  const mechanics = evaluateStickSlipMechanics(mode, {
    ...input,
    omega: state.omega,
  });
  const motion: StickSlipMotion = {
    theta: state.theta,
    omega: mode === "stick" ? 0 : state.omega,
    acceleration: mechanics.acceleration,
    wakeReal: state.wakeReal,
    wakeImaginary: state.wakeImaginary,
  };
  const wake = wakeRhs(motion);
  requireFinite("wake derivative real part", wake.wakeReal);
  requireFinite("wake derivative imaginary part", wake.wakeImaginary);
  return {
    derivative: {
      theta: mode === "stick" ? 0 : state.omega,
      omega: mechanics.acceleration,
      wakeReal: wake.wakeReal,
      wakeImaginary: wake.wakeImaginary,
    },
    mechanics,
  };
}
