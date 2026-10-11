// Runs before hydration, ahead of any client module that builds a zod schema (Next instrumentation-client convention).
import "./lib/vault/zod-jitless";
// Session U Part 6 (FIX_PLAN D4): the Trusted Types default policy. Every production page requires Trusted Types since
// Session V Part 19 (docs/security/TRUSTED_TYPES.md); it must exist before the first chunk loads after hydration.
import { installTrustedTypesDefault } from "./lib/trusted-types";
installTrustedTypesDefault(window as unknown as Parameters<typeof installTrustedTypesDefault>[0]);
