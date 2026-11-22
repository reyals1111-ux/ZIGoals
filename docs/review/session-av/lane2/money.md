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

### F3. Notices: a bill's note in Spotlight, budgets on Today, device notices, a payee watch, challenges, cash until payday, a low-balance line, a year in review, account notes and order

- LEDGER rows: #128 YNAB Spotlight, a bill's note to self coming due — **built**; #129 YNAB what is left in each budget
  on Today — **built, opt-in** (Budgets → "On Today"; one plain-text line under the Money line, no Tab stop; off by
  default, so Showcase Today keeps its 89 Tab stops and its 390 px height: nothing always visible is added);
  #150 Copilot device notice — **built** (a new notification type "Money notices": a budget the morning after it passed
  80 % or its amount, the day before payday, a week and a day before the forecast crosses the low line; stateless, words
  only with names on; the service worker composes the line); #152 Rocket Money watching a payee, and NOVA — **built**;
  #153 Rocket Money challenges — **built**; #154 Rocket Money cash left after the bills until payday — **built** (the
  60-day forecast's figure the day before payday); #155 Rocket Money low-balance line — **built** (a person-set amount,
  the first day the forecast goes below it, on Today and as a device notice); #149 Copilot a year in review and the
  bills' total — **built**; #143 Monarch account note and custom account order — **built** (net-worth range is
  not in the row's "What is missing").
- Files: `lib/money-notices.ts` (new), `lib/money-attention.ts`, `components/wealth/today-money-attention.tsx`,
  `components/wealth/budgets/budget-extras.tsx` (new, lazy), `components/wealth/budgets/year-recap.tsx` (new, lazy),
  `components/wealth/budgets/budgets-month.tsx`, `components/cash-forecast/payday-low.tsx` (new, in the forecast's chunk),
  `components/cash-forecast/cash-forecast.tsx`, `components/wealth/accounts-section.tsx`, `lib/money-log/counted.ts`
  (account note, order), `lib/notify/{plan,prefs,sync}.ts`, `public/sw.js`.
- Tests: `lib/av2-money-notices.test.ts`, `lib/ai/local-answers/av2-money.test.ts`, round trip (budgets `payees`,
  `challenges`, `onToday`; log `lowBalance`, `accounts`).
- Spec: `tests/av2-money-notices.spec.ts`.
- Help (EN): **Q: Can Today show what is left in my budgets?** A: Yes, if you want it: Wealth → Budgets → On Today. A
  quiet line under Money then lists each budget's amount left. **Q: Can ZIGoals tell me when a budget is nearly used
  up?** A: Turn on Settings → Notifications → Money notices. The morning after a budget passes 80 % (or its amount) your
  device says so; the day before payday it says what the forecast leaves; amounts show only if names are on.
  **Q: How do I watch one shop?** A: Budgets → Watching payees: this month against last month by the same day; Today
  names it when it is well above. **Q: What is a challenge?** A: Your own game: spend less on one category this month
  than last month. Budgets → Challenges shows how much is to spare. **Q: Can I get a warning before my cash runs low?**
  A: Money tools → Next 60 days → Low-balance line. When the forecast goes below it, Today and a money notice name the
  day. It is a model from your records, not a promise. **Q: Where is my year in review?** A: Budgets → "<year> in
  review". **Q: Can I add a note to an account or change their order?** A: Edit an account for its note; "Arrange"
  beside What you own / What you owe moves accounts up and down.
- What's new: "Money: watch a payee, spend-less challenges, budgets on Today (if you want), money notices, what is left
  until payday, a low-balance line, your year in review, and notes on accounts."
- Answers: `payeesWatched`, `challenges`, `untilPayday`, `lowLine`, `yearInReview`, `accountNotes` (corpus ids
  `av2-money-payees`, `-challenges`, `-until-payday`, `-low-line`, `-year`, `-account-notes`).
- Showcase hook: none (Showcase bills have no note day; a Showcase challenge or watched payee would change the NOVA
  corpus answers and cards pinned on the Showcase; the Showcase Today line is unchanged by design).
- Registries: none. New notification type `money` in `lib/notify/prefs.ts` (the prefs record keeps any type name).
  CSS touched: `components/wealth/budgets/budgets.css`, `components/cash-forecast/cash-forecast.css`,
  `components/wealth/accounts.css`, `components/tasks/today-tasks-due.css` (`.today-budgets-left`).
- Today: nothing always visible. The opt-in "Budgets left" line adds no Tab stop; the low-balance piece joins the
  existing Money link (one Tab stop, as before) only when the person set a line.

### F4. CoinStats: a rolling 24 h move alert, a ±% portfolio alert, "Count in results", the Time Machine

- LEDGER rows: #173 a rolling "moves X % in 24 h" from the quotes already read — **built** (the 24 h change the market
  insights already carry; up, down or either way; it can tell again the next day while the move lasts); #174 the ±X %
  portfolio form — **built** (from its value when the alert was set; fires once; checked app-wide where alerts are);
  #172 "count in results" per transaction — **built** (cost, profit and loss and the all-time result leave it out; the
  holdings and value keep it; refused, in words, when a later sale needs its coins); #175 Time Machine — **built**
  ("On a past day" under Analysis: holdings at the end of the day, each price and value then from the market history the
  value chart already reads, a year back; unknown stays unknown). No new outside service: only `/api/market-insights`
  and `/api/market-history`, which the app already calls.
