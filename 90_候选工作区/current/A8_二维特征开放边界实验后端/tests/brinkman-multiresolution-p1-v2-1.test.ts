import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  assertIndependentRepeatByteIdentity,
  expectedArtifactSidecarText,
} from "../scripts/brinkman-multiresolution-artifact-v2-1.mjs";
import {
  CANDIDATE_ROOT,
  IMPLEMENTATION_AUDIT_PATHS,
  collectStaticDependencyPathsAtCommit,
} from "../scripts/brinkman-multiresolution-preflight-v2-1.mjs";
import { writeDeterministicJsonGzip } from
  "../scripts/formal-causal-reference-artifact-stream.mjs";
import {
  buildBrinkmanMultiresolutionV2P1Definitions,
} from "../src/brinkman-multiresolution-contract-v2-1.ts";
import {
  BRINKMAN_MULTIRESOLUTION_V2P1_P1_IDENTITY as P1_IDENTITY,
  assertBrinkmanMultiresolutionV2P1ExecutionAuthorized,
} from "../src/brinkman-multiresolution-p1-v2-1.ts";
import { runBrinkmanMultiresolutionV2P1Case } from
  "../src/brinkman-multiresolution-runs-v2-1.ts";

const PACKAGE_ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const REPEAT_CLI = resolve(
  PACKAGE_ROOT,
  "scripts/assert-brinkman-multiresolution-repeat-v2-1.mjs",
);

async function makeSyntheticRepeatFixture() {
  const directory = await mkdtemp(join(tmpdir(), "a8r-v2p1-repeat-cli-"));
  const primaryDirectory = join(directory, "primary");
  const repeatDirectory = join(directory, "repeat");
  await mkdir(primaryDirectory);
  await mkdir(repeatDirectory);
  const name = "tiny-repeat.json.gz";
  const primaryPath = join(primaryDirectory, name);
  const repeatPath = join(repeatDirectory, name);
  const primarySidecarPath = primaryPath.replace(/\.json\.gz$/, ".sha256");
  const repeatSidecarPath = repeatPath.replace(/\.json\.gz$/, ".sha256");
  const identity = await writeDeterministicJsonGzip(
    {
      format: "A8R-v2p1-repeat-small-synthetic",
      values: Array.from({ length: 64 }, (_, index) => ({
        index,
        value: (index * 17) % 23,
      })),
    },
    primaryPath,
    { level: 9, mtime: 0 },
  );
  const sidecar = expectedArtifactSidecarText(
    primaryPath,
    identity.canonicalSha256,
    identity.storedSha256,
  );
  await writeFile(primarySidecarPath, sidecar, { flag: "wx" });
  await copyFile(primaryPath, repeatPath);
  await copyFile(primarySidecarPath, repeatSidecarPath);
  return {
    directory,
    primaryPath,
    repeatPath,
    primarySidecarPath,
    repeatSidecarPath,
    sidecar,
  };
}

function runRepeatCli(args: string[]) {
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", REPEAT_CLI, ...args],
    { cwd: PACKAGE_ROOT, encoding: "utf8" },
  );
}

test("A8R v2.1 repeat CLI rejects a missing repeat path", async () => {
  const fixture = await makeSyntheticRepeatFixture();
  try {
    const result = runRepeatCli([fixture.primaryPath]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /repeat artifact path is required/);
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("A8R v2.1 repeat CLI rejects the same normalized path", async () => {
  const fixture = await makeSyntheticRepeatFixture();
  try {
    const result = runRepeatCli([
      fixture.primaryPath,
      join(fixture.directory, "primary", ".", "tiny-repeat.json.gz"),
    ]);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /primary and repeat normalized absolute paths must differ/,
    );
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("A8R v2.1 repeat CLI rejects a non-identical sidecar", async () => {
  const fixture = await makeSyntheticRepeatFixture();
  try {
    await writeFile(fixture.repeatSidecarPath, fixture.sidecar + "changed\n");
    const result = runRepeatCli([fixture.primaryPath, fixture.repeatPath]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /sidecars are not byte-identical/);
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("A8R v2.1 repeat CLI accepts only a valid distinct byte-identical pair", async () => {
  const fixture = await makeSyntheticRepeatFixture();
  try {
    const result = runRepeatCli([fixture.primaryPath, fixture.repeatPath]);
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.gzipByteIdentical, true);
    assert.equal(output.sidecarByteIdentical, true);
    assert.equal(output.independentFullRepeatMachineClosure, true);
    assert.equal(output.primaryPath, fixture.primaryPath);
    assert.equal(output.repeatPath, fixture.repeatPath);
    assert.equal(fixture.sidecar.endsWith("\n"), true);
    assert.equal(fixture.sidecar.split("\n").length, 3);

    const helper = await assertIndependentRepeatByteIdentity({
      primaryPath: fixture.primaryPath,
      repeatPath: fixture.repeatPath,
    });
    assert.equal(helper.gzipByteIdentical, true);
    assert.equal(helper.sidecarByteIdentical, true);
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("A8R v2.1 P1 execution gate aborts before formal solver construction", async () => {
  assert.equal(
    P1_IDENTITY.executionAuthorization.state,
    "LOCKED_PENDING_POST_P1_PRO_REVIEW",
  );
  assert.deepEqual(P1_IDENTITY.executionAuthorization.authorizedScopes, []);
  assert.throws(
    () => assertBrinkmanMultiresolutionV2P1ExecutionAuthorized(),
    /formal solver execution is locked pending an independent post-P1 Pro review/,
  );
  const definition = buildBrinkmanMultiresolutionV2P1Definitions()[0];
  assert.ok(definition !== undefined);
  assert.throws(
    () => runBrinkmanMultiresolutionV2P1Case(definition),
    /formal solver execution is locked pending an independent post-P1 Pro review/,
  );

  const source = await readFile(
    new URL("../src/brinkman-multiresolution-runs-v2-1.ts", import.meta.url),
    "utf8",
  );
  const gatePosition = source.indexOf(
    "assertBrinkmanMultiresolutionV2P1ExecutionAuthorized();",
  );
  const constructorPosition = source.indexOf("new D2Q9MrtBrinkmanSolver({");
  assert.ok(gatePosition >= 0);
  assert.ok(constructorPosition > gatePosition);
});

test("A8R v2.1 static dependency identity reaches benchmark metrics and contract", () => {
  const roots = [
    CANDIDATE_ROOT + "/scripts/run-brinkman-multiresolution-v2-1.mjs",
    CANDIDATE_ROOT
      + "/scripts/assert-brinkman-multiresolution-v2-1-artifact.mjs",
  ];
  const paths = collectStaticDependencyPathsAtCommit("HEAD", roots);
  assert.ok(paths.includes(
    CANDIDATE_ROOT
      + "/../A8_公开规定横移圆柱基准/src/benchmark-metrics.ts",
  ) || paths.includes(
    "90_候选工作区/current/A8_公开规定横移圆柱基准/src/benchmark-metrics.ts",
  ));
  assert.ok(paths.includes(
    "90_候选工作区/current/A8_公开规定横移圆柱基准/src/benchmark-contract.ts",
  ));
  assert.ok(IMPLEMENTATION_AUDIT_PATHS.includes(
    CANDIDATE_ROOT + "/package-lock.json",
  ));
});
