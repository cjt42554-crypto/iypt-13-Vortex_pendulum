import {
  D2Q9MrtBrinkmanSolver,
  type LbmBodyKinematics,
  type LbmCheckpoint,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { applyIncomingCharacteristicBoundary } from
  "./formal-incoming-characteristic-boundary.ts";
import {
  FORMAL_CAUSAL_REFERENCE_CONTRACT as CONTRACT,
  type FormalCausalReferenceDefinition,
} from "./formal-causal-reference-contract.ts";
import {
  buildCompactReconstructionStep,
  captureField,
  cloneCheckpoint,
  correctedLoadSample,
  createCompactMassLedger,
  dominantStrouhal,
  emptyStabilityEnvelope,
  finishCompactMassLedger,
  finishCompactReconstruction,
  fixedBody,
  pressureProxy,
  recordCompactMassStep,
  relativeDifference,
  rms,
  summarizeCoefficients,
  updateStabilityEnvelope,
  type CoefficientSummary,
  type CompactMassStepRecord,
  type CompactMassSummary,
  type CompactReconstructionStepRecord,
  type CompactReconstructionSummary,
  type FieldCapture,
  type LoadSample,
  type StabilityEnvelope,
} from "./formal-causal-reference-support.ts";

export interface A8nAnchorMassRecord {
  step: number;
  preCollisionTotalMass: number;
  postFormalBoundaryMass: number;
  postCandidateAdapterTotalMass: number;
  adapterByDirection: number[];
  adapterAbsoluteByDirection: number[];
}

export interface CausalAnchorComparison {
  applicable: boolean;
  checkedSteps: number;
  expectedAvailableSteps: number;
  exactMatch: boolean | null;
  firstMismatchStep: number | null;
}

export interface CausalRegionSample {
  step: number;
  rho: Float64Array;
  ux: Float64Array;
  uy: Float64Array;
}

export interface CausalRunResult {
  definition: FormalCausalReferenceDefinition;
  status: "completed" | "failed";
  completedSteps: number;
  stability: StabilityEnvelope | null;
  loadTrace: LoadSample[];
  massStepRecords: CompactMassStepRecord[];
  massSummary: CompactMassSummary;
  reconstructionStepRecords: CompactReconstructionStepRecord[];
  reconstructionSummary: CompactReconstructionSummary;
  alignedBoundaryFlux: {
    startStep: number;
    endStep: number;
    signedAdapterMassPerBoundaryRow: number;
  };
  anchorComparison: CausalAnchorComparison;
  gate: {
    executionPass: boolean;
    densityPass: boolean;
    machPass: boolean;
    massPass: boolean;
    reconstructionPass: boolean;
    anchorPass: boolean | null;
    pass: boolean;
  };
  failure?: {
    nextStep: number;
    name: string;
    message: string;
  };
}

export interface CausalRunExecution {
  result: CausalRunResult;
  regionSamples: CausalRegionSample[];
}

interface CandidateStep {
  formalCheckpoint: LbmCheckpoint;
  candidateCheckpoint: LbmCheckpoint;
  reconstruction: CompactReconstructionStepRecord | null;
  exchange: ReturnType<D2Q9MrtBrinkmanSolver["step"]>;
}

interface MutableFieldWindow {
  sampleCount: number;
  sumRho: Float64Array;
  sumRhoSquare: Float64Array;
  sumUx: Float64Array;
  sumUxSquare: Float64Array;
  sumUy: Float64Array;
  sumUySquare: Float64Array;
}

export interface StatisticalFieldWindow {
  sampleCount: number;
  meanRho: number[];
  meanUx: number[];
  meanUy: number[];
  densityFluctuationRms: number[];
  velocityFluctuationRms: number[];
  pressureFluctuationRms: number[];
  globalFluidDensityFluctuationRms: number;
  globalFluidVelocityFluctuationRms: number;
  globalFluidPressureFluctuationRms: number;
}

export interface StatisticalWindowResult {
  ordinal: number;
  lowerConvectiveTimeExclusive: number;
  upperConvectiveTimeInclusive: number;
  field: StatisticalFieldWindow | null;
  load: CoefficientSummary | null;
}

export interface StatisticalConsecutiveDrift {
  firstWindowOrdinal: number;
  secondWindowOrdinal: number;
  meanDragRelativeDrift: number | null;
  liftRmsRelativeDrift: number | null;
  liftRmsAbsoluteDrift: number | null;
  meanDensityFieldRmsDifference: number | null;
  meanVelocityFieldRmsDifferenceOverInletVelocity: number | null;
  densityFluctuationRmsRelativeDrift: number | null;
  velocityFluctuationRmsRelativeDrift: number | null;
  pressureFluctuationRmsRelativeDrift: number | null;
  gate: {
    meanDragPass: boolean;
    liftRmsPass: boolean;
    meanDensityFieldPass: boolean;
    meanVelocityFieldPass: boolean;
    fluctuationRmsPass: boolean;
    pass: boolean;
  };
}

export interface StatisticalRunResult {
  definition: FormalCausalReferenceDefinition;
  status: "completed" | "failed";
  completedSteps: number;
  stability: StabilityEnvelope | null;
  mask: number[];
  loadTrace: LoadSample[];
  windows: StatisticalWindowResult[];
  consecutiveDrifts: StatisticalConsecutiveDrift[];
  strouhal: {
    postWarmupLoadSamples: number;
    combinedLiftRms: number | null;
    candidate: number | null;
    normalizedAmplitude: number | null;
    coveredCycles: number | null;
    detectable: boolean;
  };
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
    windowsComplete: boolean;
    consecutiveWindowsPass: boolean;
    strouhalCoveragePass: boolean;
    pass: boolean;
  };
  failure?: {
    nextStep: number;
    name: string;
    message: string;
  };
}

