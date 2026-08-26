import { QUALIFICATION_CONTRACT } from "./contracts.ts";

/**
 * Frozen before the first A8C matrix run.  The velocity levels define the
 * mean-Mach scan through M = u / c_s.  Reynolds number is deliberately a
 * derived diagnostic, not a controlled axis, because u, tau and nominal
 * cylinder resolution are independently crossed in this numerical envelope.
 */
export const ROBUSTNESS_CONTRACT = Object.freeze({
  format: "VP-A8-CBC2D-ROBUSTNESS-CONTRACT-v1",
  axes: Object.freeze({
    inletVelocityLattice: Object.freeze([0.04, 0.06, 0.08]),
    relaxationTime: Object.freeze([0.54, 0.56, 0.58]),
    downstreamOutletDistanceDiameters: Object.freeze([6, 9.25, 12.5]),
    nominalCylinderDiameterCells: Object.freeze([8, 12, 16]),
  }),
  geometry: Object.freeze({
    inletToCylinderCenterDiameters: 3.5,
    crossStreamSpanDiameters: 14 / 3,
    referenceDomainLengthDiameters: 25,
    probeXDiameters: 6.25,
    fieldXStartDiameters: 55 / 12,
    fieldOutletBufferDiameters: 5 / 6,
    stepsPerDiameter: 130 / 3,
    lateWindowStartFraction: 17 / 26,
  }),
  gates: Object.freeze({
    maximumDensityDeviation:
      QUALIFICATION_CONTRACT.numericalStability.maximumDensityDeviation,
    maximumMach: QUALIFICATION_CONTRACT.numericalStability.maximumMach,
    minimumProbeRmsImprovementAgainstZouHe:
      QUALIFICATION_CONTRACT.fixedCylinderStartup
        .minimumProbeRmsImprovementAgainstZouHe,
    minimumFieldErrorImprovementAgainstZouHe:
      QUALIFICATION_CONTRACT.fixedCylinderStartup
        .minimumFieldErrorImprovementAgainstZouHe,
    requireReferenceStable: true,
    requireZouHeStable: true,
    requireEveryCasePass: true,
  }),
});

export type RobustnessContract = typeof ROBUSTNESS_CONTRACT;
