import {
  APPARATUS_PARAMETERS,
  FIXED_WAKE_GAUGE,
  ROM_PARAMETERS,
  isObject,
  pushIssue,
  readJson,
} from "./prediction-shared.mjs";
import { validateApparatusRecord } from "./prediction-apparatus.mjs";
import { validateCoefficientPackage } from "./prediction-coefficients.mjs";
import { validatePredictionPlan } from "./prediction-plan.mjs";

export {
  readJson,
  validateApparatusRecord,
  validateCoefficientPackage,
  validatePredictionPlan,
};

function setPath(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  for (let index = 0; index + 1 < parts.length; index += 1) {
    const part = parts[index];
    if (!isObject(cursor[part])) throw new Error(`formal config path missing: ${path}`);
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = value;
}

function requireReady(label, validation) {
  if (!validation.pass) {
    const details = validation.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join(" | ");
    throw new Error(`${label} not ready: ${details}`);
  }
}

export function buildFormalForwardConfig(
  baseConfig,
  apparatus,
  coefficients,
  plan,
  conditionBlock,
) {
  requireReady("prediction plan", validatePredictionPlan(plan));
  requireReady("apparatus", validateApparatusRecord(apparatus));
  requireReady(
    "coefficient package",
    validateCoefficientPackage(coefficients, plan),
  );
  if (!isObject(baseConfig)
    || baseConfig.schemaVersion !== "3.0.0"
    || baseConfig.problemId !== "iypt-2027-vortex-pendulum") {
    throw new Error("base formal config identity mismatch");
  }
  const allBlocks = [
    ...plan.pilotBlocks,
    ...plan.calibrationBlocks,
    ...plan.holdoutBlocks,
  ];
  const canonicalBlock = allBlocks.find(
    ({ conditionBlockId }) => conditionBlockId === conditionBlock.conditionBlockId,
  );
  if (canonicalBlock === undefined
    || JSON.stringify(canonicalBlock) !== JSON.stringify(conditionBlock)) {
    throw new Error("condition block is not frozen in the prediction plan");
  }
  const config = structuredClone(baseConfig);
  config.backend = "forward";
  for (const path of Object.keys(APPARATUS_PARAMETERS)) {
    setPath(config, path, apparatus.parameters[path].value);
  }
  for (const path of Object.keys(ROM_PARAMETERS)) {
    setPath(config, path, coefficients.parameters[path].value);
  }
  config.rom.coefficientSetId = coefficients.packageId;
  config.rom.coefficientSource = coefficients.coefficientSource;
  config.fluid.flowSpeed = conditionBlock.flowSpeedMps;
  config.fluid.flowRampTime = conditionBlock.flowRampTimeS;
  config.fluid.flowModulationAmplitude = 0;
  config.fluid.flowModulationFrequency = 0;
  config.geometry.waterDepth = conditionBlock.waterDepthM;
  config.initial.theta = conditionBlock.initialThetaRad;
  config.initial.omega = conditionBlock.initialOmegaRadPerS;
  config.initial.wakeReal = conditionBlock.initialWakeReal;
  config.initial.wakeImaginary = conditionBlock.initialWakeImaginary;
  config.solver.duration = conditionBlock.durationS;
  return config;
}

function templateParameterPaths(record) {
  return isObject(record?.parameters) ? Object.keys(record.parameters).sort() : [];
}

export function inspectTemplateBundle({ plan, apparatus, coefficients }) {
  const issues = [];
  const planValidation = validatePredictionPlan(plan, { requireReady: false });
  const apparatusValidation = validateApparatusRecord(apparatus, {
    requireReady: false,
  });
  const coefficientValidation = validateCoefficientPackage(
    coefficients,
    plan,
    { requireReady: false },
  );
  issues.push(...planValidation.structuralIssues);
  issues.push(...apparatusValidation.structuralIssues);
  issues.push(...coefficientValidation.structuralIssues);
  for (const [label, actual, expected] of [
    [
      "apparatus",
      templateParameterPaths(apparatus),
      Object.keys(APPARATUS_PARAMETERS).sort(),
    ],
    [
      "coefficients",
      templateParameterPaths(coefficients),
      Object.keys(ROM_PARAMETERS).sort(),
    ],
  ]) {
    if (actual.join("\n") !== expected.join("\n")) {
      pushIssue(
        issues,
        "TEMPLATE-PATH-COVERAGE",
        label,
        `${label} 模板没有完整覆盖正式模型所需路径。`,
      );
    }
  }
  const dependencies = [
    ...validatePredictionPlan(plan).dependencies,
    ...validateApparatusRecord(apparatus).dependencies,
    ...validateCoefficientPackage(coefficients, plan).dependencies,
  ];
  return Object.freeze({
    decision: issues.length === 0
      ? "PASS-EXPERIMENT-PREPARATION-TOOLING-READY-WAITING-FOR-MEASUREMENTS"
      : "NO-GO-EXPERIMENT-PREPARATION-TEMPLATE",
    nonExperimentalBlockers: Object.freeze(issues),
    measurementDependencies: Object.freeze(dependencies),
    scientificConclusion: "NONE",
  });
}

export const experimentPredictionConstants = Object.freeze({
  apparatusParameters: APPARATUS_PARAMETERS,
  romParameters: ROM_PARAMETERS,
  fixedWakeGauge: FIXED_WAKE_GAUGE,
});
