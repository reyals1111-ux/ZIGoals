# Session AW, Part 3: simplicity — each pillar's first screen

Owner brief Part 3 and amendment 8: measure the "before" of each pillar's first screen so the builders can simplify and
the integrator can compare "after" with the same walk. Nothing in the app was changed for this.

## How it was measured

- Script: `/tmp/claude-0/-home-user-ZIGoals/feb6907a-3a1d-5b86-b3b9-c6c4bce185cd/scratchpad/tools/simplicity-walk.cjs` (scratchpad, not in the repo; re-run for "after" with
  `flock /home/user/aw-wt/.browser.lock node simplicity-walk.cjs <baseURL> after [outDir]`, then
  `node simplicity-tables.cjs simplicity-after.json` prints these tables). Raw "before" JSON: `simplicity-before.json`.
- Server: production build of the base, `main` 8fa8aa1d, at http://127.0.0.1:3102. Playwright Chromium, one browser,
  two tabs at once at most, under the machine-wide browser lock.
- Viewports: phone = iPhone 13 profile (touch, isMobile) with the viewport set to 390×844 as the specs do; desktop =
  1440×900. Reduced motion, time zone Europe/Amsterdam, clock fixed at Wed 25 Nov 2026 09:30, every `/api` call answered
  503 (as the specs do).
- Profiles: **empty** = `freshDevice` (tests/ah-helpers.ts: storage cleared, the welcome marked seen, the logo intro
  marked played); **Showcase** = Settings → "Load Showcase Demo" (as `loadShowcase`), then every page in that tab.
- Each page: loaded, `html[data-app-hydrated]` waited for, 1.8 s to settle, scrolled to the top, measured.
- **Main action**: the first control named per page (Habits = first "Complete …", Tasks = the "New task" field, Health =
  "Log food", Wealth = "Log spending" (also "+ Add asset"), Journal = Today's entry textarea, Notes = the capture box
  (also the "New note" field), Agenda = an add control, Goals = "+ Create a goal" (also the first "Open goal →", the way
  to a contribution), Today = "+ Quick add" (also the Checklist card and the first habit "Complete"), Settings = the
  first group (the sections list on a phone, the first group heading at 1440; there is no Settings search), NOVA =
  "Message NOVA"). **y** = document top of its box; **screens** = y / viewport height; **taps** = 0 when it is on the
  page as loaded, 1 when it is inside a closed fold or only in another view (y then measured after that tap).
  "First screen?" = the whole box is above the fold with no scroll (on a phone the fold is the tab bar, y 779).
- **Cards** (one rule, everywhere): an element in `<main>` whose class list has `panel` or `card` or a class ending in
  `-panel`/`-card`, or `[role=region]`, or a `<section>/<article>/<aside>` with `aria-label(ledby)`, or a `<details>`;
  visible and at least 24 px tall; top-level (no such ancestor); its top inside the first viewport height. The page
  header (the block holding the `<h1>`: Today's orbit hero, the pillar heroes) is not counted. Note that several pages'
  first screen is mostly that header: Today's hero is 497 px of an 844 px phone screen; the pillar heroes 263–285 px.
- **Empty cards**: first-screen cards that show zeros, "No … yet", "Nothing logged", "Not enough days" or a placeholder,
  confirmed by reading each card's text (the walk's own regex flag is in the JSON; it over-reports in the Showcase).

## Before (base 8fa8aa1d)

### phone 390x844 · empty profile

Viewport height 844 px; the fold is the top of the tab bar, y 779. "First screen?" = the whole control is above the fold with no scroll and no tap.

