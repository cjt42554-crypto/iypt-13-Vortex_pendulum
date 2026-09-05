import {
  D2Q9MrtBrinkmanSolver,
  type LbmCheckpoint,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { applyIncomingCharacteristicBoundary } from
  "./formal-incoming-characteristic-boundary.ts";
import {
  FORMAL_CAUSAL_REFERENCE_CONTRACT as CONTRACT,
  buildFormalCausalPerturbationDefinitions,
  type FormalCausalPerturbationDefinition,
} from "./formal-causal-reference-contract.ts";
import {
  buildCompactReconstructionStep,
  captureField,
  cloneCheckpoint,
  createCompactMassLedger,
  emptyStabilityEnvelope,
  finishCompactMassLedger,
  finishCompactReconstruction,
  recordCompactMassStep,
  type CompactMassStepRecord,
  type CompactMassSummary,
  type CompactReconstructionStepRecord,
  type CompactReconstructionSummary,
  type FieldCapture,
  type StabilityEnvelope,
} from "./formal-causal-reference-support.ts";

export interface ComplexValue {
  re: number;
  im: number;
}

export interface PerturbationMeanSample {
  step: number;
  density: number;
  ux: number;
  uy: number;
}

export interface PerturbationTraceResult {
  role: "test" | "extended-reference";
  status: "completed" | "failed";
  nx: number;
  ny: number;
  pulseCenterX: number;
  probeX: number;
  completedSteps: number;
  stability: StabilityEnvelope | null;
  initialMeanDensity: number;
  initialMeanUx: number;
  initialMeanUy: number;
  meanTrace: PerturbationMeanSample[];
  massStepRecords: CompactMassStepRecord[];
  massSummary: CompactMassSummary;
  reconstructionStepRecords: CompactReconstructionStepRecord[];
  reconstructionSummary: CompactReconstructionSummary;
  gate: {
    executionPass: boolean;
    densityPass: boolean;
    machPass: boolean;
    massPass: boolean;
    reconstructionPass: boolean;
    pass: boolean;
  };
  failure?: {
    nextStep: number;
    name: string;
    message: string;
  };
}

export interface PerturbationWindow {
  startStep: number;
  endStep: number;
  predictedCenterStep: number;
}

export interface ObliqueDiagnosticSample {
  step: number;
  referenceIncident: ComplexValue;
  testIncident: ComplexValue;
  reflected: ComplexValue;
  reflectedNonTargetModalEnergy: number;
}

export interface ObliqueMetrics {
  incidentWindow: PerturbationWindow;
  reflectedWindow: PerturbationWindow;
  incidentModalAmplitude: number;
  reflectedModalAmplitude: number;
  modalAmplitudeReflectionRatio: number;
  modalEnergyReflectionRatio: number;
  transverseModeContaminationRatio: number;
  incidentReferenceRelativeRmsMismatch: number;
  maximumMeanDensityDrift: number;
  maximumMeanVelocityDrift: number;
}

export interface LocalPressureDiagnosticSample {
  step: number;
  incidentReferenceDensityRms: number;
  incidentReferenceVelocityRms: number;
  reflectedDensityRms: number;
  reflectedVelocityRms: number;
}

export interface LocalPressureMetrics {
  incidentWindow: PerturbationWindow;
  reflectedWindow: PerturbationWindow;
  incidentReferenceDensityRms: number;
  incidentReferenceVelocityRms: number;
  reflectedDensityRms: number;
  reflectedVelocityRms: number;
  reflectedDensityRmsRatio: number;
  reflectedVelocityRmsRatio: number;
  maximumMeanDensityDrift: number;
  maximumMeanVelocityDrift: number;
}

export interface ShearDiagnosticSample {
  step: number;
  vorticityRmsRelativeReferenceError: number;
  transverseKineticEnergyRelativeReferenceError: number;
  meanDensityDrift: number;
  meanVelocityDrift: number;
}

export interface PerturbationPairResult {
  definition: FormalCausalPerturbationDefinition;
  test: PerturbationTraceResult;
  extendedReference: PerturbationTraceResult;
  obliqueTrace: ObliqueDiagnosticSample[];
  localPressureTrace: LocalPressureDiagnosticSample[];
  shearTrace: ShearDiagnosticSample[];
  metrics: {
    oblique: ObliqueMetrics | null;
    localizedPressure: LocalPressureMetrics | null;
    shear: {
      maximumVorticityRmsRelativeReferenceError: number;
      maximumTransverseKineticEnergyRelativeReferenceError: number;
      maximumMeanDensityDrift: number;
      maximumMeanVelocityDrift: number;
    } | null;
  };
  gate: {
    internalPass: boolean;
    physicsGateApplicable: boolean;
    amplitudePass: boolean | null;
    energyPass: boolean | null;
    contaminationPass: boolean | null;
    referenceMatchPass: boolean | null;
    densityReflectionPass: boolean | null;
    velocityReflectionPass: boolean | null;
    meanDensityDriftPass: boolean | null;
    meanVelocityDriftPass: boolean | null;
    qualificationPass: boolean | null;
    pass: boolean;
  };
}

export interface PerturbationMatrixProgress {
  phase: "perturbation";
  completed: number;
  total: number;
  caseId: string;
  internalPass: boolean;
  qualificationPass: boolean | null;
}

export interface PerturbationMatrixResult {
  pairs: PerturbationPairResult[];
  gate: {
    pairCountPass: boolean;
    traceCountPass: boolean;
    allInternalPass: boolean;
    allS9ObliquePass: boolean;
    allS9LocalizedPressurePass: boolean;
    shearDiagnosticComplete: boolean;
    pass: boolean;
  };
}

interface MutableTrace {
  role: PerturbationTraceResult["role"];
  solver: D2Q9MrtBrinkmanSolver;
  nx: number;
  ny: number;
  pulseCenterX: number;
  probeX: number;
  ledger: ReturnType<typeof createCompactMassLedger>;
  massStepRecords: CompactMassStepRecord[];
  reconstructionStepRecords: CompactReconstructionStepRecord[];
  stability: StabilityEnvelope;
  initialMeanDensity: number;
  initialMeanUx: number;
  initialMeanUy: number;
  meanTrace: PerturbationMeanSample[];
  completedSteps: number;
  failure?: PerturbationTraceResult["failure"];
}

function errorIdentity(error: unknown): { name: string; message: string } {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: "UnknownError", message: String(error) };
}

