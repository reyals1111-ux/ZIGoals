# Lane 2 registry: Money, round 4 (`lane2/r4-money`)

Builder: the Money pillar, round 4 (LEDGER "Round 4: rows #300–#347", groups U4 and U8: rows #338–#347; COMPETITORS
"Ten more apps, round 4": Actual Budget, Lunch Money). Branch `lane2/r4-money`, cut from `lane2/batch3` (which holds all
lane 2 work, round 3 included). What lane 2 built in Money before is in `money.md`, `money-r2.md`, `r3-money.md` and
`revb2a.md`; nothing here repeats it.

**One spending figure.** Every spending and income figure these features show is summed by Wealth → Spending's own
functions — `totals` and `byCategory` in `apps/web/lib/money-log/engine.ts` and the shared rule in
`apps/web/lib/money-log/counted.ts` (an entry left out of the figures, both sides of a transfer and a Settle-up refund
are not counted; a shared cost counts the person's own share; a cost spread over months counts its share each month
through `budgetDayParts` / `budgetMonthParts`). Each feature below names the function its figures use. Every amount goes
through the app's money formatter (`moneyCents` → `formatCurrencyAmount`); every date and month through
`lib/visual-format.ts` (`formatDate`, `formatMonth`, `formatWeekday`); the Dutch answers write money with the `nl-NL`
locale ("€ 12,50") and dates as `dayIn('nl', …)` / `monthIn('nl', …)`. No money advice: plain figures and plain words.

## Stored changes (TIER 3, stored formats; commit `0c11c3aa`)