| Page | Main action | y | Screens | Taps | First screen? | First-screen cards | Empty cards on the first screen | Page (screens) |
|---|---|---:|---:|---:|---|---|---|---:|
| /app | Quick add<br><sub>also Checklist card: y 1367 (1.62)</sub><br><sub>absent: First habit "Complete"</sub> | 405 | 0.48 | 0 | yes | 1 <sub>Your first minute</sub> | Your first minute (setup prompt (no data yet)) | 6.22 |
| /app/goals | "+ Create a goal"<br><sub>absent: First goal "Open goal →" (way to a contribution)</sub> | 361 | 0.43 | 0 | yes | 0 | – | 4.95 |
| /app/habits | "+ New habit" / "Create a habit"<br><sub>absent: First "Complete"</sub> | 375 | 0.44 | 0 | yes | 1 <sub>Today’s rhythm</sub> | Today’s rhythm ("No habits yet") | 5.1 |
| /app/health | "Log food" | 357 | 0.42 | 0 | yes | 1 <sub>QUICK COUNTERS</sub> | QUICK COUNTERS (3 example counters at 0) | 6.19 |
| /app/wealth | "Log spending"<br><sub>also "+ Add asset": y 376 (0.45)</sub> | 627 | 0.74 | 0 | yes | 1 <sub>Your wealth in one view</sub> | Your wealth in one view (0 assets, "—" allocated/available) | 5.69 |
| /app/tasks | "New task" field | 697 | 0.83 | 0 | yes | 1 <sub>Today none open</sub> | Today ("none open") | 2.53 |
| /app/journal | Today's entry textarea (Write) | 598 | 0.71 | 0 | yes | 1 <sub>Write</sub> | Write (partly: "Three good things · None this month yet") | 7.36 |
| /app/notes | Capture box (Save to inbox)<br><sub>also "New note" field: y 885 (1.05), 1 tap (Notes view)</sub> | 494 | 0.59 | 0 | yes | 2 <sub>Capture; Today · Wed, 25 Nov 2026</sub> | Today · ("Nothing logged on this day yet") | 3.56 |
| /app/agenda | Add on the agenda (as loaded: "Add a task" link or an add button)<br><sub>also Day view "Add a task for &lt;day&gt;" field: y 1398 (1.66), 1 tap (Day view)</sub> | 953 | 1.13 | 0 | **no** | 0 | – | 4.03 |
| /app/nova | "Message NOVA" field | 780 | 0.92 | 0 | yes | 0 | – | 1 |
| /app/settings | First Settings group (sections list / first group) | 424 | 0.5 | 0 | yes | 2 <sub>Appearance; Data & privacy</sub> | – | 23.21 |

### desktop 1440x900 · empty profile

Viewport height 900 px. "First screen?" = the whole control is above the fold with no scroll and no tap.

| Page | Main action | y | Screens | Taps | First screen? | First-screen cards | Empty cards on the first screen | Page (screens) |
|---|---|---:|---:|---:|---|---|---|---:|
| /app | Quick add<br><sub>also Checklist card: y 1248 (1.39)</sub><br><sub>absent: First habit "Complete"</sub> | 431 | 0.48 | 0 | yes | 2 <sub>Your first minute; Start with what matters</sub> | Your first minute (setup prompt); Start with what matters (goal teaser, no goal yet) | 6.52 |
| /app/goals | "+ Create a goal"<br><sub>absent: First goal "Open goal →" (way to a contribution)</sub> | 309 | 0.34 | 0 | yes | 0 | – | 3.98 |
| /app/habits | "+ New habit" / "Create a habit"<br><sub>absent: First "Complete"</sub> | 265 | 0.29 | 0 | yes | 2 <sub>Today’s rhythm; Every rhythm begins with one step.</sub> | Today’s rhythm ("No habits yet"); Every rhythm begins (empty state) | 3.4 |
| /app/health | "Log food" | 258 | 0.29 | 0 | yes | 2 <sub>QUICK COUNTERS; Health highlights</sub> | QUICK COUNTERS (3 counters at 0); Health highlights ("No trend yet", "0 of 10 weigh-ins", coach waiting) | 8.4 |
| /app/wealth | "Log spending"<br><sub>also "+ Add asset": y 343 (0.38)</sub> | 573 | 0.64 | 0 | yes | 2 <sub>Your wealth in one view; ACCOUNTS · ASSETS · DEBTS</sub> | Your wealth in one view (0 assets); ACCOUNTS (All 0 · Accounts 0 · Debts 0) | 6.23 |
| /app/tasks | "New task" field | 597 | 0.66 | 0 | yes | 1 <sub>Today none open</sub> | Today ("none open") | 2.66 |
| /app/journal | Today's entry textarea (Write) | 596 | 0.66 | 0 | yes | 1 <sub>Write</sub> | Write (partly: Three good things none) | 5.91 |
| /app/notes | Capture box (Save to inbox)<br><sub>also "New note" field: y 894 (0.99), 1 tap (Notes view)</sub> | 471 | 0.52 | 0 | yes | 2 <sub>Capture; Today · Wed, 25 Nov 2026</sub> | Today · ("Nothing logged on this day yet") | 3 |
| /app/agenda | Add on the agenda (as loaded: "Add a task" link or an add button)<br><sub>also Day view "Add a task for &lt;day&gt;" field: y 1109 (1.23), 1 tap (Day view)</sub> | 708 | 0.79 | 0 | yes | 1 <sub>23 Nov – 29 Nov 2026 0 items</sub> | 23 Nov ("0 items", "Nothing planned" × 7) | 3.32 |
| /app/nova | "Message NOVA" field | 811 | 0.9 | 0 | yes | 0 | – | 1 |
| /app/settings | First Settings group (sections list / first group) | 381 | 0.42 | 0 | yes | 1 <sub>How your data is stored</sub> | – | 3.2 |

