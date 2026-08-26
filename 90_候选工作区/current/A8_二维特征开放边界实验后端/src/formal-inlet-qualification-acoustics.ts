import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED,
  type LbmCheckpoint,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { applyInletMechanism } from
  "./formal-inlet-mechanism-boundaries.ts";
import { FORMAL_INLET_QUALIFICATION_CONTRACT as CONTRACT } from
  "./formal-inlet-qualification-contract.ts";
import {
  createMassLedger,
  finishMassLedger,
  recordPopulationMassStep,
  shadowFormalStep,
} from "./formal-inlet-qualification-ledger.ts";
import type {
  AcousticCaseDefinition,
  AcousticCaseResult,
  AcousticMetrics,
  AcousticTrace,
  PopulationMassStepRecord,
  QualificationProvenance,
} from "./formal-inlet-qualification-types.ts";

function cloneCheckpoint(checkpoint: LbmCheckpoint): LbmCheckpoint {
  return { ...checkpoint, distributions: checkpoint.distributions.slice() };
}

function condensation(x: number, center: number): number {
  const pulse = CONTRACT.acousticReflection.perturbation;
  const xi = x - center;
  return Math.sqrt(Math.E) * pulse.condensationPeakAmplitude
    / pulse.lambdaCells * xi
    * Math.exp(-(xi * xi) / (2 * pulse.lambdaCells * pulse.lambdaCells));
}

function mean(values: ArrayLike<number>): number {
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    total += values[index] ?? 0;
  }
  return total / values.length;
}

function crossStreamMean(
  values: ArrayLike<number>,
  nx: number,
  ny: number,
  x: number,
): number {
  let total = 0;
  for (let y = 0; y < ny; y += 1) total += values[x + nx * y] ?? 0;
  return total / ny;
}

function errorIdentity(error: unknown): { name: string; message: string } {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: "UnknownError", message: String(error) };
}

function runAcousticTrace(
  definition: AcousticCaseDefinition,
  role: AcousticTrace["role"],
): AcousticTrace {
  const domain = CONTRACT.acousticReflection.domainPair;
  const base = CONTRACT.acousticReflection.baseState;
  const nx = role === "test" ? domain.testNx : domain.referenceNx;
  const pulseCenterX = role === "test"
    ? domain.testPulseCenterX
    : domain.referencePulseCenterX;
  const probeX = role === "test" ? domain.testProbeX : domain.referenceProbeX;
  const ny = domain.ny;
  const solver = new D2Q9MrtBrinkmanSolver({
    nx,
    ny,
    relaxationTime: definition.relaxationTime,
    penalizationTimeSteps: CONTRACT.commonNumerics.penalizationTimeSteps,
    maskHalfThickness: CONTRACT.commonNumerics.maskHalfThicknessCells,
    outerBoundary: CONTRACT.commonNumerics.outerBoundary,
  });
  solver.initializeField((x) => {
    const s = condensation(x, pulseCenterX);
    return {
      rho: base.rho + s,
      ux: base.ux - LATTICE_SOUND_SPEED * s,
      uy: base.uy,
    };
  });
  const initialField = solver.macroscopicCopies(null);
  const initialDomainMeanDensity = mean(initialField.rho);
  const initialDomainMeanUx = mean(initialField.ux);
  const massLedger = createMassLedger(solver.checkpoint());
  const massStepRecords: PopulationMassStepRecord[] = [];
  const probeDensity: number[] = [];
  const probeUx: number[] = [];
  const domainMeanDensity: number[] = [];
  const domainMeanUx: number[] = [];
  let completedSteps = 0;
  let failure: AcousticTrace["failure"];
  try {
    for (let step = 1; step <= domain.runSteps; step += 1) {
      const preField = solver.macroscopicCopies(null);
      const preCheckpoint = solver.checkpoint();
      const shadow = shadowFormalStep(preCheckpoint, null, base.ux);
      solver.step(null, base.ux);
      const formalCheckpoint = solver.checkpoint();
      const candidateCheckpoint = cloneCheckpoint(formalCheckpoint);
      applyInletMechanism(candidateCheckpoint, {
        id: `${definition.id}-${role}`,
        nominalDiameterScaleCells: CONTRACT.acousticReflection.perturbation.lambdaCells,
        relaxationTime: definition.relaxationTime,
        nx,
        ny,
        auditSteps: domain.runSteps,
        rampSteps: 0,
        strategy: definition.strategy,
      }, preField, base.ux);
      massStepRecords.push(recordPopulationMassStep(
        step,
        "acoustic",
        shadow,
        formalCheckpoint,
        candidateCheckpoint,
        massLedger,
      ));
      solver.restore(candidateCheckpoint);
      const field = solver.macroscopicCopies(null);
      probeDensity.push(crossStreamMean(field.rho, nx, ny, probeX));
      probeUx.push(crossStreamMean(field.ux, nx, ny, probeX));
      domainMeanDensity.push(mean(field.rho));
      domainMeanUx.push(mean(field.ux));
      completedSteps = step;
    }
  } catch (error) {
    failure = { nextStep: completedSteps + 1, ...errorIdentity(error) };
  }
  return {
    role,
    nx,
    ny,
    pulseCenterX,
    probeX,
    completedSteps,
    probeDensity,
    probeUx,
    domainMeanDensity,
    domainMeanUx,
    initialDomainMeanDensity,
    initialDomainMeanUx,
    massStepRecords,
    massSummary: finishMassLedger(massLedger, definition.strategy),
    ...(failure === undefined ? {} : { failure }),
  };
}