function periodicDistance(value: number, center: number, size: number): number {
  const raw = value - center;
  return raw - Math.round(raw / size) * size;
}

function initialization(
  definition: FormalCausalPerturbationDefinition,
  x: number,
  y: number,
  pulseCenterX: number,
): { rho: number; ux: number; uy: number } {
  const settings = CONTRACT.twoDimensionalPerturbations;
  const operational = CONTRACT.operationalDefinitions.perturbations;
  const base = operational.baseState;
  const amplitude = settings.commonAmplitude;
  const dy = periodicDistance(y, operational.centerY, settings.domainPair.ny);
  if (definition.family === "oblique-acoustic") {
    const acoustic = settings.obliqueAcoustic;
    const dx = x - pulseCenterX;
    const kx = 2 * Math.PI / acoustic.streamwiseWavelengthCells;
    const ky = 2 * Math.PI * definition.transverseMode
      / settings.domainPair.ny;
    const norm = Math.hypot(kx, ky);
    const deltaRho = amplitude
      * Math.exp(
        -(dx * dx)
          / (2 * acoustic.envelopeSigmaCells ** 2),
      )
      * Math.cos(kx * dx + ky * dy);
    return {
      rho: base.rho + deltaRho,
      ux: base.ux
        - CONTRACT.commonNumerics.latticeSoundSpeed * deltaRho * kx / norm,
      uy: base.uy
        - CONTRACT.commonNumerics.latticeSoundSpeed * deltaRho * ky / norm,
    };
  }
  if (definition.family === "localized-pressure") {
    const local = settings.localizedPressure;
    const dx = x - pulseCenterX;
    const deltaRho = amplitude * Math.exp(
      -(dx * dx + dy * dy) / (2 * local.sigmaCells ** 2),
    );
    return { rho: base.rho + deltaRho, ux: base.ux, uy: base.uy };
  }
  const shear = settings.shearVorticity;
  const dx = x - pulseCenterX;
  const deltaUy = amplitude
    * Math.exp(-(dx * dx) / (2 * shear.streamwiseSigmaCells ** 2))
    * Math.cos(
      2 * Math.PI * shear.transverseMode * dy / settings.domainPair.ny,
    );
  return { rho: base.rho, ux: base.ux, uy: base.uy + deltaUy };
}

function meanField(field: FieldCapture): {
  density: number;
  ux: number;
  uy: number;
} {
  let density = 0;
  let ux = 0;
  let uy = 0;
  for (let cell = 0; cell < field.rho.length; cell += 1) {
    density += field.rho[cell] ?? Number.NaN;
    ux += field.ux[cell] ?? Number.NaN;
    uy += field.uy[cell] ?? Number.NaN;
  }
  return {
    density: density / field.rho.length,
    ux: ux / field.rho.length,
    uy: uy / field.rho.length,
  };
}

function createTrace(
  definition: FormalCausalPerturbationDefinition,
  role: PerturbationTraceResult["role"],
): MutableTrace {
  const domain = CONTRACT.twoDimensionalPerturbations.domainPair;
  const nx = role === "test" ? domain.testNx : domain.referenceNx;
  const pulseCenterX = definition.family === "oblique-acoustic"
    ? role === "test"
      ? CONTRACT.twoDimensionalPerturbations.obliqueAcoustic.testPulseCenterX
      : CONTRACT.twoDimensionalPerturbations.obliqueAcoustic.referencePulseCenterX
    : definition.family === "localized-pressure"
      ? role === "test"
        ? CONTRACT.twoDimensionalPerturbations.localizedPressure.testPulseCenterX
        : CONTRACT.twoDimensionalPerturbations.localizedPressure.referencePulseCenterX
      : role === "test"
        ? CONTRACT.twoDimensionalPerturbations.shearVorticity.testCenterX
        : CONTRACT.twoDimensionalPerturbations.shearVorticity.referenceCenterX;
  const probeX = role === "test" ? domain.testProbeX : domain.referenceProbeX;
  const solver = new D2Q9MrtBrinkmanSolver({
    nx,
    ny: domain.ny,
    relaxationTime: definition.relaxationTime,
    penalizationTimeSteps: CONTRACT.commonNumerics.penalizationTimeSteps,
    maskHalfThickness: CONTRACT.commonNumerics.maskHalfThicknessCells,
    outerBoundary: CONTRACT.commonNumerics.outerBoundary,
  });
  solver.initializeField((x, y) =>
    initialization(definition, x, y, pulseCenterX));
  const initial = captureField(solver.macroscopicCopies(null));
  const mean = meanField(initial);
  return {
    role,
    solver,
    nx,
    ny: domain.ny,
    pulseCenterX,
    probeX,
    ledger: createCompactMassLedger(solver.checkpoint()),
    massStepRecords: [],
    reconstructionStepRecords: [],
    stability: emptyStabilityEnvelope(),
    initialMeanDensity: mean.density,
    initialMeanUx: mean.ux,
    initialMeanUy: mean.uy,
    meanTrace: [],
    completedSteps: 0,
  };
}

