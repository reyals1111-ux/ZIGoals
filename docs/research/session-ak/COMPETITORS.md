# Session AK — competitor gap analysis and build list (lane R, read 2026-10-31)

Research only. The claims about competitors come from vendor help centres, feature pages, App Store listings and blogs.
Each is cited as `[n]` (list at the end). **(2°)** marks a secondary source (review, aggregator, community post). Before
listing a gap, the repository was searched (`apps/web/lib`, `apps/web/components`) to avoid re-proposing what exists.
For example, progress photos (`lib/health-aa/photos.ts`), quit habits with "money saved" (`components/habits/quit-panel.tsx`),
breathing/meditation, sleep tags with tag insights (`lib/sleep/insights.ts`), fixed cross-pillar pairings with
honest confidence (`lib/insights/cross-pillar.ts`), portfolio cost basis and realized P/L (`lib/portfolio/*`), and net
worth with property, vehicle, loan and mortgage kinds (`components/wealth/accounts-section.tsx`) **already exist**.
Session AK's planned items are marked "planned in AK".

**Not found:** no app called **"Multi"** or **"personalEverything"** could be found (two searches; the closest were
generic all-in-one trackers such as TRAKL and Life Hack) [43]. They are left out.

## (a) Gap matrix

"Do we": yes / partial / planned in AK / no. "Web" = possible in a PWA with web APIs, no new dependency and no server
storage of personal data.

