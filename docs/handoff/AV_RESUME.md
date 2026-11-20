# Session AV — resume file ("ALPHA QUALITY")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-au-dress-rehearsal` (PR #108 "Session AU + AV", Draft). Rules: CLAUDE.md, the owner's brief and
`docs/architecture/ADR-045-session-av.md` (the plan and the owner's approval with nine amendments, verbatim).
Order (amendment 7): 0 → 1 → 2 → 3 → 5 → 4 → 4b → 6 → 8 (first pass) → 7 → 8 (final pass) → end.
Parts 1–6 and the first pass of 8 green and pushed before Part 7. A Part 7 feature not finished is not wired in.

**Safe to merge now: no (Parts 0–5 and most of 4 pushed; CI on the new head not read yet. Run 1929 on `dadb7c23`: every browser shard green, the weight check red — fixed in `bc0ca218`).**

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz`), its `bin` first
  on PATH; `corepack enable pnpm`; `pnpm install --frozen-lockfile --ignore-scripts`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build` (about 1.5 min), then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`,
  at most 2 workers, one run at a time.

## Done
- Parts 0–6 and Part 8's first pass pushed (`943b4464`); see ADR-045's closing table. Part 4b audit: UNFINISHED.md.
- Part 7: COMPETITORS.md; F-PROMPT `cadae4e8`, F-YEAR `3d2d12ce` (committed; pushed after CI 1932 is read).
- Two real builds proof re-run on the final recovery: 10 of 10.

## In progress
- Read CI 1932 (`943b4464`); then push Part 7 and the final docs; read the run on the final head.

## Next
- If time: the next shortlisted features from COMPETITORS.md, each complete or not wired.
- END: STATUS entry as the final commit; PR body; report ≤ 12 lines.
