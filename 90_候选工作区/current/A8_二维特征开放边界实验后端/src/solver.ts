import {
  CS,
  CS2,
  CX,
  CY,
  OPPOSITE,
  equilibrium,
  fillRegularizedState,
  finiteState,
  macroscopic,
  nonequilibriumStress,
  regularizedNonequilibrium,
  type PrimitiveState,
  type StressTensor,
} from "./d2q9.ts";
import {
  computeRightCbc2dTargets,
  type CharacteristicDiagnostics,
} from "./characteristic-boundary.ts";

export type OutletBoundary =
  | "zou-he-pressure"
  | "regularized-fixed-pressure"
  | "cbc-2d-regularized";

export interface CircleSolid {
  centerX: number;
  centerY: number;
  radius: number;
}

export interface GridLocation {
  x: number;
  y: number;
}

export type InletVelocityProfile = (boundaryStep: number) => number;

export interface SolverOptions {
  nx: number;
  ny: number;
  relaxationTime: number;
  inletVelocity: number;
  inletVelocityProfile?: InletVelocityProfile;
  outletBoundary: OutletBoundary;
  farFieldDensity?: number;
  pressureRelaxationSigma?: number;
  transverseRelaxation?: number;
  characteristicLength?: number;
  solid?: CircleSolid;
}

export interface SolverInspection {
  step: number;
  mass: number;
  minimumDensity: number;
  maximumDensity: number;
  maximumSpeed: number;
  maximumMach: number;
  minimumDensityLocation: GridLocation;
  maximumDensityLocation: GridLocation;
  maximumSpeedLocation: GridLocation;
  appliedInletVelocity: number;
  forceX: number;
  forceY: number;
  characteristicDiagnostics: CharacteristicDiagnostics | null;
}

export interface FieldSnapshot {
  rho: Float64Array;
  ux: Float64Array;
  uy: Float64Array;
}

function wrapped(index: number, size: number): number {
  const remainder = index % size;
  return remainder < 0 ? remainder + size : remainder;
}