| # | Feature | Who has it | Do we | Web | Priority |
|---|---|---|---|---|---|
| **Nutrition** |||||
| N1 | Nutrition-label scan into a food (fallback when barcode misses) | MacroFactor [1] | **no** (manual label form only) | yes: camera + person's own AI key (as AI photo); editable draft | **P1** |
| N2 | "Top sources" of each nutrient over a date range | Cronometer [2] | **no** | yes: pure math on the diary | **P1** |
| N3 | Weekly calorie budget: shift calories between weekdays / roll over unused | MacroFactor (calorie shifting, roll-over help) [3] | **no** (weekly coach has floors) | yes | P2 |
| N4 | Per-food quality rating | Lifesum (food rating per 100 kcal) [4] | **no** | yes: Open Food Facts `nutriscore_grade` (add the field to the food-lookup Worker) or a transparent own rule | P2 |
| N5 | AI photo with portion estimate | Cal AI, PlateLens, Lose It "Snap It", Yazio PRO [5][6][7] | yes | — | — |
| N6 | Meal plans by diet (keto, Mediterranean…) with grocery list | Lifesum, Yazio [4][7] | partial (planner + grocery list; no diet templates) | yes (content effort) | P3 |
| N7 | Intermittent fasting | Yazio, Lose It, MFP [7] | yes | — | — |
| N8 | Large generic food DB | all | planned in AK (CIQUAL/CoFID/Fineli + FDC) | — | — |
| **Training** |||||
| T1 | Warm-up calculator (ramp sets from working weight) | Strong [8] | **no** (warm-up *sets* exist, no generator) | yes | **P1** |
| T2 | Plate calculator | Strong [8] | planned in AK | — | — |
| T3 | Muscle freshness / recovery % per muscle (0–100%, ~6 days) | Fitbod [9] | **no** | yes: decay over the planned set → muscle map | P2 |
| T4 | Sets per muscle per week + body diagram | Hevy [10] | planned in AK (volume per muscle) | — | — |
| T5 | Body measurements + progress photos | Strong, Hevy [8][10] | yes | — | — |
| T6 | Auto-generated workout from recovery + equipment profile | Fitbod [9] | no | yes (rules), but large | P3 |
| T7 | Social feed, follow friends | Hevy | no | needs accounts/server | not buildable |
| **Sleep, recovery, mind** |||||
| S1 | Sleep notes/tags → effect on sleep | Sleep Cycle [11](2°), Oura tags [12] | yes (`lib/sleep/insights.ts`) | — | — |
| S2 | **Any factor → any outcome** explorer (person picks X and Y; with/without, confidence) | Bearable Factor Effect [13], Daylio Influence on Mood [14], WHOOP Journal impacts (≥5 yes and ≥5 no in 90 days) [15] | **partial** (fixed pairings only) | yes: reuse `confidenceOf` | **P1** |
| S3 | Mood meter: energy × pleasantness grid + emotion words + small strategy | How We Feel (144 words) [16](2°) | **partial** (mood/energy 1–5) | yes | **P1** |
| S4 | Energy curve for the day (peaks and dips from wake time and sleep debt) + bedtime window | Rise [17] | **no** (sleep balance exists) | yes, as a labelled estimate | P2 |
| S5 | Year in Pixels for mood/energy | Daylio [14] | partial (habit heatmap only) | yes | P2 |
| S6 | Breathing pacer | Calm Breathe Bubble [18] | yes (Meditation "Breathe.") | — | — |
| S7 | Report to share with a clinician (date range, printable) | Bearable (share with medical team) [19] | **no** | yes: `window.print()` / save as PDF, nothing uploaded | P2 |
| S8 | Readiness / recovery from raw HRV | Oura, WHOOP | partial (imports) | only from imported data | — |
| S9 | Smart alarm, snore recording | Sleep Cycle | no | **no**: needs native background audio | not buildable |
| S10 | Virtual pet / mascot care | Finch [20](2°) | yes (ZIGi) | — | — |
| **Habits** |||||
| H1 | Negative / quit habits | Streaks [21] | yes (quit panel) | — | — |
| H2 | Time-of-day sections, areas | Habitify [22] | partial (`timeOfDay` exists in plans; compact list planned) | yes | P3 |
| H3 | Custom rewards bought with points | Habitica [23](2°) | **no** (XP/badges only) | yes, opt-in and calm | P3 |
| H4 | Location reminders | Habitify [22] | no | **no**: geofencing needs native background | not buildable |
| H5 | Habit import from Loop/Habitica/Daylio | — | planned in AK (Habitica, Daylio); Loop exists | — | — |
| H6 | Export to Loop | — | **no** | yes: HabitBull-format CSV Loop imports (FORMATS.md (b)) | P2 |
| **Goals / planning** |||||
| G1 | Pace line (on track / behind) | Strides [24] | yes | — | — |
| G2 | Values-linked goals, life balance | Lifetick [25](2°) | yes | — | — |
| G3 | Natural-language recurrence ("every other Tue 7am", `every!`) | Todoist [26] | partial (AI action parser) | yes | P3 |
| G4 | Eisenhower matrix | TickTick [27](2°) | no | yes, but off-pillar (tasks) | not a fit |
| **Money** |||||
| M1 | **Transaction rules** (payee/memo/amount → category, rename, tag; apply to past) | Monarch [28], Copilot name rules [29] | **no** (fixed EN/NL word list in `lib/money-log/category.ts`) | yes | **P1** |
| M2 | Review inbox for newly imported transactions | Copilot (review flow; see session-ai) | **no** | yes | P2 |
| M3 | Split one transaction across categories/goals | YNAB, Monarch (not re-read today) | **no** | yes | P3 |
| M4 | "Age of money" / days of buffer | YNAB [30] | **no** | yes | P2 |
| M5 | Retirement / financial-independence projection with Monte Carlo bands | Empower [31](2°) | **no** (goal what-if only) | yes: seeded RNG, no dependency | P2 |
| M6 | Fee drag calculator (expense ratio → lifetime cost) | Empower Fee Analyzer [31](2°) | **no** | yes | P3 |
| M7 | Recurring bills, budgets with rollover, Sankey, bank files | Monarch, YNAB, Rocket | planned in AK | — | — |
| M8 | Manual assets (house, car) + liabilities | Kubera [32](2°) | yes | — | — |
| M9 | Beneficiary "dead man's switch" | Kubera [32](2°) | no | **no**: needs a server that holds the data and acts | not buildable; a **printable family emergency sheet** is (P2, below) |
| M10 | Cancel subscriptions / negotiate bills for you | Rocket Money [33](2°) | no | **no**: human service and accounts | not buildable |
| M11 | Bank aggregation | Monarch, Copilot, Rocket, Empower | no | **no**: paid aggregator feed + server | not buildable |
| **Crypto** |||||
| C1 | Cost basis, realized and unrealized P/L | CoinStats [34](2°), Delta PRO [35] | yes (`lib/portfolio`) | — | — |
| C2 | DeFi positions, human-readable wallet history | Zerion [36] | no | **no**: needs an indexer (paid API key) | not buildable |
| C3 | Price alerts as push | Delta, CoinStats | partial (in-app); push planned in AK | — | — |
| **All-in-one** |||||
| A1 | "Multi", "personalEverything" | — | — | not found [43] | — |

