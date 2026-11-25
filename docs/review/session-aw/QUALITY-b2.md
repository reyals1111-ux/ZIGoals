# Session AW batch 2: fresh review (`680385b0..HEAD`, feature/session-aw-finish-line)

Reviewer: a fresh agent that did not write this code. I read the code and ran `vitest` only. I ran no build and no Playwright, and I edited nothing in the repo.

## Summary

| Class | Count |
|---|---|
| Blocker | 0 |
| Major | 3 |
| Minor | 11 |
| Help "Where" spot-check | 35 checked; 5 answers (6 sentences) wrong, 7 imprecise, 1 unverified |

What is in scope: X5 (Paprika), X6 (Happy Scale / Sleep as Android), X7 (Cashew / Money Manager), Part 3 simplicity a/b/c, keep-jump, onboarding focuses and the Help additions. X4 (Strides) has no files in this diff; it was merged before `680385b0`.

Rules that hold:
- **Stored data is additive.** `ends`, `namedDays`, `weighNotes`, `made`, `stars`, `menus` and `useBy` are optional fields inside loose records. The only new keys are `zigoals:money-removed:v1` and `zigoals:sleep-goal-period:v1`.
- **No new dependencies and no new network calls.** No `fetch` or `https://` was added outside tests.
- **No calorie burn.** None is estimated anywhere new.
- **Erase coverage is complete.** money-removed is covered by Erase everything (prefix), the account erase (`AW_X7_ERASE_KEYS` in `lib/aa-device-forget.ts`), `NOT_RECORDS`, the catalogue and `NEVER_RESTORED`. sleep-goal-period is covered through `AV2_DISPLAY_KEYS` → `AV2_ERASE_KEYS`.
- **ZIGi/NOVA answers follow the rules.** The X6 and X7 answers are gated (`closed(env,'health'|'wealth')`) and bilingual, and the X6 ones respect hidden body figures.
- **Changed specs and tests are still strict.** The changes I read are deliberate re-pointings at least as strict as before: help-page split into quarters with a count ≥ 709, page-order-aa, dashboard-visual, av-good-things, static.test.ts (its check now sits in `lib/settings-search/index.test.ts`, which tests both directions) and catalog.test.ts.

Tests run: the following 28 files pass, 161 tests:

```
pnpm --filter @zigoals/web exec vitest run lib/settings-search lib/search/help-aliases.test.ts lib/money-log/aw-x7-*.test.ts lib/bills/aw-x7-ends.test.ts lib/food-plus lib/body-extras/aw-x6-body.test.ts lib/sleep/aw-x6-sleep.test.ts lib/accounts/aw-x7-card-statement.test.ts lib/grocery/aw-x5-use-by.test.ts lib/erase-coverage.test.ts lib/keep-jump.client.test.ts
```

`lib/food-plus/av2-meal-mic.test.ts` fails to transform (it is a JSX parse error) when run this way. That file is not in this diff, so it is probably the runner config and not this batch.

## Blockers

None.

## Majors

### M1. Recipe file import: no overall unpacking limit, and failed entries are free (untrusted input)

Files: `apps/web/lib/food-plus/recipe-files.ts:33-48` (`gunzip`) and `:96-111` (the per-entry loop).

**How the caps are layered:**
- **The ZIP layer is capped.** `readZip` enforces `RECIPE_ZIP_CAPS` (60 MB total, ratio 100, CRC).
- **The gzip layer inside each `.paprikarecipe` is capped per entry only.** Each entry is unpacked separately with `MAX_RECIPE_JSON` = 12 MB as its ceiling.
- **There is no shared budget.** The note importer keeps a rule (Z1B-5, `lib/notes/zip-read.ts`): every unpacked byte counts against one budget. This layer does not.
- **There is no ratio cap and no stop signal.**
- **Failures do not count.** `MAX_FILE_RECIPES` (200) counts only recipes that parsed. Entries that fail (not JSON, or too large) are added to `skipped` and the loop keeps going, up to the 2000 entries the ZIP allows.

**Failure scenario:**
1. Someone builds a ~24 MB `.paprikarecipes` file holding 2000 stored entries.
2. Each entry is a ~12 KB gzip "bomb" that unpacks past 12 MB.
3. ZIGoals unpacks about 12 MB for each one before stopping: ~24 GB of decompression and ~24 GB of buffers thrown away.
4. The tab is busy for minutes. There is no Stop button (`busy` only disables the input).

A 40 MB `.paprikarecipe` file chosen on its own is likewise unpacked without any ratio check.

