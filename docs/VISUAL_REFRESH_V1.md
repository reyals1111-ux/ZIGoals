# Visual Refresh v1 — checkpoint
- Base: `4dd859db5ea1f20fe14cc8c3c3a70b728b55fbcb`; branch: `feat/visual-refresh-v1`.
- COMPLETE: shared surface/color/health/motion tokens, navigation, safety banner and wallet/button styling. Targeted ESLint and repository typecheck passed.
- COMPLETE: dashboard hero, orbital SVG empty state, stat hierarchy, circular Goal progress and health colors; calculations unchanged.
- COMPLETE: production Alpha build/dry-run and desktop/320px inspection; 14 desktop cases plus 2 mobile cases passed after correcting an ambiguous mode-indicator test selector.
- IN PROGRESS: final build/screenshot refresh for one mobile-copy spacing fix. NOT STARTED: unmerged PR.
- Safety boundary: presentation only; wallet, financial guards, private data, contracts, CSP, static routing and Cloudflare configuration unchanged. No deployment or merge.
- Validation: relevant ESLint, typecheck and 57 targeted wallet/public-safety tests passed. Browser tests are prepared but not yet run.
- Resume: build with `pnpm --filter @zigoals/web build:alpha`, then `check:alpha`; run dashboard/goals/wallet-reload/public-alpha Playwright tests against a local Alpha preview and inspect screenshots.
- Deferred to Visual Refresh v2: dedicated secondary-page layouts, cinematic imagery and further motion polish.
