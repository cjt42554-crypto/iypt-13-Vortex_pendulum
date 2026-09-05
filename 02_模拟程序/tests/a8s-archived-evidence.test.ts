import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assessFixedCylinderDisposition,
  type FixedCylinderDispositionCaseEvidence,
} from "../src/validation/cfd2d/fixed-cylinder-disposition";

const ARCHIVE = resolve(
  "../03_研究记录/归档/2026-09-02_baseline-9123b5c6",
  "A8_二维特征开放边界实验后端/验证与复现/disposition/a8s-fixed-cylinder",
);

describe("archived A8S disposition evidence", () => {
  it("remains byte-bound to the unchanged formal LBM and replays the frozen verdict", async () => {
    const artifactPath = resolve(ARCHIVE, "a8s-fixed-cylinder-disposition.json");
    const [artifactBytes, sidecar, formalSolverBytes] = await Promise.all([
      readFile(artifactPath),
      readFile(resolve(ARCHIVE, "a8s-fixed-cylinder-disposition.json.sha256"), "utf8"),
      readFile("src/solvers/highFidelity/lbm.ts"),
    ]);
    const artifactSha256 = createHash("sha256").update(artifactBytes).digest("hex");
    expect(sidecar.trim()).toBe(`${artifactSha256}  a8s-fixed-cylinder-disposition.json`);

    const artifact = JSON.parse(artifactBytes.toString("utf8")) as {
      provenance: { formalSolverSha256: string };
      disposition: {
        cases: FixedCylinderDispositionCaseEvidence[];
        conclusion: string;
      };
    };
    const formalSolverSha256 = createHash("sha256")
      .update(formalSolverBytes)
      .digest("hex");
    expect(formalSolverSha256).toBe(artifact.provenance.formalSolverSha256);

    const replay = assessFixedCylinderDisposition(artifact.disposition.cases);
    expect(replay.primaryGrid.passed).toBe(true);
    expect(Object.values(replay.sensitivitiesAtD16).every((item) => item.passed))
      .toBe(true);
    expect(replay.fineGridLiteraturePassed).toBe(false);
    expect(replay.conclusion).toBe(artifact.disposition.conclusion);
    expect(replay.conclusion).toBe("FREEZE-A8S-2D-CFD-QUALITATIVE-ONLY");
  });
});