Nothing is lost and nothing is sent, but the "under caps" claim in the doc comment and commit `ae0dfe80` holds only per entry.

**Fix:**
- Share one unpacking budget across all entries, e.g. `maxTotal`, or 60 MB of JSON in all.
- Stop after `MAX_DAMAGED` failed entries.
- Optionally apply a ratio cap to the gzip layer.

### M2. Credit card "Next payment": payment credits on the card are subtracted from the purchases, so the amount is understated

File: `apps/web/lib/accounts/card-statement.ts:62-74` (`signed`, `sum`, `between`). The bank-file import (`lib/bankfiles/*`) keeps a card file's "PAYMENT – THANK YOU" line as an ordinary income entry with `account` set to the card's name. It is marked `transfer` only when the person pairs both files (`lib/bankfiles/reimport.ts` `transferPairs`).

`cardStatement` deliberately subtracts every income entry on the card ("refunds and other credits"). That includes the payment of the *previous* statement.

**Failure scenario:**
- The statement of 5 Nov covers 6 Oct to 5 Nov: €400 of purchases, plus the €300 payment of the October statement on 25 Oct (an income line in the card's file).
- `charged` comes out as €100, and the line reads "Next payment on 25 Nov: €100.00". The real figure is €400.
- If the person also records that payment under the card's `payments`, a payment dated after the statement is subtracted a second time (`p.date > statement`).
- A late payment of the previous statement made after this statement closed is subtracted from the wrong statement too.

This is a wrong money figure on the person's own card, shown on the Wealth row and said by ZIGi/NOVA (`lib/ai/local-answers/aw-x7-money.ts` `cardPayment`). "A fact, not advice" does not fix that.

**Fix:**
- Leave out income entries whose amount matches a recorded card payment, or that look like card payments (payee words, or the size of the previous statement).
- Or only subtract income entries marked `refund`.
- Say in the line which credits were taken off.

### M3. Help "Where" sentences send people to places that do not exist (commit 14f0da35)

Five answers (six sentences) name a menu or section that is not in the UI, or sits in another pillar. Details and the correct paths are in the spot-check section below:

| Help answer | Wrong path given |
|---|---|
| `av2-own-feelings` | Journal → "How are you feeling?" |
| `av2-experiment-outcomes` | Journal → Experiments (it is under Health) |
| `av2-food-can-the-visit-report-include-what-i-ate` | Journal → Make a report (it is under Settings) |
| `av2-countdown-since` | Tasks → Countdowns (it is a Today card) |
| `av2-money-can-financial-freedom-show-money-of-late` | Wealth → Calculators (no such section) |

These are exactly the "broken Help paths" the owner asked about. A person who follows them lands on the wrong page.

## Minors

1. **Recipe import Undo deletes foods that other records still use.** `apps/web/components/health/recipe-import.tsx:59-62` (`undoLast`):
   - It removes each food the import created when no recipe or diary entry uses it. It does not check saved meals (`daily.savedMeals` items), meal plans or favourites (`favorites` with `sourceKind:'food'`). A food made by the import and starred, or added to a saved meal before Undo, is deleted and leaves dangling references.
   - The vitamins and nutrient-extras rows written for library foods (`keepLibraryExtras`) are left behind under the removed food ids.
2. **Removed recently shows UTC days.**
   - `apps/web/components/wealth/spending/removed-recently.tsx` (the "Removed {formatDate(i.removedAt.slice(0, 10))}" line) takes the UTC day of the removal.
   - `apps/web/lib/money-log/removed.ts:46` `goneOn` gives the UTC day as well.
   - An entry removed at 00:30 in Amsterdam (UTC+1) reads "Removed" yesterday, and "until" can be off by one. Use the local day (`localDate`).
3. **"Erase one area" leaves removed money entries behind.**
   - Choosing "Goals and Wealth" leaves Removed recently in place. That can be up to 500 removed money entries with amounts and payees, and they can be Put back into the erased log.
   - The keys module documents this (`lib/aw-x7-money-keys.ts`). The erase screen only says "anything a restore never writes is not touched", which a person will not read as "your removed expenses stay".
   - Consider emptying Removed recently with the money area, or naming it in the erase preview.
4. **Removed recently only catches the row's Remove button.** `spending-section.tsx:168` captures removals made with the row's Remove button, and nothing else. Other paths are not captured: ZIGi/NOVA tools, or later delete paths. That is fine today, but nothing enforces it.
5. **Copy an entry: Undo leaves the copied tags behind.** `apps/web/components/wealth/spending/copy-entry.tsx:31-35` writes the copy's tags (`copyTags`) after the copy is made. The toast's Undo removes the copy but not its tags, so the tags record keeps rows for ids that no longer exist.
6. **Copy this entry drops unsaved edits.** Edit → "Copy this entry" (`spending-section.tsx`, the form actions) ends the edit with `endEdit()` and copies the *stored* entry. Changes typed but not saved are discarded without a word.
7. **A newer build's data can be erased by this build.**
   - **Whole field dropped on read.** These schemas are `optional().catch(undefined)` on a whole array or map: `namedDays` and `weighNotes` (`lib/body-extras/schema.ts`), `made` and `stars` (`lib/food-plus/schema.ts`), `useBy` (`lib/grocery/schema.ts`) and `ends` (`lib/bills/schema.ts`). One item a newer build writes in a shape this build rejects (a longer name, a third `ends` form) drops the whole field on read.
   - **Next write erases it.** The next write by this build then removes it from storage.
   - **Menus have the same problem, in writes.** `menusOf`, `keepWeekAsMenu` and `removeMenu` (`lib/food-plus/menus.ts:50, 62-75`) write back only the menus they could read. That erases unreadable ones, which contradicts the "left out on its own" comment.
   - This is the project's accepted pattern, so it is no break with older releases #37–#59: they do not know these fields at all. It is a forward-compatibility gap.
8. **A bill that ends "after N payments from a day" still shows dates before that day.** `lib/bills/ends.ts` `paymentsLeft` counts "N of M left" from `from`. Meanwhile Upcoming, the calendar and the month's bills still list the due dates before `from`, because the bill is not treated as starting then. A contract whose "First payment on" is in the future shows earlier payments that the count does not include.
9. **Pressing a key cancels a late Settings jump.** `apps/web/components/settings/keep-jump.tsx:44` `SCROLLS` includes `keydown`. A keyboard user who arrives on `/app/settings#notifications` and presses Tab (or any key) before the lower groups' chunk arrives cancels the wait, and the page stays at the top. Ignore Tab/Shift and other non-scrolling keys, or only stop on keys that scroll (arrows, PageUp/PageDown, Space, Home/End).
10. **Recipe files with photos.** `RECIPE_FILE_ACCEPT` and the component's `accept` both allow `.paprikarecipe` up to 40 MB, and `MAX_RECIPE_JSON` is 12 MB. A Paprika recipe with a large photo (`photo_data` in base64) can pass 12 MB and is then refused as "larger than ZIGoals reads", even though photos are thrown away anyway. Consider stream-parsing, or a higher JSON cap together with M1's shared budget.
11. **Colour fallbacks in new CSS** (an observation more than a finding).
    - New CSS uses `var(--x, #hex)` fallbacks, for example `food-plus.css` `var(--pillar-health, #ff74be)`, `body-x6.css` and `settings-search.css`.
    - Every variable is defined in the theme sheets, and the pattern is already used 89 times, so contrast still comes from the theme variables.
    - Only list this if the owner means "no hex anywhere, even as a fallback".

## Help "Where" spot-check (commit 14f0da35, `apps/web/components/help/help-page.tsx`)

I extracted 151 "Where:" sentences and checked 35 against the components (visible labels, summaries, headings and which page mounts what).

### Wrong: the named path does not exist

| Line / Help id | Help says | Correct path (from the code) |
|---|---|---|
| 259 `av2-own-feelings` | Journal → How are you feeling? → the feeling-word grid → Your own word | There is no "How are you feeling?" anywhere. The path is **Journal → Write → (after Energy today) Add a feeling word (optional) → "A word for how it feels" → Your own word**. The same grid is also in ZIGi's check-in and Health's evening check-in (`components/mood-words/mood-words-fold.tsx`, `mood-words-grid.tsx`). |
| 262 `av2-experiment-outcomes` | Journal → Experiments → an experiment → Follow more outcomes | Experiments are mounted only in Health's Insights view (`components/health/insights-view.tsx:28`). The path is **Health → Insights → Experiments: try one change for 14 days → an experiment → Follow more outcomes (up to 8)**. |
| 339 `av2-food-can-the-visit-report-include-what-i-ate` | Journal → Make a report → Nutrition (from the food diary) | `ReportLauncher` is mounted only on `/app/settings/data`. The path is **Settings → Data & privacy → Your data (its own page) → To bring up at your next visit → Make a report → Nutrition (from the food diary)**. |
| 251 `av2-countdown-since` | Tasks → Countdowns → add one, or Days since on its row | Countdowns are a Today device card (`components/dashboard/today-device-cards.tsx:53`, heading "Days until"). The path is **Today → the Days until card (from Today's cards) → Add a countdown, or Days since on its row**. |
| 319 `av2-money-can-financial-freedom-show-money-of-late` | Wealth → Calculators → Financial freedom → under its table | There is no "Calculators" section. The path is **Wealth → Compound interest calculator → Open the calculator (`/app/wealth/calculator`) → More planning tools → Financial freedom**. |
| 955 `ak-plan` | Wealth → Calculators (beside the compound interest calculator) | The same fix: **the calculator page (`/app/wealth/calculator`) → More planning tools** (What a yearly fee costs, Financial freedom, Paying off debts). |

### Imprecise: the place exists, but the words differ

| Line / Help id | Help says | Better |
|---|---|---|
| 207 `av-two-day` and 373 (longer history) | Habits → a habit's Details → Consistency trends (→ More history) | "Consistency **&** trends" (`habit-card-full.tsx:200`). The extraction shows that `&amp;` was dropped. |
| 756 `ap-bill-price-change` | Wealth → Upcoming bills → Price | → **Price changes** (`bills/price-changes.tsx:24`) |
| 783 `quick-add` | Today → Quick add (the + button; ⌘/Ctrl+K on a computer) | ⌘/Ctrl+K opens the **command menu**, which lists Quick add (`command-palette-host.tsx`). The + button is on every page, not only Today. |
| 303 `av2-money-what-are-flexible-and-non-monthly-budget` | Wealth → Budgets → a budget → Flexible or non-monthly | → **a budget's target and options → Bucket: Flexible / Non-monthly (or Due every 3/6/12 months)** (`budgets/assign-panel.tsx:97-99`) |
| 432 `av2-r3-money-can-i-plan-a-one-off-cost-like-a-birthda` | Wealth → Left this month → Planned one-off costs | → **Wealth → Budgets → Left this month → Planned one-off costs** |
| new X7 answer `aw-…next credit card payment` | Wealth → Accounts → What you owe | The section's name is "Accounts, debts & net worth" (`platform/wealth-view.tsx`). |
| `aw-x7-money.ts` PLACES (NL answers) | "Vermogen → Uitgaven → Removed recently" | It mixes a Dutch path with English UI names. That is acceptable only if the UI stays English; it is consistent with the other NL answers. |

### Unverified

- 445 `av2-r3-notes-can-i-write-an-entry-as-a-grid`: "the Mandala under Grids and look-backs". "Grids and look-backs" is not a literal in any component; it appears only in ZIGi's answer text. It may be a template group built from `lib/journal-prompts` data. It needs a check in the running page.

### Correct (checked)

- **Habits:**
  - a habit's ⋯ → Symbol and colour…
  - Details → Habit options
  - Who you are becoming
  - New habit → Challenge
  - Your stacks
- **Journal:**
  - Write → Link another day
  - Write → Photos and a voice note
  - Start from a prompt → Write as a grid
  - an entry → Who was there
  - the feeling words → Add another word / What the words mean / What lifts you
- **Notes** (a note's):
  - Earlier versions
  - Outline
  - Print this note
  - Look
  - Note info
  - Canvas
- **Health:**
  - Weight → Your coach
  - Weight → Your weight goal
  - Diary → This day is only partly logged
  - Diary → Micronutrients → Nutrient report
  - Workouts → Training load
  - Workouts → Your running bests
  - Workouts → Routines → Folder (optional) / Save routine file
  - Workouts → Exercises and how-tos
  - Workouts → Warm-up and plates
  - Workouts → Your bar and plates
  - Workouts → Planned workouts → I missed some
  - Workouts → Light week (not in my bests)
  - Fasting timer
  - Cycle log
  - Import
- **Wealth:**
  - beside your debts → Plan paying off your debts → Debt Blaster
  - Your money over time → What changed / Your usual pace
  - Budgets → Ready to assign
  - Upcoming bills → Record it
  - Upcoming bills → Bill tracker → Edit → Ends
  - Spending → This week → Copy
  - Spending → Removed recently
  - Import from your bank → To review
- **Settings:**
  - Your app → My day ends at
  - Your app → Your links
  - Account & devices → Account & sync
  - Help & diagnostics → How this browser keeps your records / Send feedback
  - Data & privacy → Backup & restore / Export everything
- **Tasks:**
  - Upcoming
  - Areas and templates
  - Days since
