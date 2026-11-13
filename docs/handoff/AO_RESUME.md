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
| 1 CI stability | done (CI proof on the next run) | (see git log "Part 1") | CI run on the pushed head |
| 2 owner calls a–g | a–f committed; g = owner decision (record) | b00a7985, 7d48c6f3 (2e) | browser proof on the production build |
| 3 AL carried rows | nearly all committed (aa67f009); D-088 carried (ADR D8); D-028 partly (D14); rest in ADR D16 | | closing table |
| 3 (earlier note) | many committed (menus, Activity, PR-052, B-201, TK-036, C-MO-36, NB-114, DV-053c, L-075, M-011, LS-067, D-055) | d256b946, 3934199b | D-088, D-028, T-014, DV-010c, DV-045e, N-BN-05, BUG-051, DV-274/NB-045, D-224/D-231, C-LS-20, the rest |
| 4 My day ends at | committed (TIER 3) | e2452897 | CI |
| 5 backlog #1 #4 #11 #15 | all four done (8c6c7b2b, e2452897, aa67f009) | | — |
| 6 reviews, tour, closing, STATUS | reviews running; demo tour written | | fix review findings; closing table; STATUS last |

## Local notes
- This sandbox runs Node 22 (CI: 24.19.0); WebKit is not installable here, so WebKit rows are fixed from traces/spec
  reading and proven in CI.