## (b) Ranked BUILD list (web-possible, not existing, not already planned in AK)

Every item is device-only and needs no new dependency. Effort is "a few hours" unless noted. Where an AI key is used it
is the person's own, as today.

### P1

1. **Transaction rules (auto-categorise and rename)** — M1 [28][29]. Wealth → Money log → "Rules". A rule is
   `{match: payee|memo contains/equals/starts-with text (case-insensitive), optional amount range and direction} →
   {category?, rename-to?, tag?, goal?}`, ordered, first match wins. Rules run on every new entry and every import
   (CSV today; CAMT/OFX/MT940 when they land). "Apply to the past 90 days" shows a preview diff and undo. A "Make a rule"
   shortcut on a recategorised entry pre-fills it. Store in the existing money-log device key (schema bump, exported,
   synced like the log). Tests: ordering, no regex injection (plain string match only), a bounded count (≤ 200 rules).
2. **"Does X affect Y?" explorer** — S2 [13][14][15]. Insights → "Compare". The person picks a **factor** (any habit done,
   a sleep or journal tag, workout day, fasting day, spend > €X) and an **outcome** (mood, energy, sleep minutes, next-day
   habit rate, steps). Reuse `confidenceOf`/`probabilityOfSuperiority` and the 14/28-day rules from
   `lib/insights/cross-pillar.ts` and the same wording rules ("happened together", one confounder). Show WHOOP-style
   counts ("12 days with, 31 without"). Lag option: same day / next day. No storage beyond the last chosen pair.
3. **Nutrition-label scan** — N1 [1]. In "Add food" and on a barcode miss: take a photo of the label → send to the
   person's AI provider with a strict JSON schema (basis per 100 g/serving, serving size, kcal, macros, fibre, sugars,
   sat fat, salt or sodium, any listed vitamins and minerals) → fill the existing manual label form as an **editable
   draft** with "read from your photo, check the numbers". Reject impossible values (kcal vs 4/4/9 Atwater
   check ±20%). The photo is not kept. Barcode → food link saved to the private library.
4. **Top sources of a nutrient** — N2 [2]. Health → Nutrients → tap a nutrient → "Where it came from" for 7/30/90 days:
   the top 5 foods by contribution with share bars and the diary days. Pure aggregation over existing diary entries.
   The empty state says "Log a few days to see where your iron comes from".
5. **Warm-up calculator** — T1 [8]. On a strength exercise with a working weight: "Add warm-up" proposes a ramp (e.g.
   bar × 10, 40% × 5, 60% × 3, 80% × 1, rounded to the plate increment and bar weight from settings, kg/lb). It inserts
   them as warm-up sets (existing set type) the person can edit. Ships with the planned plate calculator, which
   shares the rounding helper.
6. **Mood words** — S3 [16]. In the daily check-in and the journal: after the 1–5 mood/energy, an optional 2-axis grid
   (energy × pleasantness, 4 colour quadrants) with about 12 authored words per quadrant (EN and NL, the guilt-free word list
   applies). One tap stores `{energy, pleasantness, word}`. A word in an unpleasant quadrant offers at most one small next
   step that links to an existing feature (Breathe 1 min, a walk habit, write 3 lines). Feeds item 2 as an outcome.

### P2

