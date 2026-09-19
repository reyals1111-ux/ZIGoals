# Run #8.1 owner preview

Fictional fixtures, isolated browser storage. No owner data copied or modified.

[Today desktop](screenshots/today-1440.png) · [Tracked Goals desktop](screenshots/tracked-goals-1440.png) · [Positions desktop](screenshots/positions-1440.png)

[Goal detail with allocation](screenshots/goal-detail-allocation.png) · [Contribution plan + supporting Habit CTA](screenshots/contribution-plan-habit-cta.png)

[390px tracked Goal](screenshots/tracked-goals-390.png) · [390px staking card](screenshots/staking-card-390.png) · [390px Positions](screenshots/positions-390.png)

Checks: [43 unit tests](unit.txt), [28 production browser tests](browser.txt), [lint](lint.txt), [typecheck](typecheck.txt), [production build](build.txt). Browser suite verifies 1440/768/390/320 with no horizontal page overflow.

Source changes: `app/app/page.tsx`, `app/visual-v21.css`; `components/shell.tsx`; `components/platform/{tracked-goals.tsx,tracked-detail.tsx,positions-view.tsx,platform-today.tsx,staking-card.tsx,platform.css}`; `lib/{positions.ts,owner-preview.ts,owner-preview.test.ts}`; `tests/{owner-preview.spec.ts,platform.spec.ts,platform-habits.spec.ts,product-shell.spec.ts}` (all under apps/web); `docs/{RUN_8_REPORT.md,RUN_8_BETA_BACKLOG.md}` and this evidence directory.

Preview: from the Run #8 worktree, run `PATH=/Users/AIUSER/.local/share/fnm/node-versions/v24.19.0/installation/bin:$PATH pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`. This uses the verified PUBLIC_ALPHA_UNDEPLOYED production build.
