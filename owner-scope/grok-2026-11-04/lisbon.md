# Lisbon — Checklist app (Checklist + Tasks + Agenda) test run · Nov 4 2026
Tester: Lisbon (QA) via headless Playwright (Chromium), clean context (no Showcase Demo), fake data only.
Build (x-zigoals-build, /app/checklist and /app/tasks, 01:20 Brussels): `17069c7d89824a3799f6749beb37e6ab50122b4a`
Scope note: the "standalone Checklist app" ships as three linked surfaces: /app/checklist ("Your orbit" daily path), /app/tasks ("One list for the things to do") and /app/agenda. All three are covered here. ZIGi/NOVA section is written separately to lisbon-ai.md.
Shots: /workspace/zigoals/shots/2026-11-04/ls/

## Log
- 01:20 First load, clean context. /app/checklist: empty state "Your path is empty. Star what you do every day…", tiles Sleep/Meditate/Fast ("No goal set"). /app/tasks: empty state "Your list starts here". No console errors on either. Shots LS-00-_app_checklist.png, LS-00-_app_tasks.png.
- 01:22 Tasks: add form probed. Fields: title (maxlength 140), More options > Priority (High/Normal/Low), Due (date, min=today), Time (only after a day). No project, section, subtask, label, recurrence, reminder or description field exists anywhere in the add or edit form. Data model (localStorage `zigoals:tasks:v1`): {id,title,priority,due,time,createdAt,doneAt} only.
- 01:23 Quick add NLP test on Tasks input: "Buy milk tomorrow at 5pm", "Pay rent every month on the 1st p1", "Email Bob #work @phone friday", "Renew passport next week !!" all saved verbatim as "No day / Normal" tasks — zero parsing.
- 01:25 Done/Undo, Remove/Undo, Edit (title/priority/due/time) and reload persistence all work. Groups: Today / Next 7 days / Later / Someday + collapsed "Done in the last 30 days". Esc does not close the inline edit form.
- 01:28 Clock/TZ: tasks due 23:00 do not turn overdue live (no re-render at 23:10 or after midnight without reload); after reload at 00:10 the "Overdue 2" group + "Open 3 tasks · 2 overdue" header appear correctly. Dates are floating local dates: LA context (still Nov 4) shows them as today, Auckland (Nov 5) as overdue; date `min` follows the local day. Global Search ("plumber") returns "0 results… Nothing on this device matches" although the task exists. Focus opens a rich Pomodoro sheet (blocks, breaks, sound, auto-tick with Undo). Agenda week view lists tasks with time, priority and an inline tick. Global "+ Quick add" button is display:none at 1280/1600 (inside .sidebar-actions).
- 01:31 Checklist path built from clean: 4 own items (Morning/Afternoon/Evening/Anytime, incl. 200-char and Unicode names) + Water, Weigh in, Sleep, Meditate, Fast from "From your pages". Own-item name maxlength 60 silently cuts (200 x -> 60). Path labels cut to first word ("Stretch", "Бег") and the x-string label is capitalised "Xxxxxxxxxxxx". Tick/Undo/untick works with toast "Stretch 5 min logged for today." + Undo. Sleep: start at 23:30, stop 20 s later -> "Stopped after less than ten minutes, so nothing was saved." (T-110/LC-001 FIXED). Live midnight rollover works without reload (header goes to "0 of 9 planets today · Thu, Nov 5", heat map keeps "Nov 4, 2026: Some orbits — 1 of 9 items done"). Water opens a 250 ml stepper popover. One console error: "Failed to load resource: 503".
- 01:34 Water 250 ml from the planet -> Health store water entry + Today "Water: 250 mL" / "Today 0.3 L water"; planet turns done after one 250 ml (no target). Weigh-in: -5 kg blocked with "Choose 20 to 400 kg." (good). Meditate +10 min -> Health "10 min this week". Fast tap stop <10 min -> "nothing was saved" (M-136/LC-011 FIXED). Habit created on Habits ("Journal 3 lines", Evening) shows a star "Star … for your Checklist path"; it appears in Edit path > From your pages > Habits; ticking on the path completes the habit on Habits (1/1) with Undo. /api/push returns 503 on every page load (console error).
- 01:37 Keyboard: only "/" (focus Search) works on Tasks; q, n, a, ? do nothing. Ctrl+K (ZIGi) and clicking the ZIGi button CRASH the page renderer in headless Chromium on /app/tasks and /app (repro 4/4, also with --disable-gpu; not on /app/checklist). Offline: in the first session the reload shows "You are offline · This page was not saved on this device yet"; once the SW cache exists /app/tasks, /app/checklist and /app load offline, /app/agenda still shows the offline page although it is in the cache list. Tasks added offline persist (localStorage). ICS import (fake calendar with HTML title, RRULE COUNT=3, VTODO): 2 events imported with Undo, RRULE expanded, 09:00Z -> 10:00 AM local, HTML shown as text, VTODO silently dropped. ICS export "What goes in" lists Habits/Contributions/Bills/Workouts/Meals/Unbonding/Reviews but NOT Tasks.
- 01:40 Sweep 3 pages x 375/768/1280 x Light/Dark (18 runs): no horizontal overflow, axe 0 serious/critical (only `region` moderate on .checklist-launcher/.phone-back and `image-redundant-alt` minor at 768), FCP 230–580 ms, DCL <360 ms; every page logs the /api/push 503. Agenda tick boxes are 22x22 px. Light theme Checklist still draws dark-navy planets and labels on a pastel sky (LC-015). Global Quick add at 375: "call mom tomorrow at 5pm" is previewed as "Breakfast: call mom tomorrow at 5pm × 1 serving · AI estimate" (food log); "task buy milk", "todo: renew passport friday", "add to checklist: floss" -> "I didn't understand that yet"; there is no Task tile in the Quick add menu. Checklist "+" creates a habit only ("It becomes a habit on Habits too").
- 01:43 Re-checks: Make this a habit still drops today's tick (LC-016). Take off path now has Undo (LC-009), but the Undo toast cannot be clicked while the Edit path sheet is open (sheet intercepts pointer); it works after Done. List > More on a habit item still only "Open Habits / Close" (LC-005). Meditate tile 40 s -> "Meditation saved on Health: 41 seconds." (LC-012 fixed). Path/List switch and heat map now present at 375 and 768 (LC-013 fixed). List view quick chip "+70 kg" on a brand-new profile logs 70 kg (a default the user never typed) to Health weights in one tap. Task linked to goal "Run a 10K" shows "Goal · Run a 10K" on Tasks, but the goal page does not list the task. Pomodoro on "Call plumber" (4x25) ran to the end with a fake clock and auto-ticked the task with Undo.
- 01:45 Volume: 100/300/500 tasks render fine; a 501st add is refused with "You have 500 tasks, the most kept. Finish or remove one first." A store with 1,000 tasks (injected) renders "Open 0 tasks" (whole list hidden). Corrupt store ("{not json"): page shows an empty list with no warning and new adds are not saved (store stays corrupt).

---
## Findings (LS-xxx)
All shots under /workspace/zigoals/shots/2026-11-04/ls/. Build 17069c7d89824a3799f6749beb37e6ab50122b4a. Clean profile, Europe/Brussels unless stated.

