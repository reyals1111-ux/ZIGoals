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

## State (17 Nov, 04:00 UTC: the session is complete)
Everything is committed and pushed; the last code head is `431a654a`, the STATUS entry follows it. Nothing was merged,
deployed or dispatched.
- **Done:** parts 0–7 (STATUS "Session AR" has the table). Three critique rounds: star 7 / 7 → 7 / 7.5 → 8 / 7, widgets
  6 / 6 → 7 / 7 → 6 / 7, stage 6 / 6 → 6 / 6 → 6.5 / 6. **The 10/10 bar is not reached.** ADR-041 D1–D35, its critique
  table, "B2 on the final build", "Before and after".
- **Carried:** `hud-motion` "reduced motion: the HUD is fully still (phone)" fails about 1 run in 8 under two workers
  (ADR-041 D34: two attempts made; the trigger of the two extra star frames is not found).
- **If CI is red on the final head:** read the run; a red NOVA spec is this branch's (at most two fix attempts, then
  record it); known here: D34 above, `p3-nova-polish` ND-1 at 1920 with the Showcase (D25), the Settings "On" button in
  the contrast walk under load, the Miniflare socket flake in `scripts/run11`. Add the reading under "CI on the final
  head" in STATUS as a commit of its own.
- **What a next session would do toward the bar** (not started): the long tail of kinds as supporting panels and
  plates (one real instrument each: Goal, Spending pace, Days until, Perfect days, Time, Templates, Money tags); the
  owner's call on D30 (the large star against 328 px wings at 1440); the planet's orbit in a narrow column; the
  speaking mark.

## Scratchpad tools (recreate if the container was replaced)
`cap.mjs`: `--out --w --h --showcase --nova '<record>' --theme light|dark --ask "…" --click <selector> --hold <state> --live --phone --motion off --reduced --eval <js> --clip x,y,w,h --block/--delay <url part>`.
With `--showcase` the Showcase's records live in sessionStorage under `zigoals:showcase:v1:<id>:`; `--nova` writes there.
