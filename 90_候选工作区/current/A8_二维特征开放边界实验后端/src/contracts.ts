export const QUALIFICATION_CONTRACT = Object.freeze({
  format: "VP-A8-CBC2D-QUALIFICATION-CONTRACT-v1",
  numericalStability: Object.freeze({
    maximumDensityDeviation: 0.12,
    maximumMach: 0.30,
  }),
  acousticPulse: Object.freeze({
    maximumNormalizedReferenceError: 0.10,
    minimumImprovementAgainstZouHe: 0.50,
  }),
  convectedVortex: Object.freeze({
    maximumNormalizedReferenceError: 0.45,
    minimumImprovementAgainstZouHe: 0.15,
  }),
  fixedCylinderStartup: Object.freeze({
    minimumProbeRmsImprovementAgainstZouHe: 0.20,
    minimumFieldErrorImprovementAgainstZouHe: 0.10,
  }),
});

export type QualificationContract = typeof QUALIFICATION_CONTRACT;
