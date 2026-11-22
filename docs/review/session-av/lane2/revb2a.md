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
