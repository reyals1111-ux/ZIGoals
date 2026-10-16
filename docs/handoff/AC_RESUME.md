# Session AC — Resume here

Kept current after every part (owner rule: model-switch and crash safe). On any resume or model switch: `git pull`,
read this file and `git log --oneline -15`, then continue at the next unfinished step with the same quality bar.
Never redo a finished part; never re-plan. Plan: ADR-025 (owner decisions, the leftover table, E-decisions).

## Resume here (2026-10-16 08:45 UTC — finish phase)
- **Every owner item has its outcome** (ADR-025 E22–E27): 9c, 9d, 12, 11 #12, 17, today-screens (CI 10.73 / 5.68),
  no-JS facts (TIER 3), closing checks (audit on changed routes, hero 768 px measured per font, revert gate, frozen readers).
- **Item 16 open:** part 1 (backdrop) holds on CI; the Undo press still lost on WebKit phones, and once Send stayed
  disabled after a fill. Diagnostics: `ce283862` (presses after Undo) and part 3a (the message box after fill).
  Next: read the WebKit jobs of the run on the head after `b99d6355` → fix the product cause → two greens → TIER 3 (CI);
  otherwise advisory with the evidence (E28).
- **Finish:** fill CI_LINE / WEBKIT_LINE / WEBKIT_ITEM in `$SP/status-entry.md` and the PR body (`$SP/pr-body.md`);
  ADR-025 E28; STATUS as the FINAL commit; PR #87 ready; short report. Checkpoints only here, never as a plan.

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
