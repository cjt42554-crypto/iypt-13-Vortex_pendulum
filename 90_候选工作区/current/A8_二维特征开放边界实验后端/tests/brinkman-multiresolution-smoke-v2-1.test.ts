import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { BRINKMAN_MULTIRESOLUTION_V2P1_CONTRACT as CONTRACT } from
  "../src/brinkman-multiresolution-contract-v2-1.ts";
import {
  BRINKMAN_MULTIRESOLUTION_V2P1_EXECUTION_SCOPES as EXECUTION_SCOPES,
  assertBrinkmanMultiresolutionV2P1ExecutionAuthorized,
} from "../src/brinkman-multiresolution-p1-v2-1.ts";
import {
  BRINKMAN_MULTIRESOLUTION_V2P1_SMOKE_ACCEPTED_STEPS,
  buildBrinkmanMultiresolutionV2P1SmokeRequests,
  runBrinkmanMultiresolutionV2P1SmokeCase,
  runDualBrinkmanMultiresolutionV2P1Smoke,
  type BrinkmanMultiresolutionV2P1SmokeCaseResult,
  type BrinkmanMultiresolutionV2P1SmokeRequest,
} from "../src/brinkman-multiresolution-smoke-v2-1.ts";
import {
  SMOKE_EVIDENCE_RELATIVE_PATH,
  SMOKE_SIDECAR_RELATIVE_PATH,
} from "../scripts/brinkman-multiresolution-smoke-artifact-v2-1.mjs";

const PACKAGE_ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const SMOKE_RUNNER = resolve(
  PACKAGE_ROOT,
  "scripts/run-brinkman-multiresolution-smoke-v2-1.mjs",
);

test("A8R v2.1 smoke plan is exactly two frozen D24 mask-0.75 40-step cases", () => {
  assert.equal(BRINKMAN_MULTIRESOLUTION_V2P1_SMOKE_ACCEPTED_STEPS, 40);
  const requests = buildBrinkmanMultiresolutionV2P1SmokeRequests();
  assert.equal(requests.length, 2);
  assert.deepEqual(
    requests.map((request) => [request.scope, request.bodyKind]),
    [
      [EXECUTION_SCOPES.forcedFixedCylinderSmoke40, "fixed-cylinder"],
      [EXECUTION_SCOPES.unforcedBodyNullSmoke40, "null"],
    ],
  );
  for (const request of requests) {
    assert.equal(request.acceptedSteps, 40);
    assert.equal(request.definition.diameterCells, 24);
    assert.equal(request.definition.maskHalfThicknessCells, 0.75);
    assert.equal(request.definition.penalizationTimeSteps, 1);
    assert.equal(request.definition.phaseId, "baseline");
    assert.equal(request.definition.bodyPhaseOffsetYCells,
      CONTRACT.carrier.baselineBodyPhaseOffsetYCells);
    assert.equal(CONTRACT.carrier.latticeVelocity, 0.05);
  }
});

test("A8R v2.1 smoke plan rejects every step count other than exactly 40", () => {
  for (const value of [0, 1, 39, 41, 400, Number.NaN]) {
    assert.throws(
      () => buildBrinkmanMultiresolutionV2P1SmokeRequests(value),
      /requires exactly 40 accepted steps/,
    );
  }
});

test("A8R v2.1 smoke case adapter rejects a source-definition override before execution", () => {
  const request = buildBrinkmanMultiresolutionV2P1SmokeRequests()[0];
  assert.ok(request !== undefined);
  const altered = {
    ...request,
    definition: { ...request.definition, diameterCells: 36 },
  };
  assert.throws(
    () => runBrinkmanMultiresolutionV2P1SmokeCase(
      altered as unknown as BrinkmanMultiresolutionV2P1SmokeRequest,
    ),
    /definition value differs from frozen: diameterCells/,
  );
});

test("A8R v2.1 dual orchestration invokes two separate case executions", () => {
  const requests = [];
  const results = runDualBrinkmanMultiresolutionV2P1Smoke((request) => {
    requests.push(request);
    return {
      syntheticFreshExecutionIdentity: {},
      request,
    } as unknown as BrinkmanMultiresolutionV2P1SmokeCaseResult;
  });
  assert.equal(requests.length, 2);
  assert.notEqual(results[0], results[1]);
  assert.notEqual(
    (results[0] as unknown as { syntheticFreshExecutionIdentity: object })
      .syntheticFreshExecutionIdentity,
    (results[1] as unknown as { syntheticFreshExecutionIdentity: object })
      .syntheticFreshExecutionIdentity,
  );
});

test("A8R v2.1 environment values cannot unlock RESEARCH_MATRIX", () => {
  const previous = process.env.A8R_V2P1_SCOPE;
  process.env.A8R_V2P1_SCOPE = EXECUTION_SCOPES.forcedFixedCylinderSmoke40;
  try {
    assert.throws(
      () => assertBrinkmanMultiresolutionV2P1ExecutionAuthorized(
        EXECUTION_SCOPES.researchMatrix,
      ),
      /RESEARCH_MATRIX is not authorized/,
    );
  } finally {
    if (previous === undefined) delete process.env.A8R_V2P1_SCOPE;
    else process.env.A8R_V2P1_SCOPE = previous;
  }
});

test("A8R v2.1 smoke source is independent from the full research case", async () => {
  const source = await readFile(
    new URL("../src/brinkman-multiresolution-smoke-v2-1.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /runBrinkmanMultiresolutionV2P1Case/);
  assert.doesNotMatch(source, /process\.env|process\.argv/);
  const gatePosition = source.indexOf(
    "assertBrinkmanMultiresolutionV2P1ExecutionAuthorized(request.scope)",
  );
  const constructorPosition = source.indexOf("new D2Q9MrtBrinkmanSolver({");
  const stepLoopPosition = source.indexOf(
    "index < request.acceptedSteps",
  );
  assert.ok(gatePosition >= 0);
  assert.ok(constructorPosition > gatePosition);
  assert.ok(stepLoopPosition > constructorPosition);
  assert.doesNotMatch(source, /\.restore\s*\(/);
});

test("A8R v2.1 smoke CLI and artifact paths reject overrides", async () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", SMOKE_RUNNER, "override.json"],
    { cwd: PACKAGE_ROOT, encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /accepts no CLI arguments or output overrides/);
  assert.equal(
    SMOKE_EVIDENCE_RELATIVE_PATH,
    "验证与复现/smoke/a8r-v2p1-formal-dual-40-step-smoke.json",
  );
  assert.equal(
    SMOKE_SIDECAR_RELATIVE_PATH,
    "验证与复现/smoke/a8r-v2p1-formal-dual-40-step-smoke.sha256",
  );
  assert.notEqual(SMOKE_EVIDENCE_RELATIVE_PATH, CONTRACT.artifact.relativePath);

  const packageJson = JSON.parse(await readFile(
    new URL("../package.json", import.meta.url),
    "utf8",
  ));
  assert.equal(
    packageJson.scripts["brinkman-multiresolution-v2-1-smoke"],
    "node --experimental-strip-types scripts/run-brinkman-multiresolution-smoke-v2-1.mjs",
  );
  assert.equal(
    packageJson.scripts["assert:brinkman-multiresolution-v2-1-smoke"],
    "node --experimental-strip-types scripts/assert-brinkman-multiresolution-smoke-v2-1.mjs",
  );
});
