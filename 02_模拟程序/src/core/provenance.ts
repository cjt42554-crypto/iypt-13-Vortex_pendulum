import type { BackendId, SimulationConfig } from "./types";
import { sha256Canonical, stableCanonicalJson } from "./canonical";
import { forwardModelId } from "./forward-contract";

export const A1_FORCE_CONTRACT_ID = "VP-CFD2D-RAW-BRINKMAN-A1-v1";
export const A1_ANALYSIS_CONTRACT_ID = "VP-ANALYSIS-APPLIED-DIAGNOSTIC-A1-v1";
export const A2_FORCE_DIAGNOSTIC_CONTRACT_ID = "VP-CFD2D-CV-VIRTUAL-FLUID-A2-v1";

export { sha256Canonical, stableCanonicalJson } from "./canonical";

export function sharedPhysicalInput(config: SimulationConfig): unknown {
  return {
    problemId: config.problemId,
    geometry: config.geometry,
    body: config.body,
    fluid: config.fluid,
    support: config.support,
    initialMechanicalState: {
      theta: config.initial.theta,
      omega: config.initial.omega,
    },
    duration: config.solver.duration,
  };
}

function normalizedStripClosure(config: SimulationConfig): string {
  return config.cfd2d.stripClosure === "fully-coherent-upper-bound"
    ? "coherent-representative-strip-replication-legacy-v3-key"
    : "none-unit-span";
}

export function backendDynamicsContract(config: SimulationConfig, backend: BackendId): unknown {
  if (backend === "forward") {
    return {
      contractId: "VP-FWD-DYNAMICS-CONTRACT-v2",
      modelId: forwardModelId(config),
      wetSupportMode: config.rom.wetSupportMode ?? "legacy-unqualified",
      wetSpanDefinition: config.rom.wetSpanDefinition ?? null,
      calibrationMinWetSpan: config.rom.calibrationMinWetSpan ?? null,
      jointCalibrationSupport: config.rom.jointCalibrationSupport ?? null,
      wakeGauge: config.rom.wakeGauge ?? { id: "legacy-unspecified" },
      dragWidthDefinition: config.rom.dragWidthDefinition ?? "streamwise-wet-width",
      loadDefinition: "quasisteady-drag-plus-single-complex-stuart-landau-wake",
      inertiaAllocation: "dry-plus-explicit-rom-added-inertia",
      integration: "adaptive-dormand-prince-5-4",
      spanClosure: "finite-wet-span-rom-coherence-input",
      coefficientSetId: config.rom.coefficientSetId,
    };
  }
  return {
    contractId: "VP-CFD2D-DYNAMICS-CONTRACT-A1-v1",
    modelId: "VP-HF-CFD2D-v1",
    displayName: "cfd2d-sectional-reference",
    loadDefinition: "raw-brinkman-reaction-impulse-a1-not-physical-hydrodynamic-force",
    forceContractId: A1_FORCE_CONTRACT_ID,
    optionalForceDiagnostic: {
      contractId: A2_FORCE_DIAGNOSTIC_CONTRACT_ID,
      consumedByDynamics: false,
      qualification: "implementation-tested-physical-amplitude-unqualified",
    },
    virtualFluidCorrection: "none-in-dynamics-a2-diagnostic-only",
    inertiaAllocation: "dry-structure-only-dynamic-fluid-inertia-implicit",
    fsiScheme: config.cfd2d.couplingMode === "weak-fsi"
      ? "legacy-explicit-symplectic-weak-fsi"
      : config.cfd2d.couplingMode,
    stripClosure: normalizedStripClosure(config),
    boundaryModel: "zou-he-inlet-density-outlet-periodic-crossflow",
    obstacle: "analytic-diffuse-brinkman",
  };
}

export function analysisContract(config: SimulationConfig, backend: BackendId): unknown {
  return {
    contractId: A1_ANALYSIS_CONTRACT_ID,
    backend,
    sampleCadence: backend === "highFidelity"
      ? { latticeSteps: config.cfd2d.sampleEvery }
      : { seconds: config.solver.outputInterval },
    analysisWindow: { transientFraction: config.solver.transientFraction },
    legacyDiagnosticPowerField: "fluidPower",
    appliedWorkField: backend === "highFidelity"
      ? "interfaceExchange.cumulative.cumulativeAppliedRawWork"
      : "fluidPower-time-integral",
    nearNeutralPolicy: "unresolved-near-neutral",
  };
}

export async function provenanceContractHashes(
  config: SimulationConfig,
  backend: BackendId,
): Promise<{
  sharedPhysicalInputHash: string;
  backendDynamicsContractHash: string;
  analysisContractHash: string;
}> {
  const [sharedPhysicalInputHash, backendDynamicsContractHash, analysisContractHash] = await Promise.all([
    sha256Canonical(sharedPhysicalInput(config)),
    sha256Canonical(backendDynamicsContract(config, backend)),
    sha256Canonical(analysisContract(config, backend)),
  ]);
  return { sharedPhysicalInputHash, backendDynamicsContractHash, analysisContractHash };
}
