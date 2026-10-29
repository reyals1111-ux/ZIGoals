# Session AJ — resume file
Read this first when resuming (a fresh workspace included); then ADR-035 and the plan summary below.

## How to resume in a fresh workspace
1. `cd /home/user/ZIGoals && git fetch origin feature/session-aj-big-leap && git checkout feature/session-aj-big-leap && git pull --ff-only origin feature/session-aj-big-leap`.
2. `pnpm install --frozen-lockfile --ignore-scripts` (Node 22 here against the project's 24, as earlier cloud sessions).
3. Browser tests: point the Chrome channel at the preinstalled Playwright Chromium, locally only:
   `mkdir -p /opt/google/chrome && ln -sf /opt/pw-browsers/chromium-*/chrome-linux*/chrome /opt/google/chrome/chrome`.
   Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then `TZ=UTC pnpm --filter @zigoals/web exec next start -p 3101`; specs with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 … --project=… --workers=2`. One build or browser run at a time; `timeout 900` on every command.
4. Push at least every 45 minutes; update this file after every push.

## The plan (approved 29 Oct, with owner amendments A1–A9)
Parts in order: 0 records → 1 ZIGChain v6 (items 1, 3, 4; A1–A3) → 2 security and CI (11–14) → 3 ZIGi (8–10) → 4 Wealth (5, 6, 15, 30, 36; A4, A5) → 5 Health (22, 25–28) → 6 Goals/Habits/My Universe (29, 34, 35; A7) → 7 Settings/look/Earn (16–21, 24, 32; A8) → 8 Guide and research (31, 33) → 9 Landing (23) → 10 sweeps and finish (A6, A9). Readings P1–P8 in ADR-035.

## Done
- Part 0: branch from `65d0b85`; frozen readers default #37–#51; ADR-035; this file; STATUS Part 0.

## Next step
- Open the Draft PR, then Part 1: `packages/chain-config/src/reviewed-versions.ts` (P5) and its wiring.

## Open readings
- None beyond ADR-035's P-list.
