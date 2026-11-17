# ADR-042 — Session AS: "NOVA ANSWERS EVERYTHING"

- **Status:** in progress (branch `feature/session-as-nova-answers`, one Draft PR; not merged, not deployed)
- **Base:** `main` `e6e92a8c` (Merge [PR #105](https://github.com/reyals1111-ux/ZIGoals/pull/105), Session AR)
- **Scope sources:** the owner's brief for Session AS (17 Nov 2026); ADR-038, ADR-041; `docs/design/NOVA_AM_ART_DIRECTION.md`.
- **Parallel lane:** Session AT (`feature/session-at-alpha-polish`) owns everything outside NOVA, including `package.json`,
  the lockfile and the workflows. This session's files: `apps/web/components/nova/**`, `apps/web/lib/nova/**`,
  `apps/web/lib/ai/**`, `apps/web/public/nova/**`, the NOVA and hud specs. Shared files change additively.

## Why this session exists
Owner's findings on the Showcase, 17 Nov, both reproduced on `main` `e6e92a8c` before any change:

| Asked | NOVA said | What the records say |
|---|---|---|
| "how many habits did I miss this week" | the list of all 7 habits (`list_habits`) | this week so far: per habit, how many due days were not done |
| "wgat days did i forget to meditate this month" | "You logged 145 minutes of Meditate this month…" (`habit_stats`) | not done on 2 days: Tue 3 Nov and Thu 12 Nov (both marked skipped); today still open |

Cause, read from the code: the on-device engine (`lib/ai/local-answers/engine.ts` and its later layers) matches a
*subject* (a habit's name, the word "habits") and then answers that subject's default figure. It has no notion of what is
asked about the subject (missed / done / skipped / late) or of the shape of the answer (a count, a list, dates, a trend).
The stage then shows the subject's general widget. A Dutch question is not answered on the device at all.

## Owner decisions (17 Nov 2026)
**Approved: the plan below and its seven approval items, with four additions.**

1. **What "missed" means.** *Missed* = a day the habit was due and not done (the Habits page's own "failed"). *Skipped* =
   a day the person marked as skipped: listed beside it, never added to "missed". *Not done* ("forgot", "didn't") =
   missed + skipped, always broken down. Today is "still open", never missed. *Late* = a task done after its due day, a
   bill paid after its due day.
2. **Where it applies.** NOVA's surface, English and Dutch. *Changed by addition A1 below: ZIGi's surface too.*
3. **TIER 3 (stored format), additive:** one new optional widget parameter `period` (a short token: `today`, `yesterday`,
   `this-week`, `last-week`, `this-month`, `last-month`, `this-year`, `last-N-days`, `since:YYYY-MM-DD`, with an optional
   weekday) in `zigoals:nova-stage:v1` beside `range` and `ref`; `ref` may also hold a habit's id. Older builds ignore it
   (frozen readers #37–#56 are run, not edited).
4. **TIER 3 (AI tools):** one new read-only lookup, `life_facts`: a connected model gets the same computed facts the
   device answers with, as a tool result, under the existing gates (area switches, the three-part Health gate, privacy
   modes, sensitive screens). No new service.
5. **Mood and symptoms** stay behind the Health switches: the journal has no mood of its own, so the "mood map" reads
   Health's moods and exists only with Health open (Q14/Q16). The journal's own map is days written and words.
6. **D36 without a CSP change, if possible:** the star's WebGL moves to a same-origin module worker (`worker-src 'self'`
   is already in the policy; precedent `lib/import/switch/run.ts`). Only if the policy must change: a `TIER 3 (CSP)`
   commit quoting the old and new rule.
7. **Corpus honesty:** each case holds literal expected facts; a second, simpler path in the test (plain loops over the
   raw Showcase records) recomputes them, so the corpus is not a snapshot of the engine's own output.

**The owner's additions (17 Nov, with the approval):**
- **A1 ZIGi too.** The exact layer answers on ZIGi's surface as well (text and ZIGi's usual cards, no NOVA widgets), so
  the app never gives two different answers to the same question. ZIGi tests or evals that pinned the old, wrong answer
  change only as "Session AS (<id>, deliberate)" with an equally strict replacement; the list is kept below
  ("Tests changed").
- **A2 The health scan's heart is decoration** and says so in its accessible name; it never suggests a live measurement.
  A heart rate is shown only when one is recorded, with its source and as-of.
- **A3 "How am I doing"** (life radar, day scan) shows facts and comparisons with the person's own past, never a score,
  a grade or a judgement of the person.
- **A4 Order, for a hand-over at any point:** Part 1 complete first; in Part 2 first the families behind the owner's two
  questions (month calendars, ranked miss bars), then scanners, trends, gauges, flames, calendars of other pillars, then
  the rest. Every part is shippable on its own: a stop at any point leaves a green, usable branch, and
  `docs/handoff/AS_RESUME.md` names the next family.

**Standing rules** (unchanged): consumer first, chain invisible; private by design; non-custodial (money only as a
pre-filled confirm card the person signs); no fake or simulated data shown as real (the Showcase is labelled); no
projection as a guarantee; mood and symptom records only behind the Health switches; the deterministic safety guard and
the privacy modes on every new path; never a film reference; no pointer tracking; everything paused when hidden; idle
near zero; readability (labels ≥ 14 px, body 15–16 px, targets ≥ 44 px, contrast ≥ 4.5:1); Session AR's composition and
every protected area unchanged; no new dependency or service; no wallet, signing or key change; route weights inside
every budget; stored data only additive.

## The plan as approved

### Part 0 — records (first commit, first push, Draft PR)
`docs/architecture/ADR-042-session-as.md` (this plan, the approval items), `docs/handoff/AS_RESUME.md` (done / in progress / next; kept current for the Opus hand-over), a STATUS stub. Environment as in AR_RESUME (`/opt/node24`, Chromium only).

### Part 1 — answers that are exactly right (priority 1)

New, in its own chunk (loaded on demand on NOVA; no shared route grows): **`lib/ai/local-answers/exact/`**

- `understand.ts` — the question → a `Query`, deterministic, on the device:
  `{domain, subject?, ask: missed|done|skipped|not-done|late|open|total|average|best|worst|streak|status|why, shape: count|list|dates|amount|trend|compare|yes-no|overview, period, weekday?, lang}`.
  English and Dutch lexicons; typo tolerance by bounded edit distance on words of four letters or more ("wgat", "habbits", "mediteren"/"gemediteert"); casual forms ("did i skip gym", "hoe vaak sport gemist"). Periods reuse `findRanges` / `weekStart` (`lib/ai/tools/range.ts`: this week is Monday to Sunday); subjects reuse `habitHits`/`goalNamed`/`namesGoal`. A question it does not understand with confidence is **not claimed**.
- `facts/<domain>.ts` — a `Query` → typed `Facts` (rows, dates, totals, the period, source, as-of), computed with the pages' own engines, nothing counted a second way: `habitDay`/`habitStats` (`lib/habits`), `habitWeek` (`lib/nova/cards/habit-week.ts`), `sleepBalance`/`dailySeries` (`lib/sleep/engine`), `weightCard`, `stepsCard`, `workoutsCard`, `spendingCard`, `budgetsCard`, `billsCard`, `netWorthCard`, `journalMonth`, `tasksWidgetView`, the meditation/supplement/fasting selectors in `lib/nova/cards/health-more.ts`, vitals (`lib/vitals`), focus sessions, agenda, checklist. Read from the same `ToolEnv` as every tool, so a closed switch gives the locked sentence and Health is not in the environment at all with its gate closed.
- `say.ts` — `Facts` → one short answer (EN/NL, the app's own date/number/money formats), the empty state for a fresh profile ("You have no habits yet."), unknown never as 0, no projection as a promise.
- `widgets.ts` — `Facts` → the widgets of that answer: one hero plus up to two supporting (`MakeRequest` with `ref`, `period`).

Wiring (existing files, small edits):
- `lib/ai/local-answers/engine.ts` `localAnswer`: on NOVA's environment, after the safety guard and the action/statement/mixed checks, the exact layer answers what it claims; everything else falls to the existing layers unchanged; when those return nothing or the examples list and the exact layer knows the domain, NOVA gives **an honest short line plus the closest widget** ("I can't count that exactly from your records. Here is your habits week."), never a guessed figure. Two equal subjects stay choices.
- `lib/ai/tools/` + `registry.ts`: `life_facts` (approval 4); `lib/ai/context/question.ts` already pre-runs a local answer's calls for the model, so the same facts reach it.
- `lib/nova/summon/summon.ts` (`TOOL_WIDGET`, `replyWidgets`) and `lib/nova/summon/lines.ts`: an exact answer's widgets and lines come from its `Facts`, so words and widget cannot disagree.
- Safety guard, secret guard, privacy modes: unchanged and first on the new path (tests extend `lib/ai/privacy-cross-path.test.ts`, `lib/nova/stage/am-security.test.ts`).

**The corpus** — `lib/ai/evals/as/` (unit tests, vitest): at least **400 questions**, built as about 110 intents × phrasings (English, Dutch, a typo form, a casual form), across Goals, Habits, Health, Wealth, Tasks, Notes, Journal, Agenda, Checklist, Focus and NOVA itself; covering missed/done/skipped/late × count/list/dates/trend × today, yesterday, this/last week, this/last month, since a date, on a weekday; comparisons, best/worst, "how am I doing", "why". Each case: the literal facts the answer must contain, facts it must not contain, the widgets made — for the Showcase on a fixed day (2026-11-17, UTC) and for a fresh profile. Both owner questions are cases 1 and 2. Result per pillar goes into ADR-042. Existing tests that pinned the old (wrong) answer on NOVA's environment are changed only as "Session AS (<id>, deliberate)" with an equally strict replacement.

### Part 2 — a widget for every kind of answer (≥ 60 new kinds, ≥ 15 families)

One new kit, `components/nova/cards/ax-kit.tsx` + `ax.css` (the "answer instruments"), on top of the existing `kit.tsx`/`holo/parts.tsx` (frame, `CardFoot` source and as-of, `HoloTable` text alternative, `CardNotice` teaching/locked states, pillar tokens `--neon*`). Each family is one primitive with its own entrance (once, ≤ 900 ms, transform/opacity/one-shot dash only) and one ambient ornament (O5; Calm slower; Motion Off / reduced motion still and complete; paused when hidden or off screen; nothing follows the pointer). Each kind = catalog entry (`lib/nova/widgets/catalog.ts`, `made: true`, its gate) + its `Facts` selector + a thin body in `components/nova/widgets/ax/` (lazy in `widget-grid.tsx` `BODIES`) + S/M/L tiers + a stage line.

| # | Family | New kinds (64 planned; a kind whose records the app does not hold is swapped inside its family) |
|---|---|---|
| 1 | Month calendars | habit missed days · habit done days · all habits by day · workout days · water-target days · sleep-goal nights · bills by due day · tasks by due day |
| 2 | Ranked miss bars | misses per habit · skips per habit · overdue tasks by age · budgets over · top spending categories |
| 3 | Scanners | health scan (beating neon heart, scanner sweep, vitals cards: sleep, steps, water, weight, resting heart rate where recorded) · body scan (measurements) · day scan (today across pillars) |
| 4 | Rivers | net-worth river · income-and-spending river · habit completion river |
| 5 | Radars | spending radar · life radar ("how am I doing") · habit weekday radar · macro radar |
| 6 | Timelines | task timeline · day timeline · goal dates timeline · bill timeline · focus sessions timeline |
| 7 | Maps | mood map (Health switches) · journal map (days and words) · notes constellation |
| 8 | Gauges | budget gauges · goal gauge · calorie/protein gauge · savings-rate gauge · focus gauge |
| 9 | Lattices | habits × month · habit × weekday · checklist lattice |
| 10 | Flames | streak flames · best streaks ever · journal streak · focus streak |
| 11 | Heatmaps | habit year · steps heat · focus hours · spending by day |
| 12 | Trends | weight trend with goal line · sleep trend · steps trend · resting heart rate trend |
| 13 | Stage bars | sleep stages (deep, REM, core, where recorded) · bed and wake times · fasting windows |
| 14 | Orbits | goal orbits · today's checklist orbit · habits orbit |
| 15 | Twins (compare) | this week vs last · this month vs last · best and worst day |
| 16 | Vessels and dials | savings jars per goal · water over the week · next-bill dial · task load dial |
| 17 | NOVA itself | what NOVA answered (asked vs answered) · what NOVA can and cannot answer |

Readability and rules as today: labels ≥ 14 px, body 15–16 px, targets ≥ 44 px, contrast ≥ 4.5:1, no `backdrop-filter` on the widget plane, the Showcase label, no fake data, money only as a pre-filled confirm card.

### Part 3 — the NOVA name
`components/nova/nova-stage.tsx` (the `letters` line) and `nova.css`: the N·O·V·A wordmark much larger, white on the left flowing into cyan, violet and pink (the heading rule, ADR-036), as gradient text with a static bloom; sized by the star's column so it is crisp at 2560, 1440 and 390, in Nebula, Light and Dark; a custom name keeps the same treatment. Contrast of the lightest and darkest stop checked on the night sky.

### Part 4 — NOVA leftovers
- **D36:** `components/nova/core/star-system.tsx` — the capability probe, the shader compile and the draw loop move into a worker on an `OffscreenCanvas`; the main thread sends state only; the present path stays as the fallback where a worker canvas is not available. Measured before/after on this sandbox (no graphics hardware).
- **D34:** the phone stillness spec under two workers, re-examined once the star draws off the main thread (two attempts, else Carried with its cause).
- The planet crossing the core in a narrow column (`lib/nova/core/star-shader.ts`); the speaking mark as soft outward rings instead of spikes; "STAGE N WIDGETS" counts the stage's widgets only (the band said apart).

### Part 5 — finish
One fresh-critic round on the new families (no loop); one production build per integration point; browser specs: one per new family plus the owner's two questions (`tests/nova-answers-as.spec.ts`, `tests/nova-families-as.spec.ts`), Chromium, 2 workers; axe and theme parity on NOVA; route weights (`scripts/check-weight-budget.mjs`, none raised); frozen readers. Then ADR-042 (decisions, corpus result per pillar, the families), `docs/handoff/AM_DEMO_TOUR.md` with twenty questions to try, STATUS as the final commit, CI read (≤ 2 fix attempts per failure), and the report in ≤ 12 lines with the Mac preview steps.

### How it is run
- Order: 0 → 1 → 2 → 3 → 4 → 5; commit and push per part and at least every 30 minutes; lint, typecheck and focused tests before every push.
- Helpers (at most 4, short briefs): after the kit and three exemplar widgets exist, three build widget families in parallel against the `Facts` types; one extends the corpus phrasings (Dutch, typos). Builds and browser runs stay one at a time.
- Stop rules as in the brief (2 fix attempts then Carried with the cause; hard timeouts ≤ 15 min; CI polled at most every 10 minutes). If the allowance ends mid-part, `AS_RESUME.md` says exactly where; the count of kinds and corpus cases reached is reported as it is, not rounded up.
- Never merged, auto-merged, dispatched or deployed by the session. No new dependency or service; no wallet, signing or key change. Shared files (registries, help, STATUS) change additively; if AT merges first, `main` comes in by a merge commit.

### Verification
- `pnpm typecheck`, `pnpm lint`, `pnpm test` (the corpus is part of it); theme sheets in sync; frozen readers #37–#56.
- `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, `pnpm --filter @zigoals/web start`, then the NOVA and hud specs and the new AS specs against it.
- By hand on the Showcase: the owner's two questions give the per-habit miss counts with ranked miss bars, and the two dates with the month calendar lit.
- B2 again at 2560 × 1440 with new widgets on the stage: only transform and opacity animate, 0 animations hidden, idle near zero.

## Decisions (made by the session; D-numbers are referenced from code comments)
*(added as the work goes)*

## Tests changed (deliberate; none weakened)
*(added as the work goes; each carries "Session AS (<id>, deliberate)")*

## The corpus, per pillar
*(added with Part 1)*

## The widget families
*(added with Part 2)*
