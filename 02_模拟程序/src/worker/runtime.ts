import type {
  SimulationConfig,
  SimulationResult,
  SolverControl,
  WorkerCommand,
  WorkerResponse,
} from "../core/types";

export type Solver = (
  config: SimulationConfig,
  control?: SolverControl,
  runId?: string,
) => Promise<SimulationResult>;

export interface SolverLoaders {
  forward(): Promise<Solver>;
  highFidelity(): Promise<Solver>;
}

export interface WorkerRuntime {
  handle(command: WorkerCommand): void;
}

interface RunContext {
  readonly runId: string;
  readonly config: SimulationConfig;
  paused: boolean;
  stopped: boolean;
  pauseWaiters: Set<() => void>;
}

const defaultLoaders: SolverLoaders = {
  async forward() {
    const { runForward } = await import("../solvers/forward");
    return runForward;
  },
  async highFidelity() {
    const { runHighFidelity } = await import("../solvers/highFidelity");
    return runHighFidelity;
  },
};

function yieldMacrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function errorDetails(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return error.stack === undefined
      ? { message: error.message }
      : { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

/**
 * Creates the stateful part of the simulation worker without depending on a
 * global Worker scope. Keeping this boundary explicit makes control semantics
 * testable in Node and keeps the production worker entry very small.
 */
export function createWorkerRuntime(
  postResponse: (response: WorkerResponse) => void,
  loaders: SolverLoaders = defaultLoaders,
): WorkerRuntime {
  let active: RunContext | undefined;

  const isActive = (context: RunContext): boolean => active === context;

  const emit = (context: RunContext, response: WorkerResponse): void => {
    if (isActive(context)) postResponse(response);
  };

  const wakePausedRun = (context: RunContext): void => {
    for (const resolve of context.pauseWaiters) resolve();
    context.pauseWaiters.clear();
  };

  const detach = (context: RunContext): void => {
    context.stopped = true;
    context.paused = false;
    wakePausedRun(context);
    if (isActive(context)) active = undefined;
  };

  const waitWhilePaused = async (context: RunContext): Promise<void> => {
    while (isActive(context) && context.paused && !context.stopped) {
      await new Promise<void>((resolve) => context.pauseWaiters.add(resolve));
    }
  };

  const makeControl = (context: RunContext): SolverControl => ({
    isPaused: () => isActive(context) && context.paused,
    isStopped: () => !isActive(context) || context.stopped,
    waitWhilePaused: () => waitWhilePaused(context),
    report(progress, sample, field) {
      if (!isActive(context) || context.stopped || context.paused) return;

      const response: WorkerResponse = {
        type: "progress",
        runId: context.runId,
        progress: Number.isFinite(progress)
          ? Math.min(1, Math.max(0, progress))
          : 0,
        ...(sample === undefined ? {} : { sample }),
        ...(field === undefined ? {} : { field }),
      };
      postResponse(response);
    },
    async yieldToEventLoop() {
      await yieldMacrotask();
      await waitWhilePaused(context);
    },
  });

  const finishCancelled = (context: RunContext): void => {
    if (!isActive(context)) return;
    emit(context, { type: "state", runId: context.runId, state: "cancelled" });
    detach(context);
  };

  const execute = async (context: RunContext): Promise<void> => {
    try {
      const solver = context.config.backend === "forward"
        ? await loaders.forward()
        : await loaders.highFidelity();

      if (!isActive(context)) return;
      if (context.stopped) {
        finishCancelled(context);
        return;
      }

      const result = await solver(context.config, makeControl(context), context.runId);
      if (!isActive(context)) return;
      if (context.stopped) {
        finishCancelled(context);
        return;
      }

      emit(context, { type: "state", runId: context.runId, state: "completed" });
      emit(context, { type: "complete", runId: context.runId, result });
      detach(context);
    } catch (error) {
      if (!isActive(context)) return;
      if (context.stopped) {
        finishCancelled(context);
        return;
      }

      const details = errorDetails(error);
      emit(context, { type: "state", runId: context.runId, state: "failed" });
      emit(context, { type: "error", runId: context.runId, ...details });
      detach(context);
    }
  };

  const start = (command: Extract<WorkerCommand, { type: "run" }>): void => {
    if (active !== undefined) detach(active);

    const context: RunContext = {
      runId: command.runId,
      config: command.config,
      paused: false,
      stopped: false,
      pauseWaiters: new Set(),
    };
    active = context;
    emit(context, { type: "state", runId: context.runId, state: "running" });
    void execute(context);
  };

  const pause = (runId: string): void => {
    const context = active;
    if (context === undefined || context.runId !== runId || context.stopped || context.paused) return;
    context.paused = true;
    emit(context, { type: "state", runId, state: "paused" });
  };

  const resume = (runId: string): void => {
    const context = active;
    if (context === undefined || context.runId !== runId || context.stopped || !context.paused) return;
    context.paused = false;
    wakePausedRun(context);
    emit(context, { type: "state", runId, state: "running" });
  };

  const stop = (runId: string): void => {
    const context = active;
    if (context === undefined || context.runId !== runId || context.stopped) return;
    context.stopped = true;
    context.paused = false;
    wakePausedRun(context);
    emit(context, { type: "state", runId, state: "stopping" });
  };

  return {
    handle(command) {
      switch (command.type) {
        case "run":
          start(command);
          break;
        case "pause":
          pause(command.runId);
          break;
        case "resume":
          resume(command.runId);
          break;
        case "stop":
          stop(command.runId);
          break;
      }
    },
  };
}
