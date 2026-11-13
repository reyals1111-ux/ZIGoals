# Session AO — "EVERYTHING LEFT": resume file

Branch `feature/session-an-ci-tooling` (PR #102, retitled "Session AN + AO"; Draft). Plan approved once by the owner
(13 Nov) with two stored-data rules; both are verbatim in `docs/architecture/ADR-039-session-ao.md`. **Continue without
questions** after any usage pause: read this file, then the next row below.

## Rules in force (short)
- Lane fence (AM-2, PR #101): never `components/nova/**`, `lib/nova/**`, `lib/ai/**`, `public/nova/**`, nova/hud specs,
  `tests/zigi-states.spec.ts`, `workers/private-sync/**`, `landing/privacy.html`. Shared files additively only.
- No new dependency, outside service, wallet/signing/key change. New stored data additive in every registry.
- Commit + push per part and ≤ 45 min apart; lint, typecheck (`NODE_OPTIONS=--max-old-space-size=8192`), focused tests
  before every push. Builds and browser runs one at a time (Chromium, ≤ 2 workers). ≤ 2 attempts per row, then Carried.
- Never merge, auto-merge, dispatch a workflow or deploy.

## Parts
| Part | State | Commits | Next |
|---|---|---|---|
| 0 records | done | (this commit) | — |
| 1 CI stability | next | | the rows in ADR-039 Part 1 |
| 2 owner calls a–g | pending | | |
| 3 AL carried rows | pending | | |
| 4 My day ends at | pending | | owner rule 1 |
| 5 backlog #1 #4 #11 #15 | pending | | owner rule 2 for #11 |
| 6 reviews, tour, closing, STATUS | pending | | |

## Local notes
- This sandbox runs Node 22 (CI: 24.19.0); WebKit is not installable here, so WebKit rows are fixed from traces/spec
  reading and proven in CI.
