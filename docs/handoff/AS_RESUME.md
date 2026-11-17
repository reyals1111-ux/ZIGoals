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

## State
- **Done:** Part 0.
- **In progress:** Part 1 (not started in code).
- **Next:** `lib/ai/local-answers/exact/understand.ts`, then the Habits facts (the owner's two questions first).
