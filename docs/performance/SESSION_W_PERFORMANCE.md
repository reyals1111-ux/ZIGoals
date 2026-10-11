# Session W performance pass (Part 22)

Measured locally on 2026-10-07. Nothing here is a production figure: page weight is exact for a given build, and the
Worker timings are **local workerd wall time on one machine, not Cloudflare CPU**. Production CPU can only be read by
the owner, per version, as in [CPU_OWNER_CHECKLIST.md](../deployment/CPU_OWNER_CHECKLIST.md).

## How it was measured

- **Page weight:** the gzip size (level 6) of the scripts each page's HTML loads, from `next start` of a production
  build (`NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED`), by `scripts/check-weight-budget.mjs`. The **shell** is
  what every app page loads. Main is `1063765`; "before" is the branch at `417a382`; "after" adds this part. Two
  rebuilds of main gave identical numbers. Raw numbers: [PAGE_WEIGHT.json](../verification/w-perf/PAGE_WEIGHT.json).
- **Where the shell's bytes come from:** the same builds with source maps on (locally only), attributing every byte of
  `/app/help`'s scripts to its source file.
- **Packaged Alpha:** `build:alpha` and the Wrangler dry run (no account, no upload), then
  `scripts/perf/alpha-cold-warm.mjs`: the bundle in workerd through Miniflare, outbound requests refused, no secrets;
  per route, three fresh Workers (a cold first request) and five warm requests each. Raw numbers:
  [LOCAL_COLD_WARM.json](../verification/w-perf/LOCAL_COLD_WARM.json).
- **Server code:** a read-only audit of the layouts, middleware, routes and the generated Worker.

## Page weight (kB gzip)

| Page | main | before Part 22 | after | vs main | budget |
|---|---:|---:|---:|---:|---:|
| `/app` | 616.9 | 654.8 | 645.8 | +28.8 | 651.0 |
| `/app/goals` | 515.1 | 531.3 | 519.6 | +4.4 | 525.0 |
| `/app/habits` | 525.6 | 552.7 | 543.4 | +17.8 | 549.0 |
| `/app/health` | 550.8 | 577.1 | 567.6 | +16.9 | 573.0 |
| `/app/wealth` | 542.5 | 567.8 | 556.1 | +13.5 | 562.0 |
| `/app/markets` | 512.3 | 534.8 | 523.1 | +10.9 | 529.0 |
| `/app/portfolio` | 515.8 | 556.8 | 545.7 | +29.9 | 551.0 |
| `/app/staking` | 534.7 | 558.1 | 548.3 | +13.6 | 554.0 |
| `/app/activity` | 497.6 | 516.3 | 503.5 | +5.9 | 509.0 |
| `/app/settings` | 525.9 | 581.2 | 570.3 | +44.4 | 576.0 |
| `/app/help` | 493.6 | 512.4 | 499.7 | +6.1 | 505.0 |
| `/app/chess` | — | 520.8 | 508.1 | new | 514.0 |
| shell (every app page) | 491.6 | 510.4 | 497.7 | +6.1 | 503.0 |

**The one change made:** the Showcase's builder (every fictional record: goals, habits, Health with sleep and meditation,
accounts, chess, links…) was in every page's shell, on main too, because the Showcase controls imported it at the top.
It now loads when the person loads or resets the Showcase or chooses "Explore the demo" (`lib/showcase.ts`); nothing
else changes. Every page is 9–13 kB lighter, and the shell went from +18.8 kB over main to **+6.1 kB**. The plan's
target for the shell was +3 kB; it is **not met**. What remains, by source (raw minified bytes in the shell):

| What | Raw bytes | Why it is in the shell |
|---|---:|---|
| Sync homes stores (weekly review, habit–Health links, Health goals, fasting, Session W groups) | ~16 KB | W1 turned the sync writes on; every page's sync merge reads them |
| Schemas of the new formats (sleep, meditation, vitals, quick, moods, pages, links, chess, wrap-up, accounts) | ~16 KB | The sync merge and the device keys parse them on every page |
| Your pages & buttons (visibility, device mirror, start page, hidden-page note) | ~8 KB | Decides the navigation before anything renders |
| The music button and the focus-sound pill | ~3.5 KB | Shown on every page while switched on; the panel itself loads on first use |
| The Showcase builder and the helpers only it used | −24 KB | Now loaded on use (above) |

Moving the first two out of the shell means loading the sync code later, which is a sync-path change (Tier 3) and is
left for its own reviewed change. **Budgets** (`scripts/weight-budgets.json`): main's number, and this release's
measurement plus about 5 kB for each page and for the shell. CI's integration job checks them against the production
build it serves (a few seconds). A budget is raised only with the reason in the same change.

