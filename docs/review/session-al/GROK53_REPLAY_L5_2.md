# Grok #53 replay — lane L5 (Tasks, Checklist, Agenda, Notes, Journal, Quick add), round 2

- **Commit served:** `37d2370c` (production build, `PUBLIC_ALPHA_UNDEPLOYED`, from `/home/user/zig-branch2`) on http://127.0.0.1:3103. It was answering, so it was not restarted. The commits after `37d2370c` change only ZIGi/NOVA, tests, docs and the HUD shimmer. None of them is in this build.
- **Date:** 8 Nov 2026, about 14:30–15:50 Brussels.
- **Replayed by:** a fresh replay agent. It made no fixes, changed no app or test code and made no git writes.
- **Scope:** the 31 finding ids in the L5 replay list (AL row, id, latest verdict).
  - For each id, only its own block was read: in the bot files (`grok-2026-11-04/*.md`) and in `docs/review/session-al/ledger/*.md`.
  - The round-1 file `GROK53_REPLAY_L5_1.md` (on `c521574f`) was read for its method header and each id's row.
  - The lane file `lanes/L5.md` was read only for its "Fourth pass" section, to see what it claims Fixed.
- **Method** (same as round 1):
  - Playwright 1.63 from zig-branch2, headless Google Chrome (channel `chrome`), one browser and one worker.
  - Every run went through `flock -o /tmp/claude-0/zig-browser.lock`.
  - `locale: en-GB`, `timezoneId: Europe/Brussels`, live API (no routing).
  - The bots' clock was set with `page.clock.install`:
    - 4 Nov 2026 at 02:30–03:30 Brussels unless a row says otherwise.
    - LS-037 ran 3 Oct → 10 Oct → 4 Nov. LS-032 ran 3 Nov 21:00 → 4 Nov 03:30. C-LS-09 started at 17:30.
    - LS-013 and LS-067 ran on the real clock, as in round 1.
  - Every record was entered through the screens: habits on Habits (+ New habit), the path in Edit path, tasks typed in Tasks, entries in Journal. Nothing was injected.
  - Scripts and screenshots are in `/tmp/claude-0/replay-L5-2/` and are not committed.
