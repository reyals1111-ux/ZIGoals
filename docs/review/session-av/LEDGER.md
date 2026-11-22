# Session AV: ledger of every `half` and `missing` row

Lane 2's first commit (owner follow-ups 2 and 4), on `feature/session-av-2` from PR #108's frozen head `807f247e`. Written 21 Nov 2026 and refreshed against the committed branch head `d0df34f4`
(`feature/session-au-dress-rehearsal`). The source is `docs/review/session-av/COMPETITORS.md`, section "Matrix": all
175 rows marked `half` or `missing`, in matrix order, under the matrix's own headings. The row numbers are this ledger's.

The owner's rule (verbatim): "Every `half` or `missing` row in COMPETITORS.md has its own verdict in a new
docs/review/session-av/LEDGER.md. A verdict is one of three: built (its commit); already have (the file, opened);
Carried, with a cause from this list only: needs an outside service; needs a model; needs content made for ZIGoals
(audio, video, programmes); native-only; against a named rule; a new dependency; a protected area; 2 failed attempts.
'Effort', 'time', 'low priority' and 'not used daily' are not causes."

How each verdict was reached:

- **built**: the Session AV commit is named (from `git log --grep "Session AV"`, ADR-045 D-BUILD and `docs/handoff/AV_RESUME.md`),
  and its message and files were checked against the row's "What is missing". Where the commit covers only part, the
  verdict is **built in part** with the commit, and what is still missing is **to build**.
- **already have**: only after opening the file. None of the 175 rows qualifies: every missing part that was checked
  in the committed code (a custom reminder time, the notification kinds, journal templates, high contrast, print
  CSS, version history, money-entry fields, account notes, sync sections, the debt countdown, the workout calendar, the
  sleep charts, the Oracle's nutrients) is indeed absent at `d0df34f4`. The lines opened are cited in the evidence.
- **Carried**: only with one of the eight causes, naming the part that needs it. Where only part of a row needs it,
  the row is **to build** and the Carried part is said in the evidence (counted separately below).
- **to build**: everything else that is web-possible and within the rules.
- The fresh-agent fixes (follow-up 2, step 1c; `docs/review/session-av/QUALITY.md`) are committed and cited by commit:
  Money `f39bee8f`, `838b2f70`; Tasks and Journal `22560d4d` (TIER 3 stored), `6b194efb`, `3c825c28` (TIER 3 PWA);
  answers `4606305e`, `b67d1614`; Health and Habits `774b4e48`; follow-ups `81d21430`, `82f976dc`, `5a07c852`, `76b5c3a8`,
  `2eae5912`. Rows whose remainder they closed were re-judged. QUALITY.md "Not fixed" rows that match a remainder are cited.
- Choices made since the first draft: the journal's Today line is a plain-words glance line from 561 px up (D-028's 90
  Tab stops, today-screens' phone ceiling; the card's line in For you carries it on a phone), the Showcase no longer sets
  a focus habit, and the money glance line is one link opening its first piece's place (#37, #52, #128).

Effort is what is left to do (S under a day, M one to two days, L three days or more); "—" when nothing is left.
Personas are the matrix's. "Group" points to the to-build list at the end.

## Ledger

### Tasks, planning, notes and journaling

#### Todoist

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 1 | Todoist | Quick Add with natural language | `half` | built in part; rest **to build** | built in part: `dd931b8e` (task line reads Dutch), `2db17ff9` (a pasted list, one task per line), `6b194efb` (a line with commas or semicolons makes several tasks; an indented paste makes subtasks; Quick add takes lists; more Dutch: "uur" as a length, half 10, 18u30) — still missing: a split suggestion for a long entry. Group 1. | S | Max, Sanne |
| 2 | Todoist | Deadlines | `missing` | built | `8e63c167` (TIER 3 stored: optional `deadline`), `688a0f8c` (row, editor, preview), `4408d1d6` (TIER 3 AI); `6b194efb` (deadlines on Upcoming, Quick add keeps the deadline). | — | Max, Lina |
| 3 | Todoist | Reminders | `half` | built in part; rest **to build** | built in part: `9a0cf6f5` (TIER 3 PWA: kind `task` in the device notification plan), `22560d4d` (TIER 3 stored: `task.snooze`), `6b194efb` (Done, Snooze 15 min / 1 h / tomorrow 09:00 and Dismiss on every reminder row; up to three reminders), `3c825c28` (TIER 3 PWA: Done on the notification), `76b5c3a8` — still missing: a custom date/time reminder and `!2h` in the task line (the notification itself keeps Snooze 1 h: QUALITY.md "Not fixed"). Location reminders: `not web-possible` in the matrix. Group 1. | S | Max, Lina, Sanne |
| 4 | Todoist | Ramble voice capture | `half` | **to build** | to build: a word-rule split of one utterance into several tasks and a "remove that" command (`components/quick-add-mic.tsx`, `lib/tasks/intent.ts`). `6b194efb` splits a typed line at commas or semicolons, which speech does not give. Live AI parsing is not part of it (would need a model). Group 1. | M | Max |
| 5 | Todoist | Task Capture / Extract tasks | `missing` | built (part Carried: needs a model) | `2db17ff9` (`lib/tasks/paste-list.ts`: bullets, numbers and `[ ]` boxes dropped, a preview, one Undo), `6b194efb` (indented lines become subtasks; Quick add takes lists). Part Carried: extraction from a photo or document — needs a model (OCR/AI). | — | Max |
| 6 | Todoist | Task durations | `missing` | built | `78d71497` (TIER 3 stored: `minutes`, "for 1h" in the line, the day's minutes), `0ccaeb8b` (TIER 3 AI), `6b194efb` (the load counts Today's whole view; "voor N min", "uur" as a length). | — | Max |
| 7 | Todoist | Layouts: list, board, calendar, table | `half` | **to build** | to build: a table layout, a 3-day calendar and a calendar layout of one project (`projectSchema.view` is `list \| board`). Group 12. | M | Max |
| 8 | Todoist | Task descriptions and comments | `half` | **to build** | to build: a comment thread on a task; a photo/file on the device (as `lib/notes/photos.ts`) and a voice note (browser recording). Group 12. | M | Max |
| 9 | Todoist | Productivity insights and Karma | `half` | built in part; rest **to build** | built in part: `f4595af6`, `6b194efb` (tasks finished per day and week, weekday initials) — still missing: a daily task goal (QUALITY.md "Not fixed"), a task streak, and done tasks kept past 30 days (`lib/tasks/schema.ts:22` `DONE_KEEP_DAYS = 30`). Group 3. | S | Max |
| 10 | Todoist | Templates | `missing` | **to build** | to build: project / task-list templates ("Moving house") and "save this project as a template". Group 12. | S | Max |

#### TickTick

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 11 | TickTick | Reminders | `half` | built in part; rest **to build** | built in part: `9a0cf6f5`, `22560d4d`, `6b194efb`, `3c825c28` (push, snooze lengths, up to three reminders, Done) — still missing: a default reminder and "Start focus" from the reminder. Email reminders: needs an outside service (not proposed). Group 1. | S | Max, Lina |
| 12 | TickTick | Filters, lists, folders and tags | `half` | **to build** | to build: a folder that groups projects; group/sort by created or modified time. Group 12. | S | Max |
| 13 | TickTick | Calendar views and timeline | `half` | **to build** (part Carried: needs an outside service) | to build: 3-day view, a year heatmap of tasks, a Gantt timeline for a project. Part Carried: a live URL/Google calendar subscription — needs an outside service. Group 12. | M | Max |
| 14 | TickTick | Eisenhower Matrix | `half` | built in part; rest **to build** | built in part: `95f8d2b9` (own matrix lines, `zigoals:matrix-rules`), `6b194efb` (deadlines count as urgent) — still missing: more than one saved matrix (and rules by label: QUALITY.md "Not fixed"). Group 12. | S | Max |
| 15 | TickTick | Countdowns / anniversaries | `half` | built in part; rest **to build** | built in part: `5c588f07` (TIER 3 stored: "Every year", "Remind me" 1–30 days before), `6b194efb` (the reminder changed per row; its own switch), `3c825c28` (TIER 3 PWA: countdown reminders in the notification plan, so they wake a notification) — still missing: a "years since" count (`git grep` at `d0df34f4`, `lib/countdowns` and `components/countdowns`: none). Group 1. | S | Sanne, Lina |
| 16 | TickTick | Suggested Tasks | `missing` | built | `f9385fca` (Plan my day: up to five open tasks, each with why), `6b194efb` (the plan-day fold). | — | Max |

#### Things (Cultured Code)

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 17 | Things (Cultured Code) | Repeating to-dos and projects | `half` | built in part; rest **to build** | built in part: `95f8d2b9` (pause a repeat until a day; finished subtasks reopen when a repeating task comes round) — still missing: "start early" lead days and repeating projects (`lib/tasks/recurrence.ts` has no lead days). Group 12. | S | Max |
| 18 | Things (Cultured Code) | Deadlines | `missing` | built | `8e63c167`, `688a0f8c`, `4408d1d6` (same build as the Todoist Deadlines row). | — | Max, Lina |
| 19 | Things (Cultured Code) | Reminders and snooze | `half` | built | `9a0cf6f5` (reminders as notifications, with Snooze), `22560d4d`, `6b194efb` (snooze lengths in the app), `3c825c28` (Done on the notification). | — | Max, Lina, Sanne |
| 20 | Things (Cultured Code) | Projects, Areas and Headings | `half` | **to build** | to build: an Area level above projects (`projectSchema` has no parent or area) and archiving a section as a block. Group 12. | S | Max |