function errorIdentity(error: unknown): { name: string; message: string } {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: "UnknownError", message: String(error) };
}

function createSolver(
  definition: FormalCausalReferenceDefinition,
): D2Q9MrtBrinkmanSolver {
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: definition.nx,
    ny: definition.ny,
    relaxationTime: definition.relaxationTime,
    penalizationTimeSteps: CONTRACT.commonNumerics.penalizationTimeSteps,
    maskHalfThickness: CONTRACT.commonNumerics.maskHalfThicknessCells,
    outerBoundary: CONTRACT.commonNumerics.outerBoundary,
  });
  solver.initializeUniform(CONTRACT.commonNumerics.inletVelocityLattice);
  return solver;
}

function executeCandidateStep(
  solver: D2Q9MrtBrinkmanSolver,
  body: LbmBodyKinematics | null,
  definition: FormalCausalReferenceDefinition,
  step: number,
): CandidateStep {
  const exchange = solver.step(
    body,
    CONTRACT.commonNumerics.inletVelocityLattice,
  );
  const formalCheckpoint = solver.checkpoint();
  let candidateCheckpoint = formalCheckpoint;
  let reconstruction: CompactReconstructionStepRecord | null = null;
  if (definition.strategy === "incoming-characteristic-compatible-zou-he") {
    candidateCheckpoint = cloneCheckpoint(formalCheckpoint);
    const rows = applyIncomingCharacteristicBoundary(
      candidateCheckpoint,
      definition.nx,
      definition.ny,
      CONTRACT.commonNumerics.inletVelocityLattice,
    );
    reconstruction = buildCompactReconstructionStep(step, rows);
    solver.restore(candidateCheckpoint);
  }
  return {
    formalCheckpoint,
    candidateCheckpoint,
    reconstruction,
    exchange,
  };
}

