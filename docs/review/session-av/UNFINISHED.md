# Session AV Part 4b — unfinished-feature audit

Everything started and not finished in the app, read 20 Nov 2026 on `feature/session-au-dress-rehearsal` (a read-only sweep: docs and code, no build, no browser). Sources: `docs/review/session-al/NEXT_SESSION_BACKLOG.md`, `CI_INTERMITTENTS.md` (rows not marked fixed), `CARRIED.md` (the only CARRIED.md under docs/), `docs/review/session-au/REHEARSAL.md` (verdict Carried), the carried lists of ADR-038 to ADR-044, the polish picklists (`docs/review/session-al/EARLIER_SCOPE.md`, picklists 1 and 2 and their Part 14 verdicts), and a sweep of `apps/web` (components, lib, app): TODO/FIXME, "coming soon"/"not yet"/"placeholder" copy, a sample of `disabled={…}` controls, NOVA's widget catalogue against its components, routes against the navigation, search and Help, and Help's Known limitations. Later ADRs and the code decide a row's status where an earlier list said "carried". Paths are under `apps/web/` unless they start with `docs/`, `landing/`, `scripts/` or `.github/`.

## Owner decisions

Session AV, owner follow-up 1: the rows that need your decision or your own action, one line each (`needs the owner` below). Nothing here is built. Two rows were small calls within the rules and are decided with the rules' default instead (CR-17, CR-20).

| id | question | recommended default | effort |
|---|---|---|---|
| BL-2 | Send a daily snapshot (net worth, the day) as a notification? | Not before push is switched on; Today's wealth line meanwhile | S, after push |
| BL-7 | What should ZIGi be over weeks (a companion arc)? | Keep today's on-device states; decide after the friends' first month | L |
| BL-9 | Multichain portfolio, hardware wallet, multisig? | Not in Alpha; a Beta scope question | L |
| BL-16 | "Start your fast" while the app is closed? | Build once push is on (the in-app card exists) | S, after push |
| CR-2 | Turn the food lookup provider on? | Yes: set the deployment setting (OWNER_STEPS) | owner action |
| CR-6 | Tick several items with one confirm? | Keep one at a time (pinned in AT D4, said in Known limitations) | M |
| CR-18 | Section-level Showcase lines (D-003) and the words "Sleep debt" (D-090)? | Keep both as they are | S |
| CR-19 | Should Erase name each area it erased? | Yes, using the export catalogue's areas | S |
| M-9 | Goal creator step 1: "Create goal" beside "Continue", and the 0/80 counter? | Keep Continue as the main button; show the counter from 60 characters | S |
| M-10 | A visible close while the Checklist's celebration clip plays? | Keep: a tap skips to the words, Escape closes (your amendment 2 design) | S |
| L-9 | ZIGi titled "AI Companion" with a Premium badge while answers say "no AI"? | "ZIGi · your companion"; no Premium badge during the Alpha | S |
| A38-1 | Deploy the weather proxy Worker? | Yes, before friends rely on weather | owner action |
| A38-2 | Redeploy private-sync so NOVA's section travels? | With the next sync deploy | owner action |
| D20-5 | Health's counters before any food or water? | Keep (they feed the protected Checklist path, R2-15) | — |
| D20-8 | NOVA's two "no AI used" lines and its phone hint? | Keep (AR's protected composition) | — |
| PK-4 | Split the 5.1 MB market catalogue download? | Later; it loads once and stays offline | M |
| PK-5 | Re-encode ZIGi's 2–2.4 MB idle clips? | Yes, same look at a lower bitrate, after you compare | M |
| PK-6 | A moment for ZIGi's "hello in place" (X001)? | The first open of the day when ZIGi is already on screen | S |
| PK-7 | A smoother R013 hide move (the arm)? | A Studio-4 revision | owner art |
| PK-8 | HEVC-alpha MOV clips? | Make them on your Mac | owner action |
| PK-9 | A sharp 2× brand mark? | Send the original file | owner file |
| PK-10 | Hide the chain Help topics when no chain is chosen? | Yes | M |
| PK-11 | A prefix-free practice-badge memo? | No (no change to signing) | — |
| PK-13 | The Fineli (Finnish) food table? | Send the raw files, then import | owner file |
| PK-14 | Your OroSwap LP and USDC vault shares on Earn? | Check with a real address after the deploy | owner action |
| PK-15 | The hosted verifier's late /api/push abort? | Read it on your next hosted verifier run | owner action |
| PK-16 | Dependabot alerts in build tooling (glob, minimatch)? | Approve the dev-only bumps | S |
| PK-18 | ZIGi's cloud send with no privacy mode chosen? | Guarded (the redacted preview first) | S |
| PK-20 | WalletConnect and Keplr Mobile on a real phone? | Add Reown's allowed domains, then test on your phone | owner action |
| PK-21 | Pre-filled Ramp and Banxa hand-offs? | Send the providers' public IDs | owner action |
| PK-22 | Switch push on (reviews, snooze, price alerts while closed)? | Yes, after the Alpha's first week | owner action |
| PK-23 | The landing's two numbering systems; guide finales as a small orb? | Keep | — |
| CS-3 | Plans' placeholder prices? | Keep, labelled, nothing charged in the Alpha | — |
| CS-4 | Hosted ZIGoals AI? | Not in the Alpha | L |
| KL-3 | Open accounts on alpha.zigoals.app? | After the Alpha's first week | owner action |
| KL-4 | Redeploy sync so the Checklist travels? | With the next sync deploy | owner action |
| KL-5 | Register with Oura, Withings, Polar and Strava? | Later; file imports work | owner action |
| KL-6 | Spotify's app approval for everyone? | Apply when friends ask for it | owner action |

