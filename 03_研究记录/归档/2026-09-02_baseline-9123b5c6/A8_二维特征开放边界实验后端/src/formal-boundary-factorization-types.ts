export interface Stability {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumMach: number;
  maximumMachStep: number;
  minimumDensity: number;
  maximumDensity: number;
  densityExtremum: {
    kind: "minimum" | "maximum";
    density: number;
    x: number;
    y: number;
    brinkmanMaskIndicator: number;
  };
}
