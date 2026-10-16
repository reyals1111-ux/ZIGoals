# Session AC — Resume here

Kept current after every part (owner rule: model-switch and crash safe). On any resume or model switch: `git pull`,
read this file and `git log --oneline -15`, then continue at the next unfinished step with the same quality bar.
Never redo a finished part; never re-plan. Plan: ADR-025 (owner decisions, the leftover table, E-decisions).

## Resume here (2026-10-16 ~10:30 Brussels, the owner's amended list)
- **Done:** CI fixes `36194ad1`, `cdb07e66` (habit row own line); item 16 part 1 `9804d676` (phone chat closes only on a
  real backdrop tap: confirmed on CI — the chat now stays open); 9c `08ccae15`; 12 `8b4b09fb`; 9d `84c6a091`; 8 (no-JS
  facts, TIER 3) `3e9e309a`; 11 #12 `1d…` + follow-up; 17 passes here; today-screens: CI's Chrome 10.73 / 5.68 (within).
- **Item 16 now:** on `9804d676` WebKit still lost the Undo press on phones (card stays added, chat open): diagnostics
  in zigi-accept-correct record press/release/click targets and the log's scroll; zigi-part-boundary's S64/S77 filter
  covers Settings' three handled probes. Next WebKit run tells where the click goes → product fix → two greens → TIER 3 (CI).
- **Then:** closing checks (affected specs, audit on changed routes, weights, revert gate, frozen readers), one fix
  round, ADR-025, STATUS final commit, PR ready, report.

## Environment (cloud sandbox)
```
export PATH=/root/node-v24.19.0-linux-x64/bin:$PATH        # Node 24.19.0 (outside the checkout)
pnpm install --frozen-lockfile --ignore-scripts
mkdir -p /opt/google/chrome && ln -sf /opt/pw-browsers/chromium-1194/chrome-linux/chrome /opt/google/chrome/chrome
```

## Commands
- Production build and server (port 3101, `TZ=UTC`):
  `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build` then
  `TZ=UTC nohup pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101 > $SP/server.log 2>&1 &`
- Focused specs: `cd apps/web && PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 TZ=UTC timeout 1800 pnpm exec playwright test <files> --workers=2`
- Weights: `node scripts/check-weight-budget.mjs http://127.0.0.1:3101`
- Checks before every push: `pnpm lint`, `pnpm typecheck`, the touched unit tests (`pnpm exec vitest run <files>`).

## Captures (owner amendment 4: only these views, the same set before and after)
Habits (1440, 1024, 390, plus Motion Off); a long page at top / middle / bottom and the footer end (1440, 390); Today
and Wealth (1440, 1024, 390); Health water; the Goals vision tile with ⋯; the Settings About block and the Reminders tab
title (1440, 390).
