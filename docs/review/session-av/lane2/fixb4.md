# Session AV lane 2 — fixb4: batch 4's failing browser specs

Branch `lane2/fixb4` from `lane2/batch4` (c434151b). The lead's run of the batch on the production build at :3101: 333
passed, 74 failed, 13 skipped. Every failure is taken here: 15 spec files.

14 of them were wrong in the spec only. One (av2-compare-sleep) also found a small app fault, fixed with a unit test.
Spec-only fixes were checked on :3101 (the production build of c434151b). Every fixed spec was then run on a dev server of
this branch (:3102), desktop and mobile projects, all three themes: 97 passed at first. The 5 that failed timed out while
the dev server was still compiling a route (`page.goto` / hydration at 45 s, with a memory kill in the sandbox), and they
passed when run again (9 of 9 desktop). av2-notes-fold (mobile, Nebula) timed out in the lead's run waiting for hydration
and passed 6 of 6 here without a change. It is a load intermittent, not a fault.

| spec | cause | fix | commit | verified |
|---|---|---|---|---|
| av-watch | spec: round 4's region "Watching payees" (same fold) also matched the name "Watching" (strict mode) | `exact: true` | a6e1ea44 | :3101 6/6, :3102 6/6 |
| av2-compare-sleep | spec: `getByLabel('Caffeine after')` also matched the "On days with…" select through its option "Caffeine after a time". **App**: the caffeine hour's select sat in a `<label>` with its explanation, so its accessible name was the whole text ("Caffeine after 14:00 The time a drink was logged…") | app: `aria-labelledby` its label's span and `aria-describedby` the line under it (compare-explorer.tsx). Unit test `lib/insights/fixb4-compare-names.test.ts`. Spec: `getByRole('combobox', {name: 'Caffeine after', exact: true})` | b80e460c | :3102 6/6; **needs the lead's rebuild** |
| av2-feelings-more | spec: shoulders and jaw tie at one day each; a tie goes to the area listed first, head to foot (`bodyCounts`), so jaw | the same exact line with jaw | 3983beaf | :3101 6/6, :3102 6/6 |
| av2-money-categories | spec: `getByLabel` reads a `<label>`'s whole text, options included, so an exact "Category" never matched; "Set" also matched the region "Start from a set" | each select by its exact accessible name (combobox) | 38d26dc7 | :3101 6/6, :3102 6/6 |
| av2-money-groups | spec: without a name, Group is `aria-disabled` (focusable, it says what it needs); Playwright's `click()` waits for an enabled button | asserts `aria-disabled="true"`, then presses Enter on it; the same message is checked | c7d30ec4 | :3101 6/6, :3102 6/6 |
| av2-money-reconcile | spec: "Mark 1 as checked" is `aria-disabled` while a difference is left (same as above); on a phone "Accounts, debts & net worth" starts folded | asserted `aria-disabled`, pressed with Enter; on a phone the fold is opened first (as av2-money-notices does) | ed937950 | :3101 6/6, :3102 6/6 |
| av2-noom-r4 | spec: "Day" also matched "Extra that day (kcal, …)" | `exact: true` | 8475e419 | :3101 6/6, :3102 6/6 |
| av2-notes-archive, av2-notes-lock | spec: "List" also matched "Tuck the Checklist button away". While the graph's chunk loads that is the only match, so the click went there and the list never opened | `exact: true`, as notes.spec.ts does | 39bfda8b | :3101 6/6 each, :3102 6/6 each |
| av2-plan-week | spec: the one alert on the page was Next's route announcer (an empty `role="alert"` in `<next-route-announcer>`'s shadow root, on every page). Then a task marked done leaves Today, so `check()` re-read a box that was gone | alerts counted in everything else in the body (`body > :not(next-route-announcer)`); the box is clicked, the task is checked stored done (`doneAt`) and gone from Today, and the waiting task shows | a43dc9c8 | :3101 6/6, :3102 6/6 |
| av2-planned-workouts | spec (desktop): after Move the focus goes back to the workout, which leaves that week's row at the top edge of the viewport, the chip a fraction above it. A drag started there never began (mousedown and mouseup, no dragstart; reproduced with an event probe). Spec (phone): `chip` was found by its "planned" name, so once set aside it matched nothing | the week is scrolled to the middle of the view before the same drag (as ap-hour-grid.spec.ts does for its drop row); the set-aside and back names are checked on the same chip found by its words | bbe0f53f | :3101 6/6, :3102 6/6 |
| av2-polish-habits (P-27 fill) | spec: the grid has 18 px padding each side, so cards fill 1076 of its 1112 px border box. Pairs measure 529 + 18 + 529 = 1076 too. The lone card does take the whole row | the row's width is measured inside the grid's padding and border | f0d96000 | :3101 6/6, :3102 6/6 |
| av2-runna-r4 | spec: `getByLabel('Distance', {exact})` on a select inside its label, which never matches (options' words) | `getByRole('combobox', {name: 'Distance', exact: true})` | bddcd126 | :3101 6/6, :3102 6/6 |
| health-aa N6 | spec: Save was tapped while the rows were still "Looking in the offline food library…", so olive oil was kept as a new food. Nothing in batch 4 changed the recipe import or the library match (`git log 5042b593..` is empty for them); batch 3's build was quicker | waits until no row is still looking and olive oil names "Olive oil, extra virgin", then Save; the same checks | 11a7d072 | :3101 1/1, :3102 1/1 |
| av2-notes-fold (mobile, Nebula) | load: the hydration wait timed out once in the lead's run | none | — | :3101 6/6, :3102 6/6 |

Every changed spec line is labelled `// Session AV lane 2 (fixb4; deliberate): <why>`. No assertion was weakened or
removed, and no timeout was raised.

## Checks
- Typecheck clean. ESLint clean on every changed file. Vitest: `lib/insights`, `components/insights`, `lib/mood-words` 8
  files / 44 tests, plus the new `lib/insights/fixb4-compare-names.test.ts`.
- No stored data, protected area, lead-only file or CSS touched.

## For the lead
- Rebuild, then run `av2-compare-sleep` against the build (its app change is not in c434151b).
