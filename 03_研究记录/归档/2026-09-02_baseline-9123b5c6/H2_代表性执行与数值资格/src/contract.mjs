import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readJson,
  sha256File,
  verifyBindings,
} from "../../_shared/src/identity.mjs";

export const H2_PACKAGE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const H2_REPOSITORY_ROOT = resolve(H2_PACKAGE_ROOT, "../../..");
export const H2X_CONTRACT_PATH = resolve(
  H2_PACKAGE_ROOT,
  "contracts/h2x-exact-execution-equivalence.v1.json",
);
export const H2N_CONTRACT_PATH = resolve(
  H2_PACKAGE_ROOT,
  "contracts/h2n-numerical-backend-qualification.v1.json",
);

export async function loadH2xContract({ verifySources = true } = {}) {
  const contract = await readJson(H2X_CONTRACT_PATH);
  if (contract.contractId !== "VP-H2X-EXACT-EXECUTION-EQUIVALENCE-CONTRACT-v1"
    || contract.freeze.resultBlind !== true
    || contract.freeze.fullEightCaseResultBearingRunForbidden !== true
    || contract.freeze.runtimeFallbackForbidden !== true
    || contract.h3UnlockForbidden !== true) {
    throw new Error("NO-GO-H2X-SOURCE-OR-CONTRACT-DRIFT");
  }
  const sourceIdentity = verifySources
    ? await verifyBindings(H2_REPOSITORY_ROOT, contract.sourceBindings)
    : null;
  return Object.freeze({
    contract: Object.freeze(contract),
    contractSha256: await sha256File(H2X_CONTRACT_PATH),
    sourceIdentity,
  });
}

export async function loadH2nContract({ verifySources = true } = {}) {
  const contract = await readJson(H2N_CONTRACT_PATH);
  if (contract.contractId
    !== "VP-H2N-NUMERICAL-BACKEND-QUALIFICATION-CONTRACT-v1"
    || contract.freeze.resultBlind !== true
    || contract.freeze.runtimeFallbackForbidden !== true
    || contract.h3UnlockForbidden !== true) {
    throw new Error("NO-GO-H2N-SOURCE-OR-IDENTITY-DRIFT");
  }
  const sourceIdentity = verifySources
    ? await verifyBindings(H2_REPOSITORY_ROOT, contract.referenceBindings)
    : null;
  return Object.freeze({
    contract: Object.freeze(contract),
    contractSha256: await sha256File(H2N_CONTRACT_PATH),
    sourceIdentity,
  });
}
