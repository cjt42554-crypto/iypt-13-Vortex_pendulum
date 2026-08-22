/**
 * Deterministic D2Q9 multiple-relaxation-time lattice-Boltzmann kernel.
 *
 * This module solves the low-Mach two-dimensional isothermal Navier–Stokes
 * equations.  A circular moving solid is represented by an analytic diffuse
 * indicator and an implicitly evaluated Brinkman force.  It contains no
 * Stuart–Landau state, empirical lift law, or finite-span multiplier.
 */

export const D2Q9_CX = new Int8Array([0, 1, 0, -1, 0, 1, -1, -1, 1]);
export const D2Q9_CY = new Int8Array([0, 0, 1, 0, -1, 1, 1, -1, -1]);
export const D2Q9_WEIGHT = new Float64Array([
  4 / 9,
  1 / 9, 1 / 9, 1 / 9, 1 / 9,
  1 / 36, 1 / 36, 1 / 36, 1 / 36,
]);

export const LATTICE_SOUND_SPEED_SQUARED = 1 / 3;
export const LATTICE_SOUND_SPEED = 1 / Math.sqrt(3);

export type LbmOuterBoundary = "open-periodic-crossflow" | "periodic";

export interface LbmBodyKinematics {
  centerX: number;
  centerY: number;
  radius: number;
  velocityX: number;
  velocityY: number;
}

export interface LbmKernelOptions {
  nx: number;
  ny: number;
  relaxationTime: number;
  penalizationTimeSteps: number;
  outerBoundary?: LbmOuterBoundary;
  /** Half-width of the analytic diffuse indicator in lattice cells. */
  maskHalfThickness?: number;
}

export interface LbmMacroscopicSummary {
  mass: number;
  minimumDensity: number;
  maximumDensity: number;
  maximumSpeed: number;
}

export interface LbmForceSummary {
  /** Force exerted by the fluid on the body, in lattice force per unit span. */
  penaltyForceX: number;
  penaltyForceY: number;
  /** @deprecated Legacy incomplete contour diagnostic; not an independent body force. */
  stressForceX: number;
  stressForceY: number;
  legacyIncompleteStressContourForceX: number;
  legacyIncompleteStressContourForceY: number;
  legacyIncompleteStressContourRelativeDifference: number;
  forcePathRelativeDifference: number;
}

/**
 * Quantities accumulated from the exact rho/u/f_B/u_s values consumed by one
 * accepted Guo-forced lattice collision. Lattice dt and cell area are unity.
 */
export interface BrinkmanStepExchange {
  bodyForceImpulseX: number;
  bodyForceImpulseY: number;
  rawReactionImpulseX: number;
  rawReactionImpulseY: number;
  fluidBrinkmanWork: number;
  rawSolidReactionWork: number;
  penaltyDissipation: number;
  algebraicWorkResidual: number;
  absoluteWorkScale: number;
}

export interface LbmInspection extends LbmMacroscopicSummary, LbmForceSummary {
  step: number;
}

export interface LbmCheckpoint {
  format: "VP-HF-CFD2D-LBM-CHECKPOINT-v1";
  nx: number;
  ny: number;
  relaxationTime: number;
  penalizationTimeSteps: number;
  outerBoundary: LbmOuterBoundary;
  maskHalfThickness: number;
  step: number;
  distributions: Float64Array;
}

export interface LbmVelocityField {
  rho?: number;
  ux: number;
  uy: number;
}

