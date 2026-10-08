# Session X performance pass (Part 5)

Measured locally on 2026-10-07 and 2026-10-08. Nothing here is a production figure: page weight is exact for a given
build, and the Worker timings are **local workerd wall time on one machine, not Cloudflare CPU**. Production CPU can
only be read by the owner, per version, as in [CPU_OWNER_CHECKLIST.md](../deployment/CPU_OWNER_CHECKLIST.md) (which
now also buckets API routes, the manifest and prefetches, so a whole page view can be attributed).

## How it was measured

- **Page weight:** the gzip size (level 6) of the scripts each page's HTML loads, from `next start` of a production
  build (`NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED`), by `scripts/check-weight-budget.mjs --json`, after each
  step. The **shell** is what every app page loads. `1063765` is pre-W main (the budget file's `main`), `72ad872` is
  main today (live as Alpha #32). Raw numbers: [PAGE_WEIGHT.json](../verification/x-cloud/part5/PAGE_WEIGHT.json).
- **Where the bytes come from:** the same builds with `productionBrowserSourceMaps` switched on locally only (never
  committed), every byte of each page's scripts attributed to its source file with source-map-js.
- **Packaged Alpha:** `build:alpha` and the Wrangler dry run (no account, no upload) for `72ad872` and this branch, then
  `scripts/perf/alpha-cold-warm.mjs --rounds 5 --warm 5`: the bundle in workerd through Miniflare, outbound requests
  refused, no secrets; three runs per bundle, alternating the two bundles to cancel drift. Raw numbers:
  [COLD_WARM.json](../verification/x-cloud/part5/COLD_WARM.json).
- **Navigation and prefetch:** `scripts/perf/prefetch-navigation.mjs` (desktop 1440 and iPhone 13, 10 rounds, also at
  4x CPU slowdown): prefetch requests while Today rests, and click-to-heading time per destination.
  [PREFETCH.json](../verification/x-cloud/part5/PREFETCH.json).

## Targets and results

| Target (brief) | Result | |
|---|---|---|
| Shell ≤ 1063765 + 3 kB (494.6 kB) | **401.0 kB** (−90.6 vs 1063765, −96.7 vs 72ad872) | met |
| `/app`, Settings, Portfolio within +10 kB of 1063765 (626.9 / 535.9 / 525.8) | **611.1 / 476.3 / 449.0 kB** | met |
| No page heavier than 72ad872 | every page lighter, by 35 to 97 kB | met |
| Worker smaller | upload 17,807.7 → **17,206.1 KiB** (gzip 3,675.7 → 3,617.6), bundle −3.4 % | met |
| Cold start shorter | first request on a fresh Worker **318.8 → 302.4 ms** median (lower on 8 of 9 routes); Worker ready 1,002.4 → 994.9 ms (within run-to-run spread) | met for the first request; start-up itself unchanged within noise |

## Page weight (kB gzip), step by step

| Page | 1063765 | 72ad872 | 5a | wallet | sync | Settings | zod | vs 1063765 | vs 72ad872 | budget |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/app` | 616.9 | 646.1 | 646.1 | 623.2 | 606.2 | 605.9 | **611.1** | −5.8 | −35.0 | 617.0 |
| `/app/goals` | 515.1 | 519.6 | 519.0 | 496.2 | 478.8 | 478.4 | **428.2** | −87.0 | −91.4 | 434.0 |
| `/app/habits` | 525.6 | 543.4 | 542.8 | 520.0 | 502.5 | 502.4 | **452.2** | −73.4 | −91.2 | 458.0 |
| `/app/health` | 550.8 | 567.7 | 567.1 | 544.2 | 527.5 | 527.1 | **476.9** | −73.9 | −90.8 | 482.0 |
| `/app/wealth` | 542.5 | 556.1 | 555.5 | 532.6 | 510.0 | 509.7 | **459.4** | −83.1 | −96.7 | 465.0 |
| `/app/markets` | 512.3 | 523.2 | 522.6 | 499.7 | 477.1 | 476.7 | **426.5** | −85.8 | −96.7 | 432.0 |
| `/app/portfolio` | 515.8 | 545.7 | 545.1 | 522.2 | 499.6 | 499.2 | **449.0** | −66.8 | −96.7 | 454.0 |
| `/app/staking` | 534.7 | 548.4 | 548.4 | 525.5 | 502.9 | 502.5 | **452.3** | −82.4 | −96.1 | 458.0 |
| `/app/activity` | 497.6 | 503.6 | 503.0 | 480.1 | 457.5 | 457.2 | **462.4** | −35.2 | −41.2 | 468.0 |
| `/app/settings` | 525.9 | 570.6 | 570.0 | 547.1 | 545.0 | 526.6 | **476.3** | −49.5 | −94.3 | 482.0 |
| `/app/help` | 493.6 | 499.7 | 499.1 | 476.2 | 453.8 | 453.4 | **403.2** | −90.4 | −96.5 | 409.0 |
| `/app/chess` | — | 508.1 | 507.6 | 484.7 | 462.0 | 461.6 | **411.4** | new | −96.7 | 417.0 |
| **shell** (every app page) | 491.6 | 497.7 | 497.1 | 474.3 | 451.6 | 451.2 | **401.0** | −90.6 | −96.7 | 406.0 |

The steps: **5a** = static manifest, ecosystem registry parsed once, prefetch only where it helps, tail buckets
(`d3b4fee`–`02e0573`); **wallet** = the receipt code with the wallet actions (`f27a448`); **sync** = the Settings sync
panel and the hand-started vault actions on use (`830f29f`); **Settings** = Export everything and Switch to ZIGoals'
preview on use (`3e85554`); **zod** = zod imported as a namespace (`da10938`).

## What changed, and why it is safe

| Change | Commit | Effect | Why behaviour is the same |
|---|---|---|---|
| The web app manifest is a static file, byte for byte (`/manifest.webmanifest`, sha256 pinned) | `02e0573` (+ the deletion in `d3b4fee`) | one Worker call less per page load; no page policy or no-store on it | the same bytes at the same address; saved Home Screen apps keep their id, scope and icons |
| The ecosystem registry parses its snapshot once; the explorer and Hub links are zod-free | `d3b4fee` | a second parse and schema build gone from the Ecosystem paths | same values and API (a test compares the exports) |
| No link prefetch for Goals, Habits, Wealth, Markets, Portfolio, Ecosystem, Settings | `e0a0aab` | prefetch requests while Today rests: 23 → 15 (desktop), 11 → 5 (phone); each is a Worker call on the Alpha | only the destinations measured no slower without it (median within 5 % on both layouts, also at 4x CPU) |
| Tail sanitizer buckets for API routes, the manifest, prefetch and client navigation | `2a1337e` | the owner can attribute a whole view's CPU | fixed names only, never a query, body, header value or page path |
| `[TIER 3] (wallet)` the receipt code (cosmjs-types) loads with the two wallet actions that use it | `f27a448` | −22.8 kB on every page | same functions, order, timeouts and refusals; no signing, key or contract change |
| `[TIER 3] (sync)` the Settings sync panel and the hand-started vault actions load on use; the hidden-page note's store on tap | `830f29f` | −22.7 kB on every page | automatic sync, unlock and the remembered-device reopen stay static (ADR-016 X17); actions load inside the same one-at-a-time guard |
| Export everything and Switch to ZIGoals' preview and undo code load on use | `3e85554` | Settings −18.4 kB | the code runs only after a tap or a chosen file; the preview shows only after reading, as before |
| `[TIER 3] (sync, data formats)` `import * as z from 'zod'` in 99 files | `da10938` | about −50 kB on every page: zod's locales (167.7 KB minified) and JSON-Schema converters (67 KB) left the shell | the same zod functions; full unit suite, schema snapshot, frozen readers and sync harnesses unchanged |

**Today and Activity** are 5.2 kB heavier after the zod step than before it (still 35 and 41 kB lighter than
`72ad872`): ZIGi's 19 files (X-LOCAL's lane) still import `{z}`, which brings zod's full namespace into those two
pages' own chunks. With the same one-line change there (handoff H2), the local build measured Today **550.6 kB**,
Activity **401.9 kB** and the shell **396.0 kB**.

## The packaged Worker (local workerd wall time, ms; not Cloudflare CPU)

| | 72ad872 | after the Settings step (`3e85554`) | final (`da10938`) |
|---|---:|---:|---:|
| Upload (Wrangler dry run) | 17,807.7 KiB / gzip 3,675.7 | 17,398.8 KiB / gzip 3,621.6 | **17,206.1 KiB / gzip 3,617.6** |
| Bundle (`worker.js`) | 18,235,101 bytes | 17,816,384 bytes | **17,619,078 bytes** |

| Route | ready 72ad872 | ready X | first 72ad872 | first X | warm 72ad872 | warm X |
|---|---:|---:|---:|---:|---:|---:|
| `/` | 1023.4 | 996.4 | 209.7 | 203.2 | 31.9 | 30.6 |
| `/app` | 1009 | 946.1 | 358.2 | 352.3 | 33.4 | 32.8 |
| `/app/goals` | 999.9 | 997 | 313 | 300.8 | 30.4 | 30.3 |
| `/app/habits` | 1014.8 | 1025.3 | 312.4 | 303.2 | 31.1 | 30.8 |
| `/app/health` | 1020.7 | 1006.7 | 315.5 | 293.6 | 31.7 | 30.7 |
| `/app/wealth` | 970.3 | 966.1 | 325.5 | 299.9 | 29.7 | 30.5 |
| `/app/markets` | 968.6 | 1061.2 | 319.5 | 307.7 | 30.1 | 31.4 |
| `/app/settings` | 977.2 | 960.3 | 331.8 | 314.4 | 33.5 | 34 |
| `/app/help` | 995 | 952.2 | 305.2 | 307.9 | 35.3 | 34.8 |
| **all routes** | **1002.4** | **994.9** | **318.8** | **302.4** | **31.8** | **31.7** |

"ready" is a fresh Worker until it answers (the script's top level and Miniflare's start); "first" is that Worker's
first request (Next's server and the route's modules); "warm" is later requests. The lazy-loading steps add split
points to the server bundle too (about 250 KiB between `02e0573` and `3e85554`); the manifest route, the ecosystem
double parse and the zod change take more out.

## Budgets

`scripts/weight-budgets.json` (`[TIER 3] (CI)`): every page and the shell at this measurement plus about 5 kB (the
shell 503.0 → 406.0 kB). CI's integration job checks them against the production build it serves. A budget is raised
only with the reason in the same change; after handoff H2, whichever lane merges second can lower Today and Activity.

## What remains in the shell (raw minified bytes, before the zod step's attribution of 2026-10-08)

| What | Raw | Why it stays |
|---|---:|---|
| React DOM and Next's client router | ~430 KB | the framework |
| zod's core and classic schemas (after the zod step; locales and JSON Schema gone) | ~130 KB | every store parses its records on every page |
| The sync provider (automatic sync, unlock, remembered device), cloud-sync, the device database and crypto | ~75 KB | kept static on purpose: an await inside fence-checked work no person started (ADR-016 X17) |
| Finance, habits and Health models, goal provider and intelligence, dashboard settings, journals | ~155 KB | Today and the navigation need them before anything renders |
| One chunk without a source map (Next's polyfills and runtime) | ~113 KB | the framework |

## Not done, with the reason

- **Chess's site readers in Settings** (`lib/skills/chess/api.ts` and `parse.ts`, about 7 KB raw): `useChess` checks a
  site's pause synchronously in its auto-refresh effect on Today and the Chess page; loading it later would change when
  that check runs. Left as it is.
- **The private backup tools' crypto in Settings** (about 8 KB raw): encryption code (Tier 3) used by render-time checks
  of a decrypted preview; the Settings target is met without it.
- **ZIGi's zod imports:** handed off (H2).
