import { describe, expect, it } from "vitest";
import {
  FIXED_CYLINDER_DISPOSITION_CASES,
  SINE_ZERO_DISPLACEMENT_HALF_WIDTH_OVER_PENALTY_LAYER,
  assessFixedCylinderDisposition,
  buildFixedCylinderCaseDefinition,
  sineMaskShiftInPenaltyLayerUnits,
  type FixedCylinderDispositionCaseEvidence,
} from "../src/validation/cfd2d/fixed-cylinder-disposition";

function evidence(
  id: string,
  meanDrag: number,
  liftFluctuationRms: number,
  strouhal: number,
): FixedCylinderDispositionCaseEvidence {
  const input = FIXED_CYLINDER_DISPOSITION_CASES.find((item) => item.id === id);
  if (input === undefined) throw new Error(`unknown case ${id}`);
  return {
    format: "VP-A8S-FIXED-CYLINDER-DISPOSITION-CASE-v1",
    definition: buildFixedCylinderCaseDefinition(input),
    metrics: { meanDrag, liftFluctuationRms, strouhal },
    literature: { passed: true },
    execution: { finite: true, stabilityPassed: true },
  };
}

function passingCases(): FixedCylinderDispositionCaseEvidence[] {
  return [
    evidence("a8s-primary-d16", 1.30, 0.45, 0.194),
    evidence("a8s-primary-d24", 1.292, 0.446, 0.195),
    evidence("a8s-primary-d36", 1.289, 0.444, 0.195),
    evidence("a8s-domain-d16", 1.30, 0.45, 0.194),
    evidence("a8s-mach-d16", 1.30, 0.45, 0.194),
    evidence("a8s-phase-d16", 1.30, 0.45, 0.194),
    evidence("a8s-legacy-mask-d16", 1.28, 0.43, 0.196),
  ];
}

describe("formal A8S disposition contract", () => {
  it("freezes the result-independent mask and seven-case matrix", () => {
    expect(sineMaskShiftInPenaltyLayerUnits(
      SINE_ZERO_DISPLACEMENT_HALF_WIDTH_OVER_PENALTY_LAYER,
    )).toBeCloseTo(0, 8);
    expect(FIXED_CYLINDER_DISPOSITION_CASES).toHaveLength(7);
    expect(FIXED_CYLINDER_DISPOSITION_CASES
      .filter((item) => item.role === "primary-grid")
      .map((item) => item.diameterCells)).toEqual([16, 24, 36]);
  });

  it("retains only an independently complete passing matrix", () => {
    const accepted = assessFixedCylinderDisposition(passingCases());
    expect(accepted.primaryGrid.passed).toBe(true);
    expect(accepted.conclusion)
      .toBe("RETAIN-A8S-2D-CFD-AUXILIARY-QUANTITATIVE-CANDIDATE");

    const failed = passingCases();
    const fine = failed.find((item) => item.definition.id === "a8s-primary-d36");
    if (fine === undefined) throw new Error("fine case missing");
    failed[failed.indexOf(fine)] = { ...fine, literature: { passed: false } };
    expect(assessFixedCylinderDisposition(failed).conclusion)
      .toBe("FREEZE-A8S-2D-CFD-QUALITATIVE-ONLY");
  });

  it("rejects incomplete or duplicate case evidence", () => {
    expect(() => assessFixedCylinderDisposition(passingCases().slice(0, 6)))
      .toThrow(/exact seven-case/u);
    const duplicate = passingCases();
    duplicate[6] = duplicate[0] as FixedCylinderDispositionCaseEvidence;
    expect(() => assessFixedCylinderDisposition(duplicate))
      .toThrow(/exactly one/u);
  });
});
