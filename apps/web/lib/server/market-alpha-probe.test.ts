import { afterEach, expect, test, vi } from "vitest";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { classifyMarketProbe, probeAlphaMarket, MARKET_PROBE_BODY } from "../../../../scripts/lib/alpha-market-probe.mjs";
import { marketPairEnvelope } from "./market-pair-result";
import { parseCoinQuotes } from "../market-quotes";
import { POST } from "../../app/api/market-quotes/route";
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

// Session S Part 8: the public-Alpha price probe. The real /api/market-quotes route runs in production mode with the
// Alpha's bindings stubbed: a stub coordinator gives VERIFIED; an unbound, refusing or failing one gives a well-formed
// UNAVAILABLE, never a crash. No provider key is set or read.
const btc = { marketRef: { provider: "coingecko" as const, kind: "coin" as const, id: "bitcoin" }, currency: "USD" as const };
const quote = (now = Date.now()) => parseCoinQuotes(`{"bitcoin":{"usd":62500.12,"last_updated_at":${Math.floor(now / 1000)}}}`, [btc], now)[0]!;
type Env = Record<string, unknown>;
function alpha(env: Env) {
  vi.stubEnv("NODE_ENV", "production");
  vi.mocked(getCloudflareContext).mockResolvedValue({ env } as never);
  // The probe's own request, sent to the real route handler as the edge would deliver it.
  return async (url: string, init: RequestInit) => POST(new Request(url, { ...init, headers: { ...(init.headers as Record<string, string>), "cf-connecting-ip": "192.0.2.10" } }));
}
const coordinator = (answer: (request: Request) => Promise<Response> | Response) => {
  const seen: Request[] = [];
  return { seen, binding: { fetch: async (request: Request) => { seen.push(request); return answer(request); } } };
};

test("a coordinator with a fresh BTC/USD quote gives VERIFIED, through the real route", async () => {
  const stub = coordinator(() => Response.json(marketPairEnvelope([btc], [quote()], [], Date.now())));
  const fetcher = alpha({ ZIGOALS_MARKET_QUOTES_MODE: "durable-v1", MARKET_QUOTES: stub.binding });
  expect(await probeAlphaMarket({ origin: "https://alpha.test", fetcher })).toEqual({ wellFormed: true, result: "VERIFIED", httpStatus: 200, pair: "VERIFIED_FRESH", failure: null, reason: null });
  expect(stub.seen).toHaveLength(1);
  expect(stub.seen[0]!.headers.get("x-market-client")).toBe("v4:192.0.2.10");
  expect(await stub.seen[0]!.json()).toEqual({ version: 1, requests: [btc] });
});