function requireInteger(value: number, name: string, minimum: number): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be an integer >= ${minimum}`);
  }
}

function equilibrium(direction: number, rho: number, ux: number, uy: number): number {
  const cx = D2Q9_CX[direction] ?? 0;
  const cy = D2Q9_CY[direction] ?? 0;
  const cu = cx * ux + cy * uy;
  return (D2Q9_WEIGHT[direction] ?? 0)
    * rho
    * (1 + 3 * cu + 4.5 * cu * cu - 1.5 * (ux * ux + uy * uy));
}

export function d2q9Equilibrium(rho: number, ux: number, uy: number): Float64Array {
  if (!(rho > 0) || !Number.isFinite(rho) || !Number.isFinite(ux) || !Number.isFinite(uy)) {
    throw new RangeError("equilibrium inputs must be finite and rho must be positive");
  }
  const values = new Float64Array(9);
  for (let direction = 0; direction < 9; direction += 1) {
    values[direction] = equilibrium(direction, rho, ux, uy);
  }
  return values;
}

export function d2q9Moments(distributions: ArrayLike<number>): {
  rho: number;
  momentumX: number;
  momentumY: number;
} {
  if (distributions.length !== 9) throw new RangeError("D2Q9 requires nine populations");
  let rho = 0;
  let momentumX = 0;
  let momentumY = 0;
  for (let direction = 0; direction < 9; direction += 1) {
    const value = distributions[direction] ?? 0;
    rho += value;
    momentumX += value * (D2Q9_CX[direction] ?? 0);
    momentumY += value * (D2Q9_CY[direction] ?? 0);
  }
  return { rho, momentumX, momentumY };
}

function wrapped(index: number, size: number): number {
  const remainder = index % size;
  return remainder < 0 ? remainder + size : remainder;
}

function finiteOrThrow(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${label} became non-finite`);
  return value;
}

/**
 * Low-level solver.  Public array getters deliberately return copies; mutable
 * state crosses the module boundary only through a versioned checkpoint.
 */
export class D2Q9MrtBrinkmanSolver {
  readonly nx: number;
  readonly ny: number;
  readonly cells: number;
  readonly relaxationTime: number;
  readonly shearRelaxationRate: number;
  readonly kinematicViscosity: number;
  readonly penalizationTimeSteps: number;
  readonly outerBoundary: LbmOuterBoundary;
  readonly maskHalfThickness: number;

  private distributions: Float64Array;
  private streamed: Float64Array;
  private readonly rho: Float64Array;
  private readonly ux: Float64Array;
  private readonly uy: Float64Array;
  private readonly mask: Float64Array;
  private readonly forceX: Float64Array;
  private readonly forceY: Float64Array;
  private macroValid = false;
  private macroBody: LbmBodyKinematics | null = null;
  private currentStep = 0;

  constructor(options: LbmKernelOptions) {
    requireInteger(options.nx, "nx", 8);
    requireInteger(options.ny, "ny", 8);
    if (!(options.relaxationTime > 0.5) || !Number.isFinite(options.relaxationTime)) {
      throw new RangeError("relaxationTime must be finite and > 0.5");
    }
    if (!(options.penalizationTimeSteps >= 1) || !Number.isFinite(options.penalizationTimeSteps)) {
      throw new RangeError("penalizationTimeSteps must be finite and >= 1");
    }
    const maskHalfThickness = options.maskHalfThickness ?? 0.75;
    if (!(maskHalfThickness > 0) || !Number.isFinite(maskHalfThickness)) {
      throw new RangeError("maskHalfThickness must be finite and positive");
    }
    this.nx = options.nx;
    this.ny = options.ny;
    this.cells = this.nx * this.ny;
    this.relaxationTime = options.relaxationTime;
    this.shearRelaxationRate = 1 / this.relaxationTime;
    this.kinematicViscosity = LATTICE_SOUND_SPEED_SQUARED * (this.relaxationTime - 0.5);
    this.penalizationTimeSteps = options.penalizationTimeSteps;
    this.outerBoundary = options.outerBoundary ?? "open-periodic-crossflow";
    this.maskHalfThickness = maskHalfThickness;
    this.distributions = new Float64Array(9 * this.cells);
    this.streamed = new Float64Array(9 * this.cells);
    this.rho = new Float64Array(this.cells);
    this.ux = new Float64Array(this.cells);
    this.uy = new Float64Array(this.cells);
    this.mask = new Float64Array(this.cells);
    this.forceX = new Float64Array(this.cells);
    this.forceY = new Float64Array(this.cells);
    this.initializeUniform(0, 0);
  }

  get stepNumber(): number {
    return this.currentStep;
  }

