# Lane 2 registry: Money, round 2 (`lane2/money-r2`)

Builder: the Money pillar, round 2 (LEDGER "Round 2: rows #223–#255", groups R5, R7, R8: rows #242–#255; COMPETITORS
"Ten more apps, round 2": Wallet by BudgetBakers, Spendee, Emma). Branch `lane2/money-r2`, cut from `lane2/batch2` at
`dddaace8`. What lane 2 built in Money before is in `money.md`; nothing here repeats it. Each feature lists its LEDGER rows
and verdict, files, tests, specs, stored changes, Help text, What's new label, answers wiring, Showcase hook, registries,
CSS touched and anything on Today.

## Stored changes (TIER 3, stored formats; commit `3d024d2d`)

All additive and optional; on loose objects only, each `.catch(undefined)`, so a value this build cannot read is dropped on
read and never fails the record. Older builds (#37–#57) keep the new fields untouched in the loose objects and count every
entry whole in its main category, as before.

| record | field | what it holds | rows |
|---|---|---|---|
| `zigoals:money-log:v1` entry | `paidWith` (cash / debit / credit / transfer / other) | how it was paid, the person's own mark | #244 |
| `zigoals:money-log:v1` entry | `sub` (≤ 40) | the person's own subcategory under `category` | #251 |
| `zigoals:money-log:v1` entry | `share` (an amount ≤ the amount) | the person's own share of a cost paid for others too | #252 |
| `zigoals:money-log:v1` entry | `fine: true` | "That's fine" on an entry the unusual-entry line named | #248 |
| `zigoals:money-log:v1` | `subs` (≤ 40 categories × 20) | the person's subcategories by main category | #251 |
| `zigoals:budgets:v1` watched payee | `amount` | an amount a month for that payee (a payee budget) | #250 |
| `zigoals:wealth-sheet:v1` | `limits` (by account id: `below`, `above`) | a balance limit per account | #249 |
| **NEW** `zigoals:money-more:v1` | `saved` (≤ 20), `budgets` (≤ 20), `owed` (≤ 500), `loans` (≤ 200), `space`, `business` | saved entries; your own budgets on a tag or chosen categories, each month or once; what others owe from shared costs; money lent and borrowed; the money space shown | #242, #246, #247, #252, #253, #255 |
| **NEW** `zigoals:store-cards:v1` | `cards` (≤ 50: name, number, format, note) | store and club cards | #254 |
| **NEW** `zigoals:money-log-business:v1` | the money log's own format | the business space's entries | #255 |
| **NEW** `zigoals:budgets-business:v1` | the budgets' own format | the business space's budgets | #255 |

Round trip: `apps/web/lib/av2-money-r2/round-trip.test.ts` (export → erase → restore, replace). The fields on records
already in the registries run now; the four new records run once their keys are in `DEVICE_KEYS` (skipped until then).

**Registry entries the lead adds for the four new records** (all from `apps/web/lib/av2-money-r2-keys.ts`, the
`av2-money-device-keys.ts` pattern; spread them into `lib/av2-device-keys.ts` beside `AV2_MONEY_*`):
`AV2_MONEY_R2_PERSONAL_KEYS` into `AV2_PERSONAL_KEYS` (onboarding `DEVICE_RECORD_KEYS`); `AV2_MONEY_R2_EXPORT_KEYS` into
`AV2_EXPORT_KEYS` (Export everything `DEVICE_KEYS`); `AV2_MONEY_R2_CATALOG_LABELS` into `AV2_CATALOG_LABELS` (Goals and
Wealth, device); `AV2_MONEY_R2_ERASE_KEYS` into the account erase (`AV2_ERASE_KEYS`); four restore parts in
`lib/restore/plan.ts`, beside `wealthSheet`:
`dev('moneyMore', 'Money extras: saved entries, own budgets, shared costs, lent and borrowed', 'Goals and Wealth', MONEY_MORE)`,
`dev('storeCards', 'Store and club cards', 'Goals and Wealth', STORE_CARDS)`,
`dev('moneyLogBusiness', 'Your business space: money log', 'Goals and Wealth', MONEY_LOG_BUSINESS)`,
`dev('budgetsBusiness', 'Your business space: budgets', 'Goals and Wealth', BUDGETS_BUSINESS)`
(specs in `lib/money-more/schema.ts`, `lib/store-cards/schema.ts`, `lib/money-more/spaces.ts`). Never synced.

**Answers wiring (all features)**: in `lib/ai/local-answers/engine.ts`, beside `av2MoneyAnswer`:
`import {av2MoneyR2Answer} from './av2-money-r2';` and `av2MoneyR2Answer(question, env) ?? av2MoneyAnswer(question, env) ?? …`
(`lib/av2-money-r2/overlap.test.ts` proves neither `av2MoneyAnswer` nor `avAnswer` claims a round 2 question). Corpus:
`AV2_MONEY_R2` from `lib/ai/evals/as/cases-av2-money-r2.ts` into `cases.ts`. **Tool sources**: the lead adds
`moneyMore: one(MONEY_MORE)` to `ToolSources`/`ToolEnv` in `lib/ai/tools/env.ts` (beside `moneyLog`, gated with Wealth);
the answers read `env.moneyMore` and, without it, say where the figures live.

## Features

### R2-F1. Quick logging: saved entries, paid with, subcategories

- LEDGER rows: #242 Wallet record templates — **built** (up to 20 saved entries: a name, amount, category, subcategory,
  note, paid with; one-tap chips beside "Log spending", each an ordinary entry dated today with Undo; kept from the form
  with "Keep as a saved entry"; arranged and removed); #244 Wallet payment types — **built** ("Paid with" on an entry,
  the search's Paid with filter, "Paid with this month" by method under This month by category); #251 Emma subcategories
  — **built** (your own subcategories under any category, chosen in the form, rolled up into the main category's totals
  and budgets because the entry keeps its main `category`; shown apart under This month by category and in search's
  Subcategory filter; the week list and search name "Food & drink › Coffee").
