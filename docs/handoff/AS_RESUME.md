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
- **In progress:** Part 2 (widgets). Not started in code. An exact answer already asks the stage for its own widget
  kinds by name with a stand-in (`habit-missed-days` → `habit-week`, `habit-misses` → `habit-week`, `health-scan` →
  `health-hud`, …): adding a kind to `lib/nova/widgets/catalog.ts` and `components/nova/widget-grid.tsx` `BODIES` makes
  it appear with no engine change. The names the engine asks for: grep `fallback:` in `lib/ai/local-answers/exact/`.
- **Next (the owner's order, A4):** (1) the answer kit `components/nova/cards/ax-kit.tsx` + `ax.css`; (2) month calendars:
  `habit-missed-days`, `habit-done-days`, `habits-month`; (3) ranked miss bars: `habit-misses`; then scanners
  (`health-scan`, heart decorative per A2), trends, gauges, flames, calendars of other pillars, the rest.
- **How to run the corpus:** `pnpm exec vitest run apps/web/lib/ai/evals/as` (from the repository root). After a change of
  an answer's words: `AS_WRITE=1 AS_REPORT=1 pnpm exec vitest run apps/web/lib/ai/evals/as/corpus.test.ts --silent=false`,
  then read the diff of `expected.json` line by line before committing it.
- **Typecheck here needs memory:** `NODE_OPTIONS=--max-old-space-size=6144 pnpm exec tsc --noEmit -p .` in `apps/web`.
