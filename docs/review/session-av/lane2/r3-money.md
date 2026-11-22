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

**Answers wiring (all features)**: in `apps/web/lib/ai/local-answers/engine.ts`, before `av2MoneyR2Answer`:
`import {av2R3MoneyAnswer} from './av2-r3-money';` and `av2R3MoneyAnswer(question, env) ?? av2MoneyR2Answer(question, env) ?? …`.
`apps/web/lib/ai/local-answers/av2-r3-money.test.ts` proves both ways: round 3's answer claims no other question of the
corpus (`CORPUS`), and `avAnswer`, `av2MoneyAnswer` and `av2MoneyR2Answer` claim none of round 3's questions. Corpus:
`AV2_R3_MONEY` from `apps/web/lib/ai/evals/as/cases-av2-r3-money.ts` into `cases.ts`. The answers read `env.moneyMore`
(already read by round 2's answers; the lead's tool sources), `env.wealthSheet`, `env.moneyTags`, `env.ak.bills`,
`env.nova.budgets`, `env.accounts` and, with Goals open, `env.platform.goals`. Dutch money is written with the `nl-NL`
locale ("€ 12,50"); the tests compare it with the no-break space shown as a space.

## Features

### R3-F1 (group T3). Left this month, planned one-off costs, the forecast up to 12 months

