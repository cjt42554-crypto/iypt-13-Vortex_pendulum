/**
 * Compatibility barrel for early research notebooks.  The executable source
 * of truth is src/solvers/forward/model.ts; no second physics implementation
 * is maintained here.
 */
export {
  evaluateForward as evaluateRom,
  forwardSample as romSample,
  type ForwardDerivative as RomDerivative,
  type ForwardEvaluation as RomEvaluation,
  type ForwardState as RomState,
} from "../forward/model";
