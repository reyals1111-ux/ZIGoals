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

## Owner finish rules (8 Nov) — in force to the end (full text also in ADR-037)
Override anything earlier that conflicts; the 5 Nov cost rules stay, tightened here.
1. Recover first (the unpushed L7 commits and L7-5c's files, or a fresh checkout of 8a4d0252); record the case.
2. At most 4 helpers at once; no helper for anything doable in under ~30 minutes.
3. Never read FINAL-REPORT.md, a whole bot file, AL_SCOPE.md or a scope branch again; work only from ADR-037,
   AL_RESUME.md, GROK53_LEDGER.md, the lane files and the replay files; one finding's steps by grepping its id.
4. Replays cover only rows not yet FIXED/HOLDS in the closing table (a FIXED row only if its files changed since);
   replay agents get a list of ids.
5. One production build per integration point, shared by all runs.
6. Each open row: at most 2 fix attempts after its round-2 verdict; then a targeted re-check, and if still open it closes
   as "Carried to next session" with its cause in one line (listed in STATUS).
7. CI: one re-run per known intermittent; WebKit engine crashes and slow-mirror cancellations are recorded, never chased;
   a failing test gets at most 2 fix attempts, then it is recorded with its diagnosis in CI_INTERMITTENTS.md.
8. No idle waiting on CI (check at most every 10 minutes); never hold a finished commit locally longer than 45 minutes.
9. Order: recover → replay round 2 of the not-yet-FIXED rows for L3, L2, L5, L4, L6, L8 (closing table after each) → one
   fix pass per lane → the L1 fifth pass (TK-199, TK-191 as its own TIER 3 headers commit, TK-024, TK-149, TK-196, D-155,
   the 7 CHANGED).
10. Part 13: finish the cross-module consistency rows. Part 14: browser-verify only EARLIER_SCOPE.md's not-working rows; fix.
11. Part 15: build the TOP 40 web-possible roadmap/competitor items by value (tests and a closing row each); the rest as a
    ranked list in docs/review/session-al/NEXT_SESSION_BACKLOG.md (owner decision 8 Nov).
12. Part 16, scoped: one release review "as if 1.0" of Today, Quick add, Habits, Health logging, Goals, Wealth, Tasks, the
    NOVA HUD and ZIGi at 390 and 1440 px; 8 journeys; a security delta review by 2 fresh reviewers limited to files changed
    since 17069c7d in AI/NOVA, stored formats/backup/parsers and the shell/CSP. Fix Highs, Mediums, Majors, Minors.
13. ONE A10 cycle; then the final replay: every row not FIXED plus every FIXED row whose files changed after its verdict.
14. Part 17: full CI green on the final head, the STATUS final entry (closing-table summary and the "Carried to next
    session" list), AL_DEMO_TOUR.md, the PR out of Draft, the short report.
15. HUD: if hud-perf still fails on CI, lower the shimmer's frequency (approved); keep the panel glass blur.

**Owner decision (8 Nov, rule 15) applied:** hud-perf read 33.3 ms again on CI 1586, so the HUD's shimmer pass moves 12
times a second instead of 30 (components/nova/holo/holo.css; guard lib/nova/holo/ci15-perf.test.ts); the glass blur stays.

## Recovery (8 Nov, rule 1)
Case: the workspace survived the pause. The unpushed L7-5a (`2af57cbe`) and L7-5b (`0d10fdf2`) commits were there; typecheck
and vitest lib/ai + lib/limits (1614 passed) ran clean; both pushed. L7-5c's working-tree files were intact and its agent was
resumed; the L3 replay round 2 agent was resumed with its scope cut to the not-yet-FIXED ids (rule 4).
CI 1586 (`8a4d0252`): hud-perf 33.3 ms (→ rule 15 shimmer change), WebKit zigi-states:75 (second failure → investigate,
at most 2 attempts), WebKit zigi-oneline-z:282 and settings-switches-sweep:45 (first sightings → one re-run).

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
- **After `37d2370c`:** CI22 `bf70befa` (Tasks P1 chip contrast before its 10:30 due time), CI23 `94964671` (NOVA orb
  rows; carries CI22's theme hashes), CI24 `96c1c4f7` (TK-226 / TK-162 spec waits), `76c6cde5` (CI21's wait asks that no
  glide is running).
- **CI history:** 1569 (`14958e1a`) 6 browser + weights; 1575 (`6269f866`) 13 failures from CI14's lazy parts; 1577
  (`e16ef722`) CI19/CI20 items only; 1579 (`37d2370c`) 5 failures (Tasks chip, NOVA orb, TK-226, TK-162); 1583
  (`96c1c4f7`) Chromium green but zigi-oneline-z:242 (fixed in 76c6cde5); WebKit shard 1: zigi-face-z:313 and
  zigi-memory-af:15 (recorded family); shards 2–3 cancelled by the job limit after a 36 min WebKit install (runner).
- **CI 1585 (`56b77f19`):** every test job green (checks, browser, integration, Alpha gate, WebKit shards 2–3 incl.
  zigi-states:75's re-run); only WebKit shard 1 cancelled while installing WebKit from a slow mirror after a cache miss
  (runner image change). Next push confirms a full green run.
- **Replays:** L7 round 2 committed (`56b77f19`): 344 FIXED, 53 STILL OPEN → L7 fifth pass in three lanes (L7-5a safety,
  L7-5b answers, L7-5c copy/actions) running; L3 round 2 replay running. Then L2, L5, L4, L6, L8 round 2, then an L7 round 3
  (owner cost rule 3: more than 10 STILL OPEN), then ONE final full round.
- **Lessons:** the time of day is a test condition (Showcase items due at fixed hours change styles); a lane that moves
  code runs `vitest run scripts` too; `lazy()` + Suspense delays content ~300 ms in React 19 (use use-chunk's chunk()).
- **Open (dev-only, no CI failure):** under React StrictMode in next dev, components/use-back-closes.ts's doubled effect
  closes wealth sheets as they open (sheet specs fail on a dev server only).
- **Measured on :3103 at `37d2370c`:** every page under budget (Today 545.7/567, Activity 440.6/457, Tasks 463.3/468,
  shell 430.0/447); the CI 1575/1577 specs + for-you + earn-academy: 59 passed, 1 skipped.
- **Lesson (ADR-037 at the next docs commit):** a lane that moves code must run `vitest run scripts` too (release tests
  read app files by path); `lazy()` + Suspense delays content ~300 ms in React 19 even with the chunk loaded — use
  components/use-chunk.ts's chunk() where first-paint timing matters.
- **Open (minor, no failure):** components/checklist/star-toggle.tsx keeps lazy() + Suspense (a star stays disabled
  ~300 ms longer than before CI14). PR-069 closed by owner amendment 10 until O6; CI5's `markets-view` key not added.
- **Servers:** :3103 → `37d2370c` (/home/user/zig-branch2, started with setsid so it outlives the shell); :3102 main.

## Exact next step (9 Nov: session complete)
Every part is closed: the final replay (round 3, 1,211 ids) and the final fix pass (round 4, re-checked by
tests/grok53/release/final-*.spec.ts) are in ADR-037's final closing table; CARRIED.md lists the 111 ids left. The STATUS
final entry is the last commit. Next: the owner reviews PR #100 (out of Draft), merges, and deploys Alpha #54 from main.
A next session starts from NEXT_SESSION_BACKLOG.md and CARRIED.md.

## Open readings
Q1–Q5 are in ADR-037.

## Live counts (final closing table, 9 Nov)
642 AL rows: Fixed 503 · Fixed + owner decision 21 · Fixed + not possible 5 · Fixed + not reproducible 1 · Owner decision 30
· Not possible 13 · Waits on owner 2 · Open 50 · Partly replayed 17 (the last two carried: 67 rows, 111 ids).
