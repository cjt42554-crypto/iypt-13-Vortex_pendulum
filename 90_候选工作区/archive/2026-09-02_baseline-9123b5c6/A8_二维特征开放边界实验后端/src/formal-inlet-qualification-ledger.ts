import {
  D2Q9_CX,
  D2Q9_CY,
  type LbmBodyKinematics,
  type LbmCheckpoint,
} from "../../../../02_模拟程序/src/solvers/highFidelity/lbm.ts";
import { FORMAL_INLET_QUALIFICATION_CONTRACT as CONTRACT } from
  "./formal-inlet-qualification-contract.ts";
import type {
  FormalInletQualificationStrategy,
} from "./formal-inlet-qualification-contract.ts";
import type {
  PopulationMassStepRecord,
  PopulationMassSummary,
  QualificationPhase,
} from "./formal-inlet-qualification-types.ts";

export interface FormalShadowStep {
  distributions: Float64Array;
  preCollisionTotalMass: number;
  postCollisionTotalMass: number;
  collisionMassResidual: number;
  leftStreamingOutByDirection: number[];
  rightStreamingOutByDirection: number[];
  leftStreamingOutTotal: number;
  rightStreamingOutTotal: number;
  postStreamRetainedMass: number;
  formalLeftWritebackByDirection: number[];
  formalRightWritebackByDirection: number[];
  formalLeftWritebackTotal: number;
  formalRightWritebackTotal: number;
  postFormalBoundaryMass: number;
}

export interface MutableMassLedger {
  initialTotalMass: number;
  finalTotalMass: number;
  stepRecordCount: number;
  cumulativeCollisionMassResidual: number;
  cumulativeLeftStreamingOut: number;
  cumulativeRightStreamingOut: number;
  cumulativeFormalLeftWriteback: number;
  cumulativeFormalRightWriteback: number;
  cumulativeAbsoluteFormalBoundaryExchange: number;
  cumulativeAdapterMass: number;
  cumulativeAdapterByDirection: number[];
  cumulativeAdapterAbsoluteByDirection: number[];
  cumulativeClosureResidual: number;
  cumulativeAbsoluteMassExchange: number;
  maximumNormalizedStepClosureResidual: number;
  maximumNormalizedCumulativeClosureResidual: number;
  maximumFormalShadowPopulationAbsoluteDifference: number;
  formalShadowMismatchCount: number;
}

function wrapped(index: number, size: number): number {
  const remainder = index % size;
  return remainder < 0 ? remainder + size : remainder;
}

function bodyIndicator(
  x: number,
  y: number,
  body: LbmBodyKinematics,
  maskHalfThickness: number,
): number {
  const dx = x - body.centerX;
  const dy = y - body.centerY;
  const signedDistance = Math.hypot(dx, dy) - body.radius;
  if (signedDistance <= -maskHalfThickness) return 1;
  if (signedDistance >= maskHalfThickness) return 0;
  return 0.5 * (
    1 - Math.sin(Math.PI * signedDistance / (2 * maskHalfThickness))
  );
}

export function totalPopulationMass(distributions: ArrayLike<number>): number {
  let total = 0;
  for (let index = 0; index < distributions.length; index += 1) {
    total += distributions[index] ?? 0;
  }
  if (!Number.isFinite(total)) throw new RangeError("A8M population mass became non-finite");
  return total;
}

function sum(values: readonly number[]): number {
  let result = 0;
  for (const value of values) result += value;
  return result;
}

/**
 * Candidate-only, operation-order mirror of the frozen formal MRT step.
 * Every returned post-boundary population is required to equal the formal
 * checkpoint exactly before this ledger is admissible as evidence.
 */
