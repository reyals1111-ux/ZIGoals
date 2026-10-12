# Session AA-Local — status and resume point

Kept current after every finished piece (owner's rule). The PR description carries the same "Resume here" block.
Paths: repository `~/Documents/ZIGoals-Claude` (branch `feature/session-aa-local`), runs worktree
`~/Documents/ZIGoals-Claude-aa-runs` (orphan `review/session-aa-local-runs`), screens worktree
`~/Documents/ZIGoals-Claude-aa-screens` (orphan `review/session-aa-local-screens`), scratchpad
`/private/tmp/claude-502/-Users-AIUSER-Documents-ZIGoals-Claude/84136727-7ff5-4b5b-8f5a-39ab937fc67d/scratchpad`
(chain scripts, `stage-logs/<stage>.log` and `.status`, `main-poll.log`).

## Resume here (2026-10-12 ~08:30Z)
1. Parts 0–2 pushed (`af1882e5` storage, `004ecf7c` Habits, `682bf199` game layer; draft PR #84). Parts 3, 4 and 5 are
   built and green locally (typecheck, lint 0 errors, 584 focused unit tests, `health-aa`/`flow-aa` 16/16, the four new
   accept-correct rows) and are being committed in this order: `[TIER 3] (egress/security)` recipe route → Part 3 →
   Part 4 → Part 5; each pushed after a key sweep.
2. Gate A (overdue) comes right after: production build on :3103, ZIGi suites + the new specs in Chrome and WebKit, the
   unit suite (incl. the `auto-accept-once` standalone-parse question), golden 100 %, CI on PR #84, AA-Cloud's handoff
   (read at 07:40Z: its slot registry now has `settings:your-app` and `settings:reminders`, `registerNavExtra` for
   Journey, life areas in `zigoals:goal-extras:v1`; the mirror and the areas key follow it, B11/B40).
3. Then S0 (Batch spoken top-up ≤ $3), Parts 6–7, Gates B–C, STATUS entry, PR ready. Ledger: $0.00 of $50.
4. Owner rules since 00:05Z: no preview pane, servers from Bash (`/tmp/aa-dev-3102.log`, `curl` health checks), every long
   command under `scratchpad/tmo.sh`, no ExitPlanMode or approval questions; anything that needs the owner is written
   here and in the handoff.
5. At the merge with `main` after AA-Cloud (I am the second merger): `components/game/slot-local.tsx` →
   `export * from '../progress/slot'`; `lib/habits-extras/areas-mirror.ts` → a re-export of `lib/goal-extras/areas.ts`;
   mount `<GameRegistrar/>` in `components/shell.tsx`; `registerNavExtra(['/app/journey', 'Journey', <icon>])` while the
   game layer is on; wrap goal steps with `useSwipeActions`; `emitValidated('achievement_unlocked')` where a goal or
   an average goal finishes; add `zigoals:calculator:v1`, `zigoals:search-recent:v1`, `zigoals:life-review:v1`,
   `zigoals:today-cards:v1` to `lib/onboarding.ts`'s lists; keep the filter in `lib/sleep/sleep-features.test.ts`;
   ZIGi kinds for AA-Cloud's goal-extras and average goals; carry What's new, Help, weight budgets and STATUS.

## Done
- Part 0; Part 1 (B12–B16); Part 2 (B17–B21); Parts 3–5 built (B22–B39), Gate A reading of AA-Cloud (B40).

## Open
- Everything from Part 1 on; see the plan in ADR-022.