  initializeUniform(ux: number, uy = 0): void {
    this.initializeField(() => ({ rho: 1, ux, uy }));
  }

  initializeField(field: (x: number, y: number) => LbmVelocityField): void {
    for (let y = 0; y < this.ny; y += 1) {
      for (let x = 0; x < this.nx; x += 1) {
        const cell = x + this.nx * y;
        const value = field(x, y);
        const density = value.rho ?? 1;
        if (!(density > 0) || !Number.isFinite(density)
          || !Number.isFinite(value.ux) || !Number.isFinite(value.uy)) {
          throw new RangeError(`invalid initial field at (${x},${y})`);
        }
        for (let direction = 0; direction < 9; direction += 1) {
          this.distributions[9 * cell + direction] = equilibrium(
            direction,
            density,
            value.ux,
            value.uy,
          );
        }
      }
    }
    this.streamed.fill(0);
    this.currentStep = 0;
    this.invalidateMacros();
  }

  checkpoint(): LbmCheckpoint {
    return {
      format: "VP-HF-CFD2D-LBM-CHECKPOINT-v1",
      nx: this.nx,
      ny: this.ny,
      relaxationTime: this.relaxationTime,
      penalizationTimeSteps: this.penalizationTimeSteps,
      outerBoundary: this.outerBoundary,
      maskHalfThickness: this.maskHalfThickness,
      step: this.currentStep,
      distributions: this.distributions.slice(),
    };
  }

  restore(checkpoint: LbmCheckpoint): void {
    if (checkpoint.format !== "VP-HF-CFD2D-LBM-CHECKPOINT-v1") {
      throw new Error("unsupported LBM checkpoint format");
    }
    if (checkpoint.nx !== this.nx || checkpoint.ny !== this.ny
      || checkpoint.relaxationTime !== this.relaxationTime
      || checkpoint.penalizationTimeSteps !== this.penalizationTimeSteps
      || checkpoint.outerBoundary !== this.outerBoundary
      || checkpoint.maskHalfThickness !== this.maskHalfThickness) {
      throw new Error("checkpoint numerical identity does not match this solver");
    }
    if (checkpoint.distributions.length !== this.distributions.length) {
      throw new Error("checkpoint distribution length is invalid");
    }
    this.distributions.set(checkpoint.distributions);
    this.currentStep = checkpoint.step;
    this.invalidateMacros();
  }

  /** One accepted lattice step. */
  step(body: LbmBodyKinematics | null, inletVelocity: number): BrinkmanStepExchange {
    if (!Number.isFinite(inletVelocity) || Math.abs(inletVelocity) >= 0.2) {
      throw new RangeError("inlet lattice velocity must be finite and |u| < 0.2");
    }
    this.computeMacros(body);
    const exchange = this.collideAndStream(body);
    if (this.outerBoundary === "open-periodic-crossflow") {
      this.applyZouHeBoundaries(inletVelocity);
    }
    const previous = this.distributions;
    this.distributions = this.streamed;
    this.streamed = previous;
    this.currentStep += 1;
    this.invalidateMacros();
    return exchange;
  }

