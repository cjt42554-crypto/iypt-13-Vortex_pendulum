export type BackendId = "forward" | "highFidelity";

export type RunState =
  | "ready"
  | "running"
  | "paused"
  | "stopping"
  | "completed"
  | "cancelled"
  | "failed";

export interface GeometryParameters {
  topology: "P0";
  radius: number;
  topDistance: number;
  bottomDistance: number;
  pivotHeight: number;
  channelWidth: number;
  waterDepth: number;
  /** Axial coordinate of the marker whose transverse displacement is reported. */
  observationDistance: number;
  /** Terminal angle guard; the baseline theory has no impact law. */
  maximumAngle: number;
}

export interface BodyParameters {
  movingMass: number;
  centerOfMassDistance: number;
  dryMomentOfInertia: number;
}

export interface FluidParameters {
  density: number;
  kinematicViscosity: number;
  surfaceTension: number;
  gravity: number;
  /** Uniform outer-edge reference speed used by the current executable subset. */
  flowSpeed: number;
  flowRampTime: number;
  flowModulationAmplitude: number;
  flowModulationFrequency: number;
}

export interface SupportParameters {
  referenceAngle: number;
  linearStiffness: number;
  cubicStiffness: number;
  viscousDamping: number;
  coulombFriction: number;
  /** Smooth sign regularisation speed omega_epsilon [rad/s]. */
  frictionSmoothingSpeed: number;
}

/**
 * VP-FWD-P0-SL1-v1 closure parameters.  They are model inputs, not universal
 * constants.  The bundled values are explicitly tagged as a literature prior.
 */
export interface RomParameters {
  model: "complex-stuart-landau";
  coefficientSetId: string;
  coefficientSource:
    | "literature-prior"
    | "measured"
    | "prescribed-motion"
    | "hf-calibrated";
  addedMassCoefficient: number;
  sectionalDragCoefficient: number;
  strouhalNumber: number;
  referenceHopfReynolds: number;
  hopfGrowthSlope: number;
  cubicSaturation: number;
  nonlinearFrequencyShift: number;
  /** Decay time of the wake amplitude at exactly zero mean flow [s]. */
  zeroFlowWakeDecayTime: number;
  /** Speed used to blend the zero-flow anchor into the shedding closure [m/s]. */
  wakeActivationSpeed: number;
  /** Frozen U_epsilon used only in coefficient-domain ratios [m/s]. */
  calibrationVelocityFloor: number;
  couplingThetaReal: number;
  couplingThetaImaginary: number;
  couplingOmegaReal: number;
  couplingOmegaImaginary: number;
  couplingAccelerationReal: number;
  couplingAccelerationImaginary: number;
  liftOutputReal: number;
  liftOutputImaginary: number;
  finiteSpanCoherence: number;
  calibrationMinReynolds: number;
  calibrationMaxReynolds: number;
  calibrationMaxAbsAngle: number;
  calibrationMaxVelocityRatio: number;
  /** Bound on |dU/dt|/[max(U,U_epsilon) omega_ref]. */
  calibrationMaxNormalizedInflowRate: number;
}

/**
 * VP-HF-CFD2D-v1 settings. These fields describe the numerical projection;
 * they do not grant a validated envelope or turn a 2-D line load into a 3-D
 * apparatus load.
 */
export interface Cfd2dParameters {
  couplingMode: "fixed" | "prescribed" | "weak-fsi";
  /** Axial P0 station whose local cross-flow motion drives the 2-D cylinder. */
  stripAxialCoordinate: number;
  /** `none` preserves native 2-D load semantics. */
  stripClosure: "none" | "fully-coherent-upper-bound";
  nx: number;
  ny: number;
  cylinderCells: number;
  latticeVelocity: number;
  stepsPerChunk: number;
  fieldEvery: number;
  sampleEvery: number;
  penalizationTimeSteps: number;
  prescribedAmplitude: number;
  prescribedFrequency: number;
}

export interface InitialConditions {
  theta: number;
  omega: number;
  wakeReal: number;
  wakeImaginary: number;
  randomSeed: number;
}

