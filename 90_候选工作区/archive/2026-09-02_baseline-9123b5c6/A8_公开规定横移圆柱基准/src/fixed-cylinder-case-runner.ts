import {
  D2Q9MrtBrinkmanSolver,
  LATTICE_SOUND_SPEED,
  type LbmBodyKinematics,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm";
import {
  FIXED_TARGET,
  REYNOLDS,
} from "./benchmark-contract.ts";
import {
  dominantStrouhal,
  summarizeCoefficients,
  type CoefficientSample,
  type CoefficientSummary,
} from "./benchmark-metrics.ts";
import {
  BASELINE_PHASE_OFFSET_Y,
  literatureErrorScore,
  relativeDifference,
  type FixedSensitivityVariant,
} from "./fixed-sensitivity-contract.ts";
import {
  resolveFixedCylinderGeometry,
  type ResolvedFixedCylinderGeometry,
} from "./fixed-cylinder-geometry.ts";

export interface FixedCylinderCaseDefinition extends FixedSensitivityVariant {
  diameterCells: number;
  latticeVelocity: number;
  fixedConvectiveDuration: number;
  discardConvectiveTime: number;
  domainLengthDiameters?: number;
  domainWidthDiameters?: number;
  upstreamDiameters?: number;
}

export interface FixedCylinderRunExtrema {
  minimumDensity: number;
  maximumDensity: number;
  maximumSpeed: number;
  maximumMach: number;
  maximumDensityDeviation: number;
}

export interface FixedCylinderLiteratureComparison {
  meanDragError: number;
  liftRmsError: number;
  strouhalError: number;
  meanDragPassed: boolean;
  liftRmsPassed: boolean;
  strouhalPassed: boolean;
  passed: boolean;
}

export interface FixedCylinderCaseResult {
  definition: FixedCylinderCaseDefinition;
  numericalIdentity: {
    diameterCells: number;
    nx: number;
    ny: number;
    latticeVelocity: number;
    nominalLatticeMach: number;
    relaxationTime: number;
    penalizationTimeSteps: number;
    etaHat: number;
    maskHalfThickness: number;
    outerBoundary: "open-periodic-crossflow";
    domainLengthDiameters: number;
    domainWidthDiameters: number;
    upstreamDiameters: number;
    downstreamDiameters: number;
  };
  body: LbmBodyKinematics;
  window: {
    fixedConvectiveDuration: number;
    discardConvectiveTime: number;
    samples: number;
  };
  metrics: CoefficientSummary & {
    strouhal: number;
    spectralLiftAmplitude: number;
  };
  firstHalf: CoefficientSummary;
  secondHalf: CoefficientSummary;
  maturity: {
    meanDragHalfDrift: number;
    liftRmsHalfDrift: number;
    passed: boolean;
  };
  literature: FixedCylinderLiteratureComparison;
  literatureErrorScore: number;
  extrema: FixedCylinderRunExtrema;
}

interface FieldSnapshot {
  fictitiousMomentumX: number;
  fictitiousMomentumY: number;
  minimumDensity: number;
  maximumDensity: number;
  maximumSpeed: number;
}

function createSolver(
  definition: FixedCylinderCaseDefinition,
  geometry: ResolvedFixedCylinderGeometry,
): D2Q9MrtBrinkmanSolver {
  const relaxationTime = 0.5
    + 3 * definition.latticeVelocity * definition.diameterCells / REYNOLDS;
  const penalizationTimeSteps = definition.etaHat
    * definition.diameterCells
    / definition.latticeVelocity;
  const solver = new D2Q9MrtBrinkmanSolver({
    nx: geometry.nx,
    ny: geometry.ny,
    relaxationTime,
    penalizationTimeSteps,
    outerBoundary: "open-periodic-crossflow",
    maskHalfThickness: definition.maskHalfThickness,
  });
  solver.initializeUniform(definition.latticeVelocity, 0);
  return solver;
}

function fixedBody(
  solver: D2Q9MrtBrinkmanSolver,
  definition: FixedCylinderCaseDefinition,
  geometry: ResolvedFixedCylinderGeometry,
): LbmBodyKinematics {
  return {
    centerX: geometry.upstreamDiameters * definition.diameterCells
      + definition.phaseOffsetX,
    centerY: 0.5 * (solver.ny - 1)
      + BASELINE_PHASE_OFFSET_Y
      + definition.phaseOffsetY,
    radius: 0.5 * definition.diameterCells,
    velocityX: 0,
    velocityY: 0,
  };
}

function captureField(
  solver: D2Q9MrtBrinkmanSolver,
  body: LbmBodyKinematics,
): FieldSnapshot {
  const fields = solver.macroscopicCopies(body);
  let fictitiousMomentumX = 0;
  let fictitiousMomentumY = 0;
  let minimumDensity = Number.POSITIVE_INFINITY;
  let maximumDensity = Number.NEGATIVE_INFINITY;
  let maximumSpeed = 0;
  for (let cell = 0; cell < fields.rho.length; cell += 1) {
    const density = fields.rho[cell] ?? Number.NaN;
    const velocityX = fields.ux[cell] ?? Number.NaN;
    const velocityY = fields.uy[cell] ?? Number.NaN;
    const mask = fields.mask[cell] ?? Number.NaN;
    if (!(density > 0) || !Number.isFinite(density)
      || !Number.isFinite(velocityX) || !Number.isFinite(velocityY)
      || !Number.isFinite(mask) || mask < -1e-12 || mask > 1 + 1e-12) {
      throw new RangeError(`invalid macroscopic field at cell ${cell}`);
    }
    fictitiousMomentumX += mask * density * velocityX;
    fictitiousMomentumY += mask * density * velocityY;
    minimumDensity = Math.min(minimumDensity, density);
    maximumDensity = Math.max(maximumDensity, density);
    maximumSpeed = Math.max(maximumSpeed, Math.hypot(velocityX, velocityY));
  }
  return {
    fictitiousMomentumX,
    fictitiousMomentumY,
    minimumDensity,
    maximumDensity,
    maximumSpeed,
  };
}

function includeExtrema(
  extrema: FixedCylinderRunExtrema,
  snapshot: FieldSnapshot,
): void {
  extrema.minimumDensity = Math.min(extrema.minimumDensity, snapshot.minimumDensity);
  extrema.maximumDensity = Math.max(extrema.maximumDensity, snapshot.maximumDensity);
  extrema.maximumSpeed = Math.max(extrema.maximumSpeed, snapshot.maximumSpeed);
  extrema.maximumMach = extrema.maximumSpeed / LATTICE_SOUND_SPEED;
  extrema.maximumDensityDeviation = Math.max(
    Math.abs(extrema.minimumDensity - 1),
    Math.abs(extrema.maximumDensity - 1),
  );
}

function coefficientSample(
  rawReactionX: number,
  rawReactionY: number,
  before: FieldSnapshot,
  after: FieldSnapshot,
  definition: FixedCylinderCaseDefinition,
): CoefficientSample {
  const correctedX = rawReactionX
    + after.fictitiousMomentumX - before.fictitiousMomentumX;
  const correctedY = rawReactionY
    + after.fictitiousMomentumY - before.fictitiousMomentumY;
  const dynamicLineForce = 0.5
    * definition.latticeVelocity ** 2
    * definition.diameterCells;
  return {
    drag: correctedX / dynamicLineForce,
    lift: correctedY / dynamicLineForce,
  };
}

function compareLiterature(
  metrics: FixedCylinderCaseResult["metrics"],
): FixedCylinderLiteratureComparison {
  const meanDragError = Math.abs(metrics.meanDrag - FIXED_TARGET.meanDrag);
  const liftRmsError = Math.abs(metrics.liftRms - FIXED_TARGET.liftRms);
  const strouhalError = Math.abs(metrics.strouhal - FIXED_TARGET.strouhal);
  const meanDragPassed = meanDragError <= FIXED_TARGET.tolerance.meanDrag;
  const liftRmsPassed = liftRmsError <= FIXED_TARGET.tolerance.liftRms;
  const strouhalPassed = strouhalError <= FIXED_TARGET.tolerance.strouhal;
  return {
    meanDragError,
    liftRmsError,
    strouhalError,
    meanDragPassed,
    liftRmsPassed,
    strouhalPassed,
    passed: meanDragPassed && liftRmsPassed && strouhalPassed,
  };
}

export function runFixedCylinderCase(
  definition: FixedCylinderCaseDefinition,
  onProgress: ((completed: number, total: number) => void) | null = null,
): FixedCylinderCaseResult {
  const geometry = resolveFixedCylinderGeometry(definition);
  const solver = createSolver(definition, geometry);
  const body = fixedBody(solver, definition, geometry);
  const totalSteps = Math.round(
    definition.fixedConvectiveDuration
      * definition.diameterCells
      / definition.latticeVelocity,
  );
  const discardSteps = Math.round(
    definition.discardConvectiveTime
      * definition.diameterCells
      / definition.latticeVelocity,
  );
  let before = captureField(solver, body);
  const extrema: FixedCylinderRunExtrema = {
    minimumDensity: Number.POSITIVE_INFINITY,
    maximumDensity: Number.NEGATIVE_INFINITY,
    maximumSpeed: 0,
    maximumMach: 0,
    maximumDensityDeviation: 0,
  };
  includeExtrema(extrema, before);
  const samples: CoefficientSample[] = [];
  for (let step = 0; step < totalSteps; step += 1) {
    const exchange = solver.step(body, definition.latticeVelocity);
    const after = captureField(solver, body);
    includeExtrema(extrema, after);
    if (step + 1 > discardSteps) {
      samples.push(coefficientSample(
        exchange.rawReactionImpulseX,
        exchange.rawReactionImpulseY,
        before,
        after,
        definition,
      ));
    }
    before = after;
    onProgress?.(step + 1, totalSteps);
  }
  const coefficientMetrics = summarizeCoefficients(samples);
  const spectral = dominantStrouhal(
    samples.map((sample) => sample.lift),
    definition.latticeVelocity / definition.diameterCells,
  );
  const metrics = {
    ...coefficientMetrics,
    strouhal: spectral.strouhal,
    spectralLiftAmplitude: spectral.normalizedAmplitude,
  };
  const split = Math.floor(samples.length / 2);
  const firstHalf = summarizeCoefficients(samples.slice(0, split));
  const secondHalf = summarizeCoefficients(samples.slice(split));
  const maturity = {
    meanDragHalfDrift: relativeDifference(firstHalf.meanDrag, secondHalf.meanDrag),
    liftRmsHalfDrift: relativeDifference(firstHalf.liftRms, secondHalf.liftRms),
    passed: false,
  };
  maturity.passed = metrics.liftRms > 1e-3
    && maturity.meanDragHalfDrift <= 0.05
    && maturity.liftRmsHalfDrift <= 0.10;
  const literature = compareLiterature(metrics);
  return {
    definition,
    numericalIdentity: {
      diameterCells: definition.diameterCells,
      nx: solver.nx,
      ny: solver.ny,
      latticeVelocity: definition.latticeVelocity,
      nominalLatticeMach: definition.latticeVelocity / LATTICE_SOUND_SPEED,
      relaxationTime: solver.relaxationTime,
      penalizationTimeSteps: solver.penalizationTimeSteps,
      etaHat: definition.etaHat,
      maskHalfThickness: definition.maskHalfThickness,
      outerBoundary: "open-periodic-crossflow",
      domainLengthDiameters: geometry.domainLengthDiameters,
      domainWidthDiameters: geometry.domainWidthDiameters,
      upstreamDiameters: geometry.upstreamDiameters,
      downstreamDiameters: geometry.downstreamDiameters,
    },
    body,
    window: {
      fixedConvectiveDuration: definition.fixedConvectiveDuration,
      discardConvectiveTime: definition.discardConvectiveTime,
      samples: samples.length,
    },
    metrics,
    firstHalf,
    secondHalf,
    maturity,
    literature,
    literatureErrorScore: literatureErrorScore(
      literature,
      FIXED_TARGET.tolerance,
    ),
    extrema,
  };
}
