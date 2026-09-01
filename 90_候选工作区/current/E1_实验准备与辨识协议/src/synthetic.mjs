import { canonicalSha256 } from "./canonical.mjs";
import { e1Constants, sealRecord } from "./validation.mjs";

const REGISTERED_AT = "2026-01-01T00:00:00Z";
const VALID_FROM = "2026-01-01T00:00:00Z";
const VALID_UNTIL = "2026-12-31T23:59:59Z";
const RUN_STARTS = [
  "2026-08-01T00:00:00Z",
  "2026-08-02T00:00:00Z",
  "2026-08-03T00:00:00Z",
  "2026-08-04T00:00:00Z",
  "2026-08-05T00:00:00Z",
];

const CHANNEL_DEFINITIONS = Object.freeze([
  ["CH-ANGLE", "angle", "count", "rad"],
  ["CH-DISPLACEMENT", "displacement", "px", "m"],
  ["CH-FLOW", "flow-speed", "px/s", "m/s"],
  ["CH-WATER", "water-level", "px", "m"],
  ["CH-LOAD", "load", "count", "N"],
  ["CH-IMAGE", "image", "frame", "px"],
  ["CH-CLOCK", "clock", "tick", "s"],
  ["CH-ENVIRONMENT", "environment", "count", "K"],
]);

function quantity(value, unit, standardUncertainty) {
  return {
    value,
    unit,
    source: "synthetic",
    observedAt: REGISTERED_AT,
    standardUncertainty,
    calibrationId: null,
    upstreamHashes: [],
  };
}

function buildApparatus() {
  return sealRecord({
    schemaVersion: "E1-APPARATUS-v1",
    apparatusId: "SYNTH-APPARATUS-NOT-PHYSICAL",
    revision: "SYNTH-R1",
    registeredAt: REGISTERED_AT,
    bom: [
      {
        itemId: "SYNTH-BODY",
        description: "non-physical schema qualification body",
        quantity: 1,
        lotOrSerial: "SYNTHETIC-ONLY",
      },
    ],
    parameters: {
      characteristicLength: quantity(1, "m", 1e-12),
      nominalMass: quantity(1, "kg", 1e-12),
    },
    assemblyTolerances: {
      lengthTolerance: quantity(1e-6, "m", 1e-12),
    },
  });
}

function calibrationId(kind) {
  return `SYNTH-CAL-${kind.toUpperCase()}`;
}

function buildCalibrations(apparatus) {
  return CHANNEL_DEFINITIONS.map(([channelId, kind, inputUnit, outputUnit]) =>
    sealRecord({
      schemaVersion: "E1-CALIBRATION-v1",
      calibrationId: calibrationId(kind),
      apparatusId: apparatus.apparatusId,
      channelId,
      channelKind: kind,
      method: "deterministic synthetic identity-map qualification",
      validFrom: VALID_FROM,
      validUntil: VALID_UNTIL,
      inputUnit,
      outputUnit,
      coefficients: [0, 1],
      residualStandardUncertainty: 1e-12,
      rawEvidenceHash: canonicalSha256({
        classification: "synthetic-only",
        kind,
        seed: 130013,
      }),
    }),
  );
}

function channelValue(kind, time, index, omega, phase) {
  const argument = omega * time + phase;
  switch (kind) {
    case "angle":
      return Math.sin(argument);
    case "displacement":
      return 0.1 * Math.cos(argument);
    case "flow-speed":
      return 1 + 0.2 * Math.sin(argument);
    case "water-level":
      return 0.25;
    case "load":
      return 0.5 * Math.sin(argument + 0.1);
    case "image":
      return index;
    case "clock":
      return time;
    case "environment":
      return 293.15 + 0.01 * Math.cos(argument);
    default:
      throw new Error(`unsupported synthetic channel kind ${kind}`);
  }
}

function buildTimeseries(runId, matrix) {
  const records = [];
  for (const [channelId, kind, _inputUnit, outputUnit] of CHANNEL_DEFINITIONS) {
    for (let index = 0; index < matrix.timeseries.sampleCount; index += 1) {
      const time = index * matrix.timeseries.sampleIntervalSeconds;
      records.push({
        recordId: `${runId}-${channelId}-${String(index).padStart(3, "0")}`,
        channelId,
        time,
        value: channelValue(
          kind,
          time,
          index,
          matrix.timeseries.angularFrequencyRadiansPerSecond,
          matrix.timeseries.phaseRadians,
        ),
        unit: outputUnit,
        source: "synthetic",
        standardUncertainty: 1e-12,
      });
    }
  }
  return {
    schemaVersion: "E1-TIMESERIES-v1",
    runId,
    timeUnit: "s",
    records,
  };
}

