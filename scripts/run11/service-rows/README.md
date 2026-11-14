# Service rows, replayed against the repo's own server code (Session AP Part 3)

The carried "Needs a service" rows (docs/review/session-al/CARRIED.md, docs/architecture/ADR-039-session-ao.md closing
table) need answers from CoinGecko, Open Food Facts and the ZIGChain LCD. This folder runs the **real** route modules,
market coordinator and food Worker in workerd, with **recorded-shape** upstream answers, so the rows can be checked first
at API level (here, no browser) and then on screen by the integrator.

- `harness.mjs`: `start({clock, port, bundle, clientIp})` returns `{origin, calls, refused, hosts(), setQuoteVariant(n), stop(), fixtures}`.
  `node scripts/run11/service-rows/harness.mjs 3190` keeps it up at http://127.0.0.1:3190 for a manual or browser replay.
- `api-rows.test.mjs`: `pnpm exec vitest run scripts/run11/service-rows/api-rows.test.mjs` (about 5 s; 15 tests, all pass).
- `fixtures/*.json`: the upstream answers. Each one names the endpoint it stands for and its `recordedAt`. The shapes
  follow the parsers that read them (lib/market-quotes.ts, lib/market-insights.ts, lib/market-detail.ts,
  lib/market-history.ts, lib/market-assets.ts, lib/food-lookup.ts + workers/food-lookup, lib/server/chain-*.ts,
  lib/native-positions.ts). The values are illustrative, **not live captures**. ZIGChain addresses are bech32 of fixed
  fictional bytes, and the Nutella figures are the label's per-100 g values. These fixtures exist only here; the app gets
  no fake data.

## Topology

| Worker | Code | Its outbound answers only |
|---|---|---|
| app | esbuild bundle of `app/api/{market-quotes,market-quotes/cancel,market-assets,market-history,market-insights,market-detail,market-logo,market-status,food-lookup,chain/validators,chain/proposals,chain/proposal,chain/vote,positions}/route.ts` inside the installed OpenNext request context (the `market-runtime-fixture.mjs` pattern) | `coin-images.coingecko.com` / `assets.coingecko.com` (logos, lib/server/market-logo.ts), `api.zigchain.com` / `testnet-api.zigchain.com` (LCD, `x-cosmos-block-height` echoed) |
| market (`MARKET_QUOTES` → `QuoteService`) | workers/market-coordinator/worker.ts, MarketAccount on SQLite, `durable-v1` | `api.coingecko.com` (`/simple/price`, `/coins/markets`, `/rwas/markets`, `/coins/list`, `/rwas/list`, `/coins/{id}/market_chart`) |
| food (`FOOD_LOOKUP`) | workers/food-lookup/worker.mjs, FoodBudget on SQLite, no FDC key | `world.openfoodfacts.org/api/v3.4/product/{code}` |

Every other host is refused, and so is any path on an allowed host that has no recording: the request throws inside
workerd and is listed in `refused`. The last test checks that the hosts asked were exactly the ones in the table and that
the only refusal was the test's own deliberate one (EUR history, which is not recorded).

**Time.** workerd runs on the real clock, so the 15-minute freshness rules run against real time. Each fixture time is
re-based at request time so that `recordedAt` is `clock()` (default `Date.now`). The upstream then always looks equally
old: bitcoin 30 s, cardano 40 min, LCD block 2 s, proposal #43 ends in 2 days, Beacon unbonding completes in 9 days 5 h.
The browser's own clock (`page.clock`) can then age a fresh price past 15 minutes.

**Drift.** `setQuoteVariant(2)` switches `/simple/price` to the second recording and restarts the Workers with empty
state. That stands in for the coordinator re-reading once its cached quote is 15 minutes old: a fresh quote is never
re-read before then, which the drift test checks. The origin URL stays the same.

**Policy.** The coordinator runs the existing run11 fixture policy scaled up (×100 monthly, ×10 per minute), so a single
replay client is not refused by its fair per-client share. With the unscaled policy, one client's daily share is 29
credits and is used up after about six reads. The limits themselves are covered by the `market-*-policy` tests.

