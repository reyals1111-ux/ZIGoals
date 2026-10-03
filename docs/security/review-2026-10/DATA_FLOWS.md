# Data flows: what each provider can see (2026-10-03)

> **Internal review by an AI (Claude), not a professional security audit.** Session Q, against `main` at `d439dc9`.
> - Live facts come from one plain GET of each public page and public DNS records, on 2026-10-03 (UTC). Nothing was logged into, scanned or probed.
> - The repository is public, so this text is public too.
> - Each mismatch with public wording is a finding in [FINDINGS.md](FINDINGS.md) (`Q-PRIV-*`).

## In plain words
- **What leaves a device in plaintext:**
  - an email address and a one-time code, during sign-in;
  - public identifiers: an asset ID, a barcode, a public ZIGChain address;
  - ordinary web request data: IP address, browser and page paths.
- **What never leaves a device in plaintext:** the content of Goals, Wealth, Habits, Health and settings. Encrypted sync seals it before upload, with keys the server never holds.
- **The server and the hosting provider see a lot of metadata:**
  - who the account is;
  - which section a record belongs to (Goals and Wealth, Habits, Health or settings);
  - how big each record is;
  - when it changed;
  - which devices are signed in, with the label the person chose;
  - when something was deleted.
- **The landing understates that metadata.** The landing says the server sees "your account, record identifiers, sizes and times". The [privacy notice draft](../../legal/PRIVACY_NOTICE_DRAFT.md) and Help also name the section; the landing does not. See `Q-PRIV-02`.
- **Cloudflare's network error reporting (NEL) is on for `zigoals.app`.** When a page fails to load, browsers may send a small error report to `a.nel.cloudflare.com`. That fits "infrastructure reporting" (already disclosed in [PRIVACY.md](../../PRIVACY.md)) better than "no trackers", and the owner can switch it off. See `Q-PRIV-04`.
- **"Deleted" is not instant everywhere:**
  - Cloudflare keeps 30 days of point-in-time recovery for Durable Object storage;
  - a minimal deletion record is kept for good, on purpose, so that deleted data cannot come back;
  - some caches and counters are pruned lazily.

  See `Q-PRIV-01` and `Q-PRIV-03`.

## Live response headers (2026-10-03)
Read with `curl` around 17:24 UTC, user agent `ZIGoals-internal-review-passive-header-check`, one request per URL.

| Header | `https://zigoals.app/` (landing) | `https://alpha.zigoals.app/app` (public Alpha) |
|---|---|---|
| `content-security-policy` | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests`. Strict, no `unsafe-*` | `script-src 'self' 'nonce-…' 'strict-dynamic'`; `style-src 'self' 'unsafe-inline'`; `connect-src 'self'` plus the ZIGChain testnet RPC and REST; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `upgrade-insecure-requests`. A fresh nonce on each response |
| `strict-transport-security` | absent (deliberate: [LANDING.md](../../deployment/LANDING.md)) | `max-age=31536000` (no `includeSubDomains`, no `preload`) |
| `x-frame-options` | `DENY` | `DENY` |
| `x-content-type-options` | `nosniff` | `nosniff` |
| `referrer-policy` | `strict-origin-when-cross-origin` | `no-referrer` |
| `permissions-policy` | Accelerometer, camera, display capture, geolocation, gyroscope, magnetometer, microphone, payment and USB all denied, plus `interest-cohort=()` | camera, microphone and geolocation denied (`/app/health` allows camera for itself: `next.config.ts`) |
| `cross-origin-opener-policy` | `same-origin` | absent (FINDINGS `Q-WEB-01`) |
| `cache-control` | `public, max-age=0, must-revalidate` | `private, no-store, max-age=0` |
| `report-to` / `nel` | `cf-nel` group to `https://a.nel.cloudflare.com/report/v4?...`, `success_fraction 0.0`, `max_age 604800` | same |
| `x-robots-tag` | absent | `noindex, nofollow, noarchive` |

Other observations:
- **Plain HTTP:** `http://zigoals.app/` and `http://alpha.zigoals.app/app` answered `200` over plain HTTP, with no redirect to HTTPS (`server: cloudflare`).
  - Browsers never send those requests, because the whole `.app` top-level domain is on the HSTS preload list (Google Registry, below).
  - So this matters only for non-browser clients and as defence in depth. See `Q-AUTH-09`.
- **The acctest host:** `accounts-test.zigoals.app` did not resolve (NXDOMAIN) at 17:24 UTC, so nothing was read there.

