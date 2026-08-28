/** Frozen before the first A8Q result-bearing execution. */
export const BRINKMAN_SCALING_DIAMETERS = Object.freeze([16, 24] as const);

export const BRINKMAN_SCALING_MASK_HALF_THICKNESSES = Object.freeze([
  0.5,
  0.75,
] as const);

export const BRINKMAN_SCALING_PATH_PENALIZATION_TIMES = Object.freeze([
  1,
  2,
] as const);

export const BRINKMAN_SCALING_CONTROL_PENALIZATION_TIME = 3 as const;

export type BrinkmanScalingPathPenalizationTime =
  typeof BRINKMAN_SCALING_PATH_PENALIZATION_TIMES[number];

export interface BrinkmanScalingDefinition {
  id: string;
  role: "candidate-fixed-eta-lu-path" | "fixed-eta-hat-control";
  diameterCells: 16 | 24;
  maskHalfThicknessCells: 0.5 | 0.75;
  penalizationTimeSteps: 1 | 2 | 3;
  etaHat: number;
  relaxationTime: number;
  kinematicViscosity: number;
  penaltyLayerCells: number;
  penaltyLayerRelativeDiameter: number;
  nx: number;
  ny: number;
  bodyCenterX: number;
  bodyCenterY: number;
  bodyRadius: number;
  totalSteps: number;
  discardSteps: number;
}

