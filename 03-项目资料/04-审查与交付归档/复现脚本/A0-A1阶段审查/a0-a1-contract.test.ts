import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SimulationConfig } from "../src/core/types";
import {
  A1_ANALYSIS_CONTRACT_ID,
  A1_FORCE_CONTRACT_ID,
  provenanceContractHashes,
} from "../src/core/provenance";

interface LegacyBaseline {
  format: string;
  cases: Array<{ id: string; config: SimulationConfig; traceSha256: string }>;
}

const baseline = JSON.parse(readFileSync(
  new URL("../artifacts/legacy-a0/a1-legacy-baseline.json", import.meta.url),
  "utf8",
)) as LegacyBaseline;

describe("A0/A1 governance and provenance contracts", () => {
  it("retains the known shared-physical-input identity while separating contracts", async () => {
    const config = baseline.cases.find(({ id }) => id === "cfd-weak-fsi-d12-default-12s")?.config;
    expect(config).toBeDefined();
    if (config === undefined) return;
    const forward = await provenanceContractHashes(config, "forward");
    const cfd = await provenanceContractHashes(config, "highFidelity");
    expect(forward.sharedPhysicalInputHash).toBe(
      "31fd41642ad55f3369ec0173a44f1ae6a58b5509df76a13b9952cc941babc6a2",
    );
    expect(cfd.sharedPhysicalInputHash).toBe(forward.sharedPhysicalInputHash);
    expect(cfd.backendDynamicsContractHash).not.toBe(forward.backendDynamicsContractHash);
    expect(cfd.analysisContractHash).not.toBe(forward.analysisContractHash);
    for (const hash of Object.values(cfd)) expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("freezes legacy identities and records exact regression evidence", () => {
    const artifactIndex = JSON.parse(readFileSync(
      new URL("../artifacts/legacy-a0/legacy-artifact-index.json", import.meta.url),
      "utf8",
    )) as {
      format: string;
      originalFilesRemainUnmodified: boolean;
      artifactCount: number;
      artifacts: Array<{ sha256: string; companionManifest: string }>;
    };
    const regression = JSON.parse(readFileSync(
      new URL("../artifacts/legacy-a0/a1-legacy-regression.json", import.meta.url),
      "utf8",
    )) as {
      status: string;
      comparisons: Array<{ exact: boolean; expectedTraceSha256: string; actualTraceSha256: string }>;
    };
    expect(artifactIndex.format).toBe("VP-TREND-CONFLICT-A0-ARTIFACT-INDEX-v1");
    expect(artifactIndex.originalFilesRemainUnmodified).toBe(true);
    expect(artifactIndex.artifactCount).toBe(artifactIndex.artifacts.length);
    expect(artifactIndex.artifactCount).toBeGreaterThan(0);
    expect(artifactIndex.artifacts.every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256)))
      .toBe(true);
    expect(regression.status).toBe("PASS");
    expect(regression.comparisons).toHaveLength(baseline.cases.length);
    expect(regression.comparisons.every((comparison) => comparison.exact
      && comparison.expectedTraceSha256 === comparison.actualTraceSha256)).toBe(true);
  });

  it("keeps the first-batch identities explicit", () => {
    expect(A1_FORCE_CONTRACT_ID).toBe("VP-CFD2D-RAW-BRINKMAN-A1-v1");
    expect(A1_ANALYSIS_CONTRACT_ID).toBe("VP-ANALYSIS-APPLIED-DIAGNOSTIC-A1-v1");
  });
});
