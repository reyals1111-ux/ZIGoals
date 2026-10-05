// Runs before hydration, ahead of any client module that builds a zod schema (Next instrumentation-client convention).
import "./lib/vault/zod-jitless";
// Session U Part 6 (FIX_PLAN D4): the Trusted Types default policy, inert unless a page requires Trusted Types (only the
// report-only trial does; docs/security/TRUSTED_TYPES.md).
import { installTrustedTypesDefault } from "./lib/trusted-types";
installTrustedTypesDefault(window as unknown as Parameters<typeof installTrustedTypesDefault>[0]);
