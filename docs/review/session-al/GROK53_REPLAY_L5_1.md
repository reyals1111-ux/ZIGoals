# Grok #53 replay — lane L5 (Tasks, Checklist, Agenda, Notes, Journal, Quick add), pass 1

- **Commit served:** `c521574f` (production build, `PUBLIC_ALPHA_UNDEPLOYED`, built from /home/user/zig-branch) on http://127.0.0.1:3101.
- **Date:** 5 Nov 2026, about 04:30–07:30 Brussels.
- **Replayed by:** a fresh replay agent. It made no fixes, changed no app code and ran no git command that changes anything.
  - Scope: the 67 AL rows with lane L5 in GROK53_LEDGER.md, expanded through the per-bot ledgers: Lisbon (LS, LC, LA, C-LS, N-LS, prompt row LS:st2-h), Professor (PR, C-PR, N-PR), Denver (DV, N-DV), Denver re-check and gaps (D, C-DVG) and Nairobi (NB). 163 finding ids.
  - Lisbon is the main bot; her steps (`grok-2026-11-04/lisbon.md`, `lisbon-ai.md`) were replayed through the screens: typing, clicks and keys.
  - `lanes/L5.md` was read only to see which rows claim Fixed.
  - AL_SCOPE section C (Tasks at Todoist/TickTick level) was checked item by item (table after the findings).
- **Browser:** Google Chrome for Testing 153 (Playwright channel `chrome`), headless, Playwright 1.63, `locale: en-GB`, `timezoneId: Europe/Brussels`, live API (no routing).
  - The bots' clock was set with `page.clock.install` to 4 Nov 2026, 01:42–03:50 Brussels, unless a row says otherwise. LS-011/065 started at 22:50, LS-037 on 3 Oct, LS-032 on 3 Nov, and the reminder on 17:30.
  - Every run went through `flock -o /tmp/claude-0/zig-browser.lock`, one browser at a time.
  - The scripts and one screenshot are in `/tmp/claude-0/replay-L5/` and are not committed.
- **Data:** everything was entered through the UI: habits on Habits, the path in Edit path, tasks typed in Tasks or Quick add, and goals through the wizard.
  - Exceptions, as the bots did them: LS-022 (an injected 1,000-task store and corrupt bytes) and LS-030 (an injected 500-task store, with the CPU slowed 4×).