function advanceTrace(
  trace: MutableTrace,
  definition: FormalCausalPerturbationDefinition,
  step: number,
): FieldCapture {
  const base = CONTRACT.operationalDefinitions.perturbations.baseState;
  trace.solver.step(null, base.ux);
  const formalCheckpoint = trace.solver.checkpoint();
  let candidateCheckpoint: LbmCheckpoint = formalCheckpoint;
  if (definition.strategy === "incoming-characteristic-compatible-zou-he") {
    candidateCheckpoint = cloneCheckpoint(formalCheckpoint);
    const rows = applyIncomingCharacteristicBoundary(
      candidateCheckpoint,
      trace.nx,
      trace.ny,
      base.ux,
    );
    trace.reconstructionStepRecords.push(
      buildCompactReconstructionStep(step, rows),
    );
    trace.solver.restore(candidateCheckpoint);
  }
  trace.massStepRecords.push(recordCompactMassStep(
    step,
    trace.role === "test" ? "perturbation-test" : "perturbation-reference",
    trace.ledger.finalTotalMass,
    formalCheckpoint,
    candidateCheckpoint,
    trace.ledger,
  ));
  const field = captureField(trace.solver.macroscopicCopies(null));
  const mean = meanField(field);
  trace.meanTrace.push({
    step,
    density: mean.density,
    ux: mean.ux,
    uy: mean.uy,
  });
  const densityDeviation = Math.max(
    Math.abs(field.minimumDensity - 1),
    Math.abs(field.maximumDensity - 1),
  );
  if (densityDeviation > trace.stability.maximumDensityDeviation) {
    trace.stability.maximumDensityDeviation = densityDeviation;
    trace.stability.maximumDensityDeviationStep = step;
  }
  const mach = field.maximumSpeed / CONTRACT.commonNumerics.latticeSoundSpeed;
  if (mach > trace.stability.maximumMach) {
    trace.stability.maximumMach = mach;
    trace.stability.maximumMachStep = step;
  }
  trace.stability.minimumDensity = Math.min(
    trace.stability.minimumDensity,
    field.minimumDensity,
  );
  trace.stability.maximumDensity = Math.max(
    trace.stability.maximumDensity,
    field.maximumDensity,
  );
  trace.completedSteps = step;
  return field;
}

function complexDifference(
  first: ComplexValue,
  second: ComplexValue,
): ComplexValue {
  return { re: first.re - second.re, im: first.im - second.im };
}

function complexMagnitudeSquared(value: ComplexValue): number {
  return value.re * value.re + value.im * value.im;
}

function modalCharacteristic(
  field: FieldCapture,
  nx: number,
  ny: number,
  probeX: number,
  transverseMode: number,
  characteristic: "minus" | "plus",
  kx: number,
  ky: number,
): ComplexValue {
  const base = CONTRACT.operationalDefinitions.perturbations.baseState;
  const cs = CONTRACT.commonNumerics.latticeSoundSpeed;
  const norm = Math.hypot(kx, ky);
  let re = 0;
  let im = 0;
  for (let y = 0; y < ny; y += 1) {
    const cell = probeX + nx * y;
    const deltaRho = (field.rho[cell] ?? Number.NaN) - base.rho;
    const projectedVelocity = (
      ((field.ux[cell] ?? Number.NaN) - base.ux) * kx
      + ((field.uy[cell] ?? Number.NaN) - base.uy) * ky
    ) / norm;
    const value = 0.5 * (
      deltaRho
      + (characteristic === "plus" ? 1 : -1) * projectedVelocity / cs
    );
    const phase = 2 * Math.PI * transverseMode * y / ny;
    re += value * Math.cos(phase);
    im -= value * Math.sin(phase);
  }
  return { re: 2 * re / ny, im: 2 * im / ny };
}

