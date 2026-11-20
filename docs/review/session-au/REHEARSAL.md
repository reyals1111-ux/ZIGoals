# Session AU — the friends dress rehearsal (friction log)

Five fresh profiles, each a first week compressed with Playwright's clock (Mon 23 Nov → Tue 24 Nov → Sun 29 Nov 2026,
mornings and evenings, Europe/Amsterdam), on a production build (`PUBLIC_ALPHA_UNDEPLOYED`, the code of `main`
`836534c3` = Alpha #57), each at 390 (iPhone 13 profile) and 1440, in Nebula and one more theme (Sanne Light, Tom Dark,
Lina Light, Max Dark, Jules Light). Fixtures only: food lookup, Earn, market quotes and mempool are recorded answers;
every other `/api` call answers 503; no other host is reached. The walks are scripts in the session's scratchpad
(screenshots and console logs per step); each walk was reviewed by the integrator and by one fresh helper given only
the persona's goal and the routes (rows marked **R**).

Severity: **Blocker** (cannot do what they came for), **Major** (gets it done only with help, or is told something
wrong), **Minor** (slows or puzzles). Verdict: **Fixed** (spec named), **Carried** (cause), **Holds** (not a fault).

| Id | Persona | Page | Width | What happened | Severity | Verdict |
|---|---|---|---|---|---|---|
| S-1 | Sanne | /app/goals/new (from the first five) | 390, 1440 | "Set a goal" opens a page that says "This page is hidden — show it again": the setup left Goals out of the menu because she picked Habits and Health. | Major | Fixed F-1 |
| S-2 | Sanne | /app/nova, ZIGi | all | 4 of 7 NOVA questions and 2 of 4 ZIGi questions (water, sleep) answer "Health is off" and name three switches and a Today section. **R** agrees (Major). | Major | Fixed F-2 (one "Allow Health" in NOVA → Permissions, reply buttons) |
| S-3 | Sanne | ZIGi | all | Dutch Health questions answered in English ("Health isn't shared with ZIGi…"). **R** | Major | Fixed (D-ALLOW-HEALTH, HEALTH_CLOSED_NL) |
| S-4 | Sanne | /app after setup | 390, 1440 | Right after finishing the setup (no starter goal), Today asks "Set up ZIGoals in about a minute · Start setup" above "Your first five". | Major | Fixed F-3 |
| S-5 | Sanne | /app/health (from "Log a meal") | 390, 1440 | The first five promises "what you ate, in your own words", but the phone sheet opens on "Build a food library… Add your first food" and Quick add needs kcal and a portion. No meal logged. **R** | Major | F-MEAL (in progress) |
| S-6 | Sanne | /app/nova | all | "Wat is mijn reeks voor water drinken?" (streak) answered with the month's count, partly in English. **R** | Major | R-1 (in progress) |
| S-7 | Sanne | ZIGi | all | "Welke dag heb ik mijn water gemist?" is about her habit "Water drinken"; answered with the Health refusal. **R** | Major | R-12 (in progress) |
| S-8 | Sanne | /app day 7 | 390 | Right after a reload, Today is 409 CSS px wide for under a second (the phone top bar's actions and tab row reach 409, then settle at 390); the full-page capture caught it, and the Checklist card is still loading in it. Not seen after load at any width (overflow probe on every page of every walk). **R** (also Tom's reviewer) | Minor | Carried (transient on reload; element named in ADR-044) |
| S-9 | Sanne | /app/goals/new | all | A sleep goal ("Elke nacht 8 uur slapen") starts as "Save an amount · USD"; the "Keep an average instead" link is small. **R** rates it Blocker. | Major | Fixed F-6 |
| T-1 | Tom | /app/nova, ZIGi | all | Calories, protein, weight trend, workouts: every Health question answers "Health is off" (as S-2). | Major | Fixed F-2 |
| T-2 | Tom | /app/nova | all | "What did I lift today?" → "On the stage: Day at a glance." | Major | R-2 (in progress) |
| T-3 | Tom | ZIGi | all | "How far did I run this week?" → "That isn't something I can answer…" (the GPX run is in Workouts). | Major | R-3 (in progress) |
| T-4 | Tom | /app/health barcode | all | A barcode with a wrong check digit: the app says why and keeps Look up disabled. | — | Holds |
| L-1 | Lina | ZIGi | all | "Did any bill go up in price?" answered with the upcoming bills. | Major | R-6 (in progress) |
| L-2 | Lina | /app/wealth, /app/nova | all | The bank file's "Fictional Grocer" rows were filed under Other, so the €250 Groceries budget and both assistants said €0 spent (€165.15 real). **R** rates it Blocker. Real shop names (Albert Heijn, Jumbo, Lidl…) were already read; "grocer", "bakery", "butcher" (and NL) were not. | Major | Fixed (L-2 words) |
| L-3 | Lina | /app/nova | all | "when will my next bill be due" → "No goal is called 'next bill be'". | Major | R-11 (in progress) |
| M-1 | Max | /app/nova | all | "What day is it?" at 01:30 (his day ends at 03:00) is not answered. | Major | R-4 (in progress) |
| M-2 | Max | /app/nova | all | "How many days this week did I finish my checklist?": raw "11-23" dates, "0 perfect orbits" although Nov 24 was 4 of 4, and his "done at 3 dots" rule ignored. | Major | R-5 (in progress) |
| J-1 | Jules | /app/nova | all | "What is bitcoin worth today?" → "Nothing is tracked on Wealth yet." | Major | R-7 (in progress) |
| J-2 | Jules | /app/nova | all | "What would I earn if I staked 100 ZIG?" → "No income logged yet." | Major | R-8 (in progress) |
| J-3 | Jules | /app/nova | all | "How much BTC do I have?" (no holdings, a goal "First 0.01 BTC") answered with the goal's progress. | Major | R-9 (in progress) |
| J-4 | Jules | ZIGi | all | "Is staking ZIG safe?" → a generic "can't answer". | Minor | R-10 (in progress) |
| J-5 | Jules | ZIGi | all | "Should I buy bitcoin now?" → refuses advice and offers facts. | — | Holds |
| S-10 | Sanne | /app/nova | all | Dutch answers carry English dates and an all-English Life review card. **R** | Minor | Carried (the app's interface is English; Dutch is the answers' language only) |
| S-11 | Sanne | /app (hero) | all | "YOUR FINANCIAL ORBIT … = Tomorrow's Wealth" for a person with no money interest. **R** | Minor | Holds (protected: Today hero and slogan) |
| S-12 | Sanne | /app/health sleep | 390, 1440 | The "Night saved." note covers the 7-day averages for a moment. **R** | Minor | Carried (next polish pass) |
| S-13 | Sanne | locale | all | US formats (09:30 PM, mm/dd/yyyy, USD). **R** | — | Holds (the walk's browser was set to en-US; the app follows the browser's locale) |
| M-3 | Max | /app at 01:30 | 390, 1440 | Today's line "0 of 4 habits" beside the Checklist's "3 of 4" (his day ends at 03:00). **R** Blocker | Major | Fixed F-4 |
| M-4 | Max | /app/tasks, Today | 390, 1440 | At 01:30 on his Monday, Monday's tasks already "Overdue". **R** Blocker | Major | Fixed F-5 (Tasks follow the day end) |
| M-5 | Max | /app/nova | 1440 | "1 task is overdue" while the stage's Overdue widget says 2. **R** Blocker | Major | R-13 (in progress) |
| M-6 | Max | /app/nova | 390 | "Days not done this week": 4, although under his 3-dot rule only Wed–Fri were missed. **R** | Major | R-14 (in progress) |
| M-7 | Max | /app/agenda | 390 | A task ticked at Wed 02:30 (his Tuesday) filed as done on Wed. **R** | Major | Fixed F-5 (the task's done day follows the day end) |
| M-8 | Max | /app/nova clock | all | NOVA's clock shows the calendar date (TUE NOV 24) while its answers treat Monday as today. **R** | — | Holds (a clock tells the time; answers follow the person's day) |
| M-9 | Max | /app/goals/new | all | "Read 12 books" becomes "Save an amount · USD"; step 1 shows "Create goal" beside "Continue". **R** | Major | Fixed F-6 (hint); the two buttons: Carried (AT D20, a design call) |
| M-10 | Max | /app/checklist | 390, 1440 | The full-screen celebration has no visible words or close. **R** | Minor | Carried (Escape and a tap close it; a visible close is a Checklist design call, its orbit path is protected) |
| M-11 | Max | /app/tasks | 390 | "Email Sam about the weekend" saved as "Email Sam about" due "the weekend". **R** | Minor | Holds (the quick-add reads dates in words; the preview shows it before saving) |
| M-12 | Max | /app/tasks, habits | 390, 1440 | The "Added…" note covers the new row; filter chips cut off without a scroll hint; P3 missing from the priority list. **R** | Minor | Carried (next polish pass) |
| L-4 | Lina | /app/wealth bills | all | The phone bill (€15.00 → €17.50, four monthly charges) was never offered as a bill and its rise showed nowhere. **R** | Major | Fixed (L-4) |
| L-5 | Lina, Jules | export goals.csv | all | A €3,000 target reads "300000" (base units beside a decimals column). **R** | Major | Fixed (L-5: readable amount columns) |
| L-6 | Lina | /app/wealth import | all | The import preview has no category column; a wrong category is fixed only afterwards under "To review". **R** | Major | Carried (an import-sheet design change; "To review" works) |
| L-7 | Lina | /app/wealth budgets | all | A weekly-budget card says "No weekly budget" beside her monthly one; the monthly budget sits folded at the bottom. **R** | Minor | Carried (Wealth layout pass) |
| L-8 | Lina | /app (hero) | 1440 | An "Onchain · ZIGChain vision" tile in Today's hero; Earn never pushed (0 Earn requests). **R** | — | Holds (protected hero) |
| L-9 | Lina | ZIGi | all | ZIGi titled "AI Companion" with a "Premium" badge while every answer says "no AI". **R** (also Jules) | Minor | Carried (naming across ZIGi's panel; the plan badge is the owner's) |
| J-6 | Jules | /app/wealth | all | The watch-only address is found by no search word and sits behind "Look up an address" in Wealth's fourth section. **R** | Major | Fixed (J-6 search entry) |
| J-7 | Jules | /app/earn | 390, 1440 | Full-page captures show thousands of px of empty card shells and no rate. **R** | Major | checking on the integration build |
| J-8 | Jules | /app/markets | all | Every card says "Price unavailable · Needs value". **R** | — | Holds (the walk answered market assets with 503; a fixture gap, not the app) |
| J-9 | Jules | setup | all | With Crypto chosen, the goal is still in USD or EUR, so "First 0.01 BTC" is a €900 target. **R** | Minor | Holds (a count goal "Reach a number of something" takes BTC; F-6's hint does not cover coins) |
| J-10 | Jules | ZIGi | all | The staking answer leaves out the unbonding wait. **R** | Minor | R-10 (in progress) |
| T-5 | Tom | /app/health barcode | all | An answer that could not be read said only "Lookup failed." | Minor | Fixed (T-5) |
| T-6 | Tom | /app/nova | 1440 | Header "READS · … Health off" while Day at a glance showed "2 food entries logged today". **R** | Major | Fixed T-6 (privacy) |
| T-7 | Tom | /app/health workouts | 390 | The set row is cramped: the Set menu shows ":", "Remove" cut to "Rem", the ✓ half outside the card. **R** | Major | checking on the integration build |
| T-8 | Tom | /app/health barcode | 390 | "Use this barcode" covers a recent scan's name. **R** | Major | checking on the integration build |
| T-9 | Tom | Habits vs workouts | all | Logging squats never ticks the "Gym" habit. **R** | Minor | Holds (two records by design, as meditation and the Meditate habit, ADR-042 D21 item 7) |
| T-10 | Tom | /app/health weight | all | Today shows 86.1 kg, the trend tile 86.4 ("smoothed"). **R** | — | Holds (labelled smoothed) |
| T-11 | Tom, Lina | export | all | The export page talks of "the encrypted backup" beside a banner saying browser records "are not a backup"; the restore hint names "Settings → Your data". **R** | Minor | open |
