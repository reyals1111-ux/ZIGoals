# Session AL: resume file (kept current at every push)

**Branch:** `feature/session-al-fix-everything` (base `main` `17069c7d`). **Draft PR:** opened in Part 0 (link in STATUS once open).

## How to resume in a fresh workspace
1. `git fetch origin feature/session-al-fix-everything review/session-al-scope review/session-ah-scope review/session-ai-scope`, then `git checkout feature/session-al-fix-everything`.
2. Install Node 24.19.0 into `/opt/node24` (the nodejs.org tarball, checked against SHASUMS256). Run `export PATH=/opt/node24/bin:$PATH`, then `corepack enable --install-directory /opt/node24/bin`, then `pnpm install --frozen-lockfile --ignore-scripts`.
3. Extract the scope into the scratchpad with `git show origin/review/session-al-scope:owner-scope/<file>`. Never commit it.
4. Read ADR-037, this file and `docs/review/session-al/GROK53_LEDGER.md`, then continue from "Exact next step".

## Done (pushed)
- **Part 0:**
  - Draft PR [reyals1111-ux/ZIGoals#100](https://github.com/reyals1111-ux/ZIGoals/pull/100); frozen reader #53; STATUS records; ADR-037 (O1-O7, A1-A12, Q1-Q9, the lessons); ROOT_CAUSE_KEYS.
  - Eight per-bot ledgers; the merged GROK53_LEDGER (642 AL rows from 3,654 ids); HISTORY_MAP (150 reopened rows).
  - Dependabot review (waits on owner).
- **Part 1 (L9):** smoke, verifier under plain Node + stage 12, CI limits and 12 shards, chunked PR review, docs, two intermittents.
- **Part 3:**
  - L10b primitives `434309c3`.
  - L10a shell, O3, O4, Plans `57fb1e5e`, with the O3/O4 pin tests `fda12454`.
  - 59 existing specs moved to O3 `3d1f575c`.
  - Device-key registry `lib/al-device-keys.ts`: apps, wallet-names, chess-puzzle, nova-hud.
- **First passes of every pillar lane:**
  - L1 `671dd1f5`, L2 `3a46e44f`, L4 `97b8f85c`, L6 `1b1712aa`, L3 `9dead12c`.
  - L8 HUD `17a96b86`, L7 `ff274875`, L5 Tasks `3bf6f507`.

## Reproduction and proof so far (branch c727d662 production build on :3101)
| grok53 folder | Branch | Status |
|---|---|---|
| markets | 10/10 pass | — |
| wealth | 8/12 pass | 2 specs sent back to L1 |
| health | 24/28 pass | 2 specs sent back to L2 |
| All other folders | running | — |

The main baseline on :3102 is red on the specs tried (wealth 6/6 failed as expected).

## Local setup used
- A baseline production build of main `17069c7d` lives in a separate worktree (`/home/user/zig-base`) and serves on :3102.
- The branch head is built in a clean worktree (`/home/user/zig-branch`, `git checkout --detach <sha>`, then build) and serves on :3101. Building there keeps the lanes' unfinished edits out.
- Builds need `NODE_OPTIONS=--max-old-space-size=6144` in this sandbox.
- Load is high with many helpers, so unit timeouts under load are re-run alone.

## Owner cost rules (5 Nov) — in force for the rest of the session
- At most 4 helpers until the full CI on the head is green, then at most 5 (never 10).
- Order: CI1–CI5 → CI green → ADR-037 closing table kept filled → replay round 2 for L2–L8 in the order L7, L3, L2, L5, L4, L6, L8 → after the reset: the L1 fifth pass (TK-199, TK-191 + 12 open rows), Parts 13–16, ONE A10 cycle, Part 17.
- Replays and audits read only their lane's AL rows in GROK53_LEDGER.md and, per id, only that finding's steps in the bot file (search by id); never a whole bot file or FINAL-REPORT.md.
- Replays: round 2 for L2–L8, then ONE final full round on the final head; an extra per-pillar round only if a lane's round 2 shows more than 10 STILL OPEN.
- One production build per integration point, shared; never one per helper.
- Weekly reset: Sunday 12:00 Brussels; no extra usage. Before the limit: all committed and pushed, this file current, the task list true; never commit a half-finished fix.

## Lanes in flight (6 Nov, early)
- **Committed and pushed through `37d2370c` (tree clean, no lanes running):** CI13 `9d563c8f` and CI14 `f37e2667` page
  weights; CI17 `277b3a39` (ZIGi's key on a busy Today); CI16 `0d9796d5` (staking rate vs typing; hero-star check);
  CI15 `6269f866` (HUD motions update less often); CI18 `062637d2` (Ecosystem line vs Chrome's per-load rounding);
  `60316a3d` TIER 3 (release verifier: the star's words where CI14 moved them); CI20 `880cfb2e` (Earn asks its route at
  mount again; the Academy path loads once reached); CI21 `be492bf8` (two ZIGi spec waits; class B); CI19 `37d2370c`
  (For you / Activity list mount with the page; Next money steps keeps its list during a later price read).
- **CI history tonight:** 1569 (`14958e1a`) 6 browser + weights; 1575 (`6269f866`) hud-perf and weights green, 13
  failures from CI14's lazy parts + the release test; 1577 (`e16ef722`) only CI19/CI20 items + the release test, every
  WebKit job green, the Ecosystem parity fixed; 1579 (`37d2370c`) running.
- **Measured on :3103 at `37d2370c`:** every page under budget (Today 545.7/567, Activity 440.6/457, Tasks 463.3/468,
  shell 430.0/447); the CI 1575/1577 specs + for-you + earn-academy: 59 passed, 1 skipped.
- **Lesson (ADR-037 at the next docs commit):** a lane that moves code must run `vitest run scripts` too (release tests
  read app files by path); `lazy()` + Suspense delays content ~300 ms in React 19 even with the chunk loaded — use
  components/use-chunk.ts's chunk() where first-paint timing matters.
- **Open (minor, no failure):** components/checklist/star-toggle.tsx keeps lazy() + Suspense (a star stays disabled
  ~300 ms longer than before CI14). PR-069 closed by owner amendment 10 until O6; CI5's `markets-view` key not added.
- **Servers:** :3103 → `37d2370c` (/home/user/zig-branch2, started with setsid so it outlives the shell); :3102 main.

## Exact next step
1. Read CI run 1579 on `37d2370c` (or the latest head) (one re-run per known intermittent, docs/review/session-al/CI_INTERMITTENTS.md).
2. Once CI is green: replay round 2 in the order L7, L3, L2, L5, L4, L6, L8 on :3103 (≤ 5 helpers; replays read only their lane's AL rows and per id that finding's steps); regenerate ADR-037's closing table after each (docs/review/session-al/tools/closing_table.py).
3. After the weekly reset: the L1 fifth pass (TK-199 GBP symbol, TK-191 bluetooth policy warning, TK-024, TK-149, TK-196, D-155 and the 7 CHANGED), Parts 13–16, ONE A10 cycle, the final full replay round, Part 17.

## Open readings
Q1–Q5 are in ADR-037.

## Live counts
| Ledger findings in | AL rows out | Reproduced | Already fixed | Reopened | Fixed | STILL OPEN |
|---|---|---|---|---|---|---|
| 4,033 item lines (3,654 ids) | 642 AL rows | first specs red on main | per lane files | 150 | first passes: ~340 rows Fixed-pending-proof | lanes report Open rows in their second pass |
