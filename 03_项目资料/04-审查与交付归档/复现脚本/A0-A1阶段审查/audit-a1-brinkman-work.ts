#!/usr/bin/env -S npx vite-node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  D2Q9MrtBrinkmanSolver,
  type LbmBodyKinematics,
} from "../src/solvers/highFidelity/lbm";

const outputCsv = resolve(process.argv[2] ?? "artifacts/a1/brinkman-work-identity.csv");
const outputJson = resolve(process.argv[3] ?? "artifacts/a1/brinkman-work-identity.json");
const solver = new D2Q9MrtBrinkmanSolver({
  nx: 96,
  ny: 64,
  relaxationTime: 0.71,
  penalizationTimeSteps: 1.7,
  outerBoundary: "periodic",
});
solver.initializeField((x, y) => ({
  ux: 0.026 + 0.004 * Math.sin(2 * Math.PI * y / 64),
  uy: 0.003 * Math.cos(2 * Math.PI * x / 96),
}));

const columns = [
  "step", "bodyVelocityX", "bodyVelocityY",
  "legacyReactionX", "legacyReactionY",
  "rawReactionImpulseX", "rawReactionImpulseY",
  "fluidBrinkmanWork", "rawSolidReactionWork", "penaltyDissipation",
  "algebraicWorkResidual", "absoluteWorkScale", "relativeResidual",
  "threshold100Epsilon", "appliedReactionExact", "identityPass",
] as const;
const rows: string[] = [columns.join(",")];
let maximumAbsoluteResidual = 0;
let maximumRelativeResidual = 0;
let allAppliedReactionsExact = true;
let allIdentitiesPass = true;
const steps = 192;
for (let step = 0; step < steps; step += 1) {
  const phase = 2 * Math.PI * step / 80;
  const body: LbmBodyKinematics = {
    centerX: 31.4 + 0.15 * Math.cos(phase),
    centerY: 31.2 + 0.2 * Math.sin(phase),
    radius: 6,
    velocityX: -0.15 * (2 * Math.PI / 80) * Math.sin(phase),
    velocityY: 0.2 * (2 * Math.PI / 80) * Math.cos(phase),
  };
  const legacy = solver.penaltyReaction(body);
  const exchange = solver.step(body, 0);
  const relativeResidual = Math.abs(exchange.algebraicWorkResidual)
    / Math.max(exchange.absoluteWorkScale, Number.MIN_VALUE);
  const threshold = 100 * Number.EPSILON * Math.max(
    exchange.absoluteWorkScale,
    Number.MIN_VALUE,
  );
  const appliedReactionExact = exchange.rawReactionImpulseX === legacy.x
    && exchange.rawReactionImpulseY === legacy.y;
  const identityPass = Math.abs(exchange.algebraicWorkResidual) <= threshold;
  maximumAbsoluteResidual = Math.max(
    maximumAbsoluteResidual,
    Math.abs(exchange.algebraicWorkResidual),
  );
  maximumRelativeResidual = Math.max(maximumRelativeResidual, relativeResidual);
  allAppliedReactionsExact &&= appliedReactionExact;
  allIdentitiesPass &&= identityPass;
  rows.push([
    step + 1,
    body.velocityX,
    body.velocityY,
    legacy.x,
    legacy.y,
    exchange.rawReactionImpulseX,
    exchange.rawReactionImpulseY,
    exchange.fluidBrinkmanWork,
    exchange.rawSolidReactionWork,
    exchange.penaltyDissipation,
    exchange.algebraicWorkResidual,
    exchange.absoluteWorkScale,
    relativeResidual,
    threshold,
    appliedReactionExact,
    identityPass,
  ].join(","));
}
const passed = allAppliedReactionsExact && allIdentitiesPass;
const summary = {
  format: "VP-CFD2D-A1-BRINKMAN-WORK-AUDIT-v1",
  createdAt: new Date().toISOString(),
  status: passed ? "PASS" : "STOP-BRINKMAN-ALGEBRA",
  forceContractId: "VP-CFD2D-RAW-BRINKMAN-A1-v1",
  testScope: "moving diffuse circular body in deterministic periodic nonuniform flow",
  steps,
  threshold: "abs(residual) <= 100*epsilon*sum(abs(work terms))",
  allAppliedReactionsExact,
  allIdentitiesPass,
  maximumAbsoluteResidual,
  maximumRelativeResidual,
  csv: outputCsv,
  claimsNotEstablished: [
    "physical-hydrodynamic-force",
    "virtual-internal-fluid-correction",
    "control-volume-force-agreement",
    "apparatus-trend",
  ],
};
await mkdir(dirname(outputCsv), { recursive: true });
await mkdir(dirname(outputJson), { recursive: true });
await writeFile(outputCsv, `${rows.join("\n")}\n`, "utf8");
await writeFile(outputJson, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (!passed) process.exitCode = 2;