export function shadowFormalStep(
  checkpoint: LbmCheckpoint,
  body: LbmBodyKinematics | null,
  inletVelocity: number,
): FormalShadowStep {
  if (!Number.isFinite(inletVelocity) || Math.abs(inletVelocity) >= 0.2) {
    throw new RangeError("A8M shadow inlet velocity must be finite and |u| < 0.2");
  }
  const { nx, ny, relaxationTime, penalizationTimeSteps, maskHalfThickness } =
    checkpoint;
  const cells = nx * ny;
  const distributions = checkpoint.distributions;
  const streamed = new Float64Array(distributions.length);
  const rho = new Float64Array(cells);
  const ux = new Float64Array(cells);
  const uy = new Float64Array(cells);
  const forceX = new Float64Array(cells);
  const forceY = new Float64Array(cells);
  const inversePenaltyTime = 1 / penalizationTimeSteps;

  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      const cell = x + nx * y;
      const offset = 9 * cell;
      const f0 = distributions[offset] ?? 0;
      const f1 = distributions[offset + 1] ?? 0;
      const f2 = distributions[offset + 2] ?? 0;
      const f3 = distributions[offset + 3] ?? 0;
      const f4 = distributions[offset + 4] ?? 0;
      const f5 = distributions[offset + 5] ?? 0;
      const f6 = distributions[offset + 6] ?? 0;
      const f7 = distributions[offset + 7] ?? 0;
      const f8 = distributions[offset + 8] ?? 0;
      const density = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
      if (!(density > 0) || !Number.isFinite(density)) {
        throw new RangeError(`A8M shadow invalid density at (${x},${y})`);
      }
      const momentumX = f1 - f3 + f5 - f6 - f7 + f8;
      const momentumY = f2 - f4 + f5 + f6 - f7 - f8;
      const indicator = body === null
        ? 0
        : bodyIndicator(x, y, body, maskHalfThickness);
      const penalty = indicator * inversePenaltyTime;
      const rawUx = momentumX / density;
      const rawUy = momentumY / density;
      const denominator = 1 + 0.5 * penalty;
      const velocityX = (rawUx + 0.5 * penalty * (body?.velocityX ?? 0))
        / denominator;
      const velocityY = (rawUy + 0.5 * penalty * (body?.velocityY ?? 0))
        / denominator;
      rho[cell] = density;
      ux[cell] = velocityX;
      uy[cell] = velocityY;
      forceX[cell] = density * penalty * ((body?.velocityX ?? 0) - velocityX);
      forceY[cell] = density * penalty * ((body?.velocityY ?? 0) - velocityY);
    }
  }

  const leftStreamingOutByDirection = Array<number>(9).fill(0);
  const rightStreamingOutByDirection = Array<number>(9).fill(0);
  const sNu = 1 / relaxationTime;
  const s1 = 1.10;
  const s2 = 1.00;
  const s4 = 1.20;
  const s6 = 1.20;
  let postCollisionTotalMass = 0;

  for (let y = 0; y < ny; y += 1) {
    for (let x = 0; x < nx; x += 1) {
      const cell = x + nx * y;
      const offset = 9 * cell;
      const f0 = distributions[offset] ?? 0;
      const f1 = distributions[offset + 1] ?? 0;
      const f2 = distributions[offset + 2] ?? 0;
      const f3 = distributions[offset + 3] ?? 0;
      const f4 = distributions[offset + 4] ?? 0;
      const f5 = distributions[offset + 5] ?? 0;
      const f6 = distributions[offset + 6] ?? 0;
      const f7 = distributions[offset + 7] ?? 0;
      const f8 = distributions[offset + 8] ?? 0;
      const density = rho[cell] ?? 1;
      const velocityX = ux[cell] ?? 0;
      const velocityY = uy[cell] ?? 0;
      const bodyFx = forceX[cell] ?? 0;
      const bodyFy = forceY[cell] ?? 0;
      const speedSquared = velocityX * velocityX + velocityY * velocityY;
      const forcePower = velocityX * bodyFx + velocityY * bodyFy;

      let m0 = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
      let m1 = -4 * f0 - f1 - f2 - f3 - f4 + 2 * (f5 + f6 + f7 + f8);
      let m2 = 4 * f0 - 2 * (f1 + f2 + f3 + f4) + f5 + f6 + f7 + f8;
      let m3 = f1 - f3 + f5 - f6 - f7 + f8;
      let m4 = -2 * f1 + 2 * f3 + f5 - f6 - f7 + f8;
      let m5 = f2 - f4 + f5 + f6 - f7 - f8;
      let m6 = -2 * f2 + 2 * f4 + f5 + f6 - f7 - f8;
      let m7 = f1 - f2 + f3 - f4;
      let m8 = f5 - f6 + f7 - f8;

      const equilibrium1 = density * (-2 + 3 * speedSquared);
      const equilibrium2 = density * (1 - 3 * speedSquared);
      const equilibrium3 = density * velocityX;
      const equilibrium4 = -equilibrium3;
      const equilibrium5 = density * velocityY;
      const equilibrium6 = -equilibrium5;
      const equilibrium7 = density * (velocityX * velocityX - velocityY * velocityY);
      const equilibrium8 = density * velocityX * velocityY;

      m1 += -s1 * (m1 - equilibrium1) + (1 - 0.5 * s1) * 6 * forcePower;
      m2 += -s2 * (m2 - equilibrium2) + (1 - 0.5 * s2) * -6 * forcePower;
      m3 += bodyFx;
      m4 += -s4 * (m4 - equilibrium4) + (1 - 0.5 * s4) * -bodyFx;
      m5 += bodyFy;
      m6 += -s6 * (m6 - equilibrium6) + (1 - 0.5 * s6) * -bodyFy;
      m7 += -sNu * (m7 - equilibrium7)
        + (1 - 0.5 * sNu) * 2 * (velocityX * bodyFx - velocityY * bodyFy);
      m8 += -sNu * (m8 - equilibrium8)
        + (1 - 0.5 * sNu) * (velocityX * bodyFy + velocityY * bodyFx);

      const post0 = (4 * m0 - 4 * m1 + 4 * m2) / 36;
      const post1 = (4 * m0 - m1 - 2 * m2 + 6 * m3 - 6 * m4 + 9 * m7) / 36;
      const post2 = (4 * m0 - m1 - 2 * m2 + 6 * m5 - 6 * m6 - 9 * m7) / 36;
      const post3 = (4 * m0 - m1 - 2 * m2 - 6 * m3 + 6 * m4 + 9 * m7) / 36;
      const post4 = (4 * m0 - m1 - 2 * m2 - 6 * m5 + 6 * m6 - 9 * m7) / 36;
      const post5 = (4 * m0 + 2 * m1 + m2 + 6 * m3 + 3 * m4 + 6 * m5 + 3 * m6 + 9 * m8) / 36;
      const post6 = (4 * m0 + 2 * m1 + m2 - 6 * m3 - 3 * m4 + 6 * m5 + 3 * m6 - 9 * m8) / 36;
      const post7 = (4 * m0 + 2 * m1 + m2 - 6 * m3 - 3 * m4 - 6 * m5 - 3 * m6 + 9 * m8) / 36;
      const post8 = (4 * m0 + 2 * m1 + m2 + 6 * m3 + 3 * m4 - 6 * m5 - 3 * m6 - 9 * m8) / 36;

      for (let direction = 0; direction < 9; direction += 1) {
        const destinationX = x + (D2Q9_CX[direction] ?? 0);
        const destinationY = wrapped(y + (D2Q9_CY[direction] ?? 0), ny);
        const postValue = direction === 0 ? post0
          : direction === 1 ? post1
            : direction === 2 ? post2
              : direction === 3 ? post3
                : direction === 4 ? post4
                  : direction === 5 ? post5
                    : direction === 6 ? post6
                      : direction === 7 ? post7
                        : post8;
        postCollisionTotalMass += postValue;
        if (destinationX < 0) {
          leftStreamingOutByDirection[direction]
            = (leftStreamingOutByDirection[direction] ?? 0) + postValue;
          continue;
        }
        if (destinationX >= nx) {
          rightStreamingOutByDirection[direction]
            = (rightStreamingOutByDirection[direction] ?? 0) + postValue;
          continue;
        }
        const destinationCell = destinationX + nx * destinationY;
        streamed[9 * destinationCell + direction] = postValue;
      }
    }
  }

  const preCollisionTotalMass = totalPopulationMass(distributions);
  const collisionMassResidual = postCollisionTotalMass - preCollisionTotalMass;
  const leftStreamingOutTotal = sum(leftStreamingOutByDirection);
  const rightStreamingOutTotal = sum(rightStreamingOutByDirection);
  const postStreamRetainedMass = totalPopulationMass(streamed);
  const formalLeftWritebackByDirection = Array<number>(9).fill(0);
  const formalRightWritebackByDirection = Array<number>(9).fill(0);

  if (checkpoint.outerBoundary === "open-periodic-crossflow") {
    const rightX = nx - 1;
    for (let y = 0; y < ny; y += 1) {
      const left = 9 * (nx * y);
      const lf0 = streamed[left] ?? 0;
      const lf2 = streamed[left + 2] ?? 0;
      const lf3 = streamed[left + 3] ?? 0;
      const lf4 = streamed[left + 4] ?? 0;
      const lf6 = streamed[left + 6] ?? 0;
      const lf7 = streamed[left + 7] ?? 0;
      const inletDensity = (lf0 + lf2 + lf4 + 2 * (lf3 + lf6 + lf7))
        / (1 - inletVelocity);
      const left1 = lf3 + (2 / 3) * inletDensity * inletVelocity;
      const left5 = lf7 + 0.5 * (lf4 - lf2)
        + (1 / 6) * inletDensity * inletVelocity;
      const left8 = lf6 + 0.5 * (lf2 - lf4)
        + (1 / 6) * inletDensity * inletVelocity;
      formalLeftWritebackByDirection[1]
        = (formalLeftWritebackByDirection[1] ?? 0) + left1 - (streamed[left + 1] ?? 0);
      formalLeftWritebackByDirection[5]
        = (formalLeftWritebackByDirection[5] ?? 0) + left5 - (streamed[left + 5] ?? 0);
      formalLeftWritebackByDirection[8]
        = (formalLeftWritebackByDirection[8] ?? 0) + left8 - (streamed[left + 8] ?? 0);
      streamed[left + 1] = left1;
      streamed[left + 5] = left5;
      streamed[left + 8] = left8;

      const right = 9 * (rightX + nx * y);
      const rf0 = streamed[right] ?? 0;
      const rf1 = streamed[right + 1] ?? 0;
      const rf2 = streamed[right + 2] ?? 0;
      const rf4 = streamed[right + 4] ?? 0;
      const rf5 = streamed[right + 5] ?? 0;
      const rf8 = streamed[right + 8] ?? 0;
      const outletDensity = 1;
      const outletVelocity = -1
        + (rf0 + rf2 + rf4 + 2 * (rf1 + rf5 + rf8)) / outletDensity;
      const right3 = rf1 - (2 / 3) * outletDensity * outletVelocity;
      const right6 = rf8 + 0.5 * (rf4 - rf2)
        - (1 / 6) * outletDensity * outletVelocity;
      const right7 = rf5 + 0.5 * (rf2 - rf4)
        - (1 / 6) * outletDensity * outletVelocity;
      formalRightWritebackByDirection[3]
        = (formalRightWritebackByDirection[3] ?? 0) + right3 - (streamed[right + 3] ?? 0);
      formalRightWritebackByDirection[6]
        = (formalRightWritebackByDirection[6] ?? 0) + right6 - (streamed[right + 6] ?? 0);
      formalRightWritebackByDirection[7]
        = (formalRightWritebackByDirection[7] ?? 0) + right7 - (streamed[right + 7] ?? 0);
      streamed[right + 3] = right3;
      streamed[right + 6] = right6;
      streamed[right + 7] = right7;
    }
  }

  const formalLeftWritebackTotal = sum(formalLeftWritebackByDirection);
  const formalRightWritebackTotal = sum(formalRightWritebackByDirection);
  const postFormalBoundaryMass = totalPopulationMass(streamed);
  return {
    distributions: streamed,
    preCollisionTotalMass,
    postCollisionTotalMass,
    collisionMassResidual,
    leftStreamingOutByDirection,
    rightStreamingOutByDirection,
    leftStreamingOutTotal,
    rightStreamingOutTotal,
    postStreamRetainedMass,
    formalLeftWritebackByDirection,
    formalRightWritebackByDirection,
    formalLeftWritebackTotal,
    formalRightWritebackTotal,
    postFormalBoundaryMass,
  };
}

