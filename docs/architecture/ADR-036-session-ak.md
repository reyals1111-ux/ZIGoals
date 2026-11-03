# ADR-036: Session AK, "NUMBER ONE": session decisions

Status: **In progress** on `feature/session-ak-number-one`, from `main` `7000807` (Merge #98, Session AJ; live as Alpha #52), in a Claude Code cloud session (Opus 5.5, High effort). This record holds the owner's decisions (D1–D12, MUSIC, RAMP/BANXA), the owner's amendments to the plan (A1–A22), every reading the session took without asking (Q1…), the verify-then-do table, the per-surface quality lines (A22) and the closing table for every item in the brief. Resume point: `docs/handoff/AK_RESUME.md`.

## Owner decisions (31 Oct, final)
- **D1 — Push on the public Alpha:** yes. Built fully, switched off until the owner activates it. The push message carries no content; the service worker composes the text from the device's own data.
- **D2 — Widgets:** not possible on the web; Beta (native apps). The PWA is made as strong as the web allows instead.
- **D3 — Household/shared view:** design plus ADR only (needs accounts and encrypted sharing).
- **D4 — Languages, units, currency settings:** Beta; not in AK.
- **D5 — No real-model API calls in AK.** ZIGi work is scored against the mock and G6; new cases go to `docs/research/session-aj/REAL_MODEL_TODO.md`.
- **D6 — Studio-4 ZIGi art:** integrated in AK when its delivery branch exists. The 2× animated set (192×253) is pre-approved at ≤ 2.6 MB per file, loaded lazily one clip at a time, never in route JS; the 96×126 app set keeps its 400 KB budget.
- **D7 — Exchanges:** Kraken, Coinbase, Binance stay; automatic periodic refresh and a clear last-synced time; no new exchanges now; the next candidates researched into a document.
- **D8 — Stocks/ETFs with live quotes:** skipped (paid feed).
- **D9 — Up to 4 helpers at a time**, disjoint lanes, builds and browser runs serialized.
- **D10 — Opus 5.5, effort High.**
- **D11 — A full security review (RM12)** as the final engineering part.
- **D12 — Visual polish everywhere**, within the design language; the PROTECTED list stays.
- **MUSIC:** (a) a built-in focus/ambient player generated with Web Audio; (b) one-tap "Open in Spotify / Apple Music / YouTube Music" links (plain links); (c) an advanced "Use my own Spotify app" option (the person's own client id, PKCE, nothing server-side). The site-wide `SPOTIFY_CLIENT_ID` stays unset.
- **RAMP/BANXA:** not needed; the on-ramps keep opening the providers' own pages.
- **Public ids:** Reown project id `a769fc3cf950f7408189e14bac0633b1`. The PR-review secret and variable are set (31 Oct). The USDA FDC key becomes the food Worker secret `FDC_API_KEY` at the owner's deploy; the code reads `env.FDC_API_KEY` and degrades without it.

**Non-negotiables and the PROTECTED list** are the brief's (STATUS, Session AK entry): never merge, deploy, dispatch, approve environments or log in to Cloudflare; never push to `main`; the deploy workflow unchanged; consumer first, chain invisible; private by design; non-custodial (the person signs every financial action; WalletConnect enablement in Part 1 only, through the existing review screen); no fake integrations or simulated data shown as real; no new dependency; every stored-format change additive, `TIER 3 (stored format)`, frozen readers #37–#52, in export, restore, Erase everything, the data catalog and sync consent where it syncs; every new outside host `TIER 3 (egress routes)` or `TIER 3 (CSP)` with an egress-policy entry, limits and a PRIVACY.md line; reduced motion and Motion Off; theme parity; ≥ 44 px targets; WCAG 2.2 AA; no route budget raised (new routes measured + 10 %); new features load on use. PROTECTED: the Checklist and AG Polish 1–3; the footer finale; the Today hero and slogan (AF9); the first-visit swan intro; Today can be hidden; Light's dark islands; the tablet rail, desktop sidebar and phone bottom bar; Governance hidden by default and hidden pages out of the sidebar; "Premium · free during the Alpha"; the locked ZIGi look.

## Owner amendments to the plan (31 Oct, final; A1–A22)
- **A1 — Notification snapshot and action queue.** A service worker cannot read localStorage. The page writes a device-only IndexedDB snapshot `zigoals-notify-v1` (the next 48 h of due items: time, kind, id and the numbers the texts need), rewritten (debounced) on every relevant change, on open and at the day rollover. Names appear only with "Show what a reminder is for in notifications" on (the `zigoals-push-labels-v1` rule); otherwise generic counts; always generic while the device lock is on. "Done" and "Snooze 1 h" go to IndexedDB `zigoals-notify-actions-v1`; the app applies them with the normal Undo record on open/focus, or at once by `postMessage` when a window is open; each action applies exactly once. Both databases in Erase everything, the data catalog, export/restore where they hold personal values, and `lib/erase-coverage.test.ts`.
- **A2 — Every push shows a notification.** The wake list stays exact (re-registered when the snapshot changes; refreshed by the service worker after each push); a push that finds nothing due shows a calm orbit summary; a test proves no push handler ends without `showNotification`.
- **A3 — One push path per device.** An ADR-010 account subscription and the device path never both deliver (Q15); a test proves a subscription survives `/push-sw.js` → `/sw.js`.
- **A4 — Offline caching with the nonce CSP.** Navigations network-first with a short timeout, cached HTML only when offline; cache-first only for hashed `/_next/static` files and brand assets. Cached HTML holds no personal data and never mixes Showcase and real data. Erase everything clears Cache Storage and the offline queue, unsubscribes push and deletes the device record on the push Worker. Part 15 checks nonce reuse and cache poisoning.
- **A5 — Push Worker cost** within Cloudflare's free limits; the runbook sizes 100 and 1,000 devices.
- **A6 — Storage headroom.** Heavy new data goes to IndexedDB or its own small key, never into the four 2 MB private modules; a one-year heavy-use profile plus the Showcase stays under the caps (test); a clear "storage nearly full" message.
- **A7 — Wallet honesty.** Per-wallet WalletConnect v2 namespaces verified; MetaMask, Trust, OKX and Ledger Live listed only for what they do (read-only EVM/Solana linking). AFL9: Keplr Mobile signs ZIG through WalletConnect only where it supports `cosmos:zigchain-1` / `cosmos:zig-test-2`, through the existing review screen, the mainnet one-time confirm and the v6 base-fee quote (`TIER 3 (wallet)`); otherwise read-only, and the copy says so.
- **A8 — QR capacity:** versions 1–20 (EC L where needed); known vectors and a realistic longest URI.
- **A9 — Reown allowed domains:** an owner follow-up (never waited for); until then "Phone wallets are being switched on".
- **A10 — Food binding deploy order:** verify Cloudflare's behaviour; checks say it plainly; "deploy the food Worker FIRST, then Alpha #53" heads the runbook and STATUS's owner list.
- **A11 — EU library data:** if downloads fail, watch `review/ak-food-data` (`food-raw/`); English names, duplicates merged with every source shown, French and Finnish names as aliases.
- **A12 — Leftover sweep** (table below): the two picklists, AF's later list AFL1–AFL9, RM4, RM7, AF10, AF16, and every ADR-033/034/035 row marked later or not possible.
- **A13 — Mainnet v6 day:** after height 13,466,800, read zigchain-1, run the quote/diagnostics/stage-4 logic against a recorded v6 response, read any new notes, record in STATUS.
- **A14 — Bank files:** CAMT.053, OFX/QFX and MT940 with hand-written parsers (caps, no external entities, no DTD fetch), the same mapper, preview and dedupe.
- **A15 — "Switch to ZIGoals":** Strong, Hevy, Daylio, Habitica, YNAB, and Bearable if documented, with the existing honest states.
- **A16 — Honest export bridges:** claim only what each target app really imports; everything else "generic CSV".
- **A17 — Point-and-tell** never records visible text: role, a stable data attribute or test id, the route and the viewport only.
- **A18 — Manifest screenshots and iOS startup images** are committed product assets from the Showcase (labelled), within weights, outside the 60 self-check captures.
- **A19 — A first-run AK tour** ("New in ZIGoals", 5–7 stops), motion-safe, once per device, reopened from What's new and Help.
- **A20 — Landing refresh** with what AK really ships (MO6 claim rules and tests; labelled Showcase imagery).
- **A21 — PR review:** the Action runs only on a non-Draft PR and reviews at most 180,000 diff characters; 1e happens in Part 16.
- **A22 — Pacing and safety:** Parts 15 and 16 never skipped; a CI-green checkpoint per wave; resume from AK_RESUME.md; Part 13 also during Part 16; `/app/music` reachable from the Music entry; a quality line per new surface (below); Part 15 also covers WalletConnect signing, the Lichess token, offline-queue replay, the action queue and its `postMessage`, Cache Storage and every new IndexedDB.

## What the session found at the start (31 Oct)
- `main` = `700080715e40665f76542569639d460471518a65`, as the brief expects.
- Three read-only sweeps mapped every item of the brief against `main` (the verify-then-do table below). Most features exist; AK is mostly finish and polish.

## Decisions taken without asking (readings)
- **Q1 — Branch.** The brief names `feature/session-ak-number-one`; the cloud environment's default branch for this session is `claude/happy-ramanujan-1ak2dr`. The owner's explicit name is used; if the git proxy had refused it, the designated branch would have been used and recorded here.
- **Q2 — ID meanings.** The brief's WE3, DE5 and WE17 carry the repository's ADR-033 meanings: WE3 = the CSV import fixes (formula safety itself is Session U's FIX_PLAN D3), DE5/J18 = the light spend-cap budget, WE17/J11 = price alerts.
- **Q3 — Push architecture (D1).** A sibling Worker `workers/push-device/` (not a change to `workers/push-reminders/`), so ADR-010's signed-in path, `activation-check --push` and the six-Worker topology stay untouched; it reuses the account Worker's `clock`, `hosts`, `limits` and `webpush` modules. A device registers a random 128-bit id, a random device secret (stored as SHA-256 only), its push endpoint, its IANA zone and ≤ 48 wake minutes — no labels, no content, no encryption keys. Pushes carry no payload (VAPID ES256 by WebCrypto only). One SQLite Durable Object per device; 30-day TTL refreshed on open; 404/410 deletes; DELETE with the secret; per-device and global rate limits; a daily budget; kill switch on by default; CORS pinned to the app origin; `observability.enabled: false`; nothing logged. The app's `/api/push-device` route answers 503 "being switched on" until the owner's secrets and one committed variable are set.
- **Q4 — One service worker.** Offline needs a `fetch` handler, which ADR-010 rule 6 and `public-safety.test.ts` forbade. A scope holds one worker, so `/sw.js` holds push, notification actions and offline caching; `/push-sw.js` stays as a one-line `importScripts('/sw.js')` shim. The safety test changes to a stronger rule: no `/api/*`, cross-origin or non-GET request is ever cached. Caching per A4.
- **Q5 — Food binding.** `wrangler.alpha.jsonc` gains `FOOD_LOOKUP` → `zigoals-acctest-food-lookup`, the acceptance stack's name and the `MARKET_QUOTES` precedent; the two tests that refuse it change deliberately; deploy order per A10.
- **Q6 — Music page.** The ambient engine (`lib/audio/ambient.ts`) and Spotify PKCE exist; "the Music page" = the existing panel plus a new `/app/music` home (its own weight line), reached from the existing Music entry. The person's own Spotify client id lives device-only in IndexedDB and overrides the null site id on that device only.
- **Q7 — J3.** ADR-033 M31 holds: a habit completion offers a pre-filled "Add €X to its Goal" that the person confirms; nothing moves by itself.
- **Q8 — Chess.** `lichess.org` is already in the app's connect list; anything new is `TIER 3 (CSP)`. PKCE with a public client id string, scope `board:play`, the token device-only in IndexedDB; the Board API's time-control limits stated; a small hand-written move check for highlights, Lichess's stream the authority.
- **Q9 — QR.** No QR encoder exists in the repository; `lib/qr/` is hand-written (byte mode, versions 1–20, EC M falling back to L), tested against known vectors and a long WalletConnect URI (A8).
- **Q10 — Generic EU library.** Licences read on the official pages first; `scripts/food/build-generic-db.mjs` writes compact JSON per source under `public/food-generic/`, loaded on use and cached in IndexedDB `zigoals-food-generic-v1` (device-only), never in route JS; A11 for data the sandbox cannot download.
- **Q11 — Garmin.** `GARMIN_READS` stays false (the archive layout is unpublished); FIT import is the honest Garmin path.
- **Q12 — Quiet hours.** One value: push and the notification snapshot read the reminders plan's quiet hours; push's old 22:00–07:00 default is the fallback when no plan exists.
- **Q13 — Lab paths.** A WalletConnect Lab/demo mode (a fake session, never pairing) lives in tests and the Showcase only; no new route.
- **Q14 — Pace.** G1's range forecast (180-day slope) stays; a "last 30 days" line and what-if sliders extend `lib/goals/on-track.ts`.
- **Q15 — One push path (A3).** Turning on the new Notifications card on a device that holds an ADR-010 account subscription replaces it: the app deletes that subscription from the account Worker first, then registers the device path.
- **Q16 — AF's later list numbering.** ADR-028 "Later options" in order: AFL1 REStake auto-compound, AFL2 feegrant (a funded ZIGoals key), AFL3 habit pacts (an escrow contract; governance whitelist), AFL4 memo attestations, AFL5 the xpub watch, AFL6 Guided Journeys and Focus Sessions, AFL7 a synced per-habit clock, AFL8 the Checklist extras sync (H10's `checklist` section, named by the owner), AFL9 Keplr Mobile signing through WalletConnect (named by the owner). ADR-028's OroSwap pool and vault shares line is recorded beside them as AFL-x.

- **Q17 — Service workers in the browser suite.** The app registers `/sw.js` on idle for offline use, so the Playwright
  configs block service workers by default (a worker would serve navigations and assets past `page.route`); the specs
  that test the worker, push and offline use opt in with `test.use({serviceWorkers: 'allow'})`. Real users get the worker.
- **Q18 — Where AFL9 lives.** The static staking guard allows signer calls in `lib/staking/execute.ts` and `lib/wallet.ts`
  only, and the wallet files may not name a signing method. Keplr Mobile signing over WalletConnect is therefore a
  KeplrSigner adapter in `execute.ts` (`walletConnectKeplr`, `WC_STAKING_METHODS`), used by the review sheet when the
  browser has no Keplr; the pairing namespaces take the methods from there.
- **Q19 — No `/push-sw.js` shim.** `/push-sw.js` stays byte-identical for ADR-010's account devices (its specs and the
  ADR-014 names rule stay pinned); the shell does not register `/sw.js` on a device holding an account push record, and
  turning on the device path removes that record first (Q15). This replaces the plan's shim reading in Q4.
  *Amended (1 Nov, CI lane P, lead decision):* `/push-sw.js` gains one `message` handler — `skipWaiting()` only for `{type: 'zigoals:push-sw-activate'}` from a window of this origin; still no fetch handler, cache or storage. Reason: Chrome's hand-over from the active `/sw.js` to a waiting `/push-sw.js` stalls when a page request restarts `/sw.js` mid-stop (up to 5 min under DevTools, ≥ 30 s idle otherwise), so turning on account reminders could stay "Off"; `turnOnPush` now asks every 1.5 s (≤ 10 s) and Chrome retries at once. Accounts are not open on the Alpha, so no live account device is affected. Commit: TIER 3 (PWA) (`199ac9a8`).
- **Q20 — Price alerts by push.** A push must always show a notification (A2), so there are no silent price-check wakes:
  price alerts are checked by the service worker with the morning and evening notifications (prices from the app's own
  `/api/market-quotes`, compared on the device; a crossing is queued for the app to record once).
- **Q21 — WalletConnect frame sources.** Verify's frame hosts are written `https://verify.walletconnect.org/` and `.com/`
  (a trailing "/" matches every path, as the bare origin does), the form the deploy smoke's "exact https pages" rule
  accepts, so `scripts/lib/alpha-smoke.mjs` stays unchanged.

## Verify-then-do (the brief's items checked against `main` before building)
Legend: **C** exists, complete (verify and polish) · **U** exists, unfinished (finish) · **N** new (build).

| Item | State | Found on `main` | Action |
|---|---|---|---|
| 1a WalletConnect | U | `lib/wallets/walletconnect.ts`, `components/wallet/walletconnect-panel.tsx`, `@walletconnect/sign-client` 2.26.0 (dormant), `config/public-integrations.json` `reownProjectId: null`; no QR encoder | Set the id, CSP hosts, QR, phone flow, Keplr signing per A7 |
| 1b Food Worker | U | `workers/food-lookup/worker.mjs` (OFF, FSVO search), `app/api/food-lookup/route.ts` (binding `FOOD_LOOKUP`, 503 without it); the Alpha binding refused by `check-deployment-configs.test.ts`, `alpha-deployment.test.mjs` | FDC step, chain order, binding, runbook |
| 1c EU library | N | FSVO is the only generic source | Build (Q10) |
| 1d Music | U | `lib/audio/ambient.ts` (white/pink/brown, rain, ocean, drone), `components/audio/ambient-*`, Spotify PKCE `lib/music/spotify/*`, the music panel/mini; no `/app/music` page | Finish: sounds, timer, mix, links, BYO id, the page |
| 1e PR review | C | `.github/workflows/pr-review.yml`, `scripts/pr-review/review.mjs`; skips without secret | Part 16 (A21) |
| Push | U | `workers/push-reminders` (account-bound, encrypted `{"v":1}`), `app/api/push`, `lib/push/*`, `public/push-sw.js`, Settings "Reminders when closed"; schedules habits and water only | Device path (Q3), types, snapshot (A1), actions, card |
| PWA | U | `public/manifest.webmanifest` (5 shortcuts, share target, maskable), `use-install-prompt.ts` (onboarding/Help), offline pill; no caching service worker | `/sw.js`, offline, update flow, install entry, assets |
| 4.1 Barcode | C/U | `components/health/barcode-food-lookup.tsx` (BarcodeDetector + zxing), GTIN field, food library, favourites; scan history in memory only | Scan history, barcode match first, match card polish |
| 4.2 Photo meal | C | `lib/ai/photo.ts`, `lib/meal-estimates/*` (ranges, middle saved) | Device-only photo option, honest copy |
| 4.3 Voice/NL meals | C | `quick-add-mic.tsx`, `lib/quick-log/multi.ts` (J10) | Confirmation polish |
| 4.4 Micronutrients | U | `lib/health.ts` nutrition (fibre, sugar, sat fat, sodium, potassium, calcium, iron), `lib/health-vitamins` (A, C, D, E, K, B12, folate), `lib/health-aa/micro.ts` | Add Mg, Zn, B1, B2, B3, B6, omega-3; summaries, trends |
| 4.5 Adaptive targets | C | `lib/health-aa/energy.ts` (14 days, floors, 15 % step), `coach.ts` | Weekly coach card Keep/Adjust + Undo |
| 4.6 Planner + grocery | C | `lib/health-aa/planner.ts`, `health-daily.ts` groceries, `aisles.ts` | Pantry, units, export, keep ticks |
| 4.7 Wearables | U | Apple/Fitbit/Samsung/Oura/Loop readers (`lib/import/switch/*`), `zip-stream.ts`, GPX/TCX; Garmin off; no FIT, no Strava ZIP | FIT, Strava ZIP, routes join, auto-rules |
| 4.8 Recipes | C | `recipe-text.ts`, `/api/recipe-import`, portions | Polish |
| 4.9 Training/sleep | U | sets (warm-up/drop/failure), rest timer, PRs, 1RM, weekly volume; sleep balance; consistency from bedtimes only | Supersets, RPE, plates, per-muscle volume, wake consistency |
| 5.1 Schedules | C | five kinds in `lib/habits.ts` | Due vs optional, per-kind rules |
| 5.2 Skip reasons | C | `TIME_AWAY` vacation/sick/rest, `planSkip(reason)` | Custom reason, history and year view |
| 5.3 Strength | C | `lib/habits-v2/strength.ts` | Card, year view, review |
| 5.4 Routine player | C | `lib/routines/*`, `routine-player.tsx` | Full screen, timers, templates, share structure |
| 5.5 J3 | U (by decision) | `habit-completion.tsx` offer (M31) | Q7 |
| 5.6 Auto-complete | U | `lib/habit-health-links/*` (Health only) | Rule editor across pillars |
| 5.7 Habit polish | U | reminders, notes, year view, archive exist; no reordering, no compact Habits page | Build the missing |
| 6.1 NL goals | U | ZIGi `create-goal` cards, AF plan bundles; Quick add parses no goals | Local parser + review card |
| 6.2 Pace/what-if | C | `lib/goal-forecast.ts` (G1), `lib/goals/on-track.ts` | Q14 |
| 6.3 Vision/why | C | `vision-board.tsx`, `goal-extras` why | Reflection prompts, progress card |
| 6.4 Milestones | C | `lib/templates/goal-library.ts`, `lib/goals/milestones.ts` | More templates, reorder, habit links |
| 6.5 Progress toast | C | `components/ui/undo-toast.tsx` (one toast) | Cross-pillar message |
| 6.6 Household | — | — | Design ADR only (D3) |
| 7.1 CSV templates | U | `lib/csv/*`, `lib/import/holdings.ts`; no saved mappings | Templates, mappings, bank files (A14) |
| 7.2 Exchanges | U | `lib/exchanges/*`, `/api/exchange`; manual reads | Auto-refresh, last-synced |
| 7.3 Bills | N | money-log categories only | Build |
| 7.4 Performance/drift | U | `lib/portfolio/performance.ts`; no targets | 30/90-day, target allocation, drift |
| 7.5 Purpose allocation | U | `lib/positions.ts` allocations; no Sankey | Build the visual + table |
| 7.6 Autopilot | N | `lib/reminders/contribution-due.ts` (in-app) | Build |
| 7.7 Budgets | U | one weekly budget, spend-cap template | Categories, month view, rollover |
| 8.1 Weekly review | C | `/app/review`, `lib/life-review/*`, `lib/weekly-review/*` | Merge the unified review |
| 8.2 Daily orbit | N | — | Build |
| 8.3 Weekly insight | C | `lib/insights/*`, `lib/ai/proactive/*` | Polish |
| 8.4 Balance coaching | U | `lib/life-balance.ts` | Monthly note |
| 8.5 Share cards | U | `lib/share-image.ts`, `lib/habits-share.ts` | One card system |
| 8.6 Game layer | C | `lib/game/*`; the Checklist awards no XP | Badges, pin |
| 8.7 Point-and-tell | N | `lib/feedback.ts` (mailto) | Build (A17) |
| 8.8 Export bridges | U | CSVs inside Export everything | Bridges (A16) |
| 8.9 Recovery | U | recovery secret, sync status exist; no test restore, no backup reminders | Build |
| 8.10 AFL8 | N | `lib/af-checklist-keys.ts` shaped as `checklist`; `EXTRAS_SECTIONS` has no checklist | Wire the section |
| 9 Chess | U | `lib/skills/chess/*`, frames; habit ticks on games | Board API play, puzzle habit |
| 12 ZIGi | C | `lib/ai/tools/registry.ts`, `lib/ai/actions/schema.ts`, `components/zigi/semantic.ts`, `scripts/zigi/import-studio.mjs` | Tools, events, importer constants |
| 14 zigi-memory:188 | U | `tests/zigi-memory.spec.ts:184-188` (`networkidle` then reload) | Fix at the cause |

### A12 leftover sweep
Every still-open row of ADR-028 to ADR-035 and the STATUS entries since AG Polish 2 (a read-only sweep, 31 Oct). Class: **a** buildable now (built in the named part), **b** needs the owner, **c** blocked by an outside fact, **d** excluded by an owner decision or a protected rule. Rows closed by a later session are left out (AH, AI and AJ closed most of the picklists).

| ID | What | Where | Class → AK part |
|---|---|---|---|
| H6/H38/H87, P3.1 | Phone wallets over WalletConnect | ADR-028 | a → 1a (Reown allowed domains: b, A9) |
| H133 S9 | WalletConnect Verify `frame-src` | ADR-028 | a → 1a (the id is set, so the frame hosts enter with it) |
| AFL9 | Keplr Mobile signing over WalletConnect | owner | a if Keplr Mobile supports the ZIGChain namespaces, else c → 1a |
| AFL8 (owner's numbering, Q16) | Checklist extras sync | ADR-028 H10 | a → 8.10 (encrypted extras sync, AJ item 35 precedent) |
| AFL1 | REStake auto-compound | ADR-028 H45 | c — re-verified 31 Oct (F0): the installed @cosmjs/stargate 0.38.1 still ships no authz Amino converters (`modules/authz/aminomessages.js`: "IMPLEMENT ME"), so Keplr's Amino path cannot sign a grant; stays recorded |
| AFL2 | Feegrant (a funded ZIGoals key) | ADR-028 H7 | d (non-custodial) |
| AFL3 | Habit pacts (escrow contract) | ADR-028 | c (contract uploads governance-whitelisted) — not re-verified this session (1 Nov, C1: no record of a re-check exists in AK's commits or docs, unlike AFL1 and RM4); the class c reading from ADR-028 stands and the row stays recorded |
| AFL4 | Memo attestations on mainnet | ADR-028 H48, H105 | d (privacy); the prefix-free practice-badge memo (H133 S6) was a → 14 (TIER 3 wallet) — recorded, not built (1 Nov, C1): class c/d, because it would be a new signed memo and AK signs nothing new (F4's rule; non-custodial: only message types the app already signs) |
| AFL5–AFL7, ADR-028's OroSwap shares | xpub, Journeys/Focus, synced habit clock, pool/vault shares | ADR-028 | Done (AJ items 36, 34, 35; AH AF3) |
| H113 | `goalId` prop on TodayIntelligence | ADR-028 | a → 14 |
| M4 (QA2-04) | ZIGi knock reminders use the device clock, not the journal's zone | ADR-033 | a → 14 — built in F0 (`d2105402`): ZIGi's weekly reminders follow the journal's zone (day, weekday and clock together; the device zone when none) |
| M42 | "Net worth this week" on Today's line | ADR-033 | a → 8 (check AI N37 first) |
| LA6 D-196 | Dark: column widths differ between pages | A8 | a → 11 — recorded, not done (1 Nov, C1): the finding names no page or width (AJ's A8_REOPENED: out of scope / owner); M7's layout audit (`00f3a69d`) checks each page's own overflow and targets, not column widths between pages, so it does not close this |
| AF15 (parts 2, 3) | Health import stress readings; Academy name under the lesson bubble | A8 | a → 11 — recorded, not done (1 Nov, C1): part 2 shows only with the layout audit's stress records (`--stress`), which M7's run (`00f3a69d`) did not use; part 3: M7's run covered Earn and its What's this state at 390 px in three themes and fixed nothing there, but the lesson-bubble label was not checked on its own |
| F3 | Cold load 1.3–1.4 s | ADR-033, ADR-034 | a → 3 (the offline shell) and 11 |
| Missing tests | ZI4, ZI8, ZI9, ZI14, G15; the landing privacy/terms skip link | ADR-034 | a → 14 |
| M8 | One-offs: `hosted-verifier-order:16`, WebKit "Target crashed" | ADR-033 | a (investigate) → 14 |
| Intermittents | `zigi-memory:188`, `zigi-accept-correct:260` (Tokyo), `zigi-memory-af:15`, `market-status` socket closed, `zigi-knock` on /app/habits, WebKit-phone cancelled fetches (AF16) | STATUS | a → 14 |
| WE17/J11, CO11, MO3 | Price alerts and complete/snooze by push; push activation | ADR-033 | a → 2 (activation: b) |
| M28 | USDA FoodData Central | ADR-033 | a → 1b (the key at deploy: b) |
| HE4/J5/L4, AJ 22 | Barcode and FSVO need the food Worker deployed and bound | ADR-033, ADR-035 | a → 1b (deploy: b, A10) |
| H118 | ZIGi's brief and recap English only | ADR-028 | d (languages are Beta, D4) |
| H125/H137(a) | Right-edge launchers over content | ADR-028 | d (an owner item; recorded) |
| K19 | `eslint-config-next` not pinned with `next` | ADR-031 | d (a dependency change needs owner approval) |
| RM4 | `www` → apex redirect | ADR-033 | b (Cloudflare dashboard) — re-verified 31 Oct (F0): landing/wrangler.jsonc keeps `workers_dev: false` and `preview_urls: false`; the redirect stays an owner dashboard step |
| RM7/M28 | Fitbit import off; Google Fit wording | ADR-033 | d (owner's note); the wording re-checked in 4.7 |
| AF10 | Ecosystem glow by day | ADR-033 | Done (AH) |
| AF16 | CI intermittents at their cause | ADR-033 | a → 14 (row above) |
| WE15 | Six doc 404s; the FSCA notice PDF | ADR-033 | c (hosts answer 403 to the sandbox; no official replacement URL) |
| M48 | Widgets, Apple Health live, watch, Screen Time, receipt OCR | ADR-033 | c / d (D2: Beta) |
| M37 | LP tokens staked in a farm | ADR-033 | c (not in the wallet) |
| Owner items | Lawyer checklist (H36/H126), logo trademarks (H39), refs-branch deletion, Face ID/passkey test on an iPhone (RM8), undescribed BUG ids (NO1, M31), the API Console vs ledger (N44), real-key exchange tests (N34), the real-model re-score (N20, D5), the practice and mainnet delegates (A9 of AJ), the landing redeploy, the verifier on #52, the market policy renewal before 30 Nov, DMARC and the acceptance redeploy | ADR-028 to ADR-035, STATUS | b (listed in STATUS's owner list) |
| Protected or decided | H72, H126, H129, H131/AF13, H138(c), I11, I13, K11, L26, L28/M54, "Evening Orbit" fade, M44, TR7/M19, M23, GO3/M33, TO1/M40, WE2, ST4/LA5, M39, TO5, TO7, TO11, H3, SE1, SE4, SE10, SE13, F1, MO4 pricing, RM1 local models, N15, N18–N31 (device-only records), D12, D6, P20 | ADR-028 to ADR-035 | d (each keeps its recorded reason) |
| P2, P10 | v6 on mainnet only if #45 passes; the 1-ZIG voting threshold on v5 | ADR-035 | c → A13 in 14 |

## Owner follow-up 1 (F0–F12), 31 Oct evening (pre-approved; worked through without questions)

Keep building at full depth through the night (~14 h, until about Sun 1 Nov 11:00 UTC; finishing well beats the clock).
Same branch, same PR.

CHANGES: Studio-4 swap (Part 13) moves to a separate session → here F11 (preparation complete and proven); do not wait
for review/studio4-assets; Fineli only if review/ak-food-data appears. A13 (mainnet v6, 3 Nov) NOT in this PR: owner
check after the deploy. Helpers: up to 6 at a time (disjoint lanes, files named in AK_RESUME) plus fresh read-only agents
for F1 and F2. Browser slot: one build/browser run at a time, Chromium, max 2 workers; the F2 test agent owns the slot
between the lead's checks (the lead schedules). Push ≥ every 45 min. All non-negotiables, PROTECTED, stored-format rules,
no new deps, no secrets, never merge/deploy: unchanged.

F0 FINISH WHAT IS OPEN (first)
1. ADR-036 closing table: every remaining row (6.5, 7.8, 8.1–8.7, each Part 10 item, Parts 11–16, A1–A22, D1–D12, MUSIC,
   F0–F12) and one A22 quality line per new surface vs COMPETITORS.md (c).
2. Part 14 / A12 rows without a commit: intermittents at their cause (zigi-memory:188, zigi-accept-correct:260 in
   Asia/Tokyo, zigi-memory-af:15, the market-status socket, zigi-knock on /app/habits, WebKit-phone cancelled fetches);
   M4 (knock reminders in the journal's zone), H113, M8 (investigate); missing tests ZI4, ZI8, ZI9, ZI14, G15 and the
   landing skip link; AFL4 prefix-free practice-badge memo (TIER 3 wallet) if still class a; re-verify and record AFL1,
   AFL3, RM4.
3. Brief items to build/finish or prove done: 6.5 cross-pillar progress toast; 7.8 wealth polish; 8.1 unified weekly Life
   review in /app/review; 8.3 weekly ZIGi insight; 8.4 monthly balance note; M42; COMPETITORS items 5 (warm-up), 7 (weekly
   calorie budget view), 16 (Loop export), 23 (time-of-day sections); habit schedule "first Monday of the month" (5.1); a
   visible sync status (8.9); the Settings → Notifications card explaining "being switched on" while push is off.
4. CI failures on the current head fixed at their cause (shard 3: the three ZIGi specs).

F1 RELEASE-READINESS REVIEW "as if 1.0": fresh read-only agent (built none of AK); every route, Showcase AND fresh empty
start, 390 and 1440 px, Nebula/Light/Dark, reading code and running the production build in the browser slot it is given.
Judges as App Store reviewer + design lead + first-time non-crypto consumer: first-run clarity/onboarding; copy (plain,
kind, no jargon, no tiny grey text, no crypto words outside chosen modules); consistency (components, spacing, icons,
charts, toasts); dead ends, broken/confusing flows, duplicates, unfinished pages; empty/loading/error/offline states;
phone ergonomics (thumb reach, sheets, safe areas, keyboard over inputs); accessibility (keyboard-only, focus order,
names, contrast, reduced motion, Motion Off); performance (cold load, route weights, long tasks, INP); trust (privacy
wording, honest labels, no fake data, no projections as guarantees). Output docs/review/session-ak/RELEASE_REVIEW.md
(severity Blocker/Major/Minor/Polish, route, width, theme, exact problem, proposed fix). Lead fixes every Blocker and
Major and as many Minor/Polish as possible, with tests; PROTECTED stays; every finding gets a status line.

F2 FULL APP TESTING: fresh agent owning the browser slot; end-to-end journey specs (Chromium, ≤2 workers, production
build) over several simulated days: 1 fresh start → onboarding → first goal → first habit → Checklist → contribution →
weekly review; 2 health day: barcode (mocked) → generic EU food → meal photo estimate (mock) → water → workout with
supersets, RPE, plates → sleep → coach card; 3 money month: CSV and CAMT.053/OFX/MT940 import → review inbox → rules →
split entries → budgets with rollover → bills → purpose flow → contribution pre-fill; 4 offline: install, offline, every
pillar, back online, queue drains, update prompt; 5 notifications: snapshot, wake list, both action paths with Undo,
nothing doubled; 6 data safety: export → Test a backup → Erase everything (caches, IndexedDB, push device record gone)
→ restore → every value back; 7 wallet/chain (mocked): read-only WalletConnect linking, Keplr Mobile signing via the
review sheet on testnet, never auto-signed; 8 ZIGi: every new tool's confirm card, money never auto-accepted; 9 Lichess
(mocked streams): a game, the daily puzzle ticks the habit; 10 Switch to ZIGoals: each importer's fixture; 11
keyboard-only and screen-reader-name runs through journeys 1–3. Every bug fixed at its cause. Journeys stay in the suite
(tagged, sharded so CI time stays reasonable).

F3 COMPETITOR RESEARCH ROUND 2 (research helper; official pages, help centres, App Store listings and public reviews;
sources listed): each pillar leader's newest 2026 features; onboarding/retention patterns (first 7 days, streaks,
reminders, celebrations); top recent review complaints (paywalls, ads, privacy, sync loss, nagging, clutter) → ZIGoals
advantages to make visible; delight details worth copying. Apps: round 1 plus Bevel, Gentler Streak, Athlytic, Welltory,
Stoic, Reflectly, Rosebud, Structured, Sunsama, Tiimo, Copilot Money, Lunch Money, Actual Budget, Wealthfolio, Ghostfolio,
Keplr, Leap's successors, Cosmostation's successors, ZIGChain ecosystem apps. Output
docs/research/session-ak/COMPETITORS_2.md with ranked BUILD list 2 (web-possible, not in AK, inside the non-negotiables);
build it in rank order in the F-streams; the rest recorded with reasons.

F4 ZIGCHAIN ECOSYSTEM DEEPER (chain invisible for people who didn't choose these modules; testnet first; non-custodial;
ONLY message types the app already signs, through the one review sheet; nothing new signed). Research first:
docs/research/session-ak/ZIGCHAIN_ECOSYSTEM.md from official docs, v6 release notes, ecosystem projects' own pages: what
v6 changed for apps (fee market/base fee; EVM module, JSON-RPC, chain id if officially live); live ecosystem apps (DEXs,
liquid staking, vaults, launchpads, RWA, bridges) and their official keyless read-only APIs; announced-but-not-live.
Build (read-only, info only; each host TIER 3 (egress routes)/(CSP) + egress-policy + PRIVACY): validator chooser upgrade
(commission, uptime/missed blocks where LCD gives them, voting power with a gentle decentralisation hint — prefer outside
the top 10 — jailed/slashing status, from the network's own LCD); staking clarity (claimable rewards, rewards history,
unbonding calendar with local reminders via Part 2 notification types, info-only rewards CSV export); purpose staking
(staked ZIG assignable to a goal in the purpose flow 7.5, unbonding shown as "available in N days"); IBC and token
clarity (IBC denoms → readable names via denom traces; CW20/known token metadata from the network); governance (still
hidden by default): plain-language proposal summaries from the proposal text, the deadline, opt-in reminder, voting only
if the app already signs votes; ecosystem directory refresh (official link, plain words, live status where an official
keyless API exists, honest "not live yet"; Zignaly-dependent items keep the closure notice); if ZIGChain EVM is
officially live: read-only EVM balances for linked EVM addresses (official RPC, CSP entry, documented chain id; no EVM
signing); testnet practice journey polish (official faucet link, practice staking step by step, a practice badge).
Tests for each (mocked LCD/RPC, v5.1 and v6.0 shapes).

F5 NEW FEATURES (helper lanes; each with tests, Showcase examples, empty-start teaching, Help lines,
export/erase/catalog coverage): Goals & money — debt payoff planner (snowball vs avalanche, payoff date, interest saved,
info only); savings challenges as goal templates (52-week, no-spend days, round-ups by hand); net-worth milestones with a
calm celebration; Financial freedom model polish; goal templates gallery expanded with BUILD list 2's winners. Health —
body measurements (waist, hips, chest, arms…) with trends; device-only progress photos with a compare slider (opt-in, in
the ZIP export, never uploaded); supplements and medication-reminder log (info only: names, dose text, schedule,
taken/skipped; local reminders; no medical advice, no interaction claims); weekly calorie budget view and warm-up
calculator if F0 hasn't. Habits & routines — habit stacking ("after I pour coffee → 2 min stretch") shown in order on the
Checklist without changing its protected look; implementation intentions (when/where); smart time suggestions learned
on the device ("you usually do this at 07:40"); time-of-day sections (if F0 hasn't). Cross-pillar — one unified
calendar/agenda (habits, contributions, bills, planned workouts and meals, unbonding dates, reviews) with day/week/month
views + .ics export (download only); "ZIGoals Wrapped 2026" year-in-review story on the device (top habits, streaks,
goals funded, health trends, focus hours), shown from 1 December or after 30 days of data, share cards (sensitive numbers
off by default), reduced-motion safe; command palette upgrade for the existing search: actions ("log water", "start
focus", "add contribution", "open review"), keyboard and phone friendly.

F6 VISUAL UPGRADE ACROSS THE APP (D12; inside PROTECTED; one lead-owned design pass with a helper): premium
cosmic/nebula finish beating COMPETITORS.md (c): hand-made SVG pillar illustrations (planet/orbit) for headers and empty
states within weights; one upgraded chart language (gradient strokes, soft glow, readable labels, same axes/tooltips);
richer cards (depth, liquid-glass hover without pointer tracking, pillar accents); skeletons with reduced-motion-safe
shimmer; one-time tasteful completion micro-interactions (Motion Off silent); View Transitions API page transitions
where supported (off under reduced motion / Motion Off); phone sheets, safe areas, thumb reach; consistent type scale and
spacing. Headings white on the left with the nebula from the middle to the right; readable text; theme parity (Nebula,
Light with dark islands, Dark, every Customize option). Layout audit at 320/390/768/1024/1440/1920 × 3 themes passes;
route weights never above budget (lazy-load illustrations).

F7 LANDING VISUAL REFRESH (owner deploys): new hero (nebula + orbit, one-time motion, reduced-motion safe); pillar
chapters with real Showcase screens (labelled example data, optimised WebP/AVIF within the weight budget; 1.6 MB must
not grow, aim lower); phone mockups; "Works offline, installs like an app"; "Private by design"; "Switch to ZIGoals"
(real importers); an FAQ; the waitlist/friends CTA as today. Keep CSP/headers, Privacy/Terms, MO6 claim rules and tests,
accessibility (skip link, contrast, keyboard), check:landing passing. Document changes for the owner's deploy in STATUS.

F8 PERFORMANCE AND ACCESSIBILITY (one helper lane): cold load (1.3–1.4 s): measure and cut (code splitting, deferring
non-critical work, image sizes, offline shell); INP and long tasks on the heaviest routes; A6 headroom on a slow phone
profile; WCAG 2.2 AA across every new surface (keyboard-only journeys, focus order, names, contrast, target size,
reduced motion). Before/after numbers in STATUS.

F9 ZIGi FOR EVERYTHING NEW: tools and confirm cards for every F4–F5 feature (debt planner questions, add a measurement,
log a supplement, schedule from the calendar, ask about validators in plain words, open Wrapped); money never
auto-accepted; mock evals + G6; REAL_MODEL_TODO.md.

F10 SECURITY DELTA REVIEW (Part 15 again on everything built since 20:34): fresh reviewers (≤3): new parsers and
importers, calendar/.ics export, progress photos and supplement log (erase, export, device-only), ZIGChain read-only
hosts and denom resolution (spoofed metadata, phishing names), the command palette, the landing. Fix every High and
Medium; record the Lows.

F11 STUDIO-4 PREPARATION COMPLETE AND PROVEN: verify every Part 12 prep item is done and wired (semantic events at real
triggers, variant rotation, X030 cheer slot, push icon/badge slot, importer constants, manifest slots, fallbacks); a
dry-run test: a synthetic fixture in the exact delivery layout (studio4-deliver/ with app/, app-2x-anim/, push/,
reactions.json, SHA256SUMS, RECEIPT.md) through import-studio.mjs, the SHA check, the manifest update and the budget
checks (1× 40 KB, 2× 100 KB, large 200 KB, animated 400 KB, the 2× animated set ≤ 2.6 MB per file lazy), then thrown
away; docs/handoff/STUDIO4_SWAP_RUNBOOK.md (commands, files touched, the three tests to update at equal strength, the
optical-offset re-measure).

F12 FINISH (Part 16): full sweep of the Showcase and a fresh empty start, 390 and 1440 px, every route, 3 themes; the full
gate (lint, typecheck, unit, production and OpenNext builds, check:alpha dry run, the full browser suite incl. F2
journeys, theme parity, layout audit, weights, frozen readers #37–#52, pnpm audit, erase coverage); PR out of Draft, the
PR-review Action once (A21), findings as data, final push, CI green; the STATUS entry as the final commit (F0–F12,
RELEASE_REVIEW summary, journeys, COMPETITORS_2 summary, ZIGChain findings, landing changes for the owner's deploy,
performance numbers, owner list: food Worker FIRST, then merge and deploy #53 and the verifier; Reown allowed domains;
push activation; landing deploy; A13 mainnet check; the Studio-4 swap session; the real-model run); short report.

Readings: Q22 — Part 13's swap is out of this PR (F11 instead); A13 is an owner check after the deploy (the A13 reminder was cancelled). Q23 — the push Worker's service binding waits for push activation (adding it now would fail the Alpha deploy until that Worker exists, the 10056 rule); the runbook's rate-limited route covers it. Q26 — F6's View Transitions page transitions are designed but not switched on in this PR: every route change would run through a transition in about 400 specs on Chromium and WebKit (they run with motion on), with the CI-green finish ahead; the design is recorded for a follow-up with its own spec pass (an `app/app/template.tsx` wrapping children in React's `<ViewTransition enter/exit="zg-page" default="none">`, a 120/180 ms fade with a 6 px rise, none under reduced motion and Motion Off, the protected chrome pinned with a fixed `view-transition-name` and no animation, and theme-switch's root crossfade scoped to a `theme` transition type). Q27 — completion micro-interactions: the existing ones stay (goal finished glow, the Checklist day celebration, Journey's celebration, the new net-worth milestone fade, each silent under Motion Off); none is added to the habit card, whose tick is the PROTECTED Checklist's pattern. Q24 — ZIGoals Wrapped's door is on Journey and in Search; a Today For you card is built (`TodayWrappedCard`) but not mounted, because Today's weight and its Showcase layout specs are pinned and the card matters from 1 December; mounting it is one lazy element when the season starts. It ships unmounted on purpose until 1 December (a STATUS known limitation). Q25 — the vote reminder (F4) is its own opt-in per proposal, so it has no separate Notifications switch (a switch named for governance would show chain words to everyone, against "chain invisible"); unbonding dates go to the Agenda only, not to notifications (they come from Wealth's records, which a notification snapshot does not read).

## Owner follow-up 2 (NOVA and finishing deeply; Q, G, N, B, T, M, Z), 1 Nov 00:30 UTC (pre-approved; worked through without questions)

The owner's message, as received (screenshots described, not committed):

```text
OWNER MESSAGE 2 TO SESSION AK (received 1 Nov 2026 ~00:30 UTC), pre-approved, no reply needed; continue in auto mode.
Do NOT start F12. Headline feature: NOVA, a private personal AI command center people build themselves on top of
ZIGoals. Record in ADR-036 as "Owner follow-up 2" (sections Q, G, N, B, T, M, Z; every numbered item gets a closing row),
update AK_RESUME.md, rebuild the task list. The owner attached two screenshots of his own NOVA dashboard (1.webp: a full-view dashboard, dark starfield with a diagonal purple nebula band, a centred glowing orb
"N.O.V.A · STANDBY · CLICK TO SPEAK" in concentric rings, a big local-time clock top centre, a top-left "Your day",
search, workflow and globe buttons, a top-right row of round service buttons and "Systems", a slim left edge rail, a
"What's on your mind, Rey?" command bar bottom centre with ⌘K, "View controls" and "Automatic · best fit" bottom left,
2D/3D toggle bottom right; 2.webp, the chat opened as a large glass panel over the dashboard: "YOUR PERSONAL
INTELLIGENCE · Think out loud. · One conversation. Your whole constellation.", "Ready when you are", "New chat", a
message list, a big composer "Message Nova…" with mic and send, "Your context stays together when the model changes.").
Use them as inspiration for the layout and the "opening up" full-view feel, redesigned in ZIGoals' own nebula star
system: our theme, orbits and colours, not a copy.

THE OWNER'S GOAL: When the owner opens NOVA for the first time it must amaze him: a full-view dashboard that opens like
a star system coming to life, with a working assistant, beautiful widgets and every ZIGoals feature one tap away. NOVA
lets people learn to build the viral "personal Jarvis dashboard" setups, but ZIGoals' niche is that NOVA is already wired
into a full life app with real goals, habits, health and wealth data. Privacy is the highest priority: local LLM first,
the person's own keys only as an option, nothing on a ZIGoals server, no group, friend or shared features.

RUN RULES
- Many hours, continuing into the owner's new weekly usage (resets ~Sunday 12:00 Brussels), until everything below is
  done at full quality. Never rush to F12. If paused, resume from AK_RESUME.md.
- Helpers: up to 8 at a time in disjoint lanes (files named in AK_RESUME), plus fresh read-only reviewers/testers named
  below. Helpers never build or commit; the lead integrates, reviews every diff, owns every shared file. Browser-slot
  protocol (flock -o, one build or browser run at a time, Chromium, ≤ 2 workers). Push at least every 45 minutes.
- Every rule stays: non-negotiables (consumer first and chain invisible, private by design, non-custodial, no fake
  integrations or simulated data shown as real, no projections as guarantees); PROTECTED list (Checklist, footer finale,
  Today hero and slogan, swan intro, tablet rail, desktop sidebar and phone bottom bar, Light's dark islands, Governance
  hidden by default, locked ZIGi look); stored formats additive and TIER 3 with frozen readers #37–#52; every new key
  and database in export, restore, erase and the catalog, erase-coverage and the A6 headroom test; no new dependencies;
  no secrets; never merge or deploy; reduced motion and Motion Off; theme parity; WCAG 2.2 AA; route budgets never
  raised (new routes measured + 10 %, loaded on use).
- NOTHING THAT NEEDS A SERVER: no channels, group/friend chats, shared rooms, accounts for NOVA, no new Workers. NOVA
  runs on the device; the only outside calls are the person's own local model (localhost) or, optionally, their own
  cloud API key straight from the device to that provider.
- Quality bar: reachable from the UI, wired end to end, working in the Showcase AND a fresh empty start, unit tests, a
  browser spec, Help text, a labelled Showcase example and empty-start teaching. No dead code, no stubs presented as
  features, no fake data.

Q. QUALITY FIRST
Q1 WIRING AUDIT by a fresh read-only agent: for EVERY "Built"/"Finished" row in ADR-036 (Parts 1–12, A1–A22, F0–F11),
   check reachable from the UI, works end to end in the production build, saves and restores its data, appears in Help,
   has a test that would fail if it broke. docs/review/session-ak/WIRING_AUDIT.md: one line per row: Working / Partly
   working / Not reachable / Stub + evidence. Every non-Working row finished properly by a lane, with a test, before F12.
Q2 Finish the X1 verification and fix every failure at its cause.

G. FINISH DEEPLY
G1 BUILD LIST 2 IN FULL: every remaining COMPETITORS_2.md item (all 21 except #1 #2 #3 #5 #8) in rank order at the
   quality bar. Skip anything needing a server, accounts or sharing (record it). Record only what is truly not
   web-possible or outside the non-negotiables, with the reason.
G2 RELEASE REVIEW COMPLETE: fix every open finding in RELEASE_REVIEW.md (rest of R11, every other open Major, then all
   Minor and Polish), each with a status line and a test where it applies. Then a SECOND fresh read-only reviewer runs
   the same "official 1.0 release" review on the new head (all routes incl. NOVA, Notes and Tasks; Showcase and empty
   start; 390 and 1440 px; three themes) into RELEASE_REVIEW_2.md; fix every Blocker and Major and as many Minor and
   Polish as possible.
G3 THE VISUAL SYSTEM FOR THE WHOLE APP: every existing non-protected page and card (Today's non-protected cards, Goals,
   Habits, Health, Wealth, Insights, Review, Earn, Settings, Help, the ZIGi panel, Journal, Music, Chess, Agenda) gets
   the pillar illustrations in every empty state, the one chart look on every chart, the richer cards and the skeleton
   sheen. Section M then adds the motion layer (Q26 and Q27 are reversed there).
G4 JOURNEYS ON PHONES AND THEMES: journeys 1–3 and 6 also in the phone project (390 px) and in Light and Dark; fix what
   breaks at its cause.
G5 EXPLORATORY TESTING: a fresh agent uses every AK feature as a curious first-time person at 390 and 1440 px (taps
   everything, odd values, back and forth, reloads, offline), logging EXPLORATORY_BUGS.md; each bug fixed at its cause
   with a test. Runs again after N, B and T land (Z2).
G6 Every intermittent still open from the A12 list (incl. market-status socket and WebKit-phone cancelled fetches):
   fixed at its cause or proven gone with repeated runs, recorded.
G7 F10's recorded Lows and Infos fixed unless unsafe or impossible, recorded.
G8 ZIGi and NOVA tools for G1's new features (confirm cards, money never auto-accepted, mock evals and G6 cases).

N. NOVA: YOUR PRIVATE AI COMMAND CENTER (the headline; the most care)
N0 RESEARCH FIRST (docs/research/session-ak/NOVA.md; official docs and the projects' own pages):
 - The personal-Jarvis-dashboard trend: most shared personal AI dashboard/assistant setups (local-first assistants,
   Open WebUI, Jan, Msty, LM Studio, AnythingLLM, home dashboards), what makes them feel magical (orb or face, voice,
   widgets, briefs, the command bar, "it knows my day"), what users complain about (setup pain, privacy, cost,
   forgetting), which patterns fit a PWA.
 - Local models from an HTTPS web app, verified per OS (macOS, Windows, Linux): Ollama (install, `ollama pull`,
   OLLAMA_ORIGINS for this app's origin, service restart), LM Studio (local server and CORS switch), llama.cpp server
   (flags); Chrome's local-network-access permission prompt, Safari and Firefox with http://localhost from HTTPS; which
   small and large open models fit typical RAM/VRAM (8, 16, 32, 64 GB; GPU like RTX 4070–5090) and their licences.
 - Providers ZIGi already supports (lib/ai/adapters.ts: local Ollama and OpenAI-compatible, on-device, Anthropic,
   OpenAI, Gemini, xAI, OpenRouter with PKCE): browser CORS rules and headers, current model names, free tiers and prices
   (for the cost meter).
 - HONESTY: consumer subscriptions (ChatGPT Plus/Pro, Claude Pro/Max, Grok, Gemini Advanced) do NOT include API access
   for third-party apps. Verify on official pages, say it plainly; ways in: a local model (recommended, private, free), a
   free API tier where one exists, a paid API key, or OpenRouter. Never imply a subscription login works.
N1 ONE ENGINE, TWO COMPANIONS (record as a reading):
 - NOVA uses ZIGi's existing engine: adapters, device-only keys in lib/ai/keys.ts, memory (lib/ai/memory.ts), tools,
   confirm cards, pricing, privacy paths, local answers, context packs and budgets. No second key store, memory or tool
   system.
 - ZIGi stays the mascot and in-page companion that knows the page; NOVA is the full-view command center and the
   person's own agent persona (renameable, avatar: the NOVA orb or ZIGi).
 - They TALK TO EACH OTHER AND SHARE DATA: one shared conversation history and memory (what you tell ZIGi, NOVA knows,
   and back; within the same privacy mode and scopes); hand-off both ways ("Continue in NOVA" from ZIGi's chat carries
   the conversation; NOVA's "Ask ZIGi about this page" opens ZIGi on that page with NOVA's question); delegation (NOVA
   hands a page-specific sub-task to ZIGi, which runs it with its page context pack and reports back, shown in NOVA's
   chat as a short two-voice exchange (orb and ZIGi avatar), each step visible, every write still a confirm card); a
   "Duo" view where both appear side by side on NOVA's dashboard when a task uses both. Tests prove shared history,
   hand-offs, delegation (mock model), and nothing crosses a privacy mode or scope boundary.
N2 THE NOVA PAGE: FULL-VIEW DASHBOARD THAT OPENS LIKE A STAR SYSTEM (/app/nova; own weight line; loaded on use)
 - Opening: own page, full-view immersive (the app sidebar collapses into a slim edge; a clear "Exit NOVA" and Esc bring
   it back). First open plays a one-time "system online" sequence: the NOVA star ignites in the centre, orbit rings expand,
   widgets settle onto their orbits one by one, the greeting types in, ~2 s, skippable with any key or tap, never again
   unless replayed in Customize. Reduced motion and Motion Off show the finished dashboard immediately.
 - Layout: a real, usable grid dressed as a star system: the NOVA star/orb at the centre or top (hand-made animated
   SVG/canvas in the nebula palette: breathes idle, ripples listening, swirls thinking, pulses speaking; still under reduced
   motion/Motion Off); widgets as glass panels on faint orbit rings; feature buttons as a dock of planets/moons; a
   starfield/nebula backdrop drifting very slowly, paused when the tab is hidden. Desktop/tablet: wide multi-panel; phones:
   native-app style stacked view with the orb on top, a swipeable widget carousel and the chat as a bottom sheet.
 - The chat (the heart): streaming answers, safe Markdown, code blocks, tool cards, confirm cards with Undo, stop, retry,
   edit last message, a conversation list with search, pinned chats, export a chat as Markdown, voice in/out (N3 step 7),
   the NOVA–ZIGi exchange from N1. Works exactly as well as the ZIGi chatbot (same engine).
 - Quick-access dock (labels and keyboard shortcuts): ZIGi chat, the Checklist, the music player (live now-playing and
   controls in a mini widget), Focus/Pomodoro, Quick add, Agenda, Tasks, Notes capture, Weekly review, Goals, Habits,
   Health, Wealth, Earn (only if chosen), Chess, Settings. Reorderable, hide/show, per device.
 - Live widgets (gallery; add, remove, resize S/M/L, drag onto orbits; each opens its page with a shared-element
   transition): today's orbit progress, the next three items, water, an active focus timer, now playing, the next bill
   and contribution, goal pace, sleep balance, the weather-free "day at a glance" from the person's own data, unread NOVA
   briefs, a notes inbox count, the market watch only if markets chosen. Unknown never shown as zero; empty widgets teach.
 - Status chips: the brain (model, local or cloud), privacy mode, memory on/off, granted scopes, offline. "Test my setup"
   runs every check.
 - Panels: Memory (see, edit, pin, forget, export), Permissions (per-pillar read scopes; Health off by default), Activity
   (every NOVA and ZIGi action with Undo), Workflows, Cost meter (estimated tokens and cost per provider from the pricing
   table, labelled an estimate, daily cap; local models "free, on your device"), model picker per task (chat, briefs,
   workflows).
 - MAKE IT YOURS: layouts (Orbit, Bento, Focus, Minimal), accent choices within the nebula palette, persona name and
   avatar, custom instructions; "Share my NOVA setup" exports layout, widgets, workflows and persona as a small JSON file
   and a setup card image with NO personal data (tested); "Import a setup" loads one.
 - Reachable from the desktop sidebar and tablet rail as a new entry under the existing rules, from the phone top bar /
   More (phone bottom bar PROTECTED, unchanged), the command palette, ⌘/Ctrl + J from any page, a PWA shortcut "NOVA".
   Customize gets "Start page: Today or NOVA" (Today stays default).
 - Works from minute one without any model: on-device local answers and tools ("on-device answers"), and a calm card
   invites building the NOVA brain with the guide. With a model connected it becomes a full assistant.
N3 "BUILD YOUR OWN NOVA": SETUP GUIDE AS A PLANET CHECKLIST (on Earn's Start-here orbit path component and its one-time
   motion, not a copy; /app/nova/setup and a card on NOVA until finished; progress per device; every step has a check):
   1 Meet NOVA (what stays private: everything on the device, keys never leave it, nothing trained on, money never moves).
   2 Privacy mode: Strict (local model only; recommended default), Guarded (cloud allowed; secrets, account numbers,
     addresses, exact amounts and names redacted or rounded before sending, preview of exactly what is sent), Relaxed
     (granted scopes sent as they are, informed choice).
   3 Your brain, local first: (a) RECOMMENDED local model: Ollama, LM Studio, llama.cpp on macOS, Windows, Linux,
     copyable commands one per block, the origin setting for this app, the browser permission prompt explained, model
     picks by RAM/VRAM, a live connection test naming the model found; (b) own API key (Anthropic, OpenAI, Gemini, xAI)
     with where to get it, free tier where it exists, spending-limit advice, a test; (c) OpenRouter sign-in (PKCE);
     (d) on-device where the browser offers it. The honest subscription note.
   4 First conversation: a guided chat showing NOVA knows the person's day (scopes from step 5 previewed).
   5 Data scopes pillar by pillar, with a "What NOVA can see" preview of the exact context pack.
   6 Memory: what NOVA may remember, how to review and forget.
   7 Voice (optional): speech output on the device (Speech Synthesis); speech input with an honest note where the
     browser sends audio to its vendor, on-device recognition where supported, off by default.
   8 Daily briefs: morning brief and evening recap on NOVA (composed on the device; with a cloud model only in Guarded or
     Relaxed; as a notification only if notifications already on).
   9 Workflows: run "Review my week" and save one of your own.
   10 Make it yours: layout, widgets, persona, custom instructions, cost cap, share setup.
   Finishing: a calm celebration (once) and a "NOVA online" badge.
N4 NOVA READS EVERYTHING (with permission): context packs for every pillar and every AK feature (goals and pace, habits
   and strength, health and nutrition, workouts, sleep, measurements, supplements, money log, budgets, bills, purpose
   flow, agenda, tasks, notes, journal, focus, music, chess; Earn and chain only if chosen), within granted scopes,
   existing token budgets and the privacy mode's redaction. "What NOVA can see" shows the exact pack before sending.
N5 NOVA ACTS (proposes; person confirms): tools for every pillar (create a goal or habit bundle, log a habit, meal,
   water, workout, measurement or supplement, plan meals and grocery list, add a note or task, schedule on the agenda,
   start focus or a soundscape, open any page, draft a contribution pre-fill), each a confirm card with Undo. Money never
   auto-accepted; nothing signed, sent or moved by NOVA or ZIGi; chain actions only open the existing review sheet.
N6 BRIEFS AND WORKFLOWS: morning brief and evening recap; editable templates: "Review my week and suggest three
   adjustments", "Turn this journal entry into a goal and habits", "Plan my meals and grocery list for next week",
   "Where did my money go this month?", "What's affecting my sleep?" (Compare explorer), "Prepare my monthly money
   check-in", "Draft my focus plan for tomorrow", "Clear my notes inbox". Each run shows its steps live, asks before
   every write, can be saved as a custom workflow (device-only, exportable, shareable inside "Share my NOVA setup"
   without personal data).
N7 LONG-TERM MEMORY on lib/ai/memory.ts: preferences, decisions, people and context the person approves (proposed,
   accepted), with sources, dates, edit and forget; nothing from health data unless Health is granted; in export,
   restore, erase and the catalog.
N8 ALWAYS OPEN: NOVA as the installed PWA's start page if chosen, the picture-in-picture mini window where lib/ai/pip.ts
   supports it, unread briefs, the global ⌘/Ctrl + J command bar.
N9 SAFETY AND PRIVACY: notes, journal entries, imported files and pasted text are data, never instructions
   (prompt-injection tests); tool loops capped; Guarded mode shows "NOVA is about to send this to <provider>" with the
   redacted text; keys device-only (never synced in plain form, never exported unless asked and warned); CSP adds only
   localhost for local servers plus provider hosts ZIGi already allows (any change TIER 3 (CSP) with egress-policy
   entries and PRIVACY lines); no arbitrary user-entered hosts outside the curated list and localhost (recorded reason:
   CSP stays exact). PRIVACY.md and Help explain NOVA plainly.
N10 TESTS: unit tests for packs, redaction, scopes, shared history, hand-offs and delegation, memory, workflows, cost
   meter, the setup share file (no personal data); browser specs for the opening sequence (and reduced-motion version),
   the dashboard at 390/768/1440 in three themes, widget gallery and drag, the dock, the guide (every planet's check with
   mocked local and cloud servers), streaming, confirm cards and Undo, the start-page setting and the shortcut; a NOVA
   journey in tests/journeys (fresh start → NOVA on-device → guide → mock local model → brief → workflow → ZIGi
   delegation → actions with Undo → share setup → erase). Mock evals and G6 cases for NOVA; REAL_MODEL_TODO.md gets NOVA
   cases for the later local real-model run.

B. NOTES THAT CONNECT TO YOUR LIFE (on the existing Journal; all device-only)
B1 Capture inbox: text, voice (as N3 step 7) or a device-only photo, from the command palette, Quick add, NOVA and a PWA
   shortcut; lands in the inbox to file later.
B2 Daily notes that link themselves to that day's habits, health logs, workouts, money entries and goal progress (a
   "This day" strip, not copied text).
B3 Linked notes: [[links]] with autocomplete to notes, goals and habits; backlinks on every note, goal and habit; a graph
   view in the star-system style (hand-made SVG/canvas; a list view for accessibility and reduced motion).
B4 One search across notes AND the four pillars, from the command palette and NOVA.
B5 Markdown export (ZIP of .md with front-matter, Obsidian-friendly) and Markdown import; "Chat with my notes" through
   NOVA within its scopes and privacy mode.

T. ONE EXECUTION LAYER FOR TODAY (device-only)
T1 Tasks: simple tasks and goal next-actions (title, due date, goal link, priority) mixed with habits on the Agenda's day
   view and as a NOVA widget; the Checklist stays PROTECTED and unchanged.
T2 Calendar import: .ics file import (read-only events shown on the Agenda), next to the .ics export; no account, no server.
T3 Focus: a Pomodoro mode in the existing Focus sessions, started from a task, with the ambient player and a NOVA widget.

M. NEXT-GENERATION MOTION AND DESIGN ACROSS THE WHOLE APP AND THE LANDING (inside PROTECTED; deep navy, white → nebula
   headings, planets and orbits, liquid-glass hover WITHOUT pointer tracking, readable text)
M0 Research (docs/research/session-ak/MOTION_2026.md): what the most admired apps/sites of 2025–2026 use (Apple's Liquid
   Glass, Linear, Arc, Raycast, Vercel, Stripe, Framer sites, Awwwards winners) and which techniques are web-native,
   fast and accessible.
M1 Web-native motion, no new dependency: View Transitions API for page and element transitions (shared elements between
   a card or widget and its detail page); scroll-driven animations (animation-timeline: scroll/view) for gentle reveals
   on long pages and the landing; @property animated gradients for nebula headings and borders; spring-like easing with
   CSS linear(); staggered entrances that play ONCE; number tickers that count up once; animated SVG strokes for charts
   and orbit paths; completion micro-interactions (soft burst, ring fill) that play once. Reverses Q26 and Q27.
M2 Next-gen surfaces: refined liquid glass (backdrop blur, specular edge, subtle noise) on cards, sheets, the dock and the
   command bar; bento grids for Today's non-protected area, NOVA and the pillar overviews; aurora/mesh gradient
   backgrounds drifting very slowly; depth and parallax driven by scroll, never by the pointer; the starfield/nebula
   canvas on NOVA and the landing hero, paused when hidden, off under reduced motion, Motion Off, battery saver where
   detectable, and on low-end devices.
M3 Ambient and attention: the NOVA orb; live activity chips; skeletons with the sheen; optimistic UI with calm
   confirmation; haptics via the Vibration API where supported (Android), respecting mute and Motion Off.
M4 Every motion silent under reduced motion and Motion Off, never blocks input, never loops on content except the NOVA
   orb's slow breathing (stops under reduced motion), never tracks the pointer. Customize gets "Motion: Full / Calm /
   Off" (Calm = entrances only).
M5 Performance: GPU-friendly properties only, content-visibility where safe, no layout thrash; F8 numbers must not get
   worse; measure INP and long tasks on Today, NOVA, Wealth and Earn before and after; record.
M6 The landing (zigoals.app) on top of F7: a NOVA chapter ("Your life data and your own AI, in one private place" /
   "Build your own Jarvis, with a real life to run"), the orb and a short reduced-motion-safe loop of the opening
   sequence, scroll-driven chapter reveals, the starfield hero, a bento feature grid, honest MO6 claims and tests,
   labelled example screens, weight budget held, check:landing green. The owner deploys it.
M7 Theme parity in Nebula, Light (dark islands) and Dark and every Customize option; layout audit at 320, 390, 768, 1024,
   1440 and 1920 px × 3 themes green; the contrast scanner on every new surface.

Z. CLOSE (only after Q, G, N, B, T and M are done and verified)
Z1 Fresh security review (≤ 3 reviewers) of everything after 58224a69, NOVA first: key handling, redaction, scopes, shared
   history and delegation, prompt injection through notes/imports/pasted text, tool confirm paths, the localhost path
   and origins, memory, the share-setup file, capture photos, .ics import, the CSP. Fix every High and Medium; record Lows.
Z2 G5's exploratory agent again on NOVA, Notes, Tasks and the motion pass; fix what it finds.
Z3 A final wiring audit (Q1 again) on the new rows.
Z4 F12 exactly as written in follow-up 1 (full sweep, full gate incl. every journey, PR out of Draft, PR-review Action
   once, CI green, final STATUS entry incl. Q, G, N, B, T, M; correct the X030 slot path noted in AK_RESUME; the owner
   list: food Worker FIRST, then merge and deploy #53 and the verifier; Reown allowed domains; push activation; the
   landing deploy; A13 mainnet check; the Studio-4 swap session; the real-model run incl. NOVA and a real local model),
   and the short report whose preview steps start with "Open NOVA" and the setup guide.
```

Readings: Q28 — N1 (one engine, two companions): NOVA is a full-view surface and persona on ZIGi's existing engine (adapters, device-only keys, memory, tools, confirm cards, pricing, privacy paths, local answers, packs, budgets); there is no second key store, memory or tool system; ZIGi and NOVA share one conversation history and memory within the same privacy mode and scopes. Q29 — F12 waits until Q, G, N, B, T and M are done and verified (Z4).

## Owner follow-up 3 (N11 Hermes Agent, N12 the full-screen NOVA), 1 Nov (pre-approved; worked through without questions)

```text
OWNER MESSAGE 3 TO SESSION AK (1 Nov 2026), pre-approved, no reply needed; continue in auto mode. Two additions to
owner follow-up 2's section N: N11 and N12, with closing rows, in AK_RESUME and the task list, built inside the NOVA lane
at the same quality bar (reachable, wired end to end, unit tests, browser specs, Help, a labelled Showcase example,
empty-start teaching). Everything else in follow-up 2 stays. The owner attached a screenshot of his own dashboard (his
personal "hermes" setup with NOVA at its centre: not committed; described below): the layout reference
for N12, redesigned in ZIGoals' nebula star system (our colours, orbits and type), NEVER copying its branding, names or
wording.

Screenshot description (reference only): a full-screen dark starfield with a diagonal purple nebula band. LEFT panel: a
logo + "PERSONAL INTELLIGENCE", a workspace card with a lock icon, a primary "Company Brain" entry, a "DEPARTMENTS 11"
header with a "Find an agent…" search, a list of sections each with a coloured dot, a count and a "+", and at the bottom
a short signature card ("NEBULA · Your intelligence, in one place") and a gateway status line ("Hermes gateway · 11 of 11
profiles reachable"); a collapse chevron at the top. CENTRE: the orb ("N.O.V.A · STANDBY · CLICK TO SPEAK") in concentric
rings; a local clock and date top centre; top left "Your day", search, workflow and globe buttons; top right a 4×3 grid
of round quick-access buttons; bottom a large command field "What's on your mind, Rey? · Speak to the core, or start a
conversation · ⌘K · →", bottom left "View controls" and "Automatic · best fit" menus, bottom right a 2D/3D toggle. RIGHT
panel: "LIVE TELEMETRY · Behind the intelligence." with a close ×, numbered collapsible sections: 01 Machines (devices
with Online, CPU %, Memory %, installed models count), 02 Voice link (connection, microphone "Off · click to enable",
"Talk to Nova", "Enable Hey Nova" with an explanation), 03 Apps & workspace (a list of links with icons), 04 Models &
usage; a footer "Live from your Mac · Refresh".

N11. HERMES AGENT: CONNECT YOUR OWN AGENT TO NOVA, WITH AN IN-DEPTH GUIDE (a second planet-checklist guide next to
"Build your own NOVA"; aimed at vibe coders and agent builders)
- Research first (docs/research/session-ak/HERMES_AGENT.md; official sources only: github.com/NousResearch/hermes-agent,
  hermes-agent.nousresearch.com/docs, and Open WebUI's "Connect an agent: Hermes Agent" page):
  - what Hermes Agent is (Nous Research's open-source personal agent: tools, skills, memory, model providers, gateways),
    its licence, the platforms it runs on and its install steps per OS;
  - its OpenAI-compatible API server: in ~/.hermes/.env set API_SERVER_ENABLED=true and API_SERVER_KEY=<a strong random
    string the person makes>, optional API_SERVER_PORT (default 8642) and API_SERVER_HOST (default 127.0.0.1); start it
    with `hermes gateway` (it must keep running); base URL http://127.0.0.1:8642/v1; GET /health returns
    {"status":"ok"}; GET /v1/models lists hermes-agent; the key is sent as the bearer API key. Verify each fact against
    the official docs and the source at the current release, and record the version read;
  - BROWSER ACCESS: whether the API server sends CORS headers or has an allowed-origins setting for a web app at
    https://alpha.zigoals.app; Chrome's local-network-access prompt for localhost from an HTTPS page; Safari and Firefox.
    If Hermes offers no CORS option, document the smallest honest local option the person runs on their own machine
    (e.g. a one-line local reverse proxy that adds the header for this one origin), verified, with exact commands per OS.
    Never invent a setting that doesn't exist.
- The connection in the app: a "Hermes Agent" brain type built on the existing OpenAI-compatible local adapter
  (lib/ai/adapters.ts localServer 'openai-compatible'): base URL (default http://127.0.0.1:8642/v1), the key stored
  device-only through lib/ai/keys.ts like every key (never synced in plain form, never exported unless asked and
  warned), a live test that calls /health and /v1/models and names what it found, streaming chat, clear errors for
  "gateway not running", "wrong key", "blocked by the browser (CORS or local-network permission)" with the fix for each.
  localhost only (the CSP stays exact; any CSP change is TIER 3 (CSP) with egress-policy entries and PRIVACY lines).
- Privacy, honestly: Hermes runs on the person's machine but may call a cloud model and use tools. So: a Hermes brain
  counts as Strict only after the person confirms in the guide that their Hermes uses a local model; otherwise NOVA
  treats it as Guarded (redaction and the "about to send" preview); the guide explains that whatever NOVA sends to Hermes
  is then handled by Hermes's own settings, and that ZIGoals never sees, stores or proxies any of it; NOVA never asks
  Hermes to sign, send or move money; any action Hermes suggests that touches ZIGoals comes back as a ZIGoals confirm
  card with Undo.
- NOVA and Hermes together: Hermes as NOVA's brain (the whole chat runs on the person's Hermes), or as a second agent NOVA
  can delegate to ("Ask my Hermes"), shown like the NOVA–ZIGi exchange from N1 with Hermes's own avatar; Hermes appears
  in N12's right panel (gateway reachable, the model it reports, last response time); an optional, person-triggered
  "Give Hermes my ZIGoals summary": NOVA builds a Markdown summary of the scopes the person picks (redacted per the
  privacy mode), shown first, then copied or saved as a file the person drops into Hermes's memory or skills folder
  themselves. Nothing is sent automatically; ZIGoals runs no server Hermes could call.
- The guide "Connect your Hermes Agent" (/app/nova/hermes and a card on NOVA; on Earn's Start-here orbit path component;
  progress per device; every step with a check that verifies it really worked; commands one per copyable block; macOS,
  Windows (incl. WSL if Hermes needs it) and Linux tabs): 1 What Hermes is, what it can do with NOVA, the privacy picture.
  2 Install (official steps; verify `hermes --version`). 3 Choose Hermes's model (local recommended, linking the
  local-model planets; or the person's provider, with the privacy consequence). 4 Turn on its API server (the
  ~/.hermes/.env lines, a strong key generated locally e.g. with openssl, port and host). 5 Start the gateway (`hermes
  gateway`), keep it running (at login per OS, from the official docs if described). 6 Let the browser reach it (the
  CORS/local-proxy step and Chrome's local-network permission, with a live check). 7 Connect it in ZIGoals (base URL and
  key; /health and /v1/models test). 8 Confirm the privacy mode (Strict only if Hermes runs a local model). 9 First run:
  a guided conversation, then delegate one task ("Ask my Hermes to plan my week from my goals"). 10 Go further: the
  ZIGoals summary for Hermes's memory, Hermes skills with NOVA's workflows, links to the official docs and community.
- Tests: the adapter with a mocked Hermes server (health, models, streaming, wrong key, gateway down, CORS failure
  messages), the privacy-mode rule, the delegation exchange, the summary export (only chosen scopes, redacted, nothing
  sent), the guide's checks with mocks, and a Hermes step in the NOVA journey. Help, PRIVACY.md and the landing's NOVA
  chapter mention Hermes Agent with its official name and a link, without implying any partnership.

N12. THE NOVA PAGE USES THE WHOLE SCREEN, WITH HIDEABLE SIDE PANELS (desktop first; refines N2's layout)
- Full screen: NOVA takes the whole browser window: the app's own sidebar, top bar and footer are hidden while NOVA is
  open, and come back with "Exit NOVA" or Esc. A Fullscreen button (Fullscreen API, after a click) fills the display; Esc
  leaves fullscreen first, then NOVA.
- LEFT PANEL (hideable; replaces the app's sidebar while NOVA is open): the person's space at the top (name or "Your
  space", a lock icon showing everything is on this device); a "Your life" entry (the four-pillar overview) and a search
  field "Find a page or agent…"; sections with coloured dots and counts: the pillars and their pages (Goals, Habits,
  Health, Wealth, Journal and Notes, Tasks and Agenda, Focus and Music, Checklist, Review, Earn only if chosen, Chess,
  Settings), each opening its page; "Agents": NOVA, ZIGi and the person's Hermes Agent (if connected), each with a status
  dot; at the bottom a short NOVA signature line and the brain's status ("Local model · 3 models found" or "Hermes
  gateway reachable"). Collapses to a slim icon rail or fully hides (a button and a keyboard shortcut); state remembered
  per device.
- CENTRE (the stage): the NOVA orb in the middle of a slow nebula and starfield (the orb shows NOVA's name and state:
  Standby · click to speak, Listening, Thinking, Speaking; a still under reduced motion and Motion Off); a local clock
  and date top centre; top left "Your day" (the brief), search, workflows and settings buttons; top right a grid of
  quick-access buttons (the dock from N2: Health, ZIGi chat, Checklist, Music, Focus, Notes capture, Quick add, Agenda,
  Review, Customize the view, Fullscreen); at the bottom a large command field "What's on your mind, <name>?" with ⌘K, a
  "View controls" menu (which widgets float on the stage, layout Orbit/Bento/Focus/Minimal) and a model routing menu
  ("Automatic · best fit" or a chosen brain); widgets float on the orbit rings around the orb and can be toggled from
  View controls. The chat opens as a large panel above the command field (or beside the orb on wide screens) and
  collapses back to the field.
- RIGHT PANEL (hideable): "Behind the intelligence", live and honest, collapsible numbered sections: 01 Brains (each
  connected brain with status: local server online/offline; the models Ollama or LM Studio report, and for Ollama the
  loaded models and their memory from its own API; Hermes gateway reachable; a cloud provider configured), and the
  device facts the browser really offers (logical cores, approximate memory where exposed, battery and online state);
  nothing invented, unknown shown as unknown; 02 Voice (speech output on/off, microphone state off until clicked, "Talk
  to NOVA" push to talk; a wake phrase "Hey NOVA" only where on-device speech recognition is available, otherwise not
  offered, with the reason); 03 Your pages and tools (quick links with live counts: habits left today, water to go, the
  next bill, unread briefs, notes in the inbox, tasks due); 04 Models and usage (per brain the requests and estimated
  tokens today, the cost meter (local and Hermes-with-local-model free on your device), the daily cap); 05 Memory and
  scopes (what NOVA remembers and can see, links to the panels from N2); 06 Activity (latest NOVA, ZIGi and Hermes
  actions with Undo). Collapses section by section or hides completely; state remembered per device.
- PHONE: keep it simple; no full phone version. Phones get a minimal NOVA: the orb, the command field and the chat, with
  the quick-access buttons in a sheet; no side panels. Tablets get the desktop layout with the panels hidden by default.
- Motion: the one-time "system online" opening also slides the side panels in; panels open and close with a short motion
  that is instant under reduced motion and Motion Off; nothing tracks the pointer.
- Tests: panel hide/show and remembered state, the full-window takeover and the return of the app's chrome, Fullscreen
  and Esc order, keyboard access to every panel and button, the right panel's honest values with mocked local servers
  (online, offline, unknown), the phone's minimal view, theme parity and the layout audit at 1024, 1440 and 1920 (plus
  390 for the minimal view).
```

## Per-surface quality lines (A22)
Compared with COMPETITORS.md (c); "meets" = the pattern's essentials are there, "gap" = what F1/F6 should raise.
- **Barcode and food (4.1, 4.4, Part 10 #3/#15):** meets — barcode miss falls through to "Add it yourself" with the label
  reader; nutrient report as bars with top sources. Gap: Search/Barcode/Label/Photo are separate folds, not one "+" sheet.
- **Weekly calorie budget, coach card (4.5, #7):** meets — one number (left) and 7 bars; floors respected.
- **Grocery and diet templates (4.6, #20):** meets — check-off, pantry, review before writing; gap: no swipe to tick.
- **Workouts (4.9, #5, #8):** meets — warm-up and plates as small tools, muscle freshness body drawing with words;
  gap: the set table has no greyed "previous" column like Strong/Hevy.
- **Sleep energy curve (#9):** meets — one curve with "likely dip"/"focus window" labels, labelled an estimate.
- **Feeling words, compare, year in pixels (#2, #6, #13):** meets — quadrant grid with words, with/without counts and a
  confidence label; gap: no drag-to-quadrant on phones.
- **Habits: order, compact list, auto rules, schedule in words (5.6, 5.7, #21):** meets Loop's density in compact mode;
  gap: no last-5-days checkboxes per row.
- **Goals: what-if, milestone planner, progress card, bundles (6.x):** meets — pace line and projection labelled; gap:
  goal rows have no mini pace line in the list.
- **Wealth: bills, budgets, target mix, purpose flow, rhythm (7.x):** meets — budget left per category, upcoming bills;
  gap: no single widget dashboard with drill-ins.
- **Money tools: rules, review inbox, buffer days, split, emergency sheet (#1, #10, #11, #17, #22):** meets — "To review
  (n)", "Make a rule" from review; gap: "Create rule" not offered right after a manual recategorisation in the list.
- **FI model, fee drag (#12, #18):** meets — bands and plain summary; labelled models.
- **Review notes, orbit card, share cards, badges, rewards shelf (8.x, #19):** meets — calm, numbers off by default.
- **Notifications card, install card, offline page (Parts 2–3):** meets — permission only after a tap, honest "being
  switched on"; one primary action each.
- **Music page and mix (1d):** meets — presets, timer, volume; Open-in links.
- **Lichess play (Part 9):** meets — accessible board, keyboard and typed moves; phones continue on Lichess.
- **Switch to ZIGoals (A15):** meets — preview before writing, Undo right after.
- **Tour (A19):** meets — 7 stops, never modal, Show me links.
F1's review (docs/review/session-ak/RELEASE_REVIEW.md) and the F6 pass refine these lines; each gap above is tracked there.

## Closing table (every item in the brief)
Outcomes: **Built** (commit, tests) · **Already done** (evidence) · **Finished/polished** (existed, now complete; commit, tests) · **Not possible** (evidence and reason) · **Recorded** (outside AK by the owner's list). Rows are completed as the parts land.

| Item | Outcome | Where | Evidence |
|---|---|---|---|
| Part 0 records, ADR-036, resume file, Draft PR, frozen readers #37–#52 | Built | `9c5d7ee6` | scripts/frozen-readers.mjs #52 |
| Research: COMPETITORS, EXCHANGES_NEXT, LICENCES, WALLETS, FORMATS | Built | `e417ca9b` | docs/research/session-ak/ |
| 1a WalletConnect (Reown id, CSP, QR, deep links, A7 honesty, A8 QR, A9 copy) | Built | `75ed3a6d`, `249bf461` | lib/qr tests; walletconnect.test, csp-compose.test, public-safety.test |
| AFL9 Keplr Mobile staking over WalletConnect (review sheet only) | Built; reachable from the Staking panel since the Q1 audit found it was not (connect over a staking pairing without the extension) | `f9ccc351`, `4a4cbfc9`, `a9e8615d` | lib/staking/walletconnect-signer.test.ts, walletconnect-connect.test.ts; journey 7b (one cosmos_signDirect after the press, testnet double only); staking guard holds |
| 1b food Worker: FDC after OFF, FOOD_LOOKUP binding, A10 deploy order | Built | `8b0ae98c`, `f3ac1031`, `74902dcd` | food-lookup Worker tests; check-deployment-configs prints the order; packaged pin `8c718525` |
| 1c EU generic library (CIQUAL, CoFID; Fineli waits on review/ak-food-data, A11) | Built (Fineli: waiting) | `f3ac1031` | public/food-generic manifest; licences in LICENCES.json |
| 1d music for everyone (mix, links, BYO Spotify, /app/music, focus and wind-down hooks) | Built | `95952388`, `9c902707` | lib/audio tests; music-mix key |
| 1e PR review | Moved to Part 16 (A21) | — | — |
| Part 2 push (device Worker, snapshot A1, actions, A2 always a notification, A3 one path, A5 sizing, Q12, Q15) | Built (switched off until the owner's activation) | `fa38be77`, `f9e103f7`, `28da0157` | scripts/run11/push-device.test.mjs; lib/notify tests; pwa-ak.spec |
| Part 3 PWA (A4 caching, A18 assets, install, update prompt, offline queue) | Built | `afce4a4f`, `02ec25f2` | tests/pwa-ak.spec.ts; install-manifest pin |
| A6 storage headroom | Built | `883d1dcb` | lib/storage-headroom.test.ts |
| 4.1 barcode (history, library-first, amounts, not-found draft) | Built | `7d435846` | lib/food-scans tests |
| 4.2 meal photo (honest copy, opt-in device photo, exported as files) | Built | `7d435846` | lib/meal-estimates/photos.test.ts |
| 4.3 voice / natural language | Already done (polish in Part 11) | existing J10 multi-item logging | — |
| 4.4 micronutrients (7 extras, report, top sources) | Built | `7d435846` | nutrition-ak.test.ts |
| 4.5 weekly coach card | Finished | `7d435846` | health-aa.test.ts |
| 4.6 planner and grocery | Finished | `7d435846` | lib/grocery tests |
| 4.7 wearables (FIT, Strava ZIP; Garmin via FIT, Q11) | Built | `e7cecde0` | lib/import/fit tests, strava.test.ts |
| 4.8 recipe polish | Finished | `7d435846` | recipe-match tests |
| 4.9 training and sleep (supersets, RPE, plates, rest, PRs, volume, wake consistency) | Built | `e7cecde0` | lib/workouts tests; lib/sleep tests |
| A15 Switch to ZIGoals: Strong, Hevy, Daylio, Habitica, YNAB (Bearable: not documented, recorded) | Built | `e7cecde0`, `322096dc` | importer tests; tests/switch-more-ak.spec.ts |
| 5.1–5.4 habits (due/optional, skip reasons, Strength, routine full screen and share) | Built / Finished | `ca810a31`, `a74c33af` | habits-order and routines tests |
| 5.5 J3 (Q7, M31 holds) | Already done | ADR-033 M31 | — |
| 5.6 auto-complete rules | Built | `ca810a31`, `a74c33af` | lib/auto-rules tests |
| 5.7 reorder, compact list | Built | `ca810a31`, `a74c33af` | compact-toggle.test.ts |
| 6.1 goal bundles from Quick add | Built | `ca810a31`, `a74c33af` | nl-bundle-wiring.test.ts |
| 6.2 30-day pace (Q14) and what-if | Built | `ca810a31`, `a74c33af` | what-if tests |
| 6.3 progress card | Built | `ca810a31`, `a74c33af` | progress-card tests |
| 6.4 milestone templates, habit links | Built | `ca810a31`, `a74c33af` | milestone-suggest |
| 6.6 household | Recorded (ADR only, D-decision) | — | — |
| 7.1 CSV templates, saved mappings; A14 CAMT.053, OFX, MT940 | Built | `92b94a8f`, `5074567f` | lib/bankfiles tests; money-csv-import.test.ts |
| 7.2 exchange auto-refresh | Built | `92b94a8f`, `5074567f` | wiring.test.ts |
| 7.3 bills with push | Built | `92b94a8f`, `5074567f`, `883d1dcb` | lib/bills tests |
| 7.4 target mix and drift | Built | `92b94a8f`, `5074567f` | lib/allocation tests |
| 7.5 purpose flow | Built | `92b94a8f`, `5074567f` | lib/allocation tests |
| 7.6 contribution rhythm (pre-fill only) | Built | `92b94a8f`, `5074567f` | wiring.test.ts |
| 7.7 category and month budgets | Built | `92b94a8f`, `5074567f` | lib/budgets tests |
| 8.8 export bridges (A16) | Built | `3110c81f` | lib/export/bridges tests |
| 8.9 test restore, backup reminder | Built | `3110c81f` | test-restore, backup-reminder tests; journey 6 (Test a backup) |
| 8.10 AFL8 Checklist extras section | Built (effective at the owner's private-sync redeploy) | `e7d9951e` | extras-two-device, extras-keyspace, private-account tests |
| Part 9 Lichess Board play and daily puzzle | Built | `1f84a28e` | lib/chess tests; tests/chess-play-ak.spec.ts |
| Part 13 Studio-4 art swap | Done: moved out by owner follow-up 1 (preparation F11), restored by the owner in follow-up 5 and done as P13-R1…R7 (delivery verified, imported, wired, the 2× set lazy, X030 on the Checklist cheer, optical centre re-measured, Known limitations and the demo step) | `59d2cfe4`, `d5177683` … `01b43f6f` | the P13-R1…R7 rows (follow-up 5: Part 13 restored); STUDIO4_RECEIPT.md |
| A13 mainnet v6 day | Recorded: owner check after the deploy (owner follow-up 1) | — | the app accepts v6.0 on zigchain-1 (ADR-035) |
| F0 finish what is open | Built: first-Monday schedules (optional `monthWeekday`), visible sync status, 6.5 progress toast, 7.8, M42, H113, M4, missing tests ZI4/ZI8/ZI9/ZI14/G15/landing skip link, four intermittents at their cause (zigi-memory:188 navigation, zigi-knock FIRST, zigi-memory-af about:blank, zigi-accept-correct page clock); M8, market-status socket and WebKit-phone fetches recorded (no recurrence in 12 runs); AFL1 and RM4 re-verified (`a368a715`). Recorded, not built: AFL4's prefix-free practice-badge memo (class c/d: a new signed memo; AK signs nothing new). AFL3 not re-verified this session (recorded in the A12 table) | `d2105402`, `a368a715` | unit tests per item; frozen fixture monthWeekday |
| F1 release-readiness review | Built: docs/review/session-ak/RELEASE_REVIEW.md (1 Blocker, 12 Major, 11 Minor, 7 Polish). Fixed: R1 (Blocker), R6, R7, R12 (`1800da09`); R2, R3, R4, R5, R8, R14, R22 (`9ccb860a`, verifier `271420e7`); R9, R10, R15 and part of R11 (`a15ea685`; Today's and Settings' further deferrals recorded in SESSION_AK_F8.md); R28 (the PROTECTED hero's "Onchain" pillar line) left for the owner | `1800da09` | goals-best-aa R1 spec; install-pages test; onboarding spec |
| F2 full app testing (journeys) | Built: 11 journeys (tests/journeys, @journey, no real network) pass; 8 app bugs and 1 owner question in docs/review/session-ak/JOURNEY_BUGS.md, each with a named test.fixme — fixed in lane JB, which turns each back into a test | `a41ae994` | tests/journeys/j01–j11 |
| F3 competitor research round 2 | Built: BUILD list 2 (21 items) — #2 to F4, #1 #3 #5 #8 to lane B2a, the rest in later waves or recorded | `8c5f2d1a` | docs/research/session-ak/COMPETITORS_2.md |
| F4 ZIGChain ecosystem, deeper | Built, read-only: staking clarity, validator spread, token check (/api/chain/denom, no new host), governance summaries and vote reminders, practice round, ecosystem status; EVM balances not built (no live mainnet RPC; testnet RPC behind a challenge) | `920de5bf` | lib/zigchain-eco tests (45 files with staking guards) |
| F5 new features | Built: health and habits (`c8afc7f1`), goals and money, cross-pillar (agenda + .ics, Wrapped, search actions) (`d2105402`); BUILD list 2 #1 #3 #5 #8 (`d2105402`) | `c8afc7f1`, `d2105402` | unit tests per feature; 8 new keys in every registry |
| F6 visual upgrade | Built (helper part): pillar illustrations in the new surfaces' empty states, one chart look on the new charts, skeleton sheen, richer cards with pillar edges, safe areas in Wrapped; page transitions designed, not switched on (Q26; switched on later in M1, `f88b8ab8`); micro-interactions as they are (Q27, reversed in M1) | `a2e74f32`, themes `8b0608f1` | lib/illustrations/pillar-art.test.ts; theme sheets regenerated |
| F7 landing visual refresh | Built (owner deploys): hero, Example data labels, offline/install mockups, Private by design, Switch to ZIGoals, FAQ; phone weight lower, desktop within 6 MB | `7cadc0e5` | scripts/landing-f7-visual.test.mjs; check:landing |
| F8 performance and accessibility | Built: per-name layouts batched in the path engine (Earn 2.9 s → 0.17 s), ZIGi path search bounded, Earn sections on view, Quick add preloaded; axe clean on every new surface in three themes; proposals recorded | `a15ea685`, `0e264929` | docs/performance/SESSION_AK_F8.md |
| F9 ZIGi for everything new | Built: five confirm cards (never auto-accepted), five read-only tools, on-device answers; Today's prompt unchanged; every page ≤ 9,000 tokens | `8f6e7629` | lib/ai tests (1,201); budget-ak.test.ts; evals ak-f9 and G6 |
| F10 security delta review | Built: three fresh reviewers on 9401dcbb..HEAD — no High; 1 Medium fixed (the agenda's unbonding titles); 11 Low (8 fixed, 3 recorded); 6 Info (3 fixed, 3 recorded) | `6e049943` | docs/security/review-2026-10/SESSION_AK_F10.md; unbonding-privacy, denoms, guard, notify tests |
| F11 Studio-4 preparation complete and proven | Built: every Part 12 slot verified wired (X030 cheer unused by the PROTECTED Checklist until the owner says yes); dry run of studio4-deliver/ through the importer; runbook | `a845d339` | scripts/zigi/studio4-dry-run.test.mjs (17 tests); docs/handoff/STUDIO4_SWAP_RUNBOOK.md |
| F12 finish | Moved into Z4 (owner follow-up 2) | — | — |
| Q1 Wiring audit of every Built/Finished row (fresh read-only agent; WIRING_AUDIT.md); every non-Working row finished | Built: audit 52 Working / 43 Partly; Q1F added 31 browser tests on the UI path and fixed Quick add's goal bundle, buffer days and the doubled import title; AFL9 (journey 7b) moves to lane W | `eea0e358`, `6c44dc3e` | 29/31 desktop on the pre-fix build; rerun on 6c44dc3e |
| Q2 Finish the X1 verification; fix every failure at its cause | Done: the X1 verification completed; every failure fixed at its cause or explained | `7d5d5114`, `18ee388b`, `fd5ae70f` | the X1 spec set green on the production build |
| G1 BUILD list 2 in full (all 21 except #1 #2 #3 #5 #8), rank order | Built: G1a #4, #12, #13, #14, #15, #16; G1b #6, #7, #9, #10, #11, #17, #18, #19; #21 Was this useful? (lead); #20 A chat that isn't kept (lane WC, `8726fa0a`). First browser run fixed: Select keeps its name, the Showcase's out-of-range lab value | `cf3cf2e1`, `f014ea65`, `21536fe6`, `cc5a1eb5`, `8726fa0a` | unit; g1a-*, g1b-*, g1-insight-feedback specs; lib/ai/unkept-chat.test.ts, tests/unkept-chat-ak.spec.ts |
| G2 Release review complete; second fresh review (RELEASE_REVIEW_2.md); fix Blockers/Majors and as many Minor/Polish as possible | Done: the first review completed (54200bff); a second fresh 1.0 review (RELEASE_REVIEW_2.md: 1 Blocker, 8 Major, 12 Minor, 4 Polish); the Blocker and every Major fixed except R2-7 (owner decision: the pinned banner sentence) and the desktop sidebar part of R2-10 (owner decision: protected fit); R2-15's empty quick counters left for the owner (they feed the protected Checklist path); R2-24 not reproduced | `54200bff`, `e42444bd`, `52bd5286`, `981f6537`, `0ef32f0d`, `15c1e159`, `fa5643ce`, `2519cf3d`, `1d6902be` | specs per finding; pillar-phone-length (Health 6.2/7.4, Wealth 5.1/9.1 screens) |
| G3 The visual system across every non-protected page and card | Done: pillar art in empty states (EmptyState default, ArtNote), the chart look on 15 charts, the skeleton sheen, richer cards; R30 fixed; Health's own empty Foods, Recipes and Weight history lists, left at first (shared file), now carry the pillar art too (ArtNote, after WIRING_AUDIT_3) | `21f404ef`, `b552ba14`, `b63d568a` | unit 55/55; theme sheets regenerated |
| G4 Journeys 1–3 and 6 on the phone project and in Light and Dark | Done: journeys 1–3 and 6 on desktop and phone × Nebula, Light, Dark (24 runs, one set of steps); found and fixed a lost habit tick on an immediate leave (TIER 3 storage) | `8ffd9b1e`, `e4a5b1c9` | 24/24 on the served build; tests/habit-paint-first.spec.ts |
| G5 Exploratory testing by a fresh agent (EXPLORATORY_BUGS.md); fixes with tests | Done: a fresh exploratory tester (EXPLORATORY_BUGS.md: 1 Blocker, 1 Major, 10 Minor, 7 Polish); 18 fixed at their cause, EX-17 no longer reproduces; nothing left the device | `09c216e9` | tests/exploratory-exf.spec.ts, nova-dashboard EX-1 viewport checks |
| G6 Every open A12 intermittent fixed or proven gone | Done for every intermittent seen this session: note-lists-arrive (gated list), nova-evals and emergency-sheet timing, motion-m's burst race, the j07 Verify double; NOVA Memory's Remember (2 of 6) uses the project's AF16 fill-until-held pattern — re-checked by C3's two full runs | `dee2a817`, `a9e8615d`, `b2fec2e8`, `15c1e159` | C3 (two full runs) |
| G7 F10's recorded Lows and Infos fixed unless unsafe or impossible | Built: R1-F5 CJK recovery words, R1-F6 everyday lists, R1-F7 hidden in what leaves (engine hook), R1-F9 refuse past 500, R2-I4 summaries; R3-F4 recorded (Q25) | `06e86e00`, `cf3cf2e1` | unit; vendored BIP-39 lists checked word for word |
| G8 ZIGi and NOVA tools for G1's new features | Built: read tools your_numbers, cycle_log, your_scales, cash_forecast, money_selection; cards log-blood-pressure, rate-scale, move-task, amount calculator; local answers; never auto-accepted | `2bcb4c8a` | unit 1324; 16 G6 cases; 28-case corpus |
| N0 NOVA research (docs/research/session-ak/NOVA.md) | Built: the trend and 10 takeaways, local models per OS, browser localhost rules, models by memory, provider CORS and prices, the subscription verdict (no consumer plan works; sources) | `80d7c1af` | sources cited, read 1 Nov 2026 |
| N1 One engine, two companions: shared history and memory, hand-offs, delegation, Duo view (Q28) | Built: one engine; shared history, hand-offs, delegation in two voices, the bridge record | `cf3cf2e1` | unit 1290; nova-chat spec on 6c44dc3e |
| N2 The NOVA page /app/nova: full-view dashboard, opening sequence, orb, chat, dock, widgets, chips, panels, make it yours, share setup, entry points | Built, except the widget → page morph (recorded): /app/nova stage, opening, orb, dock, widgets, chips, panels, make it yours, share setup, ⌘/Ctrl+J, start on NOVA; each widget opens its page without a shared-element transition (every pillar page loads its records after mounting, so each would need the goal morph's first-frame hand-off; recorded in SESSION_AK_MOTION.md M1 "Not built" and STATUS Known limitations) | `cf3cf2e1`, `82fde1c7` | nova-dashboard spec on 6c44dc3e; p1-nova-make, p1-nova-live, p3-nova-polish specs |
| N3 Build your own NOVA: the setup guide as a planet checklist (10 steps with checks) | Built: Build your own NOVA, 10 planets with live checks | `cf3cf2e1` | nova-setup spec on 6c44dc3e |
| N4 NOVA reads everything (with permission): context packs, What NOVA can see | Built: buildNovaPack within 8 Permissions scopes; What NOVA can see is the exact pack | `cf3cf2e1` | unit |
| N5 NOVA acts: confirm cards with Undo for every pillar; money never auto-accepted | Built: confirm cards with Undo for every pillar (incl. device-record Undo, file-note, add-task); pasted text never auto-accepted; money never | `cf3cf2e1` | unit |
| N6 Briefs and workflows (8 templates; custom workflows) | Built: briefs and 8 workflow templates plus custom ones | `cf3cf2e1` | nova-workflows spec on 6c44dc3e |
| N7 Long-term memory on lib/ai/memory.ts | Built: memory kinds (people, decisions, sources, dates), pinned, from, about | `cf3cf2e1` | unit; frozen fixtures |
| N8 Always open: start page, picture-in-picture, unread briefs, ⌘/Ctrl + J | Built: start on NOVA, ⌘/Ctrl+J command bar, PWA shortcut, unread briefs | `cf3cf2e1` | install-manifest spec |
| N9 Safety and privacy: injection tests, loop caps, Guarded preview, keys device-only, exact CSP | Built: privacy modes in guardRequest, injection tests, loop caps, Guarded preview, keys device-only; CSP unchanged (localhost already allowed) | `cf3cf2e1` | unit (privacy-cross-path, nova-injection) |
| N10 Tests: units, specs, NOVA journey, evals, REAL_MODEL_TODO | Built: units, specs, evals, REAL_MODEL_TODO NOVA cases. The NOVA journey (`tests/journeys/j12-nova.spec.ts:79`) covers its core: first planets, on-device answers, a MOCK local brain, a card with Undo, a MOCK Hermes, Permissions. The other journey steps are covered by their own specs, not inside j12: brief `tests/nova-workflows.spec.ts:146`; a workflow run `tests/nova-workflows.spec.ts:53`; ZIGi delegation `tests/nova-chat.spec.ts:132` (the Duo `tests/nova-wa.spec.ts:41`); Share my NOVA setup `tests/nova-dashboard.spec.ts:162`. Erase has no NOVA-specific browser spec: journey 6 checks that every key and database is gone after Erase everything (`tests/journeys/j06-data-safety.spec.ts:110`, not after a NOVA session), and `lib/ak-device-keys.test.ts:58` checks that NOVA's six keys go with the erase | `cf3cf2e1` | browser run on 6c44dc3e; the specs named |
| N11 Hermes Agent: research (HERMES_AGENT.md), the Hermes brain on the OpenAI-compatible adapter, privacy rule, delegation, the ZIGoals summary, the 10-step guide /app/nova/hermes | Built: HERMES_AGENT.md from official sources, the Hermes brain, Strict only when confirmed local, Ask my Hermes, the summary file, the 10-step guide | `cf3cf2e1` | nova-hermes spec on 6c44dc3e |
| N12 The NOVA page takes the whole screen: hideable left panel (pages, agents, brain status), the stage (orb, clock, dock grid, command field, view controls, model routing), hideable right panel "Behind the intelligence" (01–06), Fullscreen, minimal phone view | Built: full window, hideable left and right panels (01–06), Fullscreen with Esc order, minimal phone view | `cf3cf2e1` | nova-dashboard spec at 1024/1440/1920 and 390 |
| B1 Capture inbox (text, voice, device-only photo) | Built | `1f9a7f23` | notes spec |
| B2 Daily notes with a This day strip | Built | `1f9a7f23` | notes spec |
| B3 Linked notes, backlinks, graph view (and list view) | Built | `1f9a7f23` | notes spec |
| B4 One search across notes and the four pillars | Built | `1f9a7f23` | notes spec |
| B5 Markdown export (ZIP) and import; Chat with my notes | Built | `1f9a7f23` | notes spec |
| T1 Tasks and goal next-actions on the Agenda and as a NOVA widget | Built | `1f9a7f23` | tasks-time spec |
| T2 Calendar .ics import (read-only events on the Agenda) | Built | `1f9a7f23` | tasks-time spec |
| T3 Pomodoro in Focus sessions, from a task, with the ambient player | Built; bell and breaks added by G1 #15 | `1f9a7f23`, `cf3cf2e1` | tasks-time, g1a-focus-rounds specs |
| M0 Motion research (MOTION_2026.md) | Built: support tables, recipes, accessibility and performance rules, a Full / Calm / Off plan | `80d7c1af` | sources cited |
| M1 Web-native motion (View Transitions, scroll-driven, @property, linear(), once-only entrances, tickers, strokes, micro-interactions; reverses Q26 and Q27) | Built: view transitions (Full fade+rise, Calm crossfade, none under Off), once-only reveals, chart strokes, ticker, completion moment; Q26/Q27 reversed; one shared-element morph built: a goal card's title into the goal page's heading, Full motion only (lane WC); the NOVA widget → page morph not built (recorded: SESSION_AK_MOTION.md M1 "Not built"; STATUS Known limitations) | `f88b8ab8`, `8726fa0a` | unit 25; motion-m spec; lib/motion/goal-morph.test.ts, tests/goal-morph-ak.spec.ts |
| M2 Next-gen surfaces (liquid glass, bento, aurora, scroll depth, starfield canvas) | Built: refined glass (on NOVA's dock and command bar), aurora (behind NOVA's stars), bento on the landing and NOVA's Bento layout, starfield moves with scroll. Not built (recorded): the bento grid for Today's non-protected area and the pillar overviews — Today's widget kinds are a stored format (`lib/dashboard-settings.ts`) and the area sits next to the PROTECTED hero; STATUS Known limitations | `f88b8ab8`, `8726fa0a` | unit; p1-nova-make spec ("M2 on NOVA") |
| M3 Ambient and attention (orb, activity chips, skeletons, optimistic UI, haptics) | Built: NOVA's Running now chips (P1: one per thing running on the device, with its time and a link), completion ring and sparks, haptics on the Checklist's vibration switch, skeleton sheen (G3); an app-wide running chip in the PROTECTED shell not built (recorded in SESSION_AK_MOTION.md M3) | `f88b8ab8`, `21f404ef`, `82fde1c7` | motion-m spec; lib/nova/live-activity.test.ts, tests/p1-nova-live.spec.ts |
| M4 Motion rules and Customize Motion: Full / Calm / Off | Built: Customize → Motion: Full / Calm / Off (stored format additive); JS loops under Calm in lane FU | `f88b8ab8` | unit |
| M5 Performance before/after (INP, long tasks on Today, NOVA, Wealth, Earn) | Done (measured in P8): before (Today, Wealth, Earn at 390 px, CPU 4×) and after (Today, NOVA, Wealth, Earn and NOVA's opening); the regressions fixed at their cause (NOVA's opening clock; :has() invalidation and the resting-spot scan): Today scroll TBT 991 → 23 ms, Earn scroll 260 → 30 ms, Earn load 5001 → 3899 ms (inside the before range; accepted, owner decision 6) | `5ed28b27`, `e123fe36`, `8ce89709` | docs/performance/SESSION_AK_MOTION.md (M5 / P8, P8b); scratchpad m5/before.json |
| M6 The landing: NOVA chapter, orb loop, scroll reveals, starfield hero, bento grid | Built: the landing's NOVA chapter, labelled example, scroll reveals, bento; first view 257,930 / 260,000 B | `f88b8ab8` | check:landing, landing-nova-m6 tests |
| M7 Theme parity, layout audit 6 widths × 3 themes, contrast scanner | Done: 288 states on the new routes and the existing routes at 390 × 3 themes; touch targets, card shades in Light, pillar art parity fixed; recorded for the owner: gradient words on PROTECTED surfaces scored by the weakest-stop rule | `00f3a69d`, `a5486a76` | layout audit, parity and contrast runners extended to the new routes |
| Z1 Fresh security review of everything after 58224a69, NOVA first | Done: three fresh reviews (Z1A NOVA/AI 1 High 4 Medium 7 Low; Z1B storage/parsers 3 Medium 3 Low; Z1C wallet/CSP/motion/PWA 4 Low); every High and Medium fixed with tests, most Lows fixed, the rest recorded with reasons | `e0f6d56a`, `d35acc52`, `3f5554dc`, `a68e23b6` | docs/review/session-ak/Z1{A,B,C}_SECURITY.md |
| Z2 Exploratory testing again on NOVA, Notes, Tasks and motion | Done with G5 (the same fresh pass covered NOVA, Notes, Tasks and motion: Off, Calm and reduced motion left nothing animating) | `09c216e9` | EXPLORATORY_BUGS.md |
| Z3 Final wiring audit on the new rows | Done: WIRING_AUDIT_2 (57 Working, 25 Partly, 1 Not reachable) and every gap closed by lanes WA, WB, WC and P1 (status after P1: 76 Working, 7 Partly with owners, 0 Not reachable); the final audit of every row is C2 (WIRING_AUDIT_3, `894d37dd`), after which the leftovers are recorded in their rows (N2/M1 widget morph, M2 Today bento, N10 journey steps in their own specs) and R2-10 stays an owner decision | `bcef9bff`, `8726fa0a`, `c27d0f75`, `82fde1c7` | WIRING_AUDIT_2.md "Status after P1" |
| Z4 F12 as written in follow-up 1, with the report starting "Open NOVA" | Done: F12 sweep and gate on the final product head (STATUS Evidence), the final STATUS entry, the PR out of Draft (the PR-review Action once), CI on the final head, the report starting "Open NOVA" with the demo tour linked | the final STATUS commit | STATUS (Session AK) |
| 5.1 schedules: "first Monday of the month" | Built: "first Monday of the month" schedules | `d2105402` | lib/habit-month-weekday/rule.ts and its tests |
| 5.7 time-of-day sections (COMPETITORS #23) | Already done | components/habits/habit-sections.tsx (Session AA) | habits-aa specs |
| 6.5 cross-pillar progress toast | Built: the cross-pillar progress line after a contribution | `d2105402` | lib/progress-toast/moved.ts; Help ak-progress-toast |
| 7.8 Wealth polish | Built: layout fixes (`efdd361e`); the rest in F0 (Bills and Budgets carry the Showcase tag and status lines) | `efdd361e`, `d2105402` | layout audit 320 px |
| 8.1 unified weekly Life review in /app/review | Built ("At a glance" per pillar in the existing Week/Month review; Today's week card links to it) | `a56f9d18` | lib/review-unified tests |
| 8.2 daily orbit card | Built | `a56f9d18` | lib/orbit-card tests; showcase-today-aa.spec |
| 8.3 weekly ZIGi insight | Built (deterministic local note in the review) | `a56f9d18` | lib/insight-notes tests |
| 8.4 monthly balance note | Built | `a56f9d18` | lib/insight-notes tests |
| 8.5 one share-card system | Built | `a56f9d18` | lib/share-cards tests |
| 8.6 badges off by default; Checklist no-XP pinned | Built | `a56f9d18` | lib/game/badges-setting.test.ts |
| 8.7 point-and-tell (A17) | Built: the existing Point & tell records role + developer name, never visible text | `165b495d` | lib/point-tell tests; point-tell.spec |
| 8.9 a visible sync status | Built: a visible sync status | `d2105402` | components/workspace-status.tsx |
| Notifications card "being switched on" while push is off | Already done | `f9e103f7` | tests/pwa-ak.spec.ts ("Notifications are being switched on…") |
| Part 10 #1 transaction rules | Built | `d3ad9fdf` | lib/money-rules tests |
| Part 10 #2 "does X affect Y?" | Built | `e12ec91b` | lib/compare tests |
| Part 10 #3 nutrition-label scan | Built | `0dd757d1` | lib/label-scan tests |
| Part 10 #4 top sources of a nutrient | Built | `7d435846` | nutrition-ak.test.ts |
| Part 10 #5 warm-up calculator | Built (Part 4.9) | `e7cecde0` | lib/workouts/depth tests (warmupRamp) |
| Part 10 #6 mood words | Built | `e12ec91b` | lib/mood-words tests |
| Part 10 #7 weekly calorie budget view | Built | `7d435846` | nutrition-ak.test.ts |
| Part 10 #8 muscle freshness | Built | `0dd757d1` | lib/muscle-freshness tests |
| Part 10 #9 energy curve | Built | `e12ec91b` | lib/energy-curve tests |
| Part 10 #10 review inbox | Built | `d3ad9fdf` | lib/money-review tests |
| Part 10 #11 buffer days | Built | `d3ad9fdf` | lib/buffer-days tests |
| Part 10 #12 financial-independence model | Built (a calculator tool, "a model, not advice") | `d3ad9fdf` | lib/fi-model tests |
| Part 10 #13 year in pixels | Built | `e12ec91b` | lib/year-pixels tests |
| Part 10 #14 report for a visit | Built | `e12ec91b` | lib/clinician-report tests |
| Part 10 #15 Nutri-Score (off by default) | Built | `0dd757d1` | food-lookup-route test (grade=1 gate) |
| Part 10 #16 export to Loop | Built (8.8) | `3110c81f` | lib/export/bridges tests |
| Part 10 #17 family emergency sheet | Built; detector hardened in Part 15 | `d3ad9fdf`, `fd074085` | lib/emergency-sheet tests |
| Part 10 #18 fee drag | Built | `d3ad9fdf` | lib/fee-drag tests |
| Part 10 #19 rewards shelf | Built | `a56f9d18` | lib/rewards-shelf tests |
| Part 10 #20 diet templates | Built | `0dd757d1` | lib/diet-templates tests |
| Part 10 #21 recurrence phrase box | Built | `0dd757d1` | lib/recurrence-phrase tests |
| Part 10 #22 split an entry | Built | `6d0f4f38` | lib/money-split tests |
| Part 10 #23 time-of-day sections | Already done (see 5.7) | — | — |
| Part 11 visual, layout audit, A19 tour | Done: tour `44a44fe2`, layout fixes `efdd361e`; the full visual and layout pass landed in F6 (`a2e74f32`), G3 (`21f404ef`, `b63d568a`) and M7's layout audit (`00f3a69d`). The two A12 rows routed here, LA6 D-196 and AF15 parts 2 and 3, are recorded, not done, with their reasons (A12 table) | `44a44fe2`, `efdd361e`, `a2e74f32`, `21f404ef`, `00f3a69d` | lib/tour tests; help-page, whats-new specs; layout audit runners |
| Part 12 ZIGi tools and Studio-4 preparation | Built | `14287040`, `82343a53`, `768d383d` | lib/ai AK tests, G6 cases; lib/zigi-studio4 tests |
| Part 14 leftovers, verifier, docs, landing | Done: verifier stage 11 `d80a1d0d`; Help/What's new/limitations `44a44fe2`; landing `ac6c2d86`; PRIVACY lines; the leftovers landed in F0 (`d2105402`: the knock reminders' zone, H113, the missing tests, the intermittents; `a368a715`: AFL1 and RM4 re-verified). Recorded, not built: AFL4's practice-badge memo (class c/d: a new signed memo; AK signs nothing new). AFL3 not re-verified this session (A12 table) | `d80a1d0d`, `44a44fe2`, `ac6c2d86`, `d2105402`, `a368a715` | verifier tests; help-page spec; landing-ak-claims test |
| Part 15 security review (RM12) | Built: no High; 6 Medium and 14 Low fixed | `2e27d8c3`, `fd074085`, `bafa240c`, `9401dcbb` | docs/security/review-2026-10/SESSION_AK_RM12.md |
| Part 16 finish | Done (Z4): sweeps, the gate, the PR out of Draft, the STATUS entry as the final commit | the final STATUS commit | STATUS (Session AK) |
| A1 notification snapshot and action queue | Built | `f9e103f7` | lib/notify tests |
| A2 every push shows a notification; exact wake list | Built | `f9e103f7` | sw tests; pwa-ak.spec |
| A3 one push path; subscription survives | Built | `f9e103f7` | push-reminders/pwa-ak specs |
| A4 caching rules; Erase clears caches | Built; hardened in Part 15 | `afce4a4f`, `2e27d8c3` | lib/notify sw tests; pwa-ak.spec |
| A5 free-plan sizing | Built; re-sized in Part 15 | `28da0157`, `2e27d8c3` | PUSH_PUBLIC_ALPHA.md |
| A6 storage headroom | Built | `883d1dcb` | storage-headroom.test.ts |
| A7 wallet honesty | Built | `249bf461`, `e417ca9b` | WALLETS.md; walletconnect tests |
| A8 QR v1–20 | Built | `75ed3a6d` | lib/qr tests |
| A9 Reown allowed domains | Built (copy); owner follow-up | `249bf461` | runbook |
| A10 food binding deploy order | Built | `8b0ae98c`, `74902dcd` | check-deployment-configs |
| A11 review/ak-food-data (Fineli) | Waiting: the branch never appeared | — | `git ls-remote` checks |
| A12 leftover sweep | Done: every row built in its named part (F0 `d2105402`, G6, Parts 1–8), re-verified (AFL1, RM4: `a368a715`) or recorded with its reason (AFL3 not re-verified; AFL4's practice-badge memo, LA6 D-196 and AF15 parts 2 and 3 not done) | `d2105402`, `a368a715` | ADR-036 A12 table |
| A13 mainnet v6 day | Recorded: owner check after the deploy | — | — |
| A14 bank files | Built | `92b94a8f` | lib/bankfiles tests |
| A15 importers | Built (Bearable: no documented export) | `e7cecde0`, `322096dc` | importer tests; switch-more-ak.spec |
| A16 honest export bridges | Built | `3110c81f` | lib/export/bridges tests |
| A17 point-and-tell never records visible text | Built | `165b495d` | lib/point-tell tests |
| A18 manifest screenshots, iOS startup images | Built | `02ec25f2` | install-manifest.spec |
| A19 first-run tour | Built | `44a44fe2` | lib/tour tests; help-page.spec |
| A20 landing refresh | Built (copy); visual refresh is F7 | `ac6c2d86` | scripts/landing-ak-claims.test.mjs; landing specs |
| A21 PR-review Action on the non-Draft PR | Done (Z4): the PR leaves Draft after the final commit, so the Action runs once on the final head; findings handled as data in PR #99 and the final report | the final STATUS commit | PR #99 |
| A22 pacing and per-surface quality lines | Built (quality lines below) | this commit | — |
| D1 push built, switched off | Built | Part 2 | — |
| D2 widgets | Recorded: not possible on the web (Beta native) | — | — |
| D3 household | Recorded: ADR only | — | — |
| D4 languages, units, currency | Recorded: Beta | — | — |
| D5 no real-model calls | Held: mock + G6; REAL_MODEL_TODO.md | `14287040` | — |
| D6 Studio-4 art | Done: moved out by owner follow-up 1 (preparation `82343a53`, F11), restored by the owner in follow-up 5 and integrated as Part 13 (P13-R1…R7): the 96×126 app set within 400 KB, the 2× animated set 192×253 ≤ 2.6 MB a file, loaded lazily one clip at a time | `82343a53`, `59d2cfe4`, `d5177683` … `01b43f6f` | zigi-assets.test; the P13 rows |
| D7 exchanges refresh, no new exchanges | Built | `5074567f` | wiring.test.ts; EXCHANGES_NEXT.md |
| D8 stocks/ETFs | Recorded: skipped (paid feed) | — | — |
| D9 helpers | Held (4; 6 after owner follow-up 1) | — | — |
| D10 model and effort | Held | — | — |
| D11 security review | Built (Part 15) | see Part 15 | — |
| D12 visual polish | Done: F6 (`a2e74f32`), G3 (`21f404ef`, `b63d568a`), M1–M7 (`f88b8ab8`, `8726fa0a`, `82fde1c7`, `00f3a69d`), inside the PROTECTED list; recorded, not built: the NOVA widget → page morph (N2, M1) and the bento grid for Today and the pillar overviews (M2) | `a2e74f32`, `21f404ef`, `f88b8ab8`, `00f3a69d` | the F6, G3 and M rows |
| MUSIC (Web Audio mix, Open-in links, BYO Spotify) | Built | `95952388`, `9c902707` | lib/audio tests |
| RAMP/BANXA | Recorded: not needed | — | — |

### Owner decisions recorded during follow-up 2 (Session AK)
- **R2-7:** a desktop device that never chose the chain still reads the banner "Staking and votes sign in your own wallet…"
  (pinned by the owner's hosted check, scripts/lib/hosted-alpha-stages.mjs). Proposal: until the chain is chosen show
  "Your records stay in this browser and are not a backup." and move the staking sentence behind More, as on the phone.
- **R2-10 (desktop):** Tasks, Notes and the Journal are compact navigation entries (phone More, tablet rail); the desktop
  sidebar keeps its entries because its protected fit check (all destinations at 1440×900) has no room in the Showcase.
  Adding them on desktop needs a design change for short windows.
- **R2-15:** the three default quick counters start at their defaults (they feed the protected Checklist's default path).
- **R2-5:** NOVA's stage stays dark in Light (a Light dark island like the Today hero); the phone bar matches while NOVA is
  open.
- **Z1C I6:** "Build your own Jarvis, with a real life to run" on the landing is the owner's own line; a brand check is
  the owner's call.

## Owner follow-up 4 (P1–P8)
Verbatim (1 Nov, pre-approved; Z4 waits until P1–P8 and the open G4, M5, M7 and Z3 rows are done; up to 10 lanes):

> OWNER MESSAGE 4 TO SESSION AK, pre-approved, no reply needed; continue in auto mode (check the mode selector shows Auto). Outstanding work: NOVA, Notes, Tasks, motion and two security rounds are in. The owner wants the session at full width now: raise the helper limit to 10 lanes at once (same disjoint-lane rules, you integrate and own shared files, one build or browser run at a time). Keep the running lanes (WB, G4, M7) going and add the lanes below immediately. Record them in ADR-036 as "Owner follow-up 4 (P1–P8)" with closing rows, add them to the task list and AK_RESUME.md. Do not start Z4 until P1–P8 and the open G4, M5, M7 and Z3 rows are done; continuing into the new weekly usage is approved.
>
> P1. WIRING_AUDIT_2 TO ZERO: every Partly working row and the Not reachable row finished properly (reachable, wired end to end, Help, a browser test on the UI path), one lane per pillar group.
P2. RELEASE_REVIEW_2 TO ZERO: every remaining Major, Minor and Polish finding fixed with a status line and a test where it applies.
P3. NOVA "WOW" REVIEW AND POLISH: a fresh design-critic agent (it built none of NOVA) opens NOVA at 1440 and 1920 px in Nebula, Light and Dark, in Full and Calm motion and with reduced motion, and judges it against the owner's screenshot reference and the most admired personal-Jarvis dashboards from NOVA.md: the opening sequence, the orb's states, the side panels, the stage, the command field, the dock grid, widget layouts, typography, spacing, glass and depth, empty states, the Hermes and local-model guides, the honest right panel. Output docs/review/session-ak/NOVA_DESIGN_REVIEW.md with concrete fixes; a NOVA polish lane implements every one inside the design language (no pointer tracking, motion once, reduced motion respected) with specs.
P4. FIRST-RUN EXPERIENCE REVIEW: a fresh agent starts as a brand-new person who has never heard of crypto (empty start, 390 and 1440 px): the first 10 minutes from the swan intro through onboarding, Today, the first goal and habit, NOVA's first open without a model, and the NOVA setup guide with a mocked local model. Output FIRST_RUN_REVIEW.md (confusion points, dead ends, copy, pacing, moments that should delight); fix every finding at its cause.
P5. LANDING FRESH REVIEW: a fresh agent reviews zigoals.app (F7 + M6) at 390, 768, 1440 and 1920 px as a first-time visitor and as a design lead: clarity of the story, the NOVA chapter, motion quality, weight, honesty of every claim (MO6), accessibility; fixes with the landing tests and check:landing green.
P6. ACCESSIBILITY SWEEP: axe and keyboard-only runs on every route in Nebula, Light and Dark (with M7), including NOVA's panels, the guides, Notes' graph/list and every confirm card; every violation fixed.
P7. EXPLORATORY ROUND 3 on NOVA, the Hermes and local-model guides (mocked servers: online, offline, wrong key, CORS blocked), Notes and Tasks at 1440 and 1920 px; bugs fixed at their cause with tests.
P8. PERFORMANCE AFTER-MEASUREMENTS (M5) on Today, NOVA, Wealth and Earn plus NOVA's opening sequence (INP, long tasks, frame drops at CPU 4×); fix any regression against F8, record before/after.
Then Z3's remaining fixes and Z4 exactly as written, with the report's preview steps starting at "Open NOVA".

Readings:
- **Q30 — P1 lanes.** WA (NOVA wiring), WC (a chat that isn't kept, motion) and WB (missing specs and pins) already
  close most WIRING_AUDIT_2 rows; P1 adds a lane for the rows left (N2's browser coverage, M3's live chips) and re-audits.
- **Q31 — P2 and the protected baseline.** "Fixed" for R2-10 (desktop) and R2-7 keeps the PROTECTED designs and the
  owner's hosted check intact: Tasks, Notes and the Journal join the desktop sidebar only where the window has room for
  them (the 1440×900 fit check stands); R2-7's sentence changes only with the owner's hosted check pointed at it in the
  same change. R2-15's default counters stay (they feed the protected Checklist path); the status line says why.
- **Q32 — P8 is M5.** Lane M7's M5 after-measurement grows into P8 (NOVA's opening sequence and frame drops added).

| Row | Status | Commits | Evidence |
|---|---|---|---|
| P1 WIRING_AUDIT_2 to zero | Done: N2 coverage, M3's Running now chips, WIRING_AUDIT_2 status after P1 (Working 76, Partly 7 with owners, Not reachable 0) | `82fde1c7` | tests/p1-nova-make.spec.ts, p1-nova-live.spec.ts |
| P2 RELEASE_REVIEW_2 to zero | Done: a status line under every RELEASE_REVIEW_2 finding (24 fixed, R2-24 not reproducible and pinned); R2-7 with the owner's hosted check moved in the same change | `53c085e1` | tests/release-review-2-p2.spec.ts; scripts/lib/hosted-alpha-stages.test.mjs |
| P3 NOVA "wow" review (NOVA_DESIGN_REVIEW.md) and polish | Done: a fresh critic's 26 findings implemented (ND-24's NOVA-orb finale left for the owner); round 2 fixed the production-build spec failures at their cause (`23adbc80`) and the spec re-run passed on the production build | `cf5e77bf`, `a5486a76`, `23adbc80` | NOVA_DESIGN_REVIEW.md "Fixes"; tests/p3-nova-polish.spec.ts |
| P4 First-run experience review (FIRST_RUN_REVIEW.md) and fixes | Done: a fresh first-run review (23 findings); 21 fixed at their cause, FR-6 and FR-21 verified, FR-17 folded by the owner's decision (D-FR17) | `9a13d0ab`, `c8d0a44d`, `ae0fcc18` | FIRST_RUN_REVIEW.md "Fixes"; tests/p4-first-run.spec.ts |
| P5 Landing fresh review and fixes | Done: a fresh landing review (12 findings) fixed; first view 258,004 → 246,698 B; owner decisions OD-1…OD-5 recorded and decided (follow-up 5) | `bf617b8d` | LANDING_REVIEW.md; scripts/landing-p5-review.test.mjs; check:landing green |
| P6 Accessibility sweep (axe and keyboard, every route, three themes) | Done: axe (WCAG 2.2 A/AA) and keyboard-only runs on every route in Nebula, Light and Dark, every violation fixed; follow-ups: theme sheets regenerated (`eb3d6102`) and Portfolio's last two notes in their own dd (WCAG 1.3.1, `620d13d7`); the sweep runs in CI as its own suite (three shards, `a6727680`) | `3cb26b05`, `eb3d6102`, `620d13d7`, `a6727680` | tests/p6-axe-all.spec.ts, p6-axe-surfaces.spec.ts, p6-keyboard.spec.ts |
| P7 Exploratory round 3 (NOVA, guides, Notes, Tasks) | Done: exploratory round 3 with real local servers in four states; 6 bugs fixed at their cause | `af155d1d` | EXPLORATORY_ROUND3.md; tests/exploratory-round3.spec.ts |
| P8 Performance after-measurements (M5 + NOVA's opening) | Built: after-measurements (M7) and both regressions fixed at their cause (NOVA's opening; :has() invalidation and the resting-spot scan); real after-numbers (median of 3, phone, CPU 4×): Today scroll TBT 991 → 23 ms, Earn scroll 260 → 30 ms, Earn load 5001 → 3899 ms (inside the before range) | `5ed28b27`, `00f3a69d`, `e123fe36`, `8ce89709` | docs/performance/SESSION_AK_MOTION.md |

## Owner decisions and last checks (follow-up 5)
Verbatim (1 Nov, pre-approved):

> OWNER DECISIONS AND LAST CHECKS, pre-approved, no reply needed; continue in auto mode (check the mode selector shows Auto). Record everything in ADR-036 and do it before and inside Z4:
>
> DECISIONS
> - FR-17: YES, fold the habit FORM's counting fields (create/edit) under "More options"; update the 13 specs at equal strength. The habit CARDS do not change: their streak blocks, counts and colours stay fully visible as they are.
> - OD-1: replace "Jarvis" in all public copy (landing, Help, What's new, NOVA, guides): use "your own AI command center" / "your personal AI assistant" instead; keep the MO6 claim tests green.
> - OD-2: no change; the STATUS owner list says "deploy the landing only after Alpha #53 is live".
> - OD-3: no change (pre-existing).
> - OD-4: move the "Private by design" section to directly after the NOVA chapter on the landing; the menu numbering and the landing tests follow.
> - OD-5: yes, re-encode zigoals-mark-v3.webp visually lossless at the same displayed size (2× for retina), with a before/after size in STATUS.
>
> LAST CHECKS (the owner's worry is that something huge was built too fast; prove it isn't)
> 1. ADR-036's closing table: update every row to its true state (P1–P8, Q2, G4, G6, M5, M7, Z3 still say Open although their commits exist). No row may stay Open at Z4: each is Built/Done with evidence, Recorded with the reason, or listed under Known limitations.
> 2. WIRING_AUDIT_3 on the final head by a fresh read-only agent: EVERY row of ADR-036 (not only the new ones), the same Working / Partly / Not reachable / Stub test. Fix every gap; anything that truly can't be finished goes to Known limitations in Help and STATUS in plain words. Nothing half-done is presented as done.
> 3. Stability: the full browser suite twice on the final head (sharded, 2 workers), plus CI twice green; any test that passes only once is fixed at its cause.
> 4. docs/handoff/AK_DEMO_TOUR.md: a 15-minute owner demo script in the order that shows the leap best, starting with "Open NOVA" (the opening sequence, the side panels, the setup guide with a local model via Ollama or LM Studio on a Mac, Hermes Agent, a workflow, the ZIGi duo), then Notes and Tasks, motion (Full / Calm / Off), the new health, habit and money features, push and offline (what is off until activation), the landing. Each step: where to click, what to expect, what is honestly not live yet. Link it at the top of the final report.
Then Z4 exactly as written.

| Row | Status | Commits | Evidence |
|---|---|---|---|
| D-FR17 Fold the habit form's counting fields under More options (cards unchanged) | Done: type, measurement, unit, target and period in "More options" ("How it is counted"); closed for a new habit, open on edit, opens itself for a template, a refusal or the browser's required check; cards unchanged. The four specs that fill those fields (not 13: reminder and Health-link specs are not folded) open it first, every assertion kept | `84c00a46` | lib/habit-form-fold.test.ts; tests/fr17-habit-more-options.spec.ts |
| D-OD1 "Jarvis" replaced in all public copy | Done: the one public line (landing's NOVA lede) reads "Build your own AI command center, with a real life to run."; a guard test keeps the word out of the landing, Help, search, What's new and NOVA's code; research and review records keep it as history | `c8dcaffb` | scripts/landing-nova-m6.test.mjs |
| D-OD2 STATUS owner list: deploy the landing only after Alpha #53 is live | Done: owner list item 4 in the STATUS entry | the final STATUS commit | STATUS (Owner list) |
| D-OD4 "Private by design" directly after the NOVA chapter | Done: privacy is chapter 06 after NOVA; "Privacy" joins both menus after NOVA (phone menu NOVA 06, Privacy 07); numbering follows | `c8dcaffb` | scripts/landing-p5-review.test.mjs (OD-4) |
| D-OD5 zigoals-mark-v3.webp re-encoded visually lossless, sizes in STATUS | Done at the native size: 54,908 → 51,134 B (PSNR 42.25 dB, SSIM 0.998, alpha within 2/255). The 2× retina file for the desktop hero (~940 px) needs a larger original from the owner than the repo's 422×480: an item in STATUS's owner list and Known limitations (the Z4 entry); not in the app's Help (it concerns the landing) | `c8dcaffb` | check:landing green |
| C1 Closing table true for every row | Done: every row brought to its true state from WIRING_AUDIT_3's "Records to correct" and "Gaps to fix" (this edit): rows Built/Done with evidence or Recorded with their reason; the verify-then-do rows 5.1, 6.5, 8.9 and the A12 row M4 (QA2-04) restored to their own text; Q19's amendment after its sentence. Open until Z4's final commits: Z4, Part 16, A21, D-OD2, C3 | (this commit) | docs/review/session-ak/WIRING_AUDIT_3.md |
| C2 WIRING_AUDIT_3 on the final head, every ADR-036 row | Done: WIRING_AUDIT_3 by a fresh read-only agent on `199ac9a8`: Working 149 / Partly 10 / Not reachable 0 / Stub 0 / N/A 37; the gaps fixed (G3, `b63d568a`) or recorded (this ADR's rows and STATUS Known limitations) | `894d37dd`, `b63d568a` | docs/review/session-ak/WIRING_AUDIT_3.md |
| C3 Full browser suite twice on the final head + CI twice green | Done: run A (24 shards, `2b819b29`) and run B (CI fonts, same product, the fixed specs) with every failure fixed at its cause in its spec or recorded (sandbox-only, browser-level, with evidence); CI green on `2b819b29`, `f01b7379` and `02cda1a7`; by owner decision 7, one full green CI run on the final head (WebKit engine faults: one re-run) | `a45e3afa`, `f01b7379`, `1048de38`, `02cda1a7`, `b40c864b`, `4599b0ff`, `d9f2bdb4` | STATUS (Evidence; Known CI intermittents) |
| C4 docs/handoff/AK_DEMO_TOUR.md (starts "Open NOVA") | Done: 11 steps, 15 minutes, each with where, what and what is not live; its five code/doc gaps fixed (Help push line, a label, the NOVA inbox link, What's new, the barcode path) | `90ce48e9` | tests/send-feedback.spec.ts, whats-new.spec.ts |

## Owner decision 6 (1 Nov, after P8b)
Verbatim (pre-approved):

> OWNER DECISION, pre-approved, no reply needed; continue in auto mode. The Checklist full-screen view's two costly rules: you may fix them ONLY if the look stays identical — the Checklist's pin tests and the AG Polish visual specs pass unchanged at equal strength; if identity can't be proven, leave them and record it. Earn's first load (3.9 s on the phone profile): accepted for this PR; record it under Known limitations with the measurement.

| Row | Status | Commits | Evidence |
|---|---|---|---|
| D6-CL The Checklist full-screen view's two :has() rules: fixed only if the look is provably identical | Done: the two rules moved from :has() in checklist.css to a <style> the page renders beside its dialog (same specificity, same first paint). Identity proven: 0 differing computed-style lines in 12 states (3 themes × 390/1440 × open/after leaving) against the build without the change and against e107e6e9; pixels identical but for one time-driven region that also differs between two unchanged captures; the 11 Checklist pin and AG Polish specs unchanged (sha256) and passing 104/104. Effect (phone, CPU 4×): overlay scroll TBT 25 → 0 ms, load 4221 → 3779 ms (runs overlap), tick unchanged; /app/checklist 489.4 → 489.9 of 492 kB | (this commit) | SESSION_AK_MOTION.md "P8c"; scratchpad/p8c captures |
| D6-EARN Earn's first load (3.9 s TBT, phone profile, CPU 4×) accepted; recorded under Known limitations with the measurement | Done: Help's Known limitations line with the measurement | `5597e3dd` | tests/send-feedback.spec.ts |

## Owner follow-up 5: Part 13 restored
Verbatim (1 Nov, pre-approved):

> OWNER MESSAGE: STUDIO-4 IS DELIVERED — Part 13 is back in this PR. Pre-approved, no reply needed; continue in auto mode (check the mode selector shows Auto). Record it in ADR-036 ("Owner follow-up 5: Part 13 restored"), add it to the task list and AK_RESUME.md.
> - The owner will push a slim Studio-4 delivery to the orphan branch review/studio4-assets (folder studio4-deliver/, with per-folder SHA256SUMS) within the next hours. Check `git ls-remote origin review/studio4-assets` every 15 minutes. Do NOT take the PR out of Draft, and do NOT start the two full-suite runs, WIRING_AUDIT_3 or Z4, until Part 13 is done; finish the other open lanes meanwhile.
> - When it lands: do Part 13 exactly as written in the brief and your STUDIO4_SWAP_RUNBOOK.md: fetch it; verify each folder's SHA256SUMS; follow its docs/INTEGRATION-HANDOFF.md (importer patch, manifest additions, reactions.json, the duration table, the measured optical offset x +0.022 / y −0.090, budgets, known issues); import the app set through scripts/zigi/import-studio.mjs with Part 12's constants (if the handoff's patch differs from Part 12's constants, follow the handoff and record the difference); wire the 25 states' own clips, the 13 reactions to their semantic events, the extras, the variant rotation and the push icon and badge; add the 2× animated set under D6 (≤ 2.6 MB per file, loaded lazily one clip at a time, never in route JS).
> - OWNER DECISION: X030 cheer REPLACES the borrowed presenting pose in the Checklist's completion celebration (AF11, the owner's original request). Only that art changes; nothing else in the Checklist's layout, path, river, labels or top bar changes, and its pin tests stay green.
> - Re-measure the optical centre in Chromium; update brand-assets.test, zigi-assets.test and zigi-alive.spec at equal strength; Meet ZIGi shows every state, reaction, extra and variant; reduced motion and Motion Off show the stills; theme parity and route weights stay green.
> - Never commit the delivery branch itself into main, only the imported files. The "to polish later" items in the handoff go to Known limitations.
> - Then the two full-suite runs, WIRING_AUDIT_3 and Z4 as written, with the demo tour gaining a "Meet the new ZIGi" step.

| Row | Status | Commits | Evidence |
|---|---|---|---|
| P13-R1 Watch review/studio4-assets every 15 min; fetch; each folder's SHA256SUMS verified | Done: delivered at bdd8319b (373 files, 124 MB extracted outside the checkout); `sha256sum -c` OK on the root list (371 files) and on app/ (255) and app-2x-anim/ (102); largest 2× clip 2,452,878 B (≤ 2.6 MB) | — | scratchpad verify output; STUDIO4_RECEIPT.md (with the import) |
| P13-R2 INTEGRATION-HANDOFF.md followed (importer patch, manifest, reactions.json, durations, optical offset x +0.022 / y −0.090, budgets, known issues); differences from Part 12's constants recorded | Done: EXTRA_SLOT variant keys as the handoff; budgets kept at 400 kB / 2.6 MB (the patch's 1.2 MB would refuse 19 of 51 delivered clips and contradicts the handoff's own 2.6 MB); PUSH_BUDGET 40 → 80 kB (icon 75,138 B); HOST_FACT_REACTIONS added; durations from the WebPs' frame timings (51/51) | `d5177683`, `90c8799e` | STUDIO4_RECEIPT.md; scratchpad/s4-status.md |
| P13-R3 The app set imported by scripts/zigi/import-studio.mjs; the 25 states' clips, 13 reactions on their semantic events, extras, variant rotation, push icon and badge wired | Done: 200 new + 55 changed files, all equal to the receipt; R001–R010 at Part 12's triggers, R011–R013 as host facts (offline/online, the knock's Dismiss); X010–X012 idle, X050–X054 variant pools; push icon and badge in sw.js. X001 and X020–X022 delivered but not played (no app place; Meet ZIGi says so; owner list) | `d5177683`, `310d3bed`, `90c8799e` | host-facts.test, variants.test, push-art.test |
| P13-R4 The 2× animated set under D6 (≤ 2.6 MB a file, loaded lazily one clip at a time, never in route JS) | Done: 51 clips 192×253, largest 2,452,878 B; static files, one at a time; route weights unchanged within budget (/app 561.5 of 567 kB) | `d5177683` | zigi-assets.test; check-weight-budget |
| P13-R5 X030 cheer replaces the presenting pose in the Checklist's completion celebration (only that art; pin tests green) | Done: the orbit-completion cheer (path.tsx, path-zigi.tsx; the borrowed pose per STATUS's AF owner list); its large still under reduced motion / Motion Off; day video, tick cheer, timings, layout unchanged; the 11 Checklist pin and AG Polish specs pass unchanged | `90c8799e` | slots.test; checklist specs on 28437ae6 |
| P13-R6 Optical centre re-measured in Chromium; brand-assets.test, zigi-assets.test, zigi-alive.spec at equal strength; Meet ZIGi shows every state, reaction, extra and variant; stills under reduced motion and Motion Off; theme parity and weights green | Done: +0.0224/−0.0904 (1×), +0.0225/−0.0904 (2×, large); tests restated at equal strength; Meet ZIGi's 26 moves; theme-parity-af and the ZIGi specs green on 28437ae6 | `7ac1a8dd`, `e19730cd`, `63071aa3` | zigi-alive, zigi-emotions, theme-parity-af |
| P13-R7 Only imported files committed (never the delivery branch); "to polish later" items in Known limitations; the demo tour gains "Meet the new ZIGi" | Done: imported files only; three Known limitations lines (Help, 37 items); AK_DEMO_TOUR step 6b | `90c8799e`, (this commit) | send-feedback.spec |

## Owner decision 7 (2 Nov, wrap-up)
Verbatim (pre-approved):

> OWNER DECISION, pre-approved, no reply needed; continue in auto mode (check the mode selector shows Auto). Wrap up now:
> 1. Finish run B. Then C3 counts as met with ONE full green CI run on the final head, where a WebKit job that fails only from the two diagnosed engine-level causes (the libWPEWebKit compositor segfault "hang then die", and the Playwright navigation-cancel bug) gets its one re-run. Do not investigate engine-level crashes further: record both in STATUS as known intermittents with the evidence and the new diagnostic step.
> 2. The ZIGi composer text loss (typing during the switch from on-device to connected mode remounts the Composer and drops the text) is a real user-facing bug: fix it if the fix is contained (the typed text survives the switch), with a test; if it isn't contained, list it under Known limitations.
> 3. Then Z4 immediately, exactly as written: final STATUS entry, PR out of Draft, the PR-review Action once, CI green on the final head, and the report starting with "Open NOVA" and linking AK_DEMO_TOUR.md.

| Row | Status | Commits | Evidence |
|---|---|---|---|
| D7-C3 Run B finished; C3 met by one full green CI run on the final head (WebKit engine faults: one re-run) | Done: run B finished 00:25 UTC (STATUS Evidence); the final head's CI run is the C3 run, reported in PR #99 and the final report | `27a14ee5`, `d9f2bdb4`, the final STATUS commit | STATUS (Evidence; Known CI intermittents) |
| D7-ENGINE The two WebKit engine-level causes recorded with evidence and the diagnostic step | Done: STATUS "Known CI intermittents" (class A, the navigation-cancel bug; class B, `ThreadedCompositor segfault … libWPEWebKit-2.0.so`, read by the failure-only step) | `4599b0ff` | CI run 41533409478 (the step's first use) |
| D7-COMPOSER ZIGi's box losing words typed during the on-device → connected switch | Recorded under Known limitations (Help and STATUS): no contained fix could be proven. A probe in Chromium (6/6) found the box is never rebuilt (one textarea, relabelled in place ~100 ms after it appears) and words typed across the switch stay; the loss was seen once, in CI's WebKit (a Playwright fill ~4 ms after the switch), and WebKit is not installed locally | `27a14ee5` | tests/send-feedback.spec.ts (37 → 38, by its words) |
