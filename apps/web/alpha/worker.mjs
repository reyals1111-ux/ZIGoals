// Session W Part 23 (Session Q D2, [TIER 3] (deploy config)): the public Alpha's Worker entry (wrangler.alpha.jsonc
// "main"), in front of the Worker OpenNext generates (OpenNext's documented custom-Worker pattern: import its handler
// and re-export its Durable Object classes). Everything is OpenNext's, except a /_next/static/ file that does not exist:
// a plain-text 404 (lib/static-miss.mjs) instead of Next's HTML 404 page without a policy. Setting "main" back to
// ".open-next/worker.js" restores the previous behaviour exactly. Its file name keeps the bundle's name: worker.js.
import openNext from "../.open-next/worker.js";
import egress from "../lib/egress-policy.json";
import { staticMiss } from "../lib/static-miss.mjs";

export * from "../.open-next/worker.js";

const worker = { ...openNext, fetch: (request, env, ctx) => staticMiss(request, egress) ?? openNext.fetch(request, env, ctx) };
export default worker;
