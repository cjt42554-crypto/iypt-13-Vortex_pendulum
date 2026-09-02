import { readFile } from "node:fs/promises";

import { canonicalBytes, canonicalSha256, sha256 } from "./canonical.mjs";
import {
  analyticWetCircleArea,
  bisectRoot,
  conservativeOscillatorEnergy,
  integrateFourState,
  numericalWetCircleArea,
  relativeDifference,
  simpsonIntegrate,
  trajectoryError,
  validateCoefficientSource,
  variableInertiaAcceleration,
} from "./numerics.mjs";

const ROOT = new URL("../", import.meta.url);
const HASH = /^[0-9a-f]{64}$/u;
const IMPLEMENTATION_FILES = ["src/canonical.mjs", "src/numerics.mjs", "src/qualification.mjs"];

async function readFrozenJson(relativePath) {
  const bytes = await readFile(new URL(relativePath, ROOT));
  return { bytes, sha256: sha256(bytes), value: JSON.parse(bytes.toString("utf8")) };
}

async function implementationIdentity() {
  const files = await Promise.all(
    IMPLEMENTATION_FILES.map(async (path) => {
      const bytes = await readFile(new URL(path, ROOT));
      return { path, sha256: sha256(bytes) };
    }),
  );
  return { files, sha256: canonicalSha256(files) };
}

export async function loadFrozenF1Inputs() {
  const [contract, matrix, implementation] = await Promise.all([
    readFrozenJson("contracts/f1-contract.v1.json"),
    readFrozenJson("contracts/f1-case-matrix.v1.json"),
    implementationIdentity(),
  ]);
  return { contract, matrix, implementation };
}

function isStrictlyDecreasing(values) {
  return values.every((value, index) => index === 0 || value < values[index - 1]);
}

function caseRecord(caseId, referenceId, metrics, pass) {
  return { caseId, referenceId, metrics, pass: Boolean(pass) };
}

function buildOdeCase(contract, matrix, platformIdentity) {
  const errors = {};
  for (const level of contract.stepLevels) {
    const stepSize = matrix.fourStateOde.stepSizes[level];
    const trajectory = integrateFourState(matrix.fourStateOde, stepSize);
    errors[level] = {
      allState: trajectoryError(trajectory, matrix.fourStateOde),
      displacement: trajectoryError(trajectory, matrix.fourStateOde, [0, 2]),
      sampleCount: trajectory.length,
      stepSize,
    };
  }
  const allStateRms = contract.stepLevels.map((level) => errors[level].allState.normalizedRms);
  const displacementRms = contract.stepLevels.map((level) => errors[level].displacement.normalizedRms);
  const nominal = errors.nominal.allState;
  const pass =
    isStrictlyDecreasing(allStateRms) &&
    isStrictlyDecreasing(displacementRms) &&
    nominal.normalizedRms <= contract.gates.nominalNormalizedRmsMaximum &&
    nominal.normalizedMaximum <= contract.gates.nominalNormalizedMaximumMaximum;
  return caseRecord(
    "four-state-ode-convergence",
    "analytic-decoupled-harmonic-oscillators",
    { errors, platformIdentity },
    pass,
  );
}

function buildWetGeometryCase(contract, matrix, platformIdentity) {
  const { circleRadius, waterlineY, simpsonPanels } = matrix.wetGeometry;
  const analyticArea = analyticWetCircleArea(circleRadius, waterlineY);
  const levels = {};
  for (const level of contract.stepLevels) {
    const area = numericalWetCircleArea(circleRadius, waterlineY, simpsonPanels[level]);
    levels[level] = {
      area,
      panels: simpsonPanels[level],
      relativeError: Math.abs(area - analyticArea) / analyticArea,
    };
  }
  const errors = contract.stepLevels.map((level) => levels[level].relativeError);
  return caseRecord(
    "wet-geometry-analytic-reference",
    "analytic-circular-segment-area-below-waterline",
    { analyticArea, levels, platformIdentity },
    isStrictlyDecreasing(errors),
  );
}

function buildEnergyCase(contract, matrix, platformIdentity) {
  const metrics = conservativeOscillatorEnergy(matrix.conservativeOscillator);
  return caseRecord(
    "conservative-energy-balance",
    "unit-mass-unit-stiffness-harmonic-energy",
    { ...metrics, platformIdentity },
    metrics.finalRelativeEnergy <= contract.gates.conservativeFinalRelativeEnergyMaximum &&
      metrics.localRelativeRms <= contract.gates.conservativeLocalRelativeRmsMaximum,
  );
}

