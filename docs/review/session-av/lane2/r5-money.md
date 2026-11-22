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
- Registries: none. CSS touched: `components/wealth/spending/money-r5.css` (new, theme variables only), `components/wealth/spending/spending.css` (the fold summary).
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

### R5-F5 (group V7). Try a change on the forecast

- LEDGER row: #388 PocketSmith what-if on the cash forecast — **built** (Wealth → Spending → Money tools → Next 60 days
  (or 6 / 12 months) → "Try a change — a model", a fold that loads its own chunk when the forecast has a line: "A model,
  not a plan"; up to three made-up changes, each "Once" on a day or "Each month" from a day (until a day, optional),
  "More going out" or "More coming in", an amount (a sum works) and an optional name ("Rent more"); each is listed with
  "Take out". The forecast's own line and the dashed line "with your changes (a model)" are drawn together with a key;
  the lowest point of both and the end of both are said in words, with what the changes move in all; a change that falls
  outside the forecast's length is said; a table week by week holds both lines. Nothing is written while trying; "Keep
  these changes as …" keeps them by name on this device (up to five, the same name replacing), "Open" brings a kept set
  back, "Remove" offers Undo and keeps the focus in the panel. Never written as entries, bills, budgets or plans).
- Spending function used: none of its own. The second line is the forecast's own points (lib/cash-forecast/model.ts,
  unchanged) with each change added from its day on (`withChanges` in lib/cash-forecast/what-if.ts, exact cents as
  BigInt; a range moves with it). The forecast's everyday part already reads the money log as before.
- Deviation from the ledger's file list, said here: the ledger named `lib/cash-forecast/model.ts` for "changes as extra
  flows". The model is left untouched, so no forecast anywhere else (Today's low line, money notices, NOVA's tool) can
  ever see a made-up change; the flows are added in the new `what-if.ts` on top of the model's result.
- Files: `lib/cash-forecast/what-if.ts` (new), `components/cash-forecast/try-a-change.tsx` (new, lazy on its fold),
  `components/cash-forecast/cash-forecast.tsx` (the fold), `components/cash-forecast/cash-forecast.css` (the fold's
  summary), `components/wealth/spending/money-r5.css` (`.money-whatif*`).
- Tests: `lib/cash-forecast/av2-what-if.test.ts` (flows, the second line, the forecast unchanged, refusals, kept sets
  with Undo, the panel in jsdom writing nothing), `lib/ai/local-answers/av2-r5-money.test.ts`; the existing
  `lib/cash-forecast` tests green unchanged.
- Spec: `tests/av2-money-try-a-change.spec.ts`.
- Stored: `zigoals:money-more:v1` `whatIfs` (commit `f9c7bcae`).
- Help (EN): **Q: Can I see what a change would do to my cash forecast?** A: Yes. Under Money tools → Next 60 days, open
  "Try a change". Add up to three made-up changes — a rent that goes up from a month, a trip, more pay each month — and
  a second, dashed line shows your forecast with them. It is a model only: nothing is added to your records. Keep a set
  by name to look at it again later.
- What's new: "Forecast: try a change — a model line beside your forecast, kept by name if you like."
- Answers: `whatIfs` (corpus `av2r5-money-what-if`; reads `env.moneyMore` / `env.ak.moneyMore`, `env.accounts`,
  `env.ak.bills`, `env.nova.budgets`): each kept set's lowest point over 12 months beside the forecast's.
