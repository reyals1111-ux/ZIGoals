# Session AK — C2 wiring audit 3 (every ADR-036 row, final head)

Fresh read-only auditor (owner follow-up 5, last check 2). **Head:** `199ac9a8` on `feature/session-ak-number-one`
(the server on :3101 answers `x-zigoals-build: 199ac9a870bc…`). Read-only: nothing in the product was changed; no build,
no commit. **Method:** code read at the head (entry file:line and the effect), the tests that exercise each row (named),
Help and Known limitations (`apps/web/components/help/help-page.tsx:378-424`), the previous audits
(`WIRING_AUDIT.md`, `WIRING_AUDIT_2.md` incl. "Status after P1"), and one short headless check of a fresh device
(below). Unit and browser tests were **not run** by this audit (the lead's C3 runs them); "test" below means the test
exists at the head and exercises the row.

**Verdicts:** Working (reachable from the UI, wired, a test exercises it, any "off until activation" stated in the UI and
Help) · Partly (the missing part named) · Not reachable · Stub · N/A (a record, decision, research or process row) ·
Open (a Z4 row not due yet). "unit only" = the row's test is a unit/jsdom test, no browser spec on its UI path (allowed
by this audit's rule; listed so the lead can judge).

**Commits:** all 123 distinct short SHAs named in ADR-036 exist and are ancestors of the head (`git cat-file -t` →
commit, `git merge-base --is-ancestor` → yes, for each). The "(this commit)" rows (A22, D6-CL, P13-R7) map to
`77af2219`/earlier, `4c52ee1d` and `01b43f6f`.

## Counts (202 table rows: the closing table 176, P1–P8 8, follow-up 5 9, decision 6 2, Part 13 7)

| Verdict | Rows |
|---|---|
| Working | 149 |
| Partly | 10 |
| Not reachable | 0 |
| Stub | 0 |
| N/A (records, decisions, research, process) | 37 |
| Open (Z4, not due yet) | 6 (Z4, Part 16, A21, D-OD2, C1, C3) |

Partly (10): F0, G3, N2, N10, M1, M2, Part 11, Part 14, A12, D-OD5. Of the Q readings, Q24 is Partly (dead code).

Plus **stale or wrong status text** in the rows listed under "Records to correct (C1)", whose code is fine (the ADR says less, or something else, than the code
does). **No row overstates the code as Done where it is Stub or Not reachable.**
Six rows say "Built"/"Done" where a named part is missing: N2, N10, M2, G3, F0 and D-OD5 (all in "Gaps to fix").

## Cross-cutting checks

- **Honesty.** Push: Settings → "NOTIFICATIONS · Being switched on" (`components/notify/notifications-card.tsx:75`), no
  Turn on while `pushDeviceEnabled: false` (`config/public-integrations.json:7`); `/api/push-device` answers 503 until the
  owner's switch (`app/api/push-device/route.ts:11-15`); B `tests/pwa-ak.spec.ts:72`. Food: "Barcode lookup is being
  switched on. Your private food library still works." on a 503 (`components/health/barcode-food-lookup.tsx:86`). Known
  limitations names both, Fineli, WalletConnect/Keplr Mobile, Garmin, Lichess speeds, the label/photo AI, grocery ticks,
  Studio-4's three polish items and Earn's 3.9 s (`help-page.tsx:409-421`). Unknown is not zero: R2-15 pinned
  (`tests/wiring-2-r2.spec.ts:41,62`); the progress toast says nothing when unknown (`lib/progress-toast/moved.ts:12-14`).
  Showcase labels: NOVA chip "Showcase · fictional example data" (`components/nova/status-chips.tsx`), the Hermes example
  (`components/nova/hermes/hermes-example.tsx`), manifest screenshots "(Showcase, fictional)". No fake integration found:
  grep for fake/simulat/dummy/TODO/"coming soon" over components/nova, notes, tasks, agenda, notify, music, zigchain-eco,
  lib/nova, notes, tasks → nothing but a placeholder-key list in `lib/nova/hermes-guide.ts:42`. Money/health copy:
  debt planner and FI "a model, not advice", Your numbers "Not a diagnosis", supplements "no medical advice".
- **Consumer first.** The AK surfaces a fresh device sees (NOVA, Notes, Tasks, Agenda, Music, Notifications, the tour)
  carry no chain word in code (grep for ZIG/ZIGChain/staking/wallet/crypto/token/validator/Keplr/WalletConnect). Two
  soft spots: NOVA → Permissions says "Never a key or a wallet secret." (`components/nova/panels/permissions-panel.tsx:26`)
  and the Guarded preview lists "wallet addresses" — generic words, acceptable. **Help** (open to a fresh device) has AK
  lines with chain words in Known limitations ("Phone wallets by WalletConnect…, staking with Keplr Mobile…",
  `help-page.tsx:413`) and `ak-wallets`, beside the pre-AK "Only staking moves ZIG" line; no recorded exemption for Help
  was found and `tests/consumer-first-x1.spec.ts` does not scan Help. Lead/owner call (see "For the lead").
- **Privacy.** New outside hosts since `7000807`: `wss://relay.walletconnect.org`, `https://verify.walletconnect.org(/)`,
  `.com(/)` (app connect/frame), `api.nal.usda.gov` (food Worker only) and the push-device Worker origin — each in
  `apps/web/lib/egress-policy.json` and `docs/PRIVACY.md:160,163,165`. NOVA calls only localhost (`lib/nova/local-servers.ts:18`,
  `lib/nova/hermes.ts:18-19`; CSP `localModelSources`, pinned by `lib/csp-compose.test.ts`) or the person's own provider
  key through ZIGi's adapters; links to ollama.com and hermes-agent docs are plain links/commands.
- **Store wiring.** Every AK IndexedDB (`zigoals-notify-v1`, `-notify-actions-v1`, `-food-generic-v1`, `-music-byo-v1`,
  `-notes-photos-v1`, `-money-photos-v1`, `-lichess-v1`) is in `lib/erase-everything.ts:13-28` and `AK_DATABASES`
  (`lib/ak-device-keys.ts:83`), pinned by `lib/ak-device-keys.test.ts:56,66` and `lib/erase-coverage.test.ts:73`.
- **PROTECTED.** No AK change to the bottom bar, swan intro or Today hero files was found by diff; the footer finale's
  only change is a mask that loads only when the finale can play (`components/footer/site-footer.css:38-43`, G2). The
  Checklist changes (X030 art, D6-CL rules) are owner-approved with pin specs unchanged (ADR rows). Not re-verified in a
  browser here.
- **STATUS.** `docs/STATUS.md` holds only the AK Part 0 stub; its Known limitations, owner list and CI intermittents for
  AK do not exist yet (they are Z4's final commit). Everything listed under "For Known limitations" below must land there.

## Summary table

### Parts 0–16, research and the closing table's feature rows

| Row | Verdict | Evidence (entry → effect; test) | Gap |
|---|---|---|---|
| Part 0 records, frozen readers #37–#52 | N/A | `scripts/frozen-readers.mjs:19` (#52 = 7000807); `9c5d7ee6` | — |
| Research (COMPETITORS, EXCHANGES_NEXT, LICENCES, WALLETS, FORMATS) | N/A | `docs/research/session-ak/*` | — |
| 1a WalletConnect | Working | Wallet menu → Connect by WalletConnect (after the chain is chosen); `components/wallet/walletconnect-panel.tsx`, `lib/wallets/walletconnect.ts`; B j07, U walletconnect, lib/qr, csp-compose | Live pairing waits on Reown (A9), said in UI and Known limitations |
| AFL9 Keplr Mobile staking over WalletConnect | Working | Staking panel pairing → review sheet → `walletConnectKeplr` (`lib/staking/execute.ts`); B `tests/journeys/j07-wallet-chain.spec.ts:164` (7b, stubbed signer, no longer fixme); U walletconnect-signer/connect | Never on a real phone — Known limitations says so (`help-page.tsx:413`) |
| 1b food Worker (FDC after OFF, binding, A10) | Working (off until the owner deploys) | Health → Barcode → `/api/food-lookup` (`app/api/food-lookup/route.ts:10`) → Worker (`workers/food-lookup/worker.mjs:45` FDC only with the key); binding `apps/web/wrangler.alpha.jsonc:13`; U food-lookup-route, Worker tests, `scripts/alpha-deployment.test.mjs:149` | — |
| 1c EU generic library | Working | Search foods by name → offline library (`lib/food-generic/store.ts`); B j02 | Fineli waiting (A11); in Known limitations |
| 1d music for everyone | Working (unit only for the page's parts) | Search "Music" → `/app/music` (`app/app/music/page.tsx`; B `tests/wiring-review.spec.ts:66`); panel focus sounds, Apple Music link, Spotify MOCK (B `tests/music.spec.ts:96,127,141`) | The mix of three, sleep timer, playlist links and "Use my own Spotify app" on `/app/music` have unit tests only (`lib/audio/mix.test.ts`, `lib/music/playlists.test.ts`, `lib/music/spotify/byo-store.test.ts`) |
| 1e PR review | N/A | Moved to Part 16 / A21 | — |
| Part 2 push | Working (off until activation, stated) | Settings → Notifications card (`components/notify/notifications-card.tsx:75`); `lib/notify/*`, `public/sw.js:272`; B `tests/pwa-ak.spec.ts:72,85`, j05; U lib/notify | — |
| Part 3 PWA | Working | `public/sw.js`; offline, update prompt, install; B pwa-ak:18,34,53, j04, install-manifest | — |
| A6 storage headroom (Part 3 row) | Working (unit only) | `components/notify/notify-sync.tsx:76` → `lib/storage-headroom.ts:32`; Help `ak-storage-full` (`help-page.tsx:358`); U storage-headroom.test.ts | No browser spec shows the line |
| 4.1 barcode | Working | B j02, `tests/barcode-param-ak.spec.ts`; U lib/food-scans | — |
| 4.2 meal photo | Working | B j02 (MOCK AI); U photos.test | — |
| 4.3 voice / natural language | N/A | Already done (J10) | "polish in Part 11" has no evidence; harmless |
| 4.4 micronutrients | Working | B `tests/wiring-health.spec.ts:45` | — |
| 4.5 coach card | Working | B j02 | — |
| 4.6 planner and grocery | Working | B health-aa, j08 | — |
| 4.7 wearables (FIT, Strava ZIP) | Working | B wiring-health:180 | — |
| 4.8 recipe polish | Working | B wiring-health:110 | — |
| 4.9 training and sleep | Working (wake consistency unit only) | Health → Sleep "Wake-time consistency" (`components/health/sleep/sleep-view.tsx:77`); B j02 (sets); U `lib/sleep/wake-consistency.test.ts`; Help mentions it | — |
| A15 Switch to ZIGoals | Working | B switch-more-ak, j10 | Bearable recorded |
| 5.1–5.4 habits | Working | B `tests/wiring-habits.spec.ts:28,51,71,119` | — |
| 5.5 J3 | N/A | ADR-033 M31 | — |
| 5.6 auto-complete rules | Working | B j08, auto-checkins | — |
| 5.7 reorder, compact list | Working (unit only) | Habits → Show habits as; U compact-toggle.test.ts (jsdom) | No browser spec for reorder or Compact |
| 6.1 goal bundles | Working | B wiring-goals:16 | — |
| 6.2 pace, what-if | Working | B j08, goals-v2 | — |
| 6.3 progress card | Working | B wiring-goals:54 | — |
| 6.4 milestones, habit links | Working | B wiring-goals:81 | — |
| 6.6 household | N/A | D3 | — |
| 7.1 CSV templates, bank files | Working | B j03 | — |
| 7.2 exchange auto-refresh | Working | B wiring-wealth:22 | — |
| 7.3 bills with push | Working | B j03, j08 (push part off until activation) | — |
| 7.4 target mix and drift | Working | B wiring-wealth:189 | — |
| 7.5 purpose flow | Working | B j03 | — |
| 7.6 contribution rhythm | Working | B j03, j03b, j03c | — |
| 7.7 budgets | Working | B j03 | — |
| 8.8 export bridges | Working | B wiring-review:151 | — |
| 8.9 test restore, backup reminder | Working | B j06 (Test a backup); U backup-reminder | Row's outcome text says "a visible sync status" (copy collision; C1) |
| 8.10 AFL8 Checklist extras | Working (off until the owner's private-sync redeploy, stated) | U extras-two-device, extras-keyspace; Known limitations `help-page.tsx:397` | Unreachable on the Alpha until accounts open; honest |
| Part 9 Lichess | Working | B chess-play-ak, j09 | — |
| Part 13 Studio-4 swap | Working (via P13-R1…R7) | see Part 13 rows | Row still says "Moved to a separate session" (C1) |
| A13 mainnet v6 | N/A | Owner check after deploy | — |
| F0 finish what is open | Partly | First-Monday (U lib/habit-month-weekday), sync status (U lib/sync-status), 6.5, 7.8, M42, H113, M4 knock zone, ZI4/8/9/14/G15, skip link, intermittents (`d2105402`) | **AFL4's prefix-free practice-badge memo** (F0 item 2, "if still class a") is neither built nor recorded; **AFL3's re-verification** is not recorded (AFL1 and RM4 are) |
| F1 release review | N/A | RELEASE_REVIEW.md; fixes with specs | R28 owner |
| F2 journeys | Working | `tests/journeys/j01…j12` (7b no longer fixme) | — |
| F3 competitor research 2 | N/A | COMPETITORS_2.md | — |
| F4 ZIGChain deeper | Working (unit only) | Mounted: staking-clarity (`components/earn/earn-view.tsx`), practice-journey (`start-here-path.tsx`), staked-purpose (`wealth-view.tsx`), token check (`app/app/ecosystem/page.tsx:7`), proposal extras (`proposal-card.tsx`); U `lib/zigchain-eco/components.test.ts`; Help `help-page.tsx:354,360` | No browser spec for staking clarity or the token check; EVM recorded as not built |
| F5 new features | Working | B wiring-health:228,251,320; wiring-wealth:101,153; wiring-review:44,173; goals-best-aa (challenges); U lib/wrapped, lib/search/actions | `TodayWrappedCard` (`components/wrapped/wrapped-door.tsx:41`) is exported, never mounted (Q24) — dead code |
| F6 visual upgrade (helper part) | Working | U pillar-art.test.ts | — |
| F7 landing refresh | Working | `scripts/landing-f7-visual.test.mjs`, check:landing | Owner deploys |
| F8 performance and a11y | N/A | SESSION_AK_F8.md | — |
| F9 ZIGi for everything new | Working | B j08; U budget-ak | — |
| F10 security delta | N/A | SESSION_AK_F10.md | — |
| F11 Studio-4 preparation | Working | `scripts/zigi/studio4-dry-run.test.mjs` | Superseded by Part 13 |
| F12 finish | N/A | Moved into Z4 | — |
| Q1 wiring audit | N/A | WIRING_AUDIT.md; Q1F specs `tests/wiring-{goals,habits,health,review,wealth}.spec.ts` | — |
| Q2 X1 verification | N/A | `7d5d5114`, `18ee388b`, `fd5ae70f` | — |
| G1 BUILD list 2 | Working | B g1a-*, g1b-*, g1-insight-feedback, `tests/unkept-chat-ak.spec.ts` (#20) | Row omits #20 (built in `8726fa0a`) (C1) |
| G2 release review 2 | N/A | RELEASE_REVIEW_2.md; `tests/release-review-2-p2.spec.ts` | R2-7/R2-10/R2-15 owner decisions recorded |
| G3 visual system | Partly | EmptyState art, chart look, sheen (`21f404ef`) | Health's own empty states are still plain text: Foods "Your library starts with your first food.", Recipes, Weight history "No weight readings yet." (`components/health/health-app.tsx:427,428,488`) — the row itself says "health-app empty states left" |
| G4 journeys on phones/themes | Working | j01–j03, j06 × desktop/phone × 3 themes; `tests/habit-paint-first.spec.ts` | — |
| G5 exploratory | N/A | EXPLORATORY_BUGS.md; `tests/exploratory-exf.spec.ts` | — |
| G6 intermittents | N/A | process | — |
| G7 F10 Lows/Infos | Working | U (06e86e00) | — |
| G8 tools for G1 | Working | B `tests/wiring-2-g1-tools.spec.ts:22,51`; Help `ak-zigi-more` (`help-page.tsx:355`) | — |
| N0 NOVA research | N/A | NOVA.md | — |
| N1 one engine, two companions | Working | ZIGi "Continue in NOVA" (`components/ai/ai-chat.tsx`); Duo on the dashboard (`components/nova/nova-dashboard.tsx` → `chat/nova-duo.tsx`); B nova-chat, nova-wa N1; U lib/nova/duo.test.ts | — |
| N2 the NOVA page | Partly | Sidebar NOVA, ⌘/Ctrl+J, PWA shortcut "NOVA", Search; B nova-dashboard, p1-nova-make, p1-nova-live, p3-nova-polish | "Each widget opens its page with a shared-element transition" is **not built** (recorded only in `docs/performance/SESSION_AK_MOTION.md:27`); the ADR row says "Built" without the exception |
| N3 setup guide | Working | `/app/nova/setup`; B nova-setup; U lib/nova/setup.test.ts | — |
| N4 NOVA reads everything | Working | B nova-setup (exact pack), nova-chat R2-2 | — |
| N5 NOVA acts | Working | B `tests/wiring-2-nova-cards.spec.ts:28`, nova-chat | — |
| N6 briefs and workflows | Working | B nova-workflows | — |
| N7 long-term memory | Working | Restore `lib/restore/plan.ts` memoryPart; U `lib/restore/memory-restore.test.ts`; B nova-workflows | — |
| N8 always open | Working | B `tests/wiring-2-nova-start.spec.ts:38,155` | — |
| N9 safety and privacy | Working | U privacy-cross-path, nova-injection, zf-security, untrusted; B nova-setup, nova-hermes | — |
| N10 tests incl. the NOVA journey | Partly | `tests/journeys/j12-nova.spec.ts:79` (planets 1–3, on-device answers, MOCK local brain, task card + Undo, MOCK Hermes, Permissions) | The journey still lacks N10's **brief, workflow run, ZIGi delegation, Share my NOVA setup and erase** steps (each only in its own spec) |
| N11 Hermes Agent | Working | `/app/nova/hermes`; Showcase example; B nova-hermes, nova-wa, j12; Help `nova-hermes`; landing link; PRIVACY | — |
| N12 whole screen | Working | B nova-dashboard (1024/1440/1920, 390); wake phrase only with on-device recognition (`components/nova/use-wake.ts:8`) | — |
| B1–B5 notes | Working (5 rows) | B notes.spec, notes-ask.spec, wiring-2-r2:81; Help notes-what | Voice/photo capture unit only |
| T1–T3 tasks, .ics, Pomodoro | Working (3 rows) | B tasks-time, nova-wa T1/T3, g1a-focus-rounds | — |
| M0 motion research | N/A | MOTION_2026.md | — |
| M1 web-native motion | Partly | `app/app/template.tsx` transitions; goal title morph (`components/motion/goal-title-morph.tsx`; B goal-morph-ak, motion-m) | NOVA widget → page morph not built (recorded in SESSION_AK_MOTION.md:27, not in Known limitations); the ADR row is stale ("shared-element morph not built" — one is) |
| M2 next-gen surfaces | Partly | `.zg-glass`/`.zg-aurora` on NOVA (B p1-nova-make "M2 on NOVA") | **Bento for Today's non-protected area and the pillar overviews** — not built and **not recorded** anywhere but WIRING_AUDIT_2 |
| M3 ambient and attention | Working | Running now chips (`components/nova/live/live-chips.tsx`; B p1-nova-live; U live-activity.test) | ADR row and SESSION_AK_MOTION.md:42 ("nothing new built") stale |
| M4 Motion Full/Calm/Off | Working | Settings → Appearance → Motion; B motion-m; U lib/motion/level.test | — |
| M5 performance before/after | Working | P8 after-numbers (`docs/performance/SESSION_AK_MOTION.md`) | Row still says "after pending" (C1) |
| M6 landing NOVA chapter | Working | `landing/index.html:125`; `scripts/landing-nova-m6.test.mjs` | Owner deploys |
| M7 parity, layout audit, contrast | Working | layout/parity/contrast runners | — |
| Z1 security review | Working | Z1A/B/C; specs wiring-2-photo-send, wiring-2-nova-start, landing-z1c-l4 | — |
| Z2 exploratory again | N/A | with G5 | — |
| Z3 wiring audit 2 | N/A | superseded by this audit | — |
| Z4 F12 | Open | — | — |
| 5.1 first Monday of the month | Working (unit only) | Habit editor "Which Mondays" (`components/habits/habit-editor.tsx`); U lib/habit-month-weekday | — |
| 5.7 time-of-day sections | N/A | Already done (Session AA) | — |
| 6.5 progress toast | Working (unit only) | `components/platform/contribution-flow.tsx:35` → `lib/progress-toast/moved.ts:16`; U moved.test.ts; Help `ak-progress-toast` (`help-page.tsx:359`) | No browser spec shows "That moved … to N%." |
| 7.8 Wealth polish | Working | `d2105402` (Bills/Budgets ShowcaseTag, status lines), `efdd361e` | Row says "Partly … rest open (F0x lane)" (C1) |
| 8.1 unified weekly review | Working | B life-review-aa | — |
| 8.2 daily orbit card | Working | B wiring-review:85 | — |
| 8.3 weekly insight | Working | B wiring-review:28 | — |
| 8.4 monthly balance note | Working | B wiring-review:28 | — |
| 8.5 share cards | Working | B life-review-aa | — |
| 8.6 badges | Working | B journey.spec; U badges-setting | — |
| 8.7 point-and-tell | Working | B point-tell.spec:22 | — |
| 8.9 visible sync status | Working | `components/workspace-status.tsx`; U lib/sync-status/status.test.ts, workspace.client.test.ts | — |
| Notifications card "being switched on" | Working | B pwa-ak:72 | — |
| Part 10 #1–#22 (22 rows) | Working | #1, #10, #11, #22 B j03; #2, #8, #9 B wiring-health:292,320; #3 wiring-health:134; #4, #7, #20 wiring-health:45,70,92; #5 j02; #12, #18 wiring-wealth:68; #14, #16, #19 wiring-review:124,151,106; #17 wiring-wealth:123; #21 wiring-habits:28; #6, #13, #15 unit only (lib/mood-words, lib/year-pixels, food-lookup-route grade=1; the Journal opens from Search, wiring-review:66) | — |
| Part 10 #23 | N/A | see 5.7 | — |
| Part 11 visual, layout, tour | Partly | Tour `44a44fe2` (U lib/tour; B help-page, whats-new); layout via F6/G3/M7 | A12 rows routed to Part 11 — **LA6 D-196** (dark column widths) and **AF15 parts 2, 3** (Health import stress readings; Academy name under the lesson bubble) — have no closure record |
| Part 12 ZIGi tools, Studio-4 prep | Working | B j08; U lib/ai, lib/zigi-studio4 | — |
| Part 14 leftovers, verifier, docs, landing | Partly | Verifier `d80a1d0d`; Help `44a44fe2`; landing `ac6c2d86`; F0 did the rest | AFL4 practice-badge memo and AFL3 re-verify (as F0); row text "the rest F0x" stale |
| Part 15 security review | Working | SESSION_AK_RM12.md; fixes with tests | — |
| Part 16 finish | Open | — | — |

### A1–A22 and D1–D12, MUSIC, RAMP

| Row | Verdict | Evidence | Gap |
|---|---|---|---|
| A1 snapshot and action queue | Working (off until activation) | B j05, j05b, j05c; U lib/notify; DBs erased (`lib/erase-everything.ts:13`) | — |
| A2 every push shows a notification | Working | B pwa-ak:85; `public/sw.js:272` | — |
| A3 one push path | Working | B pwa-ak, j05, j06; `public/push-sw.js` (Q19 handler only) | — |
| A4 caching; Erase clears caches | Working | B pwa-ak:18,34; j06b | — |
| A5 free-plan sizing | N/A | PUSH_PUBLIC_ALPHA.md | — |
| A6 storage headroom | Working (unit only) | as the Part 3 row | — |
| A7 wallet honesty | Working | Help `ak-wallets` vs WALLETS.md | — |
| A8 QR v1–20 | Working | U lib/qr | — |
| A9 Reown allowed domains | Working (copy; owner step) | "being switched on" in UI and Known limitations | — |
| A10 food deploy order | Working | `scripts/check-deployment-configs.mjs:304`; `docs/run11/FOOD_WORKER_PUBLIC_ALPHA.md` | STATUS owner list (Z4) |
| A11 Fineli | N/A | Waiting; Known limitations says it | — |
| A12 leftover sweep | Partly | Most rows closed (F0, G6, AH/AI/AJ) | LA6 D-196, AF15 parts 2/3, AFL4 practice-badge memo, AFL3 re-verify: no closure; the A12 row "M4 (QA2-04)" now carries the Motion M4 text instead of the knock-reminder zone fix (`d2105402`) |
| A13 mainnet v6 | N/A | owner check | — |
| A14 bank files | Working | B j03 | — |
| A15 importers | Working | B switch-more-ak, j10 | — |
| A16 export bridges | Working | B wiring-review:151 | — |
| A17 point-and-tell text | Working | B point-tell:22 | — |
| A18 manifest screenshots | Working | `public/manifest.webmanifest` (4 labelled "(Showcase, fictional)"); B install-manifest | — |
| A19 tour | Working | B help-page, whats-new; U lib/tour | — |
| A20 landing copy | Working | `scripts/landing-ak-claims.test.mjs` | — |
| A21 PR-review Action | Open | Z4 | — |
| A22 quality lines | N/A | ADR §A22 | — |
| D1 push built, off | Working | as Part 2 | — |
| D2, D3, D4, D8 | N/A (4 rows) | recorded | — |
| D5 no real-model calls | N/A | held | — |
| D6 Studio-4 art | Working | Part 13 rows | Row says "Moved to a separate session" (C1) |
| D7 exchanges | Working | B wiring-wealth:22 | — |
| D9, D10 | N/A (2 rows) | held | — |
| D11 security review | Working | Part 15 | — |
| D12 visual polish | Working | F6, G3, M1–M7 | Row says "Partly; F6" (C1); G3's leftover above |
| MUSIC | Working (unit only for mix/links/BYO) | as 1d | — |
| RAMP/BANXA | N/A | recorded | — |

### Follow-up 4, follow-up 5, decision 6, Part 13

| Row | Verdict | Evidence | Gap |
|---|---|---|---|
| P1 WIRING_AUDIT_2 to zero | Working | `82fde1c7`; p1-nova-make, p1-nova-live | Its 7 Partly leftovers are N2/M1 (morph), M2 (bento), N10 (journey) above |
| P2 RELEASE_REVIEW_2 to zero | Working | `tests/release-review-2-p2.spec.ts`; hosted-alpha-stages.test.mjs | — |
| P3 NOVA wow review and polish | Working | `tests/p3-nova-polish.spec.ts` | Row says "browser re-run pending" (C1); ND-24 for the owner list |
| P4 first-run review | Working | `tests/p4-first-run.spec.ts` | — |
| P5 landing review | Working | `scripts/landing-p5-review.test.mjs` | — |
| P6 accessibility sweep | Working | `3cb26b05`: `tests/p6-axe-all.spec.ts`, `p6-axe-surfaces.spec.ts`, `p6-keyboard.spec.ts` | Row still says "In progress" with no commit (C1) |
| P7 exploratory round 3 | Working | `tests/exploratory-round3.spec.ts` | — |
| P8 performance after | Working | SESSION_AK_MOTION.md | — |
| D-FR17 | Working | `lib/habit-form-fold.test.ts`, `tests/fr17-habit-more-options.spec.ts` | — |
| D-OD1 "Jarvis" out of public copy | Working | grep: no "Jarvis" in landing, components, lib, app; `scripts/landing-nova-m6.test.mjs` | — |
| D-OD2 STATUS owner list | Open | Z4 | — |
| D-OD4 Privacy after NOVA | Working | `landing/index.html:125-126`; landing-p5-review (OD-4) | — |
| D-OD5 mark re-encoded | Partly | 54,908 → 51,134 B (`c8dcaffb`) | The row says the 2× retina file is in "Known limitations and the owner list": it is in neither (Help, STATUS, AK_RESUME have no such line) |
| C1 closing table true | Open | — | See "Records to correct" |
| C2 WIRING_AUDIT_3 | N/A | this file | — |
| C3 suite twice + CI twice | Open | — | — |
| C4 AK_DEMO_TOUR | Working | `docs/handoff/AK_DEMO_TOUR.md`; send-feedback, whats-new specs | — |
| D6-CL Checklist :has() rules | Working | `4c52ee1d`; 11 pin/AG Polish specs unchanged | — |
| D6-EARN Earn's load accepted | Working | Help Known limitations `help-page.tsx:421`; send-feedback.spec | — |
| P13-R1 delivery verified | N/A | `59d2cfe4`; `docs/verification/session-ak/STUDIO4_RECEIPT.md` | — |
| P13-R2 handoff followed | Working | `d5177683`, `90c8799e`; receipt | — |
| P13-R3 imported and wired | Working | `components/path/path.tsx`, `path-zigi.tsx` (X030), `public/sw.js:104` (PUSH_ART); U host-facts, variants, push-art | X001, X020–X022 unused — in Known limitations (`help-page.tsx:419`) |
| P13-R4 2× set lazy | Working | zigi-assets.test; weight budget | — |
| P13-R5 X030 on the Checklist cheer | Working | `components/path/path-zigi.tsx`; checklist pin specs | — |
| P13-R6 optical centre, tests | Working | `tests/zigi-alive.spec.ts`, `zigi-emotions.spec.ts`, theme-parity-af | — |
| P13-R7 imported files only, Known limitations, demo step | Working | three Known limitations lines (`help-page.tsx:417-419`); AK_DEMO_TOUR 6b | — |

### Q readings that promise behaviour (not counted above)

| Reading | Verdict | Evidence |
|---|---|---|
| Q3 device push Worker, 503 until switched on | Working | `app/api/push-device/route.ts:9-24`; `scripts/run11/push-device.test.mjs` |
| Q4 one service worker; nothing private cached | Working | `public/sw.js`; B pwa-ak:34; public-safety.test |
| Q5 FOOD_LOOKUP on the Alpha | Working | `wrangler.alpha.jsonc:13` |
| Q6 /app/music; own Spotify id device-only (IndexedDB) | Working | `lib/music/spotify/byo-store.ts:10` (`zigoals-music-byo-v1`), erased |
| Q8 Lichess PKCE, board:play, token device-only | Working | `zigoals-lichess-v1`; B chess-play-ak; PRIVACY:168 |
| Q9 hand-written QR | Working | `lib/qr`, U |
| Q10 generic library cached in IndexedDB | Working | `lib/food-generic/store.ts:11`; erased |
| Q12 one quiet-hours value | Working | `lib/notify/plan.ts:14-49` |
| Q13 WalletConnect lab only in tests/Showcase | Working (held) | routed relay in j07 only; no route added |
| Q14 30-day pace and what-if | Working | 6.2 |
| Q15 one push path | Working | B pwa-ak, j05 |
| Q18 AFL9 signer in execute.ts | Working | `lib/staking/execute.ts` |
| Q19 /push-sw.js unchanged but one message handler | Working | `git diff 7000807 -- public/push-sw.js`: only the `zigoals:push-sw-activate` handler. The ADR's Q19 text has the amendment spliced into the middle of its sentence (lines 77–80) |
| Q20 price alerts checked by the worker with the daily notifications | Working (off until push) | `public/sw.js:60-76`; Known limitations "Price alerts check only while ZIGoals is open" stays true |
| Q21 Verify frame sources | Working | egress-policy frame list |
| Q24 Today Wrapped card built, not mounted | Partly | `components/wrapped/wrapped-door.tsx:41` is dead code until 1 December — against the owner's "no dead code" |
| Q25 vote reminder per proposal; unbonding to Agenda only | Working | `components/zigchain-eco/proposal-extras.tsx`; `components/agenda/agenda-extras.ts:14` |
| Q28 one engine | Working | N1 |
| Q26/Q27 | N/A | reversed by M1 |
| Q1, Q2, Q7, Q11, Q16, Q17, Q22, Q23, Q29–Q32 | N/A | records |

## Gaps to fix (each: row → what is missing → the smallest fix → where)

1. **N10 / j12** → the NOVA journey lacks the brief, a workflow run, the ZIGi delegation, Share my NOVA setup and the erase
   step → append five steps to the existing journey, reusing nova-workflows' MOCK brief/workflow, nova-wa's delegation
   and nova-dashboard's share-setup helpers, ending with Settings → Erase everything and a check that `zigoals:nova*`
   keys and the AI memory are gone → `apps/web/tests/journeys/j12-nova.spec.ts:79` (or, if not done, say "covered by
   separate specs" in the ADR N10 row and drop "journey" from its promise).
2. **N2 + M1** → widget → page shared-element morph not built → not finishable safely in this PR (each pillar page loads
   after mount); record it in the ADR N2 and M1 rows (N2 says "Built" with no exception; M1 still says no morph was
   built though the goal morph was) and in STATUS's Known limitations (not Help: no user-facing promise) →
   `docs/architecture/ADR-036-session-ak.md:794,814`.
3. **M2** → bento for Today's non-protected area and the pillar overviews not built and not recorded → record the reason
   (Today's widget kinds are a strict stored enum, `lib/dashboard-settings.ts`; the area borders the PROTECTED hero) in
   the M2 row and SESSION_AK_MOTION.md → `ADR-036-session-ak.md:815`.
4. **G3** → Health's own empty states have no pillar art → wrap the three empty lines in the existing `EmptyState`/`ArtNote`
   (health pillar) as the other Health cards do (`components/health/supplements.tsx`, `measurement-trends.tsx`) →
   `apps/web/components/health/health-app.tsx:427` (Foods), `:428` (Recipes), `:488` (Weight history); or record it.
5. **F0 / Part 14 / A12 — AFL4** → the prefix-free practice-badge memo (A12 "a → 14", F0 item 2) is neither built nor
   recorded → record it as class c/d with the reason (it would be a new signed memo; "nothing new signed" in F4) in the
   A12 table → `ADR-036-session-ak.md:155`.
6. **A12 — AFL3** → "re-verified in 14" has no record (AFL1 and RM4 have dated re-verifications) → add the dated line →
   `ADR-036-session-ak.md:154`.
7. **Part 11 / A12 — LA6 D-196 and AF15 parts 2, 3** → routed "a → 11", no closure → mark closed by M7's layout audit if its
   288 states cover dark column widths, Earn's Start-here path and Health import with stress readings; otherwise record
   them as not reproduced/not done → `ADR-036-session-ak.md:160-161`.
8. **D-OD5** → the 2× retina mark is promised to "Known limitations and the owner list" but is in neither → add one line to
   STATUS's owner list (it concerns the landing, so not the app's Help) → `docs/STATUS.md` AK entry (Z4) and
   `docs/handoff/AK_RESUME.md`.
9. **Q24 dead code** → `TodayWrappedCard` and `useTodayWrappedCard`'s Today use are exported but never mounted → either delete
   the Today card (Journey and Search remain the doors) or keep it and say in the ADR Q24 line that it ships unmounted on
   purpose → `apps/web/components/wrapped/wrapped-door.tsx:37-50`.

Test-depth notes (not gaps under this audit's rule; the lead may add browser specs): 1d/MUSIC mix of three, playlist links
and own Spotify id on `/app/music`; 6.5 progress line; A6 nearly-full line; 5.7 reorder/compact; 4.9 wake consistency;
5.1 first Monday; F4 staking clarity and token check; #6 mood words, #13 year in pixels.

## Records to correct (C1; code is fine, the ADR text is not)

| Row (ADR line) | Says | Truth at the head |
|---|---|---|
| M5 (818) | "after pending" | P8 after-numbers done (`5ed28b27`, `e123fe36`, `8ce89709`) |
| P6 (947) | "In progress", no commit | Done: `3cb26b05` (+ `eb3d6102`, `620d13d7`) |
| P3 (944) | "browser re-run pending" | re-run result to state (C3) |
| 7.8 (828) | "Partly … rest open (F0x lane)" | Done in F0 `d2105402` + `efdd361e` |
| Part 11 (861) | "the full pass is F6" | F6/G3/M7 done; LA6/AF15 open (gap 7) |
| Part 14 (863) | "the rest F0x" | F0 done; AFL4/AFL3 open (gaps 5, 6) |
| A12 (877) | "Partly; rest in F0" | as gaps 5–7 |
| D12 (899) | "Partly; F6" | F6, G3, M done; G3 leftover (gap 4) |
| Part 13 (767), D6 (893) | "Moved to a separate session" | Restored and done (P13-R1…R7) |
| 8.9 (764) | "test restore, backup reminder · Built: a visible sync status" | Test restore and backup reminder are built (j06); the sync status is the other 8.9 row |
| A12 "M4 (QA2-04)" (158) | Motion Full/Calm/Off text, `f88b8ab8` | It is the knock reminders in the journal's zone, fixed in `d2105402` |
| Verify-then-do 5.1, 6.5, 8.9 (109, 120, 137) | outcome text pasted into the State/Found/Action columns | restore the original columns or move the outcome to the closing table |
| G1 (784) | lists no #20 | #20 "Don't keep this chat" built in `8726fa0a` |
| M1 (814), M3 (816) | no morph built; no chips | goal morph (`8726fa0a`) and Running now chips (`82fde1c7`) built |
| Z3 (823) | "7 Partly with owners" | after this audit: N2, N10, M1, M2 Partly; R2-10 owner decision |
| Q19 (77–80) | amendment spliced mid-sentence | move "*Amended …*" after the sentence |
| `docs/performance/SESSION_AK_MOTION.md:42` | M3 "nothing new built" | Running now chips built by P1 |

## For Known limitations (cannot be finished in this PR; honest wording)

For **Help** (`help-page.tsx` Known limitations) — none of the gaps above needs a new app line; every user-facing limit
found is already there (push and food "being switched on", Fineli, WalletConnect/Keplr Mobile, Garmin, Lichess speeds,
photo/label AI, grocery ticks, Checklist sync, Studio-4 polish, Earn's 3.9 s). One wording check: the older line
"Reminders when ZIGoals is closed … need a signed-in account" (`help-page.tsx:381`) now sits beside the AK line saying
device notifications need no account (`:394`, `:409`); consider folding the older line into the AK one so a reader does
not see two answers.

For **STATUS** (the Z4 entry's Known limitations / owner list), proposed wording:
- "NOVA's widgets open their pages without a shared-element transition; only a goal card's title moves into its page
  (Motion Full)."
- "Today and the pillar overviews keep their current layout; the bento grid is on NOVA and the landing only (Today's
  widget kinds are a stored format, beside the protected hero)."
- "The NOVA journey (j12) covers the guide, on-device answers, a local and a Hermes brain, a card with Undo and
  Permissions; briefs, workflows, delegation, setup sharing and erase are covered by their own specs." (only if gap 1 is
  not done)
- "Owner: a larger original of zigoals-mark-v3 is needed for a 2× retina hero file (the repo's is 422×480)."
- "AFL4's practice-badge memo is not built (it would add a signed memo; AK signs nothing new)." (wording per gap 5)
- "Health's food, recipe and weight lists keep a text-only empty state." (only if gap 4 is not done)
- "ZIGoals Wrapped's Today card is built and switched off until 1 December; Journey and Search open Wrapped." (only if
  gap 9 keeps the card)

## For the lead (judgement calls, not counted)
- Help shows chain/wallet words to a fresh device (Known limitations `help-page.tsx:382,398,399,401,413`; `ak-wallets`),
  partly pre-AK. If Help must follow "chain invisible", put the Earn/wallet lines under a "If you use Earn" sub-list shown
  only once the chain is chosen, and add Help to `tests/consumer-first-x1.spec.ts`.

## Browser spot check
Two short headless runs (Chromium, 1440×900, a fresh profile, service workers blocked, every outside host aborted and every
app `/api/*` answered 503; `stray: []` in both), under the browser lock. Scripts and output:
`/tmp/claude-0/-home-user-ZIGoals/a64d6793-df8d-5435-a8c1-37163e44c609/scratchpad/wa3/` (`r1.js`, `r2.js`, `*.out`).
- **NOVA** (`/app/nova`, fresh): left panel "Your space · Everything stays on this device", pillars, 8 pages, agents NOVA
  and ZIGi; "Brain · On-device answers"; "Sees · Today, Goals, Habits, Wealth · Health off"; "Give NOVA a brain of its own
  … Start the guide". No chain word.
- **Notes, Tasks, Music** (fresh): no chain word.
- **Settings → Notifications** (fresh): "NOTIFICATIONS · Being switched on … Notifications are being switched on. Your
  reminders still show inside ZIGoals." No Turn on button. Matches Help.
- **Chain words a fresh device does see:** Today's hero "Onchain · ZIGChain vision · Alpha simulation." (the PROTECTED hero;
  RELEASE_REVIEW R28, left for the owner) and "No wallet or account needed."; Settings' older backup lines ("no wallet
  credentials", "Wallet credentials and secrets are never included") and Erase everything's "anything public on a
  blockchain". None of these is an AK surface; listed for the owner's R28 decision.
