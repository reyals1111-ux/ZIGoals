# Lane 2 registry: Money (`lane2/money`)

Builder: the Money pillar (LEDGER groups 5, 8, 10, 15 and the open q2 Minors). Branch `lane2/money`, cut from
`feature/session-av-2` at `fbeb3e54`. Each feature below lists its LEDGER rows, files, tests, specs, stored changes,
Help text, What's new label, answers wiring, Showcase hook, registries and CSS touched.

## Stored changes (TIER 3, stored formats)

All additive and optional, on loose objects only, each `.catch(undefined)` so a value this build cannot read is
dropped on read and never fails the record. No new storage key. Older builds (#37–#57) read the same records as
before: the loose objects keep the new fields untouched and the old readers count entries as they did.

| record | field | what it holds | rows |
|---|---|---|---|
| `zigoals:money-log:v1` entry | `excluded: true` | "Not part of my spending": no total, budget or insight counts it | #133, #156 |
| `zigoals:money-log:v1` entry | `taxDeductible: true` | the person's own mark | #156 |
| `zigoals:money-log:v1` entry | `spread: 2–24` | months the budgets spread this expense over | #147 |
| `zigoals:money-log:v1` entry | `account` | the account a bank file named (≤ 40 chars) | #132 |
| `zigoals:money-log:v1` entry | `ref` | the bank reference of an imported row (re-import finds it) | #142 |
| `zigoals:money-log:v1` entry | `transfer` | the id of the other side of a card payment / move | #132 |
| `zigoals:money-log:v1` entry | `history` (≤ 20) | `{at, by: you/rule/bulk/import, field, from, to}` | #142 |
| `zigoals:money-log:v1` | `own: {expense?, income?}` | the person's own categories (≤ 30 each) | #156 |
| `zigoals:money-log:v1` | `accounts: {notes?, order?}` | a note per account id, the accounts list order (the accounts record is strict, so these live here) | #143 |
| `zigoals:money-log:v1` | `lowBalance: {amount, currency}` | the cash line the forecast should not cross | #155 |
| `zigoals:budgets:v1` budget | `need: {kind: weekly/monthly/yearly, amount, month?}` | YNAB's "needed for spending" target types | #126 |
| `zigoals:budgets:v1` budget | `snoozed: month` | the target snoozed that month (left out of Underfunded) | #126 |
| `zigoals:budgets:v1` budget | `months: {month: amount}` (≤ 36) | a different amount for one month | #127, #145 |
| `zigoals:budgets:v1` budget | `bucket: fixed/flexible/non-monthly` | Monarch's flex budgeting | #135 |
| `zigoals:budgets:v1` budget | `period: {every: 3/6/12, amount}` | a non-monthly budget set aside monthly | #136 |
| `zigoals:budgets:v1` budget | `start: amount` | a starting balance | #136 |
| `zigoals:budgets:v1` budget | `group` | the person's own budget group | #136 |
| `zigoals:budgets:v1` | `moves` (≤ 200) | money moved between two budgets in a month | #127 |
| `zigoals:budgets:v1` | `payees` (≤ 20) | watched payees | #152 |
| `zigoals:budgets:v1` | `challenges` (≤ 12) | "spend less than last month in <category>" | #153 |
| `zigoals:budgets:v1` | `onToday: true` | what is left in each budget, on Today (opt-in) | #129 |
| `zigoals:bills:v1` bill | `autopay: true` | the person's "paid automatically" mark | #168 |
| `zigoals:debt-planner:v1` debt | `promoRate`, `promoUntil`, `note`, `payoffBy` | an introductory rate to a month, a note, a paid-off-by month | #164, #169 |
| `zigoals:debt-planner:v1` | `method` (interest / payment / cfi / targets) | a further order; its plan is also kept as `order` + `shown: custom`, so older builds read the same plan | #157 |
| `zigoals:debt-planner:v1` | `stepUp: {amount, every}`; `tracked.method`, `tracked.stepUp` | Debt Blaster | #167 |
| `zigoals:fi-model:v1` | `events` (≤ 12), `scenarios` (≤ 4) | life events in the long model, saved scenarios | #138 |
| `zigoals:price-alerts:v1` | `moves`, `portfolioMoves` | a rolling 24 h ±% move per coin; a portfolio's ±% from its value when set | #173, #174 |
| `zigoals:portfolio-receipts:v1` | `uncounted` (transaction ids) | "count in results" off for a transaction (the Portfolio record is strict, so it lives here, as the receipt kinds do) | #172 |

Round trip: `apps/web/lib/av2-money/round-trip.test.ts` (export → erase → restore, replace).
Device keys / catalogue / export / erase entries needed: none (existing keys only).

## Features

### F1. The money log's tools: left out, tax mark, own categories, exclude / payee / tag filters, drill-down, several at once, suggestions on imports

- LEDGER rows: #131 YNAB habit-matching on new imports — **built**; #133 YNAB credit-card interest ("not part of my
  spending") — **built**; #139 Monarch drill-down from a category into its entries with bulk recategorise — **built**
  (from Spending → "This month by category"; the Insights flow's table keeps its figures); #140 Monarch exclude, payee
  and tag filters that the totals follow — **built**; #144 Copilot suggestion in the To review queue — **built** (one
  per entry, and "Use every suggestion"); #148 Copilot multi-select with bulk recategorise or tag — **built** (plus
  leave out / count again); #156 Rocket Money own categories, "ignore", tax-deductible mark — **built**.