  inspect(body: LbmBodyKinematics | null): LbmInspection {
    this.computeMacros(body);
    let mass = 0;
    let minimumDensity = Number.POSITIVE_INFINITY;
    let maximumDensity = Number.NEGATIVE_INFINITY;
    let maximumSpeed = 0;
    let bodyForceX = 0;
    let bodyForceY = 0;
    for (let cell = 0; cell < this.cells; cell += 1) {
      const density = this.rho[cell] ?? 0;
      mass += density;
      minimumDensity = Math.min(minimumDensity, density);
      maximumDensity = Math.max(maximumDensity, density);
      maximumSpeed = Math.max(maximumSpeed, Math.hypot(this.ux[cell] ?? 0, this.uy[cell] ?? 0));
      bodyForceX -= this.forceX[cell] ?? 0;
      bodyForceY -= this.forceY[cell] ?? 0;
    }
    let stressForceX = 0;
    let stressForceY = 0;
    if (body !== null) {
      ({ x: stressForceX, y: stressForceY } = this.integrateLegacyIncompleteStressContour(body));
    }
    const scale = Math.max(
      Math.hypot(bodyForceX, bodyForceY),
      Math.hypot(stressForceX, stressForceY),
      1e-14,
    );
    return {
      step: this.currentStep,
      mass: finiteOrThrow(mass, "mass"),
      minimumDensity: finiteOrThrow(minimumDensity, "minimum density"),
      maximumDensity: finiteOrThrow(maximumDensity, "maximum density"),
      maximumSpeed: finiteOrThrow(maximumSpeed, "maximum speed"),
      penaltyForceX: finiteOrThrow(bodyForceX, "penalty force x"),
      penaltyForceY: finiteOrThrow(bodyForceY, "penalty force y"),
      stressForceX: finiteOrThrow(stressForceX, "stress force x"),
      stressForceY: finiteOrThrow(stressForceY, "stress force y"),
      legacyIncompleteStressContourForceX: finiteOrThrow(
        stressForceX,
        "legacy incomplete stress-contour force x",
      ),
      legacyIncompleteStressContourForceY: finiteOrThrow(
        stressForceY,
        "legacy incomplete stress-contour force y",
      ),
      legacyIncompleteStressContourRelativeDifference: Math.hypot(
        bodyForceX - stressForceX,
        bodyForceY - stressForceY,
      ) / scale,
      forcePathRelativeDifference: Math.hypot(
        bodyForceX - stressForceX,
        bodyForceY - stressForceY,
      ) / scale,
    };
  }

  /** Native Brinkman reaction without the more expensive contour diagnostic. */
  penaltyReaction(body: LbmBodyKinematics | null): { x: number; y: number } {
    this.computeMacros(body);
    let x = 0;
    let y = 0;
    for (let cell = 0; cell < this.cells; cell += 1) {
      x -= this.forceX[cell] ?? 0;
      y -= this.forceY[cell] ?? 0;
    }
    return {
      x: finiteOrThrow(x, "penalty reaction x"),
      y: finiteOrThrow(y, "penalty reaction y"),
    };
  }

  /** Positive values are mass entering the open domain during one lattice step. */
  boundaryMassFlux(body: LbmBodyKinematics | null): {
    inlet: number;
    outlet: number;
    netInput: number;
  } {
    this.computeMacros(body);
    if (this.outerBoundary === "periodic") return { inlet: 0, outlet: 0, netInput: 0 };
    let inlet = 0;
    let outlet = 0;
    const right = this.nx - 1;
    for (let y = 0; y < this.ny; y += 1) {
      const leftCell = this.nx * y;
      const rightCell = right + this.nx * y;
      inlet += (this.rho[leftCell] ?? 0) * (this.ux[leftCell] ?? 0);
      outlet += (this.rho[rightCell] ?? 0) * (this.ux[rightCell] ?? 0);
    }
    return { inlet, outlet, netInput: inlet - outlet };
  }

  macroscopicCopies(body: LbmBodyKinematics | null): {
    rho: Float64Array;
    ux: Float64Array;
    uy: Float64Array;
    mask: Float64Array;
  } {
    this.computeMacros(body);
    return {
      rho: this.rho.slice(),
      ux: this.ux.slice(),
      uy: this.uy.slice(),
      mask: this.mask.slice(),
    };
  }

  private invalidateMacros(): void {
    this.macroValid = false;
    this.macroBody = null;
  }

  private sameBody(body: LbmBodyKinematics | null): boolean {
    if (!this.macroValid) return false;
    if (body === null || this.macroBody === null) return body === this.macroBody;
    return body.centerX === this.macroBody.centerX
      && body.centerY === this.macroBody.centerY
      && body.radius === this.macroBody.radius
      && body.velocityX === this.macroBody.velocityX
      && body.velocityY === this.macroBody.velocityY;
  }

