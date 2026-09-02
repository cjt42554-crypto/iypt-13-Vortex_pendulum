import {
  loadHw2rPreObservationReadiness,
} from "../src/hw2r-pre-observation.mjs";

const loaded = await loadHw2rPreObservationReadiness();
process.stdout.write(`${JSON.stringify({
  readinessId: loaded.value.readinessId,
  formalObservationAuthorized: loaded.authorized,
  openFindingCount: loaded.openFindings.length,
  openFindings: loaded.openFindings,
  readinessSha256: loaded.sha256,
  scientificConclusion: "NONE",
})}\n`);
if (!loaded.authorized) process.exitCode = 3;
