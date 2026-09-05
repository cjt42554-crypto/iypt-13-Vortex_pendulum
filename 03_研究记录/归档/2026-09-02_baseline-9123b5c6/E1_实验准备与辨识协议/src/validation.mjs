import { canonicalSha256 } from "./canonical.mjs";

const HASH = /^[0-9a-f]{64}$/u;
const CHANNEL_KINDS = [
  "angle",
  "displacement",
  "flow-speed",
  "water-level",
  "load",
  "image",
  "clock",
  "environment",
];
const RUN_FAMILIES = [
  "fixed-body",
  "prescribed-motion",
  "no-flow-mechanical",
  "free-response",
  "holdout",
];
const QUANTITY_SOURCES = [
  "measured",
  "calibrated",
  "derived-from-measured",
  "synthetic",
  "literature-prior",
];
const SERIES_SOURCES = ["raw", "calibrated", "derived", "synthetic"];
const RUN_STATUSES = ["PLANNED", "RUNNING", "COMPLETE", "FAILED", "STOPPED", "NOT_STARTED_DUE_TO_STOP"];

const EXPECTED_UNITS = Object.freeze({
  angle: "rad",
  displacement: "m",
  "flow-speed": "m/s",
  "water-level": "m",
  load: "N",
  image: "px",
  clock: "s",
  environment: "K",
});

export class E1ValidationError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "E1ValidationError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new E1ValidationError(code, message);
}

function assertPlainObject(value, code, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code, `${path} must be an object`);
}

function assertExactKeys(value, allowed, required, code, path) {
  assertPlainObject(value, code, path);
  for (const key of required) {
    if (!Object.hasOwn(value, key)) fail(code, `${path}.${key} is required`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(code, `${path}.${key} is not allowed`);
  }
}

function assertString(value, code, path) {
  if (typeof value !== "string" || value.length === 0) fail(code, `${path} must be a non-empty string`);
}

function assertFinite(value, code, path, minimum = -Infinity) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    fail(code, `${path} must be a finite number >= ${minimum}`);
  }
}

function assertTimestamp(value, code, path) {
  assertString(value, code, path);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) || !Number.isFinite(Date.parse(value))) {
    fail(code, `${path} must be a UTC RFC3339 timestamp`);
  }
}

function assertHash(value, code, path) {
  if (typeof value !== "string" || !HASH.test(value)) fail(code, `${path} must be a lowercase SHA-256`);
}

function assertUniqueStrings(values, code, path, minimum = 0) {
  if (!Array.isArray(values) || values.length < minimum) fail(code, `${path} must contain at least ${minimum} item(s)`);
  for (let index = 0; index < values.length; index += 1) assertString(values[index], code, `${path}[${index}]`);
  if (new Set(values).size !== values.length) fail(code, `${path} contains duplicates`);
}

function payloadWithoutRecordHash(record) {
  const { recordHash: _recordHash, ...payload } = record;
  return payload;
}

export function sealRecord(record) {
  return { ...record, recordHash: canonicalSha256(record) };
}

export function validateQuantity(quantity, path = "quantity") {
  const required = ["value", "unit", "source", "observedAt", "standardUncertainty"];
  const allowed = [...required, "calibrationId", "upstreamHashes"];
  assertExactKeys(quantity, allowed, required, "E1_QUANTITY_SCHEMA", path);
  assertFinite(quantity.value, "E1_NONFINITE_VALUE", `${path}.value`);
  assertString(quantity.unit, "E1_MISSING_UNIT", `${path}.unit`);
  if (!QUANTITY_SOURCES.includes(quantity.source)) fail("E1_MISSING_SOURCE", `${path}.source is invalid`);
  assertTimestamp(quantity.observedAt, "E1_MISSING_TIMESTAMP", `${path}.observedAt`);
  assertFinite(quantity.standardUncertainty, "E1_MISSING_UNCERTAINTY", `${path}.standardUncertainty`, 0);
  if (Object.hasOwn(quantity, "calibrationId") && quantity.calibrationId !== null) {
    assertString(quantity.calibrationId, "E1_QUANTITY_SCHEMA", `${path}.calibrationId`);
  }
  if (Object.hasOwn(quantity, "upstreamHashes")) {
    assertUniqueStrings(quantity.upstreamHashes, "E1_QUANTITY_SCHEMA", `${path}.upstreamHashes`);
    for (const [index, hash] of quantity.upstreamHashes.entries()) assertHash(hash, "E1_QUANTITY_SCHEMA", `${path}.upstreamHashes[${index}]`);
  }
  if (quantity.source === "derived-from-measured" && (!quantity.upstreamHashes || quantity.upstreamHashes.length === 0)) {
    fail("E1_DERIVED_PROVENANCE", `${path} lacks upstream hashes`);
  }
  return true;
}