### LS-001 · Tasks > Quick add / natural language · MAJOR
Steps: /app/tasks, type "Buy milk tomorrow at 5pm", "Pay rent every month on the 1st p1", "Email Bob #work @phone friday", "Renew passport next week !!", Enter each.
Expected (Todoist/TickTick): date, time, recurrence, priority (p1/!!) and labels (#/@) parsed and highlighted, removed from the title.
Actual: all four saved verbatim as "No day", Normal priority (Someday group).
Shot: LS-03-tasks-added.png. Fix: inline parser (chrono-style) on the Tasks input with highlighted tokens and a one-tap "keep as text" escape; support today/tomorrow/weekday/next week/in N days/at HH:MM/every…/p1-p3/!/#label.

### LS-002 · Tasks > data model: no projects, sections, subtasks, labels, recurrence, reminders, notes · MAJOR (scope vs brief "Todoist-level")
Steps: open More options and Edit on any task; read localStorage `zigoals:tasks:v1`.
Expected: projects/lists, sections, subtasks, labels/tags, repeat rules, reminders, description.
Actual: fields are only title (140), priority (3 levels), due date, time, goal. Stored object = {id,title,priority,due,time,goal?,createdAt,doneAt}. No filters, no sort control, no views except the automatic Overdue/Today/Next 7 days/Later/Someday groups.
Shot: LS-01-tasks-more.png, LS-05-task-edit.png. Fix: add Lists (projects) with sections, one level of subtasks, labels, "Repeat" (daily/weekdays/weekly/monthly/custom, after completion), reminder offsets, notes; filter chips (Today, Overdue, Priority, Label, Goal).

### LS-003 · Tasks > recurring tasks · MAJOR
Steps: try to create "Pay rent" every month.
Expected: repeat rule; completing creates the next occurrence.
Actual: no repeat field anywhere; only the Checklist path repeats (daily habits). A monthly bill must be re-typed each month.
Shot: LS-01-tasks-more.png. Fix: see LS-002; tick of a repeating task rolls the due date forward with Undo.

### LS-004 · Global Quick add parses a to-do as a food log · MAJOR
Steps: 375 px, top bar "+ Quick add", type "call mom tomorrow at 5pm", Preview.
Expected: a Task (due tomorrow 17:00) or at least "I didn't understand".
Actual: "Health · Diary … AI ESTIMATE · Log a food with an AI estimate · Breakfast: call mom tomorrow at 5pm × 1 serving · kcal unknown…". "task buy milk", "todo: renew passport friday", "add to checklist: floss" -> "I didn't understand that yet". Quick add menu has tiles for Health entry, Habit, Note, Contribution, Goal, Asset but no Task.
Shot: LS-70-quickadd-callmom-food.png. Fix: add a Task intent (verbs call/buy/email/pay/renew/todo/task, any date phrase) that previews "Task · due Thu Nov 5 · 17:00"; never fall back to a food log for text with no food word; add a Task tile.

### LS-005 · Global Search does not find tasks · MAJOR
Steps: with task "Call plumber", press "/" and type "plumber".
Expected: the task in results (Todoist/TickTick search all tasks).
Actual: "0 results · Nothing on this device matches "plumber"." (placeholder says goals, habits, foods, assets, pages, settings and Help). No search/filter on /app/tasks either.
Shot: LS-14-search.png. Fix: index tasks (title, goal) and Checklist items in Search; add a filter box on Tasks.

### LS-006 · Tasks > opening ZIGi crashes the page (headless Chromium) · MAJOR (needs a real-browser re-check)
Steps: /app/tasks (empty or with data) or /app, press Ctrl+K or click "Open ZIGi, your personal AI companion".
Expected: ZIGi panel opens.
Actual: renderer crash ("Page crashed") 4/4 on /app/tasks and /app, also with --disable-gpu; Ctrl+K on /app/checklist does nothing (no crash). Headless only so far; not confirmed in a headed browser.
Shot: none possible (page gone); script /workspace/qa/ls17.py, ls18.py. Fix: check what the ZIGi panel starts on open (mic/audio/WebGPU/worker) and guard it; lazy-start any speech/audio only on user request.

### LS-007 · Checklist > List view "+70 kg" logs a weight the user never entered · MAJOR (data quality)
Steps: clean profile, add Weigh in to path, List view, tap chip "+70 kg" (aria "Log 70 kg for Weigh in").
Expected: first weigh-in asks for a value (Path view popover does), or the chip shows the last real weight only.
Actual: 70 kg is saved to Health weights immediately ("70 kg logged for today.") on a profile with no weight history.
Shot: LS-86-oneTap-70kg.png. Fix: show the quick chip only after a first real weigh-in and use the last value; otherwise open the stepper.

### LS-008 · Checklist > Make this a habit drops today's tick · MAJOR (re-check LC-016: STILL OPEN)
Steps: tick own item "Stretch 5 min" (header 2 of 10), Edit path > Change Stretch > Make this a habit > Done.
Expected: tick carried over as the habit's first check-in.
Actual: toast "…is now a habit, daily, on Habits. Its dot stays here." then the planet reads "not done yet", header 1 of 10, Habits shows "Complete Stretch 5 min" (open).
Shot: LS-80-makehabit.png, LS-81-after-makehabit.png. Fix: write today's tick as a check-in on conversion.

### LS-009 · Agenda > ICS export cannot include tasks · MINOR
Steps: tasks due this week; Agenda > Choose what to export.
Expected: Tasks in "What goes in" (Agenda shows them).
Actual: Habits, Contributions, Bills, Workouts, Meals, Unbonding, Reviews; no Tasks; "Nothing to export with these choices."
Shot: LS-46-export.png. Fix: add Tasks (VTODO or all-day VEVENT with due time).

### LS-010 · Agenda > ICS import drops VTODO silently · POLISH
Steps: import ls_test.ics (2 VEVENT + 1 VTODO).
Actual: "2 events to add"; the VTODO "Imported todo" is not mentioned and not in Tasks. (Events import is good: RRULE expanded, UTC -> local, HTML shown as text, Undo.)
Shot: LS-48-ics-import.png, LS-50-agenda-imported.png. Fix: import VTODO as Tasks or say "1 to-do skipped".

### LS-011 · Tasks > overdue / day change not live · MINOR
Steps: fake clock 22:50, task due today 23:00; run to 23:10 and 00:10 without reload.
Expected: at 23:10 the task is late; after midnight it moves to Overdue (Checklist does roll over live).
Actual: still "Due today at 11:00 PM" at 23:10 and at 00:10; only a reload shows "Overdue 2" and "Open 3 tasks · 2 overdue".
Shot: LS-10-2310.png, LS-11-after-midnight.png. Fix: re-render on a minute timer and on visibilitychange; mark timed tasks late after their time.

### LS-012 · Tasks > past due date blocked · MINOR
Steps: More options, Due 2026-11-03 (yesterday), Add task.
Actual: nothing is added and nothing visible appears (native validity "Value must be 11/04/2026 or later." only as a browser bubble); fields stay filled. Edit cannot move a task into the past either.
Shot: LS-06-past-date.png. Fix: allow past dates (logging/backlog) or show an inline message.

### LS-013 · Offline > first session and Agenda · MINOR
Steps: first visit, add a task, go offline, reload.
Actual: "You are offline · This page was not saved on this device yet. Open ZIGoals once while online…" although it was open online. After the SW cached pages in a second session /app/tasks, /app/checklist and /app work offline; /app/agenda still shows the offline page. Data added offline is kept.
Shot: LS-45-offline.png, LS-49-offline-2nd.png. Fix: precache the Checklist suite on SW install; add /app/agenda to the page cache match.

### LS-014 · Tasks > keyboard shortcuts · MINOR
Steps: on /app/tasks press q, n, a, ?.
Expected (Todoist): q quick add, ? shortcut list, arrows/e/d/1-4 on rows.
Actual: nothing; only "/" (Search) and Enter-to-add. Esc does not close an inline Edit form; Search needs Esc twice.
Fix: q/n focus the add input, ? opens a shortcut sheet, Esc closes edit/search once.

### LS-015 · /api/push 503 on every page · MINOR
Steps: load any Checklist/Tasks/Agenda page. Actual: console "Failed to load resource: 503" from https://alpha.zigoals.app/api/push in all 18 sweep runs. Fix: return 204 when push is not configured or skip the call.

### LS-016 · Checklist > Water done after one glass · MINOR (re-check LC-002: STILL OPEN)
Steps: Water planet > Log 250 ml. Actual: "Water: 250 ml today: done". No water target used (Health waterTargetMl null and no prompt). Shot: LS-24-water.png. Fix: done at target; ask target once (default 2,000 ml), show a ring.

### LS-017 · Checklist > name limits and path labels · POLISH (re-check LC-007/LC-008: STILL OPEN)
Own item maxlength 60 (200 chars silently cut), Tasks title maxlength 140 (400 cut), no counter. Path labels show first word only ("Stretch", "Бег") and the 60 x name becomes "Xxxxxxxxxxxx". Shot: LS-22-path-built.png. Fix: counter at 80%; label with ellipsis and full name on focus.

### LS-018 · Checklist > Undo toast blocked by Edit path sheet · POLISH
Steps: Edit path > Change Floss > Remove. Toast "Floss is off your path… Undo" shows, but the sheet intercepts the click; Undo works only after Done. Shot: LS-82-takeoff.png. Fix: lift the toast above the sheet scrim.

### LS-019 · Checklist > List > More is thin · POLISH (re-check LC-005: STILL OPEN)
More on "Stretch 5 min" (habit): "Waiting. It lives on Habits…" + Open Habits / Close; no rename, move orbit, skip today, remove. Shot: LS-83-list-more.png.

### LS-020 · Light theme Checklist mix · POLISH (re-check LC-015: STILL OPEN)
Light theme: dark-navy planets, labels and orbit pills on a pastel sky. Shot: LS-60-checklist-375-Light.png.

### LS-021 · Goal page > Next actions: linked tasks are hidden behind "Manage" and the card shows no count · POLISH (CORRECTED at 02:25, was MINOR)
Correction: my first pass (01:4x) said the goal page doesn't list linked tasks. That was wrong. Re-check at 02:24: the goal page has a "Next actions" card ("The small steps for this goal · on your Agenda on their day · Manage +"), and inside it are 'Focus on "Buy running shoes"' and 'Edit "Buy running shoes"'. But the collapsed card shows no count or title, unlike "Milestones 0 of 4 complete", so it looks empty. Shots: LS-136-goal-next-actions.png (collapsed), LS-73-goal-detail.png.
Fix: show "1 open task · Buy running shoes" in the card summary, like Milestones.

### LS-022 · Tasks > corrupt or >500 store shows an empty list without warning · MINOR (edge)
Injected 1,000 tasks -> "Open 0 tasks"; corrupt JSON -> empty list, new adds not saved. Shot: LS-90-volume-1000.png, LS-91-corrupt.png. Fix: on parse/validation failure keep the raw copy, show "We couldn't read your tasks" with export, never silently drop new adds.

### LS-023 · Agenda tick boxes 22x22 px · POLISH (a11y target size, WCAG 2.5.8 minimum 24 px). Shot: LS-60-agenda-375-Light.png.

### LS-024 · Dashboard counters disagree · POLISH (re-check LC-014: CHANGED)
Same moment on /app: "2 of 10 planets today", "Today 1 of 2 habits", "1 of 2 habits complete", "1 of 1 due habits complete", "0 of 1 due habits complete". Shot: LS-85-dashboard.png.

### Positives (verified)
- LS-P01 Sleep/Fast stop under 10 min: "Stopped after less than ten minutes, so nothing was saved." (T-110, LC-001, LC-011 fixed). LS-27-sleep-end.png, LS-33-fast.png
- LS-P02 Live midnight rollover on Checklist without reload; heat map keeps yesterday ("Nov 4, 2026: Some orbits — 1 of 9 items done"). LS-28-cl-midnight.png
- LS-P03 Done/Undo, Remove/Undo, Edit (title, priority, due, time, goal), reload persistence on Tasks; blank title disables Add/Save. LS-07-done.png, LS-08-remove.png, LS-09-reload.png
- LS-P04 Pomodoro per task (block/break/count presets, sound) auto-ticks the task at the end with Undo. LS-74/75
- LS-P05 Habits <-> Checklist two-way: star on Habits, tick on path completes the habit. LS-41-habit-on-path.png
- LS-P06 Health links: water, weigh-in (20–400 kg guard), meditation (exact seconds) land in Health. LS-35-weigh-negative.png, LS-84-med-tile-40s.png
- LS-P07 ICS import: RRULE, time zone, HTML-safe titles, Undo, 1,500-event cap shown. LS-50-agenda-imported.png
- LS-P08 Time zones: dates are floating local days (LA vs Auckland correct), date min follows local day. LS-12-tz-*.png
- LS-P09 18-run sweep: no overflow, axe 0 serious/critical, FCP ≤ 580 ms. /workspace/qa/ls_sweep.json
- LS-P10 XSS/Unicode titles render as text on Tasks, Checklist and Agenda.
- 01:47 Note (Professor): shared box browser profile had alpha site data cleared ~01:19–01:22. Lisbon did not use the shared browser at all — only fresh headless Playwright contexts (new_context, own storage_state files under /workspace/qa/ls_*.json). No unexplained data appeared in any of my contexts.
- 01:52 Orbits: rename (maxlength 30) works and persists ('Renamed to Sunrise.'); blank name silently reverts; Add orbit works; Remove orbit moves its items to the LAST orbit in the list (Anytime by default, but 'Extra 5' once custom orbits exist) with Undo (Undo restores Evening fully). aria-label reads 'Remove the Evening orbit orbit'. Empty custom orbits are hidden on the path; custom orbit names get ' Orbit' appended ('Sunrise Orbit'). Options: view radio, 6 accents, bell checkbox, vibration checkbox (disabled: 'Not available on this device'), nudges checkbox (on).

## Comparison vs Todoist / TickTick (feature matrix)
Sources (PRIMARY, read Nov 4 2026): Todoist pricing https://www.todoist.com/pricing ; Todoist plans FAQ https://www.todoist.com/help/account-and-billing/plans/todoist-plans-pricing-and-billing-faq-Vq2z0HWL6 ; Todoist Quick Add https://www.todoist.com/help/todoist/features/use-task-quick-add-in-todoist-va4Lhpzz ; Todoist dates https://www.todoist.com/help/todoist/features/schedule-a-date-and-time-for-your-todoist-tasks-q7VobO ; TickTick upgrade/compare https://ticktick.com/upgrade ; TickTick home https://ticktick.com/ . SECONDARY: honestvia.com TickTick review 2026, vyneron.com TickTick pricing 2026.
ZIGoals column verified on alpha build 17069c7 (clean profile). HAS / PARTIAL / MISSING.

| Feature | ZIGoals Checklist+Tasks | Todoist (free Beginner) | TickTick (free) |
|---|---|---|---|
| Natural-language quick add (date/time/priority/label) | MISSING (LS-001, LS-004) | Yes, Smart Quick Add | Yes, NLP |
| Projects / lists | MISSING | 5 projects | 9 lists |
| Sections | MISSING | Yes | Yes (sections/columns) |
| Subtasks / checklist items | MISSING | Yes | Yes (19 per task) |
| Labels / tags | MISSING | Yes (%label) | Yes |
| Priorities | HAS (3 levels) | Yes (p1–p4) | Yes (4) |
| Due date + time | HAS (no past dates, LS-012) | Yes | Yes |
| Recurring tasks | MISSING for tasks; daily items only on Checklist path | Yes | Yes |
| Reminders / push | PARTIAL (Checklist "Gentle nudges" on Today's card; no task reminders; /api/push 503) | Yes | Yes (2 per task) |
| Filters / saved views | PARTIAL (auto groups Overdue/Today/7 days/Later/Someday) | 3 filter views | Basic + smart lists (Premium custom) |
| Search tasks | MISSING (LS-005) | Yes | Yes |
| Calendar views | HAS (Agenda Day/Week/Month, tick tasks inline) | Pro only | Basic free |
| ICS import/export | PARTIAL (import events yes, export no tasks, VTODO dropped) | Calendar integration | Calendar subscription (Premium) |
| Pomodoro on a task | HAS (auto-tick + Undo) | No | Yes |
| Habits in same app | HAS (Checklist path <-> Habits) | No | Yes (5 free) |
| Health links (water/weight/sleep/meditate/fast) | HAS (unique) | No | No |
| Goal link | HAS (Tasks show the goal; goal page lists them under the collapsed "Next actions" card, LS-021) | No | No |
| Keyboard shortcuts | MINIMAL ("/" only) (LS-014) | Full set | Full set + command menu |
| Offline | PARTIAL (after SW cache; Agenda not) (LS-013) | Yes | Yes |
| Undo everywhere | HAS (tick, remove, take off path, orbit remove) | Yes | Yes |
| AI | ZIGi (crash in headless, LS-006; ZIGi/NOVA covered in lisbon-ai.md) | Ramble/Task Assist (Pro) | AI Assistant, AI Voice Capture |
| Limits | 500 tasks, 140-char titles, 60-char path items | 5 projects free | 99 tasks per list free |

## Per page
### /app/tasks
What works: add/edit/remove/tick with Undo; priority, day, time, goal; automatic groups incl. Overdue; Done in the last 30 days; Pomodoro per task; deep link #task-id from Agenda; 500 cap with clear copy; XSS-safe.
Missing vs Todoist/TickTick: NLP quick add, projects/lists, sections, subtasks, labels, recurrence, reminders, notes, search/filter, sort, bulk actions, keyboard shortcuts, drag reorder, board view.
Copy/UX: Esc should close Edit; past date fails silently; "Someday" for undated is fine; "On this device only" is clear.
### /app/checklist
What works: path + list views, orbits (rename/add/remove with Undo), own items, Health items, habits starred from Habits, live midnight rollover, 12-week heat map at all widths now, <10 min Sleep/Fast guard, exact meditation seconds, weight range guard.
Missing vs TickTick: one-off "just today" items, per-item reminders/time, skip/snooze from the item menu, reorder by drag (only ↑/↓ in Edit), stats per item.
Copy/UX: one-word path labels; "+70 kg" chip; Undo toast under the sheet; "Remove the Evening orbit orbit"; custom orbit names get " Orbit" appended.
### /app/agenda
What works: Day/Week/Month, tasks tick inline with Undo, Day view inline add (pre-fills the shown day — added on Fri Nov 6 view stored due 2026-11-06), ICS import with RRULE/timezone.
Missing: tasks in export, VTODO import, drag to reschedule, time-blocking.
Copy/UX: offline not cached; 22 px tick boxes.

## Log 02:01
- 01:53 Gentle nudges checked with page.clock at 09:05/10:05/15:05/19:05/23:05 Brussels: the Today card shows "9 planets still waiting on your path." only at 10–19h, not at 9 or 23. Works as described (in-app line only, no push). → LS-P11.
- 01:55 Keyboard on /app/checklist path: Tab order is logical (Close, Path, List, Edit path, Options, Quick add, menu, then each planet in path order). Space and Enter both toggle a planet; the aria-label changes to "Floss: done". Focus ring is 3px solid. Esc closes the sheet and focus goes back to "Edit path". With prefers-reduced-motion 0 animations run (4 without it). → LS-P12.
- 01:56 DST: clock set to Sat Mar 27 2027 23:50 Brussels, ticked Floss, then fast-forwarded across midnight and across the 02:00→03:00 spring-forward. Each day reset and was stored on its own (heat map rows "Mar 27, 2027" and "Mar 28, 2027"; header "Mon, Mar 29"). No double day, no skipped day. → LS-P13.
- 01:58 Backup: "Export everything" (readable ZIP) has tasks, checklist and checklistDays only inside everything.json under "device". There is no tasks.csv or checklist.csv, and the README/copy lists areas without Tasks or Checklist. Restoring that everything.json into a clean profile via each of the 4 restore inputs gives "This file is not a ZIGoals module backup. (NOT_A_BACKUP)", and the importer gives "does not recognise this export". → LS-025.
- 02:00 Encrypted backup (the "Recommended" one): generated with a local fake secret and restored into a clean context. The preview lists only Goals and Wealth, Habits and Today preferences. Tasks and Checklist are missing (the profile had 6 tasks and a 10-item path). So the recommended backup silently leaves out both new modules. → LS-025.
- Did not click "Send email code" or any account/sync button (read-only rule).

### LS-025 — Settings > Backup & restore: Tasks and Checklist are not in the encrypted backup and the readable export can't be restored — MAJOR
Steps: clean context, add tasks + a Checklist path → Settings → Prepare encrypted backup → Download → new clean context → Restore an encrypted backup → Unlock and preview. Then try Export everything → feed everything.json to each restore input.
Expected: like Todoist backups and TickTick export/import, the recommended backup covers every module, Tasks and Checklist (path, orbits, day history) included, and a readable export can be read back.
Actual: the preview shows "Validated modules: Goals and Wealth, Habits, Today preferences". No Tasks, no Checklist. The readable ZIP has them only as raw JSON under "device", with no CSV, and no restore input accepts it (NOT_A_BACKUP). Anyone who follows "Export a copy before clearing site data or moving to another device" loses all tasks and the checklist path and history.
Shots: ls/LS-115-enc-preview.png, ls/LS-115-enc-preview-card.png, ls/LS-113-export.png, ls/LS-114-restore.png
Fix: add Tasks and Checklist (+ checklist-days) as modules in the encrypted backup and in "Restore … from a file", add tasks.csv and checklist.csv to the ZIP, and list both in the copy.

### LS-P11 — Today > Checklist card: nudge only in daytime window — POSITIVE
"N planets still waiting on your path." shows 10:00–19:59 only (clock-tested). Shot ls/LS-110-nudge-15.png
### LS-P12 — Checklist path: keyboard + reduced motion — POSITIVE
Logical tab order, Space/Enter toggle, live aria-label state, visible 3px focus ring, Esc returns focus, animations off with reduced motion. Shot ls/LS-111-kb-focus.png
### LS-P13 — Checklist: DST and midnight safe — POSITIVE
Spring-forward 2027-03-28 handled; one record per local day. Shot ls/LS-112-dst.png

### LS-026 — Checklist > Edit path > Orbits: removing an orbit moves its items to the last orbit, not to Anytime — MINOR
Steps: Edit path → add orbits "Extra 1..5" → Remove "Evening".
Expected: items go to a neutral orbit (Anytime) or the user picks where. TickTick asks when you delete a list with tasks in it.
Actual: Evening's items jump to the last orbit in the list ("Extra 5"). Undo restores them fully (good). Shots ls/LS-100-orbits-edit.png, ls/LS-101-orbits-after.png
Fix: move to Anytime, or ask "Move 3 items to: [orbit]".
### LS-027 — Checklist > Orbits: aria-label "Remove the Evening orbit orbit" — POLISH
Fix: aria-label `Remove the ${name}` when the name already ends with "orbit", or name only.
### LS-028 — Checklist > Orbits: " Orbit" appended to custom names ("Sunrise" shows as "Sunrise Orbit") — POLISH
Fix: show the name exactly as typed.
### LS-029 — Checklist > Orbits: blank rename silently reverts — POLISH
Expected: inline "Name can't be empty". Actual: the old name comes back with no message. Shot ls/LS-102-many-orbits.png
### LS-P14 — Agenda > Day: tick a task inline with Undo; inline add pre-fills the day on screen — POSITIVE
On the Fri Nov 6 Day view, adding "Agenda add test" stored due 2026-11-06. The task link opens /app/tasks#task-… Shots ls/LS-103-agenda-day.png, ls/LS-104-agenda-add.png
### LS-P15 — Settings > Encrypted backup: preview before restore, per-module restore, pre-restore copy kept — POSITIVE (for the modules it covers; see LS-025)

## Log 02:04
- 02:03 BUG-034 re-check (clean profile + path). For 375/768 × /app/health, /app/checklist, /app/tasks, /app/agenda, /app, I scrolled in 400 px steps and used elementFromPoint at each control's centre. At 768 on /app/health the right-edge stack (checklist-launcher-stack 56×82 + ZIGi ai-launcher) is topmost over "Increase Pull-ups", "Options for Breakfast today", "Options for Daily nutrition" and "Meditate/Sleep/Fast is on your Checklist path" while they scroll past. At 375 it covers "Options for Breakfast/Snacks/Water journal". /app/checklist, /app/tasks and /app/agenda have no overlap at either width. → BUG-034 STILL OPEN (CHANGED: the new Checklist launcher joined the stack). Shots ls/LS-116-bug034-768.png, ls/LS-116-bug034-768-covered.png, ls/LS-87-fab-375.png
- 02:05 Habit on the path → Habits → Options → "Archive habit…" → confirm "Archive habit". The habit leaves the Checklist path at once; today's tick stays in the habit history. No orphan planet. → LS-P16. (First attempt hit the menu item twice and didn't archive; the confirm needs a second, separate button. Fine.) Shots ls/LS-117-habit-archive-confirm.png, ls/LS-118-path-after-habit-archive.png
- 02:08 Two tabs, same context, on /app/tasks: a task added in tab A shows up live in tab B (no reload). Then adding in B keeps A's task (store has both, 9 tasks), so there's no last-write-wins loss. (One run right after reload showed a stale list; it didn't repeat on a second run, so it's not filed.) → LS-P17. Shot ls/LS-119-two-tabs.png

### LS-P16 — Habits > Archive: archived habit leaves the Checklist path cleanly — POSITIVE
### LS-P17 — Tasks: live cross-tab sync without lost writes — POSITIVE (TickTick/Todoist web need a sync round-trip; here it's instant on one device)
- 02:09 Perf with volume: 500 fake tasks, 375 px, CPU throttled 4× (mid-range phone). /app/tasks renders the full list in 2.1 s. FCP 440 ms, 5 long tasks (max 399 ms), 6,793 DOM nodes, and one tick takes 284 ms to the next frame. /app/agenda: 7 long tasks (max 261 ms). Unthrottled, the 1-task case was fine (FCP 230–580 ms, see 01:40). → LS-030.

### LS-030 — Tasks: 500 tasks render all at once; one tick ≈ 284 ms at 4× CPU — MINOR
Steps: put 500 tasks in zigoals:tasks:v1 (the app's own cap) → /app/tasks at 375 px with CDP CPU throttle 4 → tick the first task.
Expected: interaction under 200 ms (the INP "good" limit) at the cap the app allows. Todoist and TickTick keep big lists responsive with collapsed groups and lazy rendering.
Actual: 6,793 DOM nodes, long tasks up to 399 ms on load, 284 ms from tick to next frame.
Shot ls/LS-120-perf-500.png
Fix: collapse Later/Someday by default past ~50 items, or virtualise the groups; re-render only the changed row on tick.
- 02:10 Tasks sort and a11y (clean context): tasks with the same date sort by priority, then by when they were added (Bravo high, Delta high, Charlie normal, Alpha low). Headings: H1 page, H2 "Open 4 tasks", H3 per group. Checkbox names read 'Mark "Bravo high" done'. There's a polite live region and a 140-char counter (aria-live off, so it doesn't spam). The Time field stays disabled until a day is picked, so there are no time-only tasks. Todoist allows a time with "today" assumed; fine as a choice. → LS-P18. Shot ls/LS-121-priority-order.png
### LS-P18 — Tasks: priority sort and clean semantics (headings, named checkboxes, live region) — POSITIVE
- 02:12 App time zone vs device time zone. Device is Europe/Brussels, clock Wed Nov 4 23:30. In Settings I set the time zone field to Pacific/Auckland and clicked "Save my time zone" ("Your time zone is saved. Past entries keep their dates."). After that, /app/checklist shows "0 of 10 planets today · Thu, Nov 5" and the Today page shows "Nov 5, 2026". But /app/tasks still shows a task due Nov 4 under "Today 1 · Due today", and the date picker min is 2026-11-04, so Tasks follows the device zone. One app now shows two different "todays". → LS-031. Shot ls/LS-122-app-tz.png

### LS-031 — Tasks vs Checklist/Today: Tasks ignores the saved app time zone — MINOR
Steps: device TZ Europe/Brussels, 23:30 Nov 4 → Settings → time zone Pacific/Auckland → Save my time zone → open /app/checklist, /app, /app/tasks.
Expected: one "today" across the app. Todoist and TickTick both follow the account time zone everywhere.
Actual: Checklist and Today show Thu Nov 5; Tasks shows Nov 4 as "Due today" and lets you pick Nov 4.
Fix: compute Tasks' today, overdue and date min from the same saved zone helper that Checklist uses.
- 02:13 Volume on the Checklist path: I added 60 own items ("Item 01".."Item 60") in a clean context with no cap or message; all 60 are stored and drawn. Every planet label reads "Item" because the label is the first word only, so 60 planets can't be told apart without opening each one (stronger evidence for LS-017). Per-item menu is "Change Item 01: orbit, colour, place" and "Move … drag, or use the arrow keys". There are no weekday or interval options, so every item is daily (confirms LS-003 for the Checklist side; TickTick habits allow specific weekdays or X times a week). Shots ls/LS-123-many-items.png, ls/LS-124-path-60.png
- 02:14 Checklist history. The heat map is one role=img ("The last 12 weeks: 1 days with some or all orbits") with hidden spans per day ("Nov 3, 2026: Nothing — nothing on the path"). Cells can't be focused or clicked, so a missed or forgotten day can't be filled in afterwards. Streak shows "0-day streak" on a day with 1 of 10 done (it counts full days only). List view at 375 Dark reads fine; each orbit header says "0 of 3" and then "0 of 3 complete" (the second is the SR text, also visible). → LS-032, LS-033. Shot ls/LS-125-list-375-dark.png

### LS-032 — Checklist > history: can't tick a past day — MINOR
Steps: path with items → next day → try to mark yesterday's Floss done (heat map, list, item menu).
Expected: TickTick habits and Todoist "complete on a date" let you fill in a missed day, usually with a limit (e.g. last 7 days).
Actual: heat-map cells aren't interactive (tabIndex -1, inside one role=img), and there's no "yesterday" option anywhere. Habits are the same.
Fix: tapping a heat-map cell opens that day's list with ticks, limited to the last 7 days, with Undo.
### LS-033 — Checklist > copy: "1 days", "0-day streak" next to a partly done day, "0 of 3 · 0 of 3 complete" twice — POLISH
Fix: plural rule ("1 day"); say "Streak counts days with every orbit done" under the flame; make the "complete" text visually hidden.
- 02:15 Build re-check: the x-zigoals-build header is still 17069c7d89824a3799f6749beb37e6ab50122b4a, so the build didn't change mid-run. axe on the open dialogs (Edit path sheet, Options sheet, Water popover) in Dark and Light at 1280: 0 violations. Agenda Month: only "moderate region" on .checklist-launcher (same as the 01:40 sweep). At 375, Edit path and Options sit in the "Checklist menu" (⋯) together with "How it works"; you can reach them, but it's one more tap than at 1280. Shot ls/LS-126-375-menu.png
- 02:20 Habit schedules on the path: a habit "Gym Monday" with Schedule = Selected weekdays (Mon only), starred onto the path, is not a live planet on Wed Nov 4 and is a normal planet on Mon Nov 9 (page.clock). So weekday recurrence does exist for habit planets (Habits offers Every day / Selected weekdays / Every N days / X times per period / Specific dates each month). Own Checklist items and Tasks still have none (LS-003 narrowed). → LS-P19. Shot ls/LS-127-weekday-habit-wed.png
- LC-010 re-check on a clean path (Read template habit, 30 min). Focus tile → "Start a focus session on Read now?" → Start: toast "Focus started: Read." with Undo. I ended it after about 12 s. End toast: "Read: your time is logged on Habits. Change it there if needed." with **no Undo**. Planet reads "Read: 0.19 of 30 minutes" and the Habits card shows "0.19 / 30 minutes per day". Two decimals instead of nine, but still a fraction, and the end still has no Undo. → LC-010 STILL OPEN (narrowed). Shots ls/LS-129-focus-12s.png, ls/LS-129-habits-after-focus.png
- Side note, not filed: in a context saved under a fake clock (12:00) and reopened at the real 02:2x, Focus → Start said "Not saved. Try again." It doesn't happen on a clean profile, so it's an artefact of the clock moving backwards and isn't a user flow.
- LC-003 re-check: on a clean path the Meditate planet is the Health item ("Meditate · Health · +10"), and +10 shows in Health "10 min this week" (01:34). The habit vs Health split is gone for this path. Still two "Meditate" controls on one screen (the planet and the side tile), but they write to the same record. → LC-003 CHANGED (sync fixed; duplicate label stays).

### LS-P19 — Checklist: habit schedules (weekdays/N days/X per period) carry onto the path — POSITIVE
### LS-034 — Checklist > Focus tile: fractional minutes ("0.19 of 30 minutes") and no Undo on end (LC-010) — MINOR
Steps: clean → Habits → template Read (30 min/day) → star onto path → Checklist → Focus → Start → wait 12 s → tap the tile to end.
Expected: whole minutes (or "under 1 min, nothing saved" like Sleep/Fast), and Undo on the end toast like Sleep/Fast/Meditate.
Actual: "0.19 of 30 minutes" on the planet and the Habits card, and the end toast has no Undo.
Shots ls/LS-129-focus-12s.png, ls/LS-129-habits-after-focus.png
Fix: round to whole minutes (floor; refuse under 1 min with the same copy as Sleep), and add Undo to the end toast.
- 02:20 Path label check: the habit "Gym Monday" is labelled **"Exercise"** on the path (span inside the planet whose aria-label is "Gym Monday"), so the label isn't even the first word of the name; it looks like a category word. List view shows the real name with "Not today · Habit" (a good off-day cue). Added to LS-017 as evidence. Shot ls/LS-128-focus-open.png
- 02:21 Reminders with page.clock: a habit with "Reminder time — on this device" 09:00 (created at 08:00) shows on Today at 09:05 live, without a reload, as "REMINDER · 09:00 · ON THIS DEVICE · Stretch reminder test · Not done yet today. · Open habit · Dismiss for today". It isn't on the Checklist sheet itself, and there's no system notification (headless permission was "denied", so a real push isn't tested). Tasks have no reminder field at all (LS-002). → LS-P20. Shot ls/LS-130-habit-reminder.png
### LS-P20 — Today: habit reminder card appears live at its time, with Open/Dismiss — POSITIVE (in-app only; Todoist and TickTick also push to the OS; push here is blocked by /api/push 503, LS-015)
- 02:22 Agenda + habit schedules: Week view Nov 2–8 shows "Read · Habit · Any time" on each day from creation (Nov 4) on, and nothing before. "Gym Monday" isn't in that week (no Monday on or after creation) but is on Mon Nov 9 in the next week. Agenda respects habit schedules. Own Checklist items don't appear in Agenda at all. → LS-P21. Shot ls/LS-131-agenda-habits.png
### LS-P21 — Agenda: habits plotted by their real schedule, from creation date on — POSITIVE
- 02:23 Agenda "Show:" filter is a details panel of checkboxes by kind (Habits, Contributions, Bills, Workouts, Meals, Unbonding, Reviews, Tasks with count 3, Imported calendars). Unticking Tasks hides them and the summary says "Show: 8 of 9 kinds". The choice survives a reload. It's a type filter, not a saved query like Todoist's "p1 & today" or TickTick smart lists. → LS-P22. Shot ls/LS-132-agenda-filter.png
### LS-P22 — Agenda: per-kind filter with counts, persisted — POSITIVE (the only filter in the Checklist/Tasks area; no query filters, LS-002)
- 02:23 Injection and RTL on the Checklist: items '<img src=x onerror=alert(1)>' and '"><svg onload=alert(2)>', plus a Morning orbit renamed '<b onmouseover=alert(3)>M</b>'. Hovered and switched views: no dialogs, no injected img/svg, and everything shows as plain text. An Arabic item "مرحبا بالعالم RTL" renders in the right order (direction ltr, so the browser's bidi handles it; dir="auto" would be safer for full-RTL names). → LS-P23. Shot ls/LS-133-xss-rtl.png
### LS-P23 — Checklist: names are escaped everywhere; mixed RTL text renders correctly — POSITIVE
- 02:25 Correction: LS-021 re-checked and rewritten (the goal page does list the linked task inside "Next actions"; downgraded to POLISH). Comparison table row updated. Shot ls/LS-136-goal-next-actions.png
- 02:26 Closing a linked goal ("Run a 10K" → Goal status → Close Goal and release allocations → inline "Confirm close"): the task "Buy running shoes" stays open and still says "Goal · Run a 10K", with no hint that the goal is closed. The Goal picker is gone from the *new task* form (no active goals), but the task's Edit form still has Goal "No goal / Run a 10K", so the link can be cleared (re-checked). Todoist moves tasks with an archived project; TickTick asks. → LS-035. Shots ls/LS-134-goal-close.png, ls/LS-135-task-after-goal-close.png

### LS-035 — Tasks: task linked to a closed goal keeps the old label with no "closed" hint — POLISH
Steps: task with goal "Run a 10K" → close that goal → /app/tasks → Edit the task.
Expected: label "Run a 10K (closed)", or ask on close "1 open task is linked: keep / unlink / mark done"; the Edit form can always clear the goal.
Actual: label unchanged ("Goal · Run a 10K"), and closing gives no prompt about the open linked task. Edit can still set "No goal" (good).
Fix: on close, offer to handle linked tasks; add "(closed)" to the label.
- 02:27 Re-verified LS-008 on a fresh context from ls_cl3: ticked Stretch (2 of 10), then Edit path → Change Stretch → Make this a habit. Toast: "Stretch 5 min is now a habit, daily, on Habits. Its dot stays here." Afterwards the planet reads "Stretch 5 min: not done yet" (1 of 10), and on Habits "Complete Stretch 5 min" is still open. Today's tick is lost. Reproduces 2 of 2 runs.
- 02:30 "X times per period" habit on the path. "Swim twice" (2 times per week), page.clock Mon Nov 2 → Sun Nov 8. Tap on Monday: toast "Swim twice logged for today." with Undo, but the planet stays unlit. aria-label is "Swim twice: **1 of 1 time: not done yet**", the orbit says "0 of 1", and the heat map Monday is "Nothing". List view says "1 of 1 time · Habit". Tue/Wed: "0 of 1 time: not done yet". Second tap Wed: "1 time: done". Thu–Sun: not on the path (weekly quota met, good). So the first of 2 weekly check-ins never lights the day. → LS-036. Shots ls/LS-137-x-per-week-mon.png, ls/LS-137-x-per-week-list.png, ls/LS-137-x-per-week.png

### LS-036 — Checklist > "X times per week" habit: logged check-in leaves the planet unlit and reads "1 of 1 time: not done yet" — MINOR
Steps: Habits → new habit, Schedule "X times per period", Times 2, Week → star onto the path → Monday: tap the planet.
Expected: like TickTick's "2 days per week" habit, Monday's tick lights the planet for today and shows "1 of 2 this week". The day counts in the heat map.
Actual: toast says "logged for today" but the planet, orbit count (0 of 1) and heat map (Nothing) don't move. The label contradicts itself ("1 of 1 time: not done yet"). Only the second check-in of the week shows as done.
Fix: for frequency habits, mark the planet done on any day with a check-in; label "1 of 2 this week"; count the day in the heat map.
- 02:31 "Every N days" habit (every 2 days, created Mon Nov 2) on the path: planet on Nov 2, 4, 6, 8 and absent on 3, 5, 7 (page.clock). Correct. Not tested: whether a missed day shifts the cycle. → LS-P24. Shot ls/LS-138-x-per-week.png
### LS-P24 — Checklist: "Every N days" habit planets appear on the right days — POSITIVE
- 02:31 Completed-task history: I injected tasks done on Oct 3 (32 days ago) and Oct 6 (29 days). Both show under "Done in the last 30 days", and both stay stored (nothing auto-deleted, which is good). The overdue task from Sep 25 shows "High · Overdue · Sep 25". → LS-037. Shot ls/LS-139-done-30d.png
### LS-037 — Tasks: "Done in the last 30 days" shows a task done 32 days ago — POLISH
Expected: the label matches the filter, or it says "Done". Todoist has a full Completed view; TickTick has a Completed list.
Actual: a task completed 2026-10-03 is listed on 2026-11-04 under "last 30 days". There's no view of older completed tasks either.
Fix: filter on doneAt ≥ today−30 (local), or rename to "Done", and add "Show all completed".

## Old-bug re-check (clean profile, build 17069c7)
| ID | Was | Status now | Evidence |
|---|---|---|---|
| T-110 | One Sleep tap saves 0-min night, overwrites last night | FIXED | Stop <10 min → "Stopped after less than ten minutes, so nothing was saved." (01:31) |
| LC-001 | Sleep tile family of T-110 | FIXED | same as T-110 |
| LC-002 | Water planet done after one glass | STILL OPEN | done after 250 ml with no target → LS-016 |
| LC-003 | Meditate habit vs Health unsynced | CHANGED | Meditate planet now writes Health ("10 min this week"); two "Meditate" controls remain on one screen |
| LC-004 | Seeded "· 12:00 AM" times | NOT REPRODUCED | demo-seed only; live ticks show real time ("1:31 AM") |
| LC-005 | List > More thin | STILL OPEN | only Open Habits / Close → LS-019 |
| LC-006 | Weigh-in from path | FIXED | -5 blocked "Choose 20 to 400 kg."; valid weight saved. (New one-tap "+70 kg" default issue → LS-007) |
| LC-007 | Own item limits | STILL OPEN | 60-char cut silently → LS-017 |
| LC-008 | Path labels | STILL OPEN (worse with volume) | first word only / category word ("Gym Monday"→"Exercise"; 60 × "Item") → LS-017 |
| LC-009 | Take off path, no Undo | FIXED | Undo toast present (but blocked by the open sheet → LS-018) |
| LC-010 | Focus fractional minutes, no Undo | STILL OPEN (narrowed) | "0.19 of 30 minutes" (was 9 decimals); end toast no Undo → LS-034 |
| LC-011 / M-136 | Fast saves 0.0 h | FIXED | <10 min → nothing saved |
| LC-012 / M-135 | Meditate "1 min" for seconds | FIXED | 40 s → "41 seconds" |
| LC-013 | Layout by width | FIXED | Path/List switch + heat map at 375 and 768 |
| LC-014 | Two "how done" numbers | CHANGED | still disagree in a new form → LS-024 |
| LC-015 | Light theme mix | STILL OPEN | dark planets on pastel sky → LS-020 |
| LC-016 | Make this a habit drops tick | STILL OPEN | re-verified 2/2 → LS-008 |
| LC-017 | ZIGi pill over card | NOT RE-TESTED here | ZIGi belongs to lisbon-ai.md; opening ZIGi crashes headless Chromium (LS-006) |
| BUG-034 | FABs cover controls at 768 | STILL OPEN (CHANGED) | Checklist launcher joined the stack; covers "Increase Pull-ups" etc. on /app/health; none on Checklist/Tasks/Agenda |

Tally: FIXED 7 · STILL OPEN 8 · CHANGED 2 · NOT REPRODUCED 1 · NOT RE-TESTED 1 (19 items).

### Log 02:34 — Quick add → Checklist path (375, mobile)
- **P25 (positive)** /app/today > Quick add: "drank 500 ml of water" → preview "Will save: Water · 500 mL · today" → Save → the Water planet on the Checklist path flips to "500 ml today: done". Screenshot ls/LS-140-quickadd-to-path.png.

**LS-038 — /app/today > Quick add NLP — MINOR**
Steps: at 375, open Quick add, type each of: "meditated", "meditated 15 minutes", "meditated for 15 min", "meditation 15 min", "15 min meditation" (a Meditate habit is already on the path).
Expected: logs a check-in on the existing Meditate habit (Todoist/TickTick quick add would at least match an existing item by name).
Actual: all 5 return "I didn't understand that yet. Try: drank 2 glasses of water · weight 78.4 · ran 5k in 28 min". Meditate stays "not done yet". Reproduced 5/5. Screenshot ls/LS-141-quickadd-to-path.png.
Fix: match the free text against the user's existing habit titles (fuzzy match on the word stem) before falling back to the health parser.

**LS-039 — /app/today > Quick add NLP — MINOR**
Steps: have a habit called "Journal 3 lines" (1×/day). In Quick add, type "did journal 3 lines" (or "journal 3 lines done") → Preview → Save.
Expected: one check-in (1 of 1 time).
Actual: the preview says "Journal 3 lines · +3 times"; after Save the toast says "Saved: Journal 3 lines · 4 of 1 time today" and the path shows "4 times: done". The digit in the habit's own title gets read as a count. Reproduced 2/2 for the preview, 1/1 for the save. Screenshot ls/LS-140-quickadd-to-path.png.
Fix: take the matched habit-title span out of the string before pulling out numbers; cap the count at the target or ask "Log 3?".

### Log 02:35 — Quick add past dates
- **P26 (positive)** Quick add reads "yesterday": "drank 2 glasses of water yesterday" → "Water · 2 glasses (500 mL) · yesterday"; "weight 78.4 yesterday" → "Weight · 78.4 kg · yesterday". This is a partial way around LS-032 for health items. Screenshot ls/LS-142-quickadd-to-path.png.

**LS-040 — /app/today > Quick add NLP — MINOR**
Steps: at 375, in Quick add, type "ran 5k in 28 min on monday" → Preview.
Expected: dated Monday (2 Nov 2026), or a warning that the date wasn't understood.
Actual: "Will save: Run · 5 km · 28 min · today". "on monday" is dropped without a word. Reproduced 1/1. Screenshot ls/LS-142-quickadd-to-path.png.
Fix: parse weekday names (past-leaning for logs), like Todoist's date parser; if any words are left unparsed, show them in the preview.

### Log 02:35 — Quick add a11y, Light + Dark at 375
- **P27 (positive)** With the Quick add preview open, axe WCAG 2 A/AA finds 0 violations in both Light and Dark. Esc closes the panel. No console errors. Screenshots ls/LS-143-quickadd-light.png and ls/LS-143-quickadd-dark.png.

### Log 02:36 — Quick add Save: Undo and reload
- After Save, the entry survives navigation and reload ("Water: 500 ml today: done").

**LS-041 — Quick add > Save — MINOR**
Steps: at 375, in Quick add, enter "drank 500 ml of water" → Preview → Save.
Expected: an Undo on the confirmation, like the Undo toasts elsewhere in the app, Todoist's "Undo" after quick add, and TickTick's undo snackbar.
Actual: only the status "Saved: …" appears. There's no Undo button. To reverse it you have to find the entry on the Checklist/Health side. Reproduced 1/1. Screenshot ls/LS-144-quickadd-saved.png.
Fix: add Undo to the save toast for about 5 s and remove the entry it created.

### Log 02:37 — Build header and Quick add at 768/1280, Light + Dark
- Build header x-zigoals-build: 17069c7d89824a3799f6749beb37e6ab50122b4a. Unchanged since the start of the run.
- **P28 (positive)** The Quick add dialog renders cleanly at 768 and 1280 in Light and Dark, with no horizontal overflow (scrollWidth equals the viewport). The preview and the Save/Clear buttons are clear. Screenshots ls/LS-145-quickadd-{768,1280}-{light,dark}.png.

### Log 02:37 — Quick add across midnight (fake clock, Europe/Brussels)
- **P29 (positive)** Preview "weight 77.9" at 23:59:30, then wait past midnight and Save. The entry is stored with date 2026-11-05 (createdAt 00:00:34 Brussels), so "today" is worked out at save time, not frozen at preview time. No duplicate, no error. Screenshot ls/LS-146-quickadd-midnight.png.

### Log 02:37 — Quick add input checks
- **P30 (positive)** Bounds are clear: "drank 999999 glasses" → "That number is outside what the journal keeps."; "weight 0" → "Use a number above zero."; 600 chars of junk → the generic hint with no layout break. A line with an HTML tag in it was parsed as Water with no script run and no markup rendered. Screenshot ls/LS-147-quickadd-to-path.png.

**LS-042 — Quick add > validation copy — POLISH**
Steps: in Quick add, type "weight -5" → Preview.
Expected: the same helpful message as "weight 0" ("Use a number above zero.").
Actual: the generic "I didn't understand that yet. Try: …". Reproduced 1/1. Screenshot ls/LS-147-quickadd-to-path.png.
Fix: treat a leading minus as a number, then run it through the same >0 check.

### Log 02:38 — LS-004 re-verified
- "buy milk tomorrow" and "call the dentist friday p1" → "I didn't understand that yet". There's still no Task intent in Quick add (2/2). Screenshot ls/LS-148-quickadd-to-path.png. LS-004 stands.

## Per page — Quick add (global)
- **Works:** health lines (water, weight, run) with units and "yesterday"; preview before save; save rolls over correctly at midnight; bounds messages; Esc closes; axe clean in Light and Dark; no overflow at 375/768/1280; entries flow onto the Checklist path (Water).
- **Missing vs Todoist and TickTick:** no Task intent and no Task tile (LS-004); no weekday or date words beyond "yesterday" (LS-040); no matching to existing habit names such as Meditate (LS-038); no Undo after Save (LS-041); no #project, @label or p1 tokens; no highlighting of parsed words.
- **Copy/UX:** the fallback hint lists only health examples, so it doesn't say that tasks aren't supported; the digit in "Journal 3 lines" is counted as 3 check-ins (LS-039); "weight -5" gets the generic hint (LS-042).

### Log 02:50 — stability check
- Build unchanged (17069c7). LS-004 reproduced again 2/2.

### Log 03:03 — stability check
- Build unchanged. LS-041 reproduced again 2/2 (no Undo after Quick add Save).

## Hands-on desktop pass (real Chrome, shared normal profile — Incognito unavailable), 03:06–03:11 Nov 4 — IDs LS-H01+
Screens in /workspace/zigoals/shots/2026-11-04/ (hash filenames, prefix noted).
- LS-H01 MAJOR · Tasks > Goal dropdown · Fresh empty Tasks page shows goals "Emergency fund" and "🎯 WWWW…(~80 W)" I never created. Likely cross-bot contamination (shared profile), NOT logged as app bug yet. Shot 48675f91….png
- LS-H02 POSITIVE · Tasks > add · 11 tasks created; 170-char name wraps to 2 lines (not cut to one word on /app/tasks); "0 / 140" counter. Shot 2f9ca2b4….png
- LS-H03 MINOR · Tasks > add · >140 chars silently truncated ("…properly in the list"), toast just "Added". Expected: block input or warn (Todoist warns). Fix: hard maxlength + inline counter turning red. Shot 2f9ca2b4….png
- LS-H04 POSITIVE · Tasks > grouping · Due Nov 5 → "Next 7 days / Due Thu, Nov 5"; undated → "Someday"; High badge shows.
- LS-H05 MAJOR (gap) · Tasks > More options/Edit · Only Priority, Due, Time (disabled until day picked), Goal. No recurrence, no subtasks, no labels/projects. Todoist/TickTick: natural-language recurrence + nested subtasks. Fix: add Repeat + subtasks. Shot 27ea9958….png
- LS-H06 POSITIVE · Tasks > complete · "Done: … Undo" restores.
- LS-H07 MINOR · Tasks > Remove · Deletes without confirm; inline "Removed … Undo" works but is small text, easy to miss. Fix: toast with 5–8 s Undo like Todoist. Shot 141bde51….png
- LS-H08 POSITIVE · Tasks > Edit · Inline form, Enter saves, "Saved … Undo".
- LS-H09 MINOR · Tasks > Edit · Esc does not cancel the edit form (checked once). Expected cancel (Todoist). Fix: Esc = cancel.
- LS-H10 NOT TESTED · drag reorder (no handles seen).
- LS-H11 POSITIVE/gap · Tasks > Focus · Pomodoro panel 25/5/15, 4 blocks, sound, auto-complete option; countdown runs; early end → "Run ended. 0 blocks grown, in your garden." No "Not saved" label seen; reload ends run. Persistence of completed block not verified. Shot 6e23dde3….png
- LS-H12 POSITIVE · Tasks > reload · 11 tasks + edit persisted; "On this device only" + PUBLIC ALPHA banner.
- LS-H13 MAJOR (naming) · Nav "Checklist" (/app/checklist) · Opens full-screen "Your orbit" habit tracker (planets, streak, 12-week grid), not a task checklist: no due dates, priorities, subtasks. Users expecting Todoist-style list will be confused. Fix: rename (e.g. "Daily Orbit") or merge Tasks into it. Shot dcb2068e….png
- LS-H14 MINOR · Checklist > quick add · ~105-char habit name silently cut to ~80 ("…cut to one word in the orbit"). Fix: counter + warning. Shot 140b8120….png
- LS-H15 POLISH · Checklist > quick add · "Opening quick add…" for 2–3 s before form appears. Fix: render form instantly. Shots c1a46053….png, 58c30c5f….png
- LS-H16 MINOR · Checklist > complete habit · Completion + streak 1 + "All 1 planet lit!" overlay (Esc closes); undo toast vanishes in a few s, no visible un-complete afterwards (More menu not checked). Fix: tap again to un-complete. Shot c8bac554….png
- LS-H17 POSITIVE · Checklist > List view · groups by orbit, "Complete ✓" chip, 12-week grid. Shot f2c328d1….png
- LS-H18 POSITIVE · Checklist responsive · At 300% zoom (~430 px) clean reflow. Shots 23b875dc….webp, 6fd03c36….webp
- LS-H19 POSITIVE · Checklist · Esc closes overlay; × returns to app.
Leftover test data in shared profile: 11 "QA …" tasks, 1 "QA Habit…" (completed today).

### Log 03:15 — Deep pass: views, form, search, shortcuts (1280, clean context, fake tasks)

**LS-043 — Tasks/Home > Ctrl+K crashes the tab — MAJOR (headless Chromium; may share a root with LS-006)**
Steps: open /app/tasks or /app in a fresh context, click the page heading, press Ctrl+K.
Expected: a command palette or search opens. In Todoist, Ctrl/Cmd+K is the command menu; in TickTick it's search.
Actual: the renderer crashes ("Page crashed", crash event; the last console line is only a Permissions-Policy warning). Reproduced 2/2 on /app/tasks and 2/2 on /app. On /app/checklist, Ctrl+K focuses a dialog element and doesn't crash (2/2). Screenshot (state just before the key press; the crash leaves nothing to capture): ls/LS-157-ctrlk-before.png. Script: /workspace/qa/ls92.py.
Fix: find what the Ctrl+K handler mounts on Tasks/Home (probably the ZIGi panel, see LS-006), guard it, and map Ctrl/Cmd+K to the global search that "/" already opens. Re-check in desktop Chrome before release.

**LS-044 — Tasks > keyboard set vs Todoist — MINOR (extends LS-014)**
Steps: on /app/tasks, with focus on the page, press each of q, a, n, ?, j, k, e, g, 1, Delete, Ctrl+Z, t, Shift+Enter.
Expected (Todoist): q = quick add; ? = shortcut list; j/k = move between tasks; e = complete; 1–4 = priority; Delete = delete; Ctrl+Z = undo; t = set date; g+t = go to Today. TickTick has a similar set (Ctrl+N, ?, etc.).
Actual: none of them does anything (focus stays on BODY, no dialog, URL unchanged). Shift+/ ("?") opens the global Search instead of a shortcut list. "/" opens Search (ok). Ctrl+K crashes the tab (LS-043). Reproduced 1/1 for each key. Script: /workspace/qa/ls91.py.
Fix: q/n focus the new-task input; ? opens a shortcut sheet; j/k + e/1–3/Delete on a focused row; Ctrl+Z undoes the last tick or delete.

**LS-045 — Tasks > views: no Board or Calendar for tasks; Agenda is the only calendar — MINOR (scope; LS-002 already notes no projects)**
Steps: open /app/tasks?view=board, ?view=calendar, /app/calendar, /app/board, /app/filters, /app/projects, /app/labels.
Expected: Todoist has List/Board/Calendar layouts on every project plus saved Filters and Labels pages; TickTick has List/Kanban/Timeline and a Calendar with Day/Week/Month.
Actual: the ?view= parameters are ignored (the same list renders). The five paths return 404 "Page not found." /app/agenda does have Day/Week/Month buttons (a positive: P31). There are no draggable elements anywhere ([draggable=true] count is 0 on Tasks and Agenda), so you can't drag to reschedule in Month view the way TickTick lets you. Screenshots: ls/LS-150-agenda-views.png, ls/LS-153-agenda-month.png, ls/LS-153-agenda-week.png.
Fix: add a Board layout grouped by priority or due bucket on /app/tasks, plus drag-to-reschedule in Agenda Week/Month.

**LS-046 — Tasks > recurrence, subtasks, sections, projects: confirmed absent — MAJOR (re-confirms LS-002/LS-003 in depth)**
Steps: open the New task form via More options and read every control; check the stored shape in localStorage zigoals:tasks:v1.
Expected (Todoist/TickTick): repeat "every weekday", "every 3rd" (monthly by date), "every! 2 weeks" (repeat after completion), end date ("until 1 Mar" / end count), edit this vs all occurrences, nested subtasks with drag reorder, sections, moving tasks between projects.
Actual: the form has only New task, Priority (High/Normal/Low), Due, Time and Goal (No goal / Run a 10K). There is no Repeat, Parent, Section or Project control, and no drag handle (draggable count is 0, no aria-level nesting). Typed rules ("every weekday", "every month on the 1st") stay in the title verbatim (see LS-001). None of the recurrence cases (weekday, monthly 3rd, after completion, end date, one vs all) can be tested, because the feature is absent, not broken. The nearest equivalent is Habits (/app/habits?add=habit: weekdays, every N days, X per period; P19/P24). It has no monthly-by-date rule and no end date. Screenshot: ls/LS-151-task-form.png.
Fix: add a Repeat field (daily / weekdays / weekly on … / monthly on day N / every N after completion / ends on date or after N). Ticking rolls the due date forward with Undo. Editing asks "This task / All future". Add one level of subtasks with drag reorder, plus Lists with sections and a "Move to…" action.

**LS-047 — Global Search > no task results, no operators — MAJOR (re-confirms LS-005; adds combined queries)**
Steps: press "/" on /app/tasks and type "milk", "p1", "milk & today", "#work", "priority:high", "due:today".
Expected (Todoist filters): "p1 & today", "#work", "due:today", "search: milk"; TickTick has advanced filters by list, tag, priority and date.
Actual: every query returns "Nothing on this device matches …" plus "Ask ZIGi", except "#work", which matches goal templates by the word. Operators are treated as literal text, and there is no saved-filter feature (/app/filters is a 404). Screenshot: ls/LS-152-search-combined.png.
Fix: index tasks in Search. Support p1–p3, today/overdue/7 days, goal:… and & / | combos, and let users save one as a filter chip on /app/tasks.

- **P31 (positive)** Agenda has Day / Week / Month switching with ←/Today/→, export and calendar import. It's the closest thing to TickTick's calendar views. Screenshot: ls/LS-153-agenda-month.png.

### Log 03:15 — Offline add/edit/delete with two tabs (context.set_offline)
- **P32 (positive)** Offline (warm service worker), tab A adds "QA offline add" and renames "Call plumber" to "Call plumber A". Tab B picks this up live while offline, renames the task to "Call plumber B" and removes "Sort photos" (with "Removed … Undo"). An offline reload of A shows all the changes. After reconnecting and reloading, both tabs show the same list with nothing lost and no duplicates. Screenshots: ls/LS-158-offline-A.png, ls/LS-158-offline-B.png, ls/LS-159-reconnect.png. Script: /workspace/qa/ls94.py.

**LS-048 — Tasks > sync model: last write wins with no notice; device-only — MINOR (scope vs Todoist/TickTick)**
Steps: as above, with A and B editing the same task title in turn.
Expected: Todoist and TickTick sync across devices and keep both edits, or flag the conflict in the activity history.
Actual: B's edit silently replaces A's (the final title is "Call plumber B"), with no history or notice. There's no server sync, so a second device never sees these tasks ("Nothing here leaves this device"). Within one browser this is consistent; it's a design limit, not data loss. Reproduced 1/1. Screenshot: ls/LS-159-reconnect.png.
Fix: keep a per-task updatedAt and show "Changed in another tab" when the open editor's base is stale. Point to the encrypted backup (once LS-025 is fixed) as the way to move between devices.

### Log 03:22 — Hands-on Tasks at 375: 24 tasks, edge cases, complete / un-complete / delete / undo / reload (fresh context, fake data)
Added 24 tasks by typing + Enter: "QA task 01"–"15", "0", "-5", "99999999999999999999", "🦄🔥 emoji task 👩‍👩‍👧", "QA dup" twice, three spaces, 200×"L", `<b>bold</b> & "quotes"` and "مهمة عربية RTL". Script: /workspace/qa/ls97.py.
- **P33 (positive)** "0", "-5", a 20-digit number, emoji with ZWJ sequences, HTML-like text and Arabic are all stored and shown verbatim and escaped (24 stored, 24 rows). Duplicates are allowed, as in Todoist. Long text wraps with overflow-wrap:anywhere; no horizontal overflow at 375 (scrollWidth 375). Completing 5 tasks moves them to "Done in the last 30 days" with a "Done: … Undo" toast. Un-ticking 2 from there ("Mark … not done") restores them. Edit a duplicate → only that one changes ("QA dup" + "QA dup second"). After a reload, the store is byte-identical and shows 22 rows. Screenshots: ls/LS-161-tasks-22-375.png, ls/LS-163-after-reload.png, ls/LS-164-long-emoji-dark.png, ls/LS-164b-emoji-dark.png.

**LS-049 — Tasks > new task: blank title is ignored with no feedback — POLISH**
Steps: /app/tasks at 375, type three spaces in "Call the dentist", press Enter.
Expected: an inline hint ("Type a task first"), or the spaces cleared. Todoist disables Add; TickTick ignores the input but clears it.
Actual: nothing happens. The spaces stay in the input, no message appears, and the live region still says the previous "Added “QA dup”." Reproduced 1/1. Screenshot: ls/LS-161-tasks-22-375.png.
Fix: trim the value and show a small hint or a disabled-Add state.

**LS-050 — Tasks > 140-character limit truncates silently — MINOR**
Steps: type or paste a 200-character title, press Enter.
Expected: a counter or a warning near the limit. Todoist allows long titles plus a description; TickTick allows long titles.
Actual: maxlength=140 cuts the input at 140 characters with no counter or message. The saved title is 140 "L"s, and the last 60 are lost without a word. Reproduced 1/1 (stored length 140). Screenshot: ls/LS-164-long-emoji-dark.png.
Fix: show "140/140" when near the limit, and add a Notes field (LS-002) for longer text.

**LS-051 — Tasks > delete Undo only covers the last delete — MINOR**
Steps: remove "QA task 10", "QA task 11" and "QA task 12" in quick succession, then press the one visible Undo.
Expected: Todoist stacks undos (Ctrl+Z repeatedly), and TickTick keeps a Trash for 30 days, so all 3 can be brought back.
Actual: each delete replaces the toast. Undo restores only "QA task 12"; 10 and 11 are gone for good (no Trash, Ctrl+Z does nothing, see LS-044). Reproduced 1/1. Screenshot: ls/LS-163-after-reload.png.
Fix: a stacked undo or a "Recently removed" list that keeps items for 7–30 days.

**LS-052 — Tasks > edit with blank title: Save is disabled with no reason — POLISH**
Steps: Edit "QA task 06", clear the title (spaces), and try Save or press Enter.
Expected: an inline message such as "A task needs a title".
Actual: Save is disabled (disabled=true), Enter does nothing and the form stays open, with no message. The data is safe (06 is unchanged). Reproduced 1/1. Screenshot: ls/LS-162-edit-empty.png.
Fix: add aria-describedby with a short hint when the title is empty.

- Note: color_scheme=light in the context still renders the dark theme, because the theme comes from the app setting, not prefers-color-scheme (see LS-020). ls/LS-164-long-emoji-light.png.

### Log 03:30 — Hands-on Checklist at 375 and 1280: 12 new habits on the path (21 items), tick / tap again / undo / reload, edge names
Created 12 habits at /app/habits?add=habit in a fresh context: "QA Stretch", "QA Floss", "QA Vitamins", "QA Walk dog", "QA Plants", "0", "-5", "🧘‍♀️ Breathe 🌬️", "QA Stretch" (duplicate), 120×"M", `<i>x</i> & "q"` and "تأمل RTL". All were added to the path via Checklist menu > Edit path. Scripts: /workspace/qa/ls100.py–ls106.py.
- **P34 (positive)** All 12 habits were created ("Habit created."), and each "Add … to your path" button worked, giving 21 items in List view. On the path, 17 orbit-node buttons plus the meal nodes have no overlapping hit areas (smallest 62×62 px) and no horizontal overflow at 375 or 1280. Ticking "QA Floss", "QA Vitamins", "0", "-5" and the emoji habit gives "… logged for today. Undo", and Undo reverts. A reload keeps the ticks. Names with markup are escaped. Screenshots: ls/LS-166-path-many-375.png, ls/LS-167-path-21-375.png, ls/LS-168-path-ticked-reload.png, ls/LS-170-path-vs-list-375.png.

**LS-053 — Checklist > path labels: derived short names are ambiguous and garbled — MINOR (extends LS-017 / LC-007)**
Steps: create the habits above, add them to the path, switch to Path view at 375 and read the label chip next to each planet.
Expected: the label shows the habit's own name, shortened with an ellipsis ("QA Vitam…"), so every planet can be told apart. TickTick and Todoist always show the full title.
Actual: an unpredictable single word is kept:
"QA Floss" → "QA", "QA Plants" → "QA" (two planets with the same label);
"QA Vitamins" → "Vitamins", "QA Walk dog" → "Walk";
"0" → "Step" and "-5" → "Step" (the name is replaced with a generic word);
`<i>x</i> & "q"` → "I>x" (stripped markup shows through);
120×"M" → "MMMMMMMMMMMM".
The two "QA Stretch" habits both read "Stretch" and look identical. Only the aria-labels, which keep the full name, tell them apart. Reproduced 2/2 (375 and 1280). Screenshots: ls/LS-172-path-longname.png, ls/LS-173-path-duplicates.png, ls/LS-174-path-rtl.png.
Fix: use the full title with CSS ellipsis (two lines max) and never fall back to "Step". When two items share a name, add "(2)".

**LS-054 — Habits > duplicate habit names accepted with no warning — POLISH**
Steps: create the habit "QA Stretch" twice.
Expected: a gentle "You already have QA Stretch. Add another?" prompt. TickTick warns when a habit name already exists.
Actual: both are created silently and sit on the path as two identical "Stretch" planets (LS-053). Reproduced 1/1. Screenshot: ls/LS-173-path-duplicates.png.
Fix: a soft duplicate check on the title.

**LS-055 — Checklist > tapping a done planet again does nothing and gives no hint — POLISH**
Steps: tap "QA Floss" (it becomes "1 time: done"), then tap it again.
Expected: either un-tick (TickTick: tap again to undo a check-in) or a short "Already done today · Undo" message.
Actual: no change and no new status (the live region still shows the previous habit's message). The only way back is the Undo toast while it's visible, or opening the item. Reproduced 1/1. Screenshot: ls/LS-168-path-ticked-reload.png.
Fix: a second tap opens a small sheet with "Undo today's check-in".

### Log 03:32 — Checklist inline log fields (Water in ml, Weigh in in kg): 0, negative, huge, text, decimal, empty (375; fresh context for each value)
- **P35 (positive)** Range checks hold and nothing is stored on bad input. Water: 0, -5 and 99999 give "Choose 1 to 5,000 ml."; "abc" and an empty field give "Enter a number." Weigh in: 0, -5, 99999 and 2.5 give "Choose 20 to 400 kg." The planet stays "not done yet". Script: /workspace/qa/ls108.py. Screenshots: ls/LS-176-Water--5.png, ls/LS-176-Water-99999.png, ls/LS-176-Weigh-99999.png.

**LS-056 — Checklist > Water: 2.5 ml is accepted, shown as "3 ml" and marks Water done — MINOR (related to LS-016 / LC-002)**
Steps: at 375 in Path view, tap Water, type 2.5 in "Water in ml", tap "Log 2.5 ml".
Expected: either reject amounts below a sensible step (e.g. "Choose 1 to 5,000 ml" should already exclude 2.5 if whole ml are meant), or keep 2.5 and show "2.5 ml". In either case Water isn't done until the daily target is reached.
Actual: the toast says "2.5 ml of water logged. Undo", the planet changes to "Water: 3 ml today: done" (rounded up and marked complete) and the Morning Orbit counts it as done. Reproduced 1/1. Screenshot: ls/LS-177-water-2p5-done.png; script /workspace/qa/ls108.py, ls109.py.
Fix: step=1 integer validation for ml. Water should count as done only at the target (see LS-016), and amounts should show without rounding.

**LS-057 — Checklist > inline log button echoes invalid text — POLISH**
Steps: type "abc" (or -5, or nothing) into "Water in ml" or "Weigh in in kg".
Expected: the button stays "Log" or is disabled until the value is valid.
Actual: the button reads "Log abc ml", "Log -5 kg" or "Log … ml" and is enabled. The error appears only after tapping. Reproduced for each value. Screenshot: ls/LS-176-Water--5.png.
Fix: use inputmode=decimal or type=number with min/max, validate while typing, and keep the label "Log" until the value is valid.

### Log 03:34 — Checklist > Edit path: reorder (keys and drag), remove ×3, undo, reload (375, 21 items)
- **P36 (positive)** Each row has "Move …: drag, or use the arrow keys". Three ArrowUp presses move "QA Plants" up 3 places, and the live region says "QA Plants moved up." A touch-style drag moves "QA Floss" down 3 places. The order survives Done + reload. Removing an item says "-5 is off your path. Its records stay on its page.", and the habit really stays on /app/habits. Better than Todoist and TickTick, where delete is destructive. Screenshots: ls/LS-179-reorder.png, ls/LS-182-habits-after-remove.png. Scripts: /workspace/qa/ls110.py, ls111.py, ls112.py.
- **LS-018 re-verified (2/2):** with the Edit path sheet open, the toast's Undo can't be clicked ("checklist-sheet … intercepts pointer events") until the sheet closes. Screenshot: ls/LS-181-remove-3.png.

**LS-058 — Checklist > Edit path: Undo restores only the last of several removals — MINOR**
Steps: in Edit path, remove "-5", "0" and "QA Stretch" one after another, tap Done, then tap the toast's Undo.
Expected: all three removals can be undone (stacked Undo), or the sheet offers "Put back" for recently removed items.
Actual: Undo brings back only "QA Stretch" (path 19 items; "-5" and "0" stay off). They can be re-added from the add list, but their position and orbit are lost. Reproduced 1/1. Screenshot: ls/LS-181-remove-3.png.
Fix: a stacked undo while the sheet is open, or a "Recently removed · Put back" row.

**LS-059 — Checklist > Remove has no confirmation and its Undo is hidden behind the sheet — POLISH (combines with LS-018)**
Steps: in Edit path, open "Change -5" and tap Remove.
Expected: either a confirmation, or an Undo that can be reached right away.
Actual: the item is removed at once. The only safety net is a toast hidden behind the sheet (LS-018) that has often timed out by the time the sheet closes. Reproduced 3/3. Screenshot: ls/LS-181-remove-3.png.
Fix: put the Undo inside the sheet, or raise the toast above the sheet (z-index) while it's open.

- LS-056 evidence: ls/LS-177-water-2p5-done.png (Water planet "3 ml today: done" after logging 2.5 ml).

### Log 03:35 — Tasks: editing priority, due and time on 6 tasks, and grouping (375, 22-task list)
- **P37 (positive)** Edits land in the right groups straight away: Today 1 (07 High 9:00 AM), Next 7 days 2 (08 Low Nov 5; 09 High Nov 8 11:59 PM), Later 2 (13 Dec 31 12:00 AM; 15 next year), Someday 14. High sorts first within each group. Time is disabled until a due date is set, and a cleared due date drops the time. The store matches the UI exactly. Screenshot: ls/LS-183-tasks-edited-groups.png. Script: /workspace/qa/ls113.py.

**LS-060 — Tasks > due-date label drops the year — MINOR**
Steps: Edit "QA task 15", set Due to 2027-11-04, Save (today is Wed 4 Nov 2026).
Expected: "Due Thu, Nov 4, 2027". Todoist and TickTick add the year for dates outside the current year.
Actual: "Low · Due Thu, Nov 4". This reads like today's date with the wrong weekday, and only its place under "Later" hints that it isn't today. Reproduced 1/1 (stored due 2027-11-04). Screenshot: ls/LS-183-tasks-edited-groups.png.
Fix: add the year when the date isn't in the current year, or is more than about 6 months away (Intl.DateTimeFormat with year:'numeric').

### Log 03:36 — Tasks: double-tap, undo complete, complete all 22, remove all 22, empty states (375)
- **P38 (positive)** A double-tap on a checkbox completes the task exactly once (no flicker back). "Done: … Undo" fully reverses a completion. Ticking all 18 open tasks shows a kind empty state ("Nothing left to do · Every task is done. Add the next one above when it comes."), with "Done in the last 30 days 22". Removing all 22 brings up the first-run state ("Your list starts here …"). The store is empty after reload, with no ghost rows. Screenshots: ls/LS-184-all-done.png, ls/LS-185-all-removed.png. Script: /workspace/qa/ls114.py.

**LS-061 — Tasks > no bulk actions: clearing 22 tasks takes 22 Removes — MINOR (vs Todoist/TickTick)**
Steps: with 22 done tasks, try to clear them all.
Expected: Todoist has multi-select (Shift-click) with bulk complete, move and delete; TickTick has batch edit and "Clear completed".
Actual: each task needs its own "Remove" tap (22 taps), and only the last can be undone (LS-051). There's no "Clear done" in the "Done in the last 30 days" group. Reproduced 1/1. Screenshot: ls/LS-184-all-done.png.
Fix: add "Clear done (22) · Undo" to the Done group, plus long-press multi-select at 375.
- Copy note: "Open 0 tasks" reads oddly next to "Nothing left to do". Consider "Open · none".

### Log 03:37 — Checklist > Edit path > "Your own item": 12 entries with edge cases (375, fresh context)
- **P39 (positive)** "QA own 1"–"4", "0", "-5", 60×"9", "🍎 Apple 🍏", `<s>x</s>` and "שלום RTL" each give "… added to your path." The input clears for the next one, all 10 survive a reload, and markup is escaped. Screenshots: ls/LS-187-own-items-sheet.png, ls/LS-188-own-items-path.png. Script: /workspace/qa/ls116.py.

**LS-062 — Checklist > own item: duplicate and blank names show a false storage error — MINOR**
Steps: in Edit path > "Your own item", add "QA own 1", then add "QA own 1" again; separately, type two spaces and tap "Add to path".
Expected: "You already have QA own 1 on your path" / "Type a name first" (or a disabled button).
Actual: both show "Not saved on this device. Try again." This wrongly suggests a device or storage failure, and trying again can never succeed. The Add button stays enabled. It's also inconsistent with Habits, where duplicates are accepted (LS-054). Reproduced 1/1 for each. Screenshot: ls/LS-187-own-items-sheet.png.
Fix: give the duplicate and empty cases their own messages, disable Add while the trimmed value is empty, and reserve "Not saved on this device" for real write failures.

### Log 03:38 — Checklist own items: tick, tap again, rename (375)
- **P40 (positive)** Ticking own items "QA own 1", "QA own 2", "0" and "🍎 Apple 🍏" gives "… logged for today. Undo". Tapping a done own item again un-ticks it ("QA own 1: open again. Undo"), the same as TickTick. Ticks survive a reload. Screenshot: ls/LS-189-own-ticked.png. Script: /workspace/qa/ls117.py.
- **LS-055 update:** this makes LS-055 an inconsistency. Own items toggle on a second tap, but habit planets ("QA Floss") ignore it.

**LS-063 — Checklist > own item can't be renamed — MINOR**
Steps: Edit path > "Change QA own 2: orbit, colour, place".
Expected: a name field, since a typo is fixable everywhere in Todoist and TickTick.
Actual: the sheet offers only orbit radios (Morning/Afternoon/Evening/Anytime), colour, ↑/↓ and Remove. No field contains "QA own 2". The only fix is to remove the item and re-add it, which loses its history (Remove's records note applies to habits, not own items). Reproduced 1/1. Screenshots: ls/LS-180-change-sheet.png, ls/LS-190-own-renamed.png.
Fix: add a "Name" field to the Change sheet, using the same 60-character limit as Add.

### Log 03:40 — a11y with full data sets at 375, Light and Dark (theme set in Settings)
- **P41 (positive)** axe (WCAG 2.0/2.1 A/AA and 2.2 AA) finds 0 violations on /app/tasks with 22 edge-case tasks, /app/checklist with 10 own items, and /app/checklist with 21 habit/health items (List view persisted), in both Light and Dark. Screenshots: ls/LS-191-*.png. Script: /workspace/qa/ls118.py. Note: LS-023's 22 px Agenda tick boxes weren't on these pages.

### Log 03:46 — Habits linked to the Checklist: counters, rename, archive and delete (375, 21-item path)
- **P42 (positive)** On /app/habits, three "Add one to QA Walk dog" taps make the planet "3 times: done". Three "Remove one" taps bring it back to "not done yet", and the minus button is then disabled, so the count can't go below 0. Renaming "QA Vitamins" to "QA Vitamins D3 💊" ("Habit saved.") is reflected on the Checklist path with today's tick kept ("QA Vitamins D3 💊: 1 time: done"). Deleting takes two deliberate steps: Options > "Archive habit…" opens a dialog ("It leaves your lists today. Its history is kept; you can restore it, or then delete it for good."), then the Archived list offers "Restore habit" / "Delete for good…". That's safer than Todoist and TickTick, where delete happens in one step. Screenshots: ls/LS-193-habit-renamed-path.png, ls/LS-194-habit-options.png, ls/LS-197-archived-habits.png. Scripts: /workspace/qa/ls120.py–ls122.py.
- Note: no Undo toast after Archive, although Restore covers it. In two runs, /app/habits page loads hit 30 s networkidle timeouts at about 03:41–03:44. A curl at the same time returned 200 in 2.5 s, so I'm treating this as server/network slowness and not filing it.

## Hands-on desktop pass 2 (Incognito, real Chrome), 03:16–03:45 Nov 4 — LS-H20+
Shots in /workspace/zigoals/shots/2026-11-04/ (hash prefix given).
- LS-H20 MAJOR · Tasks > Focus · 15-min block with "mark done when finished" ran to end: panel vanished, task NOT ticked, no message, nothing in /app/activity. Expected (TickTick): completion notice, focus time logged, task ticked + Undo. Caveat: panel says blocks count only when tab is "open and in front"; automation may count as away — re-verify by hand. Min block 15 min (no short test option). No "Not saved" label seen anywhere. Shots cf54cdd7, b348f95c, 3c203909. Fix: always show end-of-block result; log partial focus; add 1-/5-min options.
- LS-H21 MAJOR · Tasks > add/edit · No recurrence, no subtasks (confirms LS-H05). Empty-state copy mentions "a goal" but this Incognito form had no Goal field. Shots 98b22a5e, 26e37475.
- LS-H22 MAJOR · Tasks > reorder · No drag handle, no move up/down; drag only selects text. Todoist/TickTick: drag + keyboard move. Shot b787313b.
- LS-H23 MINOR · Checklist > List view · No drag reorder in List. POSITIVE: Edit path has accessible handles ("drag, or use the arrow keys", ArrowUp announced "Read book moved up"); mouse drag lands one slot short of the drop. Shots 763310f4, 15d4434c.
- LS-H24 POLISH (probable artifact) · Checklist > Edit path · Interrupted mid-drag left the page stuck until mouse release. Shot bb07c19c.
- LS-H25 MAJOR · Tasks > keyboard · q/a/n/? do nothing (Todoist: q = quick add). POSITIVE: "/" opens Search; logical Tab order; Space ticks with Undo; disabled Add skipped by Tab.
- LS-H26 MINOR · Checklist > un-complete · Second tap opens "Done at… / Undo this tick" panel (works) rather than un-ticking; not discoverable. /app/habits "✓ Done" un-ticks directly. Shots 1746f3e9, cf355917.
- LS-H27 POSITIVE · Habits > Schedule · Every day / Selected weekdays / Every N days / X per period / Specific dates; validation for empty title and N=0 ("whole number 2–365"). Shots 094bee83, ed812c2d.
- LS-H28 MINOR · Checklist quick add · Only "Every day"/"Chosen days"; no hint that richer repeats live on Habits. Shot a70b9787.
- LS-H29 MINOR · Checklist > naming · "H1 water" shows as "Water" in Path but "H1 water" in List; quick-add limit 80 vs full form 100, 120 chars cut silently to 80; duplicates accepted silently; empty/whitespace silently refused with no error. POSITIVE: emoji and HTML render safely. Shots 85f1c058, f1f43689, 97a69cc0.
- LS-H30 POSITIVE · Tasks > edge names · Empty/whitespace disables Add; 140 counter; duplicates, emoji, 200 chars, <script> accepted and escaped; edit to "High / Due today" moves task to Today with Undo. Shots d625d2a2, 524a6b70.
- LS-H31 POSITIVE/MINOR · Tasks > delete · Remove + Undo; deletion persists after reload; empty Someday section disappears. MINOR: blank gap remains above list where status line sits. Shot bf806ac9.
- LS-H32 MINOR · Habits > archive/edit timing · Archive confirms clearly (two-step delete, good) but habit stays visible until tomorrow ("leaves your lists from Nov 5"); title edits "effective from" tomorrow. Confusing vs Todoist's immediate change. Shots 2f45fc82, 6be0a67c.
- LS-H33 MAJOR · Tasks @ ~430 px (300% zoom) · Floating ZIGi bubble covers row "Remove"; sticky header covers section headings; sidebar rail eats ~13% width. POSITIVE: header collapses to one line, add form works. Shots ee15e0b0.webp, 4be0a687.webp. (Same class as old L-059/L-087.)
- LS-H34 POSITIVE/MINOR · Theme · Light/Nebula/Dark persist; MINOR: theme radios buried at bottom of sidebar. Checklist dark mode NOT verified (timeout). Shots a529a872, cd6ddc9f.
- LS-H35 POSITIVE · Persistence · tasks, habits, theme survive reload; PUBLIC ALPHA local-only notice.

## TOP 10 (written 03:46 Brussels, build 17069c7d89824a3799f6749beb37e6ab50122b4a)
1. **LS-025 (MAJOR)**: the encrypted backup leaves out Tasks and Checklist, and the readable export can't be restored (NOT_A_BACKUP). Data can't move between devices.
2. **LS-043 (MAJOR)**: Ctrl+K crashes the tab on /app/tasks and /app (4/4). Needs a desktop-Chrome re-check.
3. **LS-002 / LS-003 / LS-046 (MAJOR)**: Tasks has no recurrence, subtasks, sections, projects or labels. This is the largest gap against Todoist and TickTick.
4. **LS-004 (MAJOR)**: Quick add has no Task intent; to-dos are parsed as food logs or "didn't understand" (re-verified 4×).
5. **LS-005 / LS-047 (MAJOR)**: Search doesn't find tasks and has no operators or saved filters.
6. **LS-008 (MAJOR)**: "Make this a habit" drops today's tick (LC-016, still open).
7. **LS-001 (MAJOR)**: there's no natural-language date, priority or label parsing on the Tasks input.
8. **LS-007 (MAJOR)**: Checklist List view "+70 kg" logs a weight the user never entered.
9. **LS-056 + LS-016 (MINOR)**: Water counts as done after 2.5 ml / one glass, and the shown amount is rounded.
10. **LS-053 / LS-062 / LS-063 (MINOR)**: Checklist path labels are ambiguous or garbled ("QA" ×2, "Step", "I>x"); a duplicate or blank own item shows a false "Not saved on this device"; own items can't be renamed.
Honourable mentions: LS-031 (Tasks ignore the app time zone), LS-036 (X-per-week habit stays unlit), LS-051/LS-058 (single-level undo), LS-060 (year missing on due dates).

## Final tally (03:46 Brussels)
- **Findings:** 63 (LS-001–LS-063): BLOCKER 0 · MAJOR 12 · MINOR 31 · POLISH 20. LS-046 and LS-047 deepen LS-002/003/005; they aren't separate defects.
- **Positives:** 42 (P01–P42).
- **Old-bug re-check** (BUG-034, LC-001..017, T-110; 19 items): FIXED 7 · STILL OPEN 8 · CHANGED 2 · NOT REPRODUCED 1 · NOT RE-TESTED 1 (LC-017, ZIGi; out of scope).
- **Build:** 17069c7d89824a3799f6749beb37e6ab50122b4a, unchanged all run.

## Desktop pass 3 (real Chrome, Incognito, 03:48 Brussels, build 17069c7)
### LS-H36: Tasks > Keyboard: Ctrl+K opens ZIGi chat, not a command palette. POLISH
- Steps: open /app/tasks (and /app), press Ctrl+K.
- Expected (Todoist/TickTick): command palette / quick search.
- Actual: the tab stays alive, and the ZIGi panel opens after a short render delay. Search is only on "/".
- **Update to LS-043:** I could NOT reproduce the crash in real Chrome. It looks headless-only, so I'm downgrading it to "headless artifact, not reproduced on desktop".
- Shots: shots/2026-11-04/LS-H36-ctrlk-tasks-before.png, LS-H36-ctrlk-tasks-panel.png, LS-H36-ctrlk-app-panel.png
- Fix: bind Ctrl+K to the Search/command palette, and move ZIGi to a separate shortcut. Also show a loading state for the panel.
### Notes (unconfirmed, need re-test)
- On /app/checklist, clicking Options seemed to switch from Path to List view, which would be an unexpected side effect. Not confirmed.
- Evening Orbit holds leftover test habits ("LLLL…", `<b>x</b> & "q"`, "🔥 Run 🏃‍♂️", 2× "Read book"). These are possible cross-bot or earlier-session data, not an app bug. They were rendered escaped, which is a positive.

## Desktop pass 4 (03:50–03:55 Brussels, fresh Incognito window, box under heavy load)
- **Data loss, not an app bug:** Berlin's Erase at about 03:45 wiped the earlier QA habit and tasks. The old Incognito tab later crashed when I pressed Escape ("Target crashed"); this is a possible browser/box-load artefact, not confirmed as an app bug.
### LS-H37: App > PIN lock: another tester set a PIN, so testing is blocked. Environment issue, not an app bug.
- At about 03:52 the page showed "ZIGoals is locked on this device" with two dots already in the PIN field. I never set a PIN, so this is cross-bot contamination. I tried no PIN and did not use "Forgot the PIN?". Shot: LS-H37-pin-lock.png
### LS-H38: Checklist > Options toggles the view from Path to List. MINOR (possible input artefact)
- Steps: open /app/checklist and click Options. Expected: only the Options panel opens. Actual: the view switched to List, and the "Opening options…" panel stayed blank. On a fresh load it showed Path again, so this may be a click during "Loading your path…". Shot: LS-H38-options-path-list.png. Fix: make Options never change the view, and show a skeleton in the panel while it loads.
### LS-H39: Themes on Checklist and Tasks. POSITIVE
- Light, Nebula and Dark are in Settings > Your app > Appearance, and also in the sidebar. On Dark and Nebula, Checklist and Tasks showed no contrast or overflow problems. Polish: Dark and Nebula look almost the same on Tasks. Shots: LS-H39-*.
### LS-H40: Tasks > Due date: no past dates, so overdue can't be tested at creation. MINOR
- Steps: More options > Due = 2026-11-03. Expected (Todoist/TickTick): a past due date is allowed and the task shows as overdue, which is common when back-logging. Actual: the input has min=today, the browser shows "Value must be 11/04/2026 or later." and the task can't be added. Shot: LS-H40-no-past-due.png. Fix: allow past dates and show them in red as Overdue.
### LS-H41: Tasks > Quick add resets More options after each add. POLISH
- The due date clears and the panel collapses after each task, which slows bulk entry. Todoist keeps the context. Fix: keep the panel open and keep the last due date (or add a "keep settings" option). The Add button briefly looked disabled after each click (possible input artefact).
### LS-H42: Tasks > Grouping. POSITIVE
- Tasks are grouped under Today, Next 7 days and Later, with clear "Due Thu, Nov 5" labels.
- Not done: search over 25 items, the Tab pass and 375px zoom. All blocked by the PIN lock.
- Note: the pass-4 screenshots hadn't synced to the box when I wrote this. Their original asset hashes are 7a4c8e0b, 5c1f61e5, 0149c522, 357fc192, 727c2b28, 14a57f1e and 338a2341.

## Desktop pass 5 (03:57 Brussels): blocked by the test environment, no app findings
- I launched a separate Chrome profile (/tmp/lisbon-qa-profile), but the desktop tester couldn't see or control it. Its screen showed other agents' windows instead (Fork-3, PIN-locked Incognito). No tests ran. I clicked into another agent's "QA" Tasks window by mistake, but no task data was changed. From here on, Checklist and Tasks testing continues in my headless Playwright sessions, each with its own isolated context.

## Headless pass 6 (03:47–04:13 Brussels, build 17069c7, fresh Playwright contexts only)
Environment note: `/workspace/qa/venv` and the shared Playwright browser cache disappeared mid-run. This is possibly cross-bot interference; I deleted nothing. I rebuilt a private copy in `/workspace/qa/lsvenv` + `/workspace/qa/ls-browsers`.

### LS-064: Settings > Backup/Export round trip: Tasks and Checklist can't make it back. MAJOR (confirms LS-025)
- Steps:
  1. In a context with 22 tasks, 12 habits and a 21-item path, go to Settings, tick "I understand this file is readable" and click "Export everything". This gives a zip with `everything.json`.
  2. Then "Prepare encrypted backup" > Recovery secret > "I saved the recovery secret." > Download.
  3. In a new, empty context, go to "Restore an encrypted backup" > file + secret > "Unlock and preview".
- Expected (TickTick backup/restore; Todoist has CSV/template import): every module, including Tasks and Checklist, can be restored, and the restored data diffs equal to the source.
- Actual:
  - The readable zip does contain the task and checklist titles, but no import accepts it (LS-025 NOT_A_BACKUP).
  - The encrypted preview lists only Goals/Wealth, Habits (12 habits, 4 check-ins) and Today preferences.
  - Source localStorage held `tasks` (3162 B) and `checklist` (5004 B). Neither is offered, so the restored context has 0 tasks and the default path.
  - No Todoist or TickTick importer exists. The only file input in Settings (`.zip,.xml,.csv`) is the health-data importer.
- Shots: ls/LS-228-enc-preview.png (04:20 re-run, fresh isolated context: preview lists only Goals and Wealth + Habits [12 habits, 4 check-ins] + Today preferences, "Validated modules: Goals and Wealth, Habits, Today preferences"; the source held tasks 3162 B and checklist 5004 B), ls/LS-229-readable-rejected.png (readable export zip put into the encrypted-restore file field: nothing accepted). Stopped before "Restore selected module" per the 03:52 rule.
- Fix:
  - Add `tasks` + `checklist` (+ `checklist-days`) to the encrypted backup schema.
  - Make the readable export importable.
  - Add a Todoist CSV / TickTick backup importer to Tasks.

### LS-065: Tasks > Midnight rollover: the Today/Overdue groups don't update until reload. MINOR
- Steps: use `page.clock` with Europe/Brussels at 2026-11-04 23:58. Add "due today 23:59", "due today" and "due tomorrow", then fast-forward to 00:01:30 without reloading.
- Expected (Todoist/TickTick): at midnight, today's tasks move to Overdue and tomorrow's move to Today live.
- Actual:
  - Live at 00:01:30 the page still shows "Today 2 / Next 7 days 1", the 23:59 task still reads "Due today at 11:59 PM", and the Nov 5 task still reads "Due Thu, Nov 5".
  - Only a reload gives "Open 3 tasks · 2 overdue / Overdue 2 / Today 1".
  - Also, the 23:59 task isn't flagged overdue at 23:59:30 or right after midnight while the page is open.
- Shots: LS-200-tasks-0001-live.png, LS-201-tasks-0001-reload.png
- Fix: recompute the groups on a minute timer and on `visibilitychange`, as Checklist already does (see P43).

### LS-066: Tasks > Time zones: due dates float with the device zone. POLISH (related to LS-031)
- Steps: open the same storage at the same instant (Brussels 00:01:30 Nov 5) in New York and in Tokyo.
- Actual:
  - New York shows the tasks as Today, with "Due today at 11:59 PM".
  - Tokyo shows them as Overdue.
  - The 23:59 due time is kept as a floating wall-clock time (11:59 PM in NY too), not as an instant.
- This is consistent with Todoist floating dates, but it still ignores the app's time zone setting (LS-031).
- Shots: LS-202-tasks-New_York.png, LS-202-tasks-Tokyo.png
- Fix: pick one rule (a floating date, or a time anchored to the zone set in Settings) and document it. A travelling user's timed reminders should not move silently.

### LS-067: Tasks + Checklist > page weight: /app/tasks cold load transfers 3.3–5.0 MB. MINOR
- Steps:
  - Fresh context, 375px.
  - Measure with the Performance API on /app/tasks with 22 tasks, then with 121 tasks (added via the input; 120 adds in 3.6 s, the 121st add renders in 40 ms).
  - Measure /app/checklist with 21 items and with 69 items.
- Actual:

| Page | Data | Requests | Transfer | Decoded | DCL / load | DOM nodes |
|---|---|---|---|---|---|---|
| /app/tasks | 22 tasks | 100 | 5.04 MB | 6.7 MB | 1567 / 1753 ms | 1020 |
| /app/tasks | 121 tasks | 96 | 3.3 MB | 5.0 MB | 482 / 636 ms | 2320 |
| /app/checklist | 21 items | 94 | 0.94 MB | 2.8 MB | 321 / 487 ms | 1462 |
| /app/checklist | 69 items | 94 | 0.94 MB | 2.8 MB | 344 / 519 ms | 2614 |

  - The JS heap is about 18–21 MB in all cases.
  - Item count barely changes load time. The cost is the bundle: about 100 requests and up to 5 MB for one list page.
  - The difference between the two /app/tasks cold loads comes from variable lazy chunks.
- Shot: LS-209-tasks-121.png
- Fix:
  - Split the route bundle; don't preload the Wealth/ZIGi/charts chunks on /app/tasks.
  - Aim for under 1 MB for the Tasks route, as Checklist already manages.

### LS-068: Checklist > Edit path: a hidden cap at about 60 Anytime items gives a false "Not saved on this device". MINOR (extends LS-062)
- Steps: with 12 Anytime habits on the path, add 100 own items "Perf item 000…099" through Edit path > "Add to path".
- Expected: all of them are added, or a clear "Your path holds up to N items" message.
- Actual:
  - Every click looked accepted, and the field cleared.
  - Only 48 were stored (Anytime = 60, path "4 of 69 planets").
  - Adding another shows "Not saved on this device. Try again." That's misleading: storage isn't full (`checklist` is 14.8 KB), it's a count limit.
- Shots: LS-210-cl-100own.png, LS-211-cl-cap.png
- Fix: state the limit and disable "Add to path" when it's reached, or raise the cap. Never report a storage failure for a validation limit.

### LS-069: Checklist > Duplicate habit shows twice on the path. POLISH (cross-ref LS-054)
- The two "QA Stretch" habits both show as separate planets with identical labels ("QA Stretch: not done yet" ×2), so screen-reader users can't tell them apart. Shot: LS-203-cl-2358-list.png. Fix: block duplicates or add a suffix, e.g. "(2)".

### P43: Checklist > Midnight rollover is live. POSITIVE
- With the page open at 23:58 and fast-forwarded to 00:01:30, the header changed from "5 of 21 · Wed, Nov 4" to "0 of 21 · Thu, Nov 5" without a reload. After a reload it stayed the same, and /app/habits shows QA Floss "0 / 1 Due" for the new day. Shots: LS-206/207.

### P44: Cross-module > A Checklist tick matches Habits and Activity. POSITIVE
- I ticked "QA Floss" at 23:58 (fake clock) in Checklist List.
  - Checklist shows 5 of 21.
  - The /app/habits card shows "1 / 1 ✓ Done", with the Today's Rhythm counter updated.
  - /app/activity shows "All · 5 / Habit · 5", with QA Floss "Nov 4, 2026 · 1 / 1 completed · 11:58 PM", which is the correct fake time.
- Counts and time match in all three places.
- Today (/app) shows the onboarding chooser in a fresh context, with no habit counter, so there's nothing to compare there.
- Shots: LS-204, LS-205.

### P45: Checklist/Tasks > DST spring-forward (2027-03-28 Europe/Brussels). POSITIVE
- 23:58 Mar 27 → +4 h across the 02:00→03:00 jump: the Checklist day label went to "Sun, Mar 28" with no double or skipped day, and there were no errors. Shot: LS-208-dst-checklist.png.

### P46: Tasks > Scale. POSITIVE
- 120 tasks added in 3.6 s with no dropped items (count = 120), and add latency at 121 items is 40 ms. The list stays responsive.

### Coverage note for the 03:47 request
1. Round trip: LS-064.
2. Midnight, time zones and DST: LS-065, LS-066, P43, P45. Streaks: the habit card shows no streak value for one day of data, so a multi-day streak wasn't verifiable in the time I had (not tested).
3. Old bugs: every in-scope item had already been re-checked. Only LC-017 (ZIGi) remains, and it's out of scope.
4. Cross-module: P44.
5. Performance: LS-067, LS-068, P46.

## TOP 10 (updated 04:13 Brussels, build 17069c7d89824a3799f6749beb37e6ab50122b4a)
1. **LS-025 / LS-064 (MAJOR)**: backup and restore drop Tasks and Checklist, the readable export can't be imported, and there's no Todoist/TickTick importer.
2. **LS-002 / LS-003 / LS-046 (MAJOR)**: Tasks has no recurrence, subtasks, sections, projects or labels.
3. **LS-004 (MAJOR)**: Quick add has no Task intent.
4. **LS-005 / LS-047 (MAJOR)**: Search doesn't find tasks and has no operators or saved filters.
5. **LS-008 (MAJOR)**: "Make this a habit" drops today's tick.
6. **LS-001 (MAJOR)**: no natural-language date or priority parsing on the Tasks input.
7. **LS-007 (MAJOR)**: Checklist "+70 kg" logs a weight the user never entered.
8. **LS-043 (MAJOR, headless-only per LS-H36)**: Ctrl+K crashes headless; on desktop it opens ZIGi instead of a palette.
9. **LS-065 + LS-H40 (MINOR)**: Tasks don't roll to Overdue at midnight until reload, and past due dates are rejected.
10. **LS-068 / LS-062 / LS-053 / LS-063 (MINOR)**: hidden path cap with a false "Not saved", garbled labels and no rename. Honourable mentions: LS-067 (5 MB Tasks route), LS-056+016, LS-031/066.

## Final tally (04:13 Brussels)
- **Findings:** LS-001–LS-069 = 69. BLOCKER 0 · MAJOR 13 · MINOR 34 · POLISH 22 (this count excludes the desktop worker's LS-H36..H42).
- **Positives:** 46 (P01–P46).
- **Old-bug re-check:** FIXED 7 · STILL OPEN 8 · CHANGED 2 · NOT REPRODUCED 1 · NOT RE-TESTED 1 (LC-017, ZIGi).
- **Build:** 17069c7d89824a3799f6749beb37e6ab50122b4a, unchanged.

## Desktop pass 7 (04:14, fresh Incognito, lock gone)
- LS-H43 (POSITIVE): complete 3, remove 3 of 15, reload -> state persists (9 open, 3 done). Remove shows inline Undo. Shots: shots/2026-11-04/LS-H43-before-reload.webp, LS-H43-after-reload.webp
- LS-H44 (POLISH): Later group shows "Due Thu, Dec 31" with no year for 2099-12-31 -> ambiguous for far-future dates. Repro: add task due 2099-12-31.
- LS-H45 (POLISH, possible input artefact): focus ring sometimes hard to see on Tab in /app/tasks. Enter on Edit works.
- Note: the native date input was flaky to type into on the box (artefact). The '/' search result was not recorded. Past-date edit was not completed (consistent with LS-H40 min=today).

## Headless pass 7 (04:14–04:35 Brussels, build 17069c7, fresh isolated Playwright contexts, fake data, scripts /workspace/qa/ls140–ls150.py)

### LS-070: Checklist > Streak counts only "perfect" days, and there is no per-item streak. MINOR (extends LS-033)
- Steps (page.clock, Europe/Brussels): path = own item "QA Read" + Water. Tick only QA Read each day Oct 29 – Nov 2 (5 days), view Nov 4.
- Expected (TickTick/Todoist habit streaks): a per-item streak for QA Read of 5 days; or at least a clear rule shown to the user.
- Actual: header reads "0-day streak" on every one of the 5 days; `checklist-days:v1` stores {total:2,done:1} without `perfect`. Own path items don't appear on /app/habits at all ("0 / 0 scheduled habits"), so no surface ever shows "QA Read: 5 days". The Habits page itself says "Days you skip, rest or pause never break a streak", but the Checklist streak breaks on any unlit planet and has no rest/pause.
- Shots: ls/LS-221-habits-5day.png, ls/LS-222-checklist-5day.png, ls/LS-223-habits-broken.png
- Fix: show per-item streaks (or a partial-day rule), and explain "streak = all planets lit" next to the flame.

### LS-071: Tasks vs Todoist/TickTick feature gaps, with evidence. MAJOR (consolidates LS-002/003/046 with new evidence)
- Steps: 1280 px, clean context, add QA A/B/C, open More options and Edit, try drag, Alt+Arrow, right-click, bulk select, delete + Undo, Ctrl+Z.
- Matrix (present / partial / missing):
  - Recurring tasks: MISSING. Add and Edit forms only have Title, Priority, Due, Time (Save/Cancel). Store = {id,title,priority,due,time,goal?,createdAt,doneAt}.
  - Subtasks: MISSING. No child/indent control, row controls are only checkbox, Focus, Edit, Remove.
  - Priorities: PARTIAL. High/Normal/Low select (Todoist P1–P4, TickTick 4 levels); sort by priority works (LS-P18).
  - Labels/tags: MISSING. No field, no filter.
  - Bulk actions: MISSING. No select mode, no multi-select checkboxes, right-click opens no menu, nothing matches "select"/"bulk".
  - Undo after delete: PARTIAL. Toast "Removed “QA B”. Undo" restores in the same position (present); Ctrl+Z does nothing (see LS-072).
  - Drag reorder: MISSING. No draggable rows; drag C onto A and Alt+ArrowUp both leave order A,B,C (manual order impossible; order is date > priority > added).
- Shots: ls/LS-230-tasks-controls.png, ls/LS-231-task-edit.png, ls/LS-232-task-delete-undo.png
- Fix: in order of user value — recurrence, subtasks, manual drag order (with keyboard alternative), labels, multi-select.

### LS-072: Tasks > Ctrl+Z doesn't undo a delete. POLISH
- Steps: remove "QA A", press Ctrl+Z while the Undo toast is visible.
- Expected (Todoist: Ctrl+Z / z undoes the last action): task returns.
- Actual: list stays ['QA B','QA C']; only the toast button undoes. Shot: ls/LS-232-task-delete-undo.png
- Fix: bind Ctrl/Cmd+Z to the toast's Undo while it is shown.

### LS-073: Tasks > RTL titles have no dir="auto". POLISH (Checklist equivalent noted in LS-P23)
- Steps: add "QA مرحبا بالعالم RTL".
- Expected: an Arabic/Hebrew-first title aligns right.
- Actual: `.task-title` dir="" and direction ltr; the text renders correctly via bidi but left-aligned. Shot: ls/LS-233-tasks-edge-titles.png
- Fix: `dir="auto"` on task and path titles.

### P47: Checklist > Multi-day streak, midnight and break. POSITIVE
- Single-item path, ticked Oct 31, Nov 1, Nov 2: 1-, 2-, 3-day streak (each survives reload). Ticked Nov 3 at 23:59:11 → "4-day streak, today complete". Live at 00:01:14 (no reload) header rolls to "Wed, Nov 4 · 0 of 1" and the streak stays 4 (today not over). Skip all of Nov 4 → Nov 5 10:01 shows "0-day streak" (broken correctly); a tick restarts at 1. Days stored with `perfect:true`.
- Shots: ls/LS-224-streak-4-2359.png, ls/LS-225-streak-0001-live.png, ls/LS-226-streak-0001-reload.png, ls/LS-227-streak-broken.png

### P48: Tasks > Edge titles, injection and double submit. POSITIVE
- Emoji ZWJ family, Arabic, 5,000-char paste (stored cut to 140, maxlength 140, page width stays 375, title wraps), and `<img onerror>`/`<script>` title: shown as text, no img in DOM, no script ran, no dialogs. Add-button double-click and Enter+Enter each create exactly 1 task; whitespace-only adds nothing. Shot: ls/LS-233-tasks-edge-titles.png

### P49: Tasks + Checklist > Two tabs editing at once. POSITIVE
- Tasks: add in tab 1 appears live in tab 2 and vice versa; a delete in tab 1 afterwards keeps tab 2's task (store 8 tasks, survives reload). Checklist: tick in tab 1 shows "done" live in tab 2; a tick in tab 2 is kept by tab 1 (2 ticks stored, both after reload). A rapid double-tap toggles tick then untick (net unchanged, consistent with tap-again-to-untick). Emoji/Arabic path names render. Shots: ls/LS-234/235-two-tabs-*.png, ls/LS-236/237-cl-two-tabs-*.png

### Coverage note (04:14 request)
1. Streaks: LS-070, P47. 2. LS-064 shots added (LS-228/229). 3. Gaps: LS-071, LS-072. 4. Edge cases: LS-073, P48, P49. Not done: none.

## TOP 10 (updated 04:35 Brussels, build 17069c7d89824a3799f6749beb37e6ab50122b4a)
1. **LS-025 / LS-064 (MAJOR)**: backup and restore drop Tasks and Checklist, the readable export can't be imported, and there's no Todoist/TickTick importer (now with shots LS-228/229).
2. **LS-071 / LS-002 / LS-003 / LS-046 (MAJOR)**: Tasks has no recurrence, subtasks, labels, bulk actions or drag reorder; priorities are 3-level only.
3. **LS-004 (MAJOR)**: Quick add has no Task intent.
4. **LS-005 / LS-047 (MAJOR)**: Search doesn't find tasks and has no operators or saved filters.
5. **LS-008 (MAJOR)**: "Make this a habit" drops today's tick.
6. **LS-001 (MAJOR)**: no natural-language date or priority parsing on the Tasks input.
7. **LS-007 (MAJOR)**: Checklist "+70 kg" logs a weight the user never entered.
8. **LS-043 (MAJOR, headless-only per LS-H36)**: Ctrl+K crashes headless; on desktop it opens ZIGi instead of a palette.
9. **LS-065 + LS-H40 (MINOR)**: Tasks don't roll to Overdue at midnight until reload, and past due dates are rejected.
10. **LS-070 / LS-068 / LS-062 / LS-053 (MINOR)**: all-or-nothing Checklist streak with no per-item streak; hidden path cap with a false "Not saved"; garbled labels. Honourable mentions: LS-067, LS-072, LS-073, LS-031/066.

## Final tally (04:35 Brussels)
- **Findings:** LS-001–LS-073 = 73. BLOCKER 0 · MAJOR 14 · MINOR 35 · POLISH 24 (excludes the desktop worker's LS-H36..H42).
- **Positives:** 49 (P01–P49).
- **Old-bug re-check:** FIXED 7 · STILL OPEN 8 · CHANGED 2 · NOT REPRODUCED 1 · NOT RE-TESTED 1 (LC-017, ZIGi).
- **Build:** 17069c7d89824a3799f6749beb37e6ab50122b4a, unchanged.

## Desktop pass 8 (04:20)
Note: the wizard goals were created in the regular (non-Incognito) shared window, not in Incognito. That window has leftovers from this pass: an Undo toast on "QA Gym" and DevTools open at 375px. No data was erased.
- LS-H46 (POSITIVE + MINOR): all 4 wizard types were created (LIS Qty, LIS Val, LIS Rew, LIS Proj) and appear in /app/goals. Validation works for an empty name, a negative amount, an empty target and a missing milestone. MINOR: Quantity with an empty Goal asset silently defaults to ZIG. POLISH (possible artefact): the Project preview still shows "Give your Goal a name." after the name is filled in. Note: "Create goal" is enabled on step 1 of 4. Shots: LS-H46-*.
- LS-H47 (MAJOR vs Todoist/TickTick): global '/' search does not index tasks. "L1" returns "Nothing on this device matches" while L11–L14 exist. POLISH: Esc needs two presses to close the palette. Shot: LS-H47-search.webp
- LS-H48 (POSITIVE): Space on a task checkbox toggles it, and Undo restores it. Shot: LS-H48-space.webp
- LS-H49 (POSITIVE): at 375px, /app/tasks and /app/checklist have no overlap. Console shows a Permissions-Policy 'bluetooth' warning (POLISH). Shots: LS-H49-*.
- Note: the pass 8 screenshots didn't sync to the box. Their asset hashes are 695713ee, 00b63092, 6e570781, 458e0359, a1007d63, 97f862a3, d066f331, 1a0f5190 and b2ef775b.

## Headless pass 8 (04:50–05:05 Brussels, build 17069c7, fresh isolated Playwright contexts, fake data, scripts /workspace/qa/ls160–ls163.py)

### LS-074: Checklist as a standalone app: one daily path only, no lists, sub-items, search, dates or bulk actions. MAJOR (vs Todoist/TickTick checklists)
- Steps: 375 px clean context. Checklist menu → only "Edit path" and "Options". Edit path → added 30 own items named "QA L1 item 01..10", "QA L2 …", "QA L3 …" to simulate 3 lists of 10. Read every control in the sheet and on the page, then tried right-click, Ctrl+Z and drag.
- Result: all 30 land on the one path (30 orbit nodes). The only per-item fields are name, colour (6) and orbit (Morning/Afternoon/Evening/Anytime). Orbits are the closest thing to lists, but they're time-of-day groups on the same daily path. Storage is just `zigoals:checklist:v1` + `zigoals:checklist-days:v1`.
- Matrix (present / partial / missing):
  - Multiple lists: MISSING (orbits = PARTIAL grouping; LS-026..029 cover orbit bugs).
  - Sub-items: MISSING (no indent/child control).
  - Drag reorder: PARTIAL. 0 `[draggable]` in the sheet; reordering goes through "Change X: orbit, colour, place" (keys/drag in the place control, see 03:34 log).
  - Due dates / reminders: MISSING (no date, time or reminder field; /api/push 503, LS-015).
  - Recurring: PARTIAL. Every item repeats daily; there's no weekly/custom rule for own items (habits handle "X per week", LS-036).
  - Priorities: MISSING.
  - Search / filter: MISSING (no input on the page; global Search doesn't index items, LS-005).
  - Bulk complete / delete: MISSING (no select mode, right-click opens no menu).
  - Undo: PARTIAL. The toast "QA L1 item 03 logged for today. Undo" works; Ctrl+Z doesn't (3 ticks stay stored), see LS-075.
- Shots: ls/LS-240-cl-menu.png, ls/LS-241-cl-30-items-sheet.png, ls/LS-242-cl-path-30.png
- Fix: either position Checklist as a daily routine (and say so in the copy), or add named lists with one level of sub-items, an optional date/reminder, and a filter box.

### LS-075: Checklist > Ctrl+Z doesn't undo a tick. POLISH (Checklist twin of LS-072)
- Steps: tick 3 items, press Ctrl+Z while the Undo toast is showing. Expected: the last tick is undone. Actual: still 3 ticks in `checklist-days:v1`. Shot: ls/LS-242-cl-path-30.png

### LS-076: Tasks > no projects, archive/restore, move or sort controls. MINOR (new evidence for LS-002/LS-071)
- Steps: 1280 px, added 16 tasks ("QA T01 Home".."QA T16 Work", alternating to stand in for 2 projects), read every select/tab/sort control and each row's buttons.
- Actual: 0 sort/select/tab controls on the page. Each row has only Focus, Edit and Remove. The Edit form has title, priority, date and time. No project field means there's nothing to move tasks into, and there's no Archive. The only "restore" is the Remove toast's Undo, and finished tasks only sit in "Done in the last 30 days". Order is fixed (date > priority > added).
- Shot: ls/LS-243-tasks-16.png. Fix: see LS-071, plus an Archive/Done view with a restore button.
- Logout/login: N/A (no accounts; "On this device only").

### Re-confirmed this pass (no new IDs)
- LS-065 still open: page.clock at 23:50 Nov 4, T01 due Nov 4, ran 15 min. No live Overdue after midnight; after reload it shows "Open 16 tasks · 1 overdue" and the Overdue group (Overdue · Nov 4). All 16 tasks survive the reload. Shot ls/LS-244-tasks-overdue-reload.png

### P50: Tasks > 390×844 persistence with two tabs. POSITIVE
- Mobile/touch context: added 5, tapped done on M1, removed M2, added "QA M tab2" from a second tab, then reloaded tab 1. Store = M0, M1 (done), M3, M4, M tab2. scrollWidth 390 (no overflow). Shot ls/LS-245-390-tasks-persist.png

### P51: Checklist > 390×844 persistence. POSITIVE
- Added 2 own items with taps, ticked one, reloaded: "QA M walk: done", "QA M read: not done yet". No overflow. Shot ls/LS-246-390-cl-persist.png

### P52: Checklist > 30 own items. POSITIVE
- 30 items added quickly; all 30 render on the path and in the sheet with "Change …" controls; ticks and toasts work. Shot ls/LS-241/242.

### Export/import at 390: not re-run (P49/LS-064 already cover it; replacing restores are banned).

### Status of earlier LS bugs on 17069c7
All findings were found on this build, which hasn't changed, so the rest stay STILL OPEN (none FIXED or REGRESSED). The MAJORs were spot-retested this pass:
| ID | Sev | Status 05:00 | Evidence |
|---|---|---|---|
| LS-001 | MAJOR | STILL OPEN | "Buy milk tomorrow at 5pm p1" stored verbatim, priority normal, no due date (ls161) |
| LS-002/003/046/071 | MAJOR | STILL OPEN | Edit fields only INPUT/SELECT/date/time; no repeat, project or subtask (ls160, LS-076) |
| LS-004 | MAJOR | STILL OPEN (last verified 02:38; the 05:00 retest couldn't reach the 375 Quick add button, script issue) | LS-70 shot |
| LS-005/047 | MAJOR | STILL OPEN | "plumber" → "0 results · Nothing on this device matches" with the task present (LS-252); desktop LS-H47 agrees |
| LS-006/043 | MAJOR | STILL OPEN (headless only) | Ctrl+K on /app/tasks → "Page crashed" again; real Chrome opens ZIGi (LS-H36) |
| LS-007 | MAJOR | STILL OPEN | "+70 kg" chip writes grams 70000 to health weights in one tap (LS-251) |
| LS-008 | MAJOR | STILL OPEN | Stretch "done" → Make this a habit → "not done yet" (LS-250) |
| LS-025/064 | MAJOR | STILL OPEN | Not re-run (no replacing restore); build unchanged since the 04:13 evidence |
| All MINOR/POLISH LS-009..073 | — | STILL OPEN (not individually re-run; build unchanged) | per entries above |
| LC old bugs | — | unchanged from the earlier re-check: FIXED 7 · STILL OPEN 8 · CHANGED 2 · NOT REPRODUCED 1 · NOT RE-TESTED 1 | |

## TOP 10 (updated 05:05 Brussels, build 17069c7d89824a3799f6749beb37e6ab50122b4a)
1. **LS-025 / LS-064 (MAJOR)**: backup and restore drop Tasks and Checklist.
2. **LS-071 / LS-002 / LS-003 / LS-046 / LS-076 (MAJOR)**: Tasks has no projects, recurrence, subtasks, labels, archive, sort, bulk or drag.
3. **LS-074 (MAJOR, new)**: Checklist is a single daily path, with no lists, sub-items, dates, search or bulk actions.
4. **LS-004 (MAJOR)**: Quick add has no Task intent.
5. **LS-005 / LS-047 / LS-H47 (MAJOR)**: Search doesn't find tasks or checklist items.
6. **LS-008 (MAJOR)**: "Make this a habit" drops today's tick (re-confirmed 05:00).
7. **LS-007 (MAJOR)**: "+70 kg" logs a weight the user never entered (re-confirmed 05:00).
8. **LS-001 (MAJOR)**: no natural-language parsing.
9. **LS-043 (MAJOR, headless-only)**: Ctrl+K crash (re-confirmed); desktop opens ZIGi.
10. **LS-065 + LS-H40 (MINOR)**: no live overdue at midnight (re-confirmed); past due dates are rejected. Honourable mentions: LS-070, LS-068, LS-072/075, LS-073.

## Final tally (05:05 Brussels)
- **Headless findings:** LS-001–LS-076 = 76. BLOCKER 0 · MAJOR 15 · MINOR 36 · POLISH 25.
- **Positives:** 52 (P01–P52).
- **Desktop LS-H36..H49 (separate):** 14 IDs. 1 environment (H37) · POSITIVE 6 (H39, H42, H43, H46, H48, H49) · MAJOR 1 (H47 = LS-005) · MINOR 3 (H38, H40, H46 part) · POLISH 4 (H36, H41, H44, H45).
- **Bug status on 17069c7:** FIXED 0 · STILL OPEN 73 · REGRESSED 0 (8 MAJOR groups spot-retested; LS-004 retest incomplete). Old LC bugs: FIXED 7 · STILL OPEN 8 · CHANGED 2 · NOT REPRODUCED 1 · NOT RE-TESTED 1.

## Final note (05:32 Brussels): wrap-up
- Testing stopped on Professor's wrap-up (weekly usage at 95.8%). Everything up to headless pass 8 (LS-074..076, P50..52) and desktop passes 7–8 (LS-H43..H49) is written above in full. No unwritten findings remain.
- Environment note: the shared default profile was still PIN-locked at 04:23 and 05:15 (Professor/Berlin). Lisbon set no lock. Pass 8's wizard goals (LIS Qty/Val/Rew/Proj) were created in the regular shared window.
- Final counts: headless LS-001..076 = 76 findings (BLOCKER 0, MAJOR 15, MINOR 36, POLISH 25) + 52 positives. Desktop LS-H36..H49 = 14 entries (1 environment note, 6 positives, MAJOR 1 [H47, the same bug as LS-005], MINOR 3, POLISH 4).
- Not done: export/import round trip at 390×844, LS-004 retest at 375px, LS-025/064 re-run (banned restore), ZIGi LC-017 (out of scope).
