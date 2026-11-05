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

## Lanes in flight (6 Nov, early)
- **Committed since the last resume update (head `c521574f`):**
  - INT third pass (TIER 3 auth/sync, stored format: backup format 4 with record sections, range export, erase one area);
  - L7 third pass; L8d (every HUD design-review finding; TIER 3 stored format, additive);
  - L10a, L10b and L5 third passes; theme sheets regenerated;
  - the full unit suite fixed at its causes (secret-scan fixture, date guard, AK G3 block order, `:has()` guard, sw test's FetchEvent, DV-145 copy pin);
  - GROK53_REPLAY_L1_1.md (L1 replay round 1: 40 STILL OPEN, 13 CHANGED).
- **Running:** L1-4 (L1 fourth pass on the replay's STILL OPEN rows); SW2 (small cross-lane leftovers, NOVA M5 water wording, Showcase valuations p4).
- **Known local-only failure:** `scripts/pre-run11-setup.test.mjs` — corepack in a temp folder picks pnpm 12 in this sandbox; CI pins 11.19.0.
- **Servers:**
  - :3101 is being rebuilt at `c521574f` (/home/user/zig-branch);
  - :3103 runs cfbdc591 (/home/user/zig-branch2);
  - :3102 runs main.
- **Browser runs** go through the flock lock.

## Exact next step
1. Commit each lane as it reports; CI run 1522 on `c521574f` → dispatch fix lanes by area.
2. Once :3101 serves `c521574f`, run tests/grok53 and start the pillar replays L2–L8.
3. Pillar replays L2-L8 (A1).
4. The HUD first-time-viewer review after L8d.
5. Parts 13 and 16 and the A10 cycles.

## Open readings
Q1–Q5 are in ADR-037.

## Live counts
| Ledger findings in | AL rows out | Reproduced | Already fixed | Reopened | Fixed | STILL OPEN |
|---|---|---|---|---|---|---|
| 4,033 item lines (3,654 ids) | 642 AL rows | first specs red on main | per lane files | 150 | first passes: ~340 rows Fixed-pending-proof | lanes report Open rows in their second pass |
