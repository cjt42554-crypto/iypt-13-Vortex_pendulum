import { mkdir } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { basename, join, resolve } from "node:path";
import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { writeCanonicalGzipWithSidecarExclusive } from "../../_shared/src/atomic.mjs";
import { aggregateH2xQualification } from "../src/aggregator.mjs";
import { loadH2xContract } from "../src/contract.mjs";
import { buildH2xQualificationDefinitions } from "../src/definitions.mjs";
import { executeH2xCaseInFreshProcess } from "../src/process-executor.mjs";
import {
  assertCleanMainParityAndIdentity,
  assertFiniteMemorySafety,
  compareResourceSnapshots,
  H2X_IMPLEMENTATION_PATHS,
  readQualificationResourceSnapshot,
} from "../src/repository-preflight.mjs";
import {
  deriveH2xMemorySafeMaximum,
  executeResultBlindSchedule,
  resolveH2xWorkerCounts,
} from "../src/scheduler.mjs";
import {
  buildH2xHashOnlyShard,
  writeH2xHashOnlyShard,
} from "../src/shard.mjs";

function parseArguments(argv) {
  const value = (name) => {
    const index = argv.indexOf(name);
    return index < 0 ? null : argv[index + 1];
  };
  const environmentId = value("--environment-id");
  const outputDirectory = value("--output");
  const selectedHw2rWorkerCount = Number(value("--selected-worker-count"));
  const memorySafeMaximum = Number(value("--memory-safe-maximum"));
  if (!environmentId || !/^[a-zA-Z0-9._-]+$/.test(environmentId)
    || !outputDirectory
    || !Number.isSafeInteger(selectedHw2rWorkerCount)
    || selectedHw2rWorkerCount < 1
    || !Number.isSafeInteger(memorySafeMaximum)
    || memorySafeMaximum < 1) {
    throw new Error(
      "usage: run-h2x-qualification.mjs --environment-id ID --output DIR "
        + "--selected-worker-count N --memory-safe-maximum N",
    );
  }
  return Object.freeze({
    environmentId,
    outputDirectory: resolve(outputDirectory),
    selectedHw2rWorkerCount,
    memorySafeMaximum,
  });
}

async function executeRun(input) {
  const started = process.hrtime.bigint();
  const executed = await executeResultBlindSchedule({
    definitions: input.definitions,
    workerCount: input.workerCount,
    order: input.order,
    executor: async (definition) => executeH2xCaseInFreshProcess(definition),
  });
  const byId = new Map(input.definitions.map((definition, index) => [
    definition.id,
    Object.freeze({ definition, index }),
  ]));
  const shards = [];
  const timing = [];
  for (const result of executed.results) {
    const entry = byId.get(result.caseId);
    if (!entry) throw new Error(`NO-GO-H2X-SHARD-OR-AGGREGATION: ${result.caseId}`);
    const shard = buildH2xHashOnlyShard({
      ...input.identity,
      runId: input.runId,
      caseId: result.caseId,
      caseOrdinal: entry.index,
      workerCount: input.workerCount,
      completionOrder: input.order,
      hashes: result.hashes,
    });
    const outputPath = join(input.outputDirectory, `${result.caseId}.json.gz`);
    await writeH2xHashOnlyShard(outputPath, shard);
    shards.push(shard);
    timing.push(Object.freeze({
      caseId: result.caseId,
      wallTimeSeconds: result.wallTimeSeconds,
    }));
  }
  return Object.freeze({
    shards: Object.freeze(shards),
    schedule: executed.schedule,
    timing: Object.freeze(timing.sort((left, right) =>
      left.caseId.localeCompare(right.caseId))),
    wallTimeSeconds: Number(process.hrtime.bigint() - started) / 1e9,
  });
}

