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
| AFL3 | Habit pacts (escrow contract) | ADR-028 | c (contract uploads governance-whitelisted) — re-verified in 14 |
| AFL4 | Memo attestations on mainnet | ADR-028 H48, H105 | d (privacy); the prefix-free practice-badge memo (H133 S6) is a → 14 (TIER 3 wallet) |
| AFL5–AFL7, ADR-028's OroSwap shares | xpub, Journeys/Focus, synced habit clock, pool/vault shares | ADR-028 | Done (AJ items 36, 34, 35; AH AF3) |
| H113 | `goalId` prop on TodayIntelligence | ADR-028 | a → 14 |
| M4 (QA2-04) | ZIGi knock reminders use the device clock, not the journal's zone | ADR-033 | a → 14 |
| M42 | "Net worth this week" on Today's line | ADR-033 | a → 8 (check AI N37 first) |
| LA6 D-196 | Dark: column widths differ between pages | A8 | a → 11 |
| AF15 (parts 2, 3) | Health import stress readings; Academy name under the lesson bubble | A8 | a → 11 |
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

Readings: Q22 — Part 13's swap is out of this PR (F11 instead); A13 is an owner check after the deploy (the A13 reminder was cancelled). Q23 — the push Worker's service binding waits for push activation (adding it now would fail the Alpha deploy until that Worker exists, the 10056 rule); the runbook's rate-limited route covers it. Q24 — ZIGoals Wrapped's door is on Journey and in Search; a Today For you card is built (`TodayWrappedCard`) but not mounted, because Today's weight and its Showcase layout specs are pinned and the card matters from 1 December; mounting it is one lazy element when the season starts. Q25 — the vote reminder (F4) is its own opt-in per proposal, so it has no separate Notifications switch (a switch named for governance would show chain words to everyone, against "chain invisible"); unbonding dates go to the Agenda only, not to notifications (they come from Wealth's records, which a notification snapshot does not read).

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
| AFL9 Keplr Mobile staking over WalletConnect (review sheet only) | Built | `f9ccc351` | lib/staking/walletconnect-signer.test.ts; staking guard holds |
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
| 8.9 test restore, backup reminder | Built | `3110c81f` | test-restore, backup-reminder tests |
| 8.10 AFL8 Checklist extras section | Built (effective at the owner's private-sync redeploy) | `e7d9951e` | extras-two-device, extras-keyspace, private-account tests |
| Part 9 Lichess Board play and daily puzzle | Built | `1f84a28e` | lib/chess tests; tests/chess-play-ak.spec.ts |
| Part 13 Studio-4 art swap | Moved to a separate session (owner follow-up 1); preparation is F11 | — | — |
| A13 mainnet v6 day | Recorded: owner check after the deploy (owner follow-up 1) | — | the app accepts v6.0 on zigchain-1 (ADR-035) |
| F0 finish what is open | Built: first-Monday schedules (optional `monthWeekday`), visible sync status, 6.5 progress toast, 7.8, M42, H113, M4, missing tests ZI4/ZI8/ZI9/ZI14/G15/landing skip link, four intermittents at their cause (zigi-memory:188 navigation, zigi-knock FIRST, zigi-memory-af about:blank, zigi-accept-correct page clock); M8, market-status socket and WebKit-phone fetches recorded (no recurrence in 12 runs) | `d2105402` | unit tests per item; frozen fixture monthWeekday |
| F1 release-readiness review | Open | — | — |
| F2 full app testing (journeys) | Open | — | — |
| F3 competitor research round 2 | Built: BUILD list 2 (21 items) — #2 to F4, #1 #3 #5 #8 to lane B2a, the rest in later waves or recorded | `8c5f2d1a` | docs/research/session-ak/COMPETITORS_2.md |
| F4 ZIGChain ecosystem, deeper | Built, read-only: staking clarity, validator spread, token check (/api/chain/denom, no new host), governance summaries and vote reminders, practice round, ecosystem status; EVM balances not built (no live mainnet RPC; testnet RPC behind a challenge) | `920de5bf` | lib/zigchain-eco tests (45 files with staking guards) |
| F5 new features | Built: health and habits (`c8afc7f1`), goals and money, cross-pillar (agenda + .ics, Wrapped, search actions) (`d2105402`); BUILD list 2 #1 #3 #5 #8 (`d2105402`) | `c8afc7f1`, `d2105402` | unit tests per feature; 8 new keys in every registry |
| F6 visual upgrade | Open | — | — |
| F7 landing visual refresh | Built (owner deploys): hero, Example data labels, offline/install mockups, Private by design, Switch to ZIGoals, FAQ; phone weight lower, desktop within 6 MB | `7cadc0e5` | scripts/landing-f7-visual.test.mjs; check:landing |
| F8 performance and accessibility | Open | — | — |
| F9 ZIGi for everything new | Open | — | — |
| F10 security delta review | Built: three fresh reviewers on 9401dcbb..HEAD — no High; 1 Medium fixed (the agenda's unbonding titles); 11 Low (8 fixed, 3 recorded); 6 Info (3 fixed, 3 recorded) | `6e049943` | docs/security/review-2026-10/SESSION_AK_F10.md; unbonding-privacy, denoms, guard, notify tests |
| F11 Studio-4 preparation complete and proven | Built: every Part 12 slot verified wired (X030 cheer unused by the PROTECTED Checklist until the owner says yes); dry run of studio4-deliver/ through the importer; runbook | `a845d339` | scripts/zigi/studio4-dry-run.test.mjs (17 tests); docs/handoff/STUDIO4_SWAP_RUNBOOK.md |
| F12 finish | Open | — | — |
| 5.1 schedules: "first Monday of the month" | Open (F0x lane) | — | — |
| 5.7 time-of-day sections (COMPETITORS #23) | Already done | components/habits/habit-sections.tsx (Session AA) | habits-aa specs |
| 6.5 cross-pillar progress toast | Open (F0x lane) | — | — |
| 7.8 Wealth polish | Partly: layout fixes `efdd361e`; rest open (F0x lane) | — | layout audit 320 px |
| 8.1 unified weekly Life review in /app/review | Built ("At a glance" per pillar in the existing Week/Month review; Today's week card links to it) | `a56f9d18` | lib/review-unified tests |
| 8.2 daily orbit card | Built | `a56f9d18` | lib/orbit-card tests; showcase-today-aa.spec |
| 8.3 weekly ZIGi insight | Built (deterministic local note in the review) | `a56f9d18` | lib/insight-notes tests |
| 8.4 monthly balance note | Built | `a56f9d18` | lib/insight-notes tests |
| 8.5 one share-card system | Built | `a56f9d18` | lib/share-cards tests |
| 8.6 badges off by default; Checklist no-XP pinned | Built | `a56f9d18` | lib/game/badges-setting.test.ts |
| 8.7 point-and-tell (A17) | Built: the existing Point & tell records role + developer name, never visible text | `165b495d` | lib/point-tell tests; point-tell.spec |
| 8.9 a visible sync status | Open (F0x lane) | — | — |
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
| Part 11 visual, layout audit, A19 tour | Partly: tour `44a44fe2`, layout fixes `efdd361e`; the full pass is F6 | — | — |
| Part 12 ZIGi tools and Studio-4 preparation | Built | `14287040`, `82343a53`, `768d383d` | lib/ai AK tests, G6 cases; lib/zigi-studio4 tests |
| Part 14 leftovers, verifier, docs, landing | Partly: verifier stage 11 `d80a1d0d`; Help/What's new/limitations `44a44fe2`; landing `ac6c2d86`; PRIVACY lines; the rest F0x | — | — |
| Part 15 security review (RM12) | Built: no High; 6 Medium and 14 Low fixed | `2e27d8c3`, `fd074085`, `bafa240c`, `9401dcbb` | docs/security/review-2026-10/SESSION_AK_RM12.md |
| Part 16 finish | Open (F12) | — | — |
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
| A12 leftover sweep | Partly; rest in F0 | — | ADR-036 A12 table |
| A13 mainnet v6 day | Recorded: owner check after the deploy | — | — |
| A14 bank files | Built | `92b94a8f` | lib/bankfiles tests |
| A15 importers | Built (Bearable: no documented export) | `e7cecde0`, `322096dc` | importer tests; switch-more-ak.spec |
| A16 honest export bridges | Built | `3110c81f` | lib/export/bridges tests |
| A17 point-and-tell never records visible text | Built | `165b495d` | lib/point-tell tests |
| A18 manifest screenshots, iOS startup images | Built | `02ec25f2` | install-manifest.spec |
| A19 first-run tour | Built | `44a44fe2` | lib/tour tests; help-page.spec |
| A20 landing refresh | Built (copy); visual refresh is F7 | `ac6c2d86` | scripts/landing-ak-claims.test.mjs; landing specs |
| A21 PR-review Action on the non-Draft PR | Open (F12) | — | — |
| A22 pacing and per-surface quality lines | Built (quality lines below) | this commit | — |
| D1 push built, switched off | Built | Part 2 | — |
| D2 widgets | Recorded: not possible on the web (Beta native) | — | — |
| D3 household | Recorded: ADR only | — | — |
| D4 languages, units, currency | Recorded: Beta | — | — |
| D5 no real-model calls | Held: mock + G6; REAL_MODEL_TODO.md | `14287040` | — |
| D6 Studio-4 art | Moved to a separate session; preparation `82343a53` (F11) | — | — |
| D7 exchanges refresh, no new exchanges | Built | `5074567f` | wiring.test.ts; EXCHANGES_NEXT.md |
| D8 stocks/ETFs | Recorded: skipped (paid feed) | — | — |
| D9 helpers | Held (4; 6 after owner follow-up 1) | — | — |
| D10 model and effort | Held | — | — |
| D11 security review | Built (Part 15) | see Part 15 | — |
| D12 visual polish | Partly; F6 | — | — |
| MUSIC (Web Audio mix, Open-in links, BYO Spotify) | Built | `95952388`, `9c902707` | lib/audio tests |
| RAMP/BANXA | Recorded: not needed | — | — |