- Files: `lib/money-more/quick.ts` (new), `lib/money-log/search.ts` (paid with, subcategory filters; the subcategory is
  searched as words), `components/wealth/spending/quick-log.tsx` (new, lazy: `SavedChips`, `FormExtras`, `MonthExtras`),
  `components/wealth/spending/spending-section.tsx`, `components/wealth/spending/money-search.tsx`.
- Tests: `lib/money-more/av2-quick.test.ts`, `lib/ai/local-answers/av2-money-r2.test.ts`, round trip.
- Spec: `tests/av2-money-quick-log.spec.ts`.
- Stored: entry `paidWith`, `sub`; log `subs`; `zigoals:money-more:v1` `saved`.
- Help (EN): **Q: Can I log my usual coffee in one tap?** A: Fill it in once in Wealth → Spending → Log spending and
  choose "Keep as a saved entry". It then sits beside Log spending; one tap logs it today, and Undo takes it out again.
  "Arrange saved entries" moves or removes them. **Q: Can I note how I paid?** A: Yes: "Paid with" in the form (cash,
  debit card, credit card, transfer). This month shows what you spent each way, and search can find them. **Q: Can I
  split a category into smaller ones?** A: Under a category in the form, open "Add a subcategory" (Food & drink ›
  Coffee). Totals and budgets keep counting it in Food & drink; This month shows the subcategories apart.
- What's new: "Money: saved entries in one tap, how you paid, and your own subcategories."
- Answers: `savedEntries`, `paidWith`, `subcategories` (corpus `av2r2-money-saved`, `-paid-with`, `-subcategories`).
- Showcase hook: none (the Showcase money log is pinned by the NOVA corpus and cards; the saved chips are hidden in the
  Showcase, as its other write shortcuts are). The empty states teach: "Add a subcategory under …", "Keep as a saved
  entry", "Paid with — optional".
- Registries: `zigoals:money-more:v1` (above). CSS touched: `components/wealth/spending/quick-log.css` (new, theme
  variables only).
- Today: nothing added.

### R2-F2. Budgets: a day's amount left, your own budgets on a tag or categories (each month or once), payee budgets

