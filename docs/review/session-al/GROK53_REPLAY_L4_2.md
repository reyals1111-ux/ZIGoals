# Grok #53 replay — lane L4 (Goals, Activity, copy), round 2

- **Commit served:** `37d2370c` (production build, `PUBLIC_ALPHA_UNDEPLOYED`, from `/home/user/zig-branch2`) on http://127.0.0.1:3103. Later commits change only ZIGi/NOVA, tests, docs and the HUD shimmer, so none of the Goals/Activity code replayed here differs from what is served.
- **Date:** 8 Nov 2026, about 14:50–17:20 UTC (the app's clock was set to the bots' time, see below).
- **Replayed by:** a fresh replay agent. It made no fixes, changed no app or test code and made no git writes; the only file written in the repository is this one.
- **Scope** (owner rules of 8 Nov): the 149 rows of `scratchpad/ids/L4.replay.tsv` (146 unique finding ids; BUG-004, BUG-073 and DV-019e sit in two AL rows), plus six Goals-page rows the L3 replay handed over (NB-165, NB-173, NB-190, NB-198, N-170, G-045; N-170 is also in the L4 list): **151 unique ids**. Each id's bot text was read by grepping it in the bot files and `ledger/*.md` only. The lane's claims came from `lanes/L4.md` sections after round 1 (Second / Third pass, Sweep, Fourth pass and its sweep-3 notes).
- **Method** (as round 1, plus the bots' clock):
  - Playwright 1.63 from zig-branch2, headless Google Chrome (channel `chrome`), one browser, one worker; every run through `flock /tmp/claude-0/zig-browser.lock`.
  - `locale: en-GB`, `timezoneId: Europe/Brussels`, live API (no routing), everything done through the UI (no seeded store; the game layer on where noted, set as the bots had it in Settings' record).
  - The bots' clock with `page.clock.install`: 4 Nov 2026, 03:30 Brussels (02:30 UTC), within the bots' 01:10–05:05 window. The real clock was never used.
  - Scripts and text snapshots are in `/tmp/claude-0/replay-L4-2/` (not committed).
- **Conditions** (codes as round 1):
  - **D** = Denver's: 1920×1113 Nebula, fresh empty context (Welcome marked seen), UI only. **D+game** = the same with the game layer and badges on (Nairobi's XP rows).
  - **Sc** = 1280×800 Dark, Settings → Load Showcase Demo (the Showcase turns the chain modules on). **Sc+game** = with the game layer on (Professor's G+Sc). **Sc+chain** = Showcase with Earn shown (the chain chosen), for the Reward goal kind.
  - **Sc 175 %** = Showcase at 1097×636 (Denver's 175 % zoom of 1920×1113). **375** = 375×812 Dark, isMobile, Showcase. **768** = 768×1024 Nebula.
- **Caveats:**
  - The lane specs (`tests/grok53/goals/*`) were not run (owner cost rules); verdicts come from the UI replays.
  - Rows whose bot text is only a title (N-154, N-159, N-167, N-185, N-205, M-048, D-187) were judged against their AL row's fix line, and the evidence says so.
  - ZIGi/NOVA rows (DV-089, DV-115) were not replayed: L7's lane; the served build's ZIGi/NOVA code is older than HEAD.
  - Owner decisions were accepted only where AL_SCOPE F or an ADR-037 O-row is cited by the lane; no L4 row in this list carries such a citation now, so no OWNER DECISION verdicts.
  - The shared lock was busy (other replays), so scripts were split by page and each run kept short.

## Totals (per unique finding id)

| verdict | ids |
|---|---|
| FIXED | 96 |
| HOLDS | 9 |
| STILL OPEN | 11 |
| CHANGED | 32 |
| OWNER DECISION | 0 |
| NOT REPLAYED | 3 |
| **total unique ids** | **151** |

Round 1 verdicts in the tables are the "latest verdict" column of the id list (UNSEEN = the id was cut by the ledger's "(+ also closes:" text and not replayed in round 1). The six L3 hand-over ids carry round 1 = NOT REPLAYED (L3 round 2). An id in two AL rows (BUG-004, BUG-073, DV-019e; N-170 is in AL-ACTIVITY-003 and the hand-over) is counted once in the totals.


### AL-ACTIVITY-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-057 | AL-ACTIVITY-001 | STILL OPEN | FIXED | Sc+game | Showcase → Emergency fund → Fund Goal → USD cash reserve, 250 → Confirm (toast "That moved Emergency fund to 46%."). Activity at 03:30 lists only "Goal allocation changed · Emergency fund", "USD cash reserve edited", "Contribution · Emergency fund · US$250.00"; no "Target reached" for My first 0.1 BTC at that minute (its seeded "Target reached" row stays on 4 Nov, earlier, without a time of now). |
| BUG-004 | AL-ACTIVITY-001 | NOT REPLAYED | FIXED | Sc | Wealth → USD cash reserve → Edit asset → Cash balance 0 → Save, then back to 25000 → Save ("USD cash reserve saved."): no popup or dialog, and Activity shows only two "USD cash reserve edited" rows (no goal "Target reached"/"completed" rows, no fake goal events). |
| BUG-073 | AL-ACTIVITY-001 | STILL OPEN | FIXED | Sc+game | As PR-057: funding a goal writes no "Target reached" row for another goal. |

### AL-CONFIRM-DELETE-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-040 | AL-CONFIRM-DELETE-005 | STILL OPEN | FIXED | D, Sc | Value goals: Close → "Close this goal? … Money counted toward it is freed for other goals; nothing moves." → toast "Goal closed. … its history stays." + Undo (fresh); Delete Goal enabled → "Delete this goal? … You can undo this right after." → toast "Deleted “QA EUR Goal”." + Undo (Showcase). |
| B-083 | AL-CONFIRM-DELETE-005 | NOT REPLAYED | CHANGED | Sc | Goals → Health goals → "End Walk more (Showcase)": still ends at once with no confirm, now with a toast "Walk more (Showcase) ended." + Undo. (The AL row asks for confirm + Undo on removals; End is not a delete, so the Undo may be enough — not an F/O decision.) |
| M-104 | AL-CONFIRM-DELETE-005 | CHANGED | CHANGED | D | Remove milestone ("9 books"): still no confirm (no alertdialog), but the toast "“9 books” removed." + Undo now lasts 12.4 s (was 8.1 s); Undo via keyboard (focus + Enter) restored "15 books". The AL row asks for a confirm or Undo; Undo ≥ 10 s is met, the confirm is not. |
| M-131 | AL-CONFIRM-DELETE-005 | NOT REPLAYED | CHANGED | Sc | As B-083: End goal on a health goal is immediate (no confirm) but gives "… ended." + Undo. |
| TK-179 | AL-CONFIRM-DELETE-005 | CHANGED | FIXED | D | Card ⋯ has Delete…; the confirm "Delete this goal? … You can undo this right after." opens in view (y 246) with focus; toast "Deleted “DV Child project”." + Undo (no "Private Goal saved" wording). |

### AL-CONFIRM-DELETE-006

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-149 | AL-CONFIRM-DELETE-006 | CHANGED | FIXED | D | Card ⋯ now lists "Open goal · Edit details · Close… · Delete…"; Delete… on the "DV Child project" card opened the page's "Delete this goal?" confirm at y = 246 px (in view), focus inside it; Confirm delete → toast "Deleted “DV Child project”." + Undo. |
| BN-187 | AL-CONFIRM-DELETE-006 | CHANGED | FIXED | D | Card ⋯ has Edit details and Delete…; Delete confirm (in view, focused) → toast "Deleted “DV Child project”." with Undo; the page's top ⋯ has "Edit goal details". |
| DV-056a | AL-CONFIRM-DELETE-006 | CHANGED | FIXED | D | Card ⋯: "Add progress to Today · Add next contribution to Today · Ask ZIGi about this · Open goal · Edit details · Close… · Delete… · Change artwork…" (Open/Edit/Close/Delete now there). |
| DV-102 | AL-CONFIRM-DELETE-006 | CHANGED | FIXED | D | Card ⋯ has Edit details, Close… and Delete…; Delete… lands on the goal page's confirm (in view, focused) and the toast offers Undo. |
| NB-172 | AL-CONFIRM-DELETE-006 | CHANGED | FIXED | D | Card ⋯ now offers "Open goal · Edit details · Close… · Delete…" next to the Today/ZIGi items. |
| NB-175 | AL-CONFIRM-DELETE-006 | CHANGED | CHANGED | Sc | Completed "My first 0.1 BTC" card ⋯ now has "Open goal · Edit details · Close… · Delete…" (the bot found no Close/Delete), but it still offers "Add progress to Today · Add next contribution to Today" on a goal that is complete. |
| NB-182 | AL-CONFIRM-DELETE-006 | CHANGED | FIXED | D | The goal page's top ⋯ now reads "Pin Goal · Edit goal details · Lock editing · Close Goal · Delete Goal" (count goal, project and savings goal pages). |
| PR-059 | AL-CONFIRM-DELETE-006 | NOT REPLAYED | FIXED | Sc+chain | Reward goal has a history action with its reason (above), and every goal now has "Edit goal details" in the page's ⋯ (and "Edit details" on the card). |

### AL-COUNTS-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BUG-062 | AL-COUNTS-007 | STILL OPEN | FIXED | Sc | Today: "Destinations in motion · 7 active · 3 completed", "Your financial progress · 7 Active goals", "Your destinations · 7 active goals · 3 completed"; Goals: ACTIVE 7 ("+ 1 health goal below") / FINISHED 3. |
| G-037 | AL-COUNTS-007 | STILL OPEN | FIXED | Sc | As BUG-062: Today and Goals agree (7 active, 3 finished); no "Show all 6 Goals". |
| M-082 | AL-COUNTS-007 | NOT REPLAYED | FIXED | Sc | Completed cards: "My first 0.1 BTC · COUNT GOAL · COMPLETED · 100 %", average "Drink 2 litres a day … Finished. It is on the Hall of achievements." — no "Not on target yet". |
| B-202 | AL-COUNTS-007 | NOT REPLAYED | FIXED | Sc | Help "Why does Today show fewer cards?" says the Showcase Today shows one "Daily Habits" card, "Your next goal action" stands aside for the "Next step" tile, and Daily Health stays; the Showcase Today matches (one Daily Habits card, NEXT STEP tile, Daily Health with kcal/protein/steps), and its goal counts agree with Goals (BUG-062). |
| PR-082 | AL-COUNTS-007 | STILL OPEN | FIXED | Sc | As BUG-062: the three Today widgets and the Goals strip all say 7 active / 3 finished (the health goal is named apart on Goals). |

### AL-NUMBERS-SOURCE-009

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-164 | AL-NUMBERS-SOURCE-009 | NOT REPLAYED | STILL OPEN | Sc 175 % | Showcase at 1097×636: Count goal "Test goal", 10 BTC → step 2 "Count what I already hold" → "Existing assets … No assets yet. Choose a category to add your first." although the Showcase tracks Bitcoin (its goal pages' Fund sheet lists "Bitcoin 0.35 available of 0.45 BTC"). Same "No assets yet" for a USD goal in plain and chain mode. The dock part is fixed: with step 2 scrolled to Continue (x 931–1048, y 197), a hit test at its centre and right edge returns Continue itself. In a fresh profile with a cash asset the step lists it ("DV Cash 5,000 USD · Manual value"), so the empty list is the Showcase’s. |
| D-241 | AL-NUMBERS-SOURCE-009 | STILL OPEN | FIXED | Sc, Sc+chain | Showcase USD value goal → step 2 "Count money I already have": no "Available stake" or "Goal Manager" line; with the chain chosen, a $2,000 goal's "Use wealth I already have" shows "Wealth scope · Mainnet + manual / Testnet + manual" and no stake or Goal Manager line (those stay only on a ZIG Reward goal). |
| G-002 | AL-NUMBERS-SOURCE-009 | NOT REPLAYED | FIXED | Sc | A new savings goal's step 2 starts on "Save toward it from now on" (default), so a goal no longer begins at 100 % from existing wealth unless "Count money I already have" is chosen. |

### AL-NUMBERS-SOURCE-010

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-166 | AL-NUMBERS-SOURCE-010 | NOT REPLAYED | CHANGED | Sc+chain | Reward goal: the only action is "Record contribution" (history only), whose sheet says "A rewards goal counts the unclaimed rewards you allocate to it from Staking, not new money. Allocate rewards under Wealth on this goal’s page". But the page's Wealth chooser lists no existing asset (no "ZIG reward reserve", no unallocated remainder), only categories and a catalog that cannot load here, so funding from the reserve could not be done. |

### AL-NUMBERS-SOURCE-011

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| B-196 | AL-NUMBERS-SOURCE-011 | NOT REPLAYED | FIXED | D | Plan goal, target edited 1,200 → 1,500: the plan comparison stays ("With your plan · Beyond current plan", "Planned future US$1,200.00 · Shortfall US$300.00", plan status module). |
| D-235 | AL-NUMBERS-SOURCE-011 | CHANGED | FIXED | Sc | Emergency fund: chip AHEAD, pace "At this pace: about 6 Jan 2028" (range 7 Dec 2027 – 18 Jan 2028), target 3 Nov 2028 — the forecast is before the target, so AHEAD agrees; the plan's date is labelled "With your plan · About 7 Aug 2028, if every planned payment is made". |
| M-056 | AL-NUMBERS-SOURCE-011 | CHANGED | FIXED | Sc | As D-235: AHEAD, forecast 6 Jan 2028 before the 3 Nov 2028 target; no BEHIND or shortfall on the page beside it (plan scenario "ON TRACK · Shortfall: 0"). |
| B-006 | AL-NUMBERS-SOURCE-011 | CHANGED | FIXED | Sc | As D-235: AHEAD with a forecast (6 Jan 2028) before the target date; "On track?" now quotes the same 6 Jan 2028. |
| G-021 | AL-NUMBERS-SOURCE-011 | NOT REPLAYED | FIXED | D | Plan goal (1,200, 100 monthly, next date today): status "On track", "US$100.00 is due today … counts once the day ends in UTC" (no BEHIND on day zero). (After raising the target to 1,500 the plan falls short and it reads "Behind": a real shortfall of 300.) |
| G-014 | AL-NUMBERS-SOURCE-011 | NOT REPLAYED | CHANGED | D | Average "Walk 8000 steps" at 7,400: card "93 % · 7,400 steps a day on average · 1 of 7 days recorded" — no "Not on target yet" label any more, but no near-miss wording either; the detail reads "Target: at least 8,000 steps a day. 7,400 steps a day on average". |
| PR-024 | AL-NUMBERS-SOURCE-011 | STILL OPEN | CHANGED | Sc | Today ("At this pace: about 6 Jan 2028"), the pace card and "On track?" now give the same date, and the plan's date is labelled "With your plan: about 7 Aug 2028". Still on the same page: "On track?" says "Recorded here over the last 90 days: US$250.00 in every 30 days … Your pace forecast … about 6 Jan 2028" next to the pace card's "about US$771.17 every 30 days", and What if says "At your pace over the last 30 days you reach the target on 18 Jan 2028. About US$750.00 a month lately." |

### AL-UNITS-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-147 | AL-UNITS-004 | STILL OPEN | FIXED | D | Count goal "T9 Count pages" (40 pages): a USD savings goal's Fund sheet lists no "pages" asset; the USD cash asset page "DV Savings Account" offers "Allocate to DV Plan goal / Allocate to Emergency fund" only (no pages goal); Wealth shows 0 assets after a funded books goal. |
| PR-055 | AL-UNITS-004 | NOT REPLAYED | CHANGED | Sc | Count goal "QA Qty USD", 500, asset typed "USD": no "Choose the same asset" error any more, but its Fund sheet offers only a new own-count asset ("✧ QA Qty USD · New tracked asset · How many USD did you add?"), not the existing "USD cash reserve"; the page shows the target as "US$500.00" while the eyebrow reads "COUNT GOAL · YOUR OWN COUNT". |

### AL-XP-BADGES-009

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| B-058 | AL-XP-BADGES-009 | STILL OPEN | FIXED | Sc+game | As PR-057: no spurious "Target reached · My first 0.1 BTC" after funding Emergency fund. |
| BUG-004 | AL-XP-BADGES-009 | NOT REPLAYED | FIXED | Sc | Wealth → USD cash reserve → Edit asset → Cash balance 0 → Save, then back to 25000 → Save ("USD cash reserve saved."): no popup or dialog, and Activity shows only two "USD cash reserve edited" rows (no goal "Target reached"/"completed" rows, no fake goal events). |
| BUG-073 | AL-XP-BADGES-009 | STILL OPEN | FIXED | Sc+game | As PR-057: funding a goal writes no "Target reached" row for another goal. |
| B-092 | AL-XP-BADGES-009 | NOT REPLAYED | STILL OPEN | Sc+game | Activity → Yesterday 15:45: "Goal · Portfolio completed · Showcase · Launch my creative studio", while that goal's page reads Active, 50 %, 2 of 4 milestones. |

### AL-A11Y-014

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-040g | AL-A11Y-014 | CHANGED | CHANGED | D | Card ⋯ is now a `<button aria-expanded="false" aria-label="Options for Holiday fund">` (was a generic element); card and module headers are native `<summary>` (announced as expandable); the menu has 0 role=menu / role=menuitem (items are links). The AL row asks for role=menuitem too. |
| DV-056c | AL-A11Y-014 | CHANGED | CHANGED | D | As DV-040g: the ⋯ trigger is a button with aria-expanded; the menu items are plain links, 0 role=menuitem. |

### AL-A11Y-015

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-170 | AL-A11Y-015 | STILL OPEN | CHANGED | D | The Remove control is now named after the row ("Remove Water: 250 mL, 4 Nov 2026", "Remove Drink water, 4 Nov 2026 · 2 of 2 liters · done"), a quiet text link 44 px tall, and its Undo lasts 12 s; it is still shown on every row, not in a ⋯ (the AL row asks for both). |

### AL-A11Y-016

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BUG-049 | AL-A11Y-016 | STILL OPEN | FIXED | D | /app/goals/new: focus starts in "Goal name" (INPUT …name). |
| D-029 | AL-A11Y-016 | STILL OPEN | FIXED | Sc | First goal card's tab order: "Emergency fund" (title) → Star → Options → Details → next card's title (4 stops, title first; "Open Goal →" out of the tab order). |
| G-043 | AL-A11Y-016 | STILL OPEN | FIXED | D | Average goal value field: visible label "Value (h a day)", aria-label "Screen time: value for 4 Nov 2026, in h a day". |
| BUG-039 | AL-A11Y-016 | STILL OPEN | FIXED | 375 | Settings at 375×812 (Showcase): no visible link shorter than 24 px (sweep 3: 44 px). |
| M-091 | AL-A11Y-016 | STILL OPEN | STILL OPEN | Sc | Today → Quick add: focus lands on "Close Quick add ×", not the input (lane: waits for FX-G53a). |
| D-028 | AL-A11Y-016 | STILL OPEN | STILL OPEN | Sc | Showcase Today: 289 focusable, visible tab stops (round 1: 290). Lane: partly; the rest are called distinct controls. |
| D-230 | AL-A11Y-016 | NOT REPLAYED | CHANGED | Sc | Settings Motion select now has an "on" choice ("Full / Calm (entrances only) / Off"); but "Back to top" still keeps focus on the bottom link: after Enter the page is at scrollY 0 while the focused "Back to top" link is 25,325 px below. |
| D-009 | AL-A11Y-016 | STILL OPEN | FIXED | D, Sc | Health page: no visible button without a name. The 7 "no text" buttons a script finds are text buttons inside folded sections ("Save breakfast name", "Save lunch name", "Save dinner name", "Save snacks name", "Log and save food", "Choose a file", "Save past fast"); innerText is empty only because they are folded, which is likely what round 1 counted. |
| D-055 | AL-A11Y-016 | NOT REPLAYED | CHANGED | Sc | Wealth → "Options for Bitcoin": items "Add quantity to Today · Add value to Today · Add available to Today · Add allocations to Today" — the long name is no longer repeated in each item, but there is still no Delete (or Edit) in the asset card's menu. |

### AL-ACTIVITY-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-047c | AL-ACTIVITY-002 | STILL OPEN | FIXED | D | Health → Increase Push-ups → Activity row "Health · Push-ups · 1 counted · 4 Nov 2026 · Counted by you"; Health chip 1 → 2. |
| DV-206 | AL-ACTIVITY-002 | CHANGED | FIXED | D | Archive "Drink water" → Activity row "Habit · Habit archived · Drink water · from 5 Nov 2026"; Habit chip 2 = 2 rows. |
| PR-065 | AL-ACTIVITY-002 | CHANGED | FIXED | D | Activity footer: "Not listed here: journal entries, notes, and the spending and income you log under Wealth; each keeps its history on its own page." |

### AL-ACTIVITY-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-170 | AL-ACTIVITY-003 | CHANGED | FIXED | Sc+game | Own goal events (allocation, contribution) are not tagged "Showcase example" ("Your goal’s history", "Added by you"). |
| PR-066 | AL-ACTIVITY-003 | CHANGED | FIXED | Sc+game | My own rows read "Added by you" / "Your goal’s history" / "Private asset record"; none of them says "Showcase example". |
| PR-099 | AL-ACTIVITY-003 | CHANGED | FIXED | Sc+game | As PR-066: the person's own contribution and allocation rows are not tagged "Showcase example". |

### AL-COMPETITOR-GAP-114

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DV-12 | AL-COMPETITOR-GAP-114 | UNSEEN (round 1 file: FIXED) | HOLDS | D | Each milestone has Move up/down buttons (15 for 5 milestones incl. edit); "Move 15 books up" moved it above "12 books"; Activity "Milestones reordered". |
| DV-019e | AL-COMPETITOR-GAP-114 | UNSEEN (round 1 file: FIXED) | HOLDS | D | As C-DV-12: ↑/↓ per milestone; "15 books" moved up; Activity row "Milestones reordered". Insert-after is add then move. |

### AL-COMPETITOR-GAP-115

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-043c | AL-COMPETITOR-GAP-115 | CHANGED | FIXED | Sc | Goals → Tree: 7 draggable rows; each own goal's row ⋯ holds "Add a sub-goal" (5 links, e.g. /app/goals/new?parent=private:9201), besides drag and "Put under". |

### AL-COPY-034

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| G-027 | AL-COPY-034 | STILL OPEN | FIXED | D | Project wizard step 2 "What counts toward this goal? Only the milestones you tick count toward progress; no money is involved." and lists the 4 milestones; step 3 "only the milestones you tick count toward progress" (no money words, no contribution-plan line). |
| G-030 | AL-COPY-034 | CHANGED | FIXED | D | Completed project card badge "COMPLETED"; card "Project · completed" ("NO PLAN" gone from project cards; the code gives "In progress" while active). |
| M-046 | AL-COPY-034 | STILL OPEN | FIXED | D | Project steps 2 and 3 are no longer empty or money-worded (step 2 lists the milestones, step 3 offers the review habit with milestone wording). |
| DV-015 | AL-COPY-034 | CHANGED | CHANGED | D | "Funding Wealth" and "Link your wealth" are gone; the count card still has the "NO PLAN" badge, the page a "Wealth · add money you have" module; the parent list now offers only goals that do not create a cycle (still any kind). |
| DV-018 | AL-COPY-034 | CHANGED | CHANGED | D, Sc | Fresh project: eyebrow "PROJECT", no Saving plan, no Wealth module or chart ("Funding Wealth: No plan" and "Review your latest wealth observations" gone). Showcase "Launch my creative studio" still reads "PROJECT GOAL · PROJECT", and its "Goal Vault" module says "Your money is working toward this goal: the ZIG you staked keeps earning on ZIGChain" on a goal with no money. |
| DV-034a | AL-COPY-034 | STILL OPEN | CHANGED | D | Fixed: eyebrow "COUNT GOAL · YOUR OWN COUNT", fact "Plan · No plan yet", panel "Your plan", step 2 "Count what I already hold", steps 3–4 "only what you add counts toward the target", review "20 books", Fund preview "3 books toward DV Count books. One record is added; no money moves." Still money/wealth words on the count goal: module "Wealth · 1 source counted · add money you have" with "Your funding assets … 3 BOOKS counted · UNKNOWN · MANUAL", chart "Wealth & contribution history / Counted wealth", "The liquidity of some allocated wealth is unknown.", Fund sheet header "YOUR PRIVATE WEALTH", review "A plan, not a transfer: nothing moves", step 2 plan "Contribution asset". |
| DV-040c | AL-COPY-034 | STILL OPEN | FIXED | D | Project page (all modules open): no "Saving plan", no "Contribution plan", no "Wealth" module or chart; only Plan / timeline / Milestones / Next actions / Notes / Habits / Focus / Edit / Status. |
| DV-041b | AL-COPY-034 | CHANGED | CHANGED | D | Completed project timeline has no value snapshot now, but its "Target reached · goal completed" row still reads "4 USD … retained milestone", with "Exact amount 4 USD" under Record details, on a milestone goal. |
| DV-057b | AL-COPY-034 | CHANGED | FIXED | D | Today featured card "DV Count books · Next: plan how many books to add, and when"; Today goal card "Count goal" (no "Funding Wealth", no "No contribution plan yet"). |
| DV-104 | AL-COPY-034 | STILL OPEN | CHANGED | D | "only money you add counts", "CURRENT WEALTH", "Still to fund" and "(UNIT)" are gone; "A plan, not a transfer: nothing moves." stays on the review, and the count goal page still has the "Wealth … add money you have" module, "Counted wealth" chart and "liquidity of some allocated wealth" line. |
| MO-120 | AL-COPY-034 | CHANGED | CHANGED | D | Unit is any word ("books", "pages"); card "3 books / 20 books"; but the count page keeps the "Wealth … add money you have" module and "UNKNOWN · MANUAL" valuation words. |
| NB-098 | AL-COPY-034 | CHANGED | CHANGED | D | As DV-041b: no "Goal value snapshot 0 USD" now, but "Target reached · goal completed · 4 USD" (Exact amount 4 USD) on the completed project. |
| NB-174 | AL-COPY-034 | STILL OPEN | FIXED | D | Project page: no "Wealth & contribution history", no "Scale maximum", no "valuation … private snapshot" row. |
| NB-243 | AL-COPY-034 | CHANGED | FIXED | D | Count goals show "Plan · No plan yet" / "Your plan" (no "Saving plan: No saving plan yet"); Read 12 books is a count goal ("counted in books"). |
| N-NB-23 | AL-COPY-034 | UNSEEN (round 1 file: NOT REPLAYED) | FIXED | Sc+chain | New Reward goal page: eyebrow "REWARD GOAL · PRIVATE ALLOCATION", hero "CURRENT HOLDING 0 ZIG of 100 ZIG" and "A Reward Goal grows with your unclaimed rewards. Claim or keep them in Staking; funding from elsewhere does not count here." (no "CURRENT WEALTH", and it says what it tracks). The hero still has "Funding Wealth · NO PLAN". |
| DV-022c | AL-COPY-034 | UNSEEN (round 1 file: FIXED) | FIXED | D | Count card "15 % · Of the way there · 17 books remaining"; project card "Of your journey complete · 4 milestones remaining". |

### AL-COPY-035

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-007b | AL-COPY-035 | STILL OPEN | CHANGED | D | The four named phrases are lower case now ("What counts toward this goal?", "A rhythm that supports your goal.", Fund sheet "Fund your goal"), but mid-sentence "Goal" remains: "Add a weekly review habit for this Goal (Mondays)", "They count toward this Goal right away", "allocate it toward this Goal", "Retained Goal milestones", "A revised target or reopened Goal starts a new cycle", "Edit Goal details", "Pin Goal / Close Goal / Delete Goal". |
| DV-039a | AL-COPY-035 | CHANGED | FIXED | D | Count kind: wizard "Reach a number of something … On its card: Count goal", card "COUNT GOAL", detail "COUNT GOAL · YOUR OWN COUNT", gallery "Count goal" (no "QUANTITY GOAL"). |
| DV-049c | AL-COPY-035 | CHANGED | FIXED | D | Savings kind: wizard "Save an amount … On its card: Savings goal", card "SAVINGS GOAL", detail "SAVINGS GOAL · MONEY YOU HAVE / SAVING PLAN", gallery "Savings goal" (no "VALUE GOAL"). |
| DV-120 | AL-COPY-035 | NOT REPLAYED | STILL OPEN | Sc+chain | With the chain chosen the wizard shows "Quantity / Value / Reward / Project" and "Quantity" is preselected (preview "Quantity · ZIG · Custom · At your own pace"), so name + Create still makes an asset-quantity goal. Plain mode preselects "Save an amount". |
| MO-130 | AL-COPY-035 | CHANGED | FIXED | D | Plain mode: one name per kind across wizard caption, list, detail and gallery (as DV-039a/DV-049c). With the chain chosen the wizard says "Quantity / Value / Reward / Project", cards "Count goal / Savings goal / Rewards goal" and the detail "Reward goal" (see DV-120). |

### AL-COPY-036

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| B-114 | AL-COPY-036 | STILL OPEN | FIXED | Sc | My first 0.1 BTC (Completed 100 %): "With your plan · Already reached", "On track? · The counted value has reached the target."; no "Projected completion" date. |
| D-039 | AL-COPY-036 | CHANGED | CHANGED | D | "Funding Wealth" is gone from the hero and count/project pages, but a savings goal with a plan still shows "Funding scenario · PLANNED CONTRIBUTION SCENARIO · Funding Wealth: ON TRACK" and "Unbonding and provider liquidity may prevent access" on a USD cash goal; mid-sentence "Goal" capitals remain (DV-007b). |
| D-187 | AL-COPY-036 | NOT REPLAYED | STILL OPEN | D | Bot gives only the title; replayed its own steps: Goals → Closed "No closed goals." (one line, no next step); Ecosystem "zzzz" "No projects match these filters." (no next step); Markets "zzzz" "No matching markets · No matches in this view · Try another name or browse the full CoinGecko catalog." (title + line + action). The empty states still differ in structure. |
| N-167 | AL-COPY-036 | NOT REPLAYED | STILL OPEN | D | Bot text is only a title ("Valuation labels & prices"); against the AL row's "plain labels": the count goal's source reads "3 BOOKS intended · 3 BOOKS counted · UNKNOWN · MANUAL", "0 available of 3 BOOKS · Needs valuation", "Includes manual valuation. View valuation →", and the timeline "Evidence source LOCAL_EDIT / RETAINED_PLAN_REVISION" with raw record ids under Record details. |
| N-144 | AL-COPY-036 | CHANGED | CHANGED | D | As D-039: "Funding Wealth: ON TRACK" and the unbonding line in the plan goal's Funding scenario; casing as DV-007b. |
| DV-007a | AL-COPY-036 | STILL OPEN | STILL OPEN | D | Count goal page: hero "3 books of 20 books · Remaining 17 books", then "Your plan" panel "15 % · 3 books of 20 books · 17 books remaining" again (lane said the panel no longer repeats remaining). |
| DV-007c | AL-COPY-036 | NOT REPLAYED | FIXED | D | Goal page life-area chips are radios; after picking Health, Health is checked and drawn with a cyan border (rgb 116 213 233) while the others keep the grey one. |
| DV-022e | AL-COPY-036 | STILL OPEN | FIXED | Sc | Goals strip: "WITH A WHY 4 · reason and if-then written" (no "WITH A PLAN"). |
| DV-033e | AL-COPY-036 | STILL OPEN | FIXED | D | Plan form: "Price of one USD in the plan’s currency (if different)", "Earlier plan terms"; no "Price per Goal unit", "Retained plan terms" or "Plan installments". |
| X3-19 | AL-COPY-036 | STILL OPEN | CHANGED | D | Casing as DV-007b (named phrases fixed, other mid-sentence "Goal" remain); the count page still repeats "3 books of 20 books / 17 remaining" in the hero and the "Your plan" panel (DV-007a). |

### AL-COPY-039

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-006 | AL-COPY-039 | STILL OPEN | FIXED | D | Emergency fund idea, 1000: preview "Emergency fund · US$1,000.00 · Save an amount · USD · At your own pace" (no repeated "Emergency Fund"). |

### AL-COPY-040

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-185 | AL-COPY-040 | NOT REPLAYED | FIXED | D | Title only ("Idea cards"); against AL-COPY-040: the idea buttons are library templates (plus "Browse all 53 templates"), and template, preview and created names agree ("Run a 10K" everywhere, 4 milestones as in the gallery). |
| M-048 | AL-COPY-040 | NOT REPLAYED | FIXED | D | Title only ("seed wording"); against AL-COPY-040: idea and gallery wording agree (e.g. "Read 12 books · A book a month for a year, counted in books" is a count goal in books). |
| N-071 | AL-COPY-040 | NOT REPLAYED | CHANGED | D | Run a 10K idea: name "Run a 10K", note "“Run a 10K” is filled in. Its steps are below; rename them as you like.", 4 milestones; template, preview and created names agree. The preview still says "Finish a project · Custom · At your own pace" (a "Custom" segment for a run). Bot text is cut off after "the name field gets the templ…". |
| N-205 | AL-COPY-040 | NOT REPLAYED | FIXED | D | Title only ("idea card result"); clicking an idea fills name, kind and steps and says so: "“Run a 10K” is filled in. Its steps are below; rename them as you like."; the created goal keeps the name. |
| DV-053c | AL-COPY-040 | CHANGED | CHANGED | Sc, D | A numeric chess rating goal now exists: set on Chess ("Target rating" field) and listed on Goals ("Chess rating goals · chess.com Rapid: reach 1,600 · 1,503 now · 97 to go", Showcase). The wizard's "Reach a chess rating" idea still has no number field ("write the number into the last step"); in a fresh profile the Chess rating form needs a linked chess username first. |

### AL-COPY-041

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-012d | AL-COPY-041 | CHANGED | FIXED | D | Sleep (from Health) average goal: "From your own entries so far. Days you record in Health (sleep) count here too; yours win on the same day." |

### AL-COPY-042

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-036b | AL-COPY-042 | CHANGED | FIXED | D | Activity "Goal created · Emergency fund · target US$1,000.00" after the target was edited to 50; "DV Plan goal · target US$1,200.00" after an edit to 1,500 (the creation target, not the later one). |
| DV-089 | AL-COPY-042 | NOT REPLAYED | NOT REPLAYED | — | NOVA workflow goals: L7's lane (NOVA); the served build's ZIGi/NOVA code is older than HEAD, so a replay here would not show the current attribution. |
| DV-171 | AL-COPY-042 | NOT REPLAYED | FIXED | Sc | Habit rows now carry units and words: Showcase quit habit "Late-night snacks (Showcase) · 3 Nov 2026 · Stayed on track", "8,000 of 8,000 steps · done", "1 of 2 liters"; fresh "Drink water · 2 of 2 liters · done" (no "0 / 0 completed", no "500 / 2000 logged"). |
| DV-207 | AL-COPY-042 | NOT REPLAYED | FIXED | Sc | As DV-171: quit habit rows say "Stayed on track"; amounts read "1 of 2 liters", "15 of 30 minutes". |

### AL-COPY-043

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-008 | AL-COPY-043 | STILL OPEN | FIXED | D | Steps now "Your goal · What counts · A rhythm (optional) · Review" (plain names); still four steps, as the lane notes (no F/O decision needed). |
| N-154 | AL-COPY-043 | NOT REPLAYED | FIXED | D | Bot text is a title only; against AL-COPY-043's fix line: plain step names ("Your goal · What counts · A rhythm (optional) · Review"), a project's step 2 lists its milestones (not empty), one kind name per kind (G-040). Keep an average still outside the wizard (G-047). |
| T-014 | AL-COPY-043 | CHANGED | CHANGED | D | Steps renamed ("Your goal · What counts · A rhythm (optional) · Review") and Create goal works from step 1, but the wizard is still four steps long (the bot's point was length). |
| G-040 | AL-COPY-043 | STILL OPEN | FIXED | D | One name per kind: gallery "Savings goal" (8) / "Count goal" (1) / "Project" (38) / "Keep an average" (5) / "Health goal" (1); cards and detail "Savings goal / Count goal / Project"; the wizard radios keep their sentences but each says "On its card: Savings goal / Count goal / Project". (Chain mode: see DV-120.) |
| G-047 | AL-COPY-043 | CHANGED | STILL OPEN | D | The wizard still offers three kinds (Save an amount / Reach a number of something / Finish a project); Keep an average is reached only from the Goals list ⋯ and the gallery (lane: C-DVG-02 Later, not an F/O decision). |
| N-159 | AL-COPY-043 | NOT REPLAYED | FIXED | D | Title only ("Goals / Create — POLISH"); judged as N-154: plain steps, no empty step, one kind vocabulary. |

### AL-COPY-044

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-227 | AL-COPY-044 | CHANGED | CHANGED | Sc+game | "Showcase example" is now on seeded rows (170 of them) and the header says once "rows marked “Showcase example” are fictional"; but seeded rows also read as the person's own: seeded Health counters "Counted by you" (18), seeded sleep "Private · this browser" (10), seeded tasks "Example · … · Added by you / Marked by you", the seeded "Target reached · My first 0.1 BTC" "Your goal’s history". Paging is "Show more activity"; no search or CSV export. |
| D-234 | AL-COPY-044 | NOT REPLAYED | FIXED | Sc | Activity → "Show more activity" ×22 down to "Tue, 9 Dec 2025": 78 day headers, and no row's own date differs from its day header (0 mismatches; no Oct rows under a July header). Rows older than 30 days are Health/Wealth/Goal history and an archived "Evening stretch (Showcase · earlier season)" habit, so the "30 days of Habits" promise is not contradicted. |

### AL-COUNTS-008

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-115 | AL-COUNTS-008 | NOT REPLAYED | NOT REPLAYED | — | Needs a ZIGi check-in card ("Confirmed from a ZIGi card") later removed: ZIGi is L7's lane and its served code is older than HEAD. |
| DV-169 | AL-COUNTS-008 | STILL OPEN | FIXED | D | Habits → Drink water complete, Health water + Push-ups, then Archive habit → chips All · 4 / Habit · 2 / Health · 2 and each filter lists exactly that many rows (4 / 2 / 2). |

### AL-CURRENCY-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-160 | AL-CURRENCY-004 | NOT REPLAYED | FIXED | D | Fresh: USD cash asset "DV USD cash" 500 + EUR goal. Wizard step 2 on picking it: "Valued in USD; this goal counts EUR. ZIGoals never converts between currencies, so it adds no value here. Choose a EUR asset, or change the goal’s currency."; the goal's Fund sheet after picking it: "This asset is valued in USD and this Goal counts EUR; ZIGoals never converts between currencies. Choose or add an asset valued in EUR." (no silent "No source has a value yet"). |
| X3-15 | AL-CURRENCY-004 | NOT REPLAYED | CHANGED | D | The USD asset's page still offers "Allocate to DV EUR two" (link to the EUR goal's #allocate), and that allocation form ("Selected for allocation: DV USD cash … Allocation quantity · Save allocation") shows no currency warning. Save allocation (100) gave no toast; the goal then read "CURRENT VALUE €0.00 of €800.00" and its card no "Value unavailable" and no reason, so the old "valuation needs review" state is gone but the warning the AL row asks for at allocation is missing. |

### AL-DISCOVERABILITY-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-010a | AL-DISCOVERABILITY-002 | STILL OPEN | FIXED | D | Fund Goal → Cash → Asset name "DV Savings Account" + Cash amount 200 → Continue: "Contribution: 200 USD, the amount you entered for this asset. Change the amount" — the amount is not asked again. |
| DV-010c | AL-DISCOVERABILITY-002 | CHANGED | CHANGED | D | The second amount is gone, but a money contribution is still Cash → name + amount → Continue → Preview → Confirm (kind picker + 3 screens); own-unit goals are one screen ("How many books did you add?"). |
| DV-101 | AL-DISCOVERABILITY-002 | STILL OPEN | FIXED | D | Same flow: one amount (200) for "I saved 200"; the next screen states it and offers "Change the amount". |
| NB-253 | AL-DISCOVERABILITY-002 | CHANGED | CHANGED | D | Amount asked once now; still a multi-screen modal (kind → details → preview → confirm). Letters in the amount not tried. |

### AL-FEATURE-GAP-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-126 | AL-FEATURE-GAP-002 | NOT REPLAYED | FIXED | Sc | Japan adventure → Supporting habits: "Link a habit you already have · Choose a habit (Contribute, Drink water, Exercise, Late-night snacks (Showcase), Meditate, Read, Walk) · Link habit"; linking "Read" → toast "Read now supports this goal." + Undo, and the module reads "1 linked · keep your rhythm" with Read listed. |

### AL-FIELD-ERROR-011

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| G-004 | AL-FIELD-ERROR-011 | NOT REPLAYED | FIXED | D | Typing "Emergency fund" again: "You already have a goal called “Emergency fund”." under Goal name; Create still allowed (the AL row asks to warn). |
| DV-109 | AL-FIELD-ERROR-011 | UNSEEN (round 1 file: FIXED) | HOLDS | D | "6 books" again → "This Goal already has a milestone called “6 books”. Give this one another name."; edit buttons are unique ("Edit milestone 3 books", "… 6 books", …). |
| DV-019e | AL-FIELD-ERROR-011 | UNSEEN (round 1 file: FIXED) | HOLDS | D | As C-DV-12: ↑/↓ per milestone; "15 books" moved up; Activity row "Milestones reordered". Insert-after is add then move. |

### AL-HELP-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| TK-146 | AL-HELP-001 | STILL OPEN | FIXED | Sc | Help has "Where are Reward goals?" (sweep 3 line; also found by search). |

### AL-NUMBERS-SOURCE-012

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| L-066 | AL-NUMBERS-SOURCE-012 | NOT REPLAYED | FIXED | D, Sc | Fresh goal "DV EUR trip": card ⋯ → Change artwork… → Mountains → Save artwork ("Artwork changed for …" + Undo): card art sailboat → mountains, and the Vision board tile shows the same "scene-mountains". (In the Showcase a goal with a seeded vision photo keeps the photo on the board.) |

### AL-PERF-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| BN-092 | AL-PERF-004 | NOT REPLAYED | FIXED | Sc | Wealth calculator: filling the Years field took 40 ms and kept "25" (no hang, no re-mount); Years has maxlength 2. |
| BN-135 | AL-PERF-004 | NOT REPLAYED | CHANGED | Sc | The staking calculator is now the compound calculator (Earn links to it). Pasting 500 characters into "yearly return" took 14 ms (no slowness), but the field still has no maxlength and holds all 500 characters (the AL row asks for maxlength where missing). Run at 1280 Dark, not the bot's 375. |
| BN-153 | AL-PERF-004 | STILL OPEN | FIXED | D | Fresh wizard, waited 1.5 s, click Goal name, keyboard.type "Berlin" at 120 ms/key → "Berlin"; Target typed "5000" → "5000". |
| BN-188 | AL-PERF-004 | STILL OPEN | FIXED | D | Three fresh wizards: first fill of Target "1200" and Name "Fill n" kept both values every time (0 of 3 lost; round 1: 5 of 5 lost). |
| BN-189 | AL-PERF-004 | NOT REPLAYED | FIXED | Sc | Checklist → Quick add opens with focus in the input ("e.g. Drink water"); keyboard-typed "Berlin habit one" at 60 ms/key reads "Berlin habit one" (nothing lost). |

### AL-PERF-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-038 | AL-PERF-005 | NOT REPLAYED | FIXED | D | Create goal: the button reads "Saving…" right after the click; the goal page opened 1.9 s later. |
| T-063 | AL-PERF-005 | NOT REPLAYED | FIXED | D | As D-038: "Saving…" state at once; page in 1.9 s. |

### AL-PERSISTENCE-008

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| B-056 | AL-PERSISTENCE-008 | STILL OPEN | FIXED | Sc | Wealth calculator → "Turn this into a goal" (href carries contribution=200&every=monthly) → Review "Planned contributions · 200 USD · monthly · next 4 Nov 2026". |

### AL-SEARCH-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-079 | AL-SEARCH-003 | NOT REPLAYED | NOT REPLAYED | Sc | Wealth → + Add asset → "Find your asset": the catalog search box is disabled here because the public catalog cannot be reached from this sandbox ("Automatic prices are unavailable · Your manual assets and values still work · Try catalog again"); a one-letter search cannot be typed. Needs a networked run. |
| D-093 | AL-SEARCH-003 | NOT REPLAYED | FIXED | Sc | Global search (/) with a 195-character query: the dialog stays 918 px wide with no element wider than it (no overflow, page scrollWidth 1280); "0 results · Nothing on this device matches “…”" wraps. |
| D-051 | AL-SEARCH-003 | NOT REPLAYED | FIXED | Sc | Markets: "Search this market view" sits near the top (y 604 at 800 high, above the fold, next to "+ Find a market"); "btc" → "Showing 1–1 of 1 markets · Bitcoin" (one row, no near-duplicates). The public catalog behind "+ Find a market" was not searched: its price service is unreachable from this sandbox ("Some market data could not refresh"). |
| DV-022b | AL-SEARCH-003 | CHANGED | FIXED | Sc | Goals list (7+ goals): "Search Goals" box and "Sort Goals" with "Pinned first · Name A–Z · Name Z–A · Most progress first · Target date, soonest first · By life area". |

### AL-TOAST-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-019a | AL-TOAST-007 | STILL OPEN | FIXED | D | Remove milestone: toast "“9 books” removed." with Undo lived 12.4 s (≥ 10 s asked); Undo is keyboard-reachable (focus + Enter restored "15 books"). No confirm, as the toast row (AL-TOAST-007) does not ask for one. |
| DV-040h | AL-TOAST-007 | STILL OPEN | FIXED | D | Same run as DV-019a: the Undo toast now stays 12.4 s (was ~8 s); Undo restores. No confirm (the row asks only for the toast). |
| DV-111 | AL-TOAST-007 | UNSEEN (round 1 file: FIXED) | HOLDS | D | Remove "15 books" → focus Undo → Enter: the milestone came back (list 3 / 6 / 15 / 12 books). |
| DV-019f | AL-TOAST-007 | UNSEEN (round 1 file: FIXED) | HOLDS | D | Module summary "Milestones · 0 of 5 complete"; hero "0 milestones of 4 milestones". |

### AL-CHARTS-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| G-017 | AL-CHARTS-001 | STILL OPEN | FIXED | Sc, D | Launch my creative studio (2 of 4 milestones) and a fresh project: no chart on a project page at all, so no "Scale minimum: -1 milestones" / "Scale maximum: 3 milestones". |

### AL-COPY-045

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-017 | AL-COPY-045 | CHANGED | FIXED | D | Run a 10K: no money category list (the Money category tiles show only for a savings goal); the wizard says the picture follows the goal's name. |
| DV-031e | AL-COPY-045 | CHANGED | FIXED | D | As DV-017: category tiles only for a savings goal; a run/project shows only Life area and the "picture follows your goal’s name" line. |

### AL-FIRST-RUN-009

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-117 | AL-FIRST-RUN-009 | NOT REPLAYED | FIXED | D | Empty profile, Activity → "Habit · 0" (still clickable): "No habit check-ins yet. Each day you check in a habit shows here. Log one on Habits →" (a filter-specific line, no generic mascot text). |

### AL-LAYOUT-DESKTOP-010

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-029d | AL-LAYOUT-DESKTOP-010 | NOT REPLAYED | STILL OPEN | D | 1920 with a savings, a project and an average goal: the two value/project cards are 591 px tall, the "Keep an average" card beside them about 355 px with a different layout, so the row is uneven (lane: not changed). |
| DV-204 | AL-LAYOUT-DESKTOP-010 | STILL OPEN | FIXED | D | 1920: "+ Create a goal" sits under the intro line (x 294, y 319, under the h1 ending at 259), left-aligned; three cards fill the row (482 px each). |
| DV-246 | AL-LAYOUT-DESKTOP-010 | NOT REPLAYED | FIXED | 768 | 768×1024: Goals "+ Create a goal" under the intro (x 108–249, y 397–443), clear of the lotus art on the right; Habits "+ New habit" likewise at x 108, y 392; no sideways scroll (scrollWidth 768). |

### AL-LAYOUT-DESKTOP-012

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| T-070 | AL-LAYOUT-DESKTOP-012 | NOT REPLAYED | FIXED | Sc | Added a cash asset "A very long savings account name that goes on and on and on for testing ok" → Today "Recent activity": the name wraps inside its column (160 px wide, clipped, card scrollWidth 328 ≤ width 330), the card is not widened and nothing overflows. |

### AL-LAYOUT-DESKTOP-013

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-060 | AL-LAYOUT-DESKTOP-013 | NOT REPLAYED | FIXED | D | /app/goals/new at 1920: the art strip is a panel left of the step card, top-aligned with it (both start at y ≈ 377), not offset behind the type picker. (Professor's width is not recorded; checked at 1920 only.) |

### AL-COMPETITOR-GAP-121

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DV-09 | AL-COMPETITOR-GAP-121 | NOT REPLAYED | FIXED | D | Project goal → Goal status → "A message for the day you reach it (optional)" = "Well done, me!" → "Saved. It shows on the day you reach this goal." + Undo; ticking the last milestone shows "GOAL REACHED · You did it: DV Congrats project. · Well done, me! · Your message to yourself". |

### L3 handover (Goals pages; L3 row "keep")

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-165 | L3 handover | NOT REPLAYED | HOLDS | Sc+chain, D | All kinds can be created: Reward (chain), and Count, Savings and Project in the plain runs; a project still needs a milestone. |
| NB-173 | L3 handover | NOT REPLAYED | HOLDS | D+game | Ticking the last milestone: "GOAL REACHED · You did it: DV Read project." card, card badge "COMPLETED", Journey "1 goal reached"; XP now 25 per milestone + 25 for the reached goal (125 XP for 4 milestones + reach), by the newer XP rules (lib/game/xp.ts), not +50. |
| NB-190 | L3 handover | NOT REPLAYED | HOLDS | D+game | Count goal 5 books, add 8: preview "Goal complete · 100% funded … 3 books past the target: kept, not counted."; hero "Completed · 100 % · 5 books of 5 books"; "GOAL REACHED" card; Journey 35 XP (10 for the contribution + 25 for reaching it). |
| NB-198 | L3 handover | NOT REPLAYED | HOLDS | D | "DV Child project" → Part of a bigger goal → DV Read project: toast "Now part of DV Read project." + Undo; on DV Read project the parent list offers only "None: a goal of its own" (the child is not offered, so no cycle can be made). |
| N-170 | L3 handover | NOT REPLAYED | FIXED | Sc+game | Own goal events (allocation, contribution) are not tagged "Showcase example" ("Your goal’s history", "Added by you"). |

### AL-XP-BADGES-002 (L3 handover)

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| G-045 | AL-XP-BADGES-002 | NOT REPLAYED | STILL OPEN | D | Average "Screen time", at most 2 h, 2.3 h entered (ring 87 %, target missed) → Mark as finished → toast "Marked as finished. It is on the Hall of achievements." and the Hall lists "Screen time · Finished 4 Nov 2026 · Finished the day it started" (a missed target finishes into the Hall). |

## STILL OPEN for the lane

Common setup: Chrome, `locale en-GB`, `Europe/Brussels`, the app clock at 4 Nov 2026 03:30 Brussels. **D** = 1920×1113 Nebula, fresh context (Welcome seen). **Sc** = 1280×800 Dark, Settings → Load Showcase Demo.

1. **DV-007a — the count goal repeats its numbers.** D: wizard → Reach a number of something → "DV Count books", 20, asset "books" → Create → Fund Goal → 3 → Confirm. The hero reads "3 books of 20 books · Remaining 17 books" and the "Your plan" panel below repeats "15 % · 3 books of 20 books · 17 books remaining" (the fourth pass says the panel no longer repeats remaining).
2. **G-045 — a missed average target finishes into the Hall.** D: /app/goals/average/new → Name "Screen time", Measure "Your own measure", Keep it "At most", Target 2, Unit "h a day" → Save → value 2.3 → Save the day (ring 87 %) → Mark as finished → toast "Marked as finished. It is on the Hall of achievements."; Goals → Hall of achievements lists "Screen time · Finished 4 Nov 2026". AL-XP-BADGES-002 asks for celebrations only for real completions.
3. **D-028 — Today's tab stops.** Sc: Today has 289 visible tab stops (round 1: 290). Lane: partly; the rest are called distinct controls.
4. **M-091 — Quick add focus.** Sc: Today → "+ Quick add": focus lands on "Close Quick add ×", not the input (the Checklist page's own Quick add does focus its input). Lane: waits for FX-G53a.
5. **B-092 — "Portfolio completed" for an unfinished goal.** Sc: Activity → Yesterday 15:45 "Goal · Portfolio completed · Showcase · Launch my creative studio"; that goal's page reads Active, 50 %, 2 of 4 milestones.
6. **DV-029d — uneven card grid.** D: create a savings goal (Holiday fund idea, 500), a project (Run a 10K idea) and an average goal (Sleep, at least 7) → Goals at 1920: the two cards are 591 px tall, the "Keep an average" card beside them about 355 px with another layout (lane: not changed).
7. **D-164 — "No assets yet" in the Showcase wizard.** Sc (also at 1097×636): Create a goal → Reach a number of something → "Test goal", 10, asset "BTC" → Continue → "Count what I already hold" → "Existing assets … No assets yet. Choose a category to add your first." while the Showcase tracks 0.45 BTC (its goal pages' Fund sheet lists "Bitcoin 0.35 available of 0.45 BTC"). The same for a USD savings goal ("Count money I already have") and with the chain chosen. A fresh profile with a cash asset lists it, so it is the Showcase's list. (The Checklist dock no longer covers Continue.)
8. **DV-120 — "Quantity" preselected with the chain chosen.** Sc + Earn shown (`zigoals:earn-prefs:v1` pageShown true, i.e. the chain chosen): /app/goals/new shows "Quantity / Value / Reward / Project" with Quantity checked (preview "Quantity · ZIG · Custom · At your own pace"); name + Create makes an asset-quantity goal. The same radios have no "On its card" names, and a new Reward goal's card says "REWARDS GOAL" while its page says "REWARD GOAL".
9. **G-047 — Keep an average is not in the wizard.** D: /app/goals/new offers three kinds; Keep an average is reached only from the Goals list ⋯ and the template gallery (lane: C-DVG-02 Later, not an F/O decision).
10. **D-187 — empty states differ.** D: Goals → Closed "No closed goals." (no next step); Ecosystem search "zzzz" "No projects match these filters." (no next step); Markets search "zzzz" "No matching markets · No matches in this view · Try another name or browse the full CoinGecko catalog.".
11. **N-167 — valuation labels.** D: the count goal from step 1 → Wealth module: "3 BOOKS intended · 3 BOOKS counted · UNKNOWN · MANUAL", "0 available of 3 BOOKS · Needs valuation"; the timeline's Record details show "Evidence source LOCAL_EDIT" and raw record ids such as "change:1749…:allocation:bc1c…". (The bot gave only a title; this is against AL-COPY-036's "plain labels, no raw UUIDs".)

### CHANGED — the part that remains (one line each; full evidence in the tables)

- **DV-034a, DV-104, MO-120, DV-015** (D): the count goal page keeps the "Wealth · add money you have" module ("Your funding assets … UNKNOWN · MANUAL"), the "Wealth & contribution history / Counted wealth" chart and "The liquidity of some allocated wealth is unknown."; review "A plan, not a transfer: nothing moves."; Fund sheet header "YOUR PRIVATE WEALTH".
- **DV-041b, NB-098** (D): a completed project's timeline row "Target reached · goal completed · 4 USD" (Exact amount 4 USD).
- **DV-018** (Sc): Showcase project eyebrow "PROJECT GOAL · PROJECT"; its Goal Vault says "Your money is working toward this goal…".
- **D-039, N-144** (D): a savings goal with a plan shows "Funding scenario · Funding Wealth: ON TRACK" and "Unbonding and provider liquidity may prevent access" on a USD cash goal.
- **DV-007b, X3-19** (D): mid-sentence "Goal" remains ("for this Goal (Mondays)", "count toward this Goal right away", "allocate it toward this Goal", "Retained Goal milestones", "reopened Goal starts a new cycle", "Edit Goal details").
- **PR-024** (Sc): Emergency fund's "On track?" quotes "US$250.00 in every 30 days" beside the pace card's "US$771.17 every 30 days"; What if gives "18 Jan 2028 … US$750.00 a month".
- **D-227** (Sc): seeded rows that read as the person's: Health counters "Counted by you", sleep "Private · this browser", tasks "Added by you / Marked by you", "Target reached · My first 0.1 BTC" "Your goal’s history".
- **M-104, B-083, M-131** (D / Sc): Remove milestone and health-goal End act at once (Undo, no confirm).
- **NB-175** (Sc): a completed goal's card ⋯ still offers "Add progress to Today / Add next contribution to Today".
- **DV-170** (D): Activity Remove is named after the row but still on every row, not in a ⋯.
- **DV-040g, DV-056c** (D): the card menu has 0 role=menuitem (the trigger is now a button with aria-expanded).
- **D-055** (Sc): the asset card ⋯ has no Delete or Edit.
- **D-230** (Sc): "Back to top" leaves focus on the bottom link.
- **BN-135** (Sc): the calculator's yearly-return field has no maxlength (500 characters accepted).
- **DV-010c, NB-253** (D): a money contribution is still kind → details → preview → confirm.
- **N-166** (Sc + chain): a new Reward goal's Wealth chooser offers no existing asset (no "ZIG reward reserve" or remainder).
- **PR-055** (Sc): a count goal with asset "USD" can be funded only through a new own-count asset, not the existing USD cash reserve.
- **X3-15** (D): a USD asset's page offers "Allocate to" a EUR goal, and the allocation form shows no currency warning.
- **G-014** (D): a 93 % average shows no near-miss wording (the wrong "Not on target yet" is gone).
- **DV-053c** (Sc, D): chess rating goals exist on Chess; the wizard's chess idea still has no number field.
- **N-071** (D): the Run a 10K preview still says "Custom" ("Finish a project · Custom · At your own pace").
- **T-014** (D): still four steps.

