import {
  D2Q9MrtBrinkmanSolver,
  type BrinkmanStepExchange,
  type LbmBodyKinematics,
  type LbmCheckpoint,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { applyIncomingCharacteristicBoundary } from
  "./formal-incoming-characteristic-boundary.ts";
import {
  FORMAL_DISCRETE_REFERENCE_CONTRACT as CONTRACT,
  type FormalDiscreteReferenceDefinition,
  type FormalMaturityDefinition,
} from "./formal-discrete-reference-contract.ts";
import {
  captureField,
  cloneCheckpoint,
  correctedLoadSample,
  emptyStabilityEnvelope,
  fixedBody,
  updateStabilityEnvelope,
  type FieldCapture,
  type LoadSample,
  type StabilityEnvelope,
} from "./formal-causal-reference-support.ts";
import {
  addWindowFieldSample,
  buildPopulationAuditRecord,
  buildRegionLayout,
  createWindowField,
  extractRegionSample,
  finishWindowField,
  isPopulationAuditStep,
  summarizeLoadWindow,
  summarizePopulationAudits,
  type LoadWindowSummary,
  type PopulationAuditRecord,
  type PopulationAuditSummary,
  type RegionFieldSample,
  type RegionLayout,
  type WindowFieldSummary,
} from "./formal-discrete-reference-support.ts";

export interface DiscreteReferenceSampleIdentity {
  step: number;
  leftGraphDistance: number;
  rightGraphDistance: number;
  transverseSeamGraphDistance: number;
  strictConePass: boolean;
  comparedCellCount: number;
  fieldDigestFnv1a32: string;
  rawReactionX: number;
  rawReactionY: number;
}

export interface DiscreteReferenceRunResult {
  definition: FormalDiscreteReferenceDefinition;
  status: "completed" | "failed";
  completedSteps: number;
  trajectoryCompleteAndFinite: boolean;
  internalLedgerGatePass: boolean;
  stability: StabilityEnvelope | null;
  sampleIdentities: DiscreteReferenceSampleIdentity[];
  populationAuditRecords: PopulationAuditRecord[];
  populationAuditSummary: PopulationAuditSummary;
  gate: {
    executionPass: boolean;
    densityPass: boolean;
    machPass: boolean;
    sampleCountPass: boolean;
    strictConePass: boolean;
    internalLedgerPass: boolean;
    pass: boolean;
  };
  failure?: {
    nextStep: number;
    name: string;
    message: string;
  };
}

export interface DiscreteReferenceRunExecution {
  result: DiscreteReferenceRunResult;
  layout: RegionLayout;
  samples: RegionFieldSample[];
}

export interface MaturityWindowResult {
  tierConvectiveTime: number;
  lowerConvectiveTimeExclusive: number;
  upperConvectiveTimeInclusive: number;
  expectedFieldSamples: number;
  expectedLoadSamples: number;
  field: WindowFieldSummary;
  load: LoadWindowSummary;
}

export interface MaturityRunResult {
  definition: FormalMaturityDefinition;
  status: "completed" | "failed";
  completedSteps: number;
  trajectoryCompleteAndFinite: boolean;
  internalLedgerGatePass: boolean;
  stability: StabilityEnvelope | null;
  windows: MaturityWindowResult[];
  populationAuditRecords: PopulationAuditRecord[];
  populationAuditSummary: PopulationAuditSummary;
  gate: {
    executionPass: boolean;
    densityPass: boolean;
    machPass: boolean;
    durationTiersComplete: boolean;
    internalLedgerPass: boolean;
    pass: boolean;
  };
  failure?: {
    nextStep: number;
    name: string;
    message: string;
  };
}

interface CandidateStep {
  exchange: BrinkmanStepExchange;
  formalCheckpoint?: LbmCheckpoint;
  candidateCheckpoint?: LbmCheckpoint;
}

function errorIdentity(error: unknown): { name: string; message: string } {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: "UnknownError", message: String(error) };
}

function createSolver(
  definition: FormalDiscreteReferenceDefinition | FormalMaturityDefinition,
): D2Q9MrtBrinkmanSolver {
  return new D2Q9MrtBrinkmanSolver({
    nx: definition.nx,
    ny: definition.ny,
    relaxationTime: definition.relaxationTime,
    penalizationTimeSteps: CONTRACT.commonNumerics.penalizationTimeSteps,
    maskHalfThickness: CONTRACT.commonNumerics.maskHalfThicknessCells,
    outerBoundary: CONTRACT.commonNumerics.outerBoundary,
  });
}

function periodicDistance(value: number, center: number, size: number): number {
  const raw = Math.abs(value - center);
  return Math.min(raw, size - raw);
}

