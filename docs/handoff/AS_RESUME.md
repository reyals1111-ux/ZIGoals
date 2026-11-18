# Session AS — resume file ("NOVA ANSWERS EVERYTHING")

Read this first after a pause or a model switch; continue from "Next" without asking. Branch
`feature/session-as-nova-answers` (from `main` `e6e92a8c`), one Draft PR. Rules: CLAUDE.md, the owner's brief, and
`docs/architecture/ADR-042-session-as.md` ("Owner decisions": approval items 1–7, additions A1–A4; "The plan as approved").

## Budget and stop rules (owner)
At most 4 helpers (short briefs); the corpus is unit tests; browser specs only one per new visual family plus the owner's
two questions; builds and browser runs one at a time (Playwright Chromium, at most 2 workers); one production build per
integration point; one fresh-critic round at the end on the new widget families (no loop); at most 2 fix attempts per
problem, then Carried with its cause; hard timeouts 15 min; CI polled at most every 10 minutes; push after each part and
at least every 30 minutes; never merge, enable auto-merge, dispatch or deploy. Session AT owns everything outside NOVA
(`package.json`, the lockfile, the workflows): do not touch those.

## Environment (cloud sandbox)
`export PATH=/opt/node24/bin:$PATH` (Node 24), `pnpm install --frozen-lockfile --ignore-scripts`. Chromium only
(`/opt/google/chrome/chrome`; WebGL is drawn by the processor). Fetch branches by name (`git fetch origin main`): a bare
`git fetch origin` hung here.

## Parts (order is the owner's, A4)
0. Records: ADR-042, this file, the STATUS stub — **done** (first commit).
1. Answers that are exactly right: `apps/web/lib/ai/local-answers/exact/` (understand → facts → say → widgets), wired into
   `localAnswer` for NOVA and ZIGi (A1), `life_facts` for a connected model (TIER 3), the corpus in
   `apps/web/lib/ai/evals/as/` (at least 400 questions, Showcase on 2026-11-17 UTC and a fresh profile).
2. Widgets, family by family, each shippable: month calendars → ranked miss bars → scanners → trends → gauges → flames →
   calendars of other pillars → the rest (ADR-042's table).
3. The NOVA name (wordmark).
4. Leftovers: D36 (the star off the main thread), D34, the planet, the speaking mark, "STAGE N WIDGETS".
5. Finish: critic round, production build, browser specs, weights, frozen readers, ADR-042, `AM_DEMO_TOUR.md`, STATUS
   (final commit), CI, the report.

## State (18 Nov)
- **Done:** Part 0. **Part 1 complete**: the exact layer (`apps/web/lib/ai/local-answers/exact/`), wired for ZIGi and NOVA,
  `life_facts` (TIER 3), the `period` widget parameter (TIER 3), the corpus (611 phrasings, all passing, with the oracle).
  ADR-042 D1–D9, "Tests changed", "The corpus, per pillar". Unit suites `apps/web/lib/ai` + `apps/web/lib/nova`: all pass.
- **Done too:** Part 2's first two families (`477d0304`, `c88bcec9`): the answer kit `components/nova/cards/ax/`
  (`kit.tsx`, `calendar.tsx`, `ranks.tsx`, `twins.tsx`, `ax.css`), the kinds `habit-missed-days`, `habit-done-days`,
  `habits-month`, `habit-misses` (bodies flat in `components/nova/widgets/<id>.tsx`, catalogue in
  `lib/nova/widgets/catalog-as*.ts`, stage lines in `lib/nova/summon/ax-lines*.ts`). **Part 3** (the wordmark,
  `55a548a4`). **Part 4**: the stage's count, the speaking rings, the planet's path (`9ac17914`), D36's
  probe in a worker (`677ee64e`), D34's first attempt (`df4e2a8b`: a still star draws once per picture).
- **Part 2 wired (`d0eeab44`, 18 Nov, after the switch to Opus):** the helpers stopped when the Fable allowance ran out;
  their work was saved (`f04f71b8`) and wired: **64 answer kinds** in the catalogue (4 Habits of families 1–2, 21
  Health, 18 Wealth and Goals, 21 day/habits/NOVA), each with its BODIES entry, drawn at S/M/L on the Showcase and a
  fresh profile by `lib/nova/widgets/ax-bodies-dom.test.ts`. NOVA + AI suites green, typecheck and lint clean.
- **Checked so far (18 Nov):** scanners (health scan "of 5", day scan labels fixed, `972c5778`) and trends (weight,
  sleep, steps match their answers). Answers now ask for their own kinds (`0a6b12de`: 38 of 64 kinds are made by corpus
  answers, the rest from the gallery; gallery-only by design: body scan, mood map, debt ranks, sleep stages and times,
  fasting windows, savings rate). Held-out answer errors fixed and added to the corpus (`6118cfcf`, 629 questions).
- **In progress:** gauges → flames → calendars of the other pillars → the rest (look in the browser with
  `scratchpad/fam.cjs`, which turns on NOVA's Health switches and ZIGi's Health sharing on the Showcase).
- **Next:** finish Part 2 (the count of kinds and families goes into ADR-042 "The widget families" as it is, not
  rounded up); then Part 5: one fresh-critic round on the new families, one production build, the browser specs
  (`tests/nova-answers-as.spec.ts`: the owner's two questions; `tests/nova-families-as.spec.ts`: one per family),
  D34's spec under two workers on that build (one more attempt allowed, else Carried), D36 read from CI, weights,
  frozen readers, ADR-042, `AM_DEMO_TOUR.md` (twenty questions), STATUS as the final commit, CI, the report.
- **Known here:** `next dev` stops once on a "security upgrade recommendation" notice; the same command again starts
  it. Nothing was upgraded (a dependency change is the owner's and Session AT's); it goes into the final report.
  Vitest runs from the repository root only (from `apps/web` it cannot parse `.tsx`). Keep heavy processes one at a
  time (a worker was killed with vitest and the dev server up together).
- **How to run the corpus:** `pnpm exec vitest run apps/web/lib/ai/evals/as` (from the repository root). After a change of
  an answer's words: `AS_WRITE=1 AS_REPORT=1 pnpm exec vitest run apps/web/lib/ai/evals/as/corpus.test.ts --silent=false`,
  then read the diff of `expected.json` line by line before committing it.
- **Typecheck here needs memory:** `NODE_OPTIONS=--max-old-space-size=6144 pnpm exec tsc --noEmit -p .` in `apps/web`.
