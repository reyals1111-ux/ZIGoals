# Session AC — Resume here

Kept current after every part (owner rule: model-switch and crash safe). On any resume or model switch: `git pull`,
read this file and `git log --oneline -15`, then continue at the next unfinished step with the same quality bar.
Never redo a finished part; never re-plan. Plan: ADR-025 (owner decisions, the leftover table, E-decisions).

## Resume here (2026-10-16 00:30 Brussels, after Part 3's main items)
- **Branch:** `feature/session-ac-polish` (tracks origin; push with `git push -u origin feature/session-ac-polish`,
  never to `main` or the harness branch). Draft PR #87. Captures branch `review/session-ac-screens` (`before/` pushed).
- **Deadline:** PR out of Draft by Saturday 17 Oct 2026 20:00 Europe/Brussels (`TZ=Europe/Brussels date` at every part).
  After Saturday 16:00, or on the owner's "lean finish": finish the current part, then Gate C lean, STATUS, PR ready.
- **Cut order (owner):** 16, 9c, 11 #12, 12, 9d stacked rows, 17 — each recorded "not done + why".
- **Done:** Part 0 `c69b1db3`; item 3 `c9273d6b` (TIER 3 public-safety labels); Part 1 items 1, 2, 4 `676a054b`;
  item 5a `1d735576` (TIER 3 storage); Part 2 items 5b, 6, 7 `3b440c14`; Part 3 9b 9e 9f 10 11 13 15 + What's new
  `cb9094dd`. Weights on `cb9094dd` all within budget (Today 514.5 / 515).
- **Next:** the focused browser run on `cb9094dd` (log `$SP/t4.log`); then 9c, 11 #12, 12, 17 (run
  `phone-touch-targets:40`, `goals-best-aa:117` once), 16 if time; then Gate C (ADR-025 plan), the after captures
  (`$SP/tools/capture.mjs` to `after/`), the review subagent, What's new is written, STATUS as the final commit.
- **Open decisions:** —
- `SP=/tmp/claude-0/-home-user-ZIGoals/bb66d39c-f176-5390-999e-c35fd28c19c0/scratchpad` (sandbox only).

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
