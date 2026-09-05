import { createHash } from "node:crypto";
import { endianness } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { H2_REPOSITORY_ROOT } from "./contract.mjs";

const a8Root = resolve(
  H2_REPOSITORY_ROOT,
  "90_候选工作区/current/A8_二维特征开放边界实验后端",
);
const formalLbmPath = resolve(
  H2_REPOSITORY_ROOT,
  "02_模拟程序/src/solvers/highFidelity/lbm.ts",
);
const frozenContractPath = resolve(
  a8Root,
  "src/brinkman-multiresolution-contract-v2-1.ts",
);
const frozenRunnerPath = resolve(
  a8Root,
  "src/brinkman-multiresolution-runs-v2-1.ts",
);

function sha256Float64(array) {
  if (!(array instanceof Float64Array)) {
    throw new TypeError("population checkpoint must be Float64Array");
  }
  if (endianness() !== "LE") {
    throw new Error("H2-X raw population contract requires little-endian host");
  }
  return createHash("sha256")
    .update(Buffer.from(array.buffer, array.byteOffset, array.byteLength))
    .digest("hex");
}

function bodyForDefinition(definition) {
  return Object.freeze({
    centerX: definition.bodyCenterX,
    centerY: definition.bodyCenterY,
    radius: definition.bodyRadius,
    velocityX: 0,
    velocityY: 0,
  });
}

async function checkpointHashes(definition) {
  const [{ D2Q9MrtBrinkmanSolver }, { BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT }] =
    await Promise.all([
      import(pathToFileURL(formalLbmPath)),
      import(pathToFileURL(frozenContractPath)),
    ]);
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: definition.nx,
    ny: definition.ny,
    relaxationTime: definition.relaxationTime,
    penalizationTimeSteps: definition.penalizationTimeSteps,
    outerBoundary: "open-periodic-crossflow",
    maskHalfThickness: definition.maskHalfThicknessCells,
  });
  const body = bodyForDefinition(definition);
  solver.initializeUniform(BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT.carrier.latticeVelocity, 0);
  const output = {
    freshInitialPopulationSha256: sha256Float64(solver.checkpoint().distributions),
    preAnalysisPopulationSha256: null,
    analysisFirstStepPrePopulationSha256: null,
    analysisFirstStepPostPopulationSha256: null,
    frozenAuditStepPrePopulationSha256: null,
    frozenAuditStepPostPopulationSha256: null,
  };
  for (let step = 0; step < definition.totalSteps; step += 1) {
    if (step === definition.discardSteps) {
      const hash = sha256Float64(solver.checkpoint().distributions);
      output.preAnalysisPopulationSha256 = hash;
      output.analysisFirstStepPrePopulationSha256 = hash;
    }
    if (step + 1 === definition.totalSteps) {
      output.frozenAuditStepPrePopulationSha256 =
        sha256Float64(solver.checkpoint().distributions);
    }
    solver.step(body, BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT.carrier.latticeVelocity);
    if (step + 1 === definition.discardSteps + 1) {
      output.analysisFirstStepPostPopulationSha256 =
        sha256Float64(solver.checkpoint().distributions);
    }
    if (step + 1 === definition.totalSteps) {
      output.frozenAuditStepPostPopulationSha256 =
        sha256Float64(solver.checkpoint().distributions);
    }
  }
  if (Object.values(output).some((value) => !/^[0-9a-f]{64}$/.test(value ?? ""))) {
    throw new Error(`NO-GO-H2X-POPULATION-CHECKPOINT-MISMATCH: ${definition.id}`);
  }
  return Object.freeze(output);
}

export async function runH2xHashOracleCase(definition) {
  const started = process.hrtime.bigint();
  const runner = await import(pathToFileURL(frozenRunnerPath));
  let result = runner.runBrinkmanMultiresolutionV2P1Case(definition);
  if (result.status !== "completed" || result.completedSteps !== definition.totalSteps) {
    throw new Error(`NO-GO-H2X-SCIENTIFIC-PAYLOAD-HASH-MISMATCH: ${definition.id}`);
  }
  const hashes = {
    definitionSha256: canonicalSha256(definition),
    ...(await checkpointHashes(definition)),
    everyAnalysisStepForceIdentitySummarySha256: canonicalSha256(
      result.trace.map(({ step, forceIdentity }) => ({ step, forceIdentity })),
    ),
    shortenedCompleteCaseScientificPayloadSha256: canonicalSha256(result),
  };
  result = null;
  const wallTimeSeconds = Number(process.hrtime.bigint() - started) / 1e9;
  return Object.freeze({
    caseId: definition.id,
    hashes: Object.freeze(hashes),
    wallTimeSeconds,
    scientificValuesPersisted: false,
    scientificValuesHumanRead: false,
    fullResultBearingRunPerformed: false,
    canonicalA8rArtifactWritten: false,
  });
}
