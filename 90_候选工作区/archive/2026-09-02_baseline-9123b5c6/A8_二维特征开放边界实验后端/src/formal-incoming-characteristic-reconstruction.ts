import { FORMAL_INCOMING_CHARACTERISTIC_CONTRACT as CONTRACT } from
  "./formal-incoming-characteristic-contract.ts";
import type { IncomingCharacteristicBoundaryRow } from
  "./formal-incoming-characteristic-boundary.ts";
import type { PopulationMassSummary, QualificationPhase } from
  "./formal-inlet-qualification-types.ts";
import type {
  ReconstructionStepRecord,
  ReconstructionSummary,
} from "./formal-incoming-characteristic-types.ts";

export function buildReconstructionStepRecord(
  step: number,
  phase: QualificationPhase,
  farFieldUx: number,
  rows: readonly IncomingCharacteristicBoundaryRow[],
): ReconstructionStepRecord {
  return {
    step,
    phase,
    farFieldUx,
    rowCount: rows.length,
    knownMomentK: rows.map((row) => row.knownMomentK),
    discriminant: rows.map((row) => row.discriminant),
    targetRho: rows.map((row) => row.targetRho),
    targetUx: rows.map((row) => row.targetUx),
    targetUy: rows.map((row) => row.targetUy),
    actualRho: rows.map((row) => row.actualRho),
    actualUx: rows.map((row) => row.actualUx),
    actualUy: rows.map((row) => row.actualUy),
    incomingCharacteristicResidual:
      rows.map((row) => row.incomingCharacteristicResidual),
    discreteCompatibilityResidual:
      rows.map((row) => row.discreteCompatibilityResidual),
    densityMomentResidual: rows.map((row) => row.densityMomentResidual),
    uxMomentResidual: rows.map((row) => row.uxMomentResidual),
    uyMomentResidual: rows.map((row) => row.uyMomentResidual),
    knownPopulationMaximumAbsoluteDifference:
      rows.map((row) => row.knownPopulationMaximumAbsoluteDifference),
    boundaryMach: rows.map((row) => row.boundaryMach),
  };
}

function minimum(values: readonly number[]): number {
  let result = Number.POSITIVE_INFINITY;
  for (const value of values) result = Math.min(result, value);
  return result;
}

function maximumAbsolute(values: readonly number[]): number {
  let result = 0;
  for (const value of values) result = Math.max(result, Math.abs(value));
  return result;
}

function cumulativeNonIncomingAbsoluteModification(
  massSummary: PopulationMassSummary | undefined,
): number {
  if (massSummary === undefined) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (const direction of CONTRACT.exactPopulationMassBudget
    .directionGroups.nonIncomingKnown) {
    total += massSummary.cumulativeAdapterAbsoluteByDirection[direction] ?? 0;
  }
  return total;
}

