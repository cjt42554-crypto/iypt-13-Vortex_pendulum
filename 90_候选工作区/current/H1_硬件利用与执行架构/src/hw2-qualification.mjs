import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";

import { buildHw2Native } from "../scripts/build-hw2-native.mjs";
import { canonicalJson, canonicalSha256, immutableJsonClone, sha256 } from "./canonical.mjs";
import { ACTIVE_CONTRACT_SHA256, assertActiveContract } from "./contract.mjs";
import { discoverHw2BackendDescriptors } from "./hw2-candidates.mjs";
import { runJsSyntheticExecution, runJsWarmup } from "./hw2-js-execution.mjs";
import { measureSyntheticExecution, toProbeRepeat } from "./hw2-measurement.mjs";
import { runNativeSyntheticExecution, runNativeWarmup } from "./hw2-native-execution.mjs";
import { assertHw2CommittedPreflight } from "./hw2-preflight.mjs";
import { HW2_PROTOCOL_SHA256, loadHw2Protocol } from "./hw2-protocol.mjs";
import { collectLinuxStaticInventory } from "./linux-host.mjs";
import { buildResultBlindPlan } from "./planner.mjs";
import { evaluateProbeCandidate, selectQualifiedCandidate } from "./probe-protocol.mjs";
import { assertResultBlind } from "./provenance.mjs";
import { HW2_SYNTHETIC_SOURCE_HASH, workUnitsMillion } from "./hw2-workload.mjs";

const AUTHORIZATION = "HW2-RESULT-BLIND-QUALIFICATION-AFTER-COMMIT";
const GiB = 1024 ** 3;
const MiB = 1024 ** 2;

function fail(message) {
  throw new Error(`NO-GO-HW2-QUALIFICATION: ${message}`);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function coefficientOfVariation(values) {
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2))) / average;
}

function environmentHash(inventory) {
  const {cpu, numa, cache, isa, gpu, operatingSystem, kernel, node, v8, compiler, filesystem} = inventory.components;
  return canonicalSha256({cpu, numa, cache, isa, gpu, operatingSystem, kernel, node, v8, compiler, filesystem});
}

function candidateConfigurations(inventory) {
  const physical = inventory.components.cpu.physicalCoreCount;
  const wide = Math.max(2, Math.min(physical, 8));
  const full = Math.max(2, physical);
  return [
    {backendId: "hw2-node-worker-shared-domain-v1-w02", descriptorId: "hw2-node-worker-shared-domain-v1", candidateClass: "trajectory-process-parallel", family: "js", mode: "shared-workers", resourceUnits: 2},
    {backendId: `hw2-node-worker-shared-domain-v1-w${String(wide).padStart(2, "0")}`, descriptorId: "hw2-node-worker-shared-domain-v1", candidateClass: "trajectory-process-parallel", family: "js", mode: "shared-workers", resourceUnits: wide},
    {backendId: "hw2-native-openmp-domain-v1-w02", descriptorId: "hw2-native-openmp-domain-v1", candidateClass: "single-trajectory-cpu-domain-or-thread", family: "native", mode: "threads", resourceUnits: 2},
    {backendId: `hw2-native-openmp-domain-v1-w${String(full).padStart(2, "0")}`, descriptorId: "hw2-native-openmp-domain-v1", candidateClass: "single-trajectory-cpu-domain-or-thread", family: "native", mode: "threads", resourceUnits: full},
    {backendId: "hw2-native-simd-v1", descriptorId: "hw2-native-simd-v1", candidateClass: "native-or-wasm-simd", family: "native", mode: "simd", resourceUnits: 1},
    {backendId: "hw2-cuda-driver-jit-v1", descriptorId: "hw2-cuda-driver-jit-v1", candidateClass: "gpu-compute", family: "native", mode: "gpu", resourceUnits: 1},
    {backendId: "hw2-cpu-cuda-driver-hybrid-v1-w02", descriptorId: "hw2-cpu-cuda-driver-hybrid-v1", candidateClass: "cpu-gpu-hybrid", family: "native", mode: "hybrid", resourceUnits: 3, cpuThreads: 2},
    {backendId: `hw2-cpu-cuda-driver-hybrid-v1-w${String(wide).padStart(2, "0")}`, descriptorId: "hw2-cpu-cuda-driver-hybrid-v1", candidateClass: "cpu-gpu-hybrid", family: "native", mode: "hybrid", resourceUnits: wide + 1, cpuThreads: wide},
    {backendId: "hw2-node-transfer-shard-aggregation-v1-w02", descriptorId: "hw2-node-transfer-shard-aggregation-v1", candidateClass: "data-layout-shard-aggregation", family: "js", mode: "transfer-shards", resourceUnits: 2},
    {backendId: `hw2-node-transfer-shard-aggregation-v1-w${String(wide).padStart(2, "0")}`, descriptorId: "hw2-node-transfer-shard-aggregation-v1", candidateClass: "data-layout-shard-aggregation", family: "js", mode: "transfer-shards", resourceUnits: wide},
  ].filter((item, index, array) => array.findIndex((candidate) => candidate.backendId === item.backendId) === index);
}

