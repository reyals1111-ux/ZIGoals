# ZIGoals: Claude Code quick start

@apps/web/AGENTS.md

The project rules are in AGENTS.md (imported above), CONTRIBUTING.md, SECURITY.md and docs/STATUS.md. Read them first; they take precedence over this file.

## Setup
- Use Node 24.19.0 and pnpm 11.19.0 (see `.node-version`). Check prerequisites with `pnpm run doctor`.
- Install: `pnpm install --frozen-lockfile --ignore-scripts`
- Dev server: `NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm dev`, then open http://127.0.0.1:3100/app.
  - If port 3100 is taken: `NEXT_PUBLIC_APP_ENVIRONMENT=LOCAL_DEMO pnpm --filter @zigoals/web exec next dev --hostname 127.0.0.1 --port 3101`
  - No secrets are needed. Settings → Load Showcase Demo fills the app with example data.

## Checks
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Unit tests: `pnpm test`
- Browser tests (against a running server): `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 pnpm --filter @zigoals/web exec playwright test --workers=2`
- Production check: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then `pnpm --filter @zigoals/web start` and run the browser tests against it.

## Working rules
- Run Playwright with at most 2 workers. Never run builds or test suites in parallel.
- Keep reports to the owner short.
