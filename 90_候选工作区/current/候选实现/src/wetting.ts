export interface WettingActivationOptions {
  /**
   * Dimensionless projected wet fraction at which the wake closure turns on.
   * This is a closure parameter and must be recorded in provenance.
   */
  activationFraction: number;
  /**
   * Dimensionless near-dry diagnostic threshold. It never changes the exact
   * dry physical branch and must not bypass hydrodynamic applicability gates.
   */
  dryToleranceFraction: number;
}

export interface WettingState {
  projectedArea: number;
  fullProjectedArea: number;
  wetFraction: number;
  activation: number;
  /** True only when the geometric projected wet area is exactly zero. */
  isDry: boolean;
  /** Diagnostic/event flag; a near-dry positive area remains a wet state. */
  isNearDry: boolean;
}

export const DEFAULT_WETTING_ACTIVATION_OPTIONS: Readonly<WettingActivationOptions> = Object.freeze({
  activationFraction: 0.05,
  dryToleranceFraction: 1e-9,
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function requireFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be finite and non-negative`);
  }
}

/**
 * Smooth, normalized activation a(lambda) with a(0)=0 and a(1)=1.
 *
 * The quadratic onset suppresses an artificial finite wake RHS when an
 * infinitesimal sliver first becomes wet. The activation scale is not a
 * universal constant; it belongs to the coefficient package.
 */
export function normalizedWettingActivation(
  wetFraction: number,
  activationFraction: number,
): number {
  requireFiniteNonNegative(wetFraction, "wetFraction");
  if (!(activationFraction > 0)
    || !(activationFraction <= 1)
    || !Number.isFinite(activationFraction)) {
    throw new RangeError("activationFraction must be finite and lie in (0,1]");
  }
  const fraction = clamp(wetFraction, 0, 1);
  if (fraction === 0) return 0;
  if (fraction === 1) return 1;
  const scaleSquared = activationFraction * activationFraction;
  // Ratio forms avoid 0/0 underflow when both accepted inputs are tiny.
  const activation = fraction <= activationFraction
    ? (() => {
        const ratioSquared = (fraction / activationFraction) ** 2;
        return ratioSquared * (1 + scaleSquared) / (1 + ratioSquared);
      })()
    : (() => {
        const inverseRatioSquared = (activationFraction / fraction) ** 2;
        return (1 + scaleSquared) / (1 + inverseRatioSquared);
      })();
  if (!Number.isFinite(activation) || activation < 0 || activation > 1) {
    throw new RangeError("wetting activation must be finite and lie in [0,1]");
  }
  return activation;
}

export function wettingStateFromProjectedArea(
  projectedArea: number,
  fullProjectedArea: number,
  options: WettingActivationOptions = DEFAULT_WETTING_ACTIVATION_OPTIONS,
): WettingState {
  requireFiniteNonNegative(projectedArea, "projectedArea");
  if (!(fullProjectedArea > 0) || !Number.isFinite(fullProjectedArea)) {
    throw new RangeError("fullProjectedArea must be finite and positive");
  }
  if (!(options.dryToleranceFraction >= 0)
    || !(options.dryToleranceFraction < 1)
    || !Number.isFinite(options.dryToleranceFraction)) {
    throw new RangeError("dryToleranceFraction must lie in [0,1)");
  }
  const wetFraction = clamp(projectedArea / fullProjectedArea, 0, 1);
  const activation = normalizedWettingActivation(wetFraction, options.activationFraction);
  const isDry = projectedArea === 0;
  return {
    projectedArea,
    fullProjectedArea,
    wetFraction,
    activation,
    isDry,
    isNearDry: wetFraction <= options.dryToleranceFraction,
  };
}
