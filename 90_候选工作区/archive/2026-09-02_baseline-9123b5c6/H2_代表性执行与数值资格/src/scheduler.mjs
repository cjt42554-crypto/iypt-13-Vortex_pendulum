import { frozenCaseCost } from "./definitions.mjs";

export const H2X_WORKER_MEMORY_BOUND_BYTES = 768 * 1024 ** 2;

export function deriveH2xMemorySafeMaximum(snapshot, logicalCpuCount) {
  if (!Number.isFinite(snapshot.memoryMax)
    || !Number.isFinite(snapshot.memoryCurrent)
    || !Number.isSafeInteger(logicalCpuCount)
    || logicalCpuCount < 1) {
    throw new Error("INCONCLUSIVE-H2X-RESOURCE-OR-TOOLCHAIN: invalid worker envelope");
  }
  const availableBytes = Math.max(0, snapshot.memoryMax - snapshot.memoryCurrent);
  const memoryBound = Math.floor(
    availableBytes / (1.1 * H2X_WORKER_MEMORY_BOUND_BYTES),
  );
  const maximum = Math.min(8, logicalCpuCount, memoryBound);
  if (maximum < 1) {
    throw new Error("INCONCLUSIVE-H2X-RESOURCE-OR-TOOLCHAIN: no memory-safe worker");
  }
  return maximum;
}

export function resolveH2xWorkerCounts(contract, input) {
  if (!Number.isSafeInteger(input.memorySafeMaximum)
    || input.memorySafeMaximum < 1
    || !Number.isSafeInteger(input.selectedHw2rWorkerCount)
    || input.selectedHw2rWorkerCount < 1
    || input.selectedHw2rWorkerCount > input.memorySafeMaximum) {
    throw new Error("INCONCLUSIVE-H2X-RESOURCE-OR-TOOLCHAIN: unsafe selected worker count");
  }
  const values = contract.schedulerMatrix.workerCounts.map((value) => {
    if (value === "memory-safe-maximum") return input.memorySafeMaximum;
    if (value === "selected-hw2r-worker-count") {
      return input.selectedHw2rWorkerCount;
    }
    return value;
  });
  if (values.some((value) => !Number.isSafeInteger(value) || value < 1)) {
    throw new Error("NO-GO-H2X-SOURCE-OR-CONTRACT-DRIFT: worker matrix");
  }
  return Object.freeze([...new Set(values)].sort((left, right) => left - right));
}

export function orderDefinitions(definitions, order) {
  const values = [...definitions];
  if (order === "canonical-case-id") {
    return values.sort((left, right) => left.id.localeCompare(right.id));
  }
  if (order === "reverse-canonical-case-id") {
    return values.sort((left, right) => right.id.localeCompare(left.id));
  }
  if (order === "descending-frozen-cost") {
    return values.sort((left, right) => {
      const difference = frozenCaseCost(right) - frozenCaseCost(left);
      return difference === 0 ? left.id.localeCompare(right.id) : difference;
    });
  }
  throw new Error(`unknown result-blind completion order ${order}`);
}

export function buildResultBlindSchedule(definitions, workerCount, order) {
  if (!Number.isSafeInteger(workerCount) || workerCount < 1) {
    throw new RangeError("workerCount must be a positive safe integer");
  }
  const ordered = orderDefinitions(definitions, order);
  const lanes = Array.from({ length: workerCount }, (_, laneId) => ({
    laneId,
    frozenCost: 0,
    caseIds: [],
  }));
  for (const definition of ordered) {
    lanes.sort((left, right) => left.frozenCost - right.frozenCost
      || left.laneId - right.laneId);
    lanes[0].caseIds.push(definition.id);
    lanes[0].frozenCost += frozenCaseCost(definition);
  }
  return Object.freeze({
    workerCount,
    order,
    lanes: Object.freeze(
      [...lanes]
        .sort((left, right) => left.laneId - right.laneId)
        .map((lane) => Object.freeze({
          laneId: lane.laneId,
          frozenCost: lane.frozenCost,
          caseIds: Object.freeze([...lane.caseIds]),
        })),
    ),
  });
}

export async function executeResultBlindSchedule(input) {
  const schedule = buildResultBlindSchedule(
    input.definitions,
    input.workerCount,
    input.order,
  );
  const byId = new Map(input.definitions.map((definition) => [definition.id, definition]));
  const results = [];
  await Promise.all(schedule.lanes.map(async (lane) => {
    for (const caseId of lane.caseIds) {
      const definition = byId.get(caseId);
      if (!definition) throw new Error(`missing scheduled definition ${caseId}`);
      const result = await input.executor(definition, lane.laneId);
      results.push(result);
    }
  }));
  return Object.freeze({ schedule, results: Object.freeze(results) });
}
