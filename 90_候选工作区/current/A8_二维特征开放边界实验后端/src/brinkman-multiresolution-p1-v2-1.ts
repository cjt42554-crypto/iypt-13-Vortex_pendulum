/** Result-blind P1 identity plus the narrowly scoped post-P1 smoke unlock. */
export const BRINKMAN_MULTIRESOLUTION_V2P1_EXECUTION_SCOPES = Object.freeze({
  forcedFixedCylinderSmoke40:
    "FORMAL_FORCED_FIXED_CYLINDER_SMOKE_40" as const,
  unforcedBodyNullSmoke40:
    "FORMAL_UNFORCED_BODY_NULL_SMOKE_40" as const,
  researchMatrix: "RESEARCH_MATRIX" as const,
});

export type BrinkmanMultiresolutionV2P1ExecutionScope =
  typeof BRINKMAN_MULTIRESOLUTION_V2P1_EXECUTION_SCOPES[keyof
    typeof BRINKMAN_MULTIRESOLUTION_V2P1_EXECUTION_SCOPES];

export const BRINKMAN_MULTIRESOLUTION_V2P1_P1_IDENTITY = Object.freeze({
  format: "VP-A8R-V2P1-RESULT-BLIND-P1-IDENTITY-v1",
  noResultImplementationCommit:
    "d42efeb192f10a433d0f2a02d2a3cb119ac26c42",
  p1ImplementationCommit:
    "ffc382921ae31db02f7517866b26330a4b0a2eff",
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
  smokeUnlockReview: Object.freeze({
    commit: "964225d51ef15fbe5a6ab9cb0e2b9d1da031d08d",
    relativePath:
      "90_候选工作区/current/A8_二维特征开放边界实验后端/28_A8R_v2_1_P1_网页版Pro独立审查与双40步正式烟雾解锁裁决.md",
    sha256:
      "d16cc0c3dd0517c7795f102da74108b61d02088ca97a44e8a594ba83cffc9c9d",
    acceptedCode:
      "ACCEPT-A8R-V2P1-PRO-P1-RESULT-BLIND-REPAIR",
    unlockCode:
      "UNLOCK-A8R-V2P1-PRO-DUAL-FORMAL-40-STEP-SMOKE-ONLY",
    requiredCode:
      "REQUIRE-A8R-V2P1-PRO-SCOPED-SMOKE-AUTHORIZATION-AND-SEPARATE-EVIDENCE-COMMIT",
    lockCode:
      "KEEP-A8R-V2P1-PRO-RESEARCH-MATRIX-ARTIFACT-AND-DOWNSTREAM-LOCKED",
  }),
  executionAuthorization: Object.freeze({
    state: "DUAL_FORMAL_40_STEP_SMOKE_ONLY" as const,
    requiredReviewTiming: "AFTER_P1_IMPLEMENTATION" as const,
    authorizedScopes: Object.freeze([
      BRINKMAN_MULTIRESOLUTION_V2P1_EXECUTION_SCOPES
        .forcedFixedCylinderSmoke40,
      BRINKMAN_MULTIRESOLUTION_V2P1_EXECUTION_SCOPES
        .unforcedBodyNullSmoke40,
    ]),
    lockedScopes: Object.freeze([
      BRINKMAN_MULTIRESOLUTION_V2P1_EXECUTION_SCOPES.researchMatrix,
    ]),
  }),
});

/**
 * Fail closed before a formal solver can be constructed outside either one of
 * the two exact 40-step smoke scopes.
 *
 * An environment variable, CLI flag, output path, or prior implementation
 * review cannot satisfy this gate. In particular, RESEARCH_MATRIX always
 * remains denied by this post-P1 decision.
 */
export function assertBrinkmanMultiresolutionV2P1ExecutionAuthorized(
  scope: BrinkmanMultiresolutionV2P1ExecutionScope,
): void {
  const identity = BRINKMAN_MULTIRESOLUTION_V2P1_P1_IDENTITY;
  if ((identity.executionAuthorization.authorizedScopes as readonly string[])
    .includes(scope)) {
    return;
  }
  throw new Error(
    `A8R v2.1 execution scope ${String(scope)} is not authorized; `
      + "the research matrix, research artifact, and downstream work remain "
      + `locked (${identity.smokeUnlockReview.lockCode})`,
  );
}
