/// <reference lib="webworker" />

import type { WorkerCommand, WorkerResponse } from "../core/types";
import { createWorkerRuntime } from "./runtime";

const scope = self as DedicatedWorkerGlobalScope;
const runtime = createWorkerRuntime((response: WorkerResponse) => {
  scope.postMessage(response);
});

scope.addEventListener("message", (event: MessageEvent<WorkerCommand>) => {
  runtime.handle(event.data);
});

export {};
