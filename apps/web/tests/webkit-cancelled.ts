/**
 * ADR-017 S64, widened in Session AH Part 2: what WebKit reports as a page error when a navigation cancels a same-origin
 * request that is still in flight — "<address> due to access control checks." A same-origin request cannot fail an
 * access-control check, so with that wording and at that moment (within 1.5 s of a main-frame navigation) it is the
 * cancel, not the app's own error. Two shapes:
 * - the router's prefetches: `/app…?_rsc=` (S64; Goals' nested routes two segments deep, Session Z-Local);
 * - the app's own `/api/…` fetches the page had in flight (`/api/music-config`, `/api/push`,
 *   `/api/private-account?action=status`, `/api/earn/chain`, `/api/earn/oroswap` in CI). Every one of those fetch sites
 *   handles its own rejection (components/music/music-config.ts, components/push/use-push.ts,
 *   components/account-access.tsx, lib/earn/client.ts); WebKit reports the cancel anyway.
 * Anything else — another origin, another wording, another moment — is still an error.
 */
export type TimedError = {at: number; message: string};
const SHAPE = /^(?:https?:\/\/)?\/?127\.0\.0\.1:\d+\/(?:app(?:\/[a-z-]+)?(?:\/[A-Za-z0-9_-]+){0,2}\?_rsc=[\w-]+|api\/[a-z-]+(?:\/[a-z-]+)?(?:\?[\w=&-]+)?) due to access control checks\.?$/;
export const webkitCancelled = (e: TimedError, navigations: readonly number[]) => SHAPE.test(e.message) && navigations.some(t => Math.abs(e.at - t) <= 1500);
