# Lane 2 registry: Money, round 5 (`lane2/r5-money`)

Builder: the Money pillar, round 5 (LEDGER "Round 5: rows #348–#390", groups V6 and V7: rows #384–#390; COMPETITORS
"Ten more apps, round 5": Tiller, PocketSmith). Branch `lane2/r5-money`, cut from `lane2/batch4` (which holds all lane 2
work through round 4). What lane 2 built in Money before is in `money.md`, `money-r2.md`, `r3-money.md`, `r4-money.md` and
`revb2a.md`; nothing here repeats it.

**One spending figure.** Every spending and income figure these features show is summed by the shared rule in
`apps/web/lib/money-log/counted.ts` (`countedCents`, `countedDayParts`, `countedBetween`, `countedByCategoryBetween`,
`countedIn`, `budgetDayParts`) or Wealth → Spending's own `totals` / `byCategory` (`apps/web/lib/money-log/engine.ts`): an
entry left out of the figures, both sides of a transfer and a Settle-up refund are not counted; a shared cost counts the
person's own share; a cost spread over months counts its share in each month. Each feature below names the function its
figures use. Every amount goes through the app's money formatter (`moneyCents` / `formatCurrencyAmount`); every date and
month through `lib/visual-format.ts`; the Dutch answers write money with the `nl-NL` locale ("€ 12,50") and dates as
`dayIn('nl', …)` / `monthIn('nl', …)`. No money advice: plain figures and plain words.

## Stored changes (TIER 3, stored formats; commit `f9c7bcae`)

All additive and optional, on loose objects only, each `.optional().catch(undefined)`, so a value this build cannot read
is dropped on read and never fails the record. Both records are already in Export everything and the account erase (the
notification prefs are exported and erased, and — as every notification pref — not restored; the money extras are also
restored), the data catalogue and the restore plan, so **no new key and no registry entry is needed**. Older builds keep
the new fields untouched in the loose objects.

| record | field | what it holds | rows |
|---|---|---|---|
| `zigoals:notify:v1` | `moneyMorning` (`{onToday?: true}`) | "Yesterday's money" as a quiet line on Today | #384 |
| `zigoals:notify:v1` | `types.moneyMorning` (the record's existing `types`, which keeps any type name) | the morning notification switch, off by default | #384 |
| `zigoals:money-more:v1` | `whatIfs` (≤ 5: id, name ≤ 40, currency, ≤ 3 changes of `{kind: once/monthly, dir: out/in, amount, from, until?, label?}`) | named "Try a change" sets for the cash forecast | #388 |

Deviation from the ledger, said here: #388 asked for a small new device record. The saved sets live instead as a new
optional field of the existing money extras record (`zigoals:money-more:v1`, already in Export everything, the restore, the
catalogue and the erase), as round 4 did for #344 and #346, so no new key, device-key list entry or registry entry is
needed. Round trip: `apps/web/lib/av2-money-r5/round-trip.test.ts` (money extras: export → erase → restore, replace; the
notification prefs: exported, erased, not restored; unreadable values dropped; later fields kept).

**Answers wiring (all features)**: in `apps/web/lib/ai/local-answers/engine.ts`, before `av2R4MoneyAnswer`:
`import {av2R5MoneyAnswer} from './av2-r5-money';` and `av2R5MoneyAnswer(question, env) ?? av2R4MoneyAnswer(question, env) ?? …`.
`apps/web/lib/ai/local-answers/av2-r5-money.test.ts` proves both ways: round 5's answers claim no other question of the
corpus (`CORPUS`) nor round 4's (`AV2_R4_MONEY`), and the answers that run before them in `deviceAnswer`
(`rehearsalAnswer`, `av2RestAnswer`, `av2SyncAnswer`) and the earlier money answers (`av2R4MoneyAnswer`,
`av2R3MoneyAnswer`, `av2MoneyR2Answer`, `av2MoneyAnswer`, `avAnswer`) claim none of round 5's questions. Corpus:
`AV2_R5_MONEY` from `apps/web/lib/ai/evals/as/cases-av2-r5-money.ts` into `cases.ts`.

## Features

### R5-F1 (group V6). Yesterday's money

- LEDGER row: #384 Tiller a short money summary each morning — **built** (Wealth → Spending → "Yesterday's money", a fold
  that loads its own chunk: yesterday's day, how many entries were logged for it, what was spent and received per
  currency, each cash and savings account's latest balance, and two choices, both off until chosen: "A notification each
  morning" and "A quiet line on Today"; while notifications are not on on the device it says where to turn them on. The
  notification wakes at the person's morning time (the end of quiet hours when the morning is quiet) under its own switch
  (Settings → Notifications → "Yesterday's money", off by default); with names off it says only "Yesterday's money · 5
  entries" — never an amount, an account name or a payee; with names on it adds the figures per currency and up to two
  cash balances, still never a payee. Today's line is plain text with no Tab stop: "Yesterday: 3 entries · spent €72.10",
  never in the Showcase. A day with nothing logged and nothing counted sends and shows nothing).