- LEDGER rows: #243 Spendee daily amount left — **built** ("About €6.44 a day left for 9 days" on every budget row of the
  month still running with money left — the near-limit line keeps its own words — and on each budget in Pay periods,
  in its own week or two weeks; left ÷ the days left, rounded down to the cent; a fact, not advice); #246 Spendee budgets
  by label — **built** (a budget on one tag: the tagged entries in any category against an amount); #247 Wallet one-time
  budgets across categories — **built** (once between two days or each month, over chosen categories or a tag, with
  spent, left, days to go, "starts in N days", "ended", and a day's amount). Kept in `zigoals:money-more:v1` `budgets`,
  apart from the monthly category budgets, so none of Budgets' totals, Ready to assign or Underfunded double-counts an
  entry (the ledger's `tag` on the budget would have counted a tagged entry twice in the month's total);
  #250 Emma merchant budgets — **built** (an amount a month on a watched payee: spent, left, "near the limit" from 80 %,
  a day's amount).
- Files: `lib/budgets/per-day.ts` (new), `lib/money-more/own-budgets.ts` (new), `components/wealth/budgets/own-budgets.tsx`
  (new, lazy), `components/wealth/budgets/budgets-month.tsx`, `components/wealth/budgets/budget-periods.tsx`,
  `components/wealth/budgets/budget-extras.tsx` (payee amount).
- Tests: `lib/money-more/av2-own-budgets.test.ts`, `lib/ai/local-answers/av2-money-r2.test.ts`, round trip (payee `amount`;
  `money-more` `budgets`).
- Spec: `tests/av2-money-own-budgets.spec.ts`.
- Stored: budgets `payees[].amount`; `zigoals:money-more:v1` `budgets`.
- Help (EN): **Q: How much can I spend a day?** A: Each budget in Wealth → Budgets says about how much a day is left this
  month: what is left divided by the days to go. It is a fact from your figures, not advice. **Q: Can I budget for a
  trip across categories?** A: Budgets → Your own budgets → "Add your own budget": count the entries with a tag (holiday)
  or chosen categories, once between two days or each month. It sits beside your category budgets. **Q: Can I give a
  shop its own budget?** A: Watch the shop under Budgets → Watching payees and choose "Set an amount a month": its row
  then shows spent and left, and says when it is near the limit.
- What's new: "Budgets: about how much a day is left, budgets on a tag or several categories for a trip, and a budget for
  one shop."
- Answers: `dayLeft`, `ownBudgets`, `payeeBudgetsAnswer` (corpus `av2r2-money-day-left`, `-own-budgets`,
  `-payee-budgets`). Tag budgets read `env.moneyTags`: **the lead adds `moneyTags: one(MONEY_TAGS_RECORD)` to the tool
  sources** (lib/ai/tools/env.ts), gated with Wealth; without it a tag budget counts nothing in the answer.
- Showcase hook: none (the Showcase budgets are pinned by the NOVA corpus — a payee amount or an own budget there would
  change pinned answers; the per-day line shows on the Showcase rows by itself, from their own figures, as plain text with
  no Tab stop — the lead re-records the corpus' screens if one pins a budget row's text).
- Registries: `zigoals:money-more:v1` (above). CSS touched: `components/wealth/budgets/budgets.css` (theme variables).
- Today: nothing always visible (the payee-budget piece on Today's money line is R2-F3).

### R2-F3. Alerts: an entry above its usual, a balance line per account, planned payments with one tap to record

- LEDGER rows: #248 Emma unusual-transaction alerts — **built** (an entry of the last 14 days more than twice the median
  of the last ten at its payee — or, with fewer than three there, in its category — and at least 20 more; one calm line
  in Spending with "Open" and "That's fine" (Undo), and a piece on Today's one money line); #249 Wallet balance-limit
  notifications — **built** (a low and a high line per account in its Sheet, checked against its latest balance; named
  on Wealth under the net-worth cards and on Today's money line); #245 Wallet planned payments — **built as a reminder
  with one tap to record**: "Due now, not in your money log yet" at the top of Upcoming bills lists each bill whose day
  came in the last three days and that the log does not show, with "Record it" (an expense on its day, Undo) and "Not
  now"; Today's money line already names a bill due in the next three days. **Left, owner decision pending (not built):**
  "record it for me on the day" — writing the expense by itself after one opt-in goes against the rule in
  `lib/bills/tracker.ts` that every mark is the person's own record; the ledger's note asks the owner to confirm first.
  Nothing in this branch records a bill without the person's tap.
- Also on Today's money line (the same one link, no Tab stop added): a payee budget near (80 %) or over its amount and one
  of your own budgets near or over (R2-F2), "<account> below your line".
- Files: `lib/money-more/alerts.ts` (new), `lib/money-more/today.ts` (new), `lib/money-attention.ts` (optional `extra`
  pieces), `components/wealth/today-money-attention.tsx` (reads `zigoals:money-more:v1` and the tags record; nothing new in
  the Showcase), `components/wealth/spending/unusual-line.tsx` (new, lazy), `components/wealth/bills/due-to-record.tsx`
  (new, lazy), `components/wealth/account-limits.tsx` (new: `LimitNotices` lazy in `accounts-section.tsx`, `LimitForm` in
  `account-sheet.tsx`), `components/wealth/spending/spending-section.tsx`, `components/wealth/bills/upcoming-bills.tsx`.
- Tests: `lib/money-more/av2-alerts.test.ts`, `lib/ai/local-answers/av2-money-r2.test.ts`; `lib/av-money-attention.test.ts`
  unchanged and green.
- Spec: `tests/av2-money-alerts.spec.ts`.
- Stored: entry `fine`; wealth sheet `limits`.
- Help (EN): **Q: Does ZIGoals tell me about an unusual payment?** A: When an entry of the last two weeks is more than twice
  what you usually spend at that payee (or in that category), Spending and Today say so, as a fact. "That's fine" stops it
  being named again. **Q: Can I get a warning when an account's balance is low?** A: On Wealth, open the account's Sheet
  and fill in "Tell me when it is below" (or above). Wealth and Today name it when the latest balance you entered is past
  that line. **Q: Can a bill record itself?** A: No: when a bill's day comes and your money log does not show it, Upcoming
  bills offers "Record it" — one tap, with Undo. ZIGoals never records or pays anything by itself.
- What's new: "Money: a note when a payment is well above its usual, your own balance line per account, and a bill due now
  recorded in one tap."
- Answers: `unusual`, `balanceLines`, `toRecord` (corpus `av2r2-money-unusual`, `-balance-lines`, `-to-record`). The
  balance lines read `env.wealthSheet` (already listed for the lead in `money.md`, F8).
- Showcase hook: none (the Showcase's Today money line is pinned; the new pieces are left out there, and the Showcase
  hides write actions such as Record it and That's fine).
- Registries: none new (fields on records already wired). CSS touched: `components/wealth/spending/spending.css`,
  `components/wealth/bills/bills.css`, `components/wealth/accounts.css` (theme variables only).
- Today: nothing always visible. The new pieces join the existing Money link (one Tab stop, as before) only when one asks.
