import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const HW2R_PROTOCOL_PATH = resolve(
  packageRoot,
  "contracts/hw2-representative-qualification-protocol.v2.json",
);
export const HW2R_PROTOCOL_SHA256 =
  "6fa0d71d020d776efe0f3b637a21a3ab800c84d9c3d11e24b90eda76848d7dfe";

export async function loadHw2rProtocol(path = HW2R_PROTOCOL_PATH) {
  const bytes = await readFile(path);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (path === HW2R_PROTOCOL_PATH && sha256 !== HW2R_PROTOCOL_SHA256) {
    throw new Error("NO-GO-HW2R-CONTRACT-DRIFT");
  }
  const protocol = JSON.parse(bytes.toString("utf8"));
  if (protocol.protocolId
    !== "VP-HW2-REPRESENTATIVE-QUALIFICATION-PROTOCOL-v2") {
    throw new Error("NO-GO-HW2R-V1-ACTIVE-MISUSE");
  }
  if (protocol.supersedesMeasurementProtocolId
    !== "VP-HW2-RESULT-BLIND-QUALIFICATION-PROTOCOL-v1"
    || protocol.freeze.resultBlind !== true
    || protocol.freeze.fullResultBearingRunForbidden !== true
    || protocol.freeze.runtimeFallbackForbidden !== true
    || protocol.selection.v1OpenmpW02SelectionForbidden !== true) {
    throw new Error("NO-GO-HW2R-CONTRACT-DRIFT");
  }
  return Object.freeze({ protocol: Object.freeze(protocol), sha256 });
}
