/** Generic Dormand-Prince 5(4) embedded Runge-Kutta kernel. */
export type OdeRhs = (time: number, state: readonly number[]) => readonly number[];

export interface Dopri54Step {
  fifthOrder: number[];
  fourthOrder: number[];
  error: number[];
  rhsEvaluations: 7;
}

function linearCombination(
  base: readonly number[],
  step: number,
  terms: readonly (readonly [number, readonly number[]])[],
): number[] {
  return base.map((value, component) => {
    let increment = 0;
    for (const [coefficient, derivative] of terms) {
      increment += coefficient * (derivative[component] ?? Number.NaN);
    }
    return value + step * increment;
  });
}

function checkedRhs(rhs: OdeRhs, time: number, state: readonly number[], size: number): number[] {
  const value = [...rhs(time, state)];
  if (value.length !== size) throw new RangeError("ODE right-hand side changed vector dimension");
  if (!value.every(Number.isFinite)) throw new RangeError("ODE right-hand side produced NaN/Inf");
  return value;
}

export function dormandPrince54Step(
  rhs: OdeRhs,
  time: number,
  state: readonly number[],
  step: number,
): Dopri54Step {
  if (!Number.isFinite(time) || !Number.isFinite(step) || !(step > 0)) {
    throw new RangeError("DOPRI54 requires finite time and positive step");
  }
  if (state.length === 0 || !state.every(Number.isFinite)) {
    throw new RangeError("DOPRI54 requires a finite non-empty state");
  }
  const size = state.length;
  const k1 = checkedRhs(rhs, time, state, size);
  const k2 = checkedRhs(rhs, time + step / 5, linearCombination(state, step, [
    [1 / 5, k1],
  ]), size);
  const k3 = checkedRhs(rhs, time + 3 * step / 10, linearCombination(state, step, [
    [3 / 40, k1], [9 / 40, k2],
  ]), size);
  const k4 = checkedRhs(rhs, time + 4 * step / 5, linearCombination(state, step, [
    [44 / 45, k1], [-56 / 15, k2], [32 / 9, k3],
  ]), size);
  const k5 = checkedRhs(rhs, time + 8 * step / 9, linearCombination(state, step, [
    [19372 / 6561, k1], [-25360 / 2187, k2], [64448 / 6561, k3], [-212 / 729, k4],
  ]), size);
  const k6 = checkedRhs(rhs, time + step, linearCombination(state, step, [
    [9017 / 3168, k1], [-355 / 33, k2], [46732 / 5247, k3], [49 / 176, k4], [-5103 / 18656, k5],
  ]), size);
  const fifthOrder = linearCombination(state, step, [
    [35 / 384, k1], [500 / 1113, k3], [125 / 192, k4], [-2187 / 6784, k5], [11 / 84, k6],
  ]);
  const k7 = checkedRhs(rhs, time + step, fifthOrder, size);
  const fourthOrder = linearCombination(state, step, [
    [5179 / 57600, k1], [7571 / 16695, k3], [393 / 640, k4],
    [-92097 / 339200, k5], [187 / 2100, k6], [1 / 40, k7],
  ]);
  return {
    fifthOrder,
    fourthOrder,
    error: fifthOrder.map((value, index) => value - (fourthOrder[index] ?? Number.NaN)),
    rhsEvaluations: 7,
  };
}

/** Component-scaled RMS norm used by the adaptive controller. */
export function scaledErrorNorm(
  previous: readonly number[],
  next: readonly number[],
  error: readonly number[],
  absoluteTolerances: readonly number[],
  relativeTolerance: number,
): number {
  const size = previous.length;
  if (size === 0 || next.length !== size || error.length !== size || absoluteTolerances.length !== size) {
    throw new RangeError("error-norm vectors must have equal non-zero dimension");
  }
  let sum = 0;
  for (let index = 0; index < size; index += 1) {
    const scale = (absoluteTolerances[index] ?? 0)
      + relativeTolerance * Math.max(
        Math.abs(previous[index] ?? Number.NaN),
        Math.abs(next[index] ?? Number.NaN),
      );
    if (!(scale > 0) || !Number.isFinite(scale)) throw new RangeError("invalid error scale");
    sum += ((error[index] ?? Number.NaN) / scale) ** 2;
  }
  return Math.sqrt(sum / size);
}

/** Standard bounded I-controller factor for a fifth-order accepted solution. */
export function nextStepFactor(errorNorm: number, accepted: boolean): number {
  if (!Number.isFinite(errorNorm)) return 0.2;
  if (errorNorm === 0) return accepted ? 5 : 0.2;
  const factor = 0.9 * errorNorm ** (-1 / 5);
  return accepted
    ? Math.min(5, Math.max(0.2, factor))
    : Math.min(1, Math.max(0.2, factor));
}