export const BRINKMAN_SCALING_CONTRACT = Object.freeze({
  format: "VP-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-SCREEN-CONTRACT-v1",
  frozenAgainstRepositoryCommit:
    "5f27a9f64bc2804fb518d42e67bdcb44886adac3",
  sourceIdentity: Object.freeze({
    formalSource: Object.freeze({
      relativePath: "02_模拟程序/src/solvers/highFidelity/lbm.ts",
      sha256:
        "6949dd9f215595bde4162078f9cb026456bcbed83fd2ebd08131001e03ec2dc2",
      accessMode: "read-only-import",
    }),
    proDecision: Object.freeze({
      relativePath:
        "90_候选工作区/current/A8_二维特征开放边界实验后端/16_A8P_网页版Pro独立审查与A8Q路线裁决.md",
      sha256:
        "bdeb2fb36d62904d094b0b30f8d8abbb4f43b50d213fd663858b38b8e4e69114",
      routeCode:
        "PRIORITIZE-A8Q-BRINKMAN-SHARP-INTERFACE-SCALING-PATH",
    }),
    frozenA8p: Object.freeze({
      contract: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-discrete-reference-contract.ts",
        sha256:
          "730aca5424948079fbd0058cccf70d612c14c5ed827f2306a76a7c1aa4467640",
      }),
      support: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-discrete-reference-support.ts",
        sha256:
          "0cd0045c3702d0772b4239f03cc1dbfc036c25fcd3df3b61319142fc505a7e2e",
      }),
      runs: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-discrete-reference-runs.ts",
        sha256:
          "65c96c7bc0ace680122a568c62d31e7922aa199fd298585fc14a01e86dcfa4ee",
      }),
      qualification: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/src/formal-discrete-reference.ts",
        sha256:
          "c4654a1e39127468b1c23caf9ce8a9d04d312f9f780a446913ebb10c95ca75e9",
      }),
      artifact: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/artifacts/a8-formal-discrete-reference-maturity-qualification.json.gz",
        storedSha256:
          "0aec8ce335baab93224608d01f6de0d5afcf8779226d2be8d40a5e946ae31868",
        canonicalSha256:
          "56dd50ed6c941b4581d5f7fa7faabafb2459f334749a5b321a64329c0abf00ff",
      }),
      sidecar: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_二维特征开放边界实验后端/验证与复现/artifacts/a8-formal-discrete-reference-maturity-qualification.sha256",
        sha256:
          "75d8f8b14e761d4dd18cedcd4979729414f09f7e42cccfe0424ccc9aeb819d1d",
      }),
    }),
    publicFixedCylinderCarrier: Object.freeze({
      caseRunner: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_公开规定横移圆柱基准/src/fixed-cylinder-case-runner.ts",
        sha256:
          "4953fc58b71ffdbf23a6216ffa203ff2a9ae654ae718562e5217ddc5c66cee14",
      }),
      geometry: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_公开规定横移圆柱基准/src/fixed-cylinder-geometry.ts",
        sha256:
          "230c9f6312d12ba90ed1b14fa296743591f9c99281349df2670bd971e5329f0c",
      }),
      metrics: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_公开规定横移圆柱基准/src/benchmark-metrics.ts",
        sha256:
          "625e3eb62c389d597ed0f22feb8e49fd2cad70d543ee9b19f2acff9fdd292e12",
      }),
      benchmarkContract: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_公开规定横移圆柱基准/src/benchmark-contract.ts",
        sha256:
          "b97f982e5599a2e710278d5a8d2565c8944e1bde4f0c4e85083d6732398972aa",
      }),
      sensitivityContract: Object.freeze({
        relativePath:
          "90_候选工作区/current/A8_公开规定横移圆柱基准/src/fixed-sensitivity-contract.ts",
        sha256:
          "81557bf912ab4dbeb6e3ae7221715ed273abce3f126ca8f97ab0d5f99fc30b0b",
      }),
    }),
  }),
  carrier: Object.freeze({
    reynoldsNumber: 185,
    latticeVelocity: 0.05,
    nominalLatticeMach: 0.05 / (1 / Math.sqrt(3)),
    outerBoundary: "open-periodic-crossflow",
    boundaryCarrier: "S1-legacy-zou-he-derived-density",
    boundaryCarrierRole: "frozen-numerical-carrier-only",
    upstreamDiameters: 14,
    downstreamDiameters: 19.5,
    widthDiameters: 10,
    totalConvectiveTime: 80,
    discardConvectiveTime: 40,
    bodyPhaseOffsetXCells: 0,
    bodyPhaseOffsetYCells: 0.17320508075688773,
    loadIdentity: "A2-raw-Brinkman-reaction-plus-fictitious-internal-fluid-momentum-correction",
    spectrumSearch: Object.freeze({
      strouhalMinimum: 0.15,
      strouhalMaximum: 0.24,
      strouhalIncrement: 0.00025,
    }),
  }),
  matrix: Object.freeze({
    diameters: BRINKMAN_SCALING_DIAMETERS,
    maskHalfThicknessesCells: BRINKMAN_SCALING_MASK_HALF_THICKNESSES,
    pathPenalizationTimesSteps:
      BRINKMAN_SCALING_PATH_PENALIZATION_TIMES,
    controlPenalizationTimeSteps:
      BRINKMAN_SCALING_CONTROL_PENALIZATION_TIME,
    controlDiameterCells: 24,
    uniqueRunCount: 10,
    freshInitialStateRequired: true,
    deterministicOrder:
      "diameter-ascending-then-mask-ascending-then-eta-lu-ascending",
    earlyCaseRemovalForbidden: true,
    previousScalarReuseForbidden: true,
  }),
  diagnostics: Object.freeze({
    coreMaskMinimumInclusive: 0.99,
    transitionMaskMinimumExclusive: 0.01,
    transitionMaskMaximumExclusive: 0.99,
    slipVelocityNormalization: "lattice-inlet-velocity",
    coreSlipRmsFormula:
      "sqrt(sum(rho*|u-us|^2)/(u0^2*sum(rho))) over chi>=0.99",
    transitionSlipRmsFormula:
      "sqrt(sum(rho*|u-us|^2)/(u0^2*sum(rho))) over 0.01<chi<0.99",
    coreSlipMaximumFormula:
      "max(|u-us|/u0) over chi>=0.99",
    effectiveMaskAreaFormula: "sum(chi) in lattice-cell area",
    equivalentDiameterFormula: "sqrt(4*sum(chi)/pi)",
    relativeGeometryDeviationFormula: "(equivalentDiameter-D)/D",
    penaltyLayerFormula: "sqrt(nu_lu*eta_lu)",
    forceDecomposition: Object.freeze({
      rawReaction: "negative of the Brinkman body-force impulse",
      fictitiousFluidCorrection:
        "post-step-minus-pre-step sum(chi*rho*u)",
      correctedLoad: "rawReaction+fictitiousFluidCorrection",
      coefficientScale: "0.5*u0^2*D",
      retainPerAcceptedAnalysisStepTrace: true,
      retainFirstAndSecondHalfStatistics: true,
    }),
  }),
  gates: Object.freeze({
    maximumDensityDeviation: 0.08,
    maximumMach: 0.30,
    maturity: Object.freeze({
      minimumLiftRms: 1e-3,
      maximumMeanDragHalfDrift: 0.05,
      maximumLiftRmsHalfDrift: 0.10,
    }),
    requireAllTenRunsCompleteAndFinite: true,
    requireAllTenRunsStableAndMature: true,
    requireFrozenSourceHashes: true,
    requireFiniteRecomputableForceComponents: true,
    forceRecompositionScaledTolerance:
      64 * Number.EPSILON,
    fixedEtaPath: Object.freeze({
      requireFineCoreSlipNotAboveCoarse: true,
      directionNearPlatformRelativeThreshold: 0.01,
      directionRule:
        "for each metric, both mask families below 1 percent are a near-platform pass; otherwise the two signed D16-to-D24 changes must have the same nonzero sign",
      maximumFineCrossMaskRelativeLoadDifference: 0.05,
    }),
    independentFullRepeatByteIdentityRequired: true,
  }),
  literatureObservation: Object.freeze({
    fixedTarget: Object.freeze({
      meanDrag: 1.287,
      liftRms: 0.443,
      strouhal: 0.195,
      absoluteTolerances: Object.freeze({
        meanDrag: 0.05,
        liftRms: 0.04,
        strouhal: 0.005,
      }),
    }),
    singlePointHitCode:
      "INCONCLUSIVE-A8Q-SINGLE-POINT-LITERATURE-HIT",
    selectionByLiteratureClosenessForbidden: true,
  }),
  artifact: Object.freeze({
    deterministicCaseOrder: true,
    timestampFieldsForbidden: true,
    nonFiniteJsonValuesForbidden: true,
    gzipLevel: 9,
    gzipMtime: 0,
    independentFullRepeatRequired: true,
  }),
  decision: Object.freeze({
    passCode:
      "PASS-A8Q-BRINKMAN-SCALING-PATH-CANDIDATE-ONLY-UNLOCK-A8R",
    noGoCode:
      "NO-GO-A8Q-BRINKMAN-SCALING-PATH-INCOHERENT",
    carryEveryPassingPathIntoA8r: true,
    formalSourceModified: false,
    formalIntegrationUnlocked: false,
    s1PhysicallySelected: false,
    s9Selected: false,
    newBoundaryStrategyCreated: false,
    stopAfterEvidenceReportRepeatAndHandoff: true,
    claimUpperBound:
      "Candidate-only two-resolution screen for an internally coherent fixed-eta-lu Brinkman scaling path; not grid convergence, sharp-interface qualification, literature validation, boundary selection, prescribed motion, FSI, apparatus prediction, or experimental validation.",
  }),
  forbidden: Object.freeze([
    "modify-formal-theory-or-program",
    "modify-S1-S9-A8O-or-A8P-scientific-source",
    "change-mask-or-penalty-gates-after-results",
    "drop-a-case-after-intermediate-results",
    "select-a-single-point-by-literature-closeness",
    "run-D32-D40-or-D50-before-A8Q-independent-review",
    "create-S10-or-add-an-inlet-patch",
    "run-prescribed-motion-weak-FSI-3D-free-surface-apparatus-or-experiment",
  ]),
});

