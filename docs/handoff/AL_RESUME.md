# Session AL: resume file (kept current at every push)

**Branch:** `feature/session-al-fix-everything` (base `main` `17069c7d`). **Draft PR:** opened in Part 0 (link in STATUS once open).

## How to resume in a fresh workspace
1. `git fetch origin feature/session-al-fix-everything review/session-al-scope review/session-ah-scope review/session-ai-scope`, then `git checkout feature/session-al-fix-everything`.
2. Install Node 24.19.0 into `/opt/node24` (the nodejs.org tarball, checked against SHASUMS256). Run `export PATH=/opt/node24/bin:$PATH`, then `corepack enable --install-directory /opt/node24/bin`, then `pnpm install --frozen-lockfile --ignore-scripts`.
3. Extract the scope into the scratchpad with `git show origin/review/session-al-scope:owner-scope/<file>`. Never commit it.
4. Read ADR-037, this file and `docs/review/session-al/GROK53_LEDGER.md`, then continue from "Exact next step".

## Done (pushed)
- Part 0: branch; Draft PR [reyals1111-ux/ZIGoals#100](https://github.com/reyals1111-ux/ZIGoals/pull/100); frozen reader #53; STATUS Part 0 records; ADR-037 skeleton; ROOT_CAUSE_KEYS.md; Dependabot review (Waits on owner); all eight per-bot ledgers in `docs/review/session-al/ledger/`.
- Part 1 (L9): 1a smoke `73d1a3e2`; 1b verifier under plain Node + stage 12 `a8188f0c`; 1c CI limits and 12 shards `65712e97`; 1f chunked PR review `51e624f9`; 1d/1e/1g docs `0d1ae858`; two intermittents fixed `1826c58a`.
- Part 3d/3e/3f (L10b): primitives `434309c3`; APIs and per-lane migration list in `docs/review/session-al/PRIMITIVES.md`.

## Local setup used
- A baseline production build of main `17069c7d` is in a separate worktree (`/home/user/zig-base`) and serves on :3102 (reproductions, expected red). Branch builds serve on :3101.
- Builds need `NODE_OPTIONS=--max-old-space-size=6144` in this sandbox (the default 2 GB heap runs out during type checking).

## Lanes in flight
- L1 Wealth, L2 Health, L3 Habits/Today, L4 Goals/Activity/copy, L5 Tasks, L6 chain/Settings/Help, L7 ZIGi/NOVA, L8 HUD and L10a shell/Plans.
- Plus the ledger-merge helper: GROK53_LEDGER.md + HISTORY_MAP.md.

## Exact next step
1. Review and commit each lane as it reports (lint, typecheck, unit).
2. Then a branch production build on :3101.
3. Run the `tests/grok53` specs red on :3102 and green on :3101 (the reproduction map, R3/R5).
4. Pillar replays (A1).

## Open readings
Q1–Q5 are in ADR-037.

## Live counts
| Ledger findings in | AL rows out | Reproduced | Already fixed | Reopened | Fixed | STILL OPEN |
|---|---|---|---|---|---|---|
| ~1,465 new + 1,348 old-id lines + 467 prompts + 290 gaps | 809 proposed rows (merge to AL rows in progress) | — | — | (history map in progress) | — | — |