Status: `open` (needs work, no outside service, model or owner: the next step is named) · `hidden honestly` (not reachable, or says plainly it isn't there) · `carried` (with its cause) · `needs an outside service` · `needs a model` · `needs the owner` · `finished` (the file that proves it).

| id | what | file | status | cause / next step |
|---|---|---|---|---|
| **A** | **NEXT_SESSION_BACKLOG.md (AL, 18 ranked items)** | | | |
| BL-1 | "Perfect day" view with past days (rank 1, GAP-087) | components/habits/perfect-days.tsx | finished | built in AO (ADR-039 closing, `aa67f009`) |
| BL-2 | Daily snapshot message: net worth / day summary (rank 2, GAP-041) | — | needs the owner | needs a channel: push is off until the owner switches it on, email is an outside host; in the app it is Today's wealth line |
| BL-3 | Flexible day goal "4 of 6 counts" (rank 3, GAP-088) | components/settings/day-goal-setting.tsx | finished | "A day counts as done at N" built in AP (owner 4b, ADR-040 D10) |
| BL-4 | P&L row and logging from the week grid's cells (rank 4, CO4) | docs/architecture/ADR-039-session-ao.md | finished | built in AO: cells open that day's check-in, the P&L row labelled (`aa67f009`) |
| BL-5 | DeFi positions and any-address P&L (rank 5, GAP-019) | — | needs an outside service | new chain/indexer sources and a TIER 3 egress review |
| BL-6 | An AI copilot that explains a chart (rank 6, GAP-013) | — | needs a model | anything beyond the on-device facts needs a connected model |
| BL-7 | ZIGi as a companion over weeks (rank 7, GAP-111) | — | needs the owner | a judgement on ZIGi as a whole, not a single gap |
| BL-8 | Bento layout for the pillar overviews (rank 8, M2) | components/bento/bento-switch.tsx | finished | Bento view built in AP (owner 4c, ADR-040 D13); Today's hero stays protected |
| BL-9 | Multichain portfolio, hardware wallet, multisig (rank 9, GAP-161) | — | needs the owner | Beta scope; wallet signing is out of scope |
| BL-10 | Chess: built-in opponent / playable board (rank 10, GAP-131) | app/app/chess/page.tsx | carried | a chess engine is a product of its own (weight budget, worker) |
| BL-11 | Net worth history by source (rank 11, CO6) | components/wealth/networth-history.tsx | finished | built in AO (`e2452897`); starts the day it is recorded, never back-filled |
| BL-12 | Help screenshots (rank 12, GAP-159) | components/help/help-page.tsx | finished | built in AT (ADR-043 D14), reframed in D20 |
| BL-13 | Calorie-burn estimate (rank 13, GAP-069) | — | hidden honestly | owner rule: "No calorie expenditure is estimated" |
| BL-14 | Strides import preset (rank 14, GAP-177) | lib/import/switch/formats.ts | hidden honestly | Strides publishes no export column format; shown "off" like Streaks |
| BL-15 | 150+ goal and habit templates (rank 15, GAP-118) | components/goals/template-library.tsx | finished | 252 templates in AO (`8c6c7b2b`) |
| BL-16 | "Start your fast" notification while the app is closed (rank 16) | components/health/fasting-timer.tsx | needs the owner | waits on push; in the app Today's "Fasting end" card and the meal prompt exist |
| BL-17 | Meal estimate from a photo (rank 17, GAP-076) | — | needs a model | no on-device model in the browser; works with the person's own AI; no fake estimate |
| BL-18 | Live wearable sync (rank 18, GAP-108) | components/health/devices/health-links.tsx | needs an outside service | a host per vendor (TIER 3 egress); file imports are built |
| **B** | **CARRIED.md (AL, 112 ids), as later sessions closed them** | | | |
| CR-1 | 23 service ids: stale "Current" badge, price drift ×3, unformatted prices, market logos ×2, catalogue search ×2, ninth favourite, D-176, barcode ×3, validators, claim price, jailing, votes, BN-081, N-BN-17, X3-29 | tests/ap/service-rows.spec.ts | finished | replayed against recorded upstreams: Holds (ADR-040 D19); C-BN-06's raw status fixed (`7e24a448`) |
| CR-2 | Barcode/food lookup provider inactive (CARRIED "Oct-26 gap"; Known limitations: food search, barcodes, US foods) | app/api/food-lookup | needs the owner | a deployment setting (docs/friends-alpha/OWNER_STEPS.md); Help says it waits for the owner |
| CR-3 | DV-089: NOVA's workflow that makes goals | lib/ai/actions/plan.ts | needs a model | runs only with a connected AI; on the device NOVA offers "Open the form" |
| CR-4 | PR-035: ZIGi's monthly cap seen in use | components/ai/ai-data-usage.tsx | needs a model | the cap counts only a connected model's usage |
| CR-5 | BN-034: prompt size on a real model | lib/ai/tools/registry.ts | needs a model | closed with cause in AT D4 (needs a running model) |
| CR-6 | Bulk tick with one confirm (LS:#012, #194, #351, C-LA-07) | lib/ai/actions/plan.ts | needs the owner | a new write path: owner decision; the honest "one item at a time" is pinned (AT D4) and in Known limitations |
| CR-7 | BN-050, N-127, N-153 | docs/architecture/ADR-040-session-ap.md | finished | closed: nothing to replay (cross-reference, retracted, no steps) |
| CR-8 | L7 answers Z-057, NB:N11, TK:1, TK-048, TK-052 | lib/ai/evals/as/at-l7.test.ts | finished | fixed in AT D4 |
| CR-9 | LS:#046, PR-028, DV-077, DV:N-045, N-DV-03 | docs/architecture/ADR-043-session-at.md | finished | closed in AT D4 (UI, not answers; AL's "Changed" evidence stands) |
| CR-10 | MO-052: Health refusal without an inline button | tests/au/sanne.spec.ts | finished | AU F-2 + D-ALLOW-HEALTH (one Allow Health button in replies) |
| CR-11 | Dutch coin questions "hoeveel BTC heb ik" (AT D4 carried) | lib/ai/evals/as | finished | AU D-NL-COINS |
| CR-12 | D-088 / N-BN-10: Settings folded by default | components/settings/pages-settings.tsx | finished | built in AP (D7, D20; deep links open their group) |
| CR-13 | D-028: Today ≤ 90 Tab stops | tests/at/today-tab-stops-week.spec.ts | finished | 88–89 on all 14 clocks of a week (AT D3) |
| CR-14 | C-DVG-22, C-NB-28, N-NB-11: "My day ends at" | components/settings/day-ends-setting.tsx | finished | built in AO (`e2452897`) |
| CR-15 | C-DVG-17, DV-046e, DV-054d, C-DV-13, PR-100: Activity search and CSV | docs/architecture/ADR-039-session-ao.md | finished | built in AO (`d256b946`) |
| CR-16 | B-083, M-104, M-131: End goal / remove milestone without a confirm | components/platform/goal-milestones.tsx | finished | owner decision g (13 Nov): Undo, no confirm |
| CR-17 | DV-170: Activity's Remove on every row instead of inside ⋯ | components/activity-feed-lazy.tsx | finished | decided with the rules' default (follow-up 1): Remove stays on each row — one tap, named after its row, 44 px, 12 s Undo |
| CR-18 | D-003 (section-level Showcase lines), D-090 ("Sleep debt" wording) | docs/architecture/ADR-039-session-ao.md | needs the owner | copy decisions (ADR-039 D16) |
| CR-19 | BN-022: Erase names each area it erased | components/settings/erase-everything.tsx | needs the owner | needs a key-to-area map; no automatic reload is deliberate (ADR-039 D16) |
| CR-20 | The Today grid's day for Health cells | docs/architecture/ADR-039-session-ao.md | finished | decided with the rules' default (follow-up 1): Health cells keep Health's own day, as the Health page counts it |
| CR-21 | AO D17 Major 3: floating music/Checklist/ZIGi buttons over Today's right rail at 1440 | components/launchers/auto-tuck.ts | finished | launchers fold into the edge (AP owner 4a, ADR-040 D12, D24e) |
| CR-22 | AO D17 minor: 12–13 px notice and chip text | components/ui/ui.css | carried | AL's sizes; T-069's one-line fact fits only at these sizes |
| CR-23 | AO D18: four pages over their route budget | scripts/check-weight-budget.test.mjs | finished | every route ≥ 6.3 kB under budget, none raised (ADR-045 D-WEIGHT) |
| **C** | **CI_INTERMITTENTS.md (rows not marked fixed)** | | | |
| CI-1 | WebKit class A: a navigation after cancelled loads (`zigi-stress:124`, `zigi-accept-correct:268`, `zigi-states:67`, `webkit-smoke:40`) | tests/webkit-cancelled.ts | carried | Playwright/WebKit engine; owner option: one pre-navigation "hydrated and quiet for 1 s" helper |
| CI-2 | WebKit class B: `ThreadedCompositor` segfault (`zigi-memory:171/175`, `zigi-tools:126`, CI 1634 shard 1) | — | carried | engine crash, not memory or product; one re-run (owner rule 7) |
| CI-3 | Chromium renderer stall without a GPU (`ui-evidence:108`, `theme-parity-af:15`) | — | carried | headless Chromium; owner option: a tracing scratch run |
| CI-4 | `hosted-verifier-order:18`: a core chunk aborted (local only) | tests/hosted-verifier-order.spec.ts | carried | never seen in CI |
| CI-5 | `zigi-emotions:114`: WebKit "ZIGi box empty after a fill" | components/help/help-page.tsx | hidden honestly | a Known limitation (owner decision 7) |
| CI-6 | Sandbox-only: `ui-design-pass:105`, `ui-evidence:115/50`, `wealth-chips-af:13`, `zigi-browser-agents:102` | — | carried | 4-vCPU software-GPU sandbox, fonts mapped to Inter; pass in CI |
| CI-7 | WebKit job's install step: cache miss / slow apt mirror | .github/workflows/ci.yml | carried | runner; the job limit is 60 min (AT D9); bounded attempts if it recurs on a cache hit |
| CI-8 | `landing-v5-perf:79`: CLS 0.0154 against < 0.01 | tests/landing-v5-perf.spec.ts | carried | first sighting; read the `landing-weight` annotation and trace if it recurs |
| CI-9 | `zigi-states:75`: "listening" read where "sleepy" was due (second sighting after fix 1) | components/ai/ai-chat.tsx | carried | WebKit not installed here; needs a WebKit trace for a second `user_typing_started` after the jump |
| CI-10 | `grok53/hud/hud-perf:23`: median frame 33 ms at CPU 4× (CI 1632, 1743) | tests/grok53/hud/hud-perf.spec.ts | carried | runner load, first sightings; warm-up test in the shard if it recurs |
| CI-11 | First sightings passed on re-run: `for-you:8`, `j04-offline:23`, `earn-guide-zigi:54`, `progress-glass:60`, `zigi-voice-z:316`, `j06-data-safety:140`, `j05-notifications:159` | — | carried | recorded; investigate on a second failure |
| CI-12 | `zigi-face-z:313`, `zigi-memory-af:15`, `o3-apps-extras:80` (43.999996 px mid-transform) | — | carried | recorded families; investigate on a second failure |
| CI-13 | `sync-offer-browser.test.mjs`: device A's Today card not visible 30 s after "Save widget" | scripts/run11/stage8-rehearsal/sync-offer-browser.test.mjs | finished | follow-up 1: a miss prints device A's address and page structure to the job log, then fails as before |
| CI-14 | `install-chrome.test.mjs:94`: the same latent race as the fixed `:100` | scripts/ci/install-chrome.test.mjs | carried | raising its attempt limit would move its `seconds < 7` check; recorded |
| CI-15 | Fixes 1–3, settings sweep poll, `exploratory-round3` hydration wait, Wrapped story held open (Q24), `zigi-part-boundary` fetch retry | components/wrapped/wrapped-door.tsx | finished | every proposed fix is in the code (ADR-043 D10) |
| CI-16 | ADR-041 D34 (`hud-motion` phone stillness) and D36 (ND-1, the first WebGL task) | components/nova/core/star-system.tsx | finished | fixed at their cause (ADR-045 D34, D36) |
| CI-17 | `dashboard-visual:11` (mobile, 45 s) | tests/dashboard-visual.spec.ts | finished | the picture at CSS pixels; 39 s → 14 s (ADR-045 D-DV) |
| CI-18 | D-SYNC: `account-browser` "no progress for 20000 ms" (AU) | components/use-private-store.ts | carried | 6 of 6 locally, no automatic path that announces an account event; TIER 3 sync (ADR-045 D-SYNC) |
| **D** | **REHEARSAL.md (AU, verdict Carried)** | | | |
| S-8 | Today 409 CSS px wide for under a second right after a reload (phone top bar and tab row) | components/phone/phone-chrome.tsx | carried | transient on reload, never after load (overflow probe on every page) |
| S-10 | Dutch answers carry English dates and an all-English Life review card | lib/ai/local-answers/exact/period.ts | carried | the interface is English; Dutch is the answers' language only (see KL-8) |
| S-12 | "Night saved." covers the 7-day sleep averages for a moment | components/ui/undo-toast.tsx | finished | follow-up 1 (`7e664056`): the toast keeps clear of what a save changed (`clearOf`), here the 7-day averages (av-rows spec, 390/1440) |
| M-9 | Goal creator step 1: "Create goal" beside "Continue", and the 0/80 counter (also AT D20) | components/unified-goal-wizard.tsx | needs the owner | a creator design call (AT D20, AU M-9) |
| M-10 | The full-screen Checklist celebration has no visible words or close | components/checklist/day-celebration.tsx | needs the owner | Escape and a tap close it; a visible close is a Checklist design call (orbit path protected) |
| M-12a | The "Added…" note covers the newly added row (Tasks, Habits) | components/ui/undo-toast.tsx | finished | follow-up 1 (`7e664056`): `clearOf` the new task row and the new habit card (av-rows spec) |
| M-12b | Tasks filter chips cut off without a scroll hint | tests/av-rows.spec.ts | finished | follow-up 1: measured at 390/800/1024/1440 — Habits' chip row already fades at its edge on a phone; Tasks has no sideways row (its lists wrap). The spec pins both |
| M-12c | P3 missing from a priority list (Tasks, 390) | components/tasks/tasks-nav.tsx | finished | follow-up 1 (`7e664056`): P1–P4 listed, P3 (Normal) too (av-rows spec) |
| L-6 | The import preview has no category column | components/import/bankfiles/category-pick.tsx | finished | AV L-6: a Category column, changeable per row, same code path as the import |
| L-7 | A weekly-budget card says "No weekly budget" beside her monthly budget, which sits folded at the bottom | components/wealth/budgets/month-room.tsx | finished | follow-up 1 (`7e664056`): with only monthly budgets the card shows this month's room and links to Budgets by category (av-rows spec, three themes, axe) |
| L-9 | ZIGi titled "AI Companion" with a "Premium" badge while every answer says "no AI" | components/plans/premium-badge.tsx | needs the owner | naming across ZIGi's panel; the plan badge is the owner's |
| **E** | **Carried lists of ADR-038 to ADR-044 (rows not already above)** | | | |
| A38-1 | A caching proxy Worker for weather, hiding the person's address from MET Norway (ADR-038 "Carried") | docs/friends-alpha/OWNER_STEPS.md | needs the owner | built and off (AP `c66b65c9`); the owner deploys and switches it on; Help says so |
| A38-2 | NOVA's sync section `nova` (ADR-038 D18) | lib/vault/extras-sections.ts | needs the owner | travels once the owner redeploys `private-sync`; until then "On this device only" |
| A38-3 | Q12: the orb stand-in when the star never reports | components/nova/core/star-system.tsx | finished | AR Part 3a and D33 (`.nova-star-standin`) |
| A38-4 | Q12 taste: a new composition of the populated stage | docs/architecture/ADR-041-session-ar.md | finished | AR's composition, now protected |
| A40-1 | Priority matrix by mouse drag (AP D16a) | tests/ar-matrix-drag.spec.ts | finished | AR D37 |
| A40-2 | The orbits as a Today widget (AP D16b) | components/dashboard/today-dashboard.tsx | finished | Today's orbits card (AR), off until chosen; in Help |
| A40-3 | Someday counts in the Tasks menu (AP D16c) | components/tasks/tasks-when-count.tsx | finished | AT D7 |
| A40-4 | AP D22's seven copy/visual minors and CSV Value/Unit | tests/at/ap-minors.spec.ts | finished | AT D6, D8; the two partial ones by AU D-SHOWCASE |
| A41-1 | D36: the star's probe off the main thread (an owner call on the worker rule) | components/nova/core/star-system.tsx | finished | superseded by ADR-045 D36 |
| A42-1 | AS D21 critic items 1–5, 8, 9 (legends, trend gaps, names, radar, river, "slipped", labels) | lib/nova/widgets/as-carried.test.ts | finished | ADR-042 D26 (`7050bf78`) |
| A42-2 | AS D21 items 6 ("0 due today" beside an overdue task) and 7 (meditation vs the habit) | docs/architecture/ADR-042-session-as.md | finished | kept as they are by the owner (D26) |
| A42-3 | AS D21 item 10: the goals lookup leaves out average goals | lib/ai/tools/goals.ts | finished | ADR-042 D25 |
| A42-4 | Six answer kinds only reachable from the gallery: body-scan, mood-map, debt-ranks, sleep-stages, sleep-times, fasting-windows | lib/nova/summon/more-families.ts | finished | follow-up 1 (`7e664056`): `AV_FAMILIES` make the six kinds from words, EN and NL (av-gallery-kinds.test, lines.test samples) |
| A43-1 | Showcase example mood tags and a bill price change (AT D8) | lib/showcase/au-examples.ts | finished | AU D-SHOWCASE |
| A43-2 | A meal logged in words alone (AT D20) | tests/au/webkit-au-sanne.spec.ts | finished | AU F-MEAL |
| A43-3 | "When will I reach…" leads with the target date, not the pace (AT D20) | lib/ai/evals/as | finished | AU D-ETA |
| A43-4 | "Allow Health" from a NOVA reply (AT D20) | tests/au/sanne.spec.ts | finished | AU F-2, D-ALLOW-HEALTH |
| A43-5 | The roving helper measures every item on each change (AT D18) | components/dashboard/today-skips.tsx | finished | AU D-ROVING |
| A43-6 | Main shard 4 at 55 of 60 min (AT "For the next session") | scripts/ci/main-shards.test.ts | finished | AU: 14 duration-balanced lists |
| D20-1 | Setup preselects an empty goal amount (AT D20, AU) | components/onboarding/onboarding-flow.tsx | finished | follow-up 1 (`7e664056`): "For example 1500" and "Your own amount; nothing is filled in for you." (av-rows spec, 390/1440) |
| D20-2 | Setup gives no keyboard hint on a phone (AT D20, AU) | components/onboarding/onboarding-flow.tsx | finished | follow-up 1 (`7e664056`): `enterKeyHint` next/done, `inputMode` decimal (av-rows spec) |
| D20-3 | "Balanced" unexplained (AT D20, AU) | components/dashboard/make-today.tsx | finished | Session AV Part 4b (this commit) "Keep Balanced and continue" names no content: add its line ("Goals, daily rhythm, Health and Wealth", from `PRESETS` in lib/dashboard-settings.ts) — done |
| D20-4 | The habits week chart before a habit exists (AT D20, AU) | components/habits/habit-consistency.tsx | finished | Session AV Part 4b (this commit) with no habits show the teaching empty state instead of "Keep finding your rhythm" with empty bars — done |
| D20-5 | Health's counters before any food or water (AT D20; R2-15) | components/health/health-app.tsx | needs the owner | the quick counters feed the protected Checklist path (owner decision R2-15) |
| D20-6 | First five: "Record some money" ticks only on a money-log entry (AT D20, AU) | components/onboarding/first-five.tsx | finished | follow-up 1 (`7e664056`): the step is "Log an expense or income" (av-rows spec; ap/first-five moved deliberately) |
| D20-7 | The first-five card's focus order (AT D20, AU) | tests/av-rows.spec.ts | finished | follow-up 1: the DOM order already matched the drawn order; a Tab walk pins links top to bottom, then "Not now, hide this" |
| D20-8 | NOVA's two "no AI used" lines and its phone hint (AT D20, AU) | components/nova/stage/stage-parts.tsx | needs the owner | AR's NOVA composition is protected |
| D20-9 | Agenda's future days said "(0 done)" (AT D20) | components/agenda/agenda-days.tsx | finished | AV (ADR-045 "AT D20 minors") |
| D20-10 | Wealth's "Refresh prices" stood disabled with nothing priced (AT D20) | components/platform/wealth-view.tsx | finished | AV: waits for a priced holding |
| D20-11 | "$0.00 a month" plan line on a goal with no plan (AT D20) | components/goals/what-if-panel.tsx | finished | AV |
| D20-12 | Tasks' filter shown before "New task" (AT D20) | components/tasks/tasks-page.tsx | finished | AV: the filter comes once there is a task |
| A44-1 | The answer under NOVA's star at 1440 had no page button (AU) | components/nova/stage/stage-parts.tsx | finished | AV D-STAR-BUTTON |
| A45-1 | The account-sync engine (~80 kB) out of every page's first scripts | components/vault-sync-controls.tsx | carried | a remembered device failed to reopen in `remember-device-browser`'s cross-tab step (2 of 2); TIER 3 sync for a session that owns sync (ADR-045 D-WEIGHT) |
| **F** | **Polish picklists (EARLIER_SCOPE.md, picklists 1–2 and their Part 14 verdicts)** | | | |
| PK-1 | N10: one journey through NOVA's five steps (workflow, briefs, delegation, setup sharing, erase) | tests/journeys/j12-nova.spec.ts | finished | follow-up 1: journey 12b — brief, workflow with Undo, ZIGi on a page with the Duo, the shared setup, Erase everything |
| PK-2 | KL-earn-tbt / D9: Earn's first load busy ~4 s on a mid-range phone | components/help/help-page.tsx | hidden honestly | owner decision 6; Known limitations says so |
| PK-3 | KL-checklist-offline: only Today visited online, then offline the Checklist stays "Loading your path…" | public/sw.js | finished | follow-up 1, **TIER 3 (PWA)**: the worker keeps the later parts of the kept pages once per version on the page's ask (`warmLazy`, ≤ 6.5 MB, never under Data Saver/2G); av-offline-later-parts spec |
| PK-4 | WE16: the market catalogue download is 5.1 MB | app/api/market-assets | needs the owner | splitting it changes the API route and offline search (ADR-034 N36) |
| PK-5 | F1 / D13b: ZIGi's idle clips are 2.0–2.4 MB each | components/zigi/manifest.json | needs the owner | a re-encode changes the locked ZIGi look |
| PK-6 | X001 "Hello, in place" delivered, not played | components/zigi/state-gallery.ts | needs the owner | no moment named for it; the ZIGi look is locked |
| PK-7 | D13a: R013's hide move touches ZIGi's arm to its body | components/zigi/manifest.json | needs the owner | Studio-4 art; Help says a smoother version is planned |
| PK-8 | D13d: HEVC-alpha MOVs | — | needs the owner | needs macOS (the owner's Mac; no script in this checkout) |
| PK-9 | D-OD5 / D10: a sharp 2× brand mark | landing/assets/brand/zigoals-mark-v3.webp | needs the owner | the only file is 422×480; needs the owner's original |
| PK-10 | KL-help-chain: Help topics gated on the chain choice | components/help/help-page.tsx | needs the owner | owner list 8, unanswered (~40 Help specs) |
| PK-11 | AFL4: a prefix-free practice-badge memo | — | needs the owner | a new signed memo ("no change to wallet signing") |
| PK-12 | D12: Bearable importer, ZIGChain EVM balances, AFL1 / AFL3 | — | needs an outside service | Bearable documents no export; no public ZIGChain EVM RPC; cosmjs authz amino unimplemented; AFL3 class c |
| PK-13 | D11: the Fineli (Finnish) food table | lib/food-display/schema.ts | needs the owner | the raw files are not on `review/ak-food-data`; Known limitations says it isn't in yet |
| PK-14 | AF3: your own OroSwap LP and USDC vault shares on Earn | components/earn/your-shares.tsx | needs the owner | check with a real address that holds them, after a deploy |
| PK-15 | AF7: the hosted verifier's late `/api/push` abort | scripts/verify-hosted-alpha.mjs | needs the owner | read on the owner's next hosted verifier run |
| PK-16 | AF14 / SEC: Dependabot alerts in build tooling (glob, minimatch) | docs/dependencies/AL_REVIEW.md | needs the owner | no dependency change without approval |
| PK-17 | RM8: Face ID / passkey unlock | — | needs an outside service | needs a real iPhone and a server-side check |
| PK-18 | Z1A-I1: ZIGi's default for a cloud send with no privacy mode chosen | lib/ai/privacy-mode.ts | needs the owner | a privacy-default change; NOVA's composer already says what happens |
| PK-19 | Z1C-L3: the view-transition overlay is click-through | — | finished | accepted (≤ 180 ms; the review sheet's guards hold) |
| PK-20 | AF1 / KL-keplr-mobile: WalletConnect and Keplr Mobile on a real phone ("available soon on phones") | components/wallet/phone-wallet-paths.ts | needs the owner | waits on Reown's allowed domains and the owner's phone wallet |
| PK-21 | AF2: pre-filled Ramp and Banxa hand-offs (Add money opens plain sites) | config/public-integrations.json | needs the owner | the providers' public IDs |
| PK-22 | MO3 / CO11 and Known limitations: push (weekly review, complete or snooze from a notification, price alerts and reminders while closed, "notifications are being switched on") | components/push/push-reminders-panel.tsx | needs the owner | the owner switches push on (ADR-033 M48); until then Today shows due cards while open |
| PK-23 | OD-3 (the landing's two numbering systems), ND-24 (guide finales drawn as a small orb) | landing/index.html | needs the owner | design calls; the finale is the protected path engine |
| **G** | **Code sweep (apps/web components, lib, app)** | | | |
| CS-1 | TODO / FIXME / XXX / HACK comments | — | finished | none in components, lib or app (the only hit is a test's search string) |
| CS-2 | Customize ZIGi: three "Coming soon" skin tiles | components/ai/zigi-customize.tsx | hidden honestly | manifest `comingSoon: 3`, said plainly; new skins are Studio art (owner) |
| CS-3 | Plans: "Placeholder prices · nothing is charged during the Alpha" | lib/entitlements.ts | needs the owner | pricing is the owner's; labelled as placeholder |
| CS-4 | Help "What is hosted ZIGoals?": "not available yet" | components/help/help-page.tsx | needs the owner | an AI ZIGoals runs needs the owner's provider and server |
| CS-5 | Share-progress image: "Amounts" and "Target date" disabled without a reason | components/goals/progress-card.tsx | finished | Session AV Part 4b (this commit) say why beside each ("no target amount", "no target date") — done |
| CS-6 | ZIGi usage: "Ask first past the cap" disabled until a cap amount is set, unsaid | components/ai/ai-data-usage.tsx | finished | Session AV Part 4b (this commit) add "Set an amount first" while it is disabled — done |
| CS-7 | Goal milestones: "Link" disabled when the goal details can't be read, with no notice | components/goals/milestone-planner.tsx | finished | Session AV Part 4b (this commit) show the "could not be read" notice goal-plan.tsx already shows — done |
| CS-8 | FI model: "Keep these inputs on this device" disabled when its record is unreadable, with no notice | components/wealth/money-tools/fi-model-panel.tsx | finished | Session AV Part 4b (this commit) add the unreadable alert debt-planner.tsx has — done |
| CS-9 | NOVA's widget catalogue (128 ids) against its components and data | components/nova/widget-grid.tsx | finished | every id has a lazy component reading the person's records (checked id by id) |
| CS-10 | Routes with no menu link: /app/share, /app/goals/positions, /app/today | app/app/share/page.tsx | finished | by design: the manifest's share target, a legacy redirect to Staking, an alias of Today |
| CS-11 | /app/zigi/memory is in Settings, NOVA's setup and NOVA's go-to but not in search | lib/search/static.ts | finished | Session AV Part 4b (this commit) add a "What ZIGi remembers" page row to the static search index — done |
| **H** | **Help and Known limitations** | | | |
| KL-1 | "A few of ZIGi's new moves aren't used yet: its glances … and its hello": the glances X020–X022 play since P14-B | components/help/help-page.tsx | finished | Session AV follow-up 1 (`7e664056`): Known limitations names only the unused hello; send-feedback spec moved deliberately |
| KL-2 | "Your last backup isn't recorded": Today's copy card and "I saved a copy today" now keep `savedOn` | components/data-health/data-health-view.tsx | finished | Session AV Part 4b (this commit) show "You marked a copy on …" in Your copies when `savedOn` exists; reword the Help line to match — done |
| KL-3 | Accounts and sync aren't open; reminders when closed need an account | lib/account-session.ts | needs the owner | the owner opens accounts on alpha.zigoals.app |
| KL-4 | The Checklist's path, own items and day history aren't synced yet | lib/vault/extras-sections.ts | needs the owner | travels once the sync service is redeployed (as A38-2) |
| KL-5 | Oura, Withings, Polar and Strava say "Needs setup by ZIGoals" | components/health/devices/health-links.tsx | needs the owner | ZIGoals registers with each vendor |
| KL-6 | Spotify connects for invited accounts only | components/music/spotify-byo.tsx | needs the owner | Spotify's app approval |
| KL-7 | Garmin only through exported FIT files | — | needs an outside service | no Garmin connection |
| KL-8 | "English only for now" (the interface) | components/help/help-page.tsx | carried | translating the interface is a project of its own; answers already follow Dutch (S-10) |
| KL-9 | Platform facts: Bluetooth not on iPhone, no Apple Health web access, Fitbit ended, no Safari shortcuts or Share sheet, Focus can't block apps, Lichess starts no blitz, the WebP fallback, restore leaves settings, photos per device, older builds keep newer records | components/help/help-page.tsx | hidden honestly | browser and vendor facts, each said plainly with its answer |
| KL-10 | Mood tags, symptoms and run splits can't be read by ZIGi or NOVA | lib/ai/gates.ts | hidden honestly | a privacy rule, said in Help |
| KL-11 | Goals count in US dollars or euros; nothing is converted | — | hidden honestly | owner rule (one currency per goal) |
| KL-12 | Bento and the buttons that step aside are for computers only | components/bento/bento-switch.tsx | hidden honestly | phones are one column already |
| KL-13 | Money insights wait for history (three months, a month of income) | components/wealth/spending/spending-section.tsx | hidden honestly | they say so instead of guessing |

Counts: total 150 — open 14 · hidden honestly 10 · carried 19 · needs an outside service 5 · needs a model 5 · needs the owner 40 · finished 57 (eight rows finished in Part 4b: CS-5, CS-6, CS-7, CS-8, CS-11, D20-3, D20-4, KL-2).
