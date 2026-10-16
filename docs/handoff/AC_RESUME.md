# Session AC — Resume here

Kept current after every part (owner rule: model-switch and crash safe). On any resume or model switch: `git pull`,
read this file and `git log --oneline -15`, then continue at the next unfinished step with the same quality bar.
Never redo a finished part; never re-plan. Plan: ADR-025 (owner decisions, the leftover table, E-decisions).

## Resume here (2026-10-16 ~10:00 Brussels, owner amendment of the finish checkpoint: nothing is cut)
- **Order (owner):** 1 item 16 WebKit → 2 item 9c → 3 item 9d → 4 item 11 #12 → 5 item 12 → 6 item 17 → 7 today-screens →
  8 no-JS facts; each its own commit + push + this block; then affected specs, layout audit on changed routes, weights,
  revert gate, frozen readers once; one fix round; finish steps (ADR-025, STATUS final commit, PR ready, report).
- **Pushing:** a push cancels the running CI; WebKit evidence needs a whole run (~35 min), so item commits wait for it.
- **Done since the checkpoint:** CI fixes `36194ad1` (stand-in specs by widget id, seed-day clock, habit action row);
  item 16 part 1 `9804d676` (phone chat closes only on a real backdrop tap; smoke names ResizeObserver loops).
- **Item 16 next:** read WebKit on `9804d676` (run on the PR); a second green WebKit run → `TIER 3 (CI)` required;
  otherwise advisory with the evidence (artifacts summarised in `$SP/wk/`).
- **Item 8 code is written (unstaged):** `components/shell/alpha-notice.tsx` (ALPHA_ESSENTIALS, `<noscript>` and the
  stalled line), `shell.tsx` (`stalled`), `shell-ab.css`, tests honesty-banners / private-read-delay / ab-shell.

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
