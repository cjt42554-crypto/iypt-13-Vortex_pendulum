import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/core/config";
import { updateConfigAtPath } from "../src/ui/parameter-form";

describe("visual parameter form config updates", () => {
  it("updates a nested numeric parameter without mutating the source config", () => {
    const updated = updateConfigAtPath(DEFAULT_CONFIG, "fluid.flowSpeed", 0.025);
    expect(updated.fluid.flowSpeed).toBe(0.025);
    expect(DEFAULT_CONFIG.fluid.flowSpeed).toBe(0.017);
  });

  it("updates a backend enum while preserving its string type", () => {
    const updated = updateConfigAtPath(DEFAULT_CONFIG, "cfd2d.couplingMode", "prescribed");
    expect(updated.cfd2d.couplingMode).toBe("prescribed");
  });

  it("rejects unknown paths and type-changing updates", () => {
    expect(() => updateConfigAtPath(DEFAULT_CONFIG, "fluid.missing", 1)).toThrow(/路径不存在/);
    expect(() => updateConfigAtPath(DEFAULT_CONFIG, "fluid.flowSpeed", "fast")).toThrow(/类型不能/);
  });
});
