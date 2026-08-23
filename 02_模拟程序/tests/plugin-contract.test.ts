import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ProblemPlugin } from "../src/core/plugin";
import { ProblemRegistry } from "../src/core/registry";
import { DEFAULT_CONFIG } from "../src/core/config";
import type { SimulationSample } from "../src/core/types";
import {
  registerVortexPendulum,
  VORTEX_PENDULUM_PLUGIN,
} from "../src/problems/vortex-pendulum";

interface MockConfig extends Record<string, unknown> {
  problemId: "mock-spring";
  schemaVersion: "1.0.0";
  backend: "analytic";
  stiffness: number;
}

interface MockSample {
  time: number;
  extension: number;
}

const mockPlugin: ProblemPlugin<MockConfig, MockSample, Readonly<Record<string, number>>, "analytic"> = {
  manifest: {
    id: "mock-spring",
    version: "0.1.0",
    configSchemaVersion: "1.0.0",
    title: "Mock spring",
    shortTitle: "Spring",
    description: "Minimal non-pendulum contract fixture.",
    competition: { name: "Contract tests", year: 2027, problemNumber: 1 },
    tags: ["mock"],
  },
  parameters: [{
    path: "stiffness",
    label: "Stiffness",
    unit: "N/m",
    category: "spring",
    valueType: "number",
    min: 0,
    max: 100,
    step: 1,
    description: "Hooke-law stiffness.",
  }],
  observables: [{
    id: "force",
    label: "Force",
    unit: "N",
    kind: "time-series",
    experimental: true,
    description: "Spring force.",
  }],
  backends: [{
    id: "analytic",
    label: "Analytic",
    description: "Hooke law.",
    fidelity: "forward",
    researchLayers: [1, 3],
    capabilities: {
      pauseResume: false,
      streamingSamples: false,
      fieldFrames: false,
      parameterSweep: true,
      deterministicSeed: true,
    },
    limitations: [],
  }],
  createDefaultConfig: () => ({
    problemId: "mock-spring",
    schemaVersion: "1.0.0",
    backend: "analytic",
    stiffness: 12,
  }),
  validateConfig: (config) => config.stiffness > 0
    ? []
    : [{ severity: "error", path: "stiffness", message: "Must be positive" }],
  observe: (sample, config) => ({ force: config.stiffness * sample.extension }),
};

function sampleFixture(): SimulationSample {
  return {
    time: 1.5,
    theta: 0.12,
    omega: -0.3,
    angularAcceleration: 0.4,
    observationRadius: 0.13,
    displacement: 0.041,
    velocity: -0.1,
    wakeReal: 0.8,
    wakeImaginary: 0.2,
    wakeAmplitude: Math.hypot(0.8, 0.2),
    wakePhase: Math.atan2(0.2, 0.8),
    liftCoefficient: 0.6,
    dragCoefficient: 1.1,
    liftTorque: 0.01,
    dragTorque: -0.002,
    pitchingTorque: 0,
    fluidTorque: 0.008,
    buoyancyTorque: -0.001,
    controlTorque: 0,
    sectionalLift: null,
    sectionalDrag: null,
    lineForceX: null,
    lineForceY: null,
    linePower2d: null,
    stripTorqueDensity: null,
    stressLineForceX: null,
    stressLineForceY: null,
    forcePathRelativeDifference: null,
    interfaceExchange: null,
    fluidPower: 0.002,
    dampingPower: 0.001,
    controlPower: 0,
    kineticEnergy: 0.01,
    gravitationalPotential: 0.01,
    hydrostaticPotential: 0.005,
    elasticPotential: 0.005,
    mechanicalEnergy: 0.03,
    effectiveInertia: 0.0031,
    addedInertia: 0.0001,
    displacedVolume: 2e-6,
    projectedWetArea: 0.0006,
    axisWetLength: 0.06,
    volumeEquivalentWetLength: 0.058,
    flowSpeed: 0.017,
    reynolds: 101.6,
    wetBranch: "partial",
  };
}

describe("problem plugin contract", () => {
  it("registers two unrelated plugins without problem-specific registry logic", () => {
    const registry = new ProblemRegistry();
    registerVortexPendulum(registry);
    registry.register(mockPlugin);

    expect(registry.list().map((plugin) => plugin.manifest.id)).toEqual([
      "iypt-2027-vortex-pendulum",
      "mock-spring",
    ]);
    expect(registry.require("mock-spring").backends[0]?.id).toBe("analytic");
    expect(mockPlugin.observe({ time: 0, extension: 0.25 }, mockPlugin.createDefaultConfig()))
      .toEqual({ force: 3 });
  });

  it("rejects duplicate registrations", () => {
    const registry = new ProblemRegistry();
    registry.register(mockPlugin);
    expect(() => registry.register(mockPlugin)).toThrow(/already registered/);
  });

  it("declares both research backends and maps solver state through H[X]", () => {
    expect(VORTEX_PENDULUM_PLUGIN.backends.map((backend) => backend.id))
      .toEqual(["forward", "highFidelity"]);
    expect(VORTEX_PENDULUM_PLUGIN.backends.find((backend) => backend.id === "highFidelity")
      ?.capabilities.fieldFrames).toBe(true);

    const observation = VORTEX_PENDULUM_PLUGIN.observe(sampleFixture(), DEFAULT_CONFIG);
    expect(observation).toMatchObject({
      time: 1.5,
      theta: 0.12,
      displacement: 0.041,
      liftCoefficient: 0.6,
      mechanicalEnergy: 0.03,
    });
    expect(Object.keys(observation).sort()).toEqual(
      VORTEX_PENDULUM_PLUGIN.observables.map((item) => item.id).sort(),
    );
  });

  it("describes every numeric default-config input without changing core config types", () => {
    const numericPaths: string[] = [];
    const visit = (value: unknown, prefix = ""): void => {
      if (typeof value === "number") {
        numericPaths.push(prefix);
        return;
      }
      if (typeof value !== "object" || value === null) return;
      for (const [key, child] of Object.entries(value)) {
        visit(child, prefix ? `${prefix}.${key}` : key);
      }
    };
    visit(DEFAULT_CONFIG);

    expect(VORTEX_PENDULUM_PLUGIN.parameters.map((parameter) => parameter.path).sort())
      .toEqual([...numericPaths, "cfd2d.couplingMode", "cfd2d.stripClosure"].sort());
  });

  it("keeps the downloadable default config equal to the executable default", async () => {
    const path = fileURLToPath(new URL("../public/examples/vortex-pendulum-default.json", import.meta.url));
    const diskConfig = JSON.parse(await readFile(path, "utf8"));
    expect(diskConfig).toEqual(DEFAULT_CONFIG);
    expect(VORTEX_PENDULUM_PLUGIN.createDefaultConfig()).toEqual(DEFAULT_CONFIG);
    expect(VORTEX_PENDULUM_PLUGIN.createDefaultConfig()).not.toBe(DEFAULT_CONFIG);
  });

  it("publishes a CSV template whose measurable columns match the shared data interface", async () => {
    const path = fileURLToPath(new URL("../public/examples/vortex-pendulum-experiment-template.csv", import.meta.url));
    const [header, ...rows] = (await readFile(path, "utf8")).trim().split(/\r?\n/);
    expect(header).toBe("runId,time,theta,displacement,sigma");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.split(",").length === 5)).toBe(true);
    expect(VORTEX_PENDULUM_PLUGIN.observables.find((item) => item.id === "theta")?.experimental).toBe(true);
    expect(VORTEX_PENDULUM_PLUGIN.observables.find((item) => item.id === "displacement")?.experimental).toBe(true);
  });
});