export interface SolverSettings {
  duration: number;
  initialStep: number;
  minimumStep: number;
  maximumStep: number;
  relativeTolerance: number;
  absoluteToleranceTheta: number;
  absoluteToleranceOmega: number;
  absoluteToleranceWake: number;
  outputInterval: number;
  eventTimeTolerance: number;
  maxAcceptedSteps: number;
  maxRejectedSteps: number;
  transientFraction: number;
  energyTolerance: number;
}

export interface SimulationConfig {
  schemaVersion: "3.0.0";
  problemId: "iypt-2027-vortex-pendulum";
  backend: BackendId;
  geometry: GeometryParameters;
  body: BodyParameters;
  fluid: FluidParameters;
  support: SupportParameters;
  rom: RomParameters;
  cfd2d: Cfd2dParameters;
  initial: InitialConditions;
  solver: SolverSettings;
}

export type ApplicabilityStatus =
  | "within-calibrated-domain"
  | "reference-only"
  | "exploratory-extrapolation"
  | "physics-upgrade-required"
  | "numerically-unresolved";

export interface ApplicabilityFinding {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
}

export interface ApplicabilityReport {
  status: ApplicabilityStatus;
  findings: ApplicabilityFinding[];
  interpretation: string;
}

export interface DerivedParameters {
  cylinderDiameter: number;
  cylinderLength: number;
  equilibriumWetLength: number;
  displacedMass: number;
  structuralStiffness: number;
  hydrostaticStiffness: number;
  totalLinearStiffness: number;
  addedMomentOfInertia: number;
  effectiveMomentOfInertia: number;
  naturalAngularFrequency: number;
  naturalFrequency: number;
  /** Dry-inertia mechanical/hydrostatic nominal value; excludes dynamic fluid inertia. */
  mechanicalHydrostaticNominalAngularFrequency: number;
  /** Dry-inertia mechanical/hydrostatic nominal value; excludes dynamic fluid inertia. */
  mechanicalHydrostaticNominalFrequency: number;
  /** U/(f_mech,hydrostatic D); a reference coordinate, not a wet CFD eigenfrequency. */
  referenceReducedVelocity: number;
  /** Existing C_A-prior ROM reference, now explicitly backend-scoped. */
  romPriorReferenceAngularFrequency: number;
  romPriorReferenceFrequency: number;
  romPriorReferenceReducedVelocity: number;
  /** Unavailable until the zero-flow prescribed-impedance B gate passes. */
  cfdIdentifiedSectionalAddedInertia: number | null;
  cfdScenarioEffectiveNaturalFrequency: number | null;
  cfdScenarioReducedVelocity: number | null;
  sheddingFrequency: number;
  reynolds: number;
  reducedVelocity: number;
  inertiaRatio: number;
  blockageRatio: number;
  areaBlockageRatio: number;
  submergedAspectRatio: number;
  diameterFroude: number;
  depthFroude: number;
  weber: number;
  bond: number;
  scrutonLike: number;
  latticeTimeStep: number;
  latticeRelaxationTime: number;
  latticeMach: number;
}

export interface Cfd2dAppliedRawExchange {
  contractId: "VP-CFD2D-RAW-BRINKMAN-A1-v1";
  startTime: number;
  endTime: number;
  midpointTime: number;
  midpointTheta: number;
  midpointOmega: number;
  /** Raw Brinkman reaction impulse per unit span [N s/m]. */
  appliedRawLineImpulseX: number;
  appliedRawLineImpulseY: number;
  /** Step-average raw Brinkman reaction per unit span [N/m]. */
  appliedRawLineForceX: number;
  appliedRawLineForceY: number;
  /** Raw solid-reaction work per unit span [J/m]. */
  appliedRawLineWork: number;
  /** Legacy representative-strip angular impulse, zero without that scenario [N m s]. */
  appliedRawTorqueImpulse: number;
  /** Step-average legacy representative-strip torque [N m]. */
  appliedRawTorque: number;
  /** Work actually supplied to the legacy mechanical step [J]. */
  appliedRawWork: number;
  /** Step-average power actually supplied to the legacy mechanical step [W]. */
  appliedRawPower: number;
  /** Brinkman body-force work on the computational fluid per unit span [J/m]. */
  brinkmanFluidWork: number;
  /** Raw fluid-on-solid reaction work per unit span [J/m]. */
  rawSolidReactionWork: number;
  /** Non-negative Brinkman penalty dissipation per unit span [J/m]. */
  brinkmanPenaltyDissipation: number;
  /** rawSolidReactionWork + brinkmanFluidWork + dissipation [J/m]. */
  brinkmanAlgebraicResidual: number;
}

