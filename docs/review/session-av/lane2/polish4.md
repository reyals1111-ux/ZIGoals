# Lane 2 — polish, part 4 (branch `lane2/polish4`, from `lane2/batch6`)

Owner follow-up 6, step 4: every lane-2 screen brought up to the design language and readability rules. Nothing new: no
feature, row, card or option added; only what exists made to follow the rules. Earlier passes (`polish.md`, `polish2.md`)
were not redone.

How it was found:
- **Static sweep** of the CSS lane 2 added since `807f247e` (2,768 added lines in 104 sheets) and the TSX it added: font
  sizes under 14 px and body copy at 14 px; fields under 16 px that beat the app's phone rule (`globals.css`, ≤ 900 px);
  `min-height`/`min-width` under 44 px on controls; animations and transitions without a Motion Off or reduced-motion
  guard; hover rules and pointer handlers; plain `<h2>` titles; button names for the same action; `lang="nl"` offers.
- **Browser sweep** on this branch's dev server (port 3106), Showcase, 390 px, Nebula, Light and Dark, every `<details>`
  opened: Today, Goals, Habits, Health (all eleven tabs, and Sleep, Meditation and Workouts), Tasks, Wealth (with Bills
  and Budgets), Journal, Notes, Agenda, Journey, Timeline, Review, Settings. Measured: every text's rendered size (SVG
  text by its screen scale), every field's size, every control's box (a checkbox or radio by its label), every `h2`'s
  paint, and axe over the page. Motion: Meditation, Sleep and Workouts' whole text compared with Motion Off and with
  reduced motion. Dutch: every "In het Nederlands" pressed on Health, Journal and Tasks, and the Dutch parts' text read.

Protected areas: none touched (Today hero and slogan, Checklist orbit, footer finale, swan intro, shell navigation, NOVA,
ZIGi). The accepted baseline is not redesigned. No dependency, no stored change, no new key, no first-paint script: the
TSX changes are inside lane-2 components that load with their page or fold. No answer or corpus text changes (no answer,
help text or search entry names a renamed button).

## Fixes

