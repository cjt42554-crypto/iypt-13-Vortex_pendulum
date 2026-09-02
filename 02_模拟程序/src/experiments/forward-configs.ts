import {
  APPARATUS_PARAMETERS,
  FIXED_WAKE_GAUGE,
  ROM_PARAMETERS,
  isObject,
  pushIssue,
  readJson,
} from "./validation";
import { validateApparatusRecord } from "./apparatus";
import {
  validateCoefficientPackage,
  validateConditionAgainstCalibrationDomain,
} from "./coefficients";
import { validatePredictionPlan } from "./plan";
import { canonicalClone, stableCanonicalJson } from "../core/canonical";
import { validateConfig } from "../core/config";
import type { SimulationConfig } from "../core/types";
import {
  publishJsonArtifactSetExclusive,
  type JsonArtifactInput,
  type PublishedArtifactSet,
} from "../core/artifacts";
import type { SourceBinding } from "../core/source-bindings";
import type {
  ExperimentValidationIssue,
  ExperimentValidationOptions,
  ExperimentValidationResult,
  JsonRecord,
} from "./types";

export {
  readJson,
  validateApparatusRecord,
  validateCoefficientPackage,
  validateConditionAgainstCalibrationDomain,
  validatePredictionPlan,
};

function setPath(target: JsonRecord, path: string, value: unknown): void {
  const parts = path.split(".");
  let cursor = target;
  for (let index = 0; index + 1 < parts.length; index += 1) {
    const part = parts[index];
    if (part === undefined) throw new Error(`formal config path missing: ${path}`);
    if (!isObject(cursor[part])) throw new Error(`formal config path missing: ${path}`);
    cursor = cursor[part];
  }
  const finalPart = parts.at(-1);
  if (finalPart === undefined) throw new Error(`formal config path missing: ${path}`);
  cursor[finalPart] = value;
}

function requireReady(label: string, validation: ExperimentValidationResult): void {
  if (!validation.pass) {
    const details = validation.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join(" | ");
    throw new Error(`${label} not ready: ${details}`);
  }
}

function assertFormalConfig(value: unknown): SimulationConfig {
  if (!isObject(value)
    || value.schemaVersion !== "3.0.0"
    || value.problemId !== "iypt-2027-vortex-pendulum") {
    throw new Error("base formal config identity mismatch");
  }
  for (const key of ["geometry", "body", "fluid", "support", "rom", "cfd2d", "initial", "solver"]) {
    if (!isObject(value[key])) throw new Error(`base formal config section missing: ${key}`);
  }
  const config = canonicalClone(value) as SimulationConfig;
  let issues;
  try {
    issues = validateConfig(config);
  } catch (error) {
    throw new Error(`base formal config structure invalid: ${String(error)}`);
  }
  if (issues.length > 0) {
    throw new Error(
      `base formal config validation failed: ${issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join(" | ")}`,
    );
  }
  return config;
}

export function buildFormalForwardConfig(
  baseConfig: unknown,
  apparatus: unknown,
  coefficients: unknown,
  plan: unknown,
  conditionBlock: unknown,
  { allowSynthetic = false }: ExperimentValidationOptions = {},
): SimulationConfig {
  requireReady(
    "prediction plan",
    validatePredictionPlan(plan, { allowSynthetic }),
  );
  requireReady(
    "apparatus",
    validateApparatusRecord(apparatus, { allowSynthetic }),
  );
  requireReady(
    "coefficient package",
    validateCoefficientPackage(coefficients, plan, apparatus, { allowSynthetic }),
  );
  if (!isObject(plan)
    || !isObject(apparatus)
    || !isObject(coefficients)
    || !isObject(conditionBlock)) {
    throw new Error("validated prediction inputs are not objects");
  }
  const config = assertFormalConfig(baseConfig);
  const allBlocks = [
    ...plan.pilotBlocks,
    ...plan.calibrationBlocks,
    ...plan.holdoutBlocks,
  ];
  const canonicalBlock = allBlocks.find(
    (block: JsonRecord) => block.conditionBlockId === conditionBlock.conditionBlockId,
  );
  if (canonicalBlock === undefined
    || stableCanonicalJson(canonicalBlock) !== stableCanonicalJson(conditionBlock)) {
    throw new Error("condition block is not frozen in the prediction plan");
  }
  requireReady(
    "condition calibration domain",
    validateConditionAgainstCalibrationDomain(
      coefficients,
      apparatus,
      conditionBlock,
      { path: `conditionBlock.${conditionBlock.conditionBlockId}` },
    ),
  );
  config.backend = "forward";
  for (const path of Object.keys(APPARATUS_PARAMETERS)) {
    setPath(config as unknown as JsonRecord, path, apparatus.parameters[path].value);
  }
  for (const path of Object.keys(ROM_PARAMETERS)) {
    setPath(config as unknown as JsonRecord, path, coefficients.parameters[path].value);
  }
  config.rom.coefficientSetId = coefficients.packageId;
  config.rom.coefficientSource = coefficients.coefficientSource;
  config.fluid.flowSpeed = conditionBlock.flowSpeedMps;
  config.fluid.flowRampTime = conditionBlock.flowRampTimeS;
  config.fluid.flowModulationAmplitude = 0;
  config.fluid.flowModulationFrequency = 0;
  config.geometry.waterDepth = conditionBlock.waterDepthM;
  config.geometry.pivotHeight = conditionBlock.pivotHeightM;
  config.initial.theta = conditionBlock.initialThetaRad;
  config.initial.omega = conditionBlock.initialOmegaRadPerS;
  config.initial.wakeReal = conditionBlock.initialWakeReal;
  config.initial.wakeImaginary = conditionBlock.initialWakeImaginary;
  config.solver.duration = conditionBlock.durationS;
  const formalIssues = validateConfig(config);
  if (formalIssues.length > 0) {
    throw new Error(
      `constructed formal config validation failed: ${formalIssues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join(" | ")}`,
    );
  }
  return config;
}

