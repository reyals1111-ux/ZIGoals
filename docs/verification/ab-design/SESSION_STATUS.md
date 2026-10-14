# Session AB-Design — status and resume point

Kept current after every finished part (owner's rule). The PR description carries the same "Resume here" block.
Paths: repository `~/Documents/ZIGoals-Claude` (branch `feature/session-ab-design`), screens worktree
`~/Documents/ZIGoals-Claude-ab-screens` (orphan `review/session-ab-design-screens`), scratchpad
`/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/4c847f6a-9e55-47fa-ac40-bed4f043d9c3/scratchpad`
(`env.sh` selects Node 24.19.0 through fnm; `capture.mjs`; `logs/`). Servers: `main`'s build on `:3103`, this branch's
production build on `:3104`.

## Resume here (checkpoint 2026-10-15 00:30, after the night's crash)
**State.** Phase 2 parts 0–14 and closing-pass items 1–6 are built and pushed (head `9cc176e2` plus the recovered fixes
committed from this checkpoint on). CI: web-checks, web-integration and the new `web-alpha-gate` job (the Workers security
gate) green on `9cc176e2`; open there: today-screens (fixed by the phone footer, to confirm), run9-2-life at 320 (fixed in
the spec, the visible root), WebKit (webkit-smoke's ResizeObserver loop: the nav observer now measures on the next frame;
zigi-part-boundary: the S64 prefetch filter; the rotating ZIGi flakes: to reproduce under 2-worker load).
**Running / next.** c12 (`scratchpad/pipeline-c12.sh`, log `logs/pipeline-c12.log`): rebuild on :3104 → targeted Chrome
specs → the full WebKit set (2 workers) → the four layout audits (stress, WebKit, touch, Chrome). Then: fix what they find;
Gate C (final captures into the gallery + the proof table's Gate C column, full unit, full browser suite once with 2
workers, WebKit phone set, weights, revert gate, design critique), CI fully green on the final head, the STATUS entry as
the final commit, PR #86 Ready for review.
**Rules for the finish (owner).** today-screens ≤ 5.8 / Showcase ≤ 11.5 by layout only; no ceiling or budget raised; CI
aggregate fully green with the security gate in its own job; a WebKit flake that also failed on AB-Cloud's pre-merge run
and does not reproduce locally under 2-worker load is recorded with evidence, not looped on.
**Keep-awake.** `nohup caffeinate -ims &` (never -d). Servers only from Bash (nohup, 3102–3104).

## Earlier resume point (2026-10-14; Phase 2 on Opus 5.5)
Phase 1 is complete (STATUS entry). Phase 2 ("Finish everything, nothing half done"): Parts 0–13 are built (ADR-024 P1–P20;
Part 12, the second merger with AB-Cloud's PR #85, is in as a merge commit); Part 14 (the phone/tablet sweep), then the
owner's **closing pass**, then Gate C remain. Scratchpad tools: `states.mjs` (named states × widths), `chain-part.sh`
(lint → typecheck → unit → build on :3104 → specs), `serve-prod.sh`, `start-dev.sh` (:3102).
**Owner's closing pass (2026-10-14, after every part, before Gate C):** (1) rings at the source — number and "%" always inside
the inner circle at every size (1–3 digits, 100 %), then every ring in the app; (2) an automated layout audit (every route,
state, dialog and sheet; Showcase and an empty device; 320/390/430/768/1024/1280/1440/1920 Chrome + 390 WebKit): horizontal
scroll, overflow/clipping, overlaps, wrapped numbers, ring labels, targets < 44 px, axe contrast — fix all, commit the clean
report to docs/verification/ab-design/; (3) stress states (40+ character names, US$1,234,567,890.12 and €, 4-digit
counters, 0/100 %, empty/one/many, loading, errors, offline); (4) the 4-in-1 consistency review page by page, listed and
fixed; (5) interaction states (hover, focus, pressed, disabled, keyboard order, reduced motion/Motion Off, dialogs' focus);
(6) a final read-only design-critique agent over fresh 390/1440 captures, everything fixed, re-captured. Record it in
ADR-024 "Closing pass", the gallery and the proof table; then Gate C, STATUS, PR Ready.
Owner items: Inter (D1).

## Done
- Part 0: docs scaffold; before-captures.

## Open
- Parts 1–8 and the gates; see ADR-024 and `docs/product/OWNER_UI_REQUESTS_AB.md`.