export interface Cfd2dDiagnosticEndpointExchange {
  endpointTime: number;
  /** Recomputed at the endpoint; never used as the preceding step's applied force. */
  diagnosticEndpointRawLineForceX: number;
  diagnosticEndpointRawLineForceY: number;
  /** Legacy incomplete contour diagnostic; not an independent solid-force path. */
  legacyIncompleteStressContourLineForceX: number;
  legacyIncompleteStressContourLineForceY: number;
  legacyIncompleteStressContourRelativeDifference: number;
}

export interface Cfd2dCumulativeExchange {
  cumulativeAppliedRawLineWork: number;
  cumulativeAppliedRawWork: number;
  cumulativeBrinkmanFluidWork: number;
  cumulativeRawSolidReactionWork: number;
  cumulativeBrinkmanPenaltyDissipation: number;
  cumulativeBrinkmanAlgebraicResidual: number;
}

export interface Cfd2dInterfaceExchange {
  applied: Cfd2dAppliedRawExchange | null;
  diagnostic: Cfd2dDiagnosticEndpointExchange;
  cumulative: Cfd2dCumulativeExchange;
}

export interface SimulationSample {
  time: number;
  theta: number;
  omega: number;
  angularAcceleration: number;
  observationRadius: number;
  displacement: number;
  velocity: number;
  wakeReal: number;
  wakeImaginary: number;
  wakeAmplitude: number;
  wakePhase: number | null;
  liftCoefficient: number;
  dragCoefficient: number;
  liftTorque: number;
  dragTorque: number;
  pitchingTorque: number;
  /** Dynamic ROM fluid torque; hydrostatics is represented in the potential. */
  fluidTorque: number;
  buoyancyTorque: number;
  controlTorque: number;
  sectionalLift: number | null;
  sectionalDrag: number | null;
  /** Legacy endpoint diagnostic: raw 2-D streamwise force per unit span [N/m]. */
  lineForceX: number | null;
  /** Legacy endpoint diagnostic: raw 2-D cross-flow force per unit span [N/m]. */
  lineForceY: number | null;
  /** Legacy endpoint diagnostic power per unit span F'_y v_b [W/m]. */
  linePower2d: number | null;
  /** Local generalized-force density r cos(theta) F'_y [N]. */
  stripTorqueDensity: number | null;
  /** @deprecated Legacy incomplete contour diagnostic [N/m]; not an independent force. */
  stressLineForceX: number | null;
  /** @deprecated Legacy incomplete contour diagnostic [N/m]; not an independent force. */
  stressLineForceY: number | null;
  /** @deprecated Legacy diagnostic difference; never an acceptance/evidence gate. */
  forcePathRelativeDifference: number | null;
  /** Explicit A1 split between the accepted-step exchange and endpoint diagnostics. */
  interfaceExchange: Cfd2dInterfaceExchange | null;
  fluidPower: number;
  dampingPower: number;
  controlPower: number;
  kineticEnergy: number;
  gravitationalPotential: number;
  hydrostaticPotential: number;
  elasticPotential: number;
  mechanicalEnergy: number;
  effectiveInertia: number;
  addedInertia: number;
  displacedVolume: number;
  projectedWetArea: number;
  axisWetLength: number;
  volumeEquivalentWetLength: number;
  flowSpeed: number;
  reynolds: number;
  wetBranch: "dry" | "partial" | "full";
}

