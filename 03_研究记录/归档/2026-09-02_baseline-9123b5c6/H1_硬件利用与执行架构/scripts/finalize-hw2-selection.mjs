import { resolve } from "node:path";

import {
  readCanonicalGzipWithSidecar,
  writeCanonicalGzipWithSidecarExclusive,
} from "../../_shared/src/atomic.mjs";
import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import {
  loadH2nContract,
  loadH2xContract,
} from "../../H2_代表性执行与数值资格/src/contract.mjs";
import { validateH2nFullEvidenceEnvelope } from
  "../../H2_代表性执行与数值资格/src/h2n-full-evidence.mjs";
import {
  assertCleanMainParityAndIdentity,
  HW2_FINALIZATION_IMPLEMENTATION_PATHS,
} from "../../H2_代表性执行与数值资格/src/repository-preflight.mjs";
import { loadHw2rProtocol } from "../src/hw2r-contract.mjs";
import {
  buildQualificationAwareEvaluations,
  classifyH2nStage0Performance,
  h2nVariantForCandidate,
} from "../src/hw2r-finalization.mjs";
import { selectFinalHw2rCandidate } from "../src/hw2r-evaluator.mjs";

const AUTHORIZATION = "BATCH-PR2-HW2R-H2X-H2N-AND-H3-READINESS";

function parseArguments(argv) {
  const value = (name) => {
    const index = argv.indexOf(name);
    return index < 0 ? null : argv[index + 1];
  };
  const outputPath = value("--output");
  const hw2rSummaryPath = value("--hw2r-summary");
  const h2xSummaryPath = value("--h2x-summary");
  const h2nStage0SummaryPath = value("--h2n-stage0-summary");
  const h2nFullSummaryPath = value("--h2n-full-summary");
  if (value("--authorization") !== AUTHORIZATION
    || !outputPath || !hw2rSummaryPath || !h2xSummaryPath
    || !h2nStage0SummaryPath) {
    throw new Error(
      "usage: finalize-hw2-selection.mjs --authorization "
        + `${AUTHORIZATION} --hw2r-summary PATH --h2x-summary PATH `
        + "--h2n-stage0-summary PATH [--h2n-full-summary PATH] "
        + "--output NEW.json.gz",
    );
  }
  return Object.freeze({
    outputPath: resolve(outputPath),
    hw2rSummaryPath: resolve(hw2rSummaryPath),
    h2xSummaryPath: resolve(h2xSummaryPath),
    h2nStage0SummaryPath: resolve(h2nStage0SummaryPath),
    h2nFullSummaryPath: h2nFullSummaryPath
      ? resolve(h2nFullSummaryPath)
      : null,
  });
}

async function readGzipJson(path) {
  return (await readCanonicalGzipWithSidecar(path)).value;
}

const options = parseArguments(process.argv.slice(2));
const [
  { protocol, sha256: protocolSha256 },
  h2xContract,
  h2nContract,
  hw2r,
  h2x,
  h2nStage0,
  h2nFullRaw,
  preflight,
] = await Promise.all([
  loadHw2rProtocol(),
  loadH2xContract(),
  loadH2nContract(),
  readGzipJson(options.hw2rSummaryPath),
  readGzipJson(options.h2xSummaryPath),
  readGzipJson(options.h2nStage0SummaryPath),
  options.h2nFullSummaryPath
    ? readGzipJson(options.h2nFullSummaryPath)
    : Promise.resolve(null),
  assertCleanMainParityAndIdentity(HW2_FINALIZATION_IMPLEMENTATION_PATHS),
]);
if (hw2r.pass !== true
  || hw2r.format !== "VP-HW2R-REPRESENTATIVE-QUALIFICATION-EVIDENCE-v2"
  || hw2r.classification !== protocol.passCode
  || hw2r.protocolSha256 !== protocolSha256
  || h2x.format
    !== "VP-H2X-THREE-INDEPENDENT-ENVIRONMENT-QUALIFICATION-v2"
  || h2x.equivalencePass !== true
  || h2x.contractSha256 !== h2xContract.contractSha256
  || h2nStage0.format !== "VP-H2N-STAGE0-NUMERICAL-MATRIX-SUMMARY-v2"
  || h2nStage0.contractSha256 !== h2nContract.contractSha256
  || h2nStage0.matrixComplete !== true
  || h2nStage0.safety?.pass !== true) {
  throw new Error(
    "INCONCLUSIVE-HW2R-MEASUREMENT-OR-RESOURCE: qualification evidence",
  );
}
const implementationCommits = new Set([
  hw2r.implementationCommit,
  h2x.implementationCommit,
  h2nStage0.implementationCommit,
]);
if (implementationCommits.size !== 1) {
  throw new Error(
    "INCONCLUSIVE-HW2R-MEASUREMENT-OR-RESOURCE: implementation drift",
  );
}
const expectedImplementationCommit = hw2r.implementationCommit;
const h2nFull = h2nFullRaw === null
  ? null
  : validateH2nFullEvidenceEnvelope(
    h2nFullRaw,
    h2nContract,
    expectedImplementationCommit,
  ).value;

