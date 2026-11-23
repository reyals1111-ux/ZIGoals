# Session AV lane 2 — fixb6: batch 6's failing browser specs

Branch `lane2/fixb6` from `lane2/batch6` (493b368b). The lead's run of round 6's specs on the production build of 9466cc8b
at :3101: 342 passed, 54 failed, 14 skipped, in 8 spec files. Every failure is taken here; all 8 files pass.

Five of the eight needed an app fix (owner follow-up 6: fix the app where a person would meet the fault; a spec changes
only where its expectation is wrong for correct behaviour, and then for an equally strict or stricter check, never a
narrower one, labelled "(fixb6; deliberate)"). Spec-only changes were checked on :3101; app fixes on a dev server of this
branch (:3109). No assertion weakened, no timeout raised, no check narrowed; no stored data changed.

| spec | cause | fix | commit | verified |
|---|---|---|---|---|
| av2-lock-away (6) | **Spec**: `page.clock.fastForward('61:00')` — Playwright refuses 61 minutes as mm:ss ("Invalid time 61:00") | the same hour and a minute written `'01:01:00'` (fixb6; deliberate) | a971826c | :3101 6/6 |
| av2-r6-meditation (6) | **Spec**: the fixture's session ids `health_med-r6-0001` had 7 characters after `health_med-`; the stored schema needs 8–90, so `healthSchema.parse` threw before the page opened | ids padded to `health_med-r6-00001` (fixb6; deliberate); every assertion unchanged | 3079eac6 | :3101 6/6 |
| av2-money-refund (6) | **Spec**: the Kind and category chips' radios (drawn 20 px by the global radio rule, invisible) sit over the middle of their words, so a click on the word's `<span>` is caught by the radio. A person's click there still chooses (the radio is the chip's own control) | Refund and Groceries chosen by `getByRole('radio', {name, exact})` inside their group, as the other money specs do, and each checked to have taken (stricter) (fixb6; deliberate) | d8829bd9 | :3101 6/6 |
| av2-money-r6-budgets (6) | **App**: Reorder budgets set focus in an effect that ran at once, before the async save redrew the list; after the redraw Home's ↑ was disabled (first row) and focus was lost | focus moves once the new order is drawn (the effect waits for a new list), to the pressed arrow or, when that one is now disabled, the row's other arrow (r6-budgets.tsx). Spec unchanged | c288329d | :3109 6/6 |
| av2-notes-tidy (12) | **App**: "Rename or merge a tag"'s Tag and Merge into selects sat inside their `<label>`, so the label's text held every option and `getByLabel('Tag', {exact})` found nothing. **Spec**: merging Rome into Italy keeps Rome's Budget 300 and Booked Yes, which differ from Italy's own, as "Properties it had" lines under its heading (#407, "nothing is lost", lib/notes/merge.ts and its unit test); the spec's exact body had left them out | app: both selects named by their own word (`aria-labelledby`, tag-rename.tsx). Spec: the exact merged body with those lines, plus Italy's own Budget 100 and Booked No checked kept (stricter) (fixb6; deliberate) | 94434e25 | :3109 18/18 (the file's third test too) |
| av2-r6-gym (6) | **App**: the exercise card's star took its name from a hidden span, read as "Favourite : Squat" (the picker's star is "Favourite: Squat") | one `aria-label` "Favourite: <name>", the visible word kept (r6/exercise-own.tsx). Spec unchanged | e7d1cf9c | :3109 6/6 |
| av2-r6-lifts (6) | **App**: (1) "What lifts you"'s field showed only while the list was empty or being edited, so after the first add it disappeared with focus in it; (2) "Make it a task for today" took its line from a hidden span ("… today : Call my sister") | (1) after an add the field stays (`adding`), until Edit / Done editing; (2) one `aria-label` (r6/lifts.tsx). Spec unchanged | 9aaf2e3e | :3109 6/6 |
| av2-projects-r6 (6) | **App**: (1) the Select bar's "Add a label" and "Any day" groups were named by the same span as the field inside them, so one name meant two controls (its Priority, Move to and Take off selects were named with their options too); (2) on a phone (390 × 664) the bar wrapped to 592 px and, sticky at the top, covered every other row, so a second task could not be chosen | (1) the groups are "Labels" and "Pick a day"; the selects named by their word (`aria-labelledby`, tasks-page-extras.tsx); (2) below 768 px wide or 600 px high the bar stays in place in the page (tasks.css). Spec unchanged | 5d603cb6 | :3109 8/8 (the file's other tests too) |

Unit test `apps/web/lib/a11y/fixb6-names-focus.test.ts` (758cdf95) pins the names and the focus rules above. Checks:
`tsc --noEmit` clean, eslint clean on every changed file, `pnpm test` 15 479 passed and 1 failed: `scripts/pre-run11-setup.test.mjs` › "CLI accepts ignored mode-0600 JSONC…", which fails the same way on `lane2/batch6` in this sandbox (offline setup check; nothing here touches it); the related unit folders
(lib/notes, lib/budgets, lib/workouts, lib/mood-words, lib/tasks, lib/b6p-app-day) 177 files / 980 tests passed.

**For the lead.** The five app fixes need the lead's rebuild before :3101 shows them. No lead-only file was touched; no
answer text changed (no corpus intent moves). No other spec uses the renamed groups ("Add a label" / "Any day" as groups)
or the changed names.
