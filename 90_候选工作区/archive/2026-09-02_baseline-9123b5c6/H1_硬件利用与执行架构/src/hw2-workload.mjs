import { createHash } from "node:crypto";

import { canonicalSha256, immutableJsonClone } from "./canonical.mjs";

export const HW2_SYNTHETIC_WORKLOAD = immutableJsonClone({
  workloadId: "VP-HW2-FIXED-U32-INDEPENDENT-STATE-v1",
  classification: "synthetic-non-scientific",
  elementIdentity: "global-zero-based-index-u32",
  seedIdentity: "mix32-7feb352d-846ca68b-v1",
  stepIdentity: "xorshift-add-rotate-u32-v1",
  arithmetic: "exact-modulo-2^32",
  digest: "sha256-little-endian-u32-population-bytes",
  allowedPersistentOutputs: ["hash", "equality-boolean", "timing", "resource-field"],
  scientificPayloadAccepted: false,
  canonicalA8rArtifactWriteForbidden: true,
});

export const HW2_SYNTHETIC_SOURCE_HASH = canonicalSha256(HW2_SYNTHETIC_WORKLOAD);

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`NO-GO-HW2-SYNTHETIC-WORKLOAD: ${label} must be a positive safe integer`);
  }
}

export function seedU32(globalIndex) {
  if (!Number.isSafeInteger(globalIndex) || globalIndex < 0 || globalIndex > 0xffff_ffff) {
    throw new Error("NO-GO-HW2-SYNTHETIC-WORKLOAD: globalIndex is outside u32 range");
  }
  let value = (globalIndex ^ 0x9e37_79b9) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb_352d) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x846c_a68b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

export function stepU32(value, round) {
  let state = value >>> 0;
  state = (state ^ (state << 13)) >>> 0;
  state = (state ^ (state >>> 17)) >>> 0;
  state = (state ^ (state << 5)) >>> 0;
  state = (state + 0x9e37_79b9 + Math.imul(round >>> 0, 0x85eb_ca6b)) >>> 0;
  return ((state << 7) | (state >>> 25)) >>> 0;
}

export function fillSyntheticRange({target, targetOffset = 0, globalOffset = 0, count, rounds}) {
  if (!(target instanceof Uint32Array)) {
    throw new Error("NO-GO-HW2-SYNTHETIC-WORKLOAD: target must be Uint32Array");
  }
  positiveInteger(count, "count");
  positiveInteger(rounds, "rounds");
  if (!Number.isSafeInteger(targetOffset) || targetOffset < 0 || targetOffset + count > target.length) {
    throw new Error("NO-GO-HW2-SYNTHETIC-WORKLOAD: target range is invalid");
  }
  if (!Number.isSafeInteger(globalOffset) || globalOffset < 0 || globalOffset + count > 0x1_0000_0000) {
    throw new Error("NO-GO-HW2-SYNTHETIC-WORKLOAD: global range is invalid");
  }
  for (let localIndex = 0; localIndex < count; localIndex += 1) {
    let state = seedU32(globalOffset + localIndex);
    for (let round = 0; round < rounds; round += 1) state = stepU32(state, round);
    target[targetOffset + localIndex] = state;
  }
  return target;
}

export function digestU32Population(population) {
  if (!(population instanceof Uint32Array)) {
    throw new Error("NO-GO-HW2-SYNTHETIC-WORKLOAD: population must be Uint32Array");
  }
  const bytes = Buffer.from(population.buffer, population.byteOffset, population.byteLength);
  return createHash("sha256").update(bytes).digest("hex");
}

export function workUnitsMillion(elements, rounds) {
  positiveInteger(elements, "elements");
  positiveInteger(rounds, "rounds");
  const units = elements * rounds;
  if (!Number.isSafeInteger(units)) {
    throw new Error("NO-GO-HW2-SYNTHETIC-WORKLOAD: work unit product exceeds safe integer");
  }
  return units / 1_000_000;
}
