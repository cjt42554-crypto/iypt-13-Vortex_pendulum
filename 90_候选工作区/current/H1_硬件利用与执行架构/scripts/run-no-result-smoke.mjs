import { runNoResultSmoke } from "../src/smoke.mjs";

console.log(JSON.stringify(await runNoResultSmoke(), null, 2));
