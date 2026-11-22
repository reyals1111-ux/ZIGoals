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

## Feature 2 — Areas' week with milestones, and the monthly theme (LEDGER #53, #55)

**Verdict: built.**

| row | what was built |
|---|---|
| #53 Finch Self-Care Areas and Weekly Milestones | Habits → "Your areas this week" (a fold, lazy): each life area that holds a habit — "Health: 9 of 12 this week", Monday to Sunday (skipped, unscheduled and whenever days add nothing due; an "N times a week" habit counts its N), a bar, the weekly milestone (every check-in due, or the person's own number 1–500, set by keyboard, Escape cancels, focus back on its button), "reached ✓" and "N weeks in a row". Empty state teaches "◈ Choose an area". |
| #55 Finch Seasonal events | Journey → "This month's theme" (a fold, lazy): twelve calm themes (EN/NL), each tied to a built-in life area (November: Gratitude, Habits & Mind); 15 days with a check-in on a habit in that area (any habit while none is in it) earn the new "Theme month" badge (❋) in `lib/game/badges.ts`; the months reached are listed. "Hide the monthly theme" (no pet; the badge is not earned while hidden, one earned stays). |

- Files: `lib/habit-areas/week.ts`, `lib/game/month-theme.ts`, `lib/game/{badges,schema,xp}.ts`,
  `components/habits/{habit-areas-week.tsx,habits-workspace.tsx,habit-options.css}`,
  `components/game/{month-theme-panel.tsx,av2-journey.css,journey.tsx,use-game.ts}`, `lib/ai/tools/env.ts`,
  `components/ai/use-ai-context.ts` (`game.monthTheme`), `lib/ai/local-answers/av2-habits.ts`.
- Tests: `lib/habit-areas/week.test.ts` (week counts, own milestone and weeks in a row, the twelve themes, the area
  rule, the badge on/hidden/kept, the switch, export → erase → restore of both records), `av2-habits.test.ts`.
- Spec: `tests/av2-areas-theme.spec.ts`.
- **Stored changes (TIER 3 stored formats, additive, separate commit):** `zigoals:habit-extras:v1` gains optional
  `areaGoals` ({areaId: 1…500}, ≤ 100, checked where read); `zigoals:game:v1` gains optional `monthTheme` (false =
  hidden, `.catch(undefined)`). Existing keys; no registry change.
- Badge cabinet: one more badge ("Theme month"), so the cabinet reads "N of 17". No test pins 16 (journey.spec reads
  `\d+ of \d+`); the Showcase may earn it if its Mind habit has 15 November days — the lead's Showcase runs will show it.
- Help (EN): **Q: How do I see how each part of my life is doing this week?** A: Give your habits a life area (a habit's
  Details → ◈ Choose an area). Habits → Your areas this week then shows each area's check-ins done of those due,
  Monday to Sunday, and its weekly milestone: every check-in due, or a number you set. **Q: What is the monthly
  theme?** A: With the game layer on, each month has a calm theme tied to a life area. A check-in on 15 days of the
  month on a habit in that area earns the Theme month badge. Journey → This month's theme shows it, or hides it.
- What's new: "Your areas this week, with a weekly milestone per area." · "A calm theme each month, with its own badge."
- Answers: `av2HabitsAnswer` now also answers "how are my areas doing this week" / "hoe gaan mijn levensgebieden
  deze week" and "what is this month's theme" / "wat is het thema van deze maand" (cases in `AV2_HABITS`).
- Showcase hook: the Showcase's habits already carry areas, so "Your areas this week" shows them with no new data.
- CSS touched: `components/habits/habit-options.css`, `components/game/av2-journey.css` (new; theme variables only).
- Always visible on Today: nothing added. Habits page first chunk: one fold row (`<details>` + lazy import).

## Feature 3 — Hidden prompts and exercises (LEDGER #56)

**Verdict: built.**

- Finch's muted tags and exercises as one device list: "Don't ask this again" under the Journal's question of the day
  (the next question shows; focus stays); Journal → Start from a prompt → "Hidden prompts and exercises" (a fold, lazy)
  lists the hidden questions to bring back (an unticked one stays listed while the fold is open) and hides any ready
  template; Health → Meditation → Breathe with a guide → "Hide a pattern" (a fold, lazy) hides breathing patterns. A
  hidden item is only left out of what is offered (all patterns hidden: all offered; all questions hidden: none skipped);
  nothing already written changes.
- Files: `lib/muted/{rule,write}.ts` (the writer loads on the tap), `components/muted/{muted-panel.tsx,muted-panel.css}`,
  `lib/journal-prompts/daily.ts` (`questionIndexOfTheDay`, an optional `skip` for `questionOfTheDay`; callers without
  it are unchanged), `components/journal/journal-compose.tsx`, `components/journal-prompts/prompt-picker.tsx`,
  `components/health/meditation/meditation-forms.tsx` (the hidden list is read after mount, never on the server).
  Note for the journal lane's builder: these three journal/meditation files gained small, separate edits.
- Tests: `lib/muted/muted.test.ts` (hide/read/bring back, odd entries, the question passed over, export → erase →
  restore, the answers EN and NL). Spec: `tests/av2-muted.spec.ts`.
- **Stored change (TIER 3 stored formats, additive, separate commit):** `zigoals:habit-extras:v1` gains optional
  `muted` ({questions?: number[], templates?: string[], breathing?: string[]}, ≤ 200 each, a loose object checked where
  read). Existing key: exported, erased, restored and synced with the extras; no registry change.
- Help (EN): **Q: Can I stop seeing a journal question, a template or a breathing pattern?** A: Yes. Under today's
  question, "Don't ask this again" hides it. Journal → Start from a prompt → Hidden prompts and exercises lists what you
  hid, to bring back, and hides ready templates; in Meditation, Breathe with a guide → Hide a pattern hides a breathing
  pattern. Nothing you already wrote changes.
- What's new: "Hide journal questions, templates and breathing patterns you don't want offered."
- Answers: "which prompts have I hidden" / "welke vragen heb ik verborgen" (cases in `AV2_HABITS`, id `av2-habits-hidden`).
- Showcase hook: none (the Showcase hides nothing; a hidden question would change the Showcase's question of the day).
- CSS touched: `components/muted/muted-panel.css` (new). Always visible on Today: nothing (the compact journal card on
  Today shows no question).
