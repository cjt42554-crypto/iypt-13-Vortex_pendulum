/**
 * Strict canonical JSON used by every formal provenance boundary.
 *
 * The encoder deliberately rejects values that JSON.stringify would silently
 * drop or coerce. This keeps configuration, source-binding, and artifact
 * identities byte-stable across browser and Node entry points.
 */

function reject(path: string, message: string): never {
  throw new TypeError(`canonical JSON rejected at ${path}: ${message}`);
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function encode(value: unknown, path: string, seen: Set<object>): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) reject(path, "number must be finite");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value === "undefined"
    || typeof value === "bigint"
    || typeof value === "function"
    || typeof value === "symbol") {
    return reject(path, `unsupported type ${typeof value}`);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) reject(path, "cyclic array");
    const enumerableKeys = Object.keys(value);
    const ownNames = Object.getOwnPropertyNames(value);
    if (Object.getOwnPropertySymbols(value).length > 0
      || enumerableKeys.length !== value.length
      || ownNames.length !== value.length + 1
      || ownNames.some((key) => key !== "length" && !/^(0|[1-9][0-9]*)$/u.test(key))) {
      reject(path, "array must be dense and contain only indexed JSON values");
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) reject(`${path}[${index}]`, "sparse array entry");
    }
    seen.add(value);
    try {
      return `[${value
        .map((item, index) => encode(item, `${path}[${index}]`, seen))
        .join(",")}]`;
    } finally {
      seen.delete(value);
    }
  }
  if (!isPlainObject(value)) reject(path, "value is not a plain JSON object");
  if (seen.has(value)) reject(path, "cyclic object");
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === "symbol")) {
    reject(path, "symbol-keyed properties are not JSON");
  }
  for (const key of ownKeys as string[]) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      reject(`${path}.${key}`, "property must be an enumerable data value");
    }
  }
  seen.add(value);
  try {
    return `{${(ownKeys as string[])
      .sort()
      .map((key) => `${JSON.stringify(key)}:${encode(value[key], `${path}.${key}`, seen)}`)
      .join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

export function stableCanonicalJson(value: unknown): string {
  return encode(value, "$", new Set<object>());
}

export function canonicalBytes(value: unknown): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(stableCanonicalJson(value)) as Uint8Array<ArrayBuffer>;
}

export function canonicalClone<T>(value: T): T {
  return JSON.parse(stableCanonicalJson(value)) as T;
}

export async function sha256Bytes(bytes: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function sha256Canonical(value: unknown): Promise<string> {
  return sha256Bytes(canonicalBytes(value));
}
