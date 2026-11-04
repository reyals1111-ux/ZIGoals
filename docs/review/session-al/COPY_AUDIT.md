# Session AL — whole-app copy audit (A5, lane L4)

What this is: every copy finding of the Grok #53 run, as one per-file list a lane can work from. Sources: every row keyed
`COPY` in every ledger under `docs/review/session-al/ledger/` (257 finding lines, grouped by their P-row: 88 rows), plus
L4's own read of `denver.md` "Copy / UX notes" (N-DV-01…16) and its findings table. The rows L4 owns were applied in this
session; their exact before/after strings are in section 2.

## 1. The copy rules every lane applies

- Plain English, consumer first. No crypto words (ZIG, stake, Positions, allocation, wallet, chain, RWA) outside the
  modules a person chose (Earn, Staking, Governance, the chain parts of Wealth). Owner decision F.
- Never change the slogans or the Today hero text (AF9, PROTECTED). Never "Jarvis", Iron Man or Marvel.
- Money and health copy is information, never advice ("Nothing here is advice" next to a "Put it to work →" is still advice).
- Unknown is not zero: "—" or "No data yet" with the reason; a real 0 says what it measures ("0% toward targets").
- One word per thing: "goal" in lower case mid-sentence; one name per goal kind (Savings goal · Count goal · Project ·
  Keep an average · Rewards goal); "done" for a tick, "reached" only for recorded progress.
- A refusal says why, under the field that caused it ("Enter an amount above 0."), never a bare "Could not save.".
- A toast says what happened ("Goal closed. Its history stays, and you can reopen it."), never a generic
  "Private Goal saved. No funds moved." after a delete or a tick. Reversible actions offer the one Undo (`showUndo`).
- Counts use `countText`/`unitAmountText` ("1 milestone", "20 books"); dates use `formatDate` ("Dec 4, 2026"), never ISO.

## 2. Applied by L4 in this session (exact strings)