- **Conditions used** (codes in the table):
  - **T** = Tasks at desktop 1280×800–900, Nebula (the app default), a fresh empty context with the Welcome marked seen.
  - **C** = Checklist at 375×812, Nebula, fresh. Lisbon's profile was rebuilt through the UI: 12 habits on Habits, Water, Weigh in and Meditate from "From your pages", and own items (Unicode and RTL included).
  - **Q** = the global Quick add at 375, in the C profile.
  - **A** = Agenda at 1280, Nebula, fresh, with 4 daily habits and 2 tasks (Denver's week).
  - **Sc** = 1280 Dark with Settings → Load Showcase Demo (the Professor's G+Sc).
  - **DP** = Denver's profile, 1920×1113 Nebula, fresh. **388 / 768** = those widths in Dark or Light, as the bot ran them.
- **Lane specs (`tests/grok53/tasks`, `tests/grok53/checklist`):** not run.
  - Every spec seeds the store and answers `/api` with 503, in UTC, so none of them replays the bots' steps in the bots' conditions.
  - The lock was shared with several other replays and suites.
  - All verdicts below come from the UI replays.
- **How CHANGED is used:** the bot's main complaint is gone, but a named part of the same finding remains, or the fix behaves differently from what was asked. **STILL OPEN** means the main complaint still shows.
- **Owner decisions** were accepted only where AL_SCOPE F or O6 says so. Accepted:
  - O6, the Checklist's path, labels, top bar and layout: LS-028, LC-008, D-170, PR-071 and its copy rows.
  - F, Light's dark islands, the footer finale, and no ZIGoals server for people's data: LS-020/LC-015, C-DVG-74, C-DVG-73, C-LS-25.
  - A lane choice such as "Ctrl+K stays ZIGi" or "List reorder = Edit path" is not an F/O decision. It is counted as REASON CITED, NOT BUILT, or as STILL OPEN.
- **Incidental:** Showcase and backup pages log "Minified React error #418" (a hydration text mismatch), once per load, on /app/settings and the Showcase.

## Totals (counted per finding id)

| verdict | ids |
|---|---|
| FIXED | 121 |
| CHANGED | 21 |
| OWNER DECISION | 11 |
| STILL OPEN | 8 |
| REASON CITED, NOT BUILT | 2 |
| **total ids** | **163** |

"REASON CITED, NOT BUILT": competitor rows the lane left out with a reason that is a lane choice, not an AL_SCOPE F/O decision (C-LS-22 Ctrl+K command menu, C-LS-33 List-view reorder). No id is NOT REPLAYED.

## Findings (every id in the 67 L5 AL rows)

| finding id | AL row | verdict | conditions replayed | evidence (what I did and saw) |
|---|---|---|---|---|
| D-170 | AL-CHECKLIST-001 | OWNER DECISION | 410×700 Light | Sticky header + menu at ~410 px are the protected top bar/layout (O6, F). Honest parts: header numbers are labelled ("0 of 3 planets today", img "0-day streak"); duplicates are "(2)" in names (LS-069). |
| D-086 | AL-CHECKLIST-001 | CHANGED | 375 fresh | Numbers are labelled (streak img "0-day streak", "n of N planets today") and duplicates get "(2)" in names; but one thing still has several words: header "planets", heat map "items", orbit "complete". |
| D-020 | AL-CHECKLIST-001 | FIXED | 375 fresh | Heat map opens with a legend list "Nothing · Some orbits · All orbits" and day lines ("4 Nov 2026: Some orbits — 1 of 2 items done so far"); How it works explains "Perfect orbit: every planet in path order." |
| D-021 | AL-CHECKLIST-001 | FIXED | 375 fresh | The side tiles sit in a group "Quick timers", each named with its purpose ("Sleep: No goal set · tap at bedtime. Tap to start"). |
| LS-008 | AL-CHECKLIST-002 | FIXED | C | Ticked own item "Stretch 5 min" (1 of 21) → Edit path → Change → Make this a habit → "…is now a habit, daily, on Habits. Its dot stays here, done for today." Planet "Stretch 5 min: done", header still 1 of 21, Habits card "1 / 1 ✓ Done". |
| LC-016 | AL-CHECKLIST-002 | FIXED | C | Ticked own item "Stretch 5 min" (1 of 21) → Edit path → Change → Make this a habit → "…is now a habit, daily, on Habits. Its dot stays here, done for today." Planet "Stretch 5 min: done", header still 1 of 21, Habits card "1 / 1 ✓ Done". |
| LS-007 | AL-CHECKLIST-003 | FIXED | C | Weigh in on the path, no weigh-in ever: the List view has no "+70 kg" chip (only "Log 250 ml for Water"); the path stepper opens empty; nothing stored in Health weights. |
| PR-017 | AL-CHECKLIST-004 | FIXED | Sc | Checklist Focus tile "Focus: Read. Paused · 25:00. Tap to start" → tap → "Focus resumed: Read. Undo", tile "running"; tap again → "Read: 25 minutes of focus logged on Habits. Undo". No "Not saved. Try again." |
| PR-071 | AL-CHECKLIST-005 | OWNER DECISION | 1280 fresh | O6: the Checklist is the daily routine, Todoist level is Tasks (built, see C-LS-*). Honest part done: the orbit Quick add says "This adds a habit to your path; it lives on Habits, where you can delete it for good. A one-off to-do belongs in Tasks."; How it works explains Checklist vs Tasks. |
| C-PR-01 | AL-CHECKLIST-005 | OWNER DECISION | 1280 fresh | O6: the Checklist is the daily routine, Todoist level is Tasks (built, see C-LS-*). Honest part done: the orbit Quick add says "This adds a habit to your path; it lives on Habits, where you can delete it for good. A one-off to-do belongs in Tasks."; How it works explains Checklist vs Tasks. |
| N-PR-01 | AL-CHECKLIST-005 | OWNER DECISION | 1280 fresh | O6: the Checklist is the daily routine, Todoist level is Tasks (built, see C-LS-*). Honest part done: the orbit Quick add says "This adds a habit to your path; it lives on Habits, where you can delete it for good. A one-off to-do belongs in Tasks."; How it works explains Checklist vs Tasks. |
| C-DVG-78 | AL-COPY-046 | FIXED | C | Task "Post the letter today" (Tasks) → Checklist List view shows region "Tasks due today · Open Tasks → · From your to-do list. The Checklist is your daily routine; one-off to-dos live in Tasks." How it works: "Checklist or Tasks? … One-off to-dos with a day, a repeat or a project live in Tasks". Lists/sub-items/dates/priorities/reminders live in Tasks (O6). |
| LS-074 | AL-COPY-046 | FIXED | C | Task "Post the letter today" (Tasks) → Checklist List view shows region "Tasks due today · Open Tasks → · From your to-do list. The Checklist is your daily routine; one-off to-dos live in Tasks." How it works: "Checklist or Tasks? … One-off to-dos with a day, a repeat or a project live in Tasks". Lists/sub-items/dates/priorities/reminders live in Tasks (O6). |
| LS-H13 | AL-COPY-046 | FIXED | C | Task "Post the letter today" (Tasks) → Checklist List view shows region "Tasks due today · Open Tasks → · From your to-do list. The Checklist is your daily routine; one-off to-dos live in Tasks." How it works: "Checklist or Tasks? … One-off to-dos with a day, a repeat or a project live in Tasks". Lists/sub-items/dates/priorities/reminders live in Tasks (O6). |
| C-LS-29 | AL-COPY-046 | FIXED | C | Task "Post the letter today" (Tasks) → Checklist List view shows region "Tasks due today · Open Tasks → · From your to-do list. The Checklist is your daily routine; one-off to-dos live in Tasks." How it works: "Checklist or Tasks? … One-off to-dos with a day, a repeat or a project live in Tasks". Lists/sub-items/dates/priorities/reminders live in Tasks (O6). |
| C-LS-30 | AL-COPY-046 | FIXED | C | Task "Post the letter today" (Tasks) → Checklist List view shows region "Tasks due today · Open Tasks → · From your to-do list. The Checklist is your daily routine; one-off to-dos live in Tasks." How it works: "Checklist or Tasks? … One-off to-dos with a day, a repeat or a project live in Tasks". Lists/sub-items/dates/priorities/reminders live in Tasks (O6). |
| C-LS-31 | AL-COPY-046 | FIXED | C | Task "Post the letter today" (Tasks) → Checklist List view shows region "Tasks due today · Open Tasks → · From your to-do list. The Checklist is your daily routine; one-off to-dos live in Tasks." How it works: "Checklist or Tasks? … One-off to-dos with a day, a repeat or a project live in Tasks". Lists/sub-items/dates/priorities/reminders live in Tasks (O6). |
| LA-022 | AL-NUMBERS-SOURCE-013 | STILL OPEN | 1280 fresh, Lisbon-AI state 2 (UI) | Habits Stretch 5 min (14:00), Read 10 pages (19:00), Drink water; tasks Pick up parcel today 18:00, Team dinner Fri 19:30, Call the dentist (done); the Agenda week shows the tasks. Both NOVA (Ctrl+J) and ZIGi (Ctrl+K), "What's on my agenda this week?" → "On your agenda this week: 4 Nov 2026: Drink water, Read 10 pages, Stretch 5 min …": habits only, no task. |
| LA-023 | AL-NUMBERS-SOURCE-013 | FIXED | 1280 fresh, state 2 | NOVA dashboard Agenda clock: "14:00 Stretch 5 min next · 18:00 Pick up parcel later · 19:00 Read 10 pages later", by time across habits and tasks, with times; "Today’s agenda" lists each with its time. |
| LS:st2-h | AL-NUMBERS-SOURCE-013 | STILL OPEN | 1280 fresh, Lisbon-AI state 2 (UI) | Habits Stretch 5 min (14:00), Read 10 pages (19:00), Drink water; tasks Pick up parcel today 18:00, Team dinner Fri 19:30, Call the dentist (done); the Agenda week shows the tasks. Both NOVA (Ctrl+J) and ZIGi (Ctrl+K), "What's on my agenda this week?" → "On your agenda this week: 4 Nov 2026: Drink water, Read 10 pages, Stretch 5 min …": habits only, no task. |
| DV-163b | AL-QUICK-ADD-003 | FIXED | Q | Quick add menu now has a "Task · A to-do with a day, a repeat or a project" tile; a to-do line previews and adds a task (see LS-004). |
| LS-004 | AL-QUICK-ADD-003 | FIXED | Q | "call mom tomorrow at 5pm" → Preview "Will add a task: “call mom” · Thu 5 Nov · 17:00 … Not a log"; Add task → toast "Task added … Undo", stored due 2026-11-05 17:00. "task buy milk", "todo: renew passport friday", "buy milk tomorrow", "call the dentist friday p1" all preview a task; no food log. |
| C-LS-27 | AL-QUICK-ADD-003 | FIXED | Q | Quick add menu now has a "Task · A to-do with a day, a repeat or a project" tile; a to-do line previews and adds a task (see LS-004). |
| N-LS-03 | AL-QUICK-ADD-003 | FIXED | Q | Fallback hint now ends "A to-do starts with “task” (task: call the bank tomorrow)." ("xyzzy plugh", "add to checklist: floss"). |
| DV-165 | AL-TASKS-FEATURE-001 | FIXED | T | Repeats ("every weekday", "every month on the first Monday", "every! 3 days", "until 1 Dec", "for 5 times"), subtasks, natural dates, labels, sections and Move up/down all exist. |
| DV-166 | AL-TASKS-FEATURE-001 | FIXED | T | New-task Priority defaults to "P3 · Normal" (options P1 · High, P2 · Medium, P3 · Normal, P4 · Low). |
| LS-002 | AL-TASKS-FEATURE-002 | FIXED | T | More options: Priority P1–P4 (P3 · Normal default), Due, Time. Projects with 9 colours (+ Add a project), sections ("+ Add a section", rename/remove), List/Board layout, Rename/Archive/Remove project, labels (@outside view), saved filter "p2 & @outside", bulk "Move to" a project. |
| LS-046 | AL-TASKS-FEATURE-002 | FIXED | T | More options: Priority P1–P4 (P3 · Normal default), Due, Time. Projects with 9 colours (+ Add a project), sections ("+ Add a section", rename/remove), List/Board layout, Rename/Archive/Remove project, labels (@outside view), saved filter "p2 & @outside", bulk "Move to" a project. |
| LS-071 | AL-TASKS-FEATURE-002 | FIXED | T | More options: Priority P1–P4 (P3 · Normal default), Due, Time. Projects with 9 colours (+ Add a project), sections ("+ Add a section", rename/remove), List/Board layout, Rename/Archive/Remove project, labels (@outside view), saved filter "p2 & @outside", bulk "Move to" a project. |
| LS-076 | AL-TASKS-FEATURE-002 | FIXED | T | More options: Priority P1–P4 (P3 · Normal default), Due, Time. Projects with 9 colours (+ Add a project), sections ("+ Add a section", rename/remove), List/Board layout, Rename/Archive/Remove project, labels (@outside view), saved filter "p2 & @outside", bulk "Move to" a project. |
| LS-H05 | AL-TASKS-FEATURE-002 | FIXED | T | More options: Priority P1–P4 (P3 · Normal default), Due, Time. Projects with 9 colours (+ Add a project), sections ("+ Add a section", rename/remove), List/Board layout, Rename/Archive/Remove project, labels (@outside view), saved filter "p2 & @outside", bulk "Move to" a project. |
| LS-H21 | AL-TASKS-FEATURE-002 | FIXED | T | More options: Priority P1–P4 (P3 · Normal default), Due, Time. Projects with 9 colours (+ Add a project), sections ("+ Add a section", rename/remove), List/Board layout, Rename/Archive/Remove project, labels (@outside view), saved filter "p2 & @outside", bulk "Move to" a project. |
| C-LS-02 | AL-TASKS-FEATURE-002 | FIXED | T | More options: Priority P1–P4 (P3 · Normal default), Due, Time. Projects with 9 colours (+ Add a project), sections ("+ Add a section", rename/remove), List/Board layout, Rename/Archive/Remove project, labels (@outside view), saved filter "p2 & @outside", bulk "Move to" a project. |
| C-LS-03 | AL-TASKS-FEATURE-002 | FIXED | T | More options: Priority P1–P4 (P3 · Normal default), Due, Time. Projects with 9 colours (+ Add a project), sections ("+ Add a section", rename/remove), List/Board layout, Rename/Archive/Remove project, labels (@outside view), saved filter "p2 & @outside", bulk "Move to" a project. |
| C-LS-04 | AL-TASKS-FEATURE-002 | FIXED | T | Row → "Add a subtask" → two subtasks; ticking one shows "1 of 2 subtasks done · ☑ 1/2"; stored with parentId. |
| C-LS-05 | AL-TASKS-FEATURE-002 | FIXED | T | More options: Priority P1–P4 (P3 · Normal default), Due, Time. Projects with 9 colours (+ Add a project), sections ("+ Add a section", rename/remove), List/Board layout, Rename/Archive/Remove project, labels (@outside view), saved filter "p2 & @outside", bulk "Move to" a project. |
| C-LS-06 | AL-TASKS-FEATURE-002 | FIXED | T | More options: Priority P1–P4 (P3 · Normal default), Due, Time. Projects with 9 colours (+ Add a project), sections ("+ Add a section", rename/remove), List/Board layout, Rename/Archive/Remove project, labels (@outside view), saved filter "p2 & @outside", bulk "Move to" a project. |
| C-LS-07 | AL-TASKS-FEATURE-002 | FIXED | T | Edit form has Notes; "Use the spade" saved and stored. |
| LS-003 | AL-TASKS-FEATURE-003 | FIXED | T | "Bin day every week today" → ↻ Every week; tick → "Done: “Bin day”. It comes back on its next day. Undo", due 11 Nov with the occurrence kept; Undo puts back 4 Nov; "Skip" → "moves to its next day. Undo". Rules typed: every weekday / month on the first Monday / every! 3 days / until 1 Dec / for 5 times / every 2 weeks / every year all read. |
| C-LS-08 | AL-TASKS-FEATURE-003 | CHANGED | T | Weekday, monthly by date and nth weekday, after completion (every!), end date and count all work, and Skip = this occurrence. Missing: editing a repeating task never asks "this one / all future" (renaming "Bin day" changed the series with no prompt). |
| C-DVG-80 | AL-TASKS-FEATURE-004 | FIXED | T | Built in Tasks (O6): NL line with highlighted pieces (LS-001), filters with operators and saved filters, the ? shortcut sheet (LS-014). |
| LS-001 | AL-TASKS-FEATURE-004 | FIXED | T | Typed (keys) "Buy milk tomorrow at 5pm" → marks "tomorrow", "at 5pm", "Will add “Buy milk” · Thu 5 Nov · 17:00" with "Keep as text"; "Pay rent every month on the 1st p1" → 1 Dec, P1, repeat; "Email Bob #work @phone friday" → project work, label phone, Fri 6 Nov; "Renew passport next week !!" → Mon 9 Nov, P1. |
| LS-040 | AL-TASKS-FEATURE-004 | FIXED | Q | "ran 5k in 28 min on monday" → "Quick add logs for today or yesterday. For an earlier day, open the page…": the weekday is no longer dropped silently. |
| C-LS-01 | AL-TASKS-FEATURE-004 | FIXED | T | Typed (keys) "Buy milk tomorrow at 5pm" → marks "tomorrow", "at 5pm", "Will add “Buy milk” · Thu 5 Nov · 17:00" with "Keep as text"; "Pay rent every month on the 1st p1" → 1 Dec, P1, repeat; "Email Bob #work @phone friday" → project work, label phone, Fri 6 Nov; "Renew passport next week !!" → Mon 9 Nov, P1. |
| C-LS-26 | AL-TASKS-FEATURE-004 | FIXED | T | Typed (keys) "Buy milk tomorrow at 5pm" → marks "tomorrow", "at 5pm", "Will add “Buy milk” · Thu 5 Nov · 17:00" with "Keep as text"; "Pay rent every month on the 1st p1" → 1 Dec, P1, repeat; "Email Bob #work @phone friday" → project work, label phone, Fri 6 Nov; "Renew passport next week !!" → Mon 9 Nov, P1. |
| LS-014 | AL-TASKS-FEATURE-005 | CHANGED | T | q/n/a/? now work (see LS-044) and Esc closes the inline editor once. Still: "/" Search needs Esc twice (first Esc leaves the Search dialog open with the cursor in it; the second closes it). |
| LS-044 | AL-TASKS-FEATURE-005 | FIXED | T | "?" opens "Keyboard shortcuts" (not Search; lists Ctrl/⌘+K = ZIGi, / = Search), Esc closes it; q / n / a put the cursor in the add field; j/j/k move focus; 1 → P1; e → done; Ctrl+Z undoes; t / Shift+T due today/tomorrow; Delete removes with Undo; g t → Today. |
| LS-H09 | AL-TASKS-FEATURE-005 | FIXED | T | Esc in the edit form closes it; the title is unchanged. |
| LS-H25 | AL-TASKS-FEATURE-005 | FIXED | T | "?" opens "Keyboard shortcuts" (not Search; lists Ctrl/⌘+K = ZIGi, / = Search), Esc closes it; q / n / a put the cursor in the add field; j/j/k move focus; 1 → P1; e → done; Ctrl+Z undoes; t / Shift+T due today/tomorrow; Delete removes with Undo; g t → Today. |
| LS-H36 | AL-TASKS-FEATURE-005 | STILL OPEN | T | Ctrl+K on /app/tasks still opens ZIGi (panel content after ~0.5 s, no crash), not a command palette or search. The ? sheet now says "Ctrl/⌘+K Open ZIGi", which the AL row accepts, but that is a lane choice, not an F/O decision. The loading-state part is L7's. |
| C-LS-21 | AL-TASKS-FEATURE-005 | FIXED | T | "?" opens "Keyboard shortcuts" (not Search; lists Ctrl/⌘+K = ZIGi, / = Search), Esc closes it; q / n / a put the cursor in the add field; j/j/k move focus; 1 → P1; e → done; Ctrl+Z undoes; t / Shift+T due today/tomorrow; Delete removes with Undo; g t → Today. |
| C-LS-22 | AL-TASKS-FEATURE-005 | REASON CITED, NOT BUILT | T | No command menu on Ctrl/⌘+K (it opens ZIGi); "/" opens the global Search, which finds tasks. The AL row keeps Ctrl+K = ZIGi; not an F/O decision. |
| LS-H22 | AL-TASKS-FEATURE-006 | CHANGED | T | Move up / Move down buttons and Alt+↑/↓ reorder (worked). Mouse drag of a row does not: in Inbox, "Alpha" dragged onto the third row (Playwright dragTo on the row, on the title, and a slow manual pointer drag; 3 attempts on 2 runs) left the order unchanged, while the same drag method moves a task between days on the Agenda. |
| C-LS-16 | AL-TASKS-FEATURE-006 | CHANGED | T | Move up / Move down buttons and Alt+↑/↓ reorder (worked). Mouse drag of a row does not: in Inbox, "Alpha" dragged onto the third row (Playwright dragTo on the row, on the title, and a slow manual pointer drag; 3 attempts on 2 runs) left the order unchanged, while the same drag method moves a task between days on the Agenda. |
| C-LS-17 | AL-TASKS-FEATURE-006 | FIXED | A | Agenda Week: drag "Buy book" (Thu) onto Sat 7 Nov → stored due 2026-11-07. |
| C-LS-18 | AL-TASKS-FEATURE-006 | FIXED | A | Agenda Day → "Move “Dentist” to another day or time" → form Day + Time → 15:00 → stored time 15:00 (time-block by form; no drag on a time grid). |
| DV-164 | AL-TASKS-FEATURE-007 | FIXED | T | More options → Due 2026-11-03 → "A past day: it shows as overdue." → added, listed "Overdue · …"; 2026-10-01 too (DV-164, also from a goal's Next actions). No min on the date field. |
| LS-012 | AL-TASKS-FEATURE-007 | FIXED | T | More options → Due 2026-11-03 → "A past day: it shows as overdue." → added, listed "Overdue · …"; 2026-10-01 too (DV-164, also from a goal's Next actions). No min on the date field. |
| LS-H40 | AL-TASKS-FEATURE-007 | FIXED | T | More options → Due 2026-11-03 → "A past day: it shows as overdue." → added, listed "Overdue · …"; 2026-10-01 too (DV-164, also from a goal's Next actions). No min on the date field. |
| C-LS-28 | AL-TASKS-FEATURE-007 | FIXED | T | More options → Due 2026-11-03 → "A past day: it shows as overdue." → added, listed "Overdue · …"; 2026-10-01 too (DV-164, also from a goal's Next actions). No min on the date field. |
| C-LA-08 | AL-TASKS-FEATURE-007 | FIXED | T | Overdue tasks are listed under "Overdue"; bulk bar offers "Due today / Due tomorrow" for selected (reschedule overdue); t / Shift+T keys. |
| PR-104 | AL-TASKS-FEATURE-007 | FIXED | Sc | Tasks → More options → Due 2026-11-01 → added; listed "Overdue 2 … Showcase late task · Overdue · 1 Nov". |
| LS-H11 | AL-TASKS-FEATURE-008 | FIXED | T | Pomodoro on "Sort photos", End the run after 2 min → "Run ended. 0 blocks grown, 1 withered and kept (the time you did focus counts)… “Sort photos” stays open: a run ended early does not mark it done." |
| LS-H20 | AL-TASKS-FEATURE-008 | FIXED | T | Focus on "Call plumber": Focus block 5 min, Blocks 1, "Mark … done when the run finishes" on, Start; at the block end: "Every block is done (1 block grown). This is your long break; “Call plumber” is marked done when it ends. Finish now and mark “Call plumber” done". After the break: "Run finished… Marked “Call plumber” done. Undo is in the message", task done, Activity "Call plumber · Done". A 5-minute block exists (no 1-minute one). |
| PR-103 | AL-TASKS-FEATURE-009 | CHANGED | Sc | Day Timeline now lists "10:30 Example · Book the dentist · Task". Today (Showcase, 1280) still shows no task anywhere: no "dentist", no tasks card among its 40 headings. |
| N-PR-08 | AL-TASKS-FEATURE-009 | STILL OPEN | Sc | /app/review ("Last 7 days" and "This month"): the word "task" does not appear on the page (4,660 characters); no tasks section. |
| LS-017 | AL-CHECKLIST-006 | CHANGED | C | Own-item field now says "Up to 60 characters · n of 60 items" (typing 70 stops at 60 with no other word). Path labels still one word ("Stretch", "Бег 2", "Journal"); labels are O6-protected, honest part as in LS-053. |
| LS-053 | AL-CHECKLIST-006 | CHANGED | C | No markup fragment any more ("<i>x</i> & \"q\"" → "Q"), "QA Floss" → "Floss", "QA Task 1" → "Task 1". Still: "0" and "-5" both "Step", "QA Stretch" and "QA Stretch (2)" both "Stretch", own "Floss teeth" and habit "QA Floss" both "Floss", 120×M → "MMMMMMMMMMMM" with no ellipsis. Only the accessible names differ. |
| LC-008 | AL-CHECKLIST-006 | OWNER DECISION | C | Path labels are still first/meaningful word. O6 keeps the Checklist's labels; the markup part is fixed (see LS-053). |
| PR-031 | AL-CHECKLIST-006 | CHANGED | C | "QA test item" now reads "Test" on the path (no longer "QA"), still one word; in the Showcase "Read: 30 minutes" and "Read ten pages" both read "Read". Labels themselves are protected (O6); the honest part (keep the distinguishing part) is only partly there. |
| PR-069 | AL-CHECKLIST-006 | FIXED | C | Habits "QA Task 1/2/3" on the path read "Task 1", "Task 2", "Task 3" (distinct). |
| LS-026 | AL-CHECKLIST-007 | FIXED | C | Orbits Extra 1/2 added, Remove the Evening orbit → asks "Move its 3 items to [Anytime ▾] · Remove orbit · Keep it" (Anytime preselected) → toast "Evening orbit removed; its items moved to Anytime. Undo"; items stored in anytime. |
| LS-063 | AL-CHECKLIST-008 | FIXED | C | Change Бег по утрам → Name field → "Бег по утрам 2" + Enter → stored and shown. |
| LS-055 | AL-CHECKLIST-009 | FIXED | C | Tick QA Floss, wait 20 s (toast gone), tap again → panel "Done at 03:31 · 1 time … Undo this tick · Open Habits · Close" → Undo this tick → "QA Floss: not done yet". |
| LS-H16 | AL-CHECKLIST-009 | FIXED | C | Tick QA Floss, wait 20 s (toast gone), tap again → panel "Done at 03:31 · 1 time … Undo this tick · Open Habits · Close" → Undo this tick → "QA Floss: not done yet". |
| LS-H26 | AL-CHECKLIST-009 | STILL OPEN | C | Same as the bot saw: a second tap opens the "Done at… / Undo this tick" panel instead of un-ticking (own items un-tick on a second tap); after "Undo this tick" no toast or Undo shows. |
| C-DVG-79 | AL-CHECKLIST-010 | FIXED | C, clock 3 → 4 Nov | Catch up yesterday: "Done yesterday" on a habit row in the List view, with Undo (see LS-032). |
| LS-032 | AL-CHECKLIST-010 | CHANGED | C, clock 3 → 4 Nov | Habit "QA Floss" made on 3 Nov; on 4 Nov List → More → "Done yesterday" → "QA Floss: done yesterday, on Habits. Undo" (entry 3 Nov; Undo removes it). But own items ("Floss teeth") have no way to fill yesterday, heat-map cells are still not interactive, only yesterday (not the last 7 days), and on a habit made today the button does nothing and says nothing. |
| C-LS-35 | AL-CHECKLIST-010 | CHANGED | C, clock 3 → 4 Nov | Only yesterday, only for habits (see LS-032); no "complete on a date" for other days or own items. |
| LS-H38 | AL-CHECKLIST-011 | FIXED | 1280 fresh | Options pressed as soon as it showed: the Options sheet opens with its content (View, accent, bell, nudges…); the page stays on Path ("Your path is empty"). |
| LS-H23 | AL-CHECKLIST-012 | CHANGED | C | Edit path mouse drag now lands on the drop slot (Weigh in → 5th place). The List view still has no reorder (0 draggable, no Move buttons): reorder only in Edit path. |
| C-LS-33 | AL-CHECKLIST-012 | REASON CITED, NOT BUILT | C | No drag or Move in the List view (0 draggable). Status: "List reorder = Edit path" — a lane choice, not an F/O decision. |
| PR-070 | AL-CHECKLIST-013 | FIXED | C, Sc | Edit path, ArrowUp on a handle: one place per press, focus kept, each press announced ("Alpha moved up." ×2, then "moved into Evening orbit."). Showcase: Meditate (Evening first) ×2 → into Afternoon, then above Walk (an orbit crossing counts as one place, and says so). |
| DV-141 | AL-COMPETITOR-GAP-126 | FIXED | DP | Health now has a mood group "Hard · Low · Okay · Good · Great" (a daily mood entry). The header quick actions are still Log weight / water / food, with no mood or sleep there. |
| N-DV-13 | AL-COMPETITOR-GAP-126 | FIXED | DP | Health now has a mood group "Hard · Low · Okay · Good · Great" (a daily mood entry). The header quick actions are still Log weight / water / food, with no mood or sleep there. |
| DV-190b | AL-COPY-047 | CHANGED | DP | Journal: energy 4 + entry → Save. The saved entry reads "Question for later: How did your body feel after moving today?" and Entries now comes right after Write. But the Write area then shows "ZIGI ASKS How did your body feel after moving today?" though ZIGi was never opened. |
| DV-190c | AL-COPY-047 | CHANGED | DP | The legend "Top: energy 1–5 · below: the day’s mood 1–5 · a dot means no check-in that day." now sits above the strip. Screen readers still hear ISO dates ("Mon · · 2026-11-02: no check-in"). |
| DV-191b | AL-COPY-047 | FIXED | DP | Typed by keyboard in "This day’s note": "Linking [[" → a listbox with "T9 Water · Habit" and "1 match to link. Up and down to choose, Enter to link." (An earlier run typing "[[T9" in one go showed no list; the second attempt, typing "[[" and then "T9", did.) |
| DV-191c | AL-COPY-047 | FIXED | DP | Water logged through Quick add (250 ml) → Notes "This day" reads "Water 250 ml logged · Health" (no "1 drink"). |
| DV-258b | AL-COPY-047 | FIXED | 388 Dark | Notes lede now "Capture now, file later. Journal is how the day felt; a note is anything you want to keep. Private, on this device." (the bot's own wording). |
| DV-270 | AL-COPY-047 | FIXED | 768 Light | Journal lede "…your energy, and an optional question to come back to."; help shows "[[" and the example "[[Run a 10k]]" as code. |
| N-DV-07 | AL-COPY-047 | STILL OPEN | 388×844 Dark | Notes at 388: the Capture box is at y 336 and the tabs (Today · Inbox · Notes · Days · Graph · Files) at y 1,770 on an 844 px screen, so not in the first screen (screenshot n-dv-07-notes-388-dark.png). The tabs come first only in the reading order. |
| DV-193 | AL-COPY-048 | FIXED | A | Week 2–8 Nov: each day reads "Any time · 4 habits (0 done)" in one row; the tasks stand out ("09:30 Buy book · Task · High priority"). |
| DV-194 | AL-COPY-048 | FIXED | A | Month: legend "Habits Health Goals Money Tasks and events · the number is how many items that day"; grid 858 px wide in a 1280 window (was ~590); cell name "Thu, 5 Nov 2026: 1 task · 4 habits"; the filter is a visible "Show: everything · Choose kinds" control. |
| LS-H28 | AL-COPY-049 | FIXED | 1280 fresh | Quick add says "More repeat options (every other day, 3 times a week, monthly) are on Habits." |
| PR-085 | AL-COUNTS-010 | FIXED | Sc | Showcase path 2 of 5 (Evening 0 of 2, Meditate and "Read ten pages" open): the finale reads "All planets lit (not reached yet)"; the summary says "2 of 5 planets today". |
| LS-011 | AL-DATES-007 | FIXED | T 22:50 | Clock 22:50, typed "Late call today 23:00", "Day task today", "Next task tomorrow". No reload: 23:10 → "Overdue 1 · Late · today at 23:00"; 00:10 → "Overdue 2 … Overdue · 4 Nov at 23:00", header "3 tasks · 2 overdue". |
| LS-065 | AL-DATES-007 | FIXED | T 22:50 | Clock 22:50, typed "Late call today 23:00", "Day task today", "Next task tomorrow". No reload: 23:10 → "Overdue 1 · Late · today at 23:00"; 00:10 → "Overdue 2 … Overdue · 4 Nov at 23:00", header "3 tasks · 2 overdue". |
| LS-029 | AL-FIELD-ERROR-012 | FIXED | C | Blank rename of Anytime → "An orbit needs a name, so it keeps “Anytime”." (the old name comes back with a reason). |
| LS-062 | AL-FIELD-ERROR-012 | FIXED | C | Duplicate own item → alert "“Floss teeth” is already on your path."; two spaces → "Type what to do first." No "Not saved on this device". (Add stays enabled but answers with the message.) |
| LS-068 | AL-FIELD-ERROR-012 | FIXED | C | 53 own items added one by one: at 60 items "Your path holds up to 60 items. Remove one first." (hint "Up to 60 characters · n of 60 items" visible all along); 60 stored, no "Not saved". |
| LS-009 | AL-IMPORT-EXPORT-005 | FIXED | A | Choose what to export → "What goes in: Tasks 2 · Habits 20 …"; the .ics has SUMMARY:Dentist and SUMMARY:Buy book (as events). |
| LS-010 | AL-IMPORT-EXPORT-005 | FIXED | A | Import ls_test.ics (2 VEVENT + 1 VTODO) → "2 events to add … 1 to-do in this file is not an event: add them to Tasks, or they are left out." → "Add 1 to-do to Tasks" → "Imported todo" in Tasks. |
| C-LS-23 | AL-IMPORT-EXPORT-005 | FIXED | A | Tasks → Import / export: a Todoist CSV → "2 tasks to add from Todoist, into “Home”" → project Home, section Kitchen, P1, @diy, notes, monthly repeat, a subtask at 17:00 tomorrow; a TickTick CSV → "1 task … into “Errands”" with label, notes, priority. |
| C-LS-24 | AL-IMPORT-EXPORT-005 | FIXED | A | ICS export includes tasks (LS-009) and a VTODO import goes to Tasks (LS-010). |
| LS-030 | AL-PERF-006 | FIXED | 375, CPU 4×, 500 tasks (injected, as the bot) | 100 rows drawn with "Show 117 more" / "Show 283 more"; 2,732 DOM nodes (was 6,793); tick → next frame 192 ms (was 284 ms). |
| LS-067 | AL-PERF-007 | STILL OPEN | 375 fresh, cold load | /app/tasks cold: 117 requests, 2.2 MB transferred (5.2 MB decoded, 2.8 MB of it JS). Lighter than the bot's 3.3–5.0 MB but more than twice the < 1 MB target in the row. Status: needs another lane (integrator). |
| LS-013 | AL-PERSISTENCE-009 | CHANGED | T, offline | First session: add a task, go offline, reload /app/tasks → works ("You’re offline. This page keeps working…"); /app/checklist works. /app/agenda opened offline before it was ever visited → the shell with "This page could not be shown." although /app/agenda is in the install cache list. After one online visit, Agenda works offline (reload and new tab). |
| LS-022 | AL-PERSISTENCE-010 | FIXED | T (injected store, as the bot) | 1,000 tasks → alert "We couldn’t read your tasks on this device … 500 tasks of 1,000 can still be read" with Save a copy / Keep the 500; "{not json" → same alert, a new add says "could not be read, so nothing was changed", raw bytes kept. |
| D-244 | AL-QUICK-ADD-004 | FIXED | Q | "saved 50 euro for the holiday" / "add 100 to emergency fund" → "YOUR PLAN, FROM YOUR WORDS" goal cards; food lines ("ate an apple") → food card. No generic "didn't understand". |
| D-072 | AL-QUICK-ADD-004 | FIXED | Q | Empty line: Preview disabled with the visible text "Type a line to preview it."; food ("had a banana for breakfast") and negative ("weight -5") lines are understood/answered. |
| LS-038 | AL-QUICK-ADD-005 | CHANGED | C + variant | Bot condition (Health Meditate on the path): "meditated…" now explains "Meditation is logged on Health › Mind (or with the Checklist’s Meditate tile). To log it here, make a “Meditate” habit." — nothing logged. Variant with a "Meditate" habit: "meditated" → "+1 time" (good) but "meditated 15 minutes" → "Meditate · +15 times" (minutes read as check-ins) and "15 min meditation" is not matched. |
| LS-039 | AL-QUICK-ADD-005 | FIXED | Q | Habit "Journal 3 lines" (UI) → "did journal 3 lines" previews "+1 time · today"; Save → "Saved: Journal 3 lines · 1 of 1 time today · Undo"; stored count 1. |
| PR-105 | AL-SEARCH-004 | FIXED | Sc | Notes → Notes → search "zzzz" → "0 results · No note has those words." and the note list is gone (0 lists). |
| LS-037 | AL-TASKS-FEATURE-010 | CHANGED | T, clock 3 Oct → 10 Oct → 4 Nov | Finished "Old finished task" on 3 Oct and "Recent…" on 10 Oct (UI, clock), opened Completed on 4 Nov: the heading is now "Completed" (no "last 30 days"), but the 32-day-old task is still listed right above the line "Finished tasks are kept 30 days, then they leave this device’s list"; no "Show all completed". |
| LS-045 | AL-TASKS-FEATURE-010 | FIXED | T | ?view=board shows a Board; ?view=today/upcoming/overdue/completed/priority:1 honoured; ?view=calendar → Upcoming (by day); Agenda is the calendar. /app/calendar, /board, /filters, /projects, /labels still 404 (views live under /app/tasks). |
| C-LS-10 | AL-TASKS-FEATURE-010 | FIXED | T | Filter box with operators (#project, @label, p1–p4, today, overdue, due:, &, |, !) and "Save this filter as" → saved filter in the nav. |
| C-LS-13 | AL-TASKS-FEATURE-010 | FIXED | T | ?view=board shows a Board; ?view=today/upcoming/overdue/completed/priority:1 honoured; ?view=calendar → Upcoming (by day); Agenda is the calendar. /app/calendar, /board, /filters, /projects, /labels still 404 (views live under /app/tasks). |
| C-LS-14 | AL-TASKS-FEATURE-010 | FIXED | T | ?view=board shows a Board; ?view=today/upcoming/overdue/completed/priority:1 honoured; ?view=calendar → Upcoming (by day); Agenda is the calendar. /app/calendar, /board, /filters, /projects, /labels still 404 (views live under /app/tasks). |
| C-LS-15 | AL-TASKS-FEATURE-010 | FIXED | T | Completed view lists finished tasks with "Mark … not done" (restore) and Clear done with Undo. |
| LS-061 | AL-TASKS-FEATURE-011 | FIXED | T | Select one + Shift-click the third → toolbar "3 selected · Select all · Done · Priority · Due · Move to · Remove"; Done → "Done: 3 tasks. Undo"; Completed → "Clear done (3)" → "Cleared 3 finished tasks. Undo" → Undo restores 16. |
| C-LS-19 | AL-TASKS-FEATURE-011 | FIXED | T | Select one + Shift-click the third → toolbar "3 selected · Select all · Done · Priority · Due · Move to · Remove"; Done → "Done: 3 tasks. Undo"; Completed → "Clear done (3)" → "Cleared 3 finished tasks. Undo" → Undo restores 16. |
| LS-048 | AL-TASKS-FEATURE-012 | FIXED | T, 2 tabs | Tab A edits "Call plumber"; tab B renames it "Call plumber B" and saves; A's Save is refused with "This task was changed in another tab or by an assistant while you edited it." (B's title kept). |
| C-LS-25 | AL-TASKS-FEATURE-012 | OWNER DECISION | code + T | Cross-device sync needs a ZIGoals server: AL_SCOPE F ("anything needing a ZIGoals server for people's data: not now"). Honest part: "changed in another tab" notice (LS-048). |
| LS-018 | AL-TOAST-008 | FIXED | C | Edit path open → Take “Floss teeth” off → the toast's Undo is clickable over the sheet; the item is back. |
| LS-059 | AL-TOAST-008 | FIXED | C | Edit path open → Take “Floss teeth” off → the toast's Undo is clickable over the sheet; the item is back. |
| NB-093 | AL-TOAST-008 | STILL OPEN | 1440×1013 fresh | Customize Today → Add widget → Sleep → Save → "Options for Sleep": the menu is cut at the card edge after "Move earlier" (Move later, Move to rail and Remove widget are hidden under the card; the card has overflow:hidden). Screenshot nb-093-sleep-menu-1440.png. |
| NB-193 | AL-TOAST-008 | FIXED | 1440×1013 fresh | Customize Today → Add widget → Sleep → Save → Options for Sleep → Remove widget → toast "Widget removed… Undo" at y 835–901, above the Arrange bar (y 921) → Undo clicked → "Put back on Today." |
| NB-228 | AL-TOAST-008 | FIXED | 1440×1013 fresh | Customize Today → Add widget → Sleep → Save → Options for Sleep → Remove widget → toast "Widget removed… Undo" at y 835–901, above the Arrange bar (y 921) → Undo clicked → "Put back on Today." |
| LS-023 | AL-A11Y-017 | FIXED | 375 Light fresh | Agenda Day, task "Dentist": the tick box is 24×24 px inside a 44×44 px target (html data-theme=light). |
| LS-073 | AL-A11Y-018 | FIXED | T | Arabic title "مهمة عربية RTL" row title has dir="auto". |
| N-LS-06 | AL-A11Y-018 | FIXED | C | Checklist List view: item names carry dir="auto" (10 such nodes with Hebrew, Russian and Latin names). |
| LS-H45 | AL-A11Y-019 | FIXED | T | Focused row: 3 px solid outline rgb(35,234,255) on rgb(2,9,24) (far above 3:1); the add field 3 px rgb(105,217,233). |
| C-DVG-75 | AL-CHECKLIST-014 | FIXED | C | More → "Skip today" → "QA Vitamins: skipped today, on Habits. Undo". |
| LS-019 | AL-CHECKLIST-014 | CHANGED | C | List → More for habit "QA Vitamins": Orbit select, Done yesterday, Skip today, Take off the path. Own items also get Name + Rename. A habit still cannot be renamed here (the row asks for rename too). |
| LC-005 | AL-CHECKLIST-014 | CHANGED | C | List → More for habit "QA Vitamins": Orbit select, Done yesterday, Skip today, Take off the path. Own items also get Name + Rename. A habit still cannot be renamed here (the row asks for rename too). |
| C-LS-32 | AL-CHECKLIST-014 | FIXED | C | More → "Skip today" → "QA Vitamins: skipped today, on Habits. Undo". |
| LS-054 | AL-CHECKLIST-015 | FIXED | C | Habits → create "QA Stretch" again → "You already have a habit called “QA Stretch”. Saving makes a second one; pick another name to tell them apart." + "Create it anyway". |
| LS-069 | AL-CHECKLIST-015 | FIXED | C | The second one is "QA Stretch (2)" in Edit path and in the planet's accessible name ("QA Stretch (2): not done yet"); the visible path label stays "Stretch" for both (labels protected, O6). |
| C-LS-36 | AL-CHECKLIST-015 | FIXED | C | Habits → create "QA Stretch" again → "You already have a habit called “QA Stretch”. Saving makes a second one; pick another name to tell them apart." + "Create it anyway". |
| LS-027 | AL-COPY-050 | FIXED | C | Buttons read "Remove the Morning orbit", "Remove the Sunrise orbit" (after a rename): no "orbit orbit". |
| LS-028 | AL-COPY-050 | OWNER DECISION | C | Edit path keeps "Sunrise" as typed; the path banner shows "☀ Sunrise Orbit". The banners are the protected orbit path (O6 "path, river, labels, top bar, layout"; F PROTECTED). |
| PR-107 | AL-COPY-051 | FIXED | Sc | Inbox → Edit “Ask about the rail pass price in March” → the open note is headed "Inbox capture · 4 Nov 2026 · Showcase example" and its text appears once (not as heading and body). |
| LS-057 | AL-FIELD-ERROR-013 | FIXED | C | Water stepper: "abc" → button "Log" + "Enter a number, like 1500 or 0.5. Choose 1 to 5,000 ml."; "-5" → "Log" + "Enter a number that is not negative."; empty → "Log"; "250" → "Log 250 ml". Weigh in the same (20 to 400 kg). |
| LS-049 | AL-FIELD-ERROR-014 | FIXED | T | Three spaces + Enter → alert "Type a task first.", field cleared, aria-invalid=true. |
| LS-052 | AL-FIELD-ERROR-014 | FIXED | T | Edit “Buy milk”, title "   ", Enter → alert "A task needs a title." tied by aria-describedby; form stays open, title unchanged. |
| LS-042 | AL-FIELD-ERROR-015 | FIXED | Q | "weight -5" → "Use a number above zero." (same as "weight 0"). |
| LS-H15 | AL-PERF-008 | FIXED | 1280 fresh | Quick add to your Checklist → form in 409 ms ("Opening quick add…" flashes briefly), not 2–3 s. |
| LS-021 | AL-TASKS-FEATURE-013 | FIXED | 1920 fresh | Goal "Run a 10K" (wizard) → Next actions → add "Buy running shoes" → collapsed card reads "1 open task · Buy running shoes"; with an overdue one "2 open tasks · next: T9 Past due (overdue)". |
| LS-035 | AL-TASKS-FEATURE-014 | FIXED | 1280 fresh | Goal "Run a 10K" + next action "Buy running shoes" → Close goal → its Next actions: "This goal is closed. 1 open task still serves it. What should happen to it? Keep it linked · Unlink from this goal · Mark it done"; Tasks row "Goal · Run a 10K (closed)". |
| LS-H41 | AL-TASKS-FEATURE-015 | FIXED | T | More options open, Due 2026-11-03, Add → the panel stays open and Due keeps 2026-11-03 for the next task. |
| DV-257a | AL-THEME-001 | FIXED | 388 Dark | Journal energy circles: 2 px border color(srgb .76 .82 .90 / .58) on rgb(1,3,13) = 4.76:1 (≥ 3:1). |
| LS-020 | AL-THEME-002 | OWNER DECISION | 410 Light | Light still draws the dark path (labels rgb(255,255,255) on the dark islands): F "Light’s dark islands" PROTECTED. No contrast failure seen (labels white on the dark island). |
| LC-015 | AL-THEME-002 | OWNER DECISION | 410 Light | Light still draws the dark path (labels rgb(255,255,255) on the dark islands): F "Light’s dark islands" PROTECTED. No contrast failure seen (labels white on the dark island). |
| DV-192 | AL-TOAST-009 | FIXED | DP | Inbox → Delete a 79-character note → toast "“T9 note about the long walk to the harb…” deleted. Undo" (cut at 40). |
| N-LS-01 | AL-COPY-052 | FIXED | T | "+ Quick add" is visible in the desktop shell at 1280 and 1600. |
| N-LS-02 | AL-COPY-052 | FIXED | T | Empty header reads "Today none open" (no "Open 0 tasks"). |
| N-LS-08 | AL-COPY-052 | FIXED | T | Empty state: "Your list starts here · Type a few words above, like “Call the dentist tomorrow 10am”. Add a day, “every …”, p1–p4, #project or @label" (no goal field promised). |
| LC-003 | AL-COPY-053 | FIXED | C | Two distinct names now: planet "Meditate: not done yet" and tile "Meditate: Usually 10m. Tap to start" in the group "Quick timers". |
| C-DVG-73 | AL-COMPETITOR-GAP-127 | OWNER DECISION | code + UI | Cross-device sync of the list needs a ZIGoals server: AL_SCOPE F. How it works says "Your Checklist stays on this device … not synced yet". Honest part: the Checklist is in the readable export (checklist.csv, checklist-days.csv) — see the AL_SCOPE C check below. |
| C-DVG-74 | AL-COMPETITOR-GAP-128 | OWNER DECISION | code | A flexible day goal would change what lights the finale; AL_SCOPE F keeps "the footer finale" and the orbit path PROTECTED. Agreed. |
| C-DVG-76 | AL-COMPETITOR-GAP-129 | CHANGED | 375 fresh | Day Timeline → "Give it a time" 07:30, Every day → List row "QA Floss · Habit · at 07:30". A reminder time set on Habits ("Morning run", 07:30) is not shown on the row, and no next due date for non-daily habits. |
| C-LS-09 | AL-TASKS-FEATURE-016 | CHANGED | T 17:30 | Edit → Reminder "15 minutes before" (choices: at the time … 1 week before) → row "⏰ 15 minutes before"; at 17:46 Tasks shows region "Reminders · Call mum · 18:00 · Done · Dismiss". Today at 17:46 shows no reminder (only "Task added" in Recent activity), though the Tasks note says reminders show "here and on Today". Device push: owner step (notifications off). |

## AL_SCOPE section C — Tasks at Todoist/TickTick level, item by item

| # | item (AL_SCOPE C) | built and working? | evidence (replayed through the UI) |
|---|---|---|---|
| C1 | Projects with colours, sections | Yes | "+ Add a project" (9 colours), project view with "+ Add a section", Rename / Archive / Remove project (T). |
| C2 | Subtasks (nested, with progress) | Yes | "Add a subtask" ×2, one ticked → "1 of 2 subtasks done · ☑ 1/2" (T). |
| C3 | Priorities p1–p4 | Yes | P1 · High … P4 · Low; default P3 · Normal; "p1"/"!!" read from the line; keys 1–4 (T). |
| C4 | Labels | Yes | "@phone", "@outside" read; label view and Labels field in the editor (T). |
| C5 | Due dates and times, past dates (overdue, never silently refused) | Yes | Due 3 Nov / 1 Oct → "A past day: it shows as overdue." → Overdue group; also in Quick add ("Tue 3 Nov (overdue)") and in a goal's Next actions (T, Q, Sc). |
| C6 | Recurrence (day/weekday/week/N weeks/month day X or first Monday/year, every! N, end) | Yes, one gap | All rules read and roll forward with Undo; Skip = this occurrence. No "this one / all future" choice when editing a repeating task (C-LS-08). |
| C7 | Reminders (in-app now; push when the owner activates it) | Partly | Reminder offsets in the editor; at its time Tasks shows "Reminders · Call mum · 18:00 · Done · Dismiss". Today shows nothing (C-LS-09). Push: owner step. |
| C8 | Natural-language quick add in Tasks and the global Quick add | Yes, one gap | Tasks: highlighted pieces with "Keep as text". Global Quick add: "Pay rent every month on the 1st p1 #Home @bills" previews and adds a task with repeat, P1 and @bills, but **#Home is dropped**: no project in the preview, none in the store (the Tasks line makes the project). |
| C9 | The global Quick add recognises a to-do instead of logging food (LS-004) | Yes | "call mom tomorrow at 5pm" → task; no food card (Q). |
| C10 | Views: Inbox, Today, Upcoming, project list/board, labels, priority, overdue, completed with Undo | Yes | ?view= honoured, Board layout, Completed with "Mark … not done" and Clear done + Undo (T). |
| C11 | Filters | Yes | Operators + "Save this filter as" (T). |
| C12 | Global search finds tasks with simple operators (LS-005, LS-047) | Yes, one gap | "/" + "plumber", "p1", "#Home", "@bills", "milk & today" find the tasks; "Floss" finds the Checklist item. "today" on its own lists pages and Help, not today's tasks. |
| C13 | Keyboard shortcuts with a help sheet | Yes, one gap | "?" sheet, q/n/a, j/k, e, 1–4, t/T, x, Alt+↑↓, Delete, Ctrl+Z, g-keys. Search still needs Esc twice (LS-014). |
| C14 | Bulk actions | Yes | Shift-click range, toolbar Done / Priority / Due / Move to / Remove, Clear done with Undo (T). |
| C15 | Drag to reorder / move | Partly | Move up/down + Alt+↑↓ work; Agenda drag to a day works; **mouse drag of task rows does nothing** (LS-H22). Move to a project: bulk "Move to". |
| C16 | Notes per task | Yes | Notes field, saved (T). |
| C17 | Links to a goal, habit or health item | Yes | Editor has Goal (when goals exist), Habit and Health selects; a goal's Next actions adds linked tasks; closed goal offers Keep / Unlink / Mark done (T, 1280). |
| C18 | Import (Todoist CSV, TickTick CSV, .ics), export | Yes | Todoist CSV → project, section, subtask, labels, notes, repeat; TickTick CSV → list, tag, notes; .ics VTODO → Tasks; Export as CSV; .ics export has tasks (A). |
| C19 | Tasks and Checklist in the encrypted backup and the readable export, both restorable (LS-025, LS-064) | Yes | Encrypted backup preview lists "Tasks · Open tasks: 2 · Projects: 1" and "Checklist · Path items: 1"; both restore in a fresh context ("Selected module restored"; Floss back on the path; the Tasks Today view was empty, as neither task is due today — the task count after restore was not read). The Export everything ZIP has tasks.csv, checklist.csv, checklist-days.csv; Settings → Data offers Tasks and "Checklist path and favourites" with Leave / Merge / Replace. |
| C20 | ZIGi/NOVA read and propose tasks through confirm cards | Partly | ZIGi "add a task: call the dentist tomorrow at 10" → card "Task: Call the dentist · Due 5 Nov 2026 at 10:00 · Add the task / Edit / Dismiss" (on device, no AI). NOVA's "agenda this week" answer still leaves the tasks out (LA-022). |
| C21 | No crash when ZIGi or Ctrl+K opens on Tasks (LS-006, LS-043) | Yes (in this browser) | Ctrl+K on /app/tasks and /app opens ZIGi; no crash event, page alive (Chrome for Testing headless; the bot's crash was in headless Chromium). |

## STILL OPEN and CHANGED, with exact steps (for the lane)

Unless a line says otherwise: fresh context, Welcome marked seen, Brussels time, production build at c521574f.

**STILL OPEN**
1. **LA-022 / LS:st2-h (MAJOR) — the agenda answer leaves out tasks.**
   - Steps (1280): make habits Stretch 5 min (reminder 14:00), Read 10 pages (19:00) and Drink water. In Tasks, type "Pick up parcel today 18:00" and "Team dinner friday 19:30 p4".
   - Ctrl+J (NOVA) or Ctrl+K (ZIGi) → "What's on my agenda this week?"
   - Both answer "On your agenda this week: 4 Nov 2026: Drink water, Read 10 pages, Stretch 5 min …" with no task. The Agenda week shows both tasks.
   - `nextUp` feeds the NOVA dashboard (LA-023 FIXED) but not this answer.
2. **N-PR-08 (MAJOR) — no tasks in the Review.** Showcase → /app/review, "Last 7 days" or "This month": the page never mentions a task.
3. **LS-067 — the Tasks page is still heavy.** 375 cold load of /app/tasks: 117 requests, 2.2 MB transferred (5.2 MB decoded, 2.8 MB JS). The row's target is < 1 MB.
4. **LS-H36 — Ctrl+K opens ZIGi, not a command palette.** On /app/tasks, Ctrl+K opens ZIGi. The ? sheet documents it, but no F/O decision covers that. C-LS-22 (command menu) is not built for the same reason.
5. **LS-H26 — a second tap on a done habit planet does not un-tick it.**
   - Tap QA Floss (done), wait for the toast to go, tap again: the "Done at… · Undo this tick" panel opens.
   - Own items un-tick on a second tap.
   - After "Undo this tick" no toast or Undo shows.
6. **N-DV-07 — the Notes tabs are not on the first phone screen.** 388×844 Dark → /app/notes: the tabs are at y ≈ 1,770, below the capture box (y 336) and the day note. Screenshot `/tmp/claude-0/replay-L5/n-dv-07-notes-388-dark.png`.
7. **NB-093 — the widget menu is cut at the card edge.**
   - 1440×1013 → Customize Today → Add widget → Sleep → Save → Options for Sleep.
   - Ask ZIGi / Edit / Hide / Move earlier are visible. Move later, Move to rail and Remove widget are clipped by the card (overflow:hidden; the screen point returns the card, not the button).
   - Screenshot `/tmp/claude-0/replay-L5/nb-093-sleep-menu-1440.png`.
   - Its siblings NB-193/NB-228 (the Undo over the Arrange bar) are FIXED.

**CHANGED**
1. **LS-H22 / C-LS-16 — task rows cannot be dragged.**
   - Move up/down and Alt+↑/↓ work. A mouse drag of a task row (Inbox, "Alpha" onto the third row) never reorders it: 3 attempts in 2 runs.
   - The same drag moves a task between days on the Agenda.
   - Look at `pressRow` / `onPointerDown` on the draggable row in tasks-page.tsx.
2. **LS-014 — Search needs Esc twice.** All Tasks keys work (LS-044, LS-H25, C-LS-21 are FIXED), but "/" Search still needs two Esc presses: the first leaves the dialog open with the cursor in it.
3. **C-LS-08 — no "this one / all future" choice.** Editing a repeating task ("Bin day", every week) changes the whole series with no prompt. Skip covers "this time only".
4. **LS-037 — Completed shows a task older than 30 days.**
   - Finish a task on 3 Oct (clock), open Completed on 4 Nov.
   - It is listed right above "Finished tasks are kept 30 days, then they leave this device’s list". There is no "Show all completed".
5. **C-LS-09 — reminders do not show on Today.**
   - Call mum today 18:00, reminder 15 minutes before, clock 17:30 → 17:46.
   - Tasks shows the Reminders region. Today shows nothing, though Tasks says reminders show "here and on Today".
6. **LS-013 — Agenda does not open offline before its first visit.** In a fresh session that never opened /app/agenda, go offline and open it: "This page could not be shown." It is in the install list. After one online visit it works.
7. **LS-038 — Quick add misreads meditation minutes.**
   - With the bot's Health Meditate on the path, "meditated…" now explains where to log, but logs nothing.
   - With a "Meditate" habit, "meditated 15 minutes" previews "+15 times", and "15 min meditation" is not matched.
8. **LS-032 / C-LS-35 — "Done yesterday" covers habits only, and only yesterday.**
   - Own items cannot be filled in for yesterday, and heat-map cells are not interactive.
   - On a habit made today, "Done yesterday" does nothing and says nothing.
9. **LS-019 / LC-005 — List More cannot rename a habit.** It offers Orbit, Done yesterday, Skip today and Take off the path. Own items have Rename; habits do not.
10. **LS-H23 — no reorder in the List view.** The Edit path drag lands right. The List view has no reorder; C-LS-33 is not built ("List reorder = Edit path").
11. **LS-053 / PR-031 / LS-017 — path labels still collide or say nothing.**
    - "0" and "-5" both read "Step". "QA Stretch" and "QA Stretch (2)" both read "Stretch".
    - Own "Floss teeth" and habit "QA Floss" both read "Floss". Showcase "Read: 30 minutes" and "Read ten pages" both read "Read".
    - 120×M reads "MMMMMMMMMMMM" with no ellipsis.
    - The row's honest part (keep the distinguishing part, ellipsis) is not there. The label look is O6-protected.
12. **PR-103 — no tasks on Today.** The Showcase Today shows no task ("Example · Book the dentist" 10:30). The Day Timeline does.
13. **DV-190b — the Write area says "ZIGI ASKS".** After saving a Journal entry, it shows "ZIGI ASKS How did your body feel…" though ZIGi was never opened. The saved entry says "Question for later".
14. **DV-190c — the week strip still reads ISO dates.** Screen readers hear "2026-11-02: no check-in". The legend placement is fixed.
15. **D-086 — one thing still has three words.** The Checklist says "planets" (header), "items" (heat map) and "complete" (orbits) for the same things.
16. **C-DVG-76 — a reminder time is not on the row.** A habit's reminder time set on Habits is not shown on the List row; only a time given on the Day Timeline is ("at 07:30"). There is no next due date for non-daily habits.

**Also seen (AL_SCOPE C, not a ledger id):**
- The global Quick add drops "#Home" from "Pay rent every month on the 1st p1 #Home @bills": the task is stored with no project.
- Global search "today" lists pages and Help, not today's tasks.
