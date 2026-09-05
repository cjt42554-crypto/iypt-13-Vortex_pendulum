import { canonicalSha256 } from "../../_shared/src/canonical.mjs";

function fail(message) {
  throw new Error(`NO-GO-H2N-FULL-EVIDENCE-ENVELOPE: ${message}`);
}

function hash(value, label) {
  if (!/^[0-9a-f]{64}$/u.test(value ?? "")) fail(`${label} is invalid`);
}

export function validateH2nFullEvidenceEnvelope(
  value,
  contract,
  expectedImplementationCommit,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("summary is not an object");
  }
  if (value.format
      !== "VP-H2N-FULL-NUMERICAL-QUALIFICATION-SUMMARY-v1"
    || value.contractSha256 !== contract.contractSha256
    || value.classification
      !== contract.contract.fullQualification.passCode
    || value.pass !== true
    || value.matrixComplete !== true
    || value.negativeCasesPass !== true
    || value.independentReferencePass !== true
    || value.safety?.pass !== true
    || value.provenance?.pass !== true
    || value.scientificValuesPersisted !== false
    || value.scientificValuesHumanRead !== false
    || value.scientificConclusion !== "NONE") {
    fail("required pass boundary is incomplete");
  }
  const implementationCommit = value.backendImplementationCommit
    ?? value.implementationCommit;
  if (implementationCommit !== expectedImplementationCommit
    || !/^[0-9a-f]{40}$/u.test(implementationCommit ?? "")) {
    fail("implementation commit drift");
  }
  hash(value.implementationTreeSha256, "implementationTreeSha256");
  hash(value.matrixIdentitySha256, "matrixIdentitySha256");
  hash(value.coverageSha256, "coverageSha256");
  hash(value.provenance.identitySha256, "provenance.identitySha256");
  if (!Number.isSafeInteger(value.matrixCaseCount)
    || value.matrixCaseCount < 1
    || !Array.isArray(value.qualifiedBackendVariants)
    || value.qualifiedBackendVariants.length < 1
    || new Set(value.qualifiedBackendVariants).size
      !== value.qualifiedBackendVariants.length
    || value.qualifiedBackendVariants.some((item) =>
      typeof item !== "string" || item.length === 0)) {
    fail("matrix or backend variants are invalid");
  }
  const { evidenceHash, ...body } = value;
  hash(evidenceHash, "evidenceHash");
  if (canonicalSha256(body) !== evidenceHash) {
    fail("evidence hash mismatch");
  }
  return Object.freeze({
    value,
    implementationCommit,
    qualifiedBackendVariants: Object.freeze([
      ...value.qualifiedBackendVariants,
    ]),
  });
}