| rule | screen | before → after | commit | check |
|---|---|---|---|---|
| headings white → nebula | Health → Workouts: Shoes, Races ahead, Distance goals and training load, Progress, Exercises and how-tos | plain white `h2` → `NebulaFlow` (the token of Health's feature cards, `SectionHeading`, Journey) | `818accf3` | `av2-polish4-health` (3 themes: gradient paint, transparent fill, axe); `lib/av2-polish4-css.test.ts` |
| headings white → nebula | Health: BMI and milestones, When you eat, Foods high in a nutrient, How you felt, Week by week, Weigh-in reminder; Sleep: Your timing, Your week beside your usual | same | `818accf3` | `lib/av2-polish4-css.test.ts` |
| headings white → nebula | Journey: the monthly theme (both states), Start again at level 1; Journal: Import and export; Notes: Canvas; Tasks: Files | same (a theme's symbol stays outside the flow, `aria-hidden`) | `818accf3` | `lib/av2-polish4-css.test.ts` |
| labels ≥ 14 px | Habits → a habit's longer history (strength chart) | axis words were SVG text that shrank with the chart: about 6 px at 390 → HTML beside and under the chart, 14 px at every width, secondary text token, `aria-hidden` (the chart's name holds the series) | `8601c58e` | `av2-polish4-charts` (3 themes × 390/1440: ≥ 14 px, in order, beside/under, axe, 320 no sideways); unit |
| labels ≥ 14 px | Journal → Your own scales → How your scales went | axis words about 10 px → the same HTML pattern, 14 px | `8601c58e` | `av2-polish4-charts`; unit |
| body text 15–16 px | Health: an empty meal's line; body r6: "How this is counted/worked out" texts and the help line; Help: chain note and search line; Journal: an import's left-out list; Money: the average line | 14 px → 15 px | `8601c58e` | unit |
| inputs ≥ 16 px on phones | Journal: the format bar's select | 0.95rem (15.2 px) → 16 px up to 900 px | `1029667e` | unit |
| inputs ≥ 16 px on phones | Notes: marks select, board-card select, table cells | 15 px → 16 px up to 900 px | `1029667e` | unit |
| inputs ≥ 16 px on phones | Workouts: Plan a workout, Add a race | 14 px (outside `.health-page`, so Health's older 14 px won) → 16 px, as `.health-page` has | `1029667e` | `av2-polish4-health` (3 themes, 390); unit |
| tap targets ≥ 44 px | Journal: a template's Edit; Tasks: Files; Notes: cover and page-colour choices; Journal: a journal's colour choices; Money: year-to-date category buttons | 28, 36, 36, 41 and 27 px wide → at least 44 px | `1029667e`, `8601c58e` (journal colour) | `av2-polish4-targets` (3 themes, 390); unit |
| tap targets ≥ 44 px | Settings → Switch to ZIGoals → From Daylio, Habitica or YNAB | each app a 25 px row → 44 px | `1029667e` | `av2-polish4-targets`; unit |
| consistent wording | Agenda (an event's travel), Notes (a canvas card's words, a line's label), Wealth (an account's share and group, a card's limit and days, a loan, a repayment), Workouts (maximum heart rate) | "Keep" / "Keep it" for saving (elsewhere "Keep it" means "do not remove", 16 confirmations) → "Save" ("Change it" once set stays) | `cd972dfa` | specs follow the names: `av2-money-credit-card`, `-people`, `-sheet`, `av2-runna-r4`; unit |
| consistent wording | Wealth → Log spending → Keep as a saved entry | "Keep it" (in a form that has Save) → "Add to saved entries" | `cd972dfa` | `av2-money-quick-log`; unit |
| Dutch where NL is offered | Meditation → Today's practice | in Dutch, "Begin · N min with the bell", "Another one" and the note stayed English (`lang="en"`) → "Begin · N min met de bel", "Nog een", "Een geschreven oefening … Ontspanning, geen behandeling." | `c0e50b9d` | `av2-polish4-health` (3 themes); `av2-todays-practice` presses the Dutch Begin (deliberate); unit |
| Dutch where NL is offered | Workouts → routine library (in Dutch) | the English "Add a routine someone shared" tool inside the Dutch library was read as Dutch → marked `lang="en"` | `c0e50b9d` | unit |

Runs (dev server, desktop project, after the merge of the moved base): the three new specs (30 tests) and the 15 specs
named below for the renamed buttons and the charts, 74 of 74 passed; type check, eslint on every changed file, the rule
test and the G3 token test pass.

Checks commit: `89bfd5ee` (`lib/av2-polish4-css.test.ts`, `tests/av2-polish4-health.spec.ts`, `-charts.spec.ts`,
`-targets.spec.ts`). Merge of the moved base: `552d0bad` (three conflicts, both sides kept).

## Checked and already within the rules

- **Contrast ≥ 4.5:1**: axe over every swept page in Nebula, Light and Dark found no colour-contrast finding (nor any
  other); the new axis words and nebula titles are axe-clean in the new specs.
- **Motion Off and reduced motion**: every lane-2 animation and transition is guarded (`[data-motion]` from
  `useMotionAllowed`, `:root:not([data-app-motion=off])` with `prefers-reduced-motion: no-preference`, or a
  `reduce` override); Meditation, Sleep and Workouts read the same with motion on, Motion Off and reduced motion (only
  Meditation adds "Motion is off on this device…"). Nothing goes missing.
- **Liquid-glass hover**: no lane-2 code follows the pointer (the one `onPointerMove` is the canvas card's drag handle);
  lane-2 buttons use `primary`, `secondary`, `quiet` and `text-link`, which the glass registry already lifts.
- **Dutch**: the journal's question packs, the daily move, grounding, water, sleep and run tips, the exercise and routine
  libraries, the recipe book's and the Tasks gallery's Dutch read Dutch throughout.

## Left, with the cause

- **Older titles beside lane-2 ones stay plain white** (Sleep's Tonight, Workouts' Start a workout, Health's Log a
  meal., Wealth's What you have, …): not lane 2, and turning every page's titles nebula is a change to the accepted
  pages (owner's word needed). Note: in `premium.css`, `.wealth-section-heading > :is(h2, div > h2)` asks the title's parent to be the
  heading and a `div` at once, so a title one `div` down (Wealth's `header > div > h2`) is never matched and has been plain
  white (measured: no gradient on "What you have"); for the lead, if wanted.
- **Habits' titles** (`.habit-section-heading`: Who you are becoming, Trend per habit): Habits keeps its own accepted
  heading look (`premium.css`, AA-Cloud). **Timeline's "All day"** (the cycle line) is a band label like Night and
  Anytime. **Print documents** (the report, Tasks' print) and **dialogs showing a record's own name** (a note in focus,
  a store card) keep plain titles.
- **Pre-lane-2, under the rules**: `.note-tab-count` 13 px, `.cross-label` 13 px, Today's habit part-of-day glyph 12 px,
  the workout calendar's 41 px day cells, 14 px body lines in the timeline, recipe ingredients, insight cards and the
  nutrition timeline. Not lane 2.
- **14 px data rows kept**: tables, calendars, lists of amounts or dates, zone lines and chips are labels (≥ 14 px) by
  this pass's reading of the rule; body copy is running sentences. The canvas card's 14 px words stay: the cards are
  fixed-size boards that clip.
- **Lane-2 choice chips** (radio labels such as `r3-choice`, `food-plus-choice`, `spending-chip`) are not in the glass
  registry, like the app's older choice chips: adding them is a change to `liquid-glass.tsx`, the layout's first-paint
  script (route budgets).

## For the lead

- **Theme sheets: regenerate** (`scripts/themes/build-themes.mjs` reads every component sheet). CSS touched:
  `components/habits/habit-longer-history.css`, `components/scales/your-scales.css`, `components/health/health-aa.css`,
  `components/health/r6/body-r6.css`, `components/help/help.css`, `components/journal/journal.css`,
  `components/wealth/spending/insights/insights.css`, `components/journal/entry-format.css`, `components/notes/notes.css`,
  `components/health/r4/health-r4.css`, `components/journal-prompts/prompt-picker.css`, `components/tasks/tasks.css`,
  `components/wealth/spending/money-r5.css`, `components/import/import.css`. No hex, `white`, `black` or `rgb` added
  after any G3 block.
- **Shard lists**: add `av2-polish4-health`, `av2-polish4-charts`, `av2-polish4-targets`.
- **Specs to re-run beside them** (renamed buttons and moved axis words): `av2-money-credit-card`, `av2-money-people`,
  `av2-money-quick-log`, `av2-money-sheet`, `av2-runna-r4`, `av2-todays-practice`, `av2-notes-canvas`,
  `av2-habit-history`, `av2-scale-stats`, `av2-planned-workouts`, `av-own-templates`, `switch-more-ak`; and, for the
  titles, `av2-bmi-milestones`, `av2-oracle`, `av2-feelings-graph`, `av2-weigh-in`, `av2-sleep-usual`, `av2-sleep-r4`,
  `av2-areas-theme`, `av2-distance-goals`, `av2-exercise-library`.
- Help / What's new: none needed. NOVA/ZIGi answers: none name the renamed buttons; no corpus change.
