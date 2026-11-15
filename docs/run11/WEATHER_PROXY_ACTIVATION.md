# Weather proxy: owner activation (MET Norway)

**Status (2026-11-14):** written with the Worker, before any activation. **The weather proxy is OFF:** nothing here has run against a Cloudflare account or against MET Norway. The Worker is proven by local tests only (Miniflare with a recorded MET answer, `scripts/run11/weather-proxy.test.mjs`). It stays off until you deploy it yourself with the steps below. No deploy workflow reads `workers/weather-proxy/`; the app does not call it yet. **The app client is wired later by the NOVA lane** (its own PR: the client, the app's `connect-src` / `lib/egress-policy.json` entry for the proxy origin, and the fallback when the proxy is unavailable). Lines marked **UNVERIFIED** come from documentation, not observation.

## What it does
- The app asks this Worker, not MET Norway, for a forecast: `GET /v1/forecast?lat=<n>&lon=<n>`. MET sees one Cloudflare address, the Worker's own User-Agent and a point rounded to 2 decimals (about 1 km). It never sees the person's IP address, browser headers, cookies or the exact location.
- Only the app's origin (`APP_ORIGIN`, exact match) gets CORS headers; a request with any other `Origin` is refused 403. A request with no `Origin` (curl) is served without CORS headers.
- Answers are MET's Locationforecast 2.0 **compact** JSON, byte for byte (at most 1 MB). MET's 203 (deprecation notice) keeps its status and adds `x-weather-upstream-status: 203`.
- Each answer to the app says `x-weather-cache: hit | miss | revalidated | stale` and `Cache-Control: public, max-age=<seconds until MET's Expires>`.
- MET 429, 5xx, a timeout (8 s), a redirect, a non-JSON or oversized body → `503 {"error":"UPSTREAM_UNAVAILABLE"}`, unless the point has a kept answer less than 2 h past its Expires: that is served with `x-weather-stale: 1`.
- Per client: 60 requests per minute per IPv4 address or IPv6 /48 → then `429 {"error":"TRY_LATER","retryAfter":n}`. The address (`cf-connecting-ip`) is read only to count, under an HMAC key made for that minute, in memory; it is never stored, logged or forwarded.
- Nothing is logged: no `console` call (a test checks), `observability.enabled: false`.
- Code: `workers/weather-proxy/worker.mjs` (handler and the `WeatherLimit` Durable Object, SQLite class, one per deployment, migration `v1`, binding `WEATHER_LIMIT`), `workers/weather-proxy/limits.mjs` (the numbers above).

## MET Norway's terms, and how the Worker meets them
From MET's Terms of Service (https://api.met.no/doc/TermsOfService) and the Locationforecast documentation. Re-read them before activating; they can change.
| MET asks | The Worker |
| --- | --- |
| Identify the app, with contact details, in the User-Agent | Sends `MET_USER_AGENT` (default `ZIGoals/alpha https://zigoals.app contact@zigoals.app`); refuses every MET call (503 `PROVIDER_SETUP_REQUIRED`) if it is empty or does not start with `ZIGoals/`. The contact address must be one you read: MET writes there before it blocks an app. |
| Cache, and do not ask again before `Expires` | One kept answer per rounded point in the Workers Cache, served until MET's `Expires` (clamped to at least 1 minute, at most 1 day). |
| After `Expires`, revalidate with `If-Modified-Since` | Sends `If-Modified-Since: <MET's Last-Modified>`; a 304 extends the kept answer with MET's new `Expires`. |
| At most 4 decimals in coordinates | Rounds to 2 before anything else (also the cache key). |
| Back off on 429; heed 203 | 429 is never retried by the Worker (503 to the app, or the stale answer); 203 is passed through and marked, so the app can show it. |
| Traffic over 20 requests/second needs an agreement with MET | Far below at Alpha scale; the per-client limit and the cache keep it so. |

The Workers Cache is kept per Cloudflare data centre, so MET may see one request per point per data centre per forecast period. **Cloudflare documents that Cache API calls have no effect on `*.workers.dev` addresses (UNVERIFIED here):** deploy the proxy on a custom domain (step 2), or every request goes to MET and the terms above are not met.

## Settings
| Name | Kind | Value |
| --- | --- | --- |
| `APP_ORIGIN` | var, required | The app's origin exactly, e.g. `https://alpha.zigoals.app` (https only; `http://127.0.0.1:<port>` for local). Missing or malformed → every request 503 `HOSTED_CONFIGURATION_REQUIRED`. |
| `MET_USER_AGENT` | var, required | `ZIGoals/<version> <site> <contact>`; printable ASCII, at most 200 characters after `ZIGoals/`. |
| `WEATHER_LIMIT` | Durable Object binding | class `WeatherLimit`, migration `v1` (`new_sqlite_classes`, works on the free plan). |
| `ISOLATED_FIXTURE`, `LOCAL_TEST_NOW`, `LOCAL_TIMEOUT_MS` | tests only | **Never set them in your copy.** They apply only when `ISOLATED_FIXTURE` is exactly `true`. |

No secrets. Cost (**UNVERIFIED**, Cloudflare's published free-plan limits): each forecast request is one Worker request and one Durable Object request, inside the free plan's daily allowances at Alpha scale.

## Steps (from your own machine, about 25–35 minutes)
Prerequisites: Node 24.19.0, pnpm 11.19.0, the checkout installed, your Cloudflare login for the pinned wrangler (`pnpm --filter @zigoals/web exec wrangler login`), a zone on your Cloudflare account for the custom domain. Run every command from the checkout root.

### 1. Your private copy (offline, about 5 minutes)
```sh
cp workers/weather-proxy/wrangler.local.jsonc workers/weather-proxy/wrangler.alpha.owner.jsonc
chmod 600 workers/weather-proxy/wrangler.alpha.owner.jsonc
```
`*.alpha.owner.jsonc` is gitignored. Edit only: `name` (e.g. `zigoals-weather-proxy`), `vars.APP_ORIGIN` (the app's https origin), `vars.MET_USER_AGENT` if the contact differs, and add the custom domain:
```jsonc
"routes": [{ "pattern": "weather.<your zone>", "custom_domain": true }],
```
Keep `workers_dev: false`, `preview_urls: false` and `observability.enabled: false`. Add no `ISOLATED_FIXTURE` or `LOCAL_*` var.

### 2. Dry run, then deploy (one mutation, about 5–10 minutes)
```sh
pnpm --filter @zigoals/web exec wrangler deploy --config "$PWD/workers/weather-proxy/wrangler.alpha.owner.jsonc" --dry-run --outdir /tmp/zigoals-weather-dry
```
Review: one Durable Object binding (`WEATHER_LIMIT`), two vars, the one custom domain, nothing else. Then the same command without `--dry-run --outdir …`. The custom domain's certificate can take a few minutes (up to about 15) the first time.

### 3. Verify (about 5–10 minutes)
Replace `https://weather.<your zone>` and `https://alpha.zigoals.app` with yours.
```sh
W=https://weather.<your zone>; APP=https://alpha.zigoals.app
# A forecast: 200, x-weather-cache: miss, access-control-allow-origin: $APP, cache-control: public, max-age=…
curl -si "$W/v1/forecast?lat=50.8466&lon=4.3517" -H "Origin: $APP" | sed -n '1,20p'
# Again at once, a nearby point: x-weather-cache: hit (the same rounded point 50.85,4.35; no MET call)
curl -si "$W/v1/forecast?lat=50.8549&lon=4.3451" -H "Origin: $APP" -o /dev/null -D - | grep -i '^x-weather\|^cache-control'
# Another origin: 403 {"error":"ORIGIN_DENIED"}
curl -s "$W/v1/forecast?lat=50.85&lon=4.35" -H 'Origin: https://example.com'; echo
# Bad coordinates: 400 {"error":"INVALID_COORDINATES"}; another path: 404; POST: 405
curl -s "$W/v1/forecast?lat=91&lon=0"; echo
curl -s -o /dev/null -w '%{http_code}\n' "$W/"
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$W/v1/forecast?lat=50.85&lon=4.35"
# The per-client limit: 60 answers of 200, then 429
for i in $(seq 61); do curl -s -o /dev/null -w '%{http_code}\n' "$W/v1/forecast?lat=50.85&lon=4.35"; done | sort | uniq -c
```
If the second call says `miss` again, the cache is not working (most likely a `workers.dev` address): turn the proxy off (below) and fix the domain before the app uses it. After MET's `Expires` (usually about 30 minutes), the next call should say `revalidated`.

### 4. Hand over to the NOVA lane
Tell the NOVA lane the proxy's origin. Its PR wires the app client, allows that origin in the app's `connect-src` and keeps a fallback for 429/503. Until then the deployed proxy only answers curl.

## Turning it off
- **Fastest (about 1 minute):** Cloudflare dashboard → Workers & Pages → the proxy → Settings → Domains & Routes → remove the custom domain. Requests stop reaching the Worker; the app shows its no-weather state.
- **Fully (about 2 minutes):** `pnpm --filter @zigoals/web exec wrangler delete --config "$PWD/workers/weather-proxy/wrangler.alpha.owner.jsonc"`. It removes the Worker and its `WeatherLimit` object (which keeps nothing). Kept forecasts age out of the Workers Cache on their own (at most 1 day plus 2 hours).
- To pause without deleting, deploy your copy with `APP_ORIGIN` set to `""`: every request answers 503 `HOSTED_CONFIGURATION_REQUIRED` and nothing reaches MET.

## Local test
```sh
pnpm exec vitest run scripts/run11/weather-proxy.test.mjs
```
16 tests: rounding (two points, one MET call), cache hit before Expires, revalidation with If-Modified-Since and 304, 203 passthrough, 429/500/503 → 503, the 2-hour stale window, timeout, oversized, non-JSON and redirected answers, origin and CORS, bad coordinates, other paths and methods, the exact headers MET receives (no client header, cookie or address), the User-Agent and configuration checks, and the per-client limit.
