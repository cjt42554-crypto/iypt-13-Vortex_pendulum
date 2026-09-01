import { canonicalSha256, immutableJsonClone } from "./canonical.mjs";
import { assertActiveContract } from "./contract.mjs";
import { assertResultBlind } from "./provenance.mjs";

function fail(message) {
  throw new Error(`NO-GO-HW1-INVENTORY: ${message}`);
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) fail(`${label} must be a positive safe integer`);
}

export function validateInventorySnapshot(snapshot, contract) {
  assertActiveContract(contract);
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) fail("snapshot is missing");
  const keys = Object.keys(snapshot).sort();
  const expectedKeys = [
    "schemaVersion",
    "classification",
    "observedAt",
    "mutationPerformed",
    "components",
    "inventoryHash",
  ].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) fail("snapshot keys differ");
  if (snapshot.schemaVersion !== "VP-H1-STATIC-INVENTORY-v1") fail("schemaVersion mismatch");
  if (snapshot.classification !== "result-blind-static-inventory") fail("classification mismatch");
  if (Number.isNaN(Date.parse(snapshot.observedAt))) fail("observedAt is invalid");
  if (snapshot.mutationPerformed !== false) fail("inventory mutation is forbidden");
  if (!snapshot.components || typeof snapshot.components !== "object" || Array.isArray(snapshot.components)) {
    fail("components are missing");
  }
  const componentKeys = Object.keys(snapshot.components).sort();
  const required = [...contract.inventory.required].sort();
  if (JSON.stringify(componentKeys) !== JSON.stringify(required)) {
    fail(`inventory components differ: ${componentKeys.join(",")}`);
  }
  const {cpu, memory, cgroup, swap, gpu} = snapshot.components;
  positiveInteger(cpu.logicalCpuCount, "cpu.logicalCpuCount");
  positiveInteger(cpu.physicalCoreCount, "cpu.physicalCoreCount");
  positiveInteger(cpu.socketCount, "cpu.socketCount");
  positiveInteger(memory.memTotalBytes, "memory.memTotalBytes");
  positiveInteger(memory.memAvailableBytes, "memory.memAvailableBytes");
  if (memory.memAvailableBytes > memory.memTotalBytes) fail("MemAvailable exceeds MemTotal");
  positiveInteger(cgroup.memoryLimitBytes, "cgroup.memoryLimitBytes");
  if (!Number.isSafeInteger(cgroup.memoryCurrentBytes) || cgroup.memoryCurrentBytes < 0) {
    fail("cgroup.memoryCurrentBytes is invalid");
  }
  for (const key of ["max", "oom", "oomKill"]) {
    if (!Number.isSafeInteger(cgroup.memoryEvents[key]) || cgroup.memoryEvents[key] < 0) {
      fail(`cgroup.memoryEvents.${key} is invalid`);
    }
  }
  if (!Number.isSafeInteger(swap.usedBytes) || swap.usedBytes < 0) fail("swap.usedBytes is invalid");
  if (!Array.isArray(gpu.devices)) fail("gpu.devices must be an array");
  const deviceIds = gpu.devices.map((device) => device.deviceId);
  if (new Set(deviceIds).size !== deviceIds.length) fail("GPU device IDs are duplicated");
  assertResultBlind(snapshot, contract);
  const {inventoryHash, ...body} = snapshot;
  if (canonicalSha256(body) !== inventoryHash) fail("inventoryHash mismatch");
  return snapshot;
}

export async function collectStaticInventory({ observedAt, providers }, contract) {
  assertActiveContract(contract);
  if (!providers || typeof providers !== "object") fail("providers are missing");
  const resolved = {};
  for (const name of contract.inventory.required) {
    if (!(name in providers)) fail(`provider ${name} is missing`);
    resolved[name] = typeof providers[name] === "function"
      ? await providers[name]()
      : await providers[name];
  }
  for (const forbidden of ["mutate", "kill", "reset", "dropCaches", "setAffinity", "setPowerPolicy"]) {
    if (forbidden in providers) fail(`mutation provider ${forbidden} is forbidden`);
  }
  return buildInventorySnapshot({observedAt, providers: resolved}, contract);
}

export function buildInventorySnapshot({ observedAt, providers }, contract) {
  assertActiveContract(contract);
  if (!providers || typeof providers !== "object") fail("providers are missing");
  const forbiddenProviderNames = ["mutate", "kill", "reset", "dropCaches", "setAffinity", "setPowerPolicy"];
  for (const name of forbiddenProviderNames) {
    if (name in providers) fail(`mutation provider ${name} is forbidden`);
  }
  const components = {};
  for (const name of contract.inventory.required) {
    if (!(name in providers)) fail(`provider ${name} is missing`);
    const value = typeof providers[name] === "function" ? providers[name]() : providers[name];
    if (value instanceof Promise) fail(`provider ${name} must be resolved before snapshot construction`);
    components[name] = value;
  }
  const body = {
    schemaVersion: "VP-H1-STATIC-INVENTORY-v1",
    classification: "result-blind-static-inventory",
    observedAt,
    mutationPerformed: false,
    components,
  };
  const snapshot = immutableJsonClone({...body, inventoryHash: canonicalSha256(body)});
  validateInventorySnapshot(snapshot, contract);
  return snapshot;
}
