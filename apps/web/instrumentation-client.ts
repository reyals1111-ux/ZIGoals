// Runs before hydration, ahead of any client module that builds a zod schema (Next instrumentation-client convention).
import "./lib/vault/zod-jitless";
// Session U Part 6 (FIX_PLAN D4): the Trusted Types default policy. Every production page requires Trusted Types since
// Session V Part 19 (docs/security/TRUSTED_TYPES.md); it must exist before the first chunk loads after hydration.
import { installTrustedTypesDefault } from "./lib/trusted-types";
installTrustedTypesDefault(window as unknown as Parameters<typeof installTrustedTypesDefault>[0]);
// Session AV Part 2 ([TIER 3] (PWA), ADR-045 D-PWA): code of this version that can no longer be loaded after a new deploy
// (a removed file, "module factory is not available") reloads the page once into the newest version, never while the
// person is in the middle of something (lib/sw/update-recovery.ts).
import { watchStaleCode } from "./lib/sw/stale-code";
watchStaleCode(window);
// Session AV Part 5 (D-WEIGHT): taps for ZIGi and the music player made before their chunks arrive are kept for them.
import { keepEarlyEvents } from "./lib/early-events";
keepEarlyEvents(window);