async function elapsedSeconds(execute) {
  const started = performance.now();
  const result = await execute();
  return {result, wallTimeSeconds: (performance.now() - started) / 1000};
}

async function calibrateRounds({execute, elements, initialRounds, targetSeconds = 55}) {
  let rounds = initialRounds;
  const observations = [];
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const observation = await elapsedSeconds(() => execute(rounds));
    observations.push({rounds, wallTimeSeconds: observation.wallTimeSeconds});
    if (observation.wallTimeSeconds >= 1.5 && observation.wallTimeSeconds <= 5) break;
    const scale = observation.wallTimeSeconds > 0 ? 2.5 / observation.wallTimeSeconds : 4;
    rounds = Math.max(1, Math.min(10_000_000, Math.round(rounds * Math.max(0.25, Math.min(16, scale)))));
  }
  const latest = observations.at(-1);
  const targetRounds = Math.max(1, Math.min(10_000_000, Math.round(latest.rounds * targetSeconds / latest.wallTimeSeconds)));
  return {elements, rounds: targetRounds, targetSeconds, observations};
}

async function calibrateBandwidth({binaryPath, threads}) {
  const elements = 16 * 1024 * 1024;
  const execute = (rounds) => runNativeSyntheticExecution({
    binaryPath, mode: "bandwidth", elements, rounds, threads,
  });
  const calibration = await calibrateRounds({execute, elements, initialRounds: 8, targetSeconds: 15});
  const repeats = [];
  for (let index = 0; index < 3; index += 1) {
    const measured = await elapsedSeconds(() => execute(calibration.rounds));
    repeats.push({
      wallTimeSeconds: measured.wallTimeSeconds,
      bytesPerSecond: elements * calibration.rounds * 12 / measured.wallTimeSeconds,
    });
  }
  return {
    ...calibration,
    threads,
    repeats,
    sustainableBandwidthBytesPerSecond: Math.min(...repeats.map((repeat) => repeat.bytesPerSecond)),
  };
}

async function familyExecutor({family, mode, binaryPath, elements, rounds, resourceUnits, cpuThreads}) {
  if (family === "js") {
    return runJsSyntheticExecution({mode, elements, rounds, workers: resourceUnits});
  }
  return runNativeSyntheticExecution({
    binaryPath,
    mode,
    elements,
    rounds,
    threads: cpuThreads ?? resourceUnits,
  });
}

async function warmup({family, mode, binaryPath, resourceUnits, cpuThreads, steps}) {
  if (family === "js") return runJsWarmup({mode, workers: resourceUnits, warmupSteps: steps});
  return runNativeWarmup({
    binaryPath,
    mode,
    threads: cpuThreads ?? resourceUnits,
    warmupSteps: steps,
  });
}

