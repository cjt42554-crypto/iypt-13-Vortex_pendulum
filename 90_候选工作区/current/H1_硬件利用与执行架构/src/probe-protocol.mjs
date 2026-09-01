import { canonicalSha256, immutableJsonClone } from "./canonical.mjs";
import { ACTIVE_CONTRACT_SHA256, assertActiveContract } from "./contract.mjs";
import { assertResultBlind } from "./provenance.mjs";

function fail(code, message) {
  throw new Error(`${code}: ${message}`);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function coefficientOfVariation(values) {
  const average = mean(values);
  const variance = mean(values.map((value) => (value - average) ** 2));
  return Math.sqrt(variance) / average;
}

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function finiteNonnegative(value, label) {
  if (!Number.isFinite(value) || value < 0) fail("NO-GO-HW1-PROBE-INPUT", `${label} is invalid`);
}

function fraction(value, label) {
  finiteNonnegative(value, label);
  if (value > 1) fail("NO-GO-HW1-PROBE-INPUT", `${label} exceeds one`);
}

function isGpuClass(candidateClass) {
  return candidateClass === "gpu-compute" || candidateClass === "cpu-gpu-hybrid";
}

function hash(value, label) {
  if (!/^[0-9a-f]{64}$/u.test(value)) fail("NO-GO-HW1-PROBE-INPUT", `${label} is invalid`);
}

export function evaluateProbeCandidate({ baseline, candidate }, contract) {
  assertActiveContract(contract);
  if (baseline.classification !== "synthetic-result-blind-probe") {
    fail("NO-GO-HW1-SCIENTIFIC-FIELD-LEAK", "baseline is not synthetic result-blind data");
  }
  if (candidate.classification !== "synthetic-result-blind-probe") {
    fail("NO-GO-HW1-SCIENTIFIC-FIELD-LEAK", "candidate is not synthetic result-blind data");
  }
  assertResultBlind({baseline, candidate}, contract);
  for (const [value, label] of [
    [baseline.contractHash, "baseline.contractHash"],
    [baseline.sourceHash, "baseline.sourceHash"],
    [candidate.contractHash, "candidate.contractHash"],
    [candidate.sourceHash, "candidate.sourceHash"],
    [candidate.dependencyHash, "candidate.dependencyHash"],
    [candidate.implementationHash, "candidate.implementationHash"],
    [candidate.environmentHash, "candidate.environmentHash"],
  ]) hash(value, label);
  if (baseline.contractHash !== ACTIVE_CONTRACT_SHA256 || candidate.contractHash !== ACTIVE_CONTRACT_SHA256) {
    fail("NO-GO-HW1-PROBE-INPUT", "probe contract hash is not active H1 v2");
  }
  if (baseline.sourceHash !== candidate.sourceHash) {
    fail("NO-GO-HW1-PROBE-INPUT", "baseline and candidate source hashes differ");
  }
  for (const [value, label] of [
    [candidate.backendId, "backendId"],
    [candidate.schedulerId, "schedulerId"],
    [candidate.deviceId, "deviceId"],
  ]) {
    if (typeof value !== "string" || value.length === 0) {
      fail("NO-GO-HW1-PROBE-INPUT", `${label} is invalid`);
    }
  }
  if (!contract.candidateClasses.includes(candidate.candidateClass)) {
    fail("NO-GO-HW1-PROBE-INPUT", "candidateClass is unknown");
  }
  if (!Array.isArray(baseline.repeats) || baseline.repeats.length < contract.probe.validRepeatsMinimum) {
    fail("NO-GO-HW1-PROBE-INPUT", "baseline has too few repeats");
  }
  if (!Array.isArray(candidate.repeats) || candidate.repeats.length < contract.probe.validRepeatsMinimum) {
    fail("NO-GO-HW1-PROBE-INPUT", "candidate has too few repeats");
  }
  const reasons = [];
  finiteNonnegative(baseline.workUnitsMillion, "baseline.workUnitsMillion");
  finiteNonnegative(candidate.workUnitsMillion, "candidate.workUnitsMillion");
  if (baseline.workUnitsMillion <= 0 || candidate.workUnitsMillion <= 0) {
    fail("NO-GO-HW1-PROBE-INPUT", "workUnitsMillion must be positive");
  }
  if (baseline.workUnitsMillion !== candidate.workUnitsMillion) {
    fail("NO-GO-HW1-PROBE-INPUT", "baseline and candidate workloads differ");
  }
  const baselineTimes = baseline.repeats.map((repeat) => repeat.wallTimeSeconds);
  const candidateTimes = candidate.repeats.map((repeat) => repeat.wallTimeSeconds);
  for (const [label, values] of [["baseline", baselineTimes], ["candidate", candidateTimes]]) {
    for (const value of values) {
      finiteNonnegative(value, `${label}.wallTimeSeconds`);
      if (
        value < contract.probe.timedWindowSecondsMinimum ||
        value > contract.probe.timedWindowSecondsMaximum
      ) reasons.push(`${label.toUpperCase()}_TIMED_WINDOW_OUT_OF_RANGE`);
    }
  }
  const baselineMean = mean(baselineTimes);
  const candidateMean = mean(candidateTimes);
  const baselineCv = coefficientOfVariation(baselineTimes);
  const baselineSlowestFastestRatio = Math.max(...baselineTimes) / Math.min(...baselineTimes);
  const repeatCv = coefficientOfVariation(candidateTimes);
  const slowestFastestRatio = Math.max(...candidateTimes) / Math.min(...candidateTimes);
  if (!Number.isFinite(candidate.resourceUnits) || candidate.resourceUnits < 1) {
    fail("NO-GO-HW1-PROBE-INPUT", "resourceUnits must be positive");
  }
  const speedup = baselineMean / candidateMean;
  const throughputMlups = candidate.workUnitsMillion / candidateMean;
  const parallelEfficiency = speedup / candidate.resourceUnits;
  for (const [value, label] of [
    [candidate.workUnitsMillion, "workUnitsMillion"],
    [candidate.resourceUnits, "resourceUnits"],
    [throughputMlups, "throughputMlups"],
  ]) finiteNonnegative(value, label);
  if (baselineCv > contract.gates.repeatWallTimeCvMaximum) reasons.push("BASELINE_REPEAT_CV_GATE");
  if (baselineSlowestFastestRatio > contract.gates.repeatSlowestFastestRatioMaximum) {
    reasons.push("BASELINE_REPEAT_RATIO_GATE");
  }
  if (repeatCv > contract.gates.repeatWallTimeCvMaximum) reasons.push("REPEAT_CV_GATE");
  if (slowestFastestRatio > contract.gates.repeatSlowestFastestRatioMaximum) reasons.push("REPEAT_RATIO_GATE");
  if (speedup < contract.gates.speedupMinimum) reasons.push("SPEEDUP_GATE");
  if (candidate.correctnessPass !== true) reasons.push("CORRECTNESS_GATE");
  if (candidate.environmentComparable !== true) reasons.push("ENVIRONMENT_COMPARABILITY_GATE");

  const reserveBytes = Math.max(
    contract.gates.systemReserveBytesMinimum,
    Math.ceil(contract.gates.systemReserveMemTotalFraction * candidate.memTotalBytes),
  );
  for (const [index, repeat] of candidate.repeats.entries()) {
    for (const key of [
      "rssBytes",
      "memAvailableBytes",
      "swapBytes",
    ]) finiteNonnegative(repeat[key], `repeats[${index}].${key}`);
    for (const key of [
      "cpuUtilizationFraction",
      "memoryBandwidthFraction",
      "gpuBusyFraction",
      "transferFraction",
      "frequencyDropFraction",
    ]) fraction(repeat[key], `repeats[${index}].${key}`);
    for (const key of ["max", "oom", "oomKill"]) {
      finiteNonnegative(repeat.memoryEventsDelta?.[key], `repeats[${index}].memoryEventsDelta.${key}`);
      if (!Number.isSafeInteger(repeat.memoryEventsDelta[key])) {
        fail("NO-GO-HW1-PROBE-INPUT", `repeats[${index}].memoryEventsDelta.${key} is not an integer`);
      }
    }
    if (typeof repeat.thermalThrottle !== "boolean") {
      fail("NO-GO-HW1-PROBE-INPUT", `repeats[${index}].thermalThrottle is invalid`);
    }
    if (!Number.isSafeInteger(repeat.exitCode) || repeat.exitCode < 0) {
      fail("NO-GO-HW1-PROBE-INPUT", `repeats[${index}].exitCode is invalid`);
    }
    if (repeat.signal !== null && typeof repeat.signal !== "string") {
      fail("NO-GO-HW1-PROBE-INPUT", `repeats[${index}].signal is invalid`);
    }
    if (repeat.exitCode !== 0 || repeat.signal !== null) reasons.push("EXECUTION_FAILURE_GATE");
  }
  for (const [value, label] of [
    [candidate.memTotalBytes, "memTotalBytes"],
    [candidate.baselineSwapBytes, "baselineSwapBytes"],
    [candidate.cgroupLimitBytes, "cgroupLimitBytes"],
    [candidate.soakThroughputDegradationFraction, "soakThroughputDegradationFraction"],
    [candidate.additionalCpuGainAtBandwidthSaturation, "additionalCpuGainAtBandwidthSaturation"],
  ]) finiteNonnegative(value, label);
  fraction(candidate.soakThroughputDegradationFraction, "soakThroughputDegradationFraction");
  fraction(candidate.additionalCpuGainAtBandwidthSaturation, "additionalCpuGainAtBandwidthSaturation");
  if (typeof candidate.correctnessPass !== "boolean") {
    fail("NO-GO-HW1-PROBE-INPUT", "correctnessPass is invalid");
  }
  if (typeof candidate.environmentComparable !== "boolean") {
    fail("NO-GO-HW1-PROBE-INPUT", "environmentComparable is invalid");
  }
  if (typeof candidate.cpuFeedSingleThreadBottleneck !== "boolean") {
    fail("NO-GO-HW1-PROBE-INPUT", "cpuFeedSingleThreadBottleneck is invalid");
  }
  if (typeof candidate.runtimeFallbackOccurred !== "boolean") {
    fail("NO-GO-HW1-PROBE-INPUT", "runtimeFallbackOccurred is invalid");
  }
  if (candidate.runtimeFallbackOccurred) reasons.push("RUNTIME_FALLBACK_GATE");
  const cpuUtilizationFraction = mean(candidate.repeats.map((repeat) => repeat.cpuUtilizationFraction));
  const memoryBandwidthFraction = mean(candidate.repeats.map((repeat) => repeat.memoryBandwidthFraction));
  const gpuBusyFraction = median(candidate.repeats.map((repeat) => repeat.gpuBusyFraction));
  const transferFraction = mean(candidate.repeats.map((repeat) => repeat.transferFraction));
  const rssBytes = Math.max(...candidate.repeats.map((repeat) => repeat.rssBytes));
  const memAvailableBytes = Math.min(...candidate.repeats.map((repeat) => repeat.memAvailableBytes));
  const swapBytes = Math.max(...candidate.repeats.map((repeat) => repeat.swapBytes));
  const memoryEventsDelta = {
    max: Math.max(...candidate.repeats.map((repeat) => repeat.memoryEventsDelta.max)),
    oom: Math.max(...candidate.repeats.map((repeat) => repeat.memoryEventsDelta.oom)),
    oomKill: Math.max(...candidate.repeats.map((repeat) => repeat.memoryEventsDelta.oomKill)),
  };
  const thermalThrottle = candidate.repeats.some((repeat) => repeat.thermalThrottle === true);
  const frequencyDropFraction = Math.max(...candidate.repeats.map((repeat) => repeat.frequencyDropFraction));
  if (memAvailableBytes <= reserveBytes) reasons.push("MEMORY_RESERVE_GATE");
  if (swapBytes > candidate.baselineSwapBytes + contract.gates.swapGrowthMaximumBytes) reasons.push("SWAP_GROWTH_GATE");
  if (
    memoryEventsDelta.max > 0 ||
    memoryEventsDelta.oom > contract.gates.oomEventGrowthMaximum ||
    memoryEventsDelta.oomKill > contract.gates.oomEventGrowthMaximum
  ) reasons.push("MEMORY_EVENT_GATE");
  if (rssBytes * (1 + contract.gates.candidateHeadroomFraction) >= candidate.cgroupLimitBytes) {
    reasons.push("CGROUP_HEADROOM_GATE");
  }
  if (thermalThrottle || frequencyDropFraction > contract.gates.frequencyDropFractionMaximum) {
    reasons.push("THERMAL_GATE");
  }
  if (candidate.soakThroughputDegradationFraction > contract.gates.soakThroughputDegradationMaximum) {
    reasons.push("SOAK_DEGRADATION_GATE");
  }

  if (isGpuClass(candidate.candidateClass)) {
    if (gpuBusyFraction < contract.gates.gpuBusyMedianFractionMinimum) reasons.push("GPU_BUSY_GATE");
    if (transferFraction > contract.gates.gpuTransferSyncSerializationFractionMaximum) {
      reasons.push("GPU_TRANSFER_GATE");
    }
    if (candidate.cpuFeedSingleThreadBottleneck === true) reasons.push("GPU_CPU_FEED_GATE");
  } else {
    const bandwidthBound =
      memoryBandwidthFraction >= contract.gates.memoryBandwidthFractionMinimum &&
      candidate.additionalCpuGainAtBandwidthSaturation <=
        contract.gates.additionalCpuGainAtBandwidthSaturationMaximum;
    if (!bandwidthBound && parallelEfficiency < contract.gates.cpuParallelEfficiencyMinimum) {
      reasons.push("CPU_PARALLEL_EFFICIENCY_GATE");
    }
    if (
      cpuUtilizationFraction < contract.gates.cpuAssignedUtilizationFractionMinimum &&
      !bandwidthBound
    ) reasons.push("CPU_UTILIZATION_GATE");
  }

  const uniqueReasons = [...new Set(reasons)].sort();
  const body = {
    classification: uniqueReasons.length === 0 ? "PROBE_PASS" : "PROBE_NO_GO",
    contractHash: candidate.contractHash,
    sourceHash: candidate.sourceHash,
    dependencyHash: candidate.dependencyHash,
    implementationHash: candidate.implementationHash,
    environmentHash: candidate.environmentHash,
    backendId: candidate.backendId,
    candidateClass: candidate.candidateClass,
    schedulerId: candidate.schedulerId,
    workerCount: candidate.resourceUnits,
    deviceId: candidate.deviceId,
    wallTimeSeconds: candidateMean,
    throughputMlups,
    speedup,
    parallelEfficiency,
    cpuUtilizationFraction,
    memoryBandwidthFraction,
    gpuBusyFraction,
    transferFraction,
    rssBytes,
    memAvailableBytes,
    swapBytes,
    memoryEventsDelta,
    thermalThrottle,
    exitCode: uniqueReasons.includes("EXECUTION_FAILURE_GATE") ? 1 : 0,
    signal: candidate.repeats.find((repeat) => repeat.signal !== null)?.signal ?? null,
    repeatCv,
    slowestFastestRatio,
    reasons: uniqueReasons,
  };
  return immutableJsonClone({...body, resultHash: canonicalSha256(body)});
}

export function validateProbeResult(result, contract) {
  assertActiveContract(contract);
  const expected = [
    "classification",
    "contractHash",
    "sourceHash",
    "dependencyHash",
    "implementationHash",
    "environmentHash",
    "backendId",
    "candidateClass",
    "schedulerId",
    "workerCount",
    "deviceId",
    "wallTimeSeconds",
    "throughputMlups",
    "speedup",
    "parallelEfficiency",
    "cpuUtilizationFraction",
    "memoryBandwidthFraction",
    "gpuBusyFraction",
    "transferFraction",
    "rssBytes",
    "memAvailableBytes",
    "swapBytes",
    "memoryEventsDelta",
    "thermalThrottle",
    "exitCode",
    "signal",
    "repeatCv",
    "slowestFastestRatio",
    "reasons",
    "resultHash",
  ].sort();
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    fail("NO-GO-HW1-PROBE-RESULT", "result is missing");
  }
  if (JSON.stringify(Object.keys(result).sort()) !== JSON.stringify(expected)) {
    fail("NO-GO-HW1-PROBE-RESULT", "result keys differ");
  }
  const {resultHash, ...body} = result;
  if (canonicalSha256(body) !== resultHash) {
    fail("NO-GO-HW1-PROBE-RESULT", `${result.backendId} result hash mismatch`);
  }
  if (!["PROBE_PASS", "PROBE_NO_GO"].includes(result.classification)) {
    fail("NO-GO-HW1-PROBE-RESULT", "classification is invalid");
  }
  for (const key of [
    "contractHash",
    "sourceHash",
    "dependencyHash",
    "implementationHash",
    "environmentHash",
  ]) hash(result[key], `result.${key}`);
  if (result.contractHash !== ACTIVE_CONTRACT_SHA256) {
    fail("NO-GO-HW1-PROBE-RESULT", "result is not bound to active H1 v2");
  }
  if (!contract.candidateClasses.includes(result.candidateClass)) {
    fail("NO-GO-HW1-PROBE-RESULT", "result candidateClass is invalid");
  }
  if (!Array.isArray(result.reasons) || new Set(result.reasons).size !== result.reasons.length) {
    fail("NO-GO-HW1-PROBE-RESULT", "reasons are invalid");
  }
  if (result.classification === "PROBE_PASS" && result.reasons.length !== 0) {
    fail("NO-GO-HW1-PROBE-RESULT", "passing result contains failure reasons");
  }
  if (result.classification === "PROBE_NO_GO" && result.reasons.length === 0) {
    fail("NO-GO-HW1-PROBE-RESULT", "NO-GO result lacks reasons");
  }
  assertResultBlind(result, contract);
  return result;
}

