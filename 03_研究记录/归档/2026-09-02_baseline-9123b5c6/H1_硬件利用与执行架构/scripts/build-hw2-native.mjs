import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(scriptDirectory, "..");
const source = resolve(packageDirectory, "native/hw2_synthetic_probe.c");

function fail(message) {
  throw new Error(`NO-GO-HW2-NATIVE-BUILD: ${message}`);
}

export async function buildHw2Native({outputPath, compiler = "gcc"}) {
  if (typeof outputPath !== "string" || outputPath.length === 0) fail("outputPath is required");
  await mkdir(dirname(resolve(outputPath)), {recursive: true});
  const args = [
    "-O3",
    "-std=c11",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-fopenmp",
    "-march=native",
    source,
    "-o",
    resolve(outputPath),
    "-lcrypto",
    "-ldl",
    "-lpthread",
  ];
  await new Promise((resolvePromise, reject) => {
    const child = spawn(compiler, args, {stdio: ["ignore", "pipe", "pipe"]});
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0 && signal === null) resolvePromise();
      else reject(new Error(
        `compiler failed code=${String(code)} signal=${String(signal)} stdout=${Buffer.concat(stdout)} stderr=${Buffer.concat(stderr)}`,
      ));
    });
  });
  return resolve(outputPath);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  const outputIndex = process.argv.indexOf("--output");
  if (outputIndex < 0 || !process.argv[outputIndex + 1]) fail("usage: --output PATH");
  const output = await buildHw2Native({outputPath: process.argv[outputIndex + 1]});
  process.stdout.write(`${output}\n`);
}