  private computeMacros(body: LbmBodyKinematics | null): void {
    if (this.sameBody(body)) return;
    const inversePenaltyTime = 1 / this.penalizationTimeSteps;
    for (let y = 0; y < this.ny; y += 1) {
      for (let x = 0; x < this.nx; x += 1) {
        const cell = x + this.nx * y;
        const offset = 9 * cell;
        const f0 = this.distributions[offset] ?? 0;
        const f1 = this.distributions[offset + 1] ?? 0;
        const f2 = this.distributions[offset + 2] ?? 0;
        const f3 = this.distributions[offset + 3] ?? 0;
        const f4 = this.distributions[offset + 4] ?? 0;
        const f5 = this.distributions[offset + 5] ?? 0;
        const f6 = this.distributions[offset + 6] ?? 0;
        const f7 = this.distributions[offset + 7] ?? 0;
        const f8 = this.distributions[offset + 8] ?? 0;
        const density = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
        if (!(density > 0) || !Number.isFinite(density)) {
          throw new RangeError(`non-positive/non-finite lattice density at (${x},${y})`);
        }
        const momentumX = f1 - f3 + f5 - f6 - f7 + f8;
        const momentumY = f2 - f4 + f5 + f6 - f7 - f8;
        const indicator = body === null ? 0 : this.bodyIndicator(x, y, body);
        const penalty = indicator * inversePenaltyTime;
        const rawUx = momentumX / density;
        const rawUy = momentumY / density;
        const denominator = 1 + 0.5 * penalty;
        const velocityX = (rawUx + 0.5 * penalty * (body?.velocityX ?? 0)) / denominator;
        const velocityY = (rawUy + 0.5 * penalty * (body?.velocityY ?? 0)) / denominator;
        this.rho[cell] = density;
        this.ux[cell] = velocityX;
        this.uy[cell] = velocityY;
        this.mask[cell] = indicator;
        this.forceX[cell] = density * penalty * ((body?.velocityX ?? 0) - velocityX);
        this.forceY[cell] = density * penalty * ((body?.velocityY ?? 0) - velocityY);
      }
    }
    this.macroValid = true;
    this.macroBody = body === null ? null : { ...body };
  }

  private bodyIndicator(x: number, y: number, body: LbmBodyKinematics): number {
    const dx = x - body.centerX;
    const dy = y - body.centerY;
    const signedDistance = Math.hypot(dx, dy) - body.radius;
    if (signedDistance <= -this.maskHalfThickness) return 1;
    if (signedDistance >= this.maskHalfThickness) return 0;
    return 0.5 * (
      1 - Math.sin(Math.PI * signedDistance / (2 * this.maskHalfThickness))
    );
  }

