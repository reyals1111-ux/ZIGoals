# Session AL — cross-lane reconciliation (CROSS_LANE)

Read 5 Nov 2026 on `feature/session-al-fix-everything` at `39f9cf53`, plus the uncommitted working tree (L8c/P14-A edits; marked "working tree"). Sources: every `lanes/*.md` row or part marked Needs-other-lane (443 matching lines → 397 rows/parts after merging repeats), the receiving lanes' status files, `git log --format=%B 17069c7d..HEAD` (53 commits) and the code (file:line). COMPETITOR-GAP rows: all 178 of `GROK53_LEDGER.md`, each with its own closing row in §(d). Owner decisions cite AL_SCOPE F (or the O/ADR decision the lane named). Classes: **Done** (evidence) · **Still open** (receiver + ask) · **Owner decision** · **Not possible** (reason). "Q7" = old 10-21 ids with no 11-04 evidence (ADR-037 Q7: replayed in Part 14, not fixed blind).

## (a) Totals

**Needs-other-lane rows/parts: 397** — Done 252 · Still open 103 (68 distinct asks; the rest point at the same ask or at a gap row) · Owner decision 33 · Not possible 9.

**COMPETITOR-GAP rows: 178** — Built 100 · Still open 30 · Owner decision 37 · Not possible 11.

| receiving lane | distinct open asks (§b1) | open competitor gaps (§b2) |
|---|---|---|
| L1 | 5 | 3 |
| L2 | 4 | 8 |
| L3 | 16 | 5 |
| L4 | 14 | 6 |
| L5 | 0 | 0 |
| L6 | 6 | 5 |
| L7 | 3 | 0 |
| L8 | 2 | 0 |
| L10a | 2 | 0 |
| L10b | 2 | 0 |
| INT | 14 | 3 |
| **total** | **68** | **30** |

What the reconciliation found (the reasons rows stayed "Needs-other-lane"):
- **Most requests were done** and recorded only in the receiver's file or a commit (L7 took every AI row; L10a/O3 every launcher row; P14-D the L1/L10a leftovers; FX-L2L4 `39f9cf53`, `c6101a30`, `648412e3` the small ones). The source rows were never updated.
- **Ping-pong, nobody did it:** P-DVR-22 (default currency; L1↔L4), P-DVR-88 (Fund Goal eligibility; L1↔L4), P-TK-25/26 (Today; L1→L10a→L3, L3 never listed them), P-BN-48 (Earn strips; L6→L10a→L6).
- **Goals rows from non-Denver ledgers** (Tokyo P-TK-49…60, Moscow P-MO-48/86…96, Berlin P-BN-23…61, Nairobi P-NB-31, 49…52) went to "Goals"; L4 worked only its Denver rows. Most are covered by L4's shared fixes (cited); the rest are in §b1 L4.
- **L10b has no status file**, so rows sent to it are judged from `PRIMITIVES.md`/code only (2 open).
- **Unclaimed files:** `lib/showcase-data.ts`, `lib/skills/chess/showcase.ts`, `components/showcase-controls.tsx`, `lib/showcase-storage.ts`, `components/reminders/*`, `lib/import/nutrition.ts`, `components/import/switch-import.tsx`, `components/nova/panels/activity-panel.tsx`, `components/timeline/day-timeline.tsx`, `/api/push` + `/api/private-account` (all untouched since `17069c7d`), and `components/bottom-sections.tsx` ValueSources (only its careRows changed, `c6101a30`).
- **Lane claims contradicted by code:** L2 C-MO-07 "recipe URL import not possible" — `app/api/recipe-import/route.ts` exists; INT GAP-177 "importers from other apps not built" — `lib/import/switch/{ynab,loop,habitica,daylio,strava,strong,hevy,oura,…}.ts` exist; L3 P-NB-C07 "Settings install entry is Settings' file" — `app/app/settings/page.tsx:242` already renders `InstallCard`; L4/L6 P-DV-98 "role=switch needed" — `components/ai/ai-switch.tsx:9` already is.
- **"Owner decision" cited outside AL_SCOPE F** (owner to confirm): C-MO-35 fasting streaks ("no streak pressure"), C-MO-04 suggested targets ("no suggested defaults"), C-BN-15 audit filter ("reads as endorsement"), C-BN-07 ranking ("no advice"), AF15 p3 (P14-A vs P14-D disagree).
- **Part 15 (A11) shortfall:** 35 Denver COMPETITOR-GAP rows that L4 handed on had no closing row in any lane file (P-DVG-06, 09, 11, 12, 15, 19, 20, 23–26, 30, 40, 41, 43–53, 56–65; L1 never took its 21), nor did GAP-085 (P-PR-48); they are closed here from code. 30 web-possible, non-conflicting gaps are still unbuilt (§b2).
- **Uncommitted:** P14-B requests to L8 (EX3-1/2, Forget-key button, Z1A-I5 copy, DV-070 field) are done in the working tree only (`nova-left.tsx`, `nova-right.tsx`, `nova-command.tsx`, `components/nova/hermes/*`, untracked `forget-key.tsx`).

## (b1) Still open, by receiving lane

Format: source lane · row · finding ids — exact ask — suggested file(s).

### L1 (5)
- L1 · P-DVR-22 · BUG-065, G-024, G-022, N-003, N-156 — ping-pong: L1 says L4, L4 says L1. One default currency: goal wizard asset/currency from the person's currency and the kind; new accounts/debts default to the net-worth currency (PR-068, P-PR-59, no lane); NOVA cost cap defaults to USD (N-MO-03) — `lib/default-currency.ts, components/unified-goal-wizard.tsx, components/wealth/accounts-section.tsx, components/nova/panels/cost-panel.tsx:60,62`
- L2 · P-MO-37 · MO-075, MO-089 — "Undo import"/"Dismiss" look like plain text at 375; wrapping and pager alignment at 768 — `components/import/csv-import-steps.tsx ImportBanner`
- L2 · P-MO-96 · MO-158, N-MO-17 — warn when a quantity drops below its allocations; show the deficit — `components/platform/asset-editor.tsx, asset-detail.tsx`
- L3 · P-PR-16 · PR-015 — say what "7 of 8" counts; "No target set" only when none; label tracked wealth vs net worth — `lib/showcase-copy.ts, Today wealth strip`
- L6 · P-DVR-07 (CSV part) · D-058, BUG-042, D-078, D-237 — per-row CSV refusal reasons; old ids (Q7 replay) — `lib/import/holdings.ts, lib/csv`

### L2 (4)
- L2 · P-MO-61 · MO-049/050/051/138 — nutrition CSV: −100 kcal reason, sodium shown, grams kept, formula names warned, per-row reasons, file input after Done; lib/import/nutrition.ts untouched since 17069c7d — `lib/import/nutrition.ts, components/import (nutrition)`
- L5 · P-DV-119 · DV-141 — mood chip on the Health page (Low; mood exists in wrap-up/Journal) — `components/health`
- L4 · P-DV-73 (sleep rows) · DV-172 — sleep nights in Activity (the footer says they are not listed) — `lib/health.ts getHealthActivities, app/app/activity/page.tsx`
- L4 · P-DVR-70 · D-094/047/010/056 — D-056 done (L1:116); coach, diary, Showcase-strip Undo: old ids (Q7 replay) — `L2 coach/diary, Showcase strip`