**App pages are not served from source.** The pages need the OpenNext bundle, which only a build produces. This machine
has none: there is no `apps/web/.open-next` and no `/tmp/zigoals-run11-package-bundle`. `start({bundle})` (default
`RUN11_PACKAGE_BUNDLE`) would run that bundle as the app Worker, with `wrangler.run11.local.jsonc`'s assets and vars and
the same market and food Workers. That path follows packaged-runtime.test.mjs but is **untested here**. Without a
bundle, use the recipe below.

## Browser replay recipe (no build needed)

Serve pages from a normal app server (e.g. the production server already on :3101). Forward only the harness's routes to
it, and leave every other `/api/*` (earn, version, private-account, zigi…) with the app server:

```js
import {start, ROUTES} from './scripts/run11/service-rows/harness.mjs';
const h = await start();
await page.route('**/api/**', async route => {
  const u = new URL(route.request().url());
  if (!(u.pathname in ROUTES)) return route.continue();
  // route.fetch keeps the request's method, headers and body; only the URL changes.
  const response = await route.fetch({url: h.origin + u.pathname + u.search});
  await route.fulfill({response});
});
// Chess (X3-29) is browser-direct: route https://api.chess.com/** and https://lichess.org/** separately (nothing recorded here).
```

Do not use the Showcase for the price rows: it freezes prices and labels them "Showcase price" (lib/market-quotes.ts
`setFrozenPrices`). Add the assets by hand. Track wallet `zig18td9furcnzh9n0p5c0au8ck350h3h5l4nlh065` on **mainnet**
(fixture `zigchain-lcd.json` `wallet`). The food Worker spaces Open Food Facts reads 12 s apart: a second new barcode
inside 12 s waits, and a third gets `TRY_LATER`. A cached barcode costs nothing.

## Rows

