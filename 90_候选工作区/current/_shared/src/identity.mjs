import { createHash } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalSha256 } from "./canonical.mjs";

export async function sha256File(path) {
  const handle = await open(path, "r");
  const hash = createHash("sha256");
  try {
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      hash.update(chunk);
    }
  } finally {
    await handle.close();
  }
  return hash.digest("hex");
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function verifyBindings(repositoryRoot, bindings) {
  const verified = [];
  for (const binding of bindings) {
    const absolutePath = resolve(repositoryRoot, binding.relativePath);
    const actualSha256 = await sha256File(absolutePath);
    if (actualSha256 !== binding.sha256) {
      throw new Error(
        `source binding drift for ${binding.relativePath}: `
          + `expected ${binding.sha256}, observed ${actualSha256}`,
      );
    }
    verified.push({
      relativePath: binding.relativePath,
      role: binding.role,
      sha256: actualSha256,
    });
  }
  return Object.freeze({
    bindingCount: verified.length,
    bindings: Object.freeze(verified.map(Object.freeze)),
    canonicalSha256: canonicalSha256(verified),
  });
}
