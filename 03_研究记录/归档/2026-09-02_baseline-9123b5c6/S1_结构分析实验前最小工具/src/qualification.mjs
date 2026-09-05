import { readFile } from "node:fs/promises";

import { canonicalBytes, canonicalSha256, sha256 } from "./canonical.mjs";
import {
  analyticFrozenJacobian,
  blockSpectrumCrosscheck,
  centralDifferenceJacobian,
  estimateFrequencyPhase,
  exposeIdentifiableCombination,
  frozenVectorField,
  hopfLinearAnalysis,
  normalizedMatrixError,
  syntheticAveragePower,
  synthesizeSinusoid,
  validateLiteraturePriorLabel,
  wrappedPhaseError,
} from "./structural.mjs";

const ROOT = new URL("../", import.meta.url);
const HASH = /^[0-9a-f]{64}$/u;
const IMPLEMENTATION_FILES = ["src/canonical.mjs", "src/structural.mjs", "src/qualification.mjs"];

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

export async function loadFrozenS1Inputs() {
  const [contract, matrix, implementation] = await Promise.all([
    readFrozenJson("contracts/s1-contract.v1.json"),
    readFrozenJson("contracts/s1-case-matrix.v1.json"),
    implementationIdentity(),
  ]);
  return { contract, matrix, implementation };
}

function requireHash(value, name) {
  if (typeof value !== "string" || !HASH.test(value)) throw new Error(`${name} must be a lowercase SHA-256`);
}

function evidence(provenance) {
  return {
    contractSha256: provenance.contractSha256,
    implementationSha256: provenance.implementationSha256,
    inputSha256: provenance.inputSha256,
    platformIdentity: provenance.platformIdentity,
    resultClassification: "synthetic-only",
    scientificPayloadRead: false,
    realExperimentPerformed: false,
  };
}

function caseRecord(caseId, metrics, pass) {
  return { caseId, metrics, pass: Boolean(pass) };
}

function buildJacobianCase(contract, matrix, provenance) {
  if (matrix.jacobian.vectorField !== "[x^3+2*y, -x+sin(y)]") throw new Error("S1 vector-field identity drift");
  const reference = analyticFrozenJacobian(matrix.jacobian.evaluationPoint);
  const levels = matrix.jacobian.stepSizes.map((stepSize) => {
    const estimate = centralDifferenceJacobian(frozenVectorField, matrix.jacobian.evaluationPoint, stepSize);
    return { stepSize, estimate, normalizedError: normalizedMatrixError(estimate, reference) };
  });
  const ratios = [
    levels[0].normalizedError / levels[1].normalizedError,
    levels[1].normalizedError / levels[2].normalizedError,
  ];
  const decreasing = levels.every(
    (level, index) => index === 0 || level.normalizedError < levels[index - 1].normalizedError,
  );
  return caseRecord(
    "finite-difference-jacobian-convergence",
    { reference, levels, adjacentErrorRatios: ratios, evidence: evidence(provenance) },
    decreasing && ratios.every((ratio) => ratio >= contract.gates.jacobianAdjacentErrorRatioMinimum),
  );
}

function buildSpectrumCase(contract, matrix, provenance) {
  const result = blockSpectrumCrosscheck(matrix.spectrum.block1, matrix.spectrum.block2);
  return caseRecord(
    "characteristic-polynomial-root-crosscheck",
    { ...result, evidence: evidence(provenance) },
    result.maximumNormalizedResidual <= contract.gates.normalizedCharacteristicResidualMaximum,
  );
}

function buildHopfCase(contract, matrix, provenance) {
  const result = hopfLinearAnalysis(matrix.hopf.omega, matrix.hopf.muValues);
  const relativeError = Math.abs(result.transversality - matrix.hopf.expectedTransversality) /
    Math.abs(matrix.hopf.expectedTransversality);
  const stabilityCorrect = result.samples.map((sample) => sample.stability).join(",") === "stable,critical,unstable";
  return caseRecord(
    "synthetic-hopf-transversality",
    { ...result, relativeError, stabilityCorrect, evidence: evidence(provenance) },
    stabilityCorrect && relativeError <= contract.gates.hopfTransversalityRelativeErrorMaximum,
  );
}