export function validateApparatus(record) {
  const required = [
    "schemaVersion",
    "apparatusId",
    "revision",
    "registeredAt",
    "bom",
    "parameters",
    "assemblyTolerances",
    "recordHash",
  ];
  assertExactKeys(record, required, required, "E1_APPARATUS_SCHEMA", "apparatus");
  if (record.schemaVersion !== "E1-APPARATUS-v1") fail("E1_APPARATUS_SCHEMA", "apparatus schemaVersion mismatch");
  assertString(record.apparatusId, "E1_APPARATUS_SCHEMA", "apparatus.apparatusId");
  assertString(record.revision, "E1_APPARATUS_SCHEMA", "apparatus.revision");
  assertTimestamp(record.registeredAt, "E1_APPARATUS_SCHEMA", "apparatus.registeredAt");
  if (!Array.isArray(record.bom) || record.bom.length === 0) fail("E1_APPARATUS_SCHEMA", "apparatus.bom must be non-empty");
  const itemIds = new Set();
  for (const [index, item] of record.bom.entries()) {
    const keys = ["itemId", "description", "quantity", "lotOrSerial"];
    assertExactKeys(item, keys, keys, "E1_APPARATUS_SCHEMA", `apparatus.bom[${index}]`);
    assertString(item.itemId, "E1_APPARATUS_SCHEMA", `apparatus.bom[${index}].itemId`);
    assertString(item.description, "E1_APPARATUS_SCHEMA", `apparatus.bom[${index}].description`);
    if (!Number.isInteger(item.quantity) || item.quantity < 1) fail("E1_APPARATUS_SCHEMA", "BOM quantity must be a positive integer");
    assertString(item.lotOrSerial, "E1_APPARATUS_SCHEMA", `apparatus.bom[${index}].lotOrSerial`);
    if (itemIds.has(item.itemId)) fail("E1_DUPLICATE_PRIMARY_KEY", `duplicate BOM item ${item.itemId}`);
    itemIds.add(item.itemId);
  }
  for (const section of ["parameters", "assemblyTolerances"]) {
    assertPlainObject(record[section], "E1_APPARATUS_SCHEMA", `apparatus.${section}`);
    if (Object.keys(record[section]).length === 0) fail("E1_APPARATUS_SCHEMA", `apparatus.${section} must be non-empty`);
    for (const [name, quantity] of Object.entries(record[section])) validateQuantity(quantity, `apparatus.${section}.${name}`);
  }
  assertHash(record.recordHash, "E1_APPARATUS_HASH", "apparatus.recordHash");
  if (record.recordHash !== canonicalSha256(payloadWithoutRecordHash(record))) fail("E1_APPARATUS_HASH", "apparatus record hash mismatch");
  return true;
}

