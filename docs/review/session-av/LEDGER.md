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
