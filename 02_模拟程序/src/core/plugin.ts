/**
 * Problem-level extension contract for the shared competition-physics shell.
 *
 * This module intentionally does not import any concrete problem configuration.
 * A problem adapts its own configuration and solver samples to this contract.
 */

export type PluginValue = number | string | boolean | null;
export type ObservationRecord = Readonly<Record<string, PluginValue>>;

export interface ProblemPluginManifest {
  /** Stable, URL-safe identifier; also used by saved configurations. */
  id: string;
  /** Version of the problem plugin, independent of the application version. */
  version: `${number}.${number}.${number}`;
  /** Schema version expected in serialized configurations. */
  configSchemaVersion: string;
  title: string;
  shortTitle: string;
  description: string;
  competition: {
    name: string;
    year: number;
    problemNumber: number;
  };
  tags: readonly string[];
}

export type ParameterValueType = "number" | "integer" | "boolean" | "enum" | "string";

export interface PluginParameterSpec<TBackendId extends string = string> {
  /** Dot-separated path in the problem configuration. */
  path: string;
  label: string;
  symbol?: string;
  description: string;
  unit: string;
  category: string;
  valueType: ParameterValueType;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly PluginValue[];
  /** Omitted when the parameter is shared by every backend. */
  backends?: readonly TBackendId[];
}

export type ObservableKind = "time-series" | "scalar" | "field" | "event";

export interface ObservableSpec {
  /** Stable key returned by the observation operator and used in tabular data. */
  id: string;
  label: string;
  symbol?: string;
  unit: string;
  description: string;
  kind: ObservableKind;
  /** Whether this observable may be matched directly to an experimental column. */
  experimental: boolean;
}

export type ResearchLayer = 1 | 2 | 3 | 4;

export interface BackendCapability<TBackendId extends string = string> {
  id: TBackendId;
  label: string;
  description: string;
  fidelity: "forward" | "high-fidelity";
  researchLayers: readonly ResearchLayer[];
  capabilities: {
    pauseResume: boolean;
    streamingSamples: boolean;
    fieldFrames: boolean;
    parameterSweep: boolean;
    deterministicSeed: boolean;
  };
  limitations: readonly string[];
}

export interface PluginValidationIssue {
  severity: "error" | "warning" | "info";
  path: string;
  message: string;
}

/**
 * The observation operator H maps a solver state/sample to quantities that can
 * be plotted or compared with experiment: Y(t) = H[X(t)].
 */
export type ObservationOperator<
  TConfig extends object,
  TSample,
  TObservation extends ObservationRecord,
> = (sample: TSample, config: TConfig) => TObservation;

export interface ProblemPlugin<
  TConfig extends object = object,
  TSample = unknown,
  TObservation extends ObservationRecord = ObservationRecord,
  TBackendId extends string = string,
> {
  manifest: ProblemPluginManifest;
  parameters: readonly PluginParameterSpec<TBackendId>[];
  observables: readonly ObservableSpec[];
  backends: readonly BackendCapability<TBackendId>[];
  createDefaultConfig(): TConfig;
  validateConfig(config: TConfig): readonly PluginValidationIssue[];
  observe: ObservationOperator<TConfig, TSample, TObservation>;
}

/** Registry-safe erased view. Typed consumers should keep their concrete plugin. */
export type AnyProblemPlugin = ProblemPlugin<object, never, ObservationRecord, string>;

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) throw new Error(`Problem plugin ${field} must not be empty`);
}

function assertUnique(values: readonly string[], field: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate problem plugin ${field}: ${value}`);
    seen.add(value);
  }
}

/** Fail early when a plugin is registered with an incomplete public contract. */
export function assertProblemPlugin(plugin: AnyProblemPlugin): void {
  assertNonEmpty(plugin.manifest.id, "manifest.id");
  assertNonEmpty(plugin.manifest.title, "manifest.title");
  assertNonEmpty(plugin.manifest.configSchemaVersion, "manifest.configSchemaVersion");
  if (!/^\d+\.\d+\.\d+$/.test(plugin.manifest.version)) {
    throw new Error(`Invalid problem plugin version: ${plugin.manifest.version}`);
  }
  if (!Number.isInteger(plugin.manifest.competition.year)
    || !Number.isInteger(plugin.manifest.competition.problemNumber)) {
    throw new Error("Problem plugin competition year and problem number must be integers");
  }
  if (plugin.backends.length === 0) throw new Error("Problem plugin must declare at least one backend");
  if (plugin.observables.length === 0) throw new Error("Problem plugin must declare at least one observable");

  assertUnique(plugin.parameters.map((parameter) => parameter.path), "parameter path");
  assertUnique(plugin.observables.map((observable) => observable.id), "observable id");
  assertUnique(plugin.backends.map((backend) => backend.id), "backend id");

  const backendIds = new Set(plugin.backends.map((backend) => backend.id));
  for (const parameter of plugin.parameters) {
    assertNonEmpty(parameter.path, "parameter.path");
    if (parameter.backends) {
      for (const backend of parameter.backends) {
        if (!backendIds.has(backend)) {
          throw new Error(`Parameter ${parameter.path} references unknown backend: ${backend}`);
        }
      }
    }
  }

  const defaultConfig = plugin.createDefaultConfig();
  if (typeof defaultConfig !== "object" || defaultConfig === null) {
    throw new Error("Problem plugin createDefaultConfig() must return an object");
  }
  const serialized = defaultConfig as Record<string, unknown>;
  if (typeof serialized.problemId === "string" && serialized.problemId !== plugin.manifest.id) {
    throw new Error(
      `Default config problemId ${serialized.problemId} does not match manifest id ${plugin.manifest.id}`,
    );
  }
  if (typeof serialized.schemaVersion === "string"
    && serialized.schemaVersion !== plugin.manifest.configSchemaVersion) {
    throw new Error(
      `Default config schemaVersion ${serialized.schemaVersion} does not match manifest config schema version ${plugin.manifest.configSchemaVersion}`,
    );
  }
}
