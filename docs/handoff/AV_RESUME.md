# Session AV — resume file ("ALPHA QUALITY")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-au-dress-rehearsal` (PR #108 "Session AU + AV", Draft). Rules: CLAUDE.md, the owner's brief and
`docs/architecture/ADR-045-session-av.md` (the plan and the owner's approval with nine amendments, verbatim).
Order (amendment 7): 0 → 1 → 2 → 3 → 5 → 4 → 4b → 6 → 8 (first pass) → 7 → 8 (final pass) → end.
Parts 1–6 and the first pass of 8 green and pushed before Part 7. A Part 7 feature not finished is not wired in.

**Safe to merge now: no (Part 0 only; last CI run 1925 on `3ea87dff` had main shards 2 and 12 red).**

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz`), its `bin` first
  on PATH; `corepack enable pnpm`; `pnpm install --frozen-lockfile --ignore-scripts`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build` (about 1.5 min), then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`,
  at most 2 workers, one run at a time.

## Done
- Part 0: ADR-045, this file, STATUS stub.

## In progress
- Part 1 (CI): D36, D34, dashboard-visual:11 mobile, account-browser stall.

## Next
- Part 2 (TIER 3 PWA), Part 3, Part 5, Part 4, Part 4b, Part 6, Part 8 first pass, Part 7, Part 8 final.
