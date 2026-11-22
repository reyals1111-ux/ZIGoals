# Lane 2 — phone-length (Health and Wealth back under their pinned phone screens)

Branch `lane2/phone-length` from `lane2/batch3` (`d2121ede`, which holds fixb3c). `tests/pillar-phone-length.spec.ts`
and its CEILING map are untouched (healthFresh 7.0, healthShowcase 8.2, wealthFresh 6.0, wealthShowcase 10.0).

**Needs the lead's rebuild** (JSX in every commit), then run: `pillar-phone-length`, and the specs changed below, and
beside them `phone-folds`, `health`, `health-daily`, `health-aa`, `session-ac`, `grok53/release/a10-life`,
`av2-polish-folds`, `av2-extra-meals`, `ap-money` specs touching Spending.

## How it was measured
Against the 3101 production build (`a45b6e3d`: no fixb3c, none of this work), 390×844, reduced motion, every `/api`
call 503, the spec's own steps, through the browser lock. "After" is measured by injecting, in a throwaway spec (not
committed), fixb3c's CSS, this branch's CSS and the same DOM moves the new markup makes (each part moved into a closed
`.phone-fold` row or `details`), then reading `scrollHeight / 844`. The rebuilt page can differ by a few px.

| key | before (as built) | before + fixb3c | after (injected) | ceiling | margin |
|---|---|---|---|---|---|
| healthFresh | 7.26 | 6.84 | **6.04** | 7.0 | 0.96 |
| healthShowcase | 9.11 | 8.96* | **8.06** | 8.2 | 0.14 |
| wealthFresh | 6.34 | 6.34 | **5.69** | 6.0 | 0.31 |
| wealthShowcase | 9.88 | 9.88 | 9.88 (unchanged) | 10.0 | 0.12 |

\* 8.96 includes this branch's closed-folds rule (−132 px); fixb3c alone does not change the Showcase (every meal has an entry).

Health Showcase, step by step (px): 7,693 → closed folds as 44 px rows 7,561 → Water settings row 7,040 → drink details
fold 6,876 → "Planned for this day" row 6,799. Wealth fresh: 5,350 → "Between you and others" row 5,141 → "Store and club
cards" row 4,803.

## What was folded (phones only: `usePhoneActive` / `PhoneFold`, or the phone media query; desktop markup unchanged —
the Water card's desktop JSX was checked to expand to exactly the old markup)

