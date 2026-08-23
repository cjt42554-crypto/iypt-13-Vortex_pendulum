import type { BackendId, SimulationConfig } from "./types";

export const A1_FORCE_CONTRACT_ID = "VP-CFD2D-RAW-BRINKMAN-A1-v1";
export const A1_ANALYSIS_CONTRACT_ID = "VP-ANALYSIS-APPLIED-DIAGNOSTIC-A1-v1";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function stableCanonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export async function sha256Canonical(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableCanonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

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
      contractId: "VP-FWD-DYNAMICS-CONTRACT-v1",
      modelId: "VP-FWD-P0-SL1-v1",
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
    virtualFluidCorrection: "none-frozen-until-a2",
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
