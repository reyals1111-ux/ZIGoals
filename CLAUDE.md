# ZIGoals: Claude Code quick start

@apps/web/AGENTS.md

Project rules: `apps/web/AGENTS.md` (imported above), CONTRIBUTING.md, SECURITY.md and docs/STATUS.md. Read them first; they take precedence over this file.

## Setup
- Node 24.19.0 and pnpm 11.19.0 (`.node-version`). Check with `pnpm run doctor`.
- Install: `pnpm install --frozen-lockfile --ignore-scripts`
- Dev server: `NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm dev`, then http://127.0.0.1:3100/app. If port 3100 is taken: `NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm --filter @zigoals/web exec next dev --hostname 127.0.0.1 --port 3101`.
- No secrets are needed. Settings → Load Showcase Demo fills the app with example data.
- Browser tests use the `chrome` channel. In a cloud sandbox where the Chrome download is blocked, point `/opt/google/chrome/chrome` at the preinstalled Playwright Chromium, locally only, and let CI run real Chrome. That Chromium cannot play the intro video, so the intro-video specs (logo-quickadd-goals-header, the a11y logo clip) fail locally but pass in CI.

## Checks
- `pnpm typecheck`, `pnpm lint`, `pnpm test`
- Browser tests against a running server: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 pnpm --filter @zigoals/web exec playwright test --workers=2`
- Production check: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then `pnpm --filter @zigoals/web start`, then the browser tests against it.
- Playwright uses at most 2 workers. Never run builds or test suites in parallel.

## Big sessions
- One PR per session. Commit and push after each part.
- Merge commits only: never rebase or force-push. Update from `main` with a merge commit.
- Risky areas (auth/sync, the deploy workflow, project rules) go in separate commits labelled `TIER 3 (<area>): …`, behaviour-preserving unless stated.
- A known CI intermittent (docs/STATUS.md, "Known CI intermittents") gets one re-run. A second failure means investigate.
- The final commit is a docs/STATUS.md entry with each part's commits and evidence.
- Never merge the PR, enable auto-merge or deploy; the owner does.
- Keep reports to the owner short.
