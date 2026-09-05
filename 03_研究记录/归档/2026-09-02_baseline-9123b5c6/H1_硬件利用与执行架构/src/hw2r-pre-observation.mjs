import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const HW2R_PRE_OBSERVATION_READINESS_PATH = resolve(
  packageRoot,
  "contracts/hw2r-pre-observation-readiness.v2.json",
);

export const HW2R_FORMAL_OBSERVATION_PASS_CODE =
  "PASS-PR2A-HW2R-FORMAL-OBSERVATION-READY";

const FORMAL_ENTRYPOINTS = new Set([
  "run-hw2r-qualification-v2.mjs",
  "finalize-hw2-selection.mjs",
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isSha256(value) {
  return /^[0-9a-f]{64}$/u.test(value ?? "");
}

function assertStringArray(value, label) {
  if (!Array.isArray(value)
    || value.length === 0
    || value.some((item) => typeof item !== "string" || item.length === 0)
    || new Set(value).size !== value.length) {
    throw new Error(`NO-GO-HW2R-PRE-OBSERVATION-GATE: invalid ${label}`);
  }
}

function assertClosureEvidence(finding) {
  if (!Array.isArray(finding.closureEvidence)) {
    throw new Error(
      `NO-GO-HW2R-PRE-OBSERVATION-GATE: ${finding.id} closureEvidence`,
    );
  }
  if (finding.status === "CLOSED" && finding.closureEvidence.length === 0) {
    throw new Error(
      `NO-GO-HW2R-PRE-OBSERVATION-GATE: ${finding.id} closed without evidence`,
    );
  }
  for (const [index, evidence] of finding.closureEvidence.entries()) {
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)
      || !/^[0-9a-f]{40}$/u.test(evidence.commit ?? "")
      || typeof evidence.validation !== "string"
      || evidence.validation.length === 0) {
      throw new Error(
        `NO-GO-HW2R-PRE-OBSERVATION-GATE: ${finding.id} evidence ${index}`,
      );
    }
    assertStringArray(
      evidence.paths,
      `${finding.id}.closureEvidence[${index}].paths`,
    );
  }
}

function sealComplete(seal) {
  return seal
    && typeof seal.manifestPath === "string"
    && seal.manifestPath.length > 0
    && isSha256(seal.manifestStoredSha256)
    && isSha256(seal.manifestCanonicalSha256)
    && typeof seal.sidecarPath === "string"
    && seal.sidecarPath.length > 0
    && isSha256(seal.sidecarSha256);
}

export function isHw2rFormalEntrypoint(entrypoint = process.argv[1] ?? "") {
  const name = String(entrypoint).split(/[\\/]/u).at(-1) ?? "";
  return FORMAL_ENTRYPOINTS.has(name);
}

export async function loadHw2rPreObservationReadiness(
  path = HW2R_PRE_OBSERVATION_READINESS_PATH,
) {
  const bytes = await readFile(path);
  const value = JSON.parse(bytes.toString("utf8"));
  if (value.readinessId !== "VP-HW2R-PRE-OBSERVATION-READINESS-v2"
    || value.supersedesReadinessId
      !== "VP-HW2R-PRE-OBSERVATION-READINESS-v1"
    || value.classification
      !== "result-before-formal-performance-observation-gate"
    || value.requiredPassCode !== HW2R_FORMAL_OBSERVATION_PASS_CODE
    || !Array.isArray(value.legacyPassCodesRejected)
    || !value.legacyPassCodesRejected.includes(
      "PASS-HW2R-PRE-OBSERVATION-READINESS",
    )
    || !new Set(["NOT_READY", "READY"]).has(value.status)
    || typeof value.formalObservationAuthorized !== "boolean"
    || value.resultBearingScientificRunAuthorized !== false
    || !Array.isArray(value.blockingFindings)
    || value.blockingFindings.length !== 7
    || !Array.isArray(value.postObservationPrePr2bRequirements)
    || value.postObservationPrePr2bRequirements.length === 0) {
    throw new Error("NO-GO-HW2R-PRE-OBSERVATION-GATE: readiness envelope");
  }
  assertStringArray(value.blockedEntrypoints, "blockedEntrypoints");
  const ids = new Set();
  for (const finding of value.blockingFindings) {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)
      || !/^P0-[A-Z0-9-]+$/u.test(finding.id ?? "")
      || !new Set(["OPEN", "CLOSED"]).has(finding.status)
      || ids.has(finding.id)) {
      throw new Error("NO-GO-HW2R-PRE-OBSERVATION-GATE: finding identity");
    }
    ids.add(finding.id);
    assertStringArray(finding.requiredClosure, `${finding.id}.requiredClosure`);
    assertClosureEvidence(finding);
  }
  const transition = value.authorizationTransition;
  if (!transition || transition.allBlockingFindingsMustBeClosed !== true
    || transition.closureEvidenceCommittedAndPushedBeforeObservation !== true
    || transition.cleanMainParityRequired !== true
    || transition.preObservationManifestAndSidecarRequired !== true
    || transition.attainedPassCodeMustEqualRequiredPassCode !== true
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
  const sealIsComplete = sealComplete(value.preObservationSeal);
  const passCodeMatches = value.attainedPassCode
    === HW2R_FORMAL_OBSERVATION_PASS_CODE;
  const authorized = value.status === "READY"
    && value.formalObservationAuthorized === true
    && openFindings.length === 0
    && sealIsComplete
    && passCodeMatches;
  return Object.freeze({
    value: Object.freeze(value),
    sha256: sha256(bytes),
    openFindings: Object.freeze(openFindings),
    sealIsComplete,
    passCodeMatches,
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

export async function assertHw2rFormalEntrypointAuthorized(
  entrypoint = process.argv[1] ?? "",
) {
  if (!isHw2rFormalEntrypoint(entrypoint)) return null;
  return assertHw2rFormalObservationAuthorized();
}
