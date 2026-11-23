# Session AV lane 2 — fixb5: batch 5's failing browser specs

Branch `lane2/fixb5` from `lane2/batch5` (358fdbef). The lead's run of round 5's specs on the production build of 358fdbef
at :3101: 318 passed, 49 failed, 13 skipped, in 8 spec files. Every failure is taken here.

Six of the eight needed an app fix (owner follow-up 6: fix the app where a person would meet the fault; a spec changes
only where its expectation is wrong for correct behaviour, and then for an equally strict or stricter check, never a
narrower one). Spec-only changes were checked on :3101; app fixes on a dev server of this branch (:3105).

| spec | cause | fix | commit | verified |
|---|---|---|---|---|
| av2-cycle-r5 (12) | **App**: the glance and cycles tables put `sr-only` words (`position: absolute`) in their cells. Their containing block was above the scroll wrap and `.health-page`'s `overflow-x: clip`, so they escaped both and made the page 976 px wide at 320 (and wide at 390) | `.cycle-table-wrap, .cycle-glance-wrap` get `position: relative`, so the wrap's own scroll clips them (cycle.css) | 415f5e28 | :3105 18/18 |
| av2-money-spreadsheet (3, desktop) | **App**: "Download for Excel, Numbers or Sheets (.xlsx)" is `white-space: nowrap` (button.secondary), so its min-content set Spending's single grid column to 355 px at 320. Found by hiding each part in turn | the sheet's buttons wrap (`white-space: normal; max-width: 100%`, money-r5.css) | 8ad643b5 | :3105 6/6 |
| av2-money-merge-accounts (6) | **App**: each select sat inside its `<label>`, so the label's text held its options' words and `getByLabel('Merge', exact)` found nothing. Spec: the doubles box is named "Remove the copy from ING Current of …" (the account is named), the spec looked for "Remove the copy of Groceries" | app: Merge and into named by their own word (`aria-labelledby` its span); the spec's original lookups kept. Spec: the box by its whole exact name (stricter) | 58b33d6a (box name), 4bace9b7 (app; reverts 58b33d6a's lookup change) | :3101 6/6 before the app fix (role lookups), :3105 6/6 with it (original lookups) |
| av2-notes-table-edit (6) | **App**: as above, Row and Column inside their labels | Row and Column named by `aria-labelledby`; spec unchanged from batch 5 | f33f39cd, reverted in 4bace9b7 | :3105 6/6 |
| av2-notes-trash (6) | spec: no note has "later" once the plan is deleted, so Search shows "No note has those words." and no `.note-results` list, which `not.toContainText` needs; later the fold stays open after Restore (`trashOpen`), so a second tap on its summary closed it | the no-match line is checked and the result list absent (stricter); the fold is checked open instead of tapped | b1c1f442 | :3101 6/6 |
| av2-planned-day (8) | **App**, four faults: (1) "Doing now" acts at once, which moved the row from Today's group to Doing: a new list, so the row remounted and its editor closed and focus was lost; (2) Play the steps focused Next in a mount effect while the record was not yet read (nothing drawn), so focus never went there; (3) the editor's Place input had its note in its name ("Place Written as you type it…") and the Time block's note ("places it inside the block") also matched "Place"; (4) Chrome's `Intl.supportedValuesOf('timeZone')` has no "UTC", so the Second time zone could not offer it | (1) a row tells the list when its own editor opens and closes (`onEditing`), and Today keeps it in its group while open; it moves when the editor closes; (2) focus once `tasks.loaded`; (3) Place, Travel before, Plan for and Time block named by `aria-labelledby`, the notes stay their descriptions; (4) UTC added when the browser's list lacks it. Unit tests `lib/tasks/fixb5-editor.test.ts`, `lib/agenda/fixb5-zone-utc.test.ts`. Spec unchanged | 42afaa59 | :3105 8/8 |
| av2-r5-status (6) | **App**: Change it focused `querySelector('input:checked, input')`, which returns the first input in the page's order (the "Ill" radio), not the checked one | the checked radio is looked for first. Unit test `lib/workouts/fixb5-status-focus.test.ts` (fails on the old code) | fabcccd0 | :3105 6/6 |
| av2-timeline-moods (2) | spec: the day holds only Health's mood and energy, so with Health hidden nothing is on it and the timeline is "quiet" (no block, no any-time row), which is right; the spec expected "ready" | expects "quiet": stricter, as one mark would make it "ready" (the spec's first test) | 67738ff1 | :3101 20/20 |

Every changed spec line is labelled `// Session AV lane 2 (fixb5; deliberate): <why>`. No assertion was weakened, removed
or narrowed, and no timeout was raised. No stored data, protected area, lead-only file or theme sheet changed
(`build-themes.mjs --check` clean); the CSS changes name no colour.

## Checks
- Typecheck clean; ESLint clean on every changed file; `build-themes.mjs --check` clean.
- Vitest: `lib/tasks`, `lib/agenda`, `lib/money-log/av2-merge-accounts`, `lib/workouts/av2-r5-status`, the notes table
  tests, `lib/illustrations/pillar-art` and the three new files: 64 files, 470 tests.
- Final run of all eight specs on :3105 at the branch head (fabcccd0), desktop and mobile, all themes: 76 passed, 0 failed.

## For the lead
- Rebuild, then run the six app-fixed specs against the build (their fixes are not in 358fdbef).
