import { DEFAULT_CONFIG } from "../../02-模拟程序/src/core/config.ts";
import { inspectCfd2dStripWetting } from "../../04-P0预测链闭合修正版/src/highFidelity/strip-wetting.ts";

const config = structuredClone(DEFAULT_CONFIG);
config.cfd2d.stripAxialCoordinate = config.geometry.pivotHeight;

const results = [0, 1e-13, 2e-12, 1e-10, 1e-8].map((theta) =>
  inspectCfd2dStripWetting(config, theta));

console.log(JSON.stringify({
  format: "VP-LOCAL-REVIEW-FREE-SURFACE-STRIP-v1",
  purpose: "Demonstrate the degenerate free-surface strip classification discontinuity.",
  radius: config.geometry.radius,
  pivotHeight: config.geometry.pivotHeight,
  stripAxialCoordinate: config.cfd2d.stripAxialCoordinate,
  results,
  expectedAfterFix: "theta=0 at stripAxialCoordinate=pivotHeight must be touching/unsupported, not full/supported.",
}, null, 2));
