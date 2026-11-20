# Session AV — resume file ("ALPHA QUALITY")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-au-dress-rehearsal` (PR #108 "Session AU + AV", Draft). Rules: CLAUDE.md, the owner's brief and
`docs/architecture/ADR-045-session-av.md` (the plan and the owner's approval with nine amendments, verbatim).
Order (amendment 7): 0 → 1 → 2 → 3 → 5 → 4 → 4b → 6 → 8 (first pass) → 7 → 8 (final pass) → end.
Parts 1–6 and the first pass of 8 green and pushed before Part 7. A Part 7 feature not finished is not wired in.

**Safe to merge now: no — waiting for CI on `a2adb214` (run 1932 on `943b4464`: 22 of 25 green; the three reds are fixed or recorded in `a2adb214`: WebKit zigi-alive (the launcher chunk now fetched as the shell runs), nutrition-import's build-hash false positive, the known sync-offer intermittent).**

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz`), its `bin` first
  on PATH; `corepack enable pnpm`; `pnpm install --frozen-lockfile --ignore-scripts`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build` (about 1.5 min), then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`,
  at most 2 workers, one run at a time.

## Done
- Parts 0–6 and Part 8's first pass pushed (`943b4464`); see ADR-045's closing table. Part 4b audit: UNFINISHED.md.
- Part 7: COMPETITORS.md; F-PROMPT `cadae4e8`, F-YEAR `3d2d12ce` (pushed).
- Two real builds proof re-run on the final recovery: 10 of 10.

## In progress
- CI on `a2adb214` (Part 7 and the CI 1932 fixes pushed). Then the STATUS entry as the final commit and its run.

## Next
- If time: the next shortlisted features from COMPETITORS.md, each complete or not wired.
- END: STATUS entry as the final commit; PR body; report ≤ 12 lines.