export function createMassLedger(initial: LbmCheckpoint): MutableMassLedger {
  const initialTotalMass = totalPopulationMass(initial.distributions);
  return {
    initialTotalMass,
    finalTotalMass: initialTotalMass,
    stepRecordCount: 0,
    cumulativeCollisionMassResidual: 0,
    cumulativeLeftStreamingOut: 0,
    cumulativeRightStreamingOut: 0,
    cumulativeFormalLeftWriteback: 0,
    cumulativeFormalRightWriteback: 0,
    cumulativeAbsoluteFormalBoundaryExchange: 0,
    cumulativeAdapterMass: 0,
    cumulativeAdapterByDirection: Array<number>(9).fill(0),
    cumulativeAdapterAbsoluteByDirection: Array<number>(9).fill(0),
    cumulativeClosureResidual: 0,
    cumulativeAbsoluteMassExchange: 0,
    maximumNormalizedStepClosureResidual: 0,
    maximumNormalizedCumulativeClosureResidual: 0,
    maximumFormalShadowPopulationAbsoluteDifference: 0,
    formalShadowMismatchCount: 0,
  };
}

function compareFormalShadow(
  formal: ArrayLike<number>,
  shadow: ArrayLike<number>,
): { maximumAbsoluteDifference: number; mismatchCount: number } {
  if (formal.length !== shadow.length) throw new RangeError("A8M shadow length mismatch");
  let maximumAbsoluteDifference = 0;
  let mismatchCount = 0;
  for (let index = 0; index < formal.length; index += 1) {
    const formalValue = formal[index] ?? Number.NaN;
    const shadowValue = shadow[index] ?? Number.NaN;
    const difference = Math.abs(formalValue - shadowValue);
    if (!Number.isFinite(difference)) {
      throw new RangeError(`A8M non-finite shadow comparison at population ${index}`);
    }
    maximumAbsoluteDifference = Math.max(maximumAbsoluteDifference, difference);
    if (formalValue !== shadowValue) mismatchCount += 1;
  }
  return { maximumAbsoluteDifference, mismatchCount };
}