- Spending function used: `countedBetween` (lib/money-log/counted.ts) for the day, spending and income per currency
  (`dayMoney` in lib/money-log/yesterday.ts): the person's share of a shared cost, nothing for a left-out entry, a
  transfer or a refund passed on, and a cost spread over months by its share on its day of each month (as the month
  calendar). The unit test shows a day without a spread cost adds up to Spending's own `totals`. The count is the entries
  dated that day.
- Files: `lib/money-log/yesterday.ts` (new), `components/wealth/spending/yesterday-money.tsx` (new, lazy on its fold),
  `components/wealth/spending/money-r5.css` (new), `components/wealth/spending/spending-section.tsx` (the fold),
  `components/wealth/today-money-attention.tsx` (the Today line), and TIER 3 (PWA): `lib/notify/prefs.ts` (the type
  `moneyMorning`, its label, off by default), `lib/notify/plan.ts` (`moneyMorning` input; the count unless names are on),
  `lib/notify/sync.ts` (`morningMoneyWakes`), `public/sw.js` (its own line, apart from the other money notices).
- Tests: `lib/money-log/av2-yesterday.test.ts` (the day by the shared rule, the plan with names on and off, the switch
  off by default, quiet hours, the service worker's words), `lib/ai/local-answers/av2-r5-money.test.ts`; the existing
  `lib/notify` tests green unchanged.
- Spec: `tests/av2-money-yesterday.spec.ts`.
- Stored: `zigoals:notify:v1` `moneyMorning` and `types.moneyMorning` (commit `f9c7bcae`).
- Help (EN): **Q: Can ZIGoals tell me each morning what I spent yesterday?** A: Yes, if you want it. Open Wealth →
  Spending → "Yesterday's money" and tick "A notification each morning" (notifications must be on in Settings →
  Notifications). It says how many entries you logged; with names on in your notifications, also what you spent and
  received and your cash balances. It never names a payee. "A quiet line on Today" shows the same on Today.
- What's new: "Spending: yesterday's money each morning, as a notification or a line on Today, if you want it."
- Answers: `yesterday` (corpus `av2r5-money-yesterday`; reads `env.moneyLog`, `env.accounts` and `env.ak.notifyPrefs`,
  already in the AK tool sources).
- Showcase hook: none. The Showcase's notifications plan is never built (gather returns null in the Showcase) and its
  Today line is never shown; in the Showcase the panel says its choices are not kept. The fold itself reads the Showcase
  money log. Empty state teaches ("Nothing counted yesterday. Each day you log spending or income, it adds up here the
  next morning.").
- Registries: none. CSS touched: `components/wealth/spending/money-r5.css` (new, theme variables only).
- Today: nothing always visible. The line shows only after the person ticks "A quiet line on Today", as plain text with
  no Tab stop, and never in the Showcase. Settings → Notifications gains one switch ("Yesterday's money").

### R5-F2 (group V6). This year so far against the budgets

- LEDGER row: #385 Tiller this year so far against the budgets — **built** (Wealth → Budgets → "<year> so far against your
  budgets", a fold that loads its own chunk when there is at least one budget: one line per currency — "€3,160.00 spent
  against €3,400.00 budgeted in EUR — €240.00 under so far (2 budgets)" — and a table of each budget: its months (from
  January, or its own first month when it started this year), what was budgeted, what was spent and the difference as a
  fact ("€270.00 under so far", "€30.00 over so far", "exactly on budget so far"; never "overspending"); tap a category
  for its months one by one. This month counts whole, as its budget does. Hide amounts blurs every amount).