function extractCausalRegion(
  field: FieldCapture,
  definition: FormalCausalReferenceDefinition,
  step: number,
): CausalRegionSample {
  const diameter = definition.nominalDiameterCells;
  const xStart = Math.round(
    definition.bodyCenterX
      + CONTRACT.commonNumerics.cylinderRegion.minimumRelativeXDiameters
        * diameter,
  );
  const xEnd = Math.round(
    definition.bodyCenterX
      + CONTRACT.commonNumerics.cylinderRegion.maximumRelativeXDiameters
        * diameter,
  );
  const rho: number[] = [];
  const ux: number[] = [];
  const uy: number[] = [];
  for (let y = 0; y < definition.ny; y += 1) {
    for (let x = xStart; x <= xEnd; x += 1) {
      const cell = x + definition.nx * y;
      if ((field.mask[cell] ?? Number.NaN) >= 0.5) continue;
      rho.push(field.rho[cell] ?? Number.NaN);
      ux.push(field.ux[cell] ?? Number.NaN);
      uy.push(field.uy[cell] ?? Number.NaN);
    }
  }
  if (rho.length === 0
    || !rho.every(Number.isFinite)
    || !ux.every(Number.isFinite)
    || !uy.every(Number.isFinite)) {
    throw new RangeError("A8O invalid or empty causal comparison region");
  }
  return {
    step,
    rho: Float64Array.from(rho),
    ux: Float64Array.from(ux),
    uy: Float64Array.from(uy),
  };
}

function sameNumbers(
  actual: readonly number[],
  expected: readonly number[],
): boolean {
  return actual.length === expected.length
    && actual.every((value, index) =>
      Object.is(value, expected[index] ?? Number.NaN));
}

function compareA8nAnchor(
  actual: readonly CompactMassStepRecord[],
  expected: readonly A8nAnchorMassRecord[] | undefined,
): CausalAnchorComparison {
  if (expected === undefined) {
    return {
      applicable: false,
      checkedSteps: 0,
      expectedAvailableSteps: 0,
      exactMatch: null,
      firstMismatchStep: null,
    };
  }
  let firstMismatchStep: number | null = null;
  for (let index = 0; index < actual.length; index += 1) {
    const observed = actual[index];
    const anchor = expected[index];
    if (observed === undefined || anchor === undefined
      || observed.step !== anchor.step
      || !Object.is(
        observed.preFormalTotalMass,
        anchor.preCollisionTotalMass,
      )
      || !Object.is(
        observed.postFormalTotalMass,
        anchor.postFormalBoundaryMass,
      )
      || !Object.is(
        observed.postCandidateTotalMass,
        anchor.postCandidateAdapterTotalMass,
      )
      || !sameNumbers(
        observed.adapterByDirection,
        anchor.adapterByDirection,
      )
      || !sameNumbers(
        observed.adapterAbsoluteByDirection,
        anchor.adapterAbsoluteByDirection,
      )) {
      firstMismatchStep = index + 1;
      break;
    }
  }
  const exactMatch = expected.length >= actual.length
    && firstMismatchStep === null;
  return {
    applicable: true,
    checkedSteps: actual.length,
    expectedAvailableSteps: expected.length,
    exactMatch,
    firstMismatchStep,
  };
}

function alignedBoundaryFlux(
  definition: FormalCausalReferenceDefinition,
  records: readonly CompactMassStepRecord[],
): CausalRunResult["alignedBoundaryFlux"] {
  const length = definition.upstreamDiameters
    * definition.nominalDiameterCells;
  const u0 = CONTRACT.commonNumerics.inletVelocityLattice;
  const cs = CONTRACT.commonNumerics.latticeSoundSpeed;
  const startStep = Math.ceil(length / (cs - u0));
  const endStep = Math.floor(
    length / (cs - u0)
      + CONTRACT.causalReference.alignedBoundaryFlux
        .responseWindowConvectiveDuration
        * definition.nominalDiameterCells / u0,
  );
  let response = 0;
  for (const record of records) {
    if (record.step >= startStep && record.step <= endStep) {
      response += record.adapterTotal;
    }
  }
  return {
    startStep,
    endStep,
    signedAdapterMassPerBoundaryRow: response / definition.ny,
  };
}

