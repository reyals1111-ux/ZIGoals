// Session S Part 8: one sanitized live-price probe of the public Alpha, BTC/USD through /api/market-quotes.
//
// - The Manual Alpha workflow requires only a WELL-FORMED answer: HTTP 200 or 503 with the version 1 pair envelope and its
//   closed vocabulary. VERIFIED or UNAVAILABLE is recorded as information. UNAVAILABLE (coordinator unbound, provider
//   down, breaker open, budget reached) never fails, retries or rolls back a deployment.
// - Only the owner's manual scripts/verify-hosted-alpha.mjs requires VERIFIED.
//
// Nothing from the response is echoed except the closed-vocabulary fields below: no body text, header value or price.
export const MARKET_PROBE_PATH = "/api/market-quotes";
const BTC = { provider: "coingecko", kind: "coin", id: "bitcoin" };
export const MARKET_PROBE_BODY = JSON.stringify({ requests: [{ marketRef: BTC, currency: "USD" }] });
export const PAIR_STATUSES = ["VERIFIED_FRESH", "VERIFIED_STALE", "PROVIDER_UNAVAILABLE", "PROVIDER_THROTTLED", "PROVIDER_MALFORMED", "UNSUPPORTED", "NOT_ATTEMPTED_BUDGET"];
export const FAILURE_CATEGORIES = ["THROTTLED", "UPSTREAM_5XX", "TIMEOUT", "NETWORK", "AUTHENTICATION", "ENTITLEMENT", "MALFORMED", "UNSUPPORTED", "LOCAL_BUDGET", "LOCAL_QUEUE", "UNKNOWN"];
const ENVELOPE_KEYS = ["complete", "degraded", "error", "quotes", "results", "version"];
const RESULT_KEYS = ["failure", "quote", "request", "status"];
const plain = value => value !== null && typeof value === "object" && !Array.isArray(value);
const keys = value => Object.keys(value).sort().join(",");
const isBtcUsd = request => plain(request) && request.currency === "USD" && plain(request.marketRef) &&
  request.marketRef.provider === BTC.provider && request.marketRef.kind === BTC.kind && request.marketRef.id === BTC.id;
const isBtcQuote = quote => plain(quote) && quote.verification === "VERIFIED" && quote.currency === "USD" &&
  typeof quote.price === "string" && /^[1-9]\d{0,77}$/.test(quote.price) && Number.isInteger(quote.priceDecimals) &&
  plain(quote.marketRef) && quote.marketRef.provider === BTC.provider && quote.marketRef.id === BTC.id;

/**
 * Classifies one probe response. `body` is the parsed JSON (undefined when it was not JSON).
 * Returns `{ wellFormed, result, httpStatus, pair, failure, reason }`, where result is
 * VERIFIED (a fresh verified BTC/USD quote), UNAVAILABLE (a well-formed "no price now"), or MALFORMED.
 */
export function classifyMarketProbe({ status, contentType, cacheControl, body }) {
  const malformed = reason => ({ wellFormed: false, result: "MALFORMED", httpStatus: status, pair: null, failure: null, reason });
  if (status !== 200 && status !== 503) return malformed("status");
  if (!/^application\/json\b/i.test(contentType ?? "")) return malformed("content-type");
  if (!/\bno-store\b/i.test(cacheControl ?? "")) return malformed("cache-control");
  if (!plain(body) || keys(body) !== ENVELOPE_KEYS.join(",") || body.version !== 1) return malformed("envelope");
  if (!Array.isArray(body.results) || body.results.length !== 1 || !Array.isArray(body.quotes) || body.quotes.length > 1) return malformed("results");
  if (typeof body.complete !== "boolean" || typeof body.degraded !== "boolean" || !(body.error === null || typeof body.error === "string")) return malformed("flags");
  const [result] = body.results;
  if (!plain(result) || keys(result) !== RESULT_KEYS.join(",") || !isBtcUsd(result.request)) return malformed("result");
  if (!PAIR_STATUSES.includes(result.status) || !(result.failure === null || FAILURE_CATEGORIES.includes(result.failure))) return malformed("vocabulary");
  const verified = result.status === "VERIFIED_FRESH" || result.status === "VERIFIED_STALE";
  if (verified !== (result.quote !== null) || verified !== (body.quotes.length === 1) || body.complete !== verified) return malformed("consistency");
  if (verified && (!isBtcQuote(result.quote) || !isBtcQuote(body.quotes[0]))) return malformed("quote");
  if ((status === 200) !== verified) return malformed("status-consistency");
  return { wellFormed: true, result: result.status === "VERIFIED_FRESH" ? "VERIFIED" : "UNAVAILABLE", httpStatus: status, pair: result.status, failure: result.failure, reason: null };
}

/** Sends the probe. A transport failure or a non-JSON body is MALFORMED; nothing from the response is kept. */
export async function probeAlphaMarket({ origin, fetcher = fetch, timeoutMs = 20000 }) {
  let response;
  try {
    response = await fetcher(`${origin}${MARKET_PROBE_PATH}`, {
      method: "POST", redirect: "manual", signal: AbortSignal.timeout(timeoutMs),
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "User-Agent": "ZIGoals-Alpha-Smoke" },
      body: MARKET_PROBE_BODY,
    });
  } catch {
    return { wellFormed: false, result: "MALFORMED", httpStatus: null, pair: null, failure: null, reason: "transport" };
  }
  let body;
  try { body = JSON.parse(await response.text()); } catch { body = undefined; }
  return classifyMarketProbe({
    status: response.status, contentType: response.headers.get("content-type"),
    cacheControl: response.headers.get("cache-control"), body,
  });
}
