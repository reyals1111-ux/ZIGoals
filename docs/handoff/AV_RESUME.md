# Session AV — resume file ("ALPHA QUALITY")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-au-dress-rehearsal` (PR #108 "Session AU + AV", Draft). Rules: CLAUDE.md, the owner's brief and
`docs/architecture/ADR-045-session-av.md` (the plan and the owner's approval with nine amendments, verbatim).
Order (amendment 7): 0 → 1 → 2 → 3 → 5 → 4 → 4b → 6 → 8 (first pass) → 7 → 8 (final pass) → end.
Parts 1–6 and the first pass of 8 green and pushed before Part 7. A Part 7 feature not finished is not wired in.

**Safe to merge now: no (Parts 1–2 pushed; CI run 1927 on `de32b3fc` (Part 1) and the run on Part 2's head not read yet).**

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz`), its `bin` first
  on PATH; `corepack enable pnpm`; `pnpm install --frozen-lockfile --ignore-scripts`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build` (about 1.5 min), then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`,
  at most 2 workers, one run at a time.

## Done
- Part 0: ADR-045, this file, STATUS stub (`609714b3`).
- Part 1: D36 whole-rows fitter (`111c42f7`), three specs set up as they say (`de32b3fc`: p3-nova-polish, hud-motion,
  dashboard-visual); D-SYNC carried with 6 of 6 local runs (ADR). Baseline weights in ADR (Health 0.0 kB headroom,
  Goals 0.7, Habits 1.3, Markets 2.6, Settings 3.9, Tasks 4.4, Agenda 4.8).
- Part 2 (TIER 3 PWA): `bfe18cf5` (update recovery), `04ca70b1` (D-J4 Checklist history boundary), two-build proof
  `scripts/av/two-builds.mjs` 10 of 10.

## In progress
- Read CI on the Part 1 and Part 2 heads; then Part 3.

## Next
- Part 3, Part 5, Part 4, Part 4b, Part 6, Part 8 first pass, Part 7, Part 8 final.