function buildIdentifiableCase(contract, matrix, provenance) {
  const exposed = exposeIdentifiableCombination(
    { [matrix.identifiableCombination.parameter]: matrix.identifiableCombination.value },
    contract,
  );
  const rejections = matrix.identifiableCombination.forbiddenSplits.map((parameter) => {
    try {
      exposeIdentifiableCombination({ [parameter]: matrix.identifiableCombination.value }, contract);
      return { parameter, rejected: false };
    } catch (error) {
      return { parameter, rejected: /forbidden|only L_gamma_j/u.test(error.message) };
    }
  });
  return caseRecord(
    "identifiable-L-gamma-interface",
    { exposed, forbiddenSplitChecks: rejections, evidence: evidence(provenance) },
    Object.keys(exposed).length === 1 && exposed.L_gamma_j === matrix.identifiableCombination.value &&
      rejections.every((entry) => entry.rejected),
  );
}

function buildFrequencyPhaseCase(contract, matrix, provenance) {
  const samples = synthesizeSinusoid(matrix.frequencyPhase);
  const estimate = estimateFrequencyPhase(samples, matrix.frequencyPhase.sampleRateHz);
  const frequencyRelativeError = Math.abs(estimate.frequencyHz - matrix.frequencyPhase.frequencyHz) /
    matrix.frequencyPhase.frequencyHz;
  const phaseAbsoluteErrorRadians = wrappedPhaseError(estimate.phaseRadians, matrix.frequencyPhase.phaseRadians);
  return caseRecord(
    "synthetic-frequency-phase",
    {
      estimate,
      expected: {
        frequencyHz: matrix.frequencyPhase.frequencyHz,
        phaseRadians: matrix.frequencyPhase.phaseRadians,
        amplitude: matrix.frequencyPhase.amplitude,
      },
      frequencyRelativeError,
      phaseAbsoluteErrorRadians,
      sampleCount: samples.length,
      evidence: evidence(provenance),
    },
    frequencyRelativeError <= contract.gates.frequencyRelativeErrorMaximum &&
      phaseAbsoluteErrorRadians <= contract.gates.phaseAbsoluteErrorRadiansMaximum,
  );
}

function buildAveragePowerCase(contract, matrix, provenance) {
  const result = syntheticAveragePower(matrix.averagePower);
  return caseRecord(
    "synthetic-average-power",
    { ...result, evidence: evidence(provenance) },
    result.relativeError <= contract.gates.averagePowerRelativeErrorMaximum,
  );
}

function buildLiteratureLabelCase(matrix, provenance) {
  const accepted = validateLiteraturePriorLabel(matrix.literaturePriorLabel);
  const apparatusClaimRejected = !validateLiteraturePriorLabel("apparatus-calibrated");
  return caseRecord(
    "literature-prior-label",
    {
      label: matrix.literaturePriorLabel,
      accepted,
      apparatusClaimRejected,
      evidence: evidence(provenance),
    },
    accepted && apparatusClaimRejected,
  );
}

function buildNonRepeatCases(contract, matrix, provenance) {
  if (contract.classification !== "synthetic-only" || matrix.classification !== "synthetic-only") {
    throw new Error("S1 accepts synthetic-only inputs");
  }
  return [
    buildJacobianCase(contract, matrix, provenance),
    buildSpectrumCase(contract, matrix, provenance),
    buildHopfCase(contract, matrix, provenance),
    buildIdentifiableCase(contract, matrix, provenance),
    buildFrequencyPhaseCase(contract, matrix, provenance),
    buildAveragePowerCase(contract, matrix, provenance),
    buildLiteratureLabelCase(matrix, provenance),
  ];
}