### phone 390x844 · Showcase

Viewport height 844 px; the fold is the top of the tab bar, y 779. "First screen?" = the whole control is above the fold with no scroll and no tap.

| Page | Main action | y | Screens | Taps | First screen? | First-screen cards | Empty cards on the first screen | Page (screens) |
|---|---|---:|---:|---:|---|---|---|---:|
| /app | Quick add<br><sub>also Checklist card: y 1607 (1.9); First habit "Complete": y 3403 (4.03)</sub> | 406 | 0.48 | 0 | yes | 1 <sub>What is due now</sub> | – | 10.62 |
| /app/goals | "+ Create a goal"<br><sub>also First goal "Open goal →" (way to a contribution): y 1023 (1.21)</sub> | 362 | 0.43 | 0 | yes | 2 <sub>Browse Goals; Emergency fund</sub> | – | 12.92 |
| /app/habits | First "Complete"<br><sub>also "+ New habit" / "Create a habit": y 376 (0.45)</sub> | 2004 | 2.37 | 0 | **no** | 1 <sub>Today’s rhythm</sub> | – | 13.54 |
| /app/health | "Log food" | 358 | 0.42 | 0 | yes | 1 <sub>QUICK COUNTERS</sub> | QUICK COUNTERS (partly: Pull-ups, Squats "none yet") | 8.16 |
| /app/wealth | "Log spending"<br><sub>also "+ Add asset": y 377 (0.45)</sub> | 661 | 0.78 | 0 | yes | 1 <sub>Your wealth in one view</sub> | – | 10.34 |
| /app/tasks | "New task" field | 949 | 1.12 | 0 | **no** | 1 <sub>Today 2 tasks · 1 overdue in all</sub> | – | 3.92 |
| /app/journal | Today's entry textarea (Write) | 733 | 0.87 | 0 | **no** | 1 <sub>Write</sub> | – | 14.75 |
| /app/notes | Capture box (Save to inbox)<br><sub>also "New note" field: y 988 (1.17), 1 tap (Notes view)</sub> | 597 | 0.71 | 0 | yes | 1 <sub>Capture</sub> | – | 4.62 |
| /app/agenda | Day view "Add a task for &lt;day&gt;" field<br><sub>absent: Add on the agenda (as loaded: "Add a task" link or an add button)</sub> | 2214 | 2.62 | 1 | **no** | 1 <sub>23 Nov – 29 Nov 2026 72 items</sub> | – | 11.24 |
| /app/nova | "Message NOVA" field | 780 | 0.92 | 0 | yes | 0 | – | 1 |
| /app/settings | First Settings group (sections list / first group) | 469 | 0.56 | 0 | yes | 2 <sub>Appearance; Data & privacy</sub> | – | 23.6 |

### desktop 1440x900 · Showcase

Viewport height 900 px. "First screen?" = the whole control is above the fold with no scroll and no tap.