### L3 (16)
- L1 · P-TK-25 (Today part) · N-TK-20 — Today Life overview wealth figure is blank 1–2 s then pops in: show "Loading…"/last value (L10a redirected it to L3; L3 never took it) — `components/platform/today-intelligence.tsx (life overview)`
- L1 · P-TK-26 · TK-148, N-TK-21 — "Make Today yours" stays until `onboarded`, even after goals exist; hide or dismiss it once goals/records exist — `components/dashboard/today-dashboard.tsx:317, make-today.tsx`
- L10a · AL-LAYOUT-375-011 rocket · DV-052/P-DVR-55 — move the rocket (Gamify) into More on phones — `components/game/gamify-button.tsx`
- L10a · AL-THEME-005 helper text · P-DVR-32 (D-178…) — habit/helper text contrast in Light/Dark; old ids (Q7 replay) — `components/habits/*.css`
- L10a · req PRIMITIVES Today call sites · — — today-focus, today-dashboard, activity-feed done; day-timeline.tsx still 14 showToast → showUndo/showStatus; compare-explorer.tsx:63 hand decimal comma → parseNumberInput — `components/timeline/day-timeline.tsx, components/insights/compare/compare-explorer.tsx:63`
- L2 · P-MO-49 · MO-161 — Journey Rewards shelf: "Enter a price of 1 point or more"; link the shelf from Goals — `components/game (rewards shelf)`
- L3 · P-NB-43 (Today wiring) · NB-138 — Today's Sleep card "7 h / 8 h / last night" buttons → quickLastNight + saveNight + showUndo (no component calls it) — `lib/health-sleep-form.ts:82, Today sleep card`
- L3 · P-DVR-34 · D-203 (+ old ids) — habit ⋯ menu repeats the full habit name on every item (re-found 11-04); the rest old ids (Q7); card-options is a valid disclosure pattern (P14-D:42) — `components/card-options.tsx, habit card menu`
- L5 · P-LS-34 · LS-024, LC-014 — Today "2 of 10 planets" beside "1 of 2 habits": one count source (with P-DVR-68 D-239/D-106, old ids) — `components/dashboard/*, lib/numbers/counts.ts`
- L4 · P-DV-73 (habit archive/delete) · DV-206 — habit archive/delete rows in Activity (footer says not listed) — `lib/habits.ts getHabitActivities`
- L4 · P-DV-111 (copy) · DV-275 — Game layer rows: "never synced; in Export everything" wording, resets as destructive-secondary with a confirm — `components/game/*, components/settings/af-extras-section.tsx:50`
- L4 · P-DVR-73 · D-007… — habit form copy; old ids (Q7 replay) — `components/habits`
- L4 · P-DVR-75 · B-189/190, D-232 — skipped days excluded from %, "Day 0/0" as "—"; old ids (Q7 replay) — `lib/habits.ts`
- L4 · P-DVR-81 (T-070) · T-070 — Today recent-activity rows wrap; old id (Q7 replay) — `Today activity card`
- L4 · P-DVR-84 · G-031… — celebrations queued after the action; old id (Q7 replay) — `lib/celebrations.ts`
- L4 · P-DVR-86 · N-045, D-184 — no stale "Step 1 of 8"; old id (Q7 replay) — `lib/onboarding.ts`

### L4 (14)
- L1 · P-TK-49 (TK-176) · TK-176 — a goal target of a billion or more saves with no "check this?" (Wealth has it): reuse lib/wealth-plausibility.ts in wizard and Edit details — `components/unified-goal-wizard.tsx, components/platform/tracked-detail.tsx:253`
- L1 · P-TK-51 · TK-144, TK-194 — AL-ALLOCATION-001: offer to allocate the held units of the chosen asset; show "Available" on each source card (L4 processed only Denver rows) — `components/unified-goal-wizard.tsx:144-171`
- L1 · P-TK-52 · TK-146 — AL-HELP-001: say in Help that Reward goals appear once a chain is chosen — `components/help/help-page.tsx; wizard TYPE_CHOICES_CHAIN:50`
- L1 · P-TK-60 (rest) · TK-181, TK-196, TK-226 — AL-COUNTS-002: ask before a balance cut trims an allocation (TK-181); review flag when an archive releases funding (TK-196); dismiss on Today's over-allocation notice (TK-226) — `components/wealth/accounts-section.tsx, lib/goal-summary.ts, Today notice`
- L1 · P-DVR-88 · N-166, G-009 — ping-pong L1↔L4; old ids (Q7). Reward goals fundable from their own reserve; Fund list shows the unallocated remainder — `lib/contribution-funding.ts, components/platform/contribution-flow.tsx`
- L2 · P-MO-48 (N-MO-23) · N-MO-23 — Value goal shows $681.81 for 6/11 × $1,250 (truncates): round money half-up — `lib/goal-summary.ts`
- L2 · P-MO-91 · MO-126 — AL-FEATURE-GAP-002: "Link an existing habit" on the goal page (only "Add weekly review habit" exists) — `components/platform/tracked-detail.tsx:238`
- L2 · P-MO-95 · MO-145, MO-160 — AL-CURRENCY-004: say "asset in USD, goal in EUR, no conversion" at source choice, allocation and on the card (+ BN-156, X3-15/28) — `components/unified-goal-wizard.tsx step 2, contribution-flow.tsx, goal-card.tsx`
- L3 · P-NB-31 · NB-252 — progress toast floors (16 %) while ring rounds (17 %) — `lib/progress-toast/moved.ts:10 → formatProgressPercent`
- L6 · P-BN-24 rest (BN-140, N-BN-19) · BN-140, N-BN-19 — wizard name maxLength 80 cuts silently (no counter); date field has no year bound — `components/unified-goal-wizard.tsx:239, :243`
- L6 · P-BN-53 rest · BN-092/153/188/189 — INFO: check wizard/quick-add inputs do not re-render per keystroke under load (AL-PERF-004) — `components/unified-goal-wizard.tsx`
- L6 · P-BN-60 · BN-155, N-BN-20/21 — wizard draft restores the step and the review-habit tick (L4 did "banner on step 1 only") — `components/unified-goal-wizard.tsx`
- L4 · P-DV-39 (template link) · DV-181 — point the weight template at /app/goals?health-goal=weight#goals-health (pins goals-v2.spec.ts:82, guided.test.ts) — `components/goals/template-library.tsx:15`
- L4 · P-DVR-35 (Goals list) · BUG-064 — Goals list search/sort (re-found 11-04; L4 "Later") — `app/app/goals/page.tsx`