export function validateCalibration(record, apparatus) {
  const required = [
    "schemaVersion",
    "calibrationId",
    "apparatusId",
    "channelId",
    "channelKind",
    "method",
    "validFrom",
    "validUntil",
    "inputUnit",
    "outputUnit",
    "coefficients",
    "residualStandardUncertainty",
    "rawEvidenceHash",
    "recordHash",
  ];
  assertExactKeys(record, required, required, "E1_CALIBRATION_SCHEMA", `calibration.${record?.calibrationId ?? "unknown"}`);
  if (record.schemaVersion !== "E1-CALIBRATION-v1") fail("E1_CALIBRATION_SCHEMA", "calibration schemaVersion mismatch");
  for (const key of ["calibrationId", "apparatusId", "channelId", "method", "inputUnit", "outputUnit"]) {
    assertString(record[key], "E1_CALIBRATION_SCHEMA", `calibration.${key}`);
  }
  if (!CHANNEL_KINDS.includes(record.channelKind)) fail("E1_UNKNOWN_CHANNEL", `unknown calibration kind ${record.channelKind}`);
  assertTimestamp(record.validFrom, "E1_CALIBRATION_SCHEMA", "calibration.validFrom");
  assertTimestamp(record.validUntil, "E1_CALIBRATION_SCHEMA", "calibration.validUntil");
  if (Date.parse(record.validFrom) >= Date.parse(record.validUntil)) fail("E1_CALIBRATION_SCHEMA", "calibration interval is empty");
  if (!Array.isArray(record.coefficients) || record.coefficients.length === 0) fail("E1_CALIBRATION_SCHEMA", "coefficients must be non-empty");
  for (const coefficient of record.coefficients) assertFinite(coefficient, "E1_NONFINITE_VALUE", "calibration.coefficients[]");
  assertFinite(record.residualStandardUncertainty, "E1_CALIBRATION_SCHEMA", "calibration.residualStandardUncertainty", 0);
  assertHash(record.rawEvidenceHash, "E1_CALIBRATION_SCHEMA", "calibration.rawEvidenceHash");
  assertHash(record.recordHash, "E1_CALIBRATION_HASH", "calibration.recordHash");
  if (record.apparatusId !== apparatus.apparatusId) fail("E1_CALIBRATION_APPARATUS_MISMATCH", `${record.calibrationId} is bound to another apparatus`);
  if (record.outputUnit !== EXPECTED_UNITS[record.channelKind]) fail("E1_ANGLE_DISPLACEMENT_MIX", `${record.channelKind} has incompatible unit ${record.outputUnit}`);
  if (record.recordHash !== canonicalSha256(payloadWithoutRecordHash(record))) fail("E1_CALIBRATION_HASH", `${record.calibrationId} hash mismatch`);
  return true;
}

export function validateIdentification(plan, contract) {
  const required = [
    "schemaVersion",
    "planId",
    "frozenAt",
    "parameterGroups",
    "trainingConditionBlocks",
    "holdoutConditionBlocks",
    "regularization",
    "uncertaintyMethod",
    "syntheticAcceptance",
  ];
  assertExactKeys(plan, required, required, "E1_IDENTIFICATION_SCHEMA", "identification");
  if (plan.schemaVersion !== "E1-IDENTIFICATION-v1") fail("E1_IDENTIFICATION_SCHEMA", "identification schemaVersion mismatch");
  assertString(plan.planId, "E1_IDENTIFICATION_SCHEMA", "identification.planId");
  assertTimestamp(plan.frozenAt, "E1_IDENTIFICATION_SCHEMA", "identification.frozenAt");
  if (!Array.isArray(plan.parameterGroups) || plan.parameterGroups.length === 0) fail("E1_IDENTIFICATION_SCHEMA", "parameterGroups must be non-empty");
  for (const [index, group] of plan.parameterGroups.entries()) {
    const keys = ["groupId", "parameters", "priorSource", "identifiableCombination"];
    assertExactKeys(group, keys, keys, "E1_IDENTIFICATION_SCHEMA", `identification.parameterGroups[${index}]`);
    assertString(group.groupId, "E1_IDENTIFICATION_SCHEMA", `identification.parameterGroups[${index}].groupId`);
    assertUniqueStrings(group.parameters, "E1_IDENTIFICATION_SCHEMA", `identification.parameterGroups[${index}].parameters`, 1);
    if (!['synthetic', 'literature-prior', 'measured'].includes(group.priorSource)) fail("E1_IDENTIFICATION_SCHEMA", "invalid prior source");
    assertString(group.identifiableCombination, "E1_IDENTIFICATION_SCHEMA", "identifiableCombination");
  }
  assertUniqueStrings(plan.trainingConditionBlocks, "E1_IDENTIFICATION_SCHEMA", "identification.trainingConditionBlocks", 1);
  assertUniqueStrings(plan.holdoutConditionBlocks, "E1_IDENTIFICATION_SCHEMA", "identification.holdoutConditionBlocks", 1);
  const training = new Set(plan.trainingConditionBlocks);
  const overlap = plan.holdoutConditionBlocks.filter((block) => training.has(block));
  if (overlap.length > 0) fail("E1_TRAINING_HOLDOUT_OVERLAP", `condition block overlap: ${overlap.join(",")}`);
  assertPlainObject(plan.regularization, "E1_IDENTIFICATION_SCHEMA", "identification.regularization");
  assertString(plan.uncertaintyMethod, "E1_IDENTIFICATION_SCHEMA", "identification.uncertaintyMethod");
  assertExactKeys(plan.syntheticAcceptance, ["envelope"], ["envelope"], "E1_IDENTIFICATION_SCHEMA", "identification.syntheticAcceptance");
  if (plan.syntheticAcceptance.envelope !== contract.syntheticEstimateEnvelope) fail("E1_IDENTIFICATION_SCHEMA", "acceptance envelope drift");
  return true;
}