| Page | Main action | y | Screens | Taps | First screen? | First-screen cards | Empty cards on the first screen | Page (screens) |
|---|---|---:|---:|---:|---|---|---|---:|
| /app | Quick add<br><sub>also Checklist card: y 1531 (1.7); First habit "Complete": y 3047 (3.39)</sub> | 456 | 0.51 | 0 | yes | 2 <sub>What is due now; Your wallet On this device</sub> | – | 15.11 |
| /app/goals | "+ Create a goal"<br><sub>also First goal "Open goal →" (way to a contribution): y 1264 (1.4)</sub> | 332 | 0.37 | 0 | yes | 2 <sub>Browse Goals; Emergency fund</sub> | – | 8.97 |
| /app/habits | First "Complete"<br><sub>also "+ New habit" / "Create a habit": y 288 (0.32)</sub> | 2461 | 2.73 | 0 | **no** | 2 <sub>Today’s rhythm; SMALL RETURNS ADD UP</sub> | SMALL RETURNS (partly: "Not enough days yet (7)" in Trend per habit) | 9.81 |
| /app/health | "Log food" | 281 | 0.31 | 0 | yes | 2 <sub>QUICK COUNTERS; Health highlights</sub> | QUICK COUNTERS (partly: 2 of 3 "none yet"); Health highlights (partly: "7 of 10 weigh-ins") | 11.67 |
| /app/wealth | "Log spending"<br><sub>also "+ Add asset": y 366 (0.41)</sub> | 689 | 0.77 | 0 | yes | 1 <sub>Your wealth in one view</sub> | – | 12.35 |
| /app/tasks | "New task" field | 708 | 0.79 | 0 | yes | 1 <sub>Today 2 tasks · 1 overdue in all</sub> | – | 2.86 |
| /app/journal | Today's entry textarea (Write) | 734 | 0.82 | 0 | yes | 1 <sub>Write</sub> | – | 10.3 |
| /app/notes | Capture box (Save to inbox)<br><sub>also "New note" field: y 974 (1.08), 1 tap (Notes view)</sub> | 551 | 0.61 | 0 | yes | 2 <sub>Capture; Today · Wed, 25 Nov 2026</sub> | – | 3.46 |
| /app/agenda | Day view "Add a task for &lt;day&gt;" field<br><sub>absent: Add on the agenda (as loaded: "Add a task" link or an add button)</sub> | 2023 | 2.25 | 1 | **no** | 1 <sub>23 Nov – 29 Nov 2026 72 items</sub> | – | 9.83 |
| /app/nova | "Message NOVA" field | 811 | 0.9 | 0 | yes | 0 | – | 1 |
| /app/settings | First Settings group (sections list / first group) | 404 | 0.45 | 0 | yes | 1 <sub>How your data is stored</sub> | – | 10.31 |

<sub>Agenda rows were re-measured with the same script (`SIMPLICITY_PAGES=/app/agenda`) once the Day-view candidate was
added; every other row is from one full run.</sub>

## Worst offenders

Main action more than one screen down, or not whole on the first screen, on a phone:

1. **Habits, Showcase: the first "Complete" is 2.37 screens down** (y 2,004 at 390; 2.73 screens, y 2,461 at 1440).
   Above it: Today's rhythm, Vacation and Habit ideas, eight filter chips and Sort (y 728–1,117), then the Morning
   group and its first habit card (Read, already done today; about 520 px with its Details, Set or add a value,
   Consistency & trends, Challenge, History & reflection and Private notes rows) before Exercise's "Complete".
2. **Today, Showcase: the first habit "Complete" is 4.03 screens down** (y 3,403; 3.39 at 1440), inside "Your whole
   life" (a 5,247 px block). The **Checklist card is 1.62–1.90 screens down** in both profiles on a phone (1.39–1.70
   at 1440); the orbit hero (497 px) and "What is due now" (885 px in the Showcase, 329 px empty) sit above it.
3. **Agenda: no add control on the Week view in the Showcase.** Adding needs a tap on Day, then the "Add a task for …"
   field is 2.62 screens down (y 2,214; 2.25 at 1440). Empty profile: the "Add a task" link is at 1.13 screens (y 953,
   under the tab bar) and it leaves for Tasks.
4. **Tasks, Showcase: the "New task" field is 1.12 screens down** (y 949, under the tab bar at 779). The fr-layout spec
   guards only the empty profile (y 697 there). The query-syntax help text ("Words match titles and notes. Also
   #project, @label …") and Select/Filter sit above the field.
5. **Journal, Showcase: Today's entry starts at y 733 and runs under the tab bar** (box to 875). The Energy scale (five
   buttons) and Three good things come first.