### L6 (6)
- INT · AL-HELP-006 (P-PR-30) · PR-032, PR-034, X3-27 — Help Known limitations says Lichess blitz is not findable while Chess shows Blitz; What's new still the AK release (no NOVA, Checklist rewrite, Tasks); Help notice text ≠ live banner — `components/help/help-page.tsx:168,434; lib/whats-new.ts:14`
- L10a · req P-BN-48 · BN-074, BN-126, BN-160, N-BN-05 — Earn: one topic strip, not two (same targets twice); first screen at 375/500 px — `components/earn/earn-view.tsx (uncommitted P14-A edits there)`
- L2 · P-MO-59 · MO-039 — after Undo the "Imported from Apple Health…" line stays; explain the 2 MB cap — `components/import/switch-import.tsx`
- L2 · P-MO-80 · MO-038, MO-103, M-061 — developer line still in Settings → Reminders; Sleep proposes 22:00 inside quiet hours; water reminder only inside the Diary card (AL-SETTINGS-004 is L6's; L6 sent it on) — `components/reminders/reminders-plan.tsx:49, lib/reminders-plan`
- L6 · P-BN-23 rest (N-BN-16) · N-BN-16 — separate messages for a wrong prefix (cosmos1/0x) and a wrong length — `components/platform/positions-view.tsx:86-94`
- L7 · P-LA-31 (Help) · N-LA-07 — Help: list the private screens that pause ZIGi and why (Checklist, lock, backup…) — `components/help/help-page.tsx`

### L7 (3)
- L6 · P-BN-24 rest (BN-070, L-003) · BN-070, L-003 — ZIGi box: visible counter at MAX_INPUT_CHARS (L-003 old id, Q7) — `components/ai/ai-chat.tsx:756`
- L6 · P-BN-38 (BN-017) · BN-017 — group the six "… page data" switches (role=group labelled by "What each page may share") — `components/ai/ai-settings.tsx:288-291`
- L6 · P-PR-31 · PR-035 — cost-cap copy points to "Settings → ZIGi → Usage" (the heading is "Usage on this device"); currency selector does not change — `components/nova/panels/cost-panel.tsx:52,62,68`

### L8 (2)
- L7 · P-LA-24 · LA-029 — NOVA Activity line says "by ZIGi" and flips pillar after Remove: show "by NOVA" and the pillar from the stored kind (also DV-036/047 "by NOVA", P-DV-75/P-DVR-39) — `components/nova/panels/activity-panel.tsx, the ai-actions log, components/activity-feed.tsx`
- L7 · P-MO-15 · MO-065 — ZIGi-confirmed water/weight/sleep missing from NOVA Activity; Undo there — `components/nova/panels/activity-panel.tsx (unchanged since 17069c7d)`

### L10a (2)
- L6 · P-DV-112 (part) · DV-256/261 — phone row "Encrypted download and module copies" → plain words; More sheet Settings/Help captions — `components/phone/phone-settings.tsx:17, phone-chrome.tsx`
- L7 · P-LA-29 · LA-024, N-LS-05 — NOVA asides inside the shell <main> (landmark-complementary-is-top-level); .brand-logo, .checklist-launcher landmarks; L8 did its part (L8:60) — `components/shell.tsx, nova-dashboard.tsx`

### L10b (2)
- L1 · P-TK-40 · TK-6B-09 — Light ghost buttons ("Hide amounts", "← Wealth", Rename/Delete) below 3:1 non-text contrast: 1 px border or darker surface (AL-A11Y-027; L10b has no status file) — `design-system ghost button tokens, public/themes light`
- L4 · P-DVR-29 · D-211… — skeletons instead of blank voids; old ids (Q7 replay) — `components/skeleton`

### INT (14)
- INT · AL-PRIVACY-007 landing part (P-MO-84) · MO-046 — landing privacy page says "no trackers" but never names Cloudflare NEL failure reports — `landing/privacy.html`
- L1 · P-TK-04 (1Y part) · TK-033/156/215, C-TK-22 — price-chart always requests 90d; add a 1y request (the server already maps 1y→365 days) within the provider budget — `components/platform/price-chart.tsx:23; lib/server/coingecko.ts:96; app/api/market-history`
- L10a · AL-THEME-007 Health charts · P-MO-34 (MO-035/090, N-MO-08/21) — Light: weight/measure strokes and dots ≥ 3:1, water ring track (1.3:1), disabled "Save recipe" label; the generator fix does not map these — read them on the regenerated sheet — `scripts/themes/build-themes.mjs, components/health/*.css`
- L10a · req P-NB-08 top-level · NB-002/033 — /welcome, /onboarding, /start 404 at the top level: next.config redirects or app routes (only /app/* aliases exist) — `next.config.ts or app/welcome`
- L2 · P-PR-25 (Goals part) · PR-022, N-PR-04 — Showcase "Sleep 7 h" Average goal vs Health's 8 h: seed the same value or say it is a separate goal — `lib/showcase-data.ts, lib/average-goals`
- L3 · P-NB-65 (copy) · NB-029 — "Showcase uses separate storage in this tab" → plain words (L6 moved the card, 321d85d5) — `components/showcase-controls.tsx:16`
- L5 · P-LS-20 (validateValue) · LS-057 — value-stepper to validateValue (PRIMITIVES 3d) — `components/checklist/value-stepper.tsx`
- L5 · P-LS-41 · LS-067 — route-size measure on the production build (3–5 MB shell)
- L6 · P-BN-36 · BN-019 — TIER 3: /api/private-account?action=status and /api/push answer 503 when not configured → 200 {configured:false} or a build flag (also P-PR-67, P-LS-35, P-MO-85) — `components/account-access.tsx, components/push/use-push.ts, lib/push/client.ts, app/api/push`
- L6 · P-PR-09 · PR-009, PR-108, BUG-037 — Showcase chess seed times are later than now before 07:00: clamp `at(day, h)` to now — `lib/skills/chess/showcase.ts`
- L6 · P-PR-38 · PR-079 — date the staking snapshot by the day the Showcase opens — `lib/showcase-data.ts`
- L6 · P-PR-39 · PR-080, BUG-041 — "Observed public positions" counts linked public wallets only; "entered by hand" says "(all of Wealth)" — `components/bottom-sections.tsx:129`
- L8 · The bar (critic, first-time viewer) · AL_SCOPE B — run the design-critic and first-time-viewer agents on the HUD (AL_RESUME next step 4)
- P14-A · Z1B-9 · Z1B_SECURITY 9 — clear the `showcase` scope of the photo stores (money-photos, …) when a Showcase starts and ends — `lib/showcase-storage.ts, components/showcase-controls.tsx, lib/money-photos/store.ts`

## (b2) Still open competitor gaps (Part 15), by receiving lane, value-ranked

Value = how much a typical person would miss it against Todoist / YNAB / MyFitnessPal / Habitica / Kubera-class apps. Effort S/M/L.

### L1 (3)
- **Low · M** · GAP-007 (P-DVG-50; C-DVG-50) — "Retirement/FIRE Monte Carlo" (Wealth); lib/fi-model (guess: no Monte Carlo) — deterministic FI model exists (lib/fi-model, fi-model-panel.tsx); Monte Carlo band not built (label as projection, F)
- **Low · M** · GAP-016 (P-DVG-62; C-DVG-62) — "TWR/MWR performance and a benchmark vs an index" (Portfolio); lib/portfolio/performance.ts (gu — lib/portfolio/performance.ts has all-time, realized/unrealized, dayChange; no TWR/MWR or index benchmark
- **Low · S** · GAP-028 (P-TK-83; C-TK-14) — "stablecoins count as cash" option — L1 P-TK-83 "not built; needs a device pref key + Today widgets (L3)"; web-possible, no F conflict

### L2 (8)
- **Med · M** · GAP-045 (OWN:C-MO-03; C-MO-03) — custom meal names and times — HEALTH_MEALS enum + diary meal (TIER 3 additive); L2 "Later"
- **Med · M** · GAP-053 (OWN:C-MO-17; C-MO-17) — body-fat % (weight and measurements blocks) — measurement kind enum has no body-fat (TIER 3 additive)
- **Med · M** · GAP-079 (P-DVG-39, OWN:C-MO-09; C-DVG-39, C-MO-09) — "Water by drink type, caffeine and hydration factor" (Health); water by drink type — verify (gu — drink type / caffeine needs a water-entry field (TIER 3 additive); L2 "Later"
- **Low · S** · GAP-042 (P-DVR-90; N-085) — Optional activity type on exercise minutes — N-085 optional activity type on exercise minutes (old id, Q7 replay); nobody took it (L4:280→L3, AL row L2)
- **Low · M** · GAP-048 (OWN:C-MO-08; C-MO-08) — serving-size conversions g ↔ mL ↔ cup — g/mL only; needs per-food density
- **Low · S** · GAP-071 (OWN:C-MO-42; C-MO-42) — Sleep Cycle import — no Sleep Cycle reader in lib/import/switch
- **Low · S** · GAP-072 (OWN:C-MO-43; C-MO-43) — Oura export layout recognised (fixture rejected) — lib/import/switch/oura.ts exists but rejected the bot's layout
- **Low · S** · GAP-073 (OWN:C-MO-55; C-MO-55) — analytics-free funnel replacement (local-only "weekly usage" card) — local-only weekly usage card (L2 "Later")

### L3 (5)
- **Med · S** · GAP-040 (P-TK-98; C-X3-07, C-TK-32) — portfolio value chart / 24h change — Today Wealth tile: value chart / 24h change (lib/portfolio/performance.ts:99 `dayChange` exists); L1 P-TK-98
- **Med · M** · GAP-085 (P-PR-48; PR-046, C-PR-02) — Per-habit page with history/stats/actions — no per-habit route (app/app/habits has only page.tsx); P-PR-48 in no lane file
- **Low · M** · GAP-086 (P-DVG-16, P-NB-C18; C-DVG-16, C-NB-26) — "Searchable reflections feed (note and mood at check-in)" (Activity / history); lib/journal + l — journal/notes search reach entries (L5:151); mood+note at check-in feed not built (L3:145 Later)
- **Low · S** · GAP-095 (P-DVG-31, P-NB-C17; C-DVG-31, C-NB-24) — "Starter packs and guided journeys" (Habits); lib/routines / guided (guess) — routines + Guided journeys exist; more packs Later (L3:145)
- **Low · S** · GAP-103 (P-NB-C05; C-NB-05) — Level/progress preview — level preview in setup (L3:145 Later)

### L4 (6)
- **Med · M** · GAP-119 (P-DVG-06; C-DVG-06, C-DV-07) — "Pay-down (debt) goals with payoff date and interest saved" (Goals); lib/debt-planner exists (g — debt planner has payoff date + interest (lib/debt-planner) but no pay-down Goal kind; L4→L1, L1 never took it
- **Med · M** · GAP-124 (P-DVG-13; C-DVG-13, C-DV-15) — "Reports by week/month/year/all time, ranked by streak" (Activity / history); no period reports — Activity reports by week/month/year (L4:294 Later)
- **Low · M** · GAP-115 (P-DV-64, P-DVG-03; C-DVG-03, DV-043c, C-DV-04, C-DV-05) — Create/drag sub-goals from the Tree (same as denver-competitor-gaps Goals #3) — hierarchy exists (lib/goal-hierarchy.ts); Tree create/drag editor Later (L4:123)
- **Low · S** · GAP-121 (P-DVG-10; C-DVG-10, C-DV-09, C-DV-10) — "Most-voted requests ZIGoals could answer" (Goals); lib/life-score.ts, goal 'why'/if-then field — custom congrats, h/min time (L4:291 Later)
- **Low · M** · GAP-122 (P-DVG-11; C-DVG-11, C-DV-16) — "Productivity view with daily/weekly goals, a streak of goal days and a completed-history chart — streak of goal days / completed-history chart; L4→L3, L3 never took it
- **Low · S** · GAP-125 (P-DVG-14; C-DVG-14) — "Insights dashboard by life area, with perfect weeks" (Activity / history); lib/life-balance.ts — life balance wheel exists; "perfect weeks" → L3, never taken

### L6 (5)
- **Low · M** · GAP-144 (P-BN-79; C-BN-14) — Decide and build (or record as not planned): Ecosystem: TVL trend — 5 of 18 have a TVL read; trend needs a stored history (L6 "not planned now")
- **Low · M** · GAP-146 (P-BN-81; C-BN-16) — Decide and build (or record as not planned): Ecosystem: "used by me" link to Wealth — needs a position→project mapping (L6:141)
- **Low · S** · GAP-152 (P-BN-87; C-BN-22) — Decide and build (or record as not planned): Chess: daily puzzle result log — dated puzzle log = new device store (L6:143)
- **Low · M** · GAP-153 (P-BN-88; C-BN-23) — Decide and build (or record as not planned): Chess: linking rating goals to Goals — rating goal → Goals link needs a Goals store change (L6:144)
- **Low · S** · GAP-165 (P-DVG-87; C-DVG-87) — "Searchable help centre with one article per task and "last updated" dates" (Help); Help has 'S — Search Help exists; per-article "last updated" dates not

### INT (3)
- **Med · M** · GAP-010 (P-DVG-53, P-TK-88; C-DVG-53, C-X3-01, C-TK-20) — "A watchlist beyond 8 favourites, with custom columns" (Markets); 8-favourite cap (watchlist-pe — lib/positions.ts:86 `watchlist …max(8)` (TIER 3 stored format); named lists (L1 P-TK-88)
- **Med · M** · GAP-176 (P-BN-93; C-BN-28) — Decide and build (or record as not planned): An "erase one area" button — INT "owner decision"; module restore replaces one area, an erase per area needs the erase catalog (erase-everything.tsx)
- **Low · M** · GAP-175 (P-BN-92; C-BN-27) — Decide and build (or record as not planned): Export of one chosen date range — INT "owner decision" but web-possible and no F conflict (lib/export/everything.ts range mode)

## (c) Done (compact, with evidence)

- **INT** (3): AL-BACKUP-RESTORE-001 (P-BN-31) → L6: L6:42 FPP (1b1712aa); AL-PRIVACY-007 Markets part (P-MO-84) → L1→P14-D: P14-D:40 markets-view.tsx line (3f4fb8b9); AL-COMPETITOR-GAP-178 → L6: exists: lib/whats-new.ts + Help What's new (content refresh = AL-HELP-006).
- **L1** (21): P-TK-01 → L10a: O3 Apps & extras (57fb1e5e); P-TK-10 (TK-019) → INT→P14-D: P14-D:39 presets.ts (3f4fb8b9); P-TK-13 → INT: INT:12 wealth-holdings.csv (818805b8); P-TK-14 → INT: INT:13 + private-backups.tsx:112 "accounts and debts are in Export everything" (818805b8); P-TK-15 → L10a: AL-NAV-013 (bbd2738e); P-TK-18 (TK-174/175) → L4: tracked-detail.tsx:251-254 readGoalAmount, error under the field (L4 P-DV-01/06); P-TK-31…37 → L7: L7:96-100,109,141 (52c745e8); P-TK-41 → L8: L8:55 (88c5bd72); P-TK-42 (ticker) → L10a→P14-D: P14-D:37 number-ticker.tsx (3f4fb8b9); P-TK-43 → L10a→P14-D: P14-D:38 run92-product.css (3f4fb8b9; sheets 32e0bebd); P-TK-45 → L10a: L10a:58 alias (bbd2738e); P-TK-50 (TK-142) → L4: L4:96 P-DV-37 (review formatted; preview echo = ADR-023 C25); P-TK-59 → L4: L4:68-69 delete with history + menu (f80e8bd9); P-TK-56/61 → L6 / L10a: L6:94; AL-COPY-067 (bbd2738e); P-TK-58 → L3: L3:71 P-NB-73 lone tile spans; P-TK-65 → L10a: AL-LAYOUT-375-011 "Saved in this browser only"; P-TK-63 → INT: manifest enctype (818805b8); bluetooth policy kept by design (SE13, test-pinned); N-TK-15: no message text = Not possible; P-TK-78 → L6: gap 023 (built in part); P-DV-28 (DV-105) → L4: L4:87 FPP (count goals never offered cash); P-DV-114 (NumberTicker) → L10a→P14-D: P14-D:37; P-DVR-26 (B-056) → L4: already: wizard reads contribution/every (unified-goal-wizard.tsx:59,104; calculator.tsx:160).
- **L10a** (6): AL-THEME-006 generator → INT: bbd2738e (TIER 3 generator) + sheets 5e54e15a/32e0bebd; Dark = owner ADR-028; AL-THEME-007 calculator → INT: same generator fix; req L1 P-TK-41 → L8: L8:55; req L1 P-TK-43 → L1: P14-D:38; req NB-081/NB-089 → L3: Today water tile logWaterWithUndo (81788f5e); req P-DVR-52 → L7: L7:126 already fixed + guard spec.
- **L2** (29): P-MO-89 (Habits side) → L3: L3:109; P-NB-28/P-PR-03 consumers → L3/L5/L7/L8: L3:36 + 81788f5e; L5 P-LS-19; L7:146; L8:58; P-PR-25 (L7 part) → L7: L7:148 sleep_summary reads sleep.goal; P-MO-01…11 → L7: L7:69-79; P-MO-12 → L7: L7:135; P-MO-13/14 → L7: L7:127, L7:107; P-MO-16/17/19 → L7: L7:81, 82, 136; P-MO-18 → L8: L8:58 waterToday; P-MO-23 → L10a: O3; P-MO-24 (shell) → L10a: AL-LAYOUT-375-012; P-MO-35/36/38 → L10a: L10a:64 (35), AL-NAV-012 (36); 38 Not possible (AL-LAYOUT-375-013); P-MO-46 → L5: ed82fc66 "Add your wake time to save."; P-MO-51 → L4: lib/goals/goal-amount.ts:16-18 (L4 P-DV-05); P-MO-52 (Goals 100) → L4: L4:62 P-DV-03; P-MO-58 → L10b: undo-toast.tsx 8 s, pause, Escape (434309c3); Ctrl+Z (ed82fc66); P-MO-78 (strip rows) → owner of bottom-sections: c6101a30; P-MO-75 → L4: lib/goals/goal-units.ts:39 (L4 P-DV-17); P-MO-83 → L10a: 57fb1e5e; P-MO-86 → L4: AL-COPY-034 via L4:78 P-DV-19; P-MO-87 → L4: L4:78/207 (partly); P-MO-92 → L1: L1:125; P-MO-93 → L4: L4:68 P-DV-09 (f80e8bd9); P-MO-94 → L4: L4:79 P-DV-20 (card) + Owner F/AK X1 (chain wizard words); P-MO-88/90/103 → L3: L3:109; P-MO-97 (Today tile) → L3: 81788f5e double-tap guard; P-MO-101 → L7: L7:83; PRICING → L10a: 57fb1e5e; C-MO-45…54 → L10a: 57fb1e5e; C-MO-59 → L7: 5848c55c HE17 meal-photo card.
- **L3** (30): P-NB-03 (Help) → L6: L6:93; P-NB-07 → L10a: L10a:67; P-NB-10 (coach) → L2: L2:111; P-NB-20 → INT: generator bbd2738e (+ Dark owner ADR-028); P-NB-21 → L10a: AL-MOTION-002; P-NB-32 → L10a: L10a:71; P-NB-36 → L1: L1:122; P-NB-38 → L10a: L10a:72, P14-D:46; P-NB-39 → L10a: L10a:73; P-NB-42 → L2: L2:112; P-NB-43 (API) → L2: L2:113 quickLastNight; P-NB-44 → L2: L2:110; P-NB-46/47 → L10a: O3; 3c; P-NB-49 → L4: AL-COPY-034 via L4:78; P-NB-50 → L4: goal-amount.ts messages (L4 P-DV-05); P-NB-51 → L4: L4:67, L4:120 (P-DV-08/61); P-NB-52 → L4: L4:88 own-unit goals one screen; money goals keep the picker by L4's choice; P-NB-53 → INT: 648412e3; P-NB-55…64, 70, 77 → L7: L7:84-91,127,138-140; P-NB-77 via L8:55; P-NB-68 → L2: L2:117; P-NB-75 → L6: L6:92; P-DV-65 → L4: tracked-detail.tsx:238 weeklyConsistencyText; P-DV-68/67 → L1: L1:123 today-intelligence (9ffb2510); P-DVR-36 → L10b: one toast region (434309c3); P-DVR-61 → L1: L1:114 one quote per asset; P-DV-105 → L5: L5:107; P-DVR-65/P-BN-55/P-PR-70 → L6: L6:98, 67, 102; P-NB-C07 → L6: gap 104: Settings already has InstallCard (app/app/settings/page.tsx:242); P-NB-C06 → L10a: AL-PRICING-001 (57fb1e5e); P-NB-C23 → L7: gap 111.
- **L4** (61): P-DV-02 / P-DVR-02 → L2: L2:114 checkGoalTarget; P-DV-03 / P-DVR-04 → L3/L5: L3:101; L5 P-LS-15; P-DV-06 → L2/L3/L7: L2:115; L3:101; L7:24; P-DV-11 → L7: L7:29; P-DV-13 → L3: L3:90; P-DV-15 → L3: L3:91; P-DV-16 → L5: L5:112; P-DV-18 → L3: L3:92; P-DV-22 / P-DVR-10 → L3 + INT: L3:88 counts.ts (81788f5e); P-DV-28 (DV-147) → L1: L1:107, P14-D:34; P-DV-32 / P-DV-33 → L3: L3:97; P-DV-39 (Health side) → L2: L2:116; P-DV-47 → L5: L5:113; P-DV-48/49/50/51/52/104/106/107 → L10a: L10a:76-77; AL-NAV-009/010/012, AL-LAYOUT-DESKTOP-017, O3; P-DV-53 → L10a: DV-246 P14-D:35; DV-204 owner (P14-D:36); P-DV-67/68/69/70 → L3: L3:98-100; L1:123; P-DV-73 (tasks) → L5: ed82fc66 lib/tasks/activity.ts; P-DV-75 / P-DVR-39 (habit rows) → L3: L3:89; P-DV-82…97, 99…101, 103 (20 rows) → L7: L7:29-44, 107, 120-124 (P-DV-96 also L8/P14-B); P-DV-98 → L6→L7: ai-switch.tsx:9 role=switch + visible label (pre-existing); P-DV-102 → L8: L8:53; P-DV-105 → L3→L5: L5:107; P-DV-108/109 → L5: L5:108-109; P-DV-110 → L6→L10a: AL-NAV-010; P-DV-111 (layout) → L6: L6:94; P-DV-112 → L6: L6:89 (part); rest see L6 P-DV-112; P-DV-113/114/115 → L1: L1:106-109; P-DV-116/117/118 → L2: L2:117-118; P-DV-119 → L2: gap 126 (built in part, L5:114); P-DV-120 → L2: L2:119; P-DV-121/122/123 → L3: L3:93-95; P-DV-124/125 → L5: L5:110-111; P-DV-126/127 → L6: L6:91, 90; P-DVR-03 → L1: L1:111; P-DVR-06 → L3: L3:102; P-DVR-18 → L1/INT: 3f4fb8b9 + 39f9cf53; P-DVR-26 → L1: already (wizard :59,:104); P-DVR-32 → L10a: Dark grid (bbd2738e); Checklist island owner; helper text Q7 (see L10a row); P-DVR-33 → L10b: P14-D LA10 (links underline on hover; ADR-033); P-DVR-35 (search) → L6: L6:86; P-DVR-36 → L3/INT: 434309c3; P-DVR-41 → L3: L3:103; P-DVR-44/45/47/48/49/50 → L7: L7:24-28, 125; P-DVR-46 → L7: L7:96 (P-TK-31: answers read the pages' totals); old ids Q7; P-DVR-51/53/55/56/57/58 → L10a: L10a:12-25; P-DVR-52 → L10a→L7: L7:126; P-DVR-54 → L10a: L10a:77; P-DVR-59 → L6: L6:95 + grep; P-DVR-60/61/62 → L1: L1:114-115; P-DVR-63/64/65/66 → L6: L6:96-99; P-DVR-67 → L5: L5:97; P-DVR-69 → L5: L5:115; P-DVR-71 → L2: L2:120; P-DVR-72 → L3: archive toast PR-043 + delete copy (L3:93); day-one availability to replay; P-DVR-74 → L3: L3:36 P-NB-28 (N-086); P-DVR-78/79/80 → L1: L1:117-119; P-DVR-81 (D-196) → L10a: P14-D:20; P-DVR-82 → INT: INT:18; P-DVR-83 → L10a: AL-PRICING-001; P-DVR-87 → L10a: AL-COPY-066 (+ owner D-185); P-DVR-89 → L6→INT: 818805b8.
- **L5** (5): P-LS-48 → L7: L7:154; P-LS-64 → L4: 39f9cf53 field error under Goal asset; P-LS-67 → L3: habit-editor.tsx:127-128 duplicate name said (L3 P-NB-17); P-LS-69 → L10a→P14-D: P14-D:45 (3f4fb8b9); P-NB-38 Arrange bar → L10a: L10a:72.
- **L6** (17): P-BN-01, P-BN-02 → L10a: L10a:79; P-BN-03…05, 07…17 → L7: L7:11-22, 118, 119; P-BN-06 → L8: L8:52; P-BN-23 rest (BN-089, BN-157) → L1, L4: L1:124; tracked-detail.tsx:251-254; P-BN-24 rest (BN-141) → L4: one cap (L4 P-DV-01); P-BN-25 → L4: tracked-detail.tsx:254 date rule (L4 P-DV-04); P-BN-34 → L10a: L10a:80; P-BN-42 → L7: L7:23; P-BN-43 → INT: manifest (818805b8); bluetooth kept by design; P-BN-45, 46 → L10a: L10a:83, AL-LAYOUT-768-005; P-BN-50, 51 → L1: L1:124; P-BN-58, 59 → L4: goal-units.ts:39; L4:67,120; P-DVR-59 (Wealth part) → L1: no advice-like phrase left in Wealth files (grep: only the section name "What you have"); P-DVR-89 → INT: 818805b8; P-DV-98 → L7: already role=switch with a visible label (components/ai/ai-switch.tsx:9); P-DV-110 → L10a: AL-NAV-010 (bbd2738e); P-NB-53 caller → L3: 648412e3.
- **L7** (8): P-BN-12 → L8: L8:59 (88c5bd72); P-BN-17 (BN-069) → L5: ed82fc66 onUnderstood + 5848c55c wiring; P-DV-96 → L8: opening 88c5bd72; composer 5848c55c; field noteNovaDraft in working tree (nova-command.tsx:113, uncommitted); P-TK-31 (one quote) → L1: L1 P-TK-02 one quote per asset; Q6 → L10a: L10a:57; P-DV-99 → L8: L8:57; P-MO-46 → L5: ed82fc66; P-NB-77/P-TK-41 → L8: L8:55.
- **L8** (2): P-DV-96 (composer) → L7→P14-B: 5848c55c; DV-027c → L7→P14-B: 5848c55c (P14-B:44).
- **P14-B** (5): EX3 left 1 → L8: working tree: nova-left.tsx:90, nova-right.tsx:96 hermesPanel (uncommitted); EX3 left 2 → L8: working tree: nova-right.tsx:88 scanStatus (uncommitted); Z1A-I4 button → owner of components/nova/hermes: working tree: components/nova/hermes/forget-key.tsx (untracked) + hermes-card.tsx; Z1A-I5 guide copy → owner of components/nova/hermes: working tree: steps/first-run.tsx:30, further.tsx:37, privacy.tsx:27 localModelStillConfirmed; P-DV-96 (field) → L8: working tree: nova-command.tsx:113 noteNovaDraft.
- **P14-D** (5): AF15 p2 → L2: 39f9cf53 (48 px room); P-DVR-18 call site → L4: 39f9cf53 ceiling = target; MO-150 render → owner of bottom-sections: c6101a30; NB-081/089 → L3: 81788f5e; AL-THEME-007 generator → INT: bbd2738e.
- **L4 P-DVG rows** (60): closed by their gap row in §(d) or by the AL row named: 09, 12, 15, 19, 23, 24, 25, 26, 28, 29 (L3:34 P-NB-26 skip Undo), 30, 32, 34, 35 (L2:70 P-MO-63 (provider = owner config, C-MO-01)), 36, 38, 40, 41, 43, 44, 47, 48, 49, 51, 52, 54 (L1 P-TK-05/P-TK-66 ranking + sortable table), 58, 59, 60, 63, 64, 65, 66 (L1 P-TK-20 Edit beside Remove), 67, 68, 69, 70, 75 (L5:141), 76, 78 (L5:140), 79 (L5:144), 80 (L5:147), 81, 83, 84, 85, 86, 89, 90, 91 (L7:168), 92 (L7:169), 93, 94 (L7:171), 95, 96, 97, 98, 99, 100 (L7:177), 101.

### Owner decision (Needs-other-lane rows)

L1 P-TK-64 — F: Today hero PROTECTED; PUBLIC ALPHA label kept whole (L10a:61); L1 P-TK-62 — F: Light's dark islands (AL-THEME-004); L1 P-TK-99 — gap 041 (push); L10a req P-NB-67 — GO3 hidden pages reachable; honest row text done (L5:117); L2 C-MO-01 — food lookup needs the owner's provider config on the deployment (food runbook 0d1ae858); page side FPP (L2:70); L2 C-MO-10/37 — push activation (owner); L3 P-NB-29 (AI text) — HA11 (two decimals of a minute); Dutch = F Beta; only "1 times per day" plural left (Low, lib/ai words); L3 P-NB-67 — GO3; honest row text (L5:117); L5 P-LS-68 push — push activation; L5 C-LS-09 — push activation; L6 P-BN-39 — F Light islands; L6 P-BN-47 — AK X1 consumer first (L10a:84); P14-A AF15 p3 — conflict: P14-A asks to add `.path-label` to the covers list (path.tsx:393, non-orbit only); P14-D reads it as owner decision AF H137a. Owner to choose; L4 P-DV-44 / P-DVR-30 — ADR-028 H130 gradient words (AL-THEME-003); L4 P-DV-46 — ADR-028 D9/H13 (AL-THEME-006) + generator done; L4 P-DV-131 — F USD/EUR (L1:110); L4 P-DVR-31 — F Light islands (AL-THEME-004). P-DVG rows: 20, 21, 22, 27, 33, 37, 42, 46, 56, 71, 72, 73, 74, 77, 82, 88 (see §d).

### Not possible (Needs-other-lane rows)

L10a AL-PERSISTENCE-011 page parts — L1:15 and L2:32 Not possible (evidence); L4:89 Owner GO5; P-PR-08: nothing re-keys (L10a:19); L10a AL-PERF-010 — Next 16 render-blocking CSS; needs a throttled-network repro on the production build; L2 P-MO-50 (menuitem) — valid disclosure pattern (P14-D:42); L3 P-NB-16 — AL-PERF-010 (needs repro); L3 P-NB-72 — kept: one-decimal weight history pinned by AH TR10; exact value in the correction form (48ff38eb); L6 P-BN-35 — L10a:81 (evidence; needs a 375 repro). P-DVG rows: 45, 57, 61 (see §d).

## (d) Every COMPETITOR-GAP row (178): closing status

B = Built (incl. already existed) · S = Still open · O = Owner decision · N = Not possible. Lane = the ledger's lane; for S, the receiver.

| gap | lane | P-rows | status | evidence / reason |
|---|---|---|---|---|
| 001 | L1 | P-DVG-15 | B | history chart from recorded snapshots + "why it changed" (wealth-history-chart.tsx, lib/wealth-changes.ts); back-fill = N (F unknown≠0, L1 P-TK-79) |
| 002 | L1 | P-DVG-43 | B | components/hide-amounts.tsx |
| 003 | L1 | P-DVG-44 | B | components/wealth/bills, lib/bills |
| 004 | L1 | P-DVG-47 | B | components/wealth/budgets, lib/budgets |
| 005 | L1 | P-DVG-48 | B | history chart + networth-milestones.tsx; weekly recap = NOVA Review my week (L7 P-DVG-96) |
| 006 | L1 | P-DVG-49 | B | components/wealth/debt-planner.tsx, lib/debt-planner |
| 007 | L1 | P-DVG-50 | S (L1 · Low · M) | deterministic FI model exists (lib/fi-model, fi-model-panel.tsx); Monte Carlo band not built (label as projection, F) |
| 008 | L1 | P-DVG-51 | B | YNAB import lib/import/switch/ynab.ts + bank files CAMT/MT940/OFX (lib/bankfiles); Mint/Copilot presets not (Low) |
| 009 | L1 | P-DVG-52, P-TK-85 | B | L1 P-TK-85 coin-page alerts (9ffb2510), lib/price-alerts |
| 010 | L1 | P-DVG-53, P-TK-88 | S (INT · Med · M) | lib/positions.ts:86 `watchlist …max(8)` (TIER 3 stored format); named lists (L1 P-TK-88) |
| 011 | L1 | P-DVG-56 | O | full catalogue search exists (TK-206); live stock/ETF quotes need a paid feed (F); WE16 split = owner M36 |
| 012 | L1 | P-DVG-57, P-TK-91 | N | no news/earnings source (F: no fake integrations) L1 P-TK-91 |
| 013 | L1 | P-DVG-58 | B | "why did my net worth change" on device (lib/ai/tools/why-ai.ts, P14-B G11); chart-specific explain = model work (REAL_MODEL_TODO) |
| 014 | L1 | P-DVG-59, P-TK-75 | B | FIFO/LIFO view + lib/portfolio/lots.ts; stored lots/HIFO = O (M36) L1 P-TK-75 |
| 015 | L1 | P-DVG-60 | B | lib/portfolio/realized-csv.ts |
| 016 | L1 | P-DVG-62 | S (L1 · Low · M) | lib/portfolio/performance.ts has all-time, realized/unrealized, dayChange; no TWR/MWR or index benchmark |
| 017 | L1 | P-DVG-63 | B | components/wealth/allocation/target-allocation.tsx (drift vs target) |
| 018 | L1 | P-DVG-64 | B | lib/fee-drag, money-tools/fee-drag-panel.tsx |
| 019 | L1 | P-DVG-65 | B | read-only ZIGChain positions (lib/native-positions.ts); any-address EVM/DeFi P&L = N (paid indexer, F) |
| 020 | L1 | P-TK-74, P-DVG-46 | O | F: Alpha USD/EUR, no FX (L1 P-TK-74) |
| 021 | L1 | P-TK-76 | O | AK R22 Portfolio/Wealth separate (L1 P-TK-76) |
| 022 | L1 | P-TK-77, P-DVG-45, P-DVG-61 | N | paid aggregator or ZIGoals server (F) L1 P-TK-77 |
| 023 | L1 | P-TK-78 | B | tracked ZIGChain addresses (lib/staking/tracked-wallets.ts) + BTC xpub watch (components/wallet/xpub-watch.tsx); ENS/EVM lookup = N (provider) |
| 024 | L1 | P-TK-79 | N | F unknown≠0 (L1 P-TK-79) |
| 025 | L1 | P-TK-80 | N | Wealth holdings carry no cost basis; Portfolio has P&L (L1 P-TK-80) |
| 026 | L1 | P-TK-81 | B | L1 P-TK-81 (9ffb2510) |
| 027 | L1 | P-TK-82 | O | F: no server sharing (L1 P-TK-82) |
| 028 | L1 | P-TK-83 | S (L1 · Low · S) | L1 P-TK-83 "not built; needs a device pref key + Today widgets (L3)"; web-possible, no F conflict |
| 029 | L1 | P-TK-84 | B | L1 P-TK-84 |
| 030 | L1 | P-TK-86 | O | O2: no paywall lever (L1 P-TK-86) |
| 031 | L1 | P-TK-87 | B | L1 P-TK-87 price-chart.tsx costLine |
| 032 | L1 | P-TK-89 | B | L1 P-TK-89 (TK-206) |
| 033 | L1 | P-TK-90 | B | L1 P-TK-90 |
| 034 | L1 | P-TK-92 | N | Banxa has no fee API (L1 P-TK-92) |
| 035 | L1 | P-TK-93 | B | L1 P-TK-93 |
| 036 | L1 | P-TK-94 | B | L1 P-TK-94 |
| 037 | L1 | P-TK-95 | B | L1 P-TK-95 |
| 038 | L1 | P-TK-96 | B | saved scenarios (L1 P-TK-96); sharing = O (F) |
| 039 | L1 | P-TK-97 | B | L1 P-TK-97 calculatorCsv |
| 040 | L1 | P-TK-98 | S (L3 · Med · S) | Today Wealth tile: value chart / 24h change (lib/portfolio/performance.ts:99 `dayChange` exists); L1 P-TK-98 |
| 041 | L1 | P-TK-99 | O | push delivery waits on owner (ADR-033 M48); in-app NOVA morning brief exists (lib/ai/proactive/brief.ts) |
| 042 | L2 | P-DVR-90 | S (L2 · Low · S) | N-085 optional activity type on exercise minutes (old id, Q7 replay); nobody took it (L4:280→L3, AL row L2) |
| 043 | L2 | P-MO-79 | B | L2:87 week-digest (48ff38eb) |
| 044 | L2 | OWN:C-MO-02 | B | L2: RepeatDay / "Copy yesterday's breakfast" |
| 045 | L2 | OWN:C-MO-03 | S (L2 · Med · M) | HEALTH_MEALS enum + diary meal (TIER 3 additive); L2 "Later" |
| 046 | L2 | OWN:C-MO-06 | B | Insights 30-day chart + nutrient report |
| 047 | L2 | OWN:C-MO-07 | B | app/api/recipe-import/route.ts + lib/server/recipe-import (AA-Local N6) — L2 wrote "Not possible (needs a fetching server)": wrong, the route exists |
| 048 | L2 | OWN:C-MO-08 | S (L2 · Low · M) | g/mL only; needs per-food density |
| 049 | L2 | OWN:C-MO-10 | O | push (owner); in-app "Fasting end" exists |
| 050 | L2 | OWN:C-MO-11 | O | F private (sharing); CSV export widened (P-MO-60); a print/PDF view would be web-possible (Low) |
| 051 | L2 | OWN:C-MO-12 | O | F: no provider images |
| 052 | L2 | OWN:C-MO-16 | B | coach weekly check-in |
| 053 | L2 | OWN:C-MO-17 | S (L2 · Med · M) | measurement kind enum has no body-fat (TIER 3 additive) |
| 054 | L2 | OWN:C-MO-20 | N | no background audio/alarm on the web |
| 055 | L2 | OWN:C-MO-21 | B | imports keep stage minutes |
| 056 | L2 | OWN:C-MO-22 | N | no background recording on the web |
| 057 | L2 | OWN:C-MO-23 | O | no advice (F/AK); bedtime band from own goal exists |
| 058 | L2 | OWN:C-MO-25 | O | by design (ledger) |
| 059 | L2 | OWN:C-MO-26 | B | meditation bell prefs |
| 060 | L2 | OWN:C-MO-27 | B | workouts PB card |
| 061 | L2 | OWN:C-MO-28 | B | exercise history |
| 062 | L2 | OWN:C-MO-29 | B | addCustomExercise |
| 063 | L2 | OWN:C-MO-30 | O | F private / no server |
| 064 | L2 | OWN:C-MO-31 | B | Freshness map |
| 065 | L2 | OWN:C-MO-32 | B | Warm-up and plates |
| 066 | L2 | OWN:C-MO-35 | O | L2 cites "no streak pressure for fasting" — not in AL_SCOPE F; owner to confirm |
| 067 | L2 | OWN:C-MO-37 | O | push (owner) |
| 068 | L2 | OWN:C-MO-38 | N | no step sensor API on the web |
| 069 | L2 | OWN:C-MO-39 | O | by design ("No calorie expenditure is estimated") |
| 070 | L2 | OWN:C-MO-40 | B | Your numbers |
| 071 | L2 | OWN:C-MO-42 | S (L2 · Low · S) | no Sleep Cycle reader in lib/import/switch |
| 072 | L2 | OWN:C-MO-43 | S (L2 · Low · S) | lib/import/switch/oura.ts exists but rejected the bot's layout |
| 073 | L2 | OWN:C-MO-55 | S (L2 · Low · S) | local-only weekly usage card (L2 "Later") |
| 074 | L2 | OWN:C-MO-56 | B | energy estimate |
| 075 | L2 | OWN:C-MO-57 | B | debt, consistency, balance on Sleep |
| 076 | L2 | P-DVG-36, OWN:C-MO-59 | B | HE17 meal-photo card (5848c55c), lib/ai/photo.ts, label scan, Quick add text; model quality = F (no real-model calls) |
| 077 | L2 | P-DVG-37, OWN:C-MO-44 | O | AH HE18 Later (owner); live sync needs per-provider OAuth server (F) |
| 078 | L2 | P-DVG-38, OWN:C-MO-05 | B | calorie week "Shift" |
| 079 | L2 | P-DVG-39, OWN:C-MO-09 | S (L2 · Med · M) | drink type / caffeine needs a water-entry field (TIER 3 additive); L2 "Later" |
| 080 | L2 | P-DVG-40 | B | lib/workouts sets/reps, PB, history |
| 081 | L2 | P-DVG-41 | B | lib/fasting, past fasts (48ff38eb); reminders = O (push) |
| 082 | L2 | P-DVG-42, OWN:C-MO-04 | O | L2 cites "no suggested calorie/macro/weight defaults" (earlier owner rule, not in F) — confirm |
| 083 | L3 | P-DVG-21, P-DVG-77, P-NB-C10, P-DVG-07 | O | F: widgets Beta (L3:138) |
| 084 | L3 | P-DVG-27, P-NB-C15 | O | built in AK (public/sw.js Done/Snooze); live once owner turns push on (P14-A CO11) |
| 085 | L3 | P-PR-48 | S (L3 · Med · M) | no per-habit route (app/app/habits has only page.tsx); P-PR-48 in no lane file |
| 086 | L3 | P-DVG-16, P-NB-C18 | S (L3 · Low · M) | journal/notes search reach entries (L5:151); mood+note at check-in feed not built (L3:145 Later) |
| 087 | L3 | P-DVG-19 | B | Checklist "Done yesterday" (P-LS-30) + Today's rhythm; backlog beyond 7 days not |
| 088 | L3 | P-DVG-20 | O | changes what lights the PROTECTED finale (L5 C-DVG-74) |
| 089 | L3 | P-DVG-23 | B | NOVA morning brief with a goal line (L7 P-DV-101), Review my week (L7:173) |
| 090 | L3 | P-DVG-24 | B | quick-add-mic + multi-item lines (L7:172) |
| 091 | L3 | P-DVG-25 | B | widget library / Add widget (lib/dashboard-settings.ts, L3 P-DV-70) |
| 092 | L3 | P-DVG-26 | B | streak blocks on every card (PROTECTED) + habit-consistency heatmap |
| 093 | L3 | P-DVG-28, P-NB-C16 | B | L3:134 |
| 094 | L3 | P-DVG-30 | B | limit/quit habits (L3 P-DV-122) |
| 095 | L3 | P-DVG-31, P-NB-C17 | S (L3 · Low · S) | routines + Guided journeys exist; more packs Later (L3:145) |
| 096 | L3 | P-DVG-32, P-NB-C20 | B | "As a 30-day challenge"; leaderboards = O (F social) |
| 097 | L3 | P-DVG-33, P-NB-C09 | O | F: D3/CO9 |
| 098 | L3 | P-DVG-34, P-NB-C12 | B | Loop/Habitica/Daylio readers (lib/import/switch) + empty-state link (L3:128) |
| 099 | L3 | P-NB-C01 | O | F: ZIGi look locked |
| 100 | L3 | P-NB-C02 | B | goal why/if-then, habit intention (L3:130) |
| 101 | L3 | P-NB-C03 | O | push activation (G) |
| 102 | L3 | P-NB-C04 | B | L3:129 |
| 103 | L3 | P-NB-C05 | S (L3 · Low · S) | level preview in setup (L3:145 Later) |
| 104 | L3 | P-NB-C07 | B | app/app/settings/page.tsx:242 InstallCard + onboarding step 6 (L3 sent the Settings part away; it already exists) |
| 105 | L3 | P-NB-C08 | B | Routines |
| 106 | L3 | P-NB-C13 | B | streak repair freezes |
| 107 | L3 | P-NB-C14 | B | Today's rhythm |
| 108 | L3 | P-NB-C19 | N | F no fake integrations; wearables need readers (AK 4.7) |
| 109 | L3 | P-NB-C21 | B | Agenda + ICS export |
| 110 | L3 | P-NB-C22 | O | F: native/widgets Beta |
| 111 | L3 | P-NB-C23 | B | ZIGi knock reminders, brief, held gaze (5848c55c); L3 left it with L7, L7 never listed it |
| 112 | L3 | P-NB-C24 | N | no background geofence/alarm on the web |
| 113 | L4 | P-DV-41, P-DVG-04 | B | challenge-card 52-week ladder (L4:100) |
| 114 | L4 | P-DV-59 | B | L4:118 moveMilestone |
| 115 | L4 | P-DV-64, P-DVG-03 | S (L4 · Low · M) | hierarchy exists (lib/goal-hierarchy.ts); Tree create/drag editor Later (L4:123) |
| 116 | L4 | P-DVG-05 | O | F private, no shared goals |
| 117 | L4 | P-DVG-01 | B | goal-forecast-panel.tsx (L4:282) |
| 118 | L4 | P-DVG-02 | O | 4 kinds + 53 templates built; SMART step wizard: wizard steps stay (L4:283) |
| 119 | L4 | P-DVG-06 | S (L4 · Med · M) | debt planner has payoff date + interest (lib/debt-planner) but no pay-down Goal kind; L4→L1, L1 never took it |
| 120 | L4 | P-DVG-09 | B | reminders plan has a goal check-in (components/reminders/reminders-plan.tsx:23); push = O. L4→L6, L6 never took it |
| 121 | L4 | P-DVG-10 | S (L4 · Low · S) | custom congrats, h/min time (L4:291 Later) |
| 122 | L4 | P-DVG-11 | S (L4 · Low · M) | streak of goal days / completed-history chart; L4→L3, L3 never took it |
| 123 | L4 | P-DVG-12 | B | lib/weekly-review, NOVA Review my week, Health week digest; L4→L6, L6 never took it |
| 124 | L4 | P-DVG-13 | S (L4 · Med · M) | Activity reports by week/month/year (L4:294 Later) |
| 125 | L4 | P-DVG-14 | S (L4 · Low · S) | life balance wheel exists; "perfect weeks" → L3, never taken |
| 126 | L5 | P-DV-119 | B | wrap-up moods + Journal scales (L5:114); Health mood chip → L2 (Low, open) |
| 127 | L5 | P-DVG-73 | O | F no server; exists: extras sync + encrypted backup (L5:148) |
| 128 | L5 | P-DVG-74 | O | PROTECTED finale (L5:149) |
| 129 | L5 | P-DVG-76 | B | list-view clock time (L5:146) |
| 130 | L6 | P-BN-74 | B | L6 governance filter (321d85d5) |
| 131 | L6 | P-BN-89 | B | Lichess play board; engine opponent = O (no new dependency) |
| 132 | L6 | P-BN-66, P-DVG-67 | B | Earn validators-section.tsx |
| 133 | L6 | P-BN-67, P-DVG-72 | O | F non-custodial (standing grant) |
| 134 | L6 | P-BN-68, P-DVG-69 | B | staking-clarity.tsx rewards + CSV |
| 135 | L6 | P-BN-69, P-DVG-68 | B | unbonding calendar |
| 136 | L6 | P-BN-70 | B | Earn list sorts commission/uptime side by side (L6:132) |
| 137 | L6 | P-BN-71 | B | validator-health.tsx alerts; push = O |
| 138 | L6 | P-BN-72 | O | "information, never a ranking or advice" (L6:134) |
| 139 | L6 | P-BN-73 | B | Earn summary + rewards history (part) |
| 140 | L6 | P-BN-75 | B | governance search |
| 141 | L6 | P-BN-76 | O | push (owner) |
| 142 | L6 | P-BN-77 | N | relay has no per-validator vote read (L6:141) |
| 143 | L6 | P-BN-78 | B | proposal-card turnout |
| 144 | L6 | P-BN-79 | S (L6 · Low · M) | 5 of 18 have a TVL read; trend needs a stored history (L6 "not planned now") |
| 145 | L6 | P-BN-80 | O | filter would read as endorsement (L6:140) — owner to confirm |
| 146 | L6 | P-BN-81 | S (L6 · Low · M) | needs a position→project mapping (L6:141) |
| 147 | L6 | P-BN-82 | B | name/status sort (TVL sort N: 5/18) |
| 148 | L6 | P-BN-83 | B | status filter |
| 149 | L6 | P-BN-84 | B | lib/chess/streak.ts |
| 150 | L6 | P-BN-85 | B | openings stats |
| 151 | L6 | P-BN-86 | B | Lichess history |
| 152 | L6 | P-BN-87 | S (L6 · Low · S) | dated puzzle log = new device store (L6:143) |
| 153 | L6 | P-BN-88 | S (L6 · Low · M) | rating goal → Goals link needs a Goals store change (L6:144) |
| 154 | L6 | P-BN-90 | B | a switch is its own undo; showUndo for removals (L6:146) |
| 155 | L6 | P-BN-91, P-DVG-86 | B | Search finds every Settings section (lib/search/static.ts) |
| 156 | L6 | P-BN-94, P-DVG-82 | O | F: currency settings Beta |
| 157 | L6 | P-BN-95 | O | F: Beta |
| 158 | L6 | P-BN-96 | O | F: Beta |
| 159 | L6 | P-BN-97 | B | Help "Show me" tours instead of stale screenshots (L6:151) |
| 160 | L6 | P-DVG-70 | B | Earn Valdora stZIG section |
| 161 | L6 | P-DVG-71 | O | F: Beta |
| 162 | L6 | P-DVG-81 | B | PIN screen cover; biometric = N (no server check) |
| 163 | L6 | P-DVG-84 | B | ZIGi off + per-page sharing; household = O (F) |
| 164 | L6 | P-DVG-85 | B | Settings → Notifications (quiet hours) |
| 165 | L6 | P-DVG-87 | S (L6 · Low · S) | Search Help exists; per-article "last updated" dates not |
| 166 | L6 | P-DVG-88 | O | F: no server |
| 167 | L6 | P-DVG-89 | B | welcome tour + Help tours (components/tour) |
| 168 | L7 | P-DVG-101 | B | NOVA Cost tab (lib/ai/usage.ts) |
| 169 | L7 | P-DVG-93 | B | L7:170 (DV-071) |
| 170 | L7 | P-DVG-95 | B | L7:172 |
| 171 | L7 | P-DVG-96 | B | L7:173 |
| 172 | L7 | P-DVG-97 | B | L7:174 |
| 173 | L7 | P-DVG-98 | B | L7:175 |
| 174 | L7 | P-DVG-99, P-NB-C11 | B | WebMCP opt-in; public API = O (F) |
| 175 | INT | P-BN-92 | S (INT · Low · M) | INT "owner decision" but web-possible and no F conflict (lib/export/everything.ts range mode) |
| 176 | INT | P-BN-93 | S (INT · Med · M) | INT "owner decision"; module restore replaces one area, an erase per area needs the erase catalog (erase-everything.tsx) |
| 177 | INT | P-DVG-83 | B | readable export restores Tasks/Checklist/holdings (818805b8) + importers lib/import/switch (YNAB, Loop, Habitica, Strava, Strong, Hevy, Oura…) — INT wrote "importers not built": they exist |
| 178 | INT | P-DVG-90 | B | lib/whats-new.ts + Help What's new (content stale = AL-HELP-006) |
