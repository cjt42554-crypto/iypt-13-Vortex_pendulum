import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT } from
  "../src/brinkman-multiresolution-contract-v2-1.ts";
import {
  BRINKMAN_MULTIRESOLUTION_V2P1_P1_IDENTITY as P1_IDENTITY,
} from "../src/brinkman-multiresolution-p1-v2-1.ts";
import {
  runDualBrinkmanMultiresolutionV2P1Smoke,
} from "../src/brinkman-multiresolution-smoke-v2-1.ts";
import { assertFiniteTree } from
  "../src/brinkman-multiresolution-support-v2-1.ts";
import {
  PACKAGE_ROOT,
  verifyBrinkmanMultiresolutionV2P1Preflight,
} from "./brinkman-multiresolution-preflight-v2-1.mjs";
import {
  SMOKE_EVIDENCE_RELATIVE_PATH,
  SMOKE_SIDECAR_RELATIVE_PATH,
  expectedSmokeSidecarText,
} from "./brinkman-multiresolution-smoke-artifact-v2-1.mjs";

if (process.argv.length !== 2) {
  throw new Error(
    "A8R v2.1 smoke runner accepts no CLI arguments or output overrides",
  );
}

const evidencePath = resolve(PACKAGE_ROOT, SMOKE_EVIDENCE_RELATIVE_PATH);
const sidecarPath = resolve(PACKAGE_ROOT, SMOKE_SIDECAR_RELATIVE_PATH);
const researchArtifactPath = resolve(PACKAGE_ROOT, CONTRACT.artifact.relativePath);

async function pathAbsent(path) {
  try {
    await lstat(path);
    return false;
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    throw error;
  }
}

if (!await pathAbsent(evidencePath) || !await pathAbsent(sidecarPath)) {
  throw new Error("A8R v2.1 smoke evidence paths already exist; overwrite denied");
}
const researchArtifactAbsentBefore = await pathAbsent(researchArtifactPath);
if (!researchArtifactAbsentBefore) {
  throw new Error(
    "A8R v2.1 research artifact exists before smoke; isolation gate failed",
  );
}

// This closes cleanliness, origin/main, review, source, dependency-tree, and
// frozen A8Q identity gates before the first formal solver construction.
const preflight = await verifyBrinkmanMultiresolutionV2P1Preflight();
const cases = runDualBrinkmanMultiresolutionV2P1Smoke();
const researchArtifactAbsentAfter = await pathAbsent(researchArtifactPath);
if (!researchArtifactAbsentAfter) {
  throw new Error(
    "A8R v2.1 research artifact appeared during smoke; isolation gate failed",
  );
}

const packageLockBytes = await readFile(resolve(PACKAGE_ROOT, "package-lock.json"));
const packageLockSha256 = createHash("sha256")
  .update(packageLockBytes)
  .digest("hex");
const allCaseInternalGatesPass = cases.every((result) => result.summary.pass);
const evidence = {
  format: "VP-A8R-V2P1-FORMAL-DUAL-40-STEP-SMOKE-EVIDENCE-v1",
  status: allCaseInternalGatesPass
    ? "COMPLETED_INTERNAL_SMOKE_GATES_PASS_PENDING_PRO_REVIEW"
    : "COMPLETED_INTERNAL_SMOKE_GATES_FAIL_PENDING_PRO_REVIEW",
  rulingIdentity: {
    reviewCommit: P1_IDENTITY.smokeUnlockReview.commit,
    reviewSha256: P1_IDENTITY.smokeUnlockReview.sha256,
    acceptedCode: P1_IDENTITY.smokeUnlockReview.acceptedCode,
    unlockCode: P1_IDENTITY.smokeUnlockReview.unlockCode,
    requiredCode: P1_IDENTITY.smokeUnlockReview.requiredCode,
    lockCode: P1_IDENTITY.smokeUnlockReview.lockCode,
  },
  implementationIdentity: {
    smokeImplementationCommit: preflight.implementationCommit,
    implementationTreeSha256: preflight.implementationTreeSha256,
    implementationTreePathCount: preflight.implementationTreePaths.length,
    implementationTreePaths: preflight.implementationTreePaths,
    packageLockSha256,
    sourceHashesVerified: preflight.provenance.sourceHashesVerified,
    formalSourceSha256: preflight.provenance.formalSourceSha256,
  },
  runtimeIdentity: {
    node: process.versions.node,
    v8: process.versions.v8,
    zlib: process.versions.zlib,
    platform: process.platform,
    arch: process.arch,
  },
  executionIsolation: {
    researchArtifactRelativePath: CONTRACT.artifact.relativePath,
    researchArtifactAbsentBefore,
    researchArtifactAbsentAfter,
    researchScopeAuthorized: false,
    researchMatrixUnlocked: false,
    formalIntegrationUnlocked: false,
    checkpointRestoreUsed: false,
    outputPathOverrideAccepted: false,
    sourceDefinitionOverrideAccepted: false,
  },
  cases,
  gateSummary: {
    exactCaseCount: cases.length === 2,
    exactAcceptedStepsEach: cases.every((result) =>
      result.summary.acceptedSteps === 40
        && result.steps.length === 40
        && result.solver.completedSteps === 40),
    twoFreshSolverExecutions: cases.every((result) =>
      result.solver.constructedInsideCaseAdapter
        && result.solver.initialStep === 0),
    allCaseInternalGatesPass,
    researchIsolationPass:
      researchArtifactAbsentBefore && researchArtifactAbsentAfter,
    pass: allCaseInternalGatesPass
      && researchArtifactAbsentBefore
      && researchArtifactAbsentAfter,
  },
  claimUpperBound:
    "Candidate-only 40-step formal-solver integration smoke and machine force-identity closure for exactly one forced fixed-cylinder case and one body-null case; not A8R numerical qualification, long-time stability, physical validation, formal integration, apparatus prediction, or experimental validation.",
};
assertFiniteTree(evidence, "dual-smoke-evidence");
const evidenceBytes = Buffer.from(JSON.stringify(evidence, null, 2) + "\n");
const evidenceSha256 = createHash("sha256")
  .update(evidenceBytes)
  .digest("hex");
await mkdir(dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, evidenceBytes, { flag: "wx" });
await writeFile(
  sidecarPath,
  expectedSmokeSidecarText(evidencePath, evidenceSha256),
  { encoding: "utf8", flag: "wx" },
);

console.log(JSON.stringify({
  evidencePath,
  sidecarPath,
  evidenceSha256,
  smokeImplementationCommit: preflight.implementationCommit,
  implementationTreeSha256: preflight.implementationTreeSha256,
  gateSummary: evidence.gateSummary,
}, null, 2));

if (!evidence.gateSummary.pass) process.exitCode = 2;