| page | part | lane-2 origin | on a phone now | commit |
|---|---|---|---|---|
| Health | Water card: "Your drinks" editor, "Reminders through the day", "Show a water tip each day" and its status | health r3 (#280–#283) | inside one row at the card's end, **"Your drinks, reminders and tips"** (`PhoneFold`, 56 px, Show/Hide, Motion Off and reduced motion as every phone row) | `cd776cba` |
| Health | Water card: the drink note ("Every drink counts…") and the water reminder form | Session AH/AL (not lane 2) | in the same row: the settings of the card sit together; the lane-2 parts alone did not bring the page under (see below) | `cd776cba` |
| Health | Water entry: Drink, Caffeine, Energy, Sugar | Energy/Sugar: health r3 (#282); Drink/Caffeine: AL | a fold under the amount, `details.health-water-drink` with `summary.fold-summary` "Drink, caffeine, energy, sugar (optional)" (44 px, ▸/▾ marker); it opens by itself while an entry noted as another drink or with caffeine is corrected, and when caffeine/energy/sugar needs fixing (then the field is focused) | `cd776cba` |
| Health | "Planned for this day" | food (q3 #29) | one row naming the plans ("Dinner · Pea soup", two named, "and n more") | `cd776cba` |
| Health | Diary's closed folds under the meals (meal photo, supplements, cycle log: `details.panel`) | AK/AL | closed: rows as tall as their 44 px summary (padding 0, 8 px apart); open: the panel as before. CSS only | `cd776cba` |
| Wealth | "Between you and others" (people money) | money r2 (#252, #253) | one row of Spending with what it holds ("1 person owes you · 2 lent or borrowed"; empty: "Money lent or borrowed, and shared costs") | `469377ff` |
| Wealth | "Store and club cards" | money r2 | one row ("2 cards to show at the till"; empty: "Loyalty and club cards, shown at the till"); the till dialog opens from Show inside it | `469377ff` |

Stays in view on a phone: the water ring, Add 250/500 mL, **your own drinks' one-tap buttons** (daily taps, not folded),
the drink energy line, the day's tip when on, the amount and Log water, today's water entries; every meal; Spending's
lists, search, insights, budget, Money tools.

Not folded, with cause: **Money tools** (493 px; Session AK lane M, not a lane-2 addition; Wealth fresh is under its
ceiling without it, and it shows in the Showcase, where folding it would move other specs). The meal-photo, barcode,
supplements, cycle and CSV folds were **not** gathered into one row: ~25 specs open them by their summaries on a phone;
the closed-rows CSS keeps them visible instead.

Why non-lane-2 parts are in the Water row: folding only the lane-2 parts of the Diary (r3 settings −220, drink
energy/sugar −54, day plans −82, the partial-day line and meal names ~−60) left Health Showcase at about 8.35–8.45, over
8.2. The water reminder and the drink note are the card's other settings, so they join the same row.

Margin note: Health Showcase is 0.14 screens (≈120 px) under its ceiling as injected. If the rebuilt page or CI's fonts
land over, the next fold with the least cost is the own-drinks one-tap row inside the same Water row (−126 px, ~7.91),
which I left visible on purpose (a daily one-tap action).

## Specs changed (each labelled `Session AV lane 2 (phone-length, deliberate)`; helper `tests/phone-length-folds.ts`)
`openPhoneRow(page, label, scope?)`: on a phone the row must exist once, be ≥ 44 px, closed, then open after a tap
(`aria-expanded="true"`); off a phone there must be **no** such row (desktop unchanged). `openDrinkDetails(page)`: on a
phone the drink fold exists and is opened; off a phone it must not exist.

| spec | step added |
|---|---|
| `av2-water-day` | open "Your drinks, reminders and tips" before `.r3-water` is checked; open the drink details before Drink/Energy |
| `grok53/health/gap-045-079-048-diary` | open the drink details before Drink/Caffeine (375 px run) |
| `reminders` (water test) | open the Water row before the reminder form |
| `push-reminders` (two places) | open the Water row before the reminder form / the "Get this on your phone" link (so `toHaveCount(0)` stays meaningful) |
| `storage-errors-health` (QA2-02 water reminder) | open the Water row first |
| `zigi-a11y-pass` (food log, water and counters) | open the Water row and the drink details before the axe audit, so the whole card is audited as before |
| `av2-food-minors` | on a phone the row names "Breakfast · Morning bowl", then it is opened |
| `av2-money-people` | on a phone the row says "1 person owes you", then it is opened and `.people-money` is visible |
| `av2-money-store-cards` | on a phone the row says what it is for, then it is opened and `.store-cards` is visible |

Checked as built (desktop project, current 3101 build): `av2-water-day`, `av2-money-people`, `av2-money-store-cards`,
`av2-food-minors`, `reminders`, `storage-errors-health` — 22/22 passed (the helpers' desktop path). The phone path
needs the rebuild.

## Other registry items
- Stored changes: none. Device keys / catalogue / export / erase: none. No dependency.
- CSS touched (layout only, theme variables unchanged; the lead regenerates the theme sheets): `components/health/health-aa.css`.
- Route weight: Health's first chunk gains a few hundred bytes (`daily-tools.tsx` uses `PhoneFold` and `usePhoneActive`,
  both already in the Health route); the r3, food-plus and Wealth parts are lazy chunks.
- Nothing on Today. No protected area touched.
- Help (EN), for the lead if wanted — Q: "On my phone, where are my drinks and water reminders?" A: "Health → Water: your
  own drinks stay as one-tap buttons; to make or change them, set reminders or turn on the daily tip, open "Your drinks,
  reminders and tips" at the end of the card. A drink's type, caffeine, energy and sugar are under the amount." What's
  new: none (a phone layout change).
- Typecheck green (through the lock); eslint clean on every changed file.
