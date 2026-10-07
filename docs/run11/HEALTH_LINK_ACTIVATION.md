# Health links: owner activation (Oura, Withings, Polar, Strava)

**Status (2026-10-07):** written with Session W Part 8, before any activation. Nothing here has run against a Cloudflare account or a real provider: the Worker, its budgets, the app route, the client and the mappers are proven by local tests only (Miniflare, unit tests, MOCK providers whose answers follow each provider's official reference). Lines marked **UNVERIFIED** were read from documentation, not observed. Owner decision W6: features that need an owner registration are built but **off**, with an honest state; the session registers nothing and deploys nothing.

## What this is, and what stays off
- A person with an Oura ring, a Withings scale or watch, a Polar watch or a Strava account connects it from **Health → Devices → Linked accounts**. "Sync now" (and, except Strava, opening Devices at most once an hour) brings the last 30 days in under the same rules as an import (docs/product/IMPORT_FORMATS.md, ADR-015 S62–S65): deterministic ids, one source per day, the provider's own "asleep", stages only when complete, nothing estimated. A day's totals (steps, energy, weight) come once the day has ended, so the figure kept is final.
- **Why a server at all:** each of the four needs ZIGoals' client secret to exchange a code or refresh a token (Oura: "Required if not using Basic Authorization"; Withings: the secret or a secret-signed request; Polar: Basic client credentials; Strava: `client_secret`), and three answer no browser from another origin (header checks below). The secret lives only in the health-link Worker.
- **Three switches, all off today:**
  1. the app build: Linked accounts show Connect buttons only in a build made with `NEXT_PUBLIC_HEALTH_LINK=on`. No build has it; every other build lists the four as "Needs setup by ZIGoals" with what each would bring and how to bring the data in today (the importer);
  2. the app Worker: `/api/health-link` answers 503 `HEALTH_LINK_UNAVAILABLE` until the secret `ZIGOALS_HEALTH_LINK_ORIGIN` is set (with `ZIGOALS_SYNC_ORIGIN`, as for push and ZIGi hosted); it checks every session with private sync before it forwards anything;
  3. the Worker itself (`workers/health-link/`): paused unless `HEALTH_LINK_KILL_SWITCH` is exactly `off` (the template says `on`); 503 until the account provider, the budgets and at least one provider's client id and secret are set. A provider without both is simply not offered.
- The browser never talks to a provider's API or to the Worker: it calls the app's own `/api/health-link` (same origin), so the app's `connect-src` does not change; `lib/egress-policy.json` → `serverOnly.healthLink` names the one server-side origin. The only browser navigation to a provider is the full-page sign-in at the provider's own authorize address (COOP `same-origin` stays).

## What passes through, what is kept
- **Through the route and the Worker:** a code (once), a refresh token (when the access token is within a minute of expiry), an access token per call, and one named request with checked parameters (`workers/health-link/providers.mjs` → `NAMED`; never a path or a URL from the app). The provider's JSON comes back as it is, capped at 4,194,304 bytes; the app's request is capped at 16,384 bytes; each provider call times out after 15 s.
- **Kept by the Worker:** counts only, in its `LinkBudget` Durable Object (SQLite, one object): requests per account and provider per UTC day, per provider per UTC day, and a breaker per provider. No token, code, record, address or user agent. No `console` call (a test captures every runtime log line), `observability.enabled: false`.
- **Kept on the person's device:** the tokens, sealed with AES-GCM under a non-extractable key in IndexedDB `zigoals-link-tokens-v1` (ADR-015 S10): never in localStorage, a URL, a log, an export, a backup or sync. The provider's user id, which Withings and Polar need to revoke, is sealed with them. Disconnect revokes where the provider offers a way and removes the tokens either way; erasing the account, signing out and "Forget" remove them too. Showcase never connects.
- **Kept in the journal:** the records, labelled by source (`oura-link`, `withings-link`, `polar-link`, `strava-link`), Health like the rest: the same consent box ("I understand this brings health records from … into my Health journal"), the same ZIGi Health gate, the same Health sync choice. Disconnect can also remove exactly what the service brought.

## Before you register anything
- Stage 7 is done on the acceptance services (private app Worker, private sync Worker, sign-in works), as for ZIGi hosted.
- One Worker per app origin: the redirect address is the Worker's own `APP_ORIGIN` + `/app/health` (never taken from a request), so the acceptance app and the public Alpha each get their own copy, registered at each provider separately.
- Read each provider's current terms for health data and the person-facing consent they require; GDPR Art. 9 applies to sleep and heart data (Part 25's LEGAL_CHECKLIST).
- Node 24.19.0 and pnpm 11.19.0; the pinned wrangler through `pnpm --filter @zigoals/web exec wrangler`; your Cloudflare login for that shell. Run every command from the checkout root.

## 1. Register ZIGoals with each provider you want (your accounts, your decision)
Register the redirect address **exactly**: `<APP_ORIGIN>/app/health` (for example `https://<acceptance app>/app/health`). The app adds `?view=devices` only after the provider returns, so the registered address carries no query.