function initializeDiscreteReference(
  solver: D2Q9MrtBrinkmanSolver,
  definition: FormalDiscreteReferenceDefinition,
): void {
  const u0 = CONTRACT.commonNumerics.inletVelocityLattice;
  if (definition.family === "fixed-body-uniform-start") {
    solver.initializeUniform(u0);
    return;
  }
  const pulse = CONTRACT.discreteReference.localizedPulse;
  const diameter = definition.nominalDiameterCells;
  const centerX = definition.bodyCenterX
    + pulse.centerRelativeXDiameters * diameter;
  const centerY = definition.bodyCenterY;
  const sigma = pulse.sigmaDiameters * diameter;
  solver.initializeField((x, y) => {
    const dx = x - centerX;
    const dy = periodicDistance(y, centerY, definition.ny);
    const envelope = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    return {
      rho: 1 + pulse.densityAmplitude * envelope,
      ux: u0,
      uy: 0,
    };
  });
}

function initializeMaturity(
  solver: D2Q9MrtBrinkmanSolver,
  definition: FormalMaturityDefinition,
): void {
  const u0 = CONTRACT.commonNumerics.inletVelocityLattice;
  const seed = CONTRACT.maturity.antisymmetricSeed;
  const diameter = definition.nominalDiameterCells;
  const centerX = definition.bodyCenterX
    + seed.centerRelativeXDiameters * diameter;
  const centerY = definition.bodyCenterY;
  const sigmaX = seed.sigmaXDiameters * diameter;
  const sigmaY = seed.sigmaYDiameters * diameter;
  solver.initializeField((x, y) => {
    const dx = x - centerX;
    const dy = periodicDistance(y, centerY, definition.ny);
    const exponent = -0.5 * (
      dx * dx / (sigmaX * sigmaX)
      + dy * dy / (sigmaY * sigmaY)
    );
    return {
      rho: 1,
      ux: u0,
      uy: definition.seedAmplitude * Math.exp(exponent),
    };
  });
}

function referenceBody(
  definition: FormalDiscreteReferenceDefinition,
): LbmBodyKinematics | null {
  return definition.family === "fixed-body-uniform-start"
    ? fixedBody(
      definition.bodyCenterX,
      definition.bodyCenterY,
      definition.bodyRadius,
    )
    : null;
}

function executeStep(
  solver: D2Q9MrtBrinkmanSolver,
  body: LbmBodyKinematics | null,
  strategy: FormalDiscreteReferenceDefinition["strategy"]
    | FormalMaturityDefinition["strategy"],
  needsAudit: boolean,
  nx: number,
  ny: number,
): CandidateStep {
  const exchange = solver.step(
    body,
    CONTRACT.commonNumerics.inletVelocityLattice,
  );
  const needsCheckpoint = needsAudit
    || strategy === "incoming-characteristic-compatible-zou-he";
  if (!needsCheckpoint) return { exchange };
  const formalCheckpoint = solver.checkpoint();
  let candidateCheckpoint = formalCheckpoint;
  if (strategy === "incoming-characteristic-compatible-zou-he") {
    candidateCheckpoint = cloneCheckpoint(formalCheckpoint);
    applyIncomingCharacteristicBoundary(
      candidateCheckpoint,
      nx,
      ny,
      CONTRACT.commonNumerics.inletVelocityLattice,
    );
    solver.restore(candidateCheckpoint);
  }
  return { exchange, formalCheckpoint, candidateCheckpoint };
}

function stabilityGates(stability: StabilityEnvelope | null): {
  densityPass: boolean;
  machPass: boolean;
} {
  if (stability === null) return { densityPass: false, machPass: false };
  return {
    densityPass: stability.maximumDensityDeviation
      <= CONTRACT.maturity.stabilityGates.maximumDensityDeviation,
    machPass: stability.maximumMach
      <= CONTRACT.maturity.stabilityGates.maximumMach,
  };
}