7. **Weekly calorie budget view** — N3 [3]. Show the week's budget as 7 bars. "Shift" moves calories between chosen
   weekdays (the weekly total is unchanged; never below the coach floor). "Roll over" carries up to N kcal of unused
   budget to the next day (off by default). A display layer over the coach's weekly target; no change to the coach maths.
8. **Muscle freshness** — T3 [9]. From the planned set → muscle mapping: each muscle's freshness = 100% − Σ(sets ×
   decay), recovering linearly to 100% over 6 days (Fitbod's help figure), editable per muscle. A body diagram (the
   planned SVG) coloured by freshness, and "Fresh today: legs, back" on the workout start sheet. Labelled an estimate.
9. **Energy curve** — S4 [17]. Today → Sleep: a simple curve of predicted alertness from wake time, sleep balance
   (existing 14 nights) and a fixed circadian dip about 7–9 h after waking. It marks "likely dip" and "good focus window",
   plus a suggested bedtime window from the person's average sleep need. Copy: "an estimate from your sleep times, not a
   measurement". No notifications unless the person asks (push planned in AK).
10. **Review inbox for imported money** — M2. After an import, new entries land in "To review (n)". The person swipes or taps
    ✓ to accept, edits the category, or makes a rule (item 1). Unreviewed entries count in totals but show a dot.
    Avoids silent mis-categorisation from bank files.
11. **Age of money / buffer days** — M4 [30]. A Wealth tile: "Your cash covers N days of your usual spending", from
    cash-like account balances ÷ the trailing 30-day average daily spending (existing log), with the trend. YNAB's
    FIFO "age" is optional later. One sentence, no judgement words.
12. **Financial-independence projection** — M5 [31]. A Goal template "Financial freedom": target = yearly spend ×
    (1 / withdrawal rate, default 4%), current invested assets from net worth, monthly contribution, expected
    return/volatility. 1,000 seeded Monte Carlo paths (Box-Muller, no dependency) show the 10/50/90% bands and "years
    to target". A "this is a model, not advice" line, all inputs editable. Runs in a Web Worker if it exceeds 50 ms.
13. **Year in Pixels for mood and energy** — S5 [14]. Journal → "Year": a 53 × 7 grid like the habit heatmap, coloured by
    the day's mood (or energy, toggle). Tap a day to open its entry. Export as PNG via canvas. Reuses the heatmap component.
14. **Share-with-clinician report** — S7 [19]. Settings → My data → "Report for a visit": choose a date range and sections
    (sleep, mood/energy, symptoms/notes, weight, medications if present, habits). It renders a clean print stylesheet page
    with charts as inline SVG and tables, and the person prints or saves as PDF. Nothing is uploaded. It shows date range,
    generated date and "from the person's own log".
