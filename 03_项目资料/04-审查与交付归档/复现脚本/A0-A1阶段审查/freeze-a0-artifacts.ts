#!/usr/bin/env -S npx vite-node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(projectRoot, "artifacts/legacy-a0");
const indexPath = resolve(outputRoot, "legacy-artifact-index.json");

// A0 is a one-time cut of pre-existing evidence. Re-running discovery after
// A1 would incorrectly relabel new evidence as legacy, so verification has a
// separate command and the frozen index is immutable by default.
try {
  await access(indexPath);
  throw new Error(
    `A0 index already exists; refusing to rescan or overwrite it: ${indexPath}. Run verify:a0-artifacts instead.`,
  );
} catch (error) {
  if (error instanceof Error && error.message.startsWith("A0 index already exists")) throw error;
}

interface FrozenArtifact {
  path: string;
  bytes: number;
  sha256: string;
  category: "cfd2d-legacy" | "mixed-cross-layer" | "other-historical";
  companionManifest: string;
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function filesUnder(root: string): Promise<string[]> {
  const collected: string[] = [];
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (path === outputRoot || path.startsWith(`${outputRoot}${sep}`)) continue;
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) collected.push(path);
    }
  }
  await visit(root);
  return collected.sort();
}

function categoryOf(projectPath: string): FrozenArtifact["category"] {
  if (/high-fidelity|(^|\/)hf-|phase3-(high-fidelity|fixed-cylinder)/.test(projectPath)) {
    return "cfd2d-legacy";
  }
  if (/cross-layer|phase4-structural|phase4-cross-layer/.test(projectPath)) {
    return "mixed-cross-layer";
  }
  return "other-historical";
}

function statusFor(category: FrozenArtifact["category"]): Record<string, unknown> {
  if (category === "cfd2d-legacy") {
    return {
      legacyStatus: "legacy-exploratory-invalidated-for-load-validation",
      validAsExecuted: true,
      executionReproducibility: "valid-as-executed",
      physicalLoadValidation: "withdrawn",
      apparatusTrendEvidence: "withdrawn",
      knownDefects: [
        "applied-and-diagnostic-load-time-level-mismatch",
        "incomplete-stress-contour-diagnostic",
        "explicit-weak-fsi-when-applicable",
        "representative-strip-replication-when-applicable",
        "unclosed-load-convergence",
      ],
    };
  }
  if (category === "mixed-cross-layer") {
    return {
      legacyStatus: "mixed-evidence-contains-invalidated-cfd-load-path",
      validAsExecuted: true,
      executionReproducibility: "valid-as-executed",
      physicalLoadValidation: "withdrawn",
      retainedNonCfdEvidence: "historical-only-no-automatic-upgrade",
      apparatusTrendEvidence: "withdrawn",
      knownDefects: ["contains-or-displays-legacy-cfd2d-load-evidence"],
    };
  }
  return {
    legacyStatus: "historical-frozen-no-automatic-evidence-upgrade",
    validAsExecuted: true,
    executionReproducibility: "valid-as-executed",
  };
}

const artifactFiles = await filesUnder(resolve(projectRoot, "artifacts"));
const packagedEvidence = [
  "deliverables/pro-review-trend-conflict-2026-08-21-core.zip",
  "deliverables/pro-review-trend-conflict-2026-08-21-full.zip",
  "deliverables/pro-review-trend-conflict-2026-08-21.zip",
].map((path) => resolve(projectRoot, path));
const sourceFiles = [...artifactFiles, ...packagedEvidence];
const frozen: FrozenArtifact[] = [];

for (const absolutePath of sourceFiles) {
  const metadata = await stat(absolutePath);
  const projectPath = relative(projectRoot, absolutePath).split(sep).join("/");
  const category = categoryOf(projectPath);
  const companionManifest = `artifacts/legacy-a0/manifests/${projectPath}.legacy-manifest.json`;
  const entry: FrozenArtifact = {
    path: projectPath,
    bytes: metadata.size,
    sha256: await sha256(absolutePath),
    category,
    companionManifest,
  };
  frozen.push(entry);
  const companionPath = resolve(projectRoot, companionManifest);
  await mkdir(dirname(companionPath), { recursive: true });
  await writeFile(companionPath, `${JSON.stringify({
    format: "VP-TREND-CONFLICT-LEGACY-ARTIFACT-v1",
    frozenAt: new Date().toISOString(),
    source: { path: entry.path, bytes: entry.bytes, sha256: entry.sha256 },
    ...statusFor(category),
    replacementPolicy: "preserve-original-create-new-model-and-force-contract-artifacts",
  }, null, 2)}\n`, "utf8");
}

const index = {
  format: "VP-TREND-CONFLICT-A0-ARTIFACT-INDEX-v1",
  ruling: "VP-TREND-CONFLICT-ROUTE-RULING-v1",
  frozenAt: new Date().toISOString(),
  originalFilesRemainUnmodified: true,
  artifactCount: frozen.length,
  artifacts: frozen,
};
await mkdir(outputRoot, { recursive: true });
await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  status: "A0-FROZEN",
  indexPath,
  artifactCount: frozen.length,
}, null, 2)}\n`);