export function runCausalReferenceCase(
  definition: FormalCausalReferenceDefinition,
  a8nAnchor?: readonly A8nAnchorMassRecord[],
): CausalRunExecution {
  const solver = createSolver(definition);
  const body = fixedBody(
    definition.bodyCenterX,
    definition.bodyCenterY,
    definition.bodyRadius,
  );
  const ledger = createCompactMassLedger(solver.checkpoint());
  const massStepRecords: CompactMassStepRecord[] = [];
  const reconstructionStepRecords: CompactReconstructionStepRecord[] = [];
  const loadTrace: LoadSample[] = [];
  const regionSamples: CausalRegionSample[] = [];
  const stability = emptyStabilityEnvelope();
  let before = captureField(solver.macroscopicCopies(body));
  let completedSteps = 0;
  let failure: CausalRunResult["failure"];
  try {
    for (let step = 1; step <= definition.runSteps; step += 1) {
      const preMass = ledger.finalTotalMass;
      const execution = executeCandidateStep(solver, body, definition, step);
      massStepRecords.push(recordCompactMassStep(
        step,
        "causal",
        preMass,
        execution.formalCheckpoint,
        execution.candidateCheckpoint,
        ledger,
      ));
      if (execution.reconstruction !== null) {
        reconstructionStepRecords.push(execution.reconstruction);
      }
      const after = captureField(solver.macroscopicCopies(body));
      updateStabilityEnvelope(stability, after, step);
      loadTrace.push(correctedLoadSample(
        step,
        execution.exchange,
        before,
        after,
        definition.nominalDiameterCells,
      ));
      if (step % definition.sampleStride === 0) {
        regionSamples.push(extractCausalRegion(after, definition, step));
      }
      before = after;
      completedSteps = step;
    }
  } catch (error) {
    failure = { nextStep: completedSteps + 1, ...errorIdentity(error) };
  }
  const massSummary = finishCompactMassLedger(ledger, definition.runSteps);
  const reconstructionSummary = finishCompactReconstruction(
    definition.strategy,
    reconstructionStepRecords,
    massSummary,
    definition.runSteps,
    definition.ny,
  );
  const anchorComparison = compareA8nAnchor(
    massStepRecords,
    a8nAnchor,
  );
  const executionPass = failure === undefined
    && completedSteps === definition.runSteps;
  const densityPass = completedSteps > 0
    && stability.maximumDensityDeviation
      <= CONTRACT.continuousStatistics.gates.maximumDensityDeviation;
  const machPass = completedSteps > 0
    && stability.maximumMach
      <= CONTRACT.continuousStatistics.gates.maximumMach;
  const anchorPass = anchorComparison.applicable
    ? anchorComparison.exactMatch
    : null;
  const pass = executionPass
    && densityPass
    && machPass
    && massSummary.gates.pass
    && reconstructionSummary.gates.pass
    && anchorPass !== false;
  return {
    result: {
      definition,
      status: executionPass ? "completed" : "failed",
      completedSteps,
      stability: completedSteps === 0 ? null : stability,
      loadTrace,
      massStepRecords,
      massSummary,
      reconstructionStepRecords,
      reconstructionSummary,
      alignedBoundaryFlux: alignedBoundaryFlux(definition, massStepRecords),
      anchorComparison,
      gate: {
        executionPass,
        densityPass,
        machPass,
        massPass: massSummary.gates.pass,
        reconstructionPass: reconstructionSummary.gates.pass,
        anchorPass,
        pass,
      },
      ...(failure === undefined ? {} : { failure }),
    },
    regionSamples,
  };
}

function createFieldWindow(cells: number): MutableFieldWindow {
  return {
    sampleCount: 0,
    sumRho: new Float64Array(cells),
    sumRhoSquare: new Float64Array(cells),
    sumUx: new Float64Array(cells),
    sumUxSquare: new Float64Array(cells),
    sumUy: new Float64Array(cells),
    sumUySquare: new Float64Array(cells),
  };
}

function addFieldSample(
  window: MutableFieldWindow,
  field: FieldCapture,
): void {
  window.sampleCount += 1;
  for (let cell = 0; cell < field.rho.length; cell += 1) {
    const rho = field.rho[cell] ?? Number.NaN;
    const ux = field.ux[cell] ?? Number.NaN;
    const uy = field.uy[cell] ?? Number.NaN;
    window.sumRho[cell] = (window.sumRho[cell] ?? 0) + rho;
    window.sumRhoSquare[cell] =
      (window.sumRhoSquare[cell] ?? 0) + rho * rho;
    window.sumUx[cell] = (window.sumUx[cell] ?? 0) + ux;
    window.sumUxSquare[cell] =
      (window.sumUxSquare[cell] ?? 0) + ux * ux;
    window.sumUy[cell] = (window.sumUy[cell] ?? 0) + uy;
    window.sumUySquare[cell] =
      (window.sumUySquare[cell] ?? 0) + uy * uy;
  }
}