function templateParameterPaths(record: unknown): string[] {
  return isObject(record) && isObject(record.parameters)
    ? Object.keys(record.parameters).sort()
    : [];
}

export function inspectTemplateBundle({
  plan,
  apparatus,
  coefficients,
}: {
  plan: unknown;
  apparatus: unknown;
  coefficients: unknown;
}) {
  const issues: ExperimentValidationIssue[] = [];
  const planValidation = validatePredictionPlan(plan, { requireReady: false });
  const apparatusValidation = validateApparatusRecord(apparatus, {
    requireReady: false,
  });
  const coefficientValidation = validateCoefficientPackage(
    coefficients,
    plan,
    apparatus,
    { requireReady: false },
  );
  issues.push(...planValidation.structuralIssues);
  issues.push(...apparatusValidation.structuralIssues);
  issues.push(...coefficientValidation.structuralIssues);
  const pathSets: readonly (readonly [string, string[], string[]])[] = [
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
  ];
  for (const [label, actual, expected] of pathSets) {
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
    ...validateCoefficientPackage(coefficients, plan, apparatus).dependencies,
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

export interface FrozenForwardConfigSet {
  readonly payloads: readonly JsonArtifactInput[];
  readonly manifestBase: Readonly<Record<string, unknown>>;
}

function validateSourceBindings(bindings: readonly SourceBinding[]): readonly SourceBinding[] {
  const requiredRoles = new Set([
    "prediction-plan",
    "apparatus",
    "rom-coefficients",
    "base-formal-config",
  ]);
  const seen = new Set<string>();
  for (const binding of bindings) {
    if (!requiredRoles.has(binding.role)) {
      throw new Error(`unexpected prediction source-binding role: ${binding.role}`);
    }
    if (seen.has(binding.role)) throw new Error(`duplicate source-binding role: ${binding.role}`);
    if (!/^[0-9a-f]{64}$/u.test(binding.sha256)
      || !Number.isInteger(binding.bytes)
      || binding.bytes <= 0
      || binding.sourcePath.trim() === "") {
      throw new Error(`invalid source binding for ${binding.role}`);
    }
    seen.add(binding.role);
  }
  for (const role of requiredRoles) {
    if (!seen.has(role)) throw new Error(`missing source-binding role: ${role}`);
  }
  return Object.freeze(
    [...bindings]
      .sort((left, right) => left.role.localeCompare(right.role))
      .map((binding) => Object.freeze({ ...binding })),
  );
}

/** Build and validate the entire frozen config set without writing any files. */
export function buildFrozenForwardConfigSet(
  {
    baseConfig,
    apparatus,
    coefficients,
    plan,
    sourceBindings,
  }: {
    baseConfig: unknown;
    apparatus: unknown;
    coefficients: unknown;
    plan: unknown;
    sourceBindings: readonly SourceBinding[];
  },
  { allowSynthetic = false }: ExperimentValidationOptions = {},
): FrozenForwardConfigSet {
  requireReady("prediction plan", validatePredictionPlan(plan, { allowSynthetic }));
  requireReady("apparatus", validateApparatusRecord(apparatus, { allowSynthetic }));
  requireReady(
    "coefficient package",
    validateCoefficientPackage(coefficients, plan, apparatus, { allowSynthetic }),
  );
  if (!isObject(plan) || !isObject(apparatus) || !isObject(coefficients)) {
    throw new Error("validated prediction inputs are not objects");
  }
  const bindings = validateSourceBindings(sourceBindings);
  const blocks = [
    ...(Array.isArray(plan.calibrationBlocks) ? plan.calibrationBlocks : []),
    ...(Array.isArray(plan.holdoutBlocks) ? plan.holdoutBlocks : []),
  ];
  const payloads = blocks.map((block: unknown): JsonArtifactInput => {
    if (!isObject(block) || typeof block.conditionBlockId !== "string") {
      throw new Error("validated condition block lacks a safe identifier");
    }
    return Object.freeze({
      fileName: `${block.conditionBlockId}.json`,
      value: buildFormalForwardConfig(
        baseConfig,
        apparatus,
        coefficients,
        plan,
        block,
        { allowSynthetic },
      ),
      metadata: Object.freeze({
        conditionBlockId: block.conditionBlockId,
        role: block.role,
        frozenInPredictionPlan: true,
      }),
    });
  });
  if (payloads.length === 0) throw new Error("no calibration or holdout blocks to publish");
  return Object.freeze({
    payloads: Object.freeze(payloads),
    manifestBase: Object.freeze(canonicalClone({
      schemaVersion: "VP-FORWARD-PREDICTION-CONFIG-MANIFEST-v2",
      planId: plan.planId,
      planFrozenAt: plan.freeze?.frozenAt,
      apparatusId: apparatus.apparatusId,
      apparatusRevision: apparatus.revision,
      coefficientPackageId: coefficients.packageId,
      modelId: "VP-FWD-P0-SL1-v1",
      quantitativeBackend: "forward",
      cfd2dRole: "qualitative-only",
      formalConfigValidation: "validateConfig-zero-issues",
      holdoutOutcomesUnreadAtFreeze: plan.freeze?.holdoutOutcomesUnread,
      inputSourceBindings: bindings,
    })),
  });
}

export async function publishFrozenForwardConfigSet(
  destinationDirectory: string,
  set: FrozenForwardConfigSet,
): Promise<PublishedArtifactSet> {
  return publishJsonArtifactSetExclusive(
    destinationDirectory,
    set.payloads,
    set.manifestBase,
  );
}
