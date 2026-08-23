import { normalizedWettingActivation } from "../../04-P0预测链闭合修正版/src/wetting.ts";

const wetFraction = 0.5;
const activationFractions = [0.05, 1, 1e100, 1e200, Number.MAX_VALUE];

const results = activationFractions.map((activationFraction) => {
  try {
    const result = normalizedWettingActivation(wetFraction, activationFraction);
    return {
      activationFraction,
      result,
      rawResult: String(result),
      finite: Number.isFinite(result),
      inUnitInterval: result >= 0 && result <= 1,
      threw: false,
    };
  } catch (error) {
    return {
      activationFraction,
      result: null,
      rawResult: null,
      finite: false,
      inUnitInterval: false,
      threw: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

console.log(JSON.stringify({
  format: "VP-LOCAL-REVIEW-ACTIVATION-FINITENESS-v1",
  purpose: "Demonstrate that finite positive activation scales can currently pass validation and still produce NaN.",
  wetFraction,
  results,
  expectedAfterFix: "Every activationFraction accepted by input validation must return a finite value in [0,1].",
}, null, 2));
