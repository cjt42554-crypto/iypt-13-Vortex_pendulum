import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { H2_PACKAGE_ROOT } from "./contract.mjs";

const workerPath = resolve(H2_PACKAGE_ROOT, "scripts/h2x-case-worker.mjs");

export async function executeH2xCaseInFreshProcess(definition) {
  const child = spawn(
    process.execPath,
    ["--experimental-strip-types", workerPath],
    {
      cwd: H2_PACKAGE_ROOT,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  child.stdin.end(JSON.stringify({ definition }));
  const { code, signal } = await new Promise((accept, reject) => {
    child.once("error", reject);
    child.once("exit", (exitCode, exitSignal) => accept({
      code: exitCode,
      signal: exitSignal,
    }));
  });
  if (code !== 0 || signal !== null) {
    throw new Error(
      `NO-GO-H2X-SHARD-OR-AGGREGATION: worker code=${code} signal=${signal} `
        + Buffer.concat(stderr).toString("utf8"),
    );
  }
  const text = Buffer.concat(stdout).toString("utf8").trim();
  const lines = text.split("\n").filter(Boolean);
  if (lines.length !== 1) {
    throw new Error("NO-GO-H2X-PROVENANCE-LEAK: worker stdout envelope");
  }
  const result = JSON.parse(lines[0]);
  if (result.caseId !== definition.id
    || result.scientificValuesPersisted !== false
    || result.scientificValuesHumanRead !== false) {
    throw new Error("NO-GO-H2X-PROVENANCE-LEAK: worker result");
  }
  return Object.freeze(result);
}
