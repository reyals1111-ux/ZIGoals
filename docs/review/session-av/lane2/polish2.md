# Lane 2 — polish, part 2 (branch `lane2/polish2`, from `lane2/polish`)

Source: the design review `scratchpad/polish.md`, the three findings the first pass (`polish.md` in this folder) did not
reach: P-27, P-34 and the rest of P-22. Same shared rules as the first pass (`summary.fold-summary` and its ▸/▾ marker in
`ui/ui.css`, `tests/av2-polish-helpers.ts`). Theme variables only; 44 px targets; copy ≥ 14 px.

The CSS of P-27 and P-22 (night cards) and of P-34 (Money tools' pairs) was tried on the 3101 build (lane2/batch3) by
injecting the changed rules into the live page at 320, 390 and 1440 px (Nebula, Light, Dark) and measuring: titles beside
Edit/★/⋯, the lone card in two columns, no sideways scroll, the night card's gap 10 px (was about 49 px), each pair one
even row. The new spec assertions were run there to check their selectors: they fail on the old look, as expected, and
need the lead's rebuild to go green.

Protected areas: none touched. No stored change, no new key, no dependency, nothing new on Today.

## Findings

| id | verdict | what changed (files) | spec |
|---|---|---|---|
| P-27 | fixed (`fc546e12`, Habits) | Edit, ★ and ⋯ share the title's row: the eyebrow keeps the card's whole width above them (AF Gate C's one-line "BUILD · WELLBEING"), the schedule line under them; with the focus badge, the badge sits between eyebrow and title. A container query on the card (`habit-card`, ≥ 280 px inside), so a 320 px phone or large text keeps the buttons' own row and a title never has under about 120 px. Above 1050 px (where cards stand side by side) the grid is `repeat(auto-fit, minmax(min(320px, 100%), 1fr))`: two cards share a section's row, a lone card takes it whole and reads in two columns (words left; today's controls, ticks, the two-day line and the 28 days right; Details under both). The 28 days are at most 440 px wide. CSS only (`habits/habits-ab.css`) | `av2-polish-habits`: title and Edit on one row, ⋯ after Edit, eyebrow above, at 390 and 1440; at 1440 in three themes every 1- and 2-card section filled edge to edge, the lone card's controls and 28 days right of its first third and Details under them, 28 days ≤ 441 px; 320 no sideways |
| P-34 | fixed (`abae83ab`, Wealth) | Money tools: three labelled groups of two — Review (To review, Rules), Your entries (Split an entry, Receipt photos), Plan ahead (Next 60 days, If something happens to me) — each an even two-column row (a long name wraps in its own button), the three side by side where there is room; a count of 0 is not shown but still read ("To review (0)", `g1b-review-cards` pins it). Budgets: on a device with nothing set up (no budget, nothing watched, no payee, no challenge, no budget of its own) pay periods, watching, your own budgets, payees and challenges wait in one "More budget tools" fold (`fold-summary`, what it holds named under its title) after "+ Set a monthly budget". Decided once when the tools first show: what a person starts inside the fold never folds it away under them; a device with anything set up (the Showcase) sees the tools as before (`money-tools.tsx`, `money-tools.css`, `budgets-month.tsx`, `budgets.css`) | `av2-polish-wealth`: the three named groups, two buttons each, same top and width, ≥ 44 px, 3 themes × 390/1440; fresh: "(0)" hidden but in the name, the fold closed after the first step with ▸, no extra form visible, opened (▾) shows them; the Showcase has no fold. **Labelled deliberate change** in `av-watch.spec.ts` (it seeds no budget): checks the fold closed and Watching hidden, opens it, then the same steps and checks |
| P-22 (rest) | fixed (`ca43648e`, Health) | The empty band above a night's Edit/Delete was not the dreams line but margins: the page's `.fine` (12 px above, 20 px below the quality line) and `.actions`' own 20 px; inside a night's card they are 0, the card's 10 px gap is the one space. "Your last 7 days": how Sleep debt, Sleep balance, Bedtime and Wake-time consistency are worked out waits behind "What is this?" (`fold-summary`, its name says which tile: "What is this? (Sleep debt)"); the figures and the short facts ("6 nights logged", "Short nights only: …", the naps line, and the "Needs …" hints while a figure is not there yet) stay on the tile (`sleep/sleep-view.tsx`, `sleep/sleep.css`). The explanation texts are unchanged and still in the page's text (`sleep.spec`, `sleep-balance-focus-aj`, `life-p15b-built` read them with toContainText) | `av2-polish-health`: per theme at 390, 10 px (4–16) from a night's last line to its buttons on all five, four folds with ▸ and 44 px, the explanations hidden until opened, figures in view, axe; at 1440 the folds 44 px and no margin under a night's lines or around its buttons |

## CSS files touched (for the theme sheets: the lead regenerates)
`components/habits/habits-ab.css` (P-27, a new `@container habit-card` block), `components/wealth/money-tools/money-tools.css`,
`components/wealth/budgets/budgets.css`, `components/health/sleep/sleep.css`.

## For the lead
- Shard lists: nothing new (the assertions are in the first pass's `av2-polish-habits`, `-wealth`, `-health`).
- Specs to re-run beside these after the rebuild: Habits — `session-ac` (row heights, −/+/Done lined up), `habits-routines-block`
  (card gaps in a section), `run10-shared-visuals` (320 px, 125 % text), `av-focus-habit`, `phone-refinements`, `persona-z`,
  `habit-look*`; Wealth — `av-watch` (changed), `g1b-review-cards`, `g1b-cash-forecast`, `g1b-money-photos`,
  `wiring-wealth`, `wiring-2-photo-send`, `journeys/j03-money-month`, `journeys/j11-keyboard-names`, `av2-money-notices`,
  `av2-money-left-month`, `av2-money-own-budgets`, `av2-money-space`, `av2-budget-periods`, `av2-polish-folds`; Health —
  `sleep`, `sleep-balance-focus-aj`, `grok53/p15/life-p15b-built`, `av-rows`, `pillar-phone-length` (Sleep is shorter).
- NOVA/ZIGi answers that name "Wealth → Budgets → Your own budgets / Watching payees / Challenges" stay true: on a fresh
  device those sit one tap further, in "More budget tools", whose summary names them. No answer or corpus change.
- Help / What's new: none needed (polish). One line if wanted: "Polish: habit cards keep their buttons beside the title, Money
  tools come in three small groups, and a new Budgets page starts with one step."
- No stored change, no device key, no catalogue/export entry, nothing always visible on Today.
