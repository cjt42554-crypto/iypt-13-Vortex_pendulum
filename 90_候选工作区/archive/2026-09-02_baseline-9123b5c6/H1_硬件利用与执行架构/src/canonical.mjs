import { createHash } from "node:crypto";

function fail(message) {
  throw new Error(`canonical JSON rejected: ${message}`);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function canonicalJson(value, path = "$", seen = new Set()) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`${path} contains a non-finite number`);
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value === "bigint" || typeof value === "undefined" || typeof value === "function") {
    fail(`${path} contains unsupported type ${typeof value}`);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) fail(`${path} contains a cycle`);
    seen.add(value);
    const result = `[${value.map((item, index) => canonicalJson(item, `${path}[${index}]`, seen)).join(",")}]`;
    seen.delete(value);
    return result;
  }
  if (!isPlainObject(value)) fail(`${path} is not a plain JSON object`);
  if (seen.has(value)) fail(`${path} contains a cycle`);
  seen.add(value);
  const result = `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key], `${path}.${key}`, seen)}`)
    .join(",")}}`;
  seen.delete(value);
  return result;
}

export function canonicalBytes(value) {
  return Buffer.from(canonicalJson(value), "utf8");
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function canonicalSha256(value) {
  return sha256(canonicalBytes(value));
}

export function immutableJsonClone(value) {
  const clone = JSON.parse(canonicalJson(value));
  const freeze = (item) => {
    if (item && typeof item === "object") {
      for (const child of Object.values(item)) freeze(child);
      Object.freeze(item);
    }
    return item;
  };
  return freeze(clone);
}
