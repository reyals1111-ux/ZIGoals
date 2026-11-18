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

### Part 1 — answers that are exactly right
- **D1 One reading, one answer.** `apps/web/lib/ai/local-answers/exact/`: `understand.ts` reads a question into the part
  of life, what is asked about it, the shape of the answer and the period; each part of life answers from the pages' own
  engines (`habits.ts`, `health.ts`, `money.ts`, `day.ts`). A habit, a Health measure, the journal and focus are all one
  kind of thing, a *track* of days (`series.ts`, `track.ts`), so each answers the same questions the same way: which days
  not done (missed and skipped said apart), how often done, a day's own state, totals, averages, best and lowest day,
  the run of days, one period beside another, the last time.
- **D2 Where it answers** (`index.ts` `strictClaim`, `noModelFirst`; `engine.ts` `exactLocal`, `exactFallback`). The older
  layers hold some 3,300 pinned tests and answer many questions well, so the exact layer answers *before* them only for
  the classes they answered with something else: what was missed, skipped, not done or late; which days; a weekday; one
  day of a log ("did I work out yesterday" was "there is no habit called work out"); a named period they did not keep to
  (workouts, focus, the journal, finished tasks, spending "yesterday" was the month's total); sleep's average and best
  night; "how is my health" (was "no goal is called health"); one period beside another; where the money went; bills due
  this week; goals closest, furthest, next date. With no model, a Dutch question and a comparison are answered before the
  older no-model path can take their words for a line to log (it made a food card of "hoeveel calorieën heb ik vandaag
  gegeten"), and anything else the exact layer reads comes back to it before the examples list. Everything else is the
  older layers', word for word.
- **D3 Honest where the records cannot say.** "Why …" and a judgement ("is my sleep normal for my age") are never
  answered as if the records said so: with no model the reply is one honest line and what the records do show, with that
  part's widget; with a model the question goes to it with the same facts (`lib/ai/context/question.ts`).
- **D4 Typos.** A word is set right only against the layer's own vocabulary and the person's record names, never against
  a general dictionary: five letters and more first; a four-letter slip ("wgat") only to a question word and only when
  nothing else reads the question; the first letter must be right; everyday words that sit one slip from a known word
  are never touched. A misspelt question the exact layer reads but does not claim is asked of the older layers in the
  fixed words (`fixedWords`), so a typo costs no answer there either.
- **D5 ZIGi and NOVA say the same (A1).** One function for both; only the place a permission is changed is named
  differently. With no model, NOVA's own Dutch overview answers are given on ZIGi too (in ZIGi's words) before the exact
  layer, so a Dutch "welke gewoontes zijn vandaag nog open" reads the same on both. The corpus checks it.
- **D6 `life_facts` on both surfaces** (changes approval item 4's "NOVA's surface only", following A1). The device's
  exact answer names this lookup as its call on ZIGi too, so it is registered for every surface, with its own mark
  (`surface: 'facts'`): each part of life's own switch is checked inside it. It carries the question's own words
  (`words`), so "tomorrow" or "perfect days" is read from a model's call as from the device's. `ToolEnv.purpose`
  (additive) keeps the journal's days on the device unless the person shares the journal.
- **D7 The widgets of an answer** travel with its lookup as short strings (`showOf`), each with a stand-in: a kind this
  build does not have yet gives way to an existing widget, so Part 1 ships before Part 2's kinds exist.
- **D8 What "today" means.** Today's open habit is "still open", never missed; a log's day with nothing logged is said
  apart ("nothing logged on 2 days: …"), never counted as below the target; a night belongs to the day it ends on.
- **D9 Known limits** (not fixed here): a Dutch answer writes its dates in the app's display locale (English by default),
  as every page does; a judgement asked about spending in English still gets the older layer's plain month figures (true
  figures, but without the honest line); "best day" is said of a night too.

- **D10 An exact answer keeps its third sentence under the star** (`lib/nova/summon/words.ts`). The stage cut every
  reply at two sentences; "Meditate: not done on 2 days … Both were marked as skipped. Today is still open." lost its
  last fact there (found by `tests/nova-answers-as.spec.ts` on its first run). An exact answer keeps three sentences
  within the same 220 characters; any other reply is cut at two as before.

### Part 3 — the NOVA name
- **D11 The wordmark** (`components/nova/nova.css`). N·O·V·A above the star is 34 to 68 px by the window's width (28 px
  on a phone; it was 15 px), weight 760, as gradient text: white on the left (to 16 %) flowing into cyan `#8ff6ff`,
  violet `#a98bff` and pink `#ff8fd4`, with a thin dark edge and a static bloom (no motion). Its layout slot stays 22 px
  high (negative block margins), so the star and AR's composition do not move; the element's own box covers the glyphs,
  because a browser paints gradient text only inside the box (at 2560 px the first build was cut to the middle 22 px).
  The colours are the wordmark's own in all three themes: NOVA's stage is the night sky in each. The darkest stop, the
  violet, is 7.2:1 on the sky `#0b0c24` and 5.4:1 on the brightest nebula behind it (`#2a1f5a`); the pink is 9.3:1. Forced colours: plain text. Soft glow: no bloom. A
  custom name wears the same treatment. Seen at 2560 × 1440, 1440 × 900 and 390 × 844.