| Provider | Where and what (official docs, read 2026-10-07) | Scopes the app asks for | Limits to know |
|---|---|---|---|
| **Oura** | An OAuth application in Oura's developer portal ([authentication](https://cloud.ouraring.com/docs/authentication)); registered redirect URIs are a whitelist and must match exactly. Code exchange and refresh need the client secret; PKCE S256 is used as Oura recommends. | `daily workout session` | "Limited to 10 users before requiring approval from Oura"; 5,000 requests per 5 minutes ([API v2](https://cloud.ouraring.com/v2/docs)); a 403 can mean the person's Oura subscription expired. Revoke: the reference gives `https://api.ouraring.com/oauth/revoke?access_token=…` without a method; the Worker uses GET (**UNVERIFIED**: check the first real Disconnect). |
| **Withings** | A Public Health Data API application ([OAuth guide](https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/get-access/oauth-authorization-url)); register the redirect address as the "Callback Url". | `user.activity,user.metrics` | Start for Free plan: 10 users until a Withings review; **"Withings+ becomes required on the Start for Free API plan from October 12, 2026"** for accounts created after that date ([plans](https://developer.withings.com/developer-guide/v3/withings-solutions/withings-api-plans)); 120 requests a minute per application. A callback on HTTP, localhost or a non-standard port keeps the app at 10 users. The code is valid 30 seconds; access tokens 3 hours; refresh tokens rotate. |
| **Polar** | An AccessLink client ([AccessLink v3](https://www.polar.com/accesslink-api/)); the redirect URL "must be identical" to a registered one. After a connection the app registers the person (`POST /v3/users` with a random member id), which AccessLink requires before any data. | `accesslink.read_all` | Per partner: 500 + users×20 requests per 15 minutes, 5,000 + users×100 per day. No refresh token (tokens "will not expire unless explicitly revoked"); Disconnect deletes the registration, which revokes the token. Sleep: the last 28 days; exercises: the last 30 days uploaded after the registration. |
| **Strava** | An API application ([getting started](https://developers.strava.com/docs/getting-started/)): **"A Strava subscription is a prerequisite for creating an app"**; the redirect must be within the registered callback domain. | `activity:read` | New apps have an athlete capacity of 1; per app 200 requests per 15 minutes and 2,000 a day ([rate limits](https://developers.strava.com/docs/rate-limits/)), so the app offers "Sync now" only (no sync on opening Devices). Revoke: `POST /oauth/revoke` with Basic client credentials, recommended since 1 June 2026 and the only way from 1 June 2027 ([authentication](https://developers.strava.com/docs/authentication/)). |

Not offered, and why (the Devices page says the same): **Fitbit**'s Web API is turned off on 30 October 2026 and the Google Health API is "not onboarding new projects at this time" ([Fitbit](https://dev.fitbit.com/build/reference/web-api/), [migration](https://developers.google.com/health/migration)); **Garmin**'s Health API is for approved business partners ([Garmin](https://developer.garmin.com/gc-developer-program/health-api/)); **Apple Health** and **Health Connect** have no web API ([HealthKit](https://developer.apple.com/documentation/healthkit), [Health Connect](https://developer.android.com/health-and-fitness/health-connect)). Each has an importer path in Settings → Switch to ZIGoals.

Header checks (unauthenticated `OPTIONS`/`HEAD` with a foreign `Origin`, 2026-10-07): Oura's API and Polar's answered with no `Access-Control-Allow-Origin`; Withings allows `*` but not the `Authorization` header (a wildcard never covers it); Strava allows `authorization`. The Worker makes all four the same: no browser call to any of them.

## 2. The private Worker copy (offline)
```sh
cp workers/health-link/wrangler.local.jsonc workers/health-link/wrangler.acctest.owner.jsonc
chmod 600 workers/health-link/wrangler.acctest.owner.jsonc
```
Edit only: `name` (`<prefix>-health-link`), `vars.AUTH_ORIGIN` (the acceptance Supabase origin), `vars.APP_ORIGIN` (the acceptance app's https origin, no path), the client ids you registered (`OURA_CLIENT_ID`, `WITHINGS_CLIENT_ID`, `POLAR_CLIENT_ID`, `STRAVA_CLIENT_ID`; public values) and, if you choose differently, the budgets (`HEALTH_LINK_DAILY_REQUESTS` per account and provider, `HEALTH_LINK_GLOBAL_DAILY_REQUESTS` per provider). Leave `HEALTH_LINK_KILL_SWITCH` at `on`. Then:
```sh
node scripts/run11/health-link-config.mjs workers/health-link/wrangler.acctest.owner.jsonc
```
It must print "The health-link config is quiet, paused or budgeted, and holds no secret." Fix anything it names. A sync uses up to 7 requests for Withings (its sleep summary goes in 7-day pieces), 4 for Oura (more when a list has pages), 4 for Polar and 1–10 for Strava; the template's 200 per account and provider a day leaves room for hourly syncs.

## 3. Deploy, paused (one mutation)
```sh
pnpm --filter @zigoals/web exec wrangler deploy --config "$PWD/workers/health-link/wrangler.acctest.owner.jsonc" --dry-run --outdir /tmp/zigoals-health-link-dry
```
Review the dry run (one Durable Object class, no other binding, no route, `workers_dev` off), then deploy without `--dry-run` and give it the route or service binding your acceptance app uses. **Verify:** `GET /health` answers `{"ok":true}`; every other route answers `{"error":"HEALTH_LINK_CONFIGURATION_REQUIRED"}` (secrets not set yet). **Rollback:** `wrangler delete` for that Worker name.

## 4. The Worker's secrets (one at a time, typed at the prompt only)
```sh
pnpm --filter @zigoals/web exec wrangler secret put AUTH_PUBLIC_KEY --config "$PWD/workers/health-link/wrangler.acctest.owner.jsonc"
pnpm --filter @zigoals/web exec wrangler secret put OURA_CLIENT_SECRET --config "$PWD/workers/health-link/wrangler.acctest.owner.jsonc"
```
and likewise `WITHINGS_CLIENT_SECRET`, `POLAR_CLIENT_SECRET`, `STRAVA_CLIENT_SECRET` for the providers you registered. Never pass a value as an argument, in a file, a report or a chat. **Verify:** signed in on the acceptance app, `GET /api/health-link` (step 5) answers `{"error":"HEALTH_LINK_PAUSED"}`. **Rollback:** `wrangler secret delete NAME` (a provider without its secret is no longer offered).

## 5. The app route (one mutation)
On the private **app** Worker: `wrangler secret put ZIGOALS_HEALTH_LINK_ORIGIN` (the Worker's https origin, no path), or a service binding named `HEALTH_LINK`. `ZIGOALS_SYNC_ORIGIN` is already set from Stage 7. **Verify:** the route answers the Worker's `HEALTH_LINK_PAUSED`. **Rollback:** `wrangler secret delete ZIGOALS_HEALTH_LINK_ORIGIN`; the route answers 503 again.

## 6. A build with linked accounts (reviewed change)
Build the acceptance app with `NEXT_PUBLIC_HEALTH_LINK=on` (for the public Alpha a deploy-workflow change that needs your review). Without it the app never asks `/api/health-link` and shows "Needs setup by ZIGoals".

## 7. Un-pause (one mutation), then verify with your own test accounts
Set `HEALTH_LINK_KILL_SWITCH` to `off` in the private copy, run the config check, deploy. **Verify**, signed in on the acceptance app (Chrome on a computer; an installed iPhone app opens the provider outside the app, so connect from Safari there):
1. Health → Devices: each registered provider says "Not connected"; the others "Not set up for this ZIGoals".
2. Tick the box, Connect: the provider's own sign-in page; after approving, the address comes back clean (`/app/health?view=devices`), "Connected on this device", then "N new records from …". Decline once: "You declined at …; nothing was connected."
3. Health shows the records with their source (Activity: "Imported from Oura (linked)"; nights and sessions in Sleep and Meditation). Sync now again: "Nothing new from …".
4. Disconnect with "Also remove what … brought": the records go; the message says whether access was revoked at the provider. Check the provider's connected-apps page: ZIGoals is gone (Oura's revoke method is the one **UNVERIFIED** step).
5. The first real answers: compare one night and one day with the provider's own app (asleep minutes, steps). The mappers follow the official references read 2026-10-07 (ADR-015 S76–S77); a mismatch is a bug to report, never a reason to adjust numbers.
**Rollback at any point:** kill switch back to `on` (one deploy), or delete `ZIGOALS_HEALTH_LINK_ORIGIN` on the app Worker; nothing else depends on it. People's tokens stay sealed on their devices; their next sync says the service is unavailable and changes nothing.

## Sources (all read 2026-10-07)
Oura: [authentication](https://cloud.ouraring.com/docs/authentication), [API v2](https://cloud.ouraring.com/v2/docs) (OpenAPI 1.41). Withings: [API reference](https://developer.withings.com/api-reference/) ([openapi.yaml](https://developer.withings.com/openapi.yaml)), [OAuth](https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/get-access/oauth-authorization-url), [tokens](https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/get-access/access-and-refresh-tokens-no-recover), [signatures](https://developer.withings.com/developer-guide/v3/get-access/sign-your-requests/), [plans](https://developer.withings.com/developer-guide/v3/withings-solutions/withings-api-plans). Polar: [AccessLink v3](https://www.polar.com/accesslink-api/) ([swagger.yaml](https://www.polar.com/accesslink-api/swagger.yaml)). Strava: [authentication](https://developers.strava.com/docs/authentication/), [rate limits](https://developers.strava.com/docs/rate-limits/), [getting started](https://developers.strava.com/docs/getting-started/), [reference](https://developers.strava.com/docs/reference/). Fitbit: [Web API](https://dev.fitbit.com/build/reference/web-api/), [Google Health migration](https://developers.google.com/health/migration). Garmin: [Health API](https://developer.garmin.com/gc-developer-program/health-api/). Apple: [HealthKit](https://developer.apple.com/documentation/healthkit). Android: [Health Connect](https://developer.android.com/health-and-fitness/health-connect).
