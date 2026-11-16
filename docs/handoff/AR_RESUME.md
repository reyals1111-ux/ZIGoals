# Session AR — resume file ("NOVA, COMPOSED")

Read this first after a pause; continue from "Next" without asking. Branch `feature/session-ar-nova-composed` (from `main`
`71066301`), one Draft PR. Rules: CLAUDE.md, the owner's brief and plan (ADR-041, "Owner decisions": P1–P4, S1–S4).

## Budget and stop rules (owner)
At most 4 helpers (short briefs); at most 3 critique rounds with two fresh critics each; at most 2 fix attempts a problem,
then Carried with its cause; builds and browser runs one at a time (Playwright Chromium, 2 workers); one production build
an integration point; hard timeouts 15 min; push after each part and at least every 30 minutes; never merge, deploy or
dispatch. The Opus follow-up list (AP's seven copy/visual minors, CSV Value/Unit, Someday counts, Today's 92 Tab stops on
Sunday evening, Zignaly "is closing" → "has closed" after 1 Dec, remaining CI intermittents) is not started here.

## Environment (cloud sandbox)
`export PATH=/opt/node24/bin:$PATH` (Node 24), `pnpm install --frozen-lockfile --ignore-scripts`. Chromium only
(`/opt/google/chrome/chrome` exists; WebGL is drawn by the processor). References: `git fetch origin review/session-am-refs`,
then `git archive origin/review/session-am-refs REFERENCES.md grok | tar -x -C <scratch>/refs`. Captures stay out of the repo.

## Parts
0. Records, frozen readers #55 and #56, ADR-041, this file — **done** (first commit).
1. The composition engine (`lib/nova/compose.ts`, `components/nova/widget-grid.tsx`, layout CSS, the star's size by fill).
2. Tiers in the widget bodies; the kinds with dead space.
3. The stand-in while the star starts and its honest line; round 7's real faults (1440 px, the console); the phone.
4. Critique, at most 3 rounds (captures: empty, two widgets, the full Showcase; 2560 × 1440, 1440 × 900, 390; Nebula, Light, Dark; star frames).
5. NOVA leftovers: fasting "up to 24 hours" in `lib/ai/context/builders.ts`; `nova-setup:157` on the phone; the two specs that fail only under two workers.
6. Outside NOVA: (a) checkboxes keep the tick at once; (b) "Your orbits" on Today (P1, TIER 3 stored format); (c) the priority matrix by mouse drag.
7. Finish: final build, suites, B2 at 2560 × 1440 Showcase, weights, ADR-041, `AM_DEMO_TOUR.md`, STATUS (final commit), CI, the report.

## State
Part 0 committed. **Next:** part 1.