const h2nStage0Performance = classifyH2nStage0Performance(
  protocol,
  hw2r.candidates,
  hw2r.h2xComparator,
  h2nStage0,
);
const h2xPass = h2x.pass === true
  && h2x.classification === h2xContract.contract.passCode;
const fullH2nVariants = h2nFull === null
  ? []
  : [...h2nFull.qualifiedBackendVariants];
const requiredVariantQualified = !h2nStage0Performance.fullQualificationRequired
  || fullH2nVariants.includes(h2nStage0Performance.backendVariant);
const finalEvaluations = buildQualificationAwareEvaluations({
  protocol,
  measurements: hw2r.candidates,
  baseline: hw2r.baseline,
  h2xPass,
  fullH2nVariants,
});
const selection = selectFinalHw2rCandidate(protocol, finalEvaluations);
const selectedMeasurement = hw2r.candidates.find(({ candidate }) =>
  candidate.candidateId === selection.selectedCandidateId);
const selectedVariant = selectedMeasurement
  ? h2nVariantForCandidate(selectedMeasurement.candidate)
  : null;
const selectedQualificationPass = selectedVariant === null
  ? h2xPass
  : fullH2nVariants.includes(selectedVariant);
const finalPass = requiredVariantQualified
  && selection.pass
  && selectedQualificationPass
  && h2x.safety?.pass === true
  && h2nStage0.safety?.pass === true
  && hw2r.safety?.pass === true;
const classification = finalPass
  ? "PASS-HW2-FINAL-HARDWARE-SELECTION-CANDIDATE-ONLY"
  : h2nStage0Performance.fullQualificationRequired
      && !requiredVariantQualified
    ? "INCONCLUSIVE-HW2R-PENDING-FULL-H2N"
    : selection.classification;
const summary = {
  format: "VP-HW2-FINAL-HARDWARE-SELECTION-EVIDENCE-v1",
  authorization: AUTHORIZATION,
  protocolSha256,
  h2xContractSha256: h2xContract.contractSha256,
  h2nContractSha256: h2nContract.contractSha256,
  implementationCommit: hw2r.implementationCommit,
  finalizationExecutionCommit: preflight.executionCommit,
  finalizationImplementationTreeSha256:
    preflight.implementationTreeSha256,
  inputEvidence: {
    hw2rCanonicalSha256: canonicalSha256(hw2r),
    h2xCanonicalSha256: canonicalSha256(h2x),
    h2nStage0CanonicalSha256: canonicalSha256(h2nStage0),
    h2nFullCanonicalSha256: h2nFull ? canonicalSha256(h2nFull) : null,
  },
  h2xComparator: hw2r.h2xComparator,
  h2xPass,
  h2nStage0Performance,
  fullH2nVariants,
  requiredVariantQualified,
  selectedQualificationPass,
  finalEvaluations,
  selection,
  pass: finalPass,
  classification,
  nextRequiredStage: finalPass
    ? "H3-READINESS-AND-PR2B-REVIEW"
    : classification === "INCONCLUSIVE-HW2R-PENDING-FULL-H2N"
      ? "H2N-FULL-NUMERICAL-QUALIFICATION"
      : "STOP-HW2-QUALIFICATION-NO-GO-OR-INCONCLUSIVE",
  h3Unlock: false,
  fullResultBearingRunPerformed: false,
  scientificValuesPersisted: false,
  scientificValuesHumanRead: false,
  scientificConclusion: "NONE",
};
const written = await writeCanonicalGzipWithSidecarExclusive(
  options.outputPath,
  summary,
);
process.stdout.write(`${JSON.stringify({
  pass: finalPass,
  classification,
  selectedCandidateId: selection.selectedCandidateId,
  h2nStage0Classification: h2nStage0Performance.classification,
  requiredVariantQualified,
  summaryStoredSha256: written.artifact.storedSha256,
  summaryCanonicalSha256: written.artifact.canonicalSha256,
  sidecarSha256: written.sidecar.sha256,
  scientificValuesPersisted: false,
})}\n`);
if (!finalPass) {
  process.exitCode = classification === "INCONCLUSIVE-HW2R-PENDING-FULL-H2N"
    ? 3
    : 1;
}
