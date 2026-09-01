import assert from "node:assert/strict";
import test from "node:test";

import { buildInventorySnapshot } from "../src/inventory.mjs";
import { loadActiveContract } from "../src/contract.mjs";
import { discoverHw2BackendDescriptors, hw2CandidateDefinitions } from "../src/hw2-candidates.mjs";
import { partitionRanges } from "../src/hw2-js-execution.mjs";
import { HW2_PROTOCOL_SHA256, loadHw2Protocol } from "../src/hw2-protocol.mjs";
import {
  HW2_SYNTHETIC_SOURCE_HASH,
  digestU32Population,
  fillSyntheticRange,
  seedU32,
  stepU32,
  workUnitsMillion,
} from "../src/hw2-workload.mjs";
import { parseKeyValueLines, parseLscpuJson, parseMeminfo, parseMemoryEvents } from "../src/linux-host.mjs";
import { assertResultBlind } from "../src/provenance.mjs";

const contract = await loadActiveContract();
const GiB = 1024 ** 3;

function inventory({gpu = true, gcc = true} = {}) {
  const providers = {
    cpu: {model: "test", socketCount: 1, physicalCoreCount: 8, logicalCpuCount: 16},
    numa: {nodeCount: 1, nodes: [0]},
    cache: {l3Bytes: 32 * 1024 ** 2},
    isa: {flags: ["avx2"], avx2: true, avx512: false, fma: true},
    memory: {memTotalBytes: 32 * GiB, memAvailableBytes: 24 * GiB},
    cgroup: {memoryLimitBytes: 16 * GiB, memoryCurrentBytes: 1 * GiB, memoryEvents: {max: 0, oom: 0, oomKill: 0}},
    swap: {usedBytes: 0, totalBytes: 4 * GiB},
    gpu: {
      cudaDriverLibraryPresent: gpu,
      devices: gpu ? [{deviceId: "GPU-test", accessible: true, foreignProcessPresent: false}] : [],
    },
    operatingSystem: {name: "test", version: "1"},
    kernel: {release: "test"},
    node: {version: process.version},
    v8: {version: process.versions.v8},
    compiler: {identity: gcc ? "gcc" : "none", gcc: {available: gcc}, openmpCandidate: gcc},
    filesystem: {temporaryDeviceId: "1", mountIdentity: "test"},
    thermalProxy: {available: true, throttled: false, frequencyReadable: true},
  };
  return buildInventorySnapshot({observedAt: "2026-09-01T00:00:00Z", providers}, contract);
}

test("Linux parsers retain exact byte counts and cgroup event identities", () => {
  const meminfo = parseMeminfo([
    "MemTotal:       1024 kB",
    "MemAvailable:    768 kB",
    "SwapTotal:       512 kB",
    "SwapFree:        500 kB",
  ].join("\n"));
  assert.equal(meminfo.MemTotal, 1024 ** 2);
  assert.equal(meminfo.SwapTotal - meminfo.SwapFree, 12 * 1024);
  assert.deepEqual(parseMemoryEvents("low 3\nmax 4\noom 5\noom_kill 6\n"), {max: 4, oom: 5, oomKill: 6});
  assert.deepEqual(parseKeyValueLines('NAME="Ubuntu"\nVERSION_ID="24.04"\n'), {NAME: "Ubuntu", VERSION_ID: "24.04"});
  assert.deepEqual(parseLscpuJson('{"lscpu":[{"field":"CPU(s):","data":"16"}]}'), {"CPU(s)": "16"});
});

test("fixed synthetic u32 workload has stable exact population bytes", () => {
  const first = seedU32(0);
  assert.equal(first, 33350994);
  assert.equal(stepU32(first, 0), 3783739754);
  const population = new Uint32Array(8);
  fillSyntheticRange({target: population, count: population.length, rounds: 32});
  assert.equal(digestU32Population(population), "12b5c8dfebeca14444d29b375e4084d5aaf3d6cfeaadf60308486f060582db2d");
  assert.match(HW2_SYNTHETIC_SOURCE_HASH, /^[0-9a-f]{64}$/u);
  assert.equal(workUnitsMillion(1000, 1000), 1);
});

test("worker partitioning covers every element once without overlap", () => {
  const ranges = partitionRanges(11, 4);
  assert.deepEqual(ranges.map(({globalOffset, count}) => [globalOffset, count]), [[0, 3], [3, 3], [6, 3], [9, 2]]);
  assert.equal(ranges.reduce((sum, range) => sum + range.count, 0), 11);
  assert.throws(() => partitionRanges(2, 3), /workers exceed elements/u);
});

test("static discovery covers six classes and fails closed on absent GPU or compiler", () => {
  const available = discoverHw2BackendDescriptors(inventory(), contract);
  assert.equal(available.length, 6);
  assert.deepEqual(new Set(available.map((item) => item.candidateClass)), new Set(contract.candidateClasses));
  assert.equal(available.every((item) => item.availability === "AVAILABLE"), true);
  assert.equal(hw2CandidateDefinitions().length, 6);

  const unavailable = discoverHw2BackendDescriptors(inventory({gpu: false, gcc: false}), contract);
  assert.equal(unavailable.find((item) => item.candidateClass === "gpu-compute").availability, "STATIC_NO_GO");
  assert.equal(unavailable.find((item) => item.candidateClass === "single-trajectory-cpu-domain-or-thread").availability, "STATIC_NO_GO");
});

test("result-blind hardware codes are narrowly allowed while scientific codes remain rejected", () => {
  for (const classification of [
    "PASS-A8R-HW1-HARDWARE-UTILIZATION-CANDIDATE-SELECTION",
    "PASS-A8R-HW1-HARDWARE-UTILIZATION-CANDIDATE-ONLY",
    "NO-GO-A8R-HW1-HARDWARE-QUALIFICATION",
  ]) assert.equal(assertResultBlind({classification}, contract).classification, classification);
  assert.throws(() => assertResultBlind({classification: "PASS-A8R-SCIENTIFIC"}, contract), /SCIENTIFIC-FIELD-LEAK/u);
});

test("HW2 protocol loader binds exact bytes, workload identity, and PR-2 stop", async () => {
  const protocol = await loadHw2Protocol();
  assert.equal(protocol.syntheticSourceHash, HW2_SYNTHETIC_SOURCE_HASH);
  assert.equal(protocol.selection.stopsAtPr2, true);
  assert.match(HW2_PROTOCOL_SHA256, /^[0-9a-f]{64}$/u);
});