6. **Goals: a contribution is never on the first screen.** "+ Create a goal" is (y 361); the first "Open goal →" is
   1.21 screens down (y 1,023) and a contribution needs that tap and more. The cards carry no contribute button.
7. **Notes: "New note" needs a tap (Notes view) and is then 1.05–1.17 screens down** (y 885–988, both viewports).

Zero-state cards on a first screen (empty profile unless said):

8. **Health:** "Quick counters" (three example counters at 0) is the first card under "Log food", ahead of the diary;
   at 1440 "Health highlights" ("No trend yet", "0 of 10 weigh-ins", the coach waiting) is on the first screen too. In
   the Showcase two of the three counters still read "none yet".
9. **Wealth:** the hero shows "0 assets · 0 automatic · 0 manual" with "—" allocated and available; at 1440 "Accounts ·
   Assets · Debts" with All 0 / Accounts 0 / Debts 0 / Assets 0 / Needs attention 0 is also on the first screen.
10. **Habits:** "Today's rhythm: No habits yet" (phone and 1440); at 1440 the empty-state card "Every rhythm begins
    with one step" repeats it right below.
11. **Today at 1440:** two setup prompts side by side, "Your first minute" and "Start with what matters", and no data.
12. **Agenda at 1440:** a week of "Nothing planned" × 7 ("0 items"). **Notes:** the day panel "Nothing logged on this
    day yet" (both viewports). **Tasks:** "Today · none open" (it holds the field, so it stays).

Long pages (scrollHeight / viewport height, phone): Settings 23.2 (empty) / 23.6 (Showcase); Journal 7.4 / 14.8;
Habits 5.1 / 13.5; Goals 5.0 / 12.9; Today 6.2 / 10.6 (15.1 at 1440); Wealth 5.7 / 10.3; Health 6.2 / 8.2.

### Zero-state cards below the first screen

- Empty profile: Today "What is due now" (No active goal yet · No water logged yet) and most of "Your whole life", "The
  last 7 days" (1440); Goals "Your body, your measure" (No health goals yet), "Finished, with a story", "Your timeline"
  (no target date yet); Health "Today's nourishment", Breakfast/Lunch/Dinner/Snacks ("Nothing logged yet" × 4),
  Hydration (0 mL), and at 1440 Sleep, Workouts (0 this week), the fasting Timeline, "Seven days of care · nothing
  logged"; Wealth "Accounts · Assets · Debts" (phone) and Spending ("No weekly budget"); Journal "Entries" (No entries
  yet); Notes "Ask about my notes"; Goals "Start from something proven" (templates, a teaser).
- Showcase: Habits "The person behind the habits" ("Write your first line") and "Trend per habit: Not enough days yet
  (7)"; Today and Goals "Your life areas" (Relationships, Career: "Nothing here yet"); Today "Make Today yours" and "The
  last 7 days" (no goal contributions most days) at 1440; Wealth "Portfolio pulse" ("0 of 2 market prices current";
  partly because `/api` answers 503 in this walk).

## Tools that look advanced or optional (candidates for "More" / "Customise"; nothing changed)

- **Today:** the welcome header and "See how it works"; Your coach (inside "What is due now"); inside "Your whole
  life" (5,247 px on a phone in the Showcase): Destinations in motion, Your daily rhythm, Care for your day, Wealth with a purpose, Your
  day, Your daily balance, Goals and Your goals (two goal blocks), Money / Next money steps (Value Bitcoin, Value
  Ethereum); then Your widgets / Your snapshot, Your life areas, For you, Your wallet (simulated ZIG, reward reserve),
  Updates and summaries, Your progress.
- **Goals:** the Cards / Vision board / Tree switch, Search and Sort (above the first goal), Ask ZIGi, Back up private
  data, Goals to reach zero (debts), From Chess, Health goals ("Your body, your measure"), Life balance, Goal templates,
  Hall of achievements, Timeline / Milestones ahead.
- **Habits:** Vacation, Habit ideas, the eight filter chips and Sort (above the first habit); in every habit card
  Details (timer, Set or add a value, Consistency & trends, the weeks as a table, More history, Challenge, History &
  reflection, Private notes); This week, Your areas this week, Who you are becoming, Perfect days, Year view, Your notes
  and moods, Workout and contribution rules, Routines (about 1,600 px), Your last 30 days, Trend per habit, Consistency
  by weekday, Best streaks, Habit journal timezone.
