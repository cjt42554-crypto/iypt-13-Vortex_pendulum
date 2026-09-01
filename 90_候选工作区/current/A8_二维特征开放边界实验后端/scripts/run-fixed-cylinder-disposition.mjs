import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  FIXED_CYLINDER_DISPOSITION_CASES,
  assembleFixedCylinderDisposition,
  runFixedCylinderDispositionCase,
} from "../src/fixed-cylinder-disposition.ts";

const candidateRoot = resolve(process.cwd());
const repositoryRoot = resolve(candidateRoot, "../../..");
const outputDirectory = resolve(
  candidateRoot,
  "验证与复现/disposition/a8s-fixed-cylinder",
);

function git(args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function writeAtomicJson(path, value) {
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.partial-${process.pid}`;
  await writeFile(temporary, bytes, { flag: "wx" });
  await rename(temporary, path);
  const digest = sha256(bytes);
  await writeFile(`${path}.sha256`, `${digest}  ${path.split("/").at(-1)}\n`, "utf8");
  return { bytes: bytes.length, sha256: digest };
}

function preflight() {
  if (git(["status", "--porcelain=v1", "--untracked-files=no"]) !== "") {
    throw new Error(
      "A8S result-bearing execution requires no tracked worktree changes",
    );
  }
  const head = git(["rev-parse", "HEAD"]);
  const remote = git(["rev-parse", "origin/main"]);
  if (head !== remote) {
    throw new Error("A8S result-bearing execution requires HEAD == origin/main");
  }
  return {
    repositoryHead: head,
    formalSolverSha256: sha256(execFileSync("git", [
      "show",
      `${head}:02_模拟程序/src/solvers/highFidelity/lbm.ts`,
    ], { cwd: repositoryRoot })),
    node: process.version,
    v8: process.versions.v8,
    platform: process.platform,
    architecture: process.arch,
  };
}

async function runCase(id) {
  const input = FIXED_CYLINDER_DISPOSITION_CASES.find((item) => item.id === id);
  if (input === undefined) throw new Error(`unknown A8S case ${id}`);
  const provenance = preflight();
  console.log(`A8S_CASE_START id=${id}`);
  const result = runFixedCylinderDispositionCase(input, (completed, total) => {
    console.log(`A8S_PROGRESS id=${id} steps=${completed}/${total}`);
  });
  const record = {
    provenance,
    generatedAt: new Date().toISOString(),
    runtime: {
      maxRssKiB: process.resourceUsage().maxRSS,
    },
    result,
  };
  const path = resolve(outputDirectory, `${id}.json`);
  const identity = await writeAtomicJson(path, record);
  console.log(
    `A8S_CASE_DONE id=${id} path=${path} bytes=${identity.bytes}`
      + ` sha256=${identity.sha256}`,
  );
}

async function aggregate() {
  const provenance = preflight();
  const records = [];
  for (const input of FIXED_CYLINDER_DISPOSITION_CASES) {
    const path = resolve(outputDirectory, `${input.id}.json`);
    const parsed = JSON.parse(await readFile(path, "utf8"));
    if (parsed?.provenance?.repositoryHead !== provenance.repositoryHead) {
      throw new Error(`A8S case identity mismatch: ${input.id}`);
    }
    records.push(parsed.result);
  }
  const disposition = assembleFixedCylinderDisposition(records);
  const record = {
    provenance,
    generatedAt: new Date().toISOString(),
    disposition,
  };
  const path = resolve(outputDirectory, "a8s-fixed-cylinder-disposition.json");
  const identity = await writeAtomicJson(path, record);
  console.log(
    `A8S_AGGREGATE_DONE conclusion=${disposition.conclusion}`
      + ` path=${path} bytes=${identity.bytes} sha256=${identity.sha256}`,
  );
}

const command = process.argv[2];
if (command === "--case") {
  await runCase(process.argv[3]);
} else if (command === "--aggregate") {
  await aggregate();
} else if (command === "--list") {
  for (const item of FIXED_CYLINDER_DISPOSITION_CASES) console.log(item.id);
} else {
  throw new Error(
    "usage: run-fixed-cylinder-disposition.mjs --list | --case ID | --aggregate",
  );
}