export function runDiscreteReferenceCase(
  definition: FormalDiscreteReferenceDefinition,
): DiscreteReferenceRunExecution {
  const solver = createSolver(definition);
  initializeDiscreteReference(solver, definition);
  const body = referenceBody(definition);
  const initialField = captureField(solver.macroscopicCopies(body));
  const layout = buildRegionLayout(
    initialField,
    definition.nx,
    definition.ny,
    definition.bodyCenterX,
    definition.bodyCenterY,
    definition.nominalDiameterCells,
  );
  const samples: RegionFieldSample[] = [];
  const populationAuditRecords: PopulationAuditRecord[] = [];
  const stability = emptyStabilityEnvelope();
  let completedSteps = 0;
  let failure: DiscreteReferenceRunResult["failure"];
  try {
    for (let step = 1; step <= definition.runSteps; step += 1) {
      const audit = isPopulationAuditStep(
        step,
        definition.runSteps,
        definition.sampleStride,
      );
      const preCheckpoint = audit ? solver.checkpoint() : undefined;
      const execution = executeStep(
        solver,
        body,
        definition.strategy,
        audit,
        definition.nx,
        definition.ny,
      );
      if (audit) {
        if (preCheckpoint === undefined
          || execution.formalCheckpoint === undefined
          || execution.candidateCheckpoint === undefined) {
          throw new Error("A8P missing scheduled population checkpoint");
        }
        populationAuditRecords.push(buildPopulationAuditRecord(
          step,
          "discrete-reference",
          preCheckpoint,
          execution.formalCheckpoint,
          execution.candidateCheckpoint,
        ));
      }
      if (step % definition.sampleStride === 0) {
        const field = captureField(solver.macroscopicCopies(body));
        updateStabilityEnvelope(stability, field, step);
        samples.push(extractRegionSample(
          field,
          layout,
          step,
          execution.exchange.rawReactionImpulseX,
          execution.exchange.rawReactionImpulseY,
        ));
      }
      completedSteps = step;
    }
  } catch (error) {
    failure = { nextStep: completedSteps + 1, ...errorIdentity(error) };
  }
  const populationAuditSummary = summarizePopulationAudits(
    populationAuditRecords,
    definition.runSteps,
    definition.sampleStride,
  );
  const executionPass = failure === undefined
    && completedSteps === definition.runSteps;
  const trajectoryCompleteAndFinite = executionPass
    && samples.every((sample) =>
      sample.rho.every(Number.isFinite)
      && sample.ux.every(Number.isFinite)
      && sample.uy.every(Number.isFinite));
  const internalLedgerGatePass = populationAuditSummary.gates.pass;
  const gates = stabilityGates(samples.length === 0 ? null : stability);
  const sampleCountPass = samples.length
    === definition.runSteps / definition.sampleStride;
  const strictConePass = sampleCountPass
    && samples.every((sample) => sample.strictConePass);
  const pass = trajectoryCompleteAndFinite
    && gates.densityPass
    && gates.machPass
    && sampleCountPass
    && strictConePass
    && internalLedgerGatePass;
  return {
    layout,
    samples,
    result: {
      definition,
      status: executionPass ? "completed" : "failed",
      completedSteps,
      trajectoryCompleteAndFinite,
      internalLedgerGatePass,
      stability: samples.length === 0 ? null : stability,
      sampleIdentities: samples.map((sample) => ({
        step: sample.step,
        leftGraphDistance: sample.leftGraphDistance,
        rightGraphDistance: sample.rightGraphDistance,
        transverseSeamGraphDistance: sample.transverseSeamGraphDistance,
        strictConePass: sample.strictConePass,
        comparedCellCount: sample.rho.length,
        fieldDigestFnv1a32: sample.fieldDigestFnv1a32,
        rawReactionX: sample.rawReactionX,
        rawReactionY: sample.rawReactionY,
      })),
      populationAuditRecords,
      populationAuditSummary,
      gate: {
        executionPass,
        densityPass: gates.densityPass,
        machPass: gates.machPass,
        sampleCountPass,
        strictConePass,
        internalLedgerPass: internalLedgerGatePass,
        pass,
      },
      ...(failure === undefined ? {} : { failure }),
    },
  };
}

function tierStep(
  convectiveTime: number,
  definition: FormalMaturityDefinition,
): number {
  return Math.round(
    convectiveTime * definition.nominalDiameterCells
      / CONTRACT.commonNumerics.inletVelocityLattice,
  );
}

function windowOrdinalForStep(
  step: number,
  definition: FormalMaturityDefinition,
): number | null {
  for (
    let ordinal = 0;
    ordinal < CONTRACT.maturity.durationTiersConvective.length;
    ordinal += 1
  ) {
    const tier = CONTRACT.maturity.durationTiersConvective[ordinal]
      ?? Number.NaN;
    const lower = tier - CONTRACT.maturity.analysisWindowConvectiveDuration;
    if (step > tierStep(lower, definition)
      && step <= tierStep(tier, definition)) {
      return ordinal;
    }
  }
  return null;
}