- Spending function used: `countedBetween` (lib/money-log/counted.ts) per month, with the budget's category and currency
  (`yearSoFar` in lib/budgets/year-so-far.ts): the share of a shared cost, a split entry by its part, nothing left out,
  a cost spread over months by its share each month. The unit test shows each month equals what that month's budget
  (`monthView`) counts. Budgeted is each month's own amount (`budgetedIn`) with that month's moves (`movedIn`); money
  carried from earlier months is not added again (it is not new money), said in the view.
- Files: `lib/budgets/year-so-far.ts` (new), `components/wealth/budgets/year-so-far.tsx` (new, lazy on its fold),
  `components/wealth/budgets/budgets-month.tsx` (the fold, beside "<year> in review"),
  `components/wealth/spending/money-r5.css` (`.money-ytd-*`).
- Tests: `lib/budgets/av2-year-so-far.test.ts` (pure, against `monthView`, and the view in jsdom),
  `lib/ai/local-answers/av2-r5-money.test.ts`.
- Spec: `tests/av2-money-year-budgets.spec.ts`.
- Stored: nothing.
- Help (EN): **Q: How are my budgets doing over the whole year?** A: Wealth → Budgets → "<year> so far against your
  budgets" sets each budget's months so far beside what you spent, with the difference, such as "€120 under so far". Tap a
  category to see it month by month. It counts as your budgets do; money carried from earlier months is not counted twice.
- What's new: "Budgets: this year so far against your budgets, with the difference per budget."
- Answers: `yearBudgets` (corpus `av2r5-money-year-budgets`; reads `env.nova.budgets`, already in the NOVA tool sources).
- Showcase hook: none written. The fold reads the Showcase's own budgets and money log (pinned by the NOVA corpus), so the
  Showcase shows its year by itself; it adds one fold (one Tab stop) to Budgets — the lead re-records any screen that pins
  Budgets. Empty state teaches ("No budgets yet. Once you set a budget, each month of 2026 adds up here…").
- Registries: none. CSS touched: `components/wealth/spending/money-r5.css`.
- Today: nothing added.

### R5-F3 (group V6). A bill paid early

- LEDGER row: #386 PocketSmith an overdue bill paid early — **built** (Wealth → Upcoming bills → Bill tracker → a due date
  shown as "date passed, not in your money log" → "Paid early?": the expenses of the 14 days before it (6 for a weekly
  bill) in the bill's currency, within 5 % of its amount and not already counted for another bill date, closest amount
  first, each with its payee, category, day and how many days before; "This was it" counts one as that payment — the
  bill's match words learn that entry's payee and category, so the date shows "paid: in your money log", and later dates
  find the same payee even when paid early; Undo puts the match words back; focus moves to "To pay this month". When the
  bill was a confirmed candidate whose words change, its old candidate key goes to the dismissed list, so it is never
  offered again as a new bill (Undo takes it off again). None found: it says so and points to Mark paid.)
- Spending function used: none (no spending figure). The bill matching itself (lib/bills/month.ts `monthMatches`, which
  `billsThisMonth` now uses) gains one rule: an expense of the bill's own match words (`matchKey`) counts as its payment
  from up to 14 days (weekly: 6) before the due date, as well as within 4 days of it as before. Every other rule is
  unchanged; the existing bills, cash-forecast, budgets and money-extras tests are green unchanged.
