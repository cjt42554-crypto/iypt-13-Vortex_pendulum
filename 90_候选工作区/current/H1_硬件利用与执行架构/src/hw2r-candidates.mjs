function bounded(values, maximum) {
  return values.filter((value) => value <= maximum);
}

export function buildHw2rCandidateMatrix(protocol, inventory) {
  const physical = inventory.components.cpu.physicalCoreCount;
  const logical = inventory.components.cpu.logicalCpuCount;
  const physicalCounts = bounded(protocol.candidateMatrix.cpuPhysicalCoreCounts, physical);
  const logicalCounts = bounded(
    protocol.candidateMatrix.cpuLogicalThreadCountsConditional,
    logical,
  ).filter((value) => value > physical);
  const nodeCounts = bounded(protocol.candidateMatrix.nodeWorkerCounts, physical);
  const memorySafeCaseMaximum = Math.min(8, physical);
  const candidates = [];
  for (const count of nodeCounts) {
    candidates.push(Object.freeze({
      candidateId: `hw2r-node-worker-r1-w${String(count).padStart(2, "0")}`,
      classId: "trajectory-process-parallel",
      backendId: "node-process-worker",
      resourceCount: count,
      workloadIds: [
        "HW2R-R1-D54-A8R-OPERATION-GRAPH-SURROGATE-v1",
        "HW2R-R2-EIGHT-CASE-COST-STRUCTURE-SURROGATE-v1",
      ],
      pinning: "unpinned",
    }));
  }
  const caseProcessCounts = [...new Set(
    protocol.candidateMatrix.caseProcessCounts.map((value) =>
      value === "memory-safe-maximum" ? memorySafeCaseMaximum : value),
  )].sort((left, right) => left - right);
  for (const count of caseProcessCounts) {
    candidates.push(Object.freeze({
      candidateId: `hw2r-case-process-r2-p${String(count).padStart(2, "0")}`,
      classId: "trajectory-process-parallel",
      backendId: "fresh-case-process-cost-aware-scheduler",
      resourceCount: count,
      workloadIds: ["HW2R-R2-EIGHT-CASE-COST-STRUCTURE-SURROGATE-v1"],
      pinning: "unpinned",
    }));
  }
  for (const count of [...physicalCounts, ...logicalCounts]) {
    for (const pinning of protocol.candidateMatrix.pinningLayouts) {
      candidates.push(Object.freeze({
        candidateId:
          `hw2r-native-openmp-r1-t${String(count).padStart(2, "0")}-${pinning}`,
        classId: "single-trajectory-cpu-domain-or-thread",
        backendId: "native-openmp-float64",
        resourceCount: count,
        workloadIds: ["HW2R-R1-D54-A8R-OPERATION-GRAPH-SURROGATE-v1"],
        pinning,
      }));
    }
  }
  candidates.push(Object.freeze({
    candidateId: "hw2r-native-simd-r1-avx512",
    classId: "native-or-wasm-simd",
    backendId: "native-openmp-avx512-float64",
    resourceCount: Math.min(physical, 16),
    workloadIds: ["HW2R-R1-D54-A8R-OPERATION-GRAPH-SURROGATE-v1"],
    pinning: "balanced-across-ccd-or-l3",
  }));
  candidates.push(Object.freeze({
    candidateId: "hw2r-gpu-persistent-r1-opencl",
    classId: "gpu-compute",
    backendId: "opencl-persistent-float64",
    resourceCount: 1,
    workloadIds: ["HW2R-R1-D54-A8R-OPERATION-GRAPH-SURROGATE-v1"],
    pinning: "gpu-device-0",
  }));
  for (const fraction of protocol.candidateMatrix.hybridCpuFractions) {
    candidates.push(Object.freeze({
      candidateId: `hw2r-hybrid-r2-cpu-${Math.round(100 * fraction)}`,
      classId: "cpu-gpu-hybrid",
      backendId: "result-blind-cpu-gpu-case-split",
      resourceCount: Math.max(1, Math.round(physical * fraction)),
      workloadIds: ["HW2R-R2-EIGHT-CASE-COST-STRUCTURE-SURROGATE-v1"],
      pinning: "balanced-across-ccd-or-l3",
      cpuFraction: fraction,
    }));
  }
  for (const count of nodeCounts) {
    candidates.push(Object.freeze({
      candidateId: `hw2r-shard-aggregate-w${String(count).padStart(2, "0")}`,
      classId: "data-layout-shard-aggregation",
      backendId: "atomic-shard-deterministic-aggregate",
      resourceCount: count,
      workloadIds: ["HW2R-R2-EIGHT-CASE-COST-STRUCTURE-SURROGATE-v1"],
      pinning: "unpinned",
    }));
  }
  return Object.freeze(candidates);
}

export function assertCompleteCandidateClasses(protocol, candidates) {
  const observed = new Set(candidates.map(({ classId }) => classId));
  const missing = protocol.candidateMatrix.classes.filter((item) => !observed.has(item));
  if (missing.length > 0) {
    throw new Error(`INCONCLUSIVE-HW2R-MEASUREMENT-OR-RESOURCE: missing ${missing.join(",")}`);
  }
  return true;
}