function buildEventCase(contract, matrix, platformIdentity) {
  if (matrix.eventRoot.function !== "sin(t)-0.3") throw new Error("F1 event function identity drift");
  const fn = (time) => Math.sin(time) - 0.3;
  const roots = Object.fromEntries(
    Object.entries(matrix.eventRoot.epsilonT).map(([level, epsilon]) => [
      level,
      bisectRoot(fn, matrix.eventRoot.bracket, epsilon),
    ]),
  );
  const fineDifference = Math.abs(roots.fine - roots.reference);
  const allowedDifference = Math.max(10 * matrix.eventRoot.epsilonT.fine, 1e-6);
  return caseRecord(
    "event-root-location",
    "asin(0.3)-principal-root-in-[0,1]",
    {
      roots,
      analyticRoot: Math.asin(0.3),
      fineDifference,
      allowedDifference,
      platformIdentity,
    },
    fineDifference <= allowedDifference,
  );
}

function buildVariableInertiaCase(contract, matrix, platformIdentity) {
  if (matrix.variableInertia.inertiaFunction !== "exp(0.1*t)") throw new Error("F1 inertia function identity drift");
  const fine = variableInertiaAcceleration(matrix.variableInertia, matrix.variableInertia.derivativeSteps.fine);
  const finer = variableInertiaAcceleration(matrix.variableInertia, matrix.variableInertia.derivativeSteps.finer);
  const fineRelativeDifference = relativeDifference(fine.acceleration, finer.acceleration);
  return caseRecord(
    "variable-inertia-acceleration",
    "angular-momentum-balance-tau=d(I*omega)/dt",
    { fine, finer, fineRelativeDifference, platformIdentity },
    fineRelativeDifference <= contract.gates.variableInertiaFineRelativeDifferenceMaximum,
  );
}

function buildOutputIntegrationCase(contract, matrix, platformIdentity) {
  if (matrix.outputIntegration.function !== "sin(t)") throw new Error("F1 output function identity drift");
  const [lower, upper] = matrix.outputIntegration.interval;
  const estimate = simpsonIntegrate(Math.sin, lower, upper, matrix.outputIntegration.simpsonPanels);
  const relativeError = Math.abs(estimate - matrix.outputIntegration.exactIntegral) /
    Math.abs(matrix.outputIntegration.exactIntegral);
  return caseRecord(
    "output-integration",
    "analytic-integral-of-sin-over-[0,pi/2]",
    { estimate, exact: matrix.outputIntegration.exactIntegral, relativeError, platformIdentity },
    relativeError <= contract.gates.outputIntegralRelativeErrorMaximum,
  );
}

function buildCoefficientLabelCase(contract, matrix, platformIdentity) {
  const outcomes = matrix.coefficientSourceCases.map((entry) => ({
    ...entry,
    observedAccepted: validateCoefficientSource(entry.source, entry.claim, contract),
  }));
  return caseRecord(
    "coefficient-source-label",
    "frozen-coefficient-source-policy",
    { outcomes, platformIdentity },
    outcomes.every((entry) => entry.observedAccepted === entry.accepted),
  );
}

function buildNonRepeatCases(contract, matrix, platformIdentity) {
  if (contract.classification !== "synthetic-only" || matrix.classification !== "synthetic-only") {
    throw new Error("F1 accepts synthetic-only inputs");
  }
  return [
    buildOdeCase(contract, matrix, platformIdentity),
    buildWetGeometryCase(contract, matrix, platformIdentity),
    buildEnergyCase(contract, matrix, platformIdentity),
    buildEventCase(contract, matrix, platformIdentity),
    buildVariableInertiaCase(contract, matrix, platformIdentity),
    buildOutputIntegrationCase(contract, matrix, platformIdentity),
    buildCoefficientLabelCase(contract, matrix, platformIdentity),
  ];
}

export function buildF1Cases(contract, matrix, platformIdentity) {
  const first = buildNonRepeatCases(contract, matrix, platformIdentity);
  const second = buildNonRepeatCases(contract, matrix, platformIdentity);
  const firstPayload = {
    contractId: contract.contractId,
    matrixId: matrix.matrixId,
    classification: "synthetic-only",
    cases: first,
  };
  const secondPayload = {
    contractId: contract.contractId,
    matrixId: matrix.matrixId,
    classification: "synthetic-only",
    cases: second,
  };
  const byteIdentical = canonicalBytes(firstPayload).equals(canonicalBytes(secondPayload));
  const repeatCase = caseRecord(
    "canonical-repeat",
    "independent-reexecution-of-frozen-synthetic-matrix",
    {
      copies: matrix.canonicalRepeatCopies,
      payloadSha256: canonicalSha256(firstPayload),
      platformIdentity,
    },
    matrix.canonicalRepeatCopies >= 2 && byteIdentical,
  );
  return {
    cases: [...first.slice(0, 6), repeatCase, first[6]],
    canonicalPayloadSha256: canonicalSha256(firstPayload),
  };
}

