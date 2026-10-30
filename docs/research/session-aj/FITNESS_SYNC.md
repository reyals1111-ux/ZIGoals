# Fitness sync: every option, and why Session AJ builds file import

> **Research notes, Session AJ (owner decision D12).** Written on 2026-10-29 by a research helper. Unless a line says otherwise, every source was read on **2026-10-29**. **UNVERIFIED** marks a claim taken from a secondary source (a blog, a vendor guide, a forum) or from memory that the official page did not confirm when read. This is research, not legal advice. No provider was registered, contacted or signed up for. This session builds only **GPX and TCX file import** (no OAuth, no new Worker).

## Summary

- **Without a server-side secret, only file import works.** Every multi-user cloud API needs a client secret at token exchange (Strava, Polar, Oura, Withings, WHOOP, Suunto, COROS), a server to receive pushes (Garmin Starter), or a native app (HealthKit, Health Connect, Samsung). Google's Health API could run from a browser, but all its scopes are Restricted and need a security review.
- **The server half already exists for four providers.** `workers/health-link` (Session W, Part 8) handles Oura, Withings, Polar and Strava. It is built and **off**, and turning it on needs owner registration and deployment ([HEALTH_LINK_ACTIVATION.md](../../run11/HEALTH_LINK_ACTIVATION.md)).
- **GPX and TCX cover most people today.** Strava, Garmin, Polar, COROS, Suunto and Apple Health (`workout-routes/*.gpx` in its export) all let a person download one of them. The main remaining gap is **FIT**, a binary format and the "original" file from Garmin, Suunto, COROS and Strava.
- **Terms favour files too.** Strava shows API data only to its owner and reportedly limits caching to 7 days and bans AI use, which clashes with a lasting journal and ZIGi. A file the person exports and imports themselves does not come through the API. That reading is an interpretation, not a ruling.

## Method and evidence rules

- Official documentation was read first. Where an official page answered 403/404 or did not say, a secondary source is cited and marked **UNVERIFIED**.
- **CORS header probe (2026-10-29, from this sandbox):** `curl -X OPTIONS` with `Origin: https://example.org`, `Access-Control-Request-Method: POST` and `Access-Control-Request-Headers: authorization,content-type`. Results:

  | Endpoint | Result |
  |---|---|
  | `www.strava.com/api/v3/athlete` and `/oauth/token` | `access-control-allow-origin: *`, allows `authorization` |
  | `wbsapi.withings.net/v2/oauth2` | `*`, `Content-Type, *` (a wildcard never covers `Authorization`) |
  | Oura `api.ouraring.com/v2/...` | 400, no `Access-Control-Allow-Origin` for this origin |
  | Polar `www.polaraccesslink.com` and `polarremote.com` token | no CORS headers |
  | WHOOP `api.prod.whoop.com` | no CORS headers |
  | Garmin personal token endpoint | 403, no allow-origin |

  These match Session W's check of 2026-10-07. An open preflight never makes a client secret safe to ship to browsers.
- Repo context: [IMPORT_FORMATS.md](../../product/IMPORT_FORMATS.md) already reads Apple Health `export.xml` and Google Health CSV, recognises (but does not read) the Garmin archive, and has `apps/web/lib/import/zip-stream.ts` for archives.

---

## 1. Strava

