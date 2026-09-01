import { readFile } from "node:fs/promises";

function parseCpuList(text) {
  const values = [];
  for (const token of String(text).trim().split(",")) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(token);
    if (!match) continue;
    const start = Number(match[1]);
    const end = match[2] === undefined ? start : Number(match[2]);
    for (let value = start; value <= end; value += 1) values.push(value);
  }
  return values;
}

async function readInteger(path) {
  return Number((await readFile(path, "utf8")).trim());
}

export async function collectHw2rCpuTopology() {
  const online = parseCpuList(await readFile(
    "/sys/devices/system/cpu/online",
    "utf8",
  ));
  const logical = [];
  for (const cpu of online) {
    const root = `/sys/devices/system/cpu/cpu${cpu}`;
    const [coreId, packageId, l3Id, siblings] = await Promise.all([
      readInteger(`${root}/topology/core_id`),
      readInteger(`${root}/topology/physical_package_id`),
      readInteger(`${root}/cache/index3/id`),
      readFile(`${root}/topology/thread_siblings_list`, "utf8")
        .then(parseCpuList),
    ]);
    logical.push(Object.freeze({ cpu, coreId, packageId, l3Id, siblings }));
  }
  const coreMap = new Map();
  for (const item of logical) {
    const key = `${item.packageId}:${item.coreId}`;
    if (!coreMap.has(key)) {
      coreMap.set(key, {
        key,
        packageId: item.packageId,
        coreId: item.coreId,
        l3Id: item.l3Id,
        cpus: [],
      });
    }
    coreMap.get(key).cpus.push(item.cpu);
  }
  const cores = [...coreMap.values()]
    .map((core) => Object.freeze({
      ...core,
      cpus: Object.freeze(core.cpus.sort((left, right) => left - right)),
      representativeCpu: Math.min(...core.cpus),
    }))
    .sort((left, right) => left.l3Id - right.l3Id
      || left.representativeCpu - right.representativeCpu);
  const l3Groups = new Map();
  for (const core of cores) {
    if (!l3Groups.has(core.l3Id)) l3Groups.set(core.l3Id, []);
    l3Groups.get(core.l3Id).push(core);
  }
  return Object.freeze({
    logicalCpuCount: logical.length,
    physicalCoreCount: cores.length,
    cores: Object.freeze(cores),
    l3Groups: Object.freeze([...l3Groups.entries()]
      .sort(([left], [right]) => left - right)
      .map(([l3Id, group]) => Object.freeze({
        l3Id,
        cores: Object.freeze(group),
      }))),
  });
}

function roundRobin(groups) {
  const output = [];
  const maximum = Math.max(...groups.map((group) => group.length));
  for (let index = 0; index < maximum; index += 1) {
    for (const group of groups) {
      if (group[index]) output.push(group[index]);
    }
  }
  return output;
}

export function deriveHw2rAffinity(topology, resourceCount, pinning) {
  if (pinning === "unpinned") {
    return Object.freeze({ feasible: true, cpuList: null, workerCpuLists: null });
  }
  let orderedCores;
  if (pinning === "single-ccd-or-l3") {
    const largest = [...topology.l3Groups]
      .sort((left, right) => right.cores.length - left.cores.length
        || left.l3Id - right.l3Id)[0];
    const capacity = resourceCount <= topology.physicalCoreCount
      ? largest.cores.length
      : largest.cores.reduce((sum, core) => sum + core.cpus.length, 0);
    if (resourceCount > capacity) {
      return Object.freeze({ feasible: false, cpuList: null, workerCpuLists: null });
    }
    orderedCores = [...largest.cores];
  } else if (pinning === "balanced-across-ccd-or-l3") {
    orderedCores = roundRobin(topology.l3Groups.map(({ cores }) => [...cores]));
  } else {
    throw new Error(`unknown HW2R pinning layout ${pinning}`);
  }
  const cpus = [];
  for (const core of orderedCores) cpus.push(core.representativeCpu);
  if (resourceCount > cpus.length) {
    for (const core of orderedCores) {
      for (const cpu of core.cpus) {
        if (cpu !== core.representativeCpu) cpus.push(cpu);
      }
    }
  }
  if (resourceCount > cpus.length) {
    return Object.freeze({ feasible: false, cpuList: null, workerCpuLists: null });
  }
  const selected = cpus.slice(0, resourceCount);
  return Object.freeze({
    feasible: true,
    cpuList: selected.join(","),
    workerCpuLists: Object.freeze(selected.map(String)),
  });
}