## DNS and email (public records, 2026-10-03, DNS over HTTPS)
| Record | Value | What it means |
|---|---|---|
| NS | `haley.ns.cloudflare.com`, `memphis.ns.cloudflare.com` | Cloudflare hosts the zone |
| MX | `route1/2/3.mx.cloudflare.net` | Cloudflare Email Routing forwards `hello@` and `contact@` to the owner's mailbox. Security reports therefore pass through Cloudflare |
| SPF (`zigoals.app`) | `v=spf1 include:_spf.mx.cloudflare.net ~all` | Soft fail. There is no Resend entry here; Resend is meant to use a dedicated sending subdomain (ACTIVATION Stage 2) |
| DMARC (`_dmarc.zigoals.app`) | `v=DMARC1; p=none; rua=mailto:contact@zigoals.app; adkim=r; aspf=r` | Monitoring only. Receivers do not reject mail that spoofs `@zigoals.app`. See `Q-OPS-01` |
| CAA | none | Any public certificate authority may issue for the domain |
| DS (DNSSEC) | none | DNSSEC is not enabled |
| `www.zigoals.app` | NXDOMAIN | — |

## Who sees what
"Today" is the live state: the landing, plus the public Alpha with no accounts. "With accounts" is the Stage 7/8 topology in [ACTIVATION.md](../../run11/ACTIVATION.md).

