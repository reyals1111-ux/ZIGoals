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

## Lanes in flight (6 Nov, afternoon)
- **Committed since the last update (head `3b2c5462`):** sweep 4; the Settings fold (D-088); L8g (HUD still under Motion Off);
  L7 fourth pass (safety L7-4a + answers L7-4b) and Q14; FX-G53c; the R4 capture-handler sweep; CI4's ZIGi spec updates
  and the browser-agents fix; replay L1 round 2 (7 STILL OPEN, 7 CHANGED, no regressions); ADR-037 closing table.
- **Running (4 helpers, the owner's cap until CI is green):** CI1 (themes/visual), CI2 (health/habits), CI3 (money/goals/
  packaged runtime), CI5 (shell/onboarding/Help/Earn/PWA, Alpha gate manifest hash).
- **CI4 paused at the cap (resume when a slot frees):** not started — nova-dashboard, p3-nova-polish, zigi-phone-rest,
  zigi-plans-af, zigi-proactive, zigi-states and zigi-earn-coach-af (WebKit only). Edited but NOT yet run (uncommitted):
  tests/zigi-alive.spec.ts (O3/Q8), tests/journeys/j12-nova.spec.ts (O4). App bugs found, for the resumed lane:
  (1) zigi-face-z — the Premium badge in ZIGi's status line squeezes the model switcher to 4–15 px at 320–768 px
  (components/ai/ai-chat.tsx:308, chat-polish.css:64, panel-z.css:34/183); (2) zigi-page-awareness-af desktop — the first
  short question on Today hits the default 10,000-token budget prompt (page data ~2,098 tokens, ~7.9k fixed prompt;
  lib/ai/settings.ts:22): find what grew the fixed prompt, never raise the budget silently.
- **Theme sheets** must be regenerated (node scripts/themes/build-themes.mjs) once CI1–CI5 have landed their CSS.
- **Servers:** :3103 serves `54e32039` (/home/user/zig-branch2) for every helper; :3101 `c521574f` (old); :3102 main.

## Exact next step
1. Commit CI1, CI2, CI3, CI5 as each reports (typecheck + their tests); resume CI4's remainder in the first free slot.
2. Regenerate theme sheets; push; one build of the head on :3103; let CI run on the head; fix what is left; one re-run per known intermittent.
3. Once CI is green: replay round 2 in the order L7, L3, L2, L5, L4, L6, L8 (at most 5 helpers; replays read only their lane's AL rows and per id that finding's steps).
4. Regenerate ADR-037's closing table after each replay (docs/review/session-al/tools/closing_table.py).
5. After the weekly reset: the L1 fifth pass (TK-199 GBP symbol, TK-191 bluetooth policy warning, TK-024, TK-149, TK-196, D-155, the 7 CHANGED), Parts 13–16, ONE A10 cycle, Part 17.

## Open readings
Q1–Q5 are in ADR-037.

## Live counts
| Ledger findings in | AL rows out | Reproduced | Already fixed | Reopened | Fixed | STILL OPEN |
|---|---|---|---|---|---|---|
| 4,033 item lines (3,654 ids) | 642 AL rows | first specs red on main | per lane files | 150 | first passes: ~340 rows Fixed-pending-proof | lanes report Open rows in their second pass |
