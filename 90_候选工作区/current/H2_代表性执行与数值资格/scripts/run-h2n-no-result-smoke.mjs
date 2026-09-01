import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildH2nStage0Native } from "./build-h2n-stage0.mjs";
import { loadH2nContract } from "../src/contract.mjs";
import { runH2nStage0NumericalComparison } from "../src/h2n-stage0-runner.mjs";
import { runH2nStage0NativePerformance } from "../src/h2n-stage0-native.mjs";

function requestedBackends(argv) {
  const index = argv.indexOf("--backend");
  const value = index < 0 ? "cpu" : argv[index + 1];
  if (value === "both") return Object.freeze(["cpu", "opencl"]);
  if (value === "cpu" || value === "opencl") return Object.freeze([value]);
  throw new Error("--backend must be cpu, opencl, or both");
}

const root = await mkdtemp(join(tmpdir(), "iypt13-h2n-smoke-"));
try {
  const binary = await buildH2nStage0Native(join(root, "h2n-stage0"));
  const loadedContract = await loadH2nContract();
  const results = [];
  for (const backend of requestedBackends(process.argv.slice(2))) {
    const result = await runH2nStage0NumericalComparison({
      mode: "no-result-smoke",
      loadedContract,
      binaryPath: binary.outputPath,
      binaryIdentity: binary.identity,
      backend,
      size: Object.freeze({
        sizeId: "no-result-smoke-32x16-d1",
        diameterCells: 1,
        nx: 32,
        ny: 16,
        steps: 2,
      }),
      bodyModeId: "fixed-body-baseline-phase",
      maskHalfThicknessCells: 0.75,
      checkpointSteps: [0, 1, 2],
      threads: backend === "cpu" ? 2 : 1,
    });
    const performanceEnvelope = await runH2nStage0NativePerformance({
      binaryPath: binary.outputPath,
      backend,
      nx: 32,
      ny: 16,
      steps: 2,
      diameterCells: 1,
      maskHalfThicknessCells: 0.75,
      phaseOffsetYCells: 0.17320508075688773,
      nativeBodyMode: "fixed-body",
      threads: backend === "cpu" ? 2 : 1,
      batchCount: 1,
    });
    results.push(Object.freeze({
      backend,
      pass: result.pass && performanceEnvelope.correctnessPass,
      classification: result.classification,
      maxima: result.numerical.maxima,
      representativeEnvelopeCoveragePass:
        Object.values(performanceEnvelope.operationCoverage).every(Boolean),
      canonicalSha256: result.canonicalSha256,
    }));
  }
  const pass = results.every(({ pass: value }) => value);
  process.stdout.write(`${JSON.stringify({
    classification: pass
      ? "PASS-H2N-NO-RESULT-NUMERICAL-SMOKE"
      : "NO-GO-H2N-NO-RESULT-NUMERICAL-SMOKE",
    results,
    performanceObservationMade: false,
    formalStage0RunPerformed: false,
    fullH2nRunPerformed: false,
    h3RunPerformed: false,
    scientificValuesPersisted: false,
  })}\n`);
  if (!pass) process.exitCode = 1;
} finally {
  await rm(root, { recursive: true, force: true });
}