- Files: `lib/money-log/counted.ts` (new: `isCounted`, `budgetMonthParts`, own categories, history, bulk), `lib/money-log/search.ts`,
  `components/wealth/spending/spending-section.tsx`, `components/wealth/spending/money-search.tsx`,
  `components/wealth/money-tools/review-inbox.tsx`, `components/review-cards/review-card-mode.tsx`,
  `components/wealth/money-tools/split-panel.tsx`, `components/wealth/budgets/budgets-month.tsx` (own categories in the
  budget form); every figure reader skips entries left out and transfers: `lib/money-log/engine.ts`,
  `lib/budgets/{engine,recap,ready-to-assign}.ts`, `lib/money-insights/{age-of-money,cash-flow,income-flow,month-compare,spending-pace}.ts`,
  `lib/buffer-days/buffer.ts`, `lib/money-tags/tags.ts`, `lib/nova/cards/spending.ts`.
- Tests: `lib/money-log/av2-counted.test.ts`, `lib/av2-money/round-trip.test.ts`, `lib/ai/local-answers/av2-money.test.ts`.
- Spec: `tests/av2-money-log-tools.spec.ts`.
- Stored: the money-log fields above (`excluded`, `taxDeductible`, `history`, `own`).
- Help (EN): **Q: How do I keep card interest or a refund out of my spending?** A: Edit the entry in Wealth → Spending
  and tick "Not part of my spending". It stays in your log and in search, but no total, budget or insight counts it.
  Search → More filters → "Only what is left out" lists them. **Q: Can I change the category of many entries at once?**
  A: Open "Search all your entries" (or tap a category under "This month by category" to see its entries), press
  Select, pick the entries and choose a new category, add a tag, or leave them out. Undo puts them back.
  **Q: Can I make my own categories?** A: Yes: Log spending → "Your own categories". They are offered in the forms,
  budgets and To review; removing one keeps it on the entries that use it.
- What's new: "Money: your own categories, leave an entry out of your spending, change many entries at once, and a
  suggested category on imported entries."
- Answers wiring (engine.ts, beside `avAnswer`, before the exact layer):
  `import {av2MoneyAnswer} from './local-answers/av2-money';` then `const lane2 = av2MoneyAnswer(question, env); if (lane2) return lane2;`
  Corpus: `AV2_MONEY` from `lib/ai/evals/as/cases-av2-money.ts` into `cases.ts`.