export function finishReconstructionSummary(
  applicable: boolean,
  records: readonly ReconstructionStepRecord[],
  massSummary: PopulationMassSummary | undefined,
  expectedSteps: number,
  expectedRowsPerStep: number,
): ReconstructionSummary {
  const nonIncomingModification = cumulativeNonIncomingAbsoluteModification(
    massSummary,
  );
  const nonIncomingModificationPass = nonIncomingModification
    === CONTRACT.exactPopulationMassBudget.gates
      .maximumNonIncomingAbsoluteModification;
  if (!applicable) {
    return {
      applicable: false,
      stepRecordCount: 0,
      rowRecordCount: 0,
      minimumKnownMomentK: null,
      minimumDiscriminant: null,
      minimumTargetDensity: null,
      maximumBoundaryMach: null,
      maximumIncomingCharacteristicAbsoluteResidual: null,
      maximumDiscreteCompatibilityAbsoluteResidual: null,
      maximumDensityMomentAbsoluteResidual: null,
      maximumVelocityMomentAbsoluteResidual: null,
      maximumKnownPopulationAbsoluteDifference: null,
      cumulativeNonIncomingAbsoluteModification: nonIncomingModification,
      gates: {
        complete: records.length === 0,
        finite: true,
        knownMomentPass: null,
        discriminantPass: null,
        densityPass: null,
        boundaryMachPass: null,
        incomingCharacteristicPass: null,
        discreteCompatibilityPass: null,
        densityMomentPass: null,
        velocityMomentPass: null,
        knownPopulationPass: null,
        nonIncomingModificationPass,
        pass: records.length === 0 && nonIncomingModificationPass,
      },
    };
  }

  const k = records.flatMap((record) => record.knownMomentK);
  const discriminant = records.flatMap((record) => record.discriminant);
  const density = records.flatMap((record) => record.targetRho);
  const boundaryMach = records.flatMap((record) => record.boundaryMach);
  const incoming = records.flatMap((record) =>
    record.incomingCharacteristicResidual);
  const compatibility = records.flatMap((record) =>
    record.discreteCompatibilityResidual);
  const densityResidual = records.flatMap((record) => record.densityMomentResidual);
  const uxResidual = records.flatMap((record) => record.uxMomentResidual);
  const uyResidual = records.flatMap((record) => record.uyMomentResidual);
  const knownDifference = records.flatMap((record) =>
    record.knownPopulationMaximumAbsoluteDifference);
  const allArrays = [
    k,
    discriminant,
    density,
    boundaryMach,
    incoming,
    compatibility,
    densityResidual,
    uxResidual,
    uyResidual,
    knownDifference,
  ];
  const rowRecordCount = k.length;
  const complete = records.length === expectedSteps
    && rowRecordCount === expectedSteps * expectedRowsPerStep
    && records.every((record) => record.rowCount === expectedRowsPerStep);
  const finite = allArrays.every((values) => values.every(Number.isFinite));
  const minimumKnownMomentK = k.length === 0 ? null : minimum(k);
  const minimumDiscriminant = discriminant.length === 0
    ? null
    : minimum(discriminant);
  const minimumTargetDensity = density.length === 0 ? null : minimum(density);
  const maximumBoundaryMach = boundaryMach.length === 0
    ? null
    : maximumAbsolute(boundaryMach);
  const maximumIncomingCharacteristicAbsoluteResidual = incoming.length === 0
    ? null
    : maximumAbsolute(incoming);
  const maximumDiscreteCompatibilityAbsoluteResidual = compatibility.length === 0
    ? null
    : maximumAbsolute(compatibility);
  const maximumDensityMomentAbsoluteResidual = densityResidual.length === 0
    ? null
    : maximumAbsolute(densityResidual);
  const maximumVelocityMomentAbsoluteResidual = uxResidual.length === 0
    ? null
    : Math.max(maximumAbsolute(uxResidual), maximumAbsolute(uyResidual));
  const maximumKnownPopulationAbsoluteDifference = knownDifference.length === 0
    ? null
    : maximumAbsolute(knownDifference);
  const gates = CONTRACT.reconstructionQualification.gates;
  const knownMomentPass = minimumKnownMomentK !== null
    && minimumKnownMomentK > gates.minimumKExclusive;
  const discriminantPass = minimumDiscriminant !== null
    && minimumDiscriminant > gates.minimumDiscriminantExclusive;
  const densityPass = minimumTargetDensity !== null
    && minimumTargetDensity > gates.minimumDensityExclusive;
  const boundaryMachPass = maximumBoundaryMach !== null
    && maximumBoundaryMach <= gates.maximumBoundaryMach;
  const incomingCharacteristicPass =
    maximumIncomingCharacteristicAbsoluteResidual !== null
    && maximumIncomingCharacteristicAbsoluteResidual
      <= gates.maximumIncomingCharacteristicAbsoluteResidual;
  const discreteCompatibilityPass =
    maximumDiscreteCompatibilityAbsoluteResidual !== null
    && maximumDiscreteCompatibilityAbsoluteResidual
      <= gates.maximumDiscreteCompatibilityAbsoluteResidual;
  const densityMomentPass = maximumDensityMomentAbsoluteResidual !== null
    && maximumDensityMomentAbsoluteResidual
      <= gates.maximumDensityMomentAbsoluteResidual;
  const velocityMomentPass = maximumVelocityMomentAbsoluteResidual !== null
    && maximumVelocityMomentAbsoluteResidual
      <= gates.maximumVelocityMomentAbsoluteResidual;
  const knownPopulationPass = maximumKnownPopulationAbsoluteDifference !== null
    && maximumKnownPopulationAbsoluteDifference
      === gates.maximumKnownPopulationAbsoluteDifference;
  const pass = complete
    && finite
    && knownMomentPass
    && discriminantPass
    && densityPass
    && boundaryMachPass
    && incomingCharacteristicPass
    && discreteCompatibilityPass
    && densityMomentPass
    && velocityMomentPass
    && knownPopulationPass
    && nonIncomingModificationPass;
  return {
    applicable: true,
    stepRecordCount: records.length,
    rowRecordCount,
    minimumKnownMomentK,
    minimumDiscriminant,
    minimumTargetDensity,
    maximumBoundaryMach,
    maximumIncomingCharacteristicAbsoluteResidual,
    maximumDiscreteCompatibilityAbsoluteResidual,
    maximumDensityMomentAbsoluteResidual,
    maximumVelocityMomentAbsoluteResidual,
    maximumKnownPopulationAbsoluteDifference,
    cumulativeNonIncomingAbsoluteModification: nonIncomingModification,
    gates: {
      complete,
      finite,
      knownMomentPass,
      discriminantPass,
      densityPass,
      boundaryMachPass,
      incomingCharacteristicPass,
      discreteCompatibilityPass,
      densityMomentPass,
      velocityMomentPass,
      knownPopulationPass,
      nonIncomingModificationPass,
      pass,
    },
  };
}