All additive and optional, on loose objects only, each `.optional().catch(undefined)`, so a value this build cannot read
is dropped on read and never fails the record. Both records (and the business space's money log, the same format) are
already in Export everything, the restore, the data catalogue and the account erase, so **no new key and no registry
entry is needed**. Older builds (#37–#57) keep the new fields untouched in the loose objects and count every entry as
before.

| record | field | what it holds | rows |
|---|---|---|---|
| `zigoals:money-log:v1` (and `…business`) entry | `checked` (a day) | the statement day the entry was checked against the bank | #340 |
| `zigoals:money-log:v1` (and `…business`) entry | `group` (`{id, name ≤ 40}`) | the group the entry is shown in (at most 20 entries a group) | #341 |
| `zigoals:money-log:v1` (and `…business`) | `archived` (`{expense?, income?}`, ≤ 60 names each) | archived categories | #342 |
| `zigoals:money-log:v1` (and `…business`) | `investIncome` (≤ 30 income categories) | the person's own investment-income marks | #345 |
| `zigoals:money-more:v1` | `questions` (≤ 10: id, name ≤ 60, the search's filters, `by` week/category) | saved money searches with a chart | #344 |
| `zigoals:money-more:v1` | `places` (≤ 20: id, name ≤ 40, payees ≤ 40) | typed place names and the payees logged there | #346 |

Deviation from the ledger, said here: #344 and #346 asked for a new device record each. Both live instead as new optional
fields of the existing money extras record (`zigoals:money-more:v1`, already in Export everything, the restore, the
catalogue and the erase), so no new key, device-key list entry or registry entry is needed and "Forget places" clears its
field. Round trip: `apps/web/lib/av2-money-r4/round-trip.test.ts` (export → erase → restore, replace; the business log
too; unreadable values dropped; later fields kept). The lead may update the catalogue label of `moneyMore`
(lib/av2-money-r2-keys.ts) to add "saved searches, your places".

**Answers wiring (all features)**: in `apps/web/lib/ai/local-answers/engine.ts`, before `av2R3MoneyAnswer`:
`import {av2R4MoneyAnswer} from './av2-r4-money';` and `av2R4MoneyAnswer(question, env) ?? av2R3MoneyAnswer(question, env) ?? …`.
`apps/web/lib/ai/local-answers/av2-r4-money.test.ts` proves both ways: round 4's answers claim no other question of the
corpus (`CORPUS`), and the answers that run before them in `deviceAnswer` (`rehearsalAnswer`, `av2RestAnswer`,
`av2SyncAnswer`) and the earlier money answers (`av2R3MoneyAnswer`, `av2MoneyR2Answer`, `av2MoneyAnswer`, `avAnswer`) claim
none of round 4's questions. Corpus: `AV2_R4_MONEY` from `apps/web/lib/ai/evals/as/cases-av2-r4-money.ts` into
`cases.ts`. The answers read `env.moneyLog` and `env.moneyMore` (already read by rounds 2 and 3).

## Features

### R4-F1 (group U4). A calendar of the month

- LEDGER row: #338 Lunch Money calendar — **built** (Wealth → Spending → Your money over time → "A calendar of the
  month": a month grid from the person's week start (Monday or Sunday, the log's own setting), each day's spending and
  income in one currency at a time (currency buttons when there are more; never converted), a quiet shade in three steps
  for the larger days (a third and two thirds of the month's largest day) with a key, today ringed, the month's totals
  and its largest day in words, paged ‹ › from the log's first month to this one (the buttons stay focusable at either
  end, `aria-disabled`); a day with entries opens them in "Search all your entries" (the fold opens on that day, a note
  says so, focus goes to its summary); on a phone (≤ 640 px) the cells show a dot and the days are 44 px buttons listed
  under the grid; Hide amounts blurs every amount (`data-private-amount`)).
- Spending function used: income per day is `totals` (lib/money-log/engine.ts) for that day; spending per day is the
  shared rule's `budgetDayParts` (lib/money-log/counted.ts), so a shared cost counts the person's share and a cost spread
  over months counts its share on its day in each month (the ledger's "counted through the one-month rule"); the month's
  days add up to what the budgets count. The view says so in one line.
- Files: `lib/money-insights/month-days.ts` (new), `components/wealth/spending/insights/month-calendar.tsx` (new, lazy),
  `components/wealth/spending/insights/spending-insights.tsx` (the view; `openDay` and `weekStartsOn` props),
  `components/wealth/spending/spending-section.tsx` (`openDay`: the drill-down now takes a day without a category),
  `tests/ap/ap-money-fixtures.ts` (the view's name in `openInsight`).
- Tests: `lib/money-insights/av2-month-days.test.ts`, `lib/ai/local-answers/av2-r4-money.test.ts`. **Deliberate test
  change**: `lib/money-insights/views.test.ts` "eleven views" → "twelve views": every label named and the count exact
  (12), labelled `// Session AV lane 2 (round 4 money …, deliberate)`.
- Spec: `tests/av2-money-calendar.spec.ts`.
- Stored: nothing.
- Help (EN): **Q: Can I see what I spent each day of the month?** A: Wealth → Spending → Your money over time → "A
  calendar of the month" shows each day's spending and income, with the larger days shaded. Page back with ‹ to earlier
  months, and tap a day to see its entries in search. A cost spread over months counts its share each month, as your
  budgets do.
- What's new: "Spending: a calendar of the month, each day's spending and income; tap a day to see its entries."
- Answers: `monthDays` (corpus `av2r4-money-calendar`).
- Showcase hook: none written. The view reads the Showcase's own money log (pinned by the NOVA corpus), so the Showcase
  shows its month on the calendar by itself. The empty state teaches ("Nothing logged yet. Each day you log spending or
  income shows here on a calendar of the month.").
- Registries: none. CSS touched: `components/wealth/spending/insights/insights.css` (`.money-cal-*`, theme variables only).
- Today: nothing added. Wealth → Spending's "Your money over time" now has 12 view buttons (was 11).

### R4-F2 (group U4). Archive a category; starter sets of categories

- LEDGER rows: #342 Lunch Money archive a category — **built** (Wealth → Spending → Log spending → Your own categories →
  "Archive a category": any category of the kind shown — one of the usual ones or the person's own — leaves every picker
  (the entry form's chips and its "your most used lately", budgets' category picker, To review, Split an entry, the review
  cards; each reads `categoryChoices`, which now leaves archived ones out); its entries keep it, and reports, insights,
  search and the edit form of such an entry still show it; "Bring back" offers it again; adding an own category of that
  name says it is archived; the last category offered cannot be archived; in the business space it is kept on the
  business money log). An existing budget for an archived category stays as it is (the person's own budget is never
  hidden); only the picker no longer offers it. #347 Lunch Money starter category sets — **built** ("Start from a set":
  four written sets — a student, a household, a freelancer, a traveller — of own categories and subcategories, under the
  usual categories or the set's own, for spending and income, with names in English or Dutch; a preview lists each
  category and subcategory as new or already there; one tap adds what is new, with Undo that takes out exactly what was
  added; nothing already there is changed; the usual limits hold and a full list is said).
- Spending function used: none (no figure). The archive message counts entries (`entriesIn`), not money.
- Files: `lib/money-log/category.ts` (`archiveCategory`, `unarchiveCategory`, `archivedOf`, `isArchived`, `entriesIn`),
  `lib/money-log/counted.ts` (`allCategories`; `categoryChoices` leaves archived out; `addOwnCategory` names an archived
  twin), `lib/recent-categories/recent.ts` (`hidden` in `categoriesRecentFirst`), `lib/money-log/starter-sets.ts` (new),
  `components/wealth/spending/category-more.tsx` (new, lazy on the fold), `components/wealth/spending/money-r4.css` (new),
  `components/wealth/spending/spending-section.tsx` (the lazy part in the fold; a new entry never takes an archived
  category; the kind switch starts on the first category offered; an archived category is never suggested).
- Tests: `lib/money-log/av2-archive-starter.test.ts`, `lib/ai/local-answers/av2-r4-money.test.ts`; existing
  `lib/money-log`, `lib/recent-categories` tests green unchanged.
- Spec: `tests/av2-money-categories.spec.ts`.
- Stored: `zigoals:money-log:v1` `archived` (commit `0c11c3aa`); a starter set writes the existing `own` and `subs`.
- Help (EN): **Q: Can I hide a category I no longer use?** A: Yes. In Wealth → Spending → Log spending → Your own
  categories, choose it under "Archive a category". It is no longer offered when you log, in budgets or in To review; your
  entries keep it, and reports and search still show it. "Bring back" offers it again. **Q: Is there a ready list of
  categories to start from?** A: Under Your own categories → "Start from a set" there are four: a student, a household, a
  freelancer and a traveller, in English or Dutch. See what each adds, then add it in one tap; nothing you already have is
  changed, and Undo takes it out again.
- What's new: "Categories: archive one you no longer use, and start from one of four written sets."
- Answers: `archivedCategories`, `starterSets` (corpus `av2r4-money-archived`, `av2r4-money-starter-sets`).
- Showcase hook: none (the Showcase money log is pinned by the NOVA corpus; an archive or a set added in the Showcase
  stays in its tab). Empty states teach ("An archived category is no longer offered…", "Four written starter sets…").
- Registries: none. CSS touched: `components/wealth/spending/money-r4.css` (new, theme variables only).
- Today: nothing added.

### R4-F3 (group U4). Group entries into one

- LEDGER row: #341 Lunch Money group entries — **built** (Wealth → Spending → Search all your entries → Select → "Group
  them as one, named …" → Group: two to twenty entries — a weekend away, a purchase and its refund — under a name (an
  entry of another group moves to this one; fewer than two, more than twenty or no name is said in words, and the button
  stays focusable); This week and the search results then show the group as one line where its newest entry is: its
  name, "a group", its days, how many entries and what they add up to per currency ("3 entries · spent €162.40, received
  €20.00", entries left out said apart); opened, each entry as the list shows it (with Edit and Remove), "N of its M
  entries are in this list" when the list shows only some, and "Ungroup" with Undo; Select mode lists every entry flat;
  Hide amounts blurs the line). Every total, budget, report, insight and answer still counts each entry on its own, as
  it is — grouping changes only how a list shows them.
- Spending function used: the group line is `totals` (lib/money-log/engine.ts) over the group's entries (`groupsOf` in
  lib/money-log/groups.ts).
- Files: `lib/money-log/groups.ts` (new: `groupEntries`, `ungroup`, `renameGroup`, `groupsOf`, `groupRows`, `groupLine`),
  `components/wealth/spending/group-row.tsx` (new, `GroupItem`; small, in Spending's chunk with its CSS),
  `components/wealth/spending/money-search.tsx` (the Group action in Select mode, group rows in the results, `onUngroup`;
  `BulkAction` gains `group`, and `onBulk` may return a refusal in words), `components/wealth/spending/spending-section.tsx`
  (This week's rows, the group action, Ungroup with Undo), `components/wealth/spending/money-r4.css`.
- Tests: `lib/money-log/av2-groups.test.ts` (figures unchanged by grouping, the group's total, folding, limits, the row),
  `lib/ai/local-answers/av2-r4-money.test.ts`.
- Spec: `tests/av2-money-groups.spec.ts`.
- Stored: `zigoals:money-log:v1` entry `group` (commit `0c11c3aa`).
- Help (EN): **Q: Can I put a weekend's spending together as one line?** A: Yes. In Wealth → Spending → Search all your
  entries, find them, tap Select, pick two to twenty entries, give the group a name and tap Group. Your lists then show
  them as one line with their total; open it to see each entry. Your totals and budgets still count each entry on its
  own. "Ungroup" puts them back on their own lines.
- What's new: "Spending: group entries into one line, such as a weekend away, with their total."
- Answers: `entryGroups` (corpus `av2r4-money-groups`).
- Showcase hook: none (a group made in the Showcase stays in its tab; the pinned money log has none). Empty answer
  teaches ("You have no groups yet. … Select two or more entries and Group them under a name").
- Registries: none. CSS touched: `components/wealth/spending/money-r4.css` (`.money-group*`).
- Today: nothing added.

### R4-F4 (group U4). Payee places (typed names only) and sums in every money-log amount

- LEDGER rows: #346 Actual payee places — **built, by the owner's note: typed place names only** (Wealth → Spending → Log
  spending → "Where are you? — optional": the person's own places as chips ("Work", "The market"), added and removed
  under "Your places"; choosing one lists the payees logged there, most logged first, each with the category it had
  before, one tap into the note (and its category offered when it is still offered); saving an entry while a place is
  chosen keeps the note's payee (before " · ") with that place; "Forget" on one payee, "Forget places" for all, with
  Undo; focus moves to the New place field when a list empties). **No location data**: the browser is never asked where
  the person is, nothing holds coordinates, no map and no outside service is used (a unit test reads both files for
  geolocation, coordinates and fetch); places live on the money extras record, never on an entry. The part of the
  ledger's row that asked the browser for the place and offered payees within about 200 m is not built — the owner's note
  for this round ruled it out (against a named rule: no location data). #339 Actual sums in an amount — **already
  built** in the money form, the budgets and the other money amounts by Session AK (BUILD list 2 #19:
  `lib/money-calc/expression.ts`, exact fractions of BigInts, + − × ÷, the result shown under the field by `CalcHint` and
  the only thing saved; the ledger's evidence missed it). Round 4 adds the one money-log amount field still without it, a
  split's parts (Money tools → Split an entry), with the same hint.
- Spending function used: none (no figure). Payees are ranked by how many entries carry them (`noteKey`), not by money.
- Files: `lib/money-log/places.ts` (new), `components/wealth/spending/places.tsx` (new; in the form extras' lazy chunk),
  `components/wealth/spending/quick-log.tsx` (`FormExtras` shows it for a new entry), `components/wealth/spending/spending-section.tsx`
  (`keepPlace` called on Save; a payee fills the note), `components/wealth/money-tools/split-panel.tsx` (`readPartAmount`
  resolves a sum; `CalcHint` under each part), `components/wealth/spending/money-r4.css`.
- Tests: `lib/money-log/av2-places.test.ts` (jsdom: the picker, a tap fills the note, Save keeps the payee; no
  geolocation in the source), `lib/money-log/av2-amount-sum.test.ts`, `lib/ai/local-answers/av2-r4-money.test.ts`.
- Spec: `tests/av2-money-places.spec.ts`.
- Stored: `zigoals:money-more:v1` `places` (commit `0c11c3aa`); nothing on the entry.
- Help (EN): **Q: Can ZIGoals suggest the shops I use at a place?** A: Name your places — Work, The market — under
  Wealth → Spending → Log spending → "Where are you?". Choose one when you log, and the payees you logged there come
  first; an entry saved with a place chosen keeps its payee there. ZIGoals never reads where you are: a place is just the
  name you typed, kept on this device. "Forget places" clears them. **Q: Can I type a sum as the amount?** A: Yes: type
  12,50+3 or 3×4,99 in an amount and the result shows under it; only the result is saved. It works in the money form,
  budgets, a split's parts and the other money amounts.
- What's new: "Spending: your own named places offer the payees you use there first (no location is read); sums work in
  a split's parts too."
- Answers: `payeePlaces` (corpus `av2r4-money-places`). Sums: no data of their own, so no answer.
- Showcase hook: none (places are the person's own; in the Showcase they stay in its tab).
- Registries: none (the field is on a record already in every registry). CSS touched: `components/wealth/spending/money-r4.css`.
- Today: nothing added.

### R4-F5 (group U8). Check an account against the bank

- LEDGER row: #340 Actual reconcile — **built** (Wealth → Accounts → a cash, savings or credit-card account → "Check
  against my bank": the statement's first and last day (from the day after the last check, else 30 days back), its
  opening balance — started from the account's own balance before the statement when one is kept, said so — and its
  closing balance (a decimal comma, a minus or a sum works); the money-log entries in the account's currency not yet
  checked in that time, oldest first, narrowed to one bank file's account name when the log has them; tick one by one
  or "Tick all"; the running line says what is ticked and the difference until "it matches your statement"; then "Mark N
  as checked" (with Undo) marks them with the statement's day; a difference left is said in words and the button stays
  focusable; Spending's This week and search show a quiet "checked" mark; the entry's edit form says "Checked against
  your bank for <day>" with "Not checked"; an entry whose amount is edited loses its mark). For a credit card the
  balance is what is owed, so spending raises it.
- Spending function used: none, on purpose. A bank statement lists what the bank moved, so reconciling counts every
  entry whole and as it is (the full amount paid, transfers and left-out entries included; `movement` in
  lib/money-log/reconcile.ts). No spending figure changes; the unit test shows Spending's `totals` stays the person's
  share without the transfer.
- Files: `lib/money-log/reconcile.ts` (new), `components/wealth/reconcile.tsx` (new, lazy), `components/wealth/accounts-section.tsx`
  (the toggle on the row and the lazy panel), `components/wealth/spending/spending-section.tsx` (the mark, "Not checked",
  the mark dropped when the amount changes), `components/wealth/spending/money-search.tsx` (the mark).
- Tests: `lib/money-log/av2-reconcile.test.ts` (pure, and the panel in jsdom: ticks, difference, mark),
  `lib/ai/local-answers/av2-r4-money.test.ts`.
- Spec: `tests/av2-money-reconcile.spec.ts`.
- Stored: `zigoals:money-log:v1` entry `checked` (commit `0c11c3aa`).
- Help (EN): **Q: Can I check my entries against my bank statement?** A: Yes. In Wealth → Accounts, open "Check
  against my bank" on the account. Type the statement's days and its opening and closing balance, then tick the entries
  the statement shows until the difference is zero, and tap "Mark as checked". Those entries then carry a quiet "checked"
  mark in Spending, and the next check starts after that day.
- What's new: "Accounts: check your entries against your bank statement until the difference is zero."
- Answers: `checkedWithBank` (corpus `av2r4-money-reconcile`).
- Showcase hook: none (the Showcase's accounts and money log are pinned; a check made in the Showcase stays in its tab).
  Empty states teach ("No entry in EUR waits to be checked…", "No balance of yours from before this statement: type the
  opening one.").
- Registries: none. CSS touched: `components/wealth/spending/money-r4.css` (shared with the other round 4 parts).
- Today: nothing added. Wealth's account rows gain one button for cash, savings and credit-card accounts (a Tab stop
  each; the lead checks any Wealth Tab-stop ceiling that pins the account rows).

### R4-F6 (group U8). Saved searches with a chart

- LEDGER row: #344 Lunch Money saved questions with a chart — **built** (Wealth → Spending → Search all your entries:
  "Save this search as …" keeps the search's filters with a name — words, words to leave out, kind, category,
  subcategory, payee, tag, paid with, dates, the amount range, counted or left out, tax-deductible — up to ten, the same
  name replacing the old one; "Open a saved search" sets its filters again. Your money over time → "Saved searches"
  (a new view): one search at a time (buttons when there are more), drawn "By month" (with a dashed monthly-average line
  and a key), "By week" (the last 26) or "By category" (the choice kept with the search), per currency, never converted;
  its total, its days, the entries counted and its monthly average over the calendar months of its range in one line; a
  table of every bar; Remove with Undo (focus kept). Only the filters are kept, so the chart reads the log as it is now).
- Spending function used: `totals` (lib/money-log/engine.ts) for the total, each month and each week, and `byCategory`
  for "By category", over what the search finds (`questionChart` in lib/money-log/saved-searches.ts) — so left-out
  entries, transfers and refunds are not added in and a shared cost counts the person's share, as in Spending. (The
  search's own result line keeps Session AV's selection total of what was found, as before.)
- Files: `lib/money-log/saved-searches.ts` (new), `components/wealth/spending/insights/saved-view.tsx` (new, lazy),
  `components/wealth/spending/insights/spending-insights.tsx` (the view), `components/wealth/spending/money-search.tsx`
  (save and open), `components/wealth/spending/insights/insights.css`, `tests/ap/ap-money-fixtures.ts` (the view's name).
- Tests: `lib/money-log/av2-saved-searches.test.ts` (pure and the view in jsdom), `lib/ai/local-answers/av2-r4-money.test.ts`.
  **Deliberate test change**: `lib/money-insights/views.test.ts` "twelve views" → "thirteen views": every label named and
  the count exact (13), labelled.
- Spec: `tests/av2-money-saved-searches.spec.ts`.
- Stored: `zigoals:money-more:v1` `questions` (commit `0c11c3aa`).
- Help (EN): **Q: Can I keep a search and see it as a chart?** A: Yes. In Wealth → Spending → Search all your entries,
  set your filters, type a name under "Save this search as" and tap Save this search. Your money over time → "Saved
  searches" then draws it by month, by week or by category, with its total and its monthly average. Up to ten; only the
  filters are kept, so the chart always shows your log as it is now.
- What's new: "Spending: save a search with a name and see it as a chart by month, week or category."
- Answers: `savedSearches` (corpus `av2r4-money-saved-searches`; reads `env.moneyMore`, and `env.moneyTags` for a
  search with a tag, as round 3's answers already do).
- Showcase hook: none (the Showcase's money extras hold no saved search; one saved there stays in its tab). The empty
  state teaches ("No saved searches yet. Under “Search all your entries”, choose your filters and tap “Save this search”…").
- Registries: none. CSS touched: `components/wealth/spending/insights/insights.css` (`.money-saved-*`).
- Today: nothing added. "Your money over time" now has 13 view buttons.

### R4-F7 (group U8). The monthly average; investment income beside spending

- LEDGER rows: #343 Actual monthly spending with an average and a trend — **built** (Your money over time →
  "Categories over a year": "3-month / 6-month / 12-month average" buttons (6 at first); a dashed average line on each
  category's small line and on a new first row, "All spending", with a key; the words beside this month so far as a fact
  ("Nov 2026 so far €120.00, €30.00 below your 6-month average of €150.00 (over the 4 months with records)"); each
  category's average a month; the chosen category's table ends with its average; a month without records is unknown, so
  the average is over the months with records and says how many; "Figures, not a target"). #345 Actual investment income
  against spending — **built** ("Month by month" → "Investment income beside spending": the person marks which income
  categories are investment income (interest, dividends, staking rewards; their own choice, kept on the space's own money
  log); the last 24 months per currency: that income beside the month's spending, the share it covers in words ("covers
  2.1% of spending"; the last whole month apart) and a table with a gap row for a month without records; no projection,
  no "years to freedom" — the FI model in Money tools stays the place for a model, and the view says so).
- Spending function used: #343 — `byCategory` per month for each category and `totals` per month for all spending
  (`monthlyAverage`, `totalTrend` in lib/money-insights/cash-flow.ts). The category lines themselves (`categoryTrend`)
  now sum each month through `byCategory` too (they summed every entry whole before), so a shared cost counts the
  person's share in the line, its average and This month by category alike; no existing test changed. #345 — the marked
  income through `byCategory(…, 'income')` and spending through `totals` (`crossover` in lib/money-insights/crossover.ts).
- Files: `lib/money-insights/cash-flow.ts` (`categoryTrend` by `byCategory`; `monthlyAverage`, `totalTrend`,
  `AVERAGE_SPANS`), `components/wealth/spending/insights/category-trend-view.tsx`, `lib/money-insights/crossover.ts` (new),
  `components/wealth/spending/insights/crossover-view.tsx` (new, its own lazy chunk under Month by month),
  `components/wealth/spending/insights/cash-flow-view.tsx` (the lazy part; `space`), `components/wealth/spending/insights/insights.css`.
- Tests: `lib/money-insights/av2-average-crossover.test.ts` (pure, the trend view's words and dashed line, the crossover
  view in jsdom); `lib/money-insights/views.test.ts` and `insights.test.ts` green unchanged; `lib/ai/local-answers/av2-r4-money.test.ts`.
- Spec: `tests/av2-money-average-crossover.spec.ts`.
- Stored: `zigoals:money-log:v1` `investIncome` (commit `0c11c3aa`); the average span is not stored.
- Help (EN): **Q: How does this month compare with my usual spending?** A: Wealth → Spending → Your money over time →
  "Categories over a year" shows your 3-, 6- or 12-month average as a dashed line on each category and on all spending,
  and says how this month so far compares, in euros. It is a figure from your own entries, not a target. **Q: How much of
  my spending does my investment income cover?** A: Under Month by month → "Investment income beside spending", mark the
  income categories that are investment income, such as interest, dividends or staking rewards. Each of the last 24
  months then sets that income beside your spending, with the share it covers. It is your own record, not a forecast.
- What's new: "Spending: your 3-, 6- or 12-month average beside this month, and investment income beside spending."
- Answers: `monthAverage`, `investCover` (corpus `av2r4-money-average`, `av2r4-money-invest-cover`).
- Showcase hook: none written. The average reads the Showcase's own money log by itself; the crossover shows nothing
  until the person marks a category (kept in the Showcase tab only). Empty states teach ("Log interest, dividends or
  staking rewards as money received…", "Mark the categories that are investment income…").
- Registries: none. CSS touched: `components/wealth/spending/insights/insights.css` (`.money-avg-*`, `.money-cross-*`, `.avg`).
- Today: nothing added.

## For the lead (everything in one list)

1. **engine.ts**: `av2R4MoneyAnswer(question, env) ?? av2R3MoneyAnswer(question, env) ?? av2MoneyR2Answer(question, env) ?? …`
   (import from `./av2-r4-money`). Corpus: `AV2_R4_MONEY` (`lib/ai/evals/as/cases-av2-r4-money.ts`, 9 intents, 36
   questions) into `cases.ts`; record expected.json. The test proves no earlier corpus question is claimed and that
   `rehearsalAnswer`, `av2RestAnswer`, `av2SyncAnswer` and the earlier money answers claim none of round 4's.
2. **Tool sources**: none new. The answers read `env.moneyLog` (its new `archived`, `investIncome` and the entries'
   `checked` / `group`), `env.moneyMore` (`questions`, `places`) and `env.moneyTags`, which rounds 2 and 3 already asked for.
3. **Help + What's new** (`help-page.tsx`): the Q+A and labels under R4-F1 … R4-F7 above (10 answers, 7 labels).
4. **Registries**: no new key, no new record (see Stored changes; #344 and #346 use the money extras record instead of a
   new one). Optionally, the `moneyMore` catalogue label: add "saved searches, your places".
5. **Stored-format commit** to label TIER 3 (stored formats): `0c11c3aa`.
6. **Specs to run** (shard lists): `tests/av2-money-calendar.spec.ts`, `tests/av2-money-categories.spec.ts`,
   `tests/av2-money-groups.spec.ts`, `tests/av2-money-places.spec.ts`, `tests/av2-money-reconcile.spec.ts`,
   `tests/av2-money-saved-searches.spec.ts`, `tests/av2-money-average-crossover.spec.ts`.
7. **Theme sheets**: CSS touched — `components/wealth/spending/insights/insights.css`,
   `components/wealth/spending/money-r4.css` (new).
8. **Screens and counts to check**: Wealth → Spending → "Your money over time" has 13 view buttons (was 11;
   `lib/money-insights/views.test.ts` changed deliberately, labelled); Categories over a year gains three span buttons
   and an "All spending" row; Month by month gains the investment-income part; Search all your entries gains "Save this
   search as" (and "Open a saved search" once one is kept) and, in Select mode, "Group them as one"; the money form gains
   "Where are you? — optional" (a fold until a place exists) and, in Your own categories, Archive and Start from a set;
   each cash, savings and credit-card account row gains "Check against my bank" (one Tab stop each). Today: nothing.
9. **Weights**: every new view and panel is its own lazy chunk (calendar, saved searches, crossover, reconcile, category
   settings; places in the form extras' chunk). Spending's own chunk gains `GroupItem` (a small row component with
   `money-r4.css`), `lib/money-log/groups.ts` and `uncheck` from `lib/money-log/reconcile.ts` (pure, small), plus the
   lazy lines; the lead checks Wealth's budget in the build.
10. **One behaviour aligned** (noted): "Categories over a year" now sums each month through `byCategory`, so a shared
    cost counts the person's share in its lines (it counted the whole amount before), as This month by category does.
    `cashFlow` ("Month by month") still sums every counted entry whole (not the share) — outside these rows, left as it
    was; it is the same note as round 3's for Compare's spending factor.
11. **#346, by the owner's note**: typed place names only — no location is read, no coordinates are kept, no map or
    outside service; the ledger's "within about 200 m" part is not built (against a named rule: no location data).
12. **#339**: already built by Session AK (lib/money-calc/expression.ts, `CalcHint`) in the money form, budgets and the
    other money amounts; LEDGER's evidence missed it. Round 4 added the split parts. The lead may mark the row "already
    have" with the extension.
13. **QUALITY Minors**: not taken in this branch (the task named rows #338–#347 only).