## The packaged Worker

| | main | before Part 22 | after |
|---|---:|---:|---:|
| Worker upload (Wrangler dry run) | 16,306 KiB (3,311 KiB gzip) | 17,715 KiB (3,647 KiB gzip) | 17,792 KiB (3,671 KiB gzip) |

## Cold and warm requests (local workerd, median ms)

| Route | main cold | before cold | after cold | main warm | after warm |
|---|---:|---:|---:|---:|---:|
| `/` (middleware redirect only) | 200 | 201 | 211 | 31 | 31 |
| `/app` | 327 | 367 | 366 | 33 | 33 |
| `/app/goals` | 306 | 336 | 290 | 31 | 30 |
| `/app/habits` | 285 | 352 | 332 | 29 | 29 |
| `/app/health` | 286 | 319 | 338 | 30 | 32 |
| `/app/wealth` | 285 | 311 | 315 | 30 | 30 |
| `/app/markets` | 307 | 334 | 311 | 32 | 32 |
| `/app/settings` | 297 | 344 | 346 | 32 | 34 |
| `/app/help` | 284 | 345 | 312 | 34 | 35 |

Three cold samples per route: differences under about 30 ms are within the spread. Warm requests cost the same on main
and the branch. A cold first request costs about 200 ms just to load Next's server from the one large bundle (the
redirect on `/` renders nothing), then the route's modules and the render; Session W adds about 10–50 ms to that, in
line with its 9% larger bundle. The lazy Showcase builder made no clear difference on the server.

## The live CPU question (owner addition E): why about 737 ms per request on #31

1. **Warm requests are cheap.** Every page renders in about 30 ms locally once its Worker has started; middleware work
   is negligible (a 32-byte nonce and a few string joins; the policy file is compiled into the bundle).
2. **A cold Worker is expensive.** OpenNext's Worker imports the whole server bundle (one file for every route) inside
   its first request, and each route's modules on their first use: Next's runtime, React's server renderer, the app
   layout's providers (vault and sync, goals and wallet, the shell) and roughly a thousand zod schemas built at import.
   Locally that is about 285–370 ms for an app page's first request.
3. **The Alpha mostly runs cold.** M6's owner capture had the same shape: `/app` CPU [524, 42, 33, 28, 42] ms, the
   first request about 500 ms and the rest 28–42 ms. A median near 737 ms means most invocations on #31 landed on a
   fresh Worker: the Alpha has little traffic, and each page view makes several Worker calls at once (the page, a
   prefetch per visible link, the web app manifest, logo proxy calls that are never cached), which spread over new
   Workers. Session V's larger bundle made each cold start longer; Session W's adds about 9% more.

This is an explanation consistent with the measurements, not a production attribution: only a version-pinned capture
by the owner (CPU_OWNER_CHECKLIST) can confirm it, ideally after adding route buckets for `/api/*`, the manifest and
prefetch requests to `scripts/sanitize-alpha-tail.mjs`.

## What would reduce it (owner decisions, not done here)

Each changes headers, navigation or wallet/sync code, which this part's "no behaviour or security change" rule excludes:

1. **Serve the web app manifest as a static file** (as M6 did for `icon.svg` and `robots.txt`): one Worker call less on
   every page load.
2. **Let `/api/market-logo` keep its own headers.** Today middleware replaces the route's `Cache-Control: public,
   max-age=86400` and its sandbox CSP (`default-src 'none'; sandbox`) with `private, no-store` and the page CSP
   (verified on main's build with `curl -I`). The logos are therefore fetched again on every view. Keeping the route's
   own values needs a security review of the header order (four API routes rely on middleware's origin header).
3. **Fewer link prefetches** (for example `prefetch={false}` on the navigation): fewer Worker calls, slower navigation.
4. **Load action-only code on use:** the wallet's receipt code (cosmjs-types, about 80 KB raw in every page and in the
   server's start) and the vault's crypto and sync actions. Each touches wallet or sync code and needs its own reviewed
   change.
5. **The ecosystem registry** parses its data twice at import (`providers.ts`, `directory.ts`), and its page loads an
   extra copy of zod only to read two constants from the schema module.

## Tools

- `node scripts/check-weight-budget.mjs http://127.0.0.1:3100` (add `--json` for the numbers); unit tests in
  `scripts/check-weight-budget.test.mjs`.
- `ALPHA_PACKAGE_BUNDLE=<dry-run>/worker.js node scripts/perf/alpha-cold-warm.mjs --rounds 3 --warm 5` after
  `build:alpha` and a dry run; never deploys.
