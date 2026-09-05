import { canonicalSha256, immutableJsonClone } from "./canonical.mjs";
import { validateBackendDescriptor } from "./backend.mjs";
import { ACTIVE_CONTRACT_SHA256, assertActiveContract } from "./contract.mjs";
import { validateInventorySnapshot } from "./inventory.mjs";
import { assertResultBlind } from "./provenance.mjs";

function fail(message) {
  throw new Error(`NO-GO-HW1-PLANNER: ${message}`);
}

function isGpuClass(candidateClass) {
  return candidateClass === "gpu-compute" || candidateClass === "cpu-gpu-hybrid";
}

export function buildResultBlindPlan({ inventory, backends, schedulerId }, contract) {
  assertActiveContract(contract);
  validateInventorySnapshot(inventory, contract);
  if (!Array.isArray(backends) || backends.length === 0) fail("backends are missing");
  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(schedulerId)) fail("schedulerId is invalid");
  const descriptors = backends.map((backend) => validateBackendDescriptor(backend, contract));
  const backendIds = descriptors.map((descriptor) => descriptor.backendId);
  if (new Set(backendIds).size !== backendIds.length) fail("backend IDs are duplicated");
  if (backendIds.some((id) => /serial-reference|legacy-serial/iu.test(id))) {
    fail("legacy serial reference cannot be a candidate or fallback");
  }
  const covered = new Set(descriptors.map((descriptor) => descriptor.candidateClass));
  const missingClasses = contract.candidateClasses.filter((candidateClass) => !covered.has(candidateClass));
  if (missingClasses.length > 0) fail(`candidate coverage missing: ${missingClasses.join(",")}`);

  const {memory, cgroup, cpu, gpu} = inventory.components;
  const reserveBytes = Math.max(
    contract.gates.systemReserveBytesMinimum,
    Math.ceil(contract.gates.systemReserveMemTotalFraction * memory.memTotalBytes),
  );
  const hostBudget = Math.max(0, memory.memAvailableBytes - reserveBytes);
  const cgroupBudget = Math.max(0, cgroup.memoryLimitBytes - cgroup.memoryCurrentBytes);
  const allocatableBytes = Math.min(hostBudget, cgroupBudget);
  const foreignGpu = new Set(
    gpu.devices.filter((device) => device.foreignProcessPresent === true).map((device) => device.deviceId),
  );
  const gpuById = new Map(gpu.devices.map((device) => [device.deviceId, device]));

  const candidates = descriptors.map((descriptor) => {
    let status = descriptor.availability;
    let reason = descriptor.staticReason;
    if (status === "AVAILABLE" && isGpuClass(descriptor.candidateClass)) {
      const device = gpuById.get(descriptor.deviceId);
      if (!device) {
        status = "STATIC_NO_GO";
        reason = "GPU_DEVICE_NOT_IN_INVENTORY";
      } else if (device.accessible !== true) {
        status = "STATIC_NO_GO";
        reason = "GPU_DEVICE_NOT_ACCESSIBLE";
      } else if (foreignGpu.has(descriptor.deviceId)) {
        status = "DEFERRED_UNSAFE_TO_PROBE";
        reason = "GPU_FOREIGN_PROCESS_PRESENT";
      }
    }
    const bytesPerWorkerWithHeadroom = Math.ceil(
      descriptor.estimatedPeakBytesPerWorker * (1 + contract.gates.candidateHeadroomFraction),
    );
    const memoryWorkerLimit = Math.floor(allocatableBytes / bytesPerWorkerWithHeadroom);
    const cpuWorkerLimit = Math.max(1, cpu.logicalCpuCount);
    const workerCount = isGpuClass(descriptor.candidateClass)
      ? Math.min(1, memoryWorkerLimit)
      : Math.min(cpuWorkerLimit, memoryWorkerLimit);
    if (status === "AVAILABLE" && workerCount < 1) {
      status = "STATIC_NO_GO";
      reason = "INSUFFICIENT_MEMORY_HEADROOM";
    }
    return {
      backendId: descriptor.backendId,
      candidateClass: descriptor.candidateClass,
      availability: status,
      staticReason: reason,
      schedulerId,
      workerCount: Math.max(0, workerCount),
      deviceId: descriptor.deviceId,
      estimatedPeakBytes: Math.max(0, workerCount) * descriptor.estimatedPeakBytesPerWorker,
      bytesPerWorkerWithHeadroom,
    };
  }).sort((a, b) => a.backendId.localeCompare(b.backendId, "en"));

  const body = {
    schemaVersion: "VP-H1-RESULT-BLIND-PLAN-v1",
    classification: "G1-NO-RESULT-PLAN",
    contractHash: ACTIVE_CONTRACT_SHA256,
    inventoryHash: inventory.inventoryHash,
    schedulerId,
    reserveBytes,
    allocatableBytes,
    fullResultBearingRunForbidden: true,
    runtimeFallbackForbidden: true,
    candidateClassesCovered: [...contract.candidateClasses],
    candidates,
  };
  assertResultBlind(body, contract);
  return immutableJsonClone({...body, planHash: canonicalSha256(body)});
}
