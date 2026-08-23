import { diskSegment } from "../../02-模拟程序/src/problems/vortex-pendulum/geometry.ts";
import { sectionWetFraction } from "../../04-P0预测链闭合修正版/src/highFidelity/strip-wetting.ts";

const radius = 0.003;
const pivotHeight = 0.07;
const samples = 100_000;
let seed = 0x1234_abcd;

function deterministicRandom(): number {
  seed = (1_664_525 * seed + 1_013_904_223) >>> 0;
  return seed / 0x1_0000_0000;
}

let maximumAbsoluteError = 0;
let worstCase: unknown = null;

for (let index = 0; index < samples; index += 1) {
  const theta = -0.55 + 1.1 * deterministicRandom();
  const axialCoordinate = 0.04 + 0.14 * deterministicRandom();
  const sineMagnitude = Math.abs(Math.sin(theta));
  const expected = sineMagnitude <= 1e-12
    ? axialCoordinate * Math.cos(theta) - pivotHeight >= 0 ? 1 : 0
    : diskSegment(
        radius,
        (axialCoordinate * Math.cos(theta) - pivotHeight) / sineMagnitude,
      ).area / (Math.PI * radius * radius);
  const actual = sectionWetFraction(theta, axialCoordinate, radius, pivotHeight);
  const absoluteError = Math.abs(actual - expected);
  if (absoluteError > maximumAbsoluteError) {
    maximumAbsoluteError = absoluteError;
    worstCase = { theta, axialCoordinate, actual, expected, absoluteError };
  }
}

console.log(JSON.stringify({
  format: "VP-LOCAL-REVIEW-STRIP-RANDOM-CROSSCHECK-v1",
  purpose: "Cross-check the candidate circular-segment area fraction against the existing exact diskSegment kernel.",
  deterministicSeed: "0x1234abcd",
  samples,
  radius,
  pivotHeight,
  maximumAbsoluteError,
  worstCase,
  verdict: maximumAbsoluteError < 1e-14 ? "PASS" : "FAIL",
}, null, 2));
