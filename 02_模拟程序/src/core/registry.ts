import {
  assertProblemPlugin,
  type AnyProblemPlugin,
  type ObservationRecord,
  type ProblemPlugin,
} from "./plugin";

/**
 * Generic problem catalog. It has no knowledge of a particular IYPT problem;
 * problem packages opt in by calling register when they are loaded.
 */
export class ProblemRegistry {
  readonly #plugins = new Map<string, AnyProblemPlugin>();

  register<
    TConfig extends object,
    TSample,
    TObservation extends ObservationRecord,
    TBackendId extends string,
  >(plugin: ProblemPlugin<TConfig, TSample, TObservation, TBackendId>): void {
    const erased = plugin as unknown as AnyProblemPlugin;
    assertProblemPlugin(erased);
    const id = plugin.manifest.id;
    if (this.#plugins.has(id)) throw new Error(`Problem plugin already registered: ${id}`);
    this.#plugins.set(id, erased);
  }

  unregister(id: string): boolean {
    return this.#plugins.delete(id);
  }

  has(id: string): boolean {
    return this.#plugins.has(id);
  }

  get(id: string): AnyProblemPlugin | undefined {
    return this.#plugins.get(id);
  }

  require(id: string): AnyProblemPlugin {
    const plugin = this.get(id);
    if (!plugin) throw new Error(`Unknown problem plugin: ${id}`);
    return plugin;
  }

  list(): readonly AnyProblemPlugin[] {
    return [...this.#plugins.values()];
  }

  clear(): void {
    this.#plugins.clear();
  }
}

export const problemRegistry = new ProblemRegistry();
