import { describe, expect, it } from "vitest";
import { P0_REVISION_IDENTITY } from "../src/model-identity";

describe("parallel revision identity", () => {
  it("keeps theory family, closure, solver and CFD reference identities distinct", () => {
    const ids = [
      P0_REVISION_IDENTITY.theoryFamilyId,
      P0_REVISION_IDENTITY.closurePackageId,
      P0_REVISION_IDENTITY.forwardSolverCandidateId,
      P0_REVISION_IDENTITY.sectionalFluidReferenceId,
      P0_REVISION_IDENTITY.structuralAnalysisCandidateId,
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(P0_REVISION_IDENTITY.originalFilesModified).toBe(false);
    expect(P0_REVISION_IDENTITY.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
  });
});
