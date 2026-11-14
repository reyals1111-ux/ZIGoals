# Session AP — "READY FOR FRIENDS": resume file

Branch `feature/session-an-ci-tooling` (PR #102, "Session AN + AO + AP"; Draft). Plan approved once by the owner (14 Nov)
with five additions; all verbatim in `docs/architecture/ADR-040-session-ap.md`. **Continue without questions** after any
usage pause (weekly reset Sunday): read this file, then the next row below.

## Rules in force (short)
- Lane fence (AM-2, PR #101): never `components/nova/**`, `lib/nova/**`, `lib/ai/**`, `public/nova/**`, nova/hud specs,
  `tests/zigi-states.spec.ts`, `workers/private-sync/**`, `landing/privacy.html`. `components/ai/ai-launcher.tsx` allowed.
  Shared files additively only.
- No new dependency, outside service in the app, wallet/signing/key change. New stored data additive in every registry.
- Commit + push per part and ≤ 45 min apart; lint, typecheck (`NODE_OPTIONS=--max-old-space-size=8192`), focused tests
  before every push. Builds and browser runs one at a time (Chromium, ≤ 2 workers). ≤ 2 attempts per row, then Carried.
- Never merge, auto-merge, dispatch a workflow or deploy. Before the final STATUS commit: if PR #101 merged, merge main in.

## Parts
| Part | State | Commits | Next |
|---|---|---|---|
| 0 records | done | (this commit) | — |
| 1 CI green + weights | done | c8063d86, c7e77e55 | — |
| 2 AO leftovers | done | 51a1b603 + CI fallout (dbd55e36, D20 commits) | — |
| 3 service rows | done (API 15/15, browser 17/17) | 1479d304, 7e24a448 | — |
| 4 owner decisions a–c | done | 790fe0f9 (b), 4450b936 (a, c) | — |
| 5 friends Alpha + weather proxy | done | c66b65c9, 700203ec, Part 5 commits | — |
| 6 competitor features (18) | 17 built (060fb196, 4da1d293); 1 carried (D16) | | — |
| 7 reviews, tour, closing, STATUS | in progress: reviews running, tour written | | review fixes, closing table, CI on the final head, STATUS last |

## Local notes
- Sandbox Node 22 (CI 24.19.0); WebKit not installable here: WebKit rows fixed from logs/spec reading, proven in CI.
- Production build at :3101 for local browser runs.

## State (14 Nov, 09:00 UTC)
Head pushed through 5e6dccb6. Worktree build method (ADR-040 D14). Next: fix the reviews' findings, watch CI on the newest head, closing table, check PR #101 before the STATUS commit (owner addition 5).