export interface FieldFrame {
  time: number;
  width: number;
  height: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  vorticity: Float32Array;
  speed: Float32Array;
  cylinderX: number;
  cylinderY: number;
  cylinderRadius: number;
  unit: "SI";
}

export type TerminationCode =
  | "COMPLETED"
  | "ANGLE-LIMIT"
  | "INERTIA-SINGULAR"
  | "COEFFICIENT-OOD"
  | "CUBIC-NONSATURATING"
  | "RAPID-INFLOW"
  | "SOLID-CONTACT"
  | "FREE-SURFACE-BREAKDOWN"
  | "MULTIMODE-WAKE"
  | "NONFINITE-INPUT"
  | "NONFINITE-STATE"
  | "MINIMUM-STEP"
  | "MAXIMUM-STEPS"
  | "LATTICE-INSTABILITY"
  | "STOP-BRINKMAN-ALGEBRA"
  | "STOP-A1-REGRESSION"
  | "CYLINDER-DOMAIN-CONTACT"
  | "USER-STOP";

export interface RunEvent {
  time: number;
  kind: "warning" | "wetting" | "limit" | "numerical" | "info";
  code: string;
  message: string;
}

/** Generic time-series summaries only; structural classification belongs to phase 4. */
export interface RunMetrics {
  windowStartTime: number;
  peakAmplitude: number;
  dimensionlessAmplitude: number;
  rmsDisplacement: number;
  dominantFrequency: number;
  meanFluidPower: number;
  /** Legacy CFD endpoint diagnostic power remains in meanFluidPower for reproduction. */
  meanAppliedRawMechanicalPower: number | null;
  meanAppliedRawLinePower: number | null;
  meanDampingPower: number;
  energyClosureRelativeRms: number;
  appliedMechanicalEnergyLedgerResidual: number | null;
  appliedMechanicalEnergyLedgerRelativeResidual: number | null;
}

export interface NumericalDiagnostics {
  method: "Dormand-Prince-5(4)" | "D2Q9-MRT-Brinkman";
  acceptedSteps: number;
  rejectedSteps: number;
  rhsEvaluations: number;
  minimumAcceptedStep: number;
  maximumAcceptedStep: number;
  maximumAcceptedErrorNorm: number;
  finalEnergyBalanceResidual: number;
  terminationCode: TerminationCode;
  lattice?: {
    steps: number;
    cells: number;
    diameterCells: number;
    physicalTimeStep: number;
    relaxationTime: number;
    shearRelaxationRate: number;
    latticeMach: number;
    initialMass: number;
    finalMass: number;
    cumulativeBoundaryMassInput: number;
    massBalanceResidual: number;
    relativeMassBalanceResidual: number;
    /** Inventory change; not itself a defect for an open ramped domain. */
    relativeMassDrift: number;
    maximumDensityDeviation: number;
    minimumDensity: number;
    maximumDensity: number;
    maximumSpeed: number;
    maximumMach: number;
    maximumForcePathDifference: number;
    maximumLegacyIncompleteStressContourRelativeDifference: number;
    cumulativeAppliedRawLineWork: number;
    cumulativeAppliedRawWork: number;
    cumulativeBrinkmanFluidWork: number;
    cumulativeRawSolidReactionWork: number;
    cumulativeBrinkmanPenaltyDissipation: number;
    cumulativeBrinkmanAlgebraicResidual: number;
    maximumBrinkmanAlgebraicResidual: number;
    maximumBrinkmanAlgebraicRelativeResidual: number;
    collision: "D2Q9-MRT";
    obstacle: "analytic-diffuse-Brinkman";
    outerBoundary: "Zou-He-velocity-inlet-pressure-outlet-periodic-crossflow";
  };
}

