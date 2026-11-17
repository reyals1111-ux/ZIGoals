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

## State (17 Nov, early; keep current)
**Done and pushed:** part 0; part 1 (`lib/nova/compose.ts` + 12 unit tests, the grid, the star's plan and its one motion,
`tests/nova-compose-ar.spec.ts` 7/7 on the dev server); part 3a (the stand-in and the honest line, 5 DOM tests); part 3b
(the status strip, the read-out's amounts and dates, the 112 px unit); the fasting note (TIER 3 AI safety); 6a (H1,
`e7ad44f7`); 6b and 6c (H2: `b64a6d6b`, `3a77965c`, `f66a3d53` TIER 3 stored format, `d1c751c8`). ADR-041 D1–D18.
The whole unit suite: 11,668 passed; 3 failed, none this branch's (`scripts/pre-run11-setup.test.mjs` ×2 wants Node
24.19.0 and this sandbox has 24.22.1; `scripts/run11/food-fdc.test.mjs` timing under load, passes alone).

**In work (helpers, own worktrees under `.claude/worktrees/`, each commits there; cherry-pick their commits, skip their
theme-sheet commits and regenerate):** H3 = tiers in the on-request kinds (`cards/kit.tsx`, `cards/*.css`), dev server
3230; H4 = tiers in the HUD kinds (`holo/parts.tsx`, `holo/holo-parts.css`, `widgets/widgets.css`), dev server 3240.
All four helpers of the budget are used.

**Next, in this order:** (1) integrate H3 and H4, regenerate theme sheets, type-check, `pnpm exec vitest run apps/web/lib/nova`
from the repo root. (2) One production build (`NODE_OPTIONS=--max-old-space-size=8192 NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`,
`pnpm --filter @zigoals/web start`), then: `nova-compose-ar`, `tests/grok53/hud`, `nova-stage-am`, `nova-stage-am2`,
`nova-dashboard`, `p3-nova-polish`, `nova-chat`, `nova-wa`, `nova-workflows`, `nova-setup`, the contrast walk and theme
parity (desktop, then `--project=mobile`), `ar-tick-at-once`, `ar-today-orbits`, `ar-matrix-drag`, `ao/today-tab-stops`,
`showcase-today-aa`; weights (`node scripts/check-weight-budget.mjs http://127.0.0.1:3100`). Browser runs go through
`flock /tmp/zg-browser.lock`. (3) Critique round 1: captures with `<scratch>/tools/cap.mjs` (empty profile, two widgets,
four, the full Showcase; 2560 × 1440, 1440 × 900, 390; Nebula, Light, Dark; star states with `--hold`), two fresh
critics shown only `<scratch>/refs` and the captures; scores into ADR-041's table; at most three rounds. (4) The two
specs that fail only under two workers (`nova-stage-am2` keys at 1024 px, `hud-motion` reduced motion on a phone) and
`nova-setup:157` on the phone (passes on the dev server here): find the cause on the production build, two attempts.
(5) The band's fade while scrolled (round 7), the phone chat's footer. (6) B2 at 2560 × 1440 Showcase on the final build,
ADR-041's tables, `AM_DEMO_TOUR.md`, STATUS as the final commit, CI, the report.

**For the Opus follow-up (found here, not started):** `next dev` prints an upgrade notice for a Next.js security
advisory (a dependency change: the owner's call); `tests/ao/today-tab-stops.spec.ts` counted 91 against its pin of 90 on
a dev server on 17 Nov (also without this branch's Today change: the weekly review's "Start review | Skip this week");
`showcase-today-aa` "arranging Today" fails on `main` too (`#for-you-life-review` not found).

## Scratchpad tools (recreate if the container was replaced)
`cap.mjs`: `--out --w --h --showcase --nova '<record>' --theme light|dark --ask "…" --click <selector> --hold <state> --live --phone --motion off --reduced --eval <js> --clip x,y,w,h --block/--delay <url part>`.
With `--showcase` the Showcase's records live in sessionStorage under `zigoals:showcase:v1:<id>:`; `--nova` writes there.