| Row id | Route(s) | Fixture | API-level result | What the browser replay must check |
|---|---|---|---|---|
| TK "'Current' badge on stale prices" | POST /api/market-quotes | simple-price.v1 (cardano 40 min old) | **PASS**: bitcoin `VERIFIED_FRESH` (observed < 1 min), cardano `VERIFIED_STALE` (observed > 15 min, `quoteIsStale` true); envelope `degraded`, `complete`. | Holdings of BTC and ADA: ADA's `.freshness-badge[data-state="stale"]` reads "Needs refresh", never "Current"; BTC reads "Current"; `page.clock.fastForward('16:00')` turns BTC to "Needs refresh". |
| D-262 | POST /api/market-quotes | simple-price.v1 → v2 | **PASS**: a second load within freshness gives the same prices with no new read; after `setQuoteVariant(2)`, BTC 97,012.34 → 97,588.9, ETH 3,412.0815 → 3,398.5, ZIG 0.08341 → 0.08512, all fresh. | Load Wealth with BTC+ZIG, note every price/total, `setQuoteVariant(2)`, reload: every surface (holding rows, Wealth total, Markets row, Today widget) moves to the new price and the totals agree with each other. |
| D-200 | POST /api/market-quotes | same, plus EUR | **PASS**: BTC EUR 91,050.12 → 91,591.27 after the switch. | As D-262 on reload, in the display currency set in Settings (the bot's "Totals in USD/EUR" switch no longer exists, D-221). |
| TK-6B-06 | POST /api/market-insights | coins-markets, rwas-markets | **PASS**: BTC `change24h "2.4127"` with its own `observedAt` (< 1 min), `stale:false`; ADA `"-0.8761"` with a 40-min `observedAt`, `stale:true`; gold `"0.4211"`, `marketBasis:"tokenized"`. | Markets rows show +2.41 % with its as-of time; ADA's change is marked as old; check the same in light and dark themes (`emulateMedia({colorScheme})`). |
| TK "Unformatted prices" (coin pages) | POST /api/market-detail, /api/market-history, /api/market-quotes | coins-markets, market-chart | **PASS**: exact strings (price `9701234`/2, market cap `1921345678901`, supply `19781234`, max `21000000`); history 25 / 721 / 366 points for 1D / 30D / 1Y. | Open Bitcoin's coin page: price "$97,012.34", market cap and supply grouped or compact, no raw digit strings or e-notation, 1D–1Y ranges offered on the chart. |
| M10 | POST /api/market-insights → GET /api/market-logo | coins-markets, rwas-markets, logo | **PASS**: `logoUrl` is the same-origin proxy URL; it answers `image/png` (PNG signature, `max-age=86400`); an unrecorded image is 404, a foreign host 400. | Wealth and Markets show an `<img>` from /api/market-logo for Gold and BTC (`naturalWidth > 0`) instead of the "△" glyph; Markets' Gold name copy. |
| TK-203 | as M10 | as M10 | **PASS** (as M10). | Same steps as M10. |
| W15 | GET /api/market-assets (v1, and v2 compact with ETag → 304) | coins-list, rwas-list | **PASS**: 18 assets; with the browser's `searchMarketAssets`, "gold" → RWA Gold first, "bitcoin" → Bitcoin (not "Batcat", ticker BITCOIN), "b" → Bitcoin first. | Markets search "gold", "bitcoin", "b": first result and order; unverified marking on Batcat and Goldfinch. |
| D-052 | GET /api/market-assets, POST /api/market-quotes | coins-list, simple-price.v1 | **PASS**: "cardano" → Cardano first; its quote answers (stale by fixture design). | With 8 favourites, search "cardano" and add it: "9 of 50 · Your favourites"; the new row shows its price with "Needs refresh". |
| D-079 | GET /api/market-assets | coins-list, rwas-list | **PASS** (as W15). | Wealth → Add asset → "Find your asset": "gold" and "bitcoin" list the assets; choosing one sets its market reference and a price follows. |
| D-176 | POST /api/market-quotes, /api/market-insights | simple-price.v1, rwas-markets | **PASS**: one reference quote per asset; gold `402115`/2 USD "CoinGecko tokenized RWA reference", BTC USD and EUR fresh. | Wealth and Markets show the same reference price for Gold and BTC in the same format (symbol, separators, decimals). |
| C-DVG-35 | GET /api/food-lookup?code= | openfoodfacts-3017620422003 | **PASS**: Nutella, brand "nutella, ferrero", 539 kcal, protein 6300 mg, carbs 57500 mg, fat 30900 mg, source Open Food Facts v3.4; the second ask comes from the Worker cache (no OFF read); a 7-digit code is `INVALID_BARCODE`. | Barcode entry 3017620422003 → product card with those per-100 g values and the Open Food Facts attribution; logging it adds the entry. |
| MO-007 | as C-DVG-35 | as C-DVG-35 | **PASS** (as C-DVG-35). | The success path replaces "Lookup is not available here. Search foods by name instead? · Add it yourself". |
| C-MO-01 | GET /api/food-lookup?code=…&grade=1 | as C-DVG-35 | **PASS**: `nutriscoreGrade:"e"` with `grade=1`, none without. | Branded lookup shows Nutella and its Nutri-Score E where the UI shows grades. |
| Oct-26 gap: barcode provider inactive | — | — | **Deployment setting; runbook only.** Not replayed: turning the provider on is the `FOOD_LOOKUP` binding and `FOOD_USER_AGENT` of a deploy. Without the binding, the route answers 503 `PROVIDER_SETUP_REQUIRED` (app/api/food-lookup/route.ts); this is not asserted here. | None (runbook). |
| C-BN-01 | GET /api/chain/validators | zigchain-lcd | **PASS**: 4 validators at height 12873456; commission 0.05 / 0.1 / 0.08 / 0.03; uptime signedShare 0.9988 / 0.955 / … / 1; Cobalt jailed and unbonding; Delta self-bond "0". | Staking validator list sorted by commission (Delta 3 % first) and by uptime (Delta 100 %, Aurora 99.88 %, Beacon 95.5 %); Cobalt shown as jailed. |
| C-DVG-67 | as C-BN-01 | as C-BN-01 | **PASS** (as C-BN-01). | Same steps as C-BN-01. |
| C-BN-05 | GET /api/chain/validators | zigchain-lcd | **PASS**: per validator commission, max rate, max change, voting-power share (Aurora 0.5897…), self-bond, uptime. | Compare two validators side by side: those figures, formatted as percentages and ZIG. |
| C-DVG-69 | POST /api/market-history (zignaly, 1y) | market-chart | **PASS**: 366 daily USD points spanning 365 days; the last is 0.08341. | After a wallet with rewards is tracked (realRows), the claims list shows "ZIG price that day" in USD for each claim day; unknown days stay unknown. |
| C-BN-06 | GET /api/positions | zigchain-lcd | **PASS**: the stake at Cobalt carries `validator.status "BOND_STATUS_UNBONDING"`; the device's `stakingItems` rule yields `validator` and `unbonding` items. | Track the fixture wallet: the "validator not earning" alert appears, and so does the unbonding day (9 days out). |
| C-BN-11 | GET /api/chain/proposals, /api/chain/proposal?id= | zigchain-lcd | **PASS**: #43 `voting`, `votingEndTime` now + 2 d, live tally (yes 21.3 M ZIG …); #99 answers `proposals: []`. | Governance shows #43 open with its deadline "in 2 days" and offers the vote-deadline reminder; setting it schedules before the deadline (in the saved zone). |
| C-BN-12 | GET /api/chain/vote | zigchain-lcd | **PASS**: Aurora Stake's account voted `yes` (weight 1); the fixture wallet answers `vote: null`. | Validator vote lookup on #43: Aurora Stake "Yes"; the wallet "has not voted". |
| BN-081 | GET /api/positions | zigchain-lcd | **PASS**: the wallet reads liquid 42.5 ZIG, 2 stakes, 2 rewards and 1 unbonding at one block. | After Track Wallet, the Net APR assumption field appears; check its field errors (empty, non-number, out of range) and the "Net APR assumption saved privately" message. |
| N-BN-17 | GET /api/positions, /api/chain/validators | zigchain-lcd | **PASS**: `observedAt` is the block's own time (2 s old), provenance "https://api.zigchain.com · block 12873456". | With Asia/Tokyo saved, the Staking snapshot's "updated" time is shown in Tokyo time (UTC+9). Chess: see X3-29. |
| X3-29 | Staking: as N-BN-17. Chess: none | zigchain-lcd | **PASS** for the Staking part. Chess part **not in the harness**: chess.com and Lichess are fetched browser-direct (lib/skills/chess/api.ts: `fetch` to api.chess.com/pub and lichess.org, `mode:'cors'`), so the replay needs `page.route` for those hosts with its own recorded answers. | Staking and Chess "updated" times in the saved zone. |
| DV-089 | — | — | **Model / NOVA lane**: not replayable (needs a connected model). | — |
| PR-035 | — | — | **Model / NOVA lane**: not replayable (needs a connected model to see the cap in use). | — |

## Browser replay spec

`apps/web/tests/ap/service-rows.spec.ts` runs this replay against a running app server. It is skipped unless
`AP_SERVICE_ROWS=1` and runs on the desktop project only:
`AP_SERVICE_ROWS=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 pnpm --filter @zigoals/web exec playwright test tests/ap/service-rows.spec.ts --project=desktop --workers=1`.
The harness finds the checkout from the working directory and does not use `import.meta`, because Playwright compiles the
module as CommonJS. A bundle run still loads `hermetic-wrangler.mjs` lazily, so it works under node or vitest only.

## Real app bugs found at API level

None. Every route answered the contract its parser and wire schema define. Two things are fixture choices, not bugs.
Cardano is deliberately stale, so D-052's added favourite shows "Needs refresh". EUR history is deliberately not
recorded, which shows refusal.

Found while writing the browser spec (a code read, not an API failure): a tracked wallet's position card on Staking
writes the validator line as `{p.validator.status} · commission {Number(p.validator.commission)*100}%`
(apps/web/components/platform/positions-view.tsx:98, in `renderPosition`). It shows the chain's raw status code
("BOND_STATUS_UNBONDING") and a float product: a 7 % or 14 % rate reads "7.000000000000001%" / "14.000000000000002%".
The fixture's rates (5 %, 8 %) happen to print cleanly. Proposed fix: the plain status words the validator list uses
(Active / Jailed / Leaving / Inactive) and the exact decimal formatting it uses (`share()` in
components/earn/validators-section.tsx, or `percentText` in lib/staking/view.ts). The spec asserts today's text
(`BOND_STATUS_UNBONDING · commission 8%`), so that assertion changes with the fix.
