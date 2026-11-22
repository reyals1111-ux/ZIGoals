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
