import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gunzipSync } from "node:zlib";
import {
  filesAreByteIdentical,
  sha256CanonicalJson,
  sha256File,
  streamSelectedJsonValues,
  writeDeterministicJsonGzip,
} from "../scripts/formal-causal-reference-artifact-stream.mjs";

test("A8O streaming artifact is canonical and byte deterministic", async () => {
  const directory = await mkdtemp(join(tmpdir(), "a8o-stream-test-"));
  try {
    const firstPath = join(directory, "first.json.gz");
    const secondPath = join(directory, "second.json.gz");
    const value = {
      format: "stream-test",
      records: Array.from({ length: 10_000 }, (_, index) => ({
        index,
        value: Math.sin(index / 17),
        label: "row-" + index,
      })),
      nested: { pass: true, absent: undefined, nullValue: null },
    };
    const first = await writeDeterministicJsonGzip(
      value,
      firstPath,
      { level: 9, mtime: 0 },
    );
    const second = await writeDeterministicJsonGzip(
      value,
      secondPath,
      { level: 9, mtime: 0 },
    );
    const expected = Buffer.from(JSON.stringify(value) + "\n", "utf8");
    assert.deepEqual(gunzipSync(await readFile(firstPath)), expected);
    assert.equal(await filesAreByteIdentical(firstPath, secondPath), true);
    assert.deepEqual(first, second);
    assert.deepEqual(await sha256File(firstPath), {
      sha256: first.storedSha256,
      bytes: first.storedBytes,
    });
    assert.deepEqual(await sha256CanonicalJson(firstPath), {
      sha256: first.canonicalSha256,
      bytes: first.canonicalBytes,
    });

    const selected = [];
    for await (const item of streamSelectedJsonValues(
      firstPath,
      /^(format|records\.9999|nested)$/,
    )) {
      selected.push(item.value);
    }
    assert.deepEqual(selected, [
      "stream-test",
      { index: 9999, value: Math.sin(9999 / 17), label: "row-9999" },
      { pass: true, nullValue: null },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("A8O streaming artifact rejects non-finite values without an output", async () => {
  const directory = await mkdtemp(join(tmpdir(), "a8o-stream-finite-test-"));
  try {
    const outputPath = join(directory, "nonfinite.json.gz");
    await assert.rejects(
      writeDeterministicJsonGzip(
        { finite: 1, invalid: Number.NaN },
        outputPath,
        { level: 9, mtime: 0 },
      ),
      /non-finite number/,
    );
    await assert.rejects(readFile(outputPath), { code: "ENOENT" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
