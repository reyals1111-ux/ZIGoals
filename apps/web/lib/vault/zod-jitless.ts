import * as z from 'zod';
// QA-25. zod probes `new Function` when the first object schema is built, to decide whether it may compile parsers.
// The app's CSP forbids eval, so in the browser that probe always fails (zod then uses its interpreted parsers anyway)
// and every page load reported a blocked-eval CSP violation. Turning the JIT off before any schema exists skips the
// probe; browsers parse exactly as before. Imported first on the client by apps/web/instrumentation-client.ts.
// Equivalence and timings: zod-jitless.test.ts, scripts/zod-jitless-benchmark.mjs.
z.config({jitless:true});