- Showcase hook: none in this feature (the Showcase money log is pinned by the NOVA corpus and cards; marking one of its
  entries would move "spent this month" figures other tests pin). The empty states teach: "Your own categories"
  explains itself, search says "nothing counted" / "left out of the figures, not added in".
- Registries: none. CSS touched: `components/wealth/spending/spending.css` (theme variables only).
- Today: nothing added.

### F2. History, re-import, spread over months, card payments across two files, several receipts at once

- LEDGER rows: #142 Monarch per-entry history (category, amount, rule) and a re-import that updates a changed row —
  **built** (bank statement files: OFX, CAMT.053, MT940 rows carry a reference; a CSV row has none, so a CSV re-import
  still lists a changed row as new — the files give nothing to match on, not a cause from the list: CSV columns could be
  mapped to a reference later); #147 Copilot spreading one entry over several months in budgets — **built** (2, 3, 4,
  6, 12 or 24 months, exact cents); #132 YNAB credit-card payment auto-match from files — **built** (the account a file
  names is kept on each entry; the same amount out of one account and into another within 5 days is offered in To
  review as one transfer; both sides then count as neither spending nor income; "Not a transfer" in the edit form);
  #141 Monarch receipt matched to an entry by amount and date, several photos at once — **built** (a receipt draft whose
  amount and day are already logged opens that entry; "Add several receipts" offers each photo the entries a week
  either side of its day, the same amount first). Reading the amount off the photo without the person's own AI stays
  with "Draft an entry from a receipt" (needs a model: carried part).
- Files: `lib/bankfiles/reimport.ts` (new), `lib/money-photos/match.ts` (new), `components/money-photos/several-receipts.tsx`
  (new, lazy), `components/money-photos/money-photos-panel.tsx`, `components/import/bankfiles/bank-file-import.tsx`,
  `components/wealth/money-tools/review-inbox.tsx`, `components/wealth/spending/spending-section.tsx` (history, transfer,
  spread, the receipt draft match).
- Tests: `lib/bankfiles/av2-reimport.test.ts`, `lib/money-log/av2-counted.test.ts` (spread), `lib/ai/local-answers/av2-money.test.ts`.
- Spec: `tests/av2-money-reimport.spec.ts`.
- Stored: `account`, `ref`, `transfer`, `spread`, `history` (see the table).
- Help (EN): **Q: I imported the same bank file twice and the bank had changed a row. What happens?** A: A row whose bank
  reference is already in your log is never added again. If its amount, date or payee changed, the preview says
  "Changed at your bank" and "Update" changes that entry in place; the entry's edit form lists every change under
  "Changes to this entry". **Q: How do I stop a credit card payment counting twice?** A: Import the files of both
  accounts. To review then offers the payment that left one account and arrived in the other as one transfer; marked,
  it counts as neither spending nor income. **Q: Can I spread a yearly bill over the year in my budgets?** A: Edit the
  entry and choose "Count in budgets over: 12 months". Budgets then count a twelfth each month; the month you paid it
  still shows the whole amount in its totals. **Q: Can I add many receipt photos at once?** A: Money tools → Receipt
  photos → "Add several receipts". Each photo is offered the entries near its day; type the receipt's amount to find
  the one with the same amount.
- What's new: "Money: re-import a bank file to update changed rows, card payments matched across two accounts, a year's
  bill spread over its months, and several receipts at once."
- Answers: `transfers` in `av2-money.ts` (corpus `av2-money-transfers`).
- Showcase hook: none (the Showcase has no imported files; its money log is pinned).
- Registries: none. CSS touched: `components/wealth/spending/spending.css`, `components/import/bankfiles/bankfiles.css`,
  `components/money-photos/money-photos.css`, `components/wealth/money-tools/money-tools.css`.
- Today: nothing added.
