// Types for alpha-market-probe.mjs, used by apps/web/lib/server/market-alpha-probe.test.ts.
export type MarketProbeResult = {
  wellFormed: boolean;
  result: "VERIFIED" | "UNAVAILABLE" | "MALFORMED";
  httpStatus: number | null;
  pair: string | null;
  failure: string | null;
  reason: string | null;
};
export const MARKET_PROBE_PATH: string;
export const MARKET_PROBE_BODY: string;
export const PAIR_STATUSES: readonly string[];
export const FAILURE_CATEGORIES: readonly string[];
/** `body` is the parsed JSON of the response, untrusted. */
export function classifyMarketProbe(answer: { status: number; contentType: string | null; cacheControl: string | null; body: unknown }): MarketProbeResult;
export function probeAlphaMarket(options: { origin: string; fetcher?: (url: string, init: RequestInit) => Promise<Response>; timeoutMs?: number }): Promise<MarketProbeResult>;
