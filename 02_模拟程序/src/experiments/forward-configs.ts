import {
  APPARATUS_PARAMETERS,
  apparatusParameterUnits,
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
  jointDomainCells,
} from "./coefficients";
import { validatePredictionPlan } from "./plan";
import { canonicalClone, stableCanonicalJson } from "../core/canonical";
import { deriveParameters, validateConfig } from "../core/config";
import type { RuntimeCalibrationCell, SimulationConfig } from "../core/types";
import { coefficientParameterUnits, isAlignedPackage, packageHasStickSlip, SS_APPARATUS_PARAMETERS } from "./alignment";
import { evaluateForwardDomain, firstInvalidForwardWetGuard } from "../solvers/forward/model";
import { validateJointUncertaintyModel, type JointUncertaintyModel } from "./uncertainty";
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
    validateApparatusRecord(apparatus, { allowSynthetic, supportModel: isObject(coefficients) && packageHasStickSlip(coefficients) ? "stick-slip" : "smooth" }),
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
  for (const path of Object.keys(apparatusParameterUnits(packageHasStickSlip(coefficients) ? "stick-slip" : "smooth"))) {
    setPath(config as unknown as JsonRecord, path, apparatus.parameters[path].value);
  }
  for (const path of Object.keys(coefficientParameterUnits(coefficients))) {
    setPath(config as unknown as JsonRecord, path, coefficients.parameters[path].value);
  }
  config.rom.modelId = coefficients.modelId;
  config.rom.inputClassification = allowSynthetic ? "synthetic-only" : "calibrated-input-unheldout";
  if (isAlignedPackage(coefficients)) {
    config.rom.wetSupportMode = allowSynthetic ? "synthetic-only" : "calibrated";
    config.rom.wetSpanDefinition = coefficients.wetSpanDefinition;
    config.rom.dragWidthDefinition = coefficients.dragWidthDefinition;
    config.rom.wakeGauge = canonicalClone(coefficients.wakeGauge);
    const cells = jointDomainCells(coefficients);
    if (cells === null) throw new Error("aligned runtime joint support is missing");
    config.rom.jointCalibrationSupport = {
      kind: "covered-cells", evidence: coefficients.calibrationDomain.jointSupport.evidence,
      cells: cells.map((cell) => Object.fromEntries([
        "flowSpeedMps", "waterDepthM", "pivotHeightM", "reynolds", "wetSpanM",
        "absThetaRad", "velocityRatio", "normalizedInflowRate",
      ].map((key) => [key, canonicalClone(cell[key])]))) as unknown as RuntimeCalibrationCell[],
    };
    if (packageHasStickSlip(coefficients)) {
      for (const path of Object.keys(SS_APPARATUS_PARAMETERS)) {
        setPath(config as unknown as JsonRecord, path, apparatus.parameters[path].value);
      }
    }
  } else {
    // A base config is an integration-settings source, not a hidden source of
    // newer physical closure/qualification metadata for a historical package.
    config.rom.wetSupportMode = "legacy-unqualified";
    delete config.rom.wetSpanDefinition;
    delete config.rom.calibrationMinWetSpan;
    delete config.rom.jointCalibrationSupport;
    delete config.rom.wakeGauge;
    delete config.rom.dragWidthDefinition;
  }
  delete config.rom.jointUncertainty;
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
  if (isAlignedPackage(coefficients)) {
    if (conditionBlock.wakeGaugeId !== coefficients.wakeGauge.id) {
      throw new Error("condition initial wakeGaugeId must match coefficient coordinate identity");
    }
    if (coefficients.jointUncertainty != null && coefficients.jointUncertaintyByCondition != null) {
      throw new Error("choose jointUncertainty or jointUncertaintyByCondition, not both");
    }
    const selected: JointUncertaintyModel | undefined = coefficients.jointUncertaintyByCondition != null
      ? coefficients.jointUncertaintyByCondition[conditionBlock.conditionBlockId]
      : coefficients.jointUncertainty ?? undefined;
    if (coefficients.jointUncertaintyByCondition != null && selected === undefined) {
      throw new Error(`missing condition-specific uncertainty for ${conditionBlock.conditionBlockId}`);
    }
    if (selected !== undefined) {
      validateJointUncertaintyModel(selected, { requireFormalParameterPaths: true });
      for (let index = 0; index < selected.parameterPaths.length; index += 1) {
        const path = selected.parameterPaths[index] as string;
        const value = path.split(".").reduce<unknown>((value, key) =>
          isObject(value) ? value[key] : undefined, config);
        const mean = selected.means[index] as number;
        if (typeof value !== "number" || Math.abs(value - mean) > 1e-12 * Math.max(1, Math.abs(value), Math.abs(mean))) {
          throw new Error(`uncertainty mean mismatch at ${path}; condition-specific initial values cannot be silently reused`);
        }
      }
      config.rom.jointUncertainty = canonicalClone(selected);
    }
  }
  const formalIssues = validateConfig(config);
  if (formalIssues.length > 0) {
    throw new Error(
      `constructed formal config validation failed: ${formalIssues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join(" | ")}`,
    );
  }
  if (isAlignedPackage(coefficients)) {
    const domain = evaluateForwardDomain(config, 0, config.initial, deriveParameters(config));
    const invalid = firstInvalidForwardWetGuard(config, domain);
    if (invalid !== undefined) throw new Error(`initial forward domain ${invalid.code}: ${invalid.message}`);
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
    supportModel: isObject(coefficients) && packageHasStickSlip(coefficients) ? "stick-slip" : "smooth",
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
      Object.keys(apparatusParameterUnits(isObject(coefficients) && packageHasStickSlip(coefficients) ? "stick-slip" : "smooth")).sort(),
    ],
    [
      "coefficients",
      templateParameterPaths(coefficients),
      Object.keys(coefficientParameterUnits(isObject(coefficients) ? coefficients : {})).sort(),
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
    ...validateApparatusRecord(apparatus, { supportModel: isObject(coefficients) && packageHasStickSlip(coefficients) ? "stick-slip" : "smooth" }).dependencies,
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
  requireReady("apparatus", validateApparatusRecord(apparatus, { allowSynthetic, supportModel: isObject(coefficients) && packageHasStickSlip(coefficients) ? "stick-slip" : "smooth" }));
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
      modelId: coefficients.modelId,
      coefficientSchema: coefficients.schemaVersion,
      wetSpanDefinition: coefficients.wetSpanDefinition ?? "legacy-unqualified",
      wakeGauge: coefficients.wakeGauge,
      uncertaintyIdentity: coefficients.jointUncertainty?.basisId ??
        (coefficients.jointUncertaintyByCondition != null ? "condition-specific" : null),
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
