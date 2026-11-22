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