15. **Food quality badge** — N4 [4]. On barcode foods, show Open Food Facts' Nutri-Score letter when present (add
    `nutriscore_grade` to the Worker's `fields=` list; credit OFF as today). For generic foods, show nothing rather than
    inventing a score. Filter "show A/B foods first" in search. Optional, off by default (Lifesum users complain the
    rating can't be hidden [4]).
16. **Export habits to Loop** — H6. Habits → Export → "For Loop Habit Tracker" writes `HabitName,HabitDescription,
    HabitCategory,CalendarDate,Value,CommentText` rows (Loop's HabitBull importer: date `YYYY-MM-DD`, value 0/1 or a
    number). It warns that Loop will make every habit daily. See FORMATS.md (b).
17. **Family emergency sheet** — M9 alternative [32]. Wealth → "If something happens to me": a printable page listing
    accounts (name, institution, kind, approximate value, where documents are), wallets by *public* address only,
    insurance, and a free-text note. It **never includes keys or seed phrases** (enforced: a seed-phrase detector refuses
    to print). Print or save as PDF; nothing leaves the device. Kubera's dead man's switch, without a server.

### P3

18. **Fee drag calculator** — M6 [31]. In the calculator: amount, years, return, expense ratio A vs B → the euro
    difference at the end and a two-line chart.
19. **Custom rewards shelf** — H3 [23]. Opt-in in the game layer: the person lists treats with a point price. Points come
    from completed habits (existing XP). "Claim" marks a reward as enjoyed. No penalties and no negative points (calm rules R2/R5).
20. **Diet-style meal plan templates** — N6 [4][7]. 3–5 authored 7-day templates (Mediterranean, high-protein,
    vegetarian) built from CIQUAL/CoFID generic foods once they land. They fill the existing planner and grocery list
    with a "template" label.
21. **Recurrence phrase box** — G3 [26]. In habit create: type "every other tue 7am" or "3× a week" and it maps to the
    existing schedule kinds (deterministic EN/NL grammar, shown as chips before saving; unknown words are highlighted,
    never guessed).
22. **Split a money entry** — M3. Split one entry into 2–5 parts (category and/or goal each), with the sum checked.
    Totals and budgets read the parts.
23. **Time-of-day sections on the habit list** — H2 [22]. Group by Morning/Afternoon/Evening/Anytime from each habit's
    reminder time. Ships with the planned compact list.

## (c) Best-in-class UI patterns per pillar (the visual bar for new surfaces)

These come from the vendors' own feature pages and App Store screenshots [1][8][10][14][16][17][24][28] plus our judgement.
Treat them as patterns, not specs.

- **Nutrition (MacroFactor, Cronometer).** The day opens on **remaining** (not eaten) calories and macros as a
  compact bar or ring row. The diary is a **dense list grouped by meal** with per-meal subtotals. The primary action is
  a **bottom "+" that opens one sheet with Search / Barcode / Label / Photo tabs**, all one thumb's reach away. On a
  barcode miss it falls through to the label scanner [1] instead of a dead end. The nutrient report is a **sortable
  list of bars against targets**, and tapping a bar opens its top sources [2]. Empty state: the "+" sheet itself with
  "Recent" and "Favourites" shown first.
- **Training (Strong, Hevy).** The workout screen is a **table per exercise: set # / previous / kg / reps / ✓**. Previous
  values sit greyed in place, so the next set is one tap. The rest timer is a slim bar pinned to the bottom. **"Finish"
  sits top right**, away from the thumb, to avoid ending by accident. Swipe a set left to delete. Warm-up and plate
  calculators open as small sheets from the exercise menu [8]. Muscle charts use a body diagram with sets per muscle [10].
- **Sleep and recovery (Rise, Oura).** The screen leads with **one number** (sleep debt, or a score in a ring) and a
  one-line meaning, then a **single curve or bar strip**: Rise's energy schedule line with "peak/dip" labels [17], or
  Oura's contributor list under the score. Tags are added with **one-tap chips** after waking [12].
- **Mind (Daylio, How We Feel).** Check-in in under 5 seconds: **5 large mood faces** in one row → an **icon grid of
  activities** → optional note (Daylio [14]). How We Feel uses a **full-screen colour grid** where the thumb drags to a
  quadrant, then a word list filtered to that quadrant [16]. Correlation screens show **with vs without** percentages
  plus a confidence label [14], which ZIGoals already does.
- **Habits (Streaks, Loop, Habitify).** Two good densities. **Streaks:** a grid of big round tiles, tap-and-hold to
  complete (no accidental taps) [21]. **Loop:** a dense list where each row shows the **last 5 days as checkboxes**, so a
  missed day is one tap. **Habitify:** **time-of-day sections** with a swipe to complete or skip [22]. Empty state: a
  short template list ("Drink water", "Walk 10 min") rather than a blank form.
- **Goals (Strides, Lifetick).** A goal row is **name + a mini pace line in green/red + "x ahead / y behind"** [24].
  The detail screen has the line chart with pace and projection [24]. Lifetick ties each goal to a value [25].
- **Money (Monarch, YNAB, Copilot).** The dashboard is **widgets** (cash flow, budget left, recent transactions) with a
  per-widget drill-in [28]. Transactions are a **date-grouped list with a category pill** the thumb can change inline.
  "Create rule" appears **right after a manual recategorisation** [28]. YNAB keeps **"Ready to Assign" as a persistent
  top banner**, the one primary action. Copilot-style **"To review (n)"** badges make imports safe.
- **Crypto (Delta, CoinStats, Zerion).** **Total value large + 24 h change**, then holdings sorted by value with a
  sparkline and P/L per row [35]. Zerion makes wallet history **human-readable sentences** ("Swapped 1 ETH for 3,000
  USDC") [36].
- **Common bar for every new ZIGoals surface:** the primary action at the bottom (a FAB or a bottom sheet); at most one
  number above the fold; lists dense enough for 8–10 rows on a phone; every empty state offers the one next action
  plus an example; destructive actions top-right or behind a swipe and confirm.

## (d) Not buildable as a PWA (or not under ZIGoals' rules)

| Feature | Who | Why not |
|---|---|---|
| Smart alarm, snore and sound recording overnight | Sleep Cycle | Native background audio and alarms; a PWA cannot run all night |
| Location reminders | Habitify [22], Productive | Geofencing needs native background location |
| Widgets, Live Activities, watch apps | Streaks, Hevy, Strong | Native only |
| Bank aggregation | Monarch, Copilot, Rocket, Empower | Paid aggregator feed (e.g. Plaid/GoCardless) + server tokens. Bank **files** are planned instead |
| Subscription cancellation, bill negotiation | Rocket Money [33] | A human/agent service acting on accounts |
| Dead man's switch to a beneficiary | Kubera [32] | Needs a server holding the data and acting on inactivity. The printable sheet (item 17) is the private alternative |
| DeFi positions, decoded wallet activity | Zerion [36], CoinStats | Needs an indexer API with a paid key |
| Social feed, parties, challenges | Hevy, Habitica | Accounts and a shared server |
| Guided meditation and sleep-story libraries | Headspace, Calm [18] | Content licensing, not code |
| Depth-sensor portion estimate | Cal AI, PlateLens [5][6] | LiDAR/depth is native only (the photo estimate exists) |
| Continuous glucose | Lose It | CGM data comes via native HealthKit/Health Connect |
| Readiness from raw HRV in real time | Oura, WHOOP | Needs the device stream. ZIGoals reads imported summaries only |
| Calendar sync of energy peaks | Rise [17] | Google Calendar write scopes need app verification ("Beta" at best); ICS download is possible instead |

## Sources (all read 2026-10-31)

1. MacroFactor label scanner: <https://help.macrofactorapp.com/en/articles/213-label-scanner>, <https://macrofactor.com/label-scanner-announcement/>
2. Cronometer Nutrition Report top sources: <https://cronometer.com/blog/how-to-nutrition-report>, <https://support.cronometer.com/hc/en-us/articles/32689033683220>, forum <https://forums.cronometer.com/discussion/4461/expand-the-top-sources-information> (2°)
3. MacroFactor program styles and roll-over: <https://help.macrofactorapp.com/en/articles/91-program-styles>, <https://help.macrofactorapp.com/en/articles/108-how-to-adjust-calorie-targets-to-account-for-overages-or-to-roll-over-unused-calories>; calorie shifting per Reddit (2°)
4. Lifesum food rating and Life Score: <https://help.lifesum.com/en/article/food-rating-1afp5ga/>, <https://help.lifesum.com/en/category/life-score-meal-ratings-3ck3ms>
5. Cal AI: App Store listings (2°); see also ../session-ai/COMPETITORS.md
6. PlateLens: <https://www.producthunt.com/products/platelens-the-best-ai-calorie-counter> (2°)
7. Lose It / Yazio: <https://www.yazio.com/en/yazio>, App Store listings (2°)
8. Strong: App Store listing <https://apps.apple.com/gb/app/id464254577> (Warm Up Calculator, Plate Calculator, body measurements, progress pictures)
9. Fitbod muscle recovery: <https://help.fitbod.me/hc/en-us/articles/360006269014-Muscle-Recovery>
10. Hevy: <https://help.hevyapp.com/hc/en-us/articles/35385479603479-Body-Composition-Tracking-Measurements-and-Progress-Photos>, <https://www.hevyapp.com/features/muscle-group-workout-chart/>
11. Sleep Cycle sleep notes: App Store listing <https://apps.apple.com/app/id320606217>; R-bloggers analysis (2°)
12. Oura tags: <https://ouraring.com/blog/custom-smart-tags/>
13. Bearable Factor Effect report: <https://bearable.app/support/howto/the-factor-effect-report/>
14. Daylio stats and Year in Pixels: <https://daylio.net/faq/?p=5703>, <https://daylio.net/>
15. WHOOP journal impacts: <https://www.whoop.com/thelocker/a-new-way-to-see-insights-on-which-behaviors-affect-your-recovery/>
16. How We Feel / Mood Meter: App Store story <https://apps.apple.com/us/story/id1647059928>, <https://www.unh.edu/health/mood-meter> (2°)
17. Rise energy schedule: <https://help.risescience.com/hc/en-us/articles/6654243671191-What-is-my-Daily-Energy-Energy-Schedule>, <https://www.risescience.com/llms.txt>
18. Calm Breathe Bubble: <https://support.calm.com/hc/en-us/articles/360000069973-Breathing-Exercises>
19. Bearable sharing with a medical team: <https://bearable.app/support/common-questions/how-to-share-data-with-a-doctor-therapist-or-other-medical-team-member/>
20. Finch: <https://www.mozillafoundation.org/en/privacynotincluded/finch-self-care-pet/> (2°)
21. Streaks: App Store listing <https://apps.apple.com/us/app/-/id963034692>
22. Habitify: App Store listing <https://apps.apple.com/us/app/habitify-routine-habit-tracker/id1111447047>; location reminders <https://intercom.help/habitify-app/en/articles/6113698-location-based-reminder>
23. Habitica custom rewards: <https://habitica.fandom.com/wiki/Creating_a_Unique_Experience> (2°)
24. Strides: <https://stridesapp.com/help/>, <https://www.stridesapp.com/faq.html>
25. Lifetick: <https://knowledge.lifetick.com/?p=986> (2°/old)
26. Todoist recurring dates: <https://todoist.com/help/articles/introduction-to-recurring-dates-YUYVJJAV>
27. TickTick: App Store listing <https://apps.apple.com/pl/app/id626144601?l=en-gb> (2°)
28. Monarch rules: <https://help.monarch.com/hc/en-us/articles/360048393372>
29. Copilot name rules: <https://help.copilot.money/en/articles/3971270-transaction-name-rules-for-categorization>
30. YNAB Age of Money: <https://support.ynab.com/en_us/ynab-glossary-a-guide-BJd80SORq>
31. Empower tools: <https://www.financialsamurai.com/personal-capital-retirement-planner-review> (2°), <https://www.roboadvisorpros.com/a-review-of-empowers-free-tools/> (2°)
32. Kubera: <https://kubera.com/blog/kubera-family-plan>, <https://www.kubera.com/net-worth-tracker>
33. Rocket Money: <https://rocketmoney.com/feature/manage-subscriptions>
34. CoinStats P/L: <https://u.today/coinstats-upgrades-profit-and-loss-calculation-module> (2°)
35. Delta: <https://apps.apple.com/us/app/id1288676542?l=en-us>, <https://support.delta.app/general/what-is-delta-cryptocurrency-ico-portfolio>
36. Zerion: <https://zerion.io>
37. Habitify import/export: see FORMATS.md (b)
43. "Multi" / "personalEverything": web searches 2026-10-31, no matching product (closest: TRAKL <https://play.google.com/store/apps/details?id=trakl.app>)

Earlier ZIGoals research this builds on: [../session-ai/COMPETITORS.md](../session-ai/COMPETITORS.md) (AI assistants
and mascots, 2026-10-28) and [../session-aj/COMPANIONS.md](../session-aj/COMPANIONS.md).
