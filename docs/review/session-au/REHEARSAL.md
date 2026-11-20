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
| S-8 | Sanne | /app day 7 | 390 | Today is 409 CSS px wide in a 390 px window (sideways scroll of about 19 px); the Checklist card is blank when first painted. **R** | Major | investigating |
| S-9 | Sanne | /app/goals/new | all | A sleep goal ("Elke nacht 8 uur slapen") starts as "Save an amount · USD"; the "Keep an average instead" link is small. **R** rates it Blocker. | Major | open |
| T-1 | Tom | /app/nova, ZIGi | all | Calories, protein, weight trend, workouts: every Health question answers "Health is off" (as S-2). | Major | Fixed F-2 |
| T-2 | Tom | /app/nova | all | "What did I lift today?" → "On the stage: Day at a glance." | Major | R-2 (in progress) |
| T-3 | Tom | ZIGi | all | "How far did I run this week?" → "That isn't something I can answer…" (the GPX run is in Workouts). | Major | R-3 (in progress) |
| T-4 | Tom | /app/health barcode | all | A barcode with a wrong check digit: the app says why and keeps Look up disabled. | — | Holds |
| L-1 | Lina | ZIGi | all | "Did any bill go up in price?" answered with the upcoming bills. | Major | R-6 (in progress) |
| L-2 | Lina | /app/nova | all | "How much did I spend on groceries?" → "nothing": the bank file's grocer rows are filed under Other, so the Groceries budget shows €0 of €250. | Minor | open |
| L-3 | Lina | /app/nova | all | "when will my next bill be due" → "No goal is called 'next bill be'". | Major | R-11 (in progress) |
| M-1 | Max | /app/nova | all | "What day is it?" at 01:30 (his day ends at 03:00) is not answered. | Major | R-4 (in progress) |
| M-2 | Max | /app/nova | all | "How many days this week did I finish my checklist?": raw "11-23" dates, "0 perfect orbits" although Nov 24 was 4 of 4, and his "done at 3 dots" rule ignored. | Major | R-5 (in progress) |
| J-1 | Jules | /app/nova | all | "What is bitcoin worth today?" → "Nothing is tracked on Wealth yet." | Major | R-7 (in progress) |
| J-2 | Jules | /app/nova | all | "What would I earn if I staked 100 ZIG?" → "No income logged yet." | Major | R-8 (in progress) |
| J-3 | Jules | /app/nova | all | "How much BTC do I have?" (no holdings, a goal "First 0.01 BTC") answered with the goal's progress. | Major | R-9 (in progress) |
| J-4 | Jules | ZIGi | all | "Is staking ZIG safe?" → a generic "can't answer". | Minor | R-10 (in progress) |
| J-5 | Jules | ZIGi | all | "Should I buy bitcoin now?" → refuses advice and offers facts. | — | Holds |
