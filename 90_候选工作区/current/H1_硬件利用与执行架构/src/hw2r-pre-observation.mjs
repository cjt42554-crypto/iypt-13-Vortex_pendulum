import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const HW2R_PRE_OBSERVATION_READINESS_PATH = resolve(
  packageRoot,
  "contracts/hw2r-pre-observation-readiness.v1.json",
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertStringArray(value, label) {
  if (!Array.isArray(value)
    || value.length === 0
    || value.some((item) => typeof item !== "string" || item.length === 0)
    || new Set(value).size !== value.length) {
    throw new Error(`NO-GO-HW2R-PRE-OBSERVATION-GATE: invalid ${label}`);
  }
}

export async function loadHw2rPreObservationReadiness(
  path = HW2R_PRE_OBSERVATION_READINESS_PATH,
) {
  const bytes = await readFile(path);
  const value = JSON.parse(bytes.toString("utf8"));
  if (value.readinessId !== "VP-HW2R-PRE-OBSERVATION-READINESS-v1"
    || value.classification
      !== "result-before-formal-performance-observation-gate"
    || typeof value.formalObservationAuthorized !== "boolean"
    || typeof value.resultBearingScientificRunAuthorized !== "boolean"
    || value.resultBearingScientificRunAuthorized !== false
    || !Array.isArray(value.blockingFindings)
    || value.blockingFindings.length === 0) {
    throw new Error("NO-GO-HW2R-PRE-OBSERVATION-GATE: readiness envelope");
  }
  assertStringArray(value.blockedEntrypoints, "blockedEntrypoints");
  const ids = new Set();
  for (const finding of value.blockingFindings) {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)
      || !/^P[01]-[A-Z0-9-]+$/u.test(finding.id ?? "")
      || !new Set(["OPEN", "CLOSED"]).has(finding.status)
      || ids.has(finding.id)) {
      throw new Error("NO-GO-HW2R-PRE-OBSERVATION-GATE: finding identity");
    }
    ids.add(finding.id);
    assertStringArray(finding.requiredClosure, `${finding.id}.requiredClosure`);
  }
  const transition = value.authorizationTransition;
  if (!transition || transition.allBlockingFindingsMustBeClosed !== true
    || transition.closureEvidenceCommittedAndPushedBeforeObservation !== true
    || transition.cleanMainParityRequired !== true
    || transition.formalObservationMayStartWithoutAnotherProReviewWhenMachineGatePasses
      !== true
    || transition.mandatoryStopAfterQualification
      !== "READY-FOR-PR2B-H3-UNLOCK-REVIEW") {
    throw new Error("NO-GO-HW2R-PRE-OBSERVATION-GATE: transition");
  }
  const openFindings = value.blockingFindings
    .filter(({ status }) => status !== "CLOSED")
    .map(({ id }) => id)
    .sort();
  const authorized = value.formalObservationAuthorized === true
    && openFindings.length === 0;
  return Object.freeze({
    value: Object.freeze(value),
    sha256: sha256(bytes),
    openFindings: Object.freeze(openFindings),
    authorized,
  });
}

export async function assertHw2rFormalObservationAuthorized() {
  const loaded = await loadHw2rPreObservationReadiness();
  if (!loaded.authorized) {
    throw new Error(
      "INCONCLUSIVE-HW2R-PRE-OBSERVATION-IMPLEMENTATION-NOT-READY: "
        + loaded.openFindings.join(","),
    );
  }
  return loaded;
}