function assertHash(value, name) {
  if (typeof value !== "string" || !HASH.test(value)) throw new Error(`${name} must be a lowercase SHA-256`);
}

export function validateQualificationRecord(record, contract) {
  const keys = [
    "schemaVersion",
    "contractId",
    "contractSha256",
    "implementationSha256",
    "inputSha256",
    "classification",
    "cases",
    "canonicalPayloadSha256",
    "decision",
  ];
  if (record === null || typeof record !== "object" || Array.isArray(record)) throw new Error("F1 record must be an object");
  if (!keys.every((key) => Object.hasOwn(record, key)) || Object.keys(record).some((key) => !keys.includes(key))) {
    throw new Error("F1 record fields do not match the closed schema");
  }
  if (record.schemaVersion !== "F1-QUALIFICATION-RECORD-v1" || record.contractId !== contract.contractId) {
    throw new Error("F1 record identity mismatch");
  }
  if (record.classification !== "synthetic-only") throw new Error("F1 record classification drift");
  for (const name of ["contractSha256", "implementationSha256", "inputSha256", "canonicalPayloadSha256"]) {
    assertHash(record[name], name);
  }
  if (!Array.isArray(record.cases) || record.cases.length !== contract.requiredCases.length) throw new Error("F1 record case count mismatch");
  if (!contract.requiredCases.every((caseId, index) => record.cases[index]?.caseId === caseId)) throw new Error("F1 record case order mismatch");
  for (const entry of record.cases) {
    const caseKeys = ["caseId", "referenceId", "metrics", "pass"];
    if (!caseKeys.every((key) => Object.hasOwn(entry, key)) || Object.keys(entry).some((key) => !caseKeys.includes(key))) {
      throw new Error(`F1 case ${entry.caseId ?? "unknown"} violates the closed schema`);
    }
    if (typeof entry.referenceId !== "string" || entry.referenceId.length === 0 || typeof entry.pass !== "boolean") {
      throw new Error(`F1 case ${entry.caseId} has invalid fields`);
    }
  }
  if (!contract.resultCodes.includes(record.decision)) throw new Error("F1 record decision is not allowed");
  return true;
}

export function qualifyF1(contract, matrix, provenance) {
  if (contract.contractId !== "VP-F1-SYNTHETIC-NUMERICAL-QUALIFICATION-CONTRACT-v1") {
    throw new Error("unexpected F1 contract identity");
  }
  if (matrix.matrixId !== "VP-F1-SYNTHETIC-NUMERICAL-CASE-MATRIX-v1") {
    throw new Error("unexpected F1 matrix identity");
  }
  for (const name of ["contractSha256", "implementationSha256", "inputSha256"]) assertHash(provenance?.[name], name);
  const platformIdentity = provenance.platformIdentity ?? `${process.platform}-${process.arch}-node-${process.versions.node}`;
  const { cases, canonicalPayloadSha256 } = buildF1Cases(contract, matrix, platformIdentity);
  const allPassed = cases.every((entry) => entry.pass);
  const eventOrEnergyFailed = cases.some(
    (entry) => ["event-root-location", "conservative-energy-balance"].includes(entry.caseId) && !entry.pass,
  );
  const record = {
    schemaVersion: "F1-QUALIFICATION-RECORD-v1",
    contractId: contract.contractId,
    contractSha256: provenance.contractSha256,
    implementationSha256: provenance.implementationSha256,
    inputSha256: provenance.inputSha256,
    classification: "synthetic-only",
    cases,
    canonicalPayloadSha256,
    decision: allPassed
      ? "PASS-F1-SYNTHETIC-NUMERICAL-QUALIFICATION-ONLY"
      : eventOrEnergyFailed
        ? "INCONCLUSIVE-F1-EVENT-OR-ENERGY-CONVERGENCE"
        : "NO-GO-F1-FORWARD-NUMERICAL-QUALIFICATION",
  };
  validateQualificationRecord(record, contract);
  return record;
}
