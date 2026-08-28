import { writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT } from
  "../src/brinkman-multiresolution-contract-v2-1.ts";
import { runBrinkmanMultiresolutionV2P1Qualification } from
  "../src/brinkman-multiresolution-v2-1.ts";
import { writeDeterministicJsonGzip } from
  "./formal-causal-reference-artifact-stream.mjs";
import {
  PACKAGE_ROOT,
  verifyBrinkmanMultiresolutionV2P1Preflight,
} from "./brinkman-multiresolution-preflight-v2-1.mjs";

const outputPath = process.argv[2] === undefined
  ? resolve(PACKAGE_ROOT, CONTRACT.artifact.relativePath)
  : resolve(process.cwd(), process.argv[2]);
if (!outputPath.endsWith(".json.gz")) {
  throw new Error("A8R v2.1 output path must end with .json.gz");
}
const sidecarPath = outputPath.replace(/\.json\.gz$/, ".sha256");

// All repository, source, canonical A8Q, sidecar, LFS, ancestry, remote, and
// cleanliness gates complete before the first formal solver is constructed.
const preflight = await verifyBrinkmanMultiresolutionV2P1Preflight();
const lastPrintedPercent = new Map();
const result = runBrinkmanMultiresolutionV2P1Qualification(
  preflight.provenance,
  preflight.anchor,
  (progress) => {
    const percent = Math.floor(
      100 * progress.completedSteps / progress.totalSteps,
    );
    const printable = percent === 100 || percent % 10 === 0;
    if (printable && lastPrintedPercent.get(progress.caseId) !== percent) {
      lastPrintedPercent.set(progress.caseId, percent);
      console.error(
        `[A8R-v2.1 ${progress.caseId}] ${progress.completedSteps}/`
        + `${progress.totalSteps} (${percent}%)`,
      );
    }
  },
);

for (const run of result.runs) {
  console.error(
    `[A8R-v2.1 ${run.definition.id}] status=${run.status}`
    + ` steps=${run.completedSteps}/${run.definition.totalSteps}`
    + (run.status === "completed"
      ? ` internal=${run.gates.pass ? "PASS" : "FAIL"}`
      : ` failure=${run.failure}`),
  );
}

const artifactIdentity = await writeDeterministicJsonGzip(
  result,
  outputPath,
  {
    level: CONTRACT.artifact.gzipLevel,
    mtime: CONTRACT.artifact.gzipMtime,
  },
);
const storedName = basename(outputPath);
const canonicalName = storedName.replace(/\.gz$/, "")
  + " (canonical uncompressed bytes)";
await writeFile(
  sidecarPath,
  artifactIdentity.canonicalSha256 + "  " + canonicalName + "\n"
    + artifactIdentity.storedSha256 + "  " + storedName + "\n",
  { encoding: "utf8", flag: "wx" },
);

console.log(JSON.stringify({
  outputPath,
  sidecarPath,
  storedSha256: artifactIdentity.storedSha256,
  canonicalSha256: artifactIdentity.canonicalSha256,
  storedBytes: artifactIdentity.storedBytes,
  canonicalBytes: artifactIdentity.canonicalBytes,
  contractCommit: preflight.provenance.contractCommit,
  contractTestCommit: preflight.provenance.contractTestCommit,
  implementationUnlockReviewCommit:
    preflight.provenance.implementationUnlockReviewCommit,
  implementationCommit: preflight.implementationCommit,
  implementationTreeSha256: preflight.implementationTreeSha256,
  globalGate: result.globalGate,
  routeGate: result.routeGate,
  decision: result.decision,
}, null, 2));

if (!result.decision.pass) process.exitCode = 2;
