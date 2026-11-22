# Lane 2 batch 2: fresh review A fixes (slug `revb2a`, branch `lane2/revb2a`)

The findings: fresh review A of batch 2's money, tasks and sync work (lane2/batch2 @ 23eaf493), numbered as there
(B2A-1 … B2A-10). One commit per finding, Blockers first. No stored format changes in any of them.

The reference for every money figure is Wealth → Spending (`totals` and `byCategory` in apps/web/lib/money-log/engine.ts):
an entry marked "Not part of my spending" is not counted, both sides of a transfer are not counted, a Settle-up refund
(kept as a left-out income entry, lib/money-more/people.ts `settle`) is not income, and a shared cost counts the person's
own share. Budgets add one rule: an entry spread over months counts each month's share (`budgetMonthParts`). The rule is
pure and lives in apps/web/lib/money-log/counted.ts (`isCounted`, `mineCents`, `mineParts`, `budgetMonthParts`, and,
new here, `countedCents` and `budgetDayParts`). The shared unit test is apps/web/lib/money-log/revb2a-one-figure.test.ts:
the reviewer's probe month (€10 counted, €50 left out, €30 shared with share €10) plus a transfer pair, a Settle-up refund
and a salary is €20.00 spent and €1,000.00 in, in every place.

## B2A-1 Blocker: NOVA's and ZIGi's money answers counted every entry