- **Conditions** (codes as round 1):
  - **T** = Tasks at 1280×900, Nebula (the app default), a fresh empty context with the Welcome marked seen.
  - **C** = Checklist at 375×812, Nebula, fresh. It was rebuilt through the UI:
    - habits QA Stretch ×2, QA Floss, QA Vitamins, "0", "-5", 120×M, QA test item, Morning run (Morning, reminder 07:30) and Yoga Fridays (Fridays only);
    - Meditate from "From your pages";
    - own items Stretch 5 min and Floss teeth.
  - **Sc** = Settings → Load Showcase Demo, 1280 Dark.
  - **DP** = Denver's profile: 1920×1113 Nebula, fresh. **388D** = 388×844 Dark.
  - **W** = 1440×1013 fresh (Nairobi's Today).
- **Caveats:**
  - The lane specs (`tests/grok53/tasks|checklist/l5-fourth-pass.spec.ts`) were not run. All verdicts come from the UI replays.
  - The id list gives "OTHER" as the latest verdict for NB-093/193/228. The "round 1 verdict" column uses this lane's round-1 file (STILL OPEN / FIXED / FIXED).
  - **LS-H22 drag:** Playwright's `dragTo` on a row centre does not start an HTML5 drag (pointerdown only), and neither does a press on a row that is outside the viewport. Round 1's failed drags were made that way.
    - A real pointer drag on rows in view does move them. 3 tries; the moves persist after a reload.
    - One of the three landed above the target row although the pointer was released in its lower half. This is noted; it does not change the verdict.
  - **Owner decisions:** accepted only where AL_SCOPE F or an ADR-037 O-row says so.
    - Accepted this round: O6, "The Checklist keeps its protected daily orbit". The path's one-word labels are part of that orbit: the protected pin `tests/checklist-overlay-af.spec.ts:100` checks "its one word on the path (owner amendment 10)" and "never an ellipsis" (ADR-031). This covers LS-017, LS-053 and PR-031.
    - Not accepted: D-086's words and the heat-map cells. These are lane choices or test pins, not F/O decisions. D-086 stays CHANGED.

## Totals (counted per finding id)

| verdict | ids |
|---|---|
| FIXED | 21 |
| HOLDS | 2 |
| CHANGED | 4 |
| OWNER DECISION | 3 |
| STILL OPEN | 1 |
| NOT REPLAYED | 0 |
| **total ids** | **31** |

## Findings

#### AL-CHECKLIST-001

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| D-086 | AL-CHECKLIST-001 | CHANGED | CHANGED | 375 fresh, own items Stretch 5 min + Floss teeth, Floss ticked | The numbers are labelled ("1 of 2 planets today", "Orbit 1/2 · 1 of 2 complete"). Opening "Orbit consistency" now shows a new line: "A planet is one item on your path: the counts above and here are your planets, and an orbit is complete when all its planets are lit." The same panel's day line still reads "4 Nov 2026: Some orbits — 1 of 2 items done so far". So the three words are now explained in one sentence, but they are not one word yet: "planets" in the header, "items" in the heat map. |

#### AL-NUMBERS-SOURCE-013

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LA-022 | AL-NUMBERS-SOURCE-013 | STILL OPEN | FIXED | 1280 fresh, 4 Nov 01:45, Lisbon-AI state 2 (UI) | Set-up: habits Stretch 5 min (14:00), Read 10 pages (19:00) and Drink water; tasks "Pick up parcel today 18:00", "Team dinner friday 19:30 p4" and "Call the dentist today", then ticked the dentist. Asked NOVA (Ctrl+J) and ZIGi (Ctrl+Shift+Z) "What's on my agenda this week?". Both answer: "4 Nov 2026: Drink water, Read 10 pages, Stretch 5 min, Call the dentist (done), 18:00 Pick up parcel … 6 Nov 2026: …, 19:30 Team dinner …", plus "Open the agenda". The tasks are in the answer. |
| LS:st2-h | AL-NUMBERS-SOURCE-013 | STILL OPEN | FIXED | as LA-022 | The same prompt in the same state gives the same answer in both assistants: the tasks are listed by day with their times. |

#### AL-TASKS-FEATURE-003

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-LS-08 | AL-TASKS-FEATURE-003 | CHANGED | FIXED | T | Added "Bin day every week today". Edit → Title "Rubbish day" → Save asks: "“Bin day” repeats (Every week). Change only this time (Wed 4 Nov), or this and every time after?", with the buttons Only this time / This and all future times / Back to the edit. **Only this time:** a one-off "Rubbish day" due today; the series "Bin day" moves to Wed 11 Nov; toast "Saved this time only: “Rubbish day”. The repeat goes on as before. Undo". **Second edit → "Bins out" → This and all future times:** the series is renamed and still repeats from 11 Nov. |

#### AL-TASKS-FEATURE-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-014 | AL-TASKS-FEATURE-005 | CHANGED | FIXED | T | "/" opens the Search dialog with the cursor in "Search goals, habits, …". Typed "plumber" and pressed Esc **once**: no dialog left, focus back on the page. A second Esc found nothing to close. |
| LS-H36 | AL-TASKS-FEATURE-005 | STILL OPEN | FIXED | T | Ctrl+K on /app/tasks opens the dialog "Command menu", with focus in "Go to a page, run an action or find a task". It lists Actions (Ask ZIGi · Ctrl/⌘+Shift+Z, Quick add, Add a task, Search everything · /) and Pages. Typing "bravo" shows "RECENT TASKS · Bravo · Task" and "Ask ZIGi: “bravo”". Esc closes it. The ? sheet reads "Ctrl/⌘+K Command menu: pages, Quick add, a new t…". No crash. |

#### AL-TASKS-FEATURE-006

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-H22 | AL-TASKS-FEATURE-006 | CHANGED | FIXED | T, Inbox Alpha–Delta | Pointer drag of a row (press, move, release on another row): "Alpha" → below "Delta" gives "Moved “Alpha” below “Delta”. Undo". Delta → above Bravo gives "Moved “Delta” above “Bravo”. Undo". The order holds after a reload. Move up / Move down and Alt+↑/↓ are still there (round 1). The one off-by-one drop is in the caveats. |
| C-LS-16 | AL-TASKS-FEATURE-006 | CHANGED | FIXED | as LS-H22 | Manual drag reorder and the keyboard move both work, and both persist. |

#### AL-TASKS-FEATURE-009

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| PR-103 | AL-TASKS-FEATURE-009 | CHANGED | FIXED | Sc, 4 Nov 10:30 | Today, under "What is due now", shows the region "Tasks due today": "Tasks due today: 2 · 1 overdue · Example · Book the dentist 10:30 and 1 more →". |
| N-PR-08 | AL-TASKS-FEATURE-009 | STILL OPEN | FIXED | Sc | /app/review has a section "Tasks · this week — Things you got done": 1 task finished, none the week before, 6 added, 5 open now, 1 overdue, "Finished: Example · Renew the library card", and "Open Tasks, Completed →". "This month" shows the same section for the month. |

#### AL-CHECKLIST-006

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-017 | AL-CHECKLIST-006 | CHANGED | OWNER DECISION | C | The own-item field stops at 60 and says "Up to 60 characters · 12 of 60 items on your path." The path labels are still one word: "Stretch", "Floss", "Step", "MMMMMMMMMMMM". The accessible names keep the full names. Labels: ADR-037 O6 (protected orbit), pinned by `checklist-overlay-af.spec.ts:100` ("one word … owner amendment 10", ADR-031 "never an ellipsis"). |
| LS-053 | AL-CHECKLIST-006 | CHANGED | OWNER DECISION | C | The path shows the same words as in round 1: "Stretch Stretch" (QA Stretch / QA Stretch (2)), "Floss … Floss" (QA Floss / Floss teeth), "Step Step" ("0" / "-5"), and "MMMMMMMMMMMM" with no ellipsis. The aria names differ ("QA Stretch (2): not done yet", "0: not done yet"). The lane's `distinctPathLabels` helper is not wired. O6 as LS-017. |
| PR-031 | AL-CHECKLIST-006 | CHANGED | OWNER DECISION | C | "QA test item" reads "Test" on the path (one word), and its aria name is "QA test item: not done yet". O6 as LS-017. |

#### AL-CHECKLIST-009

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-H26 | AL-CHECKLIST-009 | STILL OPEN | FIXED | C, 4 Nov 03:30 | Tapped QA Floss: "QA Floss: 1 time: done", toast "QA Floss logged for today. Undo". After 20 min a second tap gives "QA Floss: not done yet", toast "QA Floss: not done today. Undo", no panel, and the entry count goes to 0. Undo gives "QA Floss: 1 time: done", toast "QA Floss: done again." |

#### AL-CHECKLIST-010

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-032 | AL-CHECKLIST-010 | CHANGED | CHANGED | C, built 3 Nov 21:00, checked 4 Nov 03:30 | **Habit QA Floss:** List → More → Done yesterday gives "QA Floss: done yesterday, on Habits. Undo" (entry 2026-11-03). **Own item Floss teeth** now has Done yesterday: "Floss teeth: done yesterday, counted in yesterday’s orbits. Undo". Undo gives "Floss teeth: yesterday is as it was." **Habit made today:** "Made today started today, so yesterday is not part of it." Still: only yesterday, not the bot's "last 7 days", and the heat-map cells are still a picture, so you cannot tap a past day. |
| C-LS-35 | AL-CHECKLIST-010 | CHANGED | CHANGED | as LS-032 | A missed day can be filled in for habits and own items, but only yesterday. There is no "complete on a date" for any earlier day. |

#### AL-CHECKLIST-012

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-H23 | AL-CHECKLIST-012 | CHANGED | CHANGED | C | The List view can now reorder. More for Floss teeth → "Move up" says "Floss teeth moved up." (it went from 6th to 5th). Alt+↑ on its row moved it to 4th, with toast "Floss teeth moved up.". The order holds after a reload. The bot's ask was drag, and a List row still cannot be dragged: `list-view.tsx` and `list-extras.tsx` have no draggable or drag handler. Mouse drag stays in Edit path (it lands since round 1). |

#### AL-COPY-047

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| DV-190b | AL-COPY-047 | CHANGED | FIXED | DP, 4 Nov 03:00 | Energy 4 + "A calm day, walked by the river." → Save entry. The entry reads "2026-11-04 A calm day … Question for later: How did your body feel after moving today?". Headings in order: Write, Entries, Your own scales, Your week … The Write area now reads "QUESTION FOR LATER … ZIGi asks this one on your device, from your entry; no AI reads it. Answer now or leave it." The heading no longer says "ZIGi asks", and the line says where the question comes from. |
| DV-190c | AL-COPY-047 | CHANGED | FIXED | DP | "Your week": the legend "Top: energy 1–5 · below: the day’s mood 1–5 · a dot means no check-in that day." sits above the strip. Screen readers hear "Mon 2 Nov: no check-in", "Wed 4 Nov: energy 4 of 5" and so on, with no ISO dates. |
| N-DV-07 | AL-COPY-047 | STILL OPEN | FIXED | 388D | On Notes the tabs (Today · Inbox · Notes · Days · Graph · Files) are at y 336–430 and Capture starts at y 446 on the 844 px screen, so both are in the first screen (screenshot `n-dv-07-notes-388-dark.png`). |

#### AL-PERF-007

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-067 | AL-PERF-007 | STILL OPEN | STILL OPEN | 375 fresh, cold load, service worker blocked (page only) | A cold /app/tasks load is 106 resources and **2.67 MB** transferred. 1.71 MB of that is one image, `/brand/figures/zigi/origami-nebula/F022-peek.anim.webp`. The JS is 56 files and 670 KB transferred (2.0 MB decoded); the CSS is 33 files and 116 KB. With the service worker allowed, the context fetched 277 requests and 3.6 MB, the extra being the install cache. The row's target is under 1 MB. The lane's own split (lazy editor) is in; the rest is shell (integrator). The later ZIGi commits are not in this build. |

#### AL-PERSISTENCE-009

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-013 | AL-PERSISTENCE-009 | CHANGED | FIXED | 1280×800 fresh, real clock | First session: /app/tasks, added "Offline check task", waited for the service worker (active; 176 cached paths, including /app/agenda). Went offline: the /app/tasks reload works. Then /app/agenda, never visited before, opens offline with "You’re offline. This page keeps working… AGENDA Your days, all in one place…", not "This page could not be shown". |

#### AL-QUICK-ADD-005

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-038 | AL-QUICK-ADD-005 | CHANGED | FIXED | C + variant | **Bot condition (Health Meditate on the path, no habit):** "meditated 15 minutes" and "15 min meditation" both get "Meditation is logged on Health › Mind (or with the Checklist’s Meditate tile). To log it here, make a “Meditate” habit." Nothing is logged. **Variant with a "Meditate" habit:** "meditated" → "Will save: Meditate · +1 time · today". "meditated 15 minutes" and "15 min meditation" both get "Meditate counts times, not minutes. Write “meditate” to add 1 time, or make it a timed habit on Habits to log minutes." There is no "+15 times" any more. |

#### AL-TASKS-FEATURE-010

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-037 | AL-TASKS-FEATURE-010 | CHANGED | FIXED | T, clock 3 Oct → 10 Oct → 4 Nov | Finished "Old finished task" on 3 Oct and "Recent finished task" on 10 Oct, then opened Completed on 4 Nov. It reads "Completed 1 time" and lists only "Recent finished task · Done 10 Oct", then "1 finish older than 30 days is not listed; it leaves this device’s list at the next change." and "Finished tasks are kept 30 days … (export them as CSV first to keep a copy)". The heading and the list now agree. There is no "Show all completed", because older finishes are not kept by design (the CSV export is the stated way to keep them). |

#### AL-TOAST-008

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| NB-093 | AL-TOAST-008 | STILL OPEN | FIXED | W | Customize Today → Add widget → Sleep → Save → "Options for Sleep". Every item is shown and is the top element at its point: Ask ZIGi about this, Edit widget, Hide widget, Move earlier, Move later, Move to rail, Compact size, Wide size and Remove widget (y 828). The card's overflow is visible. A trial click on Remove widget is clickable (screenshot `nb-093-sleep-menu-1440.png`). |
| NB-193 | AL-TOAST-008 | FIXED | HOLDS | W | Remove widget → toast "Widget removed. Your underlying record was kept. Undo" at y 835–901, above the Arrange bar (y 921) → Undo clicks → "Put back on Today." (13 widgets again). |
| NB-228 | AL-TOAST-008 | FIXED | HOLDS | W | Same run as NB-193: the Arrange bar no longer intercepts Undo. |

#### AL-CHECKLIST-014

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| LS-019 | AL-CHECKLIST-014 | CHANGED | FIXED | C, List | More for the habit "QA Vitamins" has: Orbit, Move up / Move down, **Name + Rename**, Done yesterday, Skip today and Take off the path. Renamed it to "Vitamin D": toast "Renamed to Vitamin D, on Habits too. Undo"; the row becomes "More for Vitamin D"; the habits store and the Habits page both show "Vitamin D". |
| LC-005 | AL-CHECKLIST-014 | CHANGED | FIXED | as LS-019 | List → More is no longer thin: it offers rename, move orbit, reorder, done yesterday, skip today and remove, for habits and own items alike. |

#### AL-COMPETITOR-GAP-129

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-DVG-76 | AL-COMPETITOR-GAP-129 | CHANGED | FIXED | C, List | The habit "Morning run", with a reminder set on Habits at 07:30, shows the row "Morning run · Habit · reminder 07:30". The Fridays-only habit "Yoga Fridays" (on Wed 4 Nov) shows "Yoga Fridays · Not today · Habit · next Fri 6 Nov". |

#### AL-TASKS-FEATURE-016

| finding id | AL row | round 1 verdict | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|---|
| C-LS-09 | AL-TASKS-FEATURE-016 | CHANGED | FIXED | T, 4 Nov 17:30 → 17:46 | Added "Call mum today 18:00", then Edit → Reminder "15 minutes before" → Save. Today at 17:30 shows "Tasks due today: 1 · Call mum 18:00 →". At 17:46 the same region also shows "⏰ Reminder · Call mum at 18:00" with Done and Dismiss. Device push is the owner step (P-LS-68, ADR-010) and was not replayed. |

## STILL OPEN for the lane

Common set-up: Chrome, a fresh context, `en-GB`, `Europe/Brussels`, Welcome marked seen.

1. **LS-067 (STILL OPEN): /app/tasks weighs 2.67 MB on a cold load at 375; the target is under 1 MB.**
   - Steps:
     1. Open a new context at 375×812 with the service worker blocked.
     2. Go to http://127.0.0.1:3103/app/tasks and wait for hydration plus 4 s.
     3. Sum `performance.getEntriesByType('resource')` transferSize.
   - Result: 106 resources, 2.67 MB. The largest is `/brand/figures/zigi/origami-nebula/F022-peek.anim.webp` at 1.71 MB. JS is 56 files, 670 KB. CSS is 33 files, 116 KB.
   - The heavy part is the shell (integrator/L10a) and the ZIGi figure (L7). The Tasks route's own chunks are small.

Remaining parts of the CHANGED rows (not STILL OPEN; for the lane's next pass):

- **D-086:** the words are explained in one note, but the heat-map day line still says "items" ("1 of 2 items done so far") where the header says "planets". Steps: C, tick one item, open "Orbit consistency".
- **LS-032 / C-LS-35:** only yesterday can be filled in. There is no earlier day ("last 7 days") and no heat-map cell to tap. Steps: C built on 3 Nov, open on 4 Nov → List → More → only "Done yesterday" exists.
- **LS-H23:** the List view reorders with Move up/down and Alt+↑/↓, but a List row cannot be dragged with the mouse (0 draggable rows). Steps: C → List → try to drag a row onto another.