function inclusiveWindow(values: readonly number[], bounds: readonly number[]): number[] {
  const start = bounds[0];
  const end = bounds[1];
  if (start === undefined || end === undefined) {
    throw new RangeError("A8M acoustic window requires two bounds");
  }
  return values.slice(start - 1, end);
}

function maximumAbsolute(values: readonly number[]): number {
  let maximum = 0;
  for (const value of values) maximum = Math.max(maximum, Math.abs(value));
  return maximum;
}

function rms(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let squares = 0;
  for (const value of values) squares += value * value;
  return Math.sqrt(squares / values.length);
}

function sumSquares(values: readonly number[]): number {
  let result = 0;
  for (const value of values) result += value * value;
  return result;
}

function interpolateStep(values: readonly number[], step: number): number {
  if (step <= 1) return values[0] ?? 0;
  if (step >= values.length) return values[values.length - 1] ?? 0;
  const lowerStep = Math.floor(step);
  const fraction = step - lowerStep;
  const lower = values[lowerStep - 1] ?? 0;
  const upper = values[lowerStep] ?? lower;
  return lower + fraction * (upper - lower);
}

function phaseMetrics(
  reflected: readonly number[],
  fullIncident: readonly number[],
): { lag: number; radians: number; polarity: 1 | -1 } {
  const domain = CONTRACT.acousticReflection.domainPair;
  const base = CONTRACT.acousticReflection.baseState;
  const lambda = CONTRACT.acousticReflection.perturbation.lambdaCells;
  const upstreamSpeed = LATTICE_SOUND_SPEED - base.ux;
  const downstreamSpeed = LATTICE_SOUND_SPEED + base.ux;
  const incidentCenter = (domain.testPulseCenterX - domain.testProbeX) / upstreamSpeed;
  const reflectedCenter = domain.testPulseCenterX / upstreamSpeed
    + domain.testProbeX / downstreamSpeed;
  const reflectionStart = domain.reflectedWindowInclusive[0];
  const reflectionEnd = domain.reflectedWindowInclusive[1];
  if (reflectionStart === undefined || reflectionEnd === undefined) {
    throw new RangeError("A8M reflection window requires two bounds");
  }
  const template: number[] = [];
  for (let step = reflectionStart; step <= reflectionEnd; step += 1) {
    const incidentStep = incidentCenter
      - (step - reflectedCenter) * downstreamSpeed / upstreamSpeed;
    template.push(interpolateStep(fullIncident, incidentStep));
  }
  const maximumLag = Math.ceil(2 * lambda / downstreamSpeed);
  let bestLag = 0;
  let bestCorrelation = 0;
  for (let lag = -maximumLag; lag <= maximumLag; lag += 1) {
    let correlation = 0;
    let reflectedSquares = 0;
    let templateSquares = 0;
    for (let index = 0; index < reflected.length; index += 1) {
      const templateIndex = index + lag;
      if (templateIndex < 0 || templateIndex >= template.length) continue;
      const a = reflected[index] ?? 0;
      const b = template[templateIndex] ?? 0;
      correlation += a * b;
      reflectedSquares += a * a;
      templateSquares += b * b;
    }
    const normalized = correlation
      / Math.max(Number.MIN_VALUE, Math.sqrt(reflectedSquares * templateSquares));
    if (Math.abs(normalized) > Math.abs(bestCorrelation)) {
      bestCorrelation = normalized;
      bestLag = lag;
    }
  }
  return {
    lag: bestLag,
    radians: Math.abs(bestLag) * downstreamSpeed / lambda,
    polarity: bestCorrelation < 0 ? -1 : 1,
  };
}

