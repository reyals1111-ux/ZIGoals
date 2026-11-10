# Grok #53 replay — lane L4 (Goals, Activity, copy audit), pass 1

- **Commit served:** `c521574f` (production build, `PUBLIC_ALPHA_UNDEPLOYED`, built from /home/user/zig-branch) on http://127.0.0.1:3101.
- **Date:** 5 Nov 2026, about 03:40–06:35 Brussels.
- **Replayed by:** a fresh replay agent (no fixes made, no app code changed, no git changes). Scope: the 69 AL rows with lane L4 in GROK53_LEDGER.md (355 unique finding ids: Denver DV/old ids, Denver re-check D/B/G/N/M/L/T/BUG ids, Professor PR/X3, Moscow MO, Berlin BN, Nairobi NB, Tokyo TK, competitor C-DV/C-DVG), plus the L4 rows of COPY_AUDIT.md. lanes/L4.md was read only to see what claims Fixed.
- **Browser:** Google Chrome (channel `chrome`), headless, Playwright 1.63, `locale: en-GB`, `timezoneId: Europe/Brussels`, UI only (no seeded store). Every run went through `flock /tmp/claude-0/zig-browser.lock`, one browser at a time. Scripts and 4 screenshots are in `/tmp/claude-0/replay-L4/` and are not committed.
- **Conditions used** (codes in the table):
  - **D** = Denver's: desktop 1920×1113, Nebula, a fresh empty context (Welcome marked seen), everything done through the UI.
  - **DL** = the same in Light.
  - **Sc** = 1280×800 Dark with Settings → Load Showcase Demo (the Showcase turns the crypto modules on, so the wizard shows the chain vocabulary there, as on the Professor's G+Sc runs).
  - **375** = 375×812 Dark, Showcase.
  - **code** = a competitor/decision row checked against the source and AL_SCOPE F only.
- **Lane specs (tests/grok53/goals):** not run. The lock was shared with five other replays and a run of the 10 specs would have held it for long; besides, every L4 spec seeds the store directly, while the bots used the UI. All verdicts below come from the UI replays.
- **Machine note:** the box ran other agents' Playwright suites in parallel, so pages were slow (one script hit its 600 s limit and was re-run in parts). Nothing below depends on timing except DV-019a (toast life, measured on an otherwise idle page) and D-038 (marked inconclusive).

## Totals (counted per unique finding id)

| verdict | ids |
|---|---|
| FIXED | 185 |
| HOLDS | 11 |
| STILL OPEN | 45 |
| CHANGED | 43 |
| OWNER DECISION (agreed: F) | 6 |
| NOT A DEFECT (status; unchanged, agreed) | 2 |
| REASON CITED, NOT BUILT | 12 |
| NOT REPLAYED | 51 |
| **total ids** | **355** |

"NOT A DEFECT (status; unchanged, agreed)": the behaviour is unchanged and the lane says it is not a defect (native `<summary>` / disclosure links); I agree on the merits, but it is not an F/O decision, so it is counted apart. "REASON CITED, NOT BUILT": competitor rows the lane left for later or sent to another lane; the reason is not an AL_SCOPE F/O decision.

## Findings (every id in the 69 L4 AL rows)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| G-033 | AL-ACTIVITY-001 | FIXED | D | Project "DV Read project": Close → one "Goal closed" row in Activity (04:03); savings Close → one row too. |
| BUG-040 | AL-ACTIVITY-001 | FIXED | D | Project "DV Read project": Close → one "Goal closed" row in Activity (04:03); savings Close → one row too. |
| DV-046a | AL-ACTIVITY-001 | FIXED | D | Project "DV Read project": Close → one "Goal closed" row in Activity (04:03); savings Close → one row too. |
| DV-088 | AL-ACTIVITY-001 | FIXED | D | Project "DV Read project": Close → one "Goal closed" row in Activity (04:03); savings Close → one row too. |
| DV-113 | AL-ACTIVITY-001 | FIXED | D | Project "DV Read project": Close → one "Goal closed" row in Activity (04:03); savings Close → one row too. |
| DV-114 | AL-ACTIVITY-001 | FIXED | D | "Target reached · goal completed" row at completion; Reopen writes one "Goal reopened" row. (A reopened finished project logs a second "Target reached" at once: new cycle.) |
| PR-056 | AL-ACTIVITY-001 | FIXED | D | Project "DV Read project": Close → one "Goal closed" row in Activity (04:03); savings Close → one row too. |
| PR-057 | AL-ACTIVITY-001 | STILL OPEN | Sc | Showcase → Emergency fund → Fund Goal → USD cash reserve, 250 → Activity 05:31 also shows "Target reached · goal completed · My first 0.1 BTC · 0.1 BTC" for the other goal. |
| BUG-004 | AL-ACTIVITY-001 (also AL-XP-BADGES-009) | NOT REPLAYED | — | Needs a holding edited to 0 and back on Wealth (L1 flow, not run). Its cousin DV-025b is FIXED. |
| BUG-073 | AL-ACTIVITY-001 (also AL-XP-BADGES-009) | STILL OPEN | Sc | Showcase → Emergency fund → Fund Goal → USD cash reserve, 250 → Activity 05:31 also shows "Target reached · goal completed · My first 0.1 BTC · 0.1 BTC" for the other goal. |
| BUG-010 | AL-CONFIRM-DELETE-005 (also AL-CONFIRM-DELETE-006) | FIXED | D | Project with milestone history: Delete Goal enabled while active and after Close; "Delete this goal?" confirm; toast "Deleted “…”." + Undo puts the goal back. |
| N-040 | AL-CONFIRM-DELETE-005 | FIXED | D | Project with milestone history: Delete Goal enabled while active and after Close; "Delete this goal?" confirm; toast "Deleted “…”." + Undo puts the goal back. |
| N-125 | AL-CONFIRM-DELETE-005 | FIXED | D | Project with milestone history: Delete Goal enabled while active and after Close; "Delete this goal?" confirm; toast "Deleted “…”." + Undo puts the goal back. |
| D-036 | AL-CONFIRM-DELETE-005 | FIXED | D | Project with milestone history: Delete Goal enabled while active and after Close; "Delete this goal?" confirm; toast "Deleted “…”." + Undo puts the goal back. |
| D-104 | AL-CONFIRM-DELETE-005 | HOLDS | D | Reverse history entry: clear confirm, original kept, correction row "−2 books"; no raw id. |
| G-010 | AL-CONFIRM-DELETE-005 | FIXED | D | Project with milestone history: Delete Goal enabled while active and after Close; "Delete this goal?" confirm; toast "Deleted “…”." + Undo puts the goal back. |
| M-103 | AL-CONFIRM-DELETE-005 | FIXED | D | Project with milestone history: Delete Goal enabled while active and after Close; "Delete this goal?" confirm; toast "Deleted “…”." + Undo puts the goal back. |
| M-124 | AL-CONFIRM-DELETE-005 | FIXED | D | Close works on a savings goal (confirm, toast "Goal closed. What it counted is free for other goals…"). |
| B-083 | AL-CONFIRM-DELETE-005 | NOT REPLAYED | — | Health goal "End goal" is L2's form; not run here. |
| G-046 | AL-CONFIRM-DELETE-005 | FIXED | D | Average goal "Remove this goal" → "Remove “Sleep 7 hours a night”? Its one entered day goes with it… [Remove] [Keep it]", then toast + Undo (restored). |
| M-104 | AL-CONFIRM-DELETE-005 | CHANGED | D | Remove milestone: Undo toast now (keyboard-focusable, Undo restores), still no confirm, and the toast is gone after 8.1 s. |
| M-131 | AL-CONFIRM-DELETE-005 | NOT REPLAYED | — | Health goal "End goal" is L2's form; not run here. |
| N-158 | AL-CONFIRM-DELETE-005 | FIXED | D | Closed card has a ⋯: "Open goal · Edit details · Reopen…"; Delete is on the goal page. |
| T-122 | AL-CONFIRM-DELETE-005 | FIXED | D | Project with milestone history: Delete Goal enabled while active and after Close; "Delete this goal?" confirm; toast "Deleted “…”." + Undo puts the goal back. |
| DV-012f | AL-CONFIRM-DELETE-005 | FIXED | D | Average goal "Remove this goal" → "Remove “Sleep 7 hours a night”? Its one entered day goes with it… [Remove] [Keep it]", then toast + Undo (restored). |
| DV-021b | AL-CONFIRM-DELETE-005 | FIXED | D | Project with milestone history: Delete Goal enabled while active and after Close; "Delete this goal?" confirm; toast "Deleted “…”." + Undo puts the goal back. |
| DV-041c | AL-CONFIRM-DELETE-005 | FIXED | D | Closed card has a ⋯: "Open goal · Edit details · Reopen…"; Delete is on the goal page. |
| DV-052b | AL-CONFIRM-DELETE-005 | FIXED | D | Average goal "Remove this goal" → "Remove “Sleep 7 hours a night”? Its one entered day goes with it… [Remove] [Keep it]", then toast + Undo (restored). |
| MO-129 | AL-CONFIRM-DELETE-005 | FIXED | D | Project with milestone history: Delete Goal enabled while active and after Close; "Delete this goal?" confirm; toast "Deleted “…”." + Undo puts the goal back. |
| TK-177 | AL-CONFIRM-DELETE-005 | FIXED | D | Project with milestone history: Delete Goal enabled while active and after Close; "Delete this goal?" confirm; toast "Deleted “…”." + Undo puts the goal back. |
| TK-179 | AL-CONFIRM-DELETE-005 | CHANGED | D | Confirm is in view and the toast is right, but the card ⋯ still has no Delete. |
| BN-149 | AL-CONFIRM-DELETE-006 | CHANGED | DL | Card ⋯ now: Add progress to Today · Add next contribution to Today · Ask ZIGi · Open goal · Edit details · Close… · Change artwork…; still no Delete on the card (only on the page). Delete now has Undo + toast. |
| BN-187 | AL-CONFIRM-DELETE-006 | CHANGED | DL | Card ⋯ now: Add progress to Today · Add next contribution to Today · Ask ZIGi · Open goal · Edit details · Close… · Change artwork…; still no Delete on the card (only on the page). Delete now has Undo + toast. |
| D-035 | AL-CONFIRM-DELETE-006 | FIXED | D | Goal status → "Close Goal and release allocations": confirm opens next to the button (107 px), in view, focused; copy "Close this goal? It leaves your active goals…" (no "Allocated units"). |
| B-143 | AL-CONFIRM-DELETE-006 | FIXED | D | Goal status → "Close Goal and release allocations": confirm opens next to the button (107 px), in view, focused; copy "Close this goal? It leaves your active goals…" (no "Allocated units"). |
| G-011 | AL-CONFIRM-DELETE-006 | FIXED | D | Goal status → "Close Goal and release allocations": confirm opens next to the button (107 px), in view, focused; copy "Close this goal? It leaves your active goals…" (no "Allocated units"). |
| DV-021a | AL-CONFIRM-DELETE-006 | FIXED | D | Goal status → "Close Goal and release allocations": confirm opens next to the button (107 px), in view, focused; copy "Close this goal? It leaves your active goals…" (no "Allocated units"). |
| DV-021e | AL-CONFIRM-DELETE-006 | FIXED | D | After Close the top ⋯ reads "Pin Goal · Lock editing · Reopen this goal · Delete Goal". |
| DV-026a | AL-CONFIRM-DELETE-006 | FIXED | D | Delete confirm opens at the ⋯ menu, in view. |
| DV-041a | AL-CONFIRM-DELETE-006 | FIXED | D | Goal status → "Close Goal and release allocations": confirm opens next to the button (107 px), in view, focused; copy "Close this goal? It leaves your active goals…" (no "Allocated units"). |
| DV-043e | AL-CONFIRM-DELETE-006 | FIXED | DL | List ⋯ "Options for Goals": Goal templates · Keep an average… · Positions → "Every holding that counts toward your goals, in one list." |
| DV-056a | AL-CONFIRM-DELETE-006 | CHANGED | DL | Card ⋯ now: Add progress to Today · Add next contribution to Today · Ask ZIGi · Open goal · Edit details · Close… · Change artwork…; still no Delete on the card (only on the page). Delete now has Undo + toast. |
| DV-100 | AL-CONFIRM-DELETE-006 | FIXED | D | The case the bot saw (milestone-only goal) is now deletable, so the detached reason no longer shows. |
| DV-102 | AL-CONFIRM-DELETE-006 | CHANGED | DL | Card ⋯ now: Add progress to Today · Add next contribution to Today · Ask ZIGi · Open goal · Edit details · Close… · Change artwork…; still no Delete on the card (only on the page). Delete now has Undo + toast. |
| NB-172 | AL-CONFIRM-DELETE-006 | CHANGED | DL | Card ⋯ now: Add progress to Today · Add next contribution to Today · Ask ZIGi · Open goal · Edit details · Close… · Change artwork…; still no Delete on the card (only on the page). Delete now has Undo + toast. |
| NB-175 | AL-CONFIRM-DELETE-006 | CHANGED | DL | Card ⋯ now: Add progress to Today · Add next contribution to Today · Ask ZIGi · Open goal · Edit details · Close… · Change artwork…; still no Delete on the card (only on the page). Delete now has Undo + toast. |
| NB-182 | AL-CONFIRM-DELETE-006 | CHANGED | D | Card ⋯ "Edit details" jumps to the panel; the page's top ⋯ still has no Edit, and Edit/Status stay folded at the bottom. |
| NB-184 | AL-CONFIRM-DELETE-006 | FIXED | D | Close toast has Undo; one "Goal closed" row; one "Goal reopened" row; Delete exists. |
| PR-059 | AL-CONFIRM-DELETE-006 | NOT REPLAYED | — | Needs a Reward goal (chain mode); none created in this replay. |
| B-200 | AL-COUNTS-007 | FIXED | Sc | Hall "My first 0.1 BTC · Finished"; its page reads Completed 100 %, 0.1 of 0.1 BTC. |
| D-238 | AL-COUNTS-007 | FIXED | D, Sc | Completed-then-closed project: Goals FINISHED 1, Today "1 completed", Journey "1 goal reached". Showcase: Goals 7 active / 3 finished = Today life overview and "Your destinations" (7 · 3). |
| B-009 | AL-COUNTS-007 | FIXED | D, Sc | Completed-then-closed project: Goals FINISHED 1, Today "1 completed", Journey "1 goal reached". Showcase: Goals 7 active / 3 finished = Today life overview and "Your destinations" (7 · 3). |
| B-098 | AL-COUNTS-007 | FIXED | D, Sc | Completed-then-closed project: Goals FINISHED 1, Today "1 completed", Journey "1 goal reached". Showcase: Goals 7 active / 3 finished = Today life overview and "Your destinations" (7 · 3). |
| B-137 | AL-COUNTS-007 | FIXED | 375 | Tree at 375 (Showcase): no sideways scroll (scrollWidth 375). |
| BUG-062 | AL-COUNTS-007 | STILL OPEN | Sc | Showcase Today: "Your financial progress · 5 Active goals" next to "Your destinations · 7 active goals · 3 completed"; Goals ACTIVE 7. |
| G-037 | AL-COUNTS-007 | STILL OPEN | Sc | Showcase Today: "Your financial progress · 5 Active goals" next to "Your destinations · 7 active goals · 3 completed"; Goals ACTIVE 7. |
| M-081 | AL-COUNTS-007 | FIXED | D, Sc | Completed-then-closed project: Goals FINISHED 1, Today "1 completed", Journey "1 goal reached". Showcase: Goals 7 active / 3 finished = Today life overview and "Your destinations" (7 · 3). |
| M-082 | AL-COUNTS-007 | NOT REPLAYED | — | "Completed goals say Not on target yet": not checked on the Showcase completed goals. |
| C-DVG-08 | AL-COUNTS-007 | FIXED | D | Project 2/2 done then closed: FINISHED 1, in the Completed filter and the Hall; Today "1 completed"; Journey "1 goal reached". |
| DV-022d | AL-COUNTS-007 | FIXED | D | Tree shows no lone "Health" row; Health goals are their own section below. |
| DV-027c | AL-COUNTS-007 | FIXED | Sc | Goals figures: "ACTIVE 7 goals in motion · + 1 health goal below". |
| DV-042 | AL-COUNTS-007 | FIXED | D | Project 2/2 done then closed: FINISHED 1, in the Completed filter and the Hall; Today "1 completed"; Journey "1 goal reached". |
| DV-045a | AL-COUNTS-007 | FIXED | D | Project 2/2 done then closed: FINISHED 1, in the Completed filter and the Hall; Today "1 completed"; Journey "1 goal reached". |
| DV-057a | AL-COUNTS-007 | FIXED | D | Project 2/2 done then closed: FINISHED 1, in the Completed filter and the Hall; Today "1 completed"; Journey "1 goal reached". |
| DV-058a | AL-COUNTS-007 | FIXED | D | Project 2/2 done then closed: FINISHED 1, in the Completed filter and the Hall; Today "1 completed"; Journey "1 goal reached". |
| B-202 | AL-COUNTS-007 | NOT REPLAYED | — | Help "Why does Today show fewer cards?" is L6; not checked. |
| C-DV-08 | AL-COUNTS-007 | FIXED | D | Project 2/2 done then closed: FINISHED 1, in the Completed filter and the Hall; Today "1 completed"; Journey "1 goal reached". |
| PR-082 | AL-COUNTS-007 | STILL OPEN | Sc | Showcase Today: "Your financial progress · 5 Active goals" next to "Your destinations · 7 active goals · 3 completed"; Goals ACTIVE 7. |
| B-171 | AL-CRASH-002 | FIXED | Sc | "Create 2 hours a day" (and Sleep, Water) average pages open; no error page. |
| G-016 | AL-CRASH-002 | HOLDS | all | No app error page in any run. |
| DV-016a | AL-FIELD-ERROR-010 | FIXED | D | 150-char milestone → stays on step 1, "Milestone 2 is 150 characters long; use at most 100." under the box, box focused. Duplicate → "Milestones 1 and 3 have the same name…". |
| DV-031a | AL-FIELD-ERROR-010 | FIXED | D | Past date → "Choose today or a future target date."; after fixing the date the message is gone. |
| DV-030 | AL-LAYOUT-DESKTOP-008 | FIXED | DL | 2000-char notes: hero shows 3 lines + "Show all notes"; hero stays one screen; notes maxlength 2000. (screenshot dv030) |
| DV-083b | AL-NAV-003 | FIXED | D | Idea "A weight goal ↗ · Opens the Health goal form with Weight chosen…". |
| DV-181 | AL-NAV-003 | FIXED | D | Templates → Lose 5 kg → /app/goals?health-goal=weight#goals-health with the New health goal form open (direction "Towards a lower weight", Target kg), in view, focused. |
| DV-008a | AL-NUMBERS-SOURCE-008 | FIXED | D | "Record contribution" opens on the Fund Goal tab (moves progress); history only is the second tab and says it never changes funding. |
| DV-037 | AL-NUMBERS-SOURCE-008 | FIXED | D | History-only 2 books / US$50: hero unchanged and the panel says "Includes 2 books recorded as history only, which never changes progress". |
| DV-050c | AL-NUMBERS-SOURCE-008 | FIXED | D | History-only 2 books / US$50: hero unchanged and the panel says "Includes 2 books recorded as history only, which never changes progress". |
| D-164 | AL-NUMBERS-SOURCE-009 | NOT REPLAYED | — | "No assets yet" part FIXED (see D-025); the dock-over-Continue part needs 175 % zoom/768 (L10a), not replayed. |
| D-025 | AL-NUMBERS-SOURCE-009 | FIXED | Sc | Showcase wizard step 2 lists the 13 assets; review names the source ("Nothing chosen yet · add it on the goal’s page"). |
| D-166 | AL-NUMBERS-SOURCE-009 | FIXED | Sc | Showcase wizard step 2 lists the 13 assets; review names the source ("Nothing chosen yet · add it on the goal’s page"). |
| D-226 | AL-NUMBERS-SOURCE-009 | FIXED | Sc | Showcase wizard step 2 lists the 13 assets; review names the source ("Nothing chosen yet · add it on the goal’s page"). |
| D-241 | AL-NUMBERS-SOURCE-009 | STILL OPEN | Sc | Showcase, USD value goal, step 2 "Use wealth I already have": still "Available stake: 0 ZIG" and "Goal Manager: Not deployed" on a non-ZIG goal. |
| G-002 | AL-NUMBERS-SOURCE-009 | NOT REPLAYED | — | "Goal 100 % at once from existing wealth": not set up. |
| N-166 | AL-NUMBERS-SOURCE-010 | NOT REPLAYED | — | Reward goal not created (chain only). |
| G-009 | AL-NUMBERS-SOURCE-010 | FIXED | Sc | Fund dialog lists "USD cash reserve 17,500 available of 25,000 USD". |
| B-196 | AL-NUMBERS-SOURCE-011 | NOT REPLAYED | — | Need a contribution plan + target edit / a new plan on day 0; not set up. |
| D-235 | AL-NUMBERS-SOURCE-011 | CHANGED | Sc | Emergency fund: AHEAD with pace forecast 7 Jan 2028 (target 4 Nov 2028), but the same page's "On track?" says "at that pace… about 17 Jun 2030" and the plan says "Projected completion 8 Aug 2028". |
| M-056 | AL-NUMBERS-SOURCE-011 | CHANGED | Sc | Emergency fund: AHEAD with pace forecast 7 Jan 2028 (target 4 Nov 2028), but the same page's "On track?" says "at that pace… about 17 Jun 2030" and the plan says "Projected completion 8 Aug 2028". |
| B-006 | AL-NUMBERS-SOURCE-011 | CHANGED | Sc | Emergency fund: AHEAD with pace forecast 7 Jan 2028 (target 4 Nov 2028), but the same page's "On track?" says "at that pace… about 17 Jun 2030" and the plan says "Projected completion 8 Aug 2028". |
| G-021 | AL-NUMBERS-SOURCE-011 | NOT REPLAYED | — | Need a contribution plan + target edit / a new plan on day 0; not set up. |
| G-014 | AL-NUMBERS-SOURCE-011 | NOT REPLAYED | — | Need a contribution plan + target edit / a new plan on day 0; not set up. |
| PR-024 | AL-NUMBERS-SOURCE-011 | STILL OPEN | Sc | Today and the pace card now agree (7 Jan 2028), but the goal page still shows three dates for one goal: 7 Jan 2028 (pace), 8 Aug 2028 (plan), 17 Jun 2030 ("On track?"). |
| N-PR-09 | AL-NUMBERS-SOURCE-011 | FIXED | Sc | All forecast dates read "7 Jan 2028" style. |
| DV-014 | AL-UNITS-004 | FIXED | D, DL | Count goal "books"/"pages": no ZIG default; Fund asks "How many books did you add?"; 3 books → 15 %, 40 pages → 13 %; no money value asked. |
| DV-034b | AL-UNITS-004 | FIXED | D, DL | Count goal "books"/"pages": no ZIG default; Fund asks "How many books did you add?"; 3 books → 15 %, 40 pages → 13 %; no money value asked. |
| DV-035 | AL-UNITS-004 | FIXED | D, DL | Count goal "books"/"pages": no ZIG default; Fund asks "How many books did you add?"; 3 books → 15 %, 40 pages → 13 %; no money value asked. |
| DV-103 | AL-UNITS-004 | FIXED | D, DL | Count goal "books"/"pages": no ZIG default; Fund asks "How many books did you add?"; 3 books → 15 %, 40 pages → 13 %; no money value asked. |
| DV-105 | AL-UNITS-004 | FIXED | DL | With a USD cash asset present, a count goal's "Choose Goal asset" offers only "Enter an asset symbol". |
| DV-123 | AL-UNITS-004 | FIXED | D, DL | Count goal "books"/"pages": no ZIG default; Fund asks "How many books did you add?"; 3 books → 15 %, 40 pages → 13 %; no money value asked. |
| DV-147 | AL-UNITS-004 | STILL OPEN | DL | Reverse direction now: the pages/books counter becomes a Wealth asset, and a USD goal's Fund dialog offers "T9 Count pages 0 available of 40 PAGES · Needs valuation"; Today Wealth tile counts it ("2 assets · 1 need attention"). Asset page not checked. |
| PR-055 | AL-UNITS-004 | NOT REPLAYED | Sc | Attempt (Quantity, asset "USD") did not complete; not reproduced either way. |
| B-058 | AL-XP-BADGES-009 | STILL OPEN | Sc | As PR-057: funding Emergency fund wrote "Target reached · goal completed · My first 0.1 BTC". |
| N-037 | AL-XP-BADGES-009 | STILL OPEN | Sc | As PR-057: funding Emergency fund wrote "Target reached · goal completed · My first 0.1 BTC". |
| B-092 | AL-XP-BADGES-009 | NOT REPLAYED | Sc | The seeded "Portfolio completed" row is not on the first Activity page; not paged further. |
| DV-025b | AL-XP-BADGES-009 | FIXED | D | Target 1000→50 with US$200 counted: "Your target is now at or below what is already counted, so this goal reads as reached. No celebration for an edit…". |
| DV-021c | AL-A11Y-014 | FIXED | D | The explanation now sits inside the menu; the "…" is a native <summary> (exposed as a disclosure button). |
| DV-038c | AL-A11Y-014 | FIXED | D | "Reverse history entry" is a secondary button, 45 px tall. |
| DV-040g | AL-A11Y-014 | NOT A DEFECT (status; unchanged, agreed) | D | Unchanged: headers are native <summary>, card ⋯ items are links in a disclosure (0 role=menuitem). Status calls this not a defect; I agree it is announced correctly, but it is no F/O decision. |
| DV-056c | AL-A11Y-014 | NOT A DEFECT (status; unchanged, agreed) | D | Unchanged: headers are native <summary>, card ⋯ items are links in a disclosure (0 role=menuitem). Status calls this not a defect; I agree it is announced correctly, but it is no F/O decision. |
| DV-047b | AL-A11Y-015 | FIXED | D | Activity Remove is named "Remove Drink water, 5 Nov 2026 · 2 of 2 liters · done" / "Remove Water: 250 mL, 5 Nov 2026". |
| DV-170 | AL-A11Y-015 | STILL OPEN | D | Remove on a Health row still deletes at once, same weight as the row, not in a ⋯ (Undo works). |
| BUG-049 | AL-A11Y-016 | STILL OPEN | Sc | /app/goals/new: focus stays on BODY; 46 Tabs to reach "Goal name". |
| D-210 | AL-A11Y-016 | FIXED | DL | Card ⋯ items no longer repeat the goal name. |
| D-029 | AL-A11Y-016 | STILL OPEN | Sc | First goal card has 5 tab stops: star, options, title, Details, Open Goal (star and options before the title). |
| G-043 | AL-A11Y-016 | STILL OPEN | Sc | Average goal value field is labelled by its unit only ("mL a day", "h a night"). |
| D-073 | AL-A11Y-016 | FIXED | Sc | No link name on Today has a raw float. |
| BUG-039 | AL-A11Y-016 | STILL OPEN | 375 | Settings at 375: three links 19 px tall. |
| M-091 | AL-A11Y-016 | STILL OPEN | Sc | Quick add opens with focus on "Close Quick add", not the input. |
| D-028 | AL-A11Y-016 | STILL OPEN | Sc | Showcase Today: 290 tab stops. |
| D-230 | AL-A11Y-016 | NOT REPLAYED | — | Motion select not found on the Settings page in this replay (L6). |
| D-031 | AL-A11Y-016 | FIXED | Sc | "Reset Showcase Demo" is a secondary button (focus-ring part not checked). |
| D-009 | AL-A11Y-016 | STILL OPEN | Sc | Health: 7 buttons with no text, aria-label or title (aria-labelledby not checked). |
| D-055 | AL-A11Y-016 | NOT REPLAYED | Sc | The asset-card ⋯ was not reached (first "Options for" on Wealth is the section menu). |
| D-203 | AL-A11Y-016 | FIXED | Sc | Habit ⋯: "Add check-in to Today · Add streak to Today · Archive habit… · Ask ZIGi about this habit" (no repeated title). |
| DV-047c | AL-ACTIVITY-002 | STILL OPEN | D | Health → Increase Push-ups: no Activity row; Health chip counts only the water log. |
| DV-054c | AL-ACTIVITY-002 | FIXED | D | Activity: "Average goal started · Sleep 7 hours a night · at least 7 h a night, over 14 days" and "Day logged · … 8 h a night". |
| DV-172 | AL-ACTIVITY-002 | FIXED | Sc | Showcase Activity lists "Night’s sleep recorded …"; the report counts "4 task updates". |
| DV-206 | AL-ACTIVITY-002 | CHANGED | D | Archive "Drink water": the Habit chip goes 1 → 2 and All 2 → 3, but no archive row is in the list (chips no longer match the rows). |
| C-DV-18 | AL-ACTIVITY-002 | FIXED | D | Activity: "Average goal started · Sleep 7 hours a night · at least 7 h a night, over 14 days" and "Day logged · … 8 h a night". |
| PR-065 | AL-ACTIVITY-002 | CHANGED | Sc | Sleep nights are listed now; expense/income entries are neither listed nor named in the footer ("Not listed here: journal entries and notes"). |
| N-011 | AL-ACTIVITY-003 | HOLDS | D | Own rows read "Added by you" / "Your goal’s history"; no "Showcase example" outside the Showcase. |
| G-034 | AL-ACTIVITY-003 | HOLDS | D | Own rows read "Added by you" / "Your goal’s history"; no "Showcase example" outside the Showcase. |
| D-084 | AL-ACTIVITY-003 | HOLDS | D | Own rows read "Added by you" / "Your goal’s history"; no "Showcase example" outside the Showcase. |
| N-170 | AL-ACTIVITY-003 | CHANGED | Sc | Showcase: one line "Showcase example history · fictional records" above the whole list, which now also covers the person's own new goals; seeded rows say "Added by you" exactly like the person's own. |
| N-073 | AL-ACTIVITY-003 | HOLDS | D | Own rows read "Added by you" / "Your goal’s history"; no "Showcase example" outside the Showcase. |
| T-086 | AL-ACTIVITY-003 | HOLDS | D | Own rows read "Added by you" / "Your goal’s history"; no "Showcase example" outside the Showcase. |
| PR-066 | AL-ACTIVITY-003 | CHANGED | Sc | Showcase: one line "Showcase example history · fictional records" above the whole list, which now also covers the person's own new goals; seeded rows say "Added by you" exactly like the person's own. |
| PR-099 | AL-ACTIVITY-003 | CHANGED | Sc | Showcase: one line "Showcase example history · fictional records" above the whole list, which now also covers the person's own new goals; seeded rows say "Added by you" exactly like the person's own. |
| C-DVG-04 | AL-COMPETITOR-GAP-113 | OWNER DECISION (agreed: F) | code | Automated payday/round-up rules need a bank link that moves money (F: non-custodial, no fake integrations). The 52-week part is built (DV-031c). |
| DV-031c | AL-COMPETITOR-GAP-113 | FIXED | D | 52-week template → goal page has a "52-week savings challenge" card: week 1 one step … week 52, "Your step (USD)", smallest/biggest week first. |
| DV-053a | AL-COMPETITOR-GAP-113 | FIXED | D | 52-week template → goal page has a "52-week savings challenge" card: week 1 one step … week 52, "Your step (USD)", smallest/biggest week first. |
| C-DV-06 | AL-COMPETITOR-GAP-113 | FIXED | D | 52-week template → goal page has a "52-week savings challenge" card: week 1 one step … week 52, "Your step (USD)", smallest/biggest week first. |
| DV-019e-1 | AL-COMPETITOR-GAP-114 | FIXED | D | ↑/↓ per milestone; moved "15 books" up; Activity "Milestones reordered". Insert-after = add then move. |
| DV-040a | AL-COMPETITOR-GAP-114 | FIXED | D | ↑/↓ per milestone; moved "15 books" up; Activity "Milestones reordered". Insert-after = add then move. |
| C-DV-12 | AL-COMPETITOR-GAP-114 | FIXED | D | ↑/↓ per milestone; moved "15 books" up; Activity "Milestones reordered". Insert-after = add then move. |
| DV-019e | AL-COMPETITOR-GAP-114 (also AL-FIELD-ERROR-011) | FIXED | D | ↑/↓ per milestone; moved "15 books" up; Activity "Milestones reordered". Insert-after = add then move. |
| C-DVG-03 | AL-COMPETITOR-GAP-115 | FIXED | Sc | Tree: 10 draggable nodes and "Put under" controls; hint "Drag a goal onto another, or use its ⋯ menu…". |
| DV-043c | AL-COMPETITOR-GAP-115 | CHANGED | Sc | Drag and "Put under" exist; no "Add a sub-goal" control was found in the Tree (0 matches). |
| C-DV-04 | AL-COMPETITOR-GAP-115 | FIXED | Sc | Tree: 10 draggable nodes and "Put under" controls; hint "Drag a goal onto another, or use its ⋯ menu…". |
| C-DV-05 | AL-COMPETITOR-GAP-115 | REASON CITED, NOT BUILT | code | One habit feeding several goals: the habit store has one goalLink (stored format); not built. |
| DV-019g | AL-COPY-033 | FIXED | D | Milestone habit links are folded; the panel lists milestones only. |
| DV-040f | AL-COPY-033 | FIXED | D | Project panel: "Tick a milestone when it is done." (no "reached" vs "done"). |
| BUG-015 | AL-COPY-034 | FIXED | D | Status log "Target reached · 5 Nov 2026 · every milestone done"; Activity milestone rows named ("Milestone ticked: “3 books”"). |
| G-027 | AL-COPY-034 | STILL OPEN | D | Project wizard: step 2 is empty ("Project / milestones. Only completed milestones count…"), step 3 says "only money you add counts toward the target" and offers "A recurring contribution plan can create a contribution habit". |
| G-029 | AL-COPY-034 | FIXED | D | No "reads reached once your recorded progress passes it" helper on a project. |
| G-030 | AL-COPY-034 | CHANGED | D, DL | No "Funding Wealth: No plan" row; project cards still carry a "NO PLAN" badge. |
| M-046 | AL-COPY-034 | STILL OPEN | D | Project wizard: step 2 is empty ("Project / milestones. Only completed milestones count…"), step 3 says "only money you add counts toward the target" and offers "A recurring contribution plan can create a contribution habit". |
| M-049 | AL-COPY-034 | FIXED | D | Status log "Target reached · 5 Nov 2026 · every milestone done"; Activity milestone rows named ("Milestone ticked: “3 books”"). |
| DV-015 | AL-COPY-034 | CHANGED | D | Count goal: "Your saving plan" replaces "Funding Wealth"; card still "NO PLAN"; parent dropdown not checked. |
| DV-018 | AL-COPY-034 | CHANGED | D, Sc | Plain: eyebrow "PROJECT", no Saving plan in the hero; but the project page keeps a "Wealth" module, "Wealth & contribution history", "Counted wealth" chart "Scale maximum: 1 USD". Showcase eyebrow still "PROJECT GOAL · PROJECT". |
| DV-022c-2 | AL-COPY-034 | FIXED | D, DL | Count card "Of the way there"; project card "Of your journey complete". |
| DV-034a | AL-COPY-034 | STILL OPEN | D | Books goal: hero "COUNTED SO FAR" ok, but "Saving plan · No saving plan yet", eyebrow "COUNT GOAL · MONEY YOU HAVE" after funding, panel "Still to fund 17 books · From counted wealth", "Market movement can change wealth"; wizard step 2 "Count money I already have", steps 3–4 "only money you add counts toward the target", review "0 BOOKS"; Fund preview "Your tracked asset balance increases by 3 BOOKS". |
| DV-040c | AL-COPY-034 | STILL OPEN | D | Project page still has the "Wealth" module and the wealth chart (no Saving plan / Contribution plan module now). |
| DV-041b | AL-COPY-034 | CHANGED | D | Status log fixed ("every milestone done"); the project timeline still reads "Counted Goal value snapshot 0 USD · private snapshot". |
| DV-057b | AL-COPY-034 | CHANGED | D | Today featured goal reads "Savings goal" (no "Funding Wealth"), but the books goal reads "Next: set a contribution plan". |
| DV-104 | AL-COPY-034 | STILL OPEN | D | Books goal: hero "COUNTED SO FAR" ok, but "Saving plan · No saving plan yet", eyebrow "COUNT GOAL · MONEY YOU HAVE" after funding, panel "Still to fund 17 books · From counted wealth", "Market movement can change wealth"; wizard step 2 "Count money I already have", steps 3–4 "only money you add counts toward the target", review "0 BOOKS"; Fund preview "Your tracked asset balance increases by 3 BOOKS". |
| MO-120 | AL-COPY-034 | CHANGED | D | Unit can be any word ("books"); template Read 12 books is a count goal; the money copy of DV-034a remains. |
| MO-122 | AL-COPY-034 | FIXED | D | Project hero has no Saving plan; the milestone error names the line; Fund dialog says "No money moves." |
| MO-127 | AL-COPY-034 | FIXED | D | Project hero has no Saving plan; the milestone error names the line; Fund dialog says "No money moves." |
| NB-098 | AL-COPY-034 | CHANGED | D | Status log fixed ("every milestone done"); the project timeline still reads "Counted Goal value snapshot 0 USD · private snapshot". |
| NB-174 | AL-COPY-034 | STILL OPEN | D | Project page: "Wealth & contribution history", "Scale maximum: 1 USD", "Counted Goal value snapshot 0 USD" (USD instead of ZIG now). |
| NB-243 | AL-COPY-034 | CHANGED | D | "Read 12 books" is now a count goal, and its hero shows "Saving plan · No saving plan yet". |
| N-NB-23 | AL-COPY-034 | NOT REPLAYED | — | Reward goal (chain) not created. |
| DV-022c | AL-COPY-034 | FIXED | D, DL | Count card "Of the way there"; project card "Of your journey complete". |
| DV-007b | AL-COPY-035 | STILL OPEN | D | "Goal" capitalised mid-sentence remains: "Give your Goal a name.", "What counts toward this Goal?", "A rhythm that supports your Goal.", "Fund your Goal". |
| DV-008b | AL-COPY-035 | FIXED | D | Kind stays "SAVINGS GOAL" through history and funding (second word follows the source: "YOUR OWN PLAN" → "MONEY YOU HAVE"). |
| DV-013 | AL-COPY-035 | OWNER DECISION (agreed: F) | D, Sc | Fresh profile: plain set (Save an amount / Reach a number / Finish a project) every time; Showcase (chain chosen): Quantity / Value / Reward / Project. F: crypto words where people chose those modules. |
| DV-039a | AL-COPY-035 | CHANGED | D | Card and detail say "Count goal"/"Savings goal"/"Project"; the wizard still says "Reach a number of something"/"Save an amount"/"Finish a project"; Keep an average is reached from the list ⋯, not the wizard. |
| DV-049c | AL-COPY-035 | CHANGED | D | Card and detail say "Count goal"/"Savings goal"/"Project"; the wizard still says "Reach a number of something"/"Save an amount"/"Finish a project"; Keep an average is reached from the list ⋯, not the wizard. |
| DV-120 | AL-COPY-035 | NOT REPLAYED | Sc | Chain-mode preselection not recorded (plain mode preselects "Save an amount"). |
| MO-130 | AL-COPY-035 | CHANGED | D | Card and detail say "Count goal"/"Savings goal"/"Project"; the wizard still says "Reach a number of something"/"Save an amount"/"Finish a project"; Keep an average is reached from the list ⋯, not the wizard. |
| MO-146 | AL-COPY-035 | OWNER DECISION (agreed: F) | D, Sc | Fresh profile: plain set (Save an amount / Reach a number / Finish a project) every time; Showcase (chain chosen): Quantity / Value / Reward / Project. F: crypto words where people chose those modules. |
| B-114 | AL-COPY-036 | STILL OPEN | Sc | My first 0.1 BTC, Completed 100 %, still shows "Projected completion 5 Nov 2026". |
| D-039 | AL-COPY-036 | CHANGED | D | "Funding Wealth" gone off-chain ("Your saving plan"); mid-sentence "Goal" capitals remain. |
| D-103 | AL-COPY-036 | FIXED | D | Reverse dialog: "Reverse 2 books recorded at 5 Nov 2026, 04:08… This entry was history only, so progress does not change." No raw id. |
| D-187 | AL-COPY-036 | NOT REPLAYED | — | Cross-page empty-state voice / valuation labels: no concrete step to replay. |
| N-167 | AL-COPY-036 | NOT REPLAYED | — | Cross-page empty-state voice / valuation labels: no concrete step to replay. |
| D-097 | AL-COPY-036 | FIXED | DL | The status filter stays on the view switch (Active stays pressed on Vision board). |
| L-039 | AL-COPY-036 | FIXED | D | Reverse dialog: "Reverse 2 books recorded at 5 Nov 2026, 04:08… This entry was history only, so progress does not change." No raw id. |
| N-144 | AL-COPY-036 | CHANGED | D | "Funding Wealth" gone off-chain ("Your saving plan"); mid-sentence "Goal" capitals remain. |
| DV-007a | AL-COPY-036 | STILL OPEN | D | Count goal page repeats "3 books of 20 books / 17 remaining" in the hero and again in "Your saving plan" and the panel. |
| DV-007c | AL-COPY-036 | NOT REPLAYED | Sc | Life-area chip selection state not checked. |
| DV-022e | AL-COPY-036 | STILL OPEN | DL | "WITH A PLAN · why and if-then written" unchanged (status: not changed, pinned). |
| DV-026c | AL-COPY-036 | FIXED | D | "Your assets, accounts and habits stay. You can undo this right after." |
| DV-033e | AL-COPY-036 | STILL OPEN | D | Plan form still has "Price per Goal unit in contribution currency (if different)"; plan-history.tsx still headed "Retained plan terms" (COPY_AUDIT §4 says applied). |
| DV-038a | AL-COPY-036 | FIXED | D | Reverse dialog: "Reverse 2 books recorded at 5 Nov 2026, 04:08… This entry was history only, so progress does not change." No raw id. |
| DV-038b | AL-COPY-036 | FIXED | D | Reverse dialog: "Reverse 2 books recorded at 5 Nov 2026, 04:08… This entry was history only, so progress does not change." No raw id. |
| X3-19 | AL-COPY-036 | STILL OPEN | D | "Goal" capitalised mid-sentence remains: "Give your Goal a name.", "What counts toward this Goal?", "A rhythm that supports your Goal.", "Fund your Goal". |
| DV-039c | AL-COPY-037 | FIXED | D | Life balance "Wealth 5% toward targets · 3 records this month"; empty areas "Nothing here yet". |
| DV-058c | AL-COPY-037 | FIXED | D | Life balance "Wealth 5% toward targets · 3 records this month"; empty areas "Nothing here yet". |
| N-DV-01 | AL-COPY-037 | FIXED | D | Life balance "Wealth 5% toward targets · 3 records this month"; empty areas "Nothing here yet". |
| DV-020a | AL-COPY-038 | FIXED | D | Hall: "Every goal you finish keeps its place here." (no "write a line" promise). |
| DV-058b | AL-COPY-038 | FIXED | D | Hall: "Every goal you finish keeps its place here." (no "write a line" promise). |
| DV-005 | AL-COPY-039 | FIXED | D, Sc | Review: "Progress source · What you save from now on" / "Nothing chosen yet"; target "US$1,000.00". |
| DV-006 | AL-COPY-039 | STILL OPEN | D | Emergency fund idea, preview caption still "Save an amount · USD · Emergency Fund · At your own pace". |
| DV-122 | AL-COPY-039 | FIXED | D | "Reach a number of something · Custom · At your own pace" (no empty slot). |
| PR-091 | AL-COPY-039 | FIXED | D, Sc | Review: "Progress source · What you save from now on" / "Nothing chosen yet"; target "US$1,000.00". |
| X3-18 | AL-COPY-039 | FIXED | D, Sc | Review: "Progress source · What you save from now on" / "Nothing chosen yet"; target "US$1,000.00". |
| TK-142 | AL-COPY-039 | CHANGED | D | Review formatted, but the live preview still says "1000 USD". The cited ADR-023 C25 is not an AL_SCOPE F/O decision. |
| N-185 | AL-COPY-040 | NOT REPLAYED | — | Bot text too short to replay (idea cards / seed wording); ideas now are library entries. |
| BUG-013 | AL-COPY-040 | HOLDS | D | Preview never shows an unchosen template. |
| M-048 | AL-COPY-040 | NOT REPLAYED | — | Bot text too short to replay (idea cards / seed wording); ideas now are library entries. |
| N-071 | AL-COPY-040 | NOT REPLAYED | — | Bot text too short to replay (idea cards / seed wording); ideas now are library entries. |
| N-205 | AL-COPY-040 | NOT REPLAYED | — | Bot text too short to replay (idea cards / seed wording); ideas now are library entries. |
| DV-039b | AL-COPY-040 | FIXED | D | Read 12 books → "Reach a number of something", 12 BOOKS. |
| DV-053c | AL-COPY-040 | CHANGED | D | Chess: card says "write the number into the last step"; still no rating field. |
| DV-083a | AL-COPY-040 | FIXED | D | Ideas = library titles (Holiday fund, Read 12 books, Reach a chess rating, Learn a language with 4 steps); "Browse all 53 templates". |
| DV-176 | AL-COPY-040 | FIXED | D | Ideas = library titles (Holiday fund, Read 12 books, Reach a chess rating, Learn a language with 4 steps); "Browse all 53 templates". |
| DV-177 | AL-COPY-040 | FIXED | D | Empty target placeholder "Your amount in USD". |
| DV-178 | AL-COPY-040 | FIXED | D | Card reworded: "Steps toward the rating you choose; write the number into the last step." |
| DV-179 | AL-COPY-040 | FIXED | D | Ideas = library titles (Holiday fund, Read 12 books, Reach a chess rating, Learn a language with 4 steps); "Browse all 53 templates". |
| DV-182 | AL-COPY-040 | FIXED | D | "3/6/9/12 date nights", "Spring dinner…", strength "Week 1/4/8/12"; debt-free "List my debts / Choose a payoff order…". |
| DV-183 | AL-COPY-040 | FIXED | D | Ideas = library titles (Holiday fund, Read 12 books, Reach a chess rating, Learn a language with 4 steps); "Browse all 53 templates". |
| DV-184 | AL-COPY-040 | FIXED | D | Spend cap: "Write your own cap per day, in your currency…"; At least / At most shown. |
| DV-185 | AL-COPY-040 | FIXED | D | "3/6/9/12 date nights", "Spring dinner…", strength "Week 1/4/8/12"; debt-free "List my debts / Choose a payoff order…". |
| DV-012c | AL-COPY-041 | FIXED | D | "Keep it steady" eyebrow; detail "Keep an average · over 14 days". |
| DV-012d | AL-COPY-041 | CHANGED | D | Form lede says Health feeds a measure it records; the detail still says only "From your own entries". |
| DV-052c | AL-COPY-041 | FIXED | D | Target over the measure refused ("Enter hours of sleep from 0 to 24 hours."), so title and target cannot drift; no "fifth kind". |
| G-035 | AL-COPY-042 | FIXED | D | Activity: "Milestone ticked: “3 books”", "Milestone added/removed: “…”", "Milestones reordered". |
| DV-036a | AL-COPY-042 | FIXED | D | Idea "Holiday fund" creates "Holiday fund"; Activity uses the same name. |
| DV-036b | AL-COPY-042 | CHANGED | D | Row "Goal created · Emergency fund · target US$50.00": it shows the target after a later edit (created at US$1,000). |
| DV-046b | AL-COPY-042 | FIXED | D | Activity: "Milestone ticked: “3 books”", "Milestone added/removed: “…”", "Milestones reordered". |
| DV-046c | AL-COPY-042 | FIXED | D | Subtitles "Added by you", "Your goal’s history". |
| DV-047a | AL-COPY-042 | FIXED | D | "Drink water · 5 Nov 2026 · 2 of 2 liters · done". |
| DV-089 | AL-COPY-042 | NOT REPLAYED | — | NOVA workflow goals (L7) not run. |
| DV-112 | AL-COPY-042 | FIXED | D | Activity: "Milestone ticked: “3 books”", "Milestone added/removed: “…”", "Milestones reordered". |
| DV-171 | AL-COPY-042 | NOT REPLAYED | D | Quit habit not added (only Drink water); "500 / 2000" case not set up. |
| DV-207 | AL-COPY-042 | NOT REPLAYED | D | Quit habit not added (only Drink water); "500 / 2000" case not set up. |
| D-156 | AL-COPY-042 | FIXED | D | "Contribution correction · DV Count books · −2 books". |
| BUG-014 | AL-COPY-043 | HOLDS | D | Step 3 has the weekly review habit checkbox. |
| D-008 | AL-COPY-043 | STILL OPEN | D | Steps still "Purpose · Optional sources · Optional Habit · Review"; the cited "four steps stay" is not an AL_SCOPE F decision. |
| D-027 | AL-COPY-043 | FIXED | D | "Cancel and go back" on every step (scroll position not checked). |
| N-154 | AL-COPY-043 | NOT REPLAYED | — | Bot text too short to replay. |
| T-014 | AL-COPY-043 | CHANGED | D | Still four steps, but Create goal works from step 1. |
| G-040 | AL-COPY-043 | STILL OPEN | D | Gallery says "Milestones goal" (38) / "Savings goal" / "Count goal"; wizard says "Finish a project" / "Save an amount" / "Reach a number of something"; cards say "Project". |
| G-047 | AL-COPY-043 | CHANGED | D | Card and detail say "Count goal"/"Savings goal"/"Project"; the wizard still says "Reach a number of something"/"Save an amount"/"Finish a project"; Keep an average is reached from the list ⋯, not the wizard. |
| N-159 | AL-COPY-043 | NOT REPLAYED | — | Bot text too short to replay. |
| D-165 | AL-COPY-043 | HOLDS | D | Step 3 has the weekly review habit checkbox. |
| D-171 | AL-COPY-044 | FIXED | D | Chips show counts; today's rows have times (but see DV-206: one chip out of step). |
| D-227 | AL-COPY-044 | CHANGED | Sc | "Showcase example" said once above the list (see PR-066); no search/export (P-DV-81, Later). |
| D-234 | AL-COPY-044 | NOT REPLAYED | — | Showcase day grouping needs paging back to Oct; not done. |
| T-113 | AL-COPY-044 | HOLDS | D | Junk rows removable (Remove / Reverse on its goal →). |
| C-DVG-17 | AL-COPY-044 | REASON CITED, NOT BUILT | D | Still no search, date filter or CSV export in Activity (status: Later, P-DVG-17; not an F decision). Period report exists. |
| DV-046e | AL-COPY-044 | REASON CITED, NOT BUILT | D | Still no search, date filter or CSV export in Activity (status: Later, P-DVG-17; not an F decision). Period report exists. |
| DV-054d | AL-COPY-044 | REASON CITED, NOT BUILT | D | Still no search, date filter or CSV export in Activity (status: Later, P-DVG-17; not an F decision). Period report exists. |
| C-DV-13 | AL-COPY-044 | REASON CITED, NOT BUILT | D | Still no search, date filter or CSV export in Activity (status: Later, P-DVG-17; not an F decision). Period report exists. |
| C-DV-17 | AL-COPY-044 | FIXED | Sc | Showcase Activity shows the first page with more behind it ("Show more"). |
| PR-100 | AL-COPY-044 | REASON CITED, NOT BUILT | D | Still no search, date filter or CSV export in Activity (status: Later, P-DVG-17; not an F decision). Period report exists. |
| DV-046d | AL-COUNTS-008 | FIXED | D | Contributions stay under Goal; the hero card "Goals & contributions · Plans, funding and corrections" says so; asset rows count under Wealth (Wealth · 2). |
| DV-115 | AL-COUNTS-008 | NOT REPLAYED | — | Needs a ZIGi check-in later removed (L7); not set up. |
| DV-169 | AL-COUNTS-008 | STILL OPEN | D | After archiving a habit: chips All · 3 / Habit · 2 while the list shows 2 rows (1 habit). (Remove + Undo kept chips = rows.) |
| L-055 | AL-COUNTS-009 | FIXED | Sc | Tree: "Launch my creative studio 50% on its own · 0 of 1 sub-goal done"; empty tree says how to add sub-goals. |
| G-012 | AL-COUNTS-009 | FIXED | Sc | Tree: "Launch my creative studio 50% on its own · 0 of 1 sub-goal done"; empty tree says how to add sub-goals. |
| M-050 | AL-COUNTS-009 | FIXED | Sc | Tree: "Launch my creative studio 50% on its own · 0 of 1 sub-goal done"; empty tree says how to add sub-goals. |
| BN-156 | AL-CURRENCY-004 | FIXED | Sc | EUR goal, step 2, pick "USD cash reserve": "Valued in USD; this goal counts EUR. ZIGoals never converts between currencies, so it adds no value here. Choose a EUR asset, or change the goal’s currency." |
| MO-145 | AL-CURRENCY-004 | FIXED | Sc | EUR goal, step 2, pick "USD cash reserve": "Valued in USD; this goal counts EUR. ZIGoals never converts between currencies, so it adds no value here. Choose a EUR asset, or change the goal’s currency." |
| MO-160 | AL-CURRENCY-004 | NOT REPLAYED | Sc | Card with an included USD source / allocation from the asset page not set up. |
| X3-15 | AL-CURRENCY-004 | NOT REPLAYED | Sc | Card with an included USD source / allocation from the asset page not set up. |
| X3-28 | AL-CURRENCY-004 | FIXED | Sc | EUR goal, step 2, pick "USD cash reserve": "Valued in USD; this goal counts EUR. ZIGoals never converts between currencies, so it adds no value here. Choose a EUR asset, or change the goal’s currency." |
| BN-146 | AL-DATES-006 | FIXED | D | Edit details deadline 2020-01-01 → "Choose today or a later date for the deadline." |
| G-005 | AL-DATES-006 | FIXED | D | Edit details deadline 2020-01-01 → "Choose today or a later date for the deadline." |
| L-079 | AL-DATES-006 | FIXED | D | Wizard date max is bounded (goalDateMax); past date refused. |
| M-102 | AL-DATES-006 | FIXED | D | Edit details deadline 2020-01-01 → "Choose today or a later date for the deadline." |
| DV-019d | AL-DATES-006 | FIXED | D | Add milestone with 2020-01-01 → "Choose today or a later day for the milestone." |
| DV-025f | AL-DATES-006 | FIXED | D | Edit details deadline 2020-01-01 → "Choose today or a later date for the deadline." |
| DV-010a | AL-DISCOVERABILITY-002 | STILL OPEN | D | Fund Goal → Cash: "Asset name / Cash amount 200" → Continue → "Contribution quantity (USD)" asks the amount again. |
| DV-010c | AL-DISCOVERABILITY-002 | CHANGED | D | Own-unit goals are one step ("How many books did you add?"); money goals keep the asset-kind step and the second amount. |
| DV-101 | AL-DISCOVERABILITY-002 | STILL OPEN | D | Fund Goal → Cash: "Asset name / Cash amount 200" → Continue → "Contribution quantity (USD)" asks the amount again. |
| NB-253 | AL-DISCOVERABILITY-002 | CHANGED | D | Own-unit goals are one step ("How many books did you add?"); money goals keep the asset-kind step and the second amount. |
| MO-126 | AL-FEATURE-GAP-002 | NOT REPLAYED | — | "Link a habit you already have" needs an existing habit on a goal page; not run. |
| G-004 | AL-FIELD-ERROR-011 | NOT REPLAYED | — | Duplicate goal names not tried. |
| L-024 | AL-FIELD-ERROR-011 | FIXED | D | Duplicates refused in the wizard and the panel ("This Goal already has a milestone called “6 books”…"). |
| DV-016b | AL-FIELD-ERROR-011 | FIXED | D | Duplicates refused in the wizard and the panel ("This Goal already has a milestone called “6 books”…"). |
| DV-019e-2 | AL-FIELD-ERROR-011 | FIXED | D | Duplicates refused in the wizard and the panel ("This Goal already has a milestone called “6 books”…"). |
| DV-109 | AL-FIELD-ERROR-011 | FIXED | D | Duplicates refused in the wizard and the panel ("This Goal already has a milestone called “6 books”…"). |
| TK-146 | AL-HELP-001 | STILL OPEN | Sc | Help has no line on Reward goals (status: sent to L6). |
| DV-012e | AL-LAYOUT-DESKTOP-009 | FIXED | D | Average page uses the full width (overview 1490 px; entry and settings side by side). |
| DV-022f | AL-NAV-004 | FIXED | DL | Active stays selected after Cards → Vision board. |
| L-066 | AL-NUMBERS-SOURCE-012 | NOT REPLAYED | — | Change artwork not exercised. |
| BUG-019 | AL-NUMBERS-SOURCE-012 | FIXED | DL | Same picture on Cards and Vision board (Emergency fund: chest; pages goal: greenhouse); no blank gradient. (screenshots dv022a) |
| D-208 | AL-NUMBERS-SOURCE-012 | FIXED | DL | Same picture on Cards and Vision board (Emergency fund: chest; pages goal: greenhouse); no blank gradient. (screenshots dv022a) |
| DV-022a | AL-NUMBERS-SOURCE-012 | FIXED | DL | Same picture on Cards and Vision board (Emergency fund: chest; pages goal: greenhouse); no blank gradient. (screenshots dv022a) |
| DV-043b | AL-NUMBERS-SOURCE-012 | FIXED | DL | Same picture on Cards and Vision board (Emergency fund: chest; pages goal: greenhouse); no blank gradient. (screenshots dv022a) |
| BN-092 | AL-PERF-004 | NOT REPLAYED | — | Calculator / staking-calculator typing not replayed. |
| BN-135 | AL-PERF-004 | NOT REPLAYED | — | Calculator / staking-calculator typing not replayed. |
| BN-153 | AL-PERF-004 | STILL OPEN | D, Sc | Not only under load: on an idle page (waited 1.5 s and 6 s) typing "Berlin" at 120 ms/key into Goal name gives "erlin"; the first fill of Target or Name on a freshly opened wizard is dropped (5 of 5 tries). Status claims "Not possible". |
| BN-188 | AL-PERF-004 | STILL OPEN | D, Sc | Not only under load: on an idle page (waited 1.5 s and 6 s) typing "Berlin" at 120 ms/key into Goal name gives "erlin"; the first fill of Target or Name on a freshly opened wizard is dropped (5 of 5 tries). Status claims "Not possible". |
| BN-189 | AL-PERF-004 | NOT REPLAYED | — | Checklist Quick add (L5) not replayed. |
| D-038 | AL-PERF-005 | NOT REPLAYED | Sc | Inconclusive: the label read right after the click was still "Create goal" while navigation took ~1–2 s under machine load. |
| T-063 | AL-PERF-005 | NOT REPLAYED | Sc | Inconclusive: the label read right after the click was still "Create goal" while navigation took ~1–2 s under machine load. |
| B-056 | AL-PERSISTENCE-008 | STILL OPEN | Sc | The link carries contribution=600&every=monthly, but the review says "Planned contributions · None". |
| B-045 | AL-PERSISTENCE-008 | FIXED | Sc | Calculator link target=100277.98 = result $100,277.98; wizard target 100277.98. |
| B-178 | AL-SEARCH-003 | FIXED | Sc | Search "Launch my creative studio" finds the goal. |
| BUG-064 | AL-SEARCH-003 | FIXED | DL, Sc | Goals list has "Search Goals" and "Sort Goals" (name, progress, target date). |
| D-079 | AL-SEARCH-003 | NOT REPLAYED | Sc | Wealth find / long global query / Markets find not completed (selector failed). |
| D-093 | AL-SEARCH-003 | NOT REPLAYED | Sc | Wealth find / long global query / Markets find not completed (selector failed). |
| D-051 | AL-SEARCH-003 | NOT REPLAYED | Sc | Wealth find / long global query / Markets find not completed (selector failed). |
| DV-022b | AL-SEARCH-003 | CHANGED | DL | Search + sort + a fuller list ⋯ now; no group-by area. |
| DV-043d | AL-SEARCH-003 | FIXED | DL, Sc | Goals list has "Search Goals" and "Sort Goals" (name, progress, target date). |
| C-DV-11 | AL-SEARCH-003 | FIXED | DL, Sc | Goals list has "Search Goals" and "Sort Goals" (name, progress, target date). |
| DV-019a | AL-TOAST-007 | STILL OPEN | D | Remove milestone: no confirm; the Undo toast disappears after 8.1 s (fix line asks ≥ 10 s); Undo is keyboard-reachable. |
| DV-019f-2 | AL-TOAST-007 | FIXED | D | Tick toast "Milestone done: “3 books”." |
| DV-025i | AL-TOAST-007 | FIXED | D | "Goal details saved.", "Milestone added: “…”." — no "Private Goal saved". |
| DV-026b | AL-TOAST-007 | FIXED | D | "Deleted “DV Read project”." + Undo (restored). |
| DV-040h | AL-TOAST-007 | STILL OPEN | D | Remove milestone: no confirm; the Undo toast disappears after 8.1 s (fix line asks ≥ 10 s); Undo is keyboard-reachable. |
| DV-111 | AL-TOAST-007 | FIXED | D | Remove → Undo (keyboard Enter) restored the milestone. |
| DV-019f | AL-TOAST-007 | FIXED | D | "1 milestone of 4 milestones". |
| DV-099 | AL-UNDO-004 | FIXED | DL | Close → Reopen: "Goal reopened. Closing freed what it counted; add it again under Wealth on this page. · Add it again". |
| B-115 | AL-CHARTS-001 | FIXED | Sc | Value charts "Scale minimum: 0 USD"; project "0 milestones". |
| G-017 | AL-CHARTS-001 | STILL OPEN | Sc, D | Launch my creative studio (4 milestones): "Scale maximum: 3 milestones". A plain project chart reads "Scale maximum: 1 USD". |
| N-080 | AL-CHARTS-001 | FIXED | Sc | Value charts "Scale minimum: 0 USD"; project "0 milestones". |
| T-011 | AL-COMPETITOR-GAP-116 | OWNER DECISION (agreed: F) | code | F: household/shared goals and accountability partners are not now. |
| T-017 | AL-COMPETITOR-GAP-116 | OWNER DECISION (agreed: F) | code | F: household/shared goals and accountability partners are not now. |
| C-DVG-05 | AL-COMPETITOR-GAP-116 | OWNER DECISION (agreed: F) | code | F: household/shared goals and accountability partners are not now. |
| DV-017 | AL-COPY-045 | CHANGED | D | The picture follows the goal (wizard says so); the Category list is still money-only (stored enum). |
| DV-031e | AL-COPY-045 | CHANGED | D | The picture follows the goal (wizard says so); the Category list is still money-only (stored enum). |
| DV-117 | AL-FIRST-RUN-009 | NOT REPLAYED | D | The 0-count chips could not be clicked in this replay (possibly disabled now); the per-filter copy was not seen. |
| DV-029d | AL-LAYOUT-DESKTOP-010 | NOT REPLAYED | — | No average card next to a value card at 1920 in this replay (lane: not changed). |
| DV-204 | AL-LAYOUT-DESKTOP-010 | STILL OPEN | DL | 1920: "+ Create a goal" floats mid-header right of the intro (screenshot dv022a-cards). |
| DV-246 | AL-LAYOUT-DESKTOP-010 | NOT REPLAYED | — | 768 not replayed. |
| DV-033b | AL-LAYOUT-DESKTOP-011 | FIXED | D | 1920 plan form: four fields in a row, Cadence inline on its own row, Active plan and the buttons below. |
| T-094 | AL-LAYOUT-DESKTOP-012 | FIXED | D | Fund dialog scrollWidth 818 = clientWidth 818. |
| D-196 | AL-LAYOUT-DESKTOP-012 | FIXED | Sc | Governance, Ecosystem, Portfolio, Goals, Wealth content all 954 px wide (Dark). |
| T-070 | AL-LAYOUT-DESKTOP-012 | NOT REPLAYED | — | No long asset name set up. |
| PR-060 | AL-LAYOUT-DESKTOP-013 | NOT REPLAYED | Sc | Art/type-picker measurement failed in the script. |
| DV-036d | AL-NAV-005 | FIXED | D | Hero cards are buttons with aria-pressed that filter the list. |
| C-DVG-01 | AL-COMPETITOR-GAP-117 | FIXED | Sc | "On track?" gives the catch-up pace ("about US$105.48 a week… to reach it by 4 Nov 2028"); pace forecast after 3 steps. |
| C-DV-01 | AL-COMPETITOR-GAP-117 | FIXED | Sc | "On track?" gives the catch-up pace ("about US$105.48 a week… to reach it by 4 Nov 2028"); pace forecast after 3 steps. |
| C-DVG-02 | AL-COMPETITOR-GAP-118 | REASON CITED, NOT BUILT | code | Keep an average still not in the wizard (list ⋯ "Keep an average…"); SMART wizard Later — "four steps stay" is not an F decision. |
| C-DV-02 | AL-COMPETITOR-GAP-118 | FIXED | D, DL | Count goal "books"/"pages": no ZIG default; Fund asks "How many books did you add?"; 3 books → 15 %, 40 pages → 13 %; no money value asked. |
| C-DV-03 | AL-COMPETITOR-GAP-118 | REASON CITED, NOT BUILT | code | Keep an average still not in the wizard (list ⋯ "Keep an average…"); SMART wizard Later — "four steps stay" is not an F decision. |
| C-DVG-06 | AL-COMPETITOR-GAP-119 | FIXED | Sc | Goals "Paying down debts": Car loan 29 % paid down, "Paid off by Jun 2028 (projection)", interest saved line. |
| C-DV-07 | AL-COMPETITOR-GAP-119 | FIXED | Sc | Goals "Paying down debts": Car loan 29 % paid down, "Paid off by Jun 2028 (projection)", interest saved line. |
| C-DVG-09 | AL-COMPETITOR-GAP-120 | REASON CITED, NOT BUILT | code | Goal reminders sent to L6 (lib/reminders); not checked. |
| C-DVG-10 | AL-COMPETITOR-GAP-121 | REASON CITED, NOT BUILT | code | Partly built (congrats message, h/min); import stays the Switch importers. |
| C-DV-09 | AL-COMPETITOR-GAP-121 | NOT REPLAYED | code | Congrats form exists only on active goals (tracked-detail.tsx); not opened in the UI. |
| C-DV-10 | AL-COMPETITOR-GAP-121 | FIXED | D | The Hall no longer promises a "write a line" step (copy defect closed). |
| C-DVG-11 | AL-COMPETITOR-GAP-122 | FIXED | D, Sc | Activity "Your report": This week/month/year/All time, goal days in a row, goal steps per week (12 weeks), habits by streak, perfect weeks. |
| C-DV-16 | AL-COMPETITOR-GAP-122 | FIXED | D, Sc | Activity "Your report": This week/month/year/All time, goal days in a row, goal steps per week (12 weeks), habits by streak, perfect weeks. |
| C-DVG-12 | AL-COMPETITOR-GAP-123 | REASON CITED, NOT BUILT | code | Weekly recap sent to L6; not checked. |
| C-DV-14 | AL-COMPETITOR-GAP-123 | REASON CITED, NOT BUILT | code | Weekly recap sent to L6; not checked. |
| C-DVG-13 | AL-COMPETITOR-GAP-124 | FIXED | D, Sc | Activity "Your report": This week/month/year/All time, goal days in a row, goal steps per week (12 weeks), habits by streak, perfect weeks. |
| C-DV-15 | AL-COMPETITOR-GAP-124 | FIXED | D, Sc | Activity "Your report": This week/month/year/All time, goal days in a row, goal steps per week (12 weeks), habits by streak, perfect weeks. |
| C-DVG-14 | AL-COMPETITOR-GAP-125 | FIXED | D, Sc | Activity "Your report": This week/month/year/All time, goal days in a row, goal steps per week (12 weeks), habits by streak, perfect weeks. |
## COPY_AUDIT.md rows owned by L4 — is the new copy live?

Checked on the screens above (D / DL / Sc).

| COPY_AUDIT row (file) | live? | what the page shows |
|---|---|---|
| §2 `lib/goal-summary.ts` formatGoalAmount ("20 books", "1 milestone") | PARTLY | Hero, card and Activity say "3 books", "1 milestone of 4 milestones". The wizard preview ("20 BOOKS"), review ("0 BOOKS"), Fund preview ("✧ 3 BOOKS … increases by 3 BOOKS") and the panel ("2 BOOKS") still use the upper-case symbol. |
| §2 `lib/goals/goal-amount.ts` messages | LIVE (part checked) | History-only 0 → "Enter an amount above 0." (other messages are L10b's rows). |
| §2 tracked-detail Delete confirm | LIVE | "Delete this goal? The goal, its plan and the history kept with it are removed. Your assets, accounts and habits stay. You can undo this right after." |
| §2 tracked-detail Close confirm | LIVE | "Close this goal? It leaves your active goals. Its history stays, and you can reopen it. Money counted toward it is freed for other goals; nothing moves." |
| §2 Delete reason inside the menu | NOT SEEN | Delete was enabled in every case replayed (only a locked goal shows the reason). |
| §2 toasts | LIVE | "Goal closed. Its history stays, and you can reopen it." / "Goal reopened. It starts a new cycle." / "Deleted “…”." + Undo / "Milestone done: “…”." / "Milestone added: “…”." / "Goal details saved." |
| §2 hero "Counted so far" | LIVE | Books goal hero "COUNTED SO FAR 0 books of 20 books". (The eyebrow turns "COUNT GOAL · MONEY YOU HAVE" after funding.) |
| §2 Project: Saving plan hidden | PARTLY | Hidden in the hero; the project page still has the "Wealth" module, "Wealth & contribution history" and a "Scale maximum: 1 USD" chart. |
| §2 Edit details messages | LIVE (deadline) | "Choose today or a later date for the deadline." (empty name not tried). |
| §2 plan-history status log | LIVE | "Target reached · 5 Nov 2026, 04:03 · every milestone done". |
| §2 goal-intelligence history-only line | LIVE | "Includes 2 books recorded as history only, which never changes progress". |
| §2 contribution-flow own unit | LIVE | "How many books did you add?", "Add the books you finished. They count toward this Goal right away." |
| §2 goal-card chips / "Of the way there" | LIVE | "Savings goal", "Count goal", "Project"; "Of the way there" on the count card. |
| §2 wizard (milestone line errors, review source, no empty slot, banner on step 1) | LIVE (banner not checked) | "Milestone 2 is 150 characters long; use at most 100.", "Milestones 1 and 3 have the same name…", "Nothing chosen yet · add it on the goal’s page", "What you save from now on", "Completed milestones". |
| §2 wizard weight idea | LIVE | "A weight goal ↗ · Opens the Health goal form with Weight chosen…". |
| §2 goal-milestones messages | LIVE | "Give the milestone a name.", "This Goal already has a milestone called “6 books”…", "Choose today or a later day for the milestone." |
| §2 achievements-hall | LIVE | "Every goal you finish keeps its place here." |
| §2 average-goals | LIVE | "Keep it steady"; "Remove “Sleep 7 hours a night”? Its one entered day goes with it. Health records stay. You can undo this right after." |
| §2 balance-wheel / life-balance | LIVE | "Wealth 5% toward targets · 3 records this month"; empty areas "Nothing here yet". |
| §2 vision-board / tree "Finished · closed" | LIVE | Vision tile "100 % DV Read project Finished · closed". |
| §2 template-library weight | LIVE | Lands on the open Health goal form. |
| §2 goal-intelligence Activity labels | LIVE | "Milestone ticked: “3 books”", one "Goal closed", "Target reached · goal completed", "Goal reopened". |
| §2 activity-feed subtitles / sign / creation line | LIVE (one defect) | "Added by you", "Your goal’s history", "−2 books". "Goal created · … · target US$50.00" shows the target after a later edit (created at US$1,000). |
| §2 activity page time zone | LIVE | "Times are shown in Europe/Brussels." |
| §4 tracked-detail plan copy ("Earlier plan terms", "Planned payments", "Price of one <unit> in <currency>") | **NOT LIVE** | The plan form still says "Price per Goal unit in contribution currency (if different)"; plan-history.tsx still heads "Retained plan terms" / "Plan installments". |
| §4 "Give your Goal a contribution rhythm" → lower-case "goal" | PARTLY | New strings are lower case; "Give your Goal a name.", "What counts toward this Goal?", "A rhythm that supports your Goal.", "Fund your Goal" remain. |
| §4 goals-overview "WITH A PLAN" | Not changed (as the row says) | Still "WITH A PLAN · why and if-then written" (DV-022e STILL OPEN). |
| §3 L4 rows marked "Applied" (Activity structure, milestone rows, source labels, kind names, templates, Hall, average, art, life balance, milestone planner, ideas, contribution-flow) | LIVE, except as noted in the findings | See DV-039a (wizard kind names), PR-066 (Showcase label), DV-034a (count-goal money copy). |

## STILL OPEN / CHANGED — exact steps for the lane

Common setup: Chrome, 1920×1113 Nebula, a fresh context, en-GB, Europe/Brussels, unless stated. "Showcase" = 1280×800 Dark, Settings → Load Showcase Demo.

1. **BN-153 / BN-188 (status says "Not possible"): the wizard drops the first input.** Open /app/goals/new, wait (1.5 s or 6 s), click Goal name, type "Berlin" at 120 ms a key → the field holds "erlin". On a fresh wizard the first `fill` of Target amount or Goal name is lost entirely (5 of 5 tries; the 52-week template then refuses Create with "Enter your target."). Not load-related.
2. **PR-057 / BUG-073 / B-058 / N-037: a spurious "Target reached" for another goal.** Showcase → Goals → Emergency fund → Fund Goal → USD cash reserve → 250 → Preview → Confirm. Activity at the same minute: "Target reached · goal completed · My first 0.1 BTC · 0.1 BTC".
3. **BUG-062 / PR-082 / G-037:** Showcase Today: "Your financial progress · 5 Active goals" beside "Your destinations · 7 active goals · 3 completed" (Goals ACTIVE 7).
4. **PR-024 (CHANGED for D-235 / M-056 / B-006):** Showcase → Emergency fund, open the panels: pace forecast "about 7 Jan 2028", plan "Projected completion 8 Aug 2028", "On track?" "at that pace … about 17 Jun 2030", next to an "AHEAD" chip; target 4 Nov 2028.
5. **DV-034a / DV-104 / NB-243 / MO-120 / DV-057b: money copy on a count goal.** Wizard → Reach a number of something → "DV Count books", 20, asset "books": step 2 "Count money I already have", steps 3–4 "only money you add counts toward the target", review "0 BOOKS". Goal page: "Saving plan · No saving plan yet"; after Fund Goal 3 the eyebrow is "COUNT GOAL · MONEY YOU HAVE"; panel "Still to fund 17 books · From counted wealth of 3 books", "Market movement can change wealth"; Fund preview "Your tracked asset balance increases by 3 BOOKS"; card Details "Existing wealth · active"; Today "Next: set a contribution plan".
6. **DV-147 (new direction):** after funding a count goal ("T9 Count pages", 40 pages), its unit becomes a Wealth asset: a USD savings goal's Fund dialog offers "T9 Count pages 0 available of 40 PAGES · Needs valuation", and Today's Wealth tile says "2 assets · 1 need attention".
7. **DV-018 / DV-040c / NB-174 / DV-041b / NB-098 / G-017: wealth parts on a project.** Create a project with 4 milestones: the page has a "Wealth" module, "Wealth & contribution history", "Counted wealth" chart "Scale maximum: 1 USD", timeline "Counted Goal value snapshot 0 USD · private snapshot". Showcase "Launch my creative studio" (4 milestones): "PROJECT GOAL · PROJECT", "Scale maximum: 3 milestones". G-030: project cards still carry "NO PLAN".
8. **G-027 / M-046 / D-008 / T-014:** project wizard step 2 is empty ("Project / milestones…"), step 3 says "only money you add counts toward the target"; steps still "Purpose · Optional sources · Optional Habit · Review" (the "four steps stay" citation is not in AL_SCOPE F).
9. **DV-039a / DV-049c / MO-130 / G-040 / G-047:** one kind, several names: wizard "Reach a number of something" / "Save an amount" / "Finish a project"; cards and detail "Count goal" / "Savings goal" / "Project"; gallery "Milestones goal" (38 templates). Keep an average is still not in the wizard.
10. **DV-007b / X3-19 / D-039 / N-144:** "Give your Goal a name.", "What counts toward this Goal?", "A rhythm that supports your Goal.", "Fund your Goal".
11. **DV-033e:** a savings goal → Contribution plan → the form shows "Price per Goal unit in contribution currency (if different)"; plan-history.tsx headings "Retained plan terms" / "Plan installments" (COPY_AUDIT §4 says replaced).
12. **DV-010a / DV-101 (CHANGED for DV-010c / NB-253):** money goal → Fund Goal → Cash → Asset name + Cash amount 200 → Continue → "Contribution quantity (USD)" asks the amount again.
13. **DV-019a / DV-040h / M-104:** project → Milestones → Edit a milestone → Remove milestone: no confirm; the Undo toast is gone after 8.1 s (the fix line asks ≥ 10 s).
14. **DV-056a / DV-102 / NB-172 / NB-175 / BN-149 / BN-187 / TK-179 (CHANGED):** the card ⋯ now has Open goal / Edit details / Close…, but no Delete. **NB-182:** the page's top ⋯ has no Edit.
15. **DV-169 / DV-206:** Habits → + Drink water → Complete → Activity (All · 1, Habit · 1) → Habits → ⋯ → Archive habit → Activity: All · 3, Habit · 2, but the list shows one habit row (no archive row).
16. **DV-047c:** Health → Increase Push-ups → Activity: no row, Health chip unchanged.
17. **DV-170:** Activity → Remove on a Health row deletes at once (Undo), same weight as the row, not in a ⋯.
18. **PR-066 / PR-099 / N-170 / D-227 (CHANGED):** Showcase → create a goal → Activity: "Showcase example history · fictional records" above the whole list, the person's own row included; seeded rows say "Added by you" like the person's own. **PR-065:** expense/income entries are not listed and not named in the footer.
19. **DV-036b:** create a savings goal at US$1,000, edit the target to 50 → Activity "Goal created · Emergency fund · target US$50.00".
20. **TK-142 / DV-006:** Emergency fund idea, target 1000: the preview strong reads "1000 USD" (review is formatted; ADR-023 C25 is not an F/O decision) and the caption "Save an amount · USD · Emergency Fund · At your own pace".
21. **D-241:** Showcase → Create a goal → Value, USD → Continue → Use wealth I already have: "Available stake: 0 ZIG" and "Goal Manager: Not deployed" on a USD goal.
22. **B-114:** Showcase → My first 0.1 BTC (Completed 100 %) → panel "Projected completion 5 Nov 2026".
23. **B-056:** Calculator → Turn this into a goal (link has contribution=600&every=monthly) → review "Planned contributions · None".
24. **DV-007a:** count goal page repeats "3 books of 20 books / 17 remaining" in the hero, "Your saving plan" and the panel.
25. **DV-022e:** "WITH A PLAN · why and if-then written" unchanged. **DV-204:** 1920, "+ Create a goal" floats mid-header.
26. **DV-012d (CHANGED):** average detail says only "From your own entries" for a Health-backed measure. **DV-053c:** chess still has no rating field. **DV-017 / DV-031e:** Category list still money-only. **DV-043c:** Tree has drag and "Put under" but no "Add a sub-goal". **DV-022b:** no group-by area.
27. **A11Y (Showcase 1280 unless stated):** BUG-049 focus on BODY, 46 Tabs to Goal name; D-029 five tab stops per card, star/options before the title; D-028 290 tab stops on Today; M-091 Quick add opens on "Close Quick add"; G-043 average value field labelled only "mL a day"/"h a night"; D-009 7 Health buttons with no text, aria-label or title; BUG-039 (375) three 19 px Settings links.
28. **TK-146:** Help has no line on Reward goals.
