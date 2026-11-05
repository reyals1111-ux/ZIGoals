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

## Lanes in flight (5 Nov, night)
- **Committed through `9d563c8f`:** CI1–CI12 (see the commits), CI11's turnout item `14958e1a`, CI13 page weights `9d563c8f`
  (Settings, Staking, Goals, Portfolio, Journey estimated under budget; measured after the next build).
- **CI run 1569 (head `14958e1a`):** 6 browser failures (from ~77 in run 1561) plus page weights in the integration job
  (all its tests passed): `grok53/hud/hud-perf:23` (median 33.4 ms at CPU 4x, guard 20), `grok53/chain/bn-018-023:15`
  (rate field not aria-invalid), `brand-nav-polish:165` (no `.today-hero .hero-star`), `theme-parity-af:15` mobile
  /app/ecosystem (light boxes 1–3 px taller), WebKit `grok53/tasks/ls-006-043:11` on /app (Ctrl+Shift+Z does nothing),
  WebKit `zigi-accept-correct:271` add-link (same run had a WebKit compositor segfault: class B?).
- **Running (4, the cap):** CI14 page weights second pass (Today, Health, Activity, Checklist, Habits, Earn, Agenda,
  Tasks), CI15 HUD frame time, CI16 the three Chromium specs, CI17 the WebKit shortcut.
- **Unit suite on `9d563c8f`:** 4 failing files reported (one is `lib/vault/zod-jitless.test.ts`, a 120 s timeout under
  load); a full re-run is identifying the other three before a follow-up commit (CI13's message said exit 0: the pipe hid it).
- **Open from the CI lanes (not CI failures):** PR-069 path label numbers closed by owner amendment 10 until O6's
  distinctPathLabels is switched on; CI5's request to register `markets-view` (no code uses it, not added).
- **Servers:** :3103 → `14958e1a` (/home/user/zig-branch2); :3101 `c521574f` (old); :3102 main. Next: one build at the
  head once CI14–CI17 are committed, then the weights and the six specs re-measured.

## Exact next step
1. Commit CI14–CI17 (typecheck, unit tests, lint first), rebuild :3103 once, measure weights and run the six specs; push;
   read CI on that head (one re-run per known intermittent, docs/review/session-al/CI_INTERMITTENTS.md).
2. Once CI is green: replay round 2 in the order L7, L3, L2, L5, L4, L6, L8 on :3103 (≤ 5 helpers; replays read only their lane's AL rows and per id that finding's steps); regenerate ADR-037's closing table after each (docs/review/session-al/tools/closing_table.py).
3. After the weekly reset: the L1 fifth pass (TK-199 GBP symbol, TK-191 bluetooth policy warning, TK-024, TK-149, TK-196, D-155 and the 7 CHANGED), Parts 13–16, ONE A10 cycle, the final full replay round, Part 17.

## Open readings
Q1–Q5 are in ADR-037.

## Live counts
| Ledger findings in | AL rows out | Reproduced | Already fixed | Reopened | Fixed | STILL OPEN |
|---|---|---|---|---|---|---|
| 4,033 item lines (3,654 ids) | 642 AL rows | first specs red on main | per lane files | 150 | first passes: ~340 rows Fixed-pending-proof | lanes report Open rows in their second pass |
