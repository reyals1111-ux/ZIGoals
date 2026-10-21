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
- Checks: `pnpm typecheck`, `pnpm lint`, `pnpm --filter @zigoals/web exec vitest run lib/checklist lib/path lib/game components/orbit-path`
- Browser: production build (`NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`), `pnpm --filter @zigoals/web start`,
  then `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 pnpm --filter @zigoals/web exec playwright test <specs> --workers=2`
  (Chromium stands in for the Chrome channel locally, as CLAUDE.md describes).

## Parts
| Part | State | Commits |
|---|---|---|
| 0 Records, ADR-029, this file, Draft PR | in progress | — |
| 1 Nodes | — | — |
| 2 Lines | — | — |
| 3 Orbit labels | — | — |
| 4 Timer cards | — | — |
| 5 Background, planet, top bar | — | — |
| 6 Removals and smaller changes | — | — |
| 7 Self-check, audits, CI, STATUS, ready | — | — |

## Next action
Commit Part 0, push, open the Draft PR; then Part 1 (`components/orbit-path/`).