- **Health:** Quick counters and Health highlights above the diary; the date stepper; per-meal nutrient totals; Name
  your meals; A moment to check in; Drink, caffeine, energy, sugar; Estimate a meal from a photo; Scan a barcode;
  Supplements and medication; A note for a harder week; Cycle log; Import a nutrition CSV; Sleep, Workouts, fasting
  Timeline, Seven days of care (1440).
- **Wealth:** Hide amounts, Ask ZIGi, Back up private data; Portfolio pulse; the five holdings filter chips; Add money;
  Spending's Search all your entries, This month by category, Money tools (calculators, scenarios); Explain recorded
  wealth change and its "Exact source record" rows; Your progress.
- **Tasks:** Shortcuts, Import / export, Files; the views This evening, Someday, Priority matrix, Completed, More
  views; the query-syntax help above the field; More options on the add row.
- **Journal:** the Energy scale and Three good things above the entry; the formatting bar (Bold … Highlight colour);
  Use this question / Another question / Don't ask this again / In het Nederlands; Link another day; Open it later, as
  a letter; Start from a prompt; Photos and a voice note; Prompt packs; Write it out; Check a thought; On this day; Sun
  and moon; Daily word goal; Reminder to write; Search by date; Every answer to a prompt; Your own scales; Your week;
  Energy, the last 14 days; Year in squares; Patterns; Import and export; Privacy.
- **Notes:** the Graph, Canvas and Files views; Add a photo and Speak a note beside Save; the day panel's links and
  "Ask about my notes" on the default view.
- **Agenda:** "Today as a timeline", the teach links (Add a habit, Plan a meal, Add a bill, Turn on the weekly review,
  Add a task), Show: Choose kinds, Export to a calendar, Import a calendar.
- **NOVA:** the "Start the guide / Not now" banner, Quick access, the six suggestion chips (My day … Tracked wealth),
  Speak to NOVA. The page is one screen; the field is on it.
- **Settings:** on a phone 23 screens. Behind their own groups already, but long: Wallet & network (advanced),
  Advanced diagnostics, Point & tell, Chess, Music, My links, Market data, Encrypted account sync, Your own AI page by
  page, Reminders when closed ("Not available here"), Delete cloud records.

## After (build of `0a301f33`)

The same walk (`simplicity-walk.cjs`, the same clock, profiles and views) on a production build of the integrated branch
after Part 3 (simplicity a, b and c) and the batches that touched first screens. Per page: the main action's document y
(and screens = y ÷ viewport height), the taps it needs, and the first-screen cards and zero-state cards counted the same way.

**Totals:** first-screen cards 51 → 49; zero-state cards on a first screen 19 → 18; every main action at 0 taps, as before.
**Main actions higher:** Agenda (phone, empty) 1.13 → 0.86 screens, Journal 0.71 → 0.64, Tasks 0.83 → 0.73. **Lower:**
Settings, by about 100 px in every view, because the new Settings search (simplicity c) now stands above the first group
and is itself the way to any setting. Every other main action is where it was.

### Today and Habits: the Checklist and the first Complete

| View | Action | before y (screens) | after y (screens) |
|---|---|---|---|
| /app phone · empty | Quick add | 405 (0.48) | 405 (0.48) |
| /app phone · empty | Checklist card | 1367 (1.62) | 1159 (1.37) |
| /app phone · empty | First habit "Complete" | not on the page | not on the page |
| /app/habits phone · empty | First "Complete" | not on the page | not on the page |
| /app/habits phone · empty | "+ New habit" / "Create a habit" | 375 (0.44) | 375 (0.44) |
| /app desktop · empty | Quick add | 431 (0.48) | 431 (0.48) |
| /app desktop · empty | Checklist card | 1248 (1.39) | 1026 (1.14) |
| /app desktop · empty | First habit "Complete" | not on the page | not on the page |
| /app/habits desktop · empty | First "Complete" | not on the page | not on the page |
| /app/habits desktop · empty | "+ New habit" / "Create a habit" | 265 (0.29) | 264 (0.29) |
| /app phone · showcase | Quick add | 406 (0.48) | 406 (0.48) |
| /app phone · showcase | Checklist card | 1607 (1.9) | 692 (0.82) |
| /app phone · showcase | First habit "Complete" | 3403 (4.03) | 1417 (1.68) |
| /app/habits phone · showcase | First "Complete" | 2004 (2.37) | 1389 (1.65) |
| /app/habits phone · showcase | "+ New habit" / "Create a habit" | 376 (0.45) | 376 (0.45) |
| /app desktop · showcase | Quick add | 456 (0.51) | 456 (0.51) |
| /app desktop · showcase | Checklist card | 1531 (1.7) | 704 (0.78) |
| /app desktop · showcase | First habit "Complete" | 3047 (3.39) | 1323 (1.47) |
| /app/habits desktop · showcase | First "Complete" | 2461 (2.73) | 789 (0.88) |
| /app/habits desktop · showcase | "+ New habit" / "Create a habit" | 288 (0.32) | 288 (0.32) |

