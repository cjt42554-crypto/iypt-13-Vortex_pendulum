/**
 * Result-blind P1 identity and the post-implementation execution stop.
 *
 * This module intentionally grants no solver-execution capability. A later,
 * independently reviewed change must bind an explicit post-P1 Pro decision
 * before any formal solver construction can be authorized.
 */
export const BRINKMAN_MULTIRESOLUTION_V2P1_P1_IDENTITY = Object.freeze({
  format: "VP-A8R-V2P1-RESULT-BLIND-P1-IDENTITY-v1",
  noResultImplementationCommit:
    "d42efeb192f10a433d0f2a02d2a3cb119ac26c42",
  repairReview: Object.freeze({
    commit: "8778844605bdd44404e601d83f88b5d5fa97a8b3",
    relativePath:
      "90_候选工作区/current/A8_二维特征开放边界实验后端/27_A8R_v2_1_网页版Pro无结果实现审查与P1修订裁决.md",
    sha256:
      "1a253d391fe9fde49740e2eb13a580b80e1e290cb44e2ebee0f62d5128c25e54",
    acceptedCoreCode:
      "ACCEPT-A8R-V2P1-PRO-NO-RESULT-SCIENTIFIC-CORE-IN-PRINCIPLE",
    rejectExecutionCode:
      "REJECT-A8R-V2P1-PRO-FORMAL-SMOKE-OR-RESEARCH-UNLOCK",
    requiredRepairCode:
      "REQUIRE-A8R-V2P1-PRO-P1-ASSERTION-REPEAT-PROVENANCE-AND-AUTHORIZATION-REPAIR",
    lockCode:
      "KEEP-A8R-V2P1-PRO-FORMAL-SMOKE-RESEARCH-AND-DOWNSTREAM-LOCKED",
  }),
  executionAuthorization: Object.freeze({
    state: "LOCKED_PENDING_POST_P1_PRO_REVIEW" as const,
    requiredReviewTiming: "AFTER_P1_IMPLEMENTATION" as const,
    authorizedScopes: Object.freeze([]),
  }),
});

/**
 * Fail closed before a formal solver can be constructed.
 *
 * An environment variable, CLI flag, output path, or prior implementation
 * review cannot satisfy this gate. The current P1 deliberately has no unlock
 * branch and therefore cannot run either a smoke case or the research matrix.
 */
export function assertBrinkmanMultiresolutionV2P1ExecutionAuthorized(): void {
  const identity = BRINKMAN_MULTIRESOLUTION_V2P1_P1_IDENTITY;
  throw new Error(
    "A8R v2.1 formal solver execution is locked pending an independent "
      + "post-P1 Pro review; no smoke or research scope is authorized ("
      + identity.repairReview.lockCode + ")",
  );
}
