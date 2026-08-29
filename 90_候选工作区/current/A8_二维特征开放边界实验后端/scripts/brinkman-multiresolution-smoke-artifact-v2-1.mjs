import { basename } from "node:path";

export const SMOKE_EVIDENCE_RELATIVE_PATH =
  "验证与复现/smoke/a8r-v2p1-formal-dual-40-step-smoke.json";

export const SMOKE_SIDECAR_RELATIVE_PATH =
  "验证与复现/smoke/a8r-v2p1-formal-dual-40-step-smoke.sha256";

export function expectedSmokeSidecarText(evidencePath, sha256) {
  if (!/^[0-9a-f]{64}$/.test(sha256)) {
    throw new Error("A8R v2.1 smoke SHA-256 is invalid");
  }
  return `${sha256}  ${basename(evidencePath)}\n`;
}
