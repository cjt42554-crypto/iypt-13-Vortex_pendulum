import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { gunzipSync } from "node:zlib";
import {
  canonicalJson,
  canonicalSha256,
  canonicalize,
} from "../src/canonical.mjs";
import {
  deterministicGzipCanonical,
  readCanonicalGzipWithSidecar,
  writeAtomicCanonicalGzipExclusive,
  writeCanonicalGzipWithSidecarExclusive,
  writeSidecarExclusive,
} from "../src/atomic.mjs";

test("future canonical JSON is key-order independent and finite", () => {
  assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
  assert.equal(canonicalSha256({ b: 2, a: 1 }), canonicalSha256({ a: 1, b: 2 }));
  assert.deepEqual(canonicalize({ value: -0 }), { value: 0 });
  assert.throws(() => canonicalize({ value: Number.NaN }));
  assert.throws(() => canonicalize({ value: undefined }));
});

test("future canonical gzip helper binds stored and canonical sidecar hashes", async () => {
  const root = await mkdtemp(join(tmpdir(), "iypt13-shared-pair-"));
  try {
    const path = join(root, "summary.json.gz");
    const written = await writeCanonicalGzipWithSidecarExclusive(path, { value: 11 });
    const lines = (await readFile(written.sidecarPath, "utf8")).trimEnd().split("\n");
    assert.equal(lines[0], `${written.artifact.storedSha256}  summary.json.gz`);
    assert.equal(lines[1], `${written.artifact.canonicalSha256}  summary.json.gz.canonical`);
    const read = await readCanonicalGzipWithSidecar(path);
    assert.deepEqual(read.value, { value: 11 });
    assert.equal(read.canonicalSha256, written.artifact.canonicalSha256);
    await assert.rejects(() => writeCanonicalGzipWithSidecarExclusive(path, { value: 11 }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("future deterministic gzip repeats byte-for-byte", async () => {
  const first = await deterministicGzipCanonical({ b: [2, 3], a: 1 });
  const second = await deterministicGzipCanonical({ a: 1, b: [2, 3] });
  assert.equal(first.canonicalSha256, second.canonicalSha256);
  assert.equal(first.storedSha256, second.storedSha256);
  assert.deepEqual(first.stored, second.stored);
  assert.equal(gunzipSync(first.stored).toString("utf8"), '{"a":1,"b":[2,3]}');
});

test("future atomic canonical gzip and sidecar refuse overwrite", async () => {
  const root = await mkdtemp(join(tmpdir(), "iypt13-shared-"));
  try {
    const artifact = join(root, "artifact.json.gz");
    const sidecar = join(root, "artifact.sha256");
    const identity = await writeAtomicCanonicalGzipExclusive(artifact, { value: 7 });
    const sidecarText = `${identity.storedSha256}  artifact.json.gz\n`;
    await writeSidecarExclusive(sidecar, sidecarText);
    assert.equal((await readFile(sidecar, "utf8")), sidecarText);
    await assert.rejects(() => writeAtomicCanonicalGzipExclusive(artifact, { value: 8 }));
    await assert.rejects(() => writeSidecarExclusive(sidecar, sidecarText));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
