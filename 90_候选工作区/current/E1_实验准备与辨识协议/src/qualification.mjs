import { readFile } from "node:fs/promises";
import { canonicalBytes, canonicalClone, canonicalSha256, sha256 } from "./canonical.mjs";
import { generateSyntheticBundle, resealCalibration } from "./synthetic.mjs";
import { E1ValidationError, validateBundle } from "./validation.mjs";

const ROOT = new URL("../", import.meta.url);

async function readFrozenJson(relativePath) {
  const bytes = await readFile(new URL(relativePath, ROOT));
  return { bytes, sha256: sha256(bytes), value: JSON.parse(bytes.toString("utf8")) };
}

export async function loadFrozenE1Inputs() {
  const [contract, matrix] = await Promise.all([
    readFrozenJson("contracts/e1-contract.v1.json"),
    readFrozenJson("contracts/e1-synthetic-matrix.v1.json"),
  ]);
  return { contract, matrix };
}

export function fitLine(samples) {
  if (!Array.isArray(samples) || samples.length < 2) throw new Error("at least two samples are required");
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const sample of samples) {
    if (!Number.isFinite(sample.x) || !Number.isFinite(sample.y)) throw new Error("line fit received non-finite input");
    sumX += sample.x;
    sumY += sample.y;
    sumXX += sample.x * sample.x;
    sumXY += sample.x * sample.y;
  }
  const count = samples.length;
  const denominator = count * sumXX - sumX * sumX;
  if (!Number.isFinite(denominator) || denominator === 0) throw new Error("line fit is rank deficient");
  const slope = (count * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / count;
  return { slope, intercept };
}

function maxPredictionError(samples, estimate) {
  return Math.max(...samples.map((sample) => Math.abs(sample.y - (estimate.slope * sample.x + estimate.intercept))));
}

function expectRejected(caseId, bundle, contract, expectedCode) {
  try {
    validateBundle(bundle, contract);
  } catch (error) {
    if (!(error instanceof E1ValidationError)) throw error;
    return {
      caseId,
      expectedCode,
      observedCode: error.code,
      rejected: error.code === expectedCode,
    };
  }
  return { caseId, expectedCode, observedCode: "ACCEPTED", rejected: false };
}

function mutate(base, mutateBundle) {
  const candidate = canonicalClone(base);
  mutateBundle(candidate);
  return candidate;
}

export function exerciseNegativeCases(base, contract) {
  const cases = [];
  for (const [caseId, field, code] of [
    ["missing-unit", "unit", "E1_QUANTITY_SCHEMA"],
    ["missing-source", "source", "E1_QUANTITY_SCHEMA"],
    ["missing-timestamp", "observedAt", "E1_QUANTITY_SCHEMA"],
    ["missing-uncertainty", "standardUncertainty", "E1_QUANTITY_SCHEMA"],
  ]) {
    cases.push(
      expectRejected(
        caseId,
        mutate(base, (bundle) => delete bundle.apparatus.parameters.characteristicLength[field]),
        contract,
        code,
      ),
    );
  }

  const nonFinite = canonicalClone(base);
  nonFinite.runs[0].timeseries.records[0].value = Number.NaN;
  cases.push(expectRejected("non-finite-value", nonFinite, contract, "E1_NONFINITE_VALUE"));
  cases.push(
    expectRejected(
      "time-regression",
      mutate(base, (bundle) => {
        bundle.runs[0].timeseries.records[1].time = bundle.runs[0].timeseries.records[0].time;
      }),
      contract,
      "E1_TIME_REGRESSION",
    ),
  );
  cases.push(
    expectRejected(
      "duplicate-primary-key",
      mutate(base, (bundle) => {
        bundle.runs[0].timeseries.records[1].recordId = bundle.runs[0].timeseries.records[0].recordId;
      }),
      contract,
      "E1_DUPLICATE_PRIMARY_KEY",
    ),
  );
  cases.push(
    expectRejected(
      "missing-calibration",
      mutate(base, (bundle) => bundle.calibrations.shift()),
      contract,
      "E1_MISSING_CALIBRATION",
    ),
  );
  cases.push(
    expectRejected(
      "expired-calibration",
      mutate(base, (bundle) => {
        bundle.calibrations[0].validUntil = "2026-07-01T00:00:00Z";
        bundle.calibrations[0] = resealCalibration(bundle.calibrations[0]);
      }),
      contract,
      "E1_EXPIRED_CALIBRATION",
    ),
  );
  cases.push(
    expectRejected(
      "angle-displacement-mix",
      mutate(base, (bundle) => {
        bundle.runs[0].runRecord.channels[0].unit = "m";
      }),
      contract,
      "E1_ANGLE_DISPLACEMENT_MIX",
    ),
  );
  cases.push(
    expectRejected(
      "training-holdout-overlap",
      mutate(base, (bundle) => {
        bundle.identification.holdoutConditionBlocks.push(bundle.identification.trainingConditionBlocks[0]);
      }),
      contract,
      "E1_TRAINING_HOLDOUT_OVERLAP",
    ),
  );
  cases.push(
    expectRejected(
      "unsafe-run",
      mutate(base, (bundle) => {
        bundle.runs[0].runRecord.safety.emergencyStopChecked = false;
      }),
      contract,
      "E1_UNSAFE_RUN",
    ),
  );
  return cases;
}

