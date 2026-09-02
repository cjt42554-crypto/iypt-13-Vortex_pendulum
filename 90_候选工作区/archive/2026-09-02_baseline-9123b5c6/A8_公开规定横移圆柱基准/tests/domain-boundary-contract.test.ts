import test from "node:test";
import assert from "node:assert/strict";
import {
  DOMAIN_AUDIT_MASK_HALF_THICKNESSES,
  DOMAIN_GEOMETRY_VARIANTS,
  SOURCE_DOMAIN_GEOMETRY,
  domainGeometryDefinitions,
} from "../src/domain-boundary-contract.ts";
import {
  resolveFixedCylinderGeometry,
} from "../src/fixed-cylinder-geometry.ts";

test("domain audit is a complete paired-mask geometry product", () => {
  const definitions = domainGeometryDefinitions("research");
  assert.equal(
    definitions.length,
    DOMAIN_AUDIT_MASK_HALF_THICKNESSES.length * DOMAIN_GEOMETRY_VARIANTS.length,
  );
  assert.equal(new Set(definitions.map((item) => item.id)).size, definitions.length);
  for (const mask of DOMAIN_AUDIT_MASK_HALF_THICKNESSES) {
    for (const geometry of DOMAIN_GEOMETRY_VARIANTS) {
      assert.equal(definitions.some((item) => (
        item.maskHalfThickness === mask
          && item.domainLengthDiameters === geometry.domainLengthDiameters
          && item.domainWidthDiameters === geometry.domainWidthDiameters
          && item.upstreamDiameters === geometry.upstreamDiameters
      )), true);
    }
  }
});

test("each nonbaseline geometry changes one clearance axis", () => {
  for (const geometry of DOMAIN_GEOMETRY_VARIANTS) {
    const downstream = geometry.domainLengthDiameters - geometry.upstreamDiameters;
    const sourceDownstream = SOURCE_DOMAIN_GEOMETRY.domainLengthDiameters
      - SOURCE_DOMAIN_GEOMETRY.upstreamDiameters;
    if (geometry.axis === "baseline") {
      assert.deepEqual(geometry, SOURCE_DOMAIN_GEOMETRY);
    } else if (geometry.axis === "crossflow-width") {
      assert.equal(geometry.domainLengthDiameters, SOURCE_DOMAIN_GEOMETRY.domainLengthDiameters);
      assert.equal(geometry.upstreamDiameters, SOURCE_DOMAIN_GEOMETRY.upstreamDiameters);
    } else if (geometry.axis === "outlet-distance") {
      assert.equal(geometry.upstreamDiameters, SOURCE_DOMAIN_GEOMETRY.upstreamDiameters);
      assert.ok(downstream > sourceDownstream);
    } else if (geometry.axis === "inlet-distance") {
      assert.ok(geometry.upstreamDiameters > SOURCE_DOMAIN_GEOMETRY.upstreamDiameters);
      assert.equal(downstream, sourceDownstream);
    }
  }
});

test("fixed runner resolves default and custom geometry without changing baseline", () => {
  assert.deepEqual(resolveFixedCylinderGeometry({ diameterCells: 16 }), {
    domainLengthDiameters: 23,
    domainWidthDiameters: 10,
    upstreamDiameters: 3.5,
    downstreamDiameters: 19.5,
    nx: 368,
    ny: 160,
  });
  assert.deepEqual(resolveFixedCylinderGeometry({
    diameterCells: 16,
    domainLengthDiameters: 26.5,
    domainWidthDiameters: 20,
    upstreamDiameters: 7,
  }), {
    domainLengthDiameters: 26.5,
    domainWidthDiameters: 20,
    upstreamDiameters: 7,
    downstreamDiameters: 19.5,
    nx: 424,
    ny: 320,
  });
});

test("fixed runner rejects nonintegral or impossible geometry", () => {
  assert.throws(() => resolveFixedCylinderGeometry({
    diameterCells: 15,
    domainLengthDiameters: 26.5,
  }), /positive integer grid/);
  assert.throws(() => resolveFixedCylinderGeometry({
    diameterCells: 16,
    domainLengthDiameters: 3,
    upstreamDiameters: 3.5,
  }), /positive integer grid/);
});
