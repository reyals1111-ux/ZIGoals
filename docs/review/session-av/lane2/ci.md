# Lane 2 — CI stability (`lane2/ci`, owner follow-up 4, item 4d)

Measured against the lead's production build on :3101 (Chromium, CDP CPU throttling 4x, Showcase loaded, then
`/app/nova` at 1440 x 900; probes in the scratchpad `ci/`). The fixes are on this branch; the lead's build did not hold
them, so they were measured by serving the fitter's chunk with the same change ported in (service workers blocked so the
patched chunk is the one that runs). Nothing here changes how anything looks; no assertion, step or timeout changed.

## 1. D36 — NOVA's opening (`nova-stage-am2:301`, `p3-nova-polish:62`, `l7-fifth-answers:144`)

**Cause.** During the opening only the Habits HUD panel searches (its three streak rows do not all fit with the
"+N more" line), and it searched twice, then a third time: 7 `scrollHeight` reads of 110–360 ms, each a layout of the
whole page.
1. The first search measured the last line with no words (React writes them only with the answer): 3 px instead of
   23. The answer's render then changed the panel's size and the next frame searched again.
2. Each search asked "every row" a second time and checked its own answer once more after it.
3. `document.fonts.ready` was already settled (the fonts were in before the panel), and its `then()` forced a whole new
   search of a list just fitted with the same fonts.

**Fix** (`components/nova/cards/whole-rows.tsx`): the fitter writes the line's words for the counts it asks (the same
words the list renders); within one search each count is asked once; the fonts' arrival re-fits only when the last
measure came before it. Answers are unchanged (property test and all DOM tests as before).

**Measured** (4x CPU, three runs each, same method):

| | play phase (`data-opening=play` → `done`) | fitter's forced reads in the play |
|---|---|---|
| before | 6.5 s, 4.3 s, 5.8 s | 1.60 s, 0.45 s, 1.17 s |
| after | 3.9 s, 4.3 s, 3.6 s | 0.13 s, 0.19 s, 0.14 s |

What is left of the play beyond 2.1 s is React rendering the dashboard (long tasks of 0.9–1.2 s) and two other forced
layouts (the stage's `clientHeight`, the sky canvas' `getBoundingClientRect`), not the fitter.

Tests: `apps/web/lib/nova/cards/whole-rows-dom.test.ts` (three new cases; they fail on the old fitter: three rows where
two fit, 9 reads for 6, 17 for 7, 12 for 7).

## 2. D-SYNC — `scripts/run10/account-browser.test.mjs`, "L56 A: waist measurement"

**Read from run 2000's log (job 136988887300):** the measurement was never saved. The automatic sync came 1.04 s after
the meal (+7433 → +8470 ms), so its 1 s debounce was never re-armed by a save; no request after +8554 ms; no alert or
status on the page at the stall. A reset of the form's type to weight would have saved "80 kg" and synced again, so that
is not what happened. The step waited on a control that was gone, which fits the Health workspace being mounted again
under it: its view falls back to Diary (`health-app.tsx` keeps the view in component state), so "Measurement value" is
not there. A remount needs the store to show its loading or error view (`use-private-store.ts`: `loaded=false` only on
`zigoals:account-change`; an error from a failed re-read). No sender of an account change during an automatic sync was
found in the code (lock/unlock/adopt/activate are reached only from sign-in, unlock, a remembered reopen while locked,
an access denial, or the 15-minute idle lock).

**Carried** (third look; attempts 1 and 2 in ADR-045 D-SYNC and D-FU2-1b). Commit `0387a28a` (TIER 3 (CI), diagnostics
only): the panel timeline now records, on `/app/health`, the open Health view or the journal's loading state, and every
`zigoals:account-change` with its reason and the stack that sent it. The next sighting will name the cause.

## 3. `zigi-voice-z:199` (WebKit; `details#zigi-voice[open]` within 5 s)

**Measured** (Chromium 4x, two runs): body's loading line at 3.1 s, Voice card at 4.3–4.6 s, then open 150–165 ms
later. The open waited for a passive effect and one more render of the card.

**Fix** (`components/ai/ai-settings.tsx`, `useAnchoredCard`): the body renders only in the browser, so the card the
address names is open in its first render. Saves that ~160 ms (at 4x). The rest of the time is Settings' hydration, then
the lazy body, then the AI settings read (ADR-045 D-FU2-1b). Partly fixed: the card can still be late on a very slow
WebKit runner. Unit test `apps/web/lib/ai/anchored-card.test.ts`.

## Specs for the lead on the next build
- `tests/nova-stage-am2.spec.ts`, `tests/p3-nova-polish.spec.ts`, `tests/grok53/ai/l7-fifth-answers.spec.ts`; the
  panels' whole rows: `tests/grok53/hud/hud-fit.spec.ts`, `hud-perf.spec.ts`, `hud-motion.spec.ts`, `tests/ap/bento.spec.ts`,
  `tests/av-rows.spec.ts`, `tests/nova-wa.spec.ts`.
- `tests/zigi-voice-z.spec.ts` (WebKit and Chromium), `tests/zigi-settings-reserve.spec.ts`.
- Integration: `scripts/run10/account-browser.test.mjs` (diagnostics only; must stay green).

No stored-format change, no new key, no CSS change, nothing on Today.
