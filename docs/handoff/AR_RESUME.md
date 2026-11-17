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

## State (17 Nov, 02:00 UTC; keep current)
**Done and pushed (head `b5a0ff24` and after):** parts 0–3; part 2 by H3 and H4 (tiers in the bodies, `cards/tiers.css`,
the end of `holo/holo-parts.css`); round 1 of the critique (both critics: star 7, widgets 6, stage 6, "no"; ADR-041's
table) and its answer by structure (D19–D25): tier weights, stepped wings, the read-outs aside from three widgets, the
planet and the states, the engine (Large hero, short stage, locked rows, 328 px wings); the leftovers (fasting note
TIER 3; 6a; 6b TIER 3 stored format; 6c); `nova-setup:157` and `ar-matrix-drag` fixed at their causes; ADR-041 D1–D25;
`AM_DEMO_TOUR.md` section 2a. All four helpers of the budget are used.
**Browser suites on the first production build (`98d7f02d`, desktop, two workers):** run a 97 passed, 11 failed (all
answered since: nine by the engine or by deliberate spec changes, ND-7 by the console's re-measure, ND-1 at 1920 is
D25); `nova-stage-am2` 19 of 19 (the keys at 1024 px under two workers included); run c 36 passed, 2 failed (both fixed).
**Running now:** critique round 2 (captures `<scratch>/rounds/r2`, two new critics) and `suites.sh r2 desktop` on the
second production build.

**Next, in this order:** (1) round 2's scores into ADR-041; if a surface did not rise, change its structure, one more
build, round 3 (the last). (2) `suites.sh <tag> mobile` (the phone project: `hud-motion` reduced motion on a phone and
`nova-setup:157`), the contrast walk (`tests/a11y-wcag-x.spec.ts`), theme parity (`tests/theme-parity-af.spec.ts -g nova`),
`tests/p6-axe-surfaces.spec.ts -g -i nova`. (3) B2 at 2560 × 1440 Showcase on the final build (`hud-perf`, and
`<scratch>/tools/opening2.mjs` for long tasks), route weights. (4) ADR-041's "Before and after" and closing table,
STATUS as the final commit (parts, commits, evidence, CI, the Opus list), CI read, the report.

**For the Opus follow-up (found here, not started):** `next dev` and `next build` stop once on an upgrade notice for a
Next.js security advisory (a dependency change: the owner's call); `tests/ao/today-tab-stops.spec.ts` counted 91
against its pin of 90 on a dev server on 17 Nov (also without this branch's Today change); `showcase-today-aa`
"arranging Today" fails on `main` too; `p3-nova-polish` ND-1 at 1920 with the Showcase can lose a 5 s race to the
browser's first WebGL context without graphics hardware (D25); long-tail kinds as supporting panels at 1440 show a
figure and words without an instrument (Money tags, Templates, Debt plan, Day rules); `pre-run11-setup.test.mjs` wants
Node 24.19.0 exactly.

## Scratchpad tools (recreate if the container was replaced)
`cap.mjs`: `--out --w --h --showcase --nova '<record>' --theme light|dark --ask "…" --click <selector> --hold <state> --live --phone --motion off --reduced --eval <js> --clip x,y,w,h --block/--delay <url part>`.
With `--showcase` the Showcase's records live in sessionStorage under `zigoals:showcase:v1:<id>:`; `--nova` writes there.
