import { DEFAULT_CONFIG } from "../../02-模拟程序/src/core/config.ts";
import { evaluateForwardGuardsP0 } from "../../04-P0预测链闭合修正版/src/forward/model.ts";
import { linearizeForwardAtEquilibrium } from "../../04-P0预测链闭合修正版/src/structure/equilibrium.ts";

const config = structuredClone(DEFAULT_CONFIG);
const flowSpeed = 0.05;
const linearization = linearizeForwardAtEquilibrium(config, flowSpeed);
const guards = evaluateForwardGuardsP0(
  linearization.config,
  1,
  linearization.state,
);
const violatedGuards = guards.filter((guard) => guard.margin < 0);

console.log(JSON.stringify({
  format: "VP-LOCAL-REVIEW-EQUILIBRIUM-GUARD-v1",
  purpose: "Demonstrate that the candidate currently returns a spectrum at an out-of-domain equilibrium.",
  flowSpeed,
  coefficientMaxReynolds: config.rom.calibrationMaxReynolds,
  returnedSpectrum: linearization.characteristic.every(Number.isFinite),
  residualNorm: linearization.residualNorm,
  equilibriumState: linearization.state,
  characteristic: linearization.characteristic,
  violatedGuards,
  expectedAfterFix: "The structural linearization must reject the spectrum before returning a Jacobian or characteristic polynomial.",
}, null, 2));
