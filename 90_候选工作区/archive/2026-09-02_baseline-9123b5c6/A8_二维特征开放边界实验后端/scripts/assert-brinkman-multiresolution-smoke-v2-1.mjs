import { createHash } from "node:crypto";
import { readFile, lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT } from
  "../src/brinkman-multiresolution-contract-v2-1.ts";
import {
  BRINKMAN_MULTIRESOLUTION_V2P1_EXECUTION_SCOPES as EXECUTION_SCOPES,
  BRINKMAN_MULTIRESOLUTION_V2P1_P1_IDENTITY as P1_IDENTITY,
} from "../src/brinkman-multiresolution-p1-v2-1.ts";
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
    "A8R v2.1 smoke asserter accepts no CLI arguments or path overrides",
  );
}

function requireGate(value, label) {
  if (value !== true) throw new Error(`A8R v2.1 smoke gate failed: ${label}`);
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `A8R v2.1 smoke ${label} mismatch: ${String(actual)} != ${String(expected)}`,
    );
  }
}

function assertFiniteJsonTree(value, path = "$") {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`A8R v2.1 smoke non-finite JSON number at ${path}`);
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertFiniteJsonTree(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    assertFiniteJsonTree(entry, `${path}.${key}`);
  }
}

const evidencePath = resolve(PACKAGE_ROOT, SMOKE_EVIDENCE_RELATIVE_PATH);
const sidecarPath = resolve(PACKAGE_ROOT, SMOKE_SIDECAR_RELATIVE_PATH);
const evidenceBytes = await readFile(evidencePath);
const evidenceSha256 = createHash("sha256")
  .update(evidenceBytes)
  .digest("hex");
const sidecar = await readFile(sidecarPath, "utf8");
requireEqual(
  sidecar,
  expectedSmokeSidecarText(evidencePath, evidenceSha256),
  "sidecar",
);
const evidence = JSON.parse(evidenceBytes.toString("utf8"));
assertFiniteJsonTree(evidence);
requireEqual(
  evidence.format,
  "VP-A8R-V2P1-FORMAL-DUAL-40-STEP-SMOKE-EVIDENCE-v1",
  "format",
);
requireEqual(
  evidence.status,
  "COMPLETED_INTERNAL_SMOKE_GATES_PASS_PENDING_PRO_REVIEW",
  "status",
);
requireEqual(
  evidence.rulingIdentity.reviewCommit,
  P1_IDENTITY.smokeUnlockReview.commit,
  "review commit",
);
requireEqual(
  evidence.rulingIdentity.reviewSha256,
  P1_IDENTITY.smokeUnlockReview.sha256,
  "review SHA-256",
);
const preflight = await verifyBrinkmanMultiresolutionV2P1Preflight();
requireEqual(
  evidence.implementationIdentity.smokeImplementationCommit,
  preflight.implementationCommit,
  "smoke implementation commit",
);
requireEqual(
  evidence.implementationIdentity.implementationTreeSha256,
  preflight.implementationTreeSha256,
  "implementation tree SHA-256",
);
requireEqual(
  evidence.implementationIdentity.implementationTreePathCount,
  preflight.implementationTreePaths.length,
  "implementation tree path count",
);
requireEqual(
  JSON.stringify(evidence.implementationIdentity.implementationTreePaths),
  JSON.stringify(preflight.implementationTreePaths),
  "implementation tree paths",
);
for (const key of ["node", "v8", "zlib", "platform", "arch"]) {
  if (typeof evidence.runtimeIdentity[key] !== "string"
    || evidence.runtimeIdentity[key].length === 0) {
    throw new Error(`A8R v2.1 smoke runtime identity is absent: ${key}`);
  }
}
requireGate(evidence.executionIsolation.researchArtifactAbsentBefore,
  "research artifact absent before");
requireGate(evidence.executionIsolation.researchArtifactAbsentAfter,
  "research artifact absent after");
requireEqual(evidence.executionIsolation.researchScopeAuthorized, false,
  "research scope authorization");
requireEqual(evidence.executionIsolation.researchMatrixUnlocked, false,
  "research matrix unlock");
requireEqual(evidence.executionIsolation.formalIntegrationUnlocked, false,
  "formal integration unlock");
requireEqual(evidence.executionIsolation.checkpointRestoreUsed, false,
  "checkpoint restore use");
requireEqual(evidence.executionIsolation.outputPathOverrideAccepted, false,
  "output override acceptance");
requireEqual(evidence.executionIsolation.sourceDefinitionOverrideAccepted, false,
  "source override acceptance");