#### Sunsama

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 21 | Sunsama | Guided daily planning | `missing` | built in part; rest **to build** | built in part: `f9385fca` (Plan my day picks today's tasks from open ones) — still missing: fitting them around the day's timed items on the Agenda. Group 3. | M | Max |
| 22 | Sunsama | Weekly planning | `half` | built in part; rest **to build** | built in part: `3227eef3` (the review reads Tasks and the Journal; the intention as a task for Monday), `6b194efb` (the Tasks step plans each open task for Monday or lets it go, with Undo — the carry-over; the intention can link to a goal) — still missing: a list of week objectives. Group 3. | M | Max, Lina |
| 23 | Sunsama | Weekly objectives | `half` | **to build** | to build: week-scoped objectives and a "This week" page with linked tasks. Group 3. | M | Max |
| 24 | Sunsama | Timeboxing / auto-scheduling | `half` | built in part; rest **to build** (part Carried: needs an outside service) | built in part: `78d71497` (a task has minutes) — still missing: the block's end on the Agenda from its minutes and a "next free slot" auto-place. Part Carried: writing to an outside calendar — needs an outside service. Group 3. | M | Max |
| 25 | Sunsama | Planned vs actual time and timers | `half` | built in part; rest **to build** | built in part: `78d71497` (the planned minutes) — still missing: the actual time per task (a timer) and planned vs actual per task and per day. Group 3. | M | Max |
| 26 | Sunsama | Workload counter and overcommit warning | `half` | built in part; rest **to build** | built in part: `78d71497` (Tasks → Today adds up the day's minutes) — still missing: a daily threshold and the overcommit warning. Group 3. | S | Max |
| 27 | Sunsama | Parallel tasks and timers | `missing` | **to build** | to build: background / parallel tasks and timers. Group 3. | M | — |
| 28 | Sunsama | Channels and contexts | `half` | **to build** | to build: a context that groups projects (same work as Things' Areas) and one filter that applies across views. Group 12. | S | Max |

#### Notion

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 29 | Notion | Database views | `half` | **to build** | to build: a table (sortable columns) and a timeline view; a table or gallery of notes. Group 12. | M | Max |
| 30 | Notion | Chart view | `half` | **to build** | to build: a chart built from your own lists (tasks done per week, notes per tag). Group 12. | L | Max |
| 31 | Notion | Reminders | `half` | built in part; rest **to build** | built in part: `9a0cf6f5` (task reminders pushed) — still missing: a reminder inside a note's text. Email: needs an outside service (not proposed). Group 1. | S | Max, Lina |
| 32 | Notion | Repeating database templates | `half` | **to build** | to build: a note template that fills a new note on a schedule; a daily note that starts from a template. Group 9. | S | Max, Sanne |
| 33 | Notion | Version history across workspace | `half` | **to build** | to build: a list of earlier versions of a note or task to restore. Group 18. | M | — |
| 34 | Notion | High contrast mode | `half` | **to build** | to build: an in-app high-contrast choice. Opened: `lib/ui-prefs/theme.ts:15` `THEMES = ['nebula', 'light', 'dark']`; `components/motion/motion-2026.css:135` only follows `prefers-contrast: more` for motion. An added theme, not a redesign of the PR #22 baseline. Group 18. | S | any (accessibility) |

#### Day One

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 35 | Day One | Rich journal entries | `half` | **to build** | to build: a photo in a journal entry (as `lib/notes/photos.ts` keeps for Notes) and a [[link]] to another entry. Group 9. | M | Sanne, Tom |
| 36 | Day One | Automatic metadata | `half` | built (part Carried: needs an outside service) | `0797dc79` ("That day" under each entry opens the day's own records). Part Carried: weather and place names — needs an outside service. | — | Sanne, Tom |
| 37 | Day One | Today tab and Moments | `half` | built | `b1983462` (written today, On this day), `6b194efb` (the card rises on a day with an entry or a memory), `22560d4d` (TIER 3 stored: opt-in `todayLines`), `82f976dc`, `5a07c852`, `2eae5912`. Choice made since: the Today line is a plain-words glance line from 561 px up (D-028's 90 Tab stops; today-screens' phone ceiling); on a phone the journal card's line in For you carries it and opens the Journal. Moments: `not web-possible` in the matrix. | — | Sanne |
| 38 | Day One | Prompt Packs | `half` | built in part; rest **to build** | built in part: `58667a30` (the daily question in Dutch), `6b194efb` (the picker in the question's language) — still missing: themed prompt packs to switch on (sleep, training). Group 9. | S | Sanne, Tom |
| 39 | Day One | Templates | `half` | built in part; rest **to build** | built in part: `58667a30` (TIER 3 stored: your own templates), `6b194efb` (editable) — still missing: "save this entry as a template" (QUALITY.md "Not fixed"; at `d0df34f4` `components/journal-prompts/prompt-picker.tsx:47` saves a template made in the picker only). Group 9. | S | Sanne |
| 40 | Day One | Journaling reminders and streaks | `half` | **to build** | to build: a reminder to write (opened `lib/notify/plan.ts:12`: `ItemKind` has no journal kind) and a writing streak. Group 9. | S | Sanne, Max |
| 41 | Day One | End-to-end encryption and passcode | `half` | **to build** | to build (TIER 3 sync / auth, separate commits): the journal in the encrypted account sync — opened `lib/vault/section-status.ts:15-19` and `lib/vault/extras-keys.ts:13`: no journal key synced — and a Face ID / Touch ID (passkey) unlock beside the PIN lock in `lib/device-lock.ts`. TIER 3 is a risky area, not a protected one. Group 18. | L | Sanne |
| 42 | Day One | Audio recorder and Apple Watch (Watch native-only) | `half` | **to build** | to build: a microphone in the Journal that keeps the audio on the device. Apple Watch: native-only (not part of this row's build). Group 9. | S | Sanne |
| 43 | Day One | Journal Collections, Themes and search | `half` | built in part; rest **to build** | built in part: `1f67dbc9`, `6b194efb` (tags added, removed, suggested and filtered; search finds tags) — still missing: several journals, journal themes, search by date. Group 9. | M | Sanne |
| 44 | Day One | Imports and integrations | `missing` | **to build** (part Carried: needs an outside service) | to build: import a Day One or Apple Journal export file. Part Carried: Strava, Zapier, IFTTT — needs an outside service. Group 9. | M | Sanne |

### Habits, mood and meditation

#### Habitica

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 45 | Habitica | Dailies with flexible repeat | `half` | **to build** | to build: a difficulty per habit for XP (`XP_RULES.habitComplete` is a flat 10 in `lib/game/xp.ts`). Group 4. | S | Max |
| 46 | Habitica | Record Yesterday's Activity (Cron) | `half` | built | `e18a311c` (yesterday's open habits in one list), `774b4e48` (on Today from its first open, kept until handled or Not now). | — | Max, Sanne |
| 47 | Habitica | Class system and skills | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals: classes and the skills to spend points on are game content designed for ZIGoals (COMPETITORS.md "Not ranked": "the class system"). Note for the owner: the weakest of the content causes. | — | Max (maybe) |
| 48 | Habitica | Orb of Rebirth (restart at level 1) | `missing` | **to build** | to build: "count XP from this day", keeping badges. Group 4. | S | none |

#### Streaks (Crunchy Bagel)

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 49 | Streaks (Crunchy Bagel) | 2-Day Rule | `missing` | built in part; rest **to build** | built in part: `e18a311c` ("Never missed twice: N days" beside the unchanged streak), `774b4e48` (on the card face and beside Today's streak; "Don't miss today" the day after a miss — the matrix's badge on the day that must not be missed) — still missing: the per-habit opt-in that makes the streak itself keep one missed day. ADR-045 D-BUILD kept the streak (QUALITY.md "Owner-decision rows"); that reason is not one of the eight causes, so it stays to build (TIER 3 stored). Group 4. | M | Max, Sanne |
| 50 | Streaks (Crunchy Bagel) | Unscheduled tasks | `half` | **to build** | to build: a habit with no schedule ("whenever"), logged any day, never due or missed (TIER 3 stored format, additive). Group 4. | M | Max |
| 51 | Streaks (Crunchy Bagel) | Themes and icons | `half` | built | `b435c585` (TIER 3 stored: `looks`), `29e74634` (picker), `774b4e48` (the symbol and colour wherever the habit's name is listed: card, week grid, compact list, Today, Checklist, year view). | — | Max, Sanne |

#### Finch (self-care pet)

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 52 | Finch (self-care pet) | Goal of the Day | `missing` | built in part; rest **to build** | built in part: `f26ea2ac` (TIER 3 stored: `focus`), `17cba0ef`, `774b4e48` (the badge on its own line) — still missing: the small XP bonus when done ("XP for the focus habit": QUALITY.md "Not fixed"; habits already earn XP in `lib/game/xp.ts`, so no named rule forbids it). Choice made since: the Showcase no longer sets a focus habit (`5a07c852`, D-028's 90 Tab stops). Group 4. | S | Max, Sanne |
| 53 | Finch (self-care pet) | Self-Care Areas and Weekly Milestones | `half` | **to build** | to build: weekly progress per self-care area ("Health: 9 of 12 this week") and a per-area milestone. Group 4. | S | Sanne, Max |
| 54 | Finch (self-care pet) | Goal Challenges (14-day themed) | `half` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals (programmes): a ready-made 14-day themed plan of several habits. | — | Sanne, Max |
| 55 | Finch (self-care pet) | Seasonal events | `missing` | **to build** | to build: a monthly theme with its own badge in `lib/game/badges.ts` (no pet; can be switched off). Group 4. | M | Max (maybe) |
| 56 | Finch (self-care pet) | Muted tags and exercises | `missing` | **to build** | to build: one device list that hides chosen daily questions, journal templates and breathing patterns. Group 4. | S | Sanne |

#### Habitify

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 57 | Habitify | Status Update automation [native-only] | `half` | **to build** | to build: a per-habit choice to treat an unlogged day as skipped instead of missed. Group 4. | S | Max |
| 58 | Habitify | Pause-and-reflect prompts | `half` | built | `5bd33c4a` ("What got in the way?" on yesterday's open habit), `774b4e48` (also from the week grid; no preselected reason; reasons counted in Patterns). | — | Max, Sanne |
| 59 | Habitify | Journal week view | `half` | built | `48948e0c` (Monday-to-Sunday grid), `774b4e48` (sticky names, short day heads on phones, a × for a slip), `81d21430`. | — | Max |

#### Bearable (mood and symptom tracker)

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 60 | Bearable (mood and symptom tracker) | Daily health check-in | `half` | **to build** | to build: one optional step-by-step evening check-in (mood, symptoms and factors, last night, supplements, a note), each step skippable. Group 8. | M | Sanne |
| 61 | Bearable (mood and symptom tracker) | Mood and emotions | `half` | **to build** | to build: your own feeling words added to a mood quadrant, kept on the device. Group 8. | S | Sanne |
| 62 | Bearable (mood and symptom tracker) | Symptoms with severity and time periods | `half` | **to build** | to build: parts of the day or times for symptoms, groups, a day total; more than one mood a day (TIER 3 stored, additive). Group 8. | M | none |
| 63 | Bearable (mood and symptom tracker) | Factors (lifestyle and triggers) | `half` | **to build** (part Carried: needs an outside service) | to build: a ready list of common factors to pick or search, and a "why I track this" note. Part Carried: weather — needs an outside service. Group 8. | S | Sanne |
| 64 | Bearable (mood and symptom tracker) | Health Experiments | `half` | **to build** | to build: up to 8 outcomes, and symptoms and factors as the change or the outcome (`OUTCOMES`, `EXPERIMENT_FACTOR_KINDS`). Group 8. | M | Sanne, Tom |
| 65 | Bearable (mood and symptom tracker) | Factor Effect report (correlations) | `half` | built | `ace3a7f2` (every habit, mood tag, journal tag, workouts and meditation against mood, energy and sleep, ranked), `774b4e48` (symptoms and supplements as factors; next-day effects). | — | Sanne, Tom |
| 66 | Bearable (mood and symptom tracker) | Trends & Insights baselines and weekly report | `half` | **to build** | to build: mood, energy and symptoms in Trends (90 against 365 days, "your usual"). Group 8. | S | Sanne |
| 67 | Bearable (mood and symptom tracker) | Customisable graph | `half` | **to build** | to build: one chart that lays chosen measures (mood, sleep, steps, a symptom, a habit's days) over the same weeks. Group 8. | M | Sanne, Tom |
| 68 | Bearable (mood and symptom tracker) | Mark day complete | `missing` | **to build** | to build: "Day logged" on Health's day view and the gaps in the day picker. Group 8. | S | Sanne |
| 69 | Bearable (mood and symptom tracker) | Hide triggering data | `missing` | built in part; rest **to build** | built in part: `a81220f3`, `774b4e48` (every body figure carries `data-body-figure`: Health's tiles, Weight, Insights, Today's ring, module, coach line) — still missing: NOVA and ZIGi (no hide key read under `lib/ai` or `components/nova` at `d0df34f4`), and the switch in Settings and Export (QUALITY.md "Not fixed"). Group 8. | S | Sanne |
| 70 | Bearable (mood and symptom tracker) | Doctor sharing and export | `half` | built | `a5eddc1f` (the two new sections), `774b4e48` (Blocker #48: wide tables in named, focusable frames; doses from the local day). The out-of-date file comment is gone (`lib/clinician-report/build.ts:11,22-25`). | — | none |

#### Headspace

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 71 | Headspace | Today's Meditation (daily) | `missing` | **to build** | to build: one practice a day from a fixed EN/NL list of short WRITTEN guides shown over the existing timer and bells, with "Another one" (text, no audio). Group 15. | M | Sanne |
| 72 | Headspace | Meditation courses and singles | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals: guided sessions written or recorded and bundled (courses; spoken audio). | — | Sanne |
| 73 | Headspace | Sleepcasts | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals: narrated sleep audio (Sleepcasts). | — | Sanne |
| 74 | Headspace | Move Mode | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals: trainer-led video. | — | none |
| 75 | Headspace | The Wake Up | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals: a daily short video. | — | none |

#### Calm

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 76 | Calm | Sleep Stories | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals: narrated sleep stories (audio). | — | Sanne |
| 77 | Calm | Guided meditation and dailies | `missing` | **to build** (part Carried: needs content made for ZIGoals) | to build: the daily part (the same build as Headspace "Today's Meditation", row 71). Part Carried: the meditation library — needs content made for ZIGoals (recorded courses). Group 15. | M | Sanne |
| 78 | Calm | Multi-day programs | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals (programmes): authored 7-day programmes. | — | Sanne |
| 79 | Calm | Shift (bilateral audio) | `missing` | **to build** | to build: a slow left-right layer (a StereoPanner sweep, Web Audio, no dependency) in the existing mix, worded as relaxation, no therapy claim. Group 15. | S | Sanne |
| 80 | Calm | Scenes | `half` | **to build** | to build: calm, motion-safe visual scenes behind a sitting or breathing. Group 15. | S | Sanne |
| 81 | Calm | Daily Move | `half` | **to build** | to build: a few short guided stretch sequences with written step cues, played by the routine player, logged as activity minutes (no calorie estimate: owner rule). Group 15. | M | Tom, Max |
| 82 | Calm | Calm Lifestyle hub | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals (collections). The partner parts (AllTrails, Adidas): needs an outside service. | — | none |
| 83 | Calm | Calm Sleep companion app [native-only for wearable sync] | `missing` | **to build** (part Carried: native-only) | to build: an evening plan from a few plain questions (4–5 evening steps as a list with a "ready for bed" bar, from existing habits). Part Carried: wearable sync — native-only. Group 13. | M | Sanne |

### Food, sleep and workouts

#### MyFitnessPal

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 84 | MyFitnessPal | Food search and diary | `half` | **Carried**: needs an outside service | Carried — needs an outside service: branded and restaurant foods need the food lookup provider, an owner decision (OWNER_STEPS 9e, `0dc926b5` food Worker). | — | — |
| 85 | MyFitnessPal | Voice Log | `half` | built in part; rest **to build** | built in part: `0e7343d2`, `774b4e48` (a meal in words matched to your foods and 3–5 plain library foods, no model; Undo removes only what that Log made) — still missing: a microphone button on Health's meal field (`git grep` at `d0df34f4`, `components/health`: no speech input). Group 5. | S | Sanne, Tom |
| 86 | MyFitnessPal | Quick Add | `half` | built in part; rest **to build** | built in part: `865bf53b`, `774b4e48` ("Just the calories") — still missing: the optional macros (`components/health/quick-calories.tsx:33` at `d0df34f4`: "protein, carbs and fat stay unknown"). Group 5. | S | Tom, Sanne |
| 87 | MyFitnessPal | Saved meals, recipes and Recipe Importer | `half` | **to build** | to build: a recipe's new ingredients matched to the offline generic library (reuse the `lib/meal-words/match.ts` matcher) instead of saved with kcal unknown. Group 14. | M | Tom |
| 88 | MyFitnessPal | Custom macro goals by day and Net Carbs mode | `half` | **to build** | to build: macro grams or split per weekday (only kcal shifts now); a sugar-alcohols field for net carbs. Group 5. | M | Tom |
| 89 | MyFitnessPal | Meal Planner and grocery list | `half` | **to build** (part Carried: needs an outside service) | to build: a meal plan from your recipes to fit your kcal and macro targets. Part Carried: grocery delivery — needs an outside service. Group 14. | M | Tom |
| 90 | MyFitnessPal | Today screen, streaks, habit challenges and meal reminders | `half` | **to build** | to build: meal reminders as device notifications (a meal kind in `lib/notify/plan.ts:12`, which has none) and a weekly logging challenge. Group 5. | S | Tom, Max |
| 91 | MyFitnessPal | Plan tab | `half` | **to build** | to build: a built-in recipe collection from offline generic foods, filtered by diet style (as `lib/diet-templates`). Group 14. | M | Tom |
| 92 | MyFitnessPal | GLP-1 support | `half` | **to build** | to build: symptom levels against dose days in Compare (`lib/compare/engine.ts` reads neither supplements nor symptoms). Group 17. | S | — (none of the five) |

#### Cronometer

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 93 | Cronometer | Food diary with 95 nutrients | `half` | **to build** | to build: about 70 more nutrient columns in the offline library (25 now, `lib/food-generic/load.ts`), from public food tables bundled at build time (no runtime service). Group 17. | L | — (none daily) |
| 94 | Cronometer | Voice Logging | `half` | built | `0e7343d2` (no-model matching of meal words to foods). Mic button: see MyFitnessPal Voice Log (row 85). | — | Sanne, Tom |
| 95 | Cronometer | Custom recipes and Recipe Importer | `half` | **to build** | to build: same build as row 87 (offline-library nutrition for imported ingredients). Sharing with users: against a named rule (nothing shared between people) — not proposed. Group 14. | M | Tom |
| 96 | Cronometer | Repeat Items | `missing` | built | `5e34a287` ("Repeat on" weekdays for 1–12 weeks, each still logged when eaten), `774b4e48` (minors). | — | Tom, Sanne |
| 97 | Cronometer | Macro Scheduler | `half` | **to build** | to build: macros per weekday (same build as row 88). Group 5. | M | Tom |
| 98 | Cronometer | Custom Charts and Reports | `half` | **to build** | to build: nutrients, weight, blood pressure and lab values as series in Compare; a nutrition section in the visit report. Group 17. | M | — (none daily) |
| 99 | Cronometer | Nutrition Scores and Report Summary widget | `half` | built | `71bed717` (30 days, 90 days or chosen dates), `774b4e48` (minors), `2eae5912`. | — | Tom |
| 100 | Cronometer | Oracle nutrient search and food suggestions | `half` | built in part; rest **to build** | built in part: `af94c4db`, `774b4e48` (the library's richest foods, herbs, spices, seaweed and powders left out, ranked by a usual portion; what 100 g covers of today's gap) — still missing: protein and vitamins (`lib/food-generic/search.ts:95` at `d0df34f4`: `HighInKey` is fibre, sugar, saturated fat, sodium, potassium, calcium, iron). Group 5. | S | Tom |
| 101 | Cronometer | Diary timestamps | `missing` | **to build** | to build: an optional eaten-at time per diary entry (a loose device record beside the strict diary). Group 5. | M | Tom |

#### MacroFactor

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 102 | MacroFactor | AI food logging: Snap and Describe [camera] | `half` | built | `0e7343d2` (Describe without a model: words to diary entries). Snap from a photo: needs a model (not this row's missing part). | — | Sanne, Tom |
| 103 | MacroFactor | Custom food from product photos [camera] | `half` | **to build** (part Carried: needs a model) | to build: a front-of-pack photo kept with the custom food. Part Carried: reading the name and brand from the photo — needs a model (text recognition). Group 5. | S | Tom |
| 104 | MacroFactor | Recipe importer (URL or cookbook photo) | `half` | **to build** (part Carried: needs a model) | to build: offline-library nutrition for new ingredients (same build as row 87). Part Carried: a cookbook photo — needs a model. Group 14. | M | Tom |
| 105 | MacroFactor | Quick-add and copy/paste | `half` | built | `865bf53b` ("Just the calories"; the optional macros are in row 86). | — | Tom, Sanne |
| 106 | MacroFactor | Weekly check-in with coaching modules | `half` | **to build** | to build: choosing the check-in day (always Monday) and marking a day as partly logged so the estimate leaves it out. Group 5. | S | Tom |
| 107 | MacroFactor | Per-day macro targets and fasting days | `half` | **to build** | to build: macros per weekday (row 88), a goal ETA date, the coach using the pace chosen on the energy card (`coach.ts` uses a fixed −0.4/+0.25 kg). Fasting days stay blocked by the 1,200 kcal floor (by design; not asked). Group 5. | M | Tom |
| 108 | MacroFactor | Micronutrients and top contributors | `half` | built in part; rest **to build** | built in part: `71bed717` (30-day, 90-day and chosen-range averages) — still missing: nutrient timing, which needs entry times (row 101). Group 5. | S | Tom |
| 109 | MacroFactor | MacroFactor Workouts (separate app) | `half` | **to build** (part Carried: native-only) | to build: a rep-progression rule on a routine (next session's target weight or reps). Part Carried: Live Activity — native-only. Group 11. | M | Tom |

#### Strava

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 110 | Strava | Athlete Intelligence | `half` | built in part; rest **to build** | built in part: `fa44ab49`, `774b4e48` (best efforts 1, 5, 10 km and the half marathon, from runs only; the longest run) — still missing: a no-model summary per run against the last few runs. Group 11. | S | Tom |
| 111 | Strava | Goals, challenges and Fitness Score | `half` | **to build** | to build: a distance goal (week, month, year) and a cardio training-load line. Challenges with friends: against a named rule (nothing shared between people) — not proposed. Group 11. | M | Tom |
| 112 | Strava | Coach-designed strength workouts | `missing` | **to build** | to build: written guided strength workouts (sets, reps, rest, form tips as text) to start as a routine — with the Hevy routine library (row 115). Group 11. | L | Tom |
| 113 | Strava | Strava + Runna training plans | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals (programmes): multi-week running plans. | — | Tom |

#### Hevy

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 114 | Hevy | Live PR notifications | `half` | built | `59b4d078`, `774b4e48` (one star on the set row that beats every earlier one). | — | Tom |
| 115 | Hevy | Routines, folders and routine library | `half` | **to build** | to build: routine folders and a ready-made routine library. Group 11. | M | Tom |
| 116 | Hevy | Exercise library and custom exercises | `half` | **to build** | to build: how-to steps and target muscles per exercise (text; videos not needed). Group 11. | M | Tom |
| 117 | Hevy | Progress analytics | `half` | built in part; rest **to build** | built in part: `2f14da2d`, `774b4e48` (distance per sport, time and weight lifted per week, week labels) — still missing: sets per muscle across weeks, a monthly workout report, Wrapped reading workouts (`lib/wrapped/build.ts`). Group 11. | M | Tom |
| 118 | Hevy | Calendar and streaks | `half` | built in part; rest **to build** | built in part: `495f3664`, `774b4e48` (the month as weeks; a trained day lists its workouts; a dot on phones) — still missing: the year view. Group 11. | S | Tom, Max |
| 119 | Hevy | Three-level notes | `half` | built in part; rest **to build** | built in part: `59b4d078` (last time's note with "Keep it") — still missing: a note pinned to the exercise and a routine note. Group 11. | S | Tom |
| 120 | Hevy | Hevy Trainer (Pro) | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals (programmes): a programme builder writes authored splits. Its progression rule is row 109 (to build). | — | Tom |

#### Sleep Cycle

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 121 | Sleep Cycle | Sleep Score (3 pillars) | `half` | built | `89428f24` (wake-time regularity and quality ratings in the score), `774b4e48`, `b67d1614` (an unknown part is said as left out). | — | Sanne |
| 122 | Sleep Cycle | Sleep Aid audio | `half` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals: spoken sleep stories and guided sleep meditations. | — | Sanne |
| 123 | Sleep Cycle | Statistics tab | `half` | built in part; rest **to build** | built in part: `8a3d2468`, `774b4e48` (90 days and exactly 12 whole months; average quality, bed and wake times) — still missing: time to fall asleep (`latencyMin`, entered in `components/health/sleep/sleep-forms.tsx:84`; none in `lib/sleep/longer.ts` at `d0df34f4`) and quality as charted lines. Group 13. | S | Sanne |
| 124 | Sleep Cycle | Weekly reports and global benchmarks | `half` | **to build** | to build: a line against published population averages (static reference figures, labelled as such). Group 13. | S | Sanne |
| 125 | Sleep Cycle | Sleep goal and sleep programs | `half` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals (programmes): a guided multi-week sleep programme. | — | Sanne |

### Money, debt and crypto

#### YNAB

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 126 | YNAB | Targets (category goals) | `half` | built in part; rest **to build** | built in part: `57ee9c1f` (TIER 3 stored: `target: {amount, by}`), `11fc62b7` (TIER 3 AI), `c54eaa2b`, `f39bee8f` ("save towards an amount by a month": set aside this month, to go, on track / short) — still missing: weekly and yearly target types, an Underfunded total, snooze. Group 7. | M | Lina |
| 127 | YNAB | New Assign Mode (preview) | `half` | **to build** | to build: a different amount per month, quick-assign ("fund what's underfunded", "same as last month") and moving money between categories. Group 7. | M | Lina |
| 128 | YNAB | Spotlight | `half` | built in part; rest **to build** | built in part: `03713457`, `f39bee8f` (`lib/money-attention.ts`: to review, budgets over / near / faster, watched categories, bills due in 3 days). Choice made since: the glance line is one link naming every piece and opening its first piece's place (`5a07c852`) — still missing: a bill's note to self coming due (`cancelNote`, `lib/bills/schema.ts:32`). Group 6. | S | Lina |
| 129 | YNAB | Home tab "command center" (mobile) | `half` | built in part; rest **to build** | built in part: `03713457` (the "Money:" line on Today), `e749b9e7` (search the money log) — still missing: what is left in each budget on Today itself (the budgets widget is NOVA's, `lib/nova/widgets/catalog.ts:74`). Group 6. | S | Lina |
| 130 | YNAB | Plan Reset | `missing` | built | `03a70d26` (TIER 3 stored: "Start this month fresh", `freshFrom`, with Undo). | — | Lina |
| 131 | YNAB | Habit-matching auto-categorisation | `half` | built in part; rest **to build** | built in part: `e749b9e7`, `f39bee8f` (the category a payee had before, offered while typing in the entry form: `lib/money-log/suggest.ts`) — still missing: the same on new imports. Group 6. | S | Lina |
| 132 | YNAB | Credit card payment auto-match | `missing` | **to build** | to build: an account and a "transfer" kind on entries, and matching an out and an in of the same amount across two imported files (file imports only; no bank link). COMPETITORS.md "Not ranked" groups card auto-match with bank links, but this row's missing part names files only. Group 6. | L | Lina |
| 133 | YNAB | Credit card interest handling | `half` | **to build** | to build: leave one entry out of budgets and totals ("not part of my spending"); opened HEAD `lib/money-log/schema.ts:32-39`: no such field. Group 6. | S | Lina |
| 134 | YNAB | Multi-device sync, offline, widgets, Apple Card import | `half` | **to build** | to build (TIER 3 sync, separate commits): the money log, budgets, bills and rules in the encrypted account sync — opened `lib/vault/extras-keys.ts:13-22` and `lib/vault/section-status.ts:19`: none of them synced now. Group 18. | L | Lina |

#### Monarch Money

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 135 | Monarch Money | Flex budgeting | `missing` | **to build** | to build: a per-budget bucket (fixed, flexible, non-monthly) and one "flexible left" figure. Group 7. | M | Lina |
| 136 | Monarch Money | Category budgets with rollovers | `half` | **to build** | to build: non-monthly budgets (a yearly or quarterly amount spread over the months), a starting balance, budget groups. Group 7. | M | Lina |
| 137 | Monarch Money | Budget page refinements | `half` | **to build** | to build: a CSV download of a month's budget table. Group 7. | S | Lina |
| 138 | Monarch Money | Forecasting | `half` | **to build** | to build: several saved forecast scenarios side by side, and one-off or recurring life events in the long model. Group 7. | L | — (none daily) |
| 139 | Monarch Money | Reports (Sankey, treemap, mobile) | `half` | built in part; rest **to build** | built in part: `899b9b39`, `f39bee8f` (income into categories, drawn and as a table) — still missing: drilling from a category into its entries, with bulk recategorise. Group 6. | M | Lina |
| 140 | Monarch Money | Exclude filters | `missing` | built in part; rest **to build** | built in part: `e749b9e7`, `f39bee8f` (search the whole log by words, kind, category, dates and amount range, with the total) — still missing: exclude filters, payee and tag filters that the totals follow. Group 6. | S | Lina |
| 141 | Monarch Money | Receipt scanning and forwarding | `half` | **to build** | to build: matching a receipt photo or draft to an imported entry by amount and date; several photos at once. Group 6. | M | Lina |
| 142 | Monarch Money | Transaction review and activity log | `half` | **to build** | to build: a per-entry history of changes (category, amount, rule); a re-import that updates a changed row. Group 6. | M | Lina |
| 143 | Monarch Money | Accounts: sort, notes, net worth range | `half` | **to build** | to build: an account note and a custom account order (opened HEAD `lib/accounts/schema.ts:22-23`: notes only on balance snapshots and payments). Group 6. | S | Lina |

#### Copilot Money

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 144 | Copilot Money | To Review queue + Copilot Intelligence | `half` | built in part; rest **to build** | built in part: `e749b9e7`, `f39bee8f` (category from your own past choices, in the entry form) — still missing: the suggestion in the To Review queue of imports (same rest as row 131). Group 6. | S | Lina |
| 145 | Copilot Money | Budgets with rollovers | `half` | **to build** | to build: a suggested budget from the last months' average; a different amount for one month (with row 127). Group 7. | S | Lina |
| 146 | Copilot Money | Recurrings tab | `half` | built | `fdbeefe7`, `f39bee8f` (Upcoming bills → This month: in the money log, passed without it, still to come; the Blocker fixed in `f39bee8f`). | — | Lina |
| 147 | Copilot Money | Split transactions (rebuilt on web) | `half` | **to build** | to build: spreading one entry over several months in budgets (a yearly insurance at 1/12 a month). Group 6. | M | Lina |
| 148 | Copilot Money | Running totals: search, filter, multi-select | `half` | built in part; rest **to build** | built in part: `e749b9e7` (search across the log with the total of the results) — still missing: multi-select with bulk recategorise or tag. Group 6. | M | Lina |
| 149 | Copilot Money | Month and Year in Review | `half` | built in part; rest **to build** | built in part: `03a70d26` ("<Month> in short": spent against the month before, came in, top three categories, largest expense, budgets kept) — still missing: a year in review and the bills' total. Group 6. | S | Lina |
| 150 | Copilot Money | Custom alerts | `half` | built in part; rest **to build** | built in part: `8a028e67`, `f39bee8f` (in-app "faster than the month" and near-limit lines) — still missing: a device notice (no budget kind in `lib/notify/plan.ts:12`) and a payday notice. Group 6. | S | Lina |

#### Rocket Money

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 151 | Rocket Money | Budgets | `half` | built in part; rest **to build** | built in part: `8a028e67` (near the limit from 80 %, in the app and on Today's money line) — still missing: a suggested average from past months (row 145) and the near-limit device notice (row 150). Group 7. | S | Lina |
| 152 | Rocket Money | Watchlist | `half` | built in part; rest **to build** | built in part: `c7652b76` (TIER 3 stored: `watch`), `1563877c`, `f39bee8f` (a category this month against last, under Budgets; on Today's money line when well above) — still missing: watching a payee, and NOVA. Group 6. | S | Lina |
| 153 | Rocket Money | Challenges | `half` | **to build** | to build: a "spend less than last month in <category>" challenge. Group 6. | S | Lina |
| 154 | Rocket Money | Payday View | `half` | built in part; rest **to build** | built in part: `fdbeefe7` (opened HEAD `lib/bills/month.ts:62,76`: the next payday from the log and the bills due before it) — still missing: the cash left after them. Group 6. | S | Lina |
| 155 | Rocket Money | Low-balance alerts | `half` | **to build** | to build: a person-set threshold on the cash forecast ("cash goes below €200 on 14 Dec"). Group 6. | S | Lina |
| 156 | Rocket Money | Transaction tools | `half` | **to build** | to build: your own categories in the forms, budgets and review; "ignore" (row 133); a tax-deductible mark. Group 6. | M | Lina |

#### Undebt.it

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 157 | Undebt.it | Debt payoff planner (8 methods) | `half` | built in part; rest **to build** | built in part: `329415f4`, `ed5f4092` ("Your own order") — still missing: highest monthly interest, highest payment and Cash Flow Index orders. Group 16. | S | — (no persona has debts) |
| 158 | Undebt.it | Compare Payoff Methods | `half` | built in part; rest **to build** | built in part: `ed5f4092` ("Track this plan" keeps one plan and compares) — still missing: the pay-down goals and Today following the kept plan. Group 16. | S | — |
| 159 | Undebt.it | Payment tracking | `half` | built in part; rest **to build** | built in part: `f39bee8f` (opened HEAD `components/wealth/debt-planner.tsx:97`: the tracked plan takes recorded payments off the latest balance, `owedAfterPayments`) — still missing: the debt's own shown balance lowered by its payments until the next statement (payments are listed: `lib/accounts/schema.ts:23`). Group 16. | S | — |
| 160 | Undebt.it | Debt Snowflakes | `missing` | built | `329415f4` (TIER 3 stored: `lumps`), `ed5f4092` ("One-off extra payments" by month). | — | — |
| 161 | Undebt.it | Redesign: top bar, alerts, dark mode | `half` | **to build** | to build: the debt-free date and 12-month progress on Wealth's debts group (the countdown is only inside the planner: `components/wealth/debt-planner-more.tsx:13`). Group 16. | S | — |
| 162 | Undebt.it | Easy Mode landing page | `half` | **to build** | to build: a CSV download of the plan and a small balance trend per debt from its snapshots. Group 16. | S | — |
| 163 | Undebt.it | Plan.it | `half` | built in part; rest **to build** | built in part: `fdbeefe7` (this month's bills against the money log) — still missing: debt minimums in the same list and "Mark paid" (a log entry or debt payment). Group 16. | M | Lina |
| 164 | Undebt.it | Pay off by a target date (Plus) | `missing` | **to build** | to build: a per-debt "paid off by" date that the plan funds first. Group 16. | M | — |
| 165 | Undebt.it | What-if Scenarios (Plus) | `half` | **to build** | to build: reverse mode — "debt-free by <month>" gives the monthly amount needed. Group 16. | S | — |
| 166 | Undebt.it | Debt Restructuring (Plus) | `missing` | **to build** | to build: a consolidation comparison (one rate, term and fee against the current plan), labelled a model, no advice. Group 16. | M | — |
| 167 | Undebt.it | Debt Blaster (Plus) | `missing` | **to build** | to build: a monthly step-up of the extra amount in `runPlan`. Group 16. | S | — |
| 168 | Undebt.it | Bill Tracker (Plus) | `half` | built in part; rest **to build** | built in part: `fdbeefe7` (this month's due dates matched in the log) — still missing: a payment history per bill across months, an "autopay" mark, editing a bill. Group 16. | S | Lina |
| 169 | Undebt.it | Debt details: history, projection, amortization | `half` | built in part; rest **to build** | built in part: `329415f4`, `ed5f4092` ("Month by month": paid, left and interest per debt) — still missing: a promo rate with an end date and a debt note. Group 16. | S | — |
| 170 | Undebt.it | Payoff Snapshots and Progress (Plus) | `half` | **to build** | to build: a paid-off debts list with dates and "paid down this year". Group 16. | S | — |
| 171 | Undebt.it | 52-Week Savings Challenge + printables | `half` | **to build** | to build: printable debt and bill tracker sheets (print CSS exists only for the emergency sheet: opened `components/wealth/money-tools/money-tools.css:47-53`). Group 16. | S | — |

#### CoinStats (crypto portfolio)

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 172 | CoinStats (crypto portfolio) | Include in Profit/Loss switch | `missing` | **to build** | to build: a "count in results" switch per transaction (TIER 3 stored format). Group 10. | M | Jules |
| 173 | CoinStats (crypto portfolio) | Price, volume and market-cap alerts | `half` | built in part; rest **to build** | built in part: `fac8eff3` (TIER 3 stored), `ce541e80`, `f39bee8f` (a % move from today's price, as an exact price) — still missing: a rolling "moves X % in 24 h" from the quotes already read. Group 10. | S | Jules |
| 174 | CoinStats (crypto portfolio) | Portfolio Value Alerts | `missing` | built in part; rest **to build** | built in part: `fac8eff3`, `ce541e80`, `f39bee8f` (above or below a value, in the global watch), `838b2f70` (Today's price-alerts card shows it) — still missing: the ±X % form. Group 10. | S | Jules |
| 175 | CoinStats (crypto portfolio) | Time Machine | `half` | **to build** | to build: "On <date>": holdings and their value that day, from your transactions and stored price history. Group 10. | M | Jules |

## Totals

| Verdict | Rows |
|---|---|
| built (complete for what the row names) | 24 |
| built in part (the rest is to build) | 49 |
| already have | 0 |
| Carried: needs an outside service | 1 |
| Carried: needs content made for ZIGoals | 13 |
| Carried, all causes | 14 |
| to build (nothing built yet) | 88 |
| **Rows with work to build** (built in part + to build) | **137** |
| **All rows** | **175** |

Whole-row Carried causes used: needs an outside service 1, needs content made for ZIGoals 13. Not used: needs a model, native-only, against a named rule, a new dependency, a protected area, 2 failed attempts.

Parts Carried inside rows that are otherwise built or to build (the row is counted once above, by its main verdict):

| Cause of the carried part | Rows |
|---|---|
| needs an outside service | 6 (# 13, 24, 36, 44, 63, 89) |
| needs a model | 3 (# 5, 103, 104) |
| needs content made for ZIGoals | 1 (# 77) |
| native-only | 2 (# 83, 109) |

## To build, grouped as the competitors group them (most daily use first)

Friends: Max (habits, tasks, a night owl), Lina (bank files, budgets, bills), Sanne (sleep, water, the journal, Dutch),
Tom (gym, food, runs), Jules (Earn, Markets). Every row marked "to build" or "built in part" is in exactly one group.

| Order | Group | Rows (ledger #) | Friends | How often | Effort |
|---|---|---|---|---|---|
| 1 | Todoist/TickTick reminders and capture: a custom reminder time and `!2h`, a default reminder, Start focus, reminders inside notes, a "years since" countdown, a split suggestion, several tasks from one utterance | 6 rows: #1 Todoist Quick Add with natural language; #3 Todoist Reminders; #4 Todoist Ramble voice capture; #11 TickTick Reminders; #15 TickTick Countdowns / anniversaries; #31 Notion Reminders | Max, Lina, Sanne | daily | M |
| 2 | Sunsama daily and weekly planning: plan my day around the Agenda, timeboxing with the minutes, planned vs actual with a timer, a day threshold, week objectives, a daily task goal and streak | 8 rows: #9 Todoist Productivity insights and Karma; #21 Sunsama Guided daily planning; #22 Sunsama Weekly planning; #23 Sunsama Weekly objectives; #24 Sunsama Timeboxing / auto-scheduling; #25 Sunsama Planned vs actual time and timers; #26 Sunsama Workload counter and overcommit warning; #27 Sunsama Parallel tasks and timers | Max (Lina weekly) | daily | L |
| 3 | Habit options (Habitica, Streaks, Finch, Habitify): opt-in never-miss-twice streak, unscheduled habits, difficulty XP and the focus bonus, rebirth, unlogged as skipped, areas' weekly progress, a monthly theme, muted prompts | 9 rows: #45 Habitica Dailies with flexible repeat; #48 Habitica Orb of Rebirth (restart at level 1); #49 Streaks 2-Day Rule; #50 Streaks Unscheduled tasks; #52 Finch Goal of the Day; #53 Finch Self-Care Areas and Weekly Milestones; #55 Finch Seasonal events; #56 Finch Muted tags and exercises; #57 Habitify Status Update automation [native-only] | Max, Sanne | daily | M |
| 4 | MyFitnessPal/Cronometer/MacroFactor food logging: macro goals per weekday, diary times and nutrient timing, quick-add macros, a mic on the meal field, Oracle with protein and vitamins, meal reminders and a logging challenge, check-in day, goal ETA, a front-of-pack photo | 11 rows: #85 MyFitnessPal Voice Log; #86 MyFitnessPal Quick Add; #88 MyFitnessPal Custom macro goals by day and Net Carbs mode; #90 MyFitnessPal Today screen, streaks, habit challenges and meal reminders; #97 Cronometer Macro Scheduler; #100 Cronometer Oracle nutrient search and food suggestions; #101 Cronometer Diary timestamps; #103 MacroFactor Custom food from product photos [camera]; #106 MacroFactor Weekly check-in with coaching modules; #107 MacroFactor Per-day macro targets and fasting days; #108 MacroFactor Micronutrients and top contributors | Tom, Sanne | daily | L |
| 5 | Money log tools and notices (Copilot, Monarch, Rocket Money, YNAB): suggestions on imports, exclude and payee filters, bulk recategorise, drill-down, ignore and own categories, split over months, history and re-import, receipts, card auto-match from files, account notes; notes to self, budgets on Today, device notices, payee watch, challenges, cash after payday, low-balance line, a year in review | 20 rows: #128 YNAB Spotlight; #129 YNAB Home tab "command center" (mobile); #131 YNAB Habit-matching auto-categorisation; #132 YNAB Credit card payment auto-match; #133 YNAB Credit card interest handling; #139 Monarch Money Reports (Sankey, treemap, mobile); #140 Monarch Money Exclude filters; #141 Monarch Money Receipt scanning and forwarding; #142 Monarch Money Transaction review and activity log; #143 Monarch Money Accounts: sort, notes, net worth range; #144 Copilot Money To Review queue + Copilot Intelligence; #147 Copilot Money Split transactions (rebuilt on web); #148 Copilot Money Running totals: search, filter, multi-select; #149 Copilot Money Month and Year in Review; #150 Copilot Money Custom alerts; #152 Rocket Money Watchlist; #153 Rocket Money Challenges; #154 Rocket Money Payday View; #155 Rocket Money Low-balance alerts; #156 Rocket Money Transaction tools | Lina | daily | L |
| 6 | Bearable daily check-in: the evening flow, own feeling words, symptoms by part of day, a factor list, experiments with several outcomes, mood/energy trends, a customisable graph, "Day logged", hidden figures in NOVA too | 9 rows: #60 Bearable Daily health check-in; #61 Bearable Mood and emotions; #62 Bearable Symptoms with severity and time periods; #63 Bearable Factors (lifestyle and triggers); #64 Bearable Health Experiments; #66 Bearable Trends & Insights baselines and weekly report; #67 Bearable Customisable graph; #68 Bearable Mark day complete; #69 Bearable Hide triggering data | Sanne, Tom | daily | L |
| 7 | Day One: reminders and streaks, search by date, several journals and themes, prompt packs, save as template, photos and links in entries, audio, import, a scheduled note template | 8 rows: #32 Notion Repeating database templates; #35 Day One Rich journal entries; #38 Day One Prompt Packs; #39 Day One Templates; #40 Day One Journaling reminders and streaks; #42 Day One Audio recorder and Apple Watch (Watch native-only); #43 Day One Journal Collections, Themes and search; #44 Day One Imports and integrations | Sanne | daily | M |
| 8 | CoinStats: a rolling 24 h move alert, ±% portfolio alert, "count in results" switch, Time Machine | 4 rows: #172 CoinStats Include in Profit/Loss switch; #173 CoinStats Price, volume and market-cap alerts; #174 CoinStats Portfolio Value Alerts; #175 CoinStats Time Machine | Jules | daily | M |
| 9 | Hevy/Strava training: routine folders and library, written guided workouts, exercise library, progress analytics, year calendar, pinned and routine notes, a progression rule, a per-run summary, distance goals and training load | 9 rows: #109 MacroFactor MacroFactor Workouts (separate app); #110 Strava Athlete Intelligence; #111 Strava Goals, challenges and Fitness Score; #112 Strava Coach-designed strength workouts; #115 Hevy Routines, folders and routine library; #116 Hevy Exercise library and custom exercises; #117 Hevy Progress analytics; #118 Hevy Calendar and streaks; #119 Hevy Three-level notes | Tom | each gym day | L |
| 10 | YNAB/Monarch budgets: target types, needed this month and Underfunded, assign mode (per-month amounts, quick-assign, move money), suggested amounts, flex buckets, non-monthly budgets and groups, CSV, forecast scenarios | 8 rows: #126 YNAB Targets (category goals); #127 YNAB New Assign Mode (preview); #135 Monarch Money Flex budgeting; #136 Monarch Money Category budgets with rollovers; #137 Monarch Money Budget page refinements; #138 Monarch Money Forecasting; #145 Copilot Money Budgets with rollovers; #151 Rocket Money Budgets | Lina | weekly | L |
| 11 | Task layouts and organisation (Todoist, TickTick, Things, Notion): table, 3-day, year heatmap, Gantt, project calendar, Areas/folders/contexts, several matrices, start early, templates, comments and attachments, a chart from your lists | 11 rows: #7 Todoist Layouts: list, board, calendar, table; #8 Todoist Task descriptions and comments; #10 Todoist Templates; #12 TickTick Filters, lists, folders and tags; #13 TickTick Calendar views and timeline; #14 TickTick Eisenhower Matrix; #17 Things Repeating to-dos and projects; #20 Things Projects, Areas and Headings; #28 Sunsama Channels and contexts; #29 Notion Database views; #30 Notion Chart view | Max | weekly | L |
| 12 | Sleep: latency and quality charts, a benchmark line, an evening plan | 3 rows: #83 Calm Calm Sleep companion app [native-only for wearable sync]; #123 Sleep Cycle Statistics tab; #124 Sleep Cycle Weekly reports and global benchmarks | Sanne | weekly | S |
| 13 | Recipes and meal planning: offline-library nutrition for imported ingredients, a plan that fits the targets, a built-in recipe collection | 5 rows: #87 MyFitnessPal Saved meals, recipes and Recipe Importer; #89 MyFitnessPal Meal Planner and grocery list; #91 MyFitnessPal Plan tab; #95 Cronometer Custom recipes and Recipe Importer; #104 MacroFactor Recipe importer (URL or cookbook photo) | Tom | weekly | M |
| 14 | Calm/Headspace written practices: today's meditation from written guides, the slow left-right layer, scenes, guided stretches | 5 rows: #71 Headspace Today's Meditation (daily); #77 Calm Guided meditation and dailies; #79 Calm Shift (bilateral audio); #80 Calm Scenes; #81 Calm Daily Move | Sanne | weekly | M |
| 15 | Undebt.it debt planner: more methods, the kept plan followed, payments that lower the balance, debt-free date on Wealth, CSV and trend, a to-pay list with Mark paid, target dates, what-if reverse, consolidation, Debt Blaster, bill history and edit, promo rates, paid-off list, printables | 14 rows: #157 Undebt.it Debt payoff planner (8 methods); #158 Undebt.it Compare Payoff Methods; #159 Undebt.it Payment tracking; #161 Undebt.it Redesign: top bar, alerts, dark mode; #162 Undebt.it Easy Mode landing page; #163 Undebt.it Plan.it; #164 Undebt.it Pay off by a target date (Plus); #165 Undebt.it What-if Scenarios (Plus); #166 Undebt.it Debt Restructuring (Plus); #167 Undebt.it Debt Blaster (Plus); #168 Undebt.it Bill Tracker (Plus); #169 Undebt.it Debt details: history, projection, amortization; #170 Undebt.it Payoff Snapshots and Progress (Plus); #171 Undebt.it 52-Week Savings Challenge + printables | none of the five daily (Lina for the to-pay list) | monthly | L |
| 16 | Nutrient depth and charts: 70 more nutrients, Compare series and a nutrition report section, symptoms against dose days | 3 rows: #92 MyFitnessPal GLP-1 support; #93 Cronometer Food diary with 95 nutrients; #98 Cronometer Custom Charts and Reports | none daily | rarely | L |
| 17 | Sync and safety: the journal and the money records in the encrypted sync, a passkey unlock, a high-contrast theme, version history | 4 rows: #33 Notion Version history across workspace; #34 Notion High contrast mode; #41 Day One End-to-end encryption and passcode; #134 YNAB Multi-device sync, offline, widgets, Apple Card import | Sanne, Lina | rarely seen, always there | L |

Notes for the owner:

- Two Carried verdicts rest on the content cause at its edge: #47 Habitica classes and skills (game content, from
  COMPETITORS.md "Not ranked") and #54 Finch's 14-day challenge (a programme). Both become "to build" if the owner
  reads "content" as audio, video and multi-week programmes only.
- Written text (meditation guides #71, stretch cues #81, exercise how-tos #116, guided strength workouts #112, a recipe
  collection #91) is counted as to build, not as content: it can be written in the repository. Spoken audio, video and
  multi-week programmes are Carried.
- Three built features left a part out for a reason that is not one of the eight causes, so that part is to build:
  #49 the opt-in never-miss-twice streak (ADR-045 D-BUILD: the streak is read everywhere), #52 the focus habit's XP
  bonus ("calm rules", while habits already earn XP), #69 hidden figures in NOVA and ZIGi (D-BUILD).
- Build-order items with no `half`/`missing` row left in the matrix, so not in this ledger: F-PROMPT (`cadae4e8`), F-YEAR
  (`3d2d12ce`), A #4 "save a meal, copy a day" (verified already built, Health → Planning, AV_RESUME), the bill calendar
  (`92409b36`), the income flow's Sankey is in #139.
- Sync rows #41 and #134 are TIER 3 (sync) and #41's passkey is TIER 3 (auth): risky areas with their own commits, not
  protected areas. Nothing in the to-build list touches a wallet, signing or a key, adds a dependency, or reaches an
  outside service; the calorie-burn rule holds (#81 logs minutes only).

## Also in lane 2 (owner follow-ups 3 and 4; not COMPETITORS.md rows)

| Item | Verdict |
|---|---|
| CR-19 Erase names each area it erased (the export catalogue's areas) | to build |
| M-9 the goal creator keeps "Continue" as its main button; the 0/80 counter from 60 characters | to build |
| PK-6 ZIGi's "hello in place" (X001) on the first open of the day, once, never with Motion Off or reduced motion | to build |
| PK-10 chain Help topics hidden while no chain is chosen, still found in Help search with a note | to build |
| PK-16 Dependabot dev-only bumps (glob, minimatch) | already have: `pnpm-lock.yaml` holds only `glob@14.0.5`, `minimatch@11.0.8` and `minimatch@3.1.5` (outside the advisory range); re-checked when lane 2's dependencies commit is due |
| QUALITY.md's 74 open Minors | to build |
| CI at the cause: D36, D-SYNC, `zigi-voice-z:199`, A45-1 (the account-sync engine out of every first load) | to build (own lane, at most 2 attempts each) |
| 10 more competitors (Daylio, Loop, Fabulous, Yazio, Lose It!, Strong, Nike Run Club, Insight Timer, Goodbudget, Kubera) | research, then their rows join this ledger |
| UNFINISHED.md `carried` rows re-read; BL-10 chess engine; the two "seen in passing" notes in COMPETITORS.md | to build |

## Ten more apps: rows #176–#222 (owner follow-up 4, item 4e; 22 Nov 2026)


Drafted 22 Nov 2026 from `COMPETITORS-add.md`. These rows go into `docs/review/session-av/LEDGER.md`, in the format of its ledger tables. Every `half` and `missing` row of the ten new apps is here: 47 rows, numbered on from the ledger's #175.

They are grouped by the six pillars the owner named, with the most daily use first in each pillar. A verdict is **to build** or **Carried**. A Carried verdict names one of the ledger's causes:
- needs an outside service
- needs a model
- needs content made for ZIGoals (audio, video, programmes)
- native-only
- against a named rule
- a new dependency
- a protected area

When only part of a row needs a cause, the row is **to build** and the evidence names the carried part. Nothing has been built for these rows, so no row is "built" or "already have". Effort is S (under a day), M (one to two days) or L (three days or more). Personas are the matrix's.

### Totals

| Pillar | Rows | to build | Carried | of which a part is carried |
|---|---|---|---|---|
| Tasks and planning | 0 | 0 | 0 | 0 |
| Journal and notes | 2 | 2 | 0 | 0 |
| Habits and mind | 19 | 17 | 2 (needs content made for ZIGoals) | 1 (#183 native-only) |
| Food | 4 | 4 | 0 | 0 |
| Sleep, workouts and body | 11 | 10 | 1 (needs content made for ZIGoals) | 1 (#210 against a named rule) |
| Money | 11 | 11 | 0 | 1 (#214 needs an outside service) |
| **All** | **47** | **44** | **3** | **3** |

- Tasks and planning: none of the ten apps adds a task row that COMPETITORS.md does not already have. Fabulous's planner is Todoist's and Things' rows.
- Whole-row Carried causes used: needs content made for ZIGoals 3. Not used: needs an outside service, needs a model, native-only, against a named rule, a new dependency, a protected area.

### Ledger

#### Tasks and planning

No new rows.

#### Journal and notes

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 176 | Fabulous | Daily affirmations | `missing` | **to build** | to build: an optional affirmation line on Today, from a short written list in English and Dutch, off by default, with "Another one". Opened `lib/journal/good-things.ts` and `lib/journal-prompts/daily.ts`: there is no affirmation. Written text counts as to build, not content (the ledger's note on #71 and #81). Group N4. | S | Sanne |
| 177 | Daylio | PDF export | `half` | **to build** | to build: a Journal section in the printable report, with the entries, their dates and the day's mood tags. Opened `lib/clinician-report/build.ts:25`: `REPORT_SECTIONS` has no journal. Group N4. | S | Sanne |

#### Habits and mind

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 178 | Daylio | Custom moods | `half` | **to build** | to build: your own word and symbol for each of the five mood levels, shown wherever the mood is. Opened `lib/wrap-up/engine.ts:39`: `MOOD_WORDS` is fixed. The stored 1–5 is unchanged (a display record on the device). Group N1. | S | Sanne |
| 179 | Daylio | Activities with icons and groups | `half` | **to build** | to build: a saved activity list in your own groups, each with a symbol from a fixed set, tapped in the check-in. Opened `lib/mood-tags/schema.ts`: typed tags only, no groups or symbols. Additive device record, TIER 3 (stored format). Group N1. | S | Sanne, Tom |
| 180 | Daylio | Reminders to log | `half` | **to build** | to build: a mood reminder that opens the mood question, and an optional second check-in time. Opened `lib/notify/plan.ts:80`: the evening wake opens `/app/review`. TIER 3 (PWA) for the notification plan. Group N1. | S | Sanne, Max |
| 181 | Fabulous | Routine reminder | `half` | **to build** | to build: a reminder on a routine that opens its player at the first open step. Opened `lib/reminders/due.ts:37`: a habit reminder's link is `/app/habits#habit-<id>`. The player already opens from `#routine=` (`components/habits/habits-workspace.tsx:187`). Group N3. | S | Max, Sanne |
| 182 | Fabulous | Complete a habit from the routine card | `half` | **to build** | to build: a tick per step on the routine card, without starting the player, through the journal's own mutators. Opened `components/habits/routines-panel.tsx`: the card shows only how many are done, with Start or Resume. Group N3. | S | Max |
| 183 | Fabulous | Picture-in-Picture routine progress | `half` | **to build** (part Carried: native-only) | to build: the running routine (step, timer, Done) in a Document Picture-in-Picture window, reusing `lib/ai/pip.ts` (opened: used only for ZIGi; Chrome and Edge 116+, Firefox 151 on computers). Part Carried: the Lock Screen Live Activity and Dynamic Island are native-only. Group N3. | S | Max |
| 184 | Insight Timer | Meditation timer | `half` | **to build** | to build: saved presets (length, bells and sound together), a separate start and end bell, several interval bells with a repeat count or "before the end", a warm-up and an open-ended session. Opened `lib/meditation/schema.ts` (`bellPrefsSchema`: one sound, one interval) and `lib/meditation/timer.ts:11-12`. TIER 3 (stored format), additive. Group N2. | S | Sanne |
| 185 | Loop Habit Tracker | Custom frequency "x times in y days" | `half` | **to build** | to build: a rolling schedule, N times in any M days. Opened `lib/habits.ts:20-30` (`habitScheduleSchema` has no rolling window). An additive schedule kind, TIER 3 (stored format); streaks, NOVA and ZIGi read it. Group N5. | M | Max |
| 186 | Insight Timer | Milestones | `half` | **to build** | to build: calm, once-only meditation badges (seven days in a row, 50 and 100 days in all). Opened `lib/meditation/stats.ts` (`daysInARow`) and `lib/game/badges.ts` (no meditation badge). Group N2. | S | Sanne |
| 187 | Loop Habit Tracker | Habit score with its chart | `half` | **to build** | to build: the strength as a weekly line over the past year. Opened `lib/habits-v2/strength.ts` (today's figure only) and `components/habits/habit-patterns.tsx:20`. Derived, nothing stored. Group N5. | S | Max |
| 188 | Daylio | Activity and mood statistics | `half` | **to build** | to build: per tag, days this month against last month and the spread of moods on its days, in counts and words. Opened `goodDayTags` in `lib/mood-tags/tags.ts`: the share of good days only. Group N1. | S | Sanne |
| 189 | Daylio | Scale statistics | `half` | **to build** | to build: a page per scale, with its ratings over 30, 90 and 365 days and how often each level came. Opened `lib/scales/engine.ts:65`: `scaleSeries` has no reader in the UI. Group N1. | S | Sanne |
| 190 | Loop Habit Tracker | History and frequency charts | `half` | **to build** | to build: totals by month, quarter and year beyond 12 weeks, and the weekday frequency per month. Opened `lib/habits-v2/stats.ts` (`WEEKS = 12`, `byWeek`, `byWeekday`). Group N5. | S | Max |
| 191 | Loop Habit Tracker | Pure black dark mode | `half` | **to build** | to build: a pure-black variant of Dark. Opened `lib/ui-prefs/theme.ts:15`: `THEMES = ['nebula', 'light', 'dark']`. An added theme beside the PR #22 baseline, not a redesign of it (as ledger #34). Group N6. | S | Max |
| 192 | Daylio | Custom fonts | `half` | **to build** | to build: one or two more fonts (a serif, a rounded one) as self-hosted files beside `public/fonts/inter`. Opened `lib/ui-prefs/look.ts` (`font: 'system' or 'inter'`). Font files under an open font licence are not a package, so this adds no dependency; a font that needed an npm package would be a new dependency and is not proposed. Group N6. | S | Sanne |
| 193 | Loop Habit Tracker | Automatic backups | `half` | **to build** | to build: a scheduled copy of Export everything into a folder chosen once (File System Access, Chromium on computers); the monthly reminder stays for other browsers. Opened `lib/backup-reminder.ts`. The backup format is unchanged. Group N6. | M | any |
| 194 | Loop Habit Tracker | Imports from other habit apps | `half` | **to build** | to build: HabitBull and Tickmate files, read only where the layout is documented or open source (the rule in `lib/import/switch/formats.ts`, opened: Streaks stays off for want of a published layout). Group N5. | S | Max |
| 195 | Fabulous | Journeys | `half` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals (programmes): multi-week journeys with a written letter for each step. The short journeys are built (`lib/guided/programs.ts`, opened: seven programmes, one step a day). | — | Sanne, Max |
| 196 | Fabulous | Daily coaching series | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals: a coaching library of two-minute sessions, written series or recorded audio and video, by topic. | — | Sanne |

#### Food

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 197 | Lose It! | Meal names, snacks and meal targets | `half` | **to build** | to build: a fifth and sixth diary meal (an afternoon snack, a late meal). Opened `lib/health.ts:18` (`HEALTH_MEALS` is four) and `components/health/meal-names.tsx` (names, times and targets for the four). TIER 3 (stored format): `diarySchema.meal` is a fixed enum, so older builds must not refuse a new meal (a new optional field, not a new enum value). Group N7. | M | Tom, Max |
| 198 | Lose It! | Diet plans that flag foods | `missing` | **to build** | to build: a chosen eating style (low carb, high protein, high fibre) with a plain "fits" mark on foods by their own nutrients, never "good" or "bad". Opened `lib/health-aa/macro-mode.ts` (display splits only) and `lib/diet-templates/templates.ts`. Group N7. | S | Tom |
| 199 | Yazio | Food ratings | `half` | **to build** | to build: a rating for library and own foods from their nutrients. Opened `components/health/nutri-score.tsx`: the letter is for Open Food Facts products only, and the file says "generic foods never get one". Note for the owner: that line is a design choice, not one of the causes; confirm before building. Group N7. | S | Tom |
| 200 | Yazio | Recipes with a cooking mode | `missing` | **to build** | to build: keep a recipe's method steps (a new device record keyed by recipe id, TIER 3 stored format, so `recipeSchema` in `lib/health.ts:43` is unchanged), and a cooking view one step at a time that keeps the screen on (Wake Lock). Opened `lib/server/recipe-import.ts:69` and `components/health/recipe-import.tsx:61` ("left aside"). Group N7. | M | Tom |

#### Sleep, workouts and body

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 201 | Strong | Imperial, metric or mixed units | `half` | **to build** | to build: a unit per exercise; the stored kilograms are unchanged. Opened `components/health/workouts/units.ts` (one Health weight unit for the page). Group N8. | S | Tom |
| 202 | Strong | Assisted and weighted bodyweight exercises | `missing` | **to build** | to build: an assisted measure and added weight on bodyweight moves, with bests and volume that read them right. Opened `lib/workouts/schema.ts:14` (`MEASURES`). Additive, TIER 3 (stored format). Group N8. | S | Tom |
| 203 | Nike Run Club | Shoe tagging | `missing` | **to build** | to build: shoes with a starting distance and a distance to retire at, picked on a run, with each one's distance and a note near its limit. Opened `lib/workouts/schema.ts` (`workoutSchema`, no gear). A new device record or an additive field, TIER 3 (stored format). Group N8. | S | Tom |
| 204 | Nike Run Club | Achievements for personal records | `half` | **to build** | to build: a quiet, once-only mark when a run best is beaten. Opened `lib/workouts/run-bests.ts` and `lib/game/badges.ts` (no running badge). Group N8. | S | Tom |
| 205 | Yazio | Milestones | `half` | **to build** | to build: opt-in steps on the way to a weight goal (each 2 kg or 10 % of the way), marked on the trend and celebrated once, as `lib/networth-milestones/milestones.ts` (opened) does for net worth. Opened `lib/health-goals/schema.ts`. Group N9. | S | Tom |
| 206 | Strong | Sharing routines and workouts | `half` | **to build** | to build: a workout template shared as a small file, imported with a preview, as `lib/routines/share.ts` does for habit routines. Opened `components/habits/routine-share.tsx` and `templateSchema` in `lib/workouts/schema.ts`. A file the person hands over, no server. Group N8. | S | Tom |
| 207 | Strong | CSV export with notes | `half` | **to build** | to build: RPE, the exercise note and the workout note as columns of `workout-sets.csv`. Opened `lib/export/everything.ts:431`. The export catalogue changes; the records do not. Group N8. | S | Tom |
| 208 | Nike Run Club | Training tips | `missing` | **to build** | to build: short written running tips in English and Dutch, one on the Workouts page. No tips in `lib/workouts` or `lib/help` (searched). Written text counts as to build, not content (the ledger's note on #116). Group N8. | S | Tom |
| 209 | Strong | Strong Cloud | `half` | **to build** | to build (TIER 3 sync, its own commits): the workout log in the encrypted account sync. Opened `lib/workouts/schema.ts`: `WORKOUTS` is a device-only record. A risky area, not a protected one (as ledger #41 and #134). Group N10. | L | Tom |
| 210 | Yazio | Calculators | `half` | **to build** (part Carried: against a named rule) | to build: a BMI figure from a height the person types, the number only, with no judgement word (opened `lib/body-measurement-schema.ts:2`: no height kept). Part Carried: ideal body weight is against the no-medical-advice rule, and calories burned is against the no-calorie-burn-guessing rule. The maintenance estimate is built (`lib/health-aa/energy.ts`). Group N9. | S | Tom |
| 211 | Nike Run Club | Audio-Guided Runs | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals: spoken coaching audio. Playing it during a GPS run is also native-only. | — | Tom |

#### Money

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 212 | Goodbudget | Budget period | `half` | **to build** | to build: a budget month that starts on payday, and weekly or two-weekly budgets. Opened `lib/budgets/schema.ts` (`monthly`, `since` as a calendar month). TIER 3 (stored format), additive on the loose record. Group N11. | M | Lina |
| 213 | Goodbudget | Scheduled Fill from a paycheck | `half` | **to build** | to build: a saved fill (how one paycheck splits over the budgets), offered with one tap when an income entry is logged. Opened `lib/budgets/ready-to-assign.ts` and `setBudget` in `lib/budgets/engine.ts:87`. Group N11. | S | Lina |
| 214 | Kubera | Any currency, one total | `half` | **to build** (part Carried: needs an outside service) | to build: one total in a chosen currency from rates the person types, each with its date, labelled as theirs. Opened `lib/wealth-total.ts:2` ("No exchange rate exists in the app") and `lib/accounts/net-worth.ts`. Part Carried: fetched exchange rates need an outside service. Group N12. | M | Lina, Jules |
| 215 | Kubera | Sheets and sections | `half` | **to build** | to build: your own groups of accounts and holdings, each with a subtotal per currency. Opened `lib/accounts/by-source.ts` and `components/wealth/accounts-section.tsx`. Group N12. | S | Lina |
| 216 | Goodbudget | Debt accounts linked to an envelope | `half` | **to build** | to build: a debt linked to a budget category, so a payment logged there counts against that budget. Opened `lib/accounts/schema.ts` (`payments`) and `lib/budgets/ready-to-assign.ts`. Lowering the balance from the payment is ledger #159. Group N11. | S | Lina |
| 217 | Kubera | Mark as stale | `missing` | **to build** | to build: an "update every month or quarter" choice per manual value or account, shown on Wealth and in For you when overdue. Opened `lib/wealth.ts:190` (a manual value is never stale). Group N12. | S | Lina |
| 218 | Kubera | Link a mortgage to a home | `missing` | **to build** | to build: a mortgage linked to its property, with the equity on the property's row. Opened `lib/accounts/schema.ts` (`property`, `mortgage`, no link). The accounts record is strict, so the link lives in a new device record, TIER 3 (stored format). Group N12. | S | Lina |
| 219 | Kubera | Portfolio share % | `missing` | **to build** | to build: an ownership share per account, so net worth counts that part. Opened `accountSchema` in `lib/accounts/schema.ts` (strict, no share). A new device record keyed by account id, TIER 3 (stored format). Group N12. | S | Lina |
| 220 | Kubera | IRR of an investment | `half` | **to build** | to build: money-in and money-out entries on an account or manual asset, with its annualised return worked out from them, labelled a result, not advice. Opened `lib/portfolio/performance.ts:188-229` (coins only). Group N12. | M | Jules |
| 221 | Kubera | Documents | `half` | **to build** | to build: a photo or PDF kept on the device with an account or asset (IndexedDB, as `lib/money-photos/store.ts`, opened), in Export everything and the erase. Group N12. | S | Lina |
| 222 | Kubera | Fast Forward rules | `half` | **to build** | to build: figures in today's money beside the nominal ones, and a tax rate the person types for each income stream. Opened `lib/fi-model/model.ts`. Life events and saved scenarios are ledger #138. Group N12. | M | Jules |

### To build, grouped (the new rows; most daily use first)

Friends:
- Max: habits, tasks, a night owl.
- Lina: bank files, budgets, bills.
- Sanne: sleep, water, the journal, Dutch.
- Tom: gym, food, runs.
- Jules: Earn, Markets.

Every to-build row above is in exactly one group.

| Order | Group | Rows (ledger #) | Friends | How often | Effort |
|---|---|---|---|---|---|
| N1 | Daylio mood check-in: your own mood words and symbols, activities in groups, a reminder that opens the mood, tag and scale statistics | 5 rows: #178, #179, #180, #188, #189 | Sanne (Tom, Max) | daily | M |
| N2 | Insight Timer meditation: presets, start and end bells, interval bells, warm-up, open-ended sessions, milestones | 2 rows: #184, #186 | Sanne | daily | S |
| N3 | Fabulous routines: a routine reminder that opens the player, a tick on the card, the routine in a mini window | 3 rows: #181, #182, #183 | Max, Sanne | daily | S |
| N4 | Journal: a daily affirmation line, the Journal section in the printable report | 2 rows: #176, #177 | Sanne | daily | S |
| N5 | Loop habit maths: N times in any M days, strength over time, month, quarter and year charts, HabitBull and Tickmate imports | 4 rows: #185, #187, #190, #194 | Max | daily | M |
| N6 | Appearance and keeping a copy: pure black, more fonts, a scheduled backup into a folder | 3 rows: #191, #192, #193 | any | always there | M |
| N7 | Food logging: more diary meals, an eating style that marks foods, ratings for all foods, recipe steps and a cooking view | 4 rows: #197, #198, #199, #200 | Tom, Sanne | daily | L |
| N8 | Strong and Nike Run Club training: a unit per exercise, assisted and weighted bodyweight, shoes, a run-best mark, shared workout templates, CSV columns, running tips | 7 rows: #201, #202, #203, #204, #206, #207, #208 | Tom | each gym day or run | M |
| N9 | Body: weight milestones, a BMI figure | 2 rows: #205, #210 | Tom | weekly | S |
| N10 | Sync: the workout log in the encrypted sync (TIER 3 sync) | 1 row: #209 | Tom | rarely seen, always there | L |
| N11 | Goodbudget budgets: a payday month and weekly budgets, a saved paycheck fill, a debt linked to a budget | 3 rows: #212, #213, #216 | Lina | daily to each payday | M |
| N12 | Kubera net-worth sheet: one total from typed rates, your own groups, stale reminders, mortgage equity, ownership share, IRR from cash flows, documents, today's-money projection | 8 rows: #214, #215, #217, #218, #219, #220, #221, #222 | Lina, Jules | weekly to monthly | L |

Notes for the owner:

- #199 (food ratings for generic foods) goes against a choice written into `components/health/nutri-score.tsx` that is not one of the causes. It is to build only if the owner agrees.
- #210's BMI is the number only. The judgement words (underweight, overweight) and ideal weight are left out under the no-medical-advice rule. If the owner reads that rule to cover the BMI number too, the whole row is Carried: against a named rule.
- Three rows change a stored format and need TIER 3 (stored format) commits: #197 (more diary meals), #185 (a rolling schedule) and #218 and #219 (the strict accounts record, so new device records). #209 is TIER 3 (sync). #180 touches the notification plan, TIER 3 (PWA).
- None of the to-build work adds a dependency (#192 adds font files, not a package), reaches an outside service, needs a model, touches a wallet, signing or a key, or redesigns the accepted baseline (#191 and #192 add options beside it).
- The new to-build rows by pillar:
  - Tasks and planning: 0
  - Journal and notes: 2
  - Habits and mind: 17
  - Food: 4
  - Sleep, workouts and body: 10
  - Money: 11
  - All: 44

## Round 2: rows #223–#255 (owner follow-up 4, item 4g; 22 Nov 2026)



Drafted 22 Nov 2026 from `COMPETITORS-add.md` (second round). These rows go into `docs/review/session-av/LEDGER.md` after "Ten more apps: rows #176–#222", in the format of its ledger tables. Every `half` and `missing` row of the ten new apps is here: 33 rows, numbered on from #222. The code was read at `lane2/batch2` HEAD `cdd996db`, after the lane 2 registries, so nothing that lane 2 built is listed as to build.

They are grouped by the six pillars the owner named, with the most daily use first in each pillar. A verdict is **to build** or **Carried**. A Carried verdict names one of the ledger's causes:
- needs an outside service
- needs a model
- needs content made for ZIGoals (audio, video, programmes)
- native-only
- against a named rule
- a new dependency
- a protected area

When only part of a row needs a cause, the row is **to build** and the evidence names the carried part. Nothing has been built for these rows, so no row is "built" or "already have". Effort is S (under a day), M (one to two days) or L (three days or more). Personas are the matrix's.

### Totals

| Pillar | Rows | to build | Carried | of which a part is carried |
|---|---|---|---|---|
| Tasks and planning | 7 | 7 | 0 | 1 (#228 against a named rule) |
| Journal and notes | 2 | 2 | 0 | 0 |
| Habits and mind | 3 | 2 | 1 (needs content made for ZIGoals) | 0 |
| Food | 0 | 0 | 0 | 0 |
| Sleep, workouts and body | 7 | 7 | 0 | 1 (#235 needs an outside service) |
| Money | 14 | 14 | 0 | 2 (#252 against a named rule; #254 native-only) |
| **All** | **33** | **32** | **1** | **4** |

- Food: none of the ten apps adds a food row. Any.do's grocery list and Wallet's shopping list are MyFitnessPal's row, and that list is built (`lib/grocery`).
- Whole-row Carried causes used: needs content made for ZIGoals 1. Not used: needs an outside service, needs a model, native-only, against a named rule, a new dependency, a protected area.

### Ledger

#### Tasks and planning

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 223 | Microsoft To Do | My Day | `half` | **to build** | to build: a pick for today that leaves the task's own day and deadline alone and is cleared at the end of the day, with yesterday's unfinished picks offered back as "From yesterday" in Plan my day. Opened `lib/tasks/plan-day.ts` (`planSuggestions`) and `components/tasks/tasks-page.tsx:389`: "Plan for today" sets `due: today`. The picks live in the loose `zigoals:task-plan:v1` record (`lib/tasks/plan-record.ts`) as an additive, optional field, TIER 3 (stored format). Group R1. | M | Max |
| 224 | Google Tasks | Reminders from notes saved as tasks | `half` | **to build** | to build: a note's reminder also listed in Tasks' Today and Upcoming and on the Agenda's day, linking back to its note (it stays a note line). Opened `lib/notes/reminders.ts`: its readers are `components/notes/note-reminders.tsx`, `lib/notify/sync.ts` and `lib/ai/local-answers/av2-tasks.ts` only. Derived, nothing stored. Group R1. | S | Max, Sanne |
| 225 | Google Tasks | Print your tasks | `missing` | **to build** | to build: "Print this list" for a project or a view, through print CSS on the page as the bills do. Searched `components/tasks` for `@media print`: none (opened `components/wealth/bills/bills.css:76` for the pattern). Group R9. | S | Max, Lina |
| 226 | Any.do | Templates gallery | `half` | **to build** | to build: a larger written template gallery in English and Dutch, in groups (home, work, family), each a project with sections and days from a start day. Opened `lib/tasks/templates.ts:43` (`BUILT_IN_TEMPLATES`: four). Written text counts as to build, not content (the ledger's note on #71 and #81). Group R9. | S | Max |
| 227 | Any.do | Import from other task apps | `half` | **to build** | to build: Trello's board export (JSON) and Asana's project CSV into projects, sections and tasks. Opened `lib/tasks/import.ts:14` (sources `todoist`, `ticktick`, `ics`). It follows the rule the habit importer keeps (`lib/import/switch/formats.ts`: a layout must be documented or open source); ClickUp and Monday.com stay off until theirs is. Group R9. | M | Max |
| 228 | Any.do | Automations | `missing` | **to build** (part Carried: against a named rule) | to build: simple rules on a project, run on the device when a task is added or moved into a section (set priority, add a label, set the day to today, mark done), each a normal write with Undo. Searched `lib/tasks` and `components/tasks` for automation: none. Part Carried: rules that assign people are against the rule that nothing is shared between people. Rules kept as an additive, optional field on the loose project, TIER 3 (stored format). Group R9. | M | Max |
| 229 | Any.do | Custom fields | `missing` | **to build** | to build: up to five fields per project (text, number, date, choice, tick), shown and sorted as Table columns. Opened `lib/tasks/schema.ts` (`taskSchema`, fixed fields) and `lib/tasks/layouts.ts:191` (`TABLE_COLUMNS`). An additive, optional `fields` on the loose task and project, TIER 3 (stored format). Group R9. | M | Max |

#### Journal and notes

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 230 | Reflectly | Morning motivation and a daily challenge | `half` | **to build** | to build: a small daily challenge beside the affirmation, from a written list in English and Dutch, with Done and Another one, off by default, never counted against the person. Opened `lib/journal/affirmations.ts` (lane 2 #176, built: affirmations only). Written text, not content. Group R3. | S | Sanne |
| 231 | Reflectly | A space to vent | `missing` | **to build** | to build: "Write it out", a page that is never saved, with "Let it go" (clears it) or "Keep as an entry". Opened `lib/journal/schema.ts` and `lib/journal/versions.ts`: every entry and its versions are kept; nothing offers a page that is not stored. Nothing new is stored unless Keep is chosen. Group R3. | S | Sanne |

#### Habits and mind

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 232 | Moodnotes | Feelings with a strength | `half` | **to build** | to build: up to three feeling words on a day, each with a strength (a little, quite, very). Opened `lib/mood-words/schema.ts` (`moodWordDaySchema`: one `word` a day; your own words are lane 2 #61, built). An additive, optional `more` list on the loose day, TIER 3 (stored format); older builds keep reading `word`. Group R4. | S | Sanne |
| 233 | Moodnotes | Thinking traps and the thought checker | `missing` | **to build** | to build: a short written Journal exercise (the situation, the thought, any of about ten named thinking traps with one plain line each in English and Dutch, then "another way to see it"), saved as an ordinary journal entry. Searched `lib` and `components` for thinking trap, catastroph, thought record and reframe: none; opened `lib/journal/reflect.ts` (questions by rule, no traps). Written text, not content. Note for the owner: worded as self-reflection, never as treatment (the no-medical-advice rule). Group R4. | M | Sanne |
| 234 | Moodnotes | Self-awareness articles | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals: a library of articles by mental-health experts. Help (`lib/help`) explains the app only. | — | Sanne |

#### Food

No new rows.

#### Sleep, workouts and body

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 235 | Rise | Energy schedule and its reminders | `half` | **to build** (part Carried: needs an outside service) | to build: opt-in device reminders from the day's own curve: when the focus window starts, before the dip, and at a wind-down start taken from the curve. Opened `lib/energy-curve/curve.ts` (the curve is built) and `lib/notify/plan.ts:12` (`ItemKind` has no focus or dip kind; `windDown` is a fixed time from `components/health/sleep/wind-down.tsx`). TIER 3 (PWA) for the notification plan. Part Carried: putting the schedule on an outside calendar needs an outside service. Group R2. | S | Sanne, Max |
| 236 | Rise | Habits at suggested times | `half` | **to build** | to build: morning steps timed from the wake time (daylight in the first hour, the first coffee after the grogginess), and an opt-in reminder at each chosen step's time. Opened `lib/evening-plan/plan.ts:15-24` (evening steps only, lane 2 #83, built) and `lib/evening-plan/schema.ts:22` (`minutesBefore`, no reminder). Additive on the loose `zigoals:evening-plan:v1`, TIER 3 (stored format); the reminder joins #235's notification work. Group R2. | S | Sanne |
| 237 | Rise | Naps and their effect | `half` | **to build** | to build: a day's naps counted in the sleep balance (marked as naps) and a nap's lift on that day's energy curve, as an estimate. Opened `lib/sleep/engine.ts:49-54` (naps are kept) and `:89-92` (`nightsIn` keeps `kind === 'night'` only). Derived, nothing stored. Group R2. | S | Sanne, Max |
| 238 | Rise | Sleep need from your own nights | `half` | **to build** | to build: an estimate of the person's sleep need from their logged nights, offered as a suggested goal, labelled an estimate, kept only when the person chooses. Opened `lib/energy-curve/curve.ts` (`DEFAULT_NEED = 480`, `needFrom: 'goal' \| 'default'`) and `lib/sleep/schema.ts:36` (`sleepGoalSchema`). Derived; keeping it is the existing goal write. Group R2. | S | Sanne |
| 239 | Fitbod | Gym profiles and equipment | `missing` | **to build** | to build: an equipment tag per library exercise and up to five places with what each has, filtering the picker and the library. Opened `lib/workouts/howto.ts:22` (equipment as free text) and `lib/workouts/library.ts` (no equipment tag). The places are a new device record, TIER 3 (stored format). Group R6. | M | Tom |
| 240 | Fitbod | A workout made for today | `missing` | **to build** | to build: "Suggest a workout": 4–6 exercises from the built-in library for the freshest muscle groups, with the chosen place's equipment and a length, and sets and weights from the person's own last sessions and the progression rule, labelled a suggestion to edit before starting. Opened `components/health/workouts/muscle-freshness.tsx` and `lib/workouts/depth.ts:208-215` (freshness is built) and `lib/workouts/routine-library.ts` (fixed routines). Note for the owner: this writes no programme and picks only from the 48 written how-tos already in `lib/workouts/howto.ts`, so it does not need the authored splits for which ledger #120 (Hevy Trainer) is Carried. Group R6. | L | Tom |
| 241 | Fitbod | Replace an exercise | `missing` | **to build** | to build: "Replace" on an exercise in a running or planned workout, offering library exercises with the same main muscle (and, after #239, the place's equipment), keeping the sets typed so far. Searched `lib/workouts` and `components/health/workouts` for swap, replace, alternative and similar: none; opened `lib/workouts/howto.ts` (main and helping muscles per exercise). Group R6. | S | Tom |

#### Money

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 242 | Wallet by BudgetBakers | Record templates | `missing` | **to build** | to build: up to 20 saved entries offered as one-tap chips in the money form, each tap an ordinary entry with Undo. Opened `components/wealth/spending/spending-section.tsx:23-25` (recent categories only) and `lib/money-log/schema.ts` (no saved entry). A new device record, TIER 3 (stored format). Group R5. | S | Lina, Tom |
| 243 | Spendee | Daily amount left | `half` | **to build** | to build: "about €6 a day left" on every budget row with money left, in its own period. Opened `lib/budgets/pace.ts` (`paceWords` says "left for N days" only near the limit) and `lib/budgets/periods.ts` (weekly and two-weekly periods, built). Derived, nothing stored; a fact, not advice. Group R5. | S | Lina |
| 244 | Wallet by BudgetBakers | Payment types | `missing` | **to build** | to build: an optional "paid with" on an entry (cash, debit card, credit card, transfer, other), with a search filter and totals by method. Opened `lib/money-log/schema.ts:32-64` (`account` is for bank-file rows only). Additive and optional on the loose entry, TIER 3 (stored format). Group R5. | S | Lina |
| 245 | Wallet by BudgetBakers | Planned payments with automatic confirmation | `half` | **to build** | to build: an opt-in "record it for me on the day" for a bill marked autopay, writing the expense on its due day the next time the app opens, with a notice and Undo. Opened `lib/bills/tracker.ts:11-16` ("Mark paid"; "every mark is the person's own record") and `lib/bills/schema.ts:34-35` (`autopay`). Additive on the loose bill, TIER 3 (stored format). Note for the owner: the tracker's comment says every mark is the person's own record, and this writes an entry after a single opt-in rather than a tap each time. Confirm before building; it is a design choice, not one of the causes. Group R5. | S | Lina |
| 246 | Spendee | Budgets by label | `missing` | **to build** | to build: a budget on a tag, counting the tagged entries in any category against an amount. Opened `lib/budgets/schema.ts:14-16` (one `category`) and `lib/money-log/search.ts:14-29` (tags as a filter, kept in their own record). An additive, optional `tag` on the loose budget, TIER 3 (stored format). Group R5. | S | Lina |
| 247 | Wallet by BudgetBakers | One-time budgets across categories | `missing` | **to build** | to build: a one-time budget with its own start and end dates over chosen categories, with spent, left and days to go. Opened `lib/budgets/schema.ts` (`category`, monthly; `group` at `:55` is display only) and `lib/budgets/periods.ts`. A new device record, so the monthly budgets are untouched, TIER 3 (stored format). Group R5. | M | Lina |
| 248 | Emma | Unusual-transaction alerts | `half` | **to build** | to build: a calm line when one entry is well above that payee's or category's usual, on the money log and Today's money line, with "That's fine" to dismiss. Opened `lib/budgets/pace.ts` (category totals only). The category-pace notice is ledger #150. Derived, plus a dismissed list in the loose money log, TIER 3 (stored format). Group R7. | S | Lina |
| 249 | Wallet by BudgetBakers | Balance-limit notifications | `half` | **to build** | to build: a limit per account (below or above) checked against its latest balance snapshot, shown on Wealth and Today's money line. Opened `lib/money-log/schema.ts` (one `lowBalance`) and `lib/ai/local-answers/av2-money.ts:142-144` (`lowBalanceCross` from `lib/money-notices.ts`, on the forecast). The accounts record is strict, so the limits live in the lane 2 sheet record (`lib/wealth-sheet/schema.ts`) or a new device record, TIER 3 (stored format). Group R7. | S | Lina |
| 250 | Emma | Merchant-based budgets | `half` | **to build** | to build: an amount on a watched payee, giving spent, left and the near-limit line. Opened `lib/budgets/schema.ts:71-76` (`payees`, no amount) and `lib/budgets/watch.ts`. An additive, optional `amount` on the loose payee watch, TIER 3 (stored format). Group R7. | S | Lina |
| 251 | Emma | Subcategories | `missing` | **to build** | to build: your own subcategories under any category, rolled up into its totals and budgets and shown apart in drill-down. Opened `lib/money-log/schema.ts:11,34,82` (one `category` string; `own` categories). Additive (an optional `sub` on the loose entry, so older builds read the main category), TIER 3 (stored format). Group R7. | M | Lina |
| 252 | Emma | Custom Split and Settle in Group | `half` | **to build** (part Carried: against a named rule) | to build: "my share" on an entry, with what others owe kept as a list by name on this device and Settle (an income entry that clears it); budgets count my share. Opened `lib/money-log/schema.ts:19-31` (`moneyPartSchema`: categories and a Goal). Part Carried: a group shared with other people's devices is against the rule that nothing is shared between people. Additive on the loose entry, TIER 3 (stored format). Group R8. | M | Lina, Jules |
| 253 | Wallet by BudgetBakers | Debts: lent and borrowed | `half` | **to build** | to build: "Lent" and "Borrowed" with a name, a due date and its reminder, repayments in parts, and Close or Forgive, counted in net worth. Opened `lib/accounts/schema.ts:13-15` (`other-debt`, `other-asset`; payments on debt kinds only, no "who"). It shares #252's list of people owed, as one new device record, TIER 3 (stored format). Group R8. | S | Lina |
| 254 | Wallet by BudgetBakers | Loyalty and club cards | `missing` | **to build** (part Carried: native-only) | to build: store cards (a name and a number) read with the existing scanner (`components/health/barcode-food-lookup.tsx`, opened) or typed, shown full-screen as an EAN-13 or Code 128 barcode drawn by a small encoder of ZIGoals' own, or as a QR code with the existing writer. Checked `node_modules/@zxing/library` 0.23.0: `MultiFormatWriter` writes QR codes only, so the 1D bars need our own encoder and no new package. A new device record, TIER 3 (stored format). Part Carried: adding a card to Apple or Google Wallet is native-only. Group R8. | M | Lina, Sanne |
| 255 | Emma | Spaces: personal and business | `half` | **to build** | to build: a second money space with its own entries, budgets and totals, switched at the top of Money, the personal space unchanged. Opened `lib/money-log/schema.ts` and `lib/money-log/search.ts` (tags and the exclude filter only). A space id on the loose entry and budget, read as personal when missing, TIER 3 (stored format). Group R8. | L | Lina |

### To build, grouped (the new rows; most daily use first)

Friends:
- Max: habits, tasks, a night owl.
- Lina: bank files, budgets, bills.
- Sanne: sleep, water, the journal, Dutch.
- Tom: gym, food, runs.
- Jules: Earn, Markets.

Every to-build row above is in exactly one group.

| Order | Group | Rows (ledger #) | Friends | How often | Effort |
|---|---|---|---|---|---|
| R1 | My Day and note reminders: a pick for today that keeps the task's own day and clears overnight, and a note's reminders in Tasks and on the Agenda | 2 rows: #223, #224 | Max (Sanne) | daily | M |
| R2 | Rise's sleep and energy day: reminders from the energy curve, morning steps and step reminders, naps in the balance and the curve, a sleep need from your own nights | 4 rows: #235, #236, #237, #238 | Sanne (Max) | daily | M |
| R3 | Reflectly's journal: a small daily challenge beside the affirmation, a page to write and let go | 2 rows: #230, #231 | Sanne | daily | S |
| R4 | Moodnotes' feelings: several feeling words with a strength, thinking traps with a thought checker | 2 rows: #232, #233 | Sanne | daily | M |
| R5 | Quick money logging and budgets (Wallet, Spendee): saved entries, paid with, a per-day amount left, planned payments that record themselves, budgets on a tag, one-time budgets | 6 rows: #242, #243, #244, #245, #246, #247 | Lina (Tom) | daily | M |
| R6 | Fitbod gym days: places and equipment, a workout made for today, replace an exercise | 3 rows: #239, #240, #241 | Tom | each gym day | L |
| R7 | Emma's categories and alerts: an unusual-entry line, a balance limit per account, payee budgets, subcategories | 4 rows: #248, #249, #250, #251 | Lina | weekly | M |
| R8 | Shared costs and other money: my share and what others owe, money lent and borrowed, store cards, a business space | 4 rows: #252, #253, #254, #255 | Lina (Jules, Sanne) | weekly | L |
| R9 | Task lists: print a list, a larger template gallery, Trello and Asana imports, project automations, custom fields | 5 rows: #225, #226, #227, #228, #229 | Max | weekly | L |

Notes for the owner:

- #245 writes a money entry on a bill's due day after one opt-in. `lib/bills/tracker.ts` says every mark is the person's own record. This is a design choice, not one of the causes: confirm before building.
- #233 is a written self-reflection exercise. If the owner reads named thinking traps as treatment under the no-medical-advice rule, the whole row is Carried: against a named rule.
- #240 is not ledger #120 again. It picks today's exercises from the existing library by freshness and equipment and writes no programme, so it needs no authored splits. If the owner sees it as programme content, it is Carried like #120.
- #227 reads only layouts that are published (Trello JSON, Asana CSV), the same rule the habit importer keeps in `lib/import/switch/formats.ts`.
- #254 needs barcode drawing that the installed `@zxing/library` cannot do (QR only). The plan is a small encoder of our own, not a new package. A barcode package would be a new dependency and is not proposed.
- Stored-format changes (TIER 3, each in its own commits, all additive): #223, #228, #229, #232, #236, #239, #242, #244, #245, #246, #247, #248, #249, #250, #251, #252, #253, #254, #255. #235 and #236's reminders touch the notification plan, TIER 3 (PWA).
- None of the to-build work adds a dependency, reaches an outside service, needs a model, touches a wallet, signing or a key, or redesigns the accepted baseline. #255 changes the Money page's top with a space switch, so check it against the protected baseline in docs/STATUS.md before building it.
- The new to-build rows by pillar:
  - Tasks and planning: 7
  - Journal and notes: 2
  - Habits and mind: 2
  - Food: 0
  - Sleep, workouts and body: 7
  - Money: 14
  - All: 32

## Verdicts (exit criterion E2; 22 Nov 2026)

Checked on `lane2/batch2` at `cdd996db`, then re-checked at `8f4926e1` after the remainders (lane2/rest), the batch 1 review fixes (revb1, fixb1b) and restore-media (`git log --oneline fbeb3e54..HEAD`, 155 commits). Each row: the LEDGER commit(s) found by `git log --grep` (ranges such as "#157-#159" and "#7–#10" read as ranges), the registry claim, and the files opened in the code. Rows #1–#222 that had work (old verdict "to build" or "built in part"): 181. Open findings from the batch-1 fresh review (`docs/review/session-av/quality/lane2-b1.md` on `feature/session-av-2`, said there to be fixed on `lane2/revb1`, which holds none of them) are named where they touch a row; they are still in this branch's code.

### Each row

| # | app and feature (short) | old verdict | new verdict | evidence (commit sha, file) | what is still missing, if any |
|---|---|---|---|---|---|
| 1 | Todoist: Quick Add with natural language | built in part | built | `6257d24a` (`lib/tasks/split.ts`, `components/quick-add-line.tsx`: "Make 2 tasks" on a long line) | — |
| 3 | Todoist: Reminders | built in part | built | `6257d24a`, `1f9f6935` TIER 3 stored (reminder `at`): "Remind me at" in `task-editor.tsx`, `!2h`/`!30m`/`!18:30` in `lib/tasks/parse.ts:339` | — (the notification keeps Snooze 1 h: QUALITY.md "Not fixed", as before) |
| 4 | Todoist: Ramble voice capture | to build | built | `6257d24a` (`lib/tasks/split.ts` `spokenTasks`: "and then", "daarna"; "remove that" / "haal dat weg", test in `av2-reminders-capture.test.ts:74`) | — |
| 7 | Todoist: Layouts: list, board, calendar, table | to build | built | `7dc424dc`, `1f9f6935` (`lib/tasks/layouts.ts` `tableRows`, `dayColumns` (3 days), `monthGrid` by project; `components/tasks/tasks-plan-views.tsx`) | lane2-b1 #7 fixed (revb1: tasks open and move from the Table, Calendar and Timeline) |
| 8 | Todoist: Task descriptions and comments | to build | built | `7dc424dc` (comments: `layouts.ts` `addComment`), `de1106d4` + `e98d2905` (`lib/tasks/attachments.ts`, `components/tasks/task-attachments.tsx`), `97627b13` (database registered; `zigoals-task-attachments-v1` in `lib/erase-everything.ts`, export in `lib/export/make-everything.ts:55`) | — (lane2-b1 #18 fixed (restore-media); #17: the answer says it cannot count from the store (a count needs the engine to read IndexedDB first; listed)) |
| 9 | Todoist: Productivity insights and Karma | built in part | built | `7dc424dc`, `1f9f6935` (`lib/tasks/plan-record.ts` `dailyGoal`, `goalStreak`, `doneLog` past 30 days) | — |
| 10 | Todoist: Templates | to build | built | `7dc424dc` (`lib/tasks/templates.ts` `BUILT_IN_TEMPLATES` incl. Moving house, `templateFromProject`; `tasks-organise.tsx`) | — |
| 11 | TickTick: Reminders | built in part | built | `6257d24a` (default reminder in `lib/tasks/device.ts` and Tasks → This week; "Start focus" in `components/tasks/reminder-rows.tsx:50`) | — (email reminders: needs an outside service, not proposed, as the ledger) |
| 12 | TickTick: Filters, lists, folders and tags | to build | built | `7dc424dc` (areas group projects: `layouts.ts` `addArea`, `projectsByArea`; Table sorts by `created` / `changed`) | — |
| 13 | TickTick: Calendar views and timeline | to build (part Carried: needs an outside service) | built (part Carried: needs an outside service) | `7dc424dc` (`dayColumns` n = 3, `yearGrid` heatmap, `timelineBars` Gantt) | Carried part: a live URL/Google calendar subscription (outside service); lane2-b1 #7 fixed (revb1) |
| 14 | TickTick: Eisenhower Matrix | built in part | built | `c6571ee9`, `47564542` (named saved matrices up to 10, rules by label, display key `zigoals:matrix-rules`) | — |
| 15 | TickTick: Countdowns / anniversaries | built in part | built | `6257d24a`, `1f9f6935` (`lib/countdowns/extras.ts` `since`; "418 days since · 1 year, 1 month" in `countdowns-card.tsx`) | — |
| 17 | Things: Repeating to-dos and projects | built in part | built | `7dc424dc` ("Start early" `early`, `layouts.ts` `startsEarlyBy`; templates); `e01a761d` merge (lane2/rest R1: a project from a template comes round by itself) | — |
| 20 | Things: Projects, Areas and Headings | to build | built | `7dc424dc` (project `areaId`, `layouts.ts` `archiveSection`) | — |
| 21 | Sunsama: Guided daily planning | built in part | built | `7dc424dc` (`layouts.ts` `fitDay` between timed tasks and calendar events; `components/tasks/today-planner.tsx`) | — |
| 22 | Sunsama: Weekly planning | built in part | built | `7dc424dc` (`objectives` per week: `weekObjectives`, `linkObjective`, `carryObjectives`; Tasks → This week) | — |
| 23 | Sunsama: Weekly objectives | to build | built | `7dc424dc` (`objectives` per week: `weekObjectives`, `linkObjective`, `carryObjectives`; Tasks → This week) | — |
| 24 | Sunsama: Timeboxing / auto-scheduling | built in part (part Carried: needs an outside service) | built (part Carried: needs an outside service) | `7dc424dc` (`nextFreeSlot`; the block ends at its minutes, `lib/agenda/time-items.ts`) | Carried part: writing to an outside calendar |
| 25 | Sunsama: Planned vs actual time and timers | built in part | built | `7dc424dc` (`plan-record.ts` `startTimer`/`stopTimer`, `spent`, `plannedVsActual`) | lane2-b1 #2 fixed (revb1); #14 fixed (revb1) |
| 26 | Sunsama: Workload counter and overcommit warning | built in part | built | `7dc424dc` (`dayLimit`, `overLimit`, the overcommit notice) | — |
| 27 | Sunsama: Parallel tasks and timers | to build | built | `7dc424dc` (task `parallel`, up to 10 timers) | — |
| 28 | Sunsama: Channels and contexts | to build | built | `7dc424dc` (the area choice narrows every list view, display key `zigoals:task-area`) | — |
| 29 | Notion: Database views | to build | built | `7dc424dc` (task table, timeline), `95e265c6` (`lib/notes/table.ts`, `components/notes/notes-views.tsx`: table and gallery of notes) | lane2-b1 #6 and #7 fixed (revb1) |
| 30 | Notion: Chart view | to build | built | `7dc424dc` (`layouts.ts` `chartSeries`: done/open/minutes by week, project, label, priority), `95e265c6` (notes per tag and per week) | — |
| 31 | Notion: Reminders | built in part | built | `6257d24a`, `d775e9c5` TIER 3 PWA (`lib/notes/reminders.ts`, `components/notes/note-reminders.tsx`); revb1 #1 (`988f59db`): a note reminder keeps the day the line was written | — |
| 32 | Notion: Repeating database templates | to build | built | `b8e378d7`, `673180c6` (`lib/notes/schedules.ts`, `components/notes/daily-template.tsx`) | — |
| 33 | Notion: Version history across workspace | to build | built | `25857a52` (`lib/notes/versions.ts`), `0be442c3` (`lib/journal/versions.ts`), `673180c6`; lane2/rest R2 (earlier versions of a task: read, restore, delete) | — |
| 34 | Notion: High contrast mode | to build | built | `d2286de9`, `55c8d86a`, `9388558a` (`lib/ui-prefs/dark-style.ts`, `themes/dark-contrast.extra.css`, `DARK_STYLES` in `scripts/themes/build-themes.mjs`; sheets regenerated in `aa9a30cc`) | — (a Dark style, beside the PR #22 baseline) |
| 35 | Day One: Rich journal entries | to build | built | `82285c14`, `673180c6` (`lib/journal/media.ts`, `lib/journal/entry-links.ts`, `components/journal/compose-media.tsx`; `zigoals-journal-media-v1` in `lib/erase-everything.ts:27`) | lane2-b1 #3 and #4 fixed (revb1); Restore puts the files back (restore-media, #18) |
| 38 | Day One: Prompt Packs | built in part | built | `4ca82685` (`lib/journal-prompts/packs.ts`, six packs EN/NL) | a pack's box does not stay ticked on the tap: fixed on `lane2/fixb1` `55041b03` (in both branches now) |
| 39 | Day One: Templates | built in part | built | `0be442c3` (More → Save as a template; `lib/journal-prompts/own.ts` `body`, `tags`) | — |
| 40 | Day One: Journaling reminders and streaks | to build | built | `0aefdfcf`, `4c9b3aee` TIER 3 PWA (`lib/journal/reminder.ts`, notification kind `journal`; streak line) | — |
| 41 | Day One: End-to-end encryption and passcode | to build | built | `148e9774` TIER 3 sync (`lib/vault/extras-keys.ts` `EXTRAS_CHOICE_SECTIONS`, `lib/vault/extras-sync.ts`, `components/sync/extras-sync-choice.tsx`), `9388558a`; lane2/rest R3 TIER 3 sync (the Worker takes the journal section; its deploy is the owner's, OWNER_STEPS.md) | — |
| 42 | Day One: Audio recorder and Apple Watch (Watch native-only) | to build | built (part Carried: native-only) | `82285c14` (voice note by MediaRecorder in `compose-media.tsx`, kept in `zigoals-journal-media-v1`) | Carried part: Apple Watch; open Majors as #35 |
| 43 | Day One: Journal Collections, Themes and search | built in part | built | `8e904ced` (`lib/journal/books.ts` journals with a colour, `lib/journal/search.ts` dates, `journal-calendar.tsx`) | — |
| 44 | Day One: Imports and integrations | to build (part Carried: needs an outside service) | built (part Carried: needs an outside service) | `54e0fde6` (`lib/journal/import.ts`: Day One ZIP/JSON, Markdown, text, Apple Journal HTML; `lib/journal/export.ts`) | Carried part: Strava, Zapier, IFTTT |
| 45 | Habitica: Dailies with flexible repeat | to build | built | `d4751a1b`, `9675fccd` (habit options `difficulty` 5/10/15/20 XP, `lib/game/xp.ts`) | — |
| 48 | Habitica: Orb of Rebirth (restart at level 1) | to build | built | `d4751a1b`, `9675fccd` (`components/game/rebirth.tsx`, game `rebirth`) | — |
| 49 | Streaks: 2-Day Rule | built in part | built | `d4751a1b` (per-habit `twoDay` in `lib/habit-options/rule.ts`, off by default) | — |
| 50 | Streaks: Unscheduled tasks | to build | built | `d4751a1b` (`whenever`: never due, never missed) | — |
| 52 | Finch: Goal of the Day | built in part | built | `d4751a1b` (+5 XP for the focus habit, `focusDays`) | — |
| 53 | Finch: Self-Care Areas and Weekly Milestones | to build | built | `f634be4f`, `929e616a` (`lib/habit-areas/week.ts`, `habit-areas-week.tsx`, `areaGoals`) | — |
| 55 | Finch: Seasonal events | to build | built | `f634be4f` (`lib/game/month-theme.ts`, "Theme month" badge in `lib/game/badges.ts`, can be hidden) | — |
| 56 | Finch: Muted tags and exercises | to build | built | `fa76a303`, `37e35a1c` (one device list hiding questions, templates and breathing patterns) | — |
| 57 | Habitify: Status Update automation [native-only] | to build | built | `d4751a1b` (`unloggedSkip`) | — |
| 60 | Bearable: Daily health check-in | to build | built | `add9df48`, `2b80c4fd` (`components/health/plus/evening-checkin.tsx`, six skippable steps) | — (lane2-b1 #15 fixed (revb1) |
| 61 | Bearable: Mood and emotions | to build | built | `add9df48` (own words in `components/mood-words/mood-words-grid.tsx`) | — |
| 62 | Bearable: Symptoms with severity and time periods | to build | built (part Carried: against a named rule) | `add9df48` (`lib/checkin-extras/rule.ts`: parts of the day, groups, day total, a mood per part of the day) | Carried part: a second mood a day in Health's strict `moods` record — frozen readers #37–#57 (ADR-045) would refuse it |
| 63 | Bearable: Factors (lifestyle and triggers) | to build (part Carried: needs an outside service) | built (part Carried: needs an outside service) | `add9df48` (ready list of 18 factors EN/NL, "Why I track this") | Carried part: weather |
| 64 | Bearable: Health Experiments | to build | built | `f065b953` (`lib/experiments/engine.ts` `MAX_OUTCOMES` 8, `symptom` kind; `lib/compare/engine.ts`) | — |
| 66 | Bearable: Trends & Insights baselines and weekly report | to build | built | `fc213932` (`lib/feeling-trends/trends.ts`, 90 against 365 days) | — (lane2-b1 #13: the Showcase keeps its teaching empty state (pinned counts)) |
| 67 | Bearable: Customisable graph | to build | built | `fc213932`, `75c834bd` (`components/health/plus/feelings-card.tsx` "Week by week", up to four measures on one week axis) | — (small multiples, not overlaid lines: the one-scale chart rule) |
| 68 | Bearable: Mark day complete | to build | built | `add9df48` (`components/health/day-logged.tsx`, the 14-day strip with gaps as links) | — |
| 69 | Bearable: Hide triggering data | built in part | built (part Carried: a protected area) | `e147b4fc` (`lib/ai/local-answers/av2-hide-figures.ts`, wired at `engine.ts:226`; Settings → Data & privacy; `components/export-everything.tsx`) | Carried part: figures drawn inside NOVA's widgets and cards (`components/nova/widgets`, `cards/ax`) — AR's NOVA composition (ADR-045 protected areas); lane2-b1 #10 fixed (revb1) |
| 71 | Headspace: Today's Meditation (daily) | to build | built | `689c8a56` (`lib/meditation/guides.ts`, 12 written guides EN/NL; `today-practice.tsx`) | — |
| 77 | Calm: Guided meditation and dailies | to build (part Carried: needs content made for ZIGoals) | built (part Carried: needs content made for ZIGoals) | `689c8a56` (the daily part, as #71) | Carried part: the recorded meditation library |
| 79 | Calm: Shift (bilateral audio) | to build | built | `ef097afc`, `0b4fbf87` (`lib/calm/visuals.ts`: a light that glides left and right); lane2/rest R4 (a slow left-right sound made on the device) | — |
| 80 | Calm: Scenes | to build | built | `ef097afc` (four scenes, still under Motion Off; `calm-layer.tsx`) | — |
| 81 | Calm: Daily Move | to build | built | `ef097afc` (`lib/calm/stretches.ts` five sequences EN/NL, `daily-move.tsx`, minutes to activity, no calories) | — |
| 83 | Calm: Calm Sleep companion app [native-only for wearable sync] | to build (part Carried: native-only) | built (part Carried: native-only) | `84b53b1b`, `3685d5e4` (`lib/evening-plan/plan.ts`, Ready for bed bar) | Carried part: wearable sync |
| 85 | MyFitnessPal: Voice Log | built in part | built | `9ef4256a` (a microphone on Health's meal field) | — |
| 86 | MyFitnessPal: Quick Add | built in part | built | `409493f6` (Quick add with protein, carbs and fat) | — |
| 87 | MyFitnessPal: Saved meals, recipes and Recipe Importer | to build | built | `11d55010` (recipe import matched to the offline library) | — |
| 88 | MyFitnessPal: Custom macro goals by day and Net Carbs mode | to build | built | `e30e9665` (macros per weekday, sugar alcohols in net carbs) | — |
| 89 | MyFitnessPal: Meal Planner and grocery list | to build (part Carried: needs an outside service) | built (part Carried: needs an outside service) | `52de2fcc` (a day planned from your recipes to fit kcal and macro targets) | Carried part: grocery delivery |
| 90 | MyFitnessPal: Today screen, streaks, habit challenges and meal reminders | to build | built | `c3e8a4a3`, `ae356287` TIER 3 PWA (meal kind in `lib/notify/plan.ts`; weekly logging challenge) | — |
| 91 | MyFitnessPal: Plan tab | to build | built | `8e8e45b4` (`lib/food-plus/recipe-book.ts`, 20 recipes EN/NL, filtered by style) | — |
| 92 | MyFitnessPal: GLP-1 support | to build | built | `4ecc62ef`, `143b0c34` (`lib/compare/engine.ts` dose and symptom factors, symptom outcomes; `compare-explorer.tsx` reads `SYMPTOMS`, `SUPPLEMENTS`) | — |
| 93 | Cronometer: Food diary with 95 nutrients | to build | built | `4ecc62ef` (`lib/food-plus/library-extras.ts`: the library's 25 nutrients now kept on foods saved by the new flows); lane2/rest R5 (CoFID: 25 → 47 nutrients); CIQUAL's further nutrients Carried: needs an outside service (its download answered 503) | Carried part: CIQUAL (needs an outside service) |
| 95 | Cronometer: Custom recipes and Recipe Importer | to build | built (part Carried: against a named rule) | `11d55010` (as #87) | Carried part: sharing recipes with users (nothing shared between people) |
| 97 | Cronometer: Macro Scheduler | to build | built | `e30e9665` (as #88) | — |
| 98 | Cronometer: Custom Charts and Reports | to build | built | `4ecc62ef`, `143b0c34` (Compare outcomes `kcal`, `protein`, `weight`, `bp`, `lab:<name>`; report section `nutrition` in `lib/clinician-report/build.ts`); lane2/rest R6 (every nutrient as a Compare outcome) | — |
| 100 | Cronometer: Oracle nutrient search and food suggestions | built in part | built | `b165be9c` (Oracle with protein and the vitamins) | — |
| 101 | Cronometer: Diary timestamps | to build | built | `26265cb7`, `69db6bb3` (an eaten-at time per entry, `zigoals:food-plus:v1`) | — |
| 103 | MacroFactor: Custom food from product photos [camera] | to build (part Carried: needs a model) | built (part Carried: needs a model) | `d61e8a19`, `a60b8521` (photo kept with the food, `zigoals-food-photos-v1`) | Carried part: reading name and brand from the photo |
| 104 | MacroFactor: Recipe importer (URL or cookbook photo) | to build (part Carried: needs a model) | built (part Carried: needs a model) | `11d55010` (as #87) | Carried part: a cookbook photo |
| 106 | MacroFactor: Weekly check-in with coaching modules | to build | built | `3bd2f6b2`, `bd73c6f2` (check-in day; partly logged days left out) | — |
| 107 | MacroFactor: Per-day macro targets and fasting days | to build | built | `e30e9665`, `3bd2f6b2`, `dfc1b0e4`, `bd73c6f2`, `1bdf0099` (macros per weekday, goal date, the chosen pace in the coach) | — (fasting days below the 1,200 kcal floor: by design, not asked) |
| 108 | MacroFactor: Micronutrients and top contributors | built in part | built | `26265cb7` (nutrient timing from entry times) | — |
| 109 | MacroFactor: MacroFactor Workouts (separate app) | to build (part Carried: native-only) | built (part Carried: native-only) | `96658369`, `3685d5e4` (`lib/workouts/progression.ts`) | Carried part: Live Activity |
| 110 | Strava: Athlete Intelligence | built in part | built | `145a980a` (`lib/workouts/runs.ts`: a no-model summary against earlier runs) | — |
| 111 | Strava: Goals, challenges and Fitness Score | to build | built (part Carried: against a named rule) | `145a980a`, `3685d5e4` (distance goals, training load, never calories) | Carried part: challenges with friends (nothing shared between people) |
| 112 | Strava: Coach-designed strength workouts | to build | built | `04428d4b` (`lib/workouts/routine-library.ts`, 12 written routines EN/NL) | — |
| 115 | Hevy: Routines, folders and routine library | to build | built | `04428d4b` (routine folders and the library) | — |
| 116 | Hevy: Exercise library and custom exercises | to build | built | `511663cd` (`lib/workouts/howto.ts`, 48 how-tos EN/NL with target muscles) | — |
| 117 | Hevy: Progress analytics | built in part | built | `0fd36539` (`lib/workouts/analytics.ts`: month report, sets per muscle over 8 weeks; Wrapped's training card) | — |
| 118 | Hevy: Calendar and streaks | built in part | built | `11e3d06d` (`lib/workouts/calendar.ts` year view, weeks in a row) | — |
| 119 | Hevy: Three-level notes | built in part | built | `511663cd`, `04428d4b` (`lib/workouts/notes.ts` pinned exercise note; routine note) | — |
| 123 | Sleep Cycle: Statistics tab | built in part | built | `d380d0ea` (`lib/sleep/usual.ts`; time-to-fall-asleep chart and quality line in `sleep-charts.tsx`) | — |
| 124 | Sleep Cycle: Weekly reports and global benchmarks | to build | **built in part** | `d380d0ea` ("your usual" from your own nights) | the row's line against published population averages (static reference figures, labelled as such): the lane's task re-scoped it to the person's own nights (body.md §7); no cause from the list applies |
| 126 | YNAB: Targets (category goals) | built in part | built | `20ff7e1e`, `bea18120` (`lib/budgets/assign.ts` `neededIn` weekly/yearly, Underfunded, snooze) | — |
| 127 | YNAB: New Assign Mode (preview) | to build | built | `20ff7e1e` (`setMonthAmount`, `quickAssign`, `moveMoney`, `assign-panel.tsx`) | — |
| 128 | YNAB: Spotlight | built in part | built | `62c3d42d` (`lib/money-notices.ts` `billNotesDue` in Spotlight) | — |
| 129 | YNAB: Home tab "command center" (mobile) | built in part | built | `62c3d42d` (`budgetsLeft`, opt-in line on Today) | — |
| 131 | YNAB: Habit-matching auto-categorisation | built in part | built | `43efefa0` (suggestion on imported entries, `review-inbox.tsx`) | — |
| 132 | YNAB: Credit card payment auto-match | to build | built | `e5a592fe`, `91ccab36` (account and `transfer` on entries, matched across two files in To review) | — |
| 133 | YNAB: Credit card interest handling | to build | built | `43efefa0`, `91ccab36` (`excluded`; `lib/money-log/counted.ts` `isCounted` read by every figure) | — |
| 134 | YNAB: Multi-device sync, offline, widgets, Apple Card import | to build | built | `148e9774` TIER 3 sync, `9388558a` (money section `money` in the extras choice); lane2/rest R3 TIER 3 sync (the money section; deploy is the owner's) | — |
| 135 | Monarch Money: Flex budgeting | to build | built | `20ff7e1e` (bucket fixed / flexible / non-monthly, "Flexible left") | — |
| 136 | Monarch Money: Category budgets with rollovers | to build | built | `20ff7e1e` (non-monthly budgets, starting balance, groups) | — |
| 137 | Monarch Money: Budget page refinements | to build | built | `20ff7e1e` (`budgetCsv`) | — |
| 138 | Monarch Money: Forecasting | to build | built | `20ff7e1e` (life events in `lib/fi-model/model.ts`, `fi-scenarios.tsx` up to four side by side) | — |
| 139 | Monarch Money: Reports (Sankey, treemap, mobile) | built in part | built | `43efefa0` (drill-down from a category, bulk recategorise) | — |
| 140 | Monarch Money: Exclude filters | built in part | built | `43efefa0` (`lib/money-log/search.ts` exclude, payee and tag filters, totals follow) | — |
| 141 | Monarch Money: Receipt scanning and forwarding | to build | built (part Carried: needs a model) | `e5a592fe` (`lib/money-photos/match.ts`, `several-receipts.tsx`) | Carried part: reading the amount off the photo |
| 142 | Monarch Money: Transaction review and activity log | to build | built | `e5a592fe` (entry `history`; `lib/bankfiles/reimport.ts` updates a changed OFX/CAMT.053/MT940 row); lane2/rest R8 (a CSV re-import updates a changed row) | — |
| 143 | Monarch Money: Accounts: sort, notes, net worth range | to build | built | `62c3d42d` (account note and order) | — |
| 144 | Copilot Money: To Review queue + Copilot Intelligence | built in part | built | `43efefa0` (suggestion per entry in To review, "Use every suggestion") | — |
| 145 | Copilot Money: Budgets with rollovers | to build | built | `20ff7e1e` (`averageSpent`, "This month only") | — |
| 147 | Copilot Money: Split transactions (rebuilt on web) | to build | built | `e5a592fe` (`spread` over 2–24 months) | — |
| 148 | Copilot Money: Running totals: search, filter, multi-select | built in part | built | `43efefa0` (Select, bulk category / tag / leave out) | — |
| 149 | Copilot Money: Month and Year in Review | built in part | built | `62c3d42d` (`yearRecap` with the bills' total, `year-recap.tsx`) | — |
| 150 | Copilot Money: Custom alerts | built in part | built | `62c3d42d` (`moneyWakes`, notification type `money`, `public/sw.js`) | — |
| 151 | Rocket Money: Budgets | built in part | built | `20ff7e1e`, `62c3d42d` (suggested average; near-limit device notice) | — |
| 152 | Rocket Money: Watchlist | built in part | built | `62c3d42d` (`payeeRows`, NOVA answer `payeesWatched`) | — |
| 153 | Rocket Money: Challenges | to build | built | `62c3d42d` (`challengeStates`) | — |
| 154 | Rocket Money: Payday View | built in part | built | `62c3d42d` (`paydayCash`) | — |
| 155 | Rocket Money: Low-balance alerts | to build | built | `62c3d42d` (`lowBalanceCross`, Today and a notice) | — |
| 156 | Rocket Money: Transaction tools | to build | built | `43efefa0` (own categories, "Not part of my spending", tax-deductible mark) | — |
| 157 | Undebt.it: Debt payoff planner (8 methods) | built in part | built | `d8584402` (`lib/debt-planner/more.ts` `methodOrder`: interest, payment, `cashFlowIndex`) | — |
| 158 | Undebt.it: Compare Payoff Methods | built in part | built | `d8584402` (`trackedProgress`; Today's Money line when behind the kept plan) | — |
| 159 | Undebt.it: Payment tracking | built in part | built | `d8584402` (`lib/debt-planner/wealth.ts` `owedNow`) | — |
| 161 | Undebt.it: Redesign: top bar, alerts, dark mode | to build | built | `d8584402` (`components/wealth/debts-summary.tsx`, `debtSummary`) | — |
| 162 | Undebt.it: Easy Mode landing page | to build | built | `d8584402` (`scheduleCsv`, `debtTrend`) | — |
| 163 | Undebt.it: Plan.it | built in part | built | `d8584402` (`lib/bills/tracker.ts` `debtMinimumsThisMonth`, `paidEntry`; Mark paid in `bill-tracker.tsx`) | — |
| 164 | Undebt.it: Pay off by a target date (Plus) | to build | built | `d8584402` (`payoffBy`, `targetChecks`) | — |
| 165 | Undebt.it: What-if Scenarios (Plus) | to build | built | `d8584402` (`extraFor`: debt-free by a month) | — |
| 166 | Undebt.it: Debt Restructuring (Plus) | to build | built | `d8584402` (`consolidation`, labelled a model) | — |
| 167 | Undebt.it: Debt Blaster (Plus) | to build | built | `d8584402` (`stepUp` in `lib/debt-planner/plan.ts:22,122`) | — |
| 168 | Undebt.it: Bill Tracker (Plus) | built in part | built | `d8584402` (`billHistory`, `setAutopay`, `editBill`) | — |
| 169 | Undebt.it: Debt details: history, projection, amortization | built in part | built | `d8584402` (`promoRate`/`promoMonths` in `plan.ts:31`, debt note) | — |
| 170 | Undebt.it: Payoff Snapshots and Progress (Plus) | to build | built | `d8584402` (`paidOffDebts`, paid down this year) | — |
| 171 | Undebt.it: 52-Week Savings Challenge + printables | to build | built | `d8584402` (Print the plan / the bill tracker, print CSS) | — |
| 172 | CoinStats: Include in Profit/Loss switch | to build | built | `3d3d15d4` (`lib/portfolio/counted.ts`) | — |
| 173 | CoinStats: Price, volume and market-cap alerts | built in part | built | `3d3d15d4` (`lib/price-alerts/moves.ts`, 24 h move) | — |
| 174 | CoinStats: Portfolio Value Alerts | built in part | built | `3d3d15d4` (±% in `portfolio-value-alert.tsx`) | — |
| 175 | CoinStats: Time Machine | to build | built | `3d3d15d4` (`lib/portfolio/time-machine.ts`, `time-machine.tsx`) | — |
| 176 | Fabulous: Daily affirmations | to build | built | `a8d84c8f`, `3f0fc85d` (`lib/journal/affirmations.ts`, 28 EN/NL, off by default) | — |
| 177 | Daylio: PDF export | to build | built | `b633cef3` (`lib/journal/report.ts`, `components/report/report-journal.tsx`, off on every open) | — |
| 178 | Daylio: Custom moods | to build | built | `27b65d92`, `cd5d60f5`, `c6951071` (`lib/daylio/rule.ts`, `mood-look-editor.tsx`; Year in pixels key and the Journal's week line); lane2/rest R9 (the Year in pixels in your own mood words; NOVA's mood heat card stays Carried: a protected area) | Carried part: NOVA's mood heat card (a protected area) |
| 179 | Daylio: Activities with icons and groups | to build | built | `27b65d92`, `cd5d60f5` (activities in groups with symbols, `activities.tsx`) | — |
| 180 | Daylio: Reminders to log | to build | built | `237450bb` TIER 3 PWA, `2d3aac26` (mood reminder opening the question, a second time) | — |
| 181 | Fabulous: Routine reminder | to build | built | `0c9e219c` (`lib/routines/reminder-href.ts`: opens the player at the next open step) | — |
| 182 | Fabulous: Complete a habit from the routine card | to build | built | `0c9e219c` (`routine-card-extras.tsx`: a tick per step) | — |
| 183 | Fabulous: Picture-in-Picture routine progress | to build (part Carried: native-only) | built (part Carried: native-only) | `0c9e219c` (`components/habits/routine-pip.tsx`, Document Picture-in-Picture) | Carried part: Lock Screen Live Activity, Dynamic Island |
| 184 | Insight Timer: Meditation timer | to build | built | `85f6977e`, `e52ce016` (presets, start/end bells, interval bells, warm-up, open-ended) | — |
| 185 | Loop Habit Tracker: Custom frequency "x times in y days" | to build | built | `fb4e6700`, `5e8b8f1e` (N times in any M days; streaks, due and missed days) | — |
| 186 | Insight Timer: Milestones | to build | built | `c8f63e32` (7 in a row, 50 and 100 days) | — |
| 187 | Loop Habit Tracker: Habit score with its chart | to build | built | `01a40caf` (strength week by week over the year) | — |
| 188 | Daylio: Activity and mood statistics | to build | built | `27b65d92` (`components/mood-look/tag-stats.tsx`) | — |
| 189 | Daylio: Scale statistics | to build | built | `7b96f289` (each scale over 30, 90, 365 days) | — |
| 190 | Loop Habit Tracker: History and frequency charts | to build | built | `01a40caf` (months, quarters, years, weekdays) | — |
| 191 | Loop Habit Tracker: Pure black dark mode | to build | built | `d2286de9`, `55c8d86a` (Dark style Pure black) | — |
| 192 | Daylio: Custom fonts | to build | built | `d2286de9`, `55c8d86a` (Serif, Rounded, Monospace) | — (as system font stacks, not self-hosted files as the ledger proposed; nothing fetched) |
| 193 | Loop Habit Tracker: Automatic backups | to build | built | `40d698ed`, `55c8d86a`, `aa9a30cc` (`lib/backup-folder/*`; `zigoals-backup-folder-v1` in `lib/erase-everything.ts:33`) | — |
| 194 | Loop Habit Tracker: Imports from other habit apps | to build | built | `9e089c55` (HabitBull and Tickmate, preview and Undo) | — |
| 197 | Lose It!: Meal names, snacks and meal targets | to build | built | `7e629436`, `d4a4efae` (two extra named diary meals, optional `extraMeals`) | — (a Today pin for an extra meal: against a named rule, stored data additive only) |
| 198 | Lose It!: Diet plans that flag foods | to build | built | `be300b51`, `da5125a6` (`lib/food-plus/marks.ts` `fitsStyle`) | — |
| 199 | Yazio: Food ratings | to build | built | `be300b51` (`labelLevels`: UK front-of-pack levels for every food in grams) | — (a Nutri-Score-like letter for generic foods: the owner's open decision, per the ledger note) |
| 200 | Yazio: Recipes with a cooking mode | to build | built | `8e8e45b4`, `e5c2a049` (`lib/food-plus/steps.ts`, `components/health/food-plus/cook-view.tsx`, Wake Lock) | — |
| 201 | Strong: Imperial, metric or mixed units | to build | built | `bb92307f`, `09f577ad` (a unit per exercise) | — |
| 202 | Strong: Assisted and weighted bodyweight exercises | to build | built | `bb92307f` (`lib/workouts/bodyweight.ts`) | — |
| 203 | Nike Run Club: Shoe tagging | to build | built | `674ac530` (`lib/workouts/shoes.ts`) | — |
| 204 | Nike Run Club: Achievements for personal records | to build | built | `674ac530` (a beaten run best marked once) | — |
| 205 | Yazio: Milestones | to build | built | `847ef6d5`, `09f577ad` (opt-in weight milestones, `lib/body-extras/body.ts`) | — |
| 206 | Strong: Sharing routines and workouts | to build | built | `472654bd` (`lib/workouts/share.ts`, file with preview) | — |
| 207 | Strong: CSV export with notes | to build | built | `472654bd` (`lib/workouts/csv.ts`), wired in `lib/export/everything.ts:301,436` | — |
| 208 | Nike Run Club: Training tips | to build | built | `674ac530` (`lib/workouts/run-tips.ts` EN/NL) | — |
| 209 | Strong: Strong Cloud | to build | built | `148e9774` TIER 3 sync (section `workouts`, under the Health consent); lane2/rest R3 TIER 3 sync (the workouts section under the Health consent; deploy is the owner's) | — |
| 210 | Yazio: Calculators | to build (part Carried: against a named rule) | built (part Carried: against a named rule) | `847ef6d5` (BMI number only, from a typed height) | Carried part: ideal weight (no medical advice), calories burned (no calorie-burn guessing) |
| 212 | Goodbudget: Budget period | to build | built | `2bd995a5`, `0c4e060f` (`lib/budgets/periods.ts`: payday month, weekly and two-weekly) | — (lane2-b1 #16 fixed (revb1)) |
| 213 | Goodbudget: Scheduled Fill from a paycheck | to build | built | `2bd995a5` (paycheck fill offered on income) | — |
| 214 | Kubera: Any currency, one total | to build (part Carried: needs an outside service) | built (part Carried: needs an outside service) | `f8cbb54c`, `9388a66d` (`lib/wealth-sheet/sheet.ts` one total from typed rates) | Carried part: fetched exchange rates |
| 215 | Kubera: Sheets and sections | to build | built | `f8cbb54c` (own groups, subtotal per currency) | — |
| 216 | Goodbudget: Debt accounts linked to an envelope | to build | built | `2bd995a5` (a debt paid from a budget) | — |
| 217 | Kubera: Mark as stale | to build | built | `f8cbb54c` ("Due for an update" on Wealth and on Today's Money line) | — (on Today's Money line rather than in For you, which the row named) |
| 218 | Kubera: Link a mortgage to a home | to build | built | `f8cbb54c`, `9388a66d` (mortgage linked to property, equity on its row) | — |
| 219 | Kubera: Portfolio share % | to build | built | `f8cbb54c`, `9388a66d` (ownership share in Your sheet) | — |
| 220 | Kubera: IRR of an investment | to build | built | `f8cbb54c` (money in and out, IRR, labelled a result) | — |
| 221 | Kubera: Documents | to build | built | `f8cbb54c` (`lib/wealth-sheet/docs.ts`; `zigoals-wealth-docs-v1` in `lib/erase-everything.ts:30`, export in `lib/export/make-everything.ts:57`) | — |
| 222 | Kubera: Fast Forward rules | to build | built | `f8cbb54c` (today's money with an inflation figure, tax rate per income event) | — |

### Totals (181 rows with work)

| new verdict | rows |
|---|---|
| built (whole row, or all but a part Carried with an allowed cause) | 180 |
| built in part (the rest Carried: needs content made for ZIGoals) | 1 (#124) |
| already have | 0 |
| Carried (whole row), any cause | 0 |
| to build (nothing built) | 0 |
| **all** | **181** |

Rows with no work before lane 2 are unchanged: 24 built, 14 Carried (13 needs content made for ZIGoals, 1 needs an outside service) in #1–#175; 3 Carried (needs content made for ZIGoals) in #176–#222.

Parts Carried inside rows counted above (cause: rows):

| cause | rows |
|---|---|
| needs an outside service | #13 (calendar subscription), #24 (writing to an outside calendar), #44 (Strava, Zapier, IFTTT), #63 (weather), #89 (grocery delivery), #214 (fetched rates); also #11 and #31 email reminders (not proposed) |
| needs a model | #103 (name from a package photo), #104 (cookbook photo), #141 (amount off a receipt photo) |
| needs content made for ZIGoals | #77 (recorded meditation library) |
| native-only | #42 (Apple Watch), #83 (wearable sync), #109 (Live Activity), #183 (Live Activity, Dynamic Island) |
| against a named rule | #62 (frozen readers #37–#57: a second mood a day in `moods`), #95 and #111 (nothing shared between people), #197 (stored data additive only: a Today pin for an extra meal), #210 (no medical advice; no calorie-burn guessing); #41 passkey claimed under ADR-045 "no wallet, signing or key changes" (owner to confirm: the ledger judged it inside the rules) |
| a protected area | #69 (figures inside NOVA's widgets), #178 (NOVA's mood heat card): both "AR's NOVA composition", ADR-045 |
| a new dependency / 2 failed attempts | none |

Carried causes re-checked: the sync Worker for #41, #134 and #209 is now built in the repository (lane2/rest R3; its
deploy is the owner's, OWNER_STEPS.md); #93's CoFID nutrients are built from the public tables at build time, and only
CIQUAL's further nutrients wait (its download answered HTTP 503: needs an outside service at build time).

### Rows still "built in part": exactly what remains (1)

- **#124 Sleep Cycle: Weekly reports and global benchmarks** — "your usual" from the person's own nights is built; the
  line against published population averages needs a cited table (population, source, year) that no file in the
  repository holds: needs content made for ZIGoals (lane2/rest R7 names where it would go).

The other eleven rows of the first check are built: #17, #33, #79, #98, #142, #178 and the sync side of #41, #134,
#209 (lane2/rest), #93 (CoFID, lane2/rest), #31 (revb1 #1).

No row is left "to build". Round 3 (#256–#299) is below, built as batch 3.

### Also in lane 2 (not COMPETITORS.md rows)

| item | verdict on `lane2/batch2` |
|---|---|
| CR-19 Erase names each area | built `8a23eab9` (lane2-b1 #11 fixed (revb1: stores named)) |
| M-9 goal creator's Continue, counter from 60 | built `c6571ee9` |
| PK-6 ZIGi's hello in place | built `83873270`, `7d1f5849` |
| PK-10 chain Help topics hidden | built `4777ff00` (plus batch 2's three Portfolio answers, `2af60036`) |
| PK-16 Dependabot dev bumps | already have (unchanged) |
| QUALITY.md's Minors (79 rows in q1–q4; the summary said 74) | 70 fixed, 9 left with a cause (pinned Showcase counts; lane2/minors.md R4); batch 1's review: Blocker and Majors fixed, Minors fixed but #9 (a named rule) and #13 (pinned counts) |
| CI at the cause: A45-1 | built `a88abeb8`, `145483e9`, `2c61a5f6`, `2d270bd9` |
| CI at the cause: D36, D-SYNC, zigi-voice-z:199 | on `lane2/ci` (`4eaa7aef`, `0ab98163`, `ec66b42d`, `0387a28a`, `0cc2f962`), merged (`b848d352`); D-SYNC Carried with new diagnostics |
| 10 more competitors | done `6926408c` (rows #176–#222) |
| UNFINISHED.md carried rows re-read; BL-10 chess engine | done `421cf71f`; BL-10 built `f46b1391`, `b82ef6e0` |
| COMPETITORS.md "seen in passing" notes | done: sleep header `d380d0ea`; report header already right at `fbeb3e54` |



## Round 3: rows #256–#299 (owner follow-up 4, item 4g; 22 Nov 2026)



Drafted 22 Nov 2026 from `competitors-r3.md` (third round: Structured, Obsidian, Grid Diary, Stoic, Way of Life, Carb Manager, Waterllama, Nike Training Club, PocketGuard, Quicken Simplifi). These rows go into `docs/review/session-av/LEDGER.md` after "Round 2: rows #223–#255", in the format of its ledger tables. Every `half` and `missing` row of the ten new apps is here: 44 rows, numbered on from #255. The code was read at `lane2/batch2` HEAD `23eaf493`, after the lane 2 registries, so nothing that lane 2 built is listed as to build.

They are grouped by the six pillars the owner named, with the most daily use first in each pillar. A verdict is **to build** or **Carried**. A Carried verdict names one of the ledger's causes:
- needs an outside service
- needs a model
- needs content made for ZIGoals (audio, video, programmes)
- native-only
- against a named rule
- a new dependency
- a protected area

When only part of a row needs a cause, the row is **to build** and the evidence names the carried part. Nothing has been built for these rows, so no row is "built", "built in part" or "already have". Effort is S (under a day), M (one to two days) or L (three days or more). Personas are the matrix's.

### Totals

| Pillar | Rows | to build | Carried | of which a part is carried |
|---|---|---|---|---|
| Tasks and planning | 8 | 8 | 0 | 1 (#262 against a named rule) |
| Journal and notes | 11 | 10 | 1 (a new dependency) | 0 |
| Habits and mind | 5 | 5 | 0 | 1 (#278 needs content made for ZIGoals) |
| Food and drink | 6 | 5 | 1 (needs content made for ZIGoals) | 0 |
| Sleep, workouts and body | 5 | 4 | 1 (needs content made for ZIGoals) | 1 (#287 against a named rule) |
| Money | 9 | 9 | 0 | 1 (#295 against a named rule) |
| **All** | **44** | **41** | **3** | **4** |

- Whole-row Carried causes used: needs content made for ZIGoals 2 (#285, #290), a new dependency 1 (#274). Not used: needs an outside service, needs a model, native-only, against a named rule, a protected area.
- The four `against a rule` rows of the matrix (Way of Life's red chains, Carb Manager's allergy filtering, Waterllama's water goal calculator and its dehydration mode and characters) and the three `have` rows (Obsidian's Markdown files and accent-free search, Way of Life's colour-blind mode) get no ledger row, as in rounds 1 and 2.

### Ledger

#### Tasks and planning

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 256 | Structured | Morning planning and overdue reminders | `half` | **to build** | to build: an opt-in "Plan your day" notification at a chosen time that opens Plan my day, and one quiet morning line with the count of overdue tasks. Opened `lib/notify/plan.ts:107` (the morning wake opens `/app/checklist`) and `:144-147` (one notification per task reminder; no overdue summary), and `components/tasks/plan-day.tsx` (Plan my day, built). A new notification kind, TIER 3 (PWA); the time joins the loose `zigoals:task-plan:v1` (`lib/tasks/plan-record.ts`), TIER 3 (stored format). Files: `lib/notify/plan.ts`, `lib/tasks/plan-record.ts`, `components/tasks/task-plan-settings.tsx`, `components/notify/notifications-card.tsx`. Group T1. | S | Max |
| 257 | Structured | Task icons and colours | `missing` | **to build** | to build: an optional symbol and colour per task from the habit-look set, shown in lists, on Today and on the timeline, with a symbol suggested from words in the title (a written word list in English and Dutch, no model). Opened `lib/tasks/schema.ts:35,173` (colours on projects and labels only; no icon on a task) and `lib/habit-look.ts` (the symbol and colour set to reuse). An additive, optional `look` on the loose task, TIER 3 (stored format). Files: `lib/tasks/schema.ts`, a new `lib/tasks/look.ts`, `components/tasks/task-editor.tsx`, `components/tasks/tasks-body.tsx`, `lib/tasks/timeline-source.ts`. Group T1. | S | Max |
| 258 | Structured | A timeline for any day | `half` | **to build** | to build: the Day Timeline for tomorrow or a chosen day, to plan ahead (tasks with their minutes, the habits due that day, planned meals and planned workouts), with a block moved there keeping its time for that date only. Opened `components/timeline/day-timeline.tsx:26` (today only), `lib/timeline/build.ts` (`TimelineInput.date`, already a parameter) and `lib/timeline/store.ts` (`times` keyed `habit:<id>` and `meal:<slot>`, one time for every day). Date-scoped keys are additive on the loose `zigoals:day-timeline:v1`, TIER 3 (stored format); older builds keep them and read only their own keys (`TIME_KEY`). Files: `lib/timeline/build.ts`, `lib/timeline/store.ts`, `components/timeline/day-timeline.tsx`, `components/timeline/use-day-timeline.ts`, `lib/tasks/timeline-source.ts`. Group T1. | M | Max |
| 259 | Structured | Energy Monitor | `missing` | **to build** | to build: an optional weight per task (restful, neutral, light, medium, heavy), the day's total against an amount the person sets, said in calm words and never in red, and a quiet mark on a heavy task planned outside the day's focus window. Opened `lib/energy/schema.ts` (one 1–5 rating a day), `lib/tasks/schema.ts:116` (`minutes`) and `lib/tasks/plan-record.ts:32` (`dayLimit`, minutes only; LEDGER #26, built), and `lib/sleep/focus-window.ts`. Additive on the loose task and the loose task plan, TIER 3 (stored format). Files: `lib/tasks/schema.ts`, `lib/tasks/plan-record.ts`, a new `lib/tasks/energy-load.ts`, `components/tasks/task-fields.tsx`, `components/tasks/today-planner.tsx`. Group T1. | M | Max, Sanne |
| 260 | Structured | Notes during a focus session | `half` | **to build** | to build: a note box while the focus timer runs, kept with the session, and added to the task's description when it ends on the person's tap. Opened `lib/focus-sessions/schema.ts:14-31` (times, `mode`, `block`, `taskId`; no note) and `lib/focus-session.ts` (one line on the goal's notes). An additive, optional `note` on the loose session, TIER 3 (stored format). Files: `lib/focus-sessions/schema.ts`, `components/focus/pomodoro-panel.tsx`, `components/tasks/task-timer.tsx`. Group T1. | S | Max |
| 261 | Structured | Copy and clear a day | `missing` | **to build** | to build: "Copy this day to…" (a day's tasks copied as new tasks onto another day, keeping times and minutes) and "Clear this day" (the day's open tasks moved to no day, with Undo; nothing deleted). Searched `lib/tasks/engine.ts`, `components/tasks/tasks-organise.tsx` and `components/tasks/task-editor.tsx` for duplicate, copy and copy-to: none; `editMany` moves only. Normal writes to `zigoals:tasks:v1`, nothing new stored. Files: `lib/tasks/engine.ts`, `lib/tasks/undo.ts`, `components/tasks/tasks-when-views.tsx`, `components/agenda/agenda-page.tsx`. Group T10. | S | Max |
| 262 | Structured | Cycle Seasons on the day plan | `half` | **to build** (part Carried: against a named rule) | to build: opt-in, under the Health gate: the cycle day ("Day 3 of your cycle") and logged or estimated period days on the Day Timeline's all-day row and on the Agenda, with the cycle log's own line (`CYCLE_LINE`). Opened `lib/cycle/engine.ts` (the log and the estimate range after three cycles) and `lib/timeline/build.ts` (`BlockKind` has no cycle); searched `lib/agenda/build.ts` for cycle: none. Derived; the opt-in is one device preference. Part Carried: seasons by phase with advice on what to plan in each are against the no-medical-advice rule. Files: `lib/cycle/engine.ts`, `lib/timeline/sources.ts` (a cycle source), `lib/agenda/build.ts`, `components/cycle`. Group T10. | S | Sanne |
| 263 | Structured | A font for reading with dyslexia | `missing` | **to build** | to build: one more font choice made for easier reading (Atkinson Hyperlegible or OpenDyslexic, both under the SIL Open Font License), self-hosted as font files the way Inter is. Opened `lib/ui-prefs/look.ts:12,16` (`system`, `inter`, `serif`, `rounded`, `mono`; Daylio's Custom fonts row, built). A new value in `Look.font`; an older build reads an unknown font as the default (check `lookOf` before building). Files: `lib/ui-prefs/look.ts`, `public/fonts/`, `app/customize.css`, `components/settings` (Appearance). Group T10. | S | Sanne, Max |

#### Journal and notes

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 264 | Obsidian | Tick boxes in notes, gathered | `missing` | **to build** | to build: "- [ ]" drawn as a tick box that can be ticked in the reading view (the note's text becomes "- [x]", with Undo and a version), and an "Open tick boxes" list across notes linking back to each note. Opened `lib/ai/safe-render.ts` (headings, lists, quotes, code, tables; no tick box) and `components/notes/note-render.tsx`; versions in `lib/notes/versions.ts`. The tick box lives in the note's text, so nothing new is stored. Files: `lib/ai/safe-render.ts` (a tick-box list item, used by Notes only), `components/notes/note-render.tsx`, a new `lib/notes/ticks.ts`, `components/notes/notes-views.tsx`. Group T5. | S | Max |
| 265 | Grid Diary | Every answer to one prompt | `missing` | **to build** | to build: "Every answer to this prompt": a journal filter by the template an entry began from, listing what was written under each heading, oldest first (also Stoic's Journey search by prompt). Opened `lib/journal/schema.ts:41` (`template` is kept on each entry) and `lib/journal/search.ts:11` (`EntryFilter`: words, tag, journal, dates). Derived, nothing stored. Files: `lib/journal/search.ts`, `components/journal/journal-page.tsx`, `components/journal/entry-more.tsx`. Group T6. | S | Sanne |
| 266 | Grid Diary | Grid layout and the Mandala | `half` | **to build** | to build: a templated entry written as a grid of cards (one box per heading), and a 3×3 template with a centre theme and eight cells around it, in English and Dutch. Opened `lib/journal/schema.ts:59-62` (own templates with two to six headings) and `lib/journal-prompts/templates.ts`. Still saved as text with headings, so the export and older builds read it as before; nothing new stored. Files: `components/journal/journal-compose.tsx`, `lib/journal-prompts/templates.ts`, `components/journal/journal.css`. Group T6. | S | Sanne |
| 267 | Obsidian | Highlights in six colours | `missing` | **to build** | to build: ==text== drawn as a highlight in six named colours that each theme draws, kept as written in the Markdown export. Opened `lib/ai/safe-render.ts:7` (`Inline`: text, strong, em, code, link). The mark lives in the note's text, nothing new stored. Files: `lib/ai/safe-render.ts` (a highlight mark, Notes only), `components/notes/note-render.tsx`, `components/notes/notes.css`. Group T5. | S | Max, Sanne |
| 268 | Obsidian | Outline of a note | `missing` | **to build** | to build: a list of a long note's headings above it, each jumping to its section. Opened `components/notes/note-render.tsx:42` (headings drawn, never listed); searched `components/notes` for outline and headings: none. Derived. Reordering sections by dragging is left out. Files: `components/notes/note-render.tsx`, `components/notes/note-editor.tsx`. Group T5. | S | Max |
| 269 | Grid Diary | Entries for a week, a month or a year | `half` | **to build** | to build: an entry that belongs to a week, a month or a year, with written look-back templates for each in English and Dutch, listed under its period on the journal calendar. Opened `lib/journal/schema.ts:31` (one `date`) and `lib/journal-prompts/templates.ts:20` ("Week look-back"). An additive, optional `period` on the loose entry, TIER 3 (stored format); older builds show it on its date. Files: `lib/journal/schema.ts`, `lib/journal-prompts/templates.ts`, `components/journal/journal-calendar.tsx`, `components/journal/journal-compose.tsx`, `lib/journal/export.ts`. Group T6. | M | Sanne |
| 270 | Obsidian | Bases: views of notes by their properties | `half` | **to build** | to build: your own properties on a note (text, number, date, a choice, a tick; up to ten), kept from imported front matter and written back on export, shown as table columns with filters, and a board grouped by a choice property. Opened `lib/notes/table.ts` (the sortable table and chart; LEDGER #29, #30, built), `lib/notes/schema.ts` (no properties) and `lib/notes/markdown.ts:146-172` (import reads title, tags, type, day and the ZIGoals id only). An additive, optional `props` on the loose note, TIER 3 (stored format). Files: `lib/notes/schema.ts`, `lib/notes/markdown.ts`, `lib/notes/table.ts`, `components/notes/notes-views.tsx`, `components/notes/note-editor.tsx`. Group T9. | M | Max |
| 271 | Obsidian | Print a note or save it as PDF | `missing` | **to build** | to build: "Print this note" (title, day, text, photo) with print CSS on the page, and Save as PDF in the print window, as the tasks list does. Searched `components/notes/notes.css` for `@media print`: none; opened `components/tasks/tasks-print.css` for the pattern. Nothing stored. Files: `components/notes/notes.css`, `components/notes/note-editor.tsx`. Group T5. | S | Max, Sanne |
| 272 | Grid Diary | Export as Markdown | `half` | **to build** | to build: one .md file per journal entry (its day, journal and tags in front matter, photos beside it) in the journal's ZIP, for Obsidian and other apps. Opened `lib/journal/export.ts:16` (Day One's JSON with photos and voice notes) and `lib/notes/markdown.ts` (the notes' .md export, to reuse). Nothing stored. Files: `lib/journal/export.ts`, `components/journal/journal-files.tsx`. Group T6. | S | Sanne |
| 273 | Obsidian | Canvas | `missing` | **to build** | to build: a board where note cards, text cards and photos are placed by hand, joined by labelled lines and gathered in named groups, usable by touch and keyboard, kept on the device and exported and imported as a .canvas file in the open JSON Canvas format (MIT, jsoncanvas.org). Searched `lib/notes` and `components/notes` for canvas and board: none (only NOVA's star field); opened `components/notes/graph-view.tsx` (laid out from links). A new device record, in Export everything and the erase, TIER 3 (stored format). Files: a new `lib/notes/canvas.ts`, a new `components/notes/notes-canvas.tsx`, `components/notes/notes-workspace.tsx`, `lib/export/everything.ts`, `lib/erase-everything.ts`. Group T9. | L | Max |
| 274 | Obsidian | Diagrams from text (Mermaid) | `missing` | **Carried**: a new dependency | Carried — a new dependency: drawing Mermaid diagram code needs the Mermaid package. Opened `lib/ai/safe-render.ts:81` (a fenced block is drawn as code, so a mermaid block stays readable). | — | Max |

#### Habits and mind

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 275 | Way of Life | Reminders in your own words | `half` | **to build** | to build: an optional line of the person's own per habit reminder (up to 80 characters), and up to three reminder times a day. Opened `lib/reminders/schema.ts:17` (`habits: {time}`, a strict record) and `lib/notify/plan.ts` (the habit's name as the words). Kept in the loose `zigoals:habit-extras:v1` (as `lib/habit-look.ts` keeps looks), TIER 3 (stored format); the extra times join the notification plan, TIER 3 (PWA). Files: `lib/habits-extras`, `lib/notify/plan.ts`, `components/reminders/reminder-cards.tsx`, `components/habits/habit-editor.tsx`. Group T4. | S | Max |
| 276 | Way of Life | Trend per habit | `half` | **to build** | to build: per habit, the last 30 days beside the 30 before as a plain word (more often, about the same, less often) with both shares, and the habits listed by it, with no "needs attention" wording. Opened `lib/habits.ts:605-613` (`habitTrends`: one share per window). Derived, nothing stored. Files: `lib/habits-v2/stats.ts`, `components/habits/habit-patterns.tsx`, `components/habits/habit-consistency.tsx`. Group T4. | S | Max |
| 277 | Stoic | Quotes from Stoic writers | `half` | **to build** | to build: an optional quote of the day from public-domain translations (Marcus Aurelius' Meditations, Seneca's letters, Epictetus), the writer named, in English and Dutch, with "Another one" and "Write about this". Opened `lib/journal/affirmations.ts` (affirmations only) and `components/journal/today-affirmation.tsx`. Written text, not content (the ledger's note on #71 and #81). The on/off choice joins the affirmation's own setting. Files: a new `lib/journal/quotes.ts`, `components/journal/today-affirmation.tsx`, `components/journal/journal-compose.tsx`. Group T6. | S | Sanne |
| 278 | Stoic | Dream journal from the sleep log | `half` | **to build** (part Carried: needs content made for ZIGoals) | to build: "Write down a dream" on the morning's sleep entry, opening an entry in a Dreams journal (made on first use) linked to that night, and the night's dream entries shown on the sleep log. Opened `components/journal/journal-books.tsx:61` (journals, "Dreams" as an example name) and `lib/journal/schema.ts:48` (`journal` on an entry). An additive, optional `night` (the sleep day) on the loose entry, TIER 3 (stored format). Part Carried: Stoic's insomnia lessons need content made for ZIGoals. Files: `lib/journal/schema.ts`, `lib/journal/books.ts`, `components/health/sleep` (the sleep log), `components/journal/journal-compose.tsx`. Group T6. | S | Sanne |
| 279 | Stoic | A letter to open later | `half` | **to build** | to build: a day to open a letter on (in a month, six months or a year); the entry stays folded away until then, then shows on Today with a journal reminder that day. Opened `lib/journal-prompts/templates.ts:27` (the letter template) and `components/journal/on-this-day.tsx` (a year back only). An additive, optional `opensOn` on the loose entry, TIER 3 (stored format); the reminder joins the journal kind of the notification plan, TIER 3 (PWA). Files: `lib/journal/schema.ts`, `components/journal/today-journal-card.tsx`, `components/journal/journal-page.tsx`, `lib/notify/plan.ts`. Group T6. | S | Sanne |

#### Food and drink

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 280 | Waterllama | Reminders through the day | `half` | **to build** | to build: several water reminders between a start and an end time (every two or three hours), each skipped when the day is on pace for the target, quiet hours kept. Opened `lib/reminders/schema.ts:18` (`water: {time}`, one, in a strict record) and `lib/notify/plan.ts:101` (one daily water item with "to go"). The spread lives in a loose device record beside the reminders, TIER 3 (stored format), and the plan's water items, TIER 3 (PWA). Files: `lib/notify/plan.ts`, `components/reminders/water-reminder.tsx`, `lib/health-daily.ts` (`waterOn`, for the pace). Group T2. | S | Sanne |
| 281 | Waterllama | Your own drinks | `half` | **to build** | to build: your own drinks (a name, a symbol, a colour, a usual size, caffeine), up to 30, as one-tap buttons in the water log; each tap a water entry with its drink. Opened `lib/health-extras.ts:17,24` (seven fixed `DRINK_TYPES`, caffeine per entry). Additive on the loose health extras, TIER 3 (stored format); an entry's drink keeps a fixed type, so older builds read it. Files: `lib/health-extras.ts`, `components/health/daily-tools.tsx` (`WaterJournal`), `components/health/water-log.ts`. Group T2. | S | Sanne |
| 282 | Waterllama | Calories from drinks | `missing` | **to build** | to build: an optional energy (kcal) and sugar per drink, typed or from your own drink (#281), counted in the day's food totals as a drink line, never guessed. Opened `lib/health-extras.ts:13-14` ("every drink still counts as water as you logged it") and `:24` (type and caffeine only). Additive on the loose drink, TIER 3 (stored format). Files: `lib/health-extras.ts`, `lib/health-daily.ts` (the day's totals), `components/health/daily-tools.tsx`. Group T2. | S | Sanne, Tom |
| 283 | Waterllama | Hydration tips | `missing` | **to build** | to build: one practical tip a day on the water card, from a written list in English and Dutch, off by default, with no health claims. Searched `lib` for a water tip list: none (only `lib/workouts/run-tips.ts`, opened for the pattern). Written text, not content. The on/off choice is one device preference. Files: a new `lib/water-tips.ts`, `components/health/water-ring.tsx`, `components/health/daily-tools.tsx`. Group T2. | S | Sanne |
| 284 | Carb Manager | Glucose and ketones beside meals | `half` | **to build** | to build: a reading marked before or after a meal and shown beside that meal on the food day, and the glucose-ketone index as a plain number when a glucose and a ketone reading share a time, labelled a calculation with no verdict. Opened `lib/health-numbers/engine.ts:6-7` (markers by name and unit, the person's own range) and `lib/health-numbers/store.ts:21` (a loose reading). An additive, optional `meal` on the loose reading, TIER 3 (stored format). Insulin doses stay with medication (Bearable's row). Files: `lib/health-numbers/store.ts`, `lib/health-numbers/engine.ts`, `components/health-numbers`, `components/health/health-app.tsx` (the food day). Group T7. | S | — (none of the five) |
| 285 | Carb Manager | Glycemic load per food | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals: a licensed glycemic index table for foods. Opened `components/health/barcode-food-lookup.tsx` (Open Food Facts and USDA FoodData Central give label nutrients and no glycemic index). | — | — (none of the five) |

#### Sleep, workouts and body

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 286 | Carb Manager | Weigh-in reminders | `missing` | **to build** | to build: an opt-in weigh-in reminder every day, on chosen weekdays or once a month at a chosen time, skipped when a weight is already logged that day. Opened `lib/notify/plan.ts:13` (`ItemKind` has no weigh-in kind); searched `lib/reminders`, `lib/notify` and `lib/reminders-plan` for weigh: none. A new notification kind, TIER 3 (PWA); its time in a loose device record, TIER 3 (stored format). Files: `lib/notify/plan.ts`, `components/notify/notifications-card.tsx`, `components/health/weight-trend.tsx`. Group T7. | S | Tom |
| 287 | Carb Manager | Goals on any health number | `half` | **to build** (part Carried: against a named rule) | to build: a goal on a nutrient's daily average from the food log (protein, fibre), on a body measurement (waist) or on one of your own numbers, over a rolling window. Opened `lib/health-goals/schema.ts:13,16` (five measures, a strict record, so new measures would make older builds refuse it) and `lib/average-goals/store.ts:15-20` (sleep, steps, water, a typed measure). A new device record, TIER 3 (stored format). Part Carried: a ketone target is against the no-medical-advice rule; a BMI goal is left out (Yazio's row shows the number only). Files: a new `lib/health-goals/more.ts`, `lib/health-goals/progress.ts`, `lib/body-measurements.ts`, `components/health-goals`. Group T7. | S | Tom |
| 288 | Nike Training Club | Find a workout by length, muscle and place | `half` | **to build** | to build: filters on the routine library for length (up to 30, 45 or 60 minutes), main muscle group, level and the chosen place's equipment. Opened `lib/workouts/routine-library.ts` (12 routines with folder, level and minutes), `components/health/workouts/routine-library-view.tsx:36` (one list) and `lib/workouts/places.ts` (places, built). Derived; the last filter may be a device preference. Files: `components/health/workouts/routine-library-view.tsx`, `lib/workouts/routine-library.ts`, `lib/workouts/equipment.ts`. Group T7. | S | Tom |
| 289 | Nike Training Club | Timed circuit workouts | `missing` | **to build** | to build: a workout of timed moves (work seconds, rest seconds, rounds) from the library's own exercises, played with a countdown, the next move named and a bell, saved like a routine and logged as a workout with its minutes, no calories. Searched `lib` and `components` for interval, circuit, tabata, EMOM, AMRAP and HIIT: nothing in workouts; opened `lib/workouts/library.ts` and `lib/meditation/bells.ts` (the bell to reuse). Circuits as a new device record (routines are sets × reps), TIER 3 (stored format). Files: a new `lib/workouts/circuits.ts`, a new `components/health/workouts/circuit-player.tsx`, `components/health/workouts/workouts-view.tsx`, `lib/workouts/engine.ts`. Group T7. | M | Tom |
| 290 | Nike Training Club | Trainer-led classes, yoga, Pilates and recovery | `missing` | **Carried**: needs content made for ZIGoals | Carried — needs content made for ZIGoals: video classes, yoga and Pilates flows, recovery sessions and weeks-long programmes. Opened `lib/workouts/howto.ts` (written how-tos only; no video). A timed stretch routine can be written as a circuit once #289 is built. | — | Tom |

#### Money

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 291 | PocketGuard | Leftover for the month | `half` | **to build** | to build: "Left this month": the month's income minus the bills still due that no budget covers, the budgets' amounts and the month's planned Goal contributions, each part listed, per currency. Opened `lib/budgets/ready-to-assign.ts` (income minus budgets), `lib/money-notices.ts:100` (`paydayCash`) and `lib/cash-forecast/model.ts:43` (`PlannedContribution`). Derived, nothing stored; a fact, not advice. Files: a new `lib/budgets/left-this-month.ts`, `components/wealth/budgets/ready-to-assign.tsx`, `lib/money-more/today.ts` (Today's money line). Group T3. | S | Lina |
| 292 | Simplifi | Planned spending | `missing` | **to build** | to build: planned one-off costs (a name, an amount and a day), counted in the cash forecast and in "Left this month" (#291) until an entry matches or the person clears it. Opened `lib/cash-forecast/model.ts:15-44` (balances, bills, repeats, budgets and Goal contributions; no one-off cost). A new device record, in Export everything and the erase, TIER 3 (stored format). Files: a new `lib/cash-forecast/planned.ts`, `lib/cash-forecast/model.ts`, `components/cash-forecast/cash-forecast.tsx`, `lib/export/everything.ts`, `lib/erase-everything.ts`. Group T3. | S | Lina |
| 293 | Simplifi | A credit card's limit and use | `missing` | **to build** | to build: per credit card, the limit, the share used, the statement day and the due day (with a bill reminder), from numbers the person types. Opened `lib/accounts/schema.ts:14` (`credit-card` in `DEBT_KINDS`, a strict record with no limit) and searched for utilisation and credit limit: none. The fields live in the lane 2 sheet record (`lib/wealth-sheet/schema.ts`) or a new device record, TIER 3 (stored format). Files: `lib/wealth-sheet/schema.ts`, `components/wealth/accounts-section.tsx`, `lib/bills/tracker.ts`. Group T8. | S | Lina |
| 294 | Simplifi | Projected balances a year ahead | `half` | **to build** | to build: 60 days, 6 months or 12 months on the forecast card, with each month's lowest point listed, labelled an estimate from your own records. Opened `lib/cash-forecast/model.ts:31,141` (`FORECAST_DAYS = 60`; the model takes up to 366 days) and `components/cash-forecast/cash-forecast.tsx` (asks for 60). The chosen length is one device preference. Files: `components/cash-forecast/cash-forecast.tsx`, `lib/cash-forecast/model.ts`. Group T3. | S | Lina |
| 295 | PocketGuard | Needs, wants and saving | `missing` | **to build** (part Carried: against a named rule) | to build: each category marked need, want or saving (the person's choice), and the month's spending and saving as three shares of income, as facts. Opened `lib/budgets/schema.ts:55` (`group` is display only) and `lib/money-log/schema.ts` (categories carry no mark). The marks are additive and optional on the loose money log, TIER 3 (stored format). Part Carried: the 50/30/20 target itself is against the no-money-advice rule, so it is never shown as a goal. Files: `lib/money-log/schema.ts`, a new `lib/money-insights/needs-wants.ts`, `components/wealth/spending/insights/cash-flow-view.tsx`. Group T8. | S | Lina |
| 296 | PocketGuard | Spending beside daily routines | `half` | **to build** | to build: the day's spending (all, or one category) as an outcome in Compare, so a short night, a gym day or a done habit can be set beside what was spent that day or the next, under Compare's own rules. Opened `lib/compare/engine.ts:1-15` (spending is a factor only; the outcomes are mood, energy, sleep, habit completion, steps and feeling words). Derived, nothing stored. Health factors stay under the Health gate, so Lina (no Health) sees habits only. Files: `lib/compare/engine.ts`, `components/insights/compare/compare-explorer.tsx`. Group T8. | S | Lina, Jules |
| 297 | Simplifi | Comparison report with a waterfall | `half` | **to build** | to build: a waterfall from last month's spending total to this month's, one step per category that moved it, largest first, per currency. Opened `lib/money-insights/month-compare.ts` (each category this month beside last month). Derived, nothing stored. Files: `lib/money-insights/month-compare.ts`, a new `components/wealth/spending/insights/month-waterfall.tsx`. Group T8. | S | Lina |
| 298 | Simplifi | What moved your net worth this month | `half` | **to build** | to build: a short list of the sources and accounts that moved net worth most this month, up or down, each with its amount, per currency. Opened `components/wealth/networth-history.tsx` (one line per source and currency) and `lib/wealth-changes.ts:4,10` (owned-wealth changes by kind). Derived, nothing stored. Files: `lib/networth-history.ts`, `components/wealth/networth-history.tsx`. Group T8. | S | Jules, Lina |
| 299 | Simplifi | Tags from imported files | `half` | **to build** | to build: Monarch's Tags and Copilot's tags columns kept as the entries' tags, and a reference or cheque number column kept with the entry. Opened `lib/csv/templates/app-exports.ts:16,30-37` (date, payee, amount, category and note are mapped; tags are not) and `lib/money-tags/tags.ts`. Tags go in their own record as today; nothing new in the entry's format. Files: `lib/csv/templates/app-exports.ts`, `lib/csv/templates/money-rows.ts`, `lib/money-tags/tags.ts`. Group T8. | S | Lina |

### To build, grouped (the new rows; most daily use first)

Friends:
- Max: habits, tasks, a night owl.
- Lina: bank files, budgets, bills.
- Sanne: sleep, water, the journal, Dutch.
- Tom: gym, food, runs.
- Jules: Earn, Markets.

Every to-build row above is in exactly one group.

| Order | Group | Rows (ledger #) | Friends | How often | Effort |
|---|---|---|---|---|---|
| T1 | Structured's planned day: a "Plan your day" and overdue reminder, task icons and colours, a timeline for any day, energy weights per task, notes in a focus session | 5 rows: #256, #257, #258, #259, #260 | Max (Sanne) | daily | M |
| T2 | Waterllama's water: reminders through the day, your own drinks, calories from drinks, a tip a day | 4 rows: #280, #281, #282, #283 | Sanne (Tom) | daily | S |
| T3 | Left to spend (PocketGuard, Simplifi): "Left this month", planned one-off costs, a forecast up to 12 months | 3 rows: #291, #292, #294 | Lina | daily | M |
| T4 | Way of Life's habits: reminders in your own words, a trend per habit | 2 rows: #275, #276 | Max | daily | S |
| T5 | Obsidian's notes: tick boxes gathered across notes, highlights, an outline, print a note | 4 rows: #264, #267, #268, #271 | Max (Sanne) | daily | S |
| T6 | Grid Diary's and Stoic's journal: every answer to one prompt, the grid and Mandala, a quote of the day, a dream from the sleep log, a letter to open later, week, month and year entries, Markdown export | 7 rows: #265, #266, #269, #272, #277, #278, #279 | Sanne | daily | M |
| T7 | Body and gym (Carb Manager, Nike Training Club): weigh-in reminders, goals on any health number, library filters, timed circuits, readings beside meals | 5 rows: #284, #286, #287, #288, #289 | Tom | each gym day | M |
| T8 | Money views (PocketGuard, Simplifi): a credit card's limit and use, needs and wants, spending beside routines, a month waterfall, what moved net worth, tags from imports | 6 rows: #293, #295, #296, #297, #298, #299 | Lina (Jules) | weekly | M |
| T9 | Bigger notes work (Obsidian): properties with table and board views, the canvas | 2 rows: #270, #273 | Max | weekly | L |
| T10 | Day extras (Structured): copy and clear a day, the cycle day on the plan, a reading font | 3 rows: #261, #262, #263 | Max, Sanne | weekly | S |

Notes for the owner:

- #259 shows the day's energy total in words ("room for more", "near your amount", "more than your amount"), never red and never a warning sound, under the calm-design rule.
- #262 is opt-in, under the Health gate, and shows the cycle day and period days only. Structured's seasons, with planning advice by phase, are carried (no medical advice).
- #263 adds a font file under the SIL Open Font License, self-hosted as Inter is. It is a file, not a package. If the owner counts a font file as a new dependency, the row is Carried: a new dependency.
- #264 and #267 change only how a note's own text is drawn (and, for #264, the "- [x]" a tick writes, with a version kept). They touch `lib/ai/safe-render.ts`, which ZIGi's replies also use: the new marks must be switched on for Notes only.
- #277's quotes come from public-domain English translations; the Dutch lines are written for ZIGoals. Written text, not content.
- #283's tips are practical habits only (where to keep a glass), with no health claims. If the owner reads water tips as health advice, the row is Carried: against a named rule.
- #284 shows the glucose-ketone index as a calculated number with no verdict or range. If the owner reads it as medical, that part is Carried: against a named rule, and the row keeps only the meal mark.
- #282 counts only calories the person types or saved with their own drink. Nothing is guessed.
- #295 never shows 50/30/20 as a target: only the person's own shares.
- #296 keeps Compare's rules unchanged (90 days, 14 days a side, never a cause). Sleep and workout factors stay under the Health gate.
- #258 and #273 change page layouts (the Day Timeline and Notes). Check both against the protected baseline in docs/STATUS.md before building.
- Stored-format changes (TIER 3, each in its own commits, all additive): #256, #257, #258, #259, #260, #269, #270, #273, #275, #278, #279, #280, #281, #282, #284, #286, #287, #289, #292, #293, #295. Notification-plan changes, TIER 3 (PWA): #256, #275, #279, #280, #286.
- None of the to-build work adds a package, reaches an outside service, needs a model, touches a wallet, signing or a key, or connects a bank.
- The new to-build rows by pillar:
  - Tasks and planning: 8
  - Journal and notes: 10
  - Habits and mind: 5
  - Food and drink: 5
  - Sleep, workouts and body: 4
  - Money: 9
  - All: 41

## Round 4: rows #300–#347 (owner follow-up 4, item 4g; 22 Nov 2026)



Drafted 22 Nov 2026 from `competitors-r4.md` (fourth round: Bear, Motion, Journey, Atoms, How We Feel, Pillow, Runna, Noom, Actual Budget, Lunch Money). These rows go into `docs/review/session-av/LEDGER.md` after "Round 3: rows #256–#299", in the format of its ledger tables. Every `half` and `missing` row of the ten new apps is here: 48 rows, numbered on from #299. The code was read at `lane2/batch2` HEAD `c64e0712`, and the four round 3 branches (`lane2/r3-plan`, `lane2/r3-money`, `lane2/r3-health`, `lane2/r3-notes`, from `3d27688e`) were read too, so nothing that round 3 builds (#256–#299) is listed as to build here. Where a row builds on a round 3 row, the evidence names it.

They are grouped by the six pillars the owner named, with the most daily use first in each pillar. A verdict is **to build** or **Carried**. A Carried verdict names one of the ledger's causes:
- needs an outside service
- needs a model
- needs content made for ZIGoals (audio, video, programmes)
- native-only
- against a named rule
- a new dependency
- a protected area

When only part of a row needs a cause, the row is **to build** and the evidence names the carried part. Nothing has been built for these rows, so no row is "built", "built in part" or "already have". Effort is S (under a day), M (one to two days) or L (three days or more). Personas are the matrix's.

### Totals

| Pillar | Rows | to build | Carried | of which a part is carried |
|---|---|---|---|---|
| Tasks and planning | 6 | 6 | 0 | 0 |
| Journal and notes | 17 | 16 | 1 (a new dependency) | 0 |
| Habits and mind | 5 | 5 | 0 | 1 (#325 needs content made for ZIGoals) |
| Food and drink | 2 | 2 | 0 | 0 |
| Sleep, workouts and body | 8 | 8 | 0 | 1 (#335 native-only) |
| Money | 10 | 10 | 0 | 0 |
| **All** | **48** | **47** | **1** | **2** |

- Whole-row Carried causes used: a new dependency 1 (#322). Not used: needs an outside service, needs a model, needs content made for ZIGoals, native-only, against a named rule, a protected area.
- The two `against a rule` rows of the matrix (Runna's Adapt for Heat, Noom's food colours) and the seven `have` rows (Bear's read-only mode, Atoms' time and place, tick sounds and habit suggestions, Pillow's sleep CSV, Actual's Age of Money, Lunch Money's cost of living) get no ledger row, as in rounds 1 to 3.
- One correction comes with this round: Strong's "Workout scheduling" (first matrix, `have`) has no ledger row, but no record keeps a planned workout outside the Showcase (`components/agenda/agenda-extras.ts:21`). #330 builds it.

### Ledger

#### Tasks and planning

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 300 | Motion | Auto-scheduling over the coming days | `half` | **to build** | to build: "Plan my week": the open tasks with minutes placed over the next 7 days, each day's own free time around fixed tasks and imported events, the earliest deadline first, then priority, never before a task's start-early day; a proposal the person keeps in whole or in part, with Undo. Nothing moves by itself. Opened `lib/tasks/layouts.ts:29-47` (`fitDay`: today only, first fit, in the order given) and `components/tasks/today-planner.tsx:46`; `deadline` and `minutes` in `lib/tasks/schema.ts:110,116`. Builds on round 3's Day Timeline for any day (#258, `lane2/r3-plan`). Kept placements are normal writes of `due` and `time` to `zigoals:tasks:v1`; nothing new stored. Files: `lib/tasks/layouts.ts` (a `fitWeek` beside `fitDay`), `components/tasks/today-planner.tsx`, a new `components/tasks/plan-week.tsx`, `lib/tasks/undo.ts`. Group U1. | M | Max |
| 301 | Motion | Working hours per day | `half` | **to build** | to build: the hours tasks may be placed in, per weekday (two blocks at most, for a lunch break), kept, and a task's own "after hours" choice. Opened `components/tasks/today-planner.tsx:29,46,77` (starts at 09:00 or now; `until` typed each visit, default 18:00, not kept). The hours join the loose `zigoals:task-plan:v1` (`lib/tasks/plan-record.ts:29`) and the choice the loose task, TIER 3 (stored format). Files: `lib/tasks/plan-record.ts`, `lib/tasks/schema.ts`, `components/tasks/task-plan-settings.tsx`, `components/tasks/today-planner.tsx`, `lib/tasks/layouts.ts`. Group U1. | S | Max |
| 302 | Motion | A deadline at risk | `half` | **to build** | to build: one quiet line in Upcoming when the minutes of open tasks due by a deadline are more than the free hours until it, naming the tasks, as a fact (never red, never a sound). Opened `lib/tasks/layouts.ts:29` (`left`, the tasks that do not fit today) and `lib/tasks/schema.ts:110` (`deadline`). Derived from #301's hours and #300's fit, nothing stored. Files: a new `lib/tasks/at-risk.ts`, `components/tasks/tasks-when-views.tsx`. Group U1. | S | Max, Lina |
| 303 | Motion | Split a long task | `missing` | **to build** | to build: a smallest piece per task (15 to 240 minutes); Plan my day and "Plan my week" place it in pieces ("part 2 of 4"), and time spent counts against the whole. Opened `lib/tasks/schema.ts:116` (one `minutes`) and `lib/tasks/layouts.ts:41` (placed whole). An additive, optional `chunk` on the loose task, TIER 3 (stored format). Files: `lib/tasks/schema.ts`, `lib/tasks/layouts.ts`, `components/tasks/task-fields.tsx`, `components/tasks/today-planner.tsx`. Group U1. | S | Max |
| 304 | Motion | A task that waits for another | `missing` | **to build** | to build: "After …": a task names up to three tasks it waits for, shows as waiting (not placed, not in Today's count) until they are done, then joins its day. Searched `lib/tasks` for blocked, blocker, depends and waiting: none; opened `lib/tasks/schema.ts:95` (`parentId` only). An additive, optional `after` on the loose task, TIER 3 (stored format); a removed task drops out of `after` on read. Files: `lib/tasks/schema.ts`, `lib/tasks/engine.ts` (`openTasks`), `components/tasks/task-editor.tsx`, `lib/tasks/layouts.ts`. Group U1. | S | Max |
| 305 | Motion | A repeat that floats in its week | `missing` | **to build** | to build: "Once this week (any day)" and "once this month": the task stays in This week until done, then comes back next week; a missed week is one overdue mark, never a pile. Opened `lib/tasks/schema.ts:50-62` (`recurSchema`: fixed days, weekdays, month days, nth weekday, after done). An additive, optional `flex` on the loose repeat, TIER 3 (stored format); an older build reads the repeat as weekly. Files: `lib/tasks/schema.ts`, `lib/tasks/recurrence.ts` (the next occurrence), `components/tasks/task-fields.tsx`, `lib/recurrence-phrase`. Group U1. | S | Max |

#### Journal and notes

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 306 | Bear | Tags in the text, nested, and a tag as a workspace | `half` | **to build** | to build: #tags in a note's text and in an editor tag field kept as the note's tags; "/" nests a tag (#work/meetings under #work); a tag list with counts that filters Notes; one tag chosen as Notes' focus (list, search and graph) until cleared. Opened `lib/notes/schema.ts:39` (`tags`, up to 12), `lib/notes/markdown.ts:172` (kept from imported front matter only), `components/notes/notes-views.tsx:29,59,64` (shown, never added) and `components/notes/note-editor.tsx` (no tag field). Writes the existing `tags` field; the focus is one device preference, so the stored format is unchanged. Files: a new `lib/notes/tags.ts`, `components/notes/note-editor.tsx`, `components/notes/notes-workspace.tsx`, `components/notes/notes-search.tsx`, `components/notes/graph-view.tsx`. Group U2. | M | Max |
| 307 | Bear | Several photos placed in a note | `half` | **to build** | to build: up to eight photos in a note, each placed in the text where it was added (a written `![photo](id)` line the reader draws), the one photo today read as the first. Opened `lib/notes/schema.ts:37` (`photoId`, one), `components/notes/note-editor.tsx:80` and `lib/notes/photos.ts` (IndexedDB). An additive, optional `photos` on the loose note, TIER 3 (stored format); older builds keep showing `photoId`. The Markdown export (`lib/notes/markdown.ts:94`) writes each photo beside the note. Files: `lib/notes/schema.ts`, `lib/notes/photos.ts`, `components/notes/note-editor.tsx`, `components/notes/note-render.tsx`, `lib/notes/markdown.ts`, `lib/erase-everything.ts` (the photo store already erased; check the new ids). Group U2. | M | Max, Sanne |
| 308 | Journey | Formatting and tick boxes in an entry | `missing` | **to build** | to build: an entry's Markdown drawn as Notes draw theirs (headings, bold, italics, lists, quotes and tick boxes), with a small format bar in the composer. Opened `lib/journal/schema.ts:31` (plain `text`, 5,000 characters) and `components/journal/entry-rich-text.tsx` ([[links]] only). Reuses round 3's notes marks (#264, #267, `lane2/r3-notes`: `lib/ai/safe-render.ts` NoteInline, `components/notes/note-render.tsx`), switched on for the journal and never for ZIGi's replies. The text stays as written; nothing new stored. Files: `components/journal/entry-rich-text.tsx`, `components/journal/journal-compose.tsx`, `components/journal/journal.css`. Group U3. | S | Sanne |
| 309 | Journey | Throwback a week, a month and a year back | `half` | **to build** | to build: "A week ago" beside a month and the years, and an opt-in morning notification on a day with a memory that says only "A memory from a year ago". Opened `lib/on-this-day/on-this-day.ts` (years back, else a month ago) and `lib/notify/plan.ts:13` (`ItemKind` 'journal' is the writing reminder). A new notification item under the journal switch and quiet hours, TIER 3 (PWA); the choice joins the loose on-this-day record (`lib/on-this-day/store.ts`), TIER 3 (stored format). Files: `lib/on-this-day/on-this-day.ts`, `lib/on-this-day/store.ts`, `components/journal/on-this-day-switch.tsx`, `lib/notify/plan.ts`. Group U3. | S | Sanne |
| 310 | Journey | Favourites, mood and order in the list | `half` | **to build** | to build: a star on an entry and a Favourites filter; a filter by the day's mood or feeling word; "Oldest first". Opened `lib/journal/search.ts:11` (`EntryFilter`: words, tag, journal, dates) and `components/journal/journal-page.tsx:61` (newest first). Sits beside round 3's prompt filter (#265, `lane2/r3-notes`). The star is an additive, optional `star` on the loose entry, TIER 3 (stored format); the mood filter reads `lib/moods` and `lib/mood-words`, derived. Files: `lib/journal/schema.ts`, `lib/journal/search.ts`, `components/journal/journal-page.tsx`, `components/journal/entry-more.tsx`, `lib/journal/export.ts` (keep the star). Group U3. | S | Sanne |
| 311 | Bear | Note info | `half` | **to build** | to build: on the open note, its words, characters, minutes to read (230 a minute, said as an estimate), when it was made and last changed. Opened `lib/notes/table.ts:15` (words in the table only). Derived, nothing stored. Files: `components/notes/note-editor.tsx`, `lib/notes/table.ts` (share the word count). Group U2. | S | Max |
| 312 | Bear | Find and replace in a note | `missing` | **to build** | to build: find in the editor (matches counted and stepped through) and replace one or all, with the earlier words kept as a version. Searched `components/notes` for replace: none; opened `components/notes/notes-search.tsx` (finds notes, not places in one) and `lib/notes/versions.ts`. Normal writes; nothing new stored. Files: `components/notes/note-editor.tsx`, a new `components/notes/note-find.tsx`. Group U2. | S | Max |
| 313 | Bear | Fold a section | `missing` | **to build** | to build: in the reading view each heading folds the text under it to the next heading of its level, with "Fold all" and "Open all", for this visit. Opened `components/notes/note-render.tsx:42` (headings drawn) and round 3's `Outline` (`note-render.tsx:63-65` on `lane2/r3-notes`, one fold that jumps). Nothing stored. Files: `components/notes/note-render.tsx`, `components/notes/notes.css`. Group U2. | S | Max |
| 314 | Bear | Callouts | `missing` | **to build** | to build: `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` and `[!CAUTION]` drawn as five calm boxes with their word, in Notes only, kept as written in the Markdown export. Opened `lib/ai/safe-render.ts` (quotes; no callout). The marker lives in the note's text; nothing stored. Files: `lib/ai/safe-render.ts` (a Notes-only block, as round 3's highlights are), `components/notes/note-render.tsx`, `components/notes/notes.css`. Group U2. | S | Max |
| 315 | Bear | Archive a note | `missing` | **to build** | to build: "Archive": the note leaves the list, the graph and the daily strip, stays in Search (marked archived) and in the export, and comes back on a tap. Opened `lib/notes/schema.ts:40` (`pinned` only). An additive, optional `archived` on the loose note, TIER 3 (stored format); older builds show it in the list as before. Files: `lib/notes/schema.ts`, `components/notes/notes-workspace.tsx`, `components/notes/graph-view.tsx`, `components/notes/this-day-strip.tsx`, `lib/notes/markdown.ts` (front matter). Group U2. | S | Max |
| 316 | Bear | A writing view (typewriter mode) | `missing` | **to build** | to build: "Write in full screen": the note alone, the line being written kept in the middle, the rest hidden until Esc or Done. Searched `components` and `lib` for typewriter and distraction: none; opened `components/notes/notes-workspace.tsx`. The typewriter choice is one device preference. Files: `components/notes/note-editor.tsx`, a new `components/notes/note-focus.tsx`, `components/notes/notes.css`. Group U2. | S | Max, Sanne |
| 317 | Journey | More photos in an entry | `half` | **to build** | to build: up to 12 photos in an entry, within the storage headroom check. Opened `lib/journal/schema.ts:21,49` (`MAX_ENTRY_PHOTOS = 4`; `photos` is `.max(4).optional().catch(undefined)`, so an older build drops a longer list whole) and `lib/storage-headroom.ts`. The extra photos go in a new optional `morePhotos` beside `photos` (the first four stay where older builds read them), TIER 3 (stored format). Files: `lib/journal/schema.ts`, `lib/journal/media.ts`, `components/journal/compose-media.tsx`, `components/journal/entry-media.tsx`, `lib/journal/export.ts`, `lib/journal/export-media.ts`. Group U3. | S | Sanne |
| 318 | Bear | Lock a note | `missing` | **to build** | to build: "Lock this note": its words encrypted on the device with the person's passphrase (Web Crypto, AES-GCM from PBKDF2, no package), shown only after the passphrase, left out of Search, the graph, NOVA's notes context and the plain export; a forgotten passphrase cannot be recovered, and the note says so. Opened `lib/device-lock.ts` (a PIN screen lock, PBKDF2 hash, encrypts nothing), `lib/notes/schema.ts:12` and `lib/notes/pack.ts` (NOVA's context packer). An additive, optional `locked` (salt, iv, ciphertext) on the loose note, TIER 3 (stored format); an older build shows a locked note's empty body and must not overwrite it (check its write path before building). Files: a new `lib/notes/lock.ts`, `lib/notes/schema.ts`, `components/notes/note-editor.tsx`, `lib/notes/pack.ts`, `lib/search/notes.ts`, `lib/notes/markdown.ts`. Group U9. | M | Max, Sanne |
| 319 | Bear | More ways to export a note | `half` | **to build** | to build: one note saved as an HTML page (its photo inside), as plain text, or as a Word file (Office Open XML in a ZIP, no package). Opened `lib/notes/markdown.ts:94` (the Markdown ZIP), `lib/export/zip.ts:40` (`buildStoredZip`) and round 3's print (`components/notes/note-print.tsx` on `lane2/r3-notes`). Nothing stored. Files: a new `lib/notes/note-files.ts`, `components/notes/notes-files.tsx`, `components/notes/note-editor.tsx`. Group U9. | S | Max |
| 320 | Journey | E-book and Word export | `missing` | **to build** | to build: a chosen journal and date range as an .epub (XHTML chapters by month, photos inside, a contents page) and as a .docx, both through `buildStoredZip`. Opened `lib/journal/export.ts:16` (Day One's JSON), round 3's Markdown per entry (#272, `lane2/r3-notes`) and `lib/export/zip.ts:40`. Shares #319's Word writer. Nothing stored. Files: a new `lib/journal/ebook.ts`, `lib/notes/note-files.ts` (the shared .docx writer), `components/journal/journal-files.tsx`. Group U9. | M | Sanne |
| 321 | Bear | Imports from Evernote and Bear | `half` | **to build** | to build: Evernote's .enex (its documented XML, read with the browser's DOMParser: title, created day, tags, text, the first image as the photo) and Bear's TextBundle export (.textbundle and .bear2bk ZIPs of text.md and assets), under the importer's caps. Opened `lib/notes/markdown.ts:115-116` (`IMPORT_MAX_FILES`, `isNoteFile`: .md, .markdown, .txt) and `lib/notes/zip-read.ts`. Normal writes through `planImport`/`applyImport` with Undo; nothing new stored. Files: a new `lib/notes/import-enex.ts`, `lib/notes/markdown.ts`, `lib/notes/read-files.ts`, `components/notes/notes-files.tsx`. Group U9. | S | Max |
| 322 | Bear | Math formulas | `missing` | **Carried**: a new dependency | Carried — a new dependency: drawing TeX formulas needs a maths typesetting package (KaTeX or MathJax). Opened `lib/ai/safe-render.ts` (a `$…$` span is text, a fenced block is code), so a formula stays readable as written. | — | Max |

#### Habits and mind

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 323 | Atoms | The person behind the habits | `half` | **to build** | to build: up to five lines of the person's own ("I am someone who moves every day"), each joined to the habits that serve it, with this week's and this month's ticks counted toward it, on the Habits page; counts only, never a score. Opened `lib/habits-extras/schema.ts:21-22` (`why`, 160 characters, per habit) and `lib/habit-intentions/intentions.ts:24`. An additive, optional `identities` in the loose habit extras (`zigoals:habit-extras:v1`), TIER 3 (stored format); it syncs with that section as `intentions` does. Files: `lib/habits-extras/schema.ts`, a new `lib/habit-intentions/identity.ts`, `components/habits/intention.tsx`, `components/habits/habits-workspace.tsx`. Group U5. | S | Max |
| 324 | How We Feel | What a feeling word means | `half` | **to build** | to build: one plain line for what each of the 48 words means, on a long press or an ⓘ, and a line of the person's own on their own words. Opened `lib/mood-words/words.ts:17-22` (four quadrants of twelve; English only, `:3`) and `lib/mood-words/more.ts` (#232, built). Written text, not content. The own line is additive on the loose own words, TIER 3 (stored format). Files: `lib/mood-words/words.ts` (a `MEANINGS` map), `lib/mood-words/schema.ts`, the feeling word picker `components/mood-words/mood-words-grid.tsx`. Group U5. | S | Sanne |
| 325 | How We Feel | Strategies for a feeling | `half` | **to build** (part Carried: needs content made for ZIGoals) | to build: two or three written choices per quadrant, each opening an existing tool (breathing, Write it out, the thought checker, Three good things, a walk timer) or a one-line action, never advice; pleasant feelings get "savour it" choices. Opened `lib/mood-words/words.ts:27` (`nextStepFor`: one step, unpleasant words only). Derived, nothing stored. Part Carried: How We Feel's strategy videos need content made for ZIGoals. Files: `lib/mood-words/words.ts`, the next step in `components/mood-words/mood-words-grid.tsx`, `components/journal/write-it-out.tsx`, `components/journal/thought-check.tsx`. Group U5. | S | Sanne |
| 326 | How We Feel | Where you feel it | `missing` | **to build** | to build: an optional "Where do you feel it?" after a feeling word: up to three body areas, each with a sensation word, and the most common per quadrant over 90 days as counts, with no medical meaning. Searched `lib/mood-words`, `lib/checkin` and `lib/mood-tags` for body and sensation: none; opened `lib/mood-words/schema.ts` (the loose mood-word day). Additive on the loose mood-word day, TIER 3 (stored format). Files: `lib/mood-words/schema.ts`, a new `lib/mood-words/body.ts`, `components/mood-words/mood-words-grid.tsx` (the picker), `components/insights` (the counts). Group U5. | S | Sanne |
| 327 | Atoms | Start small, then step up | `missing` | **to build** | to build: a habit's small version beside its full one, and an opt-in step-up card (after four weeks done on most due days, the next step the person wrote; after two thin weeks, the small version again). The person decides; nothing changes by itself. Opened `lib/habit-number.ts` (one target); searched the habit libraries for step up, progression and graduate: none. In the loose habit extras, TIER 3 (stored format). Files: `lib/habits-extras/schema.ts`, a new `lib/habits-v2/step-up.ts`, `components/habits/habit-editor.tsx`, `components/habits/habit-card-full.tsx`. Group U5. | S | Max |

#### Food and drink

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 328 | Noom | A planned free day | `half` | **to build** | to build: one planned day with the extra the person chooses, taken evenly from that week's other days above the coach's floor, shown on that day only and gone the week after; no coins. Opened `lib/health-aa/calorie-week.ts` ("Shift", a repeating weekday pattern; "Roll over"). Additive on the loose `zigoals:calorie-week:v1`, TIER 3 (stored format). Files: `lib/health-aa/calorie-week.ts`, `components/health/energy-card.tsx`, `components/health/calorie-week-card.tsx`. Group U7. | S | Tom |
| 329 | Noom | A note for a harder week | `missing` | **to build** | to build: a few lines the person writes to themselves, shown once on Health's food day when they return after three or more days without a food log, never a count of days missed. Opened `components/ai/zigi-brief.tsx:85` ("Welcome back. Good to see you." only). The words are one device preference. Texts and emails (Noom's way) are a server service and not proposed. Files: a new `lib/food-log/return-note.ts`, `components/health/health-today.tsx`, `lib/food-log/consistency.ts` (the last logged day). Group U7. | S | Tom |

#### Sleep, workouts and body

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 330 | Runna | Plan, move and realign workouts | `half` | **to build** | to build: plan a routine, a circuit or a run (a distance and an easy, steady or fast word) on a day and time; drag it to another day on the workout calendar; "I missed some" moves the week's missed planned workouts on in order, with Undo; "Away until …" sets a range aside. Opened `lib/agenda/build.ts:186` (draws planned workouts passed in), `components/agenda/agenda-extras.ts:21` (`plannedWorkouts: []` outside the Showcase) and `lib/timeline/workout-source.ts` on `lane2/r3-plan` (Showcase only); circuits are round 3's #289 (`lane2/r3-health`). This also corrects Strong's "Workout scheduling" (`have` in the first matrix). A new device record, in Export everything and the erase, TIER 3 (stored format). Plan-based realignment of Runna's own programmes stays with #113 (Carried: needs content). Files: a new `lib/workouts/planned.ts`, `components/agenda/agenda-extras.ts`, `lib/timeline/workout-source.ts`, `components/health/workouts/workout-calendar.tsx`, `lib/export/everything.ts`, `lib/erase-everything.ts`. Group U7. | M | Tom |
| 331 | Noom | Keep your weight in a band | `half` | **to build** | to build: "Keep my weight between …": a band the person sets, shaded on the weight trend, with the trend's days inside it in the last 30 counted. Opened `lib/health-goals/schema.ts:16-18` (strict; weight goes down or up), round 3's `lib/health-goals/more.ts` on `lane2/r3-health` (#287: at least or at most, a loose record) and `components/health/weight-trend.tsx`. A "between" kind in round 3's loose goals record, TIER 3 (stored format). Noom's Harris-Benedict calorie zone is not added. Files: `lib/health-goals/more.ts`, `components/health/weight-trend.tsx`, `components/health-goals`. Group U7. | S | Tom |
| 332 | Pillow | Sleep beside caffeine, steps and weight | `half` | **to build** | to build: three Compare factors for the night: caffeine that day above an amount, caffeine after a chosen time (14:00 by default), and steps above an amount, under Compare's rules (90 days, 14 days a side, never a cause). Opened `lib/compare/engine.ts:86` (`FactorKind`: no caffeine or steps) and `lib/health-extras.ts:24` (caffeine per drink); round 3's own drinks (#281, `lane2/r3-health`) carry caffeine too. Weight is already an outcome (`FOOD_OUTCOMES`, `:81`). Derived, nothing stored; under the Health gate. Files: `lib/compare/engine.ts`, `components/insights/compare/compare-explorer.tsx`. Group U6. | S | Sanne |
| 333 | Pillow | Your sleep timing on free days | `missing` | **to build** | to build: "Your timing": the middle of sleep on weekend nights beside weekday nights over 30 days, and an earlier, middle or later sleeper word from it, labelled an estimate from the person's nights. Opened `lib/sleep/naps-need.ts:55` (weekend nights feed the need) and `lib/energy-curve/curve.ts` (the bedtime window); nothing compares free and work nights. Derived, nothing stored. Files: a new `lib/sleep/timing.ts`, `components/health/sleep/sleep-usual.tsx`, `components/health/sleep/sleep-view.tsx`. Group U6. | S | Sanne, Max |
| 334 | Pillow | A sleep tip a day | `missing` | **to build** | to build: one practical tip a day on the sleep card, from a written list in English and Dutch, off by default, with no health claims. Searched `lib` for a sleep tip list: none; opened `lib/workouts/run-tips.ts` and round 3's `lib/water-tips.ts` (#283, `lane2/r3-health`) for the pattern. Written text, not content. One device preference. Files: a new `lib/sleep-tips.ts`, `components/health/sleep/sleep-card.tsx`. Group U6. | S | Sanne |
| 335 | Pillow | A nap timer | `missing` | **to build** (part Carried: native-only) | to build: "Start a nap": 20, 30 or 90 minutes, a soft bell at the end while the page stays open (a screen wake lock where the browser allows it), and the nap logged when it ends. Opened `lib/sleep/engine.ts` (`napOrNight`, `kind: 'nap'`) and `lib/meditation/bells.ts`; searched for nap timer and power nap: none. The nap is a normal night record (`kind: 'nap'`); nothing new stored. Part Carried: ringing with the screen locked or the app closed is native-only. Files: a new `components/health/sleep/nap-timer.tsx`, `lib/sleep/engine.ts`, `components/health/sleep/sleep-forms.tsx`. Group U6. | S | Sanne |
| 336 | Runna | Heart-rate zones | `half` | **to build** | to build: five zones from a maximum heart rate the person types (never from age), and the minutes in each counted at import from the file's points and kept with the run, shown as a bar. Opened `lib/workouts/import-file.ts:51,137-138` (each point's heart rate read, the average kept) and `lib/workouts/runs.ts:25` (`avgHr`). Additive on the loose splits record (`lib/workouts/splits-schema.ts`), TIER 3 (stored format); the maximum is one device preference. Files: `lib/workouts/import-file.ts`, `lib/workouts/splits-schema.ts`, `components/health/workouts/workout-splits.tsx`. Group U7. | S | Tom |
| 337 | Runna | Races ahead in one view | `half` | **to build** | to build: a race (name, day, distance, goal time, main or B) listed with the year's other races and the weeks between, and after race day the matching run (that day, distance within 5 %) shown as its result beside the goal. Opened `lib/countdowns/schema.ts:16` (a strict title, date and note) and `lib/countdowns/extras.ts`. A new device record, in Export everything and the erase, TIER 3 (stored format); each race may also make a countdown. Files: a new `lib/workouts/races.ts`, a new `components/health/workouts/races.tsx`, `lib/workouts/runs.ts`, `lib/export/everything.ts`, `lib/erase-everything.ts`. Group U7. | S | Tom |

#### Money

| # | app | feature | status in matrix | verdict | evidence (commit / file:line opened / cause with the named rule) | effort | personas |
|---|---|---|---|---|---|---|---|
| 338 | Lunch Money | A calendar of the month's money | `missing` | **to build** | to build: a month grid in Spending with each day's spending and income per currency (never converted), a quiet shade for the larger days, a tap opening that day in money search; Hide amounts blurs it. Opened `components/wealth/bills/bill-month-grid.tsx` and `lib/bills/calendar.ts` (bills only) and `components/wealth/spending/money-search.tsx`. Counted through round 3's one-month rule (`budgetDayParts`, merged into `lane2/r3-money`) so spread entries match the budgets. Derived, nothing stored. Files: a new `lib/money-insights/month-days.ts`, a new `components/wealth/spending/insights/month-calendar.tsx`, `components/wealth/spending/insights/spending-insights.tsx`. Group U4. | S | Lina |
| 339 | Actual Budget | Sums in an amount | `missing` | **to build** | to build: + − × ÷ in the money log's amount field, worked out exactly in cents, the result shown before saving; the entry keeps only the result. Opened `lib/amount-input.ts` (one amount; "12+4" refused). Nothing stored. Files: a new `lib/money-log/amount-sum.ts`, `lib/money-log/form.ts`, `components/wealth/spending/quick-log.tsx`. Group U4. | S | Lina |
| 340 | Actual Budget | Reconcile an account | `missing` | **to build** | to build: "Check against my bank": the statement balance on a day, the account's entries up to it ticked as checked, the difference shown until zero; checked entries then carry a quiet mark. Opened `lib/money-log/schema.ts:59-60` (`account`, `ref`); searched `lib/money-log`, `lib/accounts` and `components/wealth` for cleared and reconcile: none. An additive, optional `checked` day on the loose entry, TIER 3 (stored format). Files: a new `lib/money-log/reconcile.ts`, `lib/money-log/schema.ts`, `components/wealth/accounts-section.tsx`. Group U8. | S | Lina |
| 341 | Lunch Money | Group entries into one | `missing` | **to build** | to build: "Group": up to 20 entries shown as one line with their total and a name, opened to show each; budgets and reports still count each entry. Opened `lib/money-log/schema.ts:39,61` (`parts`, `transfer`). An additive, optional `group` on the loose entry, TIER 3 (stored format). Files: `lib/money-log/schema.ts`, a new `lib/money-log/groups.ts`, `lib/money-log/selection.ts` (group the selection), `components/wealth/spending/spending-section.tsx`. Group U4. | S | Lina |
| 342 | Lunch Money | Archive a category | `missing` | **to build** | to build: "Archive": the category leaves the pickers and the budget list, its entries and history stay in reports and search, and it can come back. Opened `lib/money-log/schema.ts:102` (`own` categories) and `lib/money-log/category.ts`. An additive, optional archived list on the loose money log, TIER 3 (stored format); in the business space it goes to the business log (as round 3's B3A-11 fix does for marks). Files: `lib/money-log/schema.ts`, `lib/money-log/category.ts`, `lib/recent-categories/recent.ts`, the category settings in `components/wealth/spending`. Group U4. | S | Lina |
| 343 | Actual Budget | Monthly spending with an average and a trend | `half` | **to build** | to build: the 3-, 6- or 12-month average as a dashed line on each category and on the total, with the month beside it in words, as a fact. Opened `components/wealth/spending/insights/category-trend-view.tsx` (12 months, totals, a month table; no average). Derived, nothing stored. Files: `components/wealth/spending/insights/category-trend-view.tsx`, `lib/money-insights/cash-flow.ts`. Group U8. | S | Lina |
| 344 | Lunch Money | Saved questions with a chart | `half` | **to build** | to build: a money search saved with a name, shown as a chart by month, week or category over its range, with its total and monthly average; up to ten. Opened `lib/money-log/search.ts` (words, kind, category, dates, amount range) and `lib/money-log/selection.ts` (the total). A new device record, in Export everything and the erase, TIER 3 (stored format). Files: a new `lib/money-log/saved-searches.ts`, `components/wealth/spending/money-search.tsx`, a new `components/wealth/spending/insights/saved-view.tsx`, `lib/export/everything.ts`, `lib/erase-everything.ts`. Group U8. | M | Lina, Jules |
| 345 | Actual Budget | Investment income against spending | `half` | **to build** | to build: each month's income in categories the person marks as investment income (staking rewards, interest, dividends) beside that month's spending, over 24 months, as a share. Opened `lib/fi-model/model.ts` (a projection from typed figures, labelled a model). The marks are additive on the loose money log, TIER 3 (stored format); the view is derived. Files: a new `lib/money-insights/crossover.ts`, `lib/money-log/schema.ts`, `components/wealth/spending/insights/cash-flow-view.tsx`. Group U8. | S | Jules |
| 346 | Actual Budget | Payee places | `missing` | **to build** | to build: opt-in, on the person's tap Quick log asks the browser for the place and offers the payees logged within about 200 m first; the place rounded, kept on the device with the payee (never on the entry), with "Forget places". Opened `lib/money-log/suggest.ts` and `lib/recent-categories/recent.ts` (words and recent categories; no place). A new device record, in Export everything and the erase, TIER 3 (stored format). Files: a new `lib/money-log/places.ts`, `components/wealth/spending/quick-log.tsx`, `lib/export/everything.ts`, `lib/erase-everything.ts`. Group U4. | S | Lina |
| 347 | Lunch Money | Starter category sets | `missing` | **to build** | to build: four written starter sets (a student, a household, a freelancer, a traveller) of own categories with subcategories, previewed and added in one tap, changing nothing already there. Opened `lib/money-log/category.ts` and `lib/money-log/schema.ts:102,109` (`own`, `subs`). Written text in English and Dutch; normal writes to `own` and `subs`. Files: a new `lib/money-log/starter-sets.ts`, the category settings in `components/wealth/spending`. Group U4. | S | Lina |

### To build, grouped (the new rows; most daily use first)

Friends:
- Max: habits, tasks, a night owl.
- Lina: bank files, budgets, bills.
- Sanne: sleep, water, the journal, Dutch.
- Tom: gym, food, runs.
- Jules: Earn, Markets.

Every to-build row above is in exactly one group.

| Order | Group | Rows (ledger #) | Friends | How often | Effort |
|---|---|---|---|---|---|
| U1 | Motion's planned week: plan my week, working hours, a deadline at risk, pieces of a long task, a task that waits, a repeat that floats in its week | 6 rows: #300, #301, #302, #303, #304, #305 | Max (Lina) | daily | L |
| U2 | Bear's everyday notes: tags in the text with a focus tag, several photos, note info, find and replace, fold a section, callouts, archive, a writing view | 8 rows: #306, #307, #311, #312, #313, #314, #315, #316 | Max (Sanne) | daily | M |
| U3 | Journey's journal: formatting and tick boxes, a week, a month and a year back, favourites and mood in the list, more photos | 4 rows: #308, #309, #310, #317 | Sanne | daily | S |
| U4 | Money every day (Lunch Money, Actual): the month's calendar, sums in an amount, group entries, archive a category, payee places, starter sets | 6 rows: #338, #339, #341, #342, #346, #347 | Lina | daily | M |
| U5 | Habits and feelings (Atoms, How We Feel): the person behind the habits, what a word means, strategies, where you feel it, start small and step up | 5 rows: #323, #324, #325, #326, #327 | Max, Sanne | daily | M |
| U6 | Pillow's sleep: sleep beside caffeine and steps, your timing on free days, a tip a day, a nap timer | 4 rows: #332, #333, #334, #335 | Sanne (Max) | daily | S |
| U7 | Tom's week (Runna, Noom): planned workouts that move, a weight band, a planned free day, a note for a harder week, heart-rate zones, races ahead | 6 rows: #328, #329, #330, #331, #336, #337 | Tom | each gym day | M |
| U8 | Money views (Actual, Lunch Money): reconcile an account, the monthly average, saved questions with a chart, investment income against spending | 4 rows: #340, #343, #344, #345 | Lina, Jules | weekly | M |
| U9 | Files and privacy for notes and the journal (Bear, Journey): lock a note, export a note as HTML, text or Word, the journal as an e-book and Word, Evernote and Bear imports | 4 rows: #318, #319, #320, #321 | Max, Sanne | monthly | M |

Notes for the owner:

- Correction: Strong's "Workout scheduling" in the first matrix is `have`, but planned workouts exist only in the Showcase (`components/agenda/agenda-extras.ts:21`, "Planned workouts stay empty until a feature keeps them"; round 3's timeline source is the same). #330 builds the record; COMPETITORS.md's Strong row should read `half` until then.
- #300 only proposes: the person keeps the placements, with Undo. Nothing is moved while they are away. #302 says the risk as a fact, never red and never a sound, under the calm-design rule.
- #318 encrypts one note with the person's passphrase through the browser's own Web Crypto (no package; no wallet, signing or account key is touched). A forgotten passphrase cannot be recovered. Before building, check that an older build that sees the empty body of a locked note cannot write over its ciphertext. It touches privacy, so it gets its own commits, TIER 3 (stored format).
- #346 keeps payee places, which is location data. It is opt-in, asked on the person's tap each time (never in the background), rounded, kept with the payee only, on the device, and cleared by "Forget places" and the erase. If the owner reads stored places as against the private on-device rule, the row is Carried: against a named rule.
- #324, #325 and #326 use plain, everyday words with no clinical labels. Body areas are where a feeling sits, never symptoms, and nothing is read from them. If the owner reads #326 as medical, it is Carried: against a named rule.
- #333 calls the person an earlier, middle or later sleeper only as an estimate from their own nights, never a type to change. If the owner reads it as medical, the row keeps only the two times (weekends and weekdays).
- #334's tips are practical habits only (where the phone charges, the same wake time), with no health claims, as #283's water tips are. If the owner reads them as health advice, the row is Carried: against a named rule.
- #336 takes the maximum heart rate the person types; it is never worked out from age (that would be a guess about the body).
- #331 adds a band on the trend only. Noom's Harris-Benedict calorie zone is not added: the owner-approved maintenance estimate (`lib/health-aa/energy.ts`) stays the one exception. #328 never takes a day below the coach's floor.
- #329 never says how many days were missed, under the calm-design rule.
- #343 and #345 say facts ("€40 above your 6-month average", "covers 6 % of spending"), never "overspending" or a target, under the no-money-advice rule. #345 has no "years to freedom" line; that stays the FI model, labelled a model.
- #317: `photos` is `.max(4).optional().catch(undefined)` in `lib/journal/schema.ts:49`, so writing more than four there would make an older build drop every photo link of that entry on its next write. The extra photos must go in a new field.
- #314 and #308 touch `lib/ai/safe-render.ts`, which ZIGi's replies also use; the new marks must be switched on for Notes and the journal only, as round 3's #264 and #267 are.
- #319 and #320 write .docx and .epub by hand (XML in a ZIP through `lib/export/zip.ts`). That is code, not a package. #322 (maths) needs KaTeX or MathJax and stays Carried: a new dependency.
- Rows that build on round 3 work and should wait for its merge: #300 (on #258, the Day Timeline for any day), #308 (on #264 and #267, the notes marks), #310 (beside #265's prompt filter), #320 (on #272, Markdown per entry), #330 (on #289, circuits, and #258's timeline source), #331 (on #287's goals record), #332 (on #281, own drinks), #338 (on round 3 money's shared month rule).
- #306, #307, #316 (Notes), #300 (Plan my day) and #338 (Spending) change page layouts. Check each against the protected baseline in docs/STATUS.md before building.
- Stored-format changes (TIER 3, each in its own commits, all additive): #301, #303, #304, #305, #307, #309, #310, #315, #317, #318, #323, #324, #326, #327, #328, #330, #331, #336, #337, #340, #341, #342, #344, #345, #346. New device records that must join Export everything and the erase: #330, #337, #344, #346. Notification-plan changes, TIER 3 (PWA): #309.
- None of the to-build work adds a package, reaches an outside service, needs a model, touches a wallet, signing or a key, or connects a bank.
- The new to-build rows by pillar:
  - Tasks and planning: 6
  - Journal and notes: 16
  - Habits and mind: 5
  - Food and drink: 2
  - Sleep, workouts and body: 8
  - Money: 10
  - All: 47
