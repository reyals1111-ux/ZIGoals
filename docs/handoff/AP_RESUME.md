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
| 1 CI green + weights | done | c8063d86, c7e77e55 | CI proof on the pushed head |
| 2 AO leftovers | done (visual minors → Part 7 UX pass) | 51a1b603 | CI fallout from Settings folded / roving |
| 3 service rows | pending | | |
| 4 owner decisions a–c | b done (790fe0f9); a, c next | | launchers auto-tuck, Bento |
| 5 friends Alpha + weather proxy | weather proxy done (c66b65c9) | | feedback diagnostics, What's new, Known limits, first five, docs |
| 6 competitor features (18) | pending | | |
| 7 reviews, tour, closing, STATUS | pending | | |

## Local notes
- Sandbox Node 22 (CI 24.19.0); WebKit not installable here: WebKit rows fixed from logs/spec reading, proven in CI.
- Production build at :3101 for local browser runs.