const options = parseArguments(process.argv.slice(2));
const loaded = await loadH2xContract();
const preflight = await assertCleanMainParityAndIdentity(H2X_IMPLEMENTATION_PATHS);
const before = await readQualificationResourceSnapshot();
const entrySafety = assertFiniteMemorySafety(loaded.contract, before);
const currentMemorySafeMaximum = deriveH2xMemorySafeMaximum(
  before,
  availableParallelism(),
);
if (options.memorySafeMaximum > currentMemorySafeMaximum) {
  throw new Error("INCONCLUSIVE-H2X-RESOURCE-OR-TOOLCHAIN: worker envelope changed");
}
const workerCounts = resolveH2xWorkerCounts(loaded.contract, options);
const completionOrders = Object.freeze([
  ...loaded.contract.schedulerMatrix.completionOrders,
]);
if (completionOrders.length !== 3
  || new Set(completionOrders).size !== completionOrders.length) {
  throw new Error("NO-GO-H2X-SOURCE-OR-CONTRACT-DRIFT: completion orders");
}
const built = await buildH2xQualificationDefinitions(loaded.contract);
await mkdir(options.outputDirectory, { recursive: false });
const commonIdentity = Object.freeze({
  environmentId: options.environmentId,
  contractSha256: loaded.contractSha256,
  sourceIdentitySha256: loaded.sourceIdentity.canonicalSha256,
  implementationCommit: preflight.implementationCommit,
  implementationTreeSha256: preflight.implementationTreeSha256,
});
const oracleIdentity = Object.freeze({
  ...commonIdentity,
  runId: `${options.environmentId}-oracle`,
});
const oracleDirectory = join(options.outputDirectory, "oracle");
await mkdir(oracleDirectory);
const oracle = await executeRun({
  definitions: built.definitions,
  workerCount: 1,
  order: "canonical-case-id",
  identity: oracleIdentity,
  runId: oracleIdentity.runId,
  outputDirectory: oracleDirectory,
});
const candidateMatrix = [];
for (const workerCount of workerCounts) {
  for (const order of completionOrders) {
    const matrixId = `w${String(workerCount).padStart(2, "0")}-${order}`;
    const candidateIdentity = Object.freeze({
      ...commonIdentity,
      runId: `${options.environmentId}-candidate-${matrixId}`,
    });
    const candidateDirectory = join(options.outputDirectory, `candidate-${matrixId}`);
    await mkdir(candidateDirectory);
    const candidate = await executeRun({
      definitions: built.definitions,
      workerCount,
      order,
      identity: candidateIdentity,
      runId: candidateIdentity.runId,
      outputDirectory: candidateDirectory,
    });
    const aggregate = aggregateH2xQualification({
      oracleShards: oracle.shards,
      candidateShards: candidate.shards,
      oracleIdentity,
      candidateIdentity,
    });
    candidateMatrix.push(Object.freeze({
      matrixId,
      workerCount,
      completionOrder: order,
      wallTimeSeconds: candidate.wallTimeSeconds,
      caseTiming: candidate.timing,
      scheduleSha256: canonicalSha256(candidate.schedule),
      equality: aggregate.comparisons,
      aggregateCanonicalSha256: aggregate.canonicalSha256,
      pass: aggregate.pass,
      classification: aggregate.classification,
    }));
  }
}
const after = await readQualificationResourceSnapshot();
const safety = compareResourceSnapshots(loaded.contract, before, after);
const expectedMatrixCount = workerCounts.length * completionOrders.length;
const pass = candidateMatrix.length === expectedMatrixCount
  && candidateMatrix.every(({ pass: value }) => value === true)
  && safety.pass;
const summary = {
  format: "VP-H2X-INDEPENDENT-ENVIRONMENT-QUALIFICATION-SUMMARY-v2",
  environmentId: options.environmentId,
  contractSha256: loaded.contractSha256,
  sourceIdentitySha256: loaded.sourceIdentity.canonicalSha256,
  definitionSetSha256: built.canonicalSha256,
  implementationCommit: preflight.implementationCommit,
  executionCommit: preflight.executionCommit,
  implementationTreeSha256: preflight.implementationTreeSha256,
  schedulerMatrix: {
    workerCounts,
    completionOrders,
    selectedHw2rWorkerCount: options.selectedHw2rWorkerCount,
    memorySafeMaximum: options.memorySafeMaximum,
    currentMemorySafeMaximum,
    combinationCount: candidateMatrix.length,
  },
  oracle: {
    workerCount: 1,
    completionOrder: "canonical-case-id",
    wallTimeSeconds: oracle.wallTimeSeconds,
    caseTiming: oracle.timing,
    scheduleSha256: canonicalSha256(oracle.schedule),
  },
  candidateMatrix,
  candidateMatrixCanonicalSha256: canonicalSha256(candidateMatrix),
  entrySafety,
  safety,
  pass,
  classification: pass
    ? loaded.contract.passCode
    : candidateMatrix.every(({ pass: value }) => value === true)
      ? "INCONCLUSIVE-H2X-RESOURCE-OR-TOOLCHAIN"
      : "NO-GO-H2X-SCIENTIFIC-PAYLOAD-HASH-MISMATCH",
  scientificValuesPersisted: false,
  scientificValuesHumanRead: false,
  fullEightCaseResultBearingRunPerformed: false,
  canonicalA8rArtifactWritten: false,
  scientificConclusion: "NONE",
};
const written = await writeCanonicalGzipWithSidecarExclusive(
  join(options.outputDirectory, "environment-summary.json.gz"),
  summary,
);
process.stdout.write(`${JSON.stringify({
  environmentId: options.environmentId,
  pass,
  classification: summary.classification,
  schedulerCombinationCount: candidateMatrix.length,
  summaryStoredSha256: written.artifact.storedSha256,
  summaryCanonicalSha256: written.artifact.canonicalSha256,
  sidecarSha256: written.sidecar.sha256,
  outputDirectory: basename(options.outputDirectory),
  scientificValuesPersisted: false,
})}\n`);
if (!pass) process.exitCode = 1;
