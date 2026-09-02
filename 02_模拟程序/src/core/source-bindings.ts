import { createHash } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";

export interface SourceBinding {
  readonly role: string;
  readonly sourcePath: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface BoundJson<T = unknown> {
  readonly value: T;
  readonly binding: SourceBinding;
}

export async function sha256File(path: string): Promise<string> {
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

function portableSourcePath(path: string, provenanceRoot?: string): string {
  const absolute = resolve(path);
  if (provenanceRoot === undefined) return basename(absolute);
  const root = resolve(provenanceRoot);
  const candidate = relative(root, absolute);
  return candidate === "" ? basename(absolute) : candidate.replaceAll("\\", "/");
}

/** Read and bind the exact input bytes before any parsed value is used. */
export async function readBoundJson<T = unknown>(
  path: string,
  role: string,
  provenanceRoot?: string,
): Promise<BoundJson<T>> {
  const absolute = resolve(path);
  const bytes = await readFile(absolute);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new SyntaxError(`${role} is not valid UTF-8: ${String(error)}`);
  }
  let value: T;
  try {
    value = JSON.parse(text) as T;
  } catch (error) {
    throw new SyntaxError(`${role} is not valid JSON: ${String(error)}`);
  }
  return Object.freeze({
    value,
    binding: Object.freeze({
      role,
      sourcePath: portableSourcePath(absolute, provenanceRoot),
      bytes: bytes.length,
      sha256,
    }),
  });
}
