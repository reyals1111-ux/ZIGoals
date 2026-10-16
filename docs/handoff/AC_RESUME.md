# Session AC — Resume here

Kept current after every part (owner rule: model-switch and crash safe). On any resume or model switch: `git pull`,
read this file and `git log --oneline -15`, then continue at the next unfinished step with the same quality bar.
Never redo a finished part; never re-plan. Plan: ADR-025 (owner decisions, the leftover table, E-decisions).

## Resume here (2026-10-16 16:05 UTC — done)
- `8e930e93` (item 16 part 4: the ZIGi seeds wait for Settings' network before the next `goto`, the WebKit navigation
  stall) green on run 38921698510, WebKit required. STATUS updated as the final commit; PR #87 ready for review.
  Nothing open; the owner merges and deploys.

## Resume here (2026-10-16 14:30 UTC — finish)
- Run 38909051298 (`21970372`): every job green, WebKit required. Revert gate part 2 (`revert-gate-2.txt`) green.
- Done next: STATUS FINAL commit, PR #87 description and ready for review, short report. Nothing open.

## Resume here (2026-10-16 12:55 UTC — WebKit required; finish steps next)
- Item 16 done: three product causes fixed (`9804d676`, `fa431ed2`, `7f417281`); two consecutive green WebKit runs on
  the final code (38889129910 `7f417281`, 38898027504 `5c734666`) → `TIER 3 (CI)` `f29eb964` (WebKit in the `web`
  check on pull requests; skip accepted elsewhere). CI fix `5c734666` (the phone helper's stand-in read).
- Next: the run on this head green (the aggregate with WebKit) → STATUS FINAL commit from `$SP/status-entry.md`
  (fill WEBKIT_ITEM / WEBKIT_LINE / CI_LINE) → PR #87 body from `$SP/pr-body.md`, ready for review → short report.

## Resume here (2026-10-16 10:55 UTC — item 16 part 3c pushed, two-greens count from `7f417281`)
- Run 38879358853 (`f224abbd`): WebKit shard 2 red — the auto-accept toast's Undo brought into view under "Jump to the
  latest message" (trace: "intercepts pointer events"); fixed in `7f417281` (the log's `scroll-padding-bottom: 64px`,
  `zigi-chat-backdrop` 4 fails before). Also `zigi-history-undo:98` "internal error" on its first `goto` (engine).
- Two-greens count starts at `7f417281`'s run; this commit queues the second. Then TIER 3 (CI) from
  `$SP/webkit-required.patch` (or advisory with evidence), STATUS FINAL, PR #87 ready, short report.

## Resume here (2026-10-16 09:55 UTC — item 16 two-greens count)
- Run 38875420929 (`7dcf825a`): `web` green (browser shard 3 with `motion-polish` green: the slogan red was the recorded
  sampling class); WebKit shard 2 green, shard 1 red: a desktop `page.goto` whose document request WebKit never
  answered (navigation stall, not this PR's; spec untouched). ADR-025 E28 written.
- Two-greens count starts at run 38879358853 (`f224abbd`, first with `fa431ed2`); this push queues the second. Both
  WebKit green → `TIER 3 (CI)`: `web-webkit` into the `web` aggregate (skipped accepted outside pull requests), no
  `continue-on-error`. Otherwise advisory, evidence in STATUS. Then STATUS FINAL, PR #87 ready, short report.

## Resume here (2026-10-16 10:05 UTC — finish phase, item 16 part 3b pushed)
- **Run 38873163468 (`b99d6355`) read:** everything green except browser shard 3 (`motion-polish:195` phone, the slogan's
  mid sample read after its end: the recorded `motion-polish` sampling class under two-worker load; 10/10 alone here on
  `fa431ed2`'s build; nothing in this PR touches the slogan) and WebKit shard 2 (`webkit-zigi-freeze:81` phone; the
  `zigi-accept-correct` Undo whose presses diagnostic gave the root cause).
- **Item 16 part 3b (`fa431ed2`):** a press on Undo let WebKit scroll the log, "Jump to the latest message" appeared under
  the finger and took the release, so the click went to the dialog. The jump button now keeps its state while a press is
  down (`zigi-chat-backdrop` third test fails before the fix). Local on its build: chat set 178 passed.
- **Next:** read the WebKit jobs of `7dcf825a` (stop-timer diagnostics, run 38875420929) and `fa431ed2` (run
  38878829190); two consecutive greens after `fa431ed2` → TIER 3 (CI) `web-webkit` required; otherwise advisory with
  the evidence. Then ADR-025 E28, STATUS FINAL commit, PR #87 ready, short report.

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