async function formalRepeats({execute, warm, expectedDigest, resourceUnits, elements, sustainableBandwidth, contract}) {
  const repeats = [];
  const internal = [];
  for (let index = 0; index < contract.probe.validRepeatsMinimum; index += 1) {
    await warm();
    const measurement = await measureSyntheticExecution({
      execute,
      expectedDigest,
      resourceUnits,
      estimatedBytesMoved: elements * Uint32Array.BYTES_PER_ELEMENT,
      sustainableBandwidthBytesPerSecond: sustainableBandwidth,
    });
    repeats.push(toProbeRepeat(measurement));
    internal.push({correctnessPass: measurement.correctnessPass, digest: measurement.digest});
  }
  return {repeats, internal};
}

function soakDegradation(repeats) {
  const firstThroughput = 1 / repeats[0].wallTimeSeconds;
  const lastThroughput = 1 / repeats.at(-1).wallTimeSeconds;
  return Math.max(0, (firstThroughput - lastThroughput) / firstThroughput);
}

function expandDescriptors(descriptors, configurations, contract) {
  const byId = new Map(descriptors.map((descriptor) => [descriptor.backendId, descriptor]));
  return configurations.map((configuration) => {
    const source = byId.get(configuration.descriptorId);
    if (!source) fail(`descriptor ${configuration.descriptorId} is missing`);
    return {
      ...source,
      backendId: configuration.backendId,
      estimatedPeakBytesPerWorker: Math.max(64 * MiB, Math.ceil(source.estimatedPeakBytesPerWorker /
        Math.max(1, configuration.resourceUnits))),
    };
  });
}

