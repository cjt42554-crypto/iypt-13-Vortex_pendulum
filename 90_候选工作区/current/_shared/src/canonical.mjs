import { createHash } from "node:crypto";

function assertPlainObject(value, path) {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain object`);
  }
}

export function canonicalize(value, path = "$") {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} contains a non-finite number`);
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => canonicalize(item, `${path}[${index}]`));
  }
  if (typeof value === "object") {
    assertPlainObject(value, path);
    const output = {};
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      if (item === undefined) {
        throw new TypeError(`${path}.${key} is undefined`);
      }
      output[key] = canonicalize(item, `${path}.${key}`);
    }
    return output;
  }
  throw new TypeError(`${path} contains unsupported ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function canonicalBytes(value) {
  return Buffer.from(canonicalJson(value), "utf8");
}

export function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function canonicalSha256(value) {
  return sha256Bytes(canonicalBytes(value));
}
