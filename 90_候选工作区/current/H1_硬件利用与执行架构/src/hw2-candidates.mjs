import { immutableJsonClone } from "./canonical.mjs";
import { validateBackendDescriptor } from "./backend.mjs";
import { validateInventorySnapshot } from "./inventory.mjs";

const MiB = 1024 ** 2;

const DEFINITIONS = Object.freeze([
  {
    backendId: "hw2-node-worker-shared-domain-v1",
    candidateClass: "trajectory-process-parallel",
    deviceId: "host-cpu",
    estimatedPeakBytesPerWorker: 256 * MiB,
    requirement: "node-workers",
  },
  {
    backendId: "hw2-native-openmp-domain-v1",
    candidateClass: "single-trajectory-cpu-domain-or-thread",
    deviceId: "host-cpu",
    estimatedPeakBytesPerWorker: 256 * MiB,
    requirement: "gcc-openmp",
  },
  {
    backendId: "hw2-native-simd-v1",
    candidateClass: "native-or-wasm-simd",
    deviceId: "host-cpu",
    estimatedPeakBytesPerWorker: 256 * MiB,
    requirement: "gcc-simd",
  },
  {
    backendId: "hw2-cuda-driver-jit-v1",
    candidateClass: "gpu-compute",
    deviceId: "first-accessible-gpu",
    estimatedPeakBytesPerWorker: 512 * MiB,
    requirement: "cuda-driver-jit",
  },
  {
    backendId: "hw2-cpu-cuda-driver-hybrid-v1",
    candidateClass: "cpu-gpu-hybrid",
    deviceId: "first-accessible-gpu",
    estimatedPeakBytesPerWorker: 768 * MiB,
    requirement: "cuda-driver-jit-and-openmp",
  },
  {
    backendId: "hw2-node-transfer-shard-aggregation-v1",
    candidateClass: "data-layout-shard-aggregation",
    deviceId: "host-cpu",
    estimatedPeakBytesPerWorker: 256 * MiB,
    requirement: "node-workers",
  },
]);

function availability(definition, inventory) {
  const compiler = inventory.components.compiler;
  const isa = inventory.components.isa;
  const gpu = inventory.components.gpu;
  const firstGpu = gpu.devices.find((device) => device.accessible === true);
  switch (definition.requirement) {
    case "node-workers":
      return {availability: "AVAILABLE", staticReason: null, deviceId: definition.deviceId};
    case "gcc-openmp":
      return compiler.gcc?.available && compiler.openmpCandidate
        ? {availability: "AVAILABLE", staticReason: null, deviceId: definition.deviceId}
        : {availability: "STATIC_NO_GO", staticReason: "TOOLCHAIN_GCC_OPENMP_UNAVAILABLE", deviceId: definition.deviceId};
    case "gcc-simd":
      return compiler.gcc?.available && (isa.avx2 || isa.avx512)
        ? {availability: "AVAILABLE", staticReason: null, deviceId: definition.deviceId}
        : {availability: "STATIC_NO_GO", staticReason: "REQUIRED_API_NATIVE_SIMD_UNAVAILABLE", deviceId: definition.deviceId};
    case "cuda-driver-jit":
      return gpu.cudaDriverLibraryPresent && firstGpu
        ? {availability: "AVAILABLE", staticReason: null, deviceId: firstGpu.deviceId}
        : {availability: "STATIC_NO_GO", staticReason: "COMPUTE_API_CUDA_DRIVER_JIT_UNAVAILABLE", deviceId: firstGpu?.deviceId ?? "unavailable-gpu"};
    case "cuda-driver-jit-and-openmp":
      return gpu.cudaDriverLibraryPresent && firstGpu && compiler.gcc?.available && compiler.openmpCandidate
        ? {availability: "AVAILABLE", staticReason: null, deviceId: firstGpu.deviceId}
        : {availability: "STATIC_NO_GO", staticReason: "COMPUTE_API_CUDA_DRIVER_OR_OPENMP_UNAVAILABLE", deviceId: firstGpu?.deviceId ?? "unavailable-gpu"};
    default:
      throw new Error(`unknown HW2 candidate requirement ${definition.requirement}`);
  }
}

export function discoverHw2BackendDescriptors(inventory, contract) {
  validateInventorySnapshot(inventory, contract);
  return immutableJsonClone(DEFINITIONS.map((definition) => {
    const resolved = availability(definition, inventory);
    return validateBackendDescriptor({
      backendId: definition.backendId,
      candidateClass: definition.candidateClass,
      version: "1.0.0",
      availability: resolved.availability,
      staticReason: resolved.staticReason,
      resultBlind: true,
      fullResultBearingRunForbidden: true,
      runtimeFallbackForbidden: true,
      estimatedPeakBytesPerWorker: definition.estimatedPeakBytesPerWorker,
      deviceId: resolved.deviceId,
    }, contract);
  }));
}

export function hw2CandidateDefinitions() {
  return immutableJsonClone(DEFINITIONS);
}
