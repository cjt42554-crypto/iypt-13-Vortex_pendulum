import { randomUUID } from "node:crypto";
import { link, mkdir, open, realpath, stat, unlink } from "node:fs/promises";
import { join } from "node:path";

import {
  canonicalBytes,
  canonicalSha256,
  immutableJsonClone,
  sha256,
} from "./canonical.mjs";
import { assertActiveContract } from "./contract.mjs";
import { assertResultBlind, createProvenance } from "./provenance.mjs";

export const SHARD_SCHEMA_VERSION = "VP-H1-NO-RESULT-SHARD-v1";

function fail(code, message) {
  throw new Error(`${code}: ${message}`);
}

function assertHash(value, label) {
  if (!/^[0-9a-f]{64}$/u.test(value)) fail("NO-GO-HW1-PROVENANCE-ALIASING", `${label} is invalid`);
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("NO-GO-HW1-CONTRACT-MAPPING", `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail("NO-GO-HW1-CONTRACT-MAPPING", `${label} keys differ`);
  }
}

export function createSyntheticShard(input, contract) {
  assertActiveContract(contract);
  if (input.classification !== "synthetic-non-scientific") {
    fail("NO-GO-HW1-SCIENTIFIC-FIELD-LEAK", "only synthetic payloads can form a G1 shard");
  }
  if (!Buffer.isBuffer(input.payload)) fail("NO-GO-HW1-CONTRACT-MAPPING", "payload must be a Buffer");
  if (!/^SYNTH-CASE-[0-9]{2}$/u.test(input.caseId)) fail("NO-GO-HW1-CONTRACT-MAPPING", "caseId invalid");
  if (!Number.isInteger(input.caseIndex) || input.caseIndex < 0) {
    fail("NO-GO-HW1-CONTRACT-MAPPING", "caseIndex invalid");
  }
  if (typeof input.matrixId !== "string" || input.matrixId.length === 0) {
    fail("NO-GO-HW1-CONTRACT-MAPPING", "matrixId is missing");
  }
  if (!/^[A-Za-z0-9._-]+$/u.test(input.runId)) {
    fail("NO-GO-HW1-CONTRACT-MAPPING", "runId is invalid");
  }
  if (!input.execution || typeof input.execution !== "object" || Array.isArray(input.execution)) {
    fail("INCONCLUSIVE-HW1-BACKEND-INTERFACE", "execution record is missing");
  }
  if (input.completeCase !== true || input.stepZeroComplete !== true) {
    fail("NO-GO-HW1-CONTRACT-MAPPING", "shards require a complete case from step zero");
  }
  for (const label of [
    "contractHash",
    "sourceHash",
    "dependencyHash",
    "environmentHash",
    "implementationHash",
  ]) {
    assertHash(input[label], label);
  }
  const canonicalPayloadHash = sha256(input.payload);
  const caseDefinitionHash = canonicalSha256({
    matrixId: input.matrixId,
    caseId: input.caseId,
    caseIndex: input.caseIndex,
  });
  const provenance = createProvenance(
    {
      scientific: {
        contractHash: input.contractHash,
        sourceHash: input.sourceHash,
        dependencyHash: input.dependencyHash,
        implementationHash: input.implementationHash,
        canonicalPayloadHash,
      },
      execution: {
        contractHash: input.contractHash,
        sourceHash: input.sourceHash,
        dependencyHash: input.dependencyHash,
        implementationHash: input.implementationHash,
        environmentHash: input.environmentHash,
        backendId: input.execution.backendId,
        schedulerId: input.schedulerId,
        workerCount: input.workerCount,
        deviceId: input.execution.deviceId,
        exitCode: input.execution.exitCode,
        classification: input.execution.classification,
      },
      artifact: {
        contractHash: input.contractHash,
        sourceHash: input.sourceHash,
        implementationHash: input.implementationHash,
        canonicalPayloadHash,
        classification: "G1-SYNTHETIC-SHARD",
      },
    },
    contract,
  );
  const body = {
    schemaVersion: SHARD_SCHEMA_VERSION,
    classification: "synthetic-non-scientific",
    matrixId: input.matrixId,
    caseId: input.caseId,
    caseIndex: input.caseIndex,
    caseDefinitionHash,
    runId: input.runId,
    state: "COMPLETE",
    stepZeroComplete: true,
    completeCase: true,
    provenance,
  };
  return immutableJsonClone({...body, shardHash: canonicalSha256(body)});
}

export function validateShard(shard, contract) {
  assertActiveContract(contract);
  if (!shard || typeof shard !== "object" || Array.isArray(shard)) {
    fail("NO-GO-HW1-CONTRACT-MAPPING", "shard is missing");
  }
  assertExactKeys(
    shard,
    [
      "schemaVersion",
      "classification",
      "matrixId",
      "caseId",
      "caseIndex",
      "caseDefinitionHash",
      "runId",
      "state",
      "stepZeroComplete",
      "completeCase",
      "provenance",
      "shardHash",
    ],
    "shard",
  );
  if (shard.schemaVersion !== SHARD_SCHEMA_VERSION) fail("NO-GO-HW1-CONTRACT-MAPPING", "schemaVersion drift");
  if (shard.classification !== "synthetic-non-scientific") {
    fail("NO-GO-HW1-SCIENTIFIC-FIELD-LEAK", "non-synthetic shard rejected");
  }
  if (shard.state !== "COMPLETE" || shard.stepZeroComplete !== true || shard.completeCase !== true) {
    fail("NO-GO-HW1-SHARD-INCOMPLETE", `shard ${shard.caseId} is incomplete`);
  }
  if (!/^SYNTH-CASE-[0-9]{2}$/u.test(shard.caseId) || !Number.isInteger(shard.caseIndex)) {
    fail("NO-GO-HW1-CONTRACT-MAPPING", "shard case identity is invalid");
  }
  if (typeof shard.matrixId !== "string" || shard.matrixId.length === 0) {
    fail("NO-GO-HW1-CONTRACT-MAPPING", "shard matrixId is missing");
  }
  if (!/^[A-Za-z0-9._-]+$/u.test(shard.runId)) {
    fail("NO-GO-HW1-CONTRACT-MAPPING", "shard runId is invalid");
  }
  assertHash(shard.caseDefinitionHash, "caseDefinitionHash");
  if (
    shard.caseDefinitionHash !== canonicalSha256({
      matrixId: shard.matrixId,
      caseId: shard.caseId,
      caseIndex: shard.caseIndex,
    })
  ) fail("NO-GO-HW1-SHARD-CORRUPT", `shard ${shard.caseId} definition hash mismatch`);
  assertExactKeys(shard.provenance, ["scientific", "execution", "artifact", "provenanceHash"], "provenance");
  assertExactKeys(
    shard.provenance.scientific,
    ["contractHash", "sourceHash", "dependencyHash", "implementationHash", "canonicalPayloadHash"],
    "provenance.scientific",
  );
  assertExactKeys(
    shard.provenance.execution,
    [
      "contractHash",
      "sourceHash",
      "dependencyHash",
      "implementationHash",
      "environmentHash",
      "backendId",
      "schedulerId",
      "workerCount",
      "deviceId",
      "exitCode",
      "classification",
    ],
    "provenance.execution",
  );
  assertExactKeys(
    shard.provenance.artifact,
    ["contractHash", "sourceHash", "implementationHash", "canonicalPayloadHash", "classification"],
    "provenance.artifact",
  );
  for (const layer of ["scientific", "execution", "artifact"]) {
    for (const [key, value] of Object.entries(shard.provenance[layer])) {
      if (key.endsWith("Hash")) assertHash(value, `provenance.${layer}.${key}`);
    }
  }
  assertHash(shard.provenance.provenanceHash, "provenanceHash");
  if (
    shard.provenance.provenanceHash !== canonicalSha256({
      scientific: shard.provenance.scientific,
      execution: shard.provenance.execution,
      artifact: shard.provenance.artifact,
    })
  ) fail("NO-GO-HW1-SHARD-CORRUPT", `shard ${shard.caseId} provenance hash mismatch`);
  assertResultBlind(shard, contract);
  const {shardHash, ...body} = shard;
  assertHash(shardHash, "shardHash");
  if (canonicalSha256(body) !== shardHash) {
    fail("NO-GO-HW1-SHARD-CORRUPT", `shard ${shard.caseId} hash mismatch`);
  }
  return shard;
}

export function serializeShard(shard, contract) {
  validateShard(shard, contract);
  return Buffer.concat([canonicalBytes(shard), Buffer.from("\n")]);
}

export async function writeShardAtomic({ directory, shard, contract }) {
  const bytes = serializeShard(shard, contract);
  await mkdir(directory, {recursive: true});
  const finalPath = join(directory, `${shard.caseId}.shard.json`);
  const temporaryPath = join(directory, `.${shard.caseId}.${randomUUID()}.partial`);
  const handle = await open(temporaryPath, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporaryPath, finalPath);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
  const directoryHandle = await open(directory, "r");
  try {
    await directoryHandle.sync();
  } finally {
    await directoryHandle.close();
  }
  const identity = await stat(finalPath);
  return immutableJsonClone({
    path: finalPath,
    realpath: await realpath(finalPath),
    deviceId: String(identity.dev),
    inode: String(identity.ino),
    sizeBytes: identity.size,
    shardHash: shard.shardHash,
    fileHash: sha256(bytes),
  });
}
