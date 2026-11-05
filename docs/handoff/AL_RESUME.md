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

## Lanes in flight (6 Nov, evening)
- **All CI fix lanes are committed (head `18330e5e`, tree clean):** CI1 `305cb322`, CI2 `2decc91b`, CI3 `0bd34036`,
  CI4 `db3d9bd2` + `18330e5e`, CI5 `f982d6a9` (TIER 3) + `9148262a`, CI6 `c8d78e0e`, CI7 in `18330e5e`; verifier pin
  `f4079ea9` (TIER 3); theme sheets regenerated. Full unit suite: only the sandbox-only pre-run11-setup failure left.
- **CI run 1561 (head 22137364):** ~77 browser failures (from 389), the Alpha gate's packaged-runtime artifact test and the
  integration job; list in the scratchpad ci/fail-1561.txt (also: local batch runs on :3103 → /tmp/claude-0/nb/run{1,2}.log).
- **Running (4, the cap):** CI8 (wizard focus vs skip link, NOVA focus under the pinned field, Habits "Completion count"),
  CI9 (React #418 server-vs-browser dates, ui-design-pass:105), CI10 (P13 consistency, Settings fold, L6/L1 grok53 specs,
  Tasks theme parity), CI11 (governance, j03, pages-visibility, phone-shell, health/habit/recovery specs, search-aa,
  earn-plain-words, page-marks, l10a-third, a11y-wcag-x, WebKit twins, packaged-runtime, integration).
- **Waiting for a slot (CI12, ZIGi):** zigi-face-z, zigi-knock, zigi-memory, zigi-oneline-z, zigi-page-awareness-af,
  zigi-personality, zigi-phone-rest, grok53/ai/l7-fourth-answers and l7-fourth-safety (all in CI run 1561).
- :3103 serves `18330e5e` (one shared build).
- **Open from the CI lanes (not CI failures):** PR-069 path label numbers closed by owner amendment 10 until O6's
  distinctPathLabels is switched on; Earn/Settings deeper folds beyond D-088's; CI5's request to register
  `markets-view` (no code uses it — check before adding).
- **Servers:** :3103 → `18330e5e` (/home/user/zig-branch2); :3101 `c521574f` (old); :3102 main.

## Exact next step
1. Read CI on `18330e5e`; fix what is left at its cause (≤ 4 helpers until green; one re-run per known intermittent, docs/review/session-al/CI_INTERMITTENTS.md).
2. Once CI is green: replay round 2 in the order L7, L3, L2, L5, L4, L6, L8 on :3103 (≤ 5 helpers; replays read only their lane's AL rows and per id that finding's steps); regenerate ADR-037's closing table after each (docs/review/session-al/tools/closing_table.py).
3. After the weekly reset: the L1 fifth pass (TK-199 GBP symbol, TK-191 bluetooth policy warning, TK-024, TK-149, TK-196, D-155 and the 7 CHANGED), Parts 13–16, ONE A10 cycle, the final full replay round, Part 17.

## Open readings
Q1–Q5 are in ADR-037.

## Live counts
| Ledger findings in | AL rows out | Reproduced | Already fixed | Reopened | Fixed | STILL OPEN |
|---|---|---|---|---|---|---|
| 4,033 item lines (3,654 ids) | 642 AL rows | first specs red on main | per lane files | 150 | first passes: ~340 rows Fixed-pending-proof | lanes report Open rows in their second pass |