export function buildS1Cases(contract, matrix, provenance) {
  const first = buildNonRepeatCases(contract, matrix, provenance);
  const second = buildNonRepeatCases(contract, matrix, provenance);
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
  const payloadSha256 = canonicalSha256(firstPayload);
  const repeatCase = caseRecord(
    "canonical-repeat",
    {
      copies: matrix.canonicalRepeatCopies,
      payloadSha256,
      evidence: evidence(provenance),
    },
    matrix.canonicalRepeatCopies >= 2 && canonicalBytes(firstPayload).equals(canonicalBytes(secondPayload)),
  );
  return { cases: [...first.slice(0, 6), repeatCase, first[6]], payloadSha256 };
}

export class S1QualificationError extends Error {
  constructor(failedCases) {
    super(`S1 synthetic qualification failed: ${failedCases.map((entry) => entry.caseId).join(",")}`);
    this.name = "S1QualificationError";
    this.failedCases = failedCases;
  }
}

export function validateS1Record(record, contract) {
  const keys = ["schemaVersion", "contractId", "classification", "cases", "decision", "deferred"];
  if (record === null || typeof record !== "object" || Array.isArray(record)) throw new Error("S1 record must be an object");
  if (!keys.every((key) => Object.hasOwn(record, key)) || Object.keys(record).some((key) => !keys.includes(key))) {
    throw new Error("S1 record fields do not match the closed schema");
  }
  if (
    record.schemaVersion !== "S1-QUALIFICATION-RECORD-v1" ||
    record.contractId !== contract.contractId ||
    record.classification !== "synthetic-only"
  ) {
    throw new Error("S1 record identity or classification mismatch");
  }
  if (!Array.isArray(record.cases) || record.cases.length !== contract.requiredCases.length) throw new Error("S1 case count mismatch");
  if (!contract.requiredCases.every((caseId, index) => record.cases[index]?.caseId === caseId)) throw new Error("S1 case order mismatch");
  for (const entry of record.cases) {
    const caseKeys = ["caseId", "metrics", "pass"];
    if (!caseKeys.every((key) => Object.hasOwn(entry, key)) || Object.keys(entry).some((key) => !caseKeys.includes(key))) {
      throw new Error(`S1 case ${entry.caseId ?? "unknown"} violates the closed schema`);
    }
    if (typeof entry.pass !== "boolean") throw new Error(`S1 case ${entry.caseId} has invalid pass field`);
  }
  if (record.decision !== contract.decision || record.deferred !== contract.deferred) throw new Error("S1 decision or deferral drift");
  return true;
}

export function qualifyS1(contract, matrix, suppliedProvenance) {
  if (contract.contractId !== "VP-S1-SYNTHETIC-STRUCTURAL-QUALIFICATION-CONTRACT-v1") {
    throw new Error("unexpected S1 contract identity");
  }
  if (matrix.matrixId !== "VP-S1-SYNTHETIC-STRUCTURAL-CASE-MATRIX-v1") {
    throw new Error("unexpected S1 matrix identity");
  }
  for (const name of ["contractSha256", "implementationSha256", "inputSha256"]) {
    requireHash(suppliedProvenance?.[name], name);
  }
  const provenance = {
    ...suppliedProvenance,
    platformIdentity:
      suppliedProvenance.platformIdentity ?? `${process.platform}-${process.arch}-node-${process.versions.node}`,
  };
  const { cases } = buildS1Cases(contract, matrix, provenance);
  const failed = cases.filter((entry) => !entry.pass);
  if (failed.length > 0) throw new S1QualificationError(failed);
  const record = {
    schemaVersion: "S1-QUALIFICATION-RECORD-v1",
    contractId: contract.contractId,
    classification: "synthetic-only",
    cases,
    decision: contract.decision,
    deferred: contract.deferred,
  };
  validateS1Record(record, contract);
  return record;
}
