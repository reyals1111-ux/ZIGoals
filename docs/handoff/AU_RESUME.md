# Session AU — resume file ("FRIENDS DRESS REHEARSAL")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-au-dress-rehearsal` (from `main` `836534c3`), one Draft PR. Rules: CLAUDE.md, the owner's brief and
`docs/architecture/ADR-044-session-au.md` (the approved plan and the owner's two additions). Order: 0, 1, 2, 3, 4, end.

## Toolchain in the sandbox
- Pinned Node 24.19.0 into the scratchpad (`https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz`), its
  `bin` first on PATH; `corepack enable pnpm`; `pnpm install --frozen-lockfile --ignore-scripts`.
- Browser runs: Chromium at `/opt/google/chrome/chrome`, at most 2 workers, one run at a time; production build on 3101.

## Done
- Part 0: ADR-044, this file, STATUS stub, frozen readers #37–#57 PASS (#57 = `836534c3`).
- Part 3 (early, TIER 3 CI): `apps/web/playwright.main.shards.ts` (14 duration-balanced lists, MAIN_SHARD=n/14);
  predicted 34–38 min per shard. **Every new spec must be added to the list its error names** (and `webkit-au-*` files to
  `playwright.webkit.shards.ts`, the shortest list).
- Part 1 walks: scratchpad `walks/` (kit.ts, steps.ts, <persona>.walk.ts, walks.config.ts; run1 = all 20, run2 = Tom/Lina/Jules
  fixed scripts, run3 = Tom with a valid barcode fixture); baseline server = worktree `scratchpad/base` (code of 22e82425)
  on port 3101. Reviewers done: Sanne, Max (review-*.md in walks/).
- Fixes committed: F-1 first five adds a left-out page; F-2 Allow Health in NOVA → Permissions; F-3 no second setup card;
  F-4 Today's habit count on the habit day; F-5 Tasks follow the day end; F-6 goal-kind hint; T-5 barcode message;
  F-MEAL words-only meal (`zigoals:meal-words:v1`, TIER 3 stored formats); answers D-ETA, D-NL-COINS, D-ALLOW-HEALTH
  (TIER 3 AI tools).

## In progress (20 Nov ~01:30)
- Integration build 3 of `d9ab8612` (worktree scratchpad/int, served on 3102): route weights (Health was 531.2 of 531
  at build 2; fixed by decoupling meal-words from meal-names), then all tests/au specs (10 files; sanne×2, max phone,
  lina phone passed on build 2) and the affected existing specs (ap-minors, nova-families-as, send-feedback, first-five,
  day-ends, day-goal, ap-money-*, bills, workouts, barcode, export, nova-answers-as).
- Then: REHEARSAL.md verdicts → final; ADR closing table; STATUS entry; CI on the final head (hold pushes while a run
  goes: every push cancels the run before it).

## Next
- Part 2 left: AT D20 minors not touched by the rehearsal (see ADR-043 D20 list) → carried with cause in ADR-044.
- Done in Part 2: words-only meal, goal ETA, Allow Health, Dutch coins, Showcase mood tags + price change, roving helper,
  D34/D36 look (carried with mechanism).
- Part 3 done (main shard lists); account-browser stall recorded (D-SYNC).
- Part 4 done (FIRST_WEEK.md, FRIENDS_GUIDE 8i, Known limitations).
