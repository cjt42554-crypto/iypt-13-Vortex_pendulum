import { parentPort, workerData } from "node:worker_threads";

import { fillSyntheticRange } from "../src/hw2-workload.mjs";

function fail(message) {
  throw new Error(`NO-GO-HW2-WORKER: ${message}`);
}

if (!parentPort) fail("parentPort is missing");
const {mode, buffer, targetOffset, globalOffset, count, rounds} = workerData ?? {};

if (mode === "shared") {
  if (!(buffer instanceof SharedArrayBuffer)) fail("shared buffer is missing");
  const target = new Uint32Array(buffer);
  fillSyntheticRange({target, targetOffset, globalOffset, count, rounds});
  parentPort.postMessage({classification: "synthetic-non-scientific", complete: true, globalOffset, count});
} else if (mode === "transfer") {
  const target = new Uint32Array(count);
  fillSyntheticRange({target, globalOffset, count, rounds});
  parentPort.postMessage({
    classification: "synthetic-non-scientific",
    complete: true,
    globalOffset,
    count,
    buffer: target.buffer,
  }, [target.buffer]);
} else {
  fail(`unknown worker mode ${String(mode)}`);
}
