# Lane 2 — polish with fresh eyes (branch `lane2/polish`, from `lane2/batch3`)

Source: the design review `scratchpad/polish.md` (40 findings: P-1 … P-6 Major, P-7 … P-40 Minor). Each finding: fixed (the
commit's area) or left (the cause). Specs: `apps/web/tests/av2-polish-{folds,forms,today,habits,tasks,wealth,health}.spec.ts`
(shared steps in `av2-polish-helpers.ts`); unit test `apps/web/lib/av2-polish-format.test.ts`. The specs were run against
the 3101 build (lane2/batch3, without these changes) to check every selector: each new assertion failed there on the old
look, as expected; they need the lead's rebuild to go green.

Protected areas: none touched. P-1 is not in the protected list (Today hero and slogan, Checklist orbit, footer finale, swan
intro, shell navigation, NOVA, ZIGi); it restores the accepted Life overview (AB-Design P7): Session AP's `RovingGroup
contents` wrapper had come between `.life-rings` and its `.life-ring` links, so none of P7's child rules matched. No redesign.

No stored change, no new key, no dependency, nothing new always visible on Today (P-6 and P-39 let existing text wrap to a
second line; P-1 makes the phone's Life overview shorter: 2 × 2 tiles instead of four run-together rows).

## Findings

| id | verdict | what changed (files) | spec |
|---|---|---|---|
| P-1 Major | fixed (Today) | `RovingGroup` takes `role`/`label`, so the group *is* `.life-orbit-daily.life-rings` again and the four `.life-ring` links are its children: the phone's 2 × 2 tiles and the desktop rows (pillar, title, figure, line on their own lines) match again (`ui/roving-group.tsx`, `platform/today-intelligence.tsx`) | today: 2 × 2 at 390, stacked lines at 1440, 3 themes, 320 |
| P-2 Major | fixed (shared) | one shared rule in `ui/ui.css`: `label.check-row` plus a list of the labels whose own rules set a flex row but no direction; inside containers only a label that opens with its checkbox/radio (`:has(> input)`). Found by a sweep of every page and fold (Showcase, 390): Sleep's evening plan, evening choices, morning steps, focus window, Budgets' On Today, money search, Journal switches and thought traps, cycle chips, health reminders, food choices, body-figure radios, Settings import choice, and 30 more rules of the same shape. Card tiles with a radio above their words keep their look | forms: box beside words (box middle on the first text line, words right of it), 3 themes × 390/1440 |
| P-3 Major | fixed (shared) | one fold marker in `ui/ui.css`: ▸ folded, ▾ open (the journal's "Start from a prompt" marker), a glyph swap that never moves (Motion Off or not), `::-webkit-details-marker` hidden so WebKit shows one; on every listed fold class, and `summary.fold-summary` as the shared class (a 44 px row) | folds: every listed summary on Workouts, Habits, Tasks, Spending, Budgets, Health at 390/1440, ▾ once open, Motion Off still |
| P-4 Major | fixed (Tasks) — **labelled deliberate change** | `tasks/tasks.css`: the phone wrap rule lost to the later `ul {display:grid}` and `.tasks-nav-item {width:100%}`; it now wins (chips that wrap) and the views stand above the list (Session AL A10-11 had moved them below because of the 545 px of full-width rows; the cause is gone). Computers keep the side column. No existing spec pinned the order | tasks: nav ends above the list, ≤ 520 px, chips share rows; side by side at 1440 |
| P-5 Major | fixed (Wealth) | `phone/phone-wealth.css`: Spending joins the headings whose button goes under the words on a phone | wealth: words ≥ 260 px wide, button below, title one line |
| P-6 Major | fixed (Today) | `habits/habits.css`: the auto check-in note spans the compact row and opens it; `phone/phone-today.css`: full width under the controls on a phone | today: note ≥ 300 px wide and ≤ 2 lines at 1440, ≥ 240 px at 390 |
| P-7 | fixed (Tasks) | `.tasks-week-nav` grid 44 px · title · 44 px; "This week" (back to now) on its own row (`tasks-plan-views.tsx`, `tasks-plan.css`) | tasks: ← and → same top at 390 and 320 |
| P-8 | fixed in part (Tasks) | the Table and "Planned and spent" carry the app's edge cue (`useScrollEdges`: `data-more-right/left`); a task name keeps 240 px on a computer. Left: fewer columns on phones (every column is sortable and specs sort by Priority; hiding columns removes data from the view) | tasks: edge cue right, then left after scrolling |
| P-9 | fixed in part (Tasks) | Table, Timeline and This week say their name to screen readers only; on screen the inner heading is what is new ("5 open", the dates). Left: "Today 2 tasks · 2 overdue in all" — `grok53/release/rr-ai-tasks.spec.ts:127` reads "N overdue in all" from that heading | tasks: accessible name kept, visible part is the count |
| P-10 | fixed in part (Tasks) | the matrix button reads "Move to urgent and important →" (its accessible name unchanged). Left: ↑ ↓ Focus Edit Remove into a ⋯ menu (a row-menu component Tasks does not have; four specs drive these buttons by name) and the checkbox (already `accent-color` in the theme's cyan, globals.css) | tasks: every move reads "Move to … →" |
| P-11 | fixed in part (Today) | two small widgets side by side share one height (`phone/phone-today.css`). Left: a last odd widget spanning both columns — `session-x-findings.spec.ts:185` pins every compact widget under 0.6 of the row ("Today stays short") | today: equal heights per row |
| P-12 | fixed (Today) | the fold row's hint is the chevron alone ("Show more (12)" says Show once); the row's name is pinned by `for-you.spec.ts:19` (`^Show more \(\d+\)$`) | today: hint has no words, chevron shown |
| P-13 | fixed in part (Health) | the Water card's eyebrow is "TODAY · HYDRATION" ("A sip at a time." once, by the ring). Left: "1,000 mL recorded" (`persona-z.spec.ts:243`) and "No water entries yet" (`grok53 nb-081`) are pinned; folding the custom form behind Change changes the CI2 "Water card within a screen" layout other specs measure | health: eyebrow ≠, line once |
| P-14 | fixed (Health, Wealth) | `isDayStart()` in `lib/visual-format.ts`: a moment exactly at the day's start (how a Showcase record made today is stored, `lib/showcase-moment.ts`) shows its date alone — water entries and manual valuations (`platform/common.tsx`) | health: no "12:00 AM" on the Water card; unit test |
| P-15 | fixed in part (Health) | an empty meal shows "Add to Breakfast" (opens the log form for that meal, as extra meals' "Log to …" does) and no empty "—" chip ("No entry" still read aloud). Left: Edit/Remove into the food's ⋯ (they are the swipe row's actions on a phone; moving them changes the swipe and specs that tap them) | health: button ≥ 44 px opens the form; dash hidden; 3 themes |
| P-16 | fixed (Health) | the one marker on every fold of that stack: "Name your meals…", "Import a nutrition CSV", the lazy folds (meal photo, weekly budget, check-in, symptoms, copy a meal), "Seven days of care", Cycle log, Nutri-Score, "Adjust my calorie target", "Already at home" (`fold-summary`) | folds (Health) |
| P-17 | left | the fiber note stays in the Carbs tile: `av2-revb2b-net-carbs.spec.ts:67` pins it there (review b2b #4) | — |
| P-18 | left | stacking the heading above the ring below 480 px lengthens Health's phone page, whose screens are pinned (`pillar-phone-length`: health fresh 7.0, Showcase 8.2); this change set already adds the meal buttons there. For the lead to weigh with the measured headroom | — |
| P-19 | fixed (Health) | tabs 44 px at every width; at ≥ 1200 px a 2 px gap and 10 px padding so the eleven fit one row (`health.css`) | health: 44 px, one top |
| P-20 | fixed (Health, Light) | new hand-written Light part `apps/web/themes/light.av2-polish.css`: the counters' icon tile by day is a wash of the brand colours (theme tokens), not navy | (lead: regenerate the theme sheets) |
| P-21 | fixed (Health) | scores `nowrap`; the formula in a "How this is worked out" fold (`sleep-score-card.tsx`, `health-aa.css`) | health: parts one line; formula hidden until opened |
| P-22 | fixed in part (Health) | the latest five nights, then "Show all N" (`aria-expanded`, `aria-controls`). Left: the 40 px gap above Edit/Delete and the last-7-days explanations (not reproduced in the markup: the gap comes from the lazy dreams line's own box; 2 attempts not made — time-boxed, named for a follow-up) | health: 5, then more |
| P-23 | fixed (Health) | ranges in a 4-column row (2 × 2 under 360 px) | health: one top |
| P-24 | fixed in part (Health) | under 600 px the figure's 10 px labels are hidden (the list under it names every group, its % and a word); wider they are 11 units (≈ 15 px at 460 px). Left: the table's set count beside the volume | — |
| P-25 | fixed (Health) | Workouts' switches are chips (outlined, chosen filled, theme tokens); history dates "Nov 21" (year only when not this year); figures `nowrap` | health: border and radius |
| P-26 | fixed (Health) | "In het Nederlands" is a quiet text link with `lang="nl"` beside "Another tip" (its button role and name are pinned by `av2-water-day`, `av2-exercise-library`, `av2-library-filters`) | — |
| P-27 | left | habit card actions on the title row and an auto-fill grid: the card's heading row is shared with the star and ⋯ menus other specs measure (`habit-look`, `focus-habit`); not attempted in this pass — next for a follow-up | — |
| P-28 | fixed (Habits) | every area chip and list tool outlined, the chosen one filled (`habits-aa.css`) | habits: border ≥ 1 px |
| P-29 | fixed (Habits) | a step with its unit is 14 px semibold like Done (`habit-step-amount`) | habits: 14 px |
| P-30 | left | "Share or add" in the Routines header: not attempted in this pass — next for a follow-up | — |
| P-31 | fixed in part (Habits) | "No habits yet" and a line pointing to the Create button below (the empty state's own primary button; a second "Create" here would give two buttons of one name) | habits: fresh text |
| P-32 | fixed in part (Wealth) | an entry's day as "Sun, Nov 22" (`<time>`). Left: the "Showcase data" note on each entry is the entry's own note in the shared `lib/showcase-data.ts` | wealth: no ISO date, weekday format |
| P-33 | left | a EUR cash account in the Showcase changes Wealth's pinned Showcase counts (13 assets on Today's Life overview and others) | — |
| P-34 | left | regrouping Money tools' chips and folding Budgets' empty forms: not attempted in this pass — next for a follow-up | — |
| P-35 | fixed (Wealth) | the "300.00 by 2026-12" formats were already fixed on this base by `4dab95f0` (B2A-7, formatters); the Plan button keeps one right-hand column (grid) | wealth: rights within 2 px, beside its line; no "YYYY-MM)" |
| P-36 | left | the repeated title inside the "Budgets by category" fold: not attempted in this pass — next for a follow-up | — |
| P-37 | fixed | priority chips 14 px (`tasks.css`), budget table headers 14 px (`budgets.css`), Life-ring pillar names 14 px (`pillar-hero.css`), part-of-day headings 14 px (`habits-aa.css`) | today, tasks, wealth |
| P-38 | fixed in part | 44 px: Health tabs, every `.fold-summary`, Spending's category drill (min-width). Left: `.text-link` at 24 px on computers (`globals.css:1409`) is a page-wide rule (WCAG 2.5.8's 24 px), raising it moves every page's links | health: tabs |
| P-39 | fixed (Today) | the meals line wraps to two lines (`line-clamp: 2`) on a phone (`health.css`) | — |
| P-40 | fixed in part (Wealth) | "All" counts as all assets: "Build your wealth picture" (`wealth-view.tsx`). Left: the account row's "Sheet" into ⋯ | wealth: fresh title |

## CSS files touched (for the theme sheets: the lead regenerates)
`components/ui/ui.css`, `components/pillar-hero.css`, `components/phone/phone-today.css`, `components/phone/phone-wealth.css`,
`components/habits/habits.css`, `components/habits/habits-aa.css`, `components/tasks/tasks.css`, `components/tasks/tasks-plan.css`,
`components/wealth/budgets/budgets.css`, `components/wealth/spending/spending.css`, `components/health/health.css`,
`components/health/health-aa.css`, `components/health/sleep/sleep.css`, `components/health/workouts/workouts.css`,
`components/health/workouts/muscle-freshness.css`; new Light part `apps/web/themes/light.av2-polish.css`.

## For the lead
- Shard lists: add `av2-polish-folds`, `-forms`, `-today`, `-habits`, `-tasks`, `-wealth`, `-health`.
- Specs to re-run beside these after the rebuild: `today-screens` (Showcase ceiling 11.5), `pillar-phone-length` (Health: the
  meal buttons), `session-x-findings` (compact widgets), `for-you`, `phone-folds`, `today-phone-folds`, `sleep`,
  `av-sleep-long`, `av-sleep-score`, `av2-task-planning`, `ar-matrix-drag`, `ap-priority-matrix`, `persona-z`, `health-aa`.
- Help / What's new: none needed (polish of existing features). One line if wanted: "Polish: folds show that they open,
  checkboxes sit beside their words, and Tasks' views are above the list on a phone."
- No NOVA/ZIGi answers (no new data), no stored change, no device key, no catalogue/export entry.
