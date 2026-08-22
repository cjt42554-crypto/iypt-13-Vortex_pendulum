#!/usr/bin/env -S npx vite-node

import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

interface FrozenArtifact {
  path: string;
  bytes: number;
  sha256: string;
  category: "cfd2d-legacy" | "mixed-cross-layer" | "other-historical";
  companionManifest: string;
}

interface FrozenIndex {
  format: "VP-TREND-CONFLICT-A0-ARTIFACT-INDEX-v1";
  originalFilesRemainUnmodified: boolean;
  artifactCount: number;
  artifacts: FrozenArtifact[];
}

const projectRoot = resolve(import.meta.dirname, "..");
const indexPath = resolve(projectRoot, "artifacts/legacy-a0/legacy-artifact-index.json");
const reportPath = resolve(
  projectRoot,
  process.argv[2] ?? "artifacts/legacy-a0/a0-artifact-integrity-report.json",
);

async function sha256(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

const index = JSON.parse(await readFile(indexPath, "utf8")) as FrozenIndex;
if (index.format !== "VP-TREND-CONFLICT-A0-ARTIFACT-INDEX-v1") {
  throw new Error(`unsupported A0 index: ${String(index.format)}`);
}
const checks = [];
for (const artifact of index.artifacts) {
  const sourcePath = resolve(projectRoot, artifact.path);
  const companionPath = resolve(projectRoot, artifact.companionManifest);
  const metadata = await stat(sourcePath);
  const companion = JSON.parse(await readFile(companionPath, "utf8")) as {
    format?: string;
    source?: { path?: string; bytes?: number; sha256?: string };
    validAsExecuted?: boolean;
    physicalLoadValidation?: string;
    apparatusTrendEvidence?: string;
    knownDefects?: string[];
  };
  const actualSha256 = await sha256(sourcePath);
  const sourceIdentityMatches = metadata.size === artifact.bytes
    && actualSha256 === artifact.sha256;
  const companionIdentityMatches = companion.format
      === "VP-TREND-CONFLICT-LEGACY-ARTIFACT-v1"
    && companion.source?.path === artifact.path
    && companion.source.bytes === artifact.bytes
    && companion.source.sha256 === artifact.sha256
    && companion.validAsExecuted === true;
  const cfdWithdrawalExplicit = artifact.category === "other-historical"
    || (companion.physicalLoadValidation === "withdrawn"
      && companion.apparatusTrendEvidence === "withdrawn"
      && Array.isArray(companion.knownDefects)
      && companion.knownDefects.length > 0);
  checks.push({
    path: artifact.path,
    sourceIdentityMatches,
    companionIdentityMatches,
    cfdWithdrawalExplicit,
    expectedSha256: artifact.sha256,
    actualSha256,
  });
}
const passed = index.originalFilesRemainUnmodified === true
  && index.artifactCount === index.artifacts.length
  && checks.every((check) => check.sourceIdentityMatches
    && check.companionIdentityMatches
    && check.cfdWithdrawalExplicit);
const report = {
  format: "VP-TREND-CONFLICT-A0-INTEGRITY-REPORT-v1",
  createdAt: new Date().toISOString(),
  indexPath,
  status: passed ? "PASS" : "STOP-A0-ARTIFACT-INTEGRITY",
  artifactCount: checks.length,
  checks,
};
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  status: report.status,
  artifactCount: report.artifactCount,
  reportPath,
}, null, 2)}\n`);
if (!passed) process.exitCode = 2;