function directionGroupTotal(values: readonly number[], directions: readonly number[]): number {
  let total = 0;
  for (const direction of directions) total += values[direction] ?? 0;
  return total;
}

export function recordPopulationMassStep(
  step: number,
  phase: QualificationPhase,
  shadow: FormalShadowStep,
  formalCheckpoint: LbmCheckpoint,
  candidateCheckpoint: LbmCheckpoint,
  ledger: MutableMassLedger,
): PopulationMassStepRecord {
  const comparison = compareFormalShadow(
    formalCheckpoint.distributions,
    shadow.distributions,
  );
  const adapterByDirection = Array<number>(9).fill(0);
  const adapterAbsoluteByDirection = Array<number>(9).fill(0);
  for (let index = 0; index < formalCheckpoint.distributions.length; index += 1) {
    const delta = (candidateCheckpoint.distributions[index] ?? 0)
      - (formalCheckpoint.distributions[index] ?? 0);
    const direction = index % 9;
    adapterByDirection[direction] = (adapterByDirection[direction] ?? 0) + delta;
    adapterAbsoluteByDirection[direction]
      = (adapterAbsoluteByDirection[direction] ?? 0) + Math.abs(delta);
  }
  const groups = CONTRACT.exactPopulationMassBudget.adapterDirectionGroups;
  const adapterIncoming = directionGroupTotal(adapterByDirection, groups.incoming);
  const adapterOutgoing = directionGroupTotal(adapterByDirection, groups.outgoing);
  const adapterStationaryCross = directionGroupTotal(
    adapterByDirection,
    groups.stationaryCross,
  );
  const adapterTotal = sum(adapterByDirection);
  const postCandidateAdapterTotalMass = totalPopulationMass(
    candidateCheckpoint.distributions,
  );
  const actualMassChange = postCandidateAdapterTotalMass
    - shadow.preCollisionTotalMass;
  const budgetMassChange = shadow.collisionMassResidual
    - shadow.leftStreamingOutTotal
    - shadow.rightStreamingOutTotal
    + shadow.formalLeftWritebackTotal
    + shadow.formalRightWritebackTotal
    + adapterTotal;
  const stepClosureResidual = actualMassChange - budgetMassChange;
  const absoluteMassExchange = Math.abs(shadow.collisionMassResidual)
    + Math.abs(shadow.leftStreamingOutTotal)
    + Math.abs(shadow.rightStreamingOutTotal)
    + Math.abs(shadow.formalLeftWritebackTotal)
    + Math.abs(shadow.formalRightWritebackTotal)
    + Math.abs(adapterTotal);
  const normalizedStepClosureResidual = Math.abs(stepClosureResidual)
    / Math.max(1, absoluteMassExchange);

  ledger.stepRecordCount += 1;
  ledger.finalTotalMass = postCandidateAdapterTotalMass;
  ledger.cumulativeCollisionMassResidual += shadow.collisionMassResidual;
  ledger.cumulativeLeftStreamingOut += shadow.leftStreamingOutTotal;
  ledger.cumulativeRightStreamingOut += shadow.rightStreamingOutTotal;
  ledger.cumulativeFormalLeftWriteback += shadow.formalLeftWritebackTotal;
  ledger.cumulativeFormalRightWriteback += shadow.formalRightWritebackTotal;
  ledger.cumulativeAbsoluteFormalBoundaryExchange +=
    Math.abs(shadow.leftStreamingOutTotal)
    + Math.abs(shadow.rightStreamingOutTotal)
    + Math.abs(shadow.formalLeftWritebackTotal)
    + Math.abs(shadow.formalRightWritebackTotal);
  ledger.cumulativeAdapterMass += adapterTotal;
  for (let direction = 0; direction < 9; direction += 1) {
    ledger.cumulativeAdapterByDirection[direction]
      = (ledger.cumulativeAdapterByDirection[direction] ?? 0)
      + (adapterByDirection[direction] ?? 0);
    ledger.cumulativeAdapterAbsoluteByDirection[direction]
      = (ledger.cumulativeAdapterAbsoluteByDirection[direction] ?? 0)
      + (adapterAbsoluteByDirection[direction] ?? 0);
  }
  ledger.cumulativeClosureResidual += stepClosureResidual;
  ledger.cumulativeAbsoluteMassExchange += absoluteMassExchange;
  ledger.maximumNormalizedStepClosureResidual = Math.max(
    ledger.maximumNormalizedStepClosureResidual,
    normalizedStepClosureResidual,
  );
  const normalizedCumulativeClosureResidual = Math.abs(
    ledger.cumulativeClosureResidual,
  ) / Math.max(1, ledger.cumulativeAbsoluteMassExchange);
  ledger.maximumNormalizedCumulativeClosureResidual = Math.max(
    ledger.maximumNormalizedCumulativeClosureResidual,
    normalizedCumulativeClosureResidual,
  );
  ledger.maximumFormalShadowPopulationAbsoluteDifference = Math.max(
    ledger.maximumFormalShadowPopulationAbsoluteDifference,
    comparison.maximumAbsoluteDifference,
  );
  ledger.formalShadowMismatchCount += comparison.mismatchCount;

  const valuesToCheck = [
    shadow.preCollisionTotalMass,
    shadow.postCollisionTotalMass,
    shadow.collisionMassResidual,
    shadow.leftStreamingOutTotal,
    shadow.rightStreamingOutTotal,
    shadow.postStreamRetainedMass,
    shadow.formalLeftWritebackTotal,
    shadow.formalRightWritebackTotal,
    shadow.postFormalBoundaryMass,
    adapterIncoming,
    adapterOutgoing,
    adapterStationaryCross,
    adapterTotal,
    postCandidateAdapterTotalMass,
    actualMassChange,
    budgetMassChange,
    stepClosureResidual,
    absoluteMassExchange,
    normalizedStepClosureResidual,
    ledger.cumulativeClosureResidual,
    ledger.cumulativeAbsoluteMassExchange,
    normalizedCumulativeClosureResidual,
  ];
  if (!valuesToCheck.every(Number.isFinite)) {
    throw new RangeError(`A8M non-finite mass ledger at step ${step}`);
  }

  return {
    step,
    phase,
    preCollisionTotalMass: shadow.preCollisionTotalMass,
    postCollisionTotalMass: shadow.postCollisionTotalMass,
    collisionMassResidual: shadow.collisionMassResidual,
    leftStreamingOutByDirection: shadow.leftStreamingOutByDirection,
    rightStreamingOutByDirection: shadow.rightStreamingOutByDirection,
    leftStreamingOutTotal: shadow.leftStreamingOutTotal,
    rightStreamingOutTotal: shadow.rightStreamingOutTotal,
    postStreamRetainedMass: shadow.postStreamRetainedMass,
    formalLeftWritebackByDirection: shadow.formalLeftWritebackByDirection,
    formalRightWritebackByDirection: shadow.formalRightWritebackByDirection,
    formalLeftWritebackTotal: shadow.formalLeftWritebackTotal,
    formalRightWritebackTotal: shadow.formalRightWritebackTotal,
    postFormalBoundaryMass: shadow.postFormalBoundaryMass,
    formalShadowMaximumPopulationAbsoluteDifference:
      comparison.maximumAbsoluteDifference,
    formalShadowMismatchCount: comparison.mismatchCount,
    adapterByDirection,
    adapterAbsoluteByDirection,
    adapterIncoming,
    adapterOutgoing,
    adapterStationaryCross,
    adapterTotal,
    postCandidateAdapterTotalMass,
    actualMassChange,
    budgetMassChange,
    stepClosureResidual,
    absoluteMassExchange,
    normalizedStepClosureResidual,
    cumulativeClosureResidual: ledger.cumulativeClosureResidual,
    cumulativeAbsoluteMassExchange: ledger.cumulativeAbsoluteMassExchange,
    normalizedCumulativeClosureResidual,
  };
}

