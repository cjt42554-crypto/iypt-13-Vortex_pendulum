import { describe, expect, it } from "vitest";
import {
  canonicalClone,
  sha256Canonical,
  stableCanonicalJson,
} from "../src/core/canonical";

describe("formal canonical JSON", () => {
  it("is key-order independent and normalizes negative zero", async () => {
    expect(stableCanonicalJson({ b: 2, a: -0 })).toBe('{"a":0,"b":2}');
    await expect(sha256Canonical({ b: 2, a: -0 }))
      .resolves.toBe(await sha256Canonical({ a: 0, b: 2 }));
    expect(canonicalClone({ value: -0 })).toEqual({ value: 0 });
  });

  it("fails closed on values that ordinary JSON would erase or coerce", () => {
    expect(() => stableCanonicalJson({ value: undefined })).toThrow(/unsupported type/u);
    expect(() => stableCanonicalJson({ value: Number.NaN })).toThrow(/finite/u);
    expect(() => stableCanonicalJson(new Date())).toThrow(/plain JSON object/u);
    const sparse = new Array(2);
    sparse[1] = 1;
    expect(() => stableCanonicalJson(sparse)).toThrow(/dense/u);
    const symbolKey = { value: 1, [Symbol("hidden")]: 2 };
    expect(() => stableCanonicalJson(symbolKey)).toThrow(/symbol-keyed/u);
    const accessor = Object.defineProperty({}, "value", {
      enumerable: true,
      get: () => 1,
    });
    expect(() => stableCanonicalJson(accessor)).toThrow(/data value/u);
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => stableCanonicalJson(cyclic)).toThrow(/cyclic/u);
  });
});
