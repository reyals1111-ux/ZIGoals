# Session AC — Resume here

Kept current after every part (owner rule: model-switch and crash safe). On any resume or model switch: `git pull`,
read this file and `git log --oneline -15`, then continue at the next unfinished step with the same quality bar.
Never redo a finished part; never re-plan. Plan: ADR-025 (owner decisions, the leftover table, E-decisions).

## Resume here (2026-10-16 02:00 Brussels, Gate C in progress)
- **Branch:** `feature/session-ac-polish` (tracks origin). Draft PR #87. Captures `review/session-ac-screens` (`before/`, `after/`).
- **Deadline:** PR out of Draft by Saturday 17 Oct 2026 20:00 Europe/Brussels.
- **Done:** Part 0 `c69b1db3`; item 3 `c9273d6b` (TIER 3 public-safety labels); Part 1 `676a054b`; 5a `1d735576` +
  `d45e9ff3` (TIER 3 storage, revised: only exact twins); Part 2 `3b440c14`; Part 3 `cb9094dd`; records `b80fe187`;
  E19 `c1fc02bc`; E20 `39bf9172`; item 7 fix `61267f43`; review fixes `7ff94069` (E21). Gate C so far: unit 560 files /
  4,918 passed; key scans; frozen readers #37–#41 PASS; stored placement read by #32 and #41; independent review done
  (one fix round); after captures pushed; weights within budget (Today 514.6 / 515).
- **Next:** revert gate (`$SP/revert-gate.sh $SP/mainwt <head>`, output `$SP/revert-gate.txt`); CI on `7ff94069`
  (run 38825041393) — fix anything red; then the STATUS entry as the FINAL commit, PR description, PR ready.
- **Open decisions:** none. Owner items in ADR-025 E20/E21 (today-screens in this sandbox; no-JS facts visibility).
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