export function finishMassLedger(
  ledger: MutableMassLedger,
  strategy: FormalInletQualificationStrategy,
): PopulationMassSummary {
  const groups = CONTRACT.exactPopulationMassBudget.adapterDirectionGroups;
  const cumulativeAdapterIncoming = directionGroupTotal(
    ledger.cumulativeAdapterByDirection,
    groups.incoming,
  );
  const cumulativeAdapterOutgoing = directionGroupTotal(
    ledger.cumulativeAdapterByDirection,
    groups.outgoing,
  );
  const cumulativeAdapterStationaryCross = directionGroupTotal(
    ledger.cumulativeAdapterByDirection,
    groups.stationaryCross,
  );
  const cumulativeAdapterAbsoluteTotal = sum(
    ledger.cumulativeAdapterAbsoluteByDirection,
  );
  const nonIncomingAbsoluteModification = directionGroupTotal(
    ledger.cumulativeAdapterAbsoluteByDirection,
    [...groups.outgoing, ...groups.stationaryCross],
  );
  const adapterMassOverInitialMass = Math.abs(ledger.cumulativeAdapterMass)
    / Math.max(Number.MIN_VALUE, Math.abs(ledger.initialTotalMass));
  const adapterMassOverAbsoluteFormalBoundaryExchange =
    ledger.cumulativeAbsoluteFormalBoundaryExchange === 0
      ? Math.abs(ledger.cumulativeAdapterMass) === 0 ? 0 : Number.POSITIVE_INFINITY
      : Math.abs(ledger.cumulativeAdapterMass)
        / ledger.cumulativeAbsoluteFormalBoundaryExchange;
  const nonIncomingAbsoluteModificationFraction = cumulativeAdapterAbsoluteTotal === 0
    ? 0
    : nonIncomingAbsoluteModification / cumulativeAdapterAbsoluteTotal;
  const gates = CONTRACT.exactPopulationMassBudget.gates;
  const formalShadowExact = ledger.formalShadowMismatchCount === 0
    && ledger.maximumFormalShadowPopulationAbsoluteDifference
      === gates.formalShadowMaximumPopulationAbsoluteDifference;
  const stepClosurePass = ledger.maximumNormalizedStepClosureResidual
    <= gates.maximumNormalizedStepClosureResidual;
  const cumulativeClosurePass = ledger.maximumNormalizedCumulativeClosureResidual
    <= gates.maximumNormalizedCumulativeClosureResidual;
  const isS2 = strategy === "legacy-zou-he-density-normalized";
  const s2AdapterMassOverInitialPass = isS2
    ? adapterMassOverInitialMass <= gates.maximumS2CumulativeAdapterMassOverInitialMass
    : null;
  const s2AdapterMassOverFormalExchangePass = isS2
    ? adapterMassOverAbsoluteFormalBoundaryExchange
      <= gates.maximumS2CumulativeAdapterMassOverAbsoluteFormalBoundaryExchange
    : null;
  const s2NonIncomingModificationPass = isS2
    ? nonIncomingAbsoluteModificationFraction
      <= gates.maximumS2NonIncomingAbsoluteModificationFraction
    : null;
  const pass = formalShadowExact && stepClosurePass && cumulativeClosurePass
    && (!isS2 || (
      s2AdapterMassOverInitialPass === true
      && s2AdapterMassOverFormalExchangePass === true
      && s2NonIncomingModificationPass === true
    ));
  return {
    stepRecordCount: ledger.stepRecordCount,
    initialTotalMass: ledger.initialTotalMass,
    finalTotalMass: ledger.finalTotalMass,
    cumulativeCollisionMassResidual: ledger.cumulativeCollisionMassResidual,
    cumulativeLeftStreamingOut: ledger.cumulativeLeftStreamingOut,
    cumulativeRightStreamingOut: ledger.cumulativeRightStreamingOut,
    cumulativeFormalLeftWriteback: ledger.cumulativeFormalLeftWriteback,
    cumulativeFormalRightWriteback: ledger.cumulativeFormalRightWriteback,
    cumulativeAdapterMass: ledger.cumulativeAdapterMass,
    cumulativeAdapterByDirection: ledger.cumulativeAdapterByDirection,
    cumulativeAdapterAbsoluteByDirection:
      ledger.cumulativeAdapterAbsoluteByDirection,
    cumulativeAdapterIncoming,
    cumulativeAdapterOutgoing,
    cumulativeAdapterStationaryCross,
    cumulativeAdapterAbsoluteTotal,
    cumulativeClosureResidual: ledger.cumulativeClosureResidual,
    cumulativeAbsoluteMassExchange: ledger.cumulativeAbsoluteMassExchange,
    maximumNormalizedStepClosureResidual:
      ledger.maximumNormalizedStepClosureResidual,
    maximumNormalizedCumulativeClosureResidual:
      ledger.maximumNormalizedCumulativeClosureResidual,
    maximumFormalShadowPopulationAbsoluteDifference:
      ledger.maximumFormalShadowPopulationAbsoluteDifference,
    formalShadowMismatchCount: ledger.formalShadowMismatchCount,
    adapterMassOverInitialMass,
    adapterMassOverAbsoluteFormalBoundaryExchange,
    nonIncomingAbsoluteModificationFraction,
    gates: {
      formalShadowExact,
      stepClosurePass,
      cumulativeClosurePass,
      s2AdapterMassOverInitialPass,
      s2AdapterMassOverFormalExchangePass,
      s2NonIncomingModificationPass,
      pass,
    },
  };
}
