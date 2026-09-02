import assert from "node:assert/strict";
import test from "node:test";

import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { validateH2nFullEvidenceEnvelope } from
  "../src/h2n-full-evidence.mjs";

const implementationCommit = "a".repeat(40);
const contract = {
  contractSha256: "b".repeat(64),
  contract: {
    fullQualification: {
      passCode: "PASS-H2N-NUMERICALLY-QUALIFIED-BACKEND-CANDIDATE-ONLY",
    },
  },
};

function validEnvelope() {
  const body = {
    format: "VP-H2N-FULL-NUMERICAL-QUALIFICATION-SUMMARY-v1",
    contractSha256: contract.contractSha256,
    backendImplementationCommit: implementationCommit,
    implementationTreeSha256: "c".repeat(64),
    matrixIdentitySha256: "d".repeat(64),
    coverageSha256: "e".repeat(64),
    matrixComplete: true,
    matrixCaseCount: 24,
    negativeCasesPass: true,
    independentReferencePass: true,
    safety: { pass: true },
    provenance: { pass: true, identitySha256: "f".repeat(64) },
    qualifiedBackendVariants: ["cpu-openmp"],
    pass: true,
    classification:
      "PASS-H2N-NUMERICALLY-QUALIFIED-BACKEND-CANDIDATE-ONLY",
    scientificValuesPersisted: false,
    scientificValuesHumanRead: false,
    scientificConclusion: "NONE",
  };
  return { ...body, evidenceHash: canonicalSha256(body) };
}

test("full H2-N evidence requires a complete, independently referenced envelope", () => {
  const envelope = validEnvelope();
  const validated = validateH2nFullEvidenceEnvelope(
    envelope,
    contract,
    implementationCommit,
  );
  assert.deepEqual(validated.qualifiedBackendVariants, ["cpu-openmp"]);
});

test("minimal or self-asserted full H2-N summaries fail closed", () => {
  const minimal = {
    pass: true,
    classification:
      "PASS-H2N-NUMERICALLY-QUALIFIED-BACKEND-CANDIDATE-ONLY",
    qualifiedBackendVariants: ["cpu-openmp"],
  };
  assert.throws(
    () => validateH2nFullEvidenceEnvelope(
      minimal,
      contract,
      implementationCommit,
    ),
    /NO-GO-H2N-FULL-EVIDENCE-ENVELOPE/u,
  );
  const drift = validEnvelope();
  drift.matrixCaseCount = 0;
  assert.throws(
    () => validateH2nFullEvidenceEnvelope(
      drift,
      contract,
      implementationCommit,
    ),
    /NO-GO-H2N-FULL-EVIDENCE-ENVELOPE/u,
  );
});
