import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildHw2Native } from "../scripts/build-hw2-native.mjs";
import { runJsSyntheticExecution } from "../src/hw2-js-execution.mjs";
import { runNativeSyntheticExecution } from "../src/hw2-native-execution.mjs";

test("tiny JS worker and native CPU modes preserve exact semantic bytes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "iypt13-hw2-test-"));
  try {
    const binaryPath = await buildHw2Native({outputPath: join(directory, "hw2-probe")});
    const configuration = {elements: 65_536, rounds: 32};
    const jsSerial = await runJsSyntheticExecution({mode: "serial", workers: 1, ...configuration});
    const jsShared = await runJsSyntheticExecution({mode: "shared-workers", workers: 2, ...configuration});
    const jsTransfer = await runJsSyntheticExecution({mode: "transfer-shards", workers: 2, ...configuration});
    const nativeScalar = await runNativeSyntheticExecution({binaryPath, mode: "scalar", threads: 1, ...configuration});
    const nativeThreads = await runNativeSyntheticExecution({binaryPath, mode: "threads", threads: 2, ...configuration});
    const nativeSimd = await runNativeSyntheticExecution({binaryPath, mode: "simd", threads: 1, ...configuration});
    const digests = [jsSerial, jsShared, jsTransfer, nativeScalar, nativeThreads, nativeSimd]
      .map((result) => result.digest);
    assert.equal(new Set(digests).size, 1);
    assert.equal(digests[0], "6da044f5ff1134632c42809be1de17a74d4082e50d82aa3529c8d159875c526e");
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