function obliqueDiagnostic(
  definition: FormalCausalPerturbationDefinition,
  step: number,
  test: FieldCapture,
  reference: FieldCapture,
  testTrace: MutableTrace,
  referenceTrace: MutableTrace,
): ObliqueDiagnosticSample {
  const acoustic = CONTRACT.twoDimensionalPerturbations.obliqueAcoustic;
  const kx = 2 * Math.PI / acoustic.streamwiseWavelengthCells;
  const ky = 2 * Math.PI * definition.transverseMode / testTrace.ny;
  const referenceIncident = modalCharacteristic(
    reference,
    referenceTrace.nx,
    referenceTrace.ny,
    referenceTrace.probeX,
    definition.transverseMode,
    "minus",
    kx,
    ky,
  );
  const testIncident = modalCharacteristic(
    test,
    testTrace.nx,
    testTrace.ny,
    testTrace.probeX,
    definition.transverseMode,
    "minus",
    kx,
    ky,
  );
  const testReflected = modalCharacteristic(
    test,
    testTrace.nx,
    testTrace.ny,
    testTrace.probeX,
    definition.transverseMode,
    "plus",
    kx,
    ky,
  );
  const referenceReflected = modalCharacteristic(
    reference,
    referenceTrace.nx,
    referenceTrace.ny,
    referenceTrace.probeX,
    definition.transverseMode,
    "plus",
    kx,
    ky,
  );
  let reflectedNonTargetModalEnergy = 0;
  for (let mode = 0; mode <= testTrace.ny / 2; mode += 1) {
    if (mode === definition.transverseMode) continue;
    const modeKy = 2 * Math.PI * mode / testTrace.ny;
    const testMode = modalCharacteristic(
      test,
      testTrace.nx,
      testTrace.ny,
      testTrace.probeX,
      mode,
      "plus",
      kx,
      modeKy,
    );
    const referenceMode = modalCharacteristic(
      reference,
      referenceTrace.nx,
      referenceTrace.ny,
      referenceTrace.probeX,
      mode,
      "plus",
      kx,
      modeKy,
    );
    reflectedNonTargetModalEnergy += complexMagnitudeSquared(
      complexDifference(testMode, referenceMode),
    );
  }
  return {
    step,
    referenceIncident,
    testIncident,
    reflected: complexDifference(testReflected, referenceReflected),
    reflectedNonTargetModalEnergy,
  };
}

function crossStreamRms(
  field: FieldCapture,
  nx: number,
  ny: number,
  probeX: number,
  reference: FieldCapture | null,
  referenceNx: number,
  referenceProbeX: number,
): { density: number; velocity: number } {
  const base = CONTRACT.operationalDefinitions.perturbations.baseState;
  let densitySquares = 0;
  let velocitySquares = 0;
  for (let y = 0; y < ny; y += 1) {
    const cell = probeX + nx * y;
    const referenceCell = referenceProbeX + referenceNx * y;
    const densityReference = reference === null
      ? base.rho
      : reference.rho[referenceCell] ?? Number.NaN;
    const uxReference = reference === null
      ? base.ux
      : reference.ux[referenceCell] ?? Number.NaN;
    const uyReference = reference === null
      ? base.uy
      : reference.uy[referenceCell] ?? Number.NaN;
    const density = (field.rho[cell] ?? Number.NaN) - densityReference;
    const ux = (field.ux[cell] ?? Number.NaN) - uxReference;
    const uy = (field.uy[cell] ?? Number.NaN) - uyReference;
    densitySquares += density * density;
    velocitySquares += ux * ux + uy * uy;
  }
  return {
    density: Math.sqrt(densitySquares / ny),
    velocity: Math.sqrt(velocitySquares / ny),
  };
}

function localPressureDiagnostic(
  step: number,
  test: FieldCapture,
  reference: FieldCapture,
  testTrace: MutableTrace,
  referenceTrace: MutableTrace,
): LocalPressureDiagnosticSample {
  const incident = crossStreamRms(
    reference,
    referenceTrace.nx,
    referenceTrace.ny,
    referenceTrace.probeX,
    null,
    referenceTrace.nx,
    referenceTrace.probeX,
  );
  const reflected = crossStreamRms(
    test,
    testTrace.nx,
    testTrace.ny,
    testTrace.probeX,
    reference,
    referenceTrace.nx,
    referenceTrace.probeX,
  );
  return {
    step,
    incidentReferenceDensityRms: incident.density,
    incidentReferenceVelocityRms: incident.velocity,
    reflectedDensityRms: reflected.density,
    reflectedVelocityRms: reflected.velocity,
  };
}

function vorticityAt(
  field: FieldCapture,
  nx: number,
  ny: number,
  x: number,
  y: number,
): number {
  const lowerY = (y - 1 + ny) % ny;
  const upperY = (y + 1) % ny;
  const duyDx = 0.5 * (
    (field.uy[x + 1 + nx * y] ?? Number.NaN)
    - (field.uy[x - 1 + nx * y] ?? Number.NaN)
  );
  const duxDy = 0.5 * (
    (field.ux[x + nx * upperY] ?? Number.NaN)
    - (field.ux[x + nx * lowerY] ?? Number.NaN)
  );
  return duyDx - duxDy;
}

function safeFiniteRatio(numerator: number, denominator: number): number {
  if (denominator > 0) return numerator / denominator;
  return numerator === 0 ? 0 : Number.MAX_VALUE;
}

function meanDrifts(
  trace: MutableTrace,
  sample: PerturbationMeanSample,
): { density: number; velocity: number } {
  return {
    density: Math.abs(sample.density - trace.initialMeanDensity),
    velocity: Math.hypot(
      sample.ux - trace.initialMeanUx,
      sample.uy - trace.initialMeanUy,
    ),
  };
}

