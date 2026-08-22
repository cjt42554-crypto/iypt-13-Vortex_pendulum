import type {
  RunState,
  SimulationConfig,
  SimulationResult,
  WorkerCommand,
  WorkerResponse,
} from "./types";

export interface WorkerPort {
  postMessage(command: WorkerCommand): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<WorkerResponse>) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<WorkerResponse>) => void,
  ): void;
  terminate?(): void;
}

export type RunnerListener = (response: WorkerResponse) => void;

function createRunId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createDefaultWorker(): WorkerPort {
  if (typeof Worker === "undefined") {
    throw new Error("SimulationRunner requires a Worker in this environment; inject a WorkerPort for tests.");
  }
  return new Worker(new URL("../worker/simulation.worker.ts", import.meta.url), { type: "module" });
}

export class SimulationRunner {
  private readonly worker: WorkerPort;
  private readonly listeners = new Set<RunnerListener>();
  private readonly handleMessage = (event: MessageEvent<WorkerResponse>): void => {
    const response = event.data;
    if (response.runId !== this.runId) return;

    if (response.type === "state") this.state = response.state;
    if (response.type === "progress") this.progress = response.progress;
    if (response.type === "complete") {
      this.result = response.result;
      this.progress = 1;
    }
    if (response.type === "error") this.error = response.message;

    for (const listener of this.listeners) listener(response);
  };

  runId: string | undefined;
  state: RunState = "ready";
  progress = 0;
  result: SimulationResult | undefined;
  error: string | undefined;

  constructor(worker: WorkerPort = createDefaultWorker()) {
    this.worker = worker;
    this.worker.addEventListener("message", this.handleMessage);
  }

  subscribe(listener: RunnerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  run(config: SimulationConfig, runId: string = createRunId()): string {
    this.runId = runId;
    this.state = "running";
    this.progress = 0;
    this.result = undefined;
    this.error = undefined;
    this.worker.postMessage({ type: "run", runId, config });
    return runId;
  }

  pause(): void {
    if (this.runId === undefined || this.state !== "running") return;
    this.worker.postMessage({ type: "pause", runId: this.runId });
  }

  resume(): void {
    if (this.runId === undefined || this.state !== "paused") return;
    this.worker.postMessage({ type: "resume", runId: this.runId });
  }

  stop(): void {
    if (
      this.runId === undefined
      || (this.state !== "running" && this.state !== "paused")
    ) return;
    this.worker.postMessage({ type: "stop", runId: this.runId });
  }

  terminate(): void {
    this.worker.removeEventListener("message", this.handleMessage);
    this.worker.terminate?.();
    if (this.state === "running" || this.state === "paused" || this.state === "stopping") {
      this.state = "cancelled";
    }
    this.listeners.clear();
  }
}
