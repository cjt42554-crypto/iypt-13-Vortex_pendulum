import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  publishJsonArtifactSetExclusive,
  verifyJsonArtifactSet,
} from "../src/core/artifacts";

describe("formal atomic JSON artifact sets", () => {
  it("publishes and verifies one complete, hash-bound set", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "iypt13-artifacts-"));
    try {
      const destination = join(temporary, "frozen");
      const published = await publishJsonArtifactSetExclusive(
        destination,
        [
          { fileName: "b.json", value: { z: 2, a: 1 }, metadata: { role: "holdout" } },
          { fileName: "a.json", value: { value: -0 }, metadata: { role: "calibration" } },
        ],
        { schemaVersion: "TEST-v1", sourceBindings: [{ role: "test", sha256: "0".repeat(64) }] },
      );
      expect(published.entries).toHaveLength(2);
      await expect(verifyJsonArtifactSet(destination)).resolves.toMatchObject({
        directory: destination,
      });
      await expect(publishJsonArtifactSetExclusive(
        destination,
        [{ fileName: "other.json", value: { value: 1 } }],
        { schemaVersion: "TEST-v1" },
      )).rejects.toThrow(/already exists/u);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  it("rejects payload, marker, and directory tampering", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "iypt13-artifacts-tamper-"));
    try {
      const destination = join(temporary, "frozen");
      await publishJsonArtifactSetExclusive(
        destination,
        [{ fileName: "case.json", value: { value: 1 } }],
        { schemaVersion: "TEST-v1" },
      );
      await writeFile(join(destination, "case.json"), '{"value":2}\n', "utf8");
      await expect(verifyJsonArtifactSet(destination)).rejects.toThrow(/identity mismatch/u);
      expect(await readFile(join(destination, "COMMITTED.json"), "utf8"))
        .toContain("VP-ATOMIC-JSON-ARTIFACT-SET-v1");

      const markerDestination = join(temporary, "marker-tamper");
      await publishJsonArtifactSetExclusive(
        markerDestination,
        [{ fileName: "case.json", value: { value: 1 } }],
        { schemaVersion: "TEST-v1" },
      );
      const marker = JSON.parse(
        await readFile(join(markerDestination, "COMMITTED.json"), "utf8"),
      );
      marker.unbound = true;
      await writeFile(
        join(markerDestination, "COMMITTED.json"),
        `${JSON.stringify(marker, null, 2)}\n`,
        "utf8",
      );
      await expect(verifyJsonArtifactSet(markerDestination))
        .rejects.toThrow(/commit marker/u);

      const extraDestination = join(temporary, "extra-file");
      await publishJsonArtifactSetExclusive(
        extraDestination,
        [{ fileName: "case.json", value: { value: 1 } }],
        { schemaVersion: "TEST-v1" },
      );
      await writeFile(join(extraDestination, "unbound.json"), "{}\n", "utf8");
      await expect(verifyJsonArtifactSet(extraDestination))
        .rejects.toThrow(/files not bound/u);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
});
