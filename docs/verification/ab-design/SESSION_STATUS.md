# Session AB-Design — status and resume point

Kept current after every finished part (owner's rule). The PR description carries the same "Resume here" block.
Paths: repository `~/Documents/ZIGoals-Claude` (branch `feature/session-ab-design`), screens worktree
`~/Documents/ZIGoals-Claude-ab-screens` (orphan `review/session-ab-design-screens`), scratchpad
`/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/4c847f6a-9e55-47fa-ac40-bed4f043d9c3/scratchpad`
(`env.sh` selects Node 24.19.0 through fnm; `capture.mjs`; `logs/`). Servers: `main`'s build on `:3103`, this branch's
production build on `:3104`.

## Resume here (2026-10-14; Phase 2 under way on Opus 5.5)
Phase 1 is complete (STATUS entry). Phase 2 (owner follow-up "Finish everything, nothing half done") runs Parts 0–14 and a
full Gate C; PR #86 is back to Draft. Part 0: the proof table at the end of `docs/product/OWNER_UI_REQUESTS_AB.md`
(every request's sub-points, before-captures in `review/session-ab-design-screens` `phase-2/before/`). Scratchpad:
`states.mjs` (named states × widths, `node states.mjs <base> <out> [regex] [chrome|webkit]`), `serve-prod.sh` (build +
:3104), `start-dev.sh` (:3102). Part 12 (the second merger) waits: AB-Cloud's PR #85 is ready for review, not merged.
Owner items: Inter (D1); Part 12 once #85 is merged.

## Done
- Part 0: docs scaffold; before-captures.

## Open
- Parts 1–8 and the gates; see ADR-024 and `docs/product/OWNER_UI_REQUESTS_AB.md`.
