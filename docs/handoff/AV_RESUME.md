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
- Part 0 `609714b3`. Part 1 `111c42f7`, `de32b3fc` (D36, D34, D-DV; D-SYNC carried). Part 2 `bfe18cf5`, `04ca70b1`,
  `dadb7c23` (two builds 10 of 10), `3ae87fbd` (recovery split, warm fetch).
- Part 3 `8b0853eb` (TIER 3 stored formats: persist, iPhone cards, copy offer; frozen readers #37–#57 PASS).
- Part 5 `bc0ca218`: every route ≥ 6.3 kB headroom (lazy launcher/player/pills/glass, fasting timer, push sync).
  The lazy account-sync engine was tried and reverted (remember-device-browser 2 of 2 red) — ADR D-WEIGHT.
- Part 4 `0250512c`: L-6, the star's Permissions link, four D20 minors.

## In progress
- Part 4 rest (D20 minors in the audit), Part 4b audit (docs/review/session-av/UNFINISHED.md), Part 6 a11y, Part 8 first pass.

## Next
- Part 7 (COMPETITORS.md matrix, then up to 16 features, each complete or not wired), Part 8 final, END (ADR closing
  table, STATUS entry last, report ≤ 12 lines).
- Re-run `scripts/av/two-builds.mjs` once on the final code (two builds) — the recovery is now loaded on idle.
