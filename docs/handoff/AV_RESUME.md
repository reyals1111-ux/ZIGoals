# Session AV — resume file ("ALPHA QUALITY")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-au-dress-rehearsal` (PR #108 "Session AU + AV", Draft). Rules: CLAUDE.md, the owner's brief and
`docs/architecture/ADR-045-session-av.md` (the plan, the approval with nine amendments, and **owner follow-up 1** of
21 Nov, all verbatim). Follow-up 1 order: CI → Part 4b open rows + owner triage (done) → Part 7 research in depth (done)
→ Part 7 build in rank order with no cap (in progress) → Part 8 final pass → END. "pause for release" from the owner:
finish or unwire the current feature, push, get CI green, write "Safe to merge now: yes (CI run N)", push nothing until
"continue". After PR #108 merges: `feature/session-av-2` from the new main, Draft PR "Session AV (continued)".

**Safe to merge now: yes — app code = d0df34f4, CI run 1999 green on the first attempt; runs 2000/2001 red only on
registered intermittents (D-SYNC, D36) on docs-only commits; run 2002: red only on main shard 2, `nova-stage-am2:301`
(D36's signature) on both attempts, on a docs-only commit.** (Owner follow-up 4, 22 Nov: the owner accepts this as E1.)
PR #108 is frozen at this commit: nothing more is pushed to it unless the owner asks. Since `d0df34f4` it carries docs
and one TIER 3 (CI) shard-list repack (`9c24050c`, ADR-045 D-CI2002; run 2003 on it was in progress at the freeze).

**Lane 2 (follow-up 4) is the work now:** branch `feature/session-av-2` from #108's frozen head; LEDGER.md first; up to
6 builder helpers (one pillar group each, own worktree) and 2 review/research helpers; the lead integrates each group
with a merge commit, edits the shared registries, builds once per batch and pushes. No PR until the owner merges #108.
Lane 2's own state is kept in this file's "Lane 2 — state" section on that branch.

## Lane 2 — state (owner follow-up 4; keep current at every batch)
- **Owner follow-up 6 (finish) rules now** (ADR-045). Alpha #58 = run 61 from `main` `1c1b5953`: version `f2729d28-e9db-436f-a66a-67922cf5d924`, rollback `e0bc17f3-27c0-4900-aa55-416f20ece6f6` (#57), VERIFIED (3 reads), live prices VERIFIED, market policy ends 2026-11-30T16:00Z, archive SHA-256 `ef1aee3b…0a18e578`. Frozen readers #37–#58.
- **Now (23 Nov, 20:45 UTC).** Friend-readiness done (FRIEND_READINESS.md). Owner follow-up 7: 20 main shards
  (`60b65190`, then `3d491fef` and `1e41ab6b` moved files that slow each other); every main shard now takes 25–42 min but
  a slow runner's. The CI blocker is `j04-offline`'s update stall (ADR-045 D-CI2016-J04, Carried after two attempts, the
  cause measured: the old worker is woken mid-takeover and Chromium never finishes it), red in runs 2016, 2019 and 2022.
  The next step needs the owner: a third attempt (find the request that wakes the old worker and keep it off the
  takeover), or the owner's own call on this test. Also seen in shard 13: `zigi-browser-agents:126` (runs 2012, 2022; 24
  of 24 locally). The END (closing table drafted in the scratchpad's adr-close.md, STATUS final entry, report) waits for
  two first-attempt green runs. **Safe to merge now: no (CI run 2022).**
- Branch `feature/session-av-2` from #108's frozen head `807f247e`; LEDGER.md first (`fbeb3e54`). No PR until #108 merges.
  A push here starts no CI (`ci.yml`: push to main, pull_request): push after every integrated batch, local checks first.
- Done (lead): A45-1 (the account-sync engine out of every page's first scripts, TIER 3 sync `a88abeb8`…`2d270bd9`:
  every page but Settings 13–36 kB lighter; all 16 sync browser files green except `sign-in-codes-browser`, 2 of 2 alone,
  1 red in a full loaded run — watch it); CR-19 (`8a23eab9`); ten more competitors in COMPETITORS.md and LEDGER.md
  #176–#222 (`6926408c`).
- Pushed: batch 1 (`a3402096`) and batch 2 (`23100b66`: money, body, food, habits and mind part 2, sync, ledger
  remainders, round 2, Minors 70 of 79, restore-media, Dutch dates, loose ends; reviews b2a/b2b fixed; 572 of 574 specs —
  av2-backup-folder needs CI's real Chrome; unit green apart from load timeouts; frozen readers 21 of 21; weights inside).
- Pushed: batch 3 (`331465aa`: round 3 + fixes, polish 1, fixb3/fixb3c, phone lengths; specs green on build dbf1f2a2,
  unit green but the sandbox's pre-run11 pnpm check, frozen readers 39 of 39 in three files, weights inside).
- Batch 4 (`lane2/batch4`, /home/user/zg-b4, `c434151b` with batch 3 merged): round 4 + reviews D–G, polish 2; unit
  green, frozen readers 39/39, build c434151b green, weights inside (Settings 525.8/531). Specs running (58 files).
  Next: fix failures, merge into feature/session-av-2, push.
- Batch 5 (`lane2/batch5`, /home/user/zg-b5): round 5 (#348–#390) all five branches merged with reviews H–L, Help (43),
  corpus, shards, themes. Next after batch 4: merge batch 4 in, full unit, lint, frozen readers, build, specs, push.
- Batch 6 (`lane2/batch6`, /home/user/zg-b6, `3caddd6c`): round 6 (#391–#431) r6-plan (review M fixed), r6-notes
  (review N fixed), r6-money, r6-body merged; answers wired, 41 corpus intents (none changed), Help (41), What's new,
  15 specs in shards, themes, r6-body keys and the lock-away display key registered (TIER 3). Review O (r6-money: 4
  Blockers) and P (r6-body: 1 Blocker) being fixed on their branches → merge again, then full checks.
- Round 7 research (10 more apps → ledger rows #432+) running → scratchpad ledger-r7.md, then builders.
- For the final STATUS entry: the rollback limits in r4-mind, r4-notes and r5-notes registries (an older build's 30-day
  photo sweep does not know the extra photos).
- Owner items from lane 2: the private-sync Worker deploy (OWNER_STEPS.md); the visit report's two symptom charts;
  #245 automatic recording; #41 passkey; a bundled reading font (#263); the Showcase examples the Minors left; Health →
  Activity's older "About N kcal used — an estimate" for manual activities (against "no calorie expenditure is estimated"?); the
  Showcase's maintenance estimate needs 10 weigh-ins (it has 7).
- Scripts (scratchpad): batch.sh (typecheck + build of HEAD in zg-wt; then start :3101 as its own background task),
  add_help.py (Help + static.ts), extract_help.py (Q/A from a registry), add_shards.sh (new specs to the suggested shard).

## Follow-ups 2 and 3 — state (keep current)
- Done: FU2/FU3 recorded; 1a food Worker (`0dc926b5`); 1b fixes (habits-routines, o3, voice hint 44 px, sanne one
  button, oneline wider name; zigi-voice-z and account-browser Carried after two attempts, ADR-045 D-FU2-1b); L-9 and
  PK-18 with spec `av-companion-guarded`; 1c QUALITY.md (2 Blockers + 63 Majors fixed by four fresh fixers, then the
  follow-up 320 px / Tab-stop fixes on the fixed build); 1d What's new 77 → 30; Habits headroom 5.6 kB.
- In progress: runs 1999 green, 2000 red (D-SYNC), 2001 red (two NOVA openings, D36), 2002 red (shard 2's
  `nova-stage-am2:301`). Cause found for the shard: 111 worker-minutes in a 60-minute job; its 56 AV specs repacked
  into the other lists (ADR-045 D-CI2002, TIER 3 CI). Run 2003 on that head.
- Next: fix what CI or the local run finds, push only when no run is in progress; two consecutive first-attempt green
  runs → "Safe to merge now: yes (CI runs N, M)" here and in the PR → freeze #108 → lane 2 on `feature/session-av-2`
  (LEDGER.md draft at the scratchpad's LEDGER.md: 138 rows with work left in 17 groups) and FU3's lane-2 items
  (CR-19, M-9, PK-6, PK-10, PK-16).

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`node-v24.19.0-linux-x64/bin` first on PATH); `corepack enable pnpm`;
  `pnpm install --frozen-lockfile --ignore-scripts`. Typecheck and build need `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101` (3100 for the integration tests);
  Chromium at `/opt/google/chrome/chrome`, at most 2 workers, one run at a time.
- A CSS change needs `node scripts/themes/build-themes.mjs` (then `--check`). New specs go in shard 2's list.

## Done (follow-up 1)
- Part 4b: all 14 open rows finished (`7e664056`, `3479961a` TIER 3 PWA PK-3, `8808d0e1`); 38 rows in UNFINISHED.md
  "Owner decisions"; CR-17 and CR-20 decided with the rules' default.
- Part 7 research: COMPETITORS.md from the web, 25 apps, 435 rows, depth-checked, re-ranked build order (`d6ccb797`).
- Part 7 build: #5 task notifications (`9a0cf6f5`, TIER 3 PWA), #1 Dutch task line (`dd931b8e`), #3 three good things
  (`7795263f`), Help (`cbf1e8f4`), #11 journal tags (`1f67dbc9`), #6 tasks done per day/week (`f4595af6`), Help
  (`db0eb6d9`). #4 (save a meal, copy a day) verified already built (Health → Planning).

## In progress
- Built since: #7 vs last month (`4c0b99ef`), #9 every factor, #8 budget targets (TIER 3), #12 bill calendar, #13
  workouts by week, #10 the review's tasks, #15 running bests, #16 income flow; B: deadlines (`8e63c167` TIER 3 stored,
  `4408d1d6` TIER 3 AI), the debt planner's order, one-off payments, schedule, countdown, tracked plan (up to
  `34975169`). C: #17 pasted list (`4442d1c1`), #18 just the calories, #19 yesterday's habits, #20 the money
  line on Today, #21 money search, #22 a category offered, #23 never missed twice (as a second number, D-BUILD), #24
  today's focus habit (TIER 3 stored, `112eb132`). CI fixes: A10-11 (`967ab614`), nova-wa runFor (`f24e2913`).
- Also built: #25 meal words matched (`b6d37ca4`), #26 habit symbol and colour (TIER 3 stored, `4acc13d8`), #27 sleep
  score's four parts (`11c7eb55`).
- Also built: #28 foods high in a nutrient (`dab9a011`), #29 a meal planned on weekdays (`4897c46e`), #30 the habit
  week grid (`71bf1f5f`), #31 watched categories (TIER 3 stored, `f89e889b`), #32 what got in the way (`ec6214b0`),
  #33 today's journal line (`eede7c05`), #34 a journal entry's day (`cb63ff11`), #35 move and value alerts (TIER 3
  stored, `5d0bee71`), #36 hide calorie and weight figures (Health and Today's pinned cards; NOVA answers what is asked, D-BUILD), #37 budget pace and near-limit notices (`8a028e67`), #38 plan my day (`f9385fca`), #39 task minutes and the day's load (TIER 3 stored `78d71497`, AI `0ccaeb8b`). CI: run 1961 red in shard 13 only (a real C #30 regression, fixed `eeb0c1e8`, D-CI1961); run 1975 on `f9385fca`: three reds — Help's link count (mine, fixed `e4009ff3`), o3-apps-extras (first sighting) and zigi-voice-z:199 (known), D-CI1975.
- Also built: #40 last time's note and a set's best (`59b4d078`), #41 the workout calendar (`495f3664`), #42 bills this month and until payday (`fdbeefe7`), #43 own matrix lines, a paused repeat, a checklist that repeats (`95f8d2b9`), #44 yearly countdowns with a reminder (TIER 3 stored, new key `zigoals:countdown-extras:v1`, `5c588f07`), #45 own journal templates and the Dutch daily question (TIER 3 stored, `58667a30`). Headroom: Habits 5.2 kB, Goals 5.8 — later habit/goal work lazy.
- Also built: #46 sleep over a year (`8a3d2468`), #47 nutrient ranges (`71bed717`), #48 symptoms and supplements in the visit
  report (`a5eddc1f`), #49 a month in short and a fresh start (TIER 3 stored, `03a70d26`). Part 8 final pass `61759687`;
  ADR-045 closing table and D-BUILD notes written.
- Done: CI read through run 1995 (D-CI1987 … D-CI1995, every red of this session fixed at its cause); STATUS entry written as the final commit; report sent. Session AV is complete.

## Next
- Read CI at part boundaries (≤ every 10 min); record reds in ADR-045 (D-CI*) and CI_INTERMITTENTS.
- END only when every item is built or Carried with a real cause: ADR-045 closing table (matrix summary, audit
  counts), STATUS entry as the final commit, report ≤ 12 lines.