export function runMaturityCase(
  definition: FormalMaturityDefinition,
): MaturityRunResult {
  const solver = createSolver(definition);
  initializeMaturity(solver, definition);
  const body = fixedBody(
    definition.bodyCenterX,
    definition.bodyCenterY,
    definition.bodyRadius,
  );
  let before = captureField(solver.macroscopicCopies(body));
  const layout = buildRegionLayout(
    before,
    definition.nx,
    definition.ny,
    definition.bodyCenterX,
    definition.bodyCenterY,
    definition.nominalDiameterCells,
  );
  const fieldWindows = CONTRACT.maturity.durationTiersConvective.map(() =>
    createWindowField(layout));
  const loadWindows: LoadSample[][] =
    CONTRACT.maturity.durationTiersConvective.map(() => []);
  const populationAuditRecords: PopulationAuditRecord[] = [];
  const stability = emptyStabilityEnvelope();
  let completedSteps = 0;
  let failure: MaturityRunResult["failure"];
  try {
    for (let step = 1; step <= definition.runSteps; step += 1) {
      const audit = isPopulationAuditStep(
        step,
        definition.runSteps,
        definition.sampleStride,
      );
      const preCheckpoint = audit ? solver.checkpoint() : undefined;
      const execution = executeStep(
        solver,
        body,
        definition.strategy,
        audit,
        definition.nx,
        definition.ny,
      );
      if (audit) {
        if (preCheckpoint === undefined
          || execution.formalCheckpoint === undefined
          || execution.candidateCheckpoint === undefined) {
          throw new Error("A8P missing maturity population checkpoint");
        }
        populationAuditRecords.push(buildPopulationAuditRecord(
          step,
          "maturity",
          preCheckpoint,
          execution.formalCheckpoint,
          execution.candidateCheckpoint,
        ));
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
      const ordinal = windowOrdinalForStep(step, definition);
      if (ordinal !== null) {
        const loads = loadWindows[ordinal];
        if (loads === undefined) throw new Error("A8P missing load window");
        loads.push(load);
        if (step % definition.sampleStride === 0) {
          const fields = fieldWindows[ordinal];
          if (fields === undefined) throw new Error("A8P missing field window");
          addWindowFieldSample(fields, after);
        }
      }
      before = after;
      completedSteps = step;
    }
  } catch (error) {
    failure = { nextStep: completedSteps + 1, ...errorIdentity(error) };
  }
  const windows: MaturityWindowResult[] = [];
  for (
    let ordinal = 0;
    ordinal < CONTRACT.maturity.durationTiersConvective.length;
    ordinal += 1
  ) {
    const tier = CONTRACT.maturity.durationTiersConvective[ordinal]
      ?? Number.NaN;
    const lower = tier - CONTRACT.maturity.analysisWindowConvectiveDuration;
    const fields = fieldWindows[ordinal];
    const loads = loadWindows[ordinal];
    if (fields === undefined || loads === undefined
      || fields.sampleCount === 0 || loads.length === 0) {
      continue;
    }
    windows.push({
      tierConvectiveTime: tier,
      lowerConvectiveTimeExclusive: lower,
      upperConvectiveTimeInclusive: tier,
      expectedFieldSamples: Math.round(
        CONTRACT.maturity.analysisWindowConvectiveDuration
          * definition.nominalDiameterCells
          / CONTRACT.commonNumerics.inletVelocityLattice
          / definition.sampleStride,
      ),
      expectedLoadSamples: tierStep(
        CONTRACT.maturity.analysisWindowConvectiveDuration,
        definition,
      ),
      field: finishWindowField(fields),
      load: summarizeLoadWindow(
        loads,
        CONTRACT.commonNumerics.inletVelocityLattice
          / definition.nominalDiameterCells,
      ),
    });
  }
  const populationAuditSummary = summarizePopulationAudits(
    populationAuditRecords,
    definition.runSteps,
    definition.sampleStride,
  );
  const executionPass = failure === undefined
    && completedSteps === definition.runSteps;
  const trajectoryCompleteAndFinite = executionPass
    && windows.every((window) => [
      window.field.mirrorDefectRms,
      window.load.meanDrag,
      window.load.liftRms,
      window.load.dominantStrouhal,
    ].every(Number.isFinite));
  const gates = stabilityGates(completedSteps === 0 ? null : stability);
  const durationTiersComplete = windows.length
    === CONTRACT.maturity.durationTiersConvective.length
    && windows.every((window) =>
      window.field.sampleCount === window.expectedFieldSamples
      && window.load.sampleCount === window.expectedLoadSamples);
  const internalLedgerGatePass = populationAuditSummary.gates.pass;
  const pass = trajectoryCompleteAndFinite
    && gates.densityPass
    && gates.machPass
    && durationTiersComplete
    && internalLedgerGatePass;
  return {
    definition,
    status: executionPass ? "completed" : "failed",
    completedSteps,
    trajectoryCompleteAndFinite,
    internalLedgerGatePass,
    stability: completedSteps === 0 ? null : stability,
    windows,
    populationAuditRecords,
    populationAuditSummary,
    gate: {
      executionPass,
      densityPass: gates.densityPass,
      machPass: gates.machPass,
      durationTiersComplete,
      internalLedgerPass: internalLedgerGatePass,
      pass,
    },
    ...(failure === undefined ? {} : { failure }),
  };
}
