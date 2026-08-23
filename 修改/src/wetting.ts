export interface WettingActivationOptions {
  /**
   * Dimensionless projected wet fraction at which the wake closure turns on.
   * This is a closure parameter and must be recorded in provenance.
   */
  activationFraction: number;
  /** Wet fractions at or below this value are treated as exactly dry by guards. */
  dryToleranceFraction: number;
}

export interface WettingState {
  projectedArea: number;
  fullProjectedArea: number;
  wetFraction: number;
  activation: number;
  isDry: boolean;
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
  if (!(activationFraction > 0) || !Number.isFinite(activationFraction)) {
    throw new RangeError("activationFraction must be finite and positive");
  }
  const fraction = clamp(wetFraction, 0, 1);
  if (fraction === 0) return 0;
  if (fraction === 1) return 1;
  const scaleSquared = activationFraction * activationFraction;
  const raw = fraction * fraction / (fraction * fraction + scaleSquared);
  const full = 1 / (1 + scaleSquared);
  return clamp(raw / full, 0, 1);
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
  return {
    projectedArea,
    fullProjectedArea,
    wetFraction,
    activation: normalizedWettingActivation(wetFraction, options.activationFraction),
    isDry: wetFraction <= options.dryToleranceFraction,
  };
}
