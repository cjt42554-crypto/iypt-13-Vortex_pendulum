import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  unlink,
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
  BRINKMAN_MULTIRESOLUTION_V2P1_EXECUTION_SCOPES as EXECUTION_SCOPES,
  BRINKMAN_MULTIRESOLUTION_V2P1_P1_IDENTITY as P1_IDENTITY,
  assertBrinkmanMultiresolutionV2P1ExecutionAuthorized,
} from "../src/brinkman-multiresolution-p1-v2-1.ts";

const PACKAGE_ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const REPEAT_CLI = resolve(
  PACKAGE_ROOT,
  "scripts/assert-brinkman-multiresolution-repeat-v2-1.mjs",
);
const RESEARCH_RUNNER = resolve(
  PACKAGE_ROOT,
  "scripts/run-brinkman-multiresolution-v2-1.mjs",
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

test("A8R v2.1 repeat helper rejects hard-linked artifact aliases", async () => {
  const fixture = await makeSyntheticRepeatFixture();
  try {
    await unlink(fixture.repeatPath);
    await link(fixture.primaryPath, fixture.repeatPath);
    await assert.rejects(
      assertIndependentRepeatByteIdentity({
        primaryPath: fixture.primaryPath,
        repeatPath: fixture.repeatPath,
      }),
      /artifacts are hard-link aliases/,
    );
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("A8R v2.1 repeat helper rejects hard-linked sidecar aliases", async () => {
  const fixture = await makeSyntheticRepeatFixture();
  try {
    await unlink(fixture.repeatSidecarPath);
    await link(fixture.primarySidecarPath, fixture.repeatSidecarPath);
    await assert.rejects(
      assertIndependentRepeatByteIdentity({
        primaryPath: fixture.primaryPath,
        repeatPath: fixture.repeatPath,
      }),
      /sidecars are hard-link aliases/,
    );
  } finally {
    await rm(fixture.directory, { recursive: true, force: true });
  }
});

test("A8R v2.1 research runner rejects an existing output before preflight", async () => {
  const directory = await mkdtemp(join(tmpdir(), "a8r-v2p1-existing-output-"));
  const outputPath = join(directory, "already-present.json.gz");
  try {
    await writeFile(outputPath, "must-not-overwrite");
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", RESEARCH_RUNNER, outputPath],
      { cwd: PACKAGE_ROOT, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /output artifact exists before execution/);
    assert.equal(await readFile(outputPath, "utf8"), "must-not-overwrite");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("A8R v2.1 scoped gate authorizes only the reviewed research matrix", async () => {
  assert.equal(
    P1_IDENTITY.executionAuthorization.state,
    "FROZEN_EIGHT_TRAJECTORY_RESEARCH_MATRIX_AUTHORIZED",
  );
  assert.deepEqual(P1_IDENTITY.executionAuthorization.authorizedScopes, [
    EXECUTION_SCOPES.forcedFixedCylinderSmoke40,
    EXECUTION_SCOPES.unforcedBodyNullSmoke40,
    EXECUTION_SCOPES.researchMatrix,
  ]);
  assert.deepEqual(P1_IDENTITY.executionAuthorization.lockedScopes, []);
  for (const scope of P1_IDENTITY.executionAuthorization.authorizedScopes) {
    assert.doesNotThrow(() =>
      assertBrinkmanMultiresolutionV2P1ExecutionAuthorized(scope));
  }
  assert.throws(
    () => assertBrinkmanMultiresolutionV2P1ExecutionAuthorized(
      "UNREVIEWED_RUNTIME_SCOPE" as never,
    ),
    /UNREVIEWED_RUNTIME_SCOPE is not authorized.*explicitly reviewed scopes/,
  );

  const caseSource = await readFile(
    new URL("../src/brinkman-multiresolution-runs-v2-1.ts", import.meta.url),
    "utf8",
  );
  const caseGatePosition = caseSource.indexOf(
    "assertBrinkmanMultiresolutionV2P1ExecutionAuthorized(",
  );
  const caseScopePosition = caseSource.indexOf(
    "EXECUTION_SCOPES.researchMatrix",
  );
  const constructorPosition = caseSource.indexOf("new D2Q9MrtBrinkmanSolver({");
  assert.ok(caseGatePosition >= 0);
  assert.ok(caseScopePosition > caseGatePosition);
  assert.ok(constructorPosition > caseGatePosition);

  const runnerSource = await readFile(
    new URL("../scripts/run-brinkman-multiresolution-v2-1.mjs", import.meta.url),
    "utf8",
  );
  const runnerGatePosition = runnerSource.indexOf(
    "assertBrinkmanMultiresolutionV2P1ExecutionAuthorized(",
  );
  const absenceGatePosition = runnerSource.indexOf(
    "await assertExecutionOutputAbsent(outputPath",
  );
  const preflightPosition = runnerSource.indexOf(
    "await verifyBrinkmanMultiresolutionV2P1Preflight()",
  );
  const qualificationPosition = runnerSource.indexOf(
    "runBrinkmanMultiresolutionV2P1Qualification(",
  );
  assert.ok(absenceGatePosition >= 0);
  assert.ok(preflightPosition > absenceGatePosition);
  assert.ok(runnerGatePosition > preflightPosition);
  assert.ok(runnerGatePosition >= 0);
  assert.ok(qualificationPosition > runnerGatePosition);
});

test("A8R v2.1 research ruling identity and audit path are exact", () => {
  assert.equal(
    P1_IDENTITY.format,
    "VP-A8R-V2P1-RESULT-BLIND-RESEARCH-AUTHORIZATION-IDENTITY-v1",
  );
  assert.equal(
    P1_IDENTITY.smokeImplementationCommit,
    "9811120482a387158115e4e5565bd25a50bf2e3b",
  );
  assert.deepEqual(P1_IDENTITY.researchUnlockReview, {
    commit: "d5e0662cdee163e82da3dfe2bb2554c3d1cff2b9",
    relativePath:
      "90_候选工作区/current/A8_二维特征开放边界实验后端/30_A8R_v2_1_双40步烟雾独立审查与研究矩阵解锁裁决.md",
    sha256:
      "c46634b2975996903d7c3cb3eb5d2999bb7412630d95496d832bb480d284553c",
    acceptedCode:
      "ACCEPT-A8R-V2P1-PRO-DUAL-FORMAL-40-STEP-SMOKE",
    unlockCode:
      "UNLOCK-A8R-V2P1-PRO-FROZEN-EIGHT-TRAJECTORY-RESEARCH-MATRIX-ONLY",
    requiredCode:
      "REQUIRE-A8R-V2P1-PRO-RESULT-BLIND-RESEARCH-AUTHORIZATION-PRIMARY-ARTIFACT-AND-CLEAN-FULL-REPEAT",
    lockCode:
      "KEEP-A8R-V2P1-PRO-FORMAL-INTEGRATION-PHYSICAL-LOAD-AND-DOWNSTREAM-LOCKED",
  });
  assert.ok(IMPLEMENTATION_AUDIT_PATHS.includes(
    P1_IDENTITY.researchUnlockReview.relativePath,
  ));
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
