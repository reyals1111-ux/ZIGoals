# Lane 2 registry: Money, round 3 (`lane2/r3-money`)

Builder: the Money pillar, round 3 (LEDGER "Round 3: rows #256–#299", groups T3 and T8: rows #291–#299; COMPETITORS
"Ten more apps, round 3": PocketGuard, Quicken Simplifi). Branch `lane2/r3-money`, cut from `lane2/batch2`. What lane 2
built in Money before is in `money.md` and `money-r2.md`; nothing here repeats it.

**One spending figure.** Every spending (and income) total these features show is summed by Wealth → Spending's own
functions, `totals` and `byCategory` in `apps/web/lib/money-log/engine.ts` (an entry left out of the figures, both sides
of a transfer and a Settle-up refund are not counted; a shared cost counts the person's own share; the review b2a rule in
`lib/money-log/counted.ts`). No feature here writes another sum over entries, so when lane2/revb2a's shared month rule
lands in those two functions, every figure below follows it. What a budget holds uses the budgets' own `budgetedIn` and
`movedIn` (`lib/budgets/engine.ts`). Every amount goes through the app's money formatter (`formatCurrencyAmount`, through
`moneyCents` / `moneyWhole` in the UI); every date and month through `lib/visual-format.ts` (`formatDate`, `formatMonth`);
the Dutch answers write money with the `nl-NL` locale ("€ 12,50") and dates as `dayIn('nl', …)` / `monthIn('nl', …)`.
No money advice: plain figures and plain words.

## Stored changes (TIER 3, stored formats; commit listed below)

All additive and optional; on loose objects only, each `.optional().catch(undefined)`, so a value this build cannot read
is dropped on read and never fails the record. All three records are already in Export everything, the restore, the data
catalogue and the account erase, so **no new key and no registry entry is needed**. Older builds (#37–#57) keep the new
fields untouched in the loose objects and show nothing new.

| record | field | what it holds | rows |
|---|---|---|---|
| `zigoals:money-more:v1` | `planned` (≤ 100: id, name ≤ 60, amount, currency, date, category?) | planned one-off costs | #292 |
| `zigoals:money-more:v1` | `forecast` (`6m` / `12m`; missing: 60 days) | the cash forecast's length, one device preference | #294 |
| `zigoals:wealth-sheet:v1` | `cards` (by account id: `limit`, `statementDay` 1–31, `dueDay` 1–31) | a credit card's limit, statement day and due day | #293 |
| `zigoals:money-log:v1` | `needWant` (≤ 80 categories → `need` / `want` / `saving`) | the person's own mark per spending category | #295 |

Round trip: `apps/web/lib/av2-money-r3/round-trip.test.ts` (export → erase → restore, replace; unreadable values
dropped; later fields kept). The lead may update the catalogue label of `moneyMore` (lib/av2-money-r2-keys.ts) to
"Money extras: saved entries, your own budgets, shared costs, money lent and borrowed, planned costs, the forecast length,
the space shown".