function shearDiagnostic(
  step: number,
  test: FieldCapture,
  reference: FieldCapture,
  testTrace: MutableTrace,
  referenceTrace: MutableTrace,
): ShearDiagnosticSample {
  const shift = CONTRACT.twoDimensionalPerturbations.domainPair
    .referenceShiftCells;
  let vorticityDifferenceSquares = 0;
  let vorticityReferenceSquares = 0;
  let testTransverseEnergy = 0;
  let referenceTransverseEnergy = 0;
  let count = 0;
  for (let y = 0; y < testTrace.ny; y += 1) {
    for (let x = 1; x < testTrace.nx - 1; x += 1) {
      const referenceX = x + shift;
      const testVorticity = vorticityAt(
        test,
        testTrace.nx,
        testTrace.ny,
        x,
        y,
      );
      const referenceVorticity = vorticityAt(
        reference,
        referenceTrace.nx,
        referenceTrace.ny,
        referenceX,
        y,
      );
      vorticityDifferenceSquares +=
        (testVorticity - referenceVorticity) ** 2;
      vorticityReferenceSquares += referenceVorticity ** 2;
      testTransverseEnergy +=
        (test.uy[x + testTrace.nx * y] ?? Number.NaN) ** 2;
      referenceTransverseEnergy +=
        (reference.uy[referenceX + referenceTrace.nx * y]
          ?? Number.NaN) ** 2;
      count += 1;
    }
  }
  const testMean = testTrace.meanTrace[testTrace.meanTrace.length - 1];
  const referenceMean =
    referenceTrace.meanTrace[referenceTrace.meanTrace.length - 1];
  if (testMean === undefined || referenceMean === undefined || count === 0) {
    throw new RangeError("A8O invalid shear diagnostic state");
  }
  const testDrift = meanDrifts(testTrace, testMean);
  const referenceDrift = meanDrifts(referenceTrace, referenceMean);
  return {
    step,
    vorticityRmsRelativeReferenceError: safeFiniteRatio(
      Math.sqrt(vorticityDifferenceSquares / count),
      Math.sqrt(vorticityReferenceSquares / count),
    ),
    transverseKineticEnergyRelativeReferenceError: safeFiniteRatio(
      Math.abs(testTransverseEnergy - referenceTransverseEnergy),
      Math.max(testTransverseEnergy, referenceTransverseEnergy),
    ),
    meanDensityDrift: Math.max(testDrift.density, referenceDrift.density),
    meanVelocityDrift: Math.max(testDrift.velocity, referenceDrift.velocity),
  };
}

function predictedWindows(
  definition: FormalCausalPerturbationDefinition,
  trace: MutableTrace,
): { incident: PerturbationWindow; reflected: PerturbationWindow } {
  const cs = CONTRACT.commonNumerics.latticeSoundSpeed;
  const u0 = CONTRACT.commonNumerics.inletVelocityLattice;
  let upstreamSpeed: number;
  let downstreamSpeed: number;
  let sigma: number;
  if (definition.family === "oblique-acoustic") {
    const acoustic = CONTRACT.twoDimensionalPerturbations.obliqueAcoustic;
    const kx = 2 * Math.PI / acoustic.streamwiseWavelengthCells;
    const ky = 2 * Math.PI * definition.transverseMode / trace.ny;
    const streamwiseDirection = kx / Math.hypot(kx, ky);
    upstreamSpeed = cs * streamwiseDirection - u0;
    downstreamSpeed = cs * streamwiseDirection + u0;
    sigma = acoustic.envelopeSigmaCells;
  } else {
    upstreamSpeed = cs - u0;
    downstreamSpeed = cs + u0;
    sigma = CONTRACT.twoDimensionalPerturbations.localizedPressure.sigmaCells;
  }
  if (!(upstreamSpeed > 0) || !(downstreamSpeed > 0)) {
    throw new RangeError("A8O invalid predicted perturbation group speed");
  }
  const incidentCenter = (trace.pulseCenterX - trace.probeX)
    / upstreamSpeed;
  const reflectedCenter = trace.pulseCenterX / upstreamSpeed
    + trace.probeX / downstreamSpeed;
  const halfWidth = CONTRACT.operationalDefinitions.perturbations
    .windowEnvelopeSigmaMultipliers * sigma / upstreamSpeed;
  const runSteps = CONTRACT.twoDimensionalPerturbations.domainPair.runSteps;
  const window = (center: number): PerturbationWindow => ({
    startStep: Math.max(1, Math.ceil(center - halfWidth)),
    endStep: Math.min(runSteps, Math.floor(center + halfWidth)),
    predictedCenterStep: center,
  });
  return { incident: window(incidentCenter), reflected: window(reflectedCenter) };
}

function inWindow(step: number, window: PerturbationWindow): boolean {
  return step >= window.startStep && step <= window.endStep;
}

function maximumMeanDrift(
  first: MutableTrace,
  second: MutableTrace,
): { density: number; velocity: number } {
  let density = 0;
  let velocity = 0;
  for (const trace of [first, second]) {
    for (const sample of trace.meanTrace) {
      const drift = meanDrifts(trace, sample);
      density = Math.max(density, drift.density);
      velocity = Math.max(velocity, drift.velocity);
    }
  }
  return { density, velocity };
}

