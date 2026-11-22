# Lane 2 — habits pillar (Habits, mood and written practices)

Branch `lane2/habits`. One section per feature. The lead wires the answers into `engine.ts`, adds the cases to the
corpus, regenerates theme sheets, edits Help / What's new / search / shard lists and the registries listed here.

## Feature 1 — Habit options and the game's own rules (LEDGER #45, #48, #49, #50, #52, #57)

**Verdict: built.**

| row | what was built |
|---|---|
| #45 Habitica difficulty | Each build habit: "How hard is it?" Tiny 5 · Easy 10 (default, as before) · Medium 15 · Hard 20 XP a done day (game layer on). |
| #48 Habitica Orb of Rebirth | Journey → "Start again at level 1": the level counts XP from that day; badges, freezes, streaks, XP history and every record stay; each level celebrates once more after it; the rewards shelf keeps unlocking by lifetime XP. |
| #49 Streaks 2-Day Rule | Per-habit opt-in "Never miss twice": one missed day keeps the streak (adds nothing), two missed scheduled days in a row end it; skipped days neutral. Off by default — the streak and the "Never missed twice" line are unchanged. |
| #50 Streaks unscheduled | "Whenever, no set days" (daily build habits): logged any day; a day with nothing done is not scheduled (never missed), today is open but never due (no reminder, no Today count); the card says "Whenever" and "Any day you like". |
| #52 Finch Goal of the Day reward | Today's focus habit done earns 5 XP more; the focus of each day is kept (`focusDays`) so a past day's bonus stays earned. Also QUALITY "Not fixed": XP for the focus habit. |
| #57 Habitify auto-skip | "A day I don't log counts as skipped": a past scheduled day with nothing logged (or an undone 0) is skipped (neutral); a day marked failed stays failed. |

- Where: a habit card → Details → **Habit options** (a fold, loaded with the Details: `components/habits/habit-options.tsx`,
  lazy). Journey → **Start again at level 1** (a fold, lazy: `components/game/rebirth.tsx`). Journey → "What earns XP" lists
  the difficulty and focus rows.
- Engine: `lib/habits.ts` gains `setHabitDayOverlay` (as `setHabitScheduleOverlay`); the browser installs it from the
  habit extras (`lib/habit-options/install.ts`, in `use-habits.ts`). With none installed (server, tests, older builds)
  every habit reads exactly as stored. `lib/game/xp.ts`: `GameStores.habitExtras`, `rebirthFrom`, `countedXp`,
  `XpSummary.lifetime`.
- Files: `lib/habit-options/{rule,install}.ts`, `lib/habits.ts`, `lib/habit-focus.ts`, `lib/habits-extras/schema.ts`,
  `lib/game/{xp,schema,celebrate}.ts`, `components/habits/{habit-options.tsx,habit-options.css,habit-card-full.tsx,habit-completion.tsx,use-habits.ts}`,
  `components/game/{rebirth.tsx,journey.tsx,use-game.ts}`, `lib/ai/tools/{ak-sources,ak-tools,env}.ts`,
  `components/ai/use-ai-context.ts`, `lib/ai/local-answers/exact/journey.ts` (NOVA's level follows the rebirth).
- Tests: `lib/habit-options/habit-options.test.ts` (options read/write/prune, focus days, the three engine options, XP
  difficulty and focus bonus, rebirth level and celebration id, export → erase → restore of both records),
  `lib/ai/local-answers/av2-habits.test.ts`.
- Spec: `tests/av2-habit-options.spec.ts` (3 themes; 390 and 1440 by project; 320 no sideways scroll; axe; focus kept on
  the checkbox).
- **Stored changes (TIER 3 stored formats, additive, separate commit):** `zigoals:habit-extras:v1` gains optional
  `options` ({habitId: {twoDay?, unloggedSkip?, whenever?, difficulty?}}, ≤ 400, each entry checked where read) and
  `focusDays` ({date: habitId}, the latest 400 days, checked where read). `zigoals:game:v1` gains optional
  `rebirth` ({from, times}, `.catch(undefined)` on the loose object). Both keys are already exported, erased, restored
  and synced as they are; no new key, no registry change needed. Older builds keep the fields through a
  read-modify-write and simply do not show them; a whenever habit reads there as an ordinary daily habit.
- Help (EN): **Q: Can a habit keep its streak through one missed day, or have no set days?** A: Open the habit's
  Details → Habit options. "Never miss twice" keeps your streak through one missed day; two in a row end it. "A day I
  don't log counts as skipped" makes an unlogged day neutral. "Whenever" (daily habits) lets you log it any day: it is
  never due and never missed. "How hard is it?" sets the XP a done day earns when the game layer is on, and today's
  focus habit earns 5 XP more. **Q: Can I start my level again?** A: Journey → Start again at level 1. Your level counts
  from that day; badges, freezes, streaks and every record stay.
- What's new: "Habit options: never miss twice, whenever habits, skipped when unlogged, and how hard a habit is."
  · "Start again at level 1, keeping every badge."
- Answers wiring (engine.ts, beside `avAnswer`): `import {av2HabitsAnswer} from './av2-habits';` and, in the same
  `if (!subject)` branch, try `av2HabitsAnswer(question, env)` before `avAnswer` (same `groupUnits`/`novaWording`
  wrapping). Cases: `lib/ai/evals/as/cases-av2-habits.ts` (`AV2_HABITS`) for `cases.ts`.
- Showcase hook: none added (the Showcase's habit counts and XP are pinned by other tests; a Showcase habit with an
  option would change the Showcase's streaks/XP). Reported, not changed.
- Device keys / catalogue / export / erase: nothing new (existing keys).
- CSS touched: `components/habits/habit-options.css` (new; theme variables only).
- Always visible on Today: nothing added.
