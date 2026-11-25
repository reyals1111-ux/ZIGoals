# Session AW — batch 1 fresh review (QUALITY-b1)

Reviewer: a fresh helper who wrote none of this code. Scope: `git diff 8fa8aa1d HEAD -- apps/web scripts .github`
at `c4b00cd7` (branch `feature/session-aw-finish-line`), read area by area. No build and no browser was run. These unit
suites pass here: scripts/ci, lib/aw-kcal, read-aloud, guided, timers, remind-again, snooze-choices, aw-x1-notify,
goals/repeat, av2-device-keys, erase-coverage (133 tests), and lib/ai/local-answers/aw-*, frozen-fixtures, fr-layout,
journal, notes/aw-x3, tasks (816 tests).

**Counts: Blocker 0 · Major 2 · Minor 10.**

## Majors

### M1. Activity extras are never synced, although the plan and the keys module say Health consent
- `lib/vault/extras-sections.ts:68`: the `health` section (consent `health`) does not list `ACTIVITY_EXTRAS`.
  `lib/aw-kcal-keys.ts:28` declares `AW_KCAL_SYNC = {activityExtras: {section: 'health', consent: 'health'}}`, but nothing
  reads it. `lib/aw-kcal-keys.test.ts:18` checks only the constant, while its test title says "listed for … the Health
  sync consent". The ADR plan (batch 1, item 1) lists "sync (health consent)" for this record.
- How a friend hits it: with private sync on a phone and a laptop, they type "320" calories on a walk on the phone. The
  Health record syncs, so the walk appears on the laptop, but with no distance, effort or "320 kcal · you entered". On the
  laptop, ZIGi and NOVA then answer "No calories burned are recorded today".
- Fix: add `record(ACTIVITY_EXTRAS)` to the health section (it is verbatim and loose), and make the test check the
  section itself rather than the constant. The alternative is to drop the constant and the plan line and say "device only"
  in the catalogue.

### M2. Goal repeat is kept on this device only, but its turn rewrites the synced finance record
- `lib/goals/repeat.ts:150-176` (`turnRepeats`, `allocate(next, …)` at :170, the milestone untick) runs from
  `components/goals/goal-repeat-turn.tsx`. `zigoals:platform:v1` syncs (lib/vault/account-data.ts `finance`).
  `zigoals:goal-repeat:v1` has no sync home: `lib/aw-x4-strides-keys.ts:8` says "a sync home is the lead's choice", and
  none was chosen. The Part 4 definition of done lists sync consent for every new record.
- How a friend hits it: they turn on "Read 2 books a month · starts again" on the laptop. On 1 December the laptop sets
  the count back to what was added this month, or unticks a project's milestones, and that syncs. The phone then shows
  "0 of 2", or every milestone unticked. Its goal page says "Starts again: Off", with no row of earlier months, and NOVA
  on the phone cannot explain the change.
- Fix: carry the record in the account-consent `goals` extras section next to the finance record. The alternative is to
  turn only where the repeat record is synced, and say "on this device only" on the fold.

## Minors

1. **Read aloud's privacy-page line is missing (amendment 3).** Help has the line (help-page.tsx:142). There is no app
   privacy page, and `landing/privacy.html` has no Read aloud line. This may belong to batch 4's privacy audit; track it.
2. **The Trend per habit card can show before any check-in.** `components/habits/habit-consistency.tsx:25`: `trendShown`
   needs only a trend word. A habit with 5+ scheduled past days in each 30-day window and no check-in (missed days count
   as decided) shows "About the same · 0% now, 0% before". `lib/fr-layout.test.ts:74` says "before a check-in no card
   shows", which this case contradicts. Gate the card on a completed day in either window, or fix the comment.
3. **A snooze tap brings back an ended timer.** In `public/sw.js:451` (`snooze()`), the snooze tap also re-queues an ended
   `timer` item from a mixed notification. An hour later, "Pasta timer is done" rings again if the app was not opened.
   Leave out `kind === 'timer'` items in `back`.
4. **Twenty timers with some ended blocks a new one.** In `lib/timers/store.ts:110-112` only `kept` timers can be
   evicted. With 20 timers, some ended but not stopped, a new one is refused with "they are all running", which is
   untrue. Evict ended timers too, or reword the message.
5. **Shard 5's minutes disagree with its comment.** `apps/web/playwright.webkit.shards.ts:39` says 27.3 worker-min, but
   `WEBKIT_SHARD_MINUTES[4]` is 30.3 (line 46). Use the same figure in both.
6. **One overlong `stepsDone` list makes the guided record unreadable.** `lib/guided/schema.ts:30` has no `.catch`. A
   restored or hand-edited journey with more than 300 entries, or one unreadable key, makes the whole guided record
   unreadable, and the next start "begins a new list". Older builds ignore the field, so #37–#59 are not affected. Filter
   the list on read, as the record's other new fields do.
7. **Undoing a removal later loses the extras.** `components/health/health-app.tsx:743` keeps a removed activity's extras
   in a component ref. If Undo is pressed after leaving the Activity view, the walk returns without its distance, effort
   and calories.
8. **Every other route's JS grew.** ADR-046 D-SPEED records +1.2 kB of JS on every other route (an extra shared chunk).
   Amendment 2 says "no route's JS grows". Close this in attempt 2, or record the cause in the closing table.
9. **Linked-account active energy has no source words.** `lib/ai/local-answers/engine.ts:1084` (`vitalsAnswer`) adds
   "from your file" only for "… export" sources. Linked-account active energy gets no "from your linked account". Use
   `energySourceWords`, as aw-kcal.ts does.
10. **The frozen fixture lacks the new records.** It has none of the four new AW keys and no `template:
    'morning-evening'` entry. Older builds ignore new keys and the template passes their regex, so the risk is low, but
    the plan listed activity extras for the fixture.

## Checked and found sound
- **Stored data:** every change is additive.
  - Tasks: reminders, `again`, `dread` and `moved`.
  - Journal: `parts`, `dayPhoto`, `dayPages`, `morningReminder`, and `template` (matches old builds' regex).
  - Journal display: `voiceSpeed`.
  - Guided: `stepsDone` and `showcase`, with done days within the old `MAX_DONE` of 50.
  - Notify prefs: `taskAgain`, `snoozes`, and `types.timers`.
  - Task plan: `timeTargets`.
  - Activity extras sit in their own key because `activitySchema` is strict.
  - Older schemas at #50–#59 are loose for every touched object.
- **No estimated burn:** `activityKcalEstimate` and `ACTIVITY_MET` are gone. Calories show only as "· you entered"; the
  week row and the answers name the source. Maintenance is labelled "an estimate, not medical advice".
- **Read aloud:** only `localService === true` voices are used, checked again at speak time; the utterance always carries
  that voice; nothing is shown without one; there is a spec with a network-only voice.
- **FR-TJ-7:** today's habits come first in both orders; the empty groups fold into one line; the 30 days and the week
  wait for a check-in. The saved order still wins.
- **Coverage:** export, erase, restore and the catalogue cover all four keys.
- **Service worker:** task repeats share a series id. Done and Snooze drop the later repeats and their wake minutes.
- **Tests:** the deliberate test changes (habits order, persona-z, ui-design-pass, motion-arrival, earn-guide and
  mini-window splits, accept-correct in parallel, kcal and guided unit tests) each keep an equally strict replacement. None
  was found weakened.