- Showcase hook: none (the Showcase's money extras hold no kept set; one kept there stays in its tab). The fold reads the
  Showcase's forecast by itself. Empty state teaches ("Try a change — a higher rent from a month, a trip, more pay each
  month — to see your forecast beside it.").
- Registries: none. CSS touched: `components/wealth/spending/money-r5.css`, `components/cash-forecast/cash-forecast.css`.
- Today: nothing added. The forecast card gains one fold (one Tab stop).

### R5-F6 (group V7). Your money as a spreadsheet

- LEDGER row: #389 Tiller your money as a spreadsheet — **built** (Wealth → Spending → "Your money as a spreadsheet", a
  fold that loads its own chunk: "This month", "Last 3 months", "This year" or "Everything"; the entries as a table —
  date, in or out, category › subcategory, note, amount paid, "Counted" (what the figures count: the share of a shared
  cost; "left out" or "a transfer" otherwise; "over N months" for a spread cost) and the bank-file account — sortable by
  date, category and amount (`aria-sort`, buttons in the headers), the newest 200 shown with the count said; each
  category month by month per currency with a total; each table a focusable scroll region on a phone. Two files made on
  this device, never sent: "Download as CSV" (every cell through the export's guard `csvSafeCell`) and "Download for
  Excel, Numbers or Sheets (.xlsx)" — one workbook with four sheets: Entries (amounts as numbers), Categories (kind, the
  person's own, subcategories, archived), Accounts (latest balances, provider, note, and each bank-file name with its
  number of entries) and Month by month (each category's months with a SUM formula for its total, and an "All spending"
  row of SUM formulas per month), the header row bold and frozen. Hide amounts blurs the table's amounts).
- Deviation, said here: the task asked for "a table view and a CSV export through the existing writers"; the ledger row
  asked for the .xlsx. Both are built: the CSV goes through the export's own guard, the .xlsx through the repository's
  own stored-ZIP writer (`lib/export/zip.ts`), no package. The everything export's own `money-log.csv` is unchanged.
- Spending function used: `countedCents` (lib/money-log/counted.ts) for each entry's "Counted"; `countedByCategoryBetween`
  per month for Month by month (`monthGrid` in lib/money-log/sheet.ts) — the unit test shows each month adds up to
  `countedBetween`, so the sheet's months are the budgets' and "Your money over time"'s months. "Amount" is what was paid,
  as the log keeps it.
- Text cells: XML-escaped, and by the CSV guard's own rule (`CSV_FORMULA_START`) a text starting with = + - @ gets a
  leading apostrophe, so it never becomes a formula (also when saved again as CSV); the only formulas are the writer's
  own SUMs built from cell references.
- Files: `lib/export/xlsx.ts` (new; a writer, not a registry — no export registry touched), `lib/money-log/sheet.ts` (new),
  `components/wealth/spending/money-sheet.tsx` (new, lazy on its fold), `components/wealth/spending/spending-section.tsx`
  (the fold), `components/wealth/spending/spending.css` (the fold summaries of R5-F1 and R5-F6),
  `components/wealth/spending/money-r5.css` (`.money-sheet*`).
- Tests: `lib/money-log/av2-sheet.test.ts` (rows, sort, ranges, the CSV guard, the month grid against `countedBetween`,
  the workbook unzipped by an independent stored-ZIP reader with CRC checks, every part well-formed XML, formulas, no
  formula from text), `lib/ai/local-answers/av2-r5-money.test.ts`.
- Spec: `tests/av2-money-spreadsheet.spec.ts` (the two downloads read back).
- Stored: nothing.
- Help (EN): **Q: Can I have my money in Excel or Google Sheets?** A: Yes. Wealth → Spending → "Your money as a
  spreadsheet" shows your entries as a table for this month, the last 3 months, this year or everything, and each
  category month by month. "Download for Excel, Numbers or Sheets" makes one .xlsx file with your entries, categories,
  accounts and the months with formulas; "Download as CSV" makes a plain CSV. Both are made on this device.
- What's new: "Spending: your money as a spreadsheet — a table, a CSV and an Excel workbook with formulas."
- Answers: `moneySheet` (corpus `av2r5-money-sheet`; reads `env.moneyLog`): this year's entries and counted spending, and
  where the files are made.
- Showcase hook: none written. The fold reads the Showcase's own money log, so the Showcase shows its table by itself;
  its files say nothing about the Showcase being fictional beyond its own "(SHOWCASE DATA)" notes. Empty state teaches
  ("No entries in this range. Log spending or income, or choose a longer range.").
- Registries: none. CSS touched: `components/wealth/spending/money-r5.css`, `components/wealth/spending/spending.css`.
- Today: nothing added. Spending gains one fold (one Tab stop).

### R5-F7 (group V7). Categories and rules in a file

- LEDGER row: #390 PocketSmith categories and rules in a file — **built** (Wealth → Spending → Log spending → Your own
  categories → "Categories and rules in a file", a part in its own chunk under "Start from a set": "Save categories and
  rules" makes one small JSON file (`zigoals-categories-and-rules-<day>.json`) of the person's own categories of both
  kinds, the subcategories and the rules — their match words, direction, amount range and what they set — never an entry,
  an amount spent, an id or a Goal link. "Read categories and rules from a file" reads one (from another device or a
  friend) as data only: nothing in it runs; it is refused in words when it is not such a file, larger than 256 KB or past
  the limits; a rule this build cannot read is left out and counted. The plan lists each category, subcategory and rule
  as "new" or "already there" (any case; an archived category counts as there); "Add N new items" adds only what is new
  — nothing is removed or changed — through the money log's own `addOwnCategory` and `addSub` (the usual limits hold;
  what is past them is said); new rules go after the person's own; the heading takes the focus; Undo takes out exactly
  what was added. In the business space the categories go to the business money log; rules are shared, as they are).
