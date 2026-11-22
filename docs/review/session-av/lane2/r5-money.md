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