- Files: `lib/price-alerts/moves.ts` (new), `lib/price-alerts/engine.ts` (Today's card, Seen, the watch gate count the new
  lists), `components/price-alerts/price-alerts.tsx`, `components/price-alerts/portfolio-value-alert.tsx`,
  `lib/portfolio/counted.ts` (new), `lib/portfolio/time-machine.ts` (new), `components/portfolio/time-machine.tsx` (new,
  lazy), `components/portfolio/portfolio-view.tsx`, `components/portfolio/portfolio-sections.tsx`.
- Tests: `lib/price-alerts/av2-moves.test.ts`, round trip (`moves`, `portfolioMoves`, `uncounted`).
- Spec: `tests/av2-money-crypto.spec.ts` (MOCK quotes and a MOCK 24 h change).
- Help (EN): **Q: Can an alert follow a day's move rather than a fixed price?** A: Yes: on a coin, Price alert → "moves
  a percent within 24 hours", up, down or either way. It uses the 24-hour change the app already reads and can tell you
  again the next day while the move lasts. On a portfolio, Value alert → "a percent more or less than now".
  **Q: Can I leave a transaction out of my profit and loss?** A: Untick "Count in results" on it (Portfolio → Insights,
  or a coin's transactions). Its coins still count in what you hold and its value. **Q: What was my portfolio worth on
  a past day?** A: Portfolio → Analysis → "On a past day": pick a day in the last year.
- What's new: "Portfolio: 24-hour move alerts, a portfolio percent alert, leave a transaction out of your results, and
  what you held on a past day."
- Answers: `moveAlerts`, `timeMachine` (corpus `av2-money-move-alerts`, `av2-money-time-machine`). Note for the lead:
  the existing `priceAlerts` answer in `av-answers.ts` lists coin, goal and value alerts only; the move alerts are
  answered by `moveAlerts` ("which move alerts do I have").
- Showcase hook: none (the Showcase portfolio's alerts are hidden by design, `!showcase`); the Time Machine shows the
  Showcase's labelled fixture prices.
- Registries: none. CSS touched: `components/portfolio/portfolio.css`.
- Today: the existing "Your price alerts" card also lists a reached move alert (no new card).

### F5. Budgets: target types, Underfunded, assign mode, suggested amounts, flex buckets, non-monthly budgets and groups, CSV, scenarios

- LEDGER rows: #126 YNAB weekly and yearly target types, an Underfunded total, snooze — **built** (weekly × the weeks
  that start in the month, monthly, yearly by its month; the saving target's monthly share counts too); #127 YNAB a
  different amount per month, quick-assign ("fund what's underfunded", "same as last month") and moving money — **built**
  (plus "use the 3-month average"; each with Undo); #135 Monarch flex budgeting — **built** (fixed / flexible /
  non-monthly bucket, one "Flexible left"); #136 Monarch non-monthly budgets, a starting balance, budget groups —
  **built**; #137 Monarch CSV of a month's budget table — **built** (text cells formula-safe, amounts as numbers);
  #138 Monarch several saved forecast scenarios side by side, and one-off or recurring life events in the long model —
  **built** (Financial freedom: life events counted by every path, up to four scenarios compared); #145 Copilot a
  suggested budget from the last months' average, a different amount for one month — **built**; #151 Rocket Money the
  suggested average (and the near-limit device notice, built in F3) — **built**.
- Files: `lib/budgets/assign.ts` (new), `lib/budgets/engine.ts` (`budgetedIn`, `movedIn`, the starting balance in the
  carry), `lib/budgets/ready-to-assign.ts` (that month's own amount), `components/wealth/budgets/assign-panel.tsx` (new,
  lazy), `components/wealth/budgets/budgets-month.tsx`, `lib/fi-model/model.ts` (`events`, `eventsAt`),
  `components/wealth/money-tools/fi-scenarios.tsx` (new, lazy), `components/wealth/money-tools/fi-model-panel.tsx`.
- Tests: `lib/budgets/av2-assign.test.ts`, round trip (budget `need`, `snoozed`, `months`, `bucket`, `period`, `start`,
  `group`; record `moves`; FI `events`, `scenarios`). Existing budget, recap and FI tests unchanged and green.
- Spec: `tests/av2-money-budgets-plan.spec.ts`.
- Help (EN): **Q: What does "Underfunded" mean?** A: Give a budget a target (Budgets → Plan → Target: an amount each week,
  month or year) and Underfunded shows what this month's amount falls short of it. "Fund what is underfunded" tops every
  budget up for this month; Snooze leaves a target out for one month. **Q: Can a budget have a different amount in one
  month?** A: Yes: Plan → "This month only". "Same as last month" and "Use the 3-month average" fill every budget at
  once; Undo puts them back. **Q: How do I move money between budgets?** A: Plan → "Move money between budgets": from
  one, to another, an amount up to what is left. **Q: What are flexible and non-monthly budgets?** A: Mark everyday
  budgets Flexible to see one "Flexible left" figure. A non-monthly budget (insurance every 12 months) sets a share
  aside each month. Groups put budgets under your own headings. **Q: Can I download my budgets?** A: Plan → "Download
  this month (CSV)". **Q: Can I compare plans for the long run?** A: Financial freedom → Life events (a car, a pension)
  and "Save as a scenario"; up to four scenarios side by side. It is a model, not advice.
- What's new: "Budgets: weekly and yearly targets with Underfunded, a different amount per month, fund in one tap, move
  money, flexible and non-monthly budgets, groups, a CSV of the month, and scenarios in Financial freedom."
- Answers: `underfunded`, `flexibleLeft`, `suggestedBudget` (corpus `av2-money-underfunded`, `-flexible`,
  `-suggested-budget`).
- Showcase hook: none (the Showcase budgets feed the NOVA corpus and cards; a target or bucket there would change their
  pinned answers — the lead can add one with the corpus re-recorded).
- Registries: none. CSS touched: `components/wealth/budgets/budgets.css`, `components/wealth/money-tools/money-tools.css`.
- Today: nothing.

### F6. The debt planner: more orders, the kept plan followed, payments that lower the balance, the debt-free date on Wealth, CSV and trend, a to-pay list, paid-off-by months, what-if, consolidation, Debt Blaster, the bill tracker, promo rates and notes, paid off, printables

- LEDGER rows: #157 highest monthly interest, highest payment and Cash Flow Index orders — **built** (plus "by your
  paid-off-by months"; a chosen order is kept as "Your order", so older builds read the same plan); #158 Today following
  the kept plan — **built** (the Money line names it when what is owed is behind the kept plan; "pay-down goals": the
  kept plan's month-by-month balances are the goal line it is measured against); #159 the debt's own shown balance
  lowered by its payments until the next statement — **built** (Wealth → each debt: "€X after 1 payment since"; the
  planner and the glance use it too); #161 the debt-free date and 12-month progress on Wealth's debts group — **built**;
  #162 a CSV of the plan and a small balance trend per debt — **built**; #163 debt minimums in the same list and "Mark
  paid" — **built** (Bill tracker: a bill's Mark paid adds an expense to the money log, a debt's records a payment);
  #164 a per-debt "paid off by" month the plan funds first — **built** (its order, and what each needs a month);
  #165 reverse what-if — **built**; #166 consolidation, labelled a model — **built**; #167 Debt Blaster — **built**;
  #168 a payment history per bill across months, autopay, editing a bill — **built**; #169 a promo rate with an end date
  and a debt note — **built**; #170 a paid-off list with dates and "paid down this year" — **built**; #171 printable debt
  and bill tracker sheets — **built** (Print the plan / Print the bill tracker: the sheet alone, print CSS).
- Files: `lib/debt-planner/more.ts` (new), `lib/debt-planner/wealth.ts` (new), `lib/debt-planner/plan.ts` (`stepUp`,
  `promoRate`/`promoMonths`), `lib/bills/tracker.ts` (new), `components/wealth/debt-planner-tools.tsx` (new, lazy),
  `components/wealth/debt-planner.tsx`, `components/wealth/debts-summary.tsx` (new, lazy),
  `components/wealth/accounts-section.tsx`, `components/wealth/bills/bill-tracker.tsx` (new, lazy),
  `components/wealth/bills/upcoming-bills.tsx`, `lib/money-attention.ts`, `components/wealth/today-money-attention.tsx`.
- Tests: `lib/debt-planner/av2-more.test.ts`, round trip (planner `promoRate`, `promoUntil`, `note`, `payoffBy`,
  `method`, `stepUp`, `tracked.method`/`stepUp`; bill `autopay`). Existing planner tests and `av-debt-plan` logic
  unchanged and green.
- Spec: `tests/av2-money-debts.spec.ts`.
- Help (EN): **Q: Which order should I pay my debts in?** A: ZIGoals does not advise; the planner shows each order's
  debt-free month and interest: snowball, avalanche, highest monthly interest, highest payment, the Cash Flow Index
  (what is owed ÷ its minimum, lowest first) and your own paid-off-by months. "Use" keeps one. **Q: What is Debt
  Blaster?** A: The extra a month rises by an amount you choose every 1, 3, 6 or 12 months. **Q: How much extra would
  make me debt-free by a month?** A: Planner → "Debt-free by a month?". **Q: Would one consolidation loan cost less?** A:
  Planner → "One consolidation loan?": its rate, term and fee against your plan; a model, not an offer. **Q: My card is
  at 0 % until March. Can the plan know?** A: Planner → "Each debt": a promo rate and the month it ends; the usual rate
  follows. **Q: Where do I mark a bill or a debt payment paid?** A: Upcoming bills → Bill tracker: "Mark paid" adds the
  bill to your money log, or records the debt's payment; each bill shows its last 12 months, an "autopay" mark and Edit.
  "Print" makes a sheet of the plan or the bills.
- What's new: "Debts: more orders, Debt Blaster, debt-free by a month, a consolidation model, promo rates and notes, your
  debts at a glance on Wealth, and a bill tracker with Mark paid and history."
- Answers: `paidOff`, `paidDown`, `keptPlan`, `debtFreeBy` (corpus `av2-money-paid-off`, `-paid-down`, `-kept-plan`,
  `-debt-free-by`).
- Showcase hook: none (the Showcase planner has no kept plan or minimums: the existing Showcase Today line stays as it
  is; the bill tracker is hidden in the Showcase, like the other Showcase-hidden write actions).
- Registries: none. CSS touched: `components/wealth/debt-planner.css`, `components/wealth/accounts.css`,
  `components/wealth/bills/bills.css`.
- Today: nothing always visible; the "behind your kept plan" piece joins the existing Money link only for a person who
  keeps a plan and is behind it.

### F7. The open q2 Minors (Money)

Re-checked against the code at this branch; each row of `quality/q2.md` marked Minor:

| q2 row | state at `lane2/money` |
|---|---|
| #9 "Add a target" on a row; "set aside" with days to go | already fixed (`AddTarget`; "left so far" in the month) |
| #7 vs-last on a phone | already fixed (Category · This month · Difference with "was …") |
| #10 bill calendar paging | already fixed (By month view) |
| #14 Light-theme flow fills | already fixed (insights.css, 3:1 note) |
| #16 order and lumps kept / NL place / schedule answer | already fixed ("not kept yet" note, `DEBT_PLANNER_WHERE_NL`, `debtSchedule`); lane 2 also keeps promo, note and paid-off-by on Keep |
| #20 Today's links, "fast" | already fixed |
| #21 amount range | already fixed |
| #31 watch: Showcase example, answer, budgeted refused, all of last month, Today | already fixed |
| #35 rolling ±% | **built in F4** (24 h move alerts) |
| #35 Showcase value alert example | **built now**: a read-only "Value alert (example)" on the Showcase portfolio, never stored (`components/portfolio/portfolio-view.tsx`) |
| #35 "already above" warning, price-alerts answer | already fixed |
| #37 a near-limit Showcase budget | **left: against a named rule** — the Showcase budgets are pinned by the NOVA corpus (`lib/ai/evals/as/expected.json`: "No budget is near its limit (80%) this month. The fullest: Groceries 75% …", EN and NL, and "3 van 3 budgetten binnen plan …"), which this lane may not edit; shaping Groceries to 80 % would move those pinned answers. The lead can do it with the corpus re-recorded: in `lib/bills/showcase.ts` set the Groceries budget `monthly` to `'230.00'` (187.10 / 230 = 81 %). |
| #37 budgets answer naming near / fast | already fixed (`nearLimit`) |
| #49 focus after fresh start; Showcase; recap answer | already fixed |

- Spec: the Showcase example is covered by the lead's Showcase sweep (no new spec: it is static text).
- What's new: none (a Showcase example).