### Part 4 — NOVA leftovers
- **D12 "Stage N widgets" counts the stage.** The grid knows which widgets stand beside or under the star and which
  rest on the band below ("More on your orbit"); it reports both, and the read-out says "7 widgets, 3 below" (it said
  "10 widgets"). `lib/nova/stage/as-stage-count.test.ts`.
- **D13 The speaking mark is three soft rings that fade outwards** (`nova-stage.tsx`, `command-centre.css`): the
  ticked rim (90 ticks, 8.4 wide) read as spikes. Static, shown by opacity alone, inside the bezel, as before.
- **D14 The planet's path in a narrow column** (`lib/nova/core/star-shader.ts`). A narrow column limits the orbit's
  width only. The squeezed orbit is now seen a little more from above (its own tilt, `TILT * ORBIT / orbit`), so its
  near and far passes keep the distance from the core they have on a wide stage and the planet no longer covers the
  core. On a wide stage (`uEdge` ≥ about 0.45) the picture is exactly as before; the still pictures are unchanged.
- **D15 D36: the star's first ask for WebGL runs in a worker; the content policy is unchanged.** The two asks that tell
  hardware from software drawing (`lib/nova/core/probe-ask.ts`) run in a small same-origin module worker with an
  OffscreenCanvas (`probe-worker.ts`, started by `probe.ts`); `worker-src 'self'` already allows the app's own workers,
  so no TIER 3 (CSP) commit was needed. The page answers where the browser has no worker canvas, where the worker
  fails, finds no WebGL or says nothing within 12 s. **Changed from the plan:** only the probe moved, not the drawing.
  Measured here before the change (dev build, 1920 × 1080 and 2560 × 1440, Showcase, the tests' Chromium): the asks take
  5 to 13 ms on the page and in a worker, the shader's compile and link under 30 ms, the first read-back about 200 ms;
  the six-second task ADR-041 D36 measured does not occur in this sandbox today, with or without graphics switches.
  Moving the whole draw loop would have been a rewrite of the star's loss, proof and pace handling with nothing here to
  measure it against. If the runner still shows the opening held by the star, the cause is not the first ask, and that
  is the next thing to measure there. Read from CI on the final head.
- **D16 D34, first attempt: a still star is drawn once per picture.** Under Motion Off, reduced motion and in a hidden
  tab the star drew its still frame again on every wake: the battery read again, the probe's answer, a tab shown again.
  The frame is kept in the canvas, so a wake that changes nothing the frame shows (`starStillKey`: state, accent, size,
  edge, layout, renderer, density) now draws nothing; an unproven frame is still drawn and read back again. On a phone
  with reduced motion the star draws one frame where it drew two. The spec is unchanged. Whether this was D34's
  trigger ("two frames became four with no size changed") is read from repeated runs under two workers on the
  production build and from CI.

### After the switch to Opus (18 Nov)
- **D17 Six answers outside the corpus, made right at their cause** (`6118cfcf`; the corpus grew to 629 phrasings):
  calories or protein over several days (the stage showed the Health HUD's figures for today); "did I spend more than
  last month" (it compared last month with the month before: one period named after "than", "vs" or "dan" is now the one
  compared against); "boodschappen" (the older layer said nothing was spent: a category is now read by the money log's
  own words in either language); net worth "this year" (read as a goal's name; now today's figure, saying that the river
  shows how it moved, because answers do not read the history); "on how many days did I walk" (it gave steps); "why did
  I sleep so little last week" (a guessed closest question, different on ZIGi and NOVA; now D3's honest line in both
  languages). "per" and "week" no longer count as Dutch. Each new claim was narrowed until every older suite passed
  unchanged: where the older answer was already right (budgets over plan, protein yesterday, an average, "how many
  times", English categories) it keeps its words. The stage's sentence cutter also skipped every word before a figure
  with a decimal point ("weight 73.48 kg"): fixed and pinned.
- **D18 Every kind fits its panel** (`1b15e421`). Measured over all 64 kinds on the stage at three widths, 23 pushed
  text (mostly the source and as-of) out of hero and supporting panels. `AxBody` now measures its content against its
  panel (one resize observer; no timer, no animation) and hands the excess to every instrument's height budget
  (`--ax-over`); what still does not fit lets the optional parts step aside (keys, chips, notes, fact rows the table
  repeats), then the instrument, so a small panel shows the answer's figure, label, source and as-of (its compact form;
  the table keeps every fact). Names wrap instead of being cut; fifteen titles were shortened to fit the frame's head.
  Result: no text outside its panel and none cut at 2560 × 1440, 1440 × 900 or 390 × 844.
