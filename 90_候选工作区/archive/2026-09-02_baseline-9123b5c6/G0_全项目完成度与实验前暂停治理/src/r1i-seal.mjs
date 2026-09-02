import { createHash } from "node:crypto";

const FORBIDDEN_SCIENTIFIC_KEYS = new Set([
  "drag",
  "lift",
  "torque",
  "power",
  "pressure",
  "velocity",
  "period",
  "frequency",
  "strouhal",
  "phase",
  "spectrumPeak",
  "scientificMargin",
  "scientificGateCount",
  "scientificDecision",
  "literatureDistance",
]);

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(message) {
  throw new Error(`R1I validation failed: ${message}`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertExactKeys(value, expected, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys differ: ${JSON.stringify(actual)} vs ${JSON.stringify(wanted)}`);
  }
}

function walkKeys(value, visit) {
  if (Array.isArray(value)) {
    for (const item of value) walkKeys(item, visit);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    visit(key);
    walkKeys(child, visit);
  }
}

export function assertR1iDocument(document, schema) {
  assertExactKeys(document, schema.required, "manifest");
  assertEqual(document.schemaVersion, "R1I-INTERRUPTED-SERIAL-ATTEMPT-SEAL-v1", "schemaVersion");
  assertEqual(
    document.sealId,
    "A8R-V2P1-INTERRUPTED-SERIAL-ATTEMPT-20260831-R1I-SEAL",
    "sealId",
  );
  assertEqual(
    document.classification,
    "PASS-R1I-INTERRUPTED-SERIAL-ATTEMPT-EVIDENCE-SEALED",
    "classification",
  );
  if (!/^[0-9a-f]{40}$/.test(document.sealingBaselineCommit)) {
    fail("sealingBaselineCommit must be a full Git commit");
  }
  if (Number.isNaN(Date.parse(document.recordedAt))) {
    fail("recordedAt must be an ISO date-time");
  }

  assertEqual(
    document.sourceIncident.eventCommit,
    "b522f1a37814164dff18390ee23d5153d4499375",
    "sourceIncident.eventCommit",
  );
  assertEqual(
    document.sourceIncident.terminalIdentity,
    "A8R-V2P1-INTERRUPTED-SERIAL-ATTEMPT-20260831",
    "sourceIncident.terminalIdentity",
  );
  assertEqual(
    document.sourceIncident.terminalClassification,
    "INCONCLUSIVE-R0-HOST-SHUTDOWN-NO-CANONICAL-ARTIFACT",
    "sourceIncident.terminalClassification",
  );
  assertEqual(
    document.pr1Decision.decisionId,
    "IYPT13-PR1-R0-HOST-SHUTDOWN-ROUTE-DECISION-v1",
    "pr1Decision.decisionId",
  );
  assertEqual(
    document.pr1Decision.commit,
    "0f8085b1fda43e4f83d5152cfd99294bc3c0fc29",
    "pr1Decision.commit",
  );

  for (const [label, identity] of [
    ["sourceIncident.report", document.sourceIncident.report],
    ["sourceIncident.machineEvidence", document.sourceIncident.machineEvidence],
    ["sourceIncident.machineEvidenceSidecar", document.sourceIncident.machineEvidenceSidecar],
    ["pr1Decision", document.pr1Decision],
  ]) {
    if (!identity.path || !/^[0-9a-f]{64}$/.test(identity.sha256)) {
      fail(`${label} has an invalid path or SHA-256`);
    }
    if (!/^[0-9a-f]{40}$/.test(identity.gitBlob)) {
      fail(`${label}.gitBlob must be a full Git object id`);
    }
  }

  const old = document.oldWorktree;
  assertEqual(old.path, "/home/cjt/Desktop/iypt/13 涡流摆", "oldWorktree.path");
  assertEqual(old.realpath, old.path, "oldWorktree.realpath");
  assertEqual(old.branch, "main", "oldWorktree.branch");
  assertEqual(old.head, "88c4e9e8ba57b02a06315679e9b30dd10999b30c", "oldWorktree.head");
  assertEqual(old.upstream, "origin/main", "oldWorktree.upstream");
  assertEqual(
    old.localOriginMain,
    "0c44ad25fecd82423e26fb7d6ff8dadd52d67eee",
    "oldWorktree.localOriginMain",
  );
  assertEqual(old.ahead, 0, "oldWorktree.ahead");
  if (!Number.isInteger(old.behind) || old.behind < 1) fail("oldWorktree.behind must be positive");
  assertEqual(old.clean, true, "oldWorktree.clean");
  assertEqual(old.porcelainV2Entries.length, 0, "oldWorktree.porcelainV2Entries.length");
  assertEqual(
    old.originNetworkRefreshPerformedDuringR1i,
    false,
    "oldWorktree.originNetworkRefreshPerformedDuringR1i",
  );
  assertEqual(old.optionalGitLocksDisabled, true, "oldWorktree.optionalGitLocksDisabled");
  assertEqual(old.disposition, "READ_ONLY_HISTORICAL_ARCHIVE_IN_PLACE", "oldWorktree.disposition");
  assertEqual(old.mutatingCommandsExecuted.length, 0, "oldWorktree.mutatingCommandsExecuted.length");
  assertEqual(
    JSON.stringify(old.reuseForbiddenFor),
    JSON.stringify(["H1", "H2", "HW1-primary", "HW1-repeat"]),
    "oldWorktree.reuseForbiddenFor",
  );

  assertEqual(document.processes.length, 3, "processes.length");
  const expectedProcesses = new Map([
    [51467, "npm"],
    [51497, "shell-wrapper"],
    [51498, "node-runner"],
  ]);
  for (const process of document.processes) {
    assertEqual(process.role, expectedProcesses.get(process.pid), `process ${process.pid} role`);
    assertEqual(process.state, "ABSENT", `process ${process.pid} state`);
    expectedProcesses.delete(process.pid);
  }
  assertEqual(expectedProcesses.size, 0, "missing processes");

  assertEqual(document.artifacts.expectedGzip.state, "ABSENT", "expectedGzip.state");
  assertEqual(document.artifacts.expectedSidecar.state, "ABSENT", "expectedSidecar.state");
  assertEqual(document.artifacts.partialArtifacts.length, 0, "partialArtifacts.length");
  assertEqual(document.artifacts.artifactAsserterExecuted, false, "artifactAsserterExecuted");

  const science = document.scientificBoundary;
  assertEqual(science.scientificPayloadInspected, false, "scientificPayloadInspected");
  assertEqual(science.scientificConclusion, "NONE", "scientificConclusion");
  assertEqual(science.recoverableScientificBytes, 0, "recoverableScientificBytes");
  assertEqual(science.creditableCompletedHw1Cases, 0, "creditableCompletedHw1Cases");
  assertEqual(science.partialProgressCredit, 0, "partialProgressCredit");

  for (const [key, value] of Object.entries(document.routeLocks)) {
    if (key.endsWith("Authorized")) assertEqual(value, false, `routeLocks.${key}`);
  }
  assertEqual(document.routeLocks.nextGate, "G1-AND-HW1-V2-FOUNDATION", "routeLocks.nextGate");

  assertEqual(document.validation.r0HashesRecomputedFromEntities, true, "validation.r0HashesRecomputedFromEntities");
  assertEqual(document.validation.oldWorktreeReadOnlyChecksPerformed, true, "validation.oldWorktreeReadOnlyChecksPerformed");
  assertEqual(document.validation.scientificPayloadReadPerformed, false, "validation.scientificPayloadReadPerformed");
  assertEqual(document.validation.networkFetchPerformedAgainstOldWorktree, false, "validation.networkFetchPerformedAgainstOldWorktree");
  assertEqual(document.validation.heavyProbePerformed, false, "validation.heavyProbePerformed");

  walkKeys(document, (key) => {
    if (FORBIDDEN_SCIENTIFIC_KEYS.has(key)) fail(`forbidden scientific key ${key}`);
  });
  return document;
}

export function assertLiveSnapshotMatches(document, snapshot) {
  const old = document.oldWorktree;
  for (const key of [
    "realpath",
    "device",
    "inode",
    "directorySizeBytes",
    "branch",
    "head",
    "upstream",
    "localOriginMain",
    "ahead",
    "behind",
    "currentBootId",
  ]) {
    assertEqual(snapshot[key], old[key], `live oldWorktree.${key}`);
  }
  assertEqual(snapshot.porcelainV2Entries.length, 0, "live porcelainV2Entries.length");
  assertEqual(snapshot.expectedGzipState, "ABSENT", "live expectedGzipState");
  assertEqual(snapshot.expectedSidecarState, "ABSENT", "live expectedSidecarState");
  assertEqual(snapshot.partialArtifacts.length, 0, "live partialArtifacts.length");

  for (const process of document.processes) {
    assertEqual(snapshot.processStates[process.pid], "ABSENT", `live process ${process.pid}`);
  }
  return snapshot;
}

export function sidecarLine(hash, filename) {
  if (!/^[0-9a-f]{64}$/.test(hash)) fail("sidecar hash is not SHA-256");
  if (
    !filename ||
    filename.startsWith("/") ||
    filename.split("/").includes("..") ||
    filename.includes("\n")
  ) {
    fail("sidecar filename must be a safe relative path");
  }
  return `${hash}  ${filename}\n`;
}
