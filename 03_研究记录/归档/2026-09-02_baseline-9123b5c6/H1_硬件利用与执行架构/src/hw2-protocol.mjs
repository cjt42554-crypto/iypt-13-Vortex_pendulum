import { readFile } from "node:fs/promises";

import { immutableJsonClone, sha256 } from "./canonical.mjs";
import { ACTIVE_CONTRACT_ID } from "./contract.mjs";
import { HW2_SYNTHETIC_SOURCE_HASH, HW2_SYNTHETIC_WORKLOAD } from "./hw2-workload.mjs";

export const HW2_PROTOCOL_SHA256 = "aa83b4b0767e4ac81dc0eaefc880a1ed3eafec8337602145f4488ffbe48b819e";
export const DEFAULT_HW2_PROTOCOL_URL = new URL("../contracts/hw2-qualification-protocol.v1.json", import.meta.url);

function fail(message) {
  throw new Error(`NO-GO-HW2-PROTOCOL: ${message}`);
}

export function assertHw2Protocol(protocol) {
  if (!protocol || typeof protocol !== "object" || Array.isArray(protocol)) fail("protocol is missing");
  if (protocol.protocolId !== "VP-HW2-RESULT-BLIND-QUALIFICATION-PROTOCOL-v1") fail("protocolId mismatch");
  if (protocol.activeH1ContractId !== ACTIVE_CONTRACT_ID) fail("active H1 contract mismatch");
  if (protocol.syntheticWorkloadId !== HW2_SYNTHETIC_WORKLOAD.workloadId) fail("workloadId mismatch");
  if (protocol.syntheticSourceHash !== HW2_SYNTHETIC_SOURCE_HASH) fail("synthetic source hash mismatch");
  for (const key of [
    "candidateCodeCommittedBeforePerformanceObservation",
    "cleanMainParityRequired",
    "finiteDedicatedMemoryCgroupRequired",
    "fullResultBearingRunForbidden",
    "scientificPayloadReadForbidden",
    "canonicalA8rArtifactWriteForbidden",
    "runtimeFallbackForbidden",
  ]) if (protocol[key] !== true) fail(`${key} must remain true`);
  if (protocol.calibration.maximumObservationsPerFamily !== 3) fail("calibration observation count drifted");
  if (protocol.calibration.formalBaselineTargetSeconds !== 55) fail("baseline target drifted");
  if (protocol.calibration.bandwidthTargetSeconds !== 15) fail("bandwidth target drifted");
  if (protocol.calibration.bandwidthRepeats !== 3) fail("bandwidth repeat count drifted");
  if (protocol.measurement.validRepeats !== 3 || protocol.measurement.warmupSteps !== 32) {
    fail("measurement count or warmup drifted");
  }
  if (protocol.measurement.resourceSampleIntervalMilliseconds !== 250) fail("sample interval drifted");
  if (protocol.selection.usesFrozenH1V2Gates !== true || protocol.selection.stopsAtPr2 !== true) {
    fail("selection or PR-2 stop drifted");
  }
  return protocol;
}

export async function loadHw2Protocol({protocolUrl = DEFAULT_HW2_PROTOCOL_URL} = {}) {
  const bytes = await readFile(protocolUrl);
  if (sha256(bytes) !== HW2_PROTOCOL_SHA256) fail("protocol byte hash drifted");
  const protocol = JSON.parse(bytes.toString("utf8"));
  assertHw2Protocol(protocol);
  return immutableJsonClone(protocol);
}
