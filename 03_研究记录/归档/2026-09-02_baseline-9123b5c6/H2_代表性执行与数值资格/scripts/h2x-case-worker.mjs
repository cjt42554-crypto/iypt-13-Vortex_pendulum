import { once } from "node:events";
import { loadH2xContract } from "../src/contract.mjs";
import { runH2xHashOracleCase } from "../src/h2x-oracle.mjs";

const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
await once(process.stdin, "end");
const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
await loadH2xContract({ verifySources: true });
const result = await runH2xHashOracleCase(input.definition);
process.stdout.write(`${JSON.stringify(result)}\n`);
