import { canonicalBytes, canonicalSha256, immutableJsonClone } from "./canonical.mjs";
import { assertActiveContract } from "./contract.mjs";
import { assertResultBlind } from "./provenance.mjs";

const AVAILABILITY = new Set(["AVAILABLE", "STATIC_NO_GO", "DEFERRED_UNSAFE_TO_PROBE"]);

function fail(message) {
  throw new Error(`INCONCLUSIVE-HW1-BACKEND-INTERFACE: ${message}`);
}

export function validateBackendDescriptor(descriptor, contract) {
  assertActiveContract(contract);
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) {
    fail("descriptor is missing");
  }
  const required = [
    "backendId",
    "candidateClass",
    "version",
    "availability",
    "staticReason",
    "resultBlind",
    "fullResultBearingRunForbidden",
    "runtimeFallbackForbidden",
    "estimatedPeakBytesPerWorker",
    "deviceId",
  ];
  const actual = Object.keys(descriptor).sort();
  if (JSON.stringify(actual) !== JSON.stringify(required.sort())) fail("descriptor keys differ");
  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(descriptor.backendId)) fail("backendId is invalid");
  if (!contract.candidateClasses.includes(descriptor.candidateClass)) fail("unknown candidateClass");
  if (!AVAILABILITY.has(descriptor.availability)) fail("unknown availability");
  if (descriptor.availability === "AVAILABLE" && descriptor.staticReason !== null) {
    fail("AVAILABLE backend cannot carry a static rejection reason");
  }
  if (descriptor.availability !== "AVAILABLE" && !descriptor.staticReason) {
    fail("unavailable backend requires a machine-auditable reason");
  }
  if (
    descriptor.availability !== "AVAILABLE" &&
    !/^(?:DEVICE_|GPU_|TOOLCHAIN_|COMPUTE_API_|REQUIRED_API_|RESOURCE_GATE_|UNSAFE_RESOURCE_)/u.test(
      descriptor.staticReason,
    )
  ) {
    fail("staticReason is not a machine-auditable device, API, toolchain, or resource code");
  }
  if (descriptor.resultBlind !== true) fail("backend must be result-blind");
  if (descriptor.fullResultBearingRunForbidden !== true) fail("G1 backend must forbid result-bearing runs");
  if (descriptor.runtimeFallbackForbidden !== true) fail("runtime fallback must be forbidden");
  if (!Number.isSafeInteger(descriptor.estimatedPeakBytesPerWorker) || descriptor.estimatedPeakBytesPerWorker < 1) {
    fail("estimatedPeakBytesPerWorker must be a positive safe integer");
  }
  assertResultBlind(descriptor, contract);
  return immutableJsonClone(descriptor);
}

export function createSyntheticBackend(descriptor, contract) {
  const frozenDescriptor = validateBackendDescriptor(descriptor, contract);
  if (frozenDescriptor.availability !== "AVAILABLE") {
    fail("cannot instantiate an unavailable backend");
  }
  const implementationHash = canonicalSha256({
    interface: "VP-H1-NO-RESULT-BACKEND-v1",
    version: frozenDescriptor.version,
    candidateClass: frozenDescriptor.candidateClass,
  });

  return Object.freeze({
    descriptor: frozenDescriptor,
    implementationHash,
    async runSyntheticCase(input) {
      if (input?.classification !== "synthetic-non-scientific") {
        fail("only synthetic-non-scientific inputs are accepted during G1");
      }
      if (!/^SYNTH-CASE-[0-9]{2}$/u.test(input.caseId)) fail("synthetic caseId is invalid");
      if (!Number.isInteger(input.caseIndex) || input.caseIndex < 0) fail("caseIndex is invalid");
      if (typeof input.payloadSeed !== "string" || input.payloadSeed.length === 0) {
        fail("payloadSeed is missing");
      }
      const payload = canonicalBytes({
        classification: "synthetic-non-scientific",
        caseId: input.caseId,
        caseIndex: input.caseIndex,
        payloadSeed: input.payloadSeed,
        semanticKernel: "VP-H1-FIXED-SYNTHETIC-BYTES-v1",
      });
      return Object.freeze({
        payload,
        execution: immutableJsonClone({
          backendId: frozenDescriptor.backendId,
          deviceId: frozenDescriptor.deviceId,
          exitCode: 0,
          classification: "G1-SYNTHETIC-COMPLETE",
        }),
      });
    },
  });
}