export function selectQualifiedCandidate({ coverage, results }, contract) {
  assertActiveContract(contract);
  if (!Array.isArray(coverage) || !Array.isArray(results)) {
    fail("NO-GO-HW1-CANDIDATE-COVERAGE", "coverage and results are required");
  }
  assertResultBlind({coverage}, contract);
  for (const result of results) validateProbeResult(result, contract);
  if (new Set(results.map((result) => result.contractHash)).size > 1) {
    fail("NO-GO-HW1-PROVENANCE-ALIASING", "probe results mix contract identities");
  }
  if (new Set(results.map((result) => result.sourceHash)).size > 1) {
    fail("NO-GO-HW1-PROVENANCE-ALIASING", "probe results mix source identities");
  }
  for (const candidateClass of contract.candidateClasses) {
    const entries = coverage.filter((entry) => entry.candidateClass === candidateClass);
    if (entries.length === 0) fail("NO-GO-HW1-CANDIDATE-COVERAGE", `missing ${candidateClass}`);
    for (const entry of entries) {
      if (!["PROBED", "STATIC_NO_GO", "DEFERRED_UNSAFE_TO_PROBE"].includes(entry.status)) {
        fail("NO-GO-HW1-CANDIDATE-COVERAGE", `${entry.backendId} is unassessed`);
      }
      if (entry.status === "PROBED") {
        const result = results.find((item) => item.backendId === entry.backendId);
        if (!result) fail("NO-GO-HW1-CANDIDATE-COVERAGE", `${entry.backendId} lacks a probe result`);
        if (result.candidateClass !== entry.candidateClass) {
          fail("NO-GO-HW1-CANDIDATE-COVERAGE", `${entry.backendId} candidateClass drifted`);
        }
      }
    }
  }
  const passed = results.filter((result) => result.classification === "PROBE_PASS");
  if (passed.length === 0) {
    fail("NO-GO-A8R-HW1-HARDWARE-QUALIFICATION", "no candidate passed all frozen gates");
  }
  const best = Math.max(...passed.map((result) => result.throughputMlups));
  const nearBest = passed
    .filter(
      (result) =>
        result.throughputMlups >= best * contract.gates.selectedThroughputFractionOfBestMinimum,
    )
    .sort((a, b) => b.throughputMlups - a.throughputMlups || a.backendId.localeCompare(b.backendId, "en"));
  const selected = nearBest[0];
  const body = {
    classification: "PASS-A8R-HW1-HARDWARE-UTILIZATION-CANDIDATE-SELECTION",
    backendId: selected.backendId,
    throughputMlups: selected.throughputMlups,
    speedup: selected.speedup,
    bestThroughputMlups: best,
    selectedThroughputFractionOfBest: selected.throughputMlups / best,
    runtimeFallbackForbidden: true,
  };
  return immutableJsonClone({...body, selectionHash: canonicalSha256(body)});
}