function finishFieldWindow(
  window: MutableFieldWindow,
  mask: Float64Array,
): StatisticalFieldWindow | null {
  if (window.sampleCount === 0) return null;
  const meanRho: number[] = [];
  const meanUx: number[] = [];
  const meanUy: number[] = [];
  const densityFluctuationRms: number[] = [];
  const velocityFluctuationRms: number[] = [];
  const pressureFluctuationRms: number[] = [];
  const fluidDensity: number[] = [];
  const fluidVelocity: number[] = [];
  const fluidPressure: number[] = [];
  for (let cell = 0; cell < window.sumRho.length; cell += 1) {
    const rho = (window.sumRho[cell] ?? 0) / window.sampleCount;
    const ux = (window.sumUx[cell] ?? 0) / window.sampleCount;
    const uy = (window.sumUy[cell] ?? 0) / window.sampleCount;
    const rhoVariance = Math.max(
      0,
      (window.sumRhoSquare[cell] ?? 0) / window.sampleCount - rho * rho,
    );
    const uxVariance = Math.max(
      0,
      (window.sumUxSquare[cell] ?? 0) / window.sampleCount - ux * ux,
    );
    const uyVariance = Math.max(
      0,
      (window.sumUySquare[cell] ?? 0) / window.sampleCount - uy * uy,
    );
    const densityRms = Math.sqrt(rhoVariance);
    const velocityRms = Math.sqrt(uxVariance + uyVariance);
    const pressureRms = pressureProxy(1 + densityRms) - pressureProxy(1);
    meanRho.push(rho);
    meanUx.push(ux);
    meanUy.push(uy);
    densityFluctuationRms.push(densityRms);
    velocityFluctuationRms.push(velocityRms);
    pressureFluctuationRms.push(pressureRms);
    if ((mask[cell] ?? Number.NaN) < 0.5) {
      fluidDensity.push(densityRms);
      fluidVelocity.push(velocityRms);
      fluidPressure.push(pressureRms);
    }
  }
  return {
    sampleCount: window.sampleCount,
    meanRho,
    meanUx,
    meanUy,
    densityFluctuationRms,
    velocityFluctuationRms,
    pressureFluctuationRms,
    globalFluidDensityFluctuationRms: rms(fluidDensity),
    globalFluidVelocityFluctuationRms: rms(fluidVelocity),
    globalFluidPressureFluctuationRms: rms(fluidPressure),
  };
}

function fluidFieldDifference(
  first: StatisticalFieldWindow,
  second: StatisticalFieldWindow,
  mask: readonly number[],
): {
  densityRms: number;
  velocityRms: number;
} {
  let count = 0;
  let densitySquares = 0;
  let velocitySquares = 0;
  for (let cell = 0; cell < mask.length; cell += 1) {
    if ((mask[cell] ?? Number.NaN) >= 0.5) continue;
    const density = (second.meanRho[cell] ?? Number.NaN)
      - (first.meanRho[cell] ?? Number.NaN);
    const ux = (second.meanUx[cell] ?? Number.NaN)
      - (first.meanUx[cell] ?? Number.NaN);
    const uy = (second.meanUy[cell] ?? Number.NaN)
      - (first.meanUy[cell] ?? Number.NaN);
    densitySquares += density * density;
    velocitySquares += ux * ux + uy * uy;
    count += 1;
  }
  if (count === 0) {
    throw new RangeError("A8O statistical field comparison has no fluid cells");
  }
  return {
    densityRms: Math.sqrt(densitySquares / count),
    velocityRms: Math.sqrt(velocitySquares / count),
  };
}

