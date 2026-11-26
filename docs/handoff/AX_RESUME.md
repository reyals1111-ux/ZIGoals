# Session AX — resume file ("PROFESSIONAL REVIEW & POLISH")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-ax-pro-review` from `main` `36bd987f` (PR #110 merged), Draft PR "Session AX — Professional review &
polish". Rules: CLAUDE.md, the owner's brief, the plan and the approval, all verbatim in
`docs/architecture/ADR-047-session-ax.md`.

**Safe to merge now: no (no CI run on this branch yet).**

## Done
- Part 0 started: branch, ADR-047 with the brief verbatim, this file.

## In progress
- Part 0: the plan for the owner's approval (plan mode, once).

## Next
- After approval: Part 1 (heavy profile, then the six reviewers), Part 3 (owner decisions), Part 2 by severity.

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`node-v24.19.0-linux-x64/bin` first on PATH); `corepack enable pnpm`;
  `pnpm install --frozen-lockfile --ignore-scripts`. Typecheck and build need `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`
  (the sandbox's Playwright Chromium), at most 2 workers, one browser run at a time (`flock` on the scratchpad's
  `browser.lock`).