function buildObliqueMetrics(
  definition: FormalCausalPerturbationDefinition,
  trace: readonly ObliqueDiagnosticSample[],
  test: MutableTrace,
  reference: MutableTrace,
): ObliqueMetrics {
  const windows = predictedWindows(definition, test);
  let incidentAmplitudeSquared = 0;
  let reflectedAmplitudeSquared = 0;
  let maximumIncidentAmplitudeSquared = 0;
  let maximumReflectedAmplitudeSquared = 0;
  let incidentDifferenceSquared = 0;
  let contaminationEnergy = 0;
  let incidentSamples = 0;
  let reflectedSamples = 0;
  for (const sample of trace) {
    if (inWindow(sample.step, windows.incident)) {
      const incident = complexMagnitudeSquared(sample.referenceIncident);
      const difference = complexMagnitudeSquared(complexDifference(
        sample.testIncident,
        sample.referenceIncident,
      ));
      incidentAmplitudeSquared += incident;
      incidentDifferenceSquared += difference;
      maximumIncidentAmplitudeSquared = Math.max(
        maximumIncidentAmplitudeSquared,
        incident,
      );
      incidentSamples += 1;
    }
    if (inWindow(sample.step, windows.reflected)) {
      const reflected = complexMagnitudeSquared(sample.reflected);
      reflectedAmplitudeSquared += reflected;
      maximumReflectedAmplitudeSquared = Math.max(
        maximumReflectedAmplitudeSquared,
        reflected,
      );
      contaminationEnergy += sample.reflectedNonTargetModalEnergy;
      reflectedSamples += 1;
    }
  }
  if (incidentSamples === 0 || reflectedSamples === 0) {
    throw new RangeError("A8O oblique perturbation window is empty");
  }
  const incidentModalAmplitude = Math.sqrt(
    maximumIncidentAmplitudeSquared,
  );
  const reflectedModalAmplitude = Math.sqrt(
    maximumReflectedAmplitudeSquared,
  );
  const drift = maximumMeanDrift(test, reference);
  return {
    incidentWindow: windows.incident,
    reflectedWindow: windows.reflected,
    incidentModalAmplitude,
    reflectedModalAmplitude,
    modalAmplitudeReflectionRatio: safeFiniteRatio(
      reflectedModalAmplitude,
      incidentModalAmplitude,
    ),
    modalEnergyReflectionRatio: safeFiniteRatio(
      reflectedAmplitudeSquared,
      incidentAmplitudeSquared,
    ),
    transverseModeContaminationRatio: safeFiniteRatio(
      Math.sqrt(contaminationEnergy),
      Math.sqrt(reflectedAmplitudeSquared),
    ),
    incidentReferenceRelativeRmsMismatch: safeFiniteRatio(
      Math.sqrt(incidentDifferenceSquared / incidentSamples),
      Math.sqrt(incidentAmplitudeSquared / incidentSamples),
    ),
    maximumMeanDensityDrift: drift.density,
    maximumMeanVelocityDrift: drift.velocity,
  };
}

function buildLocalPressureMetrics(
  definition: FormalCausalPerturbationDefinition,
  trace: readonly LocalPressureDiagnosticSample[],
  test: MutableTrace,
  reference: MutableTrace,
): LocalPressureMetrics {
  const windows = predictedWindows(definition, test);
  let incidentDensitySquares = 0;
  let incidentVelocitySquares = 0;
  let reflectedDensitySquares = 0;
  let reflectedVelocitySquares = 0;
  let incidentSamples = 0;
  let reflectedSamples = 0;
  for (const sample of trace) {
    if (inWindow(sample.step, windows.incident)) {
      incidentDensitySquares += sample.incidentReferenceDensityRms ** 2;
      incidentVelocitySquares += sample.incidentReferenceVelocityRms ** 2;
      incidentSamples += 1;
    }
    if (inWindow(sample.step, windows.reflected)) {
      reflectedDensitySquares += sample.reflectedDensityRms ** 2;
      reflectedVelocitySquares += sample.reflectedVelocityRms ** 2;
      reflectedSamples += 1;
    }
  }
  if (incidentSamples === 0 || reflectedSamples === 0) {
    throw new RangeError("A8O local-pressure perturbation window is empty");
  }
  const incidentReferenceDensityRms = Math.sqrt(
    incidentDensitySquares / incidentSamples,
  );
  const incidentReferenceVelocityRms = Math.sqrt(
    incidentVelocitySquares / incidentSamples,
  );
  const reflectedDensityRms = Math.sqrt(
    reflectedDensitySquares / reflectedSamples,
  );
  const reflectedVelocityRms = Math.sqrt(
    reflectedVelocitySquares / reflectedSamples,
  );
  const drift = maximumMeanDrift(test, reference);
  return {
    incidentWindow: windows.incident,
    reflectedWindow: windows.reflected,
    incidentReferenceDensityRms,
    incidentReferenceVelocityRms,
    reflectedDensityRms,
    reflectedVelocityRms,
    reflectedDensityRmsRatio: safeFiniteRatio(
      reflectedDensityRms,
      incidentReferenceDensityRms,
    ),
    reflectedVelocityRmsRatio: safeFiniteRatio(
      reflectedVelocityRms,
      incidentReferenceVelocityRms,
    ),
    maximumMeanDensityDrift: drift.density,
    maximumMeanVelocityDrift: drift.velocity,
  };
}

function maximum(values: readonly number[]): number {
  let result = 0;
  for (const value of values) result = Math.max(result, value);
  return result;
}