function consecutiveDrift(
  first: StatisticalWindowResult,
  second: StatisticalWindowResult,
  mask: readonly number[],
): StatisticalConsecutiveDrift {
  const firstField = first.field;
  const secondField = second.field;
  const firstLoad = first.load;
  const secondLoad = second.load;
  const fieldDifference = firstField !== null && secondField !== null
    ? fluidFieldDifference(firstField, secondField, mask)
    : null;
  const meanDragRelativeDrift = firstLoad !== null && secondLoad !== null
    ? relativeDifference(firstLoad.meanDrag, secondLoad.meanDrag)
    : null;
  const liftRmsRelativeDrift = firstLoad !== null && secondLoad !== null
    ? relativeDifference(firstLoad.liftRms, secondLoad.liftRms)
    : null;
  const liftRmsAbsoluteDrift = firstLoad !== null && secondLoad !== null
    ? Math.abs(firstLoad.liftRms - secondLoad.liftRms)
    : null;
  const meanDensityFieldRmsDifference = fieldDifference?.densityRms ?? null;
  const meanVelocityFieldRmsDifferenceOverInletVelocity =
    fieldDifference === null
      ? null
      : fieldDifference.velocityRms
        / CONTRACT.commonNumerics.inletVelocityLattice;
  const densityFluctuationRmsRelativeDrift =
    firstField !== null && secondField !== null
    ? relativeDifference(
      firstField.globalFluidDensityFluctuationRms,
      secondField.globalFluidDensityFluctuationRms,
      CONTRACT.operationalDefinitions.statistics
        .fluctuationRmsRelativeDriftDenominatorFloor,
    )
    : null;
  const velocityFluctuationRmsRelativeDrift =
    firstField !== null && secondField !== null
    ? relativeDifference(
      firstField.globalFluidVelocityFluctuationRms,
      secondField.globalFluidVelocityFluctuationRms,
      CONTRACT.operationalDefinitions.statistics
        .fluctuationRmsRelativeDriftDenominatorFloor,
    )
    : null;
  const pressureFluctuationRmsRelativeDrift =
    firstField !== null && secondField !== null
    ? relativeDifference(
      firstField.globalFluidPressureFluctuationRms,
      secondField.globalFluidPressureFluctuationRms,
      CONTRACT.operationalDefinitions.statistics
        .fluctuationRmsRelativeDriftDenominatorFloor,
    )
    : null;
  const gates = CONTRACT.continuousStatistics.gates;
  const meanDragPass = meanDragRelativeDrift !== null
    && meanDragRelativeDrift
      <= gates.maximumConsecutiveWindowMeanDragRelativeDrift;
  let liftRmsPass = false;
  if (firstLoad !== null && secondLoad !== null) {
    const detectable = Math.max(firstLoad.liftRms, secondLoad.liftRms)
      >= gates.detectableLiftRms;
    liftRmsPass = detectable
      ? (liftRmsRelativeDrift ?? Number.POSITIVE_INFINITY)
        <= gates.maximumConsecutiveWindowLiftRmsRelativeDrift
      : (liftRmsAbsoluteDrift ?? Number.POSITIVE_INFINITY)
        <= gates.maximumUndetectableLiftRmsAbsoluteDrift;
  }
  const meanDensityFieldPass = meanDensityFieldRmsDifference !== null
    && meanDensityFieldRmsDifference
      <= gates.maximumConsecutiveMeanDensityFieldRmsDifference;
  const meanVelocityFieldPass =
    meanVelocityFieldRmsDifferenceOverInletVelocity !== null
    && meanVelocityFieldRmsDifferenceOverInletVelocity
      <= gates.maximumConsecutiveMeanVelocityFieldRmsDifferenceOverInletVelocity;
  const fluctuationRmsPass = densityFluctuationRmsRelativeDrift !== null
    && velocityFluctuationRmsRelativeDrift !== null
    && pressureFluctuationRmsRelativeDrift !== null
    && densityFluctuationRmsRelativeDrift
      <= gates.maximumConsecutiveFluctuationRmsRelativeDrift
    && velocityFluctuationRmsRelativeDrift
      <= gates.maximumConsecutiveFluctuationRmsRelativeDrift
    && pressureFluctuationRmsRelativeDrift
      <= gates.maximumConsecutiveFluctuationRmsRelativeDrift;
  return {
    firstWindowOrdinal: first.ordinal,
    secondWindowOrdinal: second.ordinal,
    meanDragRelativeDrift,
    liftRmsRelativeDrift,
    liftRmsAbsoluteDrift,
    meanDensityFieldRmsDifference,
    meanVelocityFieldRmsDifferenceOverInletVelocity,
    densityFluctuationRmsRelativeDrift,
    velocityFluctuationRmsRelativeDrift,
    pressureFluctuationRmsRelativeDrift,
    gate: {
      meanDragPass,
      liftRmsPass,
      meanDensityFieldPass,
      meanVelocityFieldPass,
      fluctuationRmsPass,
      pass: meanDragPass
        && liftRmsPass
        && meanDensityFieldPass
        && meanVelocityFieldPass
        && fluctuationRmsPass,
    },
  };
}