- Verdict: fixed.
- Fix: the exact layer's `ledger` (apps/web/lib/ai/local-answers/exact/money.ts, used by `spendingAnswer` and by every
  NOVA money widget) keeps counted entries only and sums `countedCents` (an expense by the person's share, income whole).
  NOVA's spending widgets (apps/web/lib/nova/cards/ax/money-spend.ts) sum the same way where they did not go through
  `ledger`: the days with spending (`spendTrack`), the thirteen-week heat (`spendingHeat`) and the income and spending
  river (`cashRiver`); the ranked bars' "last entry" day is the newest counted entry. Only the figures changed: no layout,
  wording or look of any card (AR's NOVA composition untouched). The "largest expense" line still names what that entry
  paid (as NOVA's Spending card does), now chosen among counted entries only.
- Tests: apps/web/lib/money-log/revb2a-one-figure.test.ts ("B2A-1": `ledger` €20.00 in two entries, €1,000.00 came in,
  a transfer's category has nothing; ranks, twins and savings gauge; days, heat and river). The existing
  apps/web/lib/nova/cards/ax/money-spend.test.ts stays green unchanged.
- NOVA corpus (`pnpm exec vitest run apps/web/lib/ai/evals/as/corpus.test.ts`): passes unchanged; no case's answer
  changes. The Showcase money log holds no entry left out, no transfer and no shared cost, so its figures are the same by
  both rules. expected.json was not re-recorded.
- Spec: none (the answers' figures are unit-tested; the Showcase cannot show the difference).
- Help (EN), for the NOVA / ZIGi money answer: "What NOVA and ZIGi say you spent is what Wealth → Spending shows:
  entries left out, transfers and money paid back are not counted, and a shared cost counts your share."
- What's new: "NOVA and ZIGi count your spending as Wealth → Spending does."

## B2A-2 Blocker: pay-period budgets counted every entry whole

- Verdict: fixed.
- Fix: `periodRows` (apps/web/lib/budgets/periods.ts) counts each expense as the month budgets do, through a new pure
  helper `budgetDayParts` (apps/web/lib/money-log/counted.ts): nothing for an entry left out or a transfer, the person's
  share of a shared cost (split parts scaled), and an entry spread over months by each month's share
  (`budgetMonthParts`), placed on the entry's day in that month (the month's last day when shorter). So a payday month,
  a week or two weeks takes exactly the share a calendar month would, and with payday 1 a pay period's "spent" equals
  the month budget's. ZIGi's pay-period answer (apps/web/lib/ai/local-answers/av2-tasks.ts) reads `periodRows`, so it
  follows; and it now also receives the person's pay periods: `av2TasksAnswer` dropped the `periods` that engine.ts
  passes (and `env.nova.budgetPeriods`), so it always answered by calendar months even with a payday set.
- Tests: apps/web/lib/money-log/revb2a-one-figure.test.ts ("B2A-2": calendar-month period = month budgets = €20.00;
  a spread yearly bill's twelve €10 shares on each month's day, adding up to €120; payday 25 takes October's share,
  a week takes the share on its day; ZIGi EN "€80.00 of €100.00", NL "€ 80,00 van € 100,00", and the payday month
  "Oct 25 – Nov 24" read from NOVA's sources). Existing apps/web/lib/budgets/av2-periods.test.ts and
  apps/web/lib/ai/local-answers/revb1-pay-period.test.ts green unchanged.
- NOVA corpus: passes unchanged (no case's answer changes: the Showcase has no pay periods, left-out or shared entries).
- Spec (lead runs): apps/web/tests/av2-revb2a-periods.spec.ts (the probe month in Budgets → Pay periods and fills:
  spent €20.00, €80.00 left; the same with the month from day 5).
- Help (EN), for the pay periods answer, one sentence to add: "A pay period counts your spending as the month's
  budgets do: entries left out and transfers are not counted, a shared cost counts your share, and a cost spread over
  months counts its share on its day in each month."
- What's new: "Pay periods count spending as your month budgets do."

## B2A-3 Major: payee budgets, the payee watch and challenges counted a shared cost whole

- Verdict: fixed (the code now does what money-r2.md R2-F4 and Help say: "your share is what spending and budgets count").
- Fix: apps/web/lib/money-notices.ts — the payee watch (`payeeRows`, and so the payee budgets built on it in
  apps/web/lib/money-more/own-budgets.ts `payeeBudgets`, Today's "near its budget" line and the device notice) counts
  `mineCents`; the challenges (`spentInCategory`) count `mineParts`; the year in review (`yearRecap`: spent, months,
  top categories, the year before) counts the share too. Found in the same sweep and fixed the same way: the month
  recap (apps/web/lib/budgets/recap.ts `monthRecap`) and the three-month average that suggests a budget's amount
  (apps/web/lib/budgets/assign.ts `averageSpent`) counted shared costs whole. Entries left out were already skipped.
- Tests: apps/web/lib/money-log/revb2a-one-figure.test.ts ("B2A-3": the probe at a €100 payee budget is €20.00 of
  €100.00, €80.00 left, not near; a Groceries challenge, the month recap, the year recap and the average all €20.00).
  Existing apps/web/lib/av2-money-notices.test.ts, money-more and budgets tests green unchanged.
- NOVA corpus: passes unchanged (no case's answer changes; the Showcase has no shared costs).
- Spec (lead runs): apps/web/tests/av2-revb2a-payee.spec.ts (Budgets: "Budget €100.00 a month · €80.00 left", not
  "near the limit").
- Help (EN): the existing answer ("Your spending and budgets count your share") is now true everywhere; add "Payee
  budgets, challenges and the recaps count your share too."
- What's new: "Payee budgets and challenges count your share of a shared cost."

## B2A-4 Major: account documents added in the Showcase stayed on the device

- Verdict: fixed (apps/web/lib/showcase-storage.ts edited with the lead's permission for this one fix).
- Fix: apps/web/lib/wealth-sheet/docs.ts `deleteWealthDocs(scope)` deletes every document whose key starts with
  `<scope>:` and returns how many; `clearShowcasePhotos` (apps/web/lib/showcase-storage.ts) calls it for the Showcase
  scope beside the other photo stores, so a statement or deed added while trying the Showcase is deleted when a Showcase
  starts (load or reset) and when it ends (Return to my data, exit). Only the `showcase` scope; the person's own and an
  account's documents stay. Modelled on batch 1 #4 (journal media, 81514ee4).
- Tests: apps/web/lib/wealth-sheet/revb2a-showcase-docs.test.ts (a scope delete takes only that scope;
  `clearShowcasePhotos`, `activateShowcase` and `exitShowcase` each delete the Showcase's documents and keep local and
  an account's).
- Spec (lead runs): apps/web/tests/av2-revb2a-showcase-docs.spec.ts (a Showcase document is gone after Load Showcase
  Demo and after Return to my data; a local one stays).
- Stored change: none (no new key, no new field; the database is already in every registry).
- Help (EN), for the Showcase answer, add: "Documents you add to an account while trying the Showcase are deleted
  when it ends, like its photos."
- What's new: "Documents added in the Showcase are deleted when it ends."

## B2A-5 Minor: a removed task's earlier versions stayed on the device

- Verdict: fixed. No stored change: `zigoals:task-plan:v1` → `versions` is the existing field; only its entries for the
  removed tasks are taken out (and put back on Undo).
- Fix: removing tasks (components/tasks/use-task-list.ts `removeIds`, the one remove path every surface uses: Tasks, a
  goal's next actions, the Agenda, NOVA's widget) also removes the earlier versions of those tasks and their subtasks
  from the planning record, in the versions' own lazy chunk (components/tasks/task-versions-keep.ts `dropVersions`,
  built on the pure `dropTaskVersions` in apps/web/lib/tasks/versions.ts). The removal's Undo (the toast, the status
  line, and a joined Undo of several removals) puts the tasks and their versions back (`putBackVersions` →
  `putBackTaskVersions`). A planning record this device cannot read is never written over. The Tasks first chunk gains
  only the two small lazy calls.
- Tests: apps/web/lib/tasks/revb2a-task-versions.test.ts (pure drop and put-back in order; on the device the old words
  are gone from the record and Undo writes them back; an unreadable record is left as it is). Existing
  apps/web/lib/tasks/av2-task-versions.test.ts green unchanged.
- Spec (lead runs): apps/web/tests/av2-revb2a-task-versions.spec.ts (remove a task: its version leaves the planning
  record, another task's stays; Undo brings it back).
- Help (EN), for the task versions answer, add: "Removing a task removes its earlier versions too; Undo brings both back."
- What's new: "Removing a task removes its earlier versions too."

## B2A-6 Minor: Dutch money answers wrote English-style money

- Verdict: fixed, as review b1 #16 fixed the pay-period answer (ce63d737).
- Fix: apps/web/lib/ai/local-answers/av-words.ts `moneyIn(lang, cents, currency)`: Dutch writes "€ 40,00" (`nl-NL`),
  English the app's display format (as every English answer and the screens; unchanged). The Money round 1 and round 2
  answers (apps/web/lib/ai/local-answers/av2-money.ts, av2-money-r2.ts) write all their money through it, in the
  language of the answer being given (set for the answer's one synchronous pass in `av2MoneyAnswer` /
  `av2MoneyR2Answer`; every money figure of those files goes through the one local `money`).
- Tests: apps/web/lib/ai/local-answers/revb2a-money-lang.test.ts (every Money r1/r2 corpus question: no English-style
  money in Dutch, no Dutch-style money in English; the reviewer's "contant betaald" example "Creditcard € 40,00 en
  Contant € 3,00"). Deliberate, stricter test changes (labelled in the files): the Dutch assertions of
  apps/web/lib/ai/local-answers/av2-money.test.ts (3) and av2-money-r2.test.ts (8) accepted "€40.00" or "€40,00"; each
  now matches only the Dutch form "€ 40,00".
- NOVA corpus — five Dutch answers change (English, facts and widgets unchanged). The lead re-records expected.json:
  - `av2-money-year` nl: "2026 tot nu toe in EUR: €666.95 uitgegeven, €2,550.00 binnengekomen; het meest aan Groceries
    €268.00, Bills €120.00 en Food & drink €71.60; de grootste uitgave Energy €120.00." → "… € 666,95 uitgegeven,
    € 2.550,00 binnengekomen; het meest aan Groceries € 268,00, Bills € 120,00 en Food & drink € 71,60; de grootste
    uitgave Energy € 120,00."
  - `av2-money-suggested-budget` nl: "Groceries: €27.00 (… nu: €250.00)" → "Groceries: € 27,00 (… nu: € 250,00)".
  - `av2-money-paid-down` nl: "USD: nu $7,551.00 schuld; dit jaar afgelost $3,159.00." → "USD: nu US$ 7.551,00 schuld;
    dit jaar afgelost US$ 3.159,00."
  - `av2-money-one-total` nl: "Eén totaal in USD: $29,229.00." → "Eén totaal in USD: US$ 29.229,00."
  - `av2r2-money-day-left` nl: "Groceries €4.49, Food & drink €5.06 en Fun €2.57" → "Groceries € 4,49, Food & drink
    € 5,06 en Fun € 2,57".
  Why each is right: the same figures (cents unchanged), written as Dutch writes money (`nl-NL`: "€ 1.234,56", "US$"
  for dollars so it is not read as another dollar), as the Dutch dates in the same answers already are.
- Spec: none (answer text; unit-tested on every corpus question).
- Help: none needed. What's new: "Dutch money answers write amounts the Dutch way."