function validateSafety(safety) {
  const required = ["operator", "emergencyStopChecked", "limitsChecked", "waterElectricalIsolationChecked", "backupTargetChecked"];
  assertExactKeys(safety, required, required, "E1_UNSAFE_RUN", "run.safety");
  assertString(safety.operator, "E1_UNSAFE_RUN", "run.safety.operator");
  for (const key of required.slice(1)) {
    if (safety[key] !== true) fail("E1_UNSAFE_RUN", `run.safety.${key} is not true`);
  }
}

export function validateRunEntry(entry, apparatus, calibrationsById) {
  assertExactKeys(entry, ["configuration", "runRecord", "timeseries"], ["configuration", "runRecord", "timeseries"], "E1_RUN_ENTRY_SCHEMA", "runEntry");
  const run = entry.runRecord;
  const required = [
    "schemaVersion",
    "runId",
    "conditionBlockId",
    "runFamily",
    "apparatusId",
    "apparatusRevision",
    "startedAt",
    "clockId",
    "latencySeconds",
    "synchronizationStandardUncertaintySeconds",
    "configurationHash",
    "rawDataHash",
    "calibrationIds",
    "channels",
    "safety",
    "status",
  ];
  assertExactKeys(run, required, required, "E1_RUN_SCHEMA", `run.${run?.runId ?? "unknown"}`);
  if (run.schemaVersion !== "E1-RUN-RECORD-v1") fail("E1_RUN_SCHEMA", "run schemaVersion mismatch");
  for (const key of ["runId", "conditionBlockId", "apparatusId", "apparatusRevision", "clockId"]) assertString(run[key], "E1_RUN_SCHEMA", `run.${key}`);
  if (!RUN_FAMILIES.includes(run.runFamily)) fail("E1_RUN_SCHEMA", `unknown run family ${run.runFamily}`);
  if (run.apparatusId !== apparatus.apparatusId || run.apparatusRevision !== apparatus.revision) fail("E1_RUN_APPARATUS_MISMATCH", `${run.runId} apparatus identity mismatch`);
  assertTimestamp(run.startedAt, "E1_RUN_SCHEMA", "run.startedAt");
  assertFinite(run.latencySeconds, "E1_RUN_SCHEMA", "run.latencySeconds");
  assertFinite(run.synchronizationStandardUncertaintySeconds, "E1_RUN_SCHEMA", "run.synchronizationStandardUncertaintySeconds", 0);
  assertHash(run.configurationHash, "E1_CONFIGURATION_HASH", "run.configurationHash");
  assertHash(run.rawDataHash, "E1_RAW_DATA_HASH", "run.rawDataHash");
  assertUniqueStrings(run.calibrationIds, "E1_RUN_SCHEMA", "run.calibrationIds", 1);
  if (!Array.isArray(run.channels) || run.channels.length === 0) fail("E1_RUN_SCHEMA", "run.channels must be non-empty");
  const channelIds = new Set();
  for (const channel of run.channels) {
    const keys = ["channelId", "kind", "unit", "calibrationId"];
    assertExactKeys(channel, keys, keys, "E1_RUN_SCHEMA", "run.channels[]");
    assertString(channel.channelId, "E1_RUN_SCHEMA", "run.channelId");
    if (channelIds.has(channel.channelId)) fail("E1_DUPLICATE_PRIMARY_KEY", `duplicate channel ${channel.channelId}`);
    channelIds.add(channel.channelId);
    if (!CHANNEL_KINDS.includes(channel.kind)) fail("E1_UNKNOWN_CHANNEL", `unknown channel kind ${channel.kind}`);
    if (channel.unit !== EXPECTED_UNITS[channel.kind]) fail("E1_ANGLE_DISPLACEMENT_MIX", `${channel.kind} cannot use ${channel.unit}`);
    assertString(channel.calibrationId, "E1_MISSING_CALIBRATION", `run.channels.${channel.channelId}.calibrationId`);
    if (!run.calibrationIds.includes(channel.calibrationId)) fail("E1_MISSING_CALIBRATION", `${channel.calibrationId} is not bound by run`);
    const calibration = calibrationsById.get(channel.calibrationId);
    if (!calibration) fail("E1_MISSING_CALIBRATION", `${channel.calibrationId} is absent`);
    if (calibration.channelId !== channel.channelId || calibration.channelKind !== channel.kind || calibration.outputUnit !== channel.unit) {
      fail("E1_ANGLE_DISPLACEMENT_MIX", `${channel.channelId} does not match its calibration`);
    }
    const started = Date.parse(run.startedAt);
    if (started < Date.parse(calibration.validFrom) || started > Date.parse(calibration.validUntil)) {
      fail("E1_EXPIRED_CALIBRATION", `${calibration.calibrationId} is not valid at run start`);
    }
  }
  validateSafety(run.safety);
  if (!RUN_STATUSES.includes(run.status)) fail("E1_RUN_SCHEMA", `invalid status ${run.status}`);

  const series = entry.timeseries;
  const seriesRequired = ["schemaVersion", "runId", "timeUnit", "records"];
  assertExactKeys(series, seriesRequired, seriesRequired, "E1_TIMESERIES_SCHEMA", `timeseries.${run.runId}`);
  if (series.schemaVersion !== "E1-TIMESERIES-v1" || series.runId !== run.runId || series.timeUnit !== "s") fail("E1_TIMESERIES_SCHEMA", `${run.runId} timeseries identity mismatch`);
  if (!Array.isArray(series.records) || series.records.length === 0) fail("E1_TIMESERIES_SCHEMA", "timeseries records must be non-empty");
  const recordIds = new Set();
  const lastTimeByChannel = new Map();
  const channelsById = new Map(run.channels.map((channel) => [channel.channelId, channel]));
  for (const record of series.records) {
    const keys = ["recordId", "channelId", "time", "value", "unit", "source", "standardUncertainty"];
    assertExactKeys(record, keys, keys, "E1_TIMESERIES_SCHEMA", "timeseries.records[]");
    assertString(record.recordId, "E1_TIMESERIES_SCHEMA", "recordId");
    if (recordIds.has(record.recordId)) fail("E1_DUPLICATE_PRIMARY_KEY", `duplicate record ${record.recordId}`);
    recordIds.add(record.recordId);
    const channel = channelsById.get(record.channelId);
    if (!channel) fail("E1_UNKNOWN_CHANNEL", `record references ${record.channelId}`);
    assertFinite(record.time, "E1_TIME_REGRESSION", "record.time", 0);
    const previous = lastTimeByChannel.get(record.channelId);
    if (previous !== undefined && record.time <= previous) fail("E1_TIME_REGRESSION", `${record.channelId} time did not increase strictly`);
    lastTimeByChannel.set(record.channelId, record.time);
    assertFinite(record.value, "E1_NONFINITE_VALUE", "record.value");
    assertString(record.unit, "E1_MISSING_UNIT", "record.unit");
    if (record.unit !== channel.unit) fail("E1_ANGLE_DISPLACEMENT_MIX", `${record.channelId} unit disagrees with channel`);
    if (!SERIES_SOURCES.includes(record.source)) fail("E1_MISSING_SOURCE", "record source is invalid");
    assertFinite(record.standardUncertainty, "E1_MISSING_UNCERTAINTY", "record.standardUncertainty", 0);
  }
  if (run.configurationHash !== canonicalSha256(entry.configuration)) fail("E1_CONFIGURATION_HASH", `${run.runId} configuration hash mismatch`);
  if (run.rawDataHash !== canonicalSha256(series)) fail("E1_RAW_DATA_HASH", `${run.runId} raw data hash mismatch`);
  return true;
}

