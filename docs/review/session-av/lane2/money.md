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
