import type {
  BrinkmanStepExchange,
  LbmBodyKinematics,
  LbmCheckpoint,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { CS2 } from "./d2q9.ts";
import type { IncomingCharacteristicBoundaryRow } from
  "./formal-incoming-characteristic-boundary.ts";
import {
  FORMAL_CAUSAL_REFERENCE_CONTRACT as CONTRACT,
  type FormalCausalReferenceStrategy,
} from "./formal-causal-reference-contract.ts";

export type CausalReferencePhase =
  "causal" | "statistics" | "perturbation-test" | "perturbation-reference";

export interface CompactMassStepRecord {
  step: number;
  phase: CausalReferencePhase;
  preFormalTotalMass: number;
  postFormalTotalMass: number;
  postCandidateTotalMass: number;
  formalMassChange: number;
  adapterByDirection: number[];
  adapterAbsoluteByDirection: number[];
  adapterTotal: number;
  actualMassChange: number;
  budgetMassChange: number;
  closureResidual: number;
  normalizedClosureResidual: number;
  cumulativeClosureResidual: number;
  cumulativeAbsoluteExchange: number;
  normalizedCumulativeClosureResidual: number;
}

export interface CompactMassSummary {
  stepRecordCount: number;
  initialTotalMass: number;
  finalTotalMass: number;
  cumulativeFormalMassChange: number;
  cumulativeAdapterMass: number;
  cumulativeAdapterByDirection: number[];
  cumulativeAdapterAbsoluteByDirection: number[];
  cumulativeClosureResidual: number;
  cumulativeAbsoluteExchange: number;
  maximumNormalizedStepClosureResidual: number;
  maximumNormalizedCumulativeClosureResidual: number;
  cumulativeNonIncomingAbsoluteModification: number;
  gates: {
    complete: boolean;
    finite: boolean;
    stepClosurePass: boolean;
    cumulativeClosurePass: boolean;
    nonIncomingModificationPass: boolean;
    pass: boolean;
  };
}

export interface MutableCompactMassLedger {
  initialTotalMass: number;
  finalTotalMass: number;
  stepRecordCount: number;
  cumulativeFormalMassChange: number;
  cumulativeAdapterMass: number;
  cumulativeAdapterByDirection: number[];
  cumulativeAdapterAbsoluteByDirection: number[];
  cumulativeClosureResidual: number;
  cumulativeAbsoluteExchange: number;
  maximumNormalizedStepClosureResidual: number;
  maximumNormalizedCumulativeClosureResidual: number;
  finite: boolean;
}

export interface CompactReconstructionStepRecord {
  step: number;
  rowCount: number;
  minimumKnownMomentK: number;
  minimumDiscriminant: number;
  minimumTargetDensity: number;
  maximumBoundaryMach: number;
  maximumIncomingCharacteristicAbsoluteResidual: number;
  maximumDiscreteCompatibilityAbsoluteResidual: number;
  maximumDensityMomentAbsoluteResidual: number;
  maximumVelocityMomentAbsoluteResidual: number;
  maximumKnownPopulationAbsoluteDifference: number;
  rowDigestFnv1a32: string;
}

export interface CompactReconstructionSummary {
  applicable: boolean;
  stepRecordCount: number;
  rowRecordCount: number;
  minimumKnownMomentK: number | null;
  minimumDiscriminant: number | null;
  minimumTargetDensity: number | null;
  maximumBoundaryMach: number | null;
  maximumIncomingCharacteristicAbsoluteResidual: number | null;
  maximumDiscreteCompatibilityAbsoluteResidual: number | null;
  maximumDensityMomentAbsoluteResidual: number | null;
  maximumVelocityMomentAbsoluteResidual: number | null;
  maximumKnownPopulationAbsoluteDifference: number | null;
  cumulativeNonIncomingAbsoluteModification: number;
  stepDigestFnv1a32: string;
  gates: {
    complete: boolean;
    finite: boolean;
    knownMomentPass: boolean | null;
    discriminantPass: boolean | null;
    densityPass: boolean | null;
    boundaryMachPass: boolean | null;
    incomingCharacteristicPass: boolean | null;
    discreteCompatibilityPass: boolean | null;
    densityMomentPass: boolean | null;
    velocityMomentPass: boolean | null;
    knownPopulationPass: boolean | null;
    nonIncomingModificationPass: boolean;
    pass: boolean;
  };
}

export interface StabilityEnvelope {
  maximumDensityDeviation: number;
  maximumDensityDeviationStep: number;
  maximumMach: number;
  maximumMachStep: number;
  minimumDensity: number;
  maximumDensity: number;
}

export interface LoadSample {
  step: number;
  drag: number;
  lift: number;
}

export interface FieldCapture {
  rho: Float64Array;
  ux: Float64Array;
  uy: Float64Array;
  mask: Float64Array;
  fictitiousMomentumX: number;
  fictitiousMomentumY: number;
  minimumDensity: number;
  maximumDensity: number;
  maximumSpeed: number;
}

export interface CoefficientSummary {
  samples: number;
  meanDrag: number;
  meanLift: number;
  dragRms: number;
  liftRms: number;
  dragFluctuationRms: number;
  liftFluctuationRms: number;
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const FNV_FLOAT_BUFFER = new ArrayBuffer(8);
const FNV_FLOAT_VIEW = new DataView(FNV_FLOAT_BUFFER);

function updateFnvWord(hash: number, value: number): number {
  return Math.imul(hash ^ value, FNV_PRIME) >>> 0;
}

function updateFnvFloat(hash: number, value: number): number {
  FNV_FLOAT_VIEW.setFloat64(0, value, true);
  return updateFnvWord(
    updateFnvWord(hash, FNV_FLOAT_VIEW.getUint32(0, true)),
    FNV_FLOAT_VIEW.getUint32(4, true),
  );
}

function updateFnvString(hash: number, value: string): number {
  let result = hash;
  for (let index = 0; index < value.length; index += 1) {
    result = updateFnvWord(result, value.charCodeAt(index));
  }
  return result;
}

function fnvHex(hash: number): string {
  return hash.toString(16).padStart(8, "0");
}

function sum(values: readonly number[]): number {
  let result = 0;
  for (const value of values) result += value;
  return result;
}

export function totalPopulationMass(distributions: ArrayLike<number>): number {
  let result = 0;
  for (let index = 0; index < distributions.length; index += 1) {
    result += distributions[index] ?? Number.NaN;
  }
  if (!Number.isFinite(result)) {
    throw new RangeError("A8O population mass became non-finite");
  }
  return result;
}

export function createCompactMassLedger(
  initial: LbmCheckpoint,
): MutableCompactMassLedger {
  const initialTotalMass = totalPopulationMass(initial.distributions);
  return {
    initialTotalMass,
    finalTotalMass: initialTotalMass,
    stepRecordCount: 0,
    cumulativeFormalMassChange: 0,
    cumulativeAdapterMass: 0,
    cumulativeAdapterByDirection: Array<number>(9).fill(0),
    cumulativeAdapterAbsoluteByDirection: Array<number>(9).fill(0),
    cumulativeClosureResidual: 0,
    cumulativeAbsoluteExchange: 0,
    maximumNormalizedStepClosureResidual: 0,
    maximumNormalizedCumulativeClosureResidual: 0,
    finite: true,
  };
}

export function recordCompactMassStep(
  step: number,
  phase: CausalReferencePhase,
  preFormalTotalMass: number,
  formalCheckpoint: LbmCheckpoint,
  candidateCheckpoint: LbmCheckpoint,
  ledger: MutableCompactMassLedger,
): CompactMassStepRecord {
  if (formalCheckpoint.distributions.length
    !== candidateCheckpoint.distributions.length) {
    throw new RangeError("A8O formal/candidate population length mismatch");
  }
  const adapterByDirection = Array<number>(9).fill(0);
  const adapterAbsoluteByDirection = Array<number>(9).fill(0);
  let postFormalTotalMass = 0;
  let postCandidateTotalMass = 0;
  for (let index = 0; index < formalCheckpoint.distributions.length; index += 1) {
    const formalValue = formalCheckpoint.distributions[index] ?? Number.NaN;
    const candidateValue = candidateCheckpoint.distributions[index] ?? Number.NaN;
    const delta = candidateValue - formalValue;
    if (!Number.isFinite(delta)) {
      throw new RangeError(
        "A8O non-finite adapter delta at population " + index,
      );
    }
    postFormalTotalMass += formalValue;
    postCandidateTotalMass += candidateValue;
    const direction = index % 9;
    adapterByDirection[direction] = (adapterByDirection[direction] ?? 0) + delta;
    adapterAbsoluteByDirection[direction] =
      (adapterAbsoluteByDirection[direction] ?? 0) + Math.abs(delta);
  }
  if (![postFormalTotalMass, postCandidateTotalMass].every(Number.isFinite)) {
    throw new RangeError("A8O post-step population mass became non-finite");
  }
  const formalMassChange = postFormalTotalMass - preFormalTotalMass;
  const adapterTotal = sum(adapterByDirection);
  const actualMassChange = postCandidateTotalMass - preFormalTotalMass;
  const budgetMassChange = formalMassChange + adapterTotal;
  const closureResidual = actualMassChange - budgetMassChange;
  const absoluteExchange = Math.abs(formalMassChange) + Math.abs(adapterTotal);
  const normalizedClosureResidual = Math.abs(closureResidual)
    / Math.max(1, Math.abs(formalMassChange), Math.abs(adapterTotal));

  ledger.stepRecordCount += 1;
  ledger.finalTotalMass = postCandidateTotalMass;
  ledger.cumulativeFormalMassChange += formalMassChange;
  ledger.cumulativeAdapterMass += adapterTotal;
  ledger.cumulativeClosureResidual += closureResidual;
  ledger.cumulativeAbsoluteExchange += absoluteExchange;
  for (let direction = 0; direction < 9; direction += 1) {
    ledger.cumulativeAdapterByDirection[direction] =
      (ledger.cumulativeAdapterByDirection[direction] ?? 0)
      + (adapterByDirection[direction] ?? 0);
    ledger.cumulativeAdapterAbsoluteByDirection[direction] =
      (ledger.cumulativeAdapterAbsoluteByDirection[direction] ?? 0)
      + (adapterAbsoluteByDirection[direction] ?? 0);
  }
  const normalizedCumulativeClosureResidual = Math.abs(
    ledger.cumulativeClosureResidual,
  ) / Math.max(1, ledger.cumulativeAbsoluteExchange);
  ledger.maximumNormalizedStepClosureResidual = Math.max(
    ledger.maximumNormalizedStepClosureResidual,
    normalizedClosureResidual,
  );
  ledger.maximumNormalizedCumulativeClosureResidual = Math.max(
    ledger.maximumNormalizedCumulativeClosureResidual,
    normalizedCumulativeClosureResidual,
  );
  const finiteValues = [
    preFormalTotalMass,
    postFormalTotalMass,
    postCandidateTotalMass,
    formalMassChange,
    adapterTotal,
    actualMassChange,
    budgetMassChange,
    closureResidual,
    normalizedClosureResidual,
    ledger.cumulativeClosureResidual,
    ledger.cumulativeAbsoluteExchange,
    normalizedCumulativeClosureResidual,
  ];
  ledger.finite &&= finiteValues.every(Number.isFinite)
    && adapterByDirection.every(Number.isFinite)
    && adapterAbsoluteByDirection.every(Number.isFinite);
  if (!ledger.finite) {
    throw new RangeError(
      "A8O non-finite compact population ledger at step " + step,
    );
  }
  return {
    step,
    phase,
    preFormalTotalMass,
    postFormalTotalMass,
    postCandidateTotalMass,
    formalMassChange,
    adapterByDirection,
    adapterAbsoluteByDirection,
    adapterTotal,
    actualMassChange,
    budgetMassChange,
    closureResidual,
    normalizedClosureResidual,
    cumulativeClosureResidual: ledger.cumulativeClosureResidual,
    cumulativeAbsoluteExchange: ledger.cumulativeAbsoluteExchange,
    normalizedCumulativeClosureResidual,
  };
}

export function finishCompactMassLedger(
  ledger: MutableCompactMassLedger,
  expectedSteps: number,
): CompactMassSummary {
  const nonIncoming = [0, 2, 3, 4, 6, 7];
  let cumulativeNonIncomingAbsoluteModification = 0;
  for (const direction of nonIncoming) {
    cumulativeNonIncomingAbsoluteModification +=
      ledger.cumulativeAdapterAbsoluteByDirection[direction] ?? 0;
  }
  const gates = CONTRACT.exactPopulationAccounting.gates;
  const complete = ledger.stepRecordCount === expectedSteps;
  const stepClosurePass = ledger.maximumNormalizedStepClosureResidual
    <= gates.maximumNormalizedStepClosureResidual;
  const cumulativeClosurePass =
    ledger.maximumNormalizedCumulativeClosureResidual
      <= gates.maximumNormalizedCumulativeClosureResidual;
  const nonIncomingModificationPass =
    cumulativeNonIncomingAbsoluteModification
      === gates.maximumNonIncomingAbsoluteModification;
  return {
    stepRecordCount: ledger.stepRecordCount,
    initialTotalMass: ledger.initialTotalMass,
    finalTotalMass: ledger.finalTotalMass,
    cumulativeFormalMassChange: ledger.cumulativeFormalMassChange,
    cumulativeAdapterMass: ledger.cumulativeAdapterMass,
    cumulativeAdapterByDirection: ledger.cumulativeAdapterByDirection,
    cumulativeAdapterAbsoluteByDirection:
      ledger.cumulativeAdapterAbsoluteByDirection,
    cumulativeClosureResidual: ledger.cumulativeClosureResidual,
    cumulativeAbsoluteExchange: ledger.cumulativeAbsoluteExchange,
    maximumNormalizedStepClosureResidual:
      ledger.maximumNormalizedStepClosureResidual,
    maximumNormalizedCumulativeClosureResidual:
      ledger.maximumNormalizedCumulativeClosureResidual,
    cumulativeNonIncomingAbsoluteModification,
    gates: {
      complete,
      finite: ledger.finite,
      stepClosurePass,
      cumulativeClosurePass,
      nonIncomingModificationPass,
      pass: complete
        && ledger.finite
        && stepClosurePass
        && cumulativeClosurePass
        && nonIncomingModificationPass,
    },
  };
}

export function buildCompactReconstructionStep(
  step: number,
  rows: readonly IncomingCharacteristicBoundaryRow[],
): CompactReconstructionStepRecord {
  if (rows.length === 0) {
    throw new RangeError("A8O reconstruction step requires boundary rows");
  }
  let minimumKnownMomentK = Number.POSITIVE_INFINITY;
  let minimumDiscriminant = Number.POSITIVE_INFINITY;
  let minimumTargetDensity = Number.POSITIVE_INFINITY;
  let maximumBoundaryMach = 0;
  let maximumIncomingCharacteristicAbsoluteResidual = 0;
  let maximumDiscreteCompatibilityAbsoluteResidual = 0;
  let maximumDensityMomentAbsoluteResidual = 0;
  let maximumVelocityMomentAbsoluteResidual = 0;
  let maximumKnownPopulationAbsoluteDifference = 0;
  let digest = FNV_OFFSET;
  for (const row of rows) {
    for (const value of [
      row.y,
      row.knownMomentK,
      row.discriminant,
      row.targetRho,
      row.targetUx,
      row.targetUy,
      row.actualRho,
      row.actualUx,
      row.actualUy,
      row.incomingCharacteristicResidual,
      row.discreteCompatibilityResidual,
      row.densityMomentResidual,
      row.uxMomentResidual,
      row.uyMomentResidual,
      row.knownPopulationMaximumAbsoluteDifference,
      row.boundaryMach,
    ]) {
      if (!Number.isFinite(value)) {
        throw new RangeError(
          "A8O non-finite reconstruction value at step " + step,
        );
      }
      digest = updateFnvFloat(digest, value);
    }
    minimumKnownMomentK = Math.min(minimumKnownMomentK, row.knownMomentK);
    minimumDiscriminant = Math.min(minimumDiscriminant, row.discriminant);
    minimumTargetDensity = Math.min(minimumTargetDensity, row.targetRho);
    maximumBoundaryMach = Math.max(maximumBoundaryMach, Math.abs(row.boundaryMach));
    maximumIncomingCharacteristicAbsoluteResidual = Math.max(
      maximumIncomingCharacteristicAbsoluteResidual,
      Math.abs(row.incomingCharacteristicResidual),
    );
    maximumDiscreteCompatibilityAbsoluteResidual = Math.max(
      maximumDiscreteCompatibilityAbsoluteResidual,
      Math.abs(row.discreteCompatibilityResidual),
    );
    maximumDensityMomentAbsoluteResidual = Math.max(
      maximumDensityMomentAbsoluteResidual,
      Math.abs(row.densityMomentResidual),
    );
    maximumVelocityMomentAbsoluteResidual = Math.max(
      maximumVelocityMomentAbsoluteResidual,
      Math.abs(row.uxMomentResidual),
      Math.abs(row.uyMomentResidual),
    );
    maximumKnownPopulationAbsoluteDifference = Math.max(
      maximumKnownPopulationAbsoluteDifference,
      Math.abs(row.knownPopulationMaximumAbsoluteDifference),
    );
  }
  return {
    step,
    rowCount: rows.length,
    minimumKnownMomentK,
    minimumDiscriminant,
    minimumTargetDensity,
    maximumBoundaryMach,
    maximumIncomingCharacteristicAbsoluteResidual,
    maximumDiscreteCompatibilityAbsoluteResidual,
    maximumDensityMomentAbsoluteResidual,
    maximumVelocityMomentAbsoluteResidual,
    maximumKnownPopulationAbsoluteDifference,
    rowDigestFnv1a32: fnvHex(digest),
  };
}

export function finishCompactReconstruction(
  strategy: FormalCausalReferenceStrategy,
  records: readonly CompactReconstructionStepRecord[],
  massSummary: CompactMassSummary,
  expectedSteps: number,
  expectedRowsPerStep: number,
): CompactReconstructionSummary {
  const applicable = strategy
    === "incoming-characteristic-compatible-zou-he";
  const nonIncoming = massSummary.cumulativeNonIncomingAbsoluteModification;
  const nonIncomingModificationPass = nonIncoming
    === CONTRACT.exactPopulationAccounting.gates
      .maximumNonIncomingAbsoluteModification;
  let digest = FNV_OFFSET;
  for (const record of records) {
    digest = updateFnvFloat(digest, record.step);
    digest = updateFnvString(digest, record.rowDigestFnv1a32);
  }
  if (!applicable) {
    const complete = records.length === 0;
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
      cumulativeNonIncomingAbsoluteModification: nonIncoming,
      stepDigestFnv1a32: fnvHex(digest),
      gates: {
        complete,
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
        pass: complete && nonIncomingModificationPass,
      },
    };
  }
  if (records.length === 0) {
    return {
      applicable: true,
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
      cumulativeNonIncomingAbsoluteModification: nonIncoming,
      stepDigestFnv1a32: fnvHex(digest),
      gates: {
        complete: false,
        finite: true,
        knownMomentPass: false,
        discriminantPass: false,
        densityPass: false,
        boundaryMachPass: false,
        incomingCharacteristicPass: false,
        discreteCompatibilityPass: false,
        densityMomentPass: false,
        velocityMomentPass: false,
        knownPopulationPass: false,
        nonIncomingModificationPass,
        pass: false,
      },
    };
  }
  const minimumKnownMomentK = Math.min(
    ...records.map((record) => record.minimumKnownMomentK),
  );
  const minimumDiscriminant = Math.min(
    ...records.map((record) => record.minimumDiscriminant),
  );
  const minimumTargetDensity = Math.min(
    ...records.map((record) => record.minimumTargetDensity),
  );
  const maximumBoundaryMach = Math.max(
    ...records.map((record) => record.maximumBoundaryMach),
  );
  const maximumIncomingCharacteristicAbsoluteResidual = Math.max(
    ...records.map((record) =>
      record.maximumIncomingCharacteristicAbsoluteResidual),
  );
  const maximumDiscreteCompatibilityAbsoluteResidual = Math.max(
    ...records.map((record) =>
      record.maximumDiscreteCompatibilityAbsoluteResidual),
  );
  const maximumDensityMomentAbsoluteResidual = Math.max(
    ...records.map((record) => record.maximumDensityMomentAbsoluteResidual),
  );
  const maximumVelocityMomentAbsoluteResidual = Math.max(
    ...records.map((record) => record.maximumVelocityMomentAbsoluteResidual),
  );
  const maximumKnownPopulationAbsoluteDifference = Math.max(
    ...records.map((record) =>
      record.maximumKnownPopulationAbsoluteDifference),
  );
  const rowRecordCount = records.reduce(
    (count, record) => count + record.rowCount,
    0,
  );
  const complete = records.length === expectedSteps
    && rowRecordCount === expectedSteps * expectedRowsPerStep
    && records.every((record) => record.rowCount === expectedRowsPerStep);
  const values = [
    minimumKnownMomentK,
    minimumDiscriminant,
    minimumTargetDensity,
    maximumBoundaryMach,
    maximumIncomingCharacteristicAbsoluteResidual,
    maximumDiscreteCompatibilityAbsoluteResidual,
    maximumDensityMomentAbsoluteResidual,
    maximumVelocityMomentAbsoluteResidual,
    maximumKnownPopulationAbsoluteDifference,
  ];
  const finite = values.every(Number.isFinite);
  const gates = CONTRACT.reconstructionQualification.gates;
  const knownMomentPass =
    minimumKnownMomentK > gates.minimumKnownMomentKExclusive;
  const discriminantPass =
    minimumDiscriminant > gates.minimumDiscriminantExclusive;
  const densityPass = minimumTargetDensity > gates.minimumDensityExclusive;
  const boundaryMachPass = maximumBoundaryMach <= gates.maximumBoundaryMach;
  const incomingCharacteristicPass =
    maximumIncomingCharacteristicAbsoluteResidual
      <= gates.maximumIncomingCharacteristicAbsoluteResidual;
  const discreteCompatibilityPass =
    maximumDiscreteCompatibilityAbsoluteResidual
      <= gates.maximumDiscreteCompatibilityAbsoluteResidual;
  const densityMomentPass = maximumDensityMomentAbsoluteResidual
    <= gates.maximumDensityMomentAbsoluteResidual;
  const velocityMomentPass = maximumVelocityMomentAbsoluteResidual
    <= gates.maximumVelocityMomentAbsoluteResidual;
  const knownPopulationPass = maximumKnownPopulationAbsoluteDifference
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
    cumulativeNonIncomingAbsoluteModification: nonIncoming,
    stepDigestFnv1a32: fnvHex(digest),
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

export function emptyStabilityEnvelope(): StabilityEnvelope {
  return {
    maximumDensityDeviation: 0,
    maximumDensityDeviationStep: 0,
    maximumMach: 0,
    maximumMachStep: 0,
    minimumDensity: Number.POSITIVE_INFINITY,
    maximumDensity: Number.NEGATIVE_INFINITY,
  };
}

export function captureField(
  field: {
    rho: Float64Array;
    ux: Float64Array;
    uy: Float64Array;
    mask: Float64Array;
  },
): FieldCapture {
  let fictitiousMomentumX = 0;
  let fictitiousMomentumY = 0;
  let minimumDensity = Number.POSITIVE_INFINITY;
  let maximumDensity = Number.NEGATIVE_INFINITY;
  let maximumSpeed = 0;
  for (let cell = 0; cell < field.rho.length; cell += 1) {
    const rho = field.rho[cell] ?? Number.NaN;
    const ux = field.ux[cell] ?? Number.NaN;
    const uy = field.uy[cell] ?? Number.NaN;
    const mask = field.mask[cell] ?? Number.NaN;
    if (!(rho > 0) || ![rho, ux, uy, mask].every(Number.isFinite)) {
      throw new RangeError("A8O invalid macroscopic field at cell " + cell);
    }
    fictitiousMomentumX += mask * rho * ux;
    fictitiousMomentumY += mask * rho * uy;
    minimumDensity = Math.min(minimumDensity, rho);
    maximumDensity = Math.max(maximumDensity, rho);
    maximumSpeed = Math.max(maximumSpeed, Math.hypot(ux, uy));
  }
  return {
    ...field,
    fictitiousMomentumX,
    fictitiousMomentumY,
    minimumDensity,
    maximumDensity,
    maximumSpeed,
  };
}

export function updateStabilityEnvelope(
  envelope: StabilityEnvelope,
  field: FieldCapture,
  step: number,
): void {
  const deviation = Math.max(
    Math.abs(field.minimumDensity - 1),
    Math.abs(field.maximumDensity - 1),
  );
  if (deviation > envelope.maximumDensityDeviation) {
    envelope.maximumDensityDeviation = deviation;
    envelope.maximumDensityDeviationStep = step;
  }
  const mach = field.maximumSpeed
    / CONTRACT.commonNumerics.latticeSoundSpeed;
  if (mach > envelope.maximumMach) {
    envelope.maximumMach = mach;
    envelope.maximumMachStep = step;
  }
  envelope.minimumDensity = Math.min(
    envelope.minimumDensity,
    field.minimumDensity,
  );
  envelope.maximumDensity = Math.max(
    envelope.maximumDensity,
    field.maximumDensity,
  );
}

export function correctedLoadSample(
  step: number,
  exchange: BrinkmanStepExchange,
  before: FieldCapture,
  after: FieldCapture,
  nominalDiameterCells: number,
): LoadSample {
  const scale = 0.5
    * CONTRACT.commonNumerics.inletVelocityLattice ** 2
    * nominalDiameterCells;
  const drag = (
    exchange.rawReactionImpulseX
    + after.fictitiousMomentumX - before.fictitiousMomentumX
  ) / scale;
  const lift = (
    exchange.rawReactionImpulseY
    + after.fictitiousMomentumY - before.fictitiousMomentumY
  ) / scale;
  if (![drag, lift].every(Number.isFinite)) {
    throw new RangeError("A8O non-finite corrected load at step " + step);
  }
  return { step, drag, lift };
}

export function summarizeCoefficients(
  samples: readonly LoadSample[],
): CoefficientSummary {
  if (samples.length === 0) {
    throw new RangeError("A8O coefficient summary requires samples");
  }
  let sumDrag = 0;
  let sumLift = 0;
  for (const sample of samples) {
    sumDrag += sample.drag;
    sumLift += sample.lift;
  }
  const meanDrag = sumDrag / samples.length;
  const meanLift = sumLift / samples.length;
  let dragSquare = 0;
  let liftSquare = 0;
  let dragFluctuationSquare = 0;
  let liftFluctuationSquare = 0;
  for (const sample of samples) {
    dragSquare += sample.drag * sample.drag;
    liftSquare += sample.lift * sample.lift;
    dragFluctuationSquare += (sample.drag - meanDrag) ** 2;
    liftFluctuationSquare += (sample.lift - meanLift) ** 2;
  }
  return {
    samples: samples.length,
    meanDrag,
    meanLift,
    dragRms: Math.sqrt(dragSquare / samples.length),
    liftRms: Math.sqrt(liftSquare / samples.length),
    dragFluctuationRms: Math.sqrt(
      dragFluctuationSquare / samples.length,
    ),
    liftFluctuationRms: Math.sqrt(
      liftFluctuationSquare / samples.length,
    ),
  };
}

export function relativeDifference(
  first: number,
  second: number,
  floor = CONTRACT.operationalDefinitions.statistics.relativeDriftDenominatorFloor,
): number {
  return Math.abs(first - second)
    / Math.max(Math.abs(first), Math.abs(second), floor);
}

export function rms(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let squares = 0;
  for (const value of values) squares += value * value;
  return Math.sqrt(squares / values.length);
}

export function dominantStrouhal(
  lift: readonly number[],
  convectiveTimeStep: number,
): { strouhal: number; normalizedAmplitude: number } {
  if (lift.length === 0 || !(convectiveTimeStep > 0)) {
    throw new RangeError("A8O invalid Strouhal trace");
  }
  const bounds = CONTRACT.continuousStatistics.gates.strouhalSearchInclusive;
  const minimum = bounds[0] ?? Number.NaN;
  const maximum = bounds[1] ?? Number.NaN;
  const increment = CONTRACT.continuousStatistics.gates.strouhalIncrement;
  const mean = sum(lift) / lift.length;
  let bestStrouhal = minimum;
  let bestAmplitude = -1;
  for (
    let strouhal = minimum;
    strouhal <= maximum + 0.5 * increment;
    strouhal += increment
  ) {
    let cosine = 0;
    let minusSine = 0;
    for (let index = 0; index < lift.length; index += 1) {
      const phase = 2 * Math.PI * strouhal * convectiveTimeStep * index;
      const centered = (lift[index] ?? 0) - mean;
      cosine += centered * Math.cos(phase);
      minusSine -= centered * Math.sin(phase);
    }
    const amplitude = 2 * Math.hypot(cosine, minusSine) / lift.length;
    if (amplitude > bestAmplitude) {
      bestAmplitude = amplitude;
      bestStrouhal = strouhal;
    }
  }
  return { strouhal: bestStrouhal, normalizedAmplitude: bestAmplitude };
}

export function cloneCheckpoint(checkpoint: LbmCheckpoint): LbmCheckpoint {
  return { ...checkpoint, distributions: checkpoint.distributions.slice() };
}

export function fixedBody(
  centerX: number,
  centerY: number,
  radius: number,
): LbmBodyKinematics {
  return {
    centerX,
    centerY,
    radius,
    velocityX: 0,
    velocityY: 0,
  };
}

export function pressureProxy(density: number): number {
  return CS2 * (density - 1);
}