export async function runHw2Qualification({repoRoot, authorization, contract}) {
  assertActiveContract(contract);
  if (authorization !== AUTHORIZATION) fail("explicit committed-code authorization token is missing");
  const preflight = await assertHw2CommittedPreflight({repoRoot});
  const protocol = await loadHw2Protocol();
  const inventory = await collectLinuxStaticInventory({}, contract);
  if (inventory.components.cgroup.memoryLimitRaw === "max") {
    fail("qualification must run in a dedicated finite-memory cgroup scope");
  }
  const reserve = Math.max(4 * GiB, Math.ceil(0.25 * inventory.components.memory.memTotalBytes));
  if (inventory.components.memory.memAvailableBytes <= reserve) fail("static memory reserve is not available");
  const staticDescriptors = discoverHw2BackendDescriptors(inventory, contract);
  const configurations = candidateConfigurations(inventory);
  const descriptors = expandDescriptors(staticDescriptors, configurations, contract);
  const plan = buildResultBlindPlan({inventory, backends: descriptors, schedulerId: "hw2-bounded-runner-v1"}, contract);
  const buildDirectory = await mkdtemp(join(os.tmpdir(), "iypt13-hw2-native-"));
  try {
    const binaryPath = await buildHw2Native({outputPath: join(buildDirectory, "hw2-synthetic-probe")});
    const bandwidth = await calibrateBandwidth({binaryPath, threads: inventory.components.cpu.physicalCoreCount});
    const familyPlans = {};
    for (const family of ["native", "js"]) {
      const elements = family === "native" ? 1_048_576 : 262_144;
      const mode = family === "native" ? "scalar" : "serial";
      const execute = (rounds) => familyExecutor({
        family, mode, binaryPath, elements, rounds, resourceUnits: 1,
      });
      familyPlans[family] = await calibrateRounds({
        execute,
        elements,
        initialRounds: family === "native" ? 256 : 32,
        targetSeconds: 55,
      });
    }
    const baselines = {};
    for (const family of ["native", "js"]) {
      const familyPlan = familyPlans[family];
      const mode = family === "native" ? "scalar" : "serial";
      const execute = () => familyExecutor({
        family, mode, binaryPath, elements: familyPlan.elements, rounds: familyPlan.rounds, resourceUnits: 1,
      });
      const warm = () => warmup({family, mode, binaryPath, resourceUnits: 1, steps: contract.probe.warmupStepsMinimum});
      await warm();
      const reference = await execute();
      const measured = await formalRepeats({
        execute,
        warm,
        expectedDigest: reference.digest,
        resourceUnits: 1,
        elements: familyPlan.elements,
        sustainableBandwidth: bandwidth.sustainableBandwidthBytesPerSecond,
        contract,
      });
      baselines[family] = {
        classification: "synthetic-result-blind-probe",
        contractHash: ACTIVE_CONTRACT_SHA256,
        sourceHash: HW2_SYNTHETIC_SOURCE_HASH,
        workUnitsMillion: workUnitsMillion(familyPlan.elements, familyPlan.rounds),
        repeats: measured.repeats,
        expectedDigest: reference.digest,
        correctnessPass: measured.internal.every((item) => item.correctnessPass),
      };
    }
    const envHash = environmentHash(inventory);
    const results = [];
    const coverage = [];
    const observations = [];
    const probeInputs = [];
    for (const configuration of configurations) {
      const planned = plan.candidates.find((candidate) => candidate.backendId === configuration.backendId);
      if (!planned || planned.availability !== "AVAILABLE") {
        coverage.push({
          backendId: configuration.backendId,
          candidateClass: configuration.candidateClass,
          status: planned?.availability ?? "STATIC_NO_GO",
        });
        continue;
      }
      const familyPlan = familyPlans[configuration.family];
      const baseline = baselines[configuration.family];
      const execute = () => familyExecutor({
        ...configuration,
        binaryPath,
        elements: familyPlan.elements,
        rounds: familyPlan.rounds,
      });
      const warm = () => warmup({
        ...configuration,
        binaryPath,
        steps: contract.probe.warmupStepsMinimum,
      });
      try {
        const measured = await formalRepeats({
          execute,
          warm,
          expectedDigest: baseline.expectedDigest,
          resourceUnits: configuration.resourceUnits,
          elements: familyPlan.elements,
          sustainableBandwidth: bandwidth.sustainableBandwidthBytesPerSecond,
          contract,
        });
        const candidate = {
          classification: "synthetic-result-blind-probe",
          contractHash: ACTIVE_CONTRACT_SHA256,
          sourceHash: HW2_SYNTHETIC_SOURCE_HASH,
          dependencyHash: preflight.dependencyHash,
          implementationHash: preflight.implementationHash,
          environmentHash: envHash,
          backendId: configuration.backendId,
          candidateClass: configuration.candidateClass,
          schedulerId: "hw2-bounded-runner-v1",
          deviceId: planned.deviceId,
          repeats: measured.repeats,
          workUnitsMillion: baseline.workUnitsMillion,
          resourceUnits: configuration.resourceUnits,
          correctnessPass: measured.internal.every((item) => item.correctnessPass),
          environmentComparable: true,
          memTotalBytes: inventory.components.memory.memTotalBytes,
          baselineSwapBytes: inventory.components.swap.usedBytes,
          cgroupLimitBytes: inventory.components.cgroup.memoryLimitBytes,
          soakThroughputDegradationFraction: soakDegradation(measured.repeats),
          additionalCpuGainAtBandwidthSaturation: 1,
          cpuFeedSingleThreadBottleneck: configuration.candidateClass === "gpu-compute" || configuration.candidateClass === "cpu-gpu-hybrid"
            ? mean(measured.repeats.map((repeat) => repeat.gpuBusyFraction)) < contract.gates.gpuBusyMedianFractionMinimum
            : false,
          runtimeFallbackOccurred: false,
        };
        probeInputs.push(candidate);
        const result = evaluateProbeCandidate({baseline, candidate}, contract);
        results.push(result);
        coverage.push({backendId: configuration.backendId, candidateClass: configuration.candidateClass, status: "PROBED"});
        observations.push({
          backendId: configuration.backendId,
          classification: result.classification,
          correctnessPass: candidate.correctnessPass,
          repeatDigestEquality: new Set(measured.internal.map((item) => item.digest)).size === 1,
          repeatDigests: measured.internal.map((item) => item.digest),
          repeatWallTimeCv: coefficientOfVariation(measured.repeats.map((repeat) => repeat.wallTimeSeconds)),
        });
      } catch (error) {
        const message = String(error?.message ?? error);
        const runtimeCapabilityNoGo = /(?:CUDA|libcuda|cuModule|cuDevice|native child failed)/iu.test(message) &&
          (configuration.candidateClass === "gpu-compute" || configuration.candidateClass === "cpu-gpu-hybrid");
        coverage.push({
          backendId: configuration.backendId,
          candidateClass: configuration.candidateClass,
          status: runtimeCapabilityNoGo ? "STATIC_NO_GO" : "PROBE_EXECUTION_FAILED",
          staticReason: runtimeCapabilityNoGo ? "COMPUTE_API_RUNTIME_SELF_TEST_FAILED" : null,
        });
        observations.push({
          backendId: configuration.backendId,
          classification: runtimeCapabilityNoGo ? "STATIC_NO_GO_RUNTIME_DISCOVERY" : "PROBE_EXECUTION_FAILED",
          failure: message,
        });
      }
    }
    let selection = null;
    let overallClassification = "NO-GO-A8R-HW1-HARDWARE-QUALIFICATION";
    try {
      selection = selectQualifiedCandidate({coverage, results}, contract);
      overallClassification = "PASS-A8R-HW1-HARDWARE-UTILIZATION-CANDIDATE-ONLY";
    } catch (error) {
      observations.push({
        backendId: "selection",
        classification: "NO_GO_SELECTION",
        failureCode: "NO-GO-A8R-HW1-HARDWARE-QUALIFICATION",
        failureMessageHash: canonicalSha256({message: String(error?.message ?? error)}),
      });
    }
    const body = {
      schemaVersion: "VP-HW2-QUALIFICATION-EVIDENCE-v1",
      classification: overallClassification,
      contractHash: ACTIVE_CONTRACT_SHA256,
      protocolHash: HW2_PROTOCOL_SHA256,
      sourceHash: HW2_SYNTHETIC_SOURCE_HASH,
      dependencyHash: preflight.dependencyHash,
      implementationHash: preflight.implementationHash,
      environmentHash: envHash,
      sourceCommit: preflight.sourceCommit,
      fullResultBearingRunPerformed: false,
      scientificPayloadInspected: false,
      canonicalA8rArtifactWritten: false,
      preflight,
      protocol,
      inventory,
      plan,
      calibration: {bandwidth, families: familyPlans},
      baselines,
      coverage,
      probeInputs,
      results,
      observations,
      selection,
    };
    assertResultBlind(body, contract);
    return immutableJsonClone({...body, evidenceHash: canonicalSha256(body)});
  } finally {
    await rm(buildDirectory, {recursive: true, force: true});
  }
}

export async function writeHw2Evidence({evidence, outputPath}) {
  const path = resolve(outputPath);
  await mkdir(dirname(path), {recursive: true});
  const bytes = Buffer.from(`${canonicalJson(evidence)}\n`, "utf8");
  await writeFile(path, bytes, {flag: "wx"});
  const digest = sha256(bytes);
  await writeFile(`${path}.sha256`, `${digest}  ${path.split("/").at(-1)}\n`, {flag: "wx"});
  const reread = await readFile(path);
  if (sha256(reread) !== digest) fail("evidence reread hash mismatch");
  return {path, sha256: digest, sidecarPath: `${path}.sha256`};
}

export function hw2AuthorizationToken() {
  return AUTHORIZATION;
}
