// Runs before hydration, ahead of any client module that builds a zod schema (Next instrumentation-client convention).
import "./lib/vault/zod-jitless";