function numberId(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", "p");
}

function buildDefinition(
  diameterCells: 16 | 24,
  maskHalfThicknessCells: 0.5 | 0.75,
  penalizationTimeSteps: 1 | 2 | 3,
): BrinkmanScalingDefinition {
  const carrier = BRINKMAN_SCALING_CONTRACT.carrier;
  const kinematicViscosity = carrier.latticeVelocity
    * diameterCells / carrier.reynoldsNumber;
  const relaxationTime = 0.5 + 3 * kinematicViscosity;
  const etaHat = penalizationTimeSteps
    * carrier.latticeVelocity / diameterCells;
  const penaltyLayerCells = Math.sqrt(
    kinematicViscosity * penalizationTimeSteps,
  );
  const nx = Math.round(
    (carrier.upstreamDiameters + carrier.downstreamDiameters)
      * diameterCells,
  );
  const ny = Math.round(carrier.widthDiameters * diameterCells);
  return {
    id: [
      "a8q",
      `d${diameterCells}`,
      `mask-${numberId(maskHalfThicknessCells, 2)}`,
      `eta-${numberId(penalizationTimeSteps, 2)}`,
    ].join("-"),
    role: penalizationTimeSteps === 3
      ? "fixed-eta-hat-control"
      : "candidate-fixed-eta-lu-path",
    diameterCells,
    maskHalfThicknessCells,
    penalizationTimeSteps,
    etaHat,
    relaxationTime,
    kinematicViscosity,
    penaltyLayerCells,
    penaltyLayerRelativeDiameter: penaltyLayerCells / diameterCells,
    nx,
    ny,
    bodyCenterX: carrier.upstreamDiameters * diameterCells,
    bodyCenterY: 0.5 * (ny - 1) + carrier.bodyPhaseOffsetYCells,
    bodyRadius: 0.5 * diameterCells,
    totalSteps: Math.round(
      carrier.totalConvectiveTime
        * diameterCells / carrier.latticeVelocity,
    ),
    discardSteps: Math.round(
      carrier.discardConvectiveTime
        * diameterCells / carrier.latticeVelocity,
    ),
  };
}

export function buildBrinkmanScalingDefinitions(): BrinkmanScalingDefinition[] {
  const definitions: BrinkmanScalingDefinition[] = [];
  for (const diameterCells of BRINKMAN_SCALING_DIAMETERS) {
    for (const maskHalfThicknessCells of
      BRINKMAN_SCALING_MASK_HALF_THICKNESSES) {
      for (const penalizationTimeSteps of
        BRINKMAN_SCALING_PATH_PENALIZATION_TIMES) {
        definitions.push(buildDefinition(
          diameterCells,
          maskHalfThicknessCells,
          penalizationTimeSteps,
        ));
      }
      if (diameterCells === 24) {
        definitions.push(buildDefinition(
          diameterCells,
          maskHalfThicknessCells,
          BRINKMAN_SCALING_CONTROL_PENALIZATION_TIME,
        ));
      }
    }
  }
  return definitions;
}

export type BrinkmanScalingContract = typeof BRINKMAN_SCALING_CONTRACT;
