# Session AA-Cloud: raw run data (orphan branch, never merged)

## gate-b/
- `full-suite-run1.log`: the full browser suite, run 1 of 2 (Gate B), both projects, 2 workers, against a local production build
  (`NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED`) of `dc3b165`, local Playwright Chromium standing in for Chrome
  (CLAUDE.md). Result: 2,027 passed, 557 skipped, 4 failed; the 4 are `logo-quickadd-goals-header.spec.ts:53` and `:79`
  on both projects, the intro film this Chromium cannot play (they pass in CI). Evidence: local.
- `zz-dump-aa.test.ts` / `zz-frozen-aa.test.ts`: the frozen-reader check. The first, run on this branch, writes the
  Showcase's records (with the earlier season, the card choice and a recent search) and an Export everything JSON; the
  second, run in a `32cb9c5` worktree (Alpha #37's source) with that build's own readers: every synced record parses,
  the Showcase sleep group still reads (29 earlier nights), and #37's Export everything reads everything it knows with
  nothing unreadable and no warning, leaving the six new device keys alone. 2 of 2 passed. Evidence: local.
- `write-probe.mjs`: logs every Storage call while Today loads after the Showcase (for CI's weekly-review order flake):
  only the public market caches write; nothing writes the Showcase's records. Evidence: local.
- `seeded-heights.mjs`: the today-screens seeded state, part by part (A37). Evidence: local.

## gate-c/
- `revert-gate.txt`: every session commit reverted newest-first in a scratch worktree at `c7debcd`; at each part boundary
  the tree equals that commit and typechecks; the end tree is identical to `32cb9c5`. Evidence: local.
- `freeze-compare.json` / `freeze-summary.txt`: `scripts/desktop-freeze-check.mjs` against `32cb9c5`'s own production
  build: 155 of 155 captures differ (by design; each cause in ADR-021 "Freeze check"), no page error. Evidence: local.
