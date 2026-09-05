import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { H2_REPOSITORY_ROOT } from "./contract.mjs";

const frozenContractSource = resolve(
  H2_REPOSITORY_ROOT,
  "90_候选工作区/current/A8_二维特征开放边界实验后端/"
    + "src/brinkman-multiresolution-contract-v2-1.ts",
);

export async function buildH2xQualificationDefinitions(h2xContract) {
  const source = await import(pathToFileURL(frozenContractSource));
  const frozen = source.buildBrinkmanMultiresolutionV2P1Definitions();
  const frozenById = new Map(frozen.map((definition) => [definition.id, definition]));
  const definitions = h2xContract.qualificationCaseMatrix.map((entry) => {
    const base = frozenById.get(entry.caseId);
    if (!base) throw new Error(`NO-GO-H2X-SOURCE-OR-CONTRACT-DRIFT: ${entry.caseId}`);
    if (base.diameterCells !== entry.diameterCells
      || base.maskHalfThicknessCells !== entry.maskHalfThicknessCells
      || base.phaseId !== entry.phaseId) {
      throw new Error(`NO-GO-H2X-SOURCE-OR-CONTRACT-DRIFT: identity ${entry.caseId}`);
    }
    const analysisSamples = entry.qualificationTotalSteps
      - entry.qualificationDiscardSteps;
    if (analysisSamples <= 0 || analysisSamples % 4 !== 0) {
      throw new Error(`NO-GO-H2X-SOURCE-OR-CONTRACT-DRIFT: window ${entry.caseId}`);
    }
    return Object.freeze({
      ...base,
      totalSteps: entry.qualificationTotalSteps,
      discardSteps: entry.qualificationDiscardSteps,
      analysisSamples,
      halfWindowSamples: analysisSamples / 2,
      diagnosticBlockSamples: analysisSamples / 4,
      qualificationIdentity: "H2X-SHORTENED-COMPLETE-CASE-v1",
    });
  });
  return Object.freeze({
    definitions: Object.freeze(definitions),
    canonicalSha256: canonicalSha256(definitions),
  });
}

export function frozenCaseCost(definition) {
  return definition.nx * definition.ny * definition.totalSteps;
}
