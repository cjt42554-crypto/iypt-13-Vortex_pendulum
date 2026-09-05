import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256File } from "../../_shared/src/identity.mjs";
import { canonicalSha256 } from "../../_shared/src/canonical.mjs";
import { H2_PACKAGE_ROOT } from "../src/contract.mjs";

export const H2N_NATIVE_COMPILE_FLAGS = Object.freeze([
  "-O3",
  "-std=c11",
  "-fopenmp",
  "-fno-fast-math",
  "-ffp-contract=off",
  "-march=native",
  "-Wall",
  "-Wextra",
  "-Wpedantic",
]);

export const H2N_NATIVE_SOURCE_PATH = resolve(
  H2_PACKAGE_ROOT,
  "native/h2n_stage0.c",
);
export const H2N_OPENCL_SOURCE_PATH = resolve(
  H2_PACKAGE_ROOT,
  "native/h2n_stage0.cl",
);

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function capture(command, args) {
  const child = spawn(command, args, {
    cwd: H2_PACKAGE_ROOT,
    env: { ...process.env, LC_ALL: "C" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const { code, signal } = await new Promise((accept, reject) => {
    child.once("error", reject);
    child.once("exit", (exitCode, exitSignal) => accept({
      code: exitCode,
      signal: exitSignal,
    }));
  });
  const output = Buffer.concat(stdout).toString("utf8");
  const diagnostics = Buffer.concat(stderr).toString("utf8");
  if (code !== 0 || signal !== null) {
    throw new Error(
      `H2-N native build command failed: ${command}; code=${code}; signal=${signal}; `
        + diagnostics,
    );
  }
  return Object.freeze({ output, diagnostics });
}

export async function buildH2nStage0Native(outputPath, options = {}) {
  const absoluteOutput = resolve(outputPath);
  if (await exists(absoluteOutput)) {
    throw new Error(`H2-N build output already exists: ${absoluteOutput}`);
  }
  await mkdir(dirname(absoluteOutput), { recursive: true });
  const compiler = options.compiler ?? "gcc";
  const flags = Object.freeze([
    ...H2N_NATIVE_COMPILE_FLAGS,
    ...(options.additionalFlags ?? []),
  ]);
  const version = (await capture(compiler, ["--version"]))
    .output.split("\n", 1)[0].trim();
  const build = await capture(compiler, [
    ...flags,
    H2N_NATIVE_SOURCE_PATH,
    "-ldl",
    "-lm",
    "-o",
    absoluteOutput,
  ]);
  if (build.diagnostics.trim() !== "") {
    throw new Error(`H2-N native build produced diagnostics: ${build.diagnostics}`);
  }
  const identity = {
    backendId: "h2n-native-openmp-opencl-stage0-v1",
    algorithmId: "formal-d2q9-mrt-guo-brinkman-scatter-open-boundary-port-v1",
    precisionId: "float64",
    layoutId: "aos-nine-populations-plus-soa-macroscopic-fields-v1",
    reductionId: "candidate-native-per-cell-plus-sequential-audit-v1",
    boundaryId: "formal-zou-he-open-x-periodic-y-order-v1",
    compilerId: version,
    compilerFlags: flags,
    sourceSha256: await sha256File(H2N_NATIVE_SOURCE_PATH),
    openclSourceSha256: await sha256File(H2N_OPENCL_SOURCE_PATH),
    binarySha256: await sha256File(absoluteOutput),
  };
  return Object.freeze({
    outputPath: absoluteOutput,
    identity: Object.freeze({
      ...identity,
      implementationTreeSha256: canonicalSha256(identity),
    }),
  });
}

function parseOutputArgument(argv) {
  const index = argv.indexOf("--output");
  if (index < 0 || index + 1 >= argv.length) {
    throw new Error("usage: build-h2n-stage0.mjs --output PATH");
  }
  return argv[index + 1];
}

if (process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const built = await buildH2nStage0Native(parseOutputArgument(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(built)}\n`);
}
