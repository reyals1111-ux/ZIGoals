import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const routes = ["/app", "/app/settings", "/icon.svg"];
const round = value => Math.round(value * 1000) / 1000;

export function validateBase(base) {
  try {
    const url = new URL(base);
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((!local && url.origin !== "https://alpha.zigoals.app") || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) throw Error();
    return url.origin;
  } catch {
    throw Error("Use an origin-only Alpha HTTPS or loopback HTTP URL.");
  }
}

export function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b), count = sorted.length;
  const percentile = p => count ? round(sorted[Math.ceil(count * p) - 1]) : null;
  return {
    count, totalMs:round(values.reduce((a,b) => a+b, 0)),
    medianMs:count ? round((sorted[Math.floor((count-1)/2)] + sorted[Math.floor(count/2)]) / 2) : null,
    p90Ms:percentile(0.9), p95Ms:percentile(0.95),
  };
}

export async function measure({base, count=5, intervalMs=200, fetcher=fetch}) {
  const origin = validateBase(base);
  if (!Number.isInteger(count) || count < 1 || count > 20 ||
      !Number.isInteger(intervalMs) || intervalMs < 0 || intervalMs > 2000) {
    throw Error("Count must be 1–20 and interval must be 0–2000 ms.");
  }
  const started = performance.now();
  const result = {
    metric:"request_wall_time_not_cloudflare_cpu", target:origin,
    recordedAt:new Date().toISOString(), countPerRoute:count, intervalMs,
    timeoutMs:10000, maxResponseBytes:2*1024*1024, concurrency:1,
    percentileMethod:"nearest_rank", warmupRequests:0, ok:true, routes:[],
  };
  for (const route of routes) {
    const samples = [];
    for (let index=0; index<count; index++) {
      const start = performance.now();
      let status = null, error = null;
      try {
        const response = await fetcher(new URL(route, origin).href, {
          method:"GET", redirect:"manual", credentials:"omit", cache:"no-store",
          signal:AbortSignal.timeout(result.timeoutMs),
        });
        status = response.status;
        // Count bytes without retaining response bodies, headers, cookies or error details.
        if (response.body) {
          const reader = response.body.getReader();
          let bytes = 0;
          try {
            for (;;) {
              const chunk = await reader.read();
              if (chunk.done) break;
              bytes += chunk.value.byteLength;
              if (bytes > result.maxResponseBytes) {
                error = "response_too_large";
                await reader.cancel();
                break;
              }
            }
          } finally { reader.releaseLock(); }
        }
        if (!error && status !== 200) error = "unexpected_status";
      } catch { error = "request_failed"; }
      samples.push({status, wallMs:round(performance.now()-start), error});
      if (error) result.ok = false;
      if (intervalMs && !(route === routes.at(-1) && index === count-1)) await delay(intervalMs);
    }
    result.routes.push({route, samples, successfulRequests:samples.filter(s=>!s.error).length,
      // Every attempt is represented, including failed/partial requests. Check ok/status before comparing.
      wall:summarize(samples.map(s=>s.wallMs))});
  }
  return {...result, totalBatchWallMs:round(performance.now()-started)};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({options:{base:{type:"string"},count:{type:"string",default:"5"},
      "interval-ms":{type:"string",default:"200"},help:{type:"boolean"}}});
    if (values.help) {
      console.log("node scripts/measure-alpha-performance.mjs --base http://127.0.0.1:8791 [--count 5] [--interval-ms 200]\nFixed GET routes: /app, /app/settings, /icon.svg. Wall time only; no Cloudflare CPU. Alpha HTTPS also allowed. No redirects, credentials or response logging.");
    } else {
      const result = await measure({base:values.base,count:Number(values.count),intervalMs:Number(values["interval-ms"])});
      console.log(JSON.stringify(result,null,2));
      if (!result.ok) process.exitCode = 1;
    }
  } catch {
    // CLI/parser exceptions can include caller-supplied private strings. Never relay them.
    console.error("Performance measurement refused or failed. Check --help and use bounded, origin-only inputs.");
    process.exitCode = 1;
  }
}
