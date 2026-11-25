# Session AW — resume file ("FINISH LINE")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-aw-finish-line` from `main` `8fa8aa1d` (Alpha #59), Draft PR "Session AW — Finish line". Rules:
CLAUDE.md, the owner's brief, the plan and the approval, all verbatim in `docs/architecture/ADR-046-session-aw.md`.

**Safe to merge now: no — no CI run on this branch yet (Part 0 only).**

## Done
- Part 0: branch from `8fa8aa1d`; frozen readers #37–#59 (`scripts/frozen-readers.mjs`); ADR-046 with the brief
  verbatim; this file; STATUS Part 0 entry.

## In progress
- Reading the required documents; inventory of every row needing a verdict (scratchpad `inventory.md`); plan mode.

## Next
- Plan → owner approval (recorded verbatim in ADR-046) → Parts 1–8 in the approved order.

## Team
- Research helpers: row inventory (LEDGER round 7, Carried rows, UNFINISHED, QUALITY, FRIEND_READINESS, ADR-045);
  codebase map for the integrator. No builders yet.

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`node-v24.19.0-linux-x64/bin` first on PATH); `corepack enable pnpm`;
  `pnpm install --frozen-lockfile --ignore-scripts`. Typecheck and build need `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`
  (the sandbox's Playwright Chromium), at most 2 workers, one browser run at a time.
