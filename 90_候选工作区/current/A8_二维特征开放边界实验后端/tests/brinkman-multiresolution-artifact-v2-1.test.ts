import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { test } from "node:test";
import {
  GIT_LFS_POINTER_PREFIX,
  assertMaterializedArtifact,
  verifyArtifactIdentity,
} from "../scripts/brinkman-multiresolution-artifact-v2-1.mjs";
import { writeDeterministicJsonGzip } from
  "../scripts/formal-causal-reference-artifact-stream.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

test("A8R v2.1 verifies stored, sidecar, and streamed canonical identity", async () => {
  const directory = await mkdtemp(join(tmpdir(), "a8r-v2p1-identity-"));
  try {
    const artifactPath = join(directory, "tiny.json.gz");
    const sidecarPath = join(directory, "tiny.sha256");
    const artifact = await writeDeterministicJsonGzip(
      {
        format: "A8R-v2p1-tiny-synthetic",
        values: Array.from({ length: 2048 }, (_, index) => ({
          index,
          value: Math.sin(index / 13),
        })),
      },
      artifactPath,
      { level: 9, mtime: 0 },
    );
    const storedName = basename(artifactPath);
    const sidecar = artifact.canonicalSha256
      + "  tiny.json (canonical uncompressed bytes)\n"
      + artifact.storedSha256 + "  " + storedName + "\n";
    await writeFile(sidecarPath, sidecar, { flag: "wx" });
    const verified = await verifyArtifactIdentity({
      artifactPath,
      sidecarPath,
      expectedStoredBytes: artifact.storedBytes,
      expectedCanonicalBytes: artifact.canonicalBytes,
      expectedStoredSha256: artifact.storedSha256,
      expectedCanonicalSha256: artifact.canonicalSha256,
      expectedSidecarSha256: sha256(Buffer.from(sidecar)),
      label: "tiny synthetic artifact",
    });
    assert.deepEqual(verified, {
      materialized: true,
      storedBytes: artifact.storedBytes,
      storedSha256: artifact.storedSha256,
      canonicalBytes: artifact.canonicalBytes,
      canonicalSha256: artifact.canonicalSha256,
      sidecarSha256: sha256(Buffer.from(sidecar)),
      sidecarExact: true,
    });

    const baseExpectation = {
      artifactPath,
      sidecarPath,
      expectedStoredBytes: artifact.storedBytes,
      expectedCanonicalBytes: artifact.canonicalBytes,
      expectedStoredSha256: artifact.storedSha256,
      expectedCanonicalSha256: artifact.canonicalSha256,
      expectedSidecarSha256: sha256(Buffer.from(sidecar)),
      label: "tiny synthetic artifact",
    };
    await assert.rejects(
      verifyArtifactIdentity({
        ...baseExpectation,
        expectedStoredBytes: artifact.storedBytes + 1,
      }),
      /stored byte count mismatch/,
    );
    await assert.rejects(
      verifyArtifactIdentity({
        ...baseExpectation,
        expectedStoredSha256: "0".repeat(64),
      }),
      /stored SHA-256 mismatch/,
    );
    await assert.rejects(
      verifyArtifactIdentity({
        ...baseExpectation,
        expectedSidecarSha256: "0".repeat(64),
      }),
      /sidecar SHA-256 mismatch/,
    );
    await assert.rejects(
      verifyArtifactIdentity({
        ...baseExpectation,
        expectedCanonicalSha256: "0".repeat(64),
      }),
      /sidecar contents mismatch/,
    );
    await assert.rejects(
      verifyArtifactIdentity({
        ...baseExpectation,
        expectedCanonicalBytes: artifact.canonicalBytes + 1,
      }),
      /canonical byte count mismatch/,
    );

    await writeFile(sidecarPath, sidecar.replace("canonical", "changed"));
    await assert.rejects(
      verifyArtifactIdentity({
        artifactPath,
        sidecarPath,
        expectedStoredBytes: artifact.storedBytes,
        expectedCanonicalBytes: artifact.canonicalBytes,
        expectedStoredSha256: artifact.storedSha256,
        expectedCanonicalSha256: artifact.canonicalSha256,
        label: "tiny synthetic artifact",
      }),
      /sidecar contents mismatch/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("A8R v2.1 rejects an unmaterialized Git LFS pointer explicitly", async () => {
  const directory = await mkdtemp(join(tmpdir(), "a8r-v2p1-lfs-"));
  try {
    const pointerPath = join(directory, "pointer.json.gz");
    const pointer = GIT_LFS_POINTER_PREFIX + "\n"
      + "oid sha256:0123456789abcdef\n"
      + "size 22058158\n";
    await writeFile(pointerPath, pointer, { flag: "wx" });
    assert.equal(
      (await readFile(pointerPath, "utf8")).startsWith(
        GIT_LFS_POINTER_PREFIX,
      ),
      true,
    );
    await assert.rejects(
      assertMaterializedArtifact(pointerPath, "synthetic pointer"),
      /unmaterialized Git LFS pointer.*materialize the exact object/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("A8R v2.1 package exposes exact locked entries and one exact LFS rule", async () => {
  const packageRoot = new URL("../", import.meta.url);
  const packageJson = JSON.parse(await readFile(
    new URL("package.json", packageRoot),
    "utf8",
  ));
  assert.equal(
    packageJson.scripts["brinkman-multiresolution-v2-1"],
    "node --experimental-strip-types scripts/run-brinkman-multiresolution-v2-1.mjs",
  );
  assert.equal(
    packageJson.scripts["assert:brinkman-multiresolution-v2-1-artifact"],
    "node --experimental-strip-types scripts/assert-brinkman-multiresolution-v2-1-artifact.mjs",
  );
  assert.equal(
    packageJson.scripts["assert:brinkman-multiresolution-v2-1-repeat"],
    "node --experimental-strip-types scripts/assert-brinkman-multiresolution-repeat-v2-1.mjs",
  );
  const exactRule =
    "验证与复现/artifacts/a8-brinkman-cycle-resolved-multiresolution-phase-force-identity.json.gz filter=lfs diff=lfs merge=lfs -text";
  const attributes = (await readFile(
    new URL(".gitattributes", packageRoot),
    "utf8",
  )).split(/\r?\n/);
  assert.equal(attributes.filter((line) => line === exactRule).length, 1);
});