| Party | Role | What it receives | What it keeps | Today / with accounts |
|---|---|---|---|---|
| **Cloudflare (edge)** | TLS termination, hosting, Workers | Every HTTP request to `zigoals.app`, `alpha.zigoals.app` and the acctest host. That means IP address, user agent, paths (a goal page path holds the goal's ID) and timing. With accounts, it also terminates TLS for sign-in and sync, so it can technically see the email address, the code and the session tokens in transit | Cloudflare's own infrastructure logs and analytics, under its terms. Worker observability is off in every template (`observability.enabled: false`), so ZIGoals keeps no request logs | Both |
| **Cloudflare network error reporting (NEL)** | Browser-side error reports | When a page or resource fails to load: the URL, the error type, the protocol and the elapsed time, sent by the browser to `a.nel.cloudflare.com`. `success_fraction` is 0, so successes are not reported. The policy is cached in the browser for 7 days. CSP does not govern these reports | Cloudflare | Both (owner can disable: `PATCH /zones/{zone_id}/settings/nel`) |
| **Cloudflare Durable Objects: private sync** (`PrivateVault`) | Encrypted sync storage | Ciphertext, plus the metadata listed in the next table | Until deleted. Then a terminal `account-deleted` marker. Point-in-time recovery for 30 days | With accounts |
| **Cloudflare Durable Objects: lifecycle** (`LifecycleAuthority`) | Deletion authority | Account UUID; deletion generation and time; the session family that authorised the deletion; per-section deletion decisions with times; operation receipts | **Indefinitely** (design: "lifecycle tombstones never prune"), plus point-in-time recovery | With accounts |
| **Cloudflare Durable Objects: admission** (`AdmissionAuthority`) | Abuse limits for sign-in | HMAC-SHA-256 of the email address and of the IP group (IPv4, or IPv6 /64), keyed with `AUTH_ADMISSION_KEY`; counters and expiry times | Windows of up to 24 h, **pruned lazily**: expired rows are removed only when that shard is used again, at most 64 per request (`workers/auth-abuse/worker.mjs:79`) | With accounts |
| **Cloudflare Durable Objects: food** (`FoodBudget`) | Barcode lookup cache | Barcode numbers (cache misses go to Open Food Facts) | Answers are *used* for 24 h. Expired rows are only removed when more than 256 are cached (`workers/food-lookup/worker.mjs:47-48`), so a small cache can keep old barcodes for longer | With accounts (the live Alpha has no food binding) |
| **Cloudflare Durable Objects: market** (`MarketAccount`) | Price cache, budget and work fences | Public asset IDs, quote currencies, history ranges, timing | Caches, budget counters, telemetry by policy | With accounts (the live Alpha resolves markets to "unavailable": [MARKET_KEY_CUSTODY.md](../../run11/MARKET_KEY_CUSTODY.md)) |
| **Supabase Auth** | Sign-in provider | Email address; code verification; session creation and refresh. All calls come from the Worker, so Supabase sees Cloudflare's address, not the person's IP. Only the publishable key is used; no forwarded IP header is sent (reproduced locally) | User record (email, UUID, timestamps), sessions and refresh tokens (refresh tokens never expire by default), auth logs, under the project's plan and region | With accounts |
| **Resend** (through Supabase SMTP) | Delivers the code email | The recipient address and the **message itself, including the one-time code** | Sending logs under Resend's plan. Open and click tracking is off by default | With accounts |
| **CoinGecko** | Prices and logos | From the coordinator Worker (with accounts): public asset IDs, quote currencies, chart ranges, timing, and the API key. Logos: the app fetches allow-listed `coin-images`/`assets.coingecko.com` URLs server-side. No amounts, Goals, wallet addresses, Habits or Health | CoinGecko's logs | Today none is expected: market routes answer "unavailable", and the logo proxy fetches only allow-listed image URLs on request. Prices: with accounts |
| **Open Food Facts** | Barcode lookup | The barcode number of a cache miss, from the Worker. The User-Agent carries the owner's contact email, as Open Food Facts asks | Their logs | With accounts |
| **ZIGChain public RPC/REST (testnet)** | Wallet and position reads | From the browser (testnet only, per the CSP): IP address and the queried public address, contract or transaction (already in [PRIVACY.md](../../PRIVACY.md)). Through `/api/positions?network=…&address=…`: the public ZIG address sits in the query string, so it is also in Cloudflare's request logs, and the Worker relays it to the chain's public REST | Their logs | Both |
| **GitHub** | Source, CI, deploy | Everything in the repository (public); CI logs and artifacts, which anyone with read access can download, i.e. any signed-in user for this public repository: deploy evidence JSON, Wrangler output (Worker names, version IDs, `workers.dev` host names, binding names) | Logs by retention; deploy artifacts 90 days | Both (no user data) |
| **The operator (the owner)** | Runs the service | Provider dashboards: Supabase users and sign-ins, Resend's sent messages (code emails), Cloudflare storage and analytics | — | With accounts. The operator could sign in as any user by reading a code from a provider log, but could not decrypt anything (`Q-PRIV-05`) |
| **Claude Code sessions** | Engineering | The repository and public web pages; GitHub through the owner's identity. No provider secrets are in the repository (history scan: 0 hits) | Session transcripts | Both (`Q-AI-01`) |

## What the sync server sees, field by field
From `workers/private-sync/worker.mjs`, `sessions.mjs`, `rotation.mjs` and `lifecycle.mjs` (helper H2, checked by the lead):
- **Per account:**
  - the account UUID (the Durable Object name);
  - the manifest: vault UUID, epoch and the **wrapped root** (ciphertext only);
  - the global revision, stored bytes and operation count;
  - receipts: operation UUID → SHA-256 of the full request, plus revision;
  - section deletion generations, intents and receipts.
- **Per record:**
  - record ID;
  - **section label in clear** (`finance`, `habits`, `health`, `settings`);
  - revision and epoch;
  - deleted flag;
  - envelope version, salt and nonce;
  - **ciphertext length**: chunks of up to 48,000 characters, unpadded, and unchanged chunks are reused, so the server sees which part of a section changed (`Q-SYNC-07`).
- **Per session:**
  - SHA-256 of the bearer token and the Supabase session ID (family);
  - the label the person typed (default "Browser session");
  - `createdAt` and, after revocation, `revokedAt`;
  - lineage hashes.

  Revoked records are kept (`workers/private-sync/sessions.mjs:38`).
- **Timing:** each sync, about 1 s after an edit; and each open or focus of a remembered device.

## What stays on the device
Records are plaintext at rest by design. The full inventory is in FINDINGS (`Q-SYNC-06` and the plaintext-at-rest table). In short:
- **IndexedDB `zigoals-private-vault-v1`:** records, outbox, receipts and recovery copies.
- **IndexedDB `zigoals-account-sync-v1`:** sync bases, which hold full plaintext of synced sections, plus pending ciphertext operations and archived journals.
- **IndexedDB `zigoals-device-unlock-v1`:** the remembered device key and the sealed root (`Q-SYNC-01`).
- **localStorage:**
  - the module stores, also per account (`zigoals:account:v1:<account UUID>:…`), so key names reveal which accounts used this browser;
  - recovery copies;
  - the sync-offer flag.
- **sessionStorage:** the tab's account selector (account UUID) and the Showcase dataset.
- **Cookies:** `__Host-zigoals_session` and `__Host-zigoals_refresh` (HttpOnly, Secure, SameSite=Strict).

## Public wording against the code
| Statement | Where | Verdict | Note |
|---|---|---|---|
| "Your records are encrypted on your device before they leave it" | Landing, Help, sync offer, notice draft | **Matches** | `sealRecord` runs before every transport write (`apps/web/lib/vault/cloud-sync.ts:97,101`) |
| "The server stores encrypted copies and sees your account, record identifiers, sizes and times, not what you wrote" | Landing (`landing/index.html`, privacy section and FAQ) | **Omission** | The section of each record is visible in clear. The notice draft and Help say so; the landing does not (`Q-PRIV-02`) |
| "Only your devices can unlock them" / "nobody else can read it" / "we cannot read" | Landing FAQ, Help, sync offer, notice draft | **Matches, with caveats** | True for server-stored content. Not true against a compromised app deploy or same-origin script, and anyone holding a remembered device can open it (`Q-SYNC-01`, `Q-PRIV-02`) |
| "Health syncs only if you choose it" | Landing, Help, sync offer, notice | **Matches for sync; nuance** | Rotation and section review decrypt cloud Health copies in memory, and restoring a deleted Health section turns Health sync on (`Q-SYNC-04`) |
| "No ads, no trackers and no app analytics" | Notice draft §"short version" | **Matches for the app; caveat for the host** | The app adds no analytics and no third-party script. Cloudflare's NEL makes browsers send failure reports to Cloudflare (`Q-PRIV-04`). The landing itself makes no "no trackers" claim |
| "Our admission service keeps short-lived counters … windows last up to 24 hours" | Notice draft §2 | **Partly** | The windows are ≤24 h, but rows are deleted lazily and fall under the 30-day point-in-time recovery (`Q-PRIV-03`) |
| "Our server keeps the product answer for up to 24 hours, keyed only by the barcode" | Notice draft §3 | **Partly** | An answer is used for ≤24 h. The row may stay until more than 256 are cached (`Q-PRIV-03`) |
| "Revoking a session blocks future access. It does not remove data already downloaded" | Notice draft §2, PRIVACY.md | **Matches for sync** | It does not end the Supabase session (`Q-AUTH-02`) |
| "Cryptographic key rotation and account deletion remain incomplete" | PRIVACY.md (Run #10 addendum, line 9) | **Stale** | Both are implemented (`Q-PRIV-02`) |
| "'Non-extractable' stops script from reading the key's bytes" | PRIVACY.md line 7, ADR-008 T2 | **Misleading** | The device key's bytes stay unreadable, but script can recover the root it protects (`Q-SYNC-01`, reproduced) |
| "Infrastructure backups at our providers follow their own retention" | Notice draft §5, account deletion text | **Incomplete** | Durable Object point-in-time recovery holds 30 days. The deletion record is kept indefinitely (`Q-PRIV-01`) |
| "Requests go through our server, so the provider sees our server rather than your device" | Notice draft §3 | **Matches** | CoinGecko and Open Food Facts calls come from Workers |
| "Cloudflare `cf-nel` network error reporting headers are infrastructure reporting" | PRIVACY.md (Alpha notes) | **Matches** | Confirmed live on both hosts |

## Sources (accessed 2026-10-03)
- Google Registry, `.app`: "The .app top-level domain is included on the HSTS preload list, making HTTPS required on all connections to .app websites". <https://www.registry.google/domains/app/>
- Cloudflare, Network Error Logging (what browsers report; how to disable it per zone). <https://developers.cloudflare.com/network-error-logging/>
- Cloudflare, Always Use HTTPS. <https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/>
- Cloudflare, DNSSEC. <https://developers.cloudflare.com/dns/dnssec/>
- Cloudflare, Durable Objects storage API, point-in-time recovery "to any point in time in the past 30 days". <https://developers.cloudflare.com/durable-objects/api/storage-api/>
- Supabase, Auth rate limits (per-IP limits; `Sb-Forwarded-For` needs a secret key). <https://supabase.com/docs/guides/auth/rate-limits>
- Supabase, user sessions (refresh tokens never expire by default). <https://supabase.com/docs/guides/auth/sessions>
- Resend, open and click tracking "disabled by default for all domains". <https://resend.com/docs/dashboard/domains/tracking>
- CoinGecko, Demo API authentication (header, backend proxy). <https://docs.coingecko.com/v3.0.1/reference/authentication>
- GitHub, downloading workflow artifacts ("Read access to the repository is required"). <https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts>
- The live headers and DNS records above were read by this session on 2026-10-03; they can change.