export function validateBundle(bundle, contract) {
  const required = ["schemaVersion", "contractId", "classification", "seed", "apparatus", "calibrations", "runs", "identification", "identificationData"];
  assertExactKeys(bundle, required, required, "E1_BUNDLE_SCHEMA", "bundle");
  if (bundle.schemaVersion !== "E1-SYNTHETIC-BUNDLE-v1") fail("E1_BUNDLE_SCHEMA", "bundle schemaVersion mismatch");
  if (bundle.contractId !== contract.contractId || bundle.classification !== "synthetic-only") fail("E1_CLASSIFICATION", "bundle contract identity or classification mismatch");
  if (!Number.isInteger(bundle.seed)) fail("E1_BUNDLE_SCHEMA", "seed must be an integer");
  validateApparatus(bundle.apparatus);
  if (!Array.isArray(bundle.calibrations) || bundle.calibrations.length === 0) fail("E1_CALIBRATION_SCHEMA", "calibration registry must be non-empty");
  const calibrationsById = new Map();
  for (const calibration of bundle.calibrations) {
    validateCalibration(calibration, bundle.apparatus);
    if (calibrationsById.has(calibration.calibrationId)) fail("E1_DUPLICATE_PRIMARY_KEY", `duplicate calibration ${calibration.calibrationId}`);
    calibrationsById.set(calibration.calibrationId, calibration);
  }
  if (!Array.isArray(bundle.runs) || bundle.runs.length === 0) fail("E1_RUN_SCHEMA", "run registry must be non-empty");
  const runIds = new Set();
  const observedFamilies = new Set();
  const observedKinds = new Set();
  for (const entry of bundle.runs) {
    validateRunEntry(entry, bundle.apparatus, calibrationsById);
    if (runIds.has(entry.runRecord.runId)) fail("E1_DUPLICATE_PRIMARY_KEY", `duplicate run ${entry.runRecord.runId}`);
    runIds.add(entry.runRecord.runId);
    observedFamilies.add(entry.runRecord.runFamily);
    for (const channel of entry.runRecord.channels) observedKinds.add(channel.kind);
  }
  for (const family of contract.requiredRunFamilies) if (!observedFamilies.has(family)) fail("E1_MISSING_RUN_FAMILY", `missing ${family}`);
  for (const kind of contract.requiredChannelKinds) if (!observedKinds.has(kind)) fail("E1_UNKNOWN_CHANNEL", `missing channel kind ${kind}`);
  validateIdentification(bundle.identification, contract);
  const dataRequired = ["training", "holdout"];
  assertExactKeys(bundle.identificationData, dataRequired, dataRequired, "E1_IDENTIFICATION_DATA", "identificationData");
  for (const split of dataRequired) {
    if (!Array.isArray(bundle.identificationData[split]) || bundle.identificationData[split].length === 0) fail("E1_IDENTIFICATION_DATA", `${split} samples are empty`);
    const allowedBlocks = new Set(bundle.identification[`${split === "training" ? "training" : "holdout"}ConditionBlocks`]);
    for (const sample of bundle.identificationData[split]) {
      const keys = ["sampleId", "conditionBlockId", "x", "y"];
      assertExactKeys(sample, keys, keys, "E1_IDENTIFICATION_DATA", `${split}[]`);
      assertString(sample.sampleId, "E1_IDENTIFICATION_DATA", `${split}.sampleId`);
      assertString(sample.conditionBlockId, "E1_IDENTIFICATION_DATA", `${split}.conditionBlockId`);
      if (!allowedBlocks.has(sample.conditionBlockId)) fail("E1_TRAINING_HOLDOUT_OVERLAP", `${sample.conditionBlockId} appears in the wrong split`);
      assertFinite(sample.x, "E1_NONFINITE_VALUE", `${split}.x`);
      assertFinite(sample.y, "E1_NONFINITE_VALUE", `${split}.y`);
    }
  }
  const sampleIds = [...bundle.identificationData.training, ...bundle.identificationData.holdout].map((sample) => sample.sampleId);
  if (new Set(sampleIds).size !== sampleIds.length) fail("E1_DUPLICATE_PRIMARY_KEY", "identification sample IDs are not unique");
  return true;
}

export const e1Constants = Object.freeze({ CHANNEL_KINDS, EXPECTED_UNITS, RUN_FAMILIES });
