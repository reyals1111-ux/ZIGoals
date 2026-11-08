# Grok #53 replay — lane L2 (Health), round 2

- **Commit served:** production build of `37d2370c` (`PUBLIC_ALPHA_UNDEPLOYED`, /home/user/zig-branch2) on http://127.0.0.1:3103. Later commits on the branch change only ZIGi/NOVA, tests, docs and the HUD shimmer, so this build is the Health code under review.
- **Date:** 8 Nov 2026, about 15:20–17:20 Brussels (wall clock; much of it spent waiting on the shared browser lock). The app's clock was set with Playwright's `page.clock` to the bots' night of 4 Nov 2026 (times below).
- **Replayed by:** a fresh replay agent. I made no fixes, changed no app or test code and made no git writes. **Scope: only the 73 ids in `ids/L2.replay.tsv`** (AL row, id, latest verdict). For each id I read only its block in the bot files (`grok-2026-11-04/*.md`, not FINAL-REPORT) and in `ledger/*.md`. Round 1 is `GROK53_REPLAY_L2_1.md` (on `c521574f`); its verdict is in the column "round 1 verdict". `lanes/L2.md` was read only for the sections after round 1 ("Sweep lane", "Fourth pass"), to know what claims Fixed.
- **Method and conditions (same as round 1):** channel `chrome` (`/usr/bin/google-chrome`, Chrome for Testing 153), headless, Playwright 1.63, `locale: en-GB`, `timezoneId: Europe/Brussels`, theme set through the app's theme record. Each context starts from an empty profile with the Welcome marked seen, or loads Settings → Load Showcase Demo, as the bot had it. Every run went through `flock -o /tmp/claude-0/zig-browser.lock timeout …`, one browser and one worker. The scripts are in `/tmp/claude-0/replay-L2-2/` and are not committed. No screenshots. No verdict rests on a lane spec; I ran no specs.
- **Condition codes** used in the tables:
  - **D** = desktop 1280×800, Dark, fresh empty profile, clock 4 Nov 2026 04:00 Brussels (before 07:00, inside the bots' window).
  - **D 01:30** = the same at 01:30 (Lisbon's Checklist night).
  - **Dlb** = D at 04:47 with Journal settings → weight unit lb and the seven daily readings Moscow typed (182.4 … 178.2 lb, 29 Oct–4 Nov).
  - **D+partial** = D with a library food that has no calories ("Plain soup") logged plus a 200 kcal, 5 g protein quick add ("Toast").
  - **Sc** = Showcase, 1280 Dark, 4 Nov 01:26 (Professor's time).
  - **768 L Sc** = Showcase at 768×1024, Light, 04:15. **375** = 375×844.
  - **env** = blocked by this build's setup, not by the app code: this build has no food-lookup provider binding, so `/api/food-lookup` answers 503 (`PROVIDER_SETUP_REQUIRED`).
- **Caveats.** The barcode rows that need a working provider cannot be judged here (env). "Field-level" means the sentence sits directly under the field (about 50 px below its top), the field is `aria-invalid="true"`, and its `aria-describedby` names that sentence; I read these from the DOM. Where a form is `noValidate` the browser shows no bubble. I inferred this from the app's own sentence appearing, because a browser bubble would block the submit handler.

## Totals (per id in the list file)

| verdict | ids |
|---|---|
| FIXED | 56 |
| HOLDS | 0 |
| STILL OPEN | 7 |
| CHANGED | 7 |
| OWNER DECISION | 0 |
| NOT REPLAYED | 3 |
| **total ids** | **73** |

## AL-CROSS-PAGE-SYNC-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-016 | CROSS-PAGE-SYNC-001 | STILL OPEN | STILL OPEN | D 01:30 | Health → "Star Water for your Checklist path", then Add 250 mL with no water target. On Checklist the planet reads "Water: 250 ml today: done" and the orbit reads "All planets lit (reached)". No target is used or asked for. After Journal settings → target 2,000 mL it reads "Water: 250 ml today of 2,000 ml: not done yet". The lane lists this as Needs-other-lane (L5, lib/checklist/derive.ts `waterDayDone`); it is not done in this build. |
| LS-056 | CROSS-PAGE-SYNC-001 | STILL OPEN | STILL OPEN | 375 | Fresh profile, Water starred, Checklist at 375 → Water planet → "Water in ml" = 2.5 → the button reads "Log 2.5 ml" and is pressed. No refusal (no whole-mL step), and the planet reads "Water: 2.5 ml today: done". The amount now shows unrounded (2.5, not "3 ml"). |
| LC-002 | CROSS-PAGE-SYNC-001 | STILL OPEN | STILL OPEN | D 01:30, Sc | Fresh: as LS-016 (one 250 mL glass, no target → done). Showcase: it now has a 2,000 mL target, so 1,250 mL reads "not done yet" there. The fresh case, which is the bot's, is still open. |
| PR-002 | CROSS-PAGE-SYNC-001 | STILL OPEN | FIXED | Sc 01:26 | Before any change, every page says the same: Today "WATER 1,000 mL of 2,000 mL today", Health "Water 1,000 of 2,000 mL", NOVA "Water 1,000 mL of 2,000 mL", Checklist "Water: 1,000 ml today of 2,000 ml: not done yet", Habits "Drink water … 1 / 2 liters per day · Partial". The old 8-glass counter beside 0 mL is gone. |
| PR-019 | CROSS-PAGE-SYNC-001 | STILL OPEN | CHANGED | Sc 01:26 | Health +250 mL → Today 1,250 mL, NOVA "1,250 mL of 2,000 mL · 750 mL of water to go", Checklist "1,250 ml today of 2,000 ml: not done yet". The Checklist no longer ticks it, because the Showcase has a target. **How it changed:** the Drink water habit now ticks itself off from the journal at the target: at 2,000 mL it reads "2 / 2 liters · ✓ Done · Done automatically · from your water journal · 2,000 mL". **Still wrong:** below the target, the habit card and Today's habit row stay at "1 / 2 liters · Partial" while the journal reads 1,250 mL. On a fresh profile the habit counts from the journal (MO-123), but the Showcase habit does not. Goals has no water row (none seeded), so nothing is there to be blank. |
| X3-26 | CROSS-PAGE-SYNC-001 | STILL OPEN | STILL OPEN | D 01:30 | As LS-016: "Water: 250 ml today: done" with Health `waterTargetMl` null and no prompt. |
| N-086 | CROSS-PAGE-SYNC-001 (primary NUMBERS-SOURCE-007, L3) | OTHER | CHANGED | Sc 01:26 | Steps are now one number everywhere: Habits "Walk 8,800 / 8,000 steps · Done automatically · from your activity log · 8,800 steps", Today "8,800 steps today", Health "Showcase walk 8,800 steps". Water agrees at load (1 L / 1,000 mL) and at the target. After a new Health entry the habit lags, as in PR-019 (1 / 2 L against 1,250 mL). The water part of NB-082 is narrowed, not gone. |

## AL-DATES-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| X3-16 | DATES-002 | CHANGED | FIXED | Dlb | With the seven lb readings: "Weight trend 178.5 lb trend today · Latest reading 178.2 lb · 4 Nov". The trend no longer lags at 181.2. The coach says "7 days with a weight since 29 Oct. A weekly rate needs readings at least seven days apart. A reading on 5 Nov or later gives the rate." The maintenance line counts "7 of 10 weigh-ins", one count. |

## AL-FIELD-ERROR-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-074 | FIELD-ERROR-003 | CHANGED | FIXED | D | Activity → Save activity with everything empty → "Enter a name." directly under the name field (field y 1382, sentence y 1434), aria-invalid, describedby names it, focus on the field, no browser bubble. A name with steps and Minutes left empty saves ("Walk", 4,000 steps → "Activity saved." at the end of the form, y 1782). |
| D-024 | FIELD-ERROR-003 | CHANGED | FIXED | D | Water amount "abc" → Log water → "Check the highlighted fields: Water amount needs a number: an amount of water more than 0 and at most 5,000 mL." directly under the field (field y 2922, sentence y 2974). The field is aria-invalid with describedby, focus is on it, nothing is saved. No grams/servings wording. |
| D-075 | FIELD-ERROR-003 | CHANGED | FIXED | D | Measurements, empty: "No timed weight readings yet. Add a timed weight reading below; two show a change." The jargon line "Real observations and recorded contributions…" is gone. "Type: weight." is said; "Measured at" is prefilled ("Recorded as: 4 Nov 2026, 04:47:06" in the Dlb run). Note: the export paragraph further down is still technical ("normalized milligrams or micrometres… source receipts"); it is not the empty state the bot flagged. |
| D-142 | FIELD-ERROR-003 | STILL OPEN | FIXED | D | Weight → leave "Weight (kg)" empty → Save weight → "Enter a weight from 20 to 400 kg." under the field, aria-invalid + describedby, focus on the field. The app's sentence (no native bubble) means the form no longer stops at the browser. Nothing is saved. |
| L-035 | FIELD-ERROR-003 | CHANGED | FIXED | D | Targets and Activity errors appear right under their fields (Targets −5 kcal: field y 1505, sentence y 1557). An empty activity name gets the app's "Enter a name." (no bubble). A spaces-only name gets "Enter a name with at least one visible character." under the name field. |
| D-041 | FIELD-ERROR-003 | NOT REPLAYED | FIXED | D | Habits → + New habit → Create habit with an empty title → "Habit title: Give the habit a name." with the title aria-invalid and focused (no browser bubble). Title "P3 Test stretch" → Create → "Habit created." in a status line at y 710 of the 800 px viewport (in view). No stray "Weekdays only" on the card ("Every day · 0 / 1 time per day"). |
| D-140 | FIELD-ERROR-003 | NOT REPLAYED | FIXED | D | As D-041: an empty title gives the app's sentence at the field, aria-invalid, focus on it. There is no native "Please fill out this field." |
| D-143 | FIELD-ERROR-003 | STILL OPEN | FIXED | D | (a) With one library food, leave "Food or recipe" on "Choose from your library" → Log to diary → "Choose “Food or recipe”." under the select, aria-invalid, describedby. (b) Water amount empty → Log water → "Enter an amount of water more than 0 and at most 5,000 mL." under the field, aria-invalid. Neither shows a native bubble, and nothing is saved. |
| N-116 | FIELD-ERROR-003 | STILL OPEN | FIXED | D, Dlb | I replayed the forms it names. Targets: −5/abc/99,999 kcal give the range in kcal at the field. Activity: −100 steps → "…steps as a whole number from 0 to 100,000." Measurements: waist values give the range at the field and the old "saved" line is cleared (MO-030). Water: as D-024. |
| N-130 | FIELD-ERROR-003 | CHANGED | FIXED | D | Activity: −100 steps → "Check the highlighted fields: Steps needs a number: steps as a whole number from 0 to 100,000." under the field, aria-invalid. An empty name → "Enter a name." (no bubble). |
| DV-136 | FIELD-ERROR-003 | CHANGED | FIXED | D | Weight: 0 / 1000 / 5000 → "Enter a weight from 20 to 400 kg." Water: 0 / 99,999 → "Enter an amount of water more than 0 and at most 5,000 mL." (0.001 mL is no longer offered as allowed). "0,5" asks once ("0.5 mL is less than a sip. If it is right, press Log water again to keep it."). |
| MO-001 | FIELD-ERROR-003 | STILL OPEN | FIXED | D | Targets → Calorie −5 / abc → "Check the highlighted fields: Calorie target (kcal) needs a number: a calorie target from 1 to 10,000 kcal a day.", and 99,999 → "Enter a calorie target from 1 to 10,000 kcal a day.". All three appear under the field (52 px below it), aria-invalid, focus on it. The storage text is gone. 2,000 → "Targets saved." at the end of the form (y 1907), not under the view strip. Small wording nit: −5 is told it "needs a number". |
| MO-020 | FIELD-ERROR-003 | CHANGED | FIXED | D | Blank / 0 / −5 / abc / 1000 / 5000 → each is aria-invalid, and its describedby names the sentence under the field: "Enter a weight from 20 to 400 kg." (blank, 0, 1000, 5000), and "Check the highlighted fields: Weight (kg) needs a number: a weight from 20 to 400 kg." (−5, abc). Focus is on the field. |
| MO-030 | FIELD-ERROR-003 | STILL OPEN | FIXED | Dlb | Measurements → history type Waist → 91.5 cm → "Measurement saved with its original units and history." Then −5 / abc / 5000 / 0 → "…a measurement from 10 to 250 cm." under the field, aria-invalid, describedby `health-measure-value-error`. The "saved" line is cleared on each submit (status empty). **New, smaller:** after switching the history type from Weight to Waist, a weight error from an earlier attempt ("Enter a weight from 20 to 400 kg.") stayed under the value field until the next submit. In the lb journal the timed-weight unit also defaults to kg, and its range is said in kg. |
| MO-036 | FIELD-ERROR-003 | CHANGED | FIXED | D | Water −100 / abc / 1e6 / 0 / 99,999 / blank → the range sentence under the field (not 250 px down), aria-invalid with describedby, focus on the field. 1e6 now gets the range ("more than 0 and at most 5,000 mL"). |
| MO-141 | FIELD-ERROR-003 | CHANGED | FIXED | Dlb | Waist −5 → "…a measurement from 10 to 250 cm." (not "not negative"); 5000 → "Enter a measurement from 10 to 250 cm."; aria-invalid; the old "saved" line is cleared (see MO-030). |
| BUG-020 | FIELD-ERROR-003 | STILL OPEN | FIXED | D | As MO-001 / MO-036. −5 kcal and −100 mL now name the range and unit at the field; 99,999 kcal gets its own limit sentence; "Targets saved." is at the form. |
| BUG-084 | FIELD-ERROR-003 | CHANGED | FIXED | D | Water −100 / abc → the field is highlighted (aria-invalid) and the sentence names the field and its real range in mL. No "grams, kilograms and servings", no "displayed ranges". |
| BUG-009 | FIELD-ERROR-003 | CHANGED | FIXED | D | Water error at y 2974 under the field at y 2922 (it was the form end, about 250 px down); weight error at y 1960 under the field at y 1908. |
| PR-063 | FIELD-ERROR-003 | CHANGED | FIXED | D | Water/weight −100 / abc → no food wording; the sentence is under the field; the earlier "Water recorded." is cleared on the failing submit (feedback list empty). |

## AL-FIELD-ERROR-004

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-35 | FIELD-ERROR-004 | NOT REPLAYED | NOT REPLAYED | D (env) | The searchable database half works offline: "banana" lists Ciqual/CoFID foods, raw first (MO-106). The barcode half needs a lookup provider. This build has none (`/api/food-lookup` → 503 `PROVIDER_SETUP_REQUIRED`), so a free working barcode lookup cannot be seen here. |
| MO-007 | FIELD-ERROR-004 | NOT REPLAYED | CHANGED | D (env) | Diary → "Scan or look up a food barcode" → 3017620422003 → Look up barcode → the lookup ends with a line, "Lookup is not available here. Search foods by name instead? · Search the Swiss food database · Add it yourself". The "Add it yourself" form opens with "Barcode 3017620422003 could not be looked up here…" and the code kept. Not silent any more. Whether a lookup succeeds needs a provider, which is not here (env). |
| MO-107 | FIELD-ERROR-004 | NOT REPLAYED | CHANGED | D (env) | "12" → "A barcode has 8, 12, 13 or 14 digits; this one has 2." with Look up disabled. A valid-looking code (0000000000000) is no longer silent: same line plus "Add it yourself". The real "not found" (404) path needs a provider (env). **Side observation:** for 0000000000000 the form says "Barcode 00000000 could not be looked up", so the typed 13-digit code is shown as 8 zeros. |
| Oct-26 gap: barcode provider inactive | FIELD-ERROR-004 | NOT REPLAYED | NOT REPLAYED | D (env) | The provider is still inactive in this build (503). The app now says so and offers name search and "Add it yourself" (see MO-007). Turning a provider on is a deployment setting, not something a replay can press. |
| C-MO-01 | FIELD-ERROR-004 | NOT REPLAYED | NOT REPLAYED | D (env) | A branded lookup (Nutella 3017620422003) needs the provider; here → "Lookup is not available here", plus "Add it yourself" with the code kept. |

## AL-LIMITS-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| G-044 | LIMITS-002 | CHANGED | STILL OPEN | D | Bot's steps: Goals → Keep an average → Name "Less screen time", Measure "Your own measure", Keep it "At most", Target 2, Unit "hours" → Save goal → today's value 30 → Save the day. It saves with no refusal and no "are you sure?" ("7 % · 30 hours · Target: at most 2 hours"); the second press does the same. The L4 fix covers only sleep hours (`sleepHoursWarning`); a 30-hour day of an own measure in hours still distorts the average. |
| T-137 | LIMITS-002 | CHANGED | FIXED | D | Targets → Daily step target 1,000,000 → "Enter a daily step target from 1 to 100,000 steps." at the field, aria-invalid, not saved. (The 5 kg goal and 500 kcal were already handled in round 1.) |
| D-077 | LIMITS-002 | STILL OPEN | FIXED | D | Calorie target 99,999 → "Enter a calorie target from 1 to 10,000 kcal a day." at the field (not the storage text). Protein 5,000 g → "Enter a daily target from 1 to 1,000 g." Each error belongs to its own field. |
| D-089 | LIMITS-002 | CHANGED | FIXED | D | Foods → New food, name "P3 " + 247 × Z (250 chars), serving 100 g → Save food → "A name can be at most 120 characters (this one has 250)." under the name, aria-invalid, nothing saved (no silent cut). A short name saves ("Food saved."). P+C+F above the serving was already refused in round 1; I did not repeat it, nor the Remove/Undo note (not this row). |
| DV-012a | LIMITS-002 | CHANGED | FIXED | D | /app/goals/average/new?template=sleep-7h → target 24 → asks once (stays on the form), second Save keeps it. Day value 30 / 25 → "Enter hours of sleep from 0 to 24 hours." Day 24 → "…If it is right, press Save again to keep it.", and the second press saves "100 % · 24 h a night". |
| DV-052a | LIMITS-002 | CHANGED | FIXED | D | Target 25 refused (stays on /new). Target 24 asks once, then saves. Day 30 refused with the 0–24 h sentence, as DV-012a. |
| MO-017 | LIMITS-002 | CHANGED | FIXED | Dlb | 300 lb on 4 Nov → "That is +121.8 lb from this day’s reading of 178.2 lb. If it is right, press Save weight again to keep it." Nothing is stored until the second press. The arithmetic is right to the tenth and the wording names the same day. |
| MO-109 | LIMITS-002 | CHANGED | FIXED | D | Log to diary, 1000 servings → "1,000 servings in one entry is a lot. If it is right, press Log to diary again to keep it." (the button's own name). Nothing is logged on the first press. |
| MO-111 | LIMITS-002 | CHANGED | FIXED | D | Health "Add 250 mL" double-click adds one entry. "0,5" asks once with nothing stale beside it (only the sip question is shown), and the second press saves 0.5 mL. −100 / 1e6 / blank name the range (MO-036). |

## AL-NAV-002, AL-UNITS-002, AL-A11Y-004, AL-COMPETITOR-GAP-042

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-014 | NAV-002 | CHANGED | STILL OPEN | D | The deep links work (round 1). The Health views are still 11 toggle buttons with `aria-pressed` inside a `<nav>`: there are 0 `role=tablist` and 0 `role=tab`. The lane lists this as Needs-other-lane (integrator, 11 spec files); there is no owner decision. |
| PR-074 | UNITS-002 | STILL OPEN | FIXED | Sc lb | Showcase → Journal settings → lb. The Weight view reads "WEIGHT TREND 162.2 lb -0.6 lb a week" and "Weight trend 162.2 lb … -0.6 lb/week", and the coach reads "This week: −0.6 lb/week" (also on Today). One rate, rounded once. Nit: the trend card prints a hyphen-minus ("-0.6") where the coach prints a minus sign ("−0.6"). |
| MO-097 | A11Y-004 | CHANGED | FIXED | 768 L Sc | Measurements: before a kind is chosen, the custom box is "Value (choose your measurement first)" and disabled. "Log the hours to a habit" no longer shows on Targets, Diary or Weight (0 found; it is folded into the fasting card). |
| N-085 | COMPETITOR-GAP-042 | CHANGED | FIXED | D | Habits → + New habit → template Exercise → Create → Details → "Exercise: set or add a value" → "Activity (optional)" offers Walk, Run, Cycling, Swimming, Strength training, Yoga, Pilates, Hiking, Dance, Team sport, Rowing, Stretching. Value 45 + Cycling → Set value → the day's note stored "Activity: Cycling". |

## AL-COPY-013, AL-COPY-014, AL-COPY-019, AL-CROSS-PAGE-SYNC-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-143 | COPY-013 | STILL OPEN | FIXED | D | Weights on 2 and 4 Nov; on 4 Nov press "Edit weight for 2 Nov 2026" → the journal date moves to 2 Nov and the form reads "Editing the reading of 2 Nov 2026: 81.2 kg. Cancel edit". Cancel edit → back to 4 Nov, with no "Editing" line. |
| N-004 | COPY-014 | STILL OPEN | FIXED | D | Weights 75.2 (20 Oct), 74.3 (27 Oct), 73.48 (4 Nov) → Goals → + Health goal → "Lose 5 kg", Weight, 68.5 → the card reads "73.48 towards 68.5 kg · Latest reading on 4 Nov 2026 · 30-day average 74.33 kg over 3 readings". The headline is the labelled latest reading, and the average is named as an average (the bot saw an unlabelled "74.04 towards 68.5"). |
| B-161 | COPY-014 | STILL OPEN | FIXED | D, Sc | Fresh water card: "Set a daily water target in Journal settings." Showcase: "2,000 mL personal target … Targets and units: Journal settings." No pointer to Targets. |
| PR-021 | COPY-019 | CHANGED | FIXED | Sc | Measurements: "No timed weight readings yet. Your 8 daily readings are in the Weight view. A timed reading added here (with its hour) is charted here; two show a change." No contradiction with the journal. |
| MO-123 | CROSS-PAGE-SYNC-002 | STILL OPEN | FIXED | D | Health 500 mL → Habits → one-tap "Drink water" → card "0.5 / 2 liters per day · Due … Counting from your water journal · 500 mL so far; it ticks itself off at the target." |

## AL-LIMITS-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-034 | LIMITS-003 | NOT REPLAYED | FIXED | D | The bot's steps on a clean profile: Habits → template Read (30 min/day) → "Star Read for your Checklist path" → Checklist → Focus tile → it asks once ("Start a focus session on Read now? Start / Cancel") → Start → "Focus: Read. running, 00:02" + "Focus started: Read. Undo" → +12 s → tap to end → "Focus stopped after less than a minute, so nothing was saved. Undo". No fractional "0.19 of 30 minutes": Read stays "not done yet" and Habits reads "0 / 30 minutes per day". The end toast has Undo. (The minimum is one minute here, ten for Sleep/Fast; see PR-018.) |
| N-MO-18 | LIMITS-003 | STILL OPEN | FIXED | 768 L Sc | Start fast at 768 → the timeline "24 h" label spans x 695–725. The card's content box ends at x 726 (card right 748, padding 22), so the label is inside the padding; it is marked `data-edge="end"`. |
| PR-018 | LIMITS-003 | STILL OPEN | STILL OPEN | Sc 01:26 | Checklist → "Meditate: 1h 0m a week Goal. Tap to start" → running → +20 s → tap to end → "Meditation saved on Health: 21 seconds. Undo". Sleep and Fast under ten minutes still save nothing, so the minimums still differ. Tapping the Sleep tile starts at once with no question ("Sleep: in bed since 01:26. running, 0m. Tap to end"; no Start/Confirm button). Fast and Focus do ask (corner-timers "asks once"). The lane lists the Checklist part as Needs-other-lane (L5). |

## AL-NUMBERS-SOURCE-005, -006, AL-PERF-002, AL-SEARCH-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-022 | NUMBERS-SOURCE-005 | STILL OPEN | FIXED | Sc 01:26 | Goals "KEEP AN AVERAGE · Sleep 8 hours a night · At least 8 h a night"; Health "Your goal (8 h 00 min)"; Checklist "Sleep 8h 0m Goal"; NOVA "Sleep 7 h 17 min of 8 h" and "Sleep 8 hours a night 88%". One 8 h goal everywhere. |
| N-PR-04 | NUMBERS-SOURCE-005 | STILL OPEN | FIXED | Sc 01:26 | As PR-022: 8 h in Goals, Health, Checklist and NOVA. |
| PR-088 | NUMBERS-SOURCE-006 | STILL OPEN | FIXED | D+partial | "Plain soup" (no calories) + "Toast" 200 kcal / 5 g protein. Today's Health card: "200+ kcal known so far · 200 kcal known · 1/2 entries supplied calories", and macros "5+ g Protein · Partial · 1 of 2 entries". There is no "Unknown kcal logged" headline. Health says "200 kcal known so far". |
| MO-026 | PERF-002 | CHANGED | FIXED | D | Workouts → Start an empty workout → Bench press 60 kg × 8 → Mark set done → Finish workout → "Your first workout here: these sets are your starting point. The next one is compared with it." (not "No new personal best this time"). The skeleton was confirmed in round 1. |
| MO-106 | SEARCH-002 | STILL OPEN | FIXED | D | Barcode fold → Search foods by name → "banana" → 1 "Banana, flesh without skin, raw" (raw tag), 2 "Bananas, raw, flesh only, weighed with skin" (raw tag), then nectar, flesh only, bread, split. Raw first, with a "raw" tag. |

## AL-A11Y-008, AL-COPY-022, -023, -024, AL-LAYOUT-DESKTOP-006

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| MO-154 | A11Y-008 | STILL OPEN | FIXED | D | Weight → first Save weight of the day (70.55) → `document.activeElement` is the "Save weight" button in the re-rendered form, not BODY. |
| N-MO-28 | A11Y-008 | STILL OPEN | FIXED | D | Meditation → Began 03:30, 15 minutes → Save → "Mindful minutes saved." is now inside the polite `role=status` region. The other status region reads "Focus sounds: off" (no bare "Off") and does not change on save, so it is not announced with it. Note: the form's default start is 10 min before now, so typing 15 minutes without moving "Began" is refused with "A session cannot end in the future." That is correct, but the bot's plain "15" now needs the start moved too. |
| MO-014 | COPY-022 | STILL OPEN | FIXED | Sc | Targets → Micronutrients: all 14 tiles read neutrally, e.g. "Vitamin A at least 900 µg a day · from 0 of 4 entries · No value logged"; "have no value" appears 0 times. A "More from your foods" line says magnesium, zinc, B vitamins and omega-3 show when a logged food carries them. |
| MO-022 | COPY-023 | CHANGED | FIXED | D, Sc | The fold's face now says its answer. Showcase: "Your energy today: an estimate from your sleep · good focus 09:20–11:20 · bedtime tonight 22:05–22:35". Fresh: "… · log a night to see it". The Showcase debt line also says "Short nights only: 7 h 36 min under your goal (long nights not netted against them)". |
| MO-040 | COPY-024 | CHANGED | FIXED | D | Activity starts blank (steps "", minutes "", name ""). "Walk", 4,000 steps, Minutes blank → the row reads "Walk 4,000 steps · Added by you" (no "0 minutes"). |
| MO-028 | LAYOUT-DESKTOP-006 | CHANGED | FIXED | D | Fresh, weight only → quick actions "Log food" primary (food is first in the missing order). After logging a food and 250 mL water, "Log weight" is primary on Diary and Weight. The CTA follows what is missing, and the Weight view shows no nourishment block. |

## AL-ROUNDING-002

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| N-MO-14 | ROUNDING-002 | STILL OPEN | CHANGED | D | 70.55 kg → history table "4 Nov 2026 70.55 kg", "Latest in 30 days 70.55 kg", and Edit prefills 70.55. The entered decimals are kept there. **Still rounded on the same screen:** the trend card says "Latest reading 70.6 kg · 4 Nov", the first-observation card "FIRST OBSERVATION 70.6 kg", and the summary "Average 70.6 kg". One reading shows as 70.55 and 70.6 side by side. |
| N-MO-15 | ROUNDING-002 | STILL OPEN | FIXED | Sc | Bench press: "Heaviest 62.5 kg · Estimated one-rep max 79.2 kg an estimate (Epley)". No two-decimal kg on the page. |
| N-MO-23 | ROUNDING-002 | NOT REPLAYED | FIXED | D | Goals → Create a goal → "B7 USD watch fund", Value, target 2,000 → Count money I already have → Custom asset "B7 Test Watch", Quantity 11, Total holding value 1,250 USD → Save asset for this Goal → Units to allocate 6 → Continue → Create goal. The goal page reads "CURRENT VALUE US$681.82 of US$2,000.00 · Remaining US$1,318.18" and "Custom US$681.82 · 34.09%". 6/11 × $1,250 = 681.818…, now rounded half up, not cut to 681.81. (en-GB prints "US$".) |
| N-NB-10 | ROUNDING-002 | STILL OPEN | CHANGED | D | As N-MO-14: the history shows "70.55 kg"; the trend card, the first-observation card and the 30-day average still say 70.6 kg. |

## AL-FEATURE-GAP-001, AL-PERSISTENCE-002, AL-COMPETITOR-GAP-078, -081

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| Oct-26 gap: macro modes view-only | FEATURE-GAP-001 | CHANGED | FIXED | D | Targets with 2,000 kcal and no gram targets. "Custom split" opens Protein % / Carbs % / Fat % and "Use this split". The Diary tiles then read "Protein — No entry · 150 g target (your split)", "Carbs … 200 g target (your split)", "Fat … 67 g target (your split)". "Keto view" → "125 g target (keto split)", "Net carbs — No entry · 25 g target", "156 g target (keto split)". On an empty day the Net carbs tile is labelled "Net carbs … Carbs minus fiber, from your entries". With entries lacking fiber it says "Net carbs need fiber on every entry (0 of 2 have it)". The modes change the tile targets, not only a text line. |
| MO-111) | PERSISTENCE-002 | UNSEEN | FIXED | D | Health "Add 250 mL" double-click → 1 entry; Today's "Add 250 mL" double-click → 1 entry (stored water count +1 each time). The id is spelled "MO-111)" in GROK53_LEDGER (row "also closes: MO-111"). |
| C-DVG-38 | COMPETITOR-GAP-078 | CHANGED | FIXED | Sc, D | By meal: Diary → "Name your meals" → "Calorie target for breakfast" 500 → the meal header reads "Breakfast 420 kcal of 500 kcal". By weekday: Targets still has the "Weekly calorie budget (optional)" fold with the Move/Shift by day that round 1 replayed. I saw the fold this round but did not reopen it. |
| C-DVG-41 | COMPETITOR-GAP-081 | CHANGED | CHANGED | Sc, D | Stats now built: "Fasts that reached your own target: 1 day in a row · 1 of the last 7 days" on the fasting card, plus presets, past fasts and the timeline (round 1). **Still missing:** fasting reminders. /app/reminders and the fasting card mention no fast reminder; the lane built only meal reminders (in-app), and device push waits for the owner switching push on. |

## STILL OPEN for the lane

1. **LS-016, X3-26, LC-002 (AL-CROSS-PAGE-SYNC-001; Needs-other-lane L5 per lanes/L2.md).**
   - Steps: fresh profile at 01:30, 1280 Dark. Health → "Star Water for your Checklist path" → Add 250 mL. Leave Journal settings → "Personal water target" empty → open Checklist.
   - The Water planet reads "Water: 250 ml today: done" and the orbit reads "All planets lit (reached)". No target is used or asked for.
   - Expected (AL row): water is done only at the target; with no target, ask for one once (default 2,000 mL).
   - With a 2,000 mL target it correctly reads "250 ml today of 2,000 ml: not done yet".
2. **LS-056 (AL-CROSS-PAGE-SYNC-001).**
   - Steps: fresh profile at 375 × 844, Water starred. Checklist → Water planet → "Water in ml" = 2.5 → "Log 2.5 ml".
   - The fraction is accepted (no whole-mL step) and the planet reads "Water: 2.5 ml today: done".
3. **G-044 (AL-LIMITS-002).**
   - Steps: Goals → Keep an average → Name "Less screen time", Measure "Your own measure", Keep it "At most", Target 2, Unit "hours" → Save goal → today's value 30 → Save the day.
   - It saves at once with no refusal and no "are you sure?" ("7 % · 30 hours · Target: at most 2 hours").
   - Only sleep hours are guarded (`sleepHoursWarning`). An own measure in hours can still hold more than 24 a day.
4. **PR-014 (AL-NAV-002; Needs-other-lane, integrator).**
   - Steps: /app/health on any view.
   - The 11 view switches are `<button aria-pressed>` in a `<nav>`: 0 `role=tablist`, 0 `role=tab`. The deep links work.
5. **PR-018 (AL-LIMITS-003; Checklist part Needs-other-lane L5).**
   - Steps: Showcase at 01:26 → Checklist → "Meditate: 1h 0m a week Goal. Tap to start" → wait 20 s → tap to end. It reads "Meditation saved on Health: 21 seconds. Undo".
   - Sleep and Fast under ten minutes, and Focus under one minute, save nothing, so there is still no single minimum.
   - Tapping the Sleep tile starts "Sleep: in bed since 01:26. running" at once with no question. Fast and Focus ask first.

CHANGED, with the part that is still open (steps in the tables):
- **PR-019 and N-086 (water part).** In the Showcase, Health +250 mL (1,250 mL) leaves the Drink water habit and Today's habit row at "1 / 2 liters · Partial". It completes only at 2,000 mL ("Done automatically · from your water journal").
- **N-MO-14 and N-NB-10.** 70.55 kg shows as entered in the history, "Latest in 30 days" and Edit. The trend card ("Latest reading 70.6 kg"), the first-observation card and the 30-day average still round it to 70.6 on the same screen.
- **MO-007 and MO-107.** With no provider the lookup now ends with a line and "Add it yourself" (env: a working provider cannot be seen in this build). Side observation: for the code 0000000000000 the form says "Barcode 00000000".
- **C-DVG-41.** Fasting streaks and stats are built. There are no fasting reminders.

Small new observations (not separate ids):
- Measurements: an earlier weight-range error stays under the value field after switching the type to Waist, until the next submit.
- In an lb journal the timed-weight unit defaults to kg and its range is said in kg.
- The trend card prints "-0.6 lb" with a hyphen-minus while the coach prints "−0.6".
