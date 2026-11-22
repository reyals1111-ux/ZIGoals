# Lane 2 registry: Money, round 4 (`lane2/r4-money`)

Builder: the Money pillar, round 4 (LEDGER "Round 4: rows #300–#347", groups U4 and U8: rows #338–#347; COMPETITORS
"Ten more apps, round 4": Actual Budget, Lunch Money). Branch `lane2/r4-money`, cut from `lane2/batch3` (which holds all
lane 2 work, round 3 included). What lane 2 built in Money before is in `money.md`, `money-r2.md`, `r3-money.md` and
`revb2a.md`; nothing here repeats it.

**One spending figure.** Every spending and income figure these features show is summed by Wealth → Spending's own
functions — `totals` and `byCategory` in `apps/web/lib/money-log/engine.ts` and the shared rule in
`apps/web/lib/money-log/counted.ts` (an entry left out of the figures, both sides of a transfer and a Settle-up refund
are not counted; a shared cost counts the person's own share; a cost spread over months counts its share each month
through `budgetDayParts` / `budgetMonthParts`). Each feature below names the function its figures use. Every amount goes
through the app's money formatter (`moneyCents` → `formatCurrencyAmount`); every date and month through
`lib/visual-format.ts` (`formatDate`, `formatMonth`, `formatWeekday`); the Dutch answers write money with the `nl-NL`
locale ("€ 12,50") and dates as `dayIn('nl', …)` / `monthIn('nl', …)`. No money advice: plain figures and plain words.

## Stored changes (TIER 3, stored formats; commit `0c11c3aa`)

All additive and optional, on loose objects only, each `.optional().catch(undefined)`, so a value this build cannot read
is dropped on read and never fails the record. Both records (and the business space's money log, the same format) are
already in Export everything, the restore, the data catalogue and the account erase, so **no new key and no registry
entry is needed**. Older builds (#37–#57) keep the new fields untouched in the loose objects and count every entry as
before.

| record | field | what it holds | rows |
|---|---|---|---|
| `zigoals:money-log:v1` (and `…business`) entry | `checked` (a day) | the statement day the entry was checked against the bank | #340 |
| `zigoals:money-log:v1` (and `…business`) entry | `group` (`{id, name ≤ 40}`) | the group the entry is shown in (at most 20 entries a group) | #341 |
| `zigoals:money-log:v1` (and `…business`) | `archived` (`{expense?, income?}`, ≤ 60 names each) | archived categories | #342 |
| `zigoals:money-log:v1` (and `…business`) | `investIncome` (≤ 30 income categories) | the person's own investment-income marks | #345 |
| `zigoals:money-more:v1` | `questions` (≤ 10: id, name ≤ 60, the search's filters, `by` week/category) | saved money searches with a chart | #344 |
| `zigoals:money-more:v1` | `places` (≤ 20: id, name ≤ 40, payees ≤ 40) | typed place names and the payees logged there | #346 |

Deviation from the ledger, said here: #344 and #346 asked for a new device record each. Both live instead as new optional
fields of the existing money extras record (`zigoals:money-more:v1`, already in Export everything, the restore, the
catalogue and the erase), so no new key, device-key list entry or registry entry is needed and "Forget places" clears its
field. Round trip: `apps/web/lib/av2-money-r4/round-trip.test.ts` (export → erase → restore, replace; the business log
too; unreadable values dropped; later fields kept). The lead may update the catalogue label of `moneyMore`
(lib/av2-money-r2-keys.ts) to add "saved searches, your places".

**Answers wiring (all features)**: in `apps/web/lib/ai/local-answers/engine.ts`, before `av2R3MoneyAnswer`:
`import {av2R4MoneyAnswer} from './av2-r4-money';` and `av2R4MoneyAnswer(question, env) ?? av2R3MoneyAnswer(question, env) ?? …`.
`apps/web/lib/ai/local-answers/av2-r4-money.test.ts` proves both ways: round 4's answers claim no other question of the
corpus (`CORPUS`), and the answers that run before them in `deviceAnswer` (`rehearsalAnswer`, `av2RestAnswer`,
`av2SyncAnswer`) and the earlier money answers (`av2R3MoneyAnswer`, `av2MoneyR2Answer`, `av2MoneyAnswer`, `avAnswer`) claim
none of round 4's questions. Corpus: `AV2_R4_MONEY` from `apps/web/lib/ai/evals/as/cases-av2-r4-money.ts` into
`cases.ts`. The answers read `env.moneyLog` and `env.moneyMore` (already read by rounds 2 and 3).

## Features

### R4-F1 (group U4). A calendar of the month

- LEDGER row: #338 Lunch Money calendar — **built** (Wealth → Spending → Your money over time → "A calendar of the
  month": a month grid from the person's week start (Monday or Sunday, the log's own setting), each day's spending and
  income in one currency at a time (currency buttons when there are more; never converted), a quiet shade in three steps
  for the larger days (a third and two thirds of the month's largest day) with a key, today ringed, the month's totals
  and its largest day in words, paged ‹ › from the log's first month to this one (the buttons stay focusable at either
  end, `aria-disabled`); a day with entries opens them in "Search all your entries" (the fold opens on that day, a note
  says so, focus goes to its summary); on a phone (≤ 640 px) the cells show a dot and the days are 44 px buttons listed
  under the grid; Hide amounts blurs every amount (`data-private-amount`)).
- Spending function used: income per day is `totals` (lib/money-log/engine.ts) for that day; spending per day is the
  shared rule's `budgetDayParts` (lib/money-log/counted.ts), so a shared cost counts the person's share and a cost spread
  over months counts its share on its day in each month (the ledger's "counted through the one-month rule"); the month's
  days add up to what the budgets count. The view says so in one line.
- Files: `lib/money-insights/month-days.ts` (new), `components/wealth/spending/insights/month-calendar.tsx` (new, lazy),
  `components/wealth/spending/insights/spending-insights.tsx` (the view; `openDay` and `weekStartsOn` props),
  `components/wealth/spending/spending-section.tsx` (`openDay`: the drill-down now takes a day without a category),
  `tests/ap/ap-money-fixtures.ts` (the view's name in `openInsight`).
- Tests: `lib/money-insights/av2-month-days.test.ts`, `lib/ai/local-answers/av2-r4-money.test.ts`. **Deliberate test
  change**: `lib/money-insights/views.test.ts` "eleven views" → "twelve views": every label named and the count exact
  (12), labelled `// Session AV lane 2 (round 4 money …, deliberate)`.
- Spec: `tests/av2-money-calendar.spec.ts`.
- Stored: nothing.
- Help (EN): **Q: Can I see what I spent each day of the month?** A: Wealth → Spending → Your money over time → "A
  calendar of the month" shows each day's spending and income, with the larger days shaded. Page back with ‹ to earlier
  months, and tap a day to see its entries in search. A cost spread over months counts its share each month, as your
  budgets do.
- What's new: "Spending: a calendar of the month, each day's spending and income; tap a day to see its entries."
- Answers: `monthDays` (corpus `av2r4-money-calendar`).
- Showcase hook: none written. The view reads the Showcase's own money log (pinned by the NOVA corpus), so the Showcase
  shows its month on the calendar by itself. The empty state teaches ("Nothing logged yet. Each day you log spending or
  income shows here on a calendar of the month.").
- Registries: none. CSS touched: `components/wealth/spending/insights/insights.css` (`.money-cal-*`, theme variables only).
- Today: nothing added. Wealth → Spending's "Your money over time" now has 12 view buttons (was 11).