The Showcase's Today has the Checklist on the first screen in both views now (0.82 and 0.78 screens; it was 1.9 and 1.7),
and the first habit's Complete within two screens (1.68 and 1.47; it was 4.03 and 3.39). On the Habits page the first
Complete moves from 2.37 to 1.65 screens on a phone and from 2.73 to 0.88 on a computer.

### Every page, before → after

| Page | View | Main action | y before → after (screens) | taps | first-screen cards before → after | zero-state on first screen before → after |
|---|---|---|---|---|---|---|
| /app | phone · empty | Quick add | 405 (0.48) → 405 (0.48) | 0 | 1 → 1 | 1 → 1 |
| /app/agenda | phone · empty | Add on the agenda (as loaded: "Add a task" link or an add button) | 953 (1.13) → 730 (0.86) | 0 | 0 → 1 | 0 → 1 |
| /app/goals | phone · empty | "+ Create a goal" | 361 (0.43) → 361 (0.43) | 0 | 0 → 0 | 0 → 0 |
| /app/habits | phone · empty | "+ New habit" / "Create a habit" | 375 (0.44) → 375 (0.44) | 0 | 1 → 1 | 1 → 0 |
| /app/health | phone · empty | "Log food" | 357 (0.42) → 357 (0.42) | 0 | 1 → 1 | 1 → 1 |
| /app/journal | phone · empty | Today's entry textarea (Write) | 598 (0.71) → 544 (0.64) | 0 | 1 → 1 | 1 → 1 |
| /app/notes | phone · empty | Capture box (Save to inbox) | 494 (0.59) → 494 (0.59) | 0 | 2 → 2 | 1 → 1 |
| /app/nova | phone · empty | "Message NOVA" field | 780 (0.92) → 780 (0.92) | 0 | 0 → 0 | 0 → 0 |
| /app/settings | phone · empty | First Settings group (sections list / first group) | 424 (0.5) → 524 (0.62) | 0 | 2 → 2 | 0 → 0 |
| /app/tasks | phone · empty | "New task" field | 697 (0.83) → 614 (0.73) | 0 | 1 → 1 | 0 → 0 |
| /app/wealth | phone · empty | "Log spending" | 627 (0.74) → 627 (0.74) | 0 | 1 → 1 | 0 → 0 |
| /app | desktop · empty | Quick add | 431 (0.48) → 431 (0.48) | 0 | 2 → 2 | 2 → 2 |
| /app/agenda | desktop · empty | Add on the agenda (as loaded: "Add a task" link or an add button) | 708 (0.79) → 736 (0.82) | 0 | 1 → 1 | 1 → 1 |
| /app/goals | desktop · empty | "+ Create a goal" | 309 (0.34) → 308 (0.34) | 0 | 0 → 0 | 0 → 0 |
| /app/habits | desktop · empty | "+ New habit" / "Create a habit" | 265 (0.29) → 264 (0.29) | 0 | 2 → 2 | 1 → 0 |
| /app/health | desktop · empty | "Log food" | 258 (0.29) → 257 (0.29) | 0 | 2 → 1 | 2 → 1 |
| /app/journal | desktop · empty | Today's entry textarea (Write) | 596 (0.66) → 541 (0.6) | 0 | 1 → 1 | 1 → 1 |
| /app/notes | desktop · empty | Capture box (Save to inbox) | 471 (0.52) → 470 (0.52) | 0 | 2 → 2 | 1 → 1 |
| /app/nova | desktop · empty | "Message NOVA" field | 811 (0.9) → 811 (0.9) | 0 | 0 → 0 | 0 → 0 |
| /app/settings | desktop · empty | First Settings group (sections list / first group) | 381 (0.42) → 480 (0.53) | 0 | 1 → 1 | 0 → 0 |
| /app/tasks | desktop · empty | "New task" field | 597 (0.66) → 560 (0.62) | 0 | 1 → 1 | 0 → 0 |
| /app/wealth | desktop · empty | "Log spending" | 573 (0.64) → 572 (0.64) | 0 | 2 → 2 | 1 → 1 |
| /app | phone · showcase | Quick add | 406 (0.48) → 406 (0.48) | 0 | 1 → 1 | 0 → 0 |
| /app/agenda | phone · showcase | Add on the agenda (as loaded: "Add a task" link or an add button) | 2214 (2.62) → 838 (0.99) | 0 | 1 → 1 | 0 → 0 |
| /app/goals | phone · showcase | "+ Create a goal" | 362 (0.43) → 362 (0.43) | 0 | 2 → 1 | 0 → 0 |
| /app/habits | phone · showcase | First "Complete" | 2004 (2.37) → 1389 (1.65) | 0 | 1 → 1 | 0 → 0 |
| /app/health | phone · showcase | "Log food" | 358 (0.42) → 358 (0.42) | 0 | 1 → 1 | 1 → 1 |
| /app/journal | phone · showcase | Today's entry textarea (Write) | 733 (0.87) → 597 (0.71) | 0 | 1 → 1 | 0 → 0 |
| /app/notes | phone · showcase | Capture box (Save to inbox) | 597 (0.71) → 597 (0.71) | 0 | 1 → 1 | 0 → 0 |
| /app/nova | phone · showcase | "Message NOVA" field | 780 (0.92) → 780 (0.92) | 0 | 0 → 0 | 0 → 0 |
| /app/settings | phone · showcase | First Settings group (sections list / first group) | 469 (0.56) → 569 (0.67) | 0 | 2 → 2 | 0 → 0 |
| /app/tasks | phone · showcase | "New task" field | 949 (1.12) → 714 (0.85) | 0 | 1 → 1 | 0 → 1 |
| /app/wealth | phone · showcase | "Log spending" | 661 (0.78) → 661 (0.78) | 0 | 1 → 1 | 0 → 0 |
| /app | desktop · showcase | Quick add | 456 (0.51) → 456 (0.51) | 0 | 2 → 2 | 0 → 0 |
| /app/agenda | desktop · showcase | Add on the agenda (as loaded: "Add a task" link or an add button) | 2023 (2.25) → 798 (0.89) | 0 | 1 → 1 | 0 → 0 |
| /app/goals | desktop · showcase | "+ Create a goal" | 332 (0.37) → 332 (0.37) | 0 | 2 → 2 | 0 → 0 |
| /app/habits | desktop · showcase | First "Complete" | 2461 (2.73) → 789 (0.88) | 0 | 2 → 1 | 1 → 0 |
| /app/health | desktop · showcase | "Log food" | 281 (0.31) → 280 (0.31) | 0 | 2 → 2 | 2 → 2 |
| /app/journal | desktop · showcase | Today's entry textarea (Write) | 734 (0.82) → 621 (0.69) | 0 | 1 → 1 | 0 → 0 |
| /app/notes | desktop · showcase | Capture box (Save to inbox) | 551 (0.61) → 551 (0.61) | 0 | 2 → 2 | 1 → 1 |
| /app/nova | desktop · showcase | "Message NOVA" field | 811 (0.9) → 811 (0.9) | 0 | 0 → 0 | 0 → 0 |
| /app/settings | desktop · showcase | First Settings group (sections list / first group) | 404 (0.45) → 503 (0.56) | 0 | 1 → 1 | 0 → 0 |
| /app/tasks | desktop · showcase | "New task" field | 708 (0.79) → 622 (0.69) | 0 | 1 → 1 | 0 → 1 |
| /app/wealth | desktop · showcase | "Log spending" | 689 (0.77) → 688 (0.76) | 0 | 1 → 1 | 0 → 0 |
