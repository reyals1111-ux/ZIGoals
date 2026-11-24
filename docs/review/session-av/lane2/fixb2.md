# Lane 2 fixb2: batch 2's failing browser specs (42 tests)

Branch `lane2/fixb2` from `lane2/batch2` (675c4fe0, which has revb2a's money review fixes). The specs ran against the
production build of 6827a023 at :3101, through the shared browser lock. That build does not have revb2a, so a spec that
depends on revb2a, or on an app fix made here, can only pass after the lead rebuilds.

**Counts:** 42 failing tests in 40 specs (spec:line).
- **29 fixed in the spec and verified** against :3101, each on every project and theme where it had failed.
- **12 need the lead's rebuild.** 11 of them have app fixes made here, and 1 (av2-repeat-projects) depends on revb2a.
- **1 left with its cause** (the sandbox browser).

**App bugs found and fixed: 11.** Each has a unit or guard test.

Unless the table says otherwise, "verified" means desktop and mobile in Nebula, Light and Dark. Every spec change is
labelled `// Session AV lane 2 (<why>, deliberate)` and has an equally strict replacement.

## Per spec

| Spec | Cause | Fix | Commit | Verified |
|---|---|---|---|---|
| av2-appearance:30 | **Spec.** Pure black and back swaps the dark-style sheet. The 3 px contrast ring lands only once that sheet has loaded again, but the spec read the ring once, before it had. | Checks the sheet's address, then polls until it reads the same 3 px solid ring. | c72ea7d9 | :3101 (desktop and mobile) |
| av2-backup-folder:21 | **Environment.** The page closes ("session closed") at "Make a copy now". A probe shows the sandbox's Chromium (Playwright's build behind `/opt/google/chrome/chrome`) shuts down when a FileSystemDirectoryHandle is read back from IndexedDB. Storing the handle works. Writing to the private file system without IndexedDB works. | None. Nothing in the spec or the app is shown to be wrong. | — | Left. **Check in CI's real Chrome.** |
| av2-bmi-milestones:17 | **Spec.** A mark that is not next keeps an empty `<small>`, so its text ends in a space. | `/^80 kg\s*$/` | f3b178d8 | :3101 |
| av2-calm-move:16 | **Spec.** The visual is saved after a lazy import, and only then does the controlled radio follow, so `check()` read it too early. | `click()`, then `toBeChecked()`. The stored pace is polled. | 03fbd495 | :3101 |
| av2-calm-sound:15 | **App.** The volume label also held an `<output>`, which is labelable, so the label named the output and the slider had no name. **Spec.** The same lazy save as calm-move. | The label names the slider by `htmlFor`. Unit test `lib/calm/calm-chooser.test.ts` fails without the fix. The spec uses click, then state. | 1bab024c | Needs rebuild. It passed up to the slider on :3101. |
| av2-calm-sound:56 | **Spec.** The same lazy save. | click, then `not.toBeChecked()` | 1bab024c | :3101 |
| av2-coach-checkin:12 | **Spec, missing setup.** The pace is chosen on the maintenance estimate, which needs 10 weigh-ins in its 28 days. The Showcase keeps 7 there (see "For the lead"). | Adds three fictional weigh-ins between the Showcase's own, then checks that the estimate is shown. | f3b178d8 | :3101 |
| av2-diary-times:11 | **Spec.** The table's name follows the nutrient shown ("Calories by part of the day, table"). | The calories table is used for the kcal row. | f3b178d8 | :3101 |
| av2-extra-meals:20 | **Spec.** "Fictional afternoon snack" has 25 characters and the limit is 24, so the app rightly refused it. | 23-character names: "Fictional teatime snack" and "Fictional 2nd breakfast". | 7b305c44 | :3101 |
| av2-extra-meals:92 | **Spec.** Its name had 26 characters. Once that was fixed, `allTextContents()` read the form before its chunk had loaded. | The same names. The options are checked with a waiting `toHaveText([...])` on the same list. | 7b305c44 | :3101 |
| av2-food-marks:12 | **Spec.** The fields are named "Protein (g, optional)" and "Fat (g, optional)". | Exact names. | f3b178d8 | :3101 |
| av2-food-minors:21 | **Spec.** The group writes its days with the year, as every plan row does. | "Nov 23, 2026 to Dec 3, 2026" | f3b178d8 | :3101 |
| av2-habit-imports:70 | **App.** The HabitBull steps quote its CSV header, which is one unbreakable word of about 300 px. The import panel's implicit grid column took that width, so the page was 25 px too wide at 320 px. | `.switch-import` is a `minmax(0, 1fr)` column. `.switch-more p` gets `overflow-wrap: anywhere`. File fields get `max-width: 100%`. Guard test `lib/layout-fixb2-narrow.test.ts`. | 2cbcfd8a | Needs rebuild. A probe with the rules injected into :3101 measured 320 of 320. |
| av2-logging-challenge:11 | **Spec, missing setup.** It ran on the real date, a Sunday, when the card rightly says the week can't reach 3 days. **App.** The Diary's "See the week" link (`?view=insights#health-challenge`) changed the address but stayed on the Diary: Health read `?view=` only when it opened. | The spec's clock is fixed to a Monday (Europe/Amsterdam). Health's view now follows the address's view when it changes, and shows the card the hash names (`components/health/follow-address-view.ts`). Unit test `lib/health-follow-view.test.ts`. | c35fe880, 5a0af0ee | Needs rebuild. It passed up to the link on :3101. |
| av2-money-alerts:17 (mobile) | **Spec.** On a phone, "Accounts, debts & net worth" starts folded. | `openDeskFold` on mobile, as g1b-networth-share does. | 750d68d2 | :3101 (mobile) |
| av2-money-budgets-plan:16 | **Spec.** The planner writes money with its cents, as the rest of Financial freedom does. **App.** The calculator's implicit grid column took the width of the scenario table, which does not wrap, so the page was 295 px too wide at 320 px. | "−€15,000.00". `.money-calc-tools` and `.fi-scenarios` are `minmax(0, 1fr)` columns. Guard test. | 3135b09c | Needs rebuild. A probe with the rule injected measured 320 of 320. |
| av2-money-crypto:30 | **Spec.** "Moves" also matched the radio "… moves a percent …". The third tab is named "Transactions". **App.** The value chart's range buttons kept their full width beside the title, so the page was 49 px too wide at 320 px. | The select by its role. The tab by its exact name. `.portfolio-section-head > .portfolio-ranges` may shrink and wrap. Guard test. | 750d68d2, 2cbcfd8a | Needs rebuild. It passes on :3101 up to its 320 px line. A probe with the rule injected measured 320 of 320. |
| av2-money-debts:20 (mobile) | **Spec.** The accounts section is folded on a phone. | `openDeskFold` on mobile. | 750d68d2 | :3101 (mobile) |
| av2-money-log-tools:14 | **Spec.** An exact `getByLabel` never matches a select inside its label. "Leave out … pet" also leaves out Market, which the step before moved into Pets, because the filter reads categories too. | The Category select by its role. Leaves out "shop" and expects exactly Market and the left-out Pets entry. | 7b305c44 | :3101 |
| av2-money-notices:18 (mobile) | **Spec.** The accounts section is folded on a phone. | `openDeskFold` on mobile. | 750d68d2 | :3101 (mobile) |
| av2-money-own-budgets:15 | **Spec.** "Tag" also matched "Entries with a tag". **App.** Removing the last of your own budgets showed no Undo: the record drops the empty `budgets` key, and `removedItems` took a dropped key for "nothing removed". | The select by its role and exact name. `removedItems` reads a dropped id-list key as `[]`, as `itemChanges` already did. Unit test `lib/undo-removal-last.test.ts`. The existing undo tests pass. | 6653b6a4 | Needs rebuild. It passed up to Undo on :3101. |
| av2-money-people:14 | **Spec.** "Person 1" also matched "Take person 1 off". | Role and exact name. | 750d68d2 | :3101 |
| av2-money-reimport:28 | **Spec.** A bank file's import has no "Done" button. | Checks the "N entries added" words, then uses the dialog's Close and checks the dialog is gone. | 750d68d2 | :3101 |
| av2-money-sheet:17 | **Spec.** "Keep" also matched "Keep the lines". "On" matched five fields. On a phone the accounts section is folded. | Exact names inside the money in or out form. `openDeskFold` on mobile. | 750d68d2 | :3101 |
| av2-money-space:15 | **Spec.** Budgets has four Category fields. | Scoped to the "Set a monthly budget" form. | 750d68d2 | :3101 |
| av2-money-store-cards:14 (Light) | **App.** Light's generated sheet mapped the card's white to near-black (#242424), so in Light the barcode's black bars stood on black. | Light-only rules in `store-cards.css` that the generator carries as written. Test `scripts/themes/store-cards-light.test.mjs`. | 00718c25 | Needs the theme sheets regenerated, then a rebuild. |
| av2-mood-look:14 | **Spec.** The symbol is hidden from screen readers, so the buttons are named by their word alone. The Group field is a combobox (it offers your groups). | Exact names, with the shown text checked with its symbol. The Group field by its combobox role. | 7b305c44 | :3101 |
| av2-naps-need:23 | **Spec.** The curve's note also says "your nap today". | The exact term. | f3b178d8 | :3101 |
| av2-pack-photos:12 | **Spec.** A select inside its label is never matched by an exact `getByLabel`. | Role and exact name. | f3b178d8 | :3101 |
| av2-places-suggest-replace:16 | **Spec.** The first suggestion, a Pull-up, has no other exercise Home can do (its one match, the chin-up, is already suggested), and the app says so. | Such an exercise is checked for that sentence and kept. The first exercise with alternatives is replaced. | 03fbd495 | :3101 |
| av2-project-rules:19 | **Spec.** The done row leaves the list and the rule's next one comes in under the same name, so `check()` kept clicking. | One `click()`, then the stored `doneAt` of the task that was ticked. | 03fbd495 | :3101 |
| av2-repeat-projects:20 | **Spec.** "Template" also matched "Save a project as a template". It also depends on revb2a: B2A-7 writes project names as "· Nov 23, 2026", and :3101 still writes ISO dates. | Exact name. | 03fbd495 | Needs rebuild (revb2a). |
| av2-report-symptoms:14 | **Spec.** The food lane's Nutrition section made 9 sections. Each symptom now also has its own small chart. | Expects 9 checkboxes, as av-report-more does. The report's chart by `svg.report-chart`. | 7b305c44 | :3101 |
| av2-rolling-habit:16 | **Spec.** An exact `getByLabel` missed the select, and `selectOption()` does not focus. | Role and exact name. The select is focused before the change, then checked to still have focus. | 7b305c44 | :3101 |
| av2-routine-card:32 | **Spec.** The box follows the saved journal, so `check()` read it too early. | click, then state. | 03fbd495 | :3101 |
| av2-routine-library:12 | **Spec.** Two "In het Nederlands" buttons (the exercise library has one too). | The ready-made routines' own button. | 03fbd495 | :3101 |
| av2-routine-share:14 | **Spec.** Two routine lists, one per folder. | The "Shared with me" folder's own list. | 03fbd495 | :3101 |
| av2-sync-choices:44 | **Spec.** The boxes are disabled while the sync that the unlock starts is running. **App.** A box ticked from the keyboard starts a sync, turns `disabled` under the keyboard, and the focus drops to the page. | While busy the boxes are `aria-disabled`, refuse changes and stay focusable. Unit test `lib/vault/extras-choice-focus.test.ts`. The spec waits until each box is enabled. | 49187ad1 (TIER 3 sync) | Needs rebuild. It passed up to the focus line on :3101. |
| av2-task-print:19 | **App.** The subtask count was a `<span aria-label>`, which axe refuses (aria-prohibited-attr, serious). | `role="img"`. Unit test `lib/tasks/task-progress-name.test.ts`. | 45a319c0 | Needs rebuild. |
| av2-timer-presets:35 | **Spec.** "End bell" also matched "Try the end bell". | Role and exact name. | 03fbd495 | :3101 |
| av2-workout-progress:16 | **App.** The report's implicit grid column took the weeks table's width: the page was 361 px too wide at 320 px, and at 390 px the month buttons were covered. | `.av2-progress` is a `minmax(0, 1fr)` column. Guard test. | 2cbcfd8a | Needs rebuild. A probe with the rule injected measured 320 of 320, desktop and mobile. |
| customize-aj:122 | **App.** "Your sheet" used `.wealth-sheet`, the class of Wealth's dialogs, and took their width (min(820px, 100vw − 32px)) and dark ground. | `.wealth-own-sheet`. Guard test `lib/wealth-sheet/class-name.test.ts`: only a `<dialog>` carries `.wealth-sheet`. | 4712c2b4 | Needs rebuild. A probe with the class swapped on :3101 measured 768 of 768. |

## For the lead

- **Theme sheets.** Regenerate them. The CSS touched: `components/wealth/store-cards/store-cards.css` (new Light-only
  rules), `components/wealth/accounts.css` (`.wealth-sheet` renamed to `.wealth-own-sheet`),
  `components/import/import.css`, `components/health/workouts/av2-body.css`, `components/portfolio/value-chart.css` and
  `components/wealth/money-tools/money-tools.css`. Until then `scripts/themes/build-themes.test.mjs` ("same as the
  generator builds") is red.
- **Rebuild, then run:** av2-calm-sound, av2-logging-challenge, av2-money-own-budgets, av2-money-store-cards,
  av2-sync-choices, av2-task-print, av2-habit-imports, av2-workout-progress, av2-money-crypto, av2-money-budgets-plan,
  av2-repeat-projects and customize-aj (the /app/wealth 768 px case).
- **av2-backup-folder:** run it in CI's real Chrome. The sandbox's Chromium closes when an OPFS directory handle is read
  back from IndexedDB, so it can't be judged here.
- **The visit report draws symptoms twice.** q3 #48 was built by both the body lane (one chart with every symptom's
  line, key and markers, `SymptomLines`) and the food lane (a small chart per symptom), in
  `components/report/report-document.tsx`. Both show the same levels. Each lane's spec checks its own chart:
  av2-report-symptoms and av2-food-minors. Choosing one is a design call; I changed neither.
- **The Showcase's maintenance estimate is never ready.** It has 7 weigh-ins in 28 days, against
  `ENERGY_MIN_WEIGHTS = 10` (lib/health-aa/energy.ts, since Session AJ). The comment in `lib/health-aa/showcase.ts`
  still says six are needed. Adding weigh-ins would move pinned insight counts (B42), so I left the data alone and
  coach-checkin seeds its own three.
- **TIER 3 (sync):** 49187ad1 changes only how Settings → Account & sync's boxes look while a sync runs. What syncs and
  when is unchanged.
- Stored formats: none changed. Help and What's new: nothing. Shard lists: nothing new (no spec added). Always visible on
  Today: nothing.