- Spending function used: none (no figure).
- Files: `lib/money-log/category-file.ts` (new), `components/wealth/spending/category-file.tsx` (new, lazy),
  `components/wealth/spending/category-more.tsx` (the lazy part), `components/wealth/spending/money-r5.css`
  (`.category-file*`).
- Tests: `lib/money-log/av2-category-file.test.ts` (what is saved and never saved, reading under caps, the plan, adding
  only the new, the rules then working, the limits, Undo exact), `lib/ai/local-answers/av2-r5-money.test.ts`; the
  existing `lib/money-log/av2-archive-starter.test.ts` and `lib/money-rules` tests green unchanged.
- Spec: `tests/av2-money-category-file.spec.ts` (the saved file read back; a friend's file read through the file input).
- Stored: nothing new. Normal writes of the existing `own` and `subs` (`zigoals:money-log:v1` or its business twin) and
  `rules` (`zigoals:money-rules:v1`).
- Help (EN): **Q: Can I copy my categories and rules to another device, or share them?** A: Yes. In Wealth → Spending →
  Log spending → Your own categories, "Save categories and rules" makes one small file — no entries and no amounts. On
  the other device (or a friend's), "Read categories and rules from a file" shows what is new and adds only that; nothing
  there is removed or changed, and Undo takes it out again.
- What's new: "Categories: save your categories and rules to a file, and read one on another device or from a friend."
- Answers: `categoryFileAnswer` (corpus `av2r5-money-category-file`; reads `env.moneyLog` and, when the lead adds it,
  `env.ak.moneyRules`; without it the answer says "your rules" instead of a count).
- Showcase hook: none (the Showcase's categories and rules are pinned by the NOVA corpus; a file read in the Showcase
  stays in its tab). The part's text teaches what a file holds.
- Registries: none. CSS touched: `components/wealth/spending/money-r5.css`.
- Today: nothing added.

## For the lead (everything in one list)

1. **engine.ts**: `av2R5MoneyAnswer(question, env) ?? av2R4MoneyAnswer(question, env) ?? av2R3MoneyAnswer(question, env) ?? …`
   (import from `./av2-r5-money`). Corpus: `AV2_R5_MONEY` (`lib/ai/evals/as/cases-av2-r5-money.ts`, 7 intents, 28
   questions) into `cases.ts`; record expected.json. The test proves no earlier corpus question and no round 4 question is
   claimed, and that `rehearsalAnswer`, `av2RestAnswer`, `av2SyncAnswer`, `av2R4MoneyAnswer` and the earlier money answers
   claim none of round 5's.
2. **Tool sources**: one optional addition — `moneyRules: one(MONEY_RULES)` in `readAkToolSources`
   (`lib/ai/tools/ak-sources.ts`) and its type; `categoryFileAnswer` reads `env.ak.moneyRules` and, without it, says
   "your rules" instead of a count (its test passes either way). Everything else is read already: `env.moneyLog`,
   `env.accounts`, `env.ak.bills`, `env.ak.notifyPrefs`, `env.ak.moneyMore` / `env.moneyMore`, `env.nova.budgets`.
3. **Help + What's new** (`help-page.tsx`): the Q+A and labels under R5-F1 … R5-F7 above (7 answers, 7 labels).
4. **Registries**: no new key, no new record (see Stored changes; #388 uses the money extras record instead of a new one).
   Optionally the `moneyMore` catalogue label (lib/av2-money-r2-keys.ts): add "kept forecast changes".
5. **TIER 3 commits to label**: stored formats `f9c7bcae`; PWA `7fb90d07` (the notification type `moneyMorning`, its plan
   input and the service worker's line).
6. **Specs to run** (shard lists): `tests/av2-money-yesterday.spec.ts`, `tests/av2-money-year-budgets.spec.ts`,
   `tests/av2-money-paid-early.spec.ts`, `tests/av2-money-merge-accounts.spec.ts`, `tests/av2-money-try-a-change.spec.ts`,
   `tests/av2-money-spreadsheet.spec.ts`, `tests/av2-money-category-file.spec.ts`. (`tests/av2-money-sheet.spec.ts` is
   Kubera's net-worth sheet from round 1, unchanged.)
7. **Theme sheets**: CSS touched — `components/wealth/spending/money-r5.css` (new), `components/wealth/spending/spending.css`
   (two fold summaries), `components/cash-forecast/cash-forecast.css` (one fold summary).
8. **Screens and counts to check**: Settings → Notifications gains one switch ("Yesterday's money", off). Wealth →
   Spending gains two folds ("Yesterday's money" in the personal space, "Your money as a spreadsheet"); Budgets gains
   "<year> so far against your budgets" when a budget exists (also on the Showcase); the Bill tracker gains "Paid early?"
   on a passed date; What you own / What you owe gain "Merge two" with two accounts or more; the cash forecast gains
   "Try a change — a model"; Your own categories gains "Categories and rules in a file". Today: nothing always visible.
9. **Weights**: every new panel is its own lazy chunk (yesterday, year so far, merge, try a change, spreadsheet, category
   file); "Paid early?" sits in the Bill tracker's own lazy chunk. Today's lazy money line now also reads the
   notification prefs and `lib/money-log/yesterday.ts` (small; its imports — net worth, counted, buffer kinds — are
   already in that chunk through the cash forecast); Spending's chunk gains two lazy lines and two folds. The lead checks
   the Wealth and Today budgets in the build.
10. **One rule widened** (said under R5-F3): a bill's own match words (`matchKey`) now count an expense up to 14 days (6
    for weekly) before its due date as its payment; every other matching rule is as before, and the existing bills,
    budgets, forecast and money-extras tests pass unchanged.
11. **QUALITY Minors**: QUALITY.md "Not fixed" holds no open Money Minor (its "near-limit budget" Showcase example is
    left for the pinned Showcase counts); lane2-b4's money findings are all fixed. Nothing left here.
12. **Rows left**: none. All seven rows (#384–#390) are built.

## Review B5K fixes (after `d0d2a2ff`)

One commit each, unit tests in each.

| id | verdict | fix | tests |
|---|---|---|---|
| B5K-1 Major | fixed | A payment satisfies one due date only. The early window (lib/bills/month.ts `earlyFits`) takes an entry of the bill's own words only when it lies more than 4 days after the previous due date (found on the bill's own steps, `previousDue`, so also when that date was last month) and is closer to this date than to that one. "Paid early?" offers only such entries. The existing ±4-day rule is unchanged and its tests are green. | `lib/bills/av2-paid-early.test.ts` (the 10-26 / 10-28 / 11-02 weekly case, a true early payment, a monthly case) |
