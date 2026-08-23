import { DEFAULT_CONFIG } from "../../02-模拟程序/src/core/config.ts";
import { evaluateForward } from "../../02-模拟程序/src/solvers/forward/model.ts";
import { evaluateForwardP0 } from "../../04-P0预测链闭合修正版/src/forward/model.ts";

const config = structuredClone(DEFAULT_CONFIG);
config.geometry.pivotHeight = config.geometry.bottomDistance;
config.fluid.flowRampTime = 0;

const baseState = {
  omega: 0,
  wakeReal: 0.02,
  wakeImaginary: -0.01,
};

const results = [0, 1e-10, 1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3].map((theta) => {
  const state = { theta, ...baseState };
  const original = evaluateForward(config, 1, state);
  const candidate = evaluateForwardP0(config, 1, state);
  return {
    theta,
    projectedArea: candidate.wetting.projectedArea,
    wetFraction: candidate.wetting.wetFraction,
    candidateActivation: candidate.wetting.activation,
    originalSheddingAngularFrequency: original.sheddingAngularFrequency,
    candidateSheddingAngularFrequency: candidate.sheddingAngularFrequency,
    originalWakeGrowthRate: original.wakeGrowthRate,
    candidateWakeGrowthRate: candidate.wakeGrowthRate,
    originalWakeRealDerivative: original.derivative.wakeReal,
    candidateWakeRealDerivative: candidate.derivative.wakeReal,
  };
});

console.log(JSON.stringify({
  format: "VP-LOCAL-REVIEW-DRY-WET-ONSET-v1",
  purpose: "Compare the original Boolean onset with the candidate continuous wetting closure.",
  configChange: "pivotHeight=bottomDistance and flowRampTime=0",
  initialWake: { wakeReal: baseState.wakeReal, wakeImaginary: baseState.wakeImaginary },
  results,
}, null, 2));