function buildCases(bundle, contract, matrix) {
  validateBundle(bundle, contract);
  const estimate = fitLine(bundle.identificationData.training);
  const envelope = Math.max(2 * matrix.linearIdentification.uNum, 2 * matrix.linearIdentification.uFit);
  const parameterError = Math.max(
    Math.abs(estimate.slope - matrix.linearIdentification.slope),
    Math.abs(estimate.intercept - matrix.linearIdentification.intercept),
  );
  const holdoutPredictionError = maxPredictionError(bundle.identificationData.holdout, estimate);
  const roundTrip = canonicalBytes(JSON.parse(canonicalBytes(bundle).toString("utf8")));
  const repeat = generateSyntheticBundle(contract, matrix);
  const negativeCases = exerciseNegativeCases(bundle, contract);
  return [
    {
      caseId: "positive-record-validation",
      metrics: { apparatusCount: 1, calibrationCount: bundle.calibrations.length, runCount: bundle.runs.length },
      pass: true,
    },
    {
      caseId: "required-run-and-channel-coverage",
      metrics: {
        runFamilies: [...new Set(bundle.runs.map((entry) => entry.runRecord.runFamily))].sort(),
        channelKinds: [...new Set(bundle.runs.flatMap((entry) => entry.runRecord.channels.map((channel) => channel.kind)))].sort(),
      },
      pass: true,
    },
    {
      caseId: "condition-block-isolation",
      metrics: {
        splitUnit: contract.holdoutSplitUnit,
        randomFrameSplitForbidden: contract.randomFrameSplitForbidden,
        trainingBlocks: [...bundle.identification.trainingConditionBlocks],
        holdoutBlocks: [...bundle.identification.holdoutConditionBlocks],
      },
      pass: true,
    },
    {
      caseId: "known-linear-parameter-recovery",
      metrics: { estimate, envelope, parameterError, holdoutPredictionError },
      pass: parameterError <= envelope && holdoutPredictionError <= envelope,
    },
    {
      caseId: "canonical-round-trip",
      metrics: { inputSha256: canonicalSha256(bundle), roundTripSha256: sha256(roundTrip) },
      pass: canonicalBytes(bundle).equals(roundTrip),
    },
    {
      caseId: "deterministic-repeat",
      metrics: { copies: matrix.roundTripCopies, sha256: canonicalSha256(bundle) },
      pass: matrix.roundTripCopies >= 2 && canonicalBytes(bundle).equals(canonicalBytes(repeat)),
    },
    {
      caseId: "pre-registered-negative-cases",
      metrics: { cases: negativeCases },
      pass:
        negativeCases.length === contract.negativeCases.length &&
        contract.negativeCases.every((caseId) => negativeCases.some((entry) => entry.caseId === caseId && entry.rejected)),
    },
  ];
}

export function qualifyE1(contract, matrix, provenance = {}) {
  if (contract.contractId !== "VP-E1-EXPERIMENT-PREPARATION-CONTRACT-v1") throw new Error("unexpected E1 contract identity");
  if (matrix.matrixId !== "VP-E1-SYNTHETIC-DATA-QUALIFICATION-MATRIX-v1") throw new Error("unexpected E1 matrix identity");
  const bundle = generateSyntheticBundle(contract, matrix);
  const cases = buildCases(bundle, contract, matrix);
  const allPassed = cases.every((entry) => entry.pass);
  const payload = {
    schemaVersion: "E1-SYNTHETIC-QUALIFICATION-RECORD-v1",
    contractId: contract.contractId,
    contractSha256: provenance.contractSha256 ?? canonicalSha256(contract),
    matrixId: matrix.matrixId,
    matrixSha256: provenance.matrixSha256 ?? canonicalSha256(matrix),
    implementationClassification: "candidate-only",
    resultClassification: "synthetic-only",
    scientificPayloadRead: false,
    realExperimentPerformed: false,
    bundleSha256: canonicalSha256(bundle),
    cases,
    decision: allPassed ? "PASS-E1-EXPERIMENT-PREPARATION-CANDIDATE-ONLY" : "NO-GO-E1-DATA-CONTRACT-OR-SAFETY",
    scientificConclusion: "NONE",
  };
  return { ...payload, canonicalPayloadSha256: canonicalSha256(payload) };
}
