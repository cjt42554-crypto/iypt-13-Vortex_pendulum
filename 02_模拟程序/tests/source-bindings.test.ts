import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readBoundJson } from "../src/core/source-bindings";

describe("raw JSON source bindings", () => {
  it("binds the exact source bytes before parsing", async () => {
    const directory = await mkdtemp(join(tmpdir(), "iypt13-source-binding-"));
    try {
      const path = join(directory, "input.json");
      const bytes = Buffer.from('{"b": 2, "a": 1}\n', "utf8");
      await writeFile(path, bytes);
      const bound = await readBoundJson<Record<string, number>>(path, "test-input", directory);
      expect(bound.value).toEqual({ a: 1, b: 2 });
      expect(bound.binding).toEqual({
        role: "test-input",
        sourcePath: "input.json",
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("fails closed on malformed UTF-8 before JSON parsing", async () => {
    const directory = await mkdtemp(join(tmpdir(), "iypt13-source-binding-invalid-"));
    try {
      const path = join(directory, "invalid.json");
      await writeFile(path, Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x7d]));
      await expect(readBoundJson(path, "invalid-input", directory))
        .rejects.toThrow(/not valid UTF-8/u);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