- **D19 Figures that agree with their answers** (checked by eye against the answers' words): a log's calendar counted
  days with nothing logged as below its target; the journal map left today's entry out of its figure; the focus gauge
  showed this week for "did I focus today" (it now follows the answer's period); the goal gauge said "reached" beside
  42 %; the health scan said "4 of 4 measures" while the heart rate was not recorded; the net worth river's recorded
  value now says "recorded", and a plain net worth question leads with today's figure. Each is pinned in a unit test.
- **D20 Carried: the goals lookup leaves out average goals.** The Goals page and its HUD count two "average" goals of
  the Showcase (a daily time and a sleep average) beside the five money goals, so the goal orbits say 7 active goals
  where an answer from the goals lookup says 5. The lookup (`list_goals`) predates this session and reads the goal
  summaries only; widening it is a change to an AI tool's data for the owner to decide (it would be TIER 3).

- **D21 The fresh-critic round** (one read-only critic, all 64 kinds at 2560 and 1440, 21 findings; `da6e6e28`).
  Fixed: the spending radar not drawn (its width resolved to 0); the health scan's cards over its foot; skipped days
  counted as due in habit-done-days; "0 days" beside "reached" in water-days; calendar keys missing at M (a lit cell
  means missed in one kind and done in another); the calendar sweep over the day numbers; "longest run ended" on a run
  still going; a year's month names run together; budget gauges without names; the grid's cut mark left on panels the
  fit check had made fit (a dimmed foot). **Carried, with their causes:**
  1. Bill timeline and goal dates at 2560 draw four markers and list three names: the legends' older height caps
     (`money.css`, `.axm-legend > li:nth-child(n+…)`) hide rows without a "+N more"; each table lists all four.
  2. Trend lines join the logged days across days with nothing logged (sleep 27 of 30 nights, weight 8 of 30 days);
     the line is the kit's shared trend (`components/nova/cards/kit.tsx`), and the foot says how many days are logged.
  3. Best streaks in a 280 px panel break six habit names between syllables (two attempts: cut, then run together).
  4. The life radar scales each spoke to the larger of now and before, so one task reaches as far as 11 of 11 habits;
     the period before is drawn dashed and stated in the table and the key, not beside each spoke.
  5. The net worth river's band thickness is scaled between the period's lowest and highest, which enlarges an 8.5 %
     rise; its figures and the table state the values.
  6. "Book the dentist" (due today at 10:30, now past) counts as overdue, so the task widgets say "0 due today" beside
     it; the tasks page's own rule.
  7. Meditation days (Health's meditation sessions) light today while the habit Meditate is still open: two records
     the person keeps apart; each widget names its source.
  8. Late-night snacks is a quit habit; its slips read as "missed", the Habits page's own word for a failed day.
  9. The trends at 1440 squeeze their words beside the figure and their low and high labels sit under the markers;
     the focus gauge's arc has no stated scale (it is this period against the one before, both named in its words).
  10. The goals lookup leaves out average goals (D20).

## Tests changed (deliberate; none weakened)
Each carries "Session AS (<id>, deliberate)" with an equally strict replacement.
- `lib/ai/local-answers/ai-session.test.ts` **RR-13** ("Which habits did I miss yesterday?"): the exact sentence, the
  missed habit named, and the lookup's facts (`count`, the habit, its missed day); ZIGi and NOVA.
- `lib/ai/local-answers/nova.test.ts` **LA-021** ("Do I have overdue tasks?"): overdue by the Tasks page's one rule (the
  day and, today, the time): at 19:00 the task due at 18:00 is overdue; the older answer compared days only. **N4** ("How
  much did I focus this week?"): this week, not the last seven days; the seven-day answer stays on the question that
  asks for seven days.
- `lib/ai/local-answers/no-model.test.ts` (the Dutch introduction): with no model a Dutch question is now answered in
  Dutch from the records; a Dutch question the device cannot answer keeps the Dutch introduction and the examples.
  `localAnswer` itself still says none for these (the golden pins `nl-question`, `x-nl-whole`, `x-nl-sleep` are untouched).
- `lib/nova/summon/lines.test.ts` **AM-D3** ("Did I journal this month?"): the device answers it, and the answer's own
  widget is made beside it.
- `lib/ai/tools/hand-off.test.ts`, `lib/ai/tools/tools.test.ts`: `life_facts` in the surface list and its sample arguments.
No golden set, eval corpus or older pinned answer was changed beyond these.

## The corpus, per pillar
`apps/web/lib/ai/evals/as/`: 135 questions people ask, in 629 phrasings (English and Dutch, typos and casual forms),
each on the Showcase of 17 November 2026 and on a fresh profile. `expected.json` holds every lead answer as a literal
(the sentence in both languages, the lookup's facts, the widgets, the empty-state answers); `says.ts` holds, written by
hand, the facts every phrasing must state; `oracle.test.ts` recomputes the key facts from the raw stored records with
plain loops (no page engine, no exact layer). Result on the head that carries this entry:

| Pillar | Phrasings passing |
|---|---|
| Habits | 157 of 157 |
| Health | 173 of 173 |
| Wealth | 115 of 115 |
| Goals | 34 of 34 |
| Tasks | 38 of 38 |
| Journal | 27 of 27 |
| Notes | 4 of 4 |
| Agenda | 13 of 13 |
| Checklist | 4 of 4 |
| Focus | 29 of 29 |
| NOVA itself, "how am I doing", why and unknown | 35 of 35 |

Every lead answer was read against the Showcase's records before the file was committed; that reading found and fixed,
among others: a habit whose name holds "late" read as a late question; "which days did I not meditate" answered with the
days it was done; a day with nothing logged counted as below the water target; Dutch amount questions turned into log
cards by the older no-model path; "how is my health" answered as a goal called health. After the model switch, questions
outside the corpus found six more (D17); each was fixed and added (611 → 629 phrasings).

## The widget families
64 answer kinds in 17 visual families (Part 2). Each kind is a catalogue entry (`lib/nova/widgets/catalog-as*.ts`,
`made`, its pillar's gate), a flat body in `components/nova/widgets/<id>.tsx` (lazy in `widget-grid.tsx` `BODIES`), its
selector in `lib/nova/cards/ax/` and its stage line (`lib/nova/summon/ax-lines*.ts`). Every kind is drawn at S, M and L
on the Showcase and on a fresh profile by `lib/nova/widgets/ax-bodies-dom.test.ts`, and was measured on the stage at
2560 × 1440, 1440 × 900 and a 390 px phone (D18) and looked at against its answer's words (D19).

| # | Family | Kinds | Made by an answer such as |
|---|---|---|---|
| 1 | Month calendars | habit-missed-days, habit-done-days, habits-month, water-days, steps-days, sleep-nights, workout-days, meditation-days, protein-days, spending-days, bill-calendar, tasks-calendar, journal-map, mood-map (Health switches) | "wgat days did i forget to meditate this month" |
| 2 | Ranked bars | habit-misses, spending-ranks, income-ranks, debt-ranks, task-overdue | "how many habits did I miss this week" |
| 3 | Scanners | health-scan (decorative heart, A2), body-scan, day-scan | "how is my health" |
| 4 | Trends | weight-trend, sleep-trend, steps-trend, heart-trend, calorie-trend | "is my weight going down" |
| 5 | Gauges and dials | nutrition-gauges, budget-gauges, goal-gauge, savings-rate, focus-gauge, bill-dial, task-load | "what is my next bill" |
| 6 | Flames | streak-flames, best-streaks, journal-streak, focus-streak | "what is my journal streak" |
| 7 | Heat maps | steps-heat, spending-heat, focus-heat, habit-year | spending over more than 45 days |
| 8 | Twins (compare) | health-compare, spending-compare, compare-periods | "water this week vs last week" |
| 9 | Stage bars | sleep-stages, sleep-times, fasting-windows | (gallery) |
| 10 | Timelines | bill-timeline, task-timeline, day-timeline, goal-dates | "which tasks are overdue" |
| 11 | Radars | spending-radar, life-radar (facts beside the person's own past, no score, A3) | "how am I doing this week" |
| 12 | Rivers | cash-river, net-worth-river | "how much did I earn this month" |
| 13 | Orbits | goal-orbits, checklist-orbit | "which goals are behind" |
| 14 | Lattices | habits-lattice, habit-weekdays | "on which weekday do I miss habits most" |
| 15 | Vessels | water-week, savings-jars | "how much water did I drink this week" |
| 16 | Constellation | notes-constellation | "how many notes do I have" |
| 17 | NOVA itself | nova-answers (no gate: it reads nothing of the person's) | "what can you answer" |

The corpus's questions make 38 of the 64 kinds; the others are made by questions outside it (each answer asks for its
own kind where one exists, `0a6b12de`) or pinned from the gallery. Gallery only, because no answer reads their records:
body-scan, mood-map, debt-ranks, sleep-stages, sleep-times, fasting-windows.
