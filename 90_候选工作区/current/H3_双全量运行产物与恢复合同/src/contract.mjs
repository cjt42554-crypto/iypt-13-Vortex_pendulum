import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readJson,
  sha256File,
} from "../../_shared/src/identity.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const H3P_CONTRACT_PATH = resolve(
  packageRoot,
  "contracts/h3-artifact-shard-recovery.v1.json",
);

export async function loadH3pContract() {
  const contract = await readJson(H3P_CONTRACT_PATH);
  if (contract.contractId
    !== "VP-H3-DUAL-FULL-RUN-ARTIFACT-SHARD-RECOVERY-CONTRACT-v1") {
    throw new Error("NO-GO-H3P-CONTRACT-OR-SOURCE-DRIFT: contract ID");
  }
  if (contract.freeze.h3ExecutionBeforePr2bForbidden !== true
    || contract.freeze.dryRunOnlyBeforePr2b !== true
    || contract.preflight.automaticUnlockForbidden !== true) {
    throw new Error("NO-GO-H3P-PREMATURE-H3-EXECUTION: lock weakened");
  }
  return Object.freeze({
    contract: Object.freeze(contract),
    contractSha256: await sha256File(H3P_CONTRACT_PATH),
    packageRoot,
  });
}

export function assertH3pDryRunScope(contract, scope) {
  if (scope !== "H3P-SYNTHETIC-DRY-RUN") {
    throw new Error(
      "NO-GO-H3P-PREMATURE-H3-EXECUTION: only synthetic dry-run is available",
    );
  }
  if (contract.dryRun.allowedBeforePr2b !== true
    || contract.dryRun.syntheticOnly !== true
    || contract.dryRun.formalSolverConstructionForbidden !== true
    || contract.dryRun.scientificPayloadForbidden !== true) {
    throw new Error("NO-GO-H3P-PREMATURE-H3-EXECUTION: invalid dry-run gate");
  }
}