test.each([
  ["unbound (no binding, no mode)", {}],
  ["the mode without the binding", { ZIGOALS_MARKET_QUOTES_MODE: "durable-v1" }],
  ["the binding without the mode", { MARKET_QUOTES: { fetch: async () => Response.json({}) } }],
  ["a binding that throws", { ZIGOALS_MARKET_QUOTES_MODE: "durable-v1", MARKET_QUOTES: { fetch: async () => { throw Error("Coordinator unavailable."); } } }],
  ["a coordinator answering 503", { ZIGOALS_MARKET_QUOTES_MODE: "durable-v1", MARKET_QUOTES: { fetch: async () => Response.json({ error: "MARKET_SETUP_REQUIRED" }, { status: 503 }) } }],
  ["a coordinator answering garbage", { ZIGOALS_MARKET_QUOTES_MODE: "durable-v1", MARKET_QUOTES: { fetch: async () => new Response("not json") } }],
  ["a refused budget", { ZIGOALS_MARKET_QUOTES_MODE: "durable-v1", MARKET_QUOTES: { fetch: async () => Response.json(marketPairEnvelope([btc], [], [{ request: btc, category: "LOCAL_BUDGET" }], Date.now())) } }],
  ["an open breaker", { ZIGOALS_MARKET_QUOTES_MODE: "durable-v1", MARKET_QUOTES: { fetch: async () => Response.json(marketPairEnvelope([btc], [], [{ request: btc, category: "UPSTREAM_5XX" }], Date.now())) } }],
])("%s gives a well-formed UNAVAILABLE, not a crash", async (_label, env) => {
  // A provider key in the hosted environment changes nothing: hosted routes never read it.
  vi.stubEnv("COINGECKO_DEMO_API_KEY", "fixture-key-never-read");
  const fetched = vi.fn();
  vi.stubGlobal("fetch", fetched);
  try {
    const probe = await probeAlphaMarket({ origin: "https://alpha.test", fetcher: alpha(env) });
    expect(probe).toMatchObject({ wellFormed: true, result: "UNAVAILABLE", httpStatus: 503 });
    expect(fetched).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});

// The classifier on its own: every answer outside the closed vocabulary is MALFORMED.
const good = () => ({ status: 200, contentType: "application/json", cacheControl: "no-store", body: JSON.parse(JSON.stringify(marketPairEnvelope([btc], [quote()], [], Date.now()))) });
type Answer = ReturnType<typeof good>;
const down = () => ({ status: 503, contentType: "application/json", cacheControl: "no-store", body: JSON.parse(JSON.stringify(marketPairEnvelope([btc], [], [{ request: btc, category: "THROTTLED" }], Date.now()))) });
test("well-formed answers classify as VERIFIED, UNAVAILABLE (stale is not fresh) and the probe body is BTC/USD only", () => {
  expect(classifyMarketProbe(good())).toMatchObject({ wellFormed: true, result: "VERIFIED" });
  expect(classifyMarketProbe(down())).toEqual({ wellFormed: true, result: "UNAVAILABLE", httpStatus: 503, pair: "PROVIDER_THROTTLED", failure: "THROTTLED", reason: null });
  const stale = good(); stale.body.results[0].status = "VERIFIED_STALE"; stale.body.degraded = true; stale.body.error = "stale";
  expect(classifyMarketProbe(stale)).toMatchObject({ wellFormed: true, result: "UNAVAILABLE", pair: "VERIFIED_STALE" });
  expect(JSON.parse(MARKET_PROBE_BODY)).toEqual({ requests: [btc] });
});
test.each([
  ["status", (a: Answer) => { a.status = 500; }],
  ["status", (a: Answer) => { a.status = 302; }],
  ["content-type", (a: Answer) => { a.contentType = "text/html"; }],
  ["cache-control", (a: Answer) => { a.cacheControl = "public, max-age=60"; }],
  ["envelope", (a: Answer) => { a.body = undefined; }],
  ["envelope", (a: Answer) => { a.body.version = 2; }],
  ["envelope", (a: Answer) => { a.body.rawError = "provider said something"; }],
  ["results", (a: Answer) => { a.body.results = []; }],
  ["result", (a: Answer) => { a.body.results[0].request.currency = "EUR"; }],
  ["result", (a: Answer) => { a.body.results[0].extra = 1; }],
  ["vocabulary", (a: Answer) => { a.body.results[0].status = "OK"; }],
  ["vocabulary", (a: Answer) => { a.body.results[0].failure = "SECRET_LEAK"; }],
  ["consistency", (a: Answer) => { a.body.quotes = []; }],
  ["consistency", (a: Answer) => { a.body.complete = false; }],
  ["quote", (a: Answer) => { a.body.quotes[0].marketRef.id = "ethereum"; a.body.results[0].quote.marketRef.id = "ethereum"; }],
  ["status-consistency", (a: Answer) => { a.status = 503; }],
])("a malformed answer (%s) is MALFORMED", (reason, mutate) => {
  const answer = good(); mutate(answer);
  expect(classifyMarketProbe(answer)).toMatchObject({ wellFormed: false, result: "MALFORMED", reason });
});
test("a transport failure is MALFORMED and nothing is echoed", async () => {
  expect(await probeAlphaMarket({ origin: "https://alpha.test", fetcher: async () => { throw Error("secret detail"); } })).toEqual({ wellFormed: false, result: "MALFORMED", httpStatus: null, pair: null, failure: null, reason: "transport" });
  const html = await probeAlphaMarket({ origin: "https://alpha.test", fetcher: async () => new Response("<html>secret</html>", { status: 503, headers: { "content-type": "text/html" } }) });
  expect(JSON.stringify(html)).not.toContain("secret");
});
