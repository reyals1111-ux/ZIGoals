# Session AV — resume file ("ALPHA QUALITY")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-au-dress-rehearsal` (PR #108 "Session AU + AV", Draft). Rules: CLAUDE.md, the owner's brief and
`docs/architecture/ADR-045-session-av.md` (the plan, the approval with nine amendments, and **owner follow-up 1** of
21 Nov, all verbatim). Follow-up 1 order: CI → Part 4b open rows + owner triage (done) → Part 7 research in depth (done)
→ Part 7 build in rank order with no cap (in progress) → Part 8 final pass → END. "pause for release" from the owner:
finish or unwire the current feature, push, get CI green, write "Safe to merge now: yes (CI run N)", push nothing until
"continue". After PR #108 merges: `feature/session-av-2` from the new main, Draft PR "Session AV (continued)".

**Safe to merge now: no.** Run 1995 on `23364740` (the final code): every browser, WebKit, a11y and integration job green; checks red only on `food-search.test.mjs:90` (the food Worker's timing, unchanged since Session AK, carried, D-CI1995). The last run green on every job: run 1938 on `7e664056`.

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
