import { execFile } from "node:child_process";
import { access, readFile, readdir, realpath, stat } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  assertLiveSnapshotMatches,
  assertR1iDocument,
  sha256,
  sidecarLine,
} from "../src/r1i-seal.mjs";

const execFileAsync = promisify(execFile);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../../..");
const manifestPath = resolve(
  packageRoot,
  "evidence/r1i-interrupted-serial-attempt-seal-20260901.json",
);
const sidecarPath = resolve(
  packageRoot,
  "evidence/r1i-interrupted-serial-attempt-seal-20260901.sha256",
);
const schemaPath = resolve(
  packageRoot,
  "contracts/r1i-interrupted-attempt-seal.schema.json",
);
const allowedArguments = new Set(["--sealed-only"]);
for (const argument of process.argv.slice(2)) {
  if (!allowedArguments.has(argument)) {
    throw new Error(`R1I validation failed: unknown argument ${argument}`);
  }
}
const sealedOnly = process.argv.includes("--sealed-only");

async function exists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function git(cwd, args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    env: {...process.env, GIT_OPTIONAL_LOCKS: "0"},
    encoding: "utf8",
  });
  return stdout.trimEnd();
}

async function collectLiveSnapshot(document) {
  const oldRoot = document.oldWorktree.path;
  const status = await git(oldRoot, ["status", "--porcelain=v2", "--branch"]);
  const lines = status.split("\n").filter(Boolean);
  const entries = lines.filter((line) => !line.startsWith("# "));
  const field = (prefix) => lines.find((line) => line.startsWith(prefix))?.slice(prefix.length);
  const ab = field("# branch.ab ")?.match(/^\+([0-9]+) -([0-9]+)$/);
  if (!ab) throw new Error("R1I live validation failed: branch.ab is missing");

  const directoryStat = await stat(oldRoot);
  const artifactDirectory = resolve(oldRoot, dirname(document.artifacts.expectedGzip.path));
  const partialArtifacts = (await readdir(artifactDirectory))
    .filter((name) => name.startsWith(".partial-"))
    .sort();
  const bootId = (await readFile("/proc/sys/kernel/random/boot_id", "utf8")).trim();
  const processStates = Object.fromEntries(
    document.processes.map((process) => [
      process.pid,
      "/proc/" + process.pid,
    ]),
  );
  for (const [pid, procPath] of Object.entries(processStates)) {
    processStates[pid] = (await exists(procPath)) ? "PRESENT" : "ABSENT";
  }

  return {
    realpath: await realpath(oldRoot),
    device: Number(directoryStat.dev),
    inode: Number(directoryStat.ino),
    directorySizeBytes: Number(directoryStat.size),
    branch: field("# branch.head "),
    head: field("# branch.oid "),
    upstream: field("# branch.upstream "),
    localOriginMain: await git(oldRoot, ["rev-parse", "origin/main"]),
    ahead: Number(ab[1]),
    behind: Number(ab[2]),
    porcelainV2Entries: entries,
    currentBootId: bootId,
    expectedGzipState: (await exists(resolve(oldRoot, document.artifacts.expectedGzip.path)))
      ? "PRESENT"
      : "ABSENT",
    expectedSidecarState: (await exists(resolve(oldRoot, document.artifacts.expectedSidecar.path)))
      ? "PRESENT"
      : "ABSENT",
    partialArtifacts,
    processStates,
  };
}

const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const schema = JSON.parse(await readFile(schemaPath, "utf8"));
assertR1iDocument(manifest, schema);

for (const identity of [
  manifest.sourceIncident.report,
  manifest.sourceIncident.machineEvidence,
  manifest.sourceIncident.machineEvidenceSidecar,
  manifest.pr1Decision,
]) {
  const path = resolve(repositoryRoot, identity.path);
  const bytes = await readFile(path);
  if (sha256(bytes) !== identity.sha256) {
    throw new Error(`R1I entity SHA-256 mismatch: ${identity.path}`);
  }
  const blob = await git(repositoryRoot, ["hash-object", path]);
  if (blob !== identity.gitBlob) {
    throw new Error(`R1I entity Git blob mismatch: ${identity.path}`);
  }
}

const r0Sidecar = await readFile(
  resolve(repositoryRoot, manifest.sourceIncident.machineEvidenceSidecar.path),
  "utf8",
);
if (
  r0Sidecar !==
  sidecarLine(
    manifest.sourceIncident.machineEvidence.sha256,
    manifest.sourceIncident.machineEvidence.path,
  )
) {
  throw new Error("R1I source incident sidecar content mismatch");
}

const manifestHash = sha256(manifestBytes);
const sidecar = await readFile(sidecarPath, "utf8");
if (sidecar !== sidecarLine(manifestHash, basename(manifestPath))) {
  throw new Error("R1I seal sidecar content mismatch");
}

if (sealedOnly) {
  console.log(
    JSON.stringify({
      classification: manifest.classification,
      validationMode: "SEALED-EVIDENCE-ONLY",
      manifestSha256: manifestHash,
      sourceEntityCount: 4,
      liveOldWorktreeReinspectionPerformed: false,
      scientificPayloadInspected: false,
    }),
  );
} else {
  const snapshot = await collectLiveSnapshot(manifest);
  assertLiveSnapshotMatches(manifest, snapshot);

  console.log(
    JSON.stringify({
      classification: manifest.classification,
      manifestSha256: manifestHash,
      oldWorktreeHead: snapshot.head,
      oldWorktreeClean: snapshot.porcelainV2Entries.length === 0,
      canonicalArtifactAvailable: false,
      scientificPayloadInspected: false,
    }),
  );
}