function finishTrace(
  trace: MutableTrace,
  definition: FormalCausalPerturbationDefinition,
): PerturbationTraceResult {
  const expectedSteps = CONTRACT.twoDimensionalPerturbations.domainPair
    .runSteps;
  const massSummary = finishCompactMassLedger(trace.ledger, expectedSteps);
  const reconstructionSummary = finishCompactReconstruction(
    definition.strategy,
    trace.reconstructionStepRecords,
    massSummary,
    expectedSteps,
    trace.ny,
  );
  const executionPass = trace.failure === undefined
    && trace.completedSteps === expectedSteps;
  const densityPass = trace.completedSteps > 0
    && trace.stability.maximumDensityDeviation
      <= CONTRACT.continuousStatistics.gates.maximumDensityDeviation;
  const machPass = trace.completedSteps > 0
    && trace.stability.maximumMach
      <= CONTRACT.continuousStatistics.gates.maximumMach;
  const pass = executionPass
    && densityPass
    && machPass
    && massSummary.gates.pass
    && reconstructionSummary.gates.pass;
  return {
    role: trace.role,
    status: executionPass ? "completed" : "failed",
    nx: trace.nx,
    ny: trace.ny,
    pulseCenterX: trace.pulseCenterX,
    probeX: trace.probeX,
    completedSteps: trace.completedSteps,
    stability: trace.completedSteps === 0 ? null : trace.stability,
    initialMeanDensity: trace.initialMeanDensity,
    initialMeanUx: trace.initialMeanUx,
    initialMeanUy: trace.initialMeanUy,
    meanTrace: trace.meanTrace,
    massStepRecords: trace.massStepRecords,
    massSummary,
    reconstructionStepRecords: trace.reconstructionStepRecords,
    reconstructionSummary,
    gate: {
      executionPass,
      densityPass,
      machPass,
      massPass: massSummary.gates.pass,
      reconstructionPass: reconstructionSummary.gates.pass,
      pass,
    },
    ...(trace.failure === undefined ? {} : { failure: trace.failure }),
  };
}

export function runPerturbationPair(
  definition: FormalCausalPerturbationDefinition,
): PerturbationPairResult {
  const test = createTrace(definition, "test");
  const reference = createTrace(definition, "extended-reference");
  const obliqueTrace: ObliqueDiagnosticSample[] = [];
  const localPressureTrace: LocalPressureDiagnosticSample[] = [];
  const shearTrace: ShearDiagnosticSample[] = [];
  const runSteps = CONTRACT.twoDimensionalPerturbations.domainPair.runSteps;
  let pairFailure: PerturbationTraceResult["failure"];
  try {
    for (let step = 1; step <= runSteps; step += 1) {
      const testField = advanceTrace(test, definition, step);
      const referenceField = advanceTrace(reference, definition, step);
      if (definition.family === "oblique-acoustic") {
        obliqueTrace.push(obliqueDiagnostic(
          definition,
          step,
          testField,
          referenceField,
          test,
          reference,
        ));
      } else if (definition.family === "localized-pressure") {
        localPressureTrace.push(localPressureDiagnostic(
          step,
          testField,
          referenceField,
          test,
          reference,
        ));
      } else if (
        step % CONTRACT.operationalDefinitions.perturbations
          .shearDiagnosticStrideSteps === 0
      ) {
        shearTrace.push(shearDiagnostic(
          step,
          testField,
          referenceField,
          test,
          reference,
        ));
      }
    }
  } catch (error) {
    pairFailure = {
      nextStep: Math.min(test.completedSteps, reference.completedSteps) + 1,
      ...errorIdentity(error),
    };
    test.failure = pairFailure;
    reference.failure = pairFailure;
  }
  const testResult = finishTrace(test, definition);
  const referenceResult = finishTrace(reference, definition);
  const oblique = definition.family === "oblique-acoustic"
    && obliqueTrace.length === runSteps
    ? buildObliqueMetrics(definition, obliqueTrace, test, reference)
    : null;
  const localizedPressure = definition.family === "localized-pressure"
    && localPressureTrace.length === runSteps
    ? buildLocalPressureMetrics(
      definition,
      localPressureTrace,
      test,
      reference,
    )
    : null;
  const shear = definition.family === "shear-vorticity"
    && shearTrace.length === Math.floor(
      runSteps / CONTRACT.operationalDefinitions.perturbations
        .shearDiagnosticStrideSteps,
    )
    ? {
      maximumVorticityRmsRelativeReferenceError: maximum(
        shearTrace.map((entry) =>
          entry.vorticityRmsRelativeReferenceError),
      ),
      maximumTransverseKineticEnergyRelativeReferenceError: maximum(
        shearTrace.map((entry) =>
          entry.transverseKineticEnergyRelativeReferenceError),
      ),
      maximumMeanDensityDrift: maximum(
        shearTrace.map((entry) => entry.meanDensityDrift),
      ),
      maximumMeanVelocityDrift: maximum(
        shearTrace.map((entry) => entry.meanVelocityDrift),
      ),
    }
    : null;
  const internalPass = testResult.gate.pass && referenceResult.gate.pass;
  let amplitudePass: boolean | null = null;
  let energyPass: boolean | null = null;
  let contaminationPass: boolean | null = null;
  let referenceMatchPass: boolean | null = null;
  let densityReflectionPass: boolean | null = null;
  let velocityReflectionPass: boolean | null = null;
  let meanDensityDriftPass: boolean | null = null;
  let meanVelocityDriftPass: boolean | null = null;
  let qualificationPass: boolean | null = null;
  if (oblique !== null) {
    const gates = CONTRACT.twoDimensionalPerturbations.obliqueAcoustic.gates;
    amplitudePass = oblique.modalAmplitudeReflectionRatio
      <= gates.maximumModalAmplitudeReflectionRatio;
    energyPass = oblique.modalEnergyReflectionRatio
      <= gates.maximumModalEnergyReflectionRatio;
    contaminationPass = oblique.transverseModeContaminationRatio
      <= gates.maximumTransverseModeContaminationRatio;
    referenceMatchPass = oblique.incidentReferenceRelativeRmsMismatch
      <= gates.maximumIncidentReferenceRelativeRmsMismatch;
    meanDensityDriftPass = oblique.maximumMeanDensityDrift
      <= gates.maximumMeanDensityDrift;
    meanVelocityDriftPass = oblique.maximumMeanVelocityDrift
      <= gates.maximumMeanVelocityDrift;
    qualificationPass = internalPass
      && amplitudePass
      && energyPass
      && contaminationPass
      && referenceMatchPass
      && meanDensityDriftPass
      && meanVelocityDriftPass;
  } else if (localizedPressure !== null) {
    const gates = CONTRACT.twoDimensionalPerturbations.localizedPressure.gates;
    densityReflectionPass = localizedPressure.reflectedDensityRmsRatio
      <= gates.maximumReflectedDensityRmsRatio;
    velocityReflectionPass = localizedPressure.reflectedVelocityRmsRatio
      <= gates.maximumReflectedVelocityRmsRatio;
    meanDensityDriftPass = localizedPressure.maximumMeanDensityDrift
      <= gates.maximumMeanDensityDrift;
    meanVelocityDriftPass = localizedPressure.maximumMeanVelocityDrift
      <= gates.maximumMeanVelocityDrift;
    qualificationPass = internalPass
      && densityReflectionPass
      && velocityReflectionPass
      && meanDensityDriftPass
      && meanVelocityDriftPass;
  }
  const physicsGateApplicable = qualificationPass !== null;
  return {
    definition,
    test: testResult,
    extendedReference: referenceResult,
    obliqueTrace,
    localPressureTrace,
    shearTrace,
    metrics: { oblique, localizedPressure, shear },
    gate: {
      internalPass,
      physicsGateApplicable,
      amplitudePass,
      energyPass,
      contaminationPass,
      referenceMatchPass,
      densityReflectionPass,
      velocityReflectionPass,
      meanDensityDriftPass,
      meanVelocityDriftPass,
      qualificationPass,
      pass: internalPass && qualificationPass !== false,
    },
  };
}