- Files: `lib/bills/month.ts` (`monthMatches`, `entryMatchKey`, `EARLY_DAYS`, `earlyDays`), `lib/bills/paid-early.ts`
  (new), `components/wealth/bills/paid-early.tsx` (new, in the tracker's lazy chunk),
  `components/wealth/bills/bill-tracker.tsx` (the button and the panel), `components/wealth/spending/money-r5.css`
  (`.bill-paid-early*`).
- Tests: `lib/bills/av2-paid-early.test.ts`, `lib/ai/local-answers/av2-r5-money.test.ts`.
- Spec: `tests/av2-money-paid-early.spec.ts`.
- Stored: nothing new. Writes the bill's existing `matchKey` and, for a confirmed candidate, the existing `dismissed` list
  of `zigoals:bills:v1`. The money log is never changed.
- Help (EN): **Q: I paid a bill before its date and ZIGoals says it has not been paid. What do I do?** A: In Wealth →
  Upcoming bills → Bill tracker, tap "Paid early?" beside that date. It lists your expenses of the two weeks before it
  with about the bill's amount; tap "This was it" on the right one. The bill then knows that payee, so it finds the
  payment next time too. Undo puts it back.
- What's new: "Bills: a bill paid early is found — tap Paid early? and choose the payment."
- Answers: `paidEarly` (corpus `av2r5-money-paid-early`; reads `env.ak.bills` and `env.moneyLog`).
- Showcase hook: none (the Showcase's bills and money log are pinned; a choice made in the Showcase stays in its tab). The
  empty state teaches ("No expense of about €800.00 in those days. Log it in Spending, or use Mark paid.").
- Registries: none. CSS touched: `components/wealth/spending/money-r5.css` (imported by the tracker's chunk).
- Today: nothing added. A passed date in the Bill tracker gains one button ("Paid early?").

### R5-F4 (group V6). Merge two accounts

- LEDGER row: #387 Tiller merge two accounts — **built** (Wealth → Accounts → "Merge two" beside What you own or What you
  owe, when the group has two accounts or more; a panel in its own chunk: "Merge" one account "into" another — only
  active accounts in the same currency, both owned or both owed, are offered, and a refusal is said in words. The plan
  says what moves before anything is written: the balances of the one merged on every day the other has none (the
  other's own balance stays on a day both have), a debt's payments, its note (joined to the other's), the other taking the
  earlier place in the person's order, and the later "last checked against my bank" day of the two (round 4's #340).
  "Money-log entries from bank files named" lists the bank-file account names of that currency (the one merged's own
  name ticked) and "Their entries are then named" (the other's bank-file name when the log has one, else its name, with
  suggestions); exact doubles this brings together — the same day, kind, amount, currency and bank reference — are listed
  for removal, each ticked and each can be unticked. "Merge A into B" writes it; the one merged is archived with its own
  history ("nothing lost"), the panel's heading takes the focus, and Undo puts both accounts, every renamed entry, every
  removed double (at its place), the notes, the order and the last checks back.)
- Spending function used: none, on purpose: accounts keep no spending figure. Renaming an entry's bank-file name changes
  no figure; only a removed exact double leaves the figures, which the unit test shows with Spending's `totals`.
- Files: `lib/money-log/merge-accounts.ts` (new), `components/wealth/merge-accounts.tsx` (new, lazy),
  `components/wealth/accounts-section.tsx` (the "Merge two" button and the lazy panel),
  `components/wealth/spending/money-r5.css` (`.money-merge*`).
- Tests: `lib/money-log/av2-merge-accounts.test.ts`, `lib/ai/local-answers/av2-r5-money.test.ts`.
- Spec: `tests/av2-money-merge-accounts.spec.ts`.
- Stored: nothing new. Normal writes to `zigoals:accounts:v1` (snapshots, payments, `archivedAt`) and `zigoals:money-log:v1`
  (entries' existing `account`, `accounts.notes`, `accounts.order`, `accounts.checked`).
- Not carried, said here: an account's options kept by its id in other records — the net-worth sheet's options
  (`zigoals:wealth-sheet:v1`), the debt planner's minimum and documents kept with an account — stay with the archived
  account, where they are kept, not lost. The business space's money log is not renamed (accounts are personal).
- Help (EN): **Q: My bank changed its name and now I have two accounts. Can I merge them?** A: Yes. In Wealth → Accounts,
  tap "Merge two" beside What you own (or What you owe), choose the old account and the one it goes into. You see what
  moves first: its balances, payments and money-log entries; exact doubles can be removed. The old account is then
  archived with its own history, and Undo puts everything back.
- What's new: "Accounts: merge two accounts into one, with exact doubles removed and Undo."
- Answers: `mergeAccounts` (corpus `av2r5-money-merge-accounts`; reads `env.accounts`): the pairs that could be merged and
  how.
- Showcase hook: none (the Showcase's accounts are pinned; a merge made in the Showcase stays in its tab). Empty and
  refused states teach ("No other active account in EUR on this side to merge … into.").
- Registries: none. CSS touched: `components/wealth/spending/money-r5.css`.
- Today: nothing added. Each of What you own and What you owe gains one button ("Merge two") when it has two accounts or
  more (one Tab stop; the lead checks any Wealth Tab-stop ceiling that pins the group heads).