function requireInteger(value: number, name: string, minimum: number): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be an integer >= ${minimum}`);
  }
}

function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

export class CharacteristicOpenBoundarySolver {
  readonly nx: number;
  readonly ny: number;
  readonly cells: number;
  readonly relaxationTime: number;
  readonly omega: number;
  readonly viscosity: number;
  readonly inletVelocity: number;
  readonly outletBoundary: OutletBoundary;
  readonly farFieldDensity: number;
  readonly pressureRelaxationSigma: number;
  readonly transverseRelaxation: number;
  readonly characteristicLength: number;
  readonly solid: CircleSolid | null;

  private readonly inletVelocityProfile: InletVelocityProfile | null;
  private readonly automaticTransverseRelaxation: boolean;

  private distributions: Float64Array;
  private streamed: Float64Array;
  private readonly rho: Float64Array;
  private readonly ux: Float64Array;
  private readonly uy: Float64Array;
  private readonly solidMask: Uint8Array;
  private macrosValid = false;
  private currentStep = 0;
  private lastForceX = 0;
  private lastForceY = 0;
  private lastAppliedInletVelocity: number;
  private lastCharacteristicDiagnostics: CharacteristicDiagnostics | null = null;

  constructor(options: SolverOptions) {
    requireInteger(options.nx, "nx", 8);
    requireInteger(options.ny, "ny", 4);
    if (!(options.relaxationTime > 0.5) || !Number.isFinite(options.relaxationTime)) {
      throw new RangeError("relaxationTime must be finite and > 0.5");
    }
    if (!Number.isFinite(options.inletVelocity) || Math.abs(options.inletVelocity) >= 0.2) {
      throw new RangeError("inletVelocity must be finite and |u| < 0.2");
    }
    this.nx = options.nx;
    this.ny = options.ny;
    this.cells = this.nx * this.ny;
    this.relaxationTime = options.relaxationTime;
    this.omega = 1 / this.relaxationTime;
    this.viscosity = CS2 * (this.relaxationTime - 0.5);
    this.inletVelocity = options.inletVelocity;
    this.inletVelocityProfile = options.inletVelocityProfile ?? null;
    this.outletBoundary = options.outletBoundary;
    this.farFieldDensity = options.farFieldDensity ?? 1;
    this.pressureRelaxationSigma = options.pressureRelaxationSigma ?? 0.9;
    this.automaticTransverseRelaxation = options.transverseRelaxation === undefined;
    this.transverseRelaxation = options.transverseRelaxation
      ?? Math.abs(this.inletVelocity) / CS;
    this.characteristicLength = options.characteristicLength ?? this.nx;
    this.solid = options.solid ?? null;
    this.distributions = new Float64Array(9 * this.cells);
    this.streamed = new Float64Array(9 * this.cells);
    this.rho = new Float64Array(this.cells);
    this.ux = new Float64Array(this.cells);
    this.uy = new Float64Array(this.cells);
    this.solidMask = new Uint8Array(this.cells);
    this.lastAppliedInletVelocity = this.velocityAtBoundaryStep(0);
    this.buildSolidMask();
    this.initializeUniform();
  }

  get stepNumber(): number {
    return this.currentStep;
  }

  initializeUniform(): void {
    this.initializeField(() => ({
      rho: this.farFieldDensity,
      ux: this.inletVelocity,
      uy: 0,
    }));
  }

  initializeField(field: (x: number, y: number) => PrimitiveState): void {
    for (let y = 0; y < this.ny; y += 1) {
      for (let x = 0; x < this.nx; x += 1) {
        const cell = x + this.nx * y;
        const offset = 9 * cell;
        const state = this.solidMask[cell] === 1
          ? { rho: this.farFieldDensity, ux: 0, uy: 0 }
          : field(x, y);
        if (!finiteState(state)) throw new RangeError(`invalid initial state at (${x},${y})`);
        for (let direction = 0; direction < 9; direction += 1) {
          this.distributions[offset + direction] = equilibrium(
            direction,
            state.rho,
            state.ux,
            state.uy,
          );
        }
      }
    }
    this.streamed.fill(0);
    this.currentStep = 0;
    this.lastForceX = 0;
    this.lastForceY = 0;
    this.lastAppliedInletVelocity = this.velocityAtBoundaryStep(0);
    this.lastCharacteristicDiagnostics = null;
    this.macrosValid = false;
  }

  step(): void {
    this.computeMacros();
    const appliedInletVelocity = this.velocityAtBoundaryStep(this.currentStep + 1);
    let cbcTargets: PrimitiveState[] | null = null;
    if (this.outletBoundary === "cbc-2d-regularized") {
      const result = computeRightCbc2dTargets(
        this.nx,
        this.ny,
        this.rho,
        this.ux,
        this.uy,
        {
          farFieldDensity: this.farFieldDensity,
          meanStreamwiseVelocity: appliedInletVelocity,
          characteristicLength: this.characteristicLength,
          pressureRelaxationSigma: this.pressureRelaxationSigma,
          transverseRelaxation: this.automaticTransverseRelaxation
            ? Math.abs(appliedInletVelocity) / CS
            : this.transverseRelaxation,
        },
      );
      cbcTargets = result.states;
      this.lastCharacteristicDiagnostics = result.diagnostics;
    } else {
      this.lastCharacteristicDiagnostics = null;
    }

    this.collideAndStream();
    this.applyRegularizedInlet(appliedInletVelocity);
    if (this.outletBoundary === "zou-he-pressure") {
      this.applyZouHePressureOutlet();
    } else if (this.outletBoundary === "regularized-fixed-pressure") {
      this.applyRegularizedFixedPressureOutlet();
    } else {
      if (cbcTargets === null) throw new Error("CBC target state was not computed");
      this.applyRegularizedOutlet(cbcTargets);
    }

    const previous = this.distributions;
    this.distributions = this.streamed;
    this.streamed = previous;
    this.currentStep += 1;
    this.lastAppliedInletVelocity = appliedInletVelocity;
    this.macrosValid = false;
  }

  run(steps: number): void {
    requireInteger(steps, "steps", 0);
    for (let step = 0; step < steps; step += 1) this.step();
  }

  snapshot(): FieldSnapshot {
    this.computeMacros();
    return {
      rho: this.rho.slice(),
      ux: this.ux.slice(),
      uy: this.uy.slice(),
    };
  }

  inspect(): SolverInspection {
    this.computeMacros();
    let mass = 0;
    let minimumDensity = Number.POSITIVE_INFINITY;
    let maximumDensity = Number.NEGATIVE_INFINITY;
    let maximumSpeed = 0;
    let minimumDensityLocation: GridLocation = { x: 0, y: 0 };
    let maximumDensityLocation: GridLocation = { x: 0, y: 0 };
    let maximumSpeedLocation: GridLocation = { x: 0, y: 0 };
    for (let cell = 0; cell < this.cells; cell += 1) {
      if (this.solidMask[cell] === 1) continue;
      const density = this.rho[cell] ?? 0;
      const speed = Math.hypot(this.ux[cell] ?? 0, this.uy[cell] ?? 0);
      const location = { x: cell % this.nx, y: Math.floor(cell / this.nx) };
      mass += density;
      if (density < minimumDensity) {
        minimumDensity = density;
        minimumDensityLocation = location;
      }
      if (density > maximumDensity) {
        maximumDensity = density;
        maximumDensityLocation = location;
      }
      if (speed > maximumSpeed) {
        maximumSpeed = speed;
        maximumSpeedLocation = location;
      }
    }
    requireFinite(mass, "mass");
    requireFinite(minimumDensity, "minimumDensity");
    requireFinite(maximumDensity, "maximumDensity");
    requireFinite(maximumSpeed, "maximumSpeed");
    return {
      step: this.currentStep,
      mass,
      minimumDensity,
      maximumDensity,
      maximumSpeed,
      maximumMach: maximumSpeed / CS,
      minimumDensityLocation,
      maximumDensityLocation,
      maximumSpeedLocation,
      appliedInletVelocity: this.lastAppliedInletVelocity,
      forceX: this.lastForceX,
      forceY: this.lastForceY,
      characteristicDiagnostics: this.lastCharacteristicDiagnostics,
    };
  }

  sampleDensity(x: number, y: number): number {
    this.computeMacros();
    return this.rho[this.cellIndex(x, y)] ?? this.farFieldDensity;
  }

  sampleVelocity(x: number, y: number): { ux: number; uy: number } {
    this.computeMacros();
    const cell = this.cellIndex(x, y);
    return { ux: this.ux[cell] ?? 0, uy: this.uy[cell] ?? 0 };
  }

  isSolid(x: number, y: number): boolean {
    return this.solidMask[this.cellIndex(x, y)] === 1;
  }

  private cellIndex(x: number, y: number): number {
    const clampedX = Math.max(0, Math.min(this.nx - 1, Math.trunc(x)));
    const wrappedY = wrapped(Math.trunc(y), this.ny);
    return clampedX + this.nx * wrappedY;
  }

  private buildSolidMask(): void {
    this.solidMask.fill(0);
    if (this.solid === null) return;
    for (let y = 0; y < this.ny; y += 1) {
      for (let x = 0; x < this.nx; x += 1) {
        const dx = x - this.solid.centerX;
        const dyRaw = Math.abs(y - this.solid.centerY);
        const dy = Math.min(dyRaw, this.ny - dyRaw);
        if (Math.hypot(dx, dy) <= this.solid.radius) {
          this.solidMask[x + this.nx * y] = 1;
        }
      }
    }
  }

  private computeMacros(): void {
    if (this.macrosValid) return;
    for (let cell = 0; cell < this.cells; cell += 1) {
      if (this.solidMask[cell] === 1) {
        this.rho[cell] = this.farFieldDensity;
        this.ux[cell] = 0;
        this.uy[cell] = 0;
        continue;
      }
      const state = macroscopic(this.distributions, 9 * cell);
      this.rho[cell] = state.rho;
      this.ux[cell] = state.ux;
      this.uy[cell] = state.uy;
    }
    this.macrosValid = true;
  }

  private collideAndStream(): void {
    this.streamed.fill(0);
    let forceX = 0;
    let forceY = 0;
    const post = new Float64Array(9);
    for (let y = 0; y < this.ny; y += 1) {
      for (let x = 0; x < this.nx; x += 1) {
        const cell = x + this.nx * y;
        if (this.solidMask[cell] === 1) continue;
        const offset = 9 * cell;
        const state = {
          rho: this.rho[cell] ?? this.farFieldDensity,
          ux: this.ux[cell] ?? 0,
          uy: this.uy[cell] ?? 0,
        };
        const stress = nonequilibriumStress(this.distributions, offset, state);
        for (let direction = 0; direction < 9; direction += 1) {
          post[direction] = equilibrium(direction, state.rho, state.ux, state.uy)
            + (1 - this.omega) * regularizedNonequilibrium(direction, stress);
        }
        for (let direction = 0; direction < 9; direction += 1) {
          const value = post[direction] ?? 0;
          const destinationX = x + (CX[direction] ?? 0);
          const destinationY = wrapped(y + (CY[direction] ?? 0), this.ny);
          if (destinationX < 0 || destinationX >= this.nx) continue;
          const destinationCell = destinationX + this.nx * destinationY;
          if (this.solidMask[destinationCell] === 1) {
            const opposite = OPPOSITE[direction] ?? 0;
            const reflectedIndex = offset + opposite;
            this.streamed[reflectedIndex] = (this.streamed[reflectedIndex] ?? 0) + value;
            forceX += 2 * value * (CX[direction] ?? 0);
            forceY += 2 * value * (CY[direction] ?? 0);
          } else {
            const destinationIndex = 9 * destinationCell + direction;
            this.streamed[destinationIndex] = (this.streamed[destinationIndex] ?? 0) + value;
          }
        }
      }
    }
    this.lastForceX = forceX;
    this.lastForceY = forceY;
  }

  private applyRegularizedInlet(inletVelocity: number): void {
    const targets = Array.from({ length: this.ny }, () => ({
      rho: this.farFieldDensity,
      ux: inletVelocity,
      uy: 0,
    }));
    this.applyRegularizedBoundary(0, targets, "left");
  }

  private applyRegularizedFixedPressureOutlet(): void {
    const targets: PrimitiveState[] = [];
    const interiorX = this.nx - 2;
    for (let y = 0; y < this.ny; y += 1) {
      const cell = interiorX + this.nx * y;
      targets.push({
        rho: this.farFieldDensity,
        ux: this.ux[cell] ?? this.lastAppliedInletVelocity,
        uy: this.uy[cell] ?? 0,
      });
    }
    this.applyRegularizedOutlet(targets);
  }

  private applyRegularizedOutlet(targets: PrimitiveState[]): void {
    this.applyRegularizedBoundary(this.nx - 1, targets, "right");
  }

  private applyRegularizedBoundary(
    x: number,
    targets: PrimitiveState[],
    side: "left" | "right",
  ): void {
    if (targets.length !== this.ny) throw new RangeError("boundary target length mismatch");
    const targetUx = Float64Array.from(targets, (state) => state.ux);
    const targetUy = Float64Array.from(targets, (state) => state.uy);
    for (let y = 0; y < this.ny; y += 1) {
      const state = targets[y];
      if (state === undefined || !finiteState(state)) {
        throw new RangeError(`invalid regularized boundary target at y=${y}`);
      }
      const yLower = (y - 1 + this.ny) % this.ny;
      const yUpper = (y + 1) % this.ny;
      const dudy = 0.5 * ((targetUx[yUpper] ?? 0) - (targetUx[yLower] ?? 0));
      const dvdy = 0.5 * ((targetUy[yUpper] ?? 0) - (targetUy[yLower] ?? 0));
      let dudx: number;
      let dvdx: number;
      if (side === "right") {
        const first = this.nx - 2 + this.nx * y;
        const second = this.nx - 3 + this.nx * y;
        dudx = 0.5 * (3 * state.ux - 4 * (this.ux[first] ?? state.ux) + (this.ux[second] ?? state.ux));
        dvdx = 0.5 * (3 * state.uy - 4 * (this.uy[first] ?? state.uy) + (this.uy[second] ?? state.uy));
      } else {
        const first = 1 + this.nx * y;
        const second = 2 + this.nx * y;
        dudx = 0.5 * (-3 * state.ux + 4 * (this.ux[first] ?? state.ux) - (this.ux[second] ?? state.ux));
        dvdx = 0.5 * (-3 * state.uy + 4 * (this.uy[first] ?? state.uy) - (this.uy[second] ?? state.uy));
      }
      const stress: StressTensor = {
        xx: -2 * state.rho * CS2 * this.relaxationTime * dudx,
        xy: -state.rho * CS2 * this.relaxationTime * (dudy + dvdx),
        yy: -2 * state.rho * CS2 * this.relaxationTime * dvdy,
      };
      fillRegularizedState(this.streamed, 9 * (x + this.nx * y), state, stress);
    }
  }

  private applyZouHePressureOutlet(): void {
    const x = this.nx - 1;
    const rho = this.farFieldDensity;
    for (let y = 0; y < this.ny; y += 1) {
      const offset = 9 * (x + this.nx * y);
      const f0 = this.streamed[offset] ?? 0;
      const f1 = this.streamed[offset + 1] ?? 0;
      const f2 = this.streamed[offset + 2] ?? 0;
      const f4 = this.streamed[offset + 4] ?? 0;
      const f5 = this.streamed[offset + 5] ?? 0;
      const f8 = this.streamed[offset + 8] ?? 0;
      const ux = -1 + (f0 + f2 + f4 + 2 * (f1 + f5 + f8)) / rho;
      this.streamed[offset + 3] = f1 - (2 / 3) * rho * ux;
      this.streamed[offset + 6] = f8 + 0.5 * (f4 - f2) - (1 / 6) * rho * ux;
      this.streamed[offset + 7] = f5 + 0.5 * (f2 - f4) - (1 / 6) * rho * ux;
    }
  }

  private velocityAtBoundaryStep(boundaryStep: number): number {
    const velocity = this.inletVelocityProfile === null
      ? this.inletVelocity
      : this.inletVelocityProfile(boundaryStep);
    if (!Number.isFinite(velocity) || Math.abs(velocity) >= 0.2) {
      throw new RangeError(
        `inlet velocity profile returned invalid value at step ${boundaryStep}`,
      );
    }
    return velocity;
  }
}