function maximumDrift(values: readonly number[], initial: number): number {
  let maximum = 0;
  for (const value of values) maximum = Math.max(maximum, Math.abs(value - initial));
  return maximum;
}

function buildMetrics(test: AcousticTrace, reference: AcousticTrace): AcousticMetrics {
  const base = CONTRACT.acousticReflection.baseState;
  const domain = CONTRACT.acousticReflection.domainPair;
  const fullReferenceAminus = reference.probeDensity.map((density, index) =>
    0.5 * (
      density - base.rho
      - base.rho * ((reference.probeUx[index] ?? base.ux) - base.ux)
        / LATTICE_SOUND_SPEED
    ));
  const fullReferenceAplus = reference.probeDensity.map((density, index) =>
    0.5 * (
      density - base.rho
      + base.rho * ((reference.probeUx[index] ?? base.ux) - base.ux)
        / LATTICE_SOUND_SPEED
    ));
  const fullTestAminus = test.probeDensity.map((density, index) =>
    0.5 * (
      density - base.rho
      - base.rho * ((test.probeUx[index] ?? base.ux) - base.ux)
        / LATTICE_SOUND_SPEED
    ));
  const fullTestAplus = test.probeDensity.map((density, index) =>
    0.5 * (
      density - base.rho
      + base.rho * ((test.probeUx[index] ?? base.ux) - base.ux)
        / LATTICE_SOUND_SPEED
    ));
  const incidentCharacteristic = inclusiveWindow(
    fullReferenceAminus,
    domain.incidentWindowInclusive,
  );
  const incidentDensity = inclusiveWindow(
    reference.probeDensity.map((value) => value - base.rho),
    domain.incidentWindowInclusive,
  );
  const incidentVelocity = inclusiveWindow(
    reference.probeUx.map((value) => value - base.ux),
    domain.incidentWindowInclusive,
  );
  const reflectedCharacteristic = inclusiveWindow(
    fullTestAplus.map((value, index) => value - (fullReferenceAplus[index] ?? 0)),
    domain.reflectedWindowInclusive,
  );
  const reflectedDensity = inclusiveWindow(
    test.probeDensity.map((value, index) =>
      value - (reference.probeDensity[index] ?? base.rho)),
    domain.reflectedWindowInclusive,
  );
  const reflectedVelocity = inclusiveWindow(
    test.probeUx.map((value, index) =>
      value - (reference.probeUx[index] ?? base.ux)),
    domain.reflectedWindowInclusive,
  );
  const incidentCharacteristicAmplitude = maximumAbsolute(incidentCharacteristic);
  const incidentDensityAmplitude = maximumAbsolute(incidentDensity);
  const incidentVelocityAmplitude = maximumAbsolute(incidentVelocity);
  const characteristicAmplitudeReflectionRatio = maximumAbsolute(
    reflectedCharacteristic,
  ) / Math.max(Number.MIN_VALUE, incidentCharacteristicAmplitude);
  const densityAmplitudeReflectionRatio = maximumAbsolute(reflectedDensity)
    / Math.max(Number.MIN_VALUE, incidentDensityAmplitude);
  const velocityAmplitudeReflectionRatio = maximumAbsolute(reflectedVelocity)
    / Math.max(Number.MIN_VALUE, incidentVelocityAmplitude);
  const acousticEnergyReflectionRatio = sumSquares(reflectedCharacteristic)
    / Math.max(Number.MIN_VALUE, sumSquares(incidentCharacteristic));
  const phase = phaseMetrics(
    reflectedCharacteristic,
    fullReferenceAminus,
  );
  const incidentTest = inclusiveWindow(fullTestAminus, domain.incidentWindowInclusive);
  const incidentDifference = incidentTest.map((value, index) =>
    value - (incidentCharacteristic[index] ?? 0));
  return {
    incidentCharacteristicAmplitude,
    incidentDensityAmplitude,
    incidentVelocityAmplitude,
    incidentAmplitudeOverInitializationPeak: incidentCharacteristicAmplitude
      / CONTRACT.acousticReflection.perturbation.condensationPeakAmplitude,
    characteristicAmplitudeReflectionRatio,
    densityAmplitudeReflectionRatio,
    velocityAmplitudeReflectionRatio,
    acousticEnergyReflectionRatio,
    phaseLagSteps: phase.lag,
    phaseErrorRadians: phase.radians,
    phasePolarity: phase.polarity,
    phaseDetectable: characteristicAmplitudeReflectionRatio
      >= CONTRACT.acousticReflection.gates
        .phaseGateMinimumCharacteristicReflectionRatio,
    maximumMeanDensityDrift: Math.max(
      maximumDrift(test.domainMeanDensity, test.initialDomainMeanDensity),
      maximumDrift(
        reference.domainMeanDensity,
        reference.initialDomainMeanDensity,
      ),
    ),
    maximumMeanStreamwiseVelocityDrift: Math.max(
      maximumDrift(test.domainMeanUx, test.initialDomainMeanUx),
      maximumDrift(reference.domainMeanUx, reference.initialDomainMeanUx),
    ),
    incidentWindowTestReferenceRelativeRmsMismatch: rms(incidentDifference)
      / Math.max(Number.MIN_VALUE, rms(incidentCharacteristic)),
  };
}