- **API:** REST v3 plus webhooks (activity create, update and delete, and deauthorization; requires the `activity:read` scope). Data: activities with summary fields, streams (latlng, time, heartrate, altitude, cadence, watts), routes, athlete profile and weight (`profile:write` updates weight and FTP). No sleep or steps.
- **Auth:** OAuth 2.0 authorization code. The token exchange **and** refresh both send `client_secret`, which "should never be shared". The page does not mention PKCE. Access tokens last 6 hours, and each refresh issues a new refresh token and invalidates the old one. `POST /oauth/revoke` (HTTP Basic with client ID and secret) replaces `/oauth/deauthorize`, which ends on 2027-06-01. [developers.strava.com/docs/authentication](https://developers.strava.com/docs/authentication/)
- **Pure web app?** No. CORS is open (probe above), but the secret is needed at every refresh, so the secret would ship to every browser. This needs a Worker, and the health-link Worker already does it.
- **Cost and approval:** "A Strava subscription is a prerequisite for creating an app" ([getting started](https://developers.strava.com/docs/getting-started/)), reportedly from 2026-06-01 at about $11.99/month (**UNVERIFIED**; [TechRepublic](https://www.techrepublic.com/article/news-strava-api-scraping-crackdown/)). New apps allow only the developer's own account, and a dashboard upgrade allows 10 athletes. More needs a review form with screenshots of the Strava data and the "Connect with Strava" button. Limits: 200 requests per 15 minutes and 2,000 a day (400/4,000 after the upgrade) ([rate limits](https://developers.strava.com/docs/rate-limits/)). Reported: intermediary platforms no longer supported, club endpoints removed 2026-09-01, new host `api-v3.strava.com` from 2027-01-04 (**UNVERIFIED**, [Terra](https://tryterra.co/blog/strava-api-changes-2026)).
- **Terms:** [API Agreement](https://www.strava.com/legal/api), effective 2026-06-01, verified: "Strava Data provided by a specific user can only be displayed or disclosed in your Developer Application to that user". No sharing without explicit consent, no replicating Strava, deletion on termination, Marks only under the brand guidelines. The agreement read today has no cache or AI clause. A separate June 2026 **API Policy** reportedly limits caching to 7 days (§6.2), bars keeping location data beyond that (§5.7) and bars AI use, including prompts, embeddings, RAG and inference (§5.3) (**UNVERIFIED**; policy URL not found; [Strava community hub](https://communityhub.strava.com/developers-api-7/storing-activity-data-for-more-than-7-days-11716), [Sahha](https://sahha.ai/blog/health-api-ai-restrictions/)). If those hold, API data could neither stay in the journal past 7 days nor reach ZIGi.
- **Owner setup:** a Strava subscription, an API application with the callback domain set to the app origin, then the health-link Worker steps.
- **File export:** per activity, "Export Original" (often FIT) and "Export GPX". For TCX, add `/export_tcx` to the activity URL, which works only with GPS. Bulk: Settings → My Account → "Download your account", delivered by email link ([Strava support](https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data-and-Bulk-Export)). The archive's layout (an `activities.csv` plus original files, often gzipped) is **UNVERIFIED**, because the article does not list it.

## 2. Polar (AccessLink v3)

- **API:** REST plus one HMAC-signed webhook per client. Data: exercises (summary plus **FIT, TCX or GPX download**, only those uploaded in the last 30 days after registration), daily activity (up to 365 days back), continuous HR (5-minute samples), sleep, Nightly Recharge, cardio load, and physical info (weight, height) ([polar.com/accesslink-api](https://www.polar.com/accesslink-api/)).
- **Auth:** authorization code at `flow.polar.com/oauth2/authorization`. The token at `polarremote.com/v2/oauth2/token` uses HTTP Basic with `client_id:client_secret`. No PKCE is mentioned. Tokens "will not expire unless explicitly revoked", so there is no refresh. After the first token the app must `POST /v3/users` to register the person.
- **Pure web app?** No. The token call needs the secret, and neither Polar host sends CORS headers.
- **Cost and approval:** no fee stated. Clients are self-registered at `admin.polaraccesslink.com` with any Polar Flow account. Limits: 500 + users×20 per 15 minutes, 5,000 + users×100 per day. The AccessLink Limited License Agreement is royalty-free, bars services competing with Polar, and says the app's primary purpose should be improving the member's experience (excerpts, **UNVERIFIED** version, [LawInsider](https://lawinsider.com/contracts/8ClYmYHuNpX)). No minimum users or company requirement was found.
- **Owner setup:** a Polar Flow account, a client with the exact redirect URL, and the secret placed in health-link.
- **File export:** Polar Flow web → Diary → session → Export: GPX for the route; TCX, CSV (and FIT in some regions) for other data; multisport in GPX/TCX; zip option ([Polar support](https://support.polar.com/export-training-sessions-flow)).

## 3. Garmin (Connect Developer Program: Personal, Starter, Enterprise; Health/Activity APIs)

- **Tracks (reopened October 2026)** ([program overview](https://developer.garmin.com/gc-developer-program/overview/)):
  - **Personal:** own account only; Activity (JSON and .FIT), Health and Women's Health (JSON); pull only.
  - **Starter (business):** adds Courses and Training; push only, no history, limited users, "unverified" until reviewed.
  - **Enterprise:** adds Golf; push or ping/pull, a month or more of history, unlimited users, terms agreed case by case.

  Reported, **UNVERIFIED**: billing past 1,000 users from April 2027, Enterprise needs a public website and privacy policy ([the5krunner, 2026-10-22](https://the5krunner.com/2026/10/22/garmin-personal-api/), [iDevice](https://idevice.com/garmin-reopens-its-connect-api-with-free-personal-keys-and-a-fee-for-big-apps.md)), and undocumented FIT fields (VO2 max, recovery time) are stripped from API files.
- **Personal API key:** made on Garmin Connect web (expires after 30/90/180/365 days, shown once). It is exchanged at `personal.connectapi.garmin.com/…/personal-api-key/token` (`Authorization: ApiKey …`) for a 24-hour token with no refresh. "It is not intended for commercial applications serving multiple end users" ([personal FAQ](https://developer.garmin.com/gc-developer-program/personal/personal-faq/)). The probe got 403 with no CORS. A ZIGoals relay holding a person's own key would be a gray area under that sentence.
- **Business auth:** OAuth 2.0 with PKCE (S256), no scopes ([Garmin PKCE spec](https://developerportal.garmin.com/sites/default/files/OAuth2PKCE.pdf), [Nango](https://www.nango.dev/docs/api-integrations/garmin-oauth2)). Whether a secret is still needed is **UNVERIFIED** (PDF not opened). Starter is **push-only**: Garmin POSTs to the partner's endpoint, so ZIGoals would need a Worker that stores data until the device collects it, which the project has avoided.
- **File export:** per activity on Garmin Connect web: Export Original (FIT in a zip), Export to TCX, Export to GPX. The whole account: Garmin Account → Data Management → Export Your Data, link "usually within 48 hours" (as recorded in IMPORT_FORMATS.md; the Garmin support page answered 403 today, so the per-activity menu labels are **UNVERIFIED**).

## 4. Withings (Public Health Data API)

- **API:** REST `wbsapi.withings.net`: measures (weight, body composition, blood pressure, temperature, SpO2), activity (steps, calories), workouts, sleep (summary and stages), heart. Notifications (webhooks) call a partner callback URL, so they need a server.
- **Auth:** OAuth 2.0 authorization code. The code must be exchanged within **30 seconds** ([OAuth web flow](https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/get-access/oauth-web-flow/)). The `requesttoken` call sends `client_secret`, and several actions need an HMAC-SHA256 signature keyed with the secret over `action,client_id,nonce`, with a nonce from `/v2/signature` ([sign your requests](https://developer.withings.com/developer-guide/v3/integration-guide/bulkship-sdk/get-access/sign-your-requests)). No PKCE was found.
- **Pure web app?** No. The secret is used for both exchange and signing. CORS allows `*` but not `Authorization`.
- **Cost and approval:** a Public API "designed for individuals and partners without a formal contract" ([plans](https://developer.withings.com/developer-guide/v3/withings-solutions/withings-api-plans/)). Session W recorded (2026-10-07; the plan table did not load today): 10 users until a review, "Withings+ becomes required on the Start for Free API plan from October 12, 2026" for newer accounts, 120 requests/minute (errors as body status 601 under HTTP 200), and an HTTP, localhost or non-standard-port callback keeps the 10-user cap.
- **Owner setup:** an application with the exact callback URL, the secret in health-link, and possibly Withings+.
- **File export:** web dashboard → Settings → "Download my data", or the app's "Export All Health Data": a zip of CSVs ([Withings support](https://support.withings.com/hc/en-us/articles/360001391287-Privacy-How-can-I-export-my-data)). No GPX/TCX.

## 5. Oura (API v2)

- **API:** REST v2: daily sleep, activity, readiness, sleep periods, workouts, sessions, heart rate (time series), SpO2, personal info (weight, height). Webhook subscriptions exist and need a server endpoint.
- **Auth:** authorization-code flow (PKCE S256 recommended; the token call needs the secret unless sent as HTTP Basic with the secret) **and** a client-side implicit flow (`response_type=token`). The implicit flow puts the token in the URL fragment, has no refresh, and the token expires after 30 days. Personal access tokens are listed as deprecated ([authentication](https://cloud.ouraring.com/docs/authentication)).
- **Pure web app?** Almost. The implicit flow needs no secret, but the API sent no `Access-Control-Allow-Origin` to either probe, so the browser cannot read the answer. The person would re-authorise every 30 days, and current OAuth guidance discourages implicit flows.
- **Cost and approval:** apps are limited to **10 users until Oura approves them** ([Oura support](https://partnersupport.ouraring.com/hc/en-us/articles/20949682312211-Intro-to-the-Oura-API)). Gen3 and Ring 4 users **without an active Oura Membership cannot use the API**, so a 403 can mean the subscription lapsed ([Oura support](https://support.ouraring.com/hc/en-us/articles/4415266939155-The-Oura-API)). Session W recorded a limit of 5,000 requests per 5 minutes. A 2026-06-08 agreement reportedly restricts AI use of API data (**UNVERIFIED**, [Terra](https://tryterra.co/blog/oura-api-ai-apps-access-permissions-commercial-restrictions)).
- **File export:** Membership Hub → Export data → Request your data gives a CSV within up to 10 days, open to all users. Oura on the Web → "Download Data" gives chosen metrics ([Oura support](https://support.ouraring.com/hc/en-us/articles/360025441594)). Durations are in seconds. There is no GPX/TCX.

## 6. WHOOP (Developer API v2)

- **API:** REST v2 (v1 webhooks retired November 2025, **UNVERIFIED**): profile, body measurements (height, weight, max HR), cycles (strain), recovery (HRV, resting HR), sleep, workouts (sport, strain, HR zones). There is no GPS route and no steps. Webhooks (`workout.updated`, `sleep.updated`, `recovery.updated`, and the matching `.deleted` events) are HMAC-signed and need a server.
- **Auth:** OAuth 2.0 authorization code. A refresh token is issued only with the `offline` scope, and the refresh payload includes `client_secret` ([WHOOP OAuth](https://developer.whoop.com/docs/developing/oauth)). No PKCE is mentioned, and the probe found no CORS.
- **Approval:** **10 members** in development. More needs approval: a working integration, a privacy policy, accurate contact information, and the design guidelines. No published review time (**UNVERIFIED**, [Terra](https://tryterra.co/blog/whoop-api-data-access-permissions-limitations-2026), [Thryve](https://www.thryve.health/blog/whoop-api-data-access-integration)). No fee was found.
- **File export:** in-app Data Export emails a link (expires after 7 days) to `physiological_cycles.csv`, `sleeps.csv`, `workouts.csv`, `journal_entries.csv` (**UNVERIFIED**, [WHOOP community](https://www.community.whoop.com/t/expose-step-count-in-the-developer-api-and-the-data-export/16226), [gneta](https://www.gneta.app/blog/export-whoop-data-guide)).

## 7. COROS

- **Partner API:** private documentation. It requires "an established platform with demonstrated user base" and "a registered company with authorized technical representative", plus security and privacy compliance and the COROS API Terms. COROS issues a Client ID and Secret after identity and security checks. OAuth 2.0, webhooks, two-way sync, 1,000 calls/minute ([COROS: Submit an API Application](https://support.coros.com/hc/en-us/articles/17085887816340-Submit-an-API-Application); details via search summary, **UNVERIFIED** in parts; [Nango](https://nango.dev/docs/integrations/all/coros.md)). Pricing is reportedly custom (**UNVERIFIED**).
- **Self-service and MCP:** a 2026 article reports a self-service OAuth route "no application approval is required" (22 fields, can write training plans), and a read-only COROS MCP connector for the person's own data (FIT files, 50 file requests a day) (**UNVERIFIED**, [Runner's Picks, 2026-09-11](https://www.runnerspicks.com/blog/coros-mcp-connect-chatgpt-claude/); the COROS page answered 403).
- **Pure web app?** No for partners (secret, company). The self-service route is unknown.
- **File export:** Training Hub (desktop) → Activity List → Export Data, **FIT or TCX only**, by email. Daily and sleep data only through Contact Support ([COROS support](https://support.coros.com/hc/en-us/articles/25002333092500-Requesting-a-Bulk-Export-of-COROS-Data)). Single activities from the app as FIT/GPX/TCX/KML (**UNVERIFIED**, [gneta](https://www.gneta.app/blog/export-coros-data-guide)).

## 8. Suunto (API Zone / Suunto Cloud API)

- **API:** read workouts as **FIT** (GPS, HR, laps) and daily activity (steps, calories). Push routes (GPX) and workouts (FIT). **Sleep, weight and HR zones are not yet supported.** Webhooks are matched by username in the JWT ([API Zone FAQ](https://apizone.suunto.com/faq)).
- **Auth:** OAuth 2.0 code → JWT via HTTP Basic (client ID and secret). Every Cloud API call also needs an `Ocp-Apim-Subscription-Key` header. There is no mobile SDK.
- **Eligibility:** "companies and organizations", commercial or not, **"not for personal use"**. Apply through the partner program and sign the API Agreement. Answers come within two weeks. No price is stated ([apizone.suunto.com](https://apizone.suunto.com/)).
- **Pure web app?** No (secret, subscription key, company).
- **File export:** in the app, workout → ⋯ → **FIT** (preferred: HR, power, cadence) or **GPX** (location, time, HR where recorded). Non-GPS workouts are **FIT only**. Routes export as GPX ([Suunto FAQ](https://www.suunto.com/en-ca/Support/faq-articles/suunto-app/what-type-of-files-can-i-export-from-the-suunto-app)).

## 9. Google Fit and Health Connect

- **Google Fit APIs:** "The Google Fit APIs, including the Google Fit REST API, will be deprecated in 2026". No new sign-ups since **2024-05-01**. Google recommends the Google Health API for cloud integrations and Health Connect for mobile ([Fit support](https://developers.google.com/fit/support), [migration FAQ](https://developer.android.com/health-and-fitness/health-connect/migration/fit/faq)). The Fit *app* itself is not being withdrawn (**UNVERIFIED**, [Terra](https://docs.tryterra.co/faq/help-topics/data-api-sdk/account-config-environments-and-going-live/google-fit-2026-deprecation)). There is no exact end-of-service date on the official page. ZIGoals should not build on it.
- **Health Connect:** "available on the Android platform only", with on-device storage ([FAQ](https://developer.android.com/guide/health-and-fitness/health-connect/frequently-asked-questions), [comparison guide](https://developer.android.com/health-and-fitness/health-connect/comparison-guide)). It has exercise sessions with routes, heart rate, sleep, steps and weight, and is free. Reaching it needs a native Android app with Health Connect permissions and a Play Console health-permissions declaration. A PWA cannot reach it, and data written there does not appear in the Google Health API (**UNVERIFIED**).
- **File export:** no first-party GPX/TCX. Apps that write to Health Connect usually export their own files.

## 10. Apple Health (HealthKit)

- **API:** HealthKit is an on-device framework for iOS, iPadOS and watchOS apps. **There is no web or REST API** ([HealthKit](https://developer.apple.com/documentation/healthkit)). Using it needs a native app, an Apple Developer Program membership, the HealthKit entitlement, App Review, and a privacy policy.
- **File export:** Health app → profile → **Export All Health Data** gives a zip with `export.xml` (already read by ZIGoals), `export_cda.xml`, ECGs, and **`workout-routes/*.gpx`**, one per workout route, named by date rather than workout type ([iGeeksBlog](https://www.igeeksblog.com/how-to-import-and-export-health-app-data-on-iphone/), [Macwelt](https://www.macwelt.de/article/2279875/apple-health-daten-exportieren.html); the layout is **UNVERIFIED** against Apple). These GPX files carry position, elevation and time, with speed and accuracy in extensions, but **no heart rate** (**UNVERIFIED**). HR for the workout is in `export.xml` (`<Workout>` and `HKQuantityTypeIdentifierHeartRate` records). Each GPX links to its `<Workout>` via a `<WorkoutRoute>`/`FileReference` path, so a later session can join the two.

## 11. Samsung Health

- **API:** the **Samsung Health Data SDK** for Android (on-device; the old Health SDK for Android was deprecated 2025-07-31). Distribution needs an approved **partner request**: Samsung registers the app's package name and SHA-256 signing certificate, and without that it runs only in Samsung Health's developer mode. Writing needs an access code issued after approval ([Samsung process](https://developer.samsung.com/health/data/process.html), [Junction](https://docs.junction.com/wearables/guides/samsung-health)). There is no web or cloud API. Samsung Health can also sync into Health Connect.
- **Pure web app?** No.
- **File export:** Settings → "Download personal data" gives a CSV/JSON zip by email link. Exercise is in `com.samsung.shealth.exercise…`, and the columns are undocumented (**UNVERIFIED**, [Samsung developer forum](https://forum.developer.samsung.com/t/understanding-personal-data-from-samsung-health-app/32406)).

## 12. Fitbit → Google Health API

- **Status:** the banner read today says: "On September 30, 2026, support for the legacy Fitbit Web API ended" and "On November 2, 2026, the legacy Fitbit Web API and Fitbit OAuth endpoints will be turned off" ([v4 reference](https://developers.google.com/health/reference/rest/v4/users), [migration](https://developers.google.com/health/migration)). **IMPORT_FORMATS.md quotes 30 October**, which Google's page has since moved. A reported email set a 30 October user-migration deadline (**UNVERIFIED**, [Gadgets & Wearables](https://gadgetsandwearables.com/2026/09/28/fitbit-api-migration-deadline-october-30/)). Fitbit authorizations do not carry over.
- **Google Health API:** REST v4 with workouts, sleep, vitals, steps, calories, nutrition and more, a "Reconciled Stream", and webhooks ([about](https://developers.google.com/health/about)). Google OAuth 2.0, and "all scopes are Restricted", needing "a privacy and security review". That typically means app verification plus a yearly third-party CASA assessment past 100 users (**UNVERIFIED**, [Open Wearables](https://openwearables.io/blog/google-casa-oauth-verification-health-apps)). Session W recorded "not onboarding new projects at this time". Today's migration page instead mentions "a new console for registering your apps", so the onboarding status is **UNVERIFIED**.
- **Pure web app?** The closest of all. Google OAuth supports browser public clients with no secret. CORS on `health.googleapis.com` was not established (the probe hit a wrong path). The blocker is the review and its yearly cost, not the architecture.
- **File export:** Google Takeout → "Google Health". The output is mostly JSON and CSV, and after migration there is no choice of metric or date range (**UNVERIFIED**, [Fitbit community](https://community.fitbit.com/t5/Product-Feedback/Able-to-select-which-data-to-export-and-date-range-after-Google-migration/idi-p/5483105/page/3)). The Fitbit app could export GPS exercises as TCX (**UNVERIFIED**). Owner decision RM7 (Session AH) already stopped new Fitbit work.

---

## Comparison

| Provider | Workouts / routes / HR / sleep / steps / weight | Cost to ZIGoals | Browser-only? | Server-side secret or server | Approval and caps | Person's own file export |
|---|---|---|---|---|---|---|
| Strava | ✓ / ✓ / ✓ / – / – / write only | Subscription required | No | Secret on exchange and refresh | 1 → 10 self-serve; review beyond; 200/15 min | GPX, TCX (GPS), original (FIT), bulk zip |
| Polar | ✓ (FIT/TCX/GPX) / ✓ / ✓ / ✓ / ✓ / ✓ | None found | No | Secret (Basic); webhook optional | Self-registered; no cap found | GPX, TCX, CSV, (FIT) |
| Garmin Personal | ✓ (FIT) / ✓ / ✓ / ✓ / ✓ / ✓ | Free | No (no CORS) | Person's own key; relay needed | Own account only; "not for commercial apps" | FIT, TCX, GPX, account archive |
| Garmin Starter/Enterprise | all + Courses/Training | Fees for >1,000 users from 2027 (UNVERIFIED) | No | Push endpoint (stateful server) | Business review; Starter limited | as above |
| Withings | ✓ / – / ✓ / ✓ / ✓ / ✓ | Withings+ may be required | No | Secret plus signed calls | 10 users until review; 120/min | CSV zip |
| Oura | ✓ / – / ✓ / ✓ / ✓ / ✓ | Users need Membership | No (no CORS; implicit flow 30 days) | Secret for refresh | 10 users until approval | CSV |
| WHOOP | ✓ / – / zones / ✓ / – / ✓ | None found | No | Secret for refresh | 10 members until approval | CSV (UNVERIFIED) |
| COROS | ✓ / ✓ / ✓ / ? / ? / ? | Custom (UNVERIFIED) | No | Secret; company | Established platform and company | FIT, TCX (bulk) |
| Suunto | ✓ (FIT) / ✓ / ✓ / – / ✓ / – | None stated | No | Secret plus subscription key; company | Companies only, not personal | FIT, GPX |
| Health Connect | ✓ / ✓ / ✓ / ✓ / ✓ / ✓ | Free | No (Android app) | Native app | Play health declaration | none first-party |
| Apple HealthKit | ✓ / ✓ / ✓ / ✓ / ✓ / ✓ | Developer Program | No (iOS app) | Native app | App Review | export.xml + GPX routes |
| Samsung Health | ✓ / ? / ✓ / ✓ / ✓ / ✓ | Free | No (Android app) | Native app | Partner approval | CSV/JSON zip |
| Google Health API | ✓ / ? / ✓ / ✓ / ✓ / ✓ | CASA assessment (UNVERIFIED) | Possibly (Google OAuth) | None in principle | Restricted-scope review; onboarding unclear | Takeout JSON/CSV |
| Google Fit APIs | deprecated | – | – | – | no sign-ups since 2024-05-01 | – |

## Recommendation, by value for effort (later sessions)

1. **GPX and TCX import (this session).** Covers Strava, Garmin, Polar, COROS, Suunto (GPS workouts) and Apple Health routes, with no server, account or API terms. The file stays on the device.
2. **FIT import, hand-written.** The largest remaining gap: Garmin and Strava originals, Suunto non-GPS workouts, COROS bulk. FIT is documented (Garmin FIT SDK), and only the `session`, `lap` and `record` messages are needed. With no new dependencies allowed, this is medium effort and needs a fuzz corpus. No server.
3. **Archive import.** Strava's bulk zip, Garmin's account archive (already recognised), and joining Apple Health's `workout-routes/*.gpx` to `export.xml` workouts, reusing `lib/import/zip-stream.ts`. Check each layout against a real export first (Strava's is **UNVERIFIED**).
4. **Turn on health-link for Polar** (**deployment and owner approval**). It is free and self-registered, its tokens do not expire, and its exercise downloads are the same FIT/TCX/GPX files. Then **Oura and Withings**, if the owner accepts their user subscriptions and 10-user caps.
5. **Strava API last of the four.** It needs a subscription, starts at one athlete, and its reported 7-day cache and AI rules conflict with the journal and ZIGi. Get Strava's written answer first. "Export GPX/TCX" gives people the same data without those limits.
6. **Not now:** Garmin business tiers (stateful push server, fees), WHOOP (approval, secret, no routes), COROS and Suunto (company requirements), Google Health API (restricted review plus CASA). HealthKit, Health Connect and Samsung need a native app. Reconsider a Garmin personal-key relay only if Garmin's personal terms allow it.

Items 4–6 need a server-side secret or server: a Worker change and **owner approval**. Items 1–3 need neither.

---

## Appendix: reading GPX 1.1 and TCX v2

### GPX 1.1 (`http://www.topografix.com/GPX/1/1`; schema: [topografix.com/GPX/1/1](https://www.topografix.com/GPX/1/1/))

| Need | Where |
|---|---|
| Activity type | `gpx/trk/type`: free text, no enumeration. Seen values include `running`, `cycling`, `hiking`, and Strava's older numeric codes such as `9` (**UNVERIFIED**). Map case-insensitively and default to "other". |
| Name | `trk/name`, else `metadata/name` |
| Start time | first `trkpt/time` (ISO 8601 `xsd:dateTime`, UTC per the GPX documentation). `metadata/time` is the file's creation time, not always the start. |
| Duration | elapsed = last − first `trkpt/time` across all segments. Moving time = elapsed minus gaps (below). |
| Distance | not stored. Sum haversine distances between consecutive `trkpt` (`lat`, `lon` attributes, WGS84) **within** each `trkseg`, not across segment breaks. |
| Elevation gain | `trkpt/ele` (metres). Sum positive deltas after smoothing or a hysteresis threshold (about 3–5 m), otherwise GPS noise inflates gain by a large factor. |
| Heart rate | `trkpt/extensions/gpxtpx:TrackPointExtension/gpxtpx:hr` (unsigned byte ≥ 1). Namespace `http://www.garmin.com/xmlschemas/TrackPointExtension/v1` **or** `/v2` ([v2 xsd](https://www8.garmin.com/xmlschemas/TrackPointExtensionv2.xsd): `hr`, `cad`, `atemp`, `wtemp`, `depth`, `speed`, `course`, `bearing`, all optional). Some apps write ClueTrust `gpxdata:hr` (`http://www.cluetrust.com/XML/GPXDATA/1/0`). Average HR = time-weighted mean over points that have `hr`. |

**Pitfalls**
- **Namespaces and prefixes vary** (`gpxtpx:`, `ns3:`, `tpx:`, default). Match on namespace URI plus `localName`, never on a prefix string. Accept GPX 1.0 (`http://www.topografix.com/GPX/1/0`), which has `trk/trkseg/trkpt` and allows `<speed>` and `<course>` directly in the point.
- **Several `trk` or `trkseg`.** A new segment means lost signal or a pause, so do not bridge it for distance. Several `trk` in one file may be several activities. Import each as its own record, or ask.
- **`rte` and `wpt` are not activities.** A route (`rte/rtept`) is a planned course with no times. Refuse it with a clear message rather than importing a zero-duration workout.
- **Missing timestamps.** Points without `time` (drawn routes, some exports) leave no duration. Show "no times in this file" rather than estimating.
- **Pauses.** GPX has no pause marker. Treat a gap greater than about 30–60 s, or speed near zero, as stopped time. Show both elapsed and moving time, and label which is which.
- **Apple Health route GPX** has no HR. Join it with `export.xml` if needed.

### TCX (`http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2`; [xsd](https://www8.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd))

Path: `TrainingCenterDatabase/Activities/Activity[@Sport]/Id` and `Lap[@StartTime]+`, each with `TotalTimeSeconds`, `DistanceMeters`, `Calories`, `AverageHeartRateBpm/Value`, `MaximumHeartRateBpm/Value`, `Intensity`, `TriggerMethod`, and `Track*` → `Trackpoint+` (`Time`, `Position/LatitudeDegrees|LongitudeDegrees`, `AltitudeMeters`, `DistanceMeters`, `HeartRateBpm/Value`, `Cadence`, `SensorState`).

| Need | Where |
|---|---|
| Activity type | `Activity/@Sport`: only `Running`, `Biking`, `Other`. Anything finer (swim, hike) is lost unless the creator wrote it in `Notes` or an extension. |
| Start time | `Activity/Id` (an `xsd:dateTime`, by convention the start), else the first `Lap/@StartTime` |
| Duration | Σ `Lap/TotalTimeSeconds` = **timer time** (excludes auto-pause). Elapsed = last `Trackpoint/Time` − `Id`. |
| Distance | Σ `Lap/DistanceMeters`, or the last cumulative `Trackpoint/DistanceMeters`. Prefer the laps, and cross-check. |
| Elevation gain | not stored in core TCX. Compute from `Trackpoint/AltitudeMeters`, with the same smoothing as GPX. |
| Average HR | Lap `AverageHeartRateBpm/Value` weighted by each lap's `TotalTimeSeconds`; if absent, the time-weighted mean of `Trackpoint/HeartRateBpm/Value`. Note the `Value` child element, which is not text directly in `AverageHeartRateBpm`. |
| Extras | `Extensions/ns3:TPX` (`Speed`, `RunCadence`, `Watts`) and `Lap/Extensions/LX` (`AvgSpeed`, `AvgRunCadence`, `AvgWatts`) in `http://www.garmin.com/xmlschemas/ActivityExtension/v2` |

**Pitfalls**
- **Default namespace on every element.** Querying `getElementsByTagName('Lap')` works in browsers, but a prefix-based XPath will not. Use `getElementsByTagNameNS(TCX_NS, …)` and tolerate files that omit the namespace.
- **Several laps and tracks.** Sum laps. Garmin starts a new `Track` inside a lap after a pause, so do not compute distance or speed across a `Track` boundary. Trackpoints are sometimes duplicated at lap edges, so de-duplicate by `Time`.
- **Several activities** in `Activities`, or a `MultiSportSession`: import each `Activity` separately, or refuse with a clear message.
- **Trackpoints without `Position`** (treadmill, indoor bike) are valid. Distance then comes from `DistanceMeters`. Points with only `Time` and `HeartRateBpm` are common.
- **Missing or odd times:** a `Time` without a zone designator is local time of unknown offset. Flag it rather than assuming UTC. `TotalTimeSeconds` of 0 with trackpoints present means using elapsed time instead.
- **Leading whitespace or a BOM before `<?xml`** appears in some exported TCX files and makes `DOMParser` fail (**UNVERIFIED** as to which creators). Trim before parsing.

### Shared parsing rules for the browser

- `DOMParser` does not throw on bad XML. It returns a document containing `<parsererror>`, so check for that. Browsers do not fetch external entities, but cap the file size and point count, parse in a Web Worker so large tracks do not freeze the page, and treat every number as untrusted. Reject NaN, negative durations, heart rate above 250, and coordinates out of range.
- Use deterministic ids (for example, a hash of source, start time and sport) so that re-importing the same file, or the same run exported from two services, does not double-count. This follows the existing import rules in IMPORT_FORMATS.md (one source per day, nothing estimated).
- A track reveals where the person lives. Keep it on the device, never send it to ZIGi by default, and offer to drop the track and keep only the summary.

## Sources

All read 2026-10-29 unless noted. Official: developers.strava.com ([authentication](https://developers.strava.com/docs/authentication/), [rate limits](https://developers.strava.com/docs/rate-limits/), [getting started](https://developers.strava.com/docs/getting-started/)), [Strava API Agreement](https://www.strava.com/legal/api), [Strava export help](https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data-and-Bulk-Export), [Polar AccessLink](https://www.polar.com/accesslink-api/), [Polar export help](https://support.polar.com/export-training-sessions-flow), [Garmin program overview](https://developer.garmin.com/gc-developer-program/overview/), [Garmin personal FAQ](https://developer.garmin.com/gc-developer-program/personal/personal-faq/), [Garmin TrackPointExtension v2](https://www8.garmin.com/xmlschemas/TrackPointExtensionv2.xsd), [TCX v2 schema](https://www8.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd), [GPX 1.1 schema](https://www.topografix.com/GPX/1/1/), [Withings OAuth flow](https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/get-access/oauth-web-flow/), [Withings plans](https://developer.withings.com/developer-guide/v3/withings-solutions/withings-api-plans/), [Withings export](https://support.withings.com/hc/en-us/articles/360001391287-Privacy-How-can-I-export-my-data), [Oura authentication](https://cloud.ouraring.com/docs/authentication), [Oura API support](https://support.ouraring.com/hc/en-us/articles/4415266939155-The-Oura-API), [Oura partner intro](https://partnersupport.ouraring.com/hc/en-us/articles/20949682312211-Intro-to-the-Oura-API), [Oura export](https://support.ouraring.com/hc/en-us/articles/360025441594), [WHOOP OAuth](https://developer.whoop.com/docs/developing/oauth), [COROS API application](https://support.coros.com/hc/en-us/articles/17085887816340-Submit-an-API-Application), [COROS bulk export](https://support.coros.com/hc/en-us/articles/25002333092500-Requesting-a-Bulk-Export-of-COROS-Data), [Suunto API Zone](https://apizone.suunto.com/) and [FAQ](https://apizone.suunto.com/faq), [Suunto export FAQ](https://www.suunto.com/en-ca/Support/faq-articles/suunto-app/what-type-of-files-can-i-export-from-the-suunto-app), [Google Fit support](https://developers.google.com/fit/support), [Health Connect FAQ](https://developer.android.com/guide/health-and-fitness/health-connect/frequently-asked-questions), [Health Connect comparison](https://developer.android.com/health-and-fitness/health-connect/comparison-guide), [Google Health API about](https://developers.google.com/health/about), [migration](https://developers.google.com/health/migration), [v4 users reference](https://developers.google.com/health/reference/rest/v4/users), [HealthKit](https://developer.apple.com/documentation/healthkit), [Samsung Health Data SDK process](https://developer.samsung.com/health/data/process.html). Secondary (claims marked UNVERIFIED above): Terra ([Strava](https://tryterra.co/blog/strava-api-changes-2026), [WHOOP](https://tryterra.co/blog/whoop-api-data-access-permissions-limitations-2026), [Oura](https://tryterra.co/blog/oura-api-ai-apps-access-permissions-commercial-restrictions)), [TechRepublic](https://www.techrepublic.com/article/news-strava-api-scraping-crackdown/), [Sahha](https://sahha.ai/blog/health-api-ai-restrictions/), [Strava community hub](https://communityhub.strava.com/developers-api-7/storing-activity-data-for-more-than-7-days-11716), [the5krunner](https://the5krunner.com/2026/10/22/garmin-personal-api/), [iDevice](https://idevice.com/garmin-reopens-its-connect-api-with-free-personal-keys-and-a-fee-for-big-apps.md), [Nango Garmin](https://www.nango.dev/docs/api-integrations/garmin-oauth2), [Nango COROS](https://nango.dev/docs/integrations/all/coros.md), [Runner's Picks](https://www.runnerspicks.com/blog/coros-mcp-connect-chatgpt-claude/), [gneta COROS](https://www.gneta.app/blog/export-coros-data-guide), [gneta WHOOP](https://www.gneta.app/blog/export-whoop-data-guide), [WHOOP community](https://www.community.whoop.com/t/expose-step-count-in-the-developer-api-and-the-data-export/16226), [Thryve](https://www.thryve.health/blog/whoop-api-data-access-integration), [Open Wearables CASA](https://openwearables.io/blog/google-casa-oauth-verification-health-apps), [Gadgets & Wearables](https://gadgetsandwearables.com/2026/09/28/fitbit-api-migration-deadline-october-30/), [Fitbit community](https://community.fitbit.com/t5/Product-Feedback/Able-to-select-which-data-to-export-and-date-range-after-Google-migration/idi-p/5483105/page/3), [Junction Samsung](https://docs.junction.com/wearables/guides/samsung-health), [Samsung forum](https://forum.developer.samsung.com/t/understanding-personal-data-from-samsung-health-app/32406), [iGeeksBlog](https://www.igeeksblog.com/how-to-import-and-export-health-app-data-on-iphone/), [Macwelt](https://www.macwelt.de/article/2279875/apple-health-daten-exportieren.html), [LawInsider Polar licence](https://lawinsider.com/contracts/8ClYmYHuNpX). Repo: [HEALTH_LINK_ACTIVATION.md](../../run11/HEALTH_LINK_ACTIVATION.md) (read 2026-10-07 by Session W), [IMPORT_FORMATS.md](../../product/IMPORT_FORMATS.md).
