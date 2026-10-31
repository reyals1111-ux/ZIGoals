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
Filled in from the earlier records (ADR-028 to ADR-035, STATUS) in Part 0; each row is built in its matching part or recorded with the blocker.

## Per-surface quality lines (A22)
One line per new surface, compared with COMPETITORS.md's best equivalent; added as each surface lands.

## Closing table (every item in the brief)
Outcomes: **Built** (commit, tests) · **Already done** (evidence) · **Finished/polished** (existed, now complete; commit, tests) · **Not possible** (evidence and reason) · **Recorded** (outside AK by the owner's list). Rows are completed as the parts land.

| Item | Outcome | Where | Evidence |
|---|---|---|---|
| Part 0 records, ADR-036, resume file, Draft PR, frozen readers #37–#52 | Built | Part 0 commit | — |
