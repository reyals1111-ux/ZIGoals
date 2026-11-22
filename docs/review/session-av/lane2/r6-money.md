# Lane 2 registry: Money, round 6 (`lane2/r6-money`)

Builder: the Money pillar, round 6 (LEDGER "Round 6: rows #391–#431", groups W6 and W8: rows #425–#431; COMPETITORS "Ten
more apps, round 6": EveryDollar, Banktivity). Branch `lane2/r6-money`, cut from `lane2/batch5` (all lane 2 work through
round 5). What lane 2 built in Money before is in `money.md`, `money-r2.md`, `r3-money.md`, `r4-money.md`, `r5-money.md`
and `revb2a.md`; nothing here repeats it.

All seven rows are **built**. No row or part is left.

**One spending figure, now with refunds.** The shared rule itself (`apps/web/lib/money-log/counted.ts`) learns refunds,
so every figure agrees: a refund is stored as income with `refund: true` in an expense category (an older build reads it
as money received, as it does today) and this build counts it as **spending below zero in that category, never income**.
New in the rule: `isRefund`, `inFigures` (counted as itself, or a refund), `countedKind` (a refund counts as `expense`),
`isSpending` (a counted expense or a refund), `spendingDayParts`; `isCounted` is now false for a refund (so no income
figure counts it), and `mineCents`, `mineParts`, `budgetMonthParts`, `budgetDayParts`, `countedDayParts`, `countedCents`,
`countedBetween`, `countedByCategoryBetween` and Spending's `totals` / `byCategory` (`lib/money-log/engine.ts`) count a
refund below zero (a refund of a shared cost by the person's share). As before: a cost spread over months counts its
share in each month; a shared cost counts the person's share; left-out entries and both sides of a transfer count
nowhere (a refund left out or marked a transfer counts nowhere either).

Every figure that summed spending or income by itself was moved onto the rule (each file names it, `Round 6 (#425)`):

| figure | file | function it now uses |
|---|---|---|
| Spending's totals and categories | `lib/money-log/engine.ts` | `totals`, `byCategory` (refund-aware) |
| month budgets, carry, unbudgeted | `lib/budgets/engine.ts` | `isSpending` + `budgetMonthParts` |
| pay-period budgets; the fill never offers a refund | `lib/budgets/periods.ts` | `isSpending` + `budgetDayParts`; `isRefund` |
| month recap; three-month average | `lib/budgets/recap.ts`, `lib/budgets/assign.ts` | `inFigures`/`countedKind` + `mineCents`/`mineParts` |
| Left this month (its income count) | `lib/budgets/left-this-month.ts` | `totals`; `countedKind` + `isCounted` |
| Ready to assign | `lib/budgets/ready-to-assign.ts` | `isCounted` (a refund is not income) |
| year recap, payee watch, challenges | `lib/money-notices.ts` | `inFigures`/`countedKind`/`isSpending` + `mineCents`/`mineParts` |
| payee budgets, own budgets, by method, by subcategory | `lib/money-more/own-budgets.ts`, `lib/money-more/quick.ts` | `isSpending` + `mineParts`/`mineCents` |
| tags | `lib/money-tags/tags.ts` | `inFigures` + `countedCents`/`countedKind` |
| your usual pace (#425 names "the pace") | `lib/money-insights/spending-pace.ts` | `spendingDayParts` (also now the share and the spread, as the rule says) |
| this month vs last | `lib/money-insights/month-compare.ts` | `spendingDayParts` (also the share and the spread) |
| where income went | `lib/money-insights/income-flow.ts` | `inFigures`/`countedKind` + `mineParts` (spending by the share) |
| month by month, top payees | `lib/money-insights/cash-flow.ts` | `countedBetween`; `inFigures`/`countedKind`/`isSpending` |
| the month's calendar | `lib/money-insights/month-days.ts` | `spendingDayParts`; income `countedKind` + `isCounted` |
| buffer days | `lib/buffer-days/buffer.ts` | `inFigures`; a refund lowers the window's spending |
| the spending map | `lib/spending-map/layout.ts` | `byCategory` (a category at or below zero has no area) |
| NOVA/ZIGi exact money answers | `lib/ai/local-answers/exact/money.ts` | `countedKind` + `inFigures` + `countedCents` (the largest expense is never a refund) |
| ZIGi "where did my income go" currency | `lib/ai/local-answers/av-answers.ts` | a refund is not income |
| ZIGi "what is left out" | `lib/ai/local-answers/av2-money.ts` | `inFigures` (a refund is not left out) |
| NOVA spending card, ranks, days, heat, river, gauge | `lib/nova/cards/spending.ts`, `lib/nova/cards/ax/money-spend.ts` | `isSpending`, `inFigures`, `countedKind`, `countedCents` |
| Compare: the day's spending and the spending factor | `lib/compare/engine.ts` | `totals`/`byCategory`; `isSpending` + `mineCents` |
| Insights "Spending and mood" | `lib/insights/cross-pillar.ts` | `isSpending` + `mineCents` (it summed whole amounts, left-out ones too, before) |
| the spreadsheet | `lib/money-log/sheet.ts` | `countedCents`; "Counted as" says `refund` |
| search "only what counts" / Select totals | `lib/money-log/search.ts`, `components/wealth/spending/money-search.tsx` | `inFigures` |

Not changed on purpose: age of money (`lib/money-insights/age-of-money.ts`) leaves a refund out (it is neither money in
nor spending in its first-in-first-out queue); bill matching, price changes, receipts and the unusual-entry line look at
purchases only; the reconcile counts what the bank moved (a refund is money in). Tests across Spending, budgets,
NOVA/ZIGi answers and Compare: `apps/web/lib/money-log/av2-refund.test.ts` (15 tests); every earlier money test is green
unchanged (`lib/money-log`, `lib/budgets`, `lib/money-insights`, `lib/money-more`, `lib/compare`, `lib/nova`,
`lib/ai/local-answers`, `lib/insights`; 3,566 tests). Two failures in that run are not this branch's and touch no money
code: `av2-r4-mind.test.ts` and `av2-r5-notes.test.ts` (their own corpus intents, now in `CORPUS`, counted as claimed); they
fail at this branch's base `fb449c2c` too, and `lane2/batch5` has since fixed them (`9d773011`, "round 5 notes' corpus test
leaves its own intents out"), so they pass once the lead merges.

Money goes through the app's formatter (`moneyCents` / `formatCurrencyAmount`), dates and months through
`lib/visual-format.ts`; the Dutch answers write "€ 12,50" and Dutch month words. No money advice anywhere: no suggested
amount, no Baby Steps, no "spend less" step; paychecks and set-aside use only the person's own amounts.

## Stored changes (TIER 3, stored formats; commit `781b2ecc`)

All additive and optional, on loose objects only, each `.optional().catch(undefined)` (a value this build cannot read is
dropped on read, never failing the record). All four records are already in Export everything, the backup, Restore, the
erase and the data catalogue, so **no new key and no registry entry is needed**. Older builds keep the new fields untouched
in the loose objects. Round trip: `apps/web/lib/av2-money-r6/round-trip.test.ts` (export → erase → restore, replace;
unreadable values dropped; later fields kept).

| record | field | what it holds | rows | an older build |
|---|---|---|---|---|
| `zigoals:money-log:v1` entry | `refund` (`true`) | on an entry written as `kind: 'income'` in an expense category | #425 | reads it as money received, as today |
| `zigoals:money-log:v1` entry | `refundOf` (an entry id) | the purchase a refund is for (the person's own link) | #425 | keeps it |
| `zigoals:money-log:v1` | `putAway` (`{years: [{id, year, at, entries: [...]}]}`, ≤ 60 years, ≤ 10,000 entries a year, entries kept as written) | years of entries put away; Bring back returns them | #431 | keeps it; shows those years empty |
| `zigoals:budgets:v1` budget | `order` (0–999) | the person's own order | #429 | sorts as before |
| `zigoals:budgets:v1` | `ahead` (≤ 200 of `{id, from: month, budgetId, amount, at}`) | money of month `from` set aside for the budget's next month | #428 | ignores it |
| `zigoals:budget-periods:v1` | `paychecks` (`{items: ≤ 6 of {id, name, every: month/week/fortnight, day, amount, currency}, lines: {"b:<budget>" or "bill:<bill>": paycheck id}}`) | each paycheck and what it pays | #426 | ignores it |
| `zigoals:money-more:v1` | `streak` (`{on?: true, looked?: days, ≤ 400}`) | the money streak's switch (off by default) and the days the person said "I looked" | #427 | ignores it |

The history field list (`history[].field`) was **not** extended: a refund mark is written as a `category` change, so an
older build's strict enum never drops a history.

Export everything's `money-log.csv` (lib/export/everything.ts, the lead's) lists `entries` only; put-away entries are in
the export's JSON (the money log record) and each year can be saved as its own CSV from the panel. **For the lead**: if the
CSV should list put-away years too, add `...(moneyLog?.putAway?.years ?? []).flatMap(y => y.entries)` there (the rows
are the same shape).

**Answers wiring (all features)**: in `apps/web/lib/ai/local-answers/engine.ts`, before `av2R5MoneyAnswer`:
`import {av2R6MoneyAnswer} from './av2-r6-money';` and `av2R6MoneyAnswer(question, env) ?? av2R5MoneyAnswer(question, env) ?? …`.
Corpus: `AV2_R6_MONEY` from `apps/web/lib/ai/evals/as/cases-av2-r6-money.ts` into `cases.ts` (7 intents, 28 questions).
`apps/web/lib/ai/local-answers/av2-r6-money.test.ts` proves both ways: its answers claim no other question of the corpus
(its own intents left out of that check), and the answers before it (`rehearsalAnswer`, `av2RestAnswer`, `av2SyncAnswer`,
`av2R5MoneyAnswer`, `av2R4MoneyAnswer`, `av2R3MoneyAnswer`, `av2MoneyR2Answer`, `av2MoneyAnswer`, `avAnswer`) claim none of
round 6's questions. The answers read `env.moneyLog`, `env.nova.budgets`, `env.nova.budgetPeriods`, `env.ak.bills`,
`env.ak.moneyMore` and `env.accounts`, all already in the tool sources.

**Corpus cases whose answer changes (old → new)**: none. `corpus.test.ts` and `oracle.test.ts` against the recorded
`expected.json` are green with the rule changed (the Showcase and fresh corpora hold no refund, and the pace, last-month
and mood figures move only with a shared or spread cost in their window). expected.json was not re-recorded.

## Commits

- `781b2ecc` TIER 3 (stored formats): the seven new optional fields, with the round trip.
- `48389623` #425 a refund, in the shared rule (every figure).
- `4e84f967` #426, #428, #429 budgets in your order, set aside for next month, each paycheck's plan.
- `b2a088b3`, `2c9a4d03` #427 the money streak (its unit tests in the second).
- `fdfe2832` #430, #431 the check of the money records, old years put away.
- the last commit: the EN+NL answers for all seven rows (`av2-r6-money.ts`, its cases and test) and this registry.

## Features

### R6-F1 (group W6). A refund that lowers its category

- LEDGER row: #425 Banktivity a refund that lowers its category — **built**. Wealth → Spending → Log spending has a third
  kind, **Refund**, beside Spent and Received: an amount, an expense category, and (its own chunk) "The purchase it refunds
  — optional", the purchases of that category and currency in the 120 days before, newest first; the form says "A refund
  lowers Groceries: its spending, its budget and this month's figures. It is never counted as money received." Saved:
  "Refund €30.00 · Groceries · saved; it lowers Groceries." The entry list marks it " · Refund"; editing keeps it a
  refund and its link. A bank file's credit from a payee the person paid before (the latest counted purchase from the
  same payee and currency in the 120 days before, at least that amount) is offered in Money tools → To review → "Money
  back from a shop you paid before" with "Count as a refund" (into the purchase's category, linked to it), with Undo.
  The spreadsheet's "Counted as" says "a refund" with its figure below zero; the check (#430) flags a refund whose purchase
  is gone.
- Spending function used: the shared rule itself (above).
- Files: `lib/money-log/counted.ts`, `lib/money-log/engine.ts`, `lib/money-log/refunds.ts` (new: `refundTargets`,
  `refundOffers`, `markRefund`, `unmarkRefund`, `refundsIn`), `components/wealth/spending/refund-of.tsx` (new, lazy),
  `components/wealth/money-tools/refund-offers.tsx` (new, lazy in To review), `components/wealth/money-tools/review-inbox.tsx`,
  `components/wealth/spending/spending-section.tsx` (the Refund kind, the mark), `components/wealth/spending/money-search.tsx`,
  `components/wealth/spending/money-sheet.tsx`, and every figure file in the table above.
- Tests: `lib/money-log/av2-refund.test.ts`, `lib/ai/local-answers/av2-r6-money.test.ts`.
- Spec: `tests/av2-money-refund.spec.ts`.
- Stored: `refund`, `refundOf` on the money-log entry.
- Help (EN): **Q: How do I log money I got back for something I bought?** A: In Wealth → Spending, choose Log spending →
  Refund, enter the amount and the category it was spent in, and if you like, the purchase it is for. A refund lowers
  that category's spending, its budget and the month's figures; it is never counted as money received. Money back from a
  bank file is offered in To review as a refund when you paid that shop before.
- What's new: "Spending: log a refund — it lowers its category and its budget, never counted as income."
- Answers: `refunds` (corpus `av2r6-money-refunds`).
- Showcase hook: none (the Showcase holds no refund, so no pinned count moves). Empty states: "No Groceries purchase in
  EUR in the 120 days before … to point at; the refund still lowers Groceries."; the To review section shows only with
  an offer.
- Registries: none. CSS: `components/wealth/spending/money-r6.css` (new, theme variables only). Today: nothing.

### R6-F2 (group W6). Budgets in your own order

- LEDGER row: #429 EveryDollar budgets in your own order — **built**. Budgets → "Reorder budgets" (a fold, with two budgets
  or more): the budgets in a list with ↑ and ↓ for each ("Move Home (EUR) up"; focus stays on the moved budget's button),
  a mouse can drag one to its place, and "Back to the usual order"; every move has Undo. The order is used on Budgets'
  month table (each currency apart), the pay periods and the paycheck fill, and the paycheck plan's lines.
- Spending function used: none (no figure changes; `monthView` only sorts).
- Files: `lib/budgets/order.ts` (new), `lib/budgets/engine.ts` (`monthView` sort), `lib/budgets/periods.ts` (`periodRows`),
  `components/wealth/budgets/budget-periods.tsx` (the fill), `components/wealth/budgets/r6-budgets.tsx` (new, lazy),
  `components/wealth/budgets/budgets-month.tsx` (the fold).
- Tests: `lib/budgets/av2-r6-budgets.test.ts`. Spec: `tests/av2-money-r6-budgets.spec.ts`.
- Stored: `order` on the budget.
- Help (EN): **Q: Can I put my budgets in my own order?** A: Yes. Wealth → Budgets → Reorder budgets: move each one up or
  down (or drag it with a mouse). Your order is used on Budgets, in each month and in the paycheck fill. "Back to the usual
  order" puts the most spent first again.
- What's new: "Budgets: put them in your own order."
- Answers: `order` (corpus `av2r6-money-order`). Showcase: none written (one more fold on Budgets: the lead re-records any
  screen that pins Budgets' Tab stops). CSS: `money-r6.css`. Today: nothing.

### R6-F3 (group W6). Next month set aside

- LEDGER row: #428 Banktivity next month's budgets from this month — **built**. Budgets → "Paychecks and next month" → "Set
  aside for December 2026" (this month only): Ready to assign now per currency, then each budget that runs next month with
  its amount there and what is already set aside; Set aside gives that part of this month's ready money to it. It is held
  this month (Ready to assign says "(of it €100.00 set aside for next month)") and covers the budget next month (Ready to
  assign there says it is "already set aside last month" and does not ask for it again; the month's row says "€100.00 set
  aside in Nov 2026"). Never more than this month's ready money, never more than the budget's amount next month (plain
  words); an empty amount takes it back; Undo. Never advice: the person chooses every amount.
- Spending function used: Ready to assign's income (`isCounted`, so a refund is not income); no spending figure.
- Files: `lib/budgets/set-aside.ts` (new), `lib/budgets/ready-to-assign.ts`, `components/wealth/budgets/ready-to-assign.tsx`,
  `components/wealth/budgets/r6-budgets.tsx`, `components/wealth/budgets/budgets-month.tsx` (the row's line, the fold).
- Tests: `lib/budgets/av2-r6-budgets.test.ts`. Spec: `tests/av2-money-r6-budgets.spec.ts`.
- Stored: `ahead` on the budgets record.
- Help (EN): **Q: Can I fund next month's budgets now?** A: Yes. Wealth → Budgets → Paychecks and next month → Set aside
  for next month: give part of this month's ready money to next month's budgets. It is held this month, and next month
  those budgets start covered, so that money is not asked for again.
- What's new: "Budgets: set money aside for next month's budgets."
- Answers: `aheadAnswer` (corpus `av2r6-money-set-aside`). Showcase: none. Today: nothing.

### R6-F4 (group W6). Each paycheck's plan

- LEDGER row: #426 EveryDollar each paycheck's own plan — **built**. Budgets → "Paychecks and next month" → "Each
  paycheck's plan, <month>": add up to six paychecks (a name, every month on a day, or every week or every two weeks on a
  weekday, and what it brings in); set each budget (its amount that month, in the person's order) and each bill (each due
  date that month) against one under "Paid from"; per paycheck its days that month, what it holds (its amount on each of
  its days), what is set against it and what is left once they are covered ("€600.00 left once they are covered", or "…
  more set against it than it holds"); lines set against none are listed. Remove has Undo. From the person's own amounts;
  never a suggestion.
- Spending function used: none (planned amounts: `budgetedIn`, the bills' own amounts and due dates via `monthDueDates`).
- Files: `lib/budgets/paychecks.ts` (new), `lib/budgets/periods.ts` (schema), `components/wealth/budgets/r6-budgets.tsx`.
- Tests: `lib/budgets/av2-r6-budgets.test.ts`. Spec: `tests/av2-money-r6-budgets.spec.ts`.
- Stored: `paychecks` on the budget periods record.
- Help (EN): **Q: I'm paid twice a month. Can I plan each paycheck?** A: Yes. Wealth → Budgets → Paychecks and next month:
  add each paycheck with what it brings in, then choose which paycheck pays each budget and bill. Each paycheck shows what
  it holds and what is left once its lines are covered.
- What's new: "Budgets: plan each paycheck — what it pays and what is left."
- Answers: `paychecks` (corpus `av2r6-money-paychecks`). Showcase: none. Today: nothing.

### R6-F5 (group W6). A money streak

- LEDGER row: #427 EveryDollar a streak for looking after your money — **built**. Off by default. Wealth → Spending →
  Yesterday's money → "A money streak, if you want it": "Days in a row you looked at your money, on Spending". On, Spending
  shows one quiet line: "Days in a row you looked at your money: 4, today too." or "…: 4. A day off is fine." with "I looked
  at my money today" (focus stays on the line). A day counts when an entry was logged that day (by hand, ZIGi, a quick
  line or a bank file read — the entry's own time) or the person said they looked. One day off does not end the run, two
  in a row do (the habits' two-day rule); today still open never counts against it. Never an amount, never a lost-streak
  warning, never on Today, never a notification.
- Spending function used: none (no money figure).
- Files: `lib/money-log/money-streak.ts` (new), `components/wealth/spending/money-streak.tsx` (new, lazy),
  `components/wealth/spending/yesterday-money.tsx` (the switch), `components/wealth/spending/spending-section.tsx` (the line).
- Tests: `lib/money-log/av2-r6-streak.test.ts`. Spec: `tests/av2-money-streak.spec.ts`.
- Stored: `streak` on the money extras.
- Help (EN): **Q: Is there a streak for looking after my money?** A: If you want one. Turn it on in Wealth → Spending →
  Yesterday's money. Spending then shows how many days in a row you logged something, read a bank file or tapped "I looked
  at my money today". It never shows an amount, a day off is fine, and nothing warns you about losing it.
- What's new: "Spending: an optional, calm streak for looking at your money."
- Answers: `streak` (corpus `av2r6-money-streak`). Showcase: none (off by default; not kept in the Showcase).
- Today: nothing.

### R6-F6 (group W8). A check of the money records

- LEDGER row: #430 Banktivity a check of the money records — **built**. Wealth → Spending → "Check and tidy your money
  records" (a fold, its own chunk; Settings → Your data links to it, `/app/wealth#money-check` opens it) → "Check my money
  records": a read-only report, nothing changes without a tap, each repair with Undo and focus back on the heading. It finds
  and offers: entries that look the same twice (the same bank reference, or the same day, kind, amount, currency, category
  and payee) — "Keep the first, remove the copy"; entries in a category no longer yours — "Add it back" or "Move to …";
  a subcategory no longer in its list — "Add it back" or "Clear the subcategory"; a split whose parts do not add up —
  "Remove the split" (it already counts whole); a transfer whose other side is gone — "Count it again"; a refund naming a
  purchase that is gone (a put-away purchase is not gone) — "Remove the link"; a note, place in the order or checked day
  kept for an account that is gone — "Forget it"; a budget of a category no longer offered — "Remove the budget".
- Spending function used: none (read-only checks); repairs are normal writes with history where entries change.
- Files: `lib/money-log/check.ts` (new), `components/wealth/spending/money-housekeeping.tsx` (new, lazy),
  `components/wealth/spending/spending-section.tsx` (the fold), `components/data-health/data-health-view.tsx` (the link).
- Tests: `lib/money-log/av2-r6-housekeeping.test.ts`. Spec: `tests/av2-money-records-check.spec.ts`.
- Stored: nothing new.
- Help (EN): **Q: Can ZIGoals check my money records for mistakes?** A: Yes. Wealth → Spending → Check and tidy your money
  records → Check my money records lists entries that look doubled, categories and subcategories that are gone, splits
  that do not add up, transfers missing their other side and budgets of categories you no longer use. Nothing changes
  until you choose a repair, and each one has Undo.
- What's new: "Spending: check your money records, with repairs you choose."
- Answers: `check` (corpus `av2r6-money-check`). Showcase: the fold reads the Showcase's log (in the Showcase, changes
  last until the tab closes); one more fold on Spending. Today: nothing.

### R6-F7 (group W8). Put old entries away

- LEDGER row: #431 Banktivity put old entries away — **built**, by year and reversible, as the task asks. Same fold → "Put
  old entries away": choose a past year; the plan says how many entries go and what that year counted (spent and received
  by the shared rule), which entries stay and why (a cost spread into a later year, a transfer whose other side stays, a
  purchase a later refund names), and what changes in this month's rollover budgets ("Groceries €550.00 → €600.00"). "Put
  2024 away" moves them out of every list, search and figure into the same record, kept exactly (Undo); "Years put away"
  lists each with "Save 2024 as a file" (the spreadsheet's CSV) and "Bring 2024 back" (Undo). Nothing is deleted; an entry
  this build cannot read stays put away. Deviation from the ledger, said here: the ledger asked for opening lines per
  account and currency that keep each balance; ZIGoals' account balances come from each account's own balances (Wealth →
  Accounts), never from summed entries, so putting entries away changes no balance and no opening line is written (none of
  the ledger's `opening` flag is stored).
- Spending function used: `countedBetween` for the year's spent and received; the carry from `monthView`.
- Files: `lib/money-log/put-away.ts` (new), `lib/money-log/schema.ts`, `components/wealth/spending/money-housekeeping.tsx`.
- Tests: `lib/money-log/av2-r6-housekeeping.test.ts`, `lib/av2-money-r6/round-trip.test.ts`.
- Spec: `tests/av2-money-records-check.spec.ts`.
- Stored: `putAway` on the money log.
- Help (EN): **Q: Can I put old years of entries away?** A: Yes. Wealth → Spending → Check and tidy your money records →
  Put old entries away. Choose a past year: you see what it holds and what would change first. Its entries leave your lists
  and figures but stay on your device and in Export everything; save a year as a file, or bring it back at any time.
- What's new: "Spending: put old years of entries away — nothing deleted, bring them back any time."
- Answers: `putAway` (corpus `av2r6-money-put-away`). Showcase: none (the Showcase holds no past year). Today: nothing.

## For the lead

- `engine.ts`: the wiring line above. `cases.ts`: `AV2_R6_MONEY`. Record the corpus (none of the existing cases changes).
- `help-page.tsx`: the seven Help Q+A and What's new lines above. `lib/search/static.ts`: the seven questions if Help
  questions are indexed there.
- Shards: `tests/av2-money-refund.spec.ts`, `tests/av2-money-r6-budgets.spec.ts`, `tests/av2-money-streak.spec.ts`,
  `tests/av2-money-records-check.spec.ts`.
- Theme sheets: regenerate for `components/wealth/spending/money-r6.css` (new; theme variables only).
- Registries (device keys, catalogue, export, erase, restore plan): nothing new — every stored change is a field of a
  record already registered. Optional: put-away years in Export everything's `money-log.csv` (above).
- Route weight (Wealth): the first chunk gains only the Refund kind in the form (one state and a few conditions), the
  "Refund"/"Left out" mark, and six lazy imports; everything else loads on its fold or when chosen. Budgets gains two
  folds and one small import (`coveredIn`). No build run here: the lead checks `scripts/weight-budgets.json`.
- Tab stops: Spending gains one fold ("Check and tidy your money records") when the log has entries; Budgets gains
  "Reorder budgets" (two budgets or more) and "Paychecks and next month"; the Refund chip is one more radio in the form's
  group (no extra Tab stop). Showcase Today: nothing added.
- Not run here (the lead's): `next build`, Playwright, the theme build.

## Review B6O fixes

All 13 findings fixed on `lane2/r6-money` (from `b1b3a062`), one commit each, each with a unit test that fails before the
fix. Refunds go through the shared rule (`lib/money-log/counted.ts`); its new `categoryKind` says a refund sits in a
spending category whatever its marks. No assertion was weakened or removed; no spec changed.

| id | commit | what changed | test |
|---|---|---|---|
| B6O-1 | `f7e8138b` | Life review's Your days sums with `inFigures`/`countedKind`/`countedCents`: a refund lowers spent and is never received; left out, transfers and shares count as on Spending. | `lib/money-log/av2-refund.test.ts` "Life review" |
| B6O-2 | `168a2f4b`, `813b5fb7` | `setAsideFrom` holds by the same cap as `coveredIn` covers (a budget's amount next month), so a lowered amount returns the excess to the source month; `setAside` checks against the capped amount. | `lib/budgets/av2-r6-budgets.test.ts` "review B6O-2" |
| B6O-3 | `2ea5c460`, `813b5fb7` | Rules match a refund as money out (`subjectOf` via `categoryKind`); a refund only takes a money-out rule's category or a usual spending one; "Make a rule" from a refund is a money-out rule. | `lib/money-rules/rules.test.ts` "review B6O-3" |
| B6O-4 | `fc347bb8` | A refund's `share` (existing field) follows the purchase it names: refund × share ÷ paid, exact cents. Set by "Count as a refund", the form (typed or edited) and when the purchase is shared or unshared later; the form says it in words. ShareFold stays on spending (it writes "owes you" lines). | `lib/money-log/av2-refund.test.ts` "review B6O-4" |
| B6O-5 | `8af3cbf8` | `barWidths` (`lib/money-log/bars.ts`): the biggest over totals above zero; no bar at or below zero; never NaN. | `lib/money-log/av2-refund.test.ts` "review B6O-5" |
| B6O-6 | `25856677` | "Forget it" and "Add … back" show the same Undo toast as other repairs; `unforgetAccount`, `undoAddBackCategory`, `undoAddBackSub` revert only what the repair changed. | `lib/money-log/av2-r6-housekeeping.test.ts` "review B6O-6" |
| B6O-7 | `c3f2e7b2` (TIER 3) | Fortnightly paychecks take a "Next payday" date (starts on the old count's payday); stored as optional `from`, every 14 days from it. Without `from` (every plan kept before) nothing changes. | `lib/budgets/av2-r6-budgets.test.ts` "review B6O-7" |
| B6O-8 | `29196d37` | The check uses `categoryKind`: a left-out or transfer refund is checked against spending categories. | `lib/money-log/av2-r6-housekeeping.test.ts` "review B6O-8" |
| B6O-9 | `8dab1532` | `staysPutAway`: an entry whose id is in the log again stays in the put-away year with the unreadable ones; Bring back says how many stay. | `lib/money-log/av2-r6-housekeeping.test.ts` "review B6O-9" |
| B6O-10 | `96204a3f` | "My biggest/smallest expense" with only refunds answers "No purchase logged …, only money back (refunds)" (NL too) instead of throwing. | `lib/money-log/av2-refund.test.ts` "review B6O-10" |
| B6O-11 | `e6bc8934` | Select totals count a refund as "refund" (summary `refunds`); the net is unchanged; `money_selection` passes `refunds`. | `lib/money-log/selection.test.ts` "review B6O-11" |
| B6O-12 | `a1e27d10` | `revertPaychecks` reverts only what the paycheck change made into the latest record (a removed paycheck comes back with its lines; later lines and pay-period edits kept). | `lib/budgets/av2-r6-budgets.test.ts` "review B6O-12" |
| B6O-13 | `06ad6324` (TIER 3) | `putAway.years` read per year: an unreadable year is kept in place as stored and written back unchanged; valid data parses as before; `readableYears`/`isReadableYear` for the consumers. | `lib/money-log/av2-r6-housekeeping.test.ts` "review B6O-13" |

For the lead: Help could mention the fortnightly "Next payday" (B6O-7) and that a refund of a shared cost counts your
share (B6O-4). Specs to look at in the Playwright run: `tests/av2-money-r6-budgets.spec.ts` (paycheck form, unchanged
for monthly paychecks), `tests/av2-money-records-check.spec.ts` (Undo toast now also after "Forget it").
