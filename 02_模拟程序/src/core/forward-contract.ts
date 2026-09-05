import type { ForwardModelId, SimulationConfig } from "./types";

export const FORWARD_MODEL_IDS: readonly ForwardModelId[] = [
  "VP-FWD-P0-SL1-v1", "VP-FWD-P0-SL1-SS-v1", "VP-FWD-P0-SL1-DW-v1", "VP-FWD-P0-SL1-SS-DW-v1",
];
export function forwardModelId(config: SimulationConfig): ForwardModelId {
  return config.rom.modelId ?? "VP-FWD-P0-SL1-v1";
}
export function isStickSlipModel(config: SimulationConfig): boolean {
  return forwardModelId(config) === "VP-FWD-P0-SL1-SS-v1"
    || forwardModelId(config) === "VP-FWD-P0-SL1-SS-DW-v1";
}
export function isDirectionalDragModel(config: SimulationConfig): boolean {
  return forwardModelId(config) === "VP-FWD-P0-SL1-DW-v1"
    || forwardModelId(config) === "VP-FWD-P0-SL1-SS-DW-v1";
}