  /** Explicit, unrolled d'Humieres/Lallemand–Luo moment collision. */
  private collideAndStream(body: LbmBodyKinematics | null): BrinkmanStepExchange {
    this.streamed.fill(0);
    let bodyForceImpulseX = 0;
    let bodyForceImpulseY = 0;
    let fluidBrinkmanWork = 0;
    let rawSolidReactionWork = 0;
    let penaltyDissipation = 0;
    const solidVelocityX = body?.velocityX ?? 0;
    const solidVelocityY = body?.velocityY ?? 0;
    const sNu = this.shearRelaxationRate;
    // Frozen non-hydrodynamic rates; all lie strictly inside (0,2).
    // Conservative, frozen kinetic-mode rates.  Keeping the energy-flux
    // modes away from the over-relaxed limit is materially more robust for a
    // forced diffuse boundary while leaving viscosity controlled solely by
    // sNu.  These values are numerical-profile data, not physical parameters.
    const s1 = 1.10;
    const s2 = 1.00;
    const s4 = 1.20;
    const s6 = 1.20;
    for (let y = 0; y < this.ny; y += 1) {
      for (let x = 0; x < this.nx; x += 1) {
        const cell = x + this.nx * y;
        const offset = 9 * cell;
        const f0 = this.distributions[offset] ?? 0;
        const f1 = this.distributions[offset + 1] ?? 0;
        const f2 = this.distributions[offset + 2] ?? 0;
        const f3 = this.distributions[offset + 3] ?? 0;
        const f4 = this.distributions[offset + 4] ?? 0;
        const f5 = this.distributions[offset + 5] ?? 0;
        const f6 = this.distributions[offset + 6] ?? 0;
        const f7 = this.distributions[offset + 7] ?? 0;
        const f8 = this.distributions[offset + 8] ?? 0;
        const density = this.rho[cell] ?? 1;
        const velocityX = this.ux[cell] ?? 0;
        const velocityY = this.uy[cell] ?? 0;
        const bodyFx = this.forceX[cell] ?? 0;
        const bodyFy = this.forceY[cell] ?? 0;
        const speedSquared = velocityX * velocityX + velocityY * velocityY;
        const forcePower = velocityX * bodyFx + velocityY * bodyFy;
        bodyForceImpulseX += bodyFx;
        bodyForceImpulseY += bodyFy;
        fluidBrinkmanWork += forcePower;
        rawSolidReactionWork -= bodyFx * solidVelocityX + bodyFy * solidVelocityY;
        penaltyDissipation += bodyFx * (solidVelocityX - velocityX)
          + bodyFy * (solidVelocityY - velocityY);

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

        // Guo forcing transformed into the same moment basis. Conserved
        // momentum modes receive the full source; other modes receive I-S/2.
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
          let destinationX = x + (D2Q9_CX[direction] ?? 0);
          const destinationY = wrapped(y + (D2Q9_CY[direction] ?? 0), this.ny);
          if (this.outerBoundary === "periodic") destinationX = wrapped(destinationX, this.nx);
          if (destinationX < 0 || destinationX >= this.nx) continue;
          const destinationCell = destinationX + this.nx * destinationY;
          const postValue = direction === 0 ? post0
            : direction === 1 ? post1
              : direction === 2 ? post2
                : direction === 3 ? post3
                  : direction === 4 ? post4
                    : direction === 5 ? post5
                      : direction === 6 ? post6
                        : direction === 7 ? post7
                          : post8;
          this.streamed[9 * destinationCell + direction] = postValue;
        }
      }
    }
    const algebraicWorkResidual = rawSolidReactionWork
      + fluidBrinkmanWork
      + penaltyDissipation;
    return {
      bodyForceImpulseX: finiteOrThrow(bodyForceImpulseX, "body-force impulse x"),
      bodyForceImpulseY: finiteOrThrow(bodyForceImpulseY, "body-force impulse y"),
      rawReactionImpulseX: finiteOrThrow(-bodyForceImpulseX, "raw reaction impulse x"),
      rawReactionImpulseY: finiteOrThrow(-bodyForceImpulseY, "raw reaction impulse y"),
      fluidBrinkmanWork: finiteOrThrow(fluidBrinkmanWork, "fluid Brinkman work"),
      rawSolidReactionWork: finiteOrThrow(rawSolidReactionWork, "raw solid reaction work"),
      penaltyDissipation: finiteOrThrow(penaltyDissipation, "penalty dissipation"),
      algebraicWorkResidual: finiteOrThrow(algebraicWorkResidual, "Brinkman algebraic work residual"),
      absoluteWorkScale: finiteOrThrow(
        Math.abs(rawSolidReactionWork) + Math.abs(fluidBrinkmanWork) + Math.abs(penaltyDissipation),
        "Brinkman absolute work scale",
      ),
    };
  }

  private applyZouHeBoundaries(inletVelocity: number): void {
    const rightX = this.nx - 1;
    for (let y = 0; y < this.ny; y += 1) {
      const left = 9 * (this.nx * y);
      const lf0 = this.streamed[left] ?? 0;
      const lf2 = this.streamed[left + 2] ?? 0;
      const lf3 = this.streamed[left + 3] ?? 0;
      const lf4 = this.streamed[left + 4] ?? 0;
      const lf6 = this.streamed[left + 6] ?? 0;
      const lf7 = this.streamed[left + 7] ?? 0;
      const inletDensity = (lf0 + lf2 + lf4 + 2 * (lf3 + lf6 + lf7)) / (1 - inletVelocity);
      this.streamed[left + 1] = lf3 + (2 / 3) * inletDensity * inletVelocity;
      this.streamed[left + 5] = lf7 + 0.5 * (lf4 - lf2) + (1 / 6) * inletDensity * inletVelocity;
      this.streamed[left + 8] = lf6 + 0.5 * (lf2 - lf4) + (1 / 6) * inletDensity * inletVelocity;

      const right = 9 * (rightX + this.nx * y);
      const rf0 = this.streamed[right] ?? 0;
      const rf1 = this.streamed[right + 1] ?? 0;
      const rf2 = this.streamed[right + 2] ?? 0;
      const rf4 = this.streamed[right + 4] ?? 0;
      const rf5 = this.streamed[right + 5] ?? 0;
      const rf8 = this.streamed[right + 8] ?? 0;
      const outletDensity = 1;
      const outletVelocity = -1 + (rf0 + rf2 + rf4 + 2 * (rf1 + rf5 + rf8)) / outletDensity;
      this.streamed[right + 3] = rf1 - (2 / 3) * outletDensity * outletVelocity;
      this.streamed[right + 6] = rf8 + 0.5 * (rf4 - rf2) - (1 / 6) * outletDensity * outletVelocity;
      this.streamed[right + 7] = rf5 + 0.5 * (rf2 - rf4) - (1 / 6) * outletDensity * outletVelocity;
    }
  }

  private sample(array: Float64Array, x: number, y: number): number {
    const clampedX = this.outerBoundary === "periodic"
      ? wrapped(Math.floor(x), this.nx)
      : Math.max(0, Math.min(this.nx - 1, Math.floor(x)));
    const x1 = this.outerBoundary === "periodic"
      ? wrapped(clampedX + 1, this.nx)
      : Math.min(this.nx - 1, clampedX + 1);
    const y0 = wrapped(Math.floor(y), this.ny);
    const y1 = wrapped(y0 + 1, this.ny);
    const tx = x - Math.floor(x);
    const ty = y - Math.floor(y);
    const a = array[clampedX + this.nx * y0] ?? 0;
    const b = array[x1 + this.nx * y0] ?? 0;
    const c = array[clampedX + this.nx * y1] ?? 0;
    const d = array[x1 + this.nx * y1] ?? 0;
    return (1 - ty) * ((1 - tx) * a + tx * b) + ty * ((1 - tx) * c + tx * d);
  }

  private integrateLegacyIncompleteStressContour(body: LbmBodyKinematics): { x: number; y: number } {
    const count = Math.max(96, Math.ceil(12 * Math.PI * body.radius));
    const sampleRadius = body.radius + this.maskHalfThickness + 0.75;
    const ds = 2 * Math.PI * body.radius / count;
    let forceX = 0;
    let forceY = 0;
    for (let index = 0; index < count; index += 1) {
      const angle = 2 * Math.PI * (index + 0.5) / count;
      const normalX = Math.cos(angle);
      const normalY = Math.sin(angle);
      const x = body.centerX + sampleRadius * normalX;
      const y = body.centerY + sampleRadius * normalY;
      const density = this.sample(this.rho, x, y);
      const duxDx = 0.5 * (this.sample(this.ux, x + 1, y) - this.sample(this.ux, x - 1, y));
      const duxDy = 0.5 * (this.sample(this.ux, x, y + 1) - this.sample(this.ux, x, y - 1));
      const duyDx = 0.5 * (this.sample(this.uy, x + 1, y) - this.sample(this.uy, x - 1, y));
      const duyDy = 0.5 * (this.sample(this.uy, x, y + 1) - this.sample(this.uy, x, y - 1));
      const pressure = LATTICE_SOUND_SPEED_SQUARED * (density - 1);
      const dynamicViscosity = density * this.kinematicViscosity;
      const stressXX = -pressure + 2 * dynamicViscosity * duxDx;
      const stressXY = dynamicViscosity * (duxDy + duyDx);
      const stressYY = -pressure + 2 * dynamicViscosity * duyDy;
      forceX += (stressXX * normalX + stressXY * normalY) * ds;
      forceY += (stressXY * normalX + stressYY * normalY) * ds;
    }
    return { x: forceX, y: forceY };
  }
}