| file | current text | new text | finding ids | owning lane | status |
|---|---|---|---|---|---|
| apps/web/lib/goal-summary.ts (`formatGoalAmount`) | "20 BOOKS", "1 milestones", "$99,999,999,999,999,999,999.00" | "20 books", "1 milestone", a compact "$100,000,000T" for a legacy amount of 10^18 or more | DV-014, DV-019f-1, DV-022c-1, DV-040b, DV-054a, DV-057d, DV-084b, DV-108, DV-125, D-195 | L4 | Applied |
| apps/web/lib/goals/goal-amount.ts (wizard target, Edit target, plan, history, Fund) | 0 → "Enter a positive target." / −5 → "Enter a non-negative decimal amount." / 0 history → "History was not saved." / 0 Edit → "Could not save." | 0 and −5 → "Enter an amount above 0."; over a trillion → "Enter an amount up to a trillion (1,000,000,000,000)."; empty → "Enter your target." / "Enter the planned amount." / "Enter an amount." (unreadable text keeps "Enter a non-negative decimal amount.", pinned by a11y-field-errors.spec.ts) | DV-003a, DV-009, DV-025a, DV-033a, DV-049a, DV-050a, DV-055a, DV-097; D-101, M-123, N-155 | L4 | Applied |
| apps/web/components/platform/tracked-detail.tsx (confirm) | "Delete this private Goal?" · "The Goal and its private plan will be removed. Positions and Habit history remain." | "Delete this goal?" · "The goal, its plan and the history kept with it are removed. Your assets, accounts and habits stay. You can undo this right after." | DV-026c, N-DV-16 | L4 | Applied |
| same (confirm) | "Close this Goal?" · "Allocated units become available to other Goals. No assets move." | "Close this goal?" · "It leaves your active goals. Its history stays, and you can reopen it. Money counted toward it is freed for other goals; nothing moves." | DV-021a, N-DV-16 | L4 | Applied |
| same (Delete reason) | "A Goal with a plan or recorded contributions keeps that history for good, so it cannot be deleted. Close it instead: …" (wrong for milestone-only goals, shown above the header) | Inside the menu, beside Delete: "This goal keeps a reached target for good, so it can’t be deleted yet. Close it instead: it leaves your active goals, keeps its history, and you can reopen it later." (names the actual history: a contribution plan / N recorded contributions / a reached target) | DV-021b/c, DV-100; BUG-010 | L4 | Applied |
| same (toasts) | "Private Goal saved. No funds moved." after Pin, Lock, Close, Reopen, Delete, a tick | "Goal pinned to the top of your Goals." · "Goal unpinned." · "Editing locked. Unlock it here to make changes." · "Editing unlocked." · "Goal closed. Its history stays, and you can reopen it." · "Goal reopened. It starts a new cycle." · "Deleted “<name>”." + Undo · "Milestone done: “<title>”." · "Milestone added: “<title>”." · "Allocation released. No assets moved." · "Goal details saved." (plan saves keep "Private Goal saved", pinned by platform-habits.spec.ts) | DV-019f-2, DV-025i, DV-026b, DV-111; P-DV-12 | L4 | Applied |
| same (hero) | "CURRENT WEALTH" on a count goal | "Counted so far" (own unit) · "Current holding" (coin/asset) | DV-034a, DV-104 | L4 | Applied |
| same (Project) | "Saving plan · No saving plan yet", "Review your latest wealth observations" on a project | hidden on projects | DV-018, DV-040c, MO-122 | L4 | Applied |
| same (Edit details) | empty name: nothing happens; past deadline saved | "A name can’t be empty." under the field; "Choose today or a later date for the deadline." | DV-025d/f | L4 | Applied |
| apps/web/components/platform/plan-history.tsx | "Target reached · … · target 1 USD · counted 4 USD" on a project | "Target reached · <date> · every milestone done"; money goals in their unit ("target $500.00 · counted $500.00") | DV-041b; M-049 | L4 | Applied |
| apps/web/components/platform/goal-intelligence.tsx | "Actual contributed 3 BOOKS · Explicit records, net of reversals" while the hero says 0 of 20 | "Includes 3 books recorded as history only, which never changes progress"; "Next contribution Dec 4, 2026" (was ISO) | DV-008a, DV-033d, DV-037, DV-050c | L4 | Applied |
| apps/web/components/platform/contribution-flow.tsx | "Choose the same asset as this quantity Goal." · "Contribution quantity (UNIT)" · "Actual amount in BOOKS" | no asset step for a goal of your own unit; "How many books did you add?"; "Add the books you finished. They count toward this Goal right away."; "How many books (history only)" | DV-034b, DV-035, DV-103, DV-123 | L4 | Applied |
| apps/web/components/goal-card.tsx | "VALUE GOAL", "QUANTITY GOAL" chip; "Of your goal funded" on a 10K run | "Savings goal", "Count goal", "Project"; "Of the way there" for anything that is not money | DV-008b, DV-022c-2, DV-039a, DV-049c, DV-057b | L4 | Applied |
| apps/web/components/unified-goal-wizard.tsx | "Use at most 100 characters." on step 2 for a step-1 milestone line; "Your unfinished Goal is back…" on steps 2–4; "Progress source: Existing wealth" when nothing was chosen; "Reach a number of something ·  · Custom" | "Milestone 2 is 150 characters long; use at most 100." / "Milestones 1 and 3 have the same name. Give each step its own name." under the box on step 1; banner on step 1 only; "Nothing chosen yet · add it on the goal’s page" / "Money you already have" / "What you save from now on" / "Completed milestones"; no empty slot; review target "$1,000.00" / "20 books" | DV-004, DV-005, DV-016a/b, DV-122 | L4 | Applied |
| same (weight idea) | "A weight goal · Lives with your Health goals…" | "A weight goal ↗ · Opens Health goals: a weight you choose, from your Health journal." | DV-083b | L4 | Applied |
| apps/web/components/platform/goal-milestones.tsx | empty name: nothing; "You already have a milestone with that name." | "Give the milestone a name." · "A milestone can be at most 100 characters (this one has 150)." · "This Goal already has a milestone called “Plan”. Give this one another name." · "Choose today or a later day for the milestone."; "past its date" on an overdue one | DV-019b/c/d, DV-040d/e, DV-107, DV-109 | L4 | Applied |
| apps/web/components/goals/achievements-hall.tsx | "When a goal is done, mark it complete on its page and write a line about how it went." | "A goal lands here on its own when it reaches its target or its last milestone is done. Closing it later keeps it here." | DV-020a, DV-058b | L4 | Applied |
| apps/web/components/goals/average-goals.tsx | "A FIFTH KIND OF GOAL"; "Remove this goal" removes at once | "Keep it steady"; "Remove “Sleep 7 hours”? Its 12 entered days go with it. Health records stay. You can undo this right after." + Remove / Keep it, then "<name> removed." + Undo | DV-052b/c | L4 | Applied |
| apps/web/components/goals/balance-wheel.tsx + life-balance-card.tsx | "Wealth 0 %" beside "never counted as zero" | "Wealth 0% toward targets"; footnote: "Each area shows how far its goals and habits are toward their targets this month, from what is known. Records alone don’t move it; an area with nothing known says “No data yet” and is never counted as zero." | DV-039c, DV-058c, N-DV-01 | L4 | Applied |
| apps/web/components/goals/vision-board.tsx + goals-overview.tsx (tree) | ring 99 % over "100 % of the way" on a closed goal | "Finished · closed" / "Closed"; ring and words read one rule | DV-043a/b | L4 | Applied |
| apps/web/components/goals/template-library.tsx | "Use this template" → jumps to #goals-health | "Open Health goals" + "Opens Health goals on the Goals page, with a weight goal ready to fill in." (the prefill itself → L2) | DV-181 | L4 (+L2) | Applied (wording) |
| apps/web/lib/goal-intelligence.ts (timeline/Activity) | "Goal milestones changed" ×7; "Goal closed" ×2; "Target reached · retained milestone"; "Goal reopened · new cycle"; "Target revised · new cycle" | "Milestone ticked: “Build”" / "Milestone removed: “Extra”" / "Milestone renamed: “A” → “B”"; one "Goal closed"; "Target reached · goal completed"; "Goal reopened"; "Target changed" | DV-046a/b, DV-088, DV-112, DV-113; G-033, G-035, BUG-040 | L4 | Applied |
| apps/web/components/activity-feed.tsx | "Saved Goal creation date", "Explicit manual attribution", "Private Goal history"; corrections without a sign; "milestones" with no number | "Goal created · <name> · target $500.00" (or "· 4 milestones"), "Added by you", "Your goal’s history", "Income you recorded"; "−$50.00" on withdrawals and corrections; "4 milestones" | DV-036b, DV-046c, D-156 | L4 | Applied |
| apps/web/app/app/activity/page.tsx | no time zone | "Times are shown in Europe/Brussels." (journal zone, else the device's) | DV-046f, DV-054e, N-DV-15 | L4 | Applied |

## 3. Requests from the audit for other lanes (from the ledgers)

Generated from the ledgers' COPY rows, grouped by P-row and owning lane; "current text" quotes the bot. Status "Open" means
the owning lane has not reported it here; L4's own rows show what was applied (section 2 has the exact strings).

### L1 wealth (11 rows)

| file | current text | new text | finding ids | owning lane | P-row · status |
|---|---|---|---|---|---|
| Markets sort dropdown | “(see P-row)” | explain "As listed" | N-TK-24 | L1 wealth | P-TK-72 · Open |
| Wealth asset forms/cards (`components/platform/asset-editor.tsx`, `asset-source.ts`, `asset-detail.tsx`, wealth-view) | “CoinGecko tokenized RWA reference units”; “physical metal”; “1234.56”; “Holding value Unavailable”; “Net worth, in Accounts, debts & net worth, adds accounts and takes off debts.”; “2 assets” | Plain stock help (no "RWA"/metal), formatted edit value, toast with the new name, archive consequence line, "Archived · was $…", header "2 assets · 1 account", fix the spliced total sentence | DV-145, DV-146, DV-148, DV-251, DV-252c | L1 wealth | P-DV-113 · Open |
| Wealth calculator + Staking calculator | “ same 5 % gives simple APR vs monthly compounding, no cross-reference ” | one line in each naming its model (monthly compounding vs simple APR) and pointing to the other | TK-222 | L1 wealth | P-TK-69 · Open |
| Wealth manual asset cards (guess) | “Reference price per property: Unavailable” | Hide "Reference price … Unavailable" for manual assets; even card heights | D-148 | L1 wealth | P-DVR-80 · Open |
| `asset-picker.tsx` stocks/ETFs/metals + market logos | “CoinGecko tokenized RWA reference units”; “shares” | say "tokenized reference, not your broker's shares" before saving; one icon per asset across Markets/search/Wealth (no token logo for XAU) | TK-134, TK-203 | L1 wealth | P-TK-48 · Open |
| `components/add-money/add-money-view.tsx`, `next-steps.tsx` | “(see P-row)” | step 3: a "Link a wallet" button to the real control; scroll/focus each next step; provider + fee note before leaving; ZIG-via-ATOM estimate; content width | TK-034, N-TK-11, N-TK-25, W25 | L1 wealth | P-TK-23 · Open |
| `components/calculator/calculator.tsx` | “(see P-row)” | one disclaimer under the result; explain the "10k" milestone | TK-6B-10, N-TK-26 | L1 wealth | P-TK-70 · Open |
| `components/platform/asset-picker.tsx` | “ no debt/mortgage route in Add asset; mortgage not linked to the property card ” | "Owe something on this?" link to Add an account or debt; optional link of a mortgage to its property | TK-133 | L1 wealth | P-TK-47 · Open |
| `components/platform/wealth-changes.tsx` + Recorded journey card | “Two valid observations on different days draw the chart.”; “99 % unclassified” | remove the duplicated "Two valid observations…" sentence, add padding, plain-language "come back tomorrow" text | TK-038 | L1 wealth | P-TK-27 · Open |
| `components/portfolio/portfolio-view.tsx` tabs | “Insights” | rename "Insights" to "Transactions" or show key stats by default | TK-030 | L1 wealth | P-TK-22 · Open |
| `components/portfolio/transaction-form.tsx` | “(see P-row)” | surface Reward / Airdrop / Income in the Type list (today only "Received as" under Transfer in) | N-TK-04, P5, C-TK-16 | L1 wealth | P-TK-17 · Open |

### L2 health (14 rows)

| file | current text | new text | finding ids | owning lane | P-row · status |
|---|---|---|---|---|---|
| (no P-row) | “device key” | (see the P-row) | M-062 | L2 health | P-MO-80 (split remains) · Open |
| Health empty states (`lib/measurement-trends`, `lib/food-search.ts`, guess) | “Add two observations”; “Log a food or recipe to see it here.”; “No matches” | Empty-state text chosen by data present / query non-empty ("No matches") | PR-021, PR-096 | L2 health | P-PR-24 · Open |
| Health page copy (components/health; guess) | “error”; “PROVIDER_SETUP_REQUIRED”; “Set a daily goal in Targets.”; “Undo” | Health copy fixes: dash for no data, sleep form placement, quick-pick meal, Water target pointer, nap wording, weight-goal card text, food-lookup unavailable message | B-086, B-161, BUG-023, D-011, D-022, D-046, D-050, N-004 | L2 health | P-DVR-71 · Open |
| Targets intro / Daily nutrient details | “no suggested… defaults” | say micronutrients show reference intakes, calories/macros are yours | MO-135 | L2 health | P-MO-67 · Open |
| `barcode-food-lookup.tsx` review form | “Barcode meal”; “Unknown g”; “also kept” | label "Meal"; licences in a Sources footer; show all kept nutrients | MO-006 | L2 health | P-MO-64 · Open |
| `components/health/daily-tools.tsx` copy source | “(see P-row)” | options "Whole day (keep meals)" / "<meal> of <date>"; no hidden dependency; plural | MO-011 | L2 health | P-MO-74 · Open |
| `components/health/health-app.tsx` cards | “Editing Nov 2”; “0 meal groups · 0 entries”; “Log weight · water · food”; “food · water · weight”; “not enough”; “Energy estimate” | One "Set targets" CTA, hide "0 meal groups" when empty, macro tiles fit 388; the same quick-action order at every width; grey trend until enough data, rename "Energy estimate"; an "Editing <day>" banner with Cancel | DV-143, DV-254a, DV-269a, DV-280 | L2 health | P-DV-120 · Open |
| `components/health/meal-photo-panel.tsx` | “A photo of a meal”; “Your kitchen library”; “Opening…” | card header, move to Diary near "Log a meal", disabled state with "Connect AI" | MO-012, MO-156 | L2 health | P-MO-40 · Open |
| `components/health/workouts/workouts-view.tsx` | “0 min”; “1 workout · 0 min”; “done” | editable start/duration, log a past workout, "<1 min", replace start status on finish | MO-137 | L2 health | P-MO-82 · Open |
| `lib/bottom-insights.ts`, `lib/health-aa/food-insights.ts` | “Seven days of care”; “Late-evening eating” | add steps/minutes/sleep/weight rows; hide "Late-evening eating" while meals carry no time | MO-150 | L2 health | P-MO-78 · Open |
| familiar foods row | “Your familiar foods”; “Star … for your Checklist path”; “+ Test Oats · 1.5” | one favourite star; Checklist star distinct or in ⋯; fixed action column; "×1.5" | MO-009 | L2 health | P-MO-73 · Open |
| health-app.tsx activity form ("Manual · corrected") | “ (typing appends); first save labelled ”; “Manual · corrected Nov 4, 2026” | blank fields; "Added" vs "Corrected" | MO-040, MO-152 | L2 health | P-MO-81 · Open |
| micronutrient tiles (Targets) | “7 of 8 entries have no value”; “high in iron”; “5 of 5 entries have no value” | neutral "1 of 8 entries" caption; tiles for DB-supplied nutrients | MO-014 | L2 health | P-MO-66 · Open |
| sleep charts (sleep-view/card) | “Your energy today” | mark empty days; naps stated or stacked; energy card summary; debt wording | MO-022 | L2 health | P-MO-77 · Open |

### L3 habits/today/journey/first-run (14 rows)

| file | current text | new text | finding ids | owning lane | P-row · status |
|---|---|---|---|---|---|
| Chess habit link in Showcase | “A habit chess ticks off” | Say why the dropdown is disabled | PR-110 | L3 habits/today/journey/first-run | P-PR-70 · Open |
| Chess page copy (components/chess; guess) | “ orig: real 375px, 375px, 375 px ” | Split run-on sentences, consistent timestamps, deep links to the profile | D-012, D-085, D-126, D-228, D-259 | L3 habits/today/journey/first-run | P-DVR-65 · Open |
| Habit archive/delete confirm | “you can restore it, or then delete it for good”; “settings stay… without its name” | Short delete sentence; case-insensitive (or explicit) name match; drop "settings stay…" | DV-186a, DV-187 | L3 habits/today/journey/first-run | P-DV-121 · Open |
| Habit card by kind (guess `components/habits/*card*`) | “Every day · 1 time per day”; “Complete”; “Stayed on track”; “0 times today” | Yes/no: one check, no −/+; quit: one primary action + slip count | DV-129, DV-131 | L3 habits/today/journey/first-run | P-DV-122 · Open |
| Habit editor | “More options” | Type first; hide quit-irrelevant fields; inline Health-rule row; a discard prompt on Cancel | DV-132, DV-188b, DV-188c, DV-242, DV-243 | L3 habits/today/journey/first-run | P-DV-123 · Open |
| Habit form/details copy (components/habits; guess) | “Vacation”; “◈ Area” | Shorter habit form, neutral template names, changes start today by default, no empty "Area", explained Vacation toggle | D-007, D-040, D-044, D-100, D-107 | L3 habits/today/journey/first-run | P-DVR-73 · Open |
| Habits archive/edit copy (guess `components/habits/*`) | “until Nov 5”; “effective from” | Say when an archive/rename takes effect, consistent with the path (LS-P16); Undo toast after Archive | LS-H32 | L3 habits/today/journey/first-run | P-LS-59 · Open |
| Today life overview + Wealth tile | “Your first asset starts here / 0 assets · 0 need attention” | Show "Your first asset starts here" once | DV-057c | L3 habits/today/journey/first-run | P-DV-68 · Open |
| `components/dashboard/today-dashboard.tsx` | “(see P-row)” | Show water once on Today; trim the default stack for a new user | N-NB-08 | L3 habits/today/journey/first-run | P-NB-48 · Open |
| `components/onboarding/onboarding-flow.tsx` | “what should ZIGi call you?”; “A habit from your focus: Deep work”; “2 habits: Read, Drink water”; “3 habits”; “Step N of 8”; “gone” | Add a NOVA card to Step 7/tour; optional local name; one receipt list for all habits; one skip wording; preview lists NOVA/Checklist; platform-only install steps; drop "Step N of 8" for content steps; Finish above the fold | N-108, NB-006, NB-022, NB-040, NB-234 | L3 habits/today/journey/first-run | P-NB-13 · Open |
| `lib/dashboard-settings.ts` + widget library | “That metric is already on Today”; “On Today” | Clear "already on Today" when the chip changes; tiles say "Added — tap to remove" or wait for Save | NB-140, NB-162 | L3 habits/today/journey/first-run | P-NB-41 · Open |
| `lib/showcase-copy.ts` + Today wealth strip (guess) | “7 of 8”; “No target set”; “tracked wealth”; “net worth” | Say what "7 of 8" counts; "No target set" only when none; label tracked wealth vs net worth | PR-015 | L3 habits/today/journey/first-run | P-PR-16 · Open |
| components/chess/chess-view.tsx | “Not updated yet. The sites' own numbers; chess.com refreshes…” | Split the run-on status sentence; keep a "Change username" entry on the Chess page after saving | D-012, D-126 | L3 habits/today/journey/first-run | P-BN-55 · Open |
| habit card stepper label | “+0.25”; “Complete” | Button text/aria "Add 0.25 L" / "Add 5 min" | NB-047 | L3 habits/today/journey/first-run | P-NB-34 · Open |

### L4 goals/activity (23 rows)

| file | current text | new text | finding ids | owning lane | P-row · status |
|---|---|---|---|---|---|
| Activity feed structure (components/activity-feed.tsx; guess) | “Show more activity” | Counts, times, clear kind labels, pagination/"show more", search/export, correct day grouping; let users remove junk entries | D-171, D-227, D-234, T-113 | L4 goals/activity | P-DVR-42 · Open |
| Activity goal-milestone row text (components/activity-feed.tsx; guess) | “Goal milestones changed” | Activity says which milestone was ticked/edited/added/removed | G-035 | L4 goals/activity | P-DVR-38 · Applied (L4) |
| Activity source labels (components/activity-feed.tsx; guess) | “Private Goal history”; “Showcase example” | Own records never labelled "Showcase example" (fixed off-Showcase; verify in Showcase mode and keep a guard) | D-084, G-034, N-011, N-073, N-170, T-086 | L4 goals/activity | P-DVR-39 · Labels applied (L4) |
| One kind-name map in `lib/goal-summary.ts` used by `unified-goal-wizard.tsx` type list, `components/goal-card.tsx` chip, detail eyebrow, Today, ZIGi | “Goal”; “Give your Goal a contribution rhythm”; “goal”; “SAVINGS GOAL · YOUR OWN PLAN”; “VALUE GOAL · PRIVATE ALLOCATION”; “VALUE GOAL · EXISTING WEALTH” | One plain name per kind everywhere (Savings goal / Count goal / Project / Keep an average); the wizard doesn't switch vocabulary with data; no preselected type; "goal" lower-case | DV-007b, DV-008b, DV-013, DV-039a, DV-049c, DV-120 | L4 goals/activity | P-DV-20 · Card + eyebrow applied (L4); chain words kept (owner F) |
| Template data in `template-library.tsx` | “Read 12/20 books”; “Enter your target.”; “Your target rating”; “3 date nights / 6 / 9 / 12”; “Week 1 done”; “Week 1” | Consistent milestone naming, short steps, target placeholders, a rating field for chess, direction/currency on average templates; Read-books as a count goal once P-DV-27 lands | DV-039b, DV-053c, DV-177, DV-178, DV-182, DV-184, DV-185 | L4 goals/activity | P-DV-40 · Open |
| `components/goals/achievements-hall.tsx` | “mark complete + write how it went”; “mark it complete on its page and write a line about how it went” | Match the Hall copy to reality (automatic completion) or add the "write a line" field (CG Goals #10) | DV-020a, DV-058b | L4 goals/activity | P-DV-35 · Applied (L4) |
| `components/goals/average-goals.tsx` | “A FIFTH KIND OF GOAL”; “Sleep (from Health)”; “From your own entries”; “Sleep 7 hours”; “two weeks”; “A FIFTH KIND” | Replace "A FIFTH KIND OF GOAL"; say when Health feeds the value; keep the title in sync with the target; offer Keep an average in the wizard (CG Goals #2) | DV-012c, DV-012d, DV-052c | L4 goals/activity | P-DV-66 · Eyebrow applied (L4) |
| `components/goals/goal-art-picker.tsx` categories | “ Category/artwork list is money-only (Emergency Fund…Financial Freedom) for a 10K run ” | Per-life-area artwork categories | DV-017, DV-031e | L4 goals/activity | P-DV-42 · Open |
| `components/goals/life-balance-card.tsx` / `balance-wheel.tsx` | “Wealth 0 % · 2 records this month”; “0 % balance”; “Wealth 0 % · 3 records”; “unknown is never zero” | Show "—" / "not enough data", not "0 %", for areas with records but no score | DV-039c, DV-058c | L4 goals/activity | P-DV-25 · Applied (L4) |
| `components/goals/milestone-planner.tsx` | “Habits toward each milestone”; “done”; “reached” | One per-milestone habit link on demand; one "done" concept | DV-019g, DV-040f | L4 goals/activity | P-DV-130 · Open |
| `components/goals/template-library.tsx` as the one template source for the wizard's idea buttons | “A holiday”; “Holiday”; “A chess rating”; “Reach my chess rating goal”; “Read 12 books”; “Read 20 books” | Idea buttons link to gallery entries; card title = goal name; one "Read books" and one "Learn a language" template | DV-083a, DV-176, DV-179, DV-183 | L4 goals/activity | P-DV-38 · Open |
| `components/platform/contribution-flow.tsx` | “I saved 200”; “EUR Cash”; “I saved 100” | One "How much did you add?" step with the asset picker collapsed; don't ask the amount twice | DV-010a, DV-010c, DV-101 | L4 goals/activity | P-DV-29 · Open |
| `components/platform/tracked-detail.tsx` (guess) | “Target reached · target 1 USD · counted 1 USD”; “Goal value snapshot 0 USD”; “Wealth & contribution history”; “Scale maximum: 1 ZIG”; “valuation 0 ZIG private snapshot”; “Read 20 books” | Milestone/project goals: no currency status, no wealth chart, no "Saving plan"; say what a Reward goal tracks | NB-098, NB-174, NB-243 | L4 goals/activity | P-NB-49 · Partly applied (L4) |
| `components/platform/tracked-detail.tsx`, `components/goals/goal-plan.tsx`, goals stat strip (`goals-overview.tsx`) | “Funding Wealth”; “NO PLAN”; “LIFE AREAS 1”; “WITH A PLAN”; “plan”; “Positions and Habit history remain” | Goal-page copy and hierarchy sweep: drop "Funding Wealth / Allocated units / Positions / Retained plan terms / Price per Goal unit" jargon and raw UUIDs; one meaning of "plan"; key actions (Edit) near the top; show the selected life area | DV-007a, DV-022e, DV-026c, DV-033e, DV-038a, DV-038b | L4 goals/activity | P-DV-21 · Partly applied (L4) |
| `components/unified-goal-wizard.tsx` review/preview | “Progress source: Existing wealth”; “1000 USD”; “$1,000.00”; “Save an amount · USD · Emergency Fund…”; “Reach a number of something ·  · Custom · At your own pace” | Review states the chosen progress source; one number format ($1,000.00); hide empty preview segments; don't repeat the template name | DV-005, DV-006, DV-122 | L4 goals/activity | P-DV-37 · Partly applied (L4) |
| `lib/goal-intelligence.ts` labels + Activity rows + `components/activity/use-zigi-actions.ts` | “A holiday”; “Holiday”; “Saved Goal creation date”; “Explicit manual attribution”; “Private Goal history”; “2 / 2 completed” | Human row copy: "Created · target $500", "Added by you", units ("500 of 2,000 mL"), quit "Stayed on track", sign on corrections, "by NOVA" when it came from NOVA, consistent goal name | D-156, DV-036a, DV-036b, DV-046c, DV-047a, DV-089, DV-171, DV-207 | L4 goals/activity | P-DV-75 · Goal rows applied (L4); habit rows → L3 |
| `lib/goal-summary.ts` (`goalEyebrow`, `fundingFact`) + `tracked-detail.tsx` + wizard review + `lib/goals/on-track.ts` + status log | “Funding Wealth / NO PLAN / Link your wealth”; “PROJECT GOAL · PROJECT”; “Funding Wealth: No plan”; “Review your latest wealth observations”; “Of your goal funded”; “CURRENT WEALTH” | Unit-aware copy on project/count goals: no "Funding Wealth / CURRENT WEALTH / Saving plan / Still to fund / only money you add / target 1 USD counted 4 USD / goal funded"; hide money panels there | DV-015, DV-018, DV-022c-2, DV-034a, DV-040c, DV-041b, DV-057b, DV-104, M-049 | L4 goals/activity | P-DV-19 · Partly applied (L4) |
| components/unified-goal-wizard.tsx (step structure; guess) | “Optional Habit”; “Purpose, Optional sources, Optional Habit, Review”; “Milestones goal / Health goal / Keep an average / Savings goal”; “weekly review habit” | Skip/merge empty optional steps for kinds that have nothing to choose, plain step names, one type vocabulary across templates and wizard | BUG-014, D-008, D-027, D-165, G-040, G-047, N-154, N-159, T-014 | L4 goals/activity | P-DVR-19 · Open |
| goal detail copy (components/goals/goals-sections.tsx etc.; guess) | “My first 0.1 BTC”; “Completed · 100%”; “Projected completion 2026-10-21”; “Funding Wealth”; “Goal” | Plain goal-detail and history-dialog copy: no "Funding Wealth", no raw record UUID, no "Goal" capitalisation, clear valuation labels and empty states | B-114, D-039, D-097, D-103, D-187, L-039, N-144, N-167 | L4 goals/activity | P-DVR-27 · Partly applied (L4) |
| goal detail page | “Saving plan · No saving plan yet”; “Your own pace”; “Fund Goal”; “Record contribution”; “nothing moves” | hide Saving plan on Project goals; "no funds move" beside Fund Goal; milestone error names the line | MO-122, MO-127 | L4 goals/activity | P-MO-87 · Partly applied (L4) |
| goal page copy | “(see P-row)” | One "goal" casing; facts once | X3-19 | L4 goals/activity | P-PR-80 · Delete/close copy applied (L4) |
| goal type labels (list/detail/wizard) | “Reward” | one vocabulary; show or drop the Reward type (owner) | MO-130, MO-146 | L4 goals/activity | P-MO-94 · Open |
| lib/templates + goal preview line (guess) | “Emergency Fund”; “Run a 10K”; “Project · Custom · At your own pace” | Template names, preview captions and created goal names agree (no template name in the caption, no empty "·  ·" slot) | BUG-013, M-048, N-071, N-185, N-205 | L4 goals/activity | P-DVR-24 · Empty slot applied (L4) |

### L5 tasks/checklist/agenda/notes/journal (7 rows)

| file | current text | new text | finding ids | owning lane | P-row · status |
|---|---|---|---|---|---|
| Agenda page | “Show: everything” | Group habits per day ("4 habits"); month legend; wider grid; an exposed "Show" control | DV-193, DV-194 | L5 tasks/checklist/agenda/notes/journal | P-DV-125 · Open |
| Checklist Meditate tile vs planet names | “Meditate” | Distinct accessible names/labels for the Meditate tile and the Meditate planet (layout PROTECTED) | LC-003 | L5 tasks/checklist/agenda/notes/journal | P-LS-70 · Open |
| Checklist copy ("How it works", nav sublabel) + List view section (List view only) | “Checklist” | Say plainly: Checklist = daily routine, Tasks = to-do list (DV-162). List view gains "Tasks due today" linking into Tasks; path unchanged | LS-H13 | L5 tasks/checklist/agenda/notes/journal | P-LS-54 · Open |
| Journal/Notes pages | “ZIGi asked: …”; “Your own scales”; “[[”; “1 drink logged”; “Partly done”; “[[links]]” | "Prompt for later" instead of "ZIGi asked"; legend above the week strip; show [[links]] as an example; one water vocabulary; tighter Notes intro; tabs visible on phones | DV-190b, DV-191b, DV-191c, DV-258b, DV-270 | L5 tasks/checklist/agenda/notes/journal | P-DV-124 · Open |
| Notes inbox item render (guess) | “ Edited inbox note title shown twice ” | Render the edited title once | PR-107 | L5 tasks/checklist/agenda/notes/journal | P-PR-45 · Open |
| `components/checklist/orbit-quick-add.tsx` | “Every day”; “Chosen days” | Hint "More repeat options on Habits" | LS-H28 | L5 tasks/checklist/agenda/notes/journal | P-LS-55 · Open |
| `edit-path.tsx` aria-label + orbit name formatter | “Sunrise”; “Sunrise Orbit” | No doubled "orbit" in aria; custom names as typed in Edit path (path banners PROTECTED) | LS-028 | L5 tasks/checklist/agenda/notes/journal | P-LS-23 · Open |

### L6 chain/settings/help/search (6 rows)

| file | current text | new text | finding ids | owning lane | P-row · status |
|---|---|---|---|---|---|
| Earn/Wealth/Staking advice-like copy (lib/copy; guess) | “Nothing here is advice”; “Make your money work”; “What you have”; “Put it to work on Earn →”; “From no wallet to your first stake” | Remove buy/stake directives and hype next to "Nothing here is advice" | D-060, D-082, D-099, D-146, D-150, D-153 | L6 chain/settings/help/search | P-DVR-59 · Open |
| Settings > Appearance caption | “ with Light selected caption still talks about Nebula ” | caption per selected theme | TK-183 | L6 chain/settings/help/search | P-TK-61 · Open |
| Settings > Your app (Showcase card) | “Load Showcase Demo”; “separate storage in this tab” | Demote "Load Showcase Demo" below the toggles on a real profile; plain wording; tell demo users the real nav is smaller | N-002, NB-029 | L6 chain/settings/help/search | P-NB-65 · Open |
| Settings page + More sheet bottom | “the Alpha's facts”; “Showcase”; “the look you know”; “Theme”; “Everything you add stays on this device.”; “module copies” | Settings copy/IA sweep: truthful hero, plain backup sentence, search/collapse groups, Showcase in its own "Try it" group as a secondary button, More-sheet captions | DV-256, DV-261, DV-262, DV-266, DV-267a, DV-273 | L6 chain/settings/help/search | P-DV-112 · Open |
| components/earn path ("How staking works") | “Your first real stake”; “Add money”; “Get ZIG”; “not advice”; “Nothing here is advice or a promise of returns”; “Nothing here is advice” | Neutral last step (not "Your first real stake" with Get ZIG); "Start here" wording at 0 of 6; tone down "Put your stake to work" | B-084, BN-030, D-060, D-099, D-149 | L6 chain/settings/help/search | P-BN-54 · Open |
| components/staking/* (network picker, calculator disclosure; guess) | “SIGNED IN YOUR OWN WALLET”; “Real” | Reword "Signed in your own wallet" status-like label and the 🔒 Real label; style "Open calculator" as a disclosure; fix the dead "Wallet & data" reference | D-169 | L6 chain/settings/help/search | P-BN-20 · Open |

### L7 ZIGi/NOVA chat+setup (10 rows)

| file | current text | new text | finding ids | owning lane | P-row · status |
|---|---|---|---|---|---|
| NOVA Talk | “No microphone found” | "No microphone found — type instead" | LA-015, LZ-034 | L7 ZIGi/NOVA chat+setup | P-LA-27 · Open |
| ZIGi panel and setup quiz copy (components/zigi; guess) | “Which setup fits me?”; “OUR SUGGESTION”; “FITS YOUR ANSWERS”; “Your Personal AI Companion”; “I answer … with no AI” | Honest panel header vs greeting, no internal art-review text, send-button state, correct nav-card button label, /recap in autocomplete; scroll/focus the quiz result | D-032, D-092, D-160, D-242, D-247, D-256, Z-015, Z-064 | L7 ZIGi/NOVA chat+setup | P-DVR-50 · Open |
| ZIGi slash command registry (guess) | “(see P-row)” | One list for popup and /help | X3-07 | L7 ZIGi/NOVA chat+setup | P-PR-78 · Open |
| `components/ai/proposal-card.tsx` | “Open the form”; “goals” | Button "Open Goals" for page navigation | DV-063b, N-027 | L7 ZIGi/NOVA chat+setup | P-DV-94 · Open |
| `lib/ai/local-answers/words.ts` (guess) | “ Dutch price answered in Dutch (good); French gets English fallback with no language note ” | the same honest language note for French as for Dutch | TK-054, TK-084 | L7 ZIGi/NOVA chat+setup | P-TK-34 · Open |
| `lib/ai/local-answers/words.ts` (scope/consent answers) | “Settings → ZIGi → What your AI sees”; “Permissions”; “always with Undo” | NOVA speaks as NOVA, points to NOVA → Permissions; drop the "added automatically… always with Undo" clause until it exists | DV-082, N-007, N-064 | L7 ZIGi/NOVA chat+setup | P-DV-92 · Open |
| `lib/ai/local-answers/words.ts` provenance | “On-device answers · no AI used”; “Answered on your device · no AI used” | Print the provenance line once | DV-066 | L7 ZIGi/NOVA chat+setup | P-DV-93 · Open |
| `nova-overview.ts` / `engine.ts` formatting | “BOOKS”; “…and 1 more”; “next:”; “0.00 USD”; “$0.00”; “USD” | Use the app's money formatter ($0 of $500), unit as typed, "Show all", first next milestone only, no duplicate goal, honest "no amounts" | DV-078, DV-081, N-004, N-025, N-047, N-059, Z-003 | L7 ZIGi/NOVA chat+setup | P-DV-95 · Open |
| language note (local answers) | “ Dutch gets a Dutch note; FR/DE/JA/ES get plain English fallback, no note ” | **Owner decision** F (languages Beta). Honest part: the same "for now in English" note for FR/DE/ES/JA as for NL | LA-010, LZ-020 | L7 ZIGi/NOVA chat+setup | P-LA-22 · Open |
| lib/ai/errors.ts | “ZIGi”; “ZIGi settings” | NOVA-panel errors say "NOVA" / "NOVA settings", not "ZIGi"; timeout copy says a Retry continues faster | BN-047, BN-048 | L7 ZIGi/NOVA chat+setup | P-BN-09 · Open |

### L10a shell/nav/plans (2 rows)

| file | current text | new text | finding ids | owning lane | P-row · status |
|---|---|---|---|---|---|
| `components/shell.tsx` alpha banner (phone) | “(see P-row)” | keep a short "Saved in this browser only" on phones | TK-6B-05 | L10a shell/nav/plans | P-TK-65 · Open |
| banners/disclaimers (components/alpha, theme switch tooltip; guess) | “Nebula · Customize — coming later” | Fewer stacked notices, no hype tagline, no internal "coming later" tooltip | D-003, D-185, D-191 | L10a shell/nav/plans | P-DVR-87 · Open |

### INT shared (1 rows)

| file | current text | new text | finding ids | owning lane | P-row · status |
|---|---|---|---|---|---|
| (no P-row) | “the sites' own numbers”; “Public ZIG staking and positions · read-only”; “when you request it”; “A clear view of your wealth — and the way to grow it.”; “Make your money work”; “Nothing here is advice” | (see the P-row) | B-052, B-054, B-091, B-136, BUG-013, BUG-014, BUG-017, BUG-019, BUG-053, D-062, D-085, D-150, D-153, D-157 … | INT shared | (none) · Open |

## 4. L4's own read of denver.md (copy notes with no P-row of their own)

| file | current text | new text | finding ids | owning lane | status |
|---|---|---|---|---|---|
| apps/web/components/goals/average-goals.tsx | the title stays "Sleep 7 hours" after the target is 25 | keep the title in sync, or say "Title and target differ" on save | DV-052c | L4 | Open (refused now: 25 h is over the limit) |
| apps/web/components/platform/tracked-detail.tsx | "Give your Goal a contribution rhythm" (capital G mid-sentence, also "Edit Goal details", "Close Goal") | "goal" lower case mid-sentence; button names kept where specs pin them ("Close Goal and release allocations", "Delete Goal") | DV-007b, X3-19 | L4 | Partly (new strings lower case; pinned names kept) |
| apps/web/components/platform/tracked-detail.tsx | "Funding Wealth", "Retained plan terms", "Plan installments", "Price per Goal unit in contribution currency" | "Your saving plan", "Earlier plan terms", "Planned payments", "Price of one <unit> in <currency>" | DV-007a, DV-033e; P-DV-21 | L4 | Open: "Funding Wealth overview" (aria-label), "Record contribution", "Record history only" are pinned by 12 specs; the integrator changes copy and pins together |
| apps/web/components/goals/goals-overview.tsx | "WITH A PLAN · why and if-then written" (a third meaning of plan) | "WHY WRITTEN · why and if-then written" | DV-022e | L4 | Open (pinned by goals-best-aa.spec.ts figures) |
| apps/web/components/platform/today-intelligence.tsx (Today) | "Quantity Goal · Funding Wealth" | use `kindLabel` (lib/goals/kind-names.ts) and `fundingFact` | DV-057b | L3 | Request |
| apps/web/lib/habits.ts (Activity habit rows) | "2 / 2 completed" (no unit), quit "0 / 0 completed", "500 / 2000 logged" | "2 L of 2 L", "Stayed on track", "500 of 2,000 mL" (`unitAmountText`) | DV-047a, DV-171, DV-207 | L3 | Request |
| apps/web/components/activity/use-zigi-actions.ts + lib/nova | "Goal · by ZIGi" on a NOVA workflow goal | "by NOVA" when it came from NOVA | DV-089 | L7 | Request (the action record needs its source) |