function buildChannels() {
  return CHANNEL_DEFINITIONS.map(([channelId, kind, _inputUnit, unit]) => ({
    channelId,
    kind,
    unit,
    calibrationId: calibrationId(kind),
  }));
}

function buildRunEntry(runFamily, index, apparatus, matrix) {
  const runId = `SYNTH-RUN-${String(index + 1).padStart(2, "0")}-${runFamily.toUpperCase()}`;
  const conditionBlockId = runFamily === "holdout" ? "SYNTH-HOLDOUT-A" : `SYNTH-TRAIN-${index % 2 === 0 ? "A" : "B"}`;
  const channels = buildChannels();
  const configuration = {
    schemaVersion: "E1-SYNTHETIC-CONFIGURATION-v1",
    classification: "synthetic-only",
    runId,
    conditionBlockId,
    runFamily,
    apparatusId: apparatus.apparatusId,
    apparatusRevision: apparatus.revision,
    channels,
    seed: matrix.seed,
  };
  const timeseries = buildTimeseries(runId, matrix);
  return {
    configuration,
    runRecord: {
      schemaVersion: "E1-RUN-RECORD-v1",
      runId,
      conditionBlockId,
      runFamily,
      apparatusId: apparatus.apparatusId,
      apparatusRevision: apparatus.revision,
      startedAt: RUN_STARTS[index],
      clockId: "CH-CLOCK",
      latencySeconds: 0,
      synchronizationStandardUncertaintySeconds: 1e-12,
      configurationHash: canonicalSha256(configuration),
      rawDataHash: canonicalSha256(timeseries),
      calibrationIds: channels.map((channel) => channel.calibrationId),
      channels,
      safety: {
        operator: "SYNTHETIC-NO-HUMAN-OPERATION",
        emergencyStopChecked: true,
        limitsChecked: true,
        waterElectricalIsolationChecked: true,
        backupTargetChecked: true,
      },
      status: "COMPLETE",
    },
    timeseries,
  };
}

function buildIdentification(matrix) {
  return {
    schemaVersion: "E1-IDENTIFICATION-v1",
    planId: "SYNTHETIC-LINEAR-IDENTIFICATION-v1",
    frozenAt: "2026-07-31T00:00:00Z",
    parameterGroups: [
      {
        groupId: "SYNTH-LINEAR-PAIR",
        parameters: ["slope", "intercept"],
        priorSource: "synthetic",
        identifiableCombination: "slope-and-intercept",
      },
    ],
    trainingConditionBlocks: [...matrix.linearIdentification.trainingConditionBlocks],
    holdoutConditionBlocks: [...matrix.linearIdentification.holdoutConditionBlocks],
    regularization: { kind: "none" },
    uncertaintyMethod: "frozen synthetic max(2*u_num,2*u_fit) envelope",
    syntheticAcceptance: { envelope: "max(2*u_num,2*u_fit)" },
  };
}

function buildIdentificationData(matrix) {
  const makeSamples = (blocks, split) =>
    blocks.flatMap((conditionBlockId) =>
      matrix.linearIdentification.xValues.map((x, index) => ({
        sampleId: `${split}-${conditionBlockId}-${String(index).padStart(2, "0")}`,
        conditionBlockId,
        x,
        y: matrix.linearIdentification.slope * x + matrix.linearIdentification.intercept,
      })),
    );
  return {
    training: makeSamples(matrix.linearIdentification.trainingConditionBlocks, "TRAIN"),
    holdout: makeSamples(matrix.linearIdentification.holdoutConditionBlocks, "HOLDOUT"),
  };
}

export function generateSyntheticBundle(contract, matrix) {
  if (contract.resultClassification !== "synthetic-only" || matrix.classification !== "synthetic-only") {
    throw new Error("E1 generator accepts synthetic-only frozen inputs");
  }
  const apparatus = buildApparatus();
  return {
    schemaVersion: "E1-SYNTHETIC-BUNDLE-v1",
    contractId: contract.contractId,
    classification: "synthetic-only",
    seed: matrix.seed,
    apparatus,
    calibrations: buildCalibrations(apparatus),
    runs: e1Constants.RUN_FAMILIES.map((family, index) => buildRunEntry(family, index, apparatus, matrix)),
    identification: buildIdentification(matrix),
    identificationData: buildIdentificationData(matrix),
  };
}

export function resealCalibration(calibration) {
  const { recordHash: _recordHash, ...payload } = calibration;
  return sealRecord(payload);
}
