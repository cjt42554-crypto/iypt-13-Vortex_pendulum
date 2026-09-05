import type {
  RuntimeCalibrationCell, RuntimeCalibrationSupport, RomParameters,
} from "./types";

/** The same coordinate order is used by package validation and runtime guards. */
export const RUNTIME_DOMAIN_UNITS = Object.freeze({
  flowSpeedMps: "m/s", waterDepthM: "m", pivotHeightM: "m", reynolds: "1",
  wetSpanM: "m", absThetaRad: "rad", velocityRatio: "1", normalizedInflowRate: "1",
});
export type RuntimeDomainCoordinate = keyof typeof RUNTIME_DOMAIN_UNITS;
export type RuntimeDomainPoint = Record<RuntimeDomainCoordinate, number>;
export const RUNTIME_DOMAIN_COORDINATES = Object.keys(RUNTIME_DOMAIN_UNITS) as RuntimeDomainCoordinate[];

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isRuntimeCalibrationCell(value: unknown): value is RuntimeCalibrationCell {
  return object(value) && RUNTIME_DOMAIN_COORDINATES.every((name) => {
    const range = value[name];
    return object(range) && typeof range.minimum === "number" && Number.isFinite(range.minimum)
      && typeof range.maximum === "number" && Number.isFinite(range.maximum)
      && range.maximum >= range.minimum && (name === "pivotHeightM" || range.minimum >= 0);
  });
}

export function isRuntimeCalibrationSupport(value: unknown): value is RuntimeCalibrationSupport {
  return object(value) && value.kind === "covered-cells"
    && typeof value.evidence === "string" && value.evidence.trim().length > 0
    && Array.isArray(value.cells) && value.cells.length > 0 && value.cells.every(isRuntimeCalibrationCell);
}

/**
 * Signed, dimensionlessly scaled margin to a union of closed cells. A point must
 * belong to one complete cell; coordinate-wise unions would fill training holes.
 * No tolerance expands the physical domain. Event tolerances belong to the solver.
 */
export function jointCalibrationMargin(support: RuntimeCalibrationSupport, point: RuntimeDomainPoint): number {
  if (!isRuntimeCalibrationSupport(support)
    || RUNTIME_DOMAIN_COORDINATES.some((name) => !Number.isFinite(point[name]))) return -Infinity;
  return Math.max(...support.cells.map((cell) => Math.min(...RUNTIME_DOMAIN_COORDINATES.map((name) => {
    const { minimum, maximum } = cell[name];
    const scale = Math.max(Math.abs(minimum), Math.abs(maximum), 1e-12);
    return Math.min(point[name] - minimum, maximum - point[name]) / scale;
  }))));
}

export function wetContractIssues(rom: RomParameters): string[] {
  const mode = rom.wetSupportMode ?? "legacy-unqualified";
  if (!["legacy-unqualified", "synthetic-only", "calibrated"].includes(mode)) {
    return ["wetSupportMode 必须明确为 legacy-unqualified、synthetic-only 或 calibrated。"];
  }
  if (mode === "legacy-unqualified") return [];
  const issues: string[] = [];
  if (rom.wetSpanDefinition !== "streamwise-projected-area-over-diameter") {
    issues.push("wetSpanDefinition 必须绑定 L_w=A_perp/(2R)。");
  }
  if (typeof rom.calibrationMinWetSpan !== "number" || !Number.isFinite(rom.calibrationMinWetSpan)
    || rom.calibrationMinWetSpan < 0) {
    issues.push("calibrationMinWetSpan 必须是有独立来源的有限非负湿跨下界，不能由几何猜测。");
  }
  if (!isRuntimeCalibrationSupport(rom.jointCalibrationSupport)) {
    issues.push("jointCalibrationSupport 需要有依据的完整八坐标 covered-cells 联合域。");
  } else if (rom.jointCalibrationSupport.cells.some((cell) =>
    cell.wetSpanM.minimum < (rom.calibrationMinWetSpan ?? Infinity))) {
    issues.push("联合单元湿跨下界不得低于声明的最小标定湿跨。");
  }
  if (mode === "calibrated" && (rom.inputClassification === "synthetic-only"
    || !["measured", "prescribed-motion"].includes(rom.coefficientSource))) {
    issues.push("calibrated 湿区仅接受独立 measured/prescribed-motion 输入，合成和 CFD 不取得该身份。");
  }
  return issues;
}