if (!Array.isArray(evidence.cases) || evidence.cases.length !== 2) {
  throw new Error("A8R v2.1 smoke must contain exactly two cases");
}
const expectedCases = [
  [EXECUTION_SCOPES.forcedFixedCylinderSmoke40, "fixed-cylinder"],
  [EXECUTION_SCOPES.unforcedBodyNullSmoke40, "null"],
];
for (let index = 0; index < expectedCases.length; index += 1) {
  const result = evidence.cases[index];
  const [scope, bodyKind] = expectedCases[index];
  requireEqual(result.scope, scope, `case ${index} scope`);
  requireEqual(result.bodyKind, bodyKind, `case ${index} body kind`);
  requireEqual(result.definition.diameterCells, 24, `case ${index} diameter`);
  requireEqual(result.definition.maskHalfThicknessCells, 0.75,
    `case ${index} mask`);
  requireEqual(result.definition.penalizationTimeSteps, 1,
    `case ${index} penalization time`);
  requireEqual(result.definition.phaseId, "baseline", `case ${index} phase`);
  requireEqual(result.definition.inletLatticeVelocity, 0.05,
    `case ${index} inlet velocity`);
  requireEqual(result.definition.acceptedSteps, 40, `case ${index} definition steps`);
  requireEqual(result.definition.checkpointRestoreUsed, false,
    `case ${index} checkpoint restore`);
  requireEqual(result.solver.initialStep, 0, `case ${index} initial step`);
  requireEqual(result.solver.completedSteps, 40, `case ${index} completed steps`);
  if (!Array.isArray(result.steps) || result.steps.length !== 40) {
    throw new Error(`A8R v2.1 smoke case ${index} lacks exactly 40 steps`);
  }
  for (let stepIndex = 0; stepIndex < result.steps.length; stepIndex += 1) {
    const step = result.steps[stepIndex];
    requireEqual(step.step, stepIndex + 1, `case ${index} step number`);
    requireEqual(step.prePopulationStep, stepIndex,
      `case ${index} pre-population step`);
    requireEqual(step.postPopulationStep, stepIndex + 1,
      `case ${index} post-population step`);
    requireGate(step.populationCheckpointElementwiseEqual,
      `case ${index} population copy ${stepIndex + 1}`);
    requireGate(step.forceIdentity.gates.rawPass,
      `case ${index} raw identity ${stepIndex + 1}`);
    requireGate(step.forceIdentity.gates.a2Pass,
      `case ${index} A2 identity ${stepIndex + 1}`);
    requireGate(step.forceIdentity.gates.formalRecompositionExact,
      `case ${index} formal recomposition ${stepIndex + 1}`);
    requireGate(step.forceIdentity.gates.supportPass,
      `case ${index} force support ${stepIndex + 1}`);
    requireGate(step.pass, `case ${index} step ${stepIndex + 1}`);
    if (bodyKind === "null") {
      requireEqual(step.nonzeroMaskCellCount, 0,
        `body-null mask count step ${stepIndex + 1}`);
      requireEqual(step.reconstructedNonzeroForceCellCount, 0,
        `body-null force count step ${stepIndex + 1}`);
      requireGate(step.forceIdentity.gates.bodyNullFormalRawReactionExactZero,
        `body-null raw zero step ${stepIndex + 1}`);
      requireGate(step.forceIdentity.gates.bodyNullFormalA2CorrectionExactZero,
        `body-null correction zero step ${stepIndex + 1}`);
      requireGate(step.forceIdentity.gates.bodyNullFormalCorrectedLoadExactZero,
        `body-null corrected zero step ${stepIndex + 1}`);
    } else {
      if (!(step.nonzeroMaskCellCount > 0)
        || !(step.reconstructedNonzeroForceCellCount > 0)) {
        throw new Error(
          `A8R v2.1 forced smoke lacks nonzero support at step ${stepIndex + 1}`,
        );
      }
    }
  }
  requireGate(result.summary.allPopulationCopiesVerified,
    `case ${index} population summary`);
  requireGate(result.summary.allRawPopulationIdentityPass,
    `case ${index} raw summary`);
  requireGate(result.summary.allA2FormulaPass, `case ${index} A2 summary`);
  requireGate(result.summary.allFormalRecompositionPass,
    `case ${index} recomposition summary`);
  requireGate(result.summary.allMaskAndForceSupportPass,
    `case ${index} support summary`);
  requireGate(result.summary.allFinite, `case ${index} finite summary`);
  requireGate(result.summary.pass, `case ${index} summary`);
}
requireGate(evidence.gateSummary.exactCaseCount, "exact case count");
requireGate(evidence.gateSummary.exactAcceptedStepsEach,
  "exact accepted steps each");
requireGate(evidence.gateSummary.twoFreshSolverExecutions,
  "two fresh solver executions");
requireGate(evidence.gateSummary.allCaseInternalGatesPass,
  "all internal case gates");
requireGate(evidence.gateSummary.researchIsolationPass,
  "research isolation");
requireGate(evidence.gateSummary.pass, "global smoke evidence");

try {
  await lstat(resolve(PACKAGE_ROOT, CONTRACT.artifact.relativePath));
  throw new Error("A8R v2.1 frozen research artifact exists after smoke");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

console.log(JSON.stringify({
  evidencePath,
  sidecarPath,
  evidenceSha256,
  smokeImplementationCommit: preflight.implementationCommit,
  implementationTreeSha256: preflight.implementationTreeSha256,
  exactCases: 2,
  exactAcceptedStepsEach: 40,
  pass: true,
}, null, 2));
