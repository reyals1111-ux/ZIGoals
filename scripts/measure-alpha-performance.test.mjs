import { expect, test, vi } from "vitest";
import { measure, summarize, validateBase } from "./measure-alpha-performance.mjs";

test("statistics use arithmetic median and nearest-rank percentiles, including tiny batches", () => {
  expect(summarize([539, 26, 34, 285, 23])).toEqual({count:5,totalMs:907,medianMs:34,p90Ms:539,p95Ms:539});
  expect(summarize([18, 32])).toEqual({count:2,totalMs:50,medianMs:25,p90Ms:32,p95Ms:32});
  expect(summarize([])).toEqual({count:0,totalMs:0,medianMs:null,p90Ms:null,p95Ms:null});
});
test.each([
  "https://user:PRIVATE@alpha.zigoals.app", "https://alpha.zigoals.app/app?PRIVATE",
  "https://alpha.zigoals.app/#PRIVATE", "https://alpha.zigoals.app.evil.test",
  "http://alpha.zigoals.app", "https://alpha.zigoals.app:8443", "http://192.168.1.1",
])("refuses non-allowlisted or private target input without echoing it: %s", base => {
  expect(() => validateBase(base)).toThrow("Use an origin-only Alpha HTTPS or loopback HTTP URL.");
});
test.each(["https://alpha.zigoals.app", "http://127.0.0.1:8791", "http://localhost:3108", "http://[::1]:8791"])("permits controlled target %s", base => {
  expect(validateBase(base)).toBe(new URL(base).origin);
});
test.each([0, 21, 1.2, NaN])("bounds request count before sending anything: %s", async count => {
  const fetcher = vi.fn();
  await expect(measure({base:"http://127.0.0.1:8791", count, fetcher})).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
test("only GETs the three fixed paths, drains bodies, never follows redirects or exports private content", async () => {
  const fetcher = vi.fn(async () => new Response("PRIVATE_BODY", {headers:{"set-cookie":"PRIVATE_COOKIE"}}));
  const result = await measure({base:"http://127.0.0.1:8791", count:1, intervalMs:0, fetcher});
  expect(result.metric).toBe("request_wall_time_not_cloudflare_cpu");
  expect(result.ok).toBe(true);
  expect(result.routes.map(r => r.route)).toEqual(["/app", "/app/settings", "/icon.svg"]);
  expect(fetcher.mock.calls.map(([url]) => new URL(url).pathname)).toEqual(["/app", "/app/settings", "/icon.svg"]);
  for (const [, options] of fetcher.mock.calls) {
    expect(options.method).toBe("GET"); expect(options.redirect).toBe("manual");
    expect(options.credentials).toBe("omit"); expect(options.signal).toBeInstanceOf(AbortSignal);
  }
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
});
test("records failures and non-200 responses without raw errors, headers or locations", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, {status:302,headers:{location:"https://PRIVATE"}}))
    .mockRejectedValueOnce(new Error("PRIVATE_FAILURE"))
    .mockResolvedValueOnce(new Response("PRIVATE_ERROR_BODY",{status:500}));
  const result = await measure({base:"http://127.0.0.1:8791",count:1,intervalMs:0,fetcher});
  expect(result.ok).toBe(false);
  expect(result.routes.map(r => r.samples[0].status)).toEqual([302,null,500]);
  expect(result.routes.map(r => r.samples[0].error)).toEqual(["unexpected_status","request_failed","unexpected_status"]);
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
});
test("caps response consumption and cancels overlarge streams", async () => {
  const cancel = vi.fn();
  const fetcher = vi.fn(async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1)); }, cancel,
  })));
  const result = await measure({base:"http://127.0.0.1:8791",count:1,intervalMs:0,fetcher});
  expect(result.ok).toBe(false); expect(cancel).toHaveBeenCalledTimes(3);
  expect(result.routes.every(r => r.samples[0].error === "response_too_large")).toBe(true);
});
