# Session AG — Resume here

Kept current after every part (owner rule). On any resume, usage pause or model switch: read this file, `git status` and
`git log --oneline -15`, then continue at "Next action". Never redo finished work; never re-plan; never enter plan mode
again (the plan was approved with the owner's seven amendments: ADR-029 "Owner decisions").

## Rules in one breath
Branch `feature/session-ag-checklist-orbit` (the harness branch `claude/checklist-orbit-redesign-psuh7f` stays untouched).
One PR. Merge commits only. At most 2 helpers, code only. Builds and Playwright one at a time, ≤ 2 workers, 15-minute
timeout per wait, CI polled at most every 10 minutes. No captures pushed anywhere; the self-check images stay in the
scratchpad. Reference images: `git show origin/review/session-ag-refs:owner-refs/<file>` into the scratchpad only.
Deadline: PR out of Draft with CI green by Sat 24 Oct 12:00 Brussels.

## Commands (cloud sandbox)
- Install: `pnpm install --frozen-lockfile --ignore-scripts`
- Checks: `pnpm typecheck`, `pnpm lint`, unit tests from the repo root (the root vitest config holds the JSX transform):
  `pnpm exec vitest run apps/web/lib/checklist apps/web/lib/path apps/web/lib/game`; after any CSS change
  `node scripts/themes/build-themes.mjs` (CI runs `--check`). Known sandbox-only unit failures (Node 22, ICU): pre-run11-setup,
  run11/domain-review-race, visual-format ja-JP, vault/finance-homes — they fail on `main` here too and pass in CI.
- Browser: production build (`NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`), `pnpm --filter @zigoals/web start`,
  then `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 pnpm --filter @zigoals/web exec playwright test <specs> --workers=2`
  (Chromium stands in for the Chrome channel locally, as CLAUDE.md describes).

## Parts
| Part | State | Commits |
|---|---|---|
| 0 Records, ADR-029, this file, Draft PR | done | see git log, PR #91 |
| 1–3 Nodes, lines, orbit labels (one commit, ADR-029 I6) | done | see git log |
| 4 Timer cards (honest lines) | done | see git log |
| 5 Background, planet, top bar | done | see git log |
| 6 Removals and smaller changes | done | see git log (Tier 3 game-layer data on its own) |
| 7 Self-check, audits, CI, STATUS, ready | done (CI on the final head pending, then out of Draft) | `65a998b6` + the STATUS entry |

## Next action
Wait for Milestone quality on the final head; fix anything red (one re-run only for a listed intermittent); then take PR #91 out of Draft and give the owner the short report.

## Notes
- The dev server's "X and Escape … opened directly, to Today" fails on `main` too in this sandbox (dev mode); check it on a
  production build before Gate.
- Self-check captures: scratchpad only (`cap/cap.spec.ts`), never committed.