export function runFormalInletQualificationAcousticCase(
  definition: AcousticCaseDefinition,
  provenance: QualificationProvenance,
): AcousticCaseResult {
  const test = runAcousticTrace(definition, "test");
  const extendedReference = runAcousticTrace(definition, "extended-reference");
  const metrics = buildMetrics(test, extendedReference);
  const gates = CONTRACT.acousticReflection.gates;
  const executionPass = test.failure === undefined
    && extendedReference.failure === undefined
    && test.completedSteps === CONTRACT.acousticReflection.domainPair.runSteps
    && extendedReference.completedSteps
      === CONTRACT.acousticReflection.domainPair.runSteps;
  const massPass = test.massSummary.gates.pass
    && extendedReference.massSummary.gates.pass;
  const incidentDetected = metrics.incidentAmplitudeOverInitializationPeak
    >= gates.minimumIncidentCharacteristicAmplitudeOverInitializationPeak;
  const referenceMatchPass = metrics.incidentWindowTestReferenceRelativeRmsMismatch
    <= gates.maximumIncidentWindowTestReferenceRelativeRmsMismatch;
  const characteristicReflectionPass = metrics.characteristicAmplitudeReflectionRatio
    <= gates.maximumCharacteristicAmplitudeReflectionRatio;
  const densityReflectionPass = metrics.densityAmplitudeReflectionRatio
    <= gates.maximumDensityAmplitudeReflectionRatio;
  const velocityReflectionPass = metrics.velocityAmplitudeReflectionRatio
    <= gates.maximumVelocityAmplitudeReflectionRatio;
  const energyReflectionPass = metrics.acousticEnergyReflectionRatio
    <= gates.maximumAcousticEnergyReflectionRatio;
  const phasePass = !metrics.phaseDetectable
    || metrics.phaseErrorRadians <= gates.maximumPhaseErrorRadiansWhenDetectable;
  const meanDensityDriftPass = metrics.maximumMeanDensityDrift
    <= gates.maximumMeanDensityDrift;
  const meanVelocityDriftPass = metrics.maximumMeanStreamwiseVelocityDrift
    <= gates.maximumMeanStreamwiseVelocityDrift;
  const pass = executionPass
    && massPass
    && incidentDetected
    && referenceMatchPass
    && characteristicReflectionPass
    && densityReflectionPass
    && velocityReflectionPass
    && energyReflectionPass
    && phasePass
    && meanDensityDriftPass
    && meanVelocityDriftPass;
  return {
    definition,
    provenance,
    test,
    extendedReference,
    metrics,
    gate: {
      executionPass,
      massPass,
      incidentDetected,
      referenceMatchPass,
      characteristicReflectionPass,
      densityReflectionPass,
      velocityReflectionPass,
      energyReflectionPass,
      phasePass,
      meanDensityDriftPass,
      meanVelocityDriftPass,
      pass,
    },
  };
}
