# Session AV — resume file ("ALPHA QUALITY")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-au-dress-rehearsal` (PR #108 "Session AU + AV", Draft). Rules: CLAUDE.md, the owner's brief and
`docs/architecture/ADR-045-session-av.md` (the plan, the approval with nine amendments, and **owner follow-up 1** of
21 Nov, all verbatim). Follow-up 1 order: CI → Part 4b open rows + owner triage (done) → Part 7 research in depth (done)
→ Part 7 build in rank order with no cap (in progress) → Part 8 final pass → END. "pause for release" from the owner:
finish or unwire the current feature, push, get CI green, write "Safe to merge now: yes (CI run N)", push nothing until
"continue". After PR #108 merges: `feature/session-av-2` from the new main, Draft PR "Session AV (continued)".

**Safe to merge now: yes at `7e664056` (CI run 1938). No later head is safe until its own run: run 1941 found A10-11 (fixed at `967ab614`) and the checks reds of D-CI1941 (fixed at `7f01e6d5`, `a2deeed5`).**

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`node-v24.19.0-linux-x64/bin` first on PATH); `corepack enable pnpm`;
  `pnpm install --frozen-lockfile --ignore-scripts`. Typecheck and build need `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101` (3100 for the integration tests);
  Chromium at `/opt/google/chrome/chrome`, at most 2 workers, one run at a time.
- A CSS change needs `node scripts/themes/build-themes.mjs` (then `--check`). New specs go in shard 2's list.

## Done (follow-up 1)
- Part 4b: all 14 open rows finished (`7e664056`, `3479961a` TIER 3 PWA PK-3, `8808d0e1`); 38 rows in UNFINISHED.md
  "Owner decisions"; CR-17 and CR-20 decided with the rules' default.
- Part 7 research: COMPETITORS.md from the web, 25 apps, 435 rows, depth-checked, re-ranked build order (`d6ccb797`).
- Part 7 build: #5 task notifications (`9a0cf6f5`, TIER 3 PWA), #1 Dutch task line (`dd931b8e`), #3 three good things
  (`7795263f`), Help (`cbf1e8f4`), #11 journal tags (`1f67dbc9`), #6 tasks done per day/week (`f4595af6`), Help
  (`db0eb6d9`). #4 (save a meal, copy a day) verified already built (Health → Planning).

## In progress
- Built since: #7 vs last month (`4c0b99ef`), #9 every factor, #8 budget targets (TIER 3), #12 bill calendar, #13
  workouts by week, #10 the review's tasks, #15 running bests, #16 income flow; B: deadlines (`8e63c167` TIER 3 stored,
  `4408d1d6` TIER 3 AI), the debt planner's own order, one-off payments, month by month, countdown, tracked plan
  (`TIER 3` stored and AI commits up to `34975169`). Build order A and B are done.
- Next: C, the 33 new rows of COMPETITORS.md in rank order (17 onward).

## Next
- Read CI at part boundaries (≤ every 10 min); record reds in ADR-045 (D-CI*) and CI_INTERMITTENTS.
- END only when every item is built or Carried with a real cause: ADR-045 closing table (matrix summary, audit
  counts), STATUS entry as the final commit, report ≤ 12 lines.
