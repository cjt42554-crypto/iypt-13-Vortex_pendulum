import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateProjectState, validateSupersession } from "../src/ledger.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../../..");
const readJson = async (path) => JSON.parse(await readFile(resolve(packageRoot, path), "utf8"));

const state = await validateProjectState(
  await readJson("project-state-ledger.json"),
  { repositoryRoot },
);
const supersession = validateSupersession(await readJson("supersession-ledger.json"));

console.log(JSON.stringify({
  status: "PASS-G0-PROJECT-LEDGER",
  state,
  supersession,
}, null, 2));
