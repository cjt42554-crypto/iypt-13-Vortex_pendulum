import { problemRegistry, type ProblemRegistry } from "../../core/registry";
import { VORTEX_PENDULUM_PLUGIN } from "./plugin";

export * from "./plugin";

/** Explicit registration hook for isolated registries and tests. */
export function registerVortexPendulum(registry: ProblemRegistry = problemRegistry): void {
  if (!registry.has(VORTEX_PENDULUM_PLUGIN.manifest.id)) {
    registry.register(VORTEX_PENDULUM_PLUGIN);
  }
}

// Loading the built-in problem package makes it visible to the shared GUI.
registerVortexPendulum();