export function runStatisticalReferenceCase(
  definition: FormalCausalReferenceDefinition,
): StatisticalRunResult {
  const solver = createSolver(definition);
  const body = fixedBody(
    definition.bodyCenterX,
    definition.bodyCenterY,
    definition.bodyRadius,
  );
  const ledger = createCompactMassLedger(solver.checkpoint());
  const massStepRecords: CompactMassStepRecord[] = [];
  const reconstructionStepRecords: CompactReconstructionStepRecord[] = [];
  const loadTrace: LoadSample[] = [];
  const windowFields = [
    createFieldWindow(definition.nx * definition.ny),
    createFieldWindow(definition.nx * definition.ny),
    createFieldWindow(definition.nx * definition.ny),
  ];
  const windowLoads: LoadSample[][] = [[], [], []];
  const stability = emptyStabilityEnvelope();
  let before = captureField(solver.macroscopicCopies(body));
  const mask = Array.from(before.mask);
  let completedSteps = 0;
  let failure: StatisticalRunResult["failure"];
  const u0 = CONTRACT.commonNumerics.inletVelocityLattice;
  const diameter = definition.nominalDiameterCells;
  const warmup = CONTRACT.continuousStatistics.warmupConvectiveDuration;
  const duration = CONTRACT.continuousStatistics.windowConvectiveDuration;
  try {
    for (let step = 1; step <= definition.runSteps; step += 1) {
      const preMass = ledger.finalTotalMass;
      const execution = executeCandidateStep(solver, body, definition, step);
      massStepRecords.push(recordCompactMassStep(
        step,
        "statistics",
        preMass,
        execution.formalCheckpoint,
        execution.candidateCheckpoint,
        ledger,
      ));
      if (execution.reconstruction !== null) {
        reconstructionStepRecords.push(execution.reconstruction);
      }
      const after = captureField(solver.macroscopicCopies(body));
      updateStabilityEnvelope(stability, after, step);
      const load = correctedLoadSample(
        step,
        execution.exchange,
        before,
        after,
        definition.nominalDiameterCells,
      );
      loadTrace.push(load);
      const convectiveTime = step * u0 / diameter;
      for (let ordinal = 0; ordinal < 3; ordinal += 1) {
        const lower = warmup + ordinal * duration;
        const upper = lower + duration;
        if (convectiveTime > lower && convectiveTime <= upper) {
          windowLoads[ordinal]?.push(load);
          if (step % definition.sampleStride === 0) {
            const window = windowFields[ordinal];
            if (window === undefined) {
              throw new Error("A8O missing statistical field window");
            }
            addFieldSample(window, after);
          }
        }
      }
      before = after;
      completedSteps = step;
    }
  } catch (error) {
    failure = { nextStep: completedSteps + 1, ...errorIdentity(error) };
  }
  const windows: StatisticalWindowResult[] = windowFields.map(
    (fieldWindow, index) => {
      const lower = warmup + index * duration;
      const loads = windowLoads[index] ?? [];
      return {
        ordinal: index + 1,
        lowerConvectiveTimeExclusive: lower,
        upperConvectiveTimeInclusive: lower + duration,
        field: finishFieldWindow(fieldWindow, before.mask),
        load: loads.length === 0 ? null : summarizeCoefficients(loads),
      };
    },
  );
  const consecutiveDrifts: StatisticalConsecutiveDrift[] = [];
  const first = windows[0];
  const second = windows[1];
  const third = windows[2];
  if (first !== undefined && second !== undefined) {
    consecutiveDrifts.push(consecutiveDrift(first, second, mask));
  }
  if (second !== undefined && third !== undefined) {
    consecutiveDrifts.push(consecutiveDrift(second, third, mask));
  }
  const postWarmupLoads = loadTrace.filter((sample) =>
    sample.step * u0 / diameter > warmup);
  const combinedLoad = postWarmupLoads.length === 0
    ? null
    : summarizeCoefficients(postWarmupLoads);
  const spectral = postWarmupLoads.length === 0
    ? null
    : dominantStrouhal(
      postWarmupLoads.map((sample) => sample.lift),
      u0 / diameter,
    );
  const coveredCycles = spectral === null
    ? null
    : spectral.strouhal
      * (
        CONTRACT.continuousStatistics.totalConvectiveDuration
        - CONTRACT.continuousStatistics.warmupConvectiveDuration
      );
  const liftDetectable = combinedLoad !== null
    && combinedLoad.liftRms
      >= CONTRACT.continuousStatistics.gates.detectableLiftRms;
  const strouhalDetectable = liftDetectable
    && coveredCycles !== null
    && coveredCycles
      >= CONTRACT.continuousStatistics.gates
        .minimumDetectableCyclesInStatisticsWindow;
  const massSummary = finishCompactMassLedger(ledger, definition.runSteps);
  const reconstructionSummary = finishCompactReconstruction(
    definition.strategy,
    reconstructionStepRecords,
    massSummary,
    definition.runSteps,
    definition.ny,
  );
  const executionPass = failure === undefined
    && completedSteps === definition.runSteps;
  const densityPass = completedSteps > 0
    && stability.maximumDensityDeviation
      <= CONTRACT.continuousStatistics.gates.maximumDensityDeviation;
  const machPass = completedSteps > 0
    && stability.maximumMach
      <= CONTRACT.continuousStatistics.gates.maximumMach;
  const expectedFieldSamples = Math.round(
    duration * diameter / u0 / definition.sampleStride,
  );
  const expectedLoadSamples = Math.round(duration * diameter / u0);
  const windowsComplete = windows.length === 3
    && windows.every((window) =>
      window.field?.sampleCount === expectedFieldSamples
      && window.load?.samples === expectedLoadSamples);
  const consecutiveWindowsPass = consecutiveDrifts.length === 2
    && consecutiveDrifts.every((entry) => entry.gate.pass);
  const strouhalCoveragePass = !liftDetectable || strouhalDetectable;
  const pass = executionPass
    && densityPass
    && machPass
    && massSummary.gates.pass
    && reconstructionSummary.gates.pass
    && windowsComplete
    && consecutiveWindowsPass
    && strouhalCoveragePass;
  return {
    definition,
    status: executionPass ? "completed" : "failed",
    completedSteps,
    stability: completedSteps === 0 ? null : stability,
    mask,
    loadTrace,
    windows,
    consecutiveDrifts,
    strouhal: {
      postWarmupLoadSamples: postWarmupLoads.length,
      combinedLiftRms: combinedLoad?.liftRms ?? null,
      candidate: spectral?.strouhal ?? null,
      normalizedAmplitude: spectral?.normalizedAmplitude ?? null,
      coveredCycles,
      detectable: strouhalDetectable,
    },
    massStepRecords,
    massSummary,
    reconstructionStepRecords,
    reconstructionSummary,
    gate: {
      executionPass,
      densityPass,
      machPass,
      massPass: massSummary.gates.pass,
      reconstructionPass: reconstructionSummary.gates.pass,
      windowsComplete,
      consecutiveWindowsPass,
      strouhalCoveragePass,
      pass,
    },
    ...(failure === undefined ? {} : { failure }),
  };
}
