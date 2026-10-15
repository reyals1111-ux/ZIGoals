# Session AB-Design — status and resume point

Kept current after every finished part (owner's rule). The PR description carries the same "Resume here" block.
Paths: repository `~/Documents/ZIGoals-Claude` (branch `feature/session-ab-design`), screens worktree
`~/Documents/ZIGoals-Claude-ab-screens` (orphan `review/session-ab-design-screens`), scratchpad
`/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/4c847f6a-9e55-47fa-ac40-bed4f043d9c3/scratchpad`
(`env.sh` selects Node 24.19.0 through fnm; `capture.mjs`; `logs/`). Servers: `main`'s build on `:3103`, this branch's
production build on `:3104`.

## Resume here (checkpoint 2026-10-15 06:30, Gate C under way)
**Since 05:00.** Critique round 2 fixed (ADR-024 "Gate C design critique, round 2"); today-screens' hour dependence fixed
by layout (max 11.424 over the day, ceilings unchanged); Habit stacks and Routines load with the page (the keyboard
walk's "All" shift); the sleep button's contrast intermittent under investigation (`scratchpad/bed-probe.mjs`).
Focused Chrome + WebKit specs on :3104 (`chain-gatec9.sh`, `logs/specs-gatec9*.log`).

## Checkpoint 2026-10-15 05:00
**State.** Head `0179533f`. CI on `b39b16d2`: Milestone quality and Canonical reproducibility fully green (four browser
shards, both WebKit shards, the Alpha gate, `web`); `0179533f`'s run in progress.
**Gate C so far (on `b39b16d2`/`0179533f`, production builds on :3104).** Full unit 558 files / 4,891 tests (+ components
4,896), 0 failed. Full browser suite once, 2 workers: 2,132 passed, 0 failed, 560 skipped (56.4 min). The four layout
audits on `2879a361`'s build: no findings (Chrome 320–1920, stress, touch 768/1024, WebKit 390); later commits are CSS
fixes checked by recaptures and focused runs. Weights: every page under budget, none raised (Today 514.5 of 515 kB).
Key scans clean. Captures: `phase-2/after/` re-shot from `0179533f`, proof table's Gate C column filled; gallery
pushed (`d8f1721a`). Design critique round 1 (1440, 57 files): 15 findings, 10 fixed, 5 judged (ADR-024 "Gate C design
critique"); round 2 (390 in two halves, the other 32 desktop files plus a re-check) running as three read-only agents.
Revert gate running in `scratchpad/wt14` (`scratchpad/revert-gate.sh`, `logs/revert-gate.tsv`).
**Next.** Round-2 critique fixes → focused specs → re-capture what changed → final audits on the final head → commit the
audit reports → CI fully green → STATUS entry (final commit) → PR #86 Ready → short report.
**Rules for the finish (owner).** today-screens ≤ 5.8 / Showcase ≤ 11.5 by layout only; no ceiling or budget raised; CI
aggregate fully green with the security gate in its own job; a WebKit flake that also failed on AB-Cloud's pre-merge run
and does not reproduce locally under 2-worker load is recorded with evidence, not looped on.
**Keep-awake.** `caffeinate -dimsu` (with -d). Never stop a running caffeinate. Servers only from Bash (nohup, 3102–3104).

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