export interface SimulationResult {
  runId: string;
  backend: BackendId;
  complete: boolean;
  terminationCode: TerminationCode;
  config: SimulationConfig;
  derived: DerivedParameters;
  applicability: ApplicabilityReport;
  samples: SimulationSample[];
  fields: FieldFrame[];
  metrics: RunMetrics;
  numerical: NumericalDiagnostics;
  warnings: string[];
  events: RunEvent[];
  provenance: {
    solver: string;
    solverVersion: string;
    modelId: "VP-FWD-P0-SL1-v1" | "VP-HF-CFD2D-v1";
    createdAt: string;
    configHash: string;
    sharedPhysicalInputHash: string;
    backendDynamicsContractHash: string;
    analysisContractHash: string;
    backendDisplayName: "forward-theory-numerical" | "cfd2d-sectional-reference";
    forceContractId: "VP-FWD-FLUID-TORQUE-v1" | "VP-CFD2D-RAW-BRINKMAN-A1-v1";
    loadDefinition: string;
    couplingAlgorithm: string;
    spanClosure: string;
    geometryModel:
      | "P0-flat-free-surface-finite-cylinder"
      | "infinite-span-2d-analytic-diffuse-cylinder";
    coefficientSetId: string;
    coefficientSource: RomParameters["coefficientSource"] | "not-applicable";
    dimensionality: "P0-reduced-order" | "two-dimensional-unit-span";
    nativeLoadType: "three-dimensional-generalized-torque" | "line-force-per-unit-span";
    evidenceLevel:
      | "forward-numerically-verified"
      | "unvalidated-preview"
      | "verified-component"
      | "validated-2d-reference";
    evidenceClaims: {
      lbmKernelComponents: string;
      dynamicLoadExtraction: string;
      interfacePowerExchange: string;
      fsiCoupling: string;
      gridMachDomainConvergence: string;
      spanClosure: string;
      apparatusPrediction: string;
    };
    legacyStatus:
      | "not-legacy"
      | "legacy-exploratory-invalidated-for-load-validation"
      | "legacy-component-withdrawn-pending-revalidation";
    knownDefects: string[];
    pauseSemantics: "volatile-in-memory-safe-step" | "same-version-checkpoint";
    limitations: string[];
  };
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  path: string;
  message: string;
}

export interface ParameterSpec {
  path: string;
  label: string;
  symbol?: string;
  unit: string;
  category: "geometry" | "body" | "fluid" | "support" | "rom" | "cfd2d" | "initial" | "solver";
  valueType: "number" | "integer" | "enum";
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
  description: string;
  backends?: BackendId[];
}

export interface SweepPoint {
  value: number;
  replicate: number;
  result?: SimulationResult;
  error?: string;
}

export interface SweepResult {
  parameterPath: string;
  values: number[];
  replicates: number;
  backend: BackendId;
  points: SweepPoint[];
  createdAt: string;
}

export interface ExperimentalPoint {
  runId: string;
  time: number;
  theta?: number;
  displacement?: number;
  flowSpeed?: number;
  sigma?: number;
}

export interface ExperimentalDataset {
  name: string;
  points: ExperimentalPoint[];
  sourceHash: string;
  warnings: string[];
}

export interface ComparisonMetrics {
  observable: "theta" | "displacement";
  count: number;
  rmse: number;
  nrmse: number;
  mae: number;
  bias: number;
  correlation: number;
  observedFrequency: number;
  predictedFrequency: number;
}

export type WorkerCommand =
  | { type: "run"; runId: string; config: SimulationConfig }
  | { type: "pause"; runId: string }
  | { type: "resume"; runId: string }
  | { type: "stop"; runId: string };

export type WorkerResponse =
  | { type: "state"; runId: string; state: RunState }
  | { type: "progress"; runId: string; progress: number; sample?: SimulationSample; field?: FieldFrame }
  | { type: "complete"; runId: string; result: SimulationResult }
  | { type: "error"; runId: string; message: string; stack?: string };

export interface SolverControl {
  isPaused(): boolean;
  isStopped(): boolean;
  waitWhilePaused(): Promise<void>;
  report(progress: number, sample?: SimulationSample, field?: FieldFrame): void;
  yieldToEventLoop(): Promise<void>;
}
