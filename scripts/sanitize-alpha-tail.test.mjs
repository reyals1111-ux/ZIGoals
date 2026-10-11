import { expect, test } from "vitest";
import { sanitizeEvent, parseEvents, API_ROUTES } from "./sanitize-alpha-tail.mjs";
const version = "d37151a2-d6fd-4744-8b5c-ca4c3da4c433";
const event = () => ({scriptName:"zigoals-alpha",scriptVersion:{id:version},outcome:"ok",cpuTime:34,wallTime:57,
  eventTimestamp:Date.parse("2026-09-13T15:47:08Z"),event:{request:{url:"https://alpha.zigoals.app/app?PRIVATE_QUERY",method:"GET",headers:{cookie:"PRIVATE_COOKIE"},cf:{ip:"PRIVATE_IP",tls:"PRIVATE_TLS"}},response:{status:200}},logs:["PRIVATE_LOG"],exceptions:["PRIVATE_EXCEPTION"]});
test("explicit allowlist removes private trace fields and generalizes time", () => {
  expect(sanitizeEvent(event(),version)).toEqual({route:"/app",cpuMs:34,wallMs:57,status:200,outcome:"ok",workerVersion:version,hourUtc:"2026-09-13T15:00:00.000Z"});
  expect(JSON.stringify(sanitizeEvent(event(),version))).not.toContain("PRIVATE");
});
test("missing or malformed metrics stay unknown, never zero or private strings", () => {
  const e=event();e.cpuTime="PRIVATE";delete e.wallTime;e.outcome="PRIVATE";e.eventTimestamp="PRIVATE";e.event.response.status="PRIVATE";
  expect(sanitizeEvent(e,version)).toMatchObject({cpuMs:null,wallMs:null,outcome:"unknown",hourUtc:null,status:null});
});
test.each(["/app/goals/PRIVATE", "/icon.svg/PRIVATE", "/", "/robots.txt"])("drops uncontrolled route %s", path => {
  const e=event();e.event.request.url="https://alpha.zigoals.app"+path;expect(sanitizeEvent(e,version)).toBeNull();
});
test("wrong Worker/version/origin/method and invalid version arguments cannot pass", () => {
  for (const change of [e=>e.scriptName="PRIVATE",e=>e.scriptVersion.id="PRIVATE",e=>e.event.request.method="POST",e=>e.event.request.url="https://PRIVATE/app"]) {
    const e=event();change(e);expect(sanitizeEvent(e,version)).toBeNull();
  }
  expect(()=>sanitizeEvent(event(),"PRIVATE")).toThrow("Expected an exact Worker version UUID.");
});
test("parses consecutive pretty JSON incrementally, including escaped quotes/braces", async () => {
  const input=JSON.stringify({...event(),logs:['PRIVATE_\\"} {']},null,2)+"\n"+JSON.stringify(event());
  const actual=[];for await(const e of parseEvents((async function*(){for(const c of input) yield c;})()))actual.push(sanitizeEvent(e,version));
  expect(actual).toHaveLength(2);expect(JSON.stringify(actual)).not.toContain("PRIVATE");
});
test.each(["PRIVATE_BANNER", '{"PRIVATE":', '{"PRIVATE":invalid}', '[{"PRIVATE":1}]'])("fails closed on invalid framing without copying input", async input => {
  await expect((async()=>{for await(const e of parseEvents([input]))void e;})()).rejects.toThrow("Trace input invalid or too large; no raw content was saved.");
});
test("bounds raw event size", async () => {
  await expect((async()=>{for await(const e of parseEvents(['{"x":"'+"a".repeat(1024*1024)+'"}']))void e;})()).rejects.toThrow("Trace input invalid or too large; no raw content was saved.");
});
// Session X Part 5a: buckets for API routes, the manifest and Next's prefetch and navigation requests, never with a query,
// a body, a header value or a page path.
test.each([
  ["https://alpha.zigoals.app/api/market-insights?PRIVATE_QUERY", "POST", {}, "/api/market-insights"],
  ["https://alpha.zigoals.app/api/market-logo?url=PRIVATE", "GET", {}, "/api/market-logo"],
  ["https://alpha.zigoals.app/api/private-account", "POST", {cookie: "PRIVATE_COOKIE"}, "/api/private-account"],
  ["https://alpha.zigoals.app/api/PRIVATE_ROUTE", "GET", {}, "/api/(other)"],
  ["https://alpha.zigoals.app/manifest.webmanifest", "GET", {}, "/manifest.webmanifest"],
  ["https://alpha.zigoals.app/app/goals/PRIVATE_ID?_rsc=abc", "GET", {"rsc": "1", "next-router-prefetch": "1"}, "(prefetch)"],
  ["https://alpha.zigoals.app/app/wealth/asset/PRIVATE_ID", "GET", {"rsc": "1", "next-router-segment-prefetch": "1"}, "(prefetch)"],
  ["https://alpha.zigoals.app/app/goals/PRIVATE_ID?_rsc=abc", "GET", {"rsc": "1"}, "(client navigation)"],
  ["https://alpha.zigoals.app/app/settings?_rsc=abc", "GET", {}, "(client navigation)"],
])("buckets %s (%s) without private detail", (url, method, headers, route) => {
  const e = event(); e.event.request = {url, method, headers};
  const safe = sanitizeEvent(e, version);
  expect(safe?.route).toBe(route);
  expect(JSON.stringify(safe)).not.toContain("PRIVATE");
});
test.each([
  ["https://alpha.zigoals.app/api/market-insights", "DELETE", {}],
  ["https://alpha.zigoals.app/manifest.webmanifest", "POST", {}],
  ["https://alpha.zigoals.app/app/goals/PRIVATE_ID", "GET", {"next-router-prefetch": "true"}],
  ["https://alpha.zigoals.app/landing?_rsc=1", "GET", {"next-router-prefetch": "1"}],
  ["https://alpha.zigoals.app/app", "POST", {}],
])("still drops %s (%s)", (url, method, headers) => {
  const e = event(); e.event.request = {url, method, headers};
  expect(sanitizeEvent(e, version)).toBeNull();
});
test("the API buckets are exactly the app's route files", async () => {
  const {readdirSync, statSync} = await import("node:fs");
  const root = new URL("../apps/web/app/api/", import.meta.url);
  const routes = [];
  const walk = (dir, prefix) => { for (const name of readdirSync(dir)) { if (statSync(new URL(name, dir)).isDirectory()) walk(new URL(name + "/", dir), `${prefix}/${name}`); else if (name === "route.ts") routes.push(prefix); } };
  walk(root, "/api");
  expect([...API_ROUTES].sort()).toEqual(routes.sort());
});