export function runPerturbationMatrix(
  onProgress?: (progress: PerturbationMatrixProgress) => void,
): PerturbationMatrixResult {
  const definitions = buildFormalCausalPerturbationDefinitions();
  const pairs: PerturbationPairResult[] = [];
  for (const definition of definitions) {
    const result = runPerturbationPair(definition);
    pairs.push(result);
    onProgress?.({
      phase: "perturbation",
      completed: pairs.length,
      total: definitions.length,
      caseId: definition.id,
      internalPass: result.gate.internalPass,
      qualificationPass: result.gate.qualificationPass,
    });
  }
  const s9 = pairs.filter((entry) =>
    entry.definition.strategy
      === "incoming-characteristic-compatible-zou-he");
  const s9Oblique = s9.filter((entry) =>
    entry.definition.family === "oblique-acoustic");
  const s9Local = s9.filter((entry) =>
    entry.definition.family === "localized-pressure");
  const shear = pairs.filter((entry) =>
    entry.definition.family === "shear-vorticity");
  const pairCountPass = pairs.length
    === CONTRACT.twoDimensionalPerturbations.casePairCount;
  const traceCountPass = pairs.length * 2
    === CONTRACT.twoDimensionalPerturbations.solverTraceCount;
  const allInternalPass = pairs.every((entry) => entry.gate.internalPass);
  const allS9ObliquePass = s9Oblique.length === 6
    && s9Oblique.every((entry) => entry.gate.qualificationPass === true);
  const allS9LocalizedPressurePass = s9Local.length === 3
    && s9Local.every((entry) => entry.gate.qualificationPass === true);
  const expectedShearSamples = Math.floor(
    CONTRACT.twoDimensionalPerturbations.domainPair.runSteps
      / CONTRACT.operationalDefinitions.perturbations
        .shearDiagnosticStrideSteps,
  );
  const shearDiagnosticComplete = shear.length === 6
    && shear.every((entry) =>
      entry.shearTrace.length === expectedShearSamples);
  return {
    pairs,
    gate: {
      pairCountPass,
      traceCountPass,
      allInternalPass,
      allS9ObliquePass,
      allS9LocalizedPressurePass,
      shearDiagnosticComplete,
      pass: pairCountPass
        && traceCountPass
        && allInternalPass
        && allS9ObliquePass
        && allS9LocalizedPressurePass
        && shearDiagnosticComplete,
    },
  };
}