- LEDGER rows: #291 PocketGuard Leftover — **built** (Budgets → "Left this month" for the month still running, per
  currency, each part listed: income logged, spent so far, still in your budgets (each budget's own amount less its
  category's spending, never below zero), bills still due this month that the log does not show and no budget covers,
  Goal plans still to come this month, planned costs; the items of each part listed with their days; "more than came in"
  when it is below zero; a figure, not advice); #292 Simplifi planned spending — **built** ("Planned one-off costs": a
  name, an amount, a day and optionally a category, from Left this month and from the cash forecast; counted in both
  until an expense in the log matches — about its amount (5 %, at least 1.00, by the person's own share) from 4 days
  before its day to 14 after, with a word of its name in the note or its category — or the person clears it with Undo;
  a passed one stays counted, said as "its day has passed", and the forecast puts it on tomorrow); #294 Simplifi projected
  balances — **built** (the forecast card's "60 days / 6 months / 12 months", kept as one device preference; "Each month's
  lowest point" table with the day and, with a range, the leanest pace, captioned "An estimate from your own records, not
  a promise"; the dated items name planned costs).
- Also: planned costs count wherever the forecast is worked out — the Today low-balance line, the money notification
  wakes (`lib/notify/sync.ts`, only its input: no notification kind or plan changed), NOVA's `cash_forecast` tool
  (`lib/ai/tools/g1-tools.ts`) and round 1's payday and low-line answers (`lib/ai/local-answers/av2-money.ts`).
- Spending function used: `totals` and `byCategory` (`lib/money-log/engine.ts`), in `lib/budgets/left-this-month.ts`;
  planned-cost matching counts an entry by `mineCents` and `isCounted` (`lib/money-log/counted.ts`), the same rule.
- Files: `lib/budgets/left-this-month.ts` (new), `lib/cash-forecast/planned.ts` (new), `lib/cash-forecast/model.ts`
  (`planned` input and event kind, `forecastDays`, `monthLows`, `contributionCents`, exported `toCents`),
  `components/wealth/budgets/left-this-month.tsx` (new, lazy), `components/cash-forecast/planned-costs.tsx` (new, lazy),
  `components/cash-forecast/cash-forecast.tsx`, `components/wealth/budgets/budgets-month.tsx`,
  `components/wealth/today-money-attention.tsx`, `lib/notify/sync.ts`, `lib/ai/tools/g1-tools.ts`,
  `lib/ai/local-answers/av2-money.ts`.
- Tests: `lib/budgets/av2-left-this-month.test.ts`, `lib/cash-forecast/av2-planned.test.ts`,
  `lib/ai/local-answers/av2-r3-money.test.ts`, round trip. Existing `lib/cash-forecast`, `lib/budgets`,
  `av2-money`, `av2-money-r2`, `g1-tools` and money-attention tests green unchanged.
- Spec: `tests/av2-money-left-month.spec.ts`.
- Stored: `zigoals:money-more:v1` `planned`, `forecast`.
- Help (EN): **Q: How much do I have left this month?** A: Wealth → Budgets → "Left this month" takes the month's income
  in your money log and lists what comes off it: what you spent, what your budgets still hold, bills still due that no
  budget covers, your Goal plans still to come and your planned one-off costs. It is a figure from your own records, not
  advice. **Q: Can I plan a one-off cost, like a birthday present?** A: Yes: under Left this month (or in the cash
  forecast) open "Planned one-off costs" and add a name, an amount and a day. It counts in Left this month and in the
  forecast until your money log shows an expense of about that amount near its day, with its name or category, or until
  you clear it. **Q: Can the forecast look further ahead?** A: The cash forecast (Wealth → Spending → Money tools) runs
  60 days, 6 months or 12 months; each month's lowest point is listed. It is an estimate from your own records, not a
  promise.
- What's new: "Money: what is left this month, part by part; planned one-off costs; and the cash forecast up to 12
  months, with each month's lowest point."
- Answers: `leftMonth`, `plannedCosts`, `forecastLows` (corpus `av2r3-money-left-month`, `-planned`,
  `-forecast-months`).
- Showcase hook: none. Left this month shows by itself on the Showcase's Budgets from its own records (no Tab stop
  besides its one fold; the lead re-records any screen that pins Budgets); the Showcase money log and budgets are pinned
  by the NOVA corpus, so no planned cost is added there. The empty states teach ("Nothing planned yet. Add a cost you
  expect once…", "Nothing to work out yet for …").
- Registries: none new (above). CSS touched: `components/cash-forecast/planned.css` (new, theme variables only).
- Today: nothing always visible. "Left this month: €…" is a quiet text line (no Tab stop) under "Budgets left", only when
  the person turned "Show what is left in each budget on Today" on, and never in the Showcase.
- Noted for the lead: the Money tools button that opens the forecast keeps its label "Next 60 days" (an existing spec
  pins it); the card's own heading says the chosen length.

### R3-F2 (group T8). A credit card's limit and use

- LEDGER row: #293 Simplifi credit card dashboard — **built** (per credit card, from numbers the person types in its
  Sheet: the limit, the statement day and the payment due day (1–31; a short month uses its last day); its row in What
  you owe says "€450.00 of €2,000.00 used (23%) · €1,550.00 available · statement Dec 5, 2026 · due Nov 25, 2026";
  "used" is what it owes today, its latest balance less the payments recorded since (`owedAfterPayments`); "Add a payment
  reminder on <due day>" adds an ordinary monthly bill (id `card-<account id>`, for what is owed now) to Upcoming bills,
  which Upcoming bills and Today's money line then name like any bill; focus moves to its confirmation).
- Spending function used: none (no spending total; the card's balance and payments come from the accounts record).
- Files: `lib/wealth-sheet/cards.ts` (new), `components/wealth/credit-card.tsx` (new: `CardLine` lazy on the row,
  `CardForm` in the Sheet's own lazy chunk), `components/wealth/account-sheet.tsx`, `components/wealth/accounts-section.tsx`.
- Tests: `lib/wealth-sheet/av2-cards.test.ts`, `lib/ai/local-answers/av2-r3-money.test.ts`, round trip.
- Spec: `tests/av2-money-credit-card.spec.ts`.
- Stored: `zigoals:wealth-sheet:v1` `cards`. A payment reminder is a bill in the existing `zigoals:bills:v1` format.
- Help (EN): **Q: Can I see how much of my credit card limit I use?** A: Open the card's Sheet in What you owe and type
  its limit, the day its statement is made and the day its payment is due. Its row then shows what is used of the limit,
  the share, what is still available and the next statement and due days. "Add a payment reminder" puts the payment in
  Upcoming bills on the due day.
- What's new: "Credit cards: your limit, the share used, what is available, and the statement and due days, with a
  payment reminder."
- Answers: `cardUse` (corpus `av2r3-money-credit-card`). Reads `env.wealthSheet` (round 1's sheet answers read it too).
- Showcase hook: none (the Showcase has no credit card account; adding one would change the pinned net-worth figures).
  The empty state teaches: "Add its limit and days under Sheet to see how much of it is used."
- Registries: none new. CSS touched: `components/wealth/accounts.css` (`.accounts-card-line`, theme variables only).
- Today: nothing added (a reminder the person adds is a bill, named as bills already are).

### R3-F3 (group T8). Needs, wants and saving; a month waterfall

- LEDGER rows: #295 PocketGuard needs, wants and savings — **built**, with its named part **Carried: against a named
  rule** (no money advice: the 50/30/20 split is never shown, named or offered as a target). Built: each spending
  category marked need, want or saving (the person's choice, "Mark your categories" under the view, kept on the money
  log); the month (this month or last) per currency: Needs, Wants, Saving and Not marked, each with its categories, its
  amount and its share of the income logged, and "Not spent" (income less all spending; never called saving unless the
  person marks a category so); "Your figures only; nothing here is a target". #297 Simplifi comparison report with a
  waterfall — **built** ("What changed": from last month's spending total to this month's, one step per category that
  moved it, largest first, per currency; "This month so far" (against last month to the same day) or "Last month,
  whole" (against the month before); a hand-drawn chart (more than eight steps fold into "N more") and a table with every
  step and each category's before → after; a month without records in a currency is unknown and said so).
- Spending function used: `totals` and `byCategory` (`lib/money-log/engine.ts`) in `lib/money-insights/needs-wants.ts`
  and in `monthWaterfall` (`lib/money-insights/month-compare.ts`); the first bar plus every step equals the last bar.
- Files: `lib/money-insights/needs-wants.ts` (new), `lib/money-insights/month-compare.ts` (`monthWaterfall`,
  `waterfallPeriods`), `components/wealth/spending/insights/needs-wants-view.tsx` (new, lazy),
  `components/wealth/spending/insights/month-waterfall.tsx` (new, lazy),
  `components/wealth/spending/insights/spending-insights.tsx` (two views), `tests/ap/ap-money-fixtures.ts` (the two
  view names added to `openInsight`'s list).
- Tests: `lib/money-insights/av2-needs-wants.test.ts`, `lib/money-insights/av2-waterfall.test.ts`,
  `lib/ai/local-answers/av2-r3-money.test.ts`, round trip. **Deliberate test change**:
  `lib/money-insights/views.test.ts` "the container lists eight views" → "ten views": every label named and the count
  exact (10), labelled `// Session AV lane 2 (round 3 money …, deliberate)`.
- Spec: `tests/av2-money-needs-waterfall.spec.ts`.
- Stored: `zigoals:money-log:v1` `needWant`.
- Help (EN): **Q: Can I see how much goes to needs and wants?** A: In Wealth → Spending → Your money over time → "Needs,
  wants and saving", mark each category as a need, a want or saving. The month then shows what went to each as a share
  of the income you logged. They are your own marks and figures; ZIGoals sets no split to aim for. **Q: What moved my
  spending since last month?** A: "What changed" in Your money over time starts from last month's total and adds each
  category that moved it, the largest first, up to this month's total. Choose this month so far or last month whole.
- What's new: "Spending: your own needs, wants and saving as shares of income, and a waterfall of what changed since
  last month."
- Answers: `needsWants` (a question naming 50/30/20 gets the person's own shares and "never a split to aim for"),
  `spendingWaterfall` (corpus `av2r3-money-needs-wants`, `av2r3-money-waterfall`).
- Showcase hook: none written (the Showcase money log is pinned by the NOVA corpus). Both views read the Showcase's own
  entries; "Needs, wants and saving" there shows every category as Not marked until the person marks one (kept in the
  Showcase tab only). Empty states teach ("Mark each spending category…", "No spending logged in these two months yet").
- Registries: none new. CSS touched: `components/wealth/spending/insights/insights.css` (theme variables only).
- Today: nothing added. Wealth → Spending gets two more buttons in "Your money over time" (10 instead of 8); the lead
  checks any Wealth Tab-stop or 390 px ceiling that pins that row.
