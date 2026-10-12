# Session AA-Cloud — before/after captures

Never merged. Production builds (`PUBLIC_ALPHA_UNDEPLOYED`, `next start`), this cloud sandbox's Chromium (standing in for
Chrome), reduced motion, Europe/Brussels, en-GB; full-page JPEG at 390 (phone, touch), 1024 and 1440 px, a new device
("empty", onboarding seen) and the Showcase. `capture.mjs` made them; `sheet.py` makes contact sheets.

## before/ — `32cb9c5` (Alpha #37), 2026-10-11
78 captures (13 pages × 3 widths × 2 states), no page errors, no sideways overflow (`before/report.json`).

## after/ — per part, with a "what's better" line each

### after/part1 — every page in order (`945f12a`), 78 captures, no page errors, no sideways overflow
Self-reviewed against the design rules (no overlap, no wrap inside a word, no text under 14 px, aligned, ≥ 44 px targets).
| Page | What's better |
|---|---|
| Today | "Today's focus" right under the hero (habits left, next goal step, one-tap water with Undo, sleep or the fast); the day's own cards (Habits, Health) come first, then Goals, Money, your widgets and the whole-life overview, each under a small heading; For you after the widgets; What's new and the weekly review at the end. Phone Showcase: Daily Habits from about 5,000 px down to about 1,050 px; Today 8.93 screens (was 9.6). |
| Wealth | The tracker row, then what you have, your assets and accounts; the perspective tools after; history and evidence at the end. Phone: holdings from the fourth screen to the second. |
| Staking | Your tracked positions first; on a phone the wallet and scenario tools follow them. |
| Activity | The feed comes before the favourites card. |
| Portfolio | Each portfolio's holdings right after its figures, then the chart and allocation. |
| Goals | Health goals with the cards, the milestone timeline after. |
| Settings | The index stays in view while scrolling (computers, tablets). |
| Help | The phone topic index in two even columns; ZIGi's section eyebrow on one line. |
| Every page | Section titles white → nebula; the system UI font (no Inter); 14 px phone tab labels; disabled controls readable (≥ 4.5:1). |
| Markets, Ecosystem, Chess, Health | Order unchanged (already in order); the shared heading look; a progress slot under each hero (renders nothing until AA-Local fills it). |


### after/part2 — Goals best in class (`8fe7f6c`), 42 captures, no page errors, no sideways overflow
Captured before Gate A's fixes; the Goals page itself is superseded by `after/part3-gateA` (header and figures moved).
| Page | What's better |
|---|---|
| Goals | Key figures (active, finished, with a plan, life areas); Cards, Vision board and Tree as three views; Life balance, Goal templates and the Hall of achievements as their own designed cards; average goals among the cards. |
| A goal's page | The pace forecast with its dashed estimate and range ("an estimate", never a promise), the plan (area, why, obstacle, if-then), the vision picture, sub-goals with their roll-up. |
| Templates | 42 templates in seven areas, searchable, each with its milestones and the habits that help. |
| New goal (wizard) | A template fills the name, steps and habits; the life area is picked in the same step. |
| Average goal | Its own page: the rolling average, the days it rests on, Health's days or your own entries. |

### after/part3-gateA — the calculator and Gate A's fixes (`ecc505b`), 36 captures, no page errors, no sideways overflow
| Page | What's better |
|---|---|
| Calculator (new) | Large fields with sliders, the figures and the stacked chart first (per-year tooltip, 10k/100k/1M markers, what-ifs as lines with a legend), milestones, the year-by-year table, saved scenarios; "an estimate; returns are not guaranteed" on every result. Phone: figures, chart, then inputs with a sticky result line. |
| Today | The whole-life overview leads the widgets again (Run10's approved hierarchy), then Your day, Goals (the agenda first), Money, Your widgets; each heading opens its group's first card. Phone: Today's focus as two tiles a row, nothing wider than the screen; the seeded demo stays within its 3.85-screen ceiling (today-screens spec, local). |
| Goals | One header action; the key figures and the view switch open the "Your goals" region, so the cards still follow one compact controls row; Milestones ahead stays last. |
| Wealth | The calculator's card after the perspective tools; Allocation and coverage stays the last section. |

### after/part4-8 — search, the Life review, Your data, the share page, Help and Today's cards (`c7debcd`), 36 captures and 12 close-ups, no page errors, no sideways overflow
| Page | What's better |
|---|---|
| Today (Showcase) | Life balance, pace forecasts and the calculator as cards kept on this device (chosen while arranging Today); life balance takes the whole row with its legend in columns; pace forecasts list the nearest estimated dates first, each "not a promise". Phone: each card is one folded row until opened. |
| Today: the chooser (`closeups/today-card-chooser-*`) | "Cards kept on this device": four on/off tiles, each saying what it shows; nothing synced changes. |
| Life review (new) | A week or a month beside the period before: highlights, wins, streaks, goals moved, trends ("never counted as zero"), net worth per currency; "On the same days" now shows two pairings with their day counts; last week's focus comes back. |
| Your data (new) | Where each part of your records lives, what this device holds and how much, what is never stored, copies, what ZIGi can see; read-only. |
| Share (new) | What another app shared waits on its own page with three choices (a goal, ask ZIGi, search); only http(s) links shown, never opened. |
| Search (`closeups/search-palette-*`) | One box, grouped results (pages, goals, templates, Help), the "Ask ZIGi" row says when ZIGi is off. |
| Help | Nine new answers, including "kept on this device for now" and what Safari on iPhone does not offer. |
| Calculator | Unchanged since part3; the Showcase now opens with its two saved scenarios. |
